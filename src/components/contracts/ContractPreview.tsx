import React, { useState, useEffect } from 'react';
import { X, Printer, Download, Loader2, FileText } from 'lucide-react';
import { useContractVariables } from '../../hooks/useContractVariables';
import { LetterheadService } from '../../services/letterheadService';
import { generateLetterheadHTML, generatePrintHTML } from '../../utils/letterheadPrint';
import type { Letterhead } from '../../types/letterhead';

export interface ContractPreviewProps {
  isOpen?: boolean;
  onClose: () => void;
  content: string;
  variables: Record<string, string>;
  title?: string;
  contractTitle?: string; // alias for title
  contractNumber?: string;
  letterhead?: Letterhead; // Optional: pass letterhead directly
  letterheadId?: number; // Optional: fetch letterhead by ID
  useLetterhead?: boolean; // Whether to use letterhead (default: true)
}

const ContractPreview: React.FC<ContractPreviewProps> = ({
  isOpen = true,
  onClose,
  content = '',
  variables = {},
  title: titleProp,
  contractTitle,
  contractNumber,
  letterhead: letterheadProp,
  letterheadId,
  useLetterhead = true,
}) => {
  const { replaceVariables } = useContractVariables();
  const [letterhead, setLetterhead] = useState<Letterhead | null>(letterheadProp || null);
  const [loadingLetterhead, setLoadingLetterhead] = useState(false);
  const [letterheadEnabled, setLetterheadEnabled] = useState(useLetterhead);

  // Support both title and contractTitle for backward compatibility
  const title = titleProp || contractTitle || 'معاينة العقد';

  // Fetch letterhead if not provided
  useEffect(() => {
    if (!useLetterhead) return;

    if (letterheadProp) {
      setLetterhead(letterheadProp);
      return;
    }

    const fetchLetterhead = async () => {
      try {
        setLoadingLetterhead(true);
        let response;

        if (letterheadId) {
          response = await LetterheadService.getById(letterheadId);
        } else {
          response = await LetterheadService.getDefault();
        }

        if (response.success && response.data) {
          setLetterhead(response.data as Letterhead);
        }
      } catch (err) {
        console.error('Failed to fetch letterhead:', err);
        // Continue without letterhead
      } finally {
        setLoadingLetterhead(false);
      }
    };

    fetchLetterhead();
  }, [letterheadProp, letterheadId, useLetterhead]);

  if (!isOpen) return null;

  // استبدال المتغيرات في المحتوى
  const safeContent = content || '';
  const previewContent = replaceVariables(safeContent, variables || {});

  // توليد HTML للطباعة
  const getGeneratedHTML = () => {
    if (letterheadEnabled && letterhead) {
      return generateLetterheadHTML(letterhead, previewContent, title);
    }
    return generatePrintHTML(previewContent, title, contractNumber);
  };

  const handlePrint = () => {
    const html = getGeneratedHTML();
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
    const html = getGeneratedHTML();
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
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Letterhead Toggle */}
            {letterhead && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: letterheadEnabled ? '#dcfce7' : '#f3f4f6',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: letterheadEnabled ? '#166534' : '#6b7280',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={letterheadEnabled}
                  onChange={(e) => setLetterheadEnabled(e.target.checked)}
                  style={{ display: 'none' }}
                />
                <FileText size={14} />
                <span>الكليشة</span>
              </label>
            )}
            {loadingLetterhead && (
              <Loader2 size={16} className="animate-spin" style={{ color: '#6b7280' }} />
            )}
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
          {letterheadEnabled && letterhead ? (
            // Preview with letterhead using iframe
            <div
              style={{
                width: '100%',
                maxWidth: '800px',
                margin: '0 auto',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
              }}
            >
              <iframe
                srcDoc={getGeneratedHTML()}
                style={{
                  width: '100%',
                  height: '600px',
                  border: 'none',
                }}
                title="معاينة العقد"
              />
            </div>
          ) : (
            // Simple preview without letterhead
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
          )}
        </div>

        {/* Footer Info */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f9fafb',
            fontSize: '13px',
            color: '#6b7280',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {letterheadEnabled && letterhead && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FileText size={14} />
                الكليشة: {letterhead.name}
              </span>
            )}
            {safeContent.includes('{{') && (
              <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                ⚠️ بعض المتغيرات لم يتم تعبئتها
              </span>
            )}
          </div>
          <span>مقاس A4</span>
        </div>
      </div>
    </div>
  );
};

export default ContractPreview;
