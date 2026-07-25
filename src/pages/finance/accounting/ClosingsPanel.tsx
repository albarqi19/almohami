// [وحدة المحاسبة #141 — م4] الإقفال السنوي: قيد 31/12 يصفّر الإيرادات
// والمصروفات ويرحّل الصافي للأرباح المبقاة، ثم تُقفل السنة عن أي قيد جديد.
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Lock, AlertTriangle } from 'lucide-react';
import { accountingService } from '../../../services/accountingService';
import { DataTable, Modal } from '../../../components/erp';
import type { Column } from '../../../components/erp';
import type { FiscalYearClosing } from '../../../services/accountingService';
import { formatSAR } from '../../../utils/money';
import { usePermissionContext } from '../../../contexts/PermissionContext';
import { FINANCE_PERMISSIONS } from '../../../config/financeModule';

const ClosingsPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const { has } = usePermissionContext();
  const canManage = has(FINANCE_PERMISSIONS.accountingManage);

  const lastYear = new Date().getFullYear() - 1;
  const [confirmYear, setConfirmYear] = useState<number | null>(null);
  const [yearInput, setYearInput] = useState(String(lastYear));

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['accounting', 'closings'],
    queryFn: () => accountingService.getClosings(),
  });

  const closings = data?.data ?? [];

  const closeMutation = useMutation({
    mutationFn: (year: number) => accountingService.closeYear(year),
    onSuccess: (res) => {
      toast.success(res.message || 'أُقفلت السنة');
      queryClient.invalidateQueries({ queryKey: ['accounting'] });
      setConfirmYear(null);
    },
    onError: (e: Error) => toast.error(e.message || 'تعذّر الإقفال'),
  });

  const columns: Column<FiscalYearClosing>[] = [
    { key: 'year', header: 'السنة المالية', render: (c) => <strong>{c.fiscal_year}</strong> },
    {
      key: 'net',
      header: 'صافي الدخل المُرحَّل',
      numeric: true,
      align: 'end',
      render: (c) => (
        <span style={{ color: Number(c.net_income) >= 0 ? 'var(--status-green)' : 'var(--status-red)' }}>
          {formatSAR(c.net_income)}
        </span>
      ),
    },
    { key: 'entry', header: 'قيد الإقفال', render: (c) => c.closing_entry?.entry_number ?? '—' },
    { key: 'by', header: 'أقفلها', render: (c) => c.closed_by?.name ?? '—' },
    { key: 'at', header: 'التاريخ', render: (c) => c.closed_at?.slice(0, 10) },
  ];

  return (
    <div>
      {canManage && (
        <div className="acc-period">
          <span className="fin-cell-muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} />
            الإقفال يمنع أي قيد بتاريخ داخل السنة المقفلة أو قبلها — نفّذه بعد اعتماد قوائم السنة.
          </span>
          <span style={{ flex: 1 }} />
          <input className="fin-input" type="number" min="2020" max={lastYear} value={yearInput}
            onChange={(e) => setYearInput(e.target.value)} style={{ maxWidth: 110 }} aria-label="السنة" />
          <button type="button" className="fin-btn fin-btn--primary"
            onClick={() => setConfirmYear(Number(yearInput))}
            disabled={!yearInput || Number(yearInput) > lastYear}>
            <Lock size={14} /> إقفال السنة
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={closings}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        emptyIcon={Lock}
        emptyTitle="لا سنوات مقفلة"
        emptyDesc="عند إقفال أول سنة مالية سيظهر سجلّها هنا مع قيد الإقفال وصافي الدخل المرحَّل."
      />

      <Modal
        open={confirmYear !== null}
        onClose={() => setConfirmYear(null)}
        title={`إقفال السنة المالية ${confirmYear ?? ''}`}
        icon={Lock}
        size="narrow"
        footerAlign="end"
        footer={(
          <>
            <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setConfirmYear(null)}>تراجع</button>
            <button type="button" className="fin-btn fin-btn--danger" disabled={closeMutation.isPending}
              onClick={() => closeMutation.mutate(confirmYear!)}>
              {closeMutation.isPending ? 'جارٍ الإقفال...' : 'تأكيد الإقفال'}
            </button>
          </>
        )}
      >
        <p>
          سيُنشأ قيد إقفال بتاريخ 31/12/{confirmYear} يصفّر الإيرادات والمصروفات ويرحّل صافي الدخل
          إلى «الأرباح المبقاة»، ثم <strong>تُقفل السنة نهائياً</strong> عن أي قيد جديد. هذا إجراء لا يُتراجع عنه من الواجهة.
        </p>
      </Modal>
    </div>
  );
};

export default ClosingsPanel;
