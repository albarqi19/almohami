import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Calendar,
  User,
  FileText,
  MessageSquare,
  Clock,
  CheckCircle,
  Activity as ActivityIcon,
  Briefcase,
  Layers,
  BarChart3,
  Inbox,
  XCircle,
  RefreshCw,
  Play
} from 'lucide-react';
import type { Activity } from '../types';
import { ActivityService } from '../services/activityService';
import '../styles/activities-page.css';

const Activities: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [caseFilter, setCaseFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [cases, setCases] = useState<{ [key: string]: { title: string; fileNumber: string } }>({});
  const [users, setUsers] = useState<{ [key: string]: { name: string; role: string } }>({});

  // Fetch activities from backend
  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true);
        const response = await ActivityService.getActivities({ limit: 100 });

        // Handle both paginated and non-paginated response
        const activitiesData = Array.isArray(response) ? response :
          (response.data ? response.data : []);

        // Transform data to match frontend type
        const transformedActivities = activitiesData.map((a: any) => ({
          id: String(a.id),
          type: a.type || 'unknown',
          title: a.title || '',
          description: a.description || '',
          caseId: a.case_id ? String(a.case_id) : undefined,
          taskId: a.task_id ? String(a.task_id) : undefined,
          performedBy: a.performed_by ? String(a.performed_by) : 'system',
          performedAt: new Date(a.created_at || a.performed_at || new Date()),
          metadata: a.metadata || {}
        }));

        setActivities(transformedActivities);

        // Build unique cases and users from activities
        const uniqueCases: { [key: string]: { title: string; fileNumber: string } } = {};
        const uniqueUsers: { [key: string]: { name: string; role: string } } = {};

        activitiesData.forEach((a: any) => {
          if (a.case && a.case_id) {
            uniqueCases[String(a.case_id)] = {
              title: a.case.title || a.case.file_number || `قضية ${a.case_id}`,
              fileNumber: a.case.file_number || ''
            };
          }
          if (a.performer && a.performed_by) {
            uniqueUsers[String(a.performed_by)] = {
              name: a.performer.name || 'غير معروف',
              role: a.performer.role || ''
            };
          }
        });

        setCases(uniqueCases);
        setUsers(uniqueUsers);
      } catch (error) {
        console.error('Error loading activities:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, []);

  // Icon + Color helper - with appointment types
  const getActivityStyle = (type: string) => {
    switch (type) {
      case 'case_created': return { icon: <FileText size={14} />, colorClass: 'navy' };
      case 'case_updated': return { icon: <FileText size={14} />, colorClass: 'blue' };
      case 'document_uploaded': return { icon: <FileText size={14} />, colorClass: 'green' };
      case 'task_assigned': return { icon: <User size={14} />, colorClass: 'orange' };
      case 'task_completed': return { icon: <CheckCircle size={14} />, colorClass: 'green' };
      case 'task_created': return { icon: <Plus size={14} />, colorClass: 'blue' };
      case 'hearing_scheduled': return { icon: <Calendar size={14} />, colorClass: 'blue' };
      case 'comment_added': return { icon: <MessageSquare size={14} />, colorClass: 'navy' };
      case 'comment_updated': return { icon: <MessageSquare size={14} />, colorClass: 'blue' };
      case 'comment_deleted': return { icon: <XCircle size={14} />, colorClass: 'red' };
      case 'client_meeting': return { icon: <User size={14} />, colorClass: 'blue' };
      // Appointment types
      case 'appointment_created': return { icon: <Calendar size={14} />, colorClass: 'blue' };
      case 'appointment_updated': return { icon: <Calendar size={14} />, colorClass: 'orange' };
      case 'appointment_confirmed': return { icon: <CheckCircle size={14} />, colorClass: 'green' };
      case 'appointment_cancelled': return { icon: <XCircle size={14} />, colorClass: 'red' };
      case 'appointment_rescheduled': return { icon: <RefreshCw size={14} />, colorClass: 'orange' };
      case 'appointment_started': return { icon: <Play size={14} />, colorClass: 'blue' };
      case 'appointment_completed': return { icon: <CheckCircle size={14} />, colorClass: 'green' };
      default: return { icon: <ActivityIcon size={14} />, colorClass: 'navy' };
    }
  };

  const getActivityTypeText = (type: string) => {
    switch (type) {
      case 'case_created': return 'قضية';
      case 'case_updated': return 'تحديث';
      case 'document_uploaded': return 'وثائق';
      case 'task_assigned': return 'مهمة';
      case 'task_completed': return 'إنجاز';
      case 'task_created': return 'مهمة جديدة';
      case 'hearing_scheduled': return 'جلسة';
      case 'comment_added': return 'ملاحظة';
      case 'comment_updated': return 'تعديل تعليق';
      case 'comment_deleted': return 'حذف تعليق';
      case 'client_meeting': return 'اجتماع';
      // Appointment types
      case 'appointment_created': return 'موعد جديد';
      case 'appointment_updated': return 'تحديث موعد';
      case 'appointment_confirmed': return 'تأكيد موعد';
      case 'appointment_cancelled': return 'إلغاء موعد';
      case 'appointment_rescheduled': return 'تأجيل موعد';
      case 'appointment_started': return 'بدء موعد';
      case 'appointment_completed': return 'انتهاء موعد';
      default: return type;
    }
  };

  const getUserName = (userId: string) => users[userId]?.name || 'غير محدد';
  const getCaseInfo = (caseId?: string) => (caseId && cases[caseId] ? cases[caseId] : null);

  const formatTimeOnly = (date: Date) => {
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCase = caseFilter === 'all' || activity.caseId === caseFilter;
      const matchesType = typeFilter === 'all' || activity.type === typeFilter;

      return matchesSearch && matchesCase && matchesType;
    }).sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
  }, [activities, searchTerm, caseFilter, typeFilter]);

  // Group by date category
  const groupedActivities = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups = {
      today: [] as Activity[],
      yesterday: [] as Activity[],
      thisWeek: [] as Activity[]
    };

    filteredActivities.forEach(activity => {
      const activityDate = new Date(activity.performedAt);
      activityDate.setHours(0, 0, 0, 0);

      if (activityDate.getTime() === today.getTime()) {
        groups.today.push(activity);
      } else if (activityDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(activity);
      } else if (activityDate >= weekAgo) {
        groups.thisWeek.push(activity);
      }
    });

    return groups;
  }, [filteredActivities]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: filteredActivities.length,
      today: groupedActivities.today.length,
      tasksCompleted: filteredActivities.filter(a => a.type === 'task_completed').length,
      hearings: filteredActivities.filter(a => a.type === 'hearing_scheduled').length
    };
  }, [filteredActivities, groupedActivities]);

  // Render Activity Card
  const renderActivityCard = (activity: Activity, index: number) => {
    const { icon, colorClass } = getActivityStyle(activity.type);
    const caseInfo = getCaseInfo(activity.caseId);

    return (
      <motion.div
        className="activity-card"
        key={activity.id}
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.05 }}
      >
        <div className="activity-card__header">
          <div className={`activity-card__icon activity-card__icon--${colorClass}`}>
            {icon}
          </div>
          <div className="activity-card__title">{activity.title}</div>
          <div className="activity-card__time">{formatTimeOnly(activity.performedAt)}</div>
        </div>
        <div className="activity-card__desc">{activity.description}</div>
        <div className="activity-card__footer">
          <span className="activity-card__tag">
            <User size={10} />
            {getUserName(activity.performedBy)}
          </span>
          {caseInfo && (
            <span className="activity-card__tag">
              <FileText size={10} />
              {caseInfo.title}
            </span>
          )}
          <span className="activity-card__badge">
            {getActivityTypeText(activity.type)}
          </span>
        </div>
      </motion.div>
    );
  };

  // Render Column
  const renderColumn = (title: string, activities: Activity[], icon: React.ReactNode) => (
    <div className="activities-column">
      <div className="activities-column__header">
        <div className="activities-column__title">
          {icon}
          {title}
        </div>
        <span className="activities-column__count">{activities.length}</span>
      </div>
      <div className="activities-column__content">
        {activities.length > 0 ? (
          activities.map((activity, index) => renderActivityCard(activity, index))
        ) : (
          <div className="activities-column-empty">
            <Inbox size={24} className="activities-column-empty__icon" />
            <div className="activities-column-empty__text">لا توجد أنشطة</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="activities-page">
      {/* Header */}
      <div className="activities-header">
        <div className="activities-header__title-area">
          <h1>
            <ActivityIcon size={18} />
            سجل الإجراءات
          </h1>
          <p>متابعة جميع الأنشطة والإجراءات</p>
        </div>
        <div className="activities-header__actions">
          <div className="activities-search">
            <Search size={14} className="activities-search__icon" />
            <input
              className="activities-search__input"
              placeholder="بحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="activities-filter">
            <select
              className="activities-filter__select"
              value={caseFilter}
              onChange={(e) => setCaseFilter(e.target.value)}
            >
              <option value="all">كل القضايا</option>
              {Object.entries(cases).map(([id, c]) => (
                <option key={id} value={id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div className="activities-filter">
            <select
              className="activities-filter__select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">كل الأنواع</option>
              <option value="case_created">قضايا</option>
              <option value="document_uploaded">وثائق</option>
              <option value="task_assigned">مهام</option>
              <option value="task_completed">إنجازات</option>
              <option value="hearing_scheduled">جلسات</option>
              <option value="comment_added">ملاحظات</option>
              <option value="appointment_created">مواعيد جديدة</option>
              <option value="appointment_confirmed">مواعيد مؤكدة</option>
              <option value="appointment_cancelled">مواعيد ملغاة</option>
            </select>
          </div>
          <button className="activities-header__btn activities-header__btn--primary">
            <Plus size={16} />
            إضافة
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="activities-content">
        {/* Stats */}
        <div className="activities-stats-grid">
          <motion.div className="activities-stat-card" whileHover={{ y: -2 }}>
            <div className="activities-stat-card__icon activities-stat-card__icon--navy">
              <Layers size={18} />
            </div>
            <div className="activities-stat-card__content">
              <div className="activities-stat-card__value">{stats.total}</div>
              <div className="activities-stat-card__label">إجمالي الأنشطة</div>
            </div>
          </motion.div>

          <motion.div className="activities-stat-card" whileHover={{ y: -2 }}>
            <div className="activities-stat-card__icon activities-stat-card__icon--green">
              <BarChart3 size={18} />
            </div>
            <div className="activities-stat-card__content">
              <div className="activities-stat-card__value">{stats.today}</div>
              <div className="activities-stat-card__label">أنشطة اليوم</div>
            </div>
          </motion.div>

          <motion.div className="activities-stat-card" whileHover={{ y: -2 }}>
            <div className="activities-stat-card__icon activities-stat-card__icon--blue">
              <CheckCircle size={18} />
            </div>
            <div className="activities-stat-card__content">
              <div className="activities-stat-card__value">{stats.tasksCompleted}</div>
              <div className="activities-stat-card__label">مهام مكتملة</div>
            </div>
          </motion.div>

          <motion.div className="activities-stat-card" whileHover={{ y: -2 }}>
            <div className="activities-stat-card__icon activities-stat-card__icon--orange">
              <Briefcase size={18} />
            </div>
            <div className="activities-stat-card__content">
              <div className="activities-stat-card__value">{stats.hearings}</div>
              <div className="activities-stat-card__label">جلسات</div>
            </div>
          </motion.div>
        </div>

        {/* Kanban Board */}
        <div className="activities-board">
          {renderColumn('اليوم', groupedActivities.today, <Clock size={14} />)}
          {renderColumn('أمس', groupedActivities.yesterday, <Calendar size={14} />)}
          {renderColumn('هذا الأسبوع', groupedActivities.thisWeek, <BarChart3 size={14} />)}
        </div>
      </div>
    </div>
  );
};

export default Activities;
