import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronLeft, ChevronRight, FileText, ListOrdered, RefreshCw, X } from 'lucide-react';
import { hrLeaveService } from '../../../services/hrLeaveService';
import {
  HALF_DAY_PERIOD_LABELS,
  LEAVE_DURATION_BASIS_LABELS,
  LEAVE_SOURCE_LABELS,
  LEAVE_STATUS_LABELS,
  LEDGER_ENTRY_TYPE_LABELS,
  PAY_TREATMENT_LABELS,
} from '../../../types/hr';
import type { HrLeave, LedgerEntryType } from '../../../types/hr';
import {
  EMPTY_MARK,
  excludedNames,
  fmtDays,
  fmtLeaveDate,
  fmtLeaveDateTime,
  fmtLeaveRange,
  fmtSignedDays,
  leaveArticleRef,
  leaveTypeName,
  paySliceLabel,
  pendingHolidayNames,
  signClass,
  signMark,
  toNum,
} from './leaveFormat';
import { useLeaveDialog } from './useLeaveDialog';

/**
 * لوحٌ واحدٌ بوضعين — **شجرةٌ واحدة، لا مكوّنان**:
 * · `movements` سردُ `LeaveLedgerService::narrative` مرقَّماً خادمياً.
 * · `record` تفصيلُ واقعةٍ بعينها.
 *
 * **الجملةُ العربيةُ تُقرأ من `description` كما خزّنها الخادم** ولا تُركَّب في JSX:
 * الوصفُ جزءٌ من القيد لا من العرض، وإعادةُ تركيبه هنا تعني سرداً يتغيّر بتغيّر الواجهة
 * فوق دفترٍ لا يتغيّر.
 *
 * والإشارةُ **رمزٌ ولونٌ معاً** (`+` أخضر · `−` أحمر · `=` ذهبيّ) فلا تُحمَل المعلومةُ
 * على اللون وحده.
 *
 * الموضعُ `position: fixed` بحوافَّ منطقيةٍ (`inset-inline-start`) لا `transform:translateX`
 * — الأخيرةُ فيزيائيةٌ تنقلب في RTL. واختيرَ `fixed` على `absolute` لأنّ اللوحَ يُفتح من
 * لوح الرصيد ومن جدول السجلّ معاً، فلا يجوز أن يتعلّق بوجود سلفٍ مُموضَعٍ لا يملكه.
 */

export type LedgerDrawerMode = 'movements' | 'record';

export interface LedgerDrawerFilter {
  entryType?: LedgerEntryType;
  leaveTypeId?: number;
}

interface Props {
  employeeId: number;
  employeeName?: string | null;
  /** الوضعُ الابتدائيّ؛ ويُبدَّل من الترويسة حين تتوفّر واقعةٌ للعرض. */
  mode?: LedgerDrawerMode;
  leave?: HrLeave | null;
  filter?: LedgerDrawerFilter;
  onClose: () => void;
}

const PER_PAGE = 20;

/** اسمُ كلّ وضع — يُقرأ مرّةً للعنوان ومرّةً لزرّ التبديل (الذي يحمل اسمَ الوضع الآخر). */
const MODE_LABELS: Record<LedgerDrawerMode, string> = {
  movements: 'حركات الرصيد',
  record: 'تفاصيل الإجازة',
};

export const LeaveLedgerDrawer: React.FC<Props> = ({
  employeeId,
  employeeName,
  mode = 'movements',
  leave = null,
  filter,
  onClose,
}) => {
  const [view, setView] = useState<LedgerDrawerMode>(leave ? mode : 'movements');
  const [page, setPage] = useState(1);
  const otherView: LedgerDrawerMode = view === 'movements' ? 'record' : 'movements';
  const { ref, titleId, onKeyDown } = useLeaveDialog<HTMLDivElement>({ onClose });

  const ledgerQuery = useQuery({
    queryKey: ['hr', 'leave', 'ledger', employeeId, filter?.entryType ?? '', filter?.leaveTypeId ?? 0, page],
    queryFn: () =>
      hrLeaveService.getLedger(employeeId, {
        entry_type: filter?.entryType,
        leave_type_id: filter?.leaveTypeId,
        page,
        per_page: PER_PAGE,
      }),
    enabled: view === 'movements',
    staleTime: 15_000,
  });

  // تبديلُ المرشِّح من اللوح الخارجيّ يبدأ من الصفحة الأولى — وإلّا بقي المؤشّر على
  // صفحةٍ لا وجودَ لها في النتيجة الجديدة فبدا السردُ فارغاً بلا سبب.
  useEffect(() => {
    setPage(1);
  }, [filter?.entryType, filter?.leaveTypeId]);

  const rows = ledgerQuery.data?.page.data ?? [];
  const lastPage = ledgerQuery.data?.page.last_page ?? 1;
  const summary = ledgerQuery.data?.summary ?? null;

  const excluded = leave?.computation_meta ? excludedNames(leave.computation_meta) : [];
  const pendingHolidays = leave?.computation_meta ? pendingHolidayNames(leave.computation_meta) : [];

  return (
    <div className="hrl-drawer-overlay" onMouseDown={onClose}>
      <div
        className="hrl-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={ref}
        onKeyDown={onKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="hrl-drawer__h">
          <h3 className="hrl-block__t" id={titleId}>
            {view === 'movements' ? <ListOrdered size={14} /> : <FileText size={14} />}
            {MODE_LABELS[view]}
            {employeeName ? ` — ${employeeName}` : ''}
          </h3>
          <div className="hrl-block__a">
            {leave && (
              <button
                type="button"
                className="hr-btn hr-btn--sm"
                onClick={() => setView(otherView)}
              >
                {MODE_LABELS[otherView]}
              </button>
            )}
            <button type="button" className="hr-icon-btn" onClick={onClose} aria-label="إغلاق">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="hrl-drawer__b">
          {view === 'movements' ? (
            <>
              {ledgerQuery.isPending && (
                <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل الحركات">
                  <span className="hrl-skel" />
                  <span className="hrl-skel" />
                  <span className="hrl-skel" />
                  <span className="hrl-skel" />
                  <span className="hrl-skel" />
                </div>
              )}

              {ledgerQuery.isError && (
                <div className="hrl-state hrl-state--error">
                  <AlertTriangle size={22} />
                  <p className="hrl-state__t">تعذر تحميل الحركات</p>
                  <p className="hrl-state__d">
                    {ledgerQuery.error instanceof Error ? ledgerQuery.error.message : 'انقطع الاتصال بالخادم.'}
                  </p>
                  <button type="button" className="hr-btn hr-btn--sm" onClick={() => void ledgerQuery.refetch()}>
                    <RefreshCw size={13} /> إعادة المحاولة
                  </button>
                </div>
              )}

              {!ledgerQuery.isPending && !ledgerQuery.isError && rows.length === 0 && (
                <div className="hrl-state hrl-state--empty">
                  <ListOrdered size={22} />
                  <p className="hrl-state__t">لا توجد حركات رصيد</p>
                  <p className="hrl-state__d">
                    لم يتم تسجيل أي قيد لهذا الموظف بعد. يبدأ السجل بقيد رصيد افتتاحي.
                  </p>
                </div>
              )}

              {rows.length > 0 && (
                <table className="hrl-ledger">
                  <caption className="hrl-sr">حركات رصيد الإجازات مرتبة من الأحدث</caption>
                  <thead>
                    <tr>
                      <th scope="col">التاريخ</th>
                      <th scope="col">النوع</th>
                      <th scope="col">الأيام</th>
                      <th scope="col">الرصيد بعد</th>
                      <th scope="col">الوصف</th>
                      <th scope="col">بواسطة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((entry) => (
                      <tr key={entry.id}>
                        <td className="hrl-ledger__num">{fmtLeaveDate(entry.effective_date)}</td>
                        <td>
                          <span className="hrl-badge hrl-badge--flat">
                            {LEDGER_ENTRY_TYPE_LABELS[entry.entry_type] ?? entry.entry_type}
                          </span>
                        </td>
                        <td dir="ltr" className={`hrl-ledger__num ${signClass(entry.days)}`}>
                          <span aria-hidden="true">{signMark(entry.days)}</span> {fmtDays(Math.abs(toNum(entry.days)))}
                        </td>
                        <td dir="ltr" className="hrl-ledger__num">{fmtDays(entry.balance_after)}</td>
                        <td className="hrl-ledger__desc">{entry.description || EMPTY_MARK}</td>
                        <td className="hrl-ledger__who">{entry.created_by_name || 'النظام'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <>
              {leave === null ? (
                <div className="hrl-state hrl-state--empty">
                  <FileText size={22} />
                  <p className="hrl-state__t">لا توجد إجازة محددة</p>
                  <p className="hrl-state__d">اختر إجازة من السجل لعرض تفاصيلها.</p>
                </div>
              ) : (
                <>
                  <p className="hrl-legal">
                    <FileText size={13} />
                    <span>
                      {leaveTypeName(leave)}
                      {leaveArticleRef(leave) ? (
                        <>
                          {' ('}
                          <span className="hrl-legal__ref" dir="ltr">{leaveArticleRef(leave)}</span>
                          {')'}
                        </>
                      ) : null}
                    </span>
                  </p>

                  <div className="hrl-block__b">
                    <dl className="hrl-kv">
                      <dt>الموظف</dt>
                      <dd>{leave.employee_profile?.user?.name || employeeName || EMPTY_MARK}</dd>

                      <dt>المدى</dt>
                      <dd>{fmtLeaveRange(leave.start_date, leave.end_date)}</dd>

                      <dt>الأساس</dt>
                      <dd>{LEAVE_DURATION_BASIS_LABELS[leave.duration_basis_snapshot] ?? leave.duration_basis_snapshot}</dd>

                      <dt>المدة</dt>
                      <dd dir="ltr">{fmtDays(leave.duration_days)}</dd>

                      {leave.half_day ? (
                        <>
                          <dt>نصف يوم</dt>
                          <dd>{leave.half_day_period ? HALF_DAY_PERIOD_LABELS[leave.half_day_period] : 'نعم'}</dd>
                        </>
                      ) : null}

                      <dt>المستثنى</dt>
                      <dd className={excluded.length === 0 ? 'is-empty' : undefined}>
                        {excluded.length === 0 ? 'لا شيء' : excluded.join(' · ')}
                      </dd>

                      {pendingHolidays.length > 0 ? (
                        <>
                          <dt>عطل غير معتمدة</dt>
                          <dd>{pendingHolidays.join(' · ')} (لم يتم استثناؤها من الاحتساب)</dd>
                        </>
                      ) : null}

                      <dt>المخصوم من الرصيد</dt>
                      <dd className={leave.charged_days === undefined ? 'is-empty' : undefined} dir="ltr">
                        {leave.charged_days === undefined ? EMPTY_MARK : fmtDays(leave.charged_days)}
                      </dd>

                      <dt>الأثر المالي</dt>
                      <dd>{PAY_TREATMENT_LABELS[leave.pay_treatment] ?? leave.pay_treatment}</dd>

                      {(leave.pay_breakdown ?? []).length > 0 ? (
                        <>
                          <dt>الشرائح</dt>
                          <dd>{(leave.pay_breakdown ?? []).map((slice) => paySliceLabel(slice)).join(' · ')}</dd>
                        </>
                      ) : null}

                      <dt>الحالة</dt>
                      <dd>
                        {LEAVE_STATUS_LABELS[leave.status] ?? leave.status}
                        {leave.self_approved ? ' · اعتماد ذاتي' : ''}
                      </dd>

                      <dt>المصدر</dt>
                      <dd>{LEAVE_SOURCE_LABELS[leave.source] ?? leave.source}</dd>

                      <dt>تاريخ التسجيل</dt>
                      <dd>{fmtLeaveDateTime(leave.created_at)}</dd>

                      {leave.approved_at ? (
                        <>
                          <dt>تاريخ الاعتماد</dt>
                          <dd>{fmtLeaveDateTime(leave.approved_at)}</dd>
                        </>
                      ) : null}

                      {leave.sick_window_start ? (
                        <>
                          <dt>تاريخ بدء النافذة المرضية</dt>
                          <dd>{fmtLeaveDate(leave.sick_window_start)}</dd>
                        </>
                      ) : null}

                      <dt>السبب</dt>
                      <dd className={leave.reason ? undefined : 'is-empty'}>{leave.reason || EMPTY_MARK}</dd>

                      <dt>المرفق</dt>
                      <dd className={leave.employee_document_id ? undefined : 'is-empty'} dir="ltr">
                        {leave.employee_document_id ? `#${leave.employee_document_id}` : EMPTY_MARK}
                      </dd>

                      {leave.rejection_reason ? (
                        <>
                          <dt>سبب الرفض</dt>
                          <dd>{leave.rejection_reason}</dd>
                        </>
                      ) : null}

                      {leave.cancellation_reason ? (
                        <>
                          <dt>سبب الإلغاء</dt>
                          <dd>{leave.cancellation_reason}</dd>
                        </>
                      ) : null}

                      {leave.supersedes_leave_id ? (
                        <>
                          <dt>الاستبدال</dt>
                          <dd dir="ltr">بديل عن السجل #{leave.supersedes_leave_id}</dd>
                        </>
                      ) : null}
                    </dl>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="hrl-drawer__f">
          {view === 'movements' ? (
            <>
              <span>
                {summary
                  ? `الرصيد الحالي ${fmtDays(summary.current_balance)} · مستحق ${fmtDays(
                      summary.accrued
                    )} · مخصوم ${fmtDays(summary.consumed)}`
                  : 'الملخص غير متاح'}
              </span>
              <span className="hrl-block__a">
                <button
                  type="button"
                  className="hr-pg-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || ledgerQuery.isFetching}
                  aria-label="الصفحة السابقة"
                >
                  <ChevronRight size={14} />
                </button>
                <span dir="ltr">{page} / {lastPage}</span>
                <button
                  type="button"
                  className="hr-pg-btn"
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  disabled={page >= lastPage || ledgerQuery.isFetching}
                  aria-label="الصفحة التالية"
                >
                  <ChevronLeft size={14} />
                </button>
              </span>
            </>
          ) : (
            <span>
              {leave?.charged_days === undefined
                ? 'الأثر على الرصيد غير متوفر لهذا السجل'
                : `${fmtSignedDays(-toNum(leave.charged_days))} على الرصيد`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveLedgerDrawer;
