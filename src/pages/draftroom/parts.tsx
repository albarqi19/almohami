/**
 * بطاقاتُ «غرفة الصياغة» — ما يقرؤه المستخدم من `parts` التي يبنيها الخادم.
 *
 * 🔑 هذه المكوّنات لا تعرف النموذجَ ولا `cards`. الخادمُ يبني `parts` وهي وحدَها
 * ما نرسمه — فأيُّ مخرَجٍ شاذٍّ من النموذج لا يصل هنا أصلاً.
 */

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  AlertTriangle, BookOpen, CheckCircle2, CircleDashed, FileText,
  HelpCircle, Info, Quote, Scale, X, XCircle,
} from 'lucide-react';
import type {
  DraftRoomChoice, DraftRoomPart, DraftRoomQuestion,
} from '../../services/draftRoomService';
import { ORIGIN_LABELS, WEIGHT_LABELS } from '../../services/draftRoomService';

// ═══════════════════════════════════════════════════════
//  بطاقة السؤال — قلبُ «يسأل ويضع له خيارات»
// ═══════════════════════════════════════════════════════

interface QuestionCardProps {
  question: Extract<DraftRoomPart, { type: 'question' }>;
  /** الحالةُ الحيّة من المساحة — البطاقةُ في الرسالة لقطةٌ قديمة */
  live?: DraftRoomQuestion;
  busy: boolean;
  onAnswer: (questionId: number, input: { status: 'answered' | 'unknown'; answer?: string; choice_id?: string }) => void;
  /** موضعُ السؤال من مجموعه — يُعرض للمفتوح وحده كي يعرف المحامي كم بقي */
  position?: { current: number; total: number };
  /** رقمُ لون السؤال 0..5 — نفسُه على موادّه في اللوح الجانبيّ فيتعارفان بالعين */
  hue?: number;
  /** عددُ الموادّ التي وصلت مع هذا السؤال — شريحةٌ صغيرة تُنير مكانَها في اللوح */
  articlesCount?: number;
  onShowArticles?: () => void;
}

export function QuestionCard({ question, live, busy, onAnswer, position, hue, articlesCount, onShowArticles }: QuestionCardProps) {
  const [freeText, setFreeText] = useState('');
  const [showFree, setShowFree] = useState(false);

  const answered = live && live.status !== 'open';
  const picked = live?.answer ?? null;

  return (
    <div className="dr-card" data-question={question.question_id}>
      <div className="dr-card__head">
        {hue !== undefined
          ? <span className={`dr-huedot dr-hue-${hue}`} aria-hidden />
          : <HelpCircle size={15} aria-hidden />}
        <span>{question.text}</span>
        {question.blocking && <span className="dr-tag dr-tag--blocking">حاجب</span>}
        {question.preamble_field && <span className="dr-tag dr-tag--ok">ديباجة</span>}
        {(articlesCount ?? 0) > 0 && (
          <button
            type="button"
            className={`dr-tag dr-artchip${hue !== undefined ? ` dr-hue-${hue}` : ''}`}
            onClick={onShowArticles}
            title="موادُّ هذا السؤال — في اللوح الجانبيّ"
          >
            <BookOpen size={11} aria-hidden /> المواد ({articlesCount})
          </button>
        )}
        {position && (
          <span className="dr-tag" style={{ marginInlineStart: 'auto' }}>
            {position.current} من {position.total}
          </span>
        )}
      </div>

      {question.why && <p className="dr-card__why">{question.why}</p>}

      {/*
        🔑 «أليس المفروض أنه يعرف؟» — شكوى المالك نصاً. حين يجد الوكيلُ القيمةَ
        في المصادر أو يستنتجها نظاماً فلا يسأل فارغاً: يقترحها مسنّدةً وتُعتمد
        بنقرة — والحقلُ الحرّ يبقى لمن أراد التصحيح.
      */}
      {!answered && live?.suggested_answer && (
        <div className="dr-suggest">
          <div className="dr-suggest__body">
            <span className="dr-suggest__value">{live.suggested_answer}</span>
            {live.suggested_basis && <span className="dr-suggest__basis">{live.suggested_basis}</span>}
          </div>
          <button
            type="button"
            className="dr-btn dr-btn--primary"
            disabled={busy}
            onClick={() => onAnswer(question.question_id, { status: 'answered', answer: live.suggested_answer ?? '' })}
          >
            اعتمده
          </button>
        </div>
      )}

      {question.choices && question.choices.length > 0 && (
        <div className="dr-choices">
          {question.choices.map((c: DraftRoomChoice) => (
            <button
              key={c.id}
              type="button"
              className={`dr-choice${picked === c.label ? ' dr-choice--picked' : ''}`}
              disabled={busy || Boolean(answered)}
              onClick={() => onAnswer(question.question_id, { status: 'answered', choice_id: c.id, answer: c.label })}
            >
              <span>{c.label}</span>
              {/* سطرُ الأثر — ما يترتّب على هذا الاختيار */}
              {c.impact && <span className="dr-choice__impact">{c.impact}</span>}
            </button>
          ))}
        </div>
      )}

      {showFree && !answered && (
        <div className="dr-actions" style={{ width: '100%' }}>
          <input
            className="dr-composer__input"
            style={{ minHeight: 38 }}
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="اكتب جوابك"
            aria-label="جواب حرّ"
          />
          <button
            type="button"
            className="dr-btn dr-btn--primary"
            disabled={busy || freeText.trim().length === 0}
            onClick={() => onAnswer(question.question_id, { status: 'answered', answer: freeText.trim() })}
          >
            أرسِل
          </button>
        </div>
      )}

      {!answered && (
        <div className="dr-actions">
          {!showFree && (
            <button type="button" className="dr-btn" disabled={busy} onClick={() => setShowFree(true)}>
              {/* «غير ذلك» توحي بخياراتٍ لم تُعرض — السؤالُ الحرُّ زرُّه باسمه */}
              {question.choices && question.choices.length > 0 ? 'غير ذلك…' : 'اكتب الجواب'}
            </button>
          )}
          {/*
            🔑 «لا أعلم» ليست تخطّياً بل حالةٌ مستقلّة: على سؤالٍ حاجبٍ تُقفل المسلك
            ولا يُكتب عن موضوعه حرف، وعلى غيرِه تُنتج وسمَ نقصٍ ظاهراً في المتن.
          */}
          <button
            type="button"
            className="dr-btn dr-btn--ghost"
            disabled={busy}
            onClick={() => onAnswer(question.question_id, { status: 'unknown' })}
          >
            لا أعلم
          </button>
        </div>
      )}

      {answered && (
        <p className="dr-card__why">
          {live?.status === 'unknown'
            ? (question.blocking
                ? '⛔ أجبتَ «لا أعلم» — أُقفل هذا المسلك ولن يُكتب عنه شيء.'
                : '⚠️ أجبتَ «لا أعلم» — سيظهر وسمُ نقصٍ في موضعه من المتن.')
            : `الجواب: ${picked ?? '—'}`}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  دفتر الوقائع
// ═══════════════════════════════════════════════════════

interface FactSheetProps {
  part: Extract<DraftRoomPart, { type: 'fact_sheet' }>;
  acceptedIds: Set<number>;
  busy: boolean;
  onToggle: (factId: number, accepted: boolean) => void;
}

export function FactSheetCard({ part, acceptedIds, busy, onToggle }: FactSheetProps) {
  return (
    <div className="dr-card">
      <div className="dr-card__head">
        <FileText size={15} aria-hidden />
        <span>وقائعُ استُخرجت — أقِرَّ ما تعتمده</span>
      </div>
      <p className="dr-card__why">لا شيءَ منها يدخل المذكّرة قبل أن تنقر عليه.</p>

      <div className="dr-facts">
        {part.facts.map((f) => {
          const accepted = acceptedIds.has(f.fact_id);
          return (
            <div className="dr-fact" key={f.fact_id}>
              <button
                type="button"
                className="dr-btn dr-btn--ghost"
                style={{ padding: 4 }}
                disabled={busy}
                aria-pressed={accepted}
                aria-label={accepted ? 'سحبُ الإقرار' : 'إقرارُ الواقعة'}
                onClick={() => onToggle(f.fact_id, !accepted)}
              >
                {accepted ? <CheckCircle2 size={17} /> : <CircleDashed size={17} />}
              </button>

              <div className="dr-fact__body">
                <span className="dr-fact__statement">{f.statement}</span>

                {f.quote && <span className="dr-fact__quote">«{f.quote}»</span>}

                <div className="dr-fact__meta">
                  <span className="dr-tag">{ORIGIN_LABELS[f.origin]}</span>
                  <span className="dr-tag">{WEIGHT_LABELS[f.weight]}</span>
                  {/* علامتان لا واحدة: النقلُ بأمانة غيرُ الحجّية */}
                  {f.origin === 'document' && (
                    f.quote_verified
                      ? <span className="dr-tag dr-tag--ok">نُقل بأمانة{f.match_score ? ` · ${f.match_score}٪` : ''}</span>
                      : <span className="dr-tag dr-tag--warn">لم يُتحقَّق من الاقتباس</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  الاستشهادات — يبنيها الخادم، والملغاةُ تُوسَم
// ═══════════════════════════════════════════════════════

/**
 * المواد المستشهَد بها — **زرٌّ يفتح نافذة، لا لوحٌ في المجرى**.
 *
 * 🩸 كانت تُرسم مبسوطةً فتبلغ ثلاثةَ أرباع الشاشة، فيُدفع السؤالُ المعروضُ فوقها
 * خارج المرأى — والمحامي ينتظر أن يُسأل فلا يرى سؤالاً. والنصوصُ النظاميّة
 * مَرجِعٌ يُراجَع عند الحاجة لا شيءٌ يُقرأ في كلّ دور، فموضعُها خلف نقرة.
 *
 * ⚠️ `dir="rtl"` صريحٌ على `Content` — Radix يفرض ltr داخلياً.
 */
export function CitationsCard({ part }: { part: Extract<DraftRoomPart, { type: 'citations' }> }) {
  const [open, setOpen] = useState(false);
  const flagged = part.items.filter((c) => !c.is_current).length;

  return (
    <>
      <button type="button" className="dr-btn dr-cite-btn" onClick={() => setOpen(true)}>
        <BookOpen size={14} aria-hidden />
        <span>المواد المستشهَد بها ({part.items.length})</span>
        {/* الوسمُ يظهر على الزرّ نفسه — تحذيرٌ خلف نقرةٍ تحذيرٌ ضائع */}
        {flagged > 0 && (
          <span className="dr-tag dr-tag--warn">
            <AlertTriangle size={11} aria-hidden />
            {flagged} غير سارية
          </span>
        )}
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dr-dlg__overlay" />
          <Dialog.Content className="dr-dlg" dir="rtl" aria-describedby={undefined}>
            <header className="dr-dlg__head">
              <Dialog.Title className="dr-dlg__title">
                <BookOpen size={15} aria-hidden />
                المواد المستشهَد بها
              </Dialog.Title>
              <button type="button" className="dr-dlg__close" aria-label="إغلاق" onClick={() => setOpen(false)}>
                <X size={14} />
              </button>
            </header>

            <div className="dr-dlg__body">
              {part.items.map((c) => (
                <div className="dr-citation" key={`${c.index}-${c.article_number}`}>
                  <div className="dr-citation__head">
                    <span>[{c.index}] {c.statute_name} — {c.article_number}</span>
                    {/* فراغُ الحالة ليس دليلَ سريان */}
                    {!c.is_current && (
                      <span className="dr-tag dr-tag--warn">
                        <AlertTriangle size={11} aria-hidden />
                        {c.legal_status ?? 'حالة غير محقَّقة'} — لا تستشهد بها كنصٍّ ساري
                      </span>
                    )}
                  </div>
                  <p className="dr-citation__text">{c.excerpt}</p>
                </div>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

// ═══════════════════════════════════════════════════════
//  لوحُ النقص — من حالة الخادم لا من ادّعاء النموذج
// ═══════════════════════════════════════════════════════

export function GapsCard({ part }: { part: Extract<DraftRoomPart, { type: 'gaps' }> }) {
  return (
    <div className="dr-card">
      <div className="dr-card__head">
        <AlertTriangle size={15} aria-hidden />
        <span>ما لم يكتمل بعد</span>
      </div>

      <div className="dr-facts">
        {part.items.map((g, i) => (
          <div className="dr-fact" key={`${g.question_id ?? g.source_id ?? i}`}>
            <div className="dr-fact__body">
              <span className="dr-fact__statement">{g.text}</span>
              <span className="dr-card__why">{g.effect}</span>
            </div>
            {g.blocking && <span className="dr-tag dr-tag--blocking">حاجب</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  القسم المصوغ · الاقتباس · التنبيه
// ═══════════════════════════════════════════════════════

export function DraftSectionCard({ part }: { part: Extract<DraftRoomPart, { type: 'draft_section' }> }) {
  return (
    <div className="dr-section">
      <div className="dr-section__head">{part.title || 'قسمٌ من المذكّرة'}</div>
      {/* المتنُ نُظّف خادمياً عند الكتابة بـHtmlSanitizer — لا يُنظَّف هنا ثانيةً */}
      <div className="dr-section__body" dangerouslySetInnerHTML={{ __html: part.html }} />
    </div>
  );
}

export function SourceReadCard({ part }: { part: Extract<DraftRoomPart, { type: 'source_read' }> }) {
  return (
    <div className="dr-card">
      <div className="dr-card__head">
        <Quote size={15} aria-hidden />
        <span>من المصدر #{part.source_id}{part.segment_seq ? ` · مقطع ${part.segment_seq}` : ''}</span>
      </div>
      <p className="dr-citation__text">{part.excerpt}</p>
    </div>
  );
}

/**
 * خطواتُ التفكير — تملأ صمتَ الثواني الطويلة بحركةٍ صادقة.
 *
 * 🔑 المراحلُ عامّةٌ ومطابقةٌ لما يفعله الخادم فعلاً (قراءةٌ فبحثٌ فبناء)،
 * وتتقدّم بالزمن المنقضي لا بادّعاء تتبّعٍ لا نملكه. لا نِسَبَ مئويةً كاذبة.
 */
const THINK_STEPS: Array<{ at: number; label: string }> = [
  { at: 0, label: 'يقرأ المصادر…' },
  { at: 6, label: 'يبحث في الأنظمة السارية…' },
  { at: 14, label: 'يبني الردّ…' },
  { at: 32, label: 'الردُّ طويل — يكتمل…' },
];

export function ThinkingSteps() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  const current = THINK_STEPS.reduce((acc, s, i) => (elapsed >= s.at ? i : acc), 0);

  return (
    <div className="dr-steps" aria-live="polite">
      {THINK_STEPS.slice(0, current + 1).map((s, i) => (
        <div key={s.at} className={`dr-step${i === current ? ' dr-step--live' : ' dr-step--done'}`}>
          {i === current
            ? (
              <span className="dr-thinking" aria-hidden>
                <span className="dr-thinking__dot" />
                <span className="dr-thinking__dot" />
                <span className="dr-thinking__dot" />
              </span>
            )
            : <CheckCircle2 size={13} aria-hidden />}
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * لوحةُ التحقّق — حسابُ الصياغة الحرة بعد إطلاقها.
 *
 * 🔑 فلسفةُ الوضع الحرّ: يُبدع النموذجُ بلا قيدٍ ثم يُحاسَب ادّعاءً ادّعاءً.
 * الثابتُ يُعرض بسنده (نصُّ المادة الفعليّ/المصدر والدرجة) كي يحكم المحامي
 * بالملاءمة بنفسه، وغيرُ الثابت يُعرض أصفرَ صريحاً — لا يُدفن ولا يُحذف بصمت.
 */
export function VerificationCard({ part, onFixUnverified }: {
  part: Extract<DraftRoomPart, { type: 'verification' }>;
  onFixUnverified?: (claims: string[]) => void;
}) {
  const KIND_LABELS: Record<string, string> = {
    citation: 'استشهاد نظاميّ', quote: 'اقتباس من مستند', figure: 'رقم/تاريخ',
  };
  const unverified = part.items.filter((i) => i.status !== 'verified');

  return (
    <div className="dr-card dr-verify">
      <div className="dr-card__head">
        <Scale size={15} aria-hidden />
        <span>حسابُ الصياغة الحرة</span>
        <span className="dr-tag dr-tag--ok">{part.summary.verified} ثبت</span>
        {part.summary.unverified > 0 && (
          <span className="dr-tag dr-tag--warn">{part.summary.unverified} لم يثبت</span>
        )}
      </div>

      {part.items.length === 0 && (
        <p className="dr-card__why">تعذّر استخراجُ الادّعاءات للتدقيق — راجع المسوّدةَ بعينك قبل الاعتماد.</p>
      )}

      {part.items.map((it, i) => (
        <div key={i} className={`dr-verify__row${it.status === 'verified' ? '' : ' dr-verify__row--warn'}`}>
          {it.status === 'verified'
            ? <CheckCircle2 size={13} className="dr-verify__ok" aria-hidden />
            : <AlertTriangle size={13} className="dr-verify__warn" aria-hidden />}
          <div className="dr-verify__body">
            <span className="dr-verify__claim">
              <span className="dr-tag">{KIND_LABELS[it.kind] ?? it.kind}</span> {it.claim}
            </span>
            {it.status === 'verified' && it.detail && (
              <span className="dr-verify__detail">
                {typeof it.detail.statute_name === 'string'
                  ? `${String(it.detail.statute_name)} — ${String(it.detail.article_number ?? '')}: «${String(it.detail.excerpt ?? '').slice(0, 160)}…»`
                  : typeof it.detail.score === 'number'
                    ? `المصدر #${String(it.detail.source_id)} · تطابق ${String(it.detail.score)}٪`
                    : null}
              </span>
            )}
            {it.status !== 'verified' && (
              <span className="dr-verify__detail">لم يوجد سندُه في المصادر ولا الأنظمة — لا تعتمده قبل تحقّقك.</span>
            )}
          </div>
        </div>
      ))}

      {unverified.length > 0 && onFixUnverified && (
        <div className="dr-actions">
          <button
            type="button"
            className="dr-btn"
            onClick={() => onFixUnverified(unverified.map((i) => i.claim))}
          >
            اطلب إصلاحَ ما لم يثبت
          </button>
        </div>
      )}
    </div>
  );
}

export function NoticeCard({ part }: { part: Extract<DraftRoomPart, { type: 'notice' }> }) {
  const Icon = part.level === 'error' ? XCircle : part.level === 'warning' ? AlertTriangle : Info;

  return (
    <div className="dr-card">
      <div className="dr-card__head">
        <Icon size={15} aria-hidden />
        <span>{part.text}</span>
      </div>
    </div>
  );
}
