import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { GripVertical, X, Settings2, Copy, RotateCcw, Check, Pin, PinOff, SlidersHorizontal } from 'lucide-react';

import type { LabWidgetDef, LabCtx } from './widgetCatalog';
import { type WidgetSettings, SWATCHES, frameStyle, bodyPadding } from './widgetSettings';
import { type WidgetOptionDef, type WidgetOpts, withOptionDefaults } from './widgetOptions';
import { WidgetContentContext } from './widgetContent';

interface Props {
    def: LabWidgetDef;
    ctx: LabCtx;
    editMode: boolean;
    settings: WidgetSettings;
    pinned?: boolean;              // مثبتة كودجت عائمة في كل الصفحات؟
    onTogglePin?: () => void;      // 📌 تثبيت/إلغاء تثبيت
    onChange: (patch: Partial<WidgetSettings>) => void;
    onReset: () => void;
    onRemove: () => void;
    onDuplicate: () => void;
}

const LabWidgetFrame: React.FC<Props> = ({ def, ctx, editMode, settings: s, pinned, onTogglePin, onChange, onReset, onRemove, onDuplicate }) => {
    /* 📝 قناة محتوى الودجت — useWidgetContent داخل الودجت يقرأ/يكتب هنا،
       فيُحفظ المحتوى ضمن settings[id].content ويسافر مع مزامنة اللوحة. */
    const contentApi = React.useMemo(
        () => ({ content: s.content, setContent: (v: unknown) => onChange({ content: v }) }),
        [s.content, onChange]
    );

    const controls = (
        <span className="lab-widget__controls lab-no-drag">
            {onTogglePin && (
                <button
                    className={`lab-widget__ctrl lab-widget__ctrl--pin ${pinned ? 'is-pinned' : ''}`}
                    onClick={onTogglePin}
                    title={pinned ? 'إلغاء التثبيت من كل الصفحات' : 'تثبيت عائمة في كل الصفحات'}
                >
                    {pinned ? <PinOff size={14} /> : <Pin size={14} />}
                </button>
            )}
            <SettingsPopover def={def} s={s} onChange={onChange} onReset={onReset} onDuplicate={onDuplicate} />
            {editMode && (
                <button className="lab-widget__ctrl lab-widget__ctrl--danger" onClick={onRemove} title="إزالة">
                    <X size={14} />
                </button>
            )}
        </span>
    );

    /* ===== الغلاف الكلاسيكي الحرفي — نفس .widget في اللوحة الأصلية =====
       (أصناف dashboard-theme العالمية: widget/widget__header/widget__title/
       widget__content) مع طبقة تحكم اللوح فقط (سحب/دبوس/ترس/حذف). */
    if (s.chrome === 'classic') {
        return (
            <div className={`widget lab-widget--classic ${pinned ? 'lab-widget--pinned' : ''}`} dir="rtl">
                <div className="widget__header lab-drag-handle">
                    <div className="widget__title">
                        {editMode && <span className="lab-widget__grip"><GripVertical size={14} /></span>}
                        {/* إيموجي اللوحة الأصلية إن وُجد، وإلا أيقونة المعرض بخلفية هادئة */}
                        <span
                            className="widget__title-icon"
                            style={{ background: def.classic?.iconBg || 'var(--quiet-gray-100, #f3f4f6)' }}
                        >
                            {def.classic?.emoji || def.icon}
                        </span>
                        <span>
                            {s.title || def.title}
                            {def.classic?.beta && <> <span className="deadlines-beta-tag">تجريبي</span></>}
                        </span>
                    </div>
                    {controls}
                </div>
                <div className="widget__content lab-widget__body">
                    <WidgetContentContext.Provider value={contentApi}>
                        {def.render(ctx, withOptionDefaults(def.options, s.opts))}
                    </WidgetContentContext.Provider>
                </div>
            </div>
        );
    }

    const frameClass = [
        'lab-widget',
        !s.showHeader ? 'lab-widget--noheader' : '',
        pinned ? 'lab-widget--pinned' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={frameClass} style={frameStyle(s)} dir="rtl">
            {s.showHeader ? (
                <div className="lab-widget__header lab-drag-handle">
                    {editMode && <span className="lab-widget__grip"><GripVertical size={14} /></span>}
                    <span className="lab-widget__icon">{def.icon}</span>
                    <span className="lab-widget__title" title={s.title || def.title}>{s.title || def.title}</span>
                    {controls}
                </div>
            ) : (
                <>
                    <div className="lab-widget__floating">{controls}</div>
                    {editMode && (
                        <div className="lab-widget__floating-grip lab-drag-handle" title="اسحب لتحريك">
                            <GripVertical size={14} />
                        </div>
                    )}
                </>
            )}
            <div className="lab-widget__body" style={{ padding: bodyPadding(s) }}>
                <WidgetContentContext.Provider value={contentApi}>
                    {def.render(ctx, withOptionDefaults(def.options, s.opts))}
                </WidgetContentContext.Provider>
            </div>
        </div>
    );
};

/* ============ لوحة الإعدادات المنبثقة ============ */
const SettingsPopover: React.FC<{
    def: LabWidgetDef;
    s: WidgetSettings;
    onChange: (patch: Partial<WidgetSettings>) => void;
    onReset: () => void;
    onDuplicate: () => void;
}> = ({ def, s, onChange, onReset, onDuplicate }) => {
    /* الغلاف الكلاسيكي حرفي لا يتأثر بأدوات المظهر (خلفية/شريط/إطار/زوايا/
       كثافة/رأس) — فلا تُعرض إلا بالنمط الحديث حتى لا توهم بعطل. */
    const isApple = s.chrome === 'apple';

    return (
        <Popover.Root>
            <Popover.Trigger asChild>
                <button className="lab-widget__ctrl lab-gear" title="تخصيص الودجت">
                    <Settings2 size={14} />
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content className="lab-settings" sideOffset={8} align="end" collisionPadding={12} dir="rtl">
                    <div className="lab-settings__head">تخصيص «{s.title || def.title}»</div>

                    <div className="lab-settings__scroll">
                        {/* 🎛️ خصائص الودجت (Schema من الكتالوج — رندر تلقائي، بالنمطين) */}
                        {def.options && def.options.length > 0 && (
                            <>
                                <div className="lab-settings__section">
                                    <SlidersHorizontal size={12} /> خصائص الودجت
                                </div>
                                <OptionsFields
                                    defs={def.options}
                                    values={withOptionDefaults(def.options, s.opts)}
                                    onSet={(key, value) => onChange({ opts: { ...withOptionDefaults(def.options, s.opts), [key]: value } })}
                                />
                                <div className="lab-settings__section">المظهر</div>
                            </>
                        )}

                        {/* نمط العرض: حديث (Apple) أو كلاسيكي حرفي */}
                        <div className="lab-settings__field">
                            <span className="lab-settings__label">نمط العرض</span>
                            <Segmented
                                value={s.chrome || 'apple'}
                                options={[{ v: 'apple', l: 'حديث' }, { v: 'classic', l: 'كلاسيكي' }]}
                                onPick={(v) => onChange({ chrome: v as WidgetSettings['chrome'] })}
                            />
                        </div>

                        {/* العنوان المخصّص (بالنمطين) */}
                        <div className="lab-settings__field">
                            <span className="lab-settings__label">العنوان</span>
                            <input
                                className="lab-settings__input"
                                value={s.title ?? ''}
                                placeholder={def.title}
                                onChange={(e) => onChange({ title: e.target.value || undefined })}
                            />
                        </div>

                        {isApple && (
                            <>
                                {/* الرأس */}
                                <Row label="رأس المربع">
                                    <Toggle on={s.showHeader} onClick={() => onChange({ showHeader: !s.showHeader })} />
                                </Row>

                                {/* الخلفية */}
                                <Row label="خلفية (بطاقة)">
                                    <Toggle on={s.filled} onClick={() => onChange({ filled: !s.filled })} />
                                </Row>
                                {s.filled && (
                                    <Swatches
                                        active={s.bg}
                                        mode="bg"
                                        onPick={(key) => onChange({ bg: key })}
                                    />
                                )}

                                {/* الشريط اللوني */}
                                <div className="lab-settings__field">
                                    <span className="lab-settings__label">شريط لوني</span>
                                    <Segmented
                                        value={s.accent}
                                        options={[{ v: 'none', l: 'بدون' }, { v: 'side', l: 'جانبي' }, { v: 'top', l: 'علوي' }]}
                                        onPick={(v) => onChange({ accent: v as WidgetSettings['accent'] })}
                                    />
                                </div>
                                {s.accent !== 'none' && (
                                    <Swatches
                                        active={s.accentColor}
                                        mode="solid"
                                        onPick={(key) => onChange({ accentColor: key })}
                                    />
                                )}

                                {/* الإطار */}
                                <Row label="الإطار">
                                    <Toggle on={s.border} onClick={() => onChange({ border: !s.border })} />
                                </Row>

                                {/* الزوايا */}
                                <div className="lab-settings__field">
                                    <span className="lab-settings__label">الزوايا</span>
                                    <Segmented
                                        value={s.radius}
                                        options={[{ v: 'sm', l: 'حادّة' }, { v: 'md', l: 'وسط' }, { v: 'lg', l: 'دائرية' }]}
                                        onPick={(v) => onChange({ radius: v as WidgetSettings['radius'] })}
                                    />
                                </div>

                                {/* الكثافة */}
                                <div className="lab-settings__field">
                                    <span className="lab-settings__label">الكثافة</span>
                                    <Segmented
                                        value={s.density}
                                        options={[{ v: 'compact', l: 'مضغوط' }, { v: 'cozy', l: 'مريح' }]}
                                        onPick={(v) => onChange({ density: v as WidgetSettings['density'] })}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="lab-settings__foot">
                        <button className="lab-settings__btn" onClick={onDuplicate}>
                            <Copy size={13} /> تكرار
                        </button>
                        <button className="lab-settings__btn" onClick={onReset}>
                            <RotateCcw size={13} /> إعادة ضبط المظهر
                        </button>
                    </div>

                    <Popover.Arrow className="lab-settings__arrow" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};

/* ============ 🎛️ رندر خصائص الودجت تلقائياً من الـ Schema ============ */
const OptionsFields: React.FC<{
    defs: WidgetOptionDef[];
    values: WidgetOpts;
    onSet: (key: string, value: string | number | boolean) => void;
}> = ({ defs, values, onSet }) => (
    <>
        {defs.map((d) => {
            if (d.type === 'toggle') {
                return (
                    <Row key={d.key} label={d.label}>
                        <Toggle on={!!values[d.key]} onClick={() => onSet(d.key, !values[d.key])} />
                    </Row>
                );
            }
            if (d.type === 'select') {
                const val = String(values[d.key] ?? d.default);
                return (
                    <div key={d.key} className="lab-settings__field">
                        <span className="lab-settings__label">{d.label}</span>
                        {d.choices.length <= 4 ? (
                            <Segmented value={val} options={d.choices.map((c) => ({ v: c.v, l: c.l }))} onPick={(v) => onSet(d.key, v)} />
                        ) : (
                            <select
                                className="lab-settings__input"
                                value={val}
                                onChange={(e) => onSet(d.key, e.target.value)}
                            >
                                {d.choices.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
                            </select>
                        )}
                    </div>
                );
            }
            if (d.type === 'date') {
                return (
                    <Row key={d.key} label={d.label}>
                        <input
                            type="date"
                            className="lab-settings__input lab-settings__input--num"
                            style={{ width: 118 }}
                            value={String(values[d.key] ?? d.default ?? '')}
                            onChange={(e) => onSet(d.key, e.target.value)}
                        />
                    </Row>
                );
            }
            if (d.type === 'number') {
                return (
                    <Row key={d.key} label={d.label}>
                        <input
                            type="number"
                            className="lab-settings__input lab-settings__input--num"
                            value={Number(values[d.key] ?? d.default)}
                            min={d.min} max={d.max} step={d.step ?? 1}
                            onChange={(e) => {
                                const n = Number(e.target.value);
                                if (!Number.isNaN(n)) onSet(d.key, Math.min(d.max ?? Infinity, Math.max(d.min ?? -Infinity, n)));
                            }}
                        />
                    </Row>
                );
            }
            return (
                <div key={d.key} className="lab-settings__field">
                    <span className="lab-settings__label">{d.label}</span>
                    <input
                        className="lab-settings__input"
                        value={String(values[d.key] ?? d.default ?? '')}
                        placeholder={d.placeholder}
                        onChange={(e) => onSet(d.key, e.target.value)}
                    />
                </div>
            );
        })}
    </>
);

/* ============ عناصر تحكّم صغيرة ============ */
const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="lab-settings__row">
        <span className="lab-settings__label">{label}</span>
        {children}
    </div>
);

const Toggle: React.FC<{ on: boolean; onClick: () => void }> = ({ on, onClick }) => (
    <button className={`lab-toggle ${on ? 'is-on' : ''}`} onClick={onClick} role="switch" aria-checked={on}>
        <span className="lab-toggle__knob" />
    </button>
);

const Segmented: React.FC<{ value: string; options: Array<{ v: string; l: string }>; onPick: (v: string) => void }> = ({ value, options, onPick }) => (
    <div className="lab-seg">
        {options.map((o) => (
            <button key={o.v} className={`lab-seg__btn ${value === o.v ? 'is-active' : ''}`} onClick={() => onPick(o.v)}>
                {o.l}
            </button>
        ))}
    </div>
);

const Swatches: React.FC<{ active: string; mode: 'bg' | 'solid'; onPick: (key: string) => void }> = ({ active, mode, onPick }) => (
    <div className="lab-swatches">
        {SWATCHES.map((sw) => (
            <button
                key={sw.key}
                className={`lab-swatch ${active === sw.key ? 'is-active' : ''}`}
                style={{ background: mode === 'bg' ? sw.bg : sw.solid }}
                onClick={() => onPick(sw.key)}
                title={sw.label}
            >
                {active === sw.key && <Check size={12} />}
            </button>
        ))}
    </div>
);

export default LabWidgetFrame;
