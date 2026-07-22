import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, LayoutDashboard, SlidersHorizontal, Pin, RefreshCw } from 'lucide-react';
import './customize-promo.css';

/**
 * CustomizePromoModal — «خصّص صفحتك ✨»
 * مودال ترويجي يظهر مرة واحدة عند أول فتح للوحة القابلة للتخصيص:
 * نص المميزات يميناً + رسم SVG يساراً يحكي «قصة» واحدة على خط زمني
 * موحّد (9s): مؤشر يمسك ودجت → يسحبها لفراغ منقّط → تستقر، ثم يمسك
 * مقبض الحافة → يوسّعها وتبقى. حركة سببية هادفة — بلا طفو ولا تنفّس
 * (ذوق المالك: لا صعود/نزول ولا تكبير/تصغير عبثيين).
 */

interface Props {
    open: boolean;
    onStart: () => void;   // «ابدأ التخصيص» — يفعّل وضع التحرير
    onLater: () => void;   // «لاحقاً»
}

const FEATURES = [
    { icon: <LayoutDashboard size={16} />, title: 'رتّبها على ذوقك', desc: 'اسحب أي ودجت وحجّمها من أي حافة — لوحتك تُحفظ وتُزامَن عبر أجهزتك' },
    { icon: <Sparkles size={16} />, title: 'معرض ودجتس كامل', desc: 'مهامك، مهلك، إيراداتك، جلساتك… وأدوات ذكية بخصائص قابلة للضبط' },
    { icon: <SlidersHorizontal size={16} />, title: 'خصائص لكل ودجت', desc: 'من الترس ⚙️ غيّر النطاق والعدد والمظهر — لكل ودجت إعداداتها الخاصة' },
    { icon: <Pin size={16} />, title: 'تثبيت في كل الصفحات', desc: 'دبّس 📌 أي ودجت فتطفو معك أينما تنقّلت في النظام' },
];

const CustomizePromoModal: React.FC<Props> = ({ open, onStart, onLater }) => (
    <AnimatePresence>
        {open && (
            <div className="cpromo-overlay" dir="rtl">
                <motion.div
                    className="cpromo-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onLater}
                />
                <motion.div
                    className="cpromo-card"
                    initial={{ opacity: 0, scale: 0.95, y: 22 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 14 }}
                    transition={{ type: 'spring', duration: 0.5 }}
                >
                    <button className="cpromo-close" onClick={onLater} aria-label="إغلاق">
                        <X size={17} />
                    </button>

                    <div className="cpromo-body">
                        {/* النص — يمين */}
                        <div className="cpromo-text">
                            <span className="cpromo-kicker"><Sparkles size={13} /> جديد</span>
                            <h2 className="cpromo-title">خصّص صفحتك الرئيسية</h2>
                            <p className="cpromo-sub">
                                لوحة التحكم صارت لك أنت: نفس لوحتك المعتادة، لكن كل مربع فيها
                                يتحرك ويتحجّم ويُضبط — وتقدر تضيف عشرات الودجتس الجديدة.
                            </p>
                            <ul className="cpromo-list">
                                {FEATURES.map((f) => (
                                    <li key={f.title}>
                                        <span className="cpromo-list__icon">{f.icon}</span>
                                        <span>
                                            <strong>{f.title}</strong>
                                            <em>{f.desc}</em>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <div className="cpromo-ctas">
                                <button className="cpromo-btn cpromo-btn--primary" onClick={onStart}>
                                    <Sparkles size={15} /> ابدأ التخصيص
                                </button>
                                <button className="cpromo-btn" onClick={onLater}>لاحقاً</button>
                            </div>
                            <p className="cpromo-note">
                                <RefreshCw size={11} /> ترتيبك يُحفظ تلقائياً ويظهر على كل أجهزتك
                            </p>
                        </div>

                        {/* الرسم — يسار: قصة واحدة على خط زمني 9s (سحب→إفلات ثم تحجيم→ثبات) */}
                        <div className="cpromo-art" aria-hidden="true">
                            <svg viewBox="0 0 300 340" className="cpromo-svg">
                                <defs>
                                    {/* قصّ داخل إطار اللوحة — الودجت الرديفة تدخل من تحت حافتها اليسرى */}
                                    <clipPath id="cpromoBoardClip">
                                        <rect x="11" y="11" width="278" height="318" rx="17" />
                                    </clipPath>
                                </defs>
                                {/* إطار اللوحة */}
                                <rect x="10" y="10" width="280" height="320" rx="18"
                                    fill="var(--dashboard-card, #fff)" stroke="var(--color-border, #e5e7eb)" strokeWidth="1.5" />
                                {/* شريط علوي */}
                                <rect x="26" y="26" width="120" height="12" rx="6" fill="var(--law-navy, #1e2a4a)" opacity="0.18" />
                                <circle cx="262" cy="32" r="7" fill="var(--law-gold, #c9a227)" opacity="0.8" />

                                {/* الفراغ المنقّط الهدف (يختفي لحظة وصول الودجت) */}
                                <rect className="cpromo-slot" x="156" y="54" width="118" height="86" rx="12"
                                    fill="var(--law-navy, #1e2a4a)" fillOpacity="0.05"
                                    stroke="var(--law-navy, #1e2a4a)" strokeOpacity="0.45"
                                    strokeWidth="1.4" strokeDasharray="6 5" />

                                {/* المشهد ١: الودجت المسحوبة — يمسكها المؤشر وينقلها للفراغ وتستقر */}
                                <g className="cpromo-mv">
                                    <rect x="26" y="54" width="118" height="86" rx="12"
                                        fill="var(--law-navy, #1e2a4a)" opacity="0.92" />
                                    <rect x="38" y="68" width="60" height="8" rx="4" fill="#fff" opacity="0.85" />
                                    <rect x="38" y="84" width="90" height="6" rx="3" fill="#fff" opacity="0.45" />
                                    <rect x="38" y="96" width="76" height="6" rx="3" fill="#fff" opacity="0.45" />
                                    <rect x="38" y="114" width="44" height="14" rx="7" fill="var(--law-gold, #c9a227)" />
                                    {/* تحديد الإمساك الذهبي — يظهر مع القبضة ويختفي عند الإفلات */}
                                    <rect className="cpromo-mv-hl" x="24" y="52" width="122" height="90" rx="13"
                                        fill="none" stroke="var(--law-gold, #c9a227)" strokeWidth="2" />
                                </g>

                                {/* ودجت جديدة تدخل من حافة اللوحة اليسرى وتملأ فراغ المنقولة (رصّ الشبكة)
                                    — القصّ على الغلاف الثابت والحركة على المجموعة الداخلية */}
                                <g clipPath="url(#cpromoBoardClip)">
                                    <g className="cpromo-fill">
                                        <rect x="26" y="54" width="118" height="86" rx="12"
                                            fill="var(--dashboard-card, #fff)" stroke="var(--status-green, #16a34a)" strokeWidth="1.6" />
                                        <circle cx="85" cy="90" r="17" fill="none" stroke="var(--status-green, #16a34a)" strokeWidth="4"
                                            strokeLinecap="round" strokeDasharray="80 27" transform="rotate(-90 85 90)" />
                                        <rect x="65" y="116" width="40" height="7" rx="3.5" fill="var(--status-green, #16a34a)" opacity="0.55" />
                                    </g>
                                </g>

                                {/* صف أوسط ثابت (مرساة بصرية لا تتحرك) */}
                                <rect x="26" y="156" width="248" height="64" rx="12" fill="var(--quiet-gray-100, #f3f4f6)" />
                                <rect x="40" y="172" width="10" height="32" rx="3" fill="var(--law-navy, #1e2a4a)" opacity="0.35" />
                                <rect x="58" y="164" width="10" height="40" rx="3" fill="var(--law-navy, #1e2a4a)" opacity="0.55" />
                                <rect x="76" y="178" width="10" height="26" rx="3" fill="var(--law-navy, #1e2a4a)" opacity="0.4" />
                                <rect x="94" y="158" width="10" height="46" rx="3" fill="var(--law-gold, #c9a227)" opacity="0.85" />
                                <rect x="120" y="170" width="140" height="8" rx="4" fill="var(--quiet-gray-300, #d1d5db)" />
                                <rect x="120" y="186" width="104" height="8" rx="4" fill="var(--quiet-gray-300, #d1d5db)" opacity="0.7" />

                                {/* المشهد ٢: ودجت تتوسّع من مقبض حافتها مرة واحدة وتبقى */}
                                <g className="cpromo-rz">
                                    <rect className="cpromo-rz-frame" x="26" y="236" width="152" height="72" rx="12"
                                        fill="var(--dashboard-card, #fff)" stroke="var(--law-gold, #c9a227)" strokeWidth="1.6" />
                                    <rect x="40" y="250" width="70" height="8" rx="4" fill="var(--law-navy, #1e2a4a)" opacity="0.7" />
                                    <rect x="40" y="266" width="118" height="6" rx="3" fill="var(--quiet-gray-300, #d1d5db)" />
                                    <rect x="40" y="278" width="96" height="6" rx="3" fill="var(--quiet-gray-300, #d1d5db)" opacity="0.7" />
                                    {/* المحتوى الذي تكشفه التوسعة */}
                                    <g className="cpromo-rz-extra">
                                        <rect x="200" y="292" width="9" height="10" rx="2.5" fill="var(--law-navy, #1e2a4a)" opacity="0.45" />
                                        <rect x="215" y="282" width="9" height="20" rx="2.5" fill="var(--law-navy, #1e2a4a)" opacity="0.6" />
                                        <rect x="230" y="272" width="9" height="30" rx="2.5" fill="var(--law-gold, #c9a227)" opacity="0.9" />
                                    </g>
                                    {/* مقبض التحجيم على الحافة */}
                                    <circle className="cpromo-rz-handle" cx="178" cy="272" r="5"
                                        fill="var(--dashboard-card, #fff)" stroke="var(--law-navy, #1e2a4a)" strokeWidth="2" />
                                </g>

                                {/* خط المحاذاة عند حدّ التوسعة (يظهر أثناء السحب فقط) */}
                                <line className="cpromo-guide" x1="274" y1="230" x2="274" y2="314"
                                    stroke="var(--law-navy, #1e2a4a)" strokeWidth="1.4" strokeDasharray="5 5" />

                                {/* موجات النقر (تنطلق لحظة الإمساك/الإفلات فقط) */}
                                <circle className="cpromo-rip cpromo-rip1" cx="85" cy="97" r="12"
                                    fill="none" stroke="var(--law-navy, #1e2a4a)" strokeWidth="2" />
                                <circle className="cpromo-rip cpromo-rip2" cx="215" cy="97" r="12"
                                    fill="none" stroke="var(--law-navy, #1e2a4a)" strokeWidth="2" />
                                <circle className="cpromo-rip cpromo-rip3" cx="178" cy="272" r="12"
                                    fill="none" stroke="var(--law-navy, #1e2a4a)" strokeWidth="2" />

                                {/* المؤشر — بطل القصة: كل حركة في المشهد سببها هو */}
                                <g className="cpromo-cursor">
                                    <circle cx="85" cy="97" r="8" fill="var(--law-navy, #1e2a4a)" />
                                    <circle cx="85" cy="97" r="8" fill="none" stroke="#fff" strokeWidth="1.6" strokeOpacity="0.75" />
                                </g>
                            </svg>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
);

export default CustomizePromoModal;
