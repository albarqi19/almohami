/**
 * Custom Landing Pages Registry
 * 
 * هذا الملف يحتوي على قائمة الشركات التي لها صفحات هبوط مخصصة
 * عند إضافة صفحة مخصصة جديدة، أضف الـ slug هنا
 */

import React from 'react';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

// lazyWithRetry لا React.lazy الخام: بعد كل نشر جديد يطلب زائرٌ بنسخة قديمة
// من index.html ملفَّ chunk اختفى اسمه، ولا يوجد حدّ خطأ حول الـSuspense في
// TenantLandingPage ⇒ يصعد الاستثناء إلى ErrorBoundary العام فتُبتلع صفحة
// المكتب كلها بشاشة خطأ عامة. الغلاف يعيد تحميل الصفحة مرة واحدة بدل ذلك.
const AlkhibraLanding = lazyWithRetry(() => import('./AlkhibraLanding'));
const LegalEditionLanding = lazyWithRetry(() => import('./LegalEditionLanding'));

// يمكنك إضافة المزيد من الصفحات المخصصة هنا:
// const AnotherCompanyLanding = React.lazy(() => import('./AnotherCompanyLanding'));

/**
 * Map of tenant slugs to their custom landing page components
 * 
 * مثال:
 * {
 *   'alkhibra': AlkhibraLanding,
 *   'another-company': AnotherCompanyLanding,
 * }
 */
export const customLandingPages: Record<string, React.LazyExoticComponent<React.FC>> = {
  'alkhibra': AlkhibraLanding,
  'legaledition': LegalEditionLanding,
  // أضف المزيد من الشركات هنا
};

/**
 * Check if a tenant has a custom landing page
 */
export function hasCustomLanding(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return slug.toLowerCase() in customLandingPages;
}

/**
 * Get the custom landing page component for a tenant
 */
export function getCustomLanding(slug: string | null | undefined): React.LazyExoticComponent<React.FC> | null {
  if (!slug) return null;
  return customLandingPages[slug.toLowerCase()] || null;
}
