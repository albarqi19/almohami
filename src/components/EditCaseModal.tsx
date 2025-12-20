import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, AlertCircle } from 'lucide-react';
import type { Case } from '../types';

interface EditCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: Case;
  onSave: (updatedCase: Partial<Case>) => Promise<void>;
}

const EditCaseModal: React.FC<EditCaseModalProps> = ({
  isOpen,
  onClose,
  caseData,
  onSave
}) => {
  const [formData, setFormData] = useState({
    title: caseData.title || '',
    description: caseData.description || '',
    opponent_name: caseData.opponent_name || '',
    court: caseData.court || '',
    case_type: caseData.case_type || 'civil',
    status: caseData.status || 'active',
    priority: caseData.priority || 'medium',
    contract_value: caseData.contract_value || '',
    due_date: caseData.due_date ? new Date(caseData.due_date).toISOString().split('T')[0] : ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Convert string date back to Date object and contract_value to number
      const updatedData = {
        ...formData,
        due_date: formData.due_date ? new Date(formData.due_date) : undefined,
        contract_value: formData.contract_value ? Number(formData.contract_value) : undefined
      };
      await onSave(updatedData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل في تحديث القضية');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: '16px'
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-xl)',
              width: '100%',
              maxWidth: '672px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '24px',
              borderBottom: '1px solid var(--color-border)'
            }}>
              <h2 style={{
                fontSize: 'var(--font-size-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text)',
                margin: 0
              }}>
                تعديل القضية: {caseData.file_number}
              </h2>
              <button
                onClick={onClose}
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-background)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}>
              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px',
                  backgroundColor: 'var(--color-error-light)',
                  border: '1px solid var(--color-error)',
                  borderRadius: '8px',
                  color: 'var(--color-error)'
                }}>
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '8px'
                }}>
                  عنوان القضية *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="أدخل عنوان القضية"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  وصف القضية
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="أدخل وصف تفصيلي للقضية"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Opponent Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الطرف المقابل
                  </label>
                  <input
                    type="text"
                    name="opponent_name"
                    value={formData.opponent_name}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="اسم الطرف المقابل"
                  />
                </div>

                {/* Court */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المحكمة
                  </label>
                  <input
                    type="text"
                    name="court"
                    value={formData.court}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="اسم المحكمة"
                  />
                </div>

                {/* Case Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نوع القضية
                  </label>
                  <select
                    name="case_type"
                    value={formData.case_type}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="civil">مدنية</option>
                    <option value="commercial">تجارية</option>
                    <option value="criminal">جنائية</option>
                    <option value="administrative">إدارية</option>
                    <option value="family">أحوال شخصية</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    حالة القضية
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">نشطة</option>
                    <option value="pending">معلقة</option>
                    <option value="closed">مغلقة</option>
                    <option value="draft">مسودة</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الأولوية
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">منخفضة</option>
                    <option value="medium">متوسطة</option>
                    <option value="high">عالية</option>
                    <option value="urgent">عاجلة</option>
                  </select>
                </div>

                {/* Contract Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    قيمة العقد
                  </label>
                  <input
                    type="number"
                    name="contract_value"
                    value={formData.contract_value}
                    onChange={handleInputChange}
                    step="0.01"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاريخ الاستحقاق
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid var(--color-border)'
              }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    color: 'var(--color-text)',
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-secondary-light)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-background)'}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 24px',
                    backgroundColor: loading ? 'var(--color-secondary)' : 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <Save size={16} />
                  {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EditCaseModal;
