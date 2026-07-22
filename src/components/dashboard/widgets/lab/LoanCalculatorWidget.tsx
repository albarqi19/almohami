import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Landmark, TrendingUp, Wallet, CalendarDays } from 'lucide-react';

/**
 * LoanCalculatorWidget — حاسبة قسط التمويل.
 *
 * أداة حسابية بحتة (بلا backend ولا شبكة): مبلغ التمويل + نسبة سنوية + عدد الأشهر
 * ⇒ القسط الشهري بمعادلة الإطفاء (amortization) + الإجمالي + مجموع الفوائد،
 * مع جدول مختصر لأول ٣ أشهر (أصل/فائدة/رصيد متبقٍّ).
 * المعادلة: القسط = ف × ن × (١+ن)^م ÷ ((١+ن)^م − ١) حيث ن = النسبة السنوية ÷ ١٢.
 */

interface ScheduleRow {
    month: number;
    interest: number;
    principal: number;
    balance: number;
}

const fmt2 = (n: number): string =>
    (Number.isFinite(n) ? n : 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const fmt0 = (n: number): string =>
    Math.round(Number.isFinite(n) ? n : 0).toLocaleString('en-US');

/** رقم متحرّك بسلاسة عبر requestAnimationFrame (يُنظَّف في cleanup). */
const useAnimatedNumber = (value: number, duration = 460): number => {
    const [display, setDisplay] = useState<number>(value);
    const fromRef = useRef<number>(value);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const from = fromRef.current;
        const to = value;
        let startTs: number | null = null;

        const tick = (ts: number): void => {
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

const MONTH_PRESETS: number[] = [12, 24, 36, 48, 60];

const LoanCalculatorWidget: React.FC = () => {
    const [amountStr, setAmountStr] = useState<string>('150000');
    const [rateStr, setRateStr] = useState<string>('5.5');
    const [months, setMonths] = useState<number>(36);

    const amount = Math.max(0, parseFloat(amountStr) || 0);
    const annualRate = Math.max(0, parseFloat(rateStr) || 0);
    const n = Math.max(1, Math.min(600, Math.round(months) || 1));

    const { payment, total, interest, schedule } = useMemo(() => {
        const r = annualRate / 100 / 12;
        let pay: number;
        if (r === 0) {
            pay = amount / n;
        } else {
            const pow = Math.pow(1 + r, n);
            pay = (amount * r * pow) / (pow - 1);
        }
        const tot = pay * n;
        const rows: ScheduleRow[] = [];
        let balance = amount;
        for (let m = 1; m <= Math.min(3, n); m++) {
            const interestPortion = balance * r;
            const principalPortion = pay - interestPortion;
            balance = Math.max(0, balance - principalPortion);
            rows.push({ month: m, interest: interestPortion, principal: principalPortion, balance });
        }
        return { payment: pay, total: tot, interest: tot - amount, schedule: rows };
    }, [amount, annualRate, n]);

    const animatedPayment = useAnimatedNumber(payment);

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
                @keyframes lcw-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
                .lcw-pay { animation: lcw-rise .32s ease both; }
                .lcw-row { animation: lcw-rise .3s ease both; }
                .lcw-chip { transition: background .15s ease, color .15s ease, border-color .15s ease; }
                .lcw-input { transition: border-color .15s ease; }
                .lcw-input:focus { border-color: var(--law-gold, #c9a227); }
                @media (prefers-reduced-motion: reduce) { .lcw-pay, .lcw-row { animation: none; } }
            `}</style>

            {/* العنوان */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '0 0 auto' }}>
                <Landmark size={16} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    حاسبة قسط التمويل
                </span>
            </div>

            {/* المُدخلات */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flex: '0 0 auto' }}>
                {/* مبلغ التمويل */}
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        inputMode="decimal"
                        className="lcw-input lab-no-drag"
                        value={amountStr}
                        onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ''))}
                        aria-label="مبلغ التمويل"
                        style={inputStyle}
                    />
                    <span style={inputHintStyle}>مبلغ التمويل · ريال</span>
                </div>

                <div style={{ display: 'flex', gap: '7px' }}>
                    {/* النسبة السنوية */}
                    <div style={{ position: 'relative', flex: 1 }}>
                        <input
                            type="text"
                            inputMode="decimal"
                            className="lcw-input lab-no-drag"
                            value={rateStr}
                            onChange={(e) => setRateStr(e.target.value.replace(/[^0-9.]/g, ''))}
                            aria-label="النسبة السنوية"
                            style={inputStyle}
                        />
                        <span style={inputHintStyle}>نسبة سنوية ٪</span>
                    </div>
                    {/* عدد الأشهر */}
                    <div style={{ position: 'relative', flex: 1 }}>
                        <input
                            type="text"
                            inputMode="numeric"
                            className="lcw-input lab-no-drag"
                            value={String(months)}
                            onChange={(e) => setMonths(Math.max(0, parseInt(e.target.value.replace(/[^0-9]/g, '') || '0', 10)))}
                            aria-label="عدد الأشهر"
                            style={inputStyle}
                        />
                        <span style={inputHintStyle}>عدد الأشهر</span>
                    </div>
                </div>

                {/* اختصارات المدة */}
                <div style={{ display: 'flex', gap: '5px' }}>
                    {MONTH_PRESETS.map((m) => {
                        const active = months === m;
                        return (
                            <button
                                key={m}
                                type="button"
                                className="lcw-chip lab-no-drag"
                                onClick={() => setMonths(m)}
                                style={{
                                    flex: 1,
                                    padding: '5px 2px',
                                    borderRadius: '7px',
                                    border: `1px solid ${active ? 'var(--law-navy, #1e2a4a)' : 'var(--color-border, #e5e7eb)'}`,
                                    background: active ? 'var(--law-navy, #1e2a4a)' : 'var(--dashboard-card, #ffffff)',
                                    color: active ? '#ffffff' : 'var(--color-text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    fontFamily: 'inherit',
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {m}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* القسط الشهري */}
            <div
                className="lcw-pay"
                key={`${n}-${annualRate}`}
                style={{
                    flex: '0 0 auto',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '12px 13px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    background: 'var(--law-navy-light, #eef1f8)',
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                        <Wallet size={12} style={{ color: 'var(--law-gold, #c9a227)' }} />
                        القسط الشهري
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                        <span
                            style={{
                                fontSize: '28px',
                                fontWeight: 800,
                                lineHeight: 1,
                                color: 'var(--law-navy, #1e2a4a)',
                                fontVariantNumeric: 'tabular-nums',
                                letterSpacing: '-0.5px',
                            }}
                        >
                            {fmt2(animatedPayment)}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>ريال</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--quiet-gray-400, #9ca3af)' }}>
                    <CalendarDays size={13} />
                    <span style={{ fontSize: '11px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)' }}>
                        {n.toLocaleString('ar-SA')} شهر
                    </span>
                </div>
            </div>

            {/* الإجمالي والفوائد */}
            <div style={{ display: 'flex', gap: '7px', flex: '0 0 auto' }}>
                <SummaryCell label="إجمالي السداد" value={fmt0(total)} tone="navy" />
                <SummaryCell label="مجموع الفوائد" value={fmt0(interest)} tone="gold" icon />
            </div>

            {/* جدول أول ٣ أشهر */}
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--quiet-gray-500, #6b7280)', flex: '0 0 auto' }}>
                    أول ٣ أشهر
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
                    {/* رأس الجدول */}
                    <div style={{ ...tableRowStyle, color: 'var(--quiet-gray-400, #9ca3af)', fontWeight: 700, fontSize: '10px', paddingBottom: '3px' }}>
                        <span style={{ flex: '0 0 34px' }}>الشهر</span>
                        <span style={{ flex: 1, textAlign: 'center' }}>أصل</span>
                        <span style={{ flex: 1, textAlign: 'center' }}>فائدة</span>
                        <span style={{ flex: 1, textAlign: 'left' }}>الرصيد</span>
                    </div>
                    {schedule.map((row, i) => (
                        <div
                            key={row.month}
                            className="lcw-row"
                            style={{
                                ...tableRowStyle,
                                animationDelay: `${i * 70}ms`,
                                fontSize: '11.5px',
                                borderTop: '1px solid var(--color-border, #e5e7eb)',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            <span style={{ flex: '0 0 34px', fontWeight: 700, color: 'var(--law-navy, #1e2a4a)' }}>
                                {row.month.toLocaleString('ar-SA')}
                            </span>
                            <span style={{ flex: 1, textAlign: 'center', color: 'var(--status-green, #16a34a)', fontWeight: 600 }}>
                                {fmt0(row.principal)}
                            </span>
                            <span style={{ flex: 1, textAlign: 'center', color: 'var(--law-gold, #c9a227)', fontWeight: 600 }}>
                                {fmt0(row.interest)}
                            </span>
                            <span style={{ flex: 1, textAlign: 'left', color: 'var(--color-heading)', fontWeight: 600 }}>
                                {fmt0(row.balance)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 11px',
    paddingBottom: '16px',
    borderRadius: '9px',
    border: '1px solid var(--color-border, #e5e7eb)',
    background: 'var(--dashboard-card, #ffffff)',
    color: 'var(--color-heading)',
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: 'inherit',
    fontVariantNumeric: 'tabular-nums',
    outline: 'none',
    textAlign: 'right',
};

const inputHintStyle: React.CSSProperties = {
    position: 'absolute',
    right: '11px',
    bottom: '5px',
    fontSize: '9px',
    fontWeight: 600,
    color: 'var(--quiet-gray-400, #9ca3af)',
    pointerEvents: 'none',
};

const tableRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 2px',
};

interface SummaryCellProps {
    label: string;
    value: string;
    tone: 'navy' | 'gold';
    icon?: boolean;
}

const SummaryCell: React.FC<SummaryCellProps> = ({ label, value, tone, icon }) => {
    const color = tone === 'gold' ? 'var(--law-gold, #c9a227)' : 'var(--law-navy, #1e2a4a)';
    return (
        <div
            style={{
                flex: 1,
                minWidth: 0,
                padding: '8px 10px',
                borderRadius: '9px',
                border: '1px solid var(--color-border, #e5e7eb)',
                background: 'var(--dashboard-card, #ffffff)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                {icon && <TrendingUp size={11} style={{ color }} />}
                {label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.3px' }}>
                    {value}
                </span>
                <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>ريال</span>
            </div>
        </div>
    );
};

export default LoanCalculatorWidget;
