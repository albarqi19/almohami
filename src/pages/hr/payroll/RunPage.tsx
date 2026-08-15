import React, { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, FileSpreadsheet, Lock, RefreshCw } from 'lucide-react';

import { hrPayrollService } from '../../../services/hrPayrollService';
import BankInputFilePanel from './BankInputFilePanel';
import PayslipPanel from './PayslipPanel';
import ReadinessBoard from './ReadinessBoard';
import RunApproveStage from './RunApproveStage';
import RunComputeStage from './RunComputeStage';
import RunPayStage from './RunPayStage';
import RunPreflightStage from './RunPreflightStage';
import RunReviewStage from './RunReviewStage';
import RunRosterStage from './RunRosterStage';
import RunStageBar from './RunStageBar';
import {
  errorText,
  fmtDateHuman,
  outOf,
  payCountdown,
  POSTING_STATE_LABELS,
  RUN_STAGE_LABELS,
  RUN_TYPE_LABELS,
  stageDoneThrough,
  stageOfRun,
  STAGES,
  WINDOW_TONE_CLASS,
  windowCountdown,
} from './payrollFormat';
import type { StageKey } from './payrollFormat';

/**
 * **المسير** — `/hr/payroll/runs/:id?stage=`.
 *
 * ══════ صفحةٌ واحدةٌ بمراحل، والحالةُ في الرابط ══════
 * لا معالجَ متعدّدَ الصفحات: يكسر النمطَ الملتصق ويُفقد عمودَ المنسوبين. و`?stage=` في
 * الرابط يجعل الموضعَ قابلاً للمشاركة ولا يضيع بالتحديث ولا بخطأٍ عابر.
 *
 * ══════ المشحونُ هنا خمسُ مراحل ══════
 * ① **النطاق** ② **الفحصُ القبْليّ** ③ **الاحتساب** ④ **المراجعة** ⑤ **الاعتماد**.
 * والاثنتان الباقيتان (الدفعُ والنشر) تظهران في الشريط **معطَّلتين وتحت كلٍّ سببُها** —
 * لا تُخفيان.
 *
 * ══════ 🔴 وتُفتح على مرحلة المسير الفعلية ══════
 * الخطوةُ الأولى ليست موضعَ كلّ مسير: معتمَدٌ يُفتح على «النطاق» يقول لصاحبه إنّه في أوّل
 * الطريق وهو في آخره. والاشتقاقُ من `run.stage`، و`?stage=` يتجاوزه لمن يشارك رابطاً.
 *
 * ══════ الحالاتُ الأربع ══════
 * تحميلٌ (هيكل) · فارغٌ (لا يقع: المسيرُ لا يُفتح فارغاً — D23، والحالةُ محفوظةٌ لمسيرٍ حُذف
 * نطاقُه) · مقفلٌ (٤٠٤ أو صلاحيةٌ ناقصة) · خطأٌ **مع بقاء المرحلة في الرابط** فلا يضيع الموضع.
 */

const VALID_STAGES = STAGES.map((stage) => stage.key);

export const RunPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const runId = Number(id ?? '');
  const stageParam = params.get('stage') as StageKey | null;

  // 🔴 القسيمةُ المختارةُ في الرابط كذلك: مراجعُ الرواتب يشارك سطراً بعينه مع محاسبه،
  // ورقمُ السطر في الحالة المحلّية وحدَها يضيع بأوّل تحديث.
  const lineParam = params.get('line');
  const selectedLineId = lineParam === null || Number.isNaN(Number(lineParam)) ? null : Number(lineParam);

  const runQuery = useQuery({
    queryKey: ['hr', 'payroll', 'run', runId],
    queryFn: () => hrPayrollService.getRun(runId),
    enabled: Number.isFinite(runId) && runId > 0,
    staleTime: 30_000,
  });

  /**
   * 🔴 **الشاشةُ تُفتح على مرحلة المسير الفعلية** — لا على أوّلها دائماً.
   *
   * `stage = stageParam ?? 'roster'` كان يفتح مسيراً **معتمَداً** على «النطاق»، فيقرأ صاحبُه
   * خطوةً أولى نظيفةً عن مستندٍ وقّعه أمسِ فيظنّ أنّه لم يعتمد بعد — وهو لبسٌ خطيرٌ في شاشةٍ
   * ذاتِ اتجاهٍ واحد. و`?stage=` يتجاوز الاشتقاقَ دائماً لمن يشارك رابطاً بعينه.
   */
  const runStage = runQuery.data?.data.run.stage;
  const stage: StageKey =
    stageParam !== null && VALID_STAGES.includes(stageParam) ? stageParam : stageOfRun(runStage);

  const preflightQuery = useQuery({
    queryKey: ['hr', 'payroll', 'run-preflight', runId],
    queryFn: () => hrPayrollService.getPreflight(runId),
    enabled: Number.isFinite(runId) && runId > 0 && stage === 'preflight',
    staleTime: 30_000,
  });

  const proposalsQuery = useQuery({
    queryKey: ['hr', 'payroll', 'run-proposals', runId],
    queryFn: () => hrPayrollService.getProposals(runId),
    enabled: Number.isFinite(runId) && runId > 0 && stage === 'preflight',
    staleTime: 30_000,
  });

  // مجاميعُ المسير تلزم مرحلةَ الاعتماد كما تلزم الاحتساب: التوقيعُ يقع على مبلغٍ مقروءٍ
  // فوق الزرّ، لا على وعدٍ بأنّ الأرقام صحيحة.
  const linesQuery = useQuery({
    queryKey: ['hr', 'payroll', 'run-lines', runId],
    queryFn: () => hrPayrollService.getLines(runId),
    enabled: Number.isFinite(runId) && runId > 0 && (stage === 'compute' || stage === 'approve'),
    staleTime: 30_000,
  });

  const driftQuery = useQuery({
    queryKey: ['hr', 'payroll', 'run-drift', runId],
    queryFn: () => hrPayrollService.getDrift(runId),
    enabled: Number.isFinite(runId) && runId > 0 && stage === 'review',
    staleTime: 30_000,
  });

  // S6 — لوحُ الدفع: حالةُ تحويلِ كلّ سطرٍ ورصيدُه في الدفتر. **بلا استطلاعٍ دوريّ**:
  // التحويلُ البنكيّ لا يصل بينما ينظر أحدٌ إلى الشاشة، والاستطلاعُ يوهم بأنّه قد يصل.
  const paymentsQuery = useQuery({
    queryKey: ['hr', 'payroll', 'run-payments', runId],
    queryFn: () => hrPayrollService.getPayments(runId),
    enabled: Number.isFinite(runId) && runId > 0 && stage === 'pay',
    staleTime: 30_000,
  });

  const payslipQuery = useQuery({
    queryKey: ['hr', 'payroll', 'payslip', selectedLineId],
    queryFn: () => hrPayrollService.getPayslip(selectedLineId as number),
    enabled: selectedLineId !== null,
    staleTime: 30_000,
  });

  const rebuildMutation = useMutation({
    mutationFn: () => hrPayrollService.rebuildRoster(runId),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'run', runId] });
      void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'run-preflight', runId] });
    },
    onError: (error) => setActionError(errorText(error, 'تعذّرت إعادةُ بناء النطاق.')),
  });

  const computeMutation = useMutation({
    mutationFn: () => hrPayrollService.compute(runId),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'run', runId] });
      void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'run-lines', runId] });
      void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'run-drift', runId] });
      void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'payslip'] });
    },
    onError: (error) => setActionError(errorText(error, 'تعذّر الاحتساب.')),
  });

  const setStage = (next: StageKey) => {
    const params2 = new URLSearchParams(params);
    params2.set('stage', next);
    setParams(params2, { replace: true });
  };

  const selectLine = (lineId: number) => {
    const params2 = new URLSearchParams(params);
    params2.set('line', String(lineId));
    setParams(params2, { replace: true });
  };

  const queryError = runQuery.error;
  const lockedMessage =
    queryError instanceof Error && /غير مفعّل|غير مصرح|صلاحية|غيرُ موجود|Unauthorized|Forbidden|Not Found/i.test(queryError.message)
      ? queryError.message
      : null;

  if (lockedMessage !== null) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--locked">
          <Lock size={22} />
          <p className="hrl-state__t">هذا المسيرُ غيرُ متاحٍ لك</p>
          <p className="hrl-state__d">{lockedMessage}</p>
          <Link className="hrl-link" to="/hr/payroll">
            عُد إلى الرواتب
          </Link>
        </div>
      </div>
    );
  }

  if (runQuery.isLoading) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--loading">
          <span className="hrl-skel hrl-skel--line" />
          <span className="hrl-skel hrl-skel--line" />
          <span className="hrl-skel hrl-skel--line" />
        </div>
      </div>
    );
  }

  if (runQuery.isError) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--error">
          <AlertTriangle size={22} />
          <p className="hrl-state__t">تعذّر جلبُ المسير</p>
          <p className="hrl-state__d">{errorText(runQuery.error, 'خطأٌ غيرُ متوقَّع.')}</p>
          <button type="button" className="hr-btn hr-btn--sm" onClick={() => void runQuery.refetch()}>
            <RefreshCw size={13} /> أعد المحاولة
          </button>
        </div>
      </div>
    );
  }

  const detail = runQuery.data?.data;
  const meta = runQuery.data?.meta;

  if (detail === undefined || meta === undefined) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--empty">
          <FileSpreadsheet size={22} />
          <p className="hrl-state__t">لا نطاقَ لهذا المسير</p>
          <p className="hrl-state__d">المسيرُ لا يُفتح فارغاً — أعد بناءَ نطاقه أو افتح مسيراً جديداً.</p>
        </div>
      </div>
    );
  }

  const run = detail.run;
  const daysToPay = Math.round(
    (new Date(`${run.pay_date}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000
  );

  return (
    <div className="hrl-page">
      <header className="hrl-head">
        <div className="hrl-head__id">
          <h1 className="hrl-h1">
            {/* رقمُ المسير يُحجَز عند الاعتماد وحدَه — وقبله يُعرَّف بمعرّفه **موسوماً بأنّه
                بلا رقم**، لا بكلمة «مسوّدة» التي تكذب على مسيرٍ محتسَبٍ مراجَع. */}
            <FileSpreadsheet size={16} /> {run.run_number ?? `مسيرٌ بلا رقم #${run.id}`}
          </h1>
          <p className="hrl-sub">
            {RUN_TYPE_LABELS[run.run_type] ?? run.run_type} · {fmtDateHuman(run.period_start)} —{' '}
            {fmtDateHuman(run.period_end)} · {POSTING_STATE_LABELS[run.posting_state]}
          </p>
        </div>

        <div className="hrl-head__badges">
          {/* 🔴 لا مُعرِّفَ داخليٌّ في الرأس: `4` عاريةً بجانب «المشمولون ٧ من ٨» وبنفس
              هيئتها تُقرأ عدداً، والرقمُ الرسميُّ `PR-1448-0001` فوقها مباشرةً. فالحقيقةُ
              هنا **المرحلةُ باسمها**، ورقمُ الصفّ في الرابط لمن يحتاجه. */}
          <span className="hrl-fact hrl-fact--gold">
            المرحلة
            <span className="hrl-fact__n">{RUN_STAGE_LABELS[run.stage]}</span>
          </span>
          {/* 🔴 وكلُّ عددٍ يُسمّى بما هو: هذا **نطاقٌ مجمَّدٌ وقت بنائه** لا جاهزيةٌ حيّة —
              ولوحُ الجاهزية في العمود المجاور يعرض «٧ من ٩» عن المكتب اليوم. ورقمان
              متقاربان بلا حرفٍ يفرّقهما يجعلان أحدَهما يبدو خطأً في الآخر.
              🩸 و`dir="ltr"` للأرقام الصِرفة وحدَها — «٧ من ٨» تحت اتجاهٍ لاتينيٍّ تُقرأ
              «٨ من ٧»، وهو رقمٌ خاطئٌ يبدو صحيحاً. */}
          <span className="hrl-fact">
            نطاقٌ مجمَّد
            <span className="hrl-fact__n">{outOf(run.headcount_included, run.headcount_total)}</span>
          </span>
          <span className="hrl-fact">
            {payCountdown(daysToPay)}
            <span className="hrl-fact__n">{fmtDateHuman(run.pay_date)}</span>
          </span>
          {/* ⏳ **مهلةُ الثلاثين يوماً** — شارةٌ مستقلّةٌ عن «يومِ الصرف» لا مرادفةٌ له: ذاك
              موعدُ المكتب، وهذه مهلةٌ نظاميةٌ تُقاس من الاستحقاق. ومكتبٌ يصرف في موعده وقد
              تنقضي عليه المهلةُ لأنّ ملفَّ بنكه لم يُطلَب. والنبرةُ تصل من الخادم فلا تفترق
              عن نبرة المدقّق في الشاشة نفسِها.
              🔴 ولا نسبةَ التزامٍ بجوارها: مقامُها عددُ المسجَّلين في التأمينات ولا نملكه. */}
          {run.statutory_window.deadline_on !== null && (
            <span className={WINDOW_TONE_CLASS[run.statutory_window.tone]}>
              {windowCountdown(run.statutory_window)}
              <span className="hrl-fact__n">{fmtDateHuman(run.statutory_window.deadline_on)}</span>
            </span>
          )}
        </div>
      </header>

      <RunStageBar current={stage} done={stageDoneThrough(run.stage)} onSelect={setStage} />

      {actionError !== null && (
        <div className="hrl-flag hrl-flag--block" role="status">
          <p className="hrl-flag__t">
            <AlertTriangle size={13} /> {actionError}
          </p>
        </div>
      )}

      <div className="hrl-cols">
        <div className="hrl-cols__main">
          <div className="hrl-wall">
            {/* ⬇️ **كشفُ الرواتب للبنك** — يظهر في مرحلتَي الاعتماد والدفع لا في غيرهما:
                قبلهما لا رقمَ مجمَّدٌ يُسلَّم، وبعدهما الشاشةُ تخصّ النشرَ لا التسليم. وموضعُه
                أعلى الجدار لأنّه أوّلُ ما يُفعَل بعد التوقيع.
                🔴 وليس ما ينزل منه ملفَّ حماية الأجور: ذاك يصدره البنكُ موقَّعاً بمفتاحه بعد
                تنفيذ التحويلات، ورفعُه فعلٌ تقوم به المنشأة. */}
            {(stage === 'approve' || stage === 'pay') && <BankInputFilePanel runId={run.id} />}

            {stage === 'roster' && (
              <RunRosterStage
                detail={detail}
                meta={meta}
                rebuilding={rebuildMutation.isPending}
                onRebuild={() => rebuildMutation.mutate()}
              />
            )}

            {stage === 'preflight' &&
              (preflightQuery.isLoading ? (
                <div className="hrl-state hrl-state--loading">
                  <span className="hrl-skel hrl-skel--line" />
                  <span className="hrl-skel hrl-skel--line" />
                  <span className="hrl-skel hrl-skel--line" />
                </div>
              ) : preflightQuery.isError ? (
                <div className="hrl-state hrl-state--error">
                  <AlertTriangle size={22} />
                  <p className="hrl-state__t">تعذّر الفحصُ القبْليّ</p>
                  <p className="hrl-state__d">{errorText(preflightQuery.error, 'خطأٌ غيرُ متوقَّع.')}</p>
                  <button type="button" className="hr-btn hr-btn--sm" onClick={() => void preflightQuery.refetch()}>
                    <RefreshCw size={13} /> أعد المحاولة
                  </button>
                </div>
              ) : preflightQuery.data === undefined ? null : (
                <RunPreflightStage
                  preflight={preflightQuery.data}
                  proposals={proposalsQuery.data?.data ?? []}
                  proposalsLoading={proposalsQuery.isLoading}
                  decideAvailable={proposalsQuery.data?.meta.decide_available ?? false}
                  runId={run.id}
                  onDecided={() => {
                    void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'run-proposals', runId] });
                    void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'run-preflight', runId] });
                    void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'run', runId] });
                  }}
                />
              ))}

            {stage === 'compute' &&
              (linesQuery.isLoading ? (
                <div className="hrl-state hrl-state--loading">
                  <span className="hrl-skel hrl-skel--line" />
                  <span className="hrl-skel hrl-skel--line" />
                  <span className="hrl-skel hrl-skel--line" />
                </div>
              ) : linesQuery.isError ? (
                <div className="hrl-state hrl-state--error">
                  <AlertTriangle size={22} />
                  <p className="hrl-state__t">تعذّر جلبُ جدول الاحتساب</p>
                  <p className="hrl-state__d">{errorText(linesQuery.error, 'خطأٌ غيرُ متوقَّع.')}</p>
                  <button type="button" className="hr-btn hr-btn--sm" onClick={() => void linesQuery.refetch()}>
                    <RefreshCw size={13} /> أعد المحاولة
                  </button>
                </div>
              ) : linesQuery.data === undefined ? null : (
                <RunComputeStage
                  data={linesQuery.data.data}
                  meta={linesQuery.data.meta}
                  selectedLineId={selectedLineId}
                  computing={computeMutation.isPending}
                  onSelect={selectLine}
                  onCompute={() => computeMutation.mutate()}
                />
              ))}

            {stage === 'review' &&
              (driftQuery.isLoading ? (
                <div className="hrl-state hrl-state--loading">
                  <span className="hrl-skel hrl-skel--line" />
                  <span className="hrl-skel hrl-skel--line" />
                  <span className="hrl-skel hrl-skel--line" />
                </div>
              ) : driftQuery.isError ? (
                <div className="hrl-state hrl-state--error">
                  <AlertTriangle size={22} />
                  <p className="hrl-state__t">تعذّرت المراجعة</p>
                  <p className="hrl-state__d">{errorText(driftQuery.error, 'خطأٌ غيرُ متوقَّع.')}</p>
                  <button type="button" className="hr-btn hr-btn--sm" onClick={() => void driftQuery.refetch()}>
                    <RefreshCw size={13} /> أعد المحاولة
                  </button>
                </div>
              ) : driftQuery.data === undefined ? null : (
                <RunReviewStage
                  data={driftQuery.data.data}
                  meta={driftQuery.data.meta}
                  selectedLineId={selectedLineId}
                  onSelect={selectLine}
                />
              ))}

            {stage === 'approve' &&
              (linesQuery.isLoading ? (
                <div className="hrl-state hrl-state--loading">
                  <span className="hrl-skel hrl-skel--line" />
                  <span className="hrl-skel hrl-skel--line" />
                  <span className="hrl-skel hrl-skel--line" />
                </div>
              ) : linesQuery.isError ? (
                <div className="hrl-state hrl-state--error">
                  <AlertTriangle size={22} />
                  <p className="hrl-state__t">تعذّر جلبُ مجاميع المسير</p>
                  <p className="hrl-state__d">{errorText(linesQuery.error, 'خطأٌ غيرُ متوقَّع.')}</p>
                  <button type="button" className="hr-btn hr-btn--sm" onClick={() => void linesQuery.refetch()}>
                    <RefreshCw size={13} /> أعد المحاولة
                  </button>
                </div>
              ) : (
                <RunApproveStage
                  run={run}
                  totals={linesQuery.data?.data.run.totals ?? null}
                  canViewAmounts={linesQuery.data?.meta.can_view_amounts ?? false}
                  canApprove={meta.can_approve}
                  linesCount={linesQuery.data?.meta.lines_count ?? run.headcount_included}
                  onApproved={() => {
                    setActionError(null);
                    void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'run', runId] });
                    void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'run-lines', runId] });
                    void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'run-drift', runId] });
                    void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'payslip'] });
                    void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'overview'] });
                  }}
                />
              ))}

            {/* 🔑 المرحلةُ ٦ — الدفع: **الفاشلُ يظهر بسببه وبزرِّ إعادة ولا يختفي** (D17). */}
            {stage === 'pay' &&
              (paymentsQuery.isLoading ? (
                <div className="hrl-state hrl-state--loading">
                  <span className="hrl-skel hrl-skel--line" />
                  <span className="hrl-skel hrl-skel--line" />
                  <span className="hrl-skel hrl-skel--line" />
                </div>
              ) : paymentsQuery.isError ? (
                <div className="hrl-state hrl-state--error">
                  <AlertTriangle size={22} />
                  <p className="hrl-state__t">تعذّر جلبُ لوح الدفع</p>
                  <p className="hrl-state__d">{errorText(paymentsQuery.error, 'خطأٌ غيرُ متوقَّع.')}</p>
                  <button type="button" className="hr-btn hr-btn--sm" onClick={() => void paymentsQuery.refetch()}>
                    <RefreshCw size={13} /> أعد المحاولة
                  </button>
                </div>
              ) : paymentsQuery.data === undefined ? null : (
                <RunPayStage
                  data={paymentsQuery.data.data}
                  meta={paymentsQuery.data.meta}
                  selectedLineId={selectedLineId}
                  onSelect={selectLine}
                  onChanged={() => {
                    setActionError(null);
                    void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'run-payments', runId] });
                    void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'run', runId] });
                    void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'runs'] });
                    void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'overview'] });
                  }}
                />
              ))}
          </div>
        </div>

        <aside className="hrl-cols__side">
          {/* 🔴 القسيمةُ تبقى مرئيةً في كلّ المراحل: المسيرُ مستندٌ يُراجَع سطراً سطراً،
              وفتحُها في مودالٍ يحجب الجدولَ الذي جاء المراجعُ ليقارن به. */}
          {selectedLineId !== null && payslipQuery.data !== undefined ? (
            <PayslipPanel payslip={payslipQuery.data.data} editable={payslipQuery.data.meta.editable} />
          ) : selectedLineId !== null && payslipQuery.isLoading ? (
            <div className="hrl-state hrl-state--loading">
              <span className="hrl-skel hrl-skel--line" />
              <span className="hrl-skel hrl-skel--line" />
            </div>
          ) : selectedLineId !== null && payslipQuery.isError ? (
            <div className="hrl-state hrl-state--error">
              <AlertTriangle size={22} />
              <p className="hrl-state__t">تعذّر جلبُ القسيمة</p>
              <p className="hrl-state__d">{errorText(payslipQuery.error, 'خطأٌ غيرُ متوقَّع.')}</p>
            </div>
          ) : stage === 'preflight' && preflightQuery.data !== undefined ? (
            <ReadinessBoard
              readiness={preflightQuery.data.readiness}
              runId={run.id}
              frozen={{ included: run.headcount_included, total: run.headcount_total }}
              title="الجاهزيةُ الآن"
              headingId="run-readiness-h"
            />
          ) : (
            <section className="hrl-block" aria-labelledby="run-side-h">
              <header className="hrl-block__h">
                <h2 className="hrl-block__t" id="run-side-h">
                  ما الذي جُمِّد في هذا المسير
                </h2>
              </header>

              <div className="hrl-block__b">
                <dl className="hrl-kv">
                  <dt>النطاقُ المجمَّد</dt>
                  <dd>{outOf(run.headcount_included, run.headcount_total)} — بأسماء المستبعَدين ورموزِ أسبابهم.</dd>
                  <dt>المرحلة</dt>
                  <dd>{RUN_STAGE_LABELS[run.stage]}</dd>
                  <dt>المحاسبة</dt>
                  <dd>{POSTING_STATE_LABELS[run.posting_state]}</dd>
                  <dt>تاريخُ الصرف</dt>
                  <dd>{fmtDateHuman(run.pay_date)}</dd>
                </dl>

                {/* 🔴 الرقمان يُسمَّيان ويُفرَّق بينهما: النطاقُ لقطةٌ، والجاهزيةُ قياسٌ حيّ.
                    والفرقُ يقع في الإنتاج مع كلّ تعيينٍ بعد بناء النطاق — فيبدو أحدُهما
                    خطأً في الآخر ما لم يُقَل ما هو. */}
                <p className="hrl-hint">
                  والنطاقُ أعلاه <strong>لقطةٌ مجمَّدةٌ وقتَ بنائه</strong>، أمّا «الجاهزيةُ الآن»
                  في الفحص القبْليّ فتُقاس على منسوبي المكتب اليوم — فمن عُيِّن بعد البناء يظهر
                  فيها ولا يدخل هذا المسيرَ حتى يُعاد بناءُ نطاقه.
                </p>

                {/* 🩸 كان هذا التلميحُ يظهر في **كلّ** مرحلةٍ لا يُختار فيها سطر — فيقرؤه
                    المراجعُ في المراجعة والاعتماد بينما الشاشةُ نفسُها تعرض سبعةَ صوافٍ
                    ومجاميعَ مسيرٍ معتمَد. وهو صادقٌ في مرحلة النطاق وحدَها، ومشروطٌ فوقها
                    بـ`run.computed`: مسيرٌ حُسب ثمّ عُدنا إلى نطاقه له أرقامٌ قائمةٌ فعلاً،
                    ونفيُها عنه كذبةٌ ثانيةٌ من الباب نفسِه. */}
                {stage === 'roster' && run.computed === false && (
                  <p className="hrl-hint">
                    ولا رقمَ ماليَّ في هذه المرحلة: الأرقامُ تصل مع الاحتساب، وعرضُ أصفارٍ قبله
                    يقول «الصافي صفر» عن مسيرٍ لم يُحسب.
                  </p>
                )}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};

export default RunPage;
