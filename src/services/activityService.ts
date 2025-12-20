import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import type { Activity } from '../types';

export interface ActivityFilters {
  case_id?: string;
  task_id?: string;
  user_id?: string;
  action?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
  from_date?: string;
  to_date?: string;
}

export interface CreateActivityData {
  title?: string;
  action: string;
  description?: string;
  case_id?: string;
  task_id?: string;
  metadata?: Record<string, any>;
}

export class ActivityService {
  static async getActivities(filters: ActivityFilters = {}): Promise<PaginatedResponse<Activity>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const queryString = params.toString();
    const endpoint = queryString ? `/activities?${queryString}` : '/activities';
    
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Activity>>>(endpoint);
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب الأنشطة');
    }
  }

  static async getActivity(id: string): Promise<Activity> {
    const response = await apiClient.get<ApiResponse<Activity>>(`/activities/${id}`);
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب تفاصيل النشاط');
    }
  }

  static async createActivity(activityData: CreateActivityData): Promise<Activity> {
    const response = await apiClient.post<ApiResponse<Activity>>('/activities', activityData);
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في إنشاء النشاط');
    }
  }

  static async getCaseActivities(caseId: string): Promise<Activity[]> {
    const response = await apiClient.get<ApiResponse<Activity[]>>(`/cases/${caseId}/activities`);
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب أنشطة القضية');
    }
  }

  static async getTaskActivities(taskId: string): Promise<Activity[]> {
    const response = await apiClient.get<ApiResponse<Activity[]>>(`/tasks/${taskId}/activities`);
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب أنشطة المهمة');
    }
  }

  static async getUserActivities(userId: string): Promise<Activity[]> {
    const response = await apiClient.get<ApiResponse<Activity[]>>(`/users/${userId}/activities`);
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب أنشطة المستخدم');
    }
  }

  static async getRecentActivities(limit: number = 10): Promise<Activity[]> {
    const response = await apiClient.get<ApiResponse<Activity[]>>(`/activities/recent?limit=${limit}`);
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب الأنشطة الأخيرة');
    }
  }

  // Client-specific methods
  static async getClientTimeline(caseId: string): Promise<Activity[]> {
    const response = await apiClient.get<ApiResponse<Activity[]>>(`/client/cases/${caseId}/timeline`);
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب الخط الزمني');
    }
  }
}
