import React from 'react';
import { Cloud, AlertTriangle, ExternalLink } from 'lucide-react';
import { CloudStorageService } from '../services/cloudStorageService';

interface OneDriveRequiredAlertProps {
  onConnect?: () => void;
  message?: string;
  showConnectButton?: boolean;
}

const OneDriveRequiredAlert: React.FC<OneDriveRequiredAlertProps> = ({
  onConnect,
  message = 'يجب ربط حساب OneDrive الخاص بالشركة لرفع الملفات',
  showConnectButton = true
}) => {
  const handleConnect = async () => {
    if (onConnect) {
      onConnect();
    } else {
      // Default behavior: redirect to OneDrive OAuth
      await CloudStorageService.connectOneDrive();
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      textAlign: 'center',
      minHeight: '300px'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: 'var(--color-warning-light, #FEF3C7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px'
      }}>
        <Cloud size={40} style={{ color: 'var(--color-warning, #F59E0B)' }} />
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <AlertTriangle size={20} style={{ color: 'var(--color-warning, #F59E0B)' }} />
        <h3 style={{
          margin: 0,
          fontSize: 'var(--font-size-lg, 18px)',
          fontWeight: 'var(--font-weight-semibold, 600)',
          color: 'var(--color-text, #1F2937)'
        }}>
          التخزين السحابي غير متصل
        </h3>
      </div>

      <p style={{
        margin: '0 0 24px 0',
        fontSize: 'var(--font-size-sm, 14px)',
        color: 'var(--color-text-secondary, #6B7280)',
        maxWidth: '400px',
        lineHeight: '1.6'
      }}>
        {message}
      </p>

      {showConnectButton && (
        <button
          onClick={handleConnect}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: 'var(--color-primary, #3B82F6)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: 'var(--font-size-sm, 14px)',
            fontWeight: 'var(--font-weight-medium, 500)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-primary-dark, #2563EB)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-primary, #3B82F6)';
          }}
        >
          <Cloud size={18} />
          ربط OneDrive الآن
          <ExternalLink size={14} />
        </button>
      )}

      <p style={{
        margin: '16px 0 0 0',
        fontSize: 'var(--font-size-xs, 12px)',
        color: 'var(--color-text-tertiary, #9CA3AF)'
      }}>
        سيتم توجيهك لتسجيل الدخول في Microsoft
      </p>
    </div>
  );
};

export default OneDriveRequiredAlert;
