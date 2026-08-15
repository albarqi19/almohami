import React from 'react';
import { CalendarDays, Plus, Printer } from 'lucide-react';

import { officeVerificationLabel } from './boardFacts';
import type { HrOfficeInfo } from '../../../types/hr';

interface Props {
  /** `null` حين لم يُوجد الـtenant — عندها لا شارةَ ولا اسمَ في السطر الثانويّ. */
  office: HrOfficeInfo | null;
  /** «١٢ منسوباً» أو «لا منسوبين بعد» — و`null` حين لم يصل العدد. */
  countLabel: string | null;
  /** `hr.manage` */
  canManage: boolean;
  onAdd: () => void;
  /** `null` ⇒ لا يُرسَم زرُّ التقويم (لوحةُ مكتبٍ فارغ: زرٌّ واحدٌ لا ثلاثة). */
  onHolidays: (() => void) | null;
  /** `null` ⇒ لا يُرسَم زرُّ الطباعة (لا صفوفَ ⇒ ورقةٌ فارغة). */
  onPrint: (() => void) | null;
  printBusy?: boolean;
}

/**
 * **رأسُ اللوحة — هويّةُ المكتب وأفعالُه، بصفرِ بطاقةِ إحصاء.**
 *
 * ══════ القاعدةُ الحاكمة (تُقرأ قبل إضافة أيّ زرّ) ══════
 * **شريطُ الرأس لأفعالِ المكتب كلِّه؛ وفعلٌ يخصّ صفّاً يعيش في صفِّه.** فلا يتضخّم
 * الرأسُ ولا يُهاجَر فعلٌ من مكانه. وهو شريطُ الإجراءات **الوحيد** في الصفحة — نفسُ
 * العرف المشحون في `DossierHead` و`LeavePage`.
 *
 * ══════ لماذا سقطت الأربعُ بطاقاتٍ ══════
 * كانت تحمل **أعلى وزنٍ بصريّ** (أربعُ خلفياتٍ ملوّنة، رقمٌ 21px/800) وأدنى فعل. والسببُ
 * بنيويٌّ لا ذوقيّ: بمقارنة `EmployeeFilters` (`types/hr.ts:115-123`) بمصادر الأرقام —
 * «موثّقون» يجمع حالتين بينما `sba_status` مرشِّحٌ **بقيمةٍ واحدة**، و«تنتهي قريباً» **بلا
 * مُعامِلِ ترشيحٍ إطلاقاً** ⇒ رقمان يستحيل أن يقودا. والباقيان (`total`/`active`)
 * مرسومان أصلاً شريحتين في القائمة اليمنى وعدّاداً في الترقيم.
 * ⇒ الأرقامُ **لم تُحذف**: `total` بقي نثراً في السطر الثانويّ، والباقي صار رؤوسَ قوائمَ
 * تُنقر (`hrl-rule__n` في ترويسة البلوك).
 *
 * · `<h1>` **أوّلُ عنوانٍ دلاليٍّ في هذا الفرع** — كان `hr-stage__head-title` عنصرَ `div`.
 * · **حقيقةٌ واحدةٌ لا أكثر** في الشارات: توثيقُ المنشأة. كلُّ رقمٍ آخر إمّا في شريحة
 *   القائمة اليمنى أو رأسٌ لقائمةٍ أسفل.
 * · الصلاحيةُ الناقصةُ **تحذف** الزرَّ لا تعطّله؛ وحين تسقط الثلاثةُ يُكتب «عرضٌ فقط» —
 *   فرأسٌ عارٍ بلا تفسيرٍ يجعل صاحبَ `hr.view` يظنّ الشاشةَ معطوبة.
 */
export const BoardHead: React.FC<Props> = ({
  office,
  countLabel,
  canManage,
  onAdd,
  onHolidays,
  onPrint,
  printBusy = false,
}) => {
  // عند غياب أحد الطرفين يُكتب الآخرُ وحدَه — **بلا فاصلةٍ يتيمة**.
  const subtitle = [office?.name, countLabel].filter(Boolean).join(' · ');

  const showCalendar = canManage && onHolidays !== null;
  const showPrint = onPrint !== null;
  const bare = !canManage && !showPrint;

  return (
    <header className="hrl-head">
      <div className="hrl-head__id">
        <h1 className="hrl-h1">الموارد البشرية</h1>
        {subtitle !== '' && <p className="hrl-sub">{subtitle}</p>}
      </div>

      {/* **الموضعُ الوحيدُ لتوثيق المنشأة في الشاشة**: كان يُكتب هنا وفي بطاقة المكتب
          معاً، فيُقرأ الخبرُ الواحدُ خبرين. والنصُّ من `officeVerificationLabel` — ومعه
          رقمُ الترخيص الذي كان يعيش في البطاقة، فلم يسقط بسقوط سطرها. */}
      <div className="hrl-head__badges">
        {office && (
          <span className={office.verified ? 'hrl-fact' : 'hrl-fact hrl-fact--gold'}>
            {officeVerificationLabel(office)}
          </span>
        )}
      </div>

      <div className="hrl-head__actions">
        {canManage && (
          <button type="button" className="hr-btn hr-btn--sm hr-btn--primary" onClick={onAdd}>
            <Plus size={13} /> إضافة منسوب
          </button>
        )}

        {showCalendar && onHolidays && (
          <button type="button" className="hr-btn hr-btn--sm" onClick={onHolidays}>
            <CalendarDays size={13} /> التقويم الرسميّ
          </button>
        )}

        {showPrint && onPrint && (
          <button type="button" className="hr-btn hr-btn--sm" onClick={onPrint} disabled={printBusy}>
            <Printer size={13} /> طباعة كشف
          </button>
        )}

        {bare && <span className="hrl-fact">عرضٌ فقط</span>}
      </div>
    </header>
  );
};

export default BoardHead;
