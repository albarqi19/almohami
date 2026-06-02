// === تهيئة حالات/أنواع ZATCA ===
// الألوان عبر var(--status-*) فقط (تتكيّف مع light/dark/classic) — لا hex ثابت.
// يميّز cleared=«مُعتمدة» (B2B) عن reported=«مُبلّغة» (B2C) بنفس الأخضر.

import { Clock, Hourglass, Loader2, CheckCircle2, FileCheck, XCircle, AlertTriangle, type LucideIcon } from 'lucide-react';
import type { ZatcaInvoiceState, ZatcaInvoiceType } from '../types/zatca';

export interface ZatcaStatusMeta {
  label: string;
  color: string; // var(--status-*)
  bg: string;    // var(--status-*-light)
  Icon: LucideIcon;
  spin?: boolean;
}

export const ZATCA_STATUS_CONFIG: Record<ZatcaInvoiceState, ZatcaStatusMeta> = {
  pending:    { label: 'معلّقة',           color: 'var(--status-blue)',   bg: 'var(--status-blue-light)',   Icon: Clock },
  queued:     { label: 'في قائمة الإرسال', color: 'var(--status-blue)',   bg: 'var(--status-blue-light)',   Icon: Hourglass },
  submitting: { label: 'قيد المعالجة',     color: 'var(--status-orange)', bg: 'var(--status-orange-light)', Icon: Loader2, spin: true },
  cleared:    { label: 'مُعتمدة',           color: 'var(--status-green)',  bg: 'var(--status-green-light)',  Icon: CheckCircle2 },
  reported:   { label: 'مُبلّغة',           color: 'var(--status-green)',  bg: 'var(--status-green-light)',  Icon: FileCheck },
  rejected:   { label: 'مرفوضة',           color: 'var(--status-red)',    bg: 'var(--status-red-light)',    Icon: XCircle },
  failed:     { label: 'فشل تقني',          color: 'var(--status-orange)', bg: 'var(--status-orange-light)', Icon: AlertTriangle },
};

// تسميات نوع الفاتورة (zatca_invoice_type).
export const ZATCA_TYPE_LABELS: Record<ZatcaInvoiceType, string> = {
  standard_invoice: 'فاتورة قياسية',
  standard_credit: 'إشعار دائن قياسي',
  standard_debit: 'إشعار مدين قياسي',
  simplified_invoice: 'فاتورة مبسّطة',
  simplified_credit: 'إشعار دائن مبسّط',
  simplified_debit: 'إشعار مدين مبسّط',
};

// تسميات نوع المستند UBL (zatca_document_type).
export const ZATCA_DOC_TYPE_LABELS: Record<string, string> = {
  '388': 'فاتورة',
  '381': 'إشعار دائن',
  '383': 'إشعار مدين',
  '386': 'دفعة مقدمة',
};

// هل النوع قياسي (B2B) → يُعرض الرقم الضريبي للمشتري.
export function isStandardType(type?: ZatcaInvoiceType | null): boolean {
  return !!type && type.startsWith('standard');
}
