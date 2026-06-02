// === أنواع الفوترة الإلكترونية ZATCA ===
// مبنية على عقد الباك إند المُتحقَّق منه (ZatcaController + ZatcaManager).

// حالة الفاتورة داخل ZATCA — تطابق العمود zatca_status في الباك.
// failed = خطأ تقني (يُعاد إرساله) | rejected = رفض منطقي (لا يُعاد).
export type ZatcaInvoiceState =
  | 'pending'
  | 'queued'
  | 'submitting'
  | 'cleared'    // مُعتمدة (B2B / clearance)
  | 'reported'   // مُبلّغة (B2C / reporting)
  | 'rejected'   // مرفوضة منطقياً — لا إعادة محاولة
  | 'failed';    // فشل تقني — قابل لإعادة المحاولة

// نوع المستند الضريبي — يطابق العمود zatca_invoice_type.
export type ZatcaInvoiceType =
  | 'standard_invoice'
  | 'standard_credit'
  | 'standard_debit'
  | 'simplified_invoice'
  | 'simplified_credit'
  | 'simplified_debit';

// بيئة التشغيل المعتمدة في الباك (EnvironmentResolver).
export type ZatcaEnvironment = 'sandbox' | 'simulation' | 'production';

// حالة الشهادة — مخرجات ZatcaManager::getCertificateStatus.
export interface ZatcaCertificate {
  has_credential: boolean;
  status: string | null;
  environment: ZatcaEnvironment | string | null;
  expires_at: string | null; // ISO8601
  expiring_soon: boolean;     // ضمن 30 يوماً
  production_ready: boolean;
}

// استجابة GET /zatca/status — أساس الإخفاء الشرطي.
export interface ZatcaStatusData {
  available: boolean;
  enabled: boolean;
  environment: ZatcaEnvironment | string | null;
  onboarded_at: string | null; // ISO8601
  certificate: ZatcaCertificate | null;
}

// نتيجة فحص امتثال واحد.
export interface ZatcaComplianceResult {
  passed: boolean;
  http: number;
  errors: string[] | null;
}

// نتائج فحوص الامتثال الست — المفاتيح قد تكون جزئية/فارغة محلياً (تتطلب sandbox فعلي).
export type ZatcaComplianceKey =
  | 'standard_invoice'
  | 'standard_credit'
  | 'standard_debit'
  | 'simplified_invoice'
  | 'simplified_credit'
  | 'simplified_debit';

export type ZatcaComplianceResults = Partial<Record<ZatcaComplianceKey, ZatcaComplianceResult>>;

// حمولة بدء التفعيل — POST /zatca/onboard/start.
export interface StartOnboardingPayload {
  otp: string;
  legal_name_ar: string;
  legal_name_en?: string;
  vat_number: string;            // 15 رقماً، تبدأ وتنتهي بـ 3
  commercial_registration?: string;
  building_number: string;       // 4 أرقام
  street_name: string;
  district: string;
  city: string;
  postal_code: string;           // 5 أرقام
  additional_number?: string;    // 4 أرقام
}

// استجابة إرسال/إعادة فاتورة — ZatcaController::invoiceState.
export interface ZatcaInvoiceSubmitResult {
  id: number;
  invoice_number: string;
  zatca_status: ZatcaInvoiceState | null;
  zatca_invoice_type: ZatcaInvoiceType | null;
  zatca_icv: number | null;
  zatca_uuid: string | null;
  warnings: string[] | null;
}

// استجابة GET /zatca/qr — SVG جاهز من الباك (لا حاجة لمكتبة QR).
export interface ZatcaQrData {
  qr_base64: string | null;
  qr_svg: string | null;
}

// عدّادات الحالات لتبويبات القائمة — من تعديل CaseInvoiceController::index (مفاتيح خام لكل حالة).
export interface ZatcaCounts {
  all: number;
  pending: number;
  queued: number;
  submitting: number;
  cleared: number;
  reported: number;
  rejected: number;
  failed: number;
}

// حقول zatca على الفاتورة (تُدمج في CaseInvoice عبر types/billing.ts).
export interface ZatcaInvoiceFields {
  zatca_status?: ZatcaInvoiceState | null;
  zatca_invoice_type?: ZatcaInvoiceType | null;
  zatca_document_type?: string | null;
  zatca_uuid?: string | null;
  zatca_icv?: number | null;
  zatca_qr_code?: string | null;
  zatca_response?: Record<string, unknown> | null;
  zatca_warnings?: string[] | null;
  zatca_submitted_at?: string | null;
  zatca_cleared_at?: string | null;
  zatca_original_invoice_id?: number | null;
  zatca_note_reason?: string | null;
}
