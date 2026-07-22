import React, { useMemo } from 'react';
import { MapPin, ArrowUp, ArrowDown, Sun, CloudSun, Cloud, Droplets, Wind } from 'lucide-react';

/**
 * WeatherWidget — بطاقة طقس (ديمو للرياض) بأيقونة شمس متحركة خفيفة + توقّع 3 أيام.
 *
 * ⚠️ تجريبي: القيم ثابتة لعرض الفكرة فقط.
 * تُربط لاحقاً بمزوّد طقس (OpenWeather / Open-Meteo) عبر مسار باك صغير مثل
 * /dashboard/weather?city=riyadh، فنستبدل الثوابت أدناه بجلب ذاتي في useEffect.
 */

interface Forecast {
    offset: number; // عدد الأيام من اليوم
    hi: number;
    lo: number;
    Icon: React.ComponentType<{ size?: number | string; color?: string }>;
}

const FORECAST: Forecast[] = [
    { offset: 1, hi: 39, lo: 24, Icon: Sun },
    { offset: 2, hi: 36, lo: 23, Icon: CloudSun },
    { offset: 3, hi: 33, lo: 22, Icon: Cloud },
];

const WeatherWidget: React.FC = () => {
    const dayNames = useMemo(() => {
        const fmt = new Intl.DateTimeFormat('ar-SA', { weekday: 'short' });
        return FORECAST.map((f) => {
            const d = new Date();
            d.setDate(d.getDate() + f.offset);
            return fmt.format(d);
        });
    }, []);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', gap: '10px' }}>
            <style>{`
                @keyframes wea-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes wea-drift {
                    0%   { transform: translateX(0); }
                    50%  { transform: translateX(4px); }
                    100% { transform: translateX(0); }
                }
                .wea-rays { transform-box: fill-box; transform-origin: center; animation: wea-spin 26s linear infinite; }
                .wea-cloud { transform-box: fill-box; transform-origin: center; animation: wea-drift 6s ease-in-out infinite; }
            `}</style>

            {/* الرأس: درجة الحرارة + الأيقونة المتحركة */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--law-navy-light, #eef1f8)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    flex: '0 0 auto',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span
                        style={{
                            fontSize: '11px',
                            color: 'var(--color-text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}
                    >
                        <MapPin size={12} color="var(--law-gold, #c9a227)" />
                        الرياض
                    </span>
                    <span
                        style={{
                            fontSize: '32px',
                            fontWeight: 700,
                            color: 'var(--law-navy, #1e2a4a)',
                            fontVariantNumeric: 'tabular-nums',
                            lineHeight: 1,
                            direction: 'ltr',
                        }}
                    >
                        34°
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-heading)' }}>مشمس</span>
                </div>

                {/* شمس مرسومة يدوياً: القرص ثابت والأشعّة تدور ببطء */}
                <svg viewBox="0 0 100 100" width="64" height="64" aria-label="مشمس" style={{ flex: '0 0 auto' }}>
                    <g className="wea-rays" stroke="var(--law-gold, #c9a227)" strokeWidth="4" strokeLinecap="round">
                        {Array.from({ length: 8 }, (_, i) => {
                            const a = (i * 45 * Math.PI) / 180;
                            const x1 = 50 + 30 * Math.cos(a);
                            const y1 = 50 + 30 * Math.sin(a);
                            const x2 = 50 + 40 * Math.cos(a);
                            const y2 = 50 + 40 * Math.sin(a);
                            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
                        })}
                    </g>
                    <circle cx="50" cy="50" r="18" fill="var(--law-gold, #c9a227)" />
                    <circle cx="50" cy="50" r="12" fill="var(--law-navy-light, #eef1f8)" opacity="0.35" />
                </svg>
            </div>

            {/* الحد الأعلى/الأدنى + تفاصيل */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '0 0 auto', fontSize: '12px', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <ArrowUp size={13} color="var(--status-red, #dc2626)" /> 38°
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <ArrowDown size={13} color="#2563eb" /> 22°
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Droplets size={13} color="#2563eb" /> 12%
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Wind size={13} color="var(--quiet-gray-500, #6b7280)" /> 9
                </span>
            </div>

            {/* شريط 3 أيام قادمة */}
            <div
                style={{
                    display: 'flex',
                    gap: '6px',
                    flex: '1 1 auto',
                    alignItems: 'stretch',
                }}
            >
                {FORECAST.map((f, i) => (
                    <div
                        key={f.offset}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            padding: '8px 4px',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border, #e5e7eb)',
                            background: 'var(--dashboard-card, #ffffff)',
                        }}
                    >
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{dayNames[i]}</span>
                        <f.Icon size={20} color="var(--law-gold, #c9a227)" />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-heading)', fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>
                            {f.hi}° / {f.lo}°
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WeatherWidget;
