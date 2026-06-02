// === عناصر مشتركة لرأس صفحات ZATCA (تتفادى دورة الاستيراد بين ZatcaCenter وZatcaDashboard) ===
import React from 'react';
import { QrCode } from 'lucide-react';

const ENV_LABELS: Record<string, string> = {
  production: 'إنتاج',
  simulation: 'محاكاة',
  sandbox: 'تجريبي',
};

export const ZatcaEnvBadge: React.FC<{ environment: string | null }> = ({ environment }) => {
  if (!environment) return null;
  const label = ENV_LABELS[environment] ?? environment;
  return <span className={`zatca-env-badge zatca-env-badge--${environment}`}>{label}</span>;
};

export const ZatcaPageHead: React.FC<{
  subtitle?: string;
  environment?: string | null;
  right?: React.ReactNode;
}> = ({ subtitle, environment, right }) => (
  <div className="zatca-page__head">
    <div>
      <h1 className="zatca-page__title">
        <span className="zatca-page__title-icon"><QrCode size={20} /></span>
        الفوترة الإلكترونية (ZATCA)
        {environment ? <ZatcaEnvBadge environment={environment} /> : null}
      </h1>
      {subtitle ? <p className="zatca-page__subtitle">{subtitle}</p> : null}
    </div>
    {right ? <div>{right}</div> : null}
  </div>
);
