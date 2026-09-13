import React, { useEffect, useState } from 'react';
import { Check, ChevronLeft, FileText, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { ProjectDeliverable } from '../../../types/projects';
import { CHAIN_STEP_LABELS, DELIVERABLE_STATUS_LABELS, DELIVERABLE_TYPE_LABELS } from '../../../types/projects';
import { Chip, ErrorBox, Field, Modal, UserSelect, fmtDate } from '../ui';
import { useRoom } from './RoomContext';

const DEFAULT_CHAIN = ['draft', 'review', 'partner', 'final'];

/** المخرجات: ما سيخرج من المشروع (مذكرة، عقد، لائحة…) وأين هو في سلسلة الموافقة، ونسخته الحالية. */
const DeliverablesSection: React.FC = () => {
  const { project, canEdit, canApprove, users, refresh, openTask } = useRoom();
  const [items, setItems] = useState<ProjectDeliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ item: ProjectDeliverable | null } | null>(null);
  const [advance, setAdvance] = useState<ProjectDeliverable | null>(null);
  const [uploadFor, setUploadFor] = useState<ProjectDeliverable | null>(null);

  const load = async () => {
    setLoading(true);
    try { setItems(await ProjectService.deliverables(project.id)); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الجلب'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id]);

  const save = async (data: Record<string, unknown>) => {
    try {
      if (modal?.item) await ProjectService.updateDeliverable(project.id, modal.item.id, data);
      else await ProjectService.createDeliverable(project.id, data);
      setModal(null); await load(); await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحفظ'); }
  };

  const remove = async (d: ProjectDeliverable) => {
    if (!window.confirm(`حذف المخرج «${d.name}»؟`)) return;
    try { await ProjectService.deleteDeliverable(project.id, d.id); setModal(null); await load(); await refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); }
  };

  const doAdvance = async (d: ProjectDeliverable, ok: boolean, note?: string) => {
    try { const r = await ProjectService.advanceDeliverable(project.id, d.id, ok, note); toast.success(r.message || 'تم'); setAdvance(null); await load(); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر التحريك'); }
  };

  const upload = async (d: ProjectDeliverable, file: File) => {
    try { await ProjectService.uploadDocument(project.id, file, { deliverable_id: d.id, title: `${d.name} · نسخة ${d.version + 1}` }); toast.success('رُفعت النسخة'); setUploadFor(null); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الرفع'); }
  };

  return (
    <div>
      <div className="prj-main__tools" style={{ justifyContent: 'flex-start', marginBottom: 10 }}>
        {canEdit && <button type="button" className="ssp2-btn ssp2-btn--primary" onClick={() => setModal({ item: null })}><Plus size={13} /> مخرج جديد</button>}
        <span className="prj-muted">كل مخرج له سلسلة موافقة: مسودة ← مراجعة ← الشريك ← نهائي (وتُضاف موافقة العميل عند الحاجة). الخطوة الحالية هي من يملك الكرة الآن.</span>
      </div>
      {loading ? <div className="prj-muted">جارٍ التحميل…</div> : (
        <div className="prj-block prj-block__body--flush">
          <div className="prj-table-wrap">
            <table className="prj-table">
              <thead><tr><th>#</th><th>المخرج</th><th>النوع</th><th>المرحلة · المهمة</th><th>المسؤول</th><th>الموعد</th><th>الحالة</th><th>سلسلة الموافقة</th><th>النسخة</th><th /></tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={10} className="muted">لا مخرجات مسجلة.</td></tr>}
                {items.map((d) => {
                  const current = d.current_step;
                  return (
                    <tr key={d.id}>
                      <td className="num">{d.number}</td>
                      <td><button type="button" className="prj-link" style={{ textDecoration: 'none', fontWeight: 700 }} onClick={() => setModal({ item: d })}>{d.name}</button>{d.client_visible && <div className="muted">يظهر للعميل</div>}</td>
                      <td className="muted">{d.type_label}</td>
                      <td className="muted">{d.phase?.name ?? '—'}{d.task && <div><button type="button" className="prj-link" onClick={() => openTask(d.task!.id)}>{d.task.title}</button></div>}</td>
                      <td>{d.owner?.name ?? '—'}</td>
                      <td className="num">{fmtDate(d.due_date)}</td>
                      <td><Chip tone={d.status === 'final' || d.status === 'submitted' ? 'done' : d.status === 'approval' ? 'warn' : d.status === 'planned' ? 'muted' : 'navy'}>{DELIVERABLE_STATUS_LABELS[d.status]}</Chip></td>
                      <td>
                        <div className="prj-chain">
                          {d.approval_chain.map((s, i) => (
                            <React.Fragment key={`${s.key}-${i}`}>
                              {i > 0 && <span className="prj-chain__arrow"><ChevronLeft size={10} /></span>}
                              <span className={`prj-chain__step prj-chain__step--${s.status}`} title={s.by ? `${s.by.name} · ${fmtDate(s.at)}` : undefined}>{s.label ?? CHAIN_STEP_LABELS[s.key as keyof typeof CHAIN_STEP_LABELS] ?? s.key}</span>
                            </React.Fragment>
                          ))}
                          {d.approval_chain.length === 0 && <span className="muted">بلا سلسلة</span>}
                        </div>
                      </td>
                      <td className="num">{d.version ? `ن${d.version}` : '—'}{d.document && <div className="muted"><FileText size={10} /> {d.document.title}</div>}</td>
                      <td className="prj-actions">
                        {canEdit && <button type="button" className="ssp2-icon-btn" title="رفع نسخة" onClick={() => setUploadFor(d)}><Upload size={13} /></button>}
                        {current && (canApprove || (canEdit && !['partner', 'manager', 'client', 'counterparty'].includes(String(current.key)))) && d.status !== 'final' && d.status !== 'submitted' && (
                          <button type="button" className="ssp2-btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setAdvance(d)}>{current.label ?? CHAIN_STEP_LABELS[current.key as keyof typeof CHAIN_STEP_LABELS] ?? current.key}: قرار</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && <DeliverableModal item={modal.item} canEdit={canEdit} onClose={() => setModal(null)} onSave={save} onDelete={remove} />}
      {advance && (
        <AdvanceModal item={advance} onClose={() => setAdvance(null)} onDecide={(ok, note) => doAdvance(advance, ok, note)} />
      )}
      {uploadFor && (
        <Modal title={`رفع نسخة جديدة من «${uploadFor.name}»`} onClose={() => setUploadFor(null)}>
          <p className="ssp2-hint">النسخة تُحفظ في مستندات المشروع وتُربط بالمخرج وترفع رقم نسخته.</p>
          <input type="file" className="ssp2-input" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(uploadFor, f); }} />
        </Modal>
      )}
    </div>
  );
};

const DeliverableModal: React.FC<{ item: ProjectDeliverable | null; canEdit: boolean; onClose: () => void; onSave: (d: Record<string, unknown>) => Promise<void>; onDelete: (d: ProjectDeliverable) => void }> = ({ item, canEdit, onClose, onSave, onDelete }) => {
  const { project, users } = useRoom();
  const [f, setF] = useState({ name: item?.name ?? '', type: item?.type ?? 'memo', phase_id: item?.phase?.id ?? null as number | null, owner_id: item?.owner?.id ?? null as number | null, due_date: item?.due_date ?? '', client_visible: item?.client_visible ?? false, notes: item?.notes ?? '', status: item?.status ?? 'planned' });
  const [chain, setChain] = useState<string[]>(item ? item.approval_chain.map((s) => String(s.key)) : DEFAULT_CHAIN);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.name.trim()) { setErr('اسم المخرج مطلوب'); return; }
    setBusy(true);
    await onSave({ ...f, due_date: f.due_date || null, notes: f.notes || null, approval_chain: chain, status: item ? f.status : undefined });
    setBusy(false);
  };
  const toggle = (k: string) => setChain(chain.includes(k) ? chain.filter((c) => c !== k) : [...chain, k].sort((a, b) => Object.keys(CHAIN_STEP_LABELS).indexOf(a) - Object.keys(CHAIN_STEP_LABELS).indexOf(b)));
  return (
    <Modal title={item ? `مخرج #${item.number}` : 'مخرج جديد'} onClose={onClose} foot={<>
      {item && canEdit && <button type="button" className="ssp2-btn" style={{ marginInlineEnd: 'auto', color: 'var(--status-red)' }} onClick={() => onDelete(item)}><Trash2 size={12} /> حذف</button>}
      <button type="button" className="ssp2-btn" onClick={onClose}>إغلاق</button>
      {canEdit && <button type="button" className="ssp2-btn ssp2-btn--primary" onClick={submit} disabled={busy}>حفظ</button>}
    </>}>
      <ErrorBox error={err} />
      <fieldset disabled={!canEdit} style={{ border: 'none', padding: 0, margin: 0 }}>
        <div className="prj-form">
          <Field label="الاسم" full><input className="ssp2-input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
          <Field label="النوع"><select className="ssp2-input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as ProjectDeliverable['type'] })}>{Object.entries(DELIVERABLE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="المرحلة"><select className="ssp2-input" value={f.phase_id ?? ''} onChange={(e) => setF({ ...f, phase_id: e.target.value ? Number(e.target.value) : null })}><option value="">—</option>{project.phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="المسؤول"><UserSelect users={users} value={f.owner_id} onChange={(id) => setF({ ...f, owner_id: id })} /></Field>
          <Field label="الموعد"><input type="date" className="ssp2-input" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
          {item && <Field label="الحالة"><select className="ssp2-input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ProjectDeliverable['status'] })}>{Object.entries(DELIVERABLE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>}
          <Field label="سلسلة الموافقة" full hint="اختر الخطوات بالترتيب. موافقة العميل تظهر له في بوابته عندما يصل دوره.">
            <div className="prj-chips">
              {Object.entries(CHAIN_STEP_LABELS).map(([k, v]) => (
                <button type="button" key={k} className={`prj-chip ${chain.includes(k) ? 'prj-chip--navy' : ''}`} style={{ cursor: 'pointer' }} onClick={() => toggle(k)}>{chain.includes(k) && <Check size={10} />} {v}</button>
              ))}
            </div>
          </Field>
          <Field label="ملاحظات" full><textarea className="ssp2-input" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
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
    <Modal title={`«${item.name}» · خطوة ${step?.label ?? CHAIN_STEP_LABELS[step?.key as keyof typeof CHAIN_STEP_LABELS] ?? ''}`} onClose={onClose} foot={<>
      <button type="button" className="ssp2-btn" style={{ color: 'var(--status-red)' }} onClick={() => { if (!note.trim()) { toast.error('اكتب ملاحظة الإعادة'); return; } onDecide(false, note.trim()); }}><RotateCcw size={12} /> إعادة للمسودة</button>
      <button type="button" className="ssp2-btn ssp2-btn--primary" onClick={() => onDecide(true, note.trim() || undefined)}><Check size={12} /> اعتماد الخطوة</button>
    </>}>
      <p className="ssp2-hint">الاعتماد ينقل المخرج للخطوة التالية في السلسلة. الإعادة ترجعه للمسودة مع ملاحظتك وتُبلّغ المسؤول.</p>
      <Field label="ملاحظة"><textarea className="ssp2-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </Modal>
  );
};

export default DeliverablesSection;
