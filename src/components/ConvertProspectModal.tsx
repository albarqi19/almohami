import React, { useState } from 'react';
import { X, UserCheck, Loader2 } from 'lucide-react';
import PhoneField from './PhoneField';
import type { Client } from '../services/clientManagementService';

interface Props {
  client: Client | null; // null = مغلق
  submitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (payload: { national_id?: string; phone?: string }) => void;
  onClose: () => void;
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text)', marginBottom: 4,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', fontSize: 13, color: 'var(--color-text)',
  backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, outline: 'none',
};

/**
 * تحويل عميل محتمل → عميل فعلي مع استكمال الهوية/الجوال الناقصَين (لازمان للبوابة
 * وإرسال بيانات الدخول). يُفتح فقط حين ينقص أحدهما؛ وإلا يُحوَّل مباشرة عبر ConfirmDialog.
 */
const ConvertProspectModal: React.FC<Props> = ({ client, submitting = false, errorMessage, onSubmit, onClose }) => {
  const [nationalId, setNationalId] = useState(client?.national_id || '');
  const [phone, setPhone] = useState(client?.phone || '');

  if (!client) return null;

  const nidValid = nationalId.trim().length > 0;
  const phoneValid = phone.trim().length > 0;
  const canSubmit = nidValid && phoneValid && !submitting;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ national_id: nationalId.trim(), phone: phone.trim() });
  };

  return (
    <div
      onClick={() => !submitting && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        style={{ background: 'var(--color-surface, #fff)', borderRadius: 10, width: '100%', maxWidth: 440, boxShadow: '0 20px 50px rgba(0,0,0,0.25)', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--color-border, #e5e7eb)' }}>
          <UserCheck size={16} style={{ color: 'var(--law-navy, #1E3A5F)' }} />
          <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--color-text, #111827)' }}>تحويل إلى عميل فعلي</div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="إغلاق" style={{ background: 'transparent', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', color: 'var(--color-text-secondary, #64748b)', padding: 2 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--color-text, #111827)', margin: '0 0 14px', lineHeight: 1.6 }}>
            تحويل <strong>{client.name}</strong> إلى عميل فعلي. أكمِل البيانات الناقصة — يحتاجها العميل للدخول للبوابة واستلام بيانات الدخول.
          </p>

          {errorMessage && (
            <div style={{ backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, padding: '8px 12px', marginBottom: 12, color: 'var(--status-red, #dc2626)', fontSize: 12, whiteSpace: 'pre-line', lineHeight: 1.6 }}>
              {errorMessage}
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>رقم الهوية الوطنية <span style={{ color: 'var(--status-red, #dc2626)' }}>*</span></label>
            <input type="text" inputMode="numeric" value={nationalId} onChange={(e) => setNationalId(e.target.value)} placeholder="10 أرقام" style={inputStyle} dir="ltr" autoFocus={!client.national_id} />
          </div>
          <div>
            <label style={labelStyle}>رقم الجوال (واتساب) <span style={{ color: 'var(--status-red, #dc2626)' }}>*</span></label>
            <PhoneField value={phone} onChange={setPhone} placeholder="5X XXX XXXX" />
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary, #64748b)' }}>تُرسَل بيانات الدخول عبر واتساب على هذا الرقم.</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--color-border, #e5e7eb)', background: 'rgba(0,0,0,0.015)' }}>
          <button type="button" onClick={onClose} disabled={submitting} style={{ padding: '7px 16px', fontSize: 13, borderRadius: 6, cursor: submitting ? 'not-allowed' : 'pointer', border: '1px solid var(--color-border, #e5e7eb)', background: 'transparent', color: 'var(--color-text-secondary, #64748b)', opacity: submitting ? 0.6 : 1 }}>
            إلغاء
          </button>
          <button type="submit" disabled={!canSubmit} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 18px', fontSize: 13, fontWeight: 600, borderRadius: 6, cursor: canSubmit ? 'pointer' : 'not-allowed', border: 'none', color: '#fff', background: 'var(--law-navy, #1E3A5F)', opacity: canSubmit ? 1 : 0.6 }}>
            {submitting && <Loader2 size={13} className="spinning" />}
            تحويل وإرسال الدخول
          </button>
        </div>
      </form>
    </div>
  );
};

export default ConvertProspectModal;
