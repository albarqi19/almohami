import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { apiClient } from '../../utils/api';
import { usePermissionContext } from '../../contexts/PermissionContext';
import type { LinkTargetType, LinkedSummary } from '../../services/meetingService';

interface Option {
  type: LinkTargetType;
  label: string;
  endpoint: string;
  /** الصلاحية التي تُظهر هذا الخيار — بلا امتلاكها لا معنى لبحثٍ يرجع فارغاً */
  permission: string;
}

const OPTIONS: Option[] = [
  { type: 'case', label: 'قضية', endpoint: '/cases', permission: 'cases.view' },
  { type: 'legal_service', label: 'خدمة قانونية', endpoint: '/legal-services', permission: 'legal-services.view' },
  { type: 'task', label: 'مهمة', endpoint: '/tasks', permission: 'tasks.view' },
];

interface Props {
  value: { type: LinkTargetType | null; id: number | null };
  summary?: LinkedSummary | null;
  onChange: (next: { type: LinkTargetType | null; id: number | null }) => void;
  disabled?: boolean;
}

interface Row { id: number; title?: string; file_number?: string; service_number?: string }

/**
 * منتقي هدف الربط — «غير مرتبط» أو واحدٌ من ثلاثة.
 *
 * قرار المالك: «يختار **هل هو** مرتبط بخدمة **او** قضية **او** مهمه» — هدفٌ
 * واحد لا أكثر، فالحالة زوجٌ واحد (type, id) لا أربعة حقول مستقلة.
 *
 * البحث مؤجَّل ولا يُجلب شيء قبل الكتابة: جلب «أول 200» يعطي في مكتب كبير
 * قائمةً مبتورة صامتة يظنّها المستخدم كاملة.
 */
const LinkTargetPicker: React.FC<Props> = ({ value, summary, onChange, disabled }) => {
  const { has } = usePermissionContext();
  const available = OPTIONS.filter((o) => has(o.permission));

  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [searching, setSearching] = useState(false);
  // حارس مرجع تصاعدي: نتيجة طلب قديم قد تصل بعد الأحدث فتكتب فوقه
  const seq = useRef(0);

  const active = OPTIONS.find((o) => o.type === value.type) ?? null;

  useEffect(() => {
    if (!active || query.trim().length < 2) {
      setRows([]);
      return;
    }

    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const response = await apiClient.get<{ data: Row[] | { data: Row[] } }>(
          `${active.endpoint}?search=${encodeURIComponent(query.trim())}&per_page=15`
        );
        if (mine !== seq.current) return;

        const payload = response.data as Row[] | { data: Row[] };
        setRows(Array.isArray(payload) ? payload : payload?.data ?? []);
      } catch {
        if (mine === seq.current) setRows([]);
      } finally {
        if (mine === seq.current) setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, active]);

  const reference = (row: Row) => row.file_number || row.service_number || `#${row.id}`;

  return (
    <div className="mfm-link">
      <div className="mfm-link__types">
        <button
          type="button"
          className={`mfm-link__type${!value.type ? ' is-active' : ''}`}
          onClick={() => { onChange({ type: null, id: null }); setQuery(''); }}
          disabled={disabled}
        >
          غير مرتبط
        </button>
        {available.map((option) => (
          <button
            key={option.type}
            type="button"
            className={`mfm-link__type${value.type === option.type ? ' is-active' : ''}`}
            onClick={() => {
              // تبديل النوع يصفّر الهدف: بقاء معرّف من نوع سابق يُنتج ربطاً كاذباً
              onChange({ type: option.type, id: null });
              setQuery('');
            }}
            disabled={disabled}
          >
            {option.label}
          </button>
        ))}
      </div>

      {value.type && value.id && summary ? (
        <div className="mfm-link__chosen">
          <span>
            <strong>{summary.type_label}:</strong> {summary.title}
            {summary.reference && <em> ({summary.reference})</em>}
          </span>
          <button
            type="button"
            className="fin-btn fin-btn--ghost fin-btn--sm"
            onClick={() => onChange({ type: value.type, id: null })}
            disabled={disabled}
          >
            <X size={13} /> إزالة
          </button>
        </div>
      ) : value.type ? (
        <>
          <div className="mfm-link__search">
            <Search size={14} aria-hidden="true" />
            <input
              className="fin-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`ابحث في ${active?.label ?? ''} بحرفين على الأقل…`}
              disabled={disabled}
            />
          </div>

          {searching && <p className="mfm-link__state">جارٍ البحث…</p>}

          {!searching && query.trim().length >= 2 && rows.length === 0 && (
            <p className="mfm-link__state">لا نتائج مطابقة</p>
          )}

          {rows.length > 0 && (
            <ul className="mfm-link__results">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onChange({ type: value.type, id: row.id })}
                    disabled={disabled}
                  >
                    <span>{row.title || `#${row.id}`}</span>
                    <em>{reference(row)}</em>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
};

export default LinkTargetPicker;
