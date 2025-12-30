import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  Check,
  AlertTriangle,
  Info,
  FileText,
  Clock,
  Settings,
  CheckCheck,
  Trash2,
  Loader2,
  MessageSquare,
  Calendar,
  UserPlus,
  RefreshCw
} from 'lucide-react';
import { NotificationService, type Notification as ApiNotification } from '../services/notificationService';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import '../styles/notification-center.css';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick?: (notification: ApiNotification) => void;
}

// ==================== Helper Functions ====================

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'warning':
    case 'task_overdue':
    case 'task_due':
      return <AlertTriangle size={18} />;
    case 'success': return <Check size={18} />;
    case 'error': return <X size={18} />;
    case 'hearing_reminder': return <Calendar size={18} />;
    case 'task_assigned':
    case 'task': return <CheckCheck size={18} />;
    case 'case_update':
    case 'case_assigned':
    case 'case': return <FileText size={18} />;
    case 'document_shared':
    case 'document': return <FileText size={18} />;
    case 'new_message': return <MessageSquare size={18} />;
    case 'user_created':
    case 'new_client': return <UserPlus size={18} />;
    case 'system': return <Settings size={18} />;
    default: return <Info size={18} />;
  }
};

const getIconClass = (type: string) => {
  // Map API types to CSS classes
  const typeMap: { [key: string]: string } = {
    'task_assigned': 'task',
    'task_due': 'warning',
    'task_overdue': 'warning',
    'case_update': 'case',
    'case_assigned': 'case',
    'document_shared': 'document',
    'hearing_reminder': 'reminder',
    'new_message': 'info',
    'user_created': 'success',
    'new_client': 'success',
    'system': 'info',
  };
  const cssType = typeMap[type] || type;
  return `nc-item__icon nc-item__icon--${cssType}`;
};

const formatTimestamp = (dateStr: string) => {
  const timestamp = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days < 7) return `منذ ${days} يوم`;
  return timestamp.toLocaleDateString('ar-SA');
};

// Check if notification is important based on type
const isImportantType = (type: string) => {
  return ['task_overdue', 'task_due', 'hearing_reminder', 'warning'].includes(type);
};

// ==================== Main Component ====================

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onNotificationClick
}) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, unread: 0, read: 0 });

  // Load notifications from API
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await NotificationService.getNotifications({
        per_page: 15
      });
      setNotifications(response.data);
      setStats(response.stats);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on open
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // Auto-refresh every 30 seconds when open
  useAutoRefresh({
    onRefresh: loadNotifications,
    pollingInterval: 30,
    enabled: isOpen,
    minRefreshInterval: 10,
  });

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread': return !notification.is_read;
      case 'important': return isImportantType(notification.type);
      default: return true;
    }
  });

  const unreadCount = stats.unread;
  const importantCount = notifications.filter(n => isImportantType(n.type) && !n.is_read).length;

  const markAsRead = async (id: number | string) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1), read: prev.read + 1 }));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setStats(prev => ({ ...prev, unread: 0, read: prev.total }));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const deleteNotification = async (id: number | string) => {
    try {
      await NotificationService.deleteNotification(id);
      const wasUnread = notifications.find(n => n.id === id)?.is_read === false;
      setNotifications(prev => prev.filter(n => n.id !== id));
      setStats(prev => ({
        total: prev.total - 1,
        unread: wasUnread ? prev.unread - 1 : prev.unread,
        read: wasUnread ? prev.read : prev.read - 1
      }));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleNotificationClick = (notification: ApiNotification) => {
    if (!notification.is_read) markAsRead(notification.id);

    // Navigate to action URL if available
    if (notification.action_url) {
      onClose();
      navigate(notification.action_url);
    }

    onNotificationClick?.(notification);
  };

  if (!isOpen) return null;

  return (
    <div className="notification-center-overlay" onClick={onClose}>
      <div className="notification-center" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="notification-center__header">
          <div className="notification-center__title-row">
            <h2 className="notification-center__title">
              <Bell size={20} />
              الإشعارات
              {unreadCount > 0 && (
                <span className="notification-center__badge">{unreadCount}</span>
              )}
            </h2>
            <div className="notification-center__actions">
              <button
                className="notification-center__icon-btn"
                title="تحديث"
                onClick={loadNotifications}
                disabled={isLoading}
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              </button>
              <button
                className="notification-center__icon-btn notification-center__icon-btn--close"
                onClick={onClose}
                title="إغلاق"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="notification-center__tabs">
              <button
                className={`notification-center__tab ${filter === 'all' ? 'notification-center__tab--active' : ''}`}
                onClick={() => setFilter('all')}
              >
                الكل
                <span className="notification-center__tab-count">{stats.total}</span>
              </button>
              <button
                className={`notification-center__tab ${filter === 'unread' ? 'notification-center__tab--active' : ''}`}
                onClick={() => setFilter('unread')}
              >
                غير مقروءة
                <span className="notification-center__tab-count">{unreadCount}</span>
              </button>
              <button
                className={`notification-center__tab ${filter === 'important' ? 'notification-center__tab--active' : ''}`}
                onClick={() => setFilter('important')}
              >
                مهمة
                <span className="notification-center__tab-count">{importantCount}</span>
              </button>
            </div>

            {unreadCount > 0 && (
              <button className="notification-center__quick-action" onClick={markAllAsRead}>
                <CheckCheck size={14} />
                قراءة الكل
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="notification-center__list">
          {isLoading && notifications.length === 0 ? (
            <div className="notification-center__loading">
              <Loader2 size={24} className="animate-spin" />
              <span>جاري تحميل الإشعارات...</span>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`nc-item ${!notification.is_read ? 'nc-item--unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={getIconClass(notification.type)}>
                  {getTypeIcon(notification.type)}
                </div>

                <div className="nc-item__content">
                  <div className="nc-item__header">
                    <h4 className="nc-item__title">
                      {notification.title}
                      {!notification.is_read && <span className="nc-item__dot nc-item__dot--unread" />}
                      {isImportantType(notification.type) && <span className="nc-item__dot nc-item__dot--important" />}
                    </h4>
                  </div>

                  <p className="nc-item__message">{notification.message}</p>

                  <div className="nc-item__footer">
                    <span className="nc-item__time">
                      <Clock size={12} />
                      {formatTimestamp(notification.created_at)}
                    </span>
                    <button
                      className="nc-item__delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      title="حذف"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="notification-center__empty">
              <Bell className="notification-center__empty-icon" />
              <h3 className="notification-center__empty-title">لا توجد إشعارات</h3>
              <p className="notification-center__empty-desc">ستظهر الإشعارات الجديدة هنا</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="notification-center__footer">
          <Link to="/notifications" className="notification-center__link" onClick={onClose}>
            عرض جميع الإشعارات
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
