import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  User,
  Users,
  Calendar,
  CheckCircle,
  Trash2,
  Paperclip,
  Briefcase,
  ExternalLink,
  ListTodo,
  FileText,
  StickyNote,
  ShieldCheck,
  X,
  AlertCircle,
  Loader2,
  PauseCircle,
  Play,
  Pencil,
  PanelLeft,
  MessagesSquare,
  Gavel,
  Timer,
  Link2,
  UploadCloud,
  AlignRight,
  Star,
  FolderClosed,
  FolderInput,
} from 'lucide-react';
import { TaskService } from '../services/taskService';
import { TaskFolderService } from '../services/taskFolderService';
import TaskTimer from '../components/TaskTimer';
import SubtasksList from '../components/SubtasksList';
import TaskTeamChat from '../components/TaskTeamChat';
import EditTaskModal from '../components/EditTaskModal';
import AddExternalLinkModal from '../components/AddExternalLinkModal';
import { TasksCache } from '../utils/tasksCache';
import { isExternalLinkDoc, safeExternalHref, externalLinkHost } from '../types';
import type { Task, TaskStatus, TaskFolder, ExternalLinkPayload, Document } from '../types';

/**
 * مساحة المهمة — «النمط الملتصق» (نفس وصفة غرفة تجهيز القضية حرفياً):
 * ترويسة مدمجة (عنوان + حالة + حقائق)، ثم ثلاثة أعمدة ملتصقة بلا فراغات:
 * [محادثة المهمة + رائد الذكي — يمين، قابلة للطي] [بيانات المهمة + الفريق +
 * المهام الفرعية] [التفاصيل + الموقّت + المرفقات + الارتباطات — يسار، قابل
 * للطي]. لا تمرير خارجي — كل عمود يتمرر داخلياً، وطي أي جانب يمدد الوسط.
 */

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  todo: { label: 'لم تبدأ', color: '#64748b' },
  in_progress: { label: 'قيد التنفيذ', color: '#3b82f6' },
  review: { label: 'مراجعة', color: '#f59e0b' },
  pending_approval: { label: 'بانتظار الاعتماد', color: '#8b5cf6' },
  on_hold: { label: 'موقوفة مؤقتاً', color: '#f97316' },
  completed: { label: 'مكتملة', color: '#10b981' },
  cancelled: { label: 'ملغية', color: '#ef4444' }
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'عاجلة', color: '#ef4444' },
  high: { label: 'عالية', color: '#f97316' },
  medium: { label: 'متوسطة', color: '#f59e0b' },
  low: { label: 'منخفضة', color: '#3b82f6' }
};

const TYPE_LABELS: Record<string, string> = {
  review: 'مراجعة',
  research: 'بحث قانوني',
  consultation: 'استشارة',
  court: 'جلسة محكمة',
  document: 'إعداد مستند',
  meeting: 'اجتماع',
  other: 'أخرى',
};

/*
 * نطاق الرابط الخارجي وحارس فتحه: `externalLinkHost` و`safeExternalHref` من `../types`.
 * لا نسخة محلّية — النسخة القديمة كانت تشتقّ النطاق من `new URL(url).hostname` مباشرةً،
 * و`new URL('javascript:x').hostname === ''`، فرقاقة النطاق كانت تغيب *حصراً* في الحالة
 * الخبيثة: العنصر الوحيد الذي يكشف الخدعة يختفي تحديداً حين تُرتكب.
 */

/** قسم أكورديون ملتصق في العمود الجانبي — رأس قابل للنقر يفتح/يغلق جسمه، والحالة تُحفظ */
const AccSection: React.FC<{
  id: string;
  title: string;
  icon: React.ReactNode;
  meta?: React.ReactNode;
  open: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}> = ({ id, title, icon, meta, open, onToggle, children }) => (
  <section className={`twk-acc${open ? ' twk-acc--open' : ''}`}>
    <button className="ssp2-card__head twk-acc__head" onClick={() => onToggle(id)} aria-expanded={open}>
      <span className="ssp2-card__title">{icon} {title}</span>
      <span className="ssp2-card__headtools">
        {meta}
        <ChevronDown size={15} className="twk-acc__chev" />
      </span>
    </button>
    {open && <div className="twk-acc__body">{children}</div>}
  </section>
);

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [onedriveConnected, setOnedriveConnected] = useState<boolean | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  // «إضافة من مصدر آخر» — رابط خارجي كمرفق؛ لا علاقة له بـOneDrive فلا يُقيَّد بحالة ربطه
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [subProgress, setSubProgress] = useState<number | null>(null);
  // مفتاح تحديث نازل للأبناء (المهام الفرعية/المؤقت): يملكون حالتهم المستقلة ولا يعيدون الجلب
  // إلا على taskId، فنزيد هذا المفتاح لإجبارهم بعد فعل يقع في الباك خارجهم (رائد ينشئ فرعية،
  // استئناف المهمة يفكّ إيقاف فرعياتها...).
  const [childReloadKey, setChildReloadKey] = useState(0);
  const reloadChildren = () => setChildReloadKey((k) => k + 1);
  // الإيقاف المؤقت بسبب إلزامي (#130)
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  // مجلد المهمة (تنظيم ظاهري): قائمة النقل تُحمَّل كسولاً عند أول فتح
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<TaskFolder[] | null>(null);
  const [movingFolder, setMovingFolder] = useState(false);

  const toggleFolderMenu = () => {
    setFolderMenuOpen(v => !v);
    if (availableFolders === null) {
      TaskFolderService.getFolders()
        .then(({ folders }) => setAvailableFolders(folders))
        .catch(() => setAvailableFolders([]));
    }
  };

  const moveToFolder = async (folderId: number | null) => {
    if (!task || movingFolder) return;
    setFolderMenuOpen(false);
    if ((task.task_folder_id ?? null) === folderId) return;
    setMovingFolder(true);
    try {
      await TaskFolderService.moveTasks([task.id], folderId);
      const folder = folderId !== null ? (availableFolders ?? []).find(f => f.id === folderId) ?? null : null;
      setTask(prev => (prev ? { ...prev, task_folder_id: folderId, folder } : prev));
    } catch (err: any) {
      alert(err?.message || 'تعذّر نقل المهمة إلى المجلد');
    } finally {
      setMovingFolder(false);
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* طيّ الأعمدة الجانبية — يبقى عبر الجلسات، وطيّ أيّها يمدد الوسط */
  const [chatCollapsed, setChatCollapsed] = useState(() => localStorage.getItem('twk_chat_collapsed') === '1');
  const toggleChatCollapsed = () =>
    setChatCollapsed((v) => { localStorage.setItem('twk_chat_collapsed', v ? '0' : '1'); return !v; });

  const [sideCollapsed, setSideCollapsed] = useState(() => localStorage.getItem('twk_side_collapsed') === '1');
  const toggleSideCollapsed = () =>
    setSideCollapsed((v) => { localStorage.setItem('twk_side_collapsed', v ? '0' : '1'); return !v; });

  /* أقسام العمود الجانبي أكورديون — كلٌّ يُفتح/يُغلق مستقلاً، والحالة تبقى عبر الجلسات */
  const [accOpen, setAccOpen] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('twk_acc_sections');
      if (saved) return JSON.parse(saved);
    } catch { /* تجاهل JSON تالف */ }
    return { details: true, timer: true, attachments: true, links: true };
  });
  const toggleAcc = (id: string) => setAccOpen((prev) => {
    const next = { ...prev, [id]: !prev[id] };
    try { localStorage.setItem('twk_acc_sections', JSON.stringify(next)); } catch { /* تجاهل */ }
    return next;
  });

  useEffect(() => {
    if (taskId) {
      loadTask();
      loadDocuments();
    }
  }, [taskId]);

  const loadTask = async () => {
    try {
      const taskData = await TaskService.getTask(taskId!);
      setTask(taskData);
    } catch (error) {
      console.error('Error loading task:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const res = await TaskService.getTaskDocuments(taskId!);
      setDocuments(res.documents);
      setOnedriveConnected(res.onedriveConnected);
    } catch (error) {
      console.error('Error loading task documents:', error);
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    if (newStatus === 'on_hold') {
      // on_hold لا تمرّ عبر /status — سبب إلزامي عبر المودال ثم /hold (#130)
      if (task.status !== 'on_hold') {
        setHoldReason('');
        setHoldModalOpen(true);
      }
      return;
    }
    TasksCache.updateTask({ ...task, status: newStatus }); // تحديث متفائل للكانبان
    try {
      await TaskService.updateTaskStatus(taskId!, newStatus);
      await loadTask(); // الحالة الفعلية قد تتحول إلى «بانتظار الاعتماد»
    } catch (error: any) {
      console.error('Status update failed', error);
      alert(error?.message || 'تعذّر تحديث حالة المهمة');
      loadTask();
    }
  };

  const handleConfirmHold = async () => {
    if (!holdReason.trim()) return;
    setActionBusy(true);
    try {
      await TaskService.holdTask(taskId!, holdReason.trim());
      setHoldModalOpen(false);
      setHoldReason('');
      await loadTask();
    } catch (error: any) {
      alert(error?.message || 'تعذّر إيقاف المهمة');
    } finally {
      setActionBusy(false);
    }
  };

  const handleResume = async () => {
    setActionBusy(true);
    try {
      await TaskService.resumeTask(taskId!);
      await loadTask();
      reloadChildren(); // الباك يفكّ إيقاف كل الفرعيات عند الاستئناف — أجبِر قائمتها على إعادة الجلب
    } catch (error: any) {
      alert(error?.message || 'تعذّر استئناف المهمة');
    } finally {
      setActionBusy(false);
    }
  };

  const handleApprove = async () => {
    setActionBusy(true);
    try {
      await TaskService.approveTask(taskId!);
      await loadTask();
    } catch (error: any) {
      alert(error?.message || 'تعذّر اعتماد المهمة');
    } finally {
      setActionBusy(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt('سبب الرفض (إلزامي):', '');
    if (!reason || !reason.trim()) return;
    setActionBusy(true);
    try {
      await TaskService.rejectTask(taskId!, reason.trim());
      await loadTask();
    } catch (error: any) {
      alert(error?.message || 'تعذّر رفض المهمة');
    } finally {
      setActionBusy(false);
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      await TaskService.uploadTaskDocument(taskId!, file);
      await loadDocuments();
      await loadTask();
    } catch (error: any) {
      alert(error?.message || 'تعذّر رفع المرفق');
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /**
   * إضافة رابط خارجي كمرفق — يرمي عند الفشل عمداً: المودال يلتقط الرمية ويعرض رسالة الباك (422) عربيةً.
   * إعادة تحميل المهمة لأنّ الرابط يُحتسب مرفقاً فيرفع عدّاد `requires_attachment` عند الباك.
   */
  const handleAddLink = async (payload: ExternalLinkPayload) => {
    await TaskService.addTaskLink(taskId!, payload);
    await loadDocuments();
    await loadTask();
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm('حذف هذا المرفق؟')) return;
    try {
      await TaskService.deleteTaskDocument(taskId!, docId);
      await loadDocuments();
      await loadTask();
    } catch (error: any) {
      alert(error?.message || 'تعذّر حذف المرفق');
    }
  };

  /**
   * فتح مرفق مرفوع عبر رابطٍ مؤقّت من الباك.
   * 🔴 الروابط الخارجية لا تمرّ من هنا — السيرفر لا يجلبها إطلاقاً (منعاً لـSSRF)،
   * فتُفتح بـ<a href={external_url}> مباشرةً في صفّها.
   */
  const openDoc = async (docId: string) => {
    try {
      const url = await TaskService.getTaskDocumentUrl(taskId!, docId);
      // noreferrer إلى جانب noopener: بدونه يتسرّب Referer (مسار المهمة) إلى مضيف التخزين
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      alert(error?.message || 'تعذّر فتح المرفق');
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('حذف هذه المهمة؟ ستنتقل إلى سلة المحذوفات.')) return;
    try {
      await TaskService.deleteTask(taskId!);
      navigate('/tasks');
    } catch (error: any) {
      alert(error?.message || 'تعذّر حذف المهمة');
    }
  };

  if (loading) {
    return (
      <div className="ssp2-page" dir="rtl" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p className="ssp2-empty"><Loader2 size={16} className="ssp2-spin" /> جارٍ تحميل المهمة...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="ssp2-page" dir="rtl" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p className="ssp2-empty"><AlertCircle size={16} /> المهمة غير موجودة أو لا تملك صلاحية عرضها.</p>
        <button className="ssp2-btn" onClick={() => navigate('/tasks')}>عودة للمهام</button>
      </div>
    );
  }

  const currentStatus = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
  const currentPriority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const dueDateObj = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDateObj && dueDateObj < new Date()
    && !['completed', 'cancelled', 'on_hold'].includes(task.status);
  const teamMembers = (task.assignees && task.assignees.length > 0)
    ? task.assignees
    : (task.assignee ? [task.assignee] : []);
  const linkedCase = (task as any).case;
  const linkedClient = (task as any).client;
  const linkedExec = (task as any).execution_request;

  return (
    <div className="ssp2-page cpk-page twk-page" dir="rtl">

      {/* ── الترويسة: العنوان والحالة والإجراءات + صف الحقائق ── */}
      <header className="ssp2-header">
        <div className="ssp2-header__top">
          <div className="ssp2-header__info">
            <button className="ssp2-icon-btn" onClick={() => navigate('/tasks')} title="عودة للمهام">
              <ChevronRight size={17} />
            </button>
            <span className="ssp2-header__badge"><ListTodo size={13} /> مساحة المهمة</span>
            <h1 className="ssp2-header__title">{task.title}</h1>
            <span
              className="twk-priority-chip"
              style={{ color: currentPriority.color, borderColor: currentPriority.color }}
            >
              {currentPriority.label}
            </span>
          </div>

          <div className="ssp2-header__actions">
            {/* الحالة — قائمة منسدلة؛ «موقوفة مؤقتاً» تفتح مودال السبب (#130) */}
            <div className="twk-status-wrap">
              <button
                className="ssp2-btn twk-status-btn"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                style={{ color: currentStatus.color, borderColor: currentStatus.color + '55', background: currentStatus.color + '12' }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: currentStatus.color }} />
                {currentStatus.label}
                <ChevronDown size={13} />
              </button>
              {showStatusDropdown && (
                <>
                  <div className="twk-overlay" onClick={() => setShowStatusDropdown(false)} />
                  <div className="twk-status-menu">
                    {Object.entries(STATUS_CONFIG).filter(([key]) => key !== 'pending_approval').map(([key, config]) => (
                      <button
                        key={key}
                        className="twk-status-option"
                        onClick={() => { handleStatusChange(key as TaskStatus); setShowStatusDropdown(false); }}
                        style={{ color: task.status === key ? config.color : 'inherit' }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: config.color, flexShrink: 0 }} />
                        {config.label}
                        {task.status === key && <CheckCircle size={13} style={{ marginRight: 'auto' }} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {task.status === 'on_hold' ? (
              <button className="ssp2-btn ssp2-btn--success" disabled={actionBusy} onClick={handleResume}>
                <Play size={14} /> استئناف
              </button>
            ) : !['completed', 'cancelled', 'pending_approval'].includes(task.status) && (
              <button className="ssp2-btn" disabled={actionBusy} onClick={() => { setHoldReason(''); setHoldModalOpen(true); }}>
                <PauseCircle size={14} /> إيقاف مؤقت
              </button>
            )}

            <button className="ssp2-btn" onClick={() => setEditOpen(true)}>
              <Pencil size={14} /> تعديل البيانات
            </button>
            <button className="ssp2-icon-btn" onClick={handleDeleteTask} title="حذف المهمة">
              <Trash2 size={15} />
            </button>
            <button
              className="ssp2-icon-btn"
              onClick={toggleSideCollapsed}
              title={sideCollapsed ? 'فتح عمود التفاصيل والأدوات' : 'طيّ عمود التفاصيل والأدوات'}
            >
              <PanelLeft size={16} />
            </button>
          </div>
        </div>

        <div className="ssp2-header__facts">
          {subProgress !== null && (
            <>
              <span className="ssp2-fact cpk-progressfact">
                <span className="cpk-progressbar"><span style={{ width: `${subProgress}%` }} /></span>
                <b>{subProgress}%</b>
                <span className="ssp2-fact__label">من الفرعيات</span>
              </span>
              <span className="ssp2-fact__sep" />
            </>
          )}
          <span className="ssp2-fact">
            <Calendar size={13} />
            <span className="ssp2-fact__label">الاستحقاق</span>
            <b style={isOverdue ? { color: '#ef4444' } : undefined}>
              {dueDateObj ? dueDateObj.toLocaleDateString('ar-SA') : 'بلا موعد'}
              {isOverdue ? ' (متأخرة!)' : ''}
            </b>
          </span>
          <span className="ssp2-fact__sep" />
          <span className="ssp2-fact">
            <Users size={13} />
            <span className="ssp2-fact__label">المكلّفون</span>
            <b>{teamMembers.length ? teamMembers.map((m: any) => m.name).join('، ') : 'غير محدد'}</b>
          </span>
          <span className="ssp2-fact__sep" />
          <span className="ssp2-fact">
            {linkedCase ? <Briefcase size={13} /> : linkedClient ? <User size={13} /> : linkedExec ? <Gavel size={13} /> : <Link2 size={13} />}
            <span className="ssp2-fact__label">الارتباط</span>
            <b>
              {linkedCase ? linkedCase.title
                : linkedClient ? `العميل: ${linkedClient.name}`
                : linkedExec ? `طلب تنفيذ ${linkedExec.request_number || ''}`
                : 'مهمة عامة'}
            </b>
          </span>
          {(task.requires_approval || task.requires_attachment) && (
            <>
              <span className="ssp2-fact__sep" />
              <span className="ssp2-fact">
                <ShieldCheck size={13} />
                <span className="ssp2-fact__label">المتطلبات</span>
                <b>
                  {[task.requires_approval ? 'اعتماد الإنجاز' : null, task.requires_attachment ? 'مرفق إلزامي' : null]
                    .filter(Boolean).join(' + ')}
                </b>
              </span>
            </>
          )}
          {task.type && TYPE_LABELS[task.type] && (
            <>
              <span className="ssp2-fact__sep" />
              <span className="ssp2-fact">
                <FileText size={13} />
                <span className="ssp2-fact__label">النوع</span>
                <b>{TYPE_LABELS[task.type]}</b>
              </span>
            </>
          )}
          {/* شارة المجلد — نقر يفتح قائمة النقل بين المجلدات */}
          <span className="ssp2-fact__sep" />
          <span
            className={`ssp2-fact tf-fact${task.folder ? ` tf-color-${task.folder.color}` : ''}`}
            role="button"
            title="نقل المهمة بين المجلدات"
            onClick={toggleFolderMenu}
          >
            <FolderClosed size={13} className={task.folder ? 'tf-fact__icon' : undefined} />
            <span className="ssp2-fact__label">المجلد</span>
            <b>{movingFolder ? 'جارٍ النقل…' : task.folder ? task.folder.name : 'بلا مجلد'}</b>
            <ChevronDown size={11} style={{ opacity: 0.5 }} />
            {folderMenuOpen && (
              <>
                <span className="tf-fact__backdrop" onClick={(e) => { e.stopPropagation(); setFolderMenuOpen(false); }} />
                <span className="tf-fact__menu" onClick={(e) => e.stopPropagation()}>
                  {availableFolders === null ? (
                    <span className="tf-fact__menu-empty">جارٍ التحميل…</span>
                  ) : (
                    <>
                      {availableFolders.filter(f => f.id !== (task.task_folder_id ?? null)).map(f => (
                        <button key={f.id} type="button" onClick={() => moveToFolder(f.id)}>
                          <FolderClosed size={12} className={`tf-menu-folder-icon tf-color-${f.color}`} />
                          <span>{f.name}</span>
                        </button>
                      ))}
                      {task.task_folder_id != null && (
                        <button type="button" onClick={() => moveToFolder(null)}>
                          <FolderInput size={12} />
                          <span>إخراج من المجلد</span>
                        </button>
                      )}
                      {availableFolders.length === 0 && (
                        <span className="tf-fact__menu-empty">لا توجد مجلدات — أنشئها من صفحة المهام</span>
                      )}
                    </>
                  )}
                </span>
              </>
            )}
          </span>
        </div>
      </header>

      {/* ── ثلاثة أعمدة ملتصقة: [محادثة — يمين] [بيانات + فرعيات] [تفاصيل وأدوات — يسار] ── */}
      <div className="ssp2-layout">

        {/* عمود المحادثة — متصل بالحواف، قابل للطيّ إلى شريط رفيع */}
        <aside className={`ssp2-chatcol${chatCollapsed ? ' ssp2-chatcol--min' : ''}`}>
          {chatCollapsed ? (
            <button className="ssp2-chatcol__reopen" onClick={toggleChatCollapsed} title="فتح محادثة المهمة">
              <MessagesSquare size={17} />
              <span>محادثة المهمة</span>
            </button>
          ) : (
            <TaskTeamChat taskId={taskId!} onCollapse={toggleChatCollapsed} onTaskMutated={() => { loadTask(); reloadChildren(); }} />
          )}
        </aside>

        {/* مساحة العمل الوسطى: أشرطة الحالة ثم بيانات المهمة ثم المهام الفرعية */}
        <main className="ssp2-work">
          <div className="cpk-work__scroll">

            {/* أشرطة الحالة — شرائح رفيعة أعلى العمود (لا بطاقات كبيرة) */}
            {task.status === 'on_hold' && (
              <div className="twk-bar twk-bar--hold">
                <PauseCircle size={15} />
                <span className="twk-bar__text">
                  <b>موقوفة مؤقتاً{task.hold_reason ? `: ${task.hold_reason}` : ''}</b>
                  <small>
                    أوقفها {task.held_by_user?.name || 'غير معروف'}
                    {task.held_at ? ` — ${new Date(task.held_at).toLocaleDateString('ar-SA')}` : ''}
                    {task.status_before_hold && STATUS_CONFIG[task.status_before_hold]
                      ? ` · تعود إلى «${STATUS_CONFIG[task.status_before_hold].label}» عند الاستئناف`
                      : ''}
                  </small>
                </span>
                <button className="ssp2-btn ssp2-btn--success" disabled={actionBusy} onClick={handleResume}>
                  <Play size={13} /> استئناف
                </button>
              </div>
            )}
            {task.status === 'pending_approval' && (
              <div className="twk-bar twk-bar--pending">
                <ShieldCheck size={15} />
                <span className="twk-bar__text"><b>أنهى المنفّذ هذه المهمة وهي بانتظار الاعتماد</b></span>
                {task.can_approve && (
                  <span className="twk-bar__actions">
                    <button className="ssp2-btn ssp2-btn--success" disabled={actionBusy} onClick={handleApprove}>
                      <CheckCircle size={13} /> اعتماد
                    </button>
                    <button className="ssp2-btn twk-btn-danger" disabled={actionBusy} onClick={handleReject}>
                      <X size={13} /> رفض
                    </button>
                  </span>
                )}
              </div>
            )}
            {task.status === 'completed' && task.approved_by && (
              <div className="twk-bar twk-bar--approved">
                <ShieldCheck size={15} />
                <span className="twk-bar__text">
                  <b>
                    اعتُمد الإنجاز{(task as any).approver?.name ? ` بواسطة ${(task as any).approver.name}` : ''}
                    {task.approved_at ? ` — ${new Date(task.approved_at).toLocaleDateString('ar-SA')}` : ''}
                  </b>
                </span>
              </div>
            )}
            {!['pending_approval', 'completed'].includes(task.status) && task.rejection_reason && (
              <div className="twk-bar twk-bar--rejected">
                <AlertCircle size={15} />
                <span className="twk-bar__text"><b>أُعيدت للتنفيذ: {task.rejection_reason}</b></span>
              </div>
            )}

            {/* بيانات المهمة: الوصف والملاحظات وفريق المهمة */}
            <section className="ssp2-card cpk-block">
              <div className="ssp2-card__head">
                <span className="ssp2-card__title"><AlignRight size={15} /> بيانات المهمة</span>
                <span className="ssp2-card__headtools">
                  <button className="ssp2-icon-btn" onClick={() => setEditOpen(true)} title="تعديل بيانات المهمة">
                    <Pencil size={14} />
                  </button>
                </span>
              </div>

              <div className="cpk-info">
                <div className="cpk-longfields">
                  <div className="cpk-longfield">
                    <span className="cpk-longfield__label"><AlignRight size={12} /> وصف المهمة</span>
                    <p className="cpk-longfield__text">
                      {task.description?.trim() || <span className="cpk-empty">لا وصف بعد — أضفه من «تعديل البيانات» ليفهم الفريق (ورائد) المطلوب.</span>}
                    </p>
                  </div>
                  <div className="cpk-longfield">
                    <span className="cpk-longfield__label"><StickyNote size={12} /> الملاحظات</span>
                    <p className="cpk-longfield__text">
                      {task.notes?.trim() || <span className="cpk-empty">لا ملاحظات.</span>}
                    </p>
                  </div>
                </div>

                <div className="cpk-lawyers">
                  <span className="cpk-longfield__label"><Users size={12} /> فريق المهمة</span>
                  <div className="cpk-lawyers__chips">
                    {teamMembers.length === 0 ? (
                      <span className="cpk-empty">لم يُكلَّف أحد بعد.</span>
                    ) : (
                      teamMembers.map((m: any) => {
                        const isPrimary = m?.pivot?.is_primary || (teamMembers.length === 1);
                        return (
                          <span key={m.id} className={`cpk-lawyer-chip${isPrimary ? ' cpk-lawyer-chip--primary' : ''}`}>
                            {isPrimary && <Star size={11} />}
                            {m.name}
                            {isPrimary && <span className="cpk-lawyer-chip__role">مسؤول</span>}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* المهام الفرعية — تملأ الباقي وتتمرر داخلياً (إيقاف/استئناف #130 بداخلها) */}
            <section className="ssp2-card cpk-block cpk-block--tasks">
              <div className="ssp2-card__head">
                <span className="ssp2-card__title"><ListTodo size={15} /> المهام الفرعية</span>
              </div>
              <div className="cpk-tasks twk-subtasks">
                <SubtasksList
                  taskId={taskId!}
                  onProgressChange={(p) => setSubProgress(p)}
                  onTaskChanged={loadTask}
                  reloadSignal={childReloadKey}
                  dense
                />
              </div>
            </section>
          </div>
        </main>

        {/* عمود التفاصيل والأدوات — أقصى اليسار، متصل وقابل للطيّ إلى شريط رفيع */}
        <aside className={`cpk-sidecol${sideCollapsed ? ' cpk-sidecol--min' : ''}`}>
          {sideCollapsed ? (
            <button className="ssp2-chatcol__reopen" onClick={toggleSideCollapsed} title="فتح التفاصيل والأدوات">
              <Paperclip size={17} />
              <span>التفاصيل والأدوات</span>
            </button>
          ) : (
            <>
              <div className="ssp2-card__head cpk-sidecol__head">
                <span className="ssp2-card__title"><Paperclip size={15} /> التفاصيل والأدوات</span>
                <span className="ssp2-card__headtools">
                  <button className="ssp2-icon-btn" onClick={toggleSideCollapsed} title="طيّ العمود">
                    <ChevronsLeft size={15} />
                  </button>
                </span>
              </div>

              <div className="cpk-sidecol__scroll">
                {/* التفاصيل */}
                <AccSection id="details" title="التفاصيل" icon={<FileText size={14} />} open={!!accOpen.details} onToggle={toggleAcc}>
                  <div className="twk-kvlist">
                    <div className="twk-kv">
                      <span className="twk-kv__label">أُنشئت</span>
                      <b>{task.createdAt ? new Date(task.createdAt).toLocaleDateString('ar-SA') : '—'}</b>
                    </div>
                    <div className="twk-kv">
                      <span className="twk-kv__label">أسندها</span>
                      <b>{(task as any).assigner?.name || '—'}</b>
                    </div>
                    <div className="twk-kv">
                      <span className="twk-kv__label">الساعات المقدرة</span>
                      <b>{(task as any).estimatedHours ?? (task as any).estimated_hours ?? '—'}</b>
                    </div>
                    <div className="twk-kv">
                      <span className="twk-kv__label">الساعات الفعلية</span>
                      <b>{(task as any).actualHours ?? (task as any).actual_hours ?? '—'}</b>
                    </div>
                    {task.completedAt && (
                      <div className="twk-kv">
                        <span className="twk-kv__label">اكتملت</span>
                        <b>{new Date(task.completedAt).toLocaleDateString('ar-SA')}</b>
                      </div>
                    )}
                  </div>
                </AccSection>

                {/* الموقّت — مسطّح بالنمط الملتصق (بلا wrapper) */}
                <AccSection id="timer" title="تتبع الوقت" icon={<Timer size={14} />} open={!!accOpen.timer} onToggle={toggleAcc}>
                  <TaskTimer taskId={taskId!} taskTitle={task.title} caseTitle={linkedCase?.title || ''} onTimeLogged={loadTask} />
                </AccSection>

                {/* المرفقات */}
                <AccSection id="attachments" title="المرفقات" icon={<Paperclip size={14} />} meta={<span className="ssp2-card__meta">{documents.length}</span>} open={!!accOpen.attachments} onToggle={toggleAcc}>
                  <div className="twk-sideblock">
                    {task.requires_attachment && documents.length === 0 && (
                      <p className="twk-attach-warn"><AlertCircle size={12} /> هذه المهمة تتطلب مرفقاً قبل إكمالها.</p>
                    )}
                    {documents.length === 0 ? (
                      <p className="cpk-empty">لا مرفقات بعد.</p>
                    ) : (
                      <div className="twk-docs">
                        {documents.map((doc: Document) => {
                          const isLink = isExternalLinkDoc(doc);
                          // حارس العرض: الباك يحرس عند الإنشاء، وصفٌّ قديم قد يحمل مخطّطاً آخر
                          const href = isLink ? safeExternalHref(doc.external_url) : null;
                          const host = isLink ? externalLinkHost(doc.external_url) : null;
                          // `name` ليس في نوع Document لكنه يرد في بعض حمولات المرفقات القديمة
                          const legacyName = (doc as { name?: string }).name;
                          const label = doc.title || doc.file_name || legacyName || (isLink ? 'رابط' : 'مستند');
                          return (
                            <div key={doc.id} className="twk-doc">
                              {isLink ? (
                                href ? (
                                  <a
                                    className="twk-doc__open twk-doc__open--link"
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={host || href}
                                  >
                                    <Link2 size={13} />
                                    <span className="twk-doc__main">
                                      <span className="twk-doc__title">{label}</span>
                                      <span className="twk-doc__sub">
                                        <span className="twk-doc__chip">رابط خارجي</span>
                                        {host && <bdi dir="ltr" className="twk-doc__host">{host}</bdi>}
                                      </span>
                                    </span>
                                    <ExternalLink size={11} style={{ opacity: 0.5 }} />
                                  </a>
                                ) : (
                                  /* غير قابل للنقر عمداً: لا href ولا onClick — ولا يُعرض الرابط الخام حتى في التلميح */
                                  <div
                                    className="twk-doc__open twk-doc__open--link twk-doc__open--invalid"
                                    title="رابط غير صالح — لا يمكن فتحه"
                                  >
                                    <AlertCircle size={13} />
                                    <span className="twk-doc__main">
                                      <span className="twk-doc__title">{label}</span>
                                      <span className="twk-doc__sub">
                                        <span className="twk-doc__chip twk-doc__chip--warn">رابط غير صالح</span>
                                      </span>
                                    </span>
                                  </div>
                                )
                              ) : (
                                <button className="twk-doc__open" onClick={() => openDoc(String(doc.id))} title="فتح المرفق">
                                  <FileText size={13} />
                                  <span>{label}</span>
                                  <ExternalLink size={11} style={{ opacity: 0.5 }} />
                                </button>
                              )}
                              {task.can_manage_documents && (
                                <button className="twk-doc__del" onClick={() => handleDeleteDoc(String(doc.id))} title={isLink ? 'حذف الرابط' : 'حذف المرفق'}>
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {task.can_manage_documents && (
                      <>
                        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUploadFile} />
                        <div className="twk-doc-actions">
                          <button
                            className="ssp2-btn twk-upload-btn"
                            disabled={uploadingDoc || onedriveConnected === false}
                            onClick={() => fileInputRef.current?.click()}
                            title={onedriveConnected === false ? 'اربط OneDrive من الإعدادات أولاً' : 'رفع مرفق'}
                          >
                            {uploadingDoc ? <Loader2 size={13} className="ssp2-spin" /> : <UploadCloud size={13} />}
                            {uploadingDoc ? 'جارٍ الرفع...' : 'رفع مرفق'}
                          </button>
                          {/* لا يُقيَّد بربط OneDrive — الرابط لا يُرفع ولا يُخزَّن ملفاً */}
                          <button
                            className="ssp2-btn twk-upload-btn"
                            onClick={() => setLinkModalOpen(true)}
                            title="إضافة رابط خارجي (درايف، ناجز، موقع...) بلا رفع ملف"
                          >
                            <Link2 size={13} />
                            إضافة من مصدر آخر
                          </button>
                        </div>
                        {onedriveConnected === false && (
                          <p className="cpk-empty" style={{ marginTop: 6 }}>OneDrive غير مربوط — اربطه من الإعدادات لرفع المرفقات (الروابط الخارجية لا تحتاجه).</p>
                        )}
                      </>
                    )}
                  </div>
                </AccSection>

                {/* الارتباطات */}
                <AccSection id="links" title="الارتباطات" icon={<Link2 size={14} />} open={!!accOpen.links} onToggle={toggleAcc}>
                  <div className="twk-sideblock">
                    {linkedCase ? (
                      <Link to={`/cases/${linkedCase.id}`} className="twk-link">
                        <Briefcase size={13} />
                        <span>{linkedCase.title}{linkedCase.file_number ? ` (${linkedCase.file_number})` : ''}</span>
                        <ExternalLink size={11} style={{ opacity: 0.5 }} />
                      </Link>
                    ) : linkedClient ? (
                      <Link to={`/clients/${linkedClient.id}`} className="twk-link">
                        <User size={13} />
                        <span>العميل: {linkedClient.name}</span>
                        <ExternalLink size={11} style={{ opacity: 0.5 }} />
                      </Link>
                    ) : linkedExec ? (
                      <Link to="/execution-requests" className="twk-link">
                        <Gavel size={13} />
                        <span>طلب تنفيذ {linkedExec.request_number || ''}</span>
                        <ExternalLink size={11} style={{ opacity: 0.5 }} />
                      </Link>
                    ) : (
                      <p className="cpk-empty">مهمة عامة (غير مرتبطة بقضية أو عميل).</p>
                    )}
                  </div>
                </AccSection>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* مودال الإيقاف المؤقت — السبب إلزامي (#130) */}
      {holdModalOpen && (
        <div
          onClick={() => !actionBusy && setHoldModalOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--dashboard-card, #fff)', borderRadius: 12, padding: 24, width: 420, maxWidth: '90vw', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(249,115,22,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <PauseCircle size={20} color="#f97316" />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--color-text)' }}>إيقاف المهمة مؤقتاً</h3>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>
              تُستثنى الموقوفة من تذكيرات التأخير وتعود لحالتها الحالية عند الاستئناف.
            </p>
            <textarea
              autoFocus
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              placeholder="سبب الإيقاف (إلزامي) — مثل: بانتظار رد العميل على الاستفسار..."
              maxLength={300}
              rows={3}
              style={{
                width: '100%', resize: 'vertical', boxSizing: 'border-box',
                border: '1px solid var(--color-border, #e5e5e5)', borderRadius: 8,
                padding: '10px 12px', fontSize: 13, fontFamily: 'inherit',
                background: 'var(--color-surface, #fff)', color: 'var(--color-text)',
                marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleConfirmHold}
                disabled={actionBusy || !holdReason.trim()}
                style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: actionBusy || !holdReason.trim() ? 'default' : 'pointer', fontSize: 14, fontWeight: 600, opacity: actionBusy || !holdReason.trim() ? 0.6 : 1 }}
              >
                {actionBusy ? 'جارٍ الإيقاف...' : 'إيقاف مؤقت'}
              </button>
              <button
                onClick={() => setHoldModalOpen(false)}
                disabled={actionBusy}
                style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '9px 18px', cursor: actionBusy ? 'default' : 'pointer', fontSize: 14 }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <EditTaskModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        task={task}
        onTaskUpdated={() => { setEditOpen(false); loadTask(); }}
      />

      <AddExternalLinkModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onSubmit={handleAddLink}
        contextLabel={`المهمة: ${task.title}`}
      />

      {/* لمسات المساحة (twk-*) فوق وصفة ssp2/cpk المشتركة */}
      <style>{`
        .twk-priority-chip {
          font-size: 11px;
          font-weight: 700;
          border: 1px solid;
          border-radius: 999px;
          padding: 2px 10px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .twk-status-wrap { position: relative; }
        .twk-status-btn { font-weight: 700; }
        .twk-overlay { position: fixed; inset: 0; z-index: 90; }
        .twk-status-menu {
          position: absolute;
          top: calc(100% + 4px);
          inset-inline-end: 0;
          z-index: 100;
          min-width: 190px;
          background: var(--dashboard-card, #fff);
          border: 1px solid var(--color-border, #e5e5e5);
          border-radius: 10px;
          box-shadow: 0 12px 34px rgba(0,0,0,0.14);
          padding: 4px;
          display: flex;
          flex-direction: column;
        }
        .twk-status-option {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 10px;
          background: none;
          border: none;
          border-radius: 7px;
          font-size: 12.5px;
          cursor: pointer;
          text-align: right;
          color: var(--color-text, #1a1a1a);
        }
        .twk-status-option:hover { background: var(--color-surface-subtle, #f4f5f7); }

        /* أشرطة الحالة — شرائح رفيعة ملتصقة أعلى العمود الأوسط */
        .twk-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          font-size: 12.5px;
          border-bottom: 1px solid var(--color-border, #e8e8e8);
        }
        .twk-bar__text { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
        .twk-bar__text b { font-size: 12.5px; }
        .twk-bar__text small { font-size: 11px; opacity: 0.75; }
        .twk-bar__actions { display: flex; gap: 6px; flex-shrink: 0; }
        .twk-bar--hold { background: rgba(249,115,22,0.07); color: #c2570b; }
        .twk-bar--pending { background: rgba(139,92,246,0.07); color: #6d4fc4; }
        .twk-bar--approved { background: rgba(16,185,129,0.07); color: #0b7a5c; }
        .twk-bar--rejected { background: rgba(239,68,68,0.07); color: #c0392b; }
        .twk-btn-danger { color: #ef4444; border-color: rgba(239,68,68,0.4); }

        /* المهام الفرعية داخل البلوك الملتصق — تسطيح بطاقة المكوّن */
        /* المهام الفرعية الملتصقة: الغلاف بلا padding (cpk-tasks يوفّره) — التسطيح داخل المكوّن (dense) */
        .twk-subtasks .subtasks-list { padding: 0; }

        /* أقسام العمود الجانبي أكورديون — ملتصقة، رأس <button> قابل للنقر يفتح/يغلق */
        .twk-acc {
          border-bottom: 1px solid var(--color-border, #e5e5e5);
          flex-shrink: 0;
        }
        .twk-acc:last-child { border-bottom: none; }
        .twk-acc__head {
          width: 100%;
          cursor: pointer;
          font-family: inherit;
          text-align: inherit;
          appearance: none;
          border: none;
          border-bottom: 1px solid var(--color-border, #e5e5e5);
          transition: background 0.12s ease;
        }
        .twk-acc__head:hover { background: var(--quiet-gray-100, #eceef1); }
        /* القسم المغلق: أزل حدّ الرأس السفلي كي لا يزدوج مع حدّ القسم */
        .twk-acc:not(.twk-acc--open) .twk-acc__head { border-bottom: none; }
        .twk-acc__chev {
          color: var(--color-text-secondary, #999);
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }
        .twk-acc--open .twk-acc__chev { transform: rotate(180deg); }
        .twk-acc__body { min-width: 0; }

        /* عمود التفاصيل: بلوكات مدمجة وقوائم قيم */
        .twk-kvlist { display: flex; flex-direction: column; }
        .twk-kv {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 7px 14px;
          font-size: 12px;
          border-bottom: 1px dashed var(--color-border, #ececec);
        }
        .twk-kv:last-child { border-bottom: none; }
        .twk-kv__label { color: var(--color-text-secondary, #777); }
        .twk-sideblock { padding: 10px 14px; }

        .twk-attach-warn {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: #c0392b;
          background: rgba(239,68,68,0.07);
          border-radius: 7px;
          padding: 6px 9px;
          margin: 0 0 8px;
        }
        .twk-docs { display: flex; flex-direction: column; gap: 4px; }
        .twk-doc { display: flex; align-items: center; gap: 4px; }
        .twk-doc__open {
          display: flex;
          align-items: center;
          gap: 7px;
          flex: 1;
          min-width: 0;
          padding: 6px 8px;
          background: var(--color-surface-subtle, #f7f8f9);
          border: 1px solid var(--color-border, #ececec);
          border-radius: 7px;
          font-size: 12px;
          color: var(--color-text, #222);
          cursor: pointer;
          text-align: right;
          text-decoration: none;
        }
        .twk-doc__open > span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .twk-doc__open:hover { border-color: var(--law-navy, #0A192F); }
        /* صفّ الرابط الخارجي: سطران — العنوان، ثم رقاقة «رابط خارجي» والنطاق (بلا حجم؛ لا ملف له) */
        .twk-doc__open--link { align-items: flex-start; }
        .twk-doc__open--link > svg:first-child { margin-top: 2px; flex-shrink: 0; }
        .twk-doc__main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .twk-doc__title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .twk-doc__sub { display: flex; align-items: center; gap: 5px; min-width: 0; }
        .twk-doc__chip {
          flex-shrink: 0;
          padding: 0 5px;
          font-size: 10px;
          line-height: 15px;
          border: 1px solid var(--color-border, #ececec);
          border-radius: 3px;
          background: var(--color-surface, #fff);
          color: var(--color-text-secondary, #777);
        }
        /* صفّ رابطٍ لم يجتز حارس العرض: نصٌّ محض بلون تحذير، لا مؤشّر نقر ولا تفاعل */
        .twk-doc__open--invalid {
          cursor: default;
          border-color: var(--color-warning, #f4a259);
          background: var(--color-warning-soft, rgba(244,162,89,0.15));
          color: var(--color-text-secondary, #777);
        }
        .twk-doc__open--invalid:hover { border-color: var(--color-warning, #f4a259); }
        .twk-doc__chip--warn {
          border-color: var(--color-warning, #f4a259);
          color: var(--color-warning, #f4a259);
          background: transparent;
        }
        .twk-doc__host {
          font-size: 10.5px;
          color: var(--color-text-secondary, #777);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .twk-doc__del {
          background: none;
          border: none;
          color: var(--color-text-secondary, #999);
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
        }
        .twk-doc__del:hover { color: #ef4444; background: rgba(239,68,68,0.08); }
        .twk-upload-btn { width: 100%; justify-content: center; margin-top: 8px; }
        /* الزرّان معاً: العمود ضيّق فيتراصّان رأسياً بعرضٍ كامل بدل أن يُقصّ نصّهما */
        .twk-doc-actions { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
        .twk-doc-actions .twk-upload-btn { margin-top: 0; }

        .twk-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: var(--color-surface-subtle, #f7f8f9);
          border: 1px solid var(--color-border, #ececec);
          border-radius: 8px;
          font-size: 12.5px;
          color: var(--color-text, #222);
          text-decoration: none;
        }
        .twk-link span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .twk-link:hover { border-color: var(--law-navy, #0A192F); }
      `}</style>
    </div>
  );
};

export default TaskDetail;
