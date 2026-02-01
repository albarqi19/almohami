import React, { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale,
  IdCard,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  Users,
  Briefcase,
  Sparkles,
  Shield,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LoginForm {
  nationalId: string;
  pin: string;
  rememberMe: boolean;
}

interface TwoFactorState {
  required: boolean;
  tempToken: string;
  code: string;
}

const Login: React.FC = () => {
  console.log('🚨🚨🚨 LOGIN COMPONENT LOADED - NEW VERSION 🚨🚨🚨');
  const { user, login, verify2FA, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const rememberKey = useMemo(() => 'law-firm:remember', []);
  const rememberValueKey = useMemo(() => 'law-firm:last-national-id', []);
  const [formData, setFormData] = useState<LoginForm>({
    nationalId: '',
    pin: '',
    rememberMe: false,
  });
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 2FA State
  const [twoFactor, setTwoFactor] = useState<TwoFactorState>({
    required: false,
    tempToken: '',
    code: '',
  });
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      document.documentElement.classList.add('classic');
      document.body.classList.add('classic');
      localStorage.setItem('theme', 'classic');
    } else if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else if (savedTheme === 'classic') {
      document.documentElement.classList.add('classic');
      document.body.classList.add('classic');
    } else {
      document.documentElement.classList.remove('dark', 'classic');
      document.body.classList.remove('dark', 'classic');
    }
  }, []);

  useEffect(() => {
    const savedRemember = localStorage.getItem(rememberKey) === 'true';
    const savedNationalId = localStorage.getItem(rememberValueKey) ?? '';

    if (savedRemember && savedNationalId) {
      setFormData((prev) => ({
        ...prev,
        nationalId: savedNationalId,
        rememberMe: true,
      }));
    }
  }, [rememberKey, rememberValueKey]);

  // Focus on 2FA input when shown
  useEffect(() => {
    if (twoFactor.required && codeInputRef.current) {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [twoFactor.required]);

  // Redirect if already logged in
  if (user) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  if (authLoading) {
    return (
      <div className="auth-loader" role="status" aria-live="polite" aria-label="جاري التحميل">
        <div className="auth-loader__spinner" />
        <p className="auth-loader__text">جاري التحضير لتجربة الاستخدام، لحظات من فضلك...</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('🔐 Login: Calling login function...');
      const result = await login(formData.nationalId.trim(), formData.pin);
      console.log('🔐 Login: Result received:', JSON.stringify(result, null, 2));

      if (!result.success) {
        console.log('🔐 Login: Failed -', result.error);
        setError(result.error || 'رقم الهوية أو الرقم السري غير صحيح');
        return;
      }

      // Check if 2FA is required
      console.log('🔐 Login: Checking 2FA -', { requires_2fa: result.requires_2fa, has_token: !!result.temp_token });
      if (result.requires_2fa && result.temp_token) {
        console.log('🔐 Login: 2FA Required! Setting twoFactor state...');
        setTwoFactor({
          required: true,
          tempToken: result.temp_token,
          code: '',
        });
        console.log('🔐 Login: twoFactor state set!');
        return;
      }

      // Login successful without 2FA
      if (formData.rememberMe) {
        localStorage.setItem(rememberKey, 'true');
        localStorage.setItem(rememberValueKey, formData.nationalId.trim());
      } else {
        localStorage.removeItem(rememberKey);
        localStorage.removeItem(rememberValueKey);
      }
    } catch (error) {
      setError('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (twoFactor.code.length < 6) {
      setTwoFactorError('يرجى إدخال رمز التحقق كاملاً');
      return;
    }

    setIs2FALoading(true);
    setTwoFactorError('');

    try {
      const result = await verify2FA(twoFactor.tempToken, twoFactor.code);

      if (!result.success) {
        setTwoFactorError(result.error || 'رمز التحقق غير صحيح');
        setTwoFactor((prev) => ({ ...prev, code: '' }));
        codeInputRef.current?.focus();
        return;
      }

      // 2FA verification successful
      if (formData.rememberMe) {
        localStorage.setItem(rememberKey, 'true');
        localStorage.setItem(rememberValueKey, formData.nationalId.trim());
      } else {
        localStorage.removeItem(rememberKey);
        localStorage.removeItem(rememberValueKey);
      }
    } catch (error) {
      setTwoFactorError('حدث خطأ أثناء التحقق');
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleBack = () => {
    setTwoFactor({
      required: false,
      tempToken: '',
      code: '',
    });
    setTwoFactorError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handle2FACodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9A-Za-z-]/g, '');
    setTwoFactor((prev) => ({ ...prev, code: value }));
    setTwoFactorError('');
  };

  // دوال لملء البيانات التجريبية
  const fillTestData = (nationalId: string, pin: string) => {
    setFormData({
      nationalId,
      pin,
      rememberMe: false
    });
  };

  const testAccounts = [
    { role: 'مدير', nationalId: '1234567890', pin: '1234', tone: 'primary' as const },
    { role: 'محامي', nationalId: '1234567891', pin: '1234', tone: 'accent' as const },
    { role: 'مساعد قانوني', nationalId: '1234567892', pin: '1234', tone: 'success' as const },
    { role: 'عميل', nationalId: '1234567893', pin: '1234', tone: 'info' as const }
  ];

  const heroFeatures = [
    {
      icon: ShieldCheck,
      label: 'حماية وصلاحيات متعددة المستويات لضمان سرية بيانات عملائك.'
    },
    {
      icon: Briefcase,
      label: 'إدارة ذكية للقضايا والمهام مع تتبع دقيق للمواعيد والجلسات.'
    },
    {
      icon: Users,
      label: 'تجربة متكاملة للفرق القانونية والعملاء عبر لوحة تحكم موحدة.'
    },
  ];

  // Render 2FA verification form
  const render2FAForm = () => (
    <motion.div
      className="auth-card"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <header className="auth-card__brand">
        <motion.span
          className="auth-card__logo auth-card__logo--2fa"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          aria-hidden="true"
        >
          <Shield size={32} />
        </motion.span>
        <div>
          <h1 id="login-title" className="auth-card__title">التحقق الثنائي</h1>
          <p className="auth-card__subtitle">أدخل رمز التحقق من تطبيق المصادقة</p>
        </div>
      </header>

      {twoFactorError && (
        <motion.div
          className="auth-alert auth-alert--error"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
        >
          <AlertTriangle size={16} />
          {twoFactorError}
        </motion.div>
      )}

      <motion.form
        className="auth-form"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onSubmit={handle2FASubmit}
      >
        <div className="form-field">
          <label className="form-label" htmlFor="twoFactorCode">رمز التحقق</label>
          <div className="auth-field">
            <span className="auth-field__icon" aria-hidden="true">
              <Shield size={18} />
            </span>
            <input
              ref={codeInputRef}
              id="twoFactorCode"
              name="twoFactorCode"
              type="text"
              inputMode="numeric"
              className="input auth-field__input--with-icon auth-field__input--2fa"
              placeholder="أدخل الرمز"
              autoComplete="one-time-code"
              maxLength={8}
              required
              value={twoFactor.code}
              onChange={handle2FACodeChange}
            />
          </div>
          <span className="form-hint">
            أدخل الرمز من تطبيق Google Authenticator أو كود الاسترداد
          </span>
        </div>

        <motion.button
          type="submit"
          className="button button--primary auth-submit"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.985 }}
          disabled={is2FALoading || twoFactor.code.length < 6}
        >
          {is2FALoading ? (
            <>
              <div className="auth-spinner" aria-hidden="true" />
              جاري التحقق...
            </>
          ) : (
            <>
              <ShieldCheck size={18} />
              تأكيد الدخول
            </>
          )}
        </motion.button>

        <button
          type="button"
          className="auth-back-btn"
          onClick={handleBack}
        >
          <ArrowRight size={16} />
          العودة لتسجيل الدخول
        </button>
      </motion.form>

      <style>{`
        .auth-card__logo--2fa {
          background: linear-gradient(135deg, var(--success-light, #dcfce7), var(--success-lighter, #f0fdf4));
          color: var(--success, #22c55e);
        }

        .auth-field__input--2fa {
          font-family: monospace;
          font-size: 1.25rem;
          letter-spacing: 0.2em;
          text-align: center;
        }

        .auth-back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.75rem;
          margin-top: 1rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: color 0.2s;
        }

        .auth-back-btn:hover {
          color: var(--primary, #3b82f6);
        }

        .form-hint {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 0.5rem;
          text-align: center;
        }

        .auth-alert {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
      `}</style>
    </motion.div>
  );

  // Render login form
  const renderLoginForm = () => (
    <motion.div
      className="auth-card"
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.5 }}
    >
      <header className="auth-card__brand">
        <motion.span
          className="auth-card__logo"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          aria-hidden="true"
        >
          <Scale size={32} />
        </motion.span>
        <div>
          <h1 id="login-title" className="auth-card__title">نظام إدارة المحاماة</h1>
          <p className="auth-card__subtitle">سجّل دخولك للوصول إلى القضايا، المهام، والتقارير الفورية</p>
        </div>
      </header>

      {error && (
        <motion.div
          className="auth-alert auth-alert--error"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
        >
          {error}
        </motion.div>
      )}

      <motion.form
        className="auth-form"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onSubmit={handleSubmit}
        aria-describedby="login-title"
      >
        <div className="form-field">
          <label className="form-label" htmlFor="nationalId">رقم الهوية</label>
          <div className="auth-field">
            <span className="auth-field__icon" aria-hidden="true">
              <IdCard size={18} />
            </span>
            <input
              id="nationalId"
              name="nationalId"
              type="text"
              className="input auth-field__input--with-icon"
              placeholder="أدخل رقم الهوية الوطنية"
              autoComplete="username"
              inputMode="numeric"
              required
              value={formData.nationalId}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="pin">الرقم السري</label>
          <div className="auth-field">
            <span className="auth-field__icon" aria-hidden="true">
              <Lock size={18} />
            </span>
            <input
              id="pin"
              name="pin"
              type={showPin ? 'text' : 'password'}
              className="input auth-field__input--with-icon auth-field__input--with-toggle"
              placeholder="أدخل الرقم السري"
              autoComplete="current-password"
              required
              value={formData.pin}
              onChange={handleInputChange}
            />
            <button
              type="button"
              className="auth-field__toggle"
              onClick={() => setShowPin((prev) => !prev)}
              aria-label={showPin ? 'إخفاء الرقم السري' : 'إظهار الرقم السري'}
            >
              {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="auth-form__options">
          <label htmlFor="rememberMe" className="auth-checkbox">
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={handleInputChange}
            />
            تذكرني لاحقًا
          </label>
          <button type="button" className="auth-link">
            نسيت الرقم السري؟
          </button>
        </div>

        <motion.button
          type="submit"
          className="button button--primary auth-submit"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.985 }}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="auth-spinner" aria-hidden="true" />
              جاري تسجيل الدخول...
            </>
          ) : (
            <>
              <LogIn size={18} />
              تسجيل الدخول
            </>
          )}
        </motion.button>

        <div className="auth-divider" aria-hidden="true">
          <span>أو جرّب الدخول بأحد الحسابات الجاهزة</span>
        </div>

        <div className="auth-sample__grid">
          {testAccounts.map((account) => (
            <button
              key={account.role}
              type="button"
              className="auth-sample__item"
              data-tone={account.tone}
              onClick={() => fillTestData(account.nationalId, account.pin)}
            >
              <span className="auth-sample__role">{account.role}</span>
              <span className="auth-sample__meta">رقم الهوية: {account.nationalId}</span>
            </button>
          ))}
        </div>

        <div className="auth-register-prompt">
          <span>ليس لديك حساب؟</span>
          <Link to="/register">إنشاء حساب جديد</Link>
        </div>
      </motion.form>
    </motion.div>
  );

  // DEBUG: Log on every render
  console.log('🔐 LOGIN RENDER:', {
    twoFactorRequired: twoFactor.required,
    hasTempToken: !!twoFactor.tempToken,
    isLoading,
    authLoading
  });

  return (
    <div className="auth-page" aria-labelledby="login-title">
      <section className="auth-page__panel" role="presentation">
        <AnimatePresence mode="wait">
          {twoFactor.required ? render2FAForm() : renderLoginForm()}
        </AnimatePresence>
      </section>

      <section className="auth-page__hero" aria-hidden="true">
        <motion.div
          className="auth-hero"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.75 }}
        >
          <div className="auth-hero__section">
            <div className="auth-hero__brand">
              <span className="auth-hero__icon">
                <Sparkles size={32} />
              </span>
              <div>
                <p className="auth-hero__brand-name">منصة المحاماة الذكية</p>
                <p className="auth-hero__brand-copy">حل رقمي متكامل لإدارة مكاتب المحاماة الحديثة</p>
              </div>
            </div>
            <h2 className="auth-hero__title">ترسيخ الثقة مع كل جلسة وكل قضية</h2>
            <p className="auth-hero__subtitle">
              لوحة تحكم موحدة للفرق القانونية والعملاء، مع أدوات متقدمة لتتبع القضايا، تنظيم المهام، وتحليل الأداء.
            </p>
            <ul className="auth-hero__list">
              {heroFeatures.map(({ icon: FeatureIcon, label }) => (
                <li key={label} className="auth-hero__list-item">
                  <FeatureIcon size={18} />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="auth-hero__section auth-hero__footer">
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default Login;
