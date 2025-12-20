import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  CheckSquare,
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Target,
  AlertTriangle,
  Award,
  Building,
  Timer,
  UserCheck
} from 'lucide-react';
import '../styles/statistics-page.css';

const Statistics: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<'month' | 'year' | 'detailed'>('month');

  const getStatsForPeriod = () => {
    const baseStats = {
      month: {
        totalCases: { value: 156, change: '+12.5%' },
        activeCases: { value: 89, change: '+8.3%' },
        completedTasks: { value: 234, change: '+2.1%' },
        expectedRevenue: { value: '2.4M', change: '+15.7%' },
        activeClients: { value: 67, change: '+5.2%' },
        upcomingAppointments: { value: 12, change: '+3%' }
      },
      year: {
        totalCases: { value: 1456, change: '+18.2%' },
        activeCases: { value: 234, change: '+12.1%' },
        completedTasks: { value: 2840, change: '+25.3%' },
        expectedRevenue: { value: '28.9M', change: '+22.4%' },
        activeClients: { value: 189, change: '+15.8%' },
        upcomingAppointments: { value: 45, change: '+8%' }
      },
      detailed: {
        totalCases: { value: 156, change: '+12.5%' },
        activeCases: { value: 89, change: '+8.3%' },
        completedTasks: { value: 234, change: '+2.1%' },
        expectedRevenue: { value: '2.4M', change: '+15.7%' },
        activeClients: { value: 67, change: '+5.2%' },
        upcomingAppointments: { value: 12, change: '+3%' }
      }
    };
    return baseStats[timeFilter];
  };

  const stats = getStatsForPeriod();

  const primaryStats = [
    { title: 'إجمالي القضايا', value: stats.totalCases.value, change: stats.totalCases.change, icon: <FileText size={18} />, colorClass: 'navy' },
    { title: 'القضايا النشطة', value: stats.activeCases.value, change: stats.activeCases.change, icon: <Activity size={18} />, colorClass: 'blue' },
    { title: 'المهام المكتملة', value: stats.completedTasks.value, change: stats.completedTasks.change, icon: <CheckSquare size={18} />, colorClass: 'green' },
    { title: 'الإيرادات المتوقعة', value: stats.expectedRevenue.value, change: stats.expectedRevenue.change, icon: <DollarSign size={18} />, colorClass: 'orange' },
    { title: 'العملاء النشطين', value: stats.activeClients.value, change: stats.activeClients.change, icon: <Users size={18} />, colorClass: 'navy' },
    { title: 'المواعيد القريبة', value: stats.upcomingAppointments.value, change: stats.upcomingAppointments.change, icon: <Calendar size={18} />, colorClass: 'blue' }
  ];

  const additionalStats = [
    { title: 'معدل الإنجاز', value: '94.2%', change: '+2.8%', icon: <Target size={18} />, colorClass: 'green' },
    { title: 'الجلسات المجدولة', value: 28, change: '+12%', icon: <Building size={18} />, colorClass: 'red' },
    { title: 'وقت الاستجابة', value: '2.4 ساعة', change: '-15%', icon: <Timer size={18} />, colorClass: 'orange', negative: true },
    { title: 'العملاء الجدد', value: 18, change: '+22%', icon: <UserCheck size={18} />, colorClass: 'blue' },
    { title: 'القضايا المؤجلة', value: 5, change: '-40%', icon: <AlertTriangle size={18} />, colorClass: 'orange', negative: true },
    { title: 'نسبة النجاح', value: '87.5%', change: '+3.2%', icon: <Award size={18} />, colorClass: 'green' }
  ];

  const caseTypes = [
    { name: 'تجارية', value: 35, percentage: '35%', color: 'var(--status-blue)' },
    { name: 'مدنية', value: 28, percentage: '28%', color: 'var(--status-green)' },
    { name: 'عمالية', value: 18, percentage: '18%', color: 'var(--status-orange)' },
    { name: 'أسرية', value: 12, percentage: '12%', color: 'var(--law-navy)' },
    { name: 'أخرى', value: 7, percentage: '7%', color: 'var(--quiet-gray-500)' }
  ];

  const performanceMetrics = [
    { label: 'معدل النجاح', value: '94%', desc: 'نسبة كسب القضايا', color: 'var(--status-green)' },
    { label: 'متوسط مدة القضية', value: '4.2 شهر', desc: 'الوقت المتوسط لإنهاء القضية', color: 'var(--status-blue)' },
    { label: 'رضا العملاء', value: '4.8/5', desc: 'تقييم العملاء للخدمة', color: 'var(--status-orange)' },
    { label: 'الكفاءة التشغيلية', value: '87%', desc: 'معدل استغلال الموارد', color: 'var(--law-navy)' },
    { label: 'معدل الاستجابة', value: '2.4 ساعة', desc: 'متوسط الرد على الاستفسارات', color: 'var(--status-green)' }
  ];

  const insights = [
    { label: 'الأداء العام', value: 'ممتاز', desc: 'المكتب يحقق أداءً متميزاً', color: 'var(--status-green)' },
    { label: 'توقعات الشهر القادم', value: '+18%', desc: 'نمو متوقع في القضايا الجديدة', color: 'var(--law-navy)' },
    { label: 'رضا العملاء', value: '4.8/5', desc: 'تقييم ممتاز من العملاء', color: 'var(--status-orange)' },
    { label: 'الكفاءة التشغيلية', value: '92%', desc: 'معدل استغلال موارد المكتب', color: 'var(--status-blue)' }
  ];

  return (
    <div className="stats-page">
      {/* Header */}
      <div className="stats-header">
        <div className="stats-header__title-area">
          <h1>
            <BarChart3 size={18} />
            لوحة الإحصائيات
          </h1>
          <p>تحليل شامل لأداء المكتب القانوني</p>
        </div>
        <div className="stats-header__actions">
          <div className="stats-filter-tabs">
            {[
              { key: 'month', label: 'شهري' },
              { key: 'year', label: 'سنوي' },
              { key: 'detailed', label: 'تفصيلي' }
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`stats-filter-tab ${timeFilter === key ? 'stats-filter-tab--active' : ''}`}
                onClick={() => setTimeFilter(key as any)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="stats-content">
        {/* Primary Stats */}
        <div className="stats-primary-grid">
          {primaryStats.map((stat, index) => (
            <motion.div
              key={stat.title}
              className="stats-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -2 }}
            >
              <div className={`stats-card__icon stats-card__icon--${stat.colorClass}`}>
                {stat.icon}
              </div>
              <div className="stats-card__content">
                <div className="stats-card__value">{stat.value}</div>
                <div className="stats-card__label">{stat.title}</div>
                <div className="stats-card__trend stats-card__trend--positive">
                  <TrendingUp size={10} />
                  {stat.change}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Stats */}
        <div className="stats-primary-grid">
          {additionalStats.map((stat, index) => (
            <motion.div
              key={stat.title}
              className="stats-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              whileHover={{ y: -2 }}
            >
              <div className={`stats-card__icon stats-card__icon--${stat.colorClass}`}>
                {stat.icon}
              </div>
              <div className="stats-card__content">
                <div className="stats-card__value">{stat.value}</div>
                <div className="stats-card__label">{stat.title}</div>
                <div className={`stats-card__trend ${stat.negative ? 'stats-card__trend--negative' : 'stats-card__trend--positive'}`}>
                  {stat.negative ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                  {stat.change}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Performance Insights */}
        <div className="stats-section">
          <div className="stats-section__header">
            <div className="stats-section__title">
              <div className="stats-section__title-icon">
                <TrendingUp size={14} />
              </div>
              نظرة عامة على الأداء
            </div>
          </div>
          <div className="stats-section__content">
            <div className="stats-insights-grid">
              {insights.map((insight, index) => (
                <motion.div
                  key={insight.label}
                  className="stats-insight-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                >
                  <div className="stats-insight-card__label">{insight.label}</div>
                  <div className="stats-insight-card__value" style={{ color: insight.color }}>
                    {insight.value}
                  </div>
                  <div className="stats-insight-card__desc">{insight.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Two Column: Case Types + Performance Metrics */}
        <div className="stats-two-col">
          {/* Case Types Distribution */}
          <div className="stats-section">
            <div className="stats-section__header">
              <div className="stats-section__title">
                <div className="stats-section__title-icon">
                  <PieChart size={14} />
                </div>
                توزيع أنواع القضايا
              </div>
            </div>
            <div className="stats-section__content">
              <div className="stats-chart-list">
                {caseTypes.map((item, index) => (
                  <motion.div
                    key={item.name}
                    className="stats-chart-item"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.05 }}
                  >
                    <div className="stats-chart-item__legend">
                      <div className="stats-chart-item__dot" style={{ backgroundColor: item.color }} />
                      <span className="stats-chart-item__label">{item.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="stats-chart-item__badge">({item.percentage})</span>
                      <span className="stats-chart-item__value" style={{ color: item.color }}>
                        {item.value}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="stats-section">
            <div className="stats-section__header">
              <div className="stats-section__title">
                <div className="stats-section__title-icon">
                  <Target size={14} />
                </div>
                مؤشرات الأداء
              </div>
            </div>
            <div className="stats-section__content">
              <div className="stats-metric-list">
                {performanceMetrics.map((metric, index) => (
                  <motion.div
                    key={metric.label}
                    className="stats-metric-card"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.05 }}
                  >
                    <div className="stats-metric-card__info">
                      <span className="stats-metric-card__label">{metric.label}</span>
                      <span className="stats-metric-card__desc">{metric.desc}</span>
                    </div>
                    <span className="stats-metric-card__value" style={{ color: metric.color }}>
                      {metric.value}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
