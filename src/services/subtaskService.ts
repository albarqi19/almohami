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
  order: number;
  created_at: string;
  updated_at: string;
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
   * Toggle subtask completion status.
   */
  static async toggleSubtask(subtaskId: string): Promise<Subtask> {
    const response = await apiClient.patch<ApiResponse<Subtask>>(
      `/subtasks/${subtaskId}/toggle`
    );

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في تحديث حالة المهمة الفرعية');
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
