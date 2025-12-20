import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { motion } from 'framer-motion';
import { 
  Download, 
  X, 
  FileText, 
  Image, 
  File,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Eye,
  AlertTriangle,
  Loader2
} from 'lucide-react';

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
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch preview with authentication when document changes
  useEffect(() => {
    if (document && isOpen) {
      fetchPreviewWithAuth();
    }
    return () => {
      // Clean up object URLs
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [document, isOpen]);

  const fetchPreviewWithAuth = async () => {
    if (!document) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(document.url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    } catch (err) {
      console.error('Error fetching preview:', err);
      setError('فشل في تحميل معاينة الملف');
    } finally {
      setLoading(false);
    }
  };

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

  const handleDownload = async () => {
    if (!document) return;
    
    try {
      const token = localStorage.getItem('authToken');
      // Use download endpoint instead of preview
      const downloadUrl = document.url.replace('/preview', '/download');
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading file:', err);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const resetView = () => {
    setZoom(100);
    setRotation(0);
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          backgroundColor: 'var(--color-background)',
          borderRadius: '8px',
          padding: '60px 40px',
          textAlign: 'center'
        }}>
          <Loader2 
            size={48} 
            style={{ 
              color: 'var(--color-primary)',
              marginBottom: '16px',
              animation: 'spin 1s linear infinite'
            }} 
          />
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)'
          }}>
            جارٍ تحميل المعاينة...
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          backgroundColor: 'var(--color-background)',
          borderRadius: '8px',
          padding: '60px 40px',
          textAlign: 'center'
        }}>
          <AlertTriangle 
            size={64} 
            style={{ 
              color: 'var(--color-error)',
              marginBottom: '20px'
            }} 
          />
          <h3 style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text)',
            marginBottom: '8px'
          }}>
            خطأ في التحميل
          </h3>
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)'
          }}>
            {error}
          </p>
        </div>
      );
    }

    if (!previewUrl) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          backgroundColor: 'var(--color-background)',
          borderRadius: '8px',
          padding: '60px 40px',
          textAlign: 'center'
        }}>
          <Eye 
            size={64} 
            style={{ 
              color: 'var(--color-text-tertiary)',
              marginBottom: '20px'
            }} 
          />
          <h3 style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text)',
            marginBottom: '8px'
          }}>
            لا توجد معاينة متاحة
          </h3>
        </div>
      );
    }

    const isImage = document?.type.startsWith('image/');
    const isPdf = document?.type.includes('pdf');
    const isText = document?.type.includes('text/');

    if (isImage) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          padding: '20px',
          backgroundColor: 'var(--color-background)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <motion.img
            src={previewUrl}
            alt={document?.name}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transition: 'transform 0.3s ease',
              borderRadius: '4px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
          />
        </div>
      );
    }

    if (isPdf) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          backgroundColor: 'var(--color-background)',
          borderRadius: '8px',
          padding: '40px'
        }}>
          <iframe
            src={previewUrl}
            title={document?.name}
            style={{
              width: '100%',
              height: '600px',
              border: 'none',
              borderRadius: '4px',
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left'
            }}
          />
        </div>
      );
    }

    if (isText) {
      return (
        <div style={{
          flex: 1,
          backgroundColor: 'var(--color-background)',
          borderRadius: '8px',
          padding: '20px',
          fontSize: `${zoom}%`,
          lineHeight: 1.6,
          fontFamily: 'monospace',
          overflow: 'auto',
          maxHeight: '600px'
        }}>
          <iframe
            src={previewUrl}
            title={document?.name}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '4px'
            }}
          />
        </div>
      );
    }

    // For unsupported file types
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        backgroundColor: 'var(--color-background)',
        borderRadius: '8px',
        padding: '60px 40px',
        textAlign: 'center'
      }}>
        <AlertTriangle 
          size={64} 
          style={{ 
            color: 'var(--color-warning)',
            marginBottom: '20px'
          }} 
        />
        <h3 style={{
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text)',
          margin: '0 0 12px 0'
        }}>
          لا يمكن معاينة هذا النوع من الملفات
        </h3>
        <p style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          margin: '0 0 24px 0',
          lineHeight: 1.5
        }}>
          نوع الملف "{document.type}" لا يدعم المعاينة المباشرة.<br />
          يمكنك تحميل الملف لفتحه في التطبيق المناسب.
        </p>
        <button
          onClick={handleDownload}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-primary)';
          }}
        >
          <Download size={16} />
          تحميل الملف
        </button>
      </div>
    );
  };

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
            {/* Zoom Controls (for images) */}
            {document.type.startsWith('image/') && (
              <>
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 25}
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
                    cursor: zoom <= 25 ? 'not-allowed' : 'pointer',
                    opacity: zoom <= 25 ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
                  title="تصغير"
                >
                  <ZoomOut size={16} />
                </button>

                <span style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text)',
                  minWidth: '50px',
                  textAlign: 'center'
                }}>
                  {zoom}%
                </span>

                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 300}
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
                    cursor: zoom >= 300 ? 'not-allowed' : 'pointer',
                    opacity: zoom >= 300 ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
                  title="تكبير"
                >
                  <ZoomIn size={16} />
                </button>

                <button
                  onClick={handleRotate}
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
                  title="دوران"
                >
                  <RotateCw size={16} />
                </button>

                <button
                  onClick={resetView}
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
                  title="إعادة تعيين العرض"
                >
                  <Eye size={16} />
                </button>
              </>
            )}

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
