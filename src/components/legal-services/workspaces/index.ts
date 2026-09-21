import type { ComponentType } from 'react';
import type { WorkspaceProps } from './types';
import { lazyWithRetry } from '../../../utils/lazyWithRetry';

// ── سجل مساحات العمل ──
// كل مساحة تُحمَّل عند الطلب: كانت العشر كلها (~6 آلاف سطر) تُستورد مع صفحة الخدمة،
// فمن يفتح خدمة «صياغة عقود» يحمّل مساحات التحكيم والعقار والتدريب… ولا يرى منها شيئاً.
// من يعرض `Workspace` يلفّه بـ`<Suspense>` قريب — وإلا سقط الانتظار إلى حدّ المسار
// فومضت الصفحة كلها.
export const WorkspaceRegistry: Record<string, ComponentType<WorkspaceProps>> = {
  legal_notices: lazyWithRetry(() => import('./LegalNoticesWorkspace')),
  training: lazyWithRetry(() => import('./TrainingWorkspace')),
  arbitration: lazyWithRetry(() => import('./ArbitrationWorkspace')),
  company_formation: lazyWithRetry(() => import('./CompanyFormationWorkspace')),
  labor: lazyWithRetry(() => import('./LaborWorkspace')),
  compliance: lazyWithRetry(() => import('./ComplianceWorkspace')),
  real_estate: lazyWithRetry(() => import('./RealEstateWorkspace')),
  ip: lazyWithRetry(() => import('./IpWorkspace')),
  due_diligence: lazyWithRetry(() => import('./DueDiligenceWorkspace')),
  licenses: lazyWithRetry(() => import('./LicensesWorkspace')),
};

export type { WorkspaceProps } from './types';
export { default as MicroStatsBar } from './MicroStatsBar';
export { default as ContextualAlert } from './ContextualAlert';
export { default as SkeletonCard } from './SkeletonCard';
