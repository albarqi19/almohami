import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText, Lock, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { ProjectDeliverable, ProjectDocument } from '../../../types/projects';
import { Chip, Field, Modal, fmtDateTime } from '../ui';
import { useRoom } from './RoomContext';

const sizeLabel = (bytes?: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
};

/** غرفة المستندات: كل ما يخص المشروع في مكان واحد (مستندات المشروع + مهامه + قضاياه المربوطة). */
const DocumentsSection: React.FC = () => {
  const { project, canEdit, openTask } = useRoom();
  const [items, setItems] = useState<ProjectDocument[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'all' | 'project' | 'task' | 'case'>('all');
  const [q, setQ] = useState('');
  const [upload, setUpload] = useState(false);
  const [deliverables, setDeliverables] = useState<ProjectDeliverable[]>([]);

  const load = async () => {
    setLoading(true);
    try { const r = await ProjectService.documents(project.id); setItems(r.items); setCounts(r.counts); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الجلب'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id]);
  useEffect(() => { if (upload && deliverables.length === 0) ProjectService.deliverables(project.id).then(setDeliverables).catch(() => undefined); }, [upload, deliverables.length, project.id]);

  const visible = useMemo(() => items.filter((d) => (source === 'all' || d.source === source) && (!q.trim() || (d.title ?? '').includes(q.trim()) || (d.file_name ?? '').includes(q.trim()))), [items, source, q]);

  const open = async (d: ProjectDocument) => {
    try { const r = await ProjectService.documentUrl(project.id, d.id); window.open(r.url, '_blank', 'noopener'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر فتح المستند'); }
  };

  return (
    <div>
      <div className="prj-main__tools" style={{ justifyContent: 'flex-start', marginBottom: 10 }}>
        {canEdit && <button type="button" className="ssp2-btn ssp2-btn--primary" onClick={() => setUpload(true)}><Upload size={13} /> رفع مستند</button>}
        <input className="ssp2-input" style={{ width: 220 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالعنوان أو اسم الملف…" />
        <div className="prj-chips">
          {([['all', 'الكل', items.length], ['project', 'المشروع', counts.project ?? 0], ['task', 'من المهام', counts.task ?? 0], ['case', 'من القضايا', counts.case ?? 0]] as const).map(([k, label, c]) => (
            <button type="button" key={k} className={`prj-chip ${source === k ? 'prj-chip--navy' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setSource(k)}>{label} · {c}</button>
          ))}
        </div>
      </div>
      {loading ? <div className="prj-muted">جارٍ التحميل…</div> : visible.length === 0 ? <div className="ssp2-empty">لا مستندات{q ? ' مطابقة' : ''}. ما يُرفع في مهام المشروع أو قضاياه المربوطة يظهر هنا تلقائياً.</div> : (
        <div className="prj-block prj-block__body--flush">
          {visible.map((d) => (
            <div key={d.id} className="prj-doc">
              <FileText size={16} style={{ color: 'var(--color-text-secondary)' }} />
              <div>
                <div className="prj-doc__title">{d.title || d.file_name} {d.is_confidential && <Chip tone="bad"><Lock size={9} /> سري</Chip>} {d.version && d.version > 1 ? <Chip tone="muted">ن{d.version}</Chip> : null}</div>
                <div className="prj-doc__meta">
                  {d.source === 'project' ? 'المشروع' : d.source === 'task' ? 'مهمة' : d.source === 'case' ? 'قضية' : 'أخرى'}
                  {d.category ? ` · ${d.category}` : ''}{d.file_size ? ` · ${sizeLabel(d.file_size)}` : ''}{d.uploader ? ` · ${d.uploader.name}` : ''} · {fmtDateTime(d.created_at)}
                  {d.task_id && <> · <button type="button" className="prj-link" onClick={() => openTask(d.task_id!)}>افتح المهمة</button></>}
                </div>
              </div>
              <div className="prj-actions">
                <button type="button" className="ssp2-btn" style={{ padding: '3px 9px', fontSize: 11.5 }} onClick={() => open(d)}><ExternalLink size={12} /> فتح</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {upload && <UploadModal deliverables={deliverables} onClose={() => setUpload(false)} onDone={async () => { setUpload(false); await load(); }} />}
    </div>
  );
};

const UploadModal: React.FC<{ deliverables: ProjectDeliverable[]; onClose: () => void; onDone: () => Promise<void> }> = ({ deliverables, onClose, onDone }) => {
  const { project } = useRoom();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [deliverableId, setDeliverableId] = useState<number | null>(null);
  const [confidential, setConfidential] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!file) { toast.error('اختر ملفاً'); return; }
    setBusy(true);
    try { await ProjectService.uploadDocument(project.id, file, { title: title.trim() || undefined, category: category.trim() || undefined, deliverable_id: deliverableId, is_confidential: confidential }); toast.success('رُفع المستند'); await onDone(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الرفع'); }
    finally { setBusy(false); }
  };
  return (
    <Modal title="رفع مستند إلى المشروع" onClose={onClose} foot={<><button type="button" className="ssp2-btn" onClick={onClose}>إلغاء</button><button type="button" className="ssp2-btn ssp2-btn--primary" onClick={submit} disabled={busy || !file}>رفع</button></>}>
      <div className="prj-form">
        <Field label="الملف" full><input type="file" className="ssp2-input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
        <Field label="العنوان" full><input className="ssp2-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={file?.name ?? ''} /></Field>
        <Field label="التصنيف"><input className="ssp2-input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="عقود، مراسلات، أدلة…" /></Field>
        <Field label="يخص مخرجاً"><select className="ssp2-input" value={deliverableId ?? ''} onChange={(e) => setDeliverableId(e.target.value ? Number(e.target.value) : null)}><option value="">—</option>{deliverables.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <label className="prj-check prj-form__full"><input type="checkbox" checked={confidential} onChange={(e) => setConfidential(e.target.checked)} /> سري (للإدارة والشركاء فقط)</label>
      </div>
    </Modal>
  );
};

export default DocumentsSection;
