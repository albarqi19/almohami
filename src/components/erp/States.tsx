// [P4·UX-08/UX-11] حالات موحّدة: تحميل / فارغ / خطأ — لكل شاشة (لا شاشة فارغة صامتة).
import React from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const LoadingState: React.FC<{ text?: string }> = ({ text = 'جارٍ التحميل...' }) => (
  <div className="fin-state">
    <div className="fin-spinner" />
    <div className="fin-state__desc">{text}</div>
  </div>
);

export const EmptyState: React.FC<{ icon?: LucideIcon; title?: string; desc?: string; children?: React.ReactNode }> = ({
  icon: Icon = Inbox,
  title = 'لا توجد بيانات',
  desc,
  children,
}) => (
  <div className="fin-state">
    <Icon className="fin-state__icon" size={40} />
    <div className="fin-state__title">{title}</div>
    {desc && <div className="fin-state__desc">{desc}</div>}
    {children}
  </div>
);

export const ErrorState: React.FC<{ title?: string; desc?: string; onRetry?: () => void }> = ({
  title = 'تعذّر تحميل البيانات',
  desc = 'حدث خطأ أثناء جلب البيانات. تأكّد من الاتصال وأعد المحاولة.',
  onRetry,
}) => (
  <div className="fin-state fin-state--error">
    <AlertTriangle className="fin-state__icon" size={40} />
    <div className="fin-state__title">{title}</div>
    <div className="fin-state__desc">{desc}</div>
    {onRetry && (
      <button type="button" className="fin-btn fin-btn--sm" onClick={onRetry} style={{ marginTop: 8 }}>
        <RefreshCw size={14} /> إعادة المحاولة
      </button>
    )}
  </div>
);
