import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Upload,
  Link2,
  Zap,
  ChevronDown,
  Pencil,
  Check,
  X,
  FileText,
  User,
  Building,
  Scale,
  ArrowRight,
} from 'lucide-react';
import type { Case, CasePrepTask } from '../types';
import { apiClient } from '../utils/api';

interface CasePrepKitchenProps {
  caseData: Case;
  onActivate: (filingDate?: string) => void;
  onLinkNajiz: () => void;
  onRefresh: () => void;
  onEditCase: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft:       { label: 'مسودة',           color: '#9CA3AF', bg: '#F3F4F6' },
  preparation: { label: 'جاري التجهيز',   color: '#D97706', bg: '#FEF3C7' },
  filed:       { label: 'تم الرفع على ناجز', color: '#2563EB', bg: '#EFF6FF' },
};

const PREP_STAGES = [
  { key: 'draft',       label: 'مسودة',        icon: '📄' },
  { key: 'preparation', label: 'جاري التجهيز', icon: '⚙️' },
  { key: 'filed',       label: 'تم الرفع',     icon: '📤' },
  { key: 'active',      label: 'نشطة',          icon: '⚖️' },
];

const CasePrepKitchen: React.FC<CasePrepKitchenProps> = ({
  caseData,
  onActivate,
  onLinkNajiz,
  onRefresh,
  onEditCase,
}) => {
  const [tasks, setTasks] = useState<CasePrepTask[]>(caseData.prep_tasks ?? []);
  const [progress, setProgress] = useState(caseData.preparation_progress ?? 0);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [statusChanging, setStatusChanging] = useState(false);
  const [activating, setActivating] = useState(false);
  const [filingDate, setFilingDate] = useState('');
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTasks(caseData.prep_tasks ?? []);
    setProgress(caseData.preparation_progress ?? 0);
  }, [caseData.prep_tasks, caseData.preparation_progress]);

  const recalcProgress = (updated: CasePrepTask[]) => {
    if (!updated.length) return 0;
    return Math.round((updated.filter(t => t.is_completed).length / updated.length) * 100);
  };

  const handleToggle = async (task: CasePrepTask) => {
    setLoadingIds(prev => new Set(prev).add(task.id));
    try {
      const res: any = await apiClient.patch(`/cases/${caseData.id}/prep-tasks/${task.id}/toggle`);
      const updated = tasks.map(t => t.id === task.id ? res.data : t);
      setTasks(updated);
      setProgress(res.progress ?? recalcProgress(updated));
    } catch {
      // silent
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(task.id); return s; });
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      const res: any = await apiClient.post(`/cases/${caseData.id}/prep-tasks`, { title: newTaskTitle.trim() });
      const updated = [...tasks, res.data];
      setTasks(updated);
      setProgress(recalcProgress(updated));
      setNewTaskTitle('');
      setAddingTask(false);
    } catch {
      // silent
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    setLoadingIds(prev => new Set(prev).add(taskId));
    try {
      await apiClient.delete(`/cases/${caseData.id}/prep-tasks/${taskId}`);
      const updated = tasks.filter(t => t.id !== taskId);
      setTasks(updated);
      setProgress(recalcProgress(updated));
    } catch {
      // silent
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(taskId); return s; });
    }
  };

  const startEdit = (task: CasePrepTask) => {
    setEditingId(task.id);
    setEditingTitle(task.title);
  };

  const handleSaveEdit = async (taskId: number) => {
    if (!editingTitle.trim()) return;
    try {
      const res: any = await apiClient.put(`/cases/${caseData.id}/prep-tasks/${taskId}`, { title: editingTitle.trim() });
      setTasks(tasks.map(t => t.id === taskId ? res.data : t));
    } catch {
      // silent
    } finally {
      setEditingId(null);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === caseData.status) return;
    if (newStatus === 'active') { setShowActivateConfirm(true); return; }
    setStatusChanging(true);
    try {
      await apiClient.patch(`/cases/${caseData.id}/prep-status`, { status: newStatus });
      onRefresh();
    } catch {
      // silent
    } finally {
      setStatusChanging(false);
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      await apiClient.post(`/cases/${caseData.id}/activate`, filingDate ? { filing_date: filingDate } : {});
      onActivate(filingDate || undefined);
    } catch {
      // silent
    } finally {
      setActivating(false);
      setShowActivateConfirm(false);
    }
  };

  const currentStageIndex = PREP_STAGES.findIndex(s => s.key === caseData.status);
  const statusInfo = STATUS_LABELS[caseData.status] ?? STATUS_LABELS.draft;

  return (
    <div className="case-prep-kitchen" dir="rtl">

      {/* ===== رأس المطبخ ===== */}
      <div className="prep-header">
        {/* Lifecycle bar */}
        <div className="prep-lifecycle">
          {PREP_STAGES.map((stage, i) => {
            const isDone = i < currentStageIndex;
            const isCurrent = i === currentStageIndex;
            return (
              <React.Fragment key={stage.key}>
                <button
                  className={`prep-stage ${isCurrent ? 'prep-stage--current' : ''} ${isDone ? 'prep-stage--done' : ''}`}
                  onClick={() => handleStatusChange(stage.key)}
                  disabled={statusChanging || stage.key === 'active'}
                  title={stage.key === 'active' ? 'استخدم زر تفعيل القضية' : undefined}
                >
                  <span className="prep-stage__icon">{stage.icon}</span>
                  <span className="prep-stage__label">{stage.label}</span>
                  {isCurrent && <span className="prep-stage__dot" />}
                </button>
                {i < PREP_STAGES.length - 1 && (
                  <div className={`prep-stage-line ${i < currentStageIndex ? 'prep-stage-line--done' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress + Actions */}
        <div className="prep-header-meta">
          {/* Progress bar */}
          <div className="prep-progress-wrap">
            <div className="prep-progress-bar">
              <div className="prep-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="prep-progress-label">{progress}% مكتمل</span>
          </div>

          {/* Actions */}
          <div className="prep-actions">
            {caseData.status === 'filed' && (
              <button className="prep-btn prep-btn--najiz" onClick={onLinkNajiz}>
                <Link2 size={15} />
                ربط بناجز
              </button>
            )}
            <button
              className="prep-btn prep-btn--activate"
              onClick={() => setShowActivateConfirm(true)}
            >
              <Zap size={15} />
              تفعيل القضية
            </button>
          </div>
        </div>
      </div>

      {/* ===== بطاقة معلومات القضية ===== */}
      <div className="prep-case-card">
        <div className="prep-case-card__fields">
          <div className="prep-case-field">
            <Scale size={14} className="prep-case-field__icon" />
            <span className="prep-case-field__label">نوع القضية</span>
            <span className="prep-case-field__value">{caseData.case_type_arabic || caseData.case_type}</span>
          </div>
          <div className="prep-case-field">
            <User size={14} className="prep-case-field__icon" />
            <span className="prep-case-field__label">الموكل</span>
            <span className="prep-case-field__value">{caseData.client_name}</span>
          </div>
          <div className="prep-case-field">
            <Building size={14} className="prep-case-field__icon" />
            <span className="prep-case-field__label">المحكمة</span>
            <span className="prep-case-field__value">{caseData.court || '—'}</span>
          </div>
          {caseData.opponent_name && (
            <div className="prep-case-field">
              <ArrowRight size={14} className="prep-case-field__icon" />
              <span className="prep-case-field__label">الخصم</span>
              <span className="prep-case-field__value">{caseData.opponent_name}</span>
            </div>
          )}
        </div>
        <button className="prep-case-card__edit" onClick={onEditCase} title="تعديل بيانات القضية">
          <Pencil size={14} />
        </button>
      </div>

      {/* ===== قائمة مهام التجهيز ===== */}
      <div className="prep-tasks-section">
        <div className="prep-tasks-header">
          <FileText size={16} />
          <span>قائمة التجهيز</span>
          <span className="prep-tasks-count">{tasks.filter(t => t.is_completed).length}/{tasks.length}</span>
        </div>

        <div className="prep-tasks-list">
          {tasks.map(task => {
            const isLoading = loadingIds.has(task.id);
            const isEditing = editingId === task.id;
            return (
              <div key={task.id} className={`prep-task ${task.is_completed ? 'prep-task--done' : ''}`}>
                {/* Checkbox */}
                <button
                  className="prep-task__check"
                  onClick={() => handleToggle(task)}
                  disabled={isLoading}
                >
                  {task.is_completed
                    ? <CheckCircle2 size={20} className="prep-task__check-icon prep-task__check-icon--done" />
                    : <Circle size={20} className="prep-task__check-icon" />
                  }
                </button>

                {/* Title (editable) */}
                <div className="prep-task__body">
                  {isEditing ? (
                    <div className="prep-task__edit-row">
                      <input
                        autoFocus
                        className="prep-task__edit-input"
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveEdit(task.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <button className="prep-task__edit-save" onClick={() => handleSaveEdit(task.id)}><Check size={14} /></button>
                      <button className="prep-task__edit-cancel" onClick={() => setEditingId(null)}><X size={14} /></button>
                    </div>
                  ) : (
                    <span
                      className="prep-task__title"
                      onDoubleClick={() => startEdit(task)}
                      title="انقر مرتين للتعديل"
                    >
                      {task.title}
                    </span>
                  )}
                  {task.is_completed && task.completed_by_user && (
                    <span className="prep-task__meta">
                      {task.completed_by_user.name} · {task.completed_at ? new Date(task.completed_at).toLocaleDateString('ar-SA') : ''}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {!isEditing && (
                  <div className="prep-task__actions">
                    <button className="prep-task__action-btn" onClick={() => startEdit(task)} title="تعديل">
                      <Pencil size={13} />
                    </button>
                    <button
                      className="prep-task__action-btn prep-task__action-btn--danger"
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={isLoading}
                      title="حذف"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* إضافة مهمة جديدة */}
          {addingTask ? (
            <div className="prep-task prep-task--new">
              <Circle size={20} className="prep-task__check-icon" style={{ opacity: 0.3 }} />
              <input
                ref={newTaskInputRef}
                autoFocus
                className="prep-task__new-input"
                placeholder="اكتب عنوان المهمة..."
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddTask();
                  if (e.key === 'Escape') { setAddingTask(false); setNewTaskTitle(''); }
                }}
              />
              <div className="prep-task__actions">
                <button className="prep-task__edit-save" onClick={handleAddTask}><Check size={14} /></button>
                <button className="prep-task__edit-cancel" onClick={() => { setAddingTask(false); setNewTaskTitle(''); }}><X size={14} /></button>
              </div>
            </div>
          ) : (
            <button className="prep-add-task-btn" onClick={() => setAddingTask(true)}>
              <Plus size={14} />
              إضافة مهمة
            </button>
          )}
        </div>
      </div>

      {/* ===== تأكيد التفعيل ===== */}
      {showActivateConfirm && (
        <div className="prep-confirm-overlay" onClick={() => setShowActivateConfirm(false)}>
          <div className="prep-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="prep-confirm-modal__title">
              <Zap size={18} />
              تفعيل القضية
            </div>
            <p className="prep-confirm-modal__body">
              ستتحول القضية إلى الوضع <strong>نشطة</strong> وستظهر صفحتها الكاملة.
              {progress < 100 && (
                <span className="prep-confirm-modal__warning">
                  تنبيه: {tasks.filter(t => !t.is_completed).length} مهمة لم تكتمل بعد.
                </span>
              )}
            </p>
            <div className="prep-confirm-modal__date">
              <label>تاريخ القيد (اختياري)</label>
              <input type="date" value={filingDate} onChange={e => setFilingDate(e.target.value)} className="prep-confirm-modal__date-input" />
            </div>
            <div className="prep-confirm-modal__actions">
              <button className="prep-btn prep-btn--activate" onClick={handleActivate} disabled={activating}>
                {activating ? 'جاري التفعيل...' : 'تفعيل الآن'}
              </button>
              <button className="prep-btn prep-btn--cancel" onClick={() => setShowActivateConfirm(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CasePrepKitchen;
