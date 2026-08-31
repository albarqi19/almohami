/**
 * المذكّرةُ النهائية — الوثيقةُ المركّبةُ كاملةً كما ستُودَع.
 *
 * 🔑 التركيبُ خادميٌّ (GET /final): البسملةُ أوّلَها، ثم الجهةُ والعنوان والصفة،
 * ثم الأقسامُ بترتيبها الشرعيّ (الشكليُّ قبل الموضوعيّ والطلباتُ آخِراً)، ثم
 * الخاتمة. الواجهةُ ترسم ولا تؤلّف — فما يُصدَّر هو نفسُه ما يُرى، حرفاً بحرف.
 *
 * 🩸 وما لم يُستكمل يُعرض فوق الورقة لا مدفوناً فيها — محامٍ يوقّع على
 * «[يُستكمل: الدائرة]» دون أن يراه أولى به أن يراه أحمرَ قبل التوقيع.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, PenLine } from 'lucide-react';
import type { FinalMemo } from '../../services/draftRoomService';

interface Props {
  final: FinalMemo | null;
  loading: boolean;
  onAskEdit: () => void;
}

export default function FinalMemoView({ final, loading, onAskEdit }: Props) {
  const reduced = useReducedMotion();

  if (loading) {
    return (
      <div className="dr-final">
        <div className="dr-final__sheet dr-final__sheet--skeleton" aria-label="تُركَّب المذكّرة">
          <span className="dr-skel dr-skel--basmala" />
          <span className="dr-skel" style={{ width: '55%' }} />
          <span className="dr-skel" style={{ width: '82%' }} />
          <span className="dr-skel" style={{ width: '92%' }} />
          <span className="dr-skel" style={{ width: '78%' }} />
          <span className="dr-skel" style={{ width: '88%' }} />
        </div>
      </div>
    );
  }

  if (!final || final.sections_count === 0) {
    return (
      <div className="dr-final">
        <div className="dr-empty">
          <span className="dr-empty__title">لا مذكّرةَ بعد</span>
          <p className="dr-empty__hint">
            المذكّرةُ النهائية تُركَّب من الأقسام المصوغة في المحادثة — ولم يُصَغ قسمٌ بعد.
          </p>
          <button type="button" className="dr-btn dr-btn--primary" onClick={onAskEdit}>
            <PenLine size={14} aria-hidden /> اطلب الصياغةَ من الوكيل
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dr-final">
      {final.missing.length > 0 && (
        <div className="dr-final__missing" role="note">
          <AlertTriangle size={14} aria-hidden />
          <span>قبل الإيداع: {final.missing.join(' · ')}</span>
        </div>
      )}

      <motion.article
        className="dr-final__sheet"
        dir="rtl"
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        // المتنُ نُظّف خادمياً عند التركيب — لا يُنظَّف هنا ثانيةً
        dangerouslySetInnerHTML={{ __html: final.html }}
      />
    </div>
  );
}
