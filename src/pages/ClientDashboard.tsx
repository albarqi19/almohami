import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Calendar,
  AlertCircle,
  Upload,
  MessageSquare,
  TrendingUp,
  Activity,
  Clock,
  ChevronLeft,
  User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/api';
import '../styles/client-dashboard.css';

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  documentsCount: number;
  upcomingHearings: number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  case_id?: number;
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  case_id?: number;
}

const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    activeCases: 0,
    documentsCount: 0,
    upcomingHearings: 0
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/client/dashboard');
      if (response.success && response.data) {
        setStats({
          totalCases: response.data.stats?.total_cases || 0,
          activeCases: response.data.stats?.active_cases || 0,
          documentsCount: response.data.stats?.documents_count || 0,
          upcomingHearings: response.data.stats?.upcoming_hearings || 0
        });
        setActivities(response.data.recent_activities || []);
        setEvents(response.data.upcoming_events || []);
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

        <Link to="/my-documents" className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">
            <Upload size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__label">الوثائق المرفوعة</div>
            <div className="stat-card__value">{stats.documentsCount}</div>
          </div>
        </Link>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--orange">
            <Calendar size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__label">الجلسات القادمة</div>
            <div className="stat-card__value">{stats.upcomingHearings}</div>
          </div>
        </div>
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
            <Link to="/my-activities" className="dashboard-section__link">
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
                      <div className="activity-item__desc">{activity.description}</div>
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
          {/* Upcoming Events */}
          <div className="dashboard-section">
            <div className="dashboard-section__header">
              <h2 className="dashboard-section__title">
                <Calendar size={18} />
                المواعيد القادمة
              </h2>
            </div>
            <div className="dashboard-section__body">
              {events.length === 0 ? (
                <div className="dashboard-empty">
                  <Calendar size={32} className="dashboard-empty__icon" />
                  <p className="dashboard-empty__text">لا توجد مواعيد قادمة</p>
                </div>
              ) : (
                events.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="event-card"
                    onClick={() => event.case_id && (window.location.href = `/my-cases/${event.case_id}`)}
                  >
                    <div className="event-card__header">
                      <AlertCircle size={16} className="event-card__icon" />
                      <span className="event-card__title">{event.title}</span>
                    </div>
                    <div className="event-card__details">
                      <div className="event-card__date">
                        {formatDate(event.date)} - {event.time}
                      </div>
                      <div className="event-card__location">{event.location}</div>
                    </div>
                  </div>
                ))
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

              <Link to="/my-documents" className="quick-action">
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
