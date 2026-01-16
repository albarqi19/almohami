import React from 'react';
import { X, Printer, FileText } from 'lucide-react';
import type { Letterhead } from '../../types/letterhead';
import { generateLetterheadHTML } from '../../utils/letterheadPrint';

interface LetterheadPreviewProps {
  letterhead: Letterhead;
  onClose: () => void;
}

const LetterheadPreview: React.FC<LetterheadPreviewProps> = ({
  letterhead,
  onClose,
}) => {
  // Sample content for preview
  const sampleContent = `
    <h1 style="text-align: center; margin-bottom: 20px;">عقد اتفاق</h1>
    <p>تم الاتفاق بين الطرفين على ما يلي:</p>
    <p><strong>الطرف الأول:</strong> مكتب المحاماة</p>
    <p><strong>الطرف الثاني:</strong> العميل</p>
    <h2>البند الأول: موضوع العقد</h2>
    <p>يلتزم الطرف الأول بتقديم الخدمات القانونية التالية:</p>
    <ul>
      <li>الترافع أمام المحاكم</li>
      <li>إعداد اللوائح والمذكرات</li>
      <li>تمثيل العميل في الجلسات</li>
    </ul>
    <h2>البند الثاني: الأتعاب</h2>
    <p>اتفق الطرفان على أن تكون أتعاب المحاماة مبلغ وقدره (100,000) ريال سعودي.</p>
    <h2>البند الثالث: مدة العقد</h2>
    <p>يسري هذا العقد لمدة عام واحد من تاريخ التوقيع.</p>
    <p style="margin-top: 40px;"><strong>الطرف الأول:</strong> ________________</p>
    <p><strong>الطرف الثاني:</strong> ________________</p>
    <p style="margin-top: 20px;"><strong>التاريخ:</strong> ___/___/______</p>
  `;

  const handlePrint = () => {
    const html = generateLetterheadHTML(letterhead, sampleContent, 'معاينة الكليشة');
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

  // Build preview HTML for iframe
  const buildPreviewHTML = () => {
    return generateLetterheadHTML(letterhead, sampleContent, 'معاينة الكليشة');
  };

  return (
    <div className="letterhead-modal-overlay">
      <div className="letterhead-modal letterhead-modal--preview">
        {/* Header */}
        <div className="letterhead-modal__header">
          <div>
            <h2 className="letterhead-modal__title">معاينة الكليشة</h2>
            <p className="letterhead-modal__subtitle">{letterhead.name}</p>
          </div>
          <div className="letterhead-modal__actions">
            <button onClick={handlePrint} className="letterhead-btn letterhead-btn--primary">
              <Printer style={{ width: 16, height: 16 }} />
              طباعة تجريبية
            </button>
            <button onClick={onClose} className="letterhead-modal__close">
              <X style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="letterhead-preview-panel">
          <div className="letterhead-preview-frame">
            <iframe
              srcDoc={buildPreviewHTML()}
              title="Letterhead Preview"
            />
          </div>
        </div>

        {/* Info Panel */}
        <div className="letterhead-info-bar">
          <div className="letterhead-info-bar__items">
            <span className="letterhead-info-bar__item">
              النوع: {letterhead.type === 'image' ? 'صورية' : 'ديناميكية'}
            </span>
            <span className="letterhead-info-bar__item">
              الهوامش: {letterhead.margin_top_mm}/{letterhead.margin_bottom_mm}/
              {letterhead.margin_right_mm}/{letterhead.margin_left_mm} مم
            </span>
            {letterhead.show_page_numbers && (
              <span className="letterhead-info-bar__item">
                <FileText style={{ width: 14, height: 14 }} />
                ترقيم: {letterhead.page_number_format === 'arabic' ? 'عربي' : 'إنجليزي'}
              </span>
            )}
          </div>
          <span style={{ color: 'var(--quiet-gray-400)' }}>
            مقاس A4 (210 × 297 مم)
          </span>
        </div>
      </div>
    </div>
  );
};

export default LetterheadPreview;
