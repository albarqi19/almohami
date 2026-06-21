import { apiClient, API_BASE_URL } from '../utils/api';

export type CorrespondenceDirection = 'outgoing' | 'incoming';

export interface Correspondence {
  id: number;
  direction: CorrespondenceDirection;
  number: string;
  barcode_value: string | null;
  year: number;
  numbering_calendar: string;
  document_type: string;
  type_label?: string;
  subject: string | null;
  status: string;
  case_id: number | null;
  recipient_name_snapshot: string | null;
  sender_name_snapshot: string | null;
  channels: string[] | null;
  channel_status: Record<string, string> | null;
  sent_at: string | null;
  recipients_count?: number;
  case?: { id: number; title: string; file_number: string };
  sender?: { id: number; name: string };
  content_hash?: string | null;
}

interface ListResponse {
  success: boolean;
  data: Correspondence[];
  meta?: { total: number; last_page: number; current_page: number; per_page: number };
}

export interface CorrespondenceStats {
  total: number;
  by_direction: Record<string, number>;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
}

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  session_report: 'تقرير جلسة',
  fee_proposal: 'عرض أتعاب',
  quote: 'عرض سعر',
  contract: 'عقد',
  invoice: 'فاتورة',
  letter: 'خطاب',
  notice: 'إنذار',
  announcement: 'إشعار',
  memo: 'مذكرة',
  general: 'مستند عام',
};

/** تسميات قنوات الإصدار (تشمل الطباعة دون إرسال). */
export const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'واتساب',
  email: 'إيميل',
  print: 'طباعة',
};

export const correspondenceService = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<ListResponse>(`/correspondence${toQuery(params)}`),

  stats: () => apiClient.get<{ success: boolean; data: CorrespondenceStats }>('/correspondence/stats'),

  get: (id: number) => apiClient.get<{ success: boolean; data: Correspondence }>(`/correspondence/${id}`),

  async download(id: number): Promise<void> {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_BASE_URL}/correspondence/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('تعذّر تحميل الملف');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};

function toQuery(params?: Record<string, string | number>): string {
  if (!params) return '';
  const q = Object.entries(params)
    .filter(([, v]) => v !== '' && v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return q ? `?${q}` : '';
}
