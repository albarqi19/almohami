import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Receipt,
  Calendar,
  Loader2,
  AlertCircle,
  Search,
  Briefcase,
  DollarSign,
} from 'lucide-react';
import { UserService } from '../../services/UserService';
import { CaseService } from '../../services/caseService';
import type { User as UserType, Case } from '../../types';
import '../../styles/add-session-modal.css';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

interface ClientOption {
  id: string;
  name: string;
  phone?: string;
  nationalId?: string;
}

interface CaseOption {
  id: string;
  title: string;
  file_number: string;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'مسودة' },
  { value: 'sent', label: 'مرسلة' },
  { value: 'pending', label: 'معلقة' },
];

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    case_id: '',
    due_date: '',
    invoice_date: new Date().toISOString().split('T')[0],
    subtotal: '',
    discount_percentage: '',
    vat_rate: '15',
    notes: '',
    status: 'draft',
  });

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && clients.length === 0) fetchClients();
  }, [isOpen]);

  const fetchClients = async () => {
    setClientsLoading(true);
    try {
      const data = await UserService.getClients();
      setClients(data.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone, nationalId: c.nationalId })));
    } catch { /* ignore */ }
    finally { setClientsLoading(false); }
  };

  // جلب قضايا العميل
  useEffect(() => {
    if (!formData.client_id) { setCases([]); return; }
    const fetchCases = async () => {
      try {
        const data = await CaseService.getCases({ client_id: formData.client_id, limit: 100 });
        setCases((data.data || []).map((c: any) => ({ id: c.id, title: c.title, file_number: c.file_number })));
      } catch { /* ignore */ }
    };
    fetchCases();
  }, [formData.client_id]);

  const selectClient = (c: ClientOption) => {
    setFormData(prev => ({ ...prev, client_id: c.id.toString(), case_id: '' }));
    setClientSearch(c.name);
    setShowClientDropdown(false);
    if (error) setError(null);
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  // الحسابات
  const subtotal = Number(formData.subtotal) || 0;
  const discountPerc = Number(formData.discount_percentage) || 0;
  const discount = discountPerc > 0 ? (subtotal * discountPerc) / 100 : 0;
  const taxable = subtotal - discount;
  const vatRate = Number(formData.vat_rate) || 0;
  const vat = (taxable * vatRate) / 100;
  const total = taxable + vat;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!formData.client_id) throw new Error('يجب اختيار العميل');
      if (!formData.title.trim()) throw new Error('عنوان الفاتورة مطلوب');
      if (!subtotal) throw new Error('المبلغ مطلوب');
      if (!formData.due_date) throw new Error('تاريخ الاستحقاق مطلوب');

      await onSave({
        title: formData.title,
        client_id: Number(formData.client_id),
        case_id: formData.case_id ? Number(formData.case_id) : undefined,
        due_date: formData.due_date,
        invoice_date: formData.invoice_date || undefined,
        subtotal,
        discount: discount || undefined,
        discount_percentage: discountPerc || undefined,
        vat_rate: vatRate,
        notes: formData.notes || undefined,
        status: formData.status,
      });
      // reset
      setFormData({
        title: '', client_id: '', case_id: '', due_date: '',
        invoice_date: new Date().toISOString().split('T')[0],
        subtotal: '', discount_percentage: '', vat_rate: '15', notes: '', status: 'draft',
      });
      setClientSearch('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally { setLoading(false); }
  };

  const handleCancel = () => { setError(null); onClose(); };

  const selectedClient = clients.find(c => c.id.toString() === formData.client_id);

  const filteredClients = clientSearch && showClientDropdown
    ? clients.filter(c =>
        c.name.includes(clientSearch) ||
        (c.nationalId && c.nationalId.includes(clientSearch)) ||
        (c.phone && c.phone.includes(clientSearch))
      )
    : clients;

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
          style={{ maxWidth: '520px' }}
        >
          {/* Header */}
          <div className="asm-header">
            <div className="asm-header__icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
              <Receipt size={18} />
            </div>
            <h2 className="asm-header__title">فاتورة جديدة</h2>
            <span className="asm-manual-badge">بدون عقد</span>
            <button className="asm-close-btn" onClick={handleCancel}><X size={16} /></button>
          </div>

          {error && (
            <div className="asm-error"><AlertCircle size={14} /><span>{error}</span></div>
          )}

          <form onSubmit={handleSubmit} className="asm-form">
            {/* Row 1: Client search */}
            <div className="asm-case-picker">
              <div className="asm-case-picker__input-wrap">
                <Search size={14} className="asm-case-picker__icon" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                  onFocus={() => setShowClientDropdown(true)}
                  placeholder={clientsLoading ? 'جاري التحميل...' : 'ابحث واختر العميل...'}
                  className="asm-case-picker__input"
                />
                {selectedClient && (
                  <span className="asm-case-picker__selected">
                    {selectedClient.name}
                    <button type="button" onClick={() => { updateField('client_id', ''); updateField('case_id', ''); setClientSearch(''); }}>
                      <X size={12} />
                    </button>
                  </span>
                )}
              </div>
              {showClientDropdown && !clientsLoading && (
                <div className="asm-case-picker__dropdown">
                  {filteredClients.slice(0, 8).map(c => (
                    <div key={c.id} className="asm-case-picker__option" onClick={() => selectClient(c)}>
                      <span className="asm-case-picker__title">{c.name}</span>
                      {c.phone && <span className="asm-case-picker__court">{c.phone}</span>}
                    </div>
                  ))}
                  {filteredClients.length === 0 && (
                    <div className="asm-case-picker__empty">لا توجد نتائج</div>
                  )}
                </div>
              )}
            </div>

            {/* Row 2: Case (optional, appears after client) */}
            {formData.client_id && cases.length > 0 && (
              <div className="asm-field">
                <label><Briefcase size={11} /> ربط بقضية (اختياري)</label>
                <select value={formData.case_id} onChange={(e) => updateField('case_id', e.target.value)}>
                  <option value="">بدون قضية</option>
                  {cases.map(c => (
                    <option key={c.id} value={c.id}>{c.file_number} - {c.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Row 3: Title */}
            <div className="asm-field">
              <label><Receipt size={11} /> عنوان الفاتورة</label>
              <input type="text" value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="مثلاً: أتعاب استشارة قانونية" />
            </div>

            {/* Row 4: Amount + VAT + Discount (inline) */}
            <div className="asm-row">
              <div className="asm-field asm-field--grow">
                <label><DollarSign size={11} /> المبلغ</label>
                <input type="number" value={formData.subtotal}
                  onChange={(e) => updateField('subtotal', e.target.value)}
                  placeholder="0.00" />
              </div>
              <div className="asm-field" style={{ width: 80 }}>
                <label>الضريبة %</label>
                <input type="number" value={formData.vat_rate}
                  onChange={(e) => updateField('vat_rate', e.target.value)}
                  placeholder="15" />
              </div>
              <div className="asm-field" style={{ width: 80 }}>
                <label>خصم %</label>
                <input type="number" value={formData.discount_percentage}
                  onChange={(e) => updateField('discount_percentage', e.target.value)}
                  placeholder="0" min="0" max="100" />
              </div>
            </div>

            {/* Total summary */}
            {subtotal > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '6px 10px', borderRadius: '6px',
                background: 'var(--quiet-gray-50, #f0fdf4)',
                border: '1px solid var(--color-border, #bbf7d0)',
                fontSize: '12px', color: 'var(--color-text-secondary, #6b7280)',
              }}>
                {discount > 0 && <span>خصم: <b style={{ color: '#dc2626' }}>-{discount.toFixed(0)}</b></span>}
                <span>ضريبة: <b>{vat.toFixed(0)}</b></span>
                <span style={{ marginRight: 'auto', fontWeight: 700, fontSize: '13px', color: 'var(--color-text, #111)' }}>
                  = {total.toFixed(2)} ر.س
                </span>
              </div>
            )}

            {/* Row 5: Dates (inline) */}
            <div className="asm-row">
              <div className="asm-field asm-field--grow">
                <label><Calendar size={11} /> تاريخ الفاتورة</label>
                <input type="date" value={formData.invoice_date}
                  onChange={(e) => updateField('invoice_date', e.target.value)} />
              </div>
              <div className="asm-field asm-field--grow">
                <label><Calendar size={11} /> الاستحقاق</label>
                <input type="date" value={formData.due_date}
                  onChange={(e) => updateField('due_date', e.target.value)} required />
              </div>
            </div>

            {/* Row 6: Status pills */}
            <div className="asm-type-row">
              <label>الحالة</label>
              <div className="asm-type-pills">
                {STATUS_OPTIONS.map(s => (
                  <button key={s.value} type="button"
                    className={`asm-type-pill ${formData.status === s.value ? 'asm-type-pill--active' : ''}`}
                    onClick={() => updateField('status', s.value)}
                  >{s.label}</button>
                ))}
              </div>
            </div>

            {/* Row 7: Notes (single line) */}
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
                  : <><Receipt size={15} /> إنشاء الفاتورة</>}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreateInvoiceModal;
