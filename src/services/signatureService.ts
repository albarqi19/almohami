// التوقيع الإلكتروني — بوابة العميل (عقوده وتوقيعها) وإعدادات المكتب (صادق).
import { apiClient, API_BASE_URL } from '../utils/api';

export type SignatureProvider = 'simple' | 'sadq' | 'manual';
export type SignatureRequestStatus = 'pending' | 'viewed' | 'signed' | 'rejected' | 'cancelled' | 'expired' | 'failed';

export interface SignatureRequestSummary {
  id: number;
  provider: SignatureProvider;
  provider_label: string;
  status: SignatureRequestStatus;
  status_label: string;
  channel: string | null;
  signer_name: string | null;
  sent_at: string | null;
  expires_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  signed_by_name: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  has_signed_file: boolean;
  /** رابط نفاذ من صادق — لا يأتي إلا للطلبات الموثّقة */
  signing_url: string | null;
  provider_envelope_id: string | null;
}

/** ما يُلحَق بالعقد في استجابة الموظف (`data.signature`). */
export interface ContractSignatureInfo {
  method: SignatureProvider | null;
  method_label: string;
  has_signed_file: boolean;
  signed_file_hash: string | null;
  latest_request: SignatureRequestSummary | null;
  portal_link: string;
  sadq_active: boolean;
  sadq_credits: number;
}

export interface ClientContractSummary {
  id: number;
  contract_number: string;
  title: string | null;
  status: string;
  status_label: string;
  contract_date: string | null;
  grand_total: number | string | null;
  signed_at: string | null;
  signature_method: SignatureProvider | null;
  case: { id: number; file_number: string; title: string } | null;
  signature_request: SignatureRequestSummary | null;
  can_sign: boolean;
}

export interface ClientContractDetail extends ClientContractSummary {
  start_date: string | null;
  end_date: string | null;
  content: string;
  subtotal: number | string | null;
  discount: number | string | null;
  vat_rate: number | string | null;
  vat_amount: number | string | null;
  notes: string | null;
  signed_by: string | null;
  signature_method_label: string;
  has_signed_file: boolean;
  firm_name: string | null;
  parties: Array<{ party_type: 'first' | 'second'; name: string; role: string | null }>;
  payment_terms: Array<{ id: number; description: string | null; amount: number | string | null; due_date: string | null; total_with_vat: number | string | null; status: string | null }>;
  can_decline: boolean;
  signer_name_default: string;
}

export interface ESignatureSettings {
  simple_signature_enabled: boolean;
  sadq_available: boolean;
  sadq_enabled: boolean;
  sadq_active: boolean;
  sadq_configured: boolean;
  sadq_credits: number;
  sadq_auth_type: number;
}

type Ok<T> = { success: boolean; message?: string; data: T };

export const clientContractService = {
  list: () => apiClient.get<Ok<ClientContractSummary[]>>('/client/contracts'),
  show: (id: number) => apiClient.get<Ok<ClientContractDetail>>(`/client/contracts/${id}`),
  /** يفتح PDF العقد (الموقّع إن وُجد) في تبويب جديد عبر Bearer. */
  openPdf: (id: number) => openPdfBlob(`${API_BASE_URL}/client/contracts/${id}/pdf`),
  pdfBlobUrl: (id: number) => fetchPdfObjectUrl(`${API_BASE_URL}/client/contracts/${id}/pdf`),
  sign: (id: number, body: { signature_image: string; signer_name: string; agreed: boolean }) =>
    apiClient.post<{ success: boolean; message: string }>(`/client/contracts/${id}/sign`, body),
  decline: (id: number, reason: string) =>
    apiClient.post<{ success: boolean; message: string }>(`/client/contracts/${id}/decline`, { reason }),
};

export const eSignatureSettingsService = {
  get: () => apiClient.get<Ok<ESignatureSettings>>('/tenant/e-signature/settings'),
  update: (sadqEnabled: boolean) =>
    apiClient.put<Ok<ESignatureSettings>>('/tenant/e-signature/settings', { sadq_enabled: sadqEnabled }),
};

export const SIGNATURE_STATUS_TONE: Record<SignatureRequestStatus, 'neutral' | 'info' | 'success' | 'danger' | 'warning'> = {
  pending: 'info',
  viewed: 'info',
  signed: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
  expired: 'warning',
  failed: 'danger',
};

async function fetchPdfObjectUrl(url: string): Promise<string> {
  const token = localStorage.getItem('authToken');
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error('تعذّر فتح العقد');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

async function openPdfBlob(url: string): Promise<void> {
  const objectUrl = await fetchPdfObjectUrl(url);
  window.open(objectUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
