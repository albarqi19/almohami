import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowRight,
  Edit,
  FileText,
  Calendar,
  User,
  Phone,
  Mail,
  DollarSign,
  AlertCircle,
  Plus,
  CheckSquare,
  Users,
  Clock,
  AlarmClock,
  Building,
  Video,
  ExternalLink,
  ChevronLeft,
  MoreHorizontal,
  Briefcase,
  Hash,
  Scale,
  Activity,
  MessageSquare,
  PenTool,
  Link2,
  Scroll,
  Sparkles,
  ClipboardList,
  Gavel,
  Send,
  X as XIcon
} from 'lucide-react';
import Timeline from '../components/Timeline';
import EditCaseModal from '../components/EditCaseModal';
import AddTaskModal from '../components/AddTaskModal';
import CaseDocumentsModal from '../components/CaseDocumentsModal';
import CaseTasksModal from '../components/CaseTasksModal';
import { CaseAppointmentsModal } from '../components/CaseAppointmentsModal';
import QuickActionsModal from '../components/QuickActionsModal';
import ClientPhoneModal from '../components/ClientPhoneModal';
import CaseMessagesModal from '../components/CaseMessagesModal';
import ShareCaseModal from '../components/ShareCaseModal';
import LinkToNajizModal from '../components/LinkToNajizModal';
import LegalMemoWorkspace from '../components/LegalMemoWorkspace';
import CasePrepKitchen from '../components/CasePrepKitchen';
import LawSearchModal from '../components/LawSearchModal';
import PrecedentSearchModal from '../components/PrecedentSearchModal';
import CaseWekalatPanel from '../components/CaseWekalatPanel';
import { SendDabtPreferencesModal, type NotifyMode } from '../components/SendDabtPreferencesModal';
import { SendSessionReportModal } from '../components/SendSessionReportModal';
import OutcomeBadge from '../components/OutcomeBadge';
import WinCelebrationModal from '../components/WinCelebrationModal';
import ReplayCelebrationButton from '../components/ReplayCelebrationButton';
import { useAuth } from '../contexts/AuthContext';
import type { TimelineEvent } from '../components/Timeline';
import { apiClient } from '../utils/api';
import { toHijri } from '../utils/hijriDate';
import { CaseService } from '../services/caseService';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)
import { ActivityService } from '../services/activityService';
import deadlineService, { type LegalDeadline } from '../services/deadlineService';
import { DocumentService } from '../services/documentService';
import { TaskService } from '../services/taskService';
import type { Case } from '../types';

// العداد الحي لمهلة الاعتراض — live_remaining_objection_days يحسبه الباك من
// objection_due_date عند كل قراءة، لأن remaining_objection_days المخزن snapshot
// لحظة الاستيراد ويَقدُم مع الوقت (كان يعرض أرقاماً قديمة خاطئة)
const objectionDaysLeft = (j: any): number | null => {
  const live = j?.live_remaining_objection_days;
  if (live !== undefined && live !== null) return live;
  return j?.remaining_objection_days ?? null;
};

const canStillObjectOn = (j: any): boolean => {
  if (!j?.available_for_objection) return false;
  const live = j?.live_remaining_objection_days;
  if (live !== undefined && live !== null) return live >= 0;
  return (j?.remaining_objection_days ?? 0) > 0;
};

const objectionDaysLabel = (days: number | null): string => {
  if (days === null) return '';
  if (days === 0) return 'اليوم آخر يوم للاعتراض!';
  if (days === 1) return 'متبقي يوم واحد للاعتراض';
  if (days === 2) return 'متبقي يومان للاعتراض';
  return `متبقي ${days} ${days <= 10 ? 'أيام' : 'يوماً'} للاعتراض`;
};

const CaseDetailPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationReplayMode, setCelebrationReplayMode] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifyModalSession, setNotifyModalSession] = useState<{ id: number; mode: NotifyMode | null; enabled: boolean } | null>(null);
  const [reportModalSession, setReportModalSession] = useState<number | null>(null);
  const [selectedDabtSession, setSelectedDabtSession] = useState<any>(null);
  const [selectedJudgementSession, setSelectedJudgementSession] = useState<any>(null);
  const [judgementActiveTab, setJudgementActiveTab] = useState<string>('text');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showMemoWorkspace, setShowMemoWorkspace] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false);
  const [showQuickActionsModal, setShowQuickActionsModal] = useState(false);
  const [showClientPhoneModal, setShowClientPhoneModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLinkNajizModal, setShowLinkNajizModal] = useState(false);
  const [canLinkToNajiz, setCanLinkToNajiz] = useState(false);
  const [showLawSearch, setShowLawSearch] = useState(false);
  const [showPrecedents, setShowPrecedents] = useState(false);
  const [showWekalatModal, setShowWekalatModal] = useState(false);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [tasksCount, setTasksCount] = useState(0);
  const [caseDeadlines, setCaseDeadlines] = useState<LegalDeadline[]>([]);

  // Ref to prevent duplicate fetches
  const hasFetchedRef = useRef<string | null>(null);

  // المهل النظامية المفتوحة لهذه القضية — لشريط الإنذار أعلى الصفحة
  useEffect(() => {
    if (!caseId) return;
    deadlineService
      .list({ case_id: Number(caseId), status: 'active,in_progress' })
      .then(setCaseDeadlines)
      .catch(() => setCaseDeadlines([])); // 403 لمن لا يملك deadlines.view — الشريط اختياري
  }, [caseId]);

  useEffect(() => {
    // Skip if already fetched for this caseId
    if (!caseId || hasFetchedRef.current === caseId) {
      return;
    }

    // Mark as fetched IMMEDIATELY (before async call) to prevent duplicates
    hasFetchedRef.current = caseId;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [fetchedCase, activities, documents, tasksData] = await Promise.all([
          CaseService.getCase(caseId),
          ActivityService.getCaseActivities(caseId) as Promise<any[]>,
          DocumentService.getCaseDocuments(caseId),
          TaskService.getTasks({ case_id: caseId })
        ]);

        setCaseData(fetchedCase);
        setDocumentsCount(documents ? documents.length : 0);
        setTasksCount(tasksData?.data?.length || 0);

        const timelineEventsData: TimelineEvent[] = activities.map(activity => ({
          id: activity.id.toString(),
          type: activity.type as TimelineEvent['type'],
          title: activity.title,
          description: activity.description || '',
          date: new Date(activity.date),
          user: activity.user,
          metadata: activity.metadata
        }));

        setTimelineEvents(timelineEventsData);
      } catch (err: any) {
        setError(err.message || 'فشل في جلب تفاصيل القضية');
        hasFetchedRef.current = null; // Reset on error to allow retry
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [caseId]);

  /**
   * هل نُظهر احتفال الفوز؟ شروط حصرية:
   *  1) outcome === 'won'
   *  2) outcome_confidence === 'high'  (medium لا يحتفل — badge فقط)
   *  3) outcome_source !== 'manual'   (لا احتفال على تعديل يدوي)
   *  4) outcome_celebrated_by_current_user === false  (per-user, خادم authoritative)
   *  5) المستخدم: محامٍ مخصص أو مدير tenant/owner
   */
  const shouldCelebrate = useCallback((c: Case | null): boolean => {
    if (!c || !user) return false;
    if (c.outcome !== 'won') return false;
    if (c.outcome_confidence !== 'high') return false;
    if (c.outcome_source === 'manual') return false;
    if (c.outcome_celebrated_by_current_user) return false;

    const isAssigned = Array.isArray(c.lawyers)
      && c.lawyers.some((l: any) => String(l.id) === String(user.id));
    const isAdmin = user.role === 'admin' || user.role === 'super_admin' || Boolean(user.is_tenant_owner);
    return Boolean(isAssigned || isAdmin);
  }, [user]);

  // بعد تحميل/تحديث caseData، افحص لو نُظهر الاحتفال
  useEffect(() => {
    if (caseData && shouldCelebrate(caseData)) {
      setCelebrationReplayMode(false);
      setShowCelebration(true);
    }
  }, [caseData, shouldCelebrate]);

  // Check if case can be linked to Najiz
  useEffect(() => {
    const checkCanLink = async () => {
      if (caseId && caseData) {
        try {
          const result = await CaseService.canLinkToNajiz(caseId);
          setCanLinkToNajiz(result.can_link);
        } catch (err) {
          setCanLinkToNajiz(false);
        }
      }
    };
    checkCanLink();
  }, [caseId, caseData]);

  const refreshCaseData = async () => {
    if (!caseId) return;

    try {
      setLoading(true);
      setError(null);

      const [fetchedCase, activities, documents] = await Promise.all([
        CaseService.getCase(caseId),
        ActivityService.getCaseActivities(caseId) as Promise<any[]>,
        DocumentService.getCaseDocuments(caseId)
      ]);

      setCaseData(fetchedCase);
      setDocumentsCount(documents ? documents.length : 0);

      const timelineEventsData: TimelineEvent[] = activities.map(activity => ({
        id: activity.id.toString(),
        type: activity.type as TimelineEvent['type'],
        title: activity.title,
        description: activity.description || '',
        date: new Date(activity.date),
        user: activity.user,
        metadata: activity.metadata
      }));

      setTimelineEvents(timelineEventsData);
    } catch (err: any) {
      setError(err.message || 'فشل في جلب تفاصيل القضية');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCase = async (updatedData: Partial<Case>) => {
    if (!caseId) return;

    try {
      const updatedCase = await CaseService.updateCase(caseId, updatedData);
      setCaseData(updatedCase);
    } catch (error: any) {
      throw new Error(error.message || 'فشل في تحديث القضية');
    }
  };

  const handleTaskAdded = async () => {
    await refreshCaseData();
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('منتهية') || statusLower.includes('مغلقة') || statusLower === 'closed') {
      return 'case-badge--closed';
    }
    if (statusLower.includes('جديدة') || statusLower.includes('نشطة') || statusLower === 'active') {
      return 'case-badge--active';
    }
    if (statusLower.includes('معلقة') || statusLower.includes('قيد النظر') || statusLower === 'pending') {
      return 'case-badge--pending';
    }
    return 'case-badge--active';
  };

  // Get priority badge class
  const getPriorityBadgeClass = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'عالية':
      case 'high':
        return 'case-badge--high';
      case 'متوسطة':
      case 'medium':
        return 'case-badge--medium';
      case 'منخفضة':
      case 'low':
        return 'case-badge--low';
      default:
        return 'case-badge--medium';
    }
  };

  // Format date
  const formatDate = (date: string | Date | null) => {
    if (!date) return 'غير محدد';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ar-SA');
  };

  // Parse session date
  const parseSessionDate = (dateStr: string) => {
    if (!dateStr) return { day: '--', month: '--' };
    const date = new Date(dateStr);
    const day = date.getDate().toString();
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const month = months[date.getMonth()];
    return { day, month };
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-loading__content">
          <div className="page-loading__spinner"></div>
          <p className="page-loading__text">جاري تحميل تفاصيل القضية...</p>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="page-loading">
        <div className="page-loading__content">
          <AlertCircle style={{ width: '48px', height: '48px', color: 'var(--status-red)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--status-red)', marginBottom: '16px' }}>{error || 'القضية غير موجودة'}</p>
          <Link to="/cases" style={{ color: 'var(--law-navy)', fontWeight: 500 }}>
            العودة إلى قائمة القضايا
          </Link>
        </div>
      </div>
    );
  }

  // Calculate fees from billing data (from contracts and invoices)
  const billing = caseData.billing;
  const totalFees = billing?.total_contract_value || caseData.contract_value || 0;
  const paidFees = billing?.total_paid || 0;
  const remainingFees = billing?.total_remaining || (totalFees - paidFees);
  const paymentProgress = billing?.collection_percentage || (totalFees > 0 ? (paidFees / totalFees) * 100 : 0);
  const hasOverdue = billing && billing.overdue_invoices_count > 0;

  // مطبخ التجهيز — يظهر بدلاً من الصفحة الكاملة للقضايا في مرحلة الإعداد
  const isPrepMode = caseData.is_prep_mode || ['draft', 'preparation', 'filed'].includes(caseData.status);

  if (isPrepMode) {
    return (
      <div className="case-detail-page">
        {/* Header مبسط للمطبخ */}
        <div className="case-detail-header">
          <div className="case-detail-header__top">
            <Link to="/cases" className="back-btn">
              <ArrowRight size={16} />
              القضايا
            </Link>
            <div className="case-detail-header__title-section">
              <div className="case-detail-header__title">
                <FileText size={18} />
                {caseData.title}
              </div>
              <div className="case-detail-header__subtitle">
                رقم الملف: {caseData.file_number}
              </div>
            </div>
            <div className="case-detail-header__badges">
              <span className="case-badge" style={{ background: '#FEF3C7', color: '#92400E' }}>
                <span className="case-badge__dot" style={{ background: '#D97706' }} />
                {caseData.status_arabic || caseData.status}
              </span>
            </div>
          </div>
        </div>

        <CasePrepKitchen
          caseData={caseData}
          onActivate={() => refreshCaseData()}
          onLinkNajiz={() => setShowLinkNajizModal(true)}
          onRefresh={() => refreshCaseData()}
          onEditCase={() => setShowEditModal(true)}
        />

        <EditCaseModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          caseData={caseData}
          onSave={async (updated) => { await handleUpdateCase(updated); refreshCaseData(); }}
        />
        <LinkToNajizModal
          isOpen={showLinkNajizModal}
          onClose={() => setShowLinkNajizModal(false)}
          caseId={caseData.id}
          caseTitle={caseData.title}
          onSuccess={() => { setShowLinkNajizModal(false); refreshCaseData(); }}
        />
      </div>
    );
  }

  return (
    <div className="case-detail-page">
      {/* Sticky Header */}
      <div className="case-detail-header">
        <div className="case-detail-header__top">
          {/* Back Button */}
          <Link to="/cases" className="back-btn">
            <ArrowRight size={16} />
            القضايا
          </Link>

          {/* Title Section */}
          <div className="case-detail-header__title-section" data-tour="case-title">
            <div className="case-detail-header__title">
              <FileText size={18} />
              {caseData.title}
            </div>
            <div className="case-detail-header__subtitle">
              رقم الملف: {caseData.file_number} • {caseData.case_type_arabic || caseData.type_arabic || caseData.case_type}
            </div>
          </div>

          {/* Badges */}
          <div className="case-detail-header__badges">
            <span className={`case-badge ${getStatusBadgeClass(caseData.najiz_status || caseData.status)}`}>
              <span className="case-badge__dot"></span>
              {caseData.najiz_status_arabic || caseData.status_arabic || caseData.status}
            </span>
            {caseData.outcome && (
              <>
                <OutcomeBadge
                  outcome={caseData.outcome as any}
                  confidence={caseData.outcome_confidence}
                  source={caseData.outcome_source}
                  appealed={caseData.outcome_appealed}
                  partial={caseData.outcome_is_partial}
                />
                {caseData.outcome === 'won' && (
                  <ReplayCelebrationButton
                    onClick={() => {
                      setCelebrationReplayMode(true);
                      setShowCelebration(true);
                    }}
                  />
                )}
              </>
            )}
            {caseData.priority && (
              <span className={`case-badge ${getPriorityBadgeClass(caseData.priority)}`}>
                {caseData.priority_arabic || caseData.priority}
              </span>
            )}
          </div>

          {/* Quick Tabs */}
          <div className="case-header-tabs" data-tour="case-tabs">
            <button
              className="case-header-tab"
              data-tour="case-memo-btn"
              onClick={() => setShowMemoWorkspace(true)}
            >
              <span className="case-header-tab__icon case-header-tab__icon--teal">
                <PenTool size={14} />
              </span>
              إنشاء مذكرة
            </button>
            <button className="case-header-tab" onClick={() => setShowDocumentsModal(true)}>
              <span className="case-header-tab__icon case-header-tab__icon--blue">
                <FileText size={14} />
              </span>
              الوثائق
              <span className="case-header-tab__count">{documentsCount}</span>
            </button>
            <button className="case-header-tab" onClick={() => setShowTasksModal(true)}>
              <span className="case-header-tab__icon case-header-tab__icon--orange">
                <CheckSquare size={14} />
              </span>
              المهام
              <span className="case-header-tab__count">{tasksCount}</span>
            </button>
            <button className="case-header-tab" onClick={() => setShowAppointmentsModal(true)}>
              <span className="case-header-tab__icon case-header-tab__icon--green">
                <Calendar size={14} />
              </span>
              الجلسات
              <span className="case-header-tab__count">{caseData.sessions?.length || 0}</span>
            </button>
            <button className="case-header-tab" onClick={() => setShowMessagesModal(true)}>
              <span className="case-header-tab__icon case-header-tab__icon--purple">
                <MessageSquare size={14} />
              </span>
              الرسائل
            </button>
            <button className="case-header-tab" onClick={() => setShowWekalatModal(true)}>
              <span className="case-header-tab__icon case-header-tab__icon--blue">
                <Scroll size={14} />
              </span>
              الوكالات
              {(() => {
                const s = (caseData as any)?.wekalat_summary;
                const total = s ? (s.matched_count ?? 0) : 0;
                if (total > 0) return <span className="case-header-tab__count">{total}</span>;
                return null;
              })()}
            </button>
            <button className="case-header-tab" onClick={() => setShowPrecedents(true)} data-tour="case-precedents-btn">
              <span className="case-header-tab__icon case-header-tab__icon--gold">
                <Gavel size={14} />
              </span>
              السوابق القضائية
            </button>
          </div>

          {/* Actions */}
          <div className="case-detail-header__actions" data-tour="case-actions">
            <button onClick={() => setShowEditModal(true)} className="case-header-btn case-header-btn--primary">
              <Edit size={16} />
              <span>تعديل</span>
            </button>
            <button onClick={() => setShowQuickActionsModal(true)} className="case-header-btn">
              <Plus size={16} />
              <span>إجراءات</span>
            </button>
            {canLinkToNajiz && (
              <button
                onClick={() => setShowLinkNajizModal(true)}
                className="case-header-btn case-header-btn--link"
                title="ربط مع قضية ناجز"
              >
                <Link2 size={16} />
                <span>ربط</span>
              </button>
            )}
            <button
              onClick={() => setShowShareModal(true)}
              className="case-header-btn case-header-btn--share"
              title="مشاركة القضية"
            >
              <Users size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* شريط المهل النظامية — دائم الظهور: مهلة المحامي أولاً بألوان متدرجة
          (أخضر بعيد / برتقالي ≤7 / أحمر ≤3)، وإن لم توجد فمهلة الخصم بأزرق
          محايد وعنوان صريح «مهلة على الخصم» (اقترابها ليس إنذاراً لنا) */}
      {(() => {
        const open = caseDeadlines.filter((d) => d.days_remaining !== null);
        const nearest = (list: typeof open) =>
          [...list].sort((a, b) => (a.days_remaining ?? 0) - (b.days_remaining ?? 0))[0];
        const mine = nearest(open.filter((d) => d.obligated_party !== 'opponent'));
        const theirs = nearest(open.filter((d) => d.obligated_party === 'opponent'));
        const urgent = mine ?? theirs;
        if (!urgent) return null;
        const isOpponent = !mine;
        const days = urgent.days_remaining ?? 0;
        const tone = isOpponent ? 'blue' : days <= 3 ? 'red' : days <= 7 ? 'orange' : 'green';
        const daysText =
          days < 0 ? 'فاتت المهلة' :
          days === 0 ? '⏳ اليوم آخر يوم' :
          days === 1 ? '⏳ متبقي يوم واحد' :
          days === 2 ? '⏳ متبقي يومان' :
          days <= 10 ? `⏳ متبقي ${days} أيام` : `⏳ متبقي ${days} يوماً`;
        return (
          <div className={`case-deadline-banner case-deadline-banner--${tone}`}>
            <AlarmClock size={20} className="case-deadline-banner__icon" />
            <div className="case-deadline-banner__text">
              {isOpponent && <strong>مهلة على الخصم: </strong>}
              <strong>{daysText}</strong> على «{urgent.title}» — آخر يوم{' '}
              {new Date(urgent.due_date).toLocaleDateString('ar-SA-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <Link to="/deadlines" className="case-deadline-banner__link">
              صفحة المهل النظامية
            </Link>
          </div>
        );
      })()}

      {/* Two Column Layout */}
      <div className="case-detail-layout">
        {/* Main Content */}
        <div className="case-main-content" data-tour="case-main-content">
          {/* Najiz Link */}
          {caseData.najiz_url && (
            <div className="case-najiz-link">
              <div className="case-najiz-link__info">
                <div className="case-najiz-link__icon">
                  <ExternalLink size={18} />
                </div>
                <div className="case-najiz-link__text">
                  <strong>مستوردة من ناجز</strong>
                  <span>{caseData.najiz_synced_at ? `آخر مزامنة: ${formatDate(caseData.najiz_synced_at)}` : ''}</span>
                </div>
              </div>
              <a href={caseData.najiz_url} target="_blank" rel="noopener noreferrer" className="case-najiz-link__btn">
                <ExternalLink size={14} />
                فتح في ناجز
              </a>
            </div>
          )}

          {/* Case Subject */}
          {(caseData.case_subject || caseData.plaintiff_requests || caseData.case_demands || caseData.case_proofs) && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <FileText size={16} />
                  موضوع الدعوى
                </div>
              </div>
              <div className="case-card__content">
                {caseData.case_subject && (
                  <div className="case-subject-section">
                    <div className="case-subject-section__title case-subject-section__title--primary">
                      <Briefcase size={14} />
                      تفاصيل الدعوى
                    </div>
                    <div className="case-subject-section__content">
                      {caseData.case_subject}
                    </div>
                  </div>
                )}

                {(caseData.case_demands || caseData.plaintiff_requests) && (
                  <div className="case-subject-section">
                    <div className="case-subject-section__title case-subject-section__title--success">
                      <CheckSquare size={14} />
                      مطالب المدعي
                    </div>
                    <div className="case-subject-section__content">
                      {caseData.case_demands || caseData.plaintiff_requests}
                    </div>
                  </div>
                )}

                {caseData.case_proofs && (
                  <div className="case-subject-section">
                    <div className="case-subject-section__title case-subject-section__title--warning">
                      <Scale size={14} />
                      أدلة الدعوى
                    </div>
                    <div className="case-subject-section__content">
                      {caseData.case_proofs}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parties Section - Compact */}
          {caseData.parties && caseData.parties.length > 0 && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <Users size={16} />
                  أطراف الدعوى ({caseData.parties.length})
                </div>
              </div>
              <div className="case-card__content case-card__content--compact">
                <div className="case-parties-inline">
                  {/* Plaintiffs */}
                  {caseData.parties.filter((p: any) => p.side === 'plaintiff').map((party: any, idx: number) => (
                    <div key={`plaintiff-${idx}`} className="case-party-tag case-party-tag--plaintiff">
                      <span className="case-party-tag__icon">م</span>
                      <span className="case-party-tag__name">{party.name}</span>
                      <span className="case-party-tag__role">{party.role}</span>
                    </div>
                  ))}

                  {/* Defendants */}
                  {caseData.parties.filter((p: any) => p.side === 'defendant').map((party: any, idx: number) => (
                    <div key={`defendant-${idx}`} className="case-party-tag case-party-tag--defendant">
                      <span className="case-party-tag__icon">ض</span>
                      <span className="case-party-tag__name">{party.name}</span>
                      <span className="case-party-tag__role">{party.role}</span>
                    </div>
                  ))}

                  {/* Lawyers */}
                  {caseData.parties.filter((p: any) => p.side === 'lawyer').map((party: any, idx: number) => (
                    <div key={`lawyer-${idx}`} className="case-party-tag case-party-tag--lawyer">
                      <span className="case-party-tag__icon">و</span>
                      <span className="case-party-tag__name">{party.name}</span>
                      <span className="case-party-tag__role">{party.represents ? `يمثل: ${party.represents}` : party.role}</span>
                    </div>
                  ))}

                  {/* Agents (وكلاء/ممثلون/أولياء) */}
                  {caseData.parties.filter((p: any) => p.side === 'agent').map((party: any, idx: number) => (
                    <div key={`agent-${idx}`} className="case-party-tag case-party-tag--agent">
                      <span className="case-party-tag__icon">ك</span>
                      <span className="case-party-tag__name">{party.name}</span>
                      <span className="case-party-tag__role">{party.represents ? `${party.role || 'وكيل'}: ${party.represents}` : party.role || 'وكيل'}</span>
                    </div>
                  ))}

                  {/* Appellants (المستأنِف) — جهة درجة الاستئناف */}
                  {caseData.parties.filter((p: any) => p.side === 'appellant').map((party: any, idx: number) => (
                    <div key={`appellant-${idx}`} className="case-party-tag case-party-tag--appellant">
                      <span className="case-party-tag__icon">س</span>
                      <span className="case-party-tag__name">{party.name}</span>
                      <span className="case-party-tag__role">{party.role || 'المستأنِف'}</span>
                    </div>
                  ))}

                  {/* Appellees (المستأنَف ضدّه) — جهة درجة الاستئناف */}
                  {caseData.parties.filter((p: any) => p.side === 'appellee').map((party: any, idx: number) => (
                    <div key={`appellee-${idx}`} className="case-party-tag case-party-tag--appellee">
                      <span className="case-party-tag__icon">د</span>
                      <span className="case-party-tag__name">{party.name}</span>
                      <span className="case-party-tag__role">{party.role || 'المستأنَف ضدّه'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sessions Section */}
          {caseData.sessions && caseData.sessions.length > 0 && (
            <div className="case-card" data-tour="case-sessions-section">
              <div className="case-card__header">
                <div className="case-card__title">
                  <Calendar size={16} />
                  جلسات القضية ({caseData.sessions.length})
                </div>
                <button className="case-card__action" onClick={() => setShowAppointmentsModal(true)}>
                  عرض الكل
                </button>
              </div>
              <div className="case-card__content">
                <div className="case-sessions-list">
                  {caseData.sessions.slice(0, 3).map((session: any, idx: number) => {
                    const isUpcoming = session.status === 'جديدة' || session.status === 'scheduled';
                    const { day, month } = parseSessionDate(session.session_date);

                    return (
                      <div key={idx} className={`case-session-item ${isUpcoming ? 'case-session-item--upcoming' : ''}`}>
                        <div className="case-session-item__date-box">
                          <span className="case-session-item__day">{day}</span>
                          <span className="case-session-item__month">{month}</span>
                        </div>
                        <div className="case-session-item__content">
                          <div className="case-session-item__header">
                            {session.session_number != null && (
                              <span
                                title="رقم الجلسة التسلسلي ضمن القضية"
                                style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'var(--quiet-gray-100, #f1f5f9)', color: 'var(--color-text-secondary, #64748b)', fontWeight: 600 }}
                              >
                                الجلسة {session.session_number}
                              </span>
                            )}
                            <span className="case-session-item__title">
                              {session.session_type || 'جلسة'}
                            </span>
                            <span className={`case-session-item__status ${isUpcoming ? 'case-session-item__status--upcoming' : 'case-session-item__status--completed'}`}>
                              {isUpcoming ? 'قادمة' : session.status}
                            </span>
                            {session.source === 'manual' && (
                              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontWeight: 500 }}>يدوية</span>
                            )}
                          </div>
                          <div className="case-session-item__meta">
                            {toHijri(session.session_date) && (
                              <span title="التاريخ الهجري (أم القرى)">
                                <Calendar size={12} />
                                {toHijri(session.session_date)}
                              </span>
                            )}
                            {session.session_time && (
                              <span>
                                <Clock size={12} />
                                {session.session_time}
                              </span>
                            )}
                            {session.court && (
                              <span>
                                <Building size={12} />
                                {session.court}
                              </span>
                            )}
                            {session.method && (
                              <span className={`case-session-item__method ${session.method === 'عن بعد' ? 'case-session-item__method--remote' : 'case-session-item__method--inperson'}`}>
                                {session.method === 'عن بعد' ? <Video size={12} /> : <Building size={12} />}
                                {session.method}
                              </span>
                            )}
                          </div>
                          {/* أزرار الجلسة */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                            {/* زر غرفة التحضير — يفتح workspace الجلسة */}
                            <Link
                              to={`/sessions/${session.id}/prep`}
                              onClick={(e) => e.stopPropagation()}
                              className="case-session-item__join-btn"
                              style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
                              title="افتح غرفة تحضير الجلسة"
                            >
                              <ClipboardList size={12} />
                              غرفة التحضير
                            </Link>
                            {/* زر الدخول للجلسة الافتراضية */}
                            {session.video_conference_url && isUpcoming && (
                              <a
                                href={session.video_conference_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="case-session-item__join-btn"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Video size={14} />
                                الدخول للجلسة
                                <ExternalLink size={12} />
                              </a>
                            )}
                            {/* زر إعدادات إرسال الإفادة - للجلسات القادمة */}
                            {isUpcoming && (
                              <button
                                className={`case-session-item__notify-btn ${session.notify_client ? 'case-session-item__notify-btn--active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNotifyModalSession({
                                    id: session.id,
                                    mode: (session.notify_client_mode as NotifyMode) ?? null,
                                    enabled: !!session.notify_client,
                                  });
                                }}
                                title="إعدادات إرسال الإفادة للعميل"
                              >
                                <FileText size={12} />
                                {session.notify_client
                                  ? session.notify_client_mode === 'save_only'
                                    ? 'إفادة (للمراجعة) ✓'
                                    : session.notify_client_mode === 'raw'
                                      ? 'إفادة (خام) ✓'
                                      : 'سيتم ارسال الافادة ✓'
                                  : 'ارسال الافادة'}
                              </button>
                            )}
                            {/* زر ضبط الجلسة - للجلسات المنتهية مع ضبط */}
                            {!isUpcoming && session.session_text && (
                              <button
                                className="case-session-item__join-btn"
                                onClick={(e) => { e.stopPropagation(); setSelectedDabtSession(session); }}
                              >
                                <FileText size={14} />
                                ضبط الجلسة
                              </button>
                            )}
                            {/* زر إرسال تقرير الجلسة (PDF) للعميل - للجلسات المنتهية مع ضبط */}
                            {!isUpcoming && session.session_text && (
                              <button
                                className="case-session-item__join-btn"
                                style={{ background: 'rgba(31, 58, 95, 0.10)', color: '#1f3a5f' }}
                                onClick={(e) => { e.stopPropagation(); setReportModalSession(session.id); }}
                                title="إرسال تقرير الجلسة للعميل كملف PDF عبر واتساب"
                              >
                                <Send size={14} />
                                إرسال تقرير الجلسة
                              </button>
                            )}
                            {/* زر منطوق الحكم - للجلسات التي صدر فيها حكم */}
                            {session.session_judgement && (
                              <button
                                className="case-session-item__join-btn"
                                style={{ background: 'rgba(180, 140, 60, 0.12)', color: '#8a6620' }}
                                onClick={(e) => { e.stopPropagation(); setJudgementActiveTab('text'); setSelectedJudgementSession(session); }}
                                title="عرض منطوق الحكم القضائي"
                              >
                                <FileText size={14} />
                                منطوق الحكم
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Judgements Section - الأحكام القضائية */}
          {caseData.judgements && caseData.judgements.length > 0 && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <FileText size={16} />
                  الأحكام القضائية ({caseData.judgements.length})
                </div>
              </div>
              <div className="case-card__content">
                <div className="case-judgements-list">
                  {caseData.judgements.map((judgement: any, idx: number) => {
                    const isFinal = judgement.judgement_type === 'نهائي';
                    const canObject = canStillObjectOn(judgement);
                    const objectionDays = objectionDaysLeft(judgement);
                    return (
                      <div key={`judgement-${idx}`} className="case-judgement-item">
                        <div className="case-judgement-item__header">
                          <span className="case-judgement-item__title">
                            {judgement.judgement_description || 'حكم'}
                            {judgement.judgement_code && (
                              <span className="case-judgement-item__code"> — صك رقم {judgement.judgement_code}</span>
                            )}
                          </span>
                          <span className={`case-judgement-item__type ${isFinal ? 'case-judgement-item__type--final' : 'case-judgement-item__type--pending'}`}>
                            {judgement.judgement_type || 'غير محدد'}
                          </span>
                        </div>
                        <div className="case-judgement-item__meta">
                          {judgement.court_name && <span><Building size={12} /> {judgement.court_name}</span>}
                          {judgement.sak_date && <span><Calendar size={12} /> {new Date(judgement.sak_date).toLocaleDateString('ar-SA')}</span>}
                          {canObject && (
                            <span className="case-judgement-item__objection">
                              <Clock size={12} /> {objectionDaysLabel(objectionDays)}
                            </span>
                          )}
                        </div>
                        <button
                          className="case-session-item__join-btn"
                          style={{ background: 'rgba(180, 140, 60, 0.12)', color: '#8a6620', marginTop: '6px' }}
                          onClick={() => { setJudgementActiveTab('text'); setSelectedJudgementSession(judgement); }}
                          title="عرض تفاصيل الحكم الكاملة (الوقائع + الأسباب + المنطوق)"
                        >
                          <FileText size={14} />
                          عرض الحكم كاملاً
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Timeline Section */}
          <div className="case-timeline-section" data-tour="case-timeline">
            <div className="case-timeline-header">
              <div className="case-timeline-header__title">
                <Activity size={16} />
                النشاطات الأخيرة
              </div>
              <button className="case-card__action" onClick={() => setShowQuickActionsModal(true)}>
                <Plus size={14} />
                إضافة
              </button>
            </div>
            <div className="case-timeline-content">
              <Timeline events={timelineEvents} caseId={caseData.id} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="case-sidebar">

          {/* Quick Overview */}
          <div className="case-card" data-tour="case-overview">
            <div className="case-card__header">
              <div className="case-card__title">
                <Hash size={16} />
                نظرة سريعة
              </div>
            </div>
            <div className="case-card__content case-card__content--compact">
              <div className="case-info-row">
                <div className="case-info-row__icon">
                  <AlertCircle size={14} />
                </div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">الحالة / حالة ناجز</div>
                  <div className="case-info-row__value">
                    {caseData.status_arabic || caseData.status}
                    <span style={{ margin: '0 6px', color: 'var(--color-text-secondary)' }}>·</span>
                    {caseData.najiz_status_arabic
                      ? <span style={{ color: 'var(--law-navy)' }}>{caseData.najiz_status_arabic}</span>
                      : <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>لم يتم الربط</span>
                    }
                  </div>
                </div>
              </div>
              <div className="case-info-row">
                <div className="case-info-row__icon">
                  <Briefcase size={14} />
                </div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">نوع القضية</div>
                  <div className="case-info-row__value">{caseData.case_type_arabic || caseData.type_arabic || caseData.case_type || 'غير محدد'}</div>
                </div>
              </div>
              <div className="case-info-row">
                <div className="case-info-row__icon">
                  <Building size={14} />
                </div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">المحكمة</div>
                  <div className="case-info-row__value">{caseData.court || 'غير محدد'}</div>
                </div>
              </div>
              <div className="case-info-row">
                <div className="case-info-row__icon">
                  <Calendar size={14} />
                </div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">تاريخ الإنشاء</div>
                  <div className="case-info-row__value">{formatDate(caseData.created_at)}</div>
                </div>
              </div>
              <div className="case-info-row">
                <div className="case-info-row__icon">
                  <Clock size={14} />
                </div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">الجلسة القادمة</div>
                  <div className="case-info-row__value">{formatDate(caseData.next_hearing || null)}</div>
                </div>
              </div>
              <div className="case-info-row">
                <div className="case-info-row__icon">
                  <User size={14} />
                </div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">العميل</div>
                  <div className="case-info-row__value">
                    {caseData.client_id ? (
                      <Link
                        to={`/clients/${caseData.client_id}`}
                        style={{ color: 'var(--law-navy)', textDecoration: 'none', fontWeight: 600 }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'; }}
                      >
                        {caseData.client_name}
                      </Link>
                    ) : (
                      caseData.client_name
                    )}
                    {((caseData as any).extra_clients?.length ?? 0) > 0 ? (
                      <button
                        type="button"
                        onClick={() => setShowClientPhoneModal(true)}
                        title="عرض كل عملاء القضية"
                        style={{
                          marginInlineStart: 6, padding: '1px 8px', fontSize: 11, fontWeight: 600,
                          background: 'var(--law-navy-light, rgba(30,58,95,.08))', color: 'var(--law-navy)',
                          border: '1px solid var(--color-border)', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        وآخرون +{(caseData as any).extra_clients.length}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowClientPhoneModal(true)}
                        title="عملاء القضية — عرض وإضافة موكلين آخرين من أطراف الدعوى"
                        style={{
                          marginInlineStart: 6, padding: '1px 8px', fontSize: 11, fontWeight: 600,
                          background: 'transparent', color: 'var(--law-navy)',
                          border: '1px dashed var(--color-border)', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        + عملاء
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {caseData.client_phone ? (
                <div className="case-info-row">
                  <div className="case-info-row__icon">
                    <Phone size={14} />
                  </div>
                  <div className="case-info-row__content">
                    <div className="case-info-row__label">الجوال</div>
                    <div className="case-info-row__value">{caseData.client_phone}</div>
                  </div>
                </div>
              ) : (
                <button
                  className="case-add-phone-btn"
                  onClick={() => setShowClientPhoneModal(true)}
                >
                  <Phone size={14} />
                  إضافة رقم العميل
                </button>
              )}
            </div>
          </div>

          {/* Wekalat summary card */}
          {(() => {
            const s = (caseData as any)?.wekalat_summary;
            if (!s) return null;
            const primary = s.primary_active_wekala;
            const matched = s.matched_count ?? 0;
            const stateClassMap: Record<string, string> = {
              active: 'cw-days--ok',
              expiring_soon: 'cw-days--soon',
              expiring_urgent: 'cw-days--urgent',
              expired: 'cw-days--expired',
              terminated: 'cw-days--expired',
              none: 'cw-days--none',
            };
            const badgeMap: Record<string, string> = {
              'معتمدة': 'cw-badge--approved',
              'منتهية': 'cw-badge--expired',
              'مفسوخة': 'cw-badge--terminated',
              'قيد الاعتماد': 'cw-badge--pending',
              'موقوفة': 'cw-badge--suspended',
            };
            return (
              <div className="case-card">
                <div className="case-card__header">
                  <div className="case-card__title">
                    <Scroll size={16} />
                    الوكالة الرئيسية
                  </div>
                  <button className="case-card__action" onClick={() => setShowWekalatModal(true)}>
                    عرض الكل {matched > 0 ? `(${matched})` : ''}
                  </button>
                </div>
                <div className="case-card__content case-card__content--compact">
                  {primary ? (
                    <>
                      <div className="cw-sidecard__row">
                        <span className="cw-sidecard__number">#{primary.number}</span>
                        <span className={`cw-badge ${badgeMap[primary.status] ?? 'cw-badge--pending'}`}>
                          {primary.status}
                        </span>
                      </div>
                      <div className="cw-sidecard__row">
                        <span className={`cw-days ${stateClassMap[primary.expiry_state] ?? 'cw-days--none'}`}>
                          {primary.expiry_state === 'expired' ? 'منتهية' :
                            primary.days_until_expiry !== null
                              ? `تنتهي خلال ${primary.days_until_expiry} يوم`
                              : 'بدون تاريخ انتهاء'}
                        </span>
                      </div>
                      {s.suggested_count > 0 && (
                        <div className="cw-sidecard__meta">+ {s.suggested_count} اقتراحات</div>
                      )}
                    </>
                  ) : s.has_expired_only ? (
                    <div className="cw-alert cw-alert--danger" style={{ padding: '6px 0', borderBottom: 'none', borderRadius: 4 }}>
                      <AlertCircle size={13} /> كل الوكالات منتهية
                    </div>
                  ) : (
                    <div className="cw-alert cw-alert--warn" style={{ padding: '6px 0', borderBottom: 'none', borderRadius: 4 }}>
                      <AlertCircle size={13} /> لا توجد وكالة مرتبطة
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Fees */}
          <div className="case-card" data-tour="case-fees-section">
            <div className="case-card__header">
              <div className="case-card__title">
                <DollarSign size={16} />
                الرسوم والمدفوعات
              </div>
              {billing && billing.contracts_count > 0 && (
                <Link to={`/contracts?case_id=${caseData.id}`} className="case-card__action">
                  العقود ({billing.contracts_count})
                </Link>
              )}
            </div>
            <div className="case-card__content">
              <div className="case-fees-summary">
                <div className="case-fee-item">
                  <div className="case-fee-item__value">{totalFees.toLocaleString()}</div>
                  <div className="case-fee-item__label">الإجمالي</div>
                </div>
                <div className="case-fee-item case-fee-item--paid">
                  <div className="case-fee-item__value">{paidFees.toLocaleString()}</div>
                  <div className="case-fee-item__label">المدفوع</div>
                </div>
                <div className={`case-fee-item ${hasOverdue ? 'case-fee-item--overdue' : 'case-fee-item--remaining'}`}>
                  <div className="case-fee-item__value">{remainingFees.toLocaleString()}</div>
                  <div className="case-fee-item__label">المتبقي</div>
                </div>
              </div>
              <div className="case-progress">
                <div className="case-progress__bar" style={{ width: `${Math.min(paymentProgress, 100)}%` }}></div>
              </div>
              <div className="case-progress__label">
                {paymentProgress.toFixed(0)}% تحصيل
              </div>

              {/* Billing Stats */}
              {billing && (
                <div className="case-billing-stats">
                  {billing.invoices_count > 0 && (
                    <Link to={`/billing/invoices?case_id=${caseData.id}`} className="case-billing-stat">
                      <span className="case-billing-stat__icon case-billing-stat__icon--blue">
                        <FileText size={12} />
                      </span>
                      <span className="case-billing-stat__text">
                        {billing.invoices_count} فاتورة
                      </span>
                    </Link>
                  )}
                  {billing.overdue_invoices_count > 0 && (
                    <Link to={`/billing/invoices?case_id=${caseData.id}&status=overdue`} className="case-billing-stat case-billing-stat--warning">
                      <span className="case-billing-stat__icon case-billing-stat__icon--red">
                        <AlertCircle size={12} />
                      </span>
                      <span className="case-billing-stat__text">
                        {billing.overdue_invoices_count} متأخرة
                      </span>
                    </Link>
                  )}
                </div>
              )}

              {/* Recent Payments */}
              {billing && billing.recent_payments && billing.recent_payments.length > 0 && (
                <div className="case-recent-payments">
                  <div className="case-recent-payments__title">آخر المدفوعات</div>
                  {billing.recent_payments.slice(0, 3).map((payment) => (
                    <div key={payment.id} className="case-recent-payment">
                      <div className="case-recent-payment__info">
                        <span className="case-recent-payment__amount">
                          {payment.amount.toLocaleString()} ر.س
                        </span>
                        <span className="case-recent-payment__date">
                          {new Date(payment.payment_date).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                      <span className="case-recent-payment__method">
                        {payment.payment_method === 'cash' ? 'نقداً' :
                         payment.payment_method === 'bank_transfer' ? 'تحويل' :
                         payment.payment_method === 'check' ? 'شيك' :
                         payment.payment_method === 'card' ? 'بطاقة' : payment.payment_method}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* No billing data message */}
              {(!billing || (billing.contracts_count === 0 && totalFees === 0)) && (
                <div className="case-no-billing">
                  <p>لا يوجد عقد مرتبط بهذه القضية</p>
                  <Link to={`/contracts/new?case_id=${caseData.id}`} className="case-no-billing__link">
                    <Plus size={14} />
                    إنشاء عقد
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* باحث الأنظمة */}
      <LawSearchModal
        isOpen={showLawSearch}
        onClose={() => setShowLawSearch(false)}
        caseId={Number(caseData.id)}
      />

      {/* راج — السوابق القضائية */}
      <PrecedentSearchModal
        isOpen={showPrecedents}
        onClose={() => setShowPrecedents(false)}
        caseId={Number(caseData.id)}
        caseTitle={caseData.title}
      />

      {/* Modals */}
      <EditCaseModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        caseData={caseData}
        onSave={async (updated) => { await handleUpdateCase(updated); refreshCaseData(); }}
      />

      <AddTaskModal
        isOpen={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        onTaskAdded={handleTaskAdded}
        caseId={caseData.id}
        caseTitle={caseData.title}
        clientName={caseData.client_name}
      />

      <CaseDocumentsModal
        isOpen={showDocumentsModal}
        onClose={() => setShowDocumentsModal(false)}
        caseId={caseData.id}
        caseTitle={caseData.title}
        clientName={caseData.client_name}
        caseNumber={caseData.file_number}
        caseType={caseData.case_type}
        parties={caseData.parties}
        clientId={caseData.client_id ? Number(caseData.client_id) : undefined}
      />

      <LegalMemoWorkspace
        isOpen={showMemoWorkspace}
        onClose={() => setShowMemoWorkspace(false)}
        caseId={caseData.id}
        caseTitle={caseData.title}
        onMemoCreated={() => setShowMemoWorkspace(false)}
      />

      <CaseTasksModal
        isOpen={showTasksModal}
        onClose={() => setShowTasksModal(false)}
        caseId={caseData.id}
        caseTitle={caseData.title}
      />

      <CaseAppointmentsModal
        isOpen={showAppointmentsModal}
        onClose={() => setShowAppointmentsModal(false)}
        caseData={caseData}
        onShowDabt={(session) => setSelectedDabtSession(session)}
      />

      <QuickActionsModal
        isOpen={showQuickActionsModal}
        onClose={() => setShowQuickActionsModal(false)}
        caseId={caseData.id}
        caseTitle={caseData.title}
      />

      <ClientPhoneModal
        isOpen={showClientPhoneModal}
        onClose={() => setShowClientPhoneModal(false)}
        caseId={caseData.id}
        onSuccess={() => refreshCaseData()}
      />

      <CaseMessagesModal
        isOpen={showMessagesModal}
        onClose={() => setShowMessagesModal(false)}
        caseId={Number(caseData.id)}
        caseTitle={caseData.title}
        clientName={caseData.client_name}
      />

      {showWekalatModal && (
        <div className="sc-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowWekalatModal(false); }}>
          <div className="sc-modal" style={{ maxWidth: 920 }}>
            <div className="sc-header">
              <Scroll size={16} className="sc-header__icon" />
              <div className="sc-header__title">وكالات القضية</div>
              <div className="sc-header__case" title={caseData.file_number}>#{caseData.file_number}</div>
              <div className="sc-header__spacer" />
              <button className="sc-close" onClick={() => setShowWekalatModal(false)}>
                <XIcon size={16} />
              </button>
            </div>
            <div className="sc-body" style={{ padding: 12 }}>
              <CaseWekalatPanel
                caseId={caseData.id}
                caseFileNumber={caseData.file_number}
              />
            </div>
          </div>
        </div>
      )}

      <ShareCaseModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        caseId={caseData.id}
        caseTitle={caseData.title}
      />

      <LinkToNajizModal
        isOpen={showLinkNajizModal}
        onClose={() => setShowLinkNajizModal(false)}
        caseId={caseData.id}
        caseTitle={caseData.title}
        onSuccess={() => {
          setShowLinkNajizModal(false);
          refreshCaseData();
        }}
      />

      {/* مودل تفضيلات إرسال الإفادة */}
      {notifyModalSession && (
        <SendDabtPreferencesModal
          open={!!notifyModalSession}
          onClose={() => setNotifyModalSession(null)}
          sessionId={notifyModalSession.id}
          currentMode={notifyModalSession.mode}
          currentEnabled={notifyModalSession.enabled}
          onSuccess={(result) => {
            if (caseData) {
              setCaseData({
                ...caseData,
                sessions: caseData.sessions?.map((s: any) =>
                  s.id === notifyModalSession.id
                    ? { ...s, notify_client: result.enabled, notify_client_mode: result.mode }
                    : s
                ),
              });
            }
          }}
        />
      )}

      {/* مودل إرسال تقرير الجلسة (PDF) للعميل */}
      {reportModalSession !== null && (
        <SendSessionReportModal
          open={reportModalSession !== null}
          onClose={() => setReportModalSession(null)}
          sessionId={reportModalSession}
          onSent={() => {
            if (caseData) {
              setCaseData({
                ...caseData,
                sessions: caseData.sessions?.map((s: any) =>
                  s.id === reportModalSession
                    ? { ...s, dabt_sent_to_client: true, report_status: 'sent' }
                    : s
                ),
              });
            }
          }}
        />
      )}

      {/* Modal ضبط الجلسة */}
      {selectedDabtSession && (
        <div className="dabt-modal-overlay" onClick={() => setSelectedDabtSession(null)}>
          <div className="dabt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dabt-modal-header">
              <h3>ضبط الجلسة</h3>
              <button className="dabt-modal-close" onClick={() => setSelectedDabtSession(null)}>✕</button>
            </div>
            <div className="dabt-modal-info">
              <div className="dabt-modal-info-row">
                <span>القضية:</span>
                <strong>{caseData?.title || '-'}</strong>
              </div>
              <div className="dabt-modal-info-row">
                <span>التاريخ:</span>
                <strong>{selectedDabtSession.session_date || '-'}</strong>
              </div>
              <div className="dabt-modal-info-row">
                <span>المحكمة:</span>
                <strong>{selectedDabtSession.court || '-'}</strong>
              </div>
              {selectedDabtSession.dabt_sent_to_client && (
                <div className="dabt-modal-info-row">
                  <span>حالة الإرسال:</span>
                  <span style={{ color: '#059669', fontWeight: 500, fontSize: '11px' }}>تم الإرسال ✓</span>
                </div>
              )}
            </div>
            {selectedDabtSession.session_text_summary && (
              <div className="dabt-modal-summary">
                <h4>ملخص الإفادة المرسلة</h4>
                <div className="dabt-modal-summary-text">{selectedDabtSession.session_text_summary}</div>
              </div>
            )}
            <div className="dabt-modal-text-container">
              <h4>نص الضبط الكامل</h4>
              <div className="dabt-modal-text">{selectedDabtSession.session_text}</div>
            </div>
          </div>
        </div>
      )}

      {/* Modal الحكم القضائي - تخطيط ERP بعمودين: sidebar معلومات + main tabs */}
      {selectedJudgementSession && (() => {
        const j = selectedJudgementSession;
        const subject = j.subject || null;
        const pleading = j.pleading || null;
        const reasons = j.reasons || null;
        const text = j.text || j.session_judgement || null;
        const isFinal = j.judgement_type === 'نهائي';
        const canObject = canStillObjectOn(j);

        const tabs = [
          text && { key: 'text', label: 'المنطوق', body: text, icon: '⚖️' },
          subject && { key: 'subject', label: 'الوقائع', body: subject, icon: '📋' },
          pleading && { key: 'pleading', label: 'المرافعة', body: pleading, icon: '💬' },
          reasons && { key: 'reasons', label: 'الأسباب', body: reasons, icon: '📝' },
        ].filter(Boolean) as { key: string; label: string; body: string; icon: string }[];

        // اختر افتراضي tab صالح
        const activeKey = tabs.find(t => t.key === judgementActiveTab)?.key || tabs[0]?.key || 'text';
        const activeTab = tabs.find(t => t.key === activeKey);

        const formatDate = (d: string | null | undefined) => {
          if (!d) return '-';
          try {
            return new Date(d).toLocaleString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
          } catch { return d; }
        };

        const close = () => { setSelectedJudgementSession(null); setJudgementActiveTab('text'); };

        return (
          <div className="jm-overlay" onClick={close}>
            <div className="jm-modal" onClick={(e) => e.stopPropagation()}>
              {/* Header - compact single row */}
              <div className="jm-header">
                <FileText size={15} className="jm-header__icon" />
                <span className="jm-header__title">
                  {j.judgement_description || 'الحكم القضائي'}
                </span>
                {j.judgement_code && (
                  <span className="jm-header__sak" title="رقم الصك">{j.judgement_code}</span>
                )}
                <div className="jm-header__spacer" />
                <div className="jm-header__badges">
                  {j.judgement_type && (
                    <span className={`jm-badge ${isFinal ? 'jm-badge--final' : 'jm-badge--pending'}`}>
                      {j.judgement_type}
                    </span>
                  )}
                  {canObject && (
                    <span className="jm-badge jm-badge--objection">
                      اعتراض: {objectionDaysLeft(j)} يوم
                    </span>
                  )}
                </div>
                <button className="jm-close" onClick={close} aria-label="إغلاق">
                  <XIcon size={16} />
                </button>
              </div>

              {/* Body: Sidebar + Main */}
              <div className="jm-body">
                {/* Sidebar - Metadata */}
                <aside className="jm-sidebar">
                  <div className="jm-group">
                    <h4 className="jm-group__title">القضية</h4>
                    <div className="jm-row">
                      <span className="jm-row__label">العنوان</span>
                      <span className="jm-row__value">{caseData?.title || '-'}</span>
                    </div>
                    {caseData?.file_number && (
                      <div className="jm-row">
                        <span className="jm-row__label">الرقم</span>
                        <span className="jm-row__value">{caseData.file_number}</span>
                      </div>
                    )}
                  </div>

                  <div className="jm-group">
                    <h4 className="jm-group__title">المحكمة</h4>
                    <div className="jm-row">
                      <span className="jm-row__label">الجهة</span>
                      <span className="jm-row__value">{j.court_name || j.court || '-'}</span>
                    </div>
                    {j.circle_name && (
                      <div className="jm-row">
                        <span className="jm-row__label">الدائرة</span>
                        <span className="jm-row__value">{j.circle_name}</span>
                      </div>
                    )}
                  </div>

                  {(j.session_date || j.sak_date || j.delivery_date) && (
                    <div className="jm-group">
                      <h4 className="jm-group__title">التواريخ</h4>
                      {j.session_date && (
                        <div className="jm-row">
                          <span className="jm-row__label">النطق</span>
                          <span className="jm-row__value">{formatDate(j.session_date)}</span>
                        </div>
                      )}
                      {j.sak_date && (
                        <div className="jm-row">
                          <span className="jm-row__label">إصدار الصك</span>
                          <span className="jm-row__value">{formatDate(j.sak_date)}</span>
                        </div>
                      )}
                      {j.delivery_date && (
                        <div className="jm-row">
                          <span className="jm-row__label">التسليم</span>
                          <span className="jm-row__value">{formatDate(j.delivery_date)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {(j.available_for_objection || j.objection_due_date) && (
                    <div className="jm-group">
                      <h4 className="jm-group__title">الاعتراض</h4>
                      <div className="jm-row">
                        <span className="jm-row__label">الحالة</span>
                        <span className={`jm-row__value ${canObject ? 'jm-row__value--accent' : ''}`}>
                          {canObject ? 'متاح' : 'منتهي'}
                        </span>
                      </div>
                      {j.remaining_objection_days !== null && j.remaining_objection_days !== undefined && (
                        <div className="jm-row">
                          <span className="jm-row__label">المتبقي</span>
                          <span className="jm-row__value">{j.remaining_objection_days} يوم</span>
                        </div>
                      )}
                      {j.objection_due_date && (
                        <div className="jm-row">
                          <span className="jm-row__label">ينتهي</span>
                          <span className="jm-row__value">{j.objection_due_date}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {(j.sak_or_decision || j.elimination_dispute_judgement_type_name) && (
                    <div className="jm-group">
                      <h4 className="jm-group__title">التصنيف</h4>
                      {j.sak_or_decision && (
                        <div className="jm-row">
                          <span className="jm-row__label">الفئة</span>
                          <span className="jm-row__value">{j.sak_or_decision}</span>
                        </div>
                      )}
                      {j.elimination_dispute_judgement_type_name && (
                        <div className="jm-row">
                          <span className="jm-row__label">النوع</span>
                          <span className="jm-row__value">{j.elimination_dispute_judgement_type_name}</span>
                        </div>
                      )}
                    </div>
                  )}
                </aside>

                {/* Main - Tabs + Content */}
                <main className="jm-main">
                  {tabs.length === 0 ? (
                    <div className="jm-empty">لا يوجد نص محفوظ لهذا الحكم.</div>
                  ) : (
                    <>
                      <div className="jm-tabs">
                        {tabs.map(tab => (
                          <button
                            key={tab.key}
                            className={`jm-tab ${tab.key === activeKey ? 'jm-tab--active' : ''}`}
                            onClick={() => setJudgementActiveTab(tab.key)}
                          >
                            <span className="jm-tab__icon">{tab.icon}</span>
                            <span>{tab.label}</span>
                          </button>
                        ))}
                      </div>
                      <div className="jm-content">{activeTab?.body || ''}</div>
                    </>
                  )}
                </main>
              </div>
            </div>
          </div>
        );
      })()}

      {/* احتفال الفوز — يظهر مرة لكل (مستخدم، قضية) عبر case_outcome_user_views */}
      {caseData && (
        <WinCelebrationModal
          isOpen={showCelebration}
          caseData={caseData}
          replayMode={celebrationReplayMode}
          onClose={() => {
            setShowCelebration(false);
            // عند الإغلاق العادي (ليس replay) نُعلّم المشاهدة محلياً
            // كي لا يظهر مرة أخرى حتى قبل تحديث caseData من الـ server
            if (!celebrationReplayMode) {
              setCaseData(prev => prev ? { ...prev, outcome_celebrated_by_current_user: true } : prev);
            }
            setCelebrationReplayMode(false);
          }}
        />
      )}
    </div>
  );
};

export default CaseDetailPage;
