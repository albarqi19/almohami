import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Download, Loader2, FileText } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useContractVariables } from '../../hooks/useContractVariables';
import { LetterheadService } from '../../services/letterheadService';
import type { Letterhead } from '../../types/letterhead';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export interface ContractPreviewProps {
  isOpen?: boolean;
  onClose: () => void;
  content: string;
  variables: Record<string, string>;
  title?: string;
  contractTitle?: string;
  contractNumber?: string;
  letterhead?: Letterhead;
  letterheadId?: number;
  useLetterhead?: boolean;
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
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const title = titleProp || contractTitle || 'معاينة العقد';
  const safeContent = content || '';
  const previewContent = replaceVariables(safeContent, variables || {});

  // Fetch letterhead
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
      } finally {
        setLoadingLetterhead(false);
      }
    };
    fetchLetterhead();
  }, [letterheadProp, letterheadId, useLetterhead]);

  // Preload images
  useEffect(() => {
    if (!letterhead || !letterheadEnabled) {
      setImagesLoaded(true);
      return;
    }

    const imageUrls = [
      letterhead.header_image_url,
      letterhead.footer_image_url,
      letterhead.logo_url,
    ].filter(Boolean) as string[];

    if (imageUrls.length === 0) {
      setImagesLoaded(true);
      return;
    }

    let loaded = 0;
    imageUrls.forEach((url) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        if (loaded >= imageUrls.length) {
          setImagesLoaded(true);
        }
      };
      img.src = url;
    });
  }, [letterhead, letterheadEnabled]);

  // Get letterhead for print margins calculation
  const lhForPrint = letterheadEnabled && letterhead ? letterhead : null;
  const printHeaderHeight = lhForPrint?.type === 'image' ? (lhForPrint.header_height_mm || 30) : lhForPrint?.type === 'dynamic' ? 40 : 15;
  const printFooterHeight = lhForPrint?.type === 'image' ? (lhForPrint.footer_height_mm || 25) : lhForPrint?.type === 'dynamic' ? 25 : 15;
  const printMarginRight = lhForPrint?.margin_right_mm || 15;
  const printMarginLeft = lhForPrint?.margin_left_mm || 15;

  // Print handler using react-to-print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: title,
    pageStyle: `
      @page {
        size: A4;
        margin: ${printHeaderHeight}mm ${printMarginLeft}mm ${printFooterHeight}mm ${printMarginRight}mm;
      }
      @media print {
        html, body {
          height: 100%;
          margin: 0 !important;
          padding: 0 !important;
        }
      }
    `,
  });

  // Download PDF
  const handleDownload = async () => {
    if (!printRef.current) return;

    const filename = `${title}${contractNumber ? `-${contractNumber}` : ''}.pdf`;
    const opt = {
      margin: 0,
      filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
      },
      jsPDF: {
        unit: 'mm' as const,
        format: 'a4' as const,
        orientation: 'portrait' as const,
      },
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (html2pdf as any)().set(opt).from(printRef.current).save();
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF');
    }
  };

  if (!isOpen) return null;

  // Get letterhead settings
  const lh = letterheadEnabled && letterhead ? letterhead : null;
  const headerHeight = lh?.type === 'image' ? (lh.header_height_mm || 30) : 0;
  const footerHeight = lh?.type === 'image' ? (lh.footer_height_mm || 25) : 0;

  // Debug watermark
  console.log('Letterhead watermark data:', {
    watermark_enabled: lh?.watermark_enabled,
    watermark_type: lh?.watermark_type,
    watermark_text: lh?.watermark_text,
    watermark_position: lh?.watermark_position,
    watermark_opacity: lh?.watermark_opacity,
  });

  return (
    <div className="contract-preview-overlay" onClick={onClose}>
      <div className="contract-preview-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="contract-preview-header">
          <div>
            <h3 className="contract-preview-title">{title}</h3>
            {contractNumber && (
              <span className="contract-preview-subtitle">رقم العقد: {contractNumber}</span>
            )}
          </div>
          <div className="contract-preview-actions">
            {letterhead && (
              <label className={`contract-preview-toggle ${letterheadEnabled ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={letterheadEnabled}
                  onChange={(e) => setLetterheadEnabled(e.target.checked)}
                />
                <FileText size={14} />
                <span>الكليشة</span>
              </label>
            )}
            {loadingLetterhead && <Loader2 size={16} className="animate-spin" />}
            <button
              onClick={() => handlePrint()}
              disabled={!imagesLoaded}
              className="contract-preview-btn print"
            >
              <Printer size={16} />
              طباعة
            </button>
            <button
              onClick={handleDownload}
              disabled={!imagesLoaded}
              className="contract-preview-btn download"
            >
              <Download size={16} />
              تحميل PDF
            </button>
            <button onClick={onClose} className="contract-preview-btn close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="contract-preview-body">
          <div className="contract-preview-paper-wrapper">
            {/* A4 Paper */}
            <div ref={printRef} className="contract-preview-paper">
              {/* Header Image */}
              {lh?.type === 'image' && lh.header_image_url && (
                <div
                  className="letterhead-header-img"
                  style={{ height: `${headerHeight}mm` }}
                >
                  <img
                    src={lh.header_image_url}
                    alt="Header"
                                      />
                </div>
              )}

              {/* Dynamic Header */}
              {lh?.type === 'dynamic' && (
                <div className="letterhead-header-dynamic">
                  <div className={`header-layout logo-${lh.logo_position || 'right'}`}>
                    {lh.logo_url && (
                      <div className="header-logo">
                        <img
                          src={lh.logo_url}
                          alt="Logo"
                          style={{ width: lh.logo_width_px || 80 }}
                                                  />
                      </div>
                    )}
                    <div className="header-info">
                      {lh.company_name && (
                        <h1 style={{ color: lh.primary_color || '#C5A059' }}>
                          {lh.company_name}
                        </h1>
                      )}
                      {lh.company_name_en && <p className="company-en">{lh.company_name_en}</p>}
                      {lh.header_text && <p className="header-text">{lh.header_text}</p>}
                    </div>
                  </div>
                  {lh.show_border_bottom && (
                    <div
                      className="header-border"
                      style={{ backgroundColor: lh.border_color || '#C5A059' }}
                    />
                  )}
                </div>
              )}

              {/* Content */}
              <div
                className="contract-content"
                style={{
                  paddingTop: lh?.type === 'image' ? `${headerHeight + 5}mm` : lh?.type === 'dynamic' ? '45mm' : '20mm',
                  paddingBottom: lh?.type === 'image' ? `${footerHeight + 5}mm` : lh?.type === 'dynamic' ? '30mm' : '20mm',
                  paddingRight: `${lh?.margin_right_mm || 20}mm`,
                  paddingLeft: `${lh?.margin_left_mm || 20}mm`,
                }}
                dangerouslySetInnerHTML={{ __html: previewContent }}
              />

              {/* Footer Image */}
              {lh?.type === 'image' && lh.footer_image_url && (
                <div
                  className="letterhead-footer-img"
                  style={{ height: `${footerHeight}mm` }}
                >
                  <img
                    src={lh.footer_image_url}
                    alt="Footer"
                                      />
                </div>
              )}

              {/* Dynamic Footer */}
              {lh?.type === 'dynamic' && (
                <div className="letterhead-footer-dynamic">
                  <div
                    className="footer-border"
                    style={{ backgroundColor: lh.border_color || '#C5A059' }}
                  />
                  <div className="footer-content">
                    {lh.footer_text && <p>{lh.footer_text}</p>}
                    <div className="footer-contact">
                      {lh.footer_phone && <span>هاتف: {lh.footer_phone}</span>}
                      {lh.footer_email && <span>بريد: {lh.footer_email}</span>}
                      {lh.footer_website && <span>{lh.footer_website}</span>}
                    </div>
                    {lh.footer_address && <p>{lh.footer_address}</p>}
                  </div>
                </div>
              )}

              {/* Watermark */}
              {lh?.watermark_enabled && (
                <>
                  {/* Primary Watermark */}
                  {lh.watermark_position === 'repeat' ? (
                    // Repeat pattern watermark
                    <div className="watermark-repeat-container">
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className="watermark-item"
                          style={{
                            transform: `rotate(${lh.watermark_rotation || -45}deg)`,
                            opacity: (lh.watermark_opacity || 15) / 100,
                            fontSize: `${(lh.watermark_font_size || 48) * (lh.watermark_size || 100) / 100}px`,
                            color: lh.watermark_text_color || '#000000',
                          }}
                        >
                          {lh.watermark_type === 'text' ? (
                            lh.watermark_use_lawyer_name
                              ? (variables?.['lawyer_name'] || variables?.['اسم_المحامي'] || 'اسم المحامي')
                              : (lh.watermark_text || '')
                          ) : lh.watermark_image_url ? (
                            <img src={lh.watermark_image_url} alt="watermark" style={{ height: `${(lh.watermark_size || 100) * 0.5}px` }} />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Single watermark
                    <div
                      className={`watermark-single watermark-${lh.watermark_position || 'center'}`}
                      style={{
                        transform: `translate(-50%, -50%) rotate(${lh.watermark_rotation || -45}deg)`,
                        opacity: (lh.watermark_opacity || 15) / 100,
                        fontSize: `${(lh.watermark_font_size || 48) * (lh.watermark_size || 100) / 100}px`,
                        color: lh.watermark_text_color || '#000000',
                      }}
                    >
                      {lh.watermark_type === 'text' ? (
                        lh.watermark_use_lawyer_name
                          ? (variables?.['lawyer_name'] || variables?.['اسم_المحامي'] || 'اسم المحامي')
                          : (lh.watermark_text || '')
                      ) : lh.watermark_image_url ? (
                        <img src={lh.watermark_image_url} alt="watermark" style={{ height: `${(lh.watermark_size || 100) * 0.8}px` }} />
                      ) : null}
                    </div>
                  )}

                  {/* Secondary Watermark */}
                  {lh.watermark_secondary_enabled && (
                    <div
                      className={`watermark-secondary watermark-secondary-${lh.watermark_secondary_position || 'top'}`}
                      style={{
                        transform: `translateX(-50%) rotate(${lh.watermark_secondary_rotation || 0}deg)`,
                        opacity: (lh.watermark_secondary_opacity || 10) / 100,
                        fontSize: `${24 * (lh.watermark_secondary_size || 80) / 100}px`,
                      }}
                    >
                      {lh.watermark_secondary_type === 'text'
                        ? (lh.watermark_secondary_text || '')
                        : lh.watermark_secondary_image_url
                          ? <img src={lh.watermark_secondary_image_url} alt="watermark" style={{ height: `${(lh.watermark_secondary_size || 80) * 0.4}px` }} />
                          : null
                      }
                    </div>
                  )}
                </>
              )}

              {/* Page Numbers */}
              {lh?.show_page_numbers && (
                <div className="page-number">
                  صفحة <span className="page-current"></span> من <span className="page-total"></span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="contract-preview-footer">
          <div className="footer-info">
            {lh && <span><FileText size={14} /> الكليشة: {lh.name}</span>}
            {!imagesLoaded && <span className="loading">جاري تحميل الصور...</span>}
          </div>
          <span>مقاس A4</span>
        </div>
      </div>

      <style>{`
        .contract-preview-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .contract-preview-modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 900px;
          height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .contract-preview-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f9fafb;
        }

        .contract-preview-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .contract-preview-subtitle {
          font-size: 14px;
          color: #6b7280;
        }

        .contract-preview-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .contract-preview-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #f3f4f6;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          color: #6b7280;
          transition: all 0.2s;
        }

        .contract-preview-toggle.active {
          background: #dcfce7;
          color: #166534;
        }

        .contract-preview-toggle input {
          display: none;
        }

        .contract-preview-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-family: inherit;
          transition: opacity 0.2s;
        }

        .contract-preview-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .contract-preview-btn.print {
          background: #1d4ed8;
          color: white;
        }

        .contract-preview-btn.download {
          background: #059669;
          color: white;
        }

        .contract-preview-btn.close {
          background: #f3f4f6;
          color: #6b7280;
          padding: 8px;
        }

        .contract-preview-body {
          flex: 1;
          overflow: auto;
          padding: 40px;
          background: #e5e7eb;
          display: flex;
          justify-content: center;
        }

        .contract-preview-paper-wrapper {
          width: 210mm;
        }

        .contract-preview-paper {
          width: 210mm;
          background: white;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          position: relative;
        }

        /* Header Image */
        .letterhead-header-img {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          width: 100%;
          overflow: hidden;
        }

        .letterhead-header-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top;
          display: block;
        }

        /* Footer Image */
        .letterhead-footer-img {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          overflow: hidden;
        }

        .letterhead-footer-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: bottom;
          display: block;
        }

        /* Dynamic Header */
        .letterhead-header-dynamic {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 15mm 20mm 10mm;
        }

        .header-layout {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .header-layout.logo-right {
          flex-direction: row;
        }

        .header-layout.logo-left {
          flex-direction: row-reverse;
        }

        .header-layout.logo-center {
          flex-direction: column;
          text-align: center;
        }

        .header-logo img {
          height: auto;
          display: block;
        }

        .header-info {
          flex: 1;
        }

        .header-info h1 {
          margin: 0 0 4px;
          font-size: 20px;
        }

        .header-info .company-en {
          font-size: 14px;
          color: #666;
          margin: 2px 0;
        }

        .header-info .header-text {
          font-size: 11px;
          margin: 2px 0;
          white-space: pre-line;
        }

        .header-border {
          height: 2px;
          margin-top: 10px;
        }

        /* Dynamic Footer */
        .letterhead-footer-dynamic {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 10mm 20mm 15mm;
          text-align: center;
          font-size: 10px;
        }

        .footer-border {
          height: 1px;
          margin-bottom: 8px;
        }

        .footer-contact {
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        /* Content */
        .contract-content {
          direction: rtl;
          font-family: 'Times New Roman', 'Traditional Arabic', serif;
          font-size: 14px;
          line-height: 1.8;
          color: #333;
        }

        /* Headings */
        .contract-content h1 {
          font-size: 24px;
          font-weight: bold;
          margin: 24px 0 16px;
          color: #1a1a1a;
          text-align: center;
        }

        .contract-content h2 {
          font-size: 20px;
          font-weight: bold;
          margin: 20px 0 12px;
          color: #1a1a1a;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
        }

        .contract-content h3 {
          font-size: 17px;
          font-weight: bold;
          margin: 16px 0 10px;
          color: #333;
        }

        .contract-content h4 {
          font-size: 15px;
          font-weight: bold;
          margin: 14px 0 8px;
          color: #444;
        }

        /* Paragraphs */
        .contract-content p {
          margin-bottom: 12px;
          text-align: justify;
        }

        /* Text alignment */
        .contract-content [style*="text-align: center"],
        .contract-content .text-center,
        .contract-content [align="center"] {
          text-align: center !important;
        }

        .contract-content [style*="text-align: right"],
        .contract-content .text-right,
        .contract-content [align="right"] {
          text-align: right !important;
        }

        .contract-content [style*="text-align: left"],
        .contract-content .text-left,
        .contract-content [align="left"] {
          text-align: left !important;
        }

        /* Bold & Italic */
        .contract-content strong,
        .contract-content b {
          font-weight: bold;
        }

        .contract-content em,
        .contract-content i {
          font-style: italic;
        }

        .contract-content u {
          text-decoration: underline;
        }

        /* Lists */
        .contract-content ul,
        .contract-content ol {
          margin-bottom: 12px;
          padding-right: 30px;
        }

        .contract-content ul {
          list-style-type: disc;
        }

        .contract-content ol {
          list-style-type: decimal;
        }

        .contract-content li {
          margin-bottom: 6px;
        }

        /* Tables */
        .contract-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }

        .contract-content th,
        .contract-content td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: right;
        }

        .contract-content th {
          background-color: #f5f5f5;
          font-weight: bold;
        }

        /* Blockquote */
        .contract-content blockquote {
          border-right: 4px solid #C5A059;
          padding-right: 16px;
          margin: 16px 0;
          color: #555;
          font-style: italic;
        }

        /* Horizontal rule */
        .contract-content hr {
          border: none;
          border-top: 1px solid #ddd;
          margin: 20px 0;
        }

        /* Links */
        .contract-content a {
          color: #1d4ed8;
          text-decoration: underline;
        }

        /* Code */
        .contract-content code {
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
        }

        /* TipTap specific classes */
        .contract-content .ProseMirror {
          outline: none;
        }

        .contract-content .is-editor-empty:first-child::before {
          display: none;
        }

        .contract-preview-footer {
          padding: 12px 20px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f9fafb;
          font-size: 13px;
          color: #6b7280;
        }

        .footer-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .footer-info span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .footer-info .loading {
          color: #d97706;
        }

        /* Watermark Styles */
        .watermark-repeat-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(4, 1fr);
          gap: 20px;
          padding: 40px;
          pointer-events: none;
          z-index: 1;
        }

        .watermark-item {
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Traditional Arabic', serif;
          font-weight: bold;
          white-space: nowrap;
          pointer-events: none;
        }

        .watermark-single {
          position: absolute;
          font-family: 'Traditional Arabic', serif;
          font-weight: bold;
          white-space: nowrap;
          pointer-events: none;
          z-index: 1;
        }

        .watermark-center {
          top: 50%;
          left: 50%;
        }

        .watermark-top {
          top: 25%;
          left: 50%;
        }

        .watermark-bottom {
          top: 75%;
          left: 50%;
        }

        .watermark-secondary {
          position: absolute;
          left: 50%;
          font-family: 'Traditional Arabic', serif;
          font-weight: bold;
          white-space: nowrap;
          pointer-events: none;
          z-index: 1;
          color: #666;
        }

        .watermark-secondary-top {
          top: 15%;
        }

        .watermark-secondary-center {
          top: 50%;
        }

        .watermark-secondary-bottom {
          bottom: 15%;
        }

        /* Print Styles */
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .contract-preview-paper {
            box-shadow: none;
            margin: 0;
            width: 100%;
            min-height: auto;
            overflow: visible;
          }

          /* Fixed position makes header/footer repeat on every page */
          .letterhead-header-img {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
          }

          .letterhead-footer-img {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
          }

          .letterhead-header-img img,
          .letterhead-footer-img img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
          }

          .letterhead-header-dynamic {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
          }

          .letterhead-footer-dynamic {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
          }

          /* Watermark fixed on each page */
          .watermark-repeat-container,
          .watermark-single,
          .watermark-secondary,
          .watermark-item {
            position: fixed !important;
          }

          .watermark-repeat-container {
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ContractPreview;
