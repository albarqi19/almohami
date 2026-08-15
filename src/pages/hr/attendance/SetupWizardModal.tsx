import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { AlertTriangle, CalendarClock, Check, X } from 'lucide-react';

import { usePermission } from '../../../hooks/usePermission';
import {
  ATTENDANCE_SETUP_MAX_PROFILES,
  WEEK_DAY_KEYS,
  WEEK_DAY_LABELS,
} from '../../../types/hr';
import type {
  AttendanceSetupResult,
  AttendanceSetupWarning,
  WeekDayKey,
} from '../../../types/hr';
import {
  ENGINE_RUN_CLOCK,
  SETUP_START_MAX_DAYS,
  addDaysISO,
  errorText,
  fmtCount,
  fmtDate,
  fmtMinutes,
  monthStartISO,
  peopleWord,
  todayISO,
} from './attendanceFormat';
// 🔴 لا `buildWeekPattern` هنا: مسارُ التهيئة يأخذ `schedule.work_days` (سبعةُ منطقيّات)
// ويبني النمطَ في الخادم بنفسِه، ويشتقّ `required_minutes` من الفارق. إرسالُ نمطٍ مبنيٍّ
// هنا يعني مصدرين لرقمٍ واحد — جدولاً بـ٤٢٠ وآخرَ بـ٤٨٠ حسب مَن كتب النسخة.
import {
  clampInt,
  offDaysFromWorkDays,
  profileName,
  scheduleClock,
  useRunSetup,
  useTrackableEmployees,
  useWorkSchedules,
  workDaysFromOff,
} from './useAttendanceSetup';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔑 **معالجُ التهيئة — البابُ الوحيد لتفعيل وحدة الحضور من الواجهة.**
 *
 * ثلاثُ خطواتٍ هي نفسُها التي تشرحها لوحةُ المكتب الفارغ نصّاً: أيامُ الدوام وساعاتُه ·
 * مَن يبصم · من أيّ تاريخ. وفعلٌ خادميٌّ واحدٌ في النهاية (`POST /hr/attendance/setup`)
 * يكتب في معاملةٍ واحدة: نسخةَ جدولٍ، وإسناداً مؤرَّخاً، و`attendance_tracked` على
 * المختارين حصراً، و`tenants.hr_attendance_enabled`.
 *
 * ══════ 🔴 لماذا هي أخطرُ شاشةٍ في الوحدة ══════
 * `attendance_start_date` **تُكتب مرّةً ولا تتحرّك بعدها** (`raiseFlags` يُبقي القديمةَ
 * ويُبلّغ). تحريكُها إلى الأمام يقلب أياماً محتسَبةً إلى «غيرُ متتبَّع»، وإلى الخلف يفتح
 * ماضياً لم تُقصَد إعادةُ فتحه — وكلاهما إعادةُ كتابةٍ للماضي بلا سطرٍ يفسّر. ولذلك أثرُ
 * الاختيار **مقروءٌ قبل التأكيد** لا بعده: «سيبدأ الاحتساب من … ولن تُنشأ سجلّاتٌ لما قبله».
 *
 * ══════ وما لا تَعِد به هذه الشاشة ══════
 * لا رقمَ يتغيّر بعد الضغط: الأيامُ تُكتب في **الاحتساب الليليّ** لا في الطلب. ويُقال ذلك
 * قبل التأكيد وبعده معاً — ومديرٌ ينتظر رقماً لا يأتي يظنّ الوحدةَ معطوبةً في يومها الأول.
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface Props {
  /** `weekend_setting` من التشخيص — مرجعُ الإجازات لمن لا إسنادَ له، وبه يُبذَر النموذج. */
  weekendSetting: string[];
  /** أُهيّئ المكتبُ سلفاً؟ يغيّر النبرةَ من «تفعيل» إلى «إضافةُ من يبصم». */
  alreadyEnabled: boolean;
  onClose: () => void;
  onDone: () => void;
}

type Step = 1 | 2 | 3;

const STEP_TITLES: Record<Step, string> = {
  1: 'أيامُ الدوام وساعاتُه',
  2: 'مَن يبصم؟',
  3: 'من أيّ تاريخ؟',
};

/** الأرقامُ العربية للخطوات — تُقرأ ولا تُحسب، فتُكتب حروفاً لا `toLocaleString`. */
const STEP_MARKS: Record<Step, string> = { 1: '١', 2: '٢', 3: '٣' };

/** «HH:MM» ⇒ دقائقُ منذ منتصف الليل، أو `null` لأيّ شكلٍ آخر. */
function clockMinutes(value: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return m === null ? null : Number(m[1]) * 60 + Number(m[2]);
}

/** أسماءُ أيامٍ بالعربية مفصولةً — و«بلا عطلة» حين لا يومَ راحةٍ إطلاقاً. */
function daysText(days: readonly string[]): string {
  if (days.length === 0) return 'بلا عطلة';
  return days
    .map((day) => WEEK_DAY_LABELS[day.toLowerCase() as WeekDayKey] ?? day)
    .join('، ');
}

export const SetupWizardModal: React.FC<Props> = ({
  weekendSetting,
  alreadyEnabled,
  onClose,
  onDone,
}) => {
  // سجلُّ المنسوبين محروسٌ بـ`hr.view` وهذه الشاشةُ بـ`hr.attendance.view` — فالقراءةُ
  // تُفحَص قبل الطلب لا بعد ٤٠٣ داخل معالجٍ نصفَ مملوء.
  const canListEmployees = usePermission('hr.view');

  const [step, setStep] = useState<Step>(1);
  const [workDays, setWorkDays] = useState<Record<WeekDayKey, boolean>>(
    () => workDaysFromOff(weekendSetting)
  );
  const [start, setStart] = useState('08:30');
  const [end, setEnd] = useState('16:30');
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [graceIn, setGraceIn] = useState(15);
  const [trackAll, setTrackAll] = useState(!canListEmployees);
  const [picked, setPicked] = useState<number[]>([]);
  const [filter, setFilter] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [result, setResult] = useState<AttendanceSetupResult | null>(null);

  const setup = useRunSetup();
  const employees = useTrackableEmployees(!trackAll && canListEmployees && step === 2);

  /**
   * 🔴 مكتبٌ مُهيَّأٌ سلفاً: يُبذَر النموذجُ من **جدوله الفاعل** لا من إعداد العطلة.
   *
   * وإلّا فتحُ المعالج لإضافة من يبصم — وهو استعمالُه الغالبُ بعد أوّل يوم — يعرض قيماً
   * افتراضيةً تخالف جدولَ المكتب، فيمرّ المديرُ على الخطوة الأولى بلا لمسٍ **فتُنشأ نسخةٌ
   * ثانيةٌ صامتة** ويُعاد إسنادُ الجميع إليها. والبذرُ من النسخة يجعل النداءَ يطابق بصمتَها
   * دلالياً فيُعاد الصفُّ نفسُه بلا كتابةٍ واحدة.
   */
  const schedules = useWorkSchedules(alreadyEnabled);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || !alreadyEnabled) return;

    const rows = schedules.data?.schedules ?? [];
    if (rows.length === 0) return;

    const base = rows.find((one) => one.is_default && one.is_active)
      ?? rows.find((one) => one.is_active)
      ?? rows[0];

    seeded.current = true;

    const clock = scheduleClock(base);
    setWorkDays(workDaysFromOff(base.off_days));
    setStart(clock.start);
    setEnd(clock.end);
    setBreakMinutes(base.break_minutes);
    setGraceIn(base.grace_in_minutes);
  }, [alreadyEnabled, schedules.data]);

  const workingDays = useMemo(() => WEEK_DAY_KEYS.filter((day) => workDays[day]), [workDays]);
  const offDays = useMemo(() => offDaysFromWorkDays(workDays), [workDays]);

  const startAt = clockMinutes(start);
  const endAt = clockMinutes(end);
  const dailyMinutes = startAt !== null && endAt !== null ? endAt - startAt : null;

  /** انفصامُ نهاية الأسبوع — يُقرأ **قبل** التأكيد لا في تحذيرٍ بعد الكتابة. */
  const schism = useMemo(() => {
    const a = [...offDays].sort();
    const b = [...weekendSetting].map((day) => day.toLowerCase()).sort();
    return a.length !== b.length || a.some((day, i) => day !== b[i]);
  }, [offDays, weekendSetting]);

  const rows = useMemo(() => {
    const list = employees.data?.data ?? [];
    const needle = filter.trim();

    return list
      .filter((profile) => {
        if (needle === '') return true;
        return `${profileName(profile)} ${profile.job_title ?? ''}`.includes(needle);
      })
      .map((profile) => ({
        id: profile.id,
        name: profileName(profile),
        title: profile.job_title ?? null,
        tracked: profile.attendance_tracked === true,
        anchor: profile.attendance_start_date ?? null,
      }));
  }, [employees.data, filter]);

  const floor = monthStartISO();
  const ceiling = addDaysISO(todayISO(), SETUP_START_MAX_DAYS);
  const selectedCount = trackAll ? null : picked.length;

  const togglePick = (id: number) => {
    setPicked((current) =>
      current.includes(id) ? current.filter((one) => one !== id) : [...current, id]
    );
  };

  const stepOneReady = workingDays.length > 0 && dailyMinutes !== null && dailyMinutes > 0;
  const stepTwoReady = trackAll || picked.length > 0;

  const goNext = () => {
    if (step === 1) {
      if (workingDays.length === 0) {
        toast.error('اختر يومَ دوامٍ واحداً على الأقلّ — سبعةُ أيام عطلةٍ ليست جدولاً.');
        return;
      }
      if (dailyMinutes === null || dailyMinutes <= 0) {
        toast.error('وقتُ الانصراف يجب أن يكون بعد وقت الحضور.');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!stepTwoReady) {
        toast.error('حدّد مَن يبصم، أو اطلب الكلَّ المؤهَّل صراحةً.');
        return;
      }
      if (picked.length > ATTENDANCE_SETUP_MAX_PROFILES) {
        toast.error(`أقصى ما يُهيَّأ دفعةً واحدة ${ATTENDANCE_SETUP_MAX_PROFILES} ملفّاً.`);
        return;
      }
      setStep(3);
    }
  };

  const submit = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      toast.error('اكتب تاريخَ بدءٍ صحيحاً.');
      return;
    }

    if (startDate < floor || startDate > ceiling) {
      toast.error(`تاريخُ البدء بين ${fmtDate(floor)} و${fmtDate(ceiling)}.`);
      return;
    }

    try {
      const data = await setup.mutateAsync({
        attendance_start_date: startDate,
        ...(trackAll ? { track_all: true } : { employee_profile_ids: picked }),
        schedule: {
          work_days: workDays,
          start,
          end,
          break_minutes: clampInt(breakMinutes, 0, 480, 60),
          grace_in_minutes: clampInt(graceIn, 0, 240, 15),
        },
      });

      setResult(data);
      onDone();

      toast.success(
        data.created
          ? `فُعِّل الحضورُ على ${peopleWord(data.tracked)} — يعمل المحرّكُ ${data.engine_runs_at}`
          : 'كلُّ شيءٍ مُهيَّأٌ سلفاً — لم يُكتب صفٌّ واحد.'
      );
    } catch (e) {
      toast.error(errorText(e, 'فشل في تهيئة الحضور'));
    }
  };

  // ══════ لوحةُ ما وقع فعلاً — تحلّ محلّ الخطوات بعد النجاح ══════
  if (result !== null) {
    return (
      <div className="hr-modal-overlay" onClick={onClose}>
        <div className="hr-modal hra-modal" onClick={(e) => e.stopPropagation()}>
          <div className="hr-modal__h">
            <h3>تمّت التهيئة</h3>
            <button type="button" className="hr-icon-btn" onClick={onClose} aria-label="إغلاق">
              <X size={18} />
            </button>
          </div>

          <div className="hr-modal__b">
            <p className="hra-hint">
              {result.created
                ? 'كُتبت التهيئةُ في معاملةٍ واحدة.'
                : 'كان المكتبُ مُهيَّأً بهذا التعريف سلفاً — فلم يُكتب صفٌّ واحد، ولا شيءَ يحتاج إعادة.'}
            </p>

            <dl className="hra-kv">
              <dt>الجدول</dt>
              <dd>
                {result.schedule_name} · نسخة <span dir="ltr">{fmtCount(result.schedule_version)}</span>
                {result.schedule_created ? ' (أُنشئت الآن)' : ' (كانت قائمة)'}
              </dd>

              <dt>مَن يبصم</dt>
              <dd>{peopleWord(result.tracked)} من {peopleWord(result.selected)} في التحديد</dd>

              <dt>الإسناد</dt>
              <dd>
                {fmtCount(result.assigned)} إسناداً جديداً
                {result.assignments_existing > 0
                  ? ` · ${fmtCount(result.assignments_existing)} كان قائماً`
                  : ''}
              </dd>

              <dt>تاريخُ البدء</dt>
              <dd>{fmtDate(result.attendance_start_date)}</dd>

              <dt>ما وُسم للاحتساب</dt>
              <dd>
                {result.dirty_marked === 0
                  ? 'لا شيء — تاريخُ البدء لم يقع بعد'
                  : `${fmtCount(result.dirty_marked)} يومَ موظفٍ (${fmtDate(result.dirty_from)} ← ${fmtDate(result.dirty_to)})`}
              </dd>

              <dt>يعمل المحرّك</dt>
              <dd dir="ltr">{result.engine_runs_at}</dd>
            </dl>

            <p className="hra-note">
              <CalendarClock size={13} aria-hidden="true" />
              <span>
                الأيامُ تظهر بعد أوّل احتسابٍ ليليّ لا فوراً — ولا رقمَ يتغيّر على الشاشة الآن.
              </span>
            </p>

            <Warnings list={result.warnings} />
          </div>

          <div className="hr-modal__f">
            <button type="button" className="hr-btn hr-btn--primary" onClick={onClose}>
              تمّ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hr-modal-overlay" onClick={onClose}>
      <div className="hr-modal hra-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hr-modal__h">
          <h3>{alreadyEnabled ? 'تهيئةُ الحضور — إضافةُ من يبصم' : 'تهيئةُ الحضور والانصراف'}</h3>
          <button type="button" className="hr-icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="hr-modal__b">
          {/* شريطُ الخطوات — الرقمُ نفسُه الذي تشرحه لوحةُ المكتب الفارغ. */}
          <ol className="hra-wiz" aria-label="خطواتُ التهيئة">
            {([1, 2, 3] as Step[]).map((one) => (
              <li
                className={`hra-wiz__s${one === step ? ' is-on' : ''}${one < step ? ' is-done' : ''}`}
                key={one}
                aria-current={one === step ? 'step' : undefined}
              >
                <span className="hra-wiz__n" aria-hidden="true">
                  {one < step ? <Check size={12} /> : STEP_MARKS[one]}
                </span>
                <span className="hra-wiz__t">{STEP_TITLES[one]}</span>
              </li>
            ))}
          </ol>

          {/* ═════════ الخطوة ١ — أيامُ الدوام وساعاتُه ═════════ */}
          {step === 1 && (
            <>
              <p className="hra-hint">
                {alreadyEnabled
                  ? 'هذه القيمُ من جدول مكتبك الحاليّ. أبقِها كما هي إن كنتَ تضيف من يبصم فقط — فلا تُنشأ نسخةٌ جديدة ولا يُعاد حسابُ يومٍ واحد.'
                  : 'جدولٌ واحدٌ للمكتب.'}{' '}
                وتحريرُه لاحقاً <strong>نسخةٌ جديدةٌ تسري من تاريخ</strong> لا تعديلٌ في
                المكان — فتقريرُ شهرٍ مضى لا يتغيّر بلا أن يفعل أحدٌ شيئاً.
              </p>

              <div className="hr-field">
                <label id="hra-days-l">أيامُ الدوام *</label>
                <div className="hra-days" role="group" aria-labelledby="hra-days-l">
                  {WEEK_DAY_KEYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      className="hra-daytog"
                      aria-pressed={workDays[day]}
                      onClick={() => setWorkDays((current) => ({ ...current, [day]: !current[day] }))}
                    >
                      {WEEK_DAY_LABELS[day]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="hr-field hr-field--row">
                <div className="hr-field">
                  <label htmlFor="hra-w-start">بدايةُ الدوام *</label>
                  <input
                    id="hra-w-start"
                    type="time"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </div>

                <div className="hr-field">
                  <label htmlFor="hra-w-end">نهايتُه *</label>
                  <input
                    id="hra-w-end"
                    type="time"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="hr-field hr-field--row">
                <div className="hr-field">
                  <label htmlFor="hra-w-break">الاستراحة (دقيقة)</label>
                  <input
                    id="hra-w-break"
                    type="number"
                    min={0}
                    max={480}
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(Number(e.target.value))}
                  />
                </div>

                <div className="hr-field">
                  <label htmlFor="hra-w-grace">مهلةُ التأخّر (دقيقة)</label>
                  <input
                    id="hra-w-grace"
                    type="number"
                    min={0}
                    max={240}
                    value={graceIn}
                    onChange={(e) => setGraceIn(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="hra-impact">
                <p className="hra-impact__t">ما سيُكتب في الجدول</p>
                <ul className="hra-impact__l">
                  <li>
                    {workingDays.length === 0
                      ? 'لا يومَ دوامٍ مختار — لا بدّ من يومٍ واحدٍ على الأقلّ.'
                      : `${fmtCount(workingDays.length)} أيامَ دوامٍ في الأسبوع · عطلة: ${daysText(offDays)}`}
                  </li>
                  <li>
                    {dailyMinutes !== null && dailyMinutes > 0
                      ? `${fmtMinutes(dailyMinutes)} مطلوبةٌ في اليوم (${start} ← ${end})`
                      : 'وقتُ الانصراف يجب أن يكون بعد وقت الحضور.'}
                  </li>
                </ul>
              </div>

              {schism && (
                <p className="hra-note hra-note--warn">
                  <AlertTriangle size={13} aria-hidden="true" />
                  <span>
                    عطلةُ هذا الجدول ({daysText(offDays)}) تخالف عطلةَ المكتب المسجَّلة (
                    {daysText(weekendSetting)}). الحضورُ يقرأ الجدولَ والإجازاتُ تقرأ الإعدادَ لمن
                    لا إسنادَ له — فيخرج رقمان لمدىً واحدٍ بين الوحدتين. يُقبل ويُبلَّغ ولا
                    يُصحَّح أحدُهما صامتاً.
                  </span>
                </p>
              )}
            </>
          )}

          {/* ═════════ الخطوة ٢ — مَن يبصم ═════════ */}
          {step === 2 && (
            <>
              <p className="hra-hint">
                التتبّعُ <strong>مُطفأٌ على كلّ ملفٍّ افتراضياً</strong>، ويُفتح على من تختاره
                وحدَه. الشركاءُ والمالكُ عادةً خارجَ التتبّع فلا يظهرون في أيّ تقرير.
              </p>

              <div className="hra-modes" role="group" aria-label="نطاقُ التتبّع">
                <button
                  type="button"
                  className="hra-mode"
                  aria-pressed={!trackAll}
                  disabled={!canListEmployees}
                  onClick={() => setTrackAll(false)}
                >
                  <span className="hra-mode__n">أختارهم بالاسم</span>
                  <span className="hra-mode__h">
                    {canListEmployees
                      ? 'الافتراضُ — ولا يُفتح التتبّعُ على أحدٍ لم تختره'
                      : 'يحتاج صلاحيةَ سجلّ المنسوبين (hr.view)'}
                  </span>
                </button>

                <button
                  type="button"
                  className="hra-mode"
                  aria-pressed={trackAll}
                  onClick={() => setTrackAll(true)}
                >
                  <span className="hra-mode__n">الكلُّ المؤهَّل</span>
                  <span className="hra-mode__h">
                    كلُّ ملفٍّ نشطٍ لحسابٍ فعّالٍ ليس عميلاً — راجِع من غادر المكتبَ أوّلاً
                  </span>
                </button>
              </div>

              {trackAll ? (
                <p className="hra-note hra-note--warn">
                  <AlertTriangle size={13} aria-hidden="true" />
                  <span>
                    ملفٌّ نشطٌ لمن لم يعد موظفاً يُسجَّل عليه «بلا سجلّ» كلَّ يومِ عملٍ إلى
                    الأبد، فتمتلئ الشاشةُ بأسماءٍ لا وجودَ لها. والتراجعُ ممكنٌ من ملفّ الموظف.
                  </span>
                </p>
              ) : (
                <>
                  <div className="hr-field">
                    <label htmlFor="hra-pick-q">تصفيةٌ بالاسم أو المسمّى</label>
                    <input
                      id="hra-pick-q"
                      type="search"
                      value={filter}
                      placeholder="اكتب جزءاً من الاسم"
                      onChange={(e) => setFilter(e.target.value)}
                    />
                  </div>

                  {employees.isPending ? (
                    <div className="hra-state hra-state--loading" aria-busy="true" aria-label="جارٍ تحميل الملفّات">
                      {Array.from({ length: 4 }, (_, i) => <span className="hra-skel" key={i} />)}
                    </div>
                  ) : employees.isError ? (
                    <p className="hra-line">
                      {errorText(employees.error, 'تعذّر جلبُ ملفّات الموظفين')} — أو اختر «الكلُّ
                      المؤهَّل».
                    </p>
                  ) : rows.length === 0 ? (
                    <p className="hra-line">لا ملفَّ مطابقاً في سجلّ المنسوبين.</p>
                  ) : (
                    <div className="hra-picks">
                      {rows.map((row) => (
                        <label className="hra-pick" key={row.id}>
                          <input
                            type="checkbox"
                            checked={picked.includes(row.id)}
                            onChange={() => togglePick(row.id)}
                          />
                          <span className="hra-pick__main">
                            <span className="hra-pick__n">{row.name}</span>
                            <span className="hra-pick__m">
                              {row.title ?? 'بلا مسمّى'}
                              {row.tracked ? ' · يبصم سلفاً' : ''}
                              {row.anchor !== null ? ` · بدأ ${fmtDate(row.anchor)}` : ''}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {(employees.data?.total ?? 0) > rows.length && filter.trim() === '' && (
                    <p className="hra-hint">
                      يُعرض <span dir="ltr">{fmtCount(rows.length)}</span> من{' '}
                      <span dir="ltr">{fmtCount(employees.data?.total)}</span> ملفّاً — صفِّ القائمةَ
                      بالاسم، أو اختر «الكلُّ المؤهَّل».
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {/* ═════════ الخطوة ٣ — من أيّ تاريخ (أخطرُ حقلٍ في الوحدة) ═════════ */}
          {step === 3 && (
            <>
              <p className="hra-hint">
                تاريخُ البدء هو الحاجزُ الذي يمنع أن يرث كلُّ موظفٍ سنةً من الأيام بلا سجلّ في
                أوّل ليلة. <strong>ويُكتب مرّةً ولا يتحرّك بعدها</strong>.
              </p>

              <div className="hr-field">
                <label htmlFor="hra-anchor">تاريخُ بدء الاحتساب *</label>
                <input
                  id="hra-anchor"
                  type="date"
                  value={startDate}
                  min={floor}
                  max={ceiling}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="hra-count">
                  المسموح بين {fmtDate(floor)} و{fmtDate(ceiling)}
                </span>
              </div>

              <div className="hra-impact hra-impact--anchor">
                <p className="hra-impact__t">أثرُ هذا الاختيار</p>
                <ul className="hra-impact__l">
                  <li>
                    <strong>سيبدأ الاحتساب من {fmtDate(startDate)}</strong> — ولن تُنشأ سجلّاتٌ
                    لما قبله إطلاقاً.
                  </li>
                  <li>
                    {startDate > todayISO()
                      ? 'التاريخُ في المستقبل — لن يُحتسب يومٌ حتى يقع.'
                      : `تُحتسب الأيامُ من ${fmtDate(startDate)} إلى أمس في أوّل تشغيلٍ ليليّ.`}
                  </li>
                  <li>
                    {selectedCount === null
                      ? 'كلُّ ملفٍّ مؤهَّلٍ في المكتب سيُفتح عليه التتبّع.'
                      : `${peopleWord(selectedCount)} سيُفتح عليهم التتبّع — ولا أحدَ سواهم.`}
                  </li>
                  <li>
                    أيامُ الدوام: {daysText(workingDays)} · العطلة: {daysText(offDays)}
                  </li>
                </ul>
              </div>

              <p className="hra-note">
                <CalendarClock size={13} aria-hidden="true" />
                <span>
                  الاحتسابُ يجري ليلاً ({ENGINE_RUN_CLOCK} بتوقيت الرياض) لا فوراً: بعد الضغط لن
                  يتغيّر رقمٌ على الشاشة، وتظهر الأيامُ في أوّل تشغيلٍ للمحرّك.
                </span>
              </p>

              {schism && (
                <p className="hra-note hra-note--warn">
                  <AlertTriangle size={13} aria-hidden="true" />
                  <span>
                    عطلةُ الجدول تخالف عطلةَ المكتب المسجَّلة — سيُبلَّغ عنها ولن يُصحَّح أحدُهما
                    صامتاً.
                  </span>
                </p>
              )}
            </>
          )}
        </div>

        <div className="hr-modal__f">
          <button
            type="button"
            className="hr-btn"
            onClick={step === 1 ? onClose : () => setStep((current) => (current - 1) as Step)}
          >
            {step === 1 ? 'إلغاء' : 'رجوع'}
          </button>

          {step < 3 ? (
            <button
              type="button"
              className="hr-btn hr-btn--primary"
              onClick={goNext}
              disabled={step === 1 ? !stepOneReady : !stepTwoReady}
            >
              التالي
            </button>
          ) : (
            <button
              type="button"
              className="hr-btn hr-btn--primary"
              onClick={() => { void submit(); }}
              disabled={setup.isPending}
            >
              {setup.isPending ? 'جارٍ التهيئة…' : 'فعِّل الحضور'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/** تحذيراتُ الخادم — تُعرض كما وصلت: جُملٌ ركّبها من أرقامٍ لا يملكها العميل. */
const Warnings: React.FC<{ list: AttendanceSetupWarning[] }> = ({ list }) => {
  if (list.length === 0) return null;

  return (
    <div className="hra-secb">
      <p className="hra-hint">تنبيهاتٌ لا تمنع شيئاً — وتستحقّ القراءة:</p>
      <ul className="hra-why">
        {list.map((warning) => (
          <li className="hra-why__i is-no" key={warning.code + warning.message}>
            <span className="hra-why__m" aria-hidden="true">!</span>
            <span>{warning.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SetupWizardModal;
