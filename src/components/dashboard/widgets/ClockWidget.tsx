import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * ClockWidget — ساعة تناظرية دائرية + رقمية + تاريخ.
 *
 * ودجت «عرض بحت» بلا أي backend: يعتمد فقط على Date + setInterval.
 * 🎛️ خصائص: النمط (تناظرية/رقمية/كلاهما) · الثواني · نظام 24 ساعة.
 */
interface Props {
    style?: 'both' | 'analog' | 'digital';
    showSeconds?: boolean;
    hour24?: boolean;
}

const ClockWidget: React.FC<Props> = ({ style: mode = 'both', showSeconds = true, hour24 = false }) => {
    const [now, setNow] = useState<Date>(() => new Date());
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        // تحديث كل ثانية عبر setInterval (رخيص جداً — عقرب واحد يتحرك)
        const id = window.setInterval(() => setNow(new Date()), 1000);
        return () => {
            window.clearInterval(id);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const seconds = now.getSeconds();
    const minutes = now.getMinutes();
    const hours = now.getHours();

    const secDeg = seconds * 6;                       // 360/60
    const minDeg = minutes * 6 + seconds * 0.1;
    const hourDeg = (hours % 12) * 30 + minutes * 0.5; // 360/12

    const digital = useMemo(
        () =>
            now.toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit',
                ...(showSeconds ? { second: '2-digit' as const } : {}),
                hour12: !hour24,
            }),
        [now, showSeconds, hour24]
    );

    const dateLabel = useMemo(
        () =>
            new Intl.DateTimeFormat('ar-SA', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
            }).format(now),
        [now]
    );

    // علامات الساعات (12 شرطة)
    const ticks = Array.from({ length: 12 }, (_, i) => i);

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '4px',
            }}
        >
            {mode !== 'digital' && (
            <svg
                viewBox="0 0 100 100"
                style={{ width: 'min(100%, 150px)', height: 'auto', aspectRatio: '1 / 1', flex: '0 0 auto' }}
                aria-label="ساعة"
            >
                {/* الإطار */}
                <circle cx="50" cy="50" r="47" fill="var(--dashboard-card, #fff)" stroke="var(--color-border, #e5e7eb)" strokeWidth="2" />
                <circle cx="50" cy="50" r="43" fill="none" stroke="var(--law-navy, #1e2a4a)" strokeWidth="0.6" opacity="0.15" />

                {/* الشرطات */}
                {ticks.map((t) => {
                    const angle = (t * 30 * Math.PI) / 180;
                    const isQuarter = t % 3 === 0;
                    const r1 = isQuarter ? 36 : 39;
                    const r2 = 43;
                    const x1 = 50 + r1 * Math.sin(angle);
                    const y1 = 50 - r1 * Math.cos(angle);
                    const x2 = 50 + r2 * Math.sin(angle);
                    const y2 = 50 - r2 * Math.cos(angle);
                    return (
                        <line
                            key={t}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={isQuarter ? 'var(--law-navy, #1e2a4a)' : 'var(--color-text-secondary, #9ca3af)'}
                            strokeWidth={isQuarter ? 1.6 : 0.8}
                            strokeLinecap="round"
                        />
                    );
                })}

                {/* عقرب الساعات */}
                <line
                    x1="50" y1="50"
                    x2={50 + 24 * Math.sin((hourDeg * Math.PI) / 180)}
                    y2={50 - 24 * Math.cos((hourDeg * Math.PI) / 180)}
                    stroke="var(--law-navy, #1e2a4a)" strokeWidth="3" strokeLinecap="round"
                />
                {/* عقرب الدقائق */}
                <line
                    x1="50" y1="50"
                    x2={50 + 34 * Math.sin((minDeg * Math.PI) / 180)}
                    y2={50 - 34 * Math.cos((minDeg * Math.PI) / 180)}
                    stroke="var(--law-navy, #1e2a4a)" strokeWidth="2" strokeLinecap="round"
                />
                {/* عقرب الثواني */}
                {showSeconds && (
                    <line
                        x1={50 - 8 * Math.sin((secDeg * Math.PI) / 180)}
                        y1={50 + 8 * Math.cos((secDeg * Math.PI) / 180)}
                        x2={50 + 38 * Math.sin((secDeg * Math.PI) / 180)}
                        y2={50 - 38 * Math.cos((secDeg * Math.PI) / 180)}
                        stroke="var(--law-gold, #c9a227)" strokeWidth="1" strokeLinecap="round"
                    />
                )}
                <circle cx="50" cy="50" r="2.4" fill="var(--law-gold, #c9a227)" />
                <circle cx="50" cy="50" r="1" fill="var(--dashboard-card, #fff)" />
            </svg>
            )}

            <div style={{ textAlign: 'center', lineHeight: 1.4 }}>
                {mode !== 'analog' && (
                    <div
                        style={{
                            fontSize: mode === 'digital' ? '30px' : '18px',
                            fontWeight: mode === 'digital' ? 800 : 700,
                            color: 'var(--color-heading)',
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: '0.5px',
                        }}
                    >
                        {digital}
                    </div>
                )}
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{dateLabel}</div>
            </div>
        </div>
    );
};

export default ClockWidget;
