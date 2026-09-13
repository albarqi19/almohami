import React, { useEffect, useState } from 'react';
import { Check, ExternalLink, List, MessageSquare, Paperclip, PenLine, X } from 'lucide-react';
import { TaskService } from '../../../services/taskService';
import type { Task } from '../../../types';
import { PROJECT_ROLE_LABELS } from '../../../types/projects';
import { Av, Chip, fmtDate, fmtDateTime, num, taskStatus } from '../ui';
import { useRoom } from './RoomContext';

/**
 * بطاقة المهمة داخل الغرفة (كما في التصوّر): خصائصها في عمود، ووصفها وخطواتها ومرفقاتها ومحادثتها،
 * وزر يفتح صفحة المهمة الكاملة. هذه مهمة عادية في الرائد بكل ما فيها.
 */
const TaskCardModal: React.FC<{ taskId: number; onClose: () => void }> = ({ taskId, onClose }) => {
  const { project, openTaskPage } = useRoom();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTask(null);
    TaskService.getTask(String(taskId)).then((t) => { if (!cancelled) setTask(t); }).catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [taskId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const phase = task ? project.phases.find((p) => p.id === task.project_phase_id) : null;
  const st = task ? taskStatus(task.status) : null;
  const team = task ? ((task.assignees && task.assignees.length > 0) ? task.assignees : (task.assignee ? [task.assignee] : [])) : [];
  const steps = task?.subtasks ?? [];
  const stepsDone = steps.filter((s) => s.is_completed).length;
  const late = task && task.dueDate && !['completed', 'cancelled', 'on_hold'].includes(task.status) && new Date(task.dueDate) < new Date();

  return (
    <div className="prj-veil prj-scope" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="prj-tmodal" role="dialog" aria-label="بطاقة المهمة" dir="rtl">
        <div className="prj-m-head">
          <span className={`prj-chk ${task?.status === 'completed' ? 'is-done' : ''}`} style={task?.status === 'completed' ? { background: 'var(--pj-ok)', borderColor: 'var(--pj-ok)', color: '#fff' } : undefined}><Check size={10} /></span>
          <h2>{task?.title ?? 'جارٍ التحميل…'}</h2>
          {st && <Chip tone={st.tone}>{st.label}</Chip>}
          {late && <Chip tone="late">متأخرة</Chip>}
          {task?.client_action && <Chip tone="client">مطلوبة من العميل</Chip>}
          {task?.requires_approval && <Chip tone="gate">باعتماد</Chip>}
          <button type="button" className="prj-ibtn" onClick={onClose} title="إغلاق"><X size={14} /></button>
        </div>
        <div className="prj-m-body">
          <aside className="prj-m-props">
            {error && <div className="prj-error" style={{ margin: 10 }}>{error}</div>}
            <table className="prj-props"><tbody>
              <tr><td>المشروع</td><td><span className={`prj-dot prj-color-${project.color}`} style={{ width: 7, height: 7, marginInlineEnd: 4 }} /><span className="prj-code">{project.code}</span></td></tr>
              <tr><td>المسار</td><td>{phase?.workstream ?? '—'}</td></tr>
              <tr><td>المرحلة</td><td>{phase ? `${phase.order}. ${phase.name}` : '—'}</td></tr>
              <tr><td>الحالة</td><td>{st ? <Chip tone={st.tone}>{st.label}</Chip> : '—'}</td></tr>
              <tr><td>المكلف</td><td style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>{team.length ? team.map((m) => <span key={String(m.id)} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Av name={m.name} /> {m.name}</span>) : '—'}</td></tr>
              <tr><td>الدور</td><td>{task?.role_hint ? PROJECT_ROLE_LABELS[task.role_hint as keyof typeof PROJECT_ROLE_LABELS] ?? task.role_hint : '—'}</td></tr>
              <tr><td>الأولوية</td><td>{task ? ({ low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة' } as Record<string, string>)[task.priority] ?? task.priority : '—'}</td></tr>
              <tr><td>من</td><td className="num">{fmtDate(task?.startDate ?? task?.planned_start ?? null)}</td></tr>
              <tr><td>إلى</td><td className="num" style={late ? { color: 'var(--pj-bad)', fontWeight: 700 } : undefined}>{fmtDate(task?.dueDate ?? null)}</td></tr>
              <tr><td>الساعات</td><td className="num">{num(task?.actualHours ?? 0)}{task?.estimatedHours ? ` من ${num(task.estimatedHours)} مقدرة` : ''}</td></tr>
              <tr><td>الخطوات</td><td className="num">{steps.length ? `${stepsDone} من ${steps.length}` : '—'}</td></tr>
              <tr><td>المرفقات</td><td className="num">{task?.documents?.length ?? task?.documents_count ?? 0}</td></tr>
              {task?.hold_reason && <tr><td>سبب الإيقاف</td><td>{task.hold_reason}</td></tr>}
              {task?.approver && <tr><td>المعتمد</td><td>{task.approver.name}</td></tr>}
            </tbody></table>
          </aside>
          <div className="prj-m-main">
            <section className="prj-sec">
              <div className="prj-sec__head"><PenLine size={13} /> الوصف</div>
              <div className="prj-sec__body">{task?.description || <span className="prj-dim">بلا وصف.</span>}</div>
            </section>
            <section className="prj-sec">
              <div className="prj-sec__head"><List size={13} /> الخطوات (المهام الفرعية) <span className="prj-cnt num">{steps.length ? `${stepsDone}/${steps.length}` : ''}</span></div>
              {steps.length === 0 ? <div className="prj-sec__body prj-dim">لا خطوات. تُضاف من صفحة المهمة.</div> : steps.map((s) => (
                <div key={String(s.id)} className={`prj-step ${s.is_completed ? 'is-done' : ''}`}><span className="prj-chk"><Check size={10} /></span><span>{s.title}</span>{s.assignee && <span className="prj-mi" style={{ marginInlineStart: 'auto' }}>{s.assignee.name}</span>}</div>
              ))}
            </section>
            <section className="prj-sec">
              <div className="prj-sec__head"><Paperclip size={13} /> المرفقات <span className="prj-cnt num">{task?.documents?.length ?? 0}</span></div>
              <div className="prj-sec__body">
                {!task?.documents?.length ? <span className="prj-dim">لا مرفقات.</span> : task.documents.map((d) => <div key={String(d.id)} className="prj-row"><span className="prj-grow">{d.title || (d as unknown as { file_name?: string }).file_name || `#${d.id}`}</span><span className="when">{fmtDate((d as unknown as { created_at?: string }).created_at ?? null)}</span></div>)}
              </div>
            </section>
            <section className="prj-sec" style={{ borderBottom: 0 }}>
              <div className="prj-sec__head"><MessageSquare size={13} /> المحادثة ورائد <span className="prj-cnt num">{task?.comments?.length ?? task?.comments_count ?? 0}</span></div>
              <div className="prj-sec__body">
                {!task?.comments?.length ? <span className="prj-dim">لا رسائل. المحادثة الكاملة في صفحة المهمة.</span> : task.comments.slice(-4).map((c) => {
                  const cm = c as unknown as { id: number | string; comment?: string; content?: string; user?: { name?: string } | null; author_type?: string; created_at?: string };
                  return <div key={String(cm.id)} className="prj-row" style={{ alignItems: 'flex-start' }}><span className="prj-grow" style={{ whiteSpace: 'normal' }}><b style={{ color: 'var(--pj-ink)' }}>{cm.author_type === 'assistant' ? 'رائد' : cm.user?.name ?? '—'}:</b> {cm.comment ?? cm.content ?? ''}</span><span className="when">{fmtDateTime(cm.created_at ?? null)}</span></div>;
                })}
              </div>
            </section>
          </div>
        </div>
        <div className="prj-m-foot">
          <span>هذه مهمة عادية في الرائد بكل ما فيها اليوم.</span>
          <span className="prj-spacer" />
          <button type="button" className="prj-btn prj-btn--sm" onClick={() => openTaskPage(taskId)}><ExternalLink size={12} /> افتح صفحة المهمة</button>
        </div>
      </div>
    </div>
  );
};

export default TaskCardModal;
