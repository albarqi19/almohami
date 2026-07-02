import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Zap,
  Plus,
  Trash2,
  Check,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Send,
  FileText,
  Receipt,
  ClipboardList,
  MessageSquareText,
  NotebookPen,
  ListChecks,
  Milestone,
  User,
  Loader2,
  X,
  Link2,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { LegalServiceService } from '../../services/legalServiceService';
import { apiClient } from '../../utils/api';
import { getApiErrorMessage } from '../../utils/apiError';
import type {
  LegalService,
  SimpleServiceDetail,
  ServiceDeliverableItem,
} from '../../types/legalServices';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (simple-service.css)

/**
 * صفحة «الخدمة القانونية المبسطة» — مساحة عمل واحدة بستايل ERP كثيف:
 *  - المراحل الحرة (يضعها المستخدم) في العمود الأيسر
 *  - المهام + دفتر التدوين الزمني في العمود الرئيسي
 *  - التواصل والإجراءات (رسالة/ملف/إجراء/فاتورة) في العمود الأوسط
 */

// ── مودال خفيف موحّد ──────────────────────────────────────────────────────
const MiniModal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, onClose, children }) => (
  <div className="ssp2-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="ssp2-modal">
      <div className="ssp2-modal__head">
        <span>{title}</span>
        <button className="ssp2-icon-btn" onClick={onClose} aria-label="إغلاق">
          <X size={15} />
        </button>
      </div>
      <div className="ssp2-modal__body">{children}</div>
    </div>
  </div>
);

const SimpleServicePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const serviceId = Number(id);
  const navigate = useNavigate();

  const [service, setService] = useState<LegalService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const detail: SimpleServiceDetail | undefined = service?.simple_service_detail;
  const stages = useMemo(() => detail?.stages ?? [], [detail]);
  const tasks = useMemo(() => detail?.tasks ?? [], [detail]);
  const journal = useMemo(() => detail?.journal ?? [], [detail]);
  const activities = service?.service_activities ?? [];
  const isLocked = ['closed', 'cancelled', 'archived'].includes(service?.status ?? '');

  // ── جلب ──
  const fetchService = useCallback(async () => {
    try {
      const res = await LegalServiceService.getService(serviceId);
      if (res.success) {
        setService(res.data);
        setError(null);
      } else {
        setError(res.message || 'تعذّر تحميل الخدمة');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'تعذّر تحميل الخدمة'));
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

  /** تحديث detail من ردود endpoints المبسطة (تعيد detail كاملاً) */
  const applyDetail = (data: SimpleServiceDetail) => {
    setService((prev) => (prev ? { ...prev, simple_service_detail: data } : prev));
  };

  // ── المراحل ──
  const [newStage, setNewStage] = useState('');
  const [stagesBusy, setStagesBusy] = useState(false);

  const saveStages = async (next: Array<{ id?: string; label: string; done_at?: string | null }>) => {
    setStagesBusy(true);
    try {
      const res = await LegalServiceService.updateSimpleStages(serviceId, next);
      if (res.success) applyDetail(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر حفظ المراحل'));
    } finally {
      setStagesBusy(false);
    }
  };

  const addStage = async () => {
    const label = newStage.trim();
    if (!label) return;
    setNewStage('');
    await saveStages([...stages, { label }]);
  };

  const removeStage = (stageId: string) =>
    saveStages(stages.filter((s) => s.id !== stageId));

  const moveStage = (index: number, dir: -1 | 1) => {
    const next = [...stages];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    saveStages(next);
  };

  const toggleStage = async (stageId: string) => {
    try {
      const res = await LegalServiceService.toggleSimpleStage(serviceId, stageId);
      if (res.success) applyDetail(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر تحديث المرحلة'));
    }
  };

  const stagesDone = stages.filter((s) => s.done_at).length;
  const stagesPct = stages.length ? Math.round((stagesDone / stages.length) * 100) : 0;

  // ── المهام ──
  const [newTask, setNewTask] = useState('');
  const [taskBusy, setTaskBusy] = useState(false);

  const addTask = async () => {
    const title = newTask.trim();
    if (!title) return;
    setTaskBusy(true);
    try {
      const res = await LegalServiceService.addSimpleTask(serviceId, title);
      if (res.success) {
        applyDetail(res.data);
        setNewTask('');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إضافة المهمة'));
    } finally {
      setTaskBusy(false);
    }
  };

  const toggleTask = async (taskId: string) => {
    try {
      const res = await LegalServiceService.toggleSimpleTask(serviceId, taskId);
      if (res.success) applyDetail(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر تحديث المهمة'));
    }
  };

  const removeTask = async (taskId: string) => {
    try {
      const res = await LegalServiceService.removeSimpleTask(serviceId, taskId);
      if (res.success) applyDetail(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر حذف المهمة'));
    }
  };

  const tasksDone = tasks.filter((t) => t.done).length;

  // ── التدوين ──
  const [newEntry, setNewEntry] = useState('');
  const [journalBusy, setJournalBusy] = useState(false);

  const addJournal = async () => {
    const text = newEntry.trim();
    if (!text) return;
    setJournalBusy(true);
    try {
      const res = await LegalServiceService.addSimpleJournal(serviceId, text);
      if (res.success) {
        applyDetail(res.data);
        setNewEntry('');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر التدوين'));
    } finally {
      setJournalBusy(false);
    }
  };

  const removeJournal = async (entryId: string) => {
    try {
      const res = await LegalServiceService.removeSimpleJournal(serviceId, entryId);
      if (res.success) applyDetail(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر حذف التدوينة'));
    }
  };

  // ── المودالات: إجراء / رسالة / ملف / فاتورة ──
  const [modal, setModal] = useState<null | 'procedure' | 'message' | 'file' | 'invoice'>(null);
  const [busy, setBusy] = useState(false);

  // إجراء
  const [procTitle, setProcTitle] = useState('');
  const [procDesc, setProcDesc] = useState('');
  const submitProcedure = async () => {
    if (!procTitle.trim()) return;
    setBusy(true);
    try {
      await LegalServiceService.logSimpleProcedure(serviceId, procTitle.trim(), procDesc.trim() || undefined);
      toast.success('سُجِّل الإجراء');
      setModal(null);
      setProcTitle('');
      setProcDesc('');
      fetchService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر تسجيل الإجراء'));
    } finally {
      setBusy(false);
    }
  };

  // رسالة للعميل
  const [clientMsg, setClientMsg] = useState('');
  const submitMessage = async () => {
    if (!clientMsg.trim()) return;
    setBusy(true);
    try {
      const res = await LegalServiceService.messageSimpleClient(serviceId, clientMsg.trim());
      toast.success(res.message || 'أُرسلت الرسالة');
      setModal(null);
      setClientMsg('');
      fetchService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إرسال الرسالة'));
    } finally {
      setBusy(false);
    }
  };

  // إرسال ملف (مخرَج برابط موقّت)
  const [deliverables, setDeliverables] = useState<ServiceDeliverableItem[]>([]);
  const [chosenDeliverable, setChosenDeliverable] = useState<number | null>(null);
  const [fileNote, setFileNote] = useState('');

  const openFileModal = async () => {
    setModal('file');
    setChosenDeliverable(null);
    try {
      const res = await LegalServiceService.listDeliverables(serviceId);
      setDeliverables(res.data ?? []);
    } catch {
      setDeliverables([]);
    }
  };

  const submitFile = async () => {
    if (!chosenDeliverable) return;
    setBusy(true);
    try {
      const res = await LegalServiceService.shareSimpleDeliverable(serviceId, chosenDeliverable, fileNote.trim() || undefined);
      toast.success(res.message || 'أُرسل الملف');
      setModal(null);
      setFileNote('');
      fetchService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إرسال الملف'));
    } finally {
      setBusy(false);
    }
  };

  // فاتورة: معاينة → إنشاء → إرسال
  const [invoicePreview, setInvoicePreview] = useState<{
    subtotal: number; vat_rate: number; vat_amount: number; total: number;
    basis_arabic: string; has_existing_invoice: boolean;
  } | null>(null);

  const openInvoiceModal = async () => {
    setModal('invoice');
    setInvoicePreview(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: any }>(
        `/legal-services/${serviceId}/invoice-preview`
      );
      setInvoicePreview(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر جلب معاينة الفاتورة'));
      setModal(null);
    }
  };

  const submitInvoice = async (sendToClient: boolean) => {
    setBusy(true);
    try {
      const created = await LegalServiceService.createInvoice(serviceId, {});
      if (sendToClient && created.data?.id) {
        await apiClient.post(`/case-invoices/${created.data.id}/send`);
        toast.success('أُنشئت الفاتورة وأُرسلت للعميل');
      } else {
        toast.success('أُنشئت الفاتورة');
      }
      setModal(null);
      fetchService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إنشاء/إرسال الفاتورة'));
    } finally {
      setBusy(false);
    }
  };

  // إكمال/إغلاق سريع
  const changeStatus = async (status: string) => {
    try {
      const res = await LegalServiceService.updateStatus(serviceId, status);
      if (res.success) {
        setService(res.data);
        toast.success('تم تحديث الحالة');
        if (!Array.isArray(res.data?.allowed_transitions)) fetchService();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر تحديث الحالة'));
    }
  };

  // ── تنسيقات صغيرة ──
  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' });

  const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
    procedure: <ClipboardList size={13} />,
    client_message: <MessageSquareText size={13} />,
    file_shared: <FileText size={13} />,
    invoice_created: <Receipt size={13} />,
    status_changed: <ChevronRight size={13} />,
  };

  // ── حالات الصفحة ──
  if (loading) {
    return (
      <div className="ssp2-page" dir="rtl">
        <div className="ssp2-state"><Loader2 size={22} className="ssp2-spin" /> جارٍ التحميل...</div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="ssp2-page" dir="rtl">
        <div className="ssp2-state">
          <p>⚠️ {error ?? 'الخدمة غير موجودة'}</p>
          <button className="ssp2-btn ssp2-btn--primary" onClick={() => navigate('/legal-services')}>
            العودة للقائمة
          </button>
        </div>
      </div>
    );
  }

  const allowed = service.allowed_transitions ?? [];

  return (
    <div className="ssp2-page" dir="rtl">
      {/* ── الترويسة ── */}
      <header className="ssp2-header">
        <div className="ssp2-header__info">
          <button className="ssp2-icon-btn" onClick={() => navigate('/legal-services')} title="عودة للقائمة">
            <ChevronRight size={17} />
          </button>
          <span className="ssp2-header__badge"><Zap size={13} /> خدمة مبسطة</span>
          <h1 className="ssp2-header__title">{service.title}</h1>
          <span className="ssp2-header__number">{service.service_number}</span>
          <span className="ssp2-header__client">
            <User size={13} /> {service.client?.name ?? '—'}
          </span>
          <span className={`ssp2-status ssp2-status--${service.status}`}>
            {service.status_arabic ?? service.status}
          </span>
          {isLocked && <span className="ssp2-locked"><Lock size={12} /> مقفلة</span>}
        </div>
        <div className="ssp2-header__actions">
          <button className="ssp2-btn" onClick={() => setModal('message')} disabled={isLocked} title="رسالة واتساب + بريد للعميل (تُدوَّن)">
            <MessageSquareText size={14} /> رسالة للعميل
          </button>
          <button className="ssp2-btn" onClick={openFileModal} disabled={isLocked} title="إرسال مخرَج برابط تحميل مؤقت (72 ساعة)">
            <FileText size={14} /> إرسال ملف
          </button>
          <button className="ssp2-btn ssp2-btn--primary" onClick={openInvoiceModal} disabled={isLocked}>
            <Receipt size={14} /> فاتورة
          </button>
          {allowed.includes('in_progress') && (
            <button className="ssp2-btn" onClick={() => changeStatus('in_progress')}>بدء العمل</button>
          )}
          {allowed.includes('completed') && (
            <button className="ssp2-btn ssp2-btn--success" onClick={() => changeStatus('completed')} title="عند الإكمال تُنشأ فاتورة مسودة تلقائياً إن وُجد مبلغ">
              <CheckCircle size={14} /> إكمال
            </button>
          )}
          {allowed.includes('closed') && (
            <button className="ssp2-btn" onClick={() => changeStatus('closed')}>إغلاق</button>
          )}
        </div>
      </header>

      {/* ── الجسد: [رئيسي: مهام+تدوين] [تواصل وإجراءات] [المراحل — يسار الشاشة] ── */}
      <div className="ssp2-body">
        {/* العمود الرئيسي */}
        <main className="ssp2-main">
          {/* المهام */}
          <section className="ssp2-card">
            <div className="ssp2-card__head">
              <span className="ssp2-card__title"><ListChecks size={15} /> المهام</span>
              <span className="ssp2-card__meta">{tasksDone}/{tasks.length}</span>
            </div>
            {tasks.length > 0 && (
              <div className="ssp2-progress">
                <div className="ssp2-progress__fill" style={{ width: `${tasks.length ? (tasksDone / tasks.length) * 100 : 0}%` }} />
              </div>
            )}
            <div className="ssp2-quickadd">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="مهمة جديدة... (Enter للإضافة)"
                disabled={isLocked || taskBusy}
              />
              <button className="ssp2-btn ssp2-btn--primary" onClick={addTask} disabled={isLocked || taskBusy || !newTask.trim()}>
                <Plus size={14} /> إضافة
              </button>
            </div>
            <ul className="ssp2-tasks">
              {tasks.length === 0 && (
                <li className="ssp2-empty">لا مهام بعد — أضف أول مهمة أعلاه لتنظيم عملك.</li>
              )}
              {tasks.map((t) => (
                <li key={t.id} className={`ssp2-task${t.done ? ' ssp2-task--done' : ''}`}>
                  <button
                    className="ssp2-task__check"
                    onClick={() => toggleTask(t.id)}
                    disabled={isLocked}
                    title={t.done ? 'إلغاء الإنجاز' : 'إنجاز'}
                  >
                    {t.done && <Check size={12} strokeWidth={3} />}
                  </button>
                  <span className="ssp2-task__title">{t.title}</span>
                  {t.done_at && <span className="ssp2-task__date">{fmtDateTime(t.done_at)}</span>}
                  <button className="ssp2-icon-btn ssp2-icon-btn--danger" onClick={() => removeTask(t.id)} disabled={isLocked} title="حذف">
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* دفتر التدوين */}
          <section className="ssp2-card">
            <div className="ssp2-card__head">
              <span className="ssp2-card__title"><NotebookPen size={15} /> دفتر التدوين</span>
              <span className="ssp2-card__meta">{journal.length} تدوينة</span>
            </div>
            <div className="ssp2-quickadd ssp2-quickadd--area">
              <textarea
                value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), addJournal())}
                placeholder="دوّن ما جرى الآن... (Enter للحفظ، Shift+Enter لسطر جديد)"
                rows={2}
                disabled={isLocked || journalBusy}
              />
              <button className="ssp2-btn ssp2-btn--primary" onClick={addJournal} disabled={isLocked || journalBusy || !newEntry.trim()}>
                <NotebookPen size={14} /> تدوين
              </button>
            </div>
            <ul className="ssp2-journal">
              {journal.length === 0 && (
                <li className="ssp2-empty">الدفتر فارغ — كل تدوينة تُحفظ بتاريخها وكاتبها، الأحدث أولاً.</li>
              )}
              {journal.map((j) => (
                <li key={j.id} className="ssp2-journal__entry">
                  <div className="ssp2-journal__meta">
                    <span className="ssp2-journal__author">{j.by_name ?? '—'}</span>
                    <span className="ssp2-journal__date">{fmtDateTime(j.created_at)}</span>
                    <button className="ssp2-icon-btn ssp2-icon-btn--danger" onClick={() => removeJournal(j.id)} disabled={isLocked} title="حذف التدوينة">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <p className="ssp2-journal__text">{j.text}</p>
                </li>
              ))}
            </ul>
          </section>
        </main>

        {/* عمود التواصل والإجراءات */}
        <aside className="ssp2-side">
          <section className="ssp2-card">
            <div className="ssp2-card__head">
              <span className="ssp2-card__title"><ClipboardList size={15} /> الإجراءات والتواصل</span>
            </div>
            <div className="ssp2-side__actions">
              <button className="ssp2-btn ssp2-btn--block" onClick={() => setModal('procedure')} disabled={isLocked}>
                <ClipboardList size={14} /> تسجيل إجراء
              </button>
              <button className="ssp2-btn ssp2-btn--block" onClick={() => setModal('message')} disabled={isLocked}>
                <MessageSquareText size={14} /> رسالة للعميل
              </button>
              <button className="ssp2-btn ssp2-btn--block" onClick={openFileModal} disabled={isLocked}>
                <FileText size={14} /> إرسال ملف للعميل
              </button>
              <button className="ssp2-btn ssp2-btn--block" onClick={openInvoiceModal} disabled={isLocked}>
                <Receipt size={14} /> فاتورة وإرسالها
              </button>
            </div>
            <div className="ssp2-timeline">
              {activities.length === 0 && (
                <p className="ssp2-empty">لا أنشطة بعد — كل إجراء ورسالة وتغيير يُدوَّن هنا تلقائياً.</p>
              )}
              {activities.map((a) => (
                <div key={a.id} className="ssp2-timeline__item">
                  <span className="ssp2-timeline__icon">{ACTIVITY_ICONS[a.type] ?? <ChevronRight size={13} />}</span>
                  <div className="ssp2-timeline__body">
                    <span className="ssp2-timeline__title">{a.title}</span>
                    {a.description && <span className="ssp2-timeline__desc">{a.description}</span>}
                    <span className="ssp2-timeline__meta">
                      {a.performer?.name ? `${a.performer.name} · ` : ''}{fmtDateTime(a.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* المراحل الحرة — العمود الأيسر بصرياً في RTL */}
        <aside className="ssp2-stages">
          <section className="ssp2-card">
            <div className="ssp2-card__head">
              <span className="ssp2-card__title"><Milestone size={15} /> المراحل</span>
              <span className="ssp2-card__meta">{stagesDone}/{stages.length}</span>
            </div>
            {stages.length > 0 && (
              <div className="ssp2-progress ssp2-progress--gold">
                <div className="ssp2-progress__fill" style={{ width: `${stagesPct}%` }} />
              </div>
            )}
            <div className="ssp2-quickadd">
              <input
                value={newStage}
                onChange={(e) => setNewStage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addStage()}
                placeholder="مرحلة جديدة..."
                disabled={isLocked || stagesBusy}
              />
              <button className="ssp2-icon-btn" onClick={addStage} disabled={isLocked || stagesBusy || !newStage.trim()} title="إضافة مرحلة">
                <Plus size={15} />
              </button>
            </div>
            <ol className="ssp2-stagelist">
              {stages.length === 0 && (
                <li className="ssp2-empty">ضع مراحلك بنفسك — «زيارة الجهة»، «إعداد الملف»... بترتيبك الذي تريد.</li>
              )}
              {stages.map((s, i) => (
                <li key={s.id} className={`ssp2-stage${s.done_at ? ' ssp2-stage--done' : ''}`}>
                  <button
                    className="ssp2-stage__dot"
                    onClick={() => toggleStage(s.id)}
                    disabled={isLocked}
                    title={s.done_at ? `أُنجزت ${fmtDateTime(s.done_at)} — انقر للتراجع` : 'انقر للإنجاز'}
                  >
                    {s.done_at && <Check size={11} strokeWidth={3} />}
                  </button>
                  <span className="ssp2-stage__label">{s.label}</span>
                  <span className="ssp2-stage__tools">
                    <button className="ssp2-icon-btn" onClick={() => moveStage(i, -1)} disabled={isLocked || i === 0} title="أعلى">
                      <ChevronUp size={13} />
                    </button>
                    <button className="ssp2-icon-btn" onClick={() => moveStage(i, 1)} disabled={isLocked || i === stages.length - 1} title="أسفل">
                      <ChevronDown size={13} />
                    </button>
                    <button className="ssp2-icon-btn ssp2-icon-btn--danger" onClick={() => removeStage(s.id)} disabled={isLocked} title="حذف">
                      <Trash2 size={12} />
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      {/* ── المودالات ── */}
      {modal === 'procedure' && (
        <MiniModal title="تسجيل إجراء" onClose={() => setModal(null)}>
          <label className="ssp2-label">عنوان الإجراء</label>
          <input className="ssp2-input" value={procTitle} onChange={(e) => setProcTitle(e.target.value)} placeholder="مثال: رُفع الطلب لمنصة بلدي" autoFocus />
          <label className="ssp2-label">تفاصيل (اختياري)</label>
          <textarea className="ssp2-input" rows={3} value={procDesc} onChange={(e) => setProcDesc(e.target.value)} placeholder="رقم مرجع، ملاحظات..." />
          <div className="ssp2-modal__foot">
            <button className="ssp2-btn" onClick={() => setModal(null)}>إلغاء</button>
            <button className="ssp2-btn ssp2-btn--primary" onClick={submitProcedure} disabled={busy || !procTitle.trim()}>
              {busy ? <Loader2 size={14} className="ssp2-spin" /> : <ClipboardList size={14} />} تسجيل
            </button>
          </div>
        </MiniModal>
      )}

      {modal === 'message' && (
        <MiniModal title="رسالة للعميل (واتساب + بريد)" onClose={() => setModal(null)}>
          <p className="ssp2-hint">تُرسل باسم المكتب وتُدوَّن في سجل الخدمة تلقائياً.</p>
          <textarea className="ssp2-input" rows={4} value={clientMsg} onChange={(e) => setClientMsg(e.target.value)} placeholder="اكتب رسالتك للعميل..." autoFocus />
          <div className="ssp2-modal__foot">
            <button className="ssp2-btn" onClick={() => setModal(null)}>إلغاء</button>
            <button className="ssp2-btn ssp2-btn--primary" onClick={submitMessage} disabled={busy || !clientMsg.trim()}>
              {busy ? <Loader2 size={14} className="ssp2-spin" /> : <Send size={14} />} إرسال
            </button>
          </div>
        </MiniModal>
      )}

      {modal === 'file' && (
        <MiniModal title="إرسال ملف للعميل" onClose={() => setModal(null)}>
          <p className="ssp2-hint">
            يُرسل رابط تحميل مؤقت (72 ساعة) عبر واتساب والبريد، ويُدوَّن.
            الملفات هنا هي مخرجات الخدمة الرسمية.
          </p>
          {deliverables.length === 0 ? (
            <p className="ssp2-empty">لا مخرجات على هذه الخدمة بعد — ولّد مستنداً من تبويب المخرجات في الخدمات الأخرى، أو ارفعه كمستند وشاركه عبر بوابة العميل.</p>
          ) : (
            <ul className="ssp2-filepick">
              {deliverables.map((d) => (
                <li key={d.id}>
                  <label className={`ssp2-filepick__item${chosenDeliverable === d.id ? ' ssp2-filepick__item--active' : ''}`}>
                    <input
                      type="radio"
                      name="deliverable"
                      checked={chosenDeliverable === d.id}
                      onChange={() => setChosenDeliverable(d.id)}
                    />
                    <FileText size={14} />
                    <span className="ssp2-filepick__title">{d.title}</span>
                    <span className="ssp2-filepick__meta">{d.format.toUpperCase()} · {new Date(d.created_at).toLocaleDateString('ar-SA')}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <label className="ssp2-label">رسالة مرافقة (اختياري)</label>
          <input className="ssp2-input" value={fileNote} onChange={(e) => setFileNote(e.target.value)} placeholder="مثال: هذا الملف النهائي بعد التعديلات" />
          <div className="ssp2-modal__foot">
            <button className="ssp2-btn" onClick={() => setModal(null)}>إلغاء</button>
            <button className="ssp2-btn ssp2-btn--primary" onClick={submitFile} disabled={busy || !chosenDeliverable}>
              {busy ? <Loader2 size={14} className="ssp2-spin" /> : <Link2 size={14} />} إرسال الرابط
            </button>
          </div>
        </MiniModal>
      )}

      {modal === 'invoice' && (
        <MiniModal title="فاتورة الخدمة" onClose={() => setModal(null)}>
          {!invoicePreview ? (
            <p className="ssp2-state"><Loader2 size={16} className="ssp2-spin" /> جارٍ جلب المعاينة...</p>
          ) : (
            <>
              {invoicePreview.has_existing_invoice && (
                <p className="ssp2-hint ssp2-hint--warn">⚠️ للخدمة فاتورة قائمة — هذا سينشئ فاتورة إضافية.</p>
              )}
              <div className="ssp2-invoice-preview">
                <div><span>الأساس</span><b>{invoicePreview.basis_arabic}</b></div>
                <div><span>المبلغ</span><b>{invoicePreview.subtotal.toLocaleString('ar-SA')} ر.س</b></div>
                <div><span>الضريبة ({invoicePreview.vat_rate}%)</span><b>{invoicePreview.vat_amount.toLocaleString('ar-SA')} ر.س</b></div>
                <div className="ssp2-invoice-preview__total"><span>الإجمالي</span><b>{invoicePreview.total.toLocaleString('ar-SA')} ر.س</b></div>
              </div>
              {invoicePreview.total <= 0 && (
                <p className="ssp2-hint ssp2-hint--warn">لا يوجد أساس فوترة (لا مبلغ متفق عليه) — حدّد مبلغاً من تعديل الخدمة أولاً.</p>
              )}
              <div className="ssp2-modal__foot">
                <button className="ssp2-btn" onClick={() => setModal(null)}>إلغاء</button>
                <button className="ssp2-btn" onClick={() => submitInvoice(false)} disabled={busy || invoicePreview.total <= 0}>
                  إنشاء فقط
                </button>
                <button className="ssp2-btn ssp2-btn--primary" onClick={() => submitInvoice(true)} disabled={busy || invoicePreview.total <= 0}>
                  {busy ? <Loader2 size={14} className="ssp2-spin" /> : <Send size={14} />} إنشاء وإرسال للعميل
                </button>
              </div>
            </>
          )}
        </MiniModal>
      )}
    </div>
  );
};

export default SimpleServicePage;
