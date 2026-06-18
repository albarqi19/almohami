/**
 * خدمة التحليل الذكي للمذكرات القانونية (v2).
 *
 * ⚠️ تغيّر معماري (2026-06-17): البرومبتات والتأريض انتقلا للباك إند.
 * هذه الخدمة الآن تنادي endpoint واحداً آمناً:
 *     POST /api/v1/memo-analysis/analyze
 * بدل النداء المتصفحي المباشر لـ OpenRouter (الذي كان يكشف المفتاح). راجع
 * MEMO_ENGINES_UPGRADE_PLAN_2026-06-17.md.
 *
 * تُبقي الواجهة العامة (ANALYSIS_ENGINES / runSingleAnalysis / runFullMemoAnalysis)
 * كما هي حتى لا تنكسر المكوّنات الحالية، وتُرفق النتيجة المنظّمة (data) للعرض الجديد (المرحلة ٧).
 */

import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';
import type { EngineResult, MemoEngineType } from '../types/memoAnalysis';
import { MEMO_ENGINES } from '../types/memoAnalysis';

// أنواع محركات التحليل (مطابقة لـ MemoEngineType في الباك إند)
export type AnalysisEngineType = MemoEngineType;

// واجهة نتيجة التحليل (موسّعة بـ data المنظّمة + توافق خلفي عبر result النصّي)
export interface MemoAnalysisResult {
  engine: AnalysisEngineType;
  engineName: string;
  icon: string;
  result: string; // Markdown مولّد من البنية (توافق خلفي مع العرض الحالي)
  success: boolean;
  processingTime?: number;
  /** النتيجة المنظّمة الكاملة — يستهلكها العرض الجديد (EngineResultView). */
  data?: EngineResult;
  format?: string;
  error?: string;
}

export interface FullMemoAnalysis {
  memoType: string;
  memoTypeName: string;
  analyses: MemoAnalysisResult[];
  overallScore?: number;
  timestamp: Date;
}

export interface AnalyzeOptions {
  clientPosition?: 'plaintiff' | 'defendant' | 'third_party';
  caseId?: number;
}

// معلومات محركات التحليل (مشتقّة من العقد الموحّد)
export const ANALYSIS_ENGINES: Record<AnalysisEngineType, { name: string; icon: string; description: string }> = {
  gatekeeper: { name: 'الحارس الشكلي', icon: '🛡️', description: 'فحص المتطلبات الشكلية والنظامية' },
  brain: { name: 'المحلل الاستراتيجي', icon: '🧠', description: 'التحليل الموضوعي وبناء الاستراتيجية' },
  opponent: { name: 'محاكي الخصم', icon: '⚔️', description: 'توقع رد الخصم وكشف نقاط الضعف' },
  polish: { name: 'المدقق القانوني', icon: '✨', description: 'تحسين الصياغة والتدقيق اللغوي' },
  compliance: { name: 'مراجع الامتثال', icon: '📋', description: 'فحص التوافق مع الأنظمة السعودية' },
};

// ═══════════════════════════════════════════════════════════════
// 🚀 النداء الخلفي
// ═══════════════════════════════════════════════════════════════

/** يستدعي محرّكاً واحداً في الباك إند ويُرجع النتيجة المنظّمة (EngineResult). */
export async function analyzeEngine(
  engine: AnalysisEngineType,
  memoType: string,
  memoText: string,
  opts: AnalyzeOptions = {}
): Promise<EngineResult> {
  const res = await apiClient.post<ApiResponse<EngineResult>>('/memo-analysis/analyze', {
    engine,
    memo_type: memoType,
    memo_text: memoText,
    client_position: opts.clientPosition,
    case_id: opts.caseId,
  });

  if (res.success && res.data) return res.data;
  throw new Error(res.message || 'تعذّر إجراء التحليل الذكي');
}

/** تحليل واحد بمحرك محدد (واجهة متوافقة مع المكوّنات الحالية). */
export async function runSingleAnalysis(
  memoType: string,
  memoContent: string,
  engine: AnalysisEngineType,
  opts: AnalyzeOptions = {}
): Promise<MemoAnalysisResult> {
  const engineInfo = ANALYSIS_ENGINES[engine];
  const startTime = Date.now();

  try {
    const data = await analyzeEngine(engine, memoType, memoContent, opts);
    return {
      engine,
      engineName: engineInfo.name,
      icon: engineInfo.icon,
      result: engineResultToMarkdown(data),
      data,
      format: data.format,
      success: true,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      engine,
      engineName: engineInfo.name,
      icon: engineInfo.icon,
      result: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      success: false,
      processingTime: Date.now() - startTime,
    };
  }
}

async function runEngines(
  engines: AnalysisEngineType[],
  memoType: string,
  memoTypeName: string,
  memoContent: string,
  opts: AnalyzeOptions,
  onProgress?: (completed: number, total: number, current: AnalysisEngineType) => void
): Promise<FullMemoAnalysis> {
  const analyses: MemoAnalysisResult[] = [];

  for (let i = 0; i < engines.length; i++) {
    const engine = engines[i];
    if (onProgress) onProgress(i, engines.length, engine);
    analyses.push(await runSingleAnalysis(memoType, memoContent, engine, opts));
  }

  const scored = analyses.map((a) => a.data?.score).filter((s): s is number => typeof s === 'number');
  const overallScore = scored.length ? Math.round(scored.reduce((x, y) => x + y, 0) / scored.length) : undefined;

  return { memoType, memoTypeName, analyses, overallScore, timestamp: new Date() };
}

/** تشغيل التحليل الكامل بجميع المحركات. */
export function runFullMemoAnalysis(
  memoType: string,
  memoTypeName: string,
  memoContent: string,
  onProgress?: (completed: number, total: number, current: AnalysisEngineType) => void,
  opts: AnalyzeOptions = {}
): Promise<FullMemoAnalysis> {
  return runEngines(['gatekeeper', 'brain', 'opponent', 'polish', 'compliance'], memoType, memoTypeName, memoContent, opts, onProgress);
}

/** تشغيل تحليل سريع (الحارس والعقل فقط). */
export function runQuickAnalysis(
  memoType: string,
  memoTypeName: string,
  memoContent: string,
  onProgress?: (completed: number, total: number, current: AnalysisEngineType) => void,
  opts: AnalyzeOptions = {}
): Promise<FullMemoAnalysis> {
  return runEngines(['gatekeeper', 'brain'], memoType, memoTypeName, memoContent, opts, onProgress);
}

// ═══════════════════════════════════════════════════════════════
// 📝 توليد Markdown من البنية (توافق خلفي + fallback دائم)
// ═══════════════════════════════════════════════════════════════

const VERDICT_ICON: Record<string, string> = { pass: '🟢', warn: '🟡', fail: '🔴' };
const CHECK_ICON: Record<string, string> = { pass: '✅', warn: '⚠️', fail: '❌', na: '➖' };
const SEV_LABEL: Record<string, string> = { critical: 'حرجة', high: 'عالية', medium: 'متوسطة', low: 'منخفضة', info: 'معلومة' };

/** يحوّل EngineResult إلى Markdown مقروء (يستخدمه العرض الحالي حتى تجهز مكوّنات v2). */
export function engineResultToMarkdown(r: EngineResult): string {
  const out: string[] = [];

  if (r.meta?.grounding_mode === 'ungrounded') {
    out.push('> ⚠️ **تحليل اجتهادي بلا سند مؤرّض — يلزم تحقّق المحامي.**\n');
  }

  const vIcon = VERDICT_ICON[r.verdict?.level] ?? '';
  out.push(`## ${vIcon} ${r.verdict?.label ?? ''}`);
  if (r.verdict?.summary) out.push(r.verdict.summary);
  if (typeof r.score === 'number') out.push(`\n**الدرجة:** ${r.score}/100${r.score_label ? ` — ${r.score_label}` : ''}`);

  if (r.deadlines?.length) {
    out.push('\n### ⏰ المهل');
    for (const d of r.deadlines) {
      out.push(`- **${d.label}**${d.days != null ? ` — المتبقّي: ${d.days} يوماً` : ''}`);
    }
  }

  if (r.checklist?.length) {
    out.push('\n### قائمة الفحص');
    for (const c of r.checklist) {
      out.push(`- ${CHECK_ICON[c.status] ?? ''} ${c.label}${c.note ? ` — _${c.note}_` : ''}`);
    }
  }

  if (r.findings?.length) {
    out.push('\n### الملاحظات');
    for (const f of r.findings) {
      out.push(`**[${SEV_LABEL[f.severity] ?? f.severity}] ${f.title}**`);
      if (f.quote) out.push(`> ${f.quote}`);
      if (f.impact) out.push(`- الأثر: ${f.impact}`);
      if (f.recommendation) out.push(`- التوصية: ${f.recommendation}`);
    }
  }

  out.push(...engineSpecificMarkdown(r));

  if (r.citations?.length) {
    out.push('\n### 📚 المواد المستند إليها');
    for (const c of r.citations) {
      out.push(`- [${c.index}] ${c.statute_name} — مادة ${c.article_number}`);
    }
  }

  if (r.needs_verification?.length) {
    out.push('\n### 🔎 يلزم التحقّق');
    for (const n of r.needs_verification) out.push(`- ${n}`);
  }

  return out.join('\n');
}

function engineSpecificMarkdown(r: EngineResult): string[] {
  const es = r.engine_specific ?? {};
  const out: string[] = [];

  if (r.engine === 'brain' && es.strategy && typeof es.strategy === 'object') {
    const s = es.strategy as Record<string, unknown>;
    const strengths = (s.strengths as { point?: string }[]) ?? [];
    const weaknesses = (s.weaknesses as { point?: string }[]) ?? [];
    if (strengths.length) { out.push('\n### 💪 نقاط القوة'); strengths.forEach((x) => out.push(`- ${x.point ?? ''}`)); }
    if (weaknesses.length) { out.push('\n### ⚡ نقاط الضعف'); weaknesses.forEach((x) => out.push(`- ${x.point ?? ''}`)); }
  }

  if (r.engine === 'opponent') {
    const weaknesses = (es.weaknesses as { opponent_move?: string; counter?: string }[]) ?? [];
    if (weaknesses.length) {
      out.push('\n### ⚔️ هجمات الخصم المتوقعة');
      weaknesses.forEach((w) => {
        out.push(`- **الخصم:** ${w.opponent_move ?? ''}`);
        if (w.counter) out.push(`  - **تحصينك:** ${w.counter}`);
      });
    }
  }

  if (r.engine === 'compliance') {
    const items = (es.items as { clause?: string; status?: string; unverified?: boolean }[]) ?? [];
    if (items.length) {
      out.push('\n### 📋 بنود الامتثال');
      items.forEach((it) => out.push(`- ${it.clause ?? ''} → **${it.status ?? ''}**${it.unverified ? ' _(غير مؤكد)_' : ''}`));
    }
  }

  if (r.engine === 'polish') {
    const fixes = (es.language_fixes as { original_text?: string; suggested_text?: string }[]) ?? [];
    if (fixes.length) {
      out.push('\n### ✨ تحسينات الصياغة');
      fixes.forEach((f) => out.push(`- ~~${f.original_text ?? ''}~~ → **${f.suggested_text ?? ''}**`));
    }
  }

  return out;
}

export default {
  runFullMemoAnalysis,
  runQuickAnalysis,
  runSingleAnalysis,
  analyzeEngine,
  engineResultToMarkdown,
  ANALYSIS_ENGINES,
  MEMO_ENGINES,
};
