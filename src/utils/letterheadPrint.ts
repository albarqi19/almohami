import type { Letterhead, WatermarkPosition, WatermarkType } from '../types/letterhead';

/**
 * Generate print-ready HTML with letterhead
 */
export function generateLetterheadHTML(
  letterhead: Letterhead | Partial<Letterhead>,
  content: string,
  title?: string,
  lawyerName?: string
): string {
  const {
    type = 'dynamic',
    header_image_url,
    footer_image_url,
    header_height_mm = 30,
    footer_height_mm = 25,
    logo_url,
    logo_position = 'right',
    logo_width_px = 80,
    company_name,
    company_name_en,
    header_text,
    show_border_bottom = true,
    border_color = '#C5A059',
    footer_text,
    footer_phone,
    footer_email,
    footer_website,
    footer_address,
    show_page_numbers = true,
    page_number_format = 'arabic',
    primary_color = '#C5A059',
    secondary_color = '#1a1a1a',
    text_color = '#333333',
    margin_top_mm = 25,
    margin_bottom_mm = 20,
    margin_right_mm = 20,
    margin_left_mm = 20,
    // Watermark settings
    watermark_enabled = false,
    watermark_type = 'text' as WatermarkType,
    watermark_text = null,
    watermark_font_family = 'Traditional Arabic',
    watermark_font_size = 48,
    watermark_text_color = '#000000',
    watermark_image_url = null,
    watermark_opacity = 15,
    watermark_size = 100,
    watermark_rotation = -45,
    watermark_position = 'center' as WatermarkPosition,
    watermark_repeat_gap = 100,
    watermark_use_lawyer_name = false,
    // Secondary watermark
    watermark_secondary_enabled = false,
    watermark_secondary_type = 'text' as WatermarkType,
    watermark_secondary_text = null,
    watermark_secondary_image_url = null,
    watermark_secondary_opacity = 10,
    watermark_secondary_size = 80,
    watermark_secondary_rotation = 0,
    watermark_secondary_position = 'top',
  } = letterhead;

  // Calculate content margins based on header/footer
  const contentMarginTop = type === 'image' ? header_height_mm + 5 : 45;
  const contentMarginBottom = type === 'image' ? footer_height_mm + 5 : 35;

  // Build header HTML
  const headerHTML = type === 'image'
    ? buildImageHeader(header_image_url, header_height_mm)
    : buildDynamicHeader({
        logo_url,
        logo_position,
        logo_width_px,
        company_name,
        company_name_en,
        header_text,
        show_border_bottom,
        border_color,
        primary_color,
        secondary_color,
        text_color,
      });

  // Build footer HTML
  const footerHTML = type === 'image'
    ? buildImageFooter(footer_image_url, footer_height_mm)
    : buildDynamicFooter({
        footer_text,
        footer_phone,
        footer_email,
        footer_website,
        footer_address,
        border_color,
        text_color,
      });

  // Page number CSS (only works in Chrome print)
  const pageNumberCSS = show_page_numbers
    ? `
    @page {
      @bottom-center {
        content: "${page_number_format === 'arabic' ? 'صفحة ' : 'Page '}" counter(page) "${page_number_format === 'arabic' ? ' من ' : ' of '}" counter(pages);
        font-size: 10px;
        color: ${text_color};
      }
    }
  `
    : '';

  // Build watermark HTML
  const watermarkText = watermark_use_lawyer_name && lawyerName ? lawyerName : watermark_text;
  const watermarkHTML = watermark_enabled
    ? buildWatermarkHTML({
        type: watermark_type,
        text: watermarkText,
        imageUrl: watermark_image_url,
        opacity: watermark_opacity,
        size: watermark_size,
        rotation: watermark_rotation,
        position: watermark_position,
        repeatGap: watermark_repeat_gap,
        textColor: watermark_text_color,
        fontSize: watermark_font_size,
        fontFamily: watermark_font_family,
      })
    : '';

  // Build secondary watermark HTML
  const secondaryWatermarkHTML = watermark_enabled && watermark_secondary_enabled
    ? buildWatermarkHTML({
        type: watermark_secondary_type,
        text: watermark_secondary_text,
        imageUrl: watermark_secondary_image_url,
        opacity: watermark_secondary_opacity,
        size: watermark_secondary_size,
        rotation: watermark_secondary_rotation,
        position: watermark_secondary_position as WatermarkPosition,
        repeatGap: 150,
        textColor: '#666666',
        fontSize: 36,
        fontFamily: 'Traditional Arabic',
        isSecondary: true,
      })
    : '';

  // Watermark CSS
  const watermarkCSS = watermark_enabled ? `
    .watermark-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 50;
      overflow: hidden;
    }

    .watermark-single {
      position: absolute;
      white-space: nowrap;
      user-select: none;
    }

    .watermark-single--center {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(${watermark_rotation}deg) scale(${watermark_size / 100});
    }

    .watermark-single--top {
      top: 20%;
      left: 50%;
      transform: translateX(-50%) rotate(${watermark_rotation}deg) scale(${watermark_size / 100});
    }

    .watermark-single--bottom {
      bottom: 20%;
      left: 50%;
      transform: translateX(-50%) rotate(${watermark_rotation}deg) scale(${watermark_size / 100});
    }

    .watermark-repeat {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-content: center;
      gap: ${watermark_repeat_gap}px;
    }

    .watermark-repeat-item {
      transform: rotate(${watermark_rotation}deg) scale(${(watermark_size / 100) * 0.7});
      white-space: nowrap;
    }

    @media print {
      .watermark-container {
        position: fixed;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  ` : '';

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${title || 'طباعة'}</title>
      <style>
        @page {
          size: A4;
          margin: ${margin_top_mm}mm ${margin_left_mm}mm ${margin_bottom_mm}mm ${margin_right_mm}mm;
        }

        ${pageNumberCSS}

        ${watermarkCSS}

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body {
          width: 100%;
          height: 100%;
        }

        body {
          font-family: 'Times New Roman', 'Traditional Arabic', serif;
          direction: rtl;
          color: ${text_color};
          font-size: 14px;
          line-height: 1.8;
          background: white;
        }

        .letterhead-header {
          position: fixed;
          top: -${margin_top_mm}mm;
          left: -${margin_left_mm}mm;
          right: -${margin_right_mm}mm;
          width: 210mm;
          height: ${type === 'image' ? header_height_mm : 40}mm;
          z-index: 100;
        }

        .letterhead-footer {
          position: fixed;
          bottom: -${margin_bottom_mm}mm;
          left: -${margin_left_mm}mm;
          right: -${margin_right_mm}mm;
          width: 210mm;
          height: ${type === 'image' ? footer_height_mm : 25}mm;
          z-index: 100;
        }

        .content {
          padding-top: ${contentMarginTop}mm;
          padding-bottom: ${contentMarginBottom}mm;
          padding-right: ${margin_right_mm}mm;
          padding-left: ${margin_left_mm}mm;
          margin-right: -${margin_right_mm}mm;
          margin-left: -${margin_left_mm}mm;
        }

        /* Content styles */
        h1, h2, h3 {
          margin-bottom: 16px;
          font-weight: bold;
          color: ${secondary_color};
        }
        h1 { font-size: 22px; }
        h2 { font-size: 18px; margin-top: 24px; }
        h3 { font-size: 16px; margin-top: 20px; }

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

        table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }

        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: right;
        }

        th {
          background-color: #f5f5f5;
        }

        /* Dynamic header styles */
        .header-container {
          display: flex;
          align-items: center;
          padding: 10px 0;
          height: 100%;
        }

        .header-container.logo-right {
          flex-direction: row;
        }

        .header-container.logo-center {
          flex-direction: column;
          text-align: center;
        }

        .header-container.logo-left {
          flex-direction: row-reverse;
        }

        .header-logo {
          flex-shrink: 0;
        }

        .header-info {
          flex: 1;
          padding: 0 15px;
        }

        .header-info h1 {
          font-size: 20px;
          color: ${primary_color};
          margin: 0 0 4px 0;
        }

        .header-info p {
          font-size: 12px;
          margin: 2px 0;
          text-align: inherit;
        }

        .header-border {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: ${border_color};
        }

        /* Dynamic footer styles */
        .footer-container {
          border-top: 1px solid ${border_color};
          padding-top: 8px;
          text-align: center;
          font-size: 10px;
          color: ${text_color};
        }

        .footer-contact {
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .footer-contact span {
          white-space: nowrap;
        }

        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .letterhead-header,
          .letterhead-footer {
            position: fixed;
          }
        }
      </style>
    </head>
    <body>
      ${headerHTML}

      ${watermarkHTML}
      ${secondaryWatermarkHTML}

      <div class="content">
        ${content}
      </div>

      ${footerHTML}
    </body>
    </html>
  `;
}

/**
 * Build image-based header
 */
function buildImageHeader(imageUrl: string | null | undefined, height: number): string {
  if (!imageUrl) return '';

  return `
    <div class="letterhead-header">
      <img
        src="${imageUrl}"
        alt="Header"
        style="width: 210mm; height: ${height}mm; object-fit: fill; display: block;"
      />
    </div>
  `;
}

/**
 * Build image-based footer
 */
function buildImageFooter(imageUrl: string | null | undefined, height: number): string {
  if (!imageUrl) return '';

  return `
    <div class="letterhead-footer">
      <img
        src="${imageUrl}"
        alt="Footer"
        style="width: 210mm; height: ${height}mm; object-fit: fill; display: block;"
      />
    </div>
  `;
}

/**
 * Build dynamic header
 */
function buildDynamicHeader(config: {
  logo_url?: string | null;
  logo_position?: string;
  logo_width_px?: number;
  company_name?: string | null;
  company_name_en?: string | null;
  header_text?: string | null;
  show_border_bottom?: boolean;
  border_color?: string;
  primary_color?: string;
  secondary_color?: string;
  text_color?: string;
}): string {
  const {
    logo_url,
    logo_position = 'right',
    logo_width_px = 80,
    company_name,
    company_name_en,
    header_text,
    show_border_bottom = true,
    border_color = '#C5A059',
    primary_color = '#C5A059',
  } = config;

  const hasContent = logo_url || company_name || company_name_en || header_text;
  if (!hasContent) return '';

  return `
    <div class="letterhead-header">
      <div class="header-container logo-${logo_position}">
        ${logo_url ? `
          <div class="header-logo">
            <img src="${logo_url}" alt="Logo" style="width: ${logo_width_px}px; height: auto;" />
          </div>
        ` : ''}
        <div class="header-info" style="${logo_position === 'center' ? 'text-align: center;' : ''}">
          ${company_name ? `<h1 style="color: ${primary_color};">${company_name}</h1>` : ''}
          ${company_name_en ? `<p style="font-size: 14px; color: #666;">${company_name_en}</p>` : ''}
          ${header_text ? `<p style="white-space: pre-line; font-size: 11px;">${header_text}</p>` : ''}
        </div>
      </div>
      ${show_border_bottom ? `<div class="header-border" style="background: ${border_color};"></div>` : ''}
    </div>
  `;
}

/**
 * Build dynamic footer
 */
function buildDynamicFooter(config: {
  footer_text?: string | null;
  footer_phone?: string | null;
  footer_email?: string | null;
  footer_website?: string | null;
  footer_address?: string | null;
  border_color?: string;
  text_color?: string;
}): string {
  const {
    footer_text,
    footer_phone,
    footer_email,
    footer_website,
    footer_address,
  } = config;

  const hasContent = footer_text || footer_phone || footer_email || footer_website || footer_address;
  if (!hasContent) return '';

  return `
    <div class="letterhead-footer">
      <div class="footer-container">
        ${footer_text ? `<p style="margin-bottom: 6px;">${footer_text}</p>` : ''}
        <div class="footer-contact">
          ${footer_phone ? `<span>هاتف: ${footer_phone}</span>` : ''}
          ${footer_email ? `<span>بريد: ${footer_email}</span>` : ''}
          ${footer_website ? `<span>${footer_website}</span>` : ''}
        </div>
        ${footer_address ? `<p style="margin-top: 6px;">${footer_address}</p>` : ''}
      </div>
    </div>
  `;
}

/**
 * Build watermark HTML
 */
function buildWatermarkHTML(config: {
  type: 'text' | 'image';
  text: string | null;
  imageUrl: string | null;
  opacity: number;
  size: number;
  rotation: number;
  position: 'center' | 'top' | 'bottom' | 'repeat';
  repeatGap: number;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  isSecondary?: boolean;
}): string {
  const {
    type,
    text,
    imageUrl,
    opacity,
    size,
    rotation,
    position,
    repeatGap,
    textColor,
    fontSize,
    fontFamily,
    isSecondary = false,
  } = config;

  // Don't render if no content
  if (type === 'text' && !text) return '';
  if (type === 'image' && !imageUrl) return '';

  const contentStyle = `
    opacity: ${opacity / 100};
    font-family: '${fontFamily}', serif;
    font-size: ${fontSize}px;
    font-weight: bold;
    color: ${textColor};
  `;

  const content = type === 'text'
    ? `<span style="${contentStyle}">${text}</span>`
    : `<img src="${imageUrl}" alt="watermark" style="opacity: ${opacity / 100}; max-width: ${size * 2}px; height: auto;" />`;

  const containerId = isSecondary ? 'watermark-secondary' : 'watermark-primary';

  if (position === 'repeat') {
    // Generate repeated pattern
    const repeatCount = 12;
    const items = Array(repeatCount)
      .fill(null)
      .map(() => `<span class="watermark-repeat-item" style="${contentStyle}">${type === 'text' ? text : `<img src="${imageUrl}" alt="wm" style="height: 40px;" />`}</span>`)
      .join('');

    return `
      <div class="watermark-container" id="${containerId}">
        <div class="watermark-repeat" style="gap: ${repeatGap}px;">
          ${items}
        </div>
      </div>
    `;
  }

  // Single watermark with position class
  return `
    <div class="watermark-container" id="${containerId}">
      <div class="watermark-single watermark-single--${position}">
        ${content}
      </div>
    </div>
  `;
}

/**
 * Generate print-ready HTML without letterhead (legacy support)
 */
export function generatePrintHTML(
  content: string,
  title?: string,
  contractNumber?: string
): string {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${title || 'طباعة'}${contractNumber ? ` - ${contractNumber}` : ''}</title>
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
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="contract-container">
        ${content}
      </div>
    </body>
    </html>
  `;
}
