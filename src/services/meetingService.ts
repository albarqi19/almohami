import { apiClient } from '../utils/api';

// ==========================================
// Types - أنواع البيانات
// ==========================================

export interface InternalMeeting {
  id: number;
  tenant_id: number;
  title: string;
  agenda: string | null;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  location: string | null;
  video_meeting_url: string | null;
  video_provider: 'manual' | 'zoom' | 'google_meet' | 'teams' | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  join_button_minutes_before: number;
  join_button_minutes_after: number;
  summary_permission: 'creator_only' | 'all_attendees';
  summary: string | null;
  summary_points: string[] | null;
  summary_decisions: string[] | null;
  summary_tasks: SummaryTask[] | null;
  created_by: number;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  creator?: User;
  participants?: MeetingParticipant[];
}

export interface SummaryTask {
  title: string;
  assignee_id?: number;
  assignee_name?: string;
  due_date?: string;
}

export interface MeetingParticipant {
  id: number;
  meeting_id: number;
  user_id: number;
  status: 'pending' | 'accepted' | 'declined';
  joined_at: string | null;
  left_at: string | null;
  user?: User;
}

export interface ClientMeeting {
  id: number;
  tenant_id: number;
  lawyer_id: number;
  client_id: number | null;
  case_id: number | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  title: string;
  notes: string | null;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  meeting_type: 'in_person' | 'remote';
  location: string | null;
  video_meeting_url: string | null;
  video_provider: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled_by_client' | 'cancelled_by_lawyer' | 'no_show';
  confirmed_at: string | null;
  reminder_sent_at: string | null;
  outcome: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  lawyer?: User;
  client?: User;
  case?: CaseInfo;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar?: string;
}

export interface CaseInfo {
  id: number;
  title: string;
  file_number: string;
}

export interface SmartButtonState {
  status: 'upcoming' | 'join' | 'write_summary' | 'view_summary';
  label: string;
  disabled: boolean;
  countdown?: number;
}

// ==========================================
// Create/Update Data Types
// ==========================================

export interface CreateInternalMeetingData {
  title: string;
  agenda?: string;
  scheduled_at: string;
  duration_minutes: number;
  timezone?: string;
  location?: string;
  video_meeting_url?: string;
  video_provider?: string;
  join_button_minutes_before?: number;
  join_button_minutes_after?: number;
  summary_permission?: 'creator_only' | 'all_attendees';
  participants: number[];
}

export interface UpdateInternalMeetingData {
  title?: string;
  agenda?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  location?: string;
  video_meeting_url?: string;
  video_provider?: string;
  join_button_minutes_before?: number;
  join_button_minutes_after?: number;
  summary_permission?: 'creator_only' | 'all_attendees';
  participants?: number[];
}

export interface SaveSummaryData {
  summary?: string;
  summary_points?: string[];
  summary_decisions?: string[];
  summary_tasks?: SummaryTask[];
}

export interface CreateClientMeetingData {
  lawyer_id?: number;
  client_id?: number;
  case_id?: number;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  title: string;
  notes?: string;
  scheduled_at: string;
  duration_minutes: number;
  timezone?: string;
  meeting_type: 'in_person' | 'remote';
  location?: string;
  video_meeting_url?: string;
}

// ==========================================
// Internal Meeting Service
// ==========================================

export const internalMeetingService = {
  // جلب جميع الاجتماعات الداخلية
  async getAll(params?: { status?: string; from?: string; to?: string }): Promise<InternalMeeting[]> {
    let endpoint = '/meetings/internal';
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.from) queryParams.append('from', params.from);
      if (params.to) queryParams.append('to', params.to);
      const queryString = queryParams.toString();
      if (queryString) endpoint += `?${queryString}`;
    }
    const response = await apiClient.get<{ success: boolean; data: { data: InternalMeeting[] } | InternalMeeting[] }>(endpoint);
    // Handle both paginated and non-paginated responses
    if (response.data && 'data' in response.data && Array.isArray((response.data as any).data)) {
      return (response.data as any).data || [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  // جلب الاجتماعات القادمة
  async getUpcoming(limit: number = 10): Promise<InternalMeeting[]> {
    const response = await apiClient.get<{ success: boolean; data: InternalMeeting[] }>(
      `/meetings/internal/upcoming?limit=${limit}`
    );
    return response.data || [];
  },

  // جلب اجتماع واحد
  async getById(id: number): Promise<InternalMeeting> {
    const response = await apiClient.get<{ success: boolean; data: InternalMeeting }>(
      `/meetings/internal/${id}`
    );
    return response.data;
  },

  // إنشاء اجتماع جديد
  async create(data: CreateInternalMeetingData): Promise<InternalMeeting> {
    const response = await apiClient.post<{ success: boolean; data: InternalMeeting }>(
      '/meetings/internal',
      data
    );
    return response.data;
  },

  // تحديث اجتماع
  async update(id: number, data: UpdateInternalMeetingData): Promise<InternalMeeting> {
    const response = await apiClient.put<{ success: boolean; data: InternalMeeting }>(
      `/meetings/internal/${id}`,
      data
    );
    return response.data;
  },

  // حذف اجتماع
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/meetings/internal/${id}`);
  },

  // إلغاء اجتماع
  async cancel(id: number, reason: string): Promise<InternalMeeting> {
    const response = await apiClient.patch<{ success: boolean; data: InternalMeeting }>(
      `/meetings/internal/${id}/cancel`,
      { reason }
    );
    return response.data;
  },

  // بدء اجتماع
  async start(id: number): Promise<InternalMeeting> {
    const response = await apiClient.patch<{ success: boolean; data: InternalMeeting }>(
      `/meetings/internal/${id}/start`
    );
    return response.data;
  },

  // إنهاء اجتماع
  async complete(id: number): Promise<InternalMeeting> {
    const response = await apiClient.patch<{ success: boolean; data: InternalMeeting }>(
      `/meetings/internal/${id}/complete`
    );
    return response.data;
  },

  // حفظ الملخص
  async saveSummary(id: number, data: SaveSummaryData): Promise<InternalMeeting> {
    const response = await apiClient.post<{ success: boolean; data: InternalMeeting }>(
      `/meetings/internal/${id}/summary`,
      data
    );
    return response.data;
  },

  // جلب حالة الزر الذكي
  async getButtonState(id: number): Promise<SmartButtonState> {
    const response = await apiClient.get<{ success: boolean; data: SmartButtonState }>(
      `/meetings/internal/${id}/button-state`
    );
    return response.data;
  },

  // جلب الإحصائيات
  async getStats(): Promise<{
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    this_week: number;
  }> {
    const response = await apiClient.get<{ success: boolean; data: any }>('/meetings/internal/stats');
    return response.data;
  },
};

// ==========================================
// Client Meeting Service
// ==========================================

export const clientMeetingService = {
  // جلب جميع اجتماعات العملاء
  async getAll(params?: { status?: string; lawyer_id?: number; from?: string; to?: string }): Promise<ClientMeeting[]> {
    let endpoint = '/meetings/client';
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.lawyer_id) queryParams.append('lawyer_id', params.lawyer_id.toString());
      if (params.from) queryParams.append('from', params.from);
      if (params.to) queryParams.append('to', params.to);
      const queryString = queryParams.toString();
      if (queryString) endpoint += `?${queryString}`;
    }
    const response = await apiClient.get<{ success: boolean; data: { data: ClientMeeting[] } | ClientMeeting[] }>(endpoint);
    // Handle both paginated and non-paginated responses
    if (response.data && 'data' in response.data && Array.isArray((response.data as any).data)) {
      return (response.data as any).data || [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  // جلب الاجتماعات القادمة
  async getUpcoming(limit: number = 10): Promise<ClientMeeting[]> {
    const response = await apiClient.get<{ success: boolean; data: ClientMeeting[] }>(
      `/meetings/client/upcoming?limit=${limit}`
    );
    return response.data || [];
  },

  // جلب اجتماع واحد
  async getById(id: number): Promise<ClientMeeting> {
    const response = await apiClient.get<{ success: boolean; data: ClientMeeting }>(
      `/meetings/client/${id}`
    );
    return response.data;
  },

  // إنشاء اجتماع جديد
  async create(data: CreateClientMeetingData): Promise<ClientMeeting> {
    const response = await apiClient.post<{ success: boolean; data: ClientMeeting }>(
      '/meetings/client',
      data
    );
    return response.data;
  },

  // تحديث اجتماع
  async update(id: number, data: Partial<CreateClientMeetingData>): Promise<ClientMeeting> {
    const response = await apiClient.put<{ success: boolean; data: ClientMeeting }>(
      `/meetings/client/${id}`,
      data
    );
    return response.data;
  },

  // إلغاء اجتماع
  async cancel(id: number, reason: string): Promise<ClientMeeting> {
    const response = await apiClient.patch<{ success: boolean; data: ClientMeeting }>(
      `/meetings/client/${id}/cancel`,
      { reason }
    );
    return response.data;
  },

  // إكمال اجتماع
  async complete(id: number, outcome?: string): Promise<ClientMeeting> {
    const response = await apiClient.patch<{ success: boolean; data: ClientMeeting }>(
      `/meetings/client/${id}/complete`,
      { outcome }
    );
    return response.data;
  },

  // تسجيل عدم الحضور
  async markNoShow(id: number): Promise<ClientMeeting> {
    const response = await apiClient.patch<{ success: boolean; data: ClientMeeting }>(
      `/meetings/client/${id}/no-show`
    );
    return response.data;
  },

  // ربط بقضية
  async linkToCase(id: number, caseId: number): Promise<ClientMeeting> {
    const response = await apiClient.patch<{ success: boolean; data: ClientMeeting }>(
      `/meetings/client/${id}/link-case`,
      { case_id: caseId }
    );
    return response.data;
  },
};
