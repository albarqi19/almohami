import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hrLeaveService } from '../../../services/hrLeaveService';
import type { LeaveBlocker, LeavePreview, LeavePreviewPayload, LeaveWarning } from '../../../types/hr';

/**
 * خُطّافُ المعاينة — يشترك فيه مودالُ التسجيل ومودالُ التصحيح، فلا تتعدّد صيغةُ
 * الاستدعاء ولا سلوكُ الفشل.
 *
 * ══════ تهدئةٌ ٤٠٠ms وسلوكٌ معرَّفٌ عند 429 (C-32) ══════
 * `POST /hr/leaves/preview` محروسٌ بـ`throttle:60,1` والمعاينةُ تُنادى عند كلّ تغيّرٍ في
 * الموظف/النوع/التاريخين/نصف اليوم. فالتهدئةُ **٤٠٠ms** هي ما يمنع استنفادَ الحدّ أثناء
 * الكتابة، ولا تُرفع الحدودُ في الباك: تخفيفُ حارسٍ ملاصقٍ لمسار كتابةٍ لا تشتريه راحةُ تحرير.
 *
 * وعند أيّ إخفاق (429 أو انقطاعٌ أو 5xx):
 *   · **تبقى آخرُ نتيجةٍ صالحةٍ معروضة** — الشاشةُ لا تُفرَّغ فجأةً تحت يد المستخدم.
 *   · يظهر سطرٌ محايدٌ واحد: «تعذّر تحديث الاحتساب الآن — أعِد المحاولة».
 *   · **لا تُورَّث الحواجزُ القديمة**: `blockers` تُرجَع فارغةً ما دامت النتيجةُ لا تخصّ
 *     المُدخلَ الحاليّ، فلا يُعطَّل زرُّ الحفظ بحاجزٍ لمدىً لم يعد مكتوباً. الخادمُ يعيد
 *     `evaluate()` تحت القفل على أيّ حال، وحجبُ حفظٍ صحيحٍ أسوأُ من محاولةٍ تُردّ 422.
 *
 * ══════ الإلغاء ══════
 * `apiClient.request` لا يمرّر `signal`، فلا `AbortController` هنا: الإلغاءُ يتحقّق
 * بمفتاح `useQuery` نفسِه — نتيجةُ مفتاحٍ متجاوَزٍ لا تحلّ محلَّ النشط. وادّعاءُ إلغاءٍ
 * شبكيٍّ غيرِ موجودٍ وعدٌ كاذب.
 *
 * و`retry: 0` مقصود: المعاينةُ تُنادى كثيراً، وإعادةُ المحاولة تُضاعف الحملَ على مسارٍ
 * محدودٍ بـ`throttle:60,1` فتقرّب الحدَّ بدل أن تُبعده.
 */

export const LEAVE_PREVIEW_DEBOUNCE_MS = 400;

export const LEAVE_PREVIEW_STALE_NOTICE = 'تعذر تحديث الاحتساب الآن. أعد المحاولة.';

export interface LeavePreviewState {
  /** آخرُ نتيجةٍ صالحة — قد تكون لمُدخلٍ سابقٍ حين يكون `isStale` صحيحاً. */
  data: LeavePreview | undefined;
  isFetching: boolean;
  isError: boolean;
  /** النتيجةُ المعروضة لا تخصّ المُدخلَ الحاليّ (تهدئةٌ جاريةٌ أو إخفاق). */
  isStale: boolean;
  /** حواجزُ المُدخل الحاليّ وحدَها — **فارغةٌ عمداً** حين تكون النتيجةُ قديمة. */
  blockers: LeaveBlocker[];
  warnings: LeaveWarning[];
  /** سطرٌ محايدٌ يُعرض حين يتعذّر التحديث — لا يمنع الحفظ. */
  notice: string | null;
  refetch: () => void;
}

/**
 * اكتمالُ المُدخل: هدفٌ واحدٌ محدَّد + نوعٌ + تاريخان صالحان (النهايةُ ليست قبل البداية).
 * ما دون ذلك لا يُنادى المسارُ أصلاً — نداءٌ محكومٌ بـ422 يستهلك من الحدّ بلا فائدة.
 */
export function isPreviewComplete(input: LeavePreviewPayload | null): input is LeavePreviewPayload {
  if (input === null) return false;
  if (!Number.isInteger(input.employee_profile_id) || input.employee_profile_id <= 0) return false;
  if (!Number.isInteger(input.leave_type_id) || input.leave_type_id <= 0) return false;
  if (!input.start_date || !input.end_date) return false;

  const start = new Date(input.start_date);
  const end = new Date(input.end_date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

  return end.getTime() >= start.getTime();
}

/** مفتاحٌ مستقرٌّ لكلّ المُدخلات — ترتيبُ الحقول ثابتٌ فلا يتولّد مفتاحان لمُدخلٍ واحد. */
function previewKey(input: LeavePreviewPayload | null): string {
  if (!isPreviewComplete(input)) return '';

  return [
    input.employee_profile_id,
    input.leave_type_id,
    input.start_date,
    input.end_date,
    input.half_day ? 1 : 0,
    input.half_day_period ?? '',
    input.event_date ?? '',
    input.employee_document_id ?? '',
    input.exclude_leave_id ?? '',
  ].join('|');
}

export function useLeavePreview(input: LeavePreviewPayload | null): LeavePreviewState {
  const liveKey = previewKey(input);

  const [settled, setSettled] = useState<{ key: string; payload: LeavePreviewPayload | null }>({
    key: '',
    payload: null,
  });

  // التهدئة: مُدخلٌ ناقصٌ يُفرَّغ **فوراً** (فتختفي خانةُ الأثر بلا انتظار)، والمكتملُ
  // ينتظر ٤٠٠ms. والمؤقّتُ يُلغى مع كلّ تغيّر، فخمسةُ تغييراتٍ في ٣٠٠ms نداءٌ واحد.
  useEffect(() => {
    if (liveKey === '') {
      setSettled((prev) => (prev.key === '' ? prev : { key: '', payload: null }));
      return;
    }

    const timer = window.setTimeout(() => {
      setSettled({ key: liveKey, payload: input });
    }, LEAVE_PREVIEW_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
    // المفتاحُ يلخّص كلَّ الحقول؛ الاعتمادُ عليه يمنع إعادةَ ضبط المؤقّت لمرجعٍ جديدٍ بقيمٍ قديمة.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey]);

  const enabled = settled.key !== '' && settled.payload !== null;

  const query = useQuery({
    queryKey: ['hr', 'leave', 'preview', settled.key],
    queryFn: () => hrLeaveService.preview(settled.payload as LeavePreviewPayload),
    enabled,
    staleTime: 30_000,
    gcTime: 60_000,
    retry: 0,
    refetchOnWindowFocus: false,
  });

  // آخرُ نتيجةٍ صالحةٍ ومفتاحُها — تُعرض حين يفشل التحديث بدل تفريغ الشاشة.
  const lastGood = useRef<{ key: string; data: LeavePreview } | null>(null);

  useEffect(() => {
    if (query.data && settled.key !== '') {
      lastGood.current = { key: settled.key, data: query.data };
    }
  }, [query.data, settled.key]);

  // مُدخلٌ ناقص ⇒ لا نتيجةَ سابقةً تُعرض: خانةُ الأثر تختفي ولا تعرض رقمَ مدىً محذوف.
  useEffect(() => {
    if (liveKey === '') lastGood.current = null;
  }, [liveKey]);

  const shown = query.data ?? lastGood.current?.data;
  const shownKey = query.data ? settled.key : lastGood.current?.key ?? '';
  const isStale = liveKey === '' ? shown !== undefined : shownKey !== liveKey;

  return useMemo<LeavePreviewState>(
    () => ({
      data: shown,
      isFetching: query.isFetching,
      isError: query.isError,
      isStale,
      blockers: !isStale && shown ? shown.blockers ?? [] : [],
      warnings: !isStale && shown ? shown.warnings ?? [] : [],
      notice: query.isError ? LEAVE_PREVIEW_STALE_NOTICE : null,
      refetch: () => {
        void query.refetch();
      },
    }),
    // `query` مرجعٌ جديدٌ كلَّ تصيير؛ الاعتمادُ على حقوله يمنع إعادةَ بناءٍ بلا تغيّر.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown, query.isFetching, query.isError, isStale]
  );
}

export default useLeavePreview;
