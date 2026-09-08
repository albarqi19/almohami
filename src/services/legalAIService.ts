/**
 * خدمة الذكاء الاصطناعي القانوني
 * Legal AI Service - Integration with Google Gemini
 * 
 * هذه الخدمة توفر أدوات ذكاء اصطناعي متخصصة للمحامين
 */

// أنواع أدوات الذكاء الاصطناعي القانونية
export type LegalAIToolType =
  | 'legal_formalization'      // تحويل الصياغة القانونية
  | 'risk_assessment'          // كشف الثغرات والمخاطر
  | 'plain_language'           // تبسيط اللغة
  | 'legal_proofreading'       // التدقيق اللغوي والقانوني
  | 'legal_proofreading_annotations' // تدقيق مع ملاحظات قابلة للتطبيق
  | 'missing_clauses'          // اقتراح البنود الغائبة
  | 'executive_summary'        // تلخيص المذكرات
  | 'counter_argument'         // تفنيد الحجج
  | 'formal_government'        // صياغة رسمية للجهات الحكومية
  | 'extract_obligations'      // استخراج الالتزامات
  | 'penalty_clause'           // اقتراح شرط جزائي
  | 'impact_simulation';       // محاكاة الأثر الواقعي

// واجهة طلب AI
export interface LegalAIRequest {
  tool: LegalAIToolType;
  selectedText: string;
  documentContext?: string;  // السياق الإضافي من المستند
  customInstructions?: string;  // تعليمات مخصصة
}

// واجهة استجابة AI
export interface LegalAIResponse {
  success: boolean;
  result?: string;
  suggestions?: string[];
  warnings?: string[];
  error?: string;
  toolUsed: LegalAIToolType;
  processingTime?: number;
}

// معلومات الأداة للعرض
export interface LegalAIToolInfo {
  id: LegalAIToolType;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  icon: string;
  category: 'formalization' | 'analysis' | 'summary' | 'creative';
}

// قائمة الأدوات المتاحة
export const LEGAL_AI_TOOLS: LegalAIToolInfo[] = [
  // تحسين الصياغة
  {
    id: 'legal_formalization',
    nameAr: 'صياغة قانونية رصينة',
    nameEn: 'Legal Formalization',
    descriptionAr: 'تحويل النص إلى لغة قانونية محكمة ورصينة',
    icon: '⚖️',
    category: 'formalization'
  },
  {
    id: 'plain_language',
    nameAr: 'تبسيط للعميل',
    nameEn: 'Plain Language',
    descriptionAr: 'تبسيط النص القانوني لشرحه للعميل',
    icon: '💬',
    category: 'formalization'
  },
  {
    id: 'formal_government',
    nameAr: 'صياغة حكومية رسمية',
    nameEn: 'Formal Government',
    descriptionAr: 'صياغة رسمية مناسبة للجهات الحكومية',
    icon: '🏛️',
    category: 'formalization'
  },
  // التحليل القانوني
  {
    id: 'risk_assessment',
    nameAr: 'كشف المخاطر والثغرات',
    nameEn: 'Risk Assessment',
    descriptionAr: 'تحليل النص وتحديد المخاطر والثغرات القانونية',
    icon: '🔍',
    category: 'analysis'
  },
  {
    id: 'legal_proofreading',
    nameAr: 'التدقيق القانوني واللغوي',
    nameEn: 'Legal Proofreading',
    descriptionAr: 'فحص التناقضات واتساق المصطلحات',
    icon: '✅',
    category: 'analysis'
  },
  {
    id: 'legal_proofreading_annotations',
    nameAr: 'تدقيق مع تمييز وتصحيح',
    nameEn: 'Annotated Proofreading',
    descriptionAr: 'يُرجع ملاحظات تُميّز داخل النص مع زر تطبيق التصحيح',
    icon: '🖍️',
    category: 'analysis'
  },
  {
    id: 'missing_clauses',
    nameAr: 'اقتراح بنود مكملة',
    nameEn: 'Missing Clauses',
    descriptionAr: 'اقتراح بنود إضافية مهمة بناءً على السياق',
    icon: '➕',
    category: 'analysis'
  },
  // التلخيص والإيجاز
  {
    id: 'executive_summary',
    nameAr: 'ملخص تنفيذي',
    nameEn: 'Executive Summary',
    descriptionAr: 'تلخيص النص في نقاط مركزة وواضحة',
    icon: '📋',
    category: 'summary'
  },
  {
    id: 'extract_obligations',
    nameAr: 'استخراج الالتزامات',
    nameEn: 'Extract Obligations',
    descriptionAr: 'استخراج الالتزامات والحقوق من النص',
    icon: '📝',
    category: 'summary'
  },
  // الدعم الابتكاري
  {
    id: 'counter_argument',
    nameAr: 'تفنيد وردود قانونية',
    nameEn: 'Counter Argument',
    descriptionAr: 'اقتراح ردود قانونية منطقية على الحجج',
    icon: '⚔️',
    category: 'creative'
  },
  {
    id: 'penalty_clause',
    nameAr: 'اقتراح شرط جزائي',
    nameEn: 'Penalty Clause',
    descriptionAr: 'اقتراح شرط جزائي مناسب للبند',
    icon: '💰',
    category: 'creative'
  },
  {
    id: 'impact_simulation',
    nameAr: 'محاكاة الأثر',
    nameEn: 'Impact Simulation',
    descriptionAr: 'محاكاة السيناريوهات والأثر المالي والقانوني الواقعي',
    icon: '🎯',
    category: 'creative'
  }
];

// البرومبتات المتخصصة لكل أداة
const LEGAL_PROMPTS: Record<LegalAIToolType, string> = {
  legal_formalization: `أنت محامٍ سعودي خبير متخصص في الصياغة القانونية الرصينة.

المهمة: تحويل النص التالي إلى صياغة قانونية محكمة ورصينة تتوافق مع الأسلوب القانوني السعودي.

الإرشادات:
1. استخدم المصطلحات القانونية الدقيقة والمعتمدة في المملكة العربية السعودية
2. تجنب الغموض والتكرار
3. اجعل العبارات واضحة لا تحتمل التأويل
4. استخدم صيغة المبني للمجهول عند الحاجة
5. راعِ التسلسل المنطقي للأفكار
6. استخدم "يلتزم" و"يتعهد" و"يقر" بشكل صحيح
7. تجنب الألفاظ العامية أو غير الرسمية

النص المطلوب تحويله:
{TEXT}

قدم النص بالصياغة القانونية الرصينة مباشرة دون مقدمات.`,

  risk_assessment: `أنت مستشار قانوني سعودي خبير متخصص في تحليل المخاطر القانونية ومراجعة العقود.

المهمة: تحليل النص التالي وكشف جميع المخاطر والثغرات القانونية بشكل شامل ومنظم.

═══════════════════════════════════════
📋 منهجية التحليل:
═══════════════════════════════════════

1. تحليل كل بند/جملة على حدة
2. كشف الألفاظ الغامضة أو القابلة للتأويل
3. تحديد الالتزامات غير المتوازنة
4. فحص التوافق مع الأنظمة السعودية
5. اكتشاف البنود المفخخة أو الشروط المجحفة

═══════════════════════════════════════
📊 هيكل التقرير المطلوب:
═══════════════════════════════════════

【ملخص تنفيذي】
⚠️ عدد المخاطر المكتشفة: X
🔴 حرجة: X | 🟠 عالية: X | 🟡 متوسطة: X | 🟢 منخفضة: X
📌 التوصية العامة: (التوقيع بحذر / يحتاج تعديلات جوهرية / لا يُنصح بالتوقيع)

【جدول المخاطر التفصيلي】

لكل خطر قدم:
┌─────────────────────────────────────
│ 🔴/🟠/🟡/🟢 الخطر رقم (X): [عنوان الخطر]
├─────────────────────────────────────
│ 📍 الموقع: "اقتباس النص المحدد"
│ ⚡ نوع الخطر: (غموض / عدم توازن / مخالفة نظامية / بند مفقود / شرط مجحف)
│ 💥 الأثر المحتمل: (وصف ما قد يحدث)
│ 🛡️ التعديل المقترح: (الصياغة البديلة)
└─────────────────────────────────────

【فحص الامتثال النظامي】
- نظام الشركات: ✅/❌
- نظام العمل: ✅/❌
- نظام المعاملات التجارية: ✅/❌
- أنظمة أخرى ذات صلة: ✅/❌

【البنود المفقودة الخطرة】
قائمة بالبنود الضرورية غير الموجودة

【خلاصة للموكل】
فقرة مختصرة بلغة بسيطة تشرح الوضع للعميل

═══════════════════════════════════════
النص المراد تحليله:
═══════════════════════════════════════
{TEXT}

قدم التحليل بالهيكل أعلاه بشكل منظم وواضح.`,

  plain_language: `أنت مستشار قانوني متخصص في تبسيط النصوص القانونية للعملاء.

المهمة: تحويل النص القانوني التالي إلى لغة بسيطة وواضحة يفهمها الشخص العادي.

الإرشادات:
1. استخدم لغة يومية بسيطة
2. اشرح المصطلحات القانونية بين قوسين عند ذكرها
3. استخدم أمثلة عملية عند الحاجة
4. قسّم النص إلى نقاط واضحة
5. حافظ على المعنى القانوني الدقيق
6. تجنب الجمل الطويلة المعقدة

النص القانوني:
{TEXT}

قدم الشرح المبسط مباشرة بشكل واضح ومفهوم.`,

  legal_proofreading: `أنت مدقق قانوني ولغوي سعودي متخصص.

المهمة: فحص النص التالي للكشف عن الأخطاء والتناقضات.

الإرشادات:
1. تحقق من اتساق المصطلحات (مثلاً: عدم استخدام "المستأجر" و"المستثمر" لنفس الشخص)
2. اكتشف التناقضات في البنود
3. حدد الأخطاء النحوية والإملائية
4. تحقق من صحة الإشارات والأرقام
5. تحقق من اكتمال الجمل والعبارات
6. تأكد من وضوح المرجعيات (هذا، ذلك، المذكور أعلاه)

النص المراد فحصه:
{TEXT}

قدم قائمة بالملاحظات مع موقعها واقتراح التصحيح.`,

  legal_proofreading_annotations: `أنت مدقق قانوني ولغوي سعودي متخصص.

المهمة: راجع النص التالي، ثم أخرج ملاحظات تصحيح قابلة للتطبيق داخل نفس النص.

مخرجاتك يجب أن تكون JSON فقط (بدون Markdown وبدون شرح خارج JSON) وبالهيكل التالي تماماً:

[
  {
    "original_text": "النص الدقيق من الفقرة الذي يحتاج تعديل",
    "suggested_text": "النص المقترح البديل",
    "reason": "شرح موجز للسبب القانوني أو الفني للتعديل",
    "severity": "high" | "medium" | "low",
    "legal_reference": "المادة القانونية إن وجدت"
  }
]

قيود صارمة جداً:
1) اجعل original_text مطابقاً حرفياً تماماً لجزء موجود داخل النص (حتى يتمكن النظام من تحديده).
2) لا تكرر نفس original_text أكثر من مرة.
3) لا تتجاوز 15 ملاحظة.
4) إن لم توجد ملاحظات، أعد [] فقط.

النص المراد مراجعته:
{TEXT}
`,

  missing_clauses: `أنت محامٍ سعودي خبير في صياغة العقود والاتفاقيات، متخصص في اكتشاف الثغرات وسد الفراغات التعاقدية.

المهمة: تحليل النص التالي واقتراح البنود المكملة الضرورية مع صياغتها جاهزة للإضافة.

═══════════════════════════════════════
📋 منهجية الفحص:
═══════════════════════════════════════

1. تحديد نوع العقد وأطرافه
2. فحص البنود الأساسية المطلوبة لهذا النوع
3. اكتشاف الفجوات والبنود المفقودة
4. ترتيب البنود حسب الأهمية والخطورة

═══════════════════════════════════════
📊 هيكل التقرير المطلوب:
═══════════════════════════════════════

【تحليل العقد】
┌─────────────────────────────────────
│ 📄 نوع العقد: (بيع / إيجار / شراكة / توظيف / خدمات / ...)
│ 👥 الأطراف: (الطرف الأول / الطرف الثاني)
│ 📊 مستوى الاكتمال: (X%)
│ ⚠️ عدد البنود المفقودة: (X بنود)
└─────────────────────────────────────

【البنود الحرجة المفقودة】 🔴
بنود غيابها يشكل خطراً كبيراً:

━━━━ البند المقترح (1): [اسم البند] ━━━━
❗ سبب الأهمية: (لماذا هذا البند ضروري)
📝 الصياغة الجاهزة:
┌─────────────────────────────────────
│ "[نص البند القانوني الكامل جاهز للنسخ]"
└─────────────────────────────────────

━━━━ البند المقترح (2): [اسم البند] ━━━━
❗ سبب الأهمية: ...
📝 الصياغة الجاهزة:
┌─────────────────────────────────────
│ "..."
└─────────────────────────────────────

【البنود المهمة المفقودة】 🟠
بنود مهمة يُنصح بإضافتها:

━━━━ البند المقترح: [اسم البند] ━━━━
📝 الصياغة الجاهزة:
"..."

【البنود المستحسنة】 🟡
بنود تعزز العقد وتحسّنه:

• [اسم البند]: "[الصياغة المختصرة]"
• [اسم البند]: "[الصياغة المختصرة]"

【قائمة الفحص السريع】
✅/❌ شرط السرية
✅/❌ آلية فض النزاعات
✅/❌ الاختصاص القضائي
✅/❌ شروط الإنهاء والفسخ
✅/❌ القوة القاهرة
✅/❌ الضمانات
✅/❌ حدود المسؤولية
✅/❌ الملكية الفكرية
✅/❌ عدم المنافسة
✅/❌ التعويضات والجزاءات

【ملخص للموكل】
فقرة مبسطة توضح للعميل ما ينقص العقد

═══════════════════════════════════════
النص المراد تحليله:
═══════════════════════════════════════
{TEXT}

قدم التحليل والبنود المقترحة بالهيكل أعلاه، مع التأكد من أن كل صياغة جاهزة للنسخ والإضافة مباشرة.`,

  executive_summary: `أنت مستشار قانوني سعودي متخصص في تلخيص المستندات القانونية.

المهمة: تلخيص النص التالي في نقاط مركزة وواضحة.

الإرشادات:
1. استخرج الأفكار الرئيسية فقط
2. رتب النقاط حسب الأهمية
3. حافظ على الدقة القانونية
4. اذكر الأطراف والالتزامات الرئيسية
5. حدد المواعيد والمبالغ المهمة
6. لا تتجاوز 5-7 نقاط رئيسية

النص المراد تلخيصه:
{TEXT}

قدم الملخص التنفيذي في نقاط واضحة ومرقمة.`,

  counter_argument: `أنت محامٍ سعودي متمرس ومحترف في المرافعات والترافع أمام المحاكم السعودية، خبير في بناء الحجج القانونية وتفنيد ادعاءات الخصوم.

المهمة: تحليل الحجة/الادعاء التالي وبناء ردود قانونية قوية ومتماسكة لتفنيده.

═══════════════════════════════════════
📋 منهجية التفنيد:
═══════════════════════════════════════

1. فهم الحجة وتحديد ما يدعيه الخصم
2. كشف المغالطات المنطقية والثغرات
3. إيجاد الأسانيد النظامية والشرعية
4. بناء الرد بأسلوب المرافعات القضائية

═══════════════════════════════════════
📊 هيكل الرد المطلوب:
═══════════════════════════════════════

【تحليل حجة الخصم】
┌─────────────────────────────────────
│ 📌 جوهر الادعاء: (ماذا يدعي الخصم بالضبط)
│ 🎯 ما يريد إثباته: (الهدف من الحجة)
│ 📋 الأدلة التي استند إليها: (إن وجدت)
└─────────────────────────────────────

【نقاط الضعف المكتشفة】
⚡ الثغرة (1): ...
⚡ الثغرة (2): ...
⚡ الثغرة (3): ...

【الردود القانونية】

🔷 الرد الأول: [العنوان]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 السند النظامي: (المادة/النظام)
💬 نص الرد بأسلوب المرافعة:
"...[الرد بصيغة جاهزة للاستخدام في المذكرة]..."

🔷 الرد الثاني: [العنوان]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 السند النظامي: (المادة/النظام)
💬 نص الرد بأسلوب المرافعة:
"..."

🔷 الرد الثالث: [العنوان]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 السند النظامي: (المادة/النظام)
💬 نص الرد بأسلوب المرافعة:
"..."

【الرد المركّب الموصى به】
فقرة متكاملة تجمع أقوى الردود، جاهزة للنسخ في المذكرة:
"ومن حيث ما أثاره المدعى عليه/المدعي من أن... فإن ذلك مردود عليه بأن..."

【أسئلة استجواب مقترحة】
إذا كان هناك جلسة، أسئلة يمكن طرحها على الخصم لإضعاف حجته:
❓ السؤال (1): ...
❓ السؤال (2): ...

【مبادئ قضائية داعمة】
أي مبادئ من ديوان المظالم أو المحكمة العليا تدعم موقفك

═══════════════════════════════════════
الحجة أو الادعاء المراد تفنيده:
═══════════════════════════════════════
{TEXT}

قدم التفنيد بالهيكل أعلاه بأسلوب قانوني قوي ومقنع.`,

  formal_government: `أنت كاتب قانوني متخصص في المخاطبات الرسمية للجهات الحكومية السعودية.

المهمة: إعادة صياغة النص التالي بأسلوب رسمي مناسب للجهات الحكومية.

الإرشادات:
1. استخدم صيغة المخاطبة الرسمية (معالي، سعادة، إلخ)
2. ابدأ بالتحية الرسمية المناسبة
3. استخدم لغة رسمية محترمة
4. راعِ التسلسل الإداري
5. استخدم "أرجو التكرم" و"نأمل" و"نرفق لكم"
6. اختم بعبارات الاحترام المناسبة

النص الأصلي:
{TEXT}

قدم النص بالصياغة الرسمية الحكومية مباشرة.`,

  extract_obligations: `أنت محلل عقود سعودي متخصص في استخراج الالتزامات والحقوق.

المهمة: استخراج جميع الالتزامات والحقوق من النص التالي.

الإرشادات:
1. حدد التزامات كل طرف بشكل منفصل
2. حدد حقوق كل طرف بشكل منفصل
3. اذكر المواعيد والشروط المرتبطة
4. حدد العقوبات المترتبة على الإخلال
5. رتب الالتزامات حسب الأولوية الزمنية
6. استخدم جداول واضحة إن أمكن

النص المراد تحليله:
{TEXT}

قدم جدولاً واضحاً بالالتزامات والحقوق لكل طرف.`,

  penalty_clause: `أنت محامٍ سعودي متخصص في صياغة الشروط الجزائية.

المهمة: اقتراح شرط جزائي مناسب للبند أو الالتزام التالي.

الإرشادات:
1. اجعل الشرط الجزائي متناسباً مع الضرر المتوقع
2. راعِ أحكام الشريعة الإسلامية والأنظمة السعودية
3. حدد آلية احتساب التعويض
4. اذكر الحالات المستثناة (القوة القاهرة مثلاً)
5. اجعل الصياغة واضحة لا تحتمل التأويل
6. قدم أكثر من خيار بدرجات مختلفة

البند أو الالتزام:
{TEXT}

قدم 2-3 صيغ مختلفة للشرط الجزائي مع توضيح مميزات كل صيغة.`,

  impact_simulation: `أنت مستشار قانوني ومالي سعودي خبير، متخصص في تحليل المخاطر وتقدير الأثر الواقعي للعقود والبنود القانونية.

المهمة: تحليل النص القانوني التالي وإنشاء محاكاة شاملة لأثره المالي والقانوني على أرض الواقع.

═══════════════════════════════════════
📋 الإرشادات الأساسية:
═══════════════════════════════════════

1. افهم طبيعة العقد والأطراف من السياق
2. افترض أرقاماً منطقية وواقعية بناءً على نوع العقد (عقارات، شركات، توظيف، إلخ)
3. استند إلى الأنظمة السعودية المعمول بها (نظام الشركات، نظام العمل، نظام المحاكم التجارية، إلخ)
4. قدم تقديرات زمنية واقعية لإجراءات المحاكم السعودية
5. احسب التكاليف الفعلية (رسوم قضائية، أتعاب محاماة، خسائر التعطيل)

═══════════════════════════════════════
📊 هيكل المحاكاة المطلوب:
═══════════════════════════════════════

【الوضعية الحالية】
- صف الوضع الافتراضي للأطراف
- حدد القيم والأرقام المفترضة بناءً على السياق

【السيناريو (أ): المسار المتفائل - Best Case】
✅ ماذا يحدث إذا سارت الأمور بشكل طبيعي؟
- النتيجة المتوقعة
- المكاسب أو الاستقرار المحقق

【السيناريو (ب): المسار الكارثي - Worst Case】
⚠️ ماذا يحدث في حال النزاع أو تفعيل هذا البند؟
- الخسارة المالية المباشرة (بالأرقام)
- الخسارة غير المباشرة (فرص ضائعة، سمعة، وقت)
- موقف الطرف الآخر القانوني
- نسبة نجاح الطعن أو الدعوى (%)
- المدة المتوقعة في المحاكم السعودية
- التكاليف القضائية التقريبية

【السيناريو (ج): ماذا لو؟ - What-If Analysis】
🔄 اقترح تعديلاً واحداً على النص ووضح كيف يتغير الأثر:
- التعديل المقترح
- الأثر بعد التعديل

【ملخص تنفيذي للموكل】
📌 فقرة مختصرة بلغة بسيطة يستطيع المحامي نسخها وإرسالها للعميل مباشرة

【توصية المستشار】
💡 النصيحة النهائية للمحامي

═══════════════════════════════════════
النص المطلوب تحليله:
═══════════════════════════════════════
{TEXT}

═══════════════════════════════════════
ملاحظات مهمة:
- استخدم أرقاماً واقعية متناسبة مع السياق السعودي
- إذا كان النص يتعلق بشركات، افترض قيماً منطقية (مثال: شركة ناشئة 1-10 مليون، شركة متوسطة 10-50 مليون)
- إذا كان عقد عمل، استخدم رواتب السوق السعودي
- إذا كان عقاري، استخدم أسعار السوق العقاري
- احسب تكاليف التقاضي: رسوم محاكم تجارية (5% من قيمة المطالبة بحد أقصى 1 مليون) + أتعاب محاماة (10-15%)
- المدد القضائية: محاكم تجارية (6-12 شهر للدرجة الأولى) + استئناف (3-6 أشهر)

قدم المحاكاة بشكل منظم وواضح باستخدام الهيكل أعلاه.`
};

// مفتاح API - يُقرأ من متغيرات البيئة في Vercel
// VITE_OPENROUTER_API_KEY يجب إضافته في Vercel Dashboard > Settings > Environment Variables
const getApiKeyFromEnv = (): string | null => {
  try {
    return import.meta.env.VITE_OPENROUTER_API_KEY || null;
  } catch {
    return null;
  }
};

// متغير لتخزين API Key
let geminiApiKey: string | null = getApiKeyFromEnv();

// دالة لتعيين API Key
export function setGeminiApiKey(apiKey: string): void {
  geminiApiKey = apiKey;
}

// دالة للحصول على API Key
export function getGeminiApiKey(): string | null {
  return geminiApiKey || getApiKeyFromEnv();
}

// دالة لمسح API Key
export function clearGeminiApiKey(): void {
  geminiApiKey = null;
}

// التحقق من وجود API Key
export function hasGeminiApiKey(): boolean {
  return !!geminiApiKey;
}

/**
 * استدعاء OpenRouter API - للاستخدام المباشر مع برومبتات مخصصة
 */
export async function callLegalAI(prompt: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('لم يتم تعيين مفتاح API. يرجى إدخال المفتاح في الإعدادات.');
  }

  const response = await fetch(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Law Firm System',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      throw new Error('مفتاح API غير صالح. يرجى التحقق من المفتاح.');
    }
    if (response.status === 429) {
      throw new Error('تم تجاوز حد الاستخدام. يرجى المحاولة لاحقاً.');
    }
    throw new Error(errorData.error?.message || `خطأ في الاتصال بـ OpenRouter: ${response.status}`);
  }

  const data = await response.json();

  // استخراج النص من استجابة OpenRouter
  const generatedText = data.choices?.[0]?.message?.content;
  if (!generatedText) {
    throw new Error('لم يتم استلام رد من AI. يرجى المحاولة مرة أخرى.');
  }

  return generatedText;
}

type DocumentAssistantColorCode = 'yellow' | 'red' | 'blue';

export interface DocumentAssistantHighlight {
  exact_text: string;
  comment: string;
  suggestion?: string;
  color_code: DocumentAssistantColorCode;
}

export interface DocumentAssistantResponse {
  answer: string;
  highlights: DocumentAssistantHighlight[];
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const unfenced = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(unfenced);
  } catch {
    // Attempt to extract the first top-level JSON object.
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const slice = unfenced.slice(start, end + 1);
      return JSON.parse(slice);
    }
    throw new Error('تعذر تحليل JSON من رد الذكاء الاصطناعي');
  }
}

function isColorCode(value: unknown): value is DocumentAssistantColorCode {
  return value === 'yellow' || value === 'red' || value === 'blue';
}

/**
 * Document-aware assistant for the notebook editor.
 * - Reads the current document content (text + optional Yoopta JSON blocks)
 * - Answers the user's question
 * - Returns highlights that can be visually linked back to the document
 */
export async function askDocumentAssistant(params: {
  question: string;
  documentText: string;
  documentBlocksJson?: unknown;
}): Promise<DocumentAssistantResponse> {
  const question = params.question?.trim();
  if (!question) {
    throw new Error('اكتب سؤالك أولاً');
  }

  const documentText = params.documentText ?? '';
  if (!documentText.trim()) {
    throw new Error('المستند فارغ. اكتب نصاً أولاً');
  }

  // Avoid extremely large payloads.
  const MAX_TEXT_CHARS = 18000;
  const safeText = documentText.length > MAX_TEXT_CHARS
    ? documentText.slice(0, MAX_TEXT_CHARS) + '\n\n[... تم اختصار النص لطول كبير ...]'
    : documentText;

  let blocksJsonSection = '';
  if (params.documentBlocksJson !== undefined) {
    try {
      const json = JSON.stringify(params.documentBlocksJson);
      // Include blocks JSON only if reasonably sized; otherwise omit to avoid breaking the request.
      if (json.length <= 25000) {
        blocksJsonSection = `\n\nسياق JSON Blocks (Yoopta):\n${json}`;
      }
    } catch {
      // ignore
    }
  }

  const prompt = `الدور: أنت "المساعد القانوني الذكي". مهمتك الإجابة على أسئلة المستخدم حول المستند القانوني المرفق بدقة متناهية، مع ربط الإجابة بالنص الأصلي عند الحاجة.

السياق (اقرأه كاملاً قبل الرد):
نص المستند (Plain Text):\n${safeText}${blocksJsonSection}

سؤال المستخدم: ${question}

التعليمات:
1) حلّل السؤال بناءً على النص الموجود فقط. لا تفترض معلومات غير موجودة.
2) إذا طلب المستخدم "تصحيح لغوي" أو "كشف أخطاء" أو "ثغرات" أو أي شيء يتطلب ربطاً بالنص، حدّد المواضع بدقة باستخدام exact_text مطابق حرفياً تماماً لنص موجود داخل المستند.
3) لا تخرج عن سياق المستند إلا إذا طلب المستخدم نصيحة عامة مرتبطة به.
4) المخرجات يجب أن تكون JSON فقط (بدون Markdown وبدون أي شرح خارج JSON) وبالهيكل التالي تماماً:

{
  "answer": "...",
  "highlights": [
    {
      "exact_text": "النص المراد تمييزه من المستند",
      "comment": "سبب التمييز أو الاقتراح",
      "suggestion": "النص البديل (إن وجد)",
      "color_code": "yellow" | "red" | "blue"
    }
  ]
}

قيود:
- اجعل highlights قصيرة (حد أقصى 12).
- لا تكرر exact_text.
- إذا لم توجد تمييزات، اجعل highlights: []
`;

  const raw = await callLegalAI(prompt);
  const parsed = extractJsonObject(raw);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('رد الذكاء الاصطناعي غير صالح');
  }

  const obj = parsed as any;
  const answer = typeof obj.answer === 'string' ? obj.answer.trim() : '';
  const highlightsRaw = Array.isArray(obj.highlights) ? obj.highlights : [];

  const highlights: DocumentAssistantHighlight[] = highlightsRaw
    .filter((h: any) => h && typeof h === 'object')
    .map((h: any) => ({
      exact_text: typeof h.exact_text === 'string' ? h.exact_text.trim() : '',
      comment: typeof h.comment === 'string' ? h.comment.trim() : '',
      suggestion: typeof h.suggestion === 'string' ? h.suggestion.trim() : undefined,
      color_code: isColorCode(h.color_code) ? h.color_code : 'yellow',
    }))
    .filter((h: DocumentAssistantHighlight) => h.exact_text && h.comment);

  if (!answer) {
    throw new Error('لم يتم استلام إجابة صالحة من الذكاء الاصطناعي');
  }

  // De-duplicate by exact_text.
  const seen = new Set<string>();
  const deduped = highlights.filter((h) => {
    if (seen.has(h.exact_text)) return false;
    seen.add(h.exact_text);
    return true;
  });

  return {
    answer,
    highlights: deduped.slice(0, 12),
  };
}

/**
 * معالجة طلب الذكاء الاصطناعي القانوني
 */
export async function processLegalAIRequest(request: LegalAIRequest): Promise<LegalAIResponse> {
  const startTime = Date.now();

  try {
    // التحقق من وجود نص
    if (!request.selectedText?.trim()) {
      return {
        success: false,
        error: 'يرجى تحديد نص للمعالجة',
        toolUsed: request.tool
      };
    }

    // الحصول على البرومبت المناسب
    const promptTemplate = LEGAL_PROMPTS[request.tool];
    if (!promptTemplate) {
      return {
        success: false,
        error: 'أداة غير معروفة',
        toolUsed: request.tool
      };
    }

    // بناء البرومبت النهائي
    let finalPrompt = promptTemplate.replace('{TEXT}', request.selectedText);

    // إضافة السياق إن وجد
    if (request.documentContext) {
      finalPrompt = `سياق المستند:\n${request.documentContext}\n\n${finalPrompt}`;
    }

    // إضافة تعليمات مخصصة إن وجدت
    if (request.customInstructions) {
      finalPrompt += `\n\nتعليمات إضافية: ${request.customInstructions}`;
    }

    // استدعاء API
    const result = await callLegalAI(finalPrompt);

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      result,
      toolUsed: request.tool,
      processingTime
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      toolUsed: request.tool,
      processingTime
    };
  }
}

/**
 * الحصول على معلومات أداة معينة
 */
export function getToolInfo(toolType: LegalAIToolType): LegalAIToolInfo | undefined {
  return LEGAL_AI_TOOLS.find(tool => tool.id === toolType);
}

/**
 * الحصول على الأدوات حسب الفئة
 */
export function getToolsByCategory(category: LegalAIToolInfo['category']): LegalAIToolInfo[] {
  return LEGAL_AI_TOOLS.filter(tool => tool.category === category);
}
