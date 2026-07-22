import React, { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Target } from 'lucide-react';

/**
 * GoalProgressWidget — حلقة تقدّم هدف مع حركة امتلاء عند التحميل (تجريبي).
 *
 * لا backend: القيمة محلية للعرض فقط (أزرار +/- تجريبية).
 * البيانات الحقيقية لاحقاً: عدّاد القضايا المغلقة هذا الشهر من جدول cases
 * (status=closed و closed_at ضمن الشهر الحالي، نطاق المكتب) عبر endpoint
 * مثل GET /dashboard/monthly-goal — يعيد { value, target }.
 */

const DEFAULT_TARGET = 10;
const DEFAULT_LABEL = 'قضايا مغلقة هذا الشهر';

const RADIUS = 45;
const CIRC = 2 * Math.PI * RADIUS;

function colorFor(pct: number): string {
    if (pct < 40) return 'var(--status-red, #dc2626)';
    if (pct < 70) return 'var(--law-gold, #c9a227)';
    return 'var(--status-green, #16a34a)';
}

/** 🎛️ خصائص الودجت: التسمية + الهدف + القيمة الحالية (الأزرار الداخلية تبقى تعمل). */
const GoalProgressWidget: React.FC<{ label?: string; target?: number; current?: number }> = ({ label, target, current }) => {
    const goalTarget = Math.max(1, Math.round(Number(target) || DEFAULT_TARGET));
    const goalLabel = (label || '').trim() || DEFAULT_LABEL;

    const [value, setValue] = useState<number>(() =>
        Math.max(0, Math.min(goalTarget, Math.round(Number(current ?? 0))))
    );
    const [mounted, setMounted] = useState<boolean>(false);

    // مزامنة القيمة عند تغيير الخصائص من الترس
    useEffect(() => {
        if (current !== undefined) {
            setValue(Math.max(0, Math.min(goalTarget, Math.round(Number(current) || 0))));
        } else {
            setValue((v) => Math.min(v, goalTarget));
        }
    }, [current, goalTarget]);

    // نطلق حركة الامتلاء بعد أول رسم (من فارغ إلى الهدف)
    useEffect(() => {
        const id = window.requestAnimationFrame(() => setMounted(true));
        return () => window.cancelAnimationFrame(id);
    }, []);

    const pct = useMemo(() => Math.round((value / goalTarget) * 100), [value, goalTarget]);
    const ringColor = colorFor(pct);
    const offset = mounted ? CIRC * (1 - value / goalTarget) : CIRC;

    const dec = () => setValue((v) => Math.max(0, v - 1));
    const inc = () => setValue((v) => Math.min(goalTarget, v + 1));

    return (
        <div
            dir="rtl"
            style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '4px' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'stretch' }}>
                <Target size={14} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-heading)' }}>هدف الشهر</span>
            </div>

            {/* الحلقة */}
            <div style={{ position: 'relative', width: 'min(100%, 140px)', flex: '0 1 auto' }}>
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: 'auto', aspectRatio: '1 / 1', transform: 'rotate(-90deg)' }} aria-label={`${pct}%`}>
                    <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="var(--quiet-gray-100, #f3f4f6)" strokeWidth="9" />
                    <circle
                        cx="50"
                        cy="50"
                        r={RADIUS}
                        fill="none"
                        stroke={ringColor}
                        strokeWidth="9"
                        strokeLinecap="round"
                        strokeDasharray={CIRC}
                        strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.34,1.1,.4,1), stroke .4s ease' }}
                    />
                </svg>
                {/* النسبة في المنتصف */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                    }}
                >
                    <span style={{ fontSize: '30px', fontWeight: 800, color: 'var(--color-heading)', fontVariantNumeric: 'tabular-nums' }}>
                        {pct}
                        <span style={{ fontSize: '15px', fontWeight: 700 }}>%</span>
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums', marginTop: '3px' }}>
                        {value} / {goalTarget}
                    </span>
                </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>{goalLabel}</div>

            {/* أزرار التعديل (تجريبي) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                    className="lab-no-drag"
                    onClick={dec}
                    disabled={value <= 0}
                    title="إنقاص"
                    style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border, #e5e7eb)',
                        background: 'var(--dashboard-card, #fff)',
                        color: 'var(--law-navy, #1e2a4a)',
                        cursor: value <= 0 ? 'not-allowed' : 'pointer',
                        opacity: value <= 0 ? 0.4 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Minus size={15} />
                </button>
                <button
                    className="lab-no-drag"
                    onClick={inc}
                    disabled={value >= goalTarget}
                    title="زيادة"
                    style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'var(--law-navy, #1e2a4a)',
                        color: '#fff',
                        cursor: value >= goalTarget ? 'not-allowed' : 'pointer',
                        opacity: value >= goalTarget ? 0.4 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Plus size={15} />
                </button>
            </div>
        </div>
    );
};

export default GoalProgressWidget;
