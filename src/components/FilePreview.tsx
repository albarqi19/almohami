import React, { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, Download, FileText, Image as ImageIcon, File as FileIcon } from 'lucide-react';
import SecurePdfViewer from './SecurePdfViewer';
import SecureWordViewer from './SecureWordViewer';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.alraedlaw.com/api/v1';

/**
 * الحقول المرنة لأي وثيقة قابلة للمعاينة.
 * يدعم تسميتي الواجهة الخلفية (snake_case) والقديمة (camelCase).
 */
export interface PreviewableDoc {
  id: string | number;
  cloud_file_id?: string | null;
  cloud_web_url?: string | null;
  file_name?: string;
  fileName?: string;
  mime_type?: string;
  mimeType?: string;
}

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('authToken');
  return {
    Authorization: `Bearer ${token}`,
    'ngrok-skip-browser-warning': '69420',
  };
};

const docName = (doc: PreviewableDoc): string => doc.file_name || doc.fileName || 'ملف';
const docMime = (doc: PreviewableDoc): string => doc.mime_type || doc.mimeType || '';

/**
 * Hook حلّ رابط المعاينة — مساران بحسب موضع الملف:
 * - وثيقةٌ على OneDrive ⇒ `cloud-storage/onedrive/preview-url` فيردّ رابطاً مباشراً.
 * - وثيقةٌ محلية ⇒ `/documents/{id}/preview` فيردّ البايتات، فنصنع blob: URL.
 *
 * جُرّب توحيدُهما على مسار الوثيقة (ليقرّر الخادم) فانكسر: ذاك يمرّ بـDocumentPolicy،
 * وcanViewCaseOf ينفّذ `$document->case` فيجلب صفّ القضية كاملاً ومعه عمود najiz_data
 * الضخم ⇒ نفادُ الذاكرة وانهيارُ العامل و502. والعلّةُ في تحميل العمود لا في المعاينة.
 *
 * ويبقى معلوماً أن مسار OneDrive محروسٌ بـ`internal.user`، فالعميلُ لا يصله —
 * وذاك عطلٌ قائمٌ في بوّابته يُعالَج بمسارٍ خاصٍّ به لا بتوحيدٍ يكسر الجميع.
 */
export function useFilePreviewUrl(doc: PreviewableDoc | null, enabled: boolean = true) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCloud = !!doc?.cloud_file_id;
  const docId = doc?.id;
  const cloudId = doc?.cloud_file_id;

  useEffect(() => {
    if (!doc || !enabled) return;

    let cancelled = false;
    let createdBlobUrl: string | null = null;

    const run = async () => {
      setLoading(true);
      setError(null);
      setUrl(null);

      try {
        // الوثيقة السحابية تمرّ بمسار OneDrive المباشر لا بمسار الوثيقة.
        //
        // جُرّب توحيدُهما على /documents/{id}/preview فانكسر: ذاك المسار يمرّ
        // بـDocumentPolicy، وcanViewCaseOf ينفّذ $document->case فيجلب صفّ القضية
        // كاملاً ومعه عمود najiz_data (يبلغ عندنا 42 ميجابايت لصفٍّ واحد) —
        // فينفد memory_limit وينهار العامل، فيردّ nginx بـ502 بلا ترويسات CORS.
        // العلّة في تحميل العمود الضخم لا في المعاينة، وتُعالَج على حدة.
        if (cloudId) {
          const res = await fetch(`${API_URL}/cloud-storage/onedrive/preview-url/${cloudId}`, {
            headers: authHeaders(),
          });
          const data = await res.json().catch(() => null);

          if (!res.ok || !data?.success) {
            throw new Error(data?.message || `تعذّر تحميل المعاينة (${res.status})`);
          }

          const href = data?.download_url || doc.cloud_web_url;
          if (!href) throw new Error(data?.message || 'لا يتوفّر رابط معاينة لهذا الملف');
          if (!cancelled) setUrl(href);
          return;
        }

        // الوثيقة المحلية: بايتاتٌ من سيرفرنا ثم blob: URL
        const res = await fetch(`${API_URL}/documents/${docId}/preview`, {
          headers: authHeaders(),
        });

        if (!res.ok) {
          let serverMessage = '';
          try {
            const body = await res.json();
            serverMessage = body?.message || '';
          } catch {
            serverMessage = '';
          }
          throw new Error(serverMessage || `تعذّر تحميل المعاينة (${res.status})`);
        }

        const blob = await res.blob();
        createdBlobUrl = URL.createObjectURL(blob);
        if (!cancelled) setUrl(createdBlobUrl);
      } catch (err) {
        console.error('useFilePreviewUrl error:', err);
        // TypeError: Failed to fetch تعني انقطاعَ شبكةٍ أو ردّاً بلا ترويسات CORS
        // (وذاك يقع حين يعترض الوسيط ردّاً من فئة 5xx) — لا عطلاً في الملف نفسه
        const isNetwork = err instanceof TypeError;
        if (!cancelled) {
          setError(
            isNetwork
              ? 'تعذّر الوصول إلى الخادم. تحقّق من الاتصال ثم أعد المحاولة.'
              : (err instanceof Error && err.message) || 'فشل تحميل المعاينة'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    };
  }, [docId, cloudId, enabled]);

  return { url, loading, error, isCloud };
}

/**
 * تحميل موحّد لأي وثيقة — مسارٌ واحد، والسيرفر يقرّر (انظر useFilePreviewUrl).
 */
export async function downloadDocument(doc: PreviewableDoc): Promise<void> {
  const name = docName(doc);
  try {
    // كالمعاينة: السحابيّ عبر مسار OneDrive المباشر لا مسار الوثيقة —
    // ذاك يمرّ بـDocumentPolicy التي تجلب القضية بعمود najiz_data الضخم.
    if (doc.cloud_file_id) {
      const res = await fetch(`${API_URL}/cloud-storage/onedrive/preview-url/${doc.cloud_file_id}`, {
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => null);
      const href = (data?.success && data?.download_url) || doc.cloud_web_url;
      if (!href) throw new Error(data?.message || 'no-download-url');

      const a = document.createElement('a');
      a.href = href;
      a.download = name;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const res = await fetch(`${API_URL}/documents/${doc.id}/download`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`download HTTP ${res.status}`);

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    console.error('downloadDocument error:', err);
    alert('تعذّر تحميل الملف');
  }
}

const centered: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  textAlign: 'center',
  padding: '40px 24px',
};

interface FilePreviewProps {
  doc: PreviewableDoc;
  /** يُعرض زر التحميل عند تعذّر المعاينة (افتراضي: true) */
  showDownloadFallback?: boolean;
}

/**
 * جسم المعاينة الموحّد — مصدر الحقيقة الوحيد لعرض أي ملف.
 * يكتشف النوع (صورة/PDF/Word) ويعرضه عبر العارض الآمن المناسب،
 * ويتعامل مع الملفات المحلية و OneDrive بالطريقة الصحيحة لكلٍّ منها.
 */
const FilePreview: React.FC<FilePreviewProps> = ({ doc, showDownloadFallback = true }) => {
  const { url, loading, error } = useFilePreviewUrl(doc);

  const name = docName(doc);
  const mime = docMime(doc);
  const lower = name.toLowerCase();
  const isImage = mime.includes('image');
  const isPdf = mime.includes('pdf') || lower.endsWith('.pdf');
  const isWord =
    mime.includes('word') ||
    mime.includes('officedocument.wordprocessing') ||
    mime.includes('msword') ||
    lower.endsWith('.docx') ||
    lower.endsWith('.doc');

  if (loading) {
    return (
      <div style={centered}>
        <Loader2 size={32} style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>جارٍ تحميل المعاينة...</span>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div style={centered}>
        <AlertTriangle size={48} style={{ color: 'var(--color-error)' }} />
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
          {error || 'تعذّر تحميل المعاينة'}
        </span>
        {showDownloadFallback && (
          <button
            onClick={() => downloadDocument(doc)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              color: 'white',
              background: 'var(--color-primary)',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            <Download size={16} /> تحميل الملف
          </button>
        )}
      </div>
    );
  }

  if (isImage) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'auto' }}>
        <img src={url} alt={name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 6 }} />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SecurePdfViewer url={url} fileName={name} />
      </div>
    );
  }

  if (isWord) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SecureWordViewer url={url} fileName={name} />
      </div>
    );
  }

  // نوع غير مدعوم للمعاينة
  const Icon = mime.includes('image') ? ImageIcon : mime.includes('pdf') || isWord ? FileText : FileIcon;
  return (
    <div style={centered}>
      <Icon size={48} style={{ color: 'var(--color-text-secondary)' }} />
      <span style={{ color: 'var(--color-text)', fontSize: 14, fontWeight: 600 }}>لا يمكن معاينة هذا النوع من الملفات</span>
      <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>يمكنك تحميل الملف لفتحه في التطبيق المناسب.</span>
      {showDownloadFallback && (
        <button
          onClick={() => downloadDocument(doc)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 500,
            color: 'white',
            background: 'var(--color-primary)',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          <Download size={16} /> تحميل الملف
        </button>
      )}
    </div>
  );
};

export default FilePreview;
