// [P4·UX-02] تبويب لوحة التحكم — الصورة المالية الموحّدة.
// البطاقات من /billing/dashboard (stats = getCollectionStats الإجمالية، لا من الصفحة).
// جدول «الالتزامات المالية» = تجميع فواتير CaseInvoice حسب المصدر (عقد/قضية/عميل) من جانب العميل
// (لا يوجد endpoint مجمَّع مخصّص بالباك — BILL-01 وحّد تعريف المتأخر و/stats لا التجميع).
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Banknote, Wallet, AlertTriangle, TrendingUp, FileSignature, ArrowLeft, FileText, Scale, User } from 'lucide-react';
import { billingService } from '../../../services/billingService';
import { invoiceService } from '../../../services/invoiceService';
import StatCard, { StatCardGrid } from '../../../components/erp/StatCard';
import { DataTable, StatusBadge } from '../../../components/erp';
import type { Column } from '../../../components/erp';
import { ToneBadge } from '../../../components/erp/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../../../components/erp/States';
import CollectionChart from '../../../components/billing/CollectionChart';
import { formatSAR, formatPercent, toNumber } from '../../../utils/money';
import { usePermissionContext } from '../../../contexts/PermissionContext';
import { FINANCE_PERMISSIONS } from '../../../config/financeModule';
import { INVOICE_STATUS, type StatusTone } from '../../../config/financeStatusConfig';
import type { CaseInvoice } from '../../../types/billing';
import type { MonthlyStats } from '../../../types/billing';

interface Obligation {
  key: string;
  clientName: string;
  sourceType: 'contract' | 'case' | 'client';
  sourceLabel: string;
  invoiced: number;
  collected: number;
  remaining: number;
  hasOverdue: boolean;
  allPaid: boolean;
}

const SOURCE_META: Record<Obligation['sourceType'], { icon: typeof FileText; label: string }> = {
  contract: { icon: FileText, label: 'عقد' },
  case: { icon: Scale, label: 'قضية' },
  client: { icon: User, label: 'عميل' },
};

const DashboardTab: React.FC = () => {
  const navigate = useNavigate();
  const { has } = usePermissionContext();
  const canViewReports = has(FINANCE_PERMISSIONS.reportsView);
  const currentYear = new Date().getFullYear();

  const { data: dash, isLoading: dashLoading, isError: dashError, refetch: refetchDash } = useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: () => billingService.getDashboard(),
  });

  const { data: invData, isLoading: invLoading, isError: invError, refetch: refetchInv } = useQuery({
    queryKey: ['finance', 'obligations'],
    queryFn: () => invoiceService.getInvoices({ per_page: 100 }),
  });

  const { data: yearly } = useQuery({
    queryKey: ['finance', 'yearlyStats', currentYear],
    queryFn: () => billingService.getYearlyStats(currentYear),
    enabled: canViewReports,
  });

  const stats = dash?.data?.stats;

  // تجميع الفواتير إلى التزامات حسب المصدر.
  const obligations = useMemo<Obligation[]>(() => {
    const invoices: CaseInvoice[] = invData?.data?.data ?? [];
    const map = new Map<string, Obligation>();
    for (const inv of invoices) {
      let sourceType: Obligation['sourceType'];
      let key: string;
      let sourceLabel: string;
      if (inv.contract_id) {
        sourceType = 'contract';
        key = `c-${inv.contract_id}`;
        sourceLabel = inv.contract?.contract_number ?? `عقد #${inv.contract_id}`;
      } else if (inv.case_id) {
        sourceType = 'case';
        key = `case-${inv.case_id}`;
        sourceLabel = (inv.case_model ?? inv.case)?.file_number ?? `قضية #${inv.case_id}`;
      } else {
        sourceType = 'client';
        key = `cl-${inv.client_id}`;
        sourceLabel = inv.client?.name ?? 'مباشر';
      }
      const existing = map.get(key) ?? {
        key, clientName: inv.client?.name ?? '—', sourceType, sourceLabel,
        invoiced: 0, collected: 0, remaining: 0, hasOverdue: false, allPaid: true,
      };
      existing.invoiced += toNumber(inv.total_amount);
      existing.collected += toNumber(inv.paid_amount);
      existing.remaining += toNumber(inv.remaining_amount);
      if (inv.status === 'overdue') existing.hasOverdue = true;
      if (inv.status !== 'paid') existing.allPaid = false;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.remaining - a.remaining);
  }, [invData]);

  const obligationColumns = useMemo<Column<Obligation>[]>(() => [
    { key: 'client', header: 'العميل', render: (o) => <span className="fin-cell-strong">{o.clientName}</span> },
    {
      key: 'source',
      header: 'المصدر',
      render: (o) => {
        const meta = SOURCE_META[o.sourceType];
        const Icon = meta.icon;
        return <span className="fin-source"><Icon size={14} /> {meta.label} · {o.sourceLabel}</span>;
      },
    },
    { key: 'invoiced', header: 'المُفوتَر', numeric: true, align: 'end', render: (o) => formatSAR(o.invoiced) },
    { key: 'collected', header: 'المحصّل', numeric: true, align: 'end', render: (o) => formatSAR(o.collected) },
    { key: 'remaining', header: 'المتبقّي', numeric: true, align: 'end', render: (o) => <span className="fin-cell-strong">{formatSAR(o.remaining)}</span> },
    {
      key: 'progress',
      header: 'تقدم التحصيل',
      align: 'center',
      render: (o) => {
        const rate = o.invoiced > 0 ? (o.collected / o.invoiced) * 100 : 0;
        let toneColor = 'var(--status-green)';
        if (o.hasOverdue) toneColor = 'var(--status-red)';
        else if (rate < 80) toneColor = 'var(--status-orange)';
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100, justifyContent: 'center' }}>
            <div style={{ flex: 1, height: 5, background: 'var(--color-border)', borderRadius: 2.5, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(rate, 100)}%`, height: '100%', background: toneColor, borderRadius: 2.5 }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: toneColor, fontVariantNumeric: 'tabular-nums' }}>{rate.toFixed(0)}%</span>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'الحالة',
      align: 'center',
      render: (o) => {
        let tone: StatusTone = 'warning';
        let text = 'جزئي';
        if (o.hasOverdue) { tone = 'danger'; text = 'متأخر'; }
        else if (o.allPaid) { tone = 'success'; text = 'مدفوع'; }
        else if (o.collected === 0) { tone = 'neutral'; text = 'غير محصّل'; }
        return <ToneBadge tone={tone}>{text}</ToneBadge>;
      },
    },
  ], []);

  // بيانات الرسم الشهري من yearly-stats (Record<number, MonthlyStats>) → مصفوفة.
  const chartData: MonthlyStats[] = useMemo(() => {
    const monthly = yearly?.data?.monthly;
    if (!monthly) return [];
    return Object.values(monthly);
  }, [yearly]);

  // توزيع الفواتير حسب الحالة.
  const byStatus = stats?.invoices_by_status;

  const totalInvoicesAmount = useMemo(() => {
    if (!byStatus) return 0;
    return Object.values(byStatus).reduce((acc, row) => acc + toNumber(row.total), 0);
  }, [byStatus]);

  if (dashLoading) return <LoadingState />;
  if (dashError) return <ErrorState onRetry={() => refetchDash()} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* البطاقات الست */}
      <StatCardGrid>
        <StatCard icon={Receipt} tone="neutral" value={formatSAR(stats?.total_invoiced)} label="إجمالي الفواتير" onClick={() => navigate('/finance/invoices')} />
        <StatCard icon={Banknote} tone="success" value={formatSAR(stats?.total_collected)} label="المحصّلة" />
        <StatCard icon={Wallet} tone="warning" value={formatSAR(stats?.total_remaining)} label="المتبقّية" />
        <StatCard icon={AlertTriangle} tone="danger" value={formatSAR(stats?.total_overdue)} label={`المتأخرة (${stats?.overdue_count ?? 0})`} onClick={() => navigate('/finance/invoices')} />
        <StatCard icon={TrendingUp} tone="info" value={formatPercent(stats?.collection_rate)} label="نسبة التحصيل" />
        <StatCard icon={FileSignature} tone="purple" value={stats?.total_contracts ?? 0} label="عدد العقود" onClick={() => navigate('/finance/contracts')} />
      </StatCardGrid>

      {/* جدول الالتزامات المالية الموحّد */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 className="fin-section__title">الالتزامات المالية</h3>
          <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" onClick={() => navigate('/finance/invoices')}>
            عرض الكل <ArrowLeft size={14} />
          </button>
        </div>
        <DataTable<Obligation>
          columns={obligationColumns}
          data={obligations}
          rowKey={(o) => o.key}
          isLoading={invLoading}
          isError={invError}
          onRetry={() => refetchInv()}
          emptyIcon={Receipt}
          emptyTitle="لا توجد التزامات مالية"
          emptyDesc="لم تُنشأ أي فواتير بعد."
        />
      </div>

      {/* الرسوم + التوزيع */}
      <div className="fin-panels fin-panels--2">
        {canViewReports && (
          <div className="fin-section">
            <div className="fin-section__head"><span className="fin-section__title">الإيرادات الشهرية والتحصيل ({currentYear})</span></div>
            <div className="fin-section__body">
              {chartData.length > 0 ? (
                <CollectionChart data={chartData} title="" height={280} showLegend flat={true} />
              ) : (
                <EmptyState title="لا توجد بيانات شهرية" />
              )}
            </div>
          </div>
        )}

        <div className="fin-section">
          <div className="fin-section__head"><span className="fin-section__title">توزيع الفواتير وحصص الحالات المادية</span></div>
          <div className="fin-section__body">
            {byStatus && Object.keys(byStatus).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(Object.keys(INVOICE_STATUS) as (keyof typeof INVOICE_STATUS)[]).map((st) => {
                  const row = byStatus[st];
                  if (!row || row.count === 0) return null;
                  const pct = totalInvoicesAmount > 0 ? (toNumber(row.total) / totalInvoicesAmount) * 100 : 0;
                  return (
                    <div key={st} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <StatusBadge kind="invoice" status={st} />
                          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>({row.count} فواتير)</span>
                        </div>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                          <span className="fin-line__amount">{formatSAR(row.total)}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${pct}%`, 
                            height: '100%', 
                            background: st === 'paid' ? 'var(--status-green)' : st === 'overdue' ? 'var(--status-red)' : st === 'partial' ? 'var(--status-orange)' : 'var(--color-text-secondary)',
                            borderRadius: 2 
                          }} />
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, width: 28, textAlign: 'left' }}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="لا توجد فواتير" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
