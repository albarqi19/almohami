/**
 * حقل إدخال رقم جوال دولي موحّد.
 *
 * - يعرض افتراضياً علم السعودية + «+966» ثم حقل إدخال باقي الرقم.
 * - الضغط على شارة الدولة يفتح قائمة دول قابلة للبحث للاختيار منها.
 * - القيمة المُصدَّرة عبر onChange دائماً بصيغة E.164 (+966501234567) أو '' إن فُرّغ.
 * - يقبل قيمة واردة بأي صيغة (E.164 / 05XXXXXXXX / +966…) ويهيّئ نفسه منها.
 *
 * بديل موحّد لكل <input type="tel"> المتفرّقة في النماذج.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { CountryCode } from 'libphonenumber-js';
import { COUNTRIES, DEFAULT_COUNTRY, composeE164, parsePhone, toAsciiDigits } from '../utils/phone';

interface PhoneFieldProps {
  value: string;
  onChange: (e164: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  autoFocus?: boolean;
  'aria-label'?: string;
}

export default function PhoneField({
  value,
  onChange,
  placeholder = '5X XXX XXXX',
  disabled = false,
  id,
  className,
  autoFocus,
  'aria-label': ariaLabel,
}: PhoneFieldProps) {
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [national, setNational] = useState('');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  // آخر قيمة صدّرها المكوّن — لتمييز «صدى كتابة المستخدم» عن «تهيئة خارجية حقيقية».
  const lastEmittedRef = useRef<string>('');

  const emit = (next: string) => {
    lastEmittedRef.current = next;
    onChange(next);
  };

  // مزامنة الحالة الداخلية عند تغيّر القيمة خارجياً فقط (تحميل/تصفير النموذج)،
  // وتجاهُل صدى ما صدّره المكوّن نفسه حتى لا يُمحى ما يكتبه المستخدم.
  useEffect(() => {
    if ((value || '') === lastEmittedRef.current) return;
    const composed = composeE164(country, national);
    if ((value || '') !== composed) {
      const parts = parsePhone(value);
      setCountry(parts.country);
      setNational(parts.national);
      lastEmittedRef.current = value || '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // إغلاق القائمة عند النقر خارجها أو بمفتاح Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = useMemo(
    () =>
      COUNTRIES.find((c) => c.code === country) ||
      (COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY) as (typeof COUNTRIES)[number]),
    [country]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    const qDigits = toAsciiDigits(q).replace(/[^\d]/g, '');
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (qDigits && c.dial.includes(qDigits))
    );
  }, [search]);

  const onNationalChange = (raw: string) => {
    // تطبيع الأرقام العربية-الهندية قبل التجريد حتى لا تُفقد مع لوحة المفاتيح العربية.
    const digits = toAsciiDigits(raw).replace(/[^\d]/g, '');
    setNational(digits);
    emit(composeE164(country, digits));
  };

  const pickCountry = (code: CountryCode) => {
    setCountry(code);
    setOpen(false);
    setSearch('');
    emit(composeE164(code, national));
  };

  return (
    <div className={`phone-field${className ? ' ' + className : ''}`} ref={rootRef} dir="ltr">
      <button
        type="button"
        className="phone-field__country"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-label={ariaLabel ? `رمز دولة ${ariaLabel}` : 'اختيار رمز الدولة'}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="phone-field__flag">{current.flag}</span>
        <span className="phone-field__dial">+{current.dial}</span>
        <ChevronDown size={14} className="phone-field__chevron" />
      </button>

      <input
        id={id}
        type="tel"
        inputMode="tel"
        className="phone-field__input"
        value={national}
        onChange={(e) => onNationalChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
      />

      {open && (
        <div className="phone-field__dropdown">
          <div className="phone-field__search">
            <Search size={14} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن دولة أو رمز"
              aria-label="ابحث عن دولة"
              dir="rtl"
            />
          </div>
          <ul className="phone-field__list" role="listbox">
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  className={`phone-field__option${c.code === country ? ' is-active' : ''}`}
                  onClick={() => pickCountry(c.code)}
                  role="option"
                  aria-selected={c.code === country}
                >
                  <span className="phone-field__flag">{c.flag}</span>
                  <span className="phone-field__name">{c.name}</span>
                  <span className="phone-field__dial">+{c.dial}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="phone-field__empty">لا نتائج</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
