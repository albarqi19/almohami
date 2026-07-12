import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Link2,
  Zap,
  Pencil,
  Check,
  X,
  User,
  Users,
  Building,
  Scale,
  AlignRight,
  StickyNote,
  Star,
  ChevronRight,
  ChevronsLeft,
  ListChecks,
  MessagesSquare,
  Hammer,
  Swords,
  Banknote,
  PanelLeft,
} from 'lucide-react';
import type { AiClassificationStatus, Case, CaseAiClassification, CasePrepTask } from '../types';
import { apiClient } from '../utils/api';
import CaseTeamChat from './CaseTeamChat';
import CaseClassificationCard from './CaseClassificationCard';
import CourtFeesCalculator from './CourtFeesCalculator';

/**
 * غرفة تجهيز القضية — مساحة عمل ERP بملء الشاشة بنمط الخدمة المبسطة حرفياً:
 * ترويسة مدمجة (عنوان + دورة الحياة + الحقائق)، ثم ثلاثة أعمدة ملتصقة بلا
 * فراغات: [محادثة الفريق — يمين، قابلة للطي] [بيانات القضية + مهام التجهيز]
 * [التصنيف الذكي + التكاليف — يسار، قابل للطي]. لا تمرير خارجي — كل عمود
 * يتمرر داخلياً، وطي أي جانب يمدد الوسط تلقائياً.
 */
interface CasePrepKitchenProps {
  caseData: Case;
  onActivate: (filingDate?: string) => void;
  onLinkNajiz: () => void;
  onRefresh: () => void;
  onEditCase: () => void;
}

const PREP_STAGES = [
  { key: 'draft',       label: 'مسودة' },
  { key: 'preparation', label: 'جاري التجهيز' },
  { key: 'filed',       label: 'تم الرفع' },
  { key: 'active',      label: 'نشطة' },
];

const CasePrepKitchen: React.FC<CasePrepKitchenProps> = ({
  caseData,
  onActivate,
  onLinkNajiz,
  onRefresh,
  onEditCase,
}) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<CasePrepTask[]>(caseData.prep_tasks ?? []);
  const [progress, setProgress] = useState(caseData.preparation_progress ?? 0);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [statusChanging, setStatusChanging] = useState(false);
  const [activating, setActivating] = useState(false);
  const [filingDate, setFilingDate] = useState('');
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  /* طيّ الأعمدة الجانبية — يبقى عبر الجلسات، وطيّ أيّها يمدد الوسط */
  const [chatCollapsed, setChatCollapsed] = useState(() => localStorage.getItem('cpk_chat_collapsed') === '1');
  const toggleChatCollapsed = () =>
    setChatCollapsed((v) => { localStorage.setItem('cpk_chat_collapsed', v ? '0' : '1'); return !v; });

  const [sideCollapsed, setSideCollapsed] = useState(() => localStorage.getItem('cpk_side_collapsed') === '1');
  const toggleSideCollapsed = () =>
    setSideCollapsed((v) => { localStorage.setItem('cpk_side_collapsed', v ? '0' : '1'); return !v; });

  /* حالة التصنيف/التقدير الحية — بطاقة التصنيف تستطلع الباك وتبثّ هنا
     ليتحدث شريط تقدير التكاليف في نفس اللحظة بلا تحديث للصفحة */
  const [liveClfStatus, setLiveClfStatus] = useState<AiClassificationStatus | null>(caseData.ai_classification_status ?? null);
  const [liveClf, setLiveClf] = useState<CaseAiClassification | null>(caseData.ai_classification ?? null);

  useEffect(() => {
    setTasks(caseData.prep_tasks ?? []);
    setProgress(caseData.preparation_progress ?? 0);
  }, [caseData.prep_tasks, caseData.preparation_progress]);

  useEffect(() => {
    setLiveClfStatus(caseData.ai_classification_status ?? null);
    setLiveClf(caseData.ai_classification ?? null);
  }, [caseData.ai_classification_status, caseData.ai_classification]);

  const recalcProgress = (updated: CasePrepTask[]) => {
    if (!updated.length) return 0;
    return Math.round((updated.filter(t => t.is_completed).length / updated.length) * 100);
  };

  const handleToggle = async (task: CasePrepTask) => {
    setLoadingIds(prev => new Set(prev).add(task.id));
    try {
      const res: any = await apiClient.patch(`/cases/${caseData.id}/prep-tasks/${task.id}/toggle`);
      const updated = tasks.map(t => t.id === task.id ? res.data : t);
      setTasks(updated);
      setProgress(res.progress ?? recalcProgress(updated));
    } catch {
      // silent
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(task.id); return s; });
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      const res: any = await apiClient.post(`/cases/${caseData.id}/prep-tasks`, { title: newTaskTitle.trim() });
      const updated = [...tasks, res.data];
      setTasks(updated);
      setProgress(recalcProgress(updated));
      setNewTaskTitle('');
      setAddingTask(false);
    } catch {
      // silent
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    setLoadingIds(prev => new Set(prev).add(taskId));
    try {
      await apiClient.delete(`/cases/${caseData.id}/prep-tasks/${taskId}`);
      const updated = tasks.filter(t => t.id !== taskId);
      setTasks(updated);
      setProgress(recalcProgress(updated));
    } catch {
      // silent
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(taskId); return s; });
    }
  };

  const startEdit = (task: CasePrepTask) => {
    setEditingId(task.id);
    setEditingTitle(task.title);
  };

  const handleSaveEdit = async (taskId: number) => {
    if (!editingTitle.trim()) return;
    try {
      const res: any = await apiClient.put(`/cases/${caseData.id}/prep-tasks/${taskId}`, { title: editingTitle.trim() });
      setTasks(tasks.map(t => t.id === taskId ? res.data : t));
    } catch {
      // silent
    } finally {
      setEditingId(null);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === caseData.status) return;
    if (newStatus === 'active') { setShowActivateConfirm(true); return; }
    setStatusChanging(true);
    try {
      await apiClient.patch(`/cases/${caseData.id}/prep-status`, { status: newStatus });
      onRefresh();
    } catch {
      // silent
    } finally {
      setStatusChanging(false);
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      await apiClient.post(`/cases/${caseData.id}/activate`, filingDate ? { filing_date: filingDate } : {});
      onActivate(filingDate || undefined);
    } catch {
      // silent
    } finally {
      setActivating(false);
      setShowActivateConfirm(false);
    }
  };

  const currentStageIndex = PREP_STAGES.findIndex(s => s.key === caseData.status);
  const lawyers = caseData.lawyers ?? [];
  const tasksDone = tasks.filter(t => t.is_completed).length;

  return (
    <div className="ssp2-page cpk-page" dir="rtl">

      {/* ── الترويسة: العنوان والإجراءات + دورة الحياة + صف الحقائق ── */}
      <header className="ssp2-header">
        <div className="ssp2-header__top">
          <div className="ssp2-header__info">
            <button className="ssp2-icon-btn" onClick={() => navigate('/cases')} title="عودة للقضايا">
              <ChevronRight size={17} />
            </button>
            <span className="ssp2-header__badge"><Hammer size={13} /> غرفة التجهيز</span>
            <h1 className="ssp2-header__title">{caseData.title}</h1>
            <span className="ssp2-header__number">{caseData.file_number}</span>
            <span className="ssp2-header__client">
              <User size={13} /> {caseData.client_name || '—'}
            </span>
          </div>
          <div className="ssp2-header__actions">
            {/* دورة الحياة — شرائح مدمجة في الترويسة: مسودة → تجهيز → رفع → نشطة */}
            <div className="cpk-seg" role="tablist" aria-label="حالة التجهيز">
              {PREP_STAGES.map((stage, i) => {
                const isDone = i < currentStageIndex;
                const isCurrent = i === currentStageIndex;
                return (
                  <button
                    key={stage.key}
                    className={`cpk-seg__btn${isCurrent ? ' is-current' : ''}${isDone ? ' is-done' : ''}`}
                    onClick={() => handleStatusChange(stage.key)}
                    disabled={statusChanging}
                    title={stage.key === 'active' ? 'تفعيل القضية (بتأكيد)' : `الانتقال إلى «${stage.label}»`}
                  >
                    {isDone && <Check size={11} strokeWidth={3} />}
                    {stage.label}
                  </button>
                );
              })}
            </div>

            {caseData.status === 'filed' && (
              <button className="ssp2-btn" onClick={onLinkNajiz} title="ربط القضية بقضيتها في ناجز">
                <Link2 size={14} /> ربط بناجز
              </button>
            )}
            <button className="ssp2-btn" onClick={onEditCase}>
              <Pencil size={14} /> تعديل البيانات
            </button>
            <button className="ssp2-btn ssp2-btn--success" onClick={() => setShowActivateConfirm(true)}>
              <Zap size={14} /> تفعيل القضية
            </button>
            <button
              className="ssp2-icon-btn"
              onClick={toggleSideCollapsed}
              title={sideCollapsed ? 'فتح عمود التصنيف والتكاليف' : 'طيّ عمود التصنيف والتكاليف'}
            >
              <PanelLeft size={16} />
            </button>
          </div>
        </div>

        <div className="ssp2-header__facts">
          <span className="ssp2-fact cpk-progressfact">
            <span className="cpk-progressbar"><span style={{ width: `${progress}%` }} /></span>
            <b>{progress}%</b>
            <span className="ssp2-fact__label">من التجهيز ({tasksDone}/{tasks.length})</span>
          </span>
          <span className="ssp2-fact__sep" />
          <span className="ssp2-fact">
            <Scale size={13} />
            <span className="ssp2-fact__label">النوع</span>
            <b>{caseData.case_type_arabic || caseData.case_type || '—'}</b>
          </span>
          <span className="ssp2-fact__sep" />
          <span className="ssp2-fact">
            <Building size={13} />
            <span className="ssp2-fact__label">المحكمة</span>
            <b>{caseData.court || 'لم تحدد'}</b>
          </span>
          <span className="ssp2-fact__sep" />
          <span className="ssp2-fact">
            <Swords size={13} />
            <span className="ssp2-fact__label">الخصم</span>
            <b>{caseData.opponent_name || '—'}</b>
          </span>
          {caseData.contract_value ? (
            <>
              <span className="ssp2-fact__sep" />
              <span className="ssp2-fact">
                <Banknote size={13} />
                <span className="ssp2-fact__label">قيمة المطالبة</span>
                <b>{Number(caseData.contract_value).toLocaleString('ar-SA')} ريال</b>
              </span>
            </>
          ) : null}
        </div>
      </header>

      {/* ── ثلاثة أعمدة ملتصقة بملء الشاشة: [محادثة — يمين] [بيانات + مهام] [تصنيف + تكاليف — يسار] ── */}
      <div className="ssp2-layout">

        {/* عمود المحادثة — متصل بالحواف، قابل للطيّ إلى شريط رفيع */}
        <aside className={`ssp2-chatcol${chatCollapsed ? ' ssp2-chatcol--min' : ''}`}>
          {chatCollapsed ? (
            <button className="ssp2-chatcol__reopen" onClick={toggleChatCollapsed} title="فتح محادثة الفريق">
              <MessagesSquare size={17} />
              <span>محادثة الفريق</span>
            </button>
          ) : (
            <CaseTeamChat caseId={Number(caseData.id)} onCollapse={toggleChatCollapsed} onCaseMutated={onRefresh} />
          )}
        </aside>

        {/* مساحة العمل الوسطى: بيانات القضية ثم مهام التجهيز — بلوكات مدمجة */}
        <main className="ssp2-work">
          <div className="cpk-work__scroll">

            {/* بيانات القضية: الوصف والملاحظات وفريق المحامين */}
            <section className="ssp2-card cpk-block">
              <div className="ssp2-card__head">
                <span className="ssp2-card__title"><AlignRight size={15} /> بيانات القضية</span>
                <span className="ssp2-card__headtools">
                  <button className="ssp2-icon-btn" onClick={onEditCase} title="تعديل بيانات القضية">
                    <Pencil size={14} />
                  </button>
                </span>
              </div>

              <div className="cpk-info">
                <div className="cpk-longfields">
                  <div className="cpk-longfield">
                    <span className="cpk-longfield__label"><AlignRight size={12} /> وصف القضية</span>
                    <p className="cpk-longfield__text">
                      {caseData.description?.trim() || <span className="cpk-empty">لا وصف بعد — أضفه من «تعديل البيانات» ليستفيد منه التصنيف الذكي ورائد.</span>}
                    </p>
                  </div>
                  <div className="cpk-longfield">
                    <span className="cpk-longfield__label"><StickyNote size={12} /> الملاحظات</span>
                    <p className="cpk-longfield__text">
                      {caseData.notes?.trim() || <span className="cpk-empty">لا ملاحظات.</span>}
                    </p>
                  </div>
                </div>

                <div className="cpk-lawyers">
                  <span className="cpk-longfield__label"><Users size={12} /> فريق القضية</span>
                  <div className="cpk-lawyers__chips">
                    {lawyers.length === 0 ? (
                      <span className="cpk-empty">لم يُسند محامون بعد.</span>
                    ) : (
                      lawyers.map((l: any) => {
                        const isPrimary = Boolean(l?.pivot?.is_primary);
                        return (
                          <span key={l.id} className={`cpk-lawyer-chip${isPrimary ? ' cpk-lawyer-chip--primary' : ''}`}>
                            {isPrimary && <Star size={11} />}
                            {l.name}
                            {isPrimary && <span className="cpk-lawyer-chip__role">مسؤول</span>}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* قائمة مهام التجهيز — تملأ الباقي وتتمرر داخلياً */}
            <section className="ssp2-card cpk-block cpk-block--tasks">
              <div className="ssp2-card__head">
                <span className="ssp2-card__title"><ListChecks size={15} /> قائمة التجهيز</span>
                <span className="ssp2-card__headtools">
                  <span className="ssp2-card__meta">{tasksDone}/{tasks.length}</span>
                </span>
              </div>

              <div className="cpk-tasks">
                {tasks.map(task => {
                  const isLoading = loadingIds.has(task.id);
                  const isEditing = editingId === task.id;
                  return (
                    <div key={task.id} className={`prep-task ${task.is_completed ? 'prep-task--done' : ''}`}>
                      <button
                        className="prep-task__check"
                        onClick={() => handleToggle(task)}
                        disabled={isLoading}
                      >
                        {task.is_completed
                          ? <CheckCircle2 size={20} className="prep-task__check-icon prep-task__check-icon--done" />
                          : <Circle size={20} className="prep-task__check-icon" />
                        }
                      </button>

                      <div className="prep-task__body">
                        {isEditing ? (
                          <div className="prep-task__edit-row">
                            <input
                              autoFocus
                              className="prep-task__edit-input"
                              value={editingTitle}
                              onChange={e => setEditingTitle(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveEdit(task.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                            />
                            <button className="prep-task__edit-save" onClick={() => handleSaveEdit(task.id)}><Check size={14} /></button>
                            <button className="prep-task__edit-cancel" onClick={() => setEditingId(null)}><X size={14} /></button>
                          </div>
                        ) : (
                          <span
                            className="prep-task__title"
                            onDoubleClick={() => startEdit(task)}
                            title="انقر مرتين للتعديل"
                          >
                            {task.title}
                          </span>
                        )}
                        {task.is_completed && task.completed_by_user && (
                          <span className="prep-task__meta">
                            {task.completed_by_user.name} · {task.completed_at ? new Date(task.completed_at).toLocaleDateString('ar-SA') : ''}
                          </span>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="prep-task__actions">
                          <button className="prep-task__action-btn" onClick={() => startEdit(task)} title="تعديل">
                            <Pencil size={13} />
                          </button>
                          <button
                            className="prep-task__action-btn prep-task__action-btn--danger"
                            onClick={() => handleDeleteTask(task.id)}
                            disabled={isLoading}
                            title="حذف"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {addingTask ? (
                  <div className="prep-task prep-task--new">
                    <Circle size={20} className="prep-task__check-icon" style={{ opacity: 0.3 }} />
                    <input
                      ref={newTaskInputRef}
                      autoFocus
                      className="prep-task__new-input"
                      placeholder="اكتب عنوان المهمة..."
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddTask();
                        if (e.key === 'Escape') { setAddingTask(false); setNewTaskTitle(''); }
                      }}
                    />
                    <div className="prep-task__actions">
                      <button className="prep-task__edit-save" onClick={handleAddTask}><Check size={14} /></button>
                      <button className="prep-task__edit-cancel" onClick={() => { setAddingTask(false); setNewTaskTitle(''); }}><X size={14} /></button>
                    </div>
                  </div>
                ) : (
                  <button className="prep-add-task-btn" onClick={() => setAddingTask(true)}>
                    <Plus size={14} />
                    إضافة مهمة
                  </button>
                )}
              </div>
            </section>
          </div>
        </main>

        {/* عمود التصنيف والتكاليف — أقصى اليسار، متصل وقابل للطيّ إلى شريط رفيع */}
        <aside className={`cpk-sidecol${sideCollapsed ? ' cpk-sidecol--min' : ''}`}>
          {sideCollapsed ? (
            <button className="ssp2-chatcol__reopen" onClick={toggleSideCollapsed} title="فتح التصنيف والتكاليف">
              <Scale size={17} />
              <span>التصنيف والتكاليف</span>
            </button>
          ) : (
            <>
              <div className="ssp2-card__head cpk-sidecol__head">
                <span className="ssp2-card__title"><Scale size={15} /> التصنيف والتكاليف</span>
                <span className="ssp2-card__headtools">
                  <button className="ssp2-icon-btn" onClick={toggleSideCollapsed} title="طيّ العمود">
                    <ChevronsLeft size={15} />
                  </button>
                </span>
              </div>
              <div className="cpk-sidecol__scroll">
                <CaseClassificationCard
                  caseId={Number(caseData.id)}
                  initialStatus={caseData.ai_classification_status}
                  initialClassification={caseData.ai_classification}
                  onUpdate={(s, c) => { setLiveClfStatus(s); setLiveClf(c); }}
                />
                {/* التكاليف القضائية تخص محاكم ناجز فقط — تُخفى للجهات خارجه
                    (ديوان المظالم/اللجان) إذ لكلٍّ رسومه الخاصة */}
                {liveClfStatus !== 'skipped' && (
                  <CourtFeesCalculator
                    aiStatus={liveClfStatus}
                    aiEstimate={liveClf?.fee_estimate ?? null}
                  />
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ===== تأكيد التفعيل ===== */}
      {showActivateConfirm && (
        <div className="prep-confirm-overlay" onClick={() => setShowActivateConfirm(false)}>
          <div className="prep-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="prep-confirm-modal__title">
              <Zap size={18} />
              تفعيل القضية
            </div>
            <p className="prep-confirm-modal__body">
              ستتحول القضية إلى الوضع <strong>نشطة</strong> وستظهر صفحتها الكاملة.
              {progress < 100 && (
                <span className="prep-confirm-modal__warning">
                  تنبيه: {tasks.filter(t => !t.is_completed).length} مهمة لم تكتمل بعد.
                </span>
              )}
            </p>
            <div className="prep-confirm-modal__date">
              <label>تاريخ القيد (اختياري)</label>
              <input type="date" value={filingDate} onChange={e => setFilingDate(e.target.value)} className="prep-confirm-modal__date-input" />
            </div>
            <div className="prep-confirm-modal__actions">
              <button className="prep-btn prep-btn--activate" onClick={handleActivate} disabled={activating}>
                {activating ? 'جاري التفعيل...' : 'تفعيل الآن'}
              </button>
              <button className="prep-btn prep-btn--cancel" onClick={() => setShowActivateConfirm(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CasePrepKitchen;
