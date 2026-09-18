import React, { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { ProjectDecision, ProjectIssue, ProjectRisk, RiskMatrix } from '../../../types/projects';
import { DECISION_STATUS_LABELS, ISSUE_IMPORTANCE_LABELS, ISSUE_STATUS_LABELS, RISK_LEVEL_LABELS, RISK_STATUS_LABELS } from '../../../types/projects';
import { Av, Chip, ErrorBox, Field, Modal, UserSelect, fmtDayMonth } from '../ui';
import { useRoom } from './RoomContext';

type Kind = 'issues' | 'risks' | 'decisions';

/** السجلات الثلاثة كما في التصوّر: المسائل بطاقات فيها «أين وصلنا»، المخاطر جدول ومصفوفة، القرارات جدول بالسبب والحاضرين. */
const RecordsSection: React.FC<{ kind: Kind }> = ({ kind }) => {
  const { project, canEdit, users, refresh, consumePending } = useRoom();
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
  useEffect(() => {
    if ((kind === 'issues' && consumePending('issue')) || (kind === 'risks' && consumePending('risk')) || (kind === 'decisions' && consumePending('decision'))) setModal({ item: null });
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [kind]);

  const save = async (data: Record<string, unknown>) => {
    try {
      const id = modal?.item?.id;
      if (kind === 'issues') { if (id) await ProjectService.updateIssue(project.id, id, data); else await ProjectService.createIssue(project.id, data); }
      if (kind === 'risks') { if (id) await ProjectService.updateRisk(project.id, id, data); else await ProjectService.createRisk(project.id, data); }
      if (kind === 'decisions') { if (id) await ProjectService.updateDecision(project.id, id, data); else await ProjectService.createDecision(project.id, data); }
      setModal(null); await load(); await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحفظ'); }
  };
  const remove = async (id: number) => {
    if (!window.confirm('حذف هذا السجل؟')) return;
    try {
      if (kind === 'issues') await ProjectService.deleteIssue(project.id, id);
      if (kind === 'risks') await ProjectService.deleteRisk(project.id, id);
      if (kind === 'decisions') await ProjectService.deleteDecision(project.id, id);
      setModal(null); await load(); await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); }
  };

  const importanceLabel = (v: string, status: string) => `${ISSUE_STATUS_LABELS[status as keyof typeof ISSUE_STATUS_LABELS] ?? status}${v === 'critical' ? ' · مهمة جداً' : v === 'high' ? ' · مهمة' : ''}`;
  const lvl = (score: number) => (score >= 6 ? 'h' : score >= 3 ? 'm' : 'l');

  return (
    <div className="prj-view">
      {kind === 'issues' && (
        <>
          <div className="prj-subtools">
            <Chip tone="warn">{issues.filter((i) => i.status === 'open' || i.status === 'in_progress').length} مفتوحة</Chip>
            <Chip tone="done">{issues.filter((i) => i.status === 'answered').length} مجابة</Chip>
            <label className="prj-check"><input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> أظهر المغلقة</label>
            <span className="prj-dim" style={{ fontSize: 11 }}>المسألة سؤال قانوني يحتاج جواباً قبل خطوة في الخطة.</span>
            <span className="prj-spacer" />
            {canEdit && <button type="button" className="prj-btn prj-btn--sm" onClick={() => setModal({ item: null })}><Plus size={12} /> مسألة</button>}
          </div>
          {loading ? <div className="prj-empty">جارٍ التحميل…</div> : (
            <div className="prj-iss">
              {issues.filter((i) => showClosed || i.status !== 'closed').length === 0 && <div className="prj-empty" style={{ gridColumn: '1 / -1' }}>لا مسائل مسجلة.</div>}
              {issues.filter((i) => showClosed || i.status !== 'closed').map((i) => (
                <div key={i.id} className={`prj-icard ${i.status === 'answered' || i.status === 'closed' ? 'prj-icard--closed' : ''}`} onClick={() => setModal({ item: i })}>
                  <div className="prj-icard__h">
                    <span className="prj-icard__n">#{i.number}</span>
                    <Chip tone={i.status === 'answered' ? 'done' : i.status === 'closed' ? 'todo' : i.importance === 'critical' || i.importance === 'high' ? 'bad' : 'warn'}>{importanceLabel(i.importance, i.status)}</Chip>
                    <span className="prj-spacer" />
                    {i.source === 'template' && <Chip tone="raed">من الخطة</Chip>}
                  </div>
                  <div className="prj-icard__q">{i.question}</div>
                  <div className="prj-icard__meta">
                    {i.owner && <span>المسؤول: <Av name={i.owner.name} /> {i.owner.name}</span>}
                    {i.reviewer && <span>المراجع: <Av name={i.reviewer.name} /> {i.reviewer.name}</span>}
                    {i.due_date && <span className="num">الموعد: {fmtDayMonth(i.due_date)}</span>}
                  </div>
                  {(i.phase || i.decision_id || (i.links && i.links.length > 0)) && (
                    <div className="prj-icard__meta">
                      {i.phase && <Chip tone="todo">{i.phase.name}</Chip>}
                      {i.decision_id && <Chip tone="gate">القرار #{i.decision_id}</Chip>}
                      {(i.links ?? []).map((l, k) => <Chip key={k} tone="todo">{l.label ?? `${l.type} ${l.id}`}</Chip>)}
                    </div>
                  )}
                  {(i.answer || i.progress_note) && <div className="prj-icard__ans"><b>{i.answer ? 'الجواب:' : 'أين وصلنا:'}</b> {i.answer ?? i.progress_note}</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {kind === 'risks' && (
        <>
          <div className="prj-subtools">
            <Chip tone="bad">{risks.filter((r) => r.level === 'high' && r.status !== 'closed').length} عالية</Chip>
            <Chip tone="warn">{risks.filter((r) => r.level === 'medium' && r.status !== 'closed').length} متوسطة</Chip>
            <label className="prj-check"><input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> أظهر المغلقة</label>
            <span className="prj-spacer" />
            {canEdit && <button type="button" className="prj-btn prj-btn--sm" onClick={() => setModal({ item: null })}><Plus size={12} /> مخاطرة</button>}
          </div>
          <div className="prj-split">
            <div className="prj-list--pad">
              {loading ? <div className="prj-empty">جارٍ التحميل…</div> : (
                <table className="prj-grid">
                  <thead><tr><th style={{ width: '32%' }}>المخاطرة</th><th>الاحتمال</th><th>الأثر</th><th>الدرجة</th><th>المسؤول</th><th>التخفيف</th><th>الموعد</th><th>الحالة</th></tr></thead>
                  <tbody>
                    {risks.filter((r) => showClosed || r.status !== 'closed').length === 0 && <tr><td colSpan={8} className="prj-dim">لا مخاطر مسجلة.</td></tr>}
                    {risks.filter((r) => showClosed || r.status !== 'closed').map((r) => (
                      <tr key={r.id} className={r.status === 'closed' ? 'is-dim' : ''}>
                        <td className="t" onClick={() => setModal({ item: r })}>{r.title}</td>
                        <td>{RISK_LEVEL_LABELS[r.probability]}</td><td>{RISK_LEVEL_LABELS[r.impact]}</td>
                        <td><Chip tone={r.status === 'closed' ? 'todo' : r.level === 'high' ? 'bad' : r.level === 'medium' ? 'warn' : 'ok'}>{r.status === 'closed' ? 'انتهت' : `${RISK_LEVEL_LABELS[r.level]}ة`}</Chip></td>
                        <td>{r.owner ? <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><Av name={r.owner.name} /> {r.owner.name}</span> : '—'}</td>
                        <td className="wrap" style={{ maxWidth: 260 }}>{r.mitigation ?? '—'}{r.mitigation_task && <div className="prj-dim">مهمة: {r.mitigation_task.title}</div>}</td>
                        <td className="num">{r.due_date ? fmtDayMonth(r.due_date) : '—'}</td>
                        <td><Chip tone={r.status === 'occurred' ? 'bad' : r.status === 'closed' ? 'done' : r.status === 'monitoring' ? 'doing' : 'doing'}>{RISK_STATUS_LABELS[r.status]}</Chip></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="prj-split__side">
              <div className="prj-card__head"><AlertTriangle size={14} /> مصفوفة المخاطر</div>
              {matrix && (
                <div className="prj-matrix">
                  <span /><span>أثر منخفض</span><span>متوسط</span><span>عالٍ</span>
                  {(['high', 'medium', 'low'] as const).map((p) => (
                    <React.Fragment key={p}>
                      <span>{p === 'high' ? 'احتمال عالٍ' : p === 'medium' ? 'متوسط' : 'منخفض'}</span>
                      {(['low', 'medium', 'high'] as const).map((i) => { const score = ({ low: 1, medium: 2, high: 3 })[p] * ({ low: 1, medium: 2, high: 3 })[i]; return <span key={i} className={`c m-${lvl(score)}`}>{matrix[p]?.[i] ?? 0}</span>; })}
                    </React.Fragment>
                  ))}
                </div>
              )}
              <div className="prj-sec__body" style={{ fontSize: 11.5 }}>الدرجة = الاحتمال × الأثر. المخاطرة التي تتحقق تتحول إلى مسألة أو مهمة، وتبقى في السجل.</div>
            </div>
          </div>
        </>
      )}

      {kind === 'decisions' && (
        <>
          <div className="prj-subtools">
            <Chip tone="bad">{decisions.filter((d) => d.status === 'pending').length} تنتظر</Chip>
            <Chip tone="done">{decisions.filter((d) => d.status === 'decided').length} متخذة</Chip>
            <span className="prj-dim" style={{ fontSize: 11 }}>ماذا قررنا، متى، من، ولماذا. يُرجع إليه عند الخلاف.</span>
            <span className="prj-spacer" />
            {canEdit && <button type="button" className="prj-btn prj-btn--sm" onClick={() => setModal({ item: null })}><Plus size={12} /> قرار</button>}
          </div>
          <div className="prj-list--pad">
            {loading ? <div className="prj-empty">جارٍ التحميل…</div> : (
              <table className="prj-grid">
                <thead><tr><th style={{ width: '30%' }}>القرار</th><th>التاريخ</th><th>من قرر</th><th style={{ width: '26%' }}>السبب</th><th>الحاضرون</th><th>مرتبط بـ</th><th>الحالة</th></tr></thead>
                <tbody>
                  {decisions.length === 0 && <tr><td colSpan={7} className="prj-dim">لا قرارات مسجلة بعد.</td></tr>}
                  {decisions.map((d) => (
                    <tr key={d.id}>
                      <td className="t" onClick={() => setModal({ item: d })}>{d.title}{d.details && <div className="prj-dim" style={{ fontWeight: 400 }}>{d.details}</div>}</td>
                      <td className="num">{d.status === 'pending' ? (d.decided_on ? `مطلوب قبل ${fmtDayMonth(d.decided_on)}` : 'ينتظر') : fmtDayMonth(d.decided_on)}</td>
                      <td>{d.decided_by ? <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><Av name={d.decided_by.name} /> {d.decided_by.name}</span> : '—'}</td>
                      <td className="wrap">{d.reason ?? '—'}</td>
                      <td className="wrap">{d.attendees ?? '—'}</td>
                      <td><span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>{(d.links ?? []).map((l, k) => <Chip key={k} tone="todo">{l.label ?? `${l.type} ${l.id}`}</Chip>)}{d.issue_id && <Chip tone="todo">مسألة #{d.issue_id}</Chip>}{!(d.links ?? []).length && !d.issue_id && '—'}</span></td>
                      <td><Chip tone={d.status === 'decided' ? 'done' : d.status === 'reversed' ? 'todo' : 'bad'}>{d.status === 'pending' ? 'ينتظر' : DECISION_STATUS_LABELS[d.status]}</Chip></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
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
    {id && canEdit && <button type="button" className="prj-btn prj-btn--danger" style={{ marginInlineEnd: 'auto' }} onClick={() => onDelete(id)}><Trash2 size={12} /> حذف</button>}
    <button type="button" className="prj-btn" onClick={onClose}>{canEdit ? 'إلغاء' : 'إغلاق'}</button>
    {canEdit && <button type="button" className="prj-btn prj-btn--primary" onClick={onSubmit} disabled={busy}>حفظ</button>}
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
          <Field label="السؤال" full><textarea className="prj-in" rows={2} style={{ minHeight: 56 }} value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} autoFocus /></Field>
          <Field label="تفاصيل" full><textarea className="prj-in" rows={2} style={{ minHeight: 56 }} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></Field>
          <Field label="الأهمية"><select className="prj-in" value={f.importance} onChange={(e) => setF({ ...f, importance: e.target.value as ProjectIssue['importance'] })}>{Object.entries(ISSUE_IMPORTANCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="الحالة"><select className="prj-in" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ProjectIssue['status'] })}>{Object.entries(ISSUE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="المسؤول عن الجواب"><UserSelect users={users} value={f.owner_id} onChange={(id) => setF({ ...f, owner_id: id })} /></Field>
          <Field label="المراجع"><UserSelect users={users} value={f.reviewer_id} onChange={(id) => setF({ ...f, reviewer_id: id })} /></Field>
          <Field label="المرحلة"><select className="prj-in" value={f.phase_id ?? ''} onChange={(e) => setF({ ...f, phase_id: e.target.value ? Number(e.target.value) : null })}><option value="">—</option>{project.phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="الموعد"><input type="date" className="prj-in" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
          <Field label="أين وصلنا" full><input className="prj-in" value={f.progress_note} onChange={(e) => setF({ ...f, progress_note: e.target.value })} placeholder="ملاحظة تقدم قصيرة" /></Field>
          <Field label="الجواب" full><textarea className="prj-in" rows={4} style={{ minHeight: 90 }} value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} placeholder="الجواب القانوني بعد البحث" /></Field>
        </div>
      </fieldset>
    </Modal>
  );
};

const RiskModal: React.FC<ModalProps<ProjectRisk>> = ({ item, users, canEdit, onClose, onSave, onDelete }) => {
  const [f, setF] = useState({ title: item?.title ?? '', details: item?.details ?? '', probability: item?.probability ?? 'medium', impact: item?.impact ?? 'medium', status: item?.status ?? 'open', owner_id: item?.owner?.id ?? null, mitigation: item?.mitigation ?? '', due_date: item?.due_date ?? '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => { if (!f.title.trim()) { setErr('عنوان المخاطرة مطلوب'); return; } setBusy(true); await onSave({ ...f, due_date: f.due_date || null, details: f.details || null, mitigation: f.mitigation || null }); setBusy(false); };
  return (
    <Modal title={item ? `مخاطرة #${item.number}` : 'مخاطرة جديدة'} onClose={onClose} foot={<Foot id={item?.id} canEdit={canEdit} busy={busy} onClose={onClose} onSubmit={submit} onDelete={onDelete} />}>
      <ErrorBox error={err} />
      <fieldset disabled={!canEdit} style={{ border: 'none', padding: 0, margin: 0 }}>
        <div className="prj-form">
          <Field label="ما الذي قد يحدث؟" full><input className="prj-in" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></Field>
          <Field label="تفاصيل" full><textarea className="prj-in" rows={2} style={{ minHeight: 56 }} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></Field>
          <Field label="الاحتمال"><select className="prj-in" value={f.probability} onChange={(e) => setF({ ...f, probability: e.target.value as ProjectRisk['probability'] })}>{Object.entries(RISK_LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="الأثر"><select className="prj-in" value={f.impact} onChange={(e) => setF({ ...f, impact: e.target.value as ProjectRisk['impact'] })}>{Object.entries(RISK_LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="الحالة"><select className="prj-in" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ProjectRisk['status'] })}>{Object.entries(RISK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="المسؤول"><UserSelect users={users} value={f.owner_id} onChange={(id) => setF({ ...f, owner_id: id })} /></Field>
          <Field label="ماذا نفعل لتقليله؟ (التخفيف)" full><textarea className="prj-in" rows={2} style={{ minHeight: 56 }} value={f.mitigation} onChange={(e) => setF({ ...f, mitigation: e.target.value })} /></Field>
          <Field label="موعد المراجعة"><input type="date" className="prj-in" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
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
          <Field label="القرار" full><input className="prj-in" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></Field>
          <Field label="تفاصيل" full><textarea className="prj-in" rows={2} style={{ minHeight: 56 }} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></Field>
          <Field label="لماذا؟ (السبب)" full><textarea className="prj-in" rows={2} style={{ minHeight: 56 }} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
          <Field label={f.status === 'pending' ? 'مطلوب قبل' : 'التاريخ'}><input type="date" className="prj-in" value={f.decided_on} onChange={(e) => setF({ ...f, decided_on: e.target.value })} /></Field>
          <Field label="من قرر"><UserSelect users={users} value={f.decided_by} onChange={(id) => setF({ ...f, decided_by: id })} /></Field>
          <Field label="الحالة"><select className="prj-in" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ProjectDecision['status'] })}>{Object.entries(DECISION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="الحاضرون"><input className="prj-in" value={f.attendees} onChange={(e) => setF({ ...f, attendees: e.target.value })} /></Field>
        </div>
      </fieldset>
    </Modal>
  );
};

export default RecordsSection;
