import React, { useEffect, useState } from 'react';
import { Star, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { FeedbackService } from '../../services/feedbackService';

export type FeedbackMode = 'rate' | 'leaving';

interface Props {
  open: boolean;
  mode: FeedbackMode;
  onClose: () => void;
  /** يُستدعى بعد الإرسال الناجح أو بعد التخطي في وضع الرجوع */
  onDone: (result: { submitted: boolean; rating: number | null; body: string }) => void;
}

const LABELS: Record<number, string> = {
  1: 'غير مناسب',
  2: 'يحتاج عملاً كثيراً',
  3: 'مقبول',
  4: 'جيد',
  5: 'ممتاز',
};

/**
 * تقييم التصميم الجديد لصفحة القضية — يُرسَل عبر نظام الملاحظات القائم
 * (POST /feedback) بنوع «اقتراح» وتصنيف «UI» ووسم context=case_station،
 * فيظهر للمالك في لوحة الملاحظات مع باقي المساهمات.
 */
const CaseStationFeedbackModal: React.FC<Props> = ({ open, mode, onClose, onDone }) => {
  const [rating, setRating] = useState<number | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setRating(null);
      setBody('');
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    if (mode === 'rate' && !rating) {
      toast.info('اختر تقييماً من 1 إلى 5 أولاً');
      return;
    }
    setBusy(true);
    try {
      const text = body.trim();
      const title = mode === 'leaving'
        ? 'الرجوع من التصميم الجديد لصفحة القضية'
        : `تقييم التصميم الجديد لصفحة القضية (${rating}/5)`;
      const fallback = mode === 'leaving' ? 'رجع المستخدم إلى التصميم السابق بلا تعليق.' : 'تقييم بلا تعليق إضافي.';
      await FeedbackService.create({
        type: 'suggestion',
        category: 'UI',
        title,
        body: text.length >= 5 ? text : fallback,
        rating: rating ?? undefined,
        context: 'case_station',
      });
      toast.success('شكراً لك، وصل رأيك.');
      onDone({ submitted: true, rating, body: text });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'تعذّر إرسال التقييم');
      setBusy(false);
    }
  };

  const skip = () => onDone({ submitted: false, rating: null, body: '' });

  return (
    <div className="cst-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="cst-fb-title" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cst-modal">
        <div className="cst-modal__head">
          <div>
            <div className="cst-modal__eyebrow">{mode === 'leaving' ? 'قبل الرجوع' : 'رأيك في التصميم الجديد'}</div>
            <h2 id="cst-fb-title" className="cst-modal__title">
              {mode === 'leaving' ? 'ما الذي لم يناسبك في التصميم الجديد؟' : 'كيف تجد صفحة القضية الجديدة؟'}
            </h2>
          </div>
          <button type="button" className="cst-modal__close" onClick={onClose} aria-label="إغلاق">
            <X size={16} />
          </button>
        </div>
        <div className="cst-modal__body">
          <label className="cst-field-label">{mode === 'leaving' ? 'التقييم العام (اختياري)' : 'التقييم العام'}</label>
          <div className="cst-stars" role="radiogroup" aria-label="التقييم من 1 إلى 5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} — ${LABELS[n]}`}
                className={`cst-star-btn ${rating !== null && n <= rating ? 'is-on' : ''}`}
                onClick={() => setRating(n)}
              >
                <Star size={20} fill={rating !== null && n <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          {rating && <div className="cst-hint" style={{ marginTop: -6, marginBottom: 6 }}>{LABELS[rating]}</div>}

          <label className="cst-field-label" htmlFor="cst-fb-body">
            {mode === 'leaving' ? 'ما الذي تفتقده أو أعاق عملك؟' : 'ما الذي أعجبك، وما الذي تريد تغييره؟'}
          </label>
          <textarea
            id="cst-fb-body"
            className="cst-textarea"
            value={body}
            maxLength={2000}
            onChange={(e) => setBody(e.target.value)}
            placeholder={mode === 'leaving' ? 'مثال: أحتاج قائمة الجلسات كاملة في مكان واضح…' : 'مثال: الخط الإجرائي مفيد، لكن أريد الرسائل أوضح…'}
          />
          <div className="cst-hint">يصل التقييم لفريق التطوير مع اسمك ومكتبك عبر صفحة الملاحظات.</div>
        </div>
        <div className="cst-modal__foot">
          <button type="button" className="cst-btn cst-btn--primary" onClick={submit} disabled={busy}>
            {busy ? 'جارٍ الإرسال…' : mode === 'leaving' ? 'إرسال والرجوع للتصميم السابق' : 'إرسال التقييم'}
          </button>
          {mode === 'leaving' ? (
            <button type="button" className="cst-btn" onClick={skip} disabled={busy}>الرجوع بلا تعليق</button>
          ) : (
            <button type="button" className="cst-btn cst-btn--quiet" onClick={onClose} disabled={busy}>لاحقاً</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseStationFeedbackModal;
