import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Timer, Hourglass, Plus, Minus } from 'lucide-react';

/**
 * StopwatchTimerWidget — مؤقّت عام بوضعين.
 *
 * ودجت أداة مكتفٍ ذاتياً بلا backend (Date + setInterval فقط):
 *   • ساعة إيقاف تصاعدية (تعرض العُشر أيضاً، والحلقة تكنس كل دقيقة).
 *   • عدّ تنازلي قابل للضبط بالدقائق (+1/+5 و−1، وقيم جاهزة)، والحلقة تُفرَّغ.
 * بدء/إيقاف مؤقت/تصفير، وعرض كبير MM:SS (أو H:MM:SS عند تجاوز الساعة).
 * التوقيت يُشتقّ من فروق Date.now لتفادي الانحراف؛ كل مؤقّت يُنظَّف في cleanup.
 */

type Mode = 'stopwatch' | 'countdown';

const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;
const MAX_CD_MS = 180 * 60 * 1000; // سقف 3 ساعات للعدّ التنازلي
const DEFAULT_CD_MS = 5 * 60 * 1000;
const PRESETS_MIN = [5, 15, 25] as const;

const pad2 = (n: number): string => n.toString().padStart(2, '0');

const fmt = (ms: number): { main: string; tenth: string } => {
    const totalMs = Math.max(0, ms);
    const totalSec = Math.floor(totalMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const tenth = Math.floor((totalMs % 1000) / 100).toString();
    const main = h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
    return { main, tenth };
};

const StopwatchTimerWidget: React.FC = () => {
    const [mode, setMode] = useState<Mode>('stopwatch');
    const [running, setRunning] = useState<boolean>(false);
    const [swElapsed, setSwElapsed] = useState<number>(0);
    const [cdTotal, setCdTotal] = useState<number>(DEFAULT_CD_MS);
    const [cdRemaining, setCdRemaining] = useState<number>(DEFAULT_CD_MS);
    const [finished, setFinished] = useState<boolean>(false);

    const lastTickRef = useRef<number>(0);

    // نبضة التوقيت — تُنظَّف دائماً في cleanup
    useEffect(() => {
        if (!running) return;
        lastTickRef.current = Date.now();
        const id = window.setInterval(() => {
            const now = Date.now();
            const delta = now - lastTickRef.current;
            lastTickRef.current = now;
            if (mode === 'stopwatch') {
                setSwElapsed((e) => e + delta);
            } else {
                setCdRemaining((r) => Math.max(0, r - delta));
            }
        }, 100);
        return () => window.clearInterval(id);
    }, [running, mode]);

    // بلوغ الصفر في العدّ التنازلي: توقّف + وميض «انتهى»
    useEffect(() => {
        if (mode === 'countdown' && running && cdRemaining <= 0) {
            setRunning(false);
            setFinished(true);
        }
    }, [cdRemaining, mode, running]);

    const switchMode = useCallback((next: Mode) => {
        setMode(next);
        setRunning(false);
        setFinished(false);
    }, []);

    const toggle = useCallback(() => {
        if (mode === 'countdown' && cdRemaining <= 0) return;
        setFinished(false);
        setRunning((r) => !r);
    }, [mode, cdRemaining]);

    const reset = useCallback(() => {
        setRunning(false);
        setFinished(false);
        if (mode === 'stopwatch') setSwElapsed(0);
        else setCdRemaining(cdTotal);
    }, [mode, cdTotal]);

    const addMinutes = useCallback((mins: number) => {
        setFinished(false);
        setCdTotal((t) => Math.min(MAX_CD_MS, Math.max(60 * 1000, t + mins * 60 * 1000)));
        setCdRemaining((r) => Math.min(MAX_CD_MS, Math.max(0, r + mins * 60 * 1000)));
    }, []);

    const setPreset = useCallback((mins: number) => {
        const ms = mins * 60 * 1000;
        setRunning(false);
        setFinished(false);
        setCdTotal(ms);
        setCdRemaining(ms);
    }, []);

    const displayMs = mode === 'stopwatch' ? swElapsed : cdRemaining;
    const { main, tenth } = useMemo(() => fmt(displayMs), [displayMs]);

    const fraction = useMemo(() => {
        if (mode === 'stopwatch') return (swElapsed % 60000) / 60000;
        return cdTotal > 0 ? Math.max(0, Math.min(1, cdRemaining / cdTotal)) : 0;
    }, [mode, swElapsed, cdRemaining, cdTotal]);

    const urgent = mode === 'countdown' && running && cdRemaining <= 10000 && cdRemaining > 0;
    const accent = finished
        ? 'var(--status-green, #16a34a)'
        : urgent
          ? 'var(--status-red, #dc2626)'
          : 'var(--law-gold, #c9a227)';
    const dashOffset = CIRC * (1 - fraction);

    const pill = (active: boolean): React.CSSProperties => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        border: `1px solid ${active ? 'var(--law-navy, #1e2a4a)' : 'var(--color-border, #e5e7eb)'}`,
        background: active ? 'var(--law-navy, #1e2a4a)' : 'transparent',
        color: active ? '#fff' : 'var(--color-text-secondary, #6b7280)',
        borderRadius: '8px',
        padding: '5px 11px',
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all .18s ease',
    });

    const chip: React.CSSProperties = {
        border: '1px solid var(--color-border, #e5e7eb)',
        background: 'var(--dashboard-card, #ffffff)',
        color: 'var(--law-navy, #1e2a4a)',
        borderRadius: '8px',
        padding: '4px 8px',
        fontSize: '11px',
        fontWeight: 700,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        fontVariantNumeric: 'tabular-nums',
    };

    return (
        <div
            dir="rtl"
            style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', gap: '9px', padding: '8px 6px' }}
        >
            <style>{`
                @keyframes swt-pop { 0% { transform: scale(1); } 40% { transform: scale(1.04); } 100% { transform: scale(1); } }
                @keyframes swt-flash { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
                .swt-run { animation: swt-pop 1s ease-in-out infinite; }
                .swt-flash { animation: swt-flash 1s ease-in-out infinite; }
                .swt-btn { transition: filter .15s ease, transform .1s ease; }
                .swt-btn:hover { filter: brightness(1.06); }
                .swt-btn:active { transform: translateY(1px); }
            `}</style>

            {/* مبدّل الوضع */}
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flex: '0 0 auto' }}>
                <button className="lab-no-drag swt-btn" style={pill(mode === 'stopwatch')} onClick={() => switchMode('stopwatch')}>
                    <Timer size={14} /> ساعة إيقاف
                </button>
                <button className="lab-no-drag swt-btn" style={pill(mode === 'countdown')} onClick={() => switchMode('countdown')}>
                    <Hourglass size={14} /> عدّ تنازلي
                </button>
            </div>

            {/* الحلقة + الزمن */}
            <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 0 }}>
                <svg viewBox="0 0 120 120" style={{ width: 'min(100%, 172px)', height: 'auto', aspectRatio: '1 / 1' }} aria-label="المؤقّت">
                    <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="var(--quiet-gray-100, #f3f4f6)" strokeWidth="8" />
                    <circle
                        cx="60"
                        cy="60"
                        r={RADIUS}
                        fill="none"
                        stroke={accent}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={CIRC}
                        strokeDashoffset={dashOffset}
                        transform="rotate(-90 60 60)"
                        style={{ transition: 'stroke-dashoffset .18s linear, stroke .25s ease' }}
                    />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                    <div
                        className={finished ? 'swt-flash' : running ? 'swt-run' : undefined}
                        style={{ display: 'flex', alignItems: 'baseline', gap: '2px', color: 'var(--color-heading, #1e2a4a)' }}
                    >
                        <span style={{ fontSize: 'clamp(26px, 8.5vw, 38px)', fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '1px', lineHeight: 1 }}>
                            {main}
                        </span>
                        {mode === 'stopwatch' && (
                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--law-gold, #c9a227)', fontVariantNumeric: 'tabular-nums', width: '10px' }}>
                                {tenth}
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: '11px', color: finished ? 'var(--status-green, #16a34a)' : 'var(--color-text-secondary, #6b7280)', fontWeight: 700 }}>
                        {finished ? 'انتهى الوقت' : mode === 'stopwatch' ? 'زمن منقضٍ' : 'الوقت المتبقّي'}
                    </div>
                </div>
            </div>

            {/* ضبط العدّ التنازلي */}
            {mode === 'countdown' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', flexWrap: 'wrap', flex: '0 0 auto' }}>
                    <button className="lab-no-drag swt-btn" style={chip} onClick={() => addMinutes(-1)} title="−١ دقيقة">
                        <Minus size={12} /> ١
                    </button>
                    <button className="lab-no-drag swt-btn" style={chip} onClick={() => addMinutes(1)} title="+١ دقيقة">
                        <Plus size={12} /> ١
                    </button>
                    <button className="lab-no-drag swt-btn" style={chip} onClick={() => addMinutes(5)} title="+٥ دقائق">
                        <Plus size={12} /> ٥
                    </button>
                    <span style={{ width: '1px', height: '16px', background: 'var(--color-border, #e5e7eb)' }} />
                    {PRESETS_MIN.map((p) => (
                        <button key={p} className="lab-no-drag swt-btn" style={chip} onClick={() => setPreset(p)} title={`${p} دقيقة`}>
                            {p}د
                        </button>
                    ))}
                </div>
            )}

            {/* التحكّم */}
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flex: '0 0 auto' }}>
                <button
                    className="lab-no-drag swt-btn"
                    onClick={toggle}
                    disabled={mode === 'countdown' && cdRemaining <= 0}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: 'none',
                        background: 'var(--law-navy, #1e2a4a)',
                        color: '#fff',
                        borderRadius: '8px',
                        padding: '8px 18px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: mode === 'countdown' && cdRemaining <= 0 ? 'not-allowed' : 'pointer',
                        opacity: mode === 'countdown' && cdRemaining <= 0 ? 0.5 : 1,
                    }}
                >
                    {running ? <Pause size={15} /> : <Play size={15} />}
                    {running ? 'إيقاف' : 'بدء'}
                </button>
                <button
                    className="lab-no-drag swt-btn"
                    onClick={reset}
                    title="تصفير"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        border: '1px solid var(--color-border, #e5e7eb)',
                        background: 'var(--dashboard-card, #ffffff)',
                        color: 'var(--color-text-secondary, #6b7280)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                    }}
                >
                    <RotateCcw size={15} />
                </button>
            </div>
        </div>
    );
};

export default StopwatchTimerWidget;
