import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  User,
  Calendar,
  Clock,
  MessageSquare,
  CheckCircle,
  Flag,
  Share2,
  Trash2,
  MoreHorizontal,
  Plus,
  Paperclip,
  Activity,
  Briefcase,
  ExternalLink,
  ChevronLeft,
  Layout,
  ListTodo,
  FileText,
  SendHorizontal,
  ShieldCheck,
  X,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { TaskService } from '../services/taskService';
import { UserService } from '../services/UserService';
import { TaskCommentService } from '../services/taskCommentService';
import TaskTimer from '../components/TaskTimer';
import SubtasksList from '../components/SubtasksList';
import MentionInput from '../components/MentionInput';
import { TasksCache } from '../utils/tasksCache';
import type { Task, TaskComment, TaskStatus, Priority } from '../types';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  todo: { label: 'لم تبدأ', color: '#64748b' },
  in_progress: { label: 'قيد التنفيذ', color: '#3b82f6' },
  review: { label: 'مراجعة', color: '#f59e0b' },
  pending_approval: { label: 'بانتظار الاعتماد', color: '#8b5cf6' },
  completed: { label: 'مكتملة', color: '#10b981' },
  cancelled: { label: 'ملغية', color: '#ef4444' }
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: 'عالية', color: '#ef4444' },
  medium: { label: 'متوسطة', color: '#f59e0b' },
  low: { label: 'منخفضة', color: '#3b82f6' }
};

/** وقت التعليق بصيغة نسبية حقيقية (لا قيمة وهمية). */
function formatCommentTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} ي`;
  return d.toLocaleDateString('ar-SA');
}

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [users, setUsers] = useState<Record<string, { name: string }>>({});
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [onedriveConnected, setOnedriveConnected] = useState<boolean | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (taskId) {
      loadTask();
      loadComments();
      loadUsers();
      loadDocuments();
    }
  }, [taskId]);

  const loadTask = async () => {
    try {
      setLoading(true);
      const taskData = await TaskService.getTask(taskId!);
      setTask(taskData);
    } catch (error) {
      console.error('Error loading task:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const comments = await TaskCommentService.getTaskComments(taskId!);
      setTaskComments(comments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await UserService.getLawyers();
      const usersMap: Record<string, { name: string }> = {};
      usersData.forEach(user => {
        usersMap[user.id] = { name: user.name };
      });
      setUsers(usersMap);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const res = await TaskService.getTaskDocuments(taskId!);
      setDocuments(res.documents);
      setOnedriveConnected(res.onedriveConnected);
    } catch (error) {
      console.error('Error loading task documents:', error);
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    TasksCache.updateTask({ ...task, status: newStatus }); // تحديث متفائل للكانبان
    try {
      await TaskService.updateTaskStatus(taskId!, newStatus);
      await loadTask(); // الحالة الفعلية قد تتحول إلى «بانتظار الاعتماد»
    } catch (error: any) {
      console.error('Status update failed', error);
      alert(error?.message || 'تعذّر تحديث حالة المهمة');
      loadTask();
    }
  };

  const handleApprove = async () => {
    setActionBusy(true);
    try {
      await TaskService.approveTask(taskId!);
      await loadTask();
    } catch (error: any) {
      alert(error?.message || 'تعذّر اعتماد المهمة');
    } finally {
      setActionBusy(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt('سبب الرفض (إلزامي):', '');
    if (!reason || !reason.trim()) return;
    setActionBusy(true);
    try {
      await TaskService.rejectTask(taskId!, reason.trim());
      await loadTask();
    } catch (error: any) {
      alert(error?.message || 'تعذّر رفض المهمة');
    } finally {
      setActionBusy(false);
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      await TaskService.uploadTaskDocument(taskId!, file);
      await loadDocuments();
      await loadTask();
    } catch (error: any) {
      alert(error?.message || 'تعذّر رفع المرفق');
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm('حذف هذا المرفق؟')) return;
    try {
      await TaskService.deleteTaskDocument(taskId!, docId);
      await loadDocuments();
      await loadTask();
    } catch (error: any) {
      alert(error?.message || 'تعذّر حذف المرفق');
    }
  };

  const handleOpenDoc = async (docId: string) => {
    try {
      const url = await TaskService.getTaskDocumentUrl(taskId!, docId);
      window.open(url, '_blank', 'noopener');
    } catch (error: any) {
      alert(error?.message || 'تعذّر فتح المرفق');
    }
  };

  const toggleRequirement = async (field: 'requires_approval' | 'requires_attachment', value: boolean) => {
    setActionBusy(true);
    try {
      const updated = await TaskService.configureRequirements(taskId!, { [field]: value });
      setTask(prev => (prev ? { ...prev, ...updated } : prev));
    } catch (error: any) {
      alert(error?.message || 'تعذّر تحديث المتطلبات');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeleteTask = async () => {
    if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
      try {
        await TaskService.deleteTask(taskId!);
        navigate('/tasks');
      } catch (error) {
        console.error("Delete failed", error);
      }
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--color-text-secondary)' }}>جاري تحميل تفاصيل المهمة...</div>;
  if (!task) return <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>لم يتم العثور على المهمة</div>;

  const currentStatus = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
  const currentPriority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const assigneeName = (task.assignedTo && users[task.assignedTo]?.name) || 'غير محدد';

  return (
    <div className="task-detail-page">
      {/* Sticky Header */}
      <div className="task-header">
        <div className="task-header-left">
          <button className="task-breadcrumb-btn" onClick={() => navigate('/tasks')}>
            <ChevronRight size={16} />
            المهام
          </button>
          <span className="task-bc-sep">/</span>
          <span className="task-id-badge">TASK-{taskId?.slice(0, 4)}</span>
        </div>

        <div className="task-header-actions">
          {/* Status Selector */}
          <div className="status-select-wrapper">
            <button
              className="status-select-btn"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              style={{
                backgroundColor: currentStatus.color + '15',
                color: currentStatus.color,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: currentStatus.color }}></span>
              {currentStatus.label}
              <ChevronDown size={14} />
            </button>

            <AnimatePresence>
              {showStatusDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowStatusDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="status-dropdown"
                  >
                    {Object.entries(STATUS_CONFIG).filter(([key]) => key !== 'pending_approval').map(([key, config]) => (
                      <button
                        key={key}
                        className="status-option"
                        onClick={() => {
                          handleStatusChange(key as TaskStatus);
                          setShowStatusDropdown(false);
                        }}
                        style={{ color: task.status === key ? config.color : 'inherit' }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: config.color }}></span>
                        {config.label}
                        {task.status === key && <CheckCircle size={14} style={{ marginRight: 'auto' }} />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button className="task-icon-btn" onClick={handleDeleteTask} title="حذف">
            <Trash2 size={16} />
          </button>
          <button className="task-icon-btn" title="خيارات إضافية">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      <div className="task-content-wrapper">

        {/* Main Content Area (Left) */}
        <div className="task-main-col">
          <div className="task-main-inner">
            {/* Task Title */}
            <input
              className="task-title-input"
              defaultValue={task.title}
              placeholder="عنوان المهمة"
              spellCheck={false}
            />

            {/* شريط بوابة الاعتماد */}
            {task.status === 'pending_approval' && (
              <div className="task-approval-bar pending">
                <div className="task-approval-bar-text">
                  <ShieldCheck size={18} />
                  <span>أنهى المنفّذ هذه المهمة وهي بانتظار الاعتماد</span>
                </div>
                {task.can_approve && (
                  <div className="task-approval-bar-actions">
                    <button className="task-approve-btn" disabled={actionBusy} onClick={handleApprove}>
                      <CheckCircle size={15} /> اعتماد
                    </button>
                    <button className="task-reject-btn" disabled={actionBusy} onClick={handleReject}>
                      <X size={15} /> رفض
                    </button>
                  </div>
                )}
              </div>
            )}
            {task.status === 'completed' && task.approved_by && (
              <div className="task-approval-bar approved">
                <ShieldCheck size={16} />
                <span>
                  اعتُمد الإنجاز{task.approver?.name ? ` بواسطة ${task.approver.name}` : ''}
                  {task.approved_at ? ` — ${new Date(task.approved_at).toLocaleDateString('ar-SA')}` : ''}
                </span>
              </div>
            )}
            {task.status !== 'pending_approval' && task.status !== 'completed' && task.rejection_reason && (
              <div className="task-approval-bar rejected">
                <AlertCircle size={16} />
                <span>أُعيدت للتنفيذ: {task.rejection_reason}</span>
              </div>
            )}

            {/* Description */}
            <div className="task-section">
              <div className="task-section-label">
                <FileText size={16} /> الوصف
              </div>
              <textarea
                className="task-desc-editor"
                placeholder="أضف وصفاً تفصيلياً..."
                defaultValue={task.description}
              />
            </div>

            {/* Subtasks */}
            <div className="task-section">
              <div className="section-header">
                <ListTodo size={16} />
                المهام الفرعية
              </div>
              <SubtasksList
                taskId={taskId!}
                onProgressChange={() => { }}
              />
            </div>
          </div>
        </div>

        {/* Activity & Comments column */}
        <aside className="task-activity-col">
          <div className="section-header">
            <Activity size={16} />
            النشاط والتعليقات
          </div>

          {/* Comments List (تمرّر، بيانات حقيقية) */}
          <div className="task-activity-feed">
            {taskComments.length > 0 ? (
              taskComments.map(comment => {
                const authorName = comment.user?.name || users[comment.userId]?.name || 'مستخدم';
                return (
                  <div key={comment.id} className="tc-comment">
                    <div className="tc-comment__avatar">{authorName.charAt(0) || '؟'}</div>
                    <div className="tc-comment__body">
                      <div className="tc-comment__head">
                        <span className="tc-comment__author">{authorName}</span>
                        <span className="tc-comment__time">{formatCommentTime(comment.createdAt)}</span>
                      </div>
                      <div className="tc-comment__text">{comment.comment}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="task-empty">لا توجد تعليقات بعد</div>
            )}
          </div>

          {/* Comment Input (مثبّت أسفل، ممتدّ للحواف) */}
          <div className="comment-input-box">
            <MentionInput
              value={newComment}
              onChange={setNewComment}
              onMentionsChange={setMentions}
              placeholder="اكتب تعليقاً… (اذكر زميلاً بـ @)"
            />
            <div className="comment-footer">
              <button
                className="send-btn"
                disabled={!newComment.trim() || submittingComment}
                onClick={async () => {
                  if (!newComment.trim()) return;
                  setSubmittingComment(true);
                  await TaskCommentService.createTaskComment(taskId!, { comment: newComment, mentions });
                  setNewComment('');
                  loadComments();
                  setSubmittingComment(false);
                }}
              >
                {submittingComment ? 'جارٍ الإرسال…' : <>إرسال <SendHorizontal size={14} /></>}
              </button>
            </div>
          </div>
        </aside>

        {/* Sidebar Properties (Right) */}
        <div className="task-sidebar">

          {/* Section 1: Core Info */}
          <div className="sidebar-section task-sidebar-card">
            <div className="sidebar-title">معلومات أساسية</div>

            <div className="task-kv">
              <span className="task-kv__label"><User size={14} /> المسؤول</span>
              <span className="task-kv__value">{assigneeName}</span>
            </div>

            <div className="task-kv">
              <span className="task-kv__label"><Calendar size={14} /> الاستحقاق</span>
              <span className="task-kv__value">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('ar-SA') : 'غير محدد'}
              </span>
            </div>

            <div className="task-kv">
              <span className="task-kv__label"><Flag size={14} /> الأولوية</span>
              <span className="task-kv__value" style={{ color: currentPriority.color }}>
                {currentPriority.label}
              </span>
            </div>
          </div>

          {/* Section: Attachments */}
          <div className="sidebar-section task-sidebar-card">
            <div className="sidebar-title sidebar-title--row">
              <span>المرفقات{task.requires_attachment ? ' *' : ''}</span>
              {task.can_manage_documents && (
                <button className="task-attach-add" disabled={uploadingDoc} onClick={() => fileInputRef.current?.click()}>
                  {uploadingDoc ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  <span>إضافة</span>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUploadFile} />
            {onedriveConnected === false && (
              <div className="task-attach-note warn"><AlertCircle size={13} /> اربط OneDrive من الإعدادات لرفع المرفقات</div>
            )}
            {task.requires_attachment && documents.length === 0 && (
              <div className="task-attach-note required"><AlertCircle size={13} /> هذه المهمة تتطلب إرفاق مستند</div>
            )}
            {documents.length === 0 ? (
              <div className="task-attach-empty">لا توجد مرفقات</div>
            ) : (
              documents.map((d: any) => (
                <div key={d.id} className="task-doc-row">
                  <FileText size={14} />
                  <button type="button" className="task-doc-name" onClick={() => handleOpenDoc(String(d.id))}>
                    {d.title || d.file_name}
                  </button>
                  {task.can_manage_documents && (
                    <button className="task-doc-del" onClick={() => handleDeleteDoc(String(d.id))} title="حذف المرفق">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Section: Requirements */}
          <div className="sidebar-section task-sidebar-card">
            <div className="sidebar-title">متطلبات الإنجاز</div>
            <label className="task-req-toggle">
              <input
                type="checkbox"
                checked={!!task.requires_approval}
                disabled={actionBusy || !task.can_configure_requirements}
                onChange={(e) => toggleRequirement('requires_approval', e.target.checked)}
              />
              <ShieldCheck size={14} />
              <span>تتطلب موافقة قبل الإكمال</span>
            </label>
            <label className="task-req-toggle">
              <input
                type="checkbox"
                checked={!!task.requires_attachment}
                disabled={actionBusy || !task.can_configure_requirements}
                onChange={(e) => toggleRequirement('requires_attachment', e.target.checked)}
              />
              <Paperclip size={14} />
              <span>تتطلب إرفاق مستند</span>
            </label>
          </div>

          {/* Section 2: Time Tracking */}
          <div className="sidebar-section task-sidebar-card">
            <div className="sidebar-title">تتبع الوقت</div>
            <TaskTimer taskId={taskId!} taskTitle={task.title} caseTitle={(task as any).case?.title || ''} />
          </div>

          {/* Section 3: Related */}
          <div className="sidebar-section task-sidebar-card">
            <div className="sidebar-title">الارتباطات</div>
            {(task as any).case ? (
              <Link to={`/cases/${(task as any).case.id}`} className="task-kv task-kv--link">
                <span className="task-kv__label"><Briefcase size={14} /> القضية</span>
                <span className="task-kv__value">
                  {(task as any).case.title} <ExternalLink size={11} style={{ opacity: 0.5 }} />
                </span>
              </Link>
            ) : (
              <div className="task-kv-empty">غير مرتبطة بقضية</div>
            )}
          </div>

          {/* Meta Info */}
          <div className="task-meta-foot">
            تم الإنشاء: {new Date(task.createdAt || Date.now()).toLocaleDateString('ar-SA')}
          </div>

        </div>

      </div>
    </div>
  );
};

export default TaskDetail;
