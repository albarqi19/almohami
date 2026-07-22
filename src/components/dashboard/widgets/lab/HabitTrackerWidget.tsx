import React, { useCallback, useMemo, useState } from 'react';
import { Flame, Pencil } from 'lucide-react';

import { useWidgetContent } from '../../lab/widgetContent';

/**
 * HabitTrackerWidget — متتبّع عادة أسبوعي.
 *
 * الاسم وحالة الأيام السبعة عبر useWidgetContent: داخل اللوح تُحفظ ضمن حالة
 * اللوحة فتتزامن عبر الخادم لكل مستخدم ولكل نسخة؛ خارجه (📌) localStorage.
 */

interface HabitState {
    name: string;
    days: boolean[]; // 7 عناصر: السبت → الجمعة
}

const STORAGE_KEY = 'lab_habit_v1';

// الأسبوع السعودي يبدأ السبت. الترتيب هنا: السبت، الأحد، … الجمعة
const DAY_LABELS = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'];
const DAY_FULL = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
// getDay(): 0=الأحد … 6=السبت → موضعه في ترتيبنا الذي يبدأ بالسبت
const JS_DAY_TO_POS = [1, 2, 3, 4, 5, 6, 0];

const DEFAULT_STATE: HabitState = {
    name: 'قراءة مذكرة يومياً',
    days: [true, true, true, false, true, false, false],
};

function parseHabit(raw: unknown): HabitState {
    if (!raw || typeof raw !== 'object') return DEFAULT_STATE;
    const parsed = raw as Partial<HabitState>;
    const days =
        Array.isArray(parsed.days) && parsed.days.length === 7
            ? parsed.days.map((d) => d === true)
            : DEFAULT_STATE.days;
    return { name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name : DEFAULT_STATE.name, days };
}

const HabitTrackerWidget: React.FC = () => {
    const [state, setState] = useWidgetContent<HabitState>(STORAGE_KEY, parseHabit);
    const [editing, setEditing] = useState<boolean>(false);

    const todayPos = useMemo(() => JS_DAY_TO_POS[new Date().getDay()], []);

    const toggleDay = useCallback((idx: number) => {
        setState((s) => {
            const days = s.days.slice();
            days[idx] = !days[idx];
            return { ...s, days };
        });
    }, []);

    // streak = عدد الأيام المتتالية المنجزة المنتهية عند اليوم الحالي (رجوعاً للخلف)
    const streak = useMemo(() => {
        let count = 0;
        for (let i = todayPos; i >= 0; i--) {
            if (state.days[i]) count++;
            else break;
        }
        return count;
    }, [state.days, todayPos]);

    const percent = useMemo(() => {
        const done = state.days.filter(Boolean).length;
        return Math.round((done / 7) * 100);
    }, [state.days]);

    return (
        <div
            dir="rtl"
            style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', gap: '10px', justifyContent: 'center' }}
        >
            <style>{`
                @keyframes hbt-pop { 0% { transform: scale(0); } 55% { transform: scale(1.18); } 100% { transform: scale(1); } }
                @keyframes hbt-flame { 0%,100% { transform: scale(1) rotate(-2deg); } 50% { transform: scale(1.12) rotate(2deg); } }
                .hbt-fill { animation: hbt-pop .28s cubic-bezier(.22,1.2,.36,1); }
                .hbt-flame { animation: hbt-flame 1.8s ease-in-out infinite; transform-origin: center bottom; }
                .hbt-circle { transition: border-color .2s ease, background .2s ease; }
                .hbt-bar { transition: width .4s cubic-bezier(.4,0,.2,1); }
            `}</style>

            {/* اسم العادة (قابل للتحرير) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {editing ? (
                    <input
                        className="lab-no-drag"
                        autoFocus
                        value={state.name}
                        onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
                        onBlur={() => setEditing(false)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditing(false);
                        }}
                        style={{
                            flex: 1,
                            minWidth: 0,
                            border: '1px solid var(--color-border, #e5e7eb)',
                            borderRadius: '6px',
                            padding: '5px 8px',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            fontWeight: 700,
                            color: 'var(--color-heading)',
                            background: 'var(--dashboard-card, #fff)',
                            outline: 'none',
                        }}
                    />
                ) : (
                    <>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-heading)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {state.name}
                        </span>
                        <button
                            className="lab-no-drag"
                            onClick={() => setEditing(true)}
                            title="تعديل اسم العادة"
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--quiet-gray-400, #9ca3af)', display: 'flex', padding: '3px', borderRadius: '5px', flex: '0 0 auto' }}
                        >
                            <Pencil size={13} />
                        </button>
                    </>
                )}
            </div>

            {/* صف الأيام السبعة */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                {DAY_LABELS.map((label, idx) => {
                    const filled = state.days[idx];
                    const isToday = idx === todayPos;
                    return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flex: 1, minWidth: 0 }}>
                            <button
                                className="hbt-circle lab-no-drag"
                                onClick={() => toggleDay(idx)}
                                title={`${DAY_FULL[idx]}${isToday ? ' (اليوم)' : ''}`}
                                style={{
                                    width: '100%',
                                    maxWidth: '34px',
                                    aspectRatio: '1 / 1',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: filled ? 'var(--law-gold, #c9a227)' : 'var(--quiet-gray-100, #f3f4f6)',
                                    border: isToday
                                        ? '2px solid var(--law-navy, #1e2a4a)'
                                        : `2px solid ${filled ? 'var(--law-gold, #c9a227)' : 'var(--quiet-gray-300, #d1d5db)'}`,
                                }}
                            >
                                {filled && (
                                    <span
                                        className="hbt-fill"
                                        style={{ width: '46%', height: '46%', borderRadius: '50%', background: '#fff', opacity: 0.9 }}
                                    />
                                )}
                            </button>
                            <span style={{ fontSize: '10px', fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--law-navy, #1e2a4a)' : 'var(--color-text-secondary)' }}>
                                {label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* streak + نسبة الالتزام */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        borderRadius: '999px',
                        background: 'var(--orange-light, #ffedd5)',
                        color: 'var(--status-orange, #ea580c)',
                        flex: '0 0 auto',
                    }}
                >
                    <Flame size={15} className={streak > 0 ? 'hbt-flame' : undefined} />
                    <span style={{ fontSize: '13px', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{streak}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>يوم متتالٍ</span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>الالتزام الأسبوعي</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--law-navy, #1e2a4a)', fontVariantNumeric: 'tabular-nums' }}>{percent}%</span>
                    </div>
                    <div style={{ height: '5px', borderRadius: '999px', background: 'var(--quiet-gray-100, #f3f4f6)', overflow: 'hidden' }}>
                        <div className="hbt-bar" style={{ width: `${percent}%`, height: '100%', borderRadius: '999px', background: 'var(--law-gold, #c9a227)' }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HabitTrackerWidget;
