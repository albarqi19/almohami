import React, { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { DocumentService } from '../../../../services/documentService';
import type { Document } from '../../../../types';
import FilePreview, { downloadDocument } from '../../../FilePreview';
import type { PreviewableDoc } from '../../../FilePreview';
import { Chip, fmtDateTime } from '../../ui';
import { useRoom } from '../RoomContext';

type CloudDoc = Document & { cloud_file_id?: string | null; cloud_web_url?: string | null; uploader?: { id: number | string; name: string } | null };

const sizeLabel = (bytes: number): string => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : bytes >= 1024 ? `${Math.round(bytes / 1024)} KB` : `${bytes} B`);

/** لوحة المستند: معاينة مباشرة بالمعاين الموحد، وتنزيل، وارتباطاته. النقل بين المجلدات والصلاحيات في صفحة المستندات. */
const DocPanel: React.FC<{ documentId: number; onTitle: (title: string) => void }> = ({ documentId, onTitle }) => {
  const { openIn } = useRoom();
  const [doc, setDoc] = useState<CloudDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onTitleRef = useRef(onTitle);
  onTitleRef.current = onTitle;

  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    DocumentService.getDocument(String(documentId))
      .then((d) => { if (cancelled) return; setDoc(d as CloudDoc); setError(null); onTitleRef.current(d.title || d.file_name || `#${documentId}`); })
      .catch((e: Error) => { if (!cancelled) setError(e.message || 'تعذر فتح المستند'); });
    return () => { cancelled = true; };
  }, [documentId]);

  if (error) return <div className="prj-panel"><div className="prj-panel__body"><div className="prj-error" style={{ margin: 14 }}>{error}</div></div></div>;
  if (!doc) return <div className="prj-panel"><div className="prj-panel__body"><div className="prj-empty"><Loader2 size={14} className="ssp2-spin" /> جارٍ فتح المستند…</div></div></div>;

  const previewable: PreviewableDoc = { id: doc.id, file_name: doc.file_name, mime_type: doc.mime_type, cloud_file_id: doc.cloud_file_id ?? null, cloud_web_url: doc.cloud_web_url ?? null };
  const ext = (doc.file_name || '').split('.').pop()?.toUpperCase() ?? '';

  return (
    <div className="prj-panel">
      <div className="prj-panel__head">
        <div className="prj-panel__title">
          <FileText size={16} style={{ color: 'var(--pj-gold)' }} />
          <h2>{doc.title || doc.file_name}</h2>
          {ext && <Chip tone="todo">{ext}{doc.file_size ? ` · ${sizeLabel(doc.file_size)}` : ''}</Chip>}
          {doc.version > 1 && <Chip tone="est">إصدار {doc.version}</Chip>}
          {doc.is_confidential && <Chip tone="hold">سري</Chip>}
        </div>
        <div className="prj-panel__sub">
          <span className="prj-badge">مستند</span>
          {doc.uploaded_at && <span>رُفع <b>{fmtDateTime(doc.uploaded_at)}</b></span>}
          {doc.uploader?.name && <span>بواسطة <b>{doc.uploader.name}</b></span>}
          {doc.case_id && <button type="button" className="prj-link" onClick={() => openIn({ type: 'case', id: Number(doc.case_id) })}>القضية المرتبطة</button>}
          {doc.task_id && <button type="button" className="prj-link" onClick={() => openIn({ type: 'task', id: Number(doc.task_id) })}>المهمة المرتبطة</button>}
        </div>
      </div>
      <div className="prj-panel__acts">
        {doc.external_url
          ? <a className="prj-btn prj-btn--sm prj-btn--primary" href={doc.external_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} /> افتح الرابط</a>
          : <button type="button" className="prj-btn prj-btn--sm prj-btn--primary" onClick={() => downloadDocument(previewable).catch((e: Error) => toast.error(e.message || 'تعذر التنزيل'))}><Download size={12} /> تنزيل</button>}
        {doc.cloud_web_url && <a className="prj-btn prj-btn--sm" href={doc.cloud_web_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} /> فتح في OneDrive</a>}
      </div>
      <div className="prj-panel__body">
        {doc.external_url
          ? <div className="prj-empty">رابط خارجي، لا معاينة له هنا.</div>
          : <div className="prj-panel__preview"><FilePreview doc={previewable} /></div>}
        {doc.description && <section className="prj-sec"><div className="prj-sec__head"><FileText size={13} /> الوصف</div><div className="prj-sec__body"><p style={{ margin: 0 }}>{doc.description}</p></div></section>}
      </div>
      <div className="prj-panel__foot"><span>المعاينة والتنزيل هنا. النقل بين المجلدات والصلاحيات من صفحة المستندات.</span></div>
    </div>
  );
};

export default DocPanel;
