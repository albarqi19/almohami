import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle2,
  Plus,
  Edit,
  Calendar
} from 'lucide-react';
import type { Task, Priority } from '../types';

interface CaseTasksProps {
  caseId: string;
  tasks: Task[];
  onAddTask: (caseId: string) => void;
  onEditTask: (task: Task) => void;
}

const CaseTasks: React.FC<CaseTasksProps> = ({ 
  caseId, 
  tasks, 
  onAddTask, 
  onEditTask 
}) => {
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  const getPriorityColor = (priority: Priority): string => {
    switch (priority) {
      case 'urgent': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#ca8a04';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  };

  const getPriorityText = (priority: Priority): string => {
    switch (priority) {
      case 'urgent': return 'عاجل';
      case 'high': return 'عالية';
      case 'medium': return 'متوسطة';
      case 'low': return 'منخفضة';
      default: return 'غير محدد';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={16} style={{ color: '#10b981' }} />;
      case 'in_progress':
      case 'todo':
        return <Clock size={16} style={{ color: '#f59e0b' }} />;
      default:
        return <AlertCircle size={16} style={{ color: '#6b7280' }} />;
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'todo': return 'قيد الانتظار';
      case 'in_progress': return 'قيد التنفيذ';
      case 'review': return 'قيد المراجعة';
      case 'completed': return 'مكتملة';
      case 'cancelled': return 'ملغية';
      case 'overdue': return 'متأخرة';
      default: return 'غير محدد';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'in_progress') return task.status === 'in_progress' || task.status === 'todo';
    if (filter === 'completed') return task.status === 'completed';
    return true;
  });

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      borderRadius: 'var(--border-radius-lg)',
      padding: 'var(--spacing-lg)',
      border: '1px solid var(--color-border)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--spacing-md)'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text)'
        }}>
          المهام المرتبطة ({tasks.length})
        </h3>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onAddTask(caseId)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-xs)',
            padding: '8px 16px',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--border-radius-md)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
            cursor: 'pointer'
          }}
        >
          <Plus size={16} />
          إضافة مهمة
        </motion.button>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: 'var(--spacing-xs)',
        marginBottom: 'var(--spacing-md)',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: 'var(--spacing-sm)'
      }}>
        {[
          { key: 'all', label: 'الكل' },
          { key: 'in_progress', label: 'قيد التنفيذ' },
          { key: 'completed', label: 'مكتملة' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            style={{
              padding: '6px 12px',
              backgroundColor: filter === tab.key ? 'var(--color-primary)' : 'transparent',
              color: filter === tab.key ? 'white' : 'var(--color-text-secondary)',
              border: '1px solid',
              borderColor: filter === tab.key ? 'var(--color-primary)' : 'var(--color-border)',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 'var(--spacing-xl)',
          color: 'var(--color-text-secondary)'
        }}>
          <Clock size={48} style={{ opacity: 0.3, marginBottom: 'var(--spacing-md)' }} />
          <p style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>
            {filter === 'all' ? 'لا توجد مهام مرتبطة بهذه القضية' : 
             filter === 'in_progress' ? 'لا توجد مهام قيد التنفيذ' : 
             'لا توجد مهام مكتملة'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {filteredTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--color-background)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
              whileHover={{
                backgroundColor: 'var(--color-surface-hover)',
                borderColor: 'var(--color-border-hover)'
              }}
              onClick={() => onEditTask(task)}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 'var(--spacing-xs)'
              }}>
                <h4 style={{
                  margin: 0,
                  fontSize: 'var(--font-size-md)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  flex: 1
                }}>
                  {task.title}
                </h4>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)'
                }}>
                  {getStatusIcon(task.status)}
                  <Edit size={14} style={{ 
                    color: 'var(--color-text-secondary)',
                    opacity: 0.7
                  }} />
                </div>
              </div>

              {task.description && (
                <p style={{
                  margin: '0 0 var(--spacing-sm) 0',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.4
                }}>
                  {task.description}
                </p>
              )}

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--spacing-sm)',
                alignItems: 'center'
              }}>
                {/* Priority Badge */}
                <span style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: getPriorityColor(task.priority),
                  backgroundColor: `${getPriorityColor(task.priority)}20`,
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {getPriorityText(task.priority)}
                </span>

                {/* Status Badge */}
                <span style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: task.status === 'completed' ? '#10b981' : 
                         (task.status === 'in_progress' || task.status === 'todo') ? '#f59e0b' : '#6b7280',
                  backgroundColor: task.status === 'completed' ? '#10b98120' : 
                                 (task.status === 'in_progress' || task.status === 'todo') ? '#f59e0b20' : '#6b728020',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {getStatusText(task.status)}
                </span>

                {/* Assignee */}
                {task.assignedTo && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    <User size={12} />
                    {task.assignedTo}
                  </div>
                )}

                {/* Due Date */}
                {task.dueDate && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: 'var(--font-size-xs)',
                    color: new Date(task.dueDate) < new Date() ? '#dc2626' : 'var(--color-text-secondary)'
                  }}>
                    <Calendar size={12} />
                    {new Date(task.dueDate).toLocaleDateString('ar-SA')}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CaseTasks;
