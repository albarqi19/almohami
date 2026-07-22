import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, SlidersHorizontal, Repeat } from 'lucide-react';

import { useWidgetContent } from '../../lab/widgetContent';

/**
 * CurrencyConverterWidget — محوّل عملات (SAR / USD / EUR / AED).
 *
 * أداة حسابية بحتة. الأسعار بيانات ديمو قابلة للتعديل يدوياً وتُحفظ عبر
 * useWidgetContent (داخل اللوح تتزامن مع الخادم؛ خارجه 📌 localStorage)؛
 * لاحقاً تُجلب أسعار الصرف اللحظية من مزوّد وتُستبدل هذه القيم الافتراضية.
 */

type Code = 'SAR' | 'USD' | 'EUR' | 'AED';
type EditableCode = Exclude<Code, 'SAR'>;
type Rates = Record<Code, number>; // كم ريالاً يساوي كل وحدة من العملة

const CODES: Code[] = ['SAR', 'USD', 'EUR', 'AED'];
const NAMES: Record<Code, string> = {
    SAR: 'ريال سعودي',
    USD: 'دولار أمريكي',
    EUR: 'يورو',
    AED: 'درهم إماراتي',
};

const DEFAULT_RATES: Record<EditableCode, string> = { USD: '3.75', EUR: '4.08', AED: '1.02' };
const LS_KEY = 'lab_ccw_rates_v1';

const parseRateStrings = (raw: unknown): Record<EditableCode, string> => {
    const p = (raw || {}) as Partial<Record<EditableCode, string>>;
    return {
        USD: typeof p.USD === 'string' ? p.USD : DEFAULT_RATES.USD,
        EUR: typeof p.EUR === 'string' ? p.EUR : DEFAULT_RATES.EUR,
        AED: typeof p.AED === 'string' ? p.AED : DEFAULT_RATES.AED,
    };
};

const fmt = (n: number, max = 2): string =>
    (Number.isFinite(n) ? n : 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: max,
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

const CurrencyConverterWidget: React.FC = () => {
    const [amountStr, setAmountStr] = useState<string>('1000');
    const [from, setFrom] = useState<Code>('USD');
    const [to, setTo] = useState<Code>('SAR');
    const [editing, setEditing] = useState<boolean>(false);
    const [rateStr, setRateStr] = useWidgetContent<Record<EditableCode, string>>(LS_KEY, parseRateStrings);

    const rates = useMemo<Rates>(() => {
        const pick = (c: EditableCode): number => {
            const v = parseFloat(rateStr[c]);
            return v > 0 ? v : parseFloat(DEFAULT_RATES[c]);
        };
        return { SAR: 1, USD: pick('USD'), EUR: pick('EUR'), AED: pick('AED') };
    }, [rateStr]);

    const amount = Math.max(0, parseFloat(amountStr) || 0);
    const result = useMemo(() => amount * (rates[from] / rates[to]), [amount, rates, from, to]);
    const animatedResult = useAnimatedNumber(result);
    const unitRate = rates[from] / rates[to];

    const swap = () => {
        setFrom(to);
        setTo(from);
    };

    const pillRow = (value: Code, onPick: (c: Code) => void) => (
        <div style={{ display: 'flex', gap: '5px' }}>
            {CODES.map((c) => {
                const active = value === c;
                return (
                    <button
                        key={c}
                        type="button"
                        className="ccw-seg lab-no-drag"
                        onClick={() => onPick(c)}
                        style={{
                            flex: 1,
                            padding: '6px 2px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 800,
                            fontFamily: 'inherit',
                            letterSpacing: '0.3px',
                            border: `1px solid ${active ? 'var(--law-navy, #1e2a4a)' : 'var(--color-border, #e5e7eb)'}`,
                            background: active ? 'var(--law-navy, #1e2a4a)' : 'var(--dashboard-card, #ffffff)',
                            color: active ? '#ffffff' : 'var(--color-text-secondary)',
                        }}
                    >
                        {c}
                    </button>
                );
            })}
        </div>
    );

    return (
        <div
            dir="rtl"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                gap: '9px',
                padding: '4px 2px',
                minHeight: 0,
            }}
        >
            <style>{`
                @keyframes ccw-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
                .ccw-res { animation: ccw-rise .3s ease both; }
                .ccw-seg { transition: background .15s ease, color .15s ease, border-color .15s ease; }
                .ccw-swap { transition: transform .25s cubic-bezier(.34,1.56,.64,1); }
                .ccw-swap:hover { transform: rotate(180deg); }
            `}</style>

            {/* العنوان */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '0 0 auto' }}>
                <ArrowRightLeft size={16} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>محوّل العملات</span>
                <button
                    type="button"
                    className="lab-no-drag"
                    onClick={() => setEditing((v) => !v)}
                    title="تعديل الأسعار"
                    style={{
                        marginRight: 'auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '26px',
                        height: '26px',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        border: `1px solid ${editing ? 'var(--law-gold, #c9a227)' : 'var(--color-border, #e5e7eb)'}`,
                        background: editing ? 'var(--law-navy-light, #eef1f8)' : 'transparent',
                        color: editing ? 'var(--law-gold, #c9a227)' : 'var(--quiet-gray-500, #6b7280)',
                    }}
                >
                    <SlidersHorizontal size={13} />
                </button>
            </div>

            {editing ? (
                /* محرّر الأسعار (لكل عملة: كم ريالاً تساوي) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flex: '0 0 auto' }}>
                    {(['USD', 'EUR', 'AED'] as EditableCode[]).map((c) => (
                        <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '38px', flex: '0 0 auto', fontSize: '12px', fontWeight: 800, color: 'var(--color-heading)' }}>{c}</span>
                            <span style={{ fontSize: '11px', color: 'var(--quiet-gray-400, #9ca3af)' }}>=</span>
                            <input
                                type="text"
                                inputMode="decimal"
                                className="lab-no-drag"
                                value={rateStr[c]}
                                onChange={(e) => setRateStr((prev) => ({ ...prev, [c]: e.target.value.replace(/[^0-9.]/g, '') }))}
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    boxSizing: 'border-box',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--color-border, #e5e7eb)',
                                    background: 'var(--dashboard-card, #ffffff)',
                                    color: 'var(--color-heading)',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    fontFamily: 'inherit',
                                    fontVariantNumeric: 'tabular-nums',
                                    outline: 'none',
                                    textAlign: 'right',
                                }}
                            />
                            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', flex: '0 0 auto' }}>ريال</span>
                        </div>
                    ))}
                    <button
                        type="button"
                        className="lab-no-drag"
                        onClick={() => setRateStr({ ...DEFAULT_RATES })}
                        style={{
                            alignSelf: 'flex-start',
                            padding: '5px 12px',
                            borderRadius: '7px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'inherit',
                            border: '1px solid var(--color-border, #e5e7eb)',
                            background: 'var(--quiet-gray-100, #f3f4f6)',
                            color: 'var(--color-text-secondary)',
                        }}
                    >
                        استعادة الأسعار الافتراضية
                    </button>
                    <div style={{ fontSize: '10px', color: 'var(--quiet-gray-400, #9ca3af)' }}>
                        أسعار ديمو تُحفظ محلياً · تُجلب لاحقاً من مزوّد لحظي
                    </div>
                </div>
            ) : (
                <>
                    {/* المبلغ */}
                    <div style={{ flex: '0 0 auto' }}>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>المبلغ</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            className="lab-no-drag"
                            value={amountStr}
                            onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ''))}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '9px 12px',
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
                    </div>

                    {/* من / تبديل / إلى */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>من</span>
                            {pillRow(from, setFrom)}
                        </div>
                        <button
                            type="button"
                            className="ccw-swap lab-no-drag"
                            onClick={swap}
                            title="تبديل"
                            style={{
                                marginTop: '16px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '30px',
                                height: '30px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                flex: '0 0 auto',
                                border: '1px solid var(--law-gold, #c9a227)',
                                background: 'var(--law-navy-light, #eef1f8)',
                                color: 'var(--law-gold, #c9a227)',
                            }}
                        >
                            <Repeat size={14} />
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>إلى</span>
                            {pillRow(to, setTo)}
                        </div>
                    </div>

                    {/* النتيجة */}
                    <div
                        style={{
                            flex: '1 1 auto',
                            minHeight: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '12px',
                            borderRadius: '10px',
                            border: '1px solid var(--color-border, #e5e7eb)',
                            background: 'var(--law-navy-light, #eef1f8)',
                        }}
                    >
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            {fmt(amount)} {from} =
                        </div>
                        <div className="ccw-res" key={`${from}-${to}`} style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span
                                style={{
                                    fontSize: '30px',
                                    fontWeight: 800,
                                    color: 'var(--law-navy, #1e2a4a)',
                                    fontVariantNumeric: 'tabular-nums',
                                    letterSpacing: '-0.5px',
                                    lineHeight: 1,
                                }}
                            >
                                {fmt(animatedResult)}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--law-gold, #c9a227)' }}>{to}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--quiet-gray-500, #6b7280)' }}>{NAMES[to]}</div>
                        <div
                            style={{
                                marginTop: '2px',
                                paddingTop: '8px',
                                borderTop: '1px dashed var(--color-border, #e5e7eb)',
                                fontSize: '11px',
                                color: 'var(--color-text-secondary)',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            1 {from} = {fmt(unitRate, 4)} {to}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CurrencyConverterWidget;
