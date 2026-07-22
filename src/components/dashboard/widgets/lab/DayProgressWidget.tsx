import React, { useEffect, useMemo, useState } from 'react';
import { Hourglass, Sun, CalendarRange, CalendarDays } from 'lucide-react';

/**
 * DayProgressWidget — «اغتنام الوقت»: ثلاثة أشرطة تقدّم حيّة لليوم/الأسبوع/السنة.
 *
 * ودجت «عرض بحت» بلا أي backend: يحسب كل شيء من Date محلياً ويتحدّث كل ثانية.
 * ملاحظة: «اليوم» هنا يوم كامل (24س). يمكن لاحقاً جعله «يوم عمل 8ص–5م» بتغيير الحدود.
 * الأسبوع يبدأ الأحد (getDay()===0) موافقةً للتقويم المحلي.
 */

interface Bar {
    key: string;
    label: string;
    pct: number;
    remaining: string;
    color: string;
    Icon: React.ComponentType<{ size?: number | string; color?: string }>;
}

const DAY_MS = 86400000;
const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

/** 🎛️ خصائص الودجت: إظهار/إخفاء أشرطة اليوم/الأسبوع/السنة. */
const DayProgressWidget: React.FC<{ showDay?: boolean; showWeek?: boolean; showYear?: boolean }> = ({ showDay, showWeek, showYear }) => {
    const [now, setNow] = useState<Date>(() => new Date());

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(id);
    }, []);

    const bars: Bar[] = useMemo(() => {
        const t = now.getTime();
        const y = now.getFullYear();

        // اليوم
        const startDay = new Date(y, now.getMonth(), now.getDate()).getTime();
        const dayElapsed = t - startDay;
        const dayPct = (dayElapsed / DAY_MS) * 100;
        const dayLeftSec = Math.max(0, Math.floor((DAY_MS - dayElapsed) / 1000));
        const dLeftH = Math.floor(dayLeftSec / 3600);
        const dLeftM = Math.floor((dayLeftSec % 3600) / 60);
        const dLeftS = dayLeftSec % 60;

        // الأسبوع (يبدأ الأحد)
        const startWeek = new Date(y, now.getMonth(), now.getDate() - now.getDay()).getTime();
        const weekElapsed = t - startWeek;
        const weekTotal = 7 * DAY_MS;
        const weekPct = (weekElapsed / weekTotal) * 100;
        const weekLeftMs = weekTotal - weekElapsed;
        const wDays = Math.floor(weekLeftMs / DAY_MS);
        const wHours = Math.floor((weekLeftMs % DAY_MS) / 3600000);

        // السنة
        const startYear = new Date(y, 0, 1).getTime();
        const endYear = new Date(y + 1, 0, 1).getTime();
        const yearPct = ((t - startYear) / (endYear - startYear)) * 100;
        const yearLeftDays = Math.ceil((endYear - t) / DAY_MS);

        const all: Bar[] = [
            {
                key: 'day',
                label: 'اليوم',
                pct: dayPct,
                remaining: `${pad2(dLeftH)}:${pad2(dLeftM)}:${pad2(dLeftS)}`,
                color: 'var(--law-gold, #c9a227)',
                Icon: Sun,
            },
            {
                key: 'week',
                label: 'الأسبوع',
                pct: weekPct,
                remaining: `${wDays} ي ${wHours} س`,
                color: 'var(--law-navy, #1e2a4a)',
                Icon: CalendarRange,
            },
            {
                key: 'year',
                label: 'السنة',
                pct: yearPct,
                remaining: `${yearLeftDays} يوماً`,
                color: '#2563eb',
                Icon: CalendarDays,
            },
        ];
        // 🎛️ إظهار/إخفاء الأشرطة من خصائص الودجت (كلها ظاهرة افتراضياً)
        const visible = all.filter(
            (b) =>
                (b.key === 'day' && showDay !== false) ||
                (b.key === 'week' && showWeek !== false) ||
                (b.key === 'year' && showYear !== false)
        );
        return visible.length ? visible : all; // لو أخفى الكل، نعرض الكل بدل ودجت فارغة
    }, [now, showDay, showWeek, showYear]);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '0 0 auto' }}>
                <Hourglass size={15} color="var(--law-gold, #c9a227)" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>اغتنام الوقت</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '14px', flex: '1 1 auto' }}>
                {bars.map((b) => (
                    <div key={b.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--color-heading)' }}>
                                <b.Icon size={13} color={b.color} />
                                {b.label}
                            </span>
                            <span
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    color: b.color,
                                    fontVariantNumeric: 'tabular-nums',
                                    direction: 'ltr',
                                }}
                            >
                                {b.pct.toFixed(1)}%
                            </span>
                        </div>

                        <div
                            style={{
                                position: 'relative',
                                height: '8px',
                                borderRadius: '999px',
                                background: 'var(--quiet-gray-100, #f3f4f6)',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    insetInlineStart: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: `${Math.min(100, b.pct)}%`,
                                    background: b.color,
                                    borderRadius: '999px',
                                    transition: 'width 0.9s ease',
                                }}
                            />
                        </div>

                        <span style={{ fontSize: '10.5px', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                            متبقٍّ {b.remaining}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DayProgressWidget;
