// === مودال إشعار دائن/مدين ===
// reason 3–500 حرفاً، معالجة 422 من الباك (مثلاً فاتورة غير معتمدة).
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, FileMinus, FilePlus, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { zatcaService } from '../../services/zatcaService';
import { ZATCA_STATUS_QUERY_KEY } from '../../hooks/useZatcaStatus';

interface Props {
  invoiceId: number;
  invoiceNumber?: string;
  kind: 'credit' | 'debit';
  onClose: () => void;
  onSuccess?: () => void;
}

const ZatcaNoteModal: React.FC<Props> = ({ invoiceId, invoiceNumber, kind, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isCredit = kind === 'credit';
  const title = isCredit ? 'إشعار دائن' : 'إشعار مدين';
  const reasonLen = reason.trim().length;
  const localError = reasonLen === 0 ? 'السبب مطلوب' : reasonLen < 3 ? 'السبب 3 أحرف على الأقل' : reasonLen > 500 ? 'السبب 500 حرف كحدّ أقصى' : null;

  const mutation = useMutation({
    mutationFn: () =>
      isCredit ? zatcaService.issueCreditNote(invoiceId, reason.trim()) : zatcaService.issueDebitNote(invoiceId, reason.trim()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`تم إنشاء ${title} وإرساله`);
        queryClient.invalidateQueries({ queryKey: ['zatca-invoices'] });
        queryClient.invalidateQueries({ queryKey: ['invoice', String(invoiceId)] });
        queryClient.invalidateQueries({ queryKey: ZATCA_STATUS_QUERY_KEY });
        onSuccess?.();
        onClose();
      } else {
        setServerError(res.message || `تعذّر إنشاء ${title}`);
      }
    },
    onError: (err: unknown) => {
      setServerError(err instanceof Error ? err.message : `تعذّر إنشاء ${title}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (localError) return;
    setServerError(null);
    mutation.mutate();
  };

  return (
    <div className="zatca-modal-overlay" onClick={onClose}>
      <div className="zatca-modal" onClick={(e) => e.stopPropagation()}>
        <div className="zatca-modal__head">
          <span className="zatca-modal__head-icon">{isCredit ? <FileMinus size={17} /> : <FilePlus size={17} />}</span>
          <h3 className="zatca-modal__title">{title}{invoiceNumber ? ` — ${invoiceNumber}` : ''}</h3>
          <button className="zatca-modal__close" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </div>
        <form className="zatca-modal__body" onSubmit={handleSubmit} noValidate>
          <p className="zatca-card__desc" style={{ margin: 0 }}>
            {isCredit
              ? 'يُصدر إشعاراً دائناً مرتبطاً بالفاتورة الأصلية (خصم/إلغاء جزئي أو كلي).'
              : 'يُصدر إشعاراً مديناً مرتبطاً بالفاتورة الأصلية (زيادة في المبلغ).'}
          </p>

          {serverError ? <div className="zatca-form-error"><AlertCircle size={16} />{serverError}</div> : null}

          <div className="zatca-field zatca-field--full">
            <label htmlFor="zatca-note-reason">سبب الإشعار <span className="req">*</span></label>
            <textarea
              id="zatca-note-reason"
              rows={4}
              value={reason}
              onChange={(e) => { setReason(e.target.value); if (serverError) setServerError(null); }}
              onBlur={() => setTouched(true)}
              className={touched && localError ? 'is-invalid' : undefined}
              placeholder="اكتب سبب إصدار الإشعار…"
              maxLength={600}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {touched && localError ? <span className="zatca-field__err">{localError}</span> : <span className="zatca-field__hint">من 3 إلى 500 حرف</span>}
              <span className="zatca-field__hint">{reasonLen}/500</span>
            </div>
          </div>

          <div className="zatca-wizard__actions" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
            <button type="button" className="zatca-btn zatca-btn--ghost" onClick={onClose}>إلغاء</button>
            <button type="submit" className={`zatca-btn ${isCredit ? 'zatca-btn--danger' : 'zatca-btn--primary'}`} disabled={mutation.isPending}>
              {mutation.isPending ? <><Loader2 size={15} className="zatca-spin" /> جارٍ الإرسال…</> : <>إصدار {title}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ZatcaNoteModal;
