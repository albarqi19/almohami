// التوصيات الذكية داخل لوح القراءة في «محطة القضية»
// صفوفٌ بمفردات المحطة (cst-row / cst-group / cst-tag) لا بطاقة مستقلة — التوصية تُضاف بنقرة
// إلى بنود التحضير أو الطلبات، وتُعلَّم «أُضيف» إن كانت موجودة أصلاً بعنوانها.
import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  AlertTriangle, BookOpen, CalendarClock, CheckCircle2, CheckSquare, ClipboardCheck,
  FileText, HelpCircle, Plus, RefreshCw, Sparkles, TrendingUp, X,
} from 'lucide-react';
import { useApplyAiActions, useSessionMotions, useSessionPreparations } from '../../hooks/useSessionPrep';
import type { AiBriefJson, AiBriefResponse, AiEvidence, AiSuggestion } from '../../services/sessionPrepService';

interface Props {
  sessionId: number;
  aiBrief: AiBriefResponse | null | undefined;
  isLoading: boolean;
  isGenerating?: boolean;
  generatedAtLabel?: string;
  onOpenFullBrief: () => void;
  onGenerateBrief: () => void;
}

type Tone = 'red' | 'orange' | 'navy' | 'green' | 'blue' | 'purple' | 'gray';
type IconType = React.ComponentType<{ size?: number; strokeWidth?: number }>;

interface RecApply {
  path: string;
  action: 'create_preparation' | 'create_motion';
  overrides: Record<string, unknown>;
  /** العنوان الذي سيُخلق به البند — يُستعمل لكشف «أُضيف» بعد إعادة التحميل */
  title: string;
  label: string;
  successText: string;
}

interface RecRow {
  key: string;
  tone: Tone;
  icon: IconType;
  text: string;
  sub?: string;
  tag?: { label: string; cls: string };
  apply?: RecApply;
  dismissible: boolean;
}

interface RecGroup { key: string; label: string; icon: IconType; rows: RecRow[] }

const RISK_CATEGORY: Record<string, string> = {
  contradiction: 'تناقض', procedural_gap: 'ثغرة إجرائية', deadline: 'مهلة', pattern: 'نمط', opponent_behavior: 'سلوك الخصم',
};
const CONFIDENCE: Record<string, string> = { high: 'ثقة عالية', medium: 'ثقة متوسطة', low: 'ثقة منخفضة' };
const QUALITY: Record<string, string> = { high: 'مرتفعة', medium: 'متوسطة', low: 'منخفضة' };

const clip = (s: string, n = 240): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
/** عدد الأيام بصياغة عربية سليمة: يوم واحد / يومان / ٣–١٠ أيام / ١١+ يوماً */
const arDays = (n: number): string => (n === 1 ? 'يوم واحد' : n === 2 ? 'يومان' : n >= 3 && n <= 10 ? `${n} أيام` : `${n} يوماً`);
const norm = (s: string | null | undefined): string => (s || '').trim().replace(/\s+/g, ' ');

const evidenceText = (ev?: AiEvidence): string | null => {
  if (!ev) return null;
  const parts = [ev.source ? `المصدر: ${ev.source}` : null, ev.confidence ? CONFIDENCE[ev.confidence] : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
};
const subLine = (...parts: Array<string | null | undefined>): string | undefined => {
  const clean = parts.map((p) => norm(p)).filter(Boolean);
  return clean.length ? clean.join(' — ') : undefined;
};
const suggestionTitle = (s: AiSuggestion): string => norm(s.title || s.question || s.reason || s.rationale || '');

function buildGroups(brief: AiBriefJson): RecGroup[] {
  const groups: RecGroup[] = [];
  const push = (key: string, label: string, icon: IconType, rows: RecRow[]) => { if (rows.length) groups.push({ key, label, icon, rows }); };

  const risks = brief.risk_flags || [];
  const riskRow = (level: 'high' | 'other') => risks
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => (level === 'high' ? f.level === 'high' : f.level !== 'high'))
    .map(({ f, i }): RecRow => {
      const title = clip(norm(f.message));
      return {
        key: `rf-${i}`,
        tone: level === 'high' ? 'red' : 'orange',
        icon: AlertTriangle,
        text: norm(f.message),
        sub: subLine(evidenceText(f.evidence)),
        tag: f.category ? { label: RISK_CATEGORY[f.category] || f.category, cls: level === 'high' ? 'cst-tag--red' : 'cst-tag--orange' } : undefined,
        apply: title ? { path: `risk_flags.${i}`, action: 'create_preparation', overrides: { title }, title, label: 'أضف كتحضير', successText: 'أُضيف التنبيه إلى بنود التحضير' } : undefined,
        dismissible: true,
      };
    });
  push('risk-high', 'تنبيهات حرجة', AlertTriangle, riskRow('high'));

  const orders = brief.pending_court_orders || [];
  push('orders', 'أوامر قضائية معلّقة', ClipboardCheck, orders
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => !o.fulfilled)
    .map(({ o, i }): RecRow => {
      const title = clip(norm(o.order));
      return {
        key: `pco-${i}`, tone: 'orange', icon: ClipboardCheck, text: norm(o.order),
        sub: subLine(evidenceText(o.evidence)),
        tag: o.from_session_date ? { label: `من جلسة ${o.from_session_date}`, cls: 'cst-tag--gray' } : undefined,
        apply: title ? { path: `pending_court_orders.${i}`, action: 'create_preparation', overrides: { title }, title, label: 'أضف كتحضير', successText: 'أُضيف الأمر إلى بنود التحضير' } : undefined,
        dismissible: true,
      };
    }));

  const deadlines = brief.critical_deadlines || [];
  push('deadlines', 'مهل حرجة', CalendarClock, deadlines.map((d, i): RecRow => {
    const title = clip(norm(d.item));
    const days = typeof d.days_remaining === 'number'
      ? (d.days_remaining < 0 ? `انقضت منذ ${arDays(-d.days_remaining)}` : d.days_remaining === 0 ? 'تنتهي اليوم' : `باقٍ ${arDays(d.days_remaining)}`)
      : null;
    return {
      key: `cd-${i}`, tone: d.severity === 'critical' ? 'red' : d.severity === 'warning' ? 'orange' : 'gray', icon: CalendarClock, text: norm(d.item),
      sub: subLine(d.deadline_date ? `حتى ${d.deadline_date}` : null, days),
      tag: { label: d.severity === 'critical' ? 'حرجة' : d.severity === 'warning' ? 'تنبيه' : 'للعلم', cls: d.severity === 'critical' ? 'cst-tag--red' : d.severity === 'warning' ? 'cst-tag--orange' : 'cst-tag--gray' },
      apply: title ? { path: `critical_deadlines.${i}`, action: 'create_preparation', overrides: { title }, title, label: 'أضف كتحضير', successText: 'أُضيفت المهلة إلى بنود التحضير' } : undefined,
      dismissible: true,
    };
  }));

  const motions = brief.suggested_motions || [];
  push('motions', 'طلبات مقترحة', FileText, motions
    .map((m, i) => ({ m, i }))
    .sort((a, b) => Number(b.m.urgency === 'urgent') - Number(a.m.urgency === 'urgent'))
    .map(({ m, i }): RecRow => {
      const title = clip(suggestionTitle(m));
      const urgent = m.urgency === 'urgent';
      return {
        key: `sm-${i}`, tone: urgent ? 'red' : 'navy', icon: FileText, text: title,
        sub: subLine(m.rationale || m.reason, evidenceText(m.evidence)),
        tag: urgent ? { label: 'عاجل', cls: 'cst-tag--red' } : m.tag ? { label: m.tag, cls: 'cst-tag--navy' } : undefined,
        apply: title ? { path: `suggested_motions.${i}`, action: 'create_motion', overrides: { title, tag: m.tag || null }, title, label: 'أضف كطلب', successText: 'أُضيف الطلب كمسودة' } : undefined,
        dismissible: true,
      };
    }));

  const preps = brief.suggested_preparations || [];
  push('preps', 'تحضيرات مقترحة', CheckSquare, preps.map((p, i): RecRow => {
    const title = clip(suggestionTitle(p));
    return {
      key: `sp-${i}`, tone: 'green', icon: CheckSquare, text: title,
      sub: subLine(p.rationale || p.reason, evidenceText(p.evidence)),
      apply: title ? { path: `suggested_preparations.${i}`, action: 'create_preparation', overrides: { title, notes: norm(p.rationale || p.reason) || null }, title, label: 'أضف', successText: 'أُضيف إلى بنود التحضير' } : undefined,
      dismissible: true,
    };
  }));

  const docs = brief.documents_to_review || [];
  push('docs', 'مستندات تُراجع قبل الجلسة', BookOpen, docs.map((d, i): RecRow => {
    const base = suggestionTitle(d);
    const title = clip(base ? `مراجعة: ${base}` : '');
    return {
      key: `dr-${i}`, tone: 'blue', icon: BookOpen, text: base,
      sub: subLine(d.rationale || d.reason, evidenceText(d.evidence)),
      apply: title ? { path: `documents_to_review.${i}`, action: 'create_preparation', overrides: { title }, title, label: 'أضف كتحضير', successText: 'أُضيفت المراجعة إلى بنود التحضير' } : undefined,
      dismissible: true,
    };
  }));

  push('risk-other', 'تنبيهات', AlertTriangle, riskRow('other'));

  const questions = brief.predicted_judge_questions || [];
  push('questions', 'أسئلة متوقعة من القاضي', HelpCircle, questions.map((q, i): RecRow => {
    const base = suggestionTitle(q);
    const title = clip(base ? `تجهيز إجابة: ${base}` : '');
    return {
      key: `pq-${i}`, tone: 'purple', icon: HelpCircle, text: base,
      sub: subLine(q.rationale || q.reason, evidenceText(q.evidence)),
      apply: title ? { path: `predicted_judge_questions.${i}`, action: 'create_preparation', overrides: { title }, title, label: 'أضف كتحضير', successText: 'أُضيف تجهيز الإجابة إلى بنود التحضير' } : undefined,
      dismissible: true,
    };
  }));

  const patterns = brief.department_patterns || [];
  push('patterns', 'أنماط الدائرة', TrendingUp, patterns.map((p, i): RecRow => ({
    key: `dp-${i}`, tone: 'gray', icon: TrendingUp, text: norm(p.observation),
    sub: subLine(p.based_on_sessions ? `مبنيّ على ${p.based_on_sessions} جلسة` : null, p.confidence ? (CONFIDENCE[p.confidence] || p.confidence) : null),
    dismissible: false,
  })));

  return groups;
}

const Skeletons: React.FC = () => (
  <>
    <div className="cst-skeleton cst-skeleton--w80" />
    <div className="cst-skeleton cst-skeleton--w60" />
    <div className="cst-skeleton cst-skeleton--w80" />
  </>
);

export const StationRecs: React.FC<Props> = ({ sessionId, aiBrief, isLoading, isGenerating, generatedAtLabel, onOpenFullBrief, onGenerateBrief }) => {
  const applyMut = useApplyAiActions(sessionId);
  const prepsQuery = useSessionPreparations(sessionId);
  const motionsQuery = useSessionMotions(sessionId);
  const [applied, setApplied] = useState<Set<string>>(() => new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const status = aiBrief?.status ?? 'pending';
  const brief: AiBriefJson | null = (status === 'ready' || status === 'stale') ? (aiBrief?.brief ?? null) : null;
  const groups = useMemo(() => (brief ? buildGroups(brief) : []), [brief]);

  // ما أُضيف فعلاً (قبل إعادة التحميل أو بعدها) يُستدلّ عليه من عنوان البند الموجود
  const existingTitles = useMemo(() => {
    const set = new Set<string>();
    (prepsQuery.data?.items || []).forEach((p) => set.add(norm(p.title)));
    (motionsQuery.data?.items || []).forEach((m) => set.add(norm(m.title)));
    return set;
  }, [prepsQuery.data, motionsQuery.data]);
  const isApplied = (row: RecRow) => applied.has(row.key) || (!!row.apply && existingTitles.has(norm(row.apply.title)));

  const apply = (row: RecRow) => {
    if (!row.apply || busyKey) return;
    const { path, action, overrides, successText } = row.apply;
    setBusyKey(row.key);
    applyMut.mutate([{ path, action, overrides }], {
      onSuccess: (r) => {
        if (r.preparations_created || r.motions_created) {
          setApplied((prev) => new Set(prev).add(row.key));
          toast.success(successText);
        } else {
          toast.error('لم يُنشأ بند — أعد المحاولة');
        }
      },
      onError: () => toast.error('تعذّر إضافة التوصية'),
      onSettled: () => setBusyKey(null),
    });
  };
  const dismiss = (key: string) => setDismissed((prev) => new Set(prev).add(key));

  // ── الحالات قبل الجاهزية ──
  if (!aiBrief && isLoading) return <div className="cst-recs"><Skeletons /></div>;

  if (!aiBrief || status === 'pending') {
    return (
      <div className="cst-recs">
        <div className="cst-empty">
          <Sparkles />
          لم يُولَّد كشف ذكي لهذه الجلسة بعد
          <div style={{ marginTop: 10 }}>
            <button type="button" className="cst-btn cst-btn--sm cst-btn--primary" disabled={!!isGenerating} onClick={onGenerateBrief}>
              <Sparkles size={13} />{isGenerating ? 'جارٍ البدء…' : 'توليد الكشف الذكي الآن'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'generating') {
    return (
      <div className="cst-recs">
        <div className="cst-note"><Sparkles size={15} /><div>يُحضَّر الكشف الذكي من الجلسات السابقة والقضية، نحو نصف دقيقة.</div></div>
        <Skeletons />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="cst-recs">
        <div className="cst-note cst-note--red">
          <AlertTriangle size={15} />
          <div>
            <b>تعذّر توليد الكشف الذكي.</b> {aiBrief.error_message || 'حدث خطأ غير متوقع.'}{' '}
            <button type="button" className="cst-linkbtn" disabled={!!isGenerating} onClick={onGenerateBrief}>{isGenerating ? 'جارٍ البدء…' : 'أعد المحاولة'}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── جاهز ──
  const stale = status === 'stale' || !!aiBrief.is_stale;
  const visible = groups
    .map((g) => ({ ...g, rows: g.rows.filter((r) => !dismissed.has(r.key)) }))
    .filter((g) => g.rows.length > 0);
  const shown = visible.reduce((n, g) => n + (g.key === 'patterns' ? 0 : g.rows.length), 0);
  const hidden = dismissed.size;
  const quality = aiBrief.context_quality ? (QUALITY[aiBrief.context_quality] || aiBrief.context_quality) : null;

  return (
    <div className="cst-recs">
      {stale && (
        <div className="cst-note cst-note--gold">
          <RefreshCw size={15} />
          <div>
            <b>هذا الكشف قديم</b> — تغيّرت بيانات الجلسة أو القضية بعد توليده.{' '}
            <button type="button" className="cst-linkbtn" disabled={!!isGenerating} onClick={onGenerateBrief}>{isGenerating ? 'جارٍ البدء…' : 'تحديث الكشف'}</button>
          </div>
        </div>
      )}
      <div className="cst-recs__bar">
        <Sparkles />
        <b>{shown === 0 ? 'لا توصيات' : shown === 1 ? 'توصية واحدة' : shown === 2 ? 'توصيتان' : `${shown} توصيات`}</b>
        {quality && <span>· جودة السياق {quality}</span>}
        {generatedAtLabel && <span>· {generatedAtLabel}</span>}
        <span>· <button type="button" className="cst-linkbtn" onClick={onOpenFullBrief}>الكشف الكامل</button></span>
        {hidden > 0 && <span>· <button type="button" className="cst-linkbtn" onClick={() => setDismissed(new Set())}>إظهار {hidden === 1 ? 'المتجاهَلة' : `${hidden} متجاهَلة`}</button></span>}
      </div>

      {groups.length === 0 && (
        <div className="cst-empty"><Sparkles />لا توصيات في هذا الكشف — السياق المتاح عن القضية محدود</div>
      )}

      {visible.map((g) => {
        const GIcon = g.icon;
        return (
          <React.Fragment key={g.key}>
            <div className="cst-group"><GIcon size={12} />{g.label}<span className="cst-n">{g.rows.length}</span></div>
            <div className="cst-list">
              {g.rows.map((row) => {
                const done = isApplied(row);
                const Icon = row.icon;
                const busy = busyKey === row.key;
                return (
                  <div key={row.key} className={`cst-row cst-rrow cst-rrow--${row.tone} ${done ? 'is-done' : ''}`}>
                    {done ? <span className="cst-tick is-on" aria-hidden="true"><CheckCircle2 size={11} /></span> : <span className="cst-rrow__mark" aria-hidden="true"><Icon size={14} /></span>}
                    <div className="cst-row__t">
                      <span>{row.text}</span>
                      {row.sub && <small>{row.sub}</small>}
                    </div>
                    {done ? <span className="cst-tag cst-tag--green">أُضيف</span> : row.tag && <span className={`cst-tag ${row.tag.cls}`}>{row.tag.label}</span>}
                    {!done && (row.apply || row.dismissible) && (
                      <div className="cst-rrow__acts">
                        {row.apply && (
                          <button type="button" className="cst-btn cst-btn--sm" disabled={!!busyKey} onClick={() => apply(row)}>
                            <Plus size={12} />{busy ? 'جارٍ…' : row.apply.label}
                          </button>
                        )}
                        {row.dismissible && (
                          <button type="button" className="cst-xbtn" title="تجاهل هذه التوصية" aria-label="تجاهل هذه التوصية" onClick={() => dismiss(row.key)}><X size={13} /></button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </React.Fragment>
        );
      })}

      {groups.length > 0 && (
        <div className="cst-hint cst-recs__foot">مقترحات آلية من الجلسات السابقة وبيانات القضية، تحتاج مراجعة المحامي قبل الاعتماد.</div>
      )}
    </div>
  );
};

export default StationRecs;
