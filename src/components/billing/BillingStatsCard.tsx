import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import '../../styles/billing-stats-card.css';

interface BillingStatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  trend?: {
    value: number;
    label?: string;
    isPositiveGood?: boolean;
  };
  format?: 'currency' | 'number' | 'percentage' | 'text';
  onClick?: () => void;
}

const BillingStatsCard: React.FC<BillingStatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'var(--color-primary)',
  iconBgColor = 'var(--color-primary-soft)',
  trend,
  format = 'number',
  onClick,
}) => {
  // تنسيق القيمة
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('ar-SA', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val) + ' ر.س';
      case 'percentage':
        return val.toFixed(1) + '%';
      case 'number':
        return new Intl.NumberFormat('ar-SA').format(val);
      default:
        return String(val);
    }
  };

  // تحديد لون ورمز الاتجاه
  const getTrendInfo = () => {
    if (!trend) return null;

    const isPositive = trend.value > 0;
    const isNeutral = trend.value === 0;
    const isGood = trend.isPositiveGood !== false ? isPositive : !isPositive;

    let TrendIcon = Minus;
    let trendClass = 'neutral';

    if (!isNeutral) {
      TrendIcon = isPositive ? TrendingUp : TrendingDown;
      trendClass = isGood ? 'positive' : 'negative';
    }

    return {
      Icon: TrendIcon,
      className: trendClass,
      text: isNeutral ? '0%' : `${isPositive ? '+' : ''}${trend.value.toFixed(1)}%`,
    };
  };

  const trendInfo = getTrendInfo();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      onClick={onClick}
      className={`billing-stats-card ${onClick ? 'clickable' : ''}`}
    >
      <div className="billing-stats-card__header">
        {/* الأيقونة */}
        <div
          className="billing-stats-card__icon"
          style={{
            backgroundColor: iconBgColor,
            color: iconColor,
          }}
        >
          <Icon size={24} />
        </div>

        {/* مؤشر الاتجاه */}
        {trendInfo && (
          <div className={`billing-stats-card__trend billing-stats-card__trend--${trendInfo.className}`}>
            <trendInfo.Icon size={14} />
            <span>{trendInfo.text}</span>
          </div>
        )}
      </div>

      {/* العنوان */}
      <div className="billing-stats-card__title">{title}</div>

      {/* القيمة */}
      <div className="billing-stats-card__value">{formatValue(value)}</div>

      {/* النص الفرعي */}
      {subtitle && (
        <div className="billing-stats-card__subtitle">{subtitle}</div>
      )}

      {/* وصف الاتجاه */}
      {trend?.label && (
        <div className="billing-stats-card__trend-label">{trend.label}</div>
      )}
    </motion.div>
  );
};

// مكون مجموعة البطاقات
interface BillingStatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export const BillingStatsGrid: React.FC<BillingStatsGridProps> = ({
  children,
  columns = 4,
}) => {
  return (
    <div
      className="billing-stats-grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}
    >
      {children}
    </div>
  );
};

// مكون بطاقة صغيرة
interface MiniStatsCardProps {
  label: string;
  value: number | string;
  color?: string;
}

export const MiniStatsCard: React.FC<MiniStatsCardProps> = ({
  label,
  value,
  color = 'var(--color-primary)',
}) => {
  return (
    <div className="mini-stats-card">
      <div
        className="mini-stats-card__indicator"
        style={{ backgroundColor: color }}
      />
      <div className="mini-stats-card__content">
        <div className="mini-stats-card__label">{label}</div>
        <div className="mini-stats-card__value">{value}</div>
      </div>
    </div>
  );
};

export default BillingStatsCard;
