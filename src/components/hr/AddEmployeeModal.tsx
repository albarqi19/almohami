import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import { hrService } from '../../services/hrService';
import { UserService } from '../../services/UserService';
import { EMPLOYMENT_TYPE_LABELS } from '../../types/hr';
import type { EmploymentType } from '../../types/hr';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

/**
 * إضافة منسوب: ربط ملف موارد بشرية بمستخدم داخلي قائم (غير عميل).
 * الباك يمنع إنشاء ملف لعميل أو تكراره (422).
 */
export const AddEmployeeModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const [users, setUsers] = useState<Array<{ id: string; name: string; role?: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    user_id: '',
    job_title: '',
    department: '',
    employment_type: '' as EmploymentType | '',
    hire_date: '',
  });

  useEffect(() => {
    UserService.getAllUsers({ exclude_role: 'client', limit: 100 })
      .then((res) => setUsers((res.data as any) || []))
      .catch(() => toast.error('تعذّر جلب المستخدمين'))
      .finally(() => setLoadingUsers(false));
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.user_id) {
      toast.error('اختر المستخدم أولاً');
      return;
    }
    setSaving(true);
    try {
      await hrService.createEmployee({
        user_id: Number(form.user_id),
        job_title: form.job_title || undefined,
        department: form.department || undefined,
        employment_type: (form.employment_type || undefined) as EmploymentType | undefined,
        hire_date: form.hire_date || undefined,
      });
      toast.success('تم إنشاء ملف الموظف');
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'فشل إنشاء الملف');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="hr-modal-overlay" onClick={onClose}>
      <div className="hr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hr-modal__h">
          <h3>إضافة منسوب جديد</h3>
          <button className="hr-icon-btn" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </div>
        <div className="hr-modal__b">
          <div className="hr-field">
            <label>المستخدم *</label>
            <select value={form.user_id} onChange={(e) => set('user_id', e.target.value)} disabled={loadingUsers}>
              <option value="">{loadingUsers ? 'جارٍ التحميل…' : 'اختر مستخدماً'}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}{u.role ? ` — ${u.role}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="hr-field">
            <label>المسمى الوظيفي</label>
            <input value={form.job_title} onChange={(e) => set('job_title', e.target.value)} placeholder="مثال: محامٍ أول" />
          </div>
          <div className="hr-field--row">
            <div className="hr-field">
              <label>القسم</label>
              <input value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="مثال: المحاماة" />
            </div>
            <div className="hr-field">
              <label>نوع التعاقد</label>
              <select value={form.employment_type} onChange={(e) => set('employment_type', e.target.value)}>
                <option value="">—</option>
                {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="hr-field">
            <label>تاريخ المباشرة</label>
            <input type="date" value={form.hire_date} onChange={(e) => set('hire_date', e.target.value)} />
          </div>
        </div>
        <div className="hr-modal__f">
          <button className="hr-btn" onClick={onClose}>إلغاء</button>
          <button className="hr-btn hr-btn--primary" onClick={submit} disabled={saving}>
            {saving ? 'جارٍ الحفظ…' : 'إنشاء الملف'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
