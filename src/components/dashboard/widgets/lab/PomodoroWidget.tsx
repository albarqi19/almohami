import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Brain, Coffee } from 'lucide-react';

import { useWidgetContent } from '../../lab/widgetContent';

/**
 * PomodoroWidget — مؤقّت تركيز «بومودورو».
 *
 * ودجت أداة مكتفٍ ذاتياً بلا backend: يعتمد فقط على setInterval + Date.
 * حلقة SVG كبيرة تُفرَّغ تدريجياً (stroke-dashoffset)، وضعان قابلان للتبديل
 * («تركيز 25د» / «راحة 5د»)، بدء/إيقاف مؤقت/تصفير، وعدّاد جلسات مكتملة اليوم.
 * عدّاد الجلسات المكتملة يُصفَّر تلقائياً مع تغيّر اليوم، ويُحفظ عبر
 * useWidgetContent (داخل اللوح يتزامن مع الخادم؛ خارجه 📌 localStorage).
 */

type Mode = 'focus' | 'break';

const STORAGE_KEY = 'lab_pomodoro_v1';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const pad2 = (n: number): string => n.toString().padStart(2, '0');
const todayKey = (): string => new Date().toISOString().slice(0, 10);

interface StoredState {
    date: string;
    completed: number;
}

const parseStored = (raw: unknown): StoredState => {
    const p = (raw || {}) as Partial<StoredState>;
    const completed = p.date === todayKey() && typeof p.completed === 'number' ? p.completed : 0;
    return { date: todayKey(), completed };
};

/** 🎛️ workMin/breakMin من خصائص الودجت (الترس) — الافتراضي 25/5 الكلاسيكي. */
const PomodoroWidget: React.FC<{ workMin?: number; breakMin?: number }> = ({ workMin, breakMin }) => {
    const focusSeconds = Math.max(1, Number(workMin) || 25) * 60;
    const breakSeconds = Math.max(1, Number(breakMin) || 5) * 60;

    const [mode, setMode] = useState<Mode>('focus');
    const [secondsLeft, setSecondsLeft] = useState<number>(focusSeconds);
    const [running, setRunning] = useState<boolean>(false);
    const [stored, setStored] = useWidgetContent<StoredState>(STORAGE_KEY, parseStored);
    const completed = stored.completed;
    const intervalRef = useRef<number | null>(null);

    const total = mode === 'focus' ? focusSeconds : breakSeconds;

    // تغيّرت المدد من الخصائص والمؤقّت متوقف → إعادة ضبط الوضع الحالي بالمدة الجديدة
    useEffect(() => {
        if (!running) setSecondsLeft(mode === 'focus' ? focusSeconds : breakSeconds);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusSeconds, breakSeconds]);
    const accent = mode === 'focus' ? 'var(--law-gold, #c9a227)' : 'var(--status-green, #16a34a)';

    // نبضة العدّاد (تحديث كل ثانية) — تُنظَّف في cleanup
    useEffect(() => {
        if (!running) return;
        intervalRef.current = window.setInterval(() => {
            setSecondsLeft((s) => s - 1);
        }, 1000);
        return () => {
            if (intervalRef.current) window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        };
    }, [running]);

    // عند بلوغ الصفر: نوقف، نزيد الجلسات المكتملة (في وضع التركيز)، ونبدّل الوضع
    useEffect(() => {
        if (secondsLeft > 0) return;
        setRunning(false);
        const finishedFocus = mode === 'focus';
        if (finishedFocus) {
            setStored((p) => ({
                date: todayKey(),
                completed: (p.date === todayKey() ? p.completed : 0) + 1,
            }));
        }
        const nextMode: Mode = finishedFocus ? 'break' : 'focus';
        setMode(nextMode);
        setSecondsLeft(nextMode === 'focus' ? focusSeconds : breakSeconds);
    }, [secondsLeft, mode, focusSeconds, breakSeconds]);

    const switchMode = useCallback((next: Mode) => {
        setMode(next);
        setRunning(false);
        setSecondsLeft(next === 'focus' ? focusSeconds : breakSeconds);
    }, [focusSeconds, breakSeconds]);

    const reset = useCallback(() => {
        setRunning(false);
        setSecondsLeft(mode === 'focus' ? focusSeconds : breakSeconds);
    }, [mode, focusSeconds, breakSeconds]);

    const label = useMemo(() => {
        const m = Math.max(0, Math.floor(secondsLeft / 60));
        const s = Math.max(0, secondsLeft % 60);
        return `${pad2(m)}:${pad2(s)}`;
    }, [secondsLeft]);

    // الحلقة تُفرَّغ: كامل عند البداية، فارغة عند الصفر
    const fraction = Math.max(0, Math.min(1, secondsLeft / total));
    const dashOffset = CIRCUMFERENCE * (1 - fraction);

    const pillStyle = (active: boolean): React.CSSProperties => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        border: `1px solid ${active ? accent : 'var(--color-border, #e5e7eb)'}`,
        background: active ? accent : 'transparent',
        color: active ? '#fff' : 'var(--color-text-secondary, #6b7280)',
        borderRadius: '8px',
        padding: '5px 10px',
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    });

    return (
        <div
            dir="rtl"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                gap: '10px',
                padding: '8px 6px',
            }}
        >
            <style>{`
                @keyframes pmd-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.03); } }
                .pmd-breathe { animation: pmd-breathe 3.2s ease-in-out infinite; }
                .pmd-btn { transition: filter .15s ease, transform .12s ease; }
                .pmd-btn:hover { filter: brightness(1.06); }
                .pmd-btn:active { transform: translateY(1px); }
            `}</style>

            {/* مبدّل الوضع */}
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flex: '0 0 auto' }}>
                <button className="lab-no-drag pmd-btn" style={pillStyle(mode === 'focus')} onClick={() => switchMode('focus')}>
                    <Brain size={14} /> تركيز
                </button>
                <button className="lab-no-drag pmd-btn" style={pillStyle(mode === 'break')} onClick={() => switchMode('break')}>
                    <Coffee size={14} /> راحة
                </button>
            </div>

            {/* الحلقة + العدّاد */}
            <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 0 }}>
                <svg viewBox="0 0 120 120" style={{ width: 'min(100%, 180px)', height: 'auto', aspectRatio: '1 / 1' }} aria-label="مؤقّت بومودورو">
                    <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="var(--quiet-gray-100, #f3f4f6)" strokeWidth="8" />
                    <circle
                        cx="60"
                        cy="60"
                        r={RADIUS}
                        fill="none"
                        stroke={accent}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={dashOffset}
                        transform="rotate(-90 60 60)"
                        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.25s ease' }}
                    />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                    <div
                        className={running ? 'pmd-breathe' : undefined}
                        style={{
                            fontSize: 'clamp(26px, 9vw, 38px)',
                            fontWeight: 800,
                            color: 'var(--color-heading, #1e2a4a)',
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: '1px',
                            lineHeight: 1,
                        }}
                    >
                        {label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary, #6b7280)', fontWeight: 600 }}>
                        {mode === 'focus' ? 'وقت التركيز' : 'استراحة قصيرة'}
                    </div>
                </div>
            </div>

            {/* الأزرار + عدّاد الجلسات */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: '0 0 auto', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                        className="lab-no-drag pmd-btn"
                        onClick={() => setRunning((r) => !r)}
                        title={running ? 'إيقاف مؤقت' : 'بدء'}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            border: 'none',
                            background: 'var(--law-navy, #1e2a4a)',
                            color: '#fff',
                            borderRadius: '8px',
                            padding: '7px 14px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        {running ? <Pause size={15} /> : <Play size={15} />}
                        {running ? 'إيقاف' : 'بدء'}
                    </button>
                    <button
                        className="lab-no-drag pmd-btn"
                        onClick={reset}
                        title="تصفير"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            border: '1px solid var(--color-border, #e5e7eb)',
                            background: 'var(--dashboard-card, #ffffff)',
                            color: 'var(--color-text-secondary, #6b7280)',
                            borderRadius: '8px',
                            padding: '7px 10px',
                            cursor: 'pointer',
                        }}
                    >
                        <RotateCcw size={15} />
                    </button>
                </div>
                <div style={{ textAlign: 'center', lineHeight: 1.1 }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums' }}>{completed}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-secondary, #6b7280)' }}>جلسة مكتملة</div>
                </div>
            </div>
        </div>
    );
};

export default PomodoroWidget;
