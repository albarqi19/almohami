/**
 * Custom Landing Pages Registry
 * 
 * هذا الملف يحتوي على قائمة الشركات التي لها صفحات هبوط مخصصة
 * عند إضافة صفحة مخصصة جديدة، أضف الـ slug هنا
 */

import React from 'react';

// Lazy load custom landing pages for better performance
const AlkhibraLanding = React.lazy(() => import('./AlkhibraLanding'));

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
