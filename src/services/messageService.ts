import { apiClient } from '../utils/api';
import type { ApiResponse } from '../types';

export interface Message {
  id: number;
  tenant_id: number;
  case_id: number | null;
  sender_id: number;
  recipient_id: number;
  message: string;
  subject: string | null;
  type: 'inquiry' | 'reply' | 'notification' | 'general';
  is_read: boolean;
  read_at: string | null;
  attachments: string[] | null;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
  sender?: {
    id: number;
    name: string;
    avatar: string | null;
    role: string;
  };
  recipient?: {
    id: number;
    name: string;
    avatar: string | null;
    role: string;
  };
  case?: {
    id: number;
    title: string;
    file_number?: string;
  };
}

export interface Conversation {
  case_id: number;
  case: {
    id: number;
    title: string;
    file_number?: string;
  } | null;
  other_party: {
    id: number;
    name: string;
    avatar: string | null;
    role: string;
  };
  last_message: {
    id: number;
    message: string;
    created_at: string;
    is_mine: boolean;
  };
  unread_count: number;
  total_messages: number;
}

export interface Recipient {
  id: number;
  name: string;
  avatar: string | null;
  role: string;
}

export interface SendMessageRequest {
  case_id: number;
  recipient_id: number;
  message: string;
  subject?: string;
  type?: 'inquiry' | 'reply' | 'notification' | 'general';
  parent_id?: number;
}

export interface UnreadCountResponse {
  total: number;
  per_case: { [key: string]: number };
}

export interface CaseMessagesResponse {
  case: {
    id: number;
    title: string;
    file_number?: string;
  };
  messages: {
    data: Message[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export class MessageService {
  /**
   * جلب قائمة المحادثات
   */
  static async getConversations(): Promise<Conversation[]> {
    const response = await apiClient.get<ApiResponse<Conversation[]>>('/client/messages');

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب المحادثات');
    }
  }

  /**
   * جلب رسائل قضية محددة
   */
  static async getCaseMessages(caseId: number, page: number = 1, perPage: number = 50): Promise<CaseMessagesResponse> {
    const response = await apiClient.get<ApiResponse<CaseMessagesResponse>>(
      `/client/messages/case/${caseId}?page=${page}&per_page=${perPage}`
    );

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب الرسائل');
    }
  }

  /**
   * جلب المستلمين المتاحين لقضية
   */
  static async getRecipients(caseId: number): Promise<Recipient[]> {
    const response = await apiClient.get<ApiResponse<Recipient[]>>(`/client/messages/case/${caseId}/recipients`);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب المستلمين');
    }
  }

  /**
   * إرسال رسالة جديدة
   */
  static async sendMessage(messageData: SendMessageRequest): Promise<Message> {
    const response = await apiClient.post<ApiResponse<Message>>('/client/messages', messageData);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في إرسال الرسالة');
    }
  }

  /**
   * تحديد رسالة كمقروءة
   */
  static async markAsRead(messageId: number): Promise<void> {
    const response = await apiClient.put<ApiResponse<any>>(`/client/messages/${messageId}/read`);

    if (!response.success) {
      throw new Error(response.message || 'فشل في تحديث حالة الرسالة');
    }
  }

  /**
   * تحديد جميع رسائل قضية كمقروءة
   */
  static async markCaseAsRead(caseId: number): Promise<number> {
    const response = await apiClient.put<ApiResponse<{ updated_count: number }>>(`/client/messages/case/${caseId}/read-all`);

    if (response.success && response.data) {
      return response.data.updated_count;
    } else {
      throw new Error(response.message || 'فشل في تحديث حالة الرسائل');
    }
  }

  /**
   * جلب عدد الرسائل غير المقروءة
   */
  static async getUnreadCount(): Promise<UnreadCountResponse> {
    const response = await apiClient.get<ApiResponse<UnreadCountResponse>>('/client/messages/unread-count');

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب عدد الرسائل');
    }
  }

  /**
   * حذف رسالة
   */
  static async deleteMessage(messageId: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<any>>(`/client/messages/${messageId}`);

    if (!response.success) {
      throw new Error(response.message || 'فشل في حذف الرسالة');
    }
  }

  // ===== للمستخدمين الآخرين (محامين/مدراء) =====

  /**
   * جلب قائمة المحادثات (للمحامين والمدراء)
   */
  static async getAllConversations(): Promise<Conversation[]> {
    const response = await apiClient.get<ApiResponse<Conversation[]>>('/messages');

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب المحادثات');
    }
  }

  /**
   * جلب جميع رسائل قضية محددة (للمحامين والمدراء - يرى كل الرسائل)
   */
  static async getAllCaseMessages(caseId: number, page: number = 1, perPage: number = 50): Promise<CaseMessagesResponse> {
    const response = await apiClient.get<ApiResponse<CaseMessagesResponse>>(
      `/messages/case/${caseId}/all?page=${page}&per_page=${perPage}`
    );

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب الرسائل');
    }
  }

  /**
   * جلب المستلمين المتاحين لقضية (للمحامين والمدراء)
   */
  static async getRecipientsGeneral(caseId: number): Promise<Recipient[]> {
    const response = await apiClient.get<ApiResponse<Recipient[]>>(`/messages/case/${caseId}/recipients`);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب المستلمين');
    }
  }

  /**
   * تحديد جميع رسائل قضية كمقروءة (للمحامين والمدراء)
   */
  static async markCaseAsReadGeneral(caseId: number): Promise<number> {
    const response = await apiClient.put<ApiResponse<{ updated_count: number }>>(`/messages/case/${caseId}/read-all`);

    if (response.success && response.data) {
      return response.data.updated_count;
    } else {
      throw new Error(response.message || 'فشل في تحديث حالة الرسائل');
    }
  }

  /**
   * إرسال رسالة جديدة (للمحامين والمدراء)
   */
  static async sendMessageGeneral(messageData: SendMessageRequest): Promise<Message> {
    const response = await apiClient.post<ApiResponse<Message>>('/messages', messageData);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في إرسال الرسالة');
    }
  }
}
