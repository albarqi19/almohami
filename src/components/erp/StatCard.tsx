// [P4·UX-08] بطاقة إحصائية كثيفة — اللون عبر درجة (tone) مربوطة بـ tokens.
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { StatusTone } from '../../config/financeStatusConfig';

interface StatCardProps {
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
  tone?: StatusTone;
  /** لون نص القيمة (دلالي) — افتراضياً لون العنوان المحايد. */
  valueTone?: 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, value, label, tone = 'neutral', valueTone, onClick }) => (
  <div
    className={`fin-card${onClick ? ' fin-card--clickable' : ''}`}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
  >
    <div className={`fin-card__icon fin-card__icon--${tone}`}>
      <Icon size={18} />
    </div>
    <div className="fin-card__body">
      <div className={`fin-card__value${valueTone ? ` fin-card__value--${valueTone}` : ''}`}>{value}</div>
      <div className="fin-card__label">{label}</div>
    </div>
  </div>
);

export const StatCardGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fin-cards">{children}</div>
);

export default StatCard;
