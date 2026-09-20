// [P4·UX-02] تبويب لوحة التحكم — الصورة المالية الموحّدة، لوحة تملأ المساحة (النمط الملتصق).
//
// تجيب بالترتيب عن: كم حصّلنا هذا الشهر وأين نقف (البطاقات) ⟵ ما الذي يحتاج تصرفاً الآن (متأخرات / مستحقات الأسبوع /
// دفعات تنتظر التأكيد) ⟵ حالة الفواتير (توزيع المبالغ، ومنذ متى والمتبقي لم يُحصَّل) ⟵ الاتجاه الشهري ⟵ جدول الالتزامات.
//
// المصادر: /billing/dashboard (كان يُستهلك منه `stats` وحده، وبقية ما يرجعه — المتأخرات والمستحقات والدفعات والنمو —
// لم يكن معروضاً) + /billing/aging و/billing/yearly-stats لمن يملك billing.reports.view.
// جدول «الالتزامات» = تجميع أحدث 100 فاتورة حسب المصدر من جانب العميل (لا endpoint مجمَّع بالباك).
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowLeft, Banknote, CalendarClock, CheckCircle2, CircleDot, Clock, FileSignature, FileText,
  HandCoins, Hourglass, Percent, Receipt, Scale, TrendingDown, TrendingUp, User, Wallet,
} from 'lucide-react';
import { billingService } from '../../../services/billingService';
import { invoiceService } from '../../../services/invoiceService';
import { DataTable } from '../../../components/erp';
import type { Column } from '../../../components/erp';
import { ToneBadge } from '../../../components/erp/StatusBadge';
import { LoadingState, ErrorState } from '../../../components/erp/States';
import { GroupedColumnChart, Meter, SegmentBar, StatTile } from '../../../components/charts/RaedCharts';
import { formatSAR, formatPercent, toNumber } from '../../../utils/money';
import { usePermissionContext } from '../../../contexts/PermissionContext';
import { FINANCE_PERMISSIONS } from '../../../config/financeModule';
import type { StatusTone } from '../../../config/financeStatusConfig';
import type { CaseInvoice, MonthlyStats, Payment } from '../../../types/billing';

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

type ActionTab = 'overdue' | 'due' | 'pending' | 'recent';

const SOURCE_META: Record<Obligation['sourceType'], { icon: typeof FileText; label: string }> = {
  contract: { icon: FileText, label: 'عقد' },
  case: { icon: Scale, label: 'قضية' },
  client: { icon: User, label: 'عميل' },
};

const DAY_MS = 86_400_000;
const DATE_LOCALE = 'ar-SA-u-ca-gregory-nu-latn';

const shortDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(DATE_LOCALE, { day: 'numeric', month: 'short' });
};

/** الفرق بالأيام بين التاريخ واليوم (موجب = في المستقبل) */
const daysFromToday = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const b = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((a - b) / DAY_MS);
};

const DashboardTab: React.FC = () => {
  const navigate = useNavigate();
  const { has } = usePermissionContext();
  const canViewReports = has(FINANCE_PERMISSIONS.reportsView);
  const currentYear = new Date().getFullYear();
  const [actionTab, setActionTab] = useState<ActionTab>('overdue');

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

  const { data: agingData } = useQuery({
    queryKey: ['finance', 'aging'],
    queryFn: () => billingService.getAging(),
    enabled: canViewReports,
  });

  const board = dash?.data;
  const stats = board?.stats;

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
        return (
          <span className="fdb-progress">
            <Meter value={rate} tone={o.hasOverdue ? 'critical' : rate < 80 ? 'warning' : 'good'} ariaLabel={`تقدم التحصيل ${rate.toFixed(0)}%`} />
            <b>{rate.toFixed(0)}%</b>
          </span>
        );
      },
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

  // الاتجاه الشهري: مُفوتَر مقابل محصَّل — وحدة واحدة فمحور واحد
  const trend = useMemo(() => {
    const monthly = yearly?.data?.monthly;
    if (!monthly) return [];
    return (Object.values(monthly) as MonthlyStats[])
      .slice()
      .sort((a, b) => a.month - b.month)
      .map((m) => ({ label: m.month_name, values: [toNumber(m.invoiced), toNumber(m.collected)] as [number, number] }));
  }, [yearly]);

  // حالة الفواتير في أربع فئات تُقرأ دفعة واحدة (المسودات والملغاة والمستردة لا تُحسب ضمن المبالغ المطلوبة)
  const byStatus = stats?.invoices_by_status;
  const statusTotals = useMemo(() => {
    const amount = (...keys: string[]) =>
      keys.reduce((sum, k) => sum + toNumber((byStatus as Record<string, { total: number }> | undefined)?.[k]?.total), 0);
    return { paid: amount('paid'), partial: amount('partial'), outstanding: amount('sent', 'pending'), overdue: amount('overdue') };
  }, [byStatus]);

  if (dashLoading) return <LoadingState />;
  if (dashError) return <ErrorState onRetry={() => refetchDash()} />;

  const monthCollected = toNumber(board?.monthly_stats?.total_collected);
  const growth = toNumber(board?.growth?.collected);
  const hasLastMonth = toNumber(board?.last_month_stats?.total_collected) > 0;
  const overdueCount = stats?.overdue_count ?? 0;
  const collectionRate = toNumber(stats?.collection_rate);

  const aging = agingData?.data?.aging;
  const dso = agingData?.data?.dso;

  const overdueInvoices = board?.overdue_invoices ?? [];
  const dueInvoices = board?.due_invoices ?? [];
  const pendingPayments = board?.pending_payments ?? [];
  const recentPayments = board?.recent_payments ?? [];

  const actionTabs: Array<{ key: ActionTab; label: string; count: number }> = [
    { key: 'overdue', label: 'متأخرة', count: overdueCount || overdueInvoices.length },
    { key: 'due', label: 'تستحق هذا الأسبوع', count: dueInvoices.length },
    { key: 'pending', label: 'دفعات تنتظر التأكيد', count: pendingPayments.length },
    { key: 'recent', label: 'آخر المدفوعات', count: recentPayments.length },
  ];

  const invoiceRow = (inv: CaseInvoice, kind: 'overdue' | 'due') => {
    const days = daysFromToday(inv.due_date);
    const when = days === null ? '' : kind === 'overdue'
      ? (days < 0 ? `متأخرة ${Math.abs(days)} يوماً` : 'مستحقة اليوم')
      : (days <= 0 ? 'تستحق اليوم' : days === 1 ? 'تستحق غداً' : `بعد ${days} أيام`);
    return (
      <li key={inv.id}>
        <button type="button" className="fdb-item" onClick={() => navigate(`/finance/invoices/${inv.id}`)}>
          <span className="fdb-item__icon" data-tone={kind === 'overdue' ? 'critical' : 'warning'}>
            {kind === 'overdue' ? <AlertTriangle size={14} /> : <CalendarClock size={14} />}
          </span>
          <span className="fdb-item__body">
            <span className="fdb-item__title">{inv.client?.name ?? '—'}</span>
            <span className="fdb-item__meta">{inv.invoice_number} · {when}</span>
          </span>
          <span className="fdb-item__amount">{formatSAR(inv.remaining_amount ?? inv.total_amount)}</span>
        </button>
      </li>
    );
  };

  const paymentRow = (pay: Payment & { client?: { name?: string }; invoice?: { client?: { name?: string } } }, kind: 'pending' | 'recent') => (
    <li key={pay.id}>
      <button type="button" className="fdb-item" onClick={() => navigate('/finance/payments')}>
        <span className="fdb-item__icon" data-tone={kind === 'pending' ? 'warning' : 'good'}>
          {kind === 'pending' ? <Hourglass size={14} /> : <CheckCircle2 size={14} />}
        </span>
        <span className="fdb-item__body">
          <span className="fdb-item__title">{pay.client?.name ?? pay.invoice?.client?.name ?? '—'}</span>
          <span className="fdb-item__meta">{pay.payment_number} · {shortDate(pay.payment_date)}</span>
        </span>
        <span className="fdb-item__amount">{formatSAR(pay.amount)}</span>
      </button>
    </li>
  );

  const actionList =
    actionTab === 'overdue' ? overdueInvoices.map((i) => invoiceRow(i, 'overdue'))
    : actionTab === 'due' ? dueInvoices.map((i) => invoiceRow(i, 'due'))
    : actionTab === 'pending' ? pendingPayments.map((p) => paymentRow(p, 'pending'))
    : recentPayments.map((p) => paymentRow(p, 'recent'));

  const actionEmpty: Record<ActionTab, string> = {
    overdue: 'لا فواتير متأخرة — التحصيل في موعده.',
    due: 'لا فواتير تستحق خلال سبعة أيام.',
    pending: 'لا دفعات تنتظر التأكيد.',
    recent: 'لا مدفوعات مؤكدة بعد.',
  };

  return (
    <div className="fdb rc-scope">
      <div className="fdb-body">
        <div className="fdb-grid">
          {/* ─── البطاقات ─── */}
          <div className="fdb-tiles" aria-label="المؤشرات المالية">
            <StatTile
              label="المحصّل هذا الشهر"
              value={formatSAR(monthCollected)}
              icon={<HandCoins size={15} />}
              status={
                hasLastMonth
                  ? growth >= 0
                    ? { tone: 'good', text: `أعلى ${formatPercent(growth)} عن الشهر الماضي`, icon: <TrendingUp size={13} /> }
                    : { tone: 'critical', text: `أقل ${formatPercent(Math.abs(growth))} عن الشهر الماضي`, icon: <TrendingDown size={13} /> }
                  : undefined
              }
              hint={hasLastMonth ? undefined : 'لا مقارنة — الشهر الماضي بلا تحصيل'}
            />
            <StatTile
              label="المتبقي للتحصيل"
              value={formatSAR(stats?.total_remaining)}
              hint={`من ${formatSAR(stats?.total_invoiced)} مُفوتَر`}
              icon={<Wallet size={15} />}
              onClick={() => navigate('/finance/invoices')}
            />
            <StatTile
              label="المتأخر"
              value={formatSAR(stats?.total_overdue)}
              icon={<Clock size={15} />}
              status={
                overdueCount > 0
                  ? { tone: 'critical', text: `${overdueCount} فاتورة تحتاج متابعة`, icon: <AlertTriangle size={13} /> }
                  : { tone: 'good', text: 'لا متأخرات', icon: <CheckCircle2 size={13} /> }
              }
              onClick={() => navigate('/finance/collections')}
            />
            <StatTile
              label="نسبة التحصيل"
              value={formatPercent(collectionRate)}
              icon={<Percent size={15} />}
              hint={`المحصّل ${formatSAR(stats?.total_collected)}`}
              meter={{ value: collectionRate, tone: collectionRate < 60 ? 'warning' : 'good', ariaLabel: 'نسبة التحصيل' }}
            />
            <StatTile
              label="العقود"
              value={String(stats?.total_contracts ?? 0)}
              hint="كل العقود المسجّلة"
              icon={<FileSignature size={15} />}
              onClick={() => navigate('/finance/contracts')}
            />
          </div>

          {/* ─── اللوحات: موزّعة على الشبكة في الشاشات الطويلة، وعمود جانبي يتمرر داخلياً في القصيرة ─── */}
          <div className="fdb-rail">
            <article className="fdb-panel fdb-p--actions">
              <header className="fdb-panel__head">
                <h3><span className="fdb-panel__icon" aria-hidden="true"><AlertTriangle size={15} /></span>يحتاج تصرفاً</h3>
                <button type="button" className="fdb-link" onClick={() => navigate('/finance/collections')}>
                  التحصيل <ArrowLeft size={13} />
                </button>
              </header>
              <div className="fdb-chips" role="group" aria-label="نوع البنود">
                {actionTabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`fdb-chip ${actionTab === t.key ? 'is-active' : ''}`}
                    aria-pressed={actionTab === t.key}
                    onClick={() => setActionTab(t.key)}
                  >
                    {t.label}
                    <span className="fdb-chip__count">{t.count}</span>
                  </button>
                ))}
              </div>
              {actionList.length === 0 ? (
                <p className="fdb-empty">{actionEmpty[actionTab]}</p>
              ) : (
                <ul className="fdb-list">{actionList}</ul>
              )}
            </article>

            <article className="fdb-panel fdb-p--health">
              <header className="fdb-panel__head">
                <h3><span className="fdb-panel__icon" aria-hidden="true"><Receipt size={15} /></span>حالة الفواتير</h3>
                {canViewReports && dso != null && (
                  <span className="fdb-dso" title="متوسط عدد الأيام بين إصدار الفاتورة وتحصيلها (آخر 90 يوماً)">
                    متوسط أيام التحصيل <b>{Math.round(toNumber(dso))}</b>
                  </span>
                )}
              </header>

              <div className="fdb-sub">توزيع المبالغ حسب حالة الفاتورة</div>
              {/* الأخضر لا يجاور الأحمر: مدفوعة ⟵ جزئية ⟵ مستحقة ⟵ متأخرة */}
              <SegmentBar
                ariaLabel="توزيع مبالغ الفواتير حسب الحالة"
                emptyText="لا فواتير بعد"
                segments={[
                  { key: 'paid', label: 'مدفوعة', value: statusTotals.paid, valueLabel: formatSAR(statusTotals.paid), tone: 'good', icon: <CheckCircle2 size={12} /> },
                  { key: 'partial', label: 'جزئية', value: statusTotals.partial, valueLabel: formatSAR(statusTotals.partial), tone: 'series1', icon: <CircleDot size={12} /> },
                  { key: 'outstanding', label: 'مستحقة', value: statusTotals.outstanding, valueLabel: formatSAR(statusTotals.outstanding), tone: 'neutral', icon: <Clock size={12} /> },
                  { key: 'overdue', label: 'متأخرة', value: statusTotals.overdue, valueLabel: formatSAR(statusTotals.overdue), tone: 'critical', icon: <AlertTriangle size={12} /> },
                ]}
              />

              {canViewReports && aging && (
                <>
                  <div className="fdb-sub fdb-sub--gap">منذ متى والمبالغ المتبقية لم تُحصَّل؟</div>
                  {/* مقياس ترتيبي = لون واحد يتدرج مع العمر، لا ألوان متعددة */}
                  <SegmentBar
                    ariaLabel="المبالغ المتبقية بحسب عمر الفاتورة"
                    emptyText="لا مبالغ متبقية"
                    segments={[
                      { key: 'a1', label: 'أقل من شهر', value: toNumber(aging.current_0_30), valueLabel: formatSAR(aging.current_0_30), tone: 'ord1' },
                      { key: 'a2', label: 'شهر إلى شهرين', value: toNumber(aging.days_31_60), valueLabel: formatSAR(aging.days_31_60), tone: 'ord2' },
                      { key: 'a3', label: 'شهران إلى ثلاثة', value: toNumber(aging.days_61_90), valueLabel: formatSAR(aging.days_61_90), tone: 'ord3' },
                      { key: 'a4', label: 'أكثر من 3 أشهر', value: toNumber(aging.days_90_plus), valueLabel: formatSAR(aging.days_90_plus), tone: 'ord4' },
                    ]}
                  />
                </>
              )}
            </article>

            {canViewReports && (
              <article className="fdb-panel fdb-p--trend">
                <header className="fdb-panel__head">
                  <h3><span className="fdb-panel__icon" aria-hidden="true"><Banknote size={15} /></span>المُفوتَر والمحصَّل شهرياً ({currentYear})</h3>
                  <button type="button" className="fdb-link" onClick={() => navigate('/finance/reports')}>
                    التقارير <ArrowLeft size={13} />
                  </button>
                </header>
                {trend.length > 0 ? (
                  <div className="fdb-trend">
                    <GroupedColumnChart
                      title={`المُفوتَر والمحصَّل شهرياً ${currentYear}`}
                      unit="ر.س"
                      series={[{ label: 'المُفوتَر', tone: 'series1' }, { label: 'المحصَّل', tone: 'series2' }]}
                      data={trend}
                    />
                  </div>
                ) : (
                  <p className="fdb-empty">لا بيانات شهرية لهذه السنة بعد.</p>
                )}
              </article>
            )}
          </div>

          {/* ─── جدول الالتزامات ─── */}
          <section className="fdb-panel fdb-p--table">
            <header className="fdb-panel__head">
              <h3><span className="fdb-panel__icon" aria-hidden="true"><Scale size={15} /></span>الالتزامات المالية</h3>
              <button type="button" className="fdb-link" onClick={() => navigate('/finance/invoices')}>
                كل الفواتير <ArrowLeft size={13} />
              </button>
            </header>
            <div className="fdb-table">
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
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
