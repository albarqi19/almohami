import React, { useState } from 'react';
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
  Trash2
} from 'lucide-react';
import type { Notification } from '../types';
import '../styles/notifications-page.css';

// Mock data for demonstration
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'مهمة جديدة تم تعيينها',
    message: 'تم تعيين مهمة "مراجعة العقد التجاري" لك من قبل المدير',
    type: 'task_assigned',
    userId: 'user-1',
    isRead: false,
    createdAt: new Date('2025-09-20T09:30:00'),
    actionUrl: '/tasks/1',
    metadata: {
      taskId: '1',
      assignedBy: 'admin',
      priority: 'high'
    }
  },
  {
    id: '2',
    title: 'موعد جلسة قريب',
    message: 'لديك جلسة محكمة غداً الساعة 10:00 صباحاً للقضية العقارية',
    type: 'hearing_reminder',
    userId: 'user-1',
    isRead: false,
    createdAt: new Date('2025-09-20T08:00:00'),
    actionUrl: '/cases/1',
    metadata: {
      caseId: '1',
      hearingDate: '2025-09-21T10:00:00',
      court: 'المحكمة التجارية'
    }
  },
  {
    id: '3',
    title: 'مهمة متأخرة',
    message: 'المهمة "إعداد مذكرة الدفاع" تجاوزت الموعد النهائي المحدد',
    type: 'task_due',
    userId: 'user-2',
    isRead: true,
    createdAt: new Date('2025-09-19T16:00:00'),
    actionUrl: '/tasks/2',
    metadata: {
      taskId: '2',
      dueDate: '2025-09-18',
      daysPastDue: 2
    }
  },
  {
    id: '4',
    title: 'وثيقة جديدة تم رفعها',
    message: 'تم رفع وثيقة جديدة "شهادة التسجيل العقاري" للقضية العقارية',
    type: 'document_shared',
    userId: 'user-1',
    isRead: true,
    createdAt: new Date('2025-09-19T14:30:00'),
    actionUrl: '/documents/2',
    metadata: {
      documentId: '2',
      caseId: '1',
      uploadedBy: 'user-2'
    }
  },
  {
    id: '5',
    title: 'تحديث حالة القضية',
    message: 'تم تحديث حالة القضية التجارية إلى "قيد المراجعة"',
    type: 'case_update',
    userId: 'user-3',
    isRead: false,
    createdAt: new Date('2025-09-19T11:15:00'),
    actionUrl: '/cases/3',
    metadata: {
      caseId: '3',
      oldStatus: 'active',
      newStatus: 'review'
    }
  },
  {
    id: '6',
    title: 'تذكير: اجتماع مع العميل',
    message: 'لديك اجتماع مع عميل القضية العقارية بعد ساعتين',
    type: 'hearing_reminder',
    userId: 'user-1',
    isRead: false,
    createdAt: new Date('2025-09-20T07:00:00'),
    actionUrl: '/cases/1',
    metadata: {
      meetingTime: '2025-09-20T11:00:00',
      clientName: 'أحمد السعيد',
      location: 'المكتب الرئيسي'
    }
  }
];

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
      return <FileText size={20} />;
    case 'case_update':
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
    case 'document_shared': return 'notification-card__icon--document';
    case 'case_update': return 'notification-card__icon--case';
    case 'system': return 'notification-card__icon--system';
    default: return 'notification-card__icon--system';
  }
};

const getTypeClass = (type: string) => {
  switch (type) {
    case 'task_assigned': return 'notification-card__type--task';
    case 'task_due': return 'notification-card__type--warning';
    case 'hearing_reminder': return 'notification-card__type--calendar';
    case 'document_shared': return 'notification-card__type--document';
    case 'case_update': return 'notification-card__type--case';
    default: return 'notification-card__type--case';
  }
};

const getNotificationTypeText = (type: string) => {
  switch (type) {
    case 'task_assigned': return 'تكليف مهمة';
    case 'task_due': return 'مهمة متأخرة';
    case 'hearing_reminder': return 'تذكير';
    case 'document_shared': return 'وثيقة';
    case 'case_update': return 'تحديث قضية';
    case 'system': return 'نظام';
    default: return type;
  }
};

const formatTimeAgo = (date: Date) => {
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
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const filteredNotifications = notifications.filter(notif => {
    const matchesFilter = filter === 'all' ||
      (filter === 'read' && notif.isRead) ||
      (filter === 'unread' && !notif.isRead);

    const matchesType = typeFilter === 'all' || notif.type === typeFilter;

    const matchesSearch = notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notif.message.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesType && matchesSearch;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const readCount = notifications.filter(n => n.isRead).length;

  return (
    <div className="notifications-page">
      {/* Header Bar */}
      <header className="notifications-header-bar">
        {/* Start: Title */}
        <div className="notifications-header-bar__start">
          <div className="notifications-header-bar__title">
            <Bell size={20} />
            <span>الإشعارات</span>
            {unreadCount > 0 && (
              <span className="notifications-header-bar__badge">{unreadCount}</span>
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
            <option value="hearing_reminder">تذكير</option>
            <option value="document_shared">وثيقة</option>
            <option value="case_update">تحديث قضية</option>
          </select>
        </div>

        {/* End: Actions */}
        <div className="notifications-header-bar__end">
          <button className="notifications-btn notifications-btn--success" onClick={markAllAsRead}>
            <CheckCircle size={16} />
            تعيين الكل كمقروء
          </button>
          <button className="notifications-btn">
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
          <span className="notifications-stat__value">{notifications.length}</span>
        </div>
        <div
          className={`notifications-stat ${filter === 'unread' ? 'notifications-stat--active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          غير مقروءة
          <span className="notifications-stat__value">{unreadCount}</span>
        </div>
        <div
          className={`notifications-stat ${filter === 'read' ? 'notifications-stat--active' : ''}`}
          onClick={() => setFilter('read')}
        >
          مقروءة
          <span className="notifications-stat__value">{readCount}</span>
        </div>
      </div>

      {/* Notifications List */}
      <div className="notifications-list">
        {filteredNotifications.length === 0 ? (
          <div className="notifications-empty">
            <Bell className="notifications-empty__icon" />
            <h3 className="notifications-empty__title">لا توجد إشعارات</h3>
            <p className="notifications-empty__desc">
              لم يتم العثور على إشعارات تطابق المعايير المحددة
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification, index) => (
            <div
              key={notification.id}
              className={`notification-card ${!notification.isRead ? 'notification-card--unread' : ''}`}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => !notification.isRead && markAsRead(notification.id)}
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
                    {formatTimeAgo(notification.createdAt)}
                  </span>

                  <div className="notification-card__actions">
                    {!notification.isRead && (
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
                    {notification.actionUrl && (
                      <button
                        className="notification-action-btn notification-action-btn--view"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to actionUrl
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
    </div>
  );
};

export default Notifications;
