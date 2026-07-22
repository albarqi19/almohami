import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Wind } from 'lucide-react';

/**
 * BreathingWidget — تمرين تنفّس هادئ لكسر ضغط العمل.
 *
 * دائرة تتّسع وتنكمش بحركة CSS (@keyframes) بدورة 10 ثوانٍ:
 *   شهيق 4ث (توسّع) → حبس 2ث (ثبات) → زفير 4ث (انكماش).
 * النص الإرشادي يُشتقّ من زمن البدء ذاته ليبقى متزامناً مع الحركة تماماً.
 * ودجت «عرض بحت» بلا أي backend.
 */

type Phase = 'inhale' | 'hold' | 'exhale';

const CYCLE_MS = 10000;
const PHASE_LABEL: Record<Phase, string> = {
    inhale: 'شهيق…',
    hold: 'احبس…',
    exhale: 'زفير…',
};

const phaseAt = (elapsed: number): Phase => {
    const t = elapsed % CYCLE_MS;
    if (t < 4000) return 'inhale';
    if (t < 6000) return 'hold';
    return 'exhale';
};

const BreathingWidget: React.FC = () => {
    const [running, setRunning] = useState(false);
    const [phase, setPhase] = useState<Phase>('inhale');
    const startRef = useRef<number>(0);
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (running) {
            startRef.current = Date.now();
            setPhase('inhale');
            intervalRef.current = window.setInterval(() => {
                setPhase(phaseAt(Date.now() - startRef.current));
            }, 120);
        }
        return () => {
            if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [running]);

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                padding: '6px',
            }}
        >
            <style>{`
                @keyframes bre-breathe {
                    0%   { transform: scale(0.5); }
                    40%  { transform: scale(1);   }
                    60%  { transform: scale(1);   }
                    100% { transform: scale(0.5); }
                }
                .bre-ring {
                    position: relative;
                    width: min(46%, 120px);
                    aspect-ratio: 1 / 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    border: 1px solid var(--color-border, #e5e7eb);
                }
                .bre-orb {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background: var(--law-navy-light, #eef1f8);
                    border: 2px solid var(--law-gold, #c9a227);
                    box-sizing: border-box;
                    transform: scale(0.5);
                    will-change: transform;
                }
                .bre-orb.bre-run {
                    animation: bre-breathe 10s ease-in-out infinite;
                }
                .bre-label {
                    position: absolute;
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--law-navy, #1e2a4a);
                    pointer-events: none;
                }
            `}</style>

            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--law-gold, #c9a227)',
                }}
            >
                <Wind size={14} />
                خذ نفَساً
            </span>

            <div className="bre-ring">
                <div className={running ? 'bre-orb bre-run' : 'bre-orb'} />
                <span className="bre-label">{running ? PHASE_LABEL[phase] : 'استعد'}</span>
            </div>

            <button
                type="button"
                className="lab-no-drag"
                onClick={() => setRunning((r) => !r)}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#fff',
                    background: running ? 'var(--quiet-gray-500, #6b7280)' : 'var(--law-navy, #1e2a4a)',
                    transition: 'background 0.2s ease',
                }}
            >
                {running ? <Pause size={14} /> : <Play size={14} />}
                {running ? 'إيقاف' : 'ابدأ'}
            </button>
        </div>
    );
};

export default BreathingWidget;
