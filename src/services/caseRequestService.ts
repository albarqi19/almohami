import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

/**
 * «المذكّرات المودَعة» — طلبات القضية في ناجز ومذكّراتها.
 *
 * التسميةُ مقصودة: «إنشاء مذكرة» في النظام تعني ما نكتبه نحن، و«المودَعة» تعني ما
 * أُودع في المحكمة منّا ومن الخصم. الخلطُ بينهما يُربك المحامي.
 *
 * المسارات:
 *   GET  cases/{caseId}/najiz-requests
 *   POST cases/{caseId}/najiz-requests/{id}/dismiss
 *   POST cases/{caseId}/najiz-requests/{id}/reopen
 */

/** لنا / خصم / طرف مشارك / غير مصنَّفة */
export type RequestSide = 'ours' | 'opponent' | 'co_party' | 'unknown';

export type ReplyStatus =
  | 'not_applicable'
  | 'awaiting_reply'
  | 'replied'
  | 'dismissed'
  | 'stale'
  | 'unclassified';

export interface CaseRequestAttachment {
  id: number;
  reason_text: string | null;
  file_name: string | null;
  extension: string | null;
  download_status: 'pending' | 'downloaded' | 'failed' | 'skipped';
  document_id: number | null;
}

export interface CaseRequestItem {
  id: number;
  object_key: string;
  request_code: string | null;
  request_type_id: number | null;
  request_type_name: string | null;
  request_status_name: string | null;
  court_name: string | null;
  circle_name: string | null;
  request_date: string | null;
  is_memo: boolean;

  submitter_name: string | null;
  submitter_role_name: string | null;
  /** الوكيل الذي أودع — يختلف عن الطرف الأصيل */
  filed_by_agent_name: string | null;
  organization_name: string | null;

  memo_text: string | null;

  side: RequestSide;
  side_arabic: string;
  side_source: 'identity' | 'role' | 'none';

  reply_status: ReplyStatus;
  reply_status_arabic: string;
  replied_by_request_id: number | null;
  replied_at: string | null;
  dismiss_reason: string | null;
  dismissed_at: string | null;

  attachments: CaseRequestAttachment[];
}

export interface CaseRequestsSummary {
  total: number;
  memos: number;
  awaiting_reply: number;
  /** أقدمُ مذكّرةٍ معلّقة — هي ما يُعرض في شريط الإنذار */
  oldest_awaiting: CaseRequestItem | null;
  client_role: string | null;
  client_role_arabic: string;
}

export interface CaseRequestsResponse {
  requests: CaseRequestItem[];
  summary: CaseRequestsSummary;
}

export const caseRequestService = {
  async list(caseId: number, memosOnly = false): Promise<CaseRequestsResponse> {
    const query = memosOnly ? '?memos_only=1' : '';
    const res = await apiClient.get<ApiResponse<CaseRequestsResponse>>(
      `/cases/${caseId}/najiz-requests${query}`
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر جلب المذكّرات المودَعة');
  },

  /** إغلاقٌ يدوي: رُدَّ عليها ورقياً، أو لا تستحق رداً. يصمد أمام إعادة الحوسبة. */
  async dismiss(caseId: number, requestId: number, reason?: string): Promise<CaseRequestItem> {
    const res = await apiClient.post<ApiResponse<CaseRequestItem>>(
      `/cases/${caseId}/najiz-requests/${requestId}/dismiss`,
      { reason: reason ?? null }
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر إغلاق المذكّرة');
  },

  /** التراجع — تعود المذكّرة إلى المتابعة الآلية */
  async reopen(caseId: number, requestId: number): Promise<CaseRequestItem> {
    const res = await apiClient.post<ApiResponse<CaseRequestItem>>(
      `/cases/${caseId}/najiz-requests/${requestId}/reopen`,
      {}
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّرت إعادة المذكّرة للمتابعة');
  },
};

export default caseRequestService;
