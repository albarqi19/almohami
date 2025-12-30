import React from 'react';
import { Cloud, AlertTriangle, ExternalLink, UserCog } from 'lucide-react';
import { CloudStorageService } from '../services/cloudStorageService';

interface OneDriveRequiredAlertProps {
  onConnect?: () => void;
  message?: string;
  showConnectButton?: boolean;
  canConnect?: boolean;  // هل المستخدم يمكنه الربط (المدير فقط)
}

const OneDriveRequiredAlert: React.FC<OneDriveRequiredAlertProps> = ({
  onConnect,
  message,
  showConnectButton = true,
  canConnect = true  // افتراضياً true للتوافق مع الاستخدام القديم
}) => {
  const handleConnect = async () => {
    if (onConnect) {
      onConnect();
    } else {
      // Default behavior: redirect to OneDrive OAuth
      await CloudStorageService.connectOneDrive();
    }
  };

  // رسالة مختلفة حسب صلاحية المستخدم
  const displayMessage = message || (canConnect
    ? 'يجب ربط حساب OneDrive الخاص بالشركة لرفع الملفات'
    : 'لم يتم ربط حساب OneDrive بعد. تواصل مع مدير الشركة لربط الحساب.');

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
        backgroundColor: canConnect ? 'var(--color-warning-light, #FEF3C7)' : 'var(--color-info-light, #DBEAFE)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px'
      }}>
        {canConnect ? (
          <Cloud size={40} style={{ color: 'var(--color-warning, #F59E0B)' }} />
        ) : (
          <UserCog size={40} style={{ color: 'var(--color-info, #3B82F6)' }} />
        )}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <AlertTriangle size={20} style={{ color: canConnect ? 'var(--color-warning, #F59E0B)' : 'var(--color-info, #3B82F6)' }} />
        <h3 style={{
          margin: 0,
          fontSize: 'var(--font-size-lg, 18px)',
          fontWeight: 'var(--font-weight-semibold, 600)',
          color: 'var(--color-text, #1F2937)'
        }}>
          {canConnect ? 'التخزين السحابي غير متصل' : 'يتطلب ربط التخزين السحابي'}
        </h3>
      </div>

      <p style={{
        margin: '0 0 24px 0',
        fontSize: 'var(--font-size-sm, 14px)',
        color: 'var(--color-text-secondary, #6B7280)',
        maxWidth: '400px',
        lineHeight: '1.6'
      }}>
        {displayMessage}
      </p>

      {/* زر الربط يظهر فقط للمدير */}
      {showConnectButton && canConnect && (
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

      {/* رسالة للمحامين غير المصرح لهم بالربط */}
      {!canConnect && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          backgroundColor: 'var(--color-info-light, #DBEAFE)',
          borderRadius: '8px',
          border: '1px solid var(--color-info, #3B82F6)'
        }}>
          <UserCog size={18} style={{ color: 'var(--color-info, #3B82F6)' }} />
          <span style={{
            fontSize: 'var(--font-size-sm, 14px)',
            color: 'var(--color-info-dark, #1E40AF)',
            fontWeight: 'var(--font-weight-medium, 500)'
          }}>
            تواصل مع مدير الشركة لربط حساب OneDrive
          </span>
        </div>
      )}

      {canConnect && (
        <p style={{
          margin: '16px 0 0 0',
          fontSize: 'var(--font-size-xs, 12px)',
          color: 'var(--color-text-tertiary, #9CA3AF)'
        }}>
          سيتم توجيهك لتسجيل الدخول في Microsoft
        </p>
      )}
    </div>
  );
};

export default OneDriveRequiredAlert;
