/**
 * حاسبة التكاليف القضائية — منطق محلي مطابق للحاسبة الرسمية لوزارة العدل
 * (cfee.moj.gov.sa/calculator.html). الحاسبة الرسمية تحسب داخل المتصفح بلا أي
 * API خلفي، لذا المعادلات منسوخة هنا حرفياً (تحقّق منها المالك بتجارب فعلية
 * على الحاسبة الرسمية، 2026-07).
 *
 * تبويبان: «الدعاوى» (نوع الدعوى → نوع المطالبة → مبلغ إن كانت مالية/تعاقدية/
 * ملكية عقار) و«الطلبات» (رسوم ثابتة حسب الإجراء القضائي بغض النظر عن الدعوى).
 */

export type LawsuitClaimKind = 'non_financial' | 'financial' | 'contractual' | 'real_estate';

export interface FeeResult {
  fee: number | null;
  note: string;
  /** يحتاج إدخال مبلغ ولم يُدخل */
  needsAmount?: boolean;
}

/** أنواع الدعاوى السبعة في تبويب «حاسبة الدعاوى» */
export const LAWSUIT_TYPES = [
  'الأحوال الشخصية',
  'عمالية',
  'تجارية',
  'محكمة عامة',
  'جزائية خاصة',
  'دعاوى مستعجلة',
  'منازعات التنفيذ',
] as const;

export const CLAIM_KINDS: { key: LawsuitClaimKind; label: string; needsAmount: boolean }[] = [
  { key: 'non_financial', label: 'غير مالية', needsAmount: false },
  { key: 'financial', label: 'مالية', needsAmount: true },
  { key: 'contractual', label: 'تعاقدية', needsAmount: true },
  // تنفرد «محكمة عامة» بها — تُحتسب مثل النسبية المالية
  { key: 'real_estate', label: 'ملكية عقار (محكمة عامة)', needsAmount: true },
];

/** 1) حاسبة الدعاوى */
export function calcLawsuitFee(claimKind: LawsuitClaimKind, amount?: number | null): FeeResult {
  const value = Number(amount) || 0;

  switch (claimKind) {
    case 'non_financial':
      return { fee: 2000, note: 'مبلغ ثابت' };

    case 'financial':
    case 'real_estate': {
      // ملكية العقار تُحتسب مثل النسبية المالية
      if (value <= 0) return { fee: null, note: 'أدخل مقدار المطالبة', needsAmount: true };
      let rate: number;
      if (value < 100_000) rate = 0.05;
      else if (value < 500_000) rate = 0.04;
      else if (value < 1_000_000) rate = 0.03;
      else rate = 0.02;
      const fee = Math.min(value * rate, 1_000_000); // حد أقصى مليون (يُبلغ عند 50 مليون)
      return { fee: round2(fee), note: `شريحة نسبية ${rate * 100}% — بحد أقصى 1,000,000 ريال` };
    }

    case 'contractual': {
      if (value <= 0) return { fee: null, note: 'أدخل مقدار المطالبة', needsAmount: true };
      const fee = Math.min(Math.max(value * 0.02, 500), 10_000);
      return { fee: round2(fee), note: '2% — بحد أدنى 500 وحد أقصى 10,000 ريال' };
    }
  }
}

export interface JudicialRequest {
  key: string;
  label: string;
  /** رسم ثابت بالريال — أو null للإجرائين النسبيين */
  fee: number | null;
  /** وصف الاحتساب النسبي إن لم يكن ثابتاً */
  formula?: string;
  /** نسبة الاحتساب للإجرائين النسبيين */
  rate?: number;
  rateBaseLabel?: string;
}

/** 2) حاسبة الطلبات — 21 إجراءً قضائياً (الرسم نفسه لكل أنواع الدعاوى) */
export const JUDICIAL_REQUESTS: JudicialRequest[] = [
  { key: 'appeal', label: 'اعتراض — طلب استئناف', fee: 5000 },
  { key: 'cassation', label: 'اعتراض — طلب النقض', fee: 7000 },
  { key: 'reconsideration', label: 'اعتراض — طلب التماس إعادة النظر', fee: 10000 },
  { key: 'add_opponent', label: 'طلب إدخال من الخصوم', fee: 2000 },
  { key: 'stay_execution', label: 'طلب وقف تنفيذ حكم', fee: 2000 },
  { key: 'correct_ruling', label: 'طلب تصحيح حكم أو تفسيره', fee: 2000 },
  { key: 'intervention', label: 'طلب تدخل', fee: 2000 },
  { key: 'recuse_member', label: 'طلب رد عضو', fee: 2000 },
  { key: 'travel_ban', label: 'طلب منع سفر', fee: 1000 },
  { key: 'incidental', label: 'طلب عارض (مفتوح)', fee: 1000 },
  { key: 'court_permitted', label: 'ما تأذن المحكمة بتقديمه مما يكون مرتبطاً بالطلب الأصلي', fee: 1000 },
  { key: 'add_cause', label: 'إضافة أو تغيير في سبب الدعوى مع إبقاء موضوع الطلب الأصلي', fee: 1000 },
  { key: 'precautionary', label: 'طلب الحجز التحفظي', fee: 1000 },
  { key: 'view_records', label: 'طلب الاطلاع على أوراق الدعوى أو سجلاتها', fee: 50 },
  { key: 'certified_copy', label: 'طلب تسليم نسخة مصدقة من أوراق الدعوى', fee: 100 },
  { key: 'replacement_copy', label: 'طلب نسخة بديلة للوثائق القضائية', fee: 100 },
  { key: 'continue_case', label: 'طلب استمرار السير في الدعوى', fee: 100 },
  { key: 'continue_absent', label: 'طلب الاستمرار في قضية غاب عنها المستخدم', fee: 100 },
  { key: 'direct_execution', label: 'طلب تنفيذ مباشر', fee: 500 },
  {
    key: 'struck_case',
    label: 'النظر في قضية مشطوبة',
    fee: null,
    formula: '25% من قيمة تكاليف نظر الدعوى في المرة الأولى',
    rate: 0.25,
    rateBaseLabel: 'تكاليف نظر الدعوى في المرة الأولى',
  },
  {
    key: 'nullify_ruling',
    label: 'دعوى بطلان الحكم',
    fee: null,
    formula: '1% من قيمة المبلغ المحكوم به',
    rate: 0.01,
    rateBaseLabel: 'المبلغ المحكوم به',
  },
];

export function calcRequestFee(requestKey: string, baseAmount?: number | null): FeeResult {
  const req = JUDICIAL_REQUESTS.find((r) => r.key === requestKey);
  if (!req) return { fee: null, note: 'إجراء غير معروف' };

  if (req.fee !== null) {
    return { fee: req.fee, note: 'رسم ثابت' };
  }

  const value = Number(baseAmount) || 0;
  if (value <= 0) {
    return { fee: null, note: `أدخل ${req.rateBaseLabel}`, needsAmount: true };
  }

  return { fee: round2(value * (req.rate ?? 0)), note: req.formula ?? '' };
}

/** الفئات المستثناة من التكاليف القضائية (تنبيه الحاسبة الرسمية) */
export const FEE_EXEMPTIONS = [
  'المسجون في قضية مالية',
  'الموظف/العامل في حالة الدعاوى العمالية',
  'الوزارة أو الجهة الحكومية',
  'مستفيدو الضمان الاجتماعي',
];

export function formatSAR(value: number): string {
  return new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(value) + ' ريال';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
