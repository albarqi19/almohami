/**
 * Types لميزة "طلبات الوثائق من العميل".
 * يطابق الـ enums في الباك إند (app/Enums/).
 */

export type DocumentRequestStatus =
  | 'draft'
  | 'sent'
  | 'in_progress'
  | 'awaiting_review'
  | 'completed'
  | 'cancelled';

export type DocumentRequestPriority = 'low' | 'medium' | 'high' | 'urgent';

export type DocumentRequestItemStatus =
  | 'pending'
  | 'partially_uploaded'
  | 'uploaded'
  | 'reviewed'
  | 'rejected';

export type DocumentSubmissionVisibility =
  | 'pending_review'
  | 'visible'
  | 'hidden'
  | 'flagged';

export type LawyerReviewStatus = 'approved' | 'rejected';

export type AiAnalysisStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'skipped';

export type ExpectedDocumentType =
  | 'national_id'
  | 'commercial_register'
  | 'contract'
  | 'invoice'
  | 'bank_statement'
  | 'court_judgment'
  | 'power_of_attorney'
  | 'passport'
  | 'tax_certificate'
  | 'other';

export const EXPECTED_DOCUMENT_TYPES: { value: ExpectedDocumentType; label: string }[] = [
  { value: 'national_id', label: 'صورة الهوية الوطنية' },
  { value: 'commercial_register', label: 'السجل التجاري' },
  { value: 'contract', label: 'عقد' },
  { value: 'invoice', label: 'فاتورة' },
  { value: 'bank_statement', label: 'كشف حساب بنكي' },
  { value: 'court_judgment', label: 'حكم محكمة' },
  { value: 'power_of_attorney', label: 'وكالة شرعية' },
  { value: 'passport', label: 'جواز سفر' },
  { value: 'tax_certificate', label: 'شهادة ضريبية' },
  { value: 'other', label: 'أخرى' },
];

export const PRIORITY_LABELS: Record<DocumentRequestPriority, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
};

export const STATUS_LABELS: Record<DocumentRequestStatus, string> = {
  draft: 'مسودة',
  sent: 'مُرسل',
  in_progress: 'قيد الرفع',
  awaiting_review: 'بانتظار المراجعة',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

export const ITEM_STATUS_LABELS: Record<DocumentRequestItemStatus, string> = {
  pending: 'في الانتظار',
  partially_uploaded: 'تم الرفع جزئياً',
  uploaded: 'تم الرفع',
  reviewed: 'تم المراجعة',
  rejected: 'مرفوض',
};

// ============================================================
// API Models
// ============================================================

export interface DocumentSubmission {
  id: number;
  document_request_item_id: number;
  document_id: number;
  onedrive_file_id: string;
  submitted_by: number;
  submitted_at: string;
  visibility_status: DocumentSubmissionVisibility;
  visibility_display: string;
  ai_match_score: number | null;
  ai_warning: string | null;
  lawyer_review_status: LawyerReviewStatus | null;
  lawyer_review_note: string | null;
  lawyer_reviewed_at: string | null;
  document?: {
    id: number;
    file_name: string;
    file_size: number;
    mime_type: string;
    cloud_url: string | null;
    ai_status: AiAnalysisStatus | null;
    ai_status_display: string | null;
    ai_analysis: Record<string, unknown> | null;
  };
  submitter?: {
    id: number;
    name: string;
  };
}

export interface DocumentRequestItem {
  id: number;
  document_request_id: number;
  order: number;
  title: string;
  expected_document_type: ExpectedDocumentType | null;
  expected_document_type_display: string | null;
  client_message: string | null;
  internal_notes?: string | null; // مخفي عن العميل
  is_required: boolean;
  min_files: number;
  max_files: number | null;
  allowed_extensions: string[] | null;
  max_file_size_mb: number;
  status: DocumentRequestItemStatus;
  status_display: string;
  uploaded_count: number;
  is_complete: boolean;
  can_accept_more: boolean;
  submissions?: DocumentSubmission[];
  all_submissions?: DocumentSubmission[];
}

export interface DocumentRequest {
  id: number;
  request_number: string;
  tenant_id?: number;
  case_id: number;
  client_id?: number;
  requested_by?: number;
  title: string;
  client_message: string | null;
  internal_notes?: string | null; // مخفي عن العميل
  due_date: string | null;
  priority: DocumentRequestPriority;
  priority_display: string;
  status: DocumentRequestStatus;
  status_display: string;
  sent_at: string | null;
  completed_at: string | null;
  created_at?: string;
  progress_percentage: number;
  items_count?: number;
  client?: { id: number; name: string; phone?: string };
  requester?: { id: number; name: string };
  case?: { id: number; file_number: string; title?: string };
  items?: DocumentRequestItem[];
}

export interface DocumentRequestEvent {
  id: number;
  document_request_id: number;
  document_request_item_id: number | null;
  document_submission_id: number | null;
  event_type: string;
  event_type_display: string;
  actor_id: number | null;
  actor_role: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  actor?: { id: number; name: string };
}

// ============================================================
// Payload types
// ============================================================

export interface CreateDocumentRequestPayload {
  case_id: number;
  client_id: number;
  title: string;
  client_message?: string;
  internal_notes?: string;
  due_date?: string;
  priority?: DocumentRequestPriority;
  items: CreateItemPayload[];
}

export interface CreateItemPayload {
  title: string;
  expected_document_type?: ExpectedDocumentType;
  client_message?: string;
  internal_notes?: string;
  is_required?: boolean;
  min_files?: number;
  max_files?: number | null;
  allowed_extensions?: string[];
  max_file_size_mb?: number;
}

export interface UpdateDocumentRequestPayload {
  title?: string;
  client_message?: string | null;
  internal_notes?: string | null;
  due_date?: string | null;
  priority?: DocumentRequestPriority;
}

export interface UploadUrlPayload {
  file_name: string;
  file_size: number;
  mime_type?: string;
}

export interface UploadUrlResponse {
  upload_url: string;
  expires_at: string | null;
  final_file_name: string;
  instructions: {
    method: string;
    note: string;
  };
}
