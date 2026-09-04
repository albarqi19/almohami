import React, { useId, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { AlertTriangle, Info, ShieldAlert, X } from 'lucide-react';

import { LetterheadService } from '../../../services/letterheadService';
import { hrLetterService } from '../../../services/hrLetterService';
import { usePermission } from '../../../hooks/usePermission';
import { errorText, fmtCount } from '../leave/leaveFormat';
import { openLetterPdf } from '../letters/letterPdf';
import { useEmployeeChecklist } from './useDossierData';
import { HR_LETTER_TYPE_HINTS, HR_LETTER_TYPE_LABELS } from '../../../types/hr';
import type { EmployeeProfile, HrLetterType, IssueLetterPayload } from '../../../types/hr';

/**
 * **إصدارُ خطابٍ مرقَّم — نموذجٌ يقول شروطَه قبل أن يُرفَض.**
 *
 * ══════ لماذا الشروطُ في الواجهة وقد فحصها الخادم ══════
 * الخادمُ يوقف كلَّ بيانٍ ناقصٍ بـ422 **قبل** حجز الرقم، فلا يُحرق تسلسلٌ على ورقةٍ
 * ناقصة. لكنّ رسالةً حمراءَ بعد النقر تُخبر المُصدِرَ بما كان يستطيع رؤيتَه قبلها:
 * لذلك تُقرأ الشروطُ من الملفّ الحاضر أصلاً في الشاشة (`hire_date` · `job_title` ·
 * `termination_date` · `status`)، وتُعطَّل الخليّةُ **بسببها منطوقاً** في موضع التلميح.
 *
 * ══════ تُعطَّل ولا تُحذف — إلّا حارسَ الراتب ══════
 * القائمةُ ساكنةٌ لكلّ منسوب: خليّةٌ معطَّلةٌ لنقصِ `hire_date` لا تُفشي عن الشخص شيئاً
 * (تاريخُ مباشرته معروضٌ في بطاقته أصلاً لمن يفتح الملفّ)، وخانةٌ ناقصةٌ تبدو عطلاً.
 * **أمّا «تعريف بالعمل والراتب» فيسقط من الشبكة كلّيةً** لمن لا يملك
 * `hr.compensation.view` — لا يُعرض مقفلاً (والقفلُ يُفشي وجودَه)، والسقوطُ هنا
 * **بحسب القارئ لا بحسب المنسوب**، فتبقى القائمةُ ساكنةً على كلّ ملفٍّ يفتحه.
 *
 * ══════ ولا كليشةَ مخترعة ══════
 * تنبيهُ «لا كليشةَ افتراضية» يردّه الخادمُ في `warnings` **بعد** الإصدار، وطبقةُ النقل
 * لا تُمرّره. فيُقرأ قبل الإصدار من `/letterheads/default` (`is_fallback`) ويُعرض
 * `hrl-flag--info` — تنبيهٌ لا حاجز: الخطابُ يصدر بترويسةٍ مبنيّةٍ من بيانات المكتب.
 */

/** ترتيبُ الشبكة = ترتيبُ خريطة التسميات — مصدرٌ واحدٌ فلا تفترق قائمتان. */
const LETTER_TYPES = Object.keys(HR_LETTER_TYPE_LABELS) as HrLetterType[];

/** ما يلزمه انتهاءُ خدمةٍ مسجَّل — نسخةُ `HrLetter::TERMINAL_TYPES`. */
const TERMINAL_TYPES: HrLetterType[] = ['experience_certificate', 'clearance'];

interface Props {
  empId: number;
  emp: EmployeeProfile;
  onClose: () => void;
  /** الإبطالُ الدقيقُ لمفتاح الخطابات — يُمرَّر من البلوك (نمطُ `ContractsTab.onSaved`). */
  onIssued: () => void;
}

/**
 * سببُ منعِ نوعٍ بعينه على هذا الملفّ — `null` حين لا مانع.
 * الترتيبُ مقصود: العامُّ قبل الخاصّ، فيُقرأ سببٌ واحدٌ لا قائمةُ أسباب.
 */
function blockReason(type: HrLetterType, emp: EmployeeProfile): string | null {
  if (!emp.hire_date) return 'تاريخ المباشرة غير مسجل';
  if (!emp.job_title) return 'المسمى الوظيفي غير مسجل';
  if (TERMINAL_TYPES.includes(type) && !emp.termination_date) return 'يصدر بعد انتهاء الخدمة';
  if (type === 'employment_certificate' && emp.status !== 'active') return 'الموظف ليس على رأس العمل';
  return null;
}

export const IssueLetterModal: React.FC<Props> = ({ empId, emp, onClose, onIssued }) => {
  // بلا هذه الصلاحية لا يظهر «تعريف بالعمل والراتب» في الشبكة إطلاقاً.
  const canComp = usePermission('hr.compensation.view');

  const [type, setType] = useState<HrLetterType | null>(null);
  const [recipient, setRecipient] = useState('');
  const [purpose, setPurpose] = useState('');
  const [extra, setExtra] = useState('');
  const [duesConfirmed, setDuesConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const recipientId = useId();
  const purposeId = useId();
  const extraId = useId();

  const types = useMemo(
    () => LETTER_TYPES.filter((t) => canComp || t !== 'salary_certificate'),
    [canComp]
  );

  /**
   * قائمةُ المغادرة — **تحذيرٌ لا حاجز**، ومكانُه هذا النموذجُ لا متنُ الخطاب.
   * المفتاحُ `['hr','checklist',empId]` نفسُه الذي يستعمله تبويبُ المباشرة ⇒ صفرُ طلبٍ
   * إضافيّ حين يكون مركَّباً، وحارسُه `hr.manage` داخل الخطّاف: من لا يملكها لا يرى
   * التحذير — ولا يرى شاشةَ خطأٍ مكانَه.
   */
  const { data: checklist } = useEmployeeChecklist(empId);
  const pendingOffboarding = (checklist ?? []).filter((item) => item.kind === 'offboarding' && !item.is_done).length;

  /** الكليشةُ الافتراضية — استعلامٌ ثانويّ: فشلُه لا يمنع الإصدار ولا يُعرض خطأً. */
  const letterheadQuery = useQuery({
    queryKey: ['letterheads', 'default'],
    queryFn: () => LetterheadService.getDefault(),
    retry: false,
    staleTime: 300_000,
  });
  const noDefaultLetterhead = letterheadQuery.data?.is_fallback === true;

  const reason = type === null ? null : blockReason(type, emp);
  const saveDisabled = saving || type === null || reason !== null;

  const submit = async () => {
    if (type === null || reason !== null) return;

    // تحقّقٌ قبليّ — يمنع نداءً محكوماً بالرفض، وبنصّ الشرط لا بنصّ الخطأ.
    if (type === 'salary_certificate' && recipient.trim() === '') {
      toast.error('الجهة المطلوب تقديمه لها مطلوبة لتعريف الراتب');
      return;
    }
    if (type === 'clearance' && !duesConfirmed) {
      toast.error('أكد إخلاء العهدة قبل إصدار إخلاء الطرف');
      return;
    }

    const payload: IssueLetterPayload = {
      letter_type: type,
      recipient_name: recipient.trim() || undefined,
      purpose: purpose.trim() || undefined,
      extra_paragraph: extra.trim() || undefined,
      dues_settled_confirmed: type === 'clearance' ? true : undefined,
    };

    setSaving(true);
    try {
      const letter = await hrLetterService.issue(empId, payload);
      toast.success('تم إصدار الخطاب برقم ' + letter.letter_number);

      // الإبطالُ **قبل** فتح الـPDF: الخطابُ صدر وحُجز رقمُه، فسقوطُ الفتح لا يجوز أن
      // يترك السجلَّ بلا صفٍّ للورقة التي بيد صاحبها.
      onIssued();
      onClose();

      try {
        await openLetterPdf(
          `/hr/employees/${empId}/letters/${letter.id}/pdf`,
          `hr-letter-${letter.letter_number}.pdf`
        );
      } catch (pdfError) {
        toast.error(errorText(pdfError, 'تعذر فتح الخطاب'));
      }
    } catch (error) {
      toast.error(errorText(error, 'تعذر إصدار الخطاب'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="hr-modal-overlay" onClick={onClose}>
      <div className="hr-modal hrl-modal hrl-modal--wide" onClick={(event) => event.stopPropagation()}>
        <div className="hr-modal__h">
          <h3>إصدار خطاب</h3>
          <button type="button" className="hr-icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="hr-modal__b">
          {/* ═══ ١) النوع ═══ */}
          <section className="hrl-fset">
            <h4 className="hrl-fset__t">نوع الخطاب</h4>

            <div className="hrl-typegrid">
              {types.map((t) => {
                const blocked = blockReason(t, emp);

                return (
                  <button
                    key={t}
                    type="button"
                    className={`hrl-typecell${type === t ? ' is-on' : ''}`}
                    aria-pressed={type === t}
                    disabled={blocked !== null}
                    onClick={() => setType(t)}
                  >
                    <span>
                      <span className="hrl-typecell__n">{HR_LETTER_TYPE_LABELS[t]}</span>
                      {/* السببُ الصريحُ يحلّ محلَّ التلميح — لا يُضاف إليه */}
                      <span className="hrl-typecell__r">{blocked ?? HR_LETTER_TYPE_HINTS[t]}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ═══ ٢) الجهة والغرض ═══ */}
          <section className="hrl-fset">
            <h4 className="hrl-fset__t">الجهة والغرض</h4>

            <div className="hr-field">
              <label htmlFor={recipientId}>
                {type === 'salary_certificate' ? 'الجهة المطلوب تقديمه لها *' : 'الجهة المطلوب تقديمه لها'}
              </label>
              <input
                id={recipientId}
                value={recipient}
                maxLength={255}
                onChange={(event) => setRecipient(event.target.value)}
              />
              {recipient.trim() === '' && <span className="hrl-hint">تطبع عبارة «لمن يهمه الأمر»</span>}
            </div>

            <div className="hr-field">
              <label htmlFor={purposeId}>الغرض (اختياري)</label>
              <input
                id={purposeId}
                value={purpose}
                maxLength={255}
                onChange={(event) => setPurpose(event.target.value)}
              />
            </div>
          </section>

          {/* ═══ ٣) فقرة إضافية ═══ */}
          <section className="hrl-fset">
            <h4 className="hrl-fset__t">فقرة إضافية</h4>

            <div className="hr-field">
              <label htmlFor={extraId}>نص يطبع قبل الخاتمة (اختياري)</label>
              <textarea
                id={extraId}
                rows={3}
                maxLength={1000}
                value={extra}
                onChange={(event) => setExtra(event.target.value)}
              />
              <span className="hrl-hint">
                تطبع كما هي قبل الخاتمة. اكتب عبارة الشكر بنفسك، والنظام لا يولدها.
              </span>
            </div>
          </section>

          {/* ═══ ٤) الإقرار — لإخلاء الطرف وحدَه ═══ */}
          {type === 'clearance' && (
            <section className="hrl-fset">
              <h4 className="hrl-fset__t">الإقرار</h4>

              <label className="hr-check">
                <input
                  type="checkbox"
                  checked={duesConfirmed}
                  onChange={(event) => setDuesConfirmed(event.target.checked)}
                />
                <span>
                  أقر بأن الموظف أخلى طرفه وسلم ما بعهدته، ولا مطالبة عليه في سجلات المكتب.
                </span>
              </label>

              <p className="hrl-note">
                المكافأة ومستحقات نهاية الخدمة <strong>غير محسوبة في النظام</strong>. هذا
                إقرارك، ونص الخطاب لا يعد مخالصة مالية.
              </p>
            </section>
          )}

          {/* ═══ الحواجز والتنبيهات — أعلى التذييل ═══ */}
          <div className="hrl-flags">
            {type === null && (
              <p className="hrl-flag hrl-flag--block">
                <ShieldAlert size={13} />
                <span>
                  <span className="hrl-flag__t">اختر نوع الخطاب</span>
                  <span className="hrl-flag__hint">لكل نوع شرطه، ويظهر تحت اسمه أعلاه.</span>
                </span>
              </p>
            )}

            {reason !== null && (
              <p className="hrl-flag hrl-flag--block">
                <ShieldAlert size={13} />
                <span>
                  <span className="hrl-flag__t">{reason}</span>
                  <span className="hrl-flag__hint">أكمل الحقل في ملف الموظف ثم أعد الإصدار.</span>
                </span>
              </p>
            )}

            {type === 'clearance' && pendingOffboarding > 0 && (
              <p className="hrl-flag hrl-flag--warn">
                <AlertTriangle size={13} />
                <span>
                  <span className="hrl-flag__t">
                    قائمة المغادرة فيها <span dir="ltr">{fmtCount(pendingOffboarding)}</span> بنداً غير منجز
                  </span>
                  <span className="hrl-flag__hint">
                    تحذير لا يمنع الإصدار. راجعها من «المباشرة» إن كان الإخلاء معلقاً عليها.
                  </span>
                </span>
              </p>
            )}

            {noDefaultLetterhead && (
              <p className="hrl-flag hrl-flag--info">
                <Info size={13} />
                <span>
                  <span className="hrl-flag__t">لا توجد كليشة افتراضية لمكتبك</span>
                  <span className="hrl-flag__hint">
                    يصدر الخطاب بترويسة مبنية من بيانات المكتب. اختر كليشة افتراضية من «الكليشات».
                  </span>
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="hr-modal__f">
          <button type="button" className="hr-btn" onClick={onClose}>إلغاء</button>
          <button type="button" className="hr-btn hr-btn--primary" onClick={submit} disabled={saveDisabled}>
            {saving ? 'جارٍ الإصدار…' : 'إصدار الخطاب'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IssueLetterModal;
