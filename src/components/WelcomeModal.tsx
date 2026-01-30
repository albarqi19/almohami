import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Scale, Rocket, Lightbulb, Shield, Sparkles } from 'lucide-react';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
    const chromeExtensionUrl = 'https://chromewebstore.google.com/detail/cmanbngddccpfalmmpmkglfgncopmmcn?utm_source=item-share-cb';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="welcome-modal-overlay">
                    <motion.div
                        className="welcome-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="welcome-modal"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', duration: 0.5 }}
                    >
                        {/* Header */}
                        <div className="welcome-modal__header">
                            <button className="welcome-modal__close" onClick={onClose}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="welcome-modal__content">
                            {/* Hero Section */}
                            <div className="welcome-section welcome-hero">
                                <div className="welcome-hero__icon">
                                    <Scale size={48} />
                                </div>
                                <h1 className="welcome-hero__title">
                                    مرحبا بكم في مستقبل إدارة الممارسة القانونية
                                </h1>
                                <p className="welcome-hero__subtitle">
                                    يسعدنا انضمام شركتكم الموقرة إلينا. لقد صممنا هذا النظام ليكون شريككم التقني الأول في تنظيم العمل القانوني ورفع كفاءة مكتبكم.
                                    لضمان أفضل انطلاقة، نأمل منكم اتباع الخطوات البسيطة التالية:
                                </p>
                            </div>

                            {/* Setup Steps Section */}
                            <div className="welcome-section">
                                <div className="welcome-section__header">
                                    <Rocket size={24} className="welcome-section__icon" />
                                    <h2 className="welcome-section__title">خطوات الإعداد الأساسية</h2>
                                </div>
                                <p className="welcome-section__intro">لتحقيق الاستفادة القصوى من النظام، يرجى البدء بما يلي:</p>

                                <div className="welcome-steps">
                                    <div className="welcome-step">
                                        <div className="welcome-step__number">1</div>
                                        <div className="welcome-step__content">
                                            <h3 className="welcome-step__title">ربط حساب الواتساب</h3>
                                            <p className="welcome-step__desc">
                                                توجه أولا إلى صفحة الواتساب من القائمة الجانبية لربط حساب الواتساب الخاص بالمكتب.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="welcome-step">
                                        <div className="welcome-step__number">2</div>
                                        <div className="welcome-step__content">
                                            <h3 className="welcome-step__title">إضافة فريق العمل</h3>
                                            <p className="welcome-step__desc">
                                                بعد ربط الواتساب، قم بإضافة المحامين. سيقوم النظام تلقائيا بإرسال كلمة المرور لكل محامي مباشرة عبر الواتساب فور إضافته.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="welcome-step">
                                        <div className="welcome-step__number">3</div>
                                        <div className="welcome-step__content">
                                            <h3 className="welcome-step__title">تثبيت أداة "جلب القضايا"</h3>
                                            <p className="welcome-step__desc">
                                                لا داعي لإدخال البيانات يدويا! قم بتحميل إضافتنا الخاصة بمتصفح كروم لجلب القضايا والمواعيد مباشرة من منصة ناجز بضغطة زر:
                                            </p>
                                            <a
                                                href={chromeExtensionUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="welcome-step__link"
                                            >
                                                <ExternalLink size={16} />
                                                تحميل إضافة كروم من هنا
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Smart Features Section */}
                            <div className="welcome-section">
                                <div className="welcome-section__header">
                                    <Lightbulb size={24} className="welcome-section__icon welcome-section__icon--yellow" />
                                    <h2 className="welcome-section__title">مميزات ذكية بين يديك</h2>
                                </div>

                                <div className="welcome-features">
                                    <div className="welcome-feature">
                                        <div className="welcome-feature__icon">
                                            <span>1</span>
                                        </div>
                                        <div className="welcome-feature__content">
                                            <h3 className="welcome-feature__title">تجربة مخصصة لكل محامي</h3>
                                            <p className="welcome-feature__desc">
                                                عند دخول كل محامي بحسابه الخاص، ستظهر له لوحة تحكم تقتصر على قضاياه وجلساته ومهامه الخاصة، مما يضمن التركيز التام وتنظيم الأولويات.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="welcome-feature">
                                        <div className="welcome-feature__icon welcome-feature__icon--purple">
                                            <span>AI</span>
                                        </div>
                                        <div className="welcome-feature__content">
                                            <h3 className="welcome-feature__title">مساعدك الذكي (AI)</h3>
                                            <p className="welcome-feature__desc">
                                                استفد من أدوات الذكاء الاصطناعي المدمجة التي تساعدك في صياغة المذكرات، تحليل المستندات، واستخراج الأفكار القانونية بسرعة ودقة.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="welcome-feature">
                                        <div className="welcome-feature__icon welcome-feature__icon--green">
                                            <span>W</span>
                                        </div>
                                        <div className="welcome-feature__content">
                                            <h3 className="welcome-feature__title">بوابة العميل الشفافة</h3>
                                            <p className="welcome-feature__desc">
                                                يمكن لعملائكم الآن متابعة سير قضاياهم، رؤية الإجراءات المتخذة، والاطلاع على العقود والفواتير عبر حساباتهم الخاصة، مما يعزز ثقتهم واحترافية مكتبكم.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Security Section */}
                            <div className="welcome-section welcome-section--security">
                                <div className="welcome-section__header">
                                    <Shield size={24} className="welcome-section__icon welcome-section__icon--blue" />
                                    <h2 className="welcome-section__title">الخصوصية والأمان (أولويتنا القصوى)</h2>
                                </div>
                                <p className="welcome-section__intro">نحن ندرك حساسية الملفات القانونية، لذا اعتمدنا نظام تخزين فائق الأمان:</p>

                                <div className="welcome-security-points">
                                    <div className="welcome-security-point">
                                        <div className="welcome-security-point__icon">
                                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                                <polyline points="22 4 12 14.01 9 11.01" />
                                            </svg>
                                        </div>
                                        <p>يتم تخزين جميع ملفاتكم عبر حسابكم الخاص في OneDrive.</p>
                                    </div>
                                    <div className="welcome-security-point">
                                        <div className="welcome-security-point__icon">
                                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                                <polyline points="22 4 12 14.01 9 11.01" />
                                            </svg>
                                        </div>
                                        <p>نظامنا وقواعد بياناتنا لا تطلع نهائيا على محتوى هذه الملفات؛ أنت تملك السيطرة الكاملة على بياناتك.</p>
                                    </div>
                                    <div className="welcome-security-point">
                                        <div className="welcome-security-point__icon">
                                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                                <polyline points="22 4 12 14.01 9 11.01" />
                                            </svg>
                                        </div>
                                        <p><strong>توطين البيانات:</strong> يتم استضافة وتخزين كافة بياناتكم بشكل كامل داخل خوادم مؤمنة داخل المملكة العربية السعودية، ونؤكد أنها لا تخرج خارج الحدود نهائيا، التزاما بالأنظمة والتشريعات المحلية.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Trial Section */}
                            <div className="welcome-section welcome-section--trial">
                                <div className="welcome-section__header">
                                    <Sparkles size={24} className="welcome-section__icon welcome-section__icon--gold" />
                                    <h2 className="welcome-section__title">استمتع بفترتك المجانية</h2>
                                </div>
                                <p className="welcome-trial__text">
                                    ندعوك لاستكشاف كافة الخصائص خلال الفترة التجريبية. رأيك هو محرك التطور لدينا، فلا تتردد في تزويدنا باقتراحاتك أو ملاحظاتك، فنحن نسعد جدا بسماعها.
                                </p>
                                <p className="welcome-trial__wish">
                                    نتمنى لكم تجربة مثمرة وناجحة!
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="welcome-modal__footer">
                            <button className="welcome-modal__btn" onClick={onClose}>
                                فهمت، هيا نبدأ!
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default WelcomeModal;
