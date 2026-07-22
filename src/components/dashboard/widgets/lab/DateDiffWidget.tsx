import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarRange, Briefcase, ArrowLeftRight } from 'lucide-react';

/**
 * DateDiffWidget — الفرق بين تاريخين.
 *
 * أداة حسابية بحتة (بلا backend ولا شبكة): تاريخان ⇒ الفرق بالأيام والأشهر والسنوات
 * إضافةً إلى عدد أيام العمل (تُستثنى الجمعة والسبت وفق أسبوع العمل السعودي).
 * الحساب يدوي بالكامل عبر كائن Date دون أي مكتبة تقويم.
 */

const MS_DAY = 86_400_000;

const toISODate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const parseISO = (s: string): Date => {
    const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
    const dt = new Date(y || 1970, (m || 1) - 1, d || 1);
    dt.setHours(0, 0, 0, 0);
    return dt;
};

/** رقم صحيح متحرّك بسلاسة عبر requestAnimationFrame (يُنظَّف في cleanup). */
const useAnimatedInt = (value: number, duration = 480): number => {
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

    return Math.round(display);
};

interface Breakdown {
    y: number;
    m: number;
    d: number;
}

const DateDiffWidget: React.FC = () => {
    const today = useMemo(() => {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return t;
    }, []);

    const monthAgo = useMemo(() => {
        const t = new Date(today);
        t.setMonth(t.getMonth() - 3);
        return t;
    }, [today]);

    const [fromStr, setFromStr] = useState<string>(() => toISODate(monthAgo));
    const [toStr, setToStr] = useState<string>(() => toISODate(today));

    const from = useMemo(() => parseISO(fromStr), [fromStr]);
    const to = useMemo(() => parseISO(toStr), [toStr]);

    const reversed = from.getTime() > to.getTime();
    const a = reversed ? to : from;
    const b = reversed ? from : to;

    const totalDays = Math.round((b.getTime() - a.getTime()) / MS_DAY);

    const breakdown = useMemo<Breakdown>(() => {
        let y = b.getFullYear() - a.getFullYear();
        let m = b.getMonth() - a.getMonth();
        let d = b.getDate() - a.getDate();
        if (d < 0) {
            m -= 1;
            const prevMonthDays = new Date(b.getFullYear(), b.getMonth(), 0).getDate();
            d += prevMonthDays;
        }
        if (m < 0) {
            y -= 1;
            m += 12;
        }
        return { y, m, d };
    }, [a, b]);

    // أيام العمل: تُستثنى الجمعة (5) والسبت (6) من getDay().
    const businessDays = useMemo<number>(() => {
        if (totalDays <= 0) return 0;
        if (totalDays > 20_000) return Math.round((totalDays * 5) / 7); // احتياط للنطاقات الضخمة
        let count = 0;
        const cur = new Date(a);
        for (let i = 0; i < totalDays; i++) {
            cur.setDate(cur.getDate() + 1);
            const dow = cur.getDay();
            if (dow !== 5 && dow !== 6) count++;
        }
        return count;
    }, [a, totalDays]);

    const weeks = Math.floor(totalDays / 7);
    const remDays = totalDays % 7;

    const animatedTotal = useAnimatedInt(totalDays);
    const animatedBiz = useAnimatedInt(businessDays);

    const inputStyle: React.CSSProperties = {
        width: '100%',
        boxSizing: 'border-box',
        padding: '7px 10px',
        borderRadius: '8px',
        border: '1px solid var(--color-border, #e5e7eb)',
        background: 'var(--dashboard-card, #ffffff)',
        color: 'var(--color-heading)',
        fontSize: '13px',
        fontFamily: 'inherit',
        fontVariantNumeric: 'tabular-nums',
        outline: 'none',
    };

    const statCell: React.CSSProperties = {
        flex: 1,
        minWidth: 0,
        textAlign: 'center',
        padding: '8px 4px',
        borderRadius: '9px',
        background: 'var(--dashboard-card, #ffffff)',
        border: '1px solid var(--color-border, #e5e7eb)',
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
                @keyframes ddw-pop { from { opacity: 0; transform: translateY(6px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .ddw-result { animation: ddw-pop .36s cubic-bezier(.22,.61,.36,1) both; }
            `}</style>

            {/* العنوان */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '0 0 auto' }}>
                <CalendarRange size={16} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    الفرق بين تاريخين
                </span>
            </div>

            {/* المدخلان */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '7px', flex: '0 0 auto' }}>
                <label style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>من</span>
                    <input type="date" className="lab-no-drag" value={fromStr} onChange={(e) => setFromStr(e.target.value)} style={inputStyle} />
                </label>
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '26px',
                        height: '34px',
                        color: 'var(--quiet-gray-400, #9ca3af)',
                        flex: '0 0 auto',
                    }}
                >
                    <ArrowLeftRight size={14} />
                </span>
                <label style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>إلى</span>
                    <input type="date" className="lab-no-drag" value={toStr} onChange={(e) => setToStr(e.target.value)} style={inputStyle} />
                </label>
            </div>

            {/* النتيجة */}
            <div
                className="ddw-result"
                key={`${toISODate(a)}-${toISODate(b)}`}
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
                {/* إجمالي الأيام */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', justifyContent: 'center' }}>
                    <span
                        style={{
                            fontSize: '34px',
                            fontWeight: 800,
                            color: 'var(--law-navy, #1e2a4a)',
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: '-0.5px',
                            lineHeight: 1,
                        }}
                    >
                        {animatedTotal.toLocaleString('en-US')}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>يوماً</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--quiet-gray-500, #6b7280)', marginTop: '-4px' }}>
                    {weeks > 0 ? `${weeks} أسبوعاً${remDays > 0 ? ` و${remDays} يوماً` : ''}` : 'أقل من أسبوع'}
                </div>

                {/* التقسيم سنوات/أشهر/أيام */}
                <div style={{ display: 'flex', gap: '6px' }}>
                    <div style={statCell}>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-heading)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                            {breakdown.y}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--color-text-secondary)' }}>سنوات</div>
                    </div>
                    <div style={statCell}>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-heading)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                            {breakdown.m}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--color-text-secondary)' }}>أشهر</div>
                    </div>
                    <div style={statCell}>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-heading)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                            {breakdown.d}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--color-text-secondary)' }}>أيام</div>
                    </div>
                </div>

                {/* أيام العمل */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '9px 11px',
                        borderRadius: '9px',
                        background: 'var(--dashboard-card, #ffffff)',
                        border: '1px solid var(--law-gold, #c9a227)',
                    }}
                >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--color-heading)' }}>
                        <Briefcase size={14} style={{ color: 'var(--law-gold, #c9a227)' }} />
                        أيام العمل
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--law-gold, #c9a227)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                            {animatedBiz.toLocaleString('en-US')}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>يوماً</span>
                    </span>
                </div>

                <div style={{ textAlign: 'center', fontSize: '10.5px', color: 'var(--quiet-gray-400, #9ca3af)' }}>
                    {reversed ? 'التاريخان معكوسان — احتُسب الفرق المطلق · ' : ''}تُستثنى الجمعة والسبت
                </div>
            </div>
        </div>
    );
};

export default DateDiffWidget;
