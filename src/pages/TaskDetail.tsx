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
  SendHorizontal
} from 'lucide-react';
import { TaskService } from '../services/taskService';
import { UserService } from '../services/UserService';
import { TaskCommentService } from '../services/taskCommentService';
import TaskTimer from '../components/TaskTimer';
import SubtasksList from '../components/SubtasksList';
import MentionInput from '../components/MentionInput';
import { TasksCache } from '../utils/tasksCache';
import type { Task, TaskComment, TaskStatus, Priority } from '../types';
import '../styles/task-detail.css';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  todo: { label: 'لم تبدأ', color: '#64748b' },
  in_progress: { label: 'قيد التنفيذ', color: '#3b82f6' },
  review: { label: 'مراجعة', color: '#f59e0b' },
  completed: { label: 'مكتملة', color: '#10b981' },
  cancelled: { label: 'ملغية', color: '#ef4444' }
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: 'عالية', color: '#ef4444' },
  medium: { label: 'متوسطة', color: '#f59e0b' },
  low: { label: 'منخفضة', color: '#3b82f6' }
};

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

  useEffect(() => {
    if (taskId) {
      loadTask();
      loadComments();
      loadUsers();
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

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    const updatedTask = { ...task, status: newStatus };
    setTask(updatedTask);
    TasksCache.updateTask(updatedTask);
    try {
      await TaskService.updateTaskStatus(taskId!, newStatus);
    } catch (error) {
      console.error("Status update failed", error);
      loadTask();
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
          <span className="task-breadcrumb-separator" style={{ color: 'var(--color-text-tertiary)' }}>/</span>
          <span className="task-id-badge">TASK-{taskId?.slice(0, 4)}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
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

          <button className="task-breadcrumb-btn" onClick={handleDeleteTask} title="حذف">
            <Trash2 size={16} />
          </button>
          <button className="task-breadcrumb-btn" title="خيارات إضافية">
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

            {/* Description */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} /> الوصف
              </div>
              <textarea
                className="task-desc-editor"
                placeholder="أضف وصفاً تفصيلياً، اضغط / للأوامر..."
                defaultValue={task.description}
              />
            </div>

            {/* Subtasks */}
            <div className="task-subtasks-wrapper">
              <div className="section-header">
                <ListTodo size={20} />
                المهام الفرعية
              </div>
              <SubtasksList
                taskId={taskId!}
                onProgressChange={() => { }}
              />
            </div>

            {/* Activity Feed */}
            <div className="task-activity-wrapper">
              <div className="section-header">
                <Activity size={20} />
                النشاط والتعليقات
              </div>

              {/* Comment Input */}
              <div className="comment-input-box">
                <MentionInput
                  value={newComment}
                  onChange={setNewComment}
                  onMentionsChange={setMentions}
                  placeholder="اكتب تعليقاً... يمكنك الإشارة للزملاء باستخدام @"
                />
                <div className="comment-footer">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}><Paperclip size={18} /></button>
                  </div>
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
                    {submittingComment ? (
                      'جاري الإرسال...'
                    ) : (
                      <>
                        إرسال <SendHorizontal size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Comments List */}
              <div>
                {taskComments.length > 0 ? (
                  taskComments.map(comment => (
                    <div key={comment.id} className="activity-item">
                      <div className="activity-avatar">
                        {comment.userId ? 'م' : 'U'}
                      </div>
                      <div className="activity-content">
                        <div className="activity-header">
                          <span className="activity-author">مستخدم النظام</span>
                          <span className="activity-time">منذ ساعتين</span>
                        </div>
                        <div className="activity-text">{comment.comment}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-tertiary)' }}>
                    لا توجد أنشطة مسجلة لهذه المهمة حتى الآن
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Properties (Right) */}
        <div className="task-sidebar">

          {/* Section 1: Core Info */}
          <div className="sidebar-section">
            <div className="sidebar-title">معلومات أساسية</div>

            <div className="sidebar-row">
              <div className="property-icon"><User size={16} /></div>
              <div className="property-content">
                <span className="property-label">المسؤول</span>
                <span className="property-value">{assigneeName}</span>
              </div>
            </div>

            <div className="sidebar-row">
              <div className="property-icon"><Calendar size={16} /></div>
              <div className="property-content">
                <span className="property-label">تاريخ الاستحقاق</span>
                <span className="property-value">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString('ar-SA') : 'غير محدد'}
                </span>
              </div>
            </div>

            <div className="sidebar-row">
              <div className="property-icon"><Flag size={16} /></div>
              <div className="property-content">
                <span className="property-label">الأولوية</span>
                <span className="property-value" style={{ color: currentPriority.color }}>
                  {currentPriority.label}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Time Tracking */}
          <div className="sidebar-section">
            <div className="sidebar-title">تتبع الوقت</div>
            <div style={{ background: 'var(--dashboard-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <TaskTimer taskId={taskId!} taskTitle={task.title} caseTitle={(task as any).case?.title || ''} />
            </div>
          </div>

          {/* Section 3: Related */}
          <div className="sidebar-section">
            <div className="sidebar-title">الارتباطات</div>
            {(task as any).case ? (
              <Link to={`/cases/${(task as any).case.id}`} className="sidebar-row" style={{ textDecoration: 'none' }}>
                <div className="property-icon" style={{ color: 'var(--law-navy)' }}><Briefcase size={16} /></div>
                <div className="property-content">
                  <span className="property-label">تابع للقضية</span>
                  <span className="property-value" style={{ fontSize: '12px', lineHeight: 1.4 }}>
                    {(task as any).case.title}
                  </span>
                </div>
                <ExternalLink size={12} style={{ opacity: 0.5 }} />
              </Link>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>غير مرتبطة بقضية</div>
            )}
          </div>

          {/* Meta Info */}
          <div style={{ marginTop: 'auto', fontSize: '11px', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
            تم الإنشاء: {new Date(task.createdAt || Date.now()).toLocaleDateString('ar-SA')}
          </div>

        </div>

      </div>
    </div>
  );
};

export default TaskDetail;
