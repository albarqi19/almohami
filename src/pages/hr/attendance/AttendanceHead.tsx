import React from 'react';
import { CalendarCheck, CalendarClock, RefreshCw, Settings2, UserPlus } from 'lucide-react';

import { ATTENDANCE_STATUS_LABELS } from '../../../types/hr';
import type { AttendanceFacts } from '../../../types/hr';
import { ENGINE_RUN_CLOCK, fmtCount, fmtDate } from './attendanceFormat';

/**
 * ترويسةُ الشاشة بصفّين: صفُّ العنوان والأدوات، ثمّ **صفُّ حقائقَ عدُّه صادق**.
 *
 * 🚫 **لا لوحةَ صدارة ولا شارةَ انضباط ولا ترتيبَ بالتأخير** — الحقائقُ أعدادُ حالاتٍ في
 * يومٍ واحد، و«يحتاج قراراً» هو **الرقمُ الوحيدُ القابل للفعل** فيها.
 *
 * 🔴 **التحديثُ بفعل المستخدم**: زرٌّ صريحٌ لا `refetchInterval`. ٤٦٢ جهازاً × ٣٠ث × ٨س ≈
 * ٤٤٣٬٥٠٠ طلبٍ إضافيٍّ يومياً، وكلٌّ منها يمرّ بـ`Tenant::updateLastActivity()` على صفٍّ
 * متوسّطُه ١٢٢ كيلوبايت — وهو حرفياً شكلُ حادثة امتلاء القرص.
 *
 * ══════ 🔴 زرّان يفعلان شيئين مختلفين تماماً — ولا يُخلطان ══════
 * · **«تحديث»** يعيد جلبَ ما هو مكتوبٌ الآن. أثرُه فوريٌّ ومرئيّ.
 * · **«إعادةُ الاحتساب»** *يوسم* مدىً في طابور الاتّساخ، والمحرّكُ يصرفه **ليلاً**. ولا رقمَ
 *   يتغيّر بعده على الشاشة إطلاقاً.
 *
 * ولذلك يحمل الثاني عنوانَ أداةٍ يقول ذلك نصّاً قبل الضغط: مديرٌ ضغَط زراً ثمّ رأى الأرقامَ
 * كما هي يظنّ الزرَّ معطوباً فيعيد الضغطَ حتى يردّه الخانقُ (`throttle:3,1`) بـ٤٢٩ — فيتأكّد
 * ظنُّه ويهجر الوحدة. الجملةُ نفسُها تتكرّر في المودال وفي ردّ النجاح حاملةً `engine_runs_at`.
 */

interface Props {
  date: string;
  onDateChange: (date: string) => void;
  /** حقائقُ اليوم المعروض — `null` قبل وصولها فلا يُكتب صفرٌ عن مجهول. */
  facts: AttendanceFacts | null;
  /** عددُ الأيام المنتظِرة قراراً في نافذة الطابور — من حمولة الطابور لا من حسابٍ محلّيّ. */
  pendingDays: number | null;
  onRefresh: () => void;
  refreshing: boolean;
  /** أدواتُ الإعداد — `null` لمن لا يملك `hr.attendance.manage`: لا زرَّ يرمي ٤٠٣. */
  onRecompute: (() => void) | null;
  onOpenSchedule: (() => void) | null;
  /**
   * معالجُ التهيئة — **البابُ الوحيد لفتح التتبّع على ملفّ** (`attendance_tracked`).
   * وبدونه بعد التفعيل يصير كلُّ موظفٍ جديدٍ في المكتب خارجَ الحضور بلا طريقٍ لإدخاله،
   * وتبقى فجوةُ «مؤهَّلٌ ولا يبصم» بلا زرٍّ يسدّها. ويُخفى في شاشة المكتب الفارغ لأن
   * دعوتَها البارزةَ هي هو.
   */
  onOpenSetup: (() => void) | null;
}

/** ما يُعرض في صفّ الحقائق وبأيّ ترتيب — والتسمياتُ من خريطة الأنواع لا من JSX. */
const FACT_KEYS = ['present', 'offsite', 'on_leave', 'incomplete', 'no_record'] as const;

export const AttendanceHead: React.FC<Props> = ({
  date,
  onDateChange,
  facts,
  pendingDays,
  onRefresh,
  refreshing,
  onRecompute,
  onOpenSchedule,
  onOpenSetup,
}) => (
  <header className="ssp2-header">
    <div className="ssp2-header__top">
      <div>
        <h1 className="hra-h1">الحضور والانصراف</h1>
        <p className="hra-sub">حضور موظفي المكتب اليوم، والأيام التي تنتظر قرارك.</p>
      </div>

      <div className="hra-headtools">
        <label className="hra-sr" htmlFor="hra-date">اليوم المعروض</label>
        {/*
          🔴 **نظامُ ترقيمٍ واحدٌ في الترويسة**: أرقامَ `input[type=date]` يرسمها المتصفّحُ
          بلغة **واجهته** — لا بلغة الصفحة ولا بسمة `lang` على العنصر (مقيسٌ في كروم عربيّ:
          ستُّ قيمِ `lang` مختلفةٍ رسمت «١٢/٠٨/٢٠٢٦» جميعاً). فكانت الترويسةُ تعرض تاريخاً
          بأرقامٍ عربيةٍ-هندية وشريطَ حقائقَ بجواره بأرقامٍ لاتينية — نظامان متجاوران.

          فيبقى المنتقي الأصليُّ **هو الأداةَ** (شجرةُ الوصول · لوحةُ المفاتيح · تقويمُ
          النظام)، ويُرسم فوقه نصُّ الوحدة بـ`fmtDate` — أي بمُحكَّم `ATT_DATE_LOCALE` نفسِه
          الذي تُرسم به كلُّ تواريخ الوحدة. وعند التركيز يظهر المنتقي كاملاً كي يرى المحرّرُ
          ما يكتب: الأرقامُ الأصلية لحظةَ التحرير وحدَها، لا في السكون.
        */}
        <span className="hra-datefield">
          <input
            id="hra-date"
            type="date"
            className="hra-datefield__i"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
          />
          <span className="hra-datefield__t" aria-hidden="true">{fmtDate(date)}</span>
        </span>

        <button
          type="button"
          className="ssp2-btn"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={13} /> {refreshing ? 'جارٍ التحديث…' : 'تحديث'}
        </button>

        {onOpenSetup !== null && (
          <button
            type="button"
            className="ssp2-btn"
            onClick={onOpenSetup}
            title="فتح التتبع على من يسجل الحضور، والتتبع غير مفعل على أي ملف افتراضيا"
          >
            <UserPlus size={13} /> من يسجل الحضور
          </button>
        )}

        {onOpenSchedule !== null && (
          <button type="button" className="ssp2-btn" onClick={onOpenSchedule}>
            <Settings2 size={13} /> جدول الدوام
          </button>
        )}

        {onRecompute !== null && (
          <button
            type="button"
            className="ssp2-btn"
            onClick={onRecompute}
            title={`الاحتساب يجري ليلا (${ENGINE_RUN_CLOCK} بتوقيت الرياض) لا فورا، والزر يحدد المدى فقط`}
          >
            <CalendarClock size={13} /> إعادة الاحتساب (ليلا)
          </button>
        )}
      </div>
    </div>

    <div className="ssp2-header__facts">
      <span className="ssp2-fact">
        <CalendarCheck size={13} aria-hidden="true" />
        <span className="ssp2-fact__label">حالات اليوم</span>
      </span>

      {facts === null ? (
        <span className="ssp2-fact">
          <span className="ssp2-fact__label">لم تصل بعد</span>
        </span>
      ) : (
        FACT_KEYS.map((key) => (
          <span className="ssp2-fact" key={key}>
            <span className="ssp2-fact__label">{ATTENDANCE_STATUS_LABELS[key]}</span>
            <b dir="ltr">{fmtCount(facts[key])}</b>
          </span>
        ))
      )}

      <span className="ssp2-fact__sep" aria-hidden="true" />

      <span className="ssp2-fact">
        <span className="ssp2-fact__label">يحتاج قرارا</span>
        <b dir="ltr">{pendingDays === null ? '—' : fmtCount(pendingDays)}</b>
      </span>
    </div>
  </header>
);

export default AttendanceHead;
