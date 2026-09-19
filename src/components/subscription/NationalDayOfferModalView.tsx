import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import type { NationalDayOfferMode, NationalDayOfferPlan } from './NationalDayOfferCard';
import '../../styles/snd96-offer-modal.css';

/**
 * الجزء المرئي من نافذة «عرض اليوم الوطني ٩٦» — بلا أي جلب أو حفظ، فتُعاين بلا باك.
 * النصّ يتبع حالة المشترك: جديد/منتهٍ ⇒ اشترك · شهري ⇒ رقِّ · سنوي ⇒ مدّد سنة إضافية.
 * الإغلاق بأي طريقة (X، «ليس الآن»، Esc، الخلفية) = لا تظهر مرّة أخرى — بطلب المالك.
 */
interface Props {
  offer: NationalDayOfferPlan;
  mode: NationalDayOfferMode;
  currentEndsAt?: string | null;
  /** السعر المرجعي المشطوب (الشهري ×١٢) */
  compareAt?: number;
  submitting: boolean;
  error?: string | null;
  onSubscribe: () => void;
  onDismiss: () => void;
  onOpenSubscriptionPage: () => void;
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

const COPY: Record<NationalDayOfferMode, { headline: string; button: string }> = {
  new: { headline: 'اشترك الآن بسعر اليوم الوطني', button: 'اشترك الآن' },
  upgrade: { headline: 'رقِّ اشتراكك الشهري إلى سنة كاملة', button: 'ترقية للسنوي بسعر العرض' },
  extend: { headline: 'مدّد اشتراكك سنة إضافية', button: 'تمديد سنة إضافية' },
};

const NationalDayOfferModalView: React.FC<Props> = ({
  offer, mode, currentEndsAt, compareAt, submitting, error, onSubscribe, onDismiss, onOpenSubscriptionPage,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const priceStr = fmt(offer.price);
  const highlight = priceStr.endsWith('96');
  const head = highlight ? priceStr.slice(0, -2) : priceStr;
  const tail = highlight ? '96' : '';
  const saving = compareAt && compareAt > offer.price ? compareAt - offer.price : 0;
  const endsAt = currentEndsAt ? new Date(currentEndsAt).toLocaleDateString('ar-SA') : null;
  const copy = COPY[mode];

  /* Esc للإغلاق + حبس التركيز + منع تمرير الخلفية */
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
        return;
      }
      if (e.key !== 'Tab' || !cardRef.current) return;
      const focusables = cardRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onDismiss]);

  return (
    <AnimatePresence>
      <div className="snd96m-overlay" role="dialog" aria-modal="true" aria-labelledby="snd96m-title" dir="rtl">
        <motion.div
          className="snd96m-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        />

        <motion.div
          ref={cardRef}
          className="snd96m-card"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
        >
          <div className="snd96m-strip" />

          <button type="button" className="snd96m-close" onClick={onDismiss} aria-label="إغلاق ولا تُظهر مرة أخرى">
            <X size={18} />
          </button>

          <div className="snd96m-body">
            <img
              className="snd96m-logo"
              src="/snd96/snd96-logo-v.svg"
              alt="عزّنا بطبعنا — اليوم الوطني السعودي ٩٦"
            />
            <div className="snd96m-diamonds" aria-hidden="true">
              <i /><i /><i /><i /><i /><i /><i />
            </div>

            <div className="snd96m-head">
              <span className="snd96m-num">96</span>
              <div>
                <div className="snd96m-kicker">{offer.name}</div>
                <div className="snd96m-kicker-en">National Day Offer</div>
              </div>
            </div>

            <h2 className="snd96m-title" id="snd96m-title">{copy.headline}</h2>

            <div className="snd96m-price">
              <span className="snd96m-amount" dir="ltr">{head}{tail && <b>{tail}</b>}</span>
              <span className="snd96m-cur">ر.س</span>
              <span className="snd96m-per">{offer.period_label || '/سنة'}</span>
            </div>
            {saving > 0 && (
              <div className="snd96m-was">
                بدلاً من <s dir="ltr">{fmt(compareAt!)}</s> ر.س
                <span className="snd96m-sep">|</span>
                <b>توفير <span dir="ltr">{fmt(saving)}</span> ر.س</b>
              </div>
            )}

            <p className="snd96m-mode">
              {mode === 'extend'
                ? <>سنة كاملة تُضاف بعد نهاية اشتراكك الحالي{endsAt ? <> في <b>{endsAt}</b></> : ''}، بسعر العرض. مرّة واحدة فقط.</>
                : mode === 'upgrade'
                  ? <>سنة كاملة بكل مزايا النظام تبدأ من تاريخ السداد، ويُغلق اشتراكك الشهري.</>
                  : <>اشتراك سنوي كامل بكل مزايا النظام، يبدأ من تاريخ السداد.</>}
            </p>

            {error && <div className="snd96m-error" role="alert">{error}</div>}

            <button type="button" className="snd96m-btn" onClick={onSubscribe} disabled={submitting}>
              {submitting
                ? <><Loader2 className="animate-spin" size={18} /> جاري تحويلك إلى الدفع...</>
                : <>{copy.button} - {priceStr} ر.س</>}
            </button>

            <div className="snd96m-foot">
              <button type="button" className="snd96m-link" onClick={onDismiss}>ليس الآن</button>
              <span className="snd96m-dot" aria-hidden="true">◆</span>
              <button type="button" className="snd96m-link" onClick={onOpenSubscriptionPage}>التفاصيل في صفحة الاشتراك</button>
            </div>
            {offer.note ? <div className="snd96m-note">{offer.note}</div> : null}
          </div>

          <div className="snd96m-strip snd96m-strip--bottom" />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default NationalDayOfferModalView;
