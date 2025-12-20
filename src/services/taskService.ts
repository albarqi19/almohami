import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import type { Task, CreateTaskForm } from '../types';

export interface TaskFilters {
  status?: string;
  priority?: string;
  type?: string;
  assigned_to?: string;
  case_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class TaskService {
  static async getTasks(filters: TaskFilters = {}): Promise<PaginatedResponse<Task>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const queryString = params.toString();
    const endpoint = queryString ? `/tasks?${queryString}` : '/tasks';
    
    const response = await apiClient.get<ApiResponse<PaginatedResponse<any>>>(endpoint);
    
    if (response.success && response.data) {
      // Convert tasks data from snake_case to camelCase
      const convertedTasks = response.data.data.map((task: any) => ({
        ...task,
        dueDate: task.due_date ? new Date(task.due_date) : undefined,
        createdAt: task.created_at ? new Date(task.created_at) : new Date(),
        updatedAt: task.updated_at ? new Date(task.updated_at) : new Date(),
        completedAt: task.completed_at ? new Date(task.completed_at) : undefined,
        estimatedHours: task.estimated_hours,
        actualHours: task.actual_hours,
        assignedTo: task.assigned_to,
        assignedBy: task.assigned_by,
        caseId: task.case_id
      }));
      
      return {
        ...response.data,
        data: convertedTasks
      } as PaginatedResponse<Task>;
    } else {
      throw new Error(response.message || 'فشل في جلب المهام');
    }
  }

  static async getTask(id: string): Promise<Task> {
    const response = await apiClient.get<ApiResponse<any>>(`/tasks/${id}`);
    
    if (response.success && response.data) {
      // Convert snake_case to camelCase
      const task = {
        ...response.data,
        dueDate: response.data.due_date ? new Date(response.data.due_date) : undefined,
        createdAt: response.data.created_at ? new Date(response.data.created_at) : new Date(),
        updatedAt: response.data.updated_at ? new Date(response.data.updated_at) : new Date(),
        completedAt: response.data.completed_at ? new Date(response.data.completed_at) : undefined,
        estimatedHours: response.data.estimated_hours,
        actualHours: response.data.actual_hours,
        assignedTo: response.data.assigned_to,
        assignedBy: response.data.assigned_by,
        caseId: response.data.case_id
      };
      return task as Task;
    } else {
      throw new Error(response.message || 'فشل في جلب تفاصيل المهمة');
    }
  }

  static async createTask(taskData: CreateTaskForm): Promise<Task> {
    // Convert camelCase to snake_case for Laravel API
    const apiData = {
      title: taskData.title,
      description: taskData.description,
      type: taskData.type || 'other',
      case_id: taskData.caseId,
      assigned_to: taskData.assignedTo,
      priority: taskData.priority,
      due_date: taskData.dueDate?.toISOString(),
      estimated_hours: taskData.estimatedHours,
    };

    const response = await apiClient.post<ApiResponse<Task>>('/tasks', apiData);
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في إنشاء المهمة');
    }
  }

  static async updateTask(id: string, taskData: Partial<CreateTaskForm>): Promise<Task> {
    const response = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}`, taskData);
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في تحديث المهمة');
    }
  }

  static async deleteTask(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse>(`/tasks/${id}`);
    
    if (!response.success) {
      throw new Error(response.message || 'فشل في حذف المهمة');
    }
  }

  static async updateTaskStatus(id: string, status: string): Promise<Task> {
    const response = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}/status`, { status });
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في تحديث حالة المهمة');
    }
  }

  static async assignTask(id: string, assigneeId: string): Promise<Task> {
    const response = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}/assign`, {
      assigned_to: assigneeId,
    });
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في تعيين المهمة');
    }
  }

  static async getTaskStatistics(): Promise<any> {
    const response = await apiClient.get<ApiResponse>('/tasks/statistics');
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب إحصائيات المهام');
    }
  }

  static async getMyTasks(): Promise<Task[]> {
    const response = await apiClient.get<ApiResponse<Task[]>>('/tasks/my-tasks');
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب مهامي');
    }
  }

  static async getOverdueTasks(): Promise<Task[]> {
    const response = await apiClient.get<ApiResponse<Task[]>>('/tasks/overdue');
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب المهام المتأخرة');
    }
  }

  static async archiveTask(taskId: string): Promise<void> {
    const response = await apiClient.put<ApiResponse>(`/tasks/${taskId}/archive`, {});
    
    if (!response.success) {
      throw new Error(response.message || 'فشل في أرشفة المهمة');
    }
  }
}
