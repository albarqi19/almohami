import React, { useState } from 'react';
import {
  Send,
  Ban,
  Loader2,
  CheckCircle2,
  XCircle,
  EyeOff,
  AlertTriangle,
  Brain,
  ExternalLink,
  Clock,
  User,
} from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from '../Modal';
import {
  useDocumentRequest,
  useDocumentRequestTimeline,
  useSendDocumentRequest,
  useCancelDocumentRequest,
  useApproveSubmission,
  useRejectSubmission,
  useHideSubmission,
} from '../../hooks/useDocumentRequests';
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  ITEM_STATUS_LABELS,
  type DocumentSubmission,
} from '../../types/documentRequests';

interface Props {
  requestId: number;
  onClose: () => void;
}

const DocumentRequestDetailsModal: React.FC<Props> = ({ requestId, onClose }) => {
  const { data: request, isLoading, refetch } = useDocumentRequest(requestId);
  const { data: events = [] } = useDocumentRequestTimeline(requestId);

  const sendMutation = useSendDocumentRequest(requestId);
  const cancelMutation = useCancelDocumentRequest(requestId);
  const approveMutation = useApproveSubmission(requestId);
  const rejectMutation = useRejectSubmission(requestId);
  const hideMutation = useHideSubmission(requestId);

  const [rejectingSubmissionId, setRejectingSubmissionId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState<'items' | 'timeline'>('items');

  if (isLoading || !request) {
    return (
      <Modal isOpen={true} onClose={onClose} title="جاري التحميل…" size="lg" zIndex={80}>
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <Loader2 size={20} className="animate-spin" />
        </div>
      </Modal>
    );
  }

  const handleSend = async () => {
    try {
      await sendMutation.mutateAsync();
      toast.success('تم إرسال الطلب للعميل');
      refetch();
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'فشل الإرسال');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return;
    try {
      await cancelMutation.mutateAsync(undefined);
      toast.success('تم إلغاء الطلب');
      refetch();
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'فشل الإلغاء');
    }
  };

  const handleApprove = async (sid: number) => {
    try {
      await approveMutation.mutateAsync(sid);
      toast.success('تم اعتماد الملف');
      refetch();
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'فشل الاعتماد');
    }
  };

  const handleReject = async () => {
    if (!rejectingSubmissionId || !rejectReason.trim()) {
      toast.error('السبب مطلوب');
      return;
    }
    try {
      await rejectMutation.mutateAsync({ submissionId: rejectingSubmissionId, reason: rejectReason.trim() });
      toast.success('تم رفض الملف وإشعار العميل');
      setRejectingSubmissionId(null);
      setRejectReason('');
      refetch();
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'فشل الرفض');
    }
  };

  const handleHide = async (sid: number) => {
    if (!window.confirm('إخفاء هذا الملف؟ لن يراه العميل.')) return;
    try {
      await hideMutation.mutateAsync(sid);
      toast.success('تم إخفاء الملف');
      refetch();
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'فشل الإخفاء');
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`${request.request_number} — ${request.title}`}
      size="xl"
      zIndex={80}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Header bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'var(--color-surface-subtle)',
            borderRadius: '4px',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', flexWrap: 'wrap' }}>
            <Pill label={STATUS_LABELS[request.status]} color={getStatusColor(request.status)} />
            <Pill label={`الأولوية: ${PRIORITY_LABELS[request.priority]}`} color="#6366f1" />
            {request.due_date && (
              <Pill label={`📅 ${new Date(request.due_date).toLocaleDateString('ar-SA')}`} color="#f59e0b" />
            )}
            <span style={{ color: 'var(--color-text-secondary)' }}>التقدم: {request.progress_percentage}%</span>
            {request.client && (
              <span style={{ color: 'var(--color-text-secondary)' }}>
                <User size={11} style={{ display: 'inline', marginLeft: '2px' }} />
                {request.client.name}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {request.status === 'draft' && (
              <button onClick={handleSend} disabled={sendMutation.isPending} style={btnPrimary}>
                {sendMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                إرسال
              </button>
            )}
            {!['cancelled', 'completed'].includes(request.status) && (
              <button onClick={handleCancel} disabled={cancelMutation.isPending} style={btnDanger}>
                <Ban size={12} />
                إلغاء
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        {(request.client_message || request.internal_notes) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {request.client_message && (
              <div style={{ padding: '8px 10px', background: 'var(--color-surface-subtle)', borderRadius: '4px', fontSize: '12px' }}>
                <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>
                  رسالة للعميل
                </div>
                <div>{request.client_message}</div>
              </div>
            )}
            {request.internal_notes && (
              <div style={{ padding: '8px 10px', background: '#fef3c7', borderRadius: '4px', fontSize: '12px' }}>
                <div style={{ fontSize: '10px', color: '#92400e', marginBottom: '2px' }}>
                  🔒 ملاحظات داخلية (مخفية عن العميل)
                </div>
                <div style={{ color: '#78350f' }}>{request.internal_notes}</div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '0' }}>
          <TabButton active={activeTab === 'items'} onClick={() => setActiveTab('items')} label={`البنود (${request.items?.length ?? 0})`} />
          <TabButton active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} label={`السجل (${events.length})`} />
        </div>

        {/* Items tab */}
        {activeTab === 'items' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(request.items ?? []).map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  padding: '10px 12px',
                  background: 'var(--color-surface)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>#{item.order}</span>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{item.title}</span>
                  {item.expected_document_type_display && (
                    <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                      ({item.expected_document_type_display})
                    </span>
                  )}
                  <Pill label={ITEM_STATUS_LABELS[item.status]} color={getItemColor(item.status)} />
                  {item.is_required && <Pill label="إجباري" color="#dc2626" />}
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginRight: 'auto' }}>
                    {item.uploaded_count} / {item.min_files}{item.max_files ? `-${item.max_files}` : ''}
                  </span>
                </div>

                {item.client_message && (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '6px', paddingRight: '6px' }}>
                    💬 {item.client_message}
                  </div>
                )}

                {/* Submissions */}
                {(item.all_submissions ?? item.submissions ?? []).length > 0 && (
                  <div style={{ marginTop: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                    {(item.all_submissions ?? item.submissions ?? []).map((sub) => (
                      <SubmissionRow
                        key={sub.id}
                        sub={sub}
                        onApprove={() => handleApprove(sub.id)}
                        onReject={() => {
                          setRejectingSubmissionId(sub.id);
                          setRejectReason('');
                        }}
                        onHide={() => handleHide(sub.id)}
                        isPending={
                          (approveMutation.isPending || rejectMutation.isPending || hideMutation.isPending)
                        }
                      />
                    ))}
                  </div>
                )}

                {(item.all_submissions ?? item.submissions ?? []).length === 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
                    لم يرفع العميل أي ملف بعد
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Timeline tab */}
        {activeTab === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
            {events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)' }}>
                لا توجد أحداث بعد
              </div>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '6px 10px',
                    background: 'var(--color-surface-subtle)',
                    borderRadius: '3px',
                  }}
                >
                  <Clock size={12} style={{ color: 'var(--color-text-secondary)', marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500 }}>{ev.event_type_display}</span>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                        {new Date(ev.created_at).toLocaleString('ar-SA')}
                      </span>
                    </div>
                    {ev.actor && (
                      <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                        بواسطة: {ev.actor.name} ({ev.actor_role})
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Reject reason modal (inline overlay) */}
      {rejectingSubmissionId !== null && (
        <div
          onClick={() => setRejectingSubmissionId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--color-surface)',
              padding: '16px',
              borderRadius: '4px',
              width: '400px',
              maxWidth: '100%',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>سبب الرفض</h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
              سيُرسل السبب للعميل عبر واتساب ليتمكن من إعادة الرفع.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="مثال: الصورة غير واضحة، الرجاء إعادة التصوير"
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '8px',
                fontSize: '12px',
                border: '1px solid var(--color-border)',
                borderRadius: '3px',
                resize: 'vertical',
              }}
              maxLength={1000}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button onClick={() => setRejectingSubmissionId(null)} style={btnGhost}>
                إلغاء
              </button>
              <button onClick={handleReject} disabled={rejectMutation.isPending} style={btnDanger}>
                {rejectMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                رفض الملف
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

const SubmissionRow: React.FC<{
  sub: DocumentSubmission;
  onApprove: () => void;
  onReject: () => void;
  onHide: () => void;
  isPending: boolean;
}> = ({ sub, onApprove, onReject, onHide, isPending }) => {
  const aiStatus = sub.document?.ai_status;
  const isFlagged = sub.visibility_status === 'flagged';
  const isHidden = sub.visibility_status === 'hidden';

  return (
    <div
      style={{
        padding: '6px 8px',
        background: isHidden ? '#f3f4f6' : (isFlagged ? '#fef3c7' : 'var(--color-surface-subtle)'),
        borderRadius: '3px',
        marginBottom: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        opacity: isHidden ? 0.6 : 1,
      }}
    >
      {/* AI Status icon */}
      <div style={{ flexShrink: 0 }}>
        {aiStatus === 'completed' && !isFlagged && <Brain size={14} style={{ color: '#10b981' }} />}
        {aiStatus === 'processing' && <Loader2 size={14} className="animate-spin" style={{ color: '#3b82f6' }} />}
        {aiStatus === 'pending' && <Clock size={14} style={{ color: '#9ca3af' }} />}
        {aiStatus === 'failed' && <AlertTriangle size={14} style={{ color: '#ef4444' }} />}
        {isFlagged && <AlertTriangle size={14} style={{ color: '#f59e0b' }} />}
      </div>

      {/* File name + link */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {sub.document?.cloud_url ? (
            <a
              href={sub.document.cloud_url}
              target="_blank"
              rel="noreferrer"
              style={{
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              {sub.document.file_name}
              <ExternalLink size={10} />
            </a>
          ) : (
            <span>{sub.document?.file_name}</span>
          )}
          {sub.ai_match_score !== null && sub.ai_match_score !== undefined && (
            <span
              style={{
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '6px',
                background: sub.ai_match_score >= 70 ? '#d1fae5' : sub.ai_match_score >= 40 ? '#fef3c7' : '#fee2e2',
                color: sub.ai_match_score >= 70 ? '#065f46' : sub.ai_match_score >= 40 ? '#92400e' : '#991b1b',
              }}
            >
              AI {sub.ai_match_score}%
            </span>
          )}
        </div>
        {sub.ai_warning && (
          <div style={{ fontSize: '10px', color: '#92400e', marginTop: '1px' }}>
            ⚠️ {sub.ai_warning}
          </div>
        )}
        {sub.lawyer_review_status === 'rejected' && sub.lawyer_review_note && (
          <div style={{ fontSize: '10px', color: '#991b1b', marginTop: '1px' }}>
            ✗ مرفوض: {sub.lawyer_review_note}
          </div>
        )}
      </div>

      {/* Actions */}
      {sub.lawyer_review_status !== 'approved' && !isHidden && (
        <div style={{ display: 'flex', gap: '4px' }}>
          {sub.lawyer_review_status !== 'rejected' && (
            <button
              onClick={onApprove}
              disabled={isPending}
              title="اعتماد"
              style={iconBtn('#10b981')}
            >
              <CheckCircle2 size={12} />
            </button>
          )}
          <button onClick={onReject} disabled={isPending} title="رفض" style={iconBtn('#ef4444')}>
            <XCircle size={12} />
          </button>
          <button onClick={onHide} disabled={isPending} title="إخفاء" style={iconBtn('#6b7280')}>
            <EyeOff size={12} />
          </button>
        </div>
      )}
      {sub.lawyer_review_status === 'approved' && (
        <span style={{ fontSize: '10px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '2px' }}>
          <CheckCircle2 size={11} /> مُعتمد
        </span>
      )}
    </div>
  );
};

const Pill: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span
    style={{
      fontSize: '10px',
      padding: '1px 7px',
      borderRadius: '8px',
      background: `${color}20`,
      color,
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </span>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px 16px',
      background: 'transparent',
      border: 'none',
      borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
      color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: active ? 600 : 400,
    }}
  >
    {label}
  </button>
);

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: '#6b7280',
    sent: '#3b82f6',
    in_progress: '#f59e0b',
    awaiting_review: '#8b5cf6',
    completed: '#10b981',
    cancelled: '#9ca3af',
  };
  return map[status] || '#6b7280';
}

function getItemColor(status: string): string {
  const map: Record<string, string> = {
    pending: '#9ca3af',
    partially_uploaded: '#f59e0b',
    uploaded: '#3b82f6',
    reviewed: '#10b981',
    rejected: '#ef4444',
  };
  return map[status] || '#6b7280';
}

const iconBtn = (color: string): React.CSSProperties => ({
  padding: '3px',
  background: 'transparent',
  border: `1px solid ${color}`,
  color,
  borderRadius: '3px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
});

const btnPrimary: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '11px',
  background: 'var(--color-primary)',
  color: 'white',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '3px',
};

const btnGhost: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: '12px',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  border: '1px solid var(--color-border)',
  borderRadius: '3px',
  cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '11px',
  background: '#fee2e2',
  color: '#991b1b',
  border: '1px solid #fecaca',
  borderRadius: '3px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '3px',
};

export default DocumentRequestDetailsModal;
