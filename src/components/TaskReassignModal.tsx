import React, { useState } from 'react';
import Modal from './Modal';
import { Save, X, User, MessageSquare, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Task } from '../types';

interface ReassignData {
  newAssignee: string;
  reason: string;
  priority: string;
  dueDate: string;
  transferNotes: string;
  notifyAssignee: boolean;
}

interface TaskReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReassign: (taskId: string, reassignData: ReassignData) => void;
  task: Task | null;
}

const TaskReassignModal: React.FC<TaskReassignModalProps> = ({ 
  isOpen, 
  onClose, 
  onReassign, 
  task 
}) => {
  const [formData, setFormData] = useState<ReassignData>({
    newAssignee: '',
    reason: '',
    priority: task?.priority || 'medium',
    dueDate: task?.dueDate ? String(task.dueDate).split('T')[0] : '',
    transferNotes: '',
    notifyAssignee: true
  });

  const [errors, setErrors] = useState<Partial<ReassignData>>({});

  const lawyers = [
    { id: 'lawyer-1', name: 'أحمد محامي', workload: 'متوسط', specialization: 'قضايا مدنية' },
    { id: 'lawyer-2', name: 'سارة محامية', workload: 'منخفض', specialization: 'قضايا تجارية' },
    { id: 'lawyer-3', name: 'محمد محامي', workload: 'عالي', specialization: 'قضايا جنائية' },
    { id: 'lawyer-4', name: 'خالد محامية', workload: 'متوسط', specialization: 'قضايا عمالية' },
    { id: 'lawyer-5', name: 'عبدالله محامي', workload: 'منخفض', specialization: 'قضايا عقارية' }
  ];

  const reasons = [
    'إعادة توزيع العبء',
    'تخصص قانوني مناسب',
    'توفر في الجدول الزمني',
    'خبرة أكبر مطلوبة',
    'تعارض في الجدول',
    'إجازة أو غياب',
    'أولوية أخرى عاجلة',
    'طلب العميل',
    'أخرى'
  ];

  const priorityOptions = [
    { value: 'low', label: 'منخفضة', color: '#22c55e' },
    { value: 'medium', label: 'متوسطة', color: '#f59e0b' },
    { value: 'high', label: 'عالية', color: '#ef4444' },
    { value: 'urgent', label: 'عاجلة', color: '#dc2626' }
  ];

  const workloadColors = {
    'منخفض': '#22c55e',
    'متوسط': '#f59e0b',
    'عالي': '#ef4444'
  };

  React.useEffect(() => {
    if (task) {
      setFormData({
        newAssignee: '',
        reason: '',
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : '',
        transferNotes: '',
        notifyAssignee: true
      });
    }
  }, [task]);

  const handleInputChange = (field: keyof ReassignData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ReassignData> = {};

    if (!formData.newAssignee) newErrors.newAssignee = 'يجب اختيار المحامي الجديد';
    if (!formData.reason.trim()) newErrors.reason = 'يجب تحديد سبب إعادة الإسناد';
    if (!formData.dueDate) newErrors.dueDate = 'يجب تحديد التاريخ المطلوب';

    // Check if assignee is different from current
    if (formData.newAssignee === task?.assignedTo) {
      newErrors.newAssignee = 'لا يمكن إعادة إسناد المهمة لنفس المحامي';
    }

    // Check if due date is not in the past
    if (formData.dueDate) {
      const dueDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        newErrors.dueDate = 'التاريخ المطلوب لا يمكن أن يكون في الماضي';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm() && task) {
      onReassign(task.id, formData);
      handleReset();
      onClose();
    }
  };

  const handleReset = () => {
    setFormData({
      newAssignee: '',
      reason: '',
      priority: task?.priority || 'medium',
      dueDate: task?.dueDate ? task.dueDate.toISOString().split('T')[0] : '',
      transferNotes: '',
      notifyAssignee: true
    });
    setErrors({});
  };

  const getCurrentAssigneeName = () => {
    const currentLawyer = lawyers.find(l => l.id === task?.assignedTo);
    return currentLawyer?.name || 'غير محدد';
  };

  if (!task) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إعادة إسناد المهمة" size="lg">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Task Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '16px',
              backgroundColor: 'var(--color-background)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)'
            }}
          >
            <h3 style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text)',
              margin: '0 0 8px 0'
            }}>
              {task.title}
            </h3>
            <p style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              margin: '0 0 12px 0'
            }}>
              {task.description}
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)'
            }}>
              <span>المسؤول الحالي: <strong>{getCurrentAssigneeName()}</strong></span>
              <span>تاريخ الاستحقاق: <strong>{task.dueDate?.toLocaleDateString('ar-SA') || 'غير محدد'}</strong></span>
            </div>
          </motion.div>

          {/* New Assignee Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              padding: '20px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '12px',
              border: '1px solid var(--color-border)'
            }}
          >
            <h3 style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '4px',
                height: '20px',
                backgroundColor: 'var(--color-primary)',
                borderRadius: '2px'
              }} />
              المحامي الجديد
            </h3>

            <div>
              <label style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <User size={16} />
                اختيار المحامي <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lawyers.map((lawyer) => (
                  <motion.div
                    key={lawyer.id}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => handleInputChange('newAssignee', lawyer.id)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: `2px solid ${formData.newAssignee === lawyer.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      backgroundColor: formData.newAssignee === lawyer.id ? 'var(--color-primary)10' : 'var(--color-background)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: lawyer.id === task.assignedTo ? 0.5 : 1,
                      pointerEvents: lawyer.id === task.assignedTo ? 'none' : 'auto'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{
                          fontSize: 'var(--font-size-sm)',
                          fontWeight: 'var(--font-weight-medium)',
                          color: 'var(--color-text)',
                          marginBottom: '4px'
                        }}>
                          {lawyer.name}
                          {lawyer.id === task.assignedTo && ' (المسؤول الحالي)'}
                        </div>
                        <div style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-text-secondary)'
                        }}>
                          {lawyer.specialization}
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{
                          fontSize: 'var(--font-size-xs)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: workloadColors[lawyer.workload as keyof typeof workloadColors] + '20',
                          color: workloadColors[lawyer.workload as keyof typeof workloadColors],
                          fontWeight: 'var(--font-weight-medium)'
                        }}>
                          عبء عمل: {lawyer.workload}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {errors.newAssignee && (
                <span style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-error)',
                  marginTop: '8px',
                  display: 'block'
                }}>
                  {errors.newAssignee}
                </span>
              )}
            </div>
          </motion.div>

          {/* Reassignment Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              padding: '20px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '12px',
              border: '1px solid var(--color-border)'
            }}
          >
            <h3 style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '4px',
                height: '20px',
                backgroundColor: 'var(--color-primary)',
                borderRadius: '2px'
              }} />
              تفاصيل إعادة الإسناد
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px'
            }}>
              {/* Reason */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <MessageSquare size={16} />
                  سبب إعادة الإسناد <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <select
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.reason ? 'var(--color-error)' : 'var(--color-border)'}`,
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: 'var(--font-size-sm)',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors.reason ? 'var(--color-error)' : 'var(--color-border)';
                  }}
                >
                  <option value="">اختر السبب</option>
                  {reasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
                {errors.reason && (
                  <span style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-error)',
                    marginTop: '4px',
                    display: 'block'
                  }}>
                    {errors.reason}
                  </span>
                )}
              </div>

              {/* Priority */}
              <div>
                <label style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  تحديث الأولوية
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: 'var(--font-size-sm)',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }}
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Clock size={16} />
                  تحديث التاريخ المطلوب <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.dueDate ? 'var(--color-error)' : 'var(--color-border)'}`,
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: 'var(--font-size-sm)',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors.dueDate ? 'var(--color-error)' : 'var(--color-border)';
                  }}
                />
                {errors.dueDate && (
                  <span style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-error)',
                    marginTop: '4px',
                    display: 'block'
                  }}>
                    {errors.dueDate}
                  </span>
                )}
              </div>
            </div>

            {/* Transfer Notes */}
            <div style={{ marginTop: '16px' }}>
              <label style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text)',
                marginBottom: '8px',
                display: 'block'
              }}>
                ملاحظات للمحامي الجديد
              </label>
              <textarea
                value={formData.transferNotes}
                onChange={(e) => handleInputChange('transferNotes', e.target.value)}
                rows={3}
                placeholder="ملاحظات مهمة أو توجيهات للمحامي الجديد..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                  fontSize: 'var(--font-size-sm)',
                  transition: 'border-color 0.2s ease',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '80px'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }}
              />
            </div>

            {/* Notify Option */}
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: 'var(--color-background)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text)'
              }}>
                <input
                  type="checkbox"
                  checked={formData.notifyAssignee}
                  onChange={(e) => handleInputChange('notifyAssignee', e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: 'var(--color-primary)'
                  }}
                />
                إرسال إشعار للمحامي الجديد بالمهمة المُسندة
              </label>
            </div>
          </motion.div>

          {/* Form Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '20px',
              borderTop: '1px solid var(--color-border)'
            }}
          >
            <button
              type="button"
              onClick={() => {
                handleReset();
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-secondary)';
                e.currentTarget.style.color = 'var(--color-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              <X size={16} />
              إلغاء
            </button>

            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary)';
              }}
            >
              <Save size={16} />
              إعادة إسناد المهمة
            </button>
          </motion.div>
        </div>
      </form>
    </Modal>
  );
};

export default TaskReassignModal;
