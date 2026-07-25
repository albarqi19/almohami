import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import {
  HIJRI_MAX_YEAR,
  HIJRI_MIN_YEAR,
  HIJRI_MONTHS_AR,
  HIJRI_OK,
  gregorianToHijriParts,
  hijriMonthLength,
  hijriToGregorian,
} from '../../utils/hijriDate';
import { fmtDualAr } from '../../utils/dateAr';

type CalendarMode = 'gregorian' | 'hijri';

const PREF_KEY = 'pref.dateCalendar';

interface Props {
  /** القيمة دائماً ميلادية «YYYY-MM-DD» — الهجري طريقة إدخال لا نوع بيانات. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  min?: string;
  disabled?: boolean;
  /** يُخفي سطر الصدى حين يكون الحقل داخل صفّ ضيّق. */
  compact?: boolean;
}

/**
 * حقل تاريخ بتقويمين — الافتراضي **ميلادي** والهجري محوِّل اختياري.
 *
 * قراران يستحقّان التوضيح:
 *
 * 1) وضع الهجري **ثلاث قوائم** لا حقل نصّي حرّ. الحقل الحرّ يفتح باب الأرقام
 *    العربية-الهندية والفواصل المختلفة و«١٤٤٨/١٣/٤٥»، ويُحوّل كل إدخال إلى
 *    تمرين تحقّق. القوائم تجعل الحالة غير الصالحة غير قابلة للتمثيل أصلاً.
 *
 * 2) اليوم يُقصّ لا يُرفض: من اختار ٣٠ ثم بدّل إلى شهر من ٢٩ يوماً يصير
 *    اختياره ٢٩ بهدوء. الرفض هنا يعاقب المستخدم على ترتيب نقراته.
 */
const DualDateInput: React.FC<Props> = ({ value, onChange, id, min, disabled, compact }) => {
  const [mode, setMode] = useState<CalendarMode>(() => {
    if (!HIJRI_OK) return 'gregorian';
    return (localStorage.getItem(PREF_KEY) as CalendarMode) === 'hijri' ? 'hijri' : 'gregorian';
  });

  useEffect(() => {
    localStorage.setItem(PREF_KEY, mode);
  }, [mode]);

  // أجزاء هجرية مشتقّة من القيمة الميلادية — مصدر حقيقة واحد، فلا تنجرف
  // الحالتان عن بعضهما عند التبديل ذهاباً وإياباً.
  const parts = useMemo(() => (value ? gregorianToHijriParts(value) : null), [value]);

  const years = useMemo(() => {
    const current = parts?.hy ?? 1447;
    const from = Math.max(HIJRI_MIN_YEAR, current - 3);
    const to = Math.min(HIJRI_MAX_YEAR, current + 5);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [parts?.hy]);

  const daysInMonth = useMemo(() => {
    if (!parts) return 30;
    return hijriMonthLength(parts.hy, parts.hm) ?? 30;
  }, [parts?.hy, parts?.hm]);

  const applyHijri = (hy: number, hm: number, hd: number) => {
    const gregorian = hijriToGregorian(hy, hm, hd);
    if (gregorian) onChange(gregorian);
  };

  return (
    <div className={`ddi${compact ? ' ddi--compact' : ''}`}>
      <div className="ddi__head">
        <div className="ddi__toggle" role="group" aria-label="نوع التقويم">
          <button
            type="button"
            className={`ddi__tab${mode === 'gregorian' ? ' is-active' : ''}`}
            onClick={() => setMode('gregorian')}
            aria-pressed={mode === 'gregorian'}
          >
            ميلادي
          </button>
          <button
            type="button"
            className={`ddi__tab${mode === 'hijri' ? ' is-active' : ''}`}
            onClick={() => setMode('hijri')}
            aria-pressed={mode === 'hijri'}
            disabled={!HIJRI_OK}
            title={HIJRI_OK ? undefined : 'متصفحك لا يدعم تقويم أم القرى — استعمل الميلادي'}
          >
            هجري
          </button>
        </div>
      </div>

      {mode === 'gregorian' || !parts ? (
        <input
          id={id}
          type="date"
          className="ddi__date"
          value={value}
          min={min}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className="ddi__hijri">
          <select
            className="ddi__select"
            value={parts.hd}
            disabled={disabled}
            aria-label="اليوم"
            onChange={(e) => applyHijri(parts.hy, parts.hm, Number(e.target.value))}
          >
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            className="ddi__select ddi__select--month"
            value={parts.hm}
            disabled={disabled}
            aria-label="الشهر"
            onChange={(e) => applyHijri(parts.hy, Number(e.target.value), parts.hd)}
          >
            {HIJRI_MONTHS_AR.map((name, i) => (
              <option key={name} value={i + 1}>{name}</option>
            ))}
          </select>

          <select
            className="ddi__select"
            value={parts.hy}
            disabled={disabled}
            aria-label="السنة"
            onChange={(e) => applyHijri(Number(e.target.value), parts.hm, parts.hd)}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y} هـ</option>
            ))}
          </select>
        </div>
      )}

      {/* سطر الصدى: التاريخان معاً دائماً — تأكيدٌ بصري يمنع «اخترت هجرياً
          وحُفظ شيء آخر»، ويبقى ظاهراً في الوضعين. */}
      {!compact && value && (
        <div className="ddi__echo">
          <CalendarDays size={12} aria-hidden="true" />
          <span>{fmtDualAr(value)}</span>
        </div>
      )}
    </div>
  );
};

export default DualDateInput;
