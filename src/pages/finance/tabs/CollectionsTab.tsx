// [P4·UX-06] تبويب التحصيل العلوي (عرض لا نظام) — لدور التحصيل/المحاسبة فقط.
// لوحة تملأ المساحة: مؤشرات ⟵ عمودان متجاوران (الفواتير المتأخّرة بدرجة المخاطر UX-11 | إدارة التذكيرات)، كلٌّ يتمرر داخلياً.
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Wallet, Bell, Eye, Clock, CheckCircle2 } from 'lucide-react';
import { invoiceService } from '../../../services/invoiceService';
import { billingService } from '../../../services/billingService';
import { DataTable } from '../../../components/erp';
import type { Column } from '../../../components/erp';
import { ToneBadge } from '../../../components/erp/StatusBadge';
import { StatTile } from '../../../components/charts/RaedCharts';
import RemindersManager from '../../../components/finance/RemindersManager';
import { formatSAR } from '../../../utils/money';
import { getOverdueDays } from '../../../utils/dueDays';
import { collectionRisk } from '../../../config/financeStatusConfig';
import type { CaseInvoice } from '../../../types/billing';

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

  // متوسط أيام التأخر، وأقدم فاتورة متأخرة
  const { avgDays, maxDays } = useMemo(() => {
    if (overdue.length === 0) return { avgDays: 0, maxDays: 0 };
    const days = overdue.map((inv) => getOverdueDays(inv.due_date));
    return { avgDays: Math.round(days.reduce((a, b) => a + b, 0) / days.length), maxDays: Math.max(...days) };
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
      // الشدة تحملها شارة «درجة المخاطر» المجاورة — الرقم بحبر الواجهة لا بلون أحمر
      render: (inv) => <span className="fin-cell-strong">{getOverdueDays(inv.due_date)} يوماً</span>,
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
        <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" onClick={(e) => { e.stopPropagation(); navigate(`/finance/invoices/${inv.id}`); }}>
          <Eye size={14} /> عرض
        </button>
      ),
    },
  ], [navigate]);

  return (
    <div className="fct rc-scope">
      <div className="fct-tiles" aria-label="مؤشرات التحصيل">
        <StatTile
          label="فواتير متأخرة"
          value={String(overdue.length)}
          icon={<AlertTriangle size={15} />}
          status={
            overdue.length > 0
              ? { tone: 'critical', text: 'تجاوزت موعد الدفع ولم تُسدَّد', icon: <AlertTriangle size={13} /> }
              : { tone: 'good', text: 'كل الفواتير في موعدها', icon: <CheckCircle2 size={13} /> }
          }
        />
        <StatTile label="إجمالي المتأخر" value={formatSAR(totalOverdue)} hint="المتبقي على الفواتير المتأخرة" icon={<Wallet size={15} />} />
        <StatTile
          label="متوسط أيام التأخر"
          value={`${avgDays} يوماً`}
          hint={maxDays > 0 ? `أقدمها متأخرة ${maxDays} يوماً` : 'لا تأخر'}
          icon={<Clock size={15} />}
        />
        <StatTile label="تذكيرات مجدولة" value={String(scheduledCount)} hint="ستُرسل للعملاء في مواعيدها" icon={<Bell size={15} />} />
      </div>

      <div className="fct-split">
        <section className="fct-split__main fin-section">
          <div className="fin-section__head"><span className="fin-section__title"><Clock size={15} /> الفواتير المتأخّرة</span></div>
          <div className="fct-split__body">
            <DataTable<CaseInvoice>
              fill
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
        </section>

        <div className="fct-split__side">
          <RemindersManager />
        </div>
      </div>
    </div>
  );
};

export default CollectionsTab;
