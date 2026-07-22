import React from 'react';
import { Wallet } from 'lucide-react';
import { useLiveWidget } from '../../../../services/widgetDataService';

/**
 * CollectionDonutWidget — «دائرة التحصيل».
 * donut SVG يوضّح «محصّل مقابل مستحق»، يُرسَم قوسه بحركة (stroke-dashoffset)،
 * النسبة ٪ في المنتصف، ومفتاح ألوان بالمبالغ (ريال) أسفله.
 *
 * 📡 حيّة: تجلب ملخص التحصيل الفعلي من /dashboard/widget-data (مفتاح
 * collection_summary — يتطلب billing.view)؛ وإلا ديمو محلي بشارة «تجريبي».
 */

// المبالغ (ريال) — ديمو
const TOTAL = 1250000;    // إجمالي المستحق للفوترة
const COLLECTED = 890000; // المحصّل فعلاً

const CX = 60;
const CY = 60;
const R = 44;

interface CollectionPayload {
    total_invoiced: number;
    total_collected: number;
    total_remaining: number;
    collection_rate: number;
}

const CollectionDonutWidget: React.FC = () => {
    const { data: srv, live } = useLiveWidget<CollectionPayload>('collection_summary');

    const isReal = live && !!srv && (srv.total_invoiced || 0) > 0;
    const total = isReal ? srv!.total_invoiced : TOTAL;
    const collected = isReal ? srv!.total_collected : COLLECTED;
    const remaining = isReal ? Math.max(0, srv!.total_remaining) : TOTAL - COLLECTED;

    const collectedFrac = total > 0 ? Math.min(1, collected / total) : 0;
    const pct = Math.round(collectedFrac * 100);

    const fmt = (n: number): string => Math.round(n).toLocaleString('ar-SA');

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
                .cdw-arc {
                    animation: cdw-draw 1.4s cubic-bezier(.45,0,.2,1) .15s forwards;
                }
                .cdw-center {
                    opacity: 0;
                    animation: cdw-fade .6s ease 1.1s forwards;
                }
                @keyframes cdw-draw { to { stroke-dashoffset: 0; } }
                @keyframes cdw-fade { to { opacity: 1; } }
                @media (prefers-reduced-motion: reduce) {
                    .cdw-arc { animation: none; stroke-dashoffset: 0; }
                    .cdw-center { animation: none; opacity: 1; }
                }
            `}</style>

            {/* رأس */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wallet size={14} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    التحصيل المالي
                </span>
                {!isReal && (
                    <span style={{ marginInlineStart: 'auto', fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                        بيانات تجريبية
                    </span>
                )}
            </div>

            {/* الدائرة */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 0,
                }}
            >
                <div style={{ position: 'relative', width: '100%', maxWidth: '130px', aspectRatio: '1 / 1' }}>
                    <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', display: 'block' }} aria-label={`نسبة التحصيل ${pct} بالمئة`}>
                        {/* المسار الكامل = المستحق (رمادي) */}
                        <circle
                            cx={CX}
                            cy={CY}
                            r={R}
                            fill="none"
                            stroke="var(--quiet-gray-100, #f3f4f6)"
                            strokeWidth={15}
                        />
                        {/* قوس المحصّل (أخضر) يُرسَم بحركة */}
                        <circle
                            className="cdw-arc"
                            cx={CX}
                            cy={CY}
                            r={R}
                            fill="none"
                            stroke="var(--status-green, #16a34a)"
                            strokeWidth={15}
                            strokeLinecap="round"
                            pathLength={1}
                            strokeDasharray={`${collectedFrac} 1`}
                            strokeDashoffset={collectedFrac}
                            transform={`rotate(-90 ${CX} ${CY})`}
                        />
                    </svg>

                    {/* النسبة في المنتصف */}
                    <div
                        className="cdw-center"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                        }}
                    >
                        <span
                            style={{
                                fontSize: '26px',
                                lineHeight: 1,
                                fontWeight: 800,
                                color: 'var(--law-navy, #1e2a4a)',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {pct.toLocaleString('ar-SA')}
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--law-gold, #c9a227)' }}>٪</span>
                        </span>
                        <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                            نسبة التحصيل
                        </span>
                    </div>
                </div>
            </div>

            {/* مفتاح الألوان بالمبالغ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <LegendRow color="var(--status-green, #16a34a)" label="محصّل" amount={fmt(collected)} />
                <LegendRow color="var(--quiet-gray-300, #d1d5db)" label="مستحق متبقٍّ" amount={fmt(remaining)} />
            </div>
        </div>
    );
};

interface LegendRowProps {
    color: string;
    label: string;
    amount: string;
}

const LegendRow: React.FC<LegendRowProps> = ({ color, label, amount }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
        <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: color, flexShrink: 0 }} />
        <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>{label}</span>
        <span
            style={{
                marginInlineStart: 'auto',
                fontWeight: 700,
                color: 'var(--color-heading)',
                fontVariantNumeric: 'tabular-nums',
            }}
        >
            {amount} <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>ريال</span>
        </span>
    </div>
);

export default CollectionDonutWidget;
