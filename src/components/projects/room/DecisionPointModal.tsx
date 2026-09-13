import React, { useState } from 'react';
import { Check, GitBranch, Loader2, Pencil, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { DecisionPoint, DecisionPointOption, ProjectPhase } from '../../../types/projects';
import { DECISION_SOURCE_LABELS } from '../../../types/projects';
import { Av, Chip, Field, Modal, daysFromToday, fmtDate, fmtDayMonth } from '../ui';
import { useRoom } from './RoomContext';

const DAY = 86400000;
const durationDays = (p: ProjectPhase): number | null => {
  const a = p.planned_start ?? p.start_date; const b = p.planned_due ?? p.due_date;
  if (!a || !b) return null;
  const d = Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY) + 1;
  return d > 0 ? d : null;
};
const ROLE_AR: Record<string, string> = { partner: 'الشريك', manager: 'مدير المشروع', lawyer: 'محامٍ', assistant: 'مساعد', researcher: 'باحث', external: 'جهة خارجية', client: 'العميل' };

/**
 * نقطة القرار: سؤال يُطرح بعد مرحلة معينة (غالباً بعد الحكم)، وكل خيار يفعّل مساراً من المراحل
 * المخفية ويطوي الباقي. من يقرر: من يملك صلاحية الموافقة (الشريك أو المدير).
 * تأتي من القالب، أو يقترحها رائد (فتنتظر اعتماد الفريق أو تجاهله)، أو يضيفها الفريق يدوياً.
 */
const DecisionPointModal: React.FC<{ pointId: number; onClose: () => void }> = ({ pointId, onClose }) => {
  const { project, canEdit, canApprove, refresh, goTo, setPhaseFilter, openDecisionForm } = useRoom();
  const dp: DecisionPoint | undefined = project.decision_points.find((d) => d.id === pointId);
  const [note, setNote] = useState(dp?.note ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  if (!dp) return null;

  const suggested = dp.status === 'suggested';
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

  const accept = async () => {
    setBusy('accept');
    try { const r = await ProjectService.acceptDecisionPoint(project.id, dp.id); toast.success(r.message || 'اعتُمدت نقطة القرار'); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر اعتماد نقطة القرار'); }
    finally { setBusy(null); }
  };

  const remove = async () => {
    const hiddenBranches = suggested || chosen ? 0 : project.phases.filter((p) => p.status === 'hidden' && dp.options.some((o) => o.activates.includes(p.id))).length;
    const msg = suggested
      ? `تجاهل اقتراح رائد «${dp.question}»؟ لن يعيده رائد.`
      : chosen
        ? `حذف نقطة القرار «${dp.question}»؟ المسار المختار يبقى كما هو.`
        : `حذف نقطة القرار «${dp.question}»؟${hiddenBranches ? ` ستُحذف معها ${hiddenBranches} مراحل مخفية لم يبدأ فيها عمل.` : ''}`;
    if (!window.confirm(msg)) return;
    setBusy('delete');
    try { const r = await ProjectService.deleteDecisionPoint(project.id, dp.id); toast.success(r.message); await refresh(); onClose(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); }
    finally { setBusy(null); }
  };

  const draftOf = (o: DecisionPointOption) => {
    const phs = o.phases ?? [];
    return { phs, tasks: phs.reduce((s, p) => s + p.tasks.length, 0), days: phs.reduce((s, p) => s + p.duration_days, 0) };
  };

  const foot = (
    <>
      {canEdit && !suggested && !chosen && <button type="button" className="prj-btn" disabled={busy !== null} onClick={() => { onClose(); openDecisionForm(dp.id); }}><Pencil size={12} /> تعديل</button>}
      {canEdit && <button type="button" className="prj-btn prj-btn--danger" disabled={busy !== null} onClick={remove}>{busy === 'delete' ? <Loader2 size={12} className="ssp2-spin" /> : <Trash2 size={12} />} {suggested ? 'تجاهل الاقتراح' : 'حذف'}</button>}
      <span className="prj-spacer" />
      {suggested && canEdit && <button type="button" className="prj-btn prj-btn--gold" disabled={busy !== null} onClick={accept}>{busy === 'accept' ? <Loader2 size={12} className="ssp2-spin" /> : <Sparkles size={12} />} اعتمد النقطة وأنشئ مساراتها</button>}
      <button type="button" className="prj-btn" onClick={onClose}>إغلاق</button>
    </>
  );

  return (
    <Modal title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><GitBranch size={14} style={{ color: 'var(--pj-gold)' }} /> {suggested ? 'نقطة قرار يقترحها رائد' : 'نقطة قرار'}</span>} onClose={onClose} wide foot={foot}>
      {suggested && (
        <div className="prj-dp__sug">
          <Sparkles size={14} />
          <div>
            <b>لماذا يقترحها رائد:</b> {dp.rationale ?? 'يرى رائد أن الفريق سيقف هنا ويختار مساراً.'}
            <br />
            <span className="prj-dim">لم يُنشأ شيء بعد. عند الاعتماد تُنشأ مراحل كل مسار مخفية بمهامها بعد «{after?.name ?? '—'}» وتظهر عند اختيار المسار. التجاهل يخفي الاقتراح ولا يعيده رائد.</span>
          </div>
        </div>
      )}
      <p className="prj-dp__q">{dp.question}</p>
      <div className="prj-dp__meta">
        <span><span className="k">تأتي بعد:</span> {after ? <button type="button" className="prj-link" onClick={() => { setPhaseFilter(after.id); goTo('tasks'); onClose(); }}>{after.name}</button> : '—'}</span>
        {expected && <span><span className="k">متوقعة:</span> <b className="num">{fmtDate(expected)}</b>{exp ? ` (${exp.label})` : ''}</span>}
        <span><span className="k">من يقرر:</span> {decider ? <><Av name={decider.name} /> {decider.name}</> : 'الشريك المسؤول'}{canApprove ? ' · أنت تملك القرار' : ''}</span>
        <span><span className="k">المصدر:</span> {DECISION_SOURCE_LABELS[dp.source] ?? dp.source}</span>
        <span><span className="k">الحالة:</span> {chosen ? <Chip tone="done">قُررت</Chip> : suggested ? <Chip tone="raed">اقتراح ينتظر الاعتماد</Chip> : afterDone ? <Chip tone="warn">جاهزة للقرار الآن</Chip> : <Chip tone="est">تنتظر إكمال «{after?.name ?? '—'}»</Chip>}</span>
      </div>

      {!suggested && dp.rationale && <div className="prj-dp__note"><b style={{ color: 'var(--pj-ink)' }}>لماذا هذه النقطة:</b> {dp.rationale}</div>}
      {chosen ? (
        <div className="prj-dp__note"><b style={{ color: 'var(--pj-ink)' }}>القرار:</b> {chosen.label}{dp.decided_by ? ` · قرره ${dp.decided_by.name}` : ''}{dp.decided_at ? ` · ${fmtDate(dp.decided_at)}` : ''}{dp.note ? <><br />السبب: {dp.note}</> : null}</div>
      ) : !suggested ? (
        <div className="prj-dp__note">عند اختيار المسار: مراحله تظهر وتبدأ من يوم القرار وتُزاح مواعيدها بالتساوي، والمسارات الأخرى تُطوى ولا تظهر في الخطة ولا للعميل. يُسجل القرار في الخط الزمني باسم من اختاره.</div>
      ) : null}

      <div className="prj-dp__opts">
        {dp.options.map((o) => {
          if (suggested) {
            const { phs, tasks, days } = draftOf(o);
            return (
              <div key={o.key} className="prj-dp__opt">
                <div className="prj-dp__opt__h">
                  <span className="prj-diamond prj-diamond--sug" />
                  <span>{o.label}</span>
                  <Chip tone="est">مسودة</Chip>
                </div>
                <div className="prj-dp__path">
                  <span className="prj-dim">سيُنشئ:</span>
                  {phs.length === 0 && <span className="prj-dim">لا مراحل لهذا الخيار (ينتهي المشروع أو يُتابع يدوياً)</span>}
                  {phs.map((p, i) => (
                    <React.Fragment key={`${o.key}-${i}`}>
                      {i > 0 && <span className="arrow">←</span>}
                      <span className="prj-dp__phase" title={p.objective ?? ''}><GitBranch size={10} /> {p.name} <small>{p.tasks.length} مهام · {p.duration_days} يوم</small></span>
                    </React.Fragment>
                  ))}
                  {phs.length > 0 && <span className="prj-dim num" style={{ marginInlineStart: 'auto' }}>{tasks} مهمة · نحو {days} يوم</span>}
                </div>
                {phs.some((p) => p.tasks.length > 0) && (
                  <ul className="prj-dp__tasks">
                    {phs.flatMap((p, pi) => p.tasks.map((t, ti) => <li key={`${o.key}-${pi}-${ti}`}>{t.title} <small>{ROLE_AR[t.role] ?? t.role} · {t.duration_days} يوم</small></li>))}
                  </ul>
                )}
              </div>
            );
          }
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

      {!chosen && !suggested && canApprove && <Field label="سبب القرار (يُحفظ في الخط الزمني)"><textarea className="prj-in" rows={2} style={{ minHeight: 56 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: الحكم صدر لصالحنا كاملاً فننتقل للتنفيذ" /></Field>}
      {!chosen && !suggested && !canApprove && <p className="prj-dim" style={{ margin: 0, fontSize: 11.5 }}>القرار لمن يملك صلاحية الموافقة في المشروع. تستطيع مناقشته في محادثة المشروع أو تسجيل توصية في سجل القرارات.</p>}
    </Modal>
  );
};

export default DecisionPointModal;
