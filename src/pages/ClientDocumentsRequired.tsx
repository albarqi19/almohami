import React, { useState } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  XCircle,
  Brain,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  useMyDocumentRequests,
  useMyDocumentRequest,
  useClientUploadUrl,
  useClientRegisterUpload,
} from '../hooks/useDocumentRequests';
import { CloudStorageService } from '../services/cloudStorageService';
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  type DocumentRequest,
  type DocumentRequestItem,
} from '../types/documentRequests';

const ClientDocumentsRequired: React.FC = () => {
  const { data, isLoading } = useMyDocumentRequests();
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  const requests = data?.requests ?? [];
  const pendingCount = data?.pendingCount ?? 0;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
          📋 الوثائق المطلوبة
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          الوثائق التي طلبها منك المحامي. ارفعها هنا فقط ليتم حفظها في ملف قضيتك.
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <StatBox label="طلبات معلّقة" value={pendingCount} icon={<Clock />} color="#f59e0b" />
        <StatBox
          label="مكتمل"
          value={requests.filter((r) => r.status === 'completed').length}
          icon={<CheckCircle2 />}
          color="#10b981"
        />
        <StatBox label="إجمالي" value={requests.length} icon={<FileText />} color="#6366f1" />
      </div>

      {/* List */}
      {requests.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {requests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              isExpanded={expandedRequestId === req.id}
              onToggle={() => setExpandedRequestId(expandedRequestId === req.id ? null : req.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string }> = ({
  label,
  value,
  icon,
  color,
}) => (
  <div
    style={{
      padding: '14px',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}
  >
    <div
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '6px',
        background: `${color}20`,
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '20px', fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{label}</div>
    </div>
  </div>
);

const EmptyState: React.FC = () => (
  <div
    style={{
      padding: '60px 20px',
      textAlign: 'center',
      background: 'var(--color-surface)',
      border: '1px dashed var(--color-border)',
      borderRadius: '8px',
    }}
  >
    <FileText size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px' }} />
    <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>لا توجد وثائق مطلوبة منك حالياً</h3>
    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
      عندما يطلب منك المحامي وثائق، ستظهر هنا.
    </p>
  </div>
);

const RequestCard: React.FC<{
  request: DocumentRequest;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ request, isExpanded, onToggle }) => {
  // when expanded, fetch full details with submissions
  const { data: fullRequest } = useMyDocumentRequest(isExpanded ? request.id : null);
  const displayed = fullRequest ?? request;

  const isCompleted = request.status === 'completed';

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        onClick={onToggle}
        style={{
          padding: '14px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: isExpanded ? '1px solid var(--color-border)' : 'none',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '6px',
            background: isCompleted ? '#d1fae5' : '#fef3c7',
            color: isCompleted ? '#065f46' : '#92400e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isCompleted ? <CheckCircle2 size={20} /> : <Clock size={20} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
              {request.request_number}
            </span>
            <span
              style={{
                fontSize: '10px',
                padding: '1px 8px',
                borderRadius: '8px',
                background: isCompleted ? '#d1fae5' : '#dbeafe',
                color: isCompleted ? '#065f46' : '#1e40af',
              }}
            >
              {STATUS_LABELS[request.status]}
            </span>
            {(request.priority === 'urgent' || request.priority === 'high') && (
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 8px',
                  borderRadius: '8px',
                  background: '#fee2e2',
                  color: '#dc2626',
                }}
              >
                {PRIORITY_LABELS[request.priority]}
              </span>
            )}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '4px' }}>{request.title}</div>
          {request.case && (
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              القضية: {request.case.file_number}
              {request.case.title ? ` — ${request.case.title}` : ''}
            </div>
          )}

          {/* Progress */}
          <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, height: '5px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${request.progress_percentage}%`,
                  height: '100%',
                  background: isCompleted ? '#10b981' : '#3b82f6',
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {request.progress_percentage}%
            </span>
            {request.due_date && (
              <span style={{ fontSize: '11px', color: '#dc2626' }}>
                📅 {new Date(request.due_date).toLocaleDateString('ar-SA')}
              </span>
            )}
          </div>
        </div>

        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ padding: '14px 16px' }}>
          {request.client_message && (
            <div
              style={{
                padding: '10px 12px',
                background: '#eff6ff',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '13px',
                color: '#1e40af',
              }}
            >
              💬 {request.client_message}
            </div>
          )}

          {(displayed.items ?? []).map((item) => (
            <ItemRow key={item.id} item={item} requestId={request.id} />
          ))}
        </div>
      )}
    </div>
  );
};

const ItemRow: React.FC<{ item: DocumentRequestItem; requestId: number }> = ({ item, requestId }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const uploadUrlMutation = useClientUploadUrl();
  const registerMutation = useClientRegisterUpload(requestId);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // reset
    e.target.value = '';

    // Local validation
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const allowed = item.allowed_extensions ?? ['pdf', 'jpg', 'jpeg', 'png', 'docx'];
    if (!allowed.includes(ext)) {
      toast.error(`نوع الملف غير مسموح. المسموح: ${allowed.join(', ')}`);
      return;
    }
    const sizeMb = file.size / 1024 / 1024;
    if (sizeMb > item.max_file_size_mb) {
      toast.error(`حجم الملف يتجاوز الحد المسموح (${item.max_file_size_mb}MB)`);
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      // 1. Get upload URL
      const urlData = await uploadUrlMutation.mutateAsync({
        itemId: item.id,
        payload: {
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
        },
      });

      // 2. Upload directly to OneDrive
      const uploadResult = await CloudStorageService.uploadFileDirect(
        urlData.upload_url,
        file,
        (pct) => setProgress(pct)
      );

      if (!uploadResult.success || !uploadResult.fileId) {
        throw new Error(uploadResult.error || 'فشل الرفع إلى OneDrive');
      }

      // 3. Register the upload in our DB
      await registerMutation.mutateAsync({
        itemId: item.id,
        onedriveFileId: uploadResult.fileId,
      });

      toast.success('✓ تم رفع الملف وجاري تحليله');
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'فشل رفع الملف');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const statusColor =
    item.status === 'uploaded' || item.status === 'reviewed' ? '#10b981'
      : item.status === 'rejected' ? '#ef4444'
      : item.status === 'partially_uploaded' ? '#f59e0b'
      : '#9ca3af';

  return (
    <div
      style={{
        padding: '12px',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        marginBottom: '8px',
        background: 'var(--color-surface)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '12px',
            background: `${statusColor}20`,
            color: statusColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {item.status === 'uploaded' || item.status === 'reviewed' ? (
            <CheckCircle2 size={14} />
          ) : item.status === 'rejected' ? (
            <XCircle size={14} />
          ) : (
            <Clock size={14} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {item.title}
            {item.is_required ? (
              <span style={{ fontSize: '9px', color: '#dc2626', fontWeight: 600 }}>* مطلوب</span>
            ) : (
              <span style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>(اختياري)</span>
            )}
          </div>
          {item.client_message && (
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              {item.client_message}
            </div>
          )}
          <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            مرفوع: {item.uploaded_count} / {item.min_files}
            {item.max_files ? `-${item.max_files}` : ''} | الحد الأقصى: {item.max_file_size_mb}MB
          </div>
        </div>

        {item.can_accept_more && !uploading && (
          <button
            onClick={handleSelectFile}
            disabled={uploading}
            style={{
              padding: '6px 14px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
            }}
          >
            <Upload size={12} />
            رفع
          </button>
        )}
        {uploading && (
          <div style={{ fontSize: '11px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Loader2 size={14} className="animate-spin" />
            {progress > 0 ? `${progress}%` : 'جاري...'}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={(item.allowed_extensions ?? ['pdf', 'jpg', 'jpeg', 'png', 'docx']).map((e) => '.' + e).join(',')}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {/* Submissions */}
      {(item.submissions ?? []).length > 0 && (
        <div style={{ marginTop: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '6px' }}>
          {(item.submissions ?? []).map((sub) => (
            <div
              key={sub.id}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--color-text-secondary)',
              }}
            >
              {sub.document?.ai_status === 'processing' || sub.document?.ai_status === 'pending' ? (
                <>
                  <Loader2 size={11} className="animate-spin" style={{ color: '#3b82f6' }} />
                  <span style={{ color: '#3b82f6' }}>⏳ جاري تحليل الوثيقة...</span>
                </>
              ) : sub.document?.ai_status === 'completed' ? (
                <>
                  <Brain size={11} style={{ color: '#10b981' }} />
                  <span style={{ color: '#065f46' }}>✓ تم التعرف على الوثيقة</span>
                </>
              ) : (
                <CheckCircle2 size={11} style={{ color: '#10b981' }} />
              )}

              <span style={{ flex: 1 }}>{sub.document?.file_name}</span>

              {sub.document?.cloud_url && (
                <a
                  href={sub.document.cloud_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--color-primary)' }}
                  title="فتح الملف"
                >
                  <ExternalLink size={11} />
                </a>
              )}

              {sub.lawyer_review_status === 'approved' && (
                <span style={{ fontSize: '10px', color: '#065f46', fontWeight: 600 }}>✓ مُعتمد</span>
              )}
              {sub.lawyer_review_status === 'rejected' && (
                <span
                  style={{ fontSize: '10px', color: '#991b1b', fontWeight: 600 }}
                  title={sub.lawyer_review_note || ''}
                >
                  ✗ مرفوض
                </span>
              )}
            </div>
          ))}

          {/* Show rejection note if any */}
          {(item.submissions ?? []).some((s) => s.lawyer_review_status === 'rejected') && (
            <div
              style={{
                marginTop: '4px',
                padding: '6px 10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#991b1b',
              }}
            >
              <AlertCircle size={11} style={{ display: 'inline', marginLeft: '4px' }} />
              {(item.submissions ?? []).find((s) => s.lawyer_review_status === 'rejected')?.lawyer_review_note ??
                'تم رفض ملف. الرجاء إعادة الرفع.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientDocumentsRequired;
