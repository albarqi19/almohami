import { apiClient, API_BASE_URL } from '../utils/api';

/**
 * جلساتُ القضايا في بوابة العميل — مرآةُ `ClientSessionQuery::present` في الباك.
 * الحقولُ هنا هي كلُّ ما يصل العميل؛ لا ضبطَ ولا ملاحظاتٍ ولا رابطَ جلسةٍ مرئية.
 */
export type SessionScope = 'today' | 'upcoming' | 'past';
export type SessionStatus = 'today' | 'upcoming' | 'ended' | 'cancelled';

export interface ClientSession {
  id: number;
  case_id: number;
  case: { id: number; title: string; file_number?: string | null } | null;
  session_type?: string | null;
  /** ميلادي ISO (YYYY-MM-DD) أو null إن لم يُعرف إلا الهجري */
  date: string | null;
  date_hijri: string | null;
  time: string | null;
  court?: string | null;
  department?: string | null;
  method?: string | null;
  location?: string | null;
  degree?: string | null;
  is_video_conference: boolean;
  status: SessionStatus;
  status_label: string;
  najiz_status?: string | null;
  days_remaining: number | null;
  report: { sent: boolean; sent_at: string | null; has_file: boolean };
  case_access_revoked: boolean;
}

export interface ClientSessionsPage {
  rows: ClientSession[];
  total: number;
  page: number;
  lastPage: number;
  counts: Record<SessionScope, number>;
  today: string;
}

interface ListResponse {
  success: boolean;
  message?: string;
  data: { data: ClientSession[]; total: number; current_page: number; last_page: number };
  counts: Record<SessionScope, number>;
  today: string;
}

interface ByCaseResponse {
  success: boolean;
  message?: string;
  data: ClientSession[];
  today: string;
}

export const SCOPE_LABELS: Record<SessionScope, string> = {
  today: 'اليوم',
  upcoming: 'القادمة',
  past: 'السابقة',
};

export const ClientSessionService = {
  async list(scope: SessionScope, page = 1, perPage = 20): Promise<ClientSessionsPage> {
    const res = await apiClient.get<ListResponse>(`/client/sessions?scope=${scope}&page=${page}&per_page=${perPage}`);
    if (!res.success) throw new Error(res.message || 'تعذّر جلب الجلسات');
    return {
      rows: res.data.data,
      total: res.data.total,
      page: res.data.current_page,
      lastPage: res.data.last_page,
      counts: res.counts,
      today: res.today,
    };
  },

  async byCase(caseId: number | string): Promise<{ rows: ClientSession[]; today: string }> {
    const res = await apiClient.get<ByCaseResponse>(`/client/cases/${caseId}/sessions`);
    if (!res.success) throw new Error(res.message || 'تعذّر جلب جلسات القضية');
    return { rows: res.data, today: res.today };
  },

  /**
   * تنزيلُ تقرير الجلسة كما أُرسل (PDF محفوظ عند الإرسال). المسارُ خلف المصادقة،
   * فلا يصلح `window.open` — نجلبه بالتوكن ثم نحفظه.
   */
  async downloadReport(session: ClientSession): Promise<void> {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_BASE_URL}/client/sessions/${session.id}/report`, {
      headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/pdf' } : { Accept: 'application/pdf' },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || 'تعذّر تنزيل التقرير');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير-جلسة-${session.date || session.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

/** تحليلُ YYYY-MM-DD بالتوقيت المحلي — `new Date('2026-09-16')` يُنشئه بتوقيت زولو فيزيح يوماً في بعض المناطق. */
export function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

const GREGORIAN_LONG = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' });
const WEEKDAY = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { weekday: 'long' });
const DAY_NUM = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { day: 'numeric' });
const MONTH_SHORT = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { month: 'short' });

export function formatSessionDate(session: Pick<ClientSession, 'date' | 'date_hijri'>): string {
  const d = parseIsoDate(session.date);
  if (d) return GREGORIAN_LONG.format(d);
  return session.date_hijri ? `${session.date_hijri} هـ` : 'التاريخ غير محدد';
}

export function sessionDateParts(session: Pick<ClientSession, 'date' | 'date_hijri'>): { day: string; month: string; weekday: string } | null {
  const d = parseIsoDate(session.date);
  if (!d) return null;
  return { day: DAY_NUM.format(d), month: MONTH_SHORT.format(d), weekday: WEEKDAY.format(d) };
}

/** «اليوم» · «غداً» · «بعد ٣ أيام» — للقادمة فقط. */
export function relativeDays(days: number | null): string | null {
  if (days === null || days < 0) return null;
  if (days === 0) return 'اليوم';
  if (days === 1) return 'غداً';
  if (days === 2) return 'بعد يومين';
  if (days <= 10) return `بعد ${days} أيام`;
  return `بعد ${days} يوماً`;
}

/** الوقت من الباك «10:30» أو «10:30:00» ⇒ «10:30». */
export function formatSessionTime(time: string | null | undefined): string | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : time;
}
