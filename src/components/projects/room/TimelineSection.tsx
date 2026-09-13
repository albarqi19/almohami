import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { ProjectMap, ProjectMilestone } from '../../../types/projects';
import { MILESTONE_STATUS_LABELS, PHASE_STATUS_LABELS } from '../../../types/projects';
import { Chip, ErrorBox, Field, Modal, daysFromToday, fmtDate } from '../ui';
import { useRoom } from './RoomContext';

const DAY = 86400000;
const toDay = (s: string | null | undefined): number | null => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : Math.floor(d.getTime() / DAY);
};

/** الخط الزمني: المراحل كأشرطة على محور الأيام، والمواعيد الرئيسية معينات، وجلسات القضايا المربوطة. */
const TimelineSection: React.FC = () => {
  const { project, canEdit, refresh, goTo } = useRoom();
  const [map, setMap] = useState<ProjectMap | null>(null);
  const [msModal, setMsModal] = useState<{ ms: ProjectMilestone | null } | null>(null);

  const load = async () => {
    try { setMap(await ProjectService.map(project.id)); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر جلب الخريطة'); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id, project.updated_at]);

  const range = useMemo(() => {
    if (!map) return null;
    const days: number[] = [];
    map.phases.forEach((p) => { const a = toDay(p.start_date); const b = toDay(p.due_date); if (a !== null) days.push(a); if (b !== null) days.push(b); });
    map.milestones.forEach((m) => { const d = toDay(m.date); if (d !== null) days.push(d); });
    map.linked_events.forEach((le) => le.events.forEach((e) => { const d = toDay(e.date); if (d !== null) days.push(d); }));
    const today = Math.floor(Date.now() / DAY);
    days.push(today);
    if (days.length === 0) return null;
    const min = Math.min(...days) - 3;
    const max = Math.max(...days) + 7;
    return { min, max, span: Math.max(14, max - min), today };
  }, [map]);

  const pct = (day: number) => (range ? ((day - range.min) / range.span) * 100 : 0);

  const ticks = useMemo(() => {
    if (!range) return [];
    const out: Array<{ day: number; label: string }> = [];
    const start = new Date(range.min * DAY);
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (Math.floor(cursor.getTime() / DAY) <= range.max) {
      const d = Math.floor(cursor.getTime() / DAY);
      if (d >= range.min) out.push({ day: d, label: cursor.toLocaleDateString('ar-SA-u-nu-latn', { month: 'short', year: '2-digit' }) });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }, [range]);

  const saveMilestone = async (data: { name: string; date: string; phase_id: number | null; client_visible: boolean; note: string; status?: string }) => {
    try {
      if (msModal?.ms) await ProjectService.updateMilestone(project.id, msModal.ms.id, data);
      else await ProjectService.createMilestone(project.id, { ...data, source: 'manual' });
      setMsModal(null);
      await load();
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحفظ'); }
  };

  const removeMilestone = async (ms: ProjectMilestone) => {
    if (!window.confirm(`حذف الموعد «${ms.name}»؟`)) return;
    try { await ProjectService.deleteMilestone(project.id, ms.id); setMsModal(null); await load(); await refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); }
  };

  if (!map || !range) return <div className="prj-muted">جارٍ التحميل…</div>;
  const visiblePhases = map.phases.filter((p) => p.status !== 'skipped');

  return (
    <div>
      <div className="prj-legend">
        <span><i style={{ background: 'rgba(30,58,95,0.14)', border: '1px solid var(--law-navy)' }} /> مرحلة جارية</span>
        <span><i style={{ background: 'rgba(22,163,74,0.14)', border: '1px solid var(--status-green)' }} /> مكتملة</span>
        <span><i style={{ background: 'var(--quiet-gray-200)', border: '1px dashed var(--quiet-gray-400)' }} /> تنتظر قراراً</span>
        <span><i style={{ background: 'var(--law-gold)', transform: 'rotate(45deg)' }} /> موعد مقدر</span>
        <span><i style={{ background: 'var(--status-purple)', transform: 'rotate(45deg)' }} /> من المحكمة</span>
        <span><i style={{ background: 'var(--status-red)', transform: 'rotate(45deg)' }} /> فات</span>
        {canEdit && <button type="button" className="ssp2-btn" style={{ marginInlineStart: 'auto', padding: '3px 9px', fontSize: 11.5 }} onClick={() => setMsModal({ ms: null })}><Plus size={12} /> موعد رئيسي</button>}
      </div>
      <div className="prj-table-wrap">
        {/* عرض المحور يتبع طول المدة: ٤ بكسل لكل يوم حتى تبقى الأشرطة مقروءة، والتمرير أفقي داخل الحاوية */}
        <div className="prj-gantt" style={{ minWidth: Math.max(720, range.span * 4 + 220) }}>
          <div className="prj-gantt__axis">
            {ticks.map((t) => <span key={t.day} className="prj-gantt__tick" style={{ insetInlineStart: `${pct(t.day)}%` }}>{t.label}</span>)}
          </div>
          {visiblePhases.map((p) => {
            const a = toDay(p.start_date); const b = toDay(p.due_date);
            const late = p.status === 'active' && b !== null && b < range.today;
            const width = a !== null && b !== null ? Math.max(0.8, pct(b + 1) - pct(a)) : 0;
            const done = p.tasks_total ? Math.round((p.tasks_done / p.tasks_total) * 100) : (p.status === 'completed' ? 100 : 0);
            return (
              <div key={p.id} className="prj-gantt__row">
                <div className="prj-gantt__label" onClick={() => goTo('phases')} title={p.objective ?? undefined}>
                  <span>{p.order}. {p.name}</span>
                  <small>{PHASE_STATUS_LABELS[p.status]} · {p.tasks_done}/{p.tasks_total} مهام{p.owner ? ` · ${p.owner.name}` : ''}</small>
                </div>
                <div className="prj-gantt__track">
                  <span className="prj-gantt__today" style={{ insetInlineStart: `${pct(range.today)}%` }} />
                  {a !== null && (
                    <div className={`prj-gantt__bar prj-gantt__bar--${p.status} ${late ? 'prj-gantt__bar--late' : ''}`} style={{ insetInlineStart: `${pct(a)}%`, width: `${width}%` }} title={`${fmtDate(p.start_date)} → ${fmtDate(p.due_date)}`} onClick={() => goTo('phases')}>
                      <span className="prj-gantt__fill" style={{ width: `${done}%` }} />
                      <span style={{ position: 'relative' }}>{p.name}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div className="prj-gantt__row prj-gantt__msrow">
            <div className="prj-gantt__label"><span>المواعيد الرئيسية</span><small>{map.milestones.length} موعد</small></div>
            <div className="prj-gantt__track">
              <span className="prj-gantt__today" style={{ insetInlineStart: `${pct(range.today)}%` }} />
              {map.milestones.map((m) => { const d = toDay(m.date); if (d === null) return null; return (
                <span key={m.id} className={`prj-gantt__ms ${m.status === 'done' ? 'prj-gantt__ms--done' : ''} ${m.status === 'missed' ? 'prj-gantt__ms--missed' : ''} ${m.source_type ? 'prj-gantt__ms--court' : ''}`} style={{ insetInlineStart: `${pct(d)}%` }} title={`${m.name} · ${fmtDate(m.date)} · ${MILESTONE_STATUS_LABELS[m.status]}`} onClick={() => canEdit && !m.source_type && setMsModal({ ms: m })} />
              ); })}
            </div>
          </div>
          {map.linked_events.map((le) => (
            <div key={le.link.id} className="prj-gantt__row prj-gantt__msrow">
              <div className="prj-gantt__label"><span>{le.link.type_label}: {le.link.label}</span><small>{le.events.length} حدث</small></div>
              <div className="prj-gantt__track">
                <span className="prj-gantt__today" style={{ insetInlineStart: `${pct(range.today)}%` }} />
                {le.events.map((e) => { const d = toDay(e.date); if (d === null) return null; return (
                  <span key={`${e.kind}-${e.id}`} className={`prj-gantt__ms prj-gantt__ms--court ${e.status === 'cancelled' ? 'prj-gantt__ms--missed' : ''}`} style={{ insetInlineStart: `${pct(d)}%` }} title={`${e.name} · ${fmtDate(e.date)}${e.status ? ` · ${e.status}` : ''}`} />
                ); })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="prj-block" style={{ marginTop: 14 }}>
        <div className="prj-block__head">المواعيد الرئيسية بالتفصيل</div>
        <div className="prj-table-wrap">
          <table className="prj-table">
            <thead><tr><th>الموعد</th><th>التاريخ</th><th>المصدر</th><th>المرحلة</th><th>الحالة</th><th>للعميل</th>{canEdit && <th />}</tr></thead>
            <tbody>
              {map.milestones.length === 0 && <tr><td colSpan={7} className="muted">لا مواعيد بعد.</td></tr>}
              {map.milestones.map((m) => {
                const d = daysFromToday(m.date);
                return (
                  <tr key={m.id}>
                    <td><b>{m.name}</b>{m.note && <div className="muted">{m.note}</div>}</td>
                    <td className="num">{fmtDate(m.date)}{d && m.status === 'planned' ? <span className="muted"> · {d.label}</span> : null}</td>
                    <td className="muted">{m.source_type === 'case_session' ? 'جلسة من القضية' : m.source_type === 'case_judgement' ? 'حكم' : m.source === 'estimate' ? 'تقدير' : m.source === 'meeting' ? 'اجتماع' : m.source === 'case' ? 'واقعة من القضية' : 'يدوي'}</td>
                    <td className="muted">{project.phases.find((p) => p.id === m.phase_id)?.name ?? '—'}</td>
                    <td><Chip tone={m.status === 'done' ? 'done' : m.status === 'missed' ? 'bad' : m.status === 'cancelled' ? 'muted' : ''}>{MILESTONE_STATUS_LABELS[m.status]}</Chip></td>
                    <td className="muted">{m.client_visible ? 'يظهر' : 'لا'}</td>
                    {canEdit && <td className="prj-actions">{!m.source_type && <button type="button" className="prj-link" onClick={() => setMsModal({ ms: m })}>تعديل</button>}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
      {onDelete && <button type="button" className="ssp2-btn" style={{ marginInlineEnd: 'auto', color: 'var(--status-red)' }} onClick={onDelete}><Trash2 size={12} /> حذف</button>}
      <button type="button" className="ssp2-btn" onClick={onClose}>إلغاء</button>
      <button type="button" className="ssp2-btn ssp2-btn--primary" onClick={submit} disabled={busy}>حفظ</button>
    </>}>
      <ErrorBox error={err} />
      <div className="prj-form">
        <Field label="الاسم" full><input className="ssp2-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="التاريخ"><input type="date" className="ssp2-input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="المرحلة"><select className="ssp2-input" value={phaseId ?? ''} onChange={(e) => setPhaseId(e.target.value ? Number(e.target.value) : null)}><option value="">— بلا —</option>{project.phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        {ms && <Field label="الحالة"><select className="ssp2-input" value={status} onChange={(e) => setStatus(e.target.value as ProjectMilestone['status'])}>{Object.entries(MILESTONE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>}
        <Field label="ملاحظة" full><input className="ssp2-input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <label className="prj-check prj-form__full"><input type="checkbox" checked={clientVisible} onChange={(e) => setClientVisible(e.target.checked)} /> يظهر للعميل في بوابته</label>
      </div>
    </Modal>
  );
};

export default TimelineSection;
