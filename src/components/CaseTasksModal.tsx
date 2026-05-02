import React, { useState, useEffect } from 'react';
import { Reorder } from 'framer-motion';
import {
  CheckSquare,
  User,
  Calendar,
  Loader2,
  AlertCircle,
  Activity,
  MessageSquare,
  Send,
  GripVertical,
  ListChecks,
  Plus,
  Trash2,
  CheckCircle
} from 'lucide-react';
import Modal from './Modal';
import AddTaskModal from './AddTaskModal';
import MentionInput from './MentionInput';
import TaskTimer from './TaskTimer';
import SubtasksList from './SubtasksList';
import { TaskService } from '../services/taskService';
import { TaskCommentService } from '../services/taskCommentService';
import type { Task, TaskComment } from '../types';

interface CaseTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  caseTitle: string;
}



const CaseTasksModal: React.FC<CaseTasksModalProps> = ({
  isOpen,
  onClose,
  caseId,
  caseTitle
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [detailsTab, setDetailsTab] = useState<'subtasks' | 'comments'>('subtasks');

  // Load tasks when modal opens
  useEffect(() => {
    if (isOpen && caseId) {
      loadTasks();
    }
  }, [isOpen, caseId]);

  // Load comments when task is selected + reset tab
  useEffect(() => {
    if (selectedTask) {
      loadComments(selectedTask.id);
      setDetailsTab('subtasks');
    }
  }, [selectedTask?.id]);

  const loadTasks = async () => {
    try {
      setLoadingTasks(true);
      setError(null);
      const result = await TaskService.getTasks({ case_id: caseId });
      const fresh = result?.data || [];
      setTasks(fresh);
      // مزامنة المهمة المختارة مع النسخة المُحدَّثة (لتحديث شارات العدّ)
      setSelectedTask((prev) => (prev ? fresh.find((t) => t.id === prev.id) || prev : prev));
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('فشل في تحميل المهام');
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const loadComments = async (taskId: string) => {
    try {
      setLoadingComments(true);
      const result = await TaskCommentService.getTaskComments(taskId);
      setComments(result || []);
    } catch (err) {
      console.error('Error loading comments:', err);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const persistOrder = async (newOrder: Task[]) => {
    if (savingOrder) return;
    setSavingOrder(true);
    try {
      await TaskService.reorderInCase(
        caseId,
        newOrder.map((t) => String(t.id))
      );
    } catch (err) {
      console.error('Failed to reorder tasks:', err);
      // عند الفشل، أعد التحميل من الخادم لتفادي عدم التزامن
      loadTasks();
    } finally {
      setSavingOrder(false);
    }
  };

  const handleReorder = (newOrder: Task[]) => {
    setTasks(newOrder);
    persistOrder(newOrder);
  };

  const handleAddComment = async () => {
    if (!selectedTask || !newComment.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      await TaskCommentService.createTaskComment(selectedTask.id, {
        comment: newComment.trim(),
        mentions: mentions
      });
      setNewComment('');
      setMentions([]);
      await loadComments(selectedTask.id);
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('فشل في إضافة التعليق');
    } finally {
      setSubmittingComment(false);
    }
  };



  // وظائف الإجراءات السريعة
  const handleCompleteTask = async () => {
    if (!selectedTask) return;

    try {
      await TaskService.updateTaskStatus(selectedTask.id, 'completed');
      await loadTasks(); // إعادة تحميل المهام
      alert('تم تسليم المهمة بنجاح');
    } catch (error) {
      console.error('خطأ في تسليم المهمة:', error);
      alert('فشل في تسليم المهمة');
    }
  };

  const handleRequestExtension = () => {
    alert('ميزة طلب تمديد الوقت ستتوفر قريباً');
  };

  const handleAddFollower = () => {
    alert('ميزة إضافة متابع ستتوفر قريباً');
  };

  const handleShareTask = () => {
    if (selectedTask) {
      if (navigator.share) {
        navigator.share({
          title: selectedTask.title || 'مهمة',
          text: selectedTask.description || 'تفاصيل المهمة',
          url: window.location.href + '/tasks/' + selectedTask.id
        });
      } else {
        navigator.clipboard.writeText(window.location.href + '/tasks/' + selectedTask.id);
        alert('تم نسخ رابط المهمة');
      }
    }
  };

  const handleReportIssue = () => {
    alert('ميزة الإبلاغ عن مشكلة ستتوفر قريباً');
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in_progress': return '#F59E0B';
      case 'pending': return '#6B7280';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getTaskStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'مكتملة';
      case 'in_progress': return 'قيد التنفيذ';
      case 'pending': return 'معلقة';
      case 'cancelled': return 'ملغية';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'عالية';
      case 'medium': return 'متوسطة';
      case 'low': return 'منخفضة';
      default: return priority;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl" title={`مهام القضية: ${caseTitle}`}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '70vh',
          maxHeight: '550px',
          // إلغاء الحشو الافتراضي لمنطقة محتوى Modal لكي تمتد الرؤوس حافة-إلى-حافة
          margin: '-16px -20px',
        }}>
          {/* Main Content */}
          <div style={{
            display: 'flex',
            flex: 1,
            overflow: 'hidden'
          }}>
            {/* Tasks List */}
            <div style={{
              width: '40%',
              borderLeft: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: '44px',
                boxSizing: 'border-box',
                flexShrink: 0
              }}>
                <h3 style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckSquare size={16} style={{ color: 'var(--color-primary)' }} />
                  المهام ({tasks.length})
                </h3>
                <button
                  onClick={() => setShowAddTaskModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: 'var(--font-size-xs)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Plus size={14} />
                  إضافة مهمة
                </button>
              </div>

              <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '8px'
              }}>
                {loadingTasks ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px'
                  }}>
                    <Loader2 size={24} style={{
                      animation: 'spin 1s linear infinite',
                      color: 'var(--color-primary)'
                    }} />
                  </div>
                ) : error ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px',
                    textAlign: 'center'
                  }}>
                    <AlertCircle size={24} style={{ color: 'var(--color-error)', marginBottom: '8px' }} />
                    <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>
                      {error}
                    </p>
                  </div>
                ) : tasks.length === 0 ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px',
                    textAlign: 'center'
                  }}>
                    <CheckSquare size={24} style={{ color: 'var(--color-text-tertiary)', marginBottom: '8px' }} />
                    <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                      لا توجد مهام لهذه القضية
                    </p>
                  </div>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={tasks}
                    onReorder={handleReorder}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                    }}
                  >
                    {tasks.map((task) => {
                      const subTotal = task.subtasks_total ?? task.subtasks?.length ?? 0;
                      const subDone = task.subtasks_completed ?? task.subtasks?.filter((s) => s.is_completed).length ?? 0;
                      const subProgress = subTotal > 0 ? Math.round((subDone / subTotal) * 100) : 0;
                      const commentsCount = task.comments_count ?? 0;
                      return (
                      <Reorder.Item
                        key={task.id}
                        value={task}
                        whileDrag={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                        style={{
                          padding: '12px',
                          backgroundColor: selectedTask?.id === task.id ? 'var(--color-surface-subtle)' : 'var(--color-background)',
                          border: '1px solid',
                          borderColor: selectedTask?.id === task.id ? 'var(--color-primary)' : 'var(--color-border)',
                          borderRightWidth: selectedTask?.id === task.id ? '3px' : '1px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          listStyle: 'none',
                          transition: 'all 0.15s ease',
                        }}
                        onClick={() => setSelectedTask(task)}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-text-tertiary)',
                              padding: 0,
                              marginTop: '3px',
                              cursor: 'grab',
                              flexShrink: 0,
                              opacity: 0.45,
                              transition: 'opacity 0.15s ease',
                            }}
                            title="اسحب لإعادة الترتيب"
                            onClick={(e) => e.stopPropagation()}
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.45'; }}
                          >
                            <GripVertical size={14} />
                          </button>

                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: getTaskStatusColor(task.status),
                            marginTop: '6px',
                            flexShrink: 0,
                          }} />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{
                              fontSize: 'var(--font-size-sm)',
                              fontWeight: 'var(--font-weight-medium)',
                              color: 'var(--color-text)',
                              margin: '0 0 4px 0',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                              opacity: task.status === 'completed' ? 0.7 : 1,
                            }}>
                              {task.title}
                            </h4>

                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginBottom: '6px',
                              flexWrap: 'wrap',
                            }}>
                              <span style={{
                                fontSize: 'var(--font-size-xs)',
                                backgroundColor: getTaskStatusColor(task.status),
                                color: 'white',
                                padding: '1px 6px',
                                borderRadius: '4px',
                              }}>
                                {getTaskStatusText(task.status)}
                              </span>

                              <span style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'white',
                                backgroundColor: getPriorityColor(task.priority),
                                padding: '1px 6px',
                                borderRadius: '4px',
                              }}>
                                {getPriorityText(task.priority)}
                              </span>

                              {subTotal > 0 && (
                                <span
                                  title={`${subDone} من ${subTotal} مهام فرعية`}
                                  style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--color-text-secondary)',
                                    backgroundColor: 'var(--color-surface-subtle, rgba(0,0,0,0.05))',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  <ListChecks size={11} />
                                  {subDone}/{subTotal}
                                </span>
                              )}

                              {commentsCount > 0 && (
                                <span
                                  title={`${commentsCount} تعليق`}
                                  style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--color-text-secondary)',
                                    backgroundColor: 'var(--color-surface-subtle, rgba(0,0,0,0.05))',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  <MessageSquare size={11} />
                                  {commentsCount}
                                </span>
                              )}
                            </div>

                            {subTotal > 0 && (
                              <div
                                aria-label="نسبة إنجاز المهام الفرعية"
                                style={{
                                  height: '3px',
                                  backgroundColor: 'var(--color-border)',
                                  borderRadius: '999px',
                                  overflow: 'hidden',
                                  marginBottom: '6px',
                                }}
                              >
                                <div style={{
                                  height: '100%',
                                  width: `${subProgress}%`,
                                  backgroundColor: 'var(--color-success, #10b981)',
                                  transition: 'width 200ms ease',
                                }} />
                              </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Calendar size={10} style={{ color: 'var(--color-text-tertiary)' }} />
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                                  {task.dueDate ? formatDate(task.dueDate.toISOString()) : 'بدون موعد'}
                                </span>
                              </div>
                              {task.assignee?.name && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <User size={10} style={{ color: 'var(--color-text-tertiary)' }} />
                                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                                    {task.assignee.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>
                )}
              </div>
            </div>

            {/* Task Details Panel */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column'
            }}>
              {selectedTask ? (
                <>
                  {/* شريط الإجراءات: Timer + تسليم + حذف */}
                  <div style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    backgroundColor: 'var(--color-surface-subtle)',
                    minHeight: '44px',
                    boxSizing: 'border-box',
                    flexShrink: 0
                  }}>
                    {/* عنوان المهمة */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text)',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {selectedTask.title}
                      </h4>
                    </div>

                    {/* أزرار الإجراءات - ClickUp Minimal Style */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {/* زر التايمر المربوط بقاعدة البيانات */}
                      <TaskTimer
                        taskId={selectedTask.id}
                        taskTitle={selectedTask.title}
                        caseTitle={caseTitle}
                        compact={true}
                      />

                      {/* زر التسليم */}
                      <button
                        onClick={handleCompleteTask}
                        disabled={selectedTask.status === 'completed'}
                        title="تسليم المهمة"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '4px 8px',
                          backgroundColor: selectedTask.status === 'completed' ? 'var(--color-gray-200)' : 'var(--color-success)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: selectedTask.status === 'completed' ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <CheckCircle size={12} />
                        {selectedTask.status === 'completed' ? '✓' : 'تسليم'}
                      </button>

                      {/* زر الحذف */}
                      <button
                        onClick={async () => {
                          if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
                            try {
                              await TaskService.deleteTask(selectedTask.id);
                              setSelectedTask(null);
                              loadTasks();
                            } catch (error) {
                              console.error('Error deleting task:', error);
                              alert('فشل في حذف المهمة');
                            }
                          }
                        }}
                        title="حذف المهمة"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '4px',
                          backgroundColor: 'transparent',
                          color: 'var(--color-text-tertiary)',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--color-error)';
                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--color-text-tertiary)';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* شريط التبويبات */}
                  <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--color-border)',
                    flexShrink: 0,
                  }}>
                    {([
                      {
                        key: 'subtasks' as const,
                        label: 'المهام الفرعية',
                        icon: <ListChecks size={14} />,
                        badge: (() => {
                          const total = selectedTask.subtasks_total ?? selectedTask.subtasks?.length ?? 0;
                          const done = selectedTask.subtasks_completed ?? selectedTask.subtasks?.filter((s) => s.is_completed).length ?? 0;
                          return total > 0 ? `${done}/${total}` : '';
                        })(),
                      },
                      {
                        key: 'comments' as const,
                        label: 'التعليقات',
                        icon: <MessageSquare size={14} />,
                        badge: (selectedTask.comments_count ?? comments.length) > 0
                          ? String(selectedTask.comments_count ?? comments.length)
                          : '',
                      },
                    ]).map((tab) => {
                      const isActive = detailsTab === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setDetailsTab(tab.key)}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '10px 12px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                            color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {tab.icon}
                          <span>{tab.label}</span>
                          {tab.badge && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 'var(--font-weight-semibold)',
                              backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-surface-subtle, rgba(0,0,0,0.08))',
                              color: isActive ? 'white' : 'var(--color-text-secondary)',
                              padding: '1px 6px',
                              borderRadius: '999px',
                              minWidth: '18px',
                              textAlign: 'center',
                            }}>
                              {tab.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px',
                    overflowY: 'auto',
                    minHeight: 0,
                  }}>
                    {detailsTab === 'subtasks' ? (
                      <SubtasksList
                        key={selectedTask.id}
                        taskId={selectedTask.id}
                        onProgressChange={() => {
                          // أعد تحميل قائمة المهام لتحديث شريط التقدم وشارة التبويب
                          loadTasks();
                        }}
                      />
                    ) : (
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0,
                      }}>
                        <div style={{
                          flex: 1,
                          overflowY: 'auto',
                          marginBottom: '12px',
                          minHeight: 0,
                        }}>
                          {loadingComments ? (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '20px',
                            }}>
                              <Loader2 size={20} style={{
                                animation: 'spin 1s linear infinite',
                                color: 'var(--color-primary)',
                              }} />
                            </div>
                          ) : comments.length === 0 ? (
                            <p style={{
                              color: 'var(--color-text-tertiary)',
                              fontSize: 'var(--font-size-sm)',
                              textAlign: 'center',
                              margin: '20px 0',
                            }}>
                              لا توجد تعليقات على هذه المهمة
                            </p>
                          ) : (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                            }}>
                              {comments.map((comment) => (
                                <div
                                  key={comment.id}
                                  style={{
                                    padding: '8px',
                                    backgroundColor: 'var(--color-gray-50)',
                                    borderRadius: '6px',
                                    border: '1px solid var(--color-border)',
                                  }}
                                >
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginBottom: '4px',
                                  }}>
                                    <User size={12} style={{ color: 'var(--color-primary)' }} />
                                    <span style={{
                                      fontSize: 'var(--font-size-xs)',
                                      fontWeight: 'var(--font-weight-medium)',
                                      color: 'var(--color-text)',
                                    }}>
                                      {comment.user?.name || 'مستخدم غير معروف'}
                                    </span>
                                    <span style={{
                                      fontSize: 'var(--font-size-xs)',
                                      color: 'var(--color-text-tertiary)',
                                    }}>
                                      {formatDate(comment.createdAt.toString())}
                                    </span>
                                  </div>
                                  <p style={{
                                    fontSize: 'var(--font-size-sm)',
                                    color: 'var(--color-text)',
                                    margin: 0,
                                    lineHeight: 1.3,
                                  }}>
                                    {comment.comment}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* إضافة تعليق جديد */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          flexShrink: 0,
                        }}>
                          <MentionInput
                            value={newComment}
                            onChange={setNewComment}
                            onMentionsChange={setMentions}
                            placeholder="اكتب تعليقاً... استخدم @ للإشارة"
                            onSubmit={handleAddComment}
                          />
                          <button
                            onClick={handleAddComment}
                            disabled={!newComment.trim() || submittingComment}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: (newComment.trim() && !submittingComment) ? 'var(--color-primary)' : 'var(--color-gray-300)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: (newComment.trim() && !submittingComment) ? 'pointer' : 'not-allowed',
                              fontSize: 'var(--font-size-sm)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              alignSelf: 'flex-end',
                            }}
                          >
                            <Send size={14} />
                            {submittingComment ? 'جاري الإرسال...' : 'إرسال'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  textAlign: 'center'
                }}>
                  <Activity size={48} style={{ color: 'var(--color-text-tertiary)', marginBottom: '16px' }} />
                  <h3 style={{
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                    margin: '0 0 8px 0'
                  }}>
                    اختر مهمة لعرض أنشطتها
                  </h3>
                  <p style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-tertiary)',
                    margin: 0
                  }}>
                    انقر على أي مهمة من القائمة لعرض سجل الأنشطة الخاص بها
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        caseId={caseId}
        caseTitle={caseTitle}
        onTaskAdded={() => {
          loadTasks();
          setShowAddTaskModal(false);
        }}
      />
    </>
  );
};

export default CaseTasksModal;
