import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  Search,
  Video,
  Users,
} from 'lucide-react';
import { apiClient } from '../utils/api';
import '../styles/add-session-modal.css';

interface AddSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionAdded: () => void;
  preselectedCaseId?: number;
}

interface CaseOption {
  id: number;
  title: string;
  file_number: string;
  court?: string;
  department?: string;
}

const METHOD_OPTIONS = [
  { value: 'حضوري', label: 'حضوري', icon: Users, color: '#16a34a', bg: '#f0fdf4' },
  { value: 'عن بعد', label: 'عن بعد', icon: Video, color: '#2563eb', bg: '#eff6ff' },
];

const SESSION_TYPES = [
  'نظر', 'مرافعة', 'نطق بالحكم', 'صلح', 'خبرة', 'تبادل مذكرات', 'أولى', 'استئناف', 'أخرى'
];

export const AddSessionModal: React.FC<AddSessionModalProps> = ({
  isOpen,
  onClose,
  onSessionAdded,
  preselectedCaseId
}) => {
  const [formData, setFormData] = useState({
    case_id: preselectedCaseId?.toString() || '',
    session_date_gregorian: '',
    session_time: '',
    session_type: '',
    court: '',
    department: '',
    method: '',
    location: '',
    video_conference_url: '',
    notes: '',
  });

  const [cases, setCases] = useState<CaseOption[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [caseSearch, setCaseSearch] = useState('');
  const [showCaseDropdown, setShowCaseDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && cases.length === 0) fetchCases();
  }, [isOpen]);

  const fetchCases = async () => {
    setCasesLoading(true);
    try {
      const response = await apiClient.get<any>('/cases?limit=200');
      const casesData = response?.data?.data || response?.data || [];
      setCases(Array.isArray(casesData) ? casesData.map((c: any) => ({
        id: c.id, title: c.title, file_number: c.file_number,
        court: c.court, department: c.department,
      })) : []);
    } catch (err) { console.error('Failed to fetch cases:', err); }
    finally { setCasesLoading(false); }
  };

  // Auto-fill court & department when case selected
  const selectCase = (c: CaseOption) => {
    setFormData(prev => ({
      ...prev,
      case_id: c.id.toString(),
      court: c.court || prev.court,
      department: c.department || prev.department,
    }));
    setCaseSearch(c.file_number + ' - ' + c.title);
    setShowCaseDropdown(false);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.case_id) throw new Error('يجب اختيار القضية');
      if (!formData.session_date_gregorian) throw new Error('تاريخ الجلسة مطلوب');

      const payload: any = {
        case_id: parseInt(formData.case_id),
        session_date_gregorian: formData.session_date_gregorian,
        session_time: formData.session_time || undefined,
        session_type: formData.session_type || undefined,
        court: formData.court || undefined,
        department: formData.department || undefined,
        method: formData.method || undefined,
        location: formData.location || undefined,
        notes: formData.notes || undefined,
      };
      if (formData.method === 'عن بعد' && formData.video_conference_url) {
        payload.video_conference_url = formData.video_conference_url;
      }

      const response = await apiClient.post<any>('/sessions', payload);

      if (response.success) {
        setFormData({
          case_id: preselectedCaseId?.toString() || '', session_date_gregorian: '',
          session_time: '', session_type: '', court: '', department: '',
          method: '', location: '', video_conference_url: '', notes: '',
        });
        setCaseSearch('');
        onSessionAdded();
        onClose();
      } else {
        throw new Error(response.message || 'فشل في إنشاء الجلسة');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally { setLoading(false); }
  };

  const handleCancel = () => { setError(null); onClose(); };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const filteredCases = caseSearch && showCaseDropdown
    ? cases.filter(c =>
        c.title.includes(caseSearch) ||
        c.file_number.includes(caseSearch) ||
        (c.court && c.court.includes(caseSearch))
      )
    : cases;

  const selectedCase = cases.find(c => c.id.toString() === formData.case_id);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="add-session-modal-overlay" onClick={handleCancel}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="add-session-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Compact Header */}
          <div className="asm-header">
            <div className="asm-header__icon"><Calendar size={18} /></div>
            <h2 className="asm-header__title">إضافة جلسة</h2>
            <span className="asm-manual-badge">يدوية</span>
            <button className="asm-close-btn" onClick={handleCancel}><X size={16} /></button>
          </div>

          {error && (
            <div className="asm-error"><AlertCircle size={14} /><span>{error}</span></div>
          )}

          <form onSubmit={handleSubmit} className="asm-form">
            {/* Row 1: Case (full width with smart search) */}
            {!preselectedCaseId ? (
              <div className="asm-case-picker">
                <div className="asm-case-picker__input-wrap">
                  <Search size={14} className="asm-case-picker__icon" />
                  <input
                    type="text"
                    value={caseSearch}
                    onChange={(e) => { setCaseSearch(e.target.value); setShowCaseDropdown(true); }}
                    onFocus={() => setShowCaseDropdown(true)}
                    placeholder={casesLoading ? 'جاري التحميل...' : 'ابحث واختر القضية...'}
                    className="asm-case-picker__input"
                  />
                  {selectedCase && (
                    <span className="asm-case-picker__selected">
                      {selectedCase.file_number}
                      <button type="button" onClick={() => { setFormData(p => ({ ...p, case_id: '' })); setCaseSearch(''); }}>
                        <X size={12} />
                      </button>
                    </span>
                  )}
                </div>
                {showCaseDropdown && !casesLoading && (
                  <div className="asm-case-picker__dropdown">
                    {filteredCases.slice(0, 8).map(c => (
                      <div key={c.id} className="asm-case-picker__option" onClick={() => selectCase(c)}>
                        <span className="asm-case-picker__num">{c.file_number}</span>
                        <span className="asm-case-picker__title">{c.title}</span>
                        {c.court && <span className="asm-case-picker__court">{c.court}</span>}
                      </div>
                    ))}
                    {filteredCases.length === 0 && (
                      <div className="asm-case-picker__empty">لا توجد نتائج</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="asm-preselected">
                <Calendar size={14} />
                <span>القضية: {selectedCase?.file_number} - {selectedCase?.title}</span>
              </div>
            )}

            {/* Row 2: Date + Time (inline) */}
            <div className="asm-row">
              <div className="asm-field asm-field--grow">
                <label><Calendar size={11} /> التاريخ</label>
                <input type="date" value={formData.session_date_gregorian}
                  onChange={(e) => updateField('session_date_gregorian', e.target.value)} required />
              </div>
              <div className="asm-field" style={{ width: 120 }}>
                <label><Clock size={11} /> الوقت</label>
                <input type="time" value={formData.session_time}
                  onChange={(e) => updateField('session_time', e.target.value)} />
              </div>
            </div>

            {/* Row 3: Method selector (pills) */}
            <div className="asm-method-row">
              <label>طريقة الحضور</label>
              <div className="asm-method-pills">
                {METHOD_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const isActive = formData.method === opt.value;
                  return (
                    <button key={opt.value} type="button"
                      className={`asm-method-pill ${isActive ? 'asm-method-pill--active' : ''}`}
                      style={isActive ? { background: opt.bg, color: opt.color, borderColor: opt.color } : {}}
                      onClick={() => updateField('method', isActive ? '' : opt.value)}
                    >
                      <Icon size={14} />{opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conditional: Video URL if remote */}
            {formData.method === 'عن بعد' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="asm-field">
                <label><Video size={11} /> رابط الجلسة الافتراضية</label>
                <input type="url" value={formData.video_conference_url}
                  onChange={(e) => updateField('video_conference_url', e.target.value)}
                  placeholder="https://..." dir="ltr" />
              </motion.div>
            )}

            {/* Row 4: Session type (quick pills) */}
            <div className="asm-type-row">
              <label>نوع الجلسة</label>
              <div className="asm-type-pills">
                {SESSION_TYPES.map(t => (
                  <button key={t} type="button"
                    className={`asm-type-pill ${formData.session_type === t ? 'asm-type-pill--active' : ''}`}
                    onClick={() => updateField('session_type', formData.session_type === t ? '' : t)}
                  >{t}</button>
                ))}
              </div>
            </div>

            {/* Row 5: Court + Department (auto-filled from case) */}
            <div className="asm-row">
              <div className="asm-field asm-field--grow">
                <label>المحكمة</label>
                <input type="text" value={formData.court}
                  onChange={(e) => updateField('court', e.target.value)}
                  placeholder="يتعبأ تلقائياً من القضية" />
              </div>
              <div className="asm-field" style={{ width: 100 }}>
                <label>الدائرة</label>
                <input type="text" value={formData.department}
                  onChange={(e) => updateField('department', e.target.value)} placeholder="—" />
              </div>
            </div>

            {/* Row 6: Notes (single line) */}
            <div className="asm-field">
              <label>ملاحظات</label>
              <input type="text" value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="ملاحظات سريعة (اختياري)" />
            </div>

            {/* Actions */}
            <div className="asm-actions">
              <button type="button" className="asm-btn asm-btn--cancel" onClick={handleCancel}>إلغاء</button>
              <button type="submit" className="asm-btn asm-btn--submit" disabled={loading}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> جاري الحفظ...</>
                  : <><Calendar size={15} /> حفظ الجلسة</>}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
