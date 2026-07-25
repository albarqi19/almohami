import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import PhoneField from '../PhoneField';
import type { AttendeeInput } from '../../services/meetingService';

interface Props {
  guests: AttendeeInput[];
  onChange: (guests: AttendeeInput[]) => void;
  disabled?: boolean;
}

const emptyGuest = (): AttendeeInput => ({
  type: 'external',
  name: '',
  email: '',
  phone: '',
  // مطفأة افتراضياً: الموافقة على مراسلة رقمٍ لم يطلب التواصل تُؤخذ صراحةً
  notify_opted_in: false,
});

/**
 * محرّر المشاركين الخارجيين — من ليس له حساب في النظام.
 *
 * نصّ المالك: «شخص يكتب اسمه **واذا امكن** جواله او ايميله» — فالاسم وحده
 * إلزامي، والقناتان اختياريتان. لكن غيابهما يعني أن الشخص لن يصله شيء، وهو
 * ما يُقال صراحةً في التلميح بدل أن يُكتشف بعد الاجتماع.
 */
const ExternalGuestsEditor: React.FC<Props> = ({ guests, onChange, disabled }) => {
  const update = (index: number, patch: Partial<AttendeeInput>) => {
    onChange(guests.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  };

  return (
    <div className="mfm-guests">
      {guests.length === 0 && (
        <p className="mfm-guests__hint">
          لا مشاركين من خارج المكتب. أضِف من يحضر بلا حساب في النظام — خبيراً أو جهة أو طرفاً مقابلاً.
        </p>
      )}

      {guests.map((guest, index) => {
        const reachable = Boolean(guest.email || guest.phone);

        return (
          <div key={index} className="mfm-guest">
            <div className="mfm-guest__head">
              <span className="mfm-guest__index">مشارك خارجي {index + 1}</span>
              <button
                type="button"
                className="fin-btn fin-btn--ghost fin-btn--sm"
                onClick={() => onChange(guests.filter((_, i) => i !== index))}
                disabled={disabled}
                aria-label={`حذف المشارك ${index + 1}`}
              >
                <Trash2 size={13} />
              </button>
            </div>

            <div className="fin-grid fin-grid--2">
              <div className="fin-field">
                <label className="fin-field__label">الاسم <span className="req">*</span></label>
                <input
                  className="fin-input"
                  value={guest.name ?? ''}
                  onChange={(e) => update(index, { name: e.target.value })}
                  placeholder="اسم المشارك"
                  disabled={disabled}
                />
              </div>

              <div className="fin-field">
                <label className="fin-field__label">البريد الإلكتروني</label>
                <input
                  className="fin-input"
                  type="email"
                  value={guest.email ?? ''}
                  onChange={(e) => update(index, { email: e.target.value })}
                  placeholder="name@example.com"
                  disabled={disabled}
                  dir="ltr"
                />
              </div>
            </div>

            {/* الهاتف في حقل كامل العرض: PhoneField يفتح قائمة دول قابلة
                للبحث، وحشره في عمود ضيّق يجعلها غير قابلة للاستعمال. */}
            <div className="fin-field">
              <label className="fin-field__label">الجوال</label>
              <PhoneField
                value={guest.phone ?? ''}
                onChange={(e164) => update(index, { phone: e164 })}
                disabled={disabled}
                aria-label={`جوال المشارك ${index + 1}`}
              />
            </div>

            {reachable ? (
              <label className="mfm-guest__consent">
                <input
                  type="checkbox"
                  className="fin-checkbox"
                  checked={Boolean(guest.notify_opted_in)}
                  onChange={(e) => update(index, { notify_opted_in: e.target.checked })}
                  disabled={disabled || !guest.phone}
                />
                <span>
                  أرسل له تنبيه واتساب
                  <em>
                    {guest.phone
                      ? ' — يُرسل فقط بموافقتك هنا. البريد ودعوة التقويم تُرسل على أي حال.'
                      : ' — يحتاج رقم جوال.'}
                  </em>
                </span>
              </label>
            ) : (
              <p className="mfm-guest__warn">
                بلا بريد ولا جوال لن يصله تنبيه ولا رابط الاجتماع — سيُسجَّل حضوره توثيقياً فقط.
              </p>
            )}
          </div>
        );
      })}

      <button
        type="button"
        className="fin-btn fin-btn--ghost fin-btn--sm"
        onClick={() => onChange([...guests, emptyGuest()])}
        disabled={disabled}
      >
        <Plus size={13} /> إضافة مشارك خارجي
      </button>
    </div>
  );
};

export default ExternalGuestsEditor;
