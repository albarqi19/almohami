// تبويب «عروض الأتعاب» داخل صفحة العميل — قائمة + إنشاء/تحرير/إرسال عبر FeeProposalModal.
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Pencil, Send, Loader2, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  feeProposalService,
  FEE_PROPOSAL_STATUS_LABELS,
  type FeeProposal,
} from '../services/feeProposalService';
import { FeeProposalModal } from './FeeProposalModal';

interface Props {
  clientId: number;
  clientName?: string;
  cases?: Array<{ id: number; title: string; file_number: string }>;
}

const ClientFeeProposalsTab: React.FC<Props> = ({ clientId, clientName, cases = [] }) => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FeeProposal | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['client-fee-proposals', clientId],
    queryFn: () => feeProposalService.list({ client_id: clientId, per_page: 100 }),
    enabled: !!clientId,
  });
  const proposals: FeeProposal[] = (data?.data as FeeProposal[]) ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['client-fee-proposals', clientId] });

  const money = (n: string | number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n)) + ' ر.س';

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (p: FeeProposal) => {
    if (p.status !== 'draft') { toast.info('العرض المُرسَل غير قابل للتعديل. أنشئ نسخة جديدة.'); return; }
    feeProposalService.get(p.id).then((r) => { setEditing(r.data); setModalOpen(true); });
  };

  const send = async (p: FeeProposal) => {
    try {
      setBusyId(p.id);
      const res = await feeProposalService.send(p.id);
      res.success ? toast.success(`${res.message}${res.number ? ` (صادر ${res.number})` : ''}`) : toast.error(res.message);
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذّر الإرسال'); }
    finally { setBusyId(null); }
  };

  const setStatus = async (p: FeeProposal, status: 'accepted' | 'rejected') => {
    try { setBusyId(p.id); await feeProposalService.setStatus(p.id, status); toast.success('تم تحديث الحالة'); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذّر التحديث'); }
    finally { setBusyId(null); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>عروض الأتعاب والأسعار المرسلة لهذا العميل</span>
        <button type="button" className="fpm-btn fpm-btn--primary" onClick={openNew}><Plus size={14} /> عرض جديد</button>
      </div>

      {isLoading ? (
        <div className="fpl-empty"><Loader2 size={18} className="fpm-spin" /> جارٍ التحميل…</div>
      ) : proposals.length === 0 ? (
        <div className="fpl-empty">لا توجد عروض بعد — أنشئ أول عرض أتعاب.</div>
      ) : (
        proposals.map((p) => (
          <div key={p.id} className="fpl-row">
            <FileText size={16} style={{ color: 'var(--law-navy, var(--color-primary))', flexShrink: 0 }} />
            <div className="fpl-row__main">
              <div className="fpl-row__title">{p.title || p.type_label}</div>
              <div className="fpl-row__sub">
                <span className="fpl-num">{p.proposal_number}</span>
                {p.outgoing_number ? <> · صادر <span className="fpl-num">{p.outgoing_number}</span></> : null}
                {p.valid_until ? ` · ساري حتى ${p.valid_until}` : ''}
              </div>
            </div>
            <span className={`fpl-badge fpl-badge--${p.status}`}>{FEE_PROPOSAL_STATUS_LABELS[p.status]}</span>
            <span className="fpl-total">{money(p.total)}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" className="fpm-btn fpm-btn--ghost" title="معاينة" onClick={() => feeProposalService.openPreview(p.id)} style={{ padding: 6 }}><Eye size={14} /></button>
              {p.status === 'draft' && <button type="button" className="fpm-btn fpm-btn--ghost" title="تعديل" onClick={() => openEdit(p)} style={{ padding: 6 }}><Pencil size={14} /></button>}
              {p.status === 'draft' && <button type="button" className="fpm-btn fpm-btn--primary" title="إرسال" disabled={busyId === p.id} onClick={() => send(p)} style={{ padding: 6 }}>{busyId === p.id ? <Loader2 size={14} className="fpm-spin" /> : <Send size={14} />}</button>}
              {p.status === 'sent' && <>
                <button type="button" className="fpm-btn fpm-btn--ghost" title="تم القبول" disabled={busyId === p.id} onClick={() => setStatus(p, 'accepted')} style={{ padding: 6, color: '#16a34a' }}><CheckCircle2 size={14} /></button>
                <button type="button" className="fpm-btn fpm-btn--ghost" title="مرفوض" disabled={busyId === p.id} onClick={() => setStatus(p, 'rejected')} style={{ padding: 6, color: '#dc2626' }}><XCircle size={14} /></button>
              </>}
            </div>
          </div>
        ))
      )}

      <FeeProposalModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clientId={clientId}
        clientName={clientName}
        cases={cases}
        existing={editing}
        onSaved={refresh}
      />
    </div>
  );
};

export default ClientFeeProposalsTab;
