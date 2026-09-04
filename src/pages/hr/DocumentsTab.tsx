import React, { useState } from 'react';
import { toast } from 'react-toastify';
import {
  FileText, Plus, X, Lock, Download, Trash2, AlertTriangle, RefreshCw, UploadCloud,
  IdCard, CreditCard, FileSignature, GraduationCap, Award, File as FileIcon,
} from 'lucide-react';
import { hrService } from '../../services/hrService';
import CloudStorageService from '../../services/cloudStorageService';
import { usePermission } from '../../hooks/usePermission';
import { useDossierInvalidate, useEmployeeDocuments } from './dossier/useDossierData';
import EmptyLine from './dossier/EmptyLine';
import { errorText, fmtCount, meterVars } from './leave/leaveFormat';
import type { EmployeeDocument, EmployeeDocType } from '../../types/hr';

/** «أوّلُ ٨ ثمّ اعرض الكلّ» — عرفُ `ContractsTab` نفسُه، فلا رقمان في جدارٍ واحد. */
const VISIBLE_LIMIT = 8;

/** نصٌّ احتياطيٌّ واحدٌ لفرع الخطأ — عرفُ `LeaveTabPanel`. */
const CONNECTION_FALLBACK = 'انقطع الاتصال بالخادم.';

/** التسميةُ **حرفيةٌ** من `app/Enums/Permission.php:391` — لا صياغةَ فرونتيةً للصلاحية. */
const VIEW_LABEL = 'عرض مستندات الموظفين';

/**
 * **سقط الحقلُ `color`** (سبعُ سلاسلِ لونٍ في JS): نوعُ المستند **ليس حالةً دلاليّة** —
 * لا يقول «متأخّر» ولا «محميّ» ولا «منتهٍ» — فتلوينُه سبعةَ ألوانٍ زينةٌ لا معنى، والحقيقةُ
 * الوحيدةُ التي تستحقّ لوناً في هذا الصفّ هي **الانتهاء**، وتحملها الشارةُ وحدَها.
 *
 * والأيقونةُ تدخل `hrl-dot` فتقرأ `--hrl-k` الافتراضيَّ (رماديٌّ هادئ) بلا صنفٍ إضافيّ.
 * ولم تُستعَر مفاتيحُ `hrl-k--annual|sick|…` لأنّها **مفردات أنواع الإجازات** التي يرسلها
 * الخادمُ في `color_key`؛ ربطُ المستنداتِ بها يجعل تعديلَ لونِ «المرضيّة» يُبدّل لونَ
 * «الإقامة» — وهو عينُ التباعد الصامت الذي تُعدَم من أجله الشجرُ المتوازية.
 */
interface TypeMeta { key: EmployeeDocType; label: string; Icon: React.FC<{ size?: number }>; }

const DOC_TYPES: TypeMeta[] = [
  { key: 'national_id', label: 'الهوية الوطنية', Icon: IdCard },
  { key: 'iqama', label: 'الإقامة', Icon: CreditCard },
  { key: 'employment_contract', label: 'عقد العمل', Icon: FileSignature },
  { key: 'qualification', label: 'المؤهل العلمي', Icon: GraduationCap },
  { key: 'bar_license', label: 'رخصة المحاماة', Icon: Award },
  { key: 'cv', label: 'السيرة الذاتية', Icon: FileText },
  { key: 'other', label: 'مستند آخر', Icon: FileIcon },
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
                  <span className="hr-doctype__ic"><d.Icon size={20} /></span>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div className="hr-field">
            <label>الاسم (اختياري، يملأ تلقائياً من النوع)</label>
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
          {/* مقياسٌ بخانةٍ واحدة — بدل `hr-upload-progress` باستدارته 3px وعرضٍ يُحقن
              في `style`. الامتلاءُ يمرّ متغيّراً (`--hrl-f`) بالبدائيّة نفسِها التي
              يستعملها مقياسُ م.١١٧، فلا قاعدةَ تخطيطٍ ثانيةٌ في JSX. */}
          {busy && (
            <div className="hrl-meter" role="img" aria-label={`تم رفع ${progress}٪`}>
              <span className="hrl-meter__seg" style={meterVars(1, progress / 100)}>
                <span className="hrl-meter__fill" />
              </span>
            </div>
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

/**
 * **الغلافُ صار `hrl-block`** (الخطوة ٧) ورأسُه `<h2>` دلاليّ. **ولم يُلمَس منطقٌ واحد**:
 * ترتيبُ الرفع الثلاثيّ (`getDocUploadUrl` ⇒ `uploadFileDirect` **يتجاوز السيرفر** ⇒
 * `registerDoc`) وشريطُ تقدّمه الموصولُ فعلياً · احتياطُ `window.location.href` حين تُحجَب
 * النافذة · `window.confirm` قبل الحذف · الحارسُ `enabled: canView` والإبطالُ الدقيق.
 */
const DocumentsTab: React.FC<{ id: string; empId: number }> = ({ id, empId }) => {
  const canView = usePermission('hr.documents.view');
  const canManage = usePermission('hr.documents.manage');
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // الحارسُ `enabled: canView` لم يتغيّر — انتقل إلى `useDossierData` مع مفتاحه، وهو
  // المصدرُ الذي نُسخ إلى العقود والمباشرة (`api.php:1785`, `hr.documents.view`).
  const documentsQuery = useEmployeeDocuments(empId);
  const documents = documentsQuery.data;

  const { documents: invalidate } = useDossierInvalidate(empId);

  const download = async (d: EmployeeDocument) => {
    try {
      const url = await hrService.getDocDownloadUrl(empId, d.id);
      const w = window.open(url, '_blank');
      if (!w) { window.location.href = url; }
    } catch (e: any) {
      toast.error(e?.message || 'تعذر التنزيل');
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

  // الصلاحيةُ الناقصةُ حالةٌ تُسمّى **بقفل** ويُسمّى فيها المطلوبُ حرفياً — لا «تعذّر
  // الجلب» (رسالةُ عطلٍ لحالةِ صلاحية)، ولا «لا توجد مستندات» (نفيُ وجودٍ بلا دليل:
  // الاستعلامُ لم يُطلَق أصلاً بحكم `enabled: canView`).
  if (!canView) {
    return (
      <section className="hrl-block" id={id}>
        <div className="hrl-block__h">
          <h2 className="hrl-block__t hrl-h2"><FileText size={14} /> مستندات الموظف</h2>
        </div>
        <div className="hrl-block__b">
          <div className="hrl-state hrl-state--locked">
            <Lock size={20} />
            <p className="hrl-state__t">المستندات محمية</p>
            <p className="hrl-state__d">عرضها يتطلب صلاحية «{VIEW_LABEL}».</p>
          </div>
        </div>
      </section>
    );
  }

  const rows = documents ?? [];
  const shown = expanded ? rows : rows.slice(0, VISIBLE_LIMIT);
  const isEmpty = !documentsQuery.isPending && !documentsQuery.isError && rows.length === 0;

  /** الحالاتُ الأربعُ متمايزةٌ شكلاً ونصّاً — والقفلُ أعلاه وحدَه يحمل أيقونةَ القفل. */
  const body = (() => {
    if (documentsQuery.isPending) {
      return (
        <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل المستندات">
          {Array.from({ length: 3 }, (_, i) => (
            <span className="hrl-skel" key={i} />
          ))}
        </div>
      );
    }

    if (documentsQuery.isError) {
      return (
        <div className="hrl-state hrl-state--error">
          <AlertTriangle size={20} />
          <p className="hrl-state__t">تعذر تحميل المستندات</p>
          <p className="hrl-state__d">{errorText(documentsQuery.error, CONNECTION_FALLBACK)}</p>
          <button type="button" className="hr-btn hr-btn--sm" onClick={() => void documentsQuery.refetch()}>
            <RefreshCw size={13} /> إعادة المحاولة
          </button>
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <EmptyLine
          text="لا يوجد مستند محفوظ"
          action={canManage && (
            <button type="button" className="hr-btn hr-btn--sm hr-btn--primary" onClick={() => setShowAdd(true)}>
              <Plus size={14} /> إضافة مستند
            </button>
          )}
        />
      );
    }

    return (
      <>
        {shown.map((d) => {
          const m = metaFor(d.doc_type);
          const rem = remainingDays(d.expiry_date_gregorian);
          const meta = [
            m.label,
            d.document_number || null,
            d.expiry_date_gregorian ? `تنتهي ${fmtDate(d.expiry_date_gregorian)}` : null,
          ].filter(Boolean).join(' · ');

          return (
            <div className="hrl-row" key={d.id}>
              <span className="hrl-dot" aria-hidden="true"><m.Icon size={12} /></span>
              <span className="hrl-row__main">
                <span className="hrl-row__name">{d.title}{d.is_sensitive ? ' 🔒' : ''}</span>
                <span className="hrl-row__meta" title={meta}>{meta}</span>
              </span>
              {rem != null && rem <= 30 && (
                <span className={`hr-badge ${rem <= 0 ? 'hr-badge--red' : 'hr-badge--gold'}`}>{rem > 0 ? `${fmtCount(rem)} يوم` : 'منتهٍ'}</span>
              )}
              <span className="hrl-tools">
                <button type="button" className="hr-icon-btn hr-icon-btn--sm" title="تنزيل" onClick={() => download(d)}><Download size={14} /></button>
                {canManage && (
                  <button type="button" className="hr-icon-btn hr-icon-btn--sm" title="حذف" onClick={() => remove(d)}><Trash2 size={14} /></button>
                )}
              </span>
            </div>
          );
        })}

        {!expanded && rows.length > VISIBLE_LIMIT && (
          <EmptyLine
            text={`تعرض ${fmtCount(VISIBLE_LIMIT)} من ${fmtCount(rows.length)}`}
            action={(
              <button type="button" className="hr-btn hr-btn--sm" onClick={() => setExpanded(true)}>
                اعرض الكل ({fmtCount(rows.length)})
              </button>
            )}
          />
        )}
      </>
    );
  })();

  return (
    <section className="hrl-block" id={id}>
      <div className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2"><FileText size={14} /> مستندات الموظف</h2>
        {canManage && !isEmpty && (
          <div className="hrl-block__a">
            <button type="button" className="hr-btn hr-btn--sm hr-btn--primary" onClick={() => setShowAdd(true)}><Plus size={14} /> إضافة مستند</button>
          </div>
        )}
      </div>
      <div className="hrl-block__b hrl-block__b--flush">{body}</div>

      {showAdd && <AddDocumentModal empId={empId} onClose={() => setShowAdd(false)} onSaved={invalidate} />}
    </section>
  );
};

export default DocumentsTab;
