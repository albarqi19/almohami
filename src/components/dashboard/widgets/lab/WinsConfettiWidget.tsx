import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trophy, Plus, Sparkles, Star } from 'lucide-react';

import { useWidgetContent } from '../../lab/widgetContent';

/**
 * WinsConfettiWidget — سجلّ الإنجازات مع احتفال قصير.
 *
 * يسجّل المستخدم إنجازاً فتنطلق قصاصات confetti بحركة CSS خفيفة
 * (transform/opacity فقط) ثم تُزال بعد انتهائها مع تنظيف المؤقّت.
 * الإنجازات عبر useWidgetContent: داخل اللوح تُحفظ ضمن حالة اللوحة فتتزامن
 * عبر الخادم لكل مستخدم ولكل نسخة؛ خارجه (📌) يبقى localStorage.
 */

interface Win {
    text: string;
    ts: number;
}

interface Confetto {
    id: number;
    left: number;
    delay: number;
    dur: number;
    color: string;
    rot: number;
    size: number;
}

const STORAGE_KEY = 'lab_wins_v1';
const MAX_STORED = 40;
const CONFETTI_COUNT = 24;
const BURST_MS = 1800;

const COLORS = [
    'var(--law-gold, #c9a227)',
    'var(--law-navy, #1e2a4a)',
    'var(--status-green, #16a34a)',
    '#2563eb',
    '#ea580c',
];

// لا إنجازات وهمية — يبدأ فارغاً (قرار المالك 2026-07-22)
const SEED: Win[] = [];

const parseWins = (raw: unknown): Win[] => {
    if (Array.isArray(raw)) {
        return raw
            .filter((w): w is Win => !!w && typeof (w as Win).text === 'string' && typeof (w as Win).ts === 'number')
            .slice(0, MAX_STORED);
    }
    return SEED;
};

const timeFmt = new Intl.DateTimeFormat('ar-SA', { hour: 'numeric', minute: '2-digit' });

const makeBurst = (seed: number): Confetto[] =>
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        id: seed + i,
        left: Math.round(Math.random() * 96) + 2,
        delay: Math.round(Math.random() * 220),
        dur: 1100 + Math.round(Math.random() * 500),
        color: COLORS[i % COLORS.length],
        rot: Math.round(Math.random() * 360),
        size: 6 + Math.round(Math.random() * 5),
    }));

const WinsConfettiWidget: React.FC = () => {
    const [wins, setWins] = useWidgetContent<Win[]>(STORAGE_KEY, parseWins);
    const [draft, setDraft] = useState<string>('');
    const [confetti, setConfetti] = useState<Confetto[]>([]);
    const burstTimer = useRef<number | null>(null);

    // تنظيف مؤقّت الاحتفال عند إلغاء التركيب
    useEffect(() => {
        return () => {
            if (burstTimer.current) window.clearTimeout(burstTimer.current);
        };
    }, []);

    const celebrate = useCallback(() => {
        setConfetti(makeBurst(Date.now()));
        if (burstTimer.current) window.clearTimeout(burstTimer.current);
        burstTimer.current = window.setTimeout(() => setConfetti([]), BURST_MS);
    }, []);

    const add = useCallback(() => {
        const text = draft.trim();
        if (!text) return;
        setWins((prev) => [{ text, ts: Date.now() }, ...prev].slice(0, MAX_STORED));
        setDraft('');
        celebrate();
    }, [draft, celebrate]);

    const recent = useMemo(() => wins.slice(0, 4), [wins]);

    return (
        <div
            dir="rtl"
            style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', gap: '9px', padding: '10px 9px', overflow: 'hidden' }}
        >
            <style>{`
                @keyframes wcf-fall {
                    0%   { transform: translate3d(0, -14%, 0) rotate(0deg); opacity: 0; }
                    12%  { opacity: 1; }
                    100% { transform: translate3d(0, 260%, 0) rotate(320deg); opacity: 0; }
                }
                @keyframes wcf-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
                .wcf-piece { position: absolute; top: 0; will-change: transform, opacity; }
                .wcf-card { animation: wcf-in .28s ease; }
                .wcf-btn { transition: filter .15s ease, transform .1s ease; }
                .wcf-btn:hover { filter: brightness(1.06); }
                .wcf-btn:active { transform: translateY(1px); }
                .wcf-input::placeholder { color: var(--law-navy, #1e2a4a); opacity: .4; }
            `}</style>

            {/* طبقة القصاصات */}
            <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 5 }}>
                {confetti.map((c) => (
                    <span
                        key={c.id}
                        className="wcf-piece"
                        style={{
                            left: `${c.left}%`,
                            width: `${c.size}px`,
                            height: `${c.size + 3}px`,
                            background: c.color,
                            borderRadius: '2px',
                            transform: `rotate(${c.rot}deg)`,
                            animation: `wcf-fall ${c.dur}ms cubic-bezier(.3,.6,.5,1) ${c.delay}ms forwards`,
                        }}
                    />
                ))}
            </div>

            {/* العنوان */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '0 0 auto', position: 'relative', zIndex: 1 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '8px', background: 'var(--law-navy-light, #eef1f8)' }}>
                    <Trophy size={15} style={{ color: 'var(--law-gold, #c9a227)' }} />
                </span>
                <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-heading, #1e2a4a)', lineHeight: 1.1 }}>سجلّ الإنجازات</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--color-text-secondary, #6b7280)' }}>احتفِ بكل خطوة</div>
                </div>
            </div>

            {/* حقل الإدخال */}
            <div
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto', position: 'relative', zIndex: 1,
                    background: 'var(--quiet-gray-100, #f3f4f6)', border: '1px solid var(--color-border, #e5e7eb)',
                    borderRadius: '10px', padding: '5px 6px 5px 10px',
                }}
            >
                <Star size={14} style={{ color: 'var(--law-gold, #c9a227)', flex: '0 0 auto' }} />
                <input
                    className="lab-no-drag wcf-input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') add();
                    }}
                    placeholder="…سجّل إنجازاً حقّقته"
                    maxLength={120}
                    style={{
                        flex: '1 1 auto', minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
                        color: 'var(--color-heading, #1e2a4a)', fontSize: '12.5px', fontWeight: 600,
                    }}
                />
                <button
                    className="lab-no-drag wcf-btn"
                    onClick={add}
                    disabled={!draft.trim()}
                    title="تسجيل"
                    style={{
                        flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: '4px',
                        borderRadius: '8px', border: 'none', padding: '6px 11px', fontSize: '12px', fontWeight: 700,
                        background: draft.trim() ? 'var(--law-navy, #1e2a4a)' : 'var(--quiet-gray-300, #d1d5db)',
                        color: '#fff', cursor: draft.trim() ? 'pointer' : 'not-allowed',
                    }}
                >
                    <Plus size={14} /> سجّل
                </button>
            </div>

            {/* آخر الإنجازات */}
            <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative', zIndex: 1 }}>
                {recent.length === 0 ? (
                    <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--quiet-gray-400, #9ca3af)' }}>
                        <Sparkles size={22} />
                        <span style={{ fontSize: '11.5px' }}>لا إنجازات بعد — سجّل أولها!</span>
                    </div>
                ) : (
                    recent.map((w) => (
                        <div
                            key={w.ts}
                            className="wcf-card"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'var(--dashboard-card, #ffffff)', border: '1px solid var(--color-border, #e5e7eb)',
                                borderInlineStart: '3px solid var(--law-gold, #c9a227)', borderRadius: '9px', padding: '8px 10px',
                            }}
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '6px', background: 'var(--status-green-light, #dcfce7)', flex: '0 0 auto' }}>
                                <Trophy size={12} style={{ color: 'var(--status-green, #16a34a)' }} />
                            </span>
                            <span style={{ flex: '1 1 auto', minWidth: 0, fontSize: '12.5px', fontWeight: 600, color: 'var(--color-heading, #1e2a4a)', lineHeight: 1.4 }}>{w.text}</span>
                            <span style={{ flex: '0 0 auto', fontSize: '10px', color: 'var(--quiet-gray-400, #9ca3af)', fontVariantNumeric: 'tabular-nums' }}>{timeFmt.format(new Date(w.ts))}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default WinsConfettiWidget;
