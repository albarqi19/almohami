import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  X,
  Info,
  CheckCircle,
  AlertTriangle,
  Calendar,
  FileText,
  User,
  Clock,
  Search,
  Settings,
  ExternalLink,
  Trash2,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { NotificationService } from '../services/notificationService';
import type { Notification, NotificationStats } from '../services/notificationService';
import '../styles/notifications-page.css';

// ==================== Helper Functions ====================

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'task_assigned':
      return <User size={20} />;
    case 'task_due':
      return <AlertTriangle size={20} />;
    case 'hearing_reminder':
      return <Calendar size={20} />;
    case 'document_shared':
    case 'document_uploaded':
      return <FileText size={20} />;
    case 'case_update':
    case 'case_created':
      return <Info size={20} />;
    case 'system':
      return <Clock size={20} />;
    default:
      return <Bell size={20} />;
  }
};

const getIconClass = (type: string) => {
  switch (type) {
    case 'task_assigned': return 'notification-card__icon--task';
    case 'task_due': return 'notification-card__icon--warning';
    case 'hearing_reminder': return 'notification-card__icon--calendar';
    case 'document_shared':
    case 'document_uploaded': return 'notification-card__icon--document';
    case 'case_update':
    case 'case_created': return 'notification-card__icon--case';
    case 'system': return 'notification-card__icon--system';
    default: return 'notification-card__icon--system';
  }
};

const getTypeClass = (type: string) => {
  switch (type) {
    case 'task_assigned': return 'notification-card__type--task';
    case 'task_due': return 'notification-card__type--warning';
    case 'hearing_reminder': return 'notification-card__type--calendar';
    case 'document_shared':
    case 'document_uploaded': return 'notification-card__type--document';
    case 'case_update':
    case 'case_created': return 'notification-card__type--case';
    default: return 'notification-card__type--case';
  }
};

const getNotificationTypeText = (type: string) => {
  switch (type) {
    case 'task_assigned': return 'تكليف مهمة';
    case 'task_due': return 'مهمة متأخرة';
    case 'task_completed': return 'مهمة مكتملة';
    case 'hearing_reminder': return 'تذكير جلسة';
    case 'document_shared': return 'مشاركة وثيقة';
    case 'document_uploaded': return 'رفع وثيقة';
    case 'case_update': return 'تحديث قضية';
    case 'case_created': return 'قضية جديدة';
    case 'user_assigned': return 'تعيين مستخدم';
    case 'system': return 'نظام';
    default: return type;
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'الآن';
  if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `منذ ${diffInDays} يوم`;

  return date.toLocaleDateString('ar-SA');
};

// ==================== Main Component ====================

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, read: 0 });
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // جلب الإشعارات
  const loadNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const response = await NotificationService.getNotifications({
        filter: filter === 'all' ? undefined : filter,
        type: typeFilter === 'all' ? undefined : typeFilter,
        search: searchTerm || undefined,
        per_page: 50
      });

      setNotifications(response.data);
      setStats(response.stats);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('فشل في تحميل الإشعارات');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filter, typeFilter, searchTerm]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadNotifications(false);
  };

  const markAsRead = async (id: number) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setStats(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
        read: prev.read + 1
      }));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setStats(prev => ({
        ...prev,
        unread: 0,
        read: prev.total
      }));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await NotificationService.deleteNotification(id);
      const notification = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setStats(prev => ({
        total: prev.total - 1,
        unread: notification?.is_read ? prev.unread : prev.unread - 1,
        read: notification?.is_read ? prev.read - 1 : prev.read
      }));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="notifications-page">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          gap: '16px'
        }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--clickup-purple)' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>جاري تحميل الإشعارات...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="notifications-page">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          gap: '16px'
        }}>
          <AlertTriangle size={40} style={{ color: 'var(--status-red)' }} />
          <p style={{ color: 'var(--status-red)' }}>{error}</p>
          <button
            onClick={() => loadNotifications()}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'var(--clickup-purple)',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      {/* Header Bar */}
      <header className="notifications-header-bar">
        {/* Start: Title */}
        <div className="notifications-header-bar__start">
          <div className="notifications-header-bar__title">
            <Bell size={20} />
            <span>الإشعارات</span>
            {stats.unread > 0 && (
              <span className="notifications-header-bar__badge">{stats.unread}</span>
            )}
          </div>
        </div>

        {/* Center: Search + Type Filter */}
        <div className="notifications-header-bar__center">
          <div className="notifications-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="بحث في الإشعارات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="notifications-search-box__clear">
                <X size={14} />
              </button>
            )}
          </div>

          <select
            className="notifications-filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">كل الأنواع</option>
            <option value="task_assigned">تكليف مهمة</option>
            <option value="task_due">مهمة متأخرة</option>
            <option value="hearing_reminder">تذكير جلسة</option>
            <option value="document_shared">مشاركة وثيقة</option>
            <option value="case_update">تحديث قضية</option>
          </select>
        </div>

        {/* End: Actions */}
        <div className="notifications-header-bar__end">
          <button
            className="notifications-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} style={isRefreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
            {isRefreshing ? 'جاري التحديث...' : 'تحديث'}
          </button>
          <button className="notifications-btn notifications-btn--success" onClick={markAllAsRead}>
            <CheckCircle size={16} />
            تعيين الكل كمقروء
          </button>
          <button className="notifications-btn" onClick={() => navigate('/settings')}>
            <Settings size={16} />
            الإعدادات
          </button>
        </div>
      </header>

      {/* Stats Row with Filters */}
      <div className="notifications-stats">
        <div
          className={`notifications-stat ${filter === 'all' ? 'notifications-stat--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          الكل
          <span className="notifications-stat__value">{stats.total}</span>
        </div>
        <div
          className={`notifications-stat ${filter === 'unread' ? 'notifications-stat--active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          غير مقروءة
          <span className="notifications-stat__value">{stats.unread}</span>
        </div>
        <div
          className={`notifications-stat ${filter === 'read' ? 'notifications-stat--active' : ''}`}
          onClick={() => setFilter('read')}
        >
          مقروءة
          <span className="notifications-stat__value">{stats.read}</span>
        </div>
      </div>

      {/* Notifications List */}
      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="notifications-empty">
            <Bell className="notifications-empty__icon" />
            <h3 className="notifications-empty__title">لا توجد إشعارات</h3>
            <p className="notifications-empty__desc">
              {filter !== 'all' || typeFilter !== 'all' || searchTerm
                ? 'لم يتم العثور على إشعارات تطابق المعايير المحددة'
                : 'ستظهر الإشعارات هنا عند وصولها'}
            </p>
          </div>
        ) : (
          notifications.map((notification, index) => (
            <div
              key={notification.id}
              className={`notification-card ${!notification.is_read ? 'notification-card--unread' : ''}`}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => handleNotificationClick(notification)}
            >
              {/* Icon */}
              <div className={`notification-card__icon ${getIconClass(notification.type)}`}>
                {getNotificationIcon(notification.type)}
              </div>

              {/* Content */}
              <div className="notification-card__content">
                <div className="notification-card__header">
                  <h4 className="notification-card__title">{notification.title}</h4>
                  <span className={`notification-card__type ${getTypeClass(notification.type)}`}>
                    {getNotificationTypeText(notification.type)}
                  </span>
                </div>

                <p className="notification-card__message">{notification.message}</p>

                <div className="notification-card__footer">
                  <span className="notification-card__time">
                    <Clock size={14} />
                    {formatTimeAgo(notification.created_at)}
                  </span>

                  <div className="notification-card__actions">
                    {!notification.is_read && (
                      <button
                        className="notification-action-btn notification-action-btn--read"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        title="تعيين كمقروء"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    {notification.action_url && (
                      <button
                        className="notification-action-btn notification-action-btn--view"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(notification.action_url!);
                        }}
                        title="عرض التفاصيل"
                      >
                        <ExternalLink size={14} />
                      </button>
                    )}
                    <button
                      className="notification-action-btn notification-action-btn--delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      title="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Notifications;
