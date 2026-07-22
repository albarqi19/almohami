import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCw, Pencil, X, Plus, Check } from 'lucide-react';

import { useWidgetContent } from '../../lab/widgetContent';

/**
 * DecisionWheelWidget — «عجلة القرار» (تجريبي، محلي بالكامل).
 * دولاب ملوّن (قطاعات SVG) بخيارات قابلة للتعديل؛ زر «أدِر» يدوّره بحركة
 * تباطؤ (transform) ويختار عشوائياً (Math.random) ويُظهر النتيجة تحت مؤشّر ثابت.
 *
 * الخيارات عبر useWidgetContent: داخل اللوح تُحفظ ضمن حالة اللوحة فتتزامن
 * عبر الخادم لكل مستخدم ولكل نسخة؛ خارجه (📌) يبقى localStorage.
 * أداة مساعدة على الحسم في القرارات الصغيرة — لا مصدر بيانات حقيقي.
 */

const STORAGE_KEY = 'lab_wheel_v1';
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 8;

const DEMO_OPTIONS: string[] = [
    'قهوة أولاً',
    'ابدأ بالأصعب',
    'اتصل بالعميل',
    'راجع المهام',
    'رتّب المكتب',
    'خذ استراحة',
];

// لوحة ألوان فلات تدور حسب موضع القطاع
const PALETTE = [
    '#1e2a4a', '#c9a227', '#16a34a', '#2563eb',
    '#ea580c', '#dc2626', '#0d9488', '#7c3aed',
];

const CX = 100;
const CY = 100;
const R = 96;

/** نقطة على المحيط بزاوية (بالدرجات) تُقاس من الأعلى وباتجاه عقارب الساعة. */
function polar(angleDeg: number): { x: number; y: number } {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: CX + R * Math.sin(rad), y: CY - R * Math.cos(rad) };
}

function slicePath(start: number, end: number): string {
    const s = polar(start);
    const e = polar(end);
    const large = end - start > 180 ? 1 : 0;
    return `M ${CX} ${CY} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`;
}

function parseOptions(raw: unknown): string[] {
    if (Array.isArray(raw)) {
        const clean = raw.filter((o): o is string => typeof o === 'string' && o.trim().length > 0);
        if (clean.length >= MIN_OPTIONS) return clean.slice(0, MAX_OPTIONS);
    }
    return DEMO_OPTIONS;
}

const DecisionWheelWidget: React.FC = () => {
    const [options, setOptions] = useWidgetContent<string[]>(STORAGE_KEY, parseOptions);
    const [rotation, setRotation] = useState<number>(0);
    const [spinning, setSpinning] = useState<boolean>(false);
    const [result, setResult] = useState<number | null>(null);
    const [editing, setEditing] = useState<boolean>(false);
    const [draft, setDraft] = useState<string>('');
    const timerRef = useRef<number | null>(null);

    const reduced = useMemo(
        () =>
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        []
    );
    const spinMs = reduced ? 500 : 4200;

    // تنظيف أي مؤقّت معلّق عند إزالة المكوّن
    useEffect(() => () => {
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    }, []);

    const n = options.length;
    const seg = 360 / n;

    const spin = useCallback(() => {
        if (spinning || n < MIN_OPTIONS) return;
        setResult(null);
        setSpinning(true);

        const winner = Math.floor(Math.random() * n);
        // نريد أن يقع مركز القطاع الفائز تحت المؤشّر (أعلى العجلة)
        const center = winner * seg + seg / 2;
        const targetMod = (360 - (center % 360) + 360) % 360;
        const spins = reduced ? 2 : 5;
        setRotation((prev) => prev - (((prev % 360) + 360) % 360) + spins * 360 + targetMod);

        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
            setResult(winner);
            setSpinning(false);
        }, spinMs + 60);
    }, [spinning, n, seg, reduced, spinMs]);

    const updateOption = useCallback((idx: number, value: string) => {
        setOptions((prev) => prev.map((o, i) => (i === idx ? value : o)));
        setResult(null);
    }, []);

    const removeOption = useCallback((idx: number) => {
        setOptions((prev) => (prev.length <= MIN_OPTIONS ? prev : prev.filter((_, i) => i !== idx)));
        setResult(null);
    }, []);

    const addOption = useCallback(() => {
        const t = draft.trim();
        if (!t) return;
        setOptions((prev) => (prev.length >= MAX_OPTIONS ? prev : [...prev, t]));
        setDraft('');
        setResult(null);
    }, [draft]);

    const clip = (s: string): string => (s.length > 8 ? `${s.slice(0, 7)}…` : s);

    return (
        <div
            dir="rtl"
            style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}
        >
            <style>{`
                @keyframes dww-reveal { from { transform: scale(.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .dww-result { animation: dww-reveal .3s cubic-bezier(.22,1.2,.36,1); }
                .dww-hub { transition: transform .12s ease; }
                .dww-hub:not(:disabled):hover { transform: scale(1.05); }
                .dww-hub:disabled { cursor: default; }
            `}</style>

            {/* رأس */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flex: '0 0 auto' }}>
                <RotateCw size={15} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>عجلة القرار</span>
                <button
                    className="lab-no-drag"
                    onClick={() => setEditing((e) => !e)}
                    title={editing ? 'تم' : 'تعديل الخيارات'}
                    style={{
                        marginInlineStart: 'auto',
                        border: 'none',
                        background: editing ? 'var(--law-navy, #1e2a4a)' : 'transparent',
                        color: editing ? '#fff' : 'var(--quiet-gray-400, #9ca3af)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '4px 8px',
                        borderRadius: '7px',
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: 'inherit',
                    }}
                >
                    {editing ? <Check size={13} /> : <Pencil size={13} />}
                    {editing ? 'تم' : 'تعديل'}
                </button>
            </div>

            {editing ? (
                /* لوحة تعديل الخيارات */
                <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {options.map((opt, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '11px', height: '11px', borderRadius: '3px', background: PALETTE[idx % PALETTE.length], flexShrink: 0 }} />
                            <input
                                className="lab-no-drag"
                                value={opt}
                                onChange={(e) => updateOption(idx, e.target.value)}
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    border: '1px solid var(--color-border, #e5e7eb)',
                                    borderRadius: '7px',
                                    padding: '6px 9px',
                                    fontSize: '12px',
                                    fontFamily: 'inherit',
                                    color: 'var(--color-heading)',
                                    background: 'var(--dashboard-card, #fff)',
                                    outline: 'none',
                                }}
                            />
                            <button
                                className="lab-no-drag"
                                onClick={() => removeOption(idx)}
                                disabled={n <= MIN_OPTIONS}
                                title="حذف"
                                style={{
                                    flex: '0 0 auto',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: n <= MIN_OPTIONS ? 'not-allowed' : 'pointer',
                                    color: n <= MIN_OPTIONS ? 'var(--quiet-gray-300, #d1d5db)' : 'var(--status-red, #dc2626)',
                                    display: 'flex',
                                    padding: '3px',
                                    borderRadius: '5px',
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                    {n < MAX_OPTIONS && (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                            <input
                                className="lab-no-drag"
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') addOption(); }}
                                placeholder="أضف خياراً…"
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    border: '1px solid var(--color-border, #e5e7eb)',
                                    borderRadius: '7px',
                                    padding: '6px 9px',
                                    fontSize: '12px',
                                    fontFamily: 'inherit',
                                    color: 'var(--color-heading)',
                                    background: 'var(--dashboard-card, #fff)',
                                    outline: 'none',
                                }}
                            />
                            <button
                                className="lab-no-drag"
                                onClick={addOption}
                                title="إضافة"
                                style={{
                                    flex: '0 0 auto',
                                    border: 'none',
                                    borderRadius: '7px',
                                    width: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    background: 'var(--law-navy, #1e2a4a)',
                                    color: '#fff',
                                }}
                            >
                                <Plus size={15} />
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* العجلة */}
                    <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
                        <div style={{ position: 'relative', width: '100%', maxWidth: '178px', aspectRatio: '1 / 1' }}>
                            {/* المؤشّر الثابت أعلى العجلة */}
                            <div
                                aria-hidden
                                style={{
                                    position: 'absolute',
                                    top: '-3px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: 0,
                                    height: 0,
                                    borderLeft: '8px solid transparent',
                                    borderRight: '8px solid transparent',
                                    borderTop: '13px solid var(--law-gold, #c9a227)',
                                    zIndex: 3,
                                    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.15))',
                                }}
                            />

                            {/* الدولاب الدوّار */}
                            <div
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    transform: `rotate(${rotation}deg)`,
                                    transition: `transform ${spinMs}ms cubic-bezier(.16,.62,.2,1)`,
                                    willChange: 'transform',
                                }}
                            >
                                <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', display: 'block' }} aria-label="عجلة القرار">
                                    {options.map((opt, i) => {
                                        const start = i * seg;
                                        const end = start + seg;
                                        const mid = start + seg / 2;
                                        const rad = (mid * Math.PI) / 180;
                                        const lr = R * 0.62;
                                        const lx = CX + lr * Math.sin(rad);
                                        const ly = CY - lr * Math.cos(rad);
                                        return (
                                            <g key={i}>
                                                <path
                                                    d={slicePath(start, end)}
                                                    fill={PALETTE[i % PALETTE.length]}
                                                    stroke="var(--dashboard-card, #ffffff)"
                                                    strokeWidth={1.5}
                                                />
                                                <text
                                                    x={lx}
                                                    y={ly}
                                                    fill="#ffffff"
                                                    fontSize="9"
                                                    fontWeight="700"
                                                    textAnchor="middle"
                                                    dominantBaseline="central"
                                                    transform={`rotate(${mid} ${lx.toFixed(2)} ${ly.toFixed(2)})`}
                                                >
                                                    {clip(opt)}
                                                </text>
                                            </g>
                                        );
                                    })}
                                    <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--law-navy, #1e2a4a)" strokeWidth={2} opacity={0.15} />
                                </svg>
                            </div>

                            {/* المحور/زر الإدارة الثابت في المنتصف */}
                            <button
                                className="dww-hub lab-no-drag"
                                onClick={spin}
                                disabled={spinning}
                                title="أدِر العجلة"
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '30%',
                                    maxWidth: '52px',
                                    aspectRatio: '1 / 1',
                                    borderRadius: '50%',
                                    border: '3px solid var(--dashboard-card, #fff)',
                                    background: 'var(--law-navy, #1e2a4a)',
                                    color: 'var(--law-gold, #c9a227)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '1px',
                                    zIndex: 2,
                                    padding: 0,
                                }}
                            >
                                <RotateCw size={15} style={{ opacity: spinning ? 0.5 : 1 }} />
                                <span style={{ fontSize: '9px', fontWeight: 800, color: '#fff' }}>أدِر</span>
                            </button>
                        </div>
                    </div>

                    {/* النتيجة */}
                    <div style={{ flex: '0 0 auto', marginTop: '6px', minHeight: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {spinning ? (
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--quiet-gray-400, #9ca3af)' }}>
                                يدور…
                            </span>
                        ) : result !== null && options[result] ? (
                            <div
                                className="dww-result"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 12px',
                                    borderRadius: '999px',
                                    background: 'var(--law-navy-light, #eef1f8)',
                                    maxWidth: '100%',
                                }}
                            >
                                <span
                                    style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '3px',
                                        background: PALETTE[result % PALETTE.length],
                                        flexShrink: 0,
                                    }}
                                />
                                <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>القرار</span>
                                <span
                                    style={{
                                        fontSize: '13px',
                                        fontWeight: 800,
                                        color: 'var(--law-navy, #1e2a4a)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {options[result]}
                                </span>
                            </div>
                        ) : (
                            <span style={{ fontSize: '11px', color: 'var(--quiet-gray-400, #9ca3af)' }}>
                                اضغط «أدِر» لاختيار قرار
                            </span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default DecisionWheelWidget;
