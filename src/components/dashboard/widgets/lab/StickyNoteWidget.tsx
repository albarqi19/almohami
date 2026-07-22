import React, { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

import { useWidgetContent } from '../../lab/widgetContent';

/**
 * StickyNoteWidget — ملاحظة لاصقة بحفظ تلقائي.
 *
 * المحتوى (النص واللون) عبر useWidgetContent: داخل اللوح يُحفظ ضمن حالة
 * اللوحة فيتزامن عبر الخادم لكل مستخدم ولكل نسخة؛ خارجه (📌) localStorage.
 */

type NoteColor = 'yellow' | 'pink' | 'blue';

interface NoteState {
    text: string;
    color: NoteColor;
}

const STORAGE_KEY = 'lab_sticky_v1';

const PALETTE: Record<NoteColor, { bg: string; fold: string; text: string; line: string }> = {
    yellow: { bg: '#fef9c3', fold: '#fde047', text: '#713f12', line: 'rgba(113,63,18,0.12)' },
    pink: { bg: '#fce7f3', fold: '#f9a8d4', text: '#831843', line: 'rgba(131,24,67,0.12)' },
    blue: { bg: '#dbeafe', fold: '#93c5fd', text: '#1e3a8a', line: 'rgba(30,58,138,0.12)' },
};

const DEFAULT_STATE: NoteState = {
    text: 'تذكير: مراجعة مهلة الاعتراض للقضية رقم ٤٤١٢ قبل الخميس.',
    color: 'yellow',
};

function parseNote(raw: unknown): NoteState {
    const parsed = (raw || {}) as Partial<NoteState>;
    if (typeof parsed.text !== 'string' && !parsed.color) return DEFAULT_STATE;
    const color: NoteColor =
        parsed.color === 'pink' || parsed.color === 'blue' || parsed.color === 'yellow'
            ? parsed.color
            : 'yellow';
    return { text: typeof parsed.text === 'string' ? parsed.text : '', color };
}

const StickyNoteWidget: React.FC = () => {
    const [state, setState] = useWidgetContent<NoteState>(STORAGE_KEY, parseNote);
    const [savedFlash, setSavedFlash] = useState<boolean>(false);
    const flashTimer = useRef<number | null>(null);

    // وميض «محفوظ» خفيف عند كل تعديل (الحفظ نفسه يتولاه useWidgetContent)
    useEffect(() => {
        setSavedFlash(true);
        if (flashTimer.current) window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setSavedFlash(false), 1200);
        return () => {
            if (flashTimer.current) window.clearTimeout(flashTimer.current);
        };
    }, [state]);

    const pal = PALETTE[state.color];

    return (
        <div
            dir="rtl"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                padding: '6px',
                gap: '8px',
            }}
        >
            <style>{`
                @keyframes snt-fade { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
                .snt-saved { animation: snt-fade .2s ease; }
                .snt-dot { transition: transform .15s ease, box-shadow .15s ease; }
                .snt-dot:hover { transform: scale(1.15); }
                .snt-paper textarea::placeholder { color: currentColor; opacity: .45; }
            `}</style>

            {/* الورقة اللاصقة */}
            <div
                className="snt-paper"
                style={{
                    position: 'relative',
                    flex: '1 1 auto',
                    minHeight: 0,
                    transform: 'rotate(-1deg)',
                    background: pal.bg,
                    borderRadius: '4px 4px 10px 4px',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    transition: 'background .25s ease',
                    // ظل خفيف جداً فقط لإيحاء «ورقة ملصقة» (ليس توهجاً)
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                }}
            >
                {/* خطوط دفتر خفيفة */}
                <div
                    aria-hidden
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent 27px, ${pal.line} 27px, ${pal.line} 28px)`,
                        pointerEvents: 'none',
                    }}
                />
                <textarea
                    className="lab-no-drag"
                    value={state.text}
                    onChange={(e) => setState((s) => ({ ...s, text: e.target.value }))}
                    placeholder="اكتب ملاحظتك هنا…"
                    spellCheck={false}
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        resize: 'none',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        color: pal.text,
                        padding: '12px 14px',
                        boxSizing: 'border-box',
                        fontSize: '15px',
                        lineHeight: '28px',
                        fontWeight: 600,
                        fontFamily: "'Segoe Print', 'Bradley Hand', 'Comic Sans MS', 'Baloo Bhaijaan 2', cursive",
                    }}
                />
                {/* الحافة المطوية أسفل اليسار */}
                <div
                    aria-hidden
                    style={{
                        position: 'absolute',
                        left: 0,
                        bottom: 0,
                        width: 0,
                        height: 0,
                        borderStyle: 'solid',
                        borderWidth: '0 0 18px 18px',
                        borderColor: `transparent transparent ${pal.fold} transparent`,
                        filter: 'brightness(0.96)',
                    }}
                />
            </div>

            {/* شريط سفلي: نقاط الألوان + مؤشّر الحفظ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto', paddingInline: '2px' }}>
                {(Object.keys(PALETTE) as NoteColor[]).map((c) => {
                    const active = state.color === c;
                    return (
                        <button
                            key={c}
                            className="snt-dot lab-no-drag"
                            title={c === 'yellow' ? 'أصفر' : c === 'pink' ? 'وردي' : 'أزرق'}
                            onClick={() => setState((s) => ({ ...s, color: c }))}
                            style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                padding: 0,
                                background: PALETTE[c].fold,
                                border: active ? '2px solid var(--law-navy, #1e2a4a)' : '2px solid transparent',
                                boxShadow: active ? '0 0 0 2px var(--dashboard-card, #fff)' : 'none',
                            }}
                        />
                    );
                })}
                <span
                    style={{
                        marginInlineStart: 'auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '11px',
                        color: 'var(--quiet-gray-500, #6b7280)',
                        opacity: savedFlash ? 1 : 0.55,
                    }}
                >
                    {savedFlash ? (
                        <span className="snt-saved" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--status-green, #16a34a)' }}>
                            <Check size={12} strokeWidth={3} /> محفوظ
                        </span>
                    ) : (
                        'حفظ تلقائي'
                    )}
                </span>
            </div>
        </div>
    );
};

export default StickyNoteWidget;
