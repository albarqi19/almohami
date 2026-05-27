import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Ban,
  ChevronRight,
  Send,
  RefreshCw,
} from 'lucide-react';
import { useCaseDocumentRequests } from '../../hooks/useDocumentRequests';
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  type DocumentRequest,
  type DocumentRequestStatus,
} from '../../types/documentRequests';
import CreateDocumentRequestModal from './CreateDocumentRequestModal';
import DocumentRequestDetailsModal from './DocumentRequestDetailsModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  caseId: number;
  clientId: number;
  clientName?: string;
  caseTitle?: string;
}

const statusColors: Record<DocumentRequestStatus, string> = {
  draft: '#6b7280',
  sent: '#3b82f6',
  in_progress: '#f59e0b',
  awaiting_review: '#8b5cf6',
  completed: '#10b981',
  cancelled: '#9ca3af',
};

const statusIcons: Record<DocumentRequestStatus, React.ComponentType<{ size?: number }>> = {
  draft: Clock,
  sent: Send,
  in_progress: RefreshCw,
  awaiting_review: AlertCircle,
  completed: CheckCircle2,
  cancelled: Ban,
};

const DocumentRequestsPanel: React.FC<Props> = ({
  isOpen,
  onClose,
  caseId,
  clientId,
  clientName,
  caseTitle,
}) => {
  const { data: requests = [], isLoading, refetch } = useCaseDocumentRequests(isOpen ? caseId : null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

  // إحصائيات سريعة
  const stats = {
    pending: requests.filter((r) => r.status === 'sent' || r.status === 'in_progress').length,
    awaitingReview: requests.filter((r) => r.status === 'awaiting_review').length,
    completed: requests.filter((r) => r.status === 'completed').length,
    draft: requests.filter((r) => r.status === 'draft').length,
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.3)',
                zIndex: 60,
              }}
            />

            {/* Panel */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              style={{
                position: 'fixed',
                top: 0,
                bottom: 0,
                left: 0,
                width: '560px',
                maxWidth: '95vw',
                backgroundColor: 'var(--color-surface)',
                borderRight: '1px solid var(--color-border)',
                boxShadow: '4px 0 16px rgba(0,0,0,0.15)',
                zIndex: 61,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--color-border)',
                  background: 'var(--color-surface-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>
                    طلبات الوثائق من العميل
                  </h2>
                  {caseTitle && (
                    <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
                      {caseTitle}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Stats Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--color-border)',
                  fontSize: '11px',
                }}
              >
                <StatBox label="مسودة" value={stats.draft} color={statusColors.draft} />
                <StatBox label="معلّق" value={stats.pending} color={statusColors.sent} />
                <StatBox label="مراجعة" value={stats.awaitingReview} color={statusColors.awaiting_review} />
                <StatBox label="مكتمل" value={stats.completed} color={statusColors.completed} />
              </div>

              {/* Create button */}
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  <Plus size={14} />
                  إنشاء طلب جديد
                </button>
              </div>

              {/* List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                {isLoading ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    جاري التحميل…
                  </div>
                ) : requests.length === 0 ? (
                  <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    <p style={{ fontSize: '13px', marginBottom: '4px' }}>لا توجد طلبات وثائق بعد</p>
                    <p style={{ fontSize: '11px' }}>اضغط "إنشاء طلب جديد" لطلب وثائق من العميل</p>
                  </div>
                ) : (
                  requests.map((req) => (
                    <RequestCard
                      key={req.id}
                      request={req}
                      onClick={() => setSelectedRequestId(req.id)}
                    />
                  ))
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <CreateDocumentRequestModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        caseId={caseId}
        clientId={clientId}
        clientName={clientName}
        onCreated={(id) => {
          setShowCreateModal(false);
          refetch();
          setSelectedRequestId(id);
        }}
      />

      {/* Details Modal */}
      {selectedRequestId && (
        <DocumentRequestDetailsModal
          requestId={selectedRequestId}
          onClose={() => {
            setSelectedRequestId(null);
            refetch();
          }}
        />
      )}
    </>
  );
};

const StatBox: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div
    style={{
      padding: '6px 8px',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '4px',
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: '16px', fontWeight: 600, color }}>{value}</div>
    <div style={{ color: 'var(--color-text-secondary)', fontSize: '10px' }}>{label}</div>
  </div>
);

const RequestCard: React.FC<{ request: DocumentRequest; onClick: () => void }> = ({ request, onClick }) => {
  const Icon = statusIcons[request.status];
  const color = statusColors[request.status];

  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 12px',
        marginBottom: '6px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-surface-hover, var(--color-surface-subtle))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--color-surface)';
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '4px',
          background: `${color}20`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={16} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
            {request.request_number}
          </span>
          <span
            style={{
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: '8px',
              background: `${color}20`,
              color,
            }}
          >
            {STATUS_LABELS[request.status]}
          </span>
          {request.priority === 'urgent' || request.priority === 'high' ? (
            <span
              style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '8px',
                background: '#fee2e2',
                color: '#dc2626',
              }}
            >
              {PRIORITY_LABELS[request.priority]}
            </span>
          ) : null}
        </div>

        <div
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {request.title}
        </div>

        <div
          style={{
            marginTop: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            color: 'var(--color-text-secondary)',
          }}
        >
          <div style={{ flex: 1, height: '4px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${request.progress_percentage}%`,
                height: '100%',
                background: color,
              }}
            />
          </div>
          <span>{request.progress_percentage}%</span>
          {request.due_date && (
            <span style={{ fontSize: '10px' }}>
              📅 {new Date(request.due_date).toLocaleDateString('ar-SA')}
            </span>
          )}
        </div>
      </div>

      <ChevronRight size={14} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
    </div>
  );
};

export default DocumentRequestsPanel;
