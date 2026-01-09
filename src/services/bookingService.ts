import { apiClient } from '../utils/api';
import type { AvailableSlot } from './availabilityService';

// ==========================================
// Types - أنواع البيانات
// ==========================================

export interface BookingLink {
  id: number;
  tenant_id: number;
  lawyer_id: number;
  client_id: number | null;
  case_id: number | null;
  token: string;
  expires_at: string;
  is_used: boolean;
  meeting_id: number | null;
  created_at: string;
  updated_at: string;
  url?: string;
  lawyer?: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  };
  client?: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  };
  case?: {
    id: number;
    title: string;
    file_number: string;
  };
}

export interface PublicBookingInfo {
  lawyer_name: string;
  lawyer_avatar: string | null;
  office_name: string;
  office_logo: string | null;
  allowed_durations: number[];
  meeting_types: ('in_person' | 'remote')[];
  default_location: string | null;
  min_booking_hours: number;
  max_booking_days: number;
  timezone: string;
  client_name?: string;
  case_title?: string;
}

export interface CreateBookingLinkData {
  client_id?: number;
  case_id?: number;
  send_notification?: boolean;
  notification_channel?: 'whatsapp' | 'email' | 'both';
}

export interface PublicBookingData {
  client_name: string;
  client_email: string;
  client_phone: string;
  date: string;
  time: string;
  duration: number;
  meeting_type: 'in_person' | 'remote';
  notes?: string;
}

// ==========================================
// Booking Link Service (Protected - للمحامين)
// ==========================================

export const bookingLinkService = {
  // جلب جميع روابط الحجز
  async getAll(params?: { is_used?: boolean; client_id?: number }): Promise<BookingLink[]> {
    let endpoint = '/booking-links';
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.is_used !== undefined) queryParams.append('is_used', params.is_used.toString());
      if (params.client_id) queryParams.append('client_id', params.client_id.toString());
      const queryString = queryParams.toString();
      if (queryString) endpoint += `?${queryString}`;
    }
    const response = await apiClient.get<{ success: boolean; data: BookingLink[] }>(endpoint);
    return response.data || [];
  },

  // جلب رابط واحد
  async getById(id: number): Promise<BookingLink> {
    const response = await apiClient.get<{ success: boolean; data: BookingLink }>(
      `/booking-links/${id}`
    );
    return response.data;
  },

  // إنشاء رابط جديد
  async create(data: CreateBookingLinkData): Promise<BookingLink> {
    const response = await apiClient.post<{ success: boolean; data: BookingLink }>(
      '/booking-links',
      data
    );
    return response.data;
  },

  // حذف رابط
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/booking-links/${id}`);
  },

  // إعادة إرسال الرابط
  async resend(id: number, channel: 'whatsapp' | 'email' | 'both'): Promise<void> {
    await apiClient.post(`/booking-links/${id}/resend`, { channel });
  },
};

// ==========================================
// Public Booking Service (للعملاء - بدون مصادقة)
// ==========================================

const API_BASE_URL = 'https://api.alraedlaw.com/api/v1';

async function publicRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const publicBookingService = {
  // جلب معلومات صفحة الحجز
  async getBookingInfo(token: string): Promise<PublicBookingInfo> {
    const response = await publicRequest<{ success: boolean; data: PublicBookingInfo }>(
      `/public/booking/${token}`
    );
    return response.data;
  },

  // جلب الأيام المتاحة
  async getAvailableDays(token: string, month: string): Promise<string[]> {
    const response = await publicRequest<{ success: boolean; data: string[] }>(
      `/public/booking/${token}/days?month=${month}`
    );
    return response.data || [];
  },

  // جلب الفترات المتاحة ليوم معين
  async getAvailableSlots(token: string, date: string, duration: number): Promise<AvailableSlot[]> {
    const response = await publicRequest<{ success: boolean; data: AvailableSlot[] }>(
      `/public/booking/${token}/slots?date=${date}&duration=${duration}`
    );
    return response.data || [];
  },

  // إتمام الحجز
  async book(token: string, data: PublicBookingData): Promise<{
    meeting_id: number;
    message: string;
    meeting_details: {
      title: string;
      date: string;
      time: string;
      duration: number;
      location: string | null;
      meeting_type: string;
    };
  }> {
    const response = await publicRequest<{
      success: boolean;
      data: {
        meeting_id: number;
        message: string;
        meeting_details: any;
      };
    }>(`/public/booking/${token}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // إلغاء الحجز
  async cancel(token: string, reason: string): Promise<{ message: string }> {
    const response = await publicRequest<{ success: boolean; data: { message: string } }>(
      `/public/booking/${token}/cancel`,
      {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      }
    );
    return response.data;
  },
};

// ==========================================
// Helper Functions
// ==========================================

export const bookingHelpers = {
  // التحقق من صلاحية الرابط
  isLinkValid(link: BookingLink): boolean {
    if (link.is_used) return false;
    const expiresAt = new Date(link.expires_at);
    return expiresAt > new Date();
  },

  // حساب الوقت المتبقي لانتهاء الرابط
  getTimeUntilExpiry(expiresAt: string): string {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'منتهي الصلاحية';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} يوم${days > 1 ? '' : ''}`;
    if (hours > 0) return `${hours} ساعة`;
    return 'أقل من ساعة';
  },

  // نسخ الرابط للحافظة
  async copyLinkToClipboard(url: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  },

  // إنشاء رابط WhatsApp للمشاركة
  createWhatsAppShareLink(url: string, clientName?: string): string {
    const message = clientName
      ? `مرحباً ${clientName}، يمكنك حجز موعد من خلال الرابط التالي:\n${url}`
      : `يمكنك حجز موعد من خلال الرابط التالي:\n${url}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  },

  // إنشاء رابط بريد إلكتروني للمشاركة
  createEmailShareLink(url: string, clientEmail?: string, lawyerName?: string): string {
    const subject = 'رابط حجز موعد';
    const body = `مرحباً،\n\nيمكنك حجز موعد مع ${lawyerName || 'المحامي'} من خلال الرابط التالي:\n${url}\n\nمع أطيب التحيات`;
    const mailto = clientEmail ? `mailto:${clientEmail}` : 'mailto:';
    return `${mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  },
};
