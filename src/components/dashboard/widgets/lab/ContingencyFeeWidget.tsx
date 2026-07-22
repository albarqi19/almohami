import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Scale, BadgePercent, User } from 'lucide-react';

/**
 * ContingencyFeeWidget — حاسبة أتعاب النسبة (المحاماة بالنسبة من المطالبة).
 *
 * أداة حسابية بحتة (بلا backend ولا شبكة): قيمة المطالبة × نسبة الأتعاب ⇒
 * الأتعاب التقديرية وصافي ما يؤول للعميل. النِّسب شرائح شائعة (10/15/20/25٪)
 * مع إمكانية إدخال نسبة مخصّصة. قيم افتراضية للعرض فقط.
 */

const TIERS = [10, 15, 20, 25];

const fmt = (n: number): string =>
    (Number.isFinite(n) ? n : 0).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

/** رقم متحرّك بسلاسة عبر requestAnimationFrame (يُنظَّف في cleanup). */
const useAnimatedNumber = (value: number, duration = 440): number => {
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

const ContingencyFeeWidget: React.FC = () => {
    const [claimStr, setClaimStr] = useState<string>('500000');
    const [pct, setPct] = useState<number>(15);

    const claim = Math.max(0, parseFloat(claimStr) || 0);
    const pctClamped = Math.min(100, Math.max(0, pct));

    const fee = useMemo(() => claim * (pctClamped / 100), [claim, pctClamped]);
    const net = Math.max(0, claim - fee);

    const animatedFee = useAnimatedNumber(fee);
    const animatedNet = useAnimatedNumber(net);

    // نسبة عرض شريط التوزيع (الأتعاب مقابل الصافي)
    const feeWidth = claim > 0 ? Math.min(100, (fee / claim) * 100) : 0;

    const inputStyle: React.CSSProperties = {
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
                @keyframes cfw-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
                .cfw-val { animation: cfw-rise .3s ease both; }
                .cfw-seg { transition: background .15s ease, color .15s ease, border-color .15s ease; }
                .cfw-bar-fill { transform-origin: right center; transition: transform .4s cubic-bezier(.22,.61,.36,1); }
            `}</style>

            {/* العنوان */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '0 0 auto' }}>
                <Scale size={16} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    أتعاب النسبة
                </span>
            </div>

            {/* قيمة المطالبة */}
            <div style={{ position: 'relative', flex: '0 0 auto' }}>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                    قيمة المطالبة (ريال)
                </span>
                <input
                    type="text"
                    inputMode="decimal"
                    className="lab-no-drag"
                    value={claimStr}
                    onChange={(e) => setClaimStr(e.target.value.replace(/[^0-9.]/g, ''))}
                    style={inputStyle}
                />
            </div>

            {/* شرائح النسبة */}
            <div style={{ display: 'flex', gap: '6px', flex: '0 0 auto' }}>
                {TIERS.map((t) => {
                    const active = pctClamped === t;
                    return (
                        <button
                            key={t}
                            type="button"
                            className="cfw-seg lab-no-drag"
                            onClick={() => setPct(t)}
                            style={{
                                flex: 1,
                                padding: '7px 4px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 800,
                                fontFamily: 'inherit',
                                fontVariantNumeric: 'tabular-nums',
                                border: `1px solid ${active ? 'var(--law-gold, #c9a227)' : 'var(--color-border, #e5e7eb)'}`,
                                background: active ? 'var(--law-navy, #1e2a4a)' : 'var(--quiet-gray-100, #f3f4f6)',
                                color: active ? 'var(--law-gold, #c9a227)' : 'var(--color-text-secondary)',
                            }}
                        >
                            {t}٪
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
                {/* الأتعاب */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        <BadgePercent size={13} style={{ color: 'var(--law-gold, #c9a227)' }} />
                        الأتعاب التقديرية
                    </span>
                    <span className="cfw-val" key={`fee-${Math.round(fee)}`} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--law-gold, #c9a227)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-0.5px' }}>
                            {fmt(animatedFee)}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>ريال</span>
                    </span>
                </div>

                {/* شريط التوزيع */}
                <div
                    style={{
                        display: 'flex',
                        height: '9px',
                        borderRadius: '999px',
                        overflow: 'hidden',
                        background: 'var(--status-green, #16a34a)',
                        border: '1px solid var(--color-border, #e5e7eb)',
                    }}
                >
                    <div
                        className="cfw-bar-fill"
                        style={{
                            width: '100%',
                            transform: `scaleX(${feeWidth / 100})`,
                            background: 'var(--law-gold, #c9a227)',
                        }}
                    />
                </div>

                {/* الصافي للعميل */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px', paddingTop: '2px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        <User size={13} style={{ color: 'var(--status-green, #16a34a)' }} />
                        صافي العميل
                    </span>
                    <span className="cfw-val" key={`net-${Math.round(net)}`} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--law-navy, #1e2a4a)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-0.5px' }}>
                            {fmt(animatedNet)}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>ريال</span>
                    </span>
                </div>

                <div style={{ textAlign: 'center', fontSize: '10.5px', color: 'var(--quiet-gray-400, #9ca3af)' }}>
                    نسبة الأتعاب {pctClamped}٪ من قيمة المطالبة · تقدير قبل الضريبة والمصروفات
                </div>
            </div>
        </div>
    );
};

export default ContingencyFeeWidget;
