import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Plus, Check, Trash2, ListChecks } from 'lucide-react';

import { useWidgetContent } from '../../lab/widgetContent';

/**
 * QuickChecklistWidget — قائمة مهام سريعة.
 *
 * البنود عبر useWidgetContent: داخل اللوح تُحفظ ضمن حالة اللوحة فتتزامن
 * عبر الخادم لكل مستخدم ولكل نسخة؛ خارجه (📌) يبقى localStorage.
 */

interface ChecklistItem {
    id: number;
    text: string;
    done: boolean;
}

const STORAGE_KEY = 'lab_checklist_v1';

// لا مهام وهمية — تبدأ فارغة برسالة «لا مهام بعد» (قرار المالك 2026-07-22)
function parseItems(raw: unknown): ChecklistItem[] {
    if (Array.isArray(raw)) {
        return raw.filter(
            (i): i is ChecklistItem =>
                !!i &&
                typeof (i as ChecklistItem).id === 'number' &&
                typeof (i as ChecklistItem).text === 'string' &&
                typeof (i as ChecklistItem).done === 'boolean'
        );
    }
    return [];
}

const QuickChecklistWidget: React.FC = () => {
    const [items, setItems] = useWidgetContent<ChecklistItem[]>(STORAGE_KEY, parseItems);
    const [draft, setDraft] = useState<string>('');
    const nextId = useRef<number>(Date.now());

    const addItem = useCallback(() => {
        const text = draft.trim();
        if (!text) return;
        setItems((prev) => [{ id: nextId.current++, text, done: false }, ...prev]);
        setDraft('');
    }, [draft]);

    const toggle = useCallback((id: number) => {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
    }, []);

    const remove = useCallback((id: number) => {
        setItems((prev) => prev.filter((i) => i.id !== id));
    }, []);

    const { doneCount, percent } = useMemo(() => {
        const total = items.length;
        const done = items.filter((i) => i.done).length;
        return { doneCount: done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
    }, [items]);

    return (
        <div
            dir="rtl"
            style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}
        >
            <style>{`
                @keyframes qcl-pop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.25); } 100% { transform: scale(1); opacity: 1; } }
                @keyframes qcl-in { from { transform: translateY(-4px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .qcl-row { animation: qcl-in .18s ease-out; }
                .qcl-check-mark { animation: qcl-pop .28s cubic-bezier(.22,1.2,.36,1); }
                .qcl-del { opacity: 0; transition: opacity .15s ease; }
                .qcl-row:hover .qcl-del { opacity: 1; }
                .qcl-strike { position: absolute; top: 50%; inset-inline-end: 0; height: 1.5px; width: 0; background: currentColor; opacity: .55; transition: width .3s ease; }
                .qcl-strike--on { width: 100%; }
                .qcl-bar-fill { transition: width .35s cubic-bezier(.4,0,.2,1); }
            `}</style>

            {/* رأس: عنوان + نسبة */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <ListChecks size={15} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>مهام سريعة</span>
                <span
                    style={{
                        marginInlineStart: 'auto',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--color-text-secondary)',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {doneCount}/{items.length}
                </span>
            </div>

            {/* شريط التقدّم العلوي */}
            <div
                style={{
                    height: '5px',
                    borderRadius: '999px',
                    background: 'var(--quiet-gray-100, #f3f4f6)',
                    overflow: 'hidden',
                    marginBottom: '10px',
                    flex: '0 0 auto',
                }}
            >
                <div
                    className="qcl-bar-fill"
                    style={{
                        width: `${percent}%`,
                        height: '100%',
                        borderRadius: '999px',
                        background: 'var(--law-gold, #c9a227)',
                    }}
                />
            </div>

            {/* حقل الإضافة */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flex: '0 0 auto' }}>
                <input
                    className="lab-no-drag"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') addItem();
                    }}
                    placeholder="أضف مهمة ثم Enter…"
                    style={{
                        flex: 1,
                        minWidth: 0,
                        border: '1px solid var(--color-border, #e5e7eb)',
                        borderRadius: '8px',
                        padding: '7px 10px',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        color: 'var(--color-heading)',
                        background: 'var(--dashboard-card, #ffffff)',
                        outline: 'none',
                    }}
                />
                <button
                    className="lab-no-drag"
                    onClick={addItem}
                    title="إضافة"
                    style={{
                        flex: '0 0 auto',
                        border: 'none',
                        borderRadius: '8px',
                        width: '34px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        background: 'var(--law-navy, #1e2a4a)',
                        color: '#fff',
                    }}
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* القائمة */}
            <div style={{ flex: '1 1 auto', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px', minHeight: 0 }}>
                {items.length === 0 && (
                    <div style={{ padding: '18px 4px', textAlign: 'center', fontSize: '12px', color: 'var(--quiet-gray-400, #9ca3af)' }}>
                        لا مهام بعد — أضف أول مهمة في الأعلى.
                    </div>
                )}
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="qcl-row"
                        style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '6px 4px', borderRadius: '6px' }}
                    >
                        <button
                            className="lab-no-drag"
                            onClick={() => toggle(item.id)}
                            title={item.done ? 'إلغاء الإنجاز' : 'تعليم كمنجز'}
                            style={{
                                flex: '0 0 auto',
                                width: '20px',
                                height: '20px',
                                borderRadius: '6px',
                                border: item.done ? 'none' : '1.6px solid var(--quiet-gray-300, #d1d5db)',
                                background: item.done ? 'var(--status-green, #16a34a)' : 'transparent',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                            }}
                        >
                            {item.done && <Check size={13} strokeWidth={3} className="qcl-check-mark" />}
                        </button>

                        <span
                            style={{
                                flex: 1,
                                minWidth: 0,
                                position: 'relative',
                                fontSize: '13px',
                                lineHeight: 1.5,
                                color: item.done ? 'var(--quiet-gray-400, #9ca3af)' : 'var(--color-heading)',
                                transition: 'color .25s ease',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {item.text}
                            <span className={`qcl-strike${item.done ? ' qcl-strike--on' : ''}`} />
                        </span>

                        <button
                            className="qcl-del lab-no-drag"
                            onClick={() => remove(item.id)}
                            title="حذف"
                            style={{
                                flex: '0 0 auto',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                color: 'var(--status-red, #dc2626)',
                                display: 'flex',
                                padding: '3px',
                                borderRadius: '5px',
                            }}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default QuickChecklistWidget;
