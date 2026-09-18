import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, FileSignature, Download, ShieldCheck, PenLine, CheckCircle, XCircle, ExternalLink, Info } from 'lucide-react';
import { clientContractService, type ClientContractDetail as ContractData } from '../services/signatureService';
import SignaturePad from '../components/signatures/SignaturePad';

/**
 * صفحة العقد في بوابة العميل: يقرأ العقد (PDF داخل الصفحة)، ثم يوقّع توقيعاً عادياً
 * (رسم + اسم + إقرار) أو يفتح رابط التوقيع الموثّق بنفاذ إن أرسله المكتب عبر صادق،
 * أو يرفض مع سبب. الخادم يفرض الملكية وحالة العقد.
 */
const ClientContractDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contractId = Number(id);

  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [signature, setSignature] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientContractService.show(contractId);
      setContract(res.data);
      setSignerName((prev) => prev || res.data.signer_name_default || '');
    } catch (e: any) {
      setError(e?.message || 'تعذّر تحميل العقد');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (contractId) void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [contractId]);

  // PDF داخل الصفحة (blob عبر Bearer) — يُعاد تحميله بعد التوقيع ليظهر الموقّع.
  useEffect(() => {
    let current: string | null = null;
    if (!contract) return;
    clientContractService.pdfBlobUrl(contract.id)
      .then((url) => { current = url; setPdfUrl(url); })
      .catch(() => setPdfUrl(null));
    return () => { if (current) URL.revokeObjectURL(current); };
  }, [contract?.id, contract?.status, contract?.signed_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitSign = async () => {
    if (!contract || !signature) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await clientContractService.sign(contract.id, { signature_image: signature, signer_name: signerName.trim(), agreed });
      setMsg({ kind: 'ok', text: res.message || 'تم توقيع العقد. شكراً لك.' });
      await load();
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.message || 'تعذّر التوقيع' });
    } finally {
      setBusy(false);
    }
  };

  const submitDecline = async () => {
    if (!contract) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await clientContractService.decline(contract.id, declineReason.trim());
      setMsg({ kind: 'ok', text: res.message || 'أبلغنا المكتب.' });
      setDeclineOpen(false);
      setTimeout(() => navigate('/my-contracts'), 1200);
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.message || 'تعذّر إرسال الرفض' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="client-cases"><div className="client-cases__loading"><div className="client-cases__spinner" /></div></div>;
  if (error || !contract) return <div className="client-cases"><div style={muted}>{error || 'العقد غير موجود'}</div></div>;

  const req = contract.signature_request;
  const sadqPending = contract.status === 'pending_signature' && req?.provider === 'sadq' && (req.status === 'pending' || req.status === 'viewed');
  const signed = !!contract.signed_at && (contract.status === 'active' || contract.status === 'completed');
  const canSubmit = !!signature && signerName.trim().length >= 2 && agreed && !busy;

  return (
    <div className="client-cases">
      <div className="client-cases__header">
        <div className="client-cases__title-section">
          <button type="button" onClick={() => navigate('/my-contracts')} style={iconBtn} aria-label="رجوع"><ArrowRight size={18} /></button>
          <div className="client-cases__icon"><FileSignature size={20} /></div>
          <h1 className="client-cases__title">{contract.title || 'عقد'}</h1>
          <span style={badge}>{contract.contract_number}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => clientContractService.openPdf(contract.id).catch(() => setMsg({ kind: 'err', text: 'تعذّر فتح الملف' }))} style={ghostBtn}>
            <Download size={15} /> {signed ? 'تحميل العقد الموقّع' : 'تحميل PDF'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16, alignItems: 'start' }} className="client-contract-grid">
        {/* العقد نفسه */}
        <div className="detail-card">
          <div className="detail-card__header"><h2 className="detail-card__title">نص العقد</h2></div>
          <div className="detail-card__body" style={{ padding: 0 }}>
            {pdfUrl ? (
              <iframe title="العقد" src={pdfUrl} style={{ width: '100%', height: 720, border: 0, borderRadius: '0 0 10px 10px' }} />
            ) : (
              <div style={{ padding: 16 }}>
                <div dangerouslySetInnerHTML={{ __html: contract.content }} style={{ lineHeight: 1.9 }} />
              </div>
            )}
          </div>
        </div>

        {/* لوحة التوقيع / الحالة */}
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="detail-card">
            <div className="detail-card__header"><h2 className="detail-card__title">بيانات العقد</h2></div>
            <div className="detail-card__body" style={{ fontSize: 13, display: 'grid', gap: 6 }}>
              {contract.firm_name && <Row label="المكتب">{contract.firm_name}</Row>}
              {contract.case && <Row label="القضية">{contract.case.file_number} — {contract.case.title}</Row>}
              {contract.contract_date && <Row label="تاريخ العقد">{contract.contract_date}</Row>}
              {contract.grand_total != null && <Row label="الإجمالي مع الضريبة">{fmt(contract.grand_total)}</Row>}
              {contract.payment_terms?.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>الدفعات</div>
                  {contract.payment_terms.map((t) => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid var(--quiet-gray-100, #f3f4f6)' }}>
                      <span>{t.description || 'دفعة'}{t.due_date ? ` · ${t.due_date}` : ''}</span>
                      <span style={{ fontWeight: 600 }}>{fmt(t.total_with_vat ?? t.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {signed && (
            <div className="detail-card">
              <div className="detail-card__body" style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--status-success, #047857)', fontWeight: 700 }}>
                  {contract.signature_method === 'sadq' ? <ShieldCheck size={18} /> : <CheckCircle size={18} />}
                  {contract.signature_method === 'sadq' ? 'العقد موقّع وموثّق عبر صادق' : 'العقد موقّع'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--quiet-gray-600, #4b5563)' }}>
                  {contract.signed_by && <div>الموقّع: {contract.signed_by}</div>}
                  {contract.signed_at && <div>التاريخ: {new Date(contract.signed_at).toLocaleString('ar-SA')}</div>}
                  <div>{contract.signature_method_label}</div>
                </div>
              </div>
            </div>
          )}

          {sadqPending && req && (
            <div className="detail-card">
              <div className="detail-card__header"><h2 className="detail-card__title"><ShieldCheck size={16} /> توقيع موثّق بهوية نفاذ</h2></div>
              <div className="detail-card__body" style={{ fontSize: 13, display: 'grid', gap: 10 }}>
                <p style={{ margin: 0, lineHeight: 1.8 }}>
                  أرسل المكتب هذا العقد للتوقيع الموثّق عبر منصة «صادق». ستفتح صفحة التوقيع وتتحقق من هويتك بتطبيق نفاذ، ثم يعود العقد الموقّع تلقائياً إلى هنا.
                </p>
                {req.signing_url ? (
                  <a href={req.signing_url} target="_blank" rel="noreferrer" style={{ ...primaryBtn, textDecoration: 'none', justifyContent: 'center' }}>
                    <ExternalLink size={15} /> فتح صفحة التوقيع بنفاذ
                  </a>
                ) : (
                  <div style={{ color: 'var(--quiet-gray-500, #6b7280)' }}>رابط التوقيع وصلك عبر الرسالة التي أرسلها المكتب.</div>
                )}
                {req.expires_at && <div style={{ color: 'var(--quiet-gray-500, #6b7280)' }}>صالح حتى {new Date(req.expires_at).toLocaleDateString('ar-SA')}</div>}
              </div>
            </div>
          )}

          {contract.can_sign && (
            <div className="detail-card">
              <div className="detail-card__header"><h2 className="detail-card__title"><PenLine size={16} /> توقيع العقد</h2></div>
              <div className="detail-card__body" style={{ display: 'grid', gap: 10, fontSize: 13 }}>
                <SignaturePad onChange={setSignature} disabled={busy} />
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontWeight: 600 }}>اسمك كما يظهر في العقد</span>
                  <input value={signerName} onChange={(e) => setSignerName(e.target.value)} style={input} maxLength={120} />
                </label>
                <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.7, cursor: 'pointer' }}>
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 4 }} />
                  <span>قرأت العقد كاملاً وأوافق على بنوده، وأقرّ بأن هذا التوقيع الإلكتروني يعبّر عن موافقتي.</span>
                </label>
                <button type="button" onClick={() => void submitSign()} disabled={!canSubmit} style={{ ...primaryBtn, justifyContent: 'center', opacity: canSubmit ? 1 : 0.55 }}>
                  <CheckCircle size={15} /> {busy ? 'جارٍ التوقيع...' : 'توقيع العقد'}
                </button>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', color: 'var(--quiet-gray-500, #6b7280)', fontSize: 12, lineHeight: 1.6 }}>
                  <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>يُسجَّل مع توقيعك وقت التوقيع وعنوان الاتصال كإثبات، وتُحفظ نسخة PDF موقّعة لا تتغيّر.</span>
                </div>
                {contract.can_decline && !declineOpen && (
                  <button type="button" onClick={() => setDeclineOpen(true)} style={{ ...ghostBtn, justifyContent: 'center', color: 'var(--status-danger, #b91c1c)' }}>
                    <XCircle size={15} /> لا أوافق على العقد
                  </button>
                )}
                {declineOpen && (
                  <div style={{ display: 'grid', gap: 8, borderTop: '1px solid var(--quiet-gray-100, #f3f4f6)', paddingTop: 10 }}>
                    <span style={{ fontWeight: 600 }}>ما سبب عدم الموافقة؟ (اختياري)</span>
                    <textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} style={{ ...input, minHeight: 70, resize: 'vertical' }} maxLength={1000} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => void submitDecline()} disabled={busy} style={{ ...primaryBtn, background: 'var(--status-danger, #b91c1c)' }}>تأكيد الرفض</button>
                      <button type="button" onClick={() => setDeclineOpen(false)} style={ghostBtn}>تراجع</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {msg && (
            <div style={{ padding: '10px 12px', borderRadius: 8, fontSize: 13, background: msg.kind === 'ok' ? 'var(--status-success-bg, #ecfdf5)' : 'var(--status-danger-bg, #fef2f2)', color: msg.kind === 'ok' ? 'var(--status-success, #047857)' : 'var(--status-danger, #b91c1c)' }}>
              {msg.text}
            </div>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .client-contract-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ color: 'var(--quiet-gray-500, #6b7280)' }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'start' }}>{children}</span>
    </div>
  );
}

function fmt(v: number | string | null | undefined) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ر.س`;
}

const muted: React.CSSProperties = { padding: 32, textAlign: 'center', color: 'var(--quiet-gray-500, #6b7280)' };
const badge: React.CSSProperties = { background: 'var(--quiet-gray-100, #f3f4f6)', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 500 };
const input: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--quiet-gray-200, #e5e7eb)', background: 'transparent', color: 'inherit', fontFamily: 'inherit', fontSize: 13 };
const ghostBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--quiet-gray-200, #e5e7eb)', background: 'transparent', color: 'inherit', fontWeight: 600, fontSize: 13 };
const primaryBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, cursor: 'pointer', border: 'none', background: 'var(--law-navy, #1f3a5f)', color: '#fff', fontWeight: 700, fontSize: 13 };
const iconBtn: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, display: 'inline-flex', color: 'inherit' };

export default ClientContractDetail;
