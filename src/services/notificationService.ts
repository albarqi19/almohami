import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import type { Notification } from '../types';

export interface NotificationFilters {
  unread_only?: boolean;
  type?: string;
  page?: number;
  limit?: number;
}

export class NotificationService {
  static async getNotifications(filters: NotificationFilters = {}): Promise<PaginatedResponse<Notification>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const queryString = params.toString();
    const endpoint = queryString ? `/notifications?${queryString}` : '/notifications';
    
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Notification>>>(endpoint);
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب الإشعارات');
    }
  }

  static async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    
    if (response.success && response.data) {
      return response.data.count;
    } else {
      throw new Error(response.message || 'فشل في جلب عدد الإشعارات غير المقروءة');
    }
  }

  static async markAsRead(id: string): Promise<void> {
    const response = await apiClient.put<ApiResponse>(`/notifications/${id}/read`);
    
    if (!response.success) {
      throw new Error(response.message || 'فشل في تحديد الإشعار كمقروء');
    }
  }

  static async markAllAsRead(): Promise<void> {
    const response = await apiClient.put<ApiResponse>('/notifications/mark-all-read');
    
    if (!response.success) {
      throw new Error(response.message || 'فشل في تحديد جميع الإشعارات كمقروءة');
    }
  }

  static async deleteNotification(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse>(`/notifications/${id}`);
    
    if (!response.success) {
      throw new Error(response.message || 'فشل في حذف الإشعار');
    }
  }

  static async getUnreadNotifications(): Promise<Notification[]> {
    const response = await apiClient.get<ApiResponse<Notification[]>>('/notifications?unread_only=true');
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب الإشعارات غير المقروءة');
    }
  }
}
