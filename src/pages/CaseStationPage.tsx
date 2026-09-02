/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  AlarmClock,
  AlertCircle,
  ArrowLeftRight,
  BookOpen,
  Building,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  DollarSign,
  Edit,
  ExternalLink,
  FileText,
  Folder,
  Gavel,
  Hash,
  Info,
  Landmark,
  Link2,
  MessageSquare,
  MoreHorizontal,
  PenTool,
  Plus,
  RefreshCw,
  Scale,
  Scroll,
  Send,
  Sparkles,
  Star,
  Users,
  Video,
  X as XIcon,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { CaseService } from '../services/caseService';
import { ActivityService } from '../services/activityService';
import { DocumentService } from '../services/documentService';
import { TaskService } from '../services/taskService';
import { UserService } from '../services/UserService';
import deadlineService, { type LegalDeadline } from '../services/deadlineService';
import { caseRequestService, type CaseRequestItem, type CaseRequestsSummary } from '../services/caseRequestService';
import { LegalMemoService, type LegalMemo } from '../services/legalMemoService';
import { DocumentRequestService } from '../services/documentRequestService';
import { MessageService, type Message } from '../services/messageService';
import { SessionPrepService, type SessionMotion, type SessionPreparation } from '../services/sessionPrepService';
import { sessionReportService } from '../services/sessionReportService';
import { caseStationService, type CaseStation, type StationNode, type StationNodeRef } from '../services/caseStationService';
import { UiPreferencesService, type UiPrefs } from '../services/uiPreferencesService';
import Timeline, { type TimelineEvent } from '../components/Timeline';
import EditCaseModal from '../components/EditCaseModal';
import AddTaskModal from '../components/AddTaskModal';
import CaseDocumentsModal from '../components/CaseDocumentsModal';
import CaseTasksModal from '../components/CaseTasksModal';
import { CaseAppointmentsModal } from '../components/CaseAppointmentsModal';
import QuickActionsModal from '../components/QuickActionsModal';
import ClientPhoneModal from '../components/ClientPhoneModal';
import CaseMessagesModal from '../components/CaseMessagesModal';
import ShareCaseModal from '../components/ShareCaseModal';
import LinkToNajizModal from '../components/LinkToNajizModal';
import CasePartiesModal from '../components/CasePartiesModal';
import LegalMemoWorkspace from '../components/LegalMemoWorkspace';
import CasePrepKitchen from '../components/CasePrepKitchen';
import LawSearchModal from '../components/LawSearchModal';
import PrecedentSearchModal from '../components/PrecedentSearchModal';
import CaseWekalatPanel from '../components/CaseWekalatPanel';
import { AddSessionModal } from '../components/AddSessionModal';
import { SendDabtPreferencesModal, type NotifyMode } from '../components/SendDabtPreferencesModal';
import { SendSessionReportModal } from '../components/SendSessionReportModal';
import { CaseReportModal } from '../components/CaseReportModal';
import NajizAccessRevokedModal, { NAJIZ_ACCESS_REVOKED_CODE } from '../components/NajizAccessRevokedModal';
import OutcomeBadge from '../components/OutcomeBadge';
import { ActionMenu, type ActionMenuItem } from '../components/erp';
import CaseStationFeedbackModal, { type FeedbackMode } from '../components/case-station/CaseStationFeedbackModal';
import { toHijri } from '../utils/hijriDate';
import type { Case, Document as CaseDocument, Task } from '../types';
import type { DocumentRequest } from '../types/documentRequests';

// ─────────────────────────────────────────────── أدوات صغيرة

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const parseDate = (v: unknown): Date | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  return y >= 1900 && y <= 2100 ? d : null;
};

const gDate = (v: unknown, opts: { year?: boolean; weekday?: boolean } = {}): string => {
  const d = parseDate(v);
  if (!d) return '—';
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}${opts.year === false ? '' : ` ${d.getFullYear()}`}`;
  return opts.weekday ? `${WEEKDAYS[d.getDay()]} ${base}` : base;
};

const relTime = (v: unknown): string => {
  const d = parseDate(v);
  if (!d) return '';
  const now = new Date();
  const days = Math.floor((now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  const time = d.toLocaleTimeString('ar-SA-u-ca-gregory', { hour: '2-digit', minute: '2-digit' });
  if (days === 0) return `اليوم ${time}`;
  if (days === 1) return `أمس ${time}`;
  return gDate(d, { year: false });
};

const money = (n: number | null | undefined): string => (Number(n) || 0).toLocaleString('en-US');

const TASK_STATUS: Record<string, { label: string; cls: string }> = {
  todo: { label: 'جديدة', cls: 'cst-tag--gray' },
  in_progress: { label: 'قيد التنفيذ', cls: 'cst-tag--blue' },
  review: { label: 'قيد المراجعة', cls: 'cst-tag--purple' },
  pending_approval: { label: 'بانتظار الاعتماد', cls: 'cst-tag--purple' },
  on_hold: { label: 'موقوفة', cls: 'cst-tag--orange' },
  completed: { label: 'مكتملة', cls: 'cst-tag--green' },
  cancelled: { label: 'ملغاة', cls: 'cst-tag--gray' },
  overdue: { label: 'متأخرة', cls: 'cst-tag--red' },
  archived: { label: 'مؤرشفة', cls: 'cst-tag--gray' },
};
const PRIORITY: Record<string, { label: string; cls: string }> = {
  urgent: { label: 'عاجلة', cls: 'cst-tag--red' },
  high: { label: 'عالية', cls: 'cst-tag--orange' },
  medium: { label: 'متوسطة', cls: 'cst-tag--gray' },
  low: { label: 'منخفضة', cls: 'cst-tag--gray' },
};
const MEMO_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'مسودة', cls: 'cst-tag--orange' },
  under_review: { label: 'قيد المراجعة', cls: 'cst-tag--purple' },
  approved: { label: 'معتمدة', cls: 'cst-tag--green' },
  needs_revision: { label: 'تحتاج تعديلاً', cls: 'cst-tag--red' },
  finalized: { label: 'نهائية', cls: 'cst-tag--green' },
};
const REPLY_STATUS_CLS: Record<string, string> = {
  awaiting_reply: 'cst-tag--orange',
  replied: 'cst-tag--green',
  dismissed: 'cst-tag--gray',
  stale: 'cst-tag--gray',
  not_applicable: 'cst-tag--gray',
  unclassified: 'cst-tag--line',
};
const SIDE_INITIAL: Record<string, string> = { plaintiff: 'م', defendant: 'ض', lawyer: 'و', agent: 'ك', appellant: 'س', appellee: 'د', other: 'ط' };
const SIDE_GROUP: Record<string, string> = {
  plaintiff: 'المدعي', defendant: 'المدعى عليه', appellant: 'المستأنِف', appellee: 'المستأنَف ضدّه', agent: 'الوكلاء والممثلون', lawyer: 'المحامون', other: 'أطراف أخرى',
};
const SIDE_ORDER = ['plaintiff', 'defendant', 'appellant', 'appellee', 'other', 'agent', 'lawyer'];

const statusChip = (status: string | undefined | null): string => {
  const s = (status || '').toLowerCase();
  if (s.includes('منتهية') || s.includes('مغلقة') || s === 'closed' || s === 'dismissed') return 'cst-chip--gray';
  if (s.includes('معلقة') || s.includes('قيد النظر') || s === 'pending') return 'cst-chip--blue';
  return 'cst-chip--green';
};

const splitTitle = (title: string): { a: string; b: string | null } => {
  const m = title.match(/^(.*?)\s+ضد\s+(.*)$/u);
  if (!m) return { a: title, b: null };
  return { a: m[1].trim(), b: m[2].replace(/\s+—\s+[\w-]+$/u, '').trim() };
};

const initial = (name?: string | null): string => (name || '؟').trim().charAt(0);

type Selection = { key: string; kind: StationNode['kind']; ref: StationNodeRef | null; tab?: string };

interface Props {
  prefs: UiPrefs;
  onPrefsChange: (p: UiPrefs) => void;
  onSwitchToClassic: (reason?: string) => void;
}

const FEEDBACK_PROMPT_VISITS = 3;
const FEEDBACK_PROMPT_MS = 4 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════ الصفحة

const CaseStationPage: React.FC<Props> = ({ prefs, onPrefsChange, onSwitchToClassic }) => {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokedInfo, setRevokedInfo] = useState<{ title?: string; file_number?: string } | null>(null);

  const [station, setStation] = useState<CaseStation | null>(null);
  const [stationError, setStationError] = useState<string | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deadlines, setDeadlines] = useState<LegalDeadline[]>([]);
  const [requests, setRequests] = useState<CaseRequestItem[]>([]);
  const [requestsSummary, setRequestsSummary] = useState<CaseRequestsSummary | null>(null);
  const [memos, setMemos] = useState<LegalMemo[]>([]);
  const [docRequests, setDocRequests] = useState<DocumentRequest[]>([]);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [canLinkToNajiz, setCanLinkToNajiz] = useState(false);

  const [sel, setSel] = useState<Selection | null>(null);
  const [dock, setDock] = useState<string>('tasks');

  // modals
  const [showEdit, setShowEdit] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showMemoWorkspace, setShowMemoWorkspace] = useState(false);
  const [editingMemo, setEditingMemo] = useState<any>(null);
  const [showCaseReport, setShowCaseReport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showWekalat, setShowWekalat] = useState(false);
  const [showPrecedents, setShowPrecedents] = useState(false);
  const [showLawSearch, setShowLawSearch] = useState(false);
  const [showLinkNajiz, setShowLinkNajiz] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);
  const [showParties, setShowParties] = useState(false);
  const [showClientPhone, setShowClientPhone] = useState(false);
  const [notifySession, setNotifySession] = useState<{ id: number; mode: NotifyMode | null; enabled: boolean } | null>(null);
  const [reportSession, setReportSession] = useState<number | null>(null);
  const [dabtSession, setDabtSession] = useState<any>(null);
  const [judgementModal, setJudgementModal] = useState<any>(null);
  const [markingEndedId, setMarkingEndedId] = useState<number | null>(null);

  // feedback
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>('rate');
  const promptedRef = useRef(false);

  const hasFetchedRef = useRef<string | null>(null);

  // ── تحميل ──────────────────────────────────────────────
  const loadCore = useCallback(async () => {
    if (!caseId) return;
    const [fetched, activities, docs, tasksPage] = await Promise.all([
      CaseService.getCase(caseId),
      ActivityService.getCaseActivities(caseId).catch(() => [] as any[]),
      DocumentService.getCaseDocuments(caseId).catch(() => [] as CaseDocument[]),
      TaskService.getTasks({ case_id: caseId } as any).catch(() => ({ data: [] } as any)),
    ]);
    setCaseData(fetched);
    setDocuments(docs || []);
    setTasks((tasksPage as any)?.data ?? []);
    setEvents((activities as any[]).map((a: any) => ({
      id: String(a.id),
      type: a.type,
      title: a.title,
      description: a.description || '',
      date: new Date(a.date),
      user: a.user,
      metadata: a.metadata,
      hidden_from_client: a.hidden_from_client,
      system_hidden: a.system_hidden,
    })));
    return fetched;
  }, [caseId]);

  const loadStation = useCallback(async () => {
    if (!caseId) return;
    try {
      const s = await caseStationService.get(caseId);
      setStation(s);
      setStationError(null);
    } catch (e: any) {
      setStationError(e?.message || 'تعذّر تحميل مسار القضية');
    }
  }, [caseId]);

  const loadSecondary = useCallback(() => {
    if (!caseId) return;
    const id = Number(caseId);
    deadlineService.list({ case_id: id, status: 'active,in_progress' } as any).then(setDeadlines).catch(() => setDeadlines([]));
    caseRequestService.list(id).then((r) => { setRequests(r.requests || []); setRequestsSummary(r.summary || null); }).catch(() => { setRequests([]); setRequestsSummary(null); });
    LegalMemoService.getCaseMemos(caseId).then((m) => setMemos(m || [])).catch(() => setMemos([]));
    DocumentRequestService.listByCase(id).then((d) => setDocRequests(d || [])).catch(() => setDocRequests([]));
    MessageService.getAllCaseMessages(id, 1, 30).then((r) => setMessages(r.messages?.data ?? [])).catch(() => setMessages(null));
    CaseService.canLinkToNajiz(id).then((r) => setCanLinkToNajiz(!!r.can_link)).catch(() => setCanLinkToNajiz(false));
  }, [caseId]);

  useEffect(() => {
    if (!caseId || hasFetchedRef.current === caseId) return;
    hasFetchedRef.current = caseId;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await loadCore();
        loadStation();
        loadSecondary();
      } catch (err: any) {
        if (err?.errorCode === NAJIZ_ACCESS_REVOKED_CODE) setRevokedInfo({});
        setError(err?.message || 'فشل في جلب تفاصيل القضية');
        hasFetchedRef.current = null;
      } finally {
        setLoading(false);
      }
    })();
  }, [caseId, loadCore, loadStation, loadSecondary]);

  const refreshAll = useCallback(async () => {
    try {
      await loadCore();
      loadStation();
      loadSecondary();
    } catch (e: any) {
      toast.error(e?.message || 'تعذّر تحديث البيانات');
    }
  }, [loadCore, loadStation, loadSecondary]);

  // صفوف المرساة لها صفحات مخصصة
  useEffect(() => {
    if (!caseData) return;
    const c: any = caseData;
    if (c.is_bankruptcy) navigate(`/bankruptcy/${caseData.id}`, { replace: true });
    else if (c.is_reconciliation) navigate(`/reconciliation/${caseData.id}`, { replace: true });
    else if (c.is_grievance) navigate(`/grievance/${caseData.id}`, { replace: true });
  }, [caseData, navigate]);

  // ── الاختيار الافتراضي على الخط ─────────────────────────
  useEffect(() => {
    if (!station || sel) return;
    const nodes = station.nodes;
    const clock = station.clock;
    let pick: StationNode | undefined;
    if (clock?.kind === 'deadline' && clock.judgement_id) {
      pick = nodes.find((n) => n.kind === 'deadline' && n.ref?.type === 'judgement' && n.ref.id === clock.judgement_id);
    }
    if (!pick) pick = nodes.find((n) => n.kind === 'session' && n.state === 'future');
    if (!pick) pick = [...nodes].reverse().find((n) => n.kind === 'judgement');
    if (!pick) pick = [...nodes].reverse().find((n) => n.kind === 'session' && n.state === 'past');
    if (!pick) pick = nodes.find((n) => n.kind === 'filing');
    if (pick) setSel({ key: pick.key, kind: pick.kind, ref: pick.ref, tab: pick.ref?.tab });
  }, [station, sel]);

  // ── الزيارات والتقييم ──────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const visits = (prefs.case_station_visits ?? 0) + 1;
    const patch: Record<string, unknown> = { case_station_visits: visits };
    if (!prefs.case_station_first_used_at) patch.case_station_first_used_at = new Date().toISOString();
    UiPreferencesService.patch(user.id, patch as any).then(onPrefsChange).catch(() => {});

    const shouldPrompt = !prefs.case_station_feedback_at && !prefs.case_station_feedback_prompted_at;
    if (!shouldPrompt) return;
    const openPrompt = () => {
      if (promptedRef.current) return;
      promptedRef.current = true;
      setFeedbackMode('rate');
      setFeedbackOpen(true);
      UiPreferencesService.patch(user.id, { case_station_feedback_prompted_at: new Date().toISOString() }).then(onPrefsChange).catch(() => {});
    };
    if (visits >= FEEDBACK_PROMPT_VISITS) {
      const t = window.setTimeout(openPrompt, 6000);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(openPrompt, FEEDBACK_PROMPT_MS);
    return () => window.clearTimeout(t);
    // يعمل مرة واحدة عند فتح الصفحة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const openFeedback = (mode: FeedbackMode) => { setFeedbackMode(mode); setFeedbackOpen(true); };

  const onFeedbackDone = async (result: { submitted: boolean; rating: number | null; body: string }) => {
    setFeedbackOpen(false);
    if (result.submitted && user?.id) {
      UiPreferencesService.patch(user.id, { case_station_feedback_at: new Date().toISOString() }).then(onPrefsChange).catch(() => {});
    }
    if (feedbackMode === 'leaving') {
      onSwitchToClassic(result.body ? result.body.slice(0, 500) : undefined);
    }
  };

  // ── إجراءات ────────────────────────────────────────────
  const handleUpdateCase = async (updated: Partial<Case>) => {
    if (!caseId) return;
    const c = await CaseService.updateCase(caseId, updated);
    setCaseData(c);
  };

  const handleMarkEnded = async (sessionId: number) => {
    if (markingEndedId !== null) return;
    setMarkingEndedId(sessionId);
    try {
      const res = await sessionReportService.markEnded(sessionId);
      const d = res.data;
      setCaseData((prev) => prev ? {
        ...prev,
        sessions: prev.sessions?.map((s: any) => String(s.id) === String(sessionId)
          ? { ...s, has_ended: d.has_ended, can_mark_ended: d.can_mark_ended, ended_marked_at: d.ended_marked_at, ended_by: d.ended_marked_by_name ? { id: 0, name: d.ended_marked_by_name } : s.ended_by }
          : s),
      } : prev);
      toast.success(res.message || 'تم إنهاء الجلسة');
      loadStation();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'تعذّر إنهاء الجلسة');
    } finally {
      setMarkingEndedId(null);
    }
  };

  const handleToggleActivityVisibility = async (eventId: string, visible: boolean) => {
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, hidden_from_client: !visible } : e)));
    try {
      await ActivityService.setActivityVisibility(eventId, visible);
    } catch {
      setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, hidden_from_client: visible } : e)));
    }
  };

  // فريق المحامين
  const canManageLawyers = !!user && (user.role === 'admin' || user.role === 'super_admin' || Boolean(user.is_tenant_owner));
  const [availableLawyers, setAvailableLawyers] = useState<{ id: string; name: string }[]>([]);
  const [showAddLawyer, setShowAddLawyer] = useState(false);
  const [selectedNewLawyer, setSelectedNewLawyer] = useState('');
  const [lawyerBusy, setLawyerBusy] = useState(false);
  const toggleAddLawyer = () => {
    setShowAddLawyer((v) => !v);
    if (availableLawyers.length === 0) {
      UserService.getLawyers().then((list) => setAvailableLawyers((list || []).map((l: any) => ({ id: String(l.id), name: l.name })))).catch(() => {});
    }
  };
  const confirmAddLawyer = async () => {
    if (!caseId || !selectedNewLawyer) return;
    try {
      setLawyerBusy(true);
      await CaseService.assignLawyer(caseId, selectedNewLawyer);
      setSelectedNewLawyer('');
      setShowAddLawyer(false);
      await refreshAll();
    } catch (e: any) {
      toast.error(e?.message || 'فشل في إضافة المحامي');
    } finally {
      setLawyerBusy(false);
    }
  };
  const removeLawyer = async (lawyerId: string) => {
    if (!caseId || !window.confirm('إزالة هذا المحامي من فريق القضية؟')) return;
    try {
      setLawyerBusy(true);
      await CaseService.removeLawyer(caseId, lawyerId);
      await refreshAll();
    } catch (e: any) {
      toast.error(e?.message || 'تعذّر إزالة المحامي');
    } finally {
      setLawyerBusy(false);
    }
  };

  // ── مشتقات ─────────────────────────────────────────────
  const sessionsById = useMemo(() => {
    const m = new Map<string, any>();
    (caseData?.sessions || []).forEach((s: any) => m.set(String(s.id), s));
    return m;
  }, [caseData]);
  const judgementsById = useMemo(() => {
    const m = new Map<string, any>();
    (caseData?.judgements || []).forEach((j: any) => m.set(String(j.id), j));
    return m;
  }, [caseData]);

  const openTasks = useMemo(() => tasks.filter((t) => !['completed', 'cancelled', 'archived'].includes(String(t.status))), [tasks]);
  const doneTasks = useMemo(() => tasks.filter((t) => ['completed', 'cancelled'].includes(String(t.status))), [tasks]);
  const unreadMessages = Number((caseData as any)?.unread_messages_count ?? 0);
  const awaitingMemos = requestsSummary?.awaiting_reply ?? 0;

  const selectNode = (n: StationNode) => {
    if (n.kind === 'today' || n.kind === 'placeholder') return;
    setSel({ key: n.key, kind: n.kind, ref: n.ref, tab: n.ref?.tab });
  };
  const selectJudgement = (id: number, tab?: string) => {
    const node = station?.nodes.find((n) => n.kind === 'judgement' && n.ref?.id === id);
    setSel({ key: node?.key ?? `j${id}`, kind: 'judgement', ref: { type: 'judgement', id }, tab });
  };
  const selectSession = (id: number) => {
    const node = station?.nodes.find((n) => n.kind === 'session' && n.ref?.id === id);
    setSel({ key: node?.key ?? `s${id}`, kind: 'session', ref: { type: 'session', id }, tab: undefined });
  };

  // ── حالات التحميل ──────────────────────────────────────
  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-loading__content">
          <div className="page-loading__spinner" />
          <p className="page-loading__text">جاري تحميل القضية…</p>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="page-loading">
        <div className="page-loading__content">
          <AlertCircle style={{ width: 48, height: 48, color: 'var(--status-red)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--status-red)', marginBottom: 16 }}>{error || 'القضية غير موجودة'}</p>
          <Link to="/cases" style={{ color: 'var(--law-navy)', fontWeight: 500 }}>العودة إلى قائمة القضايا</Link>
        </div>
        <NajizAccessRevokedModal
          isOpen={revokedInfo !== null}
          caseTitle={revokedInfo?.title}
          fileNumber={revokedInfo?.file_number}
          onClose={() => { setRevokedInfo(null); navigate('/cases'); }}
        />
      </div>
    );
  }

  const isPrepMode = (caseData as any).is_prep_mode || ['draft', 'preparation', 'filed'].includes(caseData.status);
  if (isPrepMode) {
    return (
      <>
        <CasePrepKitchen
          caseData={caseData}
          onActivate={() => refreshAll()}
          onLinkNajiz={() => setShowLinkNajiz(true)}
          onRefresh={() => refreshAll()}
          onEditCase={() => setShowEdit(true)}
        />
        <EditCaseModal isOpen={showEdit} onClose={() => setShowEdit(false)} caseData={caseData} onSave={async (u) => { await handleUpdateCase(u); refreshAll(); }} />
        <LinkToNajizModal isOpen={showLinkNajiz} onClose={() => setShowLinkNajiz(false)} caseId={caseData.id} caseTitle={caseData.title} onSuccess={() => { setShowLinkNajiz(false); refreshAll(); }} />
      </>
    );
  }

  const c: any = caseData;
  const title = splitTitle(caseData.title || '');
  const billing = caseData.billing;
  const wekala = c.wekalat_summary;
  const primaryLawyerId = c.primary_lawyer?.[0]?.id ?? null;
  const primaryLawyer = (caseData.lawyers || []).find((l: any) => (primaryLawyerId != null ? l.id === primaryLawyerId : !!l.pivot?.is_primary)) as any;
  const nextSession = station?.clock?.kind === 'next_session' && station.clock.session_id ? sessionsById.get(String(station.clock.session_id)) : null;

  const moreItems: ActionMenuItem[] = [
    { label: 'الرسائل', icon: MessageSquare, count: unreadMessages, onClick: () => setShowMessages(true) },
    { label: 'الوكالات', icon: Scroll, count: wekala?.matched_count ?? 0, onClick: () => setShowWekalat(true) },
    { label: 'السوابق القضائية', icon: Gavel, onClick: () => setShowPrecedents(true) },
    { label: 'باحث الأنظمة', icon: BookOpen, onClick: () => setShowLawSearch(true) },
    { label: 'كل الجلسات', icon: Calendar, divider: true, onClick: () => setShowAppointments(true) },
    { label: 'إضافة جلسة', icon: Plus, onClick: () => setShowAddSession(true) },
    { label: 'إضافة مهمة', icon: CheckSquare, onClick: () => setShowAddTask(true) },
    { label: 'ربط مع قضية ناجز', icon: Link2, hidden: !canLinkToNajiz, onClick: () => setShowLinkNajiz(true) },
    { label: 'الرجوع للتصميم السابق', icon: ArrowLeftRight, divider: true, onClick: () => openFeedback('leaving') },
  ];

  // ═════════════════════════════════════════════════════ العرض
  return (
    <div className="cst" dir="rtl">
      {/* ── شريط العنوان ── */}
      <div className="cst-titlebar">
        <Link to="/cases" className="cst-back"><ChevronRight size={15} />القضايا</Link>
        <div className="cst-fileno"><span>{caseData.file_number}</span><i>{c.case_type_arabic || c.type_arabic || caseData.case_type}</i></div>
        <h1 className="cst-title" title={caseData.title}>
          {title.a}{title.b && <><span className="cst-title__vs">ضد</span>{title.b}</>}
        </h1>
        <div className="cst-chips">
          <span className={`cst-chip ${statusChip(c.najiz_status || caseData.status)}`}><span className="cst-chip__dot" />{c.najiz_status_arabic || c.status_arabic || caseData.status}</span>
          {caseData.outcome && (
            <OutcomeBadge outcome={caseData.outcome as any} confidence={caseData.outcome_confidence} source={caseData.outcome_source} appealed={caseData.outcome_appealed} partial={caseData.outcome_is_partial} />
          )}
          {(caseData.priority === 'urgent' || caseData.priority === 'high') && (
            <span className="cst-chip cst-chip--line-red">{c.priority_arabic || (caseData.priority === 'urgent' ? 'عاجلة' : 'عالية')}</span>
          )}
        </div>
        <div className="cst-actions">
          <button type="button" className="cst-btn cst-btn--primary" onClick={() => setShowEdit(true)}><Edit size={15} /><span className="cst-btn__text">تعديل</span></button>
          <button type="button" className="cst-btn" onClick={() => setShowQuickActions(true)}><Plus size={15} /><span className="cst-btn__text">إجراءات</span><ChevronDown size={13} /></button>
          <button type="button" className="cst-btn" onClick={() => { setEditingMemo(null); setShowMemoWorkspace(true); }}><PenTool size={15} /><span className="cst-btn__text">إنشاء مذكرة</span></button>
          <button type="button" className="cst-btn" onClick={() => setShowCaseReport(true)} title="إعداد تقرير عن سير القضية وإرساله للعميل أو طباعته"><FileText size={15} /><span className="cst-btn__text">تقرير القضية</span><span className="cst-btn__beta">تجريبي</span></button>
          <button type="button" className="cst-btn cst-btn--icon" onClick={() => setShowShare(true)} title="مشاركة القضية"><Users size={15} /></button>
          <ActionMenu items={moreItems} trigger={MoreHorizontal} triggerClassName="cst-btn cst-btn--icon" label="المزيد" badge={unreadMessages + awaitingMemos} />
        </div>
      </div>

      {/* ── صف الحقائق ── */}
      <div className="cst-facts">
        {caseData.court && <span className="cst-fact"><Landmark size={14} /><b>{caseData.court}</b></span>}
        {(caseData.department || c.sub_circle) && <><span className="cst-sep" /><span className="cst-fact">{[caseData.department, c.sub_circle].filter(Boolean).join(' · ')}</span></>}
        <span className="cst-sep" />
        <span className="cst-fact"><Calendar size={14} />قيد الدعوى <b>{gDate(caseData.filing_date || caseData.created_at)}</b>{toHijri(caseData.filing_date || caseData.created_at) && <> · {toHijri(caseData.filing_date || caseData.created_at)}</>}</span>
        {caseData.najiz_id && <><span className="cst-sep" /><span className="cst-fact"><Hash size={14} />ناجز <b>{caseData.najiz_id}</b></span></>}
        {(c.ai_classification?.claim_amount || caseData.contract_value) ? (
          <><span className="cst-sep" /><span className="cst-fact"><DollarSign size={14} />{c.ai_classification?.claim_amount ? <>المطالبة <b>{money(c.ai_classification.claim_amount)} ر.س</b></> : <>قيمة العقد <b>{money(caseData.contract_value)} ر.س</b></>}</span></>
        ) : null}
        {primaryLawyer && <><span className="cst-sep" /><span className="cst-fact"><Star size={14} />المسؤول <b>{primaryLawyer.name}</b></span></>}
        {(c.title_original || caseData.case_subject) && <><span className="cst-sep" /><span className="cst-fact cst-fact--subject" title={c.title_original || caseData.case_subject}>الموضوع: {c.title_original || caseData.case_subject}</span></>}
      </div>

      {/* ── الخط الإجرائي ── */}
      <section className="cst-line" aria-label="الخط الإجرائي للقضية">
        {station ? (
          <>
            <StationLine station={station} selectedKey={sel?.key ?? null} onSelect={selectNode} />
            <ClockCell station={station} onJudgement={(id) => selectJudgement(id, 'objection')} onSession={selectSession} />
          </>
        ) : (
          <div className="cst-tl" style={{ padding: '6px 0' }}>
            {stationError ? (
              <div className="cst-note" style={{ margin: 0 }}><Info size={15} /><div>{stationError} <button type="button" className="cst-btn cst-btn--sm" style={{ marginInlineStart: 8 }} onClick={loadStation}>إعادة المحاولة</button></div></div>
            ) : (
              <><div className="cst-skeleton cst-skeleton--w80" /><div className="cst-skeleton cst-skeleton--w60" /></>
            )}
          </div>
        )}
      </section>

      {/* ── مساحة العمل ── */}
      <section className="cst-work">
        <section className="cst-reader" aria-live="polite">
          {!sel ? (
            <div className="cst-reader__body"><div className="cst-skeleton cst-skeleton--w60" /><div className="cst-skeleton cst-skeleton--w80" /><div className="cst-skeleton" /></div>
          ) : sel.kind === 'filing' ? (
            <FilingReader caseData={caseData} station={station} onEdit={() => setShowEdit(true)} />
          ) : sel.kind === 'session' && sel.ref ? (
            <SessionReader
              key={`s-${sel.ref.id}`}
              session={sessionsById.get(String(sel.ref.id))}
              node={station?.nodes.find((n) => n.key === sel.key) || null}
              decision={station?.session_decisions[String(sel.ref.id)] || null}
              onOpenDabt={(s) => setDabtSession(s)}
              onOpenJudgement={(s) => setJudgementModal({ ...s, text: s.session_judgement })}
              onSendReport={(id) => setReportSession(id)}
              onNotifySettings={(s) => setNotifySession({ id: Number(s.id), mode: (s.notify_client_mode as NotifyMode) ?? null, enabled: !!s.notify_client })}
              onMarkEnded={handleMarkEnded}
              markingEndedId={markingEndedId}
            />
          ) : (sel.kind === 'judgement' || (sel.kind === 'deadline' && sel.ref?.type === 'judgement')) && sel.ref ? (
            <JudgementReader
              key={`j-${sel.ref.id}-${sel.tab ?? ''}`}
              judgement={judgementsById.get(String(sel.ref.id))}
              analysis={c.latest_judgement_analysis && String(c.latest_judgement_analysis.case_judgement_id) === String(sel.ref.id) ? c.latest_judgement_analysis : null}
              station={station}
              deadlines={deadlines}
              memos={memos}
              tasks={openTasks}
              initialTab={sel.tab}
              caseTitle={caseData.title}
              onOpenFull={(j) => setJudgementModal(j)}
              onMemo={(m) => { setEditingMemo(m ?? null); setShowMemoWorkspace(true); }}
              onPrecedents={() => setShowPrecedents(true)}
            />
          ) : sel.kind === 'deadline' && sel.ref?.type === 'deadline' ? (
            <DeadlineReader deadline={deadlines.find((d) => d.id === sel.ref!.id) || null} />
          ) : (
            <div className="cst-empty"><Info />اختر عنصراً من الخط الإجرائي</div>
          )}
        </section>

        {/* ── سجلات الملف ── */}
        <section className="cst-dock">
          <div className="cst-dock__body">
            {/* المهام */}
            <div className={`cst-panel ${dock === 'tasks' ? 'is-on' : ''}`}>
              <div className="cst-panel__head">المهام <span className="cst-n">{openTasks.length} مفتوحة من {tasks.length}</span>
                <button type="button" className="cst-btn cst-btn--sm" onClick={() => setShowAddTask(true)}><Plus size={13} />مهمة</button>
              </div>
              <div className="cst-panel__body">
                {tasks.length === 0 && <div className="cst-empty"><CheckSquare />لا مهام على هذه القضية بعد</div>}
                {openTasks.length > 0 && <div className="cst-group">مفتوحة <span className="cst-n">{openTasks.length}</span></div>}
                {openTasks.map((t: any) => {
                  const st = TASK_STATUS[String(t.status)] || { label: String(t.status), cls: 'cst-tag--gray' };
                  const pr = PRIORITY[String(t.priority)];
                  const who = t.assignee?.name || t.assignees?.[0]?.name || '';
                  const due = t.dueDate || t.due_date;
                  return (
                    <div key={t.id} className={`cst-drow cst-drow--link ${String(t.priority) === 'urgent' ? 'cst-drow--hot' : ''}`} onClick={() => setShowTasks(true)}>
                      <span className="cst-tick" />
                      <div className="cst-drow__t"><b>{t.title}</b><small>{[who, due ? `يستحق ${gDate(due, { year: false, weekday: true })}` : null].filter(Boolean).join(' · ')}</small></div>
                      {pr && pr.label !== 'متوسطة' && <span className={`cst-tag ${pr.cls}`}>{pr.label}</span>}
                      <span className={`cst-tag ${st.cls}`}>{st.label}</span>
                    </div>
                  );
                })}
                {doneTasks.length > 0 && <div className="cst-group">مكتملة <span className="cst-n">{doneTasks.length}</span></div>}
                {doneTasks.slice(0, 6).map((t: any) => (
                  <div key={t.id} className="cst-drow cst-drow--done cst-drow--link" onClick={() => setShowTasks(true)}>
                    <span className="cst-tick is-on"><CheckCircle2 size={11} /></span>
                    <div className="cst-drow__t"><b>{t.title}</b><small>{[t.assignee?.name, (t.completedAt || t.completed_at) ? `أُنجزت ${gDate(t.completedAt || t.completed_at, { year: false })}` : null].filter(Boolean).join(' · ')}</small></div>
                  </div>
                ))}
                {tasks.length > 0 && <div style={{ paddingTop: 8 }}><button type="button" className="cst-btn cst-btn--sm" onClick={() => setShowTasks(true)}>عرض كل المهام ({tasks.length})</button></div>}
              </div>
            </div>

            {/* الأطراف */}
            <div className={`cst-panel ${dock === 'parties' ? 'is-on' : ''}`}>
              <div className="cst-panel__head">أطراف الدعوى <span className="cst-n">{caseData.parties?.length ?? 0}</span>
                {caseData.source === 'manual'
                  ? <button type="button" className="cst-btn cst-btn--sm" onClick={() => setShowParties(true)}><Edit size={13} />إدارة الأطراف</button>
                  : <span className="cst-tag cst-tag--line">من ناجز</span>}
              </div>
              <div className="cst-panel__body">
                {(!caseData.parties || caseData.parties.length === 0) && (
                  <div className="cst-empty"><Users />لا أطراف مسجّلة{caseData.source === 'manual' ? ' — أضفها من «إدارة الأطراف»' : ''}</div>
                )}
                {SIDE_ORDER.map((side) => {
                  const list = (caseData.parties || []).filter((p: any) => p.side === side);
                  if (list.length === 0) return null;
                  return (
                    <React.Fragment key={side}>
                      <div className="cst-group">{SIDE_GROUP[side]}</div>
                      {list.map((p: any, i: number) => {
                        const isClient = caseData.client_name && p.name && p.name.trim() === caseData.client_name.trim();
                        return (
                          <div key={`${side}-${i}`} className="cst-drow">
                            <span className={`cst-av ${isClient ? 'cst-av--gold' : ''}`}>{SIDE_INITIAL[side] || initial(p.name)}</span>
                            <div className="cst-drow__t"><b>{p.name}</b><small>{[p.party_type, p.national_id ? `هوية ${p.national_id}` : null, p.commercial_reg ? `س.ت ${p.commercial_reg}` : null, p.represents ? `يمثل: ${p.represents}` : (p.role && side !== 'plaintiff' && side !== 'defendant' ? p.role : null)].filter(Boolean).join(' · ') || p.role}</small></div>
                            {isClient && <span className="cst-tag cst-tag--gold">موكلنا</span>}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* الفريق والوكالة والموكل */}
            <div className={`cst-panel ${dock === 'team' ? 'is-on' : ''}`}>
              <div className="cst-panel__head">فريق القضية <span className="cst-n">{caseData.lawyers?.length ?? 0}</span>
                {canManageLawyers && <button type="button" className="cst-btn cst-btn--sm" onClick={toggleAddLawyer}><Plus size={13} />محامٍ</button>}
              </div>
              <div className="cst-panel__body">
                {(caseData.lawyers || []).map((l: any) => {
                  const isPrimary = primaryLawyerId != null ? primaryLawyerId === l.id : !!l.pivot?.is_primary;
                  return (
                    <div key={l.id} className="cst-drow">
                      <span className="cst-av">{initial(l.name)}</span>
                      <div className="cst-drow__t"><b>{l.name}</b><small>{isPrimary ? 'المحامي المسؤول' : (l.role_arabic || l.role || 'عضو الفريق')}</small></div>
                      {isPrimary && <span className="cst-tag cst-tag--gold">★ المسؤول</span>}
                      {canManageLawyers && !isPrimary && <button type="button" className="cst-xbtn" title="إزالة من الفريق" disabled={lawyerBusy} onClick={() => removeLawyer(String(l.id))}><XIcon size={13} /></button>}
                    </div>
                  );
                })}
                {showAddLawyer && canManageLawyers && (
                  <div className="cst-inline-form">
                    <select value={selectedNewLawyer} onChange={(e) => setSelectedNewLawyer(e.target.value)} disabled={lawyerBusy}>
                      <option value="">اختر محامياً…</option>
                      {availableLawyers.filter((al) => !(caseData.lawyers || []).some((cl: any) => String(cl.id) === al.id)).map((al) => <option key={al.id} value={al.id}>{al.name}</option>)}
                    </select>
                    <button type="button" className="cst-btn cst-btn--sm cst-btn--primary" disabled={lawyerBusy || !selectedNewLawyer} onClick={confirmAddLawyer}>إضافة</button>
                  </div>
                )}

                <div className="cst-group">الموكل</div>
                <div className="cst-drow">
                  <span className="cst-av cst-av--gold">{initial(caseData.client_name)}</span>
                  <div className="cst-drow__t">
                    <b>{caseData.client_id ? <Link to={`/clients/${caseData.client_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{caseData.client_name}</Link> : caseData.client_name}</b>
                    <small>{[caseData.client_phone || 'بلا رقم جوال', c.extra_clients?.length ? `وآخرون +${c.extra_clients.length}` : null].filter(Boolean).join(' · ')}</small>
                  </div>
                  <button type="button" className="cst-btn cst-btn--sm" onClick={() => setShowClientPhone(true)}>{caseData.client_phone ? 'العملاء' : 'إضافة رقم'}</button>
                </div>

                <div className="cst-group">الوكالة الرئيسية</div>
                {wekala?.primary_active_wekala ? (
                  <div className="cst-drow cst-drow--link" onClick={() => setShowWekalat(true)}>
                    <Scroll />
                    <div className="cst-drow__t"><b>#{wekala.primary_active_wekala.number}</b><small>{wekala.primary_active_wekala.status}{wekala.matched_count > 1 ? ` · ${wekala.matched_count} وكالات مرتبطة` : ''}</small></div>
                    <span className={`cst-tag ${wekala.primary_active_wekala.expiry_state === 'expired' ? 'cst-tag--red' : wekala.primary_active_wekala.expiry_state?.startsWith('expiring') ? 'cst-tag--orange' : 'cst-tag--green'}`}>
                      {wekala.primary_active_wekala.expiry_state === 'expired' ? 'منتهية' : wekala.primary_active_wekala.days_until_expiry != null ? `تنتهي خلال ${wekala.primary_active_wekala.days_until_expiry} يوماً` : 'سارية'}
                    </span>
                  </div>
                ) : (
                  <div className="cst-drow cst-drow--link" onClick={() => setShowWekalat(true)}>
                    <Scroll />
                    <div className="cst-drow__t"><b>{wekala?.has_expired_only ? 'كل الوكالات منتهية' : 'لا توجد وكالة مرتبطة'}</b><small>افتح الوكالات للربط أو المراجعة</small></div>
                    <span className={`cst-tag ${wekala?.has_expired_only ? 'cst-tag--red' : 'cst-tag--orange'}`}>{wekala?.has_expired_only ? 'منتهية' : 'غير مرتبطة'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* المستندات */}
            <div className={`cst-panel ${dock === 'docs' ? 'is-on' : ''}`}>
              <div className="cst-panel__head">المستندات <span className="cst-n">{documents.length}</span>
                <button type="button" className="cst-btn cst-btn--sm" onClick={() => setShowDocuments(true)}><Plus size={13} />رفع</button>
              </div>
              <div className="cst-panel__body">
                {documents.length === 0 && <div className="cst-empty"><Folder />لا مستندات بعد</div>}
                {documents.length > 0 && <div className="cst-group">الأحدث</div>}
                {[...documents].sort((a: any, b: any) => String(b.uploaded_at || b.created_at || '').localeCompare(String(a.uploaded_at || a.created_at || ''))).slice(0, 8).map((d: any) => (
                  <div key={d.id} className="cst-drow cst-drow--link" onClick={() => setShowDocuments(true)}>
                    <FileText />
                    <div className="cst-drow__t"><b>{d.title || d.file_name}</b><small>{[d.uploader?.name, gDate(d.uploaded_at || d.created_at, { year: false })].filter(Boolean).join(' · ')}</small></div>
                    {d.category && <span className="cst-tag cst-tag--gray">{String(d.category)}</span>}
                  </div>
                ))}
                {documents.length > 8 && <div style={{ paddingTop: 8 }}><button type="button" className="cst-btn cst-btn--sm" onClick={() => setShowDocuments(true)}>عرض كل المستندات ({documents.length})</button></div>}

                {docRequests.length > 0 && <div className="cst-group">المطلوب من العميل <span className="cst-n">{docRequests.length}</span></div>}
                {docRequests.slice(0, 6).map((r) => {
                  const done = r.status === 'completed' || (r.progress_percentage ?? 0) >= 100;
                  return (
                    <div key={r.id} className="cst-drow">
                      <span className={`cst-tick ${done ? 'is-on' : ''}`}>{done && <CheckCircle2 size={11} />}</span>
                      <div className="cst-drow__t"><b>{r.title}</b><small>{[r.items_count ? `${r.items_count} عناصر` : null, r.due_date ? `حتى ${gDate(r.due_date, { year: false })}` : null, `${r.progress_percentage ?? 0}٪`].filter(Boolean).join(' · ')}</small></div>
                      <span className={`cst-tag ${done ? 'cst-tag--green' : r.status === 'sent' || r.status === 'in_progress' ? 'cst-tag--blue' : 'cst-tag--gray'}`}>{r.status_display}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* المذكرات */}
            <div className={`cst-panel ${dock === 'memos' ? 'is-on' : ''}`}>
              <div className="cst-panel__head">المذكرات <span className="cst-n">{requests.length} مودعة · {memos.length} مكتب</span>
                <button type="button" className="cst-btn cst-btn--sm" onClick={() => { setEditingMemo(null); setShowMemoWorkspace(true); }}><PenTool size={13} />مذكرة</button>
              </div>
              <div className="cst-panel__body">
                {requests.length > 0 && <div className="cst-group">المودعة في ناجز <span className="cst-n">{requests.length}</span></div>}
                {requests.slice(0, 8).map((r) => {
                  const hot = r.side === 'opponent' && r.reply_status === 'awaiting_reply';
                  return (
                    <div key={r.id} className={`cst-drow ${hot ? 'cst-drow--hot' : ''}`}>
                      <span className="cst-av">{r.side === 'opponent' ? 'خ' : r.side === 'ours' ? 'ن' : '؟'}</span>
                      <div className="cst-drow__t"><b>{[r.request_code, r.request_type_name].filter(Boolean).join(' · ')}</b><small>{[r.side_arabic, gDate(r.request_date, { year: false }), r.ai_summary || r.memo_text].filter(Boolean).join(' · ')}</small></div>
                      {r.side === 'opponent' && <span className={`cst-tag ${REPLY_STATUS_CLS[r.reply_status] || 'cst-tag--gray'}`}>{r.reply_status === 'awaiting_reply' ? 'لم نودع بعدها' : r.reply_status_arabic}</span>}
                    </div>
                  );
                })}
                {memos.length > 0 && <div className="cst-group">مذكرات المكتب <span className="cst-n">{memos.length}</span></div>}
                {memos.map((m) => {
                  const st = MEMO_STATUS[m.status] || { label: m.status, cls: 'cst-tag--gray' };
                  return (
                    <div key={m.id} className="cst-drow cst-drow--link" onClick={() => { setEditingMemo(m); setShowMemoWorkspace(true); }}>
                      <PenTool />
                      <div className="cst-drow__t"><b>{m.title}</b><small>{[m.creator?.name, `حُدثت ${relTime(m.updated_at)}`].filter(Boolean).join(' · ')}</small></div>
                      <span className={`cst-tag ${st.cls}`}>{st.label}</span>
                    </div>
                  );
                })}
                {requests.length === 0 && memos.length === 0 && <div className="cst-empty"><Scale />لا مذكرات بعد — أنشئ مذكرة من الزر أعلاه</div>}
              </div>
            </div>

            {/* المالية */}
            <div className={`cst-panel ${dock === 'money' ? 'is-on' : ''}`}>
              <div className="cst-panel__head">الأتعاب والمدفوعات
                {billing && billing.contracts_count > 0 && <Link to={`/contracts?case_id=${caseData.id}`} className="cst-btn cst-btn--sm">العقود ({billing.contracts_count})</Link>}
              </div>
              <div className="cst-panel__body">
                {(() => {
                  const total = billing?.total_contract_value ?? caseData.contract_value ?? 0;
                  const paid = billing?.total_paid ?? 0;
                  const remaining = billing?.total_remaining ?? (total - paid);
                  const overdue = billing?.overdue_amount ?? 0;
                  const pct = billing?.collection_percentage ?? (total > 0 ? (paid / total) * 100 : 0);
                  const overduePct = total > 0 ? Math.min(100 - Math.min(pct, 100), (overdue / total) * 100) : 0;
                  if (!billing || (billing.contracts_count === 0 && total === 0)) {
                    return (
                      <div className="cst-empty"><DollarSign />لا يوجد عقد مرتبط بهذه القضية<div style={{ marginTop: 10 }}><Link to={`/contracts/new?case_id=${caseData.id}`} className="cst-btn cst-btn--sm"><Plus size={13} />إنشاء عقد</Link></div></div>
                    );
                  }
                  return (
                    <>
                      <div className="cst-money">
                        <div><small>الإجمالي</small><b>{money(total)}</b></div>
                        <div><small>المدفوع</small><b className="is-green">{money(paid)}</b></div>
                        <div><small>متأخر</small><b className={overdue > 0 ? 'is-red' : ''}>{money(overdue)}</b></div>
                        <div><small>المتبقي</small><b>{money(remaining)}</b></div>
                      </div>
                      <div className="cst-bar"><i style={{ width: `${Math.min(pct, 100)}%`, background: 'var(--cst-green)' }} /><i style={{ width: `${overduePct}%`, background: 'var(--cst-red)' }} /></div>
                      <div className="cst-legend"><span><i style={{ background: 'var(--cst-green)' }} />تحصيل {pct.toFixed(0)}٪</span>{overdue > 0 && <span><i style={{ background: 'var(--cst-red)' }} />متأخر</span>}<span><i style={{ background: 'var(--cst-line-2)', border: '1px solid var(--cst-line)' }} />المتبقي</span></div>
                      {billing.invoices_count > 0 && (
                        <div className="cst-group">الفواتير <span className="cst-n">{billing.invoices_count}</span></div>
                      )}
                      {billing.invoices_count > 0 && (
                        <div className="cst-drow cst-drow--link" onClick={() => navigate(`/billing/invoices?case_id=${caseData.id}`)}>
                          <FileText />
                          <div className="cst-drow__t"><b>{billing.invoices_count} فاتورة</b><small>{[billing.invoices_by_status?.paid ? `${billing.invoices_by_status.paid} مسددة` : null, billing.invoices_by_status?.pending ? `${billing.invoices_by_status.pending} بانتظار السداد` : null, billing.overdue_invoices_count ? `${billing.overdue_invoices_count} متأخرة` : null].filter(Boolean).join(' · ')}</small></div>
                          {billing.overdue_invoices_count > 0 && <span className="cst-tag cst-tag--red">{billing.overdue_invoices_count} متأخرة</span>}
                        </div>
                      )}
                      {billing.recent_payments?.length > 0 && <div className="cst-group">آخر المدفوعات</div>}
                      {(billing.recent_payments || []).slice(0, 4).map((p: any) => (
                        <div key={p.id} className="cst-drow">
                          <span className="cst-tick is-on"><CheckCircle2 size={11} /></span>
                          <div className="cst-drow__t"><b>{money(p.amount)} ر.س</b><small>{[gDate(p.payment_date), p.invoice_number].filter(Boolean).join(' · ')}</small></div>
                          <span className="cst-tag cst-tag--gray">{p.payment_method === 'cash' ? 'نقداً' : p.payment_method === 'bank_transfer' ? 'تحويل' : p.payment_method === 'check' ? 'شيك' : p.payment_method === 'card' ? 'بطاقة' : p.payment_method}</span>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* الرسائل */}
            <div className={`cst-panel ${dock === 'msgs' ? 'is-on' : ''}`}>
              <div className="cst-panel__head">الرسائل {unreadMessages > 0 && <span className="cst-n">{unreadMessages} غير مقروءة</span>}
                <button type="button" className="cst-btn cst-btn--sm" onClick={() => setShowMessages(true)}><Send size={13} />رسالة</button>
              </div>
              <div className="cst-panel__body">
                {messages === null && <div className="cst-empty"><MessageSquare />الرسائل غير متاحة لدورك أو تعذّر تحميلها<div style={{ marginTop: 10 }}><button type="button" className="cst-btn cst-btn--sm" onClick={() => setShowMessages(true)}>فتح الرسائل</button></div></div>}
                {messages && messages.length === 0 && <div className="cst-empty"><MessageSquare />لا رسائل في هذه القضية بعد</div>}
                {(messages || []).slice(0, 12).map((m) => {
                  const isNew = !m.is_read && String(m.recipient_id) === String(user?.id);
                  return (
                    <div key={m.id} className={`cst-msg ${isNew ? 'cst-msg--new' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setShowMessages(true)}>
                      <div className="cst-msg__head"><span className={`cst-av ${m.sender?.role === 'client' ? 'cst-av--gold' : ''}`}>{initial(m.sender?.name)}</span><b>{m.sender?.name || 'مرسل'}</b><small>{relTime(m.created_at)}</small></div>
                      <p>{m.subject ? <><strong>{m.subject}</strong> — </> : null}{m.message}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* النشاط */}
            <div className={`cst-panel ${dock === 'log' ? 'is-on' : ''}`}>
              <div className="cst-panel__head">النشاط <span className="cst-n">{events.length}</span>
                <button type="button" className="cst-btn cst-btn--sm" onClick={() => setShowQuickActions(true)}><Plus size={13} />إضافة</button>
              </div>
              <div className="cst-panel__body">
                {events.length === 0 ? <div className="cst-empty"><Activity />لا نشاطات مسجّلة بعد</div> : (
                  <Timeline events={events} caseId={caseData.id} onToggleClientVisibility={user?.role !== 'client' && caseData.client_id ? handleToggleActivityVisibility : undefined} />
                )}
              </div>
            </div>
          </div>

          <nav className="cst-index" aria-label="سجلات الملف">
            {[
              { k: 'tasks', label: 'المهام', icon: <CheckSquare />, n: openTasks.length, hot: openTasks.some((t) => String(t.priority) === 'urgent') },
              { k: 'parties', label: 'الأطراف', icon: <Users />, n: caseData.parties?.length ?? 0 },
              { k: 'team', label: 'الفريق والوكالة', icon: <Scale />, n: caseData.lawyers?.length ?? 0 },
              { k: 'docs', label: 'المستندات', icon: <Folder />, n: documents.length },
              { k: 'memos', label: 'المذكرات', icon: <PenTool />, n: awaitingMemos > 0 ? awaitingMemos : requests.length + memos.length, hot: awaitingMemos > 0 },
              { k: 'money', label: 'المالية', icon: <DollarSign />, n: billing ? `${Math.round(billing.collection_percentage ?? 0)}٪` : 0, hot: (billing?.overdue_invoices_count ?? 0) > 0 },
              { k: 'msgs', label: 'الرسائل', icon: <MessageSquare />, n: unreadMessages || (messages?.length ?? 0), hot: unreadMessages > 0 },
              { k: 'log', label: 'النشاط', icon: <Activity />, n: events.length },
            ].map((t) => (
              <button key={t.k} type="button" className={`cst-itab ${dock === t.k ? 'is-on' : ''}`} onClick={() => setDock(t.k)} aria-pressed={dock === t.k}>
                {t.icon}{t.label}
                {t.n ? <span className={`cst-itab__n ${t.hot ? 'cst-itab__n--hot' : ''}`}>{t.n}</span> : null}
              </button>
            ))}
          </nav>
        </section>
      </section>

      {/* ── شريط الحالة ── */}
      <footer className="cst-status">
        {caseData.najiz_url ? (
          <span><RefreshCw />مستوردة من ناجز{caseData.najiz_synced_at && <> · آخر مزامنة {relTime(caseData.najiz_synced_at)}</>} <a href={caseData.najiz_url} target="_blank" rel="noopener noreferrer">فتح في ناجز</a></span>
        ) : (
          <span><Info />{caseData.source === 'manual' ? 'قضية يدوية' : 'غير مرتبطة بناجز'}</span>
        )}
        {wekala?.primary_active_wekala && <span className="is-ok"><Scroll />الوكالة #{wekala.primary_active_wekala.number} {wekala.primary_active_wekala.expiry_state === 'expired' ? 'منتهية' : 'سارية'}</span>}
        {nextSession && <span><Video />الجلسة القادمة {station?.clock?.days_label}{nextSession.method ? ` · ${nextSession.method}` : ''}</span>}
        {station?.stage.source === 'ai' && <span><Sparkles />مسار القضية محلّل بالذكاء</span>}
        <span className="cst-status__end">
          <button type="button" onClick={() => openFeedback('rate')}><Star size={12} style={{ verticalAlign: 'middle', marginInlineEnd: 3 }} />رأيك في التصميم</button>
          <span style={{ margin: '0 8px', color: 'var(--cst-line)' }}>|</span>
          <button type="button" onClick={() => openFeedback('leaving')}><ArrowLeftRight size={12} style={{ verticalAlign: 'middle', marginInlineEnd: 3 }} />التصميم السابق</button>
        </span>
      </footer>

      {/* ── المودالات ── */}
      <EditCaseModal isOpen={showEdit} onClose={() => setShowEdit(false)} caseData={caseData} onSave={async (u) => { await handleUpdateCase(u); refreshAll(); }} />
      <CasePartiesModal isOpen={showParties} caseId={caseData.id} parties={caseData.parties || []} onClose={() => setShowParties(false)} onChanged={refreshAll} />
      <AddTaskModal isOpen={showAddTask} onClose={() => setShowAddTask(false)} onTaskAdded={refreshAll} caseId={caseData.id} caseTitle={caseData.title} clientName={caseData.client_name} />
      <CaseDocumentsModal
        isOpen={showDocuments}
        onClose={() => { setShowDocuments(false); if (caseId) DocumentService.getCaseDocuments(caseId).then((d) => setDocuments(d || [])).catch(() => {}); }}
        caseId={caseData.id} caseTitle={caseData.title} clientName={caseData.client_name} caseNumber={caseData.file_number} caseType={caseData.case_type} parties={caseData.parties}
        clientId={caseData.client_id ? Number(caseData.client_id) : undefined}
      />
      <LegalMemoWorkspace
        isOpen={showMemoWorkspace}
        onClose={() => { setShowMemoWorkspace(false); setEditingMemo(null); if (caseId) LegalMemoService.getCaseMemos(caseId).then((m) => setMemos(m || [])).catch(() => {}); }}
        caseId={caseData.id} caseTitle={caseData.title} caseNumber={caseData.file_number}
        editingMemo={editingMemo || undefined}
        onMemoCreated={() => { setShowMemoWorkspace(false); if (caseId) LegalMemoService.getCaseMemos(caseId).then((m) => setMemos(m || [])).catch(() => {}); }}
      />
      <CaseTasksModal
        isOpen={showTasks}
        onClose={() => { setShowTasks(false); if (caseId) TaskService.getTasks({ case_id: caseId } as any).then((t: any) => setTasks(t?.data ?? [])).catch(() => {}); }}
        caseId={caseData.id} caseTitle={caseData.title}
      />
      <CaseAppointmentsModal isOpen={showAppointments} onClose={() => setShowAppointments(false)} caseData={caseData} onShowDabt={(s) => setDabtSession(s)} />
      {showAddSession && <AddSessionModal isOpen={showAddSession} onClose={() => setShowAddSession(false)} onSessionAdded={() => { setShowAddSession(false); refreshAll(); }} preselectedCaseId={Number(caseData.id)} />}
      <QuickActionsModal isOpen={showQuickActions} onClose={() => setShowQuickActions(false)} caseId={caseData.id} caseTitle={caseData.title} onActivityAdded={refreshAll} />
      <ClientPhoneModal isOpen={showClientPhone} onClose={() => setShowClientPhone(false)} caseId={caseData.id} onSuccess={refreshAll} />
      <CaseMessagesModal isOpen={showMessages} onClose={() => { setShowMessages(false); loadSecondary(); }} caseId={Number(caseData.id)} caseTitle={caseData.title} clientName={caseData.client_name} />
      <ShareCaseModal isOpen={showShare} onClose={() => setShowShare(false)} caseId={caseData.id} caseTitle={caseData.title} />
      <LinkToNajizModal isOpen={showLinkNajiz} onClose={() => setShowLinkNajiz(false)} caseId={caseData.id} caseTitle={caseData.title} onSuccess={() => { setShowLinkNajiz(false); refreshAll(); }} />
      <LawSearchModal isOpen={showLawSearch} onClose={() => setShowLawSearch(false)} caseId={Number(caseData.id)} />
      <PrecedentSearchModal isOpen={showPrecedents} onClose={() => setShowPrecedents(false)} caseId={Number(caseData.id)} caseTitle={caseData.title} />
      {showCaseReport && <CaseReportModal open={showCaseReport} onClose={() => setShowCaseReport(false)} caseId={Number(caseData.id)} />}
      {notifySession && (
        <SendDabtPreferencesModal
          open onClose={() => setNotifySession(null)} sessionId={notifySession.id} currentMode={notifySession.mode} currentEnabled={notifySession.enabled}
          onSuccess={(r) => setCaseData((prev) => prev ? { ...prev, sessions: prev.sessions?.map((s: any) => String(s.id) === String(notifySession.id) ? { ...s, notify_client: r.enabled, notify_client_mode: r.mode } : s) } : prev)}
        />
      )}
      {reportSession !== null && (
        <SendSessionReportModal
          open onClose={() => setReportSession(null)} sessionId={reportSession}
          onSent={() => setCaseData((prev) => prev ? { ...prev, sessions: prev.sessions?.map((s: any) => String(s.id) === String(reportSession) ? { ...s, dabt_sent_to_client: true, report_status: 'sent' } : s) } : prev)}
          onStatementSaved={(at) => setCaseData((prev) => prev ? { ...prev, sessions: prev.sessions?.map((s: any) => String(s.id) === String(reportSession) ? { ...s, office_statement_at: at } : s) } : prev)}
        />
      )}
      {showWekalat && (
        <div className="sc-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowWekalat(false); }}>
          <div className="sc-modal" style={{ maxWidth: 920 }}>
            <div className="sc-header">
              <Scroll size={16} className="sc-header__icon" />
              <div className="sc-header__title">وكالات القضية</div>
              <div className="sc-header__case" title={caseData.file_number}>#{caseData.file_number}</div>
              <div className="sc-header__spacer" />
              <button className="sc-close" onClick={() => setShowWekalat(false)}><XIcon size={16} /></button>
            </div>
            <div className="sc-body" style={{ padding: 12 }}>
              <CaseWekalatPanel caseId={caseData.id} caseFileNumber={caseData.file_number} />
            </div>
          </div>
        </div>
      )}
      {dabtSession && <DabtModal session={dabtSession} caseTitle={caseData.title} onClose={() => setDabtSession(null)} />}
      {judgementModal && <JudgementFullModal j={judgementModal} caseTitle={caseData.title} fileNumber={caseData.file_number} onClose={() => setJudgementModal(null)} />}

      <CaseStationFeedbackModal open={feedbackOpen} mode={feedbackMode} onClose={() => setFeedbackOpen(false)} onDone={onFeedbackDone} />
    </div>
  );
};

export default CaseStationPage;

// ═══════════════════════════════════════════════════════ الخط الإجرائي

const StationLine: React.FC<{ station: CaseStation; selectedKey: string | null; onSelect: (n: StationNode) => void }> = ({ station, selectedKey, onSelect }) => {
  const nodes = station.nodes;
  const n = Math.max(nodes.length, 1);
  const todayIdx = Math.max(nodes.findIndex((x) => x.kind === 'today'), 0);
  const style = { '--cst-cols': n } as React.CSSProperties;
  const scrollRef = useRef<HTMLDivElement>(null);

  // على الجوال: مرّر الشريط حتى يتوسّط «اليوم» (offsetLeft في RTL سالب لما يفيض يساراً،
  // وscrollLeft في كروم يتدرّج من صفر عند أقصى اليمين إلى قيمٍ سالبة)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const todayEl = el.querySelector<HTMLElement>('.cst-node--today');
    if (todayEl) el.scrollLeft = todayEl.offsetLeft + todayEl.offsetWidth / 2 - el.clientWidth / 2;
  }, [station]);

  return (
    <div className="cst-tl">
      <div className="cst-tl__scroll" ref={scrollRef}>
        <div className="cst-tl__phases" style={style}>
          {station.phases.map((p) => (
            <div key={`${p.key}-${p.from}`} className={`cst-phase cst-phase--${p.state}`} style={{ gridColumn: `${p.from + 1} / ${p.to + 2}` }} title={p.label}>{p.label}</div>
          ))}
        </div>
        <div className="cst-tl__track" style={style}>
          <i className="cst-rule" style={{ right: `calc(100% / ${n} * 0.5)`, width: `calc(100% / ${n} * ${todayIdx})` }} />
          {n - 1 - todayIdx > 0 && <i className="cst-rule cst-rule--future" style={{ right: `calc(100% / ${n} * ${todayIdx + 0.5})`, width: `calc(100% / ${n} * ${n - 1 - todayIdx})` }} />}
          {nodes.map((node) => {
            const clickable = node.kind !== 'today' && node.kind !== 'placeholder';
            const cls = ['cst-node', `cst-node--${node.kind}`, node.state === 'future' ? 'cst-node--future' : '', node.key === selectedKey ? 'is-active' : ''].join(' ');
            const meta: any = node.meta || {};
            const tip = node.kind === 'session' && meta.decision ? `${meta.type}: ${meta.decision.text}` : node.kind === 'deadline' ? `${meta.title} — ${meta.days_remaining != null ? `باقٍ ${meta.days_remaining} يوماً` : ''}` : node.label;
            return clickable ? (
              <button key={node.key} type="button" className={cls} onClick={() => onSelect(node)} title={tip} aria-pressed={node.key === selectedKey}>
                <span className="cst-node__dot" /><span className="cst-node__label">{node.label}</span><span className="cst-node__date">{node.date_label}</span>
              </button>
            ) : (
              <div key={node.key} className={cls} title={tip}>
                <span className="cst-node__dot" /><span className="cst-node__label">{node.label}</span><span className="cst-node__date">{node.date_label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ClockCell: React.FC<{ station: CaseStation; onJudgement: (id: number) => void; onSession: (id: number) => void }> = ({ station, onJudgement, onSession }) => {
  const clock = station.clock;
  if (!clock || clock.kind === 'none') {
    return (
      <div className="cst-clock cst-clock--gray">
        <div className="cst-clock__k"><Clock size={14} />المرحلة الحالية</div>
        <div className="cst-clock__v" style={{ color: 'var(--cst-ink)' }}>{station.stage.label}</div>
        <div className="cst-clock__f"><span>لا مواعيد قريبة مسجّلة</span><Link to="/deadlines">المهل النظامية</Link></div>
      </div>
    );
  }
  const pct = clock.period_days && clock.elapsed_days != null ? Math.min(100, Math.round((clock.elapsed_days / clock.period_days) * 100)) : null;
  const daysNum = clock.days_remaining ?? null;
  const big = daysNum === null ? '—' : daysNum < 0 ? 'فاتت' : daysNum === 0 ? 'اليوم' : `${daysNum} ${daysNum === 1 ? 'يوم' : daysNum === 2 ? 'يومان' : daysNum <= 10 ? 'أيام' : 'يوماً'}`;
  return (
    <div className={`cst-clock cst-clock--${clock.tone}`}>
      <div className="cst-clock__k">{clock.kind === 'next_session' ? <Calendar size={14} /> : <AlarmClock size={14} />}{clock.title}</div>
      <div className="cst-clock__v">{big}<small>{clock.due_label}{clock.time ? ` · ${clock.time}` : ''}</small></div>
      {pct !== null && <div className="cst-clock__bar"><i style={{ width: `${pct}%` }} /></div>}
      <div className="cst-clock__f">
        <span>{clock.kind === 'next_session' ? (clock.method || 'موعد الجلسة') : clock.period_days && clock.elapsed_days != null ? `مضى ${clock.elapsed_days} من ${clock.period_days} يوماً` : clock.obligated === 'opponent' ? 'مهلة على الخصم' : 'مهلة تلزم المكتب'}</span>
        {clock.kind === 'next_session' && clock.session_id ? <button type="button" onClick={() => onSession(clock.session_id!)}>تفاصيل الجلسة</button>
          : clock.judgement_id ? <button type="button" onClick={() => onJudgement(clock.judgement_id!)}>تفاصيل الاعتراض</button>
          : <Link to="/deadlines">المهل النظامية</Link>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════ لوح القراءة

const ReaderHead: React.FC<{ eyebrow: React.ReactNode; title: string; meta: React.ReactNode[]; actions?: React.ReactNode; tabs: { id: string; label: string; n?: React.ReactNode }[]; tab: string; onTab: (id: string) => void }> = ({ eyebrow, title, meta, actions, tabs, tab, onTab }) => (
  <div className="cst-reader__head">
    <div className="cst-eyebrow">{eyebrow}</div>
    <h2 className="cst-reader__title">{title}</h2>
    <div className="cst-reader__meta">{meta.filter(Boolean).map((m, i) => <span key={i}>{m}</span>)}</div>
    {actions && <div className="cst-reader__actions">{actions}</div>}
    <div className="cst-tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`cst-tab ${tab === t.id ? 'is-on' : ''}`} onClick={() => onTab(t.id)}>{t.label}{t.n != null && <span className="cst-tab__n">{t.n}</span>}</button>
      ))}
    </div>
  </div>
);

const FilingReader: React.FC<{ caseData: Case; station: CaseStation | null; onEdit: () => void }> = ({ caseData, station, onEdit }) => {
  const c: any = caseData;
  const tabs = [
    { id: 'subject', label: 'تفاصيل الدعوى' },
    (caseData.case_demands || caseData.plaintiff_requests) && { id: 'demands', label: 'مطالب المدعي' },
    (caseData.case_proofs || caseData.case_evidence) && { id: 'proofs', label: 'أدلة الدعوى' },
    c.ai_classification && { id: 'ai', label: 'التصنيف الذكي' },
    station && { id: 'stage', label: 'أين وصلت' },
  ].filter(Boolean) as { id: string; label: string }[];
  const [tab, setTab] = useState(tabs[0]?.id ?? 'subject');
  return (
    <>
      <ReaderHead
        eyebrow={<>قيد الدعوى · {caseData.source === 'najiz' ? 'مستوردة من ناجز' : caseData.source === 'manual' ? 'قضية يدوية' : caseData.source || ''}</>}
        title={c.title_original || caseData.case_subject?.slice(0, 120) || caseData.title}
        meta={[
          <><Calendar size={13} />{gDate(caseData.filing_date || caseData.created_at, { weekday: true })}{toHijri(caseData.filing_date || caseData.created_at) && <> · {toHijri(caseData.filing_date || caseData.created_at)}</>}</>,
          caseData.court && <><Landmark size={13} />{caseData.court}{caseData.department ? ` · ${caseData.department}` : ''}</>,
          c.client_role && <><Users size={13} />صفة الموكل <b>{c.client_role === 'plaintiff' ? 'مدعٍ' : c.client_role === 'defendant' ? 'مدعى عليه' : c.client_role === 'third_party' ? 'طرف ثالث' : 'غير محددة'}</b></>,
        ]}
        actions={<>
          <button type="button" className="cst-btn cst-btn--sm" onClick={onEdit}><Edit size={13} />تعديل بيانات القضية</button>
          {caseData.najiz_url && <a className="cst-btn cst-btn--sm" href={caseData.najiz_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} />فتح في ناجز</a>}
        </>}
        tabs={tabs} tab={tab} onTab={setTab}
      />
      <div className="cst-reader__body">
        {tab === 'subject' && (
          <div className="cst-doc">
            {caseData.description && <><h4>وصف القضية</h4><p>{caseData.description}</p></>}
            {caseData.case_subject && <><h4>تفاصيل الدعوى</h4><p>{caseData.case_subject}</p></>}
            {!caseData.description && !caseData.case_subject && <div className="cst-empty"><FileText />لا تفاصيل مسجّلة للدعوى — أضفها من «تعديل بيانات القضية»</div>}
          </div>
        )}
        {tab === 'demands' && <div className="cst-doc"><p>{caseData.case_demands || caseData.plaintiff_requests}</p></div>}
        {tab === 'proofs' && <div className="cst-doc"><p>{caseData.case_proofs || caseData.case_evidence}</p></div>}
        {tab === 'ai' && c.ai_classification && (
          <>
            <div className="cst-note cst-note--gold"><Sparkles size={15} /><div><b>{[c.ai_classification.main_category, c.ai_classification.sub_category, c.ai_classification.case_type].filter(Boolean).join(' › ')}</b>{c.ai_classification.confidence && <> · الثقة: {c.ai_classification.confidence === 'high' ? 'مرتفعة' : c.ai_classification.confidence === 'medium' ? 'متوسطة' : 'منخفضة'}</>}</div></div>
            {c.ai_classification.reasoning && <div className="cst-doc"><p>{c.ai_classification.reasoning}</p></div>}
            {c.ai_classification.suggested_request && <dl className="cst-kv" style={{ marginTop: 12 }}><dt>الطلب الأنسب</dt><dd>{c.ai_classification.suggested_request}</dd>{c.ai_classification.claim_amount ? <><dt>قيمة المطالبة المستخرجة</dt><dd>{money(c.ai_classification.claim_amount)} ر.س</dd></> : null}</dl>}
          </>
        )}
        {tab === 'stage' && station && <StageSummary station={station} />}
      </div>
    </>
  );
};

const StageSummary: React.FC<{ station: CaseStation }> = ({ station }) => (
  <>
    <div className={`cst-note ${station.stage.source === 'ai' ? 'cst-note--gold' : ''}`}>
      {station.stage.source === 'ai' ? <Sparkles size={15} /> : <Info size={15} />}
      <div><b>المرحلة الحالية: {station.stage.label}.</b> {station.stage.summary}{station.stage.next_expected && <> <b>القادم:</b> {station.stage.next_expected}</>}</div>
    </div>
    <div className="cst-hint">{station.stage.source === 'ai' ? `ملخّص مصاغ آلياً من الجلسات والأحكام والمهل${station.stage.ai.analyzed_at ? ` · ${gDate(station.stage.ai.analyzed_at)}` : ''}. لا يتضمن تقديراً لنتيجة القضية.` : 'ملخّص محسوب من الجلسات والأحكام والمهل. يتحسّن وصفه عند اكتمال تحليل الذكاء في الخلفية.'}</div>
  </>
);

interface SessionReaderProps {
  session: any;
  node: StationNode | null;
  decision: { text: string; source: string; at: string | null } | null;
  onOpenDabt: (s: any) => void;
  onOpenJudgement: (s: any) => void;
  onSendReport: (id: number) => void;
  onNotifySettings: (s: any) => void;
  onMarkEnded: (id: number) => void;
  markingEndedId: number | null;
}

const SessionReader: React.FC<SessionReaderProps> = ({ session, node, decision, onOpenDabt, onOpenJudgement, onSendReport, onNotifySettings, onMarkEnded, markingEndedId }) => {
  if (!session) {
    return <div className="cst-reader__body"><div className="cst-empty"><Calendar />لم تُحمَّل بيانات هذه الجلسة — حدّث الصفحة</div></div>;
  }
  const ended: boolean = session.has_ended !== undefined ? !!session.has_ended : !(session.status === 'جديدة' || session.status === 'scheduled');
  const sid = Number(session.id);
  const date = session.session_date_gregorian || session.session_date;
  const report = session.session_report_json || null;
  const dabt: string | null = session.session_text || null;
  const office: string | null = session.office_statement || null;
  const kindLabel = session.session_type || 'جلسة';
  const number = session.session_number;

  const tabs = ended
    ? [
        { id: 'dabt', label: 'القرار والضبط' },
        { id: 'report', label: 'الإفادة للموكل' },
        session.session_judgement && { id: 'judgement', label: 'الحكم في الجلسة' },
      ]
    : [
        { id: 'prep', label: 'التحضير' },
        { id: 'motions', label: 'الطلبات' },
        { id: 'attend', label: 'الحضور والإفادة' },
      ];
  const cleanTabs = tabs.filter(Boolean) as { id: string; label: string }[];
  const [tab, setTab] = useState(cleanTabs[0].id);

  return (
    <>
      <ReaderHead
        eyebrow={<>{number ? `الجلسة ${number} · ` : ''}{kindLabel}{session.method ? ` · ${session.method}` : ''} {ended ? <span className="cst-chip cst-chip--gray">منتهية</span> : <span className="cst-chip cst-chip--blue">قادمة</span>}{session.source === 'manual' && <span className="cst-chip cst-chip--gold">يدوية</span>}</>}
        title={ended ? (decision?.text ? kindLabel : kindLabel) : `الجلسة القادمة: ${kindLabel}`}
        meta={[
          <><Calendar size={13} />{gDate(date, { weekday: true })}{toHijri(date) && <> · {toHijri(date)}</>}</>,
          session.session_time && <><Clock size={13} />{session.session_time}</>,
          (session.court || session.department) && <><Building size={13} />{[session.court, session.department].filter(Boolean).join(' · ')}</>,
          session.ended_by?.name && <><CheckCircle2 size={13} />أنهاها {session.ended_by.name}</>,
        ]}
        actions={<>
          <Link to={`/sessions/${sid}/prep`} className="cst-btn cst-btn--sm"><ClipboardList size={13} />غرفة التحضير</Link>
          {!ended && session.video_conference_url && <a className="cst-btn cst-btn--sm cst-btn--primary" href={session.video_conference_url} target="_blank" rel="noopener noreferrer"><Video size={13} />الدخول للجلسة</a>}
          {!ended && <button type="button" className="cst-btn cst-btn--sm" onClick={() => onNotifySettings(session)}><Send size={13} />{session.notify_client ? 'إفادة الموكل مفعّلة ✓' : 'إعدادات إفادة الموكل'}</button>}
          {session.can_mark_ended && <button type="button" className="cst-btn cst-btn--sm" disabled={markingEndedId === sid} onClick={() => onMarkEnded(sid)}><CheckCircle2 size={13} />{markingEndedId === sid ? 'جارٍ الإنهاء…' : 'انتهت الجلسة'}</button>}
          {ended && <button type="button" className="cst-btn cst-btn--sm" onClick={() => onSendReport(sid)} title={dabt ? 'إرسال تقرير الجلسة للعميل' : 'لم يصل الضبط بعد — اكتب إفادة المكتب لإرسال التقرير'}><Send size={13} />إرسال تقرير الجلسة</button>}
          {ended && dabt && <button type="button" className="cst-btn cst-btn--sm" onClick={() => onOpenDabt(session)}><FileText size={13} />الضبط في نافذة</button>}
          {session.session_judgement && <button type="button" className="cst-btn cst-btn--sm" onClick={() => onOpenJudgement(session)}><Gavel size={13} />منطوق الحكم</button>}
        </>}
        tabs={cleanTabs} tab={tab} onTab={setTab}
      />
      <div className="cst-reader__body">
        {tab === 'dabt' && (
          <>
            {decision?.text ? (
              <div className="cst-result"><Gavel /><div><b>قرار الجلسة:</b> {decision.text}<span className="cst-result__src">{decision.source === 'ai' ? 'استُخرج آلياً من نص الضبط — راجعه قبل الاعتماد' : 'نتيجة الجلسة كما وردت من ناجز'}</span></div></div>
            ) : session.result ? (
              <div className="cst-result"><Gavel /><div><b>قرار الجلسة:</b> {session.result}</div></div>
            ) : dabt ? (
              <div className="cst-note"><Sparkles size={15} /><div>يُستخرج قرار الجلسة من نص الضبط آلياً ويظهر هنا عند اكتماله.</div></div>
            ) : null}
            {dabt ? (
              <div className="cst-doc"><h4>محضر ضبط الجلسة</h4><p>{dabt}</p></div>
            ) : office ? (
              <div className="cst-doc"><h4>إفادة المكتب عن الجلسة {session.office_statement_at && <span className="cst-hint">· {gDate(session.office_statement_at)}</span>}</h4><p>{office}</p><div className="cst-hint" style={{ marginTop: 8 }}>لم يصل ضبط المحكمة من ناجز بعد. حين يصل يُعرض هنا مع بقاء إفادة المكتب.</div></div>
            ) : (
              <div className="cst-empty"><FileText />لم يصل ضبط هذه الجلسة من ناجز بعد<div style={{ marginTop: 10 }}><button type="button" className="cst-btn cst-btn--sm" onClick={() => onSendReport(sid)}><PenTool size={13} />كتابة إفادة المكتب</button></div></div>
            )}
          </>
        )}
        {tab === 'report' && (
          report || session.session_text_summary ? (
            <>
              <div className={`cst-note ${session.dabt_sent_to_client ? 'cst-note--gold' : ''}`}><Send size={15} /><div>{session.dabt_sent_to_client ? <>أُرسل تقرير الجلسة إلى الموكل{session.dabt_sent_at ? ` في ${gDate(session.dabt_sent_at)}` : ''}.</> : 'الإفادة محفوظة ولم تُرسل للموكل بعد.'}{session.report_status ? ` · الحالة: ${session.report_status}` : ''}</div></div>
              {report?.what_happened && <div className="cst-doc"><h4>ما جرى في الجلسة</h4><p>{report.what_happened}</p>{report.judgement && <><h4>القرار أو الحكم</h4><p>{report.judgement}</p></>}{report.next_action && <><h4>الخطوة القادمة</h4><p>{report.next_action}</p></>}</div>}
              {!report?.what_happened && session.session_text_summary && <div className="cst-doc"><h4>ملخّص الإفادة</h4><p>{session.session_text_summary}</p></div>}
            </>
          ) : (
            <div className="cst-empty"><Send />لم تُصَغ إفادة للموكل عن هذه الجلسة<div style={{ marginTop: 10 }}><button type="button" className="cst-btn cst-btn--sm" onClick={() => onSendReport(sid)}><Send size={13} />إعداد تقرير الجلسة</button></div></div>
          )
        )}
        {tab === 'judgement' && session.session_judgement && <div className="cst-doc"><h4>منطوق الحكم كما نُطق به في الجلسة</h4><p>{session.session_judgement}</p></div>}
        {!ended && tab === 'prep' && <PrepList sessionId={sid} />}
        {!ended && tab === 'motions' && <MotionsList sessionId={sid} />}
        {!ended && tab === 'attend' && (
          <>
            <dl className="cst-kv">
              <dt>طريقة الانعقاد</dt><dd>{session.method || (session.video_conference_url ? 'عن بعد' : 'غير محددة')}{session.video_conference_url && <> · <a href={session.video_conference_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cst-navy-ink)' }}>رابط الجلسة</a></>}</dd>
              {session.location && <><dt>المكان</dt><dd>{session.location}</dd></>}
              <dt>إفادة الموكل بعد الجلسة</dt><dd>{session.notify_client ? (session.notify_client_mode === 'save_only' ? 'تُحفظ للمراجعة قبل الإرسال' : session.notify_client_mode === 'raw' ? 'تُرسل كما هي' : 'تُرسل تلقائياً بعد تسجيل انتهاء الجلسة') : 'غير مفعّلة'}</dd>
              {session.readiness_status && <><dt>جاهزية التحضير</dt><dd>{session.readiness_status}{session.readiness_score != null ? ` · ${session.readiness_score}٪` : ''}</dd></>}
              {session.notes && <><dt>ملاحظات</dt><dd>{session.notes}</dd></>}
            </dl>
            <div className="cst-note"><Info size={15} /><div>{session.source === 'najiz' ? 'الجلسة مزامنة من ناجز؛ أي تغيير في الموعد يظهر هنا تلقائياً عند المزامنة التالية.' : 'جلسة مسجّلة يدوياً — يمكن تعديلها من صفحة الجلسات.'}</div></div>
          </>
        )}
      </div>
    </>
  );
};

const PrepList: React.FC<{ sessionId: number }> = ({ sessionId }) => {
  const [items, setItems] = useState<SessionPreparation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    SessionPrepService.getPreparations(sessionId).then((r) => { if (!cancelled) setItems(r.items || []); }).catch((e) => { if (!cancelled) { setError(e?.message || 'تعذّر تحميل بنود التحضير'); setItems([]); } });
    return () => { cancelled = true; };
  }, [sessionId]);
  const toggle = async (p: SessionPreparation) => {
    setBusy(p.id);
    try {
      const r = await SessionPrepService.togglePreparation(sessionId, p.id);
      setItems((prev) => (prev || []).map((x) => (x.id === p.id ? r.item : x)));
    } catch (e: any) {
      toast.error(e?.message || 'تعذّر تحديث البند');
    } finally {
      setBusy(null);
    }
  };
  if (items === null) return <><div className="cst-skeleton cst-skeleton--w80" /><div className="cst-skeleton cst-skeleton--w60" /></>;
  if (error) return <div className="cst-note"><Info size={15} /><div>{error}</div></div>;
  if (items.length === 0) return <div className="cst-empty"><ClipboardList />لا بنود تحضير بعد<div style={{ marginTop: 10 }}><Link to={`/sessions/${sessionId}/prep`} className="cst-btn cst-btn--sm">فتح غرفة التحضير</Link></div></div>;
  const done = items.filter((i) => i.is_completed).length;
  return (
    <>
      <div className="cst-hint" style={{ marginBottom: 8 }}>أُنجز {done} من {items.length} بنداً</div>
      <div className="cst-list">
        {[...items].sort((a, b) => Number(a.is_completed) - Number(b.is_completed) || a.sort_order - b.sort_order).map((p) => (
          <div key={p.id} className={`cst-row ${p.is_completed ? 'is-done' : ''}`}>
            <button type="button" className={`cst-tick ${p.is_completed ? 'is-on' : ''}`} disabled={busy === p.id} onClick={() => toggle(p)} aria-label={p.is_completed ? 'إلغاء الإنجاز' : 'تعليم كمنجز'}>{p.is_completed && <CheckCircle2 size={11} />}</button>
            <div className="cst-row__t"><span>{p.title}</span>{(p.notes || p.source === 'ai_suggested') && <small>{[p.notes, p.source === 'ai_suggested' ? 'اقتراح الرائد الذكي' : null].filter(Boolean).join(' · ')}</small>}</div>
            {p.source === 'ai_suggested' && <span className="cst-tag cst-tag--gold">اقتراح</span>}
          </div>
        ))}
      </div>
    </>
  );
};

const MOTION_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'مسودة', cls: 'cst-tag--orange' }, ready: { label: 'جاهز', cls: 'cst-tag--green' }, submitted: { label: 'قُدّم', cls: 'cst-tag--blue' },
  approved: { label: 'قُبل', cls: 'cst-tag--green' }, rejected: { label: 'رُفض', cls: 'cst-tag--red' }, withdrawn: { label: 'سُحب', cls: 'cst-tag--gray' },
};

const MotionsList: React.FC<{ sessionId: number }> = ({ sessionId }) => {
  const [items, setItems] = useState<SessionMotion[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    SessionPrepService.getMotions(sessionId).then((r) => { if (!cancelled) setItems(r.items || []); }).catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [sessionId]);
  if (items === null) return <><div className="cst-skeleton cst-skeleton--w80" /><div className="cst-skeleton cst-skeleton--w60" /></>;
  if (items.length === 0) return <div className="cst-empty"><FileText />لا طلبات مسجّلة لهذه الجلسة<div style={{ marginTop: 10 }}><Link to={`/sessions/${sessionId}/prep`} className="cst-btn cst-btn--sm">إضافة طلب من غرفة التحضير</Link></div></div>;
  return (
    <div className="cst-list">
      {items.map((m) => {
        const st = MOTION_STATUS[m.status] || { label: m.status, cls: 'cst-tag--gray' };
        return (
          <div key={m.id} className="cst-row">
            <FileText size={15} style={{ color: 'var(--cst-gold)', flex: 'none' }} />
            <div className="cst-row__t"><span>{m.title}</span><small>{[m.tag, m.source === 'ai_suggested' ? 'اقتراح الرائد الذكي' : null, m.result_note].filter(Boolean).join(' · ')}</small></div>
            <span className={`cst-tag ${st.cls}`}>{st.label}</span>
          </div>
        );
      })}
    </div>
  );
};

interface JudgementReaderProps {
  judgement: any;
  analysis: any;
  station: CaseStation | null;
  deadlines: LegalDeadline[];
  memos: LegalMemo[];
  tasks: Task[];
  initialTab?: string;
  caseTitle: string;
  onOpenFull: (j: any) => void;
  onMemo: (m?: any) => void;
  onPrecedents: () => void;
}

const JudgementReader: React.FC<JudgementReaderProps> = ({ judgement: j, analysis, station, deadlines, memos, tasks, initialTab, onOpenFull, onMemo, onPrecedents }) => {
  if (!j) return <div className="cst-reader__body"><div className="cst-empty"><Gavel />لم تُحمَّل بيانات الحكم — حدّث الصفحة</div></div>;
  const live = j.live_remaining_objection_days ?? j.remaining_objection_days ?? null;
  const canObject = !!j.available_for_objection && live !== null && live >= 0;
  const isFinal = j.judgement_type === 'نهائي';
  const objectionDeadline = deadlines.find((d) => d.case_judgement_id === Number(j.id));
  const objectionMemo = memos.find((m) => /اعتراض|استئناف|لائحة/u.test(m.title) && m.status !== 'finalized') || memos.find((m) => m.memo_type === 'appeal_memo');
  const objectionTask = tasks.find((t) => /اعتراض|استئناف|لائحة/u.test(t.title));
  const tabs = [
    j.text && { id: 'text', label: 'المنطوق' },
    j.reasons && { id: 'reasons', label: 'الأسباب' },
    j.subject && { id: 'subject', label: 'الوقائع' },
    j.pleading && { id: 'pleading', label: 'المرافعة' },
    analysis && { id: 'ai', label: 'تحليل الرائد الذكي' },
    (j.available_for_objection || j.objection_due_date) && { id: 'objection', label: 'الاعتراض' },
  ].filter(Boolean) as { id: string; label: string }[];
  const [tab, setTab] = useState(initialTab && tabs.some((t) => t.id === initialTab) ? initialTab : (tabs[0]?.id ?? 'text'));
  const outcomeLabel = analysis?.detected_outcome === 'lost' ? (analysis.is_partial ? 'خسارة جزئية' : 'ضد الموكل') : analysis?.detected_outcome === 'won' ? (analysis.is_partial ? 'كسب جزئي' : 'لصالح الموكل') : analysis?.detected_outcome === 'settled' ? 'صلح' : analysis?.detected_outcome === 'dismissed' ? 'رد الدعوى' : null;

  return (
    <>
      <ReaderHead
        eyebrow={<>حكم قضائي{j.judgement_type ? ` · ${j.judgement_type}` : ''}{j.elimination_dispute_judgement_type_name ? ` · ${j.elimination_dispute_judgement_type_name}` : ''} {outcomeLabel && <span className={`cst-chip ${analysis?.detected_outcome === 'won' ? 'cst-chip--green' : analysis?.detected_outcome === 'lost' ? 'cst-chip--orange' : 'cst-chip--gray'}`}>{outcomeLabel}</span>}{isFinal && <span className="cst-chip cst-chip--gray">نهائي</span>}</>}
        title={`${j.judgement_description || 'الحكم القضائي'}${j.judgement_code ? ` — صك رقم ${j.judgement_code}` : ''}`}
        meta={[
          j.sak_date && <><Calendar size={13} />تحرير الصك <b>{gDate(j.sak_date, { weekday: true })}</b></>,
          j.delivery_date && <><Send size={13} />تبليغ الصك <b>{gDate(j.delivery_date)}</b></>,
          (j.court_name || j.circle_name) && <><Landmark size={13} />{[j.court_name, j.circle_name].filter(Boolean).join(' · ')}</>,
          canObject && <><AlarmClock size={13} />آخر يوم للاعتراض <b>{live === 0 ? 'اليوم' : `باقٍ ${live} ${live <= 10 ? 'أيام' : 'يوماً'}`}</b></>,
        ]}
        actions={<>
          {canObject && <button type="button" className="cst-btn cst-btn--sm cst-btn--red" onClick={() => onMemo(objectionMemo)}><PenTool size={13} />{objectionMemo ? `لائحة الاعتراض (${MEMO_STATUS[objectionMemo.status]?.label || objectionMemo.status})` : 'إنشاء لائحة الاعتراض'}</button>}
          <button type="button" className="cst-btn cst-btn--sm" onClick={() => onOpenFull(j)}><FileText size={13} />عرض الحكم كاملاً</button>
          <button type="button" className="cst-btn cst-btn--sm" onClick={onPrecedents}><BookOpen size={13} />السوابق القضائية</button>
          <Link to="/deadlines" className="cst-btn cst-btn--sm"><AlarmClock size={13} />المهل النظامية</Link>
        </>}
        tabs={tabs} tab={tab} onTab={setTab}
      />
      <div className="cst-reader__body">
        {tab === 'text' && <div className="cst-doc"><p>{j.text}</p></div>}
        {tab === 'reasons' && <div className="cst-doc"><p>{j.reasons}</p></div>}
        {tab === 'subject' && <div className="cst-doc"><p>{j.subject}</p></div>}
        {tab === 'pleading' && <div className="cst-doc"><p>{j.pleading}</p></div>}
        {tab === 'ai' && analysis && (
          <>
            <div className="cst-note cst-note--gold"><Sparkles size={15} /><div><b>{analysis.outcome_summary || outcomeLabel}</b>{analysis.confidence && <> · الثقة: {analysis.confidence === 'high' ? 'مرتفعة' : analysis.confidence === 'medium' ? 'متوسطة' : 'منخفضة'}</>}{analysis.analyzed_at && <> · {gDate(analysis.analyzed_at)}</>}</div></div>
            {analysis.reasoning && <div className="cst-doc"><p>{analysis.reasoning}</p></div>}
            {analysis.extracted_signals && typeof analysis.extracted_signals === 'object' && (
              <div className="cst-signals">{Object.entries(analysis.extracted_signals).slice(0, 6).map(([k, v]) => <div key={k} className="cst-sig"><small>{String(k).replace(/_/g, ' ')}</small><b>{String(v)}</b></div>)}</div>
            )}
            {analysis.role_conflict && <div className="cst-note cst-note--red" style={{ marginTop: 12 }}><AlertCircle size={15} /><div>تعارض في صفة الموكل: {analysis.role_conflict_reason || 'راجع صفة الموكل في بيانات القضية'}</div></div>}
          </>
        )}
        {tab === 'objection' && (
          <>
            <div className={`cst-note ${canObject ? (live !== null && live <= 3 ? 'cst-note--red' : 'cst-note--gold') : ''}`}>
              <AlarmClock size={15} />
              <div>
                {canObject ? <><b>{live === 0 ? 'اليوم آخر يوم للاعتراض.' : `باقٍ ${live} ${live <= 10 ? 'أيام' : 'يوماً'} للاعتراض.`}</b> {j.objection_due_date && <>آخر موعد {j.objection_due_date}.</>} {j.delivery_date && <>تُحسب المهلة من تبليغ الصك في {gDate(j.delivery_date)}.</>}</>
                  : <>انتهت مهلة الاعتراض على هذا الحكم{j.objection_due_date ? ` (${j.objection_due_date})` : ''}.</>}
              </div>
            </div>
            <dl className="cst-kv">
              <dt>لائحة الاعتراض</dt><dd>{objectionMemo ? <button type="button" className="cst-btn cst-btn--sm" onClick={() => onMemo(objectionMemo)}>{objectionMemo.title} · {MEMO_STATUS[objectionMemo.status]?.label || objectionMemo.status}</button> : canObject ? <button type="button" className="cst-btn cst-btn--sm" onClick={() => onMemo()}>إنشاء لائحة الاعتراض</button> : 'لا توجد'}</dd>
              <dt>المهلة النظامية</dt><dd>{objectionDeadline ? `${objectionDeadline.title} · ${objectionDeadline.status === 'in_progress' ? 'قيد العمل' : 'نشطة'}${objectionDeadline.assignee?.name ? ` · ${objectionDeadline.assignee.name}` : ''}` : 'غير مسجّلة في المهل النظامية'}</dd>
              <dt>المهمة المرتبطة</dt><dd>{objectionTask ? `${objectionTask.title} · ${TASK_STATUS[String(objectionTask.status)]?.label || objectionTask.status}` : 'لا مهمة مرتبطة'}</dd>
            </dl>
            {station && station.objection_points.length > 0 && (
              <div className="cst-doc">
                <h4>محاور اعتراض مقترحة <span className="cst-hint">(من تحليل الذكاء — تحتاج مراجعة المحامي)</span></h4>
                <ol>{station.objection_points.map((p, i) => <li key={i}>{p}</li>)}</ol>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

const DeadlineReader: React.FC<{ deadline: LegalDeadline | null }> = ({ deadline: d }) => {
  if (!d) return <div className="cst-reader__body"><div className="cst-empty"><AlarmClock />لم تُحمَّل بيانات المهلة</div></div>;
  const days = d.days_remaining;
  return (
    <>
      <div className="cst-reader__head">
        <div className="cst-eyebrow">مهلة نظامية · {d.obligated_party === 'opponent' ? 'على الخصم' : 'تلزم المكتب'} <span className={`cst-chip ${days !== null && days <= 3 ? 'cst-chip--red' : days !== null && days <= 7 ? 'cst-chip--orange' : 'cst-chip--green'}`}>{days === null ? '—' : days < 0 ? 'فاتت' : days === 0 ? 'اليوم آخر يوم' : `باقٍ ${days} ${days <= 10 ? 'أيام' : 'يوماً'}`}</span></div>
        <h2 className="cst-reader__title">{d.title}</h2>
        <div className="cst-reader__meta"><span><Calendar size={13} />آخر يوم <b>{gDate(d.due_date, { weekday: true })}</b></span>{d.legal_reference && <span><BookOpen size={13} />{d.legal_reference}</span>}{d.assignee?.name && <span><Users size={13} />{d.assignee.name}</span>}</div>
        <div className="cst-reader__actions"><Link to="/deadlines" className="cst-btn cst-btn--sm"><AlarmClock size={13} />صفحة المهل النظامية</Link></div>
        <div className="cst-tabs" />
      </div>
      <div className="cst-reader__body">
        {d.description && <div className="cst-doc"><p>{d.description}</p></div>}
        {d.action_label && <dl className="cst-kv" style={{ marginTop: 12 }}><dt>الإجراء المطلوب</dt><dd>{d.action_label}</dd></dl>}
        {d.source_quote && <div className="cst-note"><Info size={15} /><div>من الضبط: «{d.source_quote}»</div></div>}
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════ نوافذ الضبط والحكم (أصناف الصفحة الكلاسيكية)

const DabtModal: React.FC<{ session: any; caseTitle: string; onClose: () => void }> = ({ session, caseTitle, onClose }) => (
  <div className="dabt-modal-overlay" onClick={onClose}>
    <div className="dabt-modal" onClick={(e) => e.stopPropagation()}>
      <div className="dabt-modal-header"><h3>ضبط الجلسة</h3><button className="dabt-modal-close" onClick={onClose}>✕</button></div>
      <div className="dabt-modal-info">
        <div className="dabt-modal-info-row"><span>القضية:</span><strong>{caseTitle}</strong></div>
        <div className="dabt-modal-info-row"><span>التاريخ:</span><strong>{gDate(session.session_date_gregorian || session.session_date)}</strong></div>
        {session.court && <div className="dabt-modal-info-row"><span>المحكمة:</span><strong>{session.court}</strong></div>}
        {session.dabt_sent_to_client && <div className="dabt-modal-info-row"><span>حالة الإرسال:</span><span style={{ color: 'var(--status-green)', fontWeight: 500, fontSize: 11 }}>تم الإرسال ✓</span></div>}
      </div>
      {session.session_text_summary && <div className="dabt-modal-summary"><h4>ملخص الإفادة المرسلة</h4><div className="dabt-modal-summary-text">{session.session_text_summary}</div></div>}
      <div className="dabt-modal-text-container"><h4>نص الضبط الكامل</h4><div className="dabt-modal-text">{session.session_text}</div></div>
    </div>
  </div>
);

const JudgementFullModal: React.FC<{ j: any; caseTitle: string; fileNumber: string; onClose: () => void }> = ({ j, caseTitle, fileNumber, onClose }) => {
  const tabs = [
    j.text && { key: 'text', label: 'المنطوق', body: j.text },
    j.subject && { key: 'subject', label: 'الوقائع', body: j.subject },
    j.pleading && { key: 'pleading', label: 'المرافعة', body: j.pleading },
    j.reasons && { key: 'reasons', label: 'الأسباب', body: j.reasons },
  ].filter(Boolean) as { key: string; label: string; body: string }[];
  const [active, setActive] = useState(tabs[0]?.key ?? 'text');
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  const live = j.live_remaining_objection_days ?? j.remaining_objection_days ?? null;
  const canObject = !!j.available_for_objection && live !== null && live >= 0;
  return (
    <div className="jm-overlay" onClick={onClose}>
      <div className="jm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="jm-header">
          <FileText size={15} className="jm-header__icon" />
          <span className="jm-header__title">{j.judgement_description || 'الحكم القضائي'}</span>
          {j.judgement_code && <span className="jm-header__sak" title="رقم الصك">{j.judgement_code}</span>}
          <div className="jm-header__spacer" />
          <div className="jm-header__badges">
            {j.judgement_type && <span className={`jm-badge ${j.judgement_type === 'نهائي' ? 'jm-badge--final' : 'jm-badge--pending'}`}>{j.judgement_type}</span>}
            {canObject && <span className="jm-badge jm-badge--objection">اعتراض: {live} يوم</span>}
          </div>
          <button className="jm-close" onClick={onClose} aria-label="إغلاق"><XIcon size={16} /></button>
        </div>
        <div className="jm-body">
          <aside className="jm-sidebar">
            <div className="jm-group"><h4 className="jm-group__title">القضية</h4><div className="jm-row"><span className="jm-row__label">العنوان</span><span className="jm-row__value">{caseTitle}</span></div><div className="jm-row"><span className="jm-row__label">الرقم</span><span className="jm-row__value">{fileNumber}</span></div></div>
            {(j.court_name || j.circle_name) && <div className="jm-group"><h4 className="jm-group__title">المحكمة</h4><div className="jm-row"><span className="jm-row__label">الجهة</span><span className="jm-row__value">{j.court_name || '-'}</span></div>{j.circle_name && <div className="jm-row"><span className="jm-row__label">الدائرة</span><span className="jm-row__value">{j.circle_name}</span></div>}</div>}
            {(j.session_date || j.sak_date || j.delivery_date) && <div className="jm-group"><h4 className="jm-group__title">التواريخ</h4>{j.session_date && <div className="jm-row"><span className="jm-row__label">النطق</span><span className="jm-row__value">{gDate(j.session_date)}</span></div>}{j.sak_date && <div className="jm-row"><span className="jm-row__label">إصدار الصك</span><span className="jm-row__value">{gDate(j.sak_date)}</span></div>}{j.delivery_date && <div className="jm-row"><span className="jm-row__label">التسليم</span><span className="jm-row__value">{gDate(j.delivery_date)}</span></div>}</div>}
            {(j.available_for_objection || j.objection_due_date) && <div className="jm-group"><h4 className="jm-group__title">الاعتراض</h4><div className="jm-row"><span className="jm-row__label">الحالة</span><span className={`jm-row__value ${canObject ? 'jm-row__value--accent' : ''}`}>{canObject ? 'متاح' : 'منتهي'}</span></div>{j.objection_due_date && <div className="jm-row"><span className="jm-row__label">ينتهي</span><span className="jm-row__value">{j.objection_due_date}</span></div>}</div>}
          </aside>
          <main className="jm-main">
            {tabs.length === 0 ? <div className="jm-empty">لا يوجد نص محفوظ لهذا الحكم.</div> : (
              <>
                <div className="jm-tabs">{tabs.map((t) => <button key={t.key} className={`jm-tab ${t.key === active ? 'jm-tab--active' : ''}`} onClick={() => setActive(t.key)}><span>{t.label}</span></button>)}</div>
                <div className="jm-content">{current?.body || ''}</div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
