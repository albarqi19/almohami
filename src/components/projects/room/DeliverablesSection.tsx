import React, { useEffect, useState } from 'react';
import { Check, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { ProjectDeliverable } from '../../../types/projects';
import { CHAIN_STEP_LABELS, DELIVERABLE_STATUS_LABELS, DELIVERABLE_TYPE_LABELS } from '../../../types/projects';
import { Av, Chip, ErrorBox, Field, Modal, UserSelect, fmtDayMonth } from '../ui';
import { useRoom } from './RoomContext';

const DEFAULT_CHAIN = ['draft', 'review', 'partner', 'final'];
const chainLabel = (k: string) => CHAIN_STEP_LABELS[k as keyof typeof CHAIN_STEP_LABELS] ?? k;

/** المخرجات كما في التصوّر: جدول بالنوع والمرحلة والمسؤول والموعد والنسخة وسلسلة الموافقة والحالة. */
const DeliverablesSection: React.FC = () => {
  const { project, canEdit, canApprove, users, refresh, openTask } = useRoom();
  const [items, setItems] = useState<ProjectDeliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ item: ProjectDeliverable | null } | null>(null);
  const [advance, setAdvance] = useState<ProjectDeliverable | null>(null);
  const [uploadFor, setUploadFor] = useState<ProjectDeliverable | null>(null);

  const load = async () => { setLoading(true); try { setItems(await ProjectService.deliverables(project.id)); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الجلب'); } finally { setLoading(false); } };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id]);

  const save = async (data: Record<string, unknown>) => { try { if (modal?.item) await ProjectService.updateDeliverable(project.id, modal.item.id, data); else await ProjectService.createDeliverable(project.id, data); setModal(null); await load(); await refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحفظ'); } };
  const remove = async (d: ProjectDeliverable) => { if (!window.confirm(`حذف المخرج «${d.name}»؟`)) return; try { await ProjectService.deleteDeliverable(project.id, d.id); setModal(null); await load(); await refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); } };
  const doAdvance = async (d: ProjectDeliverable, ok: boolean, note?: string) => { try { const r = await ProjectService.advanceDeliverable(project.id, d.id, ok, note); toast.success(r.message || 'تم'); setAdvance(null); await load(); await refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر التحريك'); } };
  const upload = async (d: ProjectDeliverable, file: File) => { try { await ProjectService.uploadDocument(project.id, file, { deliverable_id: d.id, title: `${d.name} · v${d.version + 1}` }); toast.success('رُفعت النسخة'); setUploadFor(null); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الرفع'); } };

  const final = items.filter((d) => d.status === 'final' || d.status === 'submitted').length;
  const working = items.filter((d) => ['in_progress', 'review', 'approval'].includes(d.status)).length;
  const upcoming = items.filter((d) => d.status === 'planned').length;
  const statusTone = (s: string) => (s === 'final' || s === 'submitted' ? 'done' : s === 'approval' || s === 'review' ? 'review' : s === 'in_progress' ? 'doing' : 'todo');
  const statusLabel = (d: ProjectDeliverable) => (d.status === 'approval' ? 'تنتظر الموافقة' : d.status === 'review' ? 'قيد المراجعة' : d.status === 'in_progress' ? 'قيد العمل' : d.status === 'planned' ? 'قادم' : DELIVERABLE_STATUS_LABELS[d.status]);

  return (
    <div className="prj-view">
      <div className="prj-subtools">
        <Chip tone="done">{final} نهائية</Chip><Chip tone="doing">{working} قيد العمل</Chip><Chip tone="todo">{upcoming} قادمة</Chip>
        <span className="prj-dim" style={{ fontSize: 11 }}>الخطوة الحالية في السلسلة هي من يملك الكرة الآن.</span>
        <span className="prj-spacer" />
        {canEdit && <button type="button" className="prj-btn prj-btn--sm" onClick={() => setModal({ item: null })}><Plus size={12} /> مخرج</button>}
      </div>
      <div className="prj-list--pad">
        {loading ? <div className="prj-empty">جارٍ التحميل…</div> : (
          <table className="prj-grid">
            <thead><tr><th style={{ width: '26%' }}>المخرج</th><th>النوع</th><th>المرحلة</th><th>المسؤول</th><th>الموعد</th><th>النسخة</th><th>سلسلة الموافقة</th><th>الحالة</th><th /></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={9} className="prj-dim">لا مخرجات مسجلة.</td></tr>}
              {items.map((d) => {
                const cur = d.current_step;
                const canAct = cur && d.status !== 'final' && d.status !== 'submitted' && (canApprove || (canEdit && !['partner', 'manager', 'client', 'counterparty'].includes(String(cur.key))));
                return (
                  <tr key={d.id}>
                    <td className="t" onClick={() => setModal({ item: d })}>{d.name}{d.client_visible && <span className="prj-dim" style={{ fontWeight: 400 }}> · للعميل</span>}{d.task && <div className="prj-dim" style={{ fontWeight: 400 }}><button type="button" className="prj-link" onClick={(e) => { e.stopPropagation(); openTask(d.task!.id); }}>{d.task.title}</button></div>}</td>
                    <td>{d.type_label}</td>
                    <td>{d.phase?.name ?? '—'}</td>
                    <td>{d.owner ? <Av name={d.owner.name} /> : '—'}</td>
                    <td className="num">{d.due_date ? fmtDayMonth(d.due_date) : '—'}</td>
                    <td className="num">{d.version ? `v${d.version}` : '—'}{d.document && <div className="prj-dim">{d.document.title}</div>}</td>
                    <td>
                      <span className="prj-chain">
                        {d.approval_chain.map((s, i) => <i key={`${s.key}-${i}`} className={s.status === 'done' ? 'is-done' : s.status === 'current' ? 'is-cur' : s.status === 'returned' ? 'is-returned' : ''} title={s.by ? `${s.by.name}${s.at ? ` · ${fmtDayMonth(s.at)}` : ''}` : undefined}>{s.label ?? chainLabel(String(s.key))}</i>)}
                        {d.approval_chain.length === 0 && <span className="prj-dim">بلا سلسلة</span>}
                      </span>
                    </td>
                    <td><Chip tone={statusTone(d.status)}>{statusLabel(d)}</Chip></td>
                    <td><span style={{ display: 'inline-flex', gap: 4 }}>
                      {canEdit && <button type="button" className="prj-ibtn" style={{ width: 22, height: 22 }} title="رفع نسخة" onClick={() => setUploadFor(d)}><Upload size={11} /></button>}
                      {canAct && <button type="button" className="prj-btn prj-btn--sm" onClick={() => setAdvance(d)}>{cur ? chainLabel(String(cur.key)) : ''}: قرار</button>}
                    </span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && <DeliverableModal item={modal.item} canEdit={canEdit} users={users} onClose={() => setModal(null)} onSave={save} onDelete={remove} />}
      {advance && <AdvanceModal item={advance} onClose={() => setAdvance(null)} onDecide={(ok, note) => doAdvance(advance, ok, note)} />}
      {uploadFor && (
        <Modal title={`رفع نسخة جديدة من «${uploadFor.name}»`} onClose={() => setUploadFor(null)}>
          <p className="prj-dim" style={{ margin: 0, fontSize: 12 }}>النسخة تُحفظ في مستندات المشروع وتُربط بالمخرج وترفع رقم نسخته.</p>
          <input type="file" className="prj-in" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(uploadFor, f); }} />
        </Modal>
      )}
    </div>
  );
};

const DeliverableModal: React.FC<{ item: ProjectDeliverable | null; canEdit: boolean; users: import('../../../services/UserService').User[]; onClose: () => void; onSave: (d: Record<string, unknown>) => Promise<void>; onDelete: (d: ProjectDeliverable) => void }> = ({ item, canEdit, users, onClose, onSave, onDelete }) => {
  const { project } = useRoom();
  const [f, setF] = useState({ name: item?.name ?? '', type: item?.type ?? 'memo', phase_id: (item?.phase?.id ?? null) as number | null, owner_id: (item?.owner?.id ?? null) as number | null, due_date: item?.due_date ?? '', client_visible: item?.client_visible ?? false, notes: item?.notes ?? '', status: item?.status ?? 'planned' });
  const [chain, setChain] = useState<string[]>(item ? item.approval_chain.map((s) => String(s.key)) : DEFAULT_CHAIN);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const order = Object.keys(CHAIN_STEP_LABELS);
  const toggle = (k: string) => setChain(chain.includes(k) ? chain.filter((c) => c !== k) : [...chain, k].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
  const submit = async () => { if (!f.name.trim()) { setErr('اسم المخرج مطلوب'); return; } setBusy(true); await onSave({ ...f, due_date: f.due_date || null, notes: f.notes || null, approval_chain: chain, status: item ? f.status : undefined }); setBusy(false); };
  return (
    <Modal title={item ? `مخرج #${item.number}` : 'مخرج جديد'} onClose={onClose} foot={<>
      {item && canEdit && <button type="button" className="prj-btn prj-btn--danger" style={{ marginInlineEnd: 'auto' }} onClick={() => onDelete(item)}><Trash2 size={12} /> حذف</button>}
      <button type="button" className="prj-btn" onClick={onClose}>إغلاق</button>
      {canEdit && <button type="button" className="prj-btn prj-btn--primary" onClick={submit} disabled={busy}>حفظ</button>}
    </>}>
      <ErrorBox error={err} />
      <fieldset disabled={!canEdit} style={{ border: 'none', padding: 0, margin: 0 }}>
        <div className="prj-form">
          <Field label="الاسم" full><input className="prj-in" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
          <Field label="النوع"><select className="prj-in" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as ProjectDeliverable['type'] })}>{Object.entries(DELIVERABLE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="المرحلة"><select className="prj-in" value={f.phase_id ?? ''} onChange={(e) => setF({ ...f, phase_id: e.target.value ? Number(e.target.value) : null })}><option value="">—</option>{project.phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="المسؤول"><UserSelect users={users} value={f.owner_id} onChange={(id) => setF({ ...f, owner_id: id })} /></Field>
          <Field label="الموعد"><input type="date" className="prj-in" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
          {item && <Field label="الحالة"><select className="prj-in" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ProjectDeliverable['status'] })}>{Object.entries(DELIVERABLE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>}
          <Field label="سلسلة الموافقة" full hint="اختر الخطوات بالترتيب. موافقة العميل تظهر له في بوابته عندما يصل دوره.">
            <div className="prj-chips">{order.map((k) => <button type="button" key={k} className={`prj-chip ${chain.includes(k) ? 'prj-chip--gate' : 'prj-chip--todo'}`} style={{ cursor: 'pointer' }} onClick={() => toggle(k)}>{chain.includes(k) && <Check size={10} />} {chainLabel(k)}</button>)}</div>
          </Field>
          <Field label="ملاحظات" full><textarea className="prj-in" rows={2} style={{ minHeight: 56 }} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          <label className="prj-check prj-form__full"><input type="checkbox" checked={f.client_visible} onChange={(e) => setF({ ...f, client_visible: e.target.checked })} /> يظهر للعميل في بوابته</label>
        </div>
      </fieldset>
    </Modal>
  );
};

const AdvanceModal: React.FC<{ item: ProjectDeliverable; onClose: () => void; onDecide: (ok: boolean, note?: string) => void }> = ({ item, onClose, onDecide }) => {
  const [note, setNote] = useState('');
  const step = item.current_step;
  return (
    <Modal title={`«${item.name}» · خطوة ${step ? (step.label ?? chainLabel(String(step.key))) : ''}`} onClose={onClose} foot={<>
      <button type="button" className="prj-btn prj-btn--danger" onClick={() => { if (!note.trim()) { toast.error('اكتب ملاحظة الإعادة'); return; } onDecide(false, note.trim()); }}><RotateCcw size={12} /> إعادة للمسودة</button>
      <button type="button" className="prj-btn prj-btn--primary" onClick={() => onDecide(true, note.trim() || undefined)}><Check size={12} /> اعتماد الخطوة</button>
    </>}>
      <p className="prj-dim" style={{ margin: 0, fontSize: 12, lineHeight: 1.7 }}>الاعتماد ينقل المخرج للخطوة التالية في السلسلة. الإعادة ترجعه للمسودة مع ملاحظتك وتُبلّغ المسؤول.</p>
      <Field label="ملاحظة"><textarea className="prj-in" rows={3} style={{ minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </Modal>
  );
};

export default DeliverablesSection;
