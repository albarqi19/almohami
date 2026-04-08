import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  ArrowUpRight,
  ChevronLeft,
  RefreshCw,
  FileText,
  CreditCard,
} from 'lucide-react';
import { billingService } from '../../services/billingService';
import BillingStatsCard, { BillingStatsGrid } from '../../components/billing/BillingStatsCard';
import CollectionChart from '../../components/billing/CollectionChart';
import type { BillingDashboard, CaseInvoice, Payment, MonthlyStats } from '../../types/billing';
import '../../styles/billing-dashboard.css';

// ── Helpers ──
const fmt = (n: number) => new Intl.NumberFormat('ar-SA').format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
const overdueDays = (d: string) => Math.ceil((Date.now() - new Date(d).getTime()) / 864e5);

// ── Panel sub-component ──
interface PanelProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  accent?: 'danger' | 'warning' | 'success' | 'info';
  onViewAll?: () => void;
  children: React.ReactNode;
}

const Panel: React.FC<PanelProps> = ({ icon, title, count, accent, onViewAll, children }) => (
  <div className={`cd-panel ${accent ? `cd-panel--${accent}` : ''}`}>
    <div className="cd-panel__head">
      {icon}
      <span>{title}</span>
      <span className={`cd-badge ${accent ? `cd-badge--${accent}` : ''}`}>{count}</span>
      {onViewAll && (
        <button className="cd-link" onClick={onViewAll}>الكل <ChevronLeft size={12} /></button>
      )}
    </div>
    <div className="cd-panel__list">
      {children}
    </div>
  </div>
);

// ── Empty state ──
const Empty: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="cd-empty">{icon}<span>{text}</span></div>
);

// ── Main Component ──
const CollectionDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['billingDashboard'],
    queryFn: () => billingService.getDashboard(),
  });

  const { data: yearlyData } = useQuery({
    queryKey: ['yearlyStats', selectedYear],
    queryFn: () => billingService.getYearlyStats(selectedYear),
  });

  const dashboard = dashboardData?.data as BillingDashboard | undefined;
  const stats = dashboard?.stats;
  const monthlyChartData: MonthlyStats[] = yearlyData?.data?.monthly
    ? Object.values(yearlyData.data.monthly)
    : dashboard?.monthly_chart || [];

  if (isLoading) {
    return (
      <div className="cd-loading">
        <div className="cd-loading__spinner" />
        <span>جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="cd" dir="rtl">
      {/* ── Header ── */}
      <header className="cd-header">
        <div className="cd-header__right">
          <TrendingUp size={18} className="cd-header__icon" />
          <h1 className="cd-header__title">لوحة التحصيل</h1>
        </div>
        <div className="cd-header__left">
          <select className="cd-select" value={selectedYear} onChange={e => setSelectedYear(+e.target.value)}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="cd-icon-btn" onClick={() => refetch()} title="تحديث"><RefreshCw size={15} /></button>
          <button className="cd-nav-btn" onClick={() => navigate('/invoices')}><Receipt size={14} /><span>الفواتير</span></button>
          <button className="cd-nav-btn" onClick={() => navigate('/payments')}><CreditCard size={14} /><span>المدفوعات</span></button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="cd-body">
        {/* ── Stats Row ── */}
        <BillingStatsGrid columns={4}>
          <BillingStatsCard
            title="إجمالي المستحقات"
            value={stats?.total_invoiced || 0}
            icon={Receipt}
            iconColor="var(--law-navy)"
            iconBgColor="var(--law-navy-light, rgba(30,58,95,.08))"
            format="currency"
            trend={dashboard?.growth ? { value: dashboard.growth.invoiced, label: 'مقارنة بالشهر السابق' } : undefined}
            subtitle={`${stats?.total_contracts || 0} عقد نشط`}
          />
          <BillingStatsCard
            title="المحصّل"
            value={stats?.total_collected || 0}
            icon={TrendingUp}
            iconColor="var(--status-green)"
            iconBgColor="var(--status-green-light, rgba(5,150,105,.08))"
            format="currency"
            trend={dashboard?.growth ? { value: dashboard.growth.collected, label: 'مقارنة بالشهر السابق' } : undefined}
            subtitle={`نسبة التحصيل: ${(stats?.collection_rate || 0).toFixed(0)}%`}
          />
          <BillingStatsCard
            title="المتبقي"
            value={stats?.total_remaining || 0}
            icon={Clock}
            iconColor="var(--status-orange)"
            iconBgColor="var(--status-orange-light, rgba(217,119,6,.08))"
            format="currency"
            subtitle={`${stats?.pending_count || 0} فاتورة معلقة`}
          />
          <BillingStatsCard
            title="المتأخرات"
            value={stats?.total_overdue || 0}
            icon={AlertTriangle}
            iconColor="var(--status-red)"
            iconBgColor="var(--status-red-light, rgba(220,38,38,.08))"
            format="currency"
            subtitle={`${stats?.overdue_count || 0} فاتورة متأخرة`}
          />
        </BillingStatsGrid>

        {/* ── Middle: Chart + Alert Panels ── */}
        <div className="cd-middle">
          {/* Chart */}
          <div className="cd-chart-panel">
            <div className="cd-panel__head">
              <TrendingUp size={14} style={{ color: 'var(--law-navy)' }} />
              <span>التحصيل الشهري — {selectedYear}</span>
            </div>
            <div className="cd-chart-body">
              <CollectionChart data={monthlyChartData} height={260} showLegend={false} chartType="composed" />
            </div>
          </div>

          {/* Alerts stack */}
          <div className="cd-alerts">
            {/* Overdue */}
            <Panel
              icon={<AlertTriangle size={14} />}
              title="فواتير متأخرة"
              count={dashboard?.overdue_invoices?.length || 0}
              accent="danger"
              onViewAll={() => navigate('/invoices?status=overdue')}
            >
              {dashboard?.overdue_invoices?.length ? dashboard.overdue_invoices.map((inv: CaseInvoice) => (
                <div key={inv.id} className="cd-row cd-row--danger" onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <div className="cd-row__main">
                    <span className="cd-row__num">{inv.invoice_number}</span>
                    <span className="cd-row__name">{inv.client?.name}</span>
                  </div>
                  <span className="cd-row__amount">{fmt(inv.remaining_amount)}</span>
                  <span className="cd-tag cd-tag--danger">-{overdueDays(inv.due_date)} يوم</span>
                </div>
              )) : <Empty icon={<CheckCircle size={18} />} text="لا متأخرات" />}
            </Panel>

            {/* Due soon */}
            <Panel
              icon={<Clock size={14} />}
              title="مستحقة قريباً"
              count={dashboard?.upcoming_due?.length || 0}
              accent="warning"
              onViewAll={() => navigate('/invoices?due_this_week=1')}
            >
              {dashboard?.upcoming_due?.length ? dashboard.upcoming_due.map((inv: CaseInvoice) => (
                <div key={inv.id} className="cd-row cd-row--warning" onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <div className="cd-row__main">
                    <span className="cd-row__num">{inv.invoice_number}</span>
                    <span className="cd-row__name">{inv.client?.name}</span>
                  </div>
                  <span className="cd-row__amount">{fmt(inv.remaining_amount)}</span>
                  <span className="cd-tag cd-tag--warning"><Calendar size={10} />{fmtDate(inv.due_date)}</span>
                </div>
              )) : <Empty icon={<Calendar size={18} />} text="لا فواتير مستحقة" />}
            </Panel>
          </div>
        </div>

        {/* ── Bottom: 3 Panels ── */}
        <div className="cd-bottom">
          {/* Recent payments */}
          <Panel
            icon={<ArrowUpRight size={14} style={{ color: 'var(--status-green)' }} />}
            title="آخر المدفوعات"
            count={dashboard?.recent_payments?.length || 0}
            onViewAll={() => navigate('/payments')}
          >
            {dashboard?.recent_payments?.length ? dashboard.recent_payments.map((p: Payment) => (
              <div key={p.id} className="cd-row">
                <div className="cd-row__main">
                  <span className="cd-row__num">{p.payment_number}</span>
                  <span className="cd-row__name">{p.client?.name}</span>
                </div>
                <span className="cd-row__amount" style={{ color: 'var(--status-green)' }}>+{fmt(p.amount)}</span>
                <span className="cd-row__date">{fmtDate(p.payment_date)}</span>
              </div>
            )) : <Empty icon={<DollarSign size={18} />} text="لا مدفوعات" />}
          </Panel>

          {/* Pending payments */}
          <Panel
            icon={<Clock size={14} />}
            title="بانتظار التأكيد"
            count={dashboard?.pending_payments?.length || 0}
            accent="warning"
            onViewAll={() => navigate('/payments?status=pending')}
          >
            {dashboard?.pending_payments?.length ? dashboard.pending_payments.map((p: Payment) => (
              <div key={p.id} className="cd-row">
                <div className="cd-row__main">
                  <span className="cd-row__num">{p.payment_number}</span>
                  <span className="cd-row__name">{p.client?.name}</span>
                </div>
                <span className="cd-row__amount" style={{ color: 'var(--status-orange)' }}>{fmt(p.amount)}</span>
                <button className="cd-review-btn" onClick={() => navigate('/payments?status=pending')}>مراجعة</button>
              </div>
            )) : <Empty icon={<CheckCircle size={18} />} text="لا دفعات معلقة" />}
          </Panel>

          {/* Active contracts */}
          <Panel
            icon={<FileText size={14} style={{ color: 'var(--status-blue)' }} />}
            title="العقود النشطة"
            count={stats?.total_contracts || 0}
            accent="info"
            onViewAll={() => navigate('/contracts?status=active')}
          >
            {dashboard?.active_contracts?.length ? dashboard.active_contracts.map((c: any) => (
              <div key={c.id} className="cd-row" onClick={() => navigate(`/contracts/${c.id}`)}>
                <div className="cd-row__main">
                  <span className="cd-row__num">{c.contract_number}</span>
                  <span className="cd-row__name">{c.client?.name}</span>
                </div>
                <span className="cd-row__amount">{fmt(c.total_amount)}</span>
                <span className="cd-tag cd-tag--success">محصّل {fmt(c.paid_amount)}</span>
              </div>
            )) : <Empty icon={<FileText size={18} />} text="لا عقود" />}
          </Panel>
        </div>
      </div>
    </div>
  );
};

export default CollectionDashboardPage;
