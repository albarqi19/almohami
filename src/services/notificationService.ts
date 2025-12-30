import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NotificationFilters {
  filter?: 'all' | 'unread' | 'read';
  type?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
}

export interface NotificationResponse {
  data: Notification[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  stats: NotificationStats;
}

export class NotificationService {
  /**
   * جلب الإشعارات مع الفلترة والبحث
   */
  static async getNotifications(filters: NotificationFilters = {}): Promise<NotificationResponse> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const endpoint = queryString ? `/notifications?${queryString}` : '/notifications';

    const response = await apiClient.get<ApiResponse<NotificationResponse>>(endpoint);

    if (response.success) {
      // البيانات تأتي مباشرة في response
      const apiResponse = response as any;
      return {
        data: apiResponse.data || [],
        meta: apiResponse.meta || { current_page: 1, last_page: 1, per_page: 20, total: 0 },
        stats: apiResponse.stats || { total: 0, unread: 0, read: 0 }
      };
    } else {
      throw new Error(response.message || 'فشل في جلب الإشعارات');
    }
  }

  /**
   * جلب عدد الإشعارات غير المقروءة
   */
  static async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<ApiResponse<{ count: number }>>('/notifications-count');

    if (response.success && response.data) {
      return response.data.count;
    } else {
      throw new Error(response.message || 'فشل في جلب عدد الإشعارات غير المقروءة');
    }
  }

  /**
   * تحديد إشعار كمقروء
   */
  static async markAsRead(id: number | string): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(`/notifications/${id}/read`);

    if (!response.success) {
      throw new Error(response.message || 'فشل في تحديد الإشعار كمقروء');
    }
  }

  /**
   * تحديد جميع الإشعارات كمقروءة
   */
  static async markAllAsRead(): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>('/notifications/mark-all-read');

    if (!response.success) {
      throw new Error(response.message || 'فشل في تحديد جميع الإشعارات كمقروءة');
    }
  }

  /**
   * حذف إشعار
   */
  static async deleteNotification(id: number | string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/notifications/${id}`);

    if (!response.success) {
      throw new Error(response.message || 'فشل في حذف الإشعار');
    }
  }

  /**
   * حذف جميع الإشعارات المقروءة
   */
  static async clearReadNotifications(): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>('/notifications-clear-read');

    if (!response.success) {
      throw new Error(response.message || 'فشل في حذف الإشعارات المقروءة');
    }
  }
}
