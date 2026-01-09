import { apiClient } from '../utils/api';

// ==========================================
// Types - أنواع البيانات
// ==========================================

export interface TimeSlot {
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

export interface WeeklySchedule {
  sunday: DaySchedule;
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
}

export interface LawyerAvailability {
  id: number;
  tenant_id: number;
  lawyer_id: number;
  weekly_schedule: WeeklySchedule;
  buffer_minutes: number;
  min_booking_hours: number;
  max_booking_days: number;
  allowed_durations: number[];
  default_location: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityException {
  id: number;
  availability_id: number;
  date: string;
  is_blocked: boolean;
  custom_slots: TimeSlot[] | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvailableSlot {
  start: string;
  end: string;
  formatted_start: string;
  formatted_end: string;
}

export interface UpdateAvailabilityData {
  weekly_schedule?: WeeklySchedule;
  buffer_minutes?: number;
  min_booking_hours?: number;
  max_booking_days?: number;
  allowed_durations?: number[];
  default_location?: string;
}

export interface CreateExceptionData {
  date: string;
  is_blocked?: boolean;
  custom_slots?: TimeSlot[];
  reason?: string;
}

// ==========================================
// Default Weekly Schedule
// ==========================================

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  sunday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  monday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  tuesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  wednesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  thursday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  friday: { enabled: false, slots: [] },
  saturday: { enabled: false, slots: [] },
};

// ==========================================
// Availability Service
// ==========================================

export const availabilityService = {
  // جلب إعدادات التوفر
  async get(): Promise<LawyerAvailability> {
    const response = await apiClient.get<{ success: boolean; data: LawyerAvailability }>(
      '/availability'
    );
    return response.data;
  },

  // تحديث إعدادات التوفر
  async update(data: UpdateAvailabilityData): Promise<LawyerAvailability> {
    const response = await apiClient.put<{ success: boolean; data: LawyerAvailability }>(
      '/availability',
      data
    );
    return response.data;
  },

  // جلب الاستثناءات
  async getExceptions(params?: { from?: string; to?: string }): Promise<AvailabilityException[]> {
    let endpoint = '/availability/exceptions';
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.from) queryParams.append('from', params.from);
      if (params.to) queryParams.append('to', params.to);
      const queryString = queryParams.toString();
      if (queryString) endpoint += `?${queryString}`;
    }
    const response = await apiClient.get<{ success: boolean; data: AvailabilityException[] }>(endpoint);
    return response.data || [];
  },

  // إضافة استثناء
  async addException(data: CreateExceptionData): Promise<AvailabilityException> {
    const response = await apiClient.post<{ success: boolean; data: AvailabilityException }>(
      '/availability/exceptions',
      data
    );
    return response.data;
  },

  // حذف استثناء
  async deleteException(id: number): Promise<void> {
    await apiClient.delete(`/availability/exceptions/${id}`);
  },

  // جلب الفترات المتاحة لتاريخ معين
  async getSlots(date: string, duration: number): Promise<AvailableSlot[]> {
    const response = await apiClient.get<{ success: boolean; data: AvailableSlot[] }>(
      `/availability/slots?date=${encodeURIComponent(date)}&duration=${duration}`
    );
    return response.data || [];
  },

  // جلب الأيام المتاحة في شهر معين
  async getAvailableDays(month: string): Promise<string[]> {
    const response = await apiClient.get<{ success: boolean; data: string[] }>(
      `/availability/days?month=${encodeURIComponent(month)}`
    );
    return response.data || [];
  },

  // التحقق من توفر فترة معينة
  async checkSlot(start: string, end: string): Promise<{ available: boolean; conflict?: string }> {
    const response = await apiClient.get<{ success: boolean; data: { available: boolean; conflict?: string } }>(
      `/availability/check-slot?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    );
    return response.data;
  },
};

// ==========================================
// Helper Functions
// ==========================================

export const availabilityHelpers = {
  // تحويل اليوم إلى اسم عربي
  getDayNameArabic(day: keyof WeeklySchedule): string {
    const names: Record<keyof WeeklySchedule, string> = {
      sunday: 'الأحد',
      monday: 'الاثنين',
      tuesday: 'الثلاثاء',
      wednesday: 'الأربعاء',
      thursday: 'الخميس',
      friday: 'الجمعة',
      saturday: 'السبت',
    };
    return names[day];
  },

  // تحويل الوقت من 24 ساعة إلى 12 ساعة
  formatTime12h(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'م' : 'ص';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  },

  // تنسيق المدة
  formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return hours === 1 ? 'ساعة واحدة' : `${hours} ساعات`;
    return `${hours} ساعة و ${mins} دقيقة`;
  },

  // التحقق من تداخل الفترات
  slotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    return slot1.start < slot2.end && slot2.start < slot1.end;
  },

  // دمج الفترات المتجاورة
  mergeSlots(slots: TimeSlot[]): TimeSlot[] {
    if (slots.length === 0) return [];

    const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
    const merged: TimeSlot[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      if (current.start <= last.end) {
        last.end = current.end > last.end ? current.end : last.end;
      } else {
        merged.push(current);
      }
    }

    return merged;
  },
};
