import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale, Search, Landmark, Building, ChevronLeft, AlertCircle, Loader2, FileText } from 'lucide-react';
import {
  ClientExecutionRequestService,
  EXEC_STATUS_KEYS,
  EXEC_STATUS_LABELS,
  formatFilingDate,
  formatSar,
  type ClientExecutionRequest,
  type ExecStatusKey,
  type ExecSummary,
} from '../services/clientExecutionRequestService';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (client-execution.css — بدائيّات cx-*)

/**
 * «طلبات التنفيذ» — ما ربطه المكتبُ بحساب العميل. الخادم يفرض الملكية (/client/execution-requests).
 */
const ClientExecutionRequests: React.FC = () => {
  const [rows, setRows] = useState<ClientExecutionRequest[]>([]);
  const [summary, setSummary] = useState<ExecSummary | null>(null);
  const [status, setStatus] = useState<ExecStatusKey | null>(null);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(async (p: number, append: boolean) => {
    try {
      if (append) setLoadingMore(true); else { setLoading(true); setError(null); }
      const res = await ClientExecutionRequestService.list({ status, q: debouncedQ, page: p });
      setRows(prev => (append ? [...prev, ...res.rows] : res.rows));
      setSummary(res.summary);
      setPage(res.page);
      setLastPage(res.lastPage);
      setTotal(res.total);
    } catch (e) {
      if (!append) setRows([]);
      setError(e instanceof Error ? e.message : 'تعذّر جلب طلبات التنفيذ');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [status, debouncedQ]);

  useEffect(() => {
    void load(1, false);
  }, [load]);

  const hasAny = (summary?.count ?? 0) > 0;
  const filtered = status !== null || debouncedQ !== '';

  return (
    <div className="cx-page" dir="rtl">
      <div className="cx-header">
        <div className="cx-header__title">
          <div className="cx-header__icon"><Scale size={20} /></div>
          <div>
            <h1 className="cx-header__h1">طلبات التنفيذ</h1>
            <p className="cx-header__sub">طلبات التنفيذ المرتبطة بحسابك كما يتابعها المكتب في ناجز</p>
          </div>
        </div>
      </div>

      <div className="cx-content">
        {summary && hasAny && (
          <div className="cx-kpis">
            <div className="cx-kpi">
              <div className="cx-kpi__label">عدد الطلبات</div>
              <div className="cx-kpi__value">{summary.count}</div>
            </div>
            <div className="cx-kpi">
              <div className="cx-kpi__label">إجمالي المبالغ</div>
              <div className="cx-kpi__value">{formatSar(summary.total_amount)}</div>
            </div>
            <div className="cx-kpi">
              <div className="cx-kpi__label">المسدّد</div>
              <div className="cx-kpi__value cx-kpi__value--paid">{formatSar(summary.paid_amount)}</div>
            </div>
            <div className="cx-kpi">
              <div className="cx-kpi__label">المتبقي</div>
              <div className="cx-kpi__value cx-kpi__value--remaining">{formatSar(summary.remaining_amount)}</div>
            </div>
          </div>
        )}

        {hasAny && (
          <div className="cx-filters">
            <div className="cx-chips" role="group" aria-label="تصفية بالحالة">
              <button type="button" className="cx-chipbtn" aria-pressed={status === null} onClick={() => setStatus(null)}>
                الكل <em>{summary?.count ?? 0}</em>
              </button>
              {EXEC_STATUS_KEYS.filter(k => (summary?.by_status[k] ?? 0) > 0).map(k => (
                <button key={k} type="button" className="cx-chipbtn" aria-pressed={status === k} onClick={() => setStatus(status === k ? null : k)}>
                  {EXEC_STATUS_LABELS[k]} <em>{summary?.by_status[k] ?? 0}</em>
                </button>
              ))}
            </div>
            <div className="cx-search">
              <input
                type="search"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="بحث برقم الطلب أو المحكمة"
                aria-label="بحث"
              />
              <Search size={15} />
            </div>
          </div>
        )}

        {loading ? (
          <div className="cx-skeleton" aria-busy="true" aria-label="جارٍ التحميل">
            <div className="cx-skeleton__row" />
            <div className="cx-skeleton__row" />
            <div className="cx-skeleton__row" />
          </div>
        ) : error ? (
          <div className="cx-error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button type="button" className="cx-btn" onClick={() => void load(1, false)} style={{ marginInlineStart: 'auto' }}>إعادة المحاولة</button>
          </div>
        ) : rows.length === 0 ? (
          <div className="cx-empty">
            <div className="cx-empty__icon"><Scale size={24} /></div>
            <h3 className="cx-empty__title">{filtered ? 'لا نتائج مطابقة' : 'لا توجد طلبات تنفيذ مرتبطة بحسابك'}</h3>
            <p className="cx-empty__text">
              {filtered ? 'جرّب تغيير الحالة أو كلمة البحث.' : 'يظهر الطلب هنا بعد أن يربطه المكتب بحسابك. إن كان لك طلب تنفيذ لا تراه، تواصل مع المكتب.'}
            </p>
          </div>
        ) : (
          <>
            <ul className="cx-list">
              {rows.map(r => (
                <li key={r.id}>
                  <Link to={`/my-execution-requests/${r.id}`} className="cx-row">
                    <div>
                      <div className="cx-row__num">
                        <span>{r.request_number || `طلب #${r.id}`}</span>
                        <span className={`cx-chip cx-chip--${r.status_key}`}>{r.status || r.status_label}</span>
                        {r.sub_document_type && <small>{r.sub_document_type}</small>}
                      </div>
                      <div className="cx-row__meta">
                        {r.court && <span><Landmark size={13} /> {r.court}</span>}
                        {r.department && <span><Building size={13} /> {r.department}</span>}
                        {r.case && <span><FileText size={13} /> {r.case.title}</span>}
                      </div>
                    </div>
                    <div className="cx-row__date">
                      <b>تاريخ التقديم</b>
                      {formatFilingDate(r)}
                    </div>
                    <div className="cx-money">
                      <div className="cx-money__line">
                        <span>المسدّد <b>{formatSar(r.paid_amount)}</b></span>
                        <span>من <b>{formatSar(r.total_amount)}</b></span>
                      </div>
                      <div className="cx-bar" aria-hidden="true">
                        <div className={`cx-bar__fill ${r.paid_percent ? '' : 'cx-bar__fill--none'}`} style={{ width: `${r.paid_percent ?? 0}%` }} />
                      </div>
                    </div>
                    <ChevronLeft size={16} className="cx-row__arrow" />
                  </Link>
                </li>
              ))}
            </ul>
            {page < lastPage && (
              <div className="cx-more">
                <button type="button" className="cx-btn" disabled={loadingMore} onClick={() => void load(page + 1, true)}>
                  {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                  عرض المزيد ({rows.length} من {total})
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ClientExecutionRequests;
