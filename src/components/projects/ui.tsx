import React, { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { fmtShortDateAr } from '../../utils/dateAr';
import { ProjectService } from '../../services/projectService';
import { UserService } from '../../services/UserService';
import type { User } from '../../services/UserService';
import { ClientManagementService } from '../../services/clientManagementService';
import type { Linkable, ProjectHealth, ProjectLinkType } from '../../types/projects';
import { PROJECT_HEALTH_LABELS, PROJECT_LINK_LABELS } from '../../types/projects';

/** أدوات صغيرة مشتركة بين قائمة المشاريع وغرفة المشروع — كلها بلغة عادية ورقاقات لا أشرطة. */

export const fmtDate = (value?: string | Date | null): string => {
  if (!value) return '—';
  try { return fmtShortDateAr(value); } catch { return String(value); }
};

export const fmtDateTime = (value?: string | null): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${fmtDate(d)} ${d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`;
};

/** «بعد ٣ أيام» / «قبل يومين» / «اليوم» */
export const daysFromToday = (value?: string | null): { days: number; label: string } | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const days = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (days === 0) return { days, label: 'اليوم' };
  if (days === 1) return { days, label: 'غداً' };
  if (days === -1) return { days, label: 'أمس' };
  if (days > 0) return { days, label: `بعد ${days} يوم` };
  return { days, label: `قبل ${Math.abs(days)} يوم` };
};

export const num = (v: number | string | null | undefined): string => {
  if (v === null || v === undefined || v === '') return '0';
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n) : String(v);
};

export const initials = (name?: string | null): string => (name || '؟').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('');

export const HealthChip: React.FC<{ health: ProjectHealth; reasons?: string[]; small?: boolean }> = ({ health, reasons }) => (
  <span className={`prj-chip prj-chip--${health}`} title={reasons && reasons.length ? reasons.join(' · ') : undefined}>
    {PROJECT_HEALTH_LABELS[health] ?? health}
  </span>
);

export const Chip: React.FC<{ tone?: string; children: React.ReactNode; title?: string; onClick?: () => void; className?: string }> = ({ tone, children, title, onClick, className }) => (
  <span className={`prj-chip ${tone ? `prj-chip--${tone}` : ''} ${className ?? ''}`} title={title} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
    {children}
  </span>
);

export const Bar: React.FC<{ value: number; tone?: 'late' | 'attention' | 'green' | ''; className?: string }> = ({ value, tone = '', className }) => (
  <div className={`prj-bar ${tone ? `prj-bar--${tone}` : ''} ${className ?? ''}`} aria-hidden="true">
    <div className="prj-bar__fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);

export const Modal: React.FC<{ title: React.ReactNode; onClose: () => void; wide?: boolean; children: React.ReactNode; foot?: React.ReactNode }> = ({ title, onClose, wide, children, foot }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="ssp2-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`ssp2-modal prj-modal ${wide ? 'prj-modal--wide' : ''}`} role="dialog" aria-modal="true" dir="rtl">
        <div className="ssp2-modal__head">
          <span>{title}</span>
          <button type="button" className="ssp2-icon-btn" onClick={onClose} aria-label="إغلاق"><X size={15} /></button>
        </div>
        <div className="ssp2-modal__body">
          {children}
          {foot && <div className="ssp2-modal__foot">{foot}</div>}
        </div>
      </div>
    </div>
  );
};

export const Field: React.FC<{ label: string; hint?: string; full?: boolean; children: React.ReactNode }> = ({ label, hint, full, children }) => (
  <label className={`prj-field ${full ? 'prj-form__full' : ''}`}>
    <span className="ssp2-label">{label}</span>
    {children}
    {hint && <span className="prj-form__hint">{hint}</span>}
  </label>
);

export const ErrorBox: React.FC<{ error?: string | null }> = ({ error }) => (error ? <div className="prj-error" role="alert">{error}</div> : null);

export const Empty: React.FC<{ title: string; hint?: string; action?: React.ReactNode; icon?: React.ReactNode }> = ({ title, hint, action, icon }) => (
  <div className="prj-empty">
    {icon}
    <h3>{title}</h3>
    {hint && <p style={{ margin: 0 }}>{hint}</p>}
    {action}
  </div>
);

/** قائمة مستخدمي المكتب (بلا عملاء) — تُجلب مرة وتُشارَك */
export function useOfficeUsers(): { users: User[]; loading: boolean } {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    UserService.getLawyers()
      .then((list) => { if (!cancelled) setUsers(Array.isArray(list) ? list.filter((u) => u.role !== 'client') : []); })
      .catch(() => { if (!cancelled) setUsers([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  return { users, loading };
}

export const UserSelect: React.FC<{ users: User[]; value: number | null | undefined; onChange: (id: number | null) => void; placeholder?: string; disabled?: boolean }> = ({ users, value, onChange, placeholder = '— بلا —', disabled }) => (
  <select className="ssp2-input" value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} disabled={disabled}>
    <option value="">{placeholder}</option>
    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
  </select>
);

/** اختيار متعدد بسيط: رقاقات + قائمة إضافة */
export const UserMultiSelect: React.FC<{ users: User[]; value: number[]; onChange: (ids: number[]) => void }> = ({ users, value, onChange }) => {
  const byId = useMemo(() => new Map(users.map((u) => [Number(u.id), u])), [users]);
  return (
    <div className="prj-chips">
      {value.map((id) => (
        <span key={id} className="prj-chip prj-chip--navy">
          {byId.get(id)?.name ?? `#${id}`}
          <button type="button" onClick={() => onChange(value.filter((v) => v !== id))} aria-label="إزالة"><X size={11} /></button>
        </span>
      ))}
      <select className="ssp2-input" style={{ width: 'auto', padding: '3px 8px', fontSize: 12 }} value="" onChange={(e) => { const id = Number(e.target.value); if (id && !value.includes(id)) onChange([...value, id]); }}>
        <option value="">+ إضافة</option>
        {users.filter((u) => !value.includes(Number(u.id))).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
    </div>
  );
};

/** بحث في القضايا وطلبات التنفيذ والخدمات والاجتماعات والعقود للربط بالمشروع */
export const LinkablePicker: React.FC<{ onPick: (type: ProjectLinkType, item: Linkable) => void; types?: ProjectLinkType[]; exclude?: Array<{ type: string; id: number }> }> = ({ onPick, types, exclude = [] }) => {
  const allowed = types ?? (Object.keys(PROJECT_LINK_LABELS) as ProjectLinkType[]);
  const [type, setType] = useState<ProjectLinkType>(allowed[0]);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Linkable[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      ProjectService.linkables(type, q)
        .then((rows) => { if (!cancelled) setItems(rows); })
        .catch(() => { if (!cancelled) setItems([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [type, q]);
  const visible = items.filter((i) => !exclude.some((e) => e.type === type && e.id === i.id));
  return (
    <div className="prj-picker" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <select className="ssp2-input" style={{ width: 140, flexShrink: 0 }} value={type} onChange={(e) => setType(e.target.value as ProjectLinkType)}>
          {allowed.map((t) => <option key={t} value={t}>{PROJECT_LINK_LABELS[t]}</option>)}
        </select>
        <div style={{ position: 'relative', flex: 1 }}>
          <input className="ssp2-input" value={q} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }} placeholder={`ابحث في ${PROJECT_LINK_LABELS[type]}…`} />
          <Search size={13} style={{ position: 'absolute', insetInlineEnd: 9, top: 9, color: 'var(--color-text-secondary)' }} />
        </div>
      </div>
      {open && (
        <div className="prj-picker__list">
          {loading && <div className="prj-picker__item">جارٍ البحث…</div>}
          {!loading && visible.length === 0 && <div className="prj-picker__item" style={{ color: 'var(--color-text-secondary)' }}>لا نتائج</div>}
          {visible.map((i) => (
            <button type="button" key={i.id} className="prj-picker__item" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(type, i); setOpen(false); }}>
              {i.label}
              {i.sub && <small>{i.sub}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** اختيار عميل بالبحث */
export const ClientPicker: React.FC<{ value: { id: number; name: string } | null; onChange: (c: { id: number; name: string } | null) => void }> = ({ value, onChange }) => {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Array<{ id: number; name: string }>>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(() => {
      ClientManagementService.getClients({ search: q, per_page: 10 })
        .then((res: unknown) => {
          if (cancelled) return;
          const page = res as { data?: Array<{ id: number; name: string }> } | Array<{ id: number; name: string }> | null;
          const rows = Array.isArray(page) ? page : (page?.data ?? []);
          setItems(rows.map((r) => ({ id: Number(r.id), name: r.name })));
        })
        .catch(() => { if (!cancelled) setItems([]); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, open]);
  if (value) {
    return (
      <div className="prj-chips">
        <span className="prj-chip prj-chip--navy">{value.name}<button type="button" onClick={() => onChange(null)} aria-label="إزالة"><X size={11} /></button></span>
      </div>
    );
  }
  return (
    <div className="prj-picker" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <input className="ssp2-input" value={q} onFocus={() => setOpen(true)} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم العميل…" />
      {open && (
        <div className="prj-picker__list">
          {items.length === 0 && <div className="prj-picker__item" style={{ color: 'var(--color-text-secondary)' }}>اكتب اسم العميل</div>}
          {items.map((c) => (
            <button type="button" key={c.id} className="prj-picker__item" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(c); setOpen(false); }}>{c.name}</button>
          ))}
        </div>
      )}
    </div>
  );
};
