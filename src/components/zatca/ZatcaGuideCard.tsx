// === بطاقة دليل المستخدم ===
import React, { useState } from 'react';
import { BookOpen, QrCode, ChevronDown } from 'lucide-react';

const ZatcaGuideCard: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="zatca-card">
      <div className="zatca-card__head">
        <div className="zatca-card__icon zatca-card__icon--gold"><QrCode size={20} /></div>
        <h3 className="zatca-card__title">الفوترة الإلكترونية</h3>
      </div>

      <div className="zatca-card__body">
        <p className="zatca-card__desc">
          نظام الفوترة الإلكترونية متوافق مع متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA). تُرسَل فواتيرك القياسية
          للاعتماد (Clearance) والمبسّطة للتبليغ (Reporting) تلقائياً، مع توليد رمز QR ومستند موقّع لكل فاتورة.
        </p>

        {open ? (
          <div className="zatca-card__desc" style={{ borderTop: '1px solid var(--quiet-gray-200)', paddingTop: 10, marginTop: 4 }}>
            <ul style={{ margin: 0, paddingInlineStart: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>أنشئ الفاتورة كالمعتاد؛ الفواتير المؤهّلة تُرسَل إلى ZATCA تلقائياً عند اعتمادها.</li>
              <li>«مُعتمدة» تعني قبول الفاتورة القياسية، و«مُبلّغة» تعني تبليغ الفاتورة المبسّطة.</li>
              <li>يمكنك تنزيل XML/PDF وعرض رمز QR من إجراءات الفاتورة.</li>
              <li>عند الرفض، راجع سبب الرفض وأصدر إشعاراً دائناً/مديناً للتصحيح (لا إعادة إرسال للمرفوضة).</li>
            </ul>
          </div>
        ) : null}
      </div>

      <div className="zatca-card__actions">
        <button type="button" className="zatca-btn zatca-btn--ghost" onClick={() => setOpen((o) => !o)}>
          <BookOpen size={15} /> دليل المستخدم
          <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>
      </div>
    </div>
  );
};

export default ZatcaGuideCard;
