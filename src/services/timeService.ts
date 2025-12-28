import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  description: string | null;
  is_billable: boolean;
  hourly_rate: number | null;
  user?: {
    id: string;
    name: string;
  };
  task?: {
    id: string;
    title: string;
    case_id?: string;
    case?: {
      id: string;
      title: string;
    };
  };
  created_at: string;
  updated_at: string;
}

export interface TaskTimeEntriesResponse {
  entries: TimeEntry[];
  total_seconds: number;
  total_formatted: string;
  has_active_timer: boolean;
}

export interface ActiveTimerResponse {
  entry: TimeEntry;
  elapsed_seconds: number;
  formatted: string;
}

export interface TimeSummary {
  period: string;
  total_seconds: number;
  total_formatted: string;
  billable_seconds: number;
  billable_formatted: string;
  entries_count: number;
  by_task: Array<{
    task: { id: string; title: string };
    total_seconds: number;
    entries_count: number;
  }>;
}

export class TimeService {
  /**
   * Start a new timer for a task.
   */
  static async startTimer(taskId: string): Promise<TimeEntry> {
    const response = await apiClient.post<ApiResponse<TimeEntry>>(
      `/tasks/${taskId}/time/start`
    );

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في بدء التايمر');
  }

  /**
   * Stop an active timer.
   */
  static async stopTimer(entryId: string, description?: string): Promise<TimeEntry> {
    const response = await apiClient.post<ApiResponse<TimeEntry>>(
      `/tasks/0/time/stop/${entryId}`,
      { description }
    );

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في إيقاف التايمر');
  }

  /**
   * Get time entries for a task.
   */
  static async getTaskEntries(taskId: string): Promise<TaskTimeEntriesResponse> {
    const response = await apiClient.get<ApiResponse<TaskTimeEntriesResponse>>(
      `/tasks/${taskId}/time/entries`
    );

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في جلب سجلات الوقت');
  }

  /**
   * Get current user's active timer.
   */
  static async getActiveTimer(): Promise<ActiveTimerResponse | null> {
    const response = await apiClient.get<ApiResponse<ActiveTimerResponse | null>>(
      '/time-entries/active'
    );

    if (response.success) {
      return response.data || null;
    }
    throw new Error(response.message || 'فشل في جلب التايمر النشط');
  }

  /**
   * Update a time entry.
   */
  static async updateEntry(
    entryId: string,
    data: { description?: string; is_billable?: boolean; hourly_rate?: number }
  ): Promise<TimeEntry> {
    const response = await apiClient.patch<ApiResponse<TimeEntry>>(
      `/time-entries/${entryId}`,
      data
    );

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في تحديث السجل');
  }

  /**
   * Delete a time entry.
   */
  static async deleteEntry(entryId: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/time-entries/${entryId}`
    );

    if (!response.success) {
      throw new Error(response.message || 'فشل في حذف السجل');
    }
  }

  /**
   * Get user's time summary.
   */
  static async getMySummary(period: 'day' | 'week' | 'month' = 'week'): Promise<TimeSummary> {
    const response = await apiClient.get<ApiResponse<TimeSummary>>(
      `/time-entries/my-summary?period=${period}`
    );

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في جلب الملخص');
  }

  /**
   * Format seconds to HH:MM:SS.
   */
  static formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Format seconds to human readable format (Arabic).
   */
  static formatDurationArabic(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0 && minutes > 0) {
      return `${hours} ساعة و ${minutes} دقيقة`;
    } else if (hours > 0) {
      return `${hours} ساعة`;
    } else if (minutes > 0) {
      return `${minutes} دقيقة`;
    }
    return 'أقل من دقيقة';
  }
}
