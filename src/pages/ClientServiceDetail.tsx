import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Briefcase, ChevronRight, AlertCircle, FileText, Download, Clock, Paperclip } from 'lucide-react';
import { downloadDocument } from '../components/FilePreview';
import {
  ClientServiceService,
  RELATION_LABELS,
  formatFileSize,
  formatServiceDate,
  type ClientServiceDetail as ServiceDetail,
} from '../services/clientServiceService';
import { serviceChipClass } from './ClientServices';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (client-services.css + بدائيّات cx-*)

const ClientServiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const d = await ClientServiceService.show(id);
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذّر جلب الخدمة');
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
          <div className="cx-header__icon"><Briefcase size={20} /></div>
          <div>
            <h1 className="cx-header__h1">{data?.title || 'خدمة قانونية'}</h1>
            <p className="cx-header__sub" dir="ltr" style={{ textAlign: 'end' }}>{data?.service_number || ''}</p>
          </div>
        </div>
        <Link to="/my-services" className="cx-back"><ChevronRight size={16} /> كل خدماتي</Link>
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
            <span>{error || 'الخدمة غير موجودة'}</span>
          </div>
        ) : (
          <>
            <div className="cx-detail-head">
              <h2 className="cx-detail-head__title">
                <span className={serviceChipClass(data)}>{data.status_label}</span>
                <span className="cv-chip cv-chip--type">{data.service_type_label}</span>
                {data.requested_by_client && <span className="cv-chip">طلبتَه من البوابة</span>}
              </h2>
            </div>

            <div className="cx-grid">
              <div className="cx-panel">
                <div className="cx-panel__head">بيانات الخدمة</div>
                <table className="cx-props">
                  <tbody>
                    <tr><th>الحالة</th><td>{data.status_label}</td></tr>
                    <tr><th>المحامي المسؤول</th><td>{data.assigned_lawyer?.name || 'لم يُحدَّد بعد'}</td></tr>
                    <tr><th>تاريخ الطلب</th><td>{formatServiceDate(data.created_at)}</td></tr>
                    <tr><th>بداية العمل</th><td>{formatServiceDate(data.start_date)}</td></tr>
                    <tr><th>الموعد المتوقع</th><td>{formatServiceDate(data.due_date)}</td></tr>
                    {data.completed_date && <tr><th>تاريخ الإنجاز</th><td>{formatServiceDate(data.completed_date)}</td></tr>}
                    {data.case && (
                      <tr><th>القضية المرتبطة</th><td><Link to={`/my-cases/${data.case.id}`}>{data.case.title}{data.case.file_number ? ` (#${data.case.file_number})` : ''}</Link></td></tr>
                    )}
                    <tr><th>آخر تحديث</th><td>{formatServiceDate(data.updated_at)}</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="cx-panel">
                <div className="cx-panel__head"><FileText size={14} /> الوصف</div>
                {data.description ? (
                  <div className="cv-desc">{data.description}</div>
                ) : (
                  <div className="cx-panel__empty">لا وصف مسجّل</div>
                )}
              </div>

              <div className="cx-panel">
                <div className="cx-panel__head"><Clock size={14} /> خطّ السير <em>{data.timeline.length}</em></div>
                {data.timeline.length === 0 ? (
                  <div className="cx-panel__empty">لا تحديثات بعد</div>
                ) : (
                  <ol className="cv-timeline">
                    {data.timeline.map(t => (
                      <li key={t.id} className="cv-tl">
                        <b>{t.title}</b>
                        <span>{formatServiceDate(t.date)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="cx-panel">
                <div className="cx-panel__head"><Paperclip size={14} /> المستندات <em>{data.documents.length}</em></div>
                {data.documents.length === 0 ? (
                  <div className="cx-panel__empty">لم يشارك المكتب مستندات بعد</div>
                ) : data.documents.map(doc => (
                  <div key={doc.id} className="cv-doc">
                    <FileText size={16} className="cv-doc__icon" />
                    <div className="cv-doc__body">
                      <div className="cv-doc__title">{doc.title}</div>
                      <div className="cv-doc__meta">
                        {RELATION_LABELS[doc.relation_type] && <span>{RELATION_LABELS[doc.relation_type]}</span>}
                        {doc.file_size ? <span>{formatFileSize(doc.file_size)}</span> : null}
                        <span>{formatServiceDate(doc.created_at)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cx-btn"
                      title="تنزيل"
                      onClick={() => void downloadDocument({
                        id: doc.id,
                        file_name: doc.file_name || doc.title,
                        mime_type: doc.mime_type || undefined,
                        cloud_file_id: doc.is_cloud ? doc.cloud_file_id : null,
                      })}
                    >
                      <Download size={14} /> تنزيل
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClientServiceDetail;
