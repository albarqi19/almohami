// [P4·UX-06] إدارة تذكيرات التحصيل — قائمة مسطّحة (N-04) + إرسال يدوي ([P2·COL-02]) + توليد ([P2·COL-01]).
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Bell, Send, RefreshCw } from 'lucide-react';
import { billingService } from '../../services/billingService';
import { DataTable, StatusBadge } from '../erp';
import type { Column } from '../erp';
import { REMINDER_TYPE_LABELS, REMINDER_CHANNEL_LABELS } from '../../config/financeStatusConfig';
import { usePermissionContext } from '../../contexts/PermissionContext';
import { FINANCE_PERMISSIONS } from '../../config/financeModule';
import type { CollectionReminder } from '../../types/billing';

const RemindersManager: React.FC = () => {
  const queryClient = useQueryClient();
  const { has } = usePermissionContext();
  const canManage = has(FINANCE_PERMISSIONS.invoicesManage);
  const [statusFilter, setStatusFilter] = useState('scheduled');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['finance', 'reminders', statusFilter],
    queryFn: () => billingService.getReminders({ status: statusFilter, per_page: 50 }),
  });

  const reminders = data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['finance', 'reminders'] });

  const sendMutation = useMutation({
    mutationFn: (id: number) => billingService.sendReminder(id),
    onSuccess: (res) => { res.success ? toast.success(res.message || 'تم إرسال التذكير') : toast.info(res.message || 'تعذّر الإرسال'); invalidate(); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر إرسال التذكير'),
  });

  const generateMutation = useMutation({
    mutationFn: () => billingService.generateReminders(),
    onSuccess: (res) => { toast.success(res.message || 'تم توليد التذكيرات'); invalidate(); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر توليد التذكيرات'),
  });

  const columns: Column<CollectionReminder>[] = [
    {
      key: 'invoice',
      header: 'الفاتورة',
      render: (r) => <span className="fin-docnum">{r.invoice?.invoice_number ?? `#${r.case_invoice_id}`}</span>,
    },
    { key: 'client', header: 'العميل', render: (r) => r.client?.name ?? '—' },
    { key: 'type', header: 'النوع', render: (r) => REMINDER_TYPE_LABELS[r.type] ?? r.type },
    { key: 'channel', header: 'القناة', render: (r) => REMINDER_CHANNEL_LABELS[r.channel] ?? r.channel },
    { key: 'scheduled', header: 'موعد الإرسال', render: (r) => <span className="fin-cell-muted">{r.scheduled_date?.split('T')[0]}</span> },
    {
      key: 'count',
      header: 'المحاولات',
      align: 'center',
      render: (r) => <span className="fin-cell-muted">{r.reminder_count}{r.max_reminders ? ` / ${r.max_reminders}` : ''}</span>,
    },
    { key: 'status', header: 'الحالة', align: 'center', render: (r) => <StatusBadge kind="reminder" status={r.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'center',
      render: (r) => (canManage && r.status !== 'sent' ? (
        <button
          type="button"
          className="fin-btn fin-btn--sm"
          disabled={sendMutation.isPending}
          onClick={() => sendMutation.mutate(r.id)}
        >
          <Send size={13} /> إرسال
        </button>
      ) : null),
    },
  ];

  return (
    <div className="fin-section">
      <div className="fin-section__head">
        <span className="fin-section__title"><Bell size={15} /> إدارة التذكيرات</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select className="fin-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="فلترة حالة التذكير">
            <option value="scheduled">المجدولة</option>
            <option value="sent">المُرسلة</option>
            <option value="failed">الفاشلة</option>
            <option value="skipped">المتخطّاة</option>
          </select>
          {canManage && (
            <button type="button" className="fin-btn fin-btn--sm" disabled={generateMutation.isPending} onClick={() => generateMutation.mutate()}>
              <RefreshCw size={13} /> توليد التذكيرات
            </button>
          )}
        </div>
      </div>
      <div className="fin-section__body" style={{ padding: 0 }}>
        <DataTable<CollectionReminder>
          columns={columns}
          data={reminders}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          emptyIcon={Bell}
          emptyTitle="لا توجد تذكيرات"
          emptyDesc="لا توجد تذكيرات بهذه الحالة."
        />
      </div>
    </div>
  );
};

export default RemindersManager;
