import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { AlertTriangle, Inbox, RefreshCw, X } from 'lucide-react';

import { hrAttendanceService } from '../../../services/hrAttendanceService';
import { CLAIM_KIND_LABELS, CLAIM_STATUS_LABELS } from '../../../types/hr';
import type { AttendanceClaim, ClaimStatus } from '../../../types/hr';
import { ATT_KEYS, useApproveClaim, useRejectClaim } from './useAttendanceQueue';
import { errorText, fmtDateTime, fmtRange } from './attendanceFormat';

/**
 * طابورُ اعتماد الادّعاءات — الوجهُ الآخر لزرِّ «هذا غير صحيح» عند الموظف.
 *
 * اعتمادُ «بصمةٍ منسيّة» **يُنشئ بصماتٍ جديدة** في الخادم بمصدر `manual` وثقةِ `attested`
 * ومفتاحٍ حتميّ — ولا يُعدَّل صفُّ بصمةٍ قائمٍ إطلاقاً.
 *
 * و`self_approved` **ظاهرٌ وموسومٌ لا صامت**: البوّابةُ تسقط فعلياً في مكتبٍ لا معتمِدَ فيه
 * غيرُ صاحب الطلب، والفرقُ أن يُكتب ذلك ويُقرأ في التدقيق بدل أن يمرّ بلا أثر.
 */

interface Props {
  employeeProfileId: number | null;
  canManage: boolean;
}

export const ClaimsQueue: React.FC<Props> = ({ employeeProfileId, canManage }) => {
  const [status, setStatus] = useState<ClaimStatus | ''>('pending');
  const [rejecting, setRejecting] = useState<AttendanceClaim | null>(null);
  const [reason, setReason] = useState('');

  const claims = useQuery({
    queryKey: [...ATT_KEYS.claims(status || 'all'), employeeProfileId],
    queryFn: () => hrAttendanceService.listClaims({
      status,
      employee_profile_id: employeeProfileId,
      per_page: 50,
    }),
    staleTime: 60_000,
    retry: false,
  });

  const approve = useApproveClaim();
  const reject = useRejectClaim();

  const rows = claims.data?.page.data ?? [];
  const names = claims.data?.employees ?? {};

  const doApprove = async (claim: AttendanceClaim) => {
    try {
      const result = await approve.mutateAsync(claim.id);
      toast.success(
        result.punch_ids.length > 0
          ? `تم اعتماد الطلب وإضافة ${result.punch_ids.length} بصمة`
          : 'تم اعتماد الطلب'
      );
    } catch (e) {
      toast.error(errorText(e, 'فشل في اعتماد الطلب'));
    }
  };

  const doReject = async () => {
    if (rejecting === null) return;

    const clean = reason.trim();
    if (clean.length < 10) {
      toast.error('اكتب سبب الرفض. يقرؤه صاحب الطلب.');
      return;
    }

    try {
      await reject.mutateAsync({ claimId: rejecting.id, reason: clean });
      toast.success('تم رفض الطلب وإبلاغ صاحبه بالسبب');
      setRejecting(null);
      setReason('');
    } catch (e) {
      toast.error(errorText(e, 'فشل في رفض الطلب'));
    }
  };

  return (
    <>
      <div className="hra-sech">
        <h2 className="hra-sech__t">
          <Inbox size={14} aria-hidden="true" /> طلبات التصحيح
        </h2>
        <button
          type="button"
          className="ssp2-btn"
          onClick={() => setStatus(status === 'pending' ? '' : 'pending')}
        >
          {status === 'pending' ? 'أظهر الكل' : 'المعلقة فقط'}
        </button>
      </div>

      {claims.isPending ? (
        <div className="hra-state hra-state--loading" aria-busy="true" aria-label="جارٍ تحميل الطلبات">
          {Array.from({ length: 4 }, (_, i) => <span className="hra-skel" key={i} />)}
        </div>
      ) : claims.isError ? (
        <div className="hra-state hra-state--error">
          <AlertTriangle size={20} aria-hidden="true" />
          <p className="hra-state__t">تعذر تحميل الطلبات</p>
          <p className="hra-state__d">{errorText(claims.error, 'انقطع الاتصال بالخادم.')}</p>
          <button type="button" className="ssp2-btn" onClick={() => { void claims.refetch(); }}>
            <RefreshCw size={13} /> إعادة المحاولة
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="hra-state">
          <Inbox size={22} aria-hidden="true" />
          <p className="hra-state__t">لا توجد طلبات تصحيح</p>
          <p className="hra-state__d">
            تظهر هنا طلبات الموظفين لتصحيح أيام في سجلهم — يرسلها الموظف من صفحته،
            ويعتمدها مدير المكتب أو يرفضها من هنا.
          </p>
        </div>
      ) : (
        rows.map((claim) => (
          <div className="hra-day" key={claim.id}>
            <div className="hra-day__main">
              <div className="hra-day__d">
                <span>{names[claim.employee_profile_id]?.name ?? 'موظف'}</span>
                <span className="hra-flag">{CLAIM_KIND_LABELS[claim.claim_type] ?? claim.claim_type}</span>
                <span className="hra-st">{CLAIM_STATUS_LABELS[claim.status] ?? claim.status}</span>
                {claim.self_approved && <span className="hra-flag hra-flag--danger">معتمد من صاحبه</span>}
              </div>
              <p className="hra-day__sub">
                {fmtRange(claim.start_date, claim.end_date)} · {claim.reason}
              </p>
              {claim.status === 'rejected' && claim.rejection_reason && (
                <p className="hra-day__sub">سبب الرفض: {claim.rejection_reason}</p>
              )}
              {claim.approved_at && (
                <p className="hra-day__sub">تم الاعتماد في {fmtDateTime(claim.approved_at)}</p>
              )}
            </div>

            {canManage && claim.status === 'pending' && (
              <div className="hra-day__end">
                <button
                  type="button"
                  className="ssp2-btn ssp2-btn--primary"
                  onClick={() => { void doApprove(claim); }}
                  disabled={approve.isPending}
                >
                  اعتمد
                </button>
                <button
                  type="button"
                  className="ssp2-btn"
                  onClick={() => { setRejecting(claim); setReason(''); }}
                >
                  ارفض
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {rejecting !== null && (
        <div className="hr-modal-overlay" onClick={() => setRejecting(null)}>
          <div className="hr-modal hra-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hr-modal__h">
              <h3>رفض طلب — {names[rejecting.employee_profile_id]?.name ?? 'موظف'}</h3>
              <button
                type="button"
                className="hr-icon-btn"
                onClick={() => setRejecting(null)}
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            <div className="hr-modal__b">
              <p className="hra-hint">
                يصل السبب إلى صاحب الطلب كما كتبته.
              </p>
              <div className="hr-field">
                <label htmlFor="hra-reject-reason">سبب الرفض *</label>
                <textarea
                  id="hra-reject-reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <span className="hra-count" dir="ltr">{reason.trim().length} / 10</span>
              </div>
            </div>

            <div className="hr-modal__f">
              <button type="button" className="hr-btn" onClick={() => setRejecting(null)}>إلغاء</button>
              <button
                type="button"
                className="hr-btn hr-btn--primary"
                onClick={() => { void doReject(); }}
                disabled={reject.isPending}
              >
                {reject.isPending ? 'جارٍ الحفظ…' : 'ارفض الطلب'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClaimsQueue;
