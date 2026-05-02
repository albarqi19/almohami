import type { DriveStep } from 'driver.js';

export interface PageTour {
  key: string;
  pageLabel: string;
  matchPath: (pathname: string) => boolean;
  steps: DriveStep[];
}

export const FEATURE_LAUNCH_DATE = '2026-05-02';

const tour = (config: PageTour): PageTour => config;

export const PAGE_TOURS: PageTour[] = [
  tour({
    key: 'case-detail',
    pageLabel: 'صفحة تفاصيل القضية',
    // /cases/:caseId — يجب أن يأتي قبل /cases ليُطابق أولاً
    matchPath: (p) => /^\/cases\/[^/]+\/?$/.test(p),
    steps: [
      {
        popover: {
          title: 'تفاصيل القضية',
          description:
            'هذه الصفحة هي مركز عملك على القضية: من هنا تدير الجلسات، المهام، الوثائق، والمذكرات. الجولة سريعة (دقيقة).',
        },
      },
      {
        element: '[data-tour="case-title"]',
        popover: {
          title: 'هوية القضية',
          description:
            'عنوان القضية ورقم الملف، مع شارات الحالة (نشطة/معلقة/مغلقة) والأولوية. تظهر هنا أيضاً الحالة المستوردة من ناجز إن وجدت.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="case-tabs"]',
        popover: {
          title: 'الاختصارات السريعة',
          description:
            'وصول مباشر لـ <b>الوثائق</b>، <b>المهام</b>، <b>الجلسات</b>، و<b>الرسائل</b> الخاصة بهذه القضية. الأرقام جانب كل اختصار تعرض العدد الحالي.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="case-memo-btn"]',
        popover: {
          title: 'إنشاء مذكرة بالذكاء الاصطناعي',
          description:
            'يفتح مساحة عمل لإنشاء مذكرة قانونية مبنية على بيانات القضية والوثائق والأحكام السابقة. وفّرت الكثير من الوقت.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="case-actions"]',
        popover: {
          title: 'إجراءات القضية',
          description:
            '<b>تعديل</b> بيانات القضية، <b>إجراء سريع</b> (إضافة جلسة/مهمة/وثيقة)، <b>ربط</b> مع قضية في ناجز، أو <b>مشاركة</b> القضية مع زميل أو مساعد قانوني.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="case-main-content"]',
        popover: {
          title: 'المحتوى الأساسي',
          description:
            'هنا تجد <b>موضوع الدعوى</b> (الطلبات، الأدلة، الوقائع) و<b>الأطراف</b> (المدعون والمدعى عليهم).',
          side: 'left',
        },
      },
      {
        element: '[data-tour="case-sessions-section"]',
        popover: {
          title: 'جلسات القضية',
          description:
            'قائمة الجلسات (القادمة والمنتهية) مع 3 إجراءات مهمة:<br/>• <b>الدخول للجلسة عن بُعد</b>: للجلسات الافتراضية، يفتح رابط الفيديو مباشرة.<br/>• <b>إرسال الإفادة</b>: شغّله <u>قبل الجلسة</u>، وفور انتهائها سيُرسَل ضبط الجلسة المختصر للعميل تلقائياً عبر <b>واتساب</b>.<br/>• <b>ضبط الجلسة</b>: للجلسات المنتهية، يعرض النص الكامل للضبط من ناجز.',
          side: 'left',
        },
      },
      {
        element: '[data-tour="case-timeline"]',
        popover: {
          title: 'النشاطات الأخيرة',
          description:
            'سجل زمني لكل تحديث على القضية: تعديلات، رفع وثائق، إنجاز مهام، تغيير حالة. تابع كل ما يحدث بنظرة واحدة.',
          side: 'top',
        },
      },
      {
        element: '[data-tour="case-overview"]',
        popover: {
          title: 'النظرة السريعة',
          description:
            'ملخّص جانبي لمعلومات القضية: الحالة، النوع، المحكمة، الجلسة القادمة، وبيانات العميل (هاتف، بريد).',
          side: 'left',
        },
      },
      {
        element: '[data-tour="case-fees-section"]',
        popover: {
          title: 'الرسوم والمدفوعات',
          description:
            'ملخّص مالي للقضية: <b>الإجمالي</b>، <b>المدفوع</b>، و<b>المتبقي</b>، مع شريط تقدّم التحصيل. تجد أيضاً عدد الفواتير، الفواتير المتأخرة، وآخر المدفوعات. اضغط على عدد الفواتير لفتح صفحة الفواتير الكاملة لهذه القضية.',
          side: 'left',
        },
      },
      {
        popover: {
          title: 'انتهت الجولة 🎉',
          description:
            'صفحة تفاصيل القضية فيها أكثر مما يظهر للعين — تنقّل بين التابات، اضغط على الجلسات لرؤية تفاصيلها، وجرّب إنشاء مذكرة. نراك في الصفحة التالية!',
        },
      },
    ],
  }),
  tour({
    key: 'cases',
    pageLabel: 'صفحة القضايا',
    matchPath: (p) => p === '/cases' || p === '/cases/',
    steps: [
      {
        popover: {
          title: 'مرحباً بك في صفحة القضايا',
          description:
            'هذه جولة سريعة (دقيقة واحدة) للتعرف على أهم العناصر. تقدر تتجاوزها في أي وقت أو تعيد تشغيلها لاحقاً من زر <b>؟</b> في الأعلى.',
        },
      },
      {
        element: '[data-tour="cases-stats"]',
        popover: {
          title: 'الإحصائيات السريعة',
          description: 'نظرة سريعة على عدد القضايا حسب حالتها: نشطة، معلقة، ومغلقة.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="cases-search"]',
        popover: {
          title: 'البحث',
          description:
            'ابحث برقم الملف، عنوان القضية، أو اسم العميل. نتائج البحث تظهر فوراً.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="cases-filter-status"]',
        popover: {
          title: 'فلتر الحالة',
          description: 'صفِّ القضايا حسب حالتها (نشطة، معلقة، مغلقة، مستأنفة).',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="cases-filter-type"]',
        popover: {
          title: 'فلتر النوع',
          description: 'صفِّ القضايا حسب نوعها (مدنية، تجارية، أسرية، عمالية…).',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="cases-view-tabs"]',
        popover: {
          title: 'طرق العرض',
          description:
            'اختر طريقة العرض المناسبة لك: <b>جدول</b> للتفاصيل، <b>شبكة</b> للبطاقات، أو <b>كانبان</b> للقضايا حسب الحالة.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="cases-add"]',
        popover: {
          title: 'إضافة قضية جديدة',
          description: 'افتح نموذج إضافة قضية مع ربطها بالعميل والمحامي المختصين.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="cases-list"]',
        popover: {
          title: 'قائمة القضايا',
          description:
            'اضغط على أي قضية لفتح تفاصيلها الكاملة (الجلسات، المهام، الوثائق، الأطراف…).',
          side: 'top',
        },
      },
      {
        popover: {
          title: 'انتهت الجولة 🎉',
          description:
            'يمكنك إعادة تشغيل هذه الجولة في أي وقت من زر <b>؟</b> في شريط الأعلى. جولات الصفحات الأخرى ستضاف تباعاً.',
        },
      },
    ],
  }),
];

export const getTourForPath = (pathname: string): PageTour | null =>
  PAGE_TOURS.find((t) => t.matchPath(pathname)) ?? null;

export const isTenantOlderThanLaunch = (userCreatedAt: Date | string | null | undefined): boolean => {
  if (!userCreatedAt) return false;
  const created = new Date(userCreatedAt).getTime();
  if (Number.isNaN(created)) return false;
  return created < new Date(FEATURE_LAUNCH_DATE).getTime();
};

// ============================================================================
// Modal tours — keyed by modal id (not URL). Auto-run once on first open
// for new tenants; can be replayed any time via the ? button inside the modal.
// ============================================================================

export interface ModalTour {
  key: string;
  label: string;
  steps: DriveStep[];
}

const modalTour = (config: ModalTour): ModalTour => config;

export const MODAL_TOURS: ModalTour[] = [
  modalTour({
    key: 'modal:legal-memo',
    label: 'مساحة عمل المذكرة القانونية',
    steps: [
      {
        popover: {
          title: 'مساحة عمل المذكرة القانونية',
          description:
            'هذه نافذة موحَّدة لإنشاء مذكرة قانونية بمساعدة الذكاء الاصطناعي — من اختيار نوعها، إلى صياغتها، إلى تحليلها قبل التقديم.',
        },
      },
      {
        element: '[data-tour="memo-types"]',
        popover: {
          title: 'الخطوة 1 — اختر نوع المذكرة',
          description:
            'فئات منظَّمة (مدنية، تجارية، عمالية، أسرية…). كل فئة تحوي أنواع مذكرات جاهزة. اختيارك هنا يحدّد <b>متطلبات الوثائق</b> و<b>القالب الافتراضي</b> للمحرر.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="memo-title"]',
        popover: {
          title: 'عنوان المذكرة',
          description:
            'يظهر بعد اختيار النوع. اكتب عنواناً واضحاً — يُحفظ تلقائياً مع المذكرة.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="memo-sidebar"]',
        popover: {
          title: 'الشريط الجانبي',
          description:
            '<b>نوع المذكرة</b> + <b>الوثائق المطلوبة</b> (بعض المذكرات تتطلب إرفاق الدعوى الأصلية مثلاً) + منطقة <b>رفع الملفات</b> + <b>نتائج التحليل المحفوظة</b>.',
          side: 'left',
        },
      },
      {
        element: '[data-tour="memo-analysis"]',
        popover: {
          title: 'التحليل الذكي',
          description:
            'اختر نوع التحليل: <b>Gatekeeper</b> (فحص أوّلي)، <b>Brain</b> (تحليل عميق)، <b>Opponent</b> (محاكاة الطرف الآخر)، <b>Polish</b> (تحسين الصياغة)، <b>Compliance</b> (فحص المطابقة). يمكن تشغيل أكثر من تحليل تباعاً.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="memo-save"]',
        popover: {
          title: 'الحفظ',
          description:
            'يحفظ المذكرة فوراً. النظام يحفظ تلقائياً كل بضع ثوانٍ، لكن الزر يضمن لك حفظ نسخة نهائية. الأيقونة تتحول لـ ✓ بعد الحفظ.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="memo-help-btn"]',
        popover: {
          title: 'إعادة الجولة',
          description: 'هذا الزر متاح دائماً — اضغطه متى احتجت إعادة هذه الجولة.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        popover: {
          title: 'انتهت الجولة 🎉',
          description:
            'نصيحة: ابدأ بـ <b>Gatekeeper</b> أولاً (سريع)، ثم <b>Brain</b> للتعمّق، وأخيراً <b>Polish</b> قبل التقديم.',
        },
      },
    ],
  }),
  modalTour({
    key: 'modal:case-appointments',
    label: 'مودال جلسات القضية',
    steps: [
      {
        popover: {
          title: 'الجلسات والمواعيد',
          description:
            'كل ما يخص توقيتات هذه القضية في نافذة واحدة مكثّفة: جلسات ناجز الرسمية + المواعيد اليدوية.',
        },
      },
      {
        element: '[data-tour="appts-sessions"]',
        popover: {
          title: 'جلسات ناجز',
          description:
            'تُستورَد تلقائياً من ناجز — لا تُضاف يدوياً. كل صف يعرض التاريخ والوقت، النوع، المحكمة، والحالة. لو كانت جلسة <b>مرئية</b> سيظهر زر <b>انضمام</b> يفتح رابط الفيديو مباشرة.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="appts-appointments"]',
        popover: {
          title: 'المواعيد اليدوية',
          description:
            'لأي اجتماع غير رسمي تربطه بالقضية: موعد عميل، اجتماع فريق، استشارة، تحكيم… أزرار الإجراءات تتغيّر حسب الحالة: <b>تأكيد</b>/<b>إلغاء</b> للمجدول، <b>بدء</b> للمؤكَّد، <b>إكمال</b> لقيد التنفيذ.',
          side: 'top',
        },
      },
      {
        element: '[data-tour="appts-help-btn"]',
        popover: {
          title: 'إعادة الجولة',
          description: 'هذا الزر متاح دائماً — اضغطه متى احتجت إعادة الجولة.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        popover: {
          title: 'انتهت الجولة 🎉',
          description:
            'لاستيراد جلسات جديدة من ناجز، استخدم زر <b>ربط مع ناجز</b> في رأس صفحة القضية.',
        },
      },
    ],
  }),
  modalTour({
    key: 'modal:case-documents',
    label: 'مودال وثائق القضية',
    steps: [
      {
        popover: {
          title: 'وثائق ومذكرات القضية',
          description:
            'هذه نافذة إدارة كل وثائق ومذكرات القضية في مكان واحد. الجولة سريعة (٣٠ ثانية).',
        },
      },
      {
        element: '[data-tour="docs-cloud"]',
        popover: {
          title: 'إرفاق ملف سحابي',
          description:
            'اربط حسابك في <b>OneDrive</b> أوّل مرة من قسم الوثائق، ثم اختَر ملفاً أو مجلداً مباشرة من حسابك — بدون تنزيل ورفع.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="docs-upload"]',
        popover: {
          title: 'رفع ذكي بالذكاء الاصطناعي',
          description:
            'ارفع وثيقة من جهازك. النظام يقرأ محتواها تلقائياً ويصنّفها (عقد، حكم، مذكرة، إلخ) ويستخرج البيانات المهمة.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="docs-memo"]',
        popover: {
          title: 'إنشاء مذكرة قانونية',
          description:
            'افتح محرر المذكرات لكتابة مذكرة جديدة. تستطيع لاحقاً تشغيل <b>تحليل ذكي</b> عليها لاكتشاف نقاط القوة/الضعف.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="docs-help-btn"]',
        popover: {
          title: 'إعادة الجولة',
          description: 'هذا الزر متاح دائماً داخل النافذة — اضغطه متى احتجت إعادة هذه الجولة.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        popover: {
          title: 'انتهت الجولة 🎉',
          description:
            'اضغط على أي وثيقة أو مذكرة في القائمة لمعاينتها أو تعديلها أو تحليلها بالذكاء الاصطناعي.',
        },
      },
    ],
  }),
];

export const getModalTour = (modalKey: string): ModalTour | null =>
  MODAL_TOURS.find((t) => t.key === modalKey) ?? null;
