import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../utils/api';
import type { NationalDayOfferMode, NationalDayOfferPlan } from './NationalDayOfferCard';
import NationalDayOfferModalView from './NationalDayOfferModalView';

/**
 * نافذة «عرض اليوم الوطني ٩٦» في وسط الشاشة — لمالك المكتب وحده.
 *
 * تظهر ما دام العرض مشغَّلاً من الفيلمنت (`plans.national_day`) والمالكُ مؤهَّلاً
 * (`available_options.can_subscribe_national_day`)، وتقول له ما يخصّه: مشترك سنوي ⇒
 * مدّد · شهري ⇒ رقِّ · تجريبي أو منتهٍ ⇒ اشترك. الزرّ يحوّله إلى الدفع مباشرة بنفس
 * مسار الباقات. الإغلاق بأي طريقة = لا تظهر له مرّة أخرى (بطلب المالك) — يُحفظ في
 * المتصفّح لكل مستخدم؛ والمربع في صفحة الاشتراك يبقى متاحاً دائماً.
 *
 * لا تظهر على صفحات الاشتراك والدفع نفسها (المربع هناك)، ولا لمن مُدِّد من قبل.
 */

const SHOW_DELAY_MS = 2000;
const OFFER_KEY = 'national_day_96';
const dismissKey = (userId: number | string) => `snd96_offer_modal_dismissed:${OFFER_KEY}:${userId}`;
const SESSION_KEY = `snd96_offer_modal_checked:${OFFER_KEY}`;
const QUIET_PATHS = ['/settings', '/subscription', '/account-status'];

const readFlag = (storage: Storage, key: string): boolean => {
  try { return storage.getItem(key) === '1'; } catch { return false; }
};
const writeFlag = (storage: Storage, key: string) => {
  try { storage.setItem(key, '1'); } catch { /* ignore */ }
};

interface OfferState {
  offer: NationalDayOfferPlan;
  mode: NationalDayOfferMode;
  currentEndsAt: string | null;
  compareAt: number;
}

const NationalDayOfferModal: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [state, setState] = useState<OfferState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id;
  const isOwner = !!user?.is_tenant_owner;
  const quietPath = QUIET_PATHS.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (!isOwner || !userId || quietPath) return;
    if (readFlag(localStorage, dismissKey(userId))) return;
    if (readFlag(sessionStorage, SESSION_KEY)) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const plans: any = await apiClient.get('/subscription/plans');
        const offer: NationalDayOfferPlan | null = plans?.data?.plans?.national_day ?? null;
        // جوابٌ نهائيّ لهذه الجلسة (مطفأ / غير مؤهَّل / عُرضت): لا تُعاد الطلبات مع كل تنقّل.
        // أمّا الفشل (429، انقطاع) فلا يُعلَّم — إعادةُ تحميل الصفحة تعيد المحاولة.
        writeFlag(sessionStorage, SESSION_KEY);
        if (!offer) return; // العرض مطفأ

        const current: any = await apiClient.get('/subscription/current');
        const options = current?.data?.available_options;
        const mode = options?.national_day_mode as NationalDayOfferMode | 'done' | null | undefined;
        if (cancelled || !options?.can_subscribe_national_day || !mode || mode === 'done') return;

        setState({
          offer,
          mode,
          currentEndsAt: current?.data?.subscription?.renews_at ?? null,
          compareAt: Number(plans?.data?.plans?.monthly?.price ?? 0) * 12,
        });
      } catch {
        // لا نافذةَ عند أي خلل — الصفحة لا تتأثّر، والمحاولة تعود مع التحميل التالي
      }
    }, SHOW_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOwner, userId, quietPath]);

  const dismiss = useCallback(() => {
    if (userId) writeFlag(localStorage, dismissKey(userId));
    setState(null);
  }, [userId]);

  const openSubscriptionPage = useCallback(() => {
    dismiss();
    navigate('/settings#subscription');
  }, [dismiss, navigate]);

  const subscribe = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response: any = await apiClient.post('/subscription/subscribe', {
        plan: 'national_day',
        payment_method: 'online',
        payment_gateway: 'streampay',
      });
      if (response?.success && response?.data?.payment_url) {
        window.location.href = response.data.payment_url;
        return;
      }
      setError(response?.message || 'تعذّر إنشاء رابط الدفع، جرّب من صفحة الاشتراك');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'تعذّر إنشاء رابط الدفع، جرّب من صفحة الاشتراك');
    } finally {
      setSubmitting(false);
    }
  }, []);

  if (!state) return null;

  return (
    <NationalDayOfferModalView
      offer={state.offer}
      mode={state.mode}
      currentEndsAt={state.currentEndsAt}
      compareAt={state.compareAt}
      submitting={submitting}
      error={error}
      onSubscribe={subscribe}
      onDismiss={dismiss}
      onOpenSubscriptionPage={openSubscriptionPage}
    />
  );
};

export default NationalDayOfferModal;
