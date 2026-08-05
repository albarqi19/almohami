import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building, Calendar, CheckCircle2, ChevronDown, ChevronUp, FileText, Paperclip, RotateCcw, Scale } from 'lucide-react';
import {
  caseRequestService,
  type CaseRequestItem,
  type CaseRequestsSummary,
} from '../services/caseRequestService';

/**
 * «المذكّرات المودَعة» — طلبات القضية في ناجز ومذكّراتها، بخطٍّ زمنيٍّ واحد.
 *
 * ثلاثة مواضع لهذه الوحدة في الصفحة، ولكلٍّ وظيفة:
 *   - شريطُ الإنذار (هنا، أعلى القسم): مذكّرةُ الخصم المعلّقة **إنذارٌ لا عنصرُ قائمة**.
 *   - خطُّ زمنيٍّ بالنص الكامل: المذكّرة نصٌّ قانونيٌّ يُقرأ ويُقارَن بما قبله.
 *   - زرٌّ في الترويسة بعدّاد (في الصفحة الأمّ) للاتّساق مع الوثائق/المهام/الجلسات.
 *
 * ⚠️ التسمية: «إنشاء مذكرة» في النظام تعني ما نكتبه نحن. وهذه **المودَعة** في المحكمة.
 */

interface Props {
  caseId: number;
  /** يُرفع للأعلى ليُحدِّث عدّاد زرّ الترويسة وشريطَ الإنذار في الصفحة الأمّ */
  onSummaryChange?: (summary: CaseRequestsSummary | null) => void;
}

const SIDE_STYLE: Record<string, { bg: string; color: string }> = {
  opponent: { bg: 'rgba(209,73,91,0.12)', color: '#b91c1c' },
  ours: { bg: 'rgba(37,99,235,0.10)', color: '#2563eb' },
  co_party: { bg: 'rgba(217,119,6,0.14)', color: '#b45309' },
  unknown: { bg: 'rgba(100,116,139,0.14)', color: '#475569' },
};

const REPLY_STYLE: Record<string, { bg: string; color: string }> = {
  awaiting_reply: { bg: 'rgba(209,73,91,0.12)', color: '#b91c1c' },
  replied: { bg: 'rgba(21,115,71,0.12)', color: '#157347' },
  dismissed: { bg: 'rgba(100,116,139,0.14)', color: '#475569' },
  stale: { bg: 'rgba(100,116,139,0.14)', color: '#475569' },
  unclassified: { bg: 'rgba(217,119,6,0.14)', color: '#b45309' },
};

const fmtDate = (d?: string | null): string => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('ar-SA');
  } catch {
    return d;
  }
};

const Badge: React.FC<{ label: string; style: { bg: string; color: string } }> = ({ label, style }) => (
  <span
    style={{
      fontSize: 12,
      fontWeight: 700,
      padding: '3px 12px',
      borderRadius: 999,
      background: style.bg,
      color: style.color,
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </span>
);

const NajizRequestsSection: React.FC<Props> = ({ caseId, onSummaryChange }) => {
  const [requests, setRequests] = useState<CaseRequestItem[]>([]);
  const [summary, setSummary] = useState<CaseRequestsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await caseRequestService.list(caseId);
      setRequests(data.requests);
      setSummary(data.summary);
      onSummaryChange?.(data.summary);
    } catch {
      setError('تعذّر تحميل المذكّرات المودَعة');
      onSummaryChange?.(null);
    } finally {
      setLoading(false);
    }
  }, [caseId, onSummaryChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDismiss = async (request: CaseRequestItem) => {
    const reason = window.prompt(
      'سببُ الإغلاق (اختياري) — مثلاً: رُدَّ عليها ورقياً في الجلسة، أو لا تستحق رداً'
    );
    if (reason === null) return; // ألغى

    try {
      setBusyId(request.id);
      await caseRequestService.dismiss(caseId, request.id, reason || undefined);
      await load();
    } catch {
      setError('تعذّر إغلاق المذكّرة');
    } finally {
      setBusyId(null);
    }
  };

  const handleReopen = async (request: CaseRequestItem) => {
    try {
      setBusyId(request.id);
      await caseRequestService.reopen(caseId, request.id);
      await load();
    } catch {
      setError('تعذّرت إعادة المذكّرة للمتابعة');
    } finally {
      setBusyId(null);
    }
  };

  const awaiting = useMemo(
    () => requests.filter((r) => r.reply_status === 'awaiting_reply'),
    [requests]
  );

  // لا تُعرض بطاقةٌ فارغة: القضايا التي لم يُمسح فيها شيء بعد لا شأن لها بهذا القسم.
  if (!loading && !error && requests.length === 0) return null;

  return (
    <div className="case-card" data-tour="case-najiz-requests" id="najiz-requests">
      <div className="case-card__header">
        <div className="case-card__title">
          <Scale size={16} />
          المذكّرات المودَعة
          {summary ? ` (${summary.total})` : ''}
        </div>
      </div>

      <div className="case-card__content">
        {loading && <div style={{ color: '#64748b', fontSize: 13 }}>جارٍ التحميل…</div>}

        {error && (
          <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 10 }}>{error}</div>
        )}

        {/* شريط الإنذار — يُرى قبل أن يُنقر شيء */}
        {!loading && awaiting.length > 0 && (
          <div
            style={{
              background: 'rgba(209,73,91,0.08)',
              border: '1px solid rgba(209,73,91,0.25)',
              borderRadius: 8,
              padding: '12px 14px',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <AlertTriangle size={18} color="#b91c1c" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13.5, lineHeight: 1.9, color: '#7f1d1d' }}>
              <strong>
                {awaiting.length === 1
                  ? 'مذكّرةٌ من الخصم بلا ردّ'
                  : `${awaiting.length} مذكّرات من الخصم بلا ردّ`}
              </strong>
              <div style={{ color: '#991b1b' }}>
                أقدمُها من «{awaiting[0].submitter_name || 'الخصم'}» بتاريخ {fmtDate(awaiting[0].request_date)}.
              </div>
            </div>
          </div>
        )}

        {/* موقع الموكّل غير محدَّد ⟵ لا تصنيف ولا تذكير حتى يُحدَّد */}
        {!loading && summary && summary.client_role !== 'plaintiff' && summary.client_role !== 'defendant' && (
          <div
            style={{
              background: 'rgba(217,119,6,0.08)',
              border: '1px solid rgba(217,119,6,0.25)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 14,
              fontSize: 13,
              color: '#92400e',
              lineHeight: 1.9,
            }}
          >
            موقعُ موكّلنا في هذه القضية غير محدَّد، فلا يُميَّز مُودِع المذكّرة ولا يصل تذكير.
            حدِّده من بيانات القضية ليعمل التمييز.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map((request) => {
            const isOpen = expanded.has(request.id);
            const sideStyle = SIDE_STYLE[request.side] ?? SIDE_STYLE.unknown;
            const replyStyle = REPLY_STYLE[request.reply_status];
            const busy = busyId === request.id;

            return (
              <div
                key={request.id}
                style={{
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  background: 'var(--card-bg, #fff)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {request.request_type_name || 'طلب'}
                    {request.request_code ? ` — ${request.request_code}` : ''}
                  </span>

                  {request.is_memo && <Badge label={request.side_arabic} style={sideStyle} />}

                  {replyStyle && (
                    <Badge label={request.reply_status_arabic} style={replyStyle} />
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 14,
                    flexWrap: 'wrap',
                    fontSize: 12.5,
                    color: '#64748b',
                    marginTop: 6,
                  }}
                >
                  <span>
                    <Calendar size={12} /> {fmtDate(request.request_date)}
                  </span>
                  {request.submitter_name && (
                    <span>
                      المودِع: {request.submitter_name}
                      {request.submitter_role_name ? ` (${request.submitter_role_name})` : ''}
                    </span>
                  )}
                  {request.filed_by_agent_name && request.filed_by_agent_name !== request.submitter_name && (
                    <span>بوكالة: {request.filed_by_agent_name}</span>
                  )}
                  {request.court_name && (
                    <span>
                      <Building size={12} /> {request.court_name}
                    </span>
                  )}
                  {request.attachments.length > 0 && (
                    <span>
                      <Paperclip size={12} /> {request.attachments.length} مرفق
                    </span>
                  )}
                </div>

                {request.dismiss_reason && (
                  <div style={{ fontSize: 12.5, color: '#475569', marginTop: 6 }}>
                    سببُ الإغلاق: {request.dismiss_reason}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {request.memo_text && (
                    <button
                      className="case-session-item__join-btn"
                      style={{ background: 'rgba(37,99,235,0.10)', color: '#2563eb' }}
                      onClick={() => toggle(request.id)}
                    >
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isOpen ? 'إخفاء النص' : 'عرض نص المذكّرة'}
                    </button>
                  )}

                  {request.reply_status === 'awaiting_reply' && (
                    <button
                      className="case-session-item__join-btn"
                      style={{ background: 'rgba(21,115,71,0.10)', color: '#157347' }}
                      disabled={busy}
                      onClick={() => void handleDismiss(request)}
                      title="رُدَّ عليها ورقياً، أو قرّرتَ ألّا تردّ"
                    >
                      <CheckCircle2 size={14} />
                      تم الردّ خارج ناجز
                    </button>
                  )}

                  {request.reply_status === 'dismissed' && (
                    <button
                      className="case-session-item__join-btn"
                      style={{ background: 'rgba(100,116,139,0.12)', color: '#475569' }}
                      disabled={busy}
                      onClick={() => void handleReopen(request)}
                      title="أعِدها إلى المتابعة الآلية"
                    >
                      <RotateCcw size={14} />
                      إعادة للمتابعة
                    </button>
                  )}
                </div>

                {isOpen && request.memo_text && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '12px 14px',
                      background: 'rgba(100,116,139,0.05)',
                      borderRadius: 6,
                      fontSize: 13.5,
                      lineHeight: 2,
                      whiteSpace: 'pre-wrap',
                      maxHeight: 420,
                      overflowY: 'auto',
                    }}
                  >
                    {request.memo_text}
                  </div>
                )}

                {isOpen && request.attachments.length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 12.5, color: '#475569' }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>المرفقات:</div>
                    {request.attachments.map((attachment) => (
                      <div key={attachment.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <FileText size={12} />
                        {attachment.reason_text || attachment.file_name || 'مرفق'}
                        {attachment.extension ? ` (${attachment.extension})` : ''}
                        {attachment.download_status !== 'downloaded' && (
                          <span style={{ color: '#94a3b8' }}>— لم يُنزَّل بعد</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NajizRequestsSection;
