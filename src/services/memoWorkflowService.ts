import { apiClient, API_BASE_URL } from '../utils/api';

// ===== الأنواع =====

export type MemoApprovalState =
  | 'not_required' | 'draft' | 'pending' | 'endorsed' | 'rejected'
  | 'issued' | 'client_changes_requested' | 'client_approved';

export type MemoChannel = 'whatsapp' | 'email' | 'both';

export interface MemoIssue {
  id: number;
  issue_number: number;
  outgoing_number: string | null;
  status: string;
  client_decision: 'pending' | 'approved' | 'changes_requested' | null;
  sent_at: string | null;
  is_latest?: boolean;
  comments_count?: number;
}

export interface MemoComment {
  id: number;
  legal_memo_issue_id?: number;
  author_id: number | null;
  author_kind: 'client' | 'staff';
  kind: 'comment' | 'correction' | 'approval';
  content: string;
  is_internal?: boolean;
  created_at: string;
  author?: { id: number; name: string };
}

export interface MemoSendResult {
  success: boolean;
  message: string;
  code?: string;
  number?: string;
  correspondence_id?: number;
  channels?: Record<string, string>;
}

export interface MemoApprovalInboxItem {
  id: number;
  title: string;
  memo_type: string;
  memo_number: string | null;
  case_id: number;
  approval_state: MemoApprovalState;
  submitted_for_approval_at: string | null;
  case?: { id: number; title: string; file_number: string };
  creator?: { id: number; name: string };
}

export const MEMO_APPROVAL_STATE_LABELS: Record<MemoApprovalState, string> = {
  not_required: 'لا تشترط اعتماداً',
  draft: 'مسودة',
  pending: 'بانتظار الاعتماد',
  endorsed: 'معتمدة — جاهزة للإرسال',
  rejected: 'مرفوضة — تحتاج تعديلاً',
  issued: 'أُرسلت للعميل',
  client_changes_requested: 'العميل طلب تعديلاً',
  client_approved: 'اعتمدها العميل',
};

interface Ok<T = unknown> { success: boolean; message?: string; data?: T; approval_state?: MemoApprovalState; is_editable?: boolean }

// ===== جهة الطاقم =====

export const memoWorkflowService = {
  openPreview: (id: number | string) => openPdfBlob(`${API_BASE_URL}/legal-memos/${id}/preview-pdf`),

  send: (id: number | string, payload: { channels: MemoChannel; message?: string }) =>
    apiClient.post<MemoSendResult>(`/legal-memos/${id}/send`, payload),

  issues: (id: number | string) => apiClient.get<Ok<MemoIssue[]>>(`/legal-memos/${id}/issues`),

  memoComments: (id: number | string) => apiClient.get<Ok<MemoComment[]>>(`/legal-memos/${id}/comments`),

  issueComments: (id: number | string, issueId: number) =>
    apiClient.get<Ok<MemoComment[]>>(`/legal-memos/${id}/issues/${issueId}/comments`),

  submitForApproval: (id: number | string) => apiClient.post<Ok>(`/legal-memos/${id}/submit-for-approval`),
  withdrawApproval: (id: number | string) => apiClient.post<Ok>(`/legal-memos/${id}/withdraw-approval`),
  startNewRevision: (id: number | string) => apiClient.post<Ok>(`/legal-memos/${id}/start-new-revision`),

  endorse: (id: number | string, note?: string) => apiClient.post<Ok>(`/legal-memos/${id}/endorse`, { note }),
  reject: (id: number | string, reason: string) => apiClient.post<Ok>(`/legal-memos/${id}/reject`, { reason }),
  reassignApprover: (id: number | string, fromUserId: number, toUserId: number) =>
    apiClient.post<Ok>(`/legal-memos/${id}/reassign-approver`, { from_user_id: fromUserId, to_user_id: toUserId }),

  approvalsInbox: () => apiClient.get<Ok<MemoApprovalInboxItem[]>>('/legal-memos/approvals'),
};

// ===== جهة العميل (بوابة العميل) =====

export const clientMemoService = {
  caseMemos: (caseId: number | string) =>
    apiClient.get<Ok<Array<{ id: number; title: string; memo_type_name: string; memo_number: string | null; approval_state: MemoApprovalState; current_issue: number; last_sent_at: string | null }>>>(`/client/cases/${caseId}/memos`),

  memo: (memoId: number | string) =>
    apiClient.get<Ok<{ id: number; title: string; memo_type_name: string; memo_number: string | null; approval_state: MemoApprovalState; current_issue: number; issues: MemoIssue[] }>>(`/client/memos/${memoId}`),

  openIssuePdf: (memoId: number | string, issueId: number) =>
    openPdfBlob(`${API_BASE_URL}/client/memos/${memoId}/issues/${issueId}/pdf`),

  issueComments: (memoId: number | string, issueId: number) =>
    apiClient.get<Ok<MemoComment[]>>(`/client/memos/${memoId}/issues/${issueId}/comments`),

  addComment: (memoId: number | string, issueId: number, payload: { content: string; kind: 'comment' | 'correction' }) =>
    apiClient.post<Ok<MemoComment>>(`/client/memos/${memoId}/issues/${issueId}/comments`, payload),

  approve: (memoId: number | string, issueId: number) =>
    apiClient.post<Ok>(`/client/memos/${memoId}/issues/${issueId}/approve`),
};

// ===== مساعد فتح PDF عبر Bearer =====

async function openPdfBlob(url: string): Promise<void> {
  const token = localStorage.getItem('authToken');
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error('تعذّر فتح المستند');
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
