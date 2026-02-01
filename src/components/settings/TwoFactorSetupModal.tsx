import React, { useState, useEffect, useRef } from 'react';
import { Shield, Smartphone, Key, CheckCircle, Copy, AlertTriangle, X } from 'lucide-react';
import { AuthService } from '../../services';

interface TwoFactorSetupModalProps {
  onClose: () => void;
  onComplete: () => void;
}

type SetupStep = 'scan' | 'verify' | 'recovery';

const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({ onClose, onComplete }) => {
  const [step, setStep] = useState<SetupStep>('scan');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initSetup();
  }, []);

  useEffect(() => {
    if (step === 'verify' && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step]);

  const initSetup = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await AuthService.setup2FA();
      setQrCode(response.qr_code);
      setSecret(response.secret);
    } catch (error: any) {
      setError(error.message || 'فشل في إعداد المصادقة الثنائية');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError('رمز التحقق يجب أن يكون 6 أرقام');
      return;
    }

    try {
      setIsVerifying(true);
      setError('');
      const response = await AuthService.confirm2FA(verificationCode);
      setRecoveryCodes(response.recovery_codes);
      setStep('recovery');
    } catch (error: any) {
      setError(error.message || 'رمز التحقق غير صحيح');
      setVerificationCode('');
      codeInputRef.current?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && verificationCode.length === 6) {
      handleVerify();
    }
  };

  const renderStepIndicator = () => (
    <div className="setup-steps">
      <div className={`setup-step ${step === 'scan' ? 'active' : ''} ${step !== 'scan' ? 'completed' : ''}`}>
        <div className="setup-step__number">1</div>
        <span className="setup-step__label">المسح</span>
      </div>
      <div className="setup-step__line" />
      <div className={`setup-step ${step === 'verify' ? 'active' : ''} ${step === 'recovery' ? 'completed' : ''}`}>
        <div className="setup-step__number">2</div>
        <span className="setup-step__label">التحقق</span>
      </div>
      <div className="setup-step__line" />
      <div className={`setup-step ${step === 'recovery' ? 'active' : ''}`}>
        <div className="setup-step__number">3</div>
        <span className="setup-step__label">الاسترداد</span>
      </div>
    </div>
  );

  const renderScanStep = () => (
    <>
      <div className="setup-content">
        <div className="setup-icon">
          <Smartphone size={40} />
        </div>
        <h4 className="setup-subtitle">امسح الباركود</h4>
        <p className="setup-description">
          افتح تطبيق Google Authenticator أو أي تطبيق مصادقة متوافق وامسح الباركود أدناه
        </p>

        {isLoading ? (
          <div className="qr-placeholder">
            <div className="spinner" />
            <span>جاري التحميل...</span>
          </div>
        ) : error ? (
          <div className="qr-error">
            <AlertTriangle size={24} />
            <span>{error}</span>
            <button className="button button--secondary" onClick={initSetup}>
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            <div className="qr-container">
              <img src={qrCode} alt="QR Code" className="qr-image" />
            </div>

            <div className="secret-container">
              <span className="secret-label">أو أدخل الكود يدوياً:</span>
              <div className="secret-value">
                <code>{secret}</code>
                <button
                  className="secret-copy"
                  onClick={handleCopySecret}
                  title="نسخ"
                >
                  {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="modal-footer">
        <button className="button button--secondary" onClick={onClose}>
          إلغاء
        </button>
        <button
          className="button button--primary"
          onClick={() => setStep('verify')}
          disabled={isLoading || !!error}
        >
          التالي
        </button>
      </div>
    </>
  );

  const renderVerifyStep = () => (
    <>
      <div className="setup-content">
        <div className="setup-icon setup-icon--verify">
          <Key size={40} />
        </div>
        <h4 className="setup-subtitle">أدخل رمز التحقق</h4>
        <p className="setup-description">
          أدخل الرمز المكون من 6 أرقام الظاهر في تطبيق المصادقة
        </p>

        {error && (
          <div className="verify-error">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="verification-input-container">
          <input
            ref={codeInputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            className="verification-input"
            placeholder="000000"
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              setVerificationCode(value);
              setError('');
            }}
            onKeyPress={handleKeyPress}
            disabled={isVerifying}
          />
        </div>

        <p className="verify-hint">
          الرمز يتغير كل 30 ثانية
        </p>
      </div>

      <div className="modal-footer">
        <button
          className="button button--secondary"
          onClick={() => setStep('scan')}
          disabled={isVerifying}
        >
          رجوع
        </button>
        <button
          className="button button--primary"
          onClick={handleVerify}
          disabled={verificationCode.length !== 6 || isVerifying}
        >
          {isVerifying ? (
            <>
              <span className="spinner-sm" />
              جاري التحقق...
            </>
          ) : (
            'تحقق وتفعيل'
          )}
        </button>
      </div>
    </>
  );

  const renderRecoveryStep = () => (
    <>
      <div className="setup-content">
        <div className="setup-icon setup-icon--success">
          <CheckCircle size={40} />
        </div>
        <h4 className="setup-subtitle">تم التفعيل بنجاح!</h4>
        <p className="setup-description">
          احفظ أكواد الاسترداد التالية في مكان آمن. يمكنك استخدامها للدخول في حال فقدان هاتفك.
        </p>

        <div className="alert alert--warning">
          <AlertTriangle size={16} />
          <span>كل كود يستخدم مرة واحدة فقط ولن يظهر مرة أخرى</span>
        </div>

        <div className="recovery-codes-container">
          <div className="recovery-codes-grid">
            {recoveryCodes.map((code, index) => (
              <div key={index} className="recovery-code-item">
                <code>{code}</code>
              </div>
            ))}
          </div>
          <button
            className="button button--secondary recovery-copy-btn"
            onClick={handleCopyRecoveryCodes}
          >
            {copied ? (
              <>
                <CheckCircle size={16} />
                تم النسخ
              </>
            ) : (
              <>
                <Copy size={16} />
                نسخ جميع الأكواد
              </>
            )}
          </button>
        </div>
      </div>

      <div className="modal-footer">
        <button className="button button--primary" onClick={onComplete}>
          <CheckCircle size={16} />
          تم، لقد حفظت الأكواد
        </button>
      </div>
    </>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content setup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <Shield size={20} />
            إعداد المصادقة الثنائية
          </h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {renderStepIndicator()}

        {step === 'scan' && renderScanStep()}
        {step === 'verify' && renderVerifyStep()}
        {step === 'recovery' && renderRecoveryStep()}
      </div>

      <style>{`
        .setup-modal {
          max-width: 460px;
        }

        .setup-steps {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-color, #e5e5e5);
          gap: 0.5rem;
        }

        .setup-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }

        .setup-step__number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--bg-secondary, #f5f5f5);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          transition: all 0.2s;
        }

        .setup-step.active .setup-step__number {
          background: var(--primary, #3b82f6);
          color: white;
        }

        .setup-step.completed .setup-step__number {
          background: var(--success, #22c55e);
          color: white;
        }

        .setup-step__label {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        .setup-step.active .setup-step__label {
          color: var(--primary, #3b82f6);
          font-weight: 500;
        }

        .setup-step__line {
          flex: 1;
          height: 2px;
          background: var(--border-color, #e5e5e5);
          max-width: 60px;
        }

        .setup-content {
          padding: 1.5rem;
          text-align: center;
        }

        .setup-icon {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: var(--primary-lighter, #eff6ff);
          color: var(--primary, #3b82f6);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
        }

        body.dark .setup-icon {
          background: rgba(59, 130, 246, 0.15);
        }

        .setup-icon--verify {
          background: var(--warning-bg, #fffbeb);
          color: var(--warning, #f59e0b);
        }

        body.dark .setup-icon--verify {
          background: rgba(245, 158, 11, 0.15);
        }

        .setup-icon--success {
          background: var(--success-bg, #f0fdf4);
          color: var(--success, #22c55e);
        }

        body.dark .setup-icon--success {
          background: rgba(34, 197, 94, 0.15);
        }

        .setup-subtitle {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0 0 0.5rem;
          color: var(--text-primary);
        }

        .setup-description {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin: 0 0 1.5rem;
          line-height: 1.5;
        }

        .qr-placeholder,
        .qr-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 2rem;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 0.75rem;
          min-height: 200px;
        }

        .qr-error {
          color: var(--danger, #ef4444);
        }

        .qr-container {
          background: var(--bg-primary, white);
          padding: 1rem;
          border-radius: 0.75rem;
          box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.08));
          display: inline-block;
          border: 1px solid var(--border-color, #e5e5e5);
        }

        body.dark .qr-container {
          background: var(--bg-secondary, #1e1e1e);
        }

        .qr-image {
          width: 180px;
          height: 180px;
          display: block;
        }

        .secret-container {
          margin-top: 1.25rem;
          text-align: center;
        }

        .secret-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .secret-value {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-secondary, #f5f5f5);
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
        }

        .secret-value code {
          font-family: monospace;
          font-size: 0.875rem;
          letter-spacing: 0.05em;
          color: var(--text-primary);
        }

        .secret-copy {
          background: none;
          border: none;
          padding: 0.25rem;
          cursor: pointer;
          color: var(--text-secondary);
          display: flex;
          transition: color 0.2s;
        }

        .secret-copy:hover {
          color: var(--primary, #3b82f6);
        }

        .verification-input-container {
          margin: 1.5rem 0;
        }

        .verification-input {
          width: 180px;
          padding: 1rem;
          font-size: 1.75rem;
          font-family: monospace;
          letter-spacing: 0.5em;
          text-align: center;
          border: 2px solid var(--border-color, #e5e5e5);
          border-radius: 0.5rem;
          outline: none;
          transition: border-color 0.2s;
          background: var(--bg-primary, white);
          color: var(--text-primary);
        }

        .verification-input:focus {
          border-color: var(--primary, #3b82f6);
        }

        .verification-input::placeholder {
          color: var(--text-disabled, #d1d5db);
          letter-spacing: 0.3em;
        }

        body.dark .verification-input {
          background: var(--bg-secondary, #1e1e1e);
        }

        .verify-error {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: var(--danger-bg, #fef2f2);
          color: var(--danger, #ef4444);
          border-radius: 0.5rem;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .verify-hint {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 0;
        }

        .recovery-codes-container {
          margin-top: 1rem;
        }

        .recovery-codes-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .recovery-code-item {
          padding: 0.625rem 0.75rem;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 0.375rem;
          text-align: center;
          border: 1px solid var(--border-color, #e5e5e5);
        }

        .recovery-code-item code {
          font-family: monospace;
          font-size: 0.8rem;
          letter-spacing: 0.03em;
          color: var(--text-primary);
        }

        .recovery-copy-btn {
          width: 100%;
          justify-content: center;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border-color, #e5e5e5);
          border-top-color: var(--primary, #3b82f6);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .spinner-sm {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
          margin-inline-end: 0.5rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .modal-footer .button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default TwoFactorSetupModal;
