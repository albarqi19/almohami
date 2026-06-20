import React, { useState } from 'react';
import { CheckCircle2, X, Copy, Check, KeyRound } from 'lucide-react';

export interface CredentialField {
  label: string;
  value: string | null | undefined;
  copyable?: boolean;
  /** عرض بخط أحادي واتجاه LTR (للأرقام/الهوية/الـPIN) */
  mono?: boolean;
}

interface CredentialsModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  fields?: CredentialField[];
  note?: React.ReactNode;
  onClose: () => void;
}

/**
 * مودال نظام موحّد لعرض نتيجة إنشاء حساب / إعادة إصدار بيانات الدخول
 * (بديل alert المتصفح). مثيّم بمتغيّرات CSS، مع نسخ بزر لكل حقل. مشترك بين:
 * إنشاء عميل (AddClientModal)، إنشاء مستخدم/محامٍ وإعادة الإرسال (PermissionManagement)، وغيرها.
 */
const CredentialsModal: React.FC<CredentialsModalProps> = ({ isOpen, title, subtitle, fields = [], note, onClose }) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const copy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1500);
    } catch {
      /* تجاهل: المتصفح قد يمنع النسخ بلا https — الحقل ظاهر للنسخ اليدوي */
    }
  };

  const shown = fields.filter((f) => f.value != null && f.value !== '');

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-surface, #fff)', borderRadius: 10, width: '100%', maxWidth: 440,
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--color-border, #e5e7eb)' }}>
          <CheckCircle2 size={18} style={{ color: 'var(--status-green, #16a34a)', flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text, #111827)', lineHeight: 1.3 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #64748b)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary, #64748b)', padding: 2 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16 }}>
          {shown.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: note ? 14 : 0 }}>
              {shown.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    background: 'var(--dashboard-card, #f8fafc)', border: '1px solid var(--quiet-gray-200, #e5e7eb)', borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary, #64748b)', minWidth: 92 }}>{f.label}</span>
                  <span
                    style={{
                      flex: 1, fontSize: f.mono ? 15 : 13, fontWeight: f.mono ? 700 : 600,
                      color: 'var(--color-text, #111827)',
                      fontFamily: f.mono ? 'monospace' : undefined,
                      letterSpacing: f.mono ? '0.06em' : undefined,
                    }}
                    dir={f.mono ? 'ltr' : undefined}
                  >
                    {f.value}
                  </span>
                  {f.copyable !== false && (
                    <button
                      type="button"
                      onClick={() => copy(String(f.value), i)}
                      title="نسخ"
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
                        border: '1px solid var(--quiet-gray-200, #e5e7eb)', background: 'var(--color-surface, #fff)',
                        color: copiedIdx === i ? 'var(--status-green, #16a34a)' : 'var(--law-navy, #1E3A5F)',
                      }}
                    >
                      {copiedIdx === i ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {note && (
            <div
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px',
                background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 8, fontSize: 12, color: 'var(--color-text-secondary, #64748b)', lineHeight: 1.6,
              }}
            >
              <KeyRound size={14} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 2 }} />
              <div>{note}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', borderTop: '1px solid var(--color-border, #e5e7eb)', background: 'rgba(0,0,0,0.015)' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 22px', fontSize: 13, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
              border: 'none', color: '#fff', background: 'var(--color-primary, #2563eb)',
            }}
          >
            تم
          </button>
        </div>
      </div>
    </div>
  );
};

export default CredentialsModal;
