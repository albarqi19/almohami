import {
  Home, FileText, FileCheck, Calendar, Scale, Briefcase, Users, Clock, CheckSquare,
  BookOpen, MessageSquare, Upload, ShieldCheck, FileSignature, Receipt, CreditCard,
  TrendingUp, Bell, Settings, ClipboardList, BarChart3, FolderUp, QrCode, Lightbulb,
  Landmark, AlarmClock,
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
  /**
   * بوّابة ميزة — تُخفي العنصر تماماً حتى تكون الميزة متاحة للمنشأة.
   * 'zatca' يُقرأ من useZatcaFeature() (context) داخل ClickUpSidebar — لا hook هنا (هذا ملف بيانات).
   */
  featureGate?: 'zatca';
  /** شارة نصية صغيرة بجوار الاسم (مثل "مؤقتة" لميزة تجريبية). */
  badge?: string;
}

/**
 * عناصر القسم الرئيسي.
 */
export const mainMenuItems: SidebarItem[] = [
  { icon: Home, label: 'لوحة التحكم', path: '/dashboard', permission: null },
  { icon: TrendingUp, label: 'أداء الشركة', path: '/firm-report', permission: null, roles: ['admin', 'owner', 'partner'] },
  { icon: FileText, label: 'القضايا', path: '/cases', permission: 'cases.view' },
  { icon: FileCheck, label: 'الوكالات', path: '/wekalat', permission: 'wekala.manage' },
  { icon: Calendar, label: 'الجلسات', path: '/sessions', permission: 'sessions.view' },
  { icon: AlarmClock, label: 'المهل النظامية', path: '/deadlines', permission: 'deadlines.view' },
  { icon: Scale, label: 'طلبات التنفيذ', path: '/execution-requests', permission: 'cases.view' },
  { icon: Briefcase, label: 'الخدمات القانونية', path: '/legal-services', permission: 'cases.view' },
  { icon: Users, label: 'الاجتماعات', path: '/meetings/internal', permission: 'meetings.view' },
  { icon: Calendar, label: 'مواعيد العملاء', path: '/meetings/client', permission: 'meetings.view' },
  { icon: Clock, label: 'إعدادات التوفر', path: '/meetings/availability', permission: 'meetings.view', roles: ['admin', 'lawyer', 'senior_lawyer'] },
  { icon: CheckSquare, label: 'المهام', path: '/tasks', permission: 'tasks.view' },
  { icon: BookOpen, label: 'المفكرة الشخصية', path: '/notebook', permission: null },
  { icon: BarChart3, label: 'أدائي', path: '/my-performance', permission: null, roles: ['lawyer', 'senior_lawyer', 'legal_assistant'] },
  { icon: FileText, label: 'قضاياي', path: '/my-cases', permission: null, roles: ['client'] },
  { icon: FolderUp, label: 'الوثائق المطلوبة', path: '/my-documents-required', permission: null, roles: ['client'] },
  { icon: MessageSquare, label: 'الرسائل', path: '/my-messages', permission: null, roles: ['client'] },
  { icon: Upload, label: 'الوثائق', path: '/documents', permission: 'documents.view' },
  { icon: Clock, label: 'الأنشطة', path: '/activities', permission: null },
  { icon: Users, label: 'العملاء', path: '/clients', permission: 'clients.view' },
  { icon: ClipboardList, label: 'الطلبات الإدارية', path: '/admin/requests', permission: 'cases.view' },
  { icon: ShieldCheck, label: 'الاستعلام والتحقق', path: '/wathq', any: ['cases.view'] },
  { icon: Landmark, label: 'الأنظمة', path: '/laws', any: ['cases.view'], badge: 'تجريبي' },
  // [P4·UX-01] وحدة موحّدة بدل خمسة عناصر (العقود/قوالب العقود/الفواتير/المدفوعات/التحصيل).
  // any: يمنح المحامي وصول تبويب العقود حتى لو لم تكن له billing.view (التبويبات تُحرَس داخلياً — UX-07).
  { icon: FileSignature, label: 'العقود والمالية', path: '/finance', any: ['billing.view', 'contracts.view'] },
  { icon: QrCode, label: 'الفوترة الإلكترونية', path: '/zatca', roles: ['admin', 'accountant', 'owner'], featureGate: 'zatca' },
  { icon: Lightbulb, label: 'الملاحظات', path: '/feedback', permission: 'feedback.submit', badge: 'مؤقتة' },
];

/**
 * عناصر قسم الإعدادات.
 */
export const settingsMenuItems: SidebarItem[] = [
  // [P4·UX-09] القوالب نادرة الاستخدام → نُقلت من القائمة الرئيسية إلى الإعدادات.
  { icon: FileText, label: 'قوالب العقود', path: '/settings/contract-templates', permission: 'contracts.templates.manage' },
  { icon: BarChart3, label: 'تقرير الأداء', path: '/lawyers-report', permission: 'reports.view' },
  { icon: Users, label: 'المستخدمين', path: '/users', permission: 'users.view' },
  { icon: Bell, label: 'التنبيهات', path: '/notifications', permission: null },
  { icon: MessageSquare, label: 'الواتساب', path: '/whatsapp-settings', permission: 'whatsapp.send' },
  { icon: Settings, label: 'الإعدادات', path: '/settings', permission: null },
];
