// [وحدة المحاسبة #141 — م2] الإقرار الضريبي: صناديق نموذج هيئة الزكاة والضريبة
// والجمارك تُحسب من فواتير ومصروفات النظام — تُنسخ أرقامها مباشرة في بوابة الهيئة.
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { AlertTriangle, Download, FileSpreadsheet, ListPlus } from 'lucide-react';
import { accountingService, downloadTaxReturnPdf, type TaxReturnReport } from '../../../services/accountingService';
import { LoadingState, ErrorState } from '../../../components/erp';
import { formatSAR } from '../../../utils/money';

type PeriodMode = 'quarter' | 'month' | 'custom';

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 2, currentYear - 1, currentYear];
const QUARTERS = [
  { value: 'Q1', label: 'الربع الأول (يناير–مارس)' },
  { value: 'Q2', label: 'الربع الثاني (أبريل–يونيو)' },
  { value: 'Q3', label: 'الربع الثالث (يوليو–سبتمبر)' },
  { value: 'Q4', label: 'الربع الرابع (أكتوبر–ديسمبر)' },
];

/** الربع السابق (المستحق تقديمه الآن) — نفس افتراضي الباك. */
function previousQuarter(): { year: number; quarter: string } {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1; // 1..4 الجاري
  return q === 1 ? { year: now.getFullYear() - 1, quarter: 'Q4' } : { year: now.getFullYear(), quarter: `Q${q - 1}` };
}

const TaxReturnPanel: React.FC = () => {
  const prev = previousQuarter();
  const [mode, setMode] = useState<PeriodMode>('quarter');
  const [year, setYear] = useState(prev.year);
  const [quarter, setQuarter] = useState(prev.quarter);
  const [month, setMonth] = useState(`${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [detailed, setDetailed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const periodFilter = useMemo(() => {
    if (mode === 'quarter') return { quarter: `${year}-${quarter}` };
    if (mode === 'month') return { month };
    return from && to ? { from, to } : {};
  }, [mode, year, quarter, month, from, to]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['accounting', 'taxReturn', periodFilter, detailed],
    queryFn: () => accountingService.getTaxReturn({ ...periodFilter, ...(detailed ? { detailed: 1 as const } : {}) }),
    enabled: mode !== 'custom' || (!!from && !!to),
  });

  const report: TaxReturnReport | undefined = data?.data;

  const handlePdf = async () => {
    setDownloading(true);
    try {
      await downloadTaxReturnPdf(periodFilter);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      {/* اختيار الفترة */}
      <div className="acc-period">
        <select className="fin-select" value={mode} onChange={(e) => setMode(e.target.value as PeriodMode)} aria-label="نوع الفترة">
          <option value="quarter">ربع سنوي</option>
          <option value="month">شهري</option>
          <option value="custom">فترة مخصصة</option>
        </select>

        {mode === 'quarter' && (
          <>
            <select className="fin-select" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="السنة">
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="fin-select" value={quarter} onChange={(e) => setQuarter(e.target.value)} aria-label="الربع">
              {QUARTERS.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
            </select>
          </>
        )}

        {mode === 'month' && (
          <input className="fin-input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        )}

        {mode === 'custom' && (
          <>
            <input className="fin-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="من" />
            <span>إلى</span>
            <input className="fin-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="إلى" />
          </>
        )}

        <span style={{ flex: 1 }} />
        <button type="button" className="fin-btn" onClick={() => setDetailed((v) => !v)}>
          <ListPlus size={14} /> {detailed ? 'إخفاء التفاصيل' : 'تفاصيل المستندات'}
        </button>
        <button type="button" className="fin-btn fin-btn--primary" onClick={handlePdf} disabled={downloading || !report}>
          <Download size={14} /> {downloading ? 'جارٍ التوليد...' : 'PDF'}
        </button>
      </div>

      {isLoading && <LoadingState text="جارٍ حساب الإقرار..." />}
      {isError && <ErrorState onRetry={refetch} />}

      {report && !isLoading && (
        <>
          {/* التنبيهات */}
          {report.warnings.map((w, i) => (
            <div key={i} className="acc-warn"><AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {w}</div>
          ))}

          {/* المبيعات */}
          <h3 style={{ fontSize: 14, margin: '14px 0 6px' }}>أولاً: المبيعات (ضريبة المخرجات)</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="acc-table">
              <thead>
                <tr><th style={{ width: '50%' }}>البند</th><th>الوعاء (ريال)</th><th>الضريبة (ريال)</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>المبيعات الخاضعة للنسبة الأساسية 15% — {report.sales.count} مستند</td>
                  <td className="num">{formatSAR(report.sales.standard_rated_base)}</td>
                  <td className="num">{formatSAR(report.sales.output_vat)}</td>
                </tr>
                <tr>
                  <td>تسويات المبيعات (إشعارات دائنة) — {report.adjustments.credit_notes_count} إشعار</td>
                  <td className="num">({formatSAR(report.adjustments.base_reduction)})</td>
                  <td className="num">({formatSAR(report.adjustments.vat_reduction)})</td>
                </tr>
                <tr>
                  <td>مبيعات صفرية / معفاة</td>
                  <td className="num">{formatSAR(report.sales.zero_or_exempt)}</td>
                  <td className="num">0.00</td>
                </tr>
                <tr className="acc-row--total">
                  <td>إجمالي ضريبة المخرجات بعد التسويات</td>
                  <td className="num">{formatSAR(report.sales.standard_rated_base - report.adjustments.base_reduction)}</td>
                  <td className="num">{formatSAR(report.net.output_vat_after_adjustments)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* المشتريات */}
          <h3 style={{ fontSize: 14, margin: '14px 0 6px' }}>ثانياً: المشتريات (ضريبة المدخلات)</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="acc-table">
              <thead>
                <tr><th style={{ width: '50%' }}>البند</th><th>الوعاء (ريال)</th><th>الضريبة (ريال)</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>مشتريات خاضعة بفاتورة ضريبية (قابلة للخصم) — من {report.purchases.count} مصروف مدفوع</td>
                  <td className="num">{formatSAR(report.purchases.deductible_base)}</td>
                  <td className="num">{formatSAR(report.purchases.input_vat)}</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--quiet-gray-600)' }}>مصروفات بلا فاتورة ضريبية (غير قابلة للخصم — للاطلاع)</td>
                  <td className="num" style={{ color: 'var(--quiet-gray-600)' }}>{formatSAR(report.purchases.non_deductible_total)}</td>
                  <td className="num" style={{ color: 'var(--quiet-gray-600)' }}>—</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* الصافي */}
          <div className="acc-net">
            <FileSpreadsheet size={20} />
            صافي الضريبة {report.net.net_vat_due >= 0 ? 'المستحقة للهيئة' : 'المستردّة (رصيد دائن)'}:
            <span className="acc-net__value" style={{ color: report.net.net_vat_due >= 0 ? 'var(--law-navy)' : 'var(--status-green)' }}>
              {formatSAR(Math.abs(report.net.net_vat_due))}
            </span>
            <span className="acc-net__hint">
              = ضريبة المخرجات بعد التسويات ({formatSAR(report.net.output_vat_after_adjustments)})
              − ضريبة المدخلات ({formatSAR(report.net.input_vat)})
              · الفترة {report.period.from} إلى {report.period.to} · أساس الاستحقاق
            </span>
          </div>

          {/* التفاصيل */}
          {detailed && report.details && (
            <>
              <h3 style={{ fontSize: 14, margin: '14px 0 6px' }}>مستندات المبيعات ({report.details.invoices.length})</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="acc-table">
                  <thead>
                    <tr><th>الرقم</th><th>التاريخ</th><th>البيان</th><th>النوع</th><th>الوعاء</th><th>الضريبة</th></tr>
                  </thead>
                  <tbody>
                    {report.details.invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="num">{inv.number}</td>
                        <td className="num">{inv.date ?? '—'}</td>
                        <td>{inv.title}</td>
                        <td>{inv.kind === 'credit_note' ? 'إشعار دائن' : inv.kind === 'debit_note' ? 'إشعار مدين' : 'فاتورة'}</td>
                        <td className="num">{formatSAR(inv.base)}</td>
                        <td className="num">{formatSAR(inv.vat)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 style={{ fontSize: 14, margin: '14px 0 6px' }}>مستندات المشتريات ({report.details.expenses.length})</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="acc-table">
                  <thead>
                    <tr><th>الرقم</th><th>التاريخ</th><th>البيان</th><th>قابل للخصم</th><th>الوعاء</th><th>الضريبة</th></tr>
                  </thead>
                  <tbody>
                    {report.details.expenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="num">{exp.number}</td>
                        <td className="num">{exp.date ?? '—'}</td>
                        <td>{exp.description}</td>
                        <td>{exp.deductible ? 'نعم' : 'لا'}</td>
                        <td className="num">{formatSAR(exp.base)}</td>
                        <td className="num">{formatSAR(exp.vat)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default TaxReturnPanel;
