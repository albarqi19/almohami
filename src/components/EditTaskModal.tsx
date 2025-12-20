import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, AlertCircle } from 'lucide-react';
import { UserService, type User } from '../services/UserService';
import { TaskService } from '../services/taskService';
import type { Task } from '../types';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onTaskUpdated: () => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onTaskUpdated
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'other',
    priority: 'medium',
    due_date: '',
    estimated_hours: '',
    actual_hours: '',
    assigned_to: '',
    status: 'todo'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lawyers, setLawyers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // تحديث البيانات عند فتح النافذة أو تغيير المهمة
  useEffect(() => {
    if (isOpen && task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        type: task.type || 'other',
        priority: task.priority || 'medium',
        due_date: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        estimated_hours: task.estimatedHours?.toString() || '',
        actual_hours: task.actualHours?.toString() || '',
        assigned_to: task.assignedTo || '',
        status: task.status || 'todo'
      });
      fetchData();
    }
  }, [isOpen, task]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const lawyersData = await UserService.getLawyers();
      setLawyers(lawyersData);
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
      setError('فشل في جلب البيانات المطلوبة');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    try {
      setLoading(true);
      setError(null);

      const updateData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority as any,
        due_date: formData.due_date,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
        actual_hours: formData.actual_hours ? parseFloat(formData.actual_hours) : undefined,
        assigned_to: formData.assigned_to,
        status: formData.status as any
      };

      await TaskService.updateTask(task.id, updateData);
      onTaskUpdated();
      onClose();
    } catch (error: any) {
      console.error('خطأ في تحديث المهمة:', error);
      setError(error.message || 'فشل في تحديث المهمة');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen || !task) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 24px 0 24px',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text)',
              margin: 0
            }}>
              تعديل المهمة
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px',
                borderRadius: '8px',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '0 24px 24px 24px' }}>
            {error && (
              <div style={{
                backgroundColor: 'var(--color-error-light)',
                color: 'var(--color-error)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {loadingData ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '40px'
              }}>
                <div>جاري تحميل البيانات...</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* عنوان المهمة */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text)',
                    marginBottom: '6px'
                  }}>
                    عنوان المهمة *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text)',
                      backgroundColor: 'var(--color-background)',
                      border: '2px solid var(--color-border)',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                    placeholder="أدخل عنوان المهمة"
                  />
                </div>

                {/* وصف المهمة */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text)',
                    marginBottom: '6px'
                  }}>
                    وصف المهمة
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text)',
                      backgroundColor: 'var(--color-background)',
                      border: '2px solid var(--color-border)',
                      borderRadius: '8px',
                      outline: 'none',
                      resize: 'vertical',
                      minHeight: '80px'
                    }}
                    placeholder="أدخل وصف المهمة"
                  />
                </div>

                {/* النوع والأولوية */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text)',
                      marginBottom: '6px'
                    }}>
                      نوع المهمة *
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text)',
                        backgroundColor: 'var(--color-background)',
                        border: '2px solid var(--color-border)',
                        borderRadius: '8px',
                        outline: 'none'
                      }}
                    >
                      <option value="other">أخرى</option>
                      <option value="review">مراجعة</option>
                      <option value="research">بحث قانوني</option>
                      <option value="consultation">استشارة</option>
                      <option value="court">جلسة محكمة</option>
                      <option value="document">إعداد وثائق</option>
                      <option value="meeting">اجتماع</option>
                    </select>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text)',
                      marginBottom: '6px'
                    }}>
                      الأولوية *
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text)',
                        backgroundColor: 'var(--color-background)',
                        border: '2px solid var(--color-border)',
                        borderRadius: '8px',
                        outline: 'none'
                      }}
                    >
                      <option value="low">منخفضة</option>
                      <option value="medium">متوسطة</option>
                      <option value="high">عالية</option>
                      <option value="urgent">عاجلة</option>
                    </select>
                  </div>
                </div>

                {/* الحالة والمحامي المسؤول */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text)',
                      marginBottom: '6px'
                    }}>
                      الحالة *
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text)',
                        backgroundColor: 'var(--color-background)',
                        border: '2px solid var(--color-border)',
                        borderRadius: '8px',
                        outline: 'none'
                      }}
                    >
                      <option value="todo">قيد الانتظار</option>
                      <option value="in_progress">قيد التنفيذ</option>
                      <option value="review">قيد المراجعة</option>
                      <option value="completed">مكتملة</option>
                      <option value="cancelled">ملغية</option>
                    </select>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text)',
                      marginBottom: '6px'
                    }}>
                      المحامي المسؤول *
                    </label>
                    <select
                      name="assigned_to"
                      value={formData.assigned_to}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text)',
                        backgroundColor: 'var(--color-background)',
                        border: '2px solid var(--color-border)',
                        borderRadius: '8px',
                        outline: 'none'
                      }}
                    >
                      <option value="">اختر المحامي</option>
                      {lawyers.map(lawyer => (
                        <option key={lawyer.id} value={lawyer.id}>
                          {lawyer.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* تاريخ الاستحقاق */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text)',
                    marginBottom: '6px'
                  }}>
                    تاريخ الاستحقاق
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text)',
                      backgroundColor: 'var(--color-background)',
                      border: '2px solid var(--color-border)',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* الساعات */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text)',
                      marginBottom: '6px'
                    }}>
                      الساعات المقدرة
                    </label>
                    <input
                      type="number"
                      name="estimated_hours"
                      value={formData.estimated_hours}
                      onChange={handleInputChange}
                      min="0"
                      step="0.5"
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text)',
                        backgroundColor: 'var(--color-background)',
                        border: '2px solid var(--color-border)',
                        borderRadius: '8px',
                        outline: 'none'
                      }}
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text)',
                      marginBottom: '6px'
                    }}>
                      الساعات الفعلية
                    </label>
                    <input
                      type="number"
                      name="actual_hours"
                      value={formData.actual_hours}
                      onChange={handleInputChange}
                      min="0"
                      step="0.5"
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text)',
                        backgroundColor: 'var(--color-background)',
                        border: '2px solid var(--color-border)',
                        borderRadius: '8px',
                        outline: 'none'
                      }}
                      placeholder="0.0"
                    />
                  </div>
                </div>

                {/* أزرار التحكم */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                  marginTop: '24px'
                }}>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    style={{
                      padding: '12px 24px',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-secondary)',
                      backgroundColor: 'var(--color-background)',
                      border: '2px solid var(--color-border)',
                      borderRadius: '8px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    إلغاء
                  </button>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={!loading ? { scale: 1.02 } : {}}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                    style={{
                      padding: '12px 24px',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: '#fff',
                      backgroundColor: 'var(--color-primary)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Save size={16} />
                    {loading ? 'جاري التحديث...' : 'حفظ التغييرات'}
                  </motion.button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EditTaskModal;
