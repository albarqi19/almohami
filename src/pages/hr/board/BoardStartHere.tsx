import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, UserPlus, Users } from 'lucide-react';

interface Props {
  /** `hr.manage` — بدونها تبقى الأسطرُ الثلاثةُ **بصفر زرّ**. */
  canManage: boolean;
  onAdd: () => void;
  onHolidays: () => void;
}

/**
 * **«ابدأ من هنا» — لوحةُ مكتبٍ فتح الوحدةَ للتوّ.**
 *
 * ══════ الخطأُ الذي تجتنبه هذه الشاشة ══════
 * أربعةٌ من مصادر اللوحة الخمسة تُرجع أصفاراً صادقة، **وثلاثةٌ من هذه الأصفار كانت
 * ترسم «السلامة»**. أسوأُها كان مُثبَتاً في الكود: `chartData = hasData ? segments :
 * [{ name:'لا بيانات', value: 1, … }]` — **قيمةٌ مصنوعةٌ تُرسَم حلقةً كاملة**، أي بياناتِ
 * ديمو بالتعريف الحرفيّ على أوّل شاشةٍ يراها العميلُ الجديد. ماتت مع الدونات.
 *
 * والخطأُ الثاني الأخطر: **إعلانُ السلامة الأخضر على مكتبٍ فارغ**. «لا قرارَ ينتظر
 * المكتبَ اليوم» صادقةٌ منطقياً وكاذبةٌ عملياً: كلُّ شيءٍ ينتظر، ولم يبدأ شيءٌ بعد.
 * ⇒ السطرُ الأخضرُ لا يُرسَم إلا حين `total > 0`، والشريطُ العلويُّ لا يُرسَم إطلاقاً.
 *
 * ══════ لماذا هذا الترتيبُ بالذات ══════
 * ليس زخرفياً — هو **ترتيبُ الاعتماد الحقيقيّ** في هذه الوحدة، مُثبَتٌ في موضعين:
 * تنويهُ `HolidaysModal` بأنّ العطلَ المولَّدة لا تؤثّر في الاحتساب حتى تُعتمد (وهو
 * مرساةُ حسابِ الإجازات كلِّه)، ومرساةُ الرصيد الافتتاحيّ التي بدونها يبقى الاستحقاقُ
 * صفراً إلى الأبد. مكتبٌ يسجّل إجازاتٍ قبل هاتين الخطوتين يبني دفتراً يجب تصحيحُه لاحقاً.
 *
 * والشكلُ نفسُه كاسرُ رتم: **كتلةٌ فسيحةٌ للخطوة الملزِمة، ثمّ سطران كثيفان لما بعدها** —
 * الترتيبُ يُقرأ من الحجم قبل أن يُقرأ من كلمة «ثمّ». والحالةُ الكاملةُ (`hrl-state--empty`
 * بأيقونةٍ ووصفٍ وزرّ) مُستحقّةٌ هنا وحدَها بحكم العرف: تُحجَز للسطح الذي يملأ العمودَ كلَّه.
 */
export const BoardStartHere: React.FC<Props> = ({ canManage, onAdd, onHolidays }) => {
  const navigate = useNavigate();

  return (
    <section className="hrl-block">
      <div className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2">
          <Users size={14} /> ابدأ من هنا
        </h2>
      </div>

      <div className="hrl-state hrl-state--empty">
        <Users size={22} />
        <p className="hrl-state__t">لا منسوبين في هذا المكتب بعد</p>
        {/* 🔑 الجملتان منسوختان حرفياً من الحالة الفارغة في القائمة اليمنى: نصٌّ واحدٌ
            لحالةٍ واحدةٍ في شاشةٍ واحدة — وصياغةٌ ثانيةٌ لها هي عينُ الانحراف المُعالَج. */}
        <p className="hrl-state__d">
          يبدأ الملفُّ بأوّل منسوب، ثمّ تُبنى عليه العقودُ والمستنداتُ والإجازات.
          {!canManage && ' راجع إدارةَ المكتب.'}
        </p>
        {canManage && (
          <button type="button" className="hr-btn hr-btn--sm hr-btn--primary" onClick={onAdd}>
            <UserPlus size={13} /> إضافة منسوب
          </button>
        )}
      </div>

      <div className="hrl-block__b hrl-block__b--flush">
        <div className="hrl-row hrl-row--static">
          <span className="hrl-row__main">
            ثمّ: اعتمد التقويمَ الرسميّ — العطلُ غيرُ المعتمَدة لا تُستثنى من احتساب الإجازات.
          </span>
          {canManage && (
            <button type="button" className="hr-btn hr-btn--sm" onClick={onHolidays}>
              <CalendarDays size={13} /> التقويم الرسميّ
            </button>
          )}
        </div>

        <div className="hrl-row hrl-row--static">
          <span className="hrl-row__main">
            ثمّ: هيّئ الأرصدةَ الافتتاحية — بلا رصيدٍ افتتاحيٍّ لا يُحتسب استحقاق.
          </span>
          {canManage && (
            <button type="button" className="hr-btn hr-btn--sm" onClick={() => navigate('/hr/leave')}>
              الإجازات والغياب ←
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default BoardStartHere;
