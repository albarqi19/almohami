import React, { useEffect, useRef, useState } from 'react';
import { Gavel, ArrowUp } from 'lucide-react';

/**
 * BigCounterWidget — «العدّاد البطل».
 * رقم ضخم يعدّ تصاعدياً بحركة requestAnimationFrame (مع تنظيف) لمؤشّر بارز
 * «قضايا نُفّذت هذا العام»، مع أيقونة وتسمية وشارة اتجاه وخط ذهبي يتمدّد.
 *
 * ⚠️ بيانات ديمو محلية للعرض فقط.
 * المصدر الحقيقي لاحقاً: عدد القضايا المُغلقة تنفيذاً خلال السنة —
 * مثل GET /dashboard/executed-count → COUNT(cases WHERE status='executed' AND YEAR(closed_at)=YEAR).
 */

const DURATION = 1500;

/** 🎛️ خصائص الودجت: العنوان + التسمية + القيمة + نسبة التغيّر — لعرض أي مؤشر بطل تريده. */
interface Props {
    title?: string;
    label?: string;
    value?: number;
    changePct?: number;
}

const BigCounterWidget: React.FC<Props> = ({ title, label, value, changePct }) => {
    const target = Math.max(0, Math.round(Number(value) || 348));
    const change = Number(changePct ?? 14);
    const [val, setVal] = useState(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const reduce =
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) {
            setVal(target);
            return;
        }

        let startTs: number | null = null;
        const step = (ts: number): void => {
            if (startTs === null) startTs = ts;
            const t = Math.min(1, (ts - startTs) / DURATION);
            const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
            setVal(Math.round(eased * target));
            if (t < 1) rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, [target]);

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                direction: 'rtl',
                padding: '8px 6px 4px',
                gap: '4px',
                containerType: 'inline-size',
            }}
        >
            <style>{`
                .bcw-bar { transform: scaleX(0); transform-origin: right center; animation: bcw-grow 1.1s cubic-bezier(.45,0,.2,1) .3s forwards; }
                .bcw-badge { opacity: 0; transform: translateY(4px); animation: bcw-rise .5s ease 1.1s forwards; }
                @keyframes bcw-grow { to { transform: scaleX(1); } }
                @keyframes bcw-rise { to { opacity: 1; transform: translateY(0); } }
                @media (prefers-reduced-motion: reduce) {
                    .bcw-bar { animation: none; transform: scaleX(1); }
                    .bcw-badge { animation: none; opacity: 1; transform: none; }
                }
            `}</style>

            {/* رأس */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '22px',
                        height: '22px',
                        borderRadius: '7px',
                        background: 'var(--law-navy-light, #eef1f8)',
                        flexShrink: 0,
                    }}
                >
                    <Gavel size={13} style={{ color: 'var(--law-navy, #1e2a4a)' }} />
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    {(title || '').trim() || 'الأداء السنوي'}
                </span>
            </div>

            {/* الرقم البطل */}
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    overflow: 'hidden',
                }}
            >
                <span
                    style={{
                        fontSize: 'clamp(34px, 34cqi, 64px)',
                        lineHeight: 1,
                        fontWeight: 800,
                        color: 'var(--law-navy, #1e2a4a)',
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '-1px',
                    }}
                >
                    {val.toLocaleString('ar-SA')}
                </span>

                {/* خط ذهبي يتمدّد */}
                <span
                    className="bcw-bar"
                    style={{
                        width: '46%',
                        maxWidth: '90px',
                        height: '3px',
                        borderRadius: '999px',
                        background: 'var(--law-gold, #c9a227)',
                    }}
                />

                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    {(label || '').trim() || 'قضية نُفّذت هذا العام'}
                </span>
            </div>

            {/* شارة الاتجاه (تختفي عند نسبة 0) */}
            {change !== 0 && (
                <div className="bcw-badge" style={{ display: 'flex', justifyContent: 'center' }}>
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            color: change > 0 ? 'var(--status-green, #16a34a)' : 'var(--status-red, #dc2626)',
                            background: change > 0 ? 'var(--status-green-light, #dcfce7)' : 'var(--status-red-light, #fee2e2)',
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        <ArrowUp size={12} style={change < 0 ? { transform: 'rotate(180deg)' } : undefined} />
                        {Math.abs(change).toLocaleString('ar-SA')}٪ عن العام الماضي
                    </span>
                </div>
            )}
        </div>
    );
};

export default BigCounterWidget;
