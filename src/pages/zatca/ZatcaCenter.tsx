// === مركز الفوترة الإلكترونية ZATCA ===
// حارس المسار الصريح (لا يُكتفى بإخفاء القائمة): يقرأ available/enabled من useZatcaFeature()
// ويوجّه حسب الحالات الثلاث. الحماية الفعلية في الباك؛ هذا الحارس للـ UX.

import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ShieldX, Clock } from 'lucide-react';
import { useZatcaFeature } from '../../contexts/ZatcaStatusContext';
import { useAuth } from '../../contexts/AuthContext';
import { ZatcaPageHead } from '../../components/zatca/ZatcaPageShell';
import ZatcaOnboardingWizard from '../../components/zatca/ZatcaOnboardingWizard';
import ZatcaDashboard from '../../components/zatca/ZatcaDashboard';
import '../../styles/zatca.css';

const ZatcaCenter: React.FC = () => {
  const { available, enabled, environment, isLoading } = useZatcaFeature();
  const { user } = useAuth();

  // 1) تحميل الحالة
  if (isLoading) {
    return (
      <div className="zatca-page">
        <div className="zatca-loading">
          <Loader2 size={32} className="zatca-spin" />
          <span>جارٍ التحقّق من حالة الفوترة الإلكترونية…</span>
        </div>
      </div>
    );
  }

  // 2) غير متاحة للمنشأة — بطاقة محايدة (الأمان الفعلي في الباك)
  if (!available) {
    return (
      <div className="zatca-page">
        <div className="zatca-empty-card">
          <div className="zatca-empty-card__icon"><ShieldX size={30} /></div>
          <h2 className="zatca-empty-card__title">هذه الميزة غير متاحة لمنشأتك</h2>
          <p className="zatca-empty-card__text">
            الفوترة الإلكترونية (ZATCA) غير مُفعّلة لحساب منشأتك حالياً. تواصل مع الدعم لمعرفة المزيد عن إتاحتها.
          </p>
          <Link to="/dashboard" className="zatca-btn zatca-btn--primary">العودة للوحة التحكم</Link>
        </div>
      </div>
    );
  }

  // 3) متاحة لكن غير مفعّلة — معالج التفعيل (للمالك/admin فقط)
  if (!enabled) {
    const canOnboard = !!user?.is_tenant_owner || user?.role === 'admin' || user?.role === 'owner';

    if (!canOnboard) {
      return (
        <div className="zatca-page">
          <ZatcaPageHead subtitle="بانتظار إتمام التفعيل من مالك المنشأة." />
          <div className="zatca-empty-card">
            <div className="zatca-empty-card__icon zatca-empty-card__icon--info"><Clock size={30} /></div>
            <h2 className="zatca-empty-card__title">التفعيل قيد الإعداد من المالك</h2>
            <p className="zatca-empty-card__text">
              لم يتم تفعيل الفوترة الإلكترونية بعد. عند إتمام مالك المنشأة لخطوات التفعيل، ستتمكّن من إرسال
              الفواتير وعرض حالاتها من هنا.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="zatca-page">
        <ZatcaPageHead
          subtitle="أكمل خطوات التفعيل لربط منشأتك بهيئة الزكاة والضريبة والجمارك."
          environment={environment}
        />
        <ZatcaOnboardingWizard />
      </div>
    );
  }

  // 4) مفعّلة — اللوحة الكاملة
  return <ZatcaDashboard />;
};

export default ZatcaCenter;
