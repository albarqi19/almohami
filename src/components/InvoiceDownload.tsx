import React from 'react';

// معلومات المؤسسة الثابتة
export const COMPANY_INFO = {
  name: 'مؤسسة رائد الحلول الرقمية',
  commercialRegister: '7052657371',
  phone: '0530996778',
  address: 'المملكة العربية السعودية',
};

interface InvoiceData {
  id: number;
  invoice_number: string;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency?: string;
  status: string;
  created_at: string;
  paid_at?: string;
  due_date?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  notes?: string;
}

interface TenantData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export const generateInvoiceHTML = (invoice: InvoiceData, tenant: TenantData): string => {
  const statusText = invoice.status === 'paid' ? 'مدفوعة' : invoice.status === 'pending' ? 'معلقة' : 'ملغاة';
  
  const items = invoice.items || [
    {
      description: 'اشتراك في نظام إدارة مكاتب المحاماة',
      quantity: 1,
      unit_price: invoice.amount,
      total: invoice.amount,
    }
  ];

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة ${invoice.invoice_number}</title>
      <style>
        @page {
          size: A4;
          margin: 10mm;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Times New Roman', serif;
          background: white;
          padding: 15px;
          direction: rtl;
          color: #000;
          font-size: 12px;
          line-height: 1.4;
        }
        .invoice-container {
          max-width: 100%;
          margin: 0 auto;
          background: white;
        }
        .header {
          text-align: center;
          padding-bottom: 10px;
          border-bottom: 2px solid #000;
          margin-bottom: 15px;
        }
        .header h1 {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .header p {
          font-size: 11px;
          margin: 2px 0;
        }
        .invoice-title {
          text-align: center;
          margin: 15px 0;
        }
        .invoice-title h2 {
          font-size: 20px;
          font-weight: bold;
          text-decoration: underline;
        }
        .info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
        }
        .info-box {
          width: 48%;
        }
        .info-box h3 {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 5px;
          padding-bottom: 3px;
          border-bottom: 1px solid #000;
        }
        .info-box p {
          margin: 3px 0;
          font-size: 11px;
        }
        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        .invoice-table th,
        .invoice-table td {
          border: 1px solid #000;
          padding: 6px 8px;
          text-align: right;
          font-size: 11px;
        }
        .invoice-table th {
          background: #f0f0f0;
          font-weight: bold;
        }
        .text-left {
          text-align: left !important;
        }
        .text-center {
          text-align: center !important;
        }
        .totals-section {
          margin-top: 10px;
          margin-right: auto;
          width: 250px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px solid #ccc;
          font-size: 11px;
        }
        .totals-row.total {
          border-bottom: 2px solid #000;
          border-top: 2px solid #000;
          font-weight: bold;
          font-size: 13px;
          padding: 8px 0;
          margin-top: 5px;
        }
        .status-section {
          margin: 10px 0;
          padding: 6px;
          border: 1px solid #000;
          text-align: center;
          font-size: 12px;
        }
        .status-paid {
          background: #e8f5e9;
        }
        .status-pending {
          background: #fff8e1;
        }
        .footer {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #000;
          text-align: center;
        }
        .footer p {
          font-size: 10px;
          margin: 3px 0;
        }
        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 25px;
          padding-top: 10px;
        }
        .signature-box {
          width: 45%;
          text-align: center;
          font-size: 11px;
        }
        .signature-box .line {
          border-top: 1px solid #000;
          margin-top: 30px;
          padding-top: 5px;
        }
        @media print {
          body {
            padding: 10px;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Header -->
        <div class="header">
          <h1>${COMPANY_INFO.name}</h1>
          <p>سجل تجاري: ${COMPANY_INFO.commercialRegister}</p>
          <p>هاتف: ${COMPANY_INFO.phone}</p>
          <p>${COMPANY_INFO.address}</p>
        </div>

        <!-- Invoice Title -->
        <div class="invoice-title">
          <h2>فاتورة ضريبية</h2>
        </div>

        <!-- Info Sections -->
        <div class="info-section">
          <div class="info-box">
            <h3>معلومات العميل</h3>
            <p><strong>الاسم:</strong> ${tenant.name}</p>
            ${tenant.phone ? `<p><strong>الهاتف:</strong> ${tenant.phone}</p>` : ''}
            ${tenant.email ? `<p><strong>البريد:</strong> ${tenant.email}</p>` : ''}
            ${tenant.address ? `<p><strong>العنوان:</strong> ${tenant.address}</p>` : ''}
          </div>
          <div class="info-box">
            <h3>بيانات الفاتورة</h3>
            <p><strong>رقم الفاتورة:</strong> ${invoice.invoice_number}</p>
            <p><strong>تاريخ الإصدار:</strong> ${new Date(invoice.created_at).toLocaleDateString('ar-SA')}</p>
            ${invoice.due_date ? `<p><strong>تاريخ الاستحقاق:</strong> ${new Date(invoice.due_date).toLocaleDateString('ar-SA')}</p>` : ''}
            ${invoice.paid_at ? `<p><strong>تاريخ السداد:</strong> ${new Date(invoice.paid_at).toLocaleDateString('ar-SA')}</p>` : ''}
          </div>
        </div>

        <!-- Items Table -->
        <table class="invoice-table">
          <thead>
            <tr>
              <th class="text-center" style="width: 50px;">م</th>
              <th>البيان</th>
              <th class="text-center" style="width: 80px;">الكمية</th>
              <th class="text-left" style="width: 120px;">السعر</th>
              <th class="text-left" style="width: 120px;">المجموع</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, index) => `
              <tr>
                <td class="text-center">${index + 1}</td>
                <td>${item.description}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-left">${Number(item.unit_price || 0).toFixed(2)} ر.س</td>
                <td class="text-left">${Number(item.total || 0).toFixed(2)} ر.س</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals -->
        <div class="totals-section">
          <div class="totals-row">
            <span>المجموع الفرعي:</span>
            <span>${Number(invoice.amount).toFixed(2)} ر.س</span>
          </div>
          <div class="totals-row">
            <span>ضريبة القيمة المضافة (${invoice.tax_rate || 15}%):</span>
            <span>${Number(invoice.tax_amount || 0).toFixed(2)} ر.س</span>
          </div>
          <div class="totals-row total">
            <span>الإجمالي المستحق:</span>
            <span>${Number(invoice.total_amount).toFixed(2)} ر.س</span>
          </div>
        </div>

        <!-- Status -->
        <div class="status-section ${invoice.status === 'paid' ? 'status-paid' : 'status-pending'}">
          <strong>حالة الفاتورة: ${statusText}</strong>
        </div>

        ${invoice.notes ? `
          <div style="margin: 20px 0; padding: 10px; border: 1px dashed #999;">
            <strong>ملاحظات:</strong> ${invoice.notes}
          </div>
        ` : ''}

        <!-- Signature Section -->
        <div class="signature-section">
          <div class="signature-box">
            <div class="line">توقيع المستلم</div>
          </div>
          <div class="signature-box">
            <div class="line">ختم المؤسسة</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>${COMPANY_INFO.name}</p>
          <p>هاتف: ${COMPANY_INFO.phone}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const downloadInvoice = async (invoice: InvoiceData, tenant: TenantData): Promise<void> => {
  const html = generateInvoiceHTML(invoice, tenant);

  // الطباعة عبر iframe مخفي بدل نافذة منبثقة:
  // window.open + document.write لا يُطلق onload بشكل موثوق (خاصة في Chrome)
  // مما يؤدي إلى استدعاء print() قبل رسم المحتوى → صفحة بيضاء فارغة.
  // حدث load الخاص بالـ iframe موثوق، ولا يصطدم بحاصر النوافذ المنبثقة.
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');

  iframe.onload = () => {
    // تأخير بسيط لضمان اكتمال تخطيط المحتوى قبل فتح حوار الطباعة
    setTimeout(() => {
      try {
        const win = iframe.contentWindow;
        if (win) {
          win.focus();
          win.print();
        }
      } finally {
        // أزل الـ iframe بعد انتهاء حوار الطباعة
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 1000);
      }
    }, 300);
  };

  document.body.appendChild(iframe);
  iframe.srcdoc = html;
};

// مكون معاينة الفاتورة (اختياري)
interface InvoicePreviewModalProps {
  invoice: InvoiceData;
  tenant: TenantData;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  invoice,
  tenant,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const html = generateInvoiceHTML(invoice, tenant);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '900px',
          height: '90%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h3 style={{ margin: 0 }}>معاينة الفاتورة - {invoice.invoice_number}</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => downloadInvoice(invoice, tenant)}
              style={{
                background: '#1e3a5f',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              🖨️ طباعة / تحميل PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#f3f4f6',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              إغلاق
            </button>
          </div>
        </div>
        <iframe
          srcDoc={html}
          style={{
            flex: 1,
            border: 'none',
            width: '100%',
          }}
          title="Invoice Preview"
        />
      </div>
    </div>
  );
};

export default { downloadInvoice, generateInvoiceHTML, InvoicePreviewModal, COMPANY_INFO };
