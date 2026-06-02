// === مودال نتائج فحوص الامتثال الست ===
// يشغّل POST /zatca/onboard/test-invoices ويعرض النتائج. (لا يوجد endpoint لجلب نتائج مخزّنة —
// النتائج تُولَّد عند التشغيل؛ محلياً قد تكون فارغة لأن عيّنات الباك تتطلب sandbox.)
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, CheckCircle2, XCircle, MinusCircle, Loader2, ClipboardCheck } from 'lucide-react';
import { zatcaService } from '../../services/zatcaService';
import type { ZatcaComplianceKey } from '../../types/zatca';

interface Props {
  onClose: () => void;
}

const CHECKS: { key: ZatcaComplianceKey; label: string }[] = [
  { key: 'standard_invoice', label: 'فاتورة قياسية' },
  { key: 'standard_credit', label: 'إشعار دائن قياسي' },
  { key: 'standard_debit', label: 'إشعار مدين قياسي' },
  { key: 'simplified_invoice', label: 'فاتورة مبسّطة' },
  { key: 'simplified_credit', label: 'إشعار دائن مبسّط' },
  { key: 'simplified_debit', label: 'إشعار مدين مبسّط' },
];

const ZatcaComplianceResultsModal: React.FC<Props> = ({ onClose }) => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['zatca', 'compliance-run'],
    queryFn: async () => {
      const res = await zatcaService.submitComplianceInvoices();
      return res.data ?? {};
    },
    staleTime: 0,
    gcTime: 0,
    retry: 0,
  });

  return (
    <div className="zatca-modal-overlay" onClick={onClose}>
      <div className="zatca-modal zatca-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="zatca-modal__head">
          <span className="zatca-modal__head-icon"><ClipboardCheck size={17} /></span>
          <h3 className="zatca-modal__title">نتائج فحوص الامتثال</h3>
          <button className="zatca-modal__close" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </div>
        <div className="zatca-modal__body">
          {isLoading ? (
            <div className="zatca-list-loading"><Loader2 size={20} className="zatca-spin" /> جارٍ تشغيل الفحوص…</div>
          ) : isError ? (
            <div className="zatca-form-error">{error instanceof Error ? error.message : 'تعذّر تشغيل الفحوص'}</div>
          ) : (
            <>
              <table className="zatca-compliance-table">
                <thead>
                  <tr><th>نوع المستند</th><th>النتيجة</th><th>HTTP</th><th>ملاحظات</th></tr>
                </thead>
                <tbody>
                  {CHECKS.map(({ key, label }) => {
                    const r = data?.[key];
                    return (
                      <tr key={key}>
                        <td>{label}</td>
                        <td>
                          {r === undefined ? (
                            <span className="zatca-check zatca-check--pending"><MinusCircle size={15} /> لم تُنفّذ</span>
                          ) : r.passed ? (
                            <span className="zatca-check zatca-check--pass"><CheckCircle2 size={15} /> ناجحة</span>
                          ) : (
                            <span className="zatca-check zatca-check--fail"><XCircle size={15} /> فاشلة</span>
                          )}
                        </td>
                        <td dir="ltr" style={{ textAlign: 'center' }}>{r?.http ?? '—'}</td>
                        <td>{r?.errors?.length ? r.errors.join('، ') : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {Object.keys(data ?? {}).length === 0 ? (
                <div className="zatca-compliance-empty">
                  لم تُرجِع بيئة الفحص أي نتائج — التشغيل الفعلي يتطلب بيئة sandbox مهيّأة لدى الهيئة.
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZatcaComplianceResultsModal;
