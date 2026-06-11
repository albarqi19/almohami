import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  AlertCircle,
  Loader2,
  Bell,
  Flag,
  StickyNote,
  Tag
} from 'lucide-react';
import { appointmentService } from '../services/appointmentService';
import type { AppointmentType, Case } from '../types';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

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
    reminders: '60'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // أنواع المواعيد
  const appointmentTypes: { value: AppointmentType; label: string; icon: string }[] = [
    { value: 'court_hearing', label: 'جلسة محكمة', icon: '⚖️' },
    { value: 'client_meeting', label: 'موعد عميل', icon: '👤' },
    { value: 'team_meeting', label: 'اجتماع فريق', icon: '👥' },
    { value: 'document_filing', label: 'تقديم وثائق', icon: '📄' },
    { value: 'arbitration', label: 'تحكيم', icon: '🏛️' },
    { value: 'consultation', label: 'استشارة', icon: '💬' },
    { value: 'mediation', label: 'وساطة', icon: '🤝' },
    { value: 'settlement', label: 'صلح', icon: '✅' },
    { value: 'other', label: 'أخرى', icon: '📌' }
  ];

  // خيارات الأولوية
  const priorityOptions = [
    { value: 'low', label: 'منخفضة', color: '#6b7280', bg: '#f3f4f6' },
    { value: 'medium', label: 'متوسطة', color: '#3b82f6', bg: '#eff6ff' },
    { value: 'high', label: 'عالية', color: '#f97316', bg: '#fff7ed' },
    { value: 'urgent', label: 'عاجل', color: '#ef4444', bg: '#fef2f2' }
  ];

  // خيارات المدة
  const durationOptions = [
    { value: 15, label: '15 دقيقة' },
    { value: 30, label: '30 دقيقة' },
    { value: 45, label: '45 دقيقة' },
    { value: 60, label: 'ساعة' },
    { value: 90, label: 'ساعة ونصف' },
    { value: 120, label: 'ساعتين' },
    { value: 180, label: '3 ساعات' },
    { value: 240, label: '4 ساعات' }
  ];

  // خيارات التذكير
  const reminderOptions = [
    { value: '', label: 'بدون تذكير' },
    { value: '15', label: 'قبل 15 دقيقة' },
    { value: '30', label: 'قبل 30 دقيقة' },
    { value: '60', label: 'قبل ساعة' },
    { value: '1440', label: 'قبل يوم' },
    { value: '2880', label: 'قبل يومين' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.title.trim()) {
        throw new Error('عنوان الموعد مطلوب');
      }
      if (!formData.scheduled_at) {
        throw new Error('تاريخ ووقت الموعد مطلوب');
      }

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
        reminders: '60'
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
      reminders: '60'
    });
    setError(null);
    onClose();
  };

  const updateField = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="add-appointment-modal-overlay" onClick={handleCancel}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="add-appointment-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header">
            <div className="modal-header-icon">
              <Calendar size={20} />
            </div>
            <div className="modal-header-title">
              <h2>إضافة موعد جديد</h2>
              <span className="modal-header-subtitle">{caseData.title}</span>
            </div>
            <button className="modal-close-btn" onClick={handleCancel}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body">
            {error && (
              <div className="modal-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Large Title Input */}
            <input
              type="text"
              className="modal-title-input"
              placeholder="بدون عنوان"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              autoFocus
            />

            {/* Properties List - Notion Style */}
            <div className="notion-properties-grid">

              {/* Type */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Tag size={14} />
                  <span>النوع</span>
                </div>
                <div className="notion-property-value">
                  <select
                    value={formData.type}
                    onChange={(e) => updateField('type', e.target.value)}
                  >
                    {appointmentTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Flag size={14} />
                  <span>الأولوية</span>
                </div>
                <div className="notion-property-value">
                  <div className="priority-selector">
                    {priorityOptions.map(p => (
                      <span
                        key={p.value}
                        className={`priority-pill ${formData.priority === p.value ? 'selected' : ''}`}
                        style={{ backgroundColor: p.bg, color: p.color }}
                        onClick={() => updateField('priority', p.value)}
                      >
                        {p.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Calendar size={14} />
                  <span>التاريخ والوقت</span>
                </div>
                <div className="notion-property-value">
                  <input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => updateField('scheduled_at', e.target.value)}
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Clock size={14} />
                  <span>المدة</span>
                </div>
                <div className="notion-property-value">
                  <select
                    value={formData.duration_minutes}
                    onChange={(e) => updateField('duration_minutes', parseInt(e.target.value))}
                  >
                    {durationOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <MapPin size={14} />
                  <span>الموقع</span>
                </div>
                <div className="notion-property-value">
                  <input
                    type="text"
                    placeholder="أضف موقعاً..."
                    value={formData.location}
                    onChange={(e) => updateField('location', e.target.value)}
                  />
                </div>
              </div>

              {/* Attendees */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Users size={14} />
                  <span>المشاركون</span>
                </div>
                <div className="notion-property-value">
                  <input
                    type="text"
                    placeholder="أحمد، محمد..."
                    value={formData.attendees}
                    onChange={(e) => updateField('attendees', e.target.value)}
                  />
                </div>
              </div>

              {/* Reminders */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Bell size={14} />
                  <span>التذكير</span>
                </div>
                <div className="notion-property-value">
                  <select
                    value={formData.reminders}
                    onChange={(e) => updateField('reminders', e.target.value)}
                  >
                    {reminderOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <StickyNote size={14} />
                  <span>ملاحظات سريعة</span>
                </div>
                <div className="notion-property-value">
                  <input
                    type="text"
                    placeholder="ملاحظة مختصرة..."
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="notion-section-divider"></div>

            {/* Description Area */}
            <div className="notion-content-area">
              <div className="notion-content-label">الوصف التفصيلي</div>
              <textarea
                className="notion-textarea"
                placeholder="أضف وصفاً تفصيلياً للموعد هنا..."
                rows={6}
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button className="notion-btn notion-btn-secondary" onClick={handleCancel}>
              إلغاء
            </button>
            <button
              className="notion-btn notion-btn-primary"
              disabled={loading || !formData.title.trim() || !formData.scheduled_at}
              onClick={handleSubmit}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" style={{ marginLeft: '8px', display: 'inline' }} />
                  تحميل...
                </>
              ) : 'حفظ الموعد'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
