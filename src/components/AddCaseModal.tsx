import React, { useState } from 'react';
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
import { usePermission } from '../hooks/usePermission';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

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
  isNewClient: boolean;
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
    isNewClient: true,
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
    additionalClients: []
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

  // معتمِدون من المحامين الحقيقيين فقط (لا بيانات تجريبية fallback)
  const memoApproverOptions = lawyersFromProps.map(l => ({ value: String(l.id), label: l.name }));
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientSearch, setShowClientSearch] = useState(false);

  const filteredClients = clientsFromProps.filter(client =>
    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    (client.phone && client.phone.includes(clientSearchTerm))
  );

  const selectedClient = clientsFromProps.find(c => c.id.toString() === formData.clientId.toString());

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

  const lawyers = lawyersFromProps.length > 0
    ? lawyersFromProps.map(lawyer => ({ value: lawyer.id, label: lawyer.name }))
    : [
      { value: '1', label: 'أحمد محامي' },
      { value: '2', label: 'سارة محامية' },
      { value: '3', label: 'محمد محامي' },
      { value: '4', label: 'خالد محامية' },
      { value: '5', label: 'عبدالله محامي' }
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
      if (!formData.clientPhone.trim()) newErrors.clientPhone = 'رقم هاتف العميل مطلوب';
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
      isNewClient: true,
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
      additionalClients: []
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

                    {/* Assigned Lawyer */}
                    <div className="erpc-field">
                      <span className="erpc-field-label"><User />المحامي<span className="erpc-req">*</span></span>
                      <div className="erpc-control">
                        <select
                          className={`erpc-select ${errors.assignedLawyer ? 'erpc-invalid' : ''}`}
                          value={formData.assignedLawyer}
                          onChange={(e) => handleInputChange('assignedLawyer', e.target.value)}
                        >
                          <option value="">اختر المحامي</option>
                          {lawyers.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                        <ChevronDown size={14} className="erpc-select-arrow" />
                      </div>
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
                          <span className="erpc-field-label"><Phone />الهاتف<span className="erpc-req">*</span></span>
                          <div className="erpc-control">
                            <PhoneField
                              value={formData.clientPhone}
                              onChange={(v) => handleInputChange('clientPhone', v)}
                              placeholder="5X XXX XXXX"
                            />
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
                        <div className="erpc-search">
                          <div
                            className={`erpc-input erpc-search-trigger ${errors.clientId ? 'erpc-invalid' : ''}`}
                            onClick={() => setShowClientSearch(!showClientSearch)}
                          >
                            <span style={{ opacity: selectedClient ? 1 : 0.4 }}>
                              {selectedClient ? selectedClient.name : 'ابحث عن عميل...'}
                            </span>
                            <ChevronDown size={14} style={{ opacity: 0.5 }} />
                          </div>

                          {showClientSearch && (
                            <>
                              <div className="erpc-search-dropdown">
                                <div className="erpc-search-field-wrap">
                                  <Search size={14} style={{ opacity: 0.4 }} />
                                  <input
                                    type="text"
                                    className="erpc-search-field"
                                    placeholder="ابحث بالاسم أو الرقم..."
                                    value={clientSearchTerm}
                                    onChange={(e) => setClientSearchTerm(e.target.value)}
                                    autoFocus
                                  />
                                </div>
                                <div style={{ padding: '4px 0' }}>
                                  {filteredClients.length > 0 ? (
                                    filteredClients.map(client => (
                                      <div
                                        key={client.id}
                                        className={`erpc-search-item ${formData.clientId.toString() === client.id.toString() ? 'selected' : ''}`}
                                        onClick={() => {
                                          handleInputChange('clientId', client.id.toString());
                                          setShowClientSearch(false);
                                          setClientSearchTerm('');
                                        }}
                                      >
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontWeight: 500 }}>{client.name}</div>
                                          {client.phone && <div style={{ fontSize: '11px', opacity: 0.6 }}>{client.phone}</div>}
                                        </div>
                                        {formData.clientId.toString() === client.id.toString() && <Check size={14} />}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="erpc-search-empty">لا يوجد نتائج للبحث</div>
                                  )}
                                </div>
                              </div>
                              <div
                                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                                onClick={() => setShowClientSearch(false)}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    )}
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
                        <div className="erpc-chips" style={{ marginTop: 6 }}>
                          {memoApproverOptions.length === 0 && (
                            <span className="erpc-hint">لا يوجد محامون للاختيار كمعتمِدين.</span>
                          )}
                          {memoApproverOptions.map(l => {
                            const active = formData.memoApprovers.includes(String(l.value));
                            return (
                              <button
                                key={l.value}
                                type="button"
                                className={`erpc-chip ${active ? 'active' : ''}`}
                                onClick={() => toggleMemoApprover(String(l.value))}
                              >
                                {active && <Check size={12} />} {l.label}
                              </button>
                            );
                          })}
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
                          <div className="erpc-control">
                            <select className="erpc-select" value={ec.clientId} onChange={(e) => updateExtraClient(idx, 'clientId', e.target.value)}>
                              <option value="">اختر عميلاً موجوداً...</option>
                              {clientsFromProps.map(c => <option key={c.id} value={c.id.toString()}>{c.name}{c.phone ? ` — ${c.phone}` : ''}</option>)}
                            </select>
                            <ChevronDown size={14} className="erpc-select-arrow" />
                          </div>
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
