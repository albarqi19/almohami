import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  AlertCircle,
  User,
  Calendar,
  Flag,
  Tag,
  Clock,
  Activity,
  ShieldCheck,
  Paperclip,
  Loader2,
  Pencil
} from 'lucide-react';
import { UserService, type User as ServiceUser } from '../services/UserService';
import { TaskService } from '../services/taskService';
import MultiSelectDropdown from './MultiSelectDropdown';
import TaskLinkPicker, { EMPTY_TASK_LINK, type TaskLinkValue } from './TaskLinkPicker';
import { toDatetimeInputValue } from '../utils/dateAr';
import type { Task } from '../types';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onTaskUpdated: () => void;
}

// ربط المهمة الحالي كقيمة منتقي — أولوية العرض نفسها المتّبعة في شارات البطاقات
const taskToLink = (t: Task): TaskLinkValue => {
  if (t.case) {
    return { type: 'case', id: t.case.id, label: t.case.file_number ? `${t.case.title} (${t.case.file_number})` : t.case.title };
  }
  if (t.client) return { type: 'client', id: t.client.id, label: t.client.name };
  if (t.execution_request) {
    return { type: 'execution', id: t.execution_request.id, label: `طلب تنفيذ: ${t.execution_request.request_number || ''}` };
  }
  if (t.legal_service) return { type: 'service', id: t.legal_service.id, label: t.legal_service.title || 'خدمة قانونية' };
  return EMPTY_TASK_LINK;
};

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onTaskUpdated
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    notes: '',
    type: 'other',
    priority: 'medium',
    due_date: '',
    estimated_hours: '',
    actual_hours: '',
    assigned_to: '',
    status: 'todo',
    requires_approval: false,
    requires_attachment: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lawyers, setLawyers] = useState<ServiceUser[]>([]);
  const [loadingLawyers, setLoadingLawyers] = useState(false);
  // تعدّد المكلّفين — assigneeIds تشمل المسؤول؛ responsibleId هو المسؤول (المُرقّى بالنجمة)
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [responsibleId, setResponsibleId] = useState<string>('');
  // ربط المهمة — تُرسل حقوله للباك فقط إذا غيّره المستخدم فعلاً
  // (كي لا يمسح تعديلٌ عادي ربطاً قائماً بأكثر من كيان)
  const [link, setLink] = useState<TaskLinkValue>(EMPTY_TASK_LINK);
  const [initialLink, setInitialLink] = useState<TaskLinkValue>(EMPTY_TASK_LINK);

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

  // تحديث البيانات عند فتح النافذة أو تغيير المهمة
  useEffect(() => {
    if (isOpen && task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        notes: task.notes || '',
        type: task.type || 'other',
        priority: task.priority || 'medium',
        due_date: toDatetimeInputValue(task.dueDate),
        estimated_hours: task.estimatedHours?.toString() || '',
        actual_hours: task.actualHours?.toString() || '',
        assigned_to: task.assignedTo || '',
        status: task.status || 'todo',
        requires_approval: !!task.requires_approval,
        requires_attachment: !!task.requires_attachment
      });

      // تهيئة تعدّد المكلّفين من task.assignees (مع المسؤول من pivot.is_primary)
      const list = Array.isArray(task.assignees) ? task.assignees : [];
      if (list.length) {
        const ids = list.map((a) => String(a.id));
        const primary = list.find((a) => a.pivot?.is_primary);
        setAssigneeIds(ids);
        setResponsibleId(
          primary ? String(primary.id) : (task.assignedTo ? String(task.assignedTo) : ids[0])
        );
      } else if (task.assignedTo) {
        // توافق خلفي: مهمة قديمة بمكلّف مفرد فقط
        setAssigneeIds([String(task.assignedTo)]);
        setResponsibleId(String(task.assignedTo));
      } else {
        setAssigneeIds([]);
        setResponsibleId('');
      }

      // تهيئة ربط المهمة الحالي
      const currentLink = taskToLink(task);
      setLink(currentLink);
      setInitialLink(currentLink);

      fetchLawyers();
    } else if (!isOpen) {
      setError(null);
    }
  }, [isOpen, task]);

  const fetchLawyers = async () => {
    try {
      setLoadingLawyers(true);
      const lawyersData = await UserService.getLawyers();
      setLawyers(lawyersData);
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
      setError('فشل في جلب البيانات المطلوبة');
    } finally {
      setLoadingLawyers(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    if (!formData.title.trim()) {
      setError('عنوان المهمة مطلوب');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updateData = {
        title: formData.title,
        description: formData.description,
        notes: formData.notes,
        type: formData.type,
        priority: formData.priority as any,
        due_date: formData.due_date,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
        actual_hours: formData.actual_hours ? parseFloat(formData.actual_hours) : undefined,
        assigned_to: responsibleId || formData.assigned_to,
        assignee_ids: assigneeIds.length ? assigneeIds.map((v) => Number(v)) : [],
        // حقول الربط تُرسل فقط عند تغييره — إرسال null صراحةً يفكّ الربط السابق
        ...(link.type !== initialLink.type || String(link.id ?? '') !== String(initialLink.id ?? '')
          ? {
              case_id: link.type === 'case' && link.id ? link.id : null,
              client_id: link.type === 'client' && link.id ? link.id : null,
              execution_request_id: link.type === 'execution' && link.id ? link.id : null,
              legal_service_id: link.type === 'service' && link.id ? link.id : null,
            }
          : {}),
      };

      await TaskService.updateTask(task.id, updateData);

      // الحالة تمرّ عبر مسارها الخاص لتفعيل بوابتي المرفق والاعتماد
      if (formData.status !== task.status) {
        await TaskService.updateTaskStatus(task.id, formData.status);
      }

      // المتطلبات عبر مسارها الخاص (للمنشئ/المدير فقط)
      if (
        formData.requires_approval !== !!task.requires_approval ||
        formData.requires_attachment !== !!task.requires_attachment
      ) {
        await TaskService.configureRequirements(task.id, {
          requires_approval: formData.requires_approval,
          requires_attachment: formData.requires_attachment,
        });
      }

      onTaskUpdated();
      onClose();
    } catch (error: any) {
      console.error('خطأ في تحديث المهمة:', error);
      setError(error.message || 'فشل في تحديث المهمة');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !task) return null;

  // سياق المهمة للعنوان الفرعي (قضية / عميل / طلب تنفيذ / عامة)
  const contextLabel = task.case
    ? `القضية: ${task.case.title}`
    : task.client
      ? `العميل: ${task.client.name}`
      : task.execution_request
        ? `طلب تنفيذ: ${task.execution_request.request_number || ''}`
        : 'مهمة عامة';

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
              <Pencil size={20} />
            </div>
            <div className="modal-header-title">
              <h2>تعديل المهمة</h2>
              <span className="modal-header-subtitle">{contextLabel}</span>
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

              {/* المكلّفون */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <User size={14} />
                  <span>المكلّفون (★ المسؤول)</span>
                </div>
                <div className="notion-property-value">
                  <MultiSelectDropdown
                    options={lawyers.map((l) => ({ value: String(l.id), label: l.name }))}
                    selected={assigneeIds}
                    onToggle={toggleAssignee}
                    responsible={responsibleId || undefined}
                    onPromote={(v) => setResponsibleId(v)}
                    placeholder={loadingLawyers ? 'جاري التحميل...' : '👤 اختر المكلّفين'}
                    emptyText="لا يوجد محامون"
                  />
                </div>
              </div>

              {/* الموعد النهائي */}
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

              {/* الحالة */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Activity size={14} />
                  <span>الحالة</span>
                </div>
                <div className="notion-property-value">
                  <select
                    value={formData.status}
                    onChange={(e) => updateField('status', e.target.value)}
                  >
                    <option value="todo">قيد الانتظار</option>
                    <option value="in_progress">قيد التنفيذ</option>
                    <option value="review">قيد المراجعة</option>
                    {/* on_hold تُعرض فقط (الدخول إليها عبر زر الإيقاف بسبب إلزامي — #130) */}
                    <option value="on_hold" disabled>موقوفة مؤقتاً</option>
                    <option value="completed">مكتملة</option>
                    <option value="cancelled">ملغية</option>
                  </select>
                </div>
              </div>

              {/* الأولوية */}
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
                    <option value="urgent">🔴 عاجلة</option>
                  </select>
                </div>
              </div>

              {/* نوع المهمة */}
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

              {/* الوقت المقدر */}
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

              {/* الساعات الفعلية */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Clock size={14} />
                  <span>الساعات الفعلية</span>
                </div>
                <div className="notion-property-value">
                  <input
                    type="number"
                    placeholder="ساعات..."
                    step="0.5"
                    min="0"
                    value={formData.actual_hours}
                    onChange={(e) => updateField('actual_hours', e.target.value)}
                  />
                </div>
              </div>

              {/* المتطلبات — شريحتان داخل الشبكة (كانتا كتلة مستقلة بسطرَي شرح) */}
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

            <div className="notion-section-divider"></div>

            {/* ربط المهمة — تعديل حر (قضية/عميل/تنفيذ/خدمة) */}
            <div className="notion-content-label">ربط المهمة</div>
            <TaskLinkPicker value={link} onChange={setLink} disabled={loading} />

            <div className="notion-section-divider"></div>

            {/* الوصف والملاحظات جنباً إلى جنب — بدل كتلتين متتاليتين */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="notion-content-area">
                <div className="notion-content-label">وصف المهمة</div>
                <textarea
                  className="notion-textarea"
                  placeholder="أضف وصفاً، روابط، أو تفاصيل المهمة هنا..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </div>

              {/* الملاحظات — عمود مستقل يُعرض في صفحة التفاصيل */}
              <div className="notion-content-area">
                <div className="notion-content-label">الملاحظات</div>
                <textarea
                  className="notion-textarea"
                  placeholder="ملاحظات داخلية للفريق (اختياري)..."
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                />
              </div>
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
                  جاري التحديث...
                </>
              ) : (
                <>
                  <Save size={14} style={{ marginLeft: '8px' }} />
                  حفظ التغييرات
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EditTaskModal;
