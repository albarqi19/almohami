import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { X } from 'lucide-react';

import { hrAttendanceService } from '../../../services/hrAttendanceService';
import { ATT_KEYS } from './useAttendanceQueue';
import { errorText } from './attendanceFormat';

/**
 * **نقضُ قرار** — إلحاقُ صفٍّ يشير إلى سابقه، **لا تعديلَ ولا حذف**.
 *
 * شهادةُ إنسانٍ لا تُمحى: التصحيحُ قرارٌ ثانٍ يقول «هذا لم يعد صحيحاً ولهذا السبب»، ويبقى
 * الأوّلُ مقروءاً بفاعله وتاريخه. و`unique(tenant_id, supersedes_resolution_id)` يجعل «لا
 * يُنقض مرّتين» ثابتاً في القاعدة لا شرطاً في الشيفرة.
 */

interface Props {
  resolutionId: number;
  onClose: () => void;
  onDone: () => void;
}

const MIN_REASON = 10;

export const VoidResolutionModal: React.FC<Props> = ({ resolutionId, onClose, onDone }) => {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');

  const voidIt = useMutation({
    mutationFn: (value: string) => hrAttendanceService.voidResolution(resolutionId, value),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATT_KEYS.all });
    },
  });

  const submit = async () => {
    const clean = reason.trim();

    if (clean.length < MIN_REASON) {
      toast.error(`اكتب سبب الإلغاء بما لا يقل عن ${MIN_REASON} أحرف.`);
      return;
    }

    try {
      await voidIt.mutateAsync(clean);
      toast.success('تم إلغاء القرار، ويبقى القرار السابق ظاهرا في السجل');
      onDone();
      onClose();
    } catch (e) {
      toast.error(errorText(e, 'تعذر إلغاء القرار'));
    }
  };

  return (
    <div className="hr-modal-overlay" onClick={onClose}>
      <div className="hr-modal hra-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hr-modal__h">
          <h3>إلغاء قرار</h3>
          <button type="button" className="hr-icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="hr-modal__b">
          <p className="hra-hint">
            يبقى القرار السابق ظاهرا في السجل باسم من اتخذه وتاريخه، ويضاف إليه قرار إلغاء
            يوضح السبب. وبعد الإلغاء يعود اليوم إلى قائمة القرارات المعلقة إن بقي ملتبسا.
          </p>

          <div className="hr-field">
            <label htmlFor="hra-void-reason">سبب الإلغاء *</label>
            <textarea
              id="hra-void-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: تبين أن اليوم كان إجازة معتمَدة في النظام السابق"
            />
            <span className="hra-count" dir="ltr">{reason.trim().length} / {MIN_REASON}</span>
          </div>
        </div>

        <div className="hr-modal__f">
          <button type="button" className="hr-btn" onClick={onClose}>إغلاق</button>
          <button
            type="button"
            className="hr-btn hr-btn--primary"
            onClick={() => { void submit(); }}
            disabled={voidIt.isPending}
          >
            {voidIt.isPending ? 'جارٍ الحفظ…' : 'تأكيد إلغاء القرار'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoidResolutionModal;
