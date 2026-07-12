import React, { useState, useEffect, useRef } from 'react';
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
  Trash2,
  Pencil,
  MessageSquare,
  CheckSquare,
  Tag,
  ShieldCheck,
  Paperclip,
  Sliders,
  Play,
  Pause,
  AlertTriangle
} from 'lucide-react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { Task, TaskStatus, Priority } from '../types';
import { TaskService, type TaskFilters, type TaskStats, type TaskWidgets } from '../services/taskService';
import { UserService } from '../services/UserService';
import AddTaskModal from '../components/AddTaskModal';
import EditTaskModal from '../components/EditTaskModal';
import VoiceTaskWidget from '../components/voice/VoiceTaskWidget';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { TasksCache, UsersCache } from '../utils/tasksCache';

// --- Constants & Types ---
const TASK_STATUSES: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'todo', label: 'لم تبدأ', color: '#64748b' },
  { key: 'in_progress', label: 'قيد التنفيذ', color: '#3b82f6' },
  { key: 'review', label: 'مراجعة', color: '#f59e0b' },
  { key: 'pending_approval', label: 'بانتظار الاعتماد', color: '#8b5cf6' },
  { key: 'completed', label: 'مكتملة', color: '#10b981' },
  { key: 'cancelled', label: 'ملغية', color: '#ef4444' }
];

type GroupBy = 'status' | 'assignee';

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  urgent: { label: 'عاجل', color: '#ef4444' },
  high:   { label: 'مرتفع', color: '#f97316' },
  medium: { label: 'متوسط', color: '#f59e0b' },
  low:    { label: 'منخفض', color: '#3b82f6' },
};

// Format seconds to HH:MM:SS
const formatTimer = (totalSeconds: number) => {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [
    hrs > 0 ? String(hrs).padStart(2, '0') : null,
    String(mins).padStart(2, '0'),
    String(secs).padStart(2, '0')
  ].filter(Boolean).join(':');
};

// --- Draggable Card Component ---
const SortableTaskCard = ({
  task,
  user,
  onOpen,
  onOpenMenu,
  activeTimerTaskId,
  timerRunning,
  onStartTimer,
  onPauseTimer,
  timerSeconds
}: {
  task: Task;
  user?: { name: string };
  onOpen: () => void;
  onOpenMenu: (e: React.MouseEvent, task: Task) => void;
  activeTimerTaskId: string | null;
  timerRunning: boolean;
  onStartTimer: (id: string) => void;
  onPauseTimer: () => void;
  timerSeconds: number;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id, data: { ...task } });

  const [expanded, setExpanded] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const prio = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;
  const dueDateObj = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDateObj && dueDateObj < new Date() && task.status !== 'completed' && task.status !== 'cancelled';
  const isDueToday = dueDateObj && dueDateObj.toDateString() === new Date().toDateString();
  const dueDateStr = dueDateObj
    ? dueDateObj.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
    : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`task-card task-card--erp${expanded ? ' task-card--open' : ''}`}
      onClick={() => setExpanded(v => !v)}
    >
      <div className="task-card-header">
        <span className={`task-prio-badge prio-${task.priority}`} style={{ borderColor: prio.color, color: prio.color }}>
          <span className="task-prio-dot" style={{ background: prio.color }} />
          {prio.label}
        </span>
        <div className="task-card-actions" onClick={(e) => e.stopPropagation()}>
          {task.status === 'in_progress' && (
            <button
              type="button"
              className={`task-card-action-btn stopwatch-icon-btn ${activeTimerTaskId === task.id && timerRunning ? 'running' : ''}`}
              title={activeTimerTaskId === task.id && timerRunning ? 'إيقاف مؤقت للموقت' : 'بدء موقت العمل'}
              onClick={(e) => {
                e.stopPropagation();
                if (activeTimerTaskId === task.id && timerRunning) {
                  onPauseTimer();
                } else {
                  onStartTimer(task.id);
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {activeTimerTaskId === task.id && timerRunning ? (
                <Pause size={12} className="text-error pulse-animation" />
              ) : (
                <Play size={12} />
              )}
            </button>
          )}
          <button
            type="button"
            className="task-card-action-btn menu-trigger"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onOpenMenu(e, task);
            }}
            title="إجراءات سريعة"
          >
            <MoreHorizontal size={14} />
          </button>
          <ChevronDown size={14} className="task-card-caret" />
        </div>
      </div>

      {task.case ? (
        <div
          className="task-card-case-badge"
          title={task.case.title}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Layers size={11} className="case-icon" />
          <span className="case-text">
            {task.case.file_number ? `${task.case.file_number} - ` : ''}
            {task.case.title}
          </span>
        </div>
      ) : task.client ? (
        <div
          className="task-card-case-badge task-card-client-badge"
          title={`العميل: ${task.client.name}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <User size={11} className="case-icon" />
          <span className="case-text">العميل: {task.client.name}</span>
        </div>
      ) : null}

      <div className="task-card-title">{task.title}</div>

      {task.tags && task.tags.length > 0 && (
        <div className="task-card-tags">
          {task.tags.map(tag => (
            <span key={tag} className="task-card-tag">
              <Tag size={9} />
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="task-card-footer">
        <div className="task-card-meta-left">
          {task.dueDate && (
            <span className={`tcm-badge due-date ${isOverdue ? 'overdue' : isDueToday ? 'today' : ''}`} title={isOverdue ? 'متأخرة!' : isDueToday ? 'تستحق اليوم' : 'تاريخ الاستحقاق'}>
              <Clock size={11} />
              <span>{dueDateStr}</span>
            </span>
          )}
          {activeTimerTaskId === task.id && timerRunning && (
            <span className="tcm-badge active-timer" title="الموقت النشط">
              <span className="stopwatch-pulse-dot" />
              <span>{formatTimer(timerSeconds)}</span>
            </span>
          )}
          {task.subtasks_total !== undefined && task.subtasks_total > 0 && (
            <span className="tcm-badge subtasks" title="المهام الفرعية">
              <CheckSquare size={11} />
              <span>{task.subtasks_completed || 0}/{task.subtasks_total}</span>
            </span>
          )}
          {task.comments_count !== undefined && task.comments_count > 0 && (
            <span className="tcm-badge comments" title="التعليقات">
              <MessageSquare size={11} />
              <span>{task.comments_count}</span>
            </span>
          )}
          {task.requires_approval && (
            <span className="tcm-badge approval" title="تتطلب اعتماداً">
              <ShieldCheck size={11} />
            </span>
          )}
          {task.requires_attachment && (
            <span
              className={`tcm-badge attachment${(task.documents_count ?? 0) === 0 ? ' missing' : ''}`}
              title={(task.documents_count ?? 0) === 0 ? 'تتطلب مرفقاً — لم يُرفع بعد' : 'تتطلب مرفقاً'}
            >
              <Paperclip size={11} />
            </span>
          )}
        </div>
        <div className="task-card-meta-right" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          {user ? (
            <span
              className="task-card-assignee-badge"
              title={(task.assignees && task.assignees.length > 1)
                ? task.assignees.map((a) => a.name).join('، ')
                : user.name}
            >
              <span className="assignee-avatar assignee-avatar--sm">
                {user.name.charAt(0)}
              </span>
              <span className="assignee-name">
                {user.name}
                {task.assignees && task.assignees.length > 1 ? ` +${task.assignees.length - 1}` : ''}
              </span>
            </span>
          ) : (
            <span className="task-card-assignee-badge unassigned" title="غير مسندة">
              <span className="assignee-avatar assignee-avatar--sm unassigned">
                ?
              </span>
              <span className="assignee-name">غير معين</span>
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="task-card-expand" onClick={(e) => e.stopPropagation()}>
          <p className={`task-card-desc${task.description ? '' : ' is-empty'}`}>
            {task.description || 'لا يوجد وصف لهذه المهمة'}
          </p>
          <button
            type="button"
            className="task-card-open"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
          >
            فتح التفاصيل
          </button>
        </div>
      )}
    </div>
  );
};

// --- Droppable Column Component ---
const DroppableColumn = ({ id, title, count, color, children }: { id: string, title: string, count: number, color: string, children: React.ReactNode }) => {
  const { setNodeRef } = useSortable({ id });

  return (
    <div ref={setNodeRef} className="board-column">
      <div className="board-column-header" style={{ borderTop: `3px solid ${color}`, paddingTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', background: color }}></span>
          {title}
        </div>
        <span className="board-column-header-count">
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

  const PAGE_SIZE = 50;
  const loadedCountRef = useRef(PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
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
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'title' | 'createdAt'>('priority');

  // فلتر خاص من أزرار «عرض الكل» في الودجات الجانبية
  type SpecialFilter = 'overdue' | 'due_today' | 'needs_attention' | null;
  const [specialFilter, setSpecialFilter] = useState<SpecialFilter>(null);

  // مرآة للفلاتر الحالية حتى تقرأها loadTasks من داخل أي callback بدون قيم قديمة
  const filtersRef = useRef({ search: '', status: 'all' as TaskStatus | 'all', assignee: 'all', special: null as SpecialFilter });
  filtersRef.current = { search: searchTerm, status: statusFilter, assignee: assigneeFilter, special: specialFilter };

  // إحصائيات وقوائم ودجات حقيقية من الخادم (كل المهام لا الصفحة المحمّلة فقط)
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [widgets, setWidgets] = useState<TaskWidgets | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // المجموعات المطوية في عرض القائمة
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (id: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // قائمة الإجراءات (زر النقاط الثلاثة)
  const [menu, setMenu] = useState<{ task: Task; top: number; left: number; openUp: boolean } | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  // responsive layout mobile navigation state
  const [mobileActiveTab, setMobileActiveTab] = useState<'tasks' | 'filters' | 'alerts'>('tasks');

  // --- Real-time Time Tracker State ---
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(() => {
    return localStorage.getItem('tasks_timer_task_id');
  });
  const [timerRunning, setTimerRunning] = useState<boolean>(() => {
    return localStorage.getItem('tasks_timer_running') === 'true';
  });
  const [timerSeconds, setTimerSeconds] = useState<number>(0);

  // Timer Tick implementation
  useEffect(() => {
    if (!activeTimerTaskId) {
      setTimerSeconds(0);
      return;
    }

    const startStr = localStorage.getItem('tasks_timer_start_time');
    const offsetStr = localStorage.getItem('tasks_timer_offset') || '0';
    const offset = parseInt(offsetStr, 10);

    if (timerRunning && startStr) {
      const startTime = parseInt(startStr, 10);
      const initialElapsed = Math.floor((Date.now() - startTime) / 1000) + offset;
      setTimerSeconds(initialElapsed);

      const interval = setInterval(() => {
        const currentElapsed = Math.floor((Date.now() - startTime) / 1000) + offset;
        setTimerSeconds(currentElapsed);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setTimerSeconds(offset);
    }
  }, [activeTimerTaskId, timerRunning]);

  const startTimer = (taskId: string) => {
    const prevTaskId = localStorage.getItem('tasks_timer_task_id');
    localStorage.setItem('tasks_timer_task_id', taskId);
    localStorage.setItem('tasks_timer_start_time', Date.now().toString());
    
    if (prevTaskId !== taskId) {
      localStorage.setItem('tasks_timer_offset', '0');
    }

    setActiveTimerTaskId(taskId);
    setTimerRunning(true);
    localStorage.setItem('tasks_timer_running', 'true');
  };

  const pauseTimer = () => {
    if (!activeTimerTaskId) return;
    const startStr = localStorage.getItem('tasks_timer_start_time');
    const offsetStr = localStorage.getItem('tasks_timer_offset') || '0';
    const offset = parseInt(offsetStr, 10);

    let newOffset = offset;
    if (startStr && timerRunning) {
      const startTime = parseInt(startStr, 10);
      newOffset += Math.floor((Date.now() - startTime) / 1000);
    }

    localStorage.setItem('tasks_timer_offset', newOffset.toString());
    localStorage.removeItem('tasks_timer_start_time');
    setTimerRunning(false);
    localStorage.setItem('tasks_timer_running', 'false');
    setTimerSeconds(newOffset);
  };

  const stopAndLogTimer = async () => {
    if (!activeTimerTaskId) return;
    const task = tasks.find(t => t.id === activeTimerTaskId);
    if (!task) return;

    const hours = parseFloat((timerSeconds / 3600).toFixed(2));
    const confirmLog = window.confirm(`هل ترغب في تسجيل ${hours} ساعة عمل للمهمة: "${task.title}"؟`);
    if (confirmLog) {
      try {
        const newActualHours = (task.actualHours || 0) + hours;
        await TaskService.updateTask(activeTimerTaskId, { actual_hours: newActualHours });
        
        const updatedTasks = tasks.map(t => t.id === activeTimerTaskId ? { ...t, actualHours: newActualHours } : t);
        setTasks(updatedTasks);
        TasksCache.set(updatedTasks);
        alert('تم تسجيل الوقت بنجاح.');
      } catch (err) {
        console.error('Failed to log hours:', err);
        alert('فشل في حفظ الساعات في الخادم، ولكن تم إيقاف الموقت.');
      }
    }

    localStorage.removeItem('tasks_timer_task_id');
    localStorage.removeItem('tasks_timer_start_time');
    localStorage.removeItem('tasks_timer_offset');
    localStorage.setItem('tasks_timer_running', 'false');
    setActiveTimerTaskId(null);
    setTimerRunning(false);
    setTimerSeconds(0);
  };

  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [s, w] = await Promise.all([
        TaskService.getTaskStatistics(),
        TaskService.getTaskWidgets(),
      ]);
      setStats(s);
      setWidgets(w);
    } catch (error) {
      console.error('Error loading task stats:', error);
    }
  };

  const loadTasks = async () => {
    try {
      if (tasks.length === 0) setLoading(true);
      const { search, status, assignee, special } = filtersRef.current;
      const filters: TaskFilters = { per_page: loadedCountRef.current };
      if (search.trim()) filters.search = search.trim();
      if (status !== 'all') filters.status = status;
      if (assignee !== 'all' && assignee !== 'unassigned') filters.assigned_to = assignee;
      if (special) filters[special] = 1;
      const response = await TaskService.getTasks(filters);
      const tasksData = response.data || [];
      setTasks(tasksData);
      setTotalCount((response as any).total ?? tasksData.length);
      TasksCache.set(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // البحث والفلاتر على الخادم (debounce للكتابة في البحث)
  const isFirstFilterRun = useRef(true);
  useEffect(() => {
    const delay = isFirstFilterRun.current ? 0 : 350;
    isFirstFilterRun.current = false;
    const t = setTimeout(() => {
      loadedCountRef.current = PAGE_SIZE;
      loadTasks();
    }, delay);
    return () => clearTimeout(t);
  }, [searchTerm, statusFilter, assigneeFilter, specialFilter]);

  const loadMore = async () => {
    loadedCountRef.current += PAGE_SIZE;
    setLoadingMore(true);
    try {
      await loadTasks();
    } finally {
      setLoadingMore(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadTasks(), loadStats()]);
  };

  useAutoRefresh({
    onRefresh: refreshAll,
    refetchOnFocus: true,
    pollingInterval: 120,
  });

  const loadUsers = async () => {
    try {
      const usersData = await UserService.getLawyers();
      const usersMap: { [key: string]: { name: string; avatar?: string | null } } = {};
      usersData.forEach(user => {
        usersMap[user.id] = { name: user.name };
      });
      setUsers(usersMap);
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

    let newStatus: TaskStatus | null = null;

    if (TASK_STATUSES.some(s => s.key === overId)) {
      newStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    if (newStatus) {
      const updatedTasks = tasks.map(t =>
        t.id === taskId ? { ...t, status: newStatus as TaskStatus } : t
      );
      setTasks(updatedTasks);
      TasksCache.set(updatedTasks);

      try {
        const updated = await TaskService.updateTaskStatus(taskId, newStatus);
        const actualStatus = (updated as any)?.status as TaskStatus | undefined;
        if (actualStatus && actualStatus !== newStatus) {
          const corrected = updatedTasks.map(t => t.id === taskId ? { ...t, status: actualStatus } : t);
          setTasks(corrected);
          TasksCache.set(corrected);
        }
        loadStats();
      } catch (err: any) {
        console.error('Failed to update status', err);
        alert(err?.message || 'تعذّر تحديث حالة المهمة');
        loadTasks();
      }
    }
  };

  const getFilteredTasks = () => {
    const filtered = tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesAssignee = assigneeFilter === 'all'
        || (assigneeFilter === 'unassigned' ? !task.assignedTo : task.assignedTo === assigneeFilter);
      return matchesSearch && matchesStatus && matchesAssignee;
    });

    const PRIORITY_RANK: Record<string, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1
    };

    return [...filtered].sort((a, b) => {
      if (sortBy === 'priority') {
        const rankA = PRIORITY_RANK[a.priority] ?? 2;
        const rankB = PRIORITY_RANK[b.priority] ?? 2;
        return rankB - rankA;
      }
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title, 'ar');
      }
      if (sortBy === 'createdAt') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return getFilteredTasks().filter(t => t.status === status);
  };

  // Dynamically compute overdue and today tasks lists
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    const isCompletedOrCancelled = task.status === 'completed' || task.status === 'cancelled';
    const isPast = new Date(task.dueDate) < new Date();
    return isPast && !isCompletedOrCancelled;
  });

  const todayTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    const isCompletedOrCancelled = task.status === 'completed' || task.status === 'cancelled';
    const isToday = new Date(task.dueDate).toDateString() === new Date().toDateString();
    return isToday && !isCompletedOrCancelled;
  });

  // --- بيانات ودجات اللوحة اليسرى ---
  const timeAgo = (d?: Date | string) => {
    if (!d) return '';
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} د`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} س`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? 'منذ يوم' : days === 2 ? 'منذ يومين' : days <= 10 ? `منذ ${days} أيام` : `منذ ${days} يوماً`;
  };

  const isOpenTask = (t: Task) => t.status !== 'completed' && t.status !== 'cancelled';

  // بانتظار الاعتماد
  const pendingApprovalTasks = tasks.filter(t => t.status === 'pending_approval');

  // مهام مفتوحة فيها نواقص ضبط (بلا مكلّف / بلا تاريخ / مرفق مطلوب لم يُرفع)
  const attentionTasks = tasks
    .filter(isOpenTask)
    .map(task => {
      const reason = !task.assignedTo ? 'بلا مكلّف'
        : !task.dueDate ? 'بلا تاريخ استحقاق'
        : (task.requires_attachment && (task.documents_count ?? 0) === 0) ? 'مرفق مطلوب لم يُرفع'
        : null;
      return reason ? { task, reason } : null;
    })
    .filter((x): x is { task: Task; reason: string } => x !== null);

  // توزيع الحمل: عدد المهام المفتوحة لكل محامٍ
  const openTasks = tasks.filter(isOpenTask);
  const workload = Object.entries(users)
    .map(([uid, u]) => ({ uid, name: u.name, count: openTasks.filter(t => t.assignedTo === uid).length }))
    .filter(w => w.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // مصدر عرض الودجات: بيانات الخادم الدقيقة، ومحلياً كـ fallback ريثما تصل
  const wOverdue = widgets?.overdue
    ?? overdueTasks.slice(0, 5).map(t => ({ id: t.id, title: t.title, due_date: t.dueDate ? String(t.dueDate) : null }));
  const wToday = widgets?.due_today
    ?? todayTasks.map(t => ({ id: t.id, title: t.title, priority: t.priority, status: t.status }));
  const wApproval = widgets?.pending_approval
    ?? pendingApprovalTasks.slice(0, 4).map(t => ({
      id: t.id,
      title: t.title,
      updated_at: String(t.updatedAt),
      assignee_name: t.assignedTo ? (users[t.assignedTo]?.name ?? null) : null,
    }));
  const wAttention = widgets?.needs_attention
    ?? attentionTasks.slice(0, 4).map(({ task, reason }) => ({ id: task.id, title: task.title, reason }));
  const wWorkload = widgets?.workload
    ?? workload.map(w => ({ user_id: w.uid, name: w.name, open_count: w.count }));
  const maxWorkload = wWorkload[0]?.open_count || 1;
  const attentionCount = widgets?.counts.needs_attention ?? attentionTasks.length;

  const SPECIAL_FILTER_LABELS: Record<Exclude<SpecialFilter, null>, string> = {
    overdue: 'المهام المتأخرة',
    due_today: 'مهام تستحق اليوم',
    needs_attention: 'مهام تحتاج ضبط',
  };

  // «عرض الكل» من ودجة جانبية: يفعّل الفلتر الخاص على الجدول الرئيسي
  const showAllOf = (key: Exclude<SpecialFilter, null>) => {
    setStatusFilter('all');
    setSpecialFilter(prev => (prev === key ? null : key));
    setMobileActiveTab('tasks');
  };

  const openTaskMenu = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const MENU_W = 210;
    const MENU_H = 320;
    const openUp = rect.bottom + MENU_H > window.innerHeight;
    const left = Math.max(8, rect.right - MENU_W);
    const top = openUp ? rect.top - 4 : rect.bottom + 4;
    setMenu(prev => (prev?.task.id === task.id ? null : { task, top, left, openUp }));
  };

  const changeStatus = async (task: Task, status: TaskStatus) => {
    setMenu(null);
    if (task.status === status) return;
    const updated = tasks.map(t => (t.id === task.id ? { ...t, status } : t));
    setTasks(updated);
    TasksCache.set(updated);
    try {
      await TaskService.updateTaskStatus(task.id, status);
      loadStats();
    } catch (err) {
      console.error('Failed to update status', err);
      loadTasks();
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
      loadStats();
    } catch (err) {
      console.error('Failed to delete task', err);
      alert('فشل حذف المهمة. حاول مرة أخرى.');
    } finally {
      setDeleting(false);
    }
  };

  const renderListView = () => {
    let groups: { id: string; label: string; color: string; tasks: Task[] }[] = [];

    if (groupBy === 'status') {
      groups = TASK_STATUSES.map(s => ({
        id: s.key,
        label: s.label,
        color: s.color,
        tasks: getTasksByStatus(s.key)
      }));
    } else if (groupBy === 'assignee') {
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
              <th style={{ width: '35%' }}>المهمة</th>
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
              const isCollapsed = collapsedGroups.has(group.id);

              return (
                <React.Fragment key={group.id}>
                  <tr className="task-group-header" onClick={() => toggleGroup(group.id)} style={{ cursor: 'pointer' }}>
                    <td colSpan={6} style={{ padding: '8px 16px', background: 'var(--quiet-gray-50)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ChevronDown size={14} style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s ease' }} />
                        <span style={{ color: group.color }}>{group.label}</span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                          {group.tasks.length}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {!isCollapsed && group.tasks.map(task => (
                    <tr key={task.id} onClick={() => navigate(`/tasks/${task.id}`)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="task-title-cell">
                          <span className="task-title-text">{task.title}</span>
                          {task.case ? (
                            <span className="task-case-subtext" title={task.case.title} onClick={(e) => { e.stopPropagation(); navigate(`/cases/${task.caseId}`); }}>
                              <Layers size={10} className="inline-icon" />
                              {task.case.file_number ? `#${task.case.file_number} — ` : ''}
                              {task.case.title}
                            </span>
                          ) : task.client ? (
                            <span className="task-case-subtext client" title={task.client.name}>
                              <User size={10} className="inline-icon" />
                              العميل: {task.client.name}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${task.status}`}>
                          {TASK_STATUSES.find(s => s.key === task.status)?.label}
                        </span>
                      </td>
                      <td>
                        <div className="priority-flag">
                          <Flag size={13} fill={PRIORITY_META[task.priority]?.color || '#f59e0b'} color={PRIORITY_META[task.priority]?.color || '#f59e0b'} />
                          <span>{PRIORITY_META[task.priority]?.label || 'متوسطة'}</span>
                        </div>
                      </td>
                      <td>
                        {task.assignedTo ? (
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            title={(task.assignees && task.assignees.length > 1)
                              ? task.assignees.map((a) => a.name).join('، ')
                              : users[task.assignedTo]?.name}
                          >
                            <div className="assignee-avatar" style={{ width: '20px', height: '20px', fontSize: '10px' }}>
                              {users[task.assignedTo]?.name.charAt(0)}
                            </div>
                            <span>
                              {users[task.assignedTo]?.name}
                              {task.assignees && task.assignees.length > 1 ? ` +${task.assignees.length - 1}` : ''}
                            </span>
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        {task.dueDate ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: new Date(task.dueDate) < new Date() && task.status !== 'completed' && task.status !== 'cancelled' ? 'var(--color-error)' : 'inherit' }}>
                            <Calendar size={13} />
                            <span>{new Date(task.dueDate).toLocaleDateString('ar-SA')}</span>
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
                    onOpen={() => navigate(`/tasks/${task.id}`)}
                    onOpenMenu={(e, t) => openTaskMenu(e, t)}
                    activeTimerTaskId={activeTimerTaskId}
                    timerRunning={timerRunning}
                    onStartTimer={startTimer}
                    onPauseTimer={pauseTimer}
                    timerSeconds={timerSeconds}
                  />
                ))}
              </SortableContext>

              <button
                type="button"
                className="task-add-btn"
                onClick={() => setIsAddModalOpen(true)}
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
      {/* Mobile Tab Switcher */}
      <div className="tasks-mobile-tabs">
        <button
          className={`tasks-mobile-tab ${mobileActiveTab === 'filters' ? 'active' : ''}`}
          onClick={() => setMobileActiveTab('filters')}
        >
          <Sliders size={15} />
          <span>الفرز والإحصاء</span>
        </button>
        <button
          className={`tasks-mobile-tab ${mobileActiveTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setMobileActiveTab('tasks')}
        >
          <CheckSquare size={15} />
          <span>قائمة المهام ({stats?.total ?? totalCount})</span>
        </button>
        <button
          className={`tasks-mobile-tab ${mobileActiveTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setMobileActiveTab('alerts')}
        >
          <Clock size={15} />
          <span>المتابعة ({stats?.overdue ?? overdueTasks.length})</span>
        </button>
      </div>

      <div className="tasks-page-grid">
        
        {/* Column 1: Right Panel (Filters, Stats) */}
        <aside className={`tasks-panel-right ${mobileActiveTab === 'filters' ? 'mobile-visible' : 'mobile-hidden'}`}>
          <div className="panel-section">
            <button
              className="btn-primary tasks-sidebar__add-btn"
              onClick={() => setIsAddModalOpen(true)}
              style={{ width: '100%', justifyContent: 'center', gap: '8px', padding: '10px' }}
            >
              <Plus size={16} />
              <span>مهمة جديدة</span>
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="panel-section stats-grid">
            <div className="stat-card total" onClick={() => { setStatusFilter('all'); setMobileActiveTab('tasks'); }}>
              <div className="stat-label">إجمالي المهام</div>
              <div className="stat-value">{stats?.total ?? totalCount}</div>
            </div>
            <div className="stat-card overdue" onClick={() => { setStatusFilter('all'); setMobileActiveTab('alerts'); }}>
              <div className="stat-label">المتأخرة</div>
              <div className="stat-value text-error">{stats?.overdue ?? overdueTasks.length}</div>
            </div>
            <div className="stat-card in-progress" onClick={() => { setStatusFilter('in_progress'); setMobileActiveTab('tasks'); }}>
              <div className="stat-label">قيد التنفيذ</div>
              <div className="stat-value">{stats?.in_progress ?? tasks.filter(t => t.status === 'in_progress').length}</div>
            </div>
            <div className="stat-card pending" onClick={() => { setStatusFilter('pending_approval'); setMobileActiveTab('tasks'); }}>
              <div className="stat-label">بانتظار الاعتماد</div>
              <div className="stat-value">{stats?.pending_approval ?? tasks.filter(t => t.status === 'pending_approval').length}</div>
            </div>
          </div>

          {/* Status Filters List */}
          <div className="panel-section">
            <h4 className="panel-section-title">تصفية حسب الحالة</h4>
            <div className="vertical-filter-list">
              <button
                className={`vertical-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => { setSpecialFilter(null); setStatusFilter('all'); if (window.innerWidth < 1024) setMobileActiveTab('tasks'); }}
              >
                <span className="filter-dot all" />
                <span className="filter-label">الكل</span>
                <span className="filter-count">{stats?.total ?? totalCount}</span>
              </button>
              {TASK_STATUSES.map(s => {
                const count = (stats?.[s.key as keyof TaskStats] as number | undefined) ?? tasks.filter(t => t.status === s.key).length;
                return (
                  <button
                    key={s.key}
                    className={`vertical-filter-btn ${statusFilter === s.key ? 'active' : ''}`}
                    onClick={() => { setSpecialFilter(null); setStatusFilter(s.key); if (window.innerWidth < 1024) setMobileActiveTab('tasks'); }}
                  >
                    <span className="filter-dot" style={{ backgroundColor: s.color }} />
                    <span className="filter-label">{s.label}</span>
                    <span className="filter-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority Filters */}
          <div className="panel-section">
            <h4 className="panel-section-title">الأولويات</h4>
            <div className="priority-filter-grid">
              {Object.entries(PRIORITY_META).map(([prioKey, prioMeta]) => {
                const count = stats?.by_priority?.[prioKey as keyof TaskStats['by_priority']]
                  ?? tasks.filter(t => t.priority === prioKey).length;
                return (
                  <button
                    key={prioKey}
                    className="prio-filter-card"
                    style={{ borderColor: prioMeta.color }}
                    onClick={() => {
                      setSortBy('priority');
                      if (window.innerWidth < 1024) setMobileActiveTab('tasks');
                    }}
                  >
                    <Flag size={12} fill={prioMeta.color} color={prioMeta.color} />
                    <span className="prio-label">{prioMeta.label}</span>
                    <span className="prio-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sorting & assignee filter panel */}
          <div className="panel-section">
            <div className="inline-field">
              <h4 className="panel-section-title">ترتيب المهام</h4>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="tasks-sidebar-select"
              >
                <option value="priority">الأولوية</option>
                <option value="dueDate">تاريخ الاستحقاق</option>
                <option value="createdAt">تاريخ الإنشاء</option>
                <option value="title">العنوان</option>
              </select>
            </div>
            <div className="inline-field">
              <h4 className="panel-section-title">حسب المحامي</h4>
              <select
                value={assigneeFilter}
                onChange={(e) => { setAssigneeFilter(e.target.value); if (window.innerWidth < 1024) setMobileActiveTab('tasks'); }}
                className="tasks-sidebar-select"
              >
                <option value="all">الكل</option>
                {Object.entries(users).map(([uid, u]) => (
                  <option key={uid} value={uid}>{u.name}</option>
                ))}
                <option value="unassigned">غير معيّن</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Column 2: Middle Panel (Main tasks view) */}
        <main className={`tasks-panel-middle ${mobileActiveTab === 'tasks' ? 'mobile-visible' : 'mobile-hidden'}`}>
          <div className="middle-panel-header">
            {/* Search */}
            <div className="tasks-toolbar__search">
              <Search size={14} className="tasks-toolbar__search-icon" />
              <input
                type="text"
                placeholder="البحث عن مهمة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="tasks-toolbar__search-input"
              />
            </div>

            {/* شريحة الفلتر الخاص النشط (عرض الكل من ودجة) */}
            {specialFilter && (
              <div className="special-filter-chip">
                <span>عرض: {SPECIAL_FILTER_LABELS[specialFilter]} ({totalCount})</span>
                <button onClick={() => setSpecialFilter(null)} title="إلغاء التصفية">✕</button>
              </div>
            )}

            {/* View switcher */}
            <div className="tasks-view-switcher">
              <button
                className={`tasks-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="عرض القائمة"
              >
                <List size={14} />
                <span>قائمة</span>
              </button>
              <button
                className={`tasks-view-btn ${viewMode === 'board' ? 'active' : ''}`}
                onClick={() => setViewMode('board')}
                title="عرض لوحة كانبان"
              >
                <LayoutGrid size={14} />
                <span>كانبان</span>
              </button>
            </div>
          </div>

          <div className="middle-panel-content">
            {loading ? (
              <div className="tasks-loading">جاري التحميل...</div>
            ) : getFilteredTasks().length === 0 ? (
              <div className="tasks-empty">
                <CheckCircle size={40} style={{ opacity: 0.2, margin: '0 auto 10px' }} />
                <h3>لا توجد مهام مطابقة</h3>
                <p>قم بتغيير خيارات التصفية أو أضف مهمة جديدة</p>
              </div>
            ) : (
              viewMode === 'list' ? renderListView() : renderBoardView()
            )}

            {/* Pagination / Load More */}
            {!loading && tasks.length < totalCount && (
              <div className="load-more-container">
                <button onClick={loadMore} disabled={loadingMore} className="load-more-btn">
                  {loadingMore ? 'جاري التحميل…' : `تحميل المزيد (${totalCount - tasks.length} متبقية)`}
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Column 3: Left Panel (Overdue, Timers) */}
        <aside className={`tasks-panel-left ${mobileActiveTab === 'alerts' ? 'mobile-visible' : 'mobile-hidden'}`}>
          
          {/* Real-time Time Tracker Widget — يظهر فقط عند وجود موقت نشط */}
          {activeTimerTaskId && (
            <div className="panel-section tracker-widget">
              <h4 className="panel-section-title">
                <Clock size={14} className="title-icon" />
                <span>متتبع الوقت الفعلي</span>
              </h4>
              {(() => {
                const runningTask = tasks.find(t => t.id === activeTimerTaskId);
                return (
                  <div className="active-tracker-card">
                    <div className="tracker-task-title">{runningTask ? runningTask.title : 'مهمة غير معروفة'}</div>
                    <div className="tracker-timer-display">{formatTimer(timerSeconds)}</div>
                    <div className="tracker-controls">
                      {timerRunning ? (
                        <button onClick={pauseTimer} className="tracker-btn pause" title="إيقاف مؤقت">
                          <Pause size={14} />
                          <span>إيقاف</span>
                        </button>
                      ) : (
                        <button onClick={() => startTimer(activeTimerTaskId)} className="tracker-btn start" title="استئناف">
                          <Play size={14} />
                          <span>استئناف</span>
                        </button>
                      )}
                      <button onClick={stopAndLogTimer} className="tracker-btn stop" title="حفظ وتسجيل الوقت">
                        <CheckCircle size={14} />
                        <span>تسجيل</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Pending Approval Widget */}
          <div className="panel-section approval-widget">
            <h4 className="panel-section-title">
              <ShieldCheck size={14} className="title-icon" />
              <span>بانتظار الاعتماد ({stats?.pending_approval ?? wApproval.length})</span>
              <button
                className={`widget-view-all ${statusFilter === 'pending_approval' ? 'active' : ''}`}
                onClick={() => { setSpecialFilter(null); setStatusFilter(prev => prev === 'pending_approval' ? 'all' : 'pending_approval'); setMobileActiveTab('tasks'); }}
              >
                عرض الكل
              </button>
            </h4>
            <div className="side-tasks-list">
              {wApproval.length > 0 ? (
                wApproval.map(item => (
                  <div key={item.id} className="side-task-card approval" onClick={() => navigate(`/tasks/${item.id}`)}>
                    <ShieldCheck className="side-card-bg-icon" size={34} />
                    <div className="side-task-title">{item.title}</div>
                    <div className="side-task-meta">
                      <span className="waiting-label">{timeAgo(item.updated_at)}</span>
                      {item.assignee_name && (
                        <span className="due-date-str">{item.assignee_name}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="side-tasks-empty">لا توجد مهام بانتظار الاعتماد</div>
              )}
            </div>
          </div>

          {/* Overdue Tasks Widget */}
          <div className="panel-section overdue-widget">
            <h4 className="panel-section-title text-error">
              <AlertTriangle size={14} className="title-icon" />
              <span>مهام متأخرة ({stats?.overdue ?? overdueTasks.length})</span>
              <button className={`widget-view-all ${specialFilter === 'overdue' ? 'active' : ''}`} onClick={() => showAllOf('overdue')}>
                عرض الكل
              </button>
            </h4>
            <div className="side-tasks-list">
              {wOverdue.length > 0 ? (
                wOverdue.map(item => {
                  const overdueDays = Math.max(1, Math.floor((Date.now() - new Date(item.due_date!).getTime()) / (1000 * 60 * 60 * 24)));
                  const overdueLabel = overdueDays === 1 ? 'متأخرة بيوم واحد'
                    : overdueDays === 2 ? 'متأخرة بيومين'
                    : overdueDays <= 10 ? `متأخرة بـ ${overdueDays} أيام`
                    : `متأخرة بـ ${overdueDays} يوماً`;
                  return (
                    <div key={item.id} className="side-task-card overdue" onClick={() => navigate(`/tasks/${item.id}`)}>
                      <AlertTriangle className="side-card-bg-icon" size={34} />
                      <div className="side-task-title">{item.title}</div>
                      <div className="side-task-meta">
                        <span className="days-overdue">{overdueLabel}</span>
                        <span className="due-date-str">
                          {new Date(item.due_date!).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="side-tasks-empty">لا توجد مهام متأخرة 🎉</div>
              )}
            </div>
          </div>

          {/* Today Tasks Widget */}
          <div className="panel-section today-widget">
            <h4 className="panel-section-title">
              <Calendar size={14} className="title-icon" />
              <span>تستحق اليوم ({stats?.due_today ?? todayTasks.length})</span>
              <button className={`widget-view-all ${specialFilter === 'due_today' ? 'active' : ''}`} onClick={() => showAllOf('due_today')}>
                عرض الكل
              </button>
            </h4>
            <div className="side-tasks-list">
              {wToday.length > 0 ? (
                wToday.map(item => (
                  <div key={item.id} className="side-task-card today" onClick={() => navigate(`/tasks/${item.id}`)}>
                    <Calendar className="side-card-bg-icon" size={34} />
                    <div className="side-task-title">{item.title}</div>
                    <div className="side-task-meta">
                      <span className="priority-badge" style={{ color: PRIORITY_META[item.priority]?.color }}>
                        {PRIORITY_META[item.priority]?.label}
                      </span>
                      {item.status === 'in_progress' && (
                        <span className="in-progress-dot-label">
                          <span className="stopwatch-pulse-dot inline" />
                          قيد التنفيذ
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="side-tasks-empty">لا توجد مهام تستحق اليوم</div>
              )}
            </div>
          </div>

          {/* Needs Attention Widget — نواقص ضبط المهام */}
          <div className="panel-section attention-widget">
            <h4 className="panel-section-title">
              <Sliders size={14} className="title-icon" />
              <span>مهام تحتاج ضبط ({attentionCount})</span>
              <button className={`widget-view-all ${specialFilter === 'needs_attention' ? 'active' : ''}`} onClick={() => showAllOf('needs_attention')}>
                عرض الكل
              </button>
            </h4>
            <div className="side-tasks-list">
              {wAttention.length > 0 ? (
                wAttention.map(item => (
                  <div key={item.id} className="side-task-card attention" onClick={() => navigate(`/tasks/${item.id}`)}>
                    <Sliders className="side-card-bg-icon" size={34} />
                    <div className="side-task-title">{item.title}</div>
                    <div className="side-task-meta">
                      <span className="attn-reason">{item.reason}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="side-tasks-empty">كل المهام مضبوطة ✓</div>
              )}
            </div>
          </div>

          {/* Team Workload Widget */}
          <div className="panel-section workload-widget">
            <h4 className="panel-section-title">
              <User size={14} className="title-icon" />
              <span>توزيع الحمل على الفريق</span>
            </h4>
            <div className="workload-list">
              {wWorkload.length > 0 ? (
                wWorkload.map(w => {
                  const uid = String(w.user_id);
                  return (
                    <button
                      key={uid}
                      className={`workload-row ${assigneeFilter === uid ? 'active' : ''}`}
                      title={`عرض مهام ${w.name}`}
                      onClick={() => { setAssigneeFilter(prev => prev === uid ? 'all' : uid); setMobileActiveTab('tasks'); }}
                    >
                      <span className="workload-name">{w.name}</span>
                      <span className="workload-bar-track">
                        <span className="workload-bar" style={{ width: `${Math.max(8, (w.open_count / maxWorkload) * 100)}%` }} />
                      </span>
                      <span className="workload-count">{w.open_count}</span>
                    </button>
                  );
                })
              ) : (
                <div className="side-tasks-empty">لا توجد مهام مفتوحة مسندة</div>
              )}
            </div>
          </div>
        </aside>

      </div>

      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTaskAdded={refreshAll}
      />

      <VoiceTaskWidget onTaskCreated={refreshAll} />

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
        onTaskUpdated={() => { setEditTask(null); refreshAll(); }}
      />
    </div>
  );
};

export default Tasks;
