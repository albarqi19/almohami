// [P4·UX-08] config حالة واحد لكل كيانات وحدة «العقود والمالية».
// مصدر حقيقة واحد للتسمية العربية + درجة اللون (token) + الأيقونة + توفّر الأزرار،
// مشتقّ حرفياً من الباك (CaseInvoice/Payment/Contract/CollectionReminder/PaymentTerm).
// الألوان لا تُكوَّد هنا — تُحدَّد عبر درجة (tone) تُترجَم إلى أصناف CSS مربوطة بـ tokens (erp.css)،
// فتعمل تلقائياً في الثيمات الثلاثة (فاتح/داكن/كلاسيكي).

import type { LucideIcon } from 'lucide-react';
import {
  FileText, Send, Clock, CheckCircle, AlertTriangle, XCircle, RefreshCw, Banknote, FileSignature, CheckCheck,
} from 'lucide-react';
import type {
  InvoiceStatus, PaymentStatus,
} from '../types/billing';
import type {
  ContractStatus, PaymentTermStatus,
} from '../types/contracts';

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'purple';

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  icon: LucideIcon;
}

// ── الفواتير (CaseInvoice) ──
export const INVOICE_STATUS: Record<InvoiceStatus, StatusMeta> = {
  draft: { label: 'مسودة', tone: 'neutral', icon: FileText },
  sent: { label: 'مُرسلة', tone: 'info', icon: Send },
  pending: { label: 'بانتظار الدفع', tone: 'warning', icon: Clock },
  partial: { label: 'مدفوعة جزئياً', tone: 'purple', icon: Clock },
  paid: { label: 'مدفوعة', tone: 'success', icon: CheckCircle },
  overdue: { label: 'متأخرة', tone: 'danger', icon: AlertTriangle },
  cancelled: { label: 'ملغاة', tone: 'neutral', icon: XCircle },
  refunded: { label: 'مستردة', tone: 'warning', icon: RefreshCw },
};

// ── المدفوعات (Payment) ──
export const PAYMENT_STATUS: Record<PaymentStatus, StatusMeta> = {
  pending: { label: 'بانتظار التأكيد', tone: 'warning', icon: Clock },
  under_collection: { label: 'قيد التحصيل', tone: 'info', icon: Clock },
  confirmed: { label: 'مؤكدة', tone: 'success', icon: CheckCircle },
  rejected: { label: 'مرفوضة', tone: 'danger', icon: XCircle },
  refunded: { label: 'مستردة', tone: 'warning', icon: RefreshCw },
  cancelled: { label: 'ملغية', tone: 'neutral', icon: XCircle },
};

// ── العقود (Contract) ──
export const CONTRACT_STATUS: Record<ContractStatus, StatusMeta> = {
  draft: { label: 'مسودة', tone: 'neutral', icon: FileText },
  pending_signature: { label: 'بانتظار التوقيع', tone: 'info', icon: FileSignature },
  active: { label: 'نشط', tone: 'success', icon: CheckCircle },
  completed: { label: 'مكتمل', tone: 'purple', icon: CheckCheck },
  cancelled: { label: 'ملغي', tone: 'neutral', icon: XCircle },
  expired: { label: 'منتهٍ', tone: 'danger', icon: AlertTriangle },
};

// ── شروط الدفع (PaymentTerm) ──
export const PAYMENT_TERM_STATUS: Record<PaymentTermStatus, StatusMeta> = {
  pending: { label: 'معلّق', tone: 'neutral', icon: Clock },
  invoiced: { label: 'مُفوتر', tone: 'info', icon: FileText },
  partial: { label: 'مدفوع جزئياً', tone: 'warning', icon: Clock },
  paid: { label: 'مدفوع', tone: 'success', icon: CheckCircle },
  overdue: { label: 'متأخر', tone: 'danger', icon: AlertTriangle },
  cancelled: { label: 'ملغي', tone: 'neutral', icon: XCircle },
};

// ── تذكيرات التحصيل (CollectionReminder) ──
export const REMINDER_STATUS: Record<string, StatusMeta> = {
  scheduled: { label: 'مجدول', tone: 'info', icon: Clock },
  sent: { label: 'مُرسل', tone: 'success', icon: CheckCircle },
  failed: { label: 'فشل', tone: 'danger', icon: XCircle },
  cancelled: { label: 'ملغي', tone: 'neutral', icon: XCircle },
  skipped: { label: 'تم تخطيه', tone: 'neutral', icon: RefreshCw },
};

export const REMINDER_TYPE_LABELS: Record<string, string> = {
  upcoming: 'قبل الاستحقاق',
  due: 'في موعد الاستحقاق',
  overdue: 'متأخر',
  final: 'تنبيه نهائي',
  custom: 'مخصص',
};

export const REMINDER_CHANNEL_LABELS: Record<string, string> = {
  email: 'بريد إلكتروني',
  whatsapp: 'واتساب',
  sms: 'رسالة نصية',
  internal: 'إشعار داخلي',
  all: 'جميع القنوات',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'نقداً',
  bank_transfer: 'تحويل بنكي',
  check: 'شيك',
  card: 'بطاقة',
  online: 'دفع إلكتروني',
  mada: 'مدى',
  apple_pay: 'Apple Pay',
  stc_pay: 'STC Pay',
  other: 'أخرى',
};

export const PAYMENT_METHOD_ICONS: Record<string, LucideIcon> = {
  cash: Banknote,
  bank_transfer: Banknote,
  check: FileText,
};

const FALLBACK_META: StatusMeta = { label: 'غير محدد', tone: 'neutral', icon: FileText };

/** يجلب وصف الحالة من أي خريطة بأمان (مع fallback يمنع الانهيار — يعالج PAY-2.2). */
export function getStatusMeta(map: Record<string, StatusMeta>, status?: string | null): StatusMeta {
  if (!status) return FALLBACK_META;
  return map[status] ?? { ...FALLBACK_META, label: status };
}

// ── اشتقاق توفّر الإجراءات من الحالة (متّسق مع حُرّاس الباك) ──

/** أزرار الفاتورة المتاحة حسب الحالة (مطابقة لحُرّاس CaseInvoiceController). */
export function invoiceActions(status?: InvoiceStatus | string | null) {
  const s = status ?? '';
  const isFinal = s === 'paid' || s === 'cancelled' || s === 'refunded';
  return {
    canActivate: s === 'draft', // draft → pending (تفعيل/اعتماد)
    canSend: !isFinal, // الإرسال (الباك يُرجع 501 حالياً — نعالجه بلطف)
    canRecordPayment: ['sent', 'pending', 'partial', 'overdue'].includes(s),
    canEdit: !isFinal, // الباك يرفض تحديث paid/cancelled
    canCancel: !isFinal, // الباك يرفض إلغاء paid/cancelled/refunded
    canDelete: s === 'draft', // + شرط عدم وجود مدفوعات (يُفحص بالباك)
  };
}

/** أزرار الدفعة المتاحة حسب الحالة (مطابقة لحُرّاس PaymentController). */
export function paymentActions(status?: PaymentStatus | string | null) {
  const s = status ?? '';
  return {
    canConfirm: s === 'pending',
    canReject: s === 'pending',
    canCancel: s === 'pending',
    canMarkUnderCollection: s === 'pending',
    canRefund: s === 'confirmed',
  };
}

/** [P4·UX-11] درجة مخاطر التحصيل — مؤشّر عرضي مشتقّ من أيام التأخّر (لا منطق ذكاء بالباك). */
export function collectionRisk(daysOverdue: number): { label: string; tone: StatusTone } {
  if (daysOverdue <= 0) return { label: 'منتظم', tone: 'success' };
  if (daysOverdue <= 15) return { label: 'منخفض', tone: 'info' };
  if (daysOverdue <= 30) return { label: 'متوسط', tone: 'warning' };
  if (daysOverdue <= 60) return { label: 'عالٍ', tone: 'warning' };
  return { label: 'حرج', tone: 'danger' };
}

/** أزرار العقد المتاحة حسب الحالة (مطابقة لحُرّاس ContractController). */
export function contractActions(status?: ContractStatus | string | null) {
  const s = status ?? '';
  return {
    canEdit: s !== 'completed' && s !== 'cancelled',
    canSend: s === 'draft' || s === 'pending_signature', // إرسال للتوقيع
    canSign: s === 'pending_signature', // الباك يتطلّب pending_signature
    canDelete: s === 'draft', // + شرط عدم وجود فواتير (يُفحص بالباك)
    canManageParties: s === 'draft', // حذف طرف يتطلّب مسودة
  };
}
