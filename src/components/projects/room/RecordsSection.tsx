import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { ProjectDecision, ProjectIssue, ProjectRisk, RiskMatrix } from '../../../types/projects';
import { DECISION_STATUS_LABELS, ISSUE_IMPORTANCE_LABELS, ISSUE_STATUS_LABELS, RISK_LEVEL_LABELS, RISK_STATUS_LABELS } from '../../../types/projects';
import { Chip, ErrorBox, Field, Modal, UserSelect, fmtDate } from '../ui';
import { useRoom } from './RoomContext';

type Kind = 'issues' | 'risks' | 'decisions';

const toneImportance = (v: string) => (v === 'critical' || v === 'high' ? 'bad' : v === 'medium' ? 'warn' : 'muted');
const toneLevel = (v: string) => (v === 'high' ? 'bad' : v === 'medium' ? 'warn' : 'done');

/** السجلات الثلاثة: المسائل القانونية (أسئلة تحتاج جواباً)، المخاطر (احتمال × أثر)، القرارات (ماذا قررنا ولماذا). */
const RecordsSection: React.FC<{ kind: Kind }> = ({ kind }) => {
  const { project, canEdit, users, refresh } = useRoom();
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [matrix, setMatrix] = useState<RiskMatrix | null>(null);
  const [decisions, setDecisions] = useState<ProjectDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ item: ProjectIssue | ProjectRisk | ProjectDecision | null } | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (kind === 'issues') setIssues(await ProjectService.issues(project.id));
      if (kind === 'risks') { const r = await ProjectService.risks(project.id); setRisks(r.items); setMatrix(r.matrix); }
      if (kind === 'decisions') setDecisions(await ProjectService.decisions(project.id));
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الجلب'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [kind, project.id]);

  const save = async (data: Record<string, unknown>) => {
    try {
      const id = modal?.item?.id;
      if (kind === 'issues') id ? await ProjectService.updateIssue(project.id, id, data) : await ProjectService.createIssue(project.id, data);
      if (kind === 'risks') id ? await ProjectService.updateRisk(project.id, id, data) : await ProjectService.createRisk(project.id, data);
      if (kind === 'decisions') id ? await ProjectService.updateDecision(project.id, id, data) : await ProjectService.createDecision(project.id, data);
      setModal(null);
      await load();
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحفظ'); }
  };

  const remove = async (id: number) => {
    if (!window.confirm('حذف هذا السجل؟')) return;
    try {
      if (kind === 'issues') await ProjectService.deleteIssue(project.id, id);
      if (kind === 'risks') await ProjectService.deleteRisk(project.id, id);
      if (kind === 'decisions') await ProjectService.deleteDecision(project.id, id);
      setModal(null);
      await load();
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); }
  };

  const title = kind === 'issues' ? 'مسألة' : kind === 'risks' ? 'خطر' : 'قرار';

  return (
    <div>
      <div className="prj-main__tools" style={{ justifyContent: 'flex-start', marginBottom: 10 }}>
        {canEdit && <button type="button" className="ssp2-btn ssp2-btn--primary" onClick={() => setModal({ item: null })}><Plus size={13} /> {title} جديد{kind === 'issues' ? 'ة' : ''}</button>}
        <label className="prj-check"><input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> أظهر المغلق</label>
        {kind === 'issues' && <span className="prj-muted">المسألة سؤال قانوني يحتاج جواباً قبل خطوة في الخطة. اربطها بمسؤول وموعد.</span>}
        {kind === 'risks' && <span className="prj-muted">الخطر شيء قد يحدث ويضر بالمشروع. الدرجة = الاحتمال × الأثر.</span>}
        {kind === 'decisions' && <span className="prj-muted">سجل القرارات: ماذا قررنا، متى، من، ولماذا. يُرجع إليه عند الخلاف.</span>}
      </div>

      {kind === 'risks' && matrix && (
        <div className="prj-block"><div className="prj-block__head">مصفوفة المخاطر القائمة</div>
          <div className="prj-block__body">
            <div className="prj-matrix">
              <div className="prj-matrix__cell prj-matrix__cell--h">الاحتمال ↓ / الأثر →</div>
              {(['low', 'medium', 'high'] as const).map((i) => <div key={i} className="prj-matrix__cell prj-matrix__cell--h" style={{ textAlign: 'center' }}>{RISK_LEVEL_LABELS[i]}</div>)}
              {(['high', 'medium', 'low'] as const).map((p) => (
                <React.Fragment key={p}>
                  <div className="prj-matrix__cell prj-matrix__cell--h">{RISK_LEVEL_LABELS[p]}</div>
                  {(['low', 'medium', 'high'] as const).map((i) => {
                    const score = ({ low: 1, medium: 2, high: 3 })[p] * ({ low: 1, medium: 2, high: 3 })[i];
                    const lvl = score >= 6 ? 3 : score >= 3 ? 2 : 1;
                    return <div key={i} className={`prj-matrix__cell prj-matrix__cell--lvl${lvl}`}>{matrix[p]?.[i] ?? 0}</div>;
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="prj-muted">جارٍ التحميل…</div> : (
        <div className="prj-block prj-block__body--flush">
          <div className="prj-table-wrap">
            {kind === 'issues' && (
              <table className="prj-table">
                <thead><tr><th>#</th><th>المسألة</th><th>الأهمية</th><th>الحالة</th><th>المسؤول</th><th>المراجع</th><th>المرحلة</th><th>الموعد</th></tr></thead>
                <tbody>
                  {issues.filter((i) => showClosed || i.status !== 'closed').map((i) => (
                    <tr key={i.id} className="prj-clickable" onClick={() => setModal({ item: i })}>
                      <td className="num">{i.number}</td>
                      <td><b>{i.question}</b>{i.answer && <div className="muted">الجواب: {i.answer.slice(0, 120)}{i.answer.length > 120 ? '…' : ''}</div>}</td>
                      <td><Chip tone={toneImportance(i.importance)}>{ISSUE_IMPORTANCE_LABELS[i.importance]}</Chip></td>
                      <td><Chip tone={i.status === 'answered' ? 'done' : i.status === 'closed' ? 'muted' : i.status === 'in_progress' ? 'navy' : 'warn'}>{ISSUE_STATUS_LABELS[i.status]}</Chip></td>
                      <td>{i.owner?.name ?? '—'}</td><td>{i.reviewer?.name ?? '—'}</td><td className="muted">{i.phase?.name ?? '—'}</td><td className="num">{fmtDate(i.due_date)}</td>
                    </tr>
                  ))}
                  {issues.length === 0 && <tr><td colSpan={8} className="muted">لا مسائل مسجلة.</td></tr>}
                </tbody>
              </table>
            )}
            {kind === 'risks' && (
              <table className="prj-table">
                <thead><tr><th>#</th><th>الخطر</th><th>الاحتمال</th><th>الأثر</th><th>الدرجة</th><th>الحالة</th><th>المسؤول</th><th>الإجراء الوقائي</th></tr></thead>
                <tbody>
                  {risks.filter((r) => showClosed || r.status !== 'closed').map((r) => (
                    <tr key={r.id} className="prj-clickable" onClick={() => setModal({ item: r })}>
                      <td className="num">{r.number}</td>
                      <td><b>{r.title}</b>{r.details && <div className="muted">{r.details.slice(0, 100)}</div>}</td>
                      <td>{RISK_LEVEL_LABELS[r.probability]}</td><td>{RISK_LEVEL_LABELS[r.impact]}</td>
                      <td><Chip tone={toneLevel(r.level)}>{r.score} · {RISK_LEVEL_LABELS[r.level]}</Chip></td>
                      <td><Chip tone={r.status === 'occurred' ? 'bad' : r.status === 'closed' ? 'muted' : r.status === 'monitoring' ? 'navy' : 'warn'}>{RISK_STATUS_LABELS[r.status]}</Chip></td>
                      <td>{r.owner?.name ?? '—'}</td>
                      <td className="muted">{r.mitigation ?? '—'}{r.mitigation_task && <div>مهمة: {r.mitigation_task.title}</div>}</td>
                    </tr>
                  ))}
                  {risks.length === 0 && <tr><td colSpan={8} className="muted">لا مخاطر مسجلة.</td></tr>}
                </tbody>
              </table>
            )}
            {kind === 'decisions' && (
              <table className="prj-table">
                <thead><tr><th>#</th><th>القرار</th><th>التاريخ</th><th>من قرر</th><th>الحالة</th><th>السبب</th></tr></thead>
                <tbody>
                  {decisions.map((d) => (
                    <tr key={d.id} className="prj-clickable" onClick={() => setModal({ item: d })}>
                      <td className="num">{d.number}</td>
                      <td><b>{d.title}</b>{d.details && <div className="muted">{d.details.slice(0, 120)}</div>}{d.links?.length ? <div className="muted">{d.links.map((l) => l.label).filter(Boolean).join(' · ')}</div> : null}</td>
                      <td className="num">{fmtDate(d.decided_on)}</td><td>{d.decided_by?.name ?? '—'}</td>
                      <td><Chip tone={d.status === 'decided' ? 'done' : d.status === 'reversed' ? 'muted' : 'warn'}>{DECISION_STATUS_LABELS[d.status]}</Chip></td>
                      <td className="muted">{d.reason ?? '—'}</td>
                    </tr>
                  ))}
                  {decisions.length === 0 && <tr><td colSpan={6} className="muted">لا قرارات مسجلة بعد.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {modal && kind === 'issues' && <IssueModal item={modal.item as ProjectIssue | null} users={users} canEdit={canEdit} onClose={() => setModal(null)} onSave={save} onDelete={remove} />}
      {modal && kind === 'risks' && <RiskModal item={modal.item as ProjectRisk | null} users={users} canEdit={canEdit} onClose={() => setModal(null)} onSave={save} onDelete={remove} />}
      {modal && kind === 'decisions' && <DecisionModal item={modal.item as ProjectDecision | null} users={users} canEdit={canEdit} onClose={() => setModal(null)} onSave={save} onDelete={remove} />}
    </div>
  );
};

type ModalProps<T> = { item: T | null; users: import('../../../services/UserService').User[]; canEdit: boolean; onClose: () => void; onSave: (d: Record<string, unknown>) => Promise<void>; onDelete: (id: number) => void };

const Foot: React.FC<{ id?: number; canEdit: boolean; busy: boolean; onClose: () => void; onSubmit: () => void; onDelete: (id: number) => void }> = ({ id, canEdit, busy, onClose, onSubmit, onDelete }) => (
  <>
    {id && canEdit && <button type="button" className="ssp2-btn" style={{ marginInlineEnd: 'auto', color: 'var(--status-red)' }} onClick={() => onDelete(id)}><Trash2 size={12} /> حذف</button>}
    <button type="button" className="ssp2-btn" onClick={onClose}>{canEdit ? 'إلغاء' : 'إغلاق'}</button>
    {canEdit && <button type="button" className="ssp2-btn ssp2-btn--primary" onClick={onSubmit} disabled={busy}>حفظ</button>}
  </>
);

const IssueModal: React.FC<ModalProps<ProjectIssue>> = ({ item, users, canEdit, onClose, onSave, onDelete }) => {
  const { project } = useRoom();
  const [f, setF] = useState({ question: item?.question ?? '', details: item?.details ?? '', importance: item?.importance ?? 'medium', status: item?.status ?? 'open', owner_id: item?.owner?.id ?? null, reviewer_id: item?.reviewer?.id ?? null, phase_id: item?.phase?.id ?? null, due_date: item?.due_date ?? '', answer: item?.answer ?? '', progress_note: item?.progress_note ?? '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => { if (!f.question.trim()) { setErr('نص المسألة مطلوب'); return; } setBusy(true); await onSave({ ...f, due_date: f.due_date || null, answer: f.answer || null, progress_note: f.progress_note || null, details: f.details || null }); setBusy(false); };
  return (
    <Modal title={item ? `مسألة #${item.number}` : 'مسألة قانونية جديدة'} onClose={onClose} foot={<Foot id={item?.id} canEdit={canEdit} busy={busy} onClose={onClose} onSubmit={submit} onDelete={onDelete} />}>
      <ErrorBox error={err} />
      <fieldset disabled={!canEdit} style={{ border: 'none', padding: 0, margin: 0 }}>
        <div className="prj-form">
          <Field label="السؤال" full><textarea className="ssp2-input" rows={2} value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} autoFocus /></Field>
          <Field label="تفاصيل" full><textarea className="ssp2-input" rows={2} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></Field>
          <Field label="الأهمية"><select className="ssp2-input" value={f.importance} onChange={(e) => setF({ ...f, importance: e.target.value as ProjectIssue['importance'] })}>{Object.entries(ISSUE_IMPORTANCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="الحالة"><select className="ssp2-input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ProjectIssue['status'] })}>{Object.entries(ISSUE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="المسؤول عن الجواب"><UserSelect users={users} value={f.owner_id} onChange={(id) => setF({ ...f, owner_id: id })} /></Field>
          <Field label="المراجع"><UserSelect users={users} value={f.reviewer_id} onChange={(id) => setF({ ...f, reviewer_id: id })} /></Field>
          <Field label="المرحلة"><select className="ssp2-input" value={f.phase_id ?? ''} onChange={(e) => setF({ ...f, phase_id: e.target.value ? Number(e.target.value) : null })}><option value="">—</option>{project.phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="الموعد"><input type="date" className="ssp2-input" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
          <Field label="الجواب" full><textarea className="ssp2-input" rows={4} value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} placeholder="الجواب القانوني بعد البحث" /></Field>
          <Field label="ملاحظة تقدم" full><input className="ssp2-input" value={f.progress_note} onChange={(e) => setF({ ...f, progress_note: e.target.value })} /></Field>
        </div>
      </fieldset>
    </Modal>
  );
};

const RiskModal: React.FC<ModalProps<ProjectRisk>> = ({ item, users, canEdit, onClose, onSave, onDelete }) => {
  const [f, setF] = useState({ title: item?.title ?? '', details: item?.details ?? '', probability: item?.probability ?? 'medium', impact: item?.impact ?? 'medium', status: item?.status ?? 'open', owner_id: item?.owner?.id ?? null, mitigation: item?.mitigation ?? '', due_date: item?.due_date ?? '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => { if (!f.title.trim()) { setErr('عنوان الخطر مطلوب'); return; } setBusy(true); await onSave({ ...f, due_date: f.due_date || null, details: f.details || null, mitigation: f.mitigation || null }); setBusy(false); };
  return (
    <Modal title={item ? `خطر #${item.number}` : 'خطر جديد'} onClose={onClose} foot={<Foot id={item?.id} canEdit={canEdit} busy={busy} onClose={onClose} onSubmit={submit} onDelete={onDelete} />}>
      <ErrorBox error={err} />
      <fieldset disabled={!canEdit} style={{ border: 'none', padding: 0, margin: 0 }}>
        <div className="prj-form">
          <Field label="ما الذي قد يحدث؟" full><input className="ssp2-input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></Field>
          <Field label="تفاصيل" full><textarea className="ssp2-input" rows={2} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></Field>
          <Field label="الاحتمال"><select className="ssp2-input" value={f.probability} onChange={(e) => setF({ ...f, probability: e.target.value as ProjectRisk['probability'] })}>{Object.entries(RISK_LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="الأثر"><select className="ssp2-input" value={f.impact} onChange={(e) => setF({ ...f, impact: e.target.value as ProjectRisk['impact'] })}>{Object.entries(RISK_LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="الحالة"><select className="ssp2-input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ProjectRisk['status'] })}>{Object.entries(RISK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="المسؤول"><UserSelect users={users} value={f.owner_id} onChange={(id) => setF({ ...f, owner_id: id })} /></Field>
          <Field label="ماذا نفعل لتقليله؟" full><textarea className="ssp2-input" rows={2} value={f.mitigation} onChange={(e) => setF({ ...f, mitigation: e.target.value })} /></Field>
          <Field label="موعد المراجعة"><input type="date" className="ssp2-input" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
        </div>
      </fieldset>
    </Modal>
  );
};

const DecisionModal: React.FC<ModalProps<ProjectDecision>> = ({ item, users, canEdit, onClose, onSave, onDelete }) => {
  const [f, setF] = useState({ title: item?.title ?? '', details: item?.details ?? '', decided_on: item?.decided_on ?? new Date().toISOString().slice(0, 10), decided_by: item?.decided_by?.id ?? null, reason: item?.reason ?? '', attendees: item?.attendees ?? '', status: item?.status ?? 'decided' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => { if (!f.title.trim()) { setErr('نص القرار مطلوب'); return; } setBusy(true); await onSave({ ...f, details: f.details || null, reason: f.reason || null, attendees: f.attendees || null, decided_on: f.decided_on || null }); setBusy(false); };
  return (
    <Modal title={item ? `قرار #${item.number}` : 'قرار جديد'} onClose={onClose} foot={<Foot id={item?.id} canEdit={canEdit} busy={busy} onClose={onClose} onSubmit={submit} onDelete={onDelete} />}>
      <ErrorBox error={err} />
      <fieldset disabled={!canEdit} style={{ border: 'none', padding: 0, margin: 0 }}>
        <div className="prj-form">
          <Field label="القرار" full><input className="ssp2-input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></Field>
          <Field label="تفاصيل" full><textarea className="ssp2-input" rows={2} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></Field>
          <Field label="لماذا؟" full><textarea className="ssp2-input" rows={2} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
          <Field label="التاريخ"><input type="date" className="ssp2-input" value={f.decided_on} onChange={(e) => setF({ ...f, decided_on: e.target.value })} /></Field>
          <Field label="من قرر"><UserSelect users={users} value={f.decided_by} onChange={(id) => setF({ ...f, decided_by: id })} /></Field>
          <Field label="الحالة"><select className="ssp2-input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ProjectDecision['status'] })}>{Object.entries(DECISION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="الحاضرون"><input className="ssp2-input" value={f.attendees} onChange={(e) => setF({ ...f, attendees: e.target.value })} /></Field>
        </div>
      </fieldset>
    </Modal>
  );
};

export default RecordsSection;
