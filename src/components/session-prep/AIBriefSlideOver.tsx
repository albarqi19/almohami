// Slide-over لعرض AI Brief الكامل بنمط document
// - sticky summary (context_quality + risk_score + actions)
// - collapsible sections
// - typography مريحة للقراءة

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'react-toastify';
import {
  X,
  ChevronDown,
  ChevronLeft,
  RotateCw,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ClipboardCheck,
  Clock,
  HelpCircle,
  TrendingUp,
  XCircle,
  Info,
} from 'lucide-react';
import { useRegenerateAiBrief, useReviewAiBrief } from '../../hooks/useSessionPrep';
import type { AiBriefResponse } from '../../services/sessionPrepService';

interface Props {
  sessionId: number;
  aiBrief: AiBriefResponse | null | undefined;
  open: boolean;
  onClose: () => void;
  isSessionCompleted?: boolean;
}

interface SectionProps {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  iconColor?: string;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ icon: Icon, iconColor, title, count, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  if (!children) return null;
  return (
    <div className="sob-section">
      <button
        type="button"
        className="sob-section__head"
        onClick={() => setOpen((v) => !v)}
      >
        <span style={{ color: iconColor || 'var(--color-text-secondary)', display: 'inline-flex' }}>
          <Icon size={13} strokeWidth={2} />
        </span>
        <span className="sob-section__title">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="sob-section__count">{count}</span>
        )}
        {open ? <ChevronDown size={12} /> : <ChevronLeft size={12} />}
      </button>
      {open && <div className="sob-section__body">{children}</div>}
    </div>
  );
};

export const AIBriefSlideOver: React.FC<Props> = ({ sessionId, aiBrief, open, onClose, isSessionCompleted }) => {
  const regenMut = useRegenerateAiBrief(sessionId);
  const reviewMut = useReviewAiBrief(sessionId);

  const handleRegen = () => {
    if (isSessionCompleted) {
      toast.warning('لا يمكن إعادة توليد كشف لجلسة منتهية. الكشف الحالي محفوظ في الأرشيف.');
      return;
    }
    regenMut.mutate(undefined, {
      onSuccess: () => toast.info('بدأت إعادة التوليد...'),
      onError: () => toast.error('تعذّر بدء التوليد'),
    });
  };

  const brief = aiBrief?.brief ?? null;
  const status = aiBrief?.status ?? 'pending';

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="sob-overlay" />
        <Dialog.Content className="sob-content" aria-describedby={undefined}>
          {/* Sticky Summary */}
          <div className="sob-summary">
            <Dialog.Title className="sob-summary__title">
              <FileText size={14} strokeWidth={2.2} style={{ verticalAlign: '-2px', marginInlineEnd: 6 }} />
              كشف الجلسة
            </Dialog.Title>
            <div className="sob-summary__meta">
              <span className="sob-chip">
                جودة السياق: <strong>{brief?.context_quality || '-'}</strong>
              </span>
              <span className="sob-chip">
                risk_score: <strong>{aiBrief?.risk_score ?? '-'}</strong>
              </span>
              {aiBrief?.reviewed_at && (
                <span className="sob-chip sob-chip--success">
                  <CheckCircle2 size={11} /> مُراجَع
                </span>
              )}
              {aiBrief?.is_stale && (
                <span className="sob-chip sob-chip--warning">⚠ قديم</span>
              )}
            </div>
            <div className="sob-summary__actions">
              <button
                type="button"
                className="sp-btn sp-btn--ghost"
                onClick={handleRegen}
                disabled={regenMut.isPending || status === 'generating'}
                title={isSessionCompleted ? 'الجلسة منتهية — التوليد غير متاح' : undefined}
              >
                <RotateCw size={11} />
                <span>إعادة التوليد</span>
              </button>
              {status === 'ready' && !aiBrief?.reviewed_at && (
                <button
                  type="button"
                  className="sp-btn sp-btn--primary"
                  onClick={() => {
                    reviewMut.mutate(undefined, {
                      onSuccess: () => toast.success('تم التأشير كمُراجَع'),
                      onError: () => toast.error('تعذّر التأشير'),
                    });
                  }}
                  disabled={reviewMut.isPending}
                >
                  <CheckCircle2 size={11} />
                  <span>تأشير كمُراجَع</span>
                </button>
              )}
              <Dialog.Close asChild>
                <button type="button" className="sp-icon-btn" aria-label="إغلاق">
                  <X size={14} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Scrollable Document */}
          <div className="sob-document">
            {!brief && (
              <div className="sp-empty" style={{ padding: '40px 20px' }}>
                <p>لا يوجد محتوى لعرضه.</p>
                <p style={{ fontSize: 11, opacity: 0.7 }}>الحالة: {status}</p>
              </div>
            )}

            {brief && (
              <>
                <Section icon={FileText} iconColor="var(--color-primary)" title="ملخص آخر جلسة" defaultOpen>
                  <p className="sob-prose">{brief.last_session_summary || '—'}</p>
                </Section>

                <Section icon={Info} iconColor="var(--color-primary)" title="الغرض المتوقع للجلسة" defaultOpen>
                  <p className="sob-prose">{brief.expected_session_purpose || '—'}</p>
                </Section>

                <Section
                  icon={AlertTriangle}
                  iconColor="var(--color-error)"
                  title="تنبيهات حرجة"
                  count={(brief.risk_flags || []).length}
                  defaultOpen={(brief.risk_flags || []).some((f) => f.level === 'high')}
                >
                  <ul className="sob-list">
                    {(brief.risk_flags || []).map((f, i) => (
                      <li key={i} className="sob-list__item">
                        <span
                          className="sob-level"
                          style={{
                            color:
                              f.level === 'high'
                                ? 'var(--color-error)'
                                : f.level === 'medium'
                                ? 'var(--color-warning)'
                                : 'var(--color-text-secondary)',
                          }}
                        >
                          [{f.level}]
                        </span>
                        <span>{f.message}</span>
                        {f.evidence?.source && (
                          <div className="sob-source">
                            المصدر: {f.evidence.source}
                            {f.evidence.quote && <div className="sob-quote">"{f.evidence.quote}"</div>}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section
                  icon={ClipboardCheck}
                  iconColor="var(--color-warning)"
                  title="أوامر قضائية معلّقة"
                  count={(brief.pending_court_orders || []).length}
                >
                  <ul className="sob-list">
                    {(brief.pending_court_orders || []).map((o, i) => (
                      <li key={i} className="sob-list__item">
                        <strong>{o.order}</strong>
                        {o.from_session_date && (
                          <span style={{ fontSize: 11, opacity: 0.7, marginInlineStart: 6 }}>
                            (من {o.from_session_date})
                          </span>
                        )}
                        {o.evidence?.source && (
                          <div className="sob-source">المصدر: {o.evidence.source}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section
                  icon={Clock}
                  iconColor="var(--color-warning)"
                  title="مهل حرجة"
                  count={(brief.critical_deadlines || []).length}
                >
                  <ul className="sob-list">
                    {(brief.critical_deadlines || []).map((d, i) => (
                      <li key={i} className="sob-list__item">
                        <strong>{d.item}</strong>
                        <span style={{ marginInlineStart: 6, color: d.severity === 'critical' ? 'var(--color-error)' : 'var(--color-warning)' }}>
                          ({d.days_remaining} يوم • {d.severity})
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section
                  icon={HelpCircle}
                  iconColor="var(--color-primary)"
                  title="أسئلة متوقعة من القاضي"
                  count={(brief.predicted_judge_questions || []).length}
                >
                  <ul className="sob-list">
                    {(brief.predicted_judge_questions || []).map((q, i) => (
                      <li key={i} className="sob-list__item">
                        <span>? {q.question}</span>
                        {q.rationale && <div className="sob-rationale">{q.rationale}</div>}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section
                  icon={FileText}
                  iconColor="var(--color-primary)"
                  title="طلبات إجرائية مقترحة"
                  count={(brief.suggested_motions || []).length}
                >
                  <ul className="sob-list">
                    {(brief.suggested_motions || []).map((m, i) => (
                      <li key={i} className="sob-list__item">
                        <strong>{m.title}</strong>
                        {m.tag && <span className="sp-tag-chip" style={{ marginInlineStart: 6 }}>{m.tag}</span>}
                        {m.urgency === 'urgent' && (
                          <span style={{ marginInlineStart: 6, color: 'var(--color-error)', fontWeight: 600, fontSize: 11 }}>
                            ⚡ عاجل
                          </span>
                        )}
                        {m.rationale && <div className="sob-rationale">{m.rationale}</div>}
                        {m.evidence?.source && (
                          <div className="sob-source">المصدر: {m.evidence.source}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section
                  icon={ClipboardCheck}
                  iconColor="var(--color-success)"
                  title="تحضيرات مقترحة"
                  count={(brief.suggested_preparations || []).length}
                >
                  <ul className="sob-list">
                    {(brief.suggested_preparations || []).map((p, i) => (
                      <li key={i} className="sob-list__item">
                        <strong>{p.title}</strong>
                        {p.rationale && <div className="sob-rationale">{p.rationale}</div>}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section
                  icon={TrendingUp}
                  iconColor="var(--color-text-secondary)"
                  title="أنماط الدائرة"
                  count={(brief.department_patterns || []).length}
                >
                  <ul className="sob-list">
                    {(brief.department_patterns || []).map((p, i) => (
                      <li key={i} className="sob-list__item">
                        • {p.observation}
                      </li>
                    ))}
                  </ul>
                </Section>

                {(brief.refusals || []).length > 0 && (
                  <Section
                    icon={XCircle}
                    iconColor="var(--color-text-secondary)"
                    title="بنود لم نقترحها (شفافية)"
                    count={(brief.refusals || []).length}
                  >
                    <ul className="sob-list">
                      {(brief.refusals || []).map((r, i) => (
                        <li key={i} className="sob-list__item sob-list__item--muted">✗ {r}</li>
                      ))}
                    </ul>
                  </Section>
                )}

                {(brief.limitations || []).length > 0 && (
                  <Section
                    icon={Info}
                    iconColor="var(--color-text-secondary)"
                    title="قيود السياق"
                    count={(brief.limitations || []).length}
                  >
                    <ul className="sob-list">
                      {(brief.limitations || []).map((l, i) => (
                        <li key={i} className="sob-list__item sob-list__item--muted">! {l}</li>
                      ))}
                    </ul>
                  </Section>
                )}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
