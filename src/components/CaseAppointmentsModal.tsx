import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Edit3,
  CheckCircle,
  XCircle,
  Play,
  FileText,
  Video,
  Building2,
  Gavel,
  ExternalLink,
  RefreshCw,
  CalendarClock
} from 'lucide-react';
import { appointmentService } from '../services/appointmentService';
import { AddAppointmentModal } from './AddAppointmentModal';
import type { Appointment, AppointmentType, AppointmentStatus, Case, CaseSession } from '../types';
import '../styles/case-appointments-modal.css';

interface CaseAppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: Case;
}

type TabType = 'sessions' | 'appointments';

export const CaseAppointmentsModal: React.FC<CaseAppointmentsModalProps> = ({
  isOpen,
  onClose,
  caseData
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('sessions');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // جلسات ناجز من بيانات القضية
  const sessions = caseData.sessions || [];

  // جلب المواعيد عند فتح النافذة
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
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError('فشل في تحميل المواعيد');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  // تنسيق التاريخ
  const formatDateTime = (dateTime: Date | string) => {
    const date = dateTime instanceof Date ? dateTime : new Date(dateTime);
    return {
      date: date.toLocaleDateString('ar-SA'),
      time: date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    };
  };

  // تنسيق المدة
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours} ساعة و ${remainingMinutes} دقيقة` : `${hours} ساعة`;
  };

  // ترجمة نوع الموعد
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

  // ترجمة حالة الموعد
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

  // لون حالة الجلسة
  const getSessionStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'scheduled':
      case 'مجدولة':
        return { bg: '#eff6ff', color: '#2563eb', label: 'مجدولة' };
      case 'completed':
      case 'مكتملة':
        return { bg: '#ecfdf5', color: '#059669', label: 'مكتملة' };
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

  // لون حالة الموعد
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

  // تأكيد موعد
  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      await appointmentService.confirmAppointment(parseInt(appointmentId));
      fetchAppointments();
    } catch (error) {
      console.error('Error confirming appointment:', error);
    }
  };

  // إلغاء موعد
  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      await appointmentService.cancelAppointment(parseInt(appointmentId), 'تم الإلغاء');
      fetchAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
    }
  };

  // بدء موعد
  const handleStartAppointment = async (appointmentId: string) => {
    try {
      await appointmentService.startAppointment(parseInt(appointmentId));
      fetchAppointments();
    } catch (error) {
      console.error('Error starting appointment:', error);
    }
  };

  // إكمال موعد
  const handleCompleteAppointment = async (appointmentId: string) => {
    try {
      await appointmentService.completeAppointment(parseInt(appointmentId));
      fetchAppointments();
    } catch (error) {
      console.error('Error completing appointment:', error);
    }
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
          className="cam-modal"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="cam-header">
            <div className="cam-header-title">
              <div className="cam-icon-wrapper">
                <CalendarClock size={22} />
              </div>
              <div className="cam-title-text">
                <h2>الجلسات والمواعيد</h2>
                <p>{caseData.title}</p>
              </div>
            </div>
            <button className="cam-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="cam-tabs">
            <button
              className={`cam-tab ${activeTab === 'sessions' ? 'active' : ''}`}
              onClick={() => setActiveTab('sessions')}
            >
              <Gavel size={16} />
              <span>جلسات ناجز</span>
              {sessions.length > 0 && (
                <span className="cam-tab-badge">{sessions.length}</span>
              )}
            </button>
            <button
              className={`cam-tab ${activeTab === 'appointments' ? 'active' : ''}`}
              onClick={() => setActiveTab('appointments')}
            >
              <Calendar size={16} />
              <span>المواعيد</span>
              {appointments.length > 0 && (
                <span className="cam-tab-badge">{appointments.length}</span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="cam-content">
            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div className="cam-tab-content">
                {sessions.length === 0 ? (
                  <div className="cam-empty-state">
                    <div className="cam-empty-icon">
                      <Gavel size={48} />
                    </div>
                    <h3>لا توجد جلسات</h3>
                    <p>لم يتم استيراد أي جلسات من ناجز لهذه القضية</p>
                    {caseData.najiz_url && (
                      <a
                        href={caseData.najiz_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cam-najiz-link"
                      >
                        <ExternalLink size={16} />
                        <span>فتح في ناجز</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="cam-sessions-list">
                    {sessions.map((session, index) => {
                      const statusStyle = getSessionStatusStyle(session.status);
                      return (
                        <div key={session.id || index} className="cam-session-card">
                          <div className="cam-session-header">
                            <div className="cam-session-type">
                              {session.is_video_conference ? (
                                <Video size={18} className="cam-icon-video" />
                              ) : (
                                <Building2 size={18} />
                              )}
                              <span>{session.session_type || 'جلسة'}</span>
                            </div>
                            <span
                              className="cam-status-badge"
                              style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                            >
                              {statusStyle.label}
                            </span>
                          </div>

                          <div className="cam-session-details">
                            <div className="cam-detail-row">
                              <Calendar size={14} />
                              <span>{session.session_date || 'غير محدد'}</span>
                              {session.session_time && (
                                <>
                                  <Clock size={14} />
                                  <span>{session.session_time}</span>
                                </>
                              )}
                            </div>

                            {session.court && (
                              <div className="cam-detail-row">
                                <Building2 size={14} />
                                <span>{session.court}</span>
                                {session.department && <span className="cam-dept">- {session.department}</span>}
                              </div>
                            )}

                            {session.location && (
                              <div className="cam-detail-row">
                                <MapPin size={14} />
                                <span>{session.location}</span>
                              </div>
                            )}

                            {session.method && (
                              <div className="cam-detail-row cam-method">
                                <span>طريقة الحضور:</span>
                                <span className="cam-method-value">{session.method}</span>
                              </div>
                            )}
                          </div>

                          {session.notes && (
                            <div className="cam-session-notes">
                              <span className="cam-notes-label">ملاحظات:</span>
                              <p>{session.notes}</p>
                            </div>
                          )}

                          {session.result && (
                            <div className="cam-session-result">
                              <span className="cam-result-label">النتيجة:</span>
                              <p>{session.result}</p>
                            </div>
                          )}

                          {session.video_conference_url && (
                            <a
                              href={session.video_conference_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="cam-video-link"
                            >
                              <Video size={16} />
                              <span>انضمام للجلسة المرئية</span>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
              <div className="cam-tab-content">
                {/* Add Button */}
                <div className="cam-add-section">
                  <button className="cam-add-btn" onClick={() => setShowAddForm(true)}>
                    <Plus size={18} />
                    <span>إضافة موعد جديد</span>
                  </button>
                </div>

                {loading ? (
                  <div className="cam-loading">
                    <RefreshCw size={24} className="cam-spinner" />
                    <span>جاري تحميل المواعيد...</span>
                  </div>
                ) : error ? (
                  <div className="cam-error">
                    <p>{error}</p>
                    <button onClick={fetchAppointments} className="cam-retry-btn">
                      إعادة المحاولة
                    </button>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="cam-empty-state">
                    <div className="cam-empty-icon">
                      <Calendar size={48} />
                    </div>
                    <h3>لا توجد مواعيد</h3>
                    <p>لم يتم إضافة أي مواعيد لهذه القضية بعد</p>
                    <button className="cam-add-first-btn" onClick={() => setShowAddForm(true)}>
                      <Plus size={18} />
                      <span>إضافة أول موعد</span>
                    </button>
                  </div>
                ) : (
                  <div className="cam-appointments-list">
                    {appointments.map((appointment) => {
                      const { date, time } = formatDateTime(appointment.scheduled_at);
                      const statusStyle = getAppointmentStatusStyle(appointment.status);

                      return (
                        <div key={appointment.id} className="cam-appointment-card">
                          <div className="cam-appointment-header">
                            <div className="cam-appointment-title">
                              <h4>{appointment.title}</h4>
                              <span className="cam-appointment-type">
                                {getAppointmentTypeLabel(appointment.type)}
                              </span>
                            </div>
                            <span
                              className="cam-status-badge"
                              style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                            >
                              {getAppointmentStatusLabel(appointment.status)}
                            </span>
                          </div>

                          <div className="cam-appointment-details">
                            <div className="cam-detail-row">
                              <Calendar size={14} />
                              <span>{date}</span>
                              <Clock size={14} />
                              <span>{time}</span>
                              <span className="cam-duration">({formatDuration(appointment.duration_minutes)})</span>
                            </div>

                            {appointment.location && (
                              <div className="cam-detail-row">
                                <MapPin size={14} />
                                <span>{appointment.location}</span>
                              </div>
                            )}

                            {appointment.attendees && appointment.attendees.length > 0 && (
                              <div className="cam-detail-row">
                                <Users size={14} />
                                <span>
                                  {Array.isArray(appointment.attendees)
                                    ? appointment.attendees.join('، ')
                                    : appointment.attendees}
                                </span>
                              </div>
                            )}
                          </div>

                          {appointment.description && (
                            <p className="cam-appointment-desc">{appointment.description}</p>
                          )}

                          <div className="cam-appointment-actions">
                            {appointment.status === 'scheduled' && (
                              <>
                                <button
                                  className="cam-action-btn confirm"
                                  onClick={() => handleConfirmAppointment(appointment.id)}
                                  title="تأكيد"
                                >
                                  <CheckCircle size={16} />
                                </button>
                                <button
                                  className="cam-action-btn cancel"
                                  onClick={() => handleCancelAppointment(appointment.id)}
                                  title="إلغاء"
                                >
                                  <XCircle size={16} />
                                </button>
                              </>
                            )}
                            {appointment.status === 'confirmed' && (
                              <button
                                className="cam-action-btn start"
                                onClick={() => handleStartAppointment(appointment.id)}
                                title="بدء"
                              >
                                <Play size={16} />
                              </button>
                            )}
                            {appointment.status === 'in_progress' && (
                              <button
                                className="cam-action-btn complete"
                                onClick={() => handleCompleteAppointment(appointment.id)}
                                title="إكمال"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                            <button className="cam-action-btn edit" title="تعديل">
                              <Edit3 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Add Appointment Modal */}
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
