import React, { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, ChevronDown, ChevronUp, Circle, Clock, LayoutGrid, List, Loader2, Lock, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { PhaseInput, ProjectTaskInput } from '../../../services/projectService';
import type { ProjectPhase, ProjectTask } from '../../../types/projects';
import { PHASE_STATUS_LABELS, PROJECT_ROLE_LABELS } from '../../../types/projects';
import { Chip, ErrorBox, Field, Modal, UserSelect, daysFromToday, fmtDate, num } from '../ui';
import { useRoom } from './RoomContext';

type View = 'list' | 'board';

/** المراحل والمهام: كل مرحلة صندوق يُطوى، فيه مهامها الحقيقية؛ أو لوحة أعمدة بالمرحلة. */
const PhasesSection: React.FC = () => {
  const { project, canEdit, canApprove, refresh, openTask } = useRoom();
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [view, setView] = useState<View>(() => (localStorage.getItem('prj_phases_view') as View) || 'list');
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [phaseModal, setPhaseModal] = useState<{ phase: ProjectPhase | null } | null>(null);
  const [taskModal, setTaskModal] = useState<{ phaseId: number | null } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [approveModal, setApproveModal] = useState<ProjectPhase | null>(null);

  const load = async () => {
    try { setTasks(await ProjectService.tasks(project.id)); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر جلب المهام'); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id, project.updated_at]);
  useEffect(() => {
    // افتح الجارية افتراضياً
    setOpen((o) => {
      const next = { ...o };
      project.phases.forEach((p) => { if (next[p.id] === undefined) next[p.id] = p.status === 'active' || p.status === 'awaiting_approval'; });
      return next;
    });
  }, [project.phases]);

  const byPhase = useMemo(() => {
    const m = new Map<number | null, ProjectTask[]>();
    tasks.forEach((t) => { const k = t.phase_id ?? null; if (!m.has(k)) m.set(k, []); m.get(k)!.push(t); });
    m.forEach((list) => list.sort((a, b) => (a.project_order ?? 0) - (b.project_order ?? 0) || (a.due_date ?? '').localeCompare(b.due_date ?? '')));
    return m;
  }, [tasks]);

  const switchView = (v: View) => { setView(v); localStorage.setItem('prj_phases_view', v); };

  const complete = async (p: ProjectPhase) => {
    setBusy(`complete-${p.id}`);
    try { const r = await ProjectService.completePhase(project.id, p.id); toast.success(r.message || 'تم'); await refresh(); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر إكمال المرحلة'); }
    finally { setBusy(null); }
  };

  const approve = async (p: ProjectPhase, ok: boolean, reason?: string) => {
    setBusy(`approve-${p.id}`);
    try { const r = await ProjectService.approvePhase(project.id, p.id, ok, reason); toast.success(r.message || 'تم'); setApproveModal(null); await refresh(); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر تسجيل القرار'); }
    finally { setBusy(null); }
  };

  const activate = async (p: ProjectPhase) => {
    setBusy(`activate-${p.id}`);
    try { await ProjectService.updatePhase(project.id, p.id, { status: 'active' }); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر تفعيل المرحلة'); }
    finally { setBusy(null); }
  };

  const removePhase = async (p: ProjectPhase) => {
    if (!window.confirm(`حذف المرحلة «${p.name}»؟ مهامها تبقى في المشروع بلا مرحلة.`)) return;
    try { await ProjectService.deletePhase(project.id, p.id); setPhaseModal(null); await refresh(); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); }
  };

  const savePhase = async (data: PhaseInput & { name: string }) => {
    try {
      if (phaseModal?.phase) await ProjectService.updatePhase(project.id, phaseModal.phase.id, data);
      else await ProjectService.createPhase(project.id, data);
      setPhaseModal(null);
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحفظ'); }
  };

  const saveTask = async (data: ProjectTaskInput) => {
    try {
      await ProjectService.createTask(project.id, data);
      setTaskModal(null);
      toast.success('أُضيفت المهمة');
      await load();
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر إضافة المهمة'); }
  };

  const renderTask = (t: ProjectTask) => {
    const done = t.status === 'completed';
    const due = daysFromToday(t.due_date);
    return (
      <div key={t.id} className={`prj-task ${done ? 'prj-task--completed' : ''}`} onClick={() => openTask(t.id)}>
        <span className="prj-task__check">{done ? <CheckCircle2 size={15} /> : t.status === 'in_progress' ? <Clock size={15} /> : !t.is_ready ? <Lock size={14} /> : <Circle size={15} />}</span>
        <div className="prj-task__title">
          <span>{t.title}</span>
          {t.client_action && <Chip tone="gold">مطلوب من العميل</Chip>}
          {t.requires_approval && <Chip tone="muted"><ShieldCheck size={10} /> باعتماد</Chip>}
          {t.status === 'pending_approval' && <Chip tone="warn">ينتظر الاعتماد</Chip>}
          {t.status === 'on_hold' && <Chip tone="warn">موقوفة</Chip>}
          {t.cycle_session_id && <Chip tone="purple">دورة جلسة</Chip>}
          {!done && !t.is_ready && t.predecessors.length > 0 && <span className="prj-task__pred">بعد: {t.predecessors.filter((p) => p.status !== 'completed').map((p) => p.title).join('، ')}</span>}
        </div>
        <span className="prj-task__meta">
          {t.assignee && <span>{t.assignee.name}</span>}
          {t.role_label && !t.assignee && <span className="prj-muted">{t.role_label}</span>}
          {t.due_date && <span className={t.is_late ? 'prj-task__late' : ''}>{fmtDate(t.due_date)}{due && !done ? ` · ${due.label}` : ''}</span>}
          {t.subtasks_total > 0 && <span>{t.subtasks_completed}/{t.subtasks_total}</span>}
          {t.successors_count > 0 && <span title="مهام تنتظرها">↦ {t.successors_count}</span>}
        </span>
      </div>
    );
  };

  const orphan = byPhase.get(null) ?? [];

  return (
    <div>
      <div className="prj-main__tools" style={{ marginBottom: 10, justifyContent: 'flex-start' }}>
        <div className="tasks-view-switcher">
          <button type="button" className={`tasks-view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => switchView('list')}><List size={13} /> قائمة</button>
          <button type="button" className={`tasks-view-btn ${view === 'board' ? 'active' : ''}`} onClick={() => switchView('board')}><LayoutGrid size={13} /> لوحة</button>
        </div>
        {canEdit && <>
          <button type="button" className="ssp2-btn" onClick={() => setPhaseModal({ phase: null })}><Plus size={13} /> مرحلة</button>
          <button type="button" className="ssp2-btn ssp2-btn--primary" onClick={() => setTaskModal({ phaseId: project.phases.find((p) => p.status === 'active')?.id ?? null })}><Plus size={13} /> مهمة</button>
        </>}
        <span className="prj-muted" style={{ marginInlineStart: 'auto' }}>{tasks.filter((t) => t.status === 'completed').length}/{tasks.length} مهمة مكتملة</span>
      </div>

      {project.phases.length === 0 && <div className="ssp2-empty">لا مراحل بعد. أضف مرحلة أو طبق قالباً من قائمة الإجراءات في الأعلى.</div>}

      {view === 'board' ? (
        <div className="prj-board">
          {project.phases.filter((p) => p.status !== 'skipped').map((p) => (
            <div key={p.id} className="prj-board__col">
              <div className="prj-board__head">{p.order}. {p.name} <Chip tone={p.status === 'active' ? 'navy' : p.status === 'completed' ? 'done' : 'muted'}>{PHASE_STATUS_LABELS[p.status]}</Chip><span className="prj-muted" style={{ marginInlineStart: 'auto' }}>{p.tasks_done}/{p.tasks_total}</span></div>
              <div className="prj-board__cards">
                {(byPhase.get(p.id) ?? []).map((t) => (
                  <div key={t.id} className="prj-card-task" onClick={() => openTask(t.id)}>
                    <div className="prj-card-task__title" style={t.status === 'completed' ? { textDecoration: 'line-through', color: 'var(--color-text-secondary)' } : undefined}>{t.title}</div>
                    <div className="prj-card-task__meta">
                      {t.assignee && <span>{t.assignee.name}</span>}
                      {t.due_date && <span className={t.is_late ? 'prj-task__late' : ''}>{fmtDate(t.due_date)}</span>}
                      {!t.is_ready && t.status !== 'completed' && <span className="prj-task__blocked">تنتظر مهمة قبلها</span>}
                      {t.client_action && <span>مطلوب من العميل</span>}
                    </div>
                  </div>
                ))}
                {canEdit && <button type="button" className="ssp2-btn" style={{ fontSize: 11.5, padding: '4px 8px' }} onClick={() => setTaskModal({ phaseId: p.id })}><Plus size={11} /> مهمة</button>}
              </div>
            </div>
          ))}
          {orphan.length > 0 && (
            <div className="prj-board__col"><div className="prj-board__head">بلا مرحلة</div><div className="prj-board__cards">{orphan.map((t) => <div key={t.id} className="prj-card-task" onClick={() => openTask(t.id)}><div className="prj-card-task__title">{t.title}</div></div>)}</div></div>
          )}
        </div>
      ) : (
        <>
          {project.phases.map((p) => {
            const list = byPhase.get(p.id) ?? [];
            const isOpen = open[p.id];
            const due = daysFromToday(p.due_date);
            const late = p.status === 'active' && due && due.days < 0;
            const canComplete = canEdit && p.status === 'active';
            return (
              <div key={p.id} className={`prj-phase prj-phase--${p.status}`}>
                <div className="prj-phase__head" onClick={() => setOpen({ ...open, [p.id]: !isOpen })}>
                  <span className="prj-phase__order">{p.order}</span>
                  <span className="prj-phase__name">{p.name}</span>
                  <Chip tone={p.status === 'active' ? 'navy' : p.status === 'completed' ? 'done' : p.status === 'awaiting_approval' ? 'warn' : 'muted'}>{PHASE_STATUS_LABELS[p.status]}</Chip>
                  {p.requires_approval && <Chip tone="muted" title={p.approver ? `الموافق: ${p.approver.name}` : undefined}><ShieldCheck size={10} /> بموافقة</Chip>}
                  {p.session_cycle && <Chip tone="purple">دورة جلسة</Chip>}
                  {p.client_visible && <Chip tone="muted">يظهر للعميل</Chip>}
                  <span className="prj-phase__meta">
                    {p.owner && <span>{p.owner.name}</span>}
                    <span className={late ? 'prj-task__late' : ''}>{fmtDate(p.start_date)} → {fmtDate(p.due_date)}{late ? ' · متأخرة' : ''}</span>
                    <span>{p.tasks_done}/{p.tasks_total} مهام{p.tasks_late ? ` · ${p.tasks_late} متأخرة` : ''}</span>
                    {(p.estimated_hours || p.hours_actual) ? <span>{num(p.hours_actual)}{p.estimated_hours ? ` / ${num(p.estimated_hours)}` : ''} ساعة</span> : null}
                  </span>
                  <span className="prj-phase__tools" onClick={(e) => e.stopPropagation()}>
                    {p.status === 'awaiting_approval' && canApprove && <button type="button" className="ssp2-btn ssp2-btn--primary" style={{ padding: '3px 9px', fontSize: 11.5 }} onClick={() => setApproveModal(p)}><ShieldCheck size={12} /> قرار الموافقة</button>}
                    {canComplete && <button type="button" className="ssp2-btn" style={{ padding: '3px 9px', fontSize: 11.5 }} disabled={busy === `complete-${p.id}`} onClick={() => complete(p)}>{busy === `complete-${p.id}` ? <Loader2 size={12} className="ssp2-spin" /> : <Check size={12} />} {p.requires_approval ? 'إنهاء وطلب الموافقة' : 'إنهاء المرحلة'}</button>}
                    {canEdit && (p.status === 'upcoming' || p.status === 'hidden') && p.activation !== 'decision' && <button type="button" className="ssp2-btn" style={{ padding: '3px 9px', fontSize: 11.5 }} disabled={busy === `activate-${p.id}`} onClick={() => activate(p)}>ابدأ الآن</button>}
                    {canEdit && <button type="button" className="ssp2-icon-btn" title="تعديل المرحلة" onClick={() => setPhaseModal({ phase: p })}><Pencil size={13} /></button>}
                    <button type="button" className="ssp2-icon-btn">{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                  </span>
                </div>
                {isOpen && (
                  <>
                    {p.objective && <div className="prj-phase__objective">{p.objective}</div>}
                    <div className="prj-phase__body">
                      {list.length === 0 ? <div className="ssp2-empty">لا مهام في هذه المرحلة.</div> : list.map(renderTask)}
                      {canEdit && <div style={{ padding: '6px 12px' }}><button type="button" className="prj-link" onClick={() => setTaskModal({ phaseId: p.id })}>+ مهمة في هذه المرحلة</button></div>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {orphan.length > 0 && (
            <div className="prj-phase"><div className="prj-phase__head"><span className="prj-phase__name">مهام بلا مرحلة</span><span className="prj-phase__meta">{orphan.length}</span></div><div className="prj-phase__body">{orphan.map(renderTask)}</div></div>
          )}
        </>
      )}

      {phaseModal && <PhaseModal phase={phaseModal.phase} onClose={() => setPhaseModal(null)} onSave={savePhase} onDelete={phaseModal.phase ? () => removePhase(phaseModal.phase!) : undefined} />}
      {taskModal && <TaskModal phaseId={taskModal.phaseId} tasks={tasks} onClose={() => setTaskModal(null)} onSave={saveTask} />}
      {approveModal && <ApproveModal phase={approveModal} busy={busy === `approve-${approveModal.id}`} onClose={() => setApproveModal(null)} onDecide={(ok, reason) => approve(approveModal, ok, reason)} />}
    </div>
  );
};

const PhaseModal: React.FC<{ phase: ProjectPhase | null; onClose: () => void; onSave: (d: PhaseInput & { name: string }) => Promise<void>; onDelete?: () => void }> = ({ phase, onClose, onSave, onDelete }) => {
  const { users, project } = useRoom();
  const [f, setF] = useState({
    name: phase?.name ?? '', objective: phase?.objective ?? '', workstream: phase?.workstream ?? (project.settings.workstreams?.[0]?.name ?? ''),
    owner_id: phase?.owner?.id ?? null as number | null, start_date: phase?.start_date ?? '', due_date: phase?.due_date ?? '',
    requires_approval: phase?.requires_approval ?? false, approver_id: phase?.approver?.id ?? null as number | null, client_visible: phase?.client_visible ?? false,
    estimated_hours: phase?.estimated_hours ?? null as number | null, session_cycle: phase?.session_cycle ?? false, status: phase?.status ?? 'upcoming',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.name.trim()) { setErr('اسم المرحلة مطلوب'); return; }
    setBusy(true);
    await onSave({ ...f, name: f.name.trim(), objective: f.objective || null, workstream: f.workstream || null, start_date: f.start_date || null, due_date: f.due_date || null, estimated_hours: f.estimated_hours, status: phase ? f.status : (f.status === 'active' ? 'active' : undefined) });
    setBusy(false);
  };
  return (
    <Modal title={phase ? `تعديل «${phase.name}»` : 'مرحلة جديدة'} onClose={onClose} foot={<>
      {onDelete && <button type="button" className="ssp2-btn" style={{ marginInlineEnd: 'auto', color: 'var(--status-red)' }} onClick={onDelete}><Trash2 size={12} /> حذف</button>}
      <button type="button" className="ssp2-btn" onClick={onClose}>إلغاء</button>
      <button type="button" className="ssp2-btn ssp2-btn--primary" onClick={submit} disabled={busy}>حفظ</button>
    </>}>
      <ErrorBox error={err} />
      <div className="prj-form">
        <Field label="الاسم" full><input className="ssp2-input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <Field label="الهدف" full><textarea className="ssp2-input" rows={2} value={f.objective} onChange={(e) => setF({ ...f, objective: e.target.value })} /></Field>
        <Field label="المسار"><input className="ssp2-input" value={f.workstream} onChange={(e) => setF({ ...f, workstream: e.target.value })} list="prj-ws" /><datalist id="prj-ws">{project.settings.workstreams?.map((w) => <option key={w.key} value={w.name} />)}</datalist></Field>
        <Field label="المسؤول"><UserSelect users={users} value={f.owner_id} onChange={(id) => setF({ ...f, owner_id: id })} /></Field>
        <Field label="من"><input type="date" className="ssp2-input" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
        <Field label="إلى"><input type="date" className="ssp2-input" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
        <Field label="الساعات المقدرة"><input type="number" min={0} className="ssp2-input" value={f.estimated_hours ?? ''} onChange={(e) => setF({ ...f, estimated_hours: e.target.value ? Number(e.target.value) : null })} /></Field>
        <Field label="الحالة"><select className="ssp2-input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ProjectPhase['status'] })}>{Object.entries(PHASE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <label className="prj-check"><input type="checkbox" checked={f.requires_approval} onChange={(e) => setF({ ...f, requires_approval: e.target.checked })} /> إنهاؤها يحتاج موافقة</label>
        {f.requires_approval && <Field label="الموافق"><UserSelect users={users} value={f.approver_id} onChange={(id) => setF({ ...f, approver_id: id })} placeholder="الشريك المسؤول" /></Field>}
        <label className="prj-check"><input type="checkbox" checked={f.client_visible} onChange={(e) => setF({ ...f, client_visible: e.target.checked })} /> تظهر للعميل</label>
        <label className="prj-check"><input type="checkbox" checked={f.session_cycle} onChange={(e) => setF({ ...f, session_cycle: e.target.checked })} /> مرحلة جلسات (تولد دورة الجلسة لكل جلسة جديدة)</label>
      </div>
    </Modal>
  );
};

const TaskModal: React.FC<{ phaseId: number | null; tasks: ProjectTask[]; onClose: () => void; onSave: (d: ProjectTaskInput) => Promise<void> }> = ({ phaseId, tasks, onClose, onSave }) => {
  const { users, project } = useRoom();
  const [f, setF] = useState<ProjectTaskInput>({ title: '', description: '', phase_id: phaseId, assigned_to: null, priority: 'medium', due_date: '', estimated_hours: null, requires_approval: false, client_action: false, client_visible: false, role_hint: null, depends_on: [] });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const candidates = tasks.filter((t) => t.status !== 'completed' && (f.phase_id ? t.phase_id === f.phase_id : true));
  const submit = async () => {
    if (!f.title.trim()) { setErr('عنوان المهمة مطلوب'); return; }
    setBusy(true);
    await onSave({ ...f, title: f.title.trim(), description: f.description || undefined, due_date: f.due_date || undefined, phase_id: f.phase_id || null });
    setBusy(false);
  };
  return (
    <Modal title="مهمة جديدة في المشروع" onClose={onClose} foot={<><button type="button" className="ssp2-btn" onClick={onClose}>إلغاء</button><button type="button" className="ssp2-btn ssp2-btn--primary" onClick={submit} disabled={busy}>إضافة</button></>}>
      <ErrorBox error={err} />
      <div className="prj-form">
        <Field label="العنوان" full><input className="ssp2-input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></Field>
        <Field label="الوصف" full><textarea className="ssp2-input" rows={2} value={f.description ?? ''} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="المرحلة"><select className="ssp2-input" value={f.phase_id ?? ''} onChange={(e) => setF({ ...f, phase_id: e.target.value ? Number(e.target.value) : null, depends_on: [] })}><option value="">— بلا —</option>{project.phases.map((p) => <option key={p.id} value={p.id}>{p.order}. {p.name}</option>)}</select></Field>
        <Field label="المكلف"><UserSelect users={users} value={f.assigned_to} onChange={(id) => setF({ ...f, assigned_to: id })} placeholder="مسؤول المرحلة أو مدير المشروع" /></Field>
        <Field label="الدور"><select className="ssp2-input" value={f.role_hint ?? ''} onChange={(e) => setF({ ...f, role_hint: e.target.value || null })}><option value="">—</option>{Object.entries(PROJECT_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="الأولوية"><select className="ssp2-input" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}><option value="low">منخفضة</option><option value="medium">متوسطة</option><option value="high">عالية</option><option value="urgent">عاجلة</option></select></Field>
        <Field label="الاستحقاق"><input type="date" className="ssp2-input" value={f.due_date ?? ''} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
        <Field label="ساعات مقدرة"><input type="number" min={0} className="ssp2-input" value={f.estimated_hours ?? ''} onChange={(e) => setF({ ...f, estimated_hours: e.target.value ? Number(e.target.value) : null })} /></Field>
        <Field label="تبدأ بعد إنهاء" full hint="اختر المهام التي يجب أن تكتمل قبل هذه المهمة. تُنبَّه المكلف عندما تصبح جاهزة.">
          <select multiple className="ssp2-input" style={{ minHeight: 80 }} value={(f.depends_on ?? []).map(String)} onChange={(e) => setF({ ...f, depends_on: Array.from(e.target.selectedOptions).map((o) => Number(o.value)) })}>
            {candidates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </Field>
        <label className="prj-check"><input type="checkbox" checked={!!f.requires_approval} onChange={(e) => setF({ ...f, requires_approval: e.target.checked })} /> إنجازها يحتاج اعتماداً</label>
        <label className="prj-check"><input type="checkbox" checked={!!f.client_action} onChange={(e) => setF({ ...f, client_action: e.target.checked })} /> مطلوبة من العميل (تظهر في بوابته)</label>
        <label className="prj-check"><input type="checkbox" checked={!!f.client_visible} onChange={(e) => setF({ ...f, client_visible: e.target.checked })} /> يراها العميل كعنوان فقط</label>
      </div>
    </Modal>
  );
};

const ApproveModal: React.FC<{ phase: ProjectPhase; busy: boolean; onClose: () => void; onDecide: (ok: boolean, reason?: string) => void }> = ({ phase, busy, onClose, onDecide }) => {
  const [reason, setReason] = useState('');
  return (
    <Modal title={`الموافقة على إنهاء «${phase.name}»`} onClose={onClose} foot={<>
      <button type="button" className="ssp2-btn" style={{ color: 'var(--status-red)' }} disabled={busy} onClick={() => { if (!reason.trim()) { toast.error('اكتب سبب الإعادة'); return; } onDecide(false, reason.trim()); }}>إعادة للعمل</button>
      <button type="button" className="ssp2-btn ssp2-btn--primary" disabled={busy} onClick={() => onDecide(true, reason.trim() || undefined)}><Check size={13} /> موافق</button>
    </>}>
      <p className="ssp2-hint">الموافقة تكمل المرحلة وتفعل التي بعدها وتحرك شرط الدفع المرتبط إن وجد. الإعادة تعيدها جارية مع سببك.</p>
      <Field label="ملاحظة أو سبب الإعادة"><textarea className="ssp2-input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
    </Modal>
  );
};

export default PhasesSection;
