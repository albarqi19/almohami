import React, { useCallback, useMemo } from 'react';
import { Target, Check, Sparkles } from 'lucide-react';

import { useWidgetContent } from '../../lab/widgetContent';

/**
 * TopThreeTodayWidget — «أولويات اليوم الثلاث».
 * ثلاث خانات مرقّمة (١/٢/٣) تُكتب فيها أهم ثلاث مهام لليوم، تُعلَّم كمنجزة،
 * وتُعاد تلقائياً عند بداية كل يوم جديد. عند إنجاز الثلاث يظهر سطر تحفيزي.
 *
 * المحتوى عبر useWidgetContent: داخل اللوح يُحفظ ضمن حالة اللوحة فيتزامن
 * عبر الخادم لكل مستخدم ولكل نسخة؛ خارجه (📌) يبقى localStorage.
 */

interface Priority {
    text: string;
    done: boolean;
}

interface DayState {
    date: string; // مفتاح اليوم YYYY-M-D بالتقويم الميلادي (محلي)
    items: Priority[]; // ٣ عناصر دائماً
}

const STORAGE_KEY = 'lab_top3_v1';

const EMPTY: Priority[] = [
    { text: '', done: false },
    { text: '', done: false },
    { text: '', done: false },
];

// ميداليات المراكز الثلاثة: ذهبي / فضي / برونزي
const RANKS = [
    { bg: 'var(--law-gold, #c9a227)', fg: '#ffffff' },
    { bg: 'var(--quiet-gray-400, #9ca3af)', fg: '#ffffff' },
    { bg: '#b45309', fg: '#ffffff' },
];

function todayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function normalize(items: unknown): Priority[] {
    const base = EMPTY.map((e) => ({ ...e }));
    if (Array.isArray(items)) {
        for (let i = 0; i < 3; i++) {
            const it = items[i] as Partial<Priority> | undefined;
            if (it && typeof it.text === 'string') base[i].text = it.text;
            if (it && typeof it.done === 'boolean') base[i].done = it.done;
        }
    }
    return base;
}

function parseDay(raw: unknown): DayState {
    const today = todayKey();
    const parsed = (raw || {}) as Partial<DayState>;
    // يوم جديد (أو لا محفوظ) → نبدأ بقائمة فارغة
    if (parsed.date === today) {
        return { date: today, items: normalize(parsed.items) };
    }
    return { date: today, items: EMPTY.map((e) => ({ ...e })) };
}

const TopThreeTodayWidget: React.FC = () => {
    const [state, setState] = useWidgetContent<DayState>(STORAGE_KEY, parseDay);

    const setText = useCallback((idx: number, text: string) => {
        setState((s) => {
            const items = s.items.map((it, i) => (i === idx ? { ...it, text } : it));
            return { ...s, items };
        });
    }, []);

    const toggle = useCallback((idx: number) => {
        setState((s) => {
            const items = s.items.map((it, i) =>
                i === idx && it.text.trim() ? { ...it, done: !it.done } : it
            );
            return { ...s, items };
        });
    }, []);

    const { doneCount, allDone } = useMemo(() => {
        const f = state.items.filter((i) => i.text.trim()).length;
        const d = state.items.filter((i) => i.text.trim() && i.done).length;
        return { doneCount: d, allDone: f === 3 && d === 3 };
    }, [state.items]);

    const dateLabel = useMemo(() => {
        try {
            return new Intl.DateTimeFormat('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
        } catch {
            return '';
        }
    }, []);

    return (
        <div
            dir="rtl"
            style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}
        >
            <style>{`
                @keyframes t3w-pop { 0% { transform: scale(0); } 55% { transform: scale(1.2); } 100% { transform: scale(1); } }
                @keyframes t3w-rise { from { transform: translateY(4px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .t3w-check { animation: t3w-pop .26s cubic-bezier(.22,1.2,.36,1); }
                .t3w-banner { animation: t3w-rise .3s ease-out; }
                .t3w-strike { position: absolute; top: 50%; inset-inline-end: 0; height: 1.5px; width: 0; background: currentColor; opacity: .5; transition: width .3s ease; }
                .t3w-strike--on { width: 100%; }
                @media (prefers-reduced-motion: reduce) { .t3w-check, .t3w-banner { animation: none; } }
            `}</style>

            {/* رأس */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flex: '0 0 auto' }}>
                <Target size={15} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>أولويات اليوم</span>
                <span
                    style={{
                        marginInlineStart: 'auto',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: allDone ? 'var(--status-green, #16a34a)' : 'var(--color-text-secondary)',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {doneCount.toLocaleString('ar-SA')}/{(3).toLocaleString('ar-SA')}
                </span>
            </div>
            {dateLabel && (
                <div style={{ fontSize: '10px', color: 'var(--quiet-gray-400, #9ca3af)', marginBottom: '8px', flex: '0 0 auto' }}>
                    {dateLabel}
                </div>
            )}

            {/* الخانات الثلاث */}
            <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: '7px', justifyContent: 'center', minHeight: 0 }}>
                {state.items.map((item, idx) => {
                    const rank = RANKS[idx];
                    const hasText = item.text.trim().length > 0;
                    return (
                        <div
                            key={idx}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px',
                                borderRadius: '9px',
                                background: item.done ? 'var(--status-green-light, #dcfce7)' : 'var(--quiet-gray-100, #f3f4f6)',
                                transition: 'background .25s ease',
                            }}
                        >
                            {/* ميدالية المركز */}
                            <span
                                style={{
                                    flex: '0 0 auto',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: rank.bg,
                                    color: rank.fg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {(idx + 1).toLocaleString('ar-SA')}
                            </span>

                            {/* الحقل */}
                            <span style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                                <input
                                    className="lab-no-drag"
                                    value={item.text}
                                    onChange={(e) => setText(idx, e.target.value)}
                                    placeholder={`الأولوية ${(idx + 1).toLocaleString('ar-SA')}…`}
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        border: 'none',
                                        background: 'transparent',
                                        outline: 'none',
                                        fontSize: '12.5px',
                                        fontWeight: 600,
                                        fontFamily: 'inherit',
                                        color: item.done ? 'var(--quiet-gray-500, #6b7280)' : 'var(--color-heading)',
                                        padding: '2px 0',
                                    }}
                                />
                                <span className={`t3w-strike${item.done ? ' t3w-strike--on' : ''}`} style={{ color: 'var(--quiet-gray-500, #6b7280)' }} />
                            </span>

                            {/* زر الإنجاز */}
                            <button
                                className="lab-no-drag"
                                onClick={() => toggle(idx)}
                                disabled={!hasText}
                                title={item.done ? 'إلغاء الإنجاز' : 'تعليم كمنجز'}
                                style={{
                                    flex: '0 0 auto',
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '7px',
                                    cursor: hasText ? 'pointer' : 'default',
                                    border: item.done ? 'none' : '1.6px solid var(--quiet-gray-300, #d1d5db)',
                                    background: item.done ? 'var(--status-green, #16a34a)' : 'transparent',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                    opacity: hasText ? 1 : 0.5,
                                }}
                            >
                                {item.done && <Check size={13} strokeWidth={3} className="t3w-check" />}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* سطر تحفيزي عند إنجاز الثلاث */}
            {allDone && (
                <div
                    className="t3w-banner"
                    style={{
                        flex: '0 0 auto',
                        marginTop: '7px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        padding: '6px',
                        borderRadius: '8px',
                        background: 'var(--status-green-light, #dcfce7)',
                        color: 'var(--status-green, #16a34a)',
                        fontSize: '11.5px',
                        fontWeight: 700,
                    }}
                >
                    <Sparkles size={14} />
                    أنجزت أهم ثلاث أولويات لليوم
                </div>
            )}
        </div>
    );
};

export default TopThreeTodayWidget;
