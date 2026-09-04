import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useIsDesktop } from '../../../hooks/useIsDesktop';
import { usePermission } from '../../../hooks/usePermission';
import RecordLeaveModal from '../leave/RecordLeaveModal';
import { SUGGESTION_HINTS } from '../../../types/hr';
import type { AttendanceDayRow, PunchDirection, SuggestionKind } from '../../../types/hr';

import AttendanceHead from './AttendanceHead';
import AttendanceEmptyState from './AttendanceEmptyState';
import AttendanceSetupBanner from './AttendanceSetupBanner';
import AttendanceRoster from './AttendanceRoster';
import AttendanceQueue from './AttendanceQueue';
import AttendanceRawPunches from './AttendanceRawPunches';
import AttendanceToday from './AttendanceToday';
import AttendanceDayDetail from './AttendanceDayDetail';
import ClaimsQueue from './ClaimsQueue';
import DecisionModal from './DecisionModal';
import ManualPunchModal from './ManualPunchModal';
import RecomputeModal from './RecomputeModal';
import SetupWizardModal from './SetupWizardModal';
import VoidResolutionModal from './VoidResolutionModal';
import WorkScheduleModal from './WorkScheduleModal';
import type { AttendanceView, RosterRow } from './AttendanceRoster';
import type { QueueAction } from './AttendanceQueue';
import {
  addDaysISO,
  byName,
  dayStatusLabel,
  daysWord,
  todayISO,
} from './attendanceFormat';
import {
  sharedSuggestion,
  useAttendanceDay,
  useAttendanceQueue,
  useQueueSelection,
  useSelectedGroup,
} from './useAttendanceQueue';
import { useSetupHealth } from './useAttendanceSetup';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * **الحضور والانصراف — الشاشةُ الأمّ.**
 *
 * ثلاثةُ أعمدةٍ ملتصقة على قالب `ssp2`: المنسوبون (يمين) · مساحةُ العمل (وسط) · سردُ
 * «لماذا» (يسار). و**شجرةٌ واحدةٌ لا شجرتان تُقصّان بالـCSS** (خطأُ `HrModule` #1):
 * `useIsDesktop(1024)` يقرّر شيئاً واحداً — هل يُرسَم عمودُ التفاصيل دائماً أم عند اختيار
 * يومٍ فقط. البنيةُ نفسُها تُكدَّس دون 1024 بقاعدةٍ واحدةٍ في `hr-attendance.css`.
 *
 * ══════ 🔴 صفرُ استطلاعٍ دوريّ ══════
 * لا `refetchInterval` ولا `setInterval` ولا نبضٌ من المتصفّح. ٤٦٢ جهازاً × ٣٠ث × ٨س ≈
 * ٤٤٣٬٥٠٠ طلبٍ إضافيٍّ يومياً، وكلٌّ منها يمرّ بـ`Tenant::updateLastActivity()` (ما زالت
 * بلا بوّابةٍ زمنية) على صفٍّ متوسّطُه ١٢٢ كيلوبايت ⇒ تحت `binlog_row_image=FULL` عشراتُ
 * الجيجابايت يومياً وقرصٌ يمتلئ في يوم. التحديثُ **بفعل المستخدم** أو بعد كلّ قرار.
 *
 * ══════ الحالةُ في الرابط لا في الذاكرة ══════
 * `?date=&emp=&view=` — فالرابطُ قابلٌ للمشاركة ولا تُفقد الحالةُ بالتحديث (عرفُ
 * `HrModule`/`LeavePage`).
 *
 * ══════ ولا زرَّ بلا مسار ══════
 * كلُّ فعلٍ هنا خلفه مسارٌ محقَّقٌ في `php artisan route:list --path=hr`: القرارُ الجماعيّ ·
 * نقضُه · البصمةُ اليدوية · اعتمادُ الادّعاء ورفضُه · مودالُ الإجازة القائم بحذافيره ·
 * **والتهيئةُ وإعادةُ الاحتساب وجداولُ الدوام** بعد أن بُنيت مساراتُها.
 *
 * ══════ 🔴 شاشةُ المكتب الفارغ تُقرَّر من التشخيص لا من فراغ الشاشة ══════
 * `GET /hr/attendance/setup-health` يقول `schedules_count` و`tracked_count` — وهما تعريفُ
 * «لم يُهيَّأ بعد». والاستدلالُ القديم (صفرُ صفٍّ اليومَ وصفرٌ في النافذة) يخطئ في الاتجاه
 * الأخطر: مكتبٌ مُهيَّأٌ في إجازةٍ رسميةٍ طويلة لا صفَّ له في النافذة، فيُدعى إلى تهيئةٍ
 * فعلها سلفاً ويُظنّ أنّ ما بناه ضاع. فيُقرَّر بالتشخيص متى وصل، ويبقى الاستدلالُ احتياطاً
 * حين لا يصل (٤٠٣ من دورٍ لا يملك القراءة مثلاً).
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** نافذةُ الطابور الافتراضية — أسبوعان، وهي نفسُها `QUEUE_DEFAULT_DAYS` في الخادم. */
const QUEUE_DAYS = 14;

/** عنوانُ عمود العمل لكلّ نطاق — نصٌّ واحدٌ لا يتكرّر في JSX. */
const VIEW_TITLES: Record<AttendanceView, string> = {
  queue: 'قائمة المراجعة',
  today: 'حضور اليوم',
  claims: 'طلبات التصحيح',
};

interface EmpRef {
  id: number;
  name: string | null;
}

type ModalState =
  | { kind: 'decision'; employee: EmpRef; dates: string[]; reason: string }
  | { kind: 'punch'; employee: EmpRef; dates: string[]; direction: PunchDirection; time?: string }
  | { kind: 'leave'; employee: EmpRef; start: string; end: string }
  | { kind: 'void'; resolutionId: number }
  | { kind: 'setup' }
  | { kind: 'recompute' }
  | { kind: 'schedule' }
  | null;

/** «HH:MM» من طابعٍ مقترَحٍ — وما لا يطابق الشكلَ يُترك بلا وقتٍ مقترَح لا بوقتٍ مخترَع. */
function timeOf(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const m = /[T ](\d{2}):(\d{2})/.exec(value);
  return m ? `${m[1]}:${m[2]}` : undefined;
}

export const AttendancePage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const isDesktop = useIsDesktop(1024);

  const canManage = usePermission('hr.attendance.manage');
  // صلاحيةٌ مستقلّةٌ تماماً: تسجيلُ الإجازة يعيش في وحدة الإجازات ومسارُه محروسٌ بها —
  // فزرٌّ يفتح مودالَها لمن لا يملكها زرٌّ يفشل عند الحفظ.
  const canLeave = usePermission('hr.leave.manage');

  const date = params.get('date') || todayISO();
  const view = (params.get('view') as AttendanceView | null) ?? 'queue';
  const empParam = Number(params.get('emp'));
  const selectedEmp = Number.isFinite(empParam) && empParam > 0 ? empParam : null;

  const [openDay, setOpenDay] = useState<{ profileId: number; day: AttendanceDayRow } | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const selection = useQueueSelection();

  const from = addDaysISO(date, -(QUEUE_DAYS - 1));
  const dayQuery = useAttendanceDay(date);
  const queueQuery = useAttendanceQueue(from, date);
  const healthQuery = useSetupHealth();

  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    });
    setParams(next, { replace: true });
  };

  const groups = useMemo(() => queueQuery.data?.employees ?? [], [queueQuery.data]);
  const dayRows = useMemo(() => dayQuery.data?.rows ?? [], [dayQuery.data]);
  const selectedGroup = useSelectedGroup(groups, selection.selection?.profileId ?? null);
  const sharedKind = sharedSuggestion(selectedGroup, selection.selection?.dates ?? []);

  /**
   * قائمةُ المنسوبين — اتّحادُ من له صفٌّ اليومَ ومن ينتظر قراراً في النافذة، **مرتَّبةً
   * أبجدياً**. 🚫 ولا ترتيبَ بالتأخير ولا لوحةَ صدارة ولا شارةَ انضباط.
   */
  const rosterRows: RosterRow[] = useMemo(() => {
    const map = new Map<number, { name: string | null; today: string | null; pending: number }>();

    dayRows.forEach((row) => {
      const emp = row.employee;
      if (!emp) return;
      const current = map.get(emp.id) ?? { name: emp.name, today: null, pending: 0 };
      current.name = current.name ?? emp.name;
      current.today = dayStatusLabel(row);
      map.set(emp.id, current);
    });

    groups.forEach((group) => {
      const current = map.get(group.employee.id)
        ?? { name: group.employee.name, today: null, pending: 0 };
      current.name = current.name ?? group.employee.name;
      current.pending = group.pending_days;
      map.set(group.employee.id, current);
    });

    return Array.from(map.entries())
      .map(([id, value]) => ({
        id,
        name: value.name,
        meta: value.pending > 0
          ? `${daysWord(value.pending)} تنتظر قراراً`
          : (value.today ?? 'لا شيء ينتظر'),
        end: value.pending > 0 ? value.pending : null,
      }))
      .sort(byName);
  }, [dayRows, groups]);

  const health = healthQuery.data ?? null;

  /**
   * مكتبٌ لم يُهيَّأ بعد — **بشهادة التشخيص أوّلاً**: لا نسخةَ جدولٍ في المكتب، أو لا ملفَّ
   * متتبَّعاً بالشرط المركّب. وحين لا يصل التشخيص (٤٠٣ · شبكة) يُستدلّ بالفراغ الكامل.
   */
  const notActivated = health !== null
    ? (health.schedules_count === 0 || health.tracked_count === 0)
    : (dayQuery.isSuccess
      && queueQuery.isSuccess
      && dayRows.length === 0
      && (queueQuery.data?.summary.days_computed ?? 0) === 0
      && groups.length === 0);

  /** عطلةُ المكتب المسجَّلة — مرجعُ الإجازات لمن لا إسنادَ له، وبها تُبذَر نماذجُ الجدول. */
  const weekendSetting = health?.weekend.setting_weekend_days ?? ['friday', 'saturday'];

  const visibleGroups = selectedEmp === null
    ? groups
    : groups.filter((g) => g.employee.id === selectedEmp);

  const visibleDayRows = selectedEmp === null
    ? dayRows
    : dayRows.filter((r) => r.employee?.id === selectedEmp);

  /**
   * 🔑 **بصماتُ التاريخ المعروض التي لم يُحتسب يومُها بعد** — تصل في مفتاحها المنفصل من
   * `GET /hr/attendance/day`، وتُرشَّح باختيار المنسوب كما تُرشَّح الصفوفُ المحسوبة.
   *
   * بلا هذا القسم يبصم المالكُ فيقرأ «تم التسجيل» ثم يفتح الشاشةَ فلا يجد شيئاً حتى تشغيلةِ
   * ٠٤:٥٠ — بينما تُظهرها `/my-hr` للموظف فوراً. 🚫 **ولا تُخلط بـ`visibleDayRows`**: تلك
   * أحكامٌ صدرت وهذه وقائعُ وقعت، وخلطُهما ينقض تمييزَ الوحدة من الشاشة.
   */
  const rawPunches = useMemo(() => {
    const all = dayQuery.data?.uncomputed_punches ?? [];
    return selectedEmp === null ? all : all.filter((p) => p.employee?.id === selectedEmp);
  }, [dayQuery.data, selectedEmp]);

  const refreshing = dayQuery.isFetching || queueQuery.isFetching || healthQuery.isFetching;

  const refresh = () => {
    void dayQuery.refetch();
    void queueQuery.refetch();
    void healthQuery.refetch();
  };

  /** الاسمُ المعروضُ لصاحب التحديد — من مجموعته، وإلّا من قائمة المنسوبين. */
  const nameOf = (profileId: number): string | null =>
    groups.find((g) => g.employee.id === profileId)?.employee.name
    ?? rosterRows.find((r) => r.id === profileId)?.name
    ?? null;

  const onAct = (action: QueueAction, kind: SuggestionKind | null) => {
    const current = selection.selection;
    if (current === null) return;

    const dates = [...current.dates].sort();
    const employee: EmpRef = { id: current.profileId, name: nameOf(current.profileId) };

    if (action === 'leave' || kind === 'leave') {
      setModal({ kind: 'leave', employee, start: dates[0], end: dates[dates.length - 1] });
      return;
    }

    if (action === 'present' || kind === null) {
      setModal({ kind: 'decision', employee, dates, reason: '' });
      return;
    }

    // الاقتراحُ يوجَّه إلى **المسار الذي يحقّقه فعلاً**، لا إلى اسمِه:
    if (kind === 'missing_punch') {
      const day = selectedGroup?.days.find((d) => d.work_date === dates[0]) ?? null;
      const payload = day?.suggestion?.payload ?? {};

      setModal({
        kind: 'punch',
        employee,
        dates,
        direction: payload.direction === 'in' ? 'in' : 'out',
        time: timeOf(payload.proposed_out_at) ?? timeOf(payload.proposed_in_at),
      });
      return;
    }

    // `field_work` و`remote`: لا مسارَ لإنشاء ادّعاءٍ نيابةً عن موظفٍ آخر في هذه الدفعة —
    // فالفعلُ المتاح شهادةُ حضورٍ بسببٍ مملوءٍ من الدليل نفسِه، لا زرٌّ يرمي ٤٠٤.
    setModal({ kind: 'decision', employee, dates, reason: SUGGESTION_HINTS[kind] });
  };

  const closeModal = () => setModal(null);
  const afterWrite = () => {
    selection.clear();
    setOpenDay(null);
  };

  const showDetail = isDesktop || openDay !== null;

  return (
    <div className="ssp2-page">
      <AttendanceHead
        date={date}
        onDateChange={(next) => setParam({ date: next })}
        facts={dayQuery.data?.facts ?? null}
        pendingDays={
          queueQuery.data
            ? queueQuery.data.employees.reduce((sum, g) => sum + g.pending_days, 0)
            : null
        }
        onRefresh={refresh}
        refreshing={refreshing}
        onRecompute={canManage && !notActivated ? () => setModal({ kind: 'recompute' }) : null}
        onOpenSchedule={canManage ? () => setModal({ kind: 'schedule' }) : null}
        onOpenSetup={canManage && !notActivated ? () => setModal({ kind: 'setup' }) : null}
      />

      {notActivated ? (
        <div className="ssp2-layout">
          <main className="ssp2-work">
            <AttendanceEmptyState
              canManage={canManage}
              onStart={() => setModal({ kind: 'setup' })}
            />
          </main>
        </div>
      ) : (
        <div className="ssp2-layout">
          <aside className="ssp2-chatcol hra-side" aria-label="الموظفون">
            <AttendanceRoster
              view={view}
              onView={(next) => setParam({ view: next === 'queue' ? null : next })}
              counts={{
                queue: queueQuery.data ? queueQuery.data.employees.length : null,
                today: dayQuery.data ? dayQuery.data.rows.length : null,
                claims: null,
              }}
              rows={rosterRows}
              selectedId={selectedEmp}
              onSelect={(id) => setParam({ emp: id === null ? null : String(id) })}
              loading={dayQuery.isPending || queueQuery.isPending}
            />
          </aside>

          <main className="ssp2-work" aria-labelledby="hra-work-h">
            <AttendanceSetupBanner
              summary={queueQuery.data?.summary ?? null}
              health={health}
              silenceHours={queueQuery.data?.silence_hours ?? null}
              truncated={queueQuery.data?.truncated ?? false}
              onFixSchedule={canManage ? () => setModal({ kind: 'schedule' }) : null}
            />

            {/* عنوانُ عمود العمل — مرئيٌّ للقارئ الشاشيّ وحدَه، فالتبويبُ ظاهرٌ بصرياً في
                الشرائح. وبدونه تقفز البنيةُ من h1 إلى h3 (رؤوسُ المجموعات). */}
            <h2 className="hra-sr" id="hra-work-h">{VIEW_TITLES[view]}</h2>

            <div className="hra-scroll">
              {/* الخامُّ فوق المحسوب وفي قسمٍ مستقلٍّ موسوم — وفي نطاقَي الأيام وحدَهما:
                  «طلباتُ التصحيح» كيانٌ آخرُ (ادّعاءاتٌ تنتظر بتّاً) وحشرُ وقائعِ اليوم فيه
                  ضجيجٌ في غير موضعه. ولا يُرسَم أصلاً حين لا بصمةَ غيرَ محتسَبة. */}
              {view !== 'claims' && (
                <AttendanceRawPunches
                  punches={rawPunches}
                  engineRunsAt={dayQuery.data?.engine_runs_at ?? null}
                  truncated={dayQuery.data?.uncomputed_truncated ?? false}
                  loading={dayQuery.isPending}
                  isError={dayQuery.isError}
                />
              )}

              {view === 'queue' && (
                <AttendanceQueue
                  groups={visibleGroups}
                  selection={selection}
                  sharedKind={sharedKind}
                  onAct={onAct}
                  onOpenDay={(profileId, day) => setOpenDay({ profileId, day })}
                  openDayId={openDay?.day.id ?? null}
                  canManage={canManage}
                  canLeave={canLeave}
                  loading={queueQuery.isPending}
                  isError={queueQuery.isError}
                  error={queueQuery.error}
                  onRetry={() => { void queueQuery.refetch(); }}
                />
              )}

              {view === 'today' && (
                <AttendanceToday
                  date={date}
                  rows={visibleDayRows}
                  loading={dayQuery.isPending}
                  isError={dayQuery.isError}
                  error={dayQuery.error}
                  onRetry={() => { void dayQuery.refetch(); }}
                  onOpenDay={(profileId, day) => setOpenDay({ profileId, day })}
                  openDayId={openDay?.day.id ?? null}
                />
              )}

              {view === 'claims' && (
                <ClaimsQueue employeeProfileId={selectedEmp} canManage={canManage} />
              )}
            </div>
          </main>

          {showDetail && (
            <aside className="ssp2-stagescol hra-side" aria-label="تفاصيل اليوم">
              <AttendanceDayDetail
                profileId={openDay?.profileId ?? null}
                day={openDay?.day ?? null}
                canManage={canManage}
                onAddPunch={(profileId, punchDate) =>
                  setModal({
                    kind: 'punch',
                    employee: { id: profileId, name: nameOf(profileId) },
                    dates: [punchDate],
                    direction: 'out',
                  })
                }
                onVoid={(resolutionId) => setModal({ kind: 'void', resolutionId })}
                onClose={() => setOpenDay(null)}
              />
            </aside>
          )}
        </div>
      )}

      {/* ═══ المودالات: تُركَّب مرّةً واحدةً على مستوى الصفحة ═══ */}
      {modal?.kind === 'decision' && (
        <DecisionModal
          employee={modal.employee}
          dates={modal.dates}
          defaultReason={modal.reason}
          onClose={closeModal}
          onDone={afterWrite}
        />
      )}

      {modal?.kind === 'punch' && (
        <ManualPunchModal
          employee={modal.employee}
          dates={modal.dates}
          defaultDirection={modal.direction}
          defaultTime={modal.time}
          onClose={closeModal}
          onDone={afterWrite}
        />
      )}

      {modal?.kind === 'leave' && (
        <RecordLeaveModal
          employee={{ profileId: modal.employee.id, name: modal.employee.name ?? '' }}
          defaultStart={modal.start}
          defaultEnd={modal.end}
          canManage={canLeave}
          onClose={closeModal}
          onSaved={afterWrite}
        />
      )}

      {modal?.kind === 'void' && (
        <VoidResolutionModal
          resolutionId={modal.resolutionId}
          onClose={closeModal}
          onDone={afterWrite}
        />
      )}

      {modal?.kind === 'setup' && (
        <SetupWizardModal
          weekendSetting={weekendSetting}
          alreadyEnabled={health?.attendance_enabled ?? false}
          onClose={closeModal}
          onDone={afterWrite}
        />
      )}

      {modal?.kind === 'recompute' && (
        <RecomputeModal
          employee={
            selectedEmp === null
              ? null
              : { id: selectedEmp, name: nameOf(selectedEmp) }
          }
          onClose={closeModal}
        />
      )}

      {modal?.kind === 'schedule' && (
        <WorkScheduleModal weekendSetting={weekendSetting} onClose={closeModal} />
      )}
    </div>
  );
};

export default AttendancePage;
