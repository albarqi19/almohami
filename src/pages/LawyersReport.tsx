import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, TrendingUp, CheckSquare, BarChart3 } from 'lucide-react';
import Modal from '../components/Modal';
import LawyerDetailContent from '../components/LawyerDetailContent';
import PresenceIndicator from '../components/PresenceIndicator';
import type { PresenceStatus } from '../components/PresenceIndicator';
import { apiClient } from '../utils/api';
import '../styles/lawyers-report.css';

interface LawyerReportData {
  id: number;
  name: string;
  avatar: string | null;
  role: string;
  presence_status: PresenceStatus;
  last_activity_at: string | null;
  last_activity_ago: string | null;
  total_cases: number;
  active_cases: number;
  won_cases: number;
  win_rate: number;
  total_tasks: number;
  completed_tasks: number;
  task_completion_rate: number;
  overdue_tasks: number;
  next_hearing_date: string | null;
  contract_value_total: number;
}

interface DateFilter {
  period: 'current_month' | 'last_3_months' | 'this_year' | 'custom';
  start_date?: string;
  end_date?: string;
}

const LawyersReport: React.FC = () => {
  const [selectedLawyer, setSelectedLawyer] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<DateFilter>({
    period: 'current_month'
  });

  // ✨ TanStack Query - بديل لـ useState + useEffect + fetchLawyersReport
  const { data: lawyers = [], isLoading: loading } = useQuery<LawyerReportData[]>({
    queryKey: ['lawyers-report', filter],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filter.period) queryParams.append('period', filter.period);
      if (filter.start_date) queryParams.append('start_date', filter.start_date);
      if (filter.end_date) queryParams.append('end_date', filter.end_date);

      const queryString = queryParams.toString();
      const endpoint = `/lawyers-report${queryString ? `?${queryString}` : ''}`;

      const response: any = await apiClient.get(endpoint);
      if (response.success) {
        return response.data;
      }
      return [];
    },
    refetchInterval: 30000, // ⏰ تحديث تلقائي كل 30 ثانية
    refetchOnWindowFocus: true, // 🔄 تحديث عند العودة للتبويب
  });

  const handleLawyerClick = (lawyerId: number) => {
    setSelectedLawyer(lawyerId);
    setIsModalOpen(true);
  };

  const handleFilterChange = (newFilter: Partial<DateFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return '#1b998b';
    if (rate >= 50) return '#f4a259';
    return '#d1495b';
  };

  const getWinRateColor = (rate: number) => {
    if (rate >= 85) return '#1b998b';
    if (rate >= 70) return '#3b82f6';
    if (rate >= 50) return '#f4a259';
    return '#d1495b';
  };

  return (
    <div className="lawyers-report-page">
      {/* Header */}
      <div className="lawyers-report-header">
        <div className="header-title-area">
          <h1>
            <Users size={18} />
            تقرير المحامين
          </h1>
          <p>متابعة أداء المحامين وإحصائيات القضايا والمهام</p>
        </div>

        <div className="header-actions">
          {/* Period Filter */}
          <div className="filter-group">
            <label>الفترة:</label>
            <select
              value={filter.period}
              onChange={(e) => handleFilterChange({ period: e.target.value as any })}
              className="filter-select"
            >
              <option value="current_month">الشهر الحالي</option>
              <option value="last_3_months">آخر 3 أشهر</option>
              <option value="this_year">هذه السنة</option>
              <option value="custom">مخصص</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {filter.period === 'custom' && (
            <div className="filter-group">
              <input
                type="date"
                value={filter.start_date || ''}
                onChange={(e) => handleFilterChange({ start_date: e.target.value })}
                className="filter-input"
              />
              <span>إلى</span>
              <input
                type="date"
                value={filter.end_date || ''}
                onChange={(e) => handleFilterChange({ end_date: e.target.value })}
                className="filter-input"
              />
            </div>
          )}
        </div>
      </div>

      {/* Lawyers Grid */}
      <div className="lawyers-report-content">
        {loading ? (
          <div className="loading-state">جاري التحميل...</div>
        ) : lawyers.length === 0 ? (
          <div className="empty-state">لا توجد بيانات محامين</div>
        ) : (
          <div className="lawyers-grid">
            {lawyers.map((lawyer, index) => (
              <motion.div
                key={lawyer.id}
                className="lawyer-card"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03, duration: 0.2 }}
                whileHover={{ y: -2 }}
                onClick={() => handleLawyerClick(lawyer.id)}
              >
                {/* Header: Small Icon + Name + Role */}
                <div className="lawyer-card-header">
                  <div className="lawyer-avatar-container">
                    <div className="lawyer-avatar">
                      {lawyer.avatar ? (
                        <img src={lawyer.avatar} alt={lawyer.name} />
                      ) : (
                        <div className="avatar-placeholder">
                          {lawyer.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="lawyer-info">
                    <h3 className="lawyer-name">{lawyer.name}</h3>
                    <p className="lawyer-role">{lawyer.role}</p>
                  </div>
                </div>

                {/* Properties List (Notion Style) */}
                <div className="card-properties">
                  {/* Status Property */}
                  <div className="card-property-row">
                    <span className="card-property-label">
                      الحالة
                    </span>
                    <PresenceIndicator
                      status={lawyer.presence_status || 'offline'}
                      lastActivityAgo={lawyer.last_activity_ago || undefined}
                      size="small"
                      showLabel={true}
                    />
                  </div>

                  <div className="card-property-row">
                    <span className="card-property-label">
                      <BarChart3 size={13} />
                      قضايا نشطة
                    </span>
                    <span className="card-property-value">{lawyer.active_cases}</span>
                  </div>

                  <div className="card-property-row">
                    <span className="card-property-label">
                      <TrendingUp size={13} />
                      معدل الفوز
                    </span>
                    <span className="card-property-value" style={{ color: getWinRateColor(lawyer.win_rate) }}>
                      {lawyer.win_rate}%
                    </span>
                  </div>

                  <div className="card-property-row">
                    <span className="card-property-label">
                      <CheckSquare size={13} />
                      إنجاز
                    </span>
                    <div className="mini-progress-bar">
                      <div
                        className="mini-progress-fill"
                        style={{
                          width: `${lawyer.task_completion_rate}%`,
                          backgroundColor: getProgressColor(lawyer.task_completion_rate)
                        }}
                      />
                    </div>
                  </div>

                  {lawyer.overdue_tasks > 0 && (
                    <div className="card-property-row">
                      <span className="card-property-label" style={{ color: '#ef4444' }}>
                        متأخرة
                      </span>
                      <span className="card-property-value" style={{ color: '#ef4444' }}>
                        {lawyer.overdue_tasks}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLawyer && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedLawyer(null);
          }}
          title={lawyers.find(l => l.id === selectedLawyer)?.name || ''}
          size="xl"
        >
          <LawyerDetailContent lawyerId={selectedLawyer} dateFilter={filter} />
        </Modal>
      )}
    </div>
  );
};

export default LawyersReport;
