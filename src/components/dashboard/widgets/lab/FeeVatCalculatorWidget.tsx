import React, { useEffect, useRef, useState } from 'react';
import { Receipt, Copy, Check, Percent } from 'lucide-react';

/**
 * FeeVatCalculatorWidget — حاسبة الأتعاب وضريبة القيمة المضافة (15%).
 *
 * أداة حسابية بحتة (بلا backend ولا شبكة): إدخال المبلغ ⇒ الأساس + الضريبة + الإجمالي،
 * مع مفتاح «شامل/غير شامل الضريبة» وزر نسخ الإجمالي.
 * نسبة الضريبة ثابتة نظاماً (15%)؛ لو احتجنا ربطها بإعدادات المكتب لاحقاً فمصدرها
 * إعدادات الفوترة/العقود (نفس النسبة المستخدمة في فواتير ZATCA).
 */

const VAT_RATE = 0.15;

const fmt = (n: number): string =>
    (Number.isFinite(n) ? n : 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

/** رقم متحرّك بسلاسة عبر requestAnimationFrame (يُنظَّف في cleanup). */
const useAnimatedNumber = (value: number, duration = 420): number => {
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

const FeeVatCalculatorWidget: React.FC = () => {
    const [amountStr, setAmountStr] = useState<string>('5000');
    const [inclusive, setInclusive] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);
    const copyTimer = useRef<number | null>(null);

    const amount = Math.max(0, parseFloat(amountStr) || 0);

    // شامل الضريبة: المُدخل هو الإجمالي؛ غير شامل: المُدخل هو الأساس
    const base = inclusive ? amount / (1 + VAT_RATE) : amount;
    const vat = base * VAT_RATE;
    const total = base + vat;

    const animatedTotal = useAnimatedNumber(total);

    useEffect(() => {
        return () => {
            if (copyTimer.current) window.clearTimeout(copyTimer.current);
        };
    }, []);

    const handleCopy = () => {
        const text = total.toFixed(2);
        const done = () => {
            setCopied(true);
            if (copyTimer.current) window.clearTimeout(copyTimer.current);
            copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
        };
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(done);
        } else {
            done();
        }
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
                @keyframes fvc-check { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: scale(1); } }
                .fvc-check { animation: fvc-check .22s cubic-bezier(.34,1.56,.64,1) both; }
                @keyframes fvc-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
                .fvc-total { animation: fvc-rise .3s ease both; }
                .fvc-seg { transition: color .15s ease; }
            `}</style>

            {/* العنوان */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '0 0 auto' }}>
                <Receipt size={16} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    حاسبة الأتعاب والضريبة
                </span>
            </div>

            {/* المبلغ */}
            <div style={{ position: 'relative', flex: '0 0 auto' }}>
                <input
                    type="text"
                    inputMode="decimal"
                    className="lab-no-drag"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="المبلغ"
                    style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '9px 12px',
                        paddingLeft: '52px',
                        borderRadius: '9px',
                        border: '1px solid var(--color-border, #e5e7eb)',
                        background: 'var(--dashboard-card, #ffffff)',
                        color: 'var(--color-heading)',
                        fontSize: '16px',
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        fontVariantNumeric: 'tabular-nums',
                        outline: 'none',
                        textAlign: 'right',
                    }}
                />
                <span
                    style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '11px',
                        color: 'var(--quiet-gray-400, #9ca3af)',
                        pointerEvents: 'none',
                    }}
                >
                    ريال
                </span>
            </div>

            {/* مفتاح شامل / غير شامل */}
            <div
                style={{
                    display: 'flex',
                    padding: '3px',
                    borderRadius: '9px',
                    background: 'var(--quiet-gray-100, #f3f4f6)',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    flex: '0 0 auto',
                }}
            >
                {[
                    { key: false, label: 'غير شامل الضريبة' },
                    { key: true, label: 'شامل الضريبة' },
                ].map((opt) => {
                    const active = inclusive === opt.key;
                    return (
                        <button
                            key={String(opt.key)}
                            type="button"
                            className="fvc-seg lab-no-drag"
                            onClick={() => setInclusive(opt.key)}
                            style={{
                                flex: 1,
                                padding: '6px 4px',
                                borderRadius: '7px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                fontFamily: 'inherit',
                                background: active ? 'var(--law-navy, #1e2a4a)' : 'transparent',
                                color: active ? '#ffffff' : 'var(--color-text-secondary)',
                            }}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>

            {/* التفصيل */}
            <div
                style={{
                    flex: '1 1 auto',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    background: 'var(--law-navy-light, #eef1f8)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>الأساس</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-heading)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(base)}
                    </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        <Percent size={11} style={{ color: 'var(--law-gold, #c9a227)' }} />
                        ضريبة القيمة المضافة 15%
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--law-gold, #c9a227)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(vat)}
                    </span>
                </div>

                <div style={{ borderTop: '1px dashed var(--color-border, #e5e7eb)', margin: '2px 0' }} />

                {/* الإجمالي */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>الإجمالي</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                            <span
                                className="fvc-total"
                                key={inclusive ? 'inc' : 'exc'}
                                style={{
                                    fontSize: '26px',
                                    fontWeight: 800,
                                    color: 'var(--law-navy, #1e2a4a)',
                                    fontVariantNumeric: 'tabular-nums',
                                    letterSpacing: '-0.5px',
                                    lineHeight: 1,
                                }}
                            >
                                {fmt(animatedTotal)}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>ريال</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="lab-no-drag"
                        onClick={handleCopy}
                        title="نسخ الإجمالي"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '7px 12px',
                            borderRadius: '8px',
                            border: `1px solid ${copied ? 'var(--status-green, #16a34a)' : 'var(--law-navy, #1e2a4a)'}`,
                            background: copied ? 'var(--status-green-light, #dcfce7)' : 'var(--law-navy, #1e2a4a)',
                            color: copied ? 'var(--status-green, #16a34a)' : '#ffffff',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                            fontFamily: 'inherit',
                            flex: '0 0 auto',
                            transition: 'background .15s ease, color .15s ease, border-color .15s ease',
                        }}
                    >
                        {copied ? <Check size={14} className="fvc-check" /> : <Copy size={14} />}
                        {copied ? 'نُسخ' : 'نسخ'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeeVatCalculatorWidget;
