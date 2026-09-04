import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { AlertTriangle, Info, Lock, ShieldAlert, X } from 'lucide-react';
import { hrLeaveService } from '../../../services/hrLeaveService';
import { usePermission } from '../../../hooks/usePermission';
import { LEAVE_STATUS_LABELS } from '../../../types/hr';
import type { HrLeave, LeavePreviewPayload } from '../../../types/hr';
import {
  EMPTY_MARK,
  errorText,
  fmtDays,
  fmtDaysWord,
  fmtLeaveRange,
  leaveTypeName,
  makeClientKey,
  orderedFlags,
  toNum,
} from './leaveFormat';
import { useLeavePreview } from './useLeavePreview';
import { useLeaveDialog } from './useLeaveDialog';

/**
 * مودالٌ واحدٌ لأفعال التصحيح الأربعة — بنيةٌ واحدةٌ وحقولٌ تتبدّل، فلا تتفرّق أربعُ
 * شاشاتٍ على فعلٍ واحدٍ في جوهره: **تصحيحُ سجلٍّ بسببٍ مكتوب**.
 *
 * السببُ إلزاميٌّ في الإلغاء والتقصير والرفض — وهو ما يجعل السجلَّ قابلاً للتصديق أمام
 * نزاعٍ عمّاليّ بعد سنة. ولذلك **لا `window.confirm`** ولا حذفٌ متفائلٌ بـtoast «تراجع»:
 * الباكُ بلا `DELETE` وبلا حذفٍ ناعم، والتصميمُ المتفائلُ هنا كان سيَعِد بفعلٍ لا وجودَ له.
 *
 * **حارسُ الحالة النهائية** (C-04 وC-42) يُفحَص هنا قبل النداء: `rejected`/`cancelled`/
 * `superseded` أحوالٌ نهائيةٌ يردّها الخادمُ بـ422 `terminal_status`. عرضُ السبب قبل
 * المحاولة أصدقُ من زرٍّ يُنقَر ثمّ يُردّ.
 *
 * وأثرُ كلّ فعلٍ على الرصيد **مسمّىً بدقّةٍ لا مُلمَّحٌ إليه**: التقصيرُ إخلافٌ لا تعديلٌ
 * في المكان، فيُعكس قيدُ الأصل كاملاً ثمّ يُخصم الجديد، ويبقى الأصلُ ظاهراً «مُخلَفاً».
 */

export type CorrectionAction = 'cancel' | 'shorten' | 'reject' | 'recompute';

interface Props {
  action: CorrectionAction;
  employeeId: number;
  leave: HrLeave;
  employeeName?: string | null;
  /** رصيدُ النوع قبل الفعل — حين يصل يُرسم السهمُ، وحين يغيب لا يُخترع رقم. */
  balanceBefore?: number | null;
  canManage?: boolean;
  onClose: () => void;
  onDone?: () => void;
}

/** عنوانُ الحوار واسمُ فعله — خريطةٌ واحدةٌ فلا يفترق نصّان لفعلٍ واحد. */
const ACTION_LABELS: Record<CorrectionAction, { title: string; confirm: string }> = {
  cancel: { title: 'إلغاء الإجازة', confirm: 'تأكيد الإلغاء' },
  shorten: { title: 'تقصير المدة (عودة مبكرة)', confirm: 'حفظ التقصير' },
  reject: { title: 'رفض الطلب', confirm: 'تأكيد الرفض' },
  recompute: { title: 'إعادة الاحتساب', confirm: 'احتسب الآن' },
};

const TERMINAL: HrLeave['status'][] = ['rejected', 'cancelled', 'superseded'];

export const LeaveCorrectionModal: React.FC<Props> = ({
  action,
  employeeId,
  leave,
  employeeName,
  balanceBefore = null,
  canManage,
  onClose,
  onDone,
}) => {
  const queryClient = useQueryClient();
  const fallbackManage = usePermission('hr.leave.manage');
  const mayManage = canManage ?? fallbackManage;

  const [clientKey] = useState<string>(() => makeClientKey());
  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [newEnd, setNewEnd] = useState('');

  const isTerminal = TERMINAL.includes(leave.status);
  const charged = leave.charged_days;

  // معاينةٌ حيّةٌ للمدى المقصَّر — تستثني الصفَّ نفسَه فلا يُحسب تداخلاً مع ذاته.
  const previewInput = useMemo<LeavePreviewPayload | null>(() => {
    if (action !== 'shorten' || newEnd === '') return null;

    return {
      employee_profile_id: leave.employee_profile_id,
      leave_type_id: leave.leave_type_id,
      start_date: leave.start_date,
      end_date: newEnd,
      exclude_leave_id: leave.id,
    };
  }, [action, newEnd, leave]);

  const preview = useLeavePreview(previewInput);
  const flags = orderedFlags(preview.blockers, preview.warnings);

  const mutation = useMutation({
    mutationFn: async () => {
      if (action === 'cancel') {
        return hrLeaveService.cancel(employeeId, leave.id, reason.trim(), effectiveDate || undefined);
      }
      if (action === 'reject') {
        return hrLeaveService.reject(employeeId, leave.id, reason.trim());
      }
      if (action === 'shorten') {
        return hrLeaveService.shorten(employeeId, leave.id, {
          end_date: newEnd,
          reason: reason.trim(),
          client_key: clientKey,
        });
      }
      return hrLeaveService.recompute(employeeId, leave.id, { reason: reason.trim() || undefined });
    },
  });

  const submit = () => {
    if (!mayManage) {
      toast.error('تصحيح السجلات يحتاج صلاحية «إدارة الإجازات».');
      return;
    }
    if (isTerminal) return;

    if (action !== 'recompute' && reason.trim() === '') {
      toast.error(action === 'reject' ? 'يجب ذكر سبب الرفض.' : 'السبب مطلوب.');
      return;
    }

    if (action === 'shorten') {
      if (newEnd === '') {
        toast.error('اختر تاريخ النهاية الجديد.');
        return;
      }
      if (newEnd < leave.start_date) {
        toast.error('تاريخ النهاية الجديد لا يسبق تاريخ البداية.');
        return;
      }
      if (newEnd >= leave.end_date) {
        toast.error('التقصير يتطلب نهاية أقصر من الحالية.');
        return;
      }
    }

    mutation.mutate(undefined, {
      onSuccess: (data) => {
        void queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] });
        void queryClient.invalidateQueries({ queryKey: ['hr', 'employee'] });

        if (action === 'cancel' && 'days_restored' in data) {
          const balance = data.balance;
          const arrow =
            balance.before !== null && balance.after !== null
              ? ` · الرصيد ${fmtDays(balance.before)} ← ${fmtDays(balance.after)}`
              : '';
          toast.success(`تم إلغاء الإجازة وإعادة ${fmtDaysWord(data.days_restored)}${arrow}`);
        } else if (action === 'shorten' && 'superseded_id' in data) {
          toast.success(`تم تقصير المدة. تم استبدال السجل #${data.superseded_id} بسجل جديد.`);
        } else if (action === 'recompute' && 'delta_days' in data) {
          if (toNum(data.delta_days) === 0) {
            toast.info('لا فارق في الاحتساب. لم يتم تسجيل أي قيد في السجل.');
          } else {
            toast.success(`تمت إعادة الاحتساب. الفارق ${fmtDays(data.delta_days)} يوم.`);
          }
        } else {
          toast.success('تم رفض الطلب.');
        }

        if (onDone) onDone();
        onClose();
      },
      onError: (error) => {
        toast.error(errorText(error, 'تعذر تنفيذ التصحيح'));
      },
    });
  };

  const { ref, titleId, onKeyDown } = useLeaveDialog<HTMLDivElement>({
    onClose,
    onSubmit: submit,
    busy: mutation.isPending,
  });

  return (
    <div className="hr-modal-overlay hrl-modal-overlay" onMouseDown={onClose}>
      <div
        className="hr-modal hrl-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={ref}
        onKeyDown={onKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="hr-modal__h">
          <h3 id={titleId}>{ACTION_LABELS[action].title}</h3>
          <button type="button" className="hr-icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="hr-modal__b">
          <section className="hrl-fset">
            <h4 className="hrl-fset__t">الإجازة المسجلة</h4>
            <dl className="hrl-kv">
              <dt>الموظف</dt>
              <dd>{employeeName || leave.employee_profile?.user?.name || EMPTY_MARK}</dd>
              <dt>النوع</dt>
              <dd>{leaveTypeName(leave)}</dd>
              <dt>المدى</dt>
              <dd>{fmtLeaveRange(leave.start_date, leave.end_date)}</dd>
              <dt>المدة</dt>
              <dd dir="ltr">{fmtDays(leave.duration_days)}</dd>
              <dt>الحالة</dt>
              <dd>{LEAVE_STATUS_LABELS[leave.status] ?? leave.status}</dd>
              <dt>المخصوم فعلياً</dt>
              <dd className={charged === undefined ? 'is-empty' : undefined} dir="ltr">
                {charged === undefined ? EMPTY_MARK : fmtDays(charged)}
              </dd>
            </dl>
          </section>

          {!mayManage ? (
            <div className="hrl-state hrl-state--locked">
              <Lock size={22} />
              <p className="hrl-state__t">التصحيح محمي</p>
              <p className="hrl-state__d">
                إلغاء الإجازات وتقصيرها ورفضها تحتاج صلاحية «إدارة الإجازات» (hr.leave.manage).
              </p>
            </div>
          ) : isTerminal ? (
            <div className="hrl-flag hrl-flag--block">
              <ShieldAlert size={13} />
              <span>
                <span className="hrl-flag__t">
                  هذه الإجازة في حالة نهائية ({LEAVE_STATUS_LABELS[leave.status] ?? leave.status}) ولا يمكن تصحيحها.
                </span>
                <span className="hrl-flag__hint">
                  التصحيح بعد الحالة النهائية يكون بتسجيل إجازة جديدة.
                </span>
              </span>
            </div>
          ) : (
            <>
              {/* أثرُ الفعل — مسمّىً بدقّةٍ قبل الحفظ لا بعده */}
              <div className={`hrl-flag hrl-flag--${action === 'recompute' ? 'info' : 'warn'}`}>
                {action === 'recompute' ? <Info size={13} /> : <AlertTriangle size={13} />}
                <span>
                  {action === 'cancel' && (
                    <>
                      <span className="hrl-flag__t">
                        يتم عكس قيد الخصم كاملاً
                        {charged === undefined ? '' : ` ويعود ${fmtDaysWord(charged)} إلى الرصيد`}
                        {balanceBefore !== null && charged !== undefined
                          ? ` (${fmtDays(balanceBefore)} ← ${fmtDays(balanceBefore + toNum(charged))})`
                          : ''}
                        .
                      </span>
                      <span className="hrl-flag__hint">
                        يبقى السجل ظاهراً بحالة «ملغاة» مع سببه.
                      </span>
                    </>
                  )}
                  {action === 'shorten' && (
                    <>
                      <span className="hrl-flag__t">
                        يتم استبدال السجل الحالي بسجل جديد، ويتم عكس قيده كاملاً ثم خصم الجديد.
                      </span>
                      <span className="hrl-flag__hint">
                        يبقى الأصل ظاهراً بحالة «مستبدَلة».
                      </span>
                    </>
                  )}
                  {action === 'reject' && (
                    <>
                      <span className="hrl-flag__t">الرفض تغيير حالة فقط، ولا يتم تسجيل قيد لطلب معلق.</span>
                      <span className="hrl-flag__hint">السبب إلزامي ويظهر للموظف في سجله.</span>
                    </>
                  )}
                  {action === 'recompute' && (
                    <>
                      <span className="hrl-flag__t">
                        تتم مقارنة الاحتساب الحالي بالقيمة المحفوظة يوم الاعتماد، ثم يتم تسجيل الفارق كقيد تسوية.
                      </span>
                      <span className="hrl-flag__hint">إذا كان الفارق صفراً فلن يتم تسجيل أي قيد.</span>
                    </>
                  )}
                </span>
              </div>

              {action === 'shorten' && (
                <section className="hrl-fset">
                  <h4 className="hrl-fset__t">النهاية الجديدة</h4>
                  <div className="hr-field">
                    <label htmlFor="hrl-newend">تاريخ النهاية الجديد *</label>
                    <input
                      id="hrl-newend"
                      type="date"
                      min={leave.start_date}
                      max={leave.end_date}
                      value={newEnd}
                      onChange={(event) => setNewEnd(event.target.value)}
                    />
                    <span className="hrl-hint">أقصر من النهاية الحالية وليس قبل البداية.</span>
                  </div>

                  {preview.data && (
                    <p className={`hrl-impact${preview.isStale ? ' hrl-impact--pending' : ''}`}>
                      <span className="hrl-impact__c">
                        <span className="hrl-impact__k">المدة الجديدة</span>
                        <span className="hrl-impact__v" dir="ltr">{fmtDays(preview.data.duration.duration_days)}</span>
                      </span>
                      <span className="hrl-impact__c">
                        <span className="hrl-impact__k">الرصيد بعد الاستبدال</span>
                        <span className="hrl-impact__v" dir="ltr">
                          {preview.data.balance.before === null || preview.data.balance.after === null
                            ? EMPTY_MARK
                            : `${fmtDays(preview.data.balance.before)} ← ${fmtDays(preview.data.balance.after)}`}
                        </span>
                      </span>
                    </p>
                  )}

                  {preview.notice && <p className="hrl-hint">{preview.notice}</p>}

                  {flags.map((flag, index) => (
                    <p key={`${flag.code}-${index}`} className={`hrl-flag hrl-flag--${flag.tone}`}>
                      {flag.tone === 'block' ? <ShieldAlert size={13} /> : <Info size={13} />}
                      <span>
                        <span className="hrl-flag__t">{flag.message}</span>
                        {flag.hint && <span className="hrl-flag__hint">{flag.hint}</span>}
                      </span>
                    </p>
                  ))}
                </section>
              )}

              <section className="hrl-fset">
                <h4 className="hrl-fset__t">السبب</h4>
                <div className="hr-field">
                  <label htmlFor="hrl-corr-reason">
                    {action === 'reject' ? 'سبب الرفض *' : action === 'recompute' ? 'سبب إعادة الاحتساب' : 'السبب *'}
                  </label>
                  <textarea
                    id="hrl-corr-reason"
                    rows={3}
                    maxLength={500}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </div>

                {action === 'cancel' && (
                  <div className="hr-field">
                    <label htmlFor="hrl-corr-eff">تاريخ سريان الإلغاء (اختياري)</label>
                    <input
                      id="hrl-corr-eff"
                      type="date"
                      value={effectiveDate}
                      onChange={(event) => setEffectiveDate(event.target.value)}
                    />
                    <span className="hrl-hint">اتركه فارغاً حتى يتم تسجيل القيد العكسي بتاريخ اليوم.</span>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <div className="hr-modal__f">
          <button type="button" className="hr-btn" onClick={onClose}>إغلاق</button>
          {mayManage && !isTerminal && (
            <button
              type="button"
              className="hr-btn hr-btn--primary"
              onClick={submit}
              disabled={mutation.isPending || (action === 'shorten' && preview.blockers.length > 0)}
            >
              {mutation.isPending ? 'جارٍ الحفظ…' : ACTION_LABELS[action].confirm}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveCorrectionModal;
