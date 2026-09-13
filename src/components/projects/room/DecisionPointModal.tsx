import React, { useState } from 'react';
import { Check, GitBranch, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { DecisionPoint, ProjectPhase } from '../../../types/projects';
import { Av, Chip, Field, Modal, daysFromToday, fmtDate, fmtDayMonth } from '../ui';
import { useRoom } from './RoomContext';

const DAY = 86400000;
const durationDays = (p: ProjectPhase): number | null => {
  const a = p.planned_start ?? p.start_date; const b = p.planned_due ?? p.due_date;
  if (!a || !b) return null;
  const d = Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY) + 1;
  return d > 0 ? d : null;
};

/**
 * نقطة القرار: سؤال يُطرح بعد مرحلة معينة (غالباً بعد الحكم)، وكل خيار يفعّل مساراً من المراحل
 * المخفية ويطوي الباقي. من يقرر: من يملك صلاحية الموافقة (الشريك أو المدير).
 */
const DecisionPointModal: React.FC<{ pointId: number; onClose: () => void }> = ({ pointId, onClose }) => {
  const { project, canApprove, refresh, goTo, setPhaseFilter } = useRoom();
  const dp: DecisionPoint | undefined = project.decision_points.find((d) => d.id === pointId);
  const [note, setNote] = useState(dp?.note ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  if (!dp) return null;

  const after = project.phases.find((p) => p.id === dp.after_phase_id) ?? null;
  const afterDone = after?.status === 'completed';
  const expected = after?.due_date ?? null;
  const exp = daysFromToday(expected);
  const chosen = dp.chosen_key ? dp.options.find((o) => o.key === dp.chosen_key) ?? null : null;
  const decider = project.partner ?? project.manager;
  const phasesOf = (ids: number[]) => ids.map((id) => project.phases.find((p) => p.id === id)).filter((p): p is ProjectPhase => !!p);

  const decide = async (optionKey: string, label: string) => {
    if (!afterDone && !window.confirm(`مرحلة «${after?.name ?? '—'}» لم تكتمل بعد. تختار «${label}» الآن؟ سيبدأ المسار من اليوم.`)) return;
    setBusy(optionKey);
    try { const r = await ProjectService.decide(project.id, dp.id, optionKey, note.trim() || undefined); toast.success(r.message || 'سُجل القرار وفُعّل المسار'); await refresh(); onClose(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر تسجيل القرار'); }
    finally { setBusy(null); }
  };

  return (
    <Modal title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><GitBranch size={14} style={{ color: 'var(--pj-gold)' }} /> نقطة قرار</span>} onClose={onClose} wide foot={<button type="button" className="prj-btn" onClick={onClose}>إغلاق</button>}>
      <p className="prj-dp__q">{dp.question}</p>
      <div className="prj-dp__meta">
        <span><span className="k">تأتي بعد:</span> {after ? <button type="button" className="prj-link" onClick={() => { setPhaseFilter(after.id); goTo('tasks'); onClose(); }}>{after.name}</button> : '—'}</span>
        {expected && <span><span className="k">متوقعة:</span> <b className="num">{fmtDate(expected)}</b>{exp ? ` (${exp.label})` : ''}</span>}
        <span><span className="k">من يقرر:</span> {decider ? <><Av name={decider.name} /> {decider.name}</> : 'الشريك المسؤول'}{canApprove ? ' · أنت تملك القرار' : ''}</span>
        <span><span className="k">الحالة:</span> {chosen ? <Chip tone="done">قُررت</Chip> : afterDone ? <Chip tone="warn">جاهزة للقرار الآن</Chip> : <Chip tone="est">تنتظر إكمال «{after?.name ?? '—'}»</Chip>}</span>
      </div>

      {chosen ? (
        <div className="prj-dp__note"><b style={{ color: 'var(--pj-ink)' }}>القرار:</b> {chosen.label}{dp.decided_by ? ` · قرره ${dp.decided_by.name}` : ''}{dp.decided_at ? ` · ${fmtDate(dp.decided_at)}` : ''}{dp.note ? <><br />السبب: {dp.note}</> : null}</div>
      ) : (
        <div className="prj-dp__note">عند اختيار المسار: مراحله تظهر وتبدأ من يوم القرار وتُزاح مواعيدها بالتساوي، والمسارات الأخرى تُطوى ولا تظهر في الخطة ولا للعميل. يُسجل القرار في الخط الزمني باسم من اختاره.</div>
      )}

      <div className="prj-dp__opts">
        {dp.options.map((o) => {
          const phs = phasesOf(o.activates);
          const isChosen = chosen?.key === o.key;
          const isSkipped = !!chosen && !isChosen;
          const tasks = phs.reduce((s, p) => s + p.tasks_total, 0);
          const days = phs.reduce((s, p) => s + (durationDays(p) ?? 0), 0);
          return (
            <div key={o.key} className={`prj-dp__opt ${isChosen ? 'is-chosen' : ''} ${isSkipped ? 'is-skipped' : ''}`}>
              <div className="prj-dp__opt__h">
                <span className={`prj-diamond ${isChosen ? 'prj-diamond--done' : ''}`} />
                <span>{o.label}</span>
                {isChosen && <Chip tone="done"><Check size={10} /> المسار المختار</Chip>}
                {isSkipped && <Chip tone="todo">طُوي</Chip>}
                {!chosen && canApprove && <button type="button" className="prj-btn prj-btn--sm prj-btn--primary" disabled={busy !== null} onClick={() => decide(o.key, o.label)}>{busy === o.key ? <Loader2 size={11} className="ssp2-spin" /> : <ShieldCheck size={11} />} اختر هذا المسار</button>}
              </div>
              <div className="prj-dp__path">
                <span className="prj-dim">يفعّل:</span>
                {phs.length === 0 && <span className="prj-dim">لا مراحل مرتبطة بهذا الخيار (ينتهي المشروع أو يُتابع يدوياً)</span>}
                {phs.map((p, i) => (
                  <React.Fragment key={p.id}>
                    {i > 0 && <span className="arrow">←</span>}
                    <button type="button" className="prj-dp__phase" onClick={() => { setPhaseFilter(p.id); goTo('tasks'); onClose(); }} title="افتح مهام المرحلة"><GitBranch size={10} /> {p.name} <small>{p.tasks_total} مهام{durationDays(p) ? ` · ${durationDays(p)} يوم` : ''}{p.status === 'active' ? ' · جارية' : p.status === 'completed' ? ' · مكتملة' : ''}</small></button>
                  </React.Fragment>
                ))}
                {phs.length > 0 && <span className="prj-dim num" style={{ marginInlineStart: 'auto' }}>{tasks} مهمة{days ? ` · نحو ${days} يوم` : ''}{phs[0]?.planned_start ? ` · كان مخططاً ${fmtDayMonth(phs[0].planned_start)}` : ''}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {!chosen && canApprove && <Field label="سبب القرار (يُحفظ في الخط الزمني)"><textarea className="prj-in" rows={2} style={{ minHeight: 56 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: الحكم صدر لصالحنا كاملاً فننتقل للتنفيذ" /></Field>}
      {!chosen && !canApprove && <p className="prj-dim" style={{ margin: 0, fontSize: 11.5 }}>القرار لمن يملك صلاحية الموافقة في المشروع. تستطيع مناقشته في محادثة المشروع أو تسجيل توصية في سجل القرارات.</p>}
    </Modal>
  );
};

export default DecisionPointModal;
