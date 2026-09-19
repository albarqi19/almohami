import React from 'react';
import { Loader2 } from 'lucide-react';
import '../../styles/snd96-offer.css';

/**
 * مربع «عرض اليوم الوطني ٩٦» — الباقة السنوية نفسها بهويّة «عزّنا بطبعنا».
 *
 * يظهر ما دام العرض مشغَّلاً من الفيلمنت (`plans.national_day` غير null). للمشترك
 * السنوي الحالي يعرض «سنة إضافية تُضاف بعد نهاية اشتراكك» (mode = extend) لأن
 * الباقة السنوية لا تقبل الشراء فوق اشتراكٍ نشط — العرضُ وحده يفتح ذلك، ولمرّة واحدة.
 * ألوان دليل الهويّة: خلفية #002528، مربعات #00343a، أخضر #00894a، ليموني #6ab523.
 */
export interface NationalDayOfferPlan {
  key: string;
  name: string;
  tagline?: string;
  price: number;
  price_with_tax?: number;
  period_label?: string;
  regular_price?: number;
  note?: string | null;
}

export type NationalDayOfferMode = 'new' | 'upgrade' | 'extend';

interface Props {
  offer: NationalDayOfferPlan;
  /** new: تجريبي/منتهٍ · upgrade: مشترك شهري نشط · extend: مشترك سنوي نشط (سنة إضافية واحدة) */
  mode: NationalDayOfferMode;
  /** نهاية الاشتراك الحالي (ISO) — يُعرض في وضع التمديد */
  currentEndsAt?: string | null;
  /** السعر المرجعي المشطوب (الشهري ×١٢ كما في مربع الباقة السنوية) */
  compareAt?: number;
  subscribing: boolean;
  onSubscribe: () => void;
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

const NationalDayOfferCard: React.FC<Props> = ({ offer, mode, currentEndsAt, compareAt, subscribing, onSubscribe }) => {
  const priceStr = fmt(offer.price);
  // «96» في آخر السعر تُبرَز بالأخضر كما في حملة العرض (2,9|96)
  const highlight = priceStr.endsWith('96');
  const head = highlight ? priceStr.slice(0, -2) : priceStr;
  const tail = highlight ? '96' : '';
  const saving = compareAt && compareAt > offer.price ? compareAt - offer.price : 0;
  const endsAt = currentEndsAt ? new Date(currentEndsAt).toLocaleDateString('ar-SA') : null;

  return (
    <section className="snd96-card" dir="rtl" aria-label={offer.name}>
      <div className="snd96-card__strip" />
      <div className="snd96-card__inner">
        <div className="snd96-card__logo-wrap">
          <img
            className="snd96-card__logo"
            src="/snd96/snd96-logo-h.svg"
            alt="عزّنا بطبعنا — اليوم الوطني السعودي ٩٦"
          />
        </div>

        <div className="snd96-card__row">
          <div className="snd96-card__head">
            <span className="snd96-card__num">96</span>
            <div>
              <div className="snd96-card__title">{offer.name}</div>
              <div className="snd96-card__sub">National Day Offer</div>
            </div>
          </div>

          <div className="snd96-card__price">
            <span className="snd96-card__amount" dir="ltr">
              {head}
              {tail && <b>{tail}</b>}
            </span>
            <span className="snd96-card__cur">ر.س</span>
            <span className="snd96-card__per">{offer.period_label || '/سنة'}</span>
          </div>
        </div>

        {saving > 0 && (
          <div className="snd96-card__was">
            بدلاً من <s dir="ltr">{fmt(compareAt!)}</s> ر.س
            <span className="snd96-card__sep">|</span>
            <b>توفير <span dir="ltr">{fmt(saving)}</span> ر.س</b>
          </div>
        )}

        <div className="snd96-card__mode">
          {mode === 'extend'
            ? <>سنة إضافية واحدة تُضاف بعد نهاية اشتراكك الحالي{endsAt ? <> في <b>{endsAt}</b></> : ''}، بسعر العرض.</>
            : mode === 'upgrade'
              ? <>ترقية من الاشتراك الشهري إلى <b>سنة كاملة</b> بسعر العرض، تبدأ من تاريخ السداد ويُغلق اشتراكك الشهري.</>
              : <>اشتراك سنوي كامل بكل مزايا النظام، يبدأ من تاريخ السداد.</>}
        </div>

        <button
          type="button"
          className="snd96-card__btn"
          onClick={onSubscribe}
          disabled={subscribing}
        >
          {subscribing ? (
            <><Loader2 className="animate-spin" size={18} /> جاري إنشاء رابط الدفع...</>
          ) : mode === 'extend' ? (
            <>تمديد سنة إضافية - {priceStr} ر.س</>
          ) : mode === 'upgrade' ? (
            <>ترقية للسنوي بسعر العرض - {priceStr} ر.س</>
          ) : (
            <>الدفع الإلكتروني - {priceStr} ر.س</>
          )}
        </button>

        {offer.note ? <div className="snd96-card__note">{offer.note}</div> : null}
      </div>
      <div className="snd96-card__strip snd96-card__strip--bottom" />
    </section>
  );
};

export default NationalDayOfferCard;
