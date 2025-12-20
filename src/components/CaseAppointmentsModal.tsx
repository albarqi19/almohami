import React, { useState, useEffect } from 'react';
import { 
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Edit3,
  CheckCircle,
  XCircle,
  Play,
  FileText
} from 'lucide-react';
import Modal from './Modal';
import { appointmentService } from '../services/appointmentService';
import { AddAppointmentModal } from './AddAppointmentModal';
import type { Appointment, AppointmentType, AppointmentStatus, Case } from '../types';

interface CaseAppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: Case;
}

export const CaseAppointmentsModal: React.FC<CaseAppointmentsModalProps> = ({
  isOpen,
  onClose,
  caseData
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      time: date.toLocaleTimeString('ar-SA', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
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

  // لون الحالة
  const getStatusColor = (status: AppointmentStatus): string => {
    const colors: Record<AppointmentStatus, string> = {
      scheduled: 'text-blue-600 bg-blue-50',
      confirmed: 'text-green-600 bg-green-50',
      in_progress: 'text-yellow-600 bg-yellow-50',
      completed: 'text-emerald-600 bg-emerald-50',
      cancelled: 'text-red-600 bg-red-50',
      postponed: 'text-orange-600 bg-orange-50',
      no_show: 'text-gray-600 bg-gray-50'
    };
    return colors[status];
  };

  // لون الأولوية
  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      low: 'text-gray-600',
      medium: 'text-blue-600',
      high: 'text-orange-600',
      urgent: 'text-red-600'
    };
    return colors[priority] || 'text-gray-600';
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
  const handleCancelAppointment = async (appointmentId: string, reason?: string) => {
    try {
      await appointmentService.cancelAppointment(parseInt(appointmentId), reason);
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
  const handleCompleteAppointment = async (appointmentId: string, outcome?: string) => {
    try {
      await appointmentService.completeAppointment(parseInt(appointmentId), outcome);
      fetchAppointments();
    } catch (error) {
      console.error('Error completing appointment:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="مواعيد القضية"
      size="xl"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">{caseData.title}</span>
          </div>
          <button
            onClick={() => {
              setShowAddForm(true);
              console.log('إضافة موعد جديد');
            }}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <Plus className="w-4 h-4" />
            <span>إضافة موعد</span>
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="mr-3 text-gray-600">جاري تحميل المواعيد...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">خطأ في التحميل</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={fetchAppointments}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              إعادة المحاولة
            </button>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              لا توجد مواعيد
            </h3>
            <p className="text-gray-500 mb-4">
              لم يتم إضافة أي مواعيد لهذه القضية بعد
            </p>
            <button
              onClick={() => {
                setShowAddForm(true);
                console.log('إضافة أول موعد');
              }}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                padding: '8px 24px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              إضافة أول موعد
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const { date, time } = formatDateTime(appointment.scheduled_at);
              
              return (
                <div
                  key={appointment.id}
                  className="bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 space-x-reverse mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {appointment.title}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {getAppointmentStatusLabel(appointment.status)}
                        </span>
                        <span className={`text-xs font-medium ${getPriorityColor(appointment.priority)}`}>
                          {appointment.priority === 'urgent' && '🔥'}
                          {appointment.priority === 'high' && '⚡'}
                          {appointment.priority === 'medium' && '📋'}
                          {appointment.priority === 'low' && '📝'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div className="flex items-center space-x-2 space-x-reverse text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">{date}</span>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{time}</span>
                          <span className="text-xs text-gray-400">
                            ({formatDuration(appointment.duration_minutes)})
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse text-gray-600">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">{getAppointmentTypeLabel(appointment.type)}</span>
                        </div>
                      </div>

                      {appointment.location && (
                        <div className="flex items-center space-x-2 space-x-reverse text-gray-600 mb-2">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">{appointment.location}</span>
                        </div>
                      )}

                      {appointment.description && (
                        <p className="text-gray-700 text-sm mb-3">
                          {appointment.description}
                        </p>
                      )}

                      {appointment.attendees && appointment.attendees.length > 0 && (
                        <div className="flex items-center space-x-2 space-x-reverse text-gray-600 mb-3">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">
                            المشاركون: {Array.isArray(appointment.attendees) 
                              ? appointment.attendees.join('، ') 
                              : appointment.attendees}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 space-x-reverse">
                      {appointment.status === 'scheduled' && (
                        <>
                          <button
                            onClick={() => handleConfirmAppointment(appointment.id)}
                            className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors"
                            title="تأكيد الموعد"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCancelAppointment(appointment.id)}
                            className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="إلغاء الموعد"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      
                      {appointment.status === 'confirmed' && (
                        <button
                          onClick={() => handleStartAppointment(appointment.id)}
                          className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                          title="بدء الموعد"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      
                      {appointment.status === 'in_progress' && (
                        <button
                          onClick={() => handleCompleteAppointment(appointment.id)}
                          className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition-colors"
                          title="إكمال الموعد"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          console.log('تعديل الموعد:', appointment.id);
                          // سيتم إضافة نموذج التعديل لاحقاً
                        }}
                        className="text-gray-600 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {(appointment.notes || appointment.outcome) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      {appointment.notes && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-gray-500">ملاحظات:</span>
                          <p className="text-sm text-gray-700 mt-1">{appointment.notes}</p>
                        </div>
                      )}
                      {appointment.outcome && (
                        <div>
                          <span className="text-xs font-medium text-gray-500">النتيجة:</span>
                          <p className="text-sm text-gray-700 mt-1">{appointment.outcome}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add Appointment Modal */}
        <AddAppointmentModal
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
          caseData={caseData}
          onAppointmentAdded={fetchAppointments}
        />
      </div>
    </Modal>
  );
};
