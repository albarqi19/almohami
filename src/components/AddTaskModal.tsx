import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  AlertCircle,
  Type,
  AlignLeft,
  Flag,
  Calendar,
  Clock,
  User,
  Briefcase,
  Loader2,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { UserService, type User as ServiceUser } from '../services/UserService';
import { TaskService } from '../services/taskService';
import type { CreateTaskForm } from '../types';
import '../styles/add-appointment-modal.css'; // Leverage existing Notion styles

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId?: string;
  caseTitle?: string;
  clientName?: string;
  onTaskAdded: () => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  caseId,
  caseTitle,
  clientName,
  onTaskAdded
}) => {
  // Initialize with default values
  const initialFormState = {
    title: '',
    description: '',
    type: 'other',
    priority: 'medium',
    due_date: '',
    estimated_hours: '',
    assigned_to: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lawyers, setLawyers] = useState<ServiceUser[]>([]);
  const [loadingLawyers, setLoadingLawyers] = useState(false);

  // Fetch lawyers when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLawyers();
      // Set default due date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const tomorrowStr = tomorrow.toISOString().slice(0, 16);

      setFormData(prev => ({
        ...prev,
        due_date: tomorrowStr
      }));
    } else {
      // Reset form on close
      setFormData(initialFormState);
      setError(null);
    }
  }, [isOpen]);

  const fetchLawyers = async () => {
    try {
      setLoadingLawyers(true);
      const lawyersData = await UserService.getLawyers();
      setLawyers(lawyersData);
    } catch (error) {
      console.error('Failed to fetch lawyers:', error);
    } finally {
      setLoadingLawyers(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('عنوان المهمة مطلوب');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare payload
      const taskData: CreateTaskForm = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        type: formData.type || 'other',
        caseId: caseId || undefined,
        assignedTo: formData.assigned_to || undefined,
        priority: formData.priority as any,
        dueDate: new Date(formData.due_date),
        estimatedHours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
      };

      await TaskService.createTask(taskData);
      onTaskAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل في إنشاء المهمة');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="add-appointment-modal-overlay" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ duration: 0.15 }}
          className="add-appointment-modal"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '750px' }}
        >
          {/* Header */}
          <div className="modal-header">
            <div className="modal-header-icon" style={{ backgroundColor: 'var(--law-navy)', color: 'white' }}>
              <CheckCircle2 size={20} />
            </div>
            <div className="modal-header-title">
              <h2>إضافة مهمة جديدة</h2>
              <span className="modal-header-subtitle">
                {caseTitle ? `القضية: ${caseTitle}` : 'مهمة عامة'}
              </span>
            </div>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body" style={{ padding: '0 32px 32px' }}>
            {error && (
              <div className="modal-error" style={{ margin: '20px 0' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Large Title Input */}
            <input
              type="text"
              className="modal-title-input"
              placeholder="ما الذي يجب إنجازه؟"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              autoFocus
              style={{ marginTop: '20px' }}
            />

            {/* Properties List */}
            <div className="notion-properties-grid">

              {/* Assignee */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <User size={14} />
                  <span>تعيين إلى</span>
                </div>
                <div className="notion-property-value">
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => updateField('assigned_to', e.target.value)}
                    disabled={loadingLawyers}
                  >
                    <option value="">👤 (بدون تعيين)</option>
                    {lawyers.map(lawyer => (
                      <option key={lawyer.id} value={lawyer.id}>
                        {lawyer.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Calendar size={14} />
                  <span>الموعد النهائي</span>
                </div>
                <div className="notion-property-value">
                  <input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => updateField('due_date', e.target.value)}
                  />
                </div>
              </div>

              {/* Priority */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Flag size={14} />
                  <span>الأولوية</span>
                </div>
                <div className="notion-property-value">
                  <select
                    value={formData.priority}
                    onChange={(e) => updateField('priority', e.target.value)}
                  >
                    <option value="low">🏳️ منخفضة</option>
                    <option value="medium">🏴 متوسطة</option>
                    <option value="high">🚩 عالية</option>
                  </select>
                </div>
              </div>

              {/* Type */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Tag size={14} />
                  <span>نوع المهمة</span>
                </div>
                <div className="notion-property-value">
                  <select
                    value={formData.type}
                    onChange={(e) => updateField('type', e.target.value)}
                  >
                    <option value="other">📦 عامة</option>
                    <option value="review">🔍 مراجعة</option>
                    <option value="research">📚 بحث قانوني</option>
                    <option value="consultation">💬 استشارة</option>
                    <option value="court">⚖️ جلسة محكمة</option>
                    <option value="document">📄 إعداد وثائق</option>
                    <option value="meeting">👥 اجتماع</option>
                  </select>
                </div>
              </div>

              {/* Estimated Hours */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Clock size={14} />
                  <span>الوقت المقدر</span>
                </div>
                <div className="notion-property-value">
                  <input
                    type="number"
                    placeholder="ساعات..."
                    step="0.5"
                    min="0"
                    value={formData.estimated_hours}
                    onChange={(e) => updateField('estimated_hours', e.target.value)}
                  />
                </div>
              </div>

              {/* Related Case (Ready Only) */}
              {caseTitle && (
                <div className="notion-property">
                  <div className="notion-property-label">
                    <Briefcase size={14} />
                    <span>القضية</span>
                  </div>
                  <div className="notion-property-value">
                    <span style={{ fontSize: '13px', color: 'var(--color-text)', opacity: 0.8 }}>
                      {caseTitle}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="notion-section-divider"></div>

            {/* Description Area */}
            <div className="notion-content-area">
              <div className="notion-content-label">الوصف والملاحظات</div>
              <textarea
                className="notion-textarea"
                placeholder="أضف وصفاً، روابط، أو تفاصيل المهمة هنا..."
                rows={8}
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button className="notion-btn notion-btn-secondary" onClick={onClose} disabled={loading}>
              إلغاء
            </button>
            <button
              className="notion-btn notion-btn-primary"
              disabled={loading || !formData.title.trim()}
              onClick={handleSubmit}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" style={{ marginLeft: '8px', display: 'inline' }} />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Plus size={14} style={{ marginLeft: '8px' }} />
                  إنشاء المهمة
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddTaskModal;
