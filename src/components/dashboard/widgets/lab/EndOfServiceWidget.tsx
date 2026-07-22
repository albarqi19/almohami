import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HandCoins, Scale, Info } from 'lucide-react';

/**
 * EndOfServiceWidget — حاسبة مكافأة نهاية الخدمة (نظام العمل السعودي).
 *
 * أداة حسابية بحتة (بلا backend ولا شبكة). القاعدة (المادة 84 وما بعدها):
 *  • نصف شهر عن كل سنة من أول خمس سنوات، وشهر كامل عن كل سنة بعد الخمس.
 *  • في حالة الاستقالة تُعدّل المكافأة: لا شيء دون سنتين، الثلث من سنتين حتى خمس،
 *    الثلثان بعد الخمس حتى عشر، وكاملة إذا بلغت الخدمة عشر سنوات فأكثر.
 *  • في حالة إنهاء صاحب العمل تُصرف المكافأة كاملة.
 * الأرقام أدناه بيانات ديمو؛ تُجلب لاحقاً من ملف الموظف (وحدة HR) عند الربط.
 */

const fmt = (n: number): string =>
    (Number.isFinite(n) ? n : 0).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
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

type EndType = 'terminate' | 'resign';

interface FactorResult {
    factor: number;
    note: string;
}

/** معامل الاستقالة حسب سنوات الخدمة. */
const resignFactor = (years: number): FactorResult => {
    if (years < 2) return { factor: 0, note: 'أقل من سنتين — لا مكافأة' };
    if (years <= 5) return { factor: 1 / 3, note: 'من سنتين حتى خمس — الثلث' };
    if (years < 10) return { factor: 2 / 3, note: 'أكثر من خمس ودون عشر — الثلثان' };
    return { factor: 1, note: 'عشر سنوات فأكثر — كاملة' };
};

const EndOfServiceWidget: React.FC = () => {
    const [salaryStr, setSalaryStr] = useState<string>('12000');
    const [yearsStr, setYearsStr] = useState<string>('7');
    const [endType, setEndType] = useState<EndType>('terminate');

    const salary = Math.max(0, parseFloat(salaryStr) || 0);
    const years = Math.max(0, parseFloat(yearsStr) || 0);

    const calc = useMemo(() => {
        const firstFive = Math.min(years, 5);
        const afterFive = Math.max(0, years - 5);
        // نصف شهر لأول 5 سنوات + شهر لما بعدها
        const base = (firstFive * 0.5 + afterFive * 1) * salary;
        const { factor, note } = endType === 'resign' ? resignFactor(years) : { factor: 1, note: 'إنهاء من صاحب العمل — كاملة' };
        return { base, factor, note, total: base * factor };
    }, [salary, years, endType]);

    const animatedTotal = useAnimatedNumber(calc.total);
    const months = salary > 0 ? calc.total / salary : 0;

    const inputStyle: React.CSSProperties = {
        width: '100%',
        boxSizing: 'border-box',
        padding: '8px 10px',
        borderRadius: '8px',
        border: '1px solid var(--color-border, #e5e7eb)',
        background: 'var(--dashboard-card, #ffffff)',
        color: 'var(--color-heading)',
        fontSize: '14px',
        fontWeight: 700,
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
                @keyframes eos-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
                .eos-total { animation: eos-rise .32s ease both; }
                .eos-seg { transition: background .15s ease, color .15s ease; }
            `}</style>

            {/* العنوان */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '0 0 auto' }}>
                <HandCoins size={16} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    مكافأة نهاية الخدمة
                </span>
            </div>

            {/* المدخلات */}
            <div style={{ display: 'flex', gap: '8px', flex: '0 0 auto' }}>
                <label style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                        الراتب الأساسي (ريال)
                    </span>
                    <input
                        type="text"
                        inputMode="decimal"
                        className="lab-no-drag"
                        value={salaryStr}
                        onChange={(e) => setSalaryStr(e.target.value.replace(/[^0-9.]/g, ''))}
                        style={inputStyle}
                    />
                </label>
                <label style={{ width: '96px', flex: '0 0 auto' }}>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                        سنوات الخدمة
                    </span>
                    <input
                        type="text"
                        inputMode="decimal"
                        className="lab-no-drag"
                        value={yearsStr}
                        onChange={(e) => setYearsStr(e.target.value.replace(/[^0-9.]/g, ''))}
                        style={{ ...inputStyle, textAlign: 'center' }}
                    />
                </label>
            </div>

            {/* نوع الإنهاء */}
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
                {([
                    { key: 'terminate', label: 'إنهاء من صاحب العمل' },
                    { key: 'resign', label: 'استقالة' },
                ] as { key: EndType; label: string }[]).map((opt) => {
                    const active = endType === opt.key;
                    return (
                        <button
                            key={opt.key}
                            type="button"
                            className="eos-seg lab-no-drag"
                            onClick={() => setEndType(opt.key)}
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

            {/* النتيجة */}
            <div
                style={{
                    flex: '1 1 auto',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    background: 'var(--law-navy-light, #eef1f8)',
                }}
            >
                <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>المكافأة المستحقة</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span
                            className="eos-total"
                            key={`${endType}-${Math.round(calc.total)}`}
                            style={{
                                fontSize: '30px',
                                fontWeight: 800,
                                color: 'var(--law-navy, #1e2a4a)',
                                fontVariantNumeric: 'tabular-nums',
                                letterSpacing: '-0.5px',
                                lineHeight: 1,
                            }}
                        >
                            {fmt(animatedTotal)}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>ريال</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--quiet-gray-500, #6b7280)', marginTop: '4px' }}>
                        ما يعادل {months.toLocaleString('en-US', { maximumFractionDigits: 1 })} راتب شهري
                    </div>
                </div>

                <div style={{ borderTop: '1px dashed var(--color-border, #e5e7eb)' }} />

                {/* تفصيل المعادلة */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            <Scale size={12} style={{ color: 'var(--law-gold, #c9a227)' }} />
                            المكافأة قبل التعديل
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-heading)', fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(calc.base)} ريال
                        </span>
                    </div>
                    {endType === 'resign' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>معامل الاستقالة</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--law-gold, #c9a227)', fontVariantNumeric: 'tabular-nums' }}>
                                ×{calc.factor === 1 ? '1' : calc.factor === 2 / 3 ? '⅔' : calc.factor === 1 / 3 ? '⅓' : '0'}
                            </span>
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', color: 'var(--quiet-gray-400, #9ca3af)' }}>
                        <Info size={11} style={{ flex: '0 0 auto' }} />
                        <span>{calc.note}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EndOfServiceWidget;
