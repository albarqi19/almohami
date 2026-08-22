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
  Loader2,
  CheckCircle2,
  Tag,
  ShieldCheck,
  Paperclip,
  PlayCircle
} from 'lucide-react';
import { UserService, type User as ServiceUser } from '../services/UserService';
import { TaskService } from '../services/taskService';
import MultiSelectDropdown from './MultiSelectDropdown';
import TaskLinkPicker, { EMPTY_TASK_LINK, type TaskLinkValue } from './TaskLinkPicker';
import { toDatetimeInputValue } from '../utils/dateAr';
import type { CreateTaskForm } from '../types';
// ستايلات Notion (add-appointment-modal.css) تُحمَّل مركزياً عبر styles/appStyles.ts

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId?: string;
  caseTitle?: string;
  clientId?: string;
  clientName?: string;
  onTaskAdded: () => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  caseId,
  caseTitle,
  clientId,
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
    // بدايةُ المهمّة — اختيارية. لم تكن في الجدول أصلاً قبل 2026-08-20.
    start_date: '',
    // تحويلُها إلى «قيد التنفيذ» تلقائياً عند حلول البداية (يعمل كلَّ ربع ساعة)
    auto_start: false,
    estimated_hours: '',
    assigned_to: '',
    requires_approval: false,
    requires_attachment: false
  };

  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lawyers, setLawyers] = useState<ServiceUser[]>([]);
  const [loadingLawyers, setLoadingLawyers] = useState(false);
  // تعدّد المكلّفين — assigneeIds تشمل المسؤول؛ responsibleId هو المسؤول (المُرقّى بالنجمة)
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [responsibleId, setResponsibleId] = useState<string>('');
  // ربط المهمة من الصفحة العامة (قضية/عميل/تنفيذ/خدمة) — يظهر فقط بلا سياق
  const hasContext = Boolean(caseId || clientId);
  const [link, setLink] = useState<TaskLinkValue>(EMPTY_TASK_LINK);

  // تبديل مكلّف: إضافة/إزالة مع صون المسؤول (أول اختيار = المسؤول؛ إزالته تُرقّي التالي)
  const toggleAssignee = (value: string) => {
    setAssigneeIds((prev) => {
      if (prev.includes(value)) {
        const next = prev.filter((v) => v !== value);
        setResponsibleId((resp) => (resp === value ? (next[0] || '') : resp));
        return next;
      }
      const next = [...prev, value];
      setResponsibleId((resp) => resp || value);
      return next;
    });
  };

  // Fetch lawyers when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLawyers();
      // Set default due date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      // من الحقول المحلّية لا عبر toISOString، وإلا ظهرت ٠٦:٠٠ بدل ٠٩:٠٠
      const tomorrowStr = toDatetimeInputValue(tomorrow);

      setFormData(prev => ({
        ...prev,
        due_date: tomorrowStr
      }));
    } else {
      // Reset form on close
      setFormData(initialFormState);
      setAssigneeIds([]);
      setResponsibleId('');
      setLink(EMPTY_TASK_LINK);
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
    // تُفحَص هنا أيضاً لا في الباك وحده: 422 بعد ملء النموذج كلِّه ردٌّ متأخّر
    if (formData.start_date && formData.due_date && formData.start_date > formData.due_date) {
      setError('تاريخ البداية يجب ألا يتجاوز الموعد النهائي');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare payload
      // الربط: من السياق (صفحة قضية/عميل) أو من المنتقي الحر بالصفحة العامة
      const chosenId = link.id != null && link.id !== '' ? String(link.id) : undefined;

      const taskData: CreateTaskForm = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        type: formData.type || 'other',
        caseId: caseId || (link.type === 'case' ? chosenId : undefined),
        clientId: clientId || (link.type === 'client' ? chosenId : undefined),
        executionRequestId: link.type === 'execution' ? chosenId : undefined,
        legalServiceId: link.type === 'service' ? chosenId : undefined,
        assignedTo: responsibleId || undefined,
        assigneeIds: assigneeIds.length ? assigneeIds : undefined,
        priority: formData.priority as any,
        dueDate: new Date(formData.due_date),
        startDate: formData.start_date ? new Date(formData.start_date) : undefined,
        autoStart: Boolean(formData.start_date) && formData.auto_start,
        estimatedHours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
        requiresApproval: formData.requires_approval,
        requiresAttachment: formData.requires_attachment,
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
          className="add-appointment-modal task-modal-dense"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header">
            <div className="modal-header-icon" style={{ backgroundColor: 'var(--law-navy)', color: 'white' }}>
              <CheckCircle2 size={20} />
            </div>
            <div className="modal-header-title">
              <h2>إضافة مهمة جديدة</h2>
              <span className="modal-header-subtitle">
                {caseTitle ? `القضية: ${caseTitle}` : clientName ? `العميل: ${clientName}` : 'مهمة عامة'}
              </span>
            </div>
            <button className="modal-close-btn" onClick={onClose}>
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
              placeholder="ما الذي يجب إنجازه؟"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              autoFocus
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
                  <MultiSelectDropdown
                    options={lawyers.map((l) => ({ value: String(l.id), label: l.name }))}
                    selected={assigneeIds}
                    onToggle={toggleAssignee}
                    responsible={responsibleId || undefined}
                    onPromote={(v) => setResponsibleId(v)}
                    placeholder={loadingLawyers ? 'جاري التحميل...' : '👤 (بدون تعيين)'}
                    emptyText="لا يوجد محامون"
                  />
                </div>
              </div>

              {/* Start Date + auto-start */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <PlayCircle size={14} />
                  <span>بداية المهمة</span>
                </div>
                <div className="notion-property-value task-autostart-cell">
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    max={formData.due_date || undefined}
                    onChange={(e) => updateField('start_date', e.target.value)}
                  />
                  {/* الخيارُ لا يظهر بلا بداية: وعدٌ بلا موعدٍ لا يتحقّق،
                      والباك يفرض القاعدةَ نفسها فلا يُخزَّن `auto_start` بلا `start_date`.
                      🩸 والنصُّ قصيرٌ عمداً: الخليّةُ ~226 بكسل، وأيُّ عبارةٍ أطول
                      تنكسر داخل الحبّة إلى أسطر. الشرحُ في الـtooltip. */}
                  {formData.start_date && (
                    <label
                      className={`task-req-chip task-autostart-chip${formData.auto_start ? ' is-on' : ''}`}
                      title="تتحوّل المهمة من «لم تبدأ» إلى «قيد التنفيذ» عند حلول هذا الوقت. لا تُلمَس إن كنتَ قد بدأتَها أو أوقفتَها بنفسك."
                    >
                      <input
                        type="checkbox"
                        checked={formData.auto_start}
                        onChange={(e) => updateField('auto_start', e.target.checked)}
                      />
                      <PlayCircle size={12} />
                      بدء تلقائي
                    </label>
                  )}
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
                    min={formData.start_date || undefined}
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

              {/* المتطلبات — شريحتان تملآن الخلية السادسة فلا يبقى ثقب بالشبكة.
                  التفصيل في tooltip بدل سطرَي شرح مطوّلين. */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <ShieldCheck size={14} />
                  <span>المتطلبات</span>
                </div>
                <div className="notion-property-value">
                  <div className="task-req-chips">
                    <label
                      className={`task-req-chip${formData.requires_approval ? ' is-on' : ''}`}
                      title="لن تُعدّ المهمة مكتملة حتى يعتمدها المدير"
                    >
                      <input
                        type="checkbox"
                        checked={formData.requires_approval}
                        onChange={(e) => updateField('requires_approval', e.target.checked)}
                      />
                      <ShieldCheck size={12} />
                      تتطلب موافقة
                    </label>
                    <label
                      className={`task-req-chip${formData.requires_attachment ? ' is-on' : ''}`}
                      title="لا يمكن إكمال المهمة قبل رفع مرفق"
                    >
                      <input
                        type="checkbox"
                        checked={formData.requires_attachment}
                        onChange={(e) => updateField('requires_attachment', e.target.checked)}
                      />
                      <Paperclip size={12} />
                      تتطلب مرفقاً
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* ربط المهمة — من الصفحة العامة فقط. مع سياق قضية/عميل تكفي
                الترويسة (كانت تُكرَّر كصفَّي قراءة فقط داخل الشبكة). */}
            {!hasContext && (
              <>
                <div className="notion-section-divider"></div>
                <div className="notion-content-label">ربط المهمة (اختياري)</div>
                <TaskLinkPicker value={link} onChange={setLink} disabled={loading} />
              </>
            )}

            <div className="notion-section-divider"></div>

            {/* Description Area */}
            <div className="notion-content-area">
              <div className="notion-content-label">الوصف والملاحظات</div>
              <textarea
                className="notion-textarea"
                placeholder="أضف وصفاً، روابط، أو تفاصيل المهمة هنا..."
                rows={3}
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
