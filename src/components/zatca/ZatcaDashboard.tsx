// === لوحة ZATCA (حالة enabled) ===
// 3 بطاقات (الشهادة · الربط · الدليل) + قائمة فواتير ZATCA بالتبويبات والعدّادات.
import React from 'react';
import { useZatcaFeature } from '../../contexts/ZatcaStatusContext';
import { ZatcaPageHead } from './ZatcaPageShell';
import ZatcaCertificateCard from './ZatcaCertificateCard';
import ZatcaActivationCard from './ZatcaActivationCard';
import ZatcaGuideCard from './ZatcaGuideCard';
import ZatcaInvoicesList from './ZatcaInvoicesList';

const ZatcaDashboard: React.FC = () => {
  const { environment, onboardedAt, certificate } = useZatcaFeature();

  return (
    <div className="zatca-page">
      <ZatcaPageHead
        subtitle="إدارة فواتيرك الإلكترونية المتوافقة مع هيئة الزكاة والضريبة والجمارك."
        environment={environment}
      />

      <div className="zatca-cards">
        <ZatcaCertificateCard certificate={certificate} />
        <ZatcaActivationCard environment={environment} onboardedAt={onboardedAt} />
        <ZatcaGuideCard />
      </div>

      <ZatcaInvoicesList />
    </div>
  );
};

export default ZatcaDashboard;
