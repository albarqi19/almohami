import React from 'react';
import { Trophy } from 'lucide-react';

/**
 * WinByTypeWidget — «معدّل الكسب حسب نوع القضية».
 * أشرطة أفقية بنسبة كسب لكل نوع (تجاري/عمّالي/جزائي…)، لونها يعبّر عن القوة
 * (أحمر ضعيف → برتقالي → ذهبي → أخضر قوي)، وتُرسَم بحركة متتابعة عند التحميل،
 * مع متوسّط كسب مرجّح في التذييل.
 *
 * ⚠️ بيانات ديمو محلية للعرض فقط.
 * المصدر الحقيقي لاحقاً: نسبة الأحكام لصالح المكتب لكل نوع —
 * مثل GET /dashboard/win-by-type  →  COUNT(won)/COUNT(closed) GROUP BY case_type.
 */

interface CaseType {
    name: string;
    winRate: number; // ٠..١٠٠
    total: number;   // عدد القضايا المغلقة
}

// ديمو — تُرتَّب تنازلياً عند العرض
const TYPES: readonly CaseType[] = [
    { name: 'عمّالي', winRate: 85, total: 47 },
    { name: 'تجاري', winRate: 78, total: 63 },
    { name: 'عقاري', winRate: 71, total: 29 },
    { name: 'أحوال شخصية', winRate: 68, total: 38 },
    { name: 'جزائي', winRate: 62, total: 21 },
    { name: 'إداري', winRate: 55, total: 18 },
];

type RGB = [number, number, number];
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** لون القوة: أحمر → برتقالي → ذهبي → أخضر حسب نسبة الكسب (٠..١). */
function strengthColor(frac: number): string {
    const stops: { p: number; c: RGB }[] = [
        { p: 0.4, c: [220, 38, 38] },   // أحمر
        { p: 0.6, c: [234, 88, 12] },   // برتقالي
        { p: 0.75, c: [201, 162, 39] }, // ذهبي
        { p: 0.9, c: [22, 163, 74] },   // أخضر
    ];
    const f = Math.max(stops[0].p, Math.min(stops[stops.length - 1].p, frac));
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

const WinByTypeWidget: React.FC = () => {
    const rows = [...TYPES].sort((a, b) => b.winRate - a.winRate);
    const totalCases = rows.reduce((s, r) => s + r.total, 0);
    const weightedAvg = totalCases > 0
        ? rows.reduce((s, r) => s + r.winRate * r.total, 0) / totalCases
        : 0;
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
                gap: '6px',
            }}
        >
            <style>{`
                .wbt-fill {
                    transform: scaleX(0);
                    transform-origin: right center;
                    animation: wbt-grow .9s cubic-bezier(.34,.9,.3,1) forwards;
                }
                @keyframes wbt-grow { to { transform: scaleX(1); } }
                @media (prefers-reduced-motion: reduce) {
                    .wbt-fill { animation: none; transform: scaleX(1); }
                }
            `}</style>

            {/* رأس */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trophy size={14} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    معدّل الكسب حسب النوع
                </span>
                <span
                    style={{
                        marginInlineStart: 'auto',
                        fontSize: '10px',
                        color: 'var(--color-text-secondary)',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {fmt(totalCases)} قضية
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
                {rows.map((row, i) => {
                    const color = strengthColor(row.winRate / 100);
                    return (
                        <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                                style={{
                                    width: '78px',
                                    flexShrink: 0,
                                    textAlign: 'right',
                                    lineHeight: 1.15,
                                }}
                                title={`${row.name} — ${fmt(row.total)} قضية`}
                            >
                                <span
                                    style={{
                                        display: 'block',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        color: 'var(--color-heading)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {row.name}
                                </span>
                                <span
                                    style={{
                                        display: 'block',
                                        fontSize: '9px',
                                        color: 'var(--quiet-gray-400, #9ca3af)',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {fmt(row.total)} قضية
                                </span>
                            </span>

                            <div
                                style={{
                                    flex: 1,
                                    height: '15px',
                                    borderRadius: '8px',
                                    background: 'var(--quiet-gray-100, #f3f4f6)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                }}
                            >
                                <div
                                    className="wbt-fill"
                                    style={{
                                        width: `${row.winRate}%`,
                                        height: '100%',
                                        borderRadius: '8px',
                                        background: color,
                                        animationDelay: `${0.15 + i * 0.1}s`,
                                    }}
                                />
                            </div>

                            <span
                                style={{
                                    width: '34px',
                                    flexShrink: 0,
                                    textAlign: 'center',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    color,
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {fmt(row.winRate)}٪
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* تذييل: المتوسّط المرجّح */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    paddingTop: '4px',
                    borderTop: '1px solid var(--color-border, #e5e7eb)',
                }}
            >
                <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                    المتوسّط المرجّح
                </span>
                <span
                    style={{
                        marginInlineStart: 'auto',
                        fontSize: '13px',
                        fontWeight: 800,
                        color: strengthColor(weightedAvg / 100),
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {weightedAvg.toLocaleString('ar-SA', { maximumFractionDigits: 1 })}٪
                </span>
            </div>
        </div>
    );
};

export default WinByTypeWidget;
