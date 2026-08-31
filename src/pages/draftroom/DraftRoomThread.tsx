/**
 * سلسلةُ المحادثة على `assistant-ui` — المحرّكُ من المكتبة والهويّةُ منّا.
 *
 * 🔑 قرارُ الدمج: المكتبةُ تدير ميكانيكا السلسلة (النموذج الخارجي للرسائل،
 * المُدخل بسلوكه، التمرير، الحالة الفارغة) عبر `ExternalStoreRuntime`، بينما
 * تبقى بطاقاتُنا (سؤال/وقائع/أقسام…) مكوّناتِنا نفسَها تُرسم داخل رسالة الوكيل —
 * فلا نُقولب القضاءَ في «أجزاء نصّ»، ولا نعيد اختراع سلسلةٍ مبنيّة.
 *
 * 🔑 والوصولُ لبيانات الدور الأصليّ داخل مكوّن الرسالة عبر
 * `getExternalStoreMessages` — الجسرُ الرسميّ من رسالة المكتبة إلى صفّنا.
 *
 * 🩸 `autoScroll` مُطفأ عمداً: المكتبةُ تلصق بالقاع، والمالكُ طلب صراحةً تثبيتَ
 * **رأس** الردّ («يبقى الرد في اوله والمستخدم ينزل ليكمل») — فمنطقُ التمرير يبقى
 * في الصفحة على العنصر نفسِه.
 */

import { createContext, useContext, useMemo, type ReactNode, type RefObject } from 'react';
import {
  AssistantRuntimeProvider, ComposerPrimitive, MessagePrimitive, ThreadPrimitive,
  getExternalStoreMessages, useAuiState, useExternalStoreRuntime,
  type AppendMessage, type ThreadMessageLike,
} from '@assistant-ui/react';
import { ArrowDown, Copy, Paperclip, Scale, Send, Sparkles, Upload } from 'lucide-react';
import type { DraftRoomPart, DraftRoomRun } from '../../services/draftRoomService';
import { ThinkingSteps } from './parts';

/** رسالةُ المتجر الخارجيّ — سطحيّةٌ عمداً: البطاقات تُرسم من الدور الأصليّ لا منها */
interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface ThreadCtxValue {
  runById: Map<number, DraftRoomRun>;
  renderPart: (part: DraftRoomPart, key: string, runHasQuestions: boolean) => ReactNode;
}

const ThreadCtx = createContext<ThreadCtxValue | null>(null);

interface Props {
  runs: DraftRoomRun[];
  pendingMessage: string | null;
  thinking: boolean;
  busy: boolean;
  error: string | null;
  readable: number;
  renderPart: ThreadCtxValue['renderPart'];
  onSend: (text: string) => void;
  onUploadClick: () => void;
  onPasteClick: () => void;
  viewportRef: RefObject<HTMLDivElement | null>;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  /** مرسى السؤال المفتوح — مثبَّتٌ فوق حقل الكتابة فلا يضيع سؤالٌ في طول السجل */
  dock?: ReactNode;
  /** الصياغة الحرة: زرها يضيء بجاهزية البوابة، وسبب الحجب يظهر تلميحاً */
  freeDraftReady?: boolean;
  freeDraftBlockReason?: string | null;
  onFreeDraft?: () => void;
}

export default function DraftRoomThread({
  runs, pendingMessage, thinking, busy, error, readable,
  renderPart, onSend, onUploadClick, onPasteClick, viewportRef, composerRef, dock,
  freeDraftReady, freeDraftBlockReason, onFreeDraft,
}: Props) {
  const runById = useMemo(() => {
    const m = new Map<number, DraftRoomRun>();
    for (const r of runs) m.set(r.id, r);
    return m;
  }, [runs]);

  /** الأدوارُ رسائلَ — والمعلّقةُ والتفكيرُ يُلحقان اصطناعياً ليرسمهما نفسُ المجرى */
  const messages = useMemo<ChatMsg[]>(() => {
    const list: ChatMsg[] = runs
      .filter((r) => r.role !== 'system')
      .map((r) => ({ id: String(r.id), role: r.role as 'user' | 'assistant', text: r.body ?? '' }));

    if (pendingMessage) list.push({ id: 'pending', role: 'user', text: pendingMessage });
    if (thinking) list.push({ id: 'thinking', role: 'assistant', text: '' });

    return list;
  }, [runs, pendingMessage, thinking]);

  const convertMessage = (m: ChatMsg): ThreadMessageLike => ({
    id: m.id,
    role: m.role,
    content: [{ type: 'text', text: m.text }],
  });

  const onNew = async (message: AppendMessage) => {
    const first = message.content[0];
    if (first?.type !== 'text') return;
    onSend(first.text);
  };

  const runtime = useExternalStoreRuntime<ChatMsg>({
    isRunning: thinking,
    messages,
    convertMessage,
    onNew,
  });

  const ctx = useMemo<ThreadCtxValue>(() => ({ runById, renderPart }), [runById, renderPart]);

  return (
    <ThreadCtx.Provider value={ctx}>
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitive.Root className="drt-root">
          <ThreadPrimitive.Viewport asChild autoScroll={false}>
            <div ref={viewportRef} className="drt-viewport dr-thread__viewport">
              <div className="drt-col">
                <ThreadPrimitive.Empty>
                  <EmptyState
                    readable={readable}
                    busy={busy}
                    onSend={onSend}
                    onUploadClick={onUploadClick}
                    onPasteClick={onPasteClick}
                  />
                </ThreadPrimitive.Empty>

                <ThreadPrimitive.Messages
                  components={{ UserMessage, AssistantMessage }}
                />

                {error && <div className="dr-bubble dr-bubble--error" role="alert">{error}</div>}
              </div>

              <ThreadPrimitive.ViewportFooter className="drt-footer">
                <div className="drt-col">
                  {dock}
                  <ThreadPrimitive.ScrollToBottom asChild>
                    <button type="button" className="drt-scrollbtn" aria-label="النزول لآخر المحادثة">
                      <ArrowDown size={15} aria-hidden />
                    </button>
                  </ThreadPrimitive.ScrollToBottom>

                  <ComposerPrimitive.Root className="drt-composer">
                    <button
                      type="button"
                      className="dr-btn dr-btn--ghost drt-composer__tool"
                      disabled={busy}
                      onClick={onUploadClick}
                      aria-label="رفعُ ملفّ"
                      title="ارفع ملفّاً"
                    >
                      <Upload size={15} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="dr-btn dr-btn--ghost drt-composer__tool"
                      disabled={busy}
                      onClick={onPasteClick}
                      aria-label="لصقُ نصّ"
                      title="ألصِق نصَّ مستند"
                    >
                      <Paperclip size={15} aria-hidden />
                    </button>

                    <ComposerPrimitive.Input asChild>
                      <textarea
                        ref={composerRef}
                        className="drt-composer__input"
                        rows={1}
                        placeholder={readable === 0 ? 'ارفع مستنداً أولاً…' : 'اكتب ما تريد — والوكيلُ يقرأ مصادرك'}
                        aria-label="رسالةٌ للوكيل"
                        disabled={busy}
                      />
                    </ComposerPrimitive.Input>

                    {onFreeDraft && (
                      <button
                        type="button"
                        className={`dr-btn drt-composer__tool drt-free${freeDraftReady ? ' drt-free--ready' : ''}`}
                        disabled={busy || !freeDraftReady}
                        onClick={onFreeDraft}
                        aria-label="صياغةٌ حرة"
                        title={freeDraftReady
                          ? 'صياغةٌ حرة: يُبدع بلا قيدٍ ثم يُحاسَب ادّعاءً ادّعاءً'
                          : (freeDraftBlockReason ?? 'تتاح بعد اكتمال التحضير')}
                      >
                        <Sparkles size={15} aria-hidden />
                      </button>
                    )}

                    <ComposerPrimitive.Send asChild>
                      <button type="submit" className="drt-composer__send" aria-label="إرسال">
                        <Send size={15} aria-hidden />
                      </button>
                    </ComposerPrimitive.Send>
                  </ComposerPrimitive.Root>
                </div>
              </ThreadPrimitive.ViewportFooter>
            </div>
          </ThreadPrimitive.Viewport>
        </ThreadPrimitive.Root>
      </AssistantRuntimeProvider>
    </ThreadCtx.Provider>
  );
}

// ═══════════════ الحالة الفارغة — اقتراحاتٌ تُنقر لا أوامرُ تُحفظ ═══════════════

function EmptyState({ readable, busy, onSend, onUploadClick, onPasteClick }: {
  readable: number;
  busy: boolean;
  onSend: (text: string) => void;
  onUploadClick: () => void;
  onPasteClick: () => void;
}) {
  const suggestions = readable > 0
    ? [
        'استخرج وقائع مذكّرة الخصم ودفوعه',
        'ما أقوى ما لنا وأخطر ما علينا في هذه المصادر؟',
        'صُغ المذكّرة كاملةً',
      ]
    : [];

  return (
    <div className="drt-empty">
      <span className="drt-empty__mark" aria-hidden><Scale size={22} /></span>
      <span className="dr-empty__title">
        {readable > 0 ? 'المصادرُ جاهزة — ماذا تريد؟' : 'ابدأ برفع مستنداتك'}
      </span>
      <p className="dr-empty__hint">
        {readable > 0
          ? 'اكتب ما تريد أو اخترْ بدايةً:'
          : 'ارفع مذكّرةَ الخصم والعقدَ وما لديك، أو ألصِق النصّ. أقرؤها ثم أسألك عمّا ينقص، ثم نصوغ معاً.'}
      </p>

      {suggestions.length > 0 && (
        <div className="drt-pills">
          {suggestions.map((s) => (
            <button key={s} type="button" className="drt-pill" disabled={busy} onClick={() => onSend(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {readable === 0 && (
        <div className="dr-actions">
          <button type="button" className="dr-btn dr-btn--primary" disabled={busy} onClick={onUploadClick}>
            <Upload size={14} aria-hidden /> ارفع ملفّاً
          </button>
          <button type="button" className="dr-btn" disabled={busy} onClick={onPasteClick}>
            <Paperclip size={14} aria-hidden /> ألصِق نصّاً
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════ رسالة المحامي ═══════════════

function UserMessage() {
  const [orig] = useAuiState((s) => getExternalStoreMessages<ChatMsg>(s.message));

  return (
    <MessagePrimitive.Root className="drt-row drt-row--user" data-run={orig?.id}>
      <div className="drt-userbubble">{orig?.text}</div>
    </MessagePrimitive.Root>
  );
}

// ═══════════════ رسالة الوكيل — نصُّه فوق بطاقاتِنا ═══════════════

function AssistantMessage() {
  const ctx = useContext(ThreadCtx);
  const [orig] = useAuiState((s) => getExternalStoreMessages<ChatMsg>(s.message));

  if (!ctx || !orig) return null;

  if (orig.id === 'thinking') {
    return (
      <MessagePrimitive.Root className="drt-row drt-row--assistant">
        <span className="drt-avatar" aria-hidden><Scale size={14} /></span>
        <div className="drt-body"><ThinkingSteps /></div>
      </MessagePrimitive.Root>
    );
  }

  const run = ctx.runById.get(Number(orig.id));
  if (!run) return null;

  const parts = run.parts ?? [];
  const runHasQuestions = parts.some((p) => p.type === 'question');

  return (
    <MessagePrimitive.Root className="drt-row drt-row--assistant" data-run={run.id}>
      <span className="drt-avatar" aria-hidden><Scale size={14} /></span>
      <div className="drt-body">
        {run.body && (
          <div className={`drt-asstext${run.status === 'failed' ? ' dr-bubble dr-bubble--error' : ''}`}>
            {run.body}
            {run.status !== 'failed' && (
              <button
                type="button"
                className="drt-copy"
                aria-label="نسخُ الردّ"
                title="انسخ"
                onClick={() => { void navigator.clipboard.writeText(run.body ?? ''); }}
              >
                <Copy size={12} aria-hidden />
              </button>
            )}
          </div>
        )}
        {parts.map((part, i) => ctx.renderPart(part, `${run.id}-${i}`, runHasQuestions))}
      </div>
    </MessagePrimitive.Root>
  );
}
