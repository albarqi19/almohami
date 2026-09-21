import React, { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  FileText,
  User,
  Calendar,
  Clock,
  DollarSign,
  MessageSquareText,
  FileEdit,
  Building2,
  Award,
  Scale,
  ShieldCheck,
  Users,
  Home,
  Lightbulb,
  Bell,
  GraduationCap,
  Play,
  Square,
  Plus,
  Trash2,
  Eye,
  Upload,
  ExternalLink,
  ChevronDown,
  Check,
  AlertTriangle,
  ArrowRightLeft,
  Receipt,
  X,
  Link,
  CheckCircle,
  FileCheck,
  Info,
  Layers,
  AlignLeft,
  StickyNote,
  MoreHorizontal,
  ArrowLeft,
  Lock,
  Compass,
  Pencil,
  Send,
  Download,
  Mail,
  Paperclip,
} from 'lucide-react';

import { toast } from 'react-toastify';

import { LegalServiceService } from '../../services/legalServiceService';
import { TaskService } from '../../services/taskService';
import type { Task } from '../../types';
import { apiClient, API_BASE_URL } from '../../utils/api';
import { LOCKED_STATUSES, isServiceContentLocked } from '../../utils/serviceContentLock';
import { getApiErrorMessage } from '../../utils/apiError';
import AddExternalLinkModal from '../../components/AddExternalLinkModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { safeExternalHref, externalLinkHost, type ExternalLinkPayload } from '../../types';
import LegalRichEditorField from '../../components/legal-services/LegalRichEditorField';
import DeliverablesPanel from '../../components/legal-services/DeliverablesPanel';
import PortalLinksPanel from '../../components/legal-services/PortalLinksPanel';
import EditServiceModal from '../../components/legal-services/EditServiceModal';
import type {
  LegalService,
  ServiceTimeEntryItem,
  StatusFlowItem,
  ServiceDeletionImpact,
} from '../../types/legalServices';
import {
  SERVICE_TYPE_LABELS,
  PRIORITY_LABELS,
  BILLING_TYPE_LABELS,
  CONVERTIBLE_SERVICE_TYPES,
} from '../../types/legalServices';
import { WorkspaceRegistry, SkeletonCard } from '../../components/legal-services/workspaces';
import { usePermission } from '../../hooks/usePermission';
import { StatTile } from '../../components/charts/RaedCharts';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { flowView, sortTransitions, transitionKind, type FlowView } from '../../utils/serviceFlow';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

// مساحة صياغة العقد (ورقة الكتابة + لوحاتها) — تُحمَّل عند فتح تبويبها فقط
const ContractDraftingWorkspace = lazyWithRetry(
  () => import('../../components/legal-services/contract/ContractDraftingWorkspace'),
);

// مساحة الاستشارة (ورقة الرأي + ما يُبنى عليه) — تُحمَّل عند فتح تبويبها فقط
const ConsultationWorkspace = lazyWithRetry(
  () => import('../../components/legal-services/consultation/ConsultationWorkspace'),
);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** مفتاح تبويب العمل لكل نوع — مرآة `SERVICE_TYPE_TAB_MAP` داخل المكوّن */
function defaultTabFor(serviceType: string): string {
  if (serviceType === 'consultation') return 'consultation';
  if (serviceType === 'contract_drafting') return 'contract';
  return serviceType === 'simple' ? 'info' : 'type_detail';
}

// خط سير الحالات ثابت لكل نوع خدمة — يكفي جلبه مرة واحدة في الجلسة
const statusFlowCache = new Map<string, StatusFlowItem[]>();

const STATUS_LABELS: Record<string, string> = {
  // عام
  new: 'جديدة',
  in_progress: 'قيد التنفيذ',
  under_review: 'تحت المراجعة',
  completed: 'مكتملة',
  closed: 'مغلقة',
  cancelled: 'ملغية',
  // الاستشارات
  draft_ready: 'المسودة جاهزة',
  internal_review: 'مراجعة داخلية',
  delivered: 'تم التسليم',
  // صياغة العقود
  drafting: 'قيد الصياغة',
  client_review: 'مراجعة العميل',
  revision: 'قيد التعديل',
  approved: 'معتمدة',
  signed: 'تم التوقيع',
  archived: 'مؤرشفة',
  // تأسيس الشركات
  document_collection: 'جمع المستندات',
  name_reservation: 'حجز الاسم',
  aoa_drafting: 'صياغة عقد التأسيس',
  government_submission: 'تقديم للجهات الحكومية',
  cr_issued: 'تم إصدار السجل',
  post_cr_setup: 'إجراءات ما بعد السجل',
  // التراخيص
  document_preparation: 'تجهيز المستندات',
  submitted: 'تم التقديم',
  rejected: 'مرفوضة',
  active: 'فعّالة',
  renewal_pending: 'قيد التجديد',
  renewed: 'تم التجديد',
  // التحكيم
  case_study: 'دراسة القضية',
  parties_notified: 'تم إبلاغ الأطراف',
  hearing_scheduled: 'جلسة مجدولة',
  hearing_in_progress: 'جلسة قيد الانعقاد',
  deliberation: 'مداولة',
  settlement_reached: 'تمت التسوية',
  award_issued: 'صدر الحكم',
  enforcement: 'قيد التنفيذ',
  // الامتثال
  assessment: 'التقييم',
  gap_analysis: 'تحليل الفجوات',
  action_plan: 'خطة العمل',
  implementation: 'التنفيذ',
  review: 'المراجعة',
  compliant: 'ملتزم',
  monitoring: 'المراقبة',
  // العمالي
  analysis: 'التحليل',
  friendly_settlement: 'تسوية ودية',
  negotiation: 'التفاوض',
  resolution: 'الحل',
  escalated_to_case: 'تصعيد لقضية',
  documentation: 'التوثيق',
  // العقارات
  property_review: 'مراجعة العقار',
  legal_analysis: 'التحليل القانوني',
  registration: 'التسجيل',
  // العناية الواجبة
  scope_definition: 'تحديد النطاق',
  data_collection: 'جمع البيانات',
  findings_review: 'مراجعة النتائج',
  report_drafting: 'إعداد التقرير',
  report_delivered: 'تم تسليم التقرير',
  // الملكية الفكرية
  search_phase: 'مرحلة البحث',
  filing: 'الإيداع',
  examination: 'الفحص',
  publication: 'النشر',
  objection_received: 'ورد اعتراض',
  renewal_due: 'مستحق التجديد',
  // الإنذارات
  sent: 'تم الإرسال',
  returned: 'مُعاد',
  response_received: 'ورد رد',
  no_response: 'لا يوجد رد',
  // التدريب
  planning: 'التخطيط',
  content_preparation: 'إعداد المحتوى',
  registration_open: 'التسجيل مفتوح',
  certificates_issued: 'تم إصدار الشهادات',
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  sent: 'مُرسلة',
  paid: 'مدفوعة',
  partial: 'جزئية',
  overdue: 'متأخرة',
  cancelled: 'ملغية',
};

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

// ── شرح عملي لكل حالة (يطابق خريطة getStatusInArabic في الباك) ─────────────
// سطر واحد يجيب لمحامٍ غير تقني: «ماذا تعني هذه الحالة عملياً؟ وما المطلوب الآن؟»
const STATUS_EXPLANATIONS: Record<string, string> = {
  // عام
  new: 'الخدمة سُجّلت للتو ولم يبدأ العمل عليها بعد — ابدأ التنفيذ أو أسند محامياً.',
  in_progress: 'العمل جارٍ على الخدمة الآن — تابع الإنجاز وسجّل الوقت والمستندات.',
  under_review: 'العمل أُنجز مبدئياً وينتظر مراجعة قبل الخطوة التالية.',
  completed: 'اكتمل العمل على الخدمة — تحقق من الفوترة ثم أغلق الملف.',
  closed: 'الملف مغلق نهائياً — لا عمل متبقٍ على هذه الخدمة.',
  cancelled: 'أُلغيت الخدمة ولن يستمر العمل عليها.',
  // الاستشارات
  draft_ready: 'مسودة الرأي القانوني جاهزة — أرسلها للمراجعة الداخلية قبل التسليم.',
  internal_review: 'الرأي القانوني تحت مراجعة داخلية — بعد الإجازة يمكن تسليمه للعميل.',
  delivered: 'سُلّم للعميل — المحتوى مقفل ضد التعديل الآن.',
  // صياغة العقود
  drafting: 'العقد قيد الصياغة — أصدر مسودة جديدة كلما تقدّم العمل.',
  client_review: 'المسودة عند العميل للمراجعة — بانتظار ملاحظاته أو موافقته.',
  revision: 'وردت ملاحظات وتجري التعديلات — أصدر إصداراً معدّلاً.',
  approved: 'اعتُمدت الصيغة النهائية — المحتوى مقفل وجاهز للتوقيع.',
  signed: 'وُقّع العقد رسمياً من الأطراف.',
  archived: 'العقد مؤرشف — انتهى مسار العمل عليه.',
  // تأسيس الشركات
  document_collection: 'جارٍ جمع مستندات التأسيس من العميل — تابع النواقص.',
  name_reservation: 'جارٍ حجز الاسم التجاري لدى الجهة المختصة.',
  aoa_drafting: 'جارٍ صياغة عقد التأسيس والنظام الأساس.',
  government_submission: 'قُدّمت الأوراق للجهات الحكومية — بانتظار الرد.',
  cr_issued: 'صدر السجل التجاري — أكمل إجراءات ما بعد الإصدار.',
  post_cr_setup: 'جارٍ استكمال إجراءات ما بعد السجل (ملفات حكومية، حسابات...).',
  // التراخيص
  document_preparation: 'جارٍ تجهيز مستندات طلب الترخيص.',
  submitted: 'قُدّم الطلب للجهة المختصة — بانتظار المعالجة.',
  rejected: 'رُفض الطلب — راجع أسباب الرفض وقرّر إعادة التقديم.',
  active: 'الترخيص فعّال وساري المفعول.',
  renewal_pending: 'الترخيص قارب الانتهاء وجارٍ تجديده.',
  renewed: 'جُدّد الترخيص بنجاح.',
  // التحكيم
  case_study: 'جارٍ دراسة ملف النزاع وتقدير الموقف.',
  parties_notified: 'أُبلغ أطراف النزاع رسمياً ببدء إجراءات التحكيم.',
  hearing_scheduled: 'حُدّد موعد جلسة التحكيم — جهّز المستندات والمرافعة.',
  hearing_in_progress: 'جلسة التحكيم منعقدة حالياً.',
  deliberation: 'هيئة التحكيم في مرحلة المداولة قبل إصدار الحكم.',
  settlement_reached: 'توصّل الأطراف لتسوية — وثّق الاتفاق.',
  award_issued: 'صدر حكم التحكيم — تابع مرحلة التنفيذ.',
  enforcement: 'جارٍ تنفيذ الحكم أو التسوية.',
  // الامتثال
  assessment: 'جارٍ تقييم وضع الامتثال الحالي لدى العميل.',
  gap_analysis: 'جارٍ تحليل الفجوات بين الوضع الحالي والمتطلبات النظامية.',
  action_plan: 'جارٍ إعداد خطة معالجة الفجوات.',
  implementation: 'العميل ينفّذ خطة الامتثال — تابع التقدّم.',
  review: 'جارٍ مراجعة نتائج التنفيذ قبل إقرار الالتزام.',
  compliant: 'العميل ملتزم بالمتطلبات — يمكن الانتقال للمراقبة الدورية.',
  monitoring: 'مراقبة دورية لاستمرار الالتزام.',
  // العمالي
  analysis: 'جارٍ تحليل النزاع العمالي وتقدير الموقف النظامي.',
  friendly_settlement: 'جارٍ السعي لتسوية ودية بين الطرفين.',
  negotiation: 'مفاوضات جارية بين أطراف النزاع.',
  resolution: 'حُلّ النزاع — وثّق النتيجة النهائية.',
  escalated_to_case: 'صُعّدت الخدمة إلى قضية — تابع العمل من ملف القضية.',
  documentation: 'جارٍ توثيق ما تم الاتفاق عليه رسمياً.',
  // العقارات
  property_review: 'جارٍ مراجعة مستندات وبيانات العقار.',
  legal_analysis: 'جارٍ التحليل القانوني لوضع العقار أو الصفقة.',
  registration: 'أُنجز التسجيل/الإفراغ لدى الجهة المختصة.',
  // العناية الواجبة
  scope_definition: 'جارٍ تحديد نطاق الفحص والاتفاق عليه مع العميل.',
  data_collection: 'جارٍ جمع البيانات والمستندات محل الفحص.',
  findings_review: 'جارٍ مراجعة نتائج الفحص وتدقيقها.',
  report_drafting: 'جارٍ إعداد تقرير العناية الواجبة.',
  report_delivered: 'سُلّم التقرير النهائي للعميل.',
  // الملكية الفكرية
  search_phase: 'جارٍ البحث عن أسبقيات (علامات/براءات مشابهة) قبل الإيداع.',
  filing: 'جارٍ إيداع الطلب لدى الهيئة المختصة.',
  examination: 'الطلب تحت الفحص الموضوعي لدى الهيئة.',
  publication: 'نُشر الطلب — فترة الاعتراضات جارية.',
  objection_received: 'ورد اعتراض على الطلب — جهّز الرد النظامي.',
  renewal_due: 'حان موعد تجديد الحماية — بادر قبل انقضاء المهلة.',
  // الإنذارات
  sent: 'أُرسل الإنذار للطرف الآخر — راقب وصوله ورده.',
  returned: 'أُعيد الإنذار دون تسلُّم — قرّر وسيلة إبلاغ بديلة.',
  response_received: 'ورد رد من الطرف الآخر — قيّمه وحدّد الخطوة التالية.',
  no_response: 'انقضت المهلة دون رد — قرّر التصعيد لقضية أو الإغلاق.',
  // التدريب
  planning: 'جارٍ التخطيط للبرنامج التدريبي وتحديد موعده.',
  content_preparation: 'جارٍ إعداد المحتوى والمواد التدريبية.',
  registration_open: 'باب التسجيل مفتوح للمتدرّبين.',
  certificates_issued: 'أُصدرت شهادات الحضور للمتدرّبين.',
};

// ── آثار الانتقالات (مرآة منطق الباك في LegalServiceManager/LegalService) ──
// حالات تُنشئ فاتورة مسودة تلقائياً عند بلوغها (billingTriggerStatuses)
const BILLING_TRIGGER_STATUSES: Record<string, string[]> = {
  consultation: ['draft_ready'],
  contract_drafting: ['approved'],
  company_formation: ['cr_issued'],
  licenses: ['approved'],
  arbitration: ['award_issued', 'settlement_reached'],
  compliance: ['compliant'],
  labor: ['resolution'],
  real_estate: ['registration'],
  due_diligence: ['report_delivered'],
  ip: ['registration'],
  legal_notices: ['sent'],
  training: ['completed'],
};


/** تلميح مختصر بأثر الانتقال إلى حالة معيّنة (فاتورة تلقائية/قفل/إشعار عميل) */
function getTransitionHint(serviceType: string, target: string): string | null {
  const parts: string[] = [];
  const billing = BILLING_TRIGGER_STATUSES[serviceType] ?? ['completed'];
  const locked = LOCKED_STATUSES[serviceType] ?? ['completed'];

  if (billing.includes(target)) parts.push('فاتورة مسودة تلقائياً');
  if (locked.includes(target) || ['closed', 'archived', 'cancelled'].includes(target)) {
    parts.push('يُقفل المحتوى ضد التعديل');
  }
  // إشعار العميل: الاستشارة عند جاهزية المسودة/التسليم، وبقية الأنواع عند محطة الفوترة
  if (
    (serviceType === 'consultation' && (target === 'draft_ready' || target === 'delivered')) ||
    (serviceType !== 'consultation' && billing.includes(target))
  ) {
    parts.push('يصل إشعار للعميل');
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** «يوم / يومين / ٣ أيام / ١١ يوماً» — العدد العربي لا يُلصق به تمييز واحد */
function daysPhrase(n: number): string {
  if (n === 1) return 'يوم';
  if (n === 2) return 'يومين';
  const num = n.toLocaleString('ar-SA');
  return n >= 3 && n <= 10 ? `${num} أيام` : `${num} يوماً`;
}

/** كم بقي على الاستحقاق؟ — لا يُعرض لخدمةٍ انتهت دورتها */
function dueChipFor(
  service: Pick<LegalService, 'due_date' | 'status'>,
): { text: string; tone: 'ok' | 'warn' | 'bad' } | null {
  const DONE = ['closed', 'cancelled', 'archived', 'completed'];
  if (!service.due_date || DONE.includes(service.status)) return null;
  const due = new Date(service.due_date);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { text: `متأخرة ${daysPhrase(Math.abs(days))}`, tone: 'bad' };
  if (days === 0) return { text: 'تُستحق اليوم', tone: 'warn' };
  return { text: `بعد ${daysPhrase(days)}`, tone: days <= 3 ? 'warn' : 'ok' };
}

function invoicesPhrase(n: number): string {
  if (n === 1) return 'فاتورة واحدة';
  if (n === 2) return 'فاتورتان';
  const num = n.toLocaleString('ar-SA');
  return n >= 3 && n <= 10 ? `${num} فواتير` : `${num} فاتورة`;
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [
    String(h).padStart(2, '0'),
    String(m).padStart(2, '0'),
    String(s).padStart(2, '0'),
  ].join(':');
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocumentEmoji(
  mimeType?: string | null,
  externalUrl?: string | null,
  documentType?: string | null,
): string {
  // الرابط أوّلاً: كل الروابط mime_type واحد (text/uri-list) فلا يميّزها، والنوع في document_type.
  if (externalUrl) {
    switch ((documentType || '').toLowerCase()) {
      case 'image': return '🖼️';
      case 'video': return '🎬';
      case 'folder': return '📁';
      case 'web': return '🌐';
      default: return '📄';
    }
  }

  const t = (mimeType || '').toLowerCase();
  if (t.includes('pdf')) return '📄';
  // الجداول والعروض **قبل** الوورد: كل أنواع OOXML تحوي «officedocument» وهي تحوي «doc»،
  // فلو سبق فرعُ doc لوُسِم xlsx وpptx بأيقونة الوورد بمجرّد تمرير mime_type الصحيح.
  if (t.includes('sheet') || t.includes('excel') || t.includes('xls')) return '📊';
  if (t.includes('presentation') || t.includes('powerpoint') || t.includes('ppt')) return '📽️';
  if (t.includes('word') || t.includes('doc')) return '📝';
  if (t.includes('image') || t.includes('png') || t.includes('jpg')) return '🖼️';
  if (t.includes('zip') || t.includes('rar')) return '🗜️';
  return '📎';
}

/**
 * سطر النشاط كما يُقرأ. أسطر تغيير الحالة القديمة خُزّنت بمفاتيحها الخام
 * («تم تغيير الحالة من drafting إلى internal_review») — نعيد صياغتها من `metadata` بأسمائها العربية.
 */
function activityTitle(activity: { type: string; title: string; metadata: Record<string, unknown> | null }): string {
  const from = activity.metadata?.old_status;
  const to = activity.metadata?.new_status;
  if (activity.type === 'status_changed' && typeof from === 'string' && typeof to === 'string') {
    return `انتقلت من «${getStatusLabel(from)}» إلى «${getStatusLabel(to)}»`;
  }
  return activity.title;
}

function getActivityMarkerClass(type: string): string {
  switch (type) {
    case 'service_created': return 'lsd-timeline__marker--blue';
    case 'status_changed': return 'lsd-timeline__marker--orange';
    case 'document_added': return 'lsd-timeline__marker--green';
    case 'document_removed': return 'lsd-timeline__marker--red';
    case 'timer_started': return 'lsd-timeline__marker--purple';
    case 'timer_stopped': return 'lsd-timeline__marker--purple';
    case 'opinion_updated': return 'lsd-timeline__marker--navy';
    case 'invoice_created': return 'lsd-timeline__marker--green';
    case 'version_created': return 'lsd-timeline__marker--navy';
    default: return 'lsd-timeline__marker--blue';
  }
}

const SERVICE_TYPE_ICONS: Record<string, React.ElementType> = {
  consultation: MessageSquareText,
  contract_drafting: FileEdit,
  company_formation: Building2,
  licenses: Award,
  arbitration: Scale,
  compliance: ShieldCheck,
  labor: Users,
  real_estate: Home,
  due_diligence: FileCheck,
  ip: Lightbulb,
  legal_notices: Bell,
  training: GraduationCap,
};

const TYPE_PILL_CLASS: Record<string, string> = {
  consultation: 'ls-type-pill--consultation',
  contract_drafting: 'ls-type-pill--contract_drafting',
  company_formation: 'ls-type-pill--legal_memo',
  licenses: 'ls-type-pill--review',
  arbitration: 'ls-type-pill--review',
  compliance: 'ls-type-pill--representation',
  labor: 'ls-type-pill--other',
  real_estate: 'ls-type-pill--other',
  due_diligence: 'ls-type-pill--other',
  ip: 'ls-type-pill--notarization',
  legal_notices: 'ls-type-pill--other',
  training: 'ls-type-pill--other',
};

// ── Animation variants ────────────────────────────────────────────────────────

const tabVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.12 } },
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface StatusPipelineProps {
  view: FlowView;
  /** الخطوات في الطريق — نحجز ارتفاع الشريط كي لا يقفز المحتوى تحته حين تصل. */
  pending?: boolean;
}

/**
 * يرسم **المحطات الرئيسية** وحدها (انظر utils/serviceFlow). الفرع («تعديل»، «مرفوض»…) لا يُرسم
 * محطةً على الخط بل يُعلَّم على المحطة التي تفرّع منها، و«ملغاة» ليست محطةً في مسار أحد.
 */
const StatusPipeline: React.FC<StatusPipelineProps> = ({ view, pending = false }) => {
  const steps = view.path;
  if (!steps.length) {
    return pending ? <div className="lsd-status-pipeline lsd-status-pipeline--pending" aria-hidden="true" /> : null;
  }

  return (
    <div className={`lsd-status-pipeline${view.cancelled ? ' lsd-status-pipeline--cancelled' : ''}`}>
      {steps.map((step, idx) => {
        const isCompleted = !view.cancelled && idx < view.index;
        const isActive = !view.cancelled && idx === view.index;
        const stepClass = isCompleted
          ? 'lsd-pipeline-step--completed'
          : isActive
          ? `lsd-pipeline-step--active${view.branch ? ' lsd-pipeline-step--branch' : ''}`
          : 'lsd-pipeline-step--pending';

        return (
          <React.Fragment key={step.status}>
            <div className={`lsd-pipeline-step ${stepClass}`}>
              <div className="lsd-pipeline-step__content">
                <div className="lsd-pipeline-step__dot">
                  {isCompleted ? <Check size={12} /> : idx + 1}
                </div>
                <span className="lsd-pipeline-step__label">{step.label}</span>
              </div>
            </div>
            {idx < steps.length - 1 && <div className="lsd-pipeline-connector" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Convert to Case Modal ─────────────────────────────────────────────────────

interface ConvertToCaseModalProps {
  onConfirm: (title: string, caseType: string) => void;
  onClose: () => void;
  loading: boolean;
  defaultTitle: string;
}

const ConvertToCaseModal: React.FC<ConvertToCaseModalProps> = ({
  onConfirm,
  onClose,
  loading,
  defaultTitle,
}) => {
  const [title, setTitle] = useState(defaultTitle);
  const [caseType, setCaseType] = useState('civil');

  return (
    <div className="lsd-modal-overlay" onClick={onClose}>
      <motion.div
        className="lsd-modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lsd-modal__header">
          <div className="lsd-modal__title">
            <ArrowRightLeft size={16} />
            تحويل إلى قضية
          </div>
          <button className="lsd-modal__close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="lsd-modal__body">
          <div className="lsd-form-group">
            <label className="lsd-form-label">عنوان القضية</label>
            <input
              className="lsd-form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="أدخل عنوان القضية"
            />
          </div>
          <div className="lsd-form-group">
            <label className="lsd-form-label">نوع القضية</label>
            <select
              className="lsd-form-input"
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
            >
              <option value="civil">مدني</option>
              <option value="criminal">جنائي</option>
              <option value="commercial">تجاري</option>
              <option value="administrative">إداري</option>
              <option value="labor">عمالي</option>
              <option value="family">أسرة</option>
              <option value="real_estate">عقاري</option>
              <option value="other">أخرى</option>
            </select>
          </div>
        </div>
        <div className="lsd-modal__footer">
          <button className="lsd-header-btn" onClick={onClose}>
            إلغاء
          </button>
          <button
            className="lsd-header-btn lsd-header-btn--primary"
            onClick={() => onConfirm(title, caseType)}
            disabled={loading || !title.trim()}
          >
            {loading ? 'جارٍ التحويل...' : 'تحويل'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Create Invoice Modal ──────────────────────────────────────────────────────

interface CreateInvoiceModalProps {
  onConfirm: (title: string, amount: string, dueDate: string) => void;
  onClose: () => void;
  loading: boolean;
}

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  onConfirm,
  onClose,
  loading,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  return (
    <div className="lsd-modal-overlay" onClick={onClose}>
      <motion.div
        className="lsd-modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lsd-modal__header">
          <div className="lsd-modal__title">
            <Receipt size={16} />
            إنشاء فاتورة
          </div>
          <button className="lsd-modal__close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="lsd-modal__body">
          <div className="lsd-form-group">
            <label className="lsd-form-label">عنوان الفاتورة</label>
            <input
              className="lsd-form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: رسوم خدمة استشارة قانونية"
            />
          </div>
          <div className="lsd-form-group">
            <label className="lsd-form-label">المبلغ (ريال)</label>
            <input
              className="lsd-form-input"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="lsd-form-group">
            <label className="lsd-form-label">تاريخ الاستحقاق</label>
            <input
              className="lsd-form-input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <div className="lsd-modal__footer">
          <button className="lsd-header-btn" onClick={onClose}>
            إلغاء
          </button>
          <button
            className="lsd-header-btn lsd-header-btn--primary"
            onClick={() => onConfirm(title, amount, dueDate)}
            disabled={loading || !title.trim()}
          >
            {loading ? 'جارٍ الإنشاء...' : 'إنشاء'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Manual Time Entry Form ────────────────────────────────────────────────────

interface ManualTimeFormProps {
  onSave: (startedAt: string, endedAt: string, desc: string, billable: boolean) => void;
  onCancel: () => void;
  loading: boolean;
}

const ManualTimeForm: React.FC<ManualTimeFormProps> = ({ onSave, onCancel, loading }) => {
  const [startedAt, setStartedAt] = useState('');
  const [endedAt, setEndedAt] = useState('');
  const [description, setDescription] = useState('');
  const [isBillable, setIsBillable] = useState(true);

  return (
    <div className="lsd-inline-form">
      <div className="lsd-form-row">
        <div className="lsd-form-group">
          <label className="lsd-form-label">وقت البدء</label>
          <input
            className="lsd-form-input"
            type="datetime-local"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
          />
        </div>
        <div className="lsd-form-group">
          <label className="lsd-form-label">وقت الانتهاء</label>
          <input
            className="lsd-form-input"
            type="datetime-local"
            value={endedAt}
            onChange={(e) => setEndedAt(e.target.value)}
          />
        </div>
      </div>
      <div className="lsd-form-group">
        <label className="lsd-form-label">الوصف</label>
        <input
          className="lsd-form-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="وصف العمل المنجز..."
        />
      </div>
      <div className="lsd-form-check">
        <input
          type="checkbox"
          id="billable-check"
          checked={isBillable}
          onChange={(e) => setIsBillable(e.target.checked)}
        />
        <label htmlFor="billable-check">قابل للفوترة</label>
      </div>
      <div className="lsd-inline-form__actions">
        <button className="lsd-header-btn" onClick={onCancel}>
          إلغاء
        </button>
        <button
          className="lsd-header-btn lsd-header-btn--primary"
          onClick={() => onSave(startedAt, endedAt, description, isBillable)}
          disabled={loading || !startedAt || !endedAt}
        >
          {loading ? 'جارٍ الحفظ...' : 'حفظ'}
        </button>
      </div>
    </div>
  );
};

// ── New Version Form ──────────────────────────────────────────────────────────

/**
 * حذف الخدمة بنداءٍ مباشر لا عبر apiClient — عمداً لا سهواً:
 * فرعُ 409 في utils/api.ts يبني Error من `message` وحده ويُسقط `error_code` و`impact`،
 * وهما جوهر تدفّق التأكيد هنا (لا يمكن تمييز «يلزم تأكيد» عن أي تعارضٍ آخر بلا `error_code`،
 * ولا عرض الأرقام بلا `impact`). وutils/api.ts سطحٌ مشترك لا يُعدَّل من أجل شاشةٍ واحدة.
 *
 * لا نعالج 401 هنا: الشاشة لا تُفتح أصلاً إلا بجلسةٍ حيّة، وأي نداءٍ آخر عبر apiClient
 * سيتكفّل بالتوجيه لصفحة الدخول.
 */
/** جسم ردّ الحذف الذي نقرأه فعلاً — مصرَّحٌ بدل Record<string, any> كي لا يضيع التحقق النوعي. */
interface ServiceDeletionResponseBody {
  message?: string;
  error_code?: string;
  impact?: ServiceDeletionImpact;
}

async function requestServiceDeletion(
  id: number,
  confirm: boolean,
): Promise<{ ok: boolean; status: number; body: ServiceDeletionResponseBody }> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(
    `${API_BASE_URL}/legal-services/${id}${confirm ? '?confirm=1' : ''}`,
    {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  const body: ServiceDeletionResponseBody = await response
    .json()
    .catch(() => ({} as ServiceDeletionResponseBody));
  // الـfetch الخام يتجاوز فرع 401 في utils/api.ts الذي يمسح التوكن ويوجّه لصفحة الدخول،
  // فبتوكنٍ منتهٍ كان المستخدم يرى توستاً إنجليزياً «Unauthenticated.» ويبقى في صفحةٍ ميتة.
  if (response.status === 401) {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }

  return { ok: response.ok, status: response.status, body };
}

// ── Main Component ────────────────────────────────────────────────────────────

const LegalServiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── Core state ──
  const [service, setService] = useState<LegalService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  const [statusFlow, setStatusFlow] = useState<StatusFlowItem[]>([]);
  const [statusFlowPending, setStatusFlowPending] = useState(false);

  // ── Action state ──
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  /** نافذة «تعديل بيانات الخدمة» — متاحة في كل الحالات، انظر تعليق الزر في الترويسة. */
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [openingDocId, setOpeningDocId] = useState<number | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<number | null>(null);
  /**
   * سؤال العميل — تحريرٌ في المكان من تبويب «المعلومات».
   *
   * 🔴 لم يكن للحقل مسارُ تحريرٍ في المنصّة كلّها: نافذةُ التعديل لا تحمله والباك
   *    لا يقبله، بينما تبويبُ الاستشارة يقول «أضِفه من تعديل الخدمة» — أي يدلّ على
   *    بابٍ مغلق. فكلُّ استشارةٍ وُلدت بلا سؤالٍ بقيت بلا سؤالٍ إلى الأبد.
   */

  /**
   * فتحُ مستندٍ مرفوعٍ على الخدمة.
   *
   * يمرّ بـ`GET /documents/{id}/preview` — وهو يعالج الحالات الثلاث: رابطٌ خارجيّ،
   * وملفٌّ على OneDrive (‏يردّ رابطاً مباشراً)، وملفٌّ على قرصنا (‏يبثّ البايتات).
   * ومستنداتُ «صندوق البريد الذكي» من النوع الثالث: `IntakeAttachmentPromoter`
   * ينقلها إلى قرص `public` ولا يضع لها مزوّداً سحابياً.
   */
  const handleOpenDocument = async (documentId: number) => {
    setOpeningDocId(documentId);
    try {
      const res = await apiClient.get<{
        success: boolean;
        external?: boolean;
        cloud?: boolean;
        url?: string;
        message?: string;
      }>(`/documents/${documentId}/preview`);

      if (res.success && res.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
        return;
      }

      // بلا رابطٍ في الردّ: الخادمُ يبثّ الملفَّ نفسَه — يُفتح بمساره المحروس مباشرةً.
      window.open(`${API_BASE_URL}/documents/${documentId}/preview`, '_blank', 'noopener,noreferrer');
    } catch (err) {
      // 🔴 رسالةُ الخادم تصل المستخدم كما هي: «لم يُربط OneDrive» و«الملف غير
      //    موجود» سببان مختلفان تماماً، وطمسُهما في نصٍّ واحد يُضيّع التشخيص.
      toast.error(err instanceof Error ? err.message : 'تعذّر فتح المستند');
    } finally {
      setOpeningDocId(null);
    }
  };

  /**
   * تنزيلُ مستندٍ مرفوعٍ على الخدمة.
   *
   * `fetch` بالتوكن ثم blob: — لا `window.open` على مسارٍ محروسٍ بترويسة Authorization
   * (نمط `intakeRequestService.downloadAttachment`). ومسارُ `/download` يردّ رابطاً
   * للسحابيّ والخارجيّ وبايتاتٍ للمحليّ، فنفرّق بحسب نوع المحتوى.
   */
  const handleDownloadDocument = async (documentId: number, fileName?: string | null) => {
    setDownloadingDocId(documentId);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/documents/${documentId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        let serverMessage = '';
        try {
          serverMessage = (await res.json())?.message || '';
        } catch {
          serverMessage = '';
        }
        throw new Error(serverMessage || `تعذّر تنزيل المستند (${res.status})`);
      }

      // السحابيّ/الخارجيّ: JSON فيه رابطٌ مباشر بدل البايتات
      if ((res.headers.get('content-type') || '').includes('application/json')) {
        const body = await res.json();
        const href = body?.url || body?.download_url;
        if (!href) throw new Error(body?.message || 'لا يتوفّر رابط تنزيل لهذا الملف');
        window.open(href, '_blank', 'noopener,noreferrer');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'document';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذّر تنزيل المستند');
    } finally {
      setDownloadingDocId(null);
    }
  };
  // صلاحيةُ الكتابة على الخدمات — يعكسها الزرُّ الخطر بدل أن يُردّ 403 صامتاً
  const canManageService = usePermission('legal-services.manage');
  // `DocumentPolicy::download` تشترطها فوق الرؤية، والأدوارُ المخصّصة قد لا تحملها —
  // فإخفاءُ الزرّ أصدقُ من 403 صامتٍ عند النقر.
  const canDownloadDocuments = usePermission('documents.download');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  /** غير null ⇒ الباك ردّ 409 CONFIRM_REQUIRED، فالنافذة تنتقل لمرحلة التحذير المالي. */
  const [deleteImpact, setDeleteImpact] = useState<ServiceDeletionImpact | null>(null);
  const [deleteImpactMessage, setDeleteImpactMessage] = useState('');

  // ── Timer state ──
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [activeTimerEntry, setActiveTimerEntry] = useState<ServiceTimeEntryItem | null>(null);
  const [timerDescription, setTimerDescription] = useState('');
  const [timerLoading, setTimerLoading] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTimeLoading, setManualTimeLoading] = useState(false);
  const [timeSummary, setTimeSummary] = useState<{
    total_formatted: string;
    billable_formatted: string;
    total_amount: number;
  } | null>(null);

  // ── Consultation state ──
  // مسودة الرأي المقترحة بالذكاء (تُعرض في صندوق قابل للنسخ — لا تُحفظ تلقائياً)

  // ── Contract state ──
  // وضع التركيز في مساحة صياغة العقد: يُخفي شريط الحالة واللوحات لتأخذ الورقة المساحة كلها
  const [contractFocus, setContractFocus] = useState(false);

  // ── Documents state ──
  const [docLoading, setDocLoading] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  // مهام التكليف المرتبطة بهذه الخدمة — مصدر بطاقة «جاهزة للعميل»
  const [serviceTasks, setServiceTasks] = useState<Task[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  // انتقالٌ ينتظر التأكيد — ما له أثر (قفل/فاتورة/إشعار عميل) أو ما ينقصه شيء لا يقع بنقرة واحدة
  const [pendingTransition, setPendingTransition] = useState<string | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // ── Timer interval ──
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerRunning) {
      interval = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  // ── Close dropdown on outside click ──
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Fetch service ──
  // آخر `id` رُسمت خدمته فعلاً، ورقم آخر طلب — يحميان من ردٍّ متأخر لخدمةٍ غادرها المستخدم.
  const loadedIdRef = useRef<string | null>(null);
  const fetchSeqRef = useRef(0);

  /**
   * البيانات الثانوية (خط سير الحالات/ملخص الوقت/مهام التكليف/المؤقت النشط).
   *
   * كانت تُجلب **واحداً بعد الآخر** قبل رسم أي شيء — خمس رحلات متتالية إلى الخادم
   * والصفحة على دوّامة التحميل، بينما الخدمة المبسطة ترسم بعد رحلةٍ واحدة. الآن
   * تنطلق معاً بعد وصول الخدمة ولا تحجب الرسم، وكلٌّ منها يملأ مكانه حين يصل.
   * فشلها لا يعطّل الصفحة، فلا نُغرق المستخدم بـ toasts — نكتفي بتسجيلها للمطوّر.
   */
  const loadSecondary = useCallback((serviceId: number, serviceType: string, seq: number) => {
    const isCurrent = () => fetchSeqRef.current === seq;

    // خط سير الحالات ثابت لكل نوع — يُجلب مرة واحدة في الجلسة
    if (!statusFlowCache.has(serviceType)) {
      setStatusFlowPending(true);
      LegalServiceService.getStatusFlow(serviceType)
        .then((flowRes) => {
          if (!flowRes.success) return;
          statusFlowCache.set(serviceType, flowRes.data);
          if (isCurrent()) setStatusFlow(flowRes.data);
        })
        .catch((err) => console.warn('status-flow:', getApiErrorMessage(err)))
        .finally(() => {
          if (isCurrent()) setStatusFlowPending(false);
        });
    }

    LegalServiceService.getTimeSummary(serviceId)
      .then((summaryRes) => {
        if (summaryRes.success && isCurrent()) setTimeSummary(summaryRes.data);
      })
      .catch((err) => console.warn('time-summary:', getApiErrorMessage(err)));

    // مهام التكليف المرتبطة بالخدمة — تُغذّي بطاقة «جاهزة للعميل» بعد الاعتماد
    TaskService.getTasks({ legal_service_id: serviceId, per_page: 50 })
      .then((tasksRes) => {
        if (isCurrent()) setServiceTasks(Array.isArray(tasksRes?.data) ? tasksRes.data : []);
      })
      .catch((err) => console.warn('service-tasks:', getApiErrorMessage(err)));

    LegalServiceService.getActiveTimer()
      .then((activeRes) => {
        if (!isCurrent() || !activeRes.success || !activeRes.data) return;
        setActiveTimerEntry(activeRes.data);
        setTimerRunning(true);
        const started = new Date(activeRes.data.started_at).getTime();
        setTimerSeconds(Math.floor((Date.now() - started) / 1000));
      })
      .catch((err) => console.warn('active-timer:', getApiErrorMessage(err)));
  }, []);

  /**
   * دوّامة التحميل للفتح الأول فقط (أو عند الانتقال إلى خدمةٍ أخرى).
   *
   * كل إجراء في الصفحة ومساحات العمل (تأشير بند، حفظ إصدار، رفع مستند…) يُنادي
   * `fetchService` ليُحدّث البيانات — وكانت تُشعل `loading` في كل مرة، فتُستبدل
   * الصفحة كلها بالدوّامة ثم تُبنى من جديد: يضيع موضع التمرير وحالة المحرر وما فُتح
   * من نماذج. بعد الفتح الأول يصير التحديث صامتاً في مكانه.
   */
  const fetchService = useCallback(async () => {
    if (!id) return;
    const seq = ++fetchSeqRef.current;
    const firstLoad = loadedIdRef.current !== id;
    if (firstLoad) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await LegalServiceService.getService(Number(id));
      if (fetchSeqRef.current !== seq) return;
      if (res.success) {
        const cachedFlow = statusFlowCache.get(res.data.service_type);
        if (cachedFlow) setStatusFlow(cachedFlow);
        else if (firstLoad) setStatusFlow([]);
        setService(res.data);
        // الخدمة تُفتح على تبويب عملها (ورقة العقد/الاستشارة/مساحة النوع) — من يفتحها جاء ليعمل،
        // لا ليقرأ بطاقة معلومات. المبسطة لها صفحتها، وما لا مساحة له يُفتح على «نظرة عامة».
        if (firstLoad) setActiveTab(defaultTabFor(res.data.service_type));
        loadedIdRef.current = id;
        loadSecondary(Number(id), res.data.service_type, seq);
      } else if (firstLoad) {
        setError('تعذّر تحميل بيانات الخدمة');
      }
    } catch (err) {
      if (fetchSeqRef.current !== seq) return;
      if (firstLoad) {
        // نعرض رسالة الخادم الفعلية (404/403...) بدل نص عام
        setError(getApiErrorMessage(err, 'حدث خطأ في الاتصال بالخادم'));
      } else {
        // التحديث الصامت يلي إجراءً نجح فعلاً — فشله لا يُبلَّغ كفشلٍ للإجراء
        console.warn('service-refresh:', getApiErrorMessage(err));
      }
    }
    if (firstLoad) setLoading(false);
  }, [id, loadSecondary]);

  /**
   * إعادة تحميلٍ صامتة: تحدّث بيانات الخدمة **بلا** إشعال `loading` العام.
   *
   * `fetchService` تُشعله، والمكوّن يُرجِع هيكل التحميل قبل أن يبلغ النوافذ
   * (`if (loading)` سابقٌ لـ`<AddExternalLinkModal/>` في شجرة الإرجاع) — فأيّ تحديثٍ
   * يقع ونافذةٌ مفتوحة يُفكّكها تحت يد المستخدم ويومض الصفحة كلها لأجل صفٍّ واحد.
   *
   * وتبتلع خطأها عمداً: النداء المُحدِّث نجح فعلاً قبلها، فرميُها هنا يعني إبلاغ
   * المستخدم بفشلٍ لم يقع (والنافذة تلتقط الرمي وتعرضه خطأ إضافة).
   */
  const refreshServiceQuiet = useCallback(async () => {
    if (!id) return;
    try {
      const res = await LegalServiceService.getService(Number(id));
      if (res.success) setService(res.data);
    } catch (err) {
      console.warn('service-refresh:', getApiErrorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

  // موضع الخدمة على المسار الرئيسي (انظر utils/serviceFlow)
  const flow = useMemo(() => flowView(statusFlow, service?.status ?? ''), [statusFlow, service?.status]);

  /**
   * الانتقال لا يقع بنقرة واحدة إن كان له أثر لا يُسترد (قفل المحتوى، فاتورة، إشعار يصل العميل،
   * إلغاء) أو كان ينقصه شيء (لا مسودة، رأي فارغ). كان أي نقرٍ في القائمة ينفَّذ فوراً —
   * ونقرةٌ خاطئة على «معتمد» تقفل العقد وتُشعر العميل ولا رجوع منها في المسار.
   */
  const transitionConcerns = (target: string): { effects: string[]; warnings: string[] } => {
    if (!service) return { effects: [], warnings: [] };
    const effects: string[] = [];
    const warnings: string[] = [];
    const type = service.service_type;
    const billing = BILLING_TRIGGER_STATUSES[type] ?? ['completed'];
    const locked = LOCKED_STATUSES[type] ?? ['completed'];

    if (target === 'cancelled') effects.push('تنتهي دورة العمل على الخدمة، ولا عودة من الإلغاء.');
    if (locked.includes(target) || ['closed', 'archived', 'cancelled'].includes(target)) {
      effects.push('يُقفل المحتوى ضد التعديل.');
    }
    if (billing.includes(target)) {
      effects.push('تُنشأ فاتورة مسودة تلقائياً إن لم تكن للخدمة فاتورة وكان لها مبلغ.');
    }
    if (
      (type === 'consultation' && (target === 'draft_ready' || target === 'delivered')) ||
      (type !== 'consultation' && billing.includes(target))
    ) {
      effects.push('يصل العميلَ إشعار (واتساب/بريد) ببلوغ هذه المرحلة.');
    }
    // هل من رجوع؟ — المحطة التي لا تعيدك إلى ما قبلها تستحق أن تُذكر
    const targetItem = statusFlow.find((f) => f.status === target);
    const canComeBack = !!targetItem && targetItem.transitions.some((t) => transitionKind(flow, t) === 'back' || t === service.status);
    if (target !== 'cancelled' && targetItem && targetItem.transitions.length > 0 && !canComeBack && effects.length > 0) {
      effects.push('لا رجوع من هذه المحطة إلى ما قبلها.');
    }

    if (transitionKind(flow, target) === 'forward') {
      if (type === 'contract_drafting' && target !== 'drafting') {
        const versions = service.contract_drafting_detail?.versions ?? [];
        const latest = [...versions].sort((a, b) => b.version_number - a.version_number)[0];
        const hasText = !!latest && latest.content.replace(/<[^>]*>/g, '').trim() !== '';
        if (!hasText) warnings.push('لا نص مكتوب للعقد بعد.');
        const checklist = service.contract_drafting_detail?.checklist ?? [];
        const left = checklist.filter((i) => !i.checked).length;
        if (left > 0 && ['client_review', 'approved', 'signed'].includes(target)) {
          warnings.push(`بقي في قائمة الفحص ${left.toLocaleString('ar-SA')} بلا تأشير.`);
        }
      }
      if (type === 'consultation' && ['draft_ready', 'internal_review', 'delivered'].includes(target)) {
        const opinion = service.consultation_detail?.legal_opinion ?? '';
        if (String(opinion).replace(/<[^>]*>/g, '').trim() === '') warnings.push('الرأي القانوني لم يُكتب بعد.');
      }
    }
    return { effects, warnings };
  };

  const requestTransition = (target: string) => {
    setShowStatusDropdown(false);
    const { effects, warnings } = transitionConcerns(target);
    if (effects.length === 0 && warnings.length === 0) {
      void handleStatusChange(target);
      return;
    }
    setPendingTransition(target);
  };

  // ── Status change ──
  const handleStatusChange = async (newStatus: string) => {
    if (!service) return;
    setStatusLoading(true);
    setShowStatusDropdown(false);
    try {
      const res = await LegalServiceService.updateStatus(service.id, newStatus);
      if (res.success) {
        // الباك يعيد الآن الحمولة الكاملة (التفاصيل النوعية + allowed_transitions...)
        setService(res.data);
        toast.success(`تم الانتقال إلى «${getStatusLabel(newStatus)}»`);
        // دفاع: حمولة ناقصة (باك أقدم أثناء النشر/كاش) — أكمِلها بجلبٍ كامل
        // كي لا تعرض بطاقة «الخطوة التالية» حالةً نهائية زائفة.
        if (!Array.isArray(res.data?.allowed_transitions)) {
          fetchService();
        }
      } else {
        toast.error('تعذّر تغيير حالة الخدمة');
      }
    } catch (err) {
      // رسالة الباك تشرح سبب رفض الانتقال (مثلاً: انتقال غير مسموح) — نعرضها كما هي
      toast.error(getApiErrorMessage(err, 'تعذّر تغيير حالة الخدمة'));
    }
    setStatusLoading(false);
  };

  // ── Convert to case ──
  const handleConvertToCase = async (title: string, caseType: string) => {
    if (!service) return;
    setConvertLoading(true);
    try {
      await LegalServiceService.convertToCase(service.id, { title, case_type: caseType });
      setShowConvertModal(false);
      toast.success('تم تحويل الخدمة إلى قضية بنجاح');
      fetchService();
    } catch (err) {
      // رسالة الباك توضّح السبب الفعلي (نوع غير قابل للتحويل/محوّلة سابقاً...)
      toast.error(getApiErrorMessage(err, 'تعذّر تحويل الخدمة إلى قضية'));
    }
    setConvertLoading(false);
  };

  // ── [P3.3] تحويل الصياغة إلى عقد رسمي (كان endpoint الباك بلا واجهة) ──
  const [convertingToContract, setConvertingToContract] = useState(false);
  const handleConvertToContract = async () => {
    const draftingId = service?.contract_drafting_detail?.id;
    if (!service || !draftingId) return;
    setConvertingToContract(true);
    try {
      const res = await apiClient.post<{ success: boolean; message?: string; data?: { id: number; contract_number?: string } }>(
        `/contracts/from-drafting/${draftingId}`
      );
      if (res.success) {
        toast.success(res.message || 'تم تحويل الصياغة إلى عقد رسمي بنجاح');
        fetchService();
      } else {
        toast.error(res.message || 'تعذّر التحويل إلى عقد رسمي');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر التحويل إلى عقد رسمي'));
    }
    setConvertingToContract(false);
  };

  // ── Create invoice ──
  const handleCreateInvoice = async (title: string, amount: string, dueDate: string) => {
    if (!service) return;
    setInvoiceLoading(true);
    try {
      await LegalServiceService.createInvoice(service.id, {
        title,
        amount: parseFloat(amount) || undefined,
        due_date: dueDate || undefined,
      });
      setShowInvoiceModal(false);
      toast.success('تم إنشاء الفاتورة بنجاح');
      fetchService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إنشاء الفاتورة'));
    }
    setInvoiceLoading(false);
  };

  // ── Delete service ──
  // الحذف **ناعم**: الخدمة تُنقل إلى سلّة المحذوفات وتُستعاد منها — فلا تُقال «لا يمكن التراجع».
  const handleDelete = () => {
    if (!service) return;
    setDeleteImpact(null);
    setDeleteImpactMessage('');
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteLoading) return;
    setShowDeleteConfirm(false);
    setDeleteImpact(null);
    setDeleteImpactMessage('');
  };

  /**
   * نداءٌ واحد بمرحلتين: أول ضغطة بلا `confirm`، فإن كانت الخدمة مرتبطة بفواتير أو
   * مصروفات ردّ الباك 409 مع `impact` — فتنتقل النافذة نفسها لمرحلة التحذير المالي،
   * والضغطة التالية تُعيد النداء بـ`confirm=1`.
   */
  const runDelete = async (confirm: boolean) => {
    if (!service) return;
    setDeleteLoading(true);
    try {
      const { ok, status, body } = await requestServiceDeletion(service.id, confirm);

      if (ok) {
        setShowDeleteConfirm(false);
        setDeleteImpact(null);
        toast.success(body?.message || 'تم نقل الخدمة إلى سلّة المحذوفات، ويمكن استعادتها منها');
        navigate('/legal-services');
        return;
      }

      if (status === 409 && body?.error_code === 'CONFIRM_REQUIRED') {
        // البديل الصفري ليس تجميلاً: `deleteImpact !== null` هو ما ينقل النافذة للمرحلة
        // الثانية، فلو غاب `impact` لبقيت في الأولى وأعادت النداء بلا confirm إلى الأبد.
        setDeleteImpact(
          body.impact ?? {
            invoices_count: 0,
            invoices_total: 0,
            paid_invoices_count: 0,
            tasks_count: 0,
            expenses_count: 0,
          },
        );
        setDeleteImpactMessage(typeof body.message === 'string' ? body.message : '');
        setShowDeleteConfirm(true);
        return;
      }

      setShowDeleteConfirm(false);
      toast.error(typeof body?.message === 'string' ? body.message : 'تعذّر حذف الخدمة');
    } catch {
      toast.error('تعذّر حذف الخدمة — تحقّق من الاتصال وأعد المحاولة');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Timer actions ──
  const handleStartTimer = async () => {
    if (!service) return;
    setTimerLoading(true);
    try {
      const res = await LegalServiceService.startTimer(service.id, timerDescription);
      if (res.success) {
        setActiveTimerEntry(res.data);
        setTimerRunning(true);
        setTimerSeconds(0);
      } else {
        toast.error('تعذّر بدء المؤقت');
      }
    } catch (err) {
      // رسالة الباك (مثلاً: يوجد مؤقت نشط على خدمة أخرى) أوضح من نص عام
      toast.error(getApiErrorMessage(err, 'تعذّر بدء المؤقت'));
    }
    setTimerLoading(false);
  };

  const handleStopTimer = async () => {
    if (!service || !activeTimerEntry) return;
    setTimerLoading(true);
    try {
      await LegalServiceService.stopTimer(service.id, activeTimerEntry.id);
      setTimerRunning(false);
      setTimerSeconds(0);
      setActiveTimerEntry(null);
      setTimerDescription('');
      fetchService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إيقاف المؤقت'));
    }
    setTimerLoading(false);
  };

  const handleAddManualTime = async (
    startedAt: string,
    endedAt: string,
    desc: string,
    billable: boolean
  ) => {
    if (!service) return;
    setManualTimeLoading(true);
    try {
      await LegalServiceService.addManualTimeEntry(service.id, {
        started_at: startedAt,
        ended_at: endedAt,
        description: desc,
        is_billable: billable,
      });
      setShowManualForm(false);
      toast.success('تم إضافة إدخال الوقت بنجاح');
      fetchService();
    } catch (err) {
      // أخطاء التحقق 422 (تواريخ متعارضة...) تظهر برسالتها الفعلية
      toast.error(getApiErrorMessage(err, 'تعذّر إضافة إدخال الوقت'));
    }
    setManualTimeLoading(false);
  };

  // ── Document actions ──
  const handleUploadDocument = async (file: File) => {
    if (!service) return;
    setDocLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await LegalServiceService.uploadDocument(service.id, formData);
      toast.success('تم رفع المستند بنجاح');
      fetchService();
    } catch (err) {
      // رسالة الباك (OneDrive غير مربوط / نوع ملف مرفوض...) أوضح من نص عام
      toast.error(getApiErrorMessage(err, 'تعذّر رفع المستند'));
    }
    setDocLoading(false);
  };

  /**
   * ⚠️ `documentId` هنا هو **معرّف الوثيقة** لا معرّف صفّ الربط:
   * المسار DELETE /legal-services/{id}/documents/{docId} يطابق `document_id` في جدول
   * service_documents، فتمرير `id` الصفّ يعيد 404 «المستند غير مرتبط بهذه الخدمة».
   */
  const handleRemoveDocument = async (documentId: number) => {
    if (!service) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا المستند؟')) return;
    try {
      await LegalServiceService.removeDocument(service.id, documentId);
      toast.success('تم حذف المستند بنجاح');
      fetchService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر حذف المستند'));
    }
  };

  /**
   * إضافة رابط خارجي كمستند للخدمة. الأخطاء تُترك تصعد عمداً: AddExternalLinkModal
   * يلتقطها ويعرض رسالة الباك العربية (422) داخل النافذة دون إغلاقها ولا فقدان المُدخَل.
   */
  const handleAddDocumentLink = async (payload: ExternalLinkPayload) => {
    // رميٌ لا خروجٌ صامت: النافذة تعتبر رجوع `onSubmit` بلا رمي نجاحاً، فتصفّر الحقول
    // وتُغلق بلا أن يُنادى الخادم أصلاً. الرمي يُبقيها مفتوحة بالمُدخَل ويُظهر السبب.
    if (!service) throw new Error('تعذّر تحديد الخدمة');
    await LegalServiceService.addDocumentLink(service.id, payload);
    // مُنتظَرة وصامتة: `fetchService` غير المُنتظَرة كانت تُشعل `loading` بعد إغلاق
    // النافذة فتومض الصفحة كلها إلى هيكل التحميل لأجل صفٍّ واحد أُضيف.
    await refreshServiceQuiet();
    toast.success('تمت إضافة الرابط');
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderStatusBadge = (status: string) => (
    <span className={`ls-status-badge ls-status-badge--${status}`}>
      <span className="ls-status-badge__dot" />
      {getStatusLabel(status)}
    </span>
  );

  const renderPriorityBadge = (priority: string) => (
    <span className={`ls-priority-badge ls-priority-badge--${priority}`}>
      {PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] ?? priority}
    </span>
  );

  const renderTypePill = (serviceType: string) => {
    const Icon = SERVICE_TYPE_ICONS[serviceType] ?? FileText;
    const cls = TYPE_PILL_CLASS[serviceType] ?? 'ls-type-pill--other';
    return (
      <span className={`ls-type-pill ${cls}`}>
        <Icon size={12} />
        {SERVICE_TYPE_LABELS[serviceType as keyof typeof SERVICE_TYPE_LABELS] ?? serviceType}
      </span>
    );
  };

  // ── Tab: Info ─────────────────────────────────────────────────────────────

  // «نظرة عامة»: كانت بطاقتا «معلومات أساسية» و«المعلومات المالية» تكرّران ما في ترويسة الصفحة
  // حرفاً بحرف، و«الأنشطة» في تبويب مستقل لا يُفتح. الآن: ما يُقرأ (الوصف/السؤال/المنشأ/الملاحظات)
  // في العمود الرئيسي، وبجواره ما لا تحمله الترويسة + آخر ما جرى على الخدمة.
  const renderInfoTab = () => {
    if (!service) return null;
    const hasReadable =
      !!service.description ||
      !!service.intake_request ||
      !!service.notes ||
      !!service.internal_notes ||
      !!service.case_model;
    const team = (service.assignees ?? []).map((a) => a.name).filter(Boolean);
    const sourceLabel =
      service.source === 'manual'
        ? 'يدوي'
        : service.source === 'client_portal'
        ? 'بوابة العميل'
        : service.source === 'converted_from_case'
        ? 'محوّل من قضية'
        : service.source;
    return (
      <div className="lsd2-overview">
      <div className="lsd2-overview__main">
        {(statusFlow.length > 0 || statusFlowPending) && (
          <div className="lsd-card">
            <div className="lsd-card__header">
              <div className="lsd-card__title">
                <Compass size={15} />
                مسار الخدمة
              </div>
            </div>
            <div className="lsd-card__content lsd2-flowcard">
              <StatusPipeline view={flow} pending={statusFlowPending} />
              {flow.branch && flow.index >= 0 && (
                <p className="lsd2-flowcard__branch">
                  الخدمة الآن في «{flow.branch.label}» — محطة جانبية تفرّعت من «{flow.path[flow.index].label}» وتعود منها إلى المسار.
                </p>
              )}
              <p className="lsd2-muted">
                {STATUS_EXPLANATIONS[service.status] ??
                  'حالة مخصّصة — راجع آخر ما جرى لمعرفة ما تم على الخدمة.'}
              </p>
            </div>
          </div>
        )}
        {!hasReadable && (
          <div className="lsd-card">
            <div className="lsd-card__content lsd2-blank">
              <AlignLeft size={22} />
              <p>لا وصف ولا ملاحظات لهذه الخدمة بعد.</p>
              <button className="lsd-card__action" onClick={() => setShowEditModal(true)}>
                <Pencil size={13} />
                أضفها من «تعديل البيانات»
              </button>
            </div>
          </div>
        )}
        {/* Card 3: الوصف */}
        {service.description && (
          <div className="lsd-card lsd-card--full">
            <div className="lsd-card__header">
              <div className="lsd-card__title">
                <AlignLeft size={15} />
                الوصف
              </div>
            </div>
            <div className="lsd-card__content">
              <p className="lsd-description-text">{service.description}</p>
            </div>
          </div>
        )}

        {/* Card 3.5: منشأُ الطلب — يظهر للخدمات القادمة من «صندوق البريد الذكي» وحدها.
            🔴 كان المحامي يفتح استشارةً لا يعرف أنها من بريدٍ ولا ممّن ولا متى، والأثرُ
               محبوسٌ في `metadata` لا يقرؤه أحد. ومعه المرفقاتُ التي وصلت ولم تُحفَظ —
               «وصل ولم نستطع حفظه» خبرٌ يتصرّف عليه، وصمتُه كان يُقرأ «لم يُرسِل شيئاً». */}
        {service.intake_request && (() => {
          const origin = service.intake_request;
          const unsaved = (origin.attachments ?? []).filter((a) => !a.document_id && a.skip_reason);

          return (
            <div className="lsd-card lsd-card--full">
              <div className="lsd-card__header">
                <div className="lsd-card__title">
                  <Mail size={15} />
                  واردٌ من صندوق البريد الذكي
                </div>
              </div>
              <div className="lsd-card__content">
                <div className="lsd-info-grid">
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__label">المُرسِل</div>
                    <div className="lsd-info-item__value" style={{ direction: 'ltr', unicodeBidi: 'isolate', textAlign: 'right' }}>
                      {origin.from_name ? `${origin.from_name} — ` : ''}{origin.from_email || '—'}
                    </div>
                  </div>
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__label">تاريخ الاستلام</div>
                    <div className="lsd-info-item__value">{formatDateTime(origin.received_at)}</div>
                  </div>
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__label">اعتمده</div>
                    <div className="lsd-info-item__value">
                      {origin.reviewer?.name || '—'}
                      {origin.reviewed_at ? ` · ${formatDate(origin.reviewed_at)}` : ''}
                    </div>
                  </div>
                </div>

                {origin.subject && (
                  <div className="lsd-notes-section" style={{ marginTop: 12 }}>
                    <div className="lsd-notes-section__label">موضوع الرسالة</div>
                    <p className="lsd-description-text">{origin.subject}</p>
                  </div>
                )}

                {origin.review_note && (
                  <div className="lsd-notes-section" style={{ marginTop: 12 }}>
                    <div className="lsd-notes-section__label">ملاحظة المراجع</div>
                    <p className="lsd-description-text">{origin.review_note}</p>
                  </div>
                )}

                {unsaved.length > 0 && (
                  <div className="lsd-onedrive-warning" style={{ marginTop: 12 }}>
                    <Paperclip size={18} />
                    <div>
                      <strong>وصلت مرفقاتٌ لم تُحفَظ ({unsaved.length}).</strong> اطلبها من المُرسِل بصيغةٍ مدعومة:
                      <ul style={{ margin: '6px 0 0', paddingInlineStart: 18 }}>
                        {unsaved.map((a) => (
                          <li key={a.id}>
                            {a.file_name} — {a.skip_reason}
                            {a.size ? ` (${formatFileSize(a.size)})` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Card 4: الملاحظات */}
        {(service.notes || service.internal_notes) && (
          <div className="lsd-card lsd-card--full">
            <div className="lsd-card__header">
              <div className="lsd-card__title">
                <StickyNote size={15} />
                الملاحظات
              </div>
            </div>
            <div className="lsd-card__content">
              {service.notes && (
                <div className="lsd-notes-section">
                  <div className="lsd-notes-section__label">ملاحظات عامة</div>
                  <p className="lsd-description-text">{service.notes}</p>
                </div>
              )}
              {service.internal_notes && (
                <div className="lsd-notes-section">
                  <div className="lsd-notes-section__label">ملاحظات داخلية</div>
                  <p className="lsd-description-text lsd-description-text--internal">
                    {service.internal_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Linked case */}
        {service.case_model && (
          <div className="lsd-card lsd-card--full">
            <div className="lsd-card__header">
              <div className="lsd-card__title">
                <Link size={15} />
                القضية المرتبطة
              </div>
            </div>
            <div className="lsd-card__content lsd-card__content--compact">
              <button
                className="lsd-linked-case-btn"
                onClick={() => navigate(`/cases/${service.case_model!.id}`)}
              >
                <Scale size={14} />
                <span>{service.case_model.title}</span>
                <span className="lsd-linked-case-btn__number">
                  {service.case_model.case_number}
                </span>
                <ExternalLink size={12} style={{ marginRight: 'auto' }} />
              </button>
            </div>
          </div>
        )}
      </div>

      <aside className="lsd2-overview__side">
        <div className="lsd-card">
          <div className="lsd-card__header">
            <div className="lsd-card__title">
              <Info size={15} />
              تفاصيل
            </div>
          </div>
          <div className="lsd-card__content">
            <dl className="lsd2-dl">
              <dt>العميل</dt>
              <dd>{service.client?.name ?? '—'}</dd>
              <dt>المحامي المسؤول</dt>
              <dd>{service.assigned_lawyer?.name ?? 'غير محدد'}</dd>
              <dt>البدء</dt>
              <dd>{formatDate(service.start_date)}</dd>
              <dt>الاستحقاق</dt>
              <dd>{formatDate(service.due_date)}</dd>
              {service.agreed_amount && (
                <><dt>الأتعاب</dt><dd>{parseFloat(service.agreed_amount).toLocaleString('ar-SA')} ريال</dd></>
              )}
              <dt>المفوتر</dt>
              <dd>{Number(service.total_billed ?? 0).toLocaleString('ar-SA')} ريال</dd>
              <dt>أُنشئت</dt>
              <dd>{formatDate(service.created_at)}</dd>
              {sourceLabel && (<><dt>المصدر</dt><dd>{sourceLabel}</dd></>)}
              {team.length > 1 && (<><dt>فريق العمل</dt><dd>{team.join('، ')}</dd></>)}
              <dt>نوع الفوترة</dt>
              <dd>{BILLING_TYPE_LABELS[service.billing_type] ?? service.billing_type}</dd>
              {service.billing_type === 'hourly' && service.hourly_rate && (
                <><dt>سعر الساعة</dt><dd>{parseFloat(service.hourly_rate).toLocaleString('ar-SA')} ريال</dd></>
              )}
              <dt>الضريبة</dt>
              <dd>{service.vat_rate}%</dd>
              {service.total_time_seconds != null && (
                <><dt>الوقت المسجَّل</dt><dd>{formatSeconds(service.total_time_seconds)}</dd></>
              )}
            </dl>
          </div>
        </div>

        {(service.service_activities?.length ?? 0) > 0 ? (
          renderActivitiesTab()
        ) : (
          <div className="lsd-card">
            <div className="lsd-card__header">
              <div className="lsd-card__title">
                <Clock size={15} />
                آخر ما جرى
              </div>
            </div>
            <div className="lsd-card__content">
              <p className="lsd2-muted">
                يسجّل النظام هنا تلقائياً كل ما يجري على الخدمة: تغيّر الحالة، المستندات، الوقت، والفواتير.
              </p>
            </div>
          </div>
        )}
      </aside>
      </div>
    );
  };

  // ── Tab: Consultation ────────────────────────────────────────────────────

  const renderConsultationTab = () => {
    if (!service) return null;
    // مساحة الاستشارة مكوّن مستقل يُحمَّل عند الطلب — الانتظار محصور هنا كي لا تومض الصفحة كلها
    return (
      <Suspense fallback={<SkeletonCard lines={8} />}>
        <ConsultationWorkspace
          service={service}
          refreshService={fetchService}
          locked={isServiceContentLocked(service)}
          canManage={canManageService}
          onRequestTransition={requestTransition}
          focusMode={contractFocus}
          onToggleFocus={() => setContractFocus((v) => !v)}
        />
      </Suspense>
    );
  };

  // ── Tab: Contract Drafting ────────────────────────────────────────────────

  const renderContractTab = () => {
    if (!service) return null;
    // مساحة الكتابة مكوّن مستقل يُحمَّل عند الطلب — الانتظار محصور هنا كي لا تومض الصفحة كلها
    return (
      <Suspense fallback={<SkeletonCard lines={8} />}>
        <ContractDraftingWorkspace
          service={service}
          refreshService={fetchService}
          locked={isServiceContentLocked(service)}
          onEditDetails={() => setShowEditModal(true)}
          onConvertToContract={handleConvertToContract}
          convertingToContract={convertingToContract}
          focusMode={contractFocus}
          onToggleFocus={() => setContractFocus((v) => !v)}
        />
      </Suspense>
    );
  };

  // ── Tab: Type-Specific Detail (مساحات العمل التفاعلية) ──────────────────

  const renderTypeDetailTab = () => {
    if (!service) return null;

    // التحقق من وجود workspace مسجّل لهذا النوع
    const Workspace = WorkspaceRegistry[service.service_type];
    if (Workspace) {
      // المساحة تُحمَّل عند الطلب — الانتظار محصور هنا كي لا تومض الصفحة كلها
      return (
        <Suspense fallback={<SkeletonCard lines={5} />}>
          <Workspace service={service} refreshService={fetchService} />
        </Suspense>
      );
    }

    return (
      <div className="lsd-empty-tab">
        <Layers size={32} />
        <p>لا توجد تفاصيل إضافية لهذا النوع</p>
        <span className="lsd-empty-tab__hint">
          تابع العمل من بقية التبويبات: التدوين، المستندات، تتبع الوقت، والفواتير.
        </span>
      </div>
    );
  };

  // ── Tab: Documents ────────────────────────────────────────────────────────

  const renderDocumentsTab = () => {
    if (!service) return null;
    const docs = service.service_documents ?? [];
    const oneDriveConnected = service.onedrive_connected !== false;

    return (
      <div className="lsd-tab-content-stack">
        <PortalLinksPanel serviceId={service.id} />
        <div className="lsd-card">
          <div className="lsd-card__header">
            <div className="lsd-card__title">
              <FileText size={15} />
              المستندات
              {docs.length > 0 && <span className="lsd-tab__count">{docs.length}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/*
                «إضافة من مصدر آخر» لا تُقيَّد بـoneDriveConnected: الرابط لا يُرفع ولا يُخزَّن
                ملفاً، فهو بالضبط المخرج حين لا يكون OneDrive مربوطاً.
              */}
              <button
                className="lsd-card__action"
                onClick={() => setShowLinkModal(true)}
                title="أضف رابطاً من درايف أو شيربوينت أو أي مصدر خارجي"
              >
                <Link size={13} />
                إضافة من مصدر آخر
              </button>
              <button
                className="lsd-card__action"
                onClick={() => fileInputRef.current?.click()}
                disabled={docLoading || !oneDriveConnected}
                title={!oneDriveConnected ? 'يلزم ربط OneDrive لرفع المستندات' : undefined}
              >
                <Upload size={13} />
                رفع مستند
              </button>
            </div>
          </div>
          <div className="lsd-card__content">
            {!oneDriveConnected && (
              <div className="lsd-onedrive-warning">
                <AlertTriangle size={18} />
                <div>
                  <strong>OneDrive غير مربوط.</strong> تُرفع مستندات الخدمات القانونية حصراً إلى OneDrive
                  الخاص بالشركة (مجلد «الخدمات القانونية»). يلزم ربط OneDrive من الإعدادات لتتمكّن من رفع المستندات.
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadDocument(file);
                e.target.value = '';
              }}
            />

            {docs.length > 0 ? (
              <div className="lsd-documents-list">
                {docs.map((doc) => {
                  const docData = doc.document;
                  if (!docData) return null;
                  // المميّز المعتمد بين الرابط والملف: external_url وحده (`rawUrl`).
                  // و`linkUrl` حارسُ **عرض**: الباك يحرس عند الإنشاء وهذا يحرس عند العرض،
                  // وهما ليسا واحداً — صفٌّ قديم أو حمولةٌ من مسارٍ آخر قد تحمل مخطّطاً لم
                  // يمرّ بقاعدة الإنشاء، وحماية React لـ`href` لا تلمس `window.open`.
                  const rawUrl = docData.external_url || null;
                  const linkUrl = safeExternalHref(rawUrl);
                  const linkHost = externalLinkHost(rawUrl);
                  const invalidLink = !!rawUrl && !linkUrl;
                  return (
                    <div key={doc.id} className="lsd-document-item">
                      <div className="lsd-document-item__icon">
                        {getDocumentEmoji(docData.mime_type, rawUrl, docData.document_type)}
                      </div>
                      <div className="lsd-document-item__info">
                        {/*
                          اسم المستند نفسه هو سطح الفتح: أزرار `__actions` مخفيّة بـ`opacity: 0`
                          حتى التحويم (legal-service-detail.css)، فلو بقي الفتح حكراً عليها لتعذّر
                          فتحُ الرابط على اللمس **بأي طريقة** — وهو وظيفته الوحيدة. أيقونة الفتح
                          في `__actions` تبقى اختصار سطح مكتب لا غير.
                        */}
                        {linkUrl ? (
                          <a
                            className="lsd-document-item__name"
                            href={linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={linkUrl}
                            style={{
                              display: 'block',
                              color: 'inherit',
                              textDecoration: 'underline',
                              textUnderlineOffset: '3px',
                              textDecorationColor: 'color-mix(in srgb, var(--color-heading) 35%, transparent)',
                            }}
                          >
                            {docData.title}
                          </a>
                        ) : (
                          <div className="lsd-document-item__name">{docData.title}</div>
                        )}
                        <div className="lsd-document-item__meta">
                          {invalidLink ? (
                            <span
                              className="lsd-relation-badge"
                              style={{
                                background: 'var(--color-warning-soft)',
                                color: 'var(--color-warning)',
                              }}
                              title="مخطّط الرابط غير مدعوم — يُقبل http و https فقط"
                            >
                              رابط غير صالح
                            </span>
                          ) : linkUrl ? (
                            <>
                              <span className="lsd-relation-badge">رابط</span>
                              {linkHost && (
                                <span
                                  style={{
                                    marginInlineStart: 6,
                                    direction: 'ltr',
                                    unicodeBidi: 'isolate',
                                  }}
                                >
                                  {linkHost}
                                </span>
                              )}
                            </>
                          ) : (
                            formatFileSize(docData.file_size)
                          )}
                          {doc.relation_type && (
                            <span className="lsd-relation-badge">{doc.relation_type}</span>
                          )}
                        </div>
                      </div>
                      <div className="lsd-document-item__actions">
                        {/*
                          الرابط يُفتح مباشرةً — لا عبر مسار المعاينة/التنزيل: السيرفر لا يجلب
                          العنوان الخارجي إطلاقاً (منعاً لـSSRF) ويردّ { external: true, url } بدل ملف.

                          وللمستند **المرفوع** لا زرّ فتحٍ هنا عمداً، وهي فجوةٌ قائمة خارج نطاق
                          هذه الدفعة: لا مسار «فتح/معاينة» لمستندات الخدمات في الباك، و
                          DocumentPolicy::view ترفض مستند الخدمة لكل من ليس رافعه (لأنه بلا
                          case_id) — فزرٌّ الآن يعني 403 لكل زميلٍ غير الرافع.
                        */}
                        {linkUrl && (
                          <a
                            className="lsd-doc-action-btn"
                            href={linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="فتح الرابط في تبويب جديد"
                            style={{ display: 'inline-flex', alignItems: 'center' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                        {/* المستندُ المرفوع: زرُّ فتحٍ يمرّ بمسار المعاينة المحروس.
                            كان غائباً عمداً لأن `DocumentPolicy::view` كانت ترفض مستندَ
                            الخدمة لكلّ من ليس رافعه (‏لأنه بلا `case_id`) — فصار للسياسة
                            فرعٌ يعرف الخدمة، وصار للزرّ معنى. */}
                        {!linkUrl && (
                          <button
                            className="lsd-doc-action-btn"
                            title="فتح المستند"
                            disabled={openingDocId === doc.document_id}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleOpenDocument(doc.document_id);
                            }}
                          >
                            <Eye size={13} />
                          </button>
                        )}
                        {/* التنزيل ليس تكراراً للفتح: مسارُ المعاينة يبثّ الملفَّ ليعرضه
                            المتصفّح، وما لا يعرفه المتصفّح (docx/xlsx) يبقى بلا سبيلٍ
                            إلى القرص من هذه الشاشة — وأكثرُ مرفقات البريد من ذلك النوع. */}
                        {!linkUrl && canDownloadDocuments && (
                          <button
                            className="lsd-doc-action-btn"
                            title="تنزيل المستند"
                            disabled={downloadingDocId === doc.document_id}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDownloadDocument(doc.document_id, docData.file_name || docData.title);
                            }}
                          >
                            <Download size={13} />
                          </button>
                        )}
                        <button
                          className="lsd-doc-action-btn"
                          title="حذف المستند"
                          onClick={(e) => {
                            e.stopPropagation();
                            // معرّف الوثيقة لا معرّف صفّ الربط — الباك يطابق document_id.
                            handleRemoveDocument(doc.document_id);
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : oneDriveConnected ? (
              <label className="lsd-upload-zone" style={{ cursor: 'pointer' }}>
                <input
                  type="file"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadDocument(file);
                    e.target.value = '';
                  }}
                />
                <div className="lsd-upload-zone__icon">
                  <Upload size={28} />
                </div>
                <div className="lsd-upload-zone__text">
                  <strong>اضغط لرفع مستند</strong> أو اسحب الملف هنا
                </div>
              </label>
            ) : (
              <div className="lsd-empty">
                لا توجد مستندات — أضف رابطاً من مصدر آخر، أو اربط OneDrive لرفع الملفات.
              </div>
            )}
          </div>
        </div>

        {/* ستايل .lsd-onedrive-warning انتقل إلى legal-service-detail.css بمتغيّرات الثيم */}
      </div>
    );
  };

  // ── Tab: Time Tracking ────────────────────────────────────────────────────

  const renderTimeTab = () => {
    if (!service) return null;
    const entries = service.time_entries ?? [];

    return (
      <div className="lsd-tab-content-stack">
        {/* Timer widget */}
        <div className={`lsd-timer-widget${timerRunning ? ' lsd-timer-widget--running' : ''}`}>
          <div className="lsd-timer-widget__header">
            <div className="lsd-timer-widget__title">
              <Clock size={15} />
              تتبع الوقت
            </div>
            <div className="lsd-timer-widget__status-dot" />
          </div>

          <div className="lsd-timer-widget__display">
            <div className="lsd-timer-widget__elapsed">{formatSeconds(timerSeconds)}</div>
            <div className="lsd-timer-widget__label">
              {timerRunning ? 'جارٍ تسجيل الوقت' : 'المؤقت متوقف'}
            </div>
          </div>

          {!timerRunning && (
            <div style={{ marginBottom: 8 }}>
              <input
                className="lsd-form-input"
                value={timerDescription}
                onChange={(e) => setTimerDescription(e.target.value)}
                placeholder="وصف العمل (اختياري)..."
              />
            </div>
          )}

          <div className="lsd-timer-widget__controls">
            {timerRunning ? (
              <button
                className="lsd-timer-btn lsd-timer-btn--stop"
                onClick={handleStopTimer}
                disabled={timerLoading}
              >
                <Square size={14} />
                إيقاف
              </button>
            ) : (
              <button
                className="lsd-timer-btn lsd-timer-btn--start"
                onClick={handleStartTimer}
                disabled={timerLoading}
              >
                <Play size={14} />
                بدء المؤقت
              </button>
            )}
            <button
              className="lsd-timer-btn lsd-timer-btn--secondary"
              onClick={() => setShowManualForm(!showManualForm)}
            >
              <Plus size={14} />
              إدخال يدوي
            </button>
          </div>

        </div>

        {/* Manual entry form */}
        <AnimatePresence>
          {showManualForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <ManualTimeForm
                onSave={handleAddManualTime}
                onCancel={() => setShowManualForm(false)}
                loading={manualTimeLoading}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Time entries table */}
        {entries.length === 0 && !showManualForm && (
          <div className="lsd-card">
            <div className="lsd-card__content">
              <div className="lsd-empty-state-small">
                <Clock size={22} />
                <span>
                  لا توجد إدخالات وقت بعد — اضغط «بدء المؤقت» أعلاه أثناء العمل، أو «إدخال يدوي» لتسجيل وقت سابق.
                </span>
              </div>
            </div>
          </div>
        )}
        {entries.length > 0 && (
          <div className="lsd-card">
            <div className="lsd-card__header">
              <div className="lsd-card__title">
                <Clock size={15} />
                سجل الوقت
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="lsd-time-entries">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>المدة</th>
                    <th>الوصف</th>
                    <th>المستخدم</th>
                    <th>الفوترة</th>
                    <th>سعر الساعة</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.started_at)}</td>
                      <td className="lsd-time-entries__hours">
                        {formatSeconds(entry.duration_seconds)}
                      </td>
                      <td>{entry.description ?? <span style={{ color: 'var(--color-text-secondary)' }}>—</span>}</td>
                      <td>{entry.user?.name ?? '—'}</td>
                      <td>
                        {entry.is_billable ? (
                          <span className="ls-status-badge ls-status-badge--completed">
                            <span className="ls-status-badge__dot" />
                            قابل
                          </span>
                        ) : (
                          <span className="ls-status-badge ls-status-badge--closed">
                            <span className="ls-status-badge__dot" />
                            غير قابل
                          </span>
                        )}
                      </td>
                      <td>
                        {entry.hourly_rate
                          ? `${parseFloat(entry.hourly_rate).toLocaleString('ar-SA')} ريال`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Tab: Activities ───────────────────────────────────────────────────────

  const renderActivitiesTab = () => {
    if (!service) return null;
    // الخادم يرسل أحدث عشرين — والأحدث أولاً هو ما يُقرأ في عمود «آخر ما جرى»
    const activities = service.service_activities ?? [];

    if (activities.length === 0) {
      return (
        <div className="lsd-empty-tab">
          <Clock size={32} />
          <p>لا توجد أنشطة بعد</p>
          <span className="lsd-empty-tab__hint">
            يسجّل النظام هنا تلقائياً كل ما يجري على الخدمة: تغييرات الحالة، المستندات، الفواتير...
          </span>
        </div>
      );
    }

    return (
      <div className="lsd-tab-content-stack">
        <div className="lsd-card">
          <div className="lsd-card__header">
            <div className="lsd-card__title">
              <Clock size={15} />
              آخر ما جرى
              <span className="lsd-tab__count">{activities.length}</span>
            </div>
          </div>
          <div className="lsd-card__content">
            <div className="lsd-timeline">
              <div className="lsd-timeline__line" />
              <div className="lsd-timeline__list">
                {activities.map((activity) => (
                  <div key={activity.id} className="lsd-timeline__item">
                    <div
                      className={`lsd-timeline__marker ${getActivityMarkerClass(activity.type)}`}
                    >
                      <Clock size={10} />
                    </div>
                    <div className="lsd-timeline__body">
                      <div className="lsd-timeline__header">
                        <div className="lsd-timeline__actor">
                          {activity.performer?.name ?? 'النظام'}
                        </div>
                        <div className="lsd-timeline__time">
                          {formatDateTime(activity.created_at)}
                        </div>
                      </div>
                      <div className="lsd-timeline__text">{activityTitle(activity)}</div>
                      {activity.description && (
                        <div className="lsd-timeline__note">{activity.description}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Tab: Invoices ─────────────────────────────────────────────────────────

  const renderInvoicesTab = () => {
    if (!service) return null;
    const invoices = service.invoices ?? [];

    return (
      <div className="lsd-tab-content-stack">
        <div className="lsd-card">
          <div className="lsd-card__header">
            <div className="lsd-card__title">
              <Receipt size={15} />
              الفواتير
              {invoices.length > 0 && <span className="lsd-tab__count">{invoices.length}</span>}
            </div>
            <button
              className="lsd-card__action"
              onClick={() => setShowInvoiceModal(true)}
            >
              <Plus size={13} />
              إنشاء فاتورة
            </button>
          </div>
          <div className="lsd-card__content">
            {invoices.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="lsd-time-entries">
                  <thead>
                    <tr>
                      <th>رقم الفاتورة</th>
                      <th>العنوان</th>
                      <th>المبلغ</th>
                      <th>المدفوع</th>
                      <th>المتبقي</th>
                      <th>الحالة</th>
                      <th>تاريخ الاستحقاق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td>
                          <span className="lsd-header__number">{inv.invoice_number}</span>
                        </td>
                        <td>{inv.title}</td>
                        <td className="lsd-time-entries__hours">
                          {parseFloat(inv.total_amount).toLocaleString('ar-SA')} ريال
                        </td>
                        <td>{parseFloat(inv.paid_amount).toLocaleString('ar-SA')} ريال</td>
                        <td>{parseFloat(inv.remaining_amount).toLocaleString('ar-SA')} ريال</td>
                        <td>
                          <span
                            className={`ls-status-badge ls-status-badge--${
                              inv.status === 'paid'
                                ? 'completed'
                                : inv.status === 'overdue'
                                ? 'cancelled'
                                : inv.status === 'partial'
                                ? 'in_progress'
                                : 'new'
                            }`}
                          >
                            <span className="ls-status-badge__dot" />
                            {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                          </span>
                        </td>
                        <td>{formatDate(inv.due_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="lsd-empty-state-small">
                <Receipt size={24} />
                <span>
                  لا توجد فواتير بعد — اضغط «إنشاء فاتورة» لإصدار أول فاتورة، أو ستُنشأ فاتورة مسودة
                  تلقائياً عند بلوغ محطة الإنجاز (انظر بطاقة «الخطوة التالية»).
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── «الملفات»: ما رُفع للخدمة وما أصدرناه منها في مكان واحد (كانا تبويبين) ──
  const renderFilesTab = () => {
    if (!service) return null;
    return (
      <div className="lsd2-split">
        <div className="lsd2-split__col">{renderDocumentsTab()}</div>
        <div className="lsd2-split__col">
          <DeliverablesPanel serviceId={service.id} serviceType={service.service_type} />
        </div>
      </div>
    );
  };

  // ── «الوقت والفواتير»: العمل المسجَّل وما فُوتر منه متجاوران (كانا تبويبين) ──
  const renderBillingTab = () => {
    if (!service) return null;
    const invoices = service.invoices ?? [];
    const paid = invoices.reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0);
    const billed = Number(service.total_billed) || 0;
    const agreed = service.agreed_amount ? parseFloat(service.agreed_amount) : null;
    const money = (n: number) => `${n.toLocaleString('ar-SA')} ريال`;
    return (
      <div className="lsd2-billing rc-scope">
        <div className="lsd2-tiles">
          <StatTile
            label="الوقت المسجَّل"
            value={timeSummary?.total_formatted ?? formatSeconds(service.total_time_seconds ?? 0)}
            hint={timeSummary ? `منه ${timeSummary.billable_formatted} يُفوتر` : undefined}
            icon={<Clock size={15} />}
          />
          <StatTile
            label="الأتعاب المتفق عليها"
            value={agreed != null ? money(agreed) : '—'}
            hint={BILLING_TYPE_LABELS[service.billing_type] ?? service.billing_type}
            icon={<DollarSign size={15} />}
          />
          <StatTile
            label="المفوتر"
            value={money(billed)}
            hint={invoices.length > 0 ? invoicesPhrase(invoices.length) : 'لم تصدر فاتورة بعد'}
            icon={<Receipt size={15} />}
            meter={agreed ? { value: Math.round((billed / agreed) * 100), ariaLabel: 'نسبة المفوتر من الأتعاب' } : undefined}
          />
          <StatTile
            label="المحصَّل"
            value={money(paid)}
            hint={billed > 0 ? `المتبقي ${money(Math.max(0, billed - paid))}` : undefined}
            icon={<CheckCircle size={15} />}
            meter={billed > 0 ? { value: Math.round((paid / billed) * 100), tone: 'good', ariaLabel: 'نسبة المحصَّل من المفوتر' } : undefined}
          />
        </div>
        <div className="lsd2-split">
          <div className="lsd2-split__col">{renderTimeTab()}</div>
          <div className="lsd2-split__col">{renderInvoicesTab()}</div>
        </div>
      </div>
    );
  };

  // ── Tab: Notes (التدوين) — shared across all service types ─────────────────

  const renderNotesTab = () => {
    if (!service) return null;
    const handleSaveNotes = async (html: string) => {
      const res = await LegalServiceService.updateWorkNotes(service.id, html);
      if (!res?.success) throw new Error('تعذّر حفظ دفتر التدوين');
      await fetchService();
    };
    return (
      <div className="lsd-tab-content-stack">
        <LegalRichEditorField
          label="دفتر التدوين"
          icon={StickyNote}
          description="ملاحظات ومسودّات العمل الخاصة بهذه الخدمة — تُحفظ بصيغة غنية"
          value={service.work_notes}
          minHeight="360px"
          onSave={handleSaveNotes}
          successMessage="تم حفظ دفتر التدوين"
        />
      </div>
    );
  };

  // ── Side summary (ERP snapshot aside) ──────────────────────────────────────

  // ── بطاقة حالة التكليف ─────────────────────────────────────────────────
  // تصل الرحلة القادمة من صندوق البريد إلى آخرها: المهمة أُنجزت واعتمدها المدير
  // ⇒ الخدمة جاهزة للعميل. ولا نُحرّك الحالة آلياً — إرسال عقدٍ إلى عميل أثقل من
  // أن يقع كأثر جانبيّ لنقرة اعتماد؛ نعرض الزرّ ويقرّر الإنسان.

  const renderAssignmentCard = () => {
    if (!service || serviceTasks.length === 0) return null;

    const awaiting = serviceTasks.filter((t) => t.status === 'pending_approval');
    const approved = serviceTasks.filter((t) => t.status === 'completed' && !!t.approved_at);
    const open = serviceTasks.filter(
      (t) => !['completed', 'cancelled', 'archived', 'pending_approval'].includes(String(t.status)),
    );

    // لا شيء يستحق بطاقة: مهام مفتوحة فقط تظهر في تبويب المهام أصلاً
    if (awaiting.length === 0 && approved.length === 0) return null;

    const transitions = service.allowed_transitions ?? [];
    const canSendToClient = transitions.includes('client_review') || transitions.includes('delivered');
    const sendTarget = transitions.includes('client_review') ? 'client_review' : 'delivered';

    return (
      <div className="lsd-assign">
        {awaiting.length > 0 ? (
          <>
            <span className="lsd-assign__icon"><Clock size={14} /></span>
            <div className="lsd-assign__body">
              <b className="lsd-assign__title">
                {awaiting.length === 1
                  ? 'مهمة بانتظار الاعتماد'
                  : `${awaiting.length} مهام بانتظار الاعتماد`}
              </b>
              <span className="lsd-assign__text">
                أنهاها المكلَّف ولا تُغلق حتى يعتمدها المعتمِد — ولا تُسلَّم الخدمة للعميل قبل ذلك.
              </span>
            </div>
          </>
        ) : (
          <>
            <span className="lsd-assign__icon lsd-assign__icon--done"><CheckCircle size={14} /></span>
            <div className="lsd-assign__body">
              <b className="lsd-assign__title">اعتُمد إنجاز المهمة</b>
              <span className="lsd-assign__text">
                {open.length > 0
                  ? `بقيت ${open.length} مهمة قيد التنفيذ على هذه الخدمة.`
                  : 'اكتمل العمل الداخلي — الخدمة جاهزة لتصل العميل.'}
              </span>
            </div>
            <div className="lsd-assign__actions">
              <button
                className="lsd-assign__btn"
                disabled={!canSendToClient || statusLoading}
                title={
                  canSendToClient
                    ? 'ينقل الخدمة إلى مرحلة مراجعة العميل'
                    : 'مسار هذه الخدمة لا يسمح بالنقل من حالتها الحالية — غيّرها من «الخطوة التالية»'
                }
                onClick={() => handleStatusChange(sendTarget)}
              >
                <Send size={13} />
                {sendTarget === 'client_review' ? 'انقلها إلى مراجعة العميل' : 'سلّمها للعميل'}
              </button>
              <button
                className="lsd-assign__btn lsd-assign__btn--ghost"
                onClick={() => setActiveTab('files')}
              >
                <Link size={13} />
                رابط بوابة العميل
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  // ── «الخطوة التالية» — قائمة في الترويسة ─────────────────────────────────
  // كانت الحالة تُعرض أربع مرات (شارة الترويسة + شريط المراحل + بطاقة «الخطوة التالية» +
  // العمود الجانبي) ولها زرّان يفعلان الشيء نفسه («تغيير الحالة» والبطاقة). الآن شارة واحدة
  // وزرّ واحد بجوارها يجيب: أين نحن؟ ماذا تعني هذه الحالة؟ وما الخطوات المتاحة وأثر كلٍّ منها؟

  const renderNextStepMenu = () => {
    if (!service) return null;
    const transitions = service.allowed_transitions;
    const transitionsLoaded = Array.isArray(transitions);
    const explanation =
      STATUS_EXPLANATIONS[service.status] ??
      'حالة مخصّصة — راجع آخر ما جرى لمعرفة ما تم على الخدمة.';
    // «نهائية» تُعلَن فقط عندما تكون الحالة نهائية فعلاً — مصفوفة فارغة على حالة
    // غير نهائية تعني سجلاً قديماً خارج مسار النوع، لا قفلاً (كانت تكذب «نهائية»).
    const TERMINAL = ['closed', 'cancelled', 'archived', 'completed'];
    const isTerminal = transitionsLoaded && transitions.length === 0 && TERMINAL.includes(service.status);
    const isOffTrack = transitionsLoaded && transitions.length === 0 && !TERMINAL.includes(service.status);
    const sorted = transitionsLoaded ? sortTransitions(flow, transitions) : [];
    // الخطوة الأمامية الأولى هي ما يفعله الزر مباشرة — لا قائمة تُفتح لتُكتشف منها طريقة الانتقال
    // خدمة حالتها من خارج مسار نوعها: لا «تالٍ» لها — تُعاد إلى المحطة التي وصل إليها العمل فعلاً
    const forward = flow.offFlow ? null : sorted.find((t) => transitionKind(flow, t) === 'forward') ?? null;

    return (
      <div className="lsd-dropdown-wrapper lsd2-nextbtn" ref={statusDropdownRef}>
        <button
          className="lsd-header-btn lsd-header-btn--primary lsd2-nextbtn__main"
          onClick={() => (forward ? requestTransition(forward) : setShowStatusDropdown((v) => !v))}
          disabled={statusLoading || (transitionsLoaded && !forward && sorted.length === 0)}
          title={
            forward
              ? getTransitionHint(service.service_type, forward) ?? `انقل الخدمة إلى «${getStatusLabel(forward)}»`
              : undefined
          }
        >
          {statusLoading ? <span className="lsd-nextstep__spinner" /> : <ArrowLeft size={14} />}
          <span>
            {statusLoading
              ? 'جارٍ الانتقال...'
              : forward
              ? `التالي: ${getStatusLabel(forward)}`
              : flow.offFlow
              ? 'أعدها إلى المسار'
              : isTerminal
              ? 'اكتملت الدورة'
              : 'غيّر الحالة'}
          </span>
        </button>
        <button
          className="lsd-header-btn lsd-header-btn--primary lsd2-nextbtn__caret"
          onClick={() => setShowStatusDropdown((v) => !v)}
          disabled={statusLoading}
          aria-expanded={showStatusDropdown}
          aria-label="مسار الخدمة وكل الانتقالات المتاحة"
          title="مسار الخدمة وكل الانتقالات المتاحة"
        >
          <ChevronDown size={14} />
        </button>
        <AnimatePresence>
          {showStatusDropdown && (
            <motion.div
              className="lsd-dropdown lsd2-next"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {/* المسار الرئيسي — كان شريطاً أفقياً دائماً يأكل من ارتفاع كل التبويبات */}
              {flow.path.length > 0 && (
                <ol className="lsd2-next__flow">
                  {flow.path.map((step, idx) => {
                    const state = flow.cancelled ? 'todo' : idx < flow.index ? 'done' : idx === flow.index ? 'now' : 'todo';
                    return (
                      <li key={step.status} className={`lsd2-next__stage lsd2-next__stage--${state}`}>
                        <span className="lsd2-next__stage-dot">{state === 'done' ? <Check size={10} /> : idx + 1}</span>
                        {step.label}
                      </li>
                    );
                  })}
                </ol>
              )}
              <div className="lsd2-next__now">
                <div className="lsd2-next__eyebrow">
                  <Compass size={12} />
                  الحالة الآن
                  {renderStatusBadge(service.status)}
                </div>
                <p>
                  {flow.offFlow
                    ? `«${getStatusLabel(service.status)}» ليست من محطات هذا النوع من الخدمات — سُجّلت بها الخدمة قديماً. اختر المحطة التي وصل إليها العمل فعلاً لتعود إلى المسار.`
                    : explanation}
                </p>
                {flow.branch && flow.index >= 0 && (
                  <p className="lsd2-next__branch">
                    محطة جانبية تفرّعت من «{flow.path[flow.index].label}» — تعود منها إلى المسار.
                  </p>
                )}
              </div>

              {!transitionsLoaded ? (
                // حمولة ناقصة (باك أقدم/كاش) — لا نكذب «نهائية»؛ fetchService دفاعي سيكملها
                <p className="lsd2-next__note">
                  <span className="lsd-nextstep__spinner" />
                  جارٍ تحميل الخطوات المتاحة...
                </p>
              ) : isTerminal ? (
                <p className="lsd2-next__note">
                  {service.status === 'cancelled' ? <Lock size={13} /> : <CheckCircle size={13} />}
                  {service.status === 'cancelled'
                    ? 'الخدمة ملغاة — دورة العمل عليها منتهية.'
                    : 'اكتملت دورة هذه الخدمة — لا خطوات متبقية.'}
                </p>
              ) : isOffTrack ? (
                <p className="lsd2-next__note">
                  <Info size={13} />
                  هذه الحالة من سجل سابق خارج مسار النوع الحالي — لا انتقالات آلية منها، وبقية التبويبات متاحة.
                </p>
              ) : (
                <div className="lsd2-next__list">
                  {(flow.offFlow
                    ? // المحطات بترتيب المسار، ثم الفروع، والإلغاء آخراً
                      [
                        ...flow.path.map((f) => f.status).filter((st) => transitions.includes(st)),
                        ...transitions.filter((t) => t !== 'cancelled' && !flow.path.some((f) => f.status === t)),
                        ...transitions.filter((t) => t === 'cancelled'),
                      ]
                    : sorted
                  ).map((transition) => {
                    const kind = flow.offFlow && transition !== 'cancelled' ? 'branch' : transitionKind(flow, transition);
                    const hint = getTransitionHint(service.service_type, transition);
                    const verb = flow.offFlow
                      ? 'العمل الآن في'
                      : kind === 'forward' ? 'تقدّم إلى' : kind === 'back' ? 'أعدها إلى' : kind === 'cancel' ? '' : 'حوّلها إلى';
                    return (
                      <button
                        key={transition}
                        className={`lsd2-next__item lsd2-next__item--${kind}`}
                        onClick={() => requestTransition(transition)}
                        disabled={statusLoading}
                      >
                        <span className="lsd2-next__label">
                          {kind === 'back' ? <ChevronRight size={13} /> : kind === 'cancel' ? <X size={13} /> : <ArrowLeft size={12} />}
                          {kind === 'cancel' ? 'ألغِ الخدمة' : `${verb} «${getStatusLabel(transition)}»`}
                        </span>
                        {hint && <span className="lsd2-next__hint">{hint}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ── Loading & Error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="lsd-page" dir="rtl">
        <div className="lsd-loading-state">
          <div className="lsd-loading-state__spinner" />
          <p>جارٍ تحميل بيانات الخدمة...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="lsd-page" dir="rtl">
        <div className="lsd-error-state">
          <AlertTriangle size={36} />
          <p>{error ?? 'لم يتم العثور على الخدمة'}</p>
          <button
            className="lsd-header-btn lsd-header-btn--primary"
            onClick={() => navigate('/legal-services')}
          >
            <ChevronRight size={15} />
            العودة للقائمة
          </button>
        </div>
      </div>
    );
  }

  // ── Tab config ────────────────────────────────────────────────────────────

  const SERVICE_TYPE_TAB_MAP: Record<string, { key: string; label: string; icon: any }> = {
    consultation: { key: 'consultation', label: 'الاستشارة', icon: MessageSquareText },
    contract_drafting: { key: 'contract', label: 'صياغة العقود', icon: FileEdit },
    company_formation: { key: 'type_detail', label: 'تأسيس الشركة', icon: Building2 },
    licenses: { key: 'type_detail', label: 'الترخيص', icon: Award },
    arbitration: { key: 'type_detail', label: 'التحكيم', icon: Scale },
    compliance: { key: 'type_detail', label: 'الامتثال', icon: ShieldCheck },
    labor: { key: 'type_detail', label: 'العمالي', icon: Users },
    real_estate: { key: 'type_detail', label: 'العقار', icon: Home },
    due_diligence: { key: 'type_detail', label: 'العناية الواجبة', icon: FileCheck },
    ip: { key: 'type_detail', label: 'الملكية الفكرية', icon: Lightbulb },
    legal_notices: { key: 'type_detail', label: 'الإنذار', icon: Bell },
    training: { key: 'type_detail', label: 'التدريب', icon: GraduationCap },
  };

  const typeTab = SERVICE_TYPE_TAB_MAP[service.service_type];

  // خمسة تبويبات بدل ثمانية، والعمل أولاً: من يفتح الخدمة جاء ليعمل عليها.
  const tabs: { key: string; label: string; icon: any; count?: number }[] = [
    ...(typeTab ? [typeTab] : []),
    { key: 'info', label: 'نظرة عامة', icon: Info },
    { key: 'notes', label: 'التدوين', icon: StickyNote },
    {
      key: 'files',
      label: 'الملفات',
      icon: FileText,
      count: (service.service_documents?.length ?? 0) + (service.deliverables?.length ?? 0),
    },
    { key: 'billing', label: 'الوقت والفواتير', icon: Receipt, count: service.invoices?.length },
  ];

  const ServiceIcon = SERVICE_TYPE_ICONS[service.service_type] ?? FileText;

  // تبويب العقد مساحة عمل تملأ الارتفاع المتاح: الصفحة لا تتمرر، والتمرير داخل الورقة واللوحات
  const fitContract =
    (activeTab === 'contract' && service.service_type === 'contract_drafting') ||
    (activeTab === 'consultation' && service.service_type === 'consultation');
  const dueChip = dueChipFor(service);

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className={`lsd-page${fitContract ? ' lsd-page--fit' : ''}`} dir="rtl">
      {/* ── Header ── */}
      <header className="lsd-header lsd2-header">
        <div className="lsd2-header__row">
          <button
            className="lsd2-back"
            onClick={() => navigate('/legal-services')}
            title="الخدمات القانونية"
            aria-label="العودة إلى الخدمات القانونية"
          >
            <ChevronRight size={18} />
          </button>

          <span className="lsd2-header__icon">
            <ServiceIcon size={18} />
          </span>

          <div className="lsd2-header__titles">
            <h1 className="lsd2-header__title">{service.title}</h1>
            <div className="lsd2-header__sub">
              <span className="lsd-header__number">{service.service_number}</span>
              {renderTypePill(service.service_type)}
              {service.priority !== 'medium' && renderPriorityBadge(service.priority)}
              {service.client?.name && (
                <span className="lsd2-header__meta"><User size={12} />{service.client.name}</span>
              )}
              <span className="lsd2-header__meta">
                <Scale size={12} />
                {service.assigned_lawyer?.name ?? 'بلا محامٍ مسؤول'}
                {(service.assignees?.length ?? 0) > 1 && ` +${service.assignees!.length - 1}`}
              </span>
              {service.due_date && (
                <span className="lsd2-header__meta">
                  <Calendar size={12} />
                  {formatDate(service.due_date)}
                  {dueChip && <span className={`lsd2-fact__chip lsd2-fact__chip--${dueChip.tone}`}>{dueChip.text}</span>}
                </span>
              )}
            </div>
          </div>

          <div className="lsd2-header__actions">
            {/* الحالة تُعرض هنا مرة واحدة — مؤشر مراحل مصغّر — وبجوارها ما يُفعل بها */}
            {flow.path.length > 0 && (flow.index >= 0 || flow.cancelled) ? (
              <div
                className={`lsd2-stepper${flow.branch ? ' lsd2-stepper--branch' : ''}${flow.cancelled ? ' lsd2-stepper--cancelled' : ''}`}
                title={STATUS_EXPLANATIONS[service.status]}
                role="img"
                aria-label={
                  flow.cancelled
                    ? 'الخدمة ملغاة'
                    : `${getStatusLabel(service.status)} — المحطة ${flow.index + 1} من ${flow.path.length}`
                }
              >
                <span className="lsd2-stepper__label">
                  <b>{getStatusLabel(service.status)}</b>
                  <small>
                    {flow.cancelled
                      ? 'توقّف المسار'
                      : flow.branch
                      ? `من «${flow.path[flow.index].label}»`
                      : `${(flow.index + 1).toLocaleString('ar-SA')} من ${flow.path.length.toLocaleString('ar-SA')}`}
                  </small>
                </span>
                <span className="lsd2-stepper__bar" aria-hidden="true">
                  {flow.path.map((step, idx) => (
                    <i
                      key={step.status}
                      className={flow.cancelled ? '' : idx < flow.index ? 'is-done' : idx === flow.index ? 'is-now' : ''}
                    />
                  ))}
                </span>
              </div>
            ) : (
              <span title={STATUS_EXPLANATIONS[service.status]}>{renderStatusBadge(service.status)}</span>
            )}
            {renderNextStepMenu()}

            {/*
              تعديل بيانات الخدمة (العنوان/الأولوية/التسعير/التواريخ/المكلَّفين).

              🔴 لا تُعطّل هذا الزر بحالٍ من الحالات ولا تربطه بـ`LOCKED_STATUSES`:
              `LegalServiceController::update` **بلا أيّ حارس قفل** — يعمل حتى على
              `closed`/`archived`/`cancelled`. أقفال هذه الصفحة (`LOCKED_STATUSES`
              و`isContentLocked` في الباك) تخصّ **محتوى النوع** — الرأي والمسودات
              والمهام والتدوين — لا بيانات الخدمة نفسها. «توحيدُ» القفلين لاحقاً
              يكسر تعديلاً مشروعاً يقبله الخادم.

              وما لا يُعدَّل من هنا لأن الباك لا يقبله في `update`: الحالة (لها مسار
              انتقالات مستقلّ أعلاه)، ونوع الخدمة، والعميل.
            */}
            <button
              className="lsd-header-btn"
              onClick={() => setShowEditModal(true)}
              title="تعديل بيانات الخدمة"
            >
              <Pencil size={15} />
              <span>تعديل البيانات</span>
            </button>

            {/* الإجراءات الأقل تكراراً في قائمة واحدة بدل صفّ أزرار يزاحم العنوان */}
            <div className="lsd-dropdown-wrapper" ref={moreMenuRef}>
              <button
                className="lsd-header-btn lsd-header-btn--icon"
                onClick={() => setShowMoreMenu((v) => !v)}
                title="إجراءات أخرى"
                aria-label="إجراءات أخرى"
                aria-expanded={showMoreMenu}
              >
                <MoreHorizontal size={16} />
              </button>
              {showMoreMenu && (
                <div className="lsd-dropdown lsd2-more">
                  <button
                    className="lsd-dropdown__item"
                    onClick={() => { setShowMoreMenu(false); setShowInvoiceModal(true); }}
                  >
                    <Receipt size={14} />
                    إنشاء فاتورة
                  </button>
                  {/* Convert to case (only if convertible type and not already converted) */}
                  {!service.case_id && CONVERTIBLE_SERVICE_TYPES.includes(service.service_type) && (
                    <button
                      className="lsd-dropdown__item"
                      onClick={() => { setShowMoreMenu(false); setShowConvertModal(true); }}
                    >
                      <ArrowRightLeft size={14} />
                      تحويل لقضية
                    </button>
                  )}
                  {/*
                    الحذف متاح في كل الحالات: الصلاحية مفروضة في الباك على المسار
                    (legal-services.manage)، ولا توجد صلاحية legal-services.delete في المشروع.
                    حصرُه سابقاً بحالتَي new/cancelled كان قيداً واجهياً بلا سندٍ في الباك.
                  */}
                  {/* 🔴 كان الزرُّ يُعرض للجميع بلا أيّ ترشيحٍ بالصلاحية، فمن لا يملك
                      `legal-services.manage` يضغطه فيُردّ **403 صامتاً** — وهذا بعينه
                      ما وصفه العميل بأن الزرَّ «معطّل» (#159). الحارسُ في الباك سليم؛
                      الناقصُ كان أن تعكسه الواجهة. */}
                  {canManageService && (
                    <button
                      className="lsd-dropdown__item lsd2-more__danger"
                      onClick={() => { setShowMoreMenu(false); handleDelete(); }}
                      disabled={deleteLoading}
                    >
                      <Trash2 size={14} />
                      {deleteLoading ? 'جارٍ الحذف...' : 'حذف الخدمة'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </header>

      {/* ── حالة التكليف: بانتظار الاعتماد أو جاهزة للعميل ── */}
      {renderAssignmentCard()}

      {/* ── Tabs ── */}
      <nav className="lsd-tabs">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              className={`lsd-tab${activeTab === tab.key ? ' lsd-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <TabIcon size={14} />
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className="lsd-tab__count">{tab.count}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Tab Content ── */}
      <div className={`lsd-layout${fitContract ? ' lsd-layout--fit' : ''}`}>
        <div className="lsd-main">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className="lsd-tabpane"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {activeTab === 'info' && renderInfoTab()}
              {activeTab === 'consultation' && renderConsultationTab()}
              {activeTab === 'contract' && renderContractTab()}
              {activeTab === 'type_detail' && renderTypeDetailTab()}
              {activeTab === 'notes' && renderNotesTab()}
              {activeTab === 'files' && renderFilesTab()}
              {activeTab === 'billing' && renderBillingTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showConvertModal && (
          <ConvertToCaseModal
            defaultTitle={service.title}
            onConfirm={handleConvertToCase}
            onClose={() => setShowConvertModal(false)}
            loading={convertLoading}
          />
        )}
        {showInvoiceModal && (
          <CreateInvoiceModal
            onConfirm={handleCreateInvoice}
            onClose={() => setShowInvoiceModal(false)}
            loading={invoiceLoading}
          />
        )}
      </AnimatePresence>

      {(() => {
        const target = pendingTransition;
        if (!target) return null;
        const { effects, warnings } = transitionConcerns(target);
        return (
          <ConfirmDialog
            isOpen
            variant={target === 'cancelled' ? 'danger' : 'primary'}
            loading={statusLoading}
            onClose={() => setPendingTransition(null)}
            onConfirm={() => {
              setPendingTransition(null);
              void handleStatusChange(target);
            }}
            confirmLabel={target === 'cancelled' ? 'ألغِ الخدمة' : `انقلها إلى «${getStatusLabel(target)}»`}
            title={
              target === 'cancelled'
                ? 'إلغاء الخدمة'
                : `من «${getStatusLabel(service.status)}» إلى «${getStatusLabel(target)}»`
            }
            message={
              <div className="lsd2-confirm">
                {warnings.length > 0 && (
                  <div className="lsd2-confirm__warn">
                    <b><AlertTriangle size={13} /> قبل أن تنقلها</b>
                    <ul>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
                  </div>
                )}
                {effects.length > 0 && (
                  <>
                    <b>ما الذي يحدث عند الانتقال؟</b>
                    <ul>{effects.map((e) => <li key={e}>{e}</li>)}</ul>
                  </>
                )}
              </div>
            }
          />
        );
      })()}

      <AddExternalLinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onSubmit={handleAddDocumentLink}
        contextLabel={`الخدمة: ${service.service_number} — ${service.title}`}
      />

      {/*
        `onSaved` يُسلِّم خدمةً **مدموجة** (أعمدة الباك الطازجة فوق الكائن الحالي بعلاقاته)،
        فنكتفي بوضعها في الحالة. ولا نُنادي `fetchService` هنا: هي تُشعل `loading` العام،
        والمكوّن يُرجِع هيكل التحميل قبل أن يبلغ النوافذ — فتومض الصفحة كلها لأجل صفٍّ واحد.
      */}
      <EditServiceModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        service={service}
        onSaved={(updated) => setService(updated)}
      />

      {/*
        نافذةٌ واحدة بمرحلتين: الأولى تقول الحقيقة (سلّة محذوفات لا إعدام)، والثانية —
        حين يردّ الباك 409 — تعرض أرقام الأثر المالي قبل التأكيد بـconfirm=1.
      */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        variant="danger"
        loading={deleteLoading}
        onClose={closeDeleteConfirm}
        onConfirm={() => runDelete(deleteImpact !== null)}
        confirmLabel={deleteImpact ? 'حذف رغم الارتباط المالي' : 'نقل إلى سلّة المحذوفات'}
        title={deleteImpact ? 'الخدمة مرتبطة بسجلات مالية' : 'حذف الخدمة'}
        message={
          deleteImpact ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>{deleteImpactMessage || 'هذه الخدمة مرتبطة بسجلات مالية قائمة.'}</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: '4px 14px',
                  fontSize: 12.5,
                  border: '1px solid var(--color-border)',
                  borderRadius: 4,
                  padding: '8px 10px',
                }}
              >
                <span style={{ color: 'var(--color-text-secondary)' }}>عدد الفواتير</span>
                <strong>{deleteImpact.invoices_count}</strong>
                <span style={{ color: 'var(--color-text-secondary)' }}>مجموع الفواتير</span>
                <strong>{Number(deleteImpact.invoices_total).toLocaleString('ar-SA')} ريال</strong>
                <span style={{ color: 'var(--color-text-secondary)' }}>المدفوع منها</span>
                <strong>{deleteImpact.paid_invoices_count}</strong>
                <span style={{ color: 'var(--color-text-secondary)' }}>المهام المرتبطة</span>
                <strong>{deleteImpact.tasks_count}</strong>
                <span style={{ color: 'var(--color-text-secondary)' }}>المصروفات</span>
                <strong>{deleteImpact.expenses_count}</strong>
              </div>
            </div>
          ) : (
            'ستُنقل هذه الخدمة إلى سلّة المحذوفات مع مستنداتها ومخرجاتها وسجلّ وقتها، ويمكن استعادتها منها لاحقاً.'
          )
        }
        note={
          deleteImpact
            ? 'الفواتير والمصروفات تبقى كما هي ويُذكر فيها أنّ الخدمة حُذفت. والمهام والمصروفات لا تفقد ارتباطها بالخدمة إلا عند الحذف النهائي من سلّة المحذوفات.'
            : 'الحذف ناعم — لا يُفقد شيء، والاستعادة من سلّة المحذوفات تعيد الخدمة وأبناءها معاً.'
        }
      />

    </div>
  );
};

export default LegalServiceDetail;
