// [P4·UX-06] تبويب التحصيل العلوي (عرض لا نظام) — لدور التحصيل/المحاسبة فقط.
// عرض على الفواتير المتأخّرة + درجة مخاطر (UX-11) + إدارة التذكيرات.
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Wallet, Bell, Eye, Clock, HelpCircle } from 'lucide-react';
import { invoiceService } from '../../../services/invoiceService';
import { billingService } from '../../../services/billingService';
import { DataTable } from '../../../components/erp';
import type { Column } from '../../../components/erp';
import { ToneBadge } from '../../../components/erp/StatusBadge';
import RemindersManager from '../../../components/finance/RemindersManager';
import { formatSAR } from '../../../utils/money';
import { getOverdueDays } from '../../../utils/dueDays';
import { collectionRisk } from '../../../config/financeStatusConfig';
import type { CaseInvoice } from '../../../types/billing';

/* بطاقة مؤشر لتبويب التحصيل مع الأيقونة المائية الشفافة */
function KpiCard({
  label,
  value,
  tone = 'neutral',
  icon: Icon,
  tooltip,
}: {
  label: string;
  value: string;
  tone?: 'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'purple';
  icon?: React.ComponentType<{ size?: number; className?: string; color?: string }>;
  tooltip?: string;
}) {
  const tokenMap: Record<string, string> = {
    success: 'var(--status-green,#059669)',
    info:    'var(--status-blue,#0284C7)',
    warning: 'var(--status-orange,#D97706)',
    danger:  'var(--status-red,#DC2626)',
    purple:  'var(--status-purple,#7c3aed)',
    neutral: 'var(--color-text-secondary,#5a5a5a)',
  };
  const color = tokenMap[tone];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: '16px',
      background: 'var(--color-surface, #fff)',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      flex: '1 1 180px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* أيقونة دلالية شفافة في الخلفية */}
      {Icon && (
        <div style={{
          position: 'absolute',
          bottom: -16,
          left: -12,
          opacity: 0.07,
          color: color,
          pointerEvents: 'none',
        }}>
          <Icon size={72} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {label}
          {tooltip && (
            <span style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }} title={tooltip}>
              <HelpCircle size={13} style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }} />
            </span>
          )}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, zIndex: 1 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-heading)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
          {value}
        </span>
      </div>
    </div>
  );
}

const CollectionsTab: React.FC = () => {
  const navigate = useNavigate();

  const { data: overdueData, isLoading, isError, refetch } = useQuery({
    queryKey: ['finance', 'overdueInvoices'],
    queryFn: () => invoiceService.getOverdue(),
  });

  const { data: remindersData } = useQuery({
    queryKey: ['finance', 'reminders', 'scheduled'],
    queryFn: () => billingService.getReminders({ status: 'scheduled', per_page: 100 }),
  });

  const overdue = overdueData?.data ?? [];
  const totalOverdue = overdueData?.total_overdue ?? 0;
  const scheduledCount = remindersData?.data?.length ?? 0;

  // متوسط أيام التأخر للفواتير المتأخرة
  const avgDays = useMemo(() => {
    if (overdue.length === 0) return 0;
    const sum = overdue.reduce((acc, inv) => acc + getOverdueDays(inv.due_date), 0);
    return Math.round(sum / overdue.length);
  }, [overdue]);

  const columns = useMemo<Column<CaseInvoice>[]>(() => [
    { key: 'number', header: 'الفاتورة', render: (inv) => <span className="fin-docnum">{inv.invoice_number}</span> },
    { key: 'client', header: 'العميل', render: (inv) => <span className="fin-cell-strong">{inv.client?.name ?? '—'}</span> },
    { key: 'remaining', header: 'المتبقّي', numeric: true, align: 'end', render: (inv) => <span className="fin-cell-strong">{formatSAR(inv.remaining_amount)}</span> },
    {
      key: 'days',
      header: 'أيام التأخّر',
      align: 'center',
      numeric: true,
      render: (inv) => {
        const d = getOverdueDays(inv.due_date);
        return <span style={{ color: 'var(--status-red)' }}>{d} يوم</span>;
      },
    },
    {
      key: 'risk',
      header: 'درجة المخاطر',
      align: 'center',
      render: (inv) => {
        const risk = collectionRisk(getOverdueDays(inv.due_date));
        return <ToneBadge tone={risk.tone}>{risk.label}</ToneBadge>;
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'center',
      render: (inv) => (
        <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" onClick={() => navigate(`/finance/invoices/${inv.id}`)}>
          <Eye size={14} /> عرض
        </button>
      ),
    },
  ], [navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* شبكة الإحصائيات مع الأيقونات المائية الشفافة */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KpiCard tone="danger" label="فواتير متأخرة" value={String(overdue.length)} icon={AlertTriangle} tooltip="عدد الفواتير التي تجاوزت تاريخ الاستحقاق ولم تسدد بالكامل" />
        <KpiCard tone="warning" label="إجمالي المتأخر" value={formatSAR(totalOverdue)} icon={Wallet} tooltip="مجموع المبالغ المتبقية في الفواتير المتأخرة" />
        <KpiCard tone="info" label="تذكيرات مجدولة" value={`${scheduledCount} تذكير`} icon={Bell} tooltip="التنبيهات المجدولة لإرسالها للعملاء لمتابعة السداد" />
        <KpiCard tone="purple" label="متوسط أيام التأخر" value={`${avgDays} يوم`} icon={Clock} tooltip="متوسط فترة التأخر بالأيام لجميع الفواتير المتأخرة" />
      </div>

      <div className="fin-section">
        <div className="fin-section__head"><span className="fin-section__title"><Clock size={15} /> الفواتير المتأخّرة</span></div>
        <div className="fin-section__body" style={{ padding: 0 }}>
          <DataTable<CaseInvoice>
            columns={columns}
            data={overdue}
            rowKey={(inv) => inv.id}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            onRowClick={(inv) => navigate(`/finance/invoices/${inv.id}`)}
            emptyIcon={AlertTriangle}
            emptyTitle="لا توجد فواتير متأخّرة"
            emptyDesc="جميع الفواتير ضمن مواعيدها."
          />
        </div>
      </div>

      <RemindersManager />
    </div>
  );
};

export default CollectionsTab;
