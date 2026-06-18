/**
 * EngineResultView — عرض نتيجة محرك تحليل المذكرة (العقد v2).
 *
 * تصميم مضغوط (ERP dense) ومرتّب: رأس فيه حلقة درجة + حكم + تذييل تأريض، ثم أقسام
 * كثيفة (قائمة فحص/ملاحظات/خاص بالمحرك/مواد). يلوّن «الاجتهادي» (ungrounded) بصرياً.
 * كل الألوان من متغيّرات dashboard-theme.css (تعمل عبر الثيمات الثلاثة).
 *
 * شارة المادة قابلة للنقر تفتح درجاً ذاتياً بنصّ المادة (النصّ مرفق في الاستشهاد، بلا نداء)،
 * وزر «طبّق» يحقن الصياغة البديلة في المحرر عبر آلية textAnnotations القائمة.
 */

import React, { useState } from 'react';
import type {
  EngineResult,
  Finding,
  Citation,
  ChecklistItem,
  VerdictLevel,
  FindingSeverity,
} from '../../types/memoAnalysis';

interface Props {
  result: EngineResult;
  /** تطبيق صياغة بديلة على المحرر (يحقن TextAnnotation). */
  onApplySuggestion?: (suggested: string, original?: string) => void;
  /** فتح خارجي للمادة (اختياري)؛ إن غاب يُعرض النصّ في درج ذاتي. */
  onOpenArticle?: (articleId: number, statuteName: string) => void;
}

const VERDICT_META: Record<VerdictLevel, { icon: string; cls: string }> = {
  pass: { icon: '✓', cls: 'pass' },
  warn: { icon: '!', cls: 'warn' },
  fail: { icon: '✕', cls: 'fail' },
};

const SEVERITY_LABEL: Record<FindingSeverity, string> = {
  critical: 'حرجة', high: 'عالية', medium: 'متوسطة', low: 'منخفضة', info: 'معلومة',
};

const CHECK_META: Record<ChecklistItem['status'], { icon: string; cls: string }> = {
  pass: { icon: '✓', cls: 'pass' },
  warn: { icon: '!', cls: 'warn' },
  fail: { icon: '✕', cls: 'fail' },
  na: { icon: '–', cls: 'na' },
};

const EngineResultView: React.FC<Props> = ({ result: r, onApplySuggestion, onOpenArticle }) => {
  const [active, setActive] = useState<Citation | null>(null);
  const ungrounded = r.meta?.grounding_mode === 'ungrounded';
  const byIndex = new Map<number, Citation>((r.citations ?? []).map((c) => [c.index, c]));

  const openChip = (c: Citation) => {
    if (onOpenArticle && c.article_id != null) onOpenArticle(c.article_id, c.statute_name);
    else setActive(c);
  };

  return (
    <div className={`merv${ungrounded ? ' merv--ungrounded' : ''}`} dir="rtl">
      <div className="merv-head">
        {typeof r.score === 'number' && <ScoreRing score={r.score} level={r.verdict?.level} />}
        <div className="merv-head-main">
          <VerdictBadge level={r.verdict?.level} label={r.verdict?.label} />
          {r.verdict?.summary && <p className="merv-summary">{r.verdict.summary}</p>}
        </div>
      </div>

      <GroundingBar result={r} ungrounded={ungrounded} />

      {!!r.deadlines?.length && (
        <Section title="المهل النظامية" icon="⏰">
          <div className="merv-deadlines">
            {r.deadlines.map((d, i) => (
              <div key={i} className={`merv-deadline u-${d.urgency ?? 'low'}`}>
                <span className="merv-deadline-label">{d.label}</span>
                {d.days != null && <span className="merv-deadline-days">{d.days} يوماً</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {!!r.checklist?.length && (
        <Section title="قائمة الفحص" icon="☑">
          <div className="merv-checklist">
            {r.checklist.map((c, i) => (
              <div key={i} className="merv-chk" title={c.note || undefined}>
                <span className={`merv-chk-dot ${CHECK_META[c.status]?.cls}`}>{CHECK_META[c.status]?.icon}</span>
                <span className="merv-chk-label">{c.label}</span>
                {c.citation_indices?.map((ci) => (
                  <ArticleChip key={ci} citation={byIndex.get(ci)} onSelect={openChip} compact />
                ))}
              </div>
            ))}
          </div>
        </Section>
      )}

      {!!r.findings?.length && (
        <Section title="الملاحظات" icon="⚑" count={r.findings.length}>
          <div className="merv-findings">
            {r.findings.map((f) => (
              <FindingCard key={f.id} finding={f} byIndex={byIndex} onChip={openChip} onApply={onApplySuggestion} />
            ))}
          </div>
        </Section>
      )}

      <EngineSpecific result={r} onApply={onApplySuggestion} />

      {!!r.needs_verification?.length && (
        <Section title="يلزم التحقّق" icon="🔎" tone="warn">
          <ul className="merv-list merv-list--warn">
            {r.needs_verification.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </Section>
      )}

      {!!r.citations?.length && (
        <Section title="المواد المستند إليها" icon="📚" count={r.citations.length}>
          <div className="merv-chips">
            {r.citations.map((c) => <ArticleChip key={c.index} citation={c} onSelect={openChip} />)}
          </div>
        </Section>
      )}

      {active && <ArticleDrawer citation={active} onClose={() => setActive(null)} />}
    </div>
  );
};

// ───────────────────────── مكوّنات فرعية ─────────────────────────

const VerdictBadge: React.FC<{ level?: VerdictLevel; label?: string }> = ({ level, label }) => {
  const m = VERDICT_META[level ?? 'warn'];
  return (
    <span className={`merv-verdict ${m.cls}`}>
      <span className="merv-verdict-icon">{m.icon}</span>
      {label || ''}
    </span>
  );
};

const ScoreRing: React.FC<{ score: number; level?: VerdictLevel }> = ({ score, level }) => {
  const radius = 18;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  const tone = level === 'fail' ? 'fail' : level === 'pass' ? 'pass' : score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail';
  return (
    <div className={`merv-ring ${tone}`}>
      <svg viewBox="0 0 44 44" width="44" height="44">
        <circle className="merv-ring-bg" cx="22" cy="22" r={radius} strokeWidth="4" fill="none" />
        <circle
          className="merv-ring-fg" cx="22" cy="22" r={radius} strokeWidth="4" fill="none"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
          strokeLinecap="round" transform="rotate(-90 22 22)"
        />
      </svg>
      <span className="merv-ring-num">{pct}</span>
    </div>
  );
};

const GroundingBar: React.FC<{ result: EngineResult; ungrounded: boolean }> = ({ result: r, ungrounded }) => {
  if (ungrounded) {
    return (
      <div className="merv-grounding merv-grounding--uncertain">
        <span className="merv-dot" /> تحليل اجتهادي بلا سند مؤرّض — يلزم تحقّق المحامي
      </div>
    );
  }
  const n = r.meta?.grounded_citations ?? 0;
  const p = r.meta?.precedents_used ?? 0;
  return (
    <div className="merv-grounding merv-grounding--grounded">
      <span className="merv-dot" /> مُؤرَّض بـ {n} مادة نظامية{p > 0 ? ` و${p} سابقة قضائية` : ''}
    </div>
  );
};

const Section: React.FC<{ title: string; icon?: string; count?: number; tone?: string; children: React.ReactNode }> = ({
  title, icon, count, tone, children,
}) => (
  <div className={`merv-sec${tone ? ` merv-sec--${tone}` : ''}`}>
    <div className="merv-sec-h">
      {icon && <span className="merv-sec-icon">{icon}</span>}
      <span>{title}</span>
      {typeof count === 'number' && <span className="merv-sec-count">{count}</span>}
    </div>
    {children}
  </div>
);

const FindingCard: React.FC<{
  finding: Finding;
  byIndex: Map<number, Citation>;
  onChip: (c: Citation) => void;
  onApply?: Props['onApplySuggestion'];
}> = ({ finding: f, byIndex, onChip, onApply }) => (
  <div className={`merv-find sev-${f.severity}${f.unverified ? ' merv-find--unv' : ''}`}>
    <div className="merv-find-head">
      <span className={`merv-sev sev-${f.severity}`}>{SEVERITY_LABEL[f.severity]}</span>
      <span className="merv-find-title">{f.title}</span>
      {f.unverified && (
        <span className="merv-unv-tag" title="اجتهاد بلا سند محقون — يلزم تحقّق المحامي">؟ اجتهادي</span>
      )}
    </div>
    {f.quote && <blockquote className="merv-quote">{f.quote}</blockquote>}
    {f.impact && <div className="merv-find-row"><b>الأثر:</b> {f.impact}</div>}
    {f.recommendation && <div className="merv-find-row"><b>التوصية:</b> {f.recommendation}</div>}
    <div className="merv-find-foot">
      {f.citation_indices?.map((ci) => {
        const c = byIndex.get(ci);
        return c ? <ArticleChip key={ci} citation={c} onSelect={onChip} compact /> : null;
      })}
      {f.suggested_text && onApply && (
        <button className="merv-apply" onClick={() => onApply(f.suggested_text!, f.quote)}>طبّق الصياغة</button>
      )}
    </div>
  </div>
);

const ArticleChip: React.FC<{ citation?: Citation; onSelect: (c: Citation) => void; compact?: boolean }> = ({
  citation: c, onSelect, compact,
}) => {
  if (!c) return null;
  const clickable = c.grounded && !!c.text;
  const label = `${c.statute_name}${c.article_number ? ` · م.${c.article_number}` : ''}`;
  return (
    <button
      type="button"
      className={`merv-article${compact ? ' compact' : ''}${clickable ? ' clickable' : ' static'}${c.grounded ? '' : ' unverified'}`}
      onClick={clickable ? () => onSelect(c) : undefined}
      title={clickable ? 'عرض نصّ المادة' : label}
    >
      <span className="merv-article-mark">{c.grounded ? '§' : '?'}</span>
      {compact ? `[${c.index}]` : label}
    </button>
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

const EngineSpecific: React.FC<{ result: EngineResult; onApply?: Props['onApplySuggestion'] }> = ({ result: r, onApply }) => {
  const es = (r.engine_specific ?? {}) as Record<string, any>;

  if (r.engine === 'brain' && es.strategy) {
    const s = es.strategy as Record<string, any>;
    return (
      <Section title="التحليل الاستراتيجي" icon="🧠">
        <div className="merv-cols">
          <div className="merv-col merv-col--pos">
            <div className="merv-col-h">نقاط القوة</div>
            {(s.strengths ?? []).map((x: any, i: number) => <div key={i} className="merv-col-item">{x.point ?? x.text ?? ''}</div>)}
          </div>
          <div className="merv-col merv-col--neg">
            <div className="merv-col-h">نقاط الضعف</div>
            {(s.weaknesses ?? []).map((x: any, i: number) => <div key={i} className="merv-col-item">{x.point ?? x.text ?? ''}</div>)}
          </div>
        </div>
      </Section>
    );
  }

  if (r.engine === 'opponent' && Array.isArray(es.weaknesses)) {
    return (
      <Section title="هجمات الخصم وتحصينك" icon="⚔️" count={es.weaknesses.length}>
        <div className="merv-moves">
          {es.weaknesses.map((w: any, i: number) => (
            <div key={i} className={`merv-move sev-${w.severity ?? 'medium'}`}>
              <div className="merv-move-row attack"><b>الخصم:</b> {w.opponent_move ?? w.weakness ?? ''}</div>
              {w.our_quote && <blockquote className="merv-quote">{w.our_quote}</blockquote>}
              {w.counter && <div className="merv-move-row counter"><b>تحصينك:</b> {w.counter}</div>}
            </div>
          ))}
        </div>
      </Section>
    );
  }

  if (r.engine === 'compliance' && Array.isArray(es.items)) {
    return (
      <Section title="مصفوفة الامتثال" icon="📋" count={es.items.length}>
        <div className="merv-compliance">
          {es.items.map((it: any, i: number) => (
            <div key={i} className={`merv-comp-row st-${complianceCls(it.status)}${it.unverified ? ' unverified' : ''}`}>
              <span className="merv-comp-status">{it.status ?? ''}{it.unverified ? ' ⚠' : ''}</span>
              <span className="merv-comp-clause">{it.clause ?? ''}</span>
            </div>
          ))}
        </div>
      </Section>
    );
  }

  if (r.engine === 'polish' && Array.isArray(es.language_fixes)) {
    return (
      <Section title="تحسينات الصياغة" icon="✨" count={es.language_fixes.length}>
        <div className="merv-fixes">
          {es.language_fixes.map((f: any, i: number) => (
            <div key={i} className="merv-fix">
              <span className="merv-fix-old">{f.original_text ?? ''}</span>
              <span className="merv-fix-arrow">←</span>
              <span className="merv-fix-new">{f.suggested_text ?? ''}</span>
              {f.kind && <span className="merv-fix-kind">{f.kind}</span>}
              {f.original_text && f.suggested_text && onApply && (
                <button className="merv-apply sm" onClick={() => onApply(f.suggested_text, f.original_text)}>طبّق</button>
              )}
            </div>
          ))}
        </div>
      </Section>
    );
  }

  return null;
};

function complianceCls(status?: string): string {
  if (status === 'متوافق') return 'ok';
  if (status === 'مخالف') return 'bad';
  if (status === 'تحفظ') return 'warn';
  return 'na';
}

export default EngineResultView;
