import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Briefcase,
  Plus,
  Search,
  X,
  List,
  LayoutGrid,
  ChevronRight,
  ChevronLeft,
  FileText,
  Eye,
  User,
  Calendar,
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
  MoreHorizontal,
  AlertCircle,
  RefreshCw,
  FilterX,
} from 'lucide-react';
import { toast } from 'react-toastify';

import { LegalServiceService } from '../../services/legalServiceService';
import { getApiErrorMessage } from '../../utils/apiError';
import type {
  LegalService,
  LegalServiceFilters,
  ServiceType,
} from '../../types/legalServices';
import { SERVICE_TYPE_LABELS, PRIORITY_LABELS } from '../../types/legalServices';
import AddServiceModal from '../../components/legal-services/AddServiceModal';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

// ── Icon map for service types ──────────────────────────────────────────────

const SERVICE_TYPE_ICONS: Record<ServiceType, React.ElementType> = {
  consultation:      MessageSquareText,
  contract_drafting: FileEdit,
  company_formation: Building2,
  licenses:          Award,
  arbitration:       Scale,
  compliance:        ShieldCheck,
  labor:             Users,
  real_estate:       Home,
  due_diligence:     Search,
  ip:                Lightbulb,
  legal_notices:     Bell,
  training:          GraduationCap,
  other:             MoreHorizontal,
};

// ── Colour mappings ──────────────────────────────────────────────────────────

const TYPE_PILL_CLASS: Record<string, string> = {
  consultation:      'ls-type-pill--consultation',
  contract_drafting: 'ls-type-pill--contract_drafting',
  company_formation: 'ls-type-pill--legal_memo',
  licenses:          'ls-type-pill--review',
  arbitration:       'ls-type-pill--research',
  compliance:        'ls-type-pill--representation',
  labor:             'ls-type-pill--other',
  real_estate:       'ls-type-pill--other',
  due_diligence:     'ls-type-pill--other',
  ip:                'ls-type-pill--notarization',
  legal_notices:     'ls-type-pill--other',
  training:          'ls-type-pill--other',
  other:             'ls-type-pill--other',
};

const CARD_ICON_CLASS: Record<string, string> = {
  consultation:      'ls-card__type-icon--consultation',
  contract_drafting: 'ls-card__type-icon--contract',
  company_formation: 'ls-card__type-icon--legal_memo',
  licenses:          'ls-card__type-icon--review',
  arbitration:       'ls-card__type-icon--review',
  compliance:        'ls-card__type-icon--representation',
};

// ── Status labels ─────────────────────────────────────────────────────────────

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

// ── Status tone (لون الحالة) ─────────────────────────────────────────────────
// بدل صفّ CSS لكل حالة (60+ حالة نوعية)، نُجمّع الحالات في «نغمات» دلالية:
// blue=بداية · orange=قيد العمل · purple=مراجعة · green=منجز · red=سلبي · gray=مغلق/مؤرشف

type StatusTone = 'blue' | 'orange' | 'purple' | 'green' | 'red' | 'gray';

const STATUS_TONE: Record<string, StatusTone> = {
  // بداية
  new: 'blue', case_study: 'blue', scope_definition: 'blue', planning: 'blue',
  assessment: 'blue', search_phase: 'blue', property_review: 'blue',
  document_collection: 'blue', document_preparation: 'blue', analysis: 'blue',
  // قيد العمل
  in_progress: 'orange', drafting: 'orange', revision: 'orange',
  aoa_drafting: 'orange', government_submission: 'orange', name_reservation: 'orange',
  submitted: 'orange', data_collection: 'orange', implementation: 'orange',
  negotiation: 'orange', filing: 'orange', examination: 'orange',
  content_preparation: 'orange', friendly_settlement: 'orange',
  parties_notified: 'orange', hearing_scheduled: 'orange', hearing_in_progress: 'orange',
  deliberation: 'orange', gap_analysis: 'orange', action_plan: 'orange',
  legal_analysis: 'orange', report_drafting: 'orange', registration: 'orange',
  publication: 'orange', sent: 'orange', registration_open: 'orange',
  renewal_pending: 'orange', renewal_due: 'orange', enforcement: 'orange',
  monitoring: 'orange', documentation: 'orange',
  // مراجعة
  under_review: 'purple', internal_review: 'purple', client_review: 'purple',
  review: 'purple', findings_review: 'purple', draft_ready: 'purple',
  // منجز
  completed: 'green', delivered: 'green', approved: 'green', signed: 'green',
  cr_issued: 'green', post_cr_setup: 'green', active: 'green', renewed: 'green',
  settlement_reached: 'green', award_issued: 'green', compliant: 'green',
  resolution: 'green', report_delivered: 'green', certificates_issued: 'green',
  response_received: 'green',
  // سلبي
  cancelled: 'red', rejected: 'red', objection_received: 'red',
  no_response: 'red', returned: 'red',
  // مغلق / مؤرشف / تصعيد
  closed: 'gray', archived: 'gray', escalated_to_case: 'gray',
};

// ── Progress estimation (نسبة تقدّم تقريبية من الحالة) ───────────────────────
// نسبة افتراضية حسب النغمة + تخصيصات للمسارات المتدرّجة (تأسيس/تحكيم/عناية...).
// الحالات السلبية والمغلقة بلا شريط — الشريط يحكي «أين وصلنا» لا «كيف انتهت».

const TONE_PROGRESS: Record<StatusTone, number | null> = {
  blue: 15, orange: 50, purple: 75, green: 100, red: null, gray: null,
};

const STATUS_PROGRESS_OVERRIDE: Record<string, number> = {
  // صياغة العقود
  drafting: 35, client_review: 60, revision: 70, approved: 85,
  // الاستشارات
  draft_ready: 60, internal_review: 80,
  // تأسيس الشركات
  document_collection: 15, name_reservation: 30, aoa_drafting: 45,
  government_submission: 65, cr_issued: 85, post_cr_setup: 95,
  // التراخيص
  document_preparation: 25, submitted: 55,
  // التحكيم
  case_study: 15, parties_notified: 30, hearing_scheduled: 45,
  hearing_in_progress: 60, deliberation: 80,
  // الامتثال
  assessment: 15, gap_analysis: 30, action_plan: 45, implementation: 65, monitoring: 90,
  // العمالي
  analysis: 20, friendly_settlement: 40, negotiation: 60,
  // العناية الواجبة
  scope_definition: 10, data_collection: 35, findings_review: 65, report_drafting: 85,
  // الملكية الفكرية
  search_phase: 15, filing: 35, examination: 55, publication: 75,
  // التدريب
  planning: 15, content_preparation: 35, registration_open: 55,
  // العقارات
  property_review: 25, legal_analysis: 50, registration: 80,
  // الإنذارات
  sent: 45,
};

function getStatusProgress(status: string): number | null {
  if (status in STATUS_PROGRESS_OVERRIDE) return STATUS_PROGRESS_OVERRIDE[status];
  return TONE_PROGRESS[STATUS_TONE[status] ?? 'gray'];
}

// الحالات النهائية — لا تُعتبر الخدمة «متأخرة» بعدها حتى لو تجاوزت الاستحقاق
const TERMINAL_STATUSES = new Set([
  'completed', 'delivered', 'closed', 'cancelled', 'signed', 'archived',
  'renewed', 'active', 'compliant', 'report_delivered', 'certificates_issued',
  'settlement_reached', 'award_issued', 'resolution', 'escalated_to_case',
]);

// ── Helper functions ─────────────────────────────────────────────────────────

function getStatusColor(status: string): string {
  return `ls-status-badge--tone-${STATUS_TONE[status] ?? 'gray'}`;
}

/** هل تجاوزت الخدمة تاريخ استحقاقها دون أن تصل لحالة نهائية؟ */
function isServiceOverdue(service: LegalService): boolean {
  if (!service.due_date || TERMINAL_STATUSES.has(service.status)) return false;
  const due = new Date(service.due_date);
  if (isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function getPriorityColor(priority: string): string {
  return `ls-priority-badge--${priority || 'medium'}`;
}

function getServiceTypeIcon(type: ServiceType): React.ElementType {
  return SERVICE_TYPE_ICONS[type] ?? FileText;
}

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  let start = Math.max(2, current - 1);
  let end   = Math.min(total - 1, current + 1);
  if (current <= 3)         end   = Math.min(total - 1, 4);
  if (current >= total - 2) start = Math.max(2, total - 3);
  if (start > 2)            pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1)      pages.push('...');
  if (total > 1)            pages.push(total);
  return pages;
}

// ── Animation variants ────────────────────────────────────────────────────────

const contentVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

// ── Component ─────────────────────────────────────────────────────────────────

const LegalServices: React.FC = () => {
  const navigate = useNavigate();

  // ── state ──
  const [services,      setServices]      = useState<LegalService[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState<string | null>(null);
  const [searchTerm,    setSearchTerm]    = useState('');
  const [filters,       setFilters]       = useState<LegalServiceFilters>({});
  const [viewMode,      setViewMode]      = useState<'table' | 'grid'>('table');
  const [currentPage,   setCurrentPage]   = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [totalItems,    setTotalItems]    = useState(0);
  const [stats,         setStats]         = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Debounced search ref
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── fetch ──
  const fetchServices = useCallback(async (page = currentPage) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await LegalServiceService.getServices({
        ...filters,
        search: searchTerm,
        page,
        per_page: 15,
      });
      if (response.success) {
        setServices(response.data.data);
        setTotalPages(response.data.last_page);
        setTotalItems(response.data.total);
      } else {
        setLoadError('تعذّر تحميل قائمة الخدمات القانونية');
      }
    } catch (err) {
      // رسالة الخادم العربية تُعرض داخل الصفحة + توست (لا ابتلاع صامت)
      console.error('Failed to fetch legal services:', err);
      const msg = getApiErrorMessage(err, 'تعذّر تحميل قائمة الخدمات القانونية');
      setLoadError(msg);
      toast.error(msg);
    }
    setLoading(false);
  }, [filters, searchTerm, currentPage]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await LegalServiceService.getStats();
      if (res.success) setStats(res.data);
    } catch (err) {
      // الإحصاءات عنصر تكميلي بأعلى الصفحة — فشلها لا يعطّل القائمة،
      // وخطأ تحميل القائمة نفسه يظهر للمستخدم عبر loadError؛ نكتفي بالتسجيل.
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Re-fetch when filters or page changes (search debounced separately)
  useEffect(() => {
    fetchServices(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage]);

  // Debounce search input → reset to page 1
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setCurrentPage(1);
      fetchServices(1);
    }, 350);
  };

  const handleFilterChange = (key: keyof LegalServiceFilters, value: string) => {
    setCurrentPage(1);
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // هل يوجد فلتر أو بحث نشط؟ (يتحكّم بزر «مسح الفلاتر» وصياغة حالة الفراغ)
  const hasActiveFilters = Boolean(
    searchTerm.trim() || filters.service_type || filters.status || filters.priority
  );

  const clearAllFilters = () => {
    setSearchTerm('');
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    setCurrentPage(1);
    setFilters({}); // تغيير مرجع الكائن يعيد الجلب عبر useEffect
  };

  // ── render helpers ──

  const renderServiceTypeCell = (service: LegalService) => {
    const Icon  = getServiceTypeIcon(service.service_type);
    const label = SERVICE_TYPE_LABELS[service.service_type] ?? service.service_type;
    const cls   = TYPE_PILL_CLASS[service.service_type] ?? 'ls-type-pill--other';
    return (
      <span className={`ls-type-pill ${cls}`}>
        <Icon size={12} />
        {label}
      </span>
    );
  };

  // الحالة بالعربية: نفضّل ترجمة الباك (status_arabic) ثم القاموس المحلي
  const renderStatusBadge = (service: LegalService) => (
    <span className={`ls-status-badge ${getStatusColor(service.status)}`}>
      <span className="ls-status-badge__dot" />
      {service.status_arabic || getStatusLabel(service.status)}
    </span>
  );

  // شريط تقدّم تقريبي مستنتج من الحالة (يُخفى للحالات الملغاة/المغلقة)
  const renderProgressBar = (service: LegalService) => {
    const progress = getStatusProgress(service.status);
    if (progress == null) return null;
    return (
      <div
        className="ls-progress"
        title={`تقدّم تقريبي حسب مرحلة الخدمة: ${progress}%`}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`ls-progress__fill${progress >= 100 ? ' ls-progress__fill--done' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  };

  // تاريخ الاستحقاق مع تمييز المتأخر بوضوح
  const renderDueDate = (service: LegalService, compact = false) => {
    if (!service.due_date) {
      return (
        <span className="ls-due ls-due--none" title="لم يُحدَّد تاريخ استحقاق لهذه الخدمة">
          —
        </span>
      );
    }
    const overdue = isServiceOverdue(service);
    return (
      <span
        className={`ls-due${overdue ? ' ls-due--overdue' : ''}`}
        title={overdue ? 'تجاوزت تاريخ الاستحقاق ولم تكتمل بعد' : 'تاريخ الاستحقاق'}
      >
        <Calendar size={compact ? 11 : 12} />
        {formatDate(service.due_date)}
        {overdue && <span className="ls-due__badge">متأخرة</span>}
      </span>
    );
  };

  const renderPriorityBadge = (priority: string) => (
    <span className={`ls-priority-badge ${getPriorityColor(priority)}`}>
      {PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] ?? priority}
    </span>
  );

  // ── skeleton loader ──
  const renderSkeleton = () => (
    viewMode === 'table' ? (
      <div className="ls-skeleton">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="ls-skeleton__row" />
        ))}
      </div>
    ) : (
      <div className="ls-skeleton--grid">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="ls-skeleton__card" />
        ))}
      </div>
    )
  );

  // ── empty state ──
  // صياغتان: فراغ حقيقي (لا خدمات إطلاقاً) ← ادعُ لإنشاء أول خدمة؛
  // فراغ نتيجة فلاتر ← اشرح السبب وقدّم زر «مسح الفلاتر» بدل ترك المستخدم حائراً.
  const renderEmpty = () => (
    hasActiveFilters ? (
      <div className="ls-empty">
        <div className="ls-empty__icon">
          <Search size={28} />
        </div>
        <div className="ls-empty__title">لا توجد نتائج مطابقة</div>
        <div className="ls-empty__desc">
          لم نجد خدمات تطابق البحث أو الفلاتر الحالية. جرّب مسح الفلاتر لعرض جميع الخدمات.
        </div>
        <button className="ls-btn-secondary" onClick={clearAllFilters}>
          <FilterX size={16} />
          <span>مسح الفلاتر</span>
        </button>
      </div>
    ) : (
      <div className="ls-empty">
        <div className="ls-empty__icon">
          <FileText size={28} />
        </div>
        <div className="ls-empty__title">لا توجد خدمات بعد</div>
        <div className="ls-empty__desc">
          هنا تُدار أعمال المكتب غير القضائية: استشارات، عقود، تراخيص، تأسيس شركات وغيرها.
          ابدأ بإنشاء أول خدمة قانونية.
        </div>
        <button
          className="ls-btn-primary"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus size={16} />
          <span>أنشئ أول خدمة قانونية</span>
        </button>
      </div>
    )
  );

  // ── error state ──
  // رسالة الخادم كما وردت + زر إعادة محاولة — لا نصوص عامة تُخفي السبب.
  const renderLoadError = () => (
    <div className="ls-empty ls-error">
      <div className="ls-empty__icon ls-error__icon">
        <AlertCircle size={28} />
      </div>
      <div className="ls-empty__title">تعذّر تحميل الخدمات</div>
      <div className="ls-empty__desc">{loadError}</div>
      <button className="ls-btn-secondary" onClick={() => fetchServices(currentPage)}>
        <RefreshCw size={16} />
        <span>إعادة المحاولة</span>
      </button>
    </div>
  );

  // ── table view ──
  const renderTable = () => (
    <div className="ls-table-wrapper">
      <table className="ls-table">
        <thead>
          <tr>
            <th>رقم الخدمة / العنوان</th>
            <th>النوع</th>
            <th>العميل</th>
            <th>المحامي</th>
            <th>الحالة</th>
            <th>الأولوية</th>
            <th>الاستحقاق</th>
            <th style={{ width: 56 }}></th>
          </tr>
        </thead>
        <tbody>
          {services.map(service => {
            const Icon     = getServiceTypeIcon(service.service_type);
            const iconCls  = CARD_ICON_CLASS[service.service_type] ?? '';
            const initials = service.assigned_lawyer?.name
              ? service.assigned_lawyer.name.slice(0, 2)
              : '—';

            return (
              <tr
                key={service.id}
                onClick={() => navigate(`/legal-services/${service.id}`)}
              >
                {/* Title */}
                <td>
                  <div className="ls-table__title-cell">
                    <div className={`ls-table__type-icon ls-card__type-icon ${iconCls}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="ls-table__service-name">{service.title}</div>
                      <div className="ls-table__service-number">{service.service_number}</div>
                    </div>
                  </div>
                </td>

                {/* Type */}
                <td>{renderServiceTypeCell(service)}</td>

                {/* Client */}
                <td>
                  {service.client ? (
                    <span className="ls-table__client">
                      <User size={12} />
                      {service.client.name}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>—</span>
                  )}
                </td>

                {/* Lawyer */}
                <td>
                  {service.assigned_lawyer ? (
                    <div className="ls-table__assignee">
                      <div className="ls-table__avatar">{initials}</div>
                      <span>{service.assigned_lawyer.name}</span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>—</span>
                  )}
                </td>

                {/* Status + approximate progress */}
                <td>
                  <div className="ls-table__status-cell">
                    {renderStatusBadge(service)}
                    {renderProgressBar(service)}
                  </div>
                </td>

                {/* Priority */}
                <td>{renderPriorityBadge(service.priority)}</td>

                {/* Due date (overdue highlighted) */}
                <td>
                  <div className="ls-table__date">
                    {renderDueDate(service)}
                  </div>
                </td>

                {/* Actions */}
                <td>
                  <div className="ls-table__actions">
                    <button
                      className="ls-table__action-btn"
                      title="عرض التفاصيل"
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/legal-services/${service.id}`);
                      }}
                    >
                      <Eye size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ── grid view ──
  const renderGrid = () => (
    <div className="ls-grid">
      {services.map(service => {
        const Icon    = getServiceTypeIcon(service.service_type);
        const iconCls = CARD_ICON_CLASS[service.service_type] ?? '';
        return (
          <motion.div
            key={service.id}
            className="ls-card"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            onClick={() => navigate(`/legal-services/${service.id}`)}
          >
            {/* Card header */}
            <div className="ls-card__header">
              <div className={`ls-card__type-icon ${iconCls}`}>
                <Icon size={18} />
              </div>
              <div className="ls-card__meta">
                <div className="ls-card__title" title={service.title}>
                  {service.title}
                </div>
                <div className="ls-card__number">{service.service_number}</div>
              </div>
            </div>

            {/* Card body */}
            <div className="ls-card__body">
              {service.client && (
                <div className="ls-card__row">
                  <User size={13} />
                  <span>{service.client.name}</span>
                </div>
              )}
              {service.assigned_lawyer && (
                <div className="ls-card__row">
                  <Scale size={13} />
                  <span>{service.assigned_lawyer.name}</span>
                </div>
              )}
              {service.due_date && (
                <div className="ls-card__row">
                  <span className="ls-card__row-label">الاستحقاق:</span>
                  {renderDueDate(service, true)}
                </div>
              )}
            </div>

            {/* Approximate progress */}
            {renderProgressBar(service)}

            {/* Card footer */}
            <div className="ls-card__footer">
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {renderStatusBadge(service)}
                {renderPriorityBadge(service.priority)}
              </div>
              <div className="ls-card__row" style={{ fontSize: 11 }} title="تاريخ الإنشاء">
                <Calendar size={12} />
                {formatDate(service.created_at)}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  // ── pagination ──
  const renderPagination = () => {
    if (loading || loadError || services.length === 0) return null;
    const pages = buildPageNumbers(currentPage, totalPages);
    return (
      <div className="ls-pagination">
        <div className="ls-pagination__info">
          {totalItems} خدمة • صفحة {currentPage} من {totalPages}
        </div>
        <div className="ls-pagination__controls">
          <button
            className="ls-pagination__btn"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            <ChevronRight size={14} />
            السابق
          </button>

          <div className="ls-pagination__pages">
            {pages.map((page, idx) =>
              page === '...' ? (
                <span key={`ellipsis-${idx}`} className="ls-pagination__ellipsis">…</span>
              ) : (
                <button
                  key={page}
                  className={`ls-pagination__page${page === currentPage ? ' ls-pagination__page--active' : ''}`}
                  onClick={() => handlePageChange(page as number)}
                >
                  {page}
                </button>
              )
            )}
          </div>

          <button
            className="ls-pagination__btn"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            التالي
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>
    );
  };

  // ── main render ──
  return (
    <div className="ls-page" dir="rtl">

      {/* ── Sticky Header Bar ── */}
      <header className="ls-header-bar">

        {/* Start: title + stat pills */}
        <div className="ls-header-bar__start">
          <div className="ls-header-bar__title">
            <Briefcase size={20} />
            <span>الخدمات القانونية</span>
            {totalItems > 0 && (
              <span className="ls-header-bar__count">{totalItems}</span>
            )}
          </div>

          {stats && (
            <div className="ls-header-bar__stats">
              {/* total active */}
              {stats.active > 0 && (
                <span className="ls-stat-pill ls-stat-pill--active">
                  <span className="ls-stat-pill__dot" />
                  {stats.active} نشطة
                </span>
              )}
              {/* consultation count */}
              {stats.by_type?.consultation > 0 && (
                <span className="ls-stat-pill ls-stat-pill--consultation">
                  <span className="ls-stat-pill__dot" />
                  {stats.by_type.consultation} استشارة
                </span>
              )}
              {/* contract drafting count */}
              {stats.by_type?.contract_drafting > 0 && (
                <span className="ls-stat-pill ls-stat-pill--contract_drafting">
                  <span className="ls-stat-pill__dot" />
                  {stats.by_type.contract_drafting} صياغة
                </span>
              )}
            </div>
          )}
        </div>

        {/* Center: search + filters */}
        <div className="ls-header-bar__center">
          {/* Search */}
          <div className="ls-search-box">
            <Search size={15} />
            <input
              type="text"
              placeholder="بحث بالعنوان أو الرقم أو العميل..."
              value={searchTerm}
              onChange={e => handleSearchChange(e.target.value)}
              aria-label="بحث في الخدمات القانونية"
            />
            {searchTerm && (
              <button
                className="ls-search-box__clear"
                onClick={() => handleSearchChange('')}
                aria-label="مسح البحث"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Service type filter */}
          <select
            className="ls-filter-select"
            value={filters.service_type ?? ''}
            onChange={e => handleFilterChange('service_type', e.target.value)}
            aria-label="تصفية حسب نوع الخدمة"
          >
            <option value="">كل الأنواع</option>
            {(Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]).map(type => (
              <option key={type} value={type}>{SERVICE_TYPE_LABELS[type]}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            className="ls-filter-select"
            value={filters.status ?? ''}
            onChange={e => handleFilterChange('status', e.target.value)}
            aria-label="تصفية حسب الحالة"
          >
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            className="ls-filter-select"
            value={filters.priority ?? ''}
            onChange={e => handleFilterChange('priority', e.target.value)}
            aria-label="تصفية حسب الأولوية"
          >
            <option value="">كل الأولويات</option>
            {(Object.keys(PRIORITY_LABELS) as (keyof typeof PRIORITY_LABELS)[]).map(p => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>

          {/* عدّاد النتائج + مسح الفلاتر — يظهران فقط عند وجود فلتر/بحث نشط */}
          {hasActiveFilters && (
            <>
              {!loading && !loadError && (
                <span className="ls-results-count" aria-live="polite">
                  {totalItems === 0 ? 'لا نتائج' : `${totalItems} نتيجة`}
                </span>
              )}
              <button
                className="ls-filters-clear"
                onClick={clearAllFilters}
                title="مسح البحث وجميع الفلاتر وعرض كل الخدمات"
              >
                <FilterX size={13} />
                <span>مسح الفلاتر</span>
              </button>
            </>
          )}
        </div>

        {/* End: view toggle + add button */}
        <div className="ls-header-bar__end">
          <div className="ls-view-tabs" role="group" aria-label="طريقة العرض">
            <button
              className={`ls-view-tab${viewMode === 'table' ? ' ls-view-tab--active' : ''}`}
              onClick={() => setViewMode('table')}
              title="عرض جدولي"
              aria-pressed={viewMode === 'table'}
            >
              <List size={16} />
            </button>
            <button
              className={`ls-view-tab${viewMode === 'grid' ? ' ls-view-tab--active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="عرض بطاقات"
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <button
            className="ls-btn-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={16} />
            <span>خدمة جديدة</span>
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="ls-content">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {renderSkeleton()}
            </motion.div>
          ) : loadError ? (
            <motion.div
              key="error"
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {renderLoadError()}
            </motion.div>
          ) : services.length === 0 ? (
            <motion.div
              key="empty"
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {renderEmpty()}
            </motion.div>
          ) : (
            <motion.div
              key={`content-${viewMode}`}
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {viewMode === 'table' ? renderTable() : renderGrid()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Pagination ── */}
      {renderPagination()}

      {/* ── Add Service Modal ── */}
      {isAddModalOpen && (
        <AddServiceModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchStats();
            fetchServices(1);
          }}
        />
      )}
    </div>
  );
};

export default LegalServices;
