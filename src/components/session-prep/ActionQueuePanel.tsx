// "مركز التوصيات" — Action cards من AI brief
// كل عنصر: نوع الإجراء، السبب، المصدر، الثقة، أزرار التنفيذ
// الترتيب: تنبيهات حرجة → أوامر معلقة → طلبات مقترحة → تحضيرات → أسئلة → أنماط

import React from 'react';
import { toast } from 'react-toastify';
import {
  AlertTriangle,
  ClipboardCheck,
  FileText,
  CheckSquare,
  HelpCircle,
  TrendingUp,
  Sparkles,
  Plus,
  X,
  ExternalLink,
} from 'lucide-react';
import { useApplyAiActions } from '../../hooks/useSessionPrep';
import type {
  AiBriefResponse,
  AiBriefJson,
  AiSuggestion,
  AiRiskFlag,
  AiPendingOrder,
  AiEvidence,
} from '../../services/sessionPrepService';

interface Props {
  sessionId: number;
  aiBrief: AiBriefResponse | null | undefined;
  isLoading: boolean;
  onOpenFullBrief: () => void;
  onGenerateBrief: () => void;
}

const CONFIDENCE_COLOR = {
  high: 'var(--color-success)',
  medium: 'var(--color-warning)',
  low: 'var(--color-text-secondary)',
} as const;

const EvidenceLine: React.FC<{ ev?: AiEvidence }> = ({ ev }) => {
  if (!ev) return null;
  const c = ev.confidence ? CONFIDENCE_COLOR[ev.confidence] : 'var(--color-text-secondary)';
  return (
    <div className="aq-evidence">
      <span className="aq-evidence__label">المصدر:</span>
      <span className="aq-evidence__source">{ev.source}</span>
      {ev.confidence && (
        <span className="aq-evidence__confidence" style={{ color: c }}>
          • ثقة: {ev.confidence === 'high' ? 'عالية' : ev.confidence === 'medium' ? 'متوسطة' : 'منخفضة'}
        </span>
      )}
    </div>
  );
};

interface CardProps {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  iconColor: string;
  title: string;
  reason?: string;
  evidence?: AiEvidence;
  onPrimary?: () => void;
  primaryLabel?: string;
  onSecondary?: () => void;
  secondaryLabel?: string;
  badge?: string;
  badgeColor?: string;
}

const ActionCard: React.FC<CardProps> = ({
  icon: Icon,
  iconColor,
  title,
  reason,
  evidence,
  onPrimary,
  primaryLabel = 'نفّذ',
  onSecondary,
  secondaryLabel = 'تجاهل',
  badge,
  badgeColor,
}) => (
  <div className="aq-card">
    <div className="aq-card__head">
      <Icon size={13} strokeWidth={2} />
      <span className="aq-card__type" style={{ color: iconColor }}>
        {title}
      </span>
      {badge && (
        <span className="aq-card__badge" style={{ color: badgeColor || 'var(--color-warning)' }}>
          {badge}
        </span>
      )}
    </div>
    {reason && <div className="aq-card__reason">{reason}</div>}
    <EvidenceLine ev={evidence} />
    {(onPrimary || onSecondary) && (
      <div className="aq-card__actions">
        {onPrimary && (
          <button type="button" className="aq-btn aq-btn--primary" onClick={onPrimary}>
            <Plus size={11} />
            <span>{primaryLabel}</span>
          </button>
        )}
        {onSecondary && (
          <button type="button" className="aq-btn aq-btn--ghost" onClick={onSecondary}>
            <X size={11} />
            <span>{secondaryLabel}</span>
          </button>
        )}
      </div>
    )}
  </div>
);

export const ActionQueuePanel: React.FC<Props> = ({
  sessionId,
  aiBrief,
  isLoading,
  onOpenFullBrief,
  onGenerateBrief,
}) => {
  const applyMut = useApplyAiActions(sessionId);
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());

  const applyAction = (path: string, action: string, overrides?: Record<string, unknown>) => {
    applyMut.mutate(
      [{ path, action, overrides }],
      {
        onSuccess: (r) => {
          if (r.preparations_created || r.motions_created) {
            toast.success('تم تطبيق التوصية');
          }
        },
        onError: () => toast.error('تعذّر التطبيق'),
      }
    );
  };

  const dismiss = (key: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const brief: AiBriefJson | null = aiBrief?.brief ?? null;
  const status = aiBrief?.status ?? 'pending';

  // ─── حالات خاصة ───
  if (!aiBrief || status === 'pending') {
    return (
      <section className="sp-panel sp-panel--ai">
        <header className="sp-panel__header">
          <h2 className="sp-panel__title">
            <Sparkles size={13} /> مركز التوصيات
          </h2>
        </header>
        <div className="sp-panel__body">
          <div className="sp-empty">
            <p style={{ fontSize: 12 }}>لم يُولَّد ملخّص AI بعد لهذه الجلسة.</p>
            <button type="button" className="sp-btn sp-btn--primary" onClick={onGenerateBrief} style={{ marginTop: 8 }}>
              <Sparkles size={12} />
              <span>توليد ملخّص AI</span>
            </button>
            {isLoading && <p className="sp-panel__hint" style={{ marginTop: 6 }}>جاري التحميل...</p>}
          </div>
        </div>
      </section>
    );
  }

  if (status === 'generating') {
    return (
      <section className="sp-panel sp-panel--ai">
        <header className="sp-panel__header">
          <h2 className="sp-panel__title">
            <Sparkles size={13} /> مركز التوصيات
          </h2>
        </header>
        <div className="sp-panel__body">
          <div className="sp-empty">
            <div className="aq-spinner" />
            <p style={{ fontSize: 12, marginTop: 8 }}>جاري التوليد... ~25 ثانية</p>
            <p style={{ fontSize: 11, opacity: 0.7 }}>يحلّل الـ AI الجلسات السابقة والقضية</p>
          </div>
        </div>
      </section>
    );
  }

  if (status === 'failed') {
    return (
      <section className="sp-panel sp-panel--ai">
        <header className="sp-panel__header">
          <h2 className="sp-panel__title">
            <Sparkles size={13} /> مركز التوصيات
          </h2>
        </header>
        <div className="sp-panel__body">
          <div className="sp-empty">
            <p style={{ fontSize: 12, color: 'var(--color-error)' }}>فشل التوليد</p>
            <p style={{ fontSize: 11, opacity: 0.8 }}>{aiBrief.error_message || 'حدث خطأ غير متوقع'}</p>
            <button type="button" className="sp-btn sp-btn--primary" onClick={onGenerateBrief} style={{ marginTop: 8 }}>
              أعد المحاولة
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!brief) {
    return (
      <section className="sp-panel sp-panel--ai">
        <header className="sp-panel__header">
          <h2 className="sp-panel__title">
            <Sparkles size={13} /> مركز التوصيات
          </h2>
        </header>
        <div className="sp-panel__body">
          <p className="sp-empty">لا توجد محتويات</p>
        </div>
      </section>
    );
  }

  // ─── ترتيب الأولوية ───
  const highRiskFlags = (brief.risk_flags || []).filter((f) => f.level === 'high');
  const otherRiskFlags = (brief.risk_flags || []).filter((f) => f.level !== 'high');
  const pendingOrders = (brief.pending_court_orders || []).filter((o) => !o.fulfilled);
  const urgentMotions = (brief.suggested_motions || []).filter((m) => m.urgency === 'urgent');
  const normalMotions = (brief.suggested_motions || []).filter((m) => m.urgency !== 'urgent');
  const preps = brief.suggested_preparations || [];
  const questions = brief.predicted_judge_questions || [];
  const patterns = brief.department_patterns || [];

  const sections: React.ReactNode[] = [];

  // 1. تنبيهات حرجة
  highRiskFlags.forEach((f, i) => {
    const k = `rf-h-${i}`;
    if (dismissed.has(k)) return;
    sections.push(
      <ActionCard
        key={k}
        icon={AlertTriangle}
        iconColor="var(--color-error)"
        title="⚡ تنبيه حرج"
        reason={f.message}
        evidence={f.evidence}
        badge={f.category}
        onPrimary={() => applyAction(`risk_flags.${(brief.risk_flags || []).indexOf(f)}`, 'create_preparation')}
        primaryLabel="أضف كتحضير"
        onSecondary={() => dismiss(k)}
      />
    );
  });

  // 2. أوامر معلقة
  pendingOrders.forEach((o, i) => {
    const k = `pco-${i}`;
    if (dismissed.has(k)) return;
    const orderIdx = (brief.pending_court_orders || []).indexOf(o);
    sections.push(
      <ActionCard
        key={k}
        icon={ClipboardCheck}
        iconColor="var(--color-warning)"
        title="📋 أمر قضائي معلّق"
        reason={o.order}
        evidence={o.evidence}
        badge={o.from_session_date ? `من ${o.from_session_date}` : undefined}
        onPrimary={() => applyAction(`pending_court_orders.${orderIdx}`, 'create_preparation', { title: o.order })}
        primaryLabel="أضف كتحضير"
        onSecondary={() => dismiss(k)}
      />
    );
  });

  // 3. طلبات عاجلة → عادية
  [...urgentMotions, ...normalMotions].forEach((m: AiSuggestion, i) => {
    const k = `sm-${i}`;
    if (dismissed.has(k)) return;
    const motionIdx = (brief.suggested_motions || []).indexOf(m);
    sections.push(
      <ActionCard
        key={k}
        icon={FileText}
        iconColor={m.urgency === 'urgent' ? 'var(--color-error)' : 'var(--color-primary)'}
        title={m.urgency === 'urgent' ? '⚡ طلب عاجل مقترح' : '📄 طلب مقترح'}
        reason={m.rationale || m.title}
        evidence={m.evidence}
        badge={m.tag || undefined}
        onPrimary={() => applyAction(`suggested_motions.${motionIdx}`, 'create_motion')}
        primaryLabel="أضف كطلب"
        onSecondary={() => dismiss(k)}
      />
    );
  });

  // 4. تحضيرات
  preps.forEach((p: AiSuggestion, i) => {
    const k = `sp-${i}`;
    if (dismissed.has(k)) return;
    const prepIdx = (brief.suggested_preparations || []).indexOf(p);
    sections.push(
      <ActionCard
        key={k}
        icon={CheckSquare}
        iconColor="var(--color-success)"
        title="✓ تحضير مقترح"
        reason={p.rationale || p.title}
        evidence={p.evidence}
        onPrimary={() => applyAction(`suggested_preparations.${prepIdx}`, 'create_preparation')}
        primaryLabel="أضف"
        onSecondary={() => dismiss(k)}
      />
    );
  });

  // 5. risk_flags غير حرجة (مختصرة)
  otherRiskFlags.forEach((f, i) => {
    const k = `rf-o-${i}`;
    if (dismissed.has(k)) return;
    sections.push(
      <ActionCard
        key={k}
        icon={AlertTriangle}
        iconColor="var(--color-warning)"
        title="⚠ تنبيه"
        reason={f.message}
        evidence={f.evidence}
        badge={f.category}
        onSecondary={() => dismiss(k)}
        secondaryLabel="تجاهل"
      />
    );
  });

  // 6. أسئلة متوقعة (مختصرة، بدون أزرار رئيسية)
  if (questions.length > 0) {
    sections.push(
      <div key="questions-section" className="aq-card aq-card--muted">
        <div className="aq-card__head">
          <HelpCircle size={12} />
          <span className="aq-card__type">أسئلة متوقعة من القاضي ({questions.length})</span>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {questions.slice(0, 3).map((q, i) => (
            <li key={i} style={{ fontSize: 11.5, lineHeight: 1.5, paddingInlineStart: 12, position: 'relative' }}>
              <span style={{ position: 'absolute', insetInlineStart: 0 }}>?</span>
              {q.question}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // 7. أنماط الدائرة (في الأسفل)
  if (patterns.length > 0) {
    sections.push(
      <div key="patterns-section" className="aq-card aq-card--muted">
        <div className="aq-card__head">
          <TrendingUp size={12} />
          <span className="aq-card__type">أنماط الدائرة</span>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', fontSize: 11.5, lineHeight: 1.5 }}>
          {patterns.map((p, i) => (
            <li key={i}>• {p.observation}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <section className="sp-panel sp-panel--ai">
      <header className="sp-panel__header">
        <h2 className="sp-panel__title">
          <Sparkles size={13} /> مركز التوصيات
          {brief.context_quality && (
            <span className="sp-panel__count" style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
              جودة: {brief.context_quality}
            </span>
          )}
        </h2>
        <button type="button" className="sp-link-btn" onClick={onOpenFullBrief}>
          <ExternalLink size={11} />
          <span>الكشف الكامل</span>
        </button>
      </header>

      <div className="sp-panel__body sp-panel__body--ai">
        {sections.length === 0 ? (
          <div className="sp-empty">
            <p style={{ fontSize: 12 }}>لا توجد توصيات حالياً.</p>
            <p style={{ fontSize: 11, opacity: 0.7 }}>قد يكون السياق محدوداً.</p>
          </div>
        ) : (
          sections
        )}
      </div>
    </section>
  );
};
