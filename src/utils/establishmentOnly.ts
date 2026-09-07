/**
 * «الوضع الحصري» لبوابة المنشأة — قرارٌ واحدٌ تقرؤه الواجهة كلُّها.
 *
 * الحقيقة عند الباك (`client_portal_settings.establishment_only`)، ويصل العلَم
 * في حمولة `/auth/login` و`/auth/me` معاً. وما هنا **راحةُ عرضٍ لا حماية**:
 * الحماية الفعلية ميدلوير `RestrictEstablishmentOnlyClient` الذي يمنع بالافتراض.
 * لو تلاعب أحدٌ بهذا العلَم في المتصفّح لم يزدد وصوله بايتاً واحداً.
 */
import type { User } from '../types';

/** المسار الوحيد الذي يراه العميل الحصري. */
export const ESTABLISHMENT_ONLY_PATH = '/my-establishment';

const STORAGE_KEY = 'establishmentOnly';

export function isEstablishmentOnly(user?: User | null): boolean {
  return user?.establishment_only === true;
}

/**
 * أثرٌ يعبر إعادةَ التحميل الكاملة.
 *
 * فرعُ 401 في `utils/api.ts` ينفّذ `window.location.href = '/login'` — تحميلٌ
 * كاملٌ لا يمرّ براوتر ولا بسياق، فتُفقد معه كلُّ حالة React. وبلا هذا الأثر
 * يهبط العميل الحصري بعد انتهاء جلسته على شاشة دخولٍ تحمل هوية المنتج.
 *
 * كلُّ لمسٍ للتخزين محروسٌ: النوافذ الخاصة وبعض إعدادات المتصفّح ترمي عند
 * مجرّد القراءة، ولا يستحق تفضيلُ عرضٍ كسرَ الصفحة.
 */
export function rememberEstablishmentOnly(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(STORAGE_KEY, '1');
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* تخزين مقفل — تجاهُلٌ مقصود */
  }
}

export function wasEstablishmentOnly(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}
