import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Calendar,
  Clock,
  CheckCircle,
  List,
  LayoutGrid,
  MoreHorizontal,
  Flag,
  ChevronDown,
  User,
  Layers,
  Archive,
  Trash2,
  Pencil
} from 'lucide-react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  type DragStartEvent,
  type DragEndEvent,
  type DropAnimation
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { Task, TaskStatus, Priority } from '../types';
import { TaskService } from '../services/taskService';
import { UserService } from '../services/UserService';
import AddTaskModal from '../components/AddTaskModal';
import EditTaskModal from '../components/EditTaskModal';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { TasksCache, UsersCache } from '../utils/tasksCache';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

// --- Constants & Types ---
const TASK_STATUSES: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'todo', label: 'لم تبدأ', color: '#64748b' },
  { key: 'in_progress', label: 'قيد التنفيذ', color: '#3b82f6' },
  { key: 'review', label: 'مراجعة', color: '#f59e0b' },
  { key: 'completed', label: 'مكتملة', color: '#10b981' },
  { key: 'cancelled', label: 'ملغية', color: '#ef4444' }
];

type GroupBy = 'status' | 'assignee';

// --- Draggable Card Component ---
const SortableTaskCard = ({ task, user, onClick }: { task: Task, user?: { name: string }, onClick: () => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id, data: { ...task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityIcon = (priority: Priority) => {
    const color = priority === 'high' ? '#ef4444' : priority === 'medium' ? '#f59e0b' : '#3b82f6';
    return <Flag size={14} color={color} fill={color} />;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="task-card"
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>

        <div style={{ transform: 'scale(0.8)' }}>{getPriorityIcon(task.priority)}</div>
      </div>

      <div className="task-card-title">{task.title}</div>

      <div className="task-card-footer">
        <div className="task-card-meta">
          {task.dueDate && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} />
              {new Date(task.dueDate).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        {user && (
          <div className="assignee-avatar" title={user.name}>
            {user.name.charAt(0)}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Droppable Column Component ---
const DroppableColumn = ({ id, title, count, color, children }: { id: string, title: string, count: number, color: string, children: React.ReactNode }) => {
  const { setNodeRef } = useSortable({ id });

  return (
    <div ref={setNodeRef} className="board-column">
      <div className="board-column-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', background: color }}></span>
          {title}
        </div>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          {count}
        </span>
      </div>
      <div className="board-column-content">
        {children}
      </div>
    </div>
  );
};


// --- Main Page Component ---
const Tasks: React.FC = () => {
  const navigate = useNavigate();

  // استخدام الكاش المركزي
  const [tasks, setTasks] = useState<Task[]>(() => TasksCache.get());
  const [loading, setLoading] = useState(() => TasksCache.get().length === 0);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [groupBy, setGroupBy] = useState<GroupBy>('status');
  const [users, setUsers] = useState<{ [key: string]: { name: string; avatar?: string | null } }>(() => UsersCache.get());

  // Drag & Drop Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [activeDragItem, setActiveDragItem] = useState<Task | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // قائمة الإجراءات (زر النقاط الثلاثة)
  const [menu, setMenu] = useState<{ task: Task; top: number; left: number; openUp: boolean } | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // تحميل البيانات دائماً عند فتح الصفحة لضمان التحديث
    loadTasks();
    loadUsers();
  }, []);

  const loadTasks = async () => {
    try {
      if (tasks.length === 0) setLoading(true);
      const response = await TaskService.getTasks({});
      const tasksData = response.data || [];
      setTasks(tasksData);
      // حفظ في الكاش المركزي
      TasksCache.set(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // تحديث تلقائي عند العودة للصفحة وكل دقيقتين
  useAutoRefresh({
    onRefresh: loadTasks,
    refetchOnFocus: true,
    pollingInterval: 120, // كل 2 دقيقة
  });

  const loadUsers = async () => {
    try {
      const usersData = await UserService.getLawyers();
      const usersMap: { [key: string]: { name: string; avatar?: string | null } } = {};
      usersData.forEach(user => {
        usersMap[user.id] = { name: user.name };
      });
      setUsers(usersMap);
      // حفظ في الكاش المركزي
      UsersCache.set(usersMap);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveDragItem(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Find if we dropped over a column (status) or another task
    // Simplified: We assume columns map to statuses

    let newStatus: TaskStatus | null = null;

    // Check if dropped directly on a status column
    if (TASK_STATUSES.some(s => s.key === overId)) {
      newStatus = overId as TaskStatus;
    } else {
      // Check if dropped on a task, find that task's status
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    if (newStatus) {
      // Optimistic Update
      const updatedTasks = tasks.map(t =>
        t.id === taskId ? { ...t, status: newStatus as TaskStatus } : t
      );
      setTasks(updatedTasks);

      // تحديث الكاش المركزي
      TasksCache.set(updatedTasks);

      // Backend Update
      try {
        await TaskService.updateTaskStatus(taskId, newStatus);
      } catch (err) {
        console.error('Failed to update task status', err);
        loadTasks(); // Revert on error
      }
    }
  };

  const getFilteredTasks = () => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return getFilteredTasks().filter(t => t.status === status);
  };

  // --- Row Actions (قائمة النقاط الثلاثة) ---

  const openTaskMenu = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const MENU_W = 210;
    const MENU_H = 320; // تقدير لاختيار اتجاه الفتح
    const openUp = rect.bottom + MENU_H > window.innerHeight;
    const left = Math.max(8, rect.right - MENU_W);
    const top = openUp ? rect.top - 4 : rect.bottom + 4;
    // toggle: الضغط على نفس الزر يغلق القائمة
    setMenu(prev => (prev?.task.id === task.id ? null : { task, top, left, openUp }));
  };

  const changeStatus = async (task: Task, status: TaskStatus) => {
    setMenu(null);
    if (task.status === status) return;
    // تحديث متفائل
    const updated = tasks.map(t => (t.id === task.id ? { ...t, status } : t));
    setTasks(updated);
    TasksCache.set(updated);
    try {
      await TaskService.updateTaskStatus(task.id, status);
    } catch (err) {
      console.error('Failed to update task status', err);
      loadTasks(); // التراجع عند الفشل
    }
  };

  const confirmDelete = async () => {
    if (!deleteTask) return;
    setDeleting(true);
    try {
      await TaskService.deleteTask(deleteTask.id);
      const updated = tasks.filter(t => t.id !== deleteTask.id);
      setTasks(updated);
      TasksCache.set(updated);
      setDeleteTask(null);
    } catch (err) {
      console.error('Failed to delete task', err);
      alert('فشل حذف المهمة. حاول مرة أخرى.');
    } finally {
      setDeleting(false);
    }
  };

  // --- Render Views ---

  const renderListView = () => {
    // Grouping Logic
    let groups: { id: string, label: string, color: string, tasks: Task[] }[] = [];

    if (groupBy === 'status') {
      groups = TASK_STATUSES.map(s => ({
        id: s.key,
        label: s.label,
        color: s.color,
        tasks: getTasksByStatus(s.key)
      }));
    } else if (groupBy === 'assignee') {
      // Create groups for each user + Unassigned
      const userGroups = Object.keys(users).map(uid => ({
        id: uid,
        label: users[uid].name,
        color: '#3b82f6',
        tasks: getFilteredTasks().filter(t => t.assignedTo === uid)
      }));
      const unassigned = getFilteredTasks().filter(t => !t.assignedTo);
      if (unassigned.length > 0) {
        userGroups.push({ id: 'unassigned', label: 'غير محدد', color: '#94a3b8', tasks: unassigned });
      }
      groups = userGroups;
    }

    return (
      <div className="tasks-table-container">
        <table className="tasks-table">
          <thead>
            <tr>
              <th style={{ width: '32%' }}>المهمة</th>
              <th>القضية</th>
              <th>الحالة</th>
              <th>الأولوية</th>
              <th>المكلف</th>
              <th>تاريخ الاستحقاق</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => {
              if (group.tasks.length === 0) return null;

              return (
                <React.Fragment key={group.id}>
                  <tr className="task-group-header">
                    <td colSpan={7} style={{ padding: '8px 16px', background: 'var(--quiet-gray-50)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ChevronDown size={14} />
                        <span style={{ color: group.color }}>{group.label}</span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                          {group.tasks.length}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {group.tasks.map(task => (
                    <tr key={task.id} onClick={() => navigate(`/tasks/${task.id}`)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{task.title}</div>

                      </td>
                      <td>
                        {task.case && task.caseId ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/cases/${task.caseId}`);
                            }}
                            title="فتح القضية"
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              color: 'var(--color-primary, #2563eb)',
                              font: 'inherit',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              textDecorationStyle: 'dotted',
                              textUnderlineOffset: '3px',
                              textAlign: 'right',
                            }}
                          >
                            {task.case.file_number ? `#${task.case.file_number} — ` : ''}
                            {task.case.title}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--color-text-secondary, #94a3b8)', fontSize: '12px' }}>
                            غير مسندة
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${task.status}`}>
                          {TASK_STATUSES.find(s => s.key === task.status)?.label}
                        </span>
                      </td>
                      <td>
                        <div className="priority-flag">
                          <Flag size={14} fill={task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#3b82f6'} color={task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#3b82f6'} />
                          <span>{task.priority === 'high' ? 'عالية' : task.priority === 'medium' ? 'متوسطة' : 'منخفضة'}</span>
                        </div>
                      </td>
                      <td>
                        {task.assignedTo ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div className="assignee-avatar" style={{ width: '20px', height: '20px', fontSize: '10px' }}>
                              {users[task.assignedTo]?.name.charAt(0)}
                            </div>
                            <span>{users[task.assignedTo]?.name}</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        {task.dueDate ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: new Date(task.dueDate) < new Date() ? 'var(--color-error)' : 'inherit' }}>
                            <Calendar size={14} />
                            {new Date(task.dueDate).toLocaleDateString('ar-SA')}
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        <button
                          className={`icon-btn ${menu?.task.id === task.id ? 'active' : ''}`}
                          onClick={(e) => openTaskMenu(e, task)}
                          title="خيارات"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderBoardView = () => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="board-view">
        {TASK_STATUSES.map(statusGroup => {
          const groupTasks = getTasksByStatus(statusGroup.key);
          return (
            <DroppableColumn
              key={statusGroup.key}
              id={statusGroup.key}
              title={statusGroup.label}
              count={groupTasks.length}
              color={statusGroup.color}
            >
              <SortableContext items={groupTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {groupTasks.map(task => (
                  <SortableTaskCard
                    key={task.id}
                    task={task}
                    user={task.assignedTo ? users[task.assignedTo] : undefined}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  />
                ))}
              </SortableContext>

              <button
                onClick={() => setIsAddModalOpen(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  background: 'transparent',
                  border: '1px dashed var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  justifyContent: 'center',
                  marginTop: 'auto'
                }}
              >
                <Plus size={14} /> إضافة مهمة
              </button>
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeDragItem ? (
          <div
            className="task-card"
            style={{
              transform: 'rotate(2deg)',
              cursor: 'grabbing',
              boxShadow: '0 10px 15px rgba(0,0,0,0.1)'
            }}
          >
            <div className="task-card-title">{activeDragItem.title}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );

  return (
    <div className="tasks-page">
      {/* Unified Toolbar — العنوان + البحث + التجميع + الفلاتر + التبديل + الإضافة في سطر واحد */}
      <header className="tasks-header tasks-header--unified">
        {/* Title */}
        <div className="tasks-header__title" style={{ flexShrink: 0 }}>
          <CheckCircle size={20} color="var(--law-navy)" />
          <span>إدارة المهام</span>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '220px', flexShrink: 0 }}>
          <Search size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
          <input
            type="text"
            placeholder="بحث عن مهمة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="tasks-toolbar__search-input"
          />
        </div>

        {/* Group By (List view only) */}
        {viewMode === 'list' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>تجميع:</span>
            <div className="tasks-toolbar__segmented">
              <button
                onClick={() => setGroupBy('status')}
                className={`tasks-toolbar__segmented-btn ${groupBy === 'status' ? 'active' : ''}`}
              >
                الحالة
              </button>
              <button
                onClick={() => setGroupBy('assignee')}
                className={`tasks-toolbar__segmented-btn ${groupBy === 'assignee' ? 'active' : ''}`}
              >
                المحامي
              </button>
            </div>
          </div>
        )}

        {/* Status Filters — wrap horizontally if needed */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          <button
            className={`task-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            الكل
          </button>
          {TASK_STATUSES.map(s => (
            <button
              key={s.key}
              className={`task-filter-btn ${statusFilter === s.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(s.key)}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color }}></span>
              {s.label}
            </button>
          ))}
        </div>

        {/* View Switcher + Add */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <div className="tasks-view-switcher">
            <button
              className={`tasks-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="قائمة"
            >
              <List size={14} />
            </button>
            <button
              className={`tasks-view-btn ${viewMode === 'board' ? 'active' : ''}`}
              onClick={() => setViewMode('board')}
              title="كانبان"
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          <button
            className="btn-primary tasks-toolbar__add-btn"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={14} />
            مهمة جديدة
          </button>
        </div>
      </header>

      {loading ? (
        <div className="tasks-loading">جاري التحميل...</div>
      ) : getFilteredTasks().length === 0 ? (
        <div className="tasks-empty">
          <CheckCircle size={40} style={{ opacity: 0.2, margin: '0 auto 10px' }} />
          <h3>لا توجد مهام</h3>
          <p>ابدأ بإضافة مهام جديدة لتنظيم عملك</p>
        </div>
      ) : (
        viewMode === 'list' ? renderListView() : renderBoardView()
      )}

      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTaskAdded={loadTasks}
      />

      {/* قائمة إجراءات الصف (النقاط الثلاثة) */}
      {menu && (
        <>
          <div
            onClick={() => setMenu(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 1000 }}
          />
          <div
            role="menu"
            className="task-row-menu"
            style={{
              position: 'fixed',
              top: menu.top,
              left: menu.left,
              width: 210,
              transform: menu.openUp ? 'translateY(-100%)' : 'none',
            }}
          >
            <button
              className="task-menu-item"
              onClick={() => { setEditTask(menu.task); setMenu(null); }}
            >
              <Pencil size={14} /> تعديل المهمة
            </button>

            <div className="task-menu-sep" />
            <div className="task-menu-label">تغيير الحالة إلى</div>
            {TASK_STATUSES.filter(s => s.key !== menu.task.status).map(s => (
              <button
                key={s.key}
                className="task-menu-item"
                onClick={() => changeStatus(menu.task, s.key)}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                {s.label}
              </button>
            ))}

            <div className="task-menu-sep" />
            <button
              className="task-menu-item danger"
              onClick={() => { setDeleteTask(menu.task); setMenu(null); }}
            >
              <Trash2 size={14} /> حذف المهمة
            </button>
          </div>
        </>
      )}

      {/* تأكيد الحذف */}
      {deleteTask && (
        <div
          onClick={() => !deleting && setDeleteTask(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--dashboard-card, #fff)', borderRadius: 12, padding: 24, width: 380, maxWidth: '90vw', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={20} color="#ef4444" />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--color-text)' }}>حذف المهمة</h3>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 22 }}>
              هل أنت متأكد من حذف المهمة «<strong style={{ color: 'var(--color-text)' }}>{deleteTask.title}</strong>»؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: deleting ? 'default' : 'pointer', fontSize: 14, fontWeight: 600, opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'جارٍ الحذف...' : 'نعم، احذف'}
              </button>
              <button
                onClick={() => setDeleteTask(null)}
                disabled={deleting}
                style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '9px 18px', cursor: deleting ? 'default' : 'pointer', fontSize: 14 }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <EditTaskModal
        isOpen={!!editTask}
        onClose={() => setEditTask(null)}
        task={editTask}
        onTaskUpdated={() => { setEditTask(null); loadTasks(); }}
      />

    </div>
  );
};

export default Tasks;
