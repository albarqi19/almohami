import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { CalendarClock, X } from 'lucide-react';

import { ATTENDANCE_RECOMPUTE_MAX_DAYS } from '../../../types/hr';
import type { AttendanceRecomputeResult } from '../../../types/hr';
import {
  ENGINE_RUN_CLOCK,
  addDaysISO,
  daysBetweenISO,
  daysWord,
  errorText,
  fmtCount,
  fmtDate,
  peopleWord,
  todayISO,
} from './attendanceFormat';
import { useRecompute } from './useAttendanceSetup';

/**
 * **إعادةُ الاحتساب — وسمٌ فقط، والمحرّكُ يصرفه ليلاً.**
 *
 * ══════ 🔴 لماذا يقول هذا المودالُ «ليلاً» في ثلاثة مواضع ══════
 * الطلبُ **لا يشغّل المُحلِّل**: ٢٠٠ ملفٍّ × ٣١ يوماً = ٦٬٢٠٠ خليّةٍ لكلٍّ منها تحميلُ وقائعَ
 * وكتابةٌ محتملة، وطلبُ HTTP يحمل ذلك يتجاوز مهلةَ الخادم فيقطع في المنتصف تاركاً نصفَ
 * المدى محتسَباً ونصفَه لا. فالوسمُ ثابتُ الزمن، والمحرّكُ مقودٌ بالتاريخ لا بالتشغيلة.
 *
 * وأثرُ ذلك على الإنسان هو ما يبرّر التكرار: مديرٌ يضغط «أعِد الاحتساب» ثمّ ينظر إلى رقمٍ
 * **لا يتغيّر أمامه** يظنّ الزرَّ معطوباً فيعيد الضغطَ مرّاتٍ — والخانقُ `throttle:3,1` يردّه
 * عندها بـ٤٢٩ فيتأكّد ظنُّه. فالجملةُ تُقال قبل الضغط، وفي زرّ الترويسة، وفي ردّ النجاح
 * حاملاً `engine_runs_at` من الخادم لا من حسابٍ محلّيّ.
 *
 * 🚫 **ولا إبطالَ لاستعلامٍ بعد النجاح**: إعادةُ جلبِ الأرقام نفسِها تُقرأ «تحديثاً لم يفعل
 * شيئاً» — وهي بالضبط ما يجعل المديرَ يظنّ الطلبَ فاشلاً.
 */

interface Props {
  /** حين يكون في الشاشة موظفٌ مُحدَّدٌ — يُعرَض قصرُ المدى عليه خياراً صريحاً لا ضمناً. */
  employee: { id: number; name: string | null } | null;
  onClose: () => void;
}

export const RecomputeModal: React.FC<Props> = ({ employee, onClose }) => {
  const yesterday = addDaysISO(todayISO(), -1);

  const [from, setFrom] = useState(addDaysISO(yesterday, -6));
  const [to, setTo] = useState(yesterday);
  const [onlyOne, setOnlyOne] = useState(employee !== null);
  const [result, setResult] = useState<AttendanceRecomputeResult | null>(null);

  const recompute = useRecompute();

  /** عددُ أيام المدى — تقويميّاً، وهو ما يقيسه الخادمُ بالضبط قبل سقفِ الـ٣١. */
  const span = useMemo(() => daysBetweenISO(from, to), [from, to]);

  const tooLong = span !== null && span > ATTENDANCE_RECOMPUTE_MAX_DAYS;
  const inverted = from > to;
  const future = from > yesterday;

  const submit = async () => {
    if (span === null || inverted) {
      toast.error('اكتب مدى صحيحا. يجب أن تكون البداية قبل النهاية.');
      return;
    }

    if (future) {
      toast.error('لا يعاد احتساب يوم لم يقع بعد.');
      return;
    }

    if (tooLong) {
      toast.error(`الحد الأقصى من هذه الشاشة ${ATTENDANCE_RECOMPUTE_MAX_DAYS} يوما. اختصر المدة.`);
      return;
    }

    try {
      const data = await recompute.mutateAsync({
        from,
        to,
        employee_profile_id: onlyOne && employee !== null ? employee.id : null,
      });

      setResult(data);
      toast.success(data.message);
    } catch (e) {
      toast.error(errorText(e, 'فشل في طلب إعادة الاحتساب'));
    }
  };

  return (
    <div className="hr-modal-overlay" onClick={onClose}>
      <div className="hr-modal hra-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hr-modal__h">
          <h3>إعادة احتساب مدى</h3>
          <button type="button" className="hr-icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="hr-modal__b">
          {result === null ? (
            <>
              <p className="hra-hint">
                يعاد احتساب أيام محتسبة مسبقا بعد تغيير رجعي (إجازة مسجلة متأخرا ·
                عطلة معتمدة · جدول مسند بأثر رجعي). والمحرك <strong>يكتب ما تغير
                فقط</strong>. واليوم الذي لا تتغير حقيقته يبقى كما هو.
              </p>

              <div className="hr-field hr-field--row">
                <div className="hr-field">
                  <label htmlFor="hra-rc-from">من *</label>
                  <input
                    id="hra-rc-from"
                    type="date"
                    value={from}
                    max={yesterday}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>

                <div className="hr-field">
                  <label htmlFor="hra-rc-to">إلى</label>
                  <input
                    id="hra-rc-to"
                    type="date"
                    value={to}
                    max={yesterday}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
              </div>

              {employee !== null && (
                <label className="hr-check">
                  <input
                    type="checkbox"
                    checked={onlyOne}
                    onChange={(e) => setOnlyOne(e.target.checked)}
                  />
                  <span>على {employee.name ?? 'الموظف المحدد'} فقط</span>
                </label>
              )}

              <div className="hra-impact">
                <p className="hra-impact__t">ما سيحدث عند الضغط</p>
                <ul className="hra-impact__l">
                  <li>
                    {span === null || inverted
                      ? 'المدى غير صحيح. يجب أن تكون البداية قبل النهاية.'
                      : tooLong
                        ? `${daysWord(span)}. والحد من هذه الشاشة ${ATTENDANCE_RECOMPUTE_MAX_DAYS} يوما.`
                        : `يتم تحديد ${daysWord(span)} (${fmtDate(from)} ← ${fmtDate(to)}) لإعادة الاحتساب.`}
                  </li>
                  <li>
                    {onlyOne && employee !== null
                      ? `على ${employee.name ?? 'الموظف المحدد'} فقط.`
                      : 'على كل من يشمله التتبع في المدى. ويقتصر المدى على ما بعد تاريخ بدء كل ملف.'}
                  </li>
                  <li>
                    <strong>لا يتغير أي رقم الآن</strong>: يدخل الطلب قائمة الانتظار، والمحرك
                    ينفذه ليلا ({ENGINE_RUN_CLOCK} بتوقيت الرياض).
                  </li>
                </ul>
              </div>

              <p className="hra-note">
                <CalendarClock size={13} aria-hidden="true" />
                <span>
                  لا تعد الضغط إن لم يتغير شيء. الأيام المحددة مسبقا لا يعاد تحديدها،
                  والطلب محدود بثلاث محاولات في الدقيقة.
                </span>
              </p>
            </>
          ) : (
            <>
              <p className="hra-hint">{result.message}</p>

              <dl className="hra-kv">
                <dt>المدى</dt>
                <dd>
                  {fmtDate(result.from)} ← {fmtDate(result.to)} · {daysWord(result.days)}
                </dd>

                <dt>المشمولون</dt>
                <dd>{peopleWord(result.employees)}</dd>

                <dt>ما تم تحديده فعلا</dt>
                <dd>
                  {result.days_marked === 0
                    ? 'لا شيء. محدد مسبقا وينتظر المحرك'
                    : `${fmtCount(result.days_marked)} يوم موظف`}
                </dd>

                <dt>يعمل المحرك</dt>
                <dd dir="ltr">{result.engine_runs_at}</dd>
              </dl>

              <p className="hra-note">
                <CalendarClock size={13} aria-hidden="true" />
                <span>
                  لن تتغير أرقام هذه الشاشة قبل ذلك الوقت. هذا هو السلوك المتوقع.
                </span>
              </p>
            </>
          )}
        </div>

        <div className="hr-modal__f">
          <button type="button" className="hr-btn" onClick={onClose}>
            {result === null ? 'إلغاء' : 'إغلاق'}
          </button>

          {result === null && (
            <button
              type="button"
              className="hr-btn hr-btn--primary"
              onClick={() => { void submit(); }}
              disabled={recompute.isPending || span === null || tooLong || inverted || future}
            >
              {recompute.isPending ? 'جارٍ التحديد…' : 'حدد المدى لإعادة الاحتساب'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecomputeModal;
