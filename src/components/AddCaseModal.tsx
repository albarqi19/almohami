import React, { useState } from 'react';
import Modal from './Modal';
import { Save, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface User {
  id: string;
  name: string;
  email: string;
}

interface CaseFormData {
  caseNumber: string;
  clientName: string;
  clientId: string;
  clientPhone: string;
  clientEmail: string;
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

  // استخدام البيانات من props أو fallback للبيانات الثابتة
  const lawyers = lawyersFromProps.length > 0 
    ? lawyersFromProps.map(lawyer => ({ value: lawyer.id, label: lawyer.name }))
    : [
        { value: '1', label: 'أحمد محامي' },
        { value: '2', label: 'سارة محامية' }, 
        { value: '3', label: 'محمد محامي' },
        { value: '4', label: 'خالد محامية' },
        { value: '5', label: 'عبدالله محامي' }
      ];

  // قائمة العملاء
  const clientsList = clientsFromProps.length > 0 
    ? clientsFromProps.map(client => ({ value: client.id, label: client.name }))
    : [];

  const handleInputChange = (field: keyof CaseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CaseFormData> = {};

    if (!formData.caseNumber.trim()) newErrors.caseNumber = 'رقم الملف مطلوب';
    if (!formData.clientId.trim()) newErrors.clientId = 'العميل مطلوب';
    if (!formData.caseType) newErrors.caseType = 'نوع القضية مطلوب';
    if (!formData.court) newErrors.court = 'المحكمة مطلوبة';
    if (!formData.assignedLawyer) newErrors.assignedLawyer = 'المحامي المسؤول مطلوب';
    if (!formData.description.trim()) newErrors.description = 'وصف القضية مطلوب';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    
    if (validateForm()) {
      console.log('Form validation passed, calling onSave...');
      onSave(formData);
      handleReset();
      onClose();
    } else {
      console.log('Form validation failed:', errors);
    }
  };

  const handleReset = () => {
    setFormData({
      caseNumber: '',
      clientName: '',
      clientId: '',
      clientPhone: '',
      clientEmail: '',
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

  const formSections = [
    {
      title: 'بيانات القضية الأساسية',
      fields: [
        { name: 'caseNumber', label: 'رقم الملف', type: 'text', required: true },
        { name: 'caseType', label: 'نوع القضية', type: 'select', options: caseTypes, required: true },
        { name: 'caseCategory', label: 'تصنيف القضية', type: 'text' },
        { name: 'court', label: 'المحكمة', type: 'select', options: courts, required: true },
        { name: 'priority', label: 'الأولوية', type: 'select', options: [
          { value: 'low', label: 'منخفضة' },
          { value: 'medium', label: 'متوسطة' },
          { value: 'high', label: 'عالية' }
        ], required: true },
        { name: 'status', label: 'الحالة', type: 'select', options: [
          { value: 'active', label: 'نشطة' },
          { value: 'pending', label: 'معلقة' },
          { value: 'closed', label: 'مغلقة' },
          { value: 'appealed', label: 'مستأنفة' },
          { value: 'settled', label: 'مسوية' },
          { value: 'dismissed', label: 'مرفوضة' }
        ], required: true }
      ]
    },
    {
      title: 'بيانات العميل',
      fields: [
        ...(clientsFromProps.length > 0 
          ? [{ name: 'clientId', label: 'اختر العميل', type: 'select', options: clientsList, required: true }]
          : [
              { name: 'clientName', label: 'اسم العميل', type: 'text', required: true },
              { name: 'clientId', label: 'رقم الهوية', type: 'text', required: true }
            ]
        ),
        { name: 'clientPhone', label: 'رقم الهاتف', type: 'tel' },
        { name: 'clientEmail', label: 'البريد الإلكتروني', type: 'email' }
      ]
    },
    {
      title: 'بيانات الخصم',
      fields: [
        { name: 'opponentName', label: 'اسم الخصم', type: 'text' },
        { name: 'opponentLawyer', label: 'محامي الخصم', type: 'text' }
      ]
    },
    {
      title: 'التفاصيل الإضافية',
      fields: [
        { name: 'assignedLawyer', label: 'المحامي المسؤول', type: 'select', options: lawyers, required: true },
        { name: 'contractValue', label: 'قيمة العقد/النزاع', type: 'text' },
        { name: 'filingDate', label: 'تاريخ رفع الدعوى', type: 'date' },
        { name: 'hearingDate', label: 'تاريخ الجلسة القادمة', type: 'date' }
      ]
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة قضية جديدة" size="lg">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {formSections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.1 }}
              style={{
                padding: '24px',
                backgroundColor: 'var(--color-background)',
                borderRadius: '12px',
                border: '1px solid var(--color-border)'
              }}
            >
              <h3 style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '4px',
                  height: '20px',
                  backgroundColor: 'var(--color-primary)',
                  borderRadius: '2px'
                }} />
                {section.title}
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px'
              }}>
                {section.fields.map((field) => (
                  <div key={field.name} style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text)',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {field.label}
                      {field.required && (
                        <span style={{ color: 'var(--color-error)' }}>*</span>
                      )}
                    </label>

                    {field.type === 'select' ? (
                      <select
                        value={formData[field.name as keyof CaseFormData] as string}
                        onChange={(e) => handleInputChange(field.name as keyof CaseFormData, e.target.value)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: `1px solid ${errors[field.name as keyof CaseFormData] ? 'var(--color-error)' : 'var(--color-border)'}`,
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-text)',
                          fontSize: 'var(--font-size-sm)',
                          transition: 'border-color 0.2s ease',
                          outline: 'none'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-primary)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = errors[field.name as keyof CaseFormData] ? 'var(--color-error)' : 'var(--color-border)';
                        }}
                      >
                        <option value="">اختر {field.label}</option>
                        {(field.options as any[])?.map((option) => (
                          <option
                            key={typeof option === 'string' ? option : option.value}
                            value={typeof option === 'string' ? option : option.value}
                          >
                            {typeof option === 'string' ? option : option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={formData[field.name as keyof CaseFormData] as string}
                        onChange={(e) => handleInputChange(field.name as keyof CaseFormData, e.target.value)}
                        rows={4}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: `1px solid ${errors[field.name as keyof CaseFormData] ? 'var(--color-error)' : 'var(--color-border)'}`,
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-text)',
                          fontSize: 'var(--font-size-sm)',
                          transition: 'border-color 0.2s ease',
                          outline: 'none',
                          resize: 'vertical',
                          minHeight: '100px'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-primary)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = errors[field.name as keyof CaseFormData] ? 'var(--color-error)' : 'var(--color-border)';
                        }}
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={formData[field.name as keyof CaseFormData] as string}
                        onChange={(e) => handleInputChange(field.name as keyof CaseFormData, e.target.value)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: `1px solid ${errors[field.name as keyof CaseFormData] ? 'var(--color-error)' : 'var(--color-border)'}`,
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-text)',
                          fontSize: 'var(--font-size-sm)',
                          transition: 'border-color 0.2s ease',
                          outline: 'none'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-primary)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = errors[field.name as keyof CaseFormData] ? 'var(--color-error)' : 'var(--color-border)';
                        }}
                      />
                    )}

                    {errors[field.name as keyof CaseFormData] && (
                      <span style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-error)',
                        marginTop: '4px'
                      }}>
                        {errors[field.name as keyof CaseFormData]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Description and Notes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              padding: '24px',
              backgroundColor: 'var(--color-background)',
              borderRadius: '12px',
              border: '1px solid var(--color-border)'
            }}
          >
            <h3 style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '4px',
                height: '20px',
                backgroundColor: 'var(--color-primary)',
                borderRadius: '2px'
              }} />
              وصف القضية والملاحظات
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  وصف القضية <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  placeholder="اكتب وصفاً مفصلاً للقضية..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.description ? 'var(--color-error)' : 'var(--color-border)'}`,
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontSize: 'var(--font-size-sm)',
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    resize: 'vertical',
                    minHeight: '120px'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors.description ? 'var(--color-error)' : 'var(--color-border)';
                  }}
                />
                {errors.description && (
                  <span style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-error)',
                    marginTop: '4px',
                    display: 'block'
                  }}>
                    {errors.description}
                  </span>
                )}
              </div>

              <div>
                <label style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  ملاحظات إضافية
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  placeholder="أي ملاحظات إضافية..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontSize: 'var(--font-size-sm)',
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    resize: 'vertical',
                    minHeight: '100px'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }}
                />
              </div>
            </div>
          </motion.div>

          {/* Form Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '20px',
              borderTop: '1px solid var(--color-border)'
            }}
          >
            <button
              type="button"
              onClick={() => {
                handleReset();
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-secondary)';
                e.currentTarget.style.color = 'var(--color-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              <X size={16} />
              إلغاء
            </button>

            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary)';
              }}
            >
              <Save size={16} />
              حفظ القضية
            </button>
          </motion.div>
        </div>
      </form>
    </Modal>
  );
};

export default AddCaseModal;
