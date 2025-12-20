import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  Clock,
  DollarSign,
  Target,
  AlertCircle,
  PieChart,
  Users
} from 'lucide-react';
import '../styles/reports-page.css';

// Mock data
const mockReportsData = {
  totalCases: 45,
  activeCases: 28,
  completedCases: 15,
  pendingCases: 2,
  totalTasks: 127,
  completedTasks: 89,
  overdueTasks: 8,
  totalRevenue: 850000,
  monthlyRevenue: 125000,
  totalClients: 32,
  activeClients: 24,
  averageResolutionTime: 45,
  successRate: 92,
  casesByType: [
    { type: 'عقارية', count: 15, percentage: 33 },
    { type: 'تجارية', count: 12, percentage: 27 },
    { type: 'عمالية', count: 8, percentage: 18 },
    { type: 'أسرية', count: 6, percentage: 13 },
    { type: 'جنائية', count: 4, percentage: 9 }
  ],
  monthlyStats: [
    { month: 'أبريل', cases: 7, revenue: 78000 },
    { month: 'مايو', cases: 9, revenue: 115000 },
    { month: 'يونيو', cases: 5, revenue: 65000 },
    { month: 'يوليو', cases: 11, revenue: 145000 },
    { month: 'أغسطس', cases: 8, revenue: 98000 },
    { month: 'سبتمبر', cases: 6, revenue: 125000 }
  ],
  lawyerPerformance: [
    { name: 'أحمد محمد', cases: 12, completionRate: 95, revenue: 285000 },
    { name: 'خالد أحمد', cases: 10, completionRate: 88, revenue: 245000 },
    { name: 'محمد علي', cases: 8, completionRate: 92, revenue: 198000 }
  ]
};

const Reports: React.FC = () => {
  const [dateRange, setDateRange] = useState('last_month');
  const [reportType, setReportType] = useState('overview');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const chartColors = [
    'hsl(220, 70%, 50%)',
    'hsl(160, 70%, 45%)',
    'hsl(35, 90%, 50%)',
    'hsl(340, 75%, 55%)',
    'hsl(280, 60%, 55%)'
  ];

  return (
    <div className="reports-page">
      {/* Header with Filters */}
      <div className="reports-header">
        <div className="reports-header__title-area">
          <h1>
            <BarChart3 size={18} />
            التقارير والإحصائيات
          </h1>
          <p>متابعة الأداء وتحليل البيانات</p>
        </div>
        <div className="reports-header__actions">
          <div className="reports-filter">
            <span className="reports-filter__label">الفترة:</span>
            <select
              className="reports-filter__select"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="last_week">الأسبوع الماضي</option>
              <option value="last_month">الشهر الماضي</option>
              <option value="last_quarter">الربع الأخير</option>
              <option value="last_year">السنة الماضية</option>
            </select>
          </div>
          <div className="reports-filter">
            <span className="reports-filter__label">النوع:</span>
            <select
              className="reports-filter__select"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="overview">نظرة عامة</option>
              <option value="cases">القضايا</option>
              <option value="financial">المالي</option>
              <option value="performance">الأداء</option>
            </select>
          </div>
          <button className="reports-header__btn reports-header__btn--primary">
            <Download size={16} />
            تصدير
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="reports-content">
        {/* Primary Stats Row */}
        <div className="reports-stats-grid">
          <motion.div
            className="reports-stat-card"
            whileHover={{ y: -2 }}
          >
            <div className="reports-stat-card__icon reports-stat-card__icon--navy">
              <FileText size={18} />
            </div>
            <div className="reports-stat-card__content">
              <div className="reports-stat-card__value">{mockReportsData.totalCases}</div>
              <div className="reports-stat-card__label">إجمالي القضايا</div>
              <div className="reports-stat-card__trend reports-stat-card__trend--positive">
                <TrendingUp size={12} />
                +12%
              </div>
            </div>
          </motion.div>

          <motion.div
            className="reports-stat-card"
            whileHover={{ y: -2 }}
          >
            <div className="reports-stat-card__icon reports-stat-card__icon--green">
              <Target size={18} />
            </div>
            <div className="reports-stat-card__content">
              <div className="reports-stat-card__value">{mockReportsData.activeCases}</div>
              <div className="reports-stat-card__label">القضايا النشطة</div>
              <div className="reports-stat-card__trend reports-stat-card__trend--positive">
                <TrendingUp size={12} />
                +8%
              </div>
            </div>
          </motion.div>

          <motion.div
            className="reports-stat-card"
            whileHover={{ y: -2 }}
          >
            <div className="reports-stat-card__icon reports-stat-card__icon--orange">
              <DollarSign size={18} />
            </div>
            <div className="reports-stat-card__content">
              <div className="reports-stat-card__value">{formatCurrency(mockReportsData.monthlyRevenue)}</div>
              <div className="reports-stat-card__label">الإيرادات الشهرية</div>
              <div className="reports-stat-card__trend reports-stat-card__trend--positive">
                <TrendingUp size={12} />
                +15%
              </div>
            </div>
          </motion.div>

          <motion.div
            className="reports-stat-card"
            whileHover={{ y: -2 }}
          >
            <div className="reports-stat-card__icon reports-stat-card__icon--blue">
              <BarChart3 size={18} />
            </div>
            <div className="reports-stat-card__content">
              <div className="reports-stat-card__value">{mockReportsData.successRate}%</div>
              <div className="reports-stat-card__label">معدل النجاح</div>
              <div className="reports-stat-card__trend reports-stat-card__trend--positive">
                <TrendingUp size={12} />
                +3%
              </div>
            </div>
          </motion.div>
        </div>

        {/* Secondary Stats Row */}
        <div className="reports-stats-grid" style={{ marginBottom: '16px' }}>
          <motion.div
            className="reports-stat-card"
            whileHover={{ y: -2 }}
          >
            <div className="reports-stat-card__icon reports-stat-card__icon--green">
              <Clock size={18} />
            </div>
            <div className="reports-stat-card__content">
              <div className="reports-stat-card__value">{mockReportsData.averageResolutionTime} يوم</div>
              <div className="reports-stat-card__label">متوسط وقت الحل</div>
              <div className="reports-stat-card__trend reports-stat-card__trend--positive">
                <TrendingDown size={12} />
                -5 أيام
              </div>
            </div>
          </motion.div>

          <motion.div
            className="reports-stat-card"
            whileHover={{ y: -2 }}
          >
            <div className="reports-stat-card__icon reports-stat-card__icon--red">
              <AlertCircle size={18} />
            </div>
            <div className="reports-stat-card__content">
              <div className="reports-stat-card__value">{mockReportsData.overdueTasks}</div>
              <div className="reports-stat-card__label">المهام المتأخرة</div>
              <div className="reports-stat-card__trend reports-stat-card__trend--positive">
                <TrendingDown size={12} />
                -3
              </div>
            </div>
          </motion.div>

          <motion.div
            className="reports-stat-card"
            whileHover={{ y: -2 }}
          >
            <div className="reports-stat-card__icon reports-stat-card__icon--navy">
              <Users size={18} />
            </div>
            <div className="reports-stat-card__content">
              <div className="reports-stat-card__value">{mockReportsData.activeClients}</div>
              <div className="reports-stat-card__label">العملاء النشطون</div>
              <div className="reports-stat-card__trend reports-stat-card__trend--positive">
                <TrendingUp size={12} />
                +4
              </div>
            </div>
          </motion.div>

          <motion.div
            className="reports-stat-card"
            whileHover={{ y: -2 }}
          >
            <div className="reports-stat-card__icon reports-stat-card__icon--orange">
              <DollarSign size={18} />
            </div>
            <div className="reports-stat-card__content">
              <div className="reports-stat-card__value">{formatCurrency(mockReportsData.totalRevenue)}</div>
              <div className="reports-stat-card__label">إجمالي الإيرادات</div>
              <div className="reports-stat-card__trend reports-stat-card__trend--positive">
                <TrendingUp size={12} />
                +18%
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts Grid */}
        <div className="reports-widget-grid">
          {/* Cases by Type */}
          <div className="reports-widget">
            <div className="reports-widget__header">
              <div className="reports-widget__title">
                <div className="reports-widget__title-icon">
                  <PieChart size={14} />
                </div>
                توزيع القضايا
              </div>
            </div>
            <div className="reports-widget__content">
              <div className="reports-chart-list">
                {mockReportsData.casesByType.map((item, index) => (
                  <div key={index} className="reports-chart-item">
                    <div className="reports-chart-item__legend">
                      <div
                        className="reports-chart-item__dot"
                        style={{ backgroundColor: chartColors[index] }}
                      />
                      <span className="reports-chart-item__label">{item.type}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="reports-chart-item__value">{item.count} قضية</span>
                      <span className="reports-chart-item__badge">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly Performance */}
          <div className="reports-widget">
            <div className="reports-widget__header">
              <div className="reports-widget__title">
                <div className="reports-widget__title-icon">
                  <BarChart3 size={14} />
                </div>
                الأداء الشهري
              </div>
            </div>
            <div className="reports-widget__content">
              <div className="reports-bar-chart">
                {mockReportsData.monthlyStats.map((month, index) => (
                  <div key={index} className="reports-bar-row">
                    <span className="reports-bar-row__label">{month.month}</span>
                    <div className="reports-bar-row__track">
                      <motion.div
                        className="reports-bar-row__fill"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(month.cases / 12) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: index * 0.08 }}
                      />
                    </div>
                    <span className="reports-bar-row__value">{month.cases} قضية</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Team Performance */}
        <div className="reports-widget" style={{ marginBottom: '16px' }}>
          <div className="reports-widget__header">
            <div className="reports-widget__title">
              <div className="reports-widget__title-icon">
                <Users size={14} />
              </div>
              أداء فريق العمل
            </div>
          </div>
          <div className="reports-widget__content">
            <div className="reports-team-grid">
              {mockReportsData.lawyerPerformance.map((lawyer, index) => (
                <motion.div
                  key={index}
                  className="reports-team-card"
                  whileHover={{ y: -2 }}
                >
                  <div className="reports-team-card__header">
                    <div className="reports-team-card__avatar">
                      {lawyer.name.charAt(0)}
                    </div>
                    <div>
                      <div className="reports-team-card__name">{lawyer.name}</div>
                      <div className="reports-team-card__role">محامي رئيسي</div>
                    </div>
                  </div>
                  <div className="reports-team-card__metrics">
                    <div className="reports-team-card__metric">
                      <span className="reports-team-card__metric-label">القضايا</span>
                      <span className="reports-team-card__metric-value reports-team-card__metric-value--navy">
                        {lawyer.cases}
                      </span>
                    </div>
                    <div className="reports-team-card__metric">
                      <span className="reports-team-card__metric-label">معدل الإنجاز</span>
                      <span className="reports-team-card__metric-value reports-team-card__metric-value--green">
                        {lawyer.completionRate}%
                      </span>
                    </div>
                    <div className="reports-team-card__metric">
                      <span className="reports-team-card__metric-label">الإيرادات</span>
                      <span className="reports-team-card__metric-value">
                        {formatCurrency(lawyer.revenue)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
