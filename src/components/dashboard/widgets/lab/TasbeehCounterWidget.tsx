import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Repeat } from 'lucide-react';

import { useWidgetContent } from '../../lab/widgetContent';

/**
 * TasbeehCounterWidget — مسبحة رقمية راقية.
 *
 * ودجت مكتفٍ ذاتياً بلا backend:
 *   • عدّاد كبير يُنقر للزيادة مع نبضة لطيفة، وحلقة تقدّم نحو الهدف.
 *   • أهداف 33/99/100 مع وميض ذهبي واهتزاز (navigator.vibrate إن توفّر) عند البلوغ.
 *   • اختيار الذكر: سبحان الله / الحمد لله / الله أكبر، وزر تصفير.
 * الحالة عبر useWidgetContent: داخل اللوح تُحفظ ضمن حالة اللوحة فتتزامن عبر
 * الخادم لكل مستخدم ولكل نسخة؛ خارجه (📌) localStorage. كل مؤقّت يُنظَّف في cleanup.
 */

type DhikrKey = 'subhan' | 'hamd' | 'akbar';

const DHIKR: Record<DhikrKey, string> = {
    subhan: 'سُبْحَانَ اللَّه',
    hamd: 'الْحَمْدُ لِلَّه',
    akbar: 'اللَّهُ أَكْبَر',
};
const DHIKR_ORDER: DhikrKey[] = ['subhan', 'hamd', 'akbar'];
const GOALS = [33, 99, 100] as const;
const STORAGE_KEY = 'lab_tasbeeh_v1';

const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;

interface Stored {
    dhikr: DhikrKey;
    goal: number;
    count: number;
    laps: number;
}

const parseStored = (raw: unknown): Stored => {
    const p = (raw || {}) as Partial<Stored>;
    const dhikr: DhikrKey = p.dhikr === 'hamd' || p.dhikr === 'akbar' || p.dhikr === 'subhan' ? p.dhikr : 'subhan';
    const goal = p.goal === 33 || p.goal === 99 || p.goal === 100 ? p.goal : 33;
    return {
        dhikr,
        goal,
        count: typeof p.count === 'number' && p.count >= 0 ? p.count : 0,
        laps: typeof p.laps === 'number' && p.laps >= 0 ? p.laps : 0,
    };
};

const TasbeehCounterWidget: React.FC = () => {
    const [stored, setStored] = useWidgetContent<Stored>(STORAGE_KEY, parseStored);
    const { dhikr, goal, count, laps } = stored;
    const setDhikr = useCallback((d: DhikrKey) => setStored((p) => ({ ...p, dhikr: d })), [setStored]);
    const setGoal = useCallback((g: number) => setStored((p) => ({ ...p, goal: g })), [setStored]);
    const [flash, setFlash] = useState<boolean>(false);
    const flashTimer = useRef<number | null>(null);

    // تنظيف مؤقّت الوميض عند إلغاء التركيب
    useEffect(() => {
        return () => {
            if (flashTimer.current) window.clearTimeout(flashTimer.current);
        };
    }, []);

    const tap = useCallback(() => {
        setStored((p) => {
            const next = p.count + 1;
            const lapDone = next % p.goal === 0;
            if (lapDone) {
                setFlash(true);
                if (flashTimer.current) window.clearTimeout(flashTimer.current);
                flashTimer.current = window.setTimeout(() => setFlash(false), 700);
                try {
                    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                        navigator.vibrate([30, 40, 60]);
                    }
                } catch {
                    /* تجاهُل */
                }
            }
            return { ...p, count: next, laps: lapDone ? p.laps + 1 : p.laps };
        });
    }, [setStored]);

    const reset = useCallback(() => {
        setStored((p) => ({ ...p, count: 0, laps: 0 }));
        setFlash(false);
    }, [setStored]);

    const inGoal = ((count % goal) + goal) % goal;
    const shown = count > 0 && inGoal === 0 ? goal : inGoal;
    const fraction = shown / goal;
    const offset = CIRC * (1 - fraction);

    const pill = (active: boolean): React.CSSProperties => ({
        border: `1px solid ${active ? 'var(--law-gold, #c9a227)' : 'var(--color-border, #e5e7eb)'}`,
        background: active ? 'var(--law-gold, #c9a227)' : 'transparent',
        color: active ? '#fff' : 'var(--color-text-secondary, #6b7280)',
        borderRadius: '7px',
        padding: '4px 9px',
        fontSize: '11px',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all .18s ease',
        fontVariantNumeric: 'tabular-nums',
    });

    return (
        <div
            dir="rtl"
            style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', gap: '8px', padding: '9px 7px' }}
        >
            <style>{`
                @keyframes tsb-pop { 0% { transform: scale(1); } 45% { transform: scale(1.06); } 100% { transform: scale(1); } }
                @keyframes tsb-flash { 0%,100% { box-shadow: 0 0 0 0 rgba(201,162,39,0); } 50% { box-shadow: 0 0 0 8px rgba(201,162,39,.28); } }
                .tsb-pop { animation: tsb-pop .18s ease; }
                .tsb-flash { animation: tsb-flash .7s ease-in-out; }
                .tsb-tap { transition: transform .08s ease, background .2s ease; -webkit-tap-highlight-color: transparent; user-select: none; }
                .tsb-tap:active { transform: scale(.975); }
                .tsb-btn { transition: filter .15s ease, transform .1s ease; }
                .tsb-btn:hover { filter: brightness(1.05); }
            `}</style>

            {/* الذكر + الهدف */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flex: '0 0 auto', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {DHIKR_ORDER.map((k) => (
                        <button key={k} className="lab-no-drag tsb-btn" style={pill(dhikr === k)} onClick={() => setDhikr(k)}>
                            {k === 'subhan' ? 'سبحان الله' : k === 'hamd' ? 'الحمد لله' : 'الله أكبر'}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {GOALS.map((g) => (
                        <button key={g} className="lab-no-drag tsb-btn" style={pill(goal === g)} onClick={() => setGoal(g)} title={`هدف ${g}`}>
                            {g}
                        </button>
                    ))}
                </div>
            </div>

            {/* دائرة النقر */}
            <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 0 }}>
                <div
                    className={`lab-no-drag tsb-tap${flash ? ' tsb-flash' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={tap}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            tap();
                        }
                    }}
                    style={{
                        position: 'relative',
                        width: 'min(100%, 168px)',
                        aspectRatio: '1 / 1',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--law-navy-light, #eef1f8)',
                    }}
                >
                    <svg viewBox="0 0 120 120" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
                        <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="var(--dashboard-card, #ffffff)" strokeWidth="7" />
                        <circle
                            cx="60"
                            cy="60"
                            r={RADIUS}
                            fill="none"
                            stroke="var(--law-gold, #c9a227)"
                            strokeWidth="7"
                            strokeLinecap="round"
                            strokeDasharray={CIRC}
                            strokeDashoffset={offset}
                            transform="rotate(-90 60 60)"
                            style={{ transition: 'stroke-dashoffset .3s cubic-bezier(.34,1.1,.4,1)' }}
                        />
                    </svg>
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', pointerEvents: 'none' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--law-gold, #c9a227)', lineHeight: 1 }}>{DHIKR[dhikr]}</span>
                        <span
                            key={count}
                            className="tsb-pop"
                            style={{ fontSize: 'clamp(32px, 11vw, 46px)', fontWeight: 800, color: 'var(--color-heading, #1e2a4a)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}
                        >
                            {shown}
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'var(--color-text-secondary, #6b7280)', fontWeight: 600 }}>من {goal} — انقر للتسبيح</span>
                    </div>
                </div>
            </div>

            {/* السفلي: الدورات + التصفير */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flex: '0 0 auto' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--color-text-secondary, #6b7280)', fontWeight: 700 }}>
                    <Repeat size={13} style={{ color: 'var(--law-gold, #c9a227)' }} />
                    الدورات: <span style={{ color: 'var(--law-navy, #1e2a4a)', fontVariantNumeric: 'tabular-nums' }}>{laps}</span>
                    <span style={{ color: 'var(--quiet-gray-400, #9ca3af)' }}>· الإجمالي {count}</span>
                </span>
                <button
                    className="lab-no-drag tsb-btn"
                    onClick={reset}
                    title="تصفير"
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        border: '1px solid var(--color-border, #e5e7eb)', background: 'var(--dashboard-card, #fff)',
                        color: 'var(--color-text-secondary, #6b7280)', borderRadius: '8px', padding: '5px 11px',
                        fontSize: '11.5px', fontWeight: 700, cursor: 'pointer',
                    }}
                >
                    <RotateCcw size={13} /> تصفير
                </button>
            </div>
        </div>
    );
};

export default TasbeehCounterWidget;
