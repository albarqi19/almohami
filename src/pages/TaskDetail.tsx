import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  CheckSquare,
  List,
  Activity
} from 'lucide-react';
import { TaskService } from '../services/taskService';
import { UserService } from '../services/UserService';
import { TaskCommentService } from '../services/taskCommentService';
import TaskTimer from '../components/TaskTimer';
import SubtasksList from '../components/SubtasksList';
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

    // Optimistic update
    setTask(updatedTask);

    // تحديث الكاش المركزي لصفحة المهام
    TasksCache.updateTask(updatedTask);

    try {
      await TaskService.updateTaskStatus(taskId!, newStatus);
    } catch (error) {
      console.error("Status update failed", error);
      loadTask(); // Revert
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

  if (loading) return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>;
  if (!task) return <div className="p-8 text-center text-red-500">لم يتم العثور على المهمة</div>;

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
          <span className="task-id-badge">#{taskId?.slice(0, 6)}</span>

          {/* Status Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="status-select-btn"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              style={{
                backgroundColor: currentStatus.color + '20',
                color: currentStatus.color,
                cursor: 'pointer',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: currentStatus.color }}></span>
              {currentStatus.label}
              <ChevronDown size={14} />
            </button>

            {showStatusDropdown && (
              <>
                {/* Backdrop */}
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99
                  }}
                  onClick={() => setShowStatusDropdown(false)}
                />
                {/* Dropdown */}
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 4,
                    background: 'var(--color-surface, #fff)',
                    border: '1px solid var(--color-border, #e5e5e5)',
                    borderRadius: 8,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    zIndex: 100,
                    minWidth: 160,
                    overflow: 'hidden'
                  }}
                >
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => {
                        handleStatusChange(key as TaskStatus);
                        setShowStatusDropdown(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '10px 14px',
                        background: task?.status === key ? 'var(--color-surface-subtle, #f8f9fa)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 13,
                        color: config.color,
                        textAlign: 'right',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-subtle, #f8f9fa)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = task?.status === key ? 'var(--color-surface-subtle, #f8f9fa)' : 'transparent'}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: config.color }}></span>
                      {config.label}
                      {task?.status === key && <CheckCircle size={14} style={{ marginRight: 'auto' }} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="task-header-actions">
          <button className="task-breadcrumb-btn" onClick={handleDeleteTask} title="حذف المهمة">
            <Trash2 size={16} />
          </button>
          <button className="task-breadcrumb-btn" title="مشاركة">
            <Share2 size={16} />
          </button>
          <button className="task-breadcrumb-btn">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      <div className="task-content-wrapper">
        {/* Main Content Column */}
        <div className="task-main-col">
          <div className="task-title-section">
            <input
              className="task-title-input"
              defaultValue={task.title}
              placeholder="عنوان المهمة"
            />
          </div>

          <div className="task-desc-section">
            <textarea
              className="task-desc-editor"
              placeholder="أضف وصفاً، اكتب / للأوامر..."
              defaultValue={task.description}
            />
          </div>

          {/* Subtasks */}
          <div className="task-section">
            <SubtasksList
              taskId={taskId!}
              onProgressChange={(progress) => {
                console.log('Subtasks progress:', progress);
              }}
            />
          </div>

          {/* Attachments (Mockup) */}
          <div className="task-section">
            <div className="task-section-header">
              <Paperclip size={16} />
              المرفقات
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, width: 150, textAlign: 'center' }}>
                <div style={{ background: '#F1F5F9', height: 80, borderRadius: 4, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#94A3B8' }}>PDF</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>ملف القضية.pdf</div>
              </div>
            </div>
          </div>

          {/* Activity Stream */}
          <div className="activity-section">
            <div className="activity-tabs">
              <div className="activity-tab active">التعليقات</div>
              <div className="activity-tab">السجل</div>
            </div>

            <div className="comment-box-wrapper">
              <div className="user-avatar">أ</div>
              <div className="comment-input-area">
                <textarea
                  className="comment-textarea"
                  placeholder="اكتب تعليقاً... (@mention لذكر شخص)"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <div className="comment-actions">
                  <button
                    style={{
                      background: 'var(--law-navy)', color: 'white', border: 'none',
                      padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer'
                    }}
                  >
                    إرسال
                  </button>
                </div>
              </div>
            </div>

            {/* Comments List */}
            {taskComments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {taskComments.map(comment => (
                  <div key={comment.id} style={{ display: 'flex', gap: 12 }}>
                    <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                      {comment.userId ? 'U' : 'A'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>مستخدم</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>منذ ساعة</span>
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.5 }}>{comment.comment}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13, padding: 20 }}>
                لا توجد تعليقات حتى الآن
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="task-sidebar">
          <div className="sidebar-card">
            <div className="sidebar-row">
              <div className="sidebar-label">
                <User size={14} /> المسؤول
              </div>
              <div className="sidebar-value-btn">
                <div className="user-avatar" style={{ width: 20, height: 20, fontSize: 10, background: '#3b82f6' }}>
                  {assigneeName.charAt(0)}
                </div>
                {assigneeName}
              </div>
            </div>

            <div className="sidebar-row">
              <div className="sidebar-label">
                <Calendar size={14} /> تاريخ الاستحقاق
              </div>
              <div className="sidebar-value-btn">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('ar-SA') : 'غير محدد'}
              </div>
            </div>

            <div className="sidebar-row">
              <div className="sidebar-label">
                <Flag size={14} /> الأولوية
              </div>
              <div className="sidebar-value-btn" style={{ color: currentPriority.color }}>
                <Flag size={14} fill={currentPriority.color} />
                {currentPriority.label}
              </div>
            </div>

            <div className="sidebar-row">
              <div className="sidebar-label">
                <Clock size={14} /> تتبع الوقت
              </div>
              <TaskTimer
                taskId={taskId!}
                taskTitle={task.title}
                caseTitle={(task as any).case?.title || task.caseId || ''}
              />
            </div>
          </div>

          <div className="sidebar-card">
            <div className="sidebar-label">
              <Activity size={14} /> الخصائص
            </div>
            <div className="sidebar-row">
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>القضية المرتبطة</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--law-navy)', cursor: 'pointer', textDecoration: 'underline' }}>
                {task.caseId}
              </div>
            </div>
            <div className="sidebar-row">
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>الوسوم (Tags)</div>
              <div className="tags-list">
                <div className="tag-badge">إداري</div>
                <div className="tag-badge">عاجل</div>
                <button style={{ background: 'none', border: '1px dashed var(--color-border)', borderRadius: 4, padding: '2px 6px', fontSize: 11, cursor: 'pointer' }}>+ إضافة</button>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            تم الإنشاء في {new Date(task.createdAt || Date.now()).toLocaleDateString('ar-SA')}
            <br />
            آخر تحديث منذ يومين
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
