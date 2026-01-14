import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Save,
  Eye,
  FileText,
  Settings,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { contractTemplateService } from '../../services/contractTemplateService';
import ContractTemplateEditor from '../../components/contracts/ContractTemplateEditor';
import ContractVariablesList from '../../components/contracts/ContractVariablesList';
import PaymentTermsEditor from '../../components/contracts/PaymentTermsEditor';
import ContractPreview from '../../components/contracts/ContractPreview';
import type {
  ContractTemplate,
  ContractType,
  ScopeType,
  CreatePaymentTermData,
} from '../../types/contracts';
import '../../styles/contract-builder.css';

const CONTRACT_TYPES: { value: ContractType; label: string }[] = [
  { value: 'representation', label: 'تمثيل قانوني' },
  { value: 'consultation', label: 'استشارة' },
  { value: 'retainer', label: 'اشتراك شهري' },
  { value: 'contingency', label: 'نسبة من الحكم' },
  { value: 'other', label: 'أخرى' },
];

const SCOPE_TYPES: { value: ScopeType; label: string }[] = [
  { value: 'plaintiff', label: 'مدعي' },
  { value: 'defendant', label: 'مدعى عليه' },
  { value: 'both', label: 'كلاهما' },
];

interface FormData {
  name: string;
  name_ar: string;
  type: ContractType;
  scope_type: ScopeType;
  content: string;
  description: string;
  default_vat_rate: number;
  is_active: boolean;
  is_default: boolean;
  default_payment_terms: CreatePaymentTermData[];
}

const ContractTemplateEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  // الحالة
  const [activeTab, setActiveTab] = useState<'content' | 'settings' | 'payments'>('content');
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    name_ar: '',
    type: 'representation',
    scope_type: 'both',
    content: '',
    description: '',
    default_vat_rate: 15,
    is_active: true,
    is_default: false,
    default_payment_terms: [],
  });

  // جلب القالب للتعديل
  const { data: templateData, isLoading } = useQuery({
    queryKey: ['contractTemplate', id],
    queryFn: () => contractTemplateService.getTemplate(Number(id)),
    enabled: isEditing,
  });

  // تحديث النموذج عند جلب البيانات
  useEffect(() => {
    if (templateData?.data) {
      const template = templateData.data;
      setFormData({
        name: template.name,
        name_ar: template.name_ar || '',
        type: template.type,
        scope_type: template.scope_type,
        content: template.content,
        description: template.description || '',
        default_vat_rate: template.default_vat_rate,
        is_active: template.is_active,
        is_default: template.is_default,
        default_payment_terms: template.default_payment_terms || [],
      });
    }
  }, [templateData]);

  // إنشاء قالب
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => contractTemplateService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractTemplates'] });
      navigate('/contract-templates');
    },
  });

  // تحديث قالب
  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      contractTemplateService.updateTemplate(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['contractTemplate', id] });
      navigate('/contract-templates');
    },
  });

  // حفظ القالب
  const handleSave = () => {
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  // إدراج متغير
  const handleInsertVariable = (variable: string) => {
    // يتم التعامل معه في المحرر
    console.log('Insert variable:', variable);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="loading-page">
        <Loader2 className="spinner" size={32} />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="contract-builder-page" style={{ direction: 'rtl' }}>
      {/* الهيدر */}
      <div className="builder-header">
        <div className="header-right">
          <button className="back-btn" onClick={() => navigate('/contract-templates')}>
            <ArrowRight size={20} />
          </button>
          <div>
            <h1>{isEditing ? 'تعديل القالب' : 'قالب جديد'}</h1>
            {formData.name && <p className="template-name">{formData.name}</p>}
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn-secondary"
            onClick={() => setShowPreview(true)}
            disabled={!formData.content}
          >
            <Eye size={18} />
            معاينة
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={isSaving || !formData.name || !formData.content}
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="spinner" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save size={18} />
                حفظ القالب
              </>
            )}
          </button>
        </div>
      </div>

      {/* التبويبات */}
      <div className="builder-tabs">
        <button
          className={`tab ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          <FileText size={18} />
          محتوى العقد
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={18} />
          الإعدادات
        </button>
        <button
          className={`tab ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard size={18} />
          شروط الدفع
        </button>
      </div>

      {/* المحتوى */}
      <div className="builder-content">
        {/* تبويب المحتوى */}
        {activeTab === 'content' && (
          <div className="content-tab">
            <div className="editor-section">
              <ContractTemplateEditor
                content={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
                onPreview={() => setShowPreview(true)}
              />
            </div>
            <div className="variables-section">
              <ContractVariablesList
                onInsertVariable={handleInsertVariable}
                usedVariables={[]}
              />
            </div>
          </div>
        )}

        {/* تبويب الإعدادات */}
        {activeTab === 'settings' && (
          <motion.div
            className="settings-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="settings-grid">
              {/* اسم القالب */}
              <div className="form-group">
                <label>اسم القالب <span className="required">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: عقد خدمات قانونية - تمثيل"
                />
              </div>

              {/* الاسم بالعربي */}
              <div className="form-group">
                <label>الاسم بالعربي</label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="اسم القالب بالعربي"
                />
              </div>

              {/* نوع العقد */}
              <div className="form-group">
                <label>نوع العقد <span className="required">*</span></label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ContractType })}
                >
                  {CONTRACT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* نطاق العمل */}
              <div className="form-group">
                <label>نطاق العمل <span className="required">*</span></label>
                <select
                  value={formData.scope_type}
                  onChange={(e) => setFormData({ ...formData, scope_type: e.target.value as ScopeType })}
                >
                  {SCOPE_TYPES.map(scope => (
                    <option key={scope.value} value={scope.value}>{scope.label}</option>
                  ))}
                </select>
              </div>

              {/* نسبة الضريبة */}
              <div className="form-group">
                <label>نسبة ضريبة القيمة المضافة (%)</label>
                <input
                  type="number"
                  value={formData.default_vat_rate}
                  onChange={(e) => setFormData({ ...formData, default_vat_rate: parseFloat(e.target.value) || 0 })}
                  min={0}
                  max={100}
                  step={0.1}
                />
              </div>

              {/* الوصف */}
              <div className="form-group full-width">
                <label>وصف القالب</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف مختصر للقالب..."
                  rows={3}
                />
              </div>

              {/* الخيارات */}
              <div className="form-group full-width">
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <span>قالب نشط</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_default}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    />
                    <span>قالب افتراضي</span>
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* تبويب شروط الدفع */}
        {activeTab === 'payments' && (
          <motion.div
            className="payments-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="payments-header">
              <h3>شروط الدفع الافتراضية</h3>
              <p>حدد شروط الدفع التي ستُضاف تلقائياً عند إنشاء عقد من هذا القالب</p>
            </div>
            <PaymentTermsEditor
              terms={formData.default_payment_terms}
              onChange={(terms) => setFormData({ ...formData, default_payment_terms: terms })}
              totalAmount={10000} // مبلغ افتراضي للحساب
              vatRate={formData.default_vat_rate}
            />
          </motion.div>
        )}
      </div>

      {/* معاينة */}
      {showPreview && (
        <ContractPreview
          content={formData.content}
          variables={{}}
          contractTitle={formData.name}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

export default ContractTemplateEditorPage;
