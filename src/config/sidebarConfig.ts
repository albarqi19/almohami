import {
  Home, FileText, FileCheck, Calendar, Scale, Briefcase, Users, Clock, CheckSquare,
  BookOpen, MessageSquare, Upload, ShieldCheck, FileSignature, Receipt, CreditCard,
  TrendingUp, Bell, Settings, ClipboardList, BarChart3,
  type LucideIcon,
} from 'lucide-react';

/**
 * عنصر القائمة الجانبية.
 *
 * permission: الصلاحية المطلوبة لعرض العنصر. null = مرئي للجميع المسجلين دخولهم.
 * any: أو واحدة من قائمة صلاحيات (OR).
 * roles: legacy — للأدوار التي ليس لها صلاحية محددة بعد (سيُحذف لاحقًا).
 */
export interface SidebarItem {
  icon: LucideIcon;
  label: string;
  path: string;
  permission?: string | null;
  any?: string[];
  /** legacy fallback أثناء الانتقال */
  roles?: string[];
}

/**
 * عناصر القسم الرئيسي.
 */
export const mainMenuItems: SidebarItem[] = [
  { icon: Home, label: 'لوحة التحكم', path: '/dashboard', permission: null },
  { icon: FileText, label: 'القضايا', path: '/cases', permission: 'cases.view' },
  { icon: FileCheck, label: 'الوكالات', path: '/wekalat', permission: 'wekala.manage' },
  { icon: Calendar, label: 'الجلسات', path: '/sessions', permission: 'sessions.view' },
  { icon: Scale, label: 'طلبات التنفيذ', path: '/execution-requests', permission: 'cases.view' },
  { icon: Briefcase, label: 'الخدمات القانونية', path: '/legal-services', permission: 'cases.view' },
  { icon: Users, label: 'الاجتماعات', path: '/meetings/internal', permission: 'meetings.view' },
  { icon: Calendar, label: 'مواعيد العملاء', path: '/meetings/client', permission: 'meetings.view' },
  { icon: Clock, label: 'إعدادات التوفر', path: '/meetings/availability', permission: 'meetings.view', roles: ['lawyer', 'senior_lawyer'] },
  { icon: CheckSquare, label: 'المهام', path: '/tasks', permission: 'tasks.view' },
  { icon: BookOpen, label: 'المفكرة الشخصية', path: '/notebook', permission: null },
  { icon: BarChart3, label: 'أدائي', path: '/my-performance', permission: null, roles: ['lawyer', 'senior_lawyer', 'legal_assistant'] },
  { icon: FileText, label: 'قضاياي', path: '/my-cases', permission: null, roles: ['client'] },
  { icon: MessageSquare, label: 'الرسائل', path: '/my-messages', permission: null, roles: ['client'] },
  { icon: Upload, label: 'الوثائق', path: '/documents', permission: 'documents.view' },
  { icon: Clock, label: 'الأنشطة', path: '/activities', permission: null },
  { icon: Users, label: 'العملاء', path: '/clients', permission: 'clients.view' },
  { icon: ClipboardList, label: 'الطلبات الإدارية', path: '/admin/requests', permission: 'cases.view' },
  { icon: ShieldCheck, label: 'الاستعلام والتحقق', path: '/wathq', any: ['cases.view'] },
  { icon: FileSignature, label: 'العقود', path: '/contracts', permission: 'contracts.view' },
  { icon: FileText, label: 'قوالب العقود', path: '/contract-templates', permission: 'contracts.templates.manage' },
  { icon: Receipt, label: 'الفواتير', path: '/invoices', permission: 'billing.view' },
  { icon: CreditCard, label: 'المدفوعات', path: '/payments', permission: 'billing.payments.manage' },
  { icon: TrendingUp, label: 'التحصيل', path: '/billing', permission: 'billing.view' },
];

/**
 * عناصر قسم الإعدادات.
 */
export const settingsMenuItems: SidebarItem[] = [
  { icon: BarChart3, label: 'تقرير الأداء', path: '/lawyers-report', permission: 'reports.view' },
  { icon: Users, label: 'المستخدمين', path: '/users', permission: 'users.view' },
  { icon: Bell, label: 'التنبيهات', path: '/notifications', permission: null },
  { icon: MessageSquare, label: 'الواتساب', path: '/whatsapp-settings', permission: 'whatsapp.send' },
  { icon: Settings, label: 'الإعدادات', path: '/settings', permission: null },
];
