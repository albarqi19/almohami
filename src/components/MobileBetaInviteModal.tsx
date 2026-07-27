import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Bell, CalendarClock, KeyRound, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MobileBetaService, type MobileBetaPlatform } from '../services/mobileBetaService';

/**
 * دعوة تجربة تطبيق الجوال — نافذة مستقلّة عن منصّة الإعلانات.
 *
 * تُعرض مرّة واحدة لكل مستخدم مؤهَّل (الأهلية تُقرَّر في الباك)، وتتدرّج:
 * عرض → اختيار المنصّة → البريد → شكر.
 *
 * «لا يهمّني» يُغلق فوراً ويُسجَّل رفضاً نهائياً، و«لاحقاً» (وكذلك زرّ الإغلاق
 * ومفتاح Esc) يؤجّلها أسبوعاً — كي لا تُحرَق فرصة مَن ضغط مسرعاً.
 */

/** لقطة من التطبيق تُوضع في `public/`. لو غابت ظهر بديل نظيف بلا محتوى وهمي. */
const PREVIEW_IMAGE = '/mobile-beta-preview.webp';

/** مهلة قبل الظهور: تدع الصفحة تستقرّ فلا تقفز النافذة في وجه المستخدم. */
const SHOW_DELAY_MS = 2500;

/** حارس الجلسة: يمنع وميض النافذة عند التنقّل بين الصفحات بعد الردّ. */
const SESSION_KEY = 'mobileBetaInviteAnswered';

/**
 * وضع المعاينة: `?preview=mobile-beta` يفتح النافذة فوراً لفحص شكلها وتدفّقها،
 * بلا استدعاء الباك وبلا حفظ أي ردّ. مقصور على خادم التطوير — `import.meta.env.DEV`
 * ثابت وقت البناء، فيُشذَّب الشرط كلياً من حزمة الإنتاج.
 */
const isPreviewMode = (): boolean =>
    import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'mobile-beta';

type Step = 'intro' | 'platform' | 'email' | 'thanks';

const MobileBetaInviteModal: React.FC = () => {
    const { user } = useAuth();

    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<Step>('intro');
    const [platform, setPlatform] = useState<MobileBetaPlatform | null>(null);
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);
    const [preview] = useState(isPreviewMode);

    const cardRef = useRef<HTMLDivElement>(null);

    /* ── هل نعرضها أصلاً؟ الباك هو من يقرّر؛ هنا حراسة مبكّرة فقط ───────── */
    useEffect(() => {
        if (preview) {
            setIsOpen(true);
            return;
        }

        if (!user || user.role === 'client') return;
        if (sessionStorage.getItem(SESSION_KEY)) return;

        let cancelled = false;
        const timer = window.setTimeout(async () => {
            const status = await MobileBetaService.getStatus();
            if (cancelled || !status.should_show) return;
            if (status.suggested_email) setEmail(status.suggested_email);
            setIsOpen(true);
        }, SHOW_DELAY_MS);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [user, preview]);

    /** إرسال الردّ. الإغلاق يقع فوراً في الحالات غير النهائية كي لا ينتظر المستخدم الشبكة. */
    const send = useCallback(
        async (payload: Parameters<typeof MobileBetaService.respond>[0]) => {
            if (preview) return;

            sessionStorage.setItem(SESSION_KEY, '1');
            try {
                await MobileBetaService.respond(payload);
            } catch {
                // الردّ مسجَّل للجلسة على الأقل؛ لا نُزعج المستخدم بخطأ لا يملك تجاهه شيئاً
            }
        },
        [preview]
    );

    const close = useCallback(() => setIsOpen(false), []);

    /** الإغلاق بلا اختيار = تأجيل، لا رفض. */
    const postpone = useCallback(() => {
        close();
        void send({ response: 'later' });
    }, [close, send]);

    const decline = useCallback(() => {
        close();
        void send({ response: 'not_interested' });
    }, [close, send]);

    const submitInterest = useCallback(async () => {
        // مطابق لقاعدة الباك عمداً: لاتيني فقط ونطاق أعلى حقيقي — فيُمسك الخطأ
        // هنا بدل أن يعود من الخادم
        const trimmed = email.trim().toLowerCase();
        if (!trimmed || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(trimmed)) {
            setError('يرجى إدخال بريد إلكتروني صحيح');
            return;
        }
        if (!platform) {
            setError('يرجى اختيار نظام جهازك');
            setStep('platform');
            return;
        }

        setError(null);

        if (preview) {
            setStep('thanks');
            return;
        }

        setSubmitting(true);
        try {
            await MobileBetaService.respond({ response: 'interested', platform, email: trimmed });
            sessionStorage.setItem(SESSION_KEY, '1');
            setStep('thanks');
        } catch {
            setError('تعذّر إرسال الطلب، يرجى المحاولة مرة أخرى');
        } finally {
            setSubmitting(false);
        }
    }, [email, platform, preview]);

    /* ── Esc للإغلاق + حبس التركيز داخل النافذة + منع تمرير الخلفية ─────── */
    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (step === 'thanks') close();
                else postpone();
                return;
            }
            if (e.key !== 'Tab' || !cardRef.current) return;

            const focusables = cardRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), input:not([disabled]), a[href]'
            );
            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen, step, close, postpone]);

    if (!isOpen) return null;

    const platformHint =
        platform === 'ios'
            ? 'يلزم أن يكون بريد حساب Apple ID المستخدم على جهازك، وإلا لن تصلك دعوة TestFlight.'
            : 'يلزم أن يكون بريد حساب Google المسجَّل على جهازك، وإلا لن يظهر لك التطبيق في Google Play.';

    return (
        <AnimatePresence>
            <div className="mbi-overlay" role="dialog" aria-modal="true" aria-labelledby="mbi-title">
                <motion.div
                    className="mbi-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={step === 'thanks' ? close : postpone}
                />

                <motion.div
                    ref={cardRef}
                    className="mbi-card"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 16 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                    <button
                        className="mbi-close"
                        onClick={step === 'thanks' ? close : postpone}
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>

                    {preview && <span className="mbi-preview-tag">معاينة — لا يُحفظ أي ردّ</span>}

                    {/* عمود الجوال — عرض ثلاثي الأبعاد في خطوة العرض وحدها.
                        طبقتان: المنصّة تحمل التقريب والزحف، والجهاز يحمل الدوران —
                        لأن لكلٍّ محور ارتكاز مختلف (أعلى الجهاز مقابل مركزه). */}
                    <div className="mbi-visual">
                        <div className={`mbi-stage ${step === 'intro' ? 'is-touring' : ''}`}>
                            <div className="mbi-phone">
                                <div className="mbi-phone__notch" />
                                <div className="mbi-phone__screen">
                                    <div className="mbi-phone__view">
                                        {imageFailed ? (
                                            <div className="mbi-phone__fallback">
                                                <Smartphone size={34} />
                                                <span>تطبيق الرائد</span>
                                            </div>
                                        ) : (
                                            <img
                                                src={PREVIEW_IMAGE}
                                                alt="لقطة من تطبيق الرائد على الجوال"
                                                onError={() => setImageFailed(true)}
                                            />
                                        )}
                                    </div>
                                    {/* لمعة زجاج تعبر الشاشة لحظة الميلان — توحي بسطح يعكس الضوء */}
                                    <span className="mbi-phone__glare" aria-hidden="true" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* عمود المحتوى */}
                    <div className="mbi-content">
                        {step === 'intro' && (
                            <>
                                <span className="mbi-eyebrow">نسخة تجريبية مبكّرة</span>
                                <h2 id="mbi-title" className="mbi-title">
                                    تطبيق الرائد على جوّالك — ونحتاج رأيك قبل الإطلاق
                                </h2>
                                <p className="mbi-text">
                                    أنجزنا النسخة الأولى من تطبيق الرائد للجوال: قضاياك وجلساتك ومهامك
                                    بين يديك أينما كنت، ومساعد صوتي تُملي عليه فيُنجز عنك. وقبل أن
                                    نطرحه للجميع، نبحث عن عدد محدود من المحامين يجرّبونه ويصارحوننا
                                    بملاحظاتهم.
                                </p>

                                <ul className="mbi-points">
                                    <li>
                                        <CalendarClock size={15} />
                                        جلساتك ومهامك في متناول يدك خارج المكتب
                                    </li>
                                    <li>
                                        <Bell size={15} />
                                        تنبيهات فورية بالمواعيد على جهازك
                                    </li>
                                    <li>
                                        <KeyRound size={15} />
                                        وصول مبكّر للمزايا قبل طرحها للجميع
                                    </li>
                                </ul>

                                <div className="mbi-actions">
                                    <button className="mbi-btn mbi-btn--primary" onClick={() => setStep('platform')}>
                                        يهمّني، سجّلني
                                    </button>
                                    <button className="mbi-btn mbi-btn--ghost" onClick={postpone}>
                                        ذكّرني لاحقاً
                                    </button>
                                    <button className="mbi-btn mbi-btn--quiet" onClick={decline}>
                                        لا يهمّني
                                    </button>
                                </div>
                            </>
                        )}

                        {step === 'platform' && (
                            <>
                                <span className="mbi-eyebrow">
                                    <Smartphone size={13} />
                                    الخطوة ١ من ٢
                                </span>
                                <h2 id="mbi-title" className="mbi-title">
                                    أي جهاز تستخدم؟
                                </h2>
                                <p className="mbi-text">
                                    نحتاج معرفة نظام جهازك لأن طريقة إيصال النسخة التجريبية تختلف بينهما.
                                </p>

                                <div className="mbi-platforms">
                                    <button
                                        className={`mbi-platform ${platform === 'ios' ? 'is-selected' : ''}`}
                                        onClick={() => {
                                            setPlatform('ios');
                                            setError(null);
                                            setStep('email');
                                        }}
                                    >
                                        <Smartphone size={22} />
                                        <strong>آيفون / آيباد</strong>
                                        <span>الدعوة عبر TestFlight</span>
                                    </button>

                                    <button
                                        className={`mbi-platform ${platform === 'android' ? 'is-selected' : ''}`}
                                        onClick={() => {
                                            setPlatform('android');
                                            setError(null);
                                            setStep('email');
                                        }}
                                    >
                                        <Smartphone size={22} />
                                        <strong>أندرويد</strong>
                                        <span>الدعوة عبر اختبار Google Play</span>
                                    </button>
                                </div>

                                <div className="mbi-actions">
                                    <button className="mbi-btn mbi-btn--quiet" onClick={() => setStep('intro')}>
                                        رجوع
                                    </button>
                                </div>
                            </>
                        )}

                        {step === 'email' && (
                            <>
                                <span className="mbi-eyebrow">
                                    <Smartphone size={13} />
                                    الخطوة ٢ من ٢
                                </span>
                                <h2 id="mbi-title" className="mbi-title">
                                    إلى أي بريد نرسل الدعوة؟
                                </h2>
                                <p className="mbi-text">{platformHint}</p>

                                <div className="mbi-field">
                                    <label htmlFor="mbi-email">البريد الإلكتروني</label>
                                    <input
                                        id="mbi-email"
                                        type="email"
                                        dir="ltr"
                                        value={email}
                                        autoFocus
                                        placeholder="name@example.com"
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (error) setError(null);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !submitting) void submitInterest();
                                        }}
                                    />
                                    {error && <p className="mbi-error">{error}</p>}
                                </div>

                                <div className="mbi-actions">
                                    <button
                                        className="mbi-btn mbi-btn--primary"
                                        onClick={() => void submitInterest()}
                                        disabled={submitting}
                                    >
                                        {submitting ? <Loader2 size={15} className="mbi-spin" /> : null}
                                        {submitting ? 'جارٍ الإرسال' : 'أرسل الطلب'}
                                    </button>
                                    <button
                                        className="mbi-btn mbi-btn--quiet"
                                        onClick={() => setStep('platform')}
                                        disabled={submitting}
                                    >
                                        رجوع
                                    </button>
                                </div>
                            </>
                        )}

                        {step === 'thanks' && (
                            <>
                                <span className="mbi-check">
                                    <Check size={22} />
                                </span>
                                <h2 id="mbi-title" className="mbi-title">
                                    وصلَنا طلبك، شكراً لك
                                </h2>
                                <p className="mbi-text">
                                    سنرسل رابط التجربة إلى <bdi className="mbi-email-echo">{email.trim()}</bdi> فور
                                    جاهزية الدفعة الأولى. ملاحظاتك بعد التجربة هي ما يصنع النسخة النهائية.
                                </p>

                                <div className="mbi-actions">
                                    <button className="mbi-btn mbi-btn--primary" onClick={close}>
                                        تمام
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>

                <style>{`
                    .mbi-overlay {
                        position: fixed;
                        inset: 0;
                        z-index: 1200;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                        direction: rtl;
                    }
                    .mbi-backdrop {
                        position: absolute;
                        inset: 0;
                        background: rgba(15, 23, 42, 0.55);
                    }
                    .mbi-card {
                        position: relative;
                        display: grid;
                        grid-template-columns: 330px 1fr;
                        gap: 28px;
                        width: 100%;
                        max-width: 920px;
                        max-height: calc(100vh - 40px);
                        overflow-y: auto;
                        background: var(--dashboard-card, #fff);
                        border: 1px solid var(--quiet-gray-300, #DFE1E6);
                        border-radius: 10px;
                        padding: 28px;
                        font-family: 'IBM Plex Sans Arabic', sans-serif;
                    }
                    .mbi-close {
                        position: absolute;
                        top: 12px;
                        left: 12px;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: transparent;
                        border: 1px solid var(--quiet-gray-300, #DFE1E6);
                        border-radius: 6px;
                        color: var(--quiet-gray-600, #6B778C);
                        cursor: pointer;
                        transition: background 0.15s, color 0.15s;
                    }
                    .mbi-close:hover {
                        background: var(--quiet-gray-100, #F4F5F7);
                        color: var(--quiet-gray-900, #172B4D);
                    }
                    .mbi-preview-tag {
                        position: absolute;
                        top: 17px;
                        left: 52px;
                        padding: 3px 9px;
                        background: var(--status-orange-light, rgba(217, 119, 6, 0.1));
                        color: var(--status-orange, #D97706);
                        border-radius: 4px;
                        font-size: 11px;
                        font-weight: 600;
                    }

                    /* ── إطار الجوال: مرسوم بالكامل بـCSS، بلا صور إطار ── */
                    .mbi-visual {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: var(--quiet-gray-100, #F4F5F7);
                        border-radius: 8px;
                        padding: 22px 0;
                        /* يبتلع ما يفيض من الجهاز أسفل الحافة أثناء التقريب */
                        overflow: hidden;
                        /* عمق المشهد: كلما صغُرت القيمة اشتدّ المنظور.
                           ٨٥٠ تعطي ميلاً محسوساً دون تشويه العدسة العريضة */
                        perspective: 850px;
                        perspective-origin: 50% 40%;
                    }
                    .mbi-stage {
                        transform-style: preserve-3d;
                        transform-origin: 50% 0;
                        will-change: transform;
                    }
                    /* العرض ٢٠٠ مختار عمداً: ‎200 × 1.6 = 320‎ أي دون عرض العمود (٣٣٠)،
                       فيبلغ التقريب أقصاه بلا أن تُقصّ حواف الجهاز الجانبية */
                    .mbi-phone {
                        position: relative;
                        width: 200px;
                        aspect-ratio: 9 / 19.5;
                        flex-shrink: 0;
                        background: #0F172A;
                        border-radius: 26px;
                        padding: 7px;
                        transform-style: preserve-3d;
                        will-change: transform;
                        box-shadow: 0 18px 34px -18px rgba(15, 23, 42, 0.55);
                    }
                    /* طبقة خلفية مزاحة في العمق: تبرز من جانب الجهاز حين يميل
                       فتُقرأ كسماكة جسم حقيقي لا كصورة مائلة */
                    .mbi-phone::before {
                        content: '';
                        position: absolute;
                        inset: 0;
                        border-radius: 26px;
                        background: #060B14;
                        transform: translateZ(-11px);
                    }
                    .mbi-phone__notch {
                        position: absolute;
                        top: 7px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 62px;
                        height: 15px;
                        background: #0F172A;
                        border-radius: 0 0 10px 10px;
                        z-index: 2;
                    }
                    .mbi-phone__screen {
                        width: 100%;
                        height: 100%;
                        border-radius: 20px;
                        overflow: hidden;
                        background: var(--law-navy, #1E3A5F);
                    }
                    .mbi-phone__view {
                        width: 100%;
                        height: 100%;
                    }
                    .mbi-phone__screen img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        display: block;
                    }

                    /* ── لقطة سينمائية من ١٦ ثانية، ثلاث طبقات متزامنة ──
                       المنصّة تدفع الكاميرا إلى الأمام بعد أن يستقرّ الجهاز مواجهاً،
                       والارتكاز عند رأسه فيثبت أعلاه ويمتدّ باقيه تحت الحافة، ثم
                       تنزل الكاميرا لتستعرض ما خفي.
                       ‎-37.5%‎ مع scale(1.6) = إزاحة فعلية 60% من الارتفاع، أي بالضبط
                       ما يخفيه هذا التقريب — فتقف الجولة عند قاع الشاشة لا قبله. */
                    .mbi-stage.is-touring {
                        animation: mbi-stage-tour 16s ease-in-out infinite;
                    }
                    @keyframes mbi-stage-tour {
                        0%, 30%   { transform: scale(1) translateY(0); }
                        42%, 56%  { transform: scale(1.6) translateY(0); }
                        68%, 80%  { transform: scale(1.6) translateY(-37.5%); }
                        90%, 100% { transform: scale(1) translateY(0); }
                    }

                    /* الجهاز: الكاميرا تمرّ بجانبه فيبرز عمقه، ثم يستقرّ مواجهاً
                       للقراءة، ثم تنزلق إلى الجهة المقابلة وتعود — والمرور الأخير
                       يعبر نقطة المواجهة في طريقه، فتُغلق الدورة بلا قفزة. */
                    .mbi-stage.is-touring .mbi-phone {
                        animation: mbi-phone-pass 16s ease-in-out infinite;
                    }
                    @keyframes mbi-phone-pass {
                        0%, 6%    { transform: translateX(9%) rotateY(-38deg) rotateX(6deg); }
                        24%, 84%  { transform: translateX(0) rotateY(0deg) rotateX(0deg); }
                        93%       { transform: translateX(-8%) rotateY(30deg) rotateX(-5deg); }
                        100%      { transform: translateX(9%) rotateY(-38deg) rotateX(6deg); }
                    }

                    /* اللمعة: تعبر الشاشة مع كل ميلة، وتغيب تماماً بقية الوقت */
                    .mbi-phone__glare {
                        position: absolute;
                        inset: -20%;
                        pointer-events: none;
                        opacity: 0;
                        background: linear-gradient(
                            115deg,
                            transparent 38%,
                            rgba(255, 255, 255, 0.16) 48%,
                            transparent 58%
                        );
                    }
                    /* لمعة مع كل مرور جانبي، وتغيب تماماً أثناء وقفة القراءة */
                    .mbi-stage.is-touring .mbi-phone__glare {
                        animation: mbi-glare 16s ease-in-out infinite;
                    }
                    @keyframes mbi-glare {
                        0%        { opacity: 0.9; transform: translateX(-32%); }
                        19%       { opacity: 0; transform: translateX(28%); }
                        86%       { opacity: 0; transform: translateX(-28%); }
                        95%       { opacity: 0.9; transform: translateX(14%); }
                        100%      { opacity: 0.4; transform: translateX(-32%); }
                    }
                    .mbi-phone__fallback {
                        width: 100%;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        color: rgba(255, 255, 255, 0.75);
                        font-size: 12px;
                    }

                    /* ── المحتوى ── */
                    .mbi-content {
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        padding-top: 6px;
                    }
                    .mbi-eyebrow {
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        align-self: flex-start;
                        padding: 3px 9px;
                        background: var(--law-gold-light, rgba(184, 134, 11, 0.1));
                        color: var(--law-gold, #B8860B);
                        border-radius: 4px;
                        font-size: 11px;
                        font-weight: 600;
                        margin-bottom: 12px;
                    }
                    .mbi-title {
                        margin: 0 0 10px;
                        font-size: 21px;
                        font-weight: 700;
                        line-height: 1.5;
                        color: var(--law-navy, #1E3A5F);
                    }
                    .mbi-text {
                        margin: 0;
                        font-size: 13.5px;
                        line-height: 1.9;
                        color: var(--quiet-gray-700, #42526E);
                    }
                    .mbi-points {
                        list-style: none;
                        margin: 16px 0 0;
                        padding: 0;
                        display: flex;
                        flex-direction: column;
                        gap: 9px;
                    }
                    .mbi-points li {
                        display: flex;
                        align-items: center;
                        gap: 9px;
                        font-size: 13px;
                        color: var(--quiet-gray-800, #253858);
                    }
                    .mbi-points svg {
                        color: var(--law-navy, #1E3A5F);
                        flex-shrink: 0;
                    }

                    /* ── اختيار المنصّة ── */
                    .mbi-platforms {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                        margin-top: 18px;
                    }
                    .mbi-platform {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 6px;
                        padding: 18px 12px;
                        background: #fff;
                        border: 1px solid var(--quiet-gray-300, #DFE1E6);
                        border-radius: 8px;
                        cursor: pointer;
                        text-align: center;
                        color: var(--quiet-gray-800, #253858);
                        transition: border-color 0.15s, background 0.15s;
                    }
                    .mbi-platform:hover,
                    .mbi-platform.is-selected {
                        border-color: var(--law-navy, #1E3A5F);
                        background: var(--law-navy-light, rgba(30, 58, 95, 0.1));
                    }
                    .mbi-platform svg { color: var(--law-navy, #1E3A5F); }
                    .mbi-platform strong { font-size: 14px; font-weight: 600; }
                    .mbi-platform span { font-size: 11.5px; color: var(--quiet-gray-600, #6B778C); }

                    /* ── حقل البريد ── */
                    .mbi-field {
                        margin-top: 18px;
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                    }
                    .mbi-field label {
                        font-size: 12px;
                        font-weight: 600;
                        color: var(--quiet-gray-700, #42526E);
                    }
                    .mbi-field input {
                        width: 100%;
                        padding: 10px 12px;
                        font-family: inherit;
                        font-size: 13.5px;
                        border: 1px solid var(--quiet-gray-300, #DFE1E6);
                        border-radius: 6px;
                        background: #fff;
                        color: var(--quiet-gray-900, #172B4D);
                        transition: border-color 0.15s;
                    }
                    .mbi-field input:focus {
                        outline: none;
                        border-color: var(--law-navy, #1E3A5F);
                    }
                    .mbi-error {
                        margin: 0;
                        font-size: 12px;
                        color: var(--status-red, #DC2626);
                    }
                    .mbi-email-echo {
                        font-weight: 600;
                        color: var(--law-navy, #1E3A5F);
                    }

                    /* ── علامة الشكر ── */
                    .mbi-check {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 42px;
                        height: 42px;
                        border-radius: 8px;
                        background: var(--status-green-light, rgba(5, 150, 105, 0.1));
                        color: var(--status-green, #059669);
                        margin-bottom: 14px;
                    }

                    /* ── الأزرار ── */
                    .mbi-actions {
                        display: flex;
                        flex-wrap: wrap;
                        align-items: center;
                        gap: 8px;
                        margin-top: 22px;
                    }
                    .mbi-btn {
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        padding: 9px 18px;
                        font-family: inherit;
                        font-size: 13px;
                        font-weight: 600;
                        border-radius: 6px;
                        border: 1px solid transparent;
                        cursor: pointer;
                        transition: background 0.15s, border-color 0.15s, color 0.15s;
                    }
                    .mbi-btn:disabled { opacity: 0.6; cursor: default; }
                    .mbi-btn--primary {
                        background: var(--law-navy, #1E3A5F);
                        color: #fff;
                    }
                    .mbi-btn--primary:hover:not(:disabled) { background: var(--law-navy-dark, #152A45); }
                    .mbi-btn--ghost {
                        background: #fff;
                        border-color: var(--quiet-gray-300, #DFE1E6);
                        color: var(--quiet-gray-700, #42526E);
                    }
                    .mbi-btn--ghost:hover:not(:disabled) { background: var(--quiet-gray-100, #F4F5F7); }
                    .mbi-btn--quiet {
                        background: transparent;
                        color: var(--quiet-gray-600, #6B778C);
                        font-weight: 500;
                    }
                    .mbi-btn--quiet:hover:not(:disabled) { color: var(--quiet-gray-900, #172B4D); }
                    .mbi-spin { animation: mbi-rotate 0.9s linear infinite; }
                    @keyframes mbi-rotate { to { transform: rotate(360deg); } }

                    /* ── الجوال ── */
                    @media (max-width: 760px) {
                        .mbi-card {
                            grid-template-columns: 1fr;
                            gap: 18px;
                            padding: 22px 18px;
                        }
                        .mbi-visual { padding: 16px 0; }
                        .mbi-phone { width: 168px; }
                        .mbi-phone__notch { width: 44px; height: 11px; }
                        .mbi-title { font-size: 18px; }
                        .mbi-actions .mbi-btn { flex: 1 1 auto; justify-content: center; }
                    }
                    @media (prefers-reduced-motion: reduce) {
                        .mbi-spin,
                        .mbi-stage.is-touring,
                        .mbi-stage.is-touring .mbi-phone,
                        .mbi-stage.is-touring .mbi-phone__glare { animation: none; }
                    }
                `}</style>
            </div>
        </AnimatePresence>
    );
};

export default MobileBetaInviteModal;
