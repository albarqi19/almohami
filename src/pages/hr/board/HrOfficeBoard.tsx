import React, { useMemo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { errorText, fmtCount } from '../leave/leaveFormat';
import BoardActionList from './BoardActionList';
import BoardAllClear from './BoardAllClear';
import BoardDecisions from './BoardDecisions';
import BoardHead from './BoardHead';
import BoardOfficeCard from './BoardOfficeCard';
import BoardStartHere from './BoardStartHere';
import BoardTodayStrip from './BoardTodayStrip';
import { buildActionRows, buildClearScan, buildDecisions } from './boardFacts';
import printRoster from './printRoster';
import {
  BOARD_SCAN_LIMIT,
  boardYear,
  useBoardEmployees,
  useOfficeLeaveStats,
  useOfficeStats,
  useOnLeaveNow,
} from './useBoardData';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * **لوحةُ المكتب — طرحٌ لا جمع.**
 *
 * الجدارُ (ملفُّ الموظف) سطحُ عملٍ يجيب «ما في هذا الملفّ؟» بالكثافة: ثمانيةُ بلوكاتٍ
 * متساويةٍ تُقرأ بالتمرير. واللوحةُ تجيب سؤالاً واحداً مختلفاً: **«بمن أبدأ اليوم؟»** —
 * وجوابُه **قائمةُ عملٍ لا لوحةُ نتائج**.
 *
 * ══════ البنيةُ نفسُها، والنسبةُ مختلفة ══════
 * الهيكلُ يبقى `hrl-head → شريطٌ يعبر العرض → hrl-cols(hrl-wall + aside)`، والفرقُ في
 * التوزيع: الجدارُ ثمانيةُ بلوكاتٍ متساوية؛ واللوحةُ **شريطٌ عريضٌ + كتلةٌ نامية + رصيفٌ
 * قصير** — إيقاعُ ١+١+صغير بدل ٨ متساوية.
 *
 * ══════ صفرُ نظامِ تخطيطٍ جديد (وهذا شرطُ سلامةٍ لا ذوق) ══════
 * تُعاد `hrl-cols` نفسُها لا شبكةٌ ثانية، لسببين مقيسين:
 * (١) «ثلاثةُ أنظمةِ شبكةٍ في وحدةٍ واحدة» عيبٌ مُشخَّصٌ في تقرير الوحدة، وإصلاحُ لوحةٍ
 *     بإعادة ارتكابه هدم.
 * (٢) **الأهمُّ عملياً**: قاعدةُ القصِّ الصامت (§١٣-ك في `hr-leave.css`) مكتوبةٌ لـ
 *     `.hrl-page--wall .hrl-cols` حصراً — فشبكةٌ خاصّةٌ تخرج من الحماية وتُقصّ دون
 *     1400px **بلا شريط تمرير**، وهو العطلُ الذي يبدو سلامةً وقد اكتوت به الوحدةُ مرّة.
 *
 * ══════ ثلاثةُ استعلاماتٍ مستقلّة، وفشلُ أحدها لا يُعمي الآخرَين ══════
 * `on-leave-now` يفشل ⇒ سطرٌ خافتٌ في الشريط · `leave/stats` يفشل ⇒ `hrl-note` في بلوك
 * القرارات · قائمةُ المئة تفشل ⇒ `hrl-state--error` **داخل بلوك قائمة العمل وحدَه**.
 * وزرُّ [إعادة المحاولة] في كلّ فرعٍ يعيد جلبَ استعلامِ ذلك الفرع لا `['hr']` كلَّه —
 * حفظاً للإبطال الدقيق (العرفُ المسجَّل: الشاملُ مقصورٌ على إنشاءِ منسوب).
 *
 * وهذا يسدّ العطلَ الأصليّ: اللوحةُ القديمة كانت **بلا حالةِ تحميلٍ وبلا حالةِ خطأٍ
 * إطلاقاً** (`const { data: stats } = useQuery(…)` بلا `isPending` ولا `isError`)، فعند
 * 500 يرى المستخدمُ أربعَ شرطاتٍ وثلاثةَ صناديقَ فارغة: شرطةُ «الخادم سقط» وشرطةُ «لا
 * بيانات» متطابقتان بالحرف.
 *
 * ══════ لا حالةَ «محميّ» ══════
 * `/hr` كلُّها محروسةٌ بـ`hr.view` في الراوتر (`App.tsx:257-258`)، فبلوغُ اللوحة يعني
 * امتلاكَ القراءة.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** نصٌّ احتياطيٌّ واحدٌ لفرع الخطأ — عرفُ وحدة الإجازات. */
const CONNECTION_FALLBACK = 'انقطع الاتصال بالخادم.';

interface Props {
  /** `hr.manage` — تُقرأ مرّةً في `HrModule` وتُمرَّر، فلا تُقرأ الصلاحيةُ ذاتُها مرّتين. */
  canManage: boolean;
  /** يفتح `AddEmployeeModal` المملوكَ لـ`HrModule` — المودالُ لا يُمَسّ، يتبدّل مكانُ زرِّه. */
  onAdd: () => void;
  /** يفتح `HolidaysModal` المملوكَ لـ`HrModule`. */
  onHolidays: () => void;
}

export const HrOfficeBoard: React.FC<Props> = ({ canManage, onAdd, onHolidays }) => {
  const statsQuery = useOfficeStats();
  const listQuery = useBoardEmployees();
  const leaveStatsQuery = useOfficeLeaveStats(boardYear());
  // يُطلَق هنا — **قبل بوّابة التحميل** — فيسير موازياً للاستعلامين ولا يظهر الشريطُ
  // متأخّراً فيدفع كلَّ ما تحته. ويُمرَّر إلى الشريط بدل أن يُولَد فيه.
  const onLeaveQuery = useOnLeaveNow();

  const stats = statsQuery.data;
  const list = listQuery.data;

  const employees = useMemo(() => list?.data ?? [], [list]);
  const actionRows = useMemo(() => buildActionRows(employees), [employees]);
  const decisions = useMemo(
    () => (leaveStatsQuery.data ? buildDecisions(leaveStatsQuery.data) : []),
    [leaveStatsQuery.data]
  );
  /** بنودُ الفحص التي مرّت — تُبنى مع البقيّة لا داخل الشرط: نفسُ عرفِ `decisions`. */
  const clearScan = useMemo(
    () => (leaveStatsQuery.data ? buildClearScan(employees, leaveStatsQuery.data) : null),
    [employees, leaveStatsQuery.data]
  );

  /** `null` = لم يصل العدد (فشلُ القائمة) — ولا يُكتب صفرٌ عن مجهول. */
  const total = list?.total ?? null;

  // ── تحميل: لا يُصيَّر رأسُ اللوحة قبل وصول `stats` (السطرُ الثانويُّ يحمل اسمَ المكتب)
  //    ولا قبل وصول العدد — نفسُ عرفِ الجدار.
  if (statsQuery.isPending || listQuery.isPending) {
    return (
      <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل لوحة المكتب">
        {Array.from({ length: 4 }, (_, i) => (
          <span className="hrl-skel" key={i} />
        ))}
      </div>
    );
  }

  // ── خطأ على مستوى اللوحة: **إحصاءُ المكتب وحدَه** يُسقطها، لأنّ الرأسَ يُبنى منه.
  //    وفشلُ القائمة يبقى عطلاً جزئياً داخل بلوكها (انظر الفرع الطبيعيّ أدناه).
  if (statsQuery.isError || !stats) {
    return (
      <div className="hrl-state hrl-state--error">
        <AlertTriangle size={20} />
        <p className="hrl-state__t">تعذر فتح لوحة المكتب</p>
        <p className="hrl-state__d">{errorText(statsQuery.error, CONNECTION_FALLBACK)}</p>
        <button
          type="button"
          className="hr-btn hr-btn--sm"
          onClick={() => {
            void statsQuery.refetch();
            void listQuery.refetch();
          }}
        >
          <RefreshCw size={13} /> إعادة المحاولة
        </button>
      </div>
    );
  }

  const office = stats.office ?? null;

  /**
   * الرصيفُ **بلوكٌ واحدٌ فقط**؛ وحين لا بطاقةَ مكتبٍ لا يُرسَم `<aside>` إطلاقاً — لا
   * بطاقةٌ بخمس شرطات، ولا فاصلٌ رأسيٌّ إلى عمودٍ خالٍ.
   */
  const rail = office ? (
    <aside className="hrl-cols__side">
      <BoardOfficeCard office={office} />
    </aside>
  ) : null;

  // ══ لوحةُ مكتبٍ فتح الوحدةَ للتوّ: فرعٌ مستقلٌّ تماماً ══
  // لا شريطَ علويّ («لا غيابَ مسجَّلاً اليوم» في مكتبٍ بلا منسوبين ضجيجٌ يتقمّص خبراً)،
  // ولا سطرَ أخضر، ولا زرَّ طباعةٍ ولا تقويمٍ في الرأس: ثلاثةُ أزرارٍ نِدّةٍ تُلغي الترتيبَ
  // الذي تحاول الشاشةُ تعليمَه.
  if (listQuery.isSuccess && total === 0) {
    return (
      <>
        <BoardHead
          office={office}
          countLabel="لا موظفين بعد"
          canManage={canManage}
          onAdd={onAdd}
          onHolidays={null}
          onPrint={null}
        />

        <div className="hrl-cols">
          <div className="hrl-cols__main">
            <div className="hrl-wall">
              <BoardStartHere canManage={canManage} onAdd={onAdd} onHolidays={onHolidays} />
            </div>
          </div>

          {rail}
        </div>
      </>
    );
  }

  const showDecisions = leaveStatsQuery.isError || decisions.length > 0;
  const showActions = listQuery.isError || actionRows.length > 0;

  // الإعلانُ الأخضرُ **مرّةً واحدةً لا مرّتين**، وبعد وصول مصدرَيه معاً — وإلّا وميضُ
  // «لا قرارَ ينتظر» ثمّ اثنا عشر صفّاً، وهي أسوأُ كذبةٍ يقولها سطحُ تطمين.
  const leaveStats = leaveStatsQuery.data;
  const allClear = !showDecisions && !showActions && leaveStatsQuery.isSuccess && listQuery.isSuccess;

  return (
    <>
      <BoardHead
        office={office}
        countLabel={total === null ? null : `${fmtCount(total)} موظفاً`}
        canManage={canManage}
        onAdd={onAdd}
        onHolidays={onHolidays}
        onPrint={total ? () => printRoster(employees, total) : null}
        printBusy={listQuery.isFetching}
      />

      {/* العنصرُ الوحيدُ في الوحدة الذي يعبر العمودين — شقيقٌ لـ`.hrl-cols` داخل المسرح */}
      <BoardTodayStrip query={onLeaveQuery} />

      <div className="hrl-cols">
        <div className="hrl-cols__main">
          <div className="hrl-wall">
            {showDecisions && (
              <BoardDecisions
                items={decisions}
                failed={leaveStatsQuery.isError}
                canManage={canManage}
                onHolidays={onHolidays}
              />
            )}

            {showActions && (
              <BoardActionList
                rows={actionRows}
                error={listQuery.error}
                isError={listQuery.isError}
                onRetry={() => { void listQuery.refetch(); }}
                total={total}
                scanned={Math.min(employees.length, BOARD_SCAN_LIMIT)}
              />
            )}

            {/* السلامةُ **بلوكٌ لا سطر**: سطرٌ أخضرُ واحدٌ في عمودٍ بارتفاع الشاشة يُقرأ
                «لم يُحمَّل شيء»، وهو أسوأُ ما يقوله سطحٌ سليم. والبديلُ ليس حشواً: بنودُ
                الفحص التي مرّت، وعددُ ما فُحص — كلُّه من الحسابين اللذين خرجا صفراً. */}
            {allClear && leaveStats && clearScan && (
              <BoardAllClear
                checked={clearScan.checked}
                checks={clearScan.checks}
                total={total}
                scanned={Math.min(employees.length, BOARD_SCAN_LIMIT)}
                year={leaveStats.year}
              />
            )}
          </div>
        </div>

        {rail}
      </div>
    </>
  );
};

export default HrOfficeBoard;
