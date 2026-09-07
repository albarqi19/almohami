import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Calendar,
  Upload,
  MessageSquare,
  TrendingUp,
  Activity,
  Clock,
  ChevronLeft,
  Gavel,
  Landmark,
  Video,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/api';
import {
  formatSessionTime,
  sessionDateParts,
  relativeDays,
  type ClientSession,
} from '../services/clientSessionService';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  documentsCount: number;
  upcomingSessions: number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  case_id?: number;
}

/**
 * شكلُ ردّ /client/dashboard كما يرسله الباك فعلاً (`ClientController::dashboard`):
 * الإحصاءات تحت `statistics` (كانت الواجهة تقرأ `stats` فتعرض أصفاراً دائماً)،
 * والجلسات الحقيقية تحت `today_sessions`/`upcoming_sessions`.
 */
interface DashboardResponse {
  success: boolean;
  data?: {
    statistics?: {
      total_cases?: number;
      active_cases?: number;
      closed_cases?: number;
      pending_tasks?: number;
      documents_count?: number;
      upcoming_sessions?: number;
      today_sessions?: number;
    };
    today_sessions?: ClientSession[];
    upcoming_sessions?: ClientSession[];
    recent_activities?: Array<{
      id: number | string;
      type?: string;
      title?: string;
      description?: string;
      created_at?: string;
      case_id?: number;
    }>;
  };
}

const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    activeCases: 0,
    documentsCount: 0,
    upcomingSessions: 0,
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [todaySessions, setTodaySessions] = useState<ClientSession[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<ClientSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<DashboardResponse>('/client/dashboard');
      if (response.success && response.data) {
        const s = response.data.statistics ?? {};
        setStats({
          totalCases: s.total_cases || 0,
          activeCases: s.active_cases || 0,
          documentsCount: s.documents_count || 0,
          upcomingSessions: s.upcoming_sessions || 0,
        });
        setActivities((response.data.recent_activities || []).map(a => ({
          id: String(a.id),
          type: a.type || '',
          // الباك يرسل صفَّ Activity خاماً (title/description/created_at)
          title: a.title || a.description || '',
          description: a.title ? (a.description || '') : '',
          date: a.created_at || '',
          case_id: a.case_id,
        })));
        setTodaySessions(response.data.today_sessions || []);
        setUpcomingSessions(response.data.upcoming_sessions || []);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'document_uploaded':
        return <Upload size={16} />;
      case 'hearing_scheduled':
        return <Calendar size={16} />;
      case 'message_received':
        return <MessageSquare size={16} />;
      default:
        return <Activity size={16} />;
    }
  };

  const getActivityIconClass = (type: string) => {
    switch (type) {
      case 'document_uploaded':
        return 'activity-item__icon--document';
      case 'hearing_scheduled':
        return 'activity-item__icon--hearing';
      case 'message_received':
        return 'activity-item__icon--message';
      default:
        return '';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'م';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('');
  };

  const renderSessionItem = (s: ClientSession) => {
    const parts = sessionDateParts(s);
    const time = formatSessionTime(s.time);
    const relative = relativeDays(s.days_remaining);
    return (
      <Link key={s.id} to={s.case ? `/my-cases/${s.case.id}` : '/my-sessions'} className="cs-dash-item">
        <div className="cs-dash-item__date">
          {parts ? (
            <>
              <span className="cs-dash-item__day">{parts.day}</span>
              <span className="cs-dash-item__month">{parts.month}</span>
            </>
          ) : (
            <span className="cs-dash-item__month">{s.date_hijri ? `${s.date_hijri} هـ` : 'غير محدد'}</span>
          )}
        </div>
        <div className="cs-dash-item__body">
          <div className="cs-dash-item__title">{s.case?.title || s.session_type || 'جلسة'}</div>
          <div className="cs-dash-item__meta">
            {time && <span><Clock size={12} style={{ verticalAlign: '-2px' }} /> {time}</span>}
            {s.court && <span><Landmark size={12} style={{ verticalAlign: '-2px' }} /> {s.court}</span>}
            {s.is_video_conference && <span><Video size={12} style={{ verticalAlign: '-2px' }} /> مرئية</span>}
            {relative && relative !== 'اليوم' && <span>{relative}</span>}
          </div>
        </div>
      </Link>
    );
  };

  if (isLoading) {
    return (
      <div className="client-dashboard">
        <div className="client-cases__loading">
          <div className="client-cases__spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="client-dashboard">
      {/* Header */}
      <div className="client-dashboard__header">
        <div className="client-dashboard__welcome">
          <div className="client-dashboard__avatar">
            {getInitials(user?.name || '')}
          </div>
          <div>
            <h1 className="client-dashboard__title">مرحباً {user?.name}</h1>
            <p className="client-dashboard__subtitle">تابع قضاياك وآخر التحديثات من هنا</p>
          </div>
        </div>
      </div>

      {/* جلسات اليوم — يظهر فقط إن وُجدت */}
      {todaySessions.length > 0 && (
        <div className="cs-today">
          <div className="cs-today__head">
            <span><Gavel size={16} /> لديك {todaySessions.length === 1 ? 'جلسة اليوم' : `${todaySessions.length} جلسات اليوم`}</span>
            <Link to="/my-sessions?scope=today" className="cs-today__link">
              عرض جلسات اليوم <ChevronLeft size={14} />
            </Link>
          </div>
          {todaySessions.map(renderSessionItem)}
        </div>
      )}

      {/* Stats */}
      <div className="client-dashboard__stats">
        <Link to="/my-cases" className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">
            <FileText size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__label">إجمالي القضايا</div>
            <div className="stat-card__value">{stats.totalCases}</div>
          </div>
        </Link>

        <Link to="/my-cases?status=active" className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">
            <TrendingUp size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__label">القضايا النشطة</div>
            <div className="stat-card__value">{stats.activeCases}</div>
          </div>
        </Link>

        <Link to="/my-documents-required" className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">
            <Upload size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__label">وثائق القضايا</div>
            <div className="stat-card__value">{stats.documentsCount}</div>
          </div>
        </Link>

        <Link to="/my-sessions" className="stat-card">
          <div className="stat-card__icon stat-card__icon--orange">
            <Gavel size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__label">الجلسات القادمة</div>
            <div className="stat-card__value">{stats.upcomingSessions}</div>
          </div>
        </Link>
      </div>

      {/* Main Content */}
      <div className="client-dashboard__content">
        {/* Activities Section */}
        <div className="dashboard-section">
          <div className="dashboard-section__header">
            <h2 className="dashboard-section__title">
              <Activity size={18} />
              آخر الأنشطة
            </h2>
            <Link to="/activities" className="dashboard-section__link">
              عرض الكل
              <ChevronLeft size={14} style={{ marginRight: 4 }} />
            </Link>
          </div>
          <div className="dashboard-section__body">
            {activities.length === 0 ? (
              <div className="dashboard-empty">
                <Activity size={32} className="dashboard-empty__icon" />
                <p className="dashboard-empty__text">لا توجد أنشطة حديثة</p>
              </div>
            ) : (
              <ul className="activity-list">
                {activities.slice(0, 5).map((activity) => (
                  <li
                    key={activity.id}
                    className="activity-item"
                    onClick={() => activity.case_id && (window.location.href = `/my-cases/${activity.case_id}`)}
                  >
                    <div className={`activity-item__icon ${getActivityIconClass(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="activity-item__content">
                      <div className="activity-item__title">{activity.title}</div>
                      {activity.description && <div className="activity-item__desc">{activity.description}</div>}
                      <div className="activity-item__date">
                        <Clock size={12} style={{ marginLeft: 4 }} />
                        {formatDate(activity.date)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="sidebar-stack">
          {/* الجلسات القادمة — من case_sessions الحقيقية */}
          <div className="dashboard-section">
            <div className="dashboard-section__header">
              <h2 className="dashboard-section__title">
                <Gavel size={18} />
                الجلسات القادمة
              </h2>
              <Link to="/my-sessions" className="dashboard-section__link">
                عرض الكل
                <ChevronLeft size={14} style={{ marginRight: 4 }} />
              </Link>
            </div>
            <div className="dashboard-section__body">
              {upcomingSessions.length === 0 ? (
                <div className="dashboard-empty">
                  <Calendar size={32} className="dashboard-empty__icon" />
                  <p className="dashboard-empty__text">لا توجد جلسات قادمة مسجّلة</p>
                </div>
              ) : (
                upcomingSessions.slice(0, 5).map(renderSessionItem)
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-section">
            <div className="dashboard-section__header">
              <h2 className="dashboard-section__title">
                إجراءات سريعة
              </h2>
            </div>
            <div className="quick-actions">
              <Link to="/my-cases" className="quick-action">
                <div className="quick-action__icon quick-action__icon--cases">
                  <FileText size={18} />
                </div>
                <span className="quick-action__text">عرض جميع القضايا</span>
              </Link>

              <Link to="/my-sessions" className="quick-action">
                <div className="quick-action__icon quick-action__icon--cases">
                  <Gavel size={18} />
                </div>
                <span className="quick-action__text">جلساتي</span>
              </Link>

              <Link to="/my-documents-required" className="quick-action">
                <div className="quick-action__icon quick-action__icon--upload">
                  <Upload size={18} />
                </div>
                <span className="quick-action__text">عرض الوثائق</span>
              </Link>

              <Link to="/my-messages" className="quick-action">
                <div className="quick-action__icon quick-action__icon--message">
                  <MessageSquare size={18} />
                </div>
                <span className="quick-action__text">الرسائل</span>
              </Link>
            </div>
          </div>

          {/* Case Summary */}
          <div className="dashboard-section">
            <div className="dashboard-section__header">
              <h2 className="dashboard-section__title">
                ملخص القضايا
              </h2>
            </div>
            <div className="case-summary">
              <div className="case-summary__item">
                <div className="case-summary__label">
                  <span className="case-summary__dot case-summary__dot--active"></span>
                  نشطة
                </div>
                <span className="case-summary__value">{stats.activeCases}</span>
              </div>
              <div className="case-summary__item">
                <div className="case-summary__label">
                  <span className="case-summary__dot case-summary__dot--closed"></span>
                  مغلقة / مسوية
                </div>
                <span className="case-summary__value">{stats.totalCases - stats.activeCases}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
