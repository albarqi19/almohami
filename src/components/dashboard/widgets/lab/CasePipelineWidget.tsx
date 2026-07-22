import React, { useMemo } from 'react';
import { Filter, ChevronsDown } from 'lucide-react';

/**
 * CasePipelineWidget — قمع مراحل القضايا.
 *
 * أشكال قمعية متدرّجة لمراحل الدعوى (قيد النظر ← مرافعة ← حكم ← تنفيذ)
 * بأعداد ديمو ونِسَب انتقال بينها.
 * ⚠️ بيانات ديمو محلية للعرض فقط.
 * تُربط لاحقاً بتجميع القضايا حسب المرحلة (GROUP BY stage) من جدول القضايا.
 */

interface Stage {
    name: string;
    count: number;
    color: string;
    text: string;
}

// أعداد ديمو حسب المرحلة
const STAGES: Stage[] = [
    { name: 'قيد النظر', count: 48, color: 'var(--law-navy, #1e2a4a)', text: '#ffffff' },
    { name: 'مرافعة', count: 31, color: '#33436f', text: '#ffffff' },
    { name: 'حكم', count: 19, color: '#8a7233', text: '#ffffff' },
    { name: 'تنفيذ', count: 11, color: 'var(--law-gold, #c9a227)', text: 'var(--law-navy, #1e2a4a)' },
];

const CasePipelineWidget: React.FC = () => {
    const model = useMemo(() => {
        const top = STAGES[0]?.count || 1;
        const minW = 34; // أضيق عرض للقمة (٪) حتى تبقى الأسماء مقروءة
        const widths = STAGES.map((s) => minW + (1 - minW / 100) * (s.count / top) * 100);
        return STAGES.map((s, i) => ({
            ...s,
            topW: widths[i],
            botW: widths[Math.min(i + 1, widths.length - 1)],
            pctOfTop: Math.round((s.count / top) * 100),
            transfer: i === 0 ? null : Math.round((s.count / (STAGES[i - 1]?.count || 1)) * 100),
        }));
    }, []);

    const totalActive = useMemo(() => STAGES.reduce((a, s) => a + s.count, 0), []);

    return (
        <div
            dir="rtl"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                gap: '8px',
                padding: '4px 2px',
                minHeight: 0,
            }}
        >
            <style>{`
                @keyframes cpw-in { from { opacity: 0; transform: translateY(-6px) scaleY(.85); } to { opacity: 1; transform: translateY(0) scaleY(1); } }
                @keyframes cpw-fade { from { opacity: 0; } to { opacity: 1; } }
                .cpw-seg { animation: cpw-in .5s cubic-bezier(.4,0,.2,1) both; transform-origin: top center; }
                .cpw-transfer { animation: cpw-fade .5s ease both; }
                @media (prefers-reduced-motion: reduce) { .cpw-seg, .cpw-transfer { animation: none; } }
            `}</style>

            {/* العنوان */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '0 0 auto' }}>
                <Filter size={16} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    قمع مراحل القضايا
                </span>
                <span style={{ marginRight: 'auto', fontSize: '10.5px', color: 'var(--quiet-gray-400, #9ca3af)', fontVariantNumeric: 'tabular-nums' }}>
                    {totalActive.toLocaleString('ar-SA')} نشطة
                </span>
            </div>

            {/* القمع */}
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {model.map((s, i) => (
                    <React.Fragment key={s.name}>
                        {/* نسبة الانتقال بين المراحل */}
                        {s.transfer !== null && (
                            <div
                                className="cpw-transfer"
                                style={{
                                    animationDelay: `${i * 130 + 60}ms`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '3px',
                                    flex: '0 0 auto',
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    color: 'var(--quiet-gray-500, #6b7280)',
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                <ChevronsDown size={11} style={{ color: 'var(--law-gold, #c9a227)' }} />
                                {s.transfer.toLocaleString('ar-SA')}٪ انتقال
                            </div>
                        )}

                        {/* شريحة القمع */}
                        <div
                            className="cpw-seg"
                            style={{
                                animationDelay: `${i * 130}ms`,
                                position: 'relative',
                                flex: '1 1 0',
                                minHeight: '30px',
                                width: '100%',
                                background: s.color,
                                clipPath: `polygon(${50 - s.topW / 2}% 0%, ${50 + s.topW / 2}% 0%, ${50 + s.botW / 2}% 100%, ${50 - s.botW / 2}% 100%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '3px',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: s.text }}>
                                <span style={{ fontSize: '12.5px', fontWeight: 700 }}>{s.name}</span>
                                <span style={{ fontSize: '17px', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.3px' }}>
                                    {s.count.toLocaleString('ar-SA')}
                                </span>
                                <span style={{ fontSize: '9.5px', fontWeight: 700, opacity: 0.72, fontVariantNumeric: 'tabular-nums' }}>
                                    {s.pctOfTop.toLocaleString('ar-SA')}٪
                                </span>
                            </div>
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default CasePipelineWidget;
