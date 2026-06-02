// === بطاقة حالة الشهادة ===
import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, ChevronDown } from 'lucide-react';
import type { ZatcaCertificate } from '../../types/zatca';
import { formatDate, relativeDays } from '../../utils/zatcaFormat';
import { ZatcaEnvBadge } from './ZatcaPageShell';

interface Props {
  certificate: ZatcaCertificate | null;
}

const ZatcaCertificateCard: React.FC<Props> = ({ certificate }) => {
  const [showDetails, setShowDetails] = useState(false);

  const hasCred = !!certificate?.has_credential;
  const expiringSoon = !!certificate?.expiring_soon;
  const expiresAt = certificate?.expires_at ?? null;
  // الشهادة صالحة إن وُجد اعتماد ولم ينتهِ تاريخها.
  const valid = hasCred && (!expiresAt || new Date(expiresAt).getTime() > Date.now());

  return (
    <div className="zatca-card">
      <div className="zatca-card__head">
        <div className={`zatca-card__icon ${valid ? 'zatca-card__icon--green' : 'zatca-card__icon--red'}`}>
          {valid ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
        </div>
        <h3 className="zatca-card__title">الشهادة الرقمية</h3>
      </div>

      <div className="zatca-card__body">
        <div className="zatca-card__row">
          <span className="zatca-card__label">الحالة</span>
          <span className="zatca-card__value" style={{ color: valid ? 'var(--status-green)' : 'var(--status-red)' }}>
            {!hasCred ? 'غير مُصدَرة' : valid ? 'صالحة' : 'منتهية'}
          </span>
        </div>
        {expiresAt ? (
          <div className="zatca-card__row">
            <span className="zatca-card__label">تنتهي في</span>
            <span className="zatca-card__value">
              {formatDate(expiresAt)} <span style={{ color: 'var(--quiet-gray-500)', fontWeight: 400 }}>({relativeDays(expiresAt)})</span>
            </span>
          </div>
        ) : null}

        {showDetails ? (
          <>
            <div className="zatca-card__row">
              <span className="zatca-card__label">البيئة</span>
              <ZatcaEnvBadge environment={(certificate?.environment as string) ?? null} />
            </div>
            <div className="zatca-card__row">
              <span className="zatca-card__label">جاهزة للإنتاج</span>
              <span className="zatca-card__value">{certificate?.production_ready ? 'نعم' : 'لا'}</span>
            </div>
            {certificate?.status ? (
              <div className="zatca-card__row">
                <span className="zatca-card__label">حالة الاعتماد</span>
                <span className="zatca-card__value zatca-card__value--ltr">{certificate.status}</span>
              </div>
            ) : null}
          </>
        ) : null}

        {expiringSoon ? (
          <div className="zatca-cert-banner">
            <AlertTriangle size={15} />
            <span>الشهادة ستنتهي قريباً ({relativeDays(expiresAt)}). جدّد الشهادة لتفادي توقّف الإرسال.</span>
          </div>
        ) : null}
      </div>

      <div className="zatca-card__actions">
        <button type="button" className="zatca-btn zatca-btn--ghost" onClick={() => setShowDetails((s) => !s)}>
          تفاصيل الشهادة <ChevronDown size={14} style={{ transform: showDetails ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>
      </div>
    </div>
  );
};

export default ZatcaCertificateCard;
