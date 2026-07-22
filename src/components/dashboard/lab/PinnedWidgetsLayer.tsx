import React, { useEffect, useRef, useState } from 'react';
import { PinOff, Minus, GripVertical } from 'lucide-react';

import { CATALOG_BY_TYPE } from './widgetCatalog';
import { withDefaults, swatchBg } from './widgetSettings';
import { withOptionDefaults } from './widgetOptions';
import { loadPins, removePin, updatePin, subscribePins, type PinnedWidget } from './pinnedStore';
import './pinned-widgets.css';

/**
 * طبقة الودجتس المثبتة 📌 — بطاقات عائمة فوق كل صفحات النظام.
 * السحب/التحجيم عبر Pointer Events مع تحديث style مباشرة (بلا setState
 * أثناء الحركة) ثم حفظ صامت عند الإفلات — أخف ما يمكن.
 */

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

const PIN_CTX = { summary: null };
const BUBBLE = 48;               // قطر الفقاعة عند الطي
const MIN_W = 230, MAX_W = 640;  // حدود التحجيم الحر بالبكسل
const MIN_H = 150, MAX_H = 700;

const PinnedWidgetsLayer: React.FC = () => {
    const [pins, setPins] = useState<PinnedWidget[]>(loadPins);
    useEffect(() => subscribePins(() => setPins(loadPins())), []);
    return <>{pins.map((p) => <PinnedCard key={p.id} pin={p} />)}</>;
};

interface DragState {
    mode: 'move' | 'resize';
    sx: number; sy: number;   // نقطة بداية المؤشر
    ox: number; oy: number;   // موضع البطاقة الأصلي
    ow: number; oh: number;   // حجمها الأصلي
    moved: boolean;           // تجاوز عتبة الحركة؟ (لتمييز النقرة عن السحب)
}

const PinnedCard: React.FC<{ pin: PinnedWidget }> = ({ pin }) => {
    const def = CATALOG_BY_TYPE[pin.type];
    const ref = useRef<HTMLDivElement>(null);
    const box = useRef({ x: pin.x, y: pin.y, w: pin.w, h: pin.h });
    const drag = useRef<DragState | null>(null);
    const [collapsed, setCollapsed] = useState(!!pin.collapsed);
    const [dragging, setDragging] = useState(false);

    const s = withDefaults(pin.settings);

    // إبقاء البطاقة داخل الشاشة عند تغيّر حجم النافذة
    useEffect(() => {
        const fit = () => {
            const el = ref.current;
            if (!el) return;
            box.current.x = clamp(box.current.x, 8, Math.max(8, window.innerWidth - 90));
            box.current.y = clamp(box.current.y, 8, Math.max(8, window.innerHeight - 56));
            el.style.left = `${box.current.x}px`;
            el.style.top = `${box.current.y}px`;
        };
        fit();
        window.addEventListener('resize', fit);
        return () => window.removeEventListener('resize', fit);
    }, []);

    if (!def) return null;

    const startDrag = (mode: DragState['mode']) => (e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest('.pinw-btn')) return; // الأزرار ليست مقبض سحب
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        drag.current = {
            mode,
            sx: e.clientX, sy: e.clientY,
            ox: box.current.x, oy: box.current.y,
            ow: box.current.w, oh: box.current.h,
            moved: false,
        };
        setDragging(true);
    };

    const onMove = (e: React.PointerEvent) => {
        const st = drag.current;
        const el = ref.current;
        if (!st || !el) return;
        const dx = e.clientX - st.sx;
        const dy = e.clientY - st.sy;
        if (!st.moved && Math.abs(dx) + Math.abs(dy) > 3) st.moved = true;
        if (st.mode === 'move') {
            const visibleW = collapsed ? BUBBLE : Math.min(box.current.w, 140);
            box.current.x = clamp(st.ox + dx, 8, window.innerWidth - visibleW - 8);
            box.current.y = clamp(st.oy + dy, 8, window.innerHeight - 52);
            el.style.left = `${box.current.x}px`;
            el.style.top = `${box.current.y}px`;
        } else {
            box.current.w = clamp(st.ow + dx, MIN_W, MAX_W);
            box.current.h = clamp(st.oh + dy, MIN_H, MAX_H);
            el.style.width = `${box.current.w}px`;
            el.style.height = `${box.current.h}px`;
        }
    };

    const endDrag = () => {
        const st = drag.current;
        drag.current = null;
        setDragging(false);
        if (!st) return;
        updatePin(pin.id, { x: box.current.x, y: box.current.y, w: box.current.w, h: box.current.h });
        if (collapsed && !st.moved) setCollapsedAndSave(false); // نقرة على الفقاعة = فتح
    };

    const setCollapsedAndSave = (next: boolean) => {
        if (!next) {
            // عند الفتح: تأكد أن البطاقة كاملة تدخل الشاشة
            box.current.x = clamp(box.current.x, 8, Math.max(8, window.innerWidth - box.current.w - 8));
            box.current.y = clamp(box.current.y, 8, Math.max(8, window.innerHeight - Math.min(box.current.h, 300)));
        }
        setCollapsed(next);
        updatePin(pin.id, { collapsed: next, x: box.current.x, y: box.current.y });
    };

    const title = s.title || def.title;

    return (
        <div
            ref={ref}
            className={`pinw-card ${collapsed ? 'is-collapsed' : ''} ${dragging ? 'is-dragging' : ''}`}
            style={{
                left: box.current.x,
                top: box.current.y,
                width: collapsed ? BUBBLE : box.current.w,
                height: collapsed ? BUBBLE : box.current.h,
                background: collapsed ? undefined : (s.filled ? swatchBg(s.bg) : 'var(--dashboard-card, #ffffff)'),
            }}
            dir="rtl"
        >
            {/* وجه الفقاعة عند الطي — النقر يفتح والسحب يحرّك */}
            {collapsed && (
                <div
                    className="pinw-bubble-face"
                    title={`${title} — انقر للفتح`}
                    onPointerDown={startDrag('move')}
                    onPointerMove={onMove}
                    onPointerUp={endDrag}
                >
                    {def.icon}
                </div>
            )}

            {/* الرأس: مقبض السحب + الأزرار (يبقى في الشجرة عند الطي حفاظاً على الحالة) */}
            <div
                className="pinw-head"
                style={collapsed ? { display: 'none' } : undefined}
                onPointerDown={startDrag('move')}
                onPointerMove={onMove}
                onPointerUp={endDrag}
            >
                <span className="pinw-grip"><GripVertical size={13} /></span>
                <span className="pinw-icon">{def.icon}</span>
                <span className="pinw-title" title={title}>{title}</span>
                <button className="pinw-btn" title="طيّ إلى فقاعة" onClick={() => setCollapsedAndSave(true)}>
                    <Minus size={13} />
                </button>
                <button className="pinw-btn pinw-btn--danger" title="إلغاء التثبيت" onClick={() => removePin(pin.id)}>
                    <PinOff size={13} />
                </button>
            </div>

            <div className="pinw-body" style={collapsed ? { display: 'none' } : undefined}>
                {def.render(PIN_CTX, withOptionDefaults(def.options, s.opts))}
            </div>

            {/* مقبض التحجيم — الزاوية السفلية اليمنى (فيزيائياً) */}
            {!collapsed && (
                <div
                    className="pinw-resize"
                    title="تحجيم"
                    onPointerDown={startDrag('resize')}
                    onPointerMove={onMove}
                    onPointerUp={endDrag}
                />
            )}
        </div>
    );
};

export default PinnedWidgetsLayer;
