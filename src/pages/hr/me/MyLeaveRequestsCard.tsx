import React, { useState } from 'react';
import { AlertTriangle, FileText, Plus, RefreshCw } from 'lucide-react';

import { LEAVE_STATUS_LABELS } from '../../../types/hr';
import type { LeaveStatus } from '../../../types/hr';
import EmptyLine from '../dossier/EmptyLine';
import { EMPTY_MARK, errorText, fmtDays, fmtLeaveRange } from '../leave/leaveFormat';
import { errorStatus } from './errorStatus';
import RequestLeaveModal from './RequestLeaveModal';
import { useMyLeaves } from './useMyLeaveRequest';

/**
 * **«طلباتي»** — زرُّ الطلب وسجلُّه بحالاته.
 *
 * كان الفعلُ هنا **رابطاً** إلى «الطلبات الإدارية» لأن `POST /hr/employees/{id}/leaves` محروسٌ
 * بـ`hr.leave.manage` ولا يملكها الموظف، فزرٌّ يفتح مودالاً كان زرّاً يفشل. وقد صار للموظف
 * مسارُه هو (`POST /hr/me/leaves` — بلا معرِّفٍ إطلاقاً، والملفُّ من الجلسة)، فصار الزرُّ زرّاً.
 *
 * ══════ ولماذا يبقى السجلُّ هنا لا في «إجازاتي القادمة» ══════
 * ذاك الجدولُ يعرض `blocking` (معلَّقٌ ومعتمَدٌ لم ينتهِ) — فالطلبُ **المرفوض يختفي منه**،
 * وهو أوّلُ ما يبحث عنه الموظفُ ولا يجده فيسأل مديرَه. وهذا السجلُّ يعرض الحالاتِ كلَّها
 * **ومعها سببُ الرفض** — الرفضُ بلا سببٍ يُنتج سؤالاً في اليوم التالي.
 *
 * أربعُ حالاتٍ متمايزة: هياكلُ التحميل · مثلثُ العطل بزرّ إعادة · سطرُ الخلوّ · الجدول.
 * و٤٠٤/٤٠٣ **لا تُرسَم إطلاقاً**: القسمُ الحاوي يشرحهما مرّةً واحدة، ولا تُكرَّر شاشةُ قفلٍ.
 *
 * 🔴 وصفرُ استطلاعٍ دوريّ — التحديثُ بعد الإرسال وحدَه (إبطالُ `useRequestLeave`).
 */

const STATUS_BADGE: Record<LeaveStatus, string> = {
  pending: 'hr-badge--gold',
  approved: 'hr-badge--green',
  rejected: 'hr-badge--red',
  cancelled: 'hr-badge--gray',
  superseded: 'hr-badge--gray',
};

export const MyLeaveRequestsCard: React.FC = () => {
  const [open, setOpen] = useState(false);
  const query = useMyLeaves();
  const status = errorStatus(query.error);

  // ٤٠٤ (لا ملفّ) و٤٠٣ (الوحدةُ مطفأة) يشرحهما القسمُ الحاوي — ولا تُرسَم البطاقةُ أصلاً.
  if (status === 404 || status === 403) return null;

  const data = query.data;
  const form = data?.form;
  const canRequest = form?.can_request === true;

  const header = (
    <div className="hrl-block__h">
      <h2 className="hrl-block__t hrl-h2">
        <FileText size={14} aria-hidden="true" /> طلباتي
      </h2>
      {canRequest && form !== undefined && (
        <span className="hrl-block__a">
          <button type="button" className="hr-btn hr-btn--sm" onClick={() => setOpen(true)}>
            <Plus size={13} aria-hidden="true" /> اطلب إجازة
          </button>
        </span>
      )}
    </div>
  );

  return (
    <>
      {open && form !== undefined && (
        <RequestLeaveModal
          types={form.types}
          documents={form.documents}
          onClose={() => setOpen(false)}
        />
      )}

      <section className="hrl-block">
        {header}

        {query.isPending ? (
          <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل طلباتك">
            {Array.from({ length: 3 }, (_, i) => (
              <span className="hrl-skel" key={i} />
            ))}
          </div>
        ) : query.isError || data === undefined ? (
          <div className="hrl-state hrl-state--error">
            <AlertTriangle size={22} />
            <p className="hrl-state__t">تعذّر جلبُ طلباتك</p>
            <p className="hrl-state__d">{errorText(query.error, 'انقطعَ الاتصال بالخادم.')}</p>
            <button type="button" className="hr-btn hr-btn--sm" onClick={() => void query.refetch()}>
              <RefreshCw size={13} /> إعادة المحاولة
            </button>
          </div>
        ) : data.requests.length === 0 ? (
          <>
            <EmptyLine text="لم تقدّم طلبَ إجازةٍ بعد" />
            {!canRequest && (
              <p className="hrl-note">لا أنواعَ إجازةٍ مفعّلةٌ في مكتبك — راجع إدارةَ المكتب.</p>
            )}
          </>
        ) : (
          <div className="hrl-block__b hrl-block__b--flush myhr-tablewrap">
            <table className="hrl-table hrl-table--single">
              <caption className="hrl-sr">طلباتُ إجازتي مرتَّبةً من الأحدث</caption>
              <thead>
                <tr>
                  <th scope="col">النوع</th>
                  <th scope="col">المدى</th>
                  <th scope="col">الأيام</th>
                  <th scope="col">ما جرى</th>
                </tr>
              </thead>
              <tbody>
                {data.requests.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="hrl-type__n">{row.type_name_snapshot || EMPTY_MARK}</span>
                      <span className="hrl-cellsub">
                        <span className={`hr-badge ${STATUS_BADGE[row.status]}`}>
                          {LEAVE_STATUS_LABELS[row.status]}
                        </span>
                      </span>
                    </td>
                    <td>{fmtLeaveRange(row.start_date, row.end_date)}</td>
                    <td>
                      <span className="hrl-cellnum" dir="ltr">{fmtDays(row.duration_days)}</span>
                    </td>
                    <td className="myhrq-why">
                      {/* سببُ الرفض أوّلاً — هو ما فُتحت الشاشةُ لأجله حين يُرفض طلب. */}
                      {row.status === 'rejected' && row.rejection_reason !== null ? (
                        <span className="myhrq-why__r">{row.rejection_reason}</span>
                      ) : row.status === 'cancelled' && row.cancellation_reason !== null ? (
                        <span className="myhrq-why__r">{row.cancellation_reason}</span>
                      ) : row.reason !== null ? (
                        <span className="myhrq-why__m">{row.reason}</span>
                      ) : (
                        EMPTY_MARK
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
};

export default MyLeaveRequestsCard;
