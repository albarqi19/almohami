import {
  Home, FileText, FileCheck, Calendar, Scale, Briefcase, Users, Clock, CheckSquare,
  BookOpen, MessageSquare, Upload, ShieldCheck, FileSignature,
  TrendingUp, Bell, Settings, ClipboardList, BarChart3, FolderUp, QrCode, Lightbulb,
  Landmark, AlarmClock, Archive, UserCog, Trash2, Inbox, CalendarOff, IdCard,
  Fingerprint, Wallet, FileSpreadsheet, HandCoins, PenLine,
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
  featureGate?: 'zatca' | 'hr' | 'hr_payroll' | 'email_intake' | 'establishment_portal' | 'draft_room';
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
  // ملفّي الوظيفيّ — بوّابةُ الموظف عن نفسه (رصيدُ إجازاته وحركاتُه).
  // `permission: null` **مقصود**: الخادمُ يفرض الذاتيةَ بالجلسة لا بالصلاحية، وكلُّ `hr.*`
  // للمدير — فأيُّ صلاحيةٍ هنا تُخفي البندَ عمّن بُني له. ولا يُسرَّب للعميل: قائمتُه
  // بيضاءُ صارمةٌ في `ClickUpSidebar` والخادمُ يردّه 404 — حارسان مستقلّان.
  // و`featureGate` إلزاميّة: بلا الميزة يردّ `EnsureHrEnabled` بـ403، وبندُ قائمةٍ يَعِد
  // بما يرفضه الخادمُ هو عينُ الفخّ الذي وثّقه تعليقُ بند «الإجازات والغياب» أدناه.
  { icon: IdCard, label: 'ملفّي الوظيفيّ', path: '/my-hr', permission: null, featureGate: 'hr' },
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
  // «غرفة الصياغة» — بوّابتان: علَمُ المكتب (مطفأٌ افتراضياً) وصلاحيةٌ مستقلّة.
  // كلتاهما إلزاميّة: بندُ قائمةٍ يَعِد بما يردّه الخادمُ 403 هو عينُ الفخّ.
  { icon: PenLine, label: 'غرفة الصياغة', path: '/draft-room', permission: 'memos.workspace.use', featureGate: 'draft_room', badge: 'جديد' },
  // [P4·UX-01] وحدة موحّدة بدل خمسة عناصر (العقود/قوالب العقود/الفواتير/المدفوعات/التحصيل).
  // any: يمنح المحامي وصول تبويب العقود حتى لو لم تكن له billing.view (التبويبات تُحرَس داخلياً — UX-07).
  { icon: FileSignature, label: 'العقود والمالية', path: '/finance', any: ['billing.view', 'contracts.view'] },
  { icon: Archive, label: 'الصادر والوارد', path: '/correspondence', permission: 'correspondence.view' },
  // صندوق الطلبات الذكي — طلبات واردة من بريد Outlook (خلف بوابة email_intake_enabled)
  { icon: Inbox, label: 'صندوق البريد الذكي', path: '/intake-requests', permission: 'legal-services.manage', featureGate: 'email_intake', badge: 'جديد' },
  { icon: FileCheck, label: 'اعتمادات المذكرات', path: '/memos/approvals', permission: 'memos.approve', badge: 'تجريبي' },
  // الموارد البشرية — للمدير فقط (permission: hr.view مبذورة لـ owner/admin حصراً) + خلف بوابة hr_enabled.
  // 🔴 **سُحب وسمُ «جديد»**: الشاشةُ شُحنت في `2026-06-30` (أوّلُ كومِت لـ`HrModule.tsx`) —
  // ستّةُ أسابيع. ووسمٌ بلا تاريخِ انتهاءٍ لا يشيخ من نفسه، فيصير أثاثاً يُقرأ ولا يُصدَّق،
  // ويسحب معه مصداقيةَ الأوسمة الباقية. وما بقي عليه الوسمُ شُحن في هذه الدورة فعلاً
  // (الحضورُ والأجورُ والمسيراتُ والمرجعُ والسلف — ملفّاتُها لم تُكوَّم بعد؛ و«منشأتي»
  // و«صندوق البريد» في `2026-08-11`). فالحكمُ بتاريخِ الشحن لا بالظنّ.
  { icon: UserCog, label: 'الموارد البشرية', path: '/hr', permission: 'hr.view', featureGate: 'hr' },
  // الإجازات والغياب — نفس بوابة hr_enabled وإلّا ظهر البند لمكاتبَ يردّها الباك بـ403.
  { icon: CalendarOff, label: 'الإجازات والغياب', path: '/hr/leave', permission: 'hr.view', featureGate: 'hr' },
  // الحضور والانصراف — الصلاحية `hr.attendance.view` **مستقلّة** عن `hr.view` (مَن يرى
  // الحضور ليس بالضرورة مَن يرى ملفّات الموظفين ورواتبهم)، ونفس بوابة hr_enabled: بلا
  // الميزة يردّ EnsureHrEnabled بـ403، وبندُ قائمةٍ يَعِد بما يرفضه الخادمُ هو عينُ الفخّ.
  { icon: Fingerprint, label: 'الحضور والانصراف', path: '/hr/attendance', permission: 'hr.attendance.view', featureGate: 'hr', badge: 'جديد' },
  // سجلُّ الأجور — بابُ إدخال الراتب. الصلاحيةُ `hr.payroll.view` **مستقلّة** (وحدةُ الرواتب
  // لها حرّاسُها)، ونفسُ بوّابة hr_enabled: بلا الميزة يردّ EnsureHrEnabled بـ403، وبندُ
  // قائمةٍ يَعِد بما يرفضه الخادمُ هو عينُ الفخّ. والمبالغُ داخل الشاشة خلف
  // `hr.compensation.view` — فمن يدير الجاهزيةَ يدخلها ولا يرى ريالاً.
  { icon: Wallet, label: 'سجل الأجور', path: '/hr/payroll/wages', permission: 'hr.payroll.view', featureGate: 'hr', badge: 'جديد' },
  // مسيراتُ الرواتب — بوّابتُها `hr_payroll` لا `hr` (كالمرجع النظاميّ أدناه): الخادمُ
  // يحرس `/hr/payroll/overview` و`/runs` بالعلَم الثالث، فبندٌ خلف `hr` وحدَها يظهر
  // لمئتَي مكتبٍ ويردّ كلَّ واحدٍ منها بـ403 — وهو عينُ الفخّ الذي يحذّر منه سطرُ الحضور.
  { icon: FileSpreadsheet, label: 'مسيرات الرواتب', path: '/hr/payroll', permission: 'hr.payroll.view', featureGate: 'hr_payroll', badge: 'جديد' },
  // المرجعُ النظاميّ — بوّابتُه `hr_payroll` لا `hr`: الخادمُ يحرسه بالعلَم الثالث
  // (hr_payroll_enabled) وافتراضُه مطفأ. فبندٌ خلف `hr` وحدَها يظهر لـ٢٢٢ مكتباً ويردّ
  // كلَّ واحدٍ منها بـ403 — وهو عينُ الفخّ الذي حذّر منه سطرُ الحضور أعلاه.
  { icon: Scale, label: 'المرجع النظامي', path: '/hr/payroll/rules', permission: 'hr.payroll.view', featureGate: 'hr_payroll', badge: 'جديد' },
  // السلفُ والجزاءات — بوّابةُ `hr_payroll` نفسُها: مساراتُهما داخل مجموعةٍ يحرسها العلَمُ
  // الثالث على الخادم. والسلفُ بـ`hr.payroll.view` (الشاشةُ تعرض دَيناً ويُدار المنحُ داخلها
  // خلف صلاحيته)، والجزاءاتُ بـ`hr.penalty.manage` كلُّها — فبندٌ يَعِد بما يرفضه الخادمُ
  // هو عينُ الفخّ الذي حذّر منه سطرُ الحضور أعلاه.
  { icon: HandCoins, label: 'السلف والجزاءات', path: '/hr/payroll/advances', permission: 'hr.payroll.view', featureGate: 'hr_payroll', badge: 'جديد' },
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
