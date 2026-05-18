import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowRight } from 'lucide-react';

const Forbidden: React.FC<{ requiredPermission?: string }> = ({ requiredPermission }) => {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--color-background)', color: 'var(--color-text)' }}
    >
      <div className="max-w-md w-full text-center">
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
          style={{ background: 'var(--color-error-soft, rgba(239, 68, 68, 0.1))' }}
        >
          <ShieldOff
            className="w-10 h-10"
            strokeWidth={1.5}
            style={{ color: 'var(--color-error, #ef4444)' }}
          />
        </div>

        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--color-heading)' }}
        >
          غير مصرح بالوصول
        </h1>

        <p className="mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          ليس لديك الصلاحية اللازمة لعرض هذه الصفحة.
        </p>

        {requiredPermission && (
          <p
            className="text-xs mb-6 font-mono"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            الصلاحية المطلوبة:{' '}
            <span style={{ color: 'var(--color-text)' }}>{requiredPermission}</span>
          </p>
        )}

        <p
          className="text-sm mb-6"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          إذا كنت تحتاج الوصول، تواصل مع مدير الشركة لمنحك الصلاحية المناسبة.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors"
            style={{
              color: 'var(--color-text)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-surface-subtle)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-surface)';
            }}
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            العودة
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors"
            style={{
              color: '#ffffff',
              background: 'var(--color-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-primary-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-primary)';
            }}
          >
            لوحة التحكم
          </button>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
