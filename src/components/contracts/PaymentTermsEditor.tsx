import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Calendar, DollarSign, Percent } from 'lucide-react';
import type { CreatePaymentTermData, PaymentTermType, AmountType } from '../../types/contracts';

interface PaymentTermsEditorProps {
  terms: CreatePaymentTermData[];
  onChange: (terms: CreatePaymentTermData[]) => void;
  totalAmount: number;
  vatRate?: number;
  readOnly?: boolean;
}

const TERM_TYPES: { value: PaymentTermType; label: string }[] = [
  { value: 'upfront', label: 'دفعة مقدمة' },
  { value: 'milestone', label: 'دفعة قسط' },
  { value: 'final', label: 'دفعة نهائية' },
  { value: 'percentage', label: 'نسبة من الحكم' },
];

const AMOUNT_TYPES: { value: AmountType; label: string }[] = [
  { value: 'fixed', label: 'مبلغ ثابت' },
  { value: 'percentage', label: 'نسبة مئوية' },
];

const PaymentTermsEditor: React.FC<PaymentTermsEditorProps> = ({
  terms,
  onChange,
  totalAmount,
  vatRate = 15,
  readOnly = false,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // حساب مبلغ الشرط
  const calculateTermAmount = (term: CreatePaymentTermData): number => {
    if (term.amount_type === 'fixed') {
      return term.amount || 0;
    } else {
      return (totalAmount * (term.percentage || 0)) / 100;
    }
  };

  // حساب الضريبة لشرط
  const calculateTermVat = (term: CreatePaymentTermData): number => {
    const amount = calculateTermAmount(term);
    return (amount * vatRate) / 100;
  };

  // حساب الإجمالي مع الضريبة
  const calculateTermTotal = (term: CreatePaymentTermData): number => {
    return calculateTermAmount(term) + calculateTermVat(term);
  };

  // إجمالي جميع الشروط
  const totalTermsAmount = terms.reduce((sum, term) => sum + calculateTermAmount(term), 0);
  const totalVat = terms.reduce((sum, term) => sum + calculateTermVat(term), 0);
  const grandTotal = totalTermsAmount + totalVat;

  // إضافة شرط جديد
  const addTerm = () => {
    const newTerm: CreatePaymentTermData = {
      name: `دفعة ${terms.length + 1}`,
      type: terms.length === 0 ? 'upfront' : 'milestone',
      amount_type: 'fixed',
      amount: 0,
    };
    onChange([...terms, newTerm]);
  };

  // تحديث شرط
  const updateTerm = (index: number, updates: Partial<CreatePaymentTermData>) => {
    const newTerms = [...terms];
    newTerms[index] = { ...newTerms[index], ...updates };
    onChange(newTerms);
  };

  // حذف شرط
  const removeTerm = (index: number) => {
    onChange(terms.filter((_, i) => i !== index));
  };

  // السحب والإفلات
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newTerms = [...terms];
    const [draggedTerm] = newTerms.splice(draggedIndex, 1);
    newTerms.splice(index, 0, draggedTerm);
    onChange(newTerms);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // تنسيق المبلغ
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div style={{ direction: 'rtl' }}>
      {/* قائمة الشروط */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {terms.map((term, index) => (
          <div
            key={index}
            draggable={!readOnly}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              opacity: draggedIndex === index ? 0.5 : 1,
              cursor: readOnly ? 'default' : 'grab',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              {/* مقبض السحب */}
              {!readOnly && (
                <div style={{ padding: '8px 0', color: '#9ca3af' }}>
                  <GripVertical size={18} />
                </div>
              )}

              {/* محتوى الشرط */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {/* اسم الشرط */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        color: '#6b7280',
                        marginBottom: '4px',
                      }}
                    >
                      اسم الدفعة
                    </label>
                    <input
                      type="text"
                      value={term.name}
                      onChange={(e) => updateTerm(index, { name: e.target.value })}
                      disabled={readOnly}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  {/* نوع الشرط */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        color: '#6b7280',
                        marginBottom: '4px',
                      }}
                    >
                      نوع الدفعة
                    </label>
                    <select
                      value={term.type}
                      onChange={(e) =>
                        updateTerm(index, { type: e.target.value as PaymentTermType })
                      }
                      disabled={readOnly}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                      }}
                    >
                      {TERM_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* نوع المبلغ */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        color: '#6b7280',
                        marginBottom: '4px',
                      }}
                    >
                      نوع المبلغ
                    </label>
                    <select
                      value={term.amount_type}
                      onChange={(e) =>
                        updateTerm(index, {
                          amount_type: e.target.value as AmountType,
                          amount: 0,
                          percentage: 0,
                        })
                      }
                      disabled={readOnly}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                      }}
                    >
                      {AMOUNT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* المبلغ أو النسبة */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        color: '#6b7280',
                        marginBottom: '4px',
                      }}
                    >
                      {term.amount_type === 'fixed' ? 'المبلغ (ريال)' : 'النسبة (%)'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        value={
                          term.amount_type === 'fixed'
                            ? term.amount || ''
                            : term.percentage || ''
                        }
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          if (term.amount_type === 'fixed') {
                            updateTerm(index, { amount: value });
                          } else {
                            updateTerm(index, { percentage: value });
                          }
                        }}
                        disabled={readOnly}
                        min={0}
                        max={term.amount_type === 'percentage' ? 100 : undefined}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          paddingLeft: '36px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#9ca3af',
                        }}
                      >
                        {term.amount_type === 'fixed' ? (
                          <DollarSign size={16} />
                        ) : (
                          <Percent size={16} />
                        )}
                      </span>
                    </div>
                  </div>

                  {/* تاريخ الاستحقاق */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        color: '#6b7280',
                        marginBottom: '4px',
                      }}
                    >
                      تاريخ الاستحقاق
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="date"
                        value={term.due_date || ''}
                        onChange={(e) => updateTerm(index, { due_date: e.target.value })}
                        disabled={readOnly}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </div>

                  {/* شرط الاستحقاق */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        color: '#6b7280',
                        marginBottom: '4px',
                      }}
                    >
                      شرط الاستحقاق
                    </label>
                    <input
                      type="text"
                      value={term.due_condition || ''}
                      onChange={(e) => updateTerm(index, { due_condition: e.target.value })}
                      disabled={readOnly}
                      placeholder="مثال: عند توقيع العقد"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>

                {/* ملخص المبلغ */}
                <div
                  style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', gap: '24px', fontSize: '14px' }}>
                    <span>
                      المبلغ:{' '}
                      <strong>{formatAmount(calculateTermAmount(term))} ر.س</strong>
                    </span>
                    <span>
                      الضريبة ({vatRate}%):{' '}
                      <strong>{formatAmount(calculateTermVat(term))} ر.س</strong>
                    </span>
                    <span style={{ color: '#059669' }}>
                      الإجمالي:{' '}
                      <strong>{formatAmount(calculateTermTotal(term))} ر.س</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* زر الحذف */}
              {!readOnly && (
                <button
                  onClick={() => removeTerm(index)}
                  style={{
                    padding: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#ef4444',
                  }}
                  title="حذف الدفعة"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* زر إضافة شرط */}
      {!readOnly && (
        <button
          onClick={addTerm}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '12px',
            marginTop: '12px',
            backgroundColor: 'white',
            border: '2px dashed #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            color: '#6b7280',
            fontSize: '14px',
            transition: 'all 0.2s',
          }}
        >
          <Plus size={18} />
          إضافة دفعة جديدة
        </button>
      )}

      {/* ملخص إجمالي */}
      {terms.length > 0 && (
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#1d4ed8',
            borderRadius: '8px',
            color: 'white',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '14px',
            }}
          >
            <span>إجمالي المبالغ:</span>
            <span>{formatAmount(totalTermsAmount)} ر.س</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '14px',
            }}
          >
            <span>إجمالي الضريبة ({vatRate}%):</span>
            <span>{formatAmount(totalVat)} ر.س</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255,255,255,0.3)',
              fontSize: '18px',
              fontWeight: 'bold',
            }}
          >
            <span>الإجمالي الكلي:</span>
            <span>{formatAmount(grandTotal)} ر.س</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentTermsEditor;
