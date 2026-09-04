import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { X } from 'lucide-react';

import { hrAttendanceService } from '../../../services/hrAttendanceService';
import { PUNCH_DIRECTION_LABELS } from '../../../types/hr';
import type { PunchDirection } from '../../../types/hr';
import { ATT_KEYS } from './useAttendanceQueue';
import { daysWord, errorText, fmtDayLine } from './attendanceFormat';

/**
 * **البصمةُ اليدوية من المدير** — بصمةٌ *جديدة* تُلحَق، ولا يُعدَّل صفُّ بصمةٍ قائمٍ ولا يُحذف.
 *
 * وهي الطريقُ الحقيقيُّ لإكمال «بصمةٍ منسيّة»: اعتمادُ الادّعاء يفعلها في الخادم، وهذا يفعلها
 * مباشرةً حين يكون المديرُ هو من يعلم ما وقع. المصدرُ `manual` والثقةُ `attested` و`created_by`
 * إلزاميّ **وسطرُ تدقيقٍ بلا استثناء** — والضابطُ **شفافيةٌ لا منع**: المنعُ يُنتج كذباً.
 *
 * السببُ ≥١٠ أحرفٍ يفرضه الخادم، والمفتاحُ الحتميُّ يُشتقّ من (الملفّ · الاتجاه · الدقيقة)
 * فتصير النقرةُ المزدوجة صفراً **بحكم القاعدة** لا بحكم الشيفرة.
 *
 * ⚠️ **الوقتُ جدارُ ساعةٍ بلا إزاحة** (`YYYY-MM-DD HH:mm:00`): إرسالُ `toISOString()` يحمل `Z`
 * فيُخزَّن جدارٌ بمنطقةٍ ويُبنى المفتاحُ بأخرى — وهو بعينه فخُّ «كاتبان بمنطقتين في صفٍّ واحد».
 */

interface Props {
  employee: { id: number; name: string | null };
  /** يومٌ واحدٌ أو أيامٌ متعدّدة — بصمةٌ لكلّ يومٍ بنفس الاتجاه والوقت والسبب. */
  dates: string[];
  /** اتجاهٌ ووقتٌ مقترَحان من دليل الاقتراح (`proposed_in_at`/`proposed_out_at`). */
  defaultDirection?: PunchDirection;
  defaultTime?: string;
  onClose: () => void;
  onDone: () => void;
}

const MIN_REASON = 10;

/** وقتُ خروجٍ محايدٌ حين لا اقتراح — ولا يُخمَّن من متوسّطاتٍ ولا من بصماتٍ أخرى. */
const FALLBACK_TIME = '16:30';

export const ManualPunchModal: React.FC<Props> = ({
  employee,
  dates,
  defaultDirection = 'out',
  defaultTime,
  onClose,
  onDone,
}) => {
  const qc = useQueryClient();
  const [direction, setDirection] = useState<PunchDirection>(defaultDirection);
  const [time, setTime] = useState(defaultTime && /^\d{2}:\d{2}$/.test(defaultTime) ? defaultTime : FALLBACK_TIME);
  const [reason, setReason] = useState('');
  const [failed, setFailed] = useState<string[]>([]);

  const punch = useMutation({
    mutationFn: async (vars: { reason: string }) => {
      let done = 0;
      const errors: string[] = [];

      // تسلسليٌّ لا متوازٍ: المسارُ خلف `throttle:30,1`، ودفعةٌ متوازيةٌ تحرق النافذة
      // فيُردّ نصفُ الأيام بـ429 ويظنّ المديرُ العطلَ في البيانات.
      for (const date of dates) {
        try {
          await hrAttendanceService.addManualPunch({
            employee_profile_id: employee.id,
            direction,
            punched_at: `${date} ${time}:00`,
            reason: vars.reason,
          });
          done += 1;
        } catch (e) {
          errors.push(`${fmtDayLine(date)} — ${errorText(e, 'تعذر')}`);
        }
      }

      return { done, errors };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATT_KEYS.all });
    },
  });

  const submit = async () => {
    const clean = reason.trim();

    if (clean.length < MIN_REASON) {
      toast.error(`اكتب سببا لا يقل عن ${MIN_REASON} أحرف. البصمة اليدوية تخضع للتدقيق.`);
      return;
    }

    if (!/^\d{2}:\d{2}$/.test(time)) {
      toast.error('اكتب وقتا صحيحا بصيغة ساعة:دقيقة.');
      return;
    }

    const result = await punch.mutateAsync({ reason: clean });

    if (result.done > 0) {
      toast.success(`تمت إضافة بصمة ${PUNCH_DIRECTION_LABELS[direction]} على ${daysWord(result.done)}`);
    }

    // نجاحٌ جزئيّ: يبقى المودالُ مفتوحاً بقائمة ما لم يُسجَّل — والإغلاقُ الصامت يجعل
    // المديرَ يظنّ الأربعةَ سُجّلت وقد سُجّل اثنان.
    if (result.errors.length > 0) {
      setFailed(result.errors);
      onDone();
      return;
    }

    onDone();
    onClose();
  };

  return (
    <div className="hr-modal-overlay" onClick={onClose}>
      <div className="hr-modal hra-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hr-modal__h">
          <h3>بصمة يدوية — {employee.name ?? 'موظف'}</h3>
          <button type="button" className="hr-icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="hr-modal__b">
          <p className="hra-hint">
            تضاف بصمة <strong>جديدة</strong> بمصدر «إدخال يدوي» وباسمك. وتبقى البصمات السابقة
            كما هي، وتظهر البصمة الجديدة في سجل الموظف كما يراها هو.
          </p>

          <div className="hra-secb">
            <span className="hra-flags">
              {dates.map((date) => (
                <span className="hra-flag" key={date}>{fmtDayLine(date)}</span>
              ))}
            </span>
          </div>

          <div className="hr-field hr-field--row">
            <div className="hr-field">
              <label htmlFor="hra-dir">الاتجاه *</label>
              <select
                id="hra-dir"
                value={direction}
                onChange={(e) => setDirection(e.target.value as PunchDirection)}
              >
                <option value="in">{PUNCH_DIRECTION_LABELS.in}</option>
                <option value="out">{PUNCH_DIRECTION_LABELS.out}</option>
              </select>
            </div>

            <div className="hr-field">
              <label htmlFor="hra-time">الوقت *</label>
              <input
                id="hra-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="hr-field">
            <label htmlFor="hra-punch-reason">السبب *</label>
            <textarea
              id="hra-punch-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: أبلغني بخروجه بعد جلسة المحكمة ونسي التسجيل"
            />
            <span className="hra-count" dir="ltr">
              {reason.trim().length} / {MIN_REASON}
            </span>
          </div>

          {failed.length > 0 && (
            <div className="hra-secb">
              <p className="hra-hint">أيام لم يتم تسجيلها:</p>
              <ul className="hra-why">
                {failed.map((line) => (
                  <li className="hra-why__i is-no" key={line}>
                    <span className="hra-why__m" aria-hidden="true">✖</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="hr-modal__f">
          <button type="button" className="hr-btn" onClick={onClose}>
            {failed.length > 0 ? 'إغلاق' : 'إلغاء'}
          </button>
          <button
            type="button"
            className="hr-btn hr-btn--primary"
            onClick={() => { void submit(); }}
            disabled={punch.isPending}
          >
            {punch.isPending ? 'جارٍ الحفظ…' : 'أضف البصمة'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualPunchModal;
