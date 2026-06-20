import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IdCard,
    Lock,
    Eye,
    EyeOff,
    LogIn,
    ShieldCheck,
    ArrowRight,
} from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import AnimatedBrandMark from '../components/AnimatedBrandMark';

interface LoginForm {
    nationalId: string;
    pin: string;
    rememberMe: boolean;
}

/**
 * LoginContent - محتوى صفحة تسجيل الدخول
 * يُستخدم داخل AuthLayout
 */
interface TwoFactorState {
    required: boolean;
    tempToken: string;
    code: string;
}

const LoginContent: React.FC = () => {
    const { user, login, verify2FA, isLoading: authLoading } = useAuth();
    const { tenant, isSubdomain } = useTenant();
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
    const [successMessage, setSuccessMessage] = useState('');
    const [twoFactor, setTwoFactor] = useState<TwoFactorState>({
        required: false,
        tempToken: '',
        code: '',
    });
    const codeInputRef = useRef<HTMLInputElement>(null);

    // Check if user just registered
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('registered') === 'true') {
            setSuccessMessage('تم تسجيل شركتك بنجاح! يمكنك الآن تسجيل الدخول.');
        }
    }, [location.search]);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (!savedTheme) {
            document.documentElement.classList.add('diwan');
            document.body.classList.add('diwan');
            localStorage.setItem('theme', 'diwan');
        } else if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark');
        } else if (savedTheme === 'classic') {
            document.documentElement.classList.add('classic');
            document.body.classList.add('classic');
        } else if (savedTheme === 'diwan') {
            document.documentElement.classList.add('diwan');
            document.body.classList.add('diwan');
        } else {
            document.documentElement.classList.remove('dark', 'classic', 'diwan');
            document.body.classList.remove('dark', 'classic', 'diwan');
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

    // Focus on 2FA code input when required
    useEffect(() => {
        if (twoFactor.required && codeInputRef.current) {
            codeInputRef.current.focus();
        }
    }, [twoFactor.required]);

    // Redirect if already logged in
    if (user) {
        const from = location.state?.from?.pathname || '/dashboard';
        return <Navigate to={from} replace />;
    }

    if (authLoading) {
        return (
            <div className="auth-content-loader">
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
            const result = await login(formData.nationalId.trim(), formData.pin);

            if (!result.success) {
                // Handle specific error codes
                if (result.code === 'subscription_expired') {
                    // This shouldn't happen now that we allow login, but keep as fallback
                    setError('اشتراك الشركة منتهي. سيتم تحويلك إلى صفحة التجديد...');
                    setTimeout(() => {
                        window.location.href = '/account-status';
                    }, 2000);
                } else if (result.code === 'account_suspended') {
                    setError('تم تعليق حسابك. يرجى التواصل مع الإدارة.');
                } else {
                    setError(result.error || 'رقم الهوية أو الرقم السري غير صحيح');
                }
                return;
            }

            // Check if 2FA is required
            if (result.requires_2fa && result.temp_token) {
                setTwoFactor({
                    required: true,
                    tempToken: result.temp_token,
                    code: '',
                });
                return;
            }

            // Login successful - save remember me preference
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
        setIsLoading(true);
        setError('');

        try {
            const result = await verify2FA(twoFactor.tempToken, twoFactor.code);

            if (!result.success) {
                setError(result.error || 'رمز التحقق غير صحيح');
                return;
            }

            // 2FA successful - save remember me preference
            if (formData.rememberMe) {
                localStorage.setItem(rememberKey, 'true');
                localStorage.setItem(rememberValueKey, formData.nationalId.trim());
            } else {
                localStorage.removeItem(rememberKey);
                localStorage.removeItem(rememberValueKey);
            }
        } catch (error) {
            setError('حدث خطأ أثناء التحقق من الرمز');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        setTwoFactor({
            required: false,
            tempToken: '',
            code: '',
        });
        setError('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    return (
        <motion.div
            className="auth-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <header className="auth-card__brand">
                {isSubdomain && tenant ? (
                    <div className="text-center" style={{ width: '100%' }}>
                        <h1 id="login-title" className="auth-card__title">
                            تسجيل الدخول
                        </h1>
                        <p className="auth-card__subtitle">
                            {tenant.name}
                        </p>
                    </div>
                ) : (
                    <>
                        <span className="auth-card__logo" aria-hidden="true">
                            <AnimatedBrandMark size={36} />
                        </span>
                        <div>
                            <h1 id="login-title" className="auth-card__title">تسجيل الدخول</h1>
                            <p className="auth-card__subtitle">أدخل رقم هويتك ورقمك السري للمتابعة</p>
                        </div>
                    </>
                )}
            </header>

            {successMessage && (
                <motion.div
                    className="auth-alert auth-alert--success"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="status"
                >
                    {successMessage}
                </motion.div>
            )}

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

            <AnimatePresence mode="wait">
                {!twoFactor.required ? (
                    <motion.form
                        key="login-form"
                        className="auth-form"
                        onSubmit={handleSubmit}
                        aria-describedby="login-title"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
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

                        <button
                            type="submit"
                            className="button button--primary auth-submit"
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
                        </button>

                        {/* Hide register link on tenant subdomain */}
                        {!isSubdomain && (
                            <div className="auth-register-prompt">
                                <span>ليس لديك حساب؟</span>
                                <Link to="/register">إنشاء حساب جديد</Link>
                            </div>
                        )}
                    </motion.form>
                ) : (
                    <motion.form
                        key="2fa-form"
                        className="auth-form"
                        onSubmit={handle2FASubmit}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="auth-2fa-header">
                            <div className="auth-2fa-badge">
                                <ShieldCheck size={30} />
                            </div>
                            <h2 className="auth-2fa-title">المصادقة الثنائية</h2>
                            <p className="auth-2fa-desc">أدخل رمز التحقق من تطبيق Google Authenticator</p>
                        </div>

                        <div className="form-field">
                            <label className="form-label" htmlFor="2fa-code">رمز التحقق</label>
                            <div className="auth-field">
                                <span className="auth-field__icon" aria-hidden="true">
                                    <ShieldCheck size={18} />
                                </span>
                                <input
                                    ref={codeInputRef}
                                    id="2fa-code"
                                    type="text"
                                    className="input auth-field__input--with-icon auth-2fa-input"
                                    placeholder="أدخل الرمز المكون من 6 أرقام"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    autoComplete="one-time-code"
                                    required
                                    value={twoFactor.code}
                                    onChange={(e) => setTwoFactor(prev => ({
                                        ...prev,
                                        code: e.target.value.replace(/\D/g, '').slice(0, 6)
                                    }))}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="button button--primary auth-submit"
                            disabled={isLoading || twoFactor.code.length !== 6}
                        >
                            {isLoading ? (
                                <>
                                    <div className="auth-spinner" aria-hidden="true" />
                                    جاري التحقق...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={18} />
                                    تأكيد الرمز
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            className="button button--ghost auth-submit auth-2fa-back"
                            onClick={handleBack}
                        >
                            <ArrowRight size={18} />
                            العودة لتسجيل الدخول
                        </button>
                    </motion.form>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default LoginContent;
