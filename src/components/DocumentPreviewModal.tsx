import React, { useState } from 'react';
import Modal from './Modal';
import { motion } from 'framer-motion';
import {
  Download,
  X,
  FileText,
  Image,
  File,
  Maximize2,
} from 'lucide-react';
import FilePreview, { downloadDocument } from './FilePreview';

// Add CSS for spinner animation
const spinnerStyle = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// Inject the CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = spinnerStyle;
  document.head.appendChild(style);
}

interface DocumentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
  // الحقول السحابية — تُمكّن المعاينة الصحيحة لملفات OneDrive
  cloud_file_id?: string | null;
  cloud_web_url?: string | null;
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentFile | null;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ 
  isOpen, 
  onClose, 
  document 
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!document) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image size={24} style={{ color: 'var(--color-primary)' }} />;
    } else if (type.includes('pdf')) {
      return <FileText size={24} style={{ color: '#dc2626' }} />;
    } else if (type.includes('doc')) {
      return <FileText size={24} style={{ color: '#2563eb' }} />;
    } else {
      return <File size={24} style={{ color: 'var(--color-text-secondary)' }} />;
    }
  };

  // تحميل موحّد (محلي/OneDrive) عبر المكوّن المشترك
  const handleDownload = () =>
    downloadDocument({
      id: document.id,
      file_name: document.name,
      mime_type: document.type,
      cloud_file_id: document.cloud_file_id,
      cloud_web_url: document.cloud_web_url,
    });

  // المعاينة موحّدة عبر المكوّن المشترك FilePreview (يتعامل مع المحلي و OneDrive)
  const renderPreview = () => (
    <FilePreview
      doc={{
        id: document.id,
        file_name: document.name,
        mime_type: document.type,
        cloud_file_id: document.cloud_file_id,
        cloud_web_url: document.cloud_web_url,
      }}
    />
  );

  if (!document) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title=""
      size="xl"
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: isFullscreen ? '100vh' : '80vh',
        gap: '16px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {getFileIcon(document.type)}
            <div>
              <h2 style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text)',
                margin: '0 0 4px 0'
              }}>
                {document.name}
              </h2>
              <div style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>{formatFileSize(document.size)}</span>
                <span>•</span>
                <span>{document.uploadedAt.toLocaleDateString('ar-SA')}</span>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title={isFullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
            >
              <Maximize2 size={16} />
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                border: '1px solid var(--color-primary)',
                borderRadius: '6px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary)';
              }}
              title="تحميل"
            >
              <Download size={16} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-error)20';
                e.currentTarget.style.color = 'var(--color-error)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
              title="إغلاق"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            display: 'flex',
            flex: 1,
            overflow: 'hidden'
          }}
        >
          {renderPreview()}
        </motion.div>
      </div>
    </Modal>
  );
};

export default DocumentPreviewModal;
