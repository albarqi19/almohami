import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sun, Moon, Globe } from 'lucide-react';

/**
 * WorldClocksWidget — ساعات عالمية للعملاء الدوليين.
 *
 * أداة عرض مكتفية ذاتياً: الرياض/لندن/نيويورك/دبي. لكل صف اسم المدينة،
 * والوقت الرقمي المحلي (يتحدّث كل ثانية)، وشارة نهار/ليل (شمس/قمر)،
 * والفرق عن توقيت الرياض. المناطق الزمنية عبر Intl (تراعي التوقيت الصيفي تلقائياً).
 */

interface City {
    name: string;
    tz: string;
}

const CITIES: City[] = [
    { name: 'الرياض', tz: 'Asia/Riyadh' },
    { name: 'دبي', tz: 'Asia/Dubai' },
    { name: 'لندن', tz: 'Europe/London' },
    { name: 'نيويورك', tz: 'America/New_York' },
];

const REFERENCE_TZ = 'Asia/Riyadh';

interface ZoneParts {
    hour24: number;
    minute: number;
    second: number;
    offsetMin: number; // إزاحة عن UTC بالدقائق
}

const pad2 = (n: number): string => n.toString().padStart(2, '0');

// تفكيك الوقت لمنطقة زمنية + حساب إزاحتها عن UTC (يراعي DST) عبر Intl فقط
const zoneParts = (date: Date, tz: string): ZoneParts => {
    const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    const map: Record<string, number> = {};
    for (const part of dtf.formatToParts(date)) {
        if (part.type !== 'literal') map[part.type] = Number(part.value);
    }
    // Intl قد يُخرج الساعة 24 عند منتصف الليل — نُطبّعها إلى 0
    const hour24 = map.hour === 24 ? 0 : map.hour;
    const asUTC = Date.UTC(map.year, map.month - 1, map.day, hour24, map.minute, map.second);
    const offsetMin = Math.round((asUTC - date.getTime()) / 60000);
    return { hour24, minute: map.minute, second: map.second, offsetMin };
};

const WorldClocksWidget: React.FC = () => {
    const [now, setNow] = useState<Date>(() => new Date());
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        intervalRef.current = window.setInterval(() => setNow(new Date()), 1000);
        return () => {
            if (intervalRef.current) window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        };
    }, []);

    const rows = useMemo(() => {
        const refOffset = zoneParts(now, REFERENCE_TZ).offsetMin;
        return CITIES.map((city) => {
            const p = zoneParts(now, city.tz);
            const isDay = p.hour24 >= 6 && p.hour24 < 18;
            const hour12 = ((p.hour24 + 11) % 12) + 1;
            const period = p.hour24 < 12 ? 'ص' : 'م';
            const diffHours = (p.offsetMin - refOffset) / 60;
            const isRef = city.tz === REFERENCE_TZ;
            const diffLabel = isRef
                ? 'التوقيت المرجعي'
                : `${diffHours >= 0 ? '+' : '−'}${Math.abs(diffHours) % 1 === 0 ? Math.abs(diffHours) : Math.abs(diffHours).toFixed(1)} س عن الرياض`;
            return {
                name: city.name,
                time: `${pad2(hour12)}:${pad2(p.minute)}:${pad2(p.second)}`,
                period,
                isDay,
                isRef,
                diffLabel,
            };
        });
    }, [now]);

    return (
        <div
            dir="rtl"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                gap: '6px',
                padding: '8px 6px',
            }}
        >
            {/* الرأس */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto', paddingInline: '2px' }}>
                <Globe size={15} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--law-navy, #1e2a4a)' }}>ساعات عالمية</span>
            </div>

            {/* الصفوف */}
            <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: '5px', minHeight: 0, justifyContent: 'space-around' }}>
                {rows.map((r) => (
                    <div
                        key={r.name}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            background: r.isRef ? 'var(--law-navy-light, #eef1f8)' : 'var(--dashboard-card, #ffffff)',
                            border: '1px solid var(--color-border, #e5e7eb)',
                            borderRadius: '9px',
                            padding: '6px 10px',
                        }}
                    >
                        {/* المدينة + الشارة */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    flexShrink: 0,
                                    background: r.isDay ? 'var(--law-gold, #c9a227)' : 'var(--law-navy, #1e2a4a)',
                                    color: '#fff',
                                }}
                                title={r.isDay ? 'نهار' : 'ليل'}
                            >
                                {r.isDay ? <Sun size={13} /> : <Moon size={13} />}
                            </span>
                            <div style={{ minWidth: 0, lineHeight: 1.25 }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading, #1e2a4a)', whiteSpace: 'nowrap' }}>{r.name}</div>
                                <div style={{ fontSize: '9.5px', color: 'var(--color-text-secondary, #6b7280)', whiteSpace: 'nowrap' }}>{r.diffLabel}</div>
                            </div>
                        </div>

                        {/* الوقت */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--law-navy, #1e2a4a)', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.5px' }}>
                                {r.time}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-secondary, #6b7280)' }}>{r.period}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WorldClocksWidget;
