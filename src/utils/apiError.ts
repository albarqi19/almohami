/**
 * استخراج رسالة خطأ عربية واضحة من أخطاء apiClient لعرضها للمستخدم.
 *
 * apiClient (utils/api.ts) يرمي Error رسالتُه هي رسالة الباك العربية (errorData.message)
 * ويعلّق أخطاء التحقق في error.errors — لكن أغلب مواقع الاستدعاء كانت تبتلعها وتعرض
 * نصاً عاماً («حاول مرة أخرى»)، وهو أبرز أسباب غموض تجربة الخدمات القانونية.
 *
 * الاستخدام الموحّد:
 *   catch (err) { toast.error(getApiErrorMessage(err, 'تعذّر حفظ البيانات')); }
 */
export function getApiErrorMessage(err: unknown, fallback = 'حدث خطأ غير متوقع. حاول مرة أخرى.'): string {
  if (err instanceof Error) {
    const e = err as Error & { errors?: Record<string, string[]> };

    // أخطاء التحقق (422): أول رسالة حقل — الأكثر إفادة للمستخدم
    if (e.errors && typeof e.errors === 'object') {
      const first = Object.values(e.errors)[0];
      if (Array.isArray(first) && typeof first[0] === 'string' && first[0].trim()) {
        return first[0];
      }
    }

    // رسالة الباك العربية (message) — نتجاهل الرسائل التقنية غير المفيدة
    const msg = e.message?.trim();
    if (msg && !/^HTTP \d+$/.test(msg) && msg !== 'Unauthorized' && msg !== 'Failed to fetch') {
      return msg;
    }
  }

  return fallback;
}
