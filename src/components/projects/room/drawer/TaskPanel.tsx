import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Clock, Download, ExternalLink, Eye, List, Loader2, MessageSquare, Paperclip, Pause, PenLine, Play, Send, ShieldCheck, Upload, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { TaskService } from '../../../../services/taskService';
import { ProjectService } from '../../../../services/projectService';
import type { ProjectTaskPatch } from '../../../../services/projectService';
import type { Task } from '../../../../types';
import type { ProjectTask } from '../../../../types/projects';
import { PROJECT_ROLE_LABELS } from '../../../../types/projects';
import SubtasksList from '../../../SubtasksList';
import TaskTeamChat from '../../../TaskTeamChat';
import TaskTimer from '../../../TaskTimer';
import { Av, Chip, UserSelect, fmtDate, num, taskStatus } from '../../ui';
import { useRoom } from '../RoomContext';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'todo', label: 'لم تبدأ' },
  { value: 'in_progress', label: 'جارية' },
  { value: 'completed', label: 'مكتملة' },
  { value: 'on_hold', label: 'موقوفة مؤقتاً' },
  { value: 'cancelled', label: 'ملغاة' },
];
const PRIORITY_LABELS: Record<string, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة' };

/**
 * بطاقة المهمة الكاملة داخل الغرفة: كل ما يفعله المستخدم في صفحة المهمة يفعله هنا، بالمكوّنات نفسها
 * (الخطوات، المحادثة، المؤقت)، فلا سلوك مختلف بين المكانين. المشروع يضيف المرحلة والاعتماديات.
 */
const TaskPanel: React.FC<{ taskId: number; onTitle: (title: string) => void }> = ({ taskId, onTitle }) => {
  const { project, users, canEdit, refresh, openIn, goTo, setPhaseFilter } = useRoom();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [ptask, setPtask] = useState<ProjectTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [reloadSignal, setReloadSignal] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const onTitleRef = useRef(onTitle);
  onTitleRef.current = onTitle;

  const load = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([TaskService.getTask(String(taskId)), ProjectService.task(project.id, taskId)]);
      setTask(t); setPtask(p); setError(null);
      onTitleRef.current(t.title);
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر فتح المهمة'); }
  }, [taskId, project.id]);
  useEffect(() => { setTask(null); setPtask(null); setEditing(false); load(); }, [load]);

  /** ينفذ إجراءً ثم يعيد جلب المهمة والغرفة معاً، فالأرقام خلف اللوحة تتحدث فوراً */
  const run = async (key: string, fn: () => Promise<unknown>, okMsg?: string) => {
    setBusy(key);
    try { await fn(); if (okMsg) toast.success(okMsg); await load(); setReloadSignal((s) => s + 1); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر التنفيذ'); }
    finally { setBusy(null); }
  };
  const patch = (key: string, input: ProjectTaskPatch, okMsg?: string) => run(key, () => ProjectService.updateTask(project.id, taskId, input), okMsg);

  const setStatus = async (status: string) => {
    if (!task || status === task.status) return;
    if (status === 'on_hold') {
      const reason = window.prompt('سبب الإيقاف المؤقت (إلزامي):', '');
      if (!reason || !reason.trim()) return;
      return run('status', () => TaskService.holdTask(String(taskId), reason.trim()), 'أُوقفت المهمة مؤقتاً');
    }
    if (task.status === 'on_hold') return run('status', () => TaskService.resumeTask(String(taskId)), 'استُؤنفت المهمة');
    return run('status', () => TaskService.updateTaskStatus(String(taskId), status));
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await run('upload', () => TaskService.uploadTaskDocument(String(taskId), file), 'رُفع المرفق');
  };
  const download = async (docId: string | number) => {
    try { const url = await TaskService.getTaskDocumentUrl(String(taskId), String(docId)); window.open(url, '_blank', 'noopener'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر فتح المرفق'); }
  };

  if (error) return <div className="prj-panel"><div className="prj-panel__body"><div className="prj-error" style={{ margin: 14 }}>{error}</div></div></div>;
  if (!task || !ptask) return <div className="prj-panel"><div className="prj-panel__body"><div className="prj-empty"><Loader2 size={14} className="ssp2-spin" /> جارٍ فتح المهمة…</div></div></div>;

  const st = taskStatus(task.status);
  const phase = ptask.phase_id ? project.phases.find((p) => p.id === ptask.phase_id) ?? null : null;
  const done = task.status === 'completed';
  const late = ptask.is_late && !done;
  const team = task.assignees && task.assignees.length > 0 ? task.assignees : (task.assignee ? [task.assignee] : []);
  const primaryId = task.assignee ? Number(task.assignee.id) : (task.assignedTo ? Number(task.assignedTo) : null);
  const canManageDocs = task.can_manage_documents ?? canEdit;
  const pendingApproval = task.status === 'pending_approval';
  const docs = task.documents ?? [];

  return (
    <div className="prj-panel">
      <div className="prj-panel__head">
        <div className="prj-panel__title">
          <button type="button" className={`prj-chk prj-chk--big ${done ? 'is-done' : ''}`} title={done ? 'أعد فتح المهمة' : (task.requires_approval ? 'أرسل للاعتماد' : 'أنهِ المهمة')} disabled={busy !== null || pendingApproval} onClick={() => setStatus(done ? 'todo' : 'completed')}><Check size={11} /></button>
          {editing ? (
            <input className="prj-in" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} style={{ flex: 1, fontWeight: 700 }} />
          ) : (
            <h2>{task.title}</h2>
          )}
          {!editing && (
            <select className="prj-sel" value={STATUS_OPTIONS.some((o) => o.value === task.status) ? task.status : ''} disabled={busy !== null || !canEdit} onChange={(e) => setStatus(e.target.value)} title="حالة المهمة">
              {!STATUS_OPTIONS.some((o) => o.value === task.status) && <option value="">{st.label}</option>}
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          {task.requires_approval && !done && <Chip tone="gate"><ShieldCheck size={10} /> {task.approver ? `باعتماد ${task.approver.name.split(' ')[0]}` : 'باعتماد'}</Chip>}
          {pendingApproval && <Chip tone="review">بانتظار الاعتماد</Chip>}
          {late && <Chip tone="late">متأخرة</Chip>}
          {task.client_action && <Chip tone="client"><Eye size={10} /> مطلوبة من العميل</Chip>}
          {ptask.is_dormant && <Chip tone="est">مسار لم يُختر بعد</Chip>}
          {canEdit && !editing && <button type="button" className="prj-ibtn" title="تعديل العنوان والوصف" onClick={() => { setDraftTitle(task.title); setDraftDesc(task.description ?? ''); setEditing(true); }}><PenLine size={12} /></button>}
        </div>
        <div className="prj-panel__sub">
          <span className="prj-badge">مهمة</span>
          <span><b>{project.code}</b>{phase ? ` · ${phase.order}. ${phase.name}` : ' · بلا مرحلة'}{phase?.workstream ? ` · ${phase.workstream}` : ''}</span>
          {task.status === 'on_hold' && task.hold_reason && <span>سبب الإيقاف: <b>{task.hold_reason}</b></span>}
        </div>
      </div>

      {pendingApproval && task.can_approve && (
        <div className="prj-panel__approve">
          <ShieldCheck size={14} style={{ color: 'var(--pj-gold)' }} />
          <span>المهمة تنتظر اعتمادك.</span>
          <span className="prj-spacer" />
          <button type="button" className="prj-btn prj-btn--sm prj-btn--primary" disabled={busy !== null} onClick={() => run('approve', () => TaskService.approveTask(String(taskId)), 'اعتُمدت المهمة')}><Check size={12} /> اعتمد</button>
          <button type="button" className="prj-btn prj-btn--sm" disabled={busy !== null} onClick={() => { const reason = window.prompt('ما الذي يُعاد لأجله؟ (إلزامي)', ''); if (reason && reason.trim()) run('reject', () => TaskService.rejectTask(String(taskId), reason.trim()), 'أُعيدت المهمة مع ملاحظتك'); }}>أعد مع ملاحظة</button>
        </div>
      )}

      {editing ? (
        <div className="prj-panel__acts">
          <button type="button" className="prj-btn prj-btn--sm prj-btn--primary" disabled={busy !== null || !draftTitle.trim()} onClick={async () => { await patch('edit', { title: draftTitle.trim(), description: draftDesc.trim() || null }, 'حُفظت المهمة'); setEditing(false); }}>{busy === 'edit' ? <Loader2 size={12} className="ssp2-spin" /> : <Check size={12} />} حفظ</button>
          <button type="button" className="prj-btn prj-btn--sm" onClick={() => setEditing(false)}><X size={12} /> إلغاء</button>
        </div>
      ) : (
        <div className="prj-panel__acts">
          {canEdit && task.requires_approval && !done && !pendingApproval && <button type="button" className="prj-btn prj-btn--sm prj-btn--primary" disabled={busy !== null} onClick={() => setStatus('completed')}><Send size={12} /> أرسل للاعتماد</button>}
          {canEdit && task.status === 'on_hold'
            ? <button type="button" className="prj-btn prj-btn--sm" disabled={busy !== null} onClick={() => setStatus('in_progress')}><Play size={12} /> استأنف</button>
            : canEdit && !done && task.status !== 'cancelled' && <button type="button" className="prj-btn prj-btn--sm" disabled={busy !== null} onClick={() => setStatus('on_hold')}><Pause size={12} /> أوقف مؤقتاً</button>}
          {canEdit && task.status === 'todo' && <button type="button" className="prj-btn prj-btn--sm" disabled={busy !== null} onClick={() => setStatus('in_progress')}><Play size={12} /> ابدأ</button>}
          <UserSelect users={users} value={primaryId} disabled={!canEdit || busy !== null} onChange={(id) => { if (id) patch('assignee', { assigned_to: id }, 'غُيّر المكلف'); }} placeholder="— المكلف —" />
          <input type="date" className="prj-in" value={ptask.due_date ?? ''} disabled={!canEdit || busy !== null} style={late ? { color: 'var(--pj-bad)', fontWeight: 700 } : undefined} onChange={(e) => patch('due', { due_date: e.target.value || null }, 'غُيّر الموعد')} title="الموعد" />
          <select className="prj-sel" value={task.priority} disabled={!canEdit || busy !== null} onChange={(e) => patch('priority', { priority: e.target.value as ProjectTaskPatch['priority'] })} title="الأولوية">
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>الأولوية: {v}</option>)}
          </select>
          <select className="prj-sel" value={ptask.phase_id ?? ''} disabled={!canEdit || busy !== null} onChange={(e) => patch('phase', { phase_id: e.target.value ? Number(e.target.value) : null }, 'نُقلت المهمة')} title="المرحلة">
            <option value="">بلا مرحلة</option>
            {project.phases.filter((p) => p.status !== 'skipped').map((p) => <option key={p.id} value={p.id}>{p.order}. {p.name}{p.status === 'hidden' ? ' (مسار لم يُختر)' : ''}</option>)}
          </select>
          {busy && <Loader2 size={13} className="ssp2-spin" />}
        </div>
      )}

      <div className="prj-panel__body">
        <div className="prj-kv2">
          <div><span className="k">الدور</span><span className="v">{ptask.role_hint ? PROJECT_ROLE_LABELS[ptask.role_hint as keyof typeof PROJECT_ROLE_LABELS] ?? ptask.role_hint : '—'}</span></div>
          <div><span className="k">الساعات</span><span className="v num">{num(ptask.hours_actual)}{ptask.estimated_hours ? ` من ${num(ptask.estimated_hours)} مقدرة` : ''}</span></div>
          <div><span className="k">الفريق</span><span className="v">{team.length ? team.map((m) => <span key={String(m.id)} style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}><Av name={m.name} /> {m.name.split(' ')[0]}</span>) : '—'}</span></div>
          <div><span className="k">من / إلى</span><span className="v num">{fmtDate(ptask.start_date)} ← {fmtDate(ptask.due_date)}</span></div>
          <div><span className="k">بعد إنهاء</span><span className="v">{ptask.predecessors.length ? ptask.predecessors.map((p, i) => <React.Fragment key={p.id}>{i > 0 && '، '}<button type="button" className="prj-link" onClick={() => openIn({ type: 'task', id: p.id })}>{p.title}</button>{p.status === 'completed' ? ' ✓' : ''}</React.Fragment>) : 'لا شيء'}</span></div>
          <div><span className="k">تعتمد عليها</span><span className="v num">{ptask.successors_count ? `${ptask.successors_count} مهام` : 'لا شيء'}</span></div>
          <div><span className="k">القضية</span><span className="v">{task.case ? <button type="button" className="prj-link" onClick={() => openIn({ type: 'case', id: Number(task.case!.id) })}>{task.case.file_number ? `${task.case.file_number} · ` : ''}{task.case.title}</button> : '—'}</span></div>
          <div><span className="k">للعميل</span><span className="v">{task.client_action ? 'مطلوبة منه' : task.client_visible ? 'يراها' : 'لا تظهر له'}</span></div>
        </div>

        <section className="prj-sec">
          <div className="prj-sec__head"><PenLine size={13} /> الوصف</div>
          <div className="prj-sec__body">
            {editing
              ? <textarea className="prj-in" rows={4} value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} placeholder="ما المطلوب في هذه المهمة؟" />
              : (task.description ? <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{task.description}</p> : <span className="prj-dim">بلا وصف.</span>)}
          </div>
        </section>

        <section className="prj-sec">
          <div className="prj-sec__head"><List size={13} /> الخطوات</div>
          <SubtasksList taskId={String(taskId)} dense reloadSignal={reloadSignal} onTaskChanged={() => { load(); refresh(); }} />
        </section>

        <section className="prj-sec">
          <div className="prj-sec__head"><Paperclip size={13} /> المرفقات <span className="prj-cnt num">{docs.length}</span>
            {canManageDocs && <><span className="prj-spacer" /><button type="button" className="prj-btn prj-btn--sm" disabled={busy === 'upload'} onClick={() => fileRef.current?.click()}>{busy === 'upload' ? <Loader2 size={12} className="ssp2-spin" /> : <Upload size={12} />} رفع</button><input ref={fileRef} type="file" hidden onChange={upload} /></>}
          </div>
          <div className="prj-sec__body" style={{ padding: 0 }}>
            {docs.length === 0 && <div className="prj-empty">لا مرفقات.{task.requires_attachment ? ' هذه المهمة لا تكتمل بلا مرفق.' : ''}</div>}
            {docs.map((d) => (
              <div key={String(d.id)} className="prj-row" style={{ padding: '5px 14px' }}>
                <Paperclip size={12} style={{ color: 'var(--pj-gold)', flex: 'none' }} />
                <span className="prj-grow">{d.title || d.file_name || `#${d.id}`}<small style={{ display: 'block', color: 'var(--pj-ink-3)', fontSize: 10.5 }}>{d.uploaded_at ? fmtDate(d.uploaded_at) : ''}{d.external_url ? ' · رابط' : ''}</small></span>
                {d.external_url
                  ? <a className="prj-btn prj-btn--sm" href={d.external_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} /> افتح</a>
                  : <>
                    <button type="button" className="prj-btn prj-btn--sm" onClick={() => openIn({ type: 'doc', id: Number(d.id) })}><Eye size={12} /> معاينة</button>
                    <button type="button" className="prj-ibtn" title="تنزيل" onClick={() => download(d.id)}><Download size={12} /></button>
                  </>}
              </div>
            ))}
          </div>
        </section>

        <section className="prj-sec">
          <div className="prj-sec__head"><Clock size={13} /> الوقت</div>
          <div style={{ padding: '6px 14px' }}><TaskTimer taskId={String(taskId)} taskTitle={task.title} compact onTimeLogged={() => { load(); refresh(); }} /></div>
        </section>

        <section className="prj-sec" style={{ borderBottom: 0 }}>
          <div className="prj-sec__head"><MessageSquare size={13} /> المحادثة ورائد <span className="prj-cnt num">{task.comments_count ?? task.comments?.length ?? 0}</span></div>
          <div className="prj-panel__chat"><TaskTeamChat taskId={String(taskId)} onTaskMutated={() => { load(); setReloadSignal((s) => s + 1); }} /></div>
        </section>
      </div>

      <div className="prj-panel__foot">
        <span>هذه مهمة عادية في الرائد. كل تغيير هنا هو التغيير نفسه في صفحة المهمة والجوال.</span>
        <span className="prj-spacer" />
        {phase && <button type="button" className="prj-btn prj-btn--sm" onClick={() => { setPhaseFilter(phase.id); goTo('tasks'); }}>مهام المرحلة</button>}
        <button type="button" className="prj-btn prj-btn--sm" onClick={() => navigate(`/tasks/${taskId}`)}><ExternalLink size={12} /> صفحة المهمة</button>
      </div>
    </div>
  );
};

export default TaskPanel;
