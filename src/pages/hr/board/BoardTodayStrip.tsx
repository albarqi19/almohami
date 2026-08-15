import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Info } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';

import { errorText, fmtCount, fmtLeaveDate, todayISO } from '../leave/leaveFormat';
import type { OnLeaveNowRow } from '../../../types/hr';

/**
 * **شريطُ «اليوم في المكتب» — الخبرُ الوحيدُ المرتبطُ باليوم في صفحةٍ بقيّتُها حقائقُ ساكنة.**
 *
 * وهو **العنصرُ الوحيدُ في الوحدة كلِّها الذي يعبر العمودين**: شقيقٌ لـ`.hrl-cols` داخل
 * `.hrl-stage`، فعرضُه الكاملُ يقول «هذا عن المكتب كلِّه لا عن عمود».
 *
 * ══════ لماذا يستحقّ الصدارة ══════
 * `GET /hr/leaves/on-leave-now` يُرجع `user_name` و`type_name` و`returns_on`، و
 * `LeaveRoster.tsx:103-105` **يرميها كلَّها** ويحتفظ بمجموعةِ معرّفاتٍ للترشيح فقط. فأسماءُ
 * غائبي اليوم وتواريخُ عودتهم لا تُعرض في أيّ سطحٍ في المنتَج — حمولةٌ مدفوعةُ الثمن،
 * بمفتاحٍ قائم ⇒ **صفرُ طلبٍ إضافيّ وصفرُ عملٍ في الباك**.
 *
 * ══════ ثلاثةُ فخاخٍ مقروءةٍ في الـCSS، ومعالجتُها ══════
 * ١) `.hrl-conflict p svg { color: var(--status-green) }` (`hr-leave.css:1348-1350`) يُلوّن
 *    أيَّ أيقونةٍ **أخضرَ قسراً**. فأيقونةٌ في حالة «هناك غائبون» تقول «سليم» بلونها.
 *    ⇒ **الأيقونةُ في النسخة الخضراء وحدَها**، والحالةُ المشغولةُ نصٌّ بلا أيقونة.
 * ٢) `.hrl-conflict p` هو `display:flex` **بلا `wrap`** ⇒ جملةُ الملخّص تُكتب **عقدةً
 *    نصّيةً واحدة** بلا `<b>` ولا `<span>` داخلها، وإلّا صارت عناصرَ flex لا تلتفّ فتفيض
 *    على 390px.
 * ٣) مكتبٌ بعشرة غائبين يُطيل الشريطَ فيدفع قائمةَ العمل تحت الطيّة ⇒ **سقفٌ ستّةُ
 *    أسماءٍ ثمّ «و N آخرون ←»**.
 *
 * ══════ ما لا يُرسَم هنا ══════
 * **الأسماءُ لا تُنقر في v1**: `OnLeaveNowRow` يحمل `employee_profile_id` فالربطُ ممكنٌ
 * تقنياً، لكنّ سطراً في شريطِ خبرٍ يفتح ملفّاً كاملاً قفزةٌ لا يطلبها القارئ. خيارٌ
 * معلَنٌ لا سهو.
 */

/** سقفُ الأسماء — وما زاد يُختصر في سطرٍ يقود إلى السجلّ الكامل. */
const NAME_LIMIT = 6;

const CONNECTION_FALLBACK = 'انقطعَ الاتصال بالخادم.';

interface Props {
  /**
   * الاستعلامُ يُطلَق في **اللوحة الأمّ** لا هنا — عمداً: لو وُلد داخل هذا المكوّن لبدأ
   * بعد انفتاح بوّابة التحميل (stats + القائمة)، فيظهر الشريطُ متأخّراً **ويدفع كلَّ ما
   * تحته**. إطلاقُه أعلى يجعله متوازياً مع الاستعلامين فيصل معهما، ويبقى المفتاحُ واحداً
   * فلا يتضاعف النداء.
   */
  query: UseQueryResult<OnLeaveNowRow[]>;
}

export const BoardTodayStrip: React.FC<Props> = ({ query: onLeaveQuery }) => {
  const today = fmtLeaveDate(todayISO());

  // لا يُرسَم شيءٌ قبل وصول المصدر: شريطٌ يومضُ فارغاً ثمّ يمتلئ بستّة أسماءٍ أسوأُ من
  // شريطٍ يتأخّر جزءاً من ثانية.
  if (onLeaveQuery.isPending) return null;

  if (onLeaveQuery.isError) {
    // عطلٌ في الشريط لا يجوز أن يُنذر كأنّه عطلُ اللوحة (لا مثلثَ أحمر)، ولا أن يُخفى
    // فيُقرأ الغيابُ سلامةً. الصنفان قائمان كلاهما — وصفرُ صنفٍ جديد.
    return (
      <section className="hrl-conflict hrl-drift hrl-drift--muted" aria-label="اليوم في المكتب">
        <Info size={13} aria-hidden="true" />
        <span>{errorText(onLeaveQuery.error, CONNECTION_FALLBACK)}</span>
      </section>
    );
  }

  const rows = onLeaveQuery.data ?? [];

  if (rows.length === 0) {
    // كلمةُ «مسجَّلاً» إلزامية: مكتبٌ لم يبدأ استعمال الدفتر بعدُ لا يجوز أن يُقال عنه
    // «الجميع على رأس العمل» — الحمولةُ لا تعرف ذلك.
    return (
      <section className="hrl-conflict hrl-conflict--none" aria-label="اليوم في المكتب">
        <p>
          <Check size={13} aria-hidden="true" /> {`لا غيابَ مسجَّلاً اليوم · ${today}`}
        </p>
      </section>
    );
  }

  const shown = rows.slice(0, NAME_LIMIT);
  const extra = rows.length - shown.length;

  return (
    <section className="hrl-conflict" aria-label="اليوم في المكتب">
      {/* عقدةٌ نصّيةٌ واحدة — انظر الفخّ (٢) أعلاه */}
      <p>{`اليوم ${today} · ${fmtCount(rows.length)} من المنسوبين في إجازةٍ أو غياب`}</p>

      {/* الأسماءُ رماديةٌ بحكم `.hrl-conflict ul` — وهذا مقصود: الملخّصُ هو العنوان،
          والأسماءُ تفصيلُه. */}
      <ul>
        {shown.map((row) => (
          <li key={row.leave_id}>
            {`${row.user_name} — ${row.type_name}${row.half_day ? ' · نصفُ يوم' : ''} · يعود ${fmtLeaveDate(row.returns_on)}`}
          </li>
        ))}

        {extra > 0 && (
          <li>
            <Link to="/hr/leave">{`و${fmtCount(extra)} آخرون ←`}</Link>
          </li>
        )}
      </ul>
    </section>
  );
};

export default BoardTodayStrip;
