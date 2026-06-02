// === الخطوة 2: تشغيل وعرض فحوص الامتثال الست → POST /zatca/onboard/test-invoices ===
// ملاحظة: complianceSamples في الباك يُرجع [] محلياً (يتطلب sandbox فعلياً) → النتائج قد تكون فارغة.
// نعرض الصفوف الست دائماً، والحالة "لم تُنفّذ" عند غياب المفتاح.
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, XCircle, MinusCircle, Loader2, ArrowLeft, ArrowRight, PlayCircle, AlertTriangle } from 'lucide-react';
import { zatcaService } from '../../../services/zatcaService';
import type { ZatcaComplianceResults, ZatcaComplianceKey } from '../../../types/zatca';

interface Props {
  onSuccess: () => void;
  onBack: () => void;
}

const CHECKS: { key: ZatcaComplianceKey; label: string }[] = [
  { key: 'standard_invoice', label: 'فاتورة قياسية' },
  { key: 'standard_credit', label: 'إشعار دائن قياسي' },
  { key: 'standard_debit', label: 'إشعار مدين قياسي' },
  { key: 'simplified_invoice', label: 'فاتورة مبسّطة' },
  { key: 'simplified_credit', label: 'إشعار دائن مبسّط' },
  { key: 'simplified_debit', label: 'إشعار مدين مبسّط' },
];

const StepComplianceChecks: React.FC<Props> = ({ onSuccess, onBack }) => {
  const [results, setResults] = useState<ZatcaComplianceResults | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => zatcaService.submitComplianceInvoices(),
    onSuccess: (res) => {
      if (res.success) {
        setResults(res.data ?? {});
      } else {
        setServerError(res.message || 'تعذّر تشغيل الفحوص');
      }
    },
    onError: (err: unknown) => {
      setServerError(err instanceof Error ? err.message : 'تعذّر تشغيل الفحوص');
    },
  });

  const hasRun = results !== null;
  const resultEntries = CHECKS.map((c) => ({ ...c, result: results?.[c.key] }));
  const executedCount = resultEntries.filter((r) => r.result !== undefined).length;
  const allPassed = executedCount === CHECKS.length && resultEntries.every((r) => r.result?.passed);

  return (
    <div className="zatca-form">
      <h3 className="zatca-wizard__step-title">فحوص الامتثال</h3>
      <p className="zatca-wizard__step-desc">
        تُرسَل ست فواتير اختبارية (قياسية ومبسّطة + إشعاراتها) إلى بيئة الامتثال للتحقّق من توافق منشأتك مع متطلبات الهيئة.
      </p>

      {serverError ? (
        <div className="zatca-form-error"><AlertTriangle size={16} />{serverError}</div>
      ) : null}

      {!hasRun ? (
        <button
          type="button"
          className="zatca-btn zatca-btn--primary"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => { setServerError(null); mutation.mutate(); }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <><Loader2 size={15} className="zatca-spin" /> جارٍ تشغيل الفحوص…</> : <><PlayCircle size={16} /> تشغيل الفحوص</>}
        </button>
      ) : (
        <>
          <table className="zatca-compliance-table">
            <thead>
              <tr>
                <th>نوع المستند</th>
                <th>النتيجة</th>
                <th>HTTP</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {resultEntries.map(({ key, label, result }) => (
                <tr key={key}>
                  <td>{label}</td>
                  <td>
                    {result === undefined ? (
                      <span className="zatca-check zatca-check--pending"><MinusCircle size={15} /> لم تُنفّذ</span>
                    ) : result.passed ? (
                      <span className="zatca-check zatca-check--pass"><CheckCircle2 size={15} /> ناجحة</span>
                    ) : (
                      <span className="zatca-check zatca-check--fail"><XCircle size={15} /> فاشلة</span>
                    )}
                  </td>
                  <td dir="ltr" style={{ textAlign: 'center' }}>{result?.http ?? '—'}</td>
                  <td>{result?.errors?.length ? result.errors.join('، ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {executedCount === 0 ? (
            <div className="zatca-compliance-empty">
              لم تُرجِع بيئة الفحص أي نتائج — يتطلب تشغيل الفحوص الفعلي بيئة sandbox مهيّأة لدى الهيئة.
            </div>
          ) : !allPassed ? (
            <div className="zatca-form-error"><AlertTriangle size={16} /> لم تنجح كل الفحوص — راجع الأخطاء قبل التفعيل.</div>
          ) : (
            <div className="zatca-form-success"><CheckCircle2 size={16} /> اجتازت جميع الفحوص الست بنجاح.</div>
          )}

          <button
            type="button"
            className="zatca-btn zatca-btn--ghost"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => { setServerError(null); mutation.mutate(); }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <><Loader2 size={14} className="zatca-spin" /> إعادة التشغيل…</> : 'إعادة تشغيل الفحوص'}
          </button>
        </>
      )}

      <div className="zatca-wizard__actions">
        <button type="button" className="zatca-btn zatca-btn--ghost" onClick={onBack}>
          <ArrowRight size={15} /> السابق
        </button>
        <button
          type="button"
          className="zatca-btn zatca-btn--primary"
          onClick={onSuccess}
          disabled={!hasRun || mutation.isPending}
          title={!hasRun ? 'شغّل الفحوص أولاً' : undefined}
        >
          التالي <ArrowLeft size={15} />
        </button>
      </div>
    </div>
  );
};

export default StepComplianceChecks;
