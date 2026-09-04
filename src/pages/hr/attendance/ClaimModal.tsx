import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { X } from 'lucide-react';

import { CLAIM_KIND_HINTS, CLAIM_KIND_LABELS } from '../../../types/hr';
import type { ClaimKind } from '../../../types/hr';
import { useCreateMyClaim } from './useAttendanceQueue';
import { errorText, makeClientKey, todayISO } from './attendanceFormat';

/**
 * **«هذا غير صحيح»** — الطريقُ الوحيد الذي يملكه الموظفُ لتصحيح يومه.
 *
 * إغلاقُه يترك مكالمةً مع المدير سبيلاً وحيداً، وهذا بعينه ما يُعلِّم الفريقَ أن النظام
 * ضدَّهم. وكيانٌ **واحد** لكلّ «ادّعاءٍ عن الواقع يحتاج اعتماداً» بدل ثلاثة: مسارٌ واحد
 * وشاشةٌ واحدة وصلاحيةٌ واحدة.
 *
 * `idempotency_key` يُولَّد **مرّةً واحدةً لكلّ فتحةِ مودال** ويبقى كما هو عند الفشل — فإعادةُ
 * المحاولة تُرجع الصفَّ القائم بـ٢٠٠ ولا تُنشئ صفّاً ثانياً.
 *
 * 🚫 **ولا كلمةَ «غياب» هنا**: هذا ادّعاءٌ عن عملٍ وقع، لا اعترافٌ ولا اتهام.
 */

interface Props {
  /** اليومُ محلُّ التصحيح — يُملأ طرفا المدى منه. */
  defaultDate?: string;
  defaultKind?: ClaimKind;
  onClose: () => void;
  onDone: () => void;
}

/** حدُّ السبب في الخادم (`AttendanceClaimService::MIN_REASON`). */
const MIN_REASON = 5;

const KINDS: ClaimKind[] = ['field_work', 'remote', 'mission', 'training', 'missing_punch'];

export const ClaimModal: React.FC<Props> = ({ defaultDate, defaultKind, onClose, onDone }) => {
  const today = todayISO();
  const [kind, setKind] = useState<ClaimKind>(defaultKind ?? 'field_work');
  const [start, setStart] = useState(defaultDate ?? today);
  const [end, setEnd] = useState(defaultDate ?? today);
  const [inAt, setInAt] = useState('');
  const [outAt, setOutAt] = useState('');
  const [reason, setReason] = useState('');

  // مفتاحٌ واحدٌ لكلّ فتحةِ مودال — لا يُجدَّد عند إعادة المحاولة (وإلّا صفٌّ ثانٍ).
  const idempotencyKey = useMemo(() => makeClientKey(), []);

  const create = useCreateMyClaim();
  const isMissingPunch = kind === 'missing_punch';

  const submit = async () => {
    const clean = reason.trim();

    if (clean.length < MIN_REASON) {
      toast.error(`اكتب سببا لا يقل عن ${MIN_REASON} أحرف.`);
      return;
    }

    if (end < start) {
      toast.error('تاريخ النهاية قبل البداية. اضبط المدى.');
      return;
    }

    if (isMissingPunch && inAt === '' && outAt === '') {
      toast.error('اكتب وقت الدخول أو الخروج الذي نسيت تسجيله.');
      return;
    }

    try {
      await create.mutateAsync({
        claim_type: kind,
        start_date: start,
        end_date: end,
        proposed_in_at: isMissingPunch && inAt !== '' ? `${start} ${inAt}:00` : null,
        proposed_out_at: isMissingPunch && outAt !== '' ? `${start} ${outAt}:00` : null,
        reason: clean,
        idempotency_key: idempotencyKey,
      });

      toast.success('تم إرسال طلبك. سيظهر لمدير المكتب للاعتماد.');
      onDone();
      onClose();
    } catch (e) {
      toast.error(errorText(e, 'فشل في إرسال الطلب'));
    }
  };

  return (
    <div className="hr-modal-overlay" onClick={onClose}>
      <div className="hr-modal hra-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hr-modal__h">
          <h3>هذا اليوم غير صحيح</h3>
          <button type="button" className="hr-icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="hr-modal__b">
          <div className="hr-field">
            <label id="hra-kind-l">ما الذي حدث فعلا؟ *</label>
            <div className="hra-kinds" role="group" aria-labelledby="hra-kind-l">
              {KINDS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="hra-kind"
                  aria-pressed={kind === item}
                  onClick={() => setKind(item)}
                >
                  <span className="hra-kind__n">{CLAIM_KIND_LABELS[item]}</span>
                  <span className="hra-kind__h">{CLAIM_KIND_HINTS[item]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="hr-field hr-field--row">
            <div className="hr-field">
              <label htmlFor="hra-claim-start">من *</label>
              <input
                id="hra-claim-start"
                type="date"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  if (end < e.target.value) setEnd(e.target.value);
                }}
              />
            </div>
            <div className="hr-field">
              <label htmlFor="hra-claim-end">إلى *</label>
              <input
                id="hra-claim-end"
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          {isMissingPunch && (
            <div className="hr-field hr-field--row">
              <div className="hr-field">
                <label htmlFor="hra-claim-in">وقت الدخول</label>
                <input
                  id="hra-claim-in"
                  type="time"
                  value={inAt}
                  onChange={(e) => setInAt(e.target.value)}
                />
              </div>
              <div className="hr-field">
                <label htmlFor="hra-claim-out">وقت الخروج</label>
                <input
                  id="hra-claim-out"
                  type="time"
                  value={outAt}
                  onChange={(e) => setOutAt(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="hr-field">
            <label htmlFor="hra-claim-reason">ما التفصيل؟ *</label>
            <textarea
              id="hra-claim-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: كنت في محكمة التنفيذ بالرياض من الصباح"
            />
            <span className="hra-count" dir="ltr">
              {reason.trim().length} / {MIN_REASON}
            </span>
          </div>

          <p className="hra-hint">
            الطلب يذهب لمدير المكتب. ونافذة التصحيح محدودة بأيام قليلة من تاريخ اليوم،
            وما تجاوزها لا يقبل من هنا — راجع مدير المكتب ليسجله عنك.
          </p>
        </div>

        <div className="hr-modal__f">
          <button type="button" className="hr-btn" onClick={onClose}>إلغاء</button>
          <button
            type="button"
            className="hr-btn hr-btn--primary"
            onClick={() => { void submit(); }}
            disabled={create.isPending}
          >
            {create.isPending ? 'جارٍ الإرسال…' : 'أرسل الطلب'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClaimModal;
