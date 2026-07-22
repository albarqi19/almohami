import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Responsive, useContainerWidth, verticalCompactor, noCompactor } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './dashboard-lab.css';
import { toast } from 'react-toastify';
import { Plus, X, Search, LayoutDashboard, Radio, Crown, FlaskConical } from 'lucide-react';

import { WIDGET_CATALOG, CATALOG_BY_TYPE, type LabWidgetDef } from './widgetCatalog';
import LabWidgetFrame from './LabWidgetFrame';
import { type WidgetSettings, withDefaults } from './widgetSettings';
import { loadPins, addPin, removePin, isPinned, subscribePins } from './pinnedStore';
import { DashboardService, type DashboardSummary } from '../../../services/dashboardService';
import { DashboardLayoutService, createDebouncedSaver } from '../../../services/dashboardLayoutService';
import { useAuth } from '../../../contexts/AuthContext';
import { usePermissionContext } from '../../../contexts/PermissionContext';

/**
 * WidgetBoard — لوح الودجتس القابل لإعادة الاستخدام 🧩
 *
 * الجوهر المشترك بين «المختبر» (/dashboard-lab) و«اللوحة القابلة للتخصيص»
 * الإنتاجية (/dashboard خلف بوابة custom_dashboard_enabled):
 * شبكة سحب/تحجيم حر (RGL v2) + معرض ودجتس مكثّف مفلتر بالصلاحيات +
 * خصائص لكل ودجت + تثبيت 📌 + حفظ محلي فوري ومزامنة خادم مؤجّلة.
 */

/* ============ إعدادات الشبكة ============ */
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 } as const;
const COLS = { lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 } as const;
const ROW_HEIGHT = 64;

/* حدود التصغير المرنة: أعمق من حدود المعرض — الودجت تنكمش حتى «شريحة»
   من صفّ واحد (رأس فقط) والمحتوى يتكيّف عبر container queries في CSS. */
const HARD_MIN_W = 2;
const HARD_MIN_H = 1;

type Bp = keyof typeof COLS;
export interface WidgetItem { i: string; type: string; }
type LayoutsState = { [bp: string]: any[] };
type SettingsMap = Record<string, Partial<WidgetSettings>>;

export interface BoardState {
    items: WidgetItem[];
    layouts: LayoutsState;
    settings: SettingsMap;
    freeFlow?: boolean;
}

/* نسخة مخطط التخزين — رفعها يُبطل الحالات القديمة (محلياً وبالخادم) فيعود
   المستخدم للتخطيط الافتراضي النظيف. v2: غلاف كلاسيكي للثلاثية، بلا شرائط. */
const SCHEMA_V = 2;

/** تسلسل موحّد للحفظ والمقارنة (ترتيب حقول ثابت + ختم النسخة).
    يكنس إعدادات الودجتس المحذوفة — flush محتوى ودجت عند إزالتها قد يعيد
    مدخلة settings يتيمة في الذاكرة؛ لا تُحفظ ولا تُدفع للخادم أبداً. */
function serialize(state: BoardState): string {
    const ids = new Set(state.items.map((it) => it.i));
    const settings: SettingsMap = {};
    Object.keys(state.settings).forEach((k) => { if (ids.has(k)) settings[k] = state.settings[k]; });
    return JSON.stringify({
        v: SCHEMA_V,
        items: state.items,
        layouts: state.layouts,
        settings,
        freeFlow: !!state.freeFlow,
    });
}

export interface StarterEntry {
    i: string;
    type: string;
    lg: { x: number; y: number; w: number; h: number };
    /** إعدادات مظهر/خصائص ابتدائية لهذه النسخة (اختياري). */
    settings?: Partial<WidgetSettings>;
}

/** واجهة تحكم اللوح — تُمرَّر لشريط أدوات الأب (render prop). */
export interface BoardApi {
    editMode: boolean;
    setEditMode: (v: boolean | ((p: boolean) => boolean)) => void;
    freeFlow: boolean;
    setFreeFlow: (v: boolean | ((p: boolean) => boolean)) => void;
    openPicker: () => void;
    resetLayout: () => void;
    widgetCount: number;
}

interface Props {
    /** مفتاح التخزين المحلي (مختلف بين المختبر واللوحة الإنتاجية). */
    storageKey: string;
    /** التخطيط الابتدائي عند أول استخدام/إعادة الضبط. */
    starter: StarterEntry[];
    /** مزامنة عبر /dashboard/layout (تتفعل فقط إذا كانت بوابة المكتب مفعّلة). */
    serverSync?: boolean;
    /** وضع التخصيص الابتدائي (المختبر true؛ اللوحة الإنتاجية false). */
    initialEditMode?: boolean;
    /** شريط أدوات الأب — يُرندر أعلى الشبكة ويستقبل الـ api. */
    toolbar: (api: BoardApi) => React.ReactNode;
}

const clampNum = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** الحدود الدنيا الفعلية لودجت: لا تتجاوز الحدود المرنة مهما قال المعرض. */
function relaxedMins(def?: LabWidgetDef) {
    return {
        minW: Math.min(def?.minW ?? HARD_MIN_W, HARD_MIN_W),
        minH: HARD_MIN_H,
    };
}

/* ============ أول فراغ متاح ============ */
function collides(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
    return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function findFreeSlot(entries: Array<{ x: number; y: number; w: number; h: number }>, cols: number, w: number, h: number) {
    const W = Math.min(w, cols);
    const maxY = entries.reduce((m, e) => Math.max(m, e.y + e.h), 0);
    for (let y = 0; y <= maxY; y++) {
        for (let x = 0; x + W <= cols; x++) {
            const cand = { x, y, w: W, h };
            if (!entries.some((e) => collides(cand, e))) return { x, y };
        }
    }
    return { x: 0, y: maxY }; // لا فجوة تسعها — أسفل الشبكة
}

/** ترخية الحدود الدنيا المخزّنة من جلسات سابقة. */
function relaxLayouts(layouts: LayoutsState): LayoutsState {
    const next: LayoutsState = {};
    Object.keys(layouts || {}).forEach((bp) => {
        next[bp] = (layouts[bp] || []).map((l) => ({
            ...l,
            minW: Math.min(l.minW ?? HARD_MIN_W, HARD_MIN_W),
            minH: HARD_MIN_H,
        }));
    });
    return next;
}

function buildFromStarter(starter: StarterEntry[]): BoardState {
    const items = starter.map((s) => ({ i: s.i, type: s.type }));
    const lg = starter.map((s) => ({ i: s.i, ...s.lg, ...relaxedMins(CATALOG_BY_TYPE[s.type]) }));
    const settings: SettingsMap = {};
    starter.forEach((s) => { if (s.settings) settings[s.i] = s.settings; });
    return { items, layouts: { lg }, settings, freeFlow: false }; // RGL يولّد بقية القياسات
}

function parseState(raw: unknown): BoardState | null {
    const parsed = raw as any;
    if (!parsed || parsed.v !== SCHEMA_V) return null; // نسخ قديمة/ملوثة → الافتراضي
    if (!Array.isArray(parsed.items) || !parsed.layouts || typeof parsed.layouts !== 'object') return null;
    const items = parsed.items.filter((it: WidgetItem) => it && CATALOG_BY_TYPE[it.type]);
    // ⚠️ اللوحة الفارغة (items=[]) حالة شرعية — المستخدم أفرغها بنفسه؛
    // إرجاع null هنا كان يعيده قسراً للتخطيط الافتراضي بعد كل تحديث.
    return {
        items,
        layouts: relaxLayouts(parsed.layouts),
        settings: parsed.settings || {},
        freeFlow: !!parsed.freeFlow,
    };
}

function loadLocal(storageKey: string, starter: StarterEntry[]): BoardState {
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
            const st = parseState(JSON.parse(raw));
            if (st) return st;
        }
    } catch { /* تجاهل */ }
    return buildFromStarter(starter);
}

/* ============ اللوح ============ */
const WidgetBoard: React.FC<Props> = ({ storageKey, starter, serverSync = false, initialEditMode = false, toolbar }) => {
    const { user } = useAuth();
    const { has } = usePermissionContext();

    const initial = useMemo(() => loadLocal(storageKey, starter), [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps
    const [items, setItems] = useState<WidgetItem[]>(initial.items);
    const [layouts, setLayouts] = useState<LayoutsState>(initial.layouts);
    const [settings, setSettings] = useState<SettingsMap>(initial.settings);
    const [freeFlow, setFreeFlow] = useState<boolean>(!!initial.freeFlow);
    const [editMode, setEditMode] = useState(initialEditMode);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set(loadPins().map((p) => p.id)));

    const { width, containerRef, mounted } = useContainerWidth();

    /* المعرض المرئي: فلترة بالصلاحيات والدور */
    const adminish = !!user && (user.is_super_admin || ['admin', 'owner', 'partner'].includes(user.role));
    const visibleCatalog = useMemo(
        () => WIDGET_CATALOG.filter((w) => (!w.adminOnly || adminish) && (!w.requiredPermission || has(w.requiredPermission))),
        [adminish, has]
    );

    /* بيانات summary الحقيقية (جلسات/أنشطة) إن توفّرت */
    useEffect(() => {
        let alive = true;
        DashboardService.getSummary()
            .then((s) => { if (alive) setSummary(s); })
            .catch(() => { /* الديمو يكفي */ });
        return () => { alive = false; };
    }, []);

    /* مزامنة أزرار الدبوس 📌 */
    useEffect(() => subscribePins(() => setPinnedIds(new Set(loadPins().map((p) => p.id)))), []);

    /* ============ مزامنة الخادم (local-first) ============
       الانضباط الزمني حاسم هنا:
       - لا حفظ إطلاقاً قبل «الجاهزية» (اكتمال GET في وضع المزامنة) — وإلا
         كتب mount الأول savedAt فحجب نسخة الخادم للأبد وكسر مزامنة الأجهزة.
       - بصمة lastSaved تمنع حفظ/دفع ما لم يتغير فعلاً (رندرات RGL التوليدية). */
    const syncEnabled = serverSync && !!user?.tenant?.custom_dashboard_enabled;
    const saver = useMemo(() => createDebouncedSaver(2000), []);
    const readyRef = useRef(!syncEnabled);
    const lastSavedRef = useRef<string>(serialize(initial));

    useEffect(() => {
        if (!syncEnabled) return;
        let alive = true;
        DashboardLayoutService.get()
            .then(({ layout, updated_at }) => {
                if (!alive) return;
                const remote = parseState(layout);
                const remoteAt = updated_at ? Date.parse(updated_at) : 0;
                const localAt = Number(localStorage.getItem(`${storageKey}:savedAt`) || 0);
                // الأحدث يكسب — نسخة الخادم تُعتمد فقط إن كانت أحدث من آخر حفظ محلي
                if (remote && remoteAt > localAt) {
                    const snapshot = serialize(remote);
                    lastSavedRef.current = snapshot; // لا تُدفع للخادم مجدداً كأنها تغيير
                    try {
                        localStorage.setItem(storageKey, snapshot);
                        localStorage.setItem(`${storageKey}:savedAt`, String(remoteAt));
                    } catch { /* تجاهل */ }
                    setItems(remote.items);
                    setLayouts(remote.layouts);
                    setSettings(remote.settings);
                    setFreeFlow(!!remote.freeFlow);
                }
            })
            .catch(() => { /* الشبكة/403 — المحلي يكفي */ })
            .finally(() => { readyRef.current = true; });
        return () => { alive = false; };
    }, [syncEnabled, storageKey]);

    /* حفظ محلي فوري + جدولة حفظ خادم مؤجّل — فقط بعد الجاهزية وعند تغيّر فعلي */
    useEffect(() => {
        if (!readyRef.current) return;
        const snapshot = serialize({ items, layouts, settings, freeFlow });
        if (snapshot === lastSavedRef.current) return; // لا تغيير حقيقي
        lastSavedRef.current = snapshot;
        try {
            localStorage.setItem(storageKey, snapshot);
            localStorage.setItem(`${storageKey}:savedAt`, String(Date.now()));
        } catch { /* تجاهل */ }
        if (syncEnabled) saver.schedule(JSON.parse(snapshot));
    }, [items, layouts, settings, freeFlow, storageKey, syncEnabled, saver]);

    /* حفظ فوري عند مغادرة الصفحة */
    useEffect(() => {
        if (!syncEnabled) return;
        const onLeave = () => saver.flush();
        window.addEventListener('beforeunload', onLeave);
        return () => {
            window.removeEventListener('beforeunload', onLeave);
            saver.flush();
        };
    }, [syncEnabled, saver]);

    /* ============ عمليات الودجتس ============ */
    const onLayoutChange = useCallback((_current: any, all: any) => {
        setLayouts(all as LayoutsState);
    }, []);

    const addWidget = useCallback((def: LabWidgetDef) => {
        const id = `${def.type}-${Date.now().toString(36)}`;
        setItems((prev) => [...prev, { i: id, type: def.type }]);
        setLayouts((prev) => {
            const next: LayoutsState = { ...prev };
            (Object.keys(COLS) as Bp[]).forEach((bp) => {
                const cols = COLS[bp];
                const w = Math.min(def.w, cols);
                const slot = findFreeSlot(prev[bp] || [], cols, w, def.h);
                next[bp] = [...(prev[bp] || []), { i: id, ...slot, w, h: def.h, ...relaxedMins(def) }];
            });
            return next;
        });
        setPickerOpen(false);
        setEditMode(true);
    }, []);

    const removeWidget = useCallback((id: string) => {
        setItems((prev) => prev.filter((it) => it.i !== id));
        setLayouts((prev) => {
            const next: LayoutsState = {};
            Object.keys(prev).forEach((bp) => { next[bp] = (prev[bp] || []).filter((l) => l.i !== id); });
            return next;
        });
        setSettings((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }, []);

    const duplicateWidget = useCallback((id: string) => {
        setItems((prevItems) => {
            const src = prevItems.find((it) => it.i === id);
            if (!src) return prevItems;
            const def = CATALOG_BY_TYPE[src.type];
            const newId = `${src.type}-${Date.now().toString(36)}`;
            setLayouts((prev) => {
                const next: LayoutsState = { ...prev };
                (Object.keys(COLS) as Bp[]).forEach((bp) => {
                    const cols = COLS[bp];
                    const srcEntry = (prev[bp] || []).find((l) => l.i === id);
                    const w = srcEntry?.w ?? Math.min(def?.w ?? 4, cols);
                    const h = srcEntry?.h ?? def?.h ?? 4;
                    const slot = findFreeSlot(prev[bp] || [], cols, w, h);
                    next[bp] = [...(prev[bp] || []), { i: newId, ...slot, w, h, ...relaxedMins(def) }];
                });
                return next;
            });
            setSettings((prev) => (prev[id] ? { ...prev, [newId]: { ...prev[id] } } : prev));
            return [...prevItems, { i: newId, type: src.type }];
        });
    }, []);

    /* 📌 تثبيت/إلغاء تثبيت كبطاقة عائمة في كل الصفحات */
    const togglePin = useCallback((it: WidgetItem) => {
        if (isPinned(it.i)) {
            removePin(it.i);
            toast.info('أُلغي تثبيت الودجت من الصفحات');
            return;
        }
        const def = CATALOG_BY_TYPE[it.type];
        if (!def) return;
        const count = loadPins().length;
        const w = clampNum(def.w * 84, 260, 430);
        const h = clampNum(def.h * 62, 180, 400);
        addPin({
            id: it.i,
            type: it.type,
            x: clampNum(20 + count * 32, 8, Math.max(8, window.innerWidth - w - 20)),
            y: clampNum(window.innerHeight - h - 90 - count * 24, 70, Math.max(70, window.innerHeight - h - 20)),
            w, h,
            collapsed: false,
            settings: settings[it.i],
        });
        toast.success('📌 ثُبّتت — ستجدها عائمة في كل صفحات النظام؛ اسحبها أينما شئت');
    }, [settings]);

    const updateSettings = useCallback((id: string, patch: Partial<WidgetSettings>) => {
        setSettings((prev) => ({ ...prev, [id]: { ...withDefaults(prev[id]), ...patch } }));
    }, []);

    /* «إعادة ضبط المظهر» تعيد الشكل والخصائص للافتراضي لكنها لا تمسّ
       محتوى المستخدم (نص الملاحظة/الأولويات…) — الحذف الصريح وحده يمحوه. */
    const resetWidgetSettings = useCallback((id: string) => {
        setSettings((prev) => {
            const n = { ...prev };
            const content = n[id]?.content;
            if (content !== undefined) n[id] = { content };
            else delete n[id];
            return n;
        });
    }, []);

    const resetLayout = useCallback(() => {
        const fresh = buildFromStarter(starter);
        setItems(fresh.items);
        setLayouts(fresh.layouts);
        setSettings(fresh.settings);
        setFreeFlow(false);
    }, [starter]);

    const ctx = useMemo(() => ({ summary }), [summary]);

    const api: BoardApi = {
        editMode, setEditMode,
        freeFlow, setFreeFlow,
        openPicker: () => setPickerOpen(true),
        resetLayout,
        widgetCount: items.length,
    };

    return (
        <>
            {toolbar(api)}

            {/* الشبكة — dir=ltr لأن محرّك التموضع يعتمد اليسار؛ محتوى كل مربع rtl */}
            <div className="lab-grid-wrap" dir="ltr" ref={containerRef}>
                {mounted && width > 0 && (
                    <Responsive
                        width={width}
                        className="lab-grid"
                        layouts={layouts as any}
                        breakpoints={BREAKPOINTS as any}
                        cols={COLS as any}
                        rowHeight={ROW_HEIGHT}
                        margin={[12, 12]}
                        containerPadding={[0, 0]}
                        compactor={freeFlow ? noCompactor : verticalCompactor}
                        dragConfig={{ enabled: editMode, handle: '.lab-drag-handle', cancel: '.lab-no-drag' }}
                        resizeConfig={{ enabled: editMode, handles: ['se', 'sw', 's', 'e', 'w'] }}
                        onLayoutChange={onLayoutChange}
                    >
                        {items.map((it) => {
                            const def = CATALOG_BY_TYPE[it.type];
                            if (!def) return <div key={it.i} />;
                            return (
                                <div key={it.i} className={`lab-cell ${editMode ? 'is-edit' : ''}`}>
                                    <LabWidgetFrame
                                        def={def}
                                        ctx={ctx}
                                        editMode={editMode}
                                        settings={withDefaults(settings[it.i])}
                                        pinned={pinnedIds.has(it.i)}
                                        onTogglePin={() => togglePin(it)}
                                        onChange={(patch) => updateSettings(it.i, patch)}
                                        onReset={() => resetWidgetSettings(it.i)}
                                        onRemove={() => removeWidget(it.i)}
                                        onDuplicate={() => duplicateWidget(it.i)}
                                    />
                                </div>
                            );
                        })}
                    </Responsive>
                )}

                {items.length === 0 && (
                    <div className="lab-empty">
                        <LayoutDashboard size={40} />
                        <p>لوحتك فارغة — أضف ودجتس لتبدأ.</p>
                        <button className="lab-btn lab-btn--primary" onClick={() => setPickerOpen(true)}>
                            <Plus size={16} /> إضافة ودجت
                        </button>
                    </div>
                )}
            </div>

            {pickerOpen && (
                <WidgetPicker catalog={visibleCatalog} onPick={addWidget} onClose={() => setPickerOpen(false)} />
            )}
        </>
    );
};

/* ============ معرض الودجتس v2 — مكثّف بتصنيفات جانبية وشارات ============ */
const WidgetPicker: React.FC<{
    catalog: LabWidgetDef[];
    onPick: (d: LabWidgetDef) => void;
    onClose: () => void;
}> = ({ catalog, onPick, onClose }) => {
    const [q, setQ] = useState('');
    const [cat, setCat] = useState<string>('all');

    const categories = useMemo(() => {
        const map = new Map<string, number>();
        catalog.forEach((w) => map.set(w.category, (map.get(w.category) || 0) + 1));
        return Array.from(map.entries());
    }, [catalog]);

    const filtered = catalog.filter(
        (w) =>
            (cat === 'all' || w.category === cat) &&
            (!q || w.title.includes(q) || w.desc.includes(q) || w.category.includes(q))
    );

    return (
        <div className="lab-picker__overlay" onClick={onClose} dir="rtl">
            <div className="lab-picker lab-picker--v2" onClick={(e) => e.stopPropagation()}>
                <div className="lab-picker__head">
                    <div className="lab-picker__title">معرض الودجتس</div>
                    <div className="lab-picker__count">{filtered.length.toLocaleString('ar-SA')} ودجت</div>
                    <button className="lab-widget__ctrl" onClick={onClose} title="إغلاق"><X size={18} /></button>
                </div>

                <div className="lab-picker__layout">
                    {/* تصنيفات جانبية */}
                    <aside className="lab-picker__cats">
                        <button className={`lab-picker__cat ${cat === 'all' ? 'is-active' : ''}`} onClick={() => setCat('all')}>
                            <span>الكل</span>
                            <span className="lab-picker__cat-n">{catalog.length.toLocaleString('ar-SA')}</span>
                        </button>
                        {categories.map(([c, n]) => (
                            <button key={c} className={`lab-picker__cat ${cat === c ? 'is-active' : ''}`} onClick={() => setCat(c)}>
                                <span>{c === 'الإدارة' ? '👑 الإدارة' : c}</span>
                                <span className="lab-picker__cat-n">{n.toLocaleString('ar-SA')}</span>
                            </button>
                        ))}
                    </aside>

                    {/* البحث + الشبكة المكثفة */}
                    <div className="lab-picker__main">
                        <div className="lab-picker__search">
                            <Search size={15} />
                            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن ودجت..." autoFocus />
                        </div>
                        <div className="lab-picker__body">
                            <div className="lab-picker__grid lab-picker__grid--dense">
                                {filtered.map((w) => (
                                    <button key={w.type} className="lab-picker__card" onClick={() => onPick(w)} title={w.desc}>
                                        <span className="lab-picker__card-top">
                                            <span className="lab-picker__card-icon">{w.icon}</span>
                                            <span className="lab-picker__badges">
                                                {w.adminOnly && <span className="lab-badge lab-badge--admin" title="للإدارة"><Crown size={9} /></span>}
                                                {w.live
                                                    ? <span className="lab-badge lab-badge--live" title="بيانات حية من النظام"><Radio size={9} /> حية</span>
                                                    : <span className="lab-badge lab-badge--demo" title="ودجت محلية/تجريبية"><FlaskConical size={9} /></span>}
                                            </span>
                                        </span>
                                        <span className="lab-picker__card-title">{w.title}</span>
                                        <span className="lab-picker__card-desc">{w.desc}</span>
                                    </button>
                                ))}
                                {filtered.length === 0 && <div className="lab-picker__empty">لا نتائج</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WidgetBoard;
