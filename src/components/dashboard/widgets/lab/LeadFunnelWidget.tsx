import React from 'react';
import { Filter, ChevronDown } from 'lucide-react';

/**
 * LeadFunnelWidget — «قمع التحويل».
 * خمس مراحل (زيارات → استفسارات → عملاء محتملون → موكّلون → قضايا) بأشرطة
 * متمركزة يتناقص عرضها لأسفل (شكل قمع)، ولونها يتدرّج من الكحلي إلى الذهبي،
 * مع رقاقة «نسبة التحوّل» بين كل مرحلتين، وشارة معدّل التحويل الكلي في الرأس.
 *
 * ⚠️ بيانات ديمو محلية للعرض فقط.
 * المصدر الحقيقي لاحقاً: عدّ كل مرحلة في مسار العميل —
 * مثل GET /dashboard/lead-funnel  →  COUNT(*) لكل حالة في جدول leads/clients.
 */

interface Stage {
    name: string;
    count: number;
}

// من الأعلى (الأوسع) إلى الأسفل (الأضيق) — ديمو
const STAGES: readonly Stage[] = [
    { name: 'زيارات', count: 4200 },
    { name: 'استفسارات', count: 860 },
    { name: 'عملاء محتملون', count: 340 },
    { name: 'موكّلون', count: 120 },
    { name: 'قضايا', count: 95 },
];

type RGB = [number, number, number];
const NAVY: RGB = [30, 42, 74];   // var(--law-navy)
const GOLD: RGB = [201, 162, 39]; // var(--law-gold)

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** لون المرحلة: تدرّج كحلي → ذهبي حسب موقعها في القمع (٠..١). */
function stageColor(t: number): string {
    const r = Math.round(lerp(NAVY[0], GOLD[0], t));
    const g = Math.round(lerp(NAVY[1], GOLD[1], t));
    const b = Math.round(lerp(NAVY[2], GOLD[2], t));
    return `rgb(${r}, ${g}, ${b})`;
}

const LeadFunnelWidget: React.FC = () => {
    const max = STAGES[0].count;
    const fmt = (n: number): string => n.toLocaleString('ar-SA');
    // معدّل التحويل الكلي: آخر مرحلة ÷ أول مرحلة
    const overall = (STAGES[STAGES.length - 1].count / max) * 100;

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
                .lfw-bar {
                    transform: scaleX(0);
                    transform-origin: center;
                    animation: lfw-grow .85s cubic-bezier(.34,.9,.3,1) forwards;
                }
                @keyframes lfw-grow { to { transform: scaleX(1); } }
                .lfw-conv { opacity: 0; animation: lfw-fade .5s ease forwards; }
                @keyframes lfw-fade { to { opacity: 1; } }
                @media (prefers-reduced-motion: reduce) {
                    .lfw-bar { animation: none; transform: scaleX(1); }
                    .lfw-conv { animation: none; opacity: 1; }
                }
            `}</style>

            {/* رأس */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={14} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    قمع التحويل
                </span>
                <span
                    style={{
                        marginInlineStart: 'auto',
                        display: 'inline-flex',
                        alignItems: 'baseline',
                        gap: '3px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: 'var(--law-navy-light, #eef1f8)',
                        color: 'var(--law-navy, #1e2a4a)',
                        fontSize: '10px',
                        fontWeight: 700,
                    }}
                    title="معدّل التحويل الكلي: من الزيارة إلى قضية"
                >
                    <span style={{ fontSize: '12px', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                        {overall.toLocaleString('ar-SA', { maximumFractionDigits: 1 })}٪
                    </span>
                    كلي
                </span>
            </div>

            {/* المراحل */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 0,
                }}
            >
                {STAGES.map((s, i) => {
                    const t = STAGES.length > 1 ? i / (STAGES.length - 1) : 0;
                    const color = stageColor(t);
                    // عرض مرئي بمقياس جذري ليبقى القمع مقروءاً مع الاحتفاظ بالتناقص
                    const widthFrac = Math.sqrt(s.count / max);
                    const conv = i > 0 ? (s.count / STAGES[i - 1].count) * 100 : null;
                    return (
                        <React.Fragment key={s.name}>
                            {conv !== null && (
                                <div
                                    className="lfw-conv"
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        animationDelay: `${0.2 + i * 0.09}s`,
                                    }}
                                >
                                    <span
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '2px',
                                            fontSize: '9px',
                                            fontWeight: 700,
                                            color: 'var(--quiet-gray-500, #6b7280)',
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    >
                                        <ChevronDown size={10} style={{ color: 'var(--quiet-gray-400, #9ca3af)' }} />
                                        {conv.toLocaleString('ar-SA', { maximumFractionDigits: 1 })}٪
                                    </span>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <div
                                    className="lfw-bar"
                                    style={{
                                        width: `${widthFrac * 100}%`,
                                        minWidth: '86px',
                                        height: '26px',
                                        borderRadius: '8px',
                                        background: color,
                                        animationDelay: `${0.1 + i * 0.09}s`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '6px',
                                        padding: '0 10px',
                                        boxSizing: 'border-box',
                                        color: '#fff',
                                        overflow: 'hidden',
                                    }}
                                    title={`${s.name}: ${fmt(s.count)}`}
                                >
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {s.name}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '12px',
                                            fontWeight: 800,
                                            fontVariantNumeric: 'tabular-nums',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {fmt(s.count)}
                                    </span>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default LeadFunnelWidget;
