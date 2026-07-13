import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  assigned_to: string | null;
  assignee?: {
    id: string;
    name: string;
  } | null;
  // تتبّع «من كتبها/من أنجزها/من أوقفها» + الإيقاف المؤقت بسبب (#130)
  created_by?: string | number | null;
  creator?: { id: string | number; name: string } | null;
  completed_by_user?: { id: string | number; name: string } | null;
  paused_at?: string | null;
  pause_reason?: string | null;
  paused_by?: string | number | null;
  paused_by_user?: { id: string | number; name: string } | null;
  order: number;
  created_at: string;
  updated_at: string;
}

/** نتيجة إيقاف/استئناف/إنجاز فرعية — task_status لمزامنة حالة المهمة الأم (من الجهتين) */
export interface SubtaskMutationResult {
  subtask: Subtask;
  taskStatus?: string | null;
}

export interface SubtasksResponse {
  subtasks: Subtask[];
  completed_count: number;
  total_count: number;
  progress: number;
}

export interface CreateSubtaskData {
  title: string;
  description?: string;
  assigned_to?: string;
}

export interface UpdateSubtaskData {
  title?: string;
  description?: string;
  assigned_to?: string | null;
}

export interface ReorderItem {
  id: string;
  order: number;
}

export class SubtaskService {
  /**
   * Get all subtasks for a task.
   */
  static async getSubtasks(taskId: string): Promise<SubtasksResponse> {
    const response = await apiClient.get<ApiResponse<SubtasksResponse>>(
      `/tasks/${taskId}/subtasks`
    );

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في جلب المهام الفرعية');
  }

  /**
   * Create a new subtask.
   */
  static async createSubtask(taskId: string, data: CreateSubtaskData): Promise<Subtask> {
    const response = await apiClient.post<ApiResponse<Subtask>>(
      `/tasks/${taskId}/subtasks`,
      data
    );

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في إنشاء المهمة الفرعية');
  }

  /**
   * Update a subtask.
   */
  static async updateSubtask(subtaskId: string, data: UpdateSubtaskData): Promise<Subtask> {
    const response = await apiClient.patch<ApiResponse<Subtask>>(
      `/subtasks/${subtaskId}`,
      data
    );

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في تحديث المهمة الفرعية');
  }

  /**
   * Toggle subtask completion status. إنجاز فرعية موقوفة = استئناف ضمني وقد
   * يستأنف المهمة الأم — لذا نعيد task_status أيضاً.
   */
  static async toggleSubtask(subtaskId: string): Promise<SubtaskMutationResult> {
    const response = await apiClient.patch<ApiResponse<Subtask> & { task_status?: string | null }>(
      `/subtasks/${subtaskId}/toggle`
    );

    if (response.success && response.data) {
      return { subtask: response.data, taskStatus: response.task_status };
    }
    throw new Error(response.message || 'فشل في تحديث حالة المهمة الفرعية');
  }

  /**
   * إيقاف مؤقت لمهمة فرعية بسبب إلزامي (#130) — المهمة الأم تصبح «موقوفة مؤقتاً» تلقائياً.
   */
  static async pauseSubtask(subtaskId: string, reason: string): Promise<SubtaskMutationResult> {
    const response = await apiClient.patch<ApiResponse<Subtask> & { task_status?: string | null }>(
      `/subtasks/${subtaskId}/pause`,
      { reason }
    );

    if (response.success && response.data) {
      return { subtask: response.data, taskStatus: response.task_status };
    }
    throw new Error(response.message || 'فشل في إيقاف المهمة الفرعية');
  }

  /**
   * استئناف فرعية موقوفة — إن كانت الأخيرة تُستأنف المهمة الأم تلقائياً.
   */
  static async resumeSubtask(subtaskId: string): Promise<SubtaskMutationResult> {
    const response = await apiClient.patch<ApiResponse<Subtask> & { task_status?: string | null }>(
      `/subtasks/${subtaskId}/resume`
    );

    if (response.success && response.data) {
      return { subtask: response.data, taskStatus: response.task_status };
    }
    throw new Error(response.message || 'فشل في استئناف المهمة الفرعية');
  }

  /**
   * Reorder subtasks.
   */
  static async reorderSubtasks(taskId: string, items: ReorderItem[]): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(
      `/tasks/${taskId}/subtasks/reorder`,
      { subtasks: items }
    );

    if (!response.success) {
      throw new Error(response.message || 'فشل في إعادة الترتيب');
    }
  }

  /**
   * Delete a subtask.
   */
  static async deleteSubtask(subtaskId: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/subtasks/${subtaskId}`
    );

    if (!response.success) {
      throw new Error(response.message || 'فشل في حذف المهمة الفرعية');
    }
  }
}
