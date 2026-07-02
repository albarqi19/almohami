import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Upload,
  ExternalLink,
  BookOpen,
  ChevronDown,
  Check,
  AlertTriangle,
  ArrowRightLeft,
  Receipt,
  X,
  Link,
  CheckCircle,
  FileCheck,
  Tag,
  Info,
  Layers,
  AlignLeft,
  StickyNote,
  BarChart2,
  GitCompare,
  ArrowLeft,
  Sparkles,
  Copy,
  Lock,
  Compass,
} from 'lucide-react';

import { toast } from 'react-toastify';

import { LegalServiceService } from '../../services/legalServiceService';
import { apiClient } from '../../utils/api';
import { getApiErrorMessage } from '../../utils/apiError';
import TiptapEditor from '../../components/TiptapEditor';
import LegalRichEditorField from '../../components/legal-services/LegalRichEditorField';
import LegalRichText from '../../components/legal-services/LegalRichText';
import DeliverablesPanel from '../../components/legal-services/DeliverablesPanel';
import PortalLinksPanel from '../../components/legal-services/PortalLinksPanel';
import ContractAuditPanel from '../../components/legal-services/ContractAuditPanel';
import { diffWords, stripHtml, diffSummary } from '../../utils/legalDiff';
import type {
  LegalService,
  ServiceTimeEntryItem,
  StatusFlowItem,
  ChecklistItem,
  LegalReference,
  ContractDraftingVersion,
} from '../../types/legalServices';
import {
  SERVICE_TYPE_LABELS,
  PRIORITY_LABELS,
  BILLING_TYPE_LABELS,
  CLASSIFICATION_LABELS,
  URGENCY_LABELS,
  DELIVERY_METHOD_LABELS,
  CONTRACT_TYPE_LABELS,
  CONTRACT_LANGUAGE_LABELS,
  CONVERTIBLE_SERVICE_TYPES,
} from '../../types/legalServices';
import { WorkspaceRegistry } from '../../components/legal-services/workspaces';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// حالات يُقفل عندها محتوى الخدمة ضد التعديل (lockedStatuses) — عدا النهائية العامة
const LOCKED_STATUSES: Record<string, string[]> = {
  consultation: ['delivered'],
  contract_drafting: ['approved', 'signed', 'archived'],
  company_formation: ['completed'],
  licenses: ['active', 'renewed'],
  arbitration: ['award_issued', 'enforcement', 'settlement_reached'],
  compliance: ['compliant', 'monitoring'],
  labor: ['resolution', 'documentation', 'escalated_to_case'],
  real_estate: ['registration'],
  due_diligence: ['report_delivered'],
  ip: ['registration', 'active'],
  legal_notices: ['sent', 'delivered', 'escalated_to_case'],
  training: ['certificates_issued'],
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

function getDocumentEmoji(fileType: string): string {
  const t = (fileType || '').toLowerCase();
  if (t.includes('pdf')) return '📄';
  if (t.includes('word') || t.includes('doc')) return '📝';
  if (t.includes('sheet') || t.includes('excel') || t.includes('xls')) return '📊';
  if (t.includes('image') || t.includes('png') || t.includes('jpg')) return '🖼️';
  if (t.includes('zip') || t.includes('rar')) return '🗜️';
  return '📎';
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
  steps: StatusFlowItem[];
  currentStatus: string;
}

const StatusPipeline: React.FC<StatusPipelineProps> = ({ steps, currentStatus }) => {
  if (!steps.length) return null;

  const currentIndex = steps.findIndex((s) => s.status === currentStatus);

  return (
    <div className="lsd-status-pipeline">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isActive = idx === currentIndex;
        const stepClass = isCompleted
          ? 'lsd-pipeline-step--completed'
          : isActive
          ? 'lsd-pipeline-step--active'
          : 'lsd-pipeline-step--pending';

        return (
          <React.Fragment key={step.status}>
            <div className={`lsd-pipeline-step ${stepClass}`}>
              <div className="lsd-pipeline-step__content">
                <div className="lsd-pipeline-step__dot">
                  {isCompleted ? <Check size={12} /> : isActive ? idx + 1 : idx + 1}
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

// ── Add Reference Form ────────────────────────────────────────────────────────

interface AddReferenceFormProps {
  onSave: (ref: LegalReference) => void;
  onCancel: () => void;
  loading: boolean;
}

const AddReferenceForm: React.FC<AddReferenceFormProps> = ({ onSave, onCancel, loading }) => {
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [url, setUrl] = useState('');

  return (
    <div className="lsd-inline-form">
      <div className="lsd-form-group">
        <label className="lsd-form-label">العنوان *</label>
        <input
          className="lsd-form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: المادة 123 من نظام العمل"
        />
      </div>
      <div className="lsd-form-group">
        <label className="lsd-form-label">المصدر</label>
        <input
          className="lsd-form-input"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="مثال: نظام العمل السعودي"
        />
      </div>
      <div className="lsd-form-group">
        <label className="lsd-form-label">الرابط</label>
        <input
          className="lsd-form-input"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="lsd-inline-form__actions">
        <button className="lsd-header-btn" onClick={onCancel}>
          إلغاء
        </button>
        <button
          className="lsd-header-btn lsd-header-btn--primary"
          onClick={() => onSave({ title, source, url })}
          disabled={loading || !title.trim()}
        >
          {loading ? 'جارٍ الإضافة...' : 'إضافة'}
        </button>
      </div>
    </div>
  );
};

// ── New Version Form ──────────────────────────────────────────────────────────

interface NewVersionFormProps {
  onSave: (content: string, summary: string) => void;
  onCancel: () => void;
  loading: boolean;
}

const NewVersionForm: React.FC<NewVersionFormProps> = ({ onSave, onCancel, loading }) => {
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');

  return (
    <div className="lsd-inline-form">
      <div className="lsd-form-group">
        <label className="lsd-form-label">محتوى المسودة *</label>
        <TiptapEditor
          content={content}
          onChange={setContent}
          placeholder="أدخل نص المسودة..."
          minHeight="280px"
        />
      </div>
      <div className="lsd-form-group">
        <label className="lsd-form-label">ملخص التغييرات</label>
        <input
          className="lsd-form-input"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="مثال: تعديل بند الضمانات"
        />
      </div>
      <div className="lsd-inline-form__actions">
        <button className="lsd-header-btn" onClick={onCancel}>
          إلغاء
        </button>
        <button
          className="lsd-header-btn lsd-header-btn--primary"
          onClick={() => onSave(content, summary)}
          disabled={loading || !content.trim()}
        >
          {loading ? 'جارٍ الحفظ...' : 'إصدار مسودة جديدة'}
        </button>
      </div>
    </div>
  );
};

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

  // ── Action state ──
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
  const [showAddReference, setShowAddReference] = useState(false);
  const [addRefLoading, setAddRefLoading] = useState(false);
  const [deliverLoading, setDeliverLoading] = useState(false);
  // مسودة الرأي المقترحة بالذكاء (تُعرض في صندوق قابل للنسخ — لا تُحفظ تلقائياً)
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState<string | null>(null);

  // ── Contract state ──
  const [showNewVersionForm, setShowNewVersionForm] = useState(false);
  const [newVersionLoading, setNewVersionLoading] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [compareA, setCompareA] = useState<number | null>(null);
  const [compareB, setCompareB] = useState<number | null>(null);

  // ── Documents state ──
  const [docLoading, setDocLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusDropdownRef = useRef<HTMLDivElement>(null);

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
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Fetch service ──
  const fetchService = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await LegalServiceService.getService(Number(id));
      if (res.success) {
        setService(res.data);
        // بيانات ثانوية (خط سير الحالات/ملخص الوقت/المؤقت النشط): فشلها لا يعطّل
        // الصفحة، فلا نُغرق المستخدم بـ toasts عند التحميل — نكتفي بتسجيلها للمطوّر.
        try {
          const flowRes = await LegalServiceService.getStatusFlow(res.data.service_type);
          if (flowRes.success) setStatusFlow(flowRes.data);
        } catch (err) {
          console.warn('status-flow:', getApiErrorMessage(err));
        }
        // Fetch time summary
        try {
          const summaryRes = await LegalServiceService.getTimeSummary(Number(id));
          if (summaryRes.success) setTimeSummary(summaryRes.data);
        } catch (err) {
          console.warn('time-summary:', getApiErrorMessage(err));
        }
        // Check active timer
        try {
          const activeRes = await LegalServiceService.getActiveTimer();
          if (activeRes.success && activeRes.data) {
            setActiveTimerEntry(activeRes.data);
            setTimerRunning(true);
            const started = new Date(activeRes.data.started_at).getTime();
            setTimerSeconds(Math.floor((Date.now() - started) / 1000));
          }
        } catch (err) {
          console.warn('active-timer:', getApiErrorMessage(err));
        }
      } else {
        setError('تعذّر تحميل بيانات الخدمة');
      }
    } catch (err) {
      // نعرض رسالة الخادم الفعلية (404/403...) بدل نص عام
      setError(getApiErrorMessage(err, 'حدث خطأ في الاتصال بالخادم'));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

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
  const handleDelete = async () => {
    if (!service) return;
    if (!window.confirm('هل أنت متأكد من حذف هذه الخدمة؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    setDeleteLoading(true);
    try {
      const res = await LegalServiceService.deleteService(service.id);
      if (res.success) {
        toast.success('تم حذف الخدمة بنجاح');
        navigate('/legal-services');
      } else {
        toast.error('تعذّر حذف الخدمة');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر حذف الخدمة'));
    }
    setDeleteLoading(false);
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

  // ── Consultation actions ──
  const handleSaveOpinion = async (html: string) => {
    if (!service) return;
    const res = await LegalServiceService.updateOpinion(service.id, {
      legal_opinion: html,
    });
    if (!res?.success) throw new Error('تعذّر حفظ الرأي القانوني');
    await fetchService();
  };

  const handleAddReference = async (ref: LegalReference) => {
    if (!service) return;
    setAddRefLoading(true);
    try {
      await LegalServiceService.addReference(service.id, ref);
      setShowAddReference(false);
      toast.success('تم إضافة المرجع القانوني');
      fetchService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إضافة المرجع القانوني'));
    }
    setAddRefLoading(false);
  };

  const handleRemoveReference = async (index: number) => {
    if (!service) return;
    try {
      await LegalServiceService.removeReference(service.id, index);
      fetchService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر حذف المرجع القانوني'));
    }
  };

  const handleMarkDelivered = async () => {
    if (!service) return;
    setDeliverLoading(true);
    try {
      const res = await LegalServiceService.markDelivered(service.id);
      if (res.success) {
        setService(res.data);
        toast.success('تم تسليم الاستشارة بنجاح');
      } else {
        toast.error('تعذّر تسليم الاستشارة');
      }
    } catch (err) {
      // رسالة الباك (مثلاً: الرأي غير معتمد بعد / انتقال غير مسموح) تظهر كما هي
      toast.error(getApiErrorMessage(err, 'تعذّر تسليم الاستشارة'));
    }
    setDeliverLoading(false);
  };

  // اقتراح مسودة الرأي القانوني بالذكاء — تُعرض للنسخ فقط ولا تُحفظ تلقائياً
  const handleAiDraft = async () => {
    if (!service) return;
    setAiDraftLoading(true);
    try {
      const res = await apiClient.post<{
        success?: boolean;
        data?: { draft_html?: string; draft?: string; disclaimers?: string[] } | string;
        draft?: string;
      }>(`/legal-services/${service.id}/consultation/ai-draft`);
      // الشكل الرسمي: data.draft_html (+ أشكال احتياطية تحسّباً)
      const draft =
        (typeof res?.data === 'object' && (res.data?.draft_html || res.data?.draft)) ||
        res?.draft ||
        (typeof res?.data === 'string' ? res.data : null);
      if (draft && draft.trim()) {
        setAiDraft(draft);
      } else {
        toast.error('لم يُرجِع الخادم مسودة — حاول مجدداً أو اكتب الرأي يدوياً');
      }
    } catch (err) {
      // 503 = خدمة الذكاء غير مهيأة للمكتب — رسالة الخادم توضّح ذلك
      toast.error(getApiErrorMessage(err, 'تعذّر توليد المسودة الآلية'));
    }
    setAiDraftLoading(false);
  };

  // ── Contract actions ──
  const handleToggleChecklistItem = async (index: number) => {
    if (!service?.contract_drafting_detail?.checklist) return;
    const updated: ChecklistItem[] = service.contract_drafting_detail.checklist.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item
    );
    setChecklistLoading(true);
    try {
      await LegalServiceService.updateChecklist(service.id, updated);
      fetchService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر تحديث قائمة الفحص'));
    }
    setChecklistLoading(false);
  };

  const handleCreateVersion = async (content: string, summary: string) => {
    if (!service) return;
    setNewVersionLoading(true);
    try {
      await LegalServiceService.createVersion(service.id, {
        content,
        change_summary: summary,
      });
      setShowNewVersionForm(false);
      toast.success('تم إصدار مسودة جديدة بنجاح');
      fetchService();
    } catch (err) {
      // بعد الاعتماد/التوقيع يرفض الباك التعديل بـ422 برسالة واضحة — نعرضها
      toast.error(getApiErrorMessage(err, 'تعذّر إصدار المسودة الجديدة'));
    }
    setNewVersionLoading(false);
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

  const handleRemoveDocument = async (docId: number) => {
    if (!service) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا المستند؟')) return;
    try {
      await LegalServiceService.removeDocument(service.id, docId);
      toast.success('تم حذف المستند بنجاح');
      fetchService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر حذف المستند'));
    }
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

  const renderInfoTab = () => {
    if (!service) return null;
    return (
      <div className="lsd-info-cards-grid">
        {/* Card 1: معلومات أساسية */}
        <div className="lsd-card">
          <div className="lsd-card__header">
            <div className="lsd-card__title">
              <Info size={15} />
              معلومات أساسية
            </div>
          </div>
          <div className="lsd-card__content">
            <div className="lsd-info-grid">
              <div className="lsd-info-item">
                <div className="lsd-info-item__icon">
                  <User size={14} />
                </div>
                <div className="lsd-info-item__body">
                  <div className="lsd-info-item__label">العميل</div>
                  <div className="lsd-info-item__value">
                    {service.client?.name ?? <span className="lsd-info-item__value--muted">—</span>}
                  </div>
                </div>
              </div>

              <div className="lsd-info-item">
                <div className="lsd-info-item__icon">
                  <Scale size={14} />
                </div>
                <div className="lsd-info-item__body">
                  <div className="lsd-info-item__label">المحامي المسؤول</div>
                  <div className="lsd-info-item__value">
                    {service.assigned_lawyer?.name ?? (
                      <span className="lsd-info-item__value--muted">غير محدد</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="lsd-info-item">
                <div className="lsd-info-item__icon">
                  <Calendar size={14} />
                </div>
                <div className="lsd-info-item__body">
                  <div className="lsd-info-item__label">تاريخ الإنشاء</div>
                  <div className="lsd-info-item__value">{formatDate(service.created_at)}</div>
                </div>
              </div>

              <div className="lsd-info-item">
                <div className="lsd-info-item__icon">
                  <Calendar size={14} />
                </div>
                <div className="lsd-info-item__body">
                  <div className="lsd-info-item__label">تاريخ البدء</div>
                  <div className="lsd-info-item__value">
                    {service.start_date ? (
                      formatDate(service.start_date)
                    ) : (
                      <span className="lsd-info-item__value--muted">—</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="lsd-info-item">
                <div className="lsd-info-item__icon">
                  <AlertTriangle size={14} />
                </div>
                <div className="lsd-info-item__body">
                  <div className="lsd-info-item__label">تاريخ الاستحقاق</div>
                  <div className="lsd-info-item__value">
                    {service.due_date ? (
                      formatDate(service.due_date)
                    ) : (
                      <span className="lsd-info-item__value--muted">—</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="lsd-info-item">
                <div className="lsd-info-item__icon">
                  <Tag size={14} />
                </div>
                <div className="lsd-info-item__body">
                  <div className="lsd-info-item__label">المصدر</div>
                  <div className="lsd-info-item__value">
                    {service.source === 'manual'
                      ? 'يدوي'
                      : service.source === 'client_portal'
                      ? 'بوابة العميل'
                      : service.source === 'converted_from_case'
                      ? 'محوّل من قضية'
                      : service.source}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: معلومات مالية */}
        <div className="lsd-card">
          <div className="lsd-card__header">
            <div className="lsd-card__title">
              <DollarSign size={15} />
              المعلومات المالية
            </div>
          </div>
          <div className="lsd-card__content">
            <div className="lsd-info-grid">
              <div className="lsd-info-item">
                <div className="lsd-info-item__icon">
                  <Receipt size={14} />
                </div>
                <div className="lsd-info-item__body">
                  <div className="lsd-info-item__label">نوع الفوترة</div>
                  <div className="lsd-info-item__value">
                    {BILLING_TYPE_LABELS[service.billing_type] ?? service.billing_type}
                  </div>
                </div>
              </div>

              <div className="lsd-info-item">
                <div className="lsd-info-item__icon">
                  <DollarSign size={14} />
                </div>
                <div className="lsd-info-item__body">
                  <div className="lsd-info-item__label">المبلغ المتفق عليه</div>
                  <div className="lsd-info-item__value">
                    {service.agreed_amount ? (
                      `${parseFloat(service.agreed_amount).toLocaleString('ar-SA')} ريال`
                    ) : (
                      <span className="lsd-info-item__value--muted">—</span>
                    )}
                  </div>
                </div>
              </div>

              {service.billing_type === 'hourly' && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon">
                    <Clock size={14} />
                  </div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">سعر الساعة</div>
                    <div className="lsd-info-item__value">
                      {service.hourly_rate ? (
                        `${parseFloat(service.hourly_rate).toLocaleString('ar-SA')} ريال`
                      ) : (
                        <span className="lsd-info-item__value--muted">—</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="lsd-info-item">
                <div className="lsd-info-item__icon">
                  <BarChart2 size={14} />
                </div>
                <div className="lsd-info-item__body">
                  <div className="lsd-info-item__label">نسبة الضريبة</div>
                  <div className="lsd-info-item__value">{service.vat_rate}%</div>
                </div>
              </div>

              <div className="lsd-info-item">
                <div className="lsd-info-item__icon">
                  <CheckCircle size={14} />
                </div>
                <div className="lsd-info-item__body">
                  <div className="lsd-info-item__label">إجمالي المفوتر</div>
                  <div className="lsd-info-item__value">
                    {service.total_billed !== undefined ? (
                      `${Number(service.total_billed).toLocaleString('ar-SA')} ريال`
                    ) : (
                      <span className="lsd-info-item__value--muted">—</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="lsd-info-item">
                <div className="lsd-info-item__icon">
                  <Clock size={14} />
                </div>
                <div className="lsd-info-item__body">
                  <div className="lsd-info-item__label">إجمالي الوقت</div>
                  <div className="lsd-info-item__value">
                    {service.total_time_seconds != null ? (
                      formatSeconds(service.total_time_seconds)
                    ) : (
                      <span className="lsd-info-item__value--muted">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

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
    );
  };

  // ── Tab: Consultation ────────────────────────────────────────────────────

  const renderConsultationTab = () => {
    if (!service) return null;
    const detail = service.consultation_detail;
    if (!detail) {
      return (
        <div className="lsd-empty-tab">
          <MessageSquareText size={32} />
          <p>لا توجد تفاصيل استشارة</p>
          <span className="lsd-empty-tab__hint">
            لم تُسجَّل بيانات الاستشارة عند الإنشاء — عدّل الخدمة لإضافة سؤال العميل ونطاق الاستشارة.
          </span>
        </div>
      );
    }

    const references = detail.legal_references ?? [];
    // «تسليم الاستشارة» متاح فقط حين يسمح مسار الحالات بذلك (وإلا نعطّل الزر مع شرح)
    const allowedTransitions = service.allowed_transitions ?? [];
    const canDeliver =
      service.status === 'internal_review' || allowedTransitions.includes('delivered');
    const deliverDisabledReason =
      service.status === 'delivered'
        ? 'سُلّمت الاستشارة مسبقاً'
        : 'التسليم متاح بعد المراجعة الداخلية — غيّر الحالة من بطاقة «الخطوة التالية» أولاً';

    return (
      <div className="lsd-tab-content-stack">
        {/* Consultation details card */}
        <div className="lsd-card">
          <div className="lsd-card__header">
            <div className="lsd-card__title">
              <MessageSquareText size={15} />
              تفاصيل الاستشارة
            </div>
          </div>
          <div className="lsd-card__content">
            <div className="lsd-info-grid">
              {detail.classification && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon">
                    <Tag size={14} />
                  </div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">التصنيف</div>
                    <div className="lsd-info-item__value">
                      {CLASSIFICATION_LABELS[detail.classification]}
                    </div>
                  </div>
                </div>
              )}

              <div className="lsd-info-item">
                <div className="lsd-info-item__icon">
                  <AlertTriangle size={14} />
                </div>
                <div className="lsd-info-item__body">
                  <div className="lsd-info-item__label">الاستعجال</div>
                  <div className="lsd-info-item__value">
                    {URGENCY_LABELS[detail.urgency]}
                  </div>
                </div>
              </div>

              {detail.delivery_method && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon">
                    <ArrowRightLeft size={14} />
                  </div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">طريقة التسليم</div>
                    <div className="lsd-info-item__value">
                      {DELIVERY_METHOD_LABELS[detail.delivery_method]}
                    </div>
                  </div>
                </div>
              )}

              {detail.delivered_at && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon">
                    <CheckCircle size={14} />
                  </div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">تاريخ التسليم</div>
                    <div className="lsd-info-item__value">{formatDate(detail.delivered_at)}</div>
                  </div>
                </div>
              )}
            </div>

            {detail.scope_definition && (
              <div className="lsd-notes-section" style={{ marginTop: 12 }}>
                <div className="lsd-notes-section__label">نطاق الاستشارة</div>
                <p className="lsd-description-text">{detail.scope_definition}</p>
              </div>
            )}

            {detail.client_question && (
              <div className="lsd-notes-section" style={{ marginTop: 12 }}>
                <div className="lsd-notes-section__label">سؤال العميل</div>
                <p className="lsd-description-text">{detail.client_question}</p>
              </div>
            )}
          </div>
        </div>

        {/* Legal opinion (rich editor) */}
        <LegalRichEditorField
          label="الرأي القانوني"
          icon={FileText}
          value={detail.legal_opinion}
          onSave={handleSaveOpinion}
          readOnly={!!detail.opinion_finalized_at || !!detail.delivered_at}
          hint={detail.opinion_finalized_at
            ? `🔒 الرأي معتمد بتاريخ ${new Date(detail.opinion_finalized_at).toLocaleDateString('ar-SA')} — مقفل ضد التعديل`
            : undefined}
          minHeight="320px"
          placeholder="اكتب الرأي القانوني هنا..."
          emptyText="لم يُضف الرأي القانوني بعد — اضغط «تعديل» لبدء الكتابة"
          successMessage="تم حفظ الرأي القانوني"
        />

        {/* اقتراح مسودة الرأي بالذكاء — للنسخ فقط، لا تُحفظ تلقائياً */}
        <div className="lsd-card">
          <div className="lsd-card__header">
            <div className="lsd-card__title">
              <Sparkles size={15} />
              اقتراح مسودة الرأي بالذكاء
            </div>
            <button
              className="lsd-card__action"
              onClick={handleAiDraft}
              disabled={aiDraftLoading}
              title="يولّد مسودة أولية للرأي القانوني اعتماداً على سؤال العميل ونطاق الاستشارة"
            >
              {aiDraftLoading ? (
                <>
                  <span className="lsd-ai-spinner" />
                  جارٍ التوليد...
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  {aiDraft ? 'إعادة التوليد' : 'اقتراح مسودة'}
                </>
              )}
            </button>
          </div>
          <div className="lsd-card__content">
            {aiDraft ? (
              <div className="lsd-ai-draft">
                <div className="lsd-ai-draft__disclaimer">
                  <AlertTriangle size={13} />
                  مسودة آلية — تُراجَع قبل الاعتماد
                  <button
                    className="lsd-ai-draft__copy"
                    onClick={() => {
                      navigator.clipboard
                        .writeText(aiDraft)
                        .then(() => toast.success('نُسخت المسودة — الصقها في محرّر الرأي القانوني'))
                        .catch(() => toast.error('تعذّر النسخ إلى الحافظة'));
                    }}
                  >
                    <Copy size={12} />
                    نسخ المسودة
                  </button>
                </div>
                <div className="lsd-ai-draft__text" dir="rtl">
                  {aiDraft}
                </div>
              </div>
            ) : aiDraftLoading ? (
              <div className="lsd-empty-state-small">
                <span className="lsd-ai-spinner lsd-ai-spinner--lg" />
                <span>جارٍ توليد المسودة... قد يستغرق ذلك لحظات</span>
              </div>
            ) : (
              <div className="lsd-empty-state-small">
                <Sparkles size={22} />
                <span>
                  اضغط «اقتراح مسودة» ليقترح الذكاء نقطة بداية للرأي القانوني — ثم انسخها وعدّلها في المحرّر أعلاه.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* References */}
        <div className="lsd-card">
          <div className="lsd-card__header">
            <div className="lsd-card__title">
              <Layers size={15} />
              المراجع القانونية
              {references.length > 0 && (
                <span className="lsd-tab__count">{references.length}</span>
              )}
            </div>
            <button
              className="lsd-card__action"
              onClick={() => setShowAddReference(true)}
            >
              <Plus size={13} />
              إضافة مرجع
            </button>
          </div>
          <div className="lsd-card__content">
            <AnimatePresence>
              {showAddReference && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden', marginBottom: 12 }}
                >
                  <AddReferenceForm
                    onSave={handleAddReference}
                    onCancel={() => setShowAddReference(false)}
                    loading={addRefLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {references.length > 0 ? (
              <div className="lsd-references-list">
                {references.map((ref, idx) => (
                  <div key={idx} className="lsd-reference-item">
                    <div className="lsd-reference-item__icon">
                      <BookOpen size={15} />
                    </div>
                    <div className="lsd-reference-item__body">
                      <div className="lsd-reference-item__title">{ref.title}</div>
                      {ref.source && (
                        <div className="lsd-reference-item__source">{ref.source}</div>
                      )}
                      {ref.url && (
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="lsd-reference-item__link"
                        >
                          <ExternalLink size={11} />
                          فتح الرابط
                        </a>
                      )}
                    </div>
                    <button
                      className="lsd-doc-action-btn"
                      title="حذف المرجع"
                      onClick={() => handleRemoveReference(idx)}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              !showAddReference && (
                <div className="lsd-empty-state-small">
                  <BookOpen size={22} />
                  <span>لا توجد مراجع قانونية</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Consultation actions */}
        <div className="lsd-consultation-actions">
          <button
            className="lsd-header-btn lsd-header-btn--primary"
            onClick={handleMarkDelivered}
            disabled={deliverLoading || !canDeliver}
            title={!canDeliver ? deliverDisabledReason : 'يسلّم الرأي للعميل ويقفل المحتوى ضد التعديل'}
          >
            <CheckCircle size={15} />
            {deliverLoading ? 'جارٍ...' : 'تسليم الاستشارة'}
          </button>
          {!canDeliver && (
            <span className="lsd-action-hint">
              <Info size={12} />
              {deliverDisabledReason}
            </span>
          )}
        </div>
        <p className="lsd-info-item__value--muted" style={{ fontSize: 12, marginTop: 4 }}>
          لتوليد خطاب الرأي القانوني الرسمي (PDF) انتقل إلى تبويب «المخرجات».
        </p>
      </div>
    );
  };

  // ── Tab: Contract Drafting ────────────────────────────────────────────────

  const renderContractTab = () => {
    if (!service) return null;
    const detail = service.contract_drafting_detail;
    if (!detail) {
      return (
        <div className="lsd-empty-tab">
          <FileEdit size={32} />
          <p>لا توجد تفاصيل صياغة عقود</p>
          <span className="lsd-empty-tab__hint">
            لم تُسجَّل بيانات العقد عند الإنشاء — عدّل الخدمة لتحديد نوع العقد ولغته وقيمته.
          </span>
        </div>
      );
    }

    const checklist = detail.checklist ?? [];
    const completedCount = checklist.filter((i) => i.checked).length;
    const progressPct = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;
    const versions = detail.versions ?? [];

    // إصدارات مرتّبة تنازلياً حسب رقم الإصدار (الأحدث أولاً) — بشكل متين
    const versionsDesc: ContractDraftingVersion[] = [...versions].sort(
      (a, b) => b.version_number - a.version_number
    );
    const latestVersion = versionsDesc[0] ?? null;

    // اختيار افتراضي للمقارنة: A = الإصدار السابق، B = الأحدث
    const defaultB = versionsDesc[0]?.version_number ?? null;
    const defaultA = versionsDesc[1]?.version_number ?? null;
    const selA = compareA ?? defaultA;
    const selB = compareB ?? defaultB;
    const vA = versionsDesc.find((v) => v.version_number === selA) ?? null;
    const vB = versionsDesc.find((v) => v.version_number === selB) ?? null;
    const diffParts =
      vA && vB ? diffWords(stripHtml(vA.content), stripHtml(vB.content)) : [];
    const diffStats = diffSummary(diffParts);

    return (
      <div className="lsd-tab-content-stack">
        {/* Contract details */}
        <div className="lsd-card">
          <div className="lsd-card__header">
            <div className="lsd-card__title">
              <FileEdit size={15} />
              تفاصيل العقد
            </div>
          </div>
          <div className="lsd-card__content">
            <div className="lsd-info-grid">
              {detail.contract_type && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon">
                    <FileText size={14} />
                  </div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">نوع العقد</div>
                    <div className="lsd-info-item__value">
                      {detail.contract_type === 'other' && detail.contract_type_other
                        ? detail.contract_type_other
                        : CONTRACT_TYPE_LABELS[detail.contract_type]}
                    </div>
                  </div>
                </div>
              )}

              <div className="lsd-info-item">
                <div className="lsd-info-item__icon">
                  <AlignLeft size={14} />
                </div>
                <div className="lsd-info-item__body">
                  <div className="lsd-info-item__label">لغة العقد</div>
                  <div className="lsd-info-item__value">
                    {CONTRACT_LANGUAGE_LABELS[detail.contract_language]}
                  </div>
                </div>
              </div>

              {detail.contract_value && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon">
                    <DollarSign size={14} />
                  </div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">قيمة العقد</div>
                    <div className="lsd-info-item__value">
                      {parseFloat(detail.contract_value).toLocaleString('ar-SA')}{' '}
                      {detail.contract_currency}
                    </div>
                  </div>
                </div>
              )}

              {detail.contract_start_date && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon">
                    <Calendar size={14} />
                  </div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">تاريخ بدء العقد</div>
                    <div className="lsd-info-item__value">
                      {formatDate(detail.contract_start_date)}
                    </div>
                  </div>
                </div>
              )}

              {detail.contract_end_date && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon">
                    <Calendar size={14} />
                  </div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">تاريخ انتهاء العقد</div>
                    <div className="lsd-info-item__value">
                      {formatDate(detail.contract_end_date)}
                    </div>
                  </div>
                </div>
              )}

              <div className="lsd-info-item">
                <div className="lsd-info-item__icon">
                  <CheckCircle size={14} />
                </div>
                <div className="lsd-info-item__body">
                  <div className="lsd-info-item__label">التجديد التلقائي</div>
                  <div className="lsd-info-item__value">
                    {detail.auto_renewal ? 'نعم' : 'لا'}
                    {detail.auto_renewal && detail.renewal_notice_days ? (
                      <span className="lsd-info-item__value--muted" style={{ marginRight: 6, fontSize: 12 }}>
                        (إشعار قبل {detail.renewal_notice_days} يوم)
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist */}
        {checklist.length > 0 && (
          <div className="lsd-card">
            <div className="lsd-card__header">
              <div className="lsd-card__title">
                <CheckCircle size={15} />
                قائمة الفحص
              </div>
            </div>
            <div className="lsd-card__content">
              <div className="lsd-checklist">
                <div className="lsd-checklist__progress">
                  <div className="lsd-checklist__progress-bar">
                    <div
                      className="lsd-checklist__progress-fill"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="lsd-checklist__progress-label">
                    {completedCount}/{checklist.length} ({progressPct}%)
                  </span>
                </div>
                {checklist.map((item, idx) => (
                  <div
                    key={item.key}
                    className={`lsd-checklist-item${item.checked ? ' lsd-checklist-item--checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => handleToggleChecklistItem(idx)}
                      disabled={checklistLoading}
                    />
                    <span className="lsd-checklist-item__text">{item.label}</span>
                    {item.notes && (
                      <span className="lsd-checklist-item__assignee">{item.notes}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* العقد الحالي — أحدث إصدار */}
        <div className="lsd-card">
          <div className="lsd-card__header">
            <div className="lsd-card__title">
              <FileCheck size={15} />
              العقد الحالي
              {latestVersion && (
                <span className="lsd-tab__count">v{latestVersion.version_number}</span>
              )}
            </div>
            {/* [P3.3] الصياغة المعتمدة تتحوّل لعقد رسمي في وحدة العقود (مرة واحدة) */}
            {latestVersion && !service.contract_id && (
              <button
                className="lsd-card__action"
                onClick={handleConvertToContract}
                disabled={convertingToContract}
                title="ينشئ عقداً رسمياً في وحدة العقود من أحدث إصدار للصياغة، ويربطه بهذه الخدمة"
              >
                {convertingToContract ? 'جارٍ التحويل...' : '⚖️ تحويل إلى عقد رسمي'}
              </button>
            )}
            {service.contract_id && (
              <span className="lsd-tab__count" title="لهذه الخدمة عقد رسمي مرتبط">
                ✓ مرتبطة بعقد رسمي{service.contract?.contract_number ? ` (${service.contract.contract_number})` : ''}
              </span>
            )}
          </div>
          <div className="lsd-card__content">
            <LegalRichText
              html={latestVersion?.content}
              emptyText="لا توجد مسودة بعد"
            />
          </div>
        </div>

        {/* التدقيق الآلي للعقد (AI) */}
        <ContractAuditPanel
          serviceId={service.id}
          versionContent={latestVersion?.content}
          existingAudit={detail.ai_audit ?? null}
        />

        {/* مقارنة الإصدارات (redline) */}
        {versions.length >= 2 && (
          <div className="lsd-card">
            {/* ستايل .lsd-diff انتقل إلى legal-service-detail.css بمتغيّرات الثيم */}
            <div className="lsd-card__header">
              <div className="lsd-card__title">
                <GitCompare size={15} />
                مقارنة الإصدارات
              </div>
              <button
                className="lsd-card__action"
                onClick={() => setShowCompare((v) => !v)}
              >
                {showCompare ? 'إخفاء' : 'عرض'}
              </button>
            </div>
            <AnimatePresence>
              {showCompare && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="lsd-card__content">
                    <div className="lsd-form-row" dir="rtl">
                      <div className="lsd-form-group">
                        <label className="lsd-form-label">الإصدار الأقدم</label>
                        <select
                          className="lsd-form-input"
                          value={selA ?? ''}
                          onChange={(e) => setCompareA(Number(e.target.value))}
                        >
                          {versionsDesc.map((v) => (
                            <option key={v.id} value={v.version_number}>
                              v{v.version_number}
                              {v.change_summary ? ` — ${v.change_summary}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="lsd-form-group">
                        <label className="lsd-form-label">الإصدار الأحدث</label>
                        <select
                          className="lsd-form-input"
                          value={selB ?? ''}
                          onChange={(e) => setCompareB(Number(e.target.value))}
                        >
                          {versionsDesc.map((v) => (
                            <option key={v.id} value={v.version_number}>
                              v{v.version_number}
                              {v.change_summary ? ` — ${v.change_summary}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {vA && vB && (
                      <>
                        <div
                          className="lsd-version-item__meta"
                          style={{ marginBottom: 8 }}
                        >
                          +{diffStats.added} / -{diffStats.removed} كلمة
                        </div>
                        <div className="lsd-diff" dir="rtl">
                          {diffParts.map((part, idx) => {
                            if (part.type === 'add') return <ins key={idx}>{part.text}</ins>;
                            if (part.type === 'del') return <del key={idx}>{part.text}</del>;
                            return <span key={idx}>{part.text}</span>;
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Versions */}
        <div className="lsd-card">
          <div className="lsd-card__header">
            <div className="lsd-card__title">
              <Layers size={15} />
              إصدارات المسودة
              {versions.length > 0 && (
                <span className="lsd-tab__count">{versions.length}</span>
              )}
            </div>
            <button
              className="lsd-card__action"
              onClick={() => setShowNewVersionForm(true)}
            >
              <Plus size={13} />
              إصدار جديد
            </button>
          </div>
          <div className="lsd-card__content">
            <AnimatePresence>
              {showNewVersionForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden', marginBottom: 12 }}
                >
                  <NewVersionForm
                    onSave={handleCreateVersion}
                    onCancel={() => setShowNewVersionForm(false)}
                    loading={newVersionLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {versions.length > 0 ? (
              <div className="lsd-versions-list">
                {versions.map((ver) => {
                  const isCurrent = ver.version_number === detail.current_version;
                  return (
                    <div
                      key={ver.id}
                      className={`lsd-version-item lsd-version-item--block${isCurrent ? ' lsd-version-item--current' : ''}`}
                    >
                      <div className="lsd-version-item__row">
                        <div className="lsd-version-item__badge">v{ver.version_number}</div>
                        <div className="lsd-version-item__info">
                          <div className="lsd-version-item__name">
                            {ver.change_summary ?? `مسودة الإصدار ${ver.version_number}`}
                          </div>
                          <div className="lsd-version-item__meta">
                            {ver.creator?.name ?? '—'} · {formatDate(ver.created_at)}
                          </div>
                        </div>
                        <span className={`ls-status-badge ls-status-badge--${ver.status === 'approved' ? 'completed' : ver.status === 'rejected' ? 'cancelled' : 'in_progress'}`}>
                          <span className="ls-status-badge__dot" />
                          {ver.status === 'draft'
                            ? 'مسودة'
                            : ver.status === 'review'
                            ? 'مراجعة'
                            : ver.status === 'approved'
                            ? 'معتمد'
                            : 'مرفوض'}
                        </span>
                      </div>
                      {ver.content && (
                        <div className="lsd-version-item__content">
                          <LegalRichText html={ver.content} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              !showNewVersionForm && (
                <div className="lsd-empty-state-small">
                  <Layers size={22} />
                  <span>لا توجد إصدارات بعد</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Review comments & client feedback */}
        {(detail.review_comments || detail.client_feedback) && (
          <div className="lsd-card">
            <div className="lsd-card__header">
              <div className="lsd-card__title">
                <StickyNote size={15} />
                الملاحظات والتغذية الراجعة
              </div>
            </div>
            <div className="lsd-card__content">
              {detail.review_comments && (
                <div className="lsd-notes-section">
                  <div className="lsd-notes-section__label">ملاحظات المراجعة</div>
                  <p className="lsd-description-text">{detail.review_comments}</p>
                </div>
              )}
              {detail.client_feedback && (
                <div className="lsd-notes-section">
                  <div className="lsd-notes-section__label">ملاحظات العميل</div>
                  <p className="lsd-description-text">{detail.client_feedback}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Tab: Type-Specific Detail (مساحات العمل التفاعلية) ──────────────────

  const renderTypeDetailTab = () => {
    if (!service) return null;

    // التحقق من وجود workspace مسجّل لهذا النوع
    const Workspace = WorkspaceRegistry[service.service_type];
    if (Workspace) {
      return <Workspace service={service} refreshService={fetchService} />;
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
                  return (
                    <div key={doc.id} className="lsd-document-item">
                      <div className="lsd-document-item__icon">
                        {getDocumentEmoji(docData.file_type)}
                      </div>
                      <div className="lsd-document-item__info">
                        <div className="lsd-document-item__name">{docData.title}</div>
                        <div className="lsd-document-item__meta">
                          {formatFileSize(docData.file_size)}
                          {doc.relation_type && (
                            <span className="lsd-relation-badge">{doc.relation_type}</span>
                          )}
                        </div>
                      </div>
                      <div className="lsd-document-item__actions">
                        <button
                          className="lsd-doc-action-btn"
                          title="حذف المستند"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveDocument(doc.id);
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
              <div className="lsd-empty">لا توجد مستندات — اربط OneDrive لبدء رفع المستندات.</div>
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

          {timeSummary && (
            <div className="lsd-timer-widget__summary">
              <div className="lsd-timer-summary-item">
                <div className="lsd-timer-summary-item__value">{timeSummary.total_formatted}</div>
                <div className="lsd-timer-summary-item__label">إجمالي الوقت</div>
              </div>
              <div className="lsd-timer-summary-item">
                <div className="lsd-timer-summary-item__value">{timeSummary.billable_formatted}</div>
                <div className="lsd-timer-summary-item__label">الوقت القابل للفوترة</div>
              </div>
              <div className="lsd-timer-summary-item">
                <div className="lsd-timer-summary-item__value">
                  {Number(timeSummary.total_amount).toLocaleString('ar-SA')}
                </div>
                <div className="lsd-timer-summary-item__label">المبلغ (ريال)</div>
              </div>
            </div>
          )}
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
    const activities = [...(service.service_activities ?? [])].reverse();

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
              سجل الأنشطة
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
                      <div className="lsd-timeline__text">{activity.title}</div>
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

  const renderAside = () => {
    if (!service) return null;
    const billingLabel = BILLING_TYPE_LABELS[service.billing_type] ?? service.billing_type;
    const agreed = service.agreed_amount
      ? `${parseFloat(service.agreed_amount).toLocaleString('ar-SA')} ريال`
      : null;
    const hourly = service.hourly_rate
      ? `${parseFloat(service.hourly_rate).toLocaleString('ar-SA')} ريال/س`
      : null;
    const totalBilled =
      service.total_billed !== undefined && service.total_billed !== null
        ? `${Number(service.total_billed).toLocaleString('ar-SA')} ريال`
        : '—';

    return (
      <aside className="lsd-aside">
        {/* Snapshot card */}
        <div className="lsd-aside-card">
          <div className="lsd-aside-card__header">
            <Info size={14} />
            ملخّص سريع
          </div>
          <div className="lsd-aside-card__body">
            <div className="lsd-aside-row">
              <span className="lsd-aside-row__label">
                <User size={13} /> العميل
              </span>
              <span className="lsd-aside-row__value">{service.client?.name ?? '—'}</span>
            </div>
            <div className="lsd-aside-row">
              <span className="lsd-aside-row__label">
                <Scale size={13} /> المحامي
              </span>
              <span className="lsd-aside-row__value">
                {service.assigned_lawyer?.name ?? 'غير محدد'}
              </span>
            </div>
            <div className="lsd-aside-row">
              <span className="lsd-aside-row__label">الحالة</span>
              <span className="lsd-aside-row__value">{renderStatusBadge(service.status)}</span>
            </div>
            <div className="lsd-aside-row">
              <span className="lsd-aside-row__label">الأولوية</span>
              <span className="lsd-aside-row__value">{renderPriorityBadge(service.priority)}</span>
            </div>
          </div>
        </div>

        {/* Financial snapshot */}
        <div className="lsd-aside-card">
          <div className="lsd-aside-card__header">
            <DollarSign size={14} />
            المالية
          </div>
          <div className="lsd-aside-card__body">
            <div className="lsd-aside-row">
              <span className="lsd-aside-row__label">نوع الفوترة</span>
              <span className="lsd-aside-row__value">{billingLabel}</span>
            </div>
            {agreed && (
              <div className="lsd-aside-row">
                <span className="lsd-aside-row__label">المبلغ المتفق</span>
                <span className="lsd-aside-row__value">{agreed}</span>
              </div>
            )}
            {service.billing_type === 'hourly' && hourly && (
              <div className="lsd-aside-row">
                <span className="lsd-aside-row__label">سعر الساعة</span>
                <span className="lsd-aside-row__value">{hourly}</span>
              </div>
            )}
            <div className="lsd-aside-row">
              <span className="lsd-aside-row__label">إجمالي المفوتر</span>
              <span className="lsd-aside-row__value">{totalBilled}</span>
            </div>
          </div>
        </div>

        {/* Key dates */}
        <div className="lsd-aside-card">
          <div className="lsd-aside-card__header">
            <Calendar size={14} />
            تواريخ مهمة
          </div>
          <div className="lsd-aside-card__body">
            <div className="lsd-aside-row">
              <span className="lsd-aside-row__label">البدء</span>
              <span className="lsd-aside-row__value">{formatDate(service.start_date)}</span>
            </div>
            <div className="lsd-aside-row">
              <span className="lsd-aside-row__label">الاستحقاق</span>
              <span className="lsd-aside-row__value">{formatDate(service.due_date)}</span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="lsd-aside-actions">
          {!service.case_id && CONVERTIBLE_SERVICE_TYPES.includes(service.service_type) && (
            <button
              className="lsd-aside-action-btn"
              onClick={() => setShowConvertModal(true)}
            >
              <ArrowRightLeft size={14} />
              تحويل لقضية
            </button>
          )}
          <button
            className="lsd-aside-action-btn lsd-aside-action-btn--primary"
            onClick={() => setShowInvoiceModal(true)}
          >
            <Receipt size={14} />
            إنشاء فاتورة
          </button>
        </div>
      </aside>
    );
  };

  // ── بطاقة «الخطوة التالية» — أوضح عنصر في الصفحة ──────────────────────────
  // تجيب فوراً: أين نحن الآن؟ ماذا تعني هذه الحالة عملياً؟ وما الخطوات المتاحة؟

  const renderNextStepCard = () => {
    if (!service) return null;
    const transitions = service.allowed_transitions ?? [];
    const explanation =
      STATUS_EXPLANATIONS[service.status] ??
      'حالة مخصّصة — راجع سجل الأنشطة لمعرفة آخر ما جرى على الخدمة.';
    const isFinal = transitions.length === 0;

    return (
      <div className="lsd-nextstep">
        <div className="lsd-nextstep__current">
          <div className="lsd-nextstep__eyebrow">
            <Compass size={13} />
            الحالة الحالية
          </div>
          <div className="lsd-nextstep__status">
            {renderStatusBadge(service.status)}
          </div>
          <p className="lsd-nextstep__explanation">{explanation}</p>
        </div>

        <div className="lsd-nextstep__actions">
          <div className="lsd-nextstep__eyebrow">
            <ArrowLeft size={13} />
            الخطوة التالية
          </div>
          {isFinal ? (
            <p className="lsd-nextstep__final">
              <Lock size={13} />
              هذه حالة نهائية — لا انتقالات متاحة على هذه الخدمة.
            </p>
          ) : (
            <div className="lsd-nextstep__buttons">
              {transitions.map((transition) => {
                const hint = getTransitionHint(service.service_type, transition);
                return (
                  <button
                    key={transition}
                    className={`lsd-nextstep-btn${
                      transition === 'cancelled' ? ' lsd-nextstep-btn--danger' : ''
                    }`}
                    onClick={() => handleStatusChange(transition)}
                    disabled={statusLoading}
                    title={hint ? `عند الانتقال: ${hint}` : `الانتقال إلى «${getStatusLabel(transition)}»`}
                  >
                    <span className="lsd-nextstep-btn__label">
                      <ArrowLeft size={13} />
                      {getStatusLabel(transition)}
                    </span>
                    {hint && <span className="lsd-nextstep-btn__hint">{hint}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
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

  const tabs: { key: string; label: string; icon: any; count?: number }[] = [
    { key: 'info', label: 'المعلومات', icon: Info },
    ...(typeTab ? [typeTab] : []),
    { key: 'notes', label: 'التدوين', icon: StickyNote },
    // عدّاد المخرجات/الفواتير يظهر متى توفّرت البيانات — يوجّه العين لما أُنجز
    { key: 'deliverables', label: 'المخرجات', icon: FileCheck, count: service.deliverables?.length },
    { key: 'documents', label: 'المستندات', icon: FileText, count: service.service_documents?.length },
    { key: 'time', label: 'تتبع الوقت', icon: Clock, count: service.time_entries?.length },
    { key: 'activities', label: 'الأنشطة', icon: Clock, count: service.service_activities?.length },
    { key: 'invoices', label: 'الفواتير', icon: Receipt, count: service.invoices?.length },
  ];

  const ServiceIcon = SERVICE_TYPE_ICONS[service.service_type] ?? FileText;
  const canDelete = service.status === 'new' || service.status === 'cancelled';

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="lsd-page" dir="rtl">
      {/* ── Header ── */}
      <header className="lsd-header">
        <div className="lsd-header__top">
          {/* Back button */}
          <button
            className="lsd-back-btn"
            onClick={() => navigate('/legal-services')}
          >
            <ChevronRight size={16} />
            الخدمات القانونية
          </button>

          <span className="lsd-breadcrumb__sep">/</span>

          {/* Title section */}
          <div className="lsd-header__title-section">
            <div className="lsd-header__title">
              <ServiceIcon size={20} />
              <span>{service.title}</span>
            </div>
            <div className="lsd-header__subtitle">
              <span className="lsd-header__number">{service.service_number}</span>
            </div>
          </div>

          {/* Badges */}
          <div className="lsd-header__badges">
            {renderTypePill(service.service_type)}
            {renderStatusBadge(service.status)}
            {renderPriorityBadge(service.priority)}
          </div>

          {/* Actions */}
          <div className="lsd-header__actions">
            {/* Status change dropdown */}
            <div className="lsd-dropdown-wrapper" ref={statusDropdownRef}>
              <button
                className="lsd-header-btn"
                onClick={() => setShowStatusDropdown((v) => !v)}
                disabled={statusLoading}
              >
                <ChevronDown size={14} />
                <span>تغيير الحالة</span>
              </button>
              <AnimatePresence>
                {showStatusDropdown && service.allowed_transitions && service.allowed_transitions.length > 0 && (
                  <motion.div
                    className="lsd-dropdown"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    {service.allowed_transitions.map((transition) => (
                      <button
                        key={transition}
                        className="lsd-dropdown__item"
                        onClick={() => handleStatusChange(transition)}
                      >
                        <span
                          className={`ls-status-badge ls-status-badge--${transition}`}
                          style={{ padding: '1px 6px', fontSize: 11 }}
                        >
                          <span className="ls-status-badge__dot" />
                          {getStatusLabel(transition)}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Convert to case (only if convertible type and not already converted) */}
            {!service.case_id && CONVERTIBLE_SERVICE_TYPES.includes(service.service_type) && (
              <button
                className="lsd-header-btn"
                onClick={() => setShowConvertModal(true)}
              >
                <ArrowRightLeft size={15} />
                <span>تحويل لقضية</span>
              </button>
            )}

            {/* Create invoice */}
            <button
              className="lsd-header-btn lsd-header-btn--primary"
              onClick={() => setShowInvoiceModal(true)}
            >
              <Receipt size={15} />
              <span>إنشاء فاتورة</span>
            </button>

            {/* Delete (only if new or cancelled) */}
            {canDelete && (
              <button
                className="lsd-header-btn lsd-header-btn--danger"
                onClick={handleDelete}
                disabled={deleteLoading}
                title="حذف الخدمة"
              >
                <Trash2 size={15} />
                <span>{deleteLoading ? 'جارٍ الحذف...' : 'حذف'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Status Pipeline ── */}
      <StatusPipeline steps={statusFlow} currentStatus={service.status} />

      {/* ── بطاقة «الخطوة التالية» — أعلى المحتوى ── */}
      {renderNextStepCard()}

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
      <div className="lsd-layout">
        <div className="lsd-workarea">
          <div className="lsd-main">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
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
                {activeTab === 'deliverables' && (
                  <DeliverablesPanel serviceId={service.id} serviceType={service.service_type} />
                )}
                {activeTab === 'documents' && renderDocumentsTab()}
                {activeTab === 'time' && renderTimeTab()}
                {activeTab === 'activities' && renderActivitiesTab()}
                {activeTab === 'invoices' && renderInvoicesTab()}
              </motion.div>
            </AnimatePresence>
          </div>
          {renderAside()}
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

    </div>
  );
};

export default LegalServiceDetail;
