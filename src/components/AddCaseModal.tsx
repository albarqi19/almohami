import React, { useState } from 'react';
import {
  Search,
  Check,
  ChevronDown,
  X,
  Save,
  Hash,
  Briefcase,
  AlignLeft,
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
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/add-case-modal.css';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
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
  status: 'active' | 'pending' | 'closed' | 'appealed' | 'settled' | 'dismissed';
  description: string;
  contractValue: string;
  filingDate: string;
  hearingDate: string;
  assignedLawyer: string;
  notes: string;
}

interface AddCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (caseData: CaseFormData) => void;
  lawyers?: User[];
  clients?: User[];
}

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
    status: 'active',
    description: '',
    contractValue: '',
    filingDate: '',
    hearingDate: '',
    assignedLawyer: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Partial<CaseFormData>>({});
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
    'محكمة الاستئناف',
    'المحكمة التجارية',
    'محكمة العمل',
    'محكمة الأحوال الشخصية',
    'المحكمة الإدارية',
    'محكمة التنفيذ'
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
    if (!formData.caseNumber.trim()) newErrors.caseNumber = 'رقم الملف مطلوب';
    if (formData.isNewClient) {
      if (!formData.clientName.trim()) newErrors.clientName = 'اسم العميل مطلوب';
      if (!formData.clientPhone.trim()) newErrors.clientPhone = 'رقم هاتف العميل مطلوب';
    } else {
      if (!formData.clientId) newErrors.clientId = 'يرجى اختيار العميل';
    }
    if (!formData.caseType) newErrors.caseType = 'نوع القضية مطلوب';
    if (!formData.court) newErrors.court = 'المحكمة مطلوبة';
    if (!formData.assignedLawyer) newErrors.assignedLawyer = 'المحامي المسؤول مطلوب';
    if (!formData.description.trim()) newErrors.description = 'وصف القضية مطلوب';
    if (!formData.filingDate) newErrors.filingDate = 'تاريخ رفع الدعوى مطلوب';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
      handleReset();
      onClose();
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
      status: 'active',
      description: '',
      contractValue: '',
      filingDate: '',
      hearingDate: '',
      assignedLawyer: '',
      notes: ''
    });
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="notion-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="notion-modal"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="notion-modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="notion-header-icon-container">
                <Briefcase size={20} className="notion-header-icon" />
              </div>
              <div className="notion-modal-title">
                <div style={{ fontSize: '12px', opacity: 0.5, lineHeight: 1 }}>إضافة إلى</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>القضايا</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="notion-modal-close" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            <div className="notion-modal-body">
              {/* Icon & Title */}
              <input
                type="text"
                className="notion-page-title-input"
                placeholder="رقم القضية أو اسم الملف..."
                value={formData.caseNumber}
                onChange={(e) => handleInputChange('caseNumber', e.target.value)}
                autoFocus
              />
              {errors.caseNumber && <span style={{ color: '#EB5757', fontSize: '12px', display: 'block', marginTop: '-16px', marginBottom: '16px' }}>{errors.caseNumber}</span>}

              {/* Properties Grid */}
              <div className="notion-properties">

                {/* Status */}
                <div className="notion-property-row">
                  <div className="notion-property-label">
                    <Activity className="notion-property-icon" />
                    <span>الحالة</span>
                  </div>
                  <div className="notion-property-value">
                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                      <select
                        className="notion-select"
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        style={{ paddingLeft: '28px' }}
                      >
                        <option value="active">نشطة</option>
                        <option value="pending">معلقة</option>
                        <option value="closed">مغلقة</option>
                        <option value="appealed">مستأنفة</option>
                        <option value="settled">مسوية</option>
                        <option value="dismissed">مرفوضة</option>
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', left: '8px', opacity: 0.4, pointerEvents: 'none' }} />
                    </div>
                  </div>
                </div>

                {/* Priority */}
                <div className="notion-property-row">
                  <div className="notion-property-label">
                    <Flag className="notion-property-icon" />
                    <span>الأولوية</span>
                  </div>
                  <div className="notion-property-value">
                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                      <select
                        className="notion-select"
                        value={formData.priority}
                        onChange={(e) => handleInputChange('priority', e.target.value)}
                        style={{ paddingLeft: '28px' }}
                      >
                        <option value="low">منخفضة</option>
                        <option value="medium">متوسطة</option>
                        <option value="high">عالية</option>
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', left: '8px', opacity: 0.4, pointerEvents: 'none' }} />
                    </div>
                  </div>
                </div>

                {/* Assigned Lawyer */}
                <div className="notion-property-row">
                  <div className="notion-property-label">
                    <User className="notion-property-icon" />
                    <span>المحامي المسؤول</span>
                  </div>
                  <div className="notion-property-value">
                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                      <select
                        className="notion-select"
                        value={formData.assignedLawyer}
                        onChange={(e) => handleInputChange('assignedLawyer', e.target.value)}
                        style={{ paddingLeft: '28px' }}
                      >
                        <option value="">اختر المحامي</option>
                        {lawyers.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', left: '8px', opacity: 0.4, pointerEvents: 'none' }} />
                    </div>
                    {errors.assignedLawyer && <span style={{ color: '#EB5757', marginLeft: '6px' }}>!</span>}
                  </div>
                </div>

                {/* Court */}
                <div className="notion-property-row">
                  <div className="notion-property-label">
                    <Gavel className="notion-property-icon" />
                    <span>المحكمة</span>
                  </div>
                  <div className="notion-property-value">
                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                      <select
                        className="notion-select"
                        value={formData.court}
                        onChange={(e) => handleInputChange('court', e.target.value)}
                        style={{ paddingLeft: '28px' }}
                      >
                        <option value="">اختر المحكمة</option>
                        {courts.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', left: '8px', opacity: 0.4, pointerEvents: 'none' }} />
                    </div>
                    {errors.court && <span style={{ color: '#EB5757', marginLeft: '6px' }}>!</span>}
                  </div>
                </div>

                {/* Case Type */}
                <div className="notion-property-row">
                  <div className="notion-property-label">
                    <Briefcase className="notion-property-icon" />
                    <span>نوع القضية</span>
                  </div>
                  <div className="notion-property-value">
                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                      <select
                        className="notion-select"
                        value={formData.caseType}
                        onChange={(e) => handleInputChange('caseType', e.target.value)}
                        style={{ paddingLeft: '28px' }}
                      >
                        <option value="">اختر النوع</option>
                        {caseTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', left: '8px', opacity: 0.4, pointerEvents: 'none' }} />
                    </div>
                    {errors.caseType && <span style={{ color: '#EB5757', marginLeft: '6px' }}>!</span>}
                  </div>
                </div>

                {/* Filing Date */}
                <div className="notion-property-row">
                  <div className="notion-property-label">
                    <Calendar className="notion-property-icon" />
                    <span>تاريخ رفع الدعوى</span>
                  </div>
                  <div className="notion-property-value">
                    <input
                      type="date"
                      className="notion-input"
                      value={formData.filingDate}
                      onChange={(e) => handleInputChange('filingDate', e.target.value)}
                    />
                    {errors.filingDate && <span style={{ color: '#EB5757', marginLeft: '6px' }}>!</span>}
                  </div>
                </div>

                {/* Opponent Info */}
                <div className="notion-property-row span-full">
                  <div className="notion-property-label">
                    <Users className="notion-property-icon" />
                    <span>الخصم</span>
                  </div>
                  <div className="notion-property-value" style={{ gap: '8px' }}>
                    <input
                      type="text"
                      className="notion-input"
                      placeholder="اسم الخصم"
                      value={formData.opponentName}
                      onChange={(e) => handleInputChange('opponentName', e.target.value)}
                    />
                    <input
                      type="text"
                      className="notion-input"
                      placeholder="محامي الخصم"
                      value={formData.opponentLawyer}
                      onChange={(e) => handleInputChange('opponentLawyer', e.target.value)}
                    />
                  </div>
                </div>

                <div className="notion-divider"></div>

                {/* Client Section Header/Toggle */}
                <div className="notion-property-row span-full" style={{ padding: '8px 0' }}>
                  <div className="notion-property-label">
                    <UserPlus className="notion-property-icon" />
                    <span>بيانات العميل</span>
                  </div>
                  <div className="notion-property-value">
                    <div className="notion-segmented-control">
                      <button
                        type="button"
                        className={`notion-segment-btn ${formData.isNewClient ? 'active' : ''}`}
                        onClick={() => handleInputChange('isNewClient', true)}
                      >
                        جديد
                      </button>
                      <button
                        type="button"
                        className={`notion-segment-btn ${!formData.isNewClient ? 'active' : ''}`}
                        onClick={() => {
                          handleInputChange('isNewClient', false);
                        }}
                      >
                        موجود
                      </button>
                    </div>
                  </div>
                </div>

                {/* Client Form Fields based on Toggle */}
                {formData.isNewClient ? (
                  <>
                    <div className="notion-property-row">
                      <div className="notion-property-label">
                        <User className="notion-property-icon" size={14} />
                        <span>الاسم</span>
                      </div>
                      <div className="notion-property-value">
                        <input
                          type="text"
                          className="notion-input"
                          placeholder="اسم العميل الكامل"
                          value={formData.clientName}
                          onChange={(e) => handleInputChange('clientName', e.target.value)}
                        />
                        {errors.clientName && <span style={{ color: '#EB5757', marginLeft: '6px' }}>!</span>}
                      </div>
                    </div>
                    <div className="notion-property-row">
                      <div className="notion-property-label">
                        <Phone className="notion-property-icon" size={14} />
                        <span>الهاتف</span>
                      </div>
                      <div className="notion-property-value">
                        <input
                          type="tel"
                          className="notion-input"
                          placeholder="05..."
                          value={formData.clientPhone}
                          onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                        />
                        {errors.clientPhone && <span style={{ color: '#EB5757', marginLeft: '6px' }}>!</span>}
                      </div>
                    </div>
                    <div className="notion-property-row">
                      <div className="notion-property-label">
                        <Mail className="notion-property-icon" size={14} />
                        <span>البريد الإلكتروني</span>
                      </div>
                      <div className="notion-property-value">
                        <input
                          type="email"
                          className="notion-input"
                          placeholder="example@mail.com"
                          value={formData.clientEmail}
                          onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="notion-property-row">
                      <div className="notion-property-label">
                        <CreditCard className="notion-property-icon" size={14} />
                        <span>رقم الهوية</span>
                      </div>
                      <div className="notion-property-value">
                        <input
                          type="text"
                          className="notion-input"
                          placeholder="رقم الهوية الوطنية"
                          value={formData.clientNationalId}
                          onChange={(e) => handleInputChange('clientNationalId', e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="notion-property-row span-full">
                    <div className="notion-property-label">
                      <span>اختر العميل</span>
                    </div>
                    <div className="notion-property-value">
                      <div className="notion-search-container">
                        <div
                          className="notion-input"
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                          onClick={() => setShowClientSearch(!showClientSearch)}
                        >
                          <span style={{ opacity: selectedClient ? 1 : 0.4 }}>
                            {selectedClient ? selectedClient.name : 'ابحث عن عميل...'}
                          </span>
                          <ChevronDown size={14} style={{ opacity: 0.5 }} />
                        </div>

                        {showClientSearch && (
                          <div className="notion-search-dropdown">
                            <div className="notion-search-input-wrapper">
                              <Search size={14} style={{ opacity: 0.4 }} />
                              <input
                                type="text"
                                className="notion-search-field"
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
                                    className={`notion-search-item ${formData.clientId.toString() === client.id.toString() ? 'selected' : ''}`}
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
                                <div className="notion-search-no-results">
                                  لا يوجد نتائج للبحث
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Overlay to close dropdown when clicking outside */}
                        {showClientSearch && (
                          <div
                            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                            onClick={() => setShowClientSearch(false)}
                          />
                        )}
                      </div>
                      {errors.clientId && <span style={{ color: '#EB5757', marginLeft: '6px' }}>!</span>}
                    </div>
                  </div>
                )}

              </div>

              <div className="notion-divider"></div>

              {/* Description (Page Content) */}
              <div className="notion-content-area">
                <div className="notion-section-header">
                  <AlignLeft size={18} />
                  وصف القضية
                </div>
                <textarea
                  className="notion-textarea"
                  placeholder="اكتب تفاصيل القضية هنا، الحقائق، والطلبات..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
                {errors.description && <span style={{ color: '#EB5757', fontSize: '12px' }}>هذا الحقل مطلوب</span>}

                <div className="notion-section-header">
                  <FileText size={18} />
                  ملاحظات إضافية
                </div>
                <textarea
                  className="notion-textarea"
                  style={{ minHeight: '80px' }}
                  placeholder="أي ملاحظات أخرى..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                />
              </div>

            </div>

            {/* Footer Actions */}
            <div className="notion-modal-footer">
              <button type="button" className="notion-btn-secondary" onClick={onClose}>
                إلغاء
              </button>
              <button type="submit" className="notion-btn-primary">
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
