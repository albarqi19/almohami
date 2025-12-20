import React, { useState } from 'react';
import { 
  Clock,
  MapPin,
  Users,
  FileText,
  AlertTriangle,
  Save
} from 'lucide-react';
import Modal from './Modal';
import { appointmentService } from '../services/appointmentService';
import type { AppointmentType, Case } from '../types';

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: Case;
  onAppointmentAdded: () => void;
}

export const AddAppointmentModal: React.FC<AddAppointmentModalProps> = ({
  isOpen,
  onClose,
  caseData,
  onAppointmentAdded
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'court_hearing' as AppointmentType,
    scheduled_at: '',
    duration_minutes: 60,
    location: '',
    attendees: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    notes: '',
    reminders: '15' // minutes before
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // أنواع المواعيد
  const appointmentTypes: { value: AppointmentType; label: string }[] = [
    { value: 'court_hearing', label: 'جلسة محكمة' },
    { value: 'client_meeting', label: 'موعد عميل' },
    { value: 'team_meeting', label: 'اجتماع فريق' },
    { value: 'document_filing', label: 'تقديم وثائق' },
    { value: 'arbitration', label: 'تحكيم' },
    { value: 'consultation', label: 'استشارة' },
    { value: 'mediation', label: 'وساطة' },
    { value: 'settlement', label: 'صلح' },
    { value: 'other', label: 'أخرى' }
  ];

  // خيارات الأولوية
  const priorityOptions = [
    { value: 'low', label: '🟢 منخفضة', color: 'text-gray-600' },
    { value: 'medium', label: '🔵 متوسطة', color: 'text-blue-600' },
    { value: 'high', label: '🟠 عالية', color: 'text-orange-600' },
    { value: 'urgent', label: '🔴 عاجل', color: 'text-red-600' }
  ];

  // خيارات التذكير
  const reminderOptions = [
    { value: '15', label: '15 دقيقة قبل الموعد' },
    { value: '30', label: '30 دقيقة قبل الموعد' },
    { value: '60', label: 'ساعة قبل الموعد' },
    { value: '1440', label: 'يوم قبل الموعد' },
    { value: '2880', label: 'يومين قبل الموعد' }
  ];

  // إرسال النموذج
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // التحقق من صحة البيانات
      if (!formData.title.trim()) {
        throw new Error('عنوان الموعد مطلوب');
      }

      if (!formData.scheduled_at) {
        throw new Error('تاريخ ووقت الموعد مطلوب');
      }

      // إعداد البيانات للإرسال
      const appointmentData = {
        case_id: parseInt(caseData.id),
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        scheduled_at: formData.scheduled_at,
        duration_minutes: formData.duration_minutes,
        location: formData.location.trim() || undefined,
        attendees: formData.attendees.trim() 
          ? formData.attendees.split(',').map(name => name.trim()).filter(name => name)
          : undefined,
        priority: formData.priority,
        notes: formData.notes.trim() || undefined,
        reminders: formData.reminders ? [parseInt(formData.reminders)] : undefined
      };

      await appointmentService.createAppointment(appointmentData);
      
      // إعادة تعيين النموذج
      setFormData({
        title: '',
        description: '',
        type: 'court_hearing',
        scheduled_at: '',
        duration_minutes: 60,
        location: '',
        attendees: '',
        priority: 'medium',
        notes: '',
        reminders: '15'
      });

      onAppointmentAdded();
      onClose();
    } catch (error) {
      console.error('Error creating appointment:', error);
      setError(error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  // إلغاء النموذج
  const handleCancel = () => {
    setFormData({
      title: '',
      description: '',
      type: 'court_hearing',
      scheduled_at: '',
      duration_minutes: 60,
      location: '',
      attendees: '',
      priority: 'medium',
      notes: '',
      reminders: '15'
    });
    setError(null);
    onClose();
  };

  // تحديث حقل في النموذج
  const updateField = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="إضافة موعد جديد"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 space-x-reverse">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* عنوان الموعد */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            عنوان الموعد *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="أدخل عنوان الموعد"
            required
          />
        </div>

        {/* نوع الموعد والأولوية */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع الموعد
            </label>
            <select
              value={formData.type}
              onChange={(e) => updateField('type', e.target.value as AppointmentType)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {appointmentTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الأولوية
            </label>
            <select
              value={formData.priority}
              onChange={(e) => updateField('priority', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {priorityOptions.map(priority => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* التاريخ والوقت والمدة */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              التاريخ والوقت *
            </label>
            <div className="relative">
              <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => updateField('scheduled_at', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المدة (بالدقائق)
            </label>
            <input
              type="number"
              min="15"
              max="480"
              value={formData.duration_minutes}
              onChange={(e) => updateField('duration_minutes', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* الموقع */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            الموقع
          </label>
          <div className="relative">
            <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={formData.location}
              onChange={(e) => updateField('location', e.target.value)}
              className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="أدخل موقع الموعد"
            />
          </div>
        </div>

        {/* المشاركون */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            المشاركون
          </label>
          <div className="relative">
            <Users className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={formData.attendees}
              onChange={(e) => updateField('attendees', e.target.value)}
              className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="أدخل أسماء المشاركين مفصولة بفاصلة"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            اكتب أسماء المشاركين مفصولة بفاصلة (مثال: أحمد، محمد)
          </p>
        </div>

        {/* التذكير */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            التذكير
          </label>
          <select
            value={formData.reminders}
            onChange={(e) => updateField('reminders', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">بدون تذكير</option>
            {reminderOptions.map(reminder => (
              <option key={reminder.value} value={reminder.value}>
                {reminder.label}
              </option>
            ))}
          </select>
        </div>

        {/* الوصف */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            الوصف
          </label>
          <div className="relative">
            <FileText className="absolute right-3 top-3 text-gray-400 w-5 h-5" />
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="أدخل وصف الموعد"
            />
          </div>
        </div>

        {/* الملاحظات */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ملاحظات إضافية
          </label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="أي ملاحظات إضافية"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 space-x-reverse pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading || !formData.title.trim() || !formData.scheduled_at}
            style={{
              padding: '8px 24px',
              backgroundColor: loading || !formData.title.trim() || !formData.scheduled_at ? 'var(--color-secondary)' : 'var(--color-primary)',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              cursor: loading || !formData.title.trim() || !formData.scheduled_at ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => !loading && formData.title.trim() && formData.scheduled_at && (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{loading ? 'جاري الحفظ...' : 'حفظ الموعد'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
