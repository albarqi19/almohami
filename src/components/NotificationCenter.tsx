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
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

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
    <div className="nc-dropdown" onClick={e => e.stopPropagation()}>
      {/* Header */}
      <div className="nc-dropdown__header">
        <span className="nc-dropdown__title">
          الإشعارات
          {unreadCount > 0 && <span className="nc-dropdown__badge">{unreadCount}</span>}
        </span>
        <div className="nc-dropdown__header-actions">
          {unreadCount > 0 && (
            <button className="nc-dropdown__btn" onClick={markAllAsRead} title="قراءة الكل">
              <CheckCheck size={13} />
            </button>
          )}
          <button className="nc-dropdown__btn" onClick={loadNotifications} disabled={isLoading} title="تحديث">
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="nc-dropdown__tabs">
        {([['all', 'الكل', stats.total], ['unread', 'جديدة', unreadCount], ['important', 'مهمة', importantCount]] as const).map(([key, label, count]) => (
          <button key={key}
            className={`nc-dropdown__tab ${filter === key ? 'nc-dropdown__tab--active' : ''}`}
            onClick={() => setFilter(key as any)}
          >
            {label}{count > 0 && <span className="nc-dropdown__tab-count">{count}</span>}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="nc-dropdown__list">
        {isLoading && notifications.length === 0 ? (
          <div className="nc-dropdown__loading">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map(notification => (
            <div
              key={notification.id}
              className={`nc-row ${!notification.is_read ? 'nc-row--unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className={getIconClass(notification.type)}>
                {getTypeIcon(notification.type)}
              </div>
              <div className="nc-row__body">
                <div className="nc-row__top">
                  <span className="nc-row__title">{notification.title}</span>
                  <span className="nc-row__time">{formatTimestamp(notification.created_at)}</span>
                </div>
                <p className="nc-row__msg">{notification.message}</p>
              </div>
              <button
                className="nc-row__del"
                onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                title="حذف"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))
        ) : (
          <div className="nc-dropdown__empty">لا توجد إشعارات</div>
        )}
      </div>

      {/* Footer */}
      <Link to="/notifications" className="nc-dropdown__footer" onClick={onClose}>
        عرض الكل
      </Link>
    </div>
  );
};

export default NotificationCenter;
