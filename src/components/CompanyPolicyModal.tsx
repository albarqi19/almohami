import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, LogOut } from 'lucide-react';
import { apiClient } from '../utils/api';

interface CompanyPolicyModalProps {
  isOpen: boolean;
  title: string;
  content: string;
  onAcknowledge: () => void;
  onSignOut: () => void;
}

const CompanyPolicyModal: React.FC<CompanyPolicyModalProps> = ({
  isOpen,
  title,
  content,
  onAcknowledge,
  onSignOut,
}) => {
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (bottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAcknowledge = async () => {
    setIsAcknowledging(true);
    try {
      await apiClient.post('/policy/acknowledge');
      onAcknowledge();
    } catch (error) {
      console.error('Failed to acknowledge policy:', error);
      alert('حدث خطأ أثناء تسجيل الموافقة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsAcknowledging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Header - Notion style */}
        <div
          style={{
            padding: '32px 40px 24px',
            borderBottom: '1px solid var(--color-border)',
            textAlign: 'center',
          }}
        >
          <div style={{
            width: '56px',
            height: '56px',
            margin: '0 auto 20px',
            borderRadius: '12px',
            backgroundColor: 'var(--law-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ShieldCheck size={32} color="white" />
          </div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--color-text)',
            margin: '0 0 12px 0',
            letterSpacing: '-0.5px',
          }}>
            {title}
          </h2>
          <p style={{
            fontSize: '15px',
            color: 'var(--color-text-secondary)',
            marginTop: '8px',
            lineHeight: '1.6',
          }}>
            يرجى قراءة السياسة بعناية والموافقة عليها للمتابعة
          </p>
        </div>

        {/* Content - Scrollable */}
        <div
          onScroll={handleScroll}
          style={{
            flex: 1,
            padding: '32px 40px',
            overflowY: 'auto',
            fontSize: '15px',
            lineHeight: '1.8',
            color: 'var(--color-text)',
          }}
          className="policy-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Scroll Indicator */}
        {!hasScrolledToBottom && (
          <div
            style={{
              padding: '12px 24px',
              textAlign: 'center',
              backgroundColor: 'var(--status-blue-light)',
              color: 'var(--status-blue)',
              fontSize: '14px',
              fontWeight: 500,
              borderTop: '1px solid var(--status-blue)',
              borderBottom: '1px solid var(--status-blue)',
            }}
          >
            ↓ يرجى التمرير للأسفل لقراءة السياسة كاملة
          </div>
        )}

        {/* Footer - Notion style buttons */}
        <div
          style={{
            padding: '24px 40px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          {/* Sign Out Button */}
          <button
            onClick={onSignOut}
            disabled={isAcknowledging}
            style={{
              padding: '12px 20px',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isAcknowledging) {
                e.currentTarget.style.borderColor = 'var(--color-text-secondary)';
                e.currentTarget.style.backgroundColor = 'var(--color-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={18} />
            تسجيل الخروج
          </button>

          {/* Acknowledge Button */}
          <button
            onClick={handleAcknowledge}
            disabled={!hasScrolledToBottom || isAcknowledging}
            style={{
              padding: '12px 24px',
              backgroundColor: hasScrolledToBottom && !isAcknowledging
                ? 'var(--law-gold)'
                : 'var(--color-border)',
              color: hasScrolledToBottom && !isAcknowledging ? 'white' : 'var(--color-text-secondary)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: hasScrolledToBottom && !isAcknowledging ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              opacity: hasScrolledToBottom && !isAcknowledging ? 1 : 0.6,
            }}
            onMouseEnter={(e) => {
              if (hasScrolledToBottom && !isAcknowledging) {
                e.currentTarget.style.backgroundColor = '#b89248';
              }
            }}
            onMouseLeave={(e) => {
              if (hasScrolledToBottom && !isAcknowledging) {
                e.currentTarget.style.backgroundColor = 'var(--law-gold)';
              }
            }}
          >
            {isAcknowledging ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                جاري التسجيل...
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                أوافق على السياسة
              </>
            )}
          </button>
        </div>
      </motion.div>

      <style>{`
        .policy-content h1,
        .policy-content h2,
        .policy-content h3 {
          color: var(--color-text);
          margin-top: 28px;
          margin-bottom: 12px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .policy-content h1 {
          font-size: 24px;
        }

        .policy-content h2 {
          font-size: 20px;
        }

        .policy-content h3 {
          font-size: 17px;
        }

        .policy-content p {
          margin-bottom: 16px;
          line-height: 1.75;
        }

        .policy-content ul,
        .policy-content ol {
          margin-bottom: 16px;
          padding-right: 28px;
        }

        .policy-content li {
          margin-bottom: 8px;
          line-height: 1.7;
        }

        .policy-content strong {
          color: var(--law-gold);
          font-weight: 600;
        }

        .policy-content em {
          font-style: italic;
          color: var(--color-text-secondary);
        }

        .policy-content blockquote {
          border-right: 3px solid var(--law-gold);
          padding: 12px 20px;
          margin: 16px 0;
          background-color: var(--color-secondary);
          border-radius: 4px;
        }

        .policy-content code {
          background-color: var(--color-secondary);
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
        }

        .policy-content a {
          color: var(--law-gold);
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.2s;
        }

        .policy-content a:hover {
          border-bottom-color: var(--law-gold);
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default CompanyPolicyModal;
