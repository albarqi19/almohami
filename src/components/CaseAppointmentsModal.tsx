import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  MapPin,
  Plus,
  Edit3,
  CheckCircle,
  XCircle,
  Play,
  Video,
  Gavel,
  CalendarClock,
  HelpCircle,
  FileText
} from 'lucide-react';
import { appointmentService } from '../services/appointmentService';
import { AddAppointmentModal } from './AddAppointmentModal';
import { useModalTour } from '../hooks/useModalTour';
import type { Appointment, AppointmentType, AppointmentStatus, Case, CaseSession } from '../types';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

interface CaseAppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: Case;
  /** فتح مودل «ضبط الجلسة» في الصفحة الأم (يُعاد استخدام نفس المودل بدل تكراره) */
  onShowDabt?: (session: CaseSession) => void;
}

export const CaseAppointmentsModal: React.FC<CaseAppointmentsModalProps> = ({
  isOpen,
  onClose,
  caseData,
  onShowDabt
}) => {
  const { startTour, hasTour } = useModalTour('modal:case-appointments', isOpen);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessions = caseData.sessions || [];

  useEffect(() => {
    if (isOpen && caseData.id) {
      fetchAppointments();
    }
  }, [isOpen, caseData.id]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await appointmentService.getCaseAppointments(parseInt(caseData.id));
      setAppointments(data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('فشل في تحميل المواعيد');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTime: Date | string) => {
    const date = dateTime instanceof Date ? dateTime : new Date(dateTime);
    return {
      date: date.toLocaleDateString('ar-SA'),
      time: date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}د`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `${hours}س ${remaining}د` : `${hours}س`;
  };

  const getAppointmentTypeLabel = (type: AppointmentType): string => {
    const types: Record<AppointmentType, string> = {
      court_hearing: 'جلسة محكمة',
      client_meeting: 'موعد عميل',
      team_meeting: 'اجتماع فريق',
      document_filing: 'تقديم وثائق',
      arbitration: 'تحكيم',
      consultation: 'استشارة',
      mediation: 'وساطة',
      settlement: 'صلح',
      other: 'أخرى'
    };
    return types[type];
  };

  const getAppointmentStatusLabel = (status: AppointmentStatus): string => {
    const statuses: Record<AppointmentStatus, string> = {
      scheduled: 'مجدول',
      confirmed: 'مؤكد',
      in_progress: 'قيد التنفيذ',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      postponed: 'مؤجل',
      no_show: 'لم يحضر'
    };
    return statuses[status];
  };

  const getSessionStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'scheduled':
      case 'مجدولة':
      case 'جديدة':
        return { bg: '#eff6ff', color: '#2563eb', label: 'مجدولة' };
      case 'completed':
      case 'مكتملة':
      case 'منتهية':
        return { bg: '#ecfdf5', color: '#059669', label: 'منتهية' };
      case 'postponed':
      case 'مؤجلة':
        return { bg: '#fff7ed', color: '#ea580c', label: 'مؤجلة' };
      case 'cancelled':
      case 'ملغية':
        return { bg: '#fef2f2', color: '#dc2626', label: 'ملغية' };
      default:
        return { bg: '#f3f4f6', color: '#6b7280', label: status || 'غير محدد' };
    }
  };

  const getAppointmentStatusStyle = (status: AppointmentStatus) => {
    const styles: Record<AppointmentStatus, { bg: string; color: string }> = {
      scheduled: { bg: '#eff6ff', color: '#2563eb' },
      confirmed: { bg: '#ecfdf5', color: '#059669' },
      in_progress: { bg: '#fef9c3', color: '#ca8a04' },
      completed: { bg: '#ecfdf5', color: '#059669' },
      cancelled: { bg: '#fef2f2', color: '#dc2626' },
      postponed: { bg: '#fff7ed', color: '#ea580c' },
      no_show: { bg: '#f3f4f6', color: '#6b7280' }
    };
    return styles[status];
  };

  const handleConfirmAppointment = async (id: string) => {
    try { await appointmentService.confirmAppointment(parseInt(id)); fetchAppointments(); }
    catch (e) { console.error(e); }
  };
  const handleCancelAppointment = async (id: string) => {
    try { await appointmentService.cancelAppointment(parseInt(id), 'تم الإلغاء'); fetchAppointments(); }
    catch (e) { console.error(e); }
  };
  const handleStartAppointment = async (id: string) => {
    try { await appointmentService.startAppointment(parseInt(id)); fetchAppointments(); }
    catch (e) { console.error(e); }
  };
  const handleCompleteAppointment = async (id: string) => {
    try { await appointmentService.completeAppointment(parseInt(id)); fetchAppointments(); }
    catch (e) { console.error(e); }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="cam-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="cam-modal cam-modal--erp"
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Compact Header */}
          <div className="cam-erp-header">
            <div className="cam-erp-header__title">
              <CalendarClock size={14} />
              <span>الجلسات والمواعيد</span>
              {caseData.title && <span className="cam-erp-header__subtitle">— {caseData.title}</span>}
            </div>
            <div className="cam-erp-header__actions">
              {hasTour && (
                <button
                  data-tour="appts-help-btn"
                  className="cam-erp-icon-btn"
                  onClick={startTour}
                  title="جولة تعريفية"
                  aria-label="جولة تعريفية"
                >
                  <HelpCircle size={14} />
                </button>
              )}
              <button className="cam-erp-icon-btn" onClick={onClose} aria-label="إغلاق">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="cam-erp-body" data-tour="appts-content">
            {/* Section 1: Najiz Sessions */}
            <section className="cam-erp-section" data-tour="appts-sessions">
              <div className="cam-erp-section__header">
                <Gavel size={12} />
                <span className="cam-erp-section__title">جلسات ناجز</span>
                <span className="cam-erp-section__count">{sessions.length}</span>
              </div>
              {sessions.length === 0 ? (
                <div className="cam-erp-empty">لا توجد جلسات مستوردة من ناجز.</div>
              ) : (
                <div className="cam-erp-table-wrap">
                  <table className="cam-erp-table">
                    <thead>
                      <tr>
                        <th style={{ width: '18%' }}>التاريخ والوقت</th>
                        <th style={{ width: '22%' }}>النوع</th>
                        <th style={{ width: '28%' }}>المحكمة / الإدارة</th>
                        <th style={{ width: '14%' }}>الحالة</th>
                        <th style={{ width: '18%' }}>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session, index) => {
                        const statusStyle = getSessionStatusStyle(session.status);
                        return (
                          <tr key={session.id || index}>
                            <td>
                              <div className="cam-erp-cell__primary">{session.session_date || '—'}</div>
                              {session.session_time && (
                                <div className="cam-erp-cell__sub">{session.session_time}</div>
                              )}
                            </td>
                            <td>
                              <div className="cam-erp-cell__primary">{session.session_type || 'جلسة'}</div>
                              {session.session_number != null && (
                                <div className="cam-erp-cell__sub" title="رقم الجلسة التسلسلي ضمن القضية">
                                  الجلسة رقم {session.session_number}
                                </div>
                              )}
                              {session.is_video_conference && (
                                <div className="cam-erp-cell__sub cam-erp-cell__sub--accent">
                                  <Video size={10} /> مرئية
                                </div>
                              )}
                            </td>
                            <td>
                              <div className="cam-erp-cell__primary">{session.court || '—'}</div>
                              {session.department && (
                                <div className="cam-erp-cell__sub">{session.department}</div>
                              )}
                            </td>
                            <td>
                              <span
                                className="cam-erp-status"
                                style={{ background: statusStyle.bg, color: statusStyle.color }}
                              >
                                {statusStyle.label}
                              </span>
                            </td>
                            <td>
                              <div className="cam-erp-actions">
                                {session.video_conference_url && (
                                  <a
                                    href={session.video_conference_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="cam-erp-btn cam-erp-btn--primary"
                                  >
                                    <Video size={11} /> انضمام
                                  </a>
                                )}
                                {/* زر ضبط الجلسة — يظهر متى توفّر نص الضبط (يفتح المودل في الصفحة الأم) */}
                                {session.session_text && onShowDabt && (
                                  <button
                                    className="cam-erp-btn"
                                    onClick={() => onShowDabt(session)}
                                    title="عرض ضبط الجلسة"
                                  >
                                    <FileText size={11} /> الضبط
                                  </button>
                                )}
                                {!session.video_conference_url && !(session.session_text && onShowDabt) && (
                                  <span className="cam-erp-cell__sub">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Section 2: Manual Appointments */}
            <section className="cam-erp-section" data-tour="appts-appointments">
              <div className="cam-erp-section__header">
                <Calendar size={12} />
                <span className="cam-erp-section__title">المواعيد</span>
                <span className="cam-erp-section__count">{appointments.length}</span>
                <button
                  className="cam-erp-btn cam-erp-btn--primary cam-erp-section__add"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus size={11} /> موعد جديد
                </button>
              </div>

              {loading ? (
                <div className="cam-erp-empty">جارٍ التحميل…</div>
              ) : error ? (
                <div className="cam-erp-empty cam-erp-empty--error">
                  {error}{' '}
                  <button className="cam-erp-link" onClick={fetchAppointments}>إعادة المحاولة</button>
                </div>
              ) : appointments.length === 0 ? (
                <div className="cam-erp-empty">لم يتم إضافة مواعيد بعد.</div>
              ) : (
                <div className="cam-erp-table-wrap">
                  <table className="cam-erp-table">
                    <thead>
                      <tr>
                        <th style={{ width: '26%' }}>العنوان والمكان</th>
                        <th style={{ width: '14%' }}>النوع</th>
                        <th style={{ width: '18%' }}>التاريخ والوقت</th>
                        <th style={{ width: '10%' }}>المدة</th>
                        <th style={{ width: '12%' }}>الحالة</th>
                        <th style={{ width: '20%' }}>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((appointment) => {
                        const { date, time } = formatDateTime(appointment.scheduled_at);
                        const statusStyle = getAppointmentStatusStyle(appointment.status);
                        return (
                          <tr key={appointment.id}>
                            <td>
                              <div className="cam-erp-cell__primary">{appointment.title}</div>
                              {appointment.location && (
                                <div className="cam-erp-cell__sub">
                                  <MapPin size={10} /> {appointment.location}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className="cam-erp-cell__primary">
                                {getAppointmentTypeLabel(appointment.type)}
                              </span>
                            </td>
                            <td>
                              <div className="cam-erp-cell__primary">{date}</div>
                              <div className="cam-erp-cell__sub">{time}</div>
                            </td>
                            <td>
                              <span className="cam-erp-cell__primary">
                                {formatDuration(appointment.duration_minutes)}
                              </span>
                            </td>
                            <td>
                              <span
                                className="cam-erp-status"
                                style={{ background: statusStyle.bg, color: statusStyle.color }}
                              >
                                {getAppointmentStatusLabel(appointment.status)}
                              </span>
                            </td>
                            <td>
                              <div className="cam-erp-actions">
                                {appointment.status === 'scheduled' && (
                                  <>
                                    <button
                                      className="cam-erp-icon-btn cam-erp-icon-btn--success"
                                      onClick={() => handleConfirmAppointment(appointment.id)}
                                      title="تأكيد"
                                    >
                                      <CheckCircle size={12} />
                                    </button>
                                    <button
                                      className="cam-erp-icon-btn cam-erp-icon-btn--danger"
                                      onClick={() => handleCancelAppointment(appointment.id)}
                                      title="إلغاء"
                                    >
                                      <XCircle size={12} />
                                    </button>
                                  </>
                                )}
                                {appointment.status === 'confirmed' && (
                                  <button
                                    className="cam-erp-icon-btn cam-erp-icon-btn--accent"
                                    onClick={() => handleStartAppointment(appointment.id)}
                                    title="بدء"
                                  >
                                    <Play size={12} />
                                  </button>
                                )}
                                {appointment.status === 'in_progress' && (
                                  <button
                                    className="cam-erp-icon-btn cam-erp-icon-btn--success"
                                    onClick={() => handleCompleteAppointment(appointment.id)}
                                    title="إكمال"
                                  >
                                    <CheckCircle size={12} />
                                  </button>
                                )}
                                <button className="cam-erp-icon-btn" title="تعديل">
                                  <Edit3 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </motion.div>

        <AddAppointmentModal
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
          caseData={caseData}
          onAppointmentAdded={fetchAppointments}
        />
      </motion.div>
    </AnimatePresence>
  );
};
