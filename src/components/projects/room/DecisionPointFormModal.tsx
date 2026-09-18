import React, { useState } from 'react';
import { GitBranch, Loader2, Plus, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { DecisionPointInput } from '../../../types/projects';
import { ErrorBox, Field, Modal } from '../ui';
import { useRoom } from './RoomContext';

interface OptionRow { key?: string; label: string; activates: number[] }

/**
 * نقطة قرار يدوية: السؤال، والمرحلة التي تسبقها، وخياران فأكثر لكل منها مراحل قائمة تُفعَّل عند اختياره
 * وتبقى مخفية قبله. الخيار بلا مراحل يعني أن المشروع ينتهي أو يُتابع يدوياً.
 */
const DecisionPointFormModal: React.FC<{ pointId?: number; onClose: () => void }> = ({ pointId, onClose }) => {
  const { project, refresh } = useRoom();
  const existing = pointId ? project.decision_points.find((d) => d.id === pointId) : undefined;
  const [question, setQuestion] = useState(existing?.question ?? '');
  const [afterId, setAfterId] = useState<number | null>(existing?.after_phase_id ?? (project.phases.find((p) => p.status === 'active')?.id ?? null));
  const [rationale, setRationale] = useState(existing?.rationale ?? '');
  const [options, setOptions] = useState<OptionRow[]>(existing
    ? existing.options.map((o) => ({ key: o.key, label: o.label, activates: [...o.activates] }))
    : [{ label: '', activates: [] }, { label: '', activates: [] }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // المراحل التي يمكن أن يفعّلها خيار: غير مكتملة ولا مطوية، وليست المرحلة السابقة، ولا مربوطة بنقطة قرار أخرى
  const takenByOthers = new Set(project.decision_points.filter((d) => d.id !== existing?.id && d.status !== 'dismissed').flatMap((d) => d.options.flatMap((o) => o.activates)));
  const candidates = project.phases.filter((p) => p.status !== 'completed' && p.status !== 'skipped' && p.id !== afterId && !takenByOthers.has(p.id));
  const afterCandidates = project.phases.filter((p) => p.status !== 'skipped' && p.status !== 'hidden');
  const usedElsewhere = (phaseId: number, idx: number) => options.some((o, i) => i !== idx && o.activates.includes(phaseId));

  const setOpt = (i: number, patch: Partial<OptionRow>) => setOptions((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const toggle = (i: number, phaseId: number) => setOptions((rows) => rows.map((r, j) => (j !== i ? r : { ...r, activates: r.activates.includes(phaseId) ? r.activates.filter((x) => x !== phaseId) : [...r.activates, phaseId] })));

  const save = async () => {
    const rows = options.map((o) => ({ ...o, label: o.label.trim() })).filter((o) => o.label);
    if (!question.trim()) { setError('اكتب سؤال نقطة القرار.'); return; }
    if (rows.length < 2) { setError('نقطة القرار تحتاج خيارين على الأقل.'); return; }
    setBusy(true); setError(null);
    const input: DecisionPointInput = { question: question.trim(), after_phase_id: afterId, rationale: rationale.trim() || null, options: rows };
    try {
      if (existing) await ProjectService.updateDecisionPoint(project.id, existing.id, input);
      else await ProjectService.createDecisionPoint(project.id, input);
      toast.success(existing ? 'حُفظت نقطة القرار' : 'أُضيفت نقطة القرار');
      await refresh();
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر الحفظ'); }
    finally { setBusy(false); }
  };

  return (
    <Modal
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><GitBranch size={14} style={{ color: 'var(--pj-gold)' }} /> {existing ? 'تعديل نقطة القرار' : 'نقطة قرار جديدة'}</span>}
      onClose={onClose}
      wide
      foot={<><button type="button" className="prj-btn" onClick={onClose}>إلغاء</button><button type="button" className="prj-btn prj-btn--primary" disabled={busy} onClick={save}>{busy ? <Loader2 size={12} className="ssp2-spin" /> : null} {existing ? 'حفظ' : 'إضافة'}</button></>}
    >
      <ErrorBox error={error} />
      <div className="prj-form">
        <Field label="السؤال" full><input className="prj-in" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="مثال: ما موقفنا من تقرير الخبير؟" /></Field>
        <Field label="تأتي بعد مرحلة" hint="تصير جاهزة للقرار عند اكتمال هذه المرحلة">
          <select className="prj-in" value={afterId ?? ''} onChange={(e) => setAfterId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">— بلا مرحلة محددة —</option>
            {afterCandidates.map((p) => <option key={p.id} value={p.id}>{p.order}. {p.name}</option>)}
          </select>
        </Field>
        <Field label="لماذا هذه النقطة (اختياري)"><input className="prj-in" value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="ما يترتب على القرار" /></Field>
      </div>

      <div className="prj-dpf__opts">
        <div className="prj-dpf__head"><b>المسارات</b><span className="prj-dim">لكل خيار مراحل تظهر عند اختياره وتبقى مخفية قبله. الخيار بلا مراحل يعني أن المشروع ينتهي أو يُتابع يدوياً.</span></div>
        {options.map((o, i) => (
          <div key={i} className="prj-dpf__opt">
            <div className="prj-dpf__opt__h">
              <span className="prj-diamond" />
              <input className="prj-in" value={o.label} onChange={(e) => setOpt(i, { label: e.target.value })} placeholder={`الخيار ${i + 1}، مثال: «نستأنف»`} />
              {options.length > 2 && <button type="button" className="prj-btn prj-btn--sm" title="حذف الخيار" onClick={() => setOptions((rows) => rows.filter((_, j) => j !== i))}><X size={12} /></button>}
            </div>
            <div className="prj-dpf__phases">
              {candidates.length === 0 && <span className="prj-dim">لا مراحل متاحة للربط. أضف مراحل أولاً من «المراحل والمهام»، أو اترك الخيار بلا مراحل.</span>}
              {candidates.map((p) => {
                const elsewhere = usedElsewhere(p.id, i);
                return (
                  <label key={p.id} className={`prj-check ${elsewhere ? 'is-off' : ''}`} title={elsewhere ? 'مربوطة بخيار آخر' : (p.objective ?? '')}>
                    <input type="checkbox" checked={o.activates.includes(p.id)} disabled={elsewhere} onChange={() => toggle(i, p.id)} />
                    {p.name} <small className="prj-dim">{p.status === 'hidden' ? 'مخفية' : p.status === 'active' || p.status === 'awaiting_approval' ? 'جارية' : 'قادمة'} · {p.tasks_total} مهام</small>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        {options.length < 6 && <button type="button" className="prj-btn prj-btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => setOptions((rows) => [...rows, { label: '', activates: [] }])}><Plus size={12} /> خيار آخر</button>}
      </div>
    </Modal>
  );
};

export default DecisionPointFormModal;
