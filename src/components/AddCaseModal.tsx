import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Check,
  ChevronDown,
  X,
  Save,
  Briefcase,
  Flag,
  Activity,
  User,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  Gavel,
  FileText,
  UserPlus,
  Users,
  Scale,
  AlignLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PhoneField from './PhoneField';
import MultiSelectDropdown from './MultiSelectDropdown';
import { usePermission } from '../hooks/usePermission';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

/**
 * طيُّ الحروف العربية للبحث المحليّ.
 *
 * ⚠️ **لا يُقتبس `ArabicSearch::normalize` من الباك حرفياً**: تلك تكتفي بحذف
 *    التشكيل والتطويل وتحويل الأرقام، لأنّ ترتيبَ MySQL (`utf8mb4_unicode_ci`)
 *    يطوي الهمزةَ والتاءَ المربوطة والألفَ المقصورة بنفسه. وهنا لا ترتيبَ ولا
 *    قاعدة — فلو لم نطوِها بأيدينا لما وجد «احمد» **أحمد**، و«فاطمه» **فاطمة**،
 *    و«ليلى» **ليلي**. وهذا أكثرُ ما يُكتب خطأً في أسماء الموكّلين.
 */
const foldArabic = (input: string): string =>
  (input || '')
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

interface ClientOption {
  id: number | string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

/**
 * منتقي عميلٍ ببحث — بديلُ `<select>` الذي كان يسرد كلَّ العملاء بلا ترشيح.
 *
 * 🔴 مكتبٌ بمئتي عميلٍ كان عليه أن يتصفّح قائمةً منسدلةً طويلةً بعينه.
 *    والبحثُ هنا **محليٌّ آمن**: `/auth/clients` تُرجع العملاء كاملين بلا ترقيم،
 *    فما يُبحث فيه هو ما يوجد لا ما حُمِّل.
 *
 * ويُطابق **كلَّ كلمةٍ على حدة بـAND** لا العبارةَ كتلةً: فـ«احمد علي» يجد
 * «علي بن أحمد» — وهو ترتيبُ الأسماء الغالبُ في الوثائق الرسمية.
 */
const ClientPicker: React.FC<{
  clients: ClientOption[];
  value: string;
  onChange: (id: string) => void;
  invalid?: boolean;
}> = ({ clients, value, onChange, invalid }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = clients.find((c) => String(c.id) === String(value)) || null;

  // الإغلاق بالنقر خارجَه وبـEscape — القائمةُ داخل نافذةٍ مودالٍ فلا بوابةَ تلزم.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const matches = useMemo(() => {
    const words = foldArabic(query).split(' ').filter(Boolean);
    if (words.length === 0) return clients;
    return clients.filter((c) => {
      const hay = foldArabic(`${c.name} ${c.phone || ''} ${c.email || ''}`);
      return words.every((w) => hay.includes(w));
    });
  }, [clients, query]);

  return (
    <div className="erpc-picker" ref={wrapRef}>
      <button
        type="button"
        className={`erpc-picker-trigger ${invalid ? 'erpc-invalid' : ''}`}
        onClick={() => { setOpen((v) => !v); setQuery(''); }}
      >
        <span className={selected ? 'erpc-picker-value' : 'erpc-picker-placeholder'}>
          {selected
            ? `${selected.name}${selected.phone ? ` — ${selected.phone}` : ''}`
            : 'اختر عميلاً...'}
        </span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="erpc-picker-panel">
          <div className="erpc-picker-search">
            <Search size={14} />
            <input
              type="text"
              autoFocus
              className="erpc-picker-input"
              placeholder="ابحث بالاسم أو الجوال أو البريد"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button type="button" className="erpc-picker-clear" onClick={() => setQuery('')}>
                <X size={13} />
              </button>
            )}
          </div>

          <div className="erpc-picker-list">
            {matches.length === 0 ? (
              <div className="erpc-picker-empty">
                لا عميلَ يطابق «{query}»
                <span>أنشئه من تبويب «جديد»</span>
              </div>
            ) : (
              matches.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`erpc-picker-item ${String(c.id) === String(value) ? 'active' : ''}`}
                  onClick={() => { onChange(String(c.id)); setOpen(false); }}
                >
                  <span className="erpc-picker-name">{c.name}</span>
                  {c.phone && <span className="erpc-picker-meta">{c.phone}</span>}
                </button>
              ))
            )}
          </div>

          {/* العددُ من القائمة كاملةً لا من المعروض — فلا يُوهم أنّ ما ظهر هو الكلّ. */}
          <div className="erpc-picker-foot">{matches.length} من {clients.length}</div>
        </div>
      )}
    </div>
  );
};

interface ExtraClient {
  mode: 'existing' | 'new';
  clientId: string;
  name: string;
  phone: string;
  email: string;
  nationalId: string;
}

interface CaseFormData {
  caseNumber: string;
  clientName: string;
  clientId: string;
  clientPhone: string;
  clientEmail: string;
  clientNationalId: string;
  /** إرسال بيانات الدخول للعميل الجديد عبر واتساب (الافتراض نعم) */
  sendCredentials: boolean;
  isNewClient: boolean;
  clientRole: '' | 'plaintiff' | 'defendant';
  opponentName: string;
  opponentLawyer: string;
  court: string;
  caseType: string;
  caseCategory: string;
  priority: 'low' | 'medium' | 'high';
  status: 'draft' | 'preparation' | 'filed' | 'active' | 'pending' | 'closed' | 'appealed' | 'settled' | 'dismissed';
  description: string;
  contractValue: string;
  filingDate: string;
  hearingDate: string;
  assignedLawyer: string;
  notes: string;
  requiresMemoApproval: boolean;
  memoApprovers: string[];
  additionalClients: ExtraClient[];
  teamLawyers: string[];
}

interface AddCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (caseData: CaseFormData) => void | Promise<void>;
  lawyers?: User[];
  clients?: User[];
}

const STATUS_LABELS: Record<CaseFormData['status'], string> = {
  draft: 'مسودة',
  preparation: 'جاري التجهيز',
  filed: 'تم الرفع على ناجز',
  active: 'نشطة',
  pending: 'معلقة',
  appealed: 'مستأنفة',
  settled: 'مسوية',
  dismissed: 'مرفوضة',
  closed: 'مغلقة',
};

const AddCaseModal: React.FC<AddCaseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  lawyers: lawyersFromProps = [],
  clients: clientsFromProps = []
}) => {
  const [formData, setFormData] = useState<CaseFormData>({
    caseNumber: '',
    clientName: '',
    clientId: '',
    clientPhone: '',
    clientEmail: '',
    clientNationalId: '',
    sendCredentials: true,
    isNewClient: true,
    clientRole: '',
    opponentName: '',
    opponentLawyer: '',
    court: '',
    caseType: '',
    caseCategory: '',
    priority: 'medium',
    status: 'draft',
    description: '',
    contractValue: '',
    filingDate: '',
    hearingDate: '',
    assignedLawyer: '',
    notes: '',
    requiresMemoApproval: false,
    memoApprovers: [],
    additionalClients: [],
    teamLawyers: []
  });

  const [errors, setErrors] = useState<Partial<CaseFormData>>({});
  const canManageMemoPolicy = usePermission('memos.approval-policy.manage');
  const [approverError, setApproverError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const addExtraClient = () => {
    setFormData(prev => ({
      ...prev,
      additionalClients: [...prev.additionalClients, { mode: 'new', clientId: '', name: '', phone: '', email: '', nationalId: '' }],
    }));
  };
  const updateExtraClient = (index: number, field: keyof ExtraClient, value: string) => {
    setFormData(prev => ({
      ...prev,
      additionalClients: prev.additionalClients.map((c, i) => i === index ? ({ ...c, [field]: value } as ExtraClient) : c),
    }));
  };
  const removeExtraClient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalClients: prev.additionalClients.filter((_, i) => i !== index),
    }));
  };

  const toggleMemoApprover = (id: string) => {
    setFormData(prev => ({
      ...prev,
      memoApprovers: prev.memoApprovers.includes(id)
        ? prev.memoApprovers.filter(x => x !== id)
        : [...prev.memoApprovers, id],
    }));
  };

  // اختيار/إلغاء محامٍ من القائمة الموحّدة: أول اختيار = المسؤول (نجمة)،
  // والبقية أعضاء فريق (صح). إلغاء المسؤول ينقل الدور لأول عضو تلقائياً.
  const toggleLawyerSelection = (id: string) => {
    setFormData(prev => {
      if (prev.assignedLawyer === id) {
        const [next, ...rest] = prev.teamLawyers;
        return { ...prev, assignedLawyer: next || '', teamLawyers: rest };
      }
      if (prev.teamLawyers.includes(id)) {
        return { ...prev, teamLawyers: prev.teamLawyers.filter(x => x !== id) };
      }
      if (!prev.assignedLawyer) {
        return { ...prev, assignedLawyer: id };
      }
      return { ...prev, teamLawyers: [...prev.teamLawyers, id] };
    });
  };

  // ترقية عضو فريق ليكون المسؤول (تنتقل النجمة، والمسؤول السابق يصبح عضواً)
  const makeResponsibleLawyer = (id: string) => {
    setFormData(prev => {
      if (prev.assignedLawyer === id || !prev.teamLawyers.includes(id)) return prev;
      const newTeam = prev.teamLawyers.filter(x => x !== id);
      if (prev.assignedLawyer) newTeam.unshift(prev.assignedLawyer);
      return { ...prev, assignedLawyer: id, teamLawyers: newTeam };
    });
  };

  // معتمِدون من المحامين الحقيقيين فقط (لا بيانات تجريبية fallback)
  const memoApproverOptions = lawyersFromProps.map(l => ({ value: String(l.id), label: l.name }));
  // كل المحامين الحقيقيين — تُعرض في قائمة منسدلة مشتركة (MultiSelectDropdown)
  const allLawyerOptions = lawyersFromProps.map(l => ({ value: String(l.id), label: l.name }));

  const caseTypes = [
    { value: 'civil', label: 'قضايا مدنية' },
    { value: 'commercial', label: 'قضايا تجارية' },
    { value: 'real_estate', label: 'قضايا عقارية' },
    { value: 'labor', label: 'قضايا عمالية' },
    { value: 'family', label: 'قضايا أسرة' },
    { value: 'criminal', label: 'قضايا جنائية' },
    { value: 'administrative', label: 'قضايا إدارية' },
    { value: 'intellectual_property', label: 'الملكية الفكرية' },
    { value: 'other', label: 'أخرى' }
  ];

  const courts = [
    'المحكمة العامة',
    'المحكمة الجزائية',
    'محكمة الاستئناف',
    'المحكمة التجارية',
    'محكمة العمل',
    'التسوية الودية للخلافات العمالية',
    'محكمة الأحوال الشخصية',
    'المحكمة الإدارية',
    'محكمة التنفيذ',
    'ديوان المظالم',
    'اللجان شبه القضائية',
    'لجنة الفصل في المنازعات المصرفية',
    'لجنة الفصل في منازعات الأوراق المالية',
    'لجان الفصل في المنازعات والمخالفات التأمينية',
    'اللجان الجمركية',
    'لجنة النظر في مخالفات أنظمة البلدية',
    'لجنة التحكيم'
  ];

  const handleInputChange = (field: keyof CaseFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof CaseFormData]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CaseFormData> = {};
    const isPrepMode = ['draft', 'preparation', 'filed'].includes(formData.status);

    // إلزامي دائماً: العنوان + العميل الرئيسي + المحامي المسؤول
    if (!formData.caseNumber.trim()) newErrors.caseNumber = 'عنوان القضية مطلوب';
    if (formData.isNewClient) {
      if (!formData.clientName.trim()) newErrors.clientName = 'اسم العميل مطلوب';
    } else {
      if (!formData.clientId) newErrors.clientId = 'يرجى اختيار العميل';
    }
    if (!formData.assignedLawyer) newErrors.assignedLawyer = 'المحامي المسؤول مطلوب';

    // إلزامي للقضية النشطة فقط — المسودة مرحلة تجهيز تتساهل
    if (!isPrepMode) {
      if (!formData.caseType) newErrors.caseType = 'نوع القضية مطلوب';
      if (!formData.court) newErrors.court = 'المحكمة مطلوبة';
      if (!formData.description.trim()) newErrors.description = 'وصف القضية مطلوب';
      if (!formData.filingDate) newErrors.filingDate = 'تاريخ رفع الدعوى مطلوب';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!validateForm()) return;
    if (canManageMemoPolicy && formData.requiresMemoApproval && formData.memoApprovers.length === 0) {
      setApproverError('اختر معتمِداً واحداً على الأقل، أو ألغِ اشتراط اعتماد المذكرات.');
      return;
    }
    setApproverError('');
    try {
      await onSave(formData);
      handleReset();
      onClose();
    } catch (err) {
      // عرض رسالة الخطأ داخل المودال (يبقى مفتوحاً بمدخلاته) بدل ابتلاعها في الخلف
      setSubmitError(err instanceof Error && err.message ? err.message : 'تعذّر حفظ القضية. تحقّق من البيانات وحاول مجدداً.');
    }
  };

  const handleReset = () => {
    setFormData({
      caseNumber: '',
      clientName: '',
      clientId: '',
      clientPhone: '',
      clientEmail: '',
      clientNationalId: '',
    sendCredentials: true,
      isNewClient: true,
      clientRole: '',
      opponentName: '',
      opponentLawyer: '',
      court: '',
      caseType: '',
      caseCategory: '',
      priority: 'medium',
      status: 'draft',
      description: '',
      contractValue: '',
      filingDate: '',
      hearingDate: '',
      assignedLawyer: '',
      notes: '',
      requiresMemoApproval: false,
      memoApprovers: [],
      additionalClients: [],
      teamLawyers: []
    });
    setErrors({});
    setSubmitError('');
    setApproverError('');
  };

  if (!isOpen) return null;

  const isPrepMode = ['draft', 'preparation', 'filed'].includes(formData.status);
  const extraCount = formData.additionalClients.length;

  return (
    <AnimatePresence>
      <motion.div
        className="erpc-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="erpc-modal"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="erpc-header">
            <div className="erpc-header-icon">
              <Briefcase size={18} />
            </div>
            <div className="erpc-header-title">
              <span className="erpc-header-eyebrow">إضافة إلى القضايا</span>
              <span className="erpc-header-main">قضية جديدة</span>
            </div>
            <div className="erpc-header-spacer" />
            <span className="erpc-status-chip">{STATUS_LABELS[formData.status]}</span>
            <button type="button" className="erpc-close" onClick={onClose} aria-label="إغلاق">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Title bar */}
            <div className="erpc-titlebar">
              <input
                type="text"
                className="erpc-title-input"
                placeholder="عنوان القضية (مثال: مطالبة مالية - شركة س)"
                value={formData.caseNumber}
                onChange={(e) => handleInputChange('caseNumber', e.target.value)}
                maxLength={255}
                autoFocus
              />
              <div className="erpc-title-meta">
                {errors.caseNumber
                  ? <span className="erpc-error-text">{errors.caseNumber}</span>
                  : <span />}
                <span className="erpc-counter">{formData.caseNumber.length}/255</span>
              </div>
            </div>

            {/* Body */}
            <div className="erpc-body">
              {submitError && <div className="erpc-alert">{submitError}</div>}

              <div className="erpc-grid">

                {/* Panel: تفاصيل القضية */}
                <div className="erpc-panel">
                  <div className="erpc-panel-head">
                    <Activity />
                    <span>تفاصيل القضية</span>
                  </div>
                  <div className="erpc-panel-body">
                    {/* Status */}
                    <div className="erpc-field">
                      <span className="erpc-field-label"><Activity />الحالة</span>
                      <div className="erpc-control">
                        <select
                          className="erpc-select"
                          value={formData.status}
                          onChange={(e) => handleInputChange('status', e.target.value)}
                        >
                          <optgroup label="مرحلة التجهيز">
                            <option value="draft">مسودة</option>
                            <option value="preparation">جاري التجهيز</option>
                            <option value="filed">تم الرفع على ناجز</option>
                          </optgroup>
                          <optgroup label="قضية نشطة">
                            <option value="active">نشطة</option>
                            <option value="pending">معلقة</option>
                            <option value="appealed">مستأنفة</option>
                            <option value="settled">مسوية</option>
                            <option value="dismissed">مرفوضة</option>
                            <option value="closed">مغلقة</option>
                          </optgroup>
                        </select>
                        <ChevronDown size={14} className="erpc-select-arrow" />
                      </div>
                    </div>

                    {/* Priority */}
                    <div className="erpc-field">
                      <span className="erpc-field-label"><Flag />الأولوية</span>
                      <div className="erpc-control">
                        <select
                          className="erpc-select"
                          value={formData.priority}
                          onChange={(e) => handleInputChange('priority', e.target.value)}
                        >
                          <option value="low">منخفضة</option>
                          <option value="medium">متوسطة</option>
                          <option value="high">عالية</option>
                        </select>
                        <ChevronDown size={14} className="erpc-select-arrow" />
                      </div>
                    </div>

                    {/* المحامون — قائمة منسدلة مشتركة (Portal): أول اختيار ★ مسؤول والبقية فريق؛ الحقل يعرض «المسؤول وآخرون» */}
                    <div className="erpc-field">
                      <span className="erpc-field-label"><User />المحامون<span className="erpc-req">*</span></span>
                      <MultiSelectDropdown
                        options={allLawyerOptions}
                        selected={[formData.assignedLawyer, ...formData.teamLawyers].filter(Boolean)}
                        responsible={formData.assignedLawyer || undefined}
                        onToggle={toggleLawyerSelection}
                        onPromote={makeResponsibleLawyer}
                        invalid={!!errors.assignedLawyer}
                        placeholder="اختر المحامين"
                        emptyText="لا يوجد محامون متاحون"
                      />
                    </div>

                    {/* Case Type */}
                    <div className="erpc-field">
                      <span className="erpc-field-label"><Briefcase />النوع{!isPrepMode && <span className="erpc-req">*</span>}</span>
                      <div className="erpc-control">
                        <select
                          className={`erpc-select ${errors.caseType ? 'erpc-invalid' : ''}`}
                          value={formData.caseType}
                          onChange={(e) => handleInputChange('caseType', e.target.value)}
                        >
                          <option value="">اختر النوع</option>
                          {caseTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <ChevronDown size={14} className="erpc-select-arrow" />
                      </div>
                    </div>

                    {/* Court */}
                    <div className="erpc-field">
                      <span className="erpc-field-label"><Gavel />المحكمة{!isPrepMode && <span className="erpc-req">*</span>}</span>
                      <div className="erpc-control">
                        <select
                          className={`erpc-select ${errors.court ? 'erpc-invalid' : ''}`}
                          value={formData.court}
                          onChange={(e) => handleInputChange('court', e.target.value)}
                        >
                          <option value="">اختر المحكمة</option>
                          {courts.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown size={14} className="erpc-select-arrow" />
                      </div>
                    </div>

                    {/* Filing Date — يظهر للقضية النشطة فقط */}
                    {!isPrepMode && (
                      <div className="erpc-field">
                        <span className="erpc-field-label"><Calendar />تاريخ الرفع<span className="erpc-req">*</span></span>
                        <div className="erpc-control">
                          <input
                            type="date"
                            className={`erpc-input ${errors.filingDate ? 'erpc-invalid' : ''}`}
                            value={formData.filingDate}
                            onChange={(e) => handleInputChange('filingDate', e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Contract Value */}
                    <div className="erpc-field">
                      <span className="erpc-field-label"><CreditCard />قيمة العقد</span>
                      <div className="erpc-control">
                        <input
                          type="number"
                          className="erpc-input"
                          placeholder="بالريال (اختياري)"
                          value={formData.contractValue}
                          onChange={(e) => handleInputChange('contractValue', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel: العميل الرئيسي */}
                <div className="erpc-panel">
                  <div className="erpc-panel-head">
                    <UserPlus />
                    <span>العميل الرئيسي</span>
                    <div className="erpc-segmented" style={{ marginInlineStart: 'auto' }}>
                      <button
                        type="button"
                        className={`erpc-seg-btn ${formData.isNewClient ? 'active' : ''}`}
                        onClick={() => handleInputChange('isNewClient', true)}
                      >
                        جديد
                      </button>
                      <button
                        type="button"
                        className={`erpc-seg-btn ${!formData.isNewClient ? 'active' : ''}`}
                        onClick={() => handleInputChange('isNewClient', false)}
                      >
                        موجود
                      </button>
                    </div>
                  </div>
                  <div className="erpc-panel-body">
                    {formData.isNewClient ? (
                      <>
                        <div className="erpc-field">
                          <span className="erpc-field-label"><User />الاسم<span className="erpc-req">*</span></span>
                          <div className="erpc-control">
                            <input
                              type="text"
                              className={`erpc-input ${errors.clientName ? 'erpc-invalid' : ''}`}
                              placeholder="اسم العميل الكامل"
                              value={formData.clientName}
                              onChange={(e) => handleInputChange('clientName', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="erpc-field">
                          {/* 🔓 اختياريّ — كان إلزامياً في الواجهة والخادم معاً.
                              المكتبُ يفتح القضيةَ ساعةَ يصله الملفّ وقد لا يكون
                              معه رقمُ موكّله بعد؛ فالإلزامُ كان يدفع إلى رقمٍ
                              مختلَقٍ يبقى في القاعدة. ⚠️ وبلا رقمٍ لا تصل رسالةُ
                              الترحيب ولا رمزُ بوابة العميل — يُضاف لاحقاً من
                              صفحته فتعمل القناة. */}
                          <span className="erpc-field-label"><Phone />الهاتف<span className="erpc-hint-inline">اختياري</span></span>
                          <div className="erpc-control">
                            <PhoneField
                              value={formData.clientPhone}
                              onChange={(v) => handleInputChange('clientPhone', v)}
                              placeholder="5X XXX XXXX"
                            />
                          </div>
                        </div>
                        <div className="erpc-field">
                          <span className="erpc-field-label"><Phone />بيانات الدخول</span>
                          <div className="erpc-control">
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }} title="يمكن إيقاف هذه الرسالة لكل المكتب من إعدادات الواتساب › الرسائل الآلية">
                              <input type="checkbox" checked={formData.sendCredentials !== false} onChange={(e) => setFormData((prev) => ({ ...prev, sendCredentials: e.target.checked }))} />
                              <span>إرسال بيانات الدخول للعميل عبر واتساب عند إنشاء القضية</span>
                            </label>
                          </div>
                        </div>
                        <div className="erpc-field">
                          <span className="erpc-field-label"><Mail />البريد</span>
                          <div className="erpc-control">
                            <input
                              type="email"
                              className="erpc-input"
                              placeholder="example@mail.com"
                              value={formData.clientEmail}
                              onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="erpc-field">
                          <span className="erpc-field-label"><CreditCard />الهوية</span>
                          <div className="erpc-control">
                            <input
                              type="text"
                              className="erpc-input"
                              placeholder="رقم الهوية الوطنية"
                              value={formData.clientNationalId}
                              onChange={(e) => handleInputChange('clientNationalId', e.target.value)}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="erpc-field erpc-field-stack">
                        <span className="erpc-field-label"><Search />اختر العميل<span className="erpc-req">*</span></span>
                        <ClientPicker
                          clients={clientsFromProps as any}
                          value={formData.clientId}
                          onChange={(id) => handleInputChange('clientId', id)}
                          invalid={!!errors.clientId}
                        />
                      </div>
                    )}
                    {/* صفة العميل — عند تحديدها تُنشأ أطراف الدعوى تلقائياً
                        (العميل بجهته + الخصم بالجهة المقابلة + محاميه) */}
                    <div className="erpc-field">
                      <span className="erpc-field-label"><Scale />صفته في الدعوى</span>
                      <div className="erpc-segmented">
                        <button
                          type="button"
                          className={`erpc-seg-btn ${formData.clientRole === 'plaintiff' ? 'active' : ''}`}
                          onClick={() => handleInputChange('clientRole', formData.clientRole === 'plaintiff' ? '' : 'plaintiff')}
                        >
                          مدعي
                        </button>
                        <button
                          type="button"
                          className={`erpc-seg-btn ${formData.clientRole === 'defendant' ? 'active' : ''}`}
                          onClick={() => handleInputChange('clientRole', formData.clientRole === 'defendant' ? '' : 'defendant')}
                        >
                          مدعى عليه
                        </button>
                      </div>
                      <span className="erpc-hint">تحديدها يسجّل أطراف الدعوى تلقائياً</span>
                    </div>
                  </div>
                </div>

                {/* Panel: الخصم */}
                <div className="erpc-panel">
                  <div className="erpc-panel-head">
                    <Scale />
                    <span>الخصم</span>
                    <span className="erpc-hint" style={{ marginInlineStart: 'auto' }}>اختياري</span>
                  </div>
                  <div className="erpc-panel-body">
                    <div className="erpc-field">
                      <span className="erpc-field-label"><Users />الاسم</span>
                      <div className="erpc-control">
                        <input
                          type="text"
                          className="erpc-input"
                          placeholder="اسم الخصم"
                          value={formData.opponentName}
                          onChange={(e) => handleInputChange('opponentName', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="erpc-field">
                      <span className="erpc-field-label"><User />محاميه</span>
                      <div className="erpc-control">
                        <input
                          type="text"
                          className="erpc-input"
                          placeholder="محامي الخصم"
                          value={formData.opponentLawyer}
                          onChange={(e) => handleInputChange('opponentLawyer', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel: سياسة اعتماد المذكرات — لمن يملك الصلاحية فقط */}
                {canManageMemoPolicy && (
                  <div className="erpc-panel">
                    <div className="erpc-panel-head">
                      <Check />
                      <span>اعتماد المذكرات</span>
                    </div>
                    <div className="erpc-panel-body">
                      <label className="erpc-check-row">
                        <input
                          type="checkbox"
                          checked={formData.requiresMemoApproval}
                          onChange={(e) => setFormData(prev => ({ ...prev, requiresMemoApproval: e.target.checked }))}
                        />
                        <span>تشترط اعتماد المذكرات قبل إرسالها للعميل</span>
                      </label>

                      {formData.requiresMemoApproval && (
                        <div style={{ marginTop: 6 }}>
                          <MultiSelectDropdown
                            options={memoApproverOptions}
                            selected={formData.memoApprovers}
                            onToggle={(id) => toggleMemoApprover(String(id))}
                            placeholder="اختر المعتمِدين"
                            emptyText="لا يوجد محامون للاختيار كمعتمِدين"
                          />
                        </div>
                      )}
                      {approverError && <span className="erpc-error-text" style={{ marginTop: 4 }}>{approverError}</span>}
                    </div>
                  </div>
                )}

                {/* Panel: عملاء إضافيون (متعددو الموكلين) */}
                <div className="erpc-panel erpc-span-2">
                  <div className="erpc-panel-head">
                    <Users />
                    <span>عملاء إضافيون</span>
                    <span className="erpc-hint">موكلون آخرون في نفس القضية</span>
                    {extraCount > 0 && <span className="erpc-panel-badge">{extraCount}</span>}
                  </div>
                  <div className="erpc-panel-body" style={{ gap: 8 }}>
                    {formData.additionalClients.map((ec, idx) => (
                      <div key={idx} className="erpc-extra-card">
                        <div className="erpc-extra-head">
                          <div className="erpc-segmented">
                            <button type="button" className={`erpc-seg-btn ${ec.mode === 'new' ? 'active' : ''}`} onClick={() => updateExtraClient(idx, 'mode', 'new')}>جديد</button>
                            <button type="button" className={`erpc-seg-btn ${ec.mode === 'existing' ? 'active' : ''}`} onClick={() => updateExtraClient(idx, 'mode', 'existing')}>موجود</button>
                          </div>
                          <button type="button" className="erpc-icon-btn" onClick={() => removeExtraClient(idx)} title="حذف هذا العميل">
                            <X size={16} />
                          </button>
                        </div>

                        {ec.mode === 'existing' ? (
                          <ClientPicker
                            clients={clientsFromProps as any}
                            value={ec.clientId}
                            onChange={(id) => updateExtraClient(idx, 'clientId', id)}
                          />
                        ) : (
                          <div className="erpc-extra-grid">
                            <input type="text" className="erpc-input" placeholder="اسم العميل" value={ec.name} onChange={(e) => updateExtraClient(idx, 'name', e.target.value)} />
                            <input type="text" className="erpc-input" placeholder="رقم الهاتف" value={ec.phone} onChange={(e) => updateExtraClient(idx, 'phone', e.target.value)} />
                            <input type="email" className="erpc-input" placeholder="البريد (اختياري)" value={ec.email} onChange={(e) => updateExtraClient(idx, 'email', e.target.value)} />
                            <input type="text" className="erpc-input" placeholder="رقم الهوية (اختياري)" value={ec.nationalId} onChange={(e) => updateExtraClient(idx, 'nationalId', e.target.value)} />
                          </div>
                        )}
                      </div>
                    ))}

                    <button type="button" className="erpc-add-btn" onClick={addExtraClient}>
                      <UserPlus size={14} /> أضف عميلاً آخر
                    </button>
                  </div>
                </div>

                {/* Panel: الوصف والملاحظات */}
                <div className="erpc-panel erpc-span-2">
                  <div className="erpc-panel-head">
                    <AlignLeft />
                    <span>الوصف والملاحظات</span>
                  </div>
                  <div className="erpc-panel-body" style={{ gap: 10 }}>
                    <div className="erpc-field erpc-field-stack">
                      <span className="erpc-field-label"><FileText />وصف القضية{!isPrepMode && <span className="erpc-req">*</span>}</span>
                      <textarea
                        className={`erpc-textarea ${errors.description ? 'erpc-invalid' : ''}`}
                        placeholder="اكتب تفاصيل القضية، الحقائق، والطلبات..."
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                      />
                    </div>
                    <div className="erpc-field erpc-field-stack">
                      <span className="erpc-field-label"><FileText />ملاحظات إضافية</span>
                      <textarea
                        className="erpc-textarea"
                        style={{ minHeight: 56 }}
                        placeholder="أي ملاحظات أخرى..."
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="erpc-footer">
              <button type="button" className="erpc-btn-secondary" onClick={onClose}>
                إلغاء
              </button>
              <button type="submit" className="erpc-btn-primary">
                <Save size={16} />
                حفظ القضية
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddCaseModal;
