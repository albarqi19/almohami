import React from 'react';
import { X, Printer, Download, Send } from 'lucide-react';
import type { CaseInvoice } from '../../types/billing';

export interface InvoiceViewProps {
  invoice: CaseInvoice;
  isOpen?: boolean;
  onClose: () => void;
  onSend?: (method: 'email' | 'whatsapp') => void;
  firmInfo?: {
    name: string;
    cr: string;
    license: string;
    phone: string;
    email: string;
    address: string;
    iban: string;
    bank: string;
  };
}

const InvoiceView: React.FC<InvoiceViewProps> = ({
  invoice,
  isOpen = true,
  onClose,
  onSend,
  firmInfo = {
    name: 'مكتب المحاماة',
    cr: '',
    license: '',
    phone: '',
    email: '',
    address: '',
    iban: '',
    bank: '',
  },
}) => {
  if (!isOpen) return null;

  const statusText: Record<string, string> = {
    draft: 'مسودة',
    sent: 'مرسلة',
    pending: 'معلقة',
    partial: 'مدفوعة جزئياً',
    paid: 'مدفوعة',
    overdue: 'متأخرة',
    cancelled: 'ملغية',
    refunded: 'مستردة',
  };

  const statusColor: Record<string, string> = {
    draft: '#6b7280',
    sent: '#3b82f6',
    pending: '#f59e0b',
    partial: '#8b5cf6',
    paid: '#10b981',
    overdue: '#ef4444',
    cancelled: '#6b7280',
    refunded: '#ec4899',
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const generatePrintHTML = () => {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة ${invoice.invoice_number}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Times New Roman', serif;
            background: white;
            padding: 20px;
            direction: rtl;
            color: #000;
            font-size: 13px;
            line-height: 1.5;
          }
          .invoice-container { max-width: 100%; margin: 0 auto; }
          .header {
            text-align: center;
            padding-bottom: 15px;
            border-bottom: 2px solid #000;
            margin-bottom: 20px;
          }
          .header h1 { font-size: 20px; margin-bottom: 8px; }
          .header p { font-size: 12px; margin: 3px 0; }
          .invoice-title {
            text-align: center;
            margin: 20px 0;
          }
          .invoice-title h2 {
            font-size: 22px;
            text-decoration: underline;
          }
          .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .info-box { width: 48%; }
          .info-box h3 {
            font-size: 14px;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #000;
          }
          .info-box p { margin: 4px 0; font-size: 12px; }
          .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .invoice-table th, .invoice-table td {
            border: 1px solid #000;
            padding: 8px 10px;
            text-align: right;
            font-size: 12px;
          }
          .invoice-table th { background: #f0f0f0; font-weight: bold; }
          .text-left { text-align: left !important; }
          .text-center { text-align: center !important; }
          .totals-section {
            margin-top: 15px;
            margin-right: auto;
            width: 280px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid #ccc;
            font-size: 12px;
          }
          .totals-row.total {
            border-bottom: 2px solid #000;
            border-top: 2px solid #000;
            font-weight: bold;
            font-size: 14px;
            padding: 10px 0;
            margin-top: 8px;
          }
          .status-section {
            margin: 15px 0;
            padding: 10px;
            border: 1px solid #000;
            text-align: center;
            font-size: 14px;
          }
          .status-paid { background: #e8f5e9; }
          .status-pending { background: #fff8e1; }
          .status-overdue { background: #ffebee; }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #000;
            text-align: center;
          }
          .footer p { font-size: 11px; margin: 4px 0; }
          .bank-info {
            margin-top: 20px;
            padding: 15px;
            border: 1px solid #000;
            background: #f9f9f9;
          }
          .bank-info h4 { margin-bottom: 10px; font-size: 14px; }
          .bank-info p { font-size: 12px; margin: 4px 0; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <h1>${firmInfo.name}</h1>
            ${firmInfo.cr ? `<p>سجل تجاري: ${firmInfo.cr}</p>` : ''}
            ${firmInfo.license ? `<p>ترخيص رقم: ${firmInfo.license}</p>` : ''}
            ${firmInfo.phone ? `<p>هاتف: ${firmInfo.phone}</p>` : ''}
            ${firmInfo.address ? `<p>${firmInfo.address}</p>` : ''}
          </div>

          <div class="invoice-title">
            <h2>فاتورة ضريبية</h2>
          </div>

          <div class="info-section">
            <div class="info-box">
              <h3>معلومات العميل</h3>
              <p><strong>الاسم:</strong> ${invoice.client?.name || '-'}</p>
              ${invoice.client?.phone ? `<p><strong>الهاتف:</strong> ${invoice.client.phone}</p>` : ''}
              ${invoice.client?.email ? `<p><strong>البريد:</strong> ${invoice.client.email}</p>` : ''}
              ${invoice.client?.address ? `<p><strong>العنوان:</strong> ${invoice.client.address}</p>` : ''}
            </div>
            <div class="info-box">
              <h3>بيانات الفاتورة</h3>
              <p><strong>رقم الفاتورة:</strong> ${invoice.invoice_number}</p>
              <p><strong>تاريخ الإصدار:</strong> ${formatDate(invoice.invoice_date)}</p>
              <p><strong>تاريخ الاستحقاق:</strong> ${formatDate(invoice.due_date)}</p>
              ${invoice.paid_at ? `<p><strong>تاريخ السداد:</strong> ${formatDate(invoice.paid_at)}</p>` : ''}
            </div>
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th class="text-center" style="width: 50px;">م</th>
                <th>البيان</th>
                <th class="text-left" style="width: 120px;">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              ${
                invoice.line_items && invoice.line_items.length > 0
                  ? invoice.line_items
                      .map(
                        (item, index) => `
                <tr>
                  <td class="text-center">${index + 1}</td>
                  <td>${item.description}</td>
                  <td class="text-left">${formatAmount(item.total)} ر.س</td>
                </tr>
              `
                      )
                      .join('')
                  : `
                <tr>
                  <td class="text-center">1</td>
                  <td>${invoice.title}</td>
                  <td class="text-left">${formatAmount(invoice.subtotal)} ر.س</td>
                </tr>
              `
              }
            </tbody>
          </table>

          <div class="totals-section">
            <div class="totals-row">
              <span>المجموع الفرعي:</span>
              <span>${formatAmount(invoice.subtotal)} ر.س</span>
            </div>
            ${
              invoice.discount > 0
                ? `
            <div class="totals-row">
              <span>الخصم:</span>
              <span>- ${formatAmount(invoice.discount)} ر.س</span>
            </div>
            `
                : ''
            }
            <div class="totals-row">
              <span>ضريبة القيمة المضافة (${invoice.vat_rate}%):</span>
              <span>${formatAmount(invoice.vat_amount)} ر.س</span>
            </div>
            <div class="totals-row total">
              <span>الإجمالي المستحق:</span>
              <span>${formatAmount(invoice.total_amount)} ر.س</span>
            </div>
            ${
              invoice.paid_amount > 0
                ? `
            <div class="totals-row">
              <span>المدفوع:</span>
              <span>${formatAmount(invoice.paid_amount)} ر.س</span>
            </div>
            <div class="totals-row" style="color: ${invoice.remaining_amount > 0 ? '#ef4444' : '#10b981'};">
              <span>المتبقي:</span>
              <span>${formatAmount(invoice.remaining_amount)} ر.س</span>
            </div>
            `
                : ''
            }
          </div>

          <div class="status-section ${
            invoice.status === 'paid'
              ? 'status-paid'
              : invoice.status === 'overdue'
              ? 'status-overdue'
              : 'status-pending'
          }">
            <strong>حالة الفاتورة: ${statusText[invoice.status] || invoice.status}</strong>
          </div>

          ${
            firmInfo.iban
              ? `
          <div class="bank-info">
            <h4>معلومات الدفع</h4>
            <p><strong>البنك:</strong> ${firmInfo.bank}</p>
            <p><strong>رقم الآيبان:</strong> ${firmInfo.iban}</p>
            <p><strong>اسم المستفيد:</strong> ${firmInfo.name}</p>
          </div>
          `
              : ''
          }

          ${
            invoice.notes
              ? `
          <div style="margin: 20px 0; padding: 15px; border: 1px dashed #999;">
            <strong>ملاحظات:</strong> ${invoice.notes}
          </div>
          `
              : ''
          }

          <div class="footer">
            <p>${firmInfo.name}</p>
            ${firmInfo.phone ? `<p>هاتف: ${firmInfo.phone}</p>` : ''}
            ${firmInfo.email ? `<p>البريد: ${firmInfo.email}</p>` : ''}
          </div>
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
    a.download = `فاتورة-${invoice.invoice_number}.html`;
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
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              فاتورة رقم {invoice.invoice_number}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span
                style={{
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: statusColor[invoice.status] || '#6b7280',
                  color: 'white',
                }}
              >
                {statusText[invoice.status] || invoice.status}
              </span>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                {invoice.client?.name}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {onSend && (
              <>
                <button
                  onClick={() => onSend('email')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  <Send size={16} />
                  إرسال
                </button>
              </>
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

        {/* محتوى الفاتورة */}
        <iframe
          srcDoc={generatePrintHTML()}
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

export default InvoiceView;
