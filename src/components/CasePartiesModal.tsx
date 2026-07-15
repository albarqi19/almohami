import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Loader2, AlertCircle, Trash2, Pencil, Plus } from 'lucide-react';
import { CaseService } from '../services/caseService';
import type { CaseParty } from '../types';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)
import '../styles/case-parties-modal.css';

/**
 * إدارة أطراف الدعوى يدوياً — للقضايا اليدوية (source='manual') فقط.
 * قضايا ناجز تُجلب أطرافها من المزامنة ولا تُعدَّل من هنا.
 * النوع CaseParty مصدره الوحيد types/index.ts (id عددي — يطابق قيد الباك whereNumber).
 */

interface CasePartiesModalProps {
  isOpen: boolean;
  caseId: number | string;
  parties: CaseParty[];
  onClose: () => void;
  onChanged: () => void; // يعيد جلب القضية لتحديث القسم والدور المشتق
}

const SIDE_OPTIONS: Array<{ value: string; label: string; icon: string }> = [
  { value: 'plaintiff', label: 'مدعي', icon: 'م' },
  { value: 'defendant', label: 'مدعى عليه', icon: 'ض' },
  { value: 'lawyer', label: 'محامي', icon: 'و' },
  { value: 'agent', label: 'وكيل', icon: 'ك' },
  { value: 'appellant', label: 'مستأنِف', icon: 'س' },
  { value: 'appellee', label: 'مستأنَف ضده', icon: 'د' },
];

const EMPTY_FORM = { name: '', side: 'defendant', role: '', national_id: '', represents: '', phone: '' };

export const CasePartiesModal: React.FC<CasePartiesModalProps> = ({
  isOpen, caseId, parties, onClose, onChanged,
}) => {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
  };

  const startEdit = (p: CaseParty) => {
    setEditingId(p.id);
    setForm({
      name: p.name || '',
      side: p.side || 'defendant',
      role: p.role || '',
      national_id: p.national_id || '',
      represents: p.represents || '',
      phone: p.phone || '',
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('اسم الطرف مطلوب'); return; }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, any> = {
        name: form.name.trim(),
        side: form.side,
        role: form.role.trim() || undefined,
        national_id: form.national_id.trim() || undefined,
        represents: form.represents.trim() || undefined,
        phone: form.phone.trim() || undefined,
      };
      if (editingId) {
        await CaseService.updateCaseParty(caseId, editingId, payload);
      } else {
        await CaseService.addCaseParty(caseId, payload as any);
      }
      resetForm();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (partyId: number) => {
    setDeletingId(partyId);
    setError(null);
    try {
      await CaseService.deleteCaseParty(caseId, partyId);
      if (editingId === partyId) resetForm();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل في حذف الطرف');
    } finally {
      setDeletingId(null);
    }
  };

  const sideLabel = (side: string) => SIDE_OPTIONS.find(s => s.value === side)?.label || side;
  const sideIcon = (side: string) => SIDE_OPTIONS.find(s => s.value === side)?.icon || '؟';
  // إظهار «يمثل من» فقط للممثلين (محامي/وكيل) — لا معنى له للأصيل
  const showRepresents = form.side === 'lawyer' || form.side === 'agent';

  return (
    <AnimatePresence>
      <div className="cpm-overlay" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="cpm-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="cpm-header">
            <div className="cpm-header__icon"><Users size={18} /></div>
            <h2 className="cpm-header__title">أطراف الدعوى</h2>
            <span className="cpm-manual-badge">يدوية</span>
            <button className="cpm-close-btn" onClick={onClose}><X size={16} /></button>
          </div>

          {error && (
            <div className="cpm-error"><AlertCircle size={14} /><span>{error}</span></div>
          )}

          {/* الأطراف الحالية */}
          <div className="cpm-list">
            {parties.length === 0 && (
              <div className="cpm-list__empty">لا توجد أطراف بعد — أضف أول طرف من النموذج أدناه</div>
            )}
            {parties.map(p => (
              <div key={p.id} className={`cpm-party cpm-party--${p.side} ${editingId === p.id ? 'cpm-party--editing' : ''}`}>
                <span className="cpm-party__icon">{sideIcon(p.side)}</span>
                <div className="cpm-party__info">
                  <span className="cpm-party__name">{p.name}</span>
                  <span className="cpm-party__meta">
                    {sideLabel(p.side)}
                    {p.role && p.role !== sideLabel(p.side) ? ` · ${p.role}` : ''}
                    {p.national_id ? ` · ${p.national_id}` : ''}
                    {p.represents ? ` · يمثل: ${p.represents}` : ''}
                  </span>
                </div>
                <button type="button" className="cpm-party__action" title="تعديل" onClick={() => startEdit(p)}>
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  className="cpm-party__action cpm-party__action--danger"
                  title="حذف"
                  disabled={deletingId === p.id}
                  onClick={() => handleDelete(p.id)}
                >
                  {deletingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            ))}
          </div>

          {/* نموذج إضافة/تعديل */}
          <form onSubmit={handleSubmit} className="cpm-form">
            <div className="cpm-form__title">
              {editingId ? 'تعديل الطرف' : 'إضافة طرف'}
              {editingId && (
                <button type="button" className="cpm-form__cancel-edit" onClick={resetForm}>إلغاء التعديل</button>
              )}
            </div>

            <div className="cpm-side-pills">
              {SIDE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`cpm-side-pill cpm-side-pill--${opt.value} ${form.side === opt.value ? 'cpm-side-pill--active' : ''}`}
                  onClick={() => updateField('side', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="cpm-row">
              <div className="cpm-field cpm-field--grow">
                <label>اسم الطرف *</label>
                <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)}
                  placeholder="الاسم الكامل أو اسم الجهة" required />
              </div>
              <div className="cpm-field" style={{ width: 140 }}>
                <label>الصفة (اختياري)</label>
                <input type="text" value={form.role} onChange={(e) => updateField('role', e.target.value)}
                  placeholder={sideLabel(form.side)} />
              </div>
            </div>

            <div className="cpm-row">
              <div className="cpm-field cpm-field--grow">
                <label>رقم الهوية / السجل</label>
                <input type="text" value={form.national_id} onChange={(e) => updateField('national_id', e.target.value)}
                  placeholder="اختياري — يُفعّل تبويب الخصوم وتحليلهم" dir="ltr" />
              </div>
              <div className="cpm-field" style={{ width: 140 }}>
                <label>الجوال</label>
                <input type="text" value={form.phone} onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="اختياري" dir="ltr" />
              </div>
            </div>

            {showRepresents && (
              <div className="cpm-field">
                <label>يمثل من؟</label>
                <input type="text" value={form.represents} onChange={(e) => updateField('represents', e.target.value)}
                  placeholder="اسم الطرف الذي يمثله هذا المحامي/الوكيل" />
              </div>
            )}

            <div className="cpm-actions">
              <button type="button" className="cpm-btn cpm-btn--cancel" onClick={onClose}>إغلاق</button>
              <button type="submit" className="cpm-btn cpm-btn--submit" disabled={saving}>
                {saving
                  ? <><Loader2 size={15} className="animate-spin" /> جاري الحفظ...</>
                  : editingId
                    ? <><Pencil size={14} /> حفظ التعديل</>
                    : <><Plus size={15} /> إضافة الطرف</>}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CasePartiesModal;
