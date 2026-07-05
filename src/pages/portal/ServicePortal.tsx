import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/api';

interface TimelineStep {
  label: string;
  done: boolean;
  current: boolean;
  /* الخدمة المبسطة: تفاصيل إضافية تظهر للعميل */
  done_at?: string | null;
  paused?: boolean;
  pause_reason?: string | null;
  note?: string | null;
}

interface PortalCountdown {
  start_date: string;
  due_date: string | null;
  total_days: number | null;
  elapsed_days: number;
  remaining_days: number | null;
  paused_days: number;
  is_paused: boolean;
  pause_reason: string | null;
  finished: boolean;
}

interface PortalData {
  audience: string;
  allow_upload: boolean;
  branding: { name: string; logo_url: string | null; primary_color: string };
  service: {
    title: string;
    service_number: string;
    type_arabic: string;
    status_arabic: string;
    completion_percentage: number;
    timeline: TimelineStep[];
    countdown?: PortalCountdown | null;
  };
  documents: Array<{ title: string; uploaded_at: string }>;
  deliverables?: Array<{
    title: string;
    type: string;
    format: string;
    created_at: string | null;
    payment_required: boolean;
    download_url: string | null;
  }>;
  opinion?: {
    available: boolean;
    is_paid: boolean;
    invoice: {
      invoice_number: string;
      total_amount: number;
      remaining_amount: number;
      status: string;
      status_arabic: string;
    } | null;
    download_url: string | null;
    title: string | null;
    message: string | null;
  } | null;
}

const ServicePortal: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/public/service-portal/${token}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        setError(json.message || 'الرابط غير صالح أو منتهٍ');
      }
    } catch {
      setError('تعذّر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadMsg(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE_URL}/public/service-portal/${token}/upload`, {
        method: 'POST',
        body: form,
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setUploadMsg({ type: 'ok', text: 'تم رفع المستند بنجاح' });
        await load();
      } else {
        setUploadMsg({ type: 'err', text: json.message || 'تعذّر رفع المستند' });
      }
    } catch {
      setUploadMsg({ type: 'err', text: 'تعذّر الاتصال بالخادم' });
    } finally {
      setUploading(false);
    }
  };

  const primary = data?.branding.primary_color || '#1e3a5f';

  return (
    <div className="sp-wrap" dir="rtl">
      <style>{`
        .sp-wrap { min-height: 100vh; background: #f1f5f9; font-family: 'Tajawal', system-ui, sans-serif; padding: 0 0 48px; }
        .sp-header { background: ${primary}; color: #fff; padding: 22px 16px; text-align: center; }
        .sp-header img { max-height: 56px; margin-bottom: 8px; }
        .sp-header h1 { margin: 0; font-size: 18px; font-weight: 700; }
        .sp-card { max-width: 760px; margin: 18px auto; background: #fff; border-radius: 14px; box-shadow: 0 2px 16px rgba(0,0,0,.06); padding: 22px; }
        .sp-title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
        .sp-sub { color: #64748b; font-size: 13px; margin-bottom: 18px; }
        .sp-progress-track { height: 12px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
        .sp-progress-fill { height: 100%; border-radius: 999px; transition: width .4s; }
        .sp-progress-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .sp-pct { font-weight: 700; font-size: 15px; }
        .sp-status-badge { background: #eff6ff; color: ${primary}; border: 1px solid #bfdbfe; border-radius: 999px; padding: 3px 12px; font-size: 12px; font-weight: 600; }
        .sp-section-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 26px 0 12px; }
        .sp-timeline { list-style: none; margin: 0; padding: 0; }
        .sp-step { display: flex; align-items: flex-start; gap: 10px; padding: 7px 0; }
        .sp-dot { width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0; border: 2px solid #cbd5e1; background: #fff; margin-top: 1px; }
        .sp-step.done .sp-dot { background: #16a34a; border-color: #16a34a; }
        .sp-step.current .sp-dot { background: ${primary}; border-color: ${primary}; box-shadow: 0 0 0 4px ${primary}22; }
        .sp-step-label { font-size: 14px; color: #334155; }
        .sp-step.current .sp-step-label { font-weight: 700; color: #0f172a; }
        .sp-step.done .sp-step-label { color: #16a34a; }
        .sp-step-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .sp-step-date { font-size: 11.5px; color: #94a3b8; }
        .sp-step-note { font-size: 12.5px; color: #475569; background: #f8fafc; border-inline-start: 2px solid #cbd5e1; padding: 4px 8px; border-radius: 6px; }
        .sp-step-paused { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: #b45309; background: #fef3c7; border-radius: 999px; padding: 2px 10px; align-self: flex-start; }
        .sp-days { display: flex; align-items: center; gap: 14px; margin-top: 16px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
        .sp-days-nums { display: flex; flex-wrap: wrap; gap: 4px 18px; font-size: 12.5px; color: #475569; }
        .sp-days-nums b { color: #0f172a; }
        .sp-days-paused { font-size: 12px; font-weight: 600; color: #b45309; }
        .sp-doc { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; }
        .sp-upload { border: 2px dashed #cbd5e1; border-radius: 12px; padding: 22px; text-align: center; cursor: pointer; color: #475569; }
        .sp-upload:hover { border-color: ${primary}; }
        .sp-btn { background: ${primary}; color: #fff; border: none; border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .sp-btn:disabled { opacity: .6; cursor: not-allowed; }
        .sp-msg { margin-top: 12px; padding: 10px 14px; border-radius: 10px; font-size: 13px; }
        .sp-msg.ok { background: #dcfce7; color: #166534; }
        .sp-msg.err { background: #fee2e2; color: #991b1b; }
        .sp-state { max-width: 520px; margin: 80px auto; text-align: center; color: #475569; font-size: 16px; }
        .sp-empty { color: #94a3b8; font-size: 13px; }
      `}</style>

      {loading ? (
        <div className="sp-state">جارٍ التحميل...</div>
      ) : error ? (
        <div className="sp-state">⚠️ {error}</div>
      ) : data ? (
        <>
          <div className="sp-header">
            {data.branding.logo_url && <img src={data.branding.logo_url} alt={data.branding.name} />}
            <h1>{data.branding.name}</h1>
          </div>

          <div className="sp-card">
            <div className="sp-title">{data.service.title}</div>
            <div className="sp-sub">{data.service.type_arabic} · رقم {data.service.service_number}</div>

            <div className="sp-progress-row">
              <span className="sp-status-badge">{data.service.status_arabic}</span>
              <span className="sp-pct" style={{ color: primary }}>{data.service.completion_percentage}%</span>
            </div>
            <div className="sp-progress-track">
              <div
                className="sp-progress-fill"
                style={{ width: `${data.service.completion_percentage}%`, background: primary }}
              />
            </div>

            {data.service.countdown && (
              <div className="sp-days">
                <div className="sp-days-nums">
                  <span>بدأت الخدمة <b>{new Date(data.service.countdown.start_date).toLocaleDateString('ar-SA')}</b></span>
                  {data.service.countdown.due_date && (
                    <span>التسليم المتوقع <b>{new Date(data.service.countdown.due_date).toLocaleDateString('ar-SA')}</b></span>
                  )}
                  {!data.service.countdown.finished && data.service.countdown.remaining_days !== null && (
                    <span>
                      المتبقي{' '}
                      <b>{Math.max(0, data.service.countdown.remaining_days)} يوم</b>
                    </span>
                  )}
                  {data.service.countdown.is_paused && (
                    <span className="sp-days-paused">
                      ⏸ العمل متوقف مؤقتاً{data.service.countdown.pause_reason ? ` — ${data.service.countdown.pause_reason}` : ''}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="sp-section-title">مراحل الإنجاز</div>
            <ul className="sp-timeline">
              {data.service.timeline.map((step, i) => (
                <li key={i} className={`sp-step ${step.done ? 'done' : ''} ${step.current ? 'current' : ''}`}>
                  <span className="sp-dot" />
                  <span className="sp-step-body">
                    <span className="sp-step-label">{step.label}</span>
                    {step.done && step.done_at && (
                      <span className="sp-step-date">
                        أُنجزت {new Date(step.done_at).toLocaleDateString('ar-SA')}
                      </span>
                    )}
                    {step.paused && (
                      <span className="sp-step-paused">
                        ⏸ متوقفة مؤقتاً{step.pause_reason ? ` — ${step.pause_reason}` : ''}
                      </span>
                    )}
                    {step.note && <span className="sp-step-note">{step.note}</span>}
                  </span>
                </li>
              ))}
            </ul>

            <div className="sp-section-title">المستندات المرفوعة</div>
            {data.documents.length > 0 ? (
              data.documents.map((doc, i) => (
                <div key={i} className="sp-doc">
                  📄 <span>{doc.title}</span>
                  <span style={{ marginInlineStart: 'auto', color: '#94a3b8', fontSize: 12 }}>
                    {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('ar-SA') : ''}
                  </span>
                </div>
              ))
            ) : (
              <p className="sp-empty">لم تُرفع أي مستندات بعد.</p>
            )}

            {data.deliverables && data.deliverables.length > 0 && (
              <>
                <div className="sp-section-title">وثائق المكتب الرسمية</div>
                {data.deliverables.map((d, i) => (
                  <div key={i} className="sp-doc">
                    📑 <span>{d.title}</span>
                    <span style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {d.created_at && (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>{d.created_at}</span>
                      )}
                      {d.download_url ? (
                        <a
                          className="sp-btn"
                          href={d.download_url}
                          style={{ padding: '6px 12px', fontSize: 12, textDecoration: 'none' }}
                        >
                          ⬇️ تحميل
                        </a>
                      ) : d.payment_required ? (
                        <span className="sp-status-badge">يُتاح بعد سداد الفاتورة</span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </>
            )}

            {data.opinion && (
              <>
                <div className="sp-section-title">الرأي القانوني</div>
                {data.opinion.invoice && (
                  <div className="sp-doc">
                    🧾 <span>الفاتورة {data.opinion.invoice.invoice_number}</span>
                    <span className="sp-status-badge" style={{ marginInlineStart: 'auto' }}>
                      {data.opinion.invoice.status_arabic}
                    </span>
                  </div>
                )}
                {data.opinion.download_url ? (
                  <>
                    {data.opinion.title && <div className="sp-doc">📑 <span>{data.opinion.title}</span></div>}
                    <a
                      className="sp-btn"
                      href={data.opinion.download_url}
                      style={{ display: 'inline-block', marginTop: 12, textDecoration: 'none' }}
                    >
                      ⬇️ تحميل خطاب الرأي القانوني
                    </a>
                  </>
                ) : (
                  <p className="sp-empty">{data.opinion.message}</p>
                )}
              </>
            )}

            {data.allow_upload && (
              <>
                <div className="sp-section-title">رفع مستند</div>
                <label className="sp-upload">
                  <input
                    ref={fileRef}
                    type="file"
                    style={{ display: 'none' }}
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                      e.target.value = '';
                    }}
                  />
                  {uploading ? 'جارٍ الرفع...' : 'اضغط لاختيار ملف ورفعه'}
                </label>
                {uploadMsg && <div className={`sp-msg ${uploadMsg.type}`}>{uploadMsg.text}</div>}
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default ServicePortal;
