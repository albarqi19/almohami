import React from 'react';
import { Target } from 'lucide-react';

/**
 * ActivityRingsWidget — «حلقات النشاط».
 * ٣ حلقات SVG متراكزة بنمط Apple Watch (قضايا/مهام/جلسات) تمتلئ بحركة
 * stroke-dashoffset عند التحميل، بألوان مميّزة، والنِّسَب المئوية في المنتصف.
 *
 * ⚠️ بيانات ديمو محلية للعرض فقط.
 * المصدر الحقيقي لاحقاً: المُنجَز مقابل المُخطَّط لكل مؤشّر أسبوعي —
 * مثل GET /dashboard/activity-rings → { cases:{done,total}, tasks:{...}, sessions:{...} }.
 */

interface Ring {
    label: string;
    done: number;
    total: number;
    color: string;
    radius: number;
}

const RINGS: readonly Ring[] = [
    { label: 'قضايا', done: 96, total: 120, color: 'var(--law-gold, #c9a227)', radius: 52 },
    { label: 'مهام', done: 284, total: 342, color: '#2563eb', radius: 39 },
    { label: 'جلسات', done: 38, total: 47, color: 'var(--status-green, #16a34a)', radius: 26 },
];

const SW = 9;
const CTR = 60;

const ActivityRingsWidget: React.FC = () => {
    const rings = RINGS.map((r) => {
        const frac = Math.max(0, Math.min(1, r.done / r.total));
        return { ...r, frac, pct: Math.round(frac * 100) };
    });

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
                .arw-arc { animation: arw-draw 1.3s cubic-bezier(.45,0,.2,1) forwards; }
                .arw-center { opacity: 0; animation: arw-fade .5s ease 1.05s forwards; }
                @keyframes arw-draw { to { stroke-dashoffset: 0; } }
                @keyframes arw-fade { to { opacity: 1; } }
                @media (prefers-reduced-motion: reduce) {
                    .arw-arc { animation: none; stroke-dashoffset: 0; }
                    .arw-center { animation: none; opacity: 1; }
                }
            `}</style>

            {/* رأس */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={14} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    حلقات النشاط
                </span>
                <span style={{ marginInlineStart: 'auto', fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                    هذا الأسبوع
                </span>
            </div>

            {/* الحلقات */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '132px', aspectRatio: '1 / 1' }}>
                    <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', display: 'block' }} aria-label="حلقات نشاط أسبوعية">
                        {rings.map((r, i) => (
                            <g key={i}>
                                {/* المسار الخلفي */}
                                <circle
                                    cx={CTR}
                                    cy={CTR}
                                    r={r.radius}
                                    fill="none"
                                    stroke="var(--quiet-gray-100, #f3f4f6)"
                                    strokeWidth={SW}
                                />
                                {/* القوس المتحرّك */}
                                <circle
                                    className="arw-arc"
                                    style={{ animationDelay: `${i * 0.16}s`, strokeDashoffset: r.frac }}
                                    cx={CTR}
                                    cy={CTR}
                                    r={r.radius}
                                    fill="none"
                                    stroke={r.color}
                                    strokeWidth={SW}
                                    strokeLinecap="round"
                                    pathLength={1}
                                    strokeDasharray={`${r.frac} 1`}
                                    transform={`rotate(-90 ${CTR} ${CTR})`}
                                />
                            </g>
                        ))}
                    </svg>

                    {/* النِّسَب في المنتصف */}
                    <div
                        className="arw-center"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1px',
                            pointerEvents: 'none',
                        }}
                    >
                        {rings.map((r, i) => (
                            <span
                                key={i}
                                style={{
                                    fontSize: '11px',
                                    lineHeight: 1.05,
                                    fontWeight: 800,
                                    color: r.color,
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {r.pct.toLocaleString('ar-SA')}٪
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* مفتاح المؤشرات */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {rings.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: r.color, flexShrink: 0 }} />
                        <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>{r.label}</span>
                        <span
                            style={{
                                marginInlineStart: 'auto',
                                fontWeight: 700,
                                color: 'var(--color-heading)',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {r.done.toLocaleString('ar-SA')}
                            <span style={{ color: 'var(--quiet-gray-400, #9ca3af)', fontWeight: 600 }}> / {r.total.toLocaleString('ar-SA')}</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActivityRingsWidget;
