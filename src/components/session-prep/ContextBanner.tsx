// Context Banner — يظهر فقط عند وجود urgent items
// يلخّص أهم خطر في صف واحد بارز فوق الصفحة

import React, { useMemo } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { AiBriefResponse, AiBriefJson } from '../../services/sessionPrepService';

interface Props {
  aiBrief?: AiBriefResponse | null;
  onOpenBrief?: () => void;
}

interface Urgent {
  level: 'high' | 'medium';
  message: string;
}

function extractUrgent(brief: AiBriefJson | null | undefined): Urgent | null {
  if (!brief) return null;

  // 1. أولاً: pending court orders غير منفّذة
  const orders = brief.pending_court_orders || [];
  const unfulfilled = orders.find((o) => o.fulfilled === false);
  if (unfulfilled) {
    return { level: 'high', message: `أمر قضائي غير منفّذ: ${unfulfilled.order}` };
  }

  // 2. ثانياً: deadlines حرجة
  const deadlines = brief.critical_deadlines || [];
  const critical = deadlines.find((d) => d.severity === 'critical');
  if (critical) {
    return { level: 'high', message: `مهلة حرجة: ${critical.item} (متبقي ${critical.days_remaining} يوم)` };
  }

  // 3. ثالثاً: risk_flags بمستوى high
  const flags = brief.risk_flags || [];
  const highFlag = flags.find((f) => f.level === 'high');
  if (highFlag) {
    return { level: 'high', message: highFlag.message };
  }

  return null;
}

export const ContextBanner: React.FC<Props> = ({ aiBrief, onOpenBrief }) => {
  const [dismissed, setDismissed] = React.useState(false);
  const urgent = useMemo(() => extractUrgent(aiBrief?.brief ?? null), [aiBrief]);

  if (!urgent || dismissed) return null;

  const bg = urgent.level === 'high' ? 'var(--color-error-soft, rgba(239,68,68,0.1))' : 'var(--color-warning-soft, rgba(234,179,8,0.1))';
  const border = urgent.level === 'high' ? 'var(--color-error)' : 'var(--color-warning)';
  const fg = urgent.level === 'high' ? 'var(--color-error)' : 'var(--color-warning)';

  return (
    <div
      className="sp-banner"
      style={{
        background: bg,
        borderColor: border,
        color: fg,
      }}
    >
      <AlertTriangle size={14} strokeWidth={2} />
      <span style={{ fontWeight: 600, flex: 1, fontSize: 12.5, color: 'var(--color-text)' }}>
        {urgent.message}
      </span>
      {onOpenBrief && (
        <button
          type="button"
          className="sp-banner__action"
          onClick={onOpenBrief}
          style={{ color: fg, fontWeight: 600 }}
        >
          عرض التفاصيل
        </button>
      )}
      <button
        type="button"
        className="sp-banner__close"
        onClick={() => setDismissed(true)}
        aria-label="إغلاق"
        style={{ color: fg }}
      >
        <X size={14} />
      </button>
    </div>
  );
};
