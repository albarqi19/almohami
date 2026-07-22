import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Coins, Moon, CheckCircle2, MinusCircle } from 'lucide-react';

/**
 * ZakatWidget — حاسبة زكاة المال.
 *
 * أداة حسابية بحتة (بلا backend ولا شبكة): مبلغ المال ⇒ الزكاة الواجبة 2.5٪
 * بشرط بلوغ النصاب وحولان الحول. النصاب قيمة تقديرية قابلة للتعديل (تُقاس عادةً
 * بقيمة 85 جم ذهب أو 595 جم فضة)، وتُحدَّث بأسعار السوق يدوياً هنا.
 */

const ZAKAT_RATE = 0.025;

const fmt = (n: number): string =>
    (Number.isFinite(n) ? n : 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

/** رقم متحرّك بسلاسة عبر requestAnimationFrame (يُنظَّف في cleanup). */
const useAnimatedNumber = (value: number, duration = 460): number => {
    const [display, setDisplay] = useState<number>(value);
    const fromRef = useRef<number>(value);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const from = fromRef.current;
        const to = value;
        let startTs: number | null = null;

        const tick = (ts: number) => {
            if (startTs === null) startTs = ts;
            const p = duration <= 0 ? 1 : Math.min(1, (ts - startTs) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            const cur = from + (to - from) * eased;
            fromRef.current = cur;
            setDisplay(cur);
            if (p < 1) rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [value, duration]);

    return display;
};

const ZakatWidget: React.FC = () => {
    // قيمة النصاب تقديرية (≈ 595 جم فضة). تُحدَّث بأسعار السوق يدوياً حالياً.
    const [amountStr, setAmountStr] = useState<string>('120000');
    const [nisabStr, setNisabStr] = useState<string>('5950');

    const amount = Math.max(0, parseFloat(amountStr) || 0);
    const nisab = Math.max(0, parseFloat(nisabStr) || 0);

    const reachesNisab = amount >= nisab && amount > 0;
    const zakat = useMemo(() => (reachesNisab ? amount * ZAKAT_RATE : 0), [amount, reachesNisab]);
    const animatedZakat = useAnimatedNumber(zakat);

    const inputStyle: React.CSSProperties = {
        width: '100%',
        boxSizing: 'border-box',
        padding: '8px 10px',
        borderRadius: '8px',
        border: '1px solid var(--color-border, #e5e7eb)',
        background: 'var(--dashboard-card, #ffffff)',
        color: 'var(--color-heading)',
        fontFamily: 'inherit',
        fontVariantNumeric: 'tabular-nums',
        outline: 'none',
        textAlign: 'right',
    };

    return (
        <div
            dir="rtl"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                gap: '10px',
                padding: '4px 2px',
                minHeight: 0,
            }}
        >
            <style>{`
                @keyframes zkt-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
                .zkt-total { animation: zkt-rise .34s ease both; }
                @keyframes zkt-shimmer { 0% { transform: translateX(-120%); } 100% { transform: translateX(120%); } }
                .zkt-shine { animation: zkt-shimmer 2.8s ease-in-out infinite; }
            `}</style>

            {/* العنوان */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '0 0 auto' }}>
                <Coins size={16} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    حاسبة زكاة المال
                </span>
            </div>

            {/* المدخلات */}
            <div style={{ display: 'flex', gap: '8px', flex: '0 0 auto' }}>
                <label style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                        وعاء الزكاة (ريال)
                    </span>
                    <input
                        type="text"
                        inputMode="decimal"
                        className="lab-no-drag"
                        value={amountStr}
                        onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ''))}
                        style={{ ...inputStyle, fontSize: '15px', fontWeight: 700 }}
                    />
                </label>
                <label style={{ width: '104px', flex: '0 0 auto' }}>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                        النصاب (تقديري)
                    </span>
                    <input
                        type="text"
                        inputMode="decimal"
                        className="lab-no-drag"
                        value={nisabStr}
                        onChange={(e) => setNisabStr(e.target.value.replace(/[^0-9.]/g, ''))}
                        style={{ ...inputStyle, fontSize: '13px', fontWeight: 600, textAlign: 'center' }}
                    />
                </label>
            </div>

            {/* النتيجة الذهبية */}
            <div
                style={{
                    position: 'relative',
                    overflow: 'hidden',
                    flex: '1 1 auto',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '14px',
                    borderRadius: '10px',
                    border: `1px solid ${reachesNisab ? 'var(--law-gold, #c9a227)' : 'var(--color-border, #e5e7eb)'}`,
                    background: reachesNisab ? 'var(--law-navy, #1e2a4a)' : 'var(--quiet-gray-100, #f3f4f6)',
                }}
            >
                {reachesNisab && (
                    <span
                        aria-hidden
                        className="zkt-shine"
                        style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            width: '40%',
                            background: 'linear-gradient(90deg, transparent, rgba(201,162,39,0.16), transparent)',
                            pointerEvents: 'none',
                        }}
                    />
                )}

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: reachesNisab ? 'var(--law-gold, #c9a227)' : 'var(--quiet-gray-500, #6b7280)',
                            }}
                        >
                            {reachesNisab ? <CheckCircle2 size={12} /> : <MinusCircle size={12} />}
                            {reachesNisab ? 'بلغ النصاب' : 'لم يبلغ النصاب'}
                        </span>
                    </div>

                    <div style={{ fontSize: '11px', color: reachesNisab ? 'rgba(255,255,255,0.72)' : 'var(--color-text-secondary)', marginBottom: '2px' }}>
                        الزكاة الواجبة (2.5٪)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span
                            className="zkt-total"
                            key={reachesNisab ? 'due' : 'none'}
                            style={{
                                fontSize: '32px',
                                fontWeight: 800,
                                color: reachesNisab ? 'var(--law-gold, #c9a227)' : 'var(--quiet-gray-400, #9ca3af)',
                                fontVariantNumeric: 'tabular-nums',
                                letterSpacing: '-0.5px',
                                lineHeight: 1,
                            }}
                        >
                            {fmt(animatedZakat)}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: reachesNisab ? 'rgba(255,255,255,0.72)' : 'var(--color-text-secondary)' }}>
                            ريال
                        </span>
                    </div>
                </div>

                <div
                    style={{
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '10.5px',
                        color: reachesNisab ? 'rgba(255,255,255,0.6)' : 'var(--quiet-gray-400, #9ca3af)',
                    }}
                >
                    <Moon size={11} style={{ flex: '0 0 auto' }} />
                    <span>تُخرج الزكاة بعد حولان الحول الهجري على بلوغ النصاب</span>
                </div>
            </div>
        </div>
    );
};

export default ZakatWidget;
