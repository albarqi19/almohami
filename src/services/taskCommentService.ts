import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';
import type { TaskComment, CreateTaskCommentForm } from '../types';
import type { RaedMessageMeta, RaedState } from '../types/legalServices';

/** أقصى طول للتعليق — يطابق TaskComment::MAX_LENGTH في الخادم؛ تغييرُ أحدهما يلزمه الآخر. */
export const TASK_COMMENT_MAX_LENGTH = 5000;

/** رسالة محادثة فريق المهمة — نفس عقد CaseTeamMessageItem مع task_id وحقل comment */
export interface TaskChatMessage {
  id: number;
  task_id: number;
  user_id: number | null;
  author_type?: 'user' | 'assistant';
  comment: string;
  mentions: (number | string)[] | null;
  meta?: RaedMessageMeta | null;
  created_at: string;
  user?: { id: number; name: string };
}

export interface TaskChatPayload {
  messages: TaskChatMessage[];
  raed: RaedState | null;
}

export interface TaskChatSendResult {
  message: TaskChatMessage;
  raed: { message?: TaskChatMessage | null; session?: RaedState['session']; thinking?: boolean } | null;
}

export class TaskCommentService {
  /** محادثة المهمة (تصاعدياً) + حالة رائد — لواجهة الشات الجديدة */
  static async getChat(taskId: string): Promise<TaskChatPayload> {
    const response = await apiClient.get<ApiResponse<TaskChatMessage[]> & { raed?: RaedState | null }>(
      `/tasks/${taskId}/comments`
    );
    if (response.success) {
      return { messages: response.data ?? [], raed: response.raed ?? null };
    }
    throw new Error(response.message || 'فشل في جلب المحادثة');
  }

  /** إرسال رسالة في محادثة المهمة — mentions تقبل 'raed' لاستدعاء رائد الذكي */
  static async sendChatMessage(taskId: string, comment: string, mentions: (string | number)[]): Promise<TaskChatSendResult> {
    const response = await apiClient.post<ApiResponse<TaskChatMessage> & { raed?: TaskChatSendResult['raed'] }>(
      `/tasks/${taskId}/comments`,
      { comment, mentions }
    );
    if (response.success && response.data) {
      return { message: response.data, raed: response.raed ?? null };
    }
    throw new Error(response.message || 'فشل في إرسال الرسالة');
  }

  /** تنفيذ اقتراح رائد القابل للنقر — بصلاحية الناقر (tasks.edit على المسار) */
  static async executeRaedAction(taskId: string, commentId: number, actionIndex: number): Promise<any> {
    const response = await apiClient.post<ApiResponse<TaskChatMessage>>(
      `/tasks/${taskId}/comments/raed-action`,
      { comment_id: commentId, action_index: actionIndex }
    );
    if (response.success) return response;
    throw new Error(response.message || 'تعذّر تنفيذ الاقتراح');
  }

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
