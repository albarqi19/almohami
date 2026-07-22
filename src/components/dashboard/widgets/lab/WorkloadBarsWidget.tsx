import React from 'react';
import { Users } from 'lucide-react';
import { useLiveWidget } from '../../../../services/widgetDataService';

/**
 * WorkloadBarsWidget — «عبء العمل حسب المحامي».
 * أشرطة أفقية لأسماء محامين مع عدد المهام؛ تنمو بحركة عند التحميل،
 * ولونها يتدرّج حسب الحمل (أخضر خفيف → برتقالي → أحمر مرتفع).
 *
 * 📡 حيّة: تجلب المهام المفتوحة الفعلية حسب الموظف من /dashboard/widget-data
 * (مفتاح workload — للإدارة)؛ وإلا ديمو محلي بشارة «تجريبي».
 */

interface Lawyer {
    name: string;
    tasks: number;
}

interface WorkloadPayload {
    by_assignee: Array<{ user_id: number; user_name: string; open: number; overdue: number }>;
}

// مرتّبة تنازلياً حسب الحمل — ديمو
const LAWYERS: readonly Lawyer[] = [
    { name: 'أحمد الغامدي', tasks: 14 },
    { name: 'سارة القحطاني', tasks: 11 },
    { name: 'خالد العتيبي', tasks: 9 },
    { name: 'نورة الشهري', tasks: 6 },
    { name: 'فهد الدوسري', tasks: 4 },
];

// السعة التي تُعتبر عندها الحمولة «مرتفعة» (لتطبيع النسبة واللون)
const CAPACITY = 15;

type RGB = [number, number, number];

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** لون يتدرّج أخضر → برتقالي → أحمر حسب نسبة الحمل (٠..١). */
function loadColor(frac: number): string {
    const stops: { p: number; c: RGB }[] = [
        { p: 0, c: [22, 163, 74] },   // أخضر
        { p: 0.5, c: [234, 88, 12] }, // برتقالي
        { p: 1, c: [220, 38, 38] },   // أحمر
    ];
    const f = Math.max(0, Math.min(1, frac));
    let lo = stops[0];
    let hi = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
        if (f >= stops[i].p && f <= stops[i + 1].p) {
            lo = stops[i];
            hi = stops[i + 1];
            break;
        }
    }
    const span = hi.p - lo.p || 1;
    const t = (f - lo.p) / span;
    const r = Math.round(lerp(lo.c[0], hi.c[0], t));
    const g = Math.round(lerp(lo.c[1], hi.c[1], t));
    const b = Math.round(lerp(lo.c[2], hi.c[2], t));
    return `rgb(${r}, ${g}, ${b})`;
}

const WorkloadBarsWidget: React.FC = () => {
    const { data: srv, live } = useLiveWidget<WorkloadPayload>('workload');

    const isReal = live && !!srv?.by_assignee?.length;
    const rows: readonly Lawyer[] = isReal
        ? srv!.by_assignee.map((r) => ({ name: r.user_name, tasks: r.open }))
        : LAWYERS;
    const capacity = Math.max(CAPACITY, ...rows.map((r) => r.tasks));

    const totalTasks = rows.reduce((sum, l) => sum + l.tasks, 0);
    const fmt = (n: number): string => n.toLocaleString('ar-SA');

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                direction: 'rtl',
                padding: '6px 4px 4px',
                gap: '8px',
            }}
        >
            <style>{`
                .wbw-fill {
                    transform: scaleX(0);
                    transform-origin: right center;
                    animation: wbw-grow .9s cubic-bezier(.35,.9,.3,1) forwards;
                }
                @keyframes wbw-grow { to { transform: scaleX(1); } }
                @media (prefers-reduced-motion: reduce) {
                    .wbw-fill { animation: none; transform: scaleX(1); }
                }
            `}</style>

            {/* رأس */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    عبء العمل
                </span>
                <span style={{ marginInlineStart: 'auto', fontSize: '10px', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {isReal ? `${fmt(totalTasks)} مهمة مفتوحة` : 'بيانات تجريبية'}
                </span>
            </div>

            {/* الأشرطة */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-around',
                    gap: '6px',
                    minHeight: 0,
                }}
            >
                {rows.map((lw, i) => {
                    const frac = Math.min(1, lw.tasks / capacity);
                    const color = loadColor(frac);
                    return (
                        <div key={lw.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                                style={{
                                    width: '72px',
                                    flexShrink: 0,
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: 'var(--color-heading)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    textAlign: 'right',
                                }}
                                title={lw.name}
                            >
                                {lw.name}
                            </span>
                            <div
                                style={{
                                    flex: 1,
                                    height: '16px',
                                    borderRadius: '8px',
                                    background: 'var(--quiet-gray-100, #f3f4f6)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                }}
                            >
                                <div
                                    className="wbw-fill"
                                    style={{
                                        width: `${frac * 100}%`,
                                        height: '100%',
                                        borderRadius: '8px',
                                        background: color,
                                        animationDelay: `${0.15 + i * 0.09}s`,
                                    }}
                                />
                            </div>
                            <span
                                style={{
                                    width: '22px',
                                    flexShrink: 0,
                                    textAlign: 'center',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    color,
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {fmt(lw.tasks)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WorkloadBarsWidget;
