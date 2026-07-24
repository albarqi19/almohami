import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, User, Gavel, Scale, Search, X, Loader2 } from 'lucide-react';
import { CaseService } from '../services/caseService';
import { UserService } from '../services/UserService';
import { ExecutionRequestService } from '../services/executionRequestService';
import { LegalServiceService } from '../services/legalServiceService';

/**
 * منتقي ربط المهمة — قضية / عميل / طلب تنفيذ / خدمة قانونية.
 * يُستخدم في مودالي إضافة/تعديل المهمة عند الفتح من الصفحة العامة
 * (بلا سياق). البحث يذهب للخادم (فلتر search الموجود بكل endpoint)
 * ما عدا العملاء (قائمة كاملة مخزّنة cache تُفلتر محلياً).
 */

export type TaskLinkType = 'none' | 'case' | 'client' | 'execution' | 'service';

export interface TaskLinkValue {
  type: TaskLinkType;
  id: string | number | null;
  label: string;
}

export const EMPTY_TASK_LINK: TaskLinkValue = { type: 'none', id: null, label: '' };

interface Option {
  id: string | number;
  label: string;
  sub?: string;
}

interface TaskLinkPickerProps {
  value: TaskLinkValue;
  onChange: (value: TaskLinkValue) => void;
  disabled?: boolean;
}

const TYPE_TABS: { type: TaskLinkType; label: string; icon: React.ComponentType<any> }[] = [
  { type: 'case', label: 'قضية', icon: Briefcase },
  { type: 'client', label: 'عميل', icon: User },
  { type: 'execution', label: 'طلب تنفيذ', icon: Gavel },
  { type: 'service', label: 'خدمة قانونية', icon: Scale },
];

/** يفكّ أشكال الاستجابات المتعددة (paginated داخل data أو مصفوفة مباشرة) */
const extractArray = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

const TaskLinkPicker: React.FC<TaskLinkPickerProps> = ({ value, onChange, disabled }) => {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const debounceRef = useRef<number | null>(null);
  // العملاء يُجلبون مرة واحدة ويُفلترون محلياً
  const clientsCache = useRef<Option[] | null>(null);

  const activeType = value.type;
  const hasSelection = value.id !== null && value.id !== undefined && value.id !== '';

  const fetchOptions = async (type: TaskLinkType, term: string) => {
    setLoading(true);
    setFetchError(false);
    try {
      let opts: Option[] = [];

      if (type === 'case') {
        const res: any = await CaseService.getCases({ search: term || undefined, per_page: 15 } as any);
        opts = extractArray(res).map((c: any) => ({
          id: c.id,
          label: c.title || `قضية ${c.file_number}`,
          sub: c.file_number,
        }));
      } else if (type === 'client') {
        if (!clientsCache.current) {
          const clients: any[] = await UserService.getClients();
          clientsCache.current = (clients || []).map((u: any) => ({ id: u.id, label: u.name, sub: u.phone }));
        }
        const t = term.trim();
        opts = t
          ? clientsCache.current.filter((o) => o.label?.includes(t) || String(o.sub || '').includes(t))
          : clientsCache.current;
      } else if (type === 'execution') {
        const res: any = await ExecutionRequestService.getRequests({ search: term || undefined, per_page: 15 } as any);
        opts = extractArray(res).map((r: any) => ({
          id: r.id,
          label: `طلب تنفيذ: ${r.request_number}`,
          sub: r.main_document_type || r.court,
        }));
      } else if (type === 'service') {
        const res: any = await LegalServiceService.getServices({ search: term || undefined, active_only: true, per_page: 15 } as any);
        opts = extractArray(res).map((s: any) => ({
          id: s.id,
          label: s.title,
          sub: s.service_number,
        }));
      }

      setOptions(opts.slice(0, 15));
    } catch (error) {
      console.error('TaskLinkPicker fetch failed:', error);
      setOptions([]);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  // جلب عند تغيير النوع أو البحث (debounce 300ms للبحث)
  useEffect(() => {
    if (activeType === 'none' || hasSelection || disabled) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchOptions(activeType, search), search ? 300 : 0);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, search, hasSelection]);

  const selectType = (type: TaskLinkType) => {
    if (disabled) return;
    setSearch('');
    setOptions([]);
    onChange(type === activeType ? EMPTY_TASK_LINK : { type, id: null, label: '' });
  };

  const typeMeta = useMemo(() => TYPE_TABS.find((t) => t.type === activeType), [activeType]);

  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 10px',
    borderRadius: 13,
    fontSize: 11.5,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    border: `1px solid ${active ? 'var(--law-navy)' : 'var(--color-border)'}`,
    background: active ? 'var(--law-navy)' : 'var(--color-bg-secondary)',
    color: active ? '#fff' : 'var(--color-text-secondary)',
    fontFamily: 'inherit',
    transition: 'all .12s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* شرائح نوع الربط */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <button type="button" style={chipStyle(activeType === 'none')} onClick={() => selectType('none')} disabled={disabled}>
          بدون ربط
        </button>
        {TYPE_TABS.map(({ type, label, icon: Icon }) => (
          <button key={type} type="button" style={chipStyle(activeType === type)} onClick={() => selectType(type)} disabled={disabled}>
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* المحدد الحالي */}
      {activeType !== 'none' && hasSelection && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 9px', borderRadius: 7, fontSize: 12.5,
          background: 'var(--law-navy-light, rgba(30,58,95,.07))',
          border: '1px solid var(--color-border)', color: 'var(--law-navy)', fontWeight: 600,
        }}>
          {typeMeta && <typeMeta.icon size={14} />}
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value.label}</span>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange({ type: activeType, id: null, label: '' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 2, display: 'flex' }}
              title="إزالة الاختيار"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* البحث والقائمة */}
      {activeType !== 'none' && !hasSelection && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: '1px solid var(--color-border)' }}>
            <Search size={13} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`ابحث عن ${typeMeta?.label || ''}...`}
              autoFocus
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: 13, fontFamily: 'inherit', color: 'var(--color-text)' }}
            />
            {loading && <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />}
          </div>
          <div style={{ maxHeight: 148, overflowY: 'auto' }}>
            {!loading && options.length === 0 && (
              <div style={{ padding: '12px 10px', fontSize: 12.5, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                {fetchError ? 'تعذّر جلب القائمة — تحقق من الصلاحيات' : 'لا نتائج'}
              </div>
            )}
            {options.map((opt) => (
              <button
                key={String(opt.id)}
                type="button"
                onClick={() => onChange({ type: activeType, id: opt.id, label: opt.sub ? `${opt.label} (${opt.sub})` : opt.label })}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
                  width: '100%', padding: '7px 10px', border: 'none', borderBottom: '1px solid var(--color-border)',
                  background: 'transparent', cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-secondary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 500 }}>{opt.label}</span>
                {opt.sub && <span style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>{opt.sub}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskLinkPicker;
