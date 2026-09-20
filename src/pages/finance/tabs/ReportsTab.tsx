// [P4·UX-11 + UX-10] تبويب التقارير المالية — Aging/DSO + الإيرادات الشهرية + أعلى العملاء + تقرير تحصيل + تصدير.
// محروس بـ billing.reports.view (على مستوى المسار)؛ التصدير بـ billing.reports.export.
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, Timer, Users, Download, BarChart3, TrendingUp, AlertCircle, HelpCircle } from 'lucide-react';
import { billingService } from '../../../services/billingService';
import { DataTable } from '../../../components/erp';
import type { Column } from '../../../components/erp';
import { LoadingState, EmptyState } from '../../../components/erp/States';
import { GroupedColumnChart, Meter, SegmentBar, StatTile } from '../../../components/charts/RaedCharts';
import { formatSAR, toNumber } from '../../../utils/money';
import { exportToCsv } from '../../../utils/exportCsv';
import { PAYMENT_METHOD_LABELS } from '../../../config/financeStatusConfig';
import { usePermissionContext } from '../../../contexts/PermissionContext';
import { FINANCE_PERMISSIONS } from '../../../config/financeModule';
import type { MonthlyStats } from '../../../types/billing';

interface TopClient { id: number; name: string; total_paid: number; total_invoiced: number; client_contracts_count?: number }

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function firstOfLastMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function lastOfLastMonth(): string {
  const d = new Date();
  d.setDate(0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function firstOfCurrentQuarter(): string {
  const d = new Date();
  const quarterMonth = Math.floor(d.getMonth() / 3) * 3;
  return `${d.getFullYear()}-${String(quarterMonth + 1).padStart(2, '0')}-01`;
}
function firstOfCurrentYear(): string {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
}

/* بطاقة مؤشر مصغّرة مطوّرة */
const ReportsTab: React.FC = () => {
  const { has } = usePermissionContext();
  const canExport = has(FINANCE_PERMISSIONS.reportsExport);
  const currentYear = new Date().getFullYear();
  const [year, setYear]           = useState(currentYear);
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate]     = useState(today());
  const [preset, setPreset]       = useState('this_month');

  const handlePresetChange = (val: string) => {
    setPreset(val);
    if (val === 'this_month') {
      setStartDate(firstOfMonth());
      setEndDate(today());
    } else if (val === 'last_month') {
      setStartDate(firstOfLastMonth());
      setEndDate(lastOfLastMonth());
    } else if (val === 'this_quarter') {
      setStartDate(firstOfCurrentQuarter());
      setEndDate(today());
    } else if (val === 'this_year') {
      setStartDate(firstOfCurrentYear());
      setEndDate(today());
    }
  };

  const { data: aging, isLoading: agingLoading } = useQuery({
    queryKey: ['finance', 'aging'],
    queryFn: () => billingService.getAging(),
  });
  const { data: yearly } = useQuery({
    queryKey: ['finance', 'yearlyStats', year],
    queryFn: () => billingService.getYearlyStats(year),
  });
  const { data: topClients } = useQuery({
    queryKey: ['finance', 'topClients'],
    queryFn: () => billingService.getTopClients(10),
  });
  const { data: report, isFetching: reportFetching } = useQuery({
    queryKey: ['finance', 'collectionReport', startDate, endDate],
    queryFn: () => billingService.getCollectionReport({ start_date: startDate, end_date: endDate }),
  });

  const agingData = aging?.data;
  const chartData: MonthlyStats[] = useMemo(() => {
    const monthly = yearly?.data?.monthly;
    return monthly ? Object.values(monthly) : [];
  }, [yearly]);
  const clients = (topClients?.data ?? []) as TopClient[];
  const dso = toNumber(agingData?.dso);

  const totalOutstanding = useMemo(() => {
    if (!agingData?.aging) return 0;
    return toNumber(agingData.aging.current_0_30) +
           toNumber(agingData.aging.days_31_60) +
           toNumber(agingData.aging.days_61_90) +
           toNumber(agingData.aging.days_90_plus);
  }, [agingData]);

  const topClientColumns: Column<TopClient>[] = [
    { 
      key: 'rank',      
      header: '#',       
      align: 'center', 
      render: (_: TopClient, i: number) => <span className="fin-cell-muted">{i + 1}</span>
    },
    { key: 'name',      header: 'العميل',  render: (c) => <span className="fin-cell-strong">{c.name}</span> },
    { key: 'invoiced',  header: 'المُفوتَر', numeric: true, align: 'end', render: (c) => formatSAR(c.total_invoiced) },
    { key: 'paid',      header: 'المحصّل',  numeric: true, align: 'end',
      render: (c) => <span className="fin-cell-strong">{formatSAR(c.total_paid)}</span> },
    { 
      key: 'collection_rate', 
      header: 'نسبة التحصيل', 
      align: 'center', 
      render: (c) => {
        const invoiced = toNumber(c.total_invoiced);
        const paid = toNumber(c.total_paid);
        const rate = invoiced > 0 ? (paid / invoiced) * 100 : 0;
        return (
          <span className="fdb-progress rc-scope">
            <Meter value={rate} tone={rate >= 80 ? 'good' : rate >= 50 ? 'warning' : 'critical'} ariaLabel={`نسبة التحصيل ${rate.toFixed(0)}%`} />
            <b>{rate.toFixed(0)}%</b>
          </span>
        );
      }
    },
    { key: 'contracts', header: 'العقود',  align: 'center', numeric: true, render: (c) => c.client_contracts_count ?? 0 },
  ];

  const handleExportTopClients = () => exportToCsv('أعلى-العملاء', [
    { header: 'العميل',     value: (c: TopClient) => c.name },
    { header: 'المُفوتَر',   value: (c: TopClient) => toNumber(c.total_invoiced) },
    { header: 'المحصّل',    value: (c: TopClient) => toNumber(c.total_paid) },
    { header: 'نسبة التحصيل (%)', value: (c: TopClient) => {
      const inv = toNumber(c.total_invoiced);
      return inv > 0 ? ((toNumber(c.total_paid) / inv) * 100).toFixed(1) : '0';
    }},
    { header: 'عدد العقود', value: (c: TopClient) => c.client_contracts_count ?? 0 },
  ], clients);

  const handleExportReport = () => {
    const rep = report?.data;
    if (!rep) return;
    exportToCsv(`تقرير-التحصيل-${startDate}_${endDate}`, [
      { header: 'رقم الدفعة', value: (p) => p.payment_number },
      { header: 'العميل',     value: (p) => p.client?.name ?? '' },
      { header: 'المبلغ',     value: (p) => toNumber(p.amount) },
      { header: 'الطريقة',    value: (p) => PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method },
      { header: 'التاريخ',    value: (p) => p.payment_date?.split('T')[0] ?? '' },
    ], rep.payments);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ١. منذ متى والمبالغ المتبقية لم تُحصَّل؟ — مقياس ترتيبي بلون واحد يتدرج مع العمر */}
      <div className="fin-section rc-scope">
        <div className="fin-section__head">
          <span className="fin-section__title"><Layers size={15} /> منذ متى والمبالغ المتبقية لم تُحصَّل؟</span>
          {dso > 0 && (
            <span className="fdb-dso" title="متوسط عدد الأيام بين إصدار الفاتورة وتحصيلها (آخر 90 يوماً) — الأفضل أقل من 45 يوماً">
              <Timer size={13} /> متوسط أيام التحصيل <b>{dso}</b>
            </span>
          )}
        </div>
        <div className="fin-section__body">
          {agingLoading ? <LoadingState /> : (
            <div className="frp-aging">
              <StatTile label="إجمالي المتبقي للتحصيل" value={formatSAR(totalOutstanding)} hint="فواتير صدرت ولم تُسدَّد بالكامل" icon={<Layers size={15} />} />
              <div className="frp-aging__bar">
                <SegmentBar
                  ariaLabel="المبالغ المتبقية بحسب عمر الفاتورة"
                  emptyText="لا مبالغ متبقية"
                  segments={[
                    { key: 'a1', label: 'أقل من شهر', value: toNumber(agingData?.aging.current_0_30), valueLabel: formatSAR(agingData?.aging.current_0_30), tone: 'ord1' },
                    { key: 'a2', label: 'شهر إلى شهرين', value: toNumber(agingData?.aging.days_31_60), valueLabel: formatSAR(agingData?.aging.days_31_60), tone: 'ord2' },
                    { key: 'a3', label: 'شهران إلى ثلاثة', value: toNumber(agingData?.aging.days_61_90), valueLabel: formatSAR(agingData?.aging.days_61_90), tone: 'ord3' },
                    { key: 'a4', label: 'أكثر من 3 أشهر', value: toNumber(agingData?.aging.days_90_plus), valueLabel: formatSAR(agingData?.aging.days_90_plus), tone: 'ord4' },
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ٢. المخطط الشهري (يسار، أضيق) + تقرير التحصيل (يمين، أوسع) */}
      <div className="fin-panels" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 12 }}>

        {/* الإيرادات الشهرية */}
        <div className="fin-section" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="fin-section__head">
            <span className="fin-section__title"><BarChart3 size={15} /> المُفوتَر والمحصَّل شهرياً</span>
            <select className="fin-select" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="السنة">
              {[currentYear, currentYear - 1, currentYear - 2].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="fin-section__body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {chartData.length > 0 ? (
              <div className="rc-scope frp-trend">
                <GroupedColumnChart
                  title={`المُفوتَر والمحصَّل شهرياً ${year}`}
                  unit="ر.س"
                  series={[{ label: 'المُفوتَر', tone: 'series1' }, { label: 'المحصَّل', tone: 'series2' }]}
                  data={chartData.slice().sort((a, b) => a.month - b.month).map((m) => ({ label: m.month_name, values: [toNumber(m.invoiced), toNumber(m.collected)] as [number, number] }))}
                />
              </div>
            ) : <EmptyState title="لا توجد بيانات شهرية" />}
          </div>
        </div>

        {/* تقرير التحصيل */}
        <div className="fin-section" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="fin-section__head" style={{ flexWrap: 'wrap', gap: 8 }}>
            <span className="fin-section__title"><TrendingUp size={15} /> تقرير التحصيل</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <select
                className="fin-select"
                value={preset}
                onChange={(e) => handlePresetChange(e.target.value)}
                style={{ fontSize: 12, height: 28, padding: '0 8px' }}
                aria-label="اختر الفترة"
              >
                <option value="this_month">الشهر الحالي</option>
                <option value="last_month">الشهر الماضي</option>
                <option value="this_quarter">الربع الحالي</option>
                <option value="this_year">العام الحالي</option>
                <option value="custom">مخصص</option>
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  className="fin-input"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPreset('custom');
                  }}
                  style={{ fontSize: 12, padding: '3px 6px', height: 28, width: 'auto', minWidth: 0 }}
                  aria-label="من تاريخ"
                />
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>—</span>
                <input
                  className="fin-input"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPreset('custom');
                  }}
                  style={{ fontSize: 12, padding: '3px 6px', height: 28, width: 'auto', minWidth: 0 }}
                  aria-label="إلى تاريخ"
                />
              </div>
            </div>
            {canExport && (
              <button type="button" className="fin-btn fin-btn--sm" onClick={handleExportReport}
                disabled={!report?.data?.payments?.length}
                style={{ height: 28 }}>
                <Download size={13} /> CSV
              </button>
            )}
          </div>
          <div className="fin-section__body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {reportFetching ? <LoadingState /> : report?.data ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* الإجمالي — مميَّز */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px',
                  background: 'color-mix(in srgb, var(--status-green,#059669) 8%, var(--color-surface,#fff))',
                  border: '1px solid color-mix(in srgb, var(--status-green,#059669) 18%, transparent)',
                  borderRadius: 8,
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>إجمالي المحصّل</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>عدد الدفعات: {report.data.payments_count}</span>
                  </div>
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-green)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatSAR(report.data.total_collected)}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* تفصيل طرق الدفع */}
                  {report.data.by_method && Object.entries(report.data.by_method).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-heading)', borderBottom: '1px solid var(--color-border)', paddingBottom: 4 }}>
                        تفاصيل طرق الدفع
                      </span>
                      {Object.entries(report.data.by_method).map(([method, info]) => {
                        const pct = report.data.total_collected > 0 ? (toNumber(info.total) / report.data.total_collected) * 100 : 0;
                        return (
                          <div key={method} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                              <span style={{ fontWeight: 600, color: 'var(--color-heading)' }}>
                                {PAYMENT_METHOD_LABELS[method] ?? method}
                                <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginInlineStart: 6 }}>({info.count} دفعات)</span>
                              </span>
                              <span style={{ fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{formatSAR(info.total)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 4, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-primary)', borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600, width: 28, textAlign: 'left' }}>{pct.toFixed(0)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* أحدث عمليات التحصيل في الفترة */}
                  {report.data.payments && report.data.payments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-heading)', borderBottom: '1px solid var(--color-border)', paddingBottom: 4 }}>
                        أحدث المدفوعات المستلمة
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', paddingLeft: 4 }}>
                        {report.data.payments.slice(0, 5).map((pay) => (
                          <div key={pay.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 12px', background: 'var(--color-surface-subtle)',
                            borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12,
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontWeight: 600, color: 'var(--color-heading)' }}>{pay.client?.name || 'عميل'}</span>
                              <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
                                {pay.payment_date?.split('T')[0]} • {PAYMENT_METHOD_LABELS[pay.payment_method] ?? pay.payment_method}
                              </span>
                            </div>
                            <span style={{ fontWeight: 700, color: 'var(--status-green)', fontVariantNumeric: 'tabular-nums' }}>{formatSAR(pay.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                <AlertCircle size={15} /> لا توجد بيانات للفترة المحددة
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ٣. أعلى العملاء — عرض كامل */}
      <div className="fin-section">
        <div className="fin-section__head">
          <span className="fin-section__title"><Users size={15} /> أعلى العملاء تحصيلاً</span>
          {canExport && (
            <button type="button" className="fin-btn fin-btn--sm" onClick={handleExportTopClients} disabled={clients.length === 0}>
              <Download size={13} /> تصدير
            </button>
          )}
        </div>
        <div className="fin-section__body" style={{ padding: 0 }}>
          <DataTable<TopClient>
            columns={topClientColumns}
            data={clients}
            rowKey={(c) => c.id}
            emptyTitle="لا توجد بيانات"
          />
        </div>
      </div>

    </div>
  );
};

export default ReportsTab;
