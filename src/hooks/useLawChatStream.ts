// خُطّافُ البثّ الحيّ لشات الأنظمة
//
// 🩸 لماذا استُبدل `useMutation`: الطلبُ الواحد يُرجع كلَّ شيءٍ دفعةً بعد 5–9
// ثوانٍ، فيحدّق المحامي في ثلاث نقاطٍ ثمّ تسقط الإجابةُ كاملة. البثُّ لا يقصّر
// الزمنَ الكلّيّ لكنّه ينهي **الانتظارَ الأعمى**: أوّلُ حرفٍ عند ثانيتين، ومراحلُ
// حقيقيةٌ قبله بأسماء الأنظمة التي تُفحص فعلاً.

import { useCallback, useEffect, useRef, useState } from 'react';
import { streamLawChat } from '../services/lawsService';
import type { LawChatAnswer, LawChatStage } from '../services/lawsService';

export type ChatStreamStatus = 'idle' | 'streaming' | 'done' | 'error';

export interface LawChatStreamState {
  status: ChatStreamStatus;
  /** السؤالُ الجاري — يُعرض فوراً قبل أيّ ردّ */
  question: string;
  /** النصُّ المتراكم كما يصل */
  text: string;
  stage: LawChatStage | null;
  answer: LawChatAnswer | null;
  error: string | null;
  /** أُوقف بطلب المستخدم لا بعطل */
  stopped: boolean;
}

const IDLE: LawChatStreamState = {
  status: 'idle', question: '', text: '', stage: null, answer: null, error: null, stopped: false,
};

export function useLawChatStream() {
  const [state, setState] = useState<LawChatStreamState>(IDLE);
  const abortRef = useRef<(() => void) | null>(null);
  const aliveRef = useRef(true);

  /*
   * 🩸 حارسُ التفكيك: البثُّ يستمرّ بعد مغادرة الصفحة فتُستدعى `setState` على
   * مكوّنٍ مفكَّك. والأسوأ أنّ الاتصالَ يبقى مفتوحاً — فيُقطع صراحةً.
   */
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      abortRef.current?.();
      abortRef.current = null;
    };
  }, []);

  const safeSet = useCallback((fn: (p: LawChatStreamState) => LawChatStreamState) => {
    if (aliveRef.current) setState(fn);
  }, []);

  const send = useCallback(
    (question: string, conversationId: number | null, onDone?: (a: LawChatAnswer) => void) => {
      abortRef.current?.();

      setState({ ...IDLE, status: 'streaming', question });

      abortRef.current = streamLawChat(question, conversationId, {
        onStage: (s) => safeSet((p) => ({ ...p, stage: s })),
        onToken: (t) => safeSet((p) => ({ ...p, text: p.text + t })),
        onDone: (a) => {
          safeSet((p) => ({
            ...p,
            status: 'done',
            answer: a,
            // 🔑 النصُّ النهائيُّ يحلّ محلّ المبثوث: الخادمُ يكشط مؤشّرات الفهرسة
            //    («[4]») **بعد** البثّ، فلولا الاستبدالُ لبقيت على الشاشة.
            text: a.message.content,
            stage: null,
          }));
          onDone?.(a);
        },
        onError: (message) => safeSet((p) => ({ ...p, status: 'error', error: message, stage: null })),
      });
    },
    [safeSet],
  );

  /**
   * إيقافُ التوليد.
   *
   * 🩸 والصدقُ واجبٌ هنا: القطعُ يوقف **العرض** ولا يلغي ما جرى على الخادم —
   * الدورُ يُحفظ هناك على أي حال. فلا يُقال للمستخدم «أُلغي»، بل يُعرض ما وصل
   * ويُنبَّه أنّ الإجابة غير مكتملة.
   */
  const stop = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    safeSet((p) => (p.status === 'streaming' ? { ...p, status: 'done', stopped: true, stage: null } : p));
  }, [safeSet]);

  const reset = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    safeSet(() => IDLE);
  }, [safeSet]);

  return { ...state, send, stop, reset, isStreaming: state.status === 'streaming' };
}
