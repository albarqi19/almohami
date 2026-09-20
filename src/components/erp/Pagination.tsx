// [P4·UX-08] ترقيم موحّد (RTL): عدد السجلات في البداية، وأزرار السابق/الأرقام/التالي في الوسط.
import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface PaginationProps {
  page: number;
  lastPage: number;
  total?: number;
  onChange: (page: number) => void;
}

/** 1 … 4 5 6 … 20 — الأولى والأخيرة دائماً، وجارتا الحالية، والباقي نقاط */
const pageWindow = (current: number, total: number): Array<number | 'gap'> => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, total, current - 1, current, current + 1].filter((n) => n >= 1 && n <= total));
  if (current <= 3) [2, 3, 4].forEach((n) => keep.add(n));
  if (current >= total - 2) [total - 1, total - 2, total - 3].forEach((n) => keep.add(n));
  const pages = [...keep].sort((a, b) => a - b);
  const out: Array<number | 'gap'> = [];
  pages.forEach((n, i) => {
    if (i > 0 && n - pages[i - 1] > 1) out.push('gap');
    out.push(n);
  });
  return out;
};

const Pagination: React.FC<PaginationProps> = ({ page, lastPage, total, onChange }) => {
  // صفحة واحدة: يبقى عدد السجلات ظاهراً (كان المكوّن يختفي كله فلا يُعرف كم سجلاً في الجدول)
  if (lastPage <= 1 && typeof total !== 'number') return null;

  return (
    <div className="fin-pagination">
      <span className="fin-page-info">
        {typeof total === 'number' && <><b>{total.toLocaleString('en-US')}</b> سجل</>}
        {lastPage > 1 && <> · صفحة {page} من {lastPage}</>}
      </span>

      {lastPage > 1 && (
        <div className="fin-page-controls">
          {/* في RTL: «السابق» يمين و«التالي» يسار، والصفحة 1 بجوار «السابق» */}
          <button type="button" className="fin-page-btn" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="السابق">
            <ChevronRight size={16} />
          </button>
          {pageWindow(page, lastPage).map((item, i) =>
            item === 'gap' ? (
              <span key={`gap-${i}`} className="fin-page-gap" aria-hidden="true">…</span>
            ) : (
              <button
                key={item}
                type="button"
                className={`fin-page-num${item === page ? ' is-active' : ''}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => item !== page && onChange(item)}
              >
                {item}
              </button>
            ),
          )}
          <button type="button" className="fin-page-btn" disabled={page >= lastPage} onClick={() => onChange(page + 1)} aria-label="التالي">
            <ChevronLeft size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
