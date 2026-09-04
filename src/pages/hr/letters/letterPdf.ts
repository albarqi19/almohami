import { toast } from 'react-toastify';

import { API_BASE_URL } from '../../../utils/api';

/**
 * **فتحُ خطابٍ صادرٍ بصيغة PDF — تنفيذٌ واحدٌ يتقاسمه الجدارُ و`/my-hr`.**
 *
 * ══════ لماذا خارج `hrLetterService` ══════
 * `apiClient` يفكّ الردَّ JSON دائماً ولا يعرف `blob`، فمسارُ PDF لا يمرّ به. هذا هو
 * السببُ الذي جعل `ContractsTab:299-343` تنسخ كتلةَ التنزيل من `AdminRequests:51-67`
 * حرفاً بحرف، فانفرد كلُّ سطحٍ برسالته وبسلوكه عند منع النافذة. هنا **دالّةٌ واحدة**:
 * أيُّ تعديلٍ في الترويسات أو في سلوك المتصفّح تعديلُ سطرٍ واحدٍ لا مطاردةُ نسخ.
 *
 * ══════ ما تفعله بالضبط ══════
 * `GET` خام بـ`Authorization` من `localStorage` (لا كوكيز — المنصّة على Bearer)، ثم:
 * · **الرسالةُ من الخادم قبل الرمي**: مسارُ الخطاب يردّ 403 (تعريفُ راتبٍ بلا صلاحية)
 *   و404 (خطابُ زميلٍ أو مكتبٍ آخر) و422 برسائلَ عربيةٍ دقيقة — و`res.clone().json()`
 *   داخل `try/catch` لأنّ الردَّ قد يكون PDF أو HTML لا JSON.
 * · **النافذةُ الممنوعةُ ليست فشلاً**: يهبط الملفُّ تنزيلاً ويُقال ذلك بـ`toast.info`،
 *   فلا يظنّ المُصدِرُ أنّ الخطابَ لم يصدر (وقد صدر وحُجز رقمُه).
 * · `revokeObjectURL` بعد دقيقة: الإبطالُ الفوريّ يقتل التبويبَ الذي فُتح للتوّ.
 *
 * ولا تلتقط الدالّةُ خطأها بنفسها: المستدعي يلفّها بـ`try/catch` + `toast.error` وحالةِ
 * `busy` تُعطّل الزرّ — فلا يُفتح خطابان بنقرتين متتاليتين.
 *
 * ══════ `label` — ولماذا وسيطٌ لا ملفٌّ ثانٍ ══════
 * قسيمةُ الراتب (S5) تحتاج المسارَ نفسَه حرفاً: `fetch` خام بـBearer، ورسالةُ الخادم قبل
 * الرمي، والنافذةُ الممنوعةُ تنزيلاً لا فشلاً. ونسخُ الكتلة لها يُعيد بالضبط العطلَ الذي
 * وُجد هذا الملفُّ لإصلاحه (`ContractsTab` نسخةً عن `AdminRequests`). فالمتغيّرُ الوحيدُ
 * بين المستندين **اسمُ المستند في الرسالة** — ويُمرَّر وسيطاً بقيمةٍ افتراضيةٍ تُبقي كلَّ
 * مستدعٍ قائمٍ على سلوكه حرفاً بحرف.
 */
export async function openLetterPdf(url: string, fileName: string, label = 'الخطاب'): Promise<void> {
  const token = localStorage.getItem('authToken');

  const res = await fetch(`${API_BASE_URL}${url}`, {
    method: 'GET',
    headers: {
      Accept: 'application/pdf',
      'ngrok-skip-browser-warning': '69420',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let message = `تعذر فتح ${label}`;
    try {
      const body = await res.clone().json();
      if (body?.message) message = String(body.message);
    } catch {
      /* الردّ ليس JSON — تبقى الرسالةُ الاحتياطية */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const win = window.open(objectUrl, '_blank');

  if (!win) {
    // المتصفّح منع النافذة المنبثقة → تنزيلٌ مباشرٌ بدل فشلٍ صامت
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.info(`تم تنزيل ${label} (المتصفح منع فتح نافذة جديدة)`);
  }

  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}
