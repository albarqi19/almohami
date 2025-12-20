import { apiClient } from '../utils/api';
import type { ApiResponse } from '../types';

export interface Message {
  id: string;
  subject: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  case_id?: string;
  is_read: boolean;
  sent_at: string;
  read_at?: string;
}

export interface MessageRequest {
  subject: string;
  content: string;
  receiver_id: string;
  case_id?: string;
}

export class MessageService {
  static async sendMessage(messageData: MessageRequest): Promise<Message> {
    const response = await apiClient.post<ApiResponse<Message>>('/messages', messageData);
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في إرسال الرسالة');
    }
  }

  static async getMessages(caseId?: string): Promise<Message[]> {
    const url = caseId ? `/messages?case_id=${caseId}` : '/messages';
    const response = await apiClient.get<ApiResponse<Message[]>>(url);
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب الرسائل');
    }
  }

  static async markAsRead(messageId: string): Promise<void> {
    const response = await apiClient.put<ApiResponse<any>>(`/messages/${messageId}/read`);
    
    if (!response.success) {
      throw new Error(response.message || 'فشل في تحديث حالة الرسالة');
    }
  }

  static async deleteMessage(messageId: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<any>>(`/messages/${messageId}`);
    
    if (!response.success) {
      throw new Error(response.message || 'فشل في حذف الرسالة');
    }
  }
}
