import { apiClient } from '../utils/api';

/**
 * طلباتُ التنفيذ في بوابة العميل — مرآةُ `ClientExecutionRequestPresenter` في الباك.
 * ما ليس هنا لا يصل العميل (لا بيانات خام ولا مرفقات ولا أرقام هويات الأطراف).
 */
export type ExecStatusKey = 'active' | 'partial' | 'completed' | 'stalled' | 'cancelled';

export const EXEC_STATUS_KEYS: ExecStatusKey[] = ['active', 'partial', 'completed', 'stalled', 'cancelled'];

export const EXEC_STATUS_LABELS: Record<ExecStatusKey, string> = {
  active: 'قيد التنفيذ',
  partial: 'منفّذ جزئياً',
  completed: 'منفّذ',
  stalled: 'متعثّر',
  cancelled: 'ملغى',
};

export interface ClientExecutionRequest {
  id: number;
  request_number: string | null;
  request_code: string | null;
  status: string | null;
  status_key: ExecStatusKey;
  status_label: string;
  court: string | null;
  department: string | null;
  main_document_type: string | null;
  sub_document_type: string | null;
  filing_date: string | null;
  filing_date_hijri: string | null;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  paid_percent: number | null;
  currency: string;
  case: { id: number; title: string; file_number?: string | null } | null;
  counts: { decisions: number; steps: number };
  najiz_synced_at: string | null;
  updated_at: string | null;
}

export interface ExecParty { name: string; role: string | null }
export interface ExecDecision { number: string | null; type: string | null; text: string | null; status: string | null; date: string | null }
export interface ExecStep { name: string | null; date: string | null; status: string | null }
export interface ExecPayment {
  detected_at: string | null;
  previous_paid: number;
  new_paid: number;
  delta: number;
  remaining_after: number | null;
  new_status: string | null;
}

export interface ClientExecutionRequestDetail extends ClientExecutionRequest {
  parties: ExecParty[];
  decisions: ExecDecision[];
  steps: ExecStep[];
  payments: ExecPayment[];
}

export interface ExecSummary {
  count: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  by_status: Record<ExecStatusKey, number>;
}

export interface ExecListPage {
  rows: ClientExecutionRequest[];
  total: number;
  page: number;
  lastPage: number;
  summary: ExecSummary;
}

interface ListResponse {
  success: boolean;
  message?: string;
  data: { data: ClientExecutionRequest[]; total: number; current_page: number; last_page: number };
  summary: ExecSummary;
}

interface ShowResponse {
  success: boolean;
  message?: string;
  data: ClientExecutionRequestDetail;
}

export const ClientExecutionRequestService = {
  async list(params: { status?: ExecStatusKey | null; q?: string; page?: number; perPage?: number } = {}): Promise<ExecListPage> {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.q) qs.set('q', params.q);
    qs.set('page', String(params.page ?? 1));
    qs.set('per_page', String(params.perPage ?? 20));
    const res = await apiClient.get<ListResponse>(`/client/execution-requests?${qs.toString()}`);
    if (!res.success) throw new Error(res.message || 'تعذّر جلب طلبات التنفيذ');
    return {
      rows: res.data.data,
      total: res.data.total,
      page: res.data.current_page,
      lastPage: res.data.last_page,
      summary: res.summary,
    };
  },

  async show(id: number | string): Promise<ClientExecutionRequestDetail> {
    const res = await apiClient.get<ShowResponse>(`/client/execution-requests/${id}`);
    if (!res.success) throw new Error(res.message || 'تعذّر جلب طلب التنفيذ');
    return res.data;
  },
};

const SAR = new Intl.NumberFormat('ar-SA-u-nu-arab', { style: 'currency', currency: 'SAR', maximumFractionDigits: 2, minimumFractionDigits: 0 });

export function formatSar(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return SAR.format(amount);
}

const GREGORIAN = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' });

export function formatFilingDate(r: Pick<ClientExecutionRequest, 'filing_date' | 'filing_date_hijri'>): string {
  const m = r.filing_date ? /^(\d{4})-(\d{2})-(\d{2})/.exec(r.filing_date) : null;
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (!Number.isNaN(d.getTime())) return GREGORIAN.format(d);
  }
  return r.filing_date_hijri ? `${r.filing_date_hijri} هـ` : '—';
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
}
