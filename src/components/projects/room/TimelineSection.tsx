import React, { useEffect, useMemo, useState } from 'react';
import { Eye, GitBranch, Layers, Plus, Scale, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { ProjectMap, ProjectMilestone, ProjectPhase } from '../../../types/projects';
import { MILESTONE_STATUS_LABELS } from '../../../types/projects';
import { ErrorBox, Field, Modal, fmtDate, fmtDayMonth } from '../ui';
import { useRoom } from './RoomContext';

const DAY = 86400000;
const toMs = (s?: string | null): number | null => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
};
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

/**
 * الجدول الزمني كما في التصوّر: صف لكل مسار بشريط تقدم، ومراحله أشرطة تحته، ونقطة القرار
 * ومساراتها المخفية بخط متقطع، والخطة الأصلية شبحاً تحت ما زُحزح، والمواعيد معينات بألوانها،
 * وجلسات القضايا المرتبطة في صف خاص. اليوم خط ذهبي.
 */
const TimelineSection: React.FC = () => {
  const { project, canEdit, refresh, goTo, setPhaseFilter } = useRoom();
  const [map, setMap] = useState<ProjectMap | null>(null);
  const [msModal, setMsModal] = useState<{ ms: ProjectMilestone | null } | null>(null);

  const load = async () => { try { setMap(await ProjectService.map(project.id)); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر جلب الخريطة'); } };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id, project.updated_at]);

  const scale = useMemo(() => {
    if (!map) return null;
    const stamps: number[] = [Date.now()];
    map.phases.forEach((p) => [p.start_date, p.due_date, p.planned_start, p.planned_due].forEach((d) => { const m = toMs(d); if (m !== null) stamps.push(m); }));
    map.milestones.forEach((m) => { const s = toMs(m.date); if (s !== null) stamps.push(s); });
    map.linked_events.forEach((le) => le.events.forEach((e) => { const s = toMs(e.date); if (s !== null) stamps.push(s); }));
    const minD = new Date(Math.min(...stamps));
    const maxD = new Date(Math.max(...stamps));
    const start = new Date(minD.getFullYear(), minD.getMonth(), 1);
    const end = new Date(maxD.getFullYear(), maxD.getMonth() + 2, 1);
    const months: Array<{ label: string; year: string; isToday: boolean }> = [];
    const now = new Date();
    for (let c = new Date(start); c < end; c.setMonth(c.getMonth() + 1)) {
      months.push({ label: MONTHS_AR[c.getMonth()], year: String(c.getFullYear()), isToday: c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear() });
    }
    const span = end.getTime() - start.getTime();
    return { start: start.getTime(), end: end.getTime(), span, months, pct: (ms: number) => Math.max(0, Math.min(100, ((ms - start.getTime()) / span) * 100)) };
  }, [map]);

  const saveMilestone = async (data: { name: string; date: string; phase_id: number | null; client_visible: boolean; note: string; status?: string }) => {
    try {
      if (msModal?.ms) await ProjectService.updateMilestone(project.id, msModal.ms.id, data);
      else await ProjectService.createMilestone(project.id, { ...data, source: 'manual' });
      setMsModal(null); await load(); await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحفظ'); }
  };
  const removeMilestone = async (ms: ProjectMilestone) => {
    if (!window.confirm(`حذف الموعد «${ms.name}»؟`)) return;
    try { await ProjectService.deleteMilestone(project.id, ms.id); setMsModal(null); await load(); await refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); }
  };

  if (!map || !scale) return <div className="prj-empty">جارٍ التحميل…</div>;

  const todayPct = scale.pct(Date.now());
  const todayLine = <i className="prj-map__today" style={{ right: `${todayPct}%` }} />;
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);

  const barStyle = (a: number | null, b: number | null): React.CSSProperties | null => {
    if (a === null) return null;
    const endMs = b !== null && b >= a ? b + DAY : a + DAY;
    const right = scale.pct(a);
    const width = Math.max(0.6, scale.pct(endMs) - right);
    return { right: `${right}%`, width: `${width}%` };
  };
  const phaseTone = (p: ProjectPhase, late: boolean) => p.status === 'completed' ? 'done' : p.status === 'active' || p.status === 'awaiting_approval' ? 'cur' : p.status === 'hidden' ? 'branch' : p.status === 'upcoming' ? 'next' : 'plan' + (late ? '' : '');
  const phaseProgress = (p: ProjectPhase) => (p.tasks_total ? Math.round((p.tasks_done / p.tasks_total) * 100) : (p.status === 'completed' ? 100 : 0));

  // تجميع المراحل حسب المسار بترتيب المسارات في الخطة
  const wsNames = map.workstreams.map((w) => w.name);
  project.phases.forEach((p) => { if (p.workstream && !wsNames.includes(p.workstream)) wsNames.push(p.workstream); });
  const groups = wsNames.map((name) => ({ name, phases: map.phases.filter((p) => p.workstream === name && p.status !== 'skipped') })).filter((g) => g.phases.length);
  const orphans = map.phases.filter((p) => !p.workstream && p.status !== 'skipped');
  if (orphans.length) groups.push({ name: 'المراحل', phases: orphans });

  // نقاط القرار: تظهر قبل أول مرحلة من فروعها
  const decisionForPhase = new Map<number, ProjectMap['decision_points'][number]>();
  map.decision_points.forEach((dp) => {
    const first = dp.options.flatMap((o) => o.activates).map((id) => map.phases.find((p) => p.id === id)).filter(Boolean).sort((a, b) => (a!.order - b!.order))[0];
    if (first) decisionForPhase.set(first.id, dp);
  });

  const renderPhaseRow = (p: ProjectPhase) => {
    const a = toMs(p.start_date); const b = toMs(p.due_date);
    const pa = toMs(p.planned_start); const pb = toMs(p.planned_due);
    const shifted = pa !== null && a !== null && (pa !== a || pb !== b);
    const late = p.status === 'active' && b !== null && b < today0.getTime();
    const style = barStyle(a, b);
    const ghost = shifted ? barStyle(pa, pb) : null;
    const isBranch = p.status === 'hidden' || p.activation === 'decision';
    const dp = decisionForPhase.get(p.id);
    const pct = phaseProgress(p);
    return (
      <React.Fragment key={p.id}>
        {dp && (
          <div className="prj-map__row prj-map__row--dec">
            <div className="prj-map__label"><GitBranch size={13} /><span className="t">نقطة القرار: {dp.question}</span>{dp.chosen_key && <span className="prj-chip prj-chip--gate">قُرر</span>}</div>
            <div className="prj-map__track">{todayLine}{(() => { const after = map.phases.find((x) => x.id === dp.after_phase_id); const d = toMs(after?.due_date); return d !== null ? <><span className="prj-ms prj-ms--dec" style={{ right: `${scale.pct(d)}%` }} title={dp.question} /><span className="prj-ms__l" style={{ right: `${scale.pct(d)}%` }}>{dp.chosen_key ? dp.options.find((o) => o.key === dp.chosen_key)?.label : 'يُختار المسار بعد الحكم'}<small>{fmtDayMonth(after?.due_date)}</small></span></> : null; })()}</div>
          </div>
        )}
        <div className={`prj-map__row ${isBranch ? 'prj-map__row--branch' : ''} ${ghost ? 'prj-map__row--tall' : ''}`}>
          <div className="prj-map__label prj-map__label--click" onClick={() => { setPhaseFilter(p.id); goTo('tasks'); }} title={p.objective ?? p.name}>
            {isBranch ? <span className="prj-dim">↳</span> : <span className="prj-dim num">{p.order}</span>}
            <span className="t">{p.name}</span>
            {p.requires_approval && <ShieldCheck size={12} style={{ color: 'var(--pj-navy)' }} />}
            {p.client_visible && <Eye size={12} style={{ color: 'var(--pj-violet)' }} />}
            <span className="prj-mi num">{p.tasks_done}/{p.tasks_total}</span>
          </div>
          <div className="prj-map__track">
            {todayLine}
            {style && (
              <div className={`prj-mbar prj-mbar--${phaseTone(p, late)} ${late ? 'prj-mbar--late' : ''}`} style={style} title={`${fmtDate(p.start_date)} → ${fmtDate(p.due_date)} · ${pct}٪`} onClick={() => { setPhaseFilter(p.id); goTo('tasks'); }}>
                {p.status === 'active' && <span className="prj-mbar__fill" style={{ width: `${pct}%` }} />}
                <span>{p.name}{p.status === 'active' ? ` · ${pct}٪` : ''}</span>
              </div>
            )}
            {p.requires_approval && b !== null && <span className="prj-gate-ic" style={{ right: `${scale.pct(b + DAY)}%` }} title="تحتاج موافقة الشريك قبل الانتقال"><ShieldCheck size={10} /></span>}
            {ghost && <span className="prj-mghost" style={ghost} title={`الخطة الأصلية: ${fmtDate(p.planned_start)} → ${fmtDate(p.planned_due)}`} />}
          </div>
        </div>
      </React.Fragment>
    );
  };

  // المواعيد: مستويان للتسميات حتى لا تتراكب
  const sortedMs = [...map.milestones].filter((m) => m.status !== 'cancelled' && toMs(m.date) !== null).sort((x, y) => (toMs(x.date)! - toMs(y.date)!));

  return (
    <div className="prj-view">
      <div className="prj-map" style={{ ['--pj-months' as string]: scale.months.length }}>
        <div style={{ minWidth: 270 + scale.months.length * 64 }}>
        <div className="prj-map__row prj-map__row--head">
          <div className="prj-map__label"><Layers size={13} /><span className="t">المسارات والمراحل</span></div>
          <div className="prj-map__track" style={{ backgroundImage: 'none' }}>
            <div className="prj-map__months">{scale.months.map((m, i) => <div key={i} className={`prj-map__m ${m.isToday ? 'is-today' : ''}`}><b>{m.label}</b><span>{m.year}</span></div>)}</div>
            {todayLine}
          </div>
        </div>

        {groups.map((g) => {
          const dates = g.phases.flatMap((p) => [toMs(p.start_date), toMs(p.due_date)]).filter((x): x is number => x !== null);
          const done = g.phases.reduce((s, p) => s + p.tasks_done, 0); const tot = g.phases.reduce((s, p) => s + p.tasks_total, 0);
          const style = dates.length ? barStyle(Math.min(...dates), Math.max(...dates)) : null;
          return (
            <React.Fragment key={g.name}>
              <div className="prj-map__row prj-map__row--ws">
                <div className="prj-map__label"><Layers size={13} style={{ color: 'var(--pj-gold)' }} /><span className="t">{g.name}</span><span className="prj-mi num">{done}/{tot}</span></div>
                <div className="prj-map__track">{todayLine}{style && <span className="prj-mbar prj-mbar--ws" style={style}><b style={{ width: `${tot ? Math.round((done / tot) * 100) : 0}%` }} /></span>}</div>
              </div>
              {g.phases.map(renderPhaseRow)}
            </React.Fragment>
          );
        })}

        <div className="prj-map__row prj-map__row--ws">
          <div className="prj-map__label"><span className="t">المواعيد الرئيسية</span><span className="prj-mi num">{sortedMs.length}</span></div>
          <div className="prj-map__track">{todayLine}</div>
        </div>
        <div className="prj-map__row prj-map__row--ms">
          <div className="prj-map__label"><span className="t prj-dim">محدد · تقديري · من ناجز · تم</span></div>
          <div className="prj-map__track">
            {todayLine}
            {sortedMs.map((m, i) => {
              const ms = toMs(m.date)!;
              const cls = m.status === 'done' ? 'prj-ms--done' : m.status === 'missed' ? 'prj-ms--missed' : m.source_type === 'case_session' || m.source_type === 'case_judgement' ? 'prj-ms--najiz' : m.source === 'estimate' ? 'prj-ms--est' : '';
              const editable = canEdit && !m.source_type;
              return (
                <React.Fragment key={m.id}>
                  <span className={`prj-ms ${cls}`} style={{ right: `${scale.pct(ms)}%`, cursor: editable ? 'pointer' : 'default' }} title={`${m.name} · ${fmtDate(m.date)} · ${MILESTONE_STATUS_LABELS[m.status]}`} onClick={() => editable && setMsModal({ ms: m })} />
                  <span className={`prj-ms__l ${i % 2 ? 'prj-ms__l--l1' : ''}`} style={{ right: `${scale.pct(ms)}%` }}>{m.name}<small>{fmtDayMonth(m.date)}{m.source === 'estimate' ? ' · تقديري' : ''}</small></span>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {map.linked_events.length > 0 && (
          <div className="prj-map__row prj-map__row--ws">
            <div className="prj-map__label"><Scale size={13} style={{ color: 'var(--pj-gold)' }} /><span className="t">ما يرتبط بالمشروع · يُقرأ تلقائياً</span></div>
            <div className="prj-map__track">{todayLine}</div>
          </div>
        )}
        {map.linked_events.map((le) => (
          <div key={le.link.id} className="prj-map__row prj-map__row--tall">
            <div className="prj-map__label"><span className="prj-chip prj-chip--todo">{le.link.type_label}</span><span className="t" title={le.link.label}>{le.link.label}</span><span className="prj-mi num">{le.events.length}</span></div>
            <div className="prj-map__track">
              {todayLine}
              {le.events.map((e, i) => { const ms = toMs(e.date); if (ms === null) return null; const past = ms < today0.getTime(); return (
                <React.Fragment key={`${e.kind}-${e.id}-${i}`}>
                  <span className={`prj-ms ${e.kind === 'session' ? (e.status === 'cancelled' ? 'prj-ms--missed' : past ? 'prj-ms--done' : 'prj-ms--najiz') : e.kind === 'judgement' ? 'prj-ms--dec' : 'prj-ms--est'}`} style={{ right: `${scale.pct(ms)}%`, cursor: 'default' }} title={`${e.name} · ${fmtDate(e.date)}${e.status ? ` · ${e.status}` : ''}`} />
                  {!past && <span className="prj-ms__l" style={{ right: `${scale.pct(ms)}%` }}>{e.name}<small>{fmtDayMonth(e.date)}</small></span>}
                </React.Fragment>
              ); })}
            </div>
          </div>
        ))}
        </div>
      </div>

      <div className="prj-legend">
        <span><i style={{ background: 'var(--pj-ok-tint)' }} /> مكتملة</span>
        <span><i style={{ background: 'var(--pj-info-tint)', border: '1px solid var(--pj-info)' }} /> جارية</span>
        <span><i style={{ background: 'var(--pj-paper)', border: '1px solid var(--pj-line)' }} /> مخططة</span>
        <span><i style={{ border: '1px dashed var(--pj-ink-3)' }} /> مسار مخفي حتى القرار</span>
        <span><span className="d" style={{ background: 'var(--pj-navy)' }} /> موعد محدد</span>
        <span><span className="d" style={{ background: 'var(--pj-paper)', border: '2px solid var(--pj-navy)', boxSizing: 'border-box' }} /> تقديري</span>
        <span><span className="d" style={{ background: 'var(--pj-bad)' }} /> جلسة من ناجز</span>
        <span><span className="d" style={{ background: 'var(--pj-gold)' }} /> نقطة قرار</span>
        <span><i style={{ borderTop: '2px dashed var(--pj-ink-3)', height: 0 }} /> الخطة الأصلية</span>
        <span className="prj-spacer" />
        {canEdit && <button type="button" className="prj-btn prj-btn--sm" onClick={() => setMsModal({ ms: null })}><Plus size={12} /> موعد رئيسي</button>}
      </div>

      {msModal && <MilestoneModal ms={msModal.ms} onClose={() => setMsModal(null)} onSave={saveMilestone} onDelete={msModal.ms ? () => removeMilestone(msModal.ms!) : undefined} />}
    </div>
  );
};

const MilestoneModal: React.FC<{ ms: ProjectMilestone | null; onClose: () => void; onSave: (d: { name: string; date: string; phase_id: number | null; client_visible: boolean; note: string; status?: string }) => Promise<void>; onDelete?: () => void }> = ({ ms, onClose, onSave, onDelete }) => {
  const { project } = useRoom();
  const [name, setName] = useState(ms?.name ?? '');
  const [date, setDate] = useState(ms?.date ?? '');
  const [phaseId, setPhaseId] = useState<number | null>(ms?.phase_id ?? null);
  const [clientVisible, setClientVisible] = useState(ms?.client_visible ?? true);
  const [note, setNote] = useState(ms?.note ?? '');
  const [status, setStatus] = useState(ms?.status ?? 'planned');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim() || !date) { setErr('الاسم والتاريخ مطلوبان'); return; }
    setBusy(true);
    await onSave({ name: name.trim(), date, phase_id: phaseId, client_visible: clientVisible, note: note.trim(), status: ms ? status : undefined });
    setBusy(false);
  };
  return (
    <Modal title={ms ? 'تعديل موعد رئيسي' : 'موعد رئيسي جديد'} onClose={onClose} foot={<>
      {onDelete && <button type="button" className="prj-btn prj-btn--danger" style={{ marginInlineEnd: 'auto' }} onClick={onDelete}><Trash2 size={12} /> حذف</button>}
      <button type="button" className="prj-btn" onClick={onClose}>إلغاء</button>
      <button type="button" className="prj-btn prj-btn--primary" onClick={submit} disabled={busy}>حفظ</button>
    </>}>
      <ErrorBox error={err} />
      <div className="prj-form">
        <Field label="الاسم" full><input className="prj-in" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="التاريخ"><input type="date" className="prj-in" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="المرحلة"><select className="prj-in" value={phaseId ?? ''} onChange={(e) => setPhaseId(e.target.value ? Number(e.target.value) : null)}><option value="">— بلا —</option>{project.phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        {ms && <Field label="الحالة"><select className="prj-in" value={status} onChange={(e) => setStatus(e.target.value as ProjectMilestone['status'])}>{Object.entries(MILESTONE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>}
        <Field label="ملاحظة" full><input className="prj-in" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <label className="prj-check prj-form__full"><input type="checkbox" checked={clientVisible} onChange={(e) => setClientVisible(e.target.checked)} /> يظهر للعميل في بوابته</label>
      </div>
    </Modal>
  );
};

export default TimelineSection;
