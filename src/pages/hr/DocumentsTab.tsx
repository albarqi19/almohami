import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  FileText, Plus, X, Lock, Download, Trash2, AlertCircle, UploadCloud,
  IdCard, CreditCard, FileSignature, GraduationCap, Award, File as FileIcon,
} from 'lucide-react';
import { hrService } from '../../services/hrService';
import CloudStorageService from '../../services/cloudStorageService';
import { usePermission } from '../../hooks/usePermission';
import type { EmployeeDocument, EmployeeDocType } from '../../types/hr';

interface TypeMeta { key: EmployeeDocType; label: string; Icon: React.FC<{ size?: number }>; color: string; }

const DOC_TYPES: TypeMeta[] = [
  { key: 'national_id', label: 'الهوية الوطنية', Icon: IdCard, color: 'var(--law-navy)' },
  { key: 'iqama', label: 'الإقامة', Icon: CreditCard, color: 'var(--status-blue)' },
  { key: 'employment_contract', label: 'عقد العمل', Icon: FileSignature, color: 'var(--law-gold)' },
  { key: 'qualification', label: 'المؤهل العلمي', Icon: GraduationCap, color: 'var(--status-green)' },
  { key: 'bar_license', label: 'رخصة المحاماة', Icon: Award, color: 'var(--law-gold)' },
  { key: 'cv', label: 'السيرة الذاتية', Icon: FileText, color: 'var(--color-text-secondary)' },
  { key: 'other', label: 'مستند آخر', Icon: FileIcon, color: 'var(--color-text-secondary)' },
];

const metaFor = (t: string): TypeMeta => DOC_TYPES.find((d) => d.key === t) || DOC_TYPES[DOC_TYPES.length - 1];

const fmtDate = (v?: string | null): string => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
};

function remainingDays(v?: string | null): number | null {
  if (!v) return null;
  const t = new Date(v).getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / 86400000);
}

// ───────────── مودال إضافة مستند ─────────────

const AddDocumentModal: React.FC<{
  empId: number;
  onClose: () => void;
  onSaved: () => void;
}> = ({ empId, onClose, onSaved }) => {
  const [type, setType] = useState<EmployeeDocType>('national_id');
  const [title, setTitle] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const submit = async () => {
    if (!file) { toast.error('اختر الملف أولاً'); return; }
    setBusy(true);
    setProgress(0);
    try {
      // (1) رابط رفع OneDrive لمجلد الموظف
      const { upload_url } = await hrService.getDocUploadUrl(empId, file.name);
      // (2) رفع مباشر إلى OneDrive (يتجاوز السيرفر)
      const up = await CloudStorageService.uploadFileDirect(upload_url, file, setProgress);
      if (!up.success || !up.fileId) throw new Error(up.error || 'فشل رفع الملف إلى OneDrive');
      // (3) تسجيل السجلّ
      await hrService.registerDoc(empId, {
        doc_type: type,
        title: title || undefined,
        document_number: docNumber || undefined,
        issue_date_gregorian: issueDate || undefined,
        expiry_date_gregorian: expiryDate || undefined,
        cloud_file_id: up.fileId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      });
      toast.success('تم رفع المستند');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'فشل رفع المستند');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hr-modal-overlay" onClick={onClose}>
      <div className="hr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hr-modal__h">
          <h3>إضافة مستند</h3>
          <button className="hr-icon-btn" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </div>
        <div className="hr-modal__b">
          <div className="hr-field">
            <label>نوع المستند</label>
            <div className="hr-doctype-grid">
              {DOC_TYPES.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  className={`hr-doctype ${type === d.key ? 'hr-doctype--active' : ''}`}
                  onClick={() => setType(d.key)}
                >
                  <span className="hr-doctype__ic" style={{ color: d.color }}><d.Icon size={20} /></span>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div className="hr-field">
            <label>الاسم (اختياري — يُشتق من النوع)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={metaFor(type).label} />
          </div>
          <div className="hr-field--row">
            <div className="hr-field">
              <label>رقم المستند</label>
              <input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
            </div>
            <div className="hr-field">
              <label>تاريخ الإصدار</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
          </div>
          <div className="hr-field">
            <label>تاريخ الانتهاء (للتنبيهات)</label>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
          <div className="hr-field">
            <label>الملف</label>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          {busy && (
            <div className="hr-upload-progress"><div className="hr-upload-progress__bar" style={{ width: `${progress}%` }} /></div>
          )}
        </div>
        <div className="hr-modal__f">
          <button className="hr-btn" onClick={onClose} disabled={busy}>إلغاء</button>
          <button className="hr-btn hr-btn--primary" onClick={submit} disabled={busy || !file}>
            <UploadCloud size={15} /> {busy ? `جارٍ الرفع… ${progress}%` : 'رفع المستند'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ───────────── التبويب ─────────────

const DocumentsTab: React.FC<{ empId: number }> = ({ empId }) => {
  const qc = useQueryClient();
  const canView = usePermission('hr.documents.view');
  const canManage = usePermission('hr.documents.manage');
  const [showAdd, setShowAdd] = useState(false);

  const { data: documents, isLoading, isError } = useQuery({
    queryKey: ['hr', 'documents', empId],
    queryFn: () => hrService.getDocuments(empId),
    enabled: canView,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hr', 'documents', empId] });

  const download = async (d: EmployeeDocument) => {
    try {
      const url = await hrService.getDocDownloadUrl(empId, d.id);
      const w = window.open(url, '_blank');
      if (!w) { window.location.href = url; }
    } catch (e: any) {
      toast.error(e?.message || 'تعذّر التنزيل');
    }
  };

  const remove = async (d: EmployeeDocument) => {
    if (!window.confirm('حذف هذا المستند؟')) return;
    try {
      await hrService.deleteDoc(empId, d.id);
      toast.success('تم حذف المستند');
      invalidate();
    } catch (e: any) {
      toast.error(e?.message || 'فشل حذف المستند');
    }
  };

  if (!canView) {
    return (
      <div className="hr-dbody hr-dbody--single">
        <div className="hr-sec"><div className="hr-sec__b"><div className="hr-locked"><Lock size={16} /> المستندات محميّة — تتطلب صلاحية «عرض مستندات الموظفين».</div></div></div>
      </div>
    );
  }

  return (
    <div className="hr-dbody hr-dbody--single">
      <div className="hr-sec">
        <div className="hr-sec__h">
          <div className="hr-sec__t"><FileText size={15} /> مستندات الموظف</div>
          {canManage && (
            <button className="hr-btn hr-btn--sm hr-btn--primary" onClick={() => setShowAdd(true)}><Plus size={14} /> إضافة مستند</button>
          )}
        </div>
        <div className="hr-sec__b">
          {isLoading ? (
            <div className="hr-locked">جارٍ التحميل…</div>
          ) : isError ? (
            <div className="hr-locked"><AlertCircle size={16} /> تعذّر جلب المستندات.</div>
          ) : !documents || documents.length === 0 ? (
            <div className="hr-locked"><FileText size={16} /> لا توجد مستندات. ارفع الهوية أو العقد أو غيرها عبر «إضافة مستند».</div>
          ) : (
            documents.map((d) => {
              const m = metaFor(d.doc_type);
              const rem = remainingDays(d.expiry_date_gregorian);
              return (
                <div className="hr-doc" key={d.id}>
                  <div className="hr-doc__ic" style={{ color: m.color }}><m.Icon size={18} /></div>
                  <div className="hr-doc__main">
                    <div className="hr-doc__nm">{d.title}{d.is_sensitive ? ' 🔒' : ''}</div>
                    <div className="hr-doc__m">
                      {m.label}
                      {d.document_number ? ` · ${d.document_number}` : ''}
                      {d.expiry_date_gregorian ? ` · تنتهي ${fmtDate(d.expiry_date_gregorian)}` : ''}
                    </div>
                  </div>
                  {rem != null && rem <= 30 && (
                    <span className={`hr-badge ${rem <= 0 ? 'hr-badge--red' : 'hr-badge--gold'}`}>{rem > 0 ? `${rem} يوم` : 'منتهٍ'}</span>
                  )}
                  <button className="hr-icon-btn" title="تنزيل" onClick={() => download(d)}><Download size={15} /></button>
                  {canManage && (
                    <button className="hr-icon-btn" title="حذف" onClick={() => remove(d)}><Trash2 size={15} /></button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {showAdd && <AddDocumentModal empId={empId} onClose={() => setShowAdd(false)} onSaved={invalidate} />}
    </div>
  );
};

export default DocumentsTab;
