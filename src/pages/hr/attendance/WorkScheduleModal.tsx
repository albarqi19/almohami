import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { AlertTriangle, History, Power, X } from 'lucide-react';

import { usePermission } from '../../../hooks/usePermission';
import { hrAttendanceService } from '../../../services/hrAttendanceService';
import {
  SCHEDULE_RETRO_MIN_REASON,
  WEEK_DAY_KEYS,
  WEEK_DAY_LABELS,
} from '../../../types/hr';
import type {
  AttendanceSetupWarning,
  ScheduleAssignResult,
  WeekDayKey,
  WorkSchedule,
} from '../../../types/hr';
import {
  addDaysISO,
  daysWord,
  errorText,
  fmtCount,
  fmtDate,
  fmtMinutes,
  peopleWord,
  todayISO,
} from './attendanceFormat';
import {
  buildWeekPattern,
  clampInt,
  hasUniformClock,
  offDaysFromWorkDays,
  profileName,
  scheduleClock,
  useAssignSchedule,
  useNewScheduleVersion,
  useTrackableEmployees,
  useUpdateSchedule,
  useWorkSchedules,
  workDaysFromOff,
} from './useAttendanceSetup';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * **جدولُ الدوام — والقاعدةُ التي يقوم عليها هذا المودال كلُّه:**
 *
 * 🔴 **النسخةُ المستعمَلةُ لا تُحرَّر.** اليومُ المحتسَب يحمل `schedule_id` **مؤشِّراً لا
 * لقطة**؛ فتحريرُ النسخة يجعل أياماً حُسبت بتعريفٍ قديمٍ تُقرأ فجأةً بتعريفٍ جديد، فيتغيّر
 * تقريرُ شهرٍ مضى **بلا أن يفعل أحدٌ شيئاً ولا سطرَ في أيّ سجلٍّ يفسّر**. ولذلك التغييرُ هنا
 * فعلان لا فعل: نسخةٌ جديدة (`POST /{id}/new-version`) ثمّ إسنادٌ **من تاريخ**
 * (`POST /{id}/assign`) — والنسخةُ القديمةُ تبقى كما هي، **وهي وحدَها ما يحرس الماضي**.
 *
 * وتُقال هذه الجملةُ في الشاشة نصّاً قبل أيّ حقل: مستخدمٌ يظنّ أنه «يعدّل الجدول» ثمّ يرى
 * أرقامَ الشهر الماضي تتغيّر يفقد الثقةَ في كلّ رقمٍ بعدها.
 *
 * ══════ ثلاثةُ أفعالٍ تُقرأ من الحالة لا من ثلاثة أزرار ══════
 * · **إسناد** — لم يتغيّر التعريف: تُسنَد هذه النسخةُ لمن اختير من تاريخ. وهو **الفعلُ الذي
 *   يُصلِح «موظفٌ متتبَّعٌ بلا جدولٍ مُسنَد»** — أقوى سببٍ مفردٍ لأيامٍ لا تُحتسب إطلاقاً.
 * · **تحرير** — تغيّر التعريفُ والنسخةُ **لم تُستعمل بعد** (`editable` يصل مع الصفّ كي لا
 *   يكتشف المستخدمُ المنعَ بعد أن يملأ نموذجاً).
 * · **نسخةٌ جديدة** — تغيّر التعريفُ والنسخةُ مستعمَلة.
 *
 * ══════ ولا نسخةَ يتيمة ══════
 * نسخةٌ جديدةٌ بلا إسنادٍ لا تحكم أحداً وتبدو مُهيَّأة. فالفعلان يقعان في ضغطةٍ واحدة، ومَن
 * لا يملك سجلَّ المنسوبين (`hr.view`) يُمنَع بجملةٍ صريحةٍ **قبل** أن يكتب حرفاً.
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface Props {
  /** `weekend_setting` من التشخيص — لكشف الانفصام قبل الحفظ لا بعده. */
  weekendSetting: string[];
  onClose: () => void;
}

/** الفعلُ المستنتَج من الحالة — لا يختاره المستخدمُ من قائمة، بل تقوله له الشاشة. */
type ScheduleMode = 'assign' | 'edit' | 'version';

type ScheduleOutcome =
  | { kind: 'assigned'; data: ScheduleAssignResult }
  | { kind: 'edited'; warnings: AttendanceSetupWarning[] };

function daysText(days: readonly string[]): string {
  if (days.length === 0) return 'بلا عطلة';
  return days.map((day) => WEEK_DAY_LABELS[day.toLowerCase() as WeekDayKey] ?? day).join('، ');
}

function clockMinutes(value: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return m === null ? null : Number(m[1]) * 60 + Number(m[2]);
}

export const WorkScheduleModal: React.FC<Props> = ({ weekendSetting, onClose }) => {
  const canListEmployees = usePermission('hr.view');

  const list = useWorkSchedules(true);
  const employees = useTrackableEmployees(canListEmployees);
  const newVersion = useNewScheduleVersion();
  const updateSchedule = useUpdateSchedule();
  const assign = useAssignSchedule();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [workDays, setWorkDays] = useState<Record<WeekDayKey, boolean>>(
    () => workDaysFromOff(weekendSetting)
  );
  const [start, setStart] = useState('08:30');
  const [end, setEnd] = useState('16:30');
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [graceIn, setGraceIn] = useState(15);
  const [effectiveFrom, setEffectiveFrom] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [outcome, setOutcome] = useState<ScheduleOutcome | null>(null);
  const [toggling, setToggling] = useState(false);

  /** بذرُ المُختارين مرّةً واحدة — إعادةُ جلبِ القائمة لا تمحو ما اختاره المستخدم. */
  const seeded = useRef(false);

  const schedules = useMemo(() => list.data?.schedules ?? [], [list.data]);

  const selected: WorkSchedule | null = useMemo(
    () => schedules.find((one) => one.id === selectedId) ?? null,
    [schedules, selectedId]
  );

  /** أوّلُ اختيارٍ: النسخةُ الافتراضيةُ إن وُجدت — لا أوّلُ صفٍّ في القائمة. */
  useEffect(() => {
    if (selectedId !== null || schedules.length === 0) return;
    setSelectedId((schedules.find((one) => one.is_default) ?? schedules[0]).id);
  }, [schedules, selectedId]);

  /** كلَّما تغيّرت النسخةُ المختارة يُبذَر النموذجُ **منها** لا من آخر ما كُتب. */
  useEffect(() => {
    if (selected === null) return;
    const clock = scheduleClock(selected);
    setWorkDays(workDaysFromOff(selected.off_days));
    setStart(clock.start);
    setEnd(clock.end);
    setBreakMinutes(selected.break_minutes);
    setGraceIn(selected.grace_in_minutes);
  }, [selected]);

  /** الافتراضُ في الإسناد: **مَن يبصم اليوم** — لا كلُّ الملفّات ولا لا أحد. */
  useEffect(() => {
    const rows = employees.data?.data ?? [];
    if (seeded.current || rows.length === 0) return;
    seeded.current = true;
    setPicked(rows.filter((one) => one.attendance_tracked === true).map((one) => one.id));
  }, [employees.data]);

  const workingDays = useMemo(() => WEEK_DAY_KEYS.filter((day) => workDays[day]), [workDays]);
  const offDays = useMemo(() => offDaysFromWorkDays(workDays), [workDays]);

  const startAt = clockMinutes(start);
  const endAt = clockMinutes(end);
  const dailyMinutes = startAt !== null && endAt !== null ? endAt - startAt : null;

  const retro = effectiveFrom < todayISO();
  const busy = newVersion.isPending || assign.isPending || updateSchedule.isPending;

  const schism = useMemo(() => {
    const a = [...offDays].sort();
    const b = [...weekendSetting].map((day) => day.toLowerCase()).sort();
    return a.length !== b.length || a.some((day, i) => day !== b[i]);
  }, [offDays, weekendSetting]);

  /** هل تغيّر التعريفُ عن النسخة المختارة؟ — هو ما يفرّق «إسناداً» عن «نسخةٍ جديدة». */
  const changed = useMemo(() => {
    if (selected === null) return false;
    const clock = scheduleClock(selected);
    return daysText(offDays) !== daysText(selected.off_days)
      || clock.start !== start
      || clock.end !== end
      || selected.break_minutes !== breakMinutes
      || selected.grace_in_minutes !== graceIn;
  }, [selected, offDays, start, end, breakMinutes, graceIn]);

  const mode: ScheduleMode = !changed ? 'assign' : (selected?.editable === true ? 'edit' : 'version');
  const needsAssignment = mode !== 'edit';

  const employeeRows = useMemo(
    () => (employees.data?.data ?? []).map((profile) => ({
      id: profile.id,
      name: profileName(profile),
      tracked: profile.attendance_tracked === true,
    })),
    [employees.data]
  );

  /** الرسالةُ المانعة — واحدةٌ لكلّ الأسباب، تُقرأ في الزرّ المعطَّل وفي `toast` معاً. */
  const blocker = useMemo((): string | null => {
    if (selected === null) return 'اختر نسخةَ جدولٍ أوّلاً.';
    if (workingDays.length === 0) return 'اختر يومَ دوامٍ واحداً على الأقلّ — سبعةُ أيام عطلةٍ ليست جدولاً.';
    if (dailyMinutes === null || dailyMinutes <= 0) return 'وقتُ الانصراف يجب أن يكون بعد وقت الحضور.';

    if (mode === 'edit') return null;

    if (!selected.is_active) {
      return 'هذه النسخةُ معطَّلةٌ فلا تُسنَد — أعِد تفعيلَها أو اختر نسخةً أخرى.';
    }
    if (!canListEmployees) {
      return 'الإسنادُ يحتاج سجلَّ المنسوبين (صلاحية hr.view) — راجِع مديرَ المكتب.';
    }
    if (picked.length === 0) return 'حدّد مَن يُسنَد إليه الجدول.';
    if (retro && reason.trim().length < SCHEDULE_RETRO_MIN_REASON) {
      return `الإسنادُ بأثرٍ رجعيٍّ يلزمه سببٌ (${SCHEDULE_RETRO_MIN_REASON} أحرفٍ فأكثر) — يُقرأ بعد سنةٍ في نزاع.`;
    }
    return null;
  }, [
    selected, workingDays.length, dailyMinutes, mode,
    canListEmployees, picked.length, retro, reason,
  ]);

  const submit = async () => {
    if (blocker !== null) {
      toast.error(blocker);
      return;
    }
    if (selected === null) return;

    const payload = {
      week_pattern: buildWeekPattern(workDays, start, end),
      break_minutes: clampInt(breakMinutes, 0, 480, 60),
      grace_in_minutes: clampInt(graceIn, 0, 240, 15),
    };

    const assignPayload = {
      employee_profile_ids: picked,
      effective_from: effectiveFrom,
      // `reason` مسقوفٌ بـ٢٥٥ حرفاً في الخادم — والقصُّ هنا يمنع ٤٢٢ برسالةٍ إنجليزية.
      reason: reason.trim() === '' ? undefined : reason.trim().slice(0, 255),
    };

    try {
      // مسوَّدةٌ لم تُسنَد: تحريرٌ في المكان — ولا يومَ يُشير إليها فيُعاد النظرُ فيه.
      if (mode === 'edit') {
        const done = await updateSchedule.mutateAsync({ scheduleId: selected.id, payload });
        setOutcome({ kind: 'edited', warnings: done.warnings });
        toast.success('حُدِّثت النسخةُ — ولم تكن مستعمَلةً بعد.');
        return;
      }

      if (mode === 'assign') {
        const done = await assign.mutateAsync({ scheduleId: selected.id, payload: assignPayload });
        setOutcome({ kind: 'assigned', data: done });
        toast.success(`أُسنِد الجدولُ إلى ${peopleWord(done.assigned)} من ${fmtDate(done.effective_from)}`);
        return;
      }

      const created = await newVersion.mutateAsync({ scheduleId: selected.id, payload });
      const done = await assign.mutateAsync({
        scheduleId: created.schedule.id,
        payload: assignPayload,
      });

      setOutcome({
        kind: 'assigned',
        data: { ...done, warnings: [...created.warnings, ...done.warnings] },
      });
      toast.success(
        `نسخةٌ جديدة (${created.schedule.version}) أُسنِدت إلى ${peopleWord(done.assigned)} من ${fmtDate(done.effective_from)}`
      );
    } catch (e) {
      toast.error(errorText(e, 'فشل في حفظ الجدول'));
    }
  };

  /** تعطيلٌ/تفعيل — **بديلُ الحذف الذي لا وجودَ له** على هذا المورد. */
  const toggleActive = async (schedule: WorkSchedule) => {
    const next = !schedule.is_active;

    const confirmed = window.confirm(
      next
        ? `إعادةُ تفعيل «${schedule.name}»؟`
        : `تعطيلُ «${schedule.name}»؟ لا تُحذف ولا تظهر في الاختيار، والأيامُ المحتسَبةُ بها تبقى كما هي.`
    );

    if (!confirmed) return;

    setToggling(true);
    try {
      await hrAttendanceService.setScheduleActive(schedule.id, next);
      await list.refetch();
      toast.success(next ? 'أُعيد تفعيلُ النسخة' : 'عُطِّلت النسخة');
    } catch (e) {
      toast.error(errorText(e, 'تعذّر تغييرُ حالة النسخة'));
    } finally {
      setToggling(false);
    }
  };

  const ACTION_LABEL: Record<ScheduleMode, string> = {
    assign: 'أسنِد هذه النسخة',
    edit: 'احفظ التعديل',
    version: 'أنشئ نسخةً جديدة وأسندها',
  };

  return (
    <div className="hr-modal-overlay" onClick={onClose}>
      <div className="hr-modal hra-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hr-modal__h">
          <h3>جدولُ الدوام</h3>
          <button type="button" className="hr-icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="hr-modal__b">
          {outcome !== null ? (
            <OutcomePanel value={outcome} />
          ) : (
            <>
              {/* 🔴 الجملةُ التي يقوم عليها المودالُ كلُّه — تُقرأ قبل أيّ حقل. */}
              <p className="hra-note hra-note--rule">
                <History size={13} aria-hidden="true" />
                <span>
                  <strong>التعديلُ هنا نسخةٌ جديدةٌ تسري من تاريخ — لا تحريرٌ للماضي.</strong>{' '}
                  كلُّ يومٍ قبل تاريخ السريان يبقى محسوباً بالتعريف القديم، ولا يتغيّر تقريرُ
                  شهرٍ مضى بحرف. والنسخةُ القديمةُ تبقى كما هي لأنها مرجعُ ما حُسب بها.
                </span>
              </p>

              {list.isPending ? (
                <div className="hra-state hra-state--loading" aria-busy="true" aria-label="جارٍ تحميل الجداول">
                  {Array.from({ length: 3 }, (_, i) => <span className="hra-skel" key={i} />)}
                </div>
              ) : list.isError ? (
                <p className="hra-line">{errorText(list.error, 'تعذّر جلبُ جداول الدوام')}</p>
              ) : schedules.length === 0 ? (
                <p className="hra-line">لا نسخةَ جدولٍ في هذا المكتب — ابدأ بمعالج التهيئة.</p>
              ) : (
                <div className="hra-vers" role="radiogroup" aria-label="نسخُ الجدول">
                  {schedules.map((schedule) => (
                    <div className="hra-ver" key={schedule.id}>
                      <button
                        type="button"
                        className="hra-ver__pick"
                        role="radio"
                        aria-checked={schedule.id === selectedId}
                        onClick={() => setSelectedId(schedule.id)}
                      >
                        <span className="hra-ver__n">
                          {schedule.name} · نسخة <span dir="ltr">{schedule.version}</span>
                        </span>
                        <span className="hra-ver__m">
                          عطلة: {daysText(schedule.off_days)}
                          {' · '}
                          {schedule.usage.employees > 0
                            ? `تحكم ${peopleWord(schedule.usage.employees)}`
                            : 'لا تحكم أحداً'}
                          {schedule.editable ? ' · لم تُستعمل بعد' : ''}
                        </span>
                        <span className="hra-flags">
                          {schedule.is_default && <span className="hra-flag">الافتراضية</span>}
                          {!schedule.is_active && <span className="hra-flag">معطَّلة</span>}
                        </span>
                      </button>

                      <button
                        type="button"
                        className="hr-icon-btn"
                        disabled={toggling}
                        aria-label={schedule.is_active ? `تعطيل ${schedule.name}` : `تفعيل ${schedule.name}`}
                        onClick={() => { void toggleActive(schedule); }}
                      >
                        <Power size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selected !== null && (
                <>
                  {!hasUniformClock(selected) && (
                    <p className="hra-note hra-note--warn">
                      <AlertTriangle size={13} aria-hidden="true" />
                      <span>
                        ساعاتُ أيام هذه النسخة غيرُ موحَّدة، وهذه الشاشةُ تكتب ساعةً واحدةً لكلّ
                        أيام الدوام — فحفظُ تعريفٍ جديدٍ منها يوحّدها.
                      </span>
                    </p>
                  )}

                  <div className="hr-field">
                    <label id="hra-sch-days-l">أيامُ الدوام *</label>
                    <div className="hra-days" role="group" aria-labelledby="hra-sch-days-l">
                      {WEEK_DAY_KEYS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          className="hra-daytog"
                          aria-pressed={workDays[day]}
                          onClick={() =>
                            setWorkDays((current) => ({ ...current, [day]: !current[day] }))}
                        >
                          {WEEK_DAY_LABELS[day]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="hr-field hr-field--row">
                    <div className="hr-field">
                      <label htmlFor="hra-sch-start">بدايةُ الدوام *</label>
                      <input
                        id="hra-sch-start"
                        type="time"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                      />
                    </div>

                    <div className="hr-field">
                      <label htmlFor="hra-sch-end">نهايتُه *</label>
                      <input
                        id="hra-sch-end"
                        type="time"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="hr-field hr-field--row">
                    <div className="hr-field">
                      <label htmlFor="hra-sch-break">الاستراحة (دقيقة)</label>
                      <input
                        id="hra-sch-break"
                        type="number"
                        min={0}
                        max={480}
                        value={breakMinutes}
                        onChange={(e) => setBreakMinutes(Number(e.target.value))}
                      />
                    </div>

                    <div className="hr-field">
                      <label htmlFor="hra-sch-grace">مهلةُ التأخّر (دقيقة)</label>
                      <input
                        id="hra-sch-grace"
                        type="number"
                        min={0}
                        max={240}
                        value={graceIn}
                        onChange={(e) => setGraceIn(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* ═══ الإسنادُ من تاريخ — لكلّ فعلٍ عدا تحريرِ مسوَّدةٍ لم تُسنَد ═══ */}
                  {needsAssignment ? (
                    <>
                      <div className="hr-field">
                        <label htmlFor="hra-sch-from">تسري من تاريخ *</label>
                        <input
                          id="hra-sch-from"
                          type="date"
                          value={effectiveFrom}
                          /* سقفُ الخادم `MAX_FUTURE_DAYS = 366` — ٣٦٠ تقع داخله دائماً. */
                          max={addDaysISO(todayISO(), 360)}
                          onChange={(e) => setEffectiveFrom(e.target.value)}
                        />
                      </div>

                      {retro && (
                        <div className="hr-field">
                          <label htmlFor="hra-sch-reason">سببُ السريان الرجعيّ *</label>
                          <textarea
                            id="hra-sch-reason"
                            rows={2}
                            maxLength={255}
                            value={reason}
                            placeholder="مثال: قرارُ المكتب بنقل العطلة اعتباراً من أوّل الشهر"
                            onChange={(e) => setReason(e.target.value)}
                          />
                          <span className="hra-count" dir="ltr">
                            {reason.trim().length} / {SCHEDULE_RETRO_MIN_REASON}
                          </span>
                        </div>
                      )}

                      {canListEmployees ? (
                        <div className="hr-field">
                          <label id="hra-sch-emps-l">
                            مَن يُسنَد إليه ({fmtCount(picked.length)})
                          </label>

                          {employees.isPending ? (
                            <div className="hra-state hra-state--loading" aria-busy="true" aria-label="جارٍ تحميل الملفّات">
                              {Array.from({ length: 3 }, (_, i) => <span className="hra-skel" key={i} />)}
                            </div>
                          ) : employeeRows.length === 0 ? (
                            <p className="hra-line">لا ملفَّ نشطاً في سجلّ المنسوبين.</p>
                          ) : (
                            <div className="hra-picks" role="group" aria-labelledby="hra-sch-emps-l">
                              {employeeRows.map((row) => (
                                <label className="hra-pick" key={row.id}>
                                  <input
                                    type="checkbox"
                                    checked={picked.includes(row.id)}
                                    onChange={() =>
                                      setPicked((current) =>
                                        current.includes(row.id)
                                          ? current.filter((one) => one !== row.id)
                                          : [...current, row.id])}
                                  />
                                  <span className="hra-pick__main">
                                    <span className="hra-pick__n">{row.name}</span>
                                    <span className="hra-pick__m">
                                      {row.tracked ? 'يبصم اليوم' : 'خارجَ التتبّع'}
                                    </span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="hra-note hra-note--warn">
                          <AlertTriangle size={13} aria-hidden="true" />
                          <span>
                            الإسنادُ يحتاج سجلَّ المنسوبين (صلاحية hr.view). ونسخةٌ جديدةٌ بلا
                            إسنادٍ لا تحكم أحداً وتبدو مُهيَّأة — فالفعلُ محجوبٌ هنا لا نصفَ منفَّذ.
                          </span>
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="hra-hint">
                      هذه النسخةُ <strong>لم تُستعمل بعد</strong> (لا إسنادَ ولا يومَ محتسَبٌ
                      يُشير إليها) — فتُحرَّر في المكان بلا نسخةٍ جديدة، ولا يومَ يُعاد النظرُ فيه.
                    </p>
                  )}

                  <div className="hra-impact">
                    <p className="hra-impact__t">ما سيقع عند الحفظ</p>
                    <ul className="hra-impact__l">
                      <li>
                        {workingDays.length === 0
                          ? 'لا يومَ دوامٍ مختار.'
                          : `${fmtCount(workingDays.length)} أيامَ دوامٍ · عطلة: ${daysText(offDays)} · ${
                            dailyMinutes !== null && dailyMinutes > 0 ? fmtMinutes(dailyMinutes) : '—'
                          } في اليوم`}
                      </li>

                      <li>
                        {mode === 'edit' && 'تُحرَّر النسخةُ نفسُها — ولا يومَ محتسَبٌ يتأثّر.'}
                        {mode === 'assign'
                          && `لم يتغيّر التعريف: تُسنَد هذه النسخةُ إلى ${peopleWord(picked.length)} من ${fmtDate(effectiveFrom)} — بلا نسخةٍ جديدة.`}
                        {mode === 'version'
                          && `تغيّر التعريف: تُنشأ نسخةٌ أعلى وتُسنَد إلى ${peopleWord(picked.length)} من ${fmtDate(effectiveFrom)}، والقديمةُ تبقى كما هي.`}
                      </li>

                      {needsAssignment && (
                        <li>
                          {retro
                            ? 'السريانُ رجعيّ: تُوسَم الأيامُ من تاريخ السريان إلى أمس، ويكتب المحرّكُ ما تغيّر وحدَه ليلاً.'
                            : 'السريانُ من اليوم فما بعد: صفرُ وسمٍ وصفرُ صفٍّ يتغيّر — والماضي لا يُمسّ بحرف.'}
                        </li>
                      )}
                    </ul>
                  </div>

                  {schism && (
                    <p className="hra-note hra-note--warn">
                      <AlertTriangle size={13} aria-hidden="true" />
                      <span>
                        عطلةُ هذا الجدول ({daysText(offDays)}) تخالف عطلةَ المكتب المسجَّلة (
                        {daysText(weekendSetting)}) — الحضورُ يقرأ الجدولَ والإجازاتُ تقرأ الإعدادَ
                        لمن لا إسنادَ له، فيخرج رقمان لمدىً واحد.
                      </span>
                    </p>
                  )}

                  {blocker !== null && <p className="hra-line">{blocker}</p>}
                </>
              )}
            </>
          )}
        </div>

        <div className="hr-modal__f">
          <button type="button" className="hr-btn" onClick={onClose}>
            {outcome === null ? 'إلغاء' : 'إغلاق'}
          </button>

          {outcome === null && selected !== null && (
            <button
              type="button"
              className="hr-btn hr-btn--primary"
              onClick={() => { void submit(); }}
              disabled={busy || blocker !== null}
            >
              {busy ? 'جارٍ الحفظ…' : ACTION_LABEL[mode]}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/** لوحةُ ما وقع — بأرقام الخادم لا بأرقامٍ حسبتها الشاشةُ قبل الإرسال. */
const OutcomePanel: React.FC<{ value: ScheduleOutcome }> = ({ value }) => {
  if (value.kind === 'edited') {
    return (
      <>
        <p className="hra-hint">
          حُدِّثت النسخةُ في المكان — لم تكن مستعمَلةً، فلا يومَ محتسَبٌ تغيّر معناه.
        </p>
        <WarningList list={value.warnings} />
      </>
    );
  }

  const data = value.data;

  return (
    <>
      <p className="hra-hint">
        تمّ الإسناد. <strong>وكلُّ يومٍ قبل تاريخ السريان يبقى محسوباً بتعريفه القديم</strong>.
      </p>

      <dl className="hra-kv">
        <dt>النسخة</dt>
        <dd>
          {data.schedule_name} · نسخة <span dir="ltr">{fmtCount(data.schedule_version)}</span>
        </dd>

        <dt>تسري من</dt>
        <dd>
          {fmtDate(data.effective_from)}
          {data.retroactive ? ' (بأثرٍ رجعيّ)' : ''}
        </dd>

        <dt>الإسناد</dt>
        <dd>
          {fmtCount(data.assigned)} جديداً
          {data.assignments_existing > 0 ? ` · ${fmtCount(data.assignments_existing)} قائماً` : ''}
          {data.closed > 0 ? ` · أُغلق ${fmtCount(data.closed)} إسناداً سابقاً` : ''}
        </dd>

        <dt>أيامٌ يُعاد النظرُ فيها</dt>
        <dd>
          {data.days_affected === 0
            ? 'لا شيء — السريانُ لا يمسّ يوماً محتسَباً'
            : `${daysWord(data.days_affected)} · وُسم منها ${fmtCount(data.dirty_marked)}`}
        </dd>
      </dl>

      <WarningList list={data.warnings} />
    </>
  );
};

const WarningList: React.FC<{ list: AttendanceSetupWarning[] }> = ({ list }) => {
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

export default WorkScheduleModal;
