import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
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
  RefreshCw,
  EyeOff,
  Briefcase
} from 'lucide-react';
import { NotificationService } from '../services/notificationService';
import type { Notification, NotificationStats } from '../services/notificationService';
import '../styles/notifications-page.css';

// ==================== Helper Functions ====================

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'task_assigned':
      return <User size={18} />;
    case 'task_due':
      return <AlertTriangle size={18} />;
    case 'hearing_reminder':
      return <Calendar size={18} />;
    case 'document_shared':
    case 'document_uploaded':
      return <FileText size={18} />;
    case 'case_update':
    case 'case_created':
      return <Briefcase size={18} />;
    case 'system':
      return <Clock size={18} />;
    default:
      return <Bell size={18} />;
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
    default: return 'نظام';
  }
};

const getNotificationTip = (type: string) => {
  switch (type) {
    case 'task_assigned':
      return 'هذه المهمة تم إسنادها إليك. يُرجى مراجعة تفاصيلها والالتزام بالموعد المحدد.';
    case 'task_due':
      return 'تنبيه هام! هذه المهمة تجاوزت تاريخ الاستحقاق المقدر لها. يرجى إنجازها فوراً أو مراجعة المشرف.';
    case 'hearing_reminder':
      return 'تذكير بخصوص جلسة قضائية قادمة. يرجى إعداد المذكرات اللازمة والتنسيق مع العميل.';
    case 'document_shared':
    case 'document_uploaded':
      return 'تم رفع أو مشاركة وثيقة جديدة معك. يمكنك استعراضها وتحميلها للعمل عليها.';
    case 'case_update':
    case 'case_created':
      return 'حدث تحديث على ملف القضية. يُرجى مراجعة التطورات الجديدة وتحديث بيانات العميل.';
    default:
      return 'إشعار نظام لإعلامك بالنشاطات والتحديثات الجارية في المنصة.';
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

  return date.toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// ==================== Main Component ====================

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [rawNotifications, setRawNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, read: 0 });
  
  // الفلاتر
  const [activeCategory, setActiveCategory] = useState<'all' | 'unread' | 'tasks' | 'hearings' | 'documents' | 'cases' | 'system'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // حالات التحميل والنافذة الجانبية
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // جلب الإشعارات دفعة واحدة من الخادم
  const loadNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      // نجلب كمية كافية (100 تنبيه) للفلترة السريعة محلياً دون طلبات إضافية
      const response = await NotificationService.getNotifications({
        per_page: 100
      });

      setRawNotifications(response.data);
      setStats(response.stats);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('فشل في تحميل الإشعارات');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

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
      setRawNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setStats(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
        read: prev.read + 1
      }));
      setSelectedNotification(prev => prev && prev.id === id ? { ...prev, is_read: true } : prev);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const toggleReadStatus = async (notification: Notification) => {
    try {
      if (notification.is_read) {
        // تحديد كغير مقروء محلياً للتأثير الفوري
        setRawNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: false } : n)
        );
        setStats(prev => ({
          ...prev,
          unread: prev.unread + 1,
          read: Math.max(0, prev.read - 1)
        }));
        setSelectedNotification(prev => prev ? { ...prev, is_read: false } : null);
        toast.info('تم التحديد كغير مقروء');
      } else {
        await markAsRead(notification.id);
      }
    } catch (err) {
      console.error('Failed to toggle read status:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      setRawNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setStats(prev => ({
        ...prev,
        unread: 0,
        read: prev.total
      }));
      if (selectedNotification) {
        setSelectedNotification(prev => prev ? { ...prev, is_read: true } : null);
      }
      toast.success('تم تعيين جميع الإشعارات كمقروءة');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      toast.error('تعذر تعيين الكل كمقروء');
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await NotificationService.deleteNotification(id);
      const target = rawNotifications.find(n => n.id === id);
      setRawNotifications(prev => prev.filter(n => n.id !== id));
      setStats(prev => ({
        total: prev.total - 1,
        unread: target?.is_read ? prev.unread : Math.max(0, prev.unread - 1),
        read: target?.is_read ? Math.max(0, prev.read - 1) : prev.read
      }));
      if (selectedNotification && selectedNotification.id === id) {
        setSelectedNotification(null);
      }
      toast.success('تم حذف الإشعار');
    } catch (err) {
      console.error('Failed to delete notification:', err);
      toast.error('تعذر حذف الإشعار');
    }
  };

  const handleClearRead = async () => {
    try {
      await NotificationService.clearReadNotifications();
      setRawNotifications(prev => prev.filter(n => !n.is_read));
      setStats(prev => ({
        total: prev.unread,
        unread: prev.unread,
        read: 0
      }));
      setSelectedNotification(prev => prev && prev.is_read ? null : prev);
      toast.success('تم حذف الإشعارات المقروءة بنجاح');
    } catch (err) {
      console.error('Failed to clear read notifications:', err);
      toast.error('فشل في حذف الإشعارات المقروءة');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  // الفلترة الفورية والمحلية لكافة المدخلات بدون استدعاء API (UX فوري 0ms)
  const filteredNotifications = useMemo(() => {
    let result = [...rawNotifications];

    // 1. الفرز حسب القسم الجانبي
    if (activeCategory === 'unread') {
      result = result.filter(n => !n.is_read);
    } else if (activeCategory === 'tasks') {
      result = result.filter(n => ['task_assigned', 'task_due', 'task_completed'].includes(n.type));
    } else if (activeCategory === 'hearings') {
      result = result.filter(n => n.type === 'hearing_reminder');
    } else if (activeCategory === 'documents') {
      result = result.filter(n => ['document_shared', 'document_uploaded'].includes(n.type));
    } else if (activeCategory === 'cases') {
      result = result.filter(n => ['case_update', 'case_created'].includes(n.type));
    } else if (activeCategory === 'system') {
      result = result.filter(n => ['system', 'user_assigned'].includes(n.type));
    }

    // 2. الفرز حسب القائمة المنسدلة للأنواع
    if (typeFilter !== 'all') {
      result = result.filter(n => n.type === typeFilter);
    }

    // 3. الفرز حسب نص البحث
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(term) || 
        n.message.toLowerCase().includes(term)
      );
    }

    return result;
  }, [rawNotifications, activeCategory, typeFilter, searchTerm]);

  // حساب أعداد التصنيفات بالكامل محلياً (ثابت ودائم للتصنيفات الجانبية)
  const localStats = useMemo(() => {
    return {
      all: rawNotifications.length,
      unread: rawNotifications.filter(n => !n.is_read).length,
      tasks: rawNotifications.filter(n => ['task_assigned', 'task_due', 'task_completed'].includes(n.type)).length,
      hearings: rawNotifications.filter(n => n.type === 'hearing_reminder').length,
      documents: rawNotifications.filter(n => ['document_shared', 'document_uploaded'].includes(n.type)).length,
      cases: rawNotifications.filter(n => ['case_update', 'case_created'].includes(n.type)).length,
      system: rawNotifications.filter(n => ['system', 'user_assigned'].includes(n.type)).length,
    };
  }, [rawNotifications]);

  // تقسيم الإشعارات بحسب التواريخ (اليوم، أمس، الأسبوع الحالي، سابقاً)
  const groupedNotifications = useMemo(() => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const thisWeek: Notification[] = [];
    const earlier: Notification[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;

    filteredNotifications.forEach((n) => {
      const time = new Date(n.created_at).getTime();
      if (time >= startOfToday) {
        today.push(n);
      } else if (time >= startOfYesterday) {
        yesterday.push(n);
      } else if (time >= startOfWeek) {
        thisWeek.push(n);
      } else {
        earlier.push(n);
      }
    });

    return { today, yesterday, thisWeek, earlier };
  }, [filteredNotifications]);

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
          gap: '16px',
          flex: 1
        }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>جاري تحميل التنبيهات وإعداد الجدول الزمني...</p>
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
          gap: '16px',
          flex: 1
        }}>
          <AlertTriangle size={40} style={{ color: 'var(--status-red)' }} />
          <p style={{ color: 'var(--status-red)' }}>{error}</p>
          <button
            onClick={() => loadNotifications()}
            className="fin-btn fin-btn--primary"
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
        <div className="notifications-header-bar__start">
          <div className="notifications-header-bar__title">
            <Bell size={20} />
            <span>مركز التنبيهات</span>
            {stats.unread > 0 && (
              <span className="notifications-header-bar__badge">{stats.unread}</span>
            )}
          </div>
        </div>

        {/* Center: Search and Filters */}
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
            <option value="all">جميع الأنواع</option>
            <option value="task_assigned">تكليف مهمة</option>
            <option value="task_due">مهمة متأخرة</option>
            <option value="hearing_reminder">تذكير جلسة</option>
            <option value="document_shared">مشاركة وثيقة</option>
            <option value="case_update">تحديث قضية</option>
            <option value="system">النظام</option>
          </select>
        </div>

        {/* End: Actions */}
        <div className="notifications-header-bar__end" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="fin-btn fin-btn--sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={14} style={isRefreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
            تحديث
          </button>
          <button
            type="button"
            className="fin-btn fin-btn--sm"
            onClick={() => navigate('/settings')}
          >
            <Settings size={14} />
            الإعدادات
          </button>
        </div>
      </header>

      {/* Split Layout */}
      <div className="notifications-layout">
        {/* Sidebar */}
        <aside className="notifications-sidebar">
          <div className="notifications-sidebar__menu">
            <div className="notifications-sidebar__title">التصنيفات</div>
            
            <div
              className={`notification-category-item ${activeCategory === 'all' ? 'notification-category-item--active' : ''}`}
              onClick={() => { setActiveCategory('all'); setSelectedNotification(null); }}
            >
              <span className="notification-category-label"><Bell size={16} /> الكل</span>
              <span className="notification-category-badge">{localStats.all}</span>
            </div>

            <div
              className={`notification-category-item ${activeCategory === 'unread' ? 'notification-category-item--active' : ''}`}
              onClick={() => { setActiveCategory('unread'); setSelectedNotification(null); }}
            >
              <span className="notification-category-label"><EyeOff size={16} /> غير مقروءة</span>
              <span className="notification-category-badge" style={localStats.unread > 0 ? { background: 'var(--status-red-soft)', color: 'var(--status-red)' } : {}}>{localStats.unread}</span>
            </div>

            <div
              className={`notification-category-item ${activeCategory === 'tasks' ? 'notification-category-item--active' : ''}`}
              onClick={() => { setActiveCategory('tasks'); setSelectedNotification(null); }}
            >
              <span className="notification-category-label"><User size={16} /> مهام وتكاليف</span>
              <span className="notification-category-badge">{localStats.tasks}</span>
            </div>

            <div
              className={`notification-category-item ${activeCategory === 'hearings' ? 'notification-category-item--active' : ''}`}
              onClick={() => { setActiveCategory('hearings'); setSelectedNotification(null); }}
            >
              <span className="notification-category-label"><Calendar size={16} /> جلسات ومواعيد</span>
              <span className="notification-category-badge">{localStats.hearings}</span>
            </div>

            <div
              className={`notification-category-item ${activeCategory === 'documents' ? 'notification-category-item--active' : ''}`}
              onClick={() => { setActiveCategory('documents'); setSelectedNotification(null); }}
            >
              <span className="notification-category-label"><FileText size={16} /> ملفات ومستندات</span>
              <span className="notification-category-badge">{localStats.documents}</span>
            </div>

            <div
              className={`notification-category-item ${activeCategory === 'cases' ? 'notification-category-item--active' : ''}`}
              onClick={() => { setActiveCategory('cases'); setSelectedNotification(null); }}
            >
              <span className="notification-category-label"><Briefcase size={16} /> تحديثات القضايا</span>
              <span className="notification-category-badge">{localStats.cases}</span>
            </div>

            <div
              className={`notification-category-item ${activeCategory === 'system' ? 'notification-category-item--active' : ''}`}
              onClick={() => { setActiveCategory('system'); setSelectedNotification(null); }}
            >
              <span className="notification-category-label"><Clock size={16} /> النظام عام</span>
              <span className="notification-category-badge">{localStats.system}</span>
            </div>
          </div>

          <div className="notifications-sidebar__footer">
            <button className="fin-btn fin-btn--primary fin-btn--sm" onClick={markAllAsRead} style={{ width: '100%' }}>
              <CheckCircle size={14} /> تعيين الكل كمقروء
            </button>
            <button className="fin-btn fin-btn--ghost fin-btn--danger fin-btn--sm" onClick={handleClearRead} style={{ width: '100%' }}>
              <Trash2 size={14} /> حذف المقروءة
            </button>
          </div>
        </aside>

        {/* Main Notifications Stream */}
        <main className="notifications-main">
          <div className="notifications-stream">
            {filteredNotifications.length === 0 ? (
              <div className="notifications-empty">
                <Bell className="notifications-empty__icon" />
                <h3 className="notifications-empty__title">لا توجد إشعارات</h3>
                <p className="notifications-empty__desc">
                  {searchTerm ? 'لم يتم العثور على إشعارات تطابق نص البحث' : 'كل شيء هادئ هنا! لا توجد تنبيهات جديدة.'}
                </p>
              </div>
            ) : (
              <>
                {/* اليوم */}
                {groupedNotifications.today.length > 0 && (
                  <div>
                    <div className="notifications-group-title">اليوم</div>
                    {groupedNotifications.today.map((notification) => (
                      <div
                        key={notification.id}
                        className={`notification-card ${!notification.is_read ? 'notification-card--unread' : ''} ${selectedNotification?.id === notification.id ? 'notification-card--selected' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className={`notification-card__icon ${getIconClass(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="notification-card__content">
                          <div className="notification-card__header">
                            <h4 className="notification-card__title">
                              {notification.title}
                            </h4>
                            <span className={`notification-card__type ${getTypeClass(notification.type)}`}>
                              {getNotificationTypeText(notification.type)}
                            </span>
                          </div>
                          <p className="notification-card__message">{notification.message}</p>
                          <div className="notification-card__footer">
                            <span className="notification-card__time">
                              <Clock size={11} /> {formatTimeAgo(notification.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* أمس */}
                {groupedNotifications.yesterday.length > 0 && (
                  <div>
                    <div className="notifications-group-title">أمس</div>
                    {groupedNotifications.yesterday.map((notification) => (
                      <div
                        key={notification.id}
                        className={`notification-card ${!notification.is_read ? 'notification-card--unread' : ''} ${selectedNotification?.id === notification.id ? 'notification-card--selected' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className={`notification-card__icon ${getIconClass(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="notification-card__content">
                          <div className="notification-card__header">
                            <h4 className="notification-card__title">
                              {notification.title}
                            </h4>
                            <span className={`notification-card__type ${getTypeClass(notification.type)}`}>
                              {getNotificationTypeText(notification.type)}
                            </span>
                          </div>
                          <p className="notification-card__message">{notification.message}</p>
                          <div className="notification-card__footer">
                            <span className="notification-card__time">
                              <Clock size={11} /> {formatTimeAgo(notification.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* هذا الأسبوع */}
                {groupedNotifications.thisWeek.length > 0 && (
                  <div>
                    <div className="notifications-group-title">هذا الأسبوع</div>
                    {groupedNotifications.thisWeek.map((notification) => (
                      <div
                        key={notification.id}
                        className={`notification-card ${!notification.is_read ? 'notification-card--unread' : ''} ${selectedNotification?.id === notification.id ? 'notification-card--selected' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className={`notification-card__icon ${getIconClass(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="notification-card__content">
                          <div className="notification-card__header">
                            <h4 className="notification-card__title">
                              {notification.title}
                            </h4>
                            <span className={`notification-card__type ${getTypeClass(notification.type)}`}>
                              {getNotificationTypeText(notification.type)}
                            </span>
                          </div>
                          <p className="notification-card__message">{notification.message}</p>
                          <div className="notification-card__footer">
                            <span className="notification-card__time">
                              <Clock size={11} /> {formatTimeAgo(notification.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* سابقاً */}
                {groupedNotifications.earlier.length > 0 && (
                  <div>
                    <div className="notifications-group-title">سابقاً</div>
                    {groupedNotifications.earlier.map((notification) => (
                      <div
                        key={notification.id}
                        className={`notification-card ${!notification.is_read ? 'notification-card--unread' : ''} ${selectedNotification?.id === notification.id ? 'notification-card--selected' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className={`notification-card__icon ${getIconClass(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="notification-card__content">
                          <div className="notification-card__header">
                            <h4 className="notification-card__title">
                              {notification.title}
                            </h4>
                            <span className={`notification-card__type ${getTypeClass(notification.type)}`}>
                              {getNotificationTypeText(notification.type)}
                            </span>
                          </div>
                          <p className="notification-card__message">{notification.message}</p>
                          <div className="notification-card__footer">
                            <span className="notification-card__time">
                              <Clock size={11} /> {formatTimeAgo(notification.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* Right Preview Panel */}
        <aside className="notifications-preview">
          {selectedNotification ? (
            <>
              <div className="notifications-preview__header">
                <div className="notifications-preview__title">تفاصيل التنبيه</div>
                <button
                  className="notifications-preview__close"
                  onClick={() => setSelectedNotification(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="notifications-preview__body">
                {/* Header Icon Block */}
                <div className="notifications-preview__icon-wrapper">
                  <div className={`notifications-preview__icon ${getIconClass(selectedNotification.type)}`}>
                    {getNotificationIcon(selectedNotification.type)}
                  </div>
                </div>

                {/* Meta details */}
                <div className="notifications-preview__meta">
                  <span className={`notification-card__type ${getTypeClass(selectedNotification.type)}`}>
                    {getNotificationTypeText(selectedNotification.type)}
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} />
                    {new Date(selectedNotification.created_at).toLocaleString('ar-SA')}
                  </span>
                </div>

                {/* Title */}
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-heading)', margin: 0, lineHeight: 1.4 }}>
                  {selectedNotification.title}
                </h3>

                {/* Description Card */}
                <div className="notifications-preview__desc-card">
                  {selectedNotification.message}
                </div>

                {/* Guidance / Tip Card */}
                <div className="notifications-preview__tip">
                  <Info size={16} />
                  <div>
                    <strong>إرشادات:</strong> {getNotificationTip(selectedNotification.type)}
                  </div>
                </div>

                {/* CTA Actions */}
                <div className="notifications-preview__actions">
                  {selectedNotification.action_url && (
                    <button
                      className="fin-btn fin-btn--primary"
                      style={{ width: '100%', height: 36 }}
                      onClick={() => navigate(selectedNotification.action_url!)}
                    >
                      <ExternalLink size={14} /> الذهاب إلى صفحة الإجراء
                    </button>
                  )}
                  
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="fin-btn fin-btn--ghost"
                      style={{ flex: 1, height: 32, fontSize: 12 }}
                      onClick={() => toggleReadStatus(selectedNotification)}
                    >
                      {selectedNotification.is_read ? <EyeOff size={13} /> : <Check size={13} />}
                      {selectedNotification.is_read ? 'تعليم كغير مقروء' : 'تعليم كمقروء'}
                    </button>
                    
                    <button
                      className="fin-btn fin-btn--ghost fin-btn--danger"
                      style={{ flex: 1, height: 32, fontSize: 12 }}
                      onClick={() => deleteNotification(selectedNotification.id)}
                    >
                      <Trash2 size={13} /> حذف الإشعار
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="notifications-preview__empty">
              <Bell size={48} />
              <div className="notifications-preview__empty-title">لم يتم اختيار أي تنبيه</div>
              <div className="notifications-preview__empty-desc">انقر على أي بطاقة تنبيه في القائمة المجاورة لمعاينة كامل التفاصيل والإجراءات المتاحة لها.</div>
            </div>
          )}
        </aside>
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
