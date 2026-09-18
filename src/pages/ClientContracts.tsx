import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSignature, ChevronLeft, ShieldCheck, PenLine, Clock, CheckCircle } from 'lucide-react';
import { clientContractService, type ClientContractSummary } from '../services/signatureService';

/**
 * «عقودي» في بوابة العميل — العقود التي أرسلها المكتب (لا المسودات)، مع حالة التوقيع
 * وزر مباشر للتوقيع عند الانتظار. الخادم يفرض الملكية في /client/contracts.
 */
const ClientContracts: React.FC = () => {
  const [items, setItems] = useState<ClientContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    clientContractService.list()
      .then((res) => { if (alive) setItems(res.data ?? []); })
      .catch((e: any) => { if (alive) setError(e?.message || 'تعذّر تحميل العقود'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const pending = items.filter((c) => c.status === 'pending_signature').length;

  return (
    <div className="client-cases">
      <div className="client-cases__header">
        <div className="client-cases__title-section">
          <div className="client-cases__icon"><FileSignature size={20} /></div>
          <h1 className="client-cases__title">عقودي</h1>
          <span className="client-cases__count">{items.length} عقد</span>
          {pending > 0 && <span style={pendingPill}>{pending} بانتظار توقيعك</span>}
        </div>
      </div>

      {loading ? (
        <div className="client-cases__loading"><div className="client-cases__spinner" /></div>
      ) : error ? (
        <div style={muted}>{error}</div>
      ) : items.length === 0 ? (
        <div style={muted}>لا توجد عقود مرسلة إليك بعد.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((c) => (
            <Link key={c.id} to={`/my-contracts/${c.id}`} style={{ ...row, textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{c.title || 'عقد'} <span style={badge}>{c.contract_number}</span></div>
                  <div style={{ fontSize: 12, color: 'var(--quiet-gray-500, #6b7280)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {c.case && <span>القضية {c.case.file_number}</span>}
                    {c.contract_date && <span>{c.contract_date}</span>}
                    {c.grand_total != null && <span>{formatSar(c.grand_total)}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusChip c={c} />
                  <ChevronLeft size={16} style={{ color: 'var(--quiet-gray-400, #9ca3af)' }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

function StatusChip({ c }: { c: ClientContractSummary }) {
  if (c.status === 'pending_signature') {
    const sadq = c.signature_request?.provider === 'sadq';
    return (
      <span style={{ ...chip, background: 'var(--status-info-bg, #eff6ff)', color: 'var(--status-info, #1d4ed8)' }}>
        {sadq ? <ShieldCheck size={14} /> : <PenLine size={14} />}
        {sadq ? 'بانتظار توقيعك بنفاذ' : 'بانتظار توقيعك'}
      </span>
    );
  }
  if (c.status === 'active' || c.status === 'completed') {
    return (
      <span style={{ ...chip, background: 'var(--status-success-bg, #ecfdf5)', color: 'var(--status-success, #047857)' }}>
        <CheckCircle size={14} /> {c.signature_method === 'sadq' ? 'موقّع وموثّق' : 'موقّع'}
      </span>
    );
  }
  return <span style={{ ...chip, background: 'var(--quiet-gray-100, #f3f4f6)' }}><Clock size={14} /> {c.status_label}</span>;
}

function formatSar(v: number | string) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return `${n.toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ر.س`;
}

const muted: React.CSSProperties = { padding: 32, textAlign: 'center', color: 'var(--quiet-gray-500, #6b7280)' };
const row: React.CSSProperties = { border: '1px solid var(--quiet-gray-200, #e5e7eb)', borderRadius: 10, padding: '14px 16px', background: 'var(--dashboard-card, #fff)', display: 'block' };
const badge: React.CSSProperties = { background: 'var(--quiet-gray-100, #f3f4f6)', borderRadius: 6, padding: '1px 6px', fontSize: 11, fontWeight: 500, marginInlineStart: 6 };
const chip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' };
const pendingPill: React.CSSProperties = { ...chip, background: 'var(--status-warning-bg, #fffbeb)', color: 'var(--status-warning, #b45309)', marginInlineStart: 8 };

export default ClientContracts;
