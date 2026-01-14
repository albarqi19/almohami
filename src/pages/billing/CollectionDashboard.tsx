import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  Bell,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { billingService } from '../../services/billingService';
import BillingStatsCard, { BillingStatsGrid } from '../../components/billing/BillingStatsCard';
import CollectionChart from '../../components/billing/CollectionChart';
import type { BillingDashboard, CaseInvoice, Payment, MonthlyStats } from '../../types/billing';
import '../../styles/billing-dashboard.css';

const CollectionDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // جلب لوحة التحكم
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['billingDashboard'],
    queryFn: () => billingService.getDashboard(),
  });

  // جلب الإحصائيات السنوية
  const { data: yearlyData } = useQuery({
    queryKey: ['yearlyStats', selectedYear],
    queryFn: () => billingService.getYearlyStats(selectedYear),
  });

  const dashboard = dashboardData?.data as BillingDashboard | undefined;
  const stats = dashboard?.stats;
  const monthlyChartData: MonthlyStats[] = yearlyData?.data?.monthly
    ? Object.values(yearlyData.data.monthly)
    : dashboard?.monthly_chart || [];

  // تنسيق التاريخ
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      month: 'short',
      day: 'numeric',
    });
  };

  // تنسيق المبلغ
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-SA').format(amount);
  };

  // حساب الأيام المتأخرة
  const getOverdueDays = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    return Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <p>جاري تحميل لوحة التحكم...</p>
      </div>
    );
  }

  // تنسيق المبلغ
  const formatAmountShort = (amount: number) => {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + ' م';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(0) + ' ألف';
    }
    return new Intl.NumberFormat('ar-SA').format(amount);
  };

  return (
    <div className="billing-dashboard" style={{ direction: 'rtl' }}>
      {/* الهيدر الموحد */}
      <header className="requests-header-bar">
        <div className="requests-header-bar__start">
          <div className="requests-header-bar__title">
            <TrendingUp size={20} />
            <span>لوحة التحصيل</span>
          </div>
          <div className="requests-header-bar__stats">
            <span className="request-stat-pill request-stat-pill--approved">
              <span className="request-stat-pill__dot" />
              {formatAmountShort(stats?.total_collected || 0)} محصّل
            </span>
            <span className="request-stat-pill request-stat-pill--rejected">
              <span className="request-stat-pill__dot" />
              {stats?.overdue_count || 0} متأخرة
            </span>
            <span className="request-stat-pill request-stat-pill--pending">
              <span className="request-stat-pill__dot" />
              {stats?.pending_count || 0} معلقة
            </span>
          </div>
        </div>

        <div className="requests-header-bar__center">
          <select
            className="requests-filter-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button className="requests-icon-btn" onClick={() => refetch()} title="تحديث">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="requests-header-bar__end">
          <button className="btn-secondary" onClick={() => navigate('/invoices')}>
            <Receipt size={16} />
            الفواتير
          </button>
          <button className="btn-secondary" onClick={() => navigate('/payments')}>
            <DollarSign size={16} />
            المدفوعات
          </button>
        </div>
      </header>

      {/* المحتوى الداخلي */}
      <div className="dashboard-inner" style={{ padding: '20px' }}>
        {/* بطاقات الإحصائيات */}
        <BillingStatsGrid columns={4}>
          <BillingStatsCard
            title="إجمالي المستحقات"
            value={stats?.total_invoiced || 0}
            icon={DollarSign}
            iconColor="var(--status-blue)"
            iconBgColor="var(--status-blue-light)"
            format="currency"
            trend={dashboard?.growth ? {
              value: dashboard.growth.invoiced,
              label: 'مقارنة بالشهر السابق',
            } : undefined}
          />
          <BillingStatsCard
            title="المحصّل هذا الشهر"
            value={dashboard?.monthly_stats?.total_collected || 0}
            icon={CheckCircle}
            iconColor="var(--status-green)"
            iconBgColor="var(--status-green-light)"
            format="currency"
            trend={dashboard?.growth ? {
              value: dashboard.growth.collected,
              label: 'مقارنة بالشهر السابق',
            } : undefined}
          />
          <BillingStatsCard
            title="المتأخرات"
            value={stats?.total_overdue || 0}
            icon={AlertTriangle}
            iconColor="var(--status-red)"
            iconBgColor="var(--status-red-light)"
            format="currency"
            subtitle={`${stats?.overdue_count || 0} فاتورة متأخرة`}
          />
          <BillingStatsCard
            title="نسبة التحصيل"
            value={stats?.collection_rate || 0}
            icon={TrendingUp}
            iconColor="var(--status-purple, #7c3aed)"
            iconBgColor="var(--status-purple-light, #ede9fe)"
            format="percentage"
          />
        </BillingStatsGrid>

        {/* المحتوى الرئيسي */}
        <div className="dashboard-content">
          {/* الرسم البياني */}
          <div className="chart-section">
            <div className="section-header">
              <h2>التحصيل الشهري - {selectedYear}</h2>
            </div>
            <CollectionChart
              data={monthlyChartData}
              height={300}
              showLegend={true}
            />
          </div>

          {/* القسم الجانبي */}
          <div className="side-sections">
            {/* الفواتير المتأخرة */}
            <div className="dashboard-section overdue-section">
              <div className="section-header">
                <h3>
                  <AlertTriangle size={18} className="icon-danger" />
                  الفواتير المتأخرة
                </h3>
                <button
                  className="view-all"
                  onClick={() => navigate('/invoices?status=overdue')}
                >
                  عرض الكل
                  <ChevronLeft size={16} />
                </button>
              </div>
              <div className="section-content">
                {dashboard?.overdue_invoices && dashboard.overdue_invoices.length > 0 ? (
                  <div className="invoice-list">
                    {dashboard.overdue_invoices.map((invoice: CaseInvoice) => (
                      <motion.div
                        key={invoice.id}
                        className="invoice-item overdue"
                        whileHover={{ x: -4 }}
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                      >
                        <div className="item-main">
                          <span className="invoice-number">{invoice.invoice_number}</span>
                          <span className="client-name">{invoice.client?.name}</span>
                        </div>
                        <div className="item-details">
                          <span className="amount">{formatAmount(invoice.remaining_amount)} ر.س</span>
                          <span className="overdue-days">
                            متأخرة {getOverdueDays(invoice.due_date)} يوم
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-section">
                    <CheckCircle size={32} className="icon-success" />
                    <p>لا توجد فواتير متأخرة</p>
                  </div>
                )}
              </div>
            </div>

            {/* المستحقة قريباً */}
            <div className="dashboard-section due-section">
              <div className="section-header">
                <h3>
                  <Clock size={18} className="icon-warning" />
                  مستحقة هذا الأسبوع
                </h3>
                <button
                  className="view-all"
                  onClick={() => navigate('/invoices?due_this_week=1')}
                >
                  عرض الكل
                  <ChevronLeft size={16} />
                </button>
              </div>
              <div className="section-content">
                {dashboard?.upcoming_due && dashboard.upcoming_due.length > 0 ? (
                  <div className="invoice-list">
                    {dashboard.upcoming_due.map((invoice: CaseInvoice) => (
                      <motion.div
                        key={invoice.id}
                        className="invoice-item upcoming"
                        whileHover={{ x: -4 }}
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                      >
                        <div className="item-main">
                          <span className="invoice-number">{invoice.invoice_number}</span>
                          <span className="client-name">{invoice.client?.name}</span>
                        </div>
                        <div className="item-details">
                          <span className="amount">{formatAmount(invoice.remaining_amount)} ر.س</span>
                          <span className="due-date">
                            <Calendar size={12} />
                            {formatDate(invoice.due_date)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-section">
                    <Calendar size={32} className="icon-muted" />
                    <p>لا توجد فواتير مستحقة</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* القسم السفلي */}
        <div className="dashboard-bottom">
          {/* آخر المدفوعات */}
          <div className="dashboard-section payments-section">
            <div className="section-header">
              <h3>
                <DollarSign size={18} className="icon-success" />
                آخر المدفوعات
              </h3>
              <button
                className="view-all"
                onClick={() => navigate('/payments')}
              >
                عرض الكل
                <ChevronLeft size={16} />
              </button>
            </div>
            <div className="section-content">
              {dashboard?.recent_payments && dashboard.recent_payments.length > 0 ? (
                <div className="payments-list">
                  {dashboard.recent_payments.map((payment: Payment) => (
                    <div key={payment.id} className="payment-item">
                      <div className="payment-icon">
                        <ArrowUpRight size={16} className="icon-success" />
                      </div>
                      <div className="payment-info">
                        <span className="payment-number">{payment.payment_number}</span>
                        <span className="client-name">{payment.client?.name}</span>
                      </div>
                      <div className="payment-amount">
                        +{formatAmount(payment.amount)} ر.س
                      </div>
                      <div className="payment-date">
                        {formatDate(payment.payment_date)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-section">
                  <DollarSign size={32} className="icon-muted" />
                  <p>لا توجد مدفوعات حديثة</p>
                </div>
              )}
            </div>
          </div>

          {/* الدفعات المعلقة */}
          <div className="dashboard-section pending-section">
            <div className="section-header">
              <h3>
                <Clock size={18} className="icon-warning" />
                دفعات بانتظار التأكيد
              </h3>
              <button
                className="view-all"
                onClick={() => navigate('/payments?status=pending')}
              >
                عرض الكل
                <ChevronLeft size={16} />
              </button>
            </div>
            <div className="section-content">
              {dashboard?.pending_payments && dashboard.pending_payments.length > 0 ? (
                <div className="payments-list">
                  {dashboard.pending_payments.map((payment: Payment) => (
                    <div key={payment.id} className="payment-item pending">
                      <div className="payment-icon">
                        <Clock size={16} className="icon-warning" />
                      </div>
                      <div className="payment-info">
                        <span className="payment-number">{payment.payment_number}</span>
                        <span className="client-name">{payment.client?.name}</span>
                      </div>
                      <div className="payment-amount pending">
                        {formatAmount(payment.amount)} ر.س
                      </div>
                      <button
                        className="btn-sm btn-confirm"
                        onClick={() => navigate('/payments?status=pending')}
                      >
                        مراجعة
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-section">
                  <CheckCircle size={32} className="icon-success" />
                  <p>لا توجد دفعات معلقة</p>
                </div>
              )}
            </div>
          </div>

          {/* العقود النشطة */}
          <div className="dashboard-section contracts-section">
            <div className="section-header">
              <h3>
                <Receipt size={18} className="icon-primary" />
                العقود النشطة
              </h3>
              <button
                className="view-all"
                onClick={() => navigate('/contracts?status=active')}
              >
                عرض الكل
                <ChevronLeft size={16} />
              </button>
            </div>
            <div className="section-content">
              {dashboard?.active_contracts && dashboard.active_contracts.length > 0 ? (
                <div className="contracts-list">
                  {dashboard.active_contracts.map((contract: any) => (
                    <motion.div
                      key={contract.id}
                      className="contract-item"
                      whileHover={{ x: -4 }}
                      onClick={() => navigate(`/contracts/${contract.id}`)}
                    >
                      <div className="contract-info">
                        <span className="contract-number">{contract.contract_number}</span>
                        <span className="client-name">{contract.client?.name}</span>
                      </div>
                      <div className="contract-value">
                        <span className="total">{formatAmount(contract.total_amount)} ر.س</span>
                        <span className="collected">
                          محصّل: {formatAmount(contract.paid_amount)} ر.س
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="empty-section">
                  <Receipt size={32} className="icon-muted" />
                  <p>لا توجد عقود نشطة</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* إحصائيات سريعة */}
        <div className="quick-stats">
          <div className="stat-item">
            <span className="stat-label">العقود النشطة</span>
            <span className="stat-value">{stats?.total_contracts || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">فواتير معلقة</span>
            <span className="stat-value">{stats?.pending_count || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">فواتير متأخرة</span>
            <span className="stat-value danger">{stats?.overdue_count || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">إجمالي المتبقي</span>
            <span className="stat-value">{formatAmount(stats?.total_remaining || 0)} ر.س</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionDashboardPage;
