import React from 'react';
import { PartyPopper } from 'lucide-react';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

interface Props {
  onClick: () => void;
}

/**
 * زر صغير بجانب OutcomeBadge — يفتح WinCelebrationModal مرة ثانية بـ state-only
 * (بدون استدعاء API). للحالة: "أغلقت بالخطأ" أو الرغبة في رؤية الاحتفال مجدداً.
 */
const ReplayCelebrationButton: React.FC<Props> = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="replay-celebration-btn"
      title="عرض التهنئة مرة أخرى"
      aria-label="عرض التهنئة مرة أخرى"
    >
      <PartyPopper size={14} />
    </button>
  );
};

export default ReplayCelebrationButton;
