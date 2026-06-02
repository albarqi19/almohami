// [P4·UX-08] شريط فلترة موحّد: بحث + قوائم فلترة + إجراءات يمين.
import React from 'react';
import { Search, X } from 'lucide-react';

export interface SelectFilter {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel?: string;
}

interface FilterBarProps {
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  selects?: SelectFilter[];
  /** عناصر تُعرض في أقصى اليسار (أزرار تصدير/إنشاء). */
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

const FilterBar: React.FC<FilterBarProps> = ({ search, selects, actions, children }) => (
  <div className="fin-filterbar">
    {search && (
      <div className="fin-search">
        <Search className="fin-search__icon" size={15} />
        <input
          className="fin-search__input"
          type="text"
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          placeholder={search.placeholder ?? 'بحث...'}
        />
        {search.value && (
          <button type="button" className="fin-search__clear" onClick={() => search.onChange('')} aria-label="مسح">
            <X size={14} />
          </button>
        )}
      </div>
    )}
    {selects?.map((sel, i) => (
      <select
        key={i}
        className="fin-select"
        value={sel.value}
        onChange={(e) => sel.onChange(e.target.value)}
        aria-label={sel.ariaLabel}
      >
        {sel.options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    ))}
    {children}
    {actions && (
      <>
        <div className="fin-filterbar__spacer" />
        <div className="fin-filterbar__actions">{actions}</div>
      </>
    )}
  </div>
);

export default FilterBar;
