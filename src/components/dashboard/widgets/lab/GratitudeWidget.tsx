import React, { useCallback, useMemo, useState } from 'react';
import { Heart, Plus, Sparkles } from 'lucide-react';

import { useWidgetContent } from '../../lab/widgetContent';

/**
 * GratitudeWidget — متتبّع الامتنان اليومي.
 *
 * يكتب المستخدم «أمتنّ اليوم لـ…» فتُحفظ المدخلة بتاريخها ويُعرض آخر 3.
 * المدخلات عبر useWidgetContent: داخل اللوح تُحفظ ضمن حالة اللوحة فتتزامن
 * عبر الخادم لكل مستخدم ولكل نسخة؛ خارجه (📌) يبقى localStorage.
 */

interface Entry {
    text: string;
    ts: number;
}

const STORAGE_KEY = 'lab_gratitude_v1';
const MAX_STORED = 50;

// لا مدخلات وهمية — يبدأ فارغاً (قرار المالك 2026-07-22)
const SEED: Entry[] = [];

const parseEntries = (raw: unknown): Entry[] => {
    if (Array.isArray(raw)) {
        return raw
            .filter((e): e is Entry => !!e && typeof (e as Entry).text === 'string' && typeof (e as Entry).ts === 'number')
            .slice(0, MAX_STORED);
    }
    return SEED;
};

const dayFmt = new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long' });

const relDay = (ts: number): string => {
    const startOf = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((startOf(new Date()) - startOf(new Date(ts))) / 86400000);
    if (diffDays <= 0) return 'اليوم';
    if (diffDays === 1) return 'أمس';
    if (diffDays === 2) return 'قبل يومين';
    return dayFmt.format(new Date(ts));
};

const GratitudeWidget: React.FC = () => {
    const [entries, setEntries] = useWidgetContent<Entry[]>(STORAGE_KEY, parseEntries);
    const [draft, setDraft] = useState<string>('');

    const add = useCallback(() => {
        const text = draft.trim();
        if (!text) return;
        setEntries((prev) => [{ text, ts: Date.now() }, ...prev].slice(0, MAX_STORED));
        setDraft('');
    }, [draft]);

    const recent = useMemo(() => entries.slice(0, 3), [entries]);

    return (
        <div
            dir="rtl"
            style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', gap: '9px', padding: '10px 9px' }}
        >
            <style>{`
                @keyframes grt-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
                .grt-card { animation: grt-in .28s ease; }
                .grt-btn { transition: filter .15s ease, transform .1s ease; }
                .grt-btn:hover { filter: brightness(1.06); }
                .grt-btn:active { transform: translateY(1px); }
                .grt-input::placeholder { color: #b45309; opacity: .55; }
            `}</style>

            {/* العنوان */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '0 0 auto' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '8px', background: '#ffedd5' }}>
                    <Heart size={15} style={{ color: '#ea580c', fill: '#ea580c' }} />
                </span>
                <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-heading, #1e2a4a)', lineHeight: 1.1 }}>لحظة امتنان</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--color-text-secondary, #6b7280)' }}>سطر واحد يصنع يومك</div>
                </div>
            </div>

            {/* حقل الإدخال */}
            <div
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto',
                    background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '5px 6px 5px 10px',
                }}
            >
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#b45309', flex: '0 0 auto' }}>أمتنّ لـ</span>
                <input
                    className="lab-no-drag grt-input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') add();
                    }}
                    placeholder="…اكتب ما تشعر بالامتنان له"
                    maxLength={120}
                    style={{
                        flex: '1 1 auto', minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
                        color: '#78350f', fontSize: '12.5px', fontWeight: 600,
                    }}
                />
                <button
                    className="lab-no-drag grt-btn"
                    onClick={add}
                    disabled={!draft.trim()}
                    title="إضافة"
                    style={{
                        flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '28px', height: '28px', borderRadius: '8px', border: 'none',
                        background: draft.trim() ? '#ea580c' : 'var(--quiet-gray-300, #d1d5db)', color: '#fff',
                        cursor: draft.trim() ? 'pointer' : 'not-allowed',
                    }}
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* آخر المدخلات */}
            <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {recent.length === 0 ? (
                    <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--quiet-gray-400, #9ca3af)' }}>
                        <Sparkles size={22} />
                        <span style={{ fontSize: '11.5px' }}>ابدأ بأول لحظة امتنان</span>
                    </div>
                ) : (
                    recent.map((e) => (
                        <div
                            key={e.ts}
                            className="grt-card"
                            style={{
                                display: 'flex', alignItems: 'flex-start', gap: '8px',
                                background: 'var(--dashboard-card, #ffffff)', border: '1px solid #fde68a',
                                borderInlineStart: '3px solid var(--law-gold, #c9a227)', borderRadius: '9px', padding: '8px 10px',
                            }}
                        >
                            <Sparkles size={13} style={{ color: 'var(--law-gold, #c9a227)', flex: '0 0 auto', marginTop: '2px' }} />
                            <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-heading, #1e2a4a)', lineHeight: 1.45 }}>{e.text}</div>
                                <div style={{ fontSize: '10px', color: 'var(--quiet-gray-400, #9ca3af)', marginTop: '2px' }}>{relDay(e.ts)}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default GratitudeWidget;
