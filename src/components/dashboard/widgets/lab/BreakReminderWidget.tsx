import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Droplet, Plus, Minus, Bell, Check, Coffee } from 'lucide-react';

import { useWidgetContent } from '../../lab/widgetContent';

/**
 * BreakReminderWidget — متتبّع صحّي للماء والاستراحات.
 *
 * ودجت مكتفٍ ذاتياً بلا backend:
 *   • عدّاد أكواب الماء (+/−) بهدف يومي 8 وحلقة تقدّم؛ يُصفَّر تلقائياً مع
 *     تغيّر اليوم ويُحفظ عبر useWidgetContent (داخل اللوح يتزامن مع الخادم؛
 *     خارجه 📌 localStorage).
 *   • مؤقّت «استراحة كل X دقيقة» بعدّ تنازلي، وعند انتهائه تنبيه بصري لطيف
 *     (نبض أخضر هادئ) حتى يضغط المستخدم «تمّت الاستراحة».
 * كل مؤقّت يُنظَّف في cleanup. البيانات الحقيقية لاحقاً يمكن ربطها بتفضيلات
 * المستخدم (نطاق المستخدم) عبر endpoint بسيط بدل التخزين المحلي.
 */

const WATER_GOAL = 8;
const RADIUS = 34;
const CIRC = 2 * Math.PI * RADIUS;
const INTERVAL_OPTIONS = [30, 45, 60] as const;
const STORAGE_KEY = 'lab_break_v1';

const todayKey = (): string => new Date().toISOString().slice(0, 10);
const pad2 = (n: number): string => n.toString().padStart(2, '0');

interface Stored {
    date: string;
    cups: number;
    intervalMin: number;
}

const parseStored = (raw: unknown): Stored => {
    const p = (raw || {}) as Partial<Stored>;
    const cups = p.date === todayKey() && typeof p.cups === 'number' ? p.cups : 0;
    const intervalMin =
        p.intervalMin === 30 || p.intervalMin === 45 || p.intervalMin === 60 ? p.intervalMin : 45;
    return { date: todayKey(), cups, intervalMin };
};

const BreakReminderWidget: React.FC = () => {
    const [stored, setStored] = useWidgetContent<Stored>(STORAGE_KEY, parseStored);
    const { cups, intervalMin } = stored;
    const setCups = useCallback(
        (updater: (c: number) => number) =>
            setStored((p) => ({ ...p, date: todayKey(), cups: updater(p.date === todayKey() ? p.cups : 0) })),
        [setStored]
    );
    const [remaining, setRemaining] = useState<number>(stored.intervalMin * 60);
    const [running, setRunning] = useState<boolean>(true);
    const [due, setDue] = useState<boolean>(false);
    const lastTickRef = useRef<number>(0);

    // نبضة العدّ التنازلي للاستراحة — تُنظَّف في cleanup
    useEffect(() => {
        if (!running || due) return;
        lastTickRef.current = Date.now();
        const id = window.setInterval(() => {
            const now = Date.now();
            const delta = Math.round((now - lastTickRef.current) / 1000);
            if (delta < 1) return;
            lastTickRef.current = now;
            setRemaining((r) => Math.max(0, r - delta));
        }, 500);
        return () => window.clearInterval(id);
    }, [running, due]);

    // بلوغ الصفر → حالة التنبيه
    useEffect(() => {
        if (running && !due && remaining <= 0) setDue(true);
    }, [remaining, running, due]);

    const pickInterval = useCallback((mins: number) => {
        setStored((p) => ({ ...p, date: todayKey(), intervalMin: mins }));
        setDue(false);
        setRemaining(mins * 60);
    }, [setStored]);

    const ackBreak = useCallback(() => {
        setDue(false);
        setRemaining(intervalMin * 60);
    }, [intervalMin]);

    const timeLabel = useMemo(() => {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        return `${pad2(m)}:${pad2(s)}`;
    }, [remaining]);

    const waterPct = Math.min(1, cups / WATER_GOAL);
    const waterColor = cups >= WATER_GOAL ? 'var(--status-green, #16a34a)' : '#2563eb';
    const waterOffset = CIRC * (1 - waterPct);

    return (
        <div
            dir="rtl"
            style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', gap: '9px', padding: '9px 8px' }}
        >
            <style>{`
                @keyframes brk-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.02); opacity: .82; } }
                @keyframes brk-drop { 0% { transform: translateY(-2px); } 50% { transform: translateY(1px); } 100% { transform: translateY(-2px); } }
                .brk-alert { animation: brk-pulse 1.6s ease-in-out infinite; }
                .brk-drop { animation: brk-drop 2.4s ease-in-out infinite; }
                .brk-btn { transition: filter .15s ease, transform .1s ease; }
                .brk-btn:hover { filter: brightness(1.06); }
                .brk-btn:active { transform: translateY(1px); }
            `}</style>

            {/* قسم الماء */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 auto', minHeight: 0 }}>
                <div style={{ position: 'relative', width: '84px', flex: '0 0 auto' }}>
                    <svg viewBox="0 0 84 84" style={{ width: '100%', height: 'auto', aspectRatio: '1 / 1', transform: 'rotate(-90deg)' }} aria-label={`${cups} من ${WATER_GOAL}`}>
                        <circle cx="42" cy="42" r={RADIUS} fill="none" stroke="var(--quiet-gray-100, #f3f4f6)" strokeWidth="8" />
                        <circle
                            cx="42"
                            cy="42"
                            r={RADIUS}
                            fill="none"
                            stroke={waterColor}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={CIRC}
                            strokeDashoffset={waterOffset}
                            style={{ transition: 'stroke-dashoffset .5s cubic-bezier(.34,1.1,.4,1), stroke .3s ease' }}
                        />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                        <Droplet className="brk-drop" size={16} style={{ color: waterColor, fill: waterColor, opacity: 0.9 }} />
                        <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-heading, #1e2a4a)', fontVariantNumeric: 'tabular-nums', marginTop: '2px' }}>
                            {cups}
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--quiet-gray-400, #9ca3af)' }}>/{WATER_GOAL}</span>
                        </span>
                    </div>
                </div>

                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-heading, #1e2a4a)' }}>أكواب الماء اليوم</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary, #6b7280)', marginTop: '2px' }}>
                        {cups >= WATER_GOAL ? 'أحسنت، بلغتَ الهدف 💧' : `تبقّى ${WATER_GOAL - cups} أكواب`}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                        <button
                            className="lab-no-drag brk-btn"
                            onClick={() => setCups((c) => Math.max(0, c - 1))}
                            disabled={cups <= 0}
                            title="إنقاص"
                            style={{
                                width: '30px', height: '30px', borderRadius: '8px',
                                border: '1px solid var(--color-border, #e5e7eb)', background: 'var(--dashboard-card, #fff)',
                                color: 'var(--law-navy, #1e2a4a)', cursor: cups <= 0 ? 'not-allowed' : 'pointer',
                                opacity: cups <= 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <Minus size={15} />
                        </button>
                        <button
                            className="lab-no-drag brk-btn"
                            onClick={() => setCups((c) => c + 1)}
                            title="كوب ماء"
                            style={{
                                flex: '1 1 auto', height: '30px', borderRadius: '8px', border: 'none',
                                background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            }}
                        >
                            <Plus size={14} /> كوب
                        </button>
                    </div>
                </div>
            </div>

            {/* قسم الاستراحة */}
            {due ? (
                <div
                    className="brk-alert"
                    style={{
                        flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '9px',
                        background: 'var(--status-green-light, #dcfce7)',
                        border: '1px solid var(--status-green, #16a34a)', borderRadius: '9px', padding: '9px 11px',
                    }}
                >
                    <Bell size={16} style={{ color: 'var(--status-green, #16a34a)', flex: '0 0 auto' }} />
                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#14532d' }}>حان وقت الاستراحة</div>
                        <div style={{ fontSize: '10.5px', color: '#166534' }}>قِف، تمدّد، وارتشف بعض الماء 🌿</div>
                    </div>
                    <button
                        className="lab-no-drag brk-btn"
                        onClick={ackBreak}
                        style={{
                            flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: '5px', border: 'none',
                            background: 'var(--status-green, #16a34a)', color: '#fff', borderRadius: '8px',
                            padding: '7px 11px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        }}
                    >
                        <Check size={14} strokeWidth={3} /> تمّت
                    </button>
                </div>
            ) : (
                <div
                    style={{
                        flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '9px',
                        background: 'var(--quiet-gray-100, #f3f4f6)', border: '1px solid var(--color-border, #e5e7eb)',
                        borderRadius: '9px', padding: '8px 11px',
                    }}
                >
                    <Coffee size={16} style={{ color: 'var(--law-gold, #c9a227)', flex: '0 0 auto' }} />
                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #6b7280)', fontWeight: 700 }}>الاستراحة القادمة</span>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--law-navy, #1e2a4a)', fontVariantNumeric: 'tabular-nums' }}>{timeLabel}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '5px' }}>
                            {INTERVAL_OPTIONS.map((opt) => {
                                const active = intervalMin === opt;
                                return (
                                    <button
                                        key={opt}
                                        className="lab-no-drag brk-btn"
                                        onClick={() => pickInterval(opt)}
                                        title={`كل ${opt} دقيقة`}
                                        style={{
                                            border: `1px solid ${active ? 'var(--law-gold, #c9a227)' : 'var(--color-border, #e5e7eb)'}`,
                                            background: active ? 'var(--law-gold, #c9a227)' : 'var(--dashboard-card, #fff)',
                                            color: active ? '#fff' : 'var(--color-text-secondary, #6b7280)',
                                            borderRadius: '7px', padding: '3px 9px', fontSize: '11px', fontWeight: 700,
                                            cursor: 'pointer', fontVariantNumeric: 'tabular-nums',
                                        }}
                                    >
                                        {opt}د
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <button
                        className="lab-no-drag brk-btn"
                        onClick={() => setRunning((r) => !r)}
                        title={running ? 'إيقاف مؤقت' : 'استئناف'}
                        style={{
                            flex: '0 0 auto', border: '1px solid var(--color-border, #e5e7eb)',
                            background: 'var(--dashboard-card, #fff)', color: 'var(--law-navy, #1e2a4a)',
                            borderRadius: '8px', padding: '5px 9px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                        }}
                    >
                        {running ? 'إيقاف' : 'تشغيل'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default BreakReminderWidget;
