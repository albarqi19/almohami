// شارة الجاهزية مع tooltip شارح
// تعرض score 0-100 مع لون حسب التصنيف:
// >= 75 → ready (أخضر)
// 40-74 → needs_review (أصفر)
// < 40 → high_risk (أحمر)

import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export interface ReadinessBreakdownItem {
  label: string;
  status: 'done' | 'pending' | 'warning';
}

interface Props {
  score: number | null;
  status: 'ready' | 'needs_review' | 'high_risk' | 'unknown';
  breakdown?: ReadinessBreakdownItem[];
}

const STATUS_META = {
  ready: { color: 'rgb(34, 197, 94)', bg: 'var(--color-success-soft, rgba(34,197,94,0.12))', label: 'جاهز', icon: CheckCircle2 },
  needs_review: { color: 'rgb(234, 179, 8)', bg: 'var(--color-warning-soft, rgba(234,179,8,0.12))', label: 'يحتاج مراجعة', icon: AlertTriangle },
  high_risk: { color: 'rgb(239, 68, 68)', bg: 'var(--color-error-soft, rgba(239,68,68,0.12))', label: 'عالي الخطورة', icon: AlertCircle },
  unknown: { color: 'var(--color-text-secondary)', bg: 'var(--color-neutral-soft, rgba(120,120,120,0.1))', label: 'غير محدد', icon: Info },
} as const;

export const ReadinessBadge: React.FC<Props> = ({ score, status, breakdown }) => {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className="readiness-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 'var(--radius-xs, 8px)',
              border: `1px solid ${meta.color}`,
              background: meta.bg,
              color: meta.color,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'help',
              fontFamily: 'var(--font-family-base)',
            }}
          >
            <Icon size={13} strokeWidth={2} />
            <span>{score !== null ? `${score} ${meta.label}` : meta.label}</span>
            <Info size={11} opacity={0.7} />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="bottom"
            sideOffset={6}
            className="readiness-badge-tip"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-xs, 8px)',
              boxShadow: '0 6px 18px rgba(0,0,0,0.1)',
              fontFamily: 'var(--font-family-base)',
              fontSize: 12,
              maxWidth: 280,
              zIndex: 1000,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              جاهزية الجلسة: {score !== null ? `${score}%` : 'غير محسوبة'}
            </div>
            {breakdown && breakdown.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {breakdown.map((b, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.4 }}>
                    <span style={{ fontSize: 13 }}>
                      {b.status === 'done' ? '✓' : b.status === 'warning' ? '⚠' : '○'}
                    </span>
                    <span style={{ color: b.status === 'warning' ? 'var(--color-warning)' : b.status === 'done' ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                      {b.label}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ color: 'var(--color-text-secondary)' }}>
                يُحتسب من: التحضيرات المكتملة (50)، الطلبات الجاهزة (35)، وجود تخطيط (15).
              </div>
            )}
            <Tooltip.Arrow style={{ fill: 'var(--color-surface)' }} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};
