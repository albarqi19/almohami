// [P4·UX-08] جدول بيانات موحّد كثيف (ERP) — يستبدل جداول الصفحات الخمس.
// يدعم: أعمدة قابلة للتهيئة، فرز خادمي، تحميل/فارغ/خطأ، اختيار صفوف (UX-10)، RTL، الثيمات الثلاثة.
import React from 'react';
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { LoadingState, EmptyState, ErrorState } from './States';
import type { LucideIcon } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T, index: number) => React.ReactNode;
  align?: 'start' | 'end' | 'center';
  numeric?: boolean;
  sortable?: boolean;
  /** قيمة sort_by المرسلة للباك عند النقر على الترويسة. */
  sortKey?: string;
}

export interface DataTableSort {
  by?: string;
  order?: 'asc' | 'desc';
  onSort: (sortKey: string) => void;
}

export interface DataTableSelection<T> {
  selectedKeys: Set<string | number>;
  onToggle: (key: string | number, row: T) => void;
  onToggleAll: (rows: T[]) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[] | undefined;
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  sort?: DataTableSort;
  selection?: DataTableSelection<T>;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDesc?: string;
  /** فوتر (ترقيم مثلاً). */
  footer?: React.ReactNode;
}

function colAlignClass<T>(col: Column<T>): string {
  const parts: string[] = [];
  if (col.align === 'end') parts.push('fin-col--end');
  else if (col.align === 'center') parts.push('fin-col--center');
  if (col.numeric) parts.push('fin-col--num');
  return parts.join(' ');
}

function DataTable<T>({
  columns, data, rowKey, isLoading, isError, onRetry, onRowClick, sort, selection,
  emptyIcon, emptyTitle, emptyDesc, footer,
}: DataTableProps<T>) {
  const rows = data ?? [];
  const allSelected = !!selection && rows.length > 0 && rows.every((r) => selection.selectedKeys.has(rowKey(r)));

  const renderSortIcon = (col: Column<T>) => {
    if (!col.sortable || !col.sortKey || !sort) return null;
    if (sort.by !== col.sortKey) return <ChevronsUpDown size={12} style={{ opacity: 0.5 }} />;
    return sort.order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  return (
    <div className="fin-table-wrap">
      <div className="fin-table-scroll">
        <table className="fin-table">
          <thead>
            <tr>
              {selection && (
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    className="fin-checkbox"
                    checked={allSelected}
                    onChange={() => selection.onToggleAll(rows)}
                    aria-label="تحديد الكل"
                  />
                </th>
              )}
              {columns.map((col) => {
                const isSortable = !!(col.sortable && col.sortKey && sort);
                return (
                  <th
                    key={col.key}
                    className={`${colAlignClass(col)}${isSortable ? ' is-sortable' : ''}`}
                    onClick={isSortable ? () => sort!.onSort(col.sortKey!) : undefined}
                  >
                    <span className="fin-th-inner">
                      {col.header}
                      {renderSortIcon(col)}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          {!isLoading && !isError && rows.length > 0 && (
            <tbody>
              {rows.map((row, index) => {
                const key = rowKey(row);
                const isSelected = selection?.selectedKeys.has(key);
                return (
                  <tr
                    key={key}
                    className={`${onRowClick ? 'is-clickable' : ''}${isSelected ? ' is-selected' : ''}`}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {selection && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="fin-checkbox"
                          checked={!!isSelected}
                          onChange={() => selection.onToggle(key, row)}
                          aria-label="تحديد الصف"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={colAlignClass(col)}>
                        {col.render(row, index)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
      </div>

      {isLoading && <LoadingState />}
      {!isLoading && isError && <ErrorState onRetry={onRetry} />}
      {!isLoading && !isError && rows.length === 0 && (
        <EmptyState icon={emptyIcon} title={emptyTitle} desc={emptyDesc} />
      )}
      {!isLoading && !isError && rows.length > 0 && footer}
    </div>
  );
}

export default DataTable;
