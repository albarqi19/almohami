import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';

/**
 * ActivityHeatmapWidget — «خريطة النشاط السنوية».
 * شبكة بنمط GitHub (٥٣ أسبوعاً × ٧ أيام) تُظهر كثافة نشاط المكتب اليومي
 * بتدرّج كحلي→ذهبي، مع أسماء الأشهر أعلاها ومفتاح كثافة أسفلها. ثابتة (بلا حركة ثقيلة).
 *
 * ⚠️ بيانات ديمو حتمية (بلا Math.random لتفادي الوميض) للعرض فقط.
 * المصدر الحقيقي لاحقاً: عدّ الأحداث اليومية (قضايا/مهام/جلسات) —
 * مثل GET /dashboard/activity-heatmap → COUNT(*) GROUP BY DATE(created_at).
 */

const COLS = 53;
const ROWS = 7;
const CELL = 10;
const GAP = 3;
const STEP = CELL + GAP;            // 13
const TOP = 15;                     // مساحة أسماء الأشهر
const GRID_W = COLS * STEP - GAP;   // 686
const GRID_H = ROWS * STEP - GAP;   // 88
const SVG_W = GRID_W;
const SVG_H = TOP + GRID_H;

const MONTHS_AR = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
] as const;

// تدرّج الكثافة: لا نشاط → ذروة ذهبية (تدرّجات كحلي مع بدائل hex)
const LEVEL_COLORS: readonly string[] = [
    'var(--quiet-gray-100, #f3f4f6)',
    '#dbe2f2',
    '#8ea3cf',
    'var(--law-navy, #1e2a4a)',
    'var(--law-gold, #c9a227)',
];

/** عشوائية زائفة حتمية 0..1 حسب الفهرس (Math.sin — كود تطبيق مسموح). */
function pseudo(n: number): number {
    const s = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
    return s - Math.floor(s);
}

interface Cell {
    x: number;
    y: number;
    color: string;
}

interface MonthLabel {
    x: number;
    name: string;
}

const ActivityHeatmapWidget: React.FC = () => {
    const { cells, months, total } = useMemo(() => {
        const today = new Date();
        const todayRow = today.getDay(); // 0=الأحد
        const out: Cell[] = [];
        const labels: MonthLabel[] = [];
        let sum = 0;
        let lastMonth = -1;
        let lastLabelCol = -5;

        // أحد بداية العمود الأول (قبل ٥٢ أسبوعاً من أحد هذا الأسبوع)
        const startSunday = new Date(today);
        startSunday.setDate(today.getDate() - todayRow - (COLS - 1) * 7);

        for (let c = 0; c < COLS; c++) {
            // تسمية الشهر عند تغيّره (مع فسحة كافية لتفادي التزاحم)
            const colDate = new Date(startSunday);
            colDate.setDate(startSunday.getDate() + c * 7);
            const m = colDate.getMonth();
            if (m !== lastMonth && c - lastLabelCol >= 3 && c < COLS - 1) {
                labels.push({ x: c * STEP, name: MONTHS_AR[m] });
                lastMonth = m;
                lastLabelCol = c;
            }

            for (let r = 0; r < ROWS; r++) {
                const isFuture = c === COLS - 1 && r > todayRow;
                let level = 0;
                if (!isFuture) {
                    const gi = c * 7 + r;
                    const weekend = r === 5 || r === 6; // الجمعة/السبت أهدأ
                    const base = pseudo(gi + 1);
                    const seasonal = 0.55 + 0.45 * Math.sin((c / COLS) * Math.PI * 2 - 1);
                    const raw = base * (weekend ? 0.3 : 1) * seasonal;
                    const count = Math.max(0, Math.round(raw * 14));
                    sum += count;
                    level =
                        count === 0 ? 0 :
                            count <= 2 ? 1 :
                                count <= 5 ? 2 :
                                    count <= 9 ? 3 : 4;
                }
                out.push({
                    x: c * STEP,
                    y: TOP + r * STEP,
                    color: LEVEL_COLORS[level],
                });
            }
        }
        return { cells: out, months: labels, total: sum };
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
                gap: '6px',
            }}
        >
            <style>{`
                .ahm-grid { opacity: 0; animation: ahm-in .6s ease .1s forwards; }
                @keyframes ahm-in { to { opacity: 1; } }
                @media (prefers-reduced-motion: reduce) { .ahm-grid { animation: none; opacity: 1; } }
            `}</style>

            {/* رأس */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={14} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    خريطة النشاط
                </span>
                <span
                    style={{
                        marginInlineStart: 'auto',
                        fontSize: '10px',
                        color: 'var(--color-text-secondary)',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {total.toLocaleString('ar-SA')} نشاطاً / السنة
                </span>
            </div>

            {/* الشبكة (LTR: الأقدم يساراً، اليوم يميناً) */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', direction: 'ltr' }}>
                <svg
                    viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                    preserveAspectRatio="xMidYMid meet"
                    style={{ width: '100%', height: '100%', display: 'block' }}
                    aria-label="خريطة حرارية سنوية لكثافة النشاط"
                >
                    <g className="ahm-grid">
                        {months.map((mo, i) => (
                            <text
                                key={`m${i}`}
                                x={mo.x}
                                y={10}
                                fontSize={9}
                                fill="var(--color-text-secondary, #6b7280)"
                                style={{ fontWeight: 600 }}
                            >
                                {mo.name}
                            </text>
                        ))}
                        {cells.map((cl, i) => (
                            <rect
                                key={i}
                                x={cl.x}
                                y={cl.y}
                                width={CELL}
                                height={CELL}
                                rx={2}
                                ry={2}
                                fill={cl.color}
                            />
                        ))}
                    </g>
                </svg>
            </div>

            {/* مفتاح الكثافة */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>أقل</span>
                <div style={{ display: 'flex', gap: '3px' }}>
                    {LEVEL_COLORS.map((c, i) => (
                        <span key={i} style={{ width: '10px', height: '10px', borderRadius: '2px', background: c }} />
                    ))}
                </div>
                <span style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>أكثر</span>
            </div>
        </div>
    );
};

export default ActivityHeatmapWidget;
