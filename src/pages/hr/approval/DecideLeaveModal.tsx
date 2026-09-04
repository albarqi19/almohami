import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { AlertTriangle, Loader2, ShieldAlert, X } from 'lucide-react';

import { colorClass, EMPTY_MARK, errorText, fmtDays, fmtLeaveDate } from '../leave/leaveFormat';
import { ApprovalConflictPanel } from './ApprovalConflictPanel';
import { useApproveLeave, useLeaveDecision, useRejectLeave } from './useLeaveApproval';

/**
 * **شاشةُ القرار** — يرى المعتمِدُ الطلبَ وما يقع في مدّته وأثرَه في الرصيد، ثمّ يقرّر.
 *
 * ══════ ترتيبُ العناصر مقصود ══════
 * الطلبُ ← **لوحُ التعارض** ← الأثرُ في الرصيد ← الزرّان. اللوحُ **فوق** الزرّين لا تحتهما:
 * ما يُمرَّر إليه بعد أن تصل اليدُ إلى الزرّ لم يُقرأ. ولا طيَّ على الجلسات (انظر اللوح).
 *
 * ══════ التأكيدُ يقول الرقمَ لا «هل أنت متأكّد» ══════
 * «سيُخصم ٥ أيامٍ (١٦ ⇐ ١١)» يُقرأ ويُراجَع؛ و«هل أنت متأكّد؟» تُنقر بلا قراءة. والرقمُ يأتي
 * من الخادم (`impact`) لا من حسابٍ في الواجهة — الواجهةُ تعرض ما سيقع لا ما تظنّه.
 *
 * 🔴 **الرصيدُ السالبُ يُعلَن ويُطلَب له إقرار** — لا يُمنَع صامتاً ولا يُسمَح به صامتاً.
 * الخادمُ لا يحجبه (المكتبُ سيّدُ كرمِه)، والمنعُ هنا يخترع سياسةً لا يملكها الفرونت؛ لكنّ
 * السماحَ بلا إقرارٍ يجعل رصيداً سالباً يقع بنقرةٍ لم تقصده. فمربّعُ إقرارٍ واحد: يُقرأ ويُوقَّع.
 *
 * 🔴 **والرفضُ يشترط سبباً** — يُحفَظ ويظهر للموظف في «إجازاتي». الزرُّ معطَّلٌ حتى يُكتب،
 * فلا ٤٢٢ بعد الضغط. والخادمُ يعيد فرضَه على أيّ حال (`rejection_reason` مطلوبٌ في النموذج).
 *
 * ══════ أربعُ حالاتٍ متمايزة ══════
 * جارٍ · تعذّر (بنصّ الخادم وزرِّ إعادة) · قرارٌ وقع سلفاً (`is_pending=false`) · محتوى.
 * ولا حالةَ خامسة صامتة: مودالٌ فارغٌ بلا سببٍ مكتوبٍ عطلٌ لا يُبلَّغ عنه.
 */

interface Props {
  leaveId: number;
  onClose: () => void;
}

/** حالاتُ الصفّ حين يكون القرارُ قد وقع سلفاً — خريطةٌ واحدةٌ، لا نصَّ حالةٍ في الشجرة. */
const SETTLED_LABEL: Record<string, string> = {
  approved: 'هذا الطلب معتمَد مسبقا.',
  rejected: 'هذا الطلب مرفوض مسبقا.',
  cancelled: 'هذه الإجازة ملغاة.',
  superseded: 'هذه الإجازة مستبدَلة بأخرى.',
};

export const DecideLeaveModal: React.FC<Props> = ({ leaveId, onClose }) => {
  const decision = useLeaveDecision(leaveId);
  const approve = useApproveLeave();
  const reject = useRejectLeave();

  const [mode, setMode] = useState<'idle' | 'reject'>('idle');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [negativeAck, setNegativeAck] = useState(false);

  const data = decision.data;
  const leave = data?.leave;
  const impact = data?.impact;

  const busy = approve.isPending || reject.isPending;
  const needsAck = impact?.will_go_negative === true;
  const canApprove = data?.is_pending === true && (!needsAck || negativeAck) && !busy;
  const canReject = data?.is_pending === true && reason.trim() !== '' && !busy;

  const runApprove = async () => {
    if (leave === undefined || !canApprove) return;

    try {
      const result = await approve.mutateAsync({
        employeeProfileId: leave.employee_profile_id,
        leaveId: leave.id,
        notes: notes.trim() === '' ? undefined : notes.trim(),
      });

      const after = result.balance?.after;
      toast.success(
        typeof after === 'number'
          ? `تم اعتماد الإجازة. الرصيد الآن ${fmtDays(after)} يوماً.`
          : 'تم اعتماد الإجازة.'
      );
      onClose();
    } catch (error) {
      toast.error(errorText(error, 'تعذر اعتماد الإجازة'));
    }
  };

  const runReject = async () => {
    if (leave === undefined || !canReject) return;

    try {
      await reject.mutateAsync({
        employeeProfileId: leave.employee_profile_id,
        leaveId: leave.id,
        reason: reason.trim(),
      });

      toast.success('تم رفض الطلب. يظهر السبب للموظف.');
      onClose();
    } catch (error) {
      toast.error(errorText(error, 'تعذر رفض الطلب'));
    }
  };

  return (
    <div className="hr-modal-overlay" onClick={onClose}>
      <div className="hr-modal hrla-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hr-modal__h">
          <h3>قرار إجازة</h3>
          <button type="button" className="hr-icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="hr-modal__b">
          {/* ① جارٍ */}
          {decision.isLoading && (
            <p className="hrla-state">
              <Loader2 size={14} aria-hidden="true" className="hrla-spin" />
              جارٍ تحميل بيانات القرار…
            </p>
          )}

          {/* ② تعذّر — بنصّ الخادم وبابِ عودة */}
          {decision.isError && (
            <div className="hrla-state hrla-state--error">
              <p>
                <AlertTriangle size={14} aria-hidden="true" />
                {errorText(decision.error, 'تعذر تحميل بيانات القرار')}
              </p>
              <button type="button" className="hr-btn hr-btn--sm" onClick={() => void decision.refetch()}>
                أعد المحاولة
              </button>
            </div>
          )}

          {/* ③ + ④ المحتوى، ومعه حالةُ «القرارُ وقع سلفاً» */}
          {data !== undefined && leave !== undefined && (
            <>
              <dl className="hrla-head">
                <div className="hrla-head__i">
                  <dt>الموظف</dt>
                  <dd>
                    {leave.employee_name || EMPTY_MARK}
                    {leave.department ? <span className="hrla-chip">{leave.department}</span> : null}
                  </dd>
                </div>
                <div className="hrla-head__i">
                  <dt>النوع</dt>
                  <dd>
                    <span className={`hrl-type ${colorClass(leave.color_key)}`}>
                      <span className="hrl-dot" aria-hidden="true" />
                      <span className="hrl-type__n">{leave.type_name || EMPTY_MARK}</span>
                    </span>
                    {leave.legal_reference ? (
                      <span className="hrla-chip" dir="ltr">{leave.legal_reference}</span>
                    ) : null}
                  </dd>
                </div>
                <div className="hrla-head__i">
                  <dt>المدة</dt>
                  <dd>
                    {fmtLeaveDate(leave.start_date)} {'←'} {fmtLeaveDate(leave.end_date)}
                    <span className="hrla-chip">
                      <span dir="ltr">{fmtDays(leave.duration_days)}</span> يوم
                    </span>
                  </dd>
                </div>
                <div className="hrla-head__i">
                  <dt>السبب</dt>
                  <dd>{leave.reason || 'غير مذكور'}</dd>
                </div>
              </dl>

              {/* لوحُ التعارض — فوق الزرّين دائماً، ولا يُخفى حين لا تعارض */}
              <ApprovalConflictPanel context={data.conflict} impact={data.impact} />

              {!data.is_pending && (
                <p className="hrla-state hrla-state--settled">
                  {SETTLED_LABEL[leave.status] ?? 'لا يمكن اتخاذ قرار في هذا الطلب.'}
                  {leave.rejection_reason ? ` السبب: ${leave.rejection_reason}` : ''}
                </p>
              )}

              {data.is_pending && data.is_own_request && (
                <p className="hrla-state hrla-state--settled">
                  <ShieldAlert size={13} aria-hidden="true" />
                  هذا طلبك، ولا يمكنك اعتماده. يعتمده زميل لديه صلاحية الإجازات.
                </p>
              )}

              {/* ═══ الإقرارُ بالرصيد السالب — يُعلَن ويُوقَّع، ولا يُمنَع صامتاً ═══ */}
              {data.is_pending && needsAck && (
                <label className="hrla-ack">
                  <input
                    type="checkbox"
                    checked={negativeAck}
                    onChange={(e) => setNegativeAck(e.target.checked)}
                  />
                  <span>
                    أؤكد أن الاعتماد يخفض رصيده إلى{' '}
                    <span dir="ltr">{fmtDays(impact?.balance_after)}</span> يوم، أي إلى السالب.
                  </span>
                </label>
              )}

              {/* ═══ الرفض — سببٌ إلزاميّ يُحفَظ ويظهر للموظف ═══ */}
              {data.is_pending && mode === 'reject' && (
                <div className="hr-field">
                  <label htmlFor="hrla-reason">سبب الرفض *</label>
                  <textarea
                    id="hrla-reason"
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="اكتب سببا واضحا يظهر للموظف في «إجازاتي»"
                  />
                </div>
              )}

              {data.is_pending && mode === 'idle' && (
                <div className="hr-field">
                  <label htmlFor="hrla-notes">ملاحظة على الاعتماد (اختيارية)</label>
                  <input
                    id="hrla-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="تضاف إلى ملاحظات الإجازة"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="hr-modal__f">
          {mode === 'reject' ? (
            <>
              <button type="button" className="hr-btn" onClick={() => setMode('idle')} disabled={busy}>
                رجوع
              </button>
              <button
                type="button"
                className="hr-btn hrla-btn--reject"
                onClick={() => void runReject()}
                disabled={!canReject}
              >
                {reject.isPending ? 'جارٍ الرفض…' : 'تأكيد الرفض'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="hr-btn" onClick={onClose} disabled={busy}>
                إغلاق
              </button>
              {data?.is_pending === true && (
                <>
                  <button
                    type="button"
                    className="hr-btn"
                    onClick={() => setMode('reject')}
                    disabled={busy}
                  >
                    رفض
                  </button>
                  <button
                    type="button"
                    className="hr-btn hr-btn--primary"
                    onClick={() => void runApprove()}
                    disabled={!canApprove}
                  >
                    {approve.isPending
                      ? 'جارٍ الاعتماد…'
                      : impact?.charges_ledger === true
                        ? `موافقة وخصم ${fmtDays(impact.days)} يوم`
                        : 'موافقة'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
