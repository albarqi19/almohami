import React, { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, CalendarPlus, ClipboardList, LayoutGrid, ListChecks, Stamp, Wallet } from 'lucide-react';

import { hrService } from '../../../services/hrService';
import { hrLeaveService } from '../../../services/hrLeaveService';
import { usePermission } from '../../../hooks/usePermission';
import HolidaysModal from '../HolidaysModal';
import { LeaveApprovalQueue } from '../approval/LeaveApprovalQueue';

import LeaveRoster from './LeaveRoster';
import LeaveRecordTable from './LeaveRecordTable';
import LeaveCalendar from './LeaveCalendar';
import LegacyRequestsTable from './LegacyRequestsTable';
import LeaveBalancePanel from './LeaveBalancePanel';
import LeaveLedgerDrawer from './LeaveLedgerDrawer';
import RecordLeaveModal from './RecordLeaveModal';
import LeaveCorrectionModal from './LeaveCorrectionModal';
import InitBalanceModal from './InitBalanceModal';
import { fmtCount, todayISO } from './leaveFormat';
import { LEAVE_STATUS_LABELS, LEGACY_REQUEST_STATUS_LABELS } from '../../../types/hr';
import type { HrLeave, LeaveStatus, LegacyRequestStatus } from '../../../types/hr';
import type { CorrectionAction } from './LeaveCorrectionModal';
import type { LedgerDrawerFilter, LedgerDrawerMode } from './LeaveLedgerDrawer';

/**
 * الصفحةُ الجامعة لمسارَي `/hr/leave` و`/hr/leave/:employeeId`.
 *
 * · **شجرةٌ واحدة**: لا نسخةَ موبايلٍ موازية ولا محتوىً مُصيَّرٌ مرّتين — التكيّفُ كلُّه
 *   بـ`@media` على البنية نفسها (`hr-leave.css` §١٢-أ). كلُّ نصٍّ يظهر مرّةً واحدةً هنا.
 * · **الحالةُ في الرابط لا في الذاكرة**: الموظفُ من `useParams`، والتبويبُ والشهرُ
 *   والمرشِّحاتُ من `useSearchParams` — فالرابطُ قابلٌ للمشاركة ولا تُفقد الحالةُ بالتحديث.
 * · **شريطُ إجراءاتٍ واحد** في الرأس، وكلُّ زرٍّ فيه خلفه مسارٌ حقيقيّ: لا تصديرَ ولا
 *   ترحيلَ ولا «إنذار» — أفعالٌ بلا مسارٍ في الباك لا تُرسَم.
 * · القراءةُ بـ`hr.view` (يحسمها `ProtectedRoute`)، والكتابةُ بـ`hr.leave.manage`
 *   تُقرأ **مرّةً واحدةً** هنا وتُمرَّر prop؛ وأزرارُ الكتابة **تُحذف من الشجرة لا تُعطَّل**.
 */

const RECORDS_PER_PAGE = 25;
const LEGACY_PER_PAGE = 20;

type TabKey = 'records' | 'calendar' | 'legacy' | 'approvals';

const TABS: Array<{ key: TabKey; label: string; icon: typeof ListChecks }> = [
  { key: 'records', label: 'السجلّ', icon: ListChecks },
  { key: 'calendar', label: 'التقويم الشهريّ', icon: LayoutGrid },
  { key: 'legacy', label: 'الطلبات الإدارية', icon: ClipboardList },
  { key: 'approvals', label: 'اعتمادُ الإجازات', icon: Stamp },
];

/**
 * تبويباتٌ لا يعنيها الشهرُ ولا الحالة — فتُحذف مرشِّحاتُها من الرأس بدل أن تُعرض
 * ضوابطُ لا تُغيّر شيئاً. ضابطٌ معروضٌ لا أثرَ له يُقرأ عطلاً بعد أوّل تجربة.
 */
const UNFILTERED_TABS: TabKey[] = ['approvals'];

const RECORD_STATUSES: LeaveStatus[] = ['pending', 'approved', 'rejected', 'cancelled', 'superseded'];
const LEGACY_STATUSES: LegacyRequestStatus[] = ['pending', 'approved', 'rejected'];

/** شهرُ اليوم `YYYY-MM` — بتوقيت الجهاز لا بـ`toISOString` (تُزيح يوماً). */
function currentMonth(): string {
  return todayISO().slice(0, 7);
}

/** آخرُ يومٍ في شهرٍ `YYYY-MM` — يُحسب بتقويم الجهاز لا بجدولٍ مكتوب. */
function monthEnd(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return '';
  const d = new Date(y, m, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface RecordTarget {
  employee: { profileId: number; name: string } | null;
  start?: string;
  end?: string;
  typeId?: number;
}

export const LeavePage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ employeeId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const canManage = usePermission('hr.leave.manage');
  // التقويمُ الرسميّ مستوى مكتبٍ محروسٌ بـ`hr.manage` (routes/api.php:1831-1838) —
  // فزرُّه يُحذف لمن لا يملكها بدل أن يفتح مودالاً يردّه الخادمُ بـ403.
  const canManageHr = usePermission('hr.manage');

  const parsedId = Number(params.employeeId);
  const employeeId = Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null;

  /**
   * تبويبُ الاعتماد يُحذف من الشجرة لمن لا يملك القرار — لا يُعرض معطَّلاً ولا يُعرض
   * ليردَّ الخادمُ زرَّيه بـ403 (`permission:hr.leave.manage` على `approve`/`reject`).
   * وهو عرفُ هذه الصفحة نفسِها في كلّ أزرار الكتابة. ومن يملك `hr.view` وحدَها يبقى له
   * السطحُ المستقلُّ `/hr/leave/approvals` — قراءةً بلا قرار، كما بُني.
   */
  const tabs = canManage ? TABS : TABS.filter((t) => t.key !== 'approvals');

  const tabParam = searchParams.get('tab');
  const tab: TabKey = tabs.some((t) => t.key === tabParam) ? (tabParam as TabKey) : 'records';
  const month = searchParams.get('month') ?? '';
  const status = searchParams.get('status') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  const [recordTarget, setRecordTarget] = useState<RecordTarget | null>(null);
  const [correction, setCorrection] = useState<{ action: CorrectionAction; leave: HrLeave } | null>(null);
  const [drawer, setDrawer] = useState<{ mode: LedgerDrawerMode; filter?: LedgerDrawerFilter; leave?: HrLeave } | null>(
    null
  );
  const [showInit, setShowInit] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [freshLeaveId, setFreshLeaveId] = useState<number | null>(null);

  /** كتابةُ الحالة في الرابط — مفتاحٌ فارغٌ يُحذف فلا يتضخّم الرابط بقيمٍ صامتة. */
  const setParam = (patch: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    });
    if (resetPage && !('page' in patch)) next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const year = Number((month || currentMonth()).slice(0, 4));

  const statsQuery = useQuery({
    queryKey: ['hr', 'leave', 'stats', year],
    queryFn: () => hrLeaveService.getStats(year),
    staleTime: 60_000,
  });

  // اسمُ الموظف — نفسُ مفتاح `HrModule` فيُشارَك الكاش ولا يتكرّر النداء.
  const employeeQuery = useQuery({
    queryKey: ['hr', 'employee', employeeId],
    queryFn: () => hrService.getEmployee(employeeId as number),
    enabled: employeeId !== null,
    staleTime: 60_000,
  });

  const employee = employeeQuery.data;
  const employeeName = employee?.user?.name ?? null;

  const stats = statsQuery.data;

  const recordFilters = useMemo(
    () => ({
      status: (RECORD_STATUSES.includes(status as LeaveStatus) ? status : '') as LeaveStatus | '',
      from: month === '' ? undefined : `${month}-01`,
      to: month === '' ? undefined : monthEnd(month),
    }),
    [status, month]
  );

  const legacyFilters = useMemo(
    () => ({
      status: (LEGACY_STATUSES.includes(status as LegacyRequestStatus) ? status : '') as LegacyRequestStatus | '',
      from: month === '' ? undefined : `${month}-01`,
      to: month === '' ? undefined : monthEnd(month),
    }),
    [status, month]
  );

  const openRecordModal = (target: RecordTarget) => setRecordTarget(target);

  const selectEmployee = (id: number) => {
    navigate({ pathname: `/hr/leave/${id}`, search: searchParams.toString() });
  };

  const tabTitle = tabs.find((t) => t.key === tab)?.label ?? '';

  /** لوحُ الحركات يتبع صاحبَ الواقعة إن فُتح من سجلّ المكتب، وإلّا الموظفَ المعروض. */
  const drawerEmployeeId = drawer ? drawer.leave?.employee_profile_id ?? employeeId : null;

  return (
    <div className="hrl-page">
      {/* ═══ المودالات: تُركَّب مرّةً واحدةً على مستوى الصفحة ═══ */}
      {recordTarget && (
        <RecordLeaveModal
          employee={recordTarget.employee}
          defaultStart={recordTarget.start}
          defaultEnd={recordTarget.end}
          defaultTypeId={recordTarget.typeId}
          canManage={canManage}
          onClose={() => setRecordTarget(null)}
          onSaved={(result) => setFreshLeaveId(result.leave.id)}
        />
      )}

      {correction && (
        <LeaveCorrectionModal
          action={correction.action}
          employeeId={correction.leave.employee_profile_id}
          leave={correction.leave}
          employeeName={correction.leave.employee_profile?.user?.name ?? employeeName}
          canManage={canManage}
          onClose={() => setCorrection(null)}
        />
      )}

      {showInit && (
        <InitBalanceModal
          focusEmployeeId={employeeId}
          canManage={canManage}
          onClose={() => setShowInit(false)}
        />
      )}

      {showHolidays && <HolidaysModal onClose={() => setShowHolidays(false)} />}

      <div className="hrl-layout">
        {/* ═══ عمودُ المنسوبين — ملتصقٌ بلا فجوةٍ ولا استدارة ═══ */}
        <nav className="hrl-side" aria-label="المنسوبون">
          <LeaveRoster
            selectedId={employeeId}
            onSelect={selectEmployee}
            onQuickRecord={(emp) =>
              openRecordModal({ employee: emp, start: todayISO(), end: todayISO() })
            }
            onBulkInit={() => setShowInit(true)}
            canManage={canManage}
          />
        </nav>

        {/* ═══ المسرح: رأسٌ ثابتٌ · تبويباتٌ · عمودان فوق 1400px ═══ */}
        <main className="hrl-stage">
          <header className="hrl-head">
            <div className="hrl-head__id">
              <h1 className="hrl-h1">{employeeName ?? 'الإجازات والغياب'}</h1>
              <p className="hrl-sub">
                {employeeId === null
                  ? 'سجلُّ المكتب — اختر منسوباً لعرض رصيده وتحليله النظاميّ'
                  : [employee?.job_title, employee?.department].filter(Boolean).join(' · ') ||
                    'ملفُّ منسوبٍ بلا مسمّىً ولا قسم'}
              </p>
            </div>

            <div className="hrl-head__badges">
              {stats && (
                <>
                  <span className="hrl-fact">
                    غائبٌ اليوم <span className="hrl-fact__n">{fmtCount(stats.on_leave_today)}</span>
                  </span>
                  <span className="hrl-fact">
                    قيد الاعتماد <span className="hrl-fact__n">{fmtCount(stats.pending_count)}</span>
                  </span>
                  <span className="hrl-fact">
                    بلا رصيدٍ مُهيَّأ <span className="hrl-fact__n">{fmtCount(stats.uninitialized_balances)}</span>
                  </span>
                  {stats.unconfirmed_holidays > 0 && (
                    <span
                      className="hrl-fact hrl-fact--gold"
                      title="عطلٌ غيرُ معتمَدةٍ لا تُستثنى من الاحتساب"
                    >
                      عطلٌ لم تُعتمد <span className="hrl-fact__n">{fmtCount(stats.unconfirmed_holidays)}</span>
                    </span>
                  )}
                </>
              )}
            </div>

            {/* شريطُ إجراءاتٍ **واحد** — وكلُّ زرٍّ خلفه مسارٌ محقَّق */}
            <div className="hrl-head__actions">
              {canManage && (
                <button
                  type="button"
                  className="hr-btn hr-btn--sm hr-btn--primary"
                  onClick={() =>
                    openRecordModal({
                      employee:
                        employeeId !== null && employeeName
                          ? { profileId: employeeId, name: employeeName }
                          : null,
                      start: todayISO(),
                      end: todayISO(),
                    })
                  }
                >
                  <CalendarPlus size={13} /> تسجيل غياب
                </button>
              )}
              {canManage && (
                <button type="button" className="hr-btn hr-btn--sm" onClick={() => setShowInit(true)}>
                  <Wallet size={13} /> تهيئة الأرصدة
                </button>
              )}
              {canManageHr && (
                <button type="button" className="hr-btn hr-btn--sm" onClick={() => setShowHolidays(true)}>
                  <CalendarDays size={13} /> التقويم الرسميّ
                </button>
              )}
              {employeeId !== null && (
                <button
                  type="button"
                  className="hr-btn hr-btn--sm"
                  onClick={() => navigate({ pathname: '/hr/leave', search: searchParams.toString() })}
                >
                  سجلُّ المكتب
                </button>
              )}
            </div>
          </header>

          {/* تبويباتٌ كثيفةٌ ظاهرةٌ في كلّ المقاسات — بلا قصٍّ بالـCSS */}
          <div className="hrl-tabs" role="tablist" aria-label="أقسام الإجازات">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                id={`hrl-tab-${item.key}`}
                aria-selected={tab === item.key}
                aria-controls={`hrl-panel-${item.key}`}
                className="hrl-tab"
                onClick={() => setParam({ tab: item.key === 'records' ? null : item.key })}
              >
                <item.icon size={14} /> {item.label}
                {/* عدّادُ المنتظر على تبويب الاعتماد — الرقمُ يجرّ إليه، وصفرٌ لا يُرسم. */}
                {item.key === 'approvals' && stats !== undefined && stats.pending_count > 0 && (
                  <span className="hrl-tab__n" dir="ltr">{fmtCount(stats.pending_count)}</span>
                )}
              </button>
            ))}
          </div>

          {/* بلا منسوبٍ مختار لا تحليلَ يُعرض، وعمودُ «المنسوب» في الجدول قائم: العرضُ كلُّه
              للسجلّ (`--solo`). ومتى اختير منسوبٌ انقلبت الحاجةُ فانقلبت القسمة. */}
          <div className={`hrl-cols${employeeId === null ? ' hrl-cols--solo' : ''}`}>
            <div className="hrl-cols__main">
              <section
                className="hrl-block hrl-block--grow hrl-block--scroll"
                role="tabpanel"
                id={`hrl-panel-${tab}`}
                aria-labelledby={`hrl-tab-${tab}`}
              >
                <div className="hrl-block__h">
                  <h2 className="hrl-block__t hrl-h2">
                    <CalendarDays size={14} /> {tabTitle}
                  </h2>

                  <div className="hrl-block__a">
                    {!UNFILTERED_TABS.includes(tab) && (
                      <input
                        type="month"
                        className="hrl-ctrl"
                        value={tab === 'calendar' ? month || currentMonth() : month}
                        onChange={(e) => setParam({ month: e.target.value })}
                        aria-label="الشهر المعروض"
                      />
                    )}

                    {tab !== 'calendar' && !UNFILTERED_TABS.includes(tab) && (
                      <select
                        className="hrl-ctrl"
                        value={status}
                        onChange={(e) => setParam({ status: e.target.value })}
                        aria-label="تصفية بالحالة"
                      >
                        <option value="">كلُّ الحالات</option>
                        {(tab === 'legacy' ? LEGACY_STATUSES : RECORD_STATUSES).map((key) => (
                          <option key={key} value={key}>
                            {tab === 'legacy'
                              ? LEGACY_REQUEST_STATUS_LABELS[key as LegacyRequestStatus]
                              : LEAVE_STATUS_LABELS[key as LeaveStatus]}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* الجداولُ تلتصق بحدّ البلوك؛ وطابورُ الاعتماد صفوفٌ مؤطَّرةٌ تحتاج حشواً. */}
                <div className={`hrl-block__b${tab === 'approvals' ? '' : ' hrl-block__b--flush'}`}>
                  {tab === 'records' && (
                    <LeaveRecordTable
                      employeeId={employeeId}
                      filters={recordFilters}
                      page={page}
                      perPage={RECORDS_PER_PAGE}
                      onPageChange={(p) => setParam({ page: String(p) }, false)}
                      canManage={canManage}
                      freshLeaveId={freshLeaveId}
                      onOpenRecord={(leave) => setDrawer({ mode: 'record', leave })}
                      onCorrect={(action, leave) => setCorrection({ action, leave })}
                      onRepeat={(leave) =>
                        openRecordModal({
                          employee: null,
                          start: leave.start_date,
                          end: leave.end_date,
                          typeId: leave.leave_type_id,
                        })
                      }
                    />
                  )}

                  {tab === 'calendar' && (
                    <LeaveCalendar
                      month={month || currentMonth()}
                      employeeId={employeeId}
                      canManage={canManage}
                      onPick={(emp, date) => openRecordModal({ employee: emp, start: date, end: date })}
                      onOpenEmployee={(id) => selectEmployee(id)}
                    />
                  )}

                  {tab === 'legacy' && (
                    <LegacyRequestsTable
                      employeeId={employeeId}
                      employeeName={employeeName}
                      filters={legacyFilters}
                      page={page}
                      perPage={LEGACY_PER_PAGE}
                      onPageChange={(p) => setParam({ page: String(p) }, false)}
                      canManage={canManage}
                    />
                  )}

                  {/* ═══ طابورُ الاعتماد ولوحُ التعارض ═══
                      يُعرَض ما يقع في مدّة كلّ طلبٍ — جلساتٌ ومهامٌّ وغياباتٌ متداخلةٌ ورصيدٌ
                      قبل وبعد — **قبل** أن تصل اليدُ إلى «موافقة». ولا يمنع أيٌّ منها الاعتماد:
                      قد يكون المديرُ رتّب من ينوب عن الغائب، ولا حكمَ آليٌّ حيث يقرّر إنسان.
                      والسطحُ نفسُه مُتاحٌ على `/hr/leave/approvals` لمن يريده وحدَه. */}
                  {tab === 'approvals' && <LeaveApprovalQueue />}
                </div>
              </section>
            </div>

            <aside className="hrl-cols__side" aria-label="الرصيد والتحليل النظاميّ">
              <LeaveBalancePanel
                employeeId={employeeId}
                employeeName={employeeName}
                canManage={canManage}
                onOpenLedger={(filter) => setDrawer({ mode: 'movements', filter })}
                onInitBalance={() => setShowInit(true)}
              />
            </aside>
          </div>
        </main>
      </div>

      {/* لوحٌ واحدٌ لا فرعان: صاحبُ الواقعة أوّلاً ثمّ الموظفُ المعروض. */}
      {drawer && drawerEmployeeId !== null && (
        <LeaveLedgerDrawer
          employeeId={drawerEmployeeId}
          employeeName={drawer.leave?.employee_profile?.user?.name ?? employeeName}
          mode={drawer.mode}
          leave={drawer.leave ?? null}
          filter={drawer.filter}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
};

export default LeavePage;
