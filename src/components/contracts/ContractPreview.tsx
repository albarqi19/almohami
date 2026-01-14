import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import { useContractVariables } from '../../hooks/useContractVariables';

export interface ContractPreviewProps {
  isOpen?: boolean;
  onClose: () => void;
  content: string;
  variables: Record<string, string>;
  title?: string;
  contractTitle?: string; // alias for title
  contractNumber?: string;
}

const ContractPreview: React.FC<ContractPreviewProps> = ({
  isOpen = true,
  onClose,
  content = '',
  variables = {},
  title: titleProp,
  contractTitle,
  contractNumber,
}) => {
  const { replaceVariables } = useContractVariables();
  // Support both title and contractTitle for backward compatibility
  const title = titleProp || contractTitle || 'معاينة العقد';

  if (!isOpen) return null;

  // استبدال المتغيرات في المحتوى
  const safeContent = content || '';
  const previewContent = replaceVariables(safeContent, variables || {});

  // توليد HTML للطباعة
  const generatePrintHTML = () => {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${title}${contractNumber ? ` - ${contractNumber}` : ''}</title>
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Times New Roman', 'Traditional Arabic', serif;
            background: white;
            padding: 20px;
            direction: rtl;
            color: #000;
            font-size: 14px;
            line-height: 1.8;
          }
          .contract-container {
            max-width: 100%;
            margin: 0 auto;
            background: white;
          }
          h1, h2, h3 {
            margin-bottom: 16px;
            font-weight: bold;
          }
          h1 { font-size: 22px; text-align: center; }
          h2 { font-size: 18px; }
          h3 { font-size: 16px; }
          p {
            margin-bottom: 12px;
            text-align: justify;
          }
          ul, ol {
            margin-bottom: 12px;
            padding-right: 24px;
          }
          li {
            margin-bottom: 6px;
          }
          .contract-variable-mention {
            background-color: transparent;
            color: inherit;
            padding: 0;
          }
          @media print {
            body {
              padding: 0;
            }
            @page {
              size: A4;
              margin: 20mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="contract-container">
          ${previewContent}
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const html = generatePrintHTML();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    }
  };

  const handleDownload = () => {
    const html = generatePrintHTML();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}${contractNumber ? `-${contractNumber}` : ''}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '900px',
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f9fafb',
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: '#111827',
              }}
            >
              {title}
            </h3>
            {contractNumber && (
              <span
                style={{
                  fontSize: '14px',
                  color: '#6b7280',
                }}
              >
                رقم العقد: {contractNumber}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: '#1d4ed8',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              <Printer size={16} />
              طباعة
            </button>
            <button
              onClick={handleDownload}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              <Download size={16} />
              تحميل
            </button>
            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <X size={18} color="#6b7280" />
            </button>
          </div>
        </div>

        {/* محتوى المعاينة */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '40px',
            backgroundColor: '#f9fafb',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              maxWidth: '800px',
              margin: '0 auto',
              direction: 'rtl',
              fontFamily: "'Times New Roman', 'Traditional Arabic', serif",
              fontSize: '16px',
              lineHeight: 1.8,
            }}
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />
        </div>

        {/* تنبيه المتغيرات غير المعبأة */}
        {safeContent.includes('{{') && (
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: '#fef3c7',
              borderTop: '1px solid #fcd34d',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#92400e',
            }}
          >
            <span>⚠️</span>
            <span>
              بعض المتغيرات لم يتم تعبئتها بعد. تأكد من ملء جميع البيانات المطلوبة.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractPreview;
