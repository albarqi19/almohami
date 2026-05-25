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
  Briefcase,
  Phone,
  Mail,
  Users,
  Clock,
  ExternalLink,
  Scale,
  CheckSquare,
  BookOpen,
  Hash,
  Trophy,
  Sparkles,
} from 'lucide-react';
import type { Case } from '../types';
import { apiClient } from '../utils/api';
import '../styles/add-appointment-modal.css';

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
    // البيانات الأساسية
    title: caseData.title || '',
    description: caseData.description || '',
    opponent_name: caseData.opponent_name || '',
    court: caseData.court || '',
    department: caseData.department || '',
    case_type: caseData.case_type || 'civil',
    case_category: caseData.case_category || '',
    status: caseData.status || 'active',
    priority: caseData.priority || 'medium',
    contract_value: caseData.contract_value || '',
    due_date: caseData.due_date ? new Date(caseData.due_date).toISOString().split('T')[0] : '',
    filing_date: caseData.filing_date ? new Date(caseData.filing_date).toISOString().split('T')[0] : '',
    // الأطراف
    client_name: caseData.client_name || '',
    client_phone: caseData.client_phone || '',
    client_email: caseData.client_email || '',
    plaintiff_name: caseData.plaintiff_name || '',
    defendant_name: caseData.defendant_name || '',
    opponent_lawyer: (caseData as any).opponent_lawyer || '',
    // الجلسات
    next_hearing: caseData.next_hearing ? new Date(caseData.next_hearing).toISOString().split('T')[0] : '',
    next_hearing_time: caseData.next_hearing_time || '',
    next_hearing_type: caseData.next_hearing_type || '',
    hearing_method: caseData.hearing_method || '',
    // تفاصيل الدعوى
    case_subject: caseData.case_subject || '',
    case_demands: caseData.case_demands || '',
    plaintiff_requests: caseData.plaintiff_requests || '',
    case_proofs: caseData.case_proofs || '',
    case_evidence: caseData.case_evidence || '',
    notes: (caseData as any).notes || '',
    // ناجز
    najiz_status: caseData.najiz_status || '',
  });

  // النتيجة (حقل منفصل — يُحفظ عبر endpoint مستقل لاتباع منطق Active Learning)
  const [outcomeData, setOutcomeData] = useState({
    outcome: (caseData.outcome as string) || '',
    is_appealed: Boolean(caseData.outcome_appealed),
    is_partial: Boolean(caseData.outcome_is_partial),
  });
  const initialOutcome = (caseData.outcome as string) || '';
  const initialAppealed = Boolean(caseData.outcome_appealed);
  const initialPartial = Boolean(caseData.outcome_is_partial);
  const isOutcomeDirty = (
    outcomeData.outcome !== initialOutcome ||
    outcomeData.is_appealed !== initialAppealed ||
    outcomeData.is_partial !== initialPartial
  );
  const outcomeFromAi = caseData.outcome_source === 'ai';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNajizCase = !!caseData.najiz_id || caseData.source === 'najiz';

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
      const updatedData: any = { ...formData };
      // تحويل التواريخ
      if (updatedData.due_date) updatedData.due_date = new Date(updatedData.due_date);
      else delete updatedData.due_date;
      if (updatedData.filing_date) updatedData.filing_date = new Date(updatedData.filing_date);
      else delete updatedData.filing_date;
      if (updatedData.next_hearing) updatedData.next_hearing = new Date(updatedData.next_hearing);
      else delete updatedData.next_hearing;
      if (updatedData.contract_value) updatedData.contract_value = Number(updatedData.contract_value);
      else delete updatedData.contract_value;

      // حذف الحقول الفارغة
      Object.keys(updatedData).forEach(key => {
        if (updatedData[key] === '') updatedData[key] = null;
      });

      await onSave(updatedData);

      // حفظ النتيجة عبر endpoint منفصل (يُسجّل ai_outcome_was_correct تلقائياً)
      if (isOutcomeDirty) {
        try {
          await apiClient.patch(`/cases/${caseData.id}/outcome`, {
            outcome: outcomeData.outcome || null,
            is_appealed: outcomeData.is_appealed,
            is_partial: outcomeData.is_partial,
          });
        } catch (e: any) {
          // لا نرفع خطأ كاملاً — التحديث الأساسي نجح، فقط نُسجّل
          console.warn('فشل حفظ النتيجة:', e?.message);
        }
      }

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
          style={{ maxWidth: '950px', maxHeight: '90vh' }}
        >
          {/* Header */}
          <div className="modal-header">
            <div className="modal-header-icon">
              <Briefcase size={20} />
            </div>
            <div className="modal-header-title">
              <h2>تعديل بيانات القضية</h2>
              <span className="modal-header-subtitle">
                رقم الملف: {caseData.file_number}
                {isNajizCase && <span style={{ marginRight: '8px', color: '#059669', fontSize: '11px', fontWeight: 600 }}>ناجز</span>}
              </span>
            </div>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body" style={{ padding: '0 32px 32px', overflowY: 'auto' }}>
            {error && (
              <div className="modal-error" style={{ margin: '20px 0' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Title */}
            <input
              type="text"
              className="modal-title-input"
              placeholder="عنوان القضية"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              autoFocus
              style={{ marginTop: '20px', fontSize: '26px' }}
            />

            {/* ============ القسم 1: البيانات الأساسية ============ */}
            <div className="edit-case-section-label">
              <Tag size={13} />
              البيانات الأساسية
            </div>
            <div className="notion-properties-grid">
              {/* Type */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Tag size={14} />
                  <span>نوع القضية</span>
                </div>
                <div className="notion-property-value">
                  <select value={formData.case_type} onChange={(e) => updateField('case_type', e.target.value)}>
                    <option value="civil">مدنية</option>
                    <option value="commercial">تجارية</option>
                    <option value="criminal">جنائية</option>
                    <option value="administrative">إدارية</option>
                    <option value="family">أحوال شخصية</option>
                    <option value="labor">عمالية</option>
                    <option value="real_estate">عقارية</option>
                    <option value="other">أخرى</option>
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
                  <select value={formData.status} onChange={(e) => updateField('status', e.target.value)}>
                    <option value="draft">مسودة</option>
                    <option value="preparation">قيد التجهيز</option>
                    <option value="filed">مقيدة</option>
                    <option value="active">نشطة</option>
                    <option value="pending">معلقة</option>
                    <option value="closed">مغلقة</option>
                    <option value="appealed">مستأنفة</option>
                    <option value="settled">تمت التسوية</option>
                    <option value="dismissed">مرفوضة</option>
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
                  <select value={formData.priority} onChange={(e) => updateField('priority', e.target.value)}>
                    <option value="low">منخفضة</option>
                    <option value="medium">متوسطة</option>
                    <option value="high">عالية</option>
                    <option value="urgent">عاجلة</option>
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
                  <input type="text" placeholder="اسم المحكمة..." value={formData.court} onChange={(e) => updateField('court', e.target.value)} />
                </div>
              </div>

              {/* Department */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Hash size={14} />
                  <span>الدائرة</span>
                </div>
                <div className="notion-property-value">
                  <input type="text" placeholder="رقم الدائرة..." value={formData.department} onChange={(e) => updateField('department', e.target.value)} />
                </div>
              </div>

              {/* Case Category */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <BookOpen size={14} />
                  <span>التصنيف</span>
                </div>
                <div className="notion-property-value">
                  <input type="text" placeholder="تصنيف القضية..." value={formData.case_category} onChange={(e) => updateField('case_category', e.target.value)} />
                </div>
              </div>

              {/* Contract Value */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <DollarSign size={14} />
                  <span>قيمة العقد</span>
                </div>
                <div className="notion-property-value">
                  <input type="number" placeholder="0.00" value={formData.contract_value} onChange={(e) => updateField('contract_value', e.target.value)} />
                </div>
              </div>

              {/* Due Date */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Calendar size={14} />
                  <span>الاستحقاق</span>
                </div>
                <div className="notion-property-value">
                  <input type="date" value={formData.due_date} onChange={(e) => updateField('due_date', e.target.value)} />
                </div>
              </div>

              {/* Filing Date */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Calendar size={14} />
                  <span>تاريخ القيد</span>
                </div>
                <div className="notion-property-value">
                  <input type="date" value={formData.filing_date} onChange={(e) => updateField('filing_date', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="notion-section-divider"></div>

            {/* ============ القسم 2: الأطراف ============ */}
            <div className="edit-case-section-label">
              <Users size={13} />
              الأطراف
            </div>
            <div className="notion-properties-grid">
              {/* Client Name */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <User size={14} />
                  <span>اسم العميل</span>
                </div>
                <div className="notion-property-value">
                  <input type="text" placeholder="اسم العميل..." value={formData.client_name} onChange={(e) => updateField('client_name', e.target.value)} />
                </div>
              </div>

              {/* Client Phone */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Phone size={14} />
                  <span>هاتف العميل</span>
                </div>
                <div className="notion-property-value">
                  <input type="text" placeholder="05xxxxxxxx" value={formData.client_phone} onChange={(e) => updateField('client_phone', e.target.value)} />
                </div>
              </div>

              {/* Client Email */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Mail size={14} />
                  <span>إيميل العميل</span>
                </div>
                <div className="notion-property-value">
                  <input type="email" placeholder="email@example.com" value={formData.client_email} onChange={(e) => updateField('client_email', e.target.value)} />
                </div>
              </div>

              {/* Plaintiff */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <User size={14} />
                  <span>المدعي</span>
                </div>
                <div className="notion-property-value">
                  <input type="text" placeholder="اسم المدعي..." value={formData.plaintiff_name} onChange={(e) => updateField('plaintiff_name', e.target.value)} />
                </div>
              </div>

              {/* Defendant */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <User size={14} />
                  <span>المدعى عليه</span>
                </div>
                <div className="notion-property-value">
                  <input type="text" placeholder="اسم المدعى عليه..." value={formData.defendant_name} onChange={(e) => updateField('defendant_name', e.target.value)} />
                </div>
              </div>

              {/* Opponent */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <User size={14} />
                  <span>الخصم</span>
                </div>
                <div className="notion-property-value">
                  <input type="text" placeholder="اسم الخصم..." value={formData.opponent_name} onChange={(e) => updateField('opponent_name', e.target.value)} />
                </div>
              </div>

              {/* Opponent Lawyer */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Briefcase size={14} />
                  <span>محامي الخصم</span>
                </div>
                <div className="notion-property-value">
                  <input type="text" placeholder="اسم محامي الخصم..." value={formData.opponent_lawyer} onChange={(e) => updateField('opponent_lawyer', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="notion-section-divider"></div>

            {/* ============ القسم 3: الجلسات ============ */}
            <div className="edit-case-section-label">
              <Calendar size={13} />
              الجلسة القادمة
            </div>
            <div className="notion-properties-grid">
              {/* Next Hearing Date */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Calendar size={14} />
                  <span>تاريخ الجلسة</span>
                </div>
                <div className="notion-property-value">
                  <input type="date" value={formData.next_hearing} onChange={(e) => updateField('next_hearing', e.target.value)} />
                </div>
              </div>

              {/* Next Hearing Time */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Clock size={14} />
                  <span>وقت الجلسة</span>
                </div>
                <div className="notion-property-value">
                  <input type="time" value={formData.next_hearing_time} onChange={(e) => updateField('next_hearing_time', e.target.value)} />
                </div>
              </div>

              {/* Hearing Type */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Tag size={14} />
                  <span>نوع الجلسة</span>
                </div>
                <div className="notion-property-value">
                  <input type="text" placeholder="مثلاً: أولى، استئناف..." value={formData.next_hearing_type} onChange={(e) => updateField('next_hearing_type', e.target.value)} />
                </div>
              </div>

              {/* Hearing Method */}
              <div className="notion-property">
                <div className="notion-property-label">
                  <Activity size={14} />
                  <span>طريقة الحضور</span>
                </div>
                <div className="notion-property-value">
                  <select value={formData.hearing_method} onChange={(e) => updateField('hearing_method', e.target.value)}>
                    <option value="">غير محدد</option>
                    <option value="حضوري">حضوري</option>
                    <option value="عن بعد">عن بعد</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="notion-section-divider"></div>

            {/* ============ القسم 4: ناجز (يظهر فقط للقضايا المستوردة) ============ */}
            {isNajizCase && (
              <>
                <div className="edit-case-section-label" style={{ color: '#059669' }}>
                  <ExternalLink size={13} />
                  بيانات ناجز
                </div>
                <div className="notion-properties-grid">
                  {/* Najiz Status */}
                  <div className="notion-property">
                    <div className="notion-property-label">
                      <Activity size={14} />
                      <span>حالة ناجز</span>
                    </div>
                    <div className="notion-property-value">
                      <input type="text" placeholder="حالة القضية في ناجز..." value={formData.najiz_status} onChange={(e) => updateField('najiz_status', e.target.value)} />
                    </div>
                  </div>

                  {/* Najiz ID - Read Only */}
                  {caseData.najiz_id && (
                    <div className="notion-property">
                      <div className="notion-property-label">
                        <Hash size={14} />
                        <span>رقم ناجز</span>
                      </div>
                      <div className="notion-property-value">
                        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{caseData.najiz_id}</span>
                      </div>
                    </div>
                  )}

                  {/* Najiz URL - Read Only */}
                  {caseData.najiz_url && (
                    <div className="notion-property">
                      <div className="notion-property-label">
                        <ExternalLink size={14} />
                        <span>رابط ناجز</span>
                      </div>
                      <div className="notion-property-value">
                        <a href={caseData.najiz_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#059669', textDecoration: 'none' }}>
                          فتح في ناجز
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Sync Date - Read Only */}
                  {caseData.najiz_synced_at && (
                    <div className="notion-property">
                      <div className="notion-property-label">
                        <Clock size={14} />
                        <span>آخر مزامنة</span>
                      </div>
                      <div className="notion-property-value">
                        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                          {new Date(caseData.najiz_synced_at).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="notion-section-divider"></div>
              </>
            )}

            {/* ============ القسم 5: تفاصيل الدعوى ============ */}
            <div className="edit-case-section-label">
              <FileText size={13} />
              تفاصيل الدعوى
            </div>

            <div className="notion-content-area">
              <div className="notion-content-label">موضوع الدعوى</div>
              <textarea
                className="notion-textarea"
                placeholder="اكتب موضوع الدعوى هنا..."
                rows={3}
                value={formData.case_subject}
                onChange={(e) => updateField('case_subject', e.target.value)}
              />
            </div>

            <div className="notion-content-area" style={{ marginTop: '12px' }}>
              <div className="notion-content-label">مطالب المدعي</div>
              <textarea
                className="notion-textarea"
                placeholder="اكتب مطالب المدعي هنا..."
                rows={3}
                value={formData.case_demands || formData.plaintiff_requests}
                onChange={(e) => {
                  updateField('case_demands', e.target.value);
                  updateField('plaintiff_requests', e.target.value);
                }}
              />
            </div>

            <div className="notion-content-area" style={{ marginTop: '12px' }}>
              <div className="notion-content-label">أدلة الدعوى</div>
              <textarea
                className="notion-textarea"
                placeholder="اكتب أدلة الدعوى هنا..."
                rows={3}
                value={formData.case_proofs || formData.case_evidence}
                onChange={(e) => {
                  updateField('case_proofs', e.target.value);
                  updateField('case_evidence', e.target.value);
                }}
              />
            </div>

            <div className="notion-section-divider"></div>

            {/* ============ النتيجة (Outcome) ============ */}
            <div className="edit-case-section-label" style={{ color: '#059669' }}>
              <Trophy size={14} style={{ marginLeft: '6px' }} />
              نتيجة القضية
              {outcomeFromAi && (
                <span
                  style={{
                    marginInlineStart: 8,
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: 'rgba(5, 150, 105, 0.10)',
                    color: '#059669',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  title={
                    caseData.outcome_detected_at
                      ? `حدّدها الذكاء الاصطناعي بثقة ${caseData.outcome_confidence ?? '—'} في ${new Date(caseData.outcome_detected_at).toLocaleDateString('ar-SA-u-ca-gregory')}`
                      : 'حدّدها الذكاء الاصطناعي'
                  }
                >
                  <Sparkles size={11} />
                  ذكاء اصطناعي · {caseData.outcome_confidence ?? '—'}
                </span>
              )}
            </div>

            <div className="notion-properties-grid">
              <div className="notion-property">
                <div className="notion-property-label">
                  <Trophy size={14} className="notion-property-icon" />
                  <span>النتيجة</span>
                </div>
                <div className="notion-property-value">
                  <select
                    className="notion-select"
                    value={outcomeData.outcome}
                    onChange={(e) => setOutcomeData(prev => ({ ...prev, outcome: e.target.value }))}
                  >
                    <option value="">— غير محدد —</option>
                    <option value="won">لصالحنا</option>
                    <option value="lost">ضدنا</option>
                    <option value="settled">تسوية</option>
                    <option value="dismissed">مرفوضة شكلاً</option>
                  </select>
                </div>
              </div>

              <div className="notion-property">
                <div className="notion-property-label">
                  <Scale size={14} className="notion-property-icon" />
                  <span>الحالة</span>
                </div>
                <div className="notion-property-value">
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={outcomeData.is_appealed}
                      onChange={(e) => setOutcomeData(prev => ({ ...prev, is_appealed: e.target.checked }))}
                    />
                    مستأنفة / مميَّزة
                  </label>
                </div>
              </div>

              <div className="notion-property">
                <div className="notion-property-label">
                  <CheckSquare size={14} className="notion-property-icon" />
                  <span>الشمولية</span>
                </div>
                <div className="notion-property-value">
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={outcomeData.is_partial}
                      onChange={(e) => setOutcomeData(prev => ({ ...prev, is_partial: e.target.checked }))}
                    />
                    فوز/خسارة جزئية
                  </label>
                </div>
              </div>
            </div>

            <div className="notion-section-divider"></div>

            {/* ============ القسم 6: الوصف والملاحظات ============ */}
            <div className="notion-content-area">
              <div className="notion-content-label">وصف وتفاصيل القضية</div>
              <textarea
                className="notion-textarea"
                placeholder="أضف وصفاً تفصيلياً للقضية هنا..."
                rows={4}
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </div>

            <div className="notion-content-area" style={{ marginTop: '12px' }}>
              <div className="notion-content-label">ملاحظات</div>
              <textarea
                className="notion-textarea"
                placeholder="ملاحظات إضافية..."
                rows={3}
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
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
