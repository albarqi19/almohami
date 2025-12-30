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
  Archive
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
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import '../styles/tasks-page.css';

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


// --- Cache Constants ---
const TASKS_CACHE_KEY = 'tasks_data';
const TASKS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// --- Main Page Component ---
const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const cached = localStorage.getItem(TASKS_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < TASKS_CACHE_DURATION) {
          return data.tasks || [];
        }
      }
    } catch (e) { console.error('Cache error:', e); }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem(TASKS_CACHE_KEY);
      if (cached) {
        const { timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < TASKS_CACHE_DURATION) return false;
      }
    } catch (e) { }
    return true;
  });
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [groupBy, setGroupBy] = useState<GroupBy>('status');
  const [users, setUsers] = useState<{ [key: string]: { name: string; avatar?: string | null } }>(() => {
    try {
      const cached = localStorage.getItem(TASKS_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < TASKS_CACHE_DURATION) {
          return data.users || {};
        }
      }
    } catch (e) { }
    return {};
  });

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

  useEffect(() => {
    // Only fetch if no cached data exists
    const cached = localStorage.getItem(TASKS_CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < TASKS_CACHE_DURATION && data.tasks?.length > 0) {
          // Cache is valid, don't refetch
          return;
        }
      } catch (e) { }
    }
    loadTasks();
    loadUsers();
  }, []);

  const loadTasks = async () => {
    try {
      if (tasks.length === 0) setLoading(true);
      const response = await TaskService.getTasks({});
      const tasksData = response.data || [];
      setTasks(tasksData);
      // Save to cache
      const cached = localStorage.getItem(TASKS_CACHE_KEY);
      let existingData = {};
      if (cached) {
        try {
          const { data } = JSON.parse(cached);
          existingData = data || {};
        } catch (e) { }
      }
      localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify({
        data: { ...existingData, tasks: tasksData },
        timestamp: Date.now()
      }));
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
      // Update cache with users
      const cached = localStorage.getItem(TASKS_CACHE_KEY);
      let existingData = {};
      if (cached) {
        try {
          const { data } = JSON.parse(cached);
          existingData = data || {};
        } catch (e) { }
      }
      localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify({
        data: { ...existingData, users: usersMap },
        timestamp: Date.now()
      }));
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
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: newStatus as TaskStatus } : t
      ));

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
              <th style={{ width: '40%' }}>المهمة</th>
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
                    <td colSpan={6} style={{ padding: '8px 16px', background: 'var(--quiet-gray-50)' }}>
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
                        <button className="icon-btn" onClick={(e) => e.stopPropagation()}>
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
      {/* Header */}
      <header className="tasks-header">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="tasks-header__title">
            <CheckCircle size={20} color="var(--law-navy)" />
            <span>إدارة المهام</span>
          </div>
          <div className="tasks-header__subtitle">
            تتبع مهام الفريق القانوني وإنجازها
          </div>
        </div>

        <div className="tasks-header__center">
          {/* View Switcher */}
          <div className="tasks-view-switcher">
            <button
              className={`tasks-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={16} />
              قائمة
            </button>
            <button
              className={`tasks-view-btn ${viewMode === 'board' ? 'active' : ''}`}
              onClick={() => setViewMode('board')}
            >
              <LayoutGrid size={16} />
              كانبان
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'var(--law-navy)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <Plus size={16} />
            مهمة جديدة
          </button>
        </div>
      </header>

      {/* Filter & Group Bar */}
      <div className="tasks-filters">
        <div style={{ position: 'relative', width: '250px' }}>
          <Search size={14} style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--color-text-secondary)' }} />
          <input
            type="text"
            placeholder="بحث عن مهمة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 32px 8px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Group By (Only for List View usually, but can be global) */}
        {viewMode === 'list' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>تجميع حسب:</span>
            <div style={{ display: 'flex', background: 'var(--quiet-gray-100)', borderRadius: '6px', padding: '2px' }}>
              <button
                onClick={() => setGroupBy('status')}
                style={{
                  padding: '4px 8px', border: 'none', background: groupBy === 'status' ? 'white' : 'transparent',
                  borderRadius: '4px', fontSize: '12px', cursor: 'pointer',
                  boxShadow: groupBy === 'status' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                الحالة
              </button>
              <button
                onClick={() => setGroupBy('assignee')}
                style={{
                  padding: '4px 8px', border: 'none', background: groupBy === 'assignee' ? 'white' : 'transparent',
                  borderRadius: '4px', fontSize: '12px', cursor: 'pointer',
                  boxShadow: groupBy === 'assignee' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                المحامي
              </button>
            </div>
          </div>
        )}

        <div style={{ flex: 1 }}></div>

        {/* Status Filters */}
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
    </div>
  );
};

export default Tasks;
