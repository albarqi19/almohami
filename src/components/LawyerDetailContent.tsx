import React, { useState, useEffect } from 'react';
import { Mail, Briefcase, Target, CheckSquare, Calendar, FileText, ChevronRight } from 'lucide-react';
import { apiClient } from '../utils/api';

interface LawyerDetailData {
  lawyer: {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
  };
  cases: CaseData[];
  active_cases: CaseData[];
  task_stats: {
    total: number;
    completed: number;
    in_progress: number;
    overdue: number;
    completion_rate: number;
  };
  win_rate: {
    percentage: number;
    won: number;
    lost: number;
    settled: number;
    total_closed: number;
  };
  monthly_performance: MonthlyData[];
}

interface CaseData {
  id: number;
  file_number: string;
  title: string;
  status: string;
  outcome: string | null;
  client_name: string;
  case_type: string;
  priority: string;
  filing_date: string;
  next_hearing: string | null;
  contract_value: number;
}

interface MonthlyData {
  month: string;
  cases: number;
  tasks_completed: number;
}

interface PresenceLogData {
  user: {
    id: number;
    name: string;
  };
  total_active_hours: number;
  total_idle_hours: number;
  total_hours: number;
  daily_breakdown: {
    date: string;
    active_hours: number;
    idle_hours: number;
    total_hours: number;
  }[];
}

const LawyerDetailContent: React.FC<{ lawyerId: number; dateFilter: any }> = ({ lawyerId, dateFilter }) => {
  const [data, setData] = useState<LawyerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'performance' | 'presence'>('all');

  // Presence log state
  const [presenceData, setPresenceData] = useState<PresenceLogData | null>(null);
  const [presenceLoading, setPresenceLoading] = useState(false);
  const [presenceDate, setPresenceDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchLawyerDetail();
  }, [lawyerId, dateFilter]);

  useEffect(() => {
    if (activeTab === 'presence') {
      fetchPresenceLog();
    }
  }, [activeTab, presenceDate, lawyerId]);

  const fetchLawyerDetail = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (dateFilter.period) queryParams.append('period', dateFilter.period);
      if (dateFilter.start_date) queryParams.append('start_date', dateFilter.start_date);
      if (dateFilter.end_date) queryParams.append('end_date', dateFilter.end_date);

      const queryString = queryParams.toString();
      const endpoint = `/lawyers-report/${lawyerId}${queryString ? `?${queryString}` : ''}`;

      const response: any = await apiClient.get(endpoint);
      if (response.success) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch lawyer detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPresenceLog = async () => {
    setPresenceLoading(true);
    try {
      const queryString = `?user_id=${lawyerId}&start_date=${presenceDate}&end_date=${presenceDate}`;
      const response: any = await apiClient.get(`/presence/report${queryString}`);

      if (response.data && response.data.length > 0) {
        setPresenceData(response.data[0]);
      } else {
        setPresenceData(null);
      }
    } catch (error) {
      console.error('Failed to fetch presence log:', error);
      setPresenceData(null);
    } finally {
      setPresenceLoading(false);
    }
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m} دقيقة`;
    if (m === 0) return `${h} س ${m} د`;
    return `${h} ساعة ${m} د`;
  };

  if (loading) {
    return <div className="loading-state">جاري التحميل...</div>;
  }

  if (!data) {
    return <div className="error-state">فشل تحميل البيانات</div>;
  }

  // --- Notion Badge Helpers ---
  const getOutcomeBadge = (outcome: string | null) => {
    const badges: Record<string, string> = {
      won: 'badge-green',
      lost: 'badge-red',
      settled: 'badge-blue',
      appealed: 'badge-orange',
      dismissed: 'badge-gray',
    };
    if (!outcome) return <span className="notion-badge badge-gray">نشطة</span>;
    return <span className={`notion-badge ${badges[outcome] || 'badge-gray'}`}>{outcome}</span>;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      active: 'badge-blue',
      pending: 'badge-orange',
      closed: 'badge-gray',
    };
    return <span className={`notion-badge ${badges[status] || 'badge-gray'}`}>{status}</span>;
  };

  return (
    <div className="lawyer-detail-content">

      {/* 1. Properties Section (Notion Page Top) */}
      <div className="detail-properties">
        <div className="property-item">
          <div className="property-label">
            <Mail size={14} /> البريد الإلكتروني
          </div>
          <div className="property-value" style={{ fontFamily: 'var(--font-family-mono, monospace)', fontSize: '13px' }}>
            {data.lawyer.email}
          </div>
        </div>

        <div className="property-item">
          <div className="property-label">
            <Briefcase size={14} /> إجمالي القضايا
          </div>
          <div className="property-value">
            <span className="notion-badge badge-gray">{data.cases.length}</span>
          </div>
        </div>

        <div className="property-item">
          <div className="property-label">
            <Target size={14} /> معدل الفوز
          </div>
          <div className="property-value">
            <span className="notion-badge badge-green">{data.win_rate.percentage}%</span>
          </div>
        </div>

        <div className="property-item">
          <div className="property-label">
            <CheckSquare size={14} /> إنجاز المهام
          </div>
          <div className="property-value">
            <div className="mini-progress-bar" style={{ width: '100px', display: 'inline-block', verticalAlign: 'middle', marginLeft: '8px' }}>
              <div
                className="mini-progress-fill"
                style={{ width: `${data.task_stats.completion_rate}%` }}
              />
            </div>
            <span style={{ fontSize: '13px' }}>
              {data.task_stats.completed} / {data.task_stats.total}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Tabs (Notion Views) */}
      <div className="detail-tabs">
        <button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          القضايا
        </button>
        <button
          className={`tab ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          الأداء
        </button>
        <button
          className={`tab ${activeTab === 'presence' ? 'active' : ''}`}
          onClick={() => setActiveTab('presence')}
        >
          سجل الحضور
        </button>
      </div>

      {/* 3. Content Views */}
      <div className="tab-content">
        {(activeTab === 'all') && (
          <div className="cases-table-container">
            <table className="cases-table">
              <thead>
                <tr>
                  <th>رقم الملف</th>
                  <th>العنوان</th>
                  <th>العميل</th>
                  <th>النوع</th>
                  <th>الحالة</th>
                  <th>النتيجة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {data.cases.map((caseItem) => (
                  <tr key={caseItem.id}>
                    <td style={{ fontFamily: 'var(--font-family-mono, monospace)' }}>{caseItem.file_number}</td>
                    <td style={{ fontWeight: 500 }}>{caseItem.title}</td>
                    <td>{caseItem.client_name}</td>
                    <td><span className="notion-badge badge-gray">{caseItem.case_type}</span></td>
                    <td>{getStatusBadge(caseItem.status)}</td>
                    <td>{getOutcomeBadge(caseItem.outcome)}</td>
                    <td style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {caseItem.next_hearing
                        ? new Date(caseItem.next_hearing).toLocaleDateString('ar-SA')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="monthly-performance">
            <div className="chart-container">
              {data.monthly_performance.map((month, index) => (
                <div key={index} className="chart-column">
                  <div className="chart-bar-container">
                    <div className="chart-value-label">{month.cases > 0 ? month.cases : ''}</div>
                    <div
                      className="chart-bar"
                      style={{ height: `${Math.min(month.cases * 10, 100)}%` }}
                    />
                  </div>
                  <div className="chart-label">
                    {month.month}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <div className="property-item" style={{ alignItems: 'center' }}>
                <div className="property-label">إجمالي القضايا هذا العام</div>
                <div className="property-value" style={{ fontWeight: 600 }}>{data.cases.length}</div>
              </div>
              <div className="property-item" style={{ alignItems: 'center' }}>
                <div className="property-label">متوسط القضايا شهرياً</div>
                <div className="property-value" style={{ fontWeight: 600 }}>
                  {Math.round(data.cases.length / 12)}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'presence' && (
          <div className="presence-log-section">
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={14} className="text-secondary" />
              <input
                type="date"
                value={presenceDate}
                onChange={(e) => setPresenceDate(e.target.value)}
                className="filter-input"
              />
            </div>

            {presenceLoading ? (
              <div className="loading-state">جاري التحميل...</div>
            ) : presenceData ? (
              <>
                <div className="presence-summary-cards">
                  <div className="presence-metric-box">
                    <div className="presence-metric-label">🟢 نشط</div>
                    <div className="presence-metric-value">{formatHours(presenceData.total_active_hours)}</div>
                  </div>
                  <div className="presence-metric-box">
                    <div className="presence-metric-label">🟡 خامل</div>
                    <div className="presence-metric-value">{formatHours(presenceData.total_idle_hours)}</div>
                  </div>
                  <div className="presence-metric-box">
                    <div className="presence-metric-label">⏱️ الإجمالي</div>
                    <div className="presence-metric-value">{formatHours(presenceData.total_hours)}</div>
                  </div>
                </div>

                <div className="cases-table-container">
                  <table className="cases-table">
                    <thead>
                      <tr>
                        <th>التاريخ</th>
                        <th>نشط</th>
                        <th>خامل</th>
                        <th>الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {presenceData.daily_breakdown.map((day, idx) => (
                        <tr key={idx}>
                          <td>{new Date(day.date).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'short' })}</td>
                          <td style={{ color: 'var(--color-success)' }}>{formatHours(day.active_hours)}</td>
                          <td style={{ color: 'var(--color-warning)' }}>{formatHours(day.idle_hours)}</td>
                          <td style={{ fontWeight: 600 }}>{formatHours(day.total_hours)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>لا توجد سجلات لهذا اليوم</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LawyerDetailContent;
