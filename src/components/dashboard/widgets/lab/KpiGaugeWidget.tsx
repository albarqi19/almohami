import React, { useEffect, useRef, useState } from 'react';
import { Gauge } from 'lucide-react';

/**
 * KpiGaugeWidget — «مؤشّر أداء دائري».
 * عدّاد نصف دائري بمؤشّر إبرة، مثال «نسبة كسب القضايا ٧٨٪».
 * الإبرة تكتسح للقيمة بحركة عند التحميل، وقوس ملوّن متدرّج (أحمر→أصفر→أخضر)،
 * والقيمة كبيرة أسفل القوس (تعدّ تصاعدياً مع الإبرة).
 *
 * ⚠️ بيانات ديمو محلية للعرض فقط.
 * المصدر الحقيقي لاحقاً: نسبة الأحكام الصادرة لصالح المكتب —
 * مثل GET /dashboard/win-rate  →  COUNT(cases WHERE outcome='won') / COUNT(cases closed).
 */

// النسبة الافتراضية — صفر حتى يضبطها المستخدم من الترس (لا أرقام وهمية)
const DEFAULT_PCT = 0;

// هندسة القوس (نصف دائرة علوية)
const CX = 100;
const CY = 100;
const ARC_R = 80;
const NEEDLE_LEN = 66;
const TAIL_LEN = 14;

/** 🎛️ خصائص الودجت: العنوان + النسبة (٠-١٠٠). */
const KpiGaugeWidget: React.FC<{ title?: string; percent?: number }> = ({ title, percent }) => {
    const targetFrac = Math.max(0, Math.min(100, Number(percent ?? DEFAULT_PCT))) / 100;
    const [frac, setFrac] = useState(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const duration = 1300;
        let startTs: number | null = null;
        const step = (ts: number): void => {
            if (startTs === null) startTs = ts;
            const t = Math.min(1, (ts - startTs) / duration);
            const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
            setFrac(targetFrac * eased);
            if (t < 1) rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, [targetFrac]);

    // زاوية الإبرة: frac=0 يسار (π)، frac=1 يمين (0)
    const a = Math.PI * (1 - frac);
    const nx = CX + NEEDLE_LEN * Math.cos(a);
    const ny = CY - NEEDLE_LEN * Math.sin(a);
    const tx = CX - TAIL_LEN * Math.cos(a);
    const ty = CY + TAIL_LEN * Math.sin(a);

    const displayValue = Math.round(frac * 100);

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
            {/* رأس */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Gauge size={14} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    {(title || '').trim() || 'نسبة كسب القضايا'}
                </span>
            </div>

            {/* العدّاد */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 0,
                }}
            >
                <div
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '230px',
                    }}
                >
                    <svg
                        viewBox="0 0 200 118"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                        aria-label={`مؤشّر أداء بقيمة ${displayValue} بالمئة`}
                    >
                        <defs>
                            <linearGradient id="kgw-arc" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="var(--status-red, #dc2626)" />
                                <stop offset="42%" stopColor="var(--status-orange, #ea580c)" />
                                <stop offset="70%" stopColor="#eab308" />
                                <stop offset="100%" stopColor="var(--status-green, #16a34a)" />
                            </linearGradient>
                        </defs>

                        {/* مسار الخلفية الباهت */}
                        <path
                            d={`M ${CX - ARC_R} ${CY} A ${ARC_R} ${ARC_R} 0 0 1 ${CX + ARC_R} ${CY}`}
                            fill="none"
                            stroke="var(--quiet-gray-100, #f3f4f6)"
                            strokeWidth={16}
                            strokeLinecap="round"
                        />
                        {/* القوس المتدرّج */}
                        <path
                            d={`M ${CX - ARC_R} ${CY} A ${ARC_R} ${ARC_R} 0 0 1 ${CX + ARC_R} ${CY}`}
                            fill="none"
                            stroke="url(#kgw-arc)"
                            strokeWidth={12}
                            strokeLinecap="round"
                        />

                        {/* نهايات المقياس */}
                        <text x={CX - ARC_R} y={CY + 13} textAnchor="middle" fontSize="9" fill="var(--quiet-gray-400, #9ca3af)">٠</text>
                        <text x={CX + ARC_R} y={CY + 13} textAnchor="middle" fontSize="9" fill="var(--quiet-gray-400, #9ca3af)">١٠٠</text>

                        {/* الإبرة */}
                        <line
                            x1={tx}
                            y1={ty}
                            x2={nx}
                            y2={ny}
                            stroke="var(--law-navy, #1e2a4a)"
                            strokeWidth={3.4}
                            strokeLinecap="round"
                        />
                        <circle cx={CX} cy={CY} r={7} fill="var(--law-navy, #1e2a4a)" />
                        <circle cx={CX} cy={CY} r={3} fill="var(--law-gold, #c9a227)" />
                    </svg>

                    {/* القيمة الكبيرة أسفل القوس (داخل تجويف نصف الدائرة) */}
                    <div
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: '2px',
                            textAlign: 'center',
                            pointerEvents: 'none',
                        }}
                    >
                        <div
                            style={{
                                fontSize: '30px',
                                lineHeight: 1,
                                fontWeight: 800,
                                color: 'var(--law-navy, #1e2a4a)',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {displayValue.toLocaleString('ar-SA')}
                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--law-gold, #c9a227)' }}>٪</span>
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: '3px' }}>
                            من إجمالي القضايا المغلقة
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KpiGaugeWidget;
