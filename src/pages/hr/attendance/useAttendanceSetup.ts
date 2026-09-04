import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hrAttendanceService } from '../../../services/hrAttendanceService';
import { hrService } from '../../../services/hrService';
import { WEEK_DAY_KEYS } from '../../../types/hr';
import type {
  AttendanceSetupPayload,
  AttendanceRecomputePayload,
  EmployeeProfile,
  ScheduleAssignPayload,
  WeekDayKey,
  WorkSchedule,
  WorkSchedulePayload,
} from '../../../types/hr';
import { ATT_KEYS } from './useAttendanceQueue';

/**
 * تهيئةُ الوحدة وتشخيصُها وجداولُ دوامها — **الأفعالُ التي بدونها لا يستطيع مكتبٌ أن
 * يفعّل الحضورَ من الواجهة إطلاقاً**، فتبقى الشاشةُ على لوحة التهيئة أبداً.
 *
 * ══════ 🔴 صفرُ استطلاعٍ دوريّ (كما في بقيّة الوحدة) ══════
 * لا `refetchInterval` ولا `setInterval`. التشخيصُ يُجلَب عند فتح الصفحة ومع كلّ إبطال،
 * والتهيئةُ فعلٌ يقع مرّةً في عمر المكتب.
 *
 * ══════ ما الذي يُبطَل بعد كلّ كتابة ══════
 * التهيئةُ والإسنادُ يغيّران **الطابورَ وشاشةَ اليومَ والتشخيصَ وقائمةَ الجداول** معاً،
 * فالإبطالُ يمسّ `['hr','attendance']` كلَّه — وإبطالٌ دقيقٌ هنا يترك عمودين يكذبان.
 * ويُبطَل معه `['hr']` بعد التهيئة وحدَها: `attendance_tracked` عمودٌ على ملفّ الموظف،
 * وسجلُّ المنسوبين يعرضه.
 */

/** دقيقةٌ واحدةٌ من الطزاجة — نفسُ `STALE` في طابور المراجعة. */
const STALE = 60_000;

// ══════════ القراءة ══════════

/**
 * تشخيصُ التهيئة — مصدرُ **شاشة المكتب الفارغ** و**حصرِ الأسباب** فوق الطابور.
 *
 * يكفيه `hr.attendance.view`: مَن يرى الحضورَ يرى لماذا لا يظهر. و`retry:false` مقصود —
 * مكتبٌ بلا اشتراكٍ أو بلا `hr_enabled` يُردّ فوراً، وإعادةُ المحاولة تكرّر الردَّ نفسَه.
 */
export function useSetupHealth() {
  return useQuery({
    queryKey: ATT_KEYS.health,
    queryFn: () => hrAttendanceService.getSetupHealth(),
    staleTime: STALE,
    retry: false,
  });
}

/** قائمةُ نسخِ الجداول — تُجلَب **عند فتح مودال الجدول وحدَه** لا مع كلّ فتحِ صفحة. */
export function useWorkSchedules(enabled: boolean) {
  return useQuery({
    queryKey: ATT_KEYS.schedules,
    queryFn: () => hrAttendanceService.listSchedules(),
    enabled,
    staleTime: STALE,
    retry: false,
  });
}

/**
 * ملفّاتُ الموظفين لاختيار **مَن يبصم** — من `hrService` لا من خدمةٍ ثانية.
 *
 * 🔴 محروسةٌ بـ`hr.view` **في الواجهة قبل الطلب**: مسارُ `/hr/employees` محروسٌ بها،
 * وشاشةُ الحضور محروسةٌ بـ`hr.attendance.view` وحدَها. فدورٌ مخصَّصٌ يملك الحضورَ ولا
 * يملك سجلَّ المنسوبين كان سيُقابَل بـ٤٠٣ داخل معالج التهيئة — والبديلُ المعروض له
 * «الكلُّ المؤهَّل» صراحةً لا شاشةٌ تفشل.
 */
export function useTrackableEmployees(enabled: boolean) {
  return useQuery({
    queryKey: ['hr', 'employees', 'trackable'] as const,
    // صفحةٌ واحدةٌ بسقف الخادم (١٠٠)، والترشيحُ بعدها **في المتصفّح**: صندوقُ بحثٍ يضرب
    // الشبكةَ مع كلّ حرفٍ يحتاج مؤقّتَ تهدئة، والمؤقّتاتُ ممنوعةٌ في هذه الوحدة. وما زاد
    // على المئة يُقال صراحةً ولا يُبتلع.
    queryFn: () => hrService.getEmployees({ status: 'active', per_page: 100 }),
    enabled,
    staleTime: STALE,
    retry: false,
  });
}

// ══════════ الكتابة ══════════

/**
 * 🔑 التهيئة — الفعلُ الذي يحوّل شاشةَ المكتب الفارغ إلى وحدةٍ حيّة.
 *
 * يُبطل `['hr','attendance']` (الطابور واليوم والتشخيص) و`['hr']` (سجلُّ المنسوبين يحمل
 * `attendance_tracked`).
 */
export function useRunSetup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: AttendanceSetupPayload) => hrAttendanceService.setup(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATT_KEYS.all });
      void qc.invalidateQueries({ queryKey: ['hr'] });
    },
  });
}

/**
 * إعادةُ الاحتساب — **وسمٌ فقط**: لا يتغيّر رقمٌ على الشاشة بعد النجاح.
 *
 * ولذلك **لا يُبطَل استعلامٌ واحدٌ هنا**: إبطالُ الطابور يُعيد جلبَ الأرقام نفسِها فيقرأ
 * المديرُ «تحديثاً» لم يغيّر شيئاً، ويظنّ الطلبَ فاشلاً. الردُّ يقول متى يعمل المحرّك،
 * وهو الحقيقةُ الوحيدةُ المتاحة الآن.
 */
export function useRecompute() {
  return useMutation({
    mutationFn: (payload: AttendanceRecomputePayload) => hrAttendanceService.recompute(payload),
  });
}

/** نسخةٌ جديدةٌ من نسخةٍ قائمة — الطريقُ الوحيد لتغيير جدولٍ مستعمَل. */
export function useNewScheduleVersion() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (vars: { scheduleId: number; payload: WorkSchedulePayload }) =>
      hrAttendanceService.newScheduleVersion(vars.scheduleId, vars.payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATT_KEYS.all });
    },
  });
}

/** تحريرُ مسوَّدةٍ لم تُسنَد — لا توسم يوماً واحداً: لا يومَ يُشير إليها أصلاً. */
export function useUpdateSchedule() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (vars: { scheduleId: number; payload: WorkSchedulePayload }) =>
      hrAttendanceService.updateSchedule(vars.scheduleId, vars.payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATT_KEYS.all });
    },
  });
}

/** الإسنادُ من تاريخ — الفعلُ الذي يُنقل به تعريفُ الدوام بلا مساسٍ بالماضي. */
export function useAssignSchedule() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (vars: { scheduleId: number; payload: ScheduleAssignPayload }) =>
      hrAttendanceService.assignSchedule(vars.scheduleId, vars.payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATT_KEYS.all });
      void qc.invalidateQueries({ queryKey: ['hr'] });
    },
  });
}

// ══════════ مساعداتٌ نقيّة ══════════

/**
 * قصُّ عددٍ إلى مداه — **مِرآةُ `AttendanceSetupService::intOr`** حرفاً بحرف.
 *
 * حقلُ `number` مفتوحٌ للكتابة: ٩٩٩ في «الاستراحة» يُردّ ٤٢٢ برسالة Laravel الافتراضية (لا
 * رسالةَ عربيةً مكتوبةً لهذه القاعدة)، فيقرأ المستخدمُ إنجليزيةً عن حقلٍ اسمُه
 * `schedule.break_minutes`. والقصُّ هنا يفعل ما يفعله الخادمُ نفسُه بعد التحقّق — فلا يتغيّر
 * معنىً ولا يُبتلع خطأٌ حقيقيّ. والحقلُ الفارغ (`''` ⇒ `NaN` عبر `Number`) يعود إلى القاعدة.
 */
export function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** خريطةُ «هل هذا اليومُ دوام؟» من قائمة أيام العطلة — سبعةُ مفاتيحَ دائماً بلا استثناء. */
export function workDaysFromOff(offDays: readonly string[]): Record<WeekDayKey, boolean> {
  const off = new Set(offDays.map((day) => day.toLowerCase()));
  const out = {} as Record<WeekDayKey, boolean>;

  WEEK_DAY_KEYS.forEach((day) => {
    out[day] = !off.has(day);
  });

  return out;
}

/** أيامُ العطلة من خريطة الدوام — الترتيبُ ترتيبُ Carbon لا ترتيبُ النقر. */
export function offDaysFromWorkDays(workDays: Record<WeekDayKey, boolean>): WeekDayKey[] {
  return WEEK_DAY_KEYS.filter((day) => !workDays[day]);
}

/**
 * ساعتا الدوام كما تظهران في نسخةٍ قائمة — **من أوّل يومِ عملٍ فيها**.
 *
 * نسخُ v1 تُبنى بساعةٍ واحدةٍ لكلّ الأيام (`AttendanceSetupService::desiredSchedule`)،
 * فالقراءةُ من أوّل يومٍ صادقةٌ لها. ونسخةٌ مبنيّةٌ يدوياً بساعاتٍ مختلفة تُقرأ ساعتُها
 * الأولى ويُقال ذلك في الشاشة — ولا تُخترَع ساعةٌ وسطى لا يعرفها أحد.
 */
export function scheduleClock(schedule: WorkSchedule | null): { start: string; end: string } {
  const pattern = schedule?.week_pattern ?? null;

  if (pattern !== null) {
    for (const day of WEEK_DAY_KEYS) {
      const value = pattern[day];
      if (value && value !== 'off') {
        return { start: value.start, end: value.end };
      }
    }
  }

  return { start: '08:30', end: '16:30' };
}

/** هل ساعاتُ أيام العمل في النسخة **موحَّدة**؟ — يُقال للمستخدم قبل أن يُعيد كتابتها. */
export function hasUniformClock(schedule: WorkSchedule | null): boolean {
  const pattern = schedule?.week_pattern ?? null;
  if (pattern === null) return true;

  const seen = new Set<string>();

  WEEK_DAY_KEYS.forEach((day) => {
    const value = pattern[day];
    if (value && value !== 'off') seen.add(`${value.start}-${value.end}`);
  });

  return seen.size <= 1;
}

/**
 * نمطُ أسبوعٍ كاملٌ بمفاتيحه السبعة — الشكلُ الذي يقبله `HrWorkScheduleController::dayRule`.
 *
 * 🔴 `required_minutes` **لا يُرسَل**: يشتقّه الخادمُ `(end − start)`. مصدران لرقمٍ واحدٍ
 * يعنيان جدولاً بـ٤٢٠ وآخرَ بـ٤٨٠ حسب مَن كتب النسخة.
 */
export function buildWeekPattern(
  workDays: Record<WeekDayKey, boolean>,
  start: string,
  end: string
): Record<WeekDayKey, 'off' | { mode: 'office'; start: string; end: string }> {
  const out = {} as Record<WeekDayKey, 'off' | { mode: 'office'; start: string; end: string }>;

  WEEK_DAY_KEYS.forEach((day) => {
    out[day] = workDays[day] ? { mode: 'office', start, end } : 'off';
  });

  return out;
}

/** الاسمُ المعروضُ لملفِّ موظف — من حساب المستخدم، وإلّا رقمُ الملفّ. */
export function profileName(profile: EmployeeProfile): string {
  return profile.user?.name ?? `ملف رقم ${profile.id}`;
}
