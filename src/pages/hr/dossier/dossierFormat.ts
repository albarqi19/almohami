import type { EmployeeProfile, SbaStatus } from '../../../types/hr';

/**
 * **حسابات ملفّ الموظف — موضعٌ واحدٌ لكلِّ حسابٍ كان يتكرّر.**
 *
 * قبل الجدار كانت `isLawyer` و`remainingDays` تعيشان في `HrModule` وتُستنسخان بين
 * شجرتَي الموبايل والديسكتوب (كتلةُ حساب الانتهاء وحدَها كانت منسوخةً حرفياً مرّتين،
 * والفرقُ بين النسختين كان يُرى بالعين). هنا تُكتب مرّةً، ويقرأها الجدارُ والقائمةُ معاً.
 *
 * · **التواريخُ ليست هنا**: الجدارُ يستعمل `fmtLeaveDate` من `leave/leaveFormat`
 *   (ميلاديٌّ بأرقامٍ لاتينيةٍ، ونصٌّ خامٌّ عند تاريخٍ غير صالحٍ بدل `Invalid Date`).
 *   سببُه أنّ لوحَ الإجازات يعيش **داخل الجدار نفسِه** بذلك التنسيق، وأنّ الحقول مسمّاةٌ
 *   `*_gregorian` صراحةً — فتنسيقان في جدارٍ واحدٍ انحرافٌ يُرى.
 */

/**
 * **عتبةُ الاستعجال — رقمٌ واحدٌ لا نسختان.**
 *
 * ما دونها يصعد إلى الرأس (`hrl-fact--gold`) وإلى شريط «ما يستحقّ الفعل» (`--warn`)؛
 * وما فوقها يبقى في الرصيف جدولاً يُقرأ ولا يُنبَّه به. وحدةُ الرقم شرطُ ألّا يقول سطحان
 * عن التاريخ نفسِه شيئين مختلفين.
 */
export const URGENT_DAYS = 60;

/** حالاتُ الهيئة التي تعني «هذا منسوبٌ محامٍ» ولو خلا رقمُ الرخصة. */
const LAWYER_SBA: SbaStatus[] = ['verified_same_firm', 'verified_other_firm', 'expired'];

export function isLawyer(emp: Pick<EmployeeProfile, 'sba_license_number' | 'sba_verification_status'>): boolean {
  return !!emp.sba_license_number || LAWYER_SBA.includes(emp.sba_verification_status);
}

/**
 * اسمُ المنسوب كما يُكتب في كلّ سطحٍ يذكره — والاحتياطُ `منسوب #N` لا شرطةٌ ولا فراغ:
 * الملفُّ قد يصل بلا علاقة `user` محمَّلة، ورأسٌ بلا اسمٍ يبدو عطلاً.
 */
export function empName(emp: Pick<EmployeeProfile, 'user'>, empId: number): string {
  return emp.user?.name || `منسوب #${empId}`;
}

/** الأيامُ المتبقّية على تاريخ (سالبةٌ = مضى). `null` حين لا تاريخَ أو تاريخٌ غير صالح. */
export function remainingDays(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / 86400000);
}
