import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, ChevronLeft, ChevronRight, Inbox, Users } from 'lucide-react';

import { hrLeaveService } from '../../../services/hrLeaveService';
import { EMPTY_MARK, fmtCount, fmtLeaveDate, fmtLeaveRange } from './leaveFormat';
import { LEGACY_REQUEST_STATUS_LABELS } from '../../../types/hr';
import type { LegacyLeaveFilters, LegacyLeaveRow, LegacyRequestStatus } from '../../../types/hr';
import ConvertLegacyModal from './ConvertLegacyModal';

/**
 * تبويبُ «الطلبات الإدارية» — القراءةُ من `admin_requests`، **والتحويلُ إلى سجلّ الإجازات**.
 *
 * · المصدرُ `hrLeaveService.getLegacyRequests` (مسارُ HR، خلفه `LegacyLeaveReader`) —
 *   **ولا تُستدعى خدمةُ «الطلبات الإدارية» من هذه الوحدة إطلاقاً**.
 * · **صفرُ كتابةٍ على `admin_requests`**: التحويلُ يكتب في `hr_leaves` وحدَها، والوصلةُ
 *   عمودٌ هناك (`legacy_admin_request_id`) بفهرسٍ فريدٍ يمنع التحويلَ مرّتين.
 * · نوعُ الطلب يُعرض **باسمه العربيِّ كما ورد**، بلا استنتاجٍ من نصّ الاسم
 *   (فخُّ `getRequestTypeIcon` في `AdminRequests:192-213`) — **والنوعَ في السجلّ يختاره
 *   إنسانٌ في المودال**، فلا خريطةَ تحويلٍ آليةٌ تُخطئ في مكتبٍ ما بصمت.
 * · المدّةُ المعروضةُ هنا **تقويميّةٌ باسمها** (وصفُ الصفّ القديم)، والمدّةُ التي تُخصم
 *   تُحسب في المودال بقواعد النوع المختار — رقمان لا يُعرض أحدُهما تحت عنوان الآخر.
 * · **الحالةُ تُشرح ولا يُترك زرٌّ مطفأ بلا سبب**: `not_convertible_reason` من الخادم.
 */

/** النصُّ الثابت حين لا يرسل الخادمُ تعليمَه — لا يُترك التبويبُ بلا تفسير. */
const FALLBACK_NOTE =
  'هذه طلباتٌ سجّلها الموظفون في «الطلبات الإدارية». لا تدخل في احتساب الرصيد حتى تُحوَّل إلى السجلّ.';

const STATUS_BADGE: Record<string, string> = {
  approved: 'hr-badge--green',
  rejected: 'hr-badge--red',
  pending: 'hr-badge--gold',
};

interface Props {
  employeeId: number | null;
  employeeName?: string | null;
  filters: Omit<LegacyLeaveFilters, 'page' | 'per_page'>;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  /** `hr.leave.manage` — تُقرأ مرّةً في الصفحة وتُمرَّر، وزرُّ التحويل **يُحذف** لمن لا يملكها. */
  canManage?: boolean;
}

function statusLabel(row: { status: string; status_arabic: string }): string {
  const known = LEGACY_REQUEST_STATUS_LABELS[row.status as LegacyRequestStatus];
  return known ?? row.status_arabic ?? EMPTY_MARK;
}

export const LegacyRequestsTable: React.FC<Props> = ({
  employeeId,
  employeeName,
  filters,
  page,
  perPage,
  onPageChange,
  canManage = false,
}) => {
  const [target, setTarget] = useState<LegacyLeaveRow | null>(null);

  const legacyQuery = useQuery({
    queryKey: ['hr', 'leave', 'legacy', employeeId, { ...filters, page, per_page: perPage }],
    queryFn: () =>
      hrLeaveService.getLegacyRequests(employeeId as number, { ...filters, page, per_page: perPage }),
    enabled: employeeId !== null,
    staleTime: 5 * 60_000,
  });

  // ملخّصُ المكتب — يُعرض حين لا منسوبَ مختاراً، فالمسارُ التفصيليُّ لموظفٍ واحد.
  const summaryQuery = useQuery({
    queryKey: ['hr', 'leave', 'legacy-summary', null],
    queryFn: () => hrLeaveService.getLegacySummary(),
    enabled: employeeId === null,
    staleTime: 5 * 60_000,
  });

  if (employeeId === null) {
    const summary = summaryQuery.data;

    return (
      <>
        <p className="hrl-note">{summary?.note || FALLBACK_NOTE}</p>
        <div className="hrl-state hrl-state--empty">
          <Users size={22} />
          <p className="hrl-state__t">اختر منسوباً لعرض طلباته الإدارية</p>
          <p className="hrl-state__d">
            {summary
              ? `في المكتب ${fmtCount(summary.approved_count)} طلباً مقبولاً و${fmtCount(
                  summary.pending_count
                )} قيد الانتظار — بمجموع ${fmtCount(summary.total_calendar_days)} يوماً تقويمياً لا تدخل في احتساب الرصيد.`
              : 'الطلباتُ الإدارية تُقرأ لكلّ منسوبٍ على حدة.'}
          </p>
        </div>
      </>
    );
  }

  if (legacyQuery.isPending) {
    return (
      <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل الطلبات الإدارية">
        {Array.from({ length: 6 }, (_, i) => (
          <span className="hrl-skel" key={i} />
        ))}
      </div>
    );
  }

  const note = legacyQuery.data?.note || FALLBACK_NOTE;
  const rows = legacyQuery.data?.page.data ?? [];
  const lastPage = legacyQuery.data?.page.last_page ?? 1;
  const total = legacyQuery.data?.page.total ?? 0;

  if (rows.length === 0) {
    return (
      <>
        <p className="hrl-note">{note}</p>
        <div className="hrl-state hrl-state--empty">
          <Inbox size={22} />
          <p className="hrl-state__t">لا طلباتٍ إدارية</p>
          <p className="hrl-state__d">
            {filters.from || filters.to || filters.status
              ? 'لا طلباتٍ إداريةً في هذه المدة.'
              : `لا طلباتٍ إداريةً لـ${employeeName || 'هذا المنسوب'}.`}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {target !== null && employeeId !== null && (
        <ConvertLegacyModal
          employeeId={employeeId}
          employeeName={employeeName}
          row={target}
          canManage={canManage}
          onClose={() => setTarget(null)}
          onConverted={() => void legacyQuery.refetch()}
        />
      )}

      <p className="hrl-note">{note}</p>

      <table className="hrl-table hrl-table--single">
        <caption className="hrl-sr">الطلبات الإدارية السابقة وحالةُ تحويلها إلى سجلّ الإجازات</caption>
        <thead>
          <tr>
            <th scope="col">نوع الطلب</th>
            <th scope="col">المدى</th>
            <th scope="col">الأيام</th>
            <th scope="col">الحالة</th>
            <th scope="col">المراجع</th>
            <th scope="col">السجلّ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <span className="hrl-type__n">{row.type_name || EMPTY_MARK}</span>
              </td>
              <td>{fmtLeaveRange(row.start_date, row.end_date)}</td>
              <td>
                <span className="hrl-cellnum" dir="ltr">
                  {row.calendar_duration_days === null ? EMPTY_MARK : fmtCount(row.calendar_duration_days)}
                </span>
                <span className="hrl-cellsub">تقويميّة — والمخصومُ يُحسب بقواعد النوع عند التحويل</span>
              </td>
              <td>
                <span className={`hr-badge ${STATUS_BADGE[row.status] ?? 'hr-badge--gray'}`}>
                  {statusLabel(row)}
                </span>
              </td>
              <td>
                <span className="hrl-type__n">{row.reviewed_by_name || EMPTY_MARK}</span>
                {row.reviewed_at && <span className="hrl-cellsub">{fmtLeaveDate(row.reviewed_at)}</span>}
              </td>
              <td>
                {/* محوَّلٌ: رابطٌ إلى نتيجته — لا زرٌّ مطفأٌ يوهم أنّ الفعلَ ما زال ممكناً */}
                {row.is_converted ? (
                  <span className="hrl-convert">
                    <span className="hr-badge hr-badge--green">محوَّل</span>
                    <Link className="hrl-link" to={`/hr/leave/${employeeId}?tab=records`}>
                      سجلّ رقم {row.converted_leave_id} ←
                    </Link>
                  </span>
                ) : canManage && row.convertible ? (
                  <button type="button" className="hr-btn hr-btn--sm" onClick={() => setTarget(row)}>
                    <ArrowLeftRight size={13} /> حوّل إلى السجلّ
                  </button>
                ) : (
                  // ما ليس قابلاً للتحويل يُشرح بسببه — لا فراغَ ولا زرٌّ مطفأٌ بلا تفسير
                  <span className="hrl-convert__why">
                    {row.not_convertible_reason ?? (canManage ? EMPTY_MARK : 'يحتاج صلاحية «إدارة الإجازات».')}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="hrl-pager">
        <button
          type="button"
          className="hr-icon-btn hr-icon-btn--sm"
          aria-label="الصفحة السابقة"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronRight size={14} />
        </button>
        <span dir="ltr">
          {page} / {lastPage} · {total}
        </span>
        <button
          type="button"
          className="hr-icon-btn hr-icon-btn--sm"
          aria-label="الصفحة التالية"
          disabled={page >= lastPage}
          onClick={() => onPageChange(Math.min(lastPage, page + 1))}
        >
          <ChevronLeft size={14} />
        </button>
      </div>
    </>
  );
};

export default LegacyRequestsTable;
