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
  Building,
  Video,
  ExternalLink,
  ChevronLeft,
  MoreHorizontal,
  Briefcase,
  Hash,
  Scale,
  Activity
} from 'lucide-react';
import Timeline from '../components/Timeline';
import EditCaseModal from '../components/EditCaseModal';
import AddTaskModal from '../components/AddTaskModal';
import CaseDocumentsModal from '../components/CaseDocumentsModal';
import CaseTasksModal from '../components/CaseTasksModal';
import { CaseAppointmentsModal } from '../components/CaseAppointmentsModal';
import QuickActionsModal from '../components/QuickActionsModal';
import ClientPhoneModal from '../components/ClientPhoneModal';
import type { TimelineEvent } from '../components/Timeline';
import { CaseService } from '../services/caseService';
import { ActivityService } from '../services/activityService';
import { DocumentService } from '../services/documentService';
import { TaskService } from '../services/taskService';
import type { Case } from '../types';
import '../styles/case-detail-page.css';

const CaseDetailPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false);
  const [showQuickActionsModal, setShowQuickActionsModal] = useState(false);
  const [showClientPhoneModal, setShowClientPhoneModal] = useState(false);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [tasksCount, setTasksCount] = useState(0);

  // Ref to prevent duplicate fetches
  const hasFetchedRef = useRef<string | null>(null);

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

  // Separate function for force refresh
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

  // Calculate fees
  const totalFees = caseData.contract_value || 0;
  const paidFees = (caseData as any).paid_amount || 0;
  const remainingFees = totalFees - paidFees;
  const paymentProgress = totalFees > 0 ? (paidFees / totalFees) * 100 : 0;

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
          <div className="case-detail-header__title-section">
            <div className="case-detail-header__title">
              <FileText size={18} />
              {caseData.title}
            </div>
            <div className="case-detail-header__subtitle">
              رقم الملف: {caseData.file_number} • {caseData.case_type}
            </div>
          </div>

          {/* Badges */}
          <div className="case-detail-header__badges">
            <span className={`case-badge ${getStatusBadgeClass(caseData.najiz_status || caseData.status)}`}>
              <span className="case-badge__dot"></span>
              {caseData.najiz_status || caseData.status}
            </span>
            {caseData.priority && (
              <span className={`case-badge ${getPriorityBadgeClass(caseData.priority)}`}>
                {caseData.priority}
              </span>
            )}
          </div>

          {/* Quick Tabs */}
          <div className="case-header-tabs">
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
          </div>

          {/* Actions */}
          <div className="case-detail-header__actions">
            <button onClick={() => setShowEditModal(true)} className="case-header-btn case-header-btn--primary">
              <Edit size={16} />
              <span>تعديل</span>
            </button>
            <button onClick={() => setShowQuickActionsModal(true)} className="case-header-btn">
              <Plus size={16} />
              <span>إجراءات</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="case-detail-layout">
        {/* Main Content */}
        <div className="case-main-content">
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
                </div>
              </div>
            </div>
          )}

          {/* Sessions Section */}
          {caseData.sessions && caseData.sessions.length > 0 && (
            <div className="case-card">
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
                            <span className="case-session-item__title">
                              {session.session_type || 'جلسة'}
                            </span>
                            <span className={`case-session-item__status ${isUpcoming ? 'case-session-item__status--upcoming' : 'case-session-item__status--completed'}`}>
                              {isUpcoming ? 'قادمة' : session.status}
                            </span>
                          </div>
                          <div className="case-session-item__meta">
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
                          {/* زر الدخول للجلسة الافتراضية - فقط للجلسات القادمة */}
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Timeline Section */}
          <div className="case-timeline-section">
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
          <div className="case-card">
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
                  <div className="case-info-row__label">الحالة</div>
                  <div className="case-info-row__value">{caseData.najiz_status || caseData.status}</div>
                </div>
              </div>
              <div className="case-info-row">
                <div className="case-info-row__icon">
                  <Briefcase size={14} />
                </div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">نوع القضية</div>
                  <div className="case-info-row__value">{caseData.case_type || 'غير محدد'}</div>
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
                  <div className="case-info-row__value">{caseData.client_name}</div>
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

          {/* Fees */}
          <div className="case-card">
            <div className="case-card__header">
              <div className="case-card__title">
                <DollarSign size={16} />
                الرسوم والمدفوعات
              </div>
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
                <div className="case-fee-item case-fee-item--remaining">
                  <div className="case-fee-item__value">{remainingFees.toLocaleString()}</div>
                  <div className="case-fee-item__label">المتبقي</div>
                </div>
              </div>
              <div className="case-progress">
                <div className="case-progress__bar" style={{ width: `${paymentProgress}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditCaseModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        caseData={caseData}
        onSave={handleUpdateCase}
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
    </div>
  );
};

export default CaseDetailPage;
