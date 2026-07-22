import React, { useMemo } from 'react';
import { Radar } from 'lucide-react';

/**
 * RadarChartWidget — «رادار توازن الممارسة».
 * مخطّط رادار SVG خماسي يوضّح توزّع نشاط المكتب على مجالات الممارسة
 * (تجاري/عمّالي/جزائي/أحوال/تنفيذ)، بمضلّع كحلي معبّأ شفاف يُرسَم بحركة خفيفة عند التحميل.
 *
 * ⚠️ بيانات ديمو محلية للعرض فقط.
 * المصدر الحقيقي لاحقاً: توزيع القضايا النشطة على التصنيفات —
 * مثل GET /dashboard/practice-mix → COUNT(cases) GROUP BY category.
 */

interface Axis {
    label: string;
    value: number; // 0..100
}

const AXES: readonly Axis[] = [
    { label: 'تجاري', value: 82 },
    { label: 'عمّالي', value: 65 },
    { label: 'جزائي', value: 48 },
    { label: 'أحوال', value: 71 },
    { label: 'تنفيذ', value: 90 },
];

const CX = 100;
const CY = 96;
const R = 68;
const LABEL_R = R + 13;
const RINGS: readonly number[] = [0.25, 0.5, 0.75, 1];

interface Point {
    x: number;
    y: number;
}

function pt(angleDeg: number, radius: number): Point {
    const a = (angleDeg * Math.PI) / 180;
    return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) };
}

interface AxisGeo extends Axis {
    outer: Point;
    lp: Point;
    dp: Point;
    anchor: 'start' | 'middle' | 'end';
}

const RadarChartWidget: React.FC = () => {
    const { geo, gridRings, dataPath, avg } = useMemo(() => {
        const g: AxisGeo[] = AXES.map((ax, i) => {
            const angle = -90 + i * 72;
            const cos = Math.cos((angle * Math.PI) / 180);
            const anchor: 'start' | 'middle' | 'end' =
                cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle';
            return {
                ...ax,
                outer: pt(angle, R),
                lp: pt(angle, LABEL_R),
                dp: pt(angle, (ax.value / 100) * R),
                anchor,
            };
        });
        const rings = RINGS.map((f) =>
            AXES.map((_, i) => pt(-90 + i * 72, R * f))
                .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
                .join(' '),
        );
        const dpath =
            g.map((a, i) => `${i === 0 ? 'M' : 'L'} ${a.dp.x.toFixed(1)} ${a.dp.y.toFixed(1)}`).join(' ') + ' Z';
        const mean = Math.round(AXES.reduce((s, a) => s + a.value, 0) / AXES.length);
        return { geo: g, gridRings: rings, dataPath: dpath, avg: mean };
    }, []);

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                direction: 'rtl',
                padding: '6px 4px 2px',
                gap: '4px',
            }}
        >
            <style>{`
                .rcw-stroke {
                    stroke-dasharray: 1; stroke-dashoffset: 1;
                    animation: rcw-draw 1.15s cubic-bezier(.45,0,.2,1) .15s forwards;
                }
                .rcw-fill { opacity: 0; animation: rcw-fade .7s ease .55s forwards; }
                .rcw-dot {
                    transform: scale(0); transform-box: fill-box; transform-origin: center;
                    animation: rcw-pop .45s cubic-bezier(.34,1.56,.64,1) forwards;
                }
                @keyframes rcw-draw { to { stroke-dashoffset: 0; } }
                @keyframes rcw-fade { to { opacity: 1; } }
                @keyframes rcw-pop { to { transform: scale(1); } }
                @media (prefers-reduced-motion: reduce) {
                    .rcw-stroke { animation: none; stroke-dashoffset: 0; }
                    .rcw-fill { animation: none; opacity: 1; }
                    .rcw-dot { animation: none; transform: none; }
                }
            `}</style>

            {/* رأس */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radar size={14} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    توازن مجالات الممارسة
                </span>
            </div>

            {/* الرادار */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg
                    viewBox="0 0 200 200"
                    style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
                    aria-label="مخطّط رادار لتوزّع مجالات الممارسة"
                >
                    {/* حلقات الشبكة */}
                    {gridRings.map((points, i) => (
                        <polygon
                            key={`g${i}`}
                            points={points}
                            fill="none"
                            stroke="var(--color-border, #e5e7eb)"
                            strokeWidth={0.8}
                        />
                    ))}
                    {/* الأضلاع من المركز */}
                    {geo.map((a, i) => (
                        <line
                            key={`s${i}`}
                            x1={CX}
                            y1={CY}
                            x2={a.outer.x}
                            y2={a.outer.y}
                            stroke="var(--color-border, #e5e7eb)"
                            strokeWidth={0.8}
                        />
                    ))}
                    {/* المضلّع المعبّأ */}
                    <path className="rcw-fill" d={dataPath} fill="var(--law-navy, #1e2a4a)" fillOpacity={0.16} />
                    <path
                        className="rcw-stroke"
                        d={dataPath}
                        fill="none"
                        stroke="var(--law-navy, #1e2a4a)"
                        strokeWidth={2}
                        strokeLinejoin="round"
                        pathLength={1}
                    />
                    {/* رؤوس ذهبية */}
                    {geo.map((a, i) => (
                        <circle
                            key={`d${i}`}
                            className="rcw-dot"
                            style={{ animationDelay: `${0.95 + i * 0.08}s` }}
                            cx={a.dp.x}
                            cy={a.dp.y}
                            r={3}
                            fill="var(--law-gold, #c9a227)"
                            stroke="var(--dashboard-card, #ffffff)"
                            strokeWidth={1.4}
                        />
                    ))}
                    {/* التسميات + القيم */}
                    {geo.map((a, i) => (
                        <g key={`t${i}`}>
                            <text
                                x={a.lp.x}
                                y={a.lp.y - 1}
                                textAnchor={a.anchor}
                                fontSize={9.5}
                                fill="var(--color-heading, #111827)"
                                style={{ fontWeight: 700 }}
                            >
                                {a.label}
                            </text>
                            <text
                                x={a.lp.x}
                                y={a.lp.y + 8}
                                textAnchor={a.anchor}
                                fontSize={8}
                                fill="var(--law-gold, #c9a227)"
                                style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                            >
                                {a.value.toLocaleString('ar-SA')}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>

            {/* التذييل */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>معدّل التوازن</span>
                <span
                    style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: 'var(--law-navy, #1e2a4a)',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {avg.toLocaleString('ar-SA')}
                    <span style={{ color: 'var(--law-gold, #c9a227)' }}>٪</span>
                </span>
            </div>
        </div>
    );
};

export default RadarChartWidget;
