// === الخطوة 3: التفعيل النهائي → POST /zatca/onboard/finalize ثم invalidate الحالة ===
// نجاح finalize يضبط zatca_enabled=true في الباك؛ إبطال ['zatca','status'] يقلب UI إلى اللوحة فوراً (بلا reload).
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, ArrowRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { zatcaService } from '../../../services/zatcaService';
import { ZATCA_STATUS_QUERY_KEY } from '../../../hooks/useZatcaStatus';

interface Props {
  onBack: () => void;
}

const StepFinalize: React.FC<Props> = ({ onBack }) => {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => zatcaService.finalizeProduction(),
    onSuccess: (res) => {
      if (res.success) {
        setDone(true);
        toast.success('تم تفعيل الفوترة الإلكترونية — الفواتير الجديدة ستُرسَل تلقائياً');
        // يقلب enabled→true ويُحوّل ZatcaCenter إلى اللوحة
        queryClient.invalidateQueries({ queryKey: ZATCA_STATUS_QUERY_KEY });
      } else {
        setServerError(res.message || 'تعذّر إتمام التفعيل');
      }
    },
    onError: (err: unknown) => {
      setServerError(err instanceof Error ? err.message : 'تعذّر إتمام التفعيل');
    },
  });

  return (
    <div className="zatca-form">
      <h3 className="zatca-wizard__step-title">التفعيل النهائي</h3>
      <p className="zatca-wizard__step-desc">
        بعد اجتياز الفحوص، أتمّ التفعيل لطلب شهادة الإنتاج. عند النجاح ستُفعَّل الفوترة الإلكترونية لمنشأتك وتُرسَل
        الفواتير الجديدة تلقائياً.
      </p>

      {serverError ? (
        <div className="zatca-form-error"><AlertTriangle size={16} />{serverError}</div>
      ) : null}

      {done ? (
        <div className="zatca-form-success"><CheckCircle2 size={16} /> تم التفعيل بنجاح — جارٍ تحويلك إلى لوحة الفوترة الإلكترونية…</div>
      ) : (
        <div className="zatca-empty-card" style={{ margin: '8px 0', maxWidth: 'none', padding: '28px 24px' }}>
          <div className="zatca-empty-card__icon zatca-empty-card__icon--info"><ShieldCheck size={28} /></div>
          <p className="zatca-empty-card__text" style={{ marginBottom: 18 }}>
            أنت على وشك تفعيل الفوترة الإلكترونية لمنشأتك. تأكّد من نجاح فحوص الامتثال في الخطوة السابقة.
          </p>
          <button
            type="button"
            className="zatca-btn zatca-btn--success"
            onClick={() => { setServerError(null); mutation.mutate(); }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <><Loader2 size={15} className="zatca-spin" /> جارٍ التفعيل…</> : <><ShieldCheck size={16} /> تفعيل الآن</>}
          </button>
        </div>
      )}

      <div className="zatca-wizard__actions">
        <button type="button" className="zatca-btn zatca-btn--ghost" onClick={onBack} disabled={mutation.isPending || done}>
          <ArrowRight size={15} /> السابق
        </button>
        <span />
      </div>
    </div>
  );
};

export default StepFinalize;
