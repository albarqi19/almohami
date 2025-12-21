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
  Briefcase
} from 'lucide-react';
import { UserService, type User as ServiceUser } from '../services/UserService';
import { TaskService } from '../services/taskService';
import type { CreateTaskForm } from '../types';
import '../styles/task-modal.css';

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation
      if (!formData.title.trim()) {
        setError('عنوان المهمة مطلوب');
        return;
      }

      if (!formData.due_date) {
        setError('يجب تحديد الموعد النهائي');
        return;
      }

      // Prepare payload
      const taskData: CreateTaskForm = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        type: formData.type || 'other',
        caseId: caseId || undefined, // Allow tasks without a case
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="task-modal-overlay" onClick={onClose}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="task-modal"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="task-modal-header">
              <div>
                <h2 className="task-modal-title">
                  <div style={{ background: 'var(--law-navy)', color: 'white', padding: '6px', borderRadius: '6px' }}>
                    <Plus size={18} />
                  </div>
                  إضافة مهمة جديدة
                </h2>
                {(caseTitle || clientName) && (
                  <p className="task-modal-subtitle">
                    {caseTitle ? `القضية: ${caseTitle}` : ''} {clientName ? `• العميل: ${clientName}` : ''}
                  </p>
                )}
              </div>
              <button className="task-modal-close" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="task-modal-content">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    color: '#DC2626',
                    fontSize: '13px'
                  }}
                >
                  <AlertCircle size={16} />
                  {error}
                </motion.div>
              )}

              {/* Title Input */}
              <div className="form-group">
                <input
                  type="text"
                  name="title"
                  className="form-input"
                  style={{ fontSize: '16px', fontWeight: 500, padding: '12px 14px' }}
                  placeholder="ما الذي يجب إنجازه؟ (عنوان المهمة)"
                  value={formData.title}
                  onChange={handleInputChange}
                  autoFocus
                  required
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <div className="form-label">
                  <AlignLeft size={14} />
                  الوصف
                </div>
                <textarea
                  name="description"
                  className="form-textarea"
                  rows={3}
                  placeholder="أضف تفاصيل، ملاحظات، أو روابط..."
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-row">
                {/* Type */}
                <div className="form-group">
                  <label className="form-label">
                    <Type size={14} />
                    نوع المهمة
                  </label>
                  <select
                    name="type"
                    className="form-select"
                    value={formData.type}
                    onChange={handleInputChange}
                  >
                    <option value="other">عامة</option>
                    <option value="review">مراجعة</option>
                    <option value="research">بحث قانوني</option>
                    <option value="consultation">استشارة</option>
                    <option value="court">جلسة محكمة</option>
                    <option value="document">إعداد وثائق</option>
                    <option value="meeting">اجتماع</option>
                  </select>
                </div>

                {/* Priority */}
                <div className="form-group">
                  <label className="form-label">
                    <Flag size={14} />
                    الأولوية
                  </label>
                  <select
                    name="priority"
                    className="form-select"
                    value={formData.priority}
                    onChange={handleInputChange}
                  >
                    <option value="low">منخفضة</option>
                    <option value="medium">متوسطة</option>
                    <option value="high">عالية</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                {/* Due Date */}
                <div className="form-group">
                  <label className="form-label">
                    <Calendar size={14} />
                    تاريخ الاستحقاق
                  </label>
                  <input
                    type="datetime-local"
                    name="due_date"
                    className="form-input"
                    value={formData.due_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Estimated Hours */}
                <div className="form-group">
                  <label className="form-label">
                    <Clock size={14} />
                    المدة المقدرة (ساعات)
                  </label>
                  <input
                    type="number"
                    name="estimated_hours"
                    className="form-input"
                    placeholder="0.0"
                    step="0.5"
                    min="0"
                    value={formData.estimated_hours}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Assignee */}
              <div className="form-group">
                <label className="form-label">
                  <User size={14} />
                  تعيين إلى
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    name="assigned_to"
                    className="form-select"
                    value={formData.assigned_to}
                    onChange={handleInputChange}
                    disabled={loadingLawyers}
                  >
                    <option value="">(بدون تعيين)</option>
                    {lawyers.map(lawyer => (
                      <option key={lawyer.id} value={lawyer.id}>
                        {lawyer.name}
                      </option>
                    ))}
                  </select>
                  {loadingLawyers && (
                    <div style={{ position: 'absolute', left: '30px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                      جاري التحميل...
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="task-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    'جاري الحفظ...'
                  ) : (
                    <>
                      <Plus size={16} />
                      إنشاء المهمة
                    </>
                  )}
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddTaskModal;
