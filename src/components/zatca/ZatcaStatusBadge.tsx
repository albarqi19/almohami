// === شارة حالة ZATCA موحّدة (تُستخدم في القائمة والدمج) ===
import React from 'react';
import { ZATCA_STATUS_CONFIG } from '../../config/zatcaStatusConfig';
import type { ZatcaInvoiceState } from '../../types/zatca';

interface Props {
  status?: ZatcaInvoiceState | null;
  size?: number;
  /** عرض الرمز التقني بجانب التسمية العربية */
  showCode?: boolean;
}

const ZatcaStatusBadge: React.FC<Props> = ({ status, size = 13, showCode = false }) => {
  if (!status) return <span className="zatca-badge zatca-badge--none">—</span>;
  const meta = ZATCA_STATUS_CONFIG[status];
  if (!meta) return <span className="zatca-badge zatca-badge--none">{status}</span>;

  const { label, color, bg, Icon, spin } = meta;
  return (
    <span className="zatca-badge" style={{ color, background: bg }}>
      <Icon size={size} className={spin ? 'zatca-spin' : undefined} />
      {label}
      {showCode ? <code className="zatca-badge__code">{status}</code> : null}
    </span>
  );
};

export default ZatcaStatusBadge;
