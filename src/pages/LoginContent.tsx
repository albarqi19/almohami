import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Scale,
    IdCard,
    Lock,
    Eye,
    EyeOff,
    LogIn,
} from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';

interface LoginForm {
    nationalId: string;
    pin: string;
    rememberMe: boolean;
}

/**
 * LoginContent - محتوى صفحة تسجيل الدخول
 * يُستخدم داخل AuthLayout
 */
const LoginContent: React.FC = () => {
    const { user, login, isLoading: authLoading } = useAuth();
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
            const success = await login(formData.nationalId.trim(), formData.pin);
            if (!success) {
                setError('رقم الهوية أو الرقم السري غير صحيح');
                return;
            }

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
                    <div className="text-center">
                        <h1 
                            id="login-title" 
                            className="auth-card__title"
                            style={{ 
                                color: tenant.text_color || '#ffffff',
                                marginBottom: '8px'
                            }}
                        >
                            {tenant.name}
                        </h1>
                        <p 
                            className="auth-card__subtitle"
                            style={{ 
                                color: tenant.text_color ? `${tenant.text_color}dd` : 'rgba(255, 255, 255, 0.9)',
                            }}
                        >
                            {tenant.tagline || 'سجّل دخولك للوصول إلى النظام'}
                        </p>
                    </div>
                ) : (
                    <>
                        <span className="auth-card__logo" aria-hidden="true">
                            <Scale size={32} />
                        </span>
                        <div>
                            <h1 id="login-title" className="auth-card__title">نظام إدارة المحاماة</h1>
                            <p className="auth-card__subtitle">سجّل دخولك للوصول إلى القضايا، المهام، والتقارير الفورية</p>
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

            <form className="auth-form" onSubmit={handleSubmit} aria-describedby="login-title">
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
            </form>
        </motion.div>
    );
};

export default LoginContent;
