import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { ProjectDeliverable, ProjectDocument } from '../../../types/projects';
import { Av, Chip, Field, Modal, fmtDayMonth } from '../ui';
import { useRoom } from './RoomContext';

/** المستندات كما في التصوّر: رقاقات التصنيف، مصدر، جدول (المستند، التصنيف، النسخة، المسؤول، المصدر، مرتبط بـ، المراجعة، السرية، التاريخ). تُجمع ولا تُنسخ. */
const DocumentsSection: React.FC = () => {
  const { project, canEdit, openTask, consumePending } = useRoom();
  const [items, setItems] = useState<ProjectDocument[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<string>('all');
  const [source, setSource] = useState<'all' | 'project' | 'task' | 'case'>('all');
  const [upload, setUpload] = useState(false);
  const [deliverables, setDeliverables] = useState<ProjectDeliverable[]>([]);

  const load = async () => { setLoading(true); try { const r = await ProjectService.documents(project.id); setItems(r.items); setCategories(r.categories); setCounts(r.counts); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الجلب'); } finally { setLoading(false); } };
  useEffect(() => { load(); if (consumePending('upload')) setUpload(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id]);
  useEffect(() => { if (upload && deliverables.length === 0) ProjectService.deliverables(project.id).then(setDeliverables).catch(() => undefined); }, [upload, deliverables.length, project.id]);

  const catCounts = useMemo(() => { const m = new Map<string, number>(); items.forEach((d) => { const k = d.category || 'بلا تصنيف'; m.set(k, (m.get(k) ?? 0) + 1); }); return m; }, [items]);
  const visible = items.filter((d) => (source === 'all' || d.source === source) && (cat === 'all' || (d.category || 'بلا تصنيف') === cat));
  const open = async (d: ProjectDocument) => { try { const r = await ProjectService.documentUrl(project.id, d.id); window.open(r.url, '_blank', 'noopener'); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر فتح المستند'); } };
  const sourceLabel = (d: ProjectDocument) => (d.source === 'project' ? 'المشروع' : d.source === 'task' ? 'مهمة' : d.source === 'case' ? 'قضية' : 'أخرى');
  const linkedLabel = (d: ProjectDocument) => {
    const parts: React.ReactNode[] = [];
    if (d.deliverable_id) parts.push(<span key="d">مخرج #{d.deliverable_id}</span>);
    if (d.task_id) parts.push(<button key="t" type="button" className="prj-link" onClick={() => openTask(d.task_id!)}>المهمة</button>);
    if (d.case_id) { const l = project.links.find((x) => x.type === 'case' && x.link_id === d.case_id); parts.push(<span key="c">{l ? l.label : `قضية ${d.case_id}`}</span>); }
    return parts.length ? parts.reduce<React.ReactNode[]>((acc, p, i) => (i ? [...acc, ' · ', p] : [p]), []) : '—';
  };

  return (
    <div className="prj-view">
      <div className="prj-docs">
        <div className="prj-cats">
          <button type="button" className={`prj-fchip ${cat === 'all' ? 'is-on' : ''}`} onClick={() => setCat('all')}>الكل {items.length}</button>
          {Array.from(catCounts.entries()).map(([k, n]) => <button type="button" key={k} className={`prj-fchip ${cat === k ? 'is-on' : ''}`} onClick={() => setCat(k)}>{k} {n}</button>)}
          <span className="prj-spacer" />
          <select className="prj-sel" value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
            <option value="all">المصدر: الكل</option>
            <option value="project">المشروع ({counts.project ?? 0})</option>
            <option value="task">المهام ({counts.task ?? 0})</option>
            <option value="case">القضايا المرتبطة ({counts.case ?? 0})</option>
          </select>
          {canEdit && <button type="button" className="prj-btn prj-btn--sm" onClick={() => setUpload(true)}><Upload size={12} /> رفع</button>}
        </div>
        {loading ? <div className="prj-empty">جارٍ التحميل…</div> : (
          <table className="prj-grid">
            <thead><tr><th style={{ width: '30%' }}>المستند</th><th>التصنيف</th><th>النسخة</th><th>المسؤول</th><th>المصدر</th><th>مرتبط بـ</th><th>المراجعة</th><th>السرية</th><th>التاريخ</th></tr></thead>
            <tbody>
              {visible.length === 0 && <tr><td colSpan={9} className="prj-dim">لا مستندات{cat !== 'all' || source !== 'all' ? ' مطابقة' : ''}. ما يُرفع في مهام المشروع أو قضاياه المربوطة يظهر هنا تلقائياً.</td></tr>}
              {visible.map((d) => (
                <tr key={d.id}>
                  <td className="t" onClick={() => open(d)}>{d.title || d.file_name}<ExternalLink size={10} style={{ marginInlineStart: 5, color: 'var(--pj-ink-3)' }} /></td>
                  <td>{d.category || <span className="prj-dim">—</span>}</td>
                  <td className="num">{d.version ? `v${d.version}` : '—'}</td>
                  <td>{d.uploader ? <Av name={d.uploader.name} /> : '—'}</td>
                  <td>{sourceLabel(d)}</td>
                  <td className="wrap">{linkedLabel(d)}</td>
                  <td>{d.deliverable_id ? <Chip tone="review">ضمن مخرج</Chip> : d.is_external ? <Chip tone="todo">رابط</Chip> : <Chip tone="done">محفوظ</Chip>}</td>
                  <td>{d.is_confidential ? <Chip tone="bad">سري</Chip> : 'داخلي'}</td>
                  <td className="num">{fmtDayMonth(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="prj-sec__body prj-dim" style={{ fontSize: 11 }}>المستندات تُجمع من القضايا والمهام والخدمات والبوابة المرتبطة بالمشروع، ولا تُنسخ.</div>
      </div>
      {upload && <UploadModal deliverables={deliverables} categories={categories} onClose={() => setUpload(false)} onDone={async () => { setUpload(false); await load(); }} />}
    </div>
  );
};

const UploadModal: React.FC<{ deliverables: ProjectDeliverable[]; categories: string[]; onClose: () => void; onDone: () => Promise<void> }> = ({ deliverables, categories, onClose, onDone }) => {
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
    <Modal title="رفع مستند إلى المشروع" onClose={onClose} foot={<><button type="button" className="prj-btn" onClick={onClose}>إلغاء</button><button type="button" className="prj-btn prj-btn--primary" onClick={submit} disabled={busy || !file}>رفع</button></>}>
      <div className="prj-form">
        <Field label="الملف" full><input type="file" className="prj-in" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
        <Field label="العنوان" full><input className="prj-in" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={file?.name ?? ''} /></Field>
        <Field label="التصنيف"><input className="prj-in" list="prj-doc-cats" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="عقود، مراسلات، أدلة…" /><datalist id="prj-doc-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist></Field>
        <Field label="يخص مخرجاً"><select className="prj-in" value={deliverableId ?? ''} onChange={(e) => setDeliverableId(e.target.value ? Number(e.target.value) : null)}><option value="">—</option>{deliverables.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <label className="prj-check prj-form__full"><input type="checkbox" checked={confidential} onChange={(e) => setConfidential(e.target.checked)} /> سري (للإدارة والشركاء فقط)</label>
      </div>
    </Modal>
  );
};

export default DocumentsSection;
