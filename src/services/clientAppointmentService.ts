import { apiClient } from '../utils/api';

/**
 * مواعيدُ العميل مع المكتب — مرآةُ `ClientAppointmentPresenter` في الباك.
 */
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled_by_client' | 'cancelled_by_lawyer' | 'no_show';
export type MeetingType = 'in_person' | 'remote';

export interface CandidateLawyer { id: number; name: string; is_relationship_manager: boolean }

export interface ClientAppointment {
  id: number;
  title: string | null;
  scheduled_at: string | null;
  date: string | null;
  time: string | null;
  end_time: string | null;
  duration_minutes: number;
  meeting_type: MeetingType;
  meeting_type_label: string;
  location: string | null;
  video_meeting_url: string | null;
  status: AppointmentStatus;
  status_label: string;
  is_upcoming: boolean;
  can_cancel: boolean;
  notes: string | null;
  cancellation_reason: string | null;
  lawyer: { id: number; name: string } | null;
  case: { id: number; title: string; file_number?: string | null } | null;
  created_at: string | null;
}

export interface AvailableDay { date: string; day_name: string; has_slots: boolean }
export interface AvailableSlot { start: string; end: string; datetime: string }

export interface DaysResponse {
  days: AvailableDay[];
  window: { from: string; to: string };
  allowedDurations: number[];
  defaultLocation: string | null;
}

export interface AppointmentRequestInput {
  lawyer_id: number;
  date: string;
  time: string;
  duration: number;
  meeting_type: MeetingType;
  title?: string;
  notes?: string;
}

interface Res<T> { success: boolean; message?: string; data: T }

export const ClientAppointmentService = {
  async list(): Promise<{ upcoming: ClientAppointment[]; past: ClientAppointment[]; lawyers: CandidateLawyer[] }> {
    const res = await apiClient.get<Res<{ upcoming: ClientAppointment[]; past: ClientAppointment[] }> & { lawyers: CandidateLawyer[] }>('/client/meetings');
    if (!res.success) throw new Error(res.message || 'تعذّر جلب المواعيد');
    return { upcoming: res.data.upcoming, past: res.data.past, lawyers: res.lawyers };
  },

  async lawyers(): Promise<CandidateLawyer[]> {
    const res = await apiClient.get<Res<CandidateLawyer[]>>('/client/meetings/lawyers');
    if (!res.success) throw new Error(res.message || 'تعذّر جلب المحامين');
    return res.data;
  },

  async days(lawyerId: number, month?: string): Promise<DaysResponse> {
    const qs = new URLSearchParams({ lawyer_id: String(lawyerId) });
    if (month) qs.set('month', month);
    const res = await apiClient.get<Res<AvailableDay[]> & { window: { from: string; to: string }; allowed_durations: number[]; default_location: string | null }>(`/client/meetings/days?${qs.toString()}`);
    if (!res.success) throw new Error(res.message || 'تعذّر جلب الأيام المتاحة');
    return { days: res.data, window: res.window, allowedDurations: res.allowed_durations, defaultLocation: res.default_location };
  },

  async slots(lawyerId: number, date: string, duration: number): Promise<AvailableSlot[]> {
    const qs = new URLSearchParams({ lawyer_id: String(lawyerId), date, duration: String(duration) });
    const res = await apiClient.get<Res<AvailableSlot[]>>(`/client/meetings/slots?${qs.toString()}`);
    if (!res.success) throw new Error(res.message || 'تعذّر جلب الأوقات المتاحة');
    return res.data;
  },

  async request(input: AppointmentRequestInput): Promise<ClientAppointment> {
    const res = await apiClient.post<Res<ClientAppointment>>('/client/meetings', input);
    if (!res.success) throw new Error(res.message || 'تعذّر إرسال طلب الموعد');
    return res.data;
  },

  async cancel(id: number, reason?: string): Promise<ClientAppointment> {
    const res = await apiClient.patch<Res<ClientAppointment>>(`/client/meetings/${id}/cancel`, { reason });
    if (!res.success) throw new Error(res.message || 'تعذّر إلغاء الموعد');
    return res.data;
  },
};

const LONG = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const SHORT = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { weekday: 'short', day: 'numeric', month: 'short' });
const DAY_NUM = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { day: 'numeric' });
const MONTH_SHORT = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { month: 'short' });
const WEEKDAY = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { weekday: 'long' });

export function parseYmd(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDayLong(iso: string | null | undefined): string {
  const d = parseYmd(iso);
  return d ? LONG.format(d) : '—';
}

export function formatDayShort(iso: string | null | undefined): string {
  const d = parseYmd(iso);
  return d ? SHORT.format(d) : '—';
}

export function dayParts(iso: string | null | undefined): { day: string; month: string; weekday: string } | null {
  const d = parseYmd(iso);
  return d ? { day: DAY_NUM.format(d), month: MONTH_SHORT.format(d), weekday: WEEKDAY.format(d) } : null;
}

export function durationLabel(minutes: number): string {
  if (minutes === 60) return 'ساعة';
  if (minutes === 90) return 'ساعة ونصف';
  if (minutes === 120) return 'ساعتان';
  return `${minutes} دقيقة`;
}
