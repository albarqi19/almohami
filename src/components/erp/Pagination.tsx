// [P4·UX-08] ترقيم موحّد (RTL).
import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface PaginationProps {
  page: number;
  lastPage: number;
  total?: number;
  onChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ page, lastPage, total, onChange }) => {
  if (lastPage <= 1) return null;
  return (
    <div className="fin-pagination">
      {/* في RTL: «السابق» يمين و«التالي» يسار — نستخدم الأسهم المنطقية */}
      <button
        type="button"
        className="fin-page-btn"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="السابق"
      >
        <ChevronRight size={16} />
      </button>
      <span className="fin-page-info">
        صفحة {page} من {lastPage}
        {typeof total === 'number' ? ` · ${total} سجل` : ''}
      </span>
      <button
        type="button"
        className="fin-page-btn"
        disabled={page >= lastPage}
        onClick={() => onChange(page + 1)}
        aria-label="التالي"
      >
        <ChevronLeft size={16} />
      </button>
    </div>
  );
};

export default Pagination;
