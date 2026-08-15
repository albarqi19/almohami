import React from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';

import { ENGINE_RUN_CLOCK } from './attendanceFormat';

/**
 * **شاشةُ المكتب الفارغ** — تُعرض حين لا جدولَ في المكتب أو لا أحدَ يبصم
 * (`schedules_count === 0 || tracked_count === 0` من `GET /hr/attendance/setup-health`).
 *
 * ══════ العهدُ الحاكم ══════
 * الفراغُ **يُعلَن نصّاً ويُحوَّل إلى دعوةٍ للتهيئة**. لا جدولَ فارغٌ برؤوسٍ بلا صفوف، ولا
 * «لا توجد بيانات»، ولا سبينر أبديّ، **ولا بيانات ديمو أبداً**. ومكتبٌ فتح الشاشةَ أوّلَ
 * مرّةٍ يجب أن يخرج بـ**فهمٍ واحدٍ واضح** لا بسؤال.
 *
 * ══════ والزرُّ الآن خلفه مسار ══════
 * `POST /hr/attendance/setup` صار قائماً في `route:list` — فالخطواتُ الثلاثُ المشروحةُ هنا
 * هي **نفسُها** خطواتُ `SetupWizardModal` بترتيبها وأرقامها، ولا يُشرح شيءٌ لا يفعله الزرّ.
 * (وقبل بناء المسار كانت الخطواتُ تُشرح بلا زرّ: «فعلٌ بلا مسارٍ في الباك لا يُرسَم».)
 *
 * ومَن لا يملك `hr.attendance.manage` يرى **اللوحةَ نفسَها** بلا زرٍّ وبسطرٍ يُحيله إلى مدير
 * المكتب — لا شاشةَ محجوبةٌ ولا ٤٠٣.
 */

interface Props {
  /** `hr.attendance.manage` — تُقرأ مرّةً في الصفحة وتُمرَّر، فلا تُقرأ الصلاحيةُ مرّتين. */
  canManage: boolean;
  /** يفتح معالجَ التهيئة — الفعلُ الوحيد في هذه اللوحة. */
  onStart: () => void;
}

export const AttendanceEmptyState: React.FC<Props> = ({ canManage, onStart }) => (
  <div className="hra-scroll">
    <section className="hra-setup" aria-labelledby="hra-setup-t">
      <h2 className="hra-setup__t" id="hra-setup-t">ثلاثُ خطواتٍ ويبدأ الحضور</h2>

      <p className="hra-setup__lead">
        لم يُحتسب يومٌ واحدٌ بعد في هذا المكتب. النظامُ <strong>يَصِف ولا يحكم</strong>: يسجّل
        ما وقع، ويقترح تفسيراً، والقرارُ لك — <strong>ولا يمسّ راتباً ولا يُوقّع جزاءً</strong>.
        وإن كنتَ هيّأتَ الجدولَ اليومَ فالأيامُ تظهر بعد أوّل احتسابٍ ليليّ لا فوراً.
      </p>

      <ol className="hra-steps">
        <li className="hra-step">
          <span className="hra-step__n" aria-hidden="true">١</span>
          <h3 className="hra-step__t">أيامُ الدوام وساعاتُه</h3>
          <p className="hra-step__d">
            جدولٌ واحدٌ للمكتب يحدّد أيامَ العمل وبدايتَه ونهايتَه وراحتَه وساعةَ فصل اليوم.
            وتحريرُه لاحقاً <strong>نسخةٌ جديدة</strong> لا تعديلٌ في المكان — فالماضي لا يُعاد
            كتابتُه.
          </p>
          <p className="hra-step__note">
            هذه الأيامُ نفسُها تُستعمل في احتساب مدد الإجازات — فرقٌ هنا يعني رقمين مختلفين في
            الوحدتين لمدىً واحد.
          </p>
        </li>

        <li className="hra-step">
          <span className="hra-step__n" aria-hidden="true">٢</span>
          <h3 className="hra-step__t">مَن يبصم؟</h3>
          <p className="hra-step__d">
            التتبّعُ <strong>مُطفأٌ على كلّ ملفٍّ افتراضياً</strong>، ويُفتح على من تختاره وحدَه.
            الشركاءُ والمالكُ عادةً خارجَ التتبّع — ولن يظهروا في أيّ تقرير.
          </p>
          <p className="hra-step__note">
            راجِع ملفّاتِ من غادر المكتبَ قبل أن تختار: ملفٌّ نشطٌ لمن لم يعد موظفاً يُسجَّل عليه
            «بلا سجلّ» كلَّ يومِ عملٍ إلى الأبد فتمتلئ الشاشةُ بأسماءٍ لا وجودَ لها.
          </p>
        </li>

        <li className="hra-step">
          <span className="hra-step__n" aria-hidden="true">٣</span>
          <h3 className="hra-step__t">من أيّ تاريخ؟</h3>
          <p className="hra-step__d">
            تاريخُ بدءٍ لكلّ ملفّ — وما قبله لن يُحاسَب عليه أحد. هذا هو الحاجزُ الذي يمنع أن
            يرث كلُّ موظفٍ سنةً كاملةً من الأيام بلا سجلّ في أوّل ليلة.
          </p>
        </li>
      </ol>

      {canManage ? (
        <>
          <div className="hra-setup__cta">
            <button type="button" className="hr-btn hr-btn--primary" onClick={onStart}>
              <Play size={14} aria-hidden="true" /> ابدأ التهيئة
            </button>
            <span className="hra-setup__ctah">
              ثلاثُ خطواتٍ في نافذةٍ واحدة — ولا يُكتب شيءٌ قبل الضغط الأخير.
            </span>
          </div>

          <p className="hra-setup__foot">
            بعد التهيئة تظهر الأيامُ في <strong>أوّل احتسابٍ ليليّ</strong> ({ENGINE_RUN_CLOCK}{' '}
            بتوقيت الرياض) لا فوراً. وحتى ذلك الحين يبقى{' '}
            <Link className="hra-link" to="/hr">سجلُّ المنسوبين</Link> و
            <Link className="hra-link" to="/hr/leave">صفحةُ الإجازات</Link> يعملان كما هما، ولا
            شيءَ في المكتب يتأثّر.
          </p>
        </>
      ) : (
        <p className="hra-setup__foot">
          لم يُفعَّل الحضورُ بعد — راجِع مديرَ المكتب.
        </p>
      )}
    </section>
  </div>
);

export default AttendanceEmptyState;
