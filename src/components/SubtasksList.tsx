import React, { useState, useEffect, useRef } from 'react';
import { Plus, Check, Trash2, GripVertical, ListChecks, AtSign } from 'lucide-react';
import { SubtaskService, type Subtask, type SubtasksResponse } from '../services/subtaskService';
import { UserService } from '../services/UserService';

interface SubtasksListProps {
  taskId: string;
  onProgressChange?: (progress: number) => void;
}

interface MentionUser {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

const SubtasksList: React.FC<SubtasksListProps> = ({ taskId, onProgressChange }) => {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Mention states
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [assigneeDropdownId, setAssigneeDropdownId] = useState<string | null>(null);
  const mentionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSubtasks();
    loadUsers();
  }, [taskId]);

  // إغلاق القوائم عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mentionRef.current && !mentionRef.current.contains(e.target as Node)) {
        setAssigneeDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUsers = async () => {
    try {
      const response = await UserService.getAllUsers({ limit: 100 });
      const usersData = response.data || [];
      setUsers(usersData.map(u => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        role: u.role
      })));
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadSubtasks = async () => {
    setIsLoading(true);
    try {
      const response = await SubtaskService.getSubtasks(taskId);
      setSubtasks(response.subtasks);
      setProgress(response.progress);
      onProgressChange?.(response.progress);
    } catch (error) {
      console.error('Failed to load subtasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    setIsAdding(true);
    try {
      const newSubtask = await SubtaskService.createSubtask(taskId, {
        title: newSubtaskTitle.trim(),
      });
      setSubtasks([...subtasks, newSubtask]);
      setNewSubtaskTitle('');
      setShowAddForm(false);

      // Recalculate progress
      const newTotal = subtasks.length + 1;
      const newCompleted = subtasks.filter(s => s.is_completed).length;
      const newProgress = Math.round((newCompleted / newTotal) * 100);
      setProgress(newProgress);
      onProgressChange?.(newProgress);
    } catch (error) {
      console.error('Failed to add subtask:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggle = async (subtaskId: string) => {
    try {
      const updated = await SubtaskService.toggleSubtask(subtaskId);
      setSubtasks(subtasks.map(s => s.id === subtaskId ? updated : s));

      // Recalculate progress
      const newSubtasks = subtasks.map(s => s.id === subtaskId ? updated : s);
      const completed = newSubtasks.filter(s => s.is_completed).length;
      const newProgress = newSubtasks.length > 0 ? Math.round((completed / newSubtasks.length) * 100) : 0;
      setProgress(newProgress);
      onProgressChange?.(newProgress);
    } catch (error) {
      console.error('Failed to toggle subtask:', error);
    }
  };

  const handleDelete = async (subtaskId: string) => {
    try {
      await SubtaskService.deleteSubtask(subtaskId);
      const newSubtasks = subtasks.filter(s => s.id !== subtaskId);
      setSubtasks(newSubtasks);

      // Recalculate progress
      const completed = newSubtasks.filter(s => s.is_completed).length;
      const newProgress = newSubtasks.length > 0 ? Math.round((completed / newSubtasks.length) * 100) : 0;
      setProgress(newProgress);
      onProgressChange?.(newProgress);
    } catch (error) {
      console.error('Failed to delete subtask:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSubtask();
    } else if (e.key === 'Escape') {
      setShowAddForm(false);
      setNewSubtaskTitle('');
    }
  };

  // تعيين مسؤول للمهمة الفرعية
  const handleAssignUser = async (subtaskId: string, userId: string, userName: string) => {
    try {
      // تحديث محلي فوري (Optimistic Update)
      setSubtasks(subtasks.map(s =>
        s.id === subtaskId
          ? { ...s, assigned_to: userId, assigned_to_name: userName }
          : s
      ));
      setAssigneeDropdownId(null);

      // إرسال للـ Backend
      await SubtaskService.updateSubtask(subtaskId, { assigned_to: userId });
    } catch (error) {
      console.error('Failed to assign user:', error);
      // إعادة تحميل البيانات عند الفشل
      loadSubtasks();
    }
  };

  // الحصول على الأحرف الأولى من الاسم
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2);
  };

  // ترجمة الدور
  const getRoleLabel = (role?: string) => {
    const roles: Record<string, string> = {
      admin: 'مدير',
      lawyer: 'محامي',
      secretary: 'سكرتير',
      accountant: 'محاسب',
      client: 'عميل'
    };
    return role ? roles[role] || role : '';
  };

  const completedCount = subtasks.filter(s => s.is_completed).length;

  return (
    <div className="subtasks-list">
      {/* Header */}
      <div className="subtasks-list__header">
        <div className="subtasks-list__title">
          <ListChecks size={16} />
          <span>المهام الفرعية</span>
          {subtasks.length > 0 && (
            <span className="subtasks-list__count">
              {completedCount}/{subtasks.length}
            </span>
          )}
        </div>

        {subtasks.length > 0 && (
          <div className="subtasks-list__progress">
            <div
              className="subtasks-list__progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Subtasks */}
      {isLoading ? (
        <div className="subtasks-list__loading">جاري التحميل...</div>
      ) : (
        <div className="subtasks-list__items">
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className={`subtasks-list__item ${subtask.is_completed ? 'subtasks-list__item--completed' : ''}`}
            >
              <button
                className="subtasks-list__drag"
                title="اسحب لإعادة الترتيب"
              >
                <GripVertical size={14} />
              </button>

              <button
                className={`subtasks-list__checkbox ${subtask.is_completed ? 'subtasks-list__checkbox--checked' : ''}`}
                onClick={() => handleToggle(subtask.id)}
              >
                {subtask.is_completed && <Check size={12} />}
              </button>

              <span className={`subtasks-list__text ${subtask.is_completed ? 'subtasks-list__text--completed' : ''}`}>
                {subtask.title}
              </span>

              {/* زر تعيين المسؤول */}
              <div className="subtasks-list__assignee-container" ref={mentionRef}>
                <button
                  className={`subtasks-list__assignee-btn ${(subtask as any).assigned_to ? 'subtasks-list__assignee-btn--assigned' : ''}`}
                  onClick={() => setAssigneeDropdownId(assigneeDropdownId === subtask.id ? null : subtask.id)}
                  title={(subtask as any).assigned_to_name || 'تعيين مسؤول'}
                >
                  {(subtask as any).assigned_to_name ? (
                    <span className="subtasks-list__assignee-avatar">
                      {getInitials((subtask as any).assigned_to_name)}
                    </span>
                  ) : (
                    <AtSign size={14} />
                  )}
                </button>

                {assigneeDropdownId === subtask.id && (
                  <div className="subtasks-list__mention-dropdown">
                    <div className="subtasks-list__mention-header">تعيين مسؤول</div>
                    {users.map(user => (
                      <button
                        key={user.id}
                        className="subtasks-list__mention-item"
                        onClick={() => handleAssignUser(subtask.id, user.id, user.name)}
                      >
                        <span className="subtasks-list__mention-avatar">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} />
                          ) : (
                            getInitials(user.name)
                          )}
                        </span>
                        <span className="subtasks-list__mention-info">
                          <span className="subtasks-list__mention-name">{user.name}</span>
                          {user.role && (
                            <span className="subtasks-list__mention-role">{getRoleLabel(user.role)}</span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="subtasks-list__delete"
                onClick={() => handleDelete(subtask.id)}
                title="حذف"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {/* Add Form */}
          {showAddForm ? (
            <div className="subtasks-list__add-form">
              <input
                type="text"
                className="subtasks-list__input"
                placeholder="عنوان المهمة الفرعية..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={handleKeyPress}
                autoFocus
              />
              <div className="subtasks-list__add-actions">
                <button
                  className="button button--primary button--sm"
                  onClick={handleAddSubtask}
                  disabled={isAdding || !newSubtaskTitle.trim()}
                >
                  {isAdding ? 'جاري الإضافة...' : 'إضافة'}
                </button>
                <button
                  className="button button--ghost button--sm"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewSubtaskTitle('');
                  }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <button
              className="subtasks-list__add-btn"
              onClick={() => setShowAddForm(true)}
            >
              <Plus size={16} />
              إضافة مهمة فرعية
            </button>
          )}
        </div>
      )}

      <style>{`
        .subtasks-list {
          background: var(--color-surface, #fff);
          border: 1px solid var(--color-border, #e5e5e5);
          border-radius: var(--radius-md, 8px);
          padding: var(--space-4, 16px);
        }

        .subtasks-list__header {
          margin-bottom: var(--space-3, 12px);
        }

        .subtasks-list__title {
          display: flex;
          align-items: center;
          gap: var(--space-2, 8px);
          font-size: var(--font-size-sm, 14px);
          font-weight: var(--font-weight-semibold, 600);
          color: var(--color-heading, #1a1a1a);
          margin-bottom: var(--space-2, 8px);
        }

        .subtasks-list__count {
          font-size: var(--font-size-xs, 12px);
          color: var(--color-text-secondary, #666);
          font-weight: var(--font-weight-regular, 400);
        }

        .subtasks-list__progress {
          height: 4px;
          background: var(--color-border, #e5e5e5);
          border-radius: var(--radius-pill, 999px);
          overflow: hidden;
        }

        .subtasks-list__progress-bar {
          height: 100%;
          background: var(--color-success, #1B998B);
          border-radius: var(--radius-pill, 999px);
          transition: width var(--transition-base, 200ms ease);
        }

        .subtasks-list__loading {
          text-align: center;
          color: var(--color-text-secondary, #666);
          font-size: var(--font-size-sm, 13px);
          padding: var(--space-4, 16px);
        }

        .subtasks-list__items {
          display: flex;
          flex-direction: column;
          gap: var(--space-2, 8px);
        }

        .subtasks-list__item {
          display: flex;
          align-items: center;
          gap: var(--space-2, 8px);
          padding: var(--space-2, 8px);
          border-radius: var(--radius-sm, 6px);
          background: var(--color-surface-subtle, #f8f9fa);
          transition: all var(--transition-fast, 120ms ease);
        }

        .subtasks-list__item:hover {
          background: var(--color-surface, #fff);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .subtasks-list__item--completed {
          opacity: 0.7;
        }

        .subtasks-list__drag {
          background: none;
          border: none;
          color: var(--color-text-secondary, #999);
          cursor: grab;
          padding: 2px;
          opacity: 0;
          transition: opacity var(--transition-fast, 120ms ease);
        }

        .subtasks-list__item:hover .subtasks-list__drag {
          opacity: 1;
        }

        .subtasks-list__checkbox {
          width: 18px;
          height: 18px;
          border-radius: var(--radius-sm, 4px);
          border: 2px solid var(--color-border, #d1d5db);
          background: var(--color-surface, #fff);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast, 120ms ease);
          flex-shrink: 0;
        }

        .subtasks-list__checkbox:hover {
          border-color: var(--color-primary, #0A192F);
        }

        .subtasks-list__checkbox--checked {
          background: var(--color-success, #1B998B);
          border-color: var(--color-success, #1B998B);
          color: white;
        }

        .subtasks-list__text {
          flex: 1;
          font-size: var(--font-size-sm, 14px);
          color: var(--color-text, #1a1a1a);
        }

        .subtasks-list__text--completed {
          text-decoration: line-through;
          color: var(--color-text-secondary, #666);
        }

        .subtasks-list__delete {
          background: none;
          border: none;
          color: var(--color-text-secondary, #999);
          cursor: pointer;
          padding: 4px;
          opacity: 0;
          transition: all var(--transition-fast, 120ms ease);
          border-radius: var(--radius-sm, 4px);
        }

        .subtasks-list__item:hover .subtasks-list__delete {
          opacity: 1;
        }

        .subtasks-list__delete:hover {
          color: var(--color-error, #D1495B);
          background: var(--color-error-soft, rgba(209, 73, 91, 0.1));
        }

        /* Assignee Button & Dropdown */
        .subtasks-list__assignee-container {
          position: relative;
        }

        .subtasks-list__assignee-btn {
          background: none;
          border: 1px dashed var(--color-border, #d1d5db);
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-secondary, #999);
          transition: all var(--transition-fast, 120ms ease);
          opacity: 0;
        }

        .subtasks-list__item:hover .subtasks-list__assignee-btn {
          opacity: 1;
        }

        .subtasks-list__assignee-btn--assigned {
          opacity: 1;
          border-style: solid;
          border-color: var(--color-primary, #0A192F);
        }

        .subtasks-list__assignee-btn:hover {
          border-color: var(--color-primary, #0A192F);
          color: var(--color-primary, #0A192F);
        }

        .subtasks-list__assignee-avatar {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--color-primary, #0A192F);
          color: white;
          font-size: 9px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .subtasks-list__mention-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 4px;
          min-width: 200px;
          background: var(--color-surface, #fff);
          border: 1px solid var(--color-border, #e5e5e5);
          border-radius: var(--radius-md, 8px);
          box-shadow: var(--shadow-lg, 0 8px 30px rgba(0, 0, 0, 0.12));
          z-index: 100;
          overflow: hidden;
        }

        .subtasks-list__mention-header {
          padding: var(--space-2, 8px) var(--space-3, 12px);
          font-size: var(--font-size-xs, 11px);
          font-weight: 600;
          color: var(--color-text-secondary, #666);
          background: var(--color-surface-subtle, #f8f9fa);
          border-bottom: 1px solid var(--color-border, #e5e5e5);
        }

        .subtasks-list__mention-item {
          display: flex;
          align-items: center;
          gap: var(--space-2, 8px);
          width: 100%;
          padding: var(--space-2, 8px) var(--space-3, 12px);
          background: none;
          border: none;
          cursor: pointer;
          transition: background var(--transition-fast, 120ms ease);
          text-align: right;
        }

        .subtasks-list__mention-item:hover {
          background: var(--color-primary-soft, rgba(10, 25, 47, 0.08));
        }

        .subtasks-list__mention-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--color-primary, #0A192F);
          color: white;
          font-size: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }

        .subtasks-list__mention-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .subtasks-list__mention-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .subtasks-list__mention-name {
          font-size: var(--font-size-sm, 13px);
          font-weight: 500;
          color: var(--color-text, #1a1a1a);
        }

        .subtasks-list__mention-role {
          font-size: var(--font-size-xs, 11px);
          color: var(--color-text-secondary, #666);
        }

        .subtasks-list__add-btn {
          display: flex;
          align-items: center;
          gap: var(--space-2, 8px);
          width: 100%;
          padding: var(--space-2, 8px);
          background: none;
          border: 1px dashed var(--color-border, #d1d5db);
          border-radius: var(--radius-sm, 6px);
          color: var(--color-text-secondary, #666);
          font-size: var(--font-size-sm, 13px);
          cursor: pointer;
          transition: all var(--transition-fast, 120ms ease);
        }

        .subtasks-list__add-btn:hover {
          border-color: var(--color-primary, #0A192F);
          color: var(--color-primary, #0A192F);
          background: var(--color-primary-soft, rgba(10, 25, 47, 0.05));
        }

        .subtasks-list__add-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-2, 8px);
          padding: var(--space-2, 8px);
          background: var(--color-surface-subtle, #f8f9fa);
          border-radius: var(--radius-sm, 6px);
        }

        .subtasks-list__input {
          width: 100%;
          padding: var(--space-2, 8px) var(--space-3, 12px);
          border: 1px solid var(--color-border, #e5e5e5);
          border-radius: var(--radius-sm, 6px);
          font-size: var(--font-size-sm, 14px);
          background: var(--color-surface, #fff);
          color: var(--color-text, #1a1a1a);
          transition: border-color var(--transition-fast, 120ms ease);
        }

        .subtasks-list__input:focus {
          outline: none;
          border-color: var(--color-primary, #0A192F);
        }

        .subtasks-list__add-actions {
          display: flex;
          gap: var(--space-2, 8px);
          justify-content: flex-end;
        }

        .button--sm {
          padding: var(--space-1, 4px) var(--space-3, 12px);
          font-size: var(--font-size-xs, 12px);
        }

        /* Dark Theme */
        body.dark .subtasks-list {
          background: var(--color-surface);
          border-color: var(--color-border);
        }

        body.dark .subtasks-list__item {
          background: var(--color-surface-subtle);
        }

        body.dark .subtasks-list__item:hover {
          background: var(--color-surface);
        }

        body.dark .subtasks-list__checkbox {
          background: var(--color-surface);
          border-color: var(--color-border);
        }

        body.dark .subtasks-list__input {
          background: var(--color-surface);
          border-color: var(--color-border);
        }

        /* Classic Theme */
        body.classic .subtasks-list__checkbox--checked {
          background: var(--color-success);
          border-color: var(--color-success);
        }

        body.classic .subtasks-list__progress-bar {
          background: var(--color-success);
        }
      `}</style>
    </div>
  );
};

export default SubtasksList;
