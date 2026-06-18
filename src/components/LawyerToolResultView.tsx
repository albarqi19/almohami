/**
 * LawyerToolResultView — عرض نتيجة أداة المحامي (العقد v2)، مكثّف ومثيّم بالثيمات الثلاثة.
 *
 * يتفرّع على output_mode:
 *   - report  → محوّل reportToEngineResult ⇒ <EngineResultView> (وراثة الحلقة/التأريض/الشارات/الدرج)
 *               + <AdversarialCards> للبطاقات (تفنيد/سيناريوهات).
 *   - replacement → <RewritePreview> (معاينة + استبدال/إدراج؛ penalty_clause خيارات).
 *   - answer_with_annotations → نصّ الجواب (المساعد المستندي).
 *   - annotations → لا يُعرض هنا (يُحقن في المحرّر عبر onSetTextAnnotations).
 *
 * كل الألوان من متغيّرات dashboard-theme.css عبر color-mix (لا hex صلب).
 */

import React, { useState } from 'react';
import type { LawyerToolResult, AdversarialCard, ReplacementPayload } from '../types/lawyerTool';
import type { Citation } from '../types/memoAnalysis';
import EngineResultView from './memo/EngineResultView';
import { reportToEngineResult } from '../services/lawyerToolService';

interface Props {
  result: LawyerToolResult;
  /** تطبيق صياغة بديلة (يحقن TextAnnotation في المحرر). */
  onApply?: (suggested: string, original?: string) => void;
  /** استبدال النص المحدّد/الكل بالنصّ الناتج (replacement). */
  onReplace?: (text: string) => void;
  /** إدراج نصّ (إلحاق) — خيارات الشرط الجزائي. */
  onInsert?: (text: string) => void;
  /** فتح خارجي للمادة (اختياري). */
  onOpenArticle?: (articleId: number, statuteName: string) => void;
}

const LawyerToolResultView: React.FC<Props> = ({ result, onApply, onReplace, onInsert, onOpenArticle }) => {
  const [active, setActive] = useState<Citation | null>(null);
  const byIndex = new Map<number, Citation>((result.citations ?? []).map((c) => [c.index, c]));

  const openChip = (c: Citation) => {
    if (onOpenArticle && c.article_id != null) onOpenArticle(c.article_id, c.statute_name);
    else setActive(c);
  };

  if (result.output_mode === 'report') {
    const cards = result.report?.cards ?? [];
    return (
      <div className="ltv" dir="rtl">
        <EngineResultView result={reportToEngineResult(result)} onApplySuggestion={onApply} onOpenArticle={onOpenArticle} />
        {cards.length > 0 && <AdversarialCards cards={cards} byIndex={byIndex} onChip={openChip} />}
        {active && <ArticleDrawer citation={active} onClose={() => setActive(null)} />}
      </div>
    );
  }

  if (result.output_mode === 'replacement') {
    return (
      <div className="ltv" dir="rtl">
        <RewritePreview result={result} byIndex={byIndex} onReplace={onReplace} onInsert={onInsert} onChip={openChip} />
        {active && <ArticleDrawer citation={active} onClose={() => setActive(null)} />}
      </div>
    );
  }

  if (result.output_mode === 'answer_with_annotations') {
    return (
      <div className="ltv" dir="rtl">
        {result.answer && <div className="ltv-answer">{result.answer}</div>}
      </div>
    );
  }

  // annotations: تُحقن في المحرّر مباشرة (لا تُعرض هنا)
  return null;
};

// ───────────────────────── بطاقات الخصم/السيناريو ─────────────────────────

const AdversarialCards: React.FC<{
  cards: AdversarialCard[];
  byIndex: Map<number, Citation>;
  onChip: (c: Citation) => void;
}> = ({ cards, byIndex, onChip }) => {
  const isScenario = cards[0]?.kind === 'scenario';
  return (
    <div className="ltv-sec">
      <div className="ltv-sec-h">
        <span>{isScenario ? '🎯' : '⚔️'}</span>
        <span>{isScenario ? 'سيناريوهات الأثر' : 'الردود والتفنيد'}</span>
        <span className="ltv-count">{cards.length}</span>
      </div>
      <div className={isScenario ? 'ltv-scenarios' : 'ltv-cards'}>
        {cards.map((c) => (
          <div key={c.id} className={`ltv-card sev-${c.severity ?? 'medium'}${c.unverified ? ' unv' : ''}`}>
            <div className="ltv-card-claim">
              <span className="ltv-card-claim-txt">{c.claim}</span>
              {c.unverified && <span className="ltv-unv-tag" title="اجتهاد بلا سند محقون — يلزم تحقّق">؟ اجتهادي</span>}
            </div>
            {c.response && <div className="ltv-card-resp">{c.response}</div>}
            {c.estimates.length > 0 && (
              <div className="ltv-ests">
                {c.estimates.map((e, i) => (
                  <span key={i} className={`ltv-est${e.estimated ? ' est' : ''}`} title={e.estimated ? 'رقم تقديري اجتهادي — يلزم تحقّق' : undefined}>
                    {e.label}: <b>{e.estimated ? '~' : ''}{e.value}</b>
                  </span>
                ))}
              </div>
            )}
            <CitationChips indices={c.citation_indices} byIndex={byIndex} onChip={onChip} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ───────────────────────── معاينة الاستبدال ─────────────────────────

const RewritePreview: React.FC<{
  result: LawyerToolResult;
  byIndex: Map<number, Citation>;
  onReplace?: (text: string) => void;
  onInsert?: (text: string) => void;
  onChip: (c: Citation) => void;
}> = ({ result, byIndex, onReplace, onInsert, onChip }) => {
  const rep = result.replacement as ReplacementPayload | null;
  const [copied, setCopied] = useState<string | null>(null);
  if (!rep) return null;

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1600); } catch { /* ignore */ }
  };

  const ungrounded = result.meta?.grounding_mode === 'ungrounded';

  // penalty_clause: عدّة خيارات بزر إدراج لكلٍّ
  if (rep.options.length > 0) {
    return (
      <>
        <GroundingNote ungrounded={ungrounded} result={result} />
        <div className="ltv-options">
          {rep.options.map((o, i) => (
            <div key={i} className="ltv-opt">
              <div className="ltv-opt-head">
                <span className="ltv-opt-label">{o.label || `خيار ${i + 1}`}</span>
                <div className="ltv-opt-actions">
                  <button className="ltv-btn" onClick={() => copy(o.clause_text, `o${i}`)}>{copied === `o${i}` ? 'تم' : 'نسخ'}</button>
                  {onInsert && <button className="ltv-btn primary" onClick={() => onInsert(o.clause_text)}>إدراج</button>}
                </div>
              </div>
              <div className="ltv-opt-text">{o.clause_text}</div>
              <CitationChips indices={o.citation_indices} byIndex={byIndex} onChip={onChip} />
            </div>
          ))}
        </div>
        <UncertainList items={result.needs_verification} />
      </>
    );
  }

  // أدوات الصياغة: نصّ بديل واحد
  const text = rep.replacement_text ?? '';
  return (
    <>
      {(rep.register || rep.changes_note) && (
        <div className="ltv-rw-meta">
          {rep.register && <span className="ltv-register">{rep.register}</span>}
          {rep.changes_note && <span className="ltv-changes">{rep.changes_note}</span>}
        </div>
      )}
      <GroundingNote ungrounded={ungrounded} result={result} />
      <div className="ltv-rw-new">{text}</div>
      <div className="ltv-rw-actions">
        <button className="ltv-btn" onClick={() => copy(text, 'main')}>{copied === 'main' ? 'تم النسخ' : 'نسخ'}</button>
        {onReplace && <button className="ltv-btn primary" onClick={() => onReplace(text)}>استبدال</button>}
        {onInsert && <button className="ltv-btn" onClick={() => onInsert(text)}>إدراج</button>}
      </div>
      <UncertainList items={result.needs_verification} />
    </>
  );
};

// ───────────────────────── مكوّنات مشتركة ─────────────────────────

const GroundingNote: React.FC<{ ungrounded: boolean; result: LawyerToolResult }> = ({ ungrounded, result }) => {
  if (ungrounded) {
    return <div className="ltv-grounding uncertain"><span className="ltv-dot" /> صياغة اجتهادية — راجِعها قبل الاعتماد</div>;
  }
  const n = result.meta?.grounded_citations ?? 0;
  if (n <= 0) return null;
  return <div className="ltv-grounding grounded"><span className="ltv-dot" /> مستندة إلى {n} مادة نظامية</div>;
};

const CitationChips: React.FC<{ indices: number[]; byIndex: Map<number, Citation>; onChip: (c: Citation) => void }> = ({ indices, byIndex, onChip }) => {
  if (!indices?.length) return null;
  return (
    <div className="merv-chips ltv-chips">
      {indices.map((i) => {
        const c = byIndex.get(i);
        return c ? <ArticleChipMini key={i} c={c} onSelect={onChip} /> : null;
      })}
    </div>
  );
};

const ArticleChipMini: React.FC<{ c: Citation; onSelect: (c: Citation) => void }> = ({ c, onSelect }) => {
  const clickable = c.grounded && !!c.text;
  const label = `${c.statute_name}${c.article_number ? ` · م.${c.article_number}` : ''}`;
  return (
    <button
      type="button"
      className={`merv-article compact${clickable ? ' clickable' : ' static'}${c.grounded ? '' : ' unverified'}`}
      onClick={clickable ? () => onSelect(c) : undefined}
      title={clickable ? 'عرض نصّ المادة' : label}
    >
      <span className="merv-article-mark">{c.grounded ? '§' : '?'}</span>[{c.index}]
    </button>
  );
};

const UncertainList: React.FC<{ items: string[] }> = ({ items }) => {
  if (!items?.length) return null;
  return (
    <div className="ltv-sec ltv-sec--warn">
      <div className="ltv-sec-h"><span>🔎</span><span>يلزم التحقّق</span></div>
      <ul className="ltv-uncertain">{items.map((n, i) => <li key={i}>{n}</li>)}</ul>
    </div>
  );
};

const ArticleDrawer: React.FC<{ citation: Citation; onClose: () => void }> = ({ citation: c, onClose }) => (
  <div className="merv-modal-overlay" onClick={onClose}>
    <div className="merv-modal" dir="rtl" onClick={(e) => e.stopPropagation()}>
      <div className="merv-modal-head">
        <div>
          <div className="merv-modal-title">{c.statute_name}</div>
          {c.article_number && <div className="merv-modal-sub">مادة {c.article_number}</div>}
        </div>
        <button className="merv-modal-x" onClick={onClose} aria-label="إغلاق">✕</button>
      </div>
      <div className="merv-modal-body">{c.text}</div>
    </div>
  </div>
);

export default LawyerToolResultView;
