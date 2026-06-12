import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Save,
  Loader2,
  MessageSquareText,
  FileEdit,
  Building2,
  Award,
  Scale,
  ShieldCheck,
  Users,
  Home,
  Search,
  Lightbulb,
  Bell,
  GraduationCap,
  MoreHorizontal,
  Tag,
  User,
  Briefcase,
  Flag,
  Calendar,
  AlignLeft,
  DollarSign,
  Clock,
  StickyNote,
  FileText,
  Zap,
  Globe,
  Hash,
} from 'lucide-react';
import {
  SERVICE_TYPE_LABELS,
  PRIORITY_LABELS,
  BILLING_TYPE_LABELS,
  CLASSIFICATION_LABELS,
  URGENCY_LABELS,
  DELIVERY_METHOD_LABELS,
  CONTRACT_TYPE_LABELS,
  CONTRACT_LANGUAGE_LABELS,
  ENTITY_TYPE_LABELS,
  PROCEDURE_TYPE_LABELS,
  GOVERNMENT_ENTITY_LABELS,
  DISPUTE_TYPE_LABELS,
  RESOLUTION_METHOD_LABELS,
  LAWYER_ROLE_LABELS,
  COMPLIANCE_AREA_LABELS,
  RISK_LEVEL_LABELS,
  LABOR_SERVICE_TYPE_LABELS,
  REAL_ESTATE_SERVICE_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
  DD_TYPE_LABELS,
  IP_TYPE_LABELS,
  REGISTRATION_OFFICE_LABELS,
  NOTICE_TYPE_LABELS,
  NOTICE_DELIVERY_METHOD_LABELS,
  TRAINING_TYPE_LABELS,
  TOPIC_CATEGORY_LABELS,
  TRAINING_FORMAT_LABELS,
} from '../../types/legalServices';
import type { CreateLegalServiceData, ServiceType } from '../../types/legalServices';
import { LegalServiceService } from '../../services/legalServiceService';
import { apiClient } from '../../utils/api';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

// ─── Types ──────────────────────────────────────────────────────────────────

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UserOption {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

// ─── Service type metadata ────────────────────────────────────────────────────

interface ServiceTypeMeta {
  type: ServiceType;
  icon: React.ReactNode;
  description: string;
  enabled: boolean;
}

const SERVICE_TYPES: ServiceTypeMeta[] = [
  {
    type: 'consultation',
    icon: <MessageSquareText size={20} />,
    description: 'استشارة قانونية شاملة مع رأي قانوني مفصل',
    enabled: true,
  },
  {
    type: 'contract_drafting',
    icon: <FileEdit size={20} />,
    description: 'صياغة ومراجعة العقود بإصدارات متعددة',
    enabled: true,
  },
  {
    type: 'company_formation',
    icon: <Building2 size={20} />,
    description: 'تأسيس الشركات والكيانات القانونية',
    enabled: true,
  },
  {
    type: 'licenses',
    icon: <Award size={20} />,
    description: 'استخراج التراخيص والإجراءات الحكومية',
    enabled: true,
  },
  {
    type: 'arbitration',
    icon: <Scale size={20} />,
    description: 'خدمات التحكيم والوساطة القانونية',
    enabled: true,
  },
  {
    type: 'compliance',
    icon: <ShieldCheck size={20} />,
    description: 'مراجعة الامتثال القانوني والتنظيمي',
    enabled: true,
  },
  {
    type: 'labor',
    icon: <Users size={20} />,
    description: 'تسوية النزاعات العمالية وعقود العمل',
    enabled: true,
  },
  {
    type: 'real_estate',
    icon: <Home size={20} />,
    description: 'الخدمات القانونية للعقارات والإيجارات',
    enabled: true,
  },
  {
    type: 'due_diligence',
    icon: <Search size={20} />,
    description: 'التدقيق والعناية القانونية الواجبة',
    enabled: true,
  },
  {
    type: 'ip',
    icon: <Lightbulb size={20} />,
    description: 'حماية حقوق الملكية الفكرية والعلامات التجارية',
    enabled: true,
  },
  {
    type: 'legal_notices',
    icon: <Bell size={20} />,
    description: 'إعداد وإرسال الإنذارات والإشعارات القانونية',
    enabled: true,
  },
  {
    type: 'training',
    icon: <GraduationCap size={20} />,
    description: 'التدريب القانوني وبناء القدرات',
    enabled: true,
  },
  {
    type: 'other',
    icon: <MoreHorizontal size={20} />,
    description: 'خدمة قانونية خارج التصنيفات المعتمدة',
    enabled: true,
  },
];

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { label: 'نوع الخدمة' },
  { label: 'المعلومات الأساسية' },
  { label: 'التفاصيل' },
  { label: 'المالية' },
];

// ─── Slide animation variants ─────────────────────────────────────────────────

const slideVariants = {
  enterFromRight: { x: 60, opacity: 0 },
  enterFromLeft: { x: -60, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exitToLeft: { x: -60, opacity: 0 },
  exitToRight: { x: 60, opacity: 0 },
};

// ─── Searchable dropdown ──────────────────────────────────────────────────────

interface SearchableDropdownProps {
  value: number | undefined;
  onChange: (id: number, name: string) => void;
  options: UserOption[];
  loading: boolean;
  placeholder: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onOpen: () => void;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  value,
  onChange,
  options,
  loading,
  placeholder,
  searchValue,
  onSearchChange,
  onOpen,
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.id === value);

  const handleOpen = () => {
    setOpen(true);
    onOpen();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelect = (opt: UserOption) => {
    onChange(opt.id, opt.name);
    setOpen(false);
    onSearchChange('');
  };

  // Close on outside click (capture phase to bypass stopPropagation in modal)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [open]);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('');

  return (
    <div className="asm-dropdown-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`asm-dropdown-trigger${open ? ' open' : ''}`}
        onClick={handleOpen}
      >
        <span className={`asm-dropdown-trigger-text${!selectedOption ? ' placeholder' : ''}`}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown size={14} className={`asm-dropdown-chevron${open ? ' open' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="asm-dropdown-panel"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.12 }}
          >
            <div className="asm-dropdown-search-row">
              <Search size={13} style={{ color: 'var(--asm-text-muted)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                className="asm-dropdown-search-input"
                placeholder="ابحث..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <div className="asm-dropdown-list">
              {loading ? (
                <div className="asm-dropdown-loading">
                  <Loader2 size={14} className="asm-spinner" />
                  <span>جارٍ التحميل...</span>
                </div>
              ) : options.length === 0 ? (
                <div className="asm-dropdown-empty">
                  {searchValue ? 'لا توجد نتائج' : 'لا يوجد بيانات'}
                </div>
              ) : (
                options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`asm-dropdown-item${value === opt.id ? ' active' : ''}`}
                    onClick={() => handleSelect(opt)}
                  >
                    <div className="asm-dropdown-item-avatar">
                      {getInitials(opt.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{opt.name}</div>
                      {opt.email && (
                        <div style={{ fontSize: 11, opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {opt.email}
                        </div>
                      )}
                    </div>
                    {value === opt.id && <Check size={13} />}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const AddServiceModal: React.FC<AddServiceModalProps> = ({ isOpen, onClose, onSuccess }) => {
  // ── State ──
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [saving, setSaving] = useState(false);
  const [stepError, setStepError] = useState('');

  const [formData, setFormData] = useState<CreateLegalServiceData>({
    title: '',
    service_type: '' as ServiceType,
    client_id: 0,
    priority: 'medium',
    billing_type: 'flat_fee',
    vat_rate: 15,
  });

  // Clients
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState<UserOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientName, setClientName] = useState('');

  // Lawyers
  const [lawyerSearch, setLawyerSearch] = useState('');
  const [lawyers, setLawyers] = useState<UserOption[]>([]);
  const [lawyersLoading, setLawyersLoading] = useState(false);

  // ── Reset on open ──
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setDirection('forward');
      setSaving(false);
      setStepError('');
      setFormData({
        title: '',
        service_type: '' as ServiceType,
        client_id: 0,
        priority: 'medium',
        billing_type: 'flat_fee',
        vat_rate: 15,
      });
      setClientSearch('');
      setClientName('');
      setLawyerSearch('');
    }
  }, [isOpen]);

  // ── Fetch clients (debounced) ──
  const fetchClients = useCallback(async (search: string) => {
    setClientsLoading(true);
    try {
      const qs = search ? `&search=${encodeURIComponent(search)}` : '';
      const res = await apiClient.get<{ success: boolean; data: { data: UserOption[] } | UserOption[] }>(
        `/users?role=client${qs}`
      );
      const list = Array.isArray((res as any).data)
        ? (res as any).data
        : (res as any).data?.data ?? [];
      setClients(list);
    } catch {
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (clientSearch !== undefined) fetchClients(clientSearch);
    }, 300);
    return () => clearTimeout(t);
  }, [clientSearch, fetchClients]);

  // ── Fetch lawyers (debounced) ──
  const fetchLawyers = useCallback(async (search: string) => {
    setLawyersLoading(true);
    try {
      const qs = search ? `&search=${encodeURIComponent(search)}` : '';
      const res = await apiClient.get<{ success: boolean; data: { data: UserOption[] } | UserOption[] }>(
        `/users?role=lawyer${qs}`
      );
      const list = Array.isArray((res as any).data)
        ? (res as any).data
        : (res as any).data?.data ?? [];
      setLawyers(list);
    } catch {
      setLawyers([]);
    } finally {
      setLawyersLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (lawyerSearch !== undefined) fetchLawyers(lawyerSearch);
    }, 300);
    return () => clearTimeout(t);
  }, [lawyerSearch, fetchLawyers]);

  // ── Helpers ──
  const update = <K extends keyof CreateLegalServiceData>(
    key: K,
    value: CreateLegalServiceData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setStepError('');
  };

  // ── Validation ──
  const validateStep = (): boolean => {
    if (currentStep === 1) {
      if (!formData.service_type) {
        setStepError('يرجى اختيار نوع الخدمة للمتابعة');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!formData.title.trim()) {
        setStepError('عنوان الخدمة مطلوب');
        return false;
      }
      if (!formData.client_id) {
        setStepError('يرجى اختيار العميل');
        return false;
      }
    }
    return true;
  };

  // ── Navigation ──
  const goNext = () => {
    if (!validateStep()) return;
    setDirection('forward');
    setCurrentStep((s) => s + 1);
    setStepError('');
  };

  const goPrev = () => {
    setDirection('back');
    setCurrentStep((s) => s - 1);
    setStepError('');
  };

  // ── Submit ──
  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Map delivery_method_notice back to delivery_method for legal_notices
      const submitData = { ...formData } as any;
      if (formData.service_type === 'legal_notices' && formData.delivery_method_notice) {
        submitData.delivery_method = formData.delivery_method_notice;
        delete submitData.delivery_method_notice;
      }
      const response = await LegalServiceService.createService(submitData);
      if (response.success) {
        onSuccess();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Animation key & direction ──
  const animEnter = direction === 'forward' ? slideVariants.enterFromRight : slideVariants.enterFromLeft;
  const animExit = direction === 'forward' ? slideVariants.exitToLeft : slideVariants.exitToRight;

  // ─────────────────────────────────────────────────────────────────────────
  // STEP RENDERS
  // ─────────────────────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="asm-step-content">
      <div className="asm-step-heading">اختر نوع الخدمة القانونية</div>
      <div className="asm-type-grid">
        {SERVICE_TYPES.map((meta) => {
          const isSelected = formData.service_type === meta.type;
          const isDisabled = !meta.enabled;
          return (
            <button
              key={meta.type}
              type="button"
              className={`asm-type-card${isSelected ? ' selected' : ''}${isDisabled ? ' disabled' : ''}`}
              onClick={() => {
                if (!isDisabled) update('service_type', meta.type);
              }}
            >
              <div className="asm-type-card-icon">{meta.icon}</div>
              <div className="asm-type-card-body">
                <div className="asm-type-card-name">{SERVICE_TYPE_LABELS[meta.type]}</div>
                <div className="asm-type-card-desc">{meta.description}</div>
              </div>
              {isDisabled && <span className="asm-soon-badge">قريباً</span>}
              {isSelected && (
                <span className="asm-selected-check">
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {stepError && (
        <div className="asm-validation-hint" style={{ color: 'var(--asm-red)' }}>
          {stepError}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="asm-step-content">
      {/* Title */}
      <input
        className="asm-page-title-input"
        placeholder="عنوان الخدمة..."
        value={formData.title}
        onChange={(e) => update('title', e.target.value)}
        autoFocus
      />

      {/* Properties grid */}
      <div className="asm-properties">

        {/* Client */}
        <div className="asm-property-row">
          <div className="asm-property-label">
            <User size={15} className="asm-property-icon" />
            <span>العميل</span>
          </div>
          <div className="asm-property-value">
            <SearchableDropdown
              value={formData.client_id || undefined}
              onChange={(id, name) => {
                update('client_id', id);
                setClientName(name);
              }}
              options={clients}
              loading={clientsLoading}
              placeholder="اختر العميل..."
              searchValue={clientSearch}
              onSearchChange={setClientSearch}
              onOpen={() => { if (clients.length === 0) fetchClients(''); }}
            />
          </div>
        </div>

        {/* Lawyer */}
        <div className="asm-property-row">
          <div className="asm-property-label">
            <Briefcase size={15} className="asm-property-icon" />
            <span>المحامي المسؤول</span>
          </div>
          <div className="asm-property-value">
            <SearchableDropdown
              value={formData.assigned_lawyer_id}
              onChange={(id) => update('assigned_lawyer_id', id)}
              options={lawyers}
              loading={lawyersLoading}
              placeholder="اختر المحامي..."
              searchValue={lawyerSearch}
              onSearchChange={setLawyerSearch}
              onOpen={() => { if (lawyers.length === 0) fetchLawyers(''); }}
            />
          </div>
        </div>

        {/* Priority */}
        <div className="asm-property-row">
          <div className="asm-property-label">
            <Flag size={15} className="asm-property-icon" />
            <span>الأولوية</span>
          </div>
          <div className="asm-property-value">
            <select
              className="asm-select"
              value={formData.priority ?? 'medium'}
              onChange={(e) => update('priority', e.target.value as any)}
            >
              {(Object.entries(PRIORITY_LABELS) as [string, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Start date */}
        <div className="asm-property-row">
          <div className="asm-property-label">
            <Calendar size={15} className="asm-property-icon" />
            <span>تاريخ البدء</span>
          </div>
          <div className="asm-property-value">
            <input
              type="date"
              className="asm-input"
              value={formData.start_date ?? ''}
              onChange={(e) => update('start_date', e.target.value)}
            />
          </div>
        </div>

        {/* Due date */}
        <div className="asm-property-row">
          <div className="asm-property-label">
            <Calendar size={15} className="asm-property-icon" />
            <span>تاريخ الاستحقاق</span>
          </div>
          <div className="asm-property-value">
            <input
              type="date"
              className="asm-input"
              value={formData.due_date ?? ''}
              onChange={(e) => update('due_date', e.target.value)}
            />
          </div>
        </div>

        <div className="asm-divider" />

        {/* Description */}
        <div className="asm-property-row span-full" style={{ alignItems: 'flex-start', paddingTop: 6 }}>
          <div className="asm-property-label" style={{ paddingTop: 4 }}>
            <AlignLeft size={15} className="asm-property-icon" />
            <span>الوصف</span>
          </div>
          <div className="asm-property-value">
            <textarea
              className="asm-textarea"
              placeholder="وصف مختصر للخدمة..."
              rows={3}
              value={formData.description ?? ''}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>
        </div>
      </div>

      {stepError && (
        <div className="asm-error-msg">
          <X size={13} />
          {stepError}
        </div>
      )}
    </div>
  );

  const renderStep3Consultation = () => (
    <>
      <div className="asm-section-header">
        <MessageSquareText size={16} className="asm-section-icon" />
        تفاصيل الاستشارة القانونية
      </div>
      <div className="asm-field-group">
        {/* Classification */}
        <div className="asm-field">
          <label className="asm-label">التصنيف القانوني</label>
          <select
            className="asm-select"
            value={formData.classification ?? ''}
            onChange={(e) => update('classification', e.target.value as any)}
          >
            <option value="">اختر التصنيف</option>
            {(Object.entries(CLASSIFICATION_LABELS) as [string, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Urgency */}
        <div className="asm-field">
          <label className="asm-label">درجة الاستعجال</label>
          <select
            className="asm-select"
            value={formData.urgency ?? 'normal'}
            onChange={(e) => update('urgency', e.target.value as any)}
          >
            {(Object.entries(URGENCY_LABELS) as [string, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Delivery method */}
        <div className="asm-field">
          <label className="asm-label">طريقة التسليم</label>
          <select
            className="asm-select"
            value={formData.delivery_method ?? ''}
            onChange={(e) => update('delivery_method', e.target.value as any)}
          >
            <option value="">اختر الطريقة</option>
            {(Object.entries(DELIVERY_METHOD_LABELS) as [string, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Scope */}
        <div className="asm-field span-full">
          <label className="asm-label">نطاق الاستشارة</label>
          <textarea
            className="asm-textarea"
            placeholder="حدد نطاق الاستشارة وموضوعاتها..."
            rows={3}
            value={formData.scope_definition ?? ''}
            onChange={(e) => update('scope_definition', e.target.value)}
          />
        </div>

        {/* Client question */}
        <div className="asm-field span-full">
          <label className="asm-label">سؤال العميل</label>
          <textarea
            className="asm-textarea"
            placeholder="أدخل السؤال القانوني المحدد للعميل..."
            rows={4}
            value={formData.client_question ?? ''}
            onChange={(e) => update('client_question', e.target.value)}
          />
        </div>
      </div>
    </>
  );

  const renderStep3Contract = () => (
    <>
      <div className="asm-section-header">
        <FileEdit size={16} className="asm-section-icon" />
        تفاصيل صياغة العقد
      </div>
      <div className="asm-field-group">
        {/* Contract type */}
        <div className="asm-field">
          <label className="asm-label">نوع العقد</label>
          <select
            className="asm-select"
            value={formData.contract_type ?? ''}
            onChange={(e) => update('contract_type', e.target.value as any)}
          >
            <option value="">اختر نوع العقد</option>
            {(Object.entries(CONTRACT_TYPE_LABELS) as [string, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Contract language */}
        <div className="asm-field">
          <label className="asm-label">لغة العقد</label>
          <select
            className="asm-select"
            value={formData.contract_language ?? 'arabic'}
            onChange={(e) => update('contract_language', e.target.value as any)}
          >
            {(Object.entries(CONTRACT_LANGUAGE_LABELS) as [string, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Contract value */}
        <div className="asm-field">
          <label className="asm-label">قيمة العقد</label>
          <div className="asm-input-group">
            <input
              type="number"
              className="asm-input"
              placeholder="0.00"
              min={0}
              value={formData.contract_value ?? ''}
              onChange={(e) => update('contract_value', e.target.value ? Number(e.target.value) : undefined)}
            />
            <span className="asm-currency-badge">ر.س</span>
          </div>
        </div>

        {/* Auto renewal */}
        <div className="asm-field" style={{ justifyContent: 'flex-end' }}>
          <label className="asm-label">تجديد تلقائي</label>
          <div className="asm-toggle-row" style={{ marginTop: 6 }}>
            <label className="asm-toggle">
              <input
                type="checkbox"
                checked={formData.auto_renewal ?? false}
                onChange={(e) => update('auto_renewal', e.target.checked)}
              />
              <span className="asm-toggle-track" />
            </label>
            <span className="asm-toggle-label">
              {formData.auto_renewal ? 'مُفعّل' : 'غير مُفعّل'}
            </span>
          </div>
        </div>

        {/* Contract start */}
        <div className="asm-field">
          <label className="asm-label">تاريخ بدء العقد</label>
          <input
            type="date"
            className="asm-input"
            value={formData.contract_start_date ?? ''}
            onChange={(e) => update('contract_start_date', e.target.value)}
          />
        </div>

        {/* Contract end */}
        <div className="asm-field">
          <label className="asm-label">تاريخ انتهاء العقد</label>
          <input
            type="date"
            className="asm-input"
            value={formData.contract_end_date ?? ''}
            onChange={(e) => update('contract_end_date', e.target.value)}
          />
        </div>
      </div>
    </>
  );

  // ── Step 3: Company Formation ──
  const renderStep3CompanyFormation = () => (
    <>
      <div className="asm-section-header">
        <Building2 size={16} className="asm-section-icon" />
        تفاصيل تأسيس الشركة
      </div>
      <div className="asm-field-group">
        <div className="asm-field">
          <label className="asm-label">نوع الكيان</label>
          <select className="asm-select" value={formData.entity_type ?? ''} onChange={(e) => update('entity_type', e.target.value as any)}>
            <option value="">اختر نوع الكيان</option>
            {(Object.entries(ENTITY_TYPE_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div className="asm-field">
          <label className="asm-label">المدينة</label>
          <input type="text" className="asm-input" placeholder="مثال: الرياض" value={formData.hq_city ?? ''} onChange={(e) => update('hq_city', e.target.value)} />
        </div>
        <div className="asm-field">
          <label className="asm-label">الاسم المقترح 1</label>
          <input type="text" className="asm-input" placeholder="الاسم التجاري المقترح" value={formData.proposed_name_1 ?? ''} onChange={(e) => update('proposed_name_1', e.target.value)} />
        </div>
        <div className="asm-field">
          <label className="asm-label">الاسم المقترح 2</label>
          <input type="text" className="asm-input" placeholder="بديل" value={formData.proposed_name_2 ?? ''} onChange={(e) => update('proposed_name_2', e.target.value)} />
        </div>
        <div className="asm-field">
          <label className="asm-label">رأس المال</label>
          <div className="asm-input-group">
            <input type="number" className="asm-input" placeholder="0.00" min={0} value={formData.capital_amount ?? ''} onChange={(e) => update('capital_amount', e.target.value ? Number(e.target.value) : undefined)} />
            <span className="asm-currency-badge">ر.س</span>
          </div>
        </div>
        <div className="asm-field">
          <label className="asm-label">النشاط التجاري</label>
          <input type="text" className="asm-input" placeholder="وصف النشاط" value={formData.business_activity ?? ''} onChange={(e) => update('business_activity', e.target.value)} />
        </div>
        <div className="asm-field">
          <label className="asm-label">كود ISIC</label>
          <input type="text" className="asm-input" placeholder="كود التصنيف" value={formData.isic_code ?? ''} onChange={(e) => update('isic_code', e.target.value)} />
        </div>
        <div className="asm-field" style={{ justifyContent: 'flex-end' }}>
          <label className="asm-label">ميثاق مساهمين</label>
          <div className="asm-toggle-row" style={{ marginTop: 6 }}>
            <label className="asm-toggle">
              <input type="checkbox" checked={formData.has_shareholders_agreement ?? false} onChange={(e) => update('has_shareholders_agreement', e.target.checked)} />
              <span className="asm-toggle-track" />
            </label>
            <span className="asm-toggle-label">{formData.has_shareholders_agreement ? 'يوجد' : 'لا يوجد'}</span>
          </div>
        </div>
      </div>
    </>
  );

  // ── Step 3: Licenses ──
  const renderStep3Licenses = () => (
    <>
      <div className="asm-section-header">
        <Award size={16} className="asm-section-icon" />
        تفاصيل الترخيص / الإجراء الحكومي
      </div>
      <div className="asm-field-group">
        <div className="asm-field">
          <label className="asm-label">نوع الإجراء</label>
          <select className="asm-select" value={formData.procedure_type ?? ''} onChange={(e) => update('procedure_type', e.target.value as any)}>
            <option value="">اختر نوع الإجراء</option>
            {(Object.entries(PROCEDURE_TYPE_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div className="asm-field">
          <label className="asm-label">الجهة الحكومية</label>
          <select className="asm-select" value={formData.government_entity ?? ''} onChange={(e) => update('government_entity', e.target.value as any)}>
            <option value="">اختر الجهة</option>
            {(Object.entries(GOVERNMENT_ENTITY_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div className="asm-field">
          <label className="asm-label">رقم الطلب المرجعي</label>
          <input type="text" className="asm-input" placeholder="رقم المرجع" value={formData.reference_number ?? ''} onChange={(e) => update('reference_number', e.target.value)} />
        </div>
        <div className="asm-field">
          <label className="asm-label">تنبيه التجديد (أيام)</label>
          <input type="number" className="asm-input" placeholder="90" min={1} value={formData.renewal_alert_days ?? 90} onChange={(e) => update('renewal_alert_days', Number(e.target.value))} />
        </div>
      </div>
    </>
  );

  // ── Step 3: Arbitration ──
  const renderStep3Arbitration = () => (
    <>
      <div className="asm-section-header">
        <Scale size={16} className="asm-section-icon" />
        تفاصيل التحكيم / الوساطة
      </div>
      <div className="asm-field-group">
        <div className="asm-field">
          <label className="asm-label">نوع النزاع</label>
          <select className="asm-select" value={formData.dispute_type ?? ''} onChange={(e) => update('dispute_type', e.target.value as any)}>
            <option value="">اختر نوع النزاع</option>
            {(Object.entries(DISPUTE_TYPE_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div className="asm-field">
          <label className="asm-label">طريقة الحل</label>
          <select className="asm-select" value={formData.resolution_method ?? 'arbitration'} onChange={(e) => update('resolution_method', e.target.value as any)}>
            {(Object.entries(RESOLUTION_METHOD_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div className="asm-field">
          <label className="asm-label">دور المحامي</label>
          <select className="asm-select" value={formData.lawyer_role ?? ''} onChange={(e) => update('lawyer_role', e.target.value as any)}>
            <option value="">اختر الدور</option>
            {(Object.entries(LAWYER_ROLE_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div className="asm-field">
          <label className="asm-label">مبلغ المطالبة</label>
          <div className="asm-input-group">
            <input type="number" className="asm-input" placeholder="0.00" min={0} value={formData.claim_amount ?? ''} onChange={(e) => update('claim_amount', e.target.value ? Number(e.target.value) : undefined)} />
            <span className="asm-currency-badge">ر.س</span>
          </div>
        </div>
        <div className="asm-field span-full">
          <label className="asm-label">ملخص النزاع</label>
          <textarea className="asm-textarea" placeholder="وصف مختصر للنزاع..." rows={3} value={formData.dispute_summary ?? ''} onChange={(e) => update('dispute_summary', e.target.value)} />
        </div>
      </div>
    </>
  );

  // ── Step 3: Compliance ──
  const renderStep3Compliance = () => (
    <>
      <div className="asm-section-header">
        <ShieldCheck size={16} className="asm-section-icon" />
        تفاصيل الامتثال القانوني
      </div>
      <div className="asm-field-group">
        <div className="asm-field">
          <label className="asm-label">مجال الامتثال</label>
          <select className="asm-select" value={formData.compliance_area ?? ''} onChange={(e) => update('compliance_area', e.target.value as any)}>
            <option value="">اختر المجال</option>
            {(Object.entries(COMPLIANCE_AREA_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div className="asm-field">
          <label className="asm-label">مستوى المخاطر المبدئي</label>
          <select className="asm-select" value={formData.risk_level ?? ''} onChange={(e) => update('risk_level', e.target.value as any)}>
            <option value="">اختر المستوى</option>
            {(Object.entries(RISK_LEVEL_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div className="asm-field">
          <label className="asm-label">النظام المرجعي</label>
          <input type="text" className="asm-input" placeholder="مثال: نظام حماية البيانات الشخصية" value={formData.regulation_reference ?? ''} onChange={(e) => update('regulation_reference', e.target.value)} />
        </div>
        <div className="asm-field">
          <label className="asm-label">الجهة التنظيمية</label>
          <input type="text" className="asm-input" placeholder="مثال: سدايا" value={formData.regulatory_body ?? ''} onChange={(e) => update('regulatory_body', e.target.value)} />
        </div>
      </div>
    </>
  );

  // ── Step 3: Labor ──
  const renderStep3Labor = () => (
    <>
      <div className="asm-section-header">
        <Users size={16} className="asm-section-icon" />
        تفاصيل الخدمة العمالية
      </div>
      <div className="asm-field-group">
        <div className="asm-field">
          <label className="asm-label">نوع الخدمة العمالية</label>
          <select className="asm-select" value={formData.labor_service_type ?? ''} onChange={(e) => update('labor_service_type', e.target.value as any)}>
            <option value="">اختر النوع</option>
            {(Object.entries(LABOR_SERVICE_TYPE_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div className="asm-field">
          <label className="asm-label">اسم الموظف</label>
          <input type="text" className="asm-input" placeholder="الاسم الكامل" value={formData.employee_name ?? ''} onChange={(e) => update('employee_name', e.target.value)} />
        </div>
        <div className="asm-field">
          <label className="asm-label">الراتب الشهري</label>
          <div className="asm-input-group">
            <input type="number" className="asm-input" placeholder="0.00" min={0} value={formData.monthly_salary ?? ''} onChange={(e) => update('monthly_salary', e.target.value ? Number(e.target.value) : undefined)} />
            <span className="asm-currency-badge">ر.س</span>
          </div>
        </div>
        <div className="asm-field">
          <label className="asm-label">إجمالي البدلات</label>
          <div className="asm-input-group">
            <input type="number" className="asm-input" placeholder="0.00" min={0} value={formData.total_allowances ?? ''} onChange={(e) => update('total_allowances', e.target.value ? Number(e.target.value) : undefined)} />
            <span className="asm-currency-badge">ر.س</span>
          </div>
        </div>
        <div className="asm-field">
          <label className="asm-label">تاريخ بداية العمل</label>
          <input type="date" className="asm-input" value={formData.employment_start_date ?? ''} onChange={(e) => update('employment_start_date', e.target.value)} />
        </div>
        <div className="asm-field span-full">
          <label className="asm-label">وصف مختصر</label>
          <textarea className="asm-textarea" placeholder="وصف الحالة العمالية..." rows={3} value={formData.dispute_description ?? ''} onChange={(e) => update('dispute_description', e.target.value)} />
        </div>
      </div>
    </>
  );

  // ── Step 3: Real Estate ──
  const renderStep3RealEstate = () => (
    <>
      <div className="asm-section-header">
        <Home size={16} className="asm-section-icon" />
        تفاصيل الخدمة العقارية
      </div>
      <div className="asm-field-group">
        <div className="asm-field">
          <label className="asm-label">نوع الخدمة العقارية</label>
          <select className="asm-select" value={formData.real_estate_service_type ?? ''} onChange={(e) => update('real_estate_service_type', e.target.value as any)}>
            <option value="">اختر النوع</option>
            {(Object.entries(REAL_ESTATE_SERVICE_TYPE_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div className="asm-field">
          <label className="asm-label">نوع العقار</label>
          <select className="asm-select" value={formData.property_type ?? ''} onChange={(e) => update('property_type', e.target.value as any)}>
            <option value="">اختر النوع</option>
            {(Object.entries(PROPERTY_TYPE_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div className="asm-field">
          <label className="asm-label">موقع العقار</label>
          <input type="text" className="asm-input" placeholder="المدينة / الحي" value={formData.property_location ?? ''} onChange={(e) => update('property_location', e.target.value)} />
        </div>
        <div className="asm-field">
          <label className="asm-label">رقم الصك</label>
          <input type="text" className="asm-input" placeholder="رقم الصك" value={formData.deed_number ?? ''} onChange={(e) => update('deed_number', e.target.value)} />
        </div>
        <div className="asm-field">
          <label className="asm-label">قيمة العقار</label>
          <div className="asm-input-group">
            <input type="number" className="asm-input" placeholder="0.00" min={0} value={formData.property_value ?? ''} onChange={(e) => update('property_value', e.target.value ? Number(e.target.value) : undefined)} />
            <span className="asm-currency-badge">ر.س</span>
          </div>
        </div>
      </div>
    </>
  );

  // ── Step 3: Due Diligence ──
  const renderStep3DueDiligence = () => (
    <>
      <div className="asm-section-header">
        <Search size={16} className="asm-section-icon" />
        تفاصيل العناية القانونية الواجبة
      </div>
      <div className="asm-field-group">
        <div className="asm-field">
          <label className="asm-label">نوع العناية</label>
          <select className="asm-select" value={formData.dd_type ?? ''} onChange={(e) => update('dd_type', e.target.value as any)}>
            <option value="">اختر النوع</option>
            {(Object.entries(DD_TYPE_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div className="asm-field">
          <label className="asm-label">اسم الشركة المستهدفة</label>
          <input type="text" className="asm-input" placeholder="اسم الشركة" value={formData.target_company_name ?? ''} onChange={(e) => update('target_company_name', e.target.value)} />
        </div>
        <div className="asm-field">
          <label className="asm-label">القيمة التقديرية للصفقة</label>
          <div className="asm-input-group">
            <input type="number" className="asm-input" placeholder="0.00" min={0} value={formData.estimated_deal_value ?? ''} onChange={(e) => update('estimated_deal_value', e.target.value ? Number(e.target.value) : undefined)} />
            <span className="asm-currency-badge">ر.س</span>
          </div>
        </div>
      </div>
    </>
  );

  // ── Step 3: IP ──
  const renderStep3Ip = () => (
    <>
      <div className="asm-section-header">
        <Lightbulb size={16} className="asm-section-icon" />
        تفاصيل الملكية الفكرية
      </div>
      <div className="asm-field-group">
        <div className="asm-field">
          <label className="asm-label">نوع الملكية الفكرية</label>
          <select className="asm-select" value={formData.ip_type ?? ''} onChange={(e) => update('ip_type', e.target.value as any)}>
            <option value="">اختر النوع</option>
            {(Object.entries(IP_TYPE_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div className="asm-field">
          <label className="asm-label">اسم / عنوان العلامة أو البراءة</label>
          <input type="text" className="asm-input" placeholder="الاسم أو العنوان" value={formData.ip_title ?? ''} onChange={(e) => update('ip_title', e.target.value)} />
        </div>
        <div className="asm-field">
          <label className="asm-label">مالك الحق</label>
          <input type="text" className="asm-input" placeholder="اسم المالك" value={formData.owner_name ?? ''} onChange={(e) => update('owner_name', e.target.value)} />
        </div>
        <div className="asm-field">
          <label className="asm-label">الجهة المسجلة</label>
          <select className="asm-select" value={formData.registration_office ?? ''} onChange={(e) => update('registration_office', e.target.value as any)}>
            <option value="">اختر الجهة</option>
            {(Object.entries(REGISTRATION_OFFICE_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
      </div>
    </>
  );

  // ── Step 3: Legal Notices ──
  const renderStep3LegalNotices = () => (
    <>
      <div className="asm-section-header">
        <Bell size={16} className="asm-section-icon" />
        تفاصيل الإنذار القانوني
      </div>
      <div className="asm-field-group">
        <div className="asm-field">
          <label className="asm-label">نوع الإنذار</label>
          <select className="asm-select" value={formData.notice_type ?? ''} onChange={(e) => update('notice_type', e.target.value as any)}>
            <option value="">اختر النوع</option>
            {(Object.entries(NOTICE_TYPE_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div className="asm-field">
          <label className="asm-label">اسم المرسل إليه</label>
          <input type="text" className="asm-input" placeholder="الاسم الكامل" value={formData.recipient_name ?? ''} onChange={(e) => update('recipient_name', e.target.value)} />
        </div>
        <div className="asm-field">
          <label className="asm-label">نوع المرسل إليه</label>
          <select className="asm-select" value={formData.recipient_type ?? ''} onChange={(e) => update('recipient_type', e.target.value as any)}>
            <option value="">اختر النوع</option>
            <option value="individual">فرد</option>
            <option value="company">شركة</option>
            <option value="government">جهة حكومية</option>
          </select>
        </div>
        <div className="asm-field">
          <label className="asm-label">المبلغ المطالب به</label>
          <div className="asm-input-group">
            <input type="number" className="asm-input" placeholder="0.00" min={0} value={formData.demanded_amount ?? ''} onChange={(e) => update('demanded_amount', e.target.value ? Number(e.target.value) : undefined)} />
            <span className="asm-currency-badge">ر.س</span>
          </div>
        </div>
        <div className="asm-field">
          <label className="asm-label">مهلة الرد (أيام)</label>
          <input type="number" className="asm-input" placeholder="15" min={1} value={formData.response_deadline_days ?? ''} onChange={(e) => update('response_deadline_days', e.target.value ? Number(e.target.value) : undefined)} />
        </div>
        <div className="asm-field">
          <label className="asm-label">طريقة التسليم</label>
          <select className="asm-select" value={formData.delivery_method_notice ?? ''} onChange={(e) => update('delivery_method_notice', e.target.value as any)}>
            <option value="">اختر الطريقة</option>
            {(Object.entries(NOTICE_DELIVERY_METHOD_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
      </div>
    </>
  );

  // ── Step 3: Training ──
  const renderStep3Training = () => (
    <>
      <div className="asm-section-header">
        <GraduationCap size={16} className="asm-section-icon" />
        تفاصيل التدريب القانوني
      </div>
      <div className="asm-field-group">
        <div className="asm-field">
          <label className="asm-label">نوع التدريب</label>
          <select className="asm-select" value={formData.training_type ?? ''} onChange={(e) => update('training_type', e.target.value as any)}>
            <option value="">اختر النوع</option>
            {(Object.entries(TRAINING_TYPE_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div className="asm-field">
          <label className="asm-label">تصنيف الموضوع</label>
          <select className="asm-select" value={formData.topic_category ?? ''} onChange={(e) => update('topic_category', e.target.value as any)}>
            <option value="">اختر التصنيف</option>
            {(Object.entries(TOPIC_CATEGORY_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div className="asm-field">
          <label className="asm-label">الموضوع</label>
          <input type="text" className="asm-input" placeholder="عنوان التدريب" value={formData.topic ?? ''} onChange={(e) => update('topic', e.target.value)} />
        </div>
        <div className="asm-field">
          <label className="asm-label">طريقة التقديم</label>
          <select className="asm-select" value={formData.delivery_format ?? 'in_person'} onChange={(e) => update('delivery_format', e.target.value as any)}>
            {(Object.entries(TRAINING_FORMAT_LABELS) as [string, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div className="asm-field">
          <label className="asm-label">التاريخ</label>
          <input type="date" className="asm-input" value={formData.event_date ?? ''} onChange={(e) => update('event_date', e.target.value)} />
        </div>
        <div className="asm-field">
          <label className="asm-label">المكان</label>
          <input type="text" className="asm-input" placeholder="مكان التدريب" value={formData.venue ?? ''} onChange={(e) => update('venue', e.target.value)} />
        </div>
        <div className="asm-field">
          <label className="asm-label">الحد الأقصى للحضور</label>
          <input type="number" className="asm-input" placeholder="مثال: 30" min={1} value={formData.max_attendees ?? ''} onChange={(e) => update('max_attendees', e.target.value ? Number(e.target.value) : undefined)} />
        </div>
        <div className="asm-field" style={{ justifyContent: 'flex-end' }}>
          <label className="asm-label">مجاني</label>
          <div className="asm-toggle-row" style={{ marginTop: 6 }}>
            <label className="asm-toggle">
              <input type="checkbox" checked={formData.is_free ?? false} onChange={(e) => update('is_free', e.target.checked)} />
              <span className="asm-toggle-track" />
            </label>
            <span className="asm-toggle-label">{formData.is_free ? 'مجاني' : 'مدفوع'}</span>
          </div>
        </div>
        {!formData.is_free && (
          <div className="asm-field">
            <label className="asm-label">السعر لكل متدرب</label>
            <div className="asm-input-group">
              <input type="number" className="asm-input" placeholder="0.00" min={0} value={formData.price_per_attendee ?? ''} onChange={(e) => update('price_per_attendee', e.target.value ? Number(e.target.value) : undefined)} />
              <span className="asm-currency-badge">ر.س</span>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const renderStep3 = () => (
    <div className="asm-step-content">
      {formData.service_type === 'consultation' && renderStep3Consultation()}
      {formData.service_type === 'contract_drafting' && renderStep3Contract()}
      {formData.service_type === 'company_formation' && renderStep3CompanyFormation()}
      {formData.service_type === 'licenses' && renderStep3Licenses()}
      {formData.service_type === 'arbitration' && renderStep3Arbitration()}
      {formData.service_type === 'compliance' && renderStep3Compliance()}
      {formData.service_type === 'labor' && renderStep3Labor()}
      {formData.service_type === 'real_estate' && renderStep3RealEstate()}
      {formData.service_type === 'due_diligence' && renderStep3DueDiligence()}
      {formData.service_type === 'ip' && renderStep3Ip()}
      {formData.service_type === 'legal_notices' && renderStep3LegalNotices()}
      {formData.service_type === 'training' && renderStep3Training()}
      {formData.service_type === 'other' && (
        <div className="asm-section-header">
          <MoreHorizontal size={16} className="asm-section-icon" />
          <span>لا توجد تفاصيل إضافية لهذا النوع — اكتب طبيعة الخدمة في حقل الوصف بالخطوة السابقة</span>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => {
    const billingType = formData.billing_type ?? 'flat_fee';
    const showAmount = billingType === 'flat_fee' || billingType === 'milestone';
    const showHourly = billingType === 'hourly';

    return (
      <div className="asm-step-content">
        <div className="asm-section-header">
          <DollarSign size={16} className="asm-section-icon" />
          المعلومات المالية
        </div>

        {/* Billing type segmented control */}
        <div className="asm-field-group single" style={{ marginBottom: 20 }}>
          <div className="asm-field span-full">
            <label className="asm-label" style={{ marginBottom: 8 }}>نوع الفوترة</label>
            <div className="asm-segment-group">
              {(Object.entries(BILLING_TYPE_LABELS) as [string, string][]).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  className={`asm-segment-btn${billingType === k ? ' active' : ''}`}
                  onClick={() => update('billing_type', k as any)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="asm-field-group">
          {/* Agreed amount — shown for flat_fee and milestone */}
          {showAmount && (
            <div className="asm-field">
              <label className="asm-label">المبلغ المتفق عليه</label>
              <div className="asm-input-group">
                <input
                  type="number"
                  className="asm-input"
                  placeholder="0.00"
                  min={0}
                  value={formData.agreed_amount ?? ''}
                  onChange={(e) =>
                    update('agreed_amount', e.target.value ? Number(e.target.value) : undefined)
                  }
                />
                <span className="asm-currency-badge">ر.س</span>
              </div>
            </div>
          )}

          {/* Hourly rate — shown for hourly */}
          {showHourly && (
            <div className="asm-field">
              <label className="asm-label">سعر الساعة</label>
              <div className="asm-input-group">
                <input
                  type="number"
                  className="asm-input"
                  placeholder="0.00"
                  min={0}
                  value={formData.hourly_rate ?? ''}
                  onChange={(e) =>
                    update('hourly_rate', e.target.value ? Number(e.target.value) : undefined)
                  }
                />
                <span className="asm-currency-badge">ر.س/س</span>
              </div>
            </div>
          )}

          {/* VAT */}
          <div className="asm-field">
            <label className="asm-label">نسبة الضريبة (%)</label>
            <div className="asm-input-group">
              <input
                type="number"
                className="asm-input"
                placeholder="15"
                min={0}
                max={100}
                value={formData.vat_rate ?? 15}
                onChange={(e) =>
                  update('vat_rate', e.target.value ? Number(e.target.value) : 15)
                }
              />
              <span className="asm-currency-badge">%</span>
            </div>
          </div>

          {/* Internal notes */}
          <div className="asm-field span-full">
            <label className="asm-label">ملاحظات داخلية</label>
            <textarea
              className="asm-textarea"
              placeholder="ملاحظات للفريق الداخلي (لن تظهر للعميل)..."
              rows={4}
              value={formData.internal_notes ?? ''}
              onChange={(e) => update('internal_notes', e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="asm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="asm-modal"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="asm-header">
              <div className="asm-header-left">
                <div className="asm-header-icon">
                  <Scale size={17} />
                </div>
                <div>
                  <div className="asm-header-title">إضافة خدمة قانونية جديدة</div>
                  <div className="asm-header-subtitle">
                    {formData.service_type
                      ? SERVICE_TYPE_LABELS[formData.service_type]
                      : 'اختر نوع الخدمة للبدء'}
                  </div>
                </div>
              </div>
              <button className="asm-header-close" onClick={onClose} type="button" aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="asm-steps">
              {STEPS.map((step, index) => {
                const stepNum = index + 1;
                const isActive = currentStep === stepNum;
                const isCompleted = currentStep > stepNum;
                return (
                  <React.Fragment key={stepNum}>
                    <div className="asm-step-item">
                      <div
                        className={`asm-step-dot${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`}
                      >
                        {isCompleted ? <Check size={11} strokeWidth={3} /> : stepNum}
                      </div>
                      <div
                        className={`asm-step-label${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`}
                      >
                        {step.label}
                      </div>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={`asm-step-connector${isCompleted ? ' completed' : ''}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Body with animated step transitions */}
            <div className="asm-body">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentStep}
                  initial={animEnter}
                  animate={slideVariants.center}
                  exit={animExit}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  {currentStep === 1 && renderStep1()}
                  {currentStep === 2 && renderStep2()}
                  {currentStep === 3 && renderStep3()}
                  {currentStep === 4 && renderStep4()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="notion-modal-footer">
              {currentStep > 1 && (
                <button
                  type="button"
                  className="notion-btn-secondary"
                  onClick={goPrev}
                >
                  <ChevronRight size={15} />
                  السابق
                </button>
              )}

              <div style={{ flex: 1 }} />

              <button
                type="button"
                className="notion-btn-secondary"
                onClick={onClose}
              >
                إلغاء
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  className="notion-btn-primary"
                  onClick={goNext}
                >
                  التالي
                  <ChevronLeft size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  className="notion-btn-primary"
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 size={15} className="asm-spinner" />
                  ) : (
                    <Save size={15} />
                  )}
                  {saving ? 'جارٍ الحفظ...' : 'حفظ الخدمة'}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddServiceModal;
