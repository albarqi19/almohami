import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Trophy, CheckSquare, Star, Briefcase, Share2 } from 'lucide-react';
import Modal from '../components/Modal';
import LawyerDetailContent from '../components/LawyerDetailContent';
import PresenceIndicator from '../components/PresenceIndicator';
import type { PresenceStatus } from '../components/PresenceIndicator';
import { apiClient } from '../utils/api';
import type { BucketCounts, PerformanceBreakdown } from '../utils/lawyerExportHelpers';
import '../styles/lawyers-report.css';

interface LawyerReportRow {
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
  breakdown: PerformanceBreakdown;
}

const LawyersReport: React.FC = () => {
  const [selectedLawyer, setSelectedLawyer] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // All-time stats by default. Per-card date range may be applied later
  // from inside the detail modal via the existing dateFilter prop.
  const { data: lawyers = [], isLoading: loading } = useQuery<LawyerReportRow[]>({
    queryKey: ['lawyers-report'],
    queryFn: async () => {
      const response: any = await apiClient.get('/lawyers-report');
      if (response.success) return response.data;
      return [];
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const handleLawyerClick = (lawyerId: number) => {
    setSelectedLawyer(lawyerId);
    setIsModalOpen(true);
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
            تقرير الأداء
          </h1>
          <p>متابعة أداء الفريق وعلاقتهم بالقضايا (مسؤول / طرف / مشارك)</p>
        </div>
      </div>

      {/* Lawyers Grid */}
      <div className="lawyers-report-content">
        {loading ? (
          <div className="loading-state">جاري التحميل...</div>
        ) : lawyers.length === 0 ? (
          <div className="empty-state">لا توجد بيانات</div>
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
                {/* Header: Avatar + Name + Role */}
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
                    <p className="lawyer-role">{roleLabel(lawyer.role)}</p>
                  </div>
                </div>

                {/* Properties */}
                <div className="card-properties">
                  {/* Presence */}
                  <div className="card-property-row">
                    <span className="card-property-label">الحالة</span>
                    <PresenceIndicator
                      status={lawyer.presence_status || 'offline'}
                      lastActivityAgo={lawyer.last_activity_ago || undefined}
                      size="small"
                      showLabel={true}
                    />
                  </div>

                  {/* Three-dimensional breakdown */}
                  <BreakdownBlock breakdown={lawyer.breakdown} />

                  {/* Win rate */}
                  <div className="card-property-row">
                    <span className="card-property-label">
                      <Trophy size={13} />
                      معدل الفوز
                    </span>
                    <span className="card-property-value" style={{ color: getWinRateColor(lawyer.win_rate) }}>
                      {lawyer.win_rate}%
                    </span>
                  </div>

                  {/* Task completion */}
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
      {selectedLawyer && (() => {
        const selected = lawyers.find(l => l.id === selectedLawyer);
        return (
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedLawyer(null);
            }}
            title={selected?.name || ''}
            size="xl"
          >
            <LawyerDetailContent
              lawyerId={selectedLawyer}
              dateFilter={{}}
              presence={selected ? {
                status: selected.presence_status || 'offline',
                lastActivityAgo: selected.last_activity_ago,
              } : undefined}
            />
          </Modal>
        );
      })()}
    </div>
  );
};

// =====================================================================
// BreakdownBlock — three dimensions × {active, closed}
// =====================================================================

const EMPTY_COUNTS: BucketCounts = { active: 0, closed: 0, total: 0 };

const BreakdownBlock: React.FC<{ breakdown?: PerformanceBreakdown }> = ({ breakdown }) => {
  // Defensive: an older backend (pre-2026-05-18) won't include `breakdown` —
  // render zeroes instead of crashing while CI/CD rolls out.
  const b = breakdown ?? { responsible: EMPTY_COUNTS, party: EMPTY_COUNTS, shared: EMPTY_COUNTS };

  return (
    <div className="lawyer-breakdown">
      <BreakdownRow
        icon={<Star size={12} />}
        label="مسؤول عنها"
        counts={b.responsible ?? EMPTY_COUNTS}
        prominence="primary"
      />
      <BreakdownRow
        icon={<Briefcase size={12} />}
        label="طرف فيها"
        counts={b.party ?? EMPTY_COUNTS}
        prominence="primary"
      />
      <BreakdownRow
        icon={<Share2 size={12} />}
        label="مشارك فيها"
        counts={b.shared ?? EMPTY_COUNTS}
        prominence="muted"
      />
    </div>
  );
};

const BreakdownRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  counts: BucketCounts;
  prominence: 'primary' | 'muted';
}> = ({ icon, label, counts, prominence }) => (
  <div className={`lawyer-breakdown__row lawyer-breakdown__row--${prominence}`}>
    <span className="lawyer-breakdown__label">
      {icon}
      {label}
    </span>
    <span className="lawyer-breakdown__counts">
      <span className="lawyer-breakdown__pill lawyer-breakdown__pill--active" title="نشطة">
        {counts.active}
      </span>
      <span className="lawyer-breakdown__pill lawyer-breakdown__pill--closed" title="مغلقة">
        {counts.closed}
      </span>
    </span>
  </div>
);

function roleLabel(r: string): string {
  const map: Record<string, string> = {
    admin: 'مدير النظام',
    owner: 'مالك',
    partner: 'شريك',
    senior_lawyer: 'محامي أول',
    lawyer: 'محامي',
    legal_assistant: 'مساعد قانوني',
  };
  return map[r] || r;
}

export default LawyersReport;
