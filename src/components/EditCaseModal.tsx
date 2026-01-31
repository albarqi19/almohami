import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  AlertCircle,
  FileText,
  Building2,
  User,
  Tag,
  Activity,
  Flag,
  DollarSign,
  Calendar,
  Loader2,
  Briefcase
} from 'lucide-react';
import type { Case } from '../types';
import '../styles/add-appointment-modal.css'; // Reusable Notion modal styles

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

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('عنوان القضية مطلوب');
      return;
    }

    setLoading(true);
    setError(null);

    try {
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="add-appointment-modal-overlay" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ duration: 0.15 }}
          className="add-appointment-modal"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '800px' }}
        >
          {/* Header */}
          <div className="modal-header">
            <div className="modal-header-icon">
              <Briefcase size={20} />
            </div>
            <div className="modal-header-title">
              <h2>تعديل بيانات القضية</h2>
              <span className="modal-header-subtitle">رقم الملف: {caseData.file_number}</span>
            </div>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body" style={{ padding: '0 32px 32px' }}>
            {error && (
              <div className="modal-error" style={{ margin: '20px 0' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Large Title Input */}
            <input
              type="text"
              className="modal-title-input"
              placeholder="عنوان القضية"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              autoFocus
              style={{ marginTop: '20px' }}
            />

            {/* Properties List */}
            <div className="notion-properties-grid">

              {/* Type */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Tag size={14} />
                  <span>نوع القضية</span>
                </div>
                <div className="notion-property-value">
                  <select
                    value={formData.case_type}
                    onChange={(e) => updateField('case_type', e.target.value)}
                  >
                    <option value="civil">⚖️ مدنية</option>
                    <option value="commercial">🏢 تجارية</option>
                    <option value="criminal">🔗 جنائية</option>
                    <option value="administrative">🏛️ إدارية</option>
                    <option value="family">🏠 أحوال شخصية</option>
                  </select>
                </div>
              </div>

              {/* Status */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Activity size={14} />
                  <span>الحالة</span>
                </div>
                <div className="notion-property-value">
                  <select
                    value={formData.status}
                    onChange={(e) => updateField('status', e.target.value)}
                  >
                    <option value="active">🟢 نشطة</option>
                    <option value="pending">🟡 معلقة</option>
                    <option value="closed">🔴 مغلقة</option>
                    <option value="draft">📝 مسودة</option>
                  </select>
                </div>
              </div>

              {/* Priority */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Flag size={14} />
                  <span>الأولوية</span>
                </div>
                <div className="notion-property-value">
                  <select
                    value={formData.priority}
                    onChange={(e) => updateField('priority', e.target.value)}
                  >
                    <option value="low">☁️ منخفضة</option>
                    <option value="medium">🌤️ متوسطة</option>
                    <option value="high">🔥 عالية</option>
                    <option value="urgent">🚨 عاجلة</option>
                  </select>
                </div>
              </div>

              {/* Court */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Building2 size={14} />
                  <span>المحكمة</span>
                </div>
                <div className="notion-property-value">
                  <input
                    type="text"
                    placeholder="اسم المحكمة..."
                    value={formData.court}
                    onChange={(e) => updateField('court', e.target.value)}
                  />
                </div>
              </div>

              {/* Opponent */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <User size={14} />
                  <span>الخصم</span>
                </div>
                <div className="notion-property-value">
                  <input
                    type="text"
                    placeholder="اسم الطرف المقابل..."
                    value={formData.opponent_name}
                    onChange={(e) => updateField('opponent_name', e.target.value)}
                  />
                </div>
              </div>

              {/* Due Date */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Calendar size={14} />
                  <span>الاستحقاق</span>
                </div>
                <div className="notion-property-value">
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => updateField('due_date', e.target.value)}
                  />
                </div>
              </div>

              {/* Contract Value */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <DollarSign size={14} />
                  <span>قيمة العقد</span>
                </div>
                <div className="notion-property-value">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={formData.contract_value}
                    onChange={(e) => updateField('contract_value', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="notion-section-divider"></div>

            {/* Description Area */}
            <div className="notion-content-area">
              <div className="notion-content-label">وصف وتفاصيل القضية</div>
              <textarea
                className="notion-textarea"
                placeholder="أضف وصفاً تفصيلياً للقضية هنا..."
                rows={10}
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button className="notion-btn notion-btn-secondary" onClick={onClose} disabled={loading}>
              إلغاء
            </button>
            <button
              className="notion-btn notion-btn-primary"
              disabled={loading || !formData.title.trim()}
              onClick={handleSubmit}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" style={{ marginLeft: '8px', display: 'inline' }} />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save size={14} style={{ marginLeft: '8px' }} />
                  حفظ التغييرات
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EditCaseModal;
