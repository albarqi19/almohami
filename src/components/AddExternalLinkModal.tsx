import React, { useMemo, useState } from 'react';
import { Save, X, Loader2, Globe, Image as ImageIcon, File as FileIcon, FileText, Video, Folder, ShieldCheck } from 'lucide-react';
import Modal from './Modal';
import { DocumentCategory, type ExternalLinkKind, type ExternalLinkPayload } from '../types';
import { getApiErrorMessage } from '../utils/apiError';

interface AddExternalLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: ExternalLinkPayload) => Promise<void>;
  /** «قضية ٤٥٢/١٤٤٧» أو «مهمة: مراجعة العقد» — يُعرض تحت العنوان ليعرف المستخدم أين سيُضاف الرابط */
  contextLabel?: string;
}

const TYPE_OPTIONS: { value: ExternalLinkKind; label: string; icon: React.ReactNode }[] = [
  { value: 'web', label: 'صفحة ويب', icon: <Globe size={14} /> },
  { value: 'image', label: 'صورة', icon: <ImageIcon size={14} /> },
  { value: 'file', label: 'ملف', icon: <FileIcon size={14} /> },
  { value: 'document', label: 'مستند', icon: <FileText size={14} /> },
  { value: 'video', label: 'فيديو', icon: <Video size={14} /> },
  { value: 'folder', label: 'مجلّد', icon: <Folder size={14} /> },
];

/**
 * التصنيفات القانونية — مُشتقّة من DocumentCategory القائمة في types/index.ts.
 * لا تُنشأ قائمة جديدة هنا: أيّ تصنيفٍ يُضاف هناك يظهر تلقائياً، والتسميات وحدها محلّية.
 */
const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  [DocumentCategory.CONTRACT]: 'عقد',
  [DocumentCategory.EVIDENCE]: 'بيّنة / دليل',
  [DocumentCategory.PLEADING]: 'مذكرة / لائحة',
  [DocumentCategory.CORRESPONDENCE]: 'مراسلة',
  [DocumentCategory.REPORT]: 'تقرير',
  [DocumentCategory.JUDGMENT]: 'حكم',
  [DocumentCategory.OTHER]: 'أخرى',
};

const CATEGORY_OPTIONS = (Object.values(DocumentCategory) as DocumentCategory[]).map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));

const MAX_URL_LENGTH = 2048;
const MAX_TITLE_LENGTH = 255;

/**
 * الحاجز الثاني: الرابط يبدأ بـhttp:// أو https:// حصراً.
 * الباك يفحص أيضاً، لكن هذا حقلٌ حرّ يُصيَّر لاحقاً داخل <a href> — وحقلٌ كهذا يجب أن يُحرَس
 * في الطرفين: بدونه يمرّ javascript: أو data: من أي عميلٍ لا يمرّ عبر هذه الواجهة.
 */
const PROTOCOL_RE = /^https?:\/\//;

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  border: '1px solid var(--color-border)',
  borderRadius: '4px',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: '13px',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-text-secondary)',
  fontWeight: 500,
};

const groupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
};

const btnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '7px 14px',
  border: '1px solid var(--color-border)',
  borderRadius: '4px',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: '12.5px',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const AddExternalLinkModal: React.FC<AddExternalLinkModalProps> = ({ isOpen, onClose, onSubmit, contextLabel }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ExternalLinkKind>('web');
  const [category, setCategory] = useState<string>(DocumentCategory.OTHER);
  const [description, setDescription] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * تلميح النطاق الحيّ — ليس زينة:
   * بدونه يستطيع أحدهم إضافة رابطٍ عنوانه «صكّ الملكية» يقود إلى صفحة تصيّد، فيثق به زميله
   * لأنّ الرابط ظهر *داخل النظام*. عرض المضيف قبل الحفظ يكشف الخدعة في لحظتها.
   */
  const hostHint = useMemo(() => {
    const raw = url.trim();
    if (!raw) return null;
    try {
      const parsed = new URL(raw);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      return parsed.hostname;
    } catch {
      return null;
    }
  }, [url]);

  const resetFields = () => {
    setUrl('');
    setTitle('');
    setKind('web');
    setCategory(DocumentCategory.OTHER);
    setDescription('');
    setIsConfidential(false);
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    resetFields();
    onClose();
  };

  const handleSave = async () => {
    const trimmedUrl = url.trim();
    const trimmedTitle = title.trim();

    if (!trimmedUrl) {
      setError('الرابط مطلوب');
      return;
    }
    if (!trimmedTitle) {
      setError('العنوان مطلوب');
      return;
    }
    if (trimmedUrl.length > MAX_URL_LENGTH) {
      setError(`الرابط طويل جداً — الحد ${MAX_URL_LENGTH} حرفاً`);
      return;
    }
    if (!PROTOCOL_RE.test(trimmedUrl.toLowerCase())) {
      setError('الرابط يجب أن يبدأ بـ http:// أو https:// فقط');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        url: trimmedUrl,
        title: trimmedTitle.slice(0, MAX_TITLE_LENGTH),
        kind,
        category,
        description: description.trim() || undefined,
        is_confidential: isConfidential,
      });
      resetFields();
      onClose();
    } catch (err) {
      // رسائل الباك (422) عربية فصحى — تُعرض كما هي
      setError(getApiErrorMessage(err, 'تعذّر إضافة الرابط'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="إضافة رابط خارجي" size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {contextLabel && (
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            {contextLabel}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '8px 12px',
              background: 'color-mix(in srgb, var(--color-error) 12%, transparent)',
              color: 'var(--color-error)',
              borderRadius: '4px',
              fontSize: '12.5px',
            }}
          >
            {error}
          </div>
        )}

        <div style={groupStyle}>
          <label style={labelStyle} htmlFor="external-link-url">الرابط</label>
          <input
            id="external-link-url"
            type="url"
            dir="ltr"
            maxLength={MAX_URL_LENGTH}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/file.pdf"
            style={{ ...inputStyle, textAlign: 'left' }}
          />
          {hostHint && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11.5px',
                color: 'var(--color-text-secondary)',
              }}
            >
              <ShieldCheck size={12} />
              <span>سيُفتح على: <bdi dir="ltr" style={{ fontWeight: 600, color: 'var(--color-text)' }}>{hostHint}</bdi></span>
            </div>
          )}
        </div>

        <div style={groupStyle}>
          <label style={labelStyle} htmlFor="external-link-title">العنوان</label>
          <input
            id="external-link-title"
            type="text"
            maxLength={MAX_TITLE_LENGTH}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: صك الملكية على درايف"
            style={inputStyle}
          />
        </div>

        <div style={groupStyle}>
          <label style={labelStyle}>نوع الرابط</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {TYPE_OPTIONS.map((opt) => {
              const active = kind === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setKind(opt.value)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '8px 10px',
                    background: active ? 'var(--color-primary)' : 'var(--color-surface)',
                    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: '4px',
                    color: active ? '#fff' : 'var(--color-text)',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={groupStyle}>
          <label style={labelStyle} htmlFor="external-link-category">التصنيف القانوني</label>
          <select
            id="external-link-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={inputStyle}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div style={groupStyle}>
          <label style={labelStyle} htmlFor="external-link-note">ملاحظة</label>
          <textarea
            id="external-link-note"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="لماذا هذا الرابط مهم؟ (اختياري)"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', color: 'var(--color-text)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isConfidential}
            onChange={(e) => setIsConfidential(e.target.checked)}
            style={{ width: '14px', height: '14px', cursor: 'pointer' }}
          />
          <span>سرّية — لا تظهر للعميل في بوّابته</span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            style={{ ...btnStyle, opacity: submitting ? 0.5 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
          >
            <X size={14} /> إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            style={{
              ...btnStyle,
              background: 'var(--color-primary)',
              borderColor: 'var(--color-primary)',
              color: '#fff',
              opacity: submitting ? 0.5 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            {submitting ? 'جاري الحفظ...' : 'إضافة الرابط'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddExternalLinkModal;
