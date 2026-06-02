// === إجراءات فاتورة ZATCA (سياقية حسب الحالة) ===
// المصدر الوحيد لمنطق الإجراءات — يُستخدم في صفوف القائمة (variant=row) وصفحة الفاتورة (variant=detail).
// تمييز جوهري: failed → إعادة محاولة | rejected → لا إعادة، بل عرض السبب + إشعار تصحيح.
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  QrCode, FileCode2, FileText, RefreshCw, Eye, Clock, Loader2,
  MoreVertical, FileMinus, FilePlus, AlertTriangle, Send,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { zatcaService } from '../../services/zatcaService';
import { ZATCA_STATUS_QUERY_KEY } from '../../hooks/useZatcaStatus';
import type { CaseInvoice } from '../../types/billing';
import ZatcaQrModal from './ZatcaQrModal';
import ZatcaNoteModal from './ZatcaNoteModal';
import { ZatcaResponseModal } from './ZatcaResponsePanel';

type ZatcaInvoiceLike = Pick<
  CaseInvoice,
  'id' | 'invoice_number' | 'zatca_status' | 'zatca_invoice_type' | 'zatca_uuid' | 'zatca_icv' | 'zatca_response' | 'zatca_warnings'
>;

interface Props {
  invoice: ZatcaInvoiceLike;
  variant?: 'row' | 'detail';
  /** إظهار زر «إرسال إلى ZATCA» للفاتورة غير المُرسَلة بعد (لا zatca_status أو pending) */
  allowSubmit?: boolean;
}

const PROCESSING: string[] = ['pending', 'queued', 'submitting'];

const ZatcaInvoiceActions: React.FC<Props> = ({ invoice, variant = 'row', allowSubmit = false }) => {
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<null | 'qr' | 'response' | 'credit' | 'debit'>(null);

  const status = invoice.zatca_status ?? null;
  const id = invoice.id;
  const num = invoice.invoice_number;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['zatca-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['invoice', String(id)] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  const onActionError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : 'تعذّر تنفيذ الإجراء';
    toast.error(msg);
    // قد يكون 403 من middleware zatca.enabled → حدّث الحالة
    queryClient.invalidateQueries({ queryKey: ZATCA_STATUS_QUERY_KEY });
  };

  const submitMutation = useMutation({
    mutationFn: () => zatcaService.submitInvoice(id),
    onSuccess: (res) => {
      if (res.success) { toast.success('تم إرسال الفاتورة إلى ZATCA'); invalidate(); }
      else toast.error(res.message || 'تعذّر الإرسال');
    },
    onError: onActionError,
  });

  const retryMutation = useMutation({
    mutationFn: () => zatcaService.retryInvoice(id),
    onSuccess: (res) => {
      if (res.success) { toast.success('تمت إعادة المحاولة'); invalidate(); }
      else toast.error(res.message || 'تعذّر إعادة المحاولة');
    },
    onError: onActionError,
  });

  const [downloading, setDownloading] = useState<null | 'xml' | 'pdf'>(null);
  const download = async (kind: 'xml' | 'pdf') => {
    setDownloading(kind);
    try {
      if (kind === 'xml') await zatcaService.downloadXml(id, num);
      else await zatcaService.downloadPdf(id, num);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذّر التنزيل');
    } finally {
      setDownloading(null);
    }
  };

  const isFinal = status === 'cleared' || status === 'reported';
  const isProcessing = !!status && PROCESSING.includes(status);
  const hasResponse = !!invoice.zatca_response || (invoice.zatca_warnings?.length ?? 0) > 0;
  const busy = submitMutation.isPending || retryMutation.isPending;

  // قائمة ⋮ (إشعارات + عرض الاستجابة)
  const dropdown = (
    <div className="zatca-menu-wrap">
      <button
        type="button"
        className="zatca-icon-btn"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="إجراءات إضافية"
        title="إجراءات إضافية"
      >
        <MoreVertical size={15} />
      </button>
      {menuOpen ? (
        <>
          <div className="zatca-menu-backdrop" onClick={() => setMenuOpen(false)} />
          <div className="zatca-menu">
            {hasResponse ? (
              <button className="zatca-menu__item" onClick={() => { setModal('response'); setMenuOpen(false); }}>
                <Eye size={14} /> عرض الاستجابة
              </button>
            ) : null}
            <button className="zatca-menu__item zatca-menu__item--danger" onClick={() => { setModal('credit'); setMenuOpen(false); }}>
              <FileMinus size={14} /> إشعار دائن
            </button>
            <button className="zatca-menu__item" onClick={() => { setModal('debit'); setMenuOpen(false); }}>
              <FilePlus size={14} /> إشعار مدين
            </button>
          </div>
        </>
      ) : null}
    </div>
  );

  // ===== النسخة المضغوطة (صف الجدول) =====
  if (variant === 'row') {
    return (
      <div className="zatca-actions-cell" onClick={(e) => e.stopPropagation()}>
        {allowSubmit && (!status || status === 'pending') ? (
          <button className="zatca-icon-btn" onClick={() => submitMutation.mutate()} disabled={busy} title="إرسال إلى ZATCA">
            {submitMutation.isPending ? <Loader2 size={15} className="zatca-spin" /> : <Send size={15} />}
          </button>
        ) : null}

        {isFinal ? (
          <>
            <button className="zatca-icon-btn" onClick={() => setModal('qr')} title="رمز QR"><QrCode size={15} /></button>
            <button className="zatca-icon-btn" onClick={() => download('xml')} disabled={downloading === 'xml'} title="تنزيل XML">
              {downloading === 'xml' ? <Loader2 size={15} className="zatca-spin" /> : <FileCode2 size={15} />}
            </button>
            <button className="zatca-icon-btn" onClick={() => download('pdf')} disabled={downloading === 'pdf'} title="تنزيل PDF">
              {downloading === 'pdf' ? <Loader2 size={15} className="zatca-spin" /> : <FileText size={15} />}
            </button>
          </>
        ) : null}

        {isProcessing ? (
          <button className="zatca-icon-btn" disabled title="قيد المعالجة">
            <Clock size={15} />
          </button>
        ) : null}

        {status === 'rejected' ? (
          <button className="zatca-icon-btn zatca-icon-btn--danger" onClick={() => setModal('response')} title="سبب الرفض"><Eye size={15} /></button>
        ) : null}

        {status === 'failed' ? (
          <>
            <button className="zatca-icon-btn zatca-icon-btn--warn" onClick={() => retryMutation.mutate()} disabled={busy} title="إعادة المحاولة">
              {retryMutation.isPending ? <Loader2 size={15} className="zatca-spin" /> : <RefreshCw size={15} />}
            </button>
            <button className="zatca-icon-btn" onClick={() => setModal('response')} title="التفاصيل"><Eye size={15} /></button>
          </>
        ) : null}

        {dropdown}

        {modal === 'qr' ? <ZatcaQrModal invoiceId={id} invoiceNumber={num} uuid={invoice.zatca_uuid} icv={invoice.zatca_icv} onClose={() => setModal(null)} /> : null}
        {modal === 'response' ? <ZatcaResponseModal response={invoice.zatca_response} warnings={invoice.zatca_warnings} invoiceNumber={num} onClose={() => setModal(null)} /> : null}
        {modal === 'credit' ? <ZatcaNoteModal invoiceId={id} invoiceNumber={num} kind="credit" onClose={() => setModal(null)} /> : null}
        {modal === 'debit' ? <ZatcaNoteModal invoiceId={id} invoiceNumber={num} kind="debit" onClose={() => setModal(null)} /> : null}
      </div>
    );
  }

  // ===== النسخة التفصيلية (صفحة الفاتورة) =====
  return (
    <div className="zatca-detail-actions">
      {allowSubmit && (!status || status === 'pending') ? (
        <button className="zatca-btn zatca-btn--primary" onClick={() => submitMutation.mutate()} disabled={busy}>
          {submitMutation.isPending ? <><Loader2 size={15} className="zatca-spin" /> جارٍ الإرسال…</> : <><Send size={15} /> إرسال إلى ZATCA</>}
        </button>
      ) : null}

      {isProcessing ? (
        <span className="zatca-processing"><Loader2 size={15} className="zatca-spin" /> قيد المعالجة لدى الهيئة…</span>
      ) : null}

      {isFinal ? (
        <>
          <button className="zatca-btn zatca-btn--ghost" onClick={() => setModal('qr')}><QrCode size={15} /> رمز QR</button>
          <button className="zatca-btn zatca-btn--ghost" onClick={() => download('xml')} disabled={downloading === 'xml'}>
            {downloading === 'xml' ? <Loader2 size={15} className="zatca-spin" /> : <FileCode2 size={15} />} تنزيل XML
          </button>
          <button className="zatca-btn zatca-btn--ghost" onClick={() => download('pdf')} disabled={downloading === 'pdf'}>
            {downloading === 'pdf' ? <Loader2 size={15} className="zatca-spin" /> : <FileText size={15} />} تنزيل PDF
          </button>
        </>
      ) : null}

      {status === 'rejected' ? (
        <button className="zatca-btn zatca-btn--ghost" onClick={() => setModal('response')}><AlertTriangle size={15} /> سبب الرفض</button>
      ) : null}

      {status === 'failed' ? (
        <>
          <button className="zatca-btn zatca-btn--success" onClick={() => retryMutation.mutate()} disabled={busy}>
            {retryMutation.isPending ? <><Loader2 size={15} className="zatca-spin" /> …</> : <><RefreshCw size={15} /> إعادة المحاولة</>}
          </button>
          <button className="zatca-btn zatca-btn--ghost" onClick={() => setModal('response')}><Eye size={15} /> التفاصيل</button>
        </>
      ) : null}

      {status ? dropdown : null}

      {modal === 'qr' ? <ZatcaQrModal invoiceId={id} invoiceNumber={num} uuid={invoice.zatca_uuid} icv={invoice.zatca_icv} onClose={() => setModal(null)} /> : null}
      {modal === 'response' ? <ZatcaResponseModal response={invoice.zatca_response} warnings={invoice.zatca_warnings} invoiceNumber={num} onClose={() => setModal(null)} /> : null}
      {modal === 'credit' ? <ZatcaNoteModal invoiceId={id} invoiceNumber={num} kind="credit" onClose={() => setModal(null)} /> : null}
      {modal === 'debit' ? <ZatcaNoteModal invoiceId={id} invoiceNumber={num} kind="debit" onClose={() => setModal(null)} /> : null}
    </div>
  );
};

export default ZatcaInvoiceActions;
