import React, { useState } from 'react';
import { AlertTriangle, Gavel, Inbox, ListTodo, Loader2, Users } from 'lucide-react';

import { colorClass, EMPTY_MARK, errorText, fmtDays, fmtLeaveDate } from '../leave/leaveFormat';
import type { ApprovalQueueRow } from '../../../services/hrLeaveApprovalService';
import { DecideLeaveModal } from './DecideLeaveModal';
import { useApprovalQueue } from './useLeaveApproval';

/**
 * **طابورُ المعتمِد** — الطلباتُ المنتظرةُ قراراً، بأسمائها ومددها ووسمِ من له تعارض.
 *
 * ══════ الوسمُ في الطابور لا يُغني عن اللوح ══════
 * الشارةُ هنا **عددٌ لا تفصيل**: «جلستان» تدفع إلى الفتح، ولا تُقرأ قراراً. والتفصيلُ
 * (تاريخُ الجلسة والمحكمةُ ورقمُ القضية) في `DecideLeaveModal` حيث يقع القرار — وضعُه في
 * صفٍّ ضيّقٍ يجعله يُقرأ بالعين الطرفية ثمّ يُنسى.
 *
 * 🔴 **و`conflict_summary === null` ليست «لا تعارض»** — هي «لم يُفحص» (تجاوز الصفُّ سقفَ
 * المسح في الخادم). فتُكتب شرطةً ملفوظة، ولا تُرسَم شارةُ سلامةٍ لصفٍّ لم يُنظر فيه أصلاً.
 * والفرقُ ليس تجميلاً: شارةُ سلامةٍ كاذبةٌ تُمرِّر جلسةً.
 *
 * ══════ أربعُ حالاتٍ متمايزة ══════
 * جارٍ · تعذّر (بنصّ الخادم وزرِّ إعادة) · طابورٌ فارغٌ (**حالةٌ سليمةٌ تُنطق**: لا طلبات
 * تنتظر) · صفوف. ولا استطلاعَ دوريّ — الإبطالُ بعد القرار وحدَه.
 */

interface Props {
  /** سقفُ الصفوف — الخادمُ يقصّه إلى ٥٠ على أيّ حال. */
  limit?: number;
}

/** شارةُ التعارض في الصفّ — ثلاثةُ أعدادٍ أو شرطةُ «لم يُفحص». */
const ConflictBadge: React.FC<{ row: ApprovalQueueRow }> = ({ row }) => {
  const summary = row.conflict_summary;

  if (summary === null) {
    return (
      <span className="hrla-q__badge hrla-q__badge--unknown" title="لم يتم فحص التعارض في هذا الطلب">
        غير مفحوص
      </span>
    );
  }

  if (!summary.has_conflicts) {
    return <span className="hrla-q__badge hrla-q__badge--clear">لا تعارض</span>;
  }

  return (
    <span className="hrla-q__badge hrla-q__badge--hit">
      {summary.scheduled_sessions > 0 && (
        <span className="hrla-q__hit">
          <Gavel size={11} aria-hidden="true" />
          <span dir="ltr">{summary.scheduled_sessions}</span>
        </span>
      )}
      {summary.pending_tasks > 0 && (
        <span className="hrla-q__hit">
          <ListTodo size={11} aria-hidden="true" />
          <span dir="ltr">{summary.pending_tasks}</span>
        </span>
      )}
      {summary.overlapping_leaves > 0 && (
        <span className="hrla-q__hit">
          <Users size={11} aria-hidden="true" />
          <span dir="ltr">{summary.overlapping_leaves}</span>
        </span>
      )}
    </span>
  );
};

export const LeaveApprovalQueue: React.FC<Props> = ({ limit = 25 }) => {
  const queue = useApprovalQueue(limit);
  const [openId, setOpenId] = useState<number | null>(null);

  const data = queue.data;
  const rows = data?.rows ?? [];
  const unscanned = data === undefined ? 0 : Math.max(0, data.count - data.conflicts_scanned);

  return (
    <section className="hrla-q" aria-label="طلبات الإجازة المنتظرة">
      <h3 className="hrla-q__t">
        طلبات تنتظر قرارك
        {data !== undefined && data.count > 0 && (
          <span className="hrla-q__n" dir="ltr">{data.count}</span>
        )}
      </h3>

      {/* ① جارٍ */}
      {queue.isLoading && (
        <p className="hrla-state">
          <Loader2 size={14} aria-hidden="true" className="hrla-spin" />
          جارٍ تحميل الطلبات…
        </p>
      )}

      {/* ② تعذّر */}
      {queue.isError && (
        <div className="hrla-state hrla-state--error">
          <p>
            <AlertTriangle size={14} aria-hidden="true" />
            {errorText(queue.error, 'تعذر تحميل طلبات الاعتماد')}
          </p>
          <button type="button" className="hr-btn hr-btn--sm" onClick={() => void queue.refetch()}>
            أعد المحاولة
          </button>
        </div>
      )}

      {/* ③ فارغٌ — حالةٌ سليمةٌ تُنطق لا شاشةٌ صامتة */}
      {!queue.isLoading && !queue.isError && rows.length === 0 && (
        <p className="hrla-state hrla-state--empty">
          <Inbox size={14} aria-hidden="true" />
          لا توجد طلبات إجازة تنتظر قرارك الآن.
        </p>
      )}

      {/* ④ صفوف */}
      {rows.length > 0 && (
        <ul className="hrla-q__list">
          {rows.map((row) => (
            <li key={row.id} className="hrla-q__row">
              <button
                type="button"
                className="hrla-q__open"
                onClick={() => setOpenId(row.id)}
                aria-label={`افتح قرار إجازة ${row.employee_name ?? ''}`}
              >
                <span className="hrla-q__who">{row.employee_name || EMPTY_MARK}</span>
                <span className={`hrl-type ${colorClass(row.color_key)}`}>
                  <span className="hrl-dot" aria-hidden="true" />
                  <span className="hrl-type__n">{row.type_name || EMPTY_MARK}</span>
                </span>
                <span className="hrla-q__when">
                  {fmtLeaveDate(row.start_date)} {'←'} {fmtLeaveDate(row.end_date)}
                </span>
                <span className="hrla-q__days">
                  <span dir="ltr">{fmtDays(row.duration_days)}</span> يوم
                </span>
                <ConflictBadge row={row} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* الصمتُ لا يُترك يُقرأ سلامةً — يُقال كم صفّاً لم يُفحص */}
      {unscanned > 0 && (
        <p className="hrla-q__note">
          لم يتم فحص التعارض في <span dir="ltr">{unscanned}</span> من الطلبات (سقف الفحص{' '}
          <span dir="ltr">{data?.conflict_scan_limit}</span>). افتح الطلب حتى يتم فحصه.
        </p>
      )}

      {openId !== null && <DecideLeaveModal leaveId={openId} onClose={() => setOpenId(null)} />}
    </section>
  );
};
