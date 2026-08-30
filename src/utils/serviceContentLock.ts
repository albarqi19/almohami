/**
 * قفلُ محتوى الخدمة القانونية — مرآةُ `LegalService::isContentLocked()` في الباك.
 *
 * 🔴 لماذا وحدةٌ مشتركة: الجدولُ كان محبوساً داخل `LegalServiceDetail.tsx`، فكلُّ
 *    سطحٍ آخر (نافذةُ التعديل مثلاً) إمّا يجهل القفل فيعرض حقلاً يُردّ 422 بعد
 *    النقر — وهو ما يرفضه هذا المشروع صراحةً («الزرُّ يعرف شرطَه قبل الضغط») —
 *    وإمّا ينسخ الجدول فيتباعد النسختان عند أوّل تعديل.
 *
 * ⚠️ أيّ تعديلٍ هنا يجب أن يطابق `LegalService::lockedStatuses()`.
 */

/** حالاتٌ يُقفل عندها محتوى الخدمة حسب نوعها — عدا النهائية العامة أدناه. */
export const LOCKED_STATUSES: Record<string, string[]> = {
  consultation: ['delivered'],
  contract_drafting: ['approved', 'signed', 'archived'],
  company_formation: ['completed'],
  licenses: ['active', 'renewed'],
  arbitration: ['award_issued', 'enforcement', 'settlement_reached'],
  compliance: ['compliant', 'monitoring'],
  labor: ['resolution', 'documentation', 'escalated_to_case'],
  real_estate: ['registration'],
  due_diligence: ['report_delivered'],
  ip: ['registration', 'active'],
  legal_notices: ['sent', 'delivered', 'escalated_to_case'],
  training: ['certificates_issued'],
  // المبسطة: مسارٌ حرّ — لا قفل عند completed؛ النهائيةُ تقفلها أدناه.
  simple: [],
};

/** حالاتٌ نهائيةٌ تقفل كلَّ نوعٍ مهما كان. */
const TERMINAL_STATUSES = ['closed', 'archived', 'cancelled'];

/** الافتراضُ لنوعٍ غير مذكورٍ أعلاه — مطابقٌ لفرع `default` في الباك. */
const DEFAULT_LOCKED = ['completed'];

export function isServiceContentLocked(
  service: { service_type?: string | null; status?: string | null } | null | undefined,
): boolean {
  if (!service?.status) return false;

  const byType = service.service_type
    ? (LOCKED_STATUSES[service.service_type] ?? DEFAULT_LOCKED)
    : DEFAULT_LOCKED;

  return byType.includes(service.status) || TERMINAL_STATUSES.includes(service.status);
}
