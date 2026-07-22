import React, { useEffect, useRef, useState } from 'react';

/**
 * FlipClockWidget — ساعة رقمية بنمط split-flap.
 *
 * كل رقم بطاقة كحلية ذات خطّ منتصف؛ عند تغيّر الرقم تُعاد تهيئة العنصر
 * (عبر key = الموضع + القيمة) فتُشغَّل حركة flip (rotateX) لمرّة واحدة.
 * عرض بحت — لا backend. الوقت من ساعة المتصفّح المحلية.
 */

const pad2 = (n: number): string => n.toString().padStart(2, '0');

interface DigitProps {
    value: string;
}

// بطاقة رقم واحدة — تنقلب عند إعادة التركيب (تغيّر الـ key من الأب)
const FlipDigit: React.FC<DigitProps> = ({ value }) => (
    <span className="flc-digit">
        <span className="flc-line" aria-hidden />
        {value}
    </span>
);

/** 🎛️ خصائص الودجت: نظام ٢٤ ساعة + إظهار الثواني. */
const FlipClockWidget: React.FC<{ hour24?: boolean; showSeconds?: boolean }> = ({ hour24 = false, showSeconds = true }) => {
    const [now, setNow] = useState<Date>(() => new Date());
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        // 250ms يضمن التقاط حدّ الثانية بسرعة؛ الحركة لا تُشغَّل إلا عند تغيّر الرقم فعلاً
        timerRef.current = window.setInterval(() => setNow(new Date()), 250);
        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
            timerRef.current = null;
        };
    }, []);

    const rawHours = now.getHours();
    const displayHours = hour24 ? rawHours : (rawHours % 12) || 12;
    const hh = pad2(displayHours);
    const mm = pad2(now.getMinutes());
    const ss = pad2(now.getSeconds());
    const groups: Array<{ key: string; chars: string }> = [
        { key: 'h', chars: hh },
        { key: 'm', chars: mm },
        ...(showSeconds ? [{ key: 's', chars: ss }] : []),
    ];

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '10px',
                background: 'var(--dashboard-card, #ffffff)',
            }}
        >
            <style>{`
                @keyframes flc-flip {
                    0%   { transform: rotateX(-88deg); opacity: 0; }
                    55%  { transform: rotateX(9deg);   opacity: 1; }
                    100% { transform: rotateX(0deg);   opacity: 1; }
                }
                @keyframes flc-blink { 0%,45% { opacity: 1; } 55%,100% { opacity: .28; } }
                .flc-row {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    perspective: 320px;
                }
                .flc-group { display: flex; gap: 3px; }
                .flc-digit {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: clamp(26px, 8.5vw, 46px);
                    height: clamp(38px, 12vw, 64px);
                    border-radius: 8px;
                    background: var(--law-navy, #1e2a4a);
                    color: #f6efd6;
                    font-weight: 800;
                    font-size: clamp(22px, 7vw, 40px);
                    line-height: 1;
                    font-variant-numeric: tabular-nums;
                    box-sizing: border-box;
                    border: 1px solid rgba(0,0,0,0.25);
                    transform-origin: center center;
                    animation: flc-flip .42s cubic-bezier(.2,.7,.3,1) both;
                    will-change: transform;
                }
                .flc-line {
                    position: absolute;
                    left: 0; right: 0; top: 50%;
                    height: 2px;
                    transform: translateY(-1px);
                    background: rgba(0,0,0,0.32);
                    pointer-events: none;
                }
                .flc-colon {
                    font-size: clamp(20px, 6vw, 34px);
                    font-weight: 800;
                    color: var(--law-gold, #c9a227);
                    animation: flc-blink 1s steps(1,end) infinite;
                    padding: 0 1px;
                }
            `}</style>

            {/* الساعة LTR دائماً لتقرأ HH:MM:SS بترتيبها الطبيعي */}
            <div className="flc-row" dir="ltr">
                {groups.map((g, gi) => (
                    <React.Fragment key={g.key}>
                        <span className="flc-group">
                            {g.chars.split('').map((ch, ci) => (
                                // key = الموضع + القيمة ⇒ يتغيّر عند تبدّل الرقم فيُعاد التركيب وتُشغَّل الحركة
                                <FlipDigit key={`${g.key}${ci}-${ch}`} value={ch} />
                            ))}
                        </span>
                        {gi < groups.length - 1 && <span className="flc-colon">:</span>}
                    </React.Fragment>
                ))}
            </div>

            <span
                style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '2px',
                    color: 'var(--color-text-secondary, #6b7280)',
                }}
            >
                {hour24 ? ' ' : (rawHours < 12 ? 'صباحاً' : 'مساءً')}
            </span>
        </div>
    );
};

export default FlipClockWidget;
