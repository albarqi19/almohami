import React from 'react';
import { Trophy, X as XIcon, HandshakeIcon, Ban, Scale, HelpCircle } from 'lucide-react';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

interface OutcomeBadgeProps {
  outcome?: 'won' | 'lost' | 'settled' | 'appealed' | 'dismissed' | null;
  confidence?: 'low' | 'medium' | 'high' | null;
  source?: 'manual' | 'ai' | null;
  appealed?: boolean;
  partial?: boolean;
  size?: 'sm' | 'md';
}

const OUTCOME_META = {
  won:       { label: 'لصالحنا',       icon: Trophy,        className: 'outcome-badge--won' },
  lost:      { label: 'ضدنا',          icon: XIcon,         className: 'outcome-badge--lost' },
  settled:   { label: 'تسوية',          icon: HandshakeIcon, className: 'outcome-badge--settled' },
  dismissed: { label: 'مرفوضة شكلاً',   icon: Ban,           className: 'outcome-badge--dismissed' },
  appealed:  { label: 'مستأنفة',        icon: Scale,         className: 'outcome-badge--appealed' },
} as const;

/**
 * Badge لعرض نتيجة القضية. يدعم:
 *  - 4 نتائج أساسية: won/lost/settled/dismissed
 *  - حالة appealed منفصلة (boolean) — تُضاف كأيقونة صغيرة بجانب الـ badge
 *  - partial — يُضاف نص "(جزئي)" داخل الـ badge
 *  - confidence/source — لا يُعرض هنا، يُستخدم في Tooltip منفصل
 */
const OutcomeBadge: React.FC<OutcomeBadgeProps> = ({
  outcome,
  appealed,
  partial,
  source,
  size = 'md',
}) => {
  if (!outcome) return null;

  const meta = OUTCOME_META[outcome] || {
    label: 'غير محددة',
    icon: HelpCircle,
    className: 'outcome-badge--unknown',
  };
  const Icon = meta.icon;

  return (
    <span
      className={`outcome-badge ${meta.className} outcome-badge--${size}`}
      title={source === 'ai' ? 'حُدِّدت تلقائياً' : undefined}
    >
      <Icon size={size === 'sm' ? 12 : 14} />
      <span>
        {meta.label}
        {partial && <span className="outcome-badge__partial"> (جزئي)</span>}
      </span>
      {appealed && (
        <span className="outcome-badge__appealed-tag" title="القضية مستأنفة/مميَّزة">
          <Scale size={size === 'sm' ? 10 : 12} />
        </span>
      )}
      {source === 'ai' && <span className="outcome-badge__ai-dot" aria-label="AI" />}
    </span>
  );
};

export default OutcomeBadge;
