import React, { useMemo } from 'react';
import { TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { useLiveWidget } from '../../../../services/widgetDataService';

/**
 * RevenueSparklineWidget — «نبض الإيرادات».
 * مخطّط منطقة/خط SVG صغير لإيرادات 12 شهراً، يُرسَم مساره بحركة (stroke-dashoffset)
 * مع تعبئة متدرّجة تحته، ورقم الإيراد الحالي كبيراً أعلاه بشارة تغيّر نسبي ملوّنة.
 *
 * 📡 حيّة: تجلب اتجاه السنة الحالية من /dashboard/widget-data (مفتاح
 * revenue_trend — يتطلب billing.view). 🎛️ خاصية «المقياس»: محصّل/مفوتر.
 * إن كانت البوابة مطفأة أو الصلاحية غائبة، تعمل بالديمو المحلي بشارة «تجريبي».
 */

const W = 300;
const H = 88;
const PAD_X = 5;
const PAD_TOP = 12;
const PAD_BOTTOM = 8;

// إيرادات آخر 12 شهراً (ريال) — ديمو واقعي لمكتب محاماة
const REVENUE: readonly number[] = [
    220000, 245000, 238000, 262000, 290000, 275000,
    310000, 335000, 322000, 358000, 402000, 448000,
];

interface ServerMonth {
    year: number;
    month: number;
    month_name: string;
    invoiced: number;
    collected: number;
}
interface RevenueTrendPayload { year: number; months: ServerMonth[]; }

interface Pt {
    x: number;
    y: number;
}

/** منحنى ناعم (كاردينال بسيط) عبر النقاط. */
function buildSmoothLine(pts: Pt[]): string {
    if (pts.length < 2) return '';
    const t = 0.16;
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] ?? pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] ?? p2;
        const c1x = p1.x + (p2.x - p0.x) * t;
        const c1y = p1.y + (p2.y - p0.y) * t;
        const c2x = p2.x - (p3.x - p1.x) * t;
        const c2y = p2.y - (p3.y - p1.y) * t;
        d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
}

const RevenueSparklineWidget: React.FC<{ metric?: 'collected' | 'invoiced' }> = ({ metric = 'collected' }) => {
    const { data: trend, live } = useLiveWidget<RevenueTrendPayload>('revenue_trend');

    // بيانات حية حتى آخر شهر له حركة؛ وإلا الديمو المحلي
    const series: readonly number[] = useMemo(() => {
        const months = trend?.months;
        if (!months?.length) return REVENUE;
        let lastActive = -1;
        months.forEach((m, i) => { if ((m.invoiced || 0) > 0 || (m.collected || 0) > 0) lastActive = i; });
        const nowMonth = new Date().getMonth(); // 0-11
        const upTo = Math.max(lastActive, Math.min(nowMonth, months.length - 1));
        const cut = months.slice(0, upTo + 1).map((m) => (metric === 'invoiced' ? m.invoiced : m.collected) || 0);
        return cut.length >= 2 ? cut : REVENUE;
    }, [trend, metric]);

    const isReal = live && !!trend?.months?.length && series !== REVENUE;

    const { linePath, areaPath, dotLeft, dotTop } = useMemo(() => {
        const min = Math.min(...series);
        const max = Math.max(...series);
        const range = max - min || 1;
        const innerH = H - PAD_TOP - PAD_BOTTOM;
        const pts: Pt[] = series.map((v, i) => ({
            x: PAD_X + (i * (W - 2 * PAD_X)) / (series.length - 1),
            y: PAD_TOP + (1 - (v - min) / range) * innerH,
        }));
        const line = buildSmoothLine(pts);
        const first = pts[0];
        const last = pts[pts.length - 1];
        const area = `${line} L ${last.x.toFixed(2)} ${H} L ${first.x.toFixed(2)} ${H} Z`;
        return {
            linePath: line,
            areaPath: area,
            dotLeft: (last.x / W) * 100,
            dotTop: (last.y / H) * 100,
        };
    }, [series]);

    const current = series[series.length - 1];
    const prev = series[series.length - 2] || current || 1;
    const changePct = prev ? ((current - prev) / prev) * 100 : 0;
    const up = changePct >= 0;

    const fmt = (n: number): string => n.toLocaleString('ar-SA');
    const changeLabel = Math.abs(changePct).toLocaleString('ar-SA', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });

    const posColor = 'var(--status-green, #16a34a)';
    const posBg = 'var(--status-green-light, #dcfce7)';
    const negColor = 'var(--status-red, #dc2626)';
    const negBg = 'var(--status-red-light, #fee2e2)';

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                direction: 'rtl',
                padding: '6px 4px 2px',
                gap: '8px',
            }}
        >
            <style>{`
                .rsw-line {
                    fill: none;
                    stroke-dasharray: 1;
                    stroke-dashoffset: 1;
                    animation: rsw-draw 1.5s cubic-bezier(.45,0,.2,1) .12s forwards;
                }
                .rsw-area {
                    opacity: 0;
                    animation: rsw-fade 1s ease .55s forwards;
                }
                .rsw-dot-outer {
                    transform: scale(0);
                    transform-origin: center;
                    animation: rsw-pop .5s cubic-bezier(.34,1.56,.64,1) 1.3s forwards;
                }
                .rsw-pulse {
                    animation: rsw-pulse 2.4s ease-out 1.7s infinite;
                }
                @keyframes rsw-draw { to { stroke-dashoffset: 0; } }
                @keyframes rsw-fade { to { opacity: 1; } }
                @keyframes rsw-pop { to { transform: scale(1); } }
                @keyframes rsw-pulse {
                    0%   { transform: scale(1);   opacity: .55; }
                    70%  { transform: scale(2.6); opacity: 0; }
                    100% { transform: scale(2.6); opacity: 0; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .rsw-line, .rsw-area, .rsw-dot-outer { animation: none; stroke-dashoffset: 0; opacity: 1; transform: none; }
                    .rsw-pulse { animation: none; }
                }
            `}</style>

            {/* رأس */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={14} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    {metric === 'invoiced' ? 'المفوتر شهرياً' : 'نبض التحصيل'}
                </span>
                <span style={{ marginInlineStart: 'auto', fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                    {isReal ? `سنة ${trend?.year}` : 'بيانات تجريبية'}
                </span>
            </div>

            {/* الرقم الحالي + شارة التغيّر */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span
                        style={{
                            fontSize: '26px',
                            lineHeight: 1,
                            fontWeight: 800,
                            color: 'var(--law-navy, #1e2a4a)',
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: '-0.5px',
                        }}
                    >
                        {fmt(current)}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                        ريال
                    </span>
                </div>
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '999px',
                        color: up ? posColor : negColor,
                        background: up ? posBg : negBg,
                        fontVariantNumeric: 'tabular-nums',
                        marginBottom: '2px',
                    }}
                >
                    {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    {changeLabel}٪
                </span>
            </div>

            {/* المخطّط */}
            <div style={{ position: 'relative', flex: 1, minHeight: '42px', direction: 'ltr' }}>
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    preserveAspectRatio="none"
                    style={{ width: '100%', height: '100%', display: 'block' }}
                    aria-label="مخطّط اتجاه الإيرادات الشهرية"
                >
                    <defs>
                        <linearGradient id="rsw-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--law-navy, #1e2a4a)" stopOpacity={0.26} />
                            <stop offset="100%" stopColor="var(--law-navy, #1e2a4a)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <path className="rsw-area" d={areaPath} fill="url(#rsw-fill)" />
                    <path
                        className="rsw-line"
                        d={linePath}
                        pathLength={1}
                        stroke="var(--law-navy, #1e2a4a)"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
                {/* نقطة القيمة الأخيرة (HTML لتبقى دائرية تماماً) */}
                <div
                    className="rsw-dot-outer"
                    style={{
                        position: 'absolute',
                        left: `${dotLeft}%`,
                        top: `${dotTop}%`,
                        width: '9px',
                        height: '9px',
                        marginLeft: '-4.5px',
                        marginTop: '-4.5px',
                        pointerEvents: 'none',
                    }}
                >
                    <span
                        className="rsw-pulse"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '999px',
                            background: 'var(--law-gold, #c9a227)',
                        }}
                    />
                    <span
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '999px',
                            background: 'var(--law-gold, #c9a227)',
                            border: '2px solid var(--dashboard-card, #ffffff)',
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default RevenueSparklineWidget;
