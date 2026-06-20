import { apiClient, API_BASE_URL } from '../utils/api';

export type FeeProposalType = 'fee_proposal' | 'quote';
export type FeeProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'cancelled';

export interface FeeProposalItem {
  id?: number;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  amount?: number | string;
  sort_order?: number;
}

export interface FeeProposal {
  id: number;
  tenant_id: number;
  proposal_number: string | null;
  type: FeeProposalType;
  type_label?: string;
  case_id: number | null;
  client_id: number | null;
  letterhead_id: number | null;
  title: string | null;
  client_name_snapshot: string | null;
  status: FeeProposalStatus;
  currency: string;
  subtotal: string;
  discount_amount: string;
  vat_rate: string;
  vat_amount: string;
  total: string;
  valid_until: string | null;
  is_expired?: boolean;
  intro_text: string | null;
  scope_text: string | null;
  terms_text: string | null;
  payment_terms: string | null;
  accent_color: string | null;
  sent_at: string | null;
  outgoing_number: string | null;
  items?: FeeProposalItem[];
  client?: { id: number; name: string; phone?: string; email?: string };
  case?: { id: number; title: string; file_number: string };
  items_count?: number;
  created_at?: string;
}

export interface FeeProposalTemplate {
  id: number;
  name: string;
  type: FeeProposalType;
  title: string | null;
  intro_text: string | null;
  scope_text: string | null;
  terms_text: string | null;
  payment_terms: string | null;
  default_items: Array<{ description: string; quantity: number; unit_price: number }> | null;
  validity_days: number;
  vat_rate: string;
  letterhead_id: number | null;
  accent_color: string | null;
  is_active: boolean;
  is_default: boolean;
}

export interface FeeProposalInput {
  type: FeeProposalType;
  title: string;
  case_id?: number | null;
  client_id?: number | null;
  template_id?: number | null;
  letterhead_id?: number | null;
  currency?: string;
  discount_amount?: number;
  vat_rate?: number;
  valid_until?: string | null;
  validity_days?: number;
  intro_text?: string | null;
  scope_text?: string | null;
  terms_text?: string | null;
  payment_terms?: string | null;
  accent_color?: string | null;
  items?: FeeProposalItem[];
}

interface ListResponse<T> { success: boolean; data: T[]; meta?: { total: number; last_page: number; current_page: number; per_page: number } }
interface ItemResponse { success: boolean; message?: string; data: FeeProposal }
interface SendResponse { success: boolean; message: string; number?: string; code?: string; channels?: Record<string, string> }

export const FEE_PROPOSAL_STATUS_LABELS: Record<FeeProposalStatus, string> = {
  draft: 'مسودة',
  sent: 'مُرسَل',
  accepted: 'مقبول',
  rejected: 'مرفوض',
  expired: 'منتهي الصلاحية',
  cancelled: 'ملغى',
};

export const feeProposalService = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<ListResponse<FeeProposal>>(`/fee-proposals${toQuery(params)}`),

  get: (id: number) => apiClient.get<ItemResponse>(`/fee-proposals/${id}`),

  create: (data: FeeProposalInput) => apiClient.post<ItemResponse>('/fee-proposals', data),

  update: (id: number, data: Partial<FeeProposalInput>) => apiClient.put<ItemResponse>(`/fee-proposals/${id}`, data),

  remove: (id: number) => apiClient.delete<{ success: boolean; message: string }>(`/fee-proposals/${id}`),

  send: (id: number) => apiClient.post<SendResponse>(`/fee-proposals/${id}/send`),

  setStatus: (id: number, status: FeeProposalStatus) =>
    apiClient.post<ItemResponse>(`/fee-proposals/${id}/status`, { status }),

  async openPreview(id: number): Promise<void> {
    return openPdfBlob(`${API_BASE_URL}/fee-proposals/${id}/preview`);
  },

  // ===== القوالب =====
  templates: {
    list: () => apiClient.get<{ success: boolean; data: FeeProposalTemplate[] }>('/fee-proposal-templates'),
    create: (data: Partial<FeeProposalTemplate>) => apiClient.post('/fee-proposal-templates', data),
    update: (id: number, data: Partial<FeeProposalTemplate>) => apiClient.put(`/fee-proposal-templates/${id}`, data),
    remove: (id: number) => apiClient.delete(`/fee-proposal-templates/${id}`),
    setDefault: (id: number) => apiClient.post(`/fee-proposal-templates/${id}/set-default`),
    duplicate: (id: number) => apiClient.post(`/fee-proposal-templates/${id}/duplicate`),
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

async function openPdfBlob(url: string): Promise<void> {
  const token = localStorage.getItem('authToken');
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error('تعذّر توليد المعاينة');
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
