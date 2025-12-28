import type { Task } from '../types';

const TASKS_CACHE_KEY = 'tasks_cache_v2'; // مفتاح جديد لتجنب البيانات القديمة
const USERS_CACHE_KEY = 'users_cache_v2';

// مسح البيانات القديمة عند التحميل
try {
  localStorage.removeItem('tasks_data');
} catch (e) { /* ignore */ }

export const TasksCache = {
  get: (): Task[] => {
    try {
      const cached = localStorage.getItem(TASKS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // التأكد من أن البيانات هي array
        if (Array.isArray(parsed)) {
          return parsed;
        }
        // إذا كانت البيانات بتنسيق قديم، أرجع array فارغ
        console.warn('Invalid cache format, clearing...');
        localStorage.removeItem(TASKS_CACHE_KEY);
      }
    } catch (e) {
      console.error('Cache read error:', e);
      localStorage.removeItem(TASKS_CACHE_KEY);
    }
    return [];
  },

  set: (tasks: Task[]) => {
    try {
      localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(tasks));
    } catch (e) { console.error('Cache write error:', e); }
  },

  updateTask: (updatedTask: Task) => {
    const tasks = TasksCache.get();
    const index = tasks.findIndex(t => t.id === updatedTask.id);
    if (index !== -1) {
      tasks[index] = updatedTask;
      TasksCache.set(tasks);
    }
  },

  addTask: (newTask: Task) => {
    const tasks = TasksCache.get();
    tasks.unshift(newTask);
    TasksCache.set(tasks);
  },

  removeTask: (taskId: string) => {
    const tasks = TasksCache.get();
    const filtered = tasks.filter(t => t.id !== taskId);
    TasksCache.set(filtered);
  },

  clear: () => {
    localStorage.removeItem(TASKS_CACHE_KEY);
  }
};

export const UsersCache = {
  get: (): { [key: string]: { name: string; avatar?: string | null } } => {
    try {
      const cached = localStorage.getItem(USERS_CACHE_KEY);
      if (cached) return JSON.parse(cached) || {};
    } catch (e) { }
    return {};
  },

  set: (users: { [key: string]: { name: string; avatar?: string | null } }) => {
    try {
      localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
    } catch (e) { }
  }
};
