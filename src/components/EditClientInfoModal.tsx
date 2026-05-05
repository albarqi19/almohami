import React, { useState, useEffect } from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import Modal from './Modal';
import ClientManagementService, {
  type Client,
  type UpdateClientPayload,
} from '../services/clientManagementService';

interface EditClientInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onSaved: (updated: Client) => void;
}

const EditClientInfoModal: React.FC<EditClientInfoModalProps> = ({ isOpen, onClose, client, onSaved }) => {
  const [form, setForm] = useState<UpdateClientPayload>(() => buildInitial(client));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitial(client));
      setError(null);
    }
  }, [isOpen, client]);

  const isCompany = form.entity_type === 'company' || form.entity_type === 'organization';

  const set = <K extends keyof UpdateClientPayload>(k: K, v: UpdateClientPayload[K]) => {
    setForm(prev => ({ ...prev, [k]: v }));
  };

  const handleSave = async () => {
    setError(null);
    if (form.phone && !/^05[0-9]{8}$/.test(form.phone)) {
      setError('رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
      return;
    }
    setSaving(true);
    try {
      const updated = await ClientManagementService.updateClient(client.id, form);
      onSaved(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تعديل بيانات العميل" size="md">
      <div className="edit-client-modal">
        {error && <div className="edit-client-modal__error">{error}</div>}

        <div className="edit-client-modal__group">
          <label>نوع العميل</label>
          <div className="edit-client-modal__pills">
            {(['individual', 'company', 'organization'] as const).map(t => (
              <button
                key={t}
                type="button"
                className={`edit-client-modal__pill ${form.entity_type === t ? 'is-active' : ''}`}
                onClick={() => set('entity_type', t)}
              >
                {entityLabel(t)}
              </button>
            ))}
          </div>
        </div>

        <Field label="الاسم">
          <input type="text" value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
        </Field>

        <Field label="الجوال" hint="يجب أن يبدأ بـ 05">
          <input type="tel" dir="ltr" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="05xxxxxxxx" />
        </Field>

        <Field label="التصنيف">
          <select value={form.classification ?? ''} onChange={(e) => set('classification', (e.target.value || undefined) as any)}>
            <option value="">— غير محدد —</option>
            <option value="vip">VIP</option>
            <option value="regular">منتظم</option>
            <option value="one_time">لمرة واحدة</option>
          </select>
        </Field>

        {isCompany && (
          <>
            <div className="edit-client-modal__divider">بيانات الكيان القانوني</div>

            <div className="edit-client-modal__row">
              <Field label="السجل التجاري">
                <input type="text" value={form.commercial_registration ?? ''} onChange={(e) => set('commercial_registration', e.target.value)} />
              </Field>
              <Field label="الرقم الضريبي">
                <input type="text" value={form.vat_number ?? ''} onChange={(e) => set('vat_number', e.target.value)} />
              </Field>
            </div>

            <Field label="العنوان الوطني">
              <input type="text" value={form.national_address ?? ''} onChange={(e) => set('national_address', e.target.value)} />
            </Field>

            <div className="edit-client-modal__row">
              <Field label="الصناعة">
                <input type="text" value={form.industry ?? ''} onChange={(e) => set('industry', e.target.value)} />
              </Field>
              <Field label="الممثل القانوني">
                <input type="text" value={form.legal_representative ?? ''} onChange={(e) => set('legal_representative', e.target.value)} />
              </Field>
            </div>

            <div className="edit-client-modal__divider">جهة الاتصال (Point of Contact)</div>

            <Field label="الاسم">
              <input type="text" value={form.point_of_contact_name ?? ''} onChange={(e) => set('point_of_contact_name', e.target.value)} />
            </Field>
            <div className="edit-client-modal__row">
              <Field label="الجوال">
                <input type="tel" dir="ltr" value={form.point_of_contact_phone ?? ''} onChange={(e) => set('point_of_contact_phone', e.target.value)} />
              </Field>
              <Field label="البريد الإلكتروني">
                <input type="email" dir="ltr" value={form.point_of_contact_email ?? ''} onChange={(e) => set('point_of_contact_email', e.target.value)} />
              </Field>
            </div>
          </>
        )}

        <div className="edit-client-modal__actions">
          <button type="button" className="edit-client-modal__btn" onClick={onClose} disabled={saving}>
            <X size={14} /> إلغاء
          </button>
          <button type="button" className="edit-client-modal__btn edit-client-modal__btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="spinning" /> : <Save size={14} />}
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="edit-client-modal__group">
    <label>{label}{hint && <span className="edit-client-modal__hint"> ({hint})</span>}</label>
    {children}
  </div>
);

function buildInitial(client: Client): UpdateClientPayload {
  return {
    name: client.name ?? '',
    phone: client.phone ?? '',
    entity_type: client.entity_type ?? 'individual',
    commercial_registration: client.commercial_registration ?? '',
    vat_number: client.vat_number ?? '',
    national_address: client.national_address ?? '',
    industry: client.industry ?? '',
    legal_representative: client.legal_representative ?? '',
    point_of_contact_name: client.point_of_contact_name ?? '',
    point_of_contact_phone: client.point_of_contact_phone ?? '',
    point_of_contact_email: client.point_of_contact_email ?? '',
  };
}

function entityLabel(t: 'individual' | 'company' | 'organization'): string {
  return { individual: 'فرد', company: 'شركة', organization: 'مؤسسة' }[t];
}

export default EditClientInfoModal;
