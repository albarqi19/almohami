// [P4·UX-04] صفحة فاتورة واحدة كثيفة (ERP) — النمط الضريبي (ملحق أ) + فصل «تفعيل» عن «إرسال» (INV-2.4)
// + أزرار حسب الحالة المسموحة بالباك (INV-2.5) + ZATCA شرطي عند التفعيل فقط.
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  ArrowRight, Receipt, Download, Send, XCircle, CreditCard, CheckCircle, FileText, User,
  AlertTriangle, Trash2, Lock, FileMinus, FilePlus,
} from 'lucide-react';
import { invoiceService } from '../../services/invoiceService';
import { paymentService } from '../../services/paymentService';
import { Modal, StatusBadge } from '../../components/erp';
import { LoadingState, ErrorState } from '../../components/erp/States';
import PaymentModal from '../../components/billing/PaymentModal';
import IssueInvoiceModal from '../../components/billing/IssueInvoiceModal';
import InvoiceNoteModal from '../../components/billing/InvoiceNoteModal';
import RebillableExpenses from '../../components/billing/RebillableExpenses';
import { formatSAR, formatPercent, toNumber } from '../../utils/money';
import { formatDueLabel } from '../../utils/dueDays';
import { invalidateFinance } from '../../utils/financeCache';
import { ToneBadge } from '../../components/erp/StatusBadge';
import { invoiceActions, PAYMENT_METHOD_LABELS, DOCUMENT_KIND_LABEL } from '../../config/financeStatusConfig';
import { usePermissionContext } from '../../contexts/PermissionContext';
import { FINANCE_PERMISSIONS } from '../../config/financeModule';
import { useZatcaFeature } from '../../contexts/ZatcaStatusContext';
import ZatcaStatusBadge from '../../components/zatca/ZatcaStatusBadge';
import ZatcaInvoiceActions from '../../components/zatca/ZatcaInvoiceActions';
import { ZatcaResponsePanel } from '../../components/zatca/ZatcaResponsePanel';
import type { CreatePaymentData } from '../../types/billing';

// صف قائمة تعريفات مضغوط (label ↔ value) للعمود الجانبي.
const Def: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="fin-defrow"><span className="fin-defrow__label">{label}</span><span className="fin-defrow__value">{children}</span></div>
);

// رقاقة تحذير نصّية مسطّحة (بلا شريط جانبي ملوّن، بلا ظل، بلا تدرّج) — ألوانها من متغيّرات الحالة.
// برتقالي = محذوف حذفاً ناعماً (قابل للاستعادة)، أحمر = محذوف نهائياً.
//
// 🔴 قيمة احتياطية داخل كل `var()` **إلزامية هنا**: المتغيّر يقع داخل `color-mix(...)`،
// فإن غاب ملف السمة عن تتالي مسار المالية صار `color-mix` باطلاً وقت الحساب — فتسقط
// الخلفية **والحدّ** معاً ويرث النصّ لون الجسم، فيتحوّل تحذيرٌ أحمر إلى نصٍّ عاديّ صامت.
// (نفس نمط الاحتياطيات في `src/styles/accounting.css`.)
const TONE_COLOR: Record<'orange' | 'red', string> = {
  orange: 'var(--status-orange, #a05a00)',
  red: 'var(--status-red, #b3261e)',
};

const GoneChip: React.FC<{ tone: 'orange' | 'red'; children: React.ReactNode }> = ({ tone, children }) => (
  <div
    style={{
      display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 10,
      padding: '6px 9px', borderRadius: 6,
      fontSize: 12.5, fontWeight: 600, lineHeight: 1.7,
      color: TONE_COLOR[tone],
      background: `color-mix(in srgb, ${TONE_COLOR[tone]} 14%, var(--color-surface, transparent))`,
      border: `1px solid color-mix(in srgb, ${TONE_COLOR[tone]} 32%, transparent)`,
    }}
  >
    <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 3 }} />
    <span>{children}</span>
  </div>
);

const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { has } = usePermissionContext();
  const { enabled: zatcaEnabled } = useZatcaFeature();
  const canManage = has(FINANCE_PERMISSIONS.invoicesManage);

  const [showPayment, setShowPayment] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  // [INV-P2] الإصدار والإشعارات
  const [showIssue, setShowIssue] = useState(false);
  const [noteKind, setNoteKind] = useState<null | 'credit' | 'debit'>(null);

  const invoiceId = Number(id);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['finance', 'invoice', id],
    queryFn: () => invoiceService.getInvoice(invoiceId),
    enabled: !!id,
    // تحديث دوري أثناء معالجة ZATCA.
    refetchInterval: (q) => {
      const st = (q.state.data as { data?: { zatca_status?: string } } | undefined)?.data?.zatca_status;
      return st && ['queued', 'submitting', 'pending'].includes(st) ? 5000 : false;
    },
  });

  const invoice = data?.data;
  const invalidate = () => invalidateFinance(queryClient);

  // [INV-P2] الوصول من القائمة بزر «إصدار» يفتح نافذة الإصدار مباشرة.
  const [searchParams, setSearchParams] = useSearchParams();
  const wantsIssue = searchParams.get('issue') === '1';
  const invoiceStatus = invoice?.status;
  useEffect(() => {
    if (wantsIssue && invoiceStatus === 'draft') {
      setShowIssue(true);
      searchParams.delete('issue');
      setSearchParams(searchParams, { replace: true });
    }
  }, [wantsIssue, invoiceStatus, searchParams, setSearchParams]);

  const sendMutation = useMutation({
    mutationFn: (method: 'email' | 'whatsapp') => invoiceService.sendInvoice(invoiceId, method),
    onSuccess: (res) => { toast.success(res.message || 'تم إرسال الفاتورة'); invalidate(); setShowSend(false); },
    onError: (e: Error) => { toast.info(e.message || 'ميزة الإرسال قيد التطوير'); setShowSend(false); },
  });
  const cancelMutation = useMutation({
    mutationFn: () => invoiceService.cancelInvoice(invoiceId, cancelReason),
    onSuccess: () => { toast.success('تم إلغاء الفاتورة'); invalidate(); setShowCancel(false); setCancelReason(''); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر إلغاء الفاتورة'),
  });
  // الحذف نهائي وللمسودّة وحدها — الباك يرفض ما سواها ويرفض ما له مدفوعات
  // (CaseInvoiceController::destroy)، فنُبقي رسالته كما هي بدل ابتلاعها.
  const deleteMutation = useMutation({
    mutationFn: () => invoiceService.deleteInvoice(invoiceId),
    onSuccess: () => { toast.success('تم حذف الفاتورة'); invalidate(); navigate('/finance/invoices'); },
    onError: (e: Error) => { toast.error(e.message || 'تعذّر حذف الفاتورة'); setShowDelete(false); },
  });

  const handleSubmitPayment = async (payload: CreatePaymentData, receiptFile?: File) => {
    try {
      const res = await paymentService.createPayment(payload);
      if (receiptFile && res.data?.id) {
        await paymentService.uploadReceipt(res.data.id, receiptFile).catch(() => toast.error('تعذّر رفع الإيصال'));
      }
      toast.success('تم تسجيل الدفعة');
      invalidate();
      setShowPayment(false);
    } catch (e) {
      toast.error((e as Error).message || 'تعذّر تسجيل الدفعة');
      throw e; // أبقِ المودال مفتوحاً ليصحّح المستخدم
    }
  };

  if (isLoading) return <LoadingState />;
  if (isError || !invoice) return <ErrorState onRetry={() => refetch()} title="تعذّر تحميل الفاتورة" />;

  const a = invoiceActions(invoice.status, invoice);
  // [INV-P2] العنوان حسب نوع المستند والطبيعة الضريبية المُجمَّدة ونوع الفاتورة الضريبية.
  const kind = invoice.document_kind ?? 'invoice';
  const isNote = kind !== 'invoice';
  const docTitle = isNote
    ? DOCUMENT_KIND_LABEL[kind]
    : (invoice.is_tax_invoice ? (invoice.tax_invoice_subtype === 'simplified' ? 'فاتورة ضريبية مبسطة' : 'فاتورة ضريبية') : 'فاتورة');
  const credited = toNumber(invoice.credited_amount ?? 0);
  const relatedNotes = invoice.zatca_notes ?? [];
  const dueLabel = formatDueLabel(invoice.due_date);
  const hasVat = toNumber(invoice.vat_amount) > 0;

  // ── الخدمة القانونية المرتبطة: أربع حالات متمايزة ──
  // 🔴 الحذف الناعم لا يصفّر legal_service_id (قيود FK لا تنطلق عليه)، فالتمييز يقوم على
  //    وجود العلاقة و deleted_at داخلها — لا على «المفتاح فارغ» الذي يفوّت المسار الافتراضي.
  const svc = invoice.legal_service;
  const svcAlive = !!svc && !svc.deleted_at;                       // (1) خدمة حيّة
  const svcTrashed = !!svc && !!svc.deleted_at;                    // (2) حذف ناعم — الصفّ محمّل بـwithTrashed ومعه deleted_at
  // (3) حذف نهائي — لا يبقى إلا اللقطة النصّية. الشرط مبنيٌّ على نفي الحالتين قبله لا على
  //     `legal_service_id == null`: اشتراط تصفير المفتاح كان يجعل الحالة الرابعة تسقط من
  //     الأعلام الثلاثة جميعاً فتصمت الفاتورة تماماً عن مصدرها.
  const svcPurged = !svcAlive && !svcTrashed && !!invoice.deleted_service_label;
  // (4) مفتاحٌ موجود وعلاقةٌ غير محمّلة (استجابة بلا with، أو منعُ رؤية) وبلا لقطة نصّية —
  //     يُعرض صراحةً بمعرّف الخدمة بدل الصمت.
  const svcUnresolved = !svcAlive && !svcTrashed && !svcPurged && invoice.legal_service_id != null;
  // «المبسطة» لها صفحة عمل مخصّصة، والبقية صفحة التفاصيل القياسية (مطابق لـLegalServices.openService).
  const svcHref = svc ? (svc.service_type === 'simple' ? `/legal-services/simple/${svc.id}` : `/legal-services/${svc.id}`) : null;

  return (
    <div className="fin-detail">
      <div className="fin-detail-header">
        <div className="fin-detail-header__main">
          <button type="button" className="fin-btn fin-btn--ghost fin-btn--icon" onClick={() => navigate('/finance/invoices')} aria-label="رجوع"><ArrowRight size={18} /></button>
          <Receipt size={20} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="fin-docnum">{invoice.invoice_number}</span>
              <StatusBadge kind="invoice" status={invoice.status} size="lg" />
              {zatcaEnabled && invoice.zatca_status && <ZatcaStatusBadge status={invoice.zatca_status} />}
            </div>
            <div className="fin-cell-muted" style={{ marginTop: 2 }}>{docTitle}</div>
          </div>
        </div>
        <div className="fin-detail-header__actions">
          <button type="button" className="fin-btn fin-btn--sm" onClick={() => invoiceService.downloadPdf(invoice.id, invoice.invoice_number).catch(() => toast.error('تعذّر تحميل PDF'))}><Download size={14} /> PDF</button>
          {a.canIssue && (
            <button type="button" className="fin-btn fin-btn--sm" title="مستند يُرسل للعميل قبل إصدار الفاتورة الضريبية — بلا QR ولا صفة ضريبية" onClick={() => invoiceService.downloadPaymentRequestPdf(invoice.id, invoice.invoice_number).catch((e: Error) => toast.error(e.message || 'تعذّر تنزيل المطالبة'))}><FileText size={14} /> مطالبة بالدفع</button>
          )}
          {canManage && a.canIssue && (
            <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" onClick={() => setShowIssue(true)}><CheckCircle size={14} /> إصدار الفاتورة</button>
          )}
          {canManage && a.canCreditNote && (
            <button type="button" className="fin-btn fin-btn--sm" onClick={() => setNoteKind('credit')}><FileMinus size={14} /> إشعار دائن</button>
          )}
          {canManage && a.canDebitNote && (
            <button type="button" className="fin-btn fin-btn--sm" onClick={() => setNoteKind('debit')}><FilePlus size={14} /> إشعار مدين</button>
          )}
          {canManage && a.canSend && (
            <button type="button" className="fin-btn fin-btn--sm" onClick={() => setShowSend(true)}><Send size={14} /> إرسال</button>
          )}
          {canManage && a.canRecordPayment && (
            <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" onClick={() => setShowPayment(true)}><CreditCard size={14} /> تسجيل دفعة</button>
          )}
          {canManage && a.canCancel && (
            <button type="button" className="fin-btn fin-btn--danger fin-btn--sm" onClick={() => setShowCancel(true)}><XCircle size={14} /> إلغاء</button>
          )}
          {canManage && a.canDelete && (
            <button type="button" className="fin-btn fin-btn--danger fin-btn--sm" onClick={() => setShowDelete(true)}><Trash2 size={14} /> حذف</button>
          )}
        </div>
      </div>

      {/* [INV-P2] الفاتورة الصادرة مقفلة — رقاقة نصية مسطّحة */}
      {a.isLocked && !isNote && invoice.status !== 'cancelled' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, fontSize: 12.5, color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary, transparent)' }}>
          <Lock size={13} style={{ flexShrink: 0 }} />
          <span>
            {invoice.is_tax_invoice
              ? 'الفاتورة الضريبية صادرة ومقفلة: لا تُعدَّل بياناتها المالية ولا تُلغى. التصحيح بإشعار دائن أو مدين.'
              : 'الفاتورة صادرة ومقفلة: لا تُعدَّل بياناتها المالية. للتصحيح أصدر إشعاراً، أو ألغها وأصدر فاتورة جديدة.'}
            {a.fullyCredited && ' هذه الفاتورة مغطاة بالكامل بإشعار دائن.'}
          </span>
        </div>
      )}
      {isNote && invoice.zatca_original_invoice && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, fontSize: 12.5, color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
          <FileText size={13} style={{ flexShrink: 0 }} />
          <span>
            {DOCUMENT_KIND_LABEL[kind]} على الفاتورة{' '}
            <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" style={{ padding: '0 4px' }} onClick={() => navigate(`/finance/invoices/${invoice.zatca_original_invoice?.id}`)}>
              {invoice.zatca_original_invoice.invoice_number}
            </button>
            {invoice.zatca_note_reason && <> — السبب: {invoice.zatca_note_reason}</>}
          </span>
        </div>
      )}

      {/* بطاقات مالية */}
      <div className="fin-cards">
        <div className="fin-card"><div className="fin-card__icon fin-card__icon--neutral"><Receipt size={18} /></div><div className="fin-card__body"><div className="fin-card__value">{formatSAR(invoice.total_amount)}</div><div className="fin-card__label">الإجمالي</div></div></div>
        <div className="fin-card"><div className="fin-card__icon fin-card__icon--success"><CheckCircle size={18} /></div><div className="fin-card__body"><div className="fin-card__value fin-card__value--success">{formatSAR(invoice.paid_amount)}</div><div className="fin-card__label">المدفوع</div></div></div>
        <div className="fin-card"><div className="fin-card__icon fin-card__icon--warning"><CreditCard size={18} /></div><div className="fin-card__body"><div className="fin-card__value fin-card__value--warning">{formatSAR(invoice.remaining_amount)}</div><div className="fin-card__label">المتبقّي</div></div></div>
        {hasVat && <div className="fin-card"><div className="fin-card__icon fin-card__icon--info"><FileText size={18} /></div><div className="fin-card__body"><div className="fin-card__value fin-card__value--info">{formatSAR(invoice.vat_amount)}</div><div className="fin-card__label">الضريبة ({formatPercent(invoice.vat_rate)})</div></div></div>}
        {credited > 0 && <div className="fin-card"><div className="fin-card__icon fin-card__icon--neutral"><FileMinus size={18} /></div><div className="fin-card__body"><div className="fin-card__value">{formatSAR(credited)}</div><div className="fin-card__label">إشعارات دائنة</div></div></div>}
      </div>

      {/* تخطيط عمودين: رئيسي (الدفعات + ZATCA) + جانبي (معلومات الفاتورة) */}
      <div className="fin-detail-grid">
        <div className="fin-detail-main">
          {/* [EXP-REBILL] نثريات العميل القابلة للتحصيل — على المسودة فقط */}
          {invoice.status === 'draft' && !isNote && invoice.client_id && (
            <RebillableExpenses invoiceId={invoice.id} clientId={invoice.client_id} canManage={canManage} />
          )}

          {/* الدفعات */}
          <div className="fin-section">
            <div className="fin-section__head"><span className="fin-section__title"><CreditCard size={15} /> الدفعات ({invoice.payments?.length ?? 0})</span></div>
            <div className="fin-section__body">
              {invoice.payments && invoice.payments.length > 0 ? invoice.payments.map((p) => (
                <div key={p.id} className="fin-line">
                  <div className="fin-line__main">
                    <span className="fin-docnum">{p.payment_number}</span>
                    <span className="fin-line__sub">{PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method} · {p.payment_date?.split('T')[0]}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <StatusBadge kind="payment" status={p.status} />
                    <span className="fin-line__amount">{formatSAR(p.amount)}</span>
                  </div>
                </div>
              )) : <div className="fin-cell-muted">لا توجد دفعات مسجّلة.</div>}
            </div>
          </div>

          {/* [INV-P2] الإشعارات الصادرة على هذه الفاتورة */}
          {!isNote && relatedNotes.length > 0 && (
            <div className="fin-section">
              <div className="fin-section__head"><span className="fin-section__title"><FileMinus size={15} /> الإشعارات ({relatedNotes.length})</span></div>
              <div className="fin-section__body">
                {relatedNotes.map((n) => (
                  <div key={n.id} className="fin-line" style={{ cursor: 'pointer' }} onClick={() => navigate(`/finance/invoices/${n.id}`)}>
                    <div className="fin-line__main">
                      <span className="fin-docnum">{n.invoice_number}</span>
                      <span className="fin-line__sub">{DOCUMENT_KIND_LABEL[n.document_kind ?? 'credit_note']} · {n.invoice_date?.split('T')[0]}{n.zatca_note_reason ? ` · ${n.zatca_note_reason}` : ''}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <StatusBadge kind="invoice" status={n.status} />
                      <span className="fin-line__amount">{n.document_kind === 'credit_note' ? '−' : '+'}{formatSAR(n.total_amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ZATCA — يظهر فقط عند تفعيل الميزة (لا يغيّر الطبيعة الضريبية) */}
          {zatcaEnabled && invoice.zatca_status && (
            <div className="fin-section">
              <div className="fin-section__head">
                <span className="fin-section__title"><FileText size={15} /> الفوترة الإلكترونية (ZATCA)</span>
                <ZatcaInvoiceActions invoice={invoice} allowSubmit />
              </div>
              <div className="fin-section__body">
                <ZatcaResponsePanel response={invoice.zatca_response} warnings={invoice.zatca_warnings} />
              </div>
            </div>
          )}
        </div>

        <div className="fin-detail-side">
          {/* معلومات الفاتورة — قائمة تعريفات مضغوطة */}
          <div className="fin-section">
            <div className="fin-section__head"><span className="fin-section__title"><FileText size={15} /> معلومات الفاتورة</span></div>
            <div className="fin-section__body">
              <div className="fin-deflist">
                <Def label="العنوان">{invoice.title}</Def>
                <Def label="العميل"><span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><User size={13} /> {invoice.client?.name ?? '—'}</span></Def>
                {invoice.contract && (
                  <Def label="العقد">
                    <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" style={{ padding: '2px 6px' }} onClick={() => navigate(`/finance/contracts/${invoice.contract?.id}`)}>
                      {invoice.contract.contract_number}
                    </button>
                  </Def>
                )}
                {svcAlive && svc && (
                  <Def label="الخدمة القانونية">
                    <button
                      type="button"
                      className="fin-btn fin-btn--ghost fin-btn--sm"
                      style={{ padding: '2px 6px', display: 'inline-block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={`${svc.service_number} — ${svc.title}`}
                      onClick={() => svcHref && navigate(svcHref)}
                    >
                      {svc.service_number} — {svc.title}
                    </button>
                  </Def>
                )}
                {invoice.bank_accounts_snapshot && invoice.bank_accounts_snapshot.length > 0 && (
                  <Def label="التحويل البنكي">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {invoice.bank_accounts_snapshot.map((b) => (
                        <span key={b.id} style={{ fontSize: 12 }}>{b.bank_name || 'بنك'} — <span dir="ltr" style={{ fontFamily: 'ui-monospace, monospace' }}>{b.iban_grouped}</span></span>
                      ))}
                    </div>
                  </Def>
                )}
                <Def label="تاريخ الإصدار">{invoice.invoice_date?.split('T')[0] ?? '—'}</Def>
                {invoice.is_tax_invoice && invoice.supply_date && <Def label="تاريخ التوريد">{invoice.supply_date.split('T')[0]}</Def>}
                {invoice.issued_at && <Def label="صدرت في">{invoice.issued_at.replace('T', ' ').slice(0, 16)}</Def>}
                {invoice.is_tax_invoice && invoice.tax_invoice_subtype && <Def label="نوع الفاتورة الضريبية">{invoice.tax_invoice_subtype === 'standard' ? 'قياسية (منشأة)' : 'مبسطة (فرد)'}</Def>}
                {invoice.is_tax_invoice && toNumber(invoice.vat_rate) === 0 && invoice.vat_exemption_reason && <Def label="سبب عدم احتساب الضريبة">{invoice.vat_exemption_reason}</Def>}
                <Def label="الاستحقاق">
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    {invoice.due_date?.split('T')[0]} {dueLabel && <ToneBadge tone={dueLabel.tone}>{dueLabel.text}</ToneBadge>}
                  </span>
                </Def>
                {invoice.reference && <Def label="المرجع">{invoice.reference}</Def>}
                <Def label="قبل الضريبة">{formatSAR(invoice.subtotal)}</Def>
                {toNumber(invoice.discount) > 0 && <Def label="الخصم">{formatSAR(invoice.discount)}</Def>}
              </div>

              {/* الخدمة المرتبطة اختفت — رقاقة نصّية (لا شريط تمييز جانبي) */}
              {svcTrashed && svc && (
                <GoneChip tone="orange">
                  الخدمة المرتبطة محذوفة — {svc.service_number} «{svc.title}» · موجودة في سلّة المحذوفات
                </GoneChip>
              )}
              {svcPurged && (
                <GoneChip tone="red">
                  الخدمة المرتبطة محذوفة نهائياً — {invoice.deleted_service_label}
                </GoneChip>
              )}
              {/* الحالة الرابعة: مفتاحٌ موجود بلا علاقةٍ محمّلة ولا لقطة — اذكر المعرّف بدل الصمت */}
              {svcUnresolved && (
                <GoneChip tone="orange">
                  الفاتورة مرتبطة بخدمة قانونية رقم <span dir="ltr">#{invoice.legal_service_id}</span> — تعذّر تحميل بياناتها
                </GoneChip>
              )}

              {invoice.notes && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--color-text-secondary)' }}>{invoice.notes}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* مودال تسجيل دفعة */}
      {showPayment && (
        <PaymentModal isOpen={showPayment} invoice={invoice} onClose={() => setShowPayment(false)} onSubmit={handleSubmitPayment} />
      )}

      {/* [INV-P2] الإصدار والإشعارات */}
      {showIssue && <IssueInvoiceModal open={showIssue} invoice={invoice} onClose={() => setShowIssue(false)} />}
      {noteKind && <InvoiceNoteModal open={!!noteKind} invoice={invoice} kind={noteKind} onClose={() => setNoteKind(null)} onIssued={(note) => navigate(`/finance/invoices/${note.id}`)} />}

      {/* مودال الإرسال */}
      <Modal
        open={showSend}
        onClose={() => setShowSend(false)}
        title="إرسال الفاتورة"
        icon={Send}
        size="narrow"
        footer={(
          <>
            <button type="button" className="fin-btn" onClick={() => setShowSend(false)}>إلغاء</button>
            <button type="button" className="fin-btn fin-btn--primary" disabled={sendMutation.isPending} onClick={() => sendMutation.mutate('email')}><Send size={14} /> بريد إلكتروني</button>
            <button type="button" className="fin-btn" disabled={sendMutation.isPending} onClick={() => sendMutation.mutate('whatsapp')}>واتساب</button>
          </>
        )}
      >
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>اختر قناة إرسال الفاتورة للعميل.</p>
      </Modal>

      {/* مودال الإلغاء */}
      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="إلغاء الفاتورة"
        icon={XCircle}
        size="narrow"
        footer={(
          <>
            <button type="button" className="fin-btn" onClick={() => setShowCancel(false)}>تراجع</button>
            <button type="button" className="fin-btn fin-btn--danger" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
              {cancelMutation.isPending ? 'جارٍ الإلغاء...' : 'تأكيد الإلغاء'}
            </button>
          </>
        )}
      >
        <div className="fin-field">
          <label className="fin-field__label">سبب الإلغاء (اختياري)</label>
          <textarea className="fin-textarea" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} />
        </div>
      </Modal>

      {/* مودال الحذف — الفرق عن الإلغاء جوهري: الإلغاء يُبقي السجلّ، والحذف يمحوه */}
      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="حذف الفاتورة"
        icon={Trash2}
        size="narrow"
        footer={(
          <>
            <button type="button" className="fin-btn" onClick={() => setShowDelete(false)}>تراجع</button>
            <button type="button" className="fin-btn fin-btn--danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              {deleteMutation.isPending ? 'جارٍ الحذف...' : 'تأكيد الحذف'}
            </button>
          </>
        )}
      >
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          سيتم حذف الفاتورة {invoice.invoice_number} نهائياً. لا يُحذف إلا ما كان مسودّةً بلا مدفوعات —
          وما جاوز ذلك فالإلغاء بديلُه، إذ يُبقي السجلّ للمراجعة.
        </p>
      </Modal>
    </div>
  );
};

export default InvoiceDetailPage;
