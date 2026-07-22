import React, { useEffect, useRef, useState } from 'react';

/**
 * AuroraAmbientWidget — أجواء متدرّجة حيّة.
 *
 * ثلاث «بقع» تدرّج (radial-gradient) تنزلق بهدوء عبر transform فقط خلف
 * طبقة كحلية، وفوقها تحيّة حسب الوقت واسم اليوم والتاريخ الهجري/الميلادي
 * والساعة الحيّة. جمالي خفيف بلا طلبات شبكة — الوقت من المتصفّح.
 */

const pad2 = (n: number): string => n.toString().padStart(2, '0');

const greetingFor = (h: number): string => {
    if (h >= 5 && h < 12) return 'صباح الخير';
    if (h >= 12 && h < 17) return 'طاب نهارك';
    if (h >= 17 && h < 22) return 'مساء الخير';
    return 'ليلة هادئة';
};

// اسم اليوم بالعربية عبر Intl (بلا مكتبة تقويم)
const weekdayAr = (d: Date): string => new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(d);
const dateAr = (d: Date): string =>
    new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long' }).format(d);

const AuroraAmbientWidget: React.FC = () => {
    const [now, setNow] = useState<Date>(() => new Date());
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        timerRef.current = window.setInterval(() => setNow(new Date()), 1000);
        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
            timerRef.current = null;
        };
    }, []);

    const h24 = now.getHours();
    const h12 = ((h24 + 11) % 12) + 1;
    const period = h24 < 12 ? 'ص' : 'م';

    return (
        <div
            dir="rtl"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '10px',
                background: 'var(--law-navy, #1e2a4a)',
            }}
        >
            <style>{`
                @keyframes aaw-drift1 {
                    0%   { transform: translate(0%, 0%) scale(1); }
                    50%  { transform: translate(18%, 12%) scale(1.25); }
                    100% { transform: translate(0%, 0%) scale(1); }
                }
                @keyframes aaw-drift2 {
                    0%   { transform: translate(0%, 0%) scale(1.1); }
                    50%  { transform: translate(-20%, -14%) scale(1); }
                    100% { transform: translate(0%, 0%) scale(1.1); }
                }
                @keyframes aaw-drift3 {
                    0%   { transform: translate(0%, 0%) scale(1); }
                    50%  { transform: translate(14%, -18%) scale(1.2); }
                    100% { transform: translate(0%, 0%) scale(1); }
                }
                .aaw-blob {
                    position: absolute;
                    width: 75%;
                    aspect-ratio: 1 / 1;
                    border-radius: 50%;
                    filter: blur(6px);
                    will-change: transform;
                    pointer-events: none;
                }
                .aaw-b1 { top: -22%; right: -10%; background: radial-gradient(circle at 50% 50%, var(--law-gold, #c9a227) 0%, rgba(201,162,39,0) 62%); opacity: .5; animation: aaw-drift1 16s ease-in-out infinite; }
                .aaw-b2 { bottom: -28%; left: -14%; background: radial-gradient(circle at 50% 50%, #3b82f6 0%, rgba(59,130,246,0) 60%); opacity: .42; animation: aaw-drift2 21s ease-in-out infinite; }
                .aaw-b3 { top: 18%; left: -8%; background: radial-gradient(circle at 50% 50%, #6366f1 0%, rgba(99,102,241,0) 60%); opacity: .38; animation: aaw-drift3 26s ease-in-out infinite; }
            `}</style>

            {/* طبقات التدرّج المنزلقة */}
            <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                <div className="aaw-blob aaw-b1" />
                <div className="aaw-blob aaw-b2" />
                <div className="aaw-blob aaw-b3" />
                {/* تعتيم خفيف لضمان تباين النص */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(30,42,74,0.15) 0%, rgba(30,42,74,0.55) 100%)',
                    }}
                />
            </div>

            {/* المحتوى */}
            <div
                style={{
                    position: 'relative',
                    zIndex: 1,
                    flex: '1 1 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    color: '#ffffff',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--law-gold, #c9a227)' }}>
                        {weekdayAr(now)} · {dateAr(now)}
                    </span>
                    <span style={{ fontSize: 'clamp(18px, 4vw, 26px)', fontWeight: 800, lineHeight: 1.2 }}>
                        {greetingFor(h24)}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span
                        style={{
                            fontSize: 'clamp(30px, 9vw, 52px)',
                            fontWeight: 800,
                            letterSpacing: '1px',
                            fontVariantNumeric: 'tabular-nums',
                            lineHeight: 1,
                        }}
                    >
                        {pad2(h12)}:{pad2(now.getMinutes())}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 700, opacity: 0.85 }}>{period}</span>
                    <span
                        style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            opacity: 0.7,
                            fontVariantNumeric: 'tabular-nums',
                            marginInlineStart: '2px',
                        }}
                    >
                        {pad2(now.getSeconds())}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AuroraAmbientWidget;
