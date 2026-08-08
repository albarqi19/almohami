import {
  Home, FileText, FileCheck, Calendar, Scale, Briefcase, Users, Clock, CheckSquare,
  BookOpen, MessageSquare, Upload, ShieldCheck, FileSignature, Receipt, CreditCard,
  TrendingUp, Bell, Settings, ClipboardList, BarChart3, FolderUp, QrCode, Lightbulb,
  Landmark, AlarmClock, Archive, UserCog, Trash2, Inbox,
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
   * 'zatca' يُقرأ من useZatcaFeature() (context)، و'hr'/'email_intake' من user.tenant.*_enabled — داخل ClickUpSidebar (لا hook هنا، هذا ملف بيانات).
   */
  featureGate?: 'zatca' | 'hr' | 'email_intake' | 'establishment_portal';
  /** شارة نصية صغيرة بجوار الاسم (مثل "مؤقتة" لميزة تجريبية). */
  badge?: string;
}

/**
 * عناصر القسم الرئيسي.
 */
export const mainMenuItems: SidebarItem[] = [
  { icon: Home, label: 'لوحة التحكم', path: '/dashboard', permission: null },
  { icon: TrendingUp, label: 'أداء الشركة', path: '/firm-report', any: ['cases.manage-all', 'system.manage'] },
  { icon: FileText, label: 'القضايا', path: '/cases', permission: 'cases.view' },
  { icon: FileCheck, label: 'الوكالات', path: '/wekalat', permission: 'wekala.manage' },
  { icon: Calendar, label: 'الجلسات', path: '/sessions', permission: 'sessions.view' },
  { icon: AlarmClock, label: 'المهل النظامية', path: '/deadlines', permission: 'deadlines.view' },
  { icon: Scale, label: 'طلبات التنفيذ', path: '/execution-requests', permission: 'cases.view' },
  { icon: Briefcase, label: 'الخدمات القانونية', path: '/legal-services', permission: 'cases.view' },
  { icon: Users, label: 'الاجتماعات', path: '/meetings/internal', permission: 'meetings.view' },
  { icon: Calendar, label: 'مواعيد العملاء', path: '/meetings/client', permission: 'meetings.view' },
  { icon: Clock, label: 'إعدادات التوفر', path: '/meetings/availability', permission: 'meetings.view' },
  { icon: CheckSquare, label: 'المهام', path: '/tasks', permission: 'tasks.view' },
  { icon: BookOpen, label: 'المفكرة الشخصية', path: '/notebook', permission: null },
  { icon: BarChart3, label: 'أدائي', path: '/my-performance', permission: 'cases.view' },
  { icon: FileText, label: 'قضاياي', path: '/my-cases', permission: null, roles: ['client'] },
  // بوابة المنشأة — متابعة العميل لوثائق منشأته وموظفيها (خلف establishment_portal_enabled)
  { icon: Landmark, label: 'منشأتي', path: '/my-establishment', permission: null, roles: ['client'], featureGate: 'establishment_portal', badge: 'جديد' },
  { icon: FolderUp, label: 'الوثائق المطلوبة', path: '/my-documents-required', permission: null, roles: ['client'] },
  { icon: MessageSquare, label: 'الرسائل', path: '/my-messages', permission: null, roles: ['client'] },
  { icon: Upload, label: 'الوثائق', path: '/documents', permission: 'documents.view' },
  { icon: Clock, label: 'الأنشطة', path: '/activities', permission: null },
  { icon: Users, label: 'العملاء', path: '/clients', permission: 'clients.view' },
  { icon: ClipboardList, label: 'الطلبات الإدارية', path: '/admin/requests', permission: 'cases.view' },
  { icon: ShieldCheck, label: 'الاستعلام والتحقق', path: '/wathq', any: ['cases.view'] },
  { icon: Landmark, label: 'الأنظمة', path: '/laws', any: ['cases.view'] },
  // [P4·UX-01] وحدة موحّدة بدل خمسة عناصر (العقود/قوالب العقود/الفواتير/المدفوعات/التحصيل).
  // any: يمنح المحامي وصول تبويب العقود حتى لو لم تكن له billing.view (التبويبات تُحرَس داخلياً — UX-07).
  { icon: FileSignature, label: 'العقود والمالية', path: '/finance', any: ['billing.view', 'contracts.view'] },
  { icon: Archive, label: 'الصادر والوارد', path: '/correspondence', permission: 'correspondence.view' },
  // صندوق الطلبات الذكي — طلبات واردة من بريد Outlook (خلف بوابة email_intake_enabled)
  { icon: Inbox, label: 'صندوق البريد الذكي', path: '/intake-requests', permission: 'legal-services.manage', featureGate: 'email_intake', badge: 'جديد' },
  { icon: FileCheck, label: 'اعتمادات المذكرات', path: '/memos/approvals', permission: 'memos.approve', badge: 'تجريبي' },
  // الموارد البشرية — للمدير فقط (permission: hr.view مبذورة لـ owner/admin حصراً) + خلف بوابة hr_enabled.
  { icon: UserCog, label: 'الموارد البشرية', path: '/hr', permission: 'hr.view', featureGate: 'hr', badge: 'جديد' },
  { icon: QrCode, label: 'الفوترة الإلكترونية', path: '/zatca', permission: 'billing.invoices.manage', featureGate: 'zatca' },
  { icon: Lightbulb, label: 'الملاحظات', path: '/feedback', permission: 'feedback.submit', badge: 'مؤقتة' },
];

/**
 * عناصر قسم الإعدادات.
 */
// [RBAC] عناصرُ المكتب تُحكم بالصلاحية لا بالاسم — مطابقةً لحرّاس App.tsx
// والخادم. أمّا عناصرُ بوّابة العميل فتبقى بالاسم بحقٍّ: العميلُ **نوعُ
// مستخدمٍ لا دور**، وله قائمةٌ بيضاء صارمة في ClickUpSidebar.tsx:197.
export const settingsMenuItems: SidebarItem[] = [
  // [P4·UX-09] القوالب نادرة الاستخدام → نُقلت من القائمة الرئيسية إلى الإعدادات.
  { icon: FileText, label: 'قوالب العقود', path: '/settings/contract-templates', permission: 'contracts.templates.manage' },
  { icon: BarChart3, label: 'تقرير الأداء', path: '/lawyers-report', permission: 'reports.view' },
  { icon: Users, label: 'المستخدمين', path: '/users', permission: 'users.view' },
  // سلة المحذوفات — للمدير والمالك فقط (استعادة/حذف نهائي للقضايا والوكالات والعملاء).
  { icon: Trash2, label: 'سلة المحذوفات', path: '/archive', permission: 'cases.force-delete' },
  { icon: Bell, label: 'التنبيهات', path: '/notifications', permission: null },
  { icon: MessageSquare, label: 'الواتساب', path: '/whatsapp-settings', permission: 'whatsapp.send' },
  { icon: Settings, label: 'الإعدادات', path: '/settings', permission: null },
];
