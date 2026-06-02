// === زر إرسال سريع إلى ZATCA (دمج خفيف في قائمة الفواتير) ===
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { zatcaService } from '../../services/zatcaService';
import { ZATCA_STATUS_QUERY_KEY } from '../../hooks/useZatcaStatus';

interface Props {
  invoiceId: number;
  invoiceNumber?: string;
  compact?: boolean;
}

const ZatcaQuickSubmitButton: React.FC<Props> = ({ invoiceId, compact = true }) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => zatcaService.submitInvoice(invoiceId),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('تم إرسال الفاتورة إلى ZATCA');
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['zatca-invoices'] });
        queryClient.invalidateQueries({ queryKey: ['invoice', String(invoiceId)] });
      } else {
        toast.error(res.message || 'تعذّر الإرسال');
      }
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'تعذّر الإرسال');
      queryClient.invalidateQueries({ queryKey: ZATCA_STATUS_QUERY_KEY });
    },
  });

  if (compact) {
    return (
      <button
        className="zatca-icon-btn"
        onClick={(e) => { e.stopPropagation(); mutation.mutate(); }}
        disabled={mutation.isPending}
        title="إرسال إلى ZATCA"
      >
        {mutation.isPending ? <Loader2 size={15} className="zatca-spin" /> : <Send size={15} />}
      </button>
    );
  }

  return (
    <button
      className="zatca-btn zatca-btn--primary"
      onClick={(e) => { e.stopPropagation(); mutation.mutate(); }}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? <><Loader2 size={15} className="zatca-spin" /> جارٍ الإرسال…</> : <><Send size={15} /> إرسال إلى ZATCA</>}
    </button>
  );
};

export default ZatcaQuickSubmitButton;
