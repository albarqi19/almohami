// === قائمة فواتير ZATCA ===
// تبويبات بعدّادات تستهلك الفلتر الخلفي (zatca_only/zatca_status + counts) — لا تصفية client-side.
import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, Loader2, ChevronRight, ChevronLeft, AlertTriangle, FileX2 } from 'lucide-react';
import { zatcaService } from '../../services/zatcaService';
import { ZATCA_TYPE_LABELS, isStandardType } from '../../config/zatcaStatusConfig';
import ZatcaStatusBadge from './ZatcaStatusBadge';
import ZatcaInvoiceActions from './ZatcaInvoiceActions';
import { formatAmount, formatDateTime } from '../../utils/zatcaFormat';
import type { ZatcaCounts } from '../../types/zatca';

interface Tab {
  key: string;
  label: string;
  statuses: string[]; // فارغ = الكل
  countKeys: (keyof ZatcaCounts)[];
}

const TABS: Tab[] = [
  { key: 'all', label: 'الكل', statuses: [], countKeys: ['all'] },
  { key: 'unsent', label: 'غير المرسلة', statuses: ['pending', 'queued'], countKeys: ['pending', 'queued'] },
  { key: 'processing', label: 'قيد المعالجة', statuses: ['submitting'], countKeys: ['submitting'] },
  { key: 'approved', label: 'مُعتمدة/مُبلّغة', statuses: ['cleared', 'reported'], countKeys: ['cleared', 'reported'] },
  { key: 'rejected', label: 'مرفوضة', statuses: ['rejected'], countKeys: ['rejected'] },
  { key: 'failed', label: 'فاشلة', statuses: ['failed'], countKeys: ['failed'] },
];

const ZatcaInvoicesList: React.FC = () => {
  const [tabKey, setTabKey] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const activeTab = TABS.find((t) => t.key === tabKey)!;
  const zatcaStatus = activeTab.statuses.length ? activeTab.statuses.join(',') : undefined;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['zatca-invoices', { tab: tabKey, search, page }],
    queryFn: () => zatcaService.getInvoices({ zatca_status: zatcaStatus, search: search || undefined, page, per_page: 15 }),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });

  const counts = data?.zatca_counts;
  const invoices = data?.data?.data ?? [];
  const lastPage = data?.data?.last_page ?? 1;
  const from = data?.data?.from ?? 0;
  const to = data?.data?.to ?? 0;
  const total = data?.data?.total ?? 0;

  const tabCount = (t: Tab): number | undefined => {
    if (!counts) return undefined;
    return t.countKeys.reduce((sum, k) => sum + (counts[k] ?? 0), 0);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  return (
    <div className="zatca-list-card">
      {/* تبويبات بعدّادات */}
      <div className="zatca-tabs">
        {TABS.map((t) => {
          const c = tabCount(t);
          return (
            <button
              key={t.key}
              type="button"
              className={`zatca-tab${t.key === tabKey ? ' zatca-tab--active' : ''}`}
              onClick={() => { setTabKey(t.key); setPage(1); }}
            >
              {t.label}
              {c !== undefined ? <span className="zatca-tab__count">{c}</span> : null}
            </button>
          );
        })}
      </div>

      {/* شريط أدوات: بحث */}
      <div className="zatca-toolbar">
        <form className="zatca-search" onSubmit={submitSearch}>
          <Search size={15} />
          <input
            type="text"
            placeholder="بحث برقم الفاتورة أو اسم العميل…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>
        {isFetching && !isLoading ? <Loader2 size={16} className="zatca-spin" style={{ color: 'var(--quiet-gray-500)' }} /> : null}
      </div>

      {/* الجدول */}
      <div className="zatca-table-wrap">
        {isLoading ? (
          <div className="zatca-list-loading"><Loader2 size={20} className="zatca-spin" /> جارٍ التحميل…</div>
        ) : invoices.length === 0 ? (
          <div className="zatca-empty-row"><FileX2 size={28} style={{ opacity: 0.5, marginBottom: 8 }} /><div>لا توجد فواتير في هذا التبويب.</div></div>
        ) : (
          <table className="zatca-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>العميل</th>
                <th>المبلغ</th>
                <th>النوع</th>
                <th>الحالة في ZATCA</th>
                <th>تاريخ الإرسال</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const isFinal = inv.zatca_status === 'cleared' || inv.zatca_status === 'reported';
                const hasWarnings = isFinal && (inv.zatca_warnings?.length ?? 0) > 0;
                const showVat = isStandardType(inv.zatca_invoice_type) && (inv.client?.vat_number || inv.client?.tax_number);
                return (
                  <tr key={inv.id}>
                    <td><span className="zatca-table__num">{inv.invoice_number}</span></td>
                    <td>
                      <div className="zatca-table__client">
                        <span>{inv.client?.name ?? '—'}</span>
                        {showVat ? <span className="zatca-table__vat">VAT: {inv.client?.vat_number || inv.client?.tax_number}</span> : null}
                      </div>
                    </td>
                    <td className="zatca-table__amount">{formatAmount(inv.total_amount)}</td>
                    <td>{inv.zatca_invoice_type ? ZATCA_TYPE_LABELS[inv.zatca_invoice_type] : '—'}</td>
                    <td>
                      <ZatcaStatusBadge status={inv.zatca_status} showCode />
                      {hasWarnings ? <AlertTriangle size={14} className="zatca-warn-icon" /> : null}
                    </td>
                    <td>{formatDateTime(inv.zatca_submitted_at)}</td>
                    <td><ZatcaInvoiceActions invoice={inv} variant="row" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ترقيم */}
      {!isLoading && total > 0 ? (
        <div className="zatca-pagination">
          <button className="zatca-page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="السابق">
            <ChevronRight size={18} />
          </button>
          <span>عرض {from} إلى {to} من {total}</span>
          <button className="zatca-page-btn" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} aria-label="التالي">
            <ChevronLeft size={18} />
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default ZatcaInvoicesList;
