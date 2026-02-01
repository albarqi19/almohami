import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldOff, Key, RefreshCw, AlertTriangle, Smartphone, Download, ExternalLink } from 'lucide-react';
import { AuthService } from '../../services';
import TwoFactorSetupModal from './TwoFactorSetupModal';

interface TwoFactorSettingsProps {
  onStatusChange?: (enabled: boolean) => void;
}

const TwoFactorSettings: React.FC<TwoFactorSettingsProps> = ({ onStatusChange }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const status = await AuthService.get2FAStatus();
      setIsEnabled(status.two_factor_enabled);
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupComplete = () => {
    setIsEnabled(true);
    setShowSetupModal(false);
    setSuccessMessage('تم تفعيل المصادقة الثنائية بنجاح');
    onStatusChange?.(true);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDisable = async () => {
    if (!disableCode) {
      setError('يرجى إدخال رمز التحقق');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');
      await AuthService.disable2FA(disableCode);
      setIsEnabled(false);
      setShowDisableModal(false);
      setDisableCode('');
      setSuccessMessage('تم تعطيل المصادقة الثنائية');
      onStatusChange?.(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setError(error.message || 'فشل في تعطيل المصادقة الثنائية');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerateRecoveryCodes = async () => {
    if (!recoveryCode) {
      setError('يرجى إدخال رمز التحقق');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');
      const codes = await AuthService.regenerateRecoveryCodes(recoveryCode);
      setRecoveryCodes(codes);
      setRecoveryCode('');
    } catch (error: any) {
      setError(error.message || 'فشل في إعادة توليد أكواد الاسترداد');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="settings-section">
        <div className="settings-section__header">
          <div className="settings-section__icon">
            <Shield size={14} />
          </div>
          <span className="settings-section__title">المصادقة الثنائية</span>
        </div>
        <div className="settings-section__content">
          <div className="settings-option-card">
            <div className="settings-option-card__title">جاري التحميل...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="settings-section">
        <div className="settings-section__header">
          <div className="settings-section__icon">
            <Shield size={14} />
          </div>
          <span className="settings-section__title">المصادقة الثنائية</span>
        </div>
        <div className="settings-section__content">
          {successMessage && (
            <div className="settings-alert settings-alert--success" style={{ marginBottom: '1rem' }}>
              <ShieldCheck size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {isEnabled ? (
            // 2FA is enabled
            <div className="settings-option-card settings-option-card--success">
              <div className="settings-option-card__status">
                <ShieldCheck size={20} className="text-success" />
                <span className="settings-option-card__status-text text-success">المصادقة الثنائية مفعّلة</span>
              </div>
              <div className="settings-option-card__title">حسابك محمي</div>
              <div className="settings-option-card__desc">
                يتم طلب رمز تحقق من تطبيق المصادقة عند كل تسجيل دخول
              </div>
              <div className="settings-option-card__actions">
                <button
                  className="settings-btn"
                  onClick={() => setShowRecoveryModal(true)}
                >
                  <Key size={14} />
                  أكواد الاسترداد
                </button>
                <button
                  className="settings-btn settings-btn--danger"
                  onClick={() => setShowDisableModal(true)}
                >
                  <ShieldOff size={14} />
                  تعطيل
                </button>
              </div>
            </div>
          ) : (
            // 2FA is disabled
            <>
              <div className="settings-option-card">
                <div className="settings-option-card__status">
                  <AlertTriangle size={20} className="text-warning" />
                  <span className="settings-option-card__status-text text-warning">غير مفعّلة</span>
                </div>
                <div className="settings-option-card__title">حماية إضافية لحسابك</div>
                <div className="settings-option-card__desc">
                  أضف طبقة أمان إضافية باستخدام تطبيق Google Authenticator أو أي تطبيق مصادقة متوافق
                </div>
                <div className="settings-option-card__actions">
                  <button
                    className="settings-btn settings-btn--primary"
                    onClick={() => setShowSetupModal(true)}
                  >
                    <Shield size={14} />
                    تفعيل المصادقة الثنائية
                  </button>
                </div>
              </div>

              {/* تعليمات تحميل التطبيق */}
              <div className="two-factor-instructions">
                <div className="two-factor-instructions__header">
                  <Smartphone size={18} />
                  <span>قبل البدء، تحتاج تطبيق مصادقة على هاتفك</span>
                </div>
                <div className="two-factor-instructions__content">
                  <p className="two-factor-instructions__text">
                    قم بتحميل أحد تطبيقات المصادقة التالية:
                  </p>
                  <div className="two-factor-apps">
                    <a
                      href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="two-factor-app"
                    >
                      <div className="two-factor-app__icon two-factor-app__icon--google">G</div>
                      <div className="two-factor-app__info">
                        <span className="two-factor-app__name">Google Authenticator</span>
                        <span className="two-factor-app__platform">
                          <Download size={12} />
                          Android
                        </span>
                      </div>
                      <ExternalLink size={14} className="two-factor-app__link" />
                    </a>
                    <a
                      href="https://apps.apple.com/app/google-authenticator/id388497605"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="two-factor-app"
                    >
                      <div className="two-factor-app__icon two-factor-app__icon--google">G</div>
                      <div className="two-factor-app__info">
                        <span className="two-factor-app__name">Google Authenticator</span>
                        <span className="two-factor-app__platform">
                          <Download size={12} />
                          iPhone
                        </span>
                      </div>
                      <ExternalLink size={14} className="two-factor-app__link" />
                    </a>
                    <a
                      href="https://play.google.com/store/apps/details?id=com.azure.authenticator"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="two-factor-app"
                    >
                      <div className="two-factor-app__icon two-factor-app__icon--microsoft">M</div>
                      <div className="two-factor-app__info">
                        <span className="two-factor-app__name">Microsoft Authenticator</span>
                        <span className="two-factor-app__platform">
                          <Download size={12} />
                          Android / iPhone
                        </span>
                      </div>
                      <ExternalLink size={14} className="two-factor-app__link" />
                    </a>
                  </div>
                  <p className="two-factor-instructions__note">
                    بعد تحميل التطبيق، اضغط على "تفعيل المصادقة الثنائية" وامسح رمز QR بالتطبيق
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Setup Modal */}
      {showSetupModal && (
        <TwoFactorSetupModal
          onClose={() => setShowSetupModal(false)}
          onComplete={handleSetupComplete}
        />
      )}

      {/* Disable Modal */}
      {showDisableModal && (
        <div className="modal-overlay" onClick={() => setShowDisableModal(false)}>
          <div className="modal-content modal-content--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <ShieldOff size={20} />
                تعطيل المصادقة الثنائية
              </h3>
              <button className="modal-close" onClick={() => setShowDisableModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="alert alert--warning" style={{ marginBottom: '1rem' }}>
                <AlertTriangle size={16} />
                <span>تعطيل المصادقة الثنائية سيقلل من أمان حسابك</span>
              </div>

              {error && (
                <div className="alert alert--error" style={{ marginBottom: '1rem' }}>
                  {error}
                </div>
              )}

              <div className="form-field">
                <label className="form-label">رمز التحقق</label>
                <input
                  type="text"
                  className="input"
                  placeholder="أدخل رمز التحقق من التطبيق"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  maxLength={8}
                  autoFocus
                />
                <span className="form-hint">أدخل الرمز من تطبيق المصادقة أو أحد أكواد الاسترداد</span>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="button button--secondary"
                onClick={() => {
                  setShowDisableModal(false);
                  setDisableCode('');
                  setError('');
                }}
              >
                إلغاء
              </button>
              <button
                className="button button--danger"
                onClick={handleDisable}
                disabled={isProcessing}
              >
                {isProcessing ? 'جاري التعطيل...' : 'تعطيل المصادقة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Codes Modal */}
      {showRecoveryModal && (
        <div className="modal-overlay" onClick={() => setShowRecoveryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <Key size={20} />
                أكواد الاسترداد
              </h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowRecoveryModal(false);
                  setRecoveryCodes([]);
                  setRecoveryCode('');
                  setError('');
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {recoveryCodes.length > 0 ? (
                <>
                  <div className="alert alert--warning" style={{ marginBottom: '1rem' }}>
                    <AlertTriangle size={16} />
                    <span>احفظ هذه الأكواد في مكان آمن. كل كود يستخدم مرة واحدة فقط.</span>
                  </div>
                  <div className="recovery-codes-grid">
                    {recoveryCodes.map((code, index) => (
                      <div key={index} className="recovery-code-item">
                        <code>{code}</code>
                      </div>
                    ))}
                  </div>
                  <button
                    className="button button--secondary"
                    style={{ marginTop: '1rem', width: '100%' }}
                    onClick={() => {
                      navigator.clipboard.writeText(recoveryCodes.join('\n'));
                      setSuccessMessage('تم نسخ الأكواد');
                      setTimeout(() => setSuccessMessage(''), 2000);
                    }}
                  >
                    نسخ جميع الأكواد
                  </button>
                </>
              ) : (
                <>
                  <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    أدخل رمز التحقق من تطبيق المصادقة لإعادة توليد أكواد الاسترداد الجديدة.
                    سيتم إلغاء الأكواد القديمة.
                  </p>

                  {error && (
                    <div className="alert alert--error" style={{ marginBottom: '1rem' }}>
                      {error}
                    </div>
                  )}

                  <div className="form-field">
                    <label className="form-label">رمز التحقق</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="أدخل الرمز المكون من 6 أرقام"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      maxLength={6}
                      autoFocus
                    />
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              {recoveryCodes.length > 0 ? (
                <button
                  className="button button--primary"
                  onClick={() => {
                    setShowRecoveryModal(false);
                    setRecoveryCodes([]);
                    setRecoveryCode('');
                  }}
                >
                  تم
                </button>
              ) : (
                <>
                  <button
                    className="button button--secondary"
                    onClick={() => {
                      setShowRecoveryModal(false);
                      setRecoveryCode('');
                      setError('');
                    }}
                  >
                    إلغاء
                  </button>
                  <button
                    className="button button--primary"
                    onClick={handleRegenerateRecoveryCodes}
                    disabled={isProcessing}
                  >
                    <RefreshCw size={14} className={isProcessing ? 'spin' : ''} />
                    {isProcessing ? 'جاري التوليد...' : 'توليد أكواد جديدة'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .settings-option-card--success {
          border: 1px solid var(--success-light, #dcfce7);
          background: var(--success-bg, #f0fdf4);
        }

        .settings-option-card__status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .settings-option-card__status-text {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .text-success {
          color: var(--success, #22c55e);
        }

        .text-warning {
          color: var(--warning, #f59e0b);
        }

        .settings-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
        }

        .settings-btn--danger {
          color: var(--danger, #ef4444);
          border-color: var(--danger, #ef4444);
        }

        .settings-btn--danger:hover {
          background: var(--danger, #ef4444);
          color: white;
        }

        .settings-alert {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }

        .settings-alert--success {
          background: var(--success-bg, #f0fdf4);
          color: var(--success, #22c55e);
          border: 1px solid var(--success-light, #dcfce7);
        }

        .recovery-codes-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
        }

        .recovery-code-item {
          padding: 0.75rem;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 0.375rem;
          text-align: center;
          font-family: monospace;
          font-size: 0.875rem;
          letter-spacing: 0.05em;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: var(--bg-primary, white);
          border-radius: 0.75rem;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .modal-content--sm {
          max-width: 400px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-color, #e5e5e5);
        }

        .modal-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-secondary);
          padding: 0;
          line-height: 1;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border-color, #e5e5e5);
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }

        .alert--warning {
          background: var(--warning-bg, #fffbeb);
          color: var(--warning-text, #92400e);
          border: 1px solid var(--warning-light, #fef3c7);
        }

        .alert--error {
          background: var(--danger-bg, #fef2f2);
          color: var(--danger, #ef4444);
          border: 1px solid var(--danger-light, #fee2e2);
        }

        .form-hint {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        .button--danger {
          background: var(--danger, #ef4444);
          color: white;
          border: none;
        }

        .button--danger:hover {
          background: var(--danger-dark, #dc2626);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        /* تعليمات تحميل التطبيق */
        .two-factor-instructions {
          margin-top: 1rem;
          background: var(--bg-secondary, #f9fafb);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 0.75rem;
          overflow: hidden;
        }

        .two-factor-instructions__header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1rem;
          background: var(--bg-tertiary, #f3f4f6);
          border-bottom: 1px solid var(--border-color, #e5e7eb);
          font-weight: 500;
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        body.dark .two-factor-instructions__header {
          background: var(--bg-secondary);
        }

        .two-factor-instructions__content {
          padding: 1rem;
        }

        .two-factor-instructions__text {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          margin: 0 0 0.75rem 0;
        }

        .two-factor-apps {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .two-factor-app {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: var(--bg-primary, white);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 0.5rem;
          text-decoration: none;
          color: inherit;
          transition: all 0.15s ease;
        }

        .two-factor-app:hover {
          border-color: var(--primary, #3b82f6);
          background: var(--primary-lighter, #eff6ff);
        }

        body.dark .two-factor-app:hover {
          background: rgba(59, 130, 246, 0.1);
        }

        .two-factor-app__icon {
          width: 36px;
          height: 36px;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1rem;
          color: white;
          flex-shrink: 0;
        }

        .two-factor-app__icon--google {
          background: linear-gradient(135deg, #4285f4, #34a853);
        }

        .two-factor-app__icon--microsoft {
          background: linear-gradient(135deg, #00bcf2, #00a4ef);
        }

        .two-factor-app__info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .two-factor-app__name {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .two-factor-app__platform {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: var(--text-tertiary, #9ca3af);
        }

        .two-factor-app__link {
          color: var(--text-tertiary, #9ca3af);
          flex-shrink: 0;
        }

        .two-factor-instructions__note {
          margin: 0.875rem 0 0 0;
          padding: 0.625rem 0.75rem;
          background: var(--primary-lighter, #eff6ff);
          border-radius: 0.375rem;
          font-size: 0.75rem;
          color: var(--primary, #3b82f6);
          border-right: 3px solid var(--primary, #3b82f6);
        }

        body.dark .two-factor-instructions__note {
          background: rgba(59, 130, 246, 0.1);
          color: var(--primary-light, #93c5fd);
        }

        body.classic .two-factor-instructions__note {
          color: var(--primary-dark, #1e40af);
        }
      `}</style>
    </>
  );
};

export default TwoFactorSettings;
