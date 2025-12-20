import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
    Scale,
    Building2,
    User,
    Mail,
    Phone,
    IdCard,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    ArrowLeft,
    Check,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { apiClient } from '../utils/api';
import '../styles/auth.css';

interface TenantFormData {
    // Company info
    company_name: string;
    company_slug: string;
    company_email: string;
    company_phone: string;
    // Owner info
    owner_name: string;
    owner_national_id: string;
    owner_email: string;
    owner_pin: string;
    owner_pin_confirmation: string;
    owner_phone: string;
}

interface FormErrors {
    [key: string]: string;
}

// Convert Arabic/special characters to English slug
const generateSlug = (name: string): string => {
    // Simple transliteration map for common Arabic characters
    const arabicToEnglish: Record<string, string> = {
        'ا': 'a', 'أ': 'a', 'إ': 'e', 'آ': 'a',
        'ب': 'b', 'ت': 't', 'ث': 'th',
        'ج': 'j', 'ح': 'h', 'خ': 'kh',
        'د': 'd', 'ذ': 'th', 'ر': 'r', 'ز': 'z',
        'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd',
        'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh',
        'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l',
        'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w',
        'ي': 'y', 'ى': 'a', 'ة': 'h', 'ء': '',
        'ئ': 'e', 'ؤ': 'o', 'لا': 'la',
    };

    let slug = name.toLowerCase();

    // Replace Arabic characters
    for (const [arabic, english] of Object.entries(arabicToEnglish)) {
        slug = slug.split(arabic).join(english);
    }

    // Replace spaces and special chars with hyphens
    slug = slug
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return slug;
};

const RegisterTenant: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [showPin, setShowPin] = useState(false);
    const [showPinConfirm, setShowPinConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState<TenantFormData>({
        company_name: '',
        company_slug: '',
        company_email: '',
        company_phone: '',
        owner_name: '',
        owner_national_id: '',
        owner_email: '',
        owner_pin: '',
        owner_pin_confirmation: '',
        owner_phone: '',
    });

    const [errors, setErrors] = useState<FormErrors>({});

    // Auto-generate slug when company name changes
    const handleCompanyNameChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            company_name: value,
            company_slug: generateSlug(value),
        }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        if (name === 'company_name') {
            handleCompanyNameChange(value);
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
        }

        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validateStep1 = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.company_name.trim()) {
            newErrors.company_name = 'اسم الشركة مطلوب';
        }

        if (!formData.company_email.trim()) {
            newErrors.company_email = 'البريد الإلكتروني مطلوب';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.company_email)) {
            newErrors.company_email = 'صيغة البريد غير صحيحة';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.owner_name.trim()) {
            newErrors.owner_name = 'الاسم مطلوب';
        }

        if (!formData.owner_national_id.trim()) {
            newErrors.owner_national_id = 'رقم الهوية مطلوب';
        } else if (!/^\d{10}$/.test(formData.owner_national_id)) {
            newErrors.owner_national_id = 'رقم الهوية يجب أن يكون 10 أرقام';
        }

        if (!formData.owner_email.trim()) {
            newErrors.owner_email = 'البريد الإلكتروني مطلوب';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.owner_email)) {
            newErrors.owner_email = 'صيغة البريد غير صحيحة';
        }

        if (!formData.owner_pin) {
            newErrors.owner_pin = 'الرقم السري مطلوب';
        } else if (formData.owner_pin.length < 4) {
            newErrors.owner_pin = 'الرقم السري يجب أن يكون 4 أرقام على الأقل';
        }

        if (formData.owner_pin !== formData.owner_pin_confirmation) {
            newErrors.owner_pin_confirmation = 'الرقم السري غير متطابق';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (step === 1 && validateStep1()) {
            setStep(2);
        } else if (step === 2 && validateStep2()) {
            setStep(3);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');

        try {
            const payload = {
                company_name: formData.company_name,
                company_slug: formData.company_slug || generateSlug(formData.company_name),
                company_email: formData.company_email,
                company_phone: formData.company_phone || undefined,
                owner_name: formData.owner_name,
                owner_national_id: formData.owner_national_id,
                owner_email: formData.owner_email,
                owner_pin: formData.owner_pin,
                owner_pin_confirmation: formData.owner_pin_confirmation,
                owner_phone: formData.owner_phone || undefined,
            };

            const response = await apiClient.post<{
                success: boolean;
                message: string;
                data?: {
                    token: string;
                    user: any;
                    tenant: any;
                };
                errors?: Record<string, string[]>;
            }>('/auth/register-tenant', payload);

            if (response.success && response.data) {
                // Save token and redirect
                apiClient.setToken(response.data.token);
                setSuccess(true);

                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);
            } else {
                setError(response.message || 'حدث خطأ أثناء التسجيل');
            }
        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء التسجيل');
        } finally {
            setIsLoading(false);
        }
    };

    const steps = [
        { number: 1, title: 'بيانات الشركة' },
        { number: 2, title: 'بيانات المالك' },
        { number: 3, title: 'مراجعة وتأكيد' },
    ];

    if (success) {
        return (
            <div className="auth-page">
                <section className="auth-page__panel">
                    <motion.div
                        className="auth-card"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="auth-success">
                            <span className="auth-success__icon">
                                <Check size={32} />
                            </span>
                            <h2 className="auth-success__title">تم التسجيل بنجاح!</h2>
                            <p className="auth-success__desc">
                                مرحباً بك في منصة إدارة المحاماة. جاري تحويلك للوحة التحكم...
                            </p>
                        </div>
                    </motion.div>
                </section>
            </div>
        );
    }

    return (
        <div className="auth-page" aria-labelledby="register-tenant-title">
            <section className="auth-page__panel" role="presentation">
                <motion.div
                    className="auth-card"
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <header className="auth-card__brand">
                        <motion.span
                            className="auth-card__logo"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                        >
                            <Scale size={28} />
                        </motion.span>
                        <div>
                            <h1 id="register-tenant-title" className="auth-card__title">تسجيل شركة محاماة</h1>
                            <p className="auth-card__subtitle">الخطوة {step} من 3</p>
                        </div>
                    </header>

                    {/* Steps Indicator */}
                    <div className="auth-steps">
                        {steps.map((s, index) => (
                            <React.Fragment key={s.number}>
                                <div
                                    className={`auth-step ${step >= s.number ? 'auth-step--active' : ''} ${step > s.number ? 'auth-step--completed' : ''}`}
                                >
                                    <span className="auth-step__number">
                                        {step > s.number ? <Check size={14} /> : s.number}
                                    </span>
                                    <span className="auth-step__title">{s.title}</span>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`auth-step__line ${step > s.number ? 'auth-step__line--active' : ''}`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {error && (
                        <motion.div
                            className="auth-alert auth-alert--error"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <AlertCircle size={16} />
                            {error}
                        </motion.div>
                    )}

                    <AnimatePresence mode="wait">
                        {/* Step 1: Company Info */}
                        {step === 1 && (
                            <motion.form
                                key="step1"
                                className="auth-form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={(e) => { e.preventDefault(); handleNext(); }}
                            >
                                <div className="form-field">
                                    <label className="form-label" htmlFor="company_name">
                                        اسم الشركة <span className="form-required">*</span>
                                    </label>
                                    <div className="auth-field">
                                        <span className="auth-field__icon"><Building2 size={18} /></span>
                                        <input
                                            id="company_name"
                                            name="company_name"
                                            type="text"
                                            className={`input auth-field__input--with-icon ${errors.company_name ? 'input--error' : ''}`}
                                            placeholder="مثال: مكتب الريادة للمحاماة"
                                            value={formData.company_name}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    {errors.company_name && <span className="form-error">{errors.company_name}</span>}
                                </div>

                                <div className="form-field">
                                    <label className="form-label" htmlFor="company_slug">
                                        المعرّف الفريد <span className="form-optional">(اختياري)</span>
                                    </label>
                                    <div className="auth-field">
                                        <input
                                            id="company_slug"
                                            name="company_slug"
                                            type="text"
                                            className="input"
                                            placeholder="يتم توليده تلقائياً"
                                            value={formData.company_slug}
                                            onChange={handleInputChange}
                                            dir="ltr"
                                        />
                                    </div>
                                    <span className="form-hint">سيكون رابطك: {formData.company_slug || 'your-company'}.example.com</span>
                                </div>

                                <div className="form-field">
                                    <label className="form-label" htmlFor="company_email">
                                        البريد الإلكتروني <span className="form-required">*</span>
                                    </label>
                                    <div className="auth-field">
                                        <span className="auth-field__icon"><Mail size={18} /></span>
                                        <input
                                            id="company_email"
                                            name="company_email"
                                            type="email"
                                            className={`input auth-field__input--with-icon ${errors.company_email ? 'input--error' : ''}`}
                                            placeholder="info@example.com"
                                            value={formData.company_email}
                                            onChange={handleInputChange}
                                            dir="ltr"
                                        />
                                    </div>
                                    {errors.company_email && <span className="form-error">{errors.company_email}</span>}
                                </div>

                                <div className="form-field">
                                    <label className="form-label" htmlFor="company_phone">
                                        رقم الجوال <span className="form-optional">(اختياري)</span>
                                    </label>
                                    <div className="auth-field">
                                        <span className="auth-field__icon"><Phone size={18} /></span>
                                        <input
                                            id="company_phone"
                                            name="company_phone"
                                            type="tel"
                                            className="input auth-field__input--with-icon"
                                            placeholder="05xxxxxxxx"
                                            value={formData.company_phone}
                                            onChange={handleInputChange}
                                            dir="ltr"
                                        />
                                    </div>
                                </div>

                                <div className="auth-form__actions">
                                    <Link to="/register" className="button button--ghost">
                                        <ArrowRight size={16} />
                                        رجوع
                                    </Link>
                                    <button type="submit" className="button button--primary">
                                        التالي
                                        <ArrowLeft size={16} />
                                    </button>
                                </div>
                            </motion.form>
                        )}

                        {/* Step 2: Owner Info */}
                        {step === 2 && (
                            <motion.form
                                key="step2"
                                className="auth-form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={(e) => { e.preventDefault(); handleNext(); }}
                            >
                                <div className="form-field">
                                    <label className="form-label" htmlFor="owner_name">
                                        الاسم الكامل <span className="form-required">*</span>
                                    </label>
                                    <div className="auth-field">
                                        <span className="auth-field__icon"><User size={18} /></span>
                                        <input
                                            id="owner_name"
                                            name="owner_name"
                                            type="text"
                                            className={`input auth-field__input--with-icon ${errors.owner_name ? 'input--error' : ''}`}
                                            placeholder="الاسم الثلاثي"
                                            value={formData.owner_name}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    {errors.owner_name && <span className="form-error">{errors.owner_name}</span>}
                                </div>

                                <div className="form-field">
                                    <label className="form-label" htmlFor="owner_national_id">
                                        رقم الهوية <span className="form-required">*</span>
                                    </label>
                                    <div className="auth-field">
                                        <span className="auth-field__icon"><IdCard size={18} /></span>
                                        <input
                                            id="owner_national_id"
                                            name="owner_national_id"
                                            type="text"
                                            className={`input auth-field__input--with-icon ${errors.owner_national_id ? 'input--error' : ''}`}
                                            placeholder="10 أرقام"
                                            value={formData.owner_national_id}
                                            onChange={handleInputChange}
                                            maxLength={10}
                                            inputMode="numeric"
                                            dir="ltr"
                                        />
                                    </div>
                                    {errors.owner_national_id && <span className="form-error">{errors.owner_national_id}</span>}
                                </div>

                                <div className="form-field">
                                    <label className="form-label" htmlFor="owner_email">
                                        البريد الإلكتروني <span className="form-required">*</span>
                                    </label>
                                    <div className="auth-field">
                                        <span className="auth-field__icon"><Mail size={18} /></span>
                                        <input
                                            id="owner_email"
                                            name="owner_email"
                                            type="email"
                                            className={`input auth-field__input--with-icon ${errors.owner_email ? 'input--error' : ''}`}
                                            placeholder="your@email.com"
                                            value={formData.owner_email}
                                            onChange={handleInputChange}
                                            dir="ltr"
                                        />
                                    </div>
                                    {errors.owner_email && <span className="form-error">{errors.owner_email}</span>}
                                </div>

                                <div className="form-row">
                                    <div className="form-field">
                                        <label className="form-label" htmlFor="owner_pin">
                                            الرقم السري <span className="form-required">*</span>
                                        </label>
                                        <div className="auth-field">
                                            <span className="auth-field__icon"><Lock size={18} /></span>
                                            <input
                                                id="owner_pin"
                                                name="owner_pin"
                                                type={showPin ? 'text' : 'password'}
                                                className={`input auth-field__input--with-icon auth-field__input--with-toggle ${errors.owner_pin ? 'input--error' : ''}`}
                                                placeholder="4 أرقام على الأقل"
                                                value={formData.owner_pin}
                                                onChange={handleInputChange}
                                                dir="ltr"
                                            />
                                            <button
                                                type="button"
                                                className="auth-field__toggle"
                                                onClick={() => setShowPin(!showPin)}
                                            >
                                                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        {errors.owner_pin && <span className="form-error">{errors.owner_pin}</span>}
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label" htmlFor="owner_pin_confirmation">
                                            تأكيد الرقم السري <span className="form-required">*</span>
                                        </label>
                                        <div className="auth-field">
                                            <span className="auth-field__icon"><Lock size={18} /></span>
                                            <input
                                                id="owner_pin_confirmation"
                                                name="owner_pin_confirmation"
                                                type={showPinConfirm ? 'text' : 'password'}
                                                className={`input auth-field__input--with-icon auth-field__input--with-toggle ${errors.owner_pin_confirmation ? 'input--error' : ''}`}
                                                placeholder="أعد كتابة الرقم السري"
                                                value={formData.owner_pin_confirmation}
                                                onChange={handleInputChange}
                                                dir="ltr"
                                            />
                                            <button
                                                type="button"
                                                className="auth-field__toggle"
                                                onClick={() => setShowPinConfirm(!showPinConfirm)}
                                            >
                                                {showPinConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        {errors.owner_pin_confirmation && <span className="form-error">{errors.owner_pin_confirmation}</span>}
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label" htmlFor="owner_phone">
                                        رقم الجوال <span className="form-optional">(اختياري)</span>
                                    </label>
                                    <div className="auth-field">
                                        <span className="auth-field__icon"><Phone size={18} /></span>
                                        <input
                                            id="owner_phone"
                                            name="owner_phone"
                                            type="tel"
                                            className="input auth-field__input--with-icon"
                                            placeholder="05xxxxxxxx"
                                            value={formData.owner_phone}
                                            onChange={handleInputChange}
                                            dir="ltr"
                                        />
                                    </div>
                                </div>

                                <div className="auth-form__actions">
                                    <button type="button" className="button button--ghost" onClick={handleBack}>
                                        <ArrowRight size={16} />
                                        السابق
                                    </button>
                                    <button type="submit" className="button button--primary">
                                        التالي
                                        <ArrowLeft size={16} />
                                    </button>
                                </div>
                            </motion.form>
                        )}

                        {/* Step 3: Review */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                className="auth-form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="auth-summary">
                                    <h3 className="auth-summary__section-title">بيانات الشركة</h3>
                                    <div className="auth-summary__grid">
                                        <div className="auth-summary__item">
                                            <span className="auth-summary__label">اسم الشركة</span>
                                            <span className="auth-summary__value">{formData.company_name}</span>
                                        </div>
                                        <div className="auth-summary__item">
                                            <span className="auth-summary__label">المعرّف</span>
                                            <span className="auth-summary__value" dir="ltr">{formData.company_slug}</span>
                                        </div>
                                        <div className="auth-summary__item">
                                            <span className="auth-summary__label">البريد الإلكتروني</span>
                                            <span className="auth-summary__value" dir="ltr">{formData.company_email}</span>
                                        </div>
                                        {formData.company_phone && (
                                            <div className="auth-summary__item">
                                                <span className="auth-summary__label">رقم الجوال</span>
                                                <span className="auth-summary__value" dir="ltr">{formData.company_phone}</span>
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="auth-summary__section-title">بيانات المالك</h3>
                                    <div className="auth-summary__grid">
                                        <div className="auth-summary__item">
                                            <span className="auth-summary__label">الاسم</span>
                                            <span className="auth-summary__value">{formData.owner_name}</span>
                                        </div>
                                        <div className="auth-summary__item">
                                            <span className="auth-summary__label">رقم الهوية</span>
                                            <span className="auth-summary__value" dir="ltr">{formData.owner_national_id}</span>
                                        </div>
                                        <div className="auth-summary__item">
                                            <span className="auth-summary__label">البريد الإلكتروني</span>
                                            <span className="auth-summary__value" dir="ltr">{formData.owner_email}</span>
                                        </div>
                                        {formData.owner_phone && (
                                            <div className="auth-summary__item">
                                                <span className="auth-summary__label">رقم الجوال</span>
                                                <span className="auth-summary__value" dir="ltr">{formData.owner_phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <p className="auth-summary__note">
                                    بالضغط على "تأكيد التسجيل" فإنك توافق على شروط الاستخدام وسياسة الخصوصية
                                </p>

                                <div className="auth-form__actions">
                                    <button type="button" className="button button--ghost" onClick={handleBack} disabled={isLoading}>
                                        <ArrowRight size={16} />
                                        السابق
                                    </button>
                                    <button
                                        type="button"
                                        className="button button--primary"
                                        onClick={handleSubmit}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 size={16} className="auth-spinner-icon" />
                                                جاري التسجيل...
                                            </>
                                        ) : (
                                            <>
                                                <Check size={16} />
                                                تأكيد التسجيل
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </section>

            <section className="auth-page__hero" aria-hidden="true">
                <motion.div
                    className="auth-hero"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="auth-hero__section">
                        <h2 className="auth-hero__title">ابدأ رحلتك الرقمية</h2>
                        <p className="auth-hero__subtitle">
                            سجّل مكتبك واحصل على فترة تجريبية مجانية لمدة 14 يوماً مع جميع الميزات
                        </p>
                    </div>
                </motion.div>
            </section>
        </div>
    );
};

export default RegisterTenant;
