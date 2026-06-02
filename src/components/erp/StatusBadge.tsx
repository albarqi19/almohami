// [P4·UX-08] شارة حالة موحّدة — تقرأ من config حالة واحد، ألوانها عبر tokens (الثيمات الثلاثة).
import React from 'react';
import {
  getStatusMeta,
  INVOICE_STATUS, PAYMENT_STATUS, CONTRACT_STATUS, PAYMENT_TERM_STATUS, REMINDER_STATUS,
  type StatusMeta, type StatusTone,
} from '../../config/financeStatusConfig';

type BadgeKind = 'invoice' | 'payment' | 'contract' | 'paymentTerm' | 'reminder';

const MAPS: Record<BadgeKind, Record<string, StatusMeta>> = {
  invoice: INVOICE_STATUS,
  payment: PAYMENT_STATUS,
  contract: CONTRACT_STATUS,
  paymentTerm: PAYMENT_TERM_STATUS,
  reminder: REMINDER_STATUS,
};

interface StatusBadgeProps {
  kind: BadgeKind;
  status?: string | null;
  size?: 'sm' | 'lg';
  withIcon?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ kind, status, size = 'sm', withIcon = true }) => {
  const meta = getStatusMeta(MAPS[kind], status);
  const Icon = meta.icon;
  return (
    <span className={`fin-badge fin-badge--${meta.tone}${size === 'lg' ? ' fin-badge--lg' : ''}`}>
      {withIcon && <Icon size={size === 'lg' ? 14 : 12} />}
      {meta.label}
    </span>
  );
};

/** شارة نصّية حرّة بدرجة لون token (لأغراض غير الحالات: أيام تأخّر، وسوم...). */
export const ToneBadge: React.FC<{ tone: StatusTone; children: React.ReactNode; size?: 'sm' | 'lg' }> = ({ tone, children, size = 'sm' }) => (
  <span className={`fin-badge fin-badge--${tone}${size === 'lg' ? ' fin-badge--lg' : ''}`}>{children}</span>
);

export default StatusBadge;
