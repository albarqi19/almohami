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
  // نافذة الفرعية: موعدها وعدّاداتها (تخص الفرعية وحدها، لا تصل To Do)
  due_date?: string | null;
  steps_total?: number;
  steps_done?: number;
  comments_count?: number;
  documents_count?: number;
}

export interface SubtaskStep {
  id: number;
  subtask_id: number;
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by_user?: { id: number; name: string } | null;
  order: number;
}

export interface SubtaskComment {
  id: number;
  subtask_id: number;
  user_id: number | null;
  body: string;
  mentions: number[] | null;
  created_at: string;
  user?: { id: number; name: string } | null;
}

export interface SubtaskDocument {
  id: number | string;
  title: string;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  external_url?: string | null;
  created_at?: string;
}

export interface SubtaskDetail {
  subtask: Subtask;
  task: { id: number; title: string; status: string; project_id: number | null; case_id: number | null };
  steps: SubtaskStep[];
  steps_total: number;
  steps_done: number;
  comments: SubtaskComment[];
  documents: SubtaskDocument[];
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
  due_date?: string | null;
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

  // ── نافذة الفرعية ──────────────────────────────────────────

  static async getSubtask(subtaskId: string | number): Promise<SubtaskDetail> {
    const response = await apiClient.get<ApiResponse<SubtaskDetail>>(`/subtasks/${subtaskId}`);
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'تعذر فتح المهمة الفرعية');
  }

  static async addStep(subtaskId: string | number, title: string): Promise<SubtaskStep> {
    const response = await apiClient.post<ApiResponse<SubtaskStep>>(`/subtasks/${subtaskId}/steps`, { title });
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'تعذر إضافة الخطوة');
  }

  static async updateStep(subtaskId: string | number, stepId: number, data: { title?: string; is_completed?: boolean }): Promise<SubtaskStep> {
    const response = await apiClient.patch<ApiResponse<SubtaskStep>>(`/subtasks/${subtaskId}/steps/${stepId}`, data);
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'تعذر تحديث الخطوة');
  }

  static async deleteStep(subtaskId: string | number, stepId: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse>(`/subtasks/${subtaskId}/steps/${stepId}`);
    if (!response.success) throw new Error(response.message || 'تعذر حذف الخطوة');
  }

  static async addComment(subtaskId: string | number, body: string, mentions?: number[]): Promise<SubtaskComment> {
    const response = await apiClient.post<ApiResponse<SubtaskComment>>(`/subtasks/${subtaskId}/comments`, { body, mentions });
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'تعذر إضافة التعليق');
  }

  static async deleteComment(subtaskId: string | number, commentId: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse>(`/subtasks/${subtaskId}/comments/${commentId}`);
    if (!response.success) throw new Error(response.message || 'تعذر حذف التعليق');
  }

  static async uploadDocument(subtaskId: string | number, file: File): Promise<SubtaskDocument> {
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post<ApiResponse<SubtaskDocument>>(`/subtasks/${subtaskId}/documents`, form);
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'تعذر رفع المرفق');
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
