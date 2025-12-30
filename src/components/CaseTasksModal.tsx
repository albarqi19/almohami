import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  CheckSquare,
  User,
  Calendar,
  Loader2,
  AlertCircle,
  Activity,
  MessageSquare,
  Send,
  Clock,
  Share2,
  Flag,
  Plus,
  Trash2,
  CheckCircle
} from 'lucide-react';
import Modal from './Modal';
import AddTaskModal from './AddTaskModal';
import MentionInput from './MentionInput';
import TaskTimer from './TaskTimer';
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

  // Load tasks when modal opens
  useEffect(() => {
    if (isOpen && caseId) {
      loadTasks();
    }
  }, [isOpen, caseId]);

  // Load comments when task is selected
  useEffect(() => {
    if (selectedTask) {
      loadComments(selectedTask.id);
    }
  }, [selectedTask]);

  const loadTasks = async () => {
    try {
      setLoadingTasks(true);
      setError(null);
      const result = await TaskService.getTasks({ case_id: caseId });
      setTasks(result?.data || []);
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
          maxHeight: '550px'
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
                padding: '16px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <h3 style={{
                  fontSize: 'var(--font-size-md)',
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
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {tasks.map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        style={{
                          padding: '12px',
                          backgroundColor: selectedTask?.id === task.id ? 'var(--color-primary-light)' : 'var(--color-background)',
                          border: selectedTask?.id === task.id ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => setSelectedTask(task)}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px'
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: getTaskStatusColor(task.status),
                            marginTop: '6px',
                            flexShrink: 0
                          }} />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{
                              fontSize: 'var(--font-size-sm)',
                              fontWeight: 'var(--font-weight-medium)',
                              color: 'var(--color-text)',
                              margin: '0 0 4px 0',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {task.title}
                            </h4>

                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '8px',
                              flexWrap: 'wrap'
                            }}>
                              <span style={{
                                fontSize: 'var(--font-size-xs)',
                                backgroundColor: getTaskStatusColor(task.status),
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>
                                {getTaskStatusText(task.status)}
                              </span>

                              <span style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'white',
                                backgroundColor: getPriorityColor(task.priority),
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>
                                {getPriorityText(task.priority)}
                              </span>
                            </div>

                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Calendar size={10} style={{ color: 'var(--color-text-tertiary)' }} />
                              <span style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-tertiary)'
                              }}>
                                {task.dueDate ? formatDate(task.dueDate.toISOString()) : 'بدون موعد'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
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
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    backgroundColor: 'var(--color-background)'
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

                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '16px',
                    overflowY: 'auto'
                  }}>

                    {/* التعليقات */}
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '16px',
                      backgroundColor: 'var(--color-background)',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)'
                    }}>
                      <h4 style={{
                        fontSize: 'var(--font-size-md)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text)',
                        margin: '0 0 12px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <MessageSquare size={16} style={{ color: 'var(--color-primary)' }} />
                        التعليقات ({comments.length})
                      </h4>

                      <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        maxHeight: '200px',
                        marginBottom: '12px'
                      }}>
                        {loadingComments ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px'
                          }}>
                            <Loader2 size={20} style={{
                              animation: 'spin 1s linear infinite',
                              color: 'var(--color-primary)'
                            }} />
                          </div>
                        ) : comments.length === 0 ? (
                          <p style={{
                            color: 'var(--color-text-tertiary)',
                            fontSize: 'var(--font-size-sm)',
                            textAlign: 'center',
                            margin: '20px 0'
                          }}>
                            لا توجد تعليقات على هذه المهمة
                          </p>
                        ) : (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}>
                            {comments.map((comment) => (
                              <div
                                key={comment.id}
                                style={{
                                  padding: '8px',
                                  backgroundColor: 'var(--color-gray-50)',
                                  borderRadius: '6px',
                                  border: '1px solid var(--color-border)'
                                }}
                              >
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  marginBottom: '4px'
                                }}>
                                  <User size={12} style={{ color: 'var(--color-primary)' }} />
                                  <span style={{
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 'var(--font-weight-medium)',
                                    color: 'var(--color-text)'
                                  }}>
                                    {comment.user?.name || 'مستخدم غير معروف'}
                                  </span>
                                  <span style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--color-text-tertiary)'
                                  }}>
                                    {formatDate(comment.createdAt.toString())}
                                  </span>
                                </div>
                                <p style={{
                                  fontSize: 'var(--font-size-sm)',
                                  color: 'var(--color-text)',
                                  margin: 0,
                                  lineHeight: 1.3
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
                        gap: '8px'
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
                            alignSelf: 'flex-end'
                          }}
                        >
                          <Send size={14} />
                          {submittingComment ? 'جاري الإرسال...' : 'إرسال'}
                        </button>
                      </div>
                    </div>
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
