import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Building2, X } from 'lucide-react';
import ClientManagementService, { CLIENT_LANGUAGES } from '../services/clientManagementService';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type EntityType = 'individual' | 'company';

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--color-text)',
  marginBottom: '4px',
  lineHeight: 1.4,
};

const fieldInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  fontSize: '13px',
  color: 'var(--color-text)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  lineHeight: 1.4,
  outline: 'none',
};

const requiredStarStyle: React.CSSProperties = {
  color: '#dc2626',
  fontWeight: 700,
  marginInlineStart: '2px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--color-text-secondary)',
  letterSpacing: '0.04em',
  marginBottom: '8px',
  paddingBottom: '4px',
  borderBottom: '1px dashed var(--color-border)',
};

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [form, setForm] = useState({
    entity_type: 'individual' as EntityType,
    classification: '' as '' | 'vip' | 'regular' | 'one_time',
    preferred_language: 'ar',
    name: '',
    national_id: '',
    email: '',
    phone: '',
    commercial_registration: '',
    vat_number: '',
    national_address: '',
    industry: '',
    legal_representative: '',
    point_of_contact_name: '',
    point_of_contact_phone: '',
    point_of_contact_email: '',
  });

  const isCompany = form.entity_type === 'company';

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [k]: v }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setModalError(null);
    setSubmitting(true);

    const payload: any = {
      name: form.name.trim(),
      national_id: form.national_id.trim(),
      entity_type: form.entity_type,
    };
    if (form.email) payload.email = form.email.trim();
    if (form.phone) payload.phone = form.phone.trim();
    if (form.classification) payload.classification = form.classification;
    payload.preferred_language = form.preferred_language || 'ar';

    // تحقّق الرقم الضريبي (VAT) — مطلوب للفوترة الإلكترونية B2B: 15 رقماً يبدأ وينتهي بـ 3.
    if (isCompany && form.vat_number.trim() && !/^3\d{13}3$/.test(form.vat_number.trim())) {
      setModalError('الرقم الضريبي يجب أن يكون 15 رقماً يبدأ وينتهي بالرقم 3 (مطلوب للفوترة الإلكترونية B2B).');
      setSubmitting(false);
      return;
    }

    if (isCompany) {
      if (form.commercial_registration) payload.commercial_registration = form.commercial_registration.trim();
      if (form.vat_number) payload.vat_number = form.vat_number.trim();
      if (form.national_address) payload.national_address = form.national_address.trim();
      if (form.industry) payload.industry = form.industry.trim();
      if (form.legal_representative) payload.legal_representative = form.legal_representative.trim();
      if (form.point_of_contact_name) payload.point_of_contact_name = form.point_of_contact_name.trim();
      if (form.point_of_contact_phone) payload.point_of_contact_phone = form.point_of_contact_phone.trim();
      if (form.point_of_contact_email) payload.point_of_contact_email = form.point_of_contact_email.trim();
    }

    try {
      const result = await ClientManagementService.createClient(payload);
      alert(`تم إنشاء العميل بنجاح ✅\n\nرقم الهوية: ${payload.national_id}\nالرقم السري: ${result.pin}\n\nتم إرسال الرسالة عبر واتساب (إن كان الجهاز متصلاً ورقم الهاتف صحيحاً).`);
      onCreated();
      onClose();
    } catch (err: any) {
      let msg = 'تعذّر إنشاء العميل';
      if (err?.errors && typeof err.errors === 'object') {
        const labels: Record<string, string> = {
          name: 'الاسم',
          national_id: 'رقم الهوية',
          email: 'البريد الإلكتروني',
          phone: 'رقم الهاتف',
          entity_type: 'نوع العميل',
          vat_number: 'الرقم الضريبي',
          national_address: 'العنوان الوطني',
        };
        msg = Object.entries(err.errors)
          .map(([field, msgs]: [string, any]) => {
            const label = labels[field] || field;
            const raw = Array.isArray(msgs) ? msgs[0] : String(msgs);
            const arabic = /already been taken/i.test(raw)
              ? 'مستخدم مسبقاً (مسجّل في النظام)'
              : /required/i.test(raw)
              ? 'حقل مطلوب'
              : /invalid|format/i.test(raw)
              ? 'قيمة غير صالحة'
              : raw;
            return `• ${label}: ${arabic}`;
          })
          .join('\n');
      } else if (err?.message) {
        msg = err.message;
      }
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '10px',
          padding: 0,
          maxWidth: '780px',
          width: '94%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <div>
            <h3 style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--color-text)',
              margin: 0,
              lineHeight: 1.3,
            }}>
              إضافة عميل جديد
            </h3>
            <p style={{
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              margin: '3px 0 0 0',
              lineHeight: 1.3,
            }}>
              تسجيل عميل جديد في النظام (فرد أو شركة أو مؤسسة)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              color: 'var(--color-text-secondary)',
              fontSize: '20px',
              lineHeight: 1,
              marginRight: '-8px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {modalError && (
            <div style={{
              backgroundColor: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              borderRadius: '6px',
              padding: '10px 12px',
              marginBottom: '14px',
              color: '#dc2626',
              fontSize: '12px',
              whiteSpace: 'pre-line',
              lineHeight: 1.6,
            }}>
              <strong style={{ display: 'block', marginBottom: '3px', fontSize: '12px' }}>تعذّر الحفظ:</strong>
              {modalError}
            </div>
          )}

          <form id="add-client-form" onSubmit={handleSubmit}>
            {/* Entity type pills */}
            <div style={{ marginBottom: '14px' }}>
              <div style={sectionTitleStyle}>نوع العميل</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {([
                  { type: 'individual' as EntityType, label: 'فرد', icon: User },
                  { type: 'company' as EntityType, label: 'شركة / مؤسسة', icon: Building2 },
                ]).map(({ type, label, icon: Icon }) => {
                  const active = form.entity_type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => set('entity_type', type)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: active ? 600 : 500,
                        color: active ? 'white' : 'var(--color-text)',
                        backgroundColor: active ? 'var(--color-primary)' : 'var(--color-surface)',
                        border: '1px solid ' + (active ? 'var(--color-primary)' : 'var(--color-border)'),
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section: المعلومات الأساسية */}
            <div style={{ marginBottom: '14px' }}>
              <div style={sectionTitleStyle}>
                {isCompany ? 'بيانات الكيان' : 'المعلومات الأساسية'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={fieldLabelStyle}>
                    {isCompany ? 'اسم الشركة/المؤسسة' : 'الاسم الكامل'}
                    <span style={requiredStarStyle}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    required
                    placeholder={isCompany ? 'مثال: شركة الراشد للمحاماة' : 'مثال: محمد عبدالله'}
                    style={fieldInputStyle}
                  />
                </div>
                <div>
                  <label style={fieldLabelStyle}>
                    {isCompany ? 'الرقم الموحّد / السجل' : 'رقم الهوية الوطنية'}
                    <span style={requiredStarStyle}>*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.national_id}
                    onChange={(e) => set('national_id', e.target.value)}
                    required
                    placeholder="10 أرقام"
                    style={fieldInputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Section: التواصل */}
            <div style={{ marginBottom: '14px' }}>
              <div style={sectionTitleStyle}>معلومات التواصل</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={fieldLabelStyle}>رقم الهاتف (واتساب)</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="05xxxxxxxx"
                    style={fieldInputStyle}
                  />
                </div>
                <div>
                  <label style={fieldLabelStyle}>البريد الإلكتروني</label>
                  <input
                    type="email"
                    dir="ltr"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="example@domain.com"
                    style={fieldInputStyle}
                  />
                </div>
                <div>
                  <label style={fieldLabelStyle}>التصنيف</label>
                  <select
                    value={form.classification}
                    onChange={(e) => set('classification', e.target.value as any)}
                    style={fieldInputStyle}
                  >
                    <option value="">— غير محدد —</option>
                    <option value="vip">VIP</option>
                    <option value="regular">منتظم</option>
                    <option value="one_time">لمرة واحدة</option>
                  </select>
                </div>
                <div>
                  <label style={fieldLabelStyle}>لغة العميل</label>
                  <select
                    value={form.preferred_language}
                    onChange={(e) => set('preferred_language', e.target.value)}
                    style={fieldInputStyle}
                  >
                    {CLIENT_LANGUAGES.map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section: بيانات قانونية (فقط للشركة/المؤسسة) */}
            {isCompany && (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <div style={sectionTitleStyle}>البيانات القانونية والتنظيمية</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={fieldLabelStyle}>السجل التجاري</label>
                      <input
                        type="text"
                        value={form.commercial_registration}
                        onChange={(e) => set('commercial_registration', e.target.value)}
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={fieldLabelStyle}>الرقم الضريبي (VAT)</label>
                      <input
                        type="text"
                        value={form.vat_number}
                        onChange={(e) => set('vat_number', e.target.value)}
                        placeholder="3XXXXXXXXXXXXX3"
                        dir="ltr"
                        maxLength={15}
                        style={{
                          ...fieldInputStyle,
                          ...(form.vat_number.trim() && !/^3\d{13}3$/.test(form.vat_number.trim())
                            ? { borderColor: 'var(--status-red, #dc2626)' }
                            : {}),
                        }}
                      />
                      {form.vat_number.trim() && !/^3\d{13}3$/.test(form.vat_number.trim()) ? (
                        <span style={{ fontSize: '11px', color: 'var(--status-red, #dc2626)' }}>
                          15 رقماً تبدأ وتنتهي بالرقم 3
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #6b7280)' }}>
                          مطلوب للفوترة الإلكترونية B2B — 15 رقماً تبدأ وتنتهي بالرقم 3
                        </span>
                      )}
                    </div>
                    <div>
                      <label style={fieldLabelStyle}>الصناعة / النشاط</label>
                      <input
                        type="text"
                        value={form.industry}
                        onChange={(e) => set('industry', e.target.value)}
                        placeholder="مثال: تقنية، مقاولات، خدمات"
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={fieldLabelStyle}>الممثل القانوني</label>
                      <input
                        type="text"
                        value={form.legal_representative}
                        onChange={(e) => set('legal_representative', e.target.value)}
                        style={fieldInputStyle}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={fieldLabelStyle}>العنوان الوطني</label>
                      <input
                        type="text"
                        value={form.national_address}
                        onChange={(e) => set('national_address', e.target.value)}
                        style={fieldInputStyle}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: جهة الاتصال */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={sectionTitleStyle}>جهة الاتصال (Point of Contact)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={fieldLabelStyle}>اسم الشخص</label>
                      <input
                        type="text"
                        value={form.point_of_contact_name}
                        onChange={(e) => set('point_of_contact_name', e.target.value)}
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={fieldLabelStyle}>الجوال</label>
                      <input
                        type="tel"
                        dir="ltr"
                        value={form.point_of_contact_phone}
                        onChange={(e) => set('point_of_contact_phone', e.target.value)}
                        placeholder="05xxxxxxxx"
                        style={fieldInputStyle}
                      />
                    </div>
                    <div>
                      <label style={fieldLabelStyle}>البريد الإلكتروني</label>
                      <input
                        type="email"
                        dir="ltr"
                        value={form.point_of_contact_email}
                        onChange={(e) => set('point_of_contact_email', e.target.value)}
                        style={fieldInputStyle}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Helper info — يوضّح وجهة الـ PIN حسب نوع العميل */}
            <div style={{
              marginTop: '6px',
              padding: '10px 12px',
              backgroundColor: 'rgba(59, 130, 246, 0.06)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '6px',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: 1.6,
            }}>
              <span style={{ color: '#3b82f6', flexShrink: 0, fontWeight: 700 }}>ⓘ</span>
              <div>
                <strong style={{ color: 'var(--color-text)' }}>وجهة رسالة الترحيب:</strong>{' '}
                {isCompany ? (
                  <>
                    سيتم توليد PIN وإرساله عبر واتساب على{' '}
                    <strong style={{ color: 'var(--color-text)' }}>جوال جهة الاتصال (الممثل)</strong>
                    {' '}— وإن لم يُحدَّد فعلى رقم الشركة الأساسي.
                  </>
                ) : (
                  <>
                    سيتم توليد PIN وإرساله عبر واتساب على رقم الهاتف المُسجَّل أعلاه.
                  </>
                )}
              </div>
            </div>

            {/* Helper info — لغة العميل ومقصدها */}
            <div style={{
              marginTop: '8px',
              padding: '10px 12px',
              backgroundColor: 'rgba(59, 130, 246, 0.06)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '6px',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: 1.6,
            }}>
              <span style={{ color: '#3b82f6', flexShrink: 0, fontWeight: 700 }}>ⓘ</span>
              <div>
                <strong style={{ color: 'var(--color-text)' }}>لغة العميل:</strong>{' '}
                رسائل النظام (الإفادات، تحديثات القضية، التذكيرات) تُرسل دائماً{' '}
                <strong style={{ color: 'var(--color-text)' }}>بالعربية</strong>. إذا كانت لغة العميل غير العربية،
                تُضاف تحت النص العربي ترجمة قانونية آلية بلغته. الأصل والافتراضي: العربية.
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end',
          padding: '12px 20px',
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'rgba(0,0,0,0.015)',
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '8px 18px',
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="add-client-form"
            disabled={submitting}
            style={{
              padding: '8px 22px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'white',
              backgroundColor: 'var(--color-primary)',
              border: 'none',
              borderRadius: '6px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'جارٍ الحفظ...' : 'إضافة العميل'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AddClientModal;
