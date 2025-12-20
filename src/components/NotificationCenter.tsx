import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Trash2
} from 'lucide-react';
import '../styles/notification-center.css';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'reminder' | 'task' | 'case' | 'document';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  isImportant: boolean;
  actionUrl?: string;
  relatedId?: string;
  sender?: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'reminder',
    title: 'موعد جلسة محكمة',
    message: 'جلسة قضية النزاع التجاري مقررة غداً الساعة 10:00 صباحاً',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
    isRead: false,
    isImportant: true,
    actionUrl: '/cases/1',
    relatedId: 'case-1'
  },
  {
    id: '2',
    type: 'task',
    title: 'مهمة جديدة مُسندة إليك',
    message: 'تم إسناد مهمة "مراجعة العقد التجاري" إليك بواسطة أحمد محامي',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isRead: false,
    isImportant: false,
    actionUrl: '/tasks/2',
    relatedId: 'task-2',
    sender: 'أحمد محامي'
  },
  {
    id: '3',
    type: 'document',
    title: 'وثيقة جديدة مُضافة',
    message: 'تم رفع وثيقة "تقرير الخبير" إلى قضية النزاع العقاري',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    isRead: true,
    isImportant: false,
    actionUrl: '/documents/3',
    relatedId: 'doc-3',
    sender: 'سارة محامية'
  },
  {
    id: '4',
    type: 'warning',
    title: 'مهمة متأخرة',
    message: 'مهمة "إعداد مذكرة الدفاع" تجاوزت الموعد المحدد',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    isRead: true,
    isImportant: true,
    actionUrl: '/tasks/4',
    relatedId: 'task-4'
  },
  {
    id: '5',
    type: 'case',
    title: 'تحديث حالة قضية',
    message: 'تم تحديث حالة قضية "النزاع التجاري" إلى "قيد المراجعة"',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    isRead: true,
    isImportant: false,
    actionUrl: '/cases/5',
    relatedId: 'case-5',
    sender: 'محمد محامي'
  }
];

// ==================== Helper Functions ====================

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'warning': return <AlertTriangle size={18} />;
    case 'success': return <Check size={18} />;
    case 'error': return <X size={18} />;
    case 'reminder': return <Clock size={18} />;
    case 'task': return <CheckCheck size={18} />;
    case 'case': return <FileText size={18} />;
    case 'document': return <FileText size={18} />;
    default: return <Info size={18} />;
  }
};

const getIconClass = (type: string) => `nc-item__icon nc-item__icon--${type}`;

const formatTimestamp = (timestamp: Date) => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days < 7) return `منذ ${days} يوم`;
  return timestamp.toLocaleDateString('ar-SA');
};

// ==================== Main Component ====================

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onNotificationClick
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');

  useEffect(() => {
    setNotifications(mockNotifications);
  }, []);

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread': return !notification.isRead;
      case 'important': return notification.isImportant;
      default: return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const importantCount = notifications.filter(n => n.isImportant && !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) markAsRead(notification.id);
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
              <button className="notification-center__icon-btn" title="الإعدادات">
                <Settings size={16} />
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
                <span className="notification-center__tab-count">{notifications.length}</span>
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
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`nc-item ${!notification.isRead ? 'nc-item--unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={getIconClass(notification.type)}>
                  {getTypeIcon(notification.type)}
                </div>

                <div className="nc-item__content">
                  <div className="nc-item__header">
                    <h4 className="nc-item__title">
                      {notification.title}
                      {!notification.isRead && <span className="nc-item__dot nc-item__dot--unread" />}
                      {notification.isImportant && <span className="nc-item__dot nc-item__dot--important" />}
                    </h4>
                  </div>

                  <p className="nc-item__message">{notification.message}</p>

                  <div className="nc-item__footer">
                    <span className="nc-item__time">
                      <Clock size={12} />
                      {formatTimestamp(notification.timestamp)}
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
