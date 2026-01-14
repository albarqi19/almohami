import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
  iconColor = '#3b82f6',
  iconBgColor = '#eff6ff',
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
    let trendColor = '#6b7280';
    let trendBgColor = '#f3f4f6';

    if (!isNeutral) {
      TrendIcon = isPositive ? TrendingUp : TrendingDown;
      trendColor = isGood ? '#059669' : '#dc2626';
      trendBgColor = isGood ? '#ecfdf5' : '#fef2f2';
    }

    return {
      Icon: TrendIcon,
      color: trendColor,
      bgColor: trendBgColor,
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
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        cursor: onClick ? 'pointer' : 'default',
        direction: 'rtl',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px',
        }}
      >
        {/* الأيقونة */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: iconBgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={24} color={iconColor} />
        </div>

        {/* مؤشر الاتجاه */}
        {trendInfo && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '20px',
              backgroundColor: trendInfo.bgColor,
              fontSize: '12px',
              fontWeight: '600',
              color: trendInfo.color,
            }}
          >
            <trendInfo.Icon size={14} />
            <span>{trendInfo.text}</span>
          </div>
        )}
      </div>

      {/* العنوان */}
      <div
        style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '4px',
        }}
      >
        {title}
      </div>

      {/* القيمة */}
      <div
        style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#111827',
          lineHeight: '1.2',
        }}
      >
        {formatValue(value)}
      </div>

      {/* النص الفرعي */}
      {subtitle && (
        <div
          style={{
            fontSize: '13px',
            color: '#9ca3af',
            marginTop: '4px',
          }}
        >
          {subtitle}
        </div>
      )}

      {/* وصف الاتجاه */}
      {trend?.label && (
        <div
          style={{
            fontSize: '12px',
            color: '#9ca3af',
            marginTop: '8px',
          }}
        >
          {trend.label}
        </div>
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
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '16px',
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
  color = '#3b82f6',
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        direction: 'rtl',
      }}
    >
      <div
        style={{
          width: '4px',
          height: '32px',
          backgroundColor: color,
          borderRadius: '2px',
        }}
      />
      <div>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>{label}</div>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
          {value}
        </div>
      </div>
    </div>
  );
};

export default BillingStatsCard;
