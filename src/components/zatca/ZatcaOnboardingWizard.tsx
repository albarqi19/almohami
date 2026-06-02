// === معالج تفعيل ZATCA (3 خطوات) ===
// مؤشر خطوات أفقي مبني من الصفر + بطاقة متطلبات جانبية. محصور بـ owner/admin (الحارس في ZatcaCenter).
import React, { useState } from 'react';
import { Check, FileText, MapPin, KeyRound } from 'lucide-react';
import StepLegalAddress from './steps/StepLegalAddress';
import StepComplianceChecks from './steps/StepComplianceChecks';
import StepFinalize from './steps/StepFinalize';

const STEP_LABELS = ['البيانات والعنوان', 'فحوص الامتثال', 'التفعيل'];

const ZatcaOnboardingWizard: React.FC = () => {
  const [step, setStep] = useState(0); // 0,1,2

  return (
    <div className="zatca-onboarding">
      <div className="zatca-wizard">
        {/* مؤشر الخطوات */}
        <div className="zatca-stepper">
          {STEP_LABELS.map((label, i) => {
            const state = i < step ? 'done' : i === step ? 'active' : 'idle';
            return (
              <React.Fragment key={label}>
                <div className={`zatca-step zatca-step--${state}`}>
                  <div className="zatca-step__node">
                    <span className="zatca-step__circle">
                      {state === 'done' ? <Check size={15} /> : i + 1}
                    </span>
                    <span className="zatca-step__label">{label}</span>
                  </div>
                </div>
                {i < STEP_LABELS.length - 1 ? (
                  <div className={`zatca-step__line${i < step ? ' zatca-step__line--done' : ''}`} />
                ) : null}
              </React.Fragment>
            );
          })}
        </div>

        <div className="zatca-wizard__body">
          {step === 0 && <StepLegalAddress onSuccess={() => setStep(1)} />}
          {step === 1 && <StepComplianceChecks onSuccess={() => setStep(2)} onBack={() => setStep(0)} />}
          {step === 2 && <StepFinalize onBack={() => setStep(1)} />}
        </div>
      </div>

      {/* البطاقة الإرشادية الجانبية */}
      <aside className="zatca-guide-side">
        <h3 className="zatca-guide-side__title"><KeyRound size={15} /> متطلبات التفعيل</h3>
        <ul>
          <li><FileText size={15} /><span><strong>الرقم الضريبي (VAT):</strong> 15 رقماً يبدأ وينتهي بالرقم 3.</span></li>
          <li><MapPin size={15} /><span><strong>العنوان الوطني:</strong> رقم المبنى (4 أرقام) والشارع والحي والمدينة والرمز البريدي (5 أرقام).</span></li>
          <li><KeyRound size={15} /><span><strong>رمز OTP:</strong> يُستخرج من بوابة فاتورة (Fatoora) لدى الهيئة عند بدء الربط.</span></li>
        </ul>
      </aside>
    </div>
  );
};

export default ZatcaOnboardingWizard;
