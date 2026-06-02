// [P4·UX-07 + UX-01] مصدر حقيقة واحد لحراسة وحدة «العقود والمالية» وتبويباتها.
// يُشتقّ منه: (1) حراسة المسارات في App.tsx، (2) إظهار/إخفاء تبويبات الوحدة في الحاوية،
// (3) عنصر القائمة الجانبية — لمنع تناقض N-17 بين الحراسة والقائمة.
//
// مفاتيح الصلاحيات الفعلية (app/Enums/Permission.php):
//   billing.view · billing.invoices.manage · billing.payments.manage · billing.reports.view · billing.reports.export
//   contracts.view · contracts.create · contracts.edit · contracts.delete · contracts.templates.manage

import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, FileSignature, Receipt, CreditCard, TrendingUp, BarChart3 } from 'lucide-react';

/** خريطة الصلاحيات المعتمدة عبر الوحدة (تُستهلَك في الأزرار والمسارات والتبويبات). */
export const FINANCE_PERMISSIONS = {
  dashboard: 'billing.view',
  contractsView: ['contracts.view', 'billing.view'], // anyOf — يمنح المحامي وصول العقود
  contractsCreate: 'contracts.create',
  contractsEdit: 'contracts.edit',
  contractsDelete: 'contracts.delete',
  invoicesView: 'billing.view',
  invoicesManage: 'billing.invoices.manage',
  paymentsManage: 'billing.payments.manage',
  collectionsView: 'billing.view',
  reportsView: 'billing.reports.view',
  reportsExport: 'billing.reports.export',
  templatesManage: 'contracts.templates.manage',
} as const;

export interface PermissionChecker {
  has: (perm: string) => boolean;
  hasAny: (perms: string[]) => boolean;
}

export interface FinanceTab {
  key: string;
  label: string;
  /** المسار النسبي داخل /finance (index = '' ). */
  path: string;
  icon: LucideIcon;
  /** يقرّر ظهور التبويب لهذا المستخدم. */
  isVisible: (perms: PermissionChecker, role?: string) => boolean;
}

/** الأدوار التي ترى تبويب التحصيل العلوي المستقل (UX-06): billing.view + قيد دور. */
const COLLECTIONS_ROLES = new Set(['accountant', 'admin', 'owner', 'super_admin']);

/** تبويبات الوحدة بالترتيب، مع شرط الظهور لكل تبويب (مصفوفة ملحق ب.8). */
export const FINANCE_TABS: FinanceTab[] = [
  {
    key: 'dashboard',
    label: 'لوحة التحكم',
    path: '',
    icon: LayoutDashboard,
    isVisible: (p) => p.has(FINANCE_PERMISSIONS.dashboard),
  },
  {
    key: 'contracts',
    label: 'العقود',
    path: 'contracts',
    icon: FileSignature,
    isVisible: (p) => p.hasAny([...FINANCE_PERMISSIONS.contractsView]),
  },
  {
    key: 'invoices',
    label: 'الفواتير',
    path: 'invoices',
    icon: Receipt,
    isVisible: (p) => p.has(FINANCE_PERMISSIONS.invoicesView),
  },
  {
    key: 'payments',
    label: 'المدفوعات',
    path: 'payments',
    icon: CreditCard,
    isVisible: (p) => p.has(FINANCE_PERMISSIONS.paymentsManage),
  },
  {
    key: 'collections',
    label: 'التحصيل',
    path: 'collections',
    icon: TrendingUp,
    // التبويب العلوي المستقل: billing.view + قيد دور (لا يظهر للمحامي/المساعد).
    isVisible: (p, role) => p.has(FINANCE_PERMISSIONS.collectionsView) && !!role && COLLECTIONS_ROLES.has(role),
  },
  {
    key: 'reports',
    label: 'التقارير',
    path: 'reports',
    icon: BarChart3,
    isVisible: (p) => p.has(FINANCE_PERMISSIONS.reportsView),
  },
];
