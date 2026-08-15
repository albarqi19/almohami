import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hrMeLeaveService } from '../../../services/hrMeLeaveService';
import type {
  MyLeavePreview,
  MyLeavePreviewPayload,
  MyLeaveRequestPayload,
} from '../../../services/hrMeLeaveService';
import type { LeaveBlocker, LeaveWarning } from '../../../types/hr';

/**
 * **خطّافاتُ الطلب الذاتيّ** — استعلامٌ واحدٌ للسجلّ، ومعاينةٌ مهدَّأة، وطفرةٌ تُبطل الاثنين.
 *
 * منقولةٌ في سلوكها عن `useLeavePreview` الإداريّ (التهدئةُ ٤٠٠ms · بقاءُ آخر نتيجةٍ صالحة ·
 * **عدمُ توريث الحواجز** حين تكون النتيجةُ قديمة) لأن الحدَّ في الخادم واحدٌ (`throttle:60,1`)
 * والمصيدةُ واحدة: حاجزٌ لمدىً لم يعد مكتوباً يعطّل زرَّ إرسالٍ صحيح.
 *
 * 🔴 **وصفرُ استطلاعٍ دوريّ**: الإبطالُ بعد الإرسال وحدَه. وطلبُ الإجازة يبطل **رصيدَ الموظف
 * أيضاً** لا سجلَّه فقط: صفٌّ معتمَدٌ فوراً (بابُ النجاة في مكتبٍ بمديرٍ واحد) يخصم من الرصيد،
 * فبقاءُ الرقم القديم على الشاشة يجعل الموظفَ يقرأ رصيداً لم يعد قائماً.
 */

export const MY_LEAVE_KEYS = {
  requests: ['hr', 'me', 'leaves'] as const,
  summary: ['hr', 'me', 'leave-summary'] as const,
  preview: (key: string) => ['hr', 'me', 'leave-preview', key] as const,
};

export const MY_PREVIEW_DEBOUNCE_MS = 400;

export const MY_PREVIEW_STALE_NOTICE = 'تعذّر تحديث الاحتساب الآن — أعِد المحاولة.';

/** سجلُّ طلباتي وخياراتُ النموذج — ٤٠٤/٤٠٣ نتيجتان نهائيّتان لا أعطالٌ عابرة، فلا إعادةَ محاولة. */
export function useMyLeaves() {
  return useQuery({
    queryKey: MY_LEAVE_KEYS.requests,
    queryFn: () => hrMeLeaveService.getMyLeaves(),
    retry: false,
  });
}

export interface MyLeavePreviewState {
  data: MyLeavePreview | undefined;
  isFetching: boolean;
  isError: boolean;
  /** المعروضُ لا يخصّ المُدخلَ الحاليّ (تهدئةٌ جاريةٌ أو إخفاق). */
  isStale: boolean;
  /** حواجزُ المُدخل الحاليّ وحدَها — فارغةٌ عمداً حين تكون النتيجةُ قديمة. */
  blockers: LeaveBlocker[];
  warnings: LeaveWarning[];
  notice: string | null;
}

/** اكتمالُ المُدخل: نوعٌ وتاريخان صالحان. ما دونه لا يُنادى المسارُ أصلاً. */
export function isMyPreviewComplete(input: MyLeavePreviewPayload | null): input is MyLeavePreviewPayload {
  if (input === null) return false;
  if (!Number.isInteger(input.leave_type_id) || input.leave_type_id <= 0) return false;
  if (!input.start_date || !input.end_date) return false;

  const start = new Date(input.start_date);
  const end = new Date(input.end_date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

  return end.getTime() >= start.getTime();
}

/** مفتاحٌ مستقرٌّ بترتيبِ حقولٍ ثابت — فلا يتولّد مفتاحان لمُدخلٍ واحد. */
function previewKey(input: MyLeavePreviewPayload | null): string {
  if (!isMyPreviewComplete(input)) return '';

  return [
    input.leave_type_id,
    input.start_date,
    input.end_date,
    input.event_date ?? '',
    input.employee_document_id ?? '',
    (input.reason ?? '').trim() === '' ? 0 : 1,
  ].join('|');
}

export function useMyLeavePreview(input: MyLeavePreviewPayload | null): MyLeavePreviewState {
  const liveKey = previewKey(input);

  const [settled, setSettled] = useState<{ key: string; payload: MyLeavePreviewPayload | null }>({
    key: '',
    payload: null,
  });

  // مُدخلٌ ناقصٌ يُفرَّغ فوراً (فتختفي خانةُ الأثر بلا انتظار)، والمكتملُ ينتظر ٤٠٠ms.
  useEffect(() => {
    if (liveKey === '') {
      setSettled((prev) => (prev.key === '' ? prev : { key: '', payload: null }));
      return;
    }

    const timer = window.setTimeout(() => {
      setSettled({ key: liveKey, payload: input });
    }, MY_PREVIEW_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
    // المفتاحُ يلخّص كلَّ الحقول؛ الاعتمادُ عليه يمنع إعادةَ ضبط المؤقّت لمرجعٍ جديدٍ بقيمٍ قديمة.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey]);

  const query = useQuery({
    queryKey: MY_LEAVE_KEYS.preview(settled.key),
    queryFn: () => hrMeLeaveService.preview(settled.payload as MyLeavePreviewPayload),
    enabled: settled.key !== '' && settled.payload !== null,
    staleTime: 30_000,
    gcTime: 60_000,
    retry: 0,
    refetchOnWindowFocus: false,
  });

  const lastGood = useRef<{ key: string; data: MyLeavePreview } | null>(null);

  useEffect(() => {
    if (query.data && settled.key !== '') {
      lastGood.current = { key: settled.key, data: query.data };
    }
  }, [query.data, settled.key]);

  useEffect(() => {
    if (liveKey === '') lastGood.current = null;
  }, [liveKey]);

  const shown = query.data ?? lastGood.current?.data;
  const shownKey = query.data ? settled.key : lastGood.current?.key ?? '';
  const isStale = liveKey === '' ? shown !== undefined : shownKey !== liveKey;

  return useMemo<MyLeavePreviewState>(
    () => ({
      data: shown,
      isFetching: query.isFetching,
      isError: query.isError,
      isStale,
      blockers: !isStale && shown ? shown.blockers ?? [] : [],
      warnings: !isStale && shown ? shown.warnings ?? [] : [],
      notice: query.isError ? MY_PREVIEW_STALE_NOTICE : null,
    }),
    // `query` مرجعٌ جديدٌ كلَّ تصيير؛ الاعتمادُ على حقوله يمنع إعادةَ بناءٍ بلا تغيّر.
    [shown, query.isFetching, query.isError, isStale]
  );
}

/** إرسالُ الطلب — يبطل السجلَّ والرصيدَ معاً. */
export function useRequestLeave() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (payload: MyLeaveRequestPayload) => hrMeLeaveService.request(payload),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: MY_LEAVE_KEYS.requests });
      void client.invalidateQueries({ queryKey: MY_LEAVE_KEYS.summary });
    },
  });
}
