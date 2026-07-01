import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, FolderPlus, Download, Trash2, FileText, Loader2, X, ShieldAlert } from 'lucide-react';
import { toast } from 'react-toastify';
import ClientManagementService, { CLIENT_DOC_TYPES, clientDocTypeLabel } from '../services/clientManagementService';
import { CloudStorageService } from '../services/cloudStorageService';
import CloudFilePickerModal from './CloudFilePickerModal';

/**
 * مدير مستندات العميل الثابتة (هوية/سجل تجاري/عقد/توكيل) — يدعم الرفع الجديد لـ OneDrive
 * والتعيين من ملف موجود (متصفّح OneDrive)، مع تصنيف وتنزيل وحذف. يعرض أيضاً مستندات
 * قضايا العميل (للقراءة). جدول client_documents منفصل عن مستندات القضايا.
 */
interface Props {
  clientId: string;
  clientName: string;
  caseDocuments: any[];
  caseDocsLoading: boolean;
  /** عدّاد خارجي: كل زيادة تفتح مودال الرفع مباشرة (زر «رفع مستند» في شريط العمل) */
  uploadSignal?: number;
}

const fmtDate = (d?: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('ar-SA'); } catch { return '—'; }
};

const ClientDocumentsManager: React.FC<Props> = ({ clientId, clientName, caseDocuments, caseDocsLoading, uploadSignal }) => {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (uploadSignal && uploadSignal > 0) setUploadOpen(true);
  }, [uploadSignal]);

  const docsQuery = useQuery({
    queryKey: ['client-permanent-docs', clientId],
    queryFn: () => ClientManagementService.getClientPermanentDocuments(clientId),
    staleTime: 30 * 1000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['client-permanent-docs', clientId] });

  const handleDownload = async (docId: number) => {
    try {
      const url = await ClientManagementService.downloadClientDocument(clientId, docId);
      window.open(url, '_blank');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'تعذّر تنزيل المستند');
    }
  };

  const handleDelete = async (docId: number) => {
    if (!window.confirm('هل تريد حذف هذا المستند من ملف العميل؟')) return;
    try {
      await ClientManagementService.deleteClientDocument(clientId, docId);
      toast.success('تم حذف المستند');
      refresh();
    } catch {
      toast.error('تعذّر حذف المستند');
    }
  };

  // تعيين ملفات موجودة من درايف المكتب (افتراضي: تصنيف «أخرى»)
  const assignFiles = async (files: any[]) => {
    for (const f of files) {
      await ClientManagementService.assignClientDocument(clientId, {
        doc_type: 'other',
        cloud_file_id: f.id,
        file_name: f.name,
        file_size: f.size || 0,
        mime_type: f.mime_type || undefined,
      });
    }
    toast.success(`تم تعيين ${files.length} ملف لملف العميل`);
    refresh();
  };

  const docs = docsQuery.data ?? [];

  return (
    <div className="client-docs-manager">
      {/* المستندات الثابتة */}
      <div className="client-section-head">
        <div className="client-section-title">
          <ShieldAlert size={15} /> المستندات الثابتة للعميل
        </div>
        <div className="client-section-actions">
          <button className="client-btn client-btn--primary" onClick={() => setUploadOpen(true)}>
            <Upload size={13} /> رفع مستند
          </button>
          <button className="client-btn" onClick={() => setPickerOpen(true)}>
            <FolderPlus size={13} /> تعيين ملف موجود
          </button>
        </div>
      </div>

      {docsQuery.isLoading ? (
        <div className="client-loading">جاري التحميل...</div>
      ) : docs.length === 0 ? (
        <div className="client-empty-soft">لا توجد مستندات ثابتة بعد — ارفع الهوية أو السجل التجاري أو العقود.</div>
      ) : (
        <div className="client-table-wrap">
          <table className="client-table">
            <thead><tr><th>#</th><th>الاسم</th><th>التصنيف</th><th>الرقم</th><th>التاريخ</th><th></th></tr></thead>
            <tbody>
              {docs.map((d: any, i: number) => (
                <tr key={d.id}>
                  <td>{i + 1}</td>
                  <td className="client-table__title">{d.title || d.file_name || '-'}</td>
                  <td><span className={`doc-type-badge doc-type-${d.doc_type}`}>{clientDocTypeLabel(d.doc_type)}{d.is_sensitive ? ' 🔒' : ''}</span></td>
                  <td>{d.document_number || '—'}</td>
                  <td className="client-table__date">{fmtDate(d.created_at)}</td>
                  <td>
                    <button className="client-icon-btn" title="تنزيل" onClick={() => handleDownload(d.id)}><Download size={13} /></button>
                    <button className="client-icon-btn client-icon-btn--danger" title="حذف" onClick={() => handleDelete(d.id)}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* مستندات القضايا (للقراءة) */}
      <div className="client-section-head" style={{ marginTop: 24 }}>
        <div className="client-section-title"><FileText size={15} /> مستندات القضايا</div>
      </div>
      {caseDocsLoading ? (
        <div className="client-loading">جاري التحميل...</div>
      ) : (caseDocuments?.length ?? 0) === 0 ? (
        <div className="client-empty-soft">لا توجد مستندات مرتبطة بقضايا.</div>
      ) : (
        <div className="client-table-wrap">
          <table className="client-table">
            <thead><tr><th>#</th><th>الاسم</th><th>القضية المرتبطة</th><th>تاريخ الرفع</th></tr></thead>
            <tbody>
              {caseDocuments.map((d: any, i: number) => (
                <tr key={d.id}>
                  <td>{i + 1}</td>
                  <td>{d.name || d.original_name || d.title || '-'}</td>
                  <td>{d.case ? `${d.case.file_number || ''} ${d.case.title || ''}`.trim() : '—'}</td>
                  <td className="client-table__date">{fmtDate(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {uploadOpen && (
        <ClientDocumentUploadModal
          clientId={clientId}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => { setUploadOpen(false); refresh(); }}
        />
      )}

      <CloudFilePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        contextLabel={`العميل: ${clientName}`}
        onAssignFiles={assignFiles}
        onFileAssigned={refresh}
      />
    </div>
  );
};

/** مودال رفع مستند جديد لملف العميل (upload-url → رفع مباشر → تسجيل). */
const ClientDocumentUploadModal: React.FC<{ clientId: string; onClose: () => void; onUploaded: () => void }> = ({ clientId, onClose, onUploaded }) => {
  const [docType, setDocType] = useState('national_id');
  const [title, setTitle] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!file) { setError('اختر ملفاً أولاً'); return; }
    setBusy(true); setError(null); setProgress(0);
    try {
      const { upload_url } = await ClientManagementService.getClientDocUploadUrl(clientId, file.name);
      const up = await CloudStorageService.uploadFileDirect(upload_url, file, (p) => setProgress(p));
      if (!up.success || !up.fileId) throw new Error(up.error || 'فشل الرفع إلى OneDrive');
      await ClientManagementService.registerClientDocument(clientId, {
        doc_type: docType,
        cloud_file_id: up.fileId,
        file_name: file.name,
        title: title.trim() || undefined,
        document_number: docNumber.trim() || undefined,
        mime_type: file.type || undefined,
        file_size: file.size,
      });
      toast.success('تم رفع المستند بنجاح');
      onUploaded();
    } catch (e: any) {
      const code = e?.response?.status;
      const msg = e?.response?.data?.code === 'no_onedrive'
        ? 'لم يتم ربط OneDrive لهذا المكتب — لا يمكن رفع المستندات.'
        : (e?.response?.data?.message || e?.message || 'تعذّر رفع المستند');
      setError(msg);
      if (code) toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="add-appointment-modal-overlay" onClick={onClose}>
      <div className="add-appointment-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div className="modal-header-icon" style={{ backgroundColor: 'var(--law-navy)', color: 'white' }}>
            <Upload size={18} />
          </div>
          <div className="modal-header-title">
            <h2>رفع مستند للعميل</h2>
            <span className="modal-header-subtitle">يُحفظ في مجلد العميل على OneDrive</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ padding: '8px 28px 28px' }}>
          {error && <div className="modal-error" style={{ margin: '12px 0' }}>{error}</div>}

          <label className="client-field-label">التصنيف</label>
          <select className="client-field-input" value={docType} onChange={(e) => setDocType(e.target.value)}>
            {CLIENT_DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <label className="client-field-label">العنوان (اختياري)</label>
          <input className="client-field-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثل: هوية المالك" />

          <label className="client-field-label">الرقم (اختياري)</label>
          <input className="client-field-input" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="رقم الهوية/السجل" />

          <label className="client-field-label">الملف</label>
          <input className="client-field-input" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

          {busy && (
            <div className="client-progress" style={{ marginTop: 12 }}>
              <div className="client-progress__bar" style={{ width: `${progress}%` }} />
              <span className="client-progress__label">{progress}%</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="notion-btn notion-btn-secondary" onClick={onClose} disabled={busy}>إلغاء</button>
          <button className="notion-btn notion-btn-primary" onClick={submit} disabled={busy || !file}>
            {busy ? <><Loader2 size={14} className="animate-spin" style={{ marginLeft: 8, display: 'inline' }} /> جاري الرفع...</> : <><Upload size={14} style={{ marginLeft: 8 }} /> رفع</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDocumentsManager;
