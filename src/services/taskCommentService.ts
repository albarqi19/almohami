import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';
import type { TaskComment, CreateTaskCommentForm } from '../types';

export class TaskCommentService {
  static async getTaskComments(taskId: string): Promise<TaskComment[]> {
    const response = await apiClient.get<ApiResponse<TaskComment[]>>(`/tasks/${taskId}/comments`);
    
    if (response.success && response.data) {
      // Convert snake_case to camelCase
      return response.data.map((comment: any) => ({
        ...comment,
        taskId: comment.task_id,
        userId: comment.user_id,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at
      }));
    } else {
      throw new Error(response.message || 'فشل في جلب التعليقات');
    }
  }

  static async createTaskComment(taskId: string, commentData: CreateTaskCommentForm): Promise<TaskComment> {
    const response = await apiClient.post<ApiResponse<TaskComment>>(`/tasks/${taskId}/comments`, commentData);
    
    if (response.success && response.data) {
      // Convert snake_case to camelCase
      const comment = response.data as any;
      return {
        ...comment,
        taskId: comment.task_id,
        userId: comment.user_id,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at
      };
    } else {
      throw new Error(response.message || 'فشل في إضافة التعليق');
    }
  }

  static async updateTaskComment(taskId: string, commentId: string, commentData: CreateTaskCommentForm): Promise<TaskComment> {
    const response = await apiClient.put<ApiResponse<TaskComment>>(`/tasks/${taskId}/comments/${commentId}`, commentData);
    
    if (response.success && response.data) {
      // Convert snake_case to camelCase
      const comment = response.data as any;
      return {
        ...comment,
        taskId: comment.task_id,
        userId: comment.user_id,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at
      };
    } else {
      throw new Error(response.message || 'فشل في تحديث التعليق');
    }
  }

  static async deleteTaskComment(taskId: string, commentId: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse>(`/tasks/${taskId}/comments/${commentId}`);
    
    if (!response.success) {
      throw new Error(response.message || 'فشل في حذف التعليق');
    }
  }
}
