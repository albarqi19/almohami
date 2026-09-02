import React, { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

interface Props {
  open: boolean;
  onTry: () => void;
  onLater: () => void;
}

/**
 * نافذة التعريف بالتصميم الجديد لصفحة القضية — تظهر مرة واحدة لكل مستخدم.
 * الإغلاق بالزر أو Esc يُعدّ «البقاء على الحالي» ولا يُعاد السؤال؛ التبديل يبقى
 * متاحاً من زر «التصميم الجديد» في ترويسة الصفحة الحالية.
 */
const CaseStationIntroModal: React.FC<Props> = ({ open, onTry, onLater }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onLater();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onLater]);

  if (!open) return null;

  return (
    <div className="cst-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="cst-intro-title" onClick={(e) => { if (e.target === e.currentTarget) onLater(); }}>
      <div className="cst-modal">
        <div className="cst-modal__head">
          <div>
            <div className="cst-modal__eyebrow">تصميم جديد قيد التجربة</div>
            <h2 id="cst-intro-title" className="cst-modal__title">صفحة القضية بشكل جديد</h2>
          </div>
          <button type="button" className="cst-modal__close" onClick={onLater} aria-label="إغلاق">
            <X size={16} />
          </button>
        </div>
        <div className="cst-modal__body">
          <p>أعدنا ترتيب صفحة تفاصيل القضية لتشبه برنامج عمل مكتبي: كل شيء في شاشة واحدة بلا تمرير طويل.</p>
          <div className="cst-modal__preview">
            <div className="cst-mini">
              <div className="cst-mini__card cst-mini__card--new">
                <b>الخط الإجرائي</b>
                <span>مسار القضية من قيد الدعوى إلى الحكم، والمرحلة الحالية، وأقرب مهلة تلزم المكتب.</span>
              </div>
              <div className="cst-mini__card cst-mini__card--new">
                <b>لوح القراءة</b>
                <span>اختر أي جلسة أو حكم من الخط لتقرأ الضبط والقرار والإفادة المرسلة في مكان واحد.</span>
              </div>
              <div className="cst-mini__card cst-mini__card--new">
                <b>سجلات الملف</b>
                <span>المهام والأطراف والفريق والمستندات والمذكرات والمالية والرسائل في فواصل جانبية.</span>
              </div>
              <div className="cst-mini__card">
                <b>الرجوع في أي وقت</b>
                <span>زر «التصميم السابق» في شريط الحالة أسفل الصفحة يعيدك للشكل الحالي فوراً.</span>
              </div>
            </div>
          </div>
          <p className="cst-hint">
            <Sparkles size={12} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
            رأيك يهمنا: ستجد زر تقييم صغيراً أسفل الصفحة الجديدة.
          </p>
        </div>
        <div className="cst-modal__foot">
          <button type="button" className="cst-btn cst-btn--primary" onClick={onTry}>تجربة التصميم الجديد</button>
          <button type="button" className="cst-btn" onClick={onLater}>البقاء على الحالي</button>
        </div>
      </div>
    </div>
  );
};

export default CaseStationIntroModal;
