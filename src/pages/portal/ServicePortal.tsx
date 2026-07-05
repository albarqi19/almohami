import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

/**
 * بوابة متابعة العميل (بلا تسجيل دخول) — بهوية «نشرة الصباح / الجريدة الرسمية»:
 * خلفية بيج دافئة وبطاقة بيضاء صافية بخط ذهبي رفيع وعناوين أقسام متباعدة الأحرف،
 * صفوف بنقاط ملونة وخطوط شعرية — فاتحة دائماً، بخط الموقع (IBM Plex Sans Arabic)،
 * ومصمّمة للجوال أولاً.
 */

/* لوحة «الجريدة الرسمية» — نفس ألوان نشرة الصباح */
const C = {
  bg: '#EFE9DD',
  paper: '#FFFFFF',
  ink: '#16202F',
  inkStrong: '#102028',
  mute: '#5D6675',
  faint: '#8B93A1',
  gold: '#C9A35D',
  goldDeep: '#8C6D3F',
  rust: '#B0543F',
  amber: '#CF8A2E',
  green: '#1FAE6A',
  hair: '#ECE6D8',
  hairSoft: '#F1ECE0',
};

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

  /* التاريخ الهجري/الميلادي — كرأس النشرة */
  const dates = useMemo(() => {
    const now = new Date();
    let hijri = '';
    let dow = '';
    try {
      hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(now) + 'هـ';
      dow = new Intl.DateTimeFormat('ar', { weekday: 'long' }).format(now);
    } catch { /* متصفح بلا تقويم هجري */ }
    const greg = now.toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'long', day: 'numeric' });
    return { hijri, greg, dow };
  }, []);

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ar-SA');
  const cd = data?.service.countdown ?? null;
  const doneCount = data?.service.timeline.filter((s) => s.done).length ?? 0;
  const overdue = !!cd && !cd.finished && cd.remaining_days !== null && cd.remaining_days < 0;

  return (
    <div className="spv-wrap" dir="rtl">
      <style>{`
        /* هوية «نشرة الصباح» — بيج دافئ، ورقة بيضاء، ذهبي رفيع. فاتحة دائماً. */
        .spv-wrap {
          min-height: 100vh;
          background: ${C.bg};
          color-scheme: light;
          font-family: "IBM Plex Sans Arabic", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: ${C.ink};
          padding: 26px 12px 20px;
          -webkit-text-size-adjust: 100%;
        }

        /* بطاقة الرسالة — ورقة صافية بحواف قائمة كالنشرة */
        .spv-doc {
          max-width: 600px;
          margin: 0 auto;
          background: ${C.paper};
          padding: 30px 32px 24px;
        }
        @media (max-width: 480px) {
          .spv-wrap { padding: 14px 8px 16px; }
          .spv-doc { padding: 22px 18px 18px; }
        }

        /* الرأس: الهوية يمين + التاريخ يسار */
        .spv-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 16px;
        }
        .spv-brand { display: flex; align-items: center; gap: 11px; min-width: 0; }
        .spv-brand img { display: block; max-height: 38px; max-width: 120px; object-fit: contain; }
        .spv-brand__mark {
          width: 38px; height: 38px;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid ${C.gold};
          color: ${C.goldDeep};
          font-size: 18px;
        }
        .spv-brand__name {
          font-size: 15px;
          font-weight: 700;
          color: ${C.inkStrong};
          line-height: 1.4;
        }
        .spv-date { text-align: left; flex-shrink: 0; }
        .spv-date__dow { font-size: 11px; color: ${C.faint}; }
        .spv-date__hijri { font-size: 13.5px; font-weight: 700; color: ${C.inkStrong}; }
        .spv-date__greg { font-size: 11px; color: ${C.mute}; }

        /* الخط الذهبي الرفيع */
        .spv-goldline { height: 2px; background: ${C.gold}; }

        /* الافتتاحية */
        .spv-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
          color: ${C.goldDeep};
          padding-top: 20px;
        }
        .spv-title {
          font-size: 20px;
          font-weight: 700;
          color: ${C.inkStrong};
          margin: 8px 0 0;
          line-height: 1.6;
        }
        .spv-sub { font-size: 12.5px; color: ${C.mute}; padding-top: 5px; }

        /* صف الملخص — أرقام مفصولة بخطوط عمودية */
        .spv-summary {
          display: flex;
          margin-top: 22px;
        }
        .spv-summary > div {
          flex: 1;
          text-align: center;
          padding: 2px 6px;
        }
        .spv-summary > div + div { border-inline-end: 1px solid ${C.hair}; }
        .spv-summary b {
          display: block;
          font-size: 22px;
          font-weight: 700;
          color: ${C.inkStrong};
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }
        .spv-summary b.alert { color: ${C.rust}; }
        .spv-summary b.ok { color: ${C.green}; }
        .spv-summary span { display: block; font-size: 11px; color: ${C.mute}; padding-top: 4px; }

        /* شريط التقدم الرفيع */
        .spv-track { display: flex; height: 3px; margin-top: 18px; }
        .spv-track i { display: block; height: 3px; background: ${C.gold}; }
        .spv-track em { display: block; height: 3px; background: ${C.hair}; flex: 1; }

        /* سطر الإيقاف — بإطار كهرماني رفيع */
        .spv-paused {
          margin-top: 16px;
          border: 1px solid ${C.amber};
          padding: 9px 12px;
          font-size: 12.5px;
          font-weight: 600;
          color: ${C.amber};
          line-height: 1.8;
        }

        /* عنوان قسم: eyebrow ذهبي + عدّاد يسار */
        .spv-sec { margin-top: 28px; }
        .spv-sec__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .spv-sec__title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: ${C.goldDeep};
        }
        .spv-sec__count { font-size: 11px; color: ${C.faint}; font-variant-numeric: tabular-nums; }

        /* صفوف بنقطة ملونة وخط شعري علوي — نمط النشرة */
        .spv-item {
          padding: 13px 0;
          border-top: 1px solid ${C.hair};
          margin-top: 12px;
        }
        .spv-item + .spv-item { margin-top: 0; }
        .spv-item__line { display: flex; align-items: baseline; gap: 8px; }
        .spv-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          align-self: center;
          background: ${C.faint};
        }
        .spv-dot--done { background: ${C.green}; }
        .spv-dot--current { background: ${C.gold}; }
        .spv-dot--paused { background: ${C.amber}; }
        .spv-item__title { font-size: 14px; font-weight: 700; color: ${C.inkStrong}; line-height: 1.6; min-width: 0; }
        .spv-item--upcoming .spv-item__title { font-weight: 400; color: ${C.mute}; }
        .spv-item__meta { font-size: 12px; color: ${C.mute}; padding: 3px 16px 0; line-height: 1.7; }
        .spv-item__paused {
          display: inline-block;
          margin: 6px 16px 0;
          font-size: 11.5px;
          font-weight: 600;
          color: ${C.amber};
          border: 1px solid ${C.amber};
          padding: 1px 10px;
        }
        .spv-item__note {
          margin: 7px 16px 0;
          font-size: 12.5px;
          color: ${C.ink};
          line-height: 1.9;
          border-inline-start: 2px solid ${C.gold};
          padding-inline-start: 12px;
        }

        /* صف وثيقة: عنوان + تاريخ + فعل تحميل */
        .spv-file {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 0;
          border-top: 1px solid ${C.hair};
          margin-top: 12px;
        }
        .spv-file + .spv-file { margin-top: 0; }
        .spv-file__t { flex: 1; min-width: 0; font-size: 13.5px; font-weight: 700; color: ${C.inkStrong}; line-height: 1.6; word-break: break-word; }
        .spv-file__d { font-size: 11px; color: ${C.faint}; white-space: nowrap; }
        .spv-dl {
          flex-shrink: 0;
          font-size: 12px;
          font-weight: 700;
          color: ${C.goldDeep};
          border: 1px solid ${C.gold};
          padding: 5px 14px;
          text-decoration: none;
          white-space: nowrap;
          background: ${C.paper};
          font-family: inherit;
          cursor: pointer;
        }
        .spv-tag {
          flex-shrink: 0;
          font-size: 11px;
          font-weight: 600;
          color: ${C.amber};
          border: 1px solid ${C.amber};
          padding: 3px 10px;
          white-space: nowrap;
        }

        /* الرفع */
        .spv-upload {
          display: block;
          margin-top: 14px;
          border: 1px dashed ${C.gold};
          padding: 16px 14px;
          text-align: center;
          font-size: 13px;
          color: ${C.goldDeep};
          cursor: pointer;
        }
        .spv-msg { margin-top: 10px; padding: 9px 12px; font-size: 12.5px; border: 1px solid; line-height: 1.7; }
        .spv-msg.ok { color: ${C.green}; border-color: ${C.green}; }
        .spv-msg.err { color: ${C.rust}; border-color: ${C.rust}; }

        .spv-empty { font-size: 12.5px; color: ${C.faint}; margin: 10px 0 0; line-height: 1.8; }

        /* التذييل داخل البطاقة */
        .spv-hair { height: 1px; background: ${C.hair}; margin-top: 28px; }
        .spv-foot { text-align: center; padding-top: 18px; font-size: 12px; color: ${C.mute}; }
        .spv-foot b { color: ${C.inkStrong}; }

        /* سطر النظام خارج البطاقة */
        .spv-sys { text-align: center; font-size: 11px; color: #9A9281; padding-top: 14px; }

        .spv-state {
          max-width: 420px;
          margin: 90px auto;
          text-align: center;
          color: ${C.mute};
          font-size: 15px;
          line-height: 1.9;
        }
      `}</style>

      {loading ? (
        <div className="spv-state">جارٍ التحميل…</div>
      ) : error ? (
        <div className="spv-state">⚠️ {error}</div>
      ) : data ? (
        <>
          <div className="spv-doc">
            {/* الرأس: الهوية + التاريخ */}
            <div className="spv-head">
              <div className="spv-brand">
                {data.branding.logo_url ? (
                  <img src={data.branding.logo_url} alt={data.branding.name} />
                ) : (
                  <span className="spv-brand__mark">◈</span>
                )}
                <span className="spv-brand__name">{data.branding.name}</span>
              </div>
              <div className="spv-date">
                {dates.dow && <div className="spv-date__dow">{dates.dow}</div>}
                {dates.hijri && <div className="spv-date__hijri">{dates.hijri}</div>}
                <div className="spv-date__greg">{dates.greg}</div>
              </div>
            </div>

            <div className="spv-goldline" />

            {/* الافتتاحية */}
            <div className="spv-eyebrow">متابعة خدمتك</div>
            <h1 className="spv-title">{data.service.title}</h1>
            <div className="spv-sub">
              {data.service.type_arabic} · رقم {data.service.service_number} · {data.service.status_arabic}
            </div>

            {/* صف الملخص */}
            <div className="spv-summary">
              <div>
                <b className={data.service.completion_percentage >= 100 ? 'ok' : ''}>{data.service.completion_percentage}٪</b>
                <span>نسبة الإنجاز</span>
              </div>
              <div>
                <b>{doneCount}/{data.service.timeline.length}</b>
                <span>مراحل منجزة</span>
              </div>
              {cd && !cd.finished && cd.remaining_days !== null && (
                <div>
                  <b className={overdue ? 'alert' : ''}>{Math.abs(cd.remaining_days)}</b>
                  <span>{overdue ? 'يوم تأخير' : 'يوم متبقٍ'}</span>
                </div>
              )}
            </div>

            {/* شريط التقدم الرفيع */}
            <div className="spv-track">
              <i style={{ width: `${data.service.completion_percentage}%` }} />
              <em />
            </div>

            {/* مدة الخدمة */}
            {cd && (
              <div className="spv-sub" style={{ paddingTop: 10 }}>
                بدأت {fmtDate(cd.start_date)}
                {cd.due_date && <> · التسليم المتوقع {fmtDate(cd.due_date)}</>}
              </div>
            )}
            {cd?.is_paused && (
              <div className="spv-paused">
                ⏸ العمل متوقف مؤقتاً{cd.pause_reason ? ` — ${cd.pause_reason}` : ''}
              </div>
            )}

            {/* ====== مراحل الإنجاز ====== */}
            <div className="spv-sec">
              <div className="spv-sec__head">
                <span className="spv-sec__title">◈&nbsp; مراحل الإنجاز</span>
                <span className="spv-sec__count">{doneCount} من {data.service.timeline.length}</span>
              </div>
              {data.service.timeline.map((step, i) => (
                <div
                  key={i}
                  className={`spv-item${!step.done && !step.current && !step.paused ? ' spv-item--upcoming' : ''}`}
                >
                  <div className="spv-item__line">
                    <span
                      className={`spv-dot${step.done ? ' spv-dot--done' : step.paused ? ' spv-dot--paused' : step.current ? ' spv-dot--current' : ''}`}
                    />
                    <span className="spv-item__title">{step.label}</span>
                  </div>
                  {step.done && step.done_at && (
                    <div className="spv-item__meta">أُنجزت {fmtDate(step.done_at)}</div>
                  )}
                  {step.paused && (
                    <span className="spv-item__paused">
                      ⏸ متوقفة مؤقتاً{step.pause_reason ? ` — ${step.pause_reason}` : ''}
                    </span>
                  )}
                  {step.note && <div className="spv-item__note">{step.note}</div>}
                </div>
              ))}
            </div>

            {/* ====== وثائق المكتب ====== */}
            {data.deliverables && data.deliverables.length > 0 && (
              <div className="spv-sec">
                <div className="spv-sec__head">
                  <span className="spv-sec__title">✧&nbsp; وثائق المكتب</span>
                  <span className="spv-sec__count">{data.deliverables.length}</span>
                </div>
                {data.deliverables.map((d, i) => (
                  <div key={i} className="spv-file">
                    <span className="spv-file__t">{d.title}</span>
                    {d.created_at && <span className="spv-file__d">{d.created_at}</span>}
                    {d.download_url ? (
                      <a className="spv-dl" href={d.download_url}>تحميل</a>
                    ) : d.payment_required ? (
                      <span className="spv-tag">يُتاح بعد السداد</span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {/* ====== الرأي القانوني ====== */}
            {data.opinion && (
              <div className="spv-sec">
                <div className="spv-sec__head">
                  <span className="spv-sec__title">⚖&nbsp; الرأي القانوني</span>
                </div>
                {data.opinion.invoice && (
                  <div className="spv-file">
                    <span className="spv-file__t">الفاتورة {data.opinion.invoice.invoice_number}</span>
                    <span className="spv-tag">{data.opinion.invoice.status_arabic}</span>
                  </div>
                )}
                {data.opinion.download_url ? (
                  <div className="spv-file">
                    <span className="spv-file__t">{data.opinion.title ?? 'خطاب الرأي القانوني'}</span>
                    <a className="spv-dl" href={data.opinion.download_url}>تحميل</a>
                  </div>
                ) : (
                  <p className="spv-empty">{data.opinion.message}</p>
                )}
              </div>
            )}

            {/* ====== مستنداتك ====== */}
            <div className="spv-sec">
              <div className="spv-sec__head">
                <span className="spv-sec__title">✓&nbsp; مستنداتك المرفوعة</span>
                {data.documents.length > 0 && <span className="spv-sec__count">{data.documents.length}</span>}
              </div>
              {data.documents.length > 0 ? (
                data.documents.map((doc, i) => (
                  <div key={i} className="spv-file">
                    <span className="spv-file__t" style={{ fontWeight: 400 }}>{doc.title}</span>
                    <span className="spv-file__d">{doc.uploaded_at ? fmtDate(doc.uploaded_at) : ''}</span>
                  </div>
                ))
              ) : (
                <p className="spv-empty">لم تُرفع أي مستندات بعد.</p>
              )}

              {data.allow_upload && (
                <>
                  <label className="spv-upload">
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
                    {uploading ? 'جارٍ الرفع…' : 'اضغط لاختيار ملف ورفعه للمكتب'}
                  </label>
                  {uploadMsg && <div className={`spv-msg ${uploadMsg.type}`}>{uploadMsg.text}</div>}
                </>
              )}
            </div>

            {/* التذييل */}
            <div className="spv-hair" />
            <div className="spv-foot">
              تحديث مباشر من <b>{data.branding.name}</b>
            </div>
          </div>

          <div className="spv-sys">نظام الرائد · الديوان الرقمي</div>
        </>
      ) : null}
    </div>
  );
};

export default ServicePortal;
