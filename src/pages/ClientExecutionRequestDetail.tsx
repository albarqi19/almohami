import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Users, Gavel, Clock, HandCoins, AlertCircle, Scale } from 'lucide-react';
import {
  ClientExecutionRequestService,
  formatDateTime,
  formatFilingDate,
  formatSar,
  type ClientExecutionRequestDetail as ExecDetail,
} from '../services/clientExecutionRequestService';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (client-execution.css — بدائيّات cx-*)

const ClientExecutionRequestDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ExecDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const d = await ClientExecutionRequestService.show(id);
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذّر جلب طلب التنفيذ');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return (
    <div className="cx-page" dir="rtl">
      <div className="cx-header">
        <div className="cx-header__title">
          <div className="cx-header__icon"><Scale size={20} /></div>
          <div>
            <h1 className="cx-header__h1">{data?.request_number || 'طلب تنفيذ'}</h1>
            <p className="cx-header__sub">{data?.sub_document_type || data?.main_document_type || 'تفاصيل طلب التنفيذ'}</p>
          </div>
        </div>
        <Link to="/my-execution-requests" className="cx-back"><ChevronRight size={16} /> كل طلبات التنفيذ</Link>
      </div>

      <div className="cx-content">
        {loading ? (
          <div className="cx-skeleton" aria-busy="true" aria-label="جارٍ التحميل">
            <div className="cx-skeleton__row" />
            <div className="cx-skeleton__row" />
          </div>
        ) : error || !data ? (
          <div className="cx-error" role="alert">
            <AlertCircle size={16} />
            <span>{error || 'طلب التنفيذ غير موجود'}</span>
          </div>
        ) : (
          <>
            <div className="cx-detail-head">
              <h2 className="cx-detail-head__title">
                <span className={`cx-chip cx-chip--${data.status_key}`}>{data.status || data.status_label}</span>
                {data.court && <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{data.court}{data.department ? ` · ${data.department}` : ''}</span>}
              </h2>
            </div>

            <div className="cx-kpis">
              <div className="cx-kpi">
                <div className="cx-kpi__label">إجمالي المبلغ</div>
                <div className="cx-kpi__value">{formatSar(data.total_amount)}</div>
              </div>
              <div className="cx-kpi">
                <div className="cx-kpi__label">المسدّد</div>
                <div className="cx-kpi__value cx-kpi__value--paid">{formatSar(data.paid_amount)}</div>
              </div>
              <div className="cx-kpi">
                <div className="cx-kpi__label">المتبقي</div>
                <div className="cx-kpi__value cx-kpi__value--remaining">{formatSar(data.remaining_amount)}</div>
              </div>
              <div className="cx-kpi">
                <div className="cx-kpi__label">نسبة السداد</div>
                <div className="cx-kpi__value">{data.paid_percent === null ? '—' : `${data.paid_percent}%`}</div>
                <div className="cx-bar" aria-hidden="true">
                  <div className="cx-bar__fill" style={{ width: `${data.paid_percent ?? 0}%` }} />
                </div>
              </div>
            </div>

            <div className="cx-grid">
              <div className="cx-panel cx-panel--wide">
                <div className="cx-panel__head">بيانات الطلب</div>
                <table className="cx-props">
                  <tbody>
                    <tr><th>رقم الطلب</th><td>{data.request_number || '—'}{data.request_code ? ` · ${data.request_code}` : ''}</td></tr>
                    <tr><th>نوع السند</th><td>{[data.main_document_type, data.sub_document_type].filter(Boolean).join(' — ') || '—'}</td></tr>
                    <tr><th>تاريخ التقديم</th><td>{formatFilingDate(data)}{data.filing_date && data.filing_date_hijri ? ` (${data.filing_date_hijri} هـ)` : ''}</td></tr>
                    <tr><th>المحكمة</th><td>{data.court || '—'}</td></tr>
                    <tr><th>الدائرة</th><td>{data.department || '—'}</td></tr>
                    <tr><th>القضية المرتبطة</th><td>{data.case ? <Link to={`/my-cases/${data.case.id}`}>{data.case.title}{data.case.file_number ? ` (#${data.case.file_number})` : ''}</Link> : 'غير مرتبط بقضية'}</td></tr>
                    <tr><th>آخر تحديث من ناجز</th><td>{formatDateTime(data.najiz_synced_at || data.updated_at)}</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="cx-panel">
                <div className="cx-panel__head"><Users size={14} /> الأطراف <em>{data.parties.length}</em></div>
                <div className="cx-panel__body">
                  {data.parties.length === 0 ? (
                    <div className="cx-panel__empty">لا أطراف مسجّلة</div>
                  ) : data.parties.map((p, i) => (
                    <div key={i} className="cx-item">
                      <Users size={14} className="cx-item__icon" />
                      <div>
                        <b>{p.name}</b>
                        {p.role && <span>{p.role}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cx-panel">
                <div className="cx-panel__head"><Gavel size={14} /> القرارات <em>{data.decisions.length}</em></div>
                <div className="cx-panel__body">
                  {data.decisions.length === 0 ? (
                    <div className="cx-panel__empty">لا قرارات مسجّلة بعد</div>
                  ) : data.decisions.map((d, i) => (
                    <div key={i} className="cx-item">
                      <Gavel size={14} className="cx-item__icon" />
                      <div>
                        <b>{d.number ? `قرار ${d.number}` : d.type || `قرار ${i + 1}`}</b>
                        <span>{[d.type && d.number ? d.type : null, d.status, d.date].filter(Boolean).join(' · ')}</span>
                        {d.text && <p>{d.text}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cx-panel cx-panel--wide">
                <div className="cx-panel__head"><Clock size={14} /> مراحل الطلب <em>{data.steps.length}</em></div>
                {data.steps.length === 0 ? (
                  <div className="cx-panel__empty">لم تُسجَّل مراحل لهذا الطلب بعد</div>
                ) : (
                  <ol className="cx-steps">
                    {data.steps.map((s, i) => (
                      <li key={i} className="cx-step">
                        <b>{s.name || `مرحلة ${i + 1}`}</b>
                        <span>{[s.date, s.status].filter(Boolean).join(' · ') || '—'}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="cx-panel cx-panel--wide">
                <div className="cx-panel__head"><HandCoins size={14} /> حركة السداد <em>{data.payments.length}</em></div>
                {data.payments.length === 0 ? (
                  <div className="cx-panel__empty">لم يُرصد أي سداد بعد</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="cx-table">
                      <thead>
                        <tr>
                          <th>التاريخ</th>
                          <th>قبل</th>
                          <th>بعد</th>
                          <th>الفرق</th>
                          <th>المتبقي بعده</th>
                          <th>الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.payments.map((p, i) => (
                          <tr key={i}>
                            <td>{formatDateTime(p.detected_at)}</td>
                            <td>{formatSar(p.previous_paid)}</td>
                            <td>{formatSar(p.new_paid)}</td>
                            <td className={p.delta >= 0 ? 'cx-good' : 'cx-bad'}>{p.delta >= 0 ? '+' : ''}{formatSar(p.delta)}</td>
                            <td>{p.remaining_after === null ? '—' : formatSar(p.remaining_after)}</td>
                            <td>{p.new_status || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClientExecutionRequestDetail;
