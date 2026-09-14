import React, { useEffect, useMemo, useState } from 'react';
import { Check, Clock, Eye, Flag, LayoutGrid, Link2, List, Loader2, MessageSquare, Paperclip, Pencil, Plus, Rows3, ShieldCheck, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { PhaseInput, ProjectTaskInput } from '../../../services/projectService';
import type { ProjectPhase, ProjectTask } from '../../../types/projects';
import { PHASE_STATUS_LABELS, PROJECT_ROLE_LABELS } from '../../../types/projects';
import { Av, Chip, ErrorBox, Field, Modal, PBar, UserSelect, fmtDate, fmtDayMonth, num, taskStatus } from '../ui';
import { useRoom } from './RoomContext';

type View = 'board' | 'list';
type Col = 'todo' | 'doing' | 'review' | 'done';
const COLS: Array<{ key: Col; label: string; color: string; statuses: string[] }> = [
  { key: 'todo', label: 'لم تبدأ', color: 'var(--pj-ink-3)', statuses: ['todo'] },
  { key: 'doing', label: 'جارية', color: 'var(--pj-info)', statuses: ['in_progress', 'on_hold'] },
  { key: 'review', label: 'للمراجعة', color: 'var(--pj-warn)', statuses: ['pending_approval'] },
  { key: 'done', label: 'مكتملة', color: 'var(--pj-ok)', statuses: ['completed', 'cancelled'] },
];

/**
 * المراحل والمهام كما في التصوّر: أدوات (لوحة/قائمة، المرحلة، المكلف)، لوحة بأعمدة الحالة
 * تُصفّى على المرحلة المختارة من شريط الترويسة، أو قائمة مجمّعة بالمرحلة. المهمة تفتح بطاقتها.
 */
const PhasesSection: React.FC = () => {
  const { project, canEdit, canApprove, refresh, openTask, phaseFilter, setPhaseFilter, consumePending } = useRoom();
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [view, setView] = useState<View>(() => (localStorage.getItem('prj_phases_view') as View) || 'board');
  const [scope, setScope] = useState<'live' | 'all'>('live');
  const [assignee, setAssignee] = useState<number | 'all'>('all');
  const [phaseModal, setPhaseModal] = useState<{ phase: ProjectPhase | null } | null>(null);
  const [taskModal, setTaskModal] = useState<{ phaseId: number | null } | null>(null);
  const [approveModal, setApproveModal] = useState<ProjectPhase | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => { try { setTasks(await ProjectService.tasks(project.id)); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر جلب المهام'); } };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id, project.updated_at]);
  useEffect(() => {
    if (consumePending('task')) setTaskModal({ phaseId: phaseFilter ?? project.phases.find((p) => p.status === 'active')?.id ?? null });
    if (consumePending('phase')) setPhaseModal({ phase: null });
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const switchView = (v: View) => { setView(v); localStorage.setItem('prj_phases_view', v); };
  const phaseById = useMemo(() => new Map(project.phases.map((p) => [p.id, p])), [project.phases]);
  const livePhaseIds = useMemo(() => new Set(project.phases.filter((p) => ['active', 'awaiting_approval', 'upcoming'].includes(p.status)).map((p) => p.id)), [project.phases]);
  const assignees = useMemo(() => {
    const m = new Map<number, string>();
    tasks.forEach((t) => { if (t.assignee) m.set(t.assignee.id, t.assignee.name); t.assignees.forEach((a) => m.set(a.id, a.name)); });
    return Array.from(m.entries());
  }, [tasks]);

  const visible = tasks.filter((t) => {
    if (phaseFilter !== null) { if (t.phase_id !== phaseFilter) return false; }
    else if (scope === 'live' && t.phase_id !== null && !livePhaseIds.has(t.phase_id)) return false;
    if (assignee !== 'all' && !(t.assignee?.id === assignee || t.assignees.some((a) => a.id === assignee))) return false;
    return true;
  });
  const grouped = useMemo(() => {
    const m = new Map<number | null, ProjectTask[]>();
    visible.forEach((t) => { const k = t.phase_id ?? null; if (!m.has(k)) m.set(k, []); m.get(k)!.push(t); });
    m.forEach((list) => list.sort((a, b) => (a.project_order ?? 0) - (b.project_order ?? 0) || (a.due_date ?? '').localeCompare(b.due_date ?? '')));
    const keys = project.phases.filter((p) => m.has(p.id)).map((p) => p.id as number | null);
    if (m.has(null)) keys.push(null);
    return keys.map((k) => ({ phase: k === null ? null : phaseById.get(k) ?? null, tasks: m.get(k)! }));
  }, [visible, project.phases, phaseById]);

  const complete = async (p: ProjectPhase) => { setBusy(`c${p.id}`); try { const r = await ProjectService.completePhase(project.id, p.id); toast.success(r.message || 'تم'); await refresh(); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر إكمال المرحلة'); } finally { setBusy(null); } };
  const approve = async (p: ProjectPhase, ok: boolean, reason?: string) => { setBusy(`a${p.id}`); try { const r = await ProjectService.approvePhase(project.id, p.id, ok, reason); toast.success(r.message || 'تم'); setApproveModal(null); await refresh(); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر تسجيل القرار'); } finally { setBusy(null); } };
  const activate = async (p: ProjectPhase) => { setBusy(`s${p.id}`); try { await ProjectService.updatePhase(project.id, p.id, { status: 'active' }); await refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر تفعيل المرحلة'); } finally { setBusy(null); } };
  const removePhase = async (p: ProjectPhase) => { if (!window.confirm(`حذف المرحلة «${p.name}»؟ مهامها تبقى في المشروع بلا مرحلة.`)) return; try { await ProjectService.deletePhase(project.id, p.id); setPhaseModal(null); await refresh(); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); } };
  const savePhase = async (data: PhaseInput & { name: string }) => { try { if (phaseModal?.phase) await ProjectService.updatePhase(project.id, phaseModal.phase.id, data); else await ProjectService.createPhase(project.id, data); setPhaseModal(null); await refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحفظ'); } };
  const saveTask = async (data: ProjectTaskInput) => { try { await ProjectService.createTask(project.id, data); setTaskModal(null); toast.success('أُضيفت المهمة'); await load(); await refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر إضافة المهمة'); } };

  const chips = (t: ProjectTask) => {
    const pending = t.predecessors.filter((p) => p.status !== 'completed');
    return (
      <>
        {t.status !== 'completed' && pending.length > 0 && <Chip tone="dep" title={`لا تبدأ قبل إنهاء: ${pending.map((p) => p.title).join('، ')}`}><Link2 size={10} /> بعد: {pending[0].title}{pending.length > 1 ? ` +${pending.length - 1}` : ''}</Chip>}
        {t.client_action && <Chip tone="client"><Eye size={10} /> العميل</Chip>}
        {t.status === 'pending_approval' && <Chip tone="review">للموافقة</Chip>}
        {t.requires_approval && t.status !== 'pending_approval' && t.status !== 'completed' && <Chip tone="gate"><ShieldCheck size={10} /> باعتماد</Chip>}
        {t.is_late && t.status !== 'completed' && <Chip tone="late">متأخرة</Chip>}
        {t.status === 'on_hold' && <Chip tone="hold">موقوفة</Chip>}
        {t.is_dormant && <Chip tone="est" title="لا تظهر لأحد خارج المشروع حتى يُختار هذا المسار">مسار لم يُختر بعد</Chip>}
        {t.cycle_session_id && <Chip tone="proj">دورة جلسة</Chip>}
      </>
    );
  };
  const indicators = (t: ProjectTask) => (
    <>
      {t.subtasks_total > 0 && <span className="prj-mi num" title="الخطوات"><List size={11} /> {t.subtasks_completed}/{t.subtasks_total} <span className="prj-bar"><b style={{ width: `${Math.round((t.subtasks_completed / t.subtasks_total) * 100)}%` }} /></span></span>}
      {t.documents_count > 0 && <span className="prj-mi num" title="المرفقات"><Paperclip size={11} /> {t.documents_count}</span>}
      {t.comments_count > 0 && <span className="prj-mi num" title="المحادثة"><MessageSquare size={11} /> {t.comments_count}</span>}
      {(t.hours_actual > 0 || t.estimated_hours) && <span className="prj-mi num" title="الساعات"><Clock size={11} /> {num(t.hours_actual)}{t.estimated_hours ? `/${num(t.estimated_hours)}` : ''}</span>}
    </>
  );
  const phaseActions = (p: ProjectPhase) => (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', marginInlineStart: 'auto' }} onClick={(e) => e.stopPropagation()}>
      {p.status === 'awaiting_approval' && canApprove && <button type="button" className="prj-btn prj-btn--sm prj-btn--primary" onClick={() => setApproveModal(p)}><ShieldCheck size={11} /> قرار الموافقة</button>}
      {canEdit && p.status === 'active' && <button type="button" className="prj-btn prj-btn--sm" disabled={busy === `c${p.id}`} onClick={() => complete(p)}>{busy === `c${p.id}` ? <Loader2 size={11} className="ssp2-spin" /> : <Check size={11} />} {p.requires_approval ? 'إنهاء وطلب الموافقة' : 'إنهاء المرحلة'}</button>}
      {canEdit && (p.status === 'upcoming' || p.status === 'hidden') && p.activation !== 'decision' && <button type="button" className="prj-btn prj-btn--sm" disabled={busy === `s${p.id}`} onClick={() => activate(p)}>ابدأ الآن</button>}
      {canEdit && <button type="button" className="prj-ibtn" style={{ width: 22, height: 22 }} title="تعديل المرحلة" onClick={() => setPhaseModal({ phase: p })}><Pencil size={11} /></button>}
    </span>
  );
  const filterNote = phaseFilter !== null ? `مصفاة على: ${phaseById.get(phaseFilter)?.name ?? ''}` : scope === 'live' ? 'المراحل الجارية والقادمة' : 'كل المراحل';

  return (
    <div className="prj-view">
      <div className="prj-subtools">
        <div className="prj-seg">
          <button type="button" className={view === 'board' ? 'is-on' : ''} onClick={() => switchView('board')}><LayoutGrid size={12} /> لوحة</button>
          <button type="button" className={view === 'list' ? 'is-on' : ''} onClick={() => switchView('list')}><Rows3 size={12} /> قائمة</button>
        </div>
        <select className="prj-sel" value={phaseFilter !== null ? String(phaseFilter) : scope} onChange={(e) => { const v = e.target.value; if (v === 'live' || v === 'all') { setPhaseFilter(null); setScope(v); } else setPhaseFilter(Number(v)); }}>
          <option value="live">المرحلة: الجارية والقادمة</option>
          <option value="all">المرحلة: الكل</option>
          {project.phases.map((p) => <option key={p.id} value={p.id}>{p.order}. {p.name}</option>)}
        </select>
        <select className="prj-sel" value={assignee === 'all' ? 'all' : String(assignee)} onChange={(e) => setAssignee(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">المكلف: الكل</option>
          {assignees.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <span className="prj-dim" style={{ fontSize: 11 }}>{filterNote}{phaseFilter !== null && <button type="button" className="prj-link" style={{ marginInlineStart: 6, textDecoration: 'none' }} onClick={() => setPhaseFilter(null)}><X size={10} /></button>} · {visible.length} مهمة</span>
        <span className="prj-spacer" />
        {canEdit && <button type="button" className="prj-btn prj-btn--sm" onClick={() => setTaskModal({ phaseId: phaseFilter ?? project.phases.find((p) => p.status === 'active')?.id ?? null })}><Plus size={12} /> مهمة</button>}
        {canEdit && <button type="button" className="prj-btn prj-btn--sm" onClick={() => setPhaseModal({ phase: null })}><Flag size={12} /> مرحلة</button>}
      </div>

      {project.phases.length === 0 && <div className="prj-empty">لا مراحل بعد. أضف مرحلة، أو طبق قالباً من قائمة «إجراء سريع».</div>}

      {view === 'board' ? (
        <div className="prj-board">
          {COLS.map((c) => {
            const its = visible.filter((t) => c.statuses.includes(t.status));
            return (
              <div key={c.key} className="prj-bcol">
                <div className="prj-bcol__head"><span className="cdot" style={{ background: c.color }} />{c.label}<span className="prj-cnt num">{its.length}</span></div>
                <div className="prj-bcol__body">
                  {its.length === 0 && <div className="prj-bcol__hint">لا شيء هنا</div>}
                  {its.map((t) => {
                    const ph = t.phase_id ? phaseById.get(t.phase_id) : null;
                    return (
                      <button type="button" key={t.id} className={`prj-tcard ${t.status === 'completed' ? 'is-done' : ''}`} onClick={() => openTask(t.id)}>
                        <div className="prj-tcard__ph"><Flag size={10} /> {ph ? `${ph.order}. ${ph.name}` : 'بلا مرحلة'}{t.role_label ? <span> · {t.role_label}</span> : null}</div>
                        <div className="prj-tcard__t">{t.title}</div>
                        <div className="prj-tcard__chips">{chips(t)}</div>
                        <div className="prj-tcard__foot">
                          {t.due_date && <span className={`prj-mi num ${t.is_late && t.status !== 'completed' ? 'prj-mi--late' : ''}`}>{fmtDayMonth(t.due_date)}</span>}
                          {indicators(t)}
                          {t.assignee && <Av name={t.assignee.name} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="prj-list--pad">
          <table className="prj-grid">
            <thead><tr><th style={{ width: '34%' }}>المهمة</th><th>الحالة</th><th>المكلف</th><th>الدور</th><th>من</th><th>إلى</th><th>المؤشرات</th></tr></thead>
            <tbody>
              {grouped.length === 0 && <tr><td colSpan={7} className="prj-dim">لا مهام مطابقة.</td></tr>}
              {grouped.map((g) => {
                const p = g.phase;
                const done = g.tasks.filter((t) => t.status === 'completed').length;
                return (
                  <React.Fragment key={p?.id ?? 'none'}>
                    <tr className="gh"><td colSpan={7}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: '100%' }}>
                        {p ? <><span className="num prj-dim">{p.order}</span>{p.name}<Chip tone={p.status === 'completed' ? 'done' : p.status === 'active' ? 'doing' : p.status === 'awaiting_approval' ? 'review' : p.status === 'hidden' ? 'dep' : 'todo'}>{PHASE_STATUS_LABELS[p.status]}</Chip>{p.requires_approval && <Chip tone="gate"><ShieldCheck size={10} /> بموافقة</Chip>}{p.client_visible && <Chip tone="client"><Eye size={10} /> للعميل</Chip>}<span className="prj-dim">{fmtDayMonth(p.start_date)} → {fmtDayMonth(p.due_date)} · {done}/{g.tasks.length} مهام{p.owner ? ` · ${p.owner.name}` : ''}</span>{phaseActions(p)}</> : <>مهام بلا مرحلة<span className="prj-dim">{g.tasks.length}</span></>}
                      </span>
                    </td></tr>
                    {g.tasks.map((t) => {
                      const st = taskStatus(t.status);
                      return (
                        <tr key={t.id} className={t.status === 'completed' ? 'is-done' : ''}>
                          <td className="t" onClick={() => openTask(t.id)}>{t.title}<span style={{ display: 'inline-flex', gap: 4, marginInlineStart: 6, verticalAlign: 'middle' }}>{chips(t)}</span></td>
                          <td><Chip tone={st.tone}>{st.label}</Chip></td>
                          <td>{t.assignee ? <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><Av name={t.assignee.name} /> {t.assignee.name}</span> : <span className="prj-dim">—</span>}</td>
                          <td className="prj-dim">{t.role_label ?? '—'}</td>
                          <td className="num">{fmtDayMonth(t.start_date)}</td>
                          <td className={`num ${t.is_late && t.status !== 'completed' ? 'prj-mi--late' : ''}`}>{fmtDayMonth(t.due_date)}</td>
                          <td><span style={{ display: 'inline-flex', gap: 8 }}>{indicators(t)}</span></td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {phaseModal && <PhaseModal phase={phaseModal.phase} onClose={() => setPhaseModal(null)} onSave={savePhase} onDelete={phaseModal.phase ? () => removePhase(phaseModal.phase!) : undefined} />}
      {taskModal && <TaskModal phaseId={taskModal.phaseId} tasks={tasks} onClose={() => setTaskModal(null)} onSave={saveTask} />}
      {approveModal && <ApproveModal phase={approveModal} busy={busy === `a${approveModal.id}`} onClose={() => setApproveModal(null)} onDecide={(ok, reason) => approve(approveModal, ok, reason)} />}
    </div>
  );
};

const PhaseModal: React.FC<{ phase: ProjectPhase | null; onClose: () => void; onSave: (d: PhaseInput & { name: string }) => Promise<void>; onDelete?: () => void }> = ({ phase, onClose, onSave, onDelete }) => {
  const { users, project } = useRoom();
  const [f, setF] = useState({
    name: phase?.name ?? '', objective: phase?.objective ?? '', workstream: phase?.workstream ?? (project.settings.workstreams?.[0]?.name ?? ''),
    owner_id: (phase?.owner?.id ?? null) as number | null, start_date: phase?.start_date ?? '', due_date: phase?.due_date ?? '',
    requires_approval: phase?.requires_approval ?? false, approver_id: (phase?.approver?.id ?? null) as number | null, client_visible: phase?.client_visible ?? false,
    estimated_hours: (phase?.estimated_hours ?? null) as number | null, session_cycle: phase?.session_cycle ?? false, status: phase?.status ?? 'upcoming',
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
      {onDelete && <button type="button" className="prj-btn prj-btn--danger" style={{ marginInlineEnd: 'auto' }} onClick={onDelete}><Trash2 size={12} /> حذف</button>}
      <button type="button" className="prj-btn" onClick={onClose}>إلغاء</button>
      <button type="button" className="prj-btn prj-btn--primary" onClick={submit} disabled={busy}>حفظ</button>
    </>}>
      <ErrorBox error={err} />
      <div className="prj-form">
        <Field label="الاسم" full><input className="prj-in" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <Field label="الهدف" full><textarea className="prj-in" rows={2} style={{ minHeight: 56 }} value={f.objective} onChange={(e) => setF({ ...f, objective: e.target.value })} /></Field>
        <Field label="المسار"><input className="prj-in" value={f.workstream} onChange={(e) => setF({ ...f, workstream: e.target.value })} list="prj-ws" /><datalist id="prj-ws">{project.settings.workstreams?.map((w) => <option key={w.key} value={w.name} />)}</datalist></Field>
        <Field label="المسؤول"><UserSelect users={users} value={f.owner_id} onChange={(id) => setF({ ...f, owner_id: id })} /></Field>
        <Field label="من"><input type="date" className="prj-in" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
        <Field label="إلى"><input type="date" className="prj-in" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
        <Field label="الساعات المقدرة"><input type="number" min={0} className="prj-in" value={f.estimated_hours ?? ''} onChange={(e) => setF({ ...f, estimated_hours: e.target.value ? Number(e.target.value) : null })} /></Field>
        <Field label="الحالة"><select className="prj-in" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ProjectPhase['status'] })}>{Object.entries(PHASE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <label className="prj-check"><input type="checkbox" checked={f.requires_approval} onChange={(e) => setF({ ...f, requires_approval: e.target.checked })} /> إنهاؤها يحتاج موافقة</label>
        {f.requires_approval ? <Field label="الموافق"><UserSelect users={users} value={f.approver_id} onChange={(id) => setF({ ...f, approver_id: id })} placeholder="الشريك المسؤول" /></Field> : <span />}
        <label className="prj-check"><input type="checkbox" checked={f.client_visible} onChange={(e) => setF({ ...f, client_visible: e.target.checked })} /> تظهر للعميل</label>
        <label className="prj-check"><input type="checkbox" checked={f.session_cycle} onChange={(e) => setF({ ...f, session_cycle: e.target.checked })} /> مرحلة جلسات (دورة الجلسة تتولد فيها)</label>
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
    <Modal title="مهمة جديدة في المشروع" onClose={onClose} foot={<><button type="button" className="prj-btn" onClick={onClose}>إلغاء</button><button type="button" className="prj-btn prj-btn--primary" onClick={submit} disabled={busy}>إضافة</button></>}>
      <ErrorBox error={err} />
      <div className="prj-form">
        <Field label="العنوان" full><input className="prj-in" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></Field>
        <Field label="الوصف" full><textarea className="prj-in" rows={2} style={{ minHeight: 56 }} value={f.description ?? ''} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="المرحلة"><select className="prj-in" value={f.phase_id ?? ''} onChange={(e) => setF({ ...f, phase_id: e.target.value ? Number(e.target.value) : null, depends_on: [] })}><option value="">— بلا —</option>{project.phases.map((p) => <option key={p.id} value={p.id}>{p.order}. {p.name}</option>)}</select></Field>
        <Field label="المكلف"><UserSelect users={users} value={f.assigned_to} onChange={(id) => setF({ ...f, assigned_to: id })} placeholder="مسؤول المرحلة أو مدير المشروع" /></Field>
        <Field label="الدور"><select className="prj-in" value={f.role_hint ?? ''} onChange={(e) => setF({ ...f, role_hint: e.target.value || null })}><option value="">—</option>{Object.entries(PROJECT_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="الأولوية"><select className="prj-in" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}><option value="low">منخفضة</option><option value="medium">متوسطة</option><option value="high">عالية</option><option value="urgent">عاجلة</option></select></Field>
        <Field label="الاستحقاق"><input type="date" className="prj-in" value={f.due_date ?? ''} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
        <Field label="ساعات مقدرة"><input type="number" min={0} className="prj-in" value={f.estimated_hours ?? ''} onChange={(e) => setF({ ...f, estimated_hours: e.target.value ? Number(e.target.value) : null })} /></Field>
        <Field label="تبدأ بعد إنهاء" full hint="المهام التي يجب أن تكتمل قبلها. يُنبَّه المكلف عندما تصبح جاهزة.">
          <select multiple className="prj-in" style={{ minHeight: 80, display: 'block' }} value={(f.depends_on ?? []).map(String)} onChange={(e) => setF({ ...f, depends_on: Array.from(e.target.selectedOptions).map((o) => Number(o.value)) })}>
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
      <button type="button" className="prj-btn prj-btn--danger" disabled={busy} onClick={() => { if (!reason.trim()) { toast.error('اكتب سبب الإعادة'); return; } onDecide(false, reason.trim()); }}>إعادة للعمل</button>
      <button type="button" className="prj-btn prj-btn--primary" disabled={busy} onClick={() => onDecide(true, reason.trim() || undefined)}><Check size={12} /> موافق</button>
    </>}>
      <p className="prj-dim" style={{ margin: 0, fontSize: 12, lineHeight: 1.7 }}>الموافقة تكمل المرحلة وتفعل التي بعدها وتحرك شرط الدفع المرتبط إن وجد. الإعادة تعيدها جارية مع سببك.</p>
      <Field label="ملاحظة أو سبب الإعادة"><textarea className="prj-in" rows={3} style={{ minHeight: 70 }} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
    </Modal>
  );
};

export default PhasesSection;
