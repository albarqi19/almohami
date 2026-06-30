import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import { hrService } from '../../services/hrService';
import { UserService } from '../../services/UserService';
import { EMPLOYMENT_TYPE_LABELS, EMPLOYEE_STATUS_LABELS } from '../../types/hr';
import type { EmployeeProfile, EmploymentType, EmployeeStatus } from '../../types/hr';

interface Props {
  emp: EmployeeProfile;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * تعديل بيانات ملف الموظف (الحقول التي تكون فارغة غالباً): التوظيف + البيانات الشخصية + الطوارئ.
 * الاسم/الجوال/الإيميل من حساب المستخدم (تُدار في «المستخدمون») لا هنا.
 */
export const EditEmployeeModal: React.FC<Props> = ({ emp, onClose, onSaved }) => {
  const [managers, setManagers] = useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employee_number: emp.employee_number || '',
    job_title: emp.job_title || '',
    department: emp.department || '',
    employment_type: (emp.employment_type || '') as EmploymentType | '',
    hire_date: emp.hire_date || '',
    status: (emp.status || 'active') as EmployeeStatus,
    manager_id: emp.manager_id ? String(emp.manager_id) : '',
    nationality: emp.nationality || '',
    birth_date: emp.birth_date || '',
    national_id_expiry_gregorian: emp.national_id_expiry_gregorian || '',
    emergency_contact_name: emp.emergency_contact_name || '',
    emergency_contact_phone: emp.emergency_contact_phone || '',
    annual_leave_entitlement: emp.annual_leave_entitlement != null ? String(emp.annual_leave_entitlement) : '',
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    UserService.getAllUsers({ exclude_role: 'client', limit: 100 })
      .then((res) => setManagers(((res.data as any) || []).map((u: any) => ({ id: String(u.id), name: u.name }))))
      .catch(() => { /* القائمة ثانوية */ });
  }, []);

  const submit = async () => {
    setSaving(true);
    try {
      await hrService.updateEmployee(emp.id, {
        employee_number: form.employee_number || null,
        job_title: form.job_title || null,
        department: form.department || null,
        employment_type: (form.employment_type || null) as EmploymentType | null,
        hire_date: form.hire_date || null,
        status: form.status,
        manager_id: form.manager_id ? Number(form.manager_id) : null,
        nationality: form.nationality || null,
        birth_date: form.birth_date || null,
        national_id_expiry_gregorian: form.national_id_expiry_gregorian || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        annual_leave_entitlement: form.annual_leave_entitlement ? Number(form.annual_leave_entitlement) : null,
      });
      toast.success('تم تحديث البيانات');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'فشل تحديث البيانات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="hr-modal-overlay" onClick={onClose}>
      <div className="hr-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="hr-modal__h">
          <h3>تعديل بيانات {emp.user?.name || 'الموظف'}</h3>
          <button className="hr-icon-btn" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </div>
        <div className="hr-modal__b">
          <div className="hr-ov__section-label" style={{ marginBottom: 2 }}>بيانات التوظيف</div>
          <div className="hr-field--row">
            <div className="hr-field">
              <label>المسمى الوظيفي</label>
              <input value={form.job_title} onChange={(e) => set('job_title', e.target.value)} placeholder="مثال: محامٍ أول" />
            </div>
            <div className="hr-field">
              <label>القسم</label>
              <input value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="مثال: المحاماة" />
            </div>
          </div>
          <div className="hr-field--row">
            <div className="hr-field">
              <label>الرقم الوظيفي</label>
              <input value={form.employee_number} onChange={(e) => set('employee_number', e.target.value)} />
            </div>
            <div className="hr-field">
              <label>نوع التعاقد</label>
              <select value={form.employment_type} onChange={(e) => set('employment_type', e.target.value)}>
                <option value="">—</option>
                {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="hr-field--row">
            <div className="hr-field">
              <label>تاريخ المباشرة</label>
              <input type="date" value={form.hire_date} onChange={(e) => set('hire_date', e.target.value)} />
            </div>
            <div className="hr-field">
              <label>الحالة الوظيفية</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                {Object.entries(EMPLOYEE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="hr-field--row">
            <div className="hr-field">
              <label>المدير المباشر</label>
              <select value={form.manager_id} onChange={(e) => set('manager_id', e.target.value)}>
                <option value="">—</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="hr-field">
              <label>الاستحقاق السنوي للإجازة (يوم)</label>
              <input type="number" min={0} max={365} value={form.annual_leave_entitlement} onChange={(e) => set('annual_leave_entitlement', e.target.value)} />
            </div>
          </div>

          <div className="hr-ov__section-label" style={{ margin: '6px 0 2px' }}>البيانات الشخصية</div>
          <div className="hr-field--row">
            <div className="hr-field">
              <label>الجنسية</label>
              <input value={form.nationality} onChange={(e) => set('nationality', e.target.value)} placeholder="مثال: سعودي" />
            </div>
            <div className="hr-field">
              <label>تاريخ الميلاد</label>
              <input type="date" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} />
            </div>
          </div>
          <div className="hr-field">
            <label>انتهاء الهوية/الإقامة</label>
            <input type="date" value={form.national_id_expiry_gregorian} onChange={(e) => set('national_id_expiry_gregorian', e.target.value)} />
          </div>

          <div className="hr-ov__section-label" style={{ margin: '6px 0 2px' }}>جهة الطوارئ</div>
          <div className="hr-field--row">
            <div className="hr-field">
              <label>الاسم</label>
              <input value={form.emergency_contact_name} onChange={(e) => set('emergency_contact_name', e.target.value)} />
            </div>
            <div className="hr-field">
              <label>الجوال</label>
              <input value={form.emergency_contact_phone} onChange={(e) => set('emergency_contact_phone', e.target.value)} dir="ltr" />
            </div>
          </div>
        </div>
        <div className="hr-modal__f">
          <button className="hr-btn" onClick={onClose} disabled={saving}>إلغاء</button>
          <button className="hr-btn hr-btn--primary" onClick={submit} disabled={saving}>{saving ? 'جارٍ الحفظ…' : 'حفظ'}</button>
        </div>
      </div>
    </div>
  );
};

export default EditEmployeeModal;
