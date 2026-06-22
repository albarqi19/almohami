import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
    Building2,
    User,
    Mail,
    IdCard,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    ArrowLeft,
    Check,
    AlertCircle,
    Loader2,
    Info,
    Search,
    Clock,
    BadgeCheck,
} from 'lucide-react';
import { apiClient } from '../utils/api';
import AnimatedBrandMark from '../components/AnimatedBrandMark';

interface TenantFormData {
    company_name: string;
    company_slug: string;
    company_email: string;
    company_phone: string;
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

interface SbaInfo {
    name?: string | null;
    license?: string | null;
    firm?: string | null;
    hasFirm: boolean;
}

const TURNSTILE_SITE_KEY: string =
    (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAADpJLOtAOy2qJNxB';

const generateSlug = (name: string): string => {
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
    for (const [arabic, english] of Object.entries(arabicToEnglish)) {
        slug = slug.split(arabic).join(english);
    }

    return slug
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30);
};

/** يحوّل أي صيغة جوال سعودي إلى الصيغة المحلية 05XXXXXXXX (للعرض والتعديل). */
const toLocalSaPhone = (raw: string): string => {
    let d = (raw || '').replace(/\D/g, '');
    if (d.startsWith('966')) d = d.slice(3);
    if (d.startsWith('0')) d = d.slice(1);
    if (d.length > 9) d = d.slice(-9);
    return d ? '0' + d : '';
};

/** حقل جوال سعودي بسيط (05XXXXXXXX) — بلا قائمة دول، قابل للتعديل دائماً. */
const SaudiPhoneInput: React.FC<{
    value: string;
    onChange: (v: string) => void;
    id?: string;
    placeholder?: string;
    hasError?: boolean;
}> = ({ value, onChange, id, placeholder, hasError }) => (
    <input
        id={id}
        type="tel"
        inputMode="numeric"
        dir="ltr"
        className={`input ${hasError ? 'input--error' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
        placeholder={placeholder || '05XXXXXXXX'}
        maxLength={10}
    />
);

/**
 * Cloudflare Turnstile widget — يحمّل سكربت Cloudflare مرة واحدة ويعرض التحدّي.
 * يستدعي onVerify بالرمز عند النجاح، وبسلسلة فارغة عند الخطأ/انتهاء الصلاحية.
 */
const TurnstileWidget: React.FC<{ onVerify: (token: string) => void }> = ({ onVerify }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const widgetId = React.useRef<string | null>(null);
    const cb = React.useRef(onVerify);
    cb.current = onVerify;
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    React.useEffect(() => {
        const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        let cancelled = false;
        let poll: ReturnType<typeof setInterval> | undefined;

        const doRender = () => {
            const ts = (window as any).turnstile;
            if (cancelled || !ts || !ref.current || widgetId.current !== null) return;
            if (ref.current.querySelector('iframe')) return; // تجنّب الرسم المزدوج
            try {
                widgetId.current = ts.render(ref.current, {
                    sitekey: TURNSTILE_SITE_KEY,
                    language: 'ar',
                    callback: (token: string) => cb.current(token),
                    'error-callback': () => { cb.current(''); setStatus('error'); },
                    'expired-callback': () => cb.current(''),
                });
                setStatus('ready');
            } catch (e) {
                console.error('Turnstile render failed:', e);
                setStatus('error');
            }
        };

        // لا نستخدم turnstile.ready() لأنها تتعارض مع تحميل السكربت بـ async/defer (يرفضها Cloudflare).
        // نستدعي render مباشرة بعد التأكد من توفّر window.turnstile (عبر onload/الاستطلاع).
        const ready = () => doRender();

        if ((window as any).turnstile) {
            ready();
        } else {
            let s = document.querySelector('script[data-turnstile]') as HTMLScriptElement | null;
            if (!s) {
                s = document.createElement('script');
                s.src = SRC;
                s.async = true;
                s.defer = true;
                s.setAttribute('data-turnstile', '1');
                document.head.appendChild(s);
            }
            s.addEventListener('load', ready);
            s.addEventListener('error', () => { if (!cancelled) setStatus('error'); });
            // احتياطي: استطلاع حتى 8 ثوانٍ تحسّباً لتأخّر onload
            let waited = 0;
            poll = setInterval(() => {
                waited += 200;
                if ((window as any).turnstile) { if (poll) clearInterval(poll); ready(); }
                else if (waited >= 8000) { if (poll) clearInterval(poll); if (!cancelled) setStatus('error'); }
            }, 200);
        }

        return () => {
            cancelled = true;
            if (poll) clearInterval(poll);
            const ts = (window as any).turnstile;
            if (ts && widgetId.current !== null) {
                try { ts.remove(widgetId.current); } catch { /* noop */ }
                widgetId.current = null;
            }
        };
    }, []);

    return (
        <div style={{ margin: '14px 0' }}>
            <div ref={ref} style={{ display: 'flex', justifyContent: 'center', minHeight: status === 'ready' ? 65 : 0 }} />
            {status === 'loading' && (
                <p className="form-hint" style={{ textAlign: 'center' }}>جارٍ تحميل التحقق الأمني…</p>
            )}
            {status === 'error' && (
                <p className="form-hint" style={{ textAlign: 'center', color: 'var(--law-gold, #b8893d)' }}>
                    تعذّر تحميل التحقق الأمني — تحقّق من اتصالك، أو تابع عبر «التسجيل بدون توثيق» بالأسفل.
                </p>
            )}
        </div>
    );
};

/**
 * RegisterTenantContent - محتوى صفحة تسجيل شركة المحاماة (يُستخدم داخل AuthLayout).
 * التدفق: تحقّق بالهوية أولاً (تعبئة تلقائية للبيانات) → استكمال البيانات → تأكيد.
 * الموثّق يدخل مباشرة؛ غير الموثّق ينتظر موافقة المالك.
 */
const RegisterTenantContent: React.FC = () => {
    const navigate = useNavigate();

    // مراحل الصفحة
    const [verifyDone, setVerifyDone] = useState(false);
    const [pendingApproval, setPendingApproval] = useState(false);
    const [success, setSuccess] = useState(false);

    // خطوة التحقق بالهوية
    const [verifyId, setVerifyId] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState('');
    const [turnstileToken, setTurnstileToken] = useState('');
    const [sbaInfo, setSbaInfo] = useState<SbaInfo | null>(null);

    // معالج التسجيل
    const [step, setStep] = useState(1);
    const [showPin, setShowPin] = useState(false);
    const [showPinConfirm, setShowPinConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

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

    const handleTurnstile = useCallback((token: string) => setTurnstileToken(token), []);

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
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    // ===== خطوة التحقق بالهوية =====
    const runVerification = async () => {
        setVerifyError('');

        if (!/^\d{10}$/.test(verifyId)) {
            setVerifyError('رقم الهوية يجب أن يكون 10 أرقام');
            return;
        }
        if (TURNSTILE_SITE_KEY && !turnstileToken) {
            setVerifyError('يرجى إكمال التحقق الأمني أولاً');
            return;
        }

        setVerifying(true);
        try {
            const resp = await apiClient.post<{
                success: boolean;
                data?: {
                    status: string;
                    found: boolean;
                    has_firm: boolean;
                    lawyer?: { name?: string; license_number?: string; license_status?: string; city?: string } | null;
                    firm?: { name?: string; email?: string; phone?: string; logo_url?: string } | null;
                };
            }>('/auth/verify-lawyer', { national_id: verifyId, turnstile_token: turnstileToken });

            const data = resp.data;

            if (data?.found) {
                const updates: Partial<TenantFormData> = { owner_national_id: verifyId };
                if (data.lawyer?.name) updates.owner_name = data.lawyer.name;
                if (data.firm) {
                    if (data.firm.name) {
                        updates.company_name = data.firm.name;
                        updates.company_slug = generateSlug(data.firm.name);
                    }
                    if (data.firm.email) updates.company_email = data.firm.email;
                    if (data.firm.phone) updates.company_phone = toLocalSaPhone(data.firm.phone);
                }
                setFormData(prev => ({ ...prev, ...updates }));
                setSbaInfo({
                    name: data.lawyer?.name,
                    license: data.lawyer?.license_number,
                    firm: data.firm?.name,
                    hasFirm: !!data.has_firm,
                });
            } else {
                // غير موجود في السجل — يكمل يدوياً (سيخضع للمراجعة)
                setFormData(prev => ({ ...prev, owner_national_id: verifyId }));
                setSbaInfo(null);
            }

            setVerifyDone(true);
        } catch (err: any) {
            setVerifyError(err?.message || 'تعذّر التحقق الآن، يمكنك المتابعة بإكمال البيانات يدوياً');
        } finally {
            setVerifying(false);
        }
    };

    // التسجيل بدون توثيق (تخطّي خطوة التحقق)
    const skipVerification = () => {
        if (verifyId && /^\d{10}$/.test(verifyId)) {
            setFormData(prev => ({ ...prev, owner_national_id: verifyId }));
        }
        setSbaInfo(null);
        setVerifyDone(true);
    };

    const SLUG_MAX = 30;

    const validateStep1 = (): boolean => {
        const newErrors: FormErrors = {};
        if (!formData.company_name.trim()) newErrors.company_name = 'اسم الشركة مطلوب';

        const slug = formData.company_slug.trim();
        if (!slug) {
            newErrors.company_slug = 'المعرّف الفريد مطلوب — يتولّد تلقائياً من اسم الشركة ويمكنك تعديله';
        } else if (!/^[a-z0-9-]+$/.test(slug)) {
            newErrors.company_slug = 'المعرّف يقبل أحرفاً إنجليزية صغيرة وأرقاماً وشرطات فقط';
        } else if (slug.length > SLUG_MAX) {
            newErrors.company_slug = `المعرّف طويل جداً — اختصره إلى ${SLUG_MAX} حرفاً أو أقل ليكون رابطك سهل التذكر`;
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
        if (!formData.owner_name.trim()) newErrors.owner_name = 'الاسم مطلوب';
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
        if (!formData.owner_phone.trim()) {
            newErrors.owner_phone = 'رقم الجوال مطلوب';
        } else if (!/^05\d{8}$/.test(formData.owner_phone)) {
            newErrors.owner_phone = 'أدخل رقم جوال سعودي صحيح (05XXXXXXXX)';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (step === 1 && validateStep1()) setStep(2);
        else if (step === 2 && validateStep2()) setStep(3);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');

        const savedTheme = localStorage.getItem('theme');
        localStorage.clear();
        if (savedTheme) {
            localStorage.setItem('theme', savedTheme);
        }
        apiClient.setToken(null);

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
                data?: { token?: string | null; user?: any; tenant?: any; approval_status?: string; requires_approval?: boolean };
                errors?: Record<string, string[]>;
            }>('/auth/register-tenant', payload);

            if (response.success && response.data) {
                if (response.data.requires_approval) {
                    // غير موثّق → بانتظار موافقة المالك (لا دخول)
                    setPendingApproval(true);
                } else if (response.data.token) {
                    // موثّق → دخول مباشر
                    apiClient.setToken(response.data.token);
                    setSuccess(true);
                    setTimeout(() => navigate('/dashboard'), 1600);
                } else {
                    setSuccess(true);
                    setTimeout(() => navigate('/login?registered=true'), 2000);
                }
            } else {
                if (response.errors) {
                    const errorMessages = Object.values(response.errors).flat().join('، ');
                    setError(errorMessages || response.message || 'حدث خطأ أثناء التسجيل');
                } else {
                    setError(response.message || 'حدث خطأ أثناء التسجيل');
                }
            }
        } catch (err: any) {
            if (err.errors) {
                const errorMessages = Object.values(err.errors as Record<string, string[]>).flat().join('، ');
                setError(errorMessages);
            } else {
                setError(err.message || 'حدث خطأ أثناء التسجيل');
            }
            console.error('Registration error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const steps = [
        { number: 1, title: 'بيانات الشركة' },
        { number: 2, title: 'بيانات المالك' },
        { number: 3, title: 'مراجعة وتأكيد' },
    ];

    // ===== شاشة: نجاح الموثّق (دخول مباشر) =====
    if (success) {
        return (
            <motion.div className="auth-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="auth-success">
                    <span className="auth-success__icon"><Check size={32} /></span>
                    <h2 className="auth-success__title">تم التسجيل بنجاح!</h2>
                    <p className="auth-success__desc">مرحباً بك في منصة إدارة المحاماة. جارٍ تجهيز لوحة التحكم...</p>
                </div>
            </motion.div>
        );
    }

    // ===== شاشة: بانتظار الموافقة (غير الموثّق) =====
    if (pendingApproval) {
        return (
            <motion.div className="auth-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="auth-success">
                    <span className="auth-success__icon" style={{ background: 'var(--law-gold, #b8893d)' }}><Clock size={32} /></span>
                    <h2 className="auth-success__title">طلبك قيد المراجعة</h2>
                    <p className="auth-success__desc">
                        تم استلام طلب تسجيلك بنجاح. سيراجع فريقنا الطلب ويُفعّل حسابك قريباً،
                        وستصلك رسالة على جوالك فور التفعيل لتتمكّن من الدخول.
                    </p>
                    <Link to="/login" className="button button--primary" style={{ marginTop: 16 }}>
                        العودة لتسجيل الدخول
                    </Link>
                </div>
            </motion.div>
        );
    }

    // ===== شاشة: التحقق بالهوية (الخطوة الأولى) =====
    if (!verifyDone) {
        return (
            <motion.div className="auth-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <header className="auth-card__brand">
                    <span className="auth-card__logo"><AnimatedBrandMark size={36} /></span>
                    <div>
                        <h1 className="auth-card__title">تسجيل شركة محاماة</h1>
                        <p className="auth-card__subtitle">لنبدأ بالتحقق من هويتك</p>
                    </div>
                </header>

                {verifyError && (
                    <motion.div className="auth-alert auth-alert--error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                        <AlertCircle size={16} /> {verifyError}
                    </motion.div>
                )}

                <div className="auth-form">
                    <div className="form-field">
                        <label className="form-label" htmlFor="verify_id">
                            رقم الهوية الوطنية <span className="form-required">*</span>
                            <span className="auth-info" tabIndex={0} role="note" aria-label="لماذا نطلب رقم الهوية؟">
                                <Info size={12} />
                                <span className="auth-info__tip">
                                    نستخدم رقم الهوية للتحقق من بيانات شركتك ومكتبك وتعبئتها تلقائياً لتسهيل تسجيلك — وبياناتك محفوظة بأمان.
                                </span>
                            </span>
                        </label>
                        <div className="auth-field">
                            <span className="auth-field__icon"><IdCard size={18} /></span>
                            <input
                                id="verify_id"
                                type="text"
                                className="input auth-field__input--with-icon"
                                placeholder="10 أرقام"
                                value={verifyId}
                                onChange={(e) => { setVerifyId(e.target.value.replace(/\D/g, '').slice(0, 10)); setVerifyError(''); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runVerification(); } }}
                                maxLength={10}
                                inputMode="numeric"
                                dir="ltr"
                                autoFocus
                            />
                        </div>
                    </div>

                    <TurnstileWidget onVerify={handleTurnstile} />

                    <button type="button" className="button button--primary" onClick={runVerification} disabled={verifying}>
                        {verifying
                            ? (<><Loader2 size={16} className="auth-spinner-icon" /> جارٍ التحقق...</>)
                            : (<><Search size={16} /> تحقّق وابدأ التسجيل</>)}
                    </button>

                    <div className="auth-form__actions" style={{ justifyContent: 'space-between' }}>
                        <Link to="/register" className="button button--ghost"><ArrowRight size={16} /> رجوع</Link>
                        <button type="button" className="auth-link" onClick={skipVerification} disabled={verifying}>
                            التسجيل بدون توثيق
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    // ===== معالج التسجيل (بعد التحقق/التخطّي) =====
    return (
        <motion.div
            className="auth-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <header className="auth-card__brand">
                <span className="auth-card__logo"><AnimatedBrandMark size={36} /></span>
                <div>
                    <h1 className="auth-card__title">تسجيل شركة محاماة</h1>
                    <p className="auth-card__subtitle">الخطوة {step} من 3 — {steps[step - 1].title}</p>
                </div>
            </header>

            {/* لافتة نتيجة التحقق من بيانات المكتب */}
            {sbaInfo && (
                <motion.div
                    className="auth-alert"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ background: 'rgba(46,160,67,0.10)', borderColor: 'rgba(46,160,67,0.35)', color: 'var(--law-navy, #1f2937)' }}
                >
                    <BadgeCheck size={18} style={{ color: '#2ea043', flexShrink: 0 }} />
                    <span>
                        تم التحقق من بيانات مكتبك ✓ <b>{sbaInfo.name}</b>
                        {sbaInfo.hasFirm && sbaInfo.firm ? ` · ${sbaInfo.firm}` : ' · يمكنك إدخال اسم مكتبك.'}
                    </span>
                </motion.div>
            )}
            {!sbaInfo && (
                <motion.div
                    className="auth-alert"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ background: 'rgba(184,137,61,0.10)', borderColor: 'rgba(184,137,61,0.35)' }}
                >
                    <Info size={18} style={{ flexShrink: 0 }} />
                    <span>أكمل بياناتك — سيخضع طلبك لمراجعة سريعة قبل التفعيل.</span>
                </motion.div>
            )}

            {/* Steps Indicator */}
            <div className="auth-steps">
                {steps.map((s, index) => (
                    <React.Fragment key={s.number}>
                        <div className={`auth-step ${step >= s.number ? 'auth-step--active' : ''} ${step > s.number ? 'auth-step--completed' : ''}`}>
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
                <motion.div className="auth-alert auth-alert--error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                    <AlertCircle size={16} /> {error}
                </motion.div>
            )}

            <AnimatePresence mode="wait">
                {/* Step 1 */}
                {step === 1 && (
                    <motion.form key="step1" className="auth-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
                        <div className="form-field">
                            <label className="form-label" htmlFor="company_name">اسم الشركة <span className="form-required">*</span></label>
                            <div className="auth-field">
                                <span className="auth-field__icon"><Building2 size={18} /></span>
                                <input id="company_name" name="company_name" type="text" className={`input auth-field__input--with-icon ${errors.company_name ? 'input--error' : ''}`} placeholder="مثال: مكتب الريادة للمحاماة" value={formData.company_name} onChange={handleInputChange} />
                            </div>
                            {errors.company_name && <span className="form-error">{errors.company_name}</span>}
                        </div>

                        <div className="form-field">
                            <label className="form-label" htmlFor="company_slug">
                                المعرّف الفريد <span className="form-required">*</span>
                                <span className="auth-info" tabIndex={0} role="note" aria-label="ما هو المعرّف الفريد؟">
                                    <Info size={12} />
                                    <span className="auth-info__tip">
                                        هذا عنوان مكتبك على الإنترنت — يدخل منه فريقك وعملاؤك إلى النظام. اجعله قصيراً وسهل التذكر.
                                    </span>
                                </span>
                            </label>
                            <div className="auth-field">
                                <input id="company_slug" name="company_slug" type="text" className={`input ${errors.company_slug ? 'input--error' : ''}`} placeholder="يتولّد تلقائياً من اسم الشركة" value={formData.company_slug} onChange={handleInputChange} dir="ltr" maxLength={50} />
                            </div>
                            {errors.company_slug && <span className="form-error">{errors.company_slug}</span>}
                            <span className="form-hint">
                                هذا سيكون رابط مكتبك الخاص: <b dir="ltr">{formData.company_slug || 'your-company'}.alraedlaw.com</b>
                            </span>
                            {!errors.company_slug && formData.company_slug.length > SLUG_MAX && (
                                <span className="form-warn">
                                    المعرّف طويل ({formData.company_slug.length} حرفاً) — اختصره ليكون رابطك أسهل في الكتابة والتذكر
                                </span>
                            )}
                        </div>

                        <div className="form-row">
                            <div className="form-field">
                                <label className="form-label" htmlFor="company_email">البريد الإلكتروني <span className="form-required">*</span></label>
                                <div className="auth-field">
                                    <span className="auth-field__icon"><Mail size={18} /></span>
                                    <input id="company_email" name="company_email" type="email" className={`input auth-field__input--with-icon ${errors.company_email ? 'input--error' : ''}`} placeholder="info@example.com" value={formData.company_email} onChange={handleInputChange} dir="ltr" />
                                </div>
                                {errors.company_email && <span className="form-error">{errors.company_email}</span>}
                            </div>
                            <div className="form-field">
                                <label className="form-label" htmlFor="company_phone">رقم الجوال <span className="form-optional">(اختياري)</span></label>
                                <SaudiPhoneInput id="company_phone" value={formData.company_phone} onChange={(v) => setFormData(prev => ({ ...prev, company_phone: v }))} />
                            </div>
                        </div>

                        <div className="auth-form__actions">
                            <button type="button" className="button button--ghost" onClick={() => setVerifyDone(false)}><ArrowRight size={16} /> رجوع</button>
                            <button type="submit" className="button button--primary">التالي <ArrowLeft size={16} /></button>
                        </div>
                    </motion.form>
                )}

                {/* Step 2 */}
                {step === 2 && (
                    <motion.form key="step2" className="auth-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
                        <div className="form-field">
                            <label className="form-label" htmlFor="owner_name">الاسم الكامل <span className="form-required">*</span></label>
                            <div className="auth-field">
                                <span className="auth-field__icon"><User size={18} /></span>
                                <input id="owner_name" name="owner_name" type="text" className={`input auth-field__input--with-icon ${errors.owner_name ? 'input--error' : ''}`} placeholder="الاسم الثلاثي" value={formData.owner_name} onChange={handleInputChange} readOnly={!!sbaInfo?.name} />
                            </div>
                            {errors.owner_name && <span className="form-error">{errors.owner_name}</span>}
                        </div>

                        <div className="form-row">
                            <div className="form-field">
                                <label className="form-label" htmlFor="owner_national_id">
                                    رقم الهوية <span className="form-required">*</span>
                                </label>
                                <div className="auth-field">
                                    <span className="auth-field__icon"><IdCard size={18} /></span>
                                    <input id="owner_national_id" name="owner_national_id" type="text" className={`input auth-field__input--with-icon ${errors.owner_national_id ? 'input--error' : ''}`} placeholder="10 أرقام" value={formData.owner_national_id} onChange={handleInputChange} maxLength={10} inputMode="numeric" dir="ltr" readOnly />
                                </div>
                                {errors.owner_national_id && <span className="form-error">{errors.owner_national_id}</span>}
                            </div>
                            <div className="form-field">
                                <label className="form-label" htmlFor="owner_phone">رقم الجوال <span className="form-required">*</span></label>
                                <SaudiPhoneInput id="owner_phone" hasError={!!errors.owner_phone} value={formData.owner_phone} onChange={(v) => { setFormData(prev => ({ ...prev, owner_phone: v })); if (errors.owner_phone) setErrors(prev => { const n = { ...prev }; delete n.owner_phone; return n; }); }} />
                                {errors.owner_phone && <span className="form-error">{errors.owner_phone}</span>}
                            </div>
                        </div>

                        <div className="form-field">
                            <label className="form-label" htmlFor="owner_email">البريد الإلكتروني <span className="form-required">*</span></label>
                            <div className="auth-field">
                                <span className="auth-field__icon"><Mail size={18} /></span>
                                <input id="owner_email" name="owner_email" type="email" className={`input auth-field__input--with-icon ${errors.owner_email ? 'input--error' : ''}`} placeholder="your@email.com" value={formData.owner_email} onChange={handleInputChange} dir="ltr" />
                            </div>
                            {errors.owner_email && <span className="form-error">{errors.owner_email}</span>}
                        </div>

                        <div className="form-row">
                            <div className="form-field">
                                <label className="form-label" htmlFor="owner_pin">الرقم السري <span className="form-required">*</span></label>
                                <div className="auth-field">
                                    <span className="auth-field__icon"><Lock size={18} /></span>
                                    <input id="owner_pin" name="owner_pin" type={showPin ? 'text' : 'password'} className={`input auth-field__input--with-icon auth-field__input--with-toggle ${errors.owner_pin ? 'input--error' : ''}`} placeholder="4 أرقام على الأقل" value={formData.owner_pin} onChange={handleInputChange} dir="ltr" />
                                    <button type="button" className="auth-field__toggle" onClick={() => setShowPin(!showPin)}>{showPin ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                                </div>
                                {errors.owner_pin && <span className="form-error">{errors.owner_pin}</span>}
                            </div>
                            <div className="form-field">
                                <label className="form-label" htmlFor="owner_pin_confirmation">تأكيد الرقم السري <span className="form-required">*</span></label>
                                <div className="auth-field">
                                    <span className="auth-field__icon"><Lock size={18} /></span>
                                    <input id="owner_pin_confirmation" name="owner_pin_confirmation" type={showPinConfirm ? 'text' : 'password'} className={`input auth-field__input--with-icon auth-field__input--with-toggle ${errors.owner_pin_confirmation ? 'input--error' : ''}`} placeholder="أعد كتابة الرقم السري" value={formData.owner_pin_confirmation} onChange={handleInputChange} dir="ltr" />
                                    <button type="button" className="auth-field__toggle" onClick={() => setShowPinConfirm(!showPinConfirm)}>{showPinConfirm ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                                </div>
                                {errors.owner_pin_confirmation && <span className="form-error">{errors.owner_pin_confirmation}</span>}
                            </div>
                        </div>

                        <div className="auth-form__actions">
                            <button type="button" className="button button--ghost" onClick={handleBack}><ArrowRight size={16} /> السابق</button>
                            <button type="submit" className="button button--primary">التالي <ArrowLeft size={16} /></button>
                        </div>
                    </motion.form>
                )}

                {/* Step 3 */}
                {step === 3 && (
                    <motion.div key="step3" className="auth-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <div className="auth-summary">
                            <h3 className="auth-summary__section-title">بيانات الشركة</h3>
                            <div className="auth-summary__grid">
                                <div className="auth-summary__item"><span className="auth-summary__label">اسم الشركة</span><span className="auth-summary__value">{formData.company_name}</span></div>
                                <div className="auth-summary__item"><span className="auth-summary__label">المعرّف</span><span className="auth-summary__value" dir="ltr">{formData.company_slug}</span></div>
                                <div className="auth-summary__item"><span className="auth-summary__label">البريد الإلكتروني</span><span className="auth-summary__value" dir="ltr">{formData.company_email}</span></div>
                                {formData.company_phone && <div className="auth-summary__item"><span className="auth-summary__label">رقم الجوال</span><span className="auth-summary__value" dir="ltr">{formData.company_phone}</span></div>}
                            </div>

                            <h3 className="auth-summary__section-title">بيانات المالك</h3>
                            <div className="auth-summary__grid">
                                <div className="auth-summary__item"><span className="auth-summary__label">الاسم</span><span className="auth-summary__value">{formData.owner_name}</span></div>
                                <div className="auth-summary__item"><span className="auth-summary__label">رقم الهوية</span><span className="auth-summary__value" dir="ltr">{formData.owner_national_id}</span></div>
                                <div className="auth-summary__item"><span className="auth-summary__label">البريد الإلكتروني</span><span className="auth-summary__value" dir="ltr">{formData.owner_email}</span></div>
                                <div className="auth-summary__item"><span className="auth-summary__label">رقم الجوال</span><span className="auth-summary__value" dir="ltr">{formData.owner_phone}</span></div>
                            </div>
                        </div>

                        <p className="auth-summary__note">بالضغط على "تأكيد التسجيل" فإنك توافق على شروط الاستخدام وسياسة الخصوصية</p>

                        <div className="auth-form__actions">
                            <button type="button" className="button button--ghost" onClick={handleBack} disabled={isLoading}><ArrowRight size={16} /> السابق</button>
                            <button type="button" className="button button--primary" onClick={handleSubmit} disabled={isLoading}>
                                {isLoading ? (<><Loader2 size={16} className="auth-spinner-icon" /> جاري التسجيل...</>) : (<><Check size={16} /> تأكيد التسجيل</>)}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default RegisterTenantContent;
