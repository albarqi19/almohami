import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  User,
  FileText,
  CreditCard,
  Eye,
  Save,
  Loader2,
  Search,
  Briefcase,
  Building,
  Phone,
  Mail,
  MapPin,
  IdCard,
  Scale,
  Percent,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { contractTemplateService } from '../../services/contractTemplateService';
import { contractService } from '../../services/contractService';
import ContractTemplateEditor from '../../components/contracts/ContractTemplateEditor';
import ContractVariablesList from '../../components/contracts/ContractVariablesList';
import PaymentTermsEditor from '../../components/contracts/PaymentTermsEditor';
import ContractPreview from '../../components/contracts/ContractPreview';
import { useContractVariables } from '../../hooks/useContractVariables';
import { apiClient } from '../../utils/api';
import type {
  ContractTemplate,
  CreatePaymentTermData,
  ScopeType,
  ContractType,
} from '../../types/contracts';
import '../../styles/contract-builder.css';

interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  national_id?: string;
  address?: string;
  nationality?: string;
}

interface Case {
  id: number;
  file_number: string;
  title: string;
  court_name?: string;
  case_number?: string;
}

interface TenantInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  license_number?: string;
  commercial_reg?: string;
  iban?: string;
  bank_name?: string;
  manager_name?: string;
  manager_id?: string;
}

// دالة تحويل التاريخ الميلادي إلى هجري
const toHijri = (date: Date): string => {
  try {
    return date.toLocaleDateString('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    // Fallback بسيط إذا فشل التحويل
    return date.toLocaleDateString('ar-SA');
  }
};

const STEPS = [
  { id: 1, title: 'اختيار العميل', icon: User },
  { id: 2, title: 'اختيار القالب', icon: FileText },
  { id: 3, title: 'شروط الدفع', icon: CreditCard },
  { id: 4, title: 'المعاينة والحفظ', icon: Eye },
];

// دوال مساعدة لأنواع القوالب
const getTypeIcon = (type: ContractType) => {
  switch (type) {
    case 'representation':
      return <Scale size={16} />;
    case 'consultation':
      return <Briefcase size={16} />;
    case 'contingency':
      return <Percent size={16} />;
    default:
      return <FileText size={16} />;
  }
};

const getTypeColor = (type: ContractType) => {
  switch (type) {
    case 'representation':
      return { bg: '#dbeafe', text: '#1d4ed8' };
    case 'consultation':
      return { bg: '#fef3c7', text: '#d97706' };
    case 'contingency':
      return { bg: '#d1fae5', text: '#059669' };
    case 'retainer':
      return { bg: '#ede9fe', text: '#7c3aed' };
    default:
      return { bg: '#f3f4f6', text: '#6b7280' };
  }
};

const getTypeName = (type: ContractType) => {
  switch (type) {
    case 'representation':
      return 'تمثيل قانوني';
    case 'consultation':
      return 'استشارة';
    case 'retainer':
      return 'اشتراك شهري';
    case 'contingency':
      return 'نسبة من الحكم';
    default:
      return 'أخرى';
  }
};

const getScopeName = (scope: ScopeType) => {
  switch (scope) {
    case 'plaintiff':
      return 'مدعي';
    case 'defendant':
      return 'مدعى عليه';
    case 'both':
      return 'كلاهما';
    default:
      return scope;
  }
};

const ContractBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { replaceVariables } = useContractVariables();

  // الحالة
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);

  // بيانات النموذج
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [contractContent, setContractContent] = useState('');
  const [contractTitle, setContractTitle] = useState('');
  const [scopeType, setScopeType] = useState<ScopeType>('both');
  const [vatRate, setVatRate] = useState(15);
  const [paymentTerms, setPaymentTerms] = useState<CreatePaymentTermData[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [notes, setNotes] = useState('');

  // البحث
  const [clientSearch, setClientSearch] = useState('');
  const [caseSearch, setCaseSearch] = useState('');

  // هل تم التحميل من صفحة القضية؟
  const [isFromCase, setIsFromCase] = useState(false);
  const [isLoadingCaseData, setIsLoadingCaseData] = useState(false);

  // جلب العملاء
  const { data: clientsData } = useQuery({
    queryKey: ['clients', clientSearch],
    queryFn: () => apiClient.get<{ data: Client[] }>(`/users?role=client&search=${clientSearch}`),
    enabled: currentStep === 1,
  });

  // جلب القضايا
  const { data: casesData } = useQuery({
    queryKey: ['cases', selectedClient?.id, caseSearch],
    queryFn: () => apiClient.get<{ data: Case[] }>(`/cases?client_id=${selectedClient?.id}&search=${caseSearch}`),
    enabled: currentStep === 1 && !!selectedClient,
  });

  // جلب القوالب
  const { data: templatesData } = useQuery({
    queryKey: ['contractTemplates', { is_active: true }],
    queryFn: () => contractTemplateService.getTemplates({ is_active: true }),
    enabled: currentStep === 2,
  });

  // جلب بيانات المكتب
  const { data: tenantData } = useQuery({
    queryKey: ['tenant'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: { tenant: TenantInfo } }>('/tenant');
      return response.data?.tenant;
    },
  });

  // تحميل القالب من URL
  useEffect(() => {
    const templateId = searchParams.get('template');
    if (templateId && currentStep === 2) {
      contractTemplateService.getTemplate(Number(templateId)).then((res) => {
        if (res.data) {
          handleSelectTemplate(res.data);
        }
      });
    }
  }, [searchParams, currentStep]);

  // تحميل القضية والعميل من URL (عند الضغط على "إنشاء عقد" من صفحة القضية)
  useEffect(() => {
    const caseId = searchParams.get('case_id');
    if (caseId && !selectedCase && !isLoadingCaseData) {
      setIsLoadingCaseData(true);
      setIsFromCase(true);
      // جلب بيانات القضية
      apiClient.get<{ success: boolean; data: any }>(`/cases/${caseId}`).then((response) => {
        if (response.success && response.data) {
          const caseData = response.data;
          // تعيين القضية
          setSelectedCase({
            id: caseData.id,
            file_number: caseData.file_number,
            title: caseData.title,
            court_name: caseData.court,
            case_number: caseData.file_number,
          });
          // تعيين العميل
          if (caseData.client) {
            setSelectedClient({
              id: caseData.client.id,
              name: caseData.client.name,
              email: caseData.client.email,
              phone: caseData.client.phone,
              national_id: caseData.client.national_id,
              address: caseData.client.address,
            });
          } else if (caseData.client_id) {
            // جلب بيانات العميل إذا لم تكن موجودة
            apiClient.get<{ data: Client }>(`/users/${caseData.client_id}`).then((clientRes) => {
              if (clientRes.data) {
                setSelectedClient(clientRes.data);
              }
            });
          }
        }
        setIsLoadingCaseData(false);
      }).catch(() => {
        setIsLoadingCaseData(false);
        setIsFromCase(false);
      });
    }
  }, [searchParams]);

  // اختيار قالب
  const handleSelectTemplate = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setContractContent(template.content);
    setContractTitle(template.name);
    setScopeType(template.scope_type);
    setVatRate(template.default_vat_rate);
    if (template.default_payment_terms) {
      setPaymentTerms(template.default_payment_terms);
    }
  };

  // حساب المتغيرات
  const getVariableValues = (): Record<string, string> => {
    const values: Record<string, string> = {};

    // بيانات العميل
    if (selectedClient) {
      values.client_name = selectedClient.name;
      values.client_national_id = selectedClient.national_id || '';
      values.client_phone = selectedClient.phone || '';
      values.client_email = selectedClient.email || '';
      values.client_address = selectedClient.address || '';
      values.client_nationality = selectedClient.nationality || 'سعودي';
    }

    // بيانات القضية
    if (selectedCase) {
      values.case_number = selectedCase.case_number || selectedCase.file_number;
      values.court_name = selectedCase.court_name || '';
    }

    // بيانات مالية
    values.total_amount = totalAmount.toString();
    values.vat_rate = vatRate.toString();
    values.scope_type = scopeType === 'plaintiff' ? 'مدعي' :
      scopeType === 'defendant' ? 'مدعى عليه' : 'مدعي/مدعى عليه';

    // التاريخ (ميلادي وهجري)
    const now = new Date();
    values.contract_date = now.toLocaleDateString('ar-SA');
    values.contract_date_hijri = toHijri(now);
    values.day_name = now.toLocaleDateString('ar-SA', { weekday: 'long' });

    // بيانات المكتب
    if (tenantData) {
      values.firm_name = tenantData.name || '';
      values.firm_cr = tenantData.commercial_reg || '';
      values.firm_license = tenantData.license_number || '';
      values.firm_address = tenantData.address || '';
      values.firm_phone = tenantData.phone || '';
      values.firm_email = tenantData.email || '';
      values.firm_iban = tenantData.iban || '';
      values.firm_bank = tenantData.bank_name || '';
      values.manager_name = tenantData.manager_name || '';
      values.manager_id = tenantData.manager_id || '';
    }

    // حساب الدفعات
    paymentTerms.forEach((term, index) => {
      const amount = term.amount_type === 'fixed'
        ? term.amount || 0
        : (totalAmount * (term.percentage || 0)) / 100;
      if (index === 0) values.first_payment = amount.toString();
      if (index === 1) values.second_payment = amount.toString();
    });

    return values;
  };

  // إنشاء العقد
  const createMutation = useMutation({
    mutationFn: () => contractService.createContract({
      template_id: selectedTemplate?.id,
      client_id: selectedClient!.id,
      case_id: selectedCase?.id,
      title: contractTitle, // إضافة العنوان المطلوب
      content: contractContent,
      // تحويل 'both' إلى 'plaintiff' لأن الباك إند لا يقبل 'both'
      scope_type: scopeType === 'both' ? 'plaintiff' : scopeType,
      total_amount: totalAmount,
      vat_rate: vatRate,
      notes,
      first_party: {
        party_type: 'first',
        entity_type: 'company',
        name: tenantData?.name || 'مكتب المحاماة',
        commercial_reg: tenantData?.commercial_reg,
        phone: tenantData?.phone,
        email: tenantData?.email,
        address: tenantData?.address,
      },
      second_party: {
        party_type: 'second',
        entity_type: 'individual',
        name: selectedClient?.name || '',
        national_id: selectedClient?.national_id,
        phone: selectedClient?.phone,
        email: selectedClient?.email,
        address: selectedClient?.address,
        nationality: selectedClient?.nationality,
      },
      payment_terms: paymentTerms,
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      navigate(`/contracts/${res.data.id}`);
    },
  });

  // التنقل بين الخطوات
  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return !!selectedClient;
      case 2:
        return !!selectedTemplate && !!contractContent;
      case 3:
        return paymentTerms.length > 0 && totalAmount > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (canGoNext() && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // استخراج البيانات من الاستجابة - التعامل مع بنية pagination
  const clients: Client[] = Array.isArray(clientsData?.data)
    ? clientsData.data
    : ((clientsData?.data as unknown as { data: Client[] })?.data || []);
  const cases: Case[] = Array.isArray(casesData?.data)
    ? casesData.data
    : ((casesData?.data as unknown as { data: Case[] })?.data || []);
  const templates: ContractTemplate[] = templatesData?.data?.data || [];

  return (
    <div className="contract-builder-page" style={{ direction: 'rtl' }}>
      {/* الهيدر */}
      <div className="builder-header">
        <div className="header-right">
          <button className="back-btn" onClick={() => navigate('/contracts')}>
            <ArrowRight size={20} />
          </button>
          <div>
            <h1>إنشاء عقد جديد</h1>
            <p>الخطوة {currentStep} من 4</p>
          </div>
        </div>
      </div>

      {/* مؤشر الخطوات */}
      <div className="steps-indicator">
        {STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <div
              className={`step ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
              onClick={() => currentStep > step.id && setCurrentStep(step.id)}
            >
              <div className="step-icon">
                {currentStep > step.id ? <Check size={18} /> : <step.icon size={18} />}
              </div>
              <span className="step-title">{step.title}</span>
            </div>
            {index < STEPS.length - 1 && <div className="step-connector" />}
          </React.Fragment>
        ))}
      </div>

      {/* محتوى الخطوات */}
      <div className="builder-content">
        <AnimatePresence mode="wait">
          {/* الخطوة 1: اختيار العميل */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              className="step-content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* عرض مختصر عند القدوم من صفحة القضية */}
              {isFromCase && selectedClient && selectedCase ? (
                <div className="from-case-summary">
                  <div className="from-case-header">
                    <Check size={24} className="success-icon" />
                    <h3>تم تحديد العميل والقضية</h3>
                  </div>

                  <div className="from-case-details">
                    <div className="from-case-item">
                      <div className="from-case-item__icon">
                        <User size={20} />
                      </div>
                      <div className="from-case-item__content">
                        <span className="from-case-item__label">العميل</span>
                        <span className="from-case-item__value">{selectedClient.name}</span>
                        {selectedClient.phone && (
                          <span className="from-case-item__sub">{selectedClient.phone}</span>
                        )}
                      </div>
                    </div>

                    <div className="from-case-item">
                      <div className="from-case-item__icon">
                        <Briefcase size={20} />
                      </div>
                      <div className="from-case-item__content">
                        <span className="from-case-item__label">القضية</span>
                        <span className="from-case-item__value">{selectedCase.file_number}</span>
                        <span className="from-case-item__sub">{selectedCase.title}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="change-selection-btn"
                    onClick={() => setIsFromCase(false)}
                  >
                    تغيير الاختيار
                  </button>
                </div>
              ) : isLoadingCaseData ? (
                <div className="loading-case-data">
                  <Loader2 size={32} className="spinner" />
                  <p>جاري تحميل بيانات القضية...</p>
                </div>
              ) : (
                <>
                  <div className="step-section">
                    <h3>
                      <User size={20} />
                      اختيار العميل
                    </h3>

                    <div className="search-input">
                      <Search size={18} />
                      <input
                        type="text"
                        placeholder="ابحث عن عميل..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                      />
                    </div>

                    <div className="selection-grid">
                      {clients.map((client: Client) => (
                        <div
                          key={client.id}
                          className={`selection-card ${selectedClient?.id === client.id ? 'selected' : ''}`}
                          onClick={() => setSelectedClient(client)}
                        >
                          <div className="card-icon">
                            <User size={24} />
                          </div>
                          <div className="card-info">
                            <h4>{client.name}</h4>
                            {client.phone && (
                              <p><Phone size={12} /> {client.phone}</p>
                            )}
                            {client.email && (
                              <p><Mail size={12} /> {client.email}</p>
                            )}
                          </div>
                          {selectedClient?.id === client.id && (
                            <div className="selected-badge">
                              <Check size={16} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* اختيار القضية (اختياري) */}
                  {selectedClient && (
                    <div className="step-section">
                      <h3>
                        <Briefcase size={20} />
                        ربط بقضية (اختياري)
                      </h3>

                      <div className="search-input">
                        <Search size={18} />
                        <input
                          type="text"
                          placeholder="ابحث عن قضية..."
                          value={caseSearch}
                          onChange={(e) => setCaseSearch(e.target.value)}
                        />
                      </div>

                      <div className="selection-grid">
                        <div
                          className={`selection-card ${!selectedCase ? 'selected' : ''}`}
                          onClick={() => setSelectedCase(null)}
                        >
                          <div className="card-info">
                            <h4>بدون قضية</h4>
                            <p>عقد مستقل غير مرتبط بقضية</p>
                          </div>
                        </div>

                        {cases.map((caseItem: Case) => (
                          <div
                            key={caseItem.id}
                            className={`selection-card ${selectedCase?.id === caseItem.id ? 'selected' : ''}`}
                            onClick={() => setSelectedCase(caseItem)}
                          >
                            <div className="card-icon">
                              <Briefcase size={24} />
                            </div>
                            <div className="card-info">
                              <h4>{caseItem.file_number}</h4>
                              <p>{caseItem.title}</p>
                              {caseItem.court_name && (
                                <p className="court">{caseItem.court_name}</p>
                              )}
                            </div>
                            {selectedCase?.id === caseItem.id && (
                              <div className="selected-badge">
                                <Check size={16} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ملخص العميل المختار */}
                  {selectedClient && (
                    <div className="selection-summary">
                      <h4>العميل المختار:</h4>
                      <div className="summary-content">
                        <p><strong>{selectedClient.name}</strong></p>
                        {selectedClient.national_id && <p>الهوية: {selectedClient.national_id}</p>}
                        {selectedCase && <p>القضية: {selectedCase.file_number}</p>}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* الخطوة 2: اختيار القالب */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              className="step-content template-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {!selectedTemplate ? (
                <div className="template-selection">
                  <h3>
                    <FileText size={20} />
                    اختيار قالب العقد
                  </h3>
                  <div className="templates-grid">
                    {templates.map((template: ContractTemplate) => {
                      const typeColor = getTypeColor(template.type);
                      return (
                        <motion.div
                          key={template.id}
                          className="template-card-enhanced"
                          onClick={() => handleSelectTemplate(template)}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)' }}
                        >
                          {/* شارة القالب الافتراضي */}
                          {template.is_default && (
                            <div className="default-badge">افتراضي</div>
                          )}

                          {/* محتوى البطاقة */}
                          <div className="card-content">
                            {/* الهيدر مع النوع والحالة */}
                            <div className="card-header">
                              <div
                                className="type-badge"
                                style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
                              >
                                {getTypeIcon(template.type)}
                                <span>{getTypeName(template.type)}</span>
                              </div>
                              <div className={`status-dot ${template.is_active ? 'active' : 'inactive'}`}>
                                {template.is_active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                              </div>
                            </div>

                            {/* اسم القالب */}
                            <h3 className="template-name">{template.name}</h3>
                            {template.name_ar && template.name_ar !== template.name && (
                              <p className="template-name-ar">{template.name_ar}</p>
                            )}

                            {/* الوصف */}
                            {template.description && (
                              <p className="template-description">{template.description}</p>
                            )}

                            {/* المعلومات */}
                            <div className="template-info">
                              <div className="info-item">
                                <span className="label">النطاق:</span>
                                <span className="value">{getScopeName(template.scope_type)}</span>
                              </div>
                              <div className="info-item">
                                <span className="label">الضريبة:</span>
                                <span className="value">{template.default_vat_rate}%</span>
                              </div>
                              {template.usage_count !== undefined && template.usage_count > 0 && (
                                <div className="info-item">
                                  <span className="label">الاستخدام:</span>
                                  <span className="value">{template.usage_count} عقد</span>
                                </div>
                              )}
                            </div>

                            {/* شروط الدفع الافتراضية */}
                            {template.default_payment_terms && template.default_payment_terms.length > 0 && (
                              <div className="payment-terms-preview">
                                <span className="terms-label">شروط الدفع:</span>
                                <span className="terms-count">
                                  {template.default_payment_terms.length} شرط
                                </span>
                              </div>
                            )}
                          </div>

                          {/* زر الاختيار */}
                          <div className="card-actions">
                            <button className="action-btn select-btn">
                              <Check size={16} />
                              اختيار هذا القالب
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="template-editor-section">
                  <div className="editor-header">
                    <h3>تعديل محتوى العقد</h3>
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => setSelectedTemplate(null)}
                    >
                      تغيير القالب
                    </button>
                  </div>

                  <div className="form-group">
                    <label>عنوان العقد</label>
                    <input
                      type="text"
                      value={contractTitle}
                      onChange={(e) => setContractTitle(e.target.value)}
                    />
                  </div>

                  <div className="editor-layout">
                    <div className="editor-main">
                      <ContractTemplateEditor
                        content={contractContent}
                        onChange={setContractContent}
                        onPreview={() => setShowPreview(true)}
                      />
                    </div>
                    <div className="editor-sidebar">
                      <ContractVariablesList
                        onInsertVariable={() => { }}
                        usedVariables={[]}
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* الخطوة 3: شروط الدفع */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              className="step-content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="step-section">
                <h3>
                  <CreditCard size={20} />
                  المعلومات المالية
                </h3>

                <div className="financial-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>المبلغ الإجمالي (قبل الضريبة)</label>
                      <input
                        type="number"
                        value={totalAmount || ''}
                        onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="form-group">
                      <label>نسبة الضريبة (%)</label>
                      <input
                        type="number"
                        value={vatRate}
                        onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="form-group">
                      <label>صفة العميل</label>
                      <select
                        value={scopeType}
                        onChange={(e) => setScopeType(e.target.value as ScopeType)}
                      >
                        <option value="plaintiff">مدعي</option>
                        <option value="defendant">مدعى عليه</option>
                        <option value="both">كلاهما</option>
                      </select>
                    </div>
                  </div>

                  {/* ملخص مالي */}
                  <div className="financial-summary">
                    <div className="summary-row">
                      <span>المبلغ الأساسي:</span>
                      <span>{totalAmount.toLocaleString('ar-SA')} ر.س</span>
                    </div>
                    <div className="summary-row">
                      <span>الضريبة ({vatRate}%):</span>
                      <span>{(totalAmount * vatRate / 100).toLocaleString('ar-SA')} ر.س</span>
                    </div>
                    <div className="summary-row total">
                      <span>الإجمالي:</span>
                      <span>{(totalAmount * (1 + vatRate / 100)).toLocaleString('ar-SA')} ر.س</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="step-section">
                <h3>شروط الدفع</h3>
                <PaymentTermsEditor
                  terms={paymentTerms}
                  onChange={setPaymentTerms}
                  totalAmount={totalAmount}
                  vatRate={vatRate}
                />
              </div>
            </motion.div>
          )}

          {/* الخطوة 4: المعاينة والحفظ */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              className="step-content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="final-review">
                <h3>
                  <Eye size={20} />
                  مراجعة العقد
                </h3>

                {/* ملخص العقد */}
                <div className="review-sections">
                  <div className="review-section">
                    <h4>معلومات العقد</h4>
                    <div className="review-item">
                      <span className="label">العنوان:</span>
                      <span className="value">{contractTitle}</span>
                    </div>
                    <div className="review-item">
                      <span className="label">القالب:</span>
                      <span className="value">{selectedTemplate?.name}</span>
                    </div>
                  </div>

                  <div className="review-section">
                    <h4>العميل</h4>
                    <div className="review-item">
                      <span className="label">الاسم:</span>
                      <span className="value">{selectedClient?.name}</span>
                    </div>
                    {selectedCase && (
                      <div className="review-item">
                        <span className="label">القضية:</span>
                        <span className="value">{selectedCase.file_number} - {selectedCase.title}</span>
                      </div>
                    )}
                  </div>

                  <div className="review-section">
                    <h4>المعلومات المالية</h4>
                    <div className="review-item">
                      <span className="label">المبلغ الأساسي:</span>
                      <span className="value">{totalAmount.toLocaleString('ar-SA')} ر.س</span>
                    </div>
                    <div className="review-item">
                      <span className="label">الضريبة:</span>
                      <span className="value">{(totalAmount * vatRate / 100).toLocaleString('ar-SA')} ر.س</span>
                    </div>
                    <div className="review-item total">
                      <span className="label">الإجمالي:</span>
                      <span className="value">{(totalAmount * (1 + vatRate / 100)).toLocaleString('ar-SA')} ر.س</span>
                    </div>
                  </div>

                  <div className="review-section">
                    <h4>شروط الدفع ({paymentTerms.length})</h4>
                    {paymentTerms.map((term, index) => (
                      <div key={index} className="payment-term-review">
                        <span className="term-name">{term.name}</span>
                        <span className="term-amount">
                          {term.amount_type === 'fixed'
                            ? `${term.amount?.toLocaleString('ar-SA')} ر.س`
                            : `${term.percentage}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ملاحظات */}
                <div className="form-group">
                  <label>ملاحظات (اختياري)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي ملاحظات إضافية على العقد..."
                    rows={3}
                  />
                </div>

                {/* أزرار المعاينة والحفظ */}
                <div className="final-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => setShowPreview(true)}
                  >
                    <Eye size={18} />
                    معاينة العقد
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 size={18} className="spinner" />
                        جاري الإنشاء...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        إنشاء العقد
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* أزرار التنقل */}
      <div className="builder-navigation">
        <button
          className="btn-secondary"
          onClick={goBack}
          disabled={currentStep === 1}
        >
          <ArrowRight size={18} />
          السابق
        </button>

        {currentStep < 4 ? (
          <button
            className="btn-primary"
            onClick={goNext}
            disabled={!canGoNext()}
          >
            التالي
            <ArrowLeft size={18} />
          </button>
        ) : null}
      </div>

      {/* معاينة العقد */}
      {showPreview && (
        <ContractPreview
          content={replaceVariables(contractContent, getVariableValues())}
          variables={getVariableValues()}
          contractTitle={contractTitle}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

export default ContractBuilder;
