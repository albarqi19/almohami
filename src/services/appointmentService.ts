import type { Appointment, AppointmentType, AppointmentStatus } from '../types';

const API_BASE_URL = 'https://api.alraedlaw.com/api/v1';

// دالة مساعدة لإجراء الطلبات
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export interface CreateAppointmentData {
  case_id: number;
  title: string;
  description?: string;
  type: AppointmentType;
  scheduled_at: string; // ISO date string
  duration_minutes?: number;
  location?: string;
  attendees?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  reminders?: number[]; // array of minutes before appointment
}

export interface UpdateAppointmentData {
  title?: string;
  description?: string;
  type?: AppointmentType;
  scheduled_at?: string;
  duration_minutes?: number;
  location?: string;
  attendees?: string[];
  status?: AppointmentStatus;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  reminders?: number[];
  outcome?: string;
  cancellation_reason?: string;
}

export const appointmentService = {
  // جلب جميع المواعيد للقضية
  async getCaseAppointments(caseId: number): Promise<Appointment[]> {
    const response = await apiRequest<{ data: Appointment[] }>(`/appointments/case/${caseId}`);
    return response.data;
  },

  // جلب موعد واحد
  async getAppointment(appointmentId: number): Promise<Appointment> {
    const response = await apiRequest<{ data: Appointment }>(`/appointments/${appointmentId}`);
    return response.data;
  },

  // إنشاء موعد جديد
  async createAppointment(data: CreateAppointmentData): Promise<Appointment> {
    const response = await apiRequest<{ data: Appointment }>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // تحديث موعد
  async updateAppointment(appointmentId: number, data: UpdateAppointmentData): Promise<Appointment> {
    const response = await apiRequest<{ data: Appointment }>(`/appointments/${appointmentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // حذف موعد
  async deleteAppointment(appointmentId: number): Promise<void> {
    await apiRequest(`/appointments/${appointmentId}`, {
      method: 'DELETE',
    });
  },

  // تأجيل موعد
  async rescheduleAppointment(appointmentId: number, newDateTime: string): Promise<Appointment> {
    const response = await apiRequest<{ data: Appointment }>(`/appointments/${appointmentId}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify({ scheduled_at: newDateTime }),
    });
    return response.data;
  },

  // إلغاء موعد
  async cancelAppointment(appointmentId: number, reason?: string): Promise<Appointment> {
    const response = await apiRequest<{ data: Appointment }>(`/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ cancellation_reason: reason }),
    });
    return response.data;
  },

  // تأكيد موعد
  async confirmAppointment(appointmentId: number): Promise<Appointment> {
    const response = await apiRequest<{ data: Appointment }>(`/appointments/${appointmentId}/confirm`, {
      method: 'PATCH',
    });
    return response.data;
  },

  // بدء موعد
  async startAppointment(appointmentId: number): Promise<Appointment> {
    const response = await apiRequest<{ data: Appointment }>(`/appointments/${appointmentId}/start`, {
      method: 'PATCH',
    });
    return response.data;
  },

  // إكمال موعد
  async completeAppointment(appointmentId: number, outcome?: string): Promise<Appointment> {
    const response = await apiRequest<{ data: Appointment }>(`/appointments/${appointmentId}/complete`, {
      method: 'PATCH',
      body: JSON.stringify({ outcome }),
    });
    return response.data;
  },

  // جلب المواعيد القادمة
  async getUpcomingAppointments(limit: number = 5): Promise<Appointment[]> {
    const response = await apiRequest<{ data: Appointment[] }>(`/appointments/upcoming?limit=${limit}`);
    return response.data;
  },

  // جلب المواعيد المتأخرة
  async getOverdueAppointments(): Promise<Appointment[]> {
    const response = await apiRequest<{ data: Appointment[] }>('/appointments/overdue');
    return response.data;
  },

  // جلب الإحصائيات
  async getAppointmentStats(): Promise<{
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    overdue: number;
  }> {
    const response = await apiRequest<{
      data: {
        total: number;
        scheduled: number;
        completed: number;
        cancelled: number;
        overdue: number;
      }
    }>('/appointments/stats');
    return response.data;
  }
};
