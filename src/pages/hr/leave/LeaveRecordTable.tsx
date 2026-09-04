import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Copy,
  Gavel,
  RefreshCw,
  Scissors,
  Undo2,
} from 'lucide-react';

import { hrLeaveService } from '../../../services/hrLeaveService';
import { DecideLeaveModal } from '../approval/DecideLeaveModal';
import ArticleRef from './ArticleRef';
import {
  EMPTY_MARK,
  LEAVE_DATE_LOCALE,
  colorClass,
  errorText,
  excludedLabel,
  fmtDays,
  fmtLeaveRange,
  leaveArticleRef,
  leaveTypeName,
} from './leaveFormat';
import { LEAVE_SOURCE_LABELS, LEAVE_STATUS_LABELS, PAY_TREATMENT_LABELS } from '../../../types/hr';
import type { HrLeave, LeaveListFilters, LeaveStatus } from '../../../types/hr';
import type { CorrectionAction } from './LeaveCorrectionModal';

/**
 * تبويبُ «السجلّ» — وقائعُ `hr_leaves` لا حركاتُ الدفتر.
 *
 * · `border-collapse: separate` عمداً: الترويسةُ اللاصقة مع الحدود المطويّة تُسقط
 *   الحدودَ في بعض المتصفّحات، والفصلُ بـ`border-block-end` يعطي الالتصاقَ نفسَه.
 * · **صفرُ حسابٍ للأيام في الفرونت** (فخُّ `calculateDays` في `AdminRequests:153`):
 *   `duration_days` و`charged_days` من الخادم، وما لم يُرسَل لا يُخمَّن.
 * · **لا زرَّ حذفٍ ولا تحديثَ تفاؤليّ**: لا مسارَ `DELETE` في الوحدة، والإلغاءُ
 *   يوجب سبباً — ورقمُ الرصيد لا يُخمَّن قبل أن يردّه الخادم.
 */

const STATUS_BADGE: Record<LeaveStatus, string> = {
  pending: 'hr-badge--gold',
  approved: 'hr-badge--green',
  rejected: 'hr-badge--red',
  cancelled: 'hr-badge--gray',
  superseded: 'hr-badge--gray',
};

interface Props {
  /** ملفُّ الموظف المعروض؛ `null` = سجلُّ المكتب كلِّه. */
  employeeId: number | null;
  filters: Omit<LeaveListFilters, 'page' | 'per_page' | 'employee_profile_id'>;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  canManage: boolean;
  /** آخرُ واقعةٍ سُجّلت في هذه الجلسة — تومض مرّةً ليُعرف موضعُها. */
  freshLeaveId?: number | null;
  onOpenRecord: (leave: HrLeave) => void;
  onCorrect: (action: CorrectionAction, leave: HrLeave) => void;
  /** «تكرار على منسوبٍ آخر»: يفتح المودالَ بالنوع والمدى معبّأين بلا هدف. */
  onRepeat: (leave: HrLeave) => void;
}

/** شهرُ الصفّ من `start_date` — التجميعُ عرضٌ محضٌ ولا يمسّ رقماً. */
function monthKey(leave: HrLeave): string {
  return (leave.start_date || '').slice(0, 7);
}

function monthLabel(key: string): string {
  if (key === '') return EMPTY_MARK;
  const date = new Date(`${key}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString(LEAVE_DATE_LOCALE, { year: 'numeric', month: 'long' });
}

export const LeaveRecordTable: React.FC<Props> = ({
  employeeId,
  filters,
  page,
  perPage,
  onPageChange,
  canManage,
  freshLeaveId = null,
  onOpenRecord,
  onCorrect,
  onRepeat,
}) => {
  const params = useMemo(
    () => ({ ...filters, page, per_page: perPage }),
    [filters, page, perPage]
  );

  const recordsQuery = useQuery({
    queryKey: ['hr', 'leave', 'records', { employee_profile_id: employeeId, ...params }],
    queryFn: () =>
      employeeId === null
        ? hrLeaveService.getLeaves(params)
        : hrLeaveService.getEmployeeLeaves(employeeId, params),
    staleTime: 15_000,
  });

  /**
   * 🔴 **بابٌ واحدٌ للقرار — لا اعتمادَ بنقرةٍ من الجدول.**
   *
   * كان زرُّ الاعتماد هنا يُطلق الطلبَ فوراً، وتعليلُه المكتوب أنّ «الاعتماد فعلٌ بلا حقولٍ
   * إضافية فلا يستحقّ مودالاً». والتعليلُ خطأ: النافذةُ ليست لجمع حقول، بل **لعرض ما
   * سيُحدثه المعتمِد** — لوحُ التعارض (جلسةٌ أو مهمّةٌ تقع في مدّة الإجازة) والأثرُ في الرصيد
   * من الخادم.
   *
   * والأخطرُ أنّ `DecideLeaveModal` تشترط **إقراراً صريحاً** حين يصير الرصيدُ سالباً
   * (`will_go_negative`)، وهذا البابُ كان يتجاوز الشرطَ كلَّه: رصيدٌ سالبٌ يقع بنقرةٍ لم
   * تقصده، بينما طابورُ الاعتماد يمنعه. حارسٌ واحدٌ لفعلٍ واحدٍ ببابين وأحدُهما مفتوح.
   *
   * فصار القرارُ — قبولاً ورفضاً — يمرّ على الشاشة نفسِها التي يمرّ عليها في الطابور.
   */
  const [decideLeaveId, setDecideLeaveId] = useState<number | null>(null);

  const rows = useMemo(() => recordsQuery.data?.data ?? [], [recordsQuery.data]);
  const lastPage = recordsQuery.data?.last_page ?? 1;
  const total = recordsQuery.data?.total ?? 0;

  /** تجميعٌ بالشهر مع الحفاظ على ترتيب الخادم — لا فرزَ في الفرونت. */
  const groups = useMemo(() => {
    const out: Array<{ key: string; rows: HrLeave[] }> = [];

    rows.forEach((leave) => {
      const key = monthKey(leave);
      const last = out[out.length - 1];
      if (last && last.key === key) last.rows.push(leave);
      else out.push({ key, rows: [leave] });
    });

    return out;
  }, [rows]);

  if (recordsQuery.isPending) {
    return (
      <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل السجل">
        {Array.from({ length: 8 }, (_, i) => (
          <span className="hrl-skel" key={i} />
        ))}
      </div>
    );
  }

  if (recordsQuery.isError) {
    return (
      <div className="hrl-state hrl-state--error">
        <AlertTriangle size={22} />
        <p className="hrl-state__t">تعذر تحميل السجل</p>
        <p className="hrl-state__d">{errorText(recordsQuery.error, 'انقطع الاتصال بالخادم.')}</p>
        <button type="button" className="hr-btn hr-btn--sm" onClick={() => void recordsQuery.refetch()}>
          <RefreshCw size={13} /> إعادة المحاولة
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="hrl-state hrl-state--empty">
        <CalendarX size={22} />
        <p className="hrl-state__t">لا سجلات إجازة</p>
        <p className="hrl-state__d">
          {employeeId === null
            ? 'لم يتم تسجيل أي إجازة أو غياب ضمن هذه التصفية.'
            : 'لم يتم تسجيل أي إجازة أو غياب لهذا الموظف ضمن هذه التصفية.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <table className={`hrl-table${employeeId === null ? '' : ' hrl-table--single'}`}>
        <caption className="hrl-sr">سجل الإجازات والغياب</caption>
        <thead>
          <tr>
            <th scope="col" className="hrl-c-emp">الموظف</th>
            <th scope="col">النوع</th>
            <th scope="col">المدى</th>
            <th scope="col">الأيام</th>
            <th scope="col">الأثر المالي</th>
            <th scope="col">الحالة</th>
            <th scope="col">المصدر</th>
            <th scope="col">
              <span className="hrl-sr">أدوات</span>
            </th>
          </tr>
        </thead>

        {groups.map((group) => (
          <tbody key={group.key || 'none'}>
            <tr className="hrl-monthhead">
              <th scope="rowgroup" colSpan={8}>
                {monthLabel(group.key)}
              </th>
            </tr>

            {group.rows.map((leave) => {
              const excluded = excludedLabel(leave.computation_meta);
              const ref = leaveArticleRef(leave);
              const charged =
                typeof leave.charged_days === 'number'
                  ? fmtDays(leave.charged_days)
                  : leave.status === 'approved'
                    ? fmtDays(leave.duration_days)
                    : EMPTY_MARK;

              /**
               * الصفُّ المعلَّقُ كلُّه يفتح شاشةَ القرار — تيسيرٌ للفأرة **فوق** الزرّ لا بدلاً منه:
               * `<tr onClick>` لا يبلغه لوحُ المفاتيح، فيبقى الزرُّ في عمود الأدوات هو البابَ
               * الموثَّق. وكلُّ عنصرٍ تفاعليٍّ داخل الصفّ يوقف الانتشار كي لا يفتح النافذةَ
               * من يقصد زرّاً آخر.
               */
              const rowDecidable = canManage && leave.status === 'pending';

              return (
                <tr
                  key={leave.id}
                  className={
                    [leave.id === freshLeaveId ? 'is-fresh' : '', rowDecidable ? 'is-decidable' : '']
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                  onClick={rowDecidable ? () => setDecideLeaveId(leave.id) : undefined}
                >
                  <td className="hrl-c-emp">
                    <span className="hrl-type__n">{leave.employee_profile?.user?.name || EMPTY_MARK}</span>
                    <span className="hrl-cellsub">{leave.employee_profile?.department || ''}</span>
                  </td>

                  <td>
                    <span className={`hrl-type ${colorClass(leave.leave_type?.color_key)}`}>
                      <span className="hrl-dot" aria-hidden="true" />
                      <span>
                        <span className="hrl-type__n">{leaveTypeName(leave)}</span>
                        {ref !== '' && (
                          <span className="hrl-cellsub">
                            <ArticleRef value={ref} />
                          </span>
                        )}
                      </span>
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="hrl-cellbtn"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenRecord(leave);
                      }}
                    >
                      {fmtLeaveRange(leave.start_date, leave.end_date)}
                    </button>
                    {leave.half_day && <span className="hrl-cellsub">نصف يوم</span>}
                  </td>

                  <td>
                    <span className="hrl-cellnum" dir="ltr">
                      {fmtDays(leave.duration_days)}
                    </span>
                    {excluded !== '' && <span className="hrl-cellsub">{excluded}</span>}
                    <span className="hrl-cellsub">مخصوم من الرصيد: {charged}</span>
                  </td>

                  <td>{PAY_TREATMENT_LABELS[leave.pay_treatment] ?? EMPTY_MARK}</td>

                  <td>
                    <span className={`hr-badge ${STATUS_BADGE[leave.status]}`}>{LEAVE_STATUS_LABELS[leave.status]}</span>
                  </td>

                  <td>
                    <span className="hrl-type__n">{LEAVE_SOURCE_LABELS[leave.source] ?? EMPTY_MARK}</span>
                    {leave.self_approved && <span className="hrl-cellsub">اعتماد ذاتي</span>}
                  </td>

                  <td>
                    {canManage && (
                      <span className="hrl-tools" onClick={(event) => event.stopPropagation()}>
                        {/* زرٌّ واحدٌ يفتح شاشةَ القرار — لا ✓ و✗ يقعان من الجدول */}
                        {leave.status === 'pending' && (
                          <button
                            type="button"
                            className="hr-icon-btn hr-icon-btn--sm"
                            title="قبول الطلب أو رفضه"
                            aria-label={`قبول أو رفض إجازة ${fmtLeaveRange(leave.start_date, leave.end_date)}`}
                            onClick={() => setDecideLeaveId(leave.id)}
                          >
                            <Gavel size={13} />
                          </button>
                        )}

                        {(leave.status === 'pending' || leave.status === 'approved') && (
                          <button
                            type="button"
                            className="hr-icon-btn hr-icon-btn--sm"
                            title="إلغاء"
                            aria-label="إلغاء الإجازة"
                            onClick={() => onCorrect('cancel', leave)}
                          >
                            <Undo2 size={13} />
                          </button>
                        )}

                        {leave.status === 'approved' && (
                          <button
                            type="button"
                            className="hr-icon-btn hr-icon-btn--sm"
                            title="تقصير المدة (عودة مبكرة)"
                            aria-label="تقصير المدة"
                            onClick={() => onCorrect('shorten', leave)}
                          >
                            <Scissors size={13} />
                          </button>
                        )}

                        <button
                          type="button"
                          className="hr-icon-btn hr-icon-btn--sm"
                          title="تكرار على موظف آخر"
                          aria-label="تكرار على موظف آخر"
                          onClick={() => onRepeat(leave)}
                        >
                          <Copy size={13} />
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
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

      {/* شاشةُ القرار — هي نفسُها المستعملةُ في طابور الاعتماد، بلا نسخةٍ ثانيةٍ تفترق عنها.
          وهي تُبطل مفاتيح `hr.leave` بنفسها بعد القرار، فلا إبطالَ مكرَّرٌ هنا. */}
      {decideLeaveId !== null && (
        <DecideLeaveModal leaveId={decideLeaveId} onClose={() => setDecideLeaveId(null)} />
      )}
    </>
  );
};

export default LeaveRecordTable;
