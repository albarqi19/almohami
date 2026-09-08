import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ESTABLISHMENT_ONLY_PATH, isEstablishmentOnly } from '../utils/establishmentOnly';

/**
 * حارسُ التوجيه للوضع الحصري — يُصيَّر داخل `<Router>` و**فوق** `<Routes>`.
 *
 * موضعُه هذا مقصود: مسارات المستوى الأول (`/` · `/terms` · `/privacy` ·
 * `/extension` · `/forbidden` · `/account-status`) لا يحكمها `Layout` ولا
 * `ProtectedRoute` أصلاً، فحارسٌ داخل شجرة `Layout` كان سيتركها مفتوحةً —
 * وصفحةُ الشروط تحمل اسمَ المنتج الذي بُني هذا كلُّه لإخفائه.
 *
 * ولا يُنقل سطرٌ واحدٌ من جدول المسارات الستّين لأجل هذا: إزاحةُ كتلة المسارات
 * فرقٌ يقارب خمسمئة سطرٍ يبتلع وقتَ المراجعة ويُخفي فيه خطأَ قصٍّ لا يمسكه grep.
 *
 * ⚠️ **راحةُ عرضٍ لا حماية.** من عطّل هذا في متصفّحه رأى صفحةً فارغةً تنادي
 * مساراتٍ تُردّ كلُّها 403 من `RestrictEstablishmentOnlyClient`. الحمايةُ هناك.
 */
const EstablishmentOnlyRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // أثناء جلب المستخدم لا قرار: المسارات المحميّة تعرض شاشةَ تحميلها،
  // وتوجيهٌ مبكرٌ هنا كان سيقذف الجميع إلى البوّابة للحظة.
  if (isLoading || !isEstablishmentOnly(user)) {
    return null;
  }

  if (location.pathname === ESTABLISHMENT_ONLY_PATH) {
    return null;
  }

  return <Navigate to={ESTABLISHMENT_ONLY_PATH} replace />;
};

export default EstablishmentOnlyRedirect;
