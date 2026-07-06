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
  Pause,
  Play,
  Eye,
  Scale,
  CalendarRange,
  Copy,
  Radar,
  MessagesSquare,
  ChevronsLeft,
} from 'lucide-react';
import { LegalServiceService } from '../../services/legalServiceService';
import { apiClient } from '../../utils/api';
import { getApiErrorMessage } from '../../utils/apiError';
import SimpleLetterComposer from '../../components/legal-services/SimpleLetterComposer';
import ServiceTeamChat from '../../components/legal-services/ServiceTeamChat';
import type {
  LegalService,
  SimpleServiceDetail,
  SimpleStage,
  SimpleJournalEntry,
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

// تدوينة طويلة تُقصّ في الدفتر وتُفتح كاملة في مودال (نص مطوّل أو أسطر كثيرة)
const isLongJournal = (t: string) => t.length > 170 || (t.match(/\n/g)?.length ?? 0) >= 4;

// ── حسابات عداد الأيام (فترات إيقاف المراحل تُخصَم من عمر الخدمة) ──────────
const DAY_MS = 86400000;

const pausedMsOf = (stages: SimpleStage[], now: number): number => {
  let total = 0;
  for (const s of stages) {
    for (const p of s.pause_history ?? []) {
      if (p.paused_at && p.resumed_at) {
        total += Math.max(0, new Date(p.resumed_at).getTime() - new Date(p.paused_at).getTime());
      }
    }
    if (s.paused_at && !s.done_at) {
      total += Math.max(0, now - new Date(s.paused_at).getTime());
    }
  }
  return total;
};

const activePauseOf = (stages: SimpleStage[]): SimpleStage | undefined =>
  stages.find((s) => s.paused_at && !s.done_at);

/**
 * الساعة الرملية: حلقة تتناقص حيّاً مع الوقت المتبقي للتسليم — تتجمد عند
 * إيقاف العداد (بانتظار جهة/رد) وتتلوّن بحسب قرب المهلة. بلا مهلة تعرض
 * الأيام المنقضية، وعند الإكمال تتحول لعلامة إنجاز.
 */
const DaysRing: React.FC<{ service: LegalService; stages: SimpleStage[]; size?: number }> = ({ service, stages, size = 64 }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(t);
  }, []);

  if (!service.start_date) return null;

  const finished = ['completed', 'closed', 'archived'].includes(service.status);
  const paused = !finished && !!activePauseOf(stages);
  const start = new Date(service.start_date).getTime();
  const elapsedMs = Math.max(0, now - start - pausedMsOf(stages, now));
  const elapsedDays = Math.floor(elapsedMs / DAY_MS);

  let fraction = 1;
  let centerNum = `${elapsedDays}`;
  let centerLabel = 'يوم عمل';
  let color = 'var(--quiet-gray-400, #9ca3af)';

  if (service.due_date) {
    const totalDays = Math.max(1, Math.round((new Date(service.due_date).getTime() - start) / DAY_MS));
    const remaining = Math.ceil(totalDays - elapsedMs / DAY_MS);
    fraction = Math.min(1, Math.max(0, remaining / totalDays));
    if (remaining < 0) {
      centerNum = `${Math.abs(remaining)}`;
      centerLabel = 'يوم تأخير';
      color = 'var(--status-red)';
    } else {
      centerNum = `${remaining}`;
      centerLabel = 'يوم متبقٍ';
      color = fraction <= 0.2 ? 'var(--status-red)' : fraction <= 0.5 ? 'var(--status-orange)' : 'var(--status-green)';
    }
  }
  if (paused) color = 'var(--status-orange)';
  if (finished) {
    fraction = 1;
    color = 'var(--status-green)';
  }

  const R = 26;
  const C = 2 * Math.PI * R;

  return (
    <div className="ssp2-ring" title={paused ? `العداد موقوف — ${activePauseOf(stages)?.pause_reason ?? ''}` : undefined}>
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <circle cx="32" cy="32" r={R} fill="none" stroke="var(--quiet-gray-100)" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={R} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="butt"
          strokeDasharray={C} strokeDashoffset={C * (1 - fraction)}
          transform="rotate(-90 32 32)"
          style={{ transition: 'stroke-dashoffset .6s, stroke .3s' }}
        />
        {finished ? (
          <text x="32" y="38" textAnchor="middle" fontSize="20" fill={color}>✓</text>
        ) : (
          <>
            <text x="32" y="31" textAnchor="middle" fontSize="17" fontWeight="700" fill="currentColor">{centerNum}</text>
            <text x="32" y="43" textAnchor="middle" fontSize="8" fill="var(--color-text-secondary, #6b7280)">{centerLabel}</text>
          </>
        )}
      </svg>
      {paused && <span className="ssp2-ring__paused"><Pause size={10} strokeWidth={3} /></span>}
    </div>
  );
};

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

  // القدوم من إشعار منشن (#team-chat) → فتح الدردشة إن كانت مطوية + تمرير إليها
  useEffect(() => {
    if (!loading && window.location.hash === '#team-chat') {
      setChatCollapsed(false);
      window.setTimeout(() => {
        document.getElementById('team-chat')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
    }
  }, [loading]);

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
  /* المرحلة الجارية الآن (أول غير منجزة) — عليها التحريك المرئي اللطيف */
  const currentStageIdx = stages.findIndex((s) => !s.done_at);

  // ── إيقاف العداد عند مرحلة / وصف المرحلة للعميل ──
  const [pauseTarget, setPauseTarget] = useState<SimpleStage | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const PAUSE_PRESETS = [
    'بانتظار رد الجهة الحكومية',
    'بانتظار مستندات من العميل',
    'بانتظار رد العميل',
  ];

  const submitPause = async () => {
    if (!pauseTarget || !pauseReason.trim()) return;
    setBusy(true);
    try {
      const res = await LegalServiceService.pauseSimpleStage(serviceId, pauseTarget.id, pauseReason.trim());
      if (res.success) applyDetail(res.data);
      toast.success('أُوقف العداد ودُوِّن السبب');
      setPauseTarget(null);
      setPauseReason('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إيقاف العداد'));
    } finally {
      setBusy(false);
    }
  };

  const resumeStage = async (stageId: string) => {
    try {
      const res = await LegalServiceService.resumeSimpleStage(serviceId, stageId);
      if (res.success) applyDetail(res.data);
      toast.success('استُؤنف العداد');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر استئناف العداد'));
    }
  };

  const [noteTarget, setNoteTarget] = useState<SimpleStage | null>(null);
  const [noteText, setNoteText] = useState('');

  const submitClientNote = async () => {
    if (!noteTarget) return;
    setBusy(true);
    try {
      const res = await LegalServiceService.updateSimpleStageClientNote(serviceId, noteTarget.id, noteText.trim());
      if (res.success) applyDetail(res.data);
      toast.success(noteText.trim() ? 'حُفظ الوصف — سيظهر للعميل في بوابة المتابعة' : 'مُسح الوصف');
      setNoteTarget(null);
      setNoteText('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر حفظ الوصف'));
    } finally {
      setBusy(false);
    }
  };

  // ── رابط تتبع الخدمة للعميل (بوابة المتابعة) ──
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // فتح المودال = توليد الرابط فوراً للنسخ (بلا إرسال إجباري)
  const openPortalModal = async () => {
    setModal('portal');
    setPortalUrl(null);
    setPortalLoading(true);
    try {
      const res = await LegalServiceService.generateSimplePortalLink(serviceId);
      setPortalUrl(res.data?.url ?? null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر توليد رابط التتبع'));
    } finally {
      setPortalLoading(false);
    }
  };

  // إرسال واتساب اختياري بجانب النسخ
  const sendPortalWhatsapp = async () => {
    setBusy(true);
    try {
      const res = await LegalServiceService.sendSimplePortalLink(serviceId);
      setPortalUrl(res.data?.url ?? portalUrl);
      toast.success(res.message || 'أُرسل رابط التتبع للعميل');
      fetchService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إرسال رابط التتبع'));
    } finally {
      setBusy(false);
    }
  };

  const copyPortalUrl = async () => {
    if (!portalUrl) return;
    try {
      await navigator.clipboard.writeText(portalUrl);
      toast.success('نُسخ الرابط');
    } catch {
      toast.error('تعذّر النسخ — انسخه يدوياً');
    }
  };

  // ── طيّ الدردشة وتصغير المهام (تفضيل محفوظ) ──
  const [chatCollapsed, setChatCollapsed] = useState(() => localStorage.getItem('ssp2_chat_collapsed') === '1');
  const toggleChatCollapsed = () =>
    setChatCollapsed((v) => {
      localStorage.setItem('ssp2_chat_collapsed', v ? '0' : '1');
      return !v;
    });

  const [tasksCollapsed, setTasksCollapsed] = useState(() => localStorage.getItem('ssp2_tasks_collapsed') === '1');
  const toggleTasksCollapsed = () =>
    setTasksCollapsed((v) => {
      localStorage.setItem('ssp2_tasks_collapsed', v ? '0' : '1');
      return !v;
    });

  const [stagesCollapsed, setStagesCollapsed] = useState(() => localStorage.getItem('ssp2_stages_collapsed') === '1');
  const toggleStagesCollapsed = () =>
    setStagesCollapsed((v) => {
      localStorage.setItem('ssp2_stages_collapsed', v ? '0' : '1');
      return !v;
    });

  const [journalCollapsed, setJournalCollapsed] = useState(() => localStorage.getItem('ssp2_journal_collapsed') === '1');
  const toggleJournalCollapsed = () =>
    setJournalCollapsed((v) => {
      localStorage.setItem('ssp2_journal_collapsed', v ? '0' : '1');
      return !v;
    });

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
  const [journalView, setJournalView] = useState<SimpleJournalEntry | null>(null);

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

  // ── استوديو المخرَج ──
  const [composerOpen, setComposerOpen] = useState(false);

  // ── المودالات: إجراء / رسالة / ملف / فاتورة / رابط التتبع ──
  const [modal, setModal] = useState<null | 'procedure' | 'message' | 'file' | 'invoice' | 'portal'>(null);
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
    stage_paused: <Pause size={13} />,
    stage_resumed: <Play size={13} />,
    portal_link_sent: <Radar size={13} />,
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
      {/* ── الترويسة: العنوان والأزرار + صف الحقائق (المحامي/المدة/العداد) ── */}
      <header className="ssp2-header">
        <div className="ssp2-header__top">
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
            {/* أزرار التواصل (رسالة/ملف/فاتورة) في شريط أدوات مساحة العمل — لا تكرار هنا */}
            <button
              className="ssp2-btn"
              onClick={() => setComposerOpen(true)}
              disabled={isLocked}
              title="استوديو المخرَج: ألّف وثيقة الخدمة ببلوكات حرّة (نص/جدول/توقيع) بكليشة تختارها، ثم PDF وإرسال"
            >
              ✍️ مخرَج الخدمة
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
        </div>

        <div className="ssp2-header__facts">
          <DaysRing service={service} stages={stages} size={44} />
          <span className="ssp2-fact">
            <Scale size={13} />
            <span className="ssp2-fact__label">المحامي المسؤول</span>
            <b>{service.assigned_lawyer?.name ?? 'غير مسند'}</b>
          </span>
          <span className="ssp2-fact__sep" />
          <span className="ssp2-fact">
            <CalendarRange size={13} />
            <span className="ssp2-fact__label">البدء</span>
            <b>{service.start_date ? new Date(service.start_date).toLocaleDateString('ar-SA') : '—'}</b>
          </span>
          <span className="ssp2-fact__sep" />
          <span className="ssp2-fact">
            <CalendarRange size={13} />
            <span className="ssp2-fact__label">التسليم المتوقع</span>
            <b>{service.due_date ? new Date(service.due_date).toLocaleDateString('ar-SA') : 'بلا مهلة'}</b>
          </span>
          {(() => {
            const ap = activePauseOf(stages);
            return ap ? (
              <span className="ssp2-fact ssp2-fact--paused">
                <Pause size={13} strokeWidth={3} />
                العداد موقوف عند «{ap.label}»{ap.pause_reason ? ` — ${ap.pause_reason}` : ''}
              </span>
            ) : null;
          })()}
        </div>
      </header>

      {/* ── ثلاثة أقسام بملء الشاشة (نمط الطلبات الإدارية): [الدردشة — يمين] [مساحة العمل] [المراحل — أقصى اليسار] ── */}
      <div className="ssp2-layout">
        {/* عمود الدردشة — متصل بالحواف، قابل للطيّ إلى شريط رفيع */}
        <aside className={`ssp2-chatcol${chatCollapsed ? ' ssp2-chatcol--min' : ''}`}>
          {chatCollapsed ? (
            <button className="ssp2-chatcol__reopen" onClick={toggleChatCollapsed} title="فتح محادثة الفريق">
              <MessagesSquare size={17} />
              <span>محادثة الفريق</span>
            </button>
          ) : (
            <ServiceTeamChat serviceId={serviceId} onCollapse={toggleChatCollapsed} onServiceMutated={fetchService} />
          )}
        </aside>

        {/* مساحة العمل: شريط أدوات ثابت ثم [مهام | تدوين] وسجل النشاط */}
        <main className="ssp2-work">
          <div className="ssp2-toolbar">
            <button className="ssp2-btn" onClick={() => setModal('procedure')} disabled={isLocked}>
              <ClipboardList size={14} /> تسجيل إجراء
            </button>
            <button className="ssp2-btn" onClick={() => setModal('message')} disabled={isLocked} title="رسالة واتساب + بريد للعميل (تُدوَّن)">
              <MessageSquareText size={14} /> رسالة للعميل
            </button>
            <button className="ssp2-btn" onClick={openFileModal} disabled={isLocked} title="إرسال مخرَج برابط تحميل مؤقت (72 ساعة)">
              <FileText size={14} /> إرسال ملف
            </button>
            <button className="ssp2-btn" onClick={openInvoiceModal} disabled={isLocked}>
              <Receipt size={14} /> فاتورة
            </button>
            <button
              className="ssp2-btn"
              onClick={openPortalModal}
              disabled={isLocked}
              title="بوابة متابعة يتتبع منها العميل مراحل خدمته — يُولَّد الرابط للنسخ"
            >
              <Radar size={14} /> رابط تتبع للعميل
            </button>
          </div>

          <div className="ssp2-work__scroll">
            <div className="ssp2-work__grid">
          {/* المهام — قابلة للتصغير إلى صف دوائر الإنجاز */}
          <section className="ssp2-card ssp2-card--tasks">
            <div className="ssp2-card__head">
              <span className="ssp2-card__title"><ListChecks size={15} /> المهام</span>
              <span className="ssp2-card__headtools">
                <span className="ssp2-card__meta">{tasksDone}/{tasks.length}</span>
                <button
                  className="ssp2-icon-btn"
                  onClick={toggleTasksCollapsed}
                  title={tasksCollapsed ? 'توسيع المهام' : 'تصغير المهام — تبقى دوائر الإنجاز ظاهرة'}
                >
                  {tasksCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                </button>
              </span>
            </div>
            {tasksCollapsed ? (
              <div className="ssp2-tasks-mini">
                {tasks.length === 0 ? (
                  <span className="ssp2-tasks-mini__empty">لا مهام بعد</span>
                ) : (
                  tasks.map((t) => (
                    <button
                      key={t.id}
                      className={`ssp2-tasks-mini__dot${t.done ? ' is-done' : ''}`}
                      onClick={() => toggleTask(t.id)}
                      disabled={isLocked}
                      title={`${t.title}${t.done ? ' — منجزة (انقر للتراجع)' : ' — انقر للإنجاز'}`}
                    >
                      {t.done && <Check size={11} strokeWidth={3} />}
                    </button>
                  ))
                )}
              </div>
            ) : (
              <>
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
              </>
            )}
          </section>

          {/* دفتر التدوين — قابل للتصغير إلى سطر بآخر تدوينة */}
          <section className="ssp2-card ssp2-card--journal">
            <div className="ssp2-card__head">
              <span className="ssp2-card__title"><NotebookPen size={15} /> دفتر التدوين</span>
              <span className="ssp2-card__headtools">
                <span className="ssp2-card__meta">{journal.length} تدوينة</span>
                <button
                  className="ssp2-icon-btn"
                  onClick={toggleJournalCollapsed}
                  title={journalCollapsed ? 'توسيع الدفتر' : 'تصغير الدفتر'}
                >
                  {journalCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                </button>
              </span>
            </div>
            {journalCollapsed ? (
              <button className="ssp2-journal-mini" onClick={toggleJournalCollapsed} title="انقر لتوسيع الدفتر">
                {journal.length > 0 ? (
                  <>
                    <b>{journal[0].by_name ?? '—'}:</b> {journal[0].text}
                  </>
                ) : (
                  'الدفتر فارغ'
                )}
              </button>
            ) : (
            <>
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
              {journal.map((j) => {
                const long = isLongJournal(j.text);
                return (
                  <li key={j.id} className="ssp2-journal__entry">
                    <div className="ssp2-journal__meta">
                      <span className="ssp2-journal__author">{j.by_name ?? '—'}</span>
                      <span className="ssp2-journal__date">{fmtDateTime(j.created_at)}</span>
                      <button className="ssp2-icon-btn ssp2-icon-btn--danger" onClick={() => removeJournal(j.id)} disabled={isLocked} title="حذف التدوينة">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p
                      className={`ssp2-journal__text${long ? ' ssp2-journal__text--clamp' : ''}`}
                      onClick={long ? () => setJournalView(j) : undefined}
                      title={long ? 'اضغط لعرض التدوينة كاملة' : undefined}
                    >
                      {j.text}
                    </p>
                    {long && (
                      <button className="ssp2-journal__more" onClick={() => setJournalView(j)}>
                        عرض التدوينة كاملة
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            </>
            )}
          </section>
            </div>

          {/* سجل النشاط — كل إجراء ورسالة وتغيير يُدوَّن هنا تلقائياً */}
          <section className="ssp2-card ssp2-activity">
            <div className="ssp2-card__head">
              <span className="ssp2-card__title"><ClipboardList size={15} /> سجل الإجراءات والتواصل</span>
              <span className="ssp2-card__meta">{activities.length}</span>
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
          </div>
        </main>

        {/* المراحل الحرة — أقصى اليسار، عمود متصل قابل للطيّ إلى شريط دوائر */}
        <aside className={`ssp2-stagescol${stagesCollapsed ? ' ssp2-stagescol--min' : ''}`}>
          {stagesCollapsed ? (
            <div className="ssp2-stagescol__rail">
              <button className="ssp2-stagerail__open" onClick={toggleStagesCollapsed} title="فتح المراحل">
                <Milestone size={16} />
              </button>
              <div className="ssp2-stagerail">
                {stages.map((s, i) => {
                  const isPaused = !!s.paused_at && !s.done_at;
                  const isCurrent = i === currentStageIdx && !isPaused && !isLocked;
                  return (
                    <div key={s.id} className="ssp2-stagerail__item">
                      <button
                        className={`ssp2-stagerail__dot${s.done_at ? ' is-done' : ''}${isPaused ? ' is-paused' : ''}${isCurrent ? ' is-current' : ''}`}
                        onClick={() => toggleStage(s.id)}
                        disabled={isLocked}
                        title={`${s.label}${s.done_at ? ' — منجزة (انقر للتراجع)' : isPaused ? ` — موقوفة${s.pause_reason ? `: ${s.pause_reason}` : ''}` : ' — انقر للإنجاز'}`}
                      >
                        {s.done_at ? <Check size={10} strokeWidth={3} /> : isPaused ? <Pause size={8} strokeWidth={3} /> : null}
                      </button>
                    </div>
                  );
                })}
              </div>
              <span className="ssp2-stagerail__meta">{stagesDone}/{stages.length}</span>
            </div>
          ) : (
          <>
          <div className="ssp2-card__head ssp2-stagescol__head">
            <span className="ssp2-card__title"><Milestone size={15} /> المراحل</span>
            <span className="ssp2-card__headtools">
              <span className="ssp2-card__meta">{stagesDone}/{stages.length}</span>
              <button
                className="ssp2-icon-btn"
                onClick={toggleStagesCollapsed}
                title="طيّ المراحل — تبقى الدوائر ظاهرة"
              >
                <ChevronsLeft size={15} />
              </button>
            </span>
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
              {stages.map((s, i) => {
                const isPaused = !!s.paused_at && !s.done_at;
                const isCurrent = i === currentStageIdx && !isPaused && !isLocked;
                return (
                  <li
                    key={s.id}
                    className={`ssp2-stage${s.done_at ? ' ssp2-stage--done' : ''}${isPaused ? ' ssp2-stage--paused' : ''}${isCurrent ? ' ssp2-stage--current' : ''}`}
                  >
                    <button
                      className="ssp2-stage__dot"
                      onClick={() => toggleStage(s.id)}
                      disabled={isLocked}
                      title={s.done_at ? `أُنجزت ${fmtDateTime(s.done_at)} — انقر للتراجع` : 'انقر للإنجاز'}
                    >
                      {s.done_at ? <Check size={11} strokeWidth={3} /> : isPaused ? <Pause size={9} strokeWidth={3} /> : null}
                    </button>
                    <div className="ssp2-stage__content">
                      <span className="ssp2-stage__label">{s.label}</span>
                      {isPaused && (
                        <span className="ssp2-stage__pausebadge">
                          <Pause size={10} strokeWidth={3} /> موقوفة{s.pause_reason ? ` — ${s.pause_reason}` : ''}
                        </span>
                      )}
                      {/* تفاصيل تظهر أسفل المرحلة عند المرور بالماوس */}
                      <span className="ssp2-stage__meta">
                        {s.done_at && (
                          <span>✓ اعتمدها {s.done_by_name ?? '—'} · {fmtDateTime(s.done_at)}</span>
                        )}
                        {s.created_by_name && (
                          <span>+ أنشأها {s.created_by_name}{s.created_at ? ` · ${fmtDateTime(s.created_at)}` : ''}</span>
                        )}
                        {s.client_note && (
                          <span className="ssp2-stage__clientnote"><Eye size={11} /> يظهر للعميل: {s.client_note}</span>
                        )}
                      </span>
                    </div>
                    <span className="ssp2-stage__tools">
                      {!s.done_at && (
                        isPaused ? (
                          <button
                            className="ssp2-icon-btn"
                            onClick={() => resumeStage(s.id)}
                            disabled={isLocked}
                            title="استئناف العداد"
                          >
                            <Play size={13} />
                          </button>
                        ) : (
                          <button
                            className="ssp2-icon-btn"
                            onClick={() => { setPauseTarget(s); setPauseReason(''); }}
                            disabled={isLocked}
                            title="إيقاف العداد مؤقتاً (بانتظار جهة/رد) — السبب يظهر للعميل"
                          >
                            <Pause size={13} />
                          </button>
                        )
                      )}
                      <button
                        className="ssp2-icon-btn"
                        onClick={() => { setNoteTarget(s); setNoteText(s.client_note ?? ''); }}
                        disabled={isLocked}
                        title="وصف المرحلة الظاهر للعميل في بوابة المتابعة"
                      >
                        <Eye size={13} />
                      </button>
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
                );
              })}
            </ol>
          </>
          )}
        </aside>
      </div>

      {/* ── خطاب الخدمة (بتجربة إنشاء الصادر — المستلم والعنوان جاهزان) ── */}
      {composerOpen && (
        <SimpleLetterComposer
          service={service}
          onClose={() => { setComposerOpen(false); fetchService(); }}
          onChanged={fetchService}
        />
      )}

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

      {pauseTarget && (
        <MiniModal title={`إيقاف العداد — «${pauseTarget.label}»`} onClose={() => setPauseTarget(null)}>
          <p className="ssp2-hint">
            يتجمد عداد أيام الخدمة حتى الاستئناف، ولا تُحتسب مدة الإيقاف من عمر الخدمة.
            السبب يظهر للعميل في بوابة المتابعة ويُدوَّن في السجل.
          </p>
          <div className="ssp2-presets">
            {PAUSE_PRESETS.map((p) => (
              <button
                key={p}
                className={`ssp2-preset${pauseReason === p ? ' ssp2-preset--on' : ''}`}
                onClick={() => setPauseReason(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <label className="ssp2-label">سبب الإيقاف</label>
          <input
            className="ssp2-input"
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            placeholder="مثال: بانتظار رد الجهة الحكومية"
            autoFocus
          />
          <div className="ssp2-modal__foot">
            <button className="ssp2-btn" onClick={() => setPauseTarget(null)}>إلغاء</button>
            <button className="ssp2-btn ssp2-btn--primary" onClick={submitPause} disabled={busy || !pauseReason.trim()}>
              {busy ? <Loader2 size={14} className="ssp2-spin" /> : <Pause size={14} />} إيقاف العداد
            </button>
          </div>
        </MiniModal>
      )}

      {noteTarget && (
        <MiniModal title={`وصف للعميل — «${noteTarget.label}»`} onClose={() => setNoteTarget(null)}>
          <p className="ssp2-hint">
            يظهر هذا الوصف للعميل تحت المرحلة في بوابة المتابعة — اشرح له ما يجري بلغة بسيطة.
            اتركه فارغاً ثم احفظ لمسحه.
          </p>
          <textarea
            className="ssp2-input"
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="مثال: قدّمنا الطلب للجهة وننتظر الرد خلال أسبوع"
            autoFocus
          />
          <div className="ssp2-modal__foot">
            <button className="ssp2-btn" onClick={() => setNoteTarget(null)}>إلغاء</button>
            <button className="ssp2-btn ssp2-btn--primary" onClick={submitClientNote} disabled={busy}>
              {busy ? <Loader2 size={14} className="ssp2-spin" /> : <Eye size={14} />} حفظ
            </button>
          </div>
        </MiniModal>
      )}

      {modal === 'portal' && (
        <MiniModal title="رابط تتبع الخدمة للعميل" onClose={() => setModal(null)}>
          <p className="ssp2-hint">
            بوابة متابعة يفتحها العميل بلا تسجيل دخول: يرى مراحل الخدمة وتقدّمها
            والأيام المتبقية والمستندات. انسخ الرابط وأرسله له كيفما شئت.
          </p>
          <label className="ssp2-label">رابط المتابعة</label>
          <div className="ssp2-portalurl">
            <input
              className="ssp2-input"
              value={portalLoading ? 'جارٍ توليد الرابط…' : (portalUrl ?? '')}
              readOnly
              dir="ltr"
              onFocus={(e) => e.target.select()}
            />
            <button className="ssp2-btn" onClick={copyPortalUrl} disabled={!portalUrl} title="نسخ الرابط">
              {portalLoading ? <Loader2 size={14} className="ssp2-spin" /> : <Copy size={14} />} نسخ
            </button>
          </div>
          <div className="ssp2-modal__foot">
            <button className="ssp2-btn" onClick={() => setModal(null)}>تم</button>
            {service.client && (
              <button className="ssp2-btn ssp2-btn--primary" onClick={sendPortalWhatsapp} disabled={busy || !portalUrl}>
                {busy ? <Loader2 size={14} className="ssp2-spin" /> : <Send size={14} />} إرسال عبر واتساب
              </button>
            )}
          </div>
        </MiniModal>
      )}

      {journalView && (
        <MiniModal title="التدوينة" onClose={() => setJournalView(null)}>
          <div className="ssp2-journalview__head">
            <span className="ssp2-journalview__author"><User size={13} /> {journalView.by_name ?? '—'}</span>
            <span className="ssp2-journalview__date">{fmtDateTime(journalView.created_at)}</span>
          </div>
          <p className="ssp2-journalview__text">{journalView.text}</p>
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
