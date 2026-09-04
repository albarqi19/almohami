import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileText,
  Info,
  Lock,
  RefreshCw,
  Scale,
  ShieldAlert,
  Wallet,
} from 'lucide-react';

import { hrSettlementService } from '../../../services/hrSettlementService';
import { EMPTY_MARK, errorText, fmtDateHuman, money, RUN_STAGE_LABELS } from '../payroll/payrollFormat';
import type { RunStage } from '../../../types/hrPayroll';
import type {
  SettlementBlock,
  SettlementItem,
  SettlementStatement,
  TerminationBasisCode,
} from '../../../types/hrSettlement';

/**
 * **مسيرُ التصفية** — `/hr/payroll/settlements/:id`.
 *
 * ══════ ما تجيب عنه هذه الشاشة ══════
 * سؤالاً واحداً: «بكم تُصفَّى حقوقُ هذا الموظف، **ولماذا بالضبط**؟» — بحيث يستطيع إنسانٌ أن
 * يُعيد الحسابَ بالورقة أمام المحكمة العمالية. ولذلك لا يظهر رقمٌ عارياً في أيّ موضع: كلُّ
 * كتلةٍ تحمل مادّتَها ومصدرَها وسطرَ «لماذا هذا المبلغ».
 *
 * ══════ 🔴 سببُ الإنهاء **أوّلُ ما يُطلَب** — لا حقلٌ في نموذجٍ طويل ══════
 * وهو الحقلُ الذي يقلب النتيجةَ من صفرٍ إلى المكافأة كاملة، فيسكن أعلى الصفحة وحدَه في بطاقةٍ
 * مستقلّة. وقبل اختياره **يُعرَض في مكان المكافأة نداءٌ يطلبه** لا رقمٌ ولا صفر — لأنّ الصفرَ
 * حكمُ م.٨٠ لا حكمُ الجهل، وطباعتُه هنا عطلٌ صامتٌ يبدو التزاماً بالنظام.
 *
 * ══════ 🔴 وتغييرُه يُعيد الحسابَ أمام العين ══════
 * الخادمُ يُعيد الاحتسابَ في نداء `basis` نفسِه ويردّ البيانَ الجديد، فيرى من غيَّر السببَ أثرَ
 * تغييره فوراً. وحقلٌ لا يُرى أثرُه يُملأ عشوائياً.
 *
 * ══════ 🔴 وكلُّ رقمٍ هنا مقروءٌ من الخادم لا محسوبٌ في المتصفّح ══════
 * صفرُ جمعٍ في هذه الشاشة: المجاميعُ تصل مخزَّنةً في صفّها. وجمعٌ في الواجهة يجعل الورقةَ
 * المطبوعة تختلف عن الصفّ المحفوظ يومَ يختلفان — وهو يومٌ يأتي.
 */

const BASIS_HINTS: Partial<Record<TerminationBasisCode, string>> = {
  art85_resignation:
    'الاستقالة فقط هي التي يخفض فيها الاستحقاق (ثلث · ثلثان · كاملة). وتعديل ٢٠٢٥ عرفها: '
    + 'كتابية غير مكرهة وغير معلقة، مقبولة أو انقضت مهلتها. ومن ترك العمل بلا استقالة مقبولة ليس مستقيلاً.',
  art81_worker_left_for_cause:
    'كاملة بلا تدرج م.٨٥. وهو **استنتاج من مفهوم المخالفة لا نص صريح**، وعبء إثبات السبب على العامل. '
    + 'ولذلك المستند إلزامي.',
  art87_force_majeure:
    '«القوة القاهرة» لا تعريف نظامي لها وتقديرها للمحكمة العمالية حالة بحالة. فلا تخترها بنقرة واحدة بلا مستند.',
  art87_marriage: 'مهلتها ستة أشهر من تاريخ عقد الزواج، ويلزم تاريخ الواقعة المرجعية.',
  art87_delivery: 'مهلتها ثلاثة أشهر من تاريخ الوضع، ويلزم تاريخ الواقعة المرجعية.',
  art80_dismissal:
    'سقوط المكافأة كاملة. **وشرط إتاحة فرصة المعارضة جزء من نص المادة لا إجراء تنظيمي**: '
    + 'فسخ بدونه قابل للإبطال فتعود المكافأة كاملة ومعها تعويض م.٧٧.',
};

/** الكتلُ الأربعُ بترتيب قراءتها — الاسمُ والأيقونةُ في موضعٍ واحدٍ فلا تتباعد نسختان. */
const BLOCK_ORDER: Array<{ key: 'eos' | 'leave_cash' | 'final_period' | 'dues'; title: string; icon: React.ReactNode }> = [
  { key: 'eos', title: 'مكافأة نهاية الخدمة', icon: <Scale size={15} /> },
  { key: 'leave_cash', title: 'بدل رصيد الإجازة', icon: <CalendarClock size={15} /> },
  { key: 'final_period', title: 'أجر آخر مدة', icon: <Wallet size={15} /> },
  { key: 'dues', title: 'ما على الموظف', icon: <ShieldAlert size={15} /> },
];

export const SettlementPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const runId = Number(id);
  const queryClient = useQueryClient();

  const [basis, setBasis] = useState<TerminationBasisCode | ''>('');
  const [documentPath, setDocumentPath] = useState('');
  const [anchorDate, setAnchorDate] = useState('');
  const [objectionGiven, setObjectionGiven] = useState(false);
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const view = useQuery({
    queryKey: ['hr', 'settlement', runId],
    queryFn: () => hrSettlementService.get(runId),
    enabled: Number.isFinite(runId) && runId > 0,
  });

  const statement = view.data?.statement;
  const meta = view.data?.meta;

  // الحقولُ تُهيَّأ من الصفّ المحفوظ **مرّةً** عند وصوله، ثمّ تبقى بيد المستخدم.
  const [hydrated, setHydrated] = useState(false);
  React.useEffect(() => {
    if (statement === undefined || hydrated) return;
    setBasis(statement.basis.termination_basis ?? '');
    setDocumentPath(statement.basis.document_path ?? '');
    setAnchorDate(statement.basis.anchor_date ?? '');
    setObjectionGiven(statement.basis.objection_opportunity_given === true);
    setNote(statement.basis.note ?? '');
    setHydrated(true);
  }, [statement, hydrated]);

  const chosen = useMemo(
    () => statement?.basis.options.find((option) => option.basis === basis) ?? null,
    [statement, basis]
  );

  const invalidate = (fresh: SettlementStatement) => {
    queryClient.setQueryData(['hr', 'settlement', runId], (old: typeof view.data) =>
      old === undefined ? old : { ...old, statement: fresh }
    );
    void queryClient.invalidateQueries({ queryKey: ['hr', 'settlement', runId] });
  };

  const basisMutation = useMutation({
    mutationFn: () =>
      hrSettlementService.saveBasis(runId, {
        termination_basis: basis as TerminationBasisCode,
        basis_document_path: documentPath === '' ? null : documentPath,
        anchor_date: anchorDate === '' ? null : anchorDate,
        objection_opportunity_given: basis === 'art80_dismissal' ? objectionGiven : null,
        basis_note: note === '' ? null : note,
      }),
    onSuccess: (fresh) => {
      setActionError(null);
      invalidate(fresh);
    },
    onError: (error) => setActionError(errorText(error, 'تعذر حفظ سبب الإنهاء.')),
  });

  const computeMutation = useMutation({
    mutationFn: () => hrSettlementService.compute(runId),
    onSuccess: (fresh) => {
      setActionError(null);
      invalidate(fresh);
    },
    onError: (error) => setActionError(errorText(error, 'تعذر الاحتساب.')),
  });

  const approveMutation = useMutation({
    mutationFn: () => hrSettlementService.approve(runId, {}),
    onSuccess: (fresh) => {
      setActionError(null);
      invalidate(fresh);
    },
    onError: (error) => setActionError(errorText(error, 'تعذر الاعتماد.')),
  });

  if (!Number.isFinite(runId) || runId <= 0) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--error">
          <AlertTriangle size={22} />
          <p className="hrl-state__t">رقم تصفية غير صالح</p>
        </div>
      </div>
    );
  }

  if (view.isLoading) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--loading">
          <span className="hrl-skel hrl-skel--line" />
          <span className="hrl-skel hrl-skel--line" />
        </div>
      </div>
    );
  }

  if (view.isError || statement === undefined || meta === undefined) {
    const message = errorText(view.error, 'خطأ غير متوقع.');
    const locked = /صلاحية|غير مصرح|Forbidden|Unauthorized/i.test(message);

    return (
      <div className="hrl-page">
        <div className={`hrl-state ${locked ? 'hrl-state--locked' : 'hrl-state--error'}`}>
          {locked ? <Lock size={22} /> : <AlertTriangle size={22} />}
          <p className="hrl-state__t">{locked ? 'بيان التصفية غير متاح لك' : 'تعذر تحميل بيان التصفية'}</p>
          <p className="hrl-state__d">{message}</p>
          {!locked && (
            <button type="button" className="hr-btn hr-btn--sm" onClick={() => void view.refetch()}>
              <RefreshCw size={13} /> أعد المحاولة
            </button>
          )}
        </div>
      </div>
    );
  }

  const basisSet = statement.basis.is_set;
  const editable = meta.editable;
  const busy = basisMutation.isPending || computeMutation.isPending || approveMutation.isPending;

  return (
    <div className="hrl-page hrs-page">
      {/* ───────── الرأس ───────── */}
      <header className="hrs-head">
        <div className="hrs-head__id">
          <h1 className="hrs-head__t">
            تصفية حقوق {statement.employee.name}
          </h1>
          <p className="hrs-head__s">
            التحق {fmtDateHuman(statement.employee.joined_on)} · آخر يوم خدمة{' '}
            {fmtDateHuman(statement.employee.last_working_day)}
            {meta.run.run_number === null ? '' : ` · ${meta.run.run_number}`}
          </p>
        </div>
        <div className="hrs-head__meta">
          <span className={`hrs-stage hrs-stage--${meta.run.stage}`}>
            {RUN_STAGE_LABELS[meta.run.stage as RunStage] ?? meta.run.stage}
          </span>
          {statement.is_frozen && (
            <span className="hrs-stage hrs-stage--frozen">
              <Lock size={12} /> مقفلة
            </span>
          )}
        </div>
      </header>

      {/* ───────── ① سببُ الإنهاء — أوّلُ ما يُطلَب ───────── */}
      <section className={`hrs-card hrs-basis ${basisSet ? '' : 'hrs-basis--missing'}`}>
        <div className="hrs-card__head">
          <h2 className="hrs-card__t">
            <FileText size={15} /> سبب إنهاء الخدمة
          </h2>
          {basisSet ? (
            <span className="hrs-tag hrs-tag--ok">
              {statement.basis.label_ar} · {statement.basis.article_ref}
            </span>
          ) : (
            <span className="hrs-tag hrs-tag--need">مطلوب قبل احتساب المكافأة</span>
          )}
        </div>

        {statement.basis.request_message !== null && (
          <p className="hrs-ask">{statement.basis.request_message}</p>
        )}

        {basisSet && (
          <p className="hrs-who">
            صنفها <strong>{statement.basis.decided_by_name ?? EMPTY_MARK}</strong>
            {statement.basis.decided_at === null ? '' : ` بتاريخ ${fmtDateHuman(statement.basis.decided_at)}`}. وهو
            المسؤول عنها عند النزاع. والتصنيف قرار مسجل باسم من اتخذه ولا يحدد تلقائياً.
          </p>
        )}

        {editable ? (
          <div className="hrs-basis__form">
            <label className="hrs-field">
              <span className="hrs-field__l">السبب (قائمة مغلقة من اثني عشر سبباً)</span>
              <select
                className="hrs-field__c"
                value={basis}
                disabled={busy}
                onChange={(event) => setBasis(event.target.value as TerminationBasisCode | '')}
              >
                <option value="">— اختر السبب —</option>
                {statement.basis.options.map((option) => (
                  <option key={option.basis} value={option.basis}>
                    {option.label_ar} ({option.article_ref})
                  </option>
                ))}
              </select>
            </label>

            {chosen !== null && BASIS_HINTS[chosen.basis] !== undefined && (
              <p className="hrs-hint">
                <Info size={13} /> {BASIS_HINTS[chosen.basis]}
              </p>
            )}

            {chosen?.document_required === true && (
              <label className="hrs-field">
                <span className="hrs-field__l">
                  مسار المستند (<strong>إلزامي</strong>) لإثبات السبب
                </span>
                <input
                  className="hrs-field__c"
                  type="text"
                  value={documentPath}
                  disabled={busy}
                  placeholder="hr/documents/…"
                  onChange={(event) => setDocumentPath(event.target.value)}
                />
              </label>
            )}

            {(basis === 'art87_marriage' || basis === 'art87_delivery') && (
              <label className="hrs-field">
                <span className="hrs-field__l">
                  تاريخ الواقعة المرجعية (عقد الزواج أو الوضع). تقاس منه المهلة ويلزم إدخاله
                </span>
                <input
                  className="hrs-field__c"
                  type="date"
                  value={anchorDate}
                  disabled={busy}
                  onChange={(event) => setAnchorDate(event.target.value)}
                />
              </label>
            )}

            {basis === 'art80_dismissal' && (
              <label className="hrs-check">
                <input
                  type="checkbox"
                  checked={objectionGiven}
                  disabled={busy}
                  onChange={(event) => setObjectionGiven(event.target.checked)}
                />
                <span>
                  أتيحت للعامل فرصة إبداء أسباب معارضته للفسخ. <strong>وهو شرط في نص م.٨٠</strong>، وبدونه
                  الفسخ قابل للإبطال.
                </span>
              </label>
            )}

            <label className="hrs-field">
              <span className="hrs-field__l">ملاحظة التصنيف (اختيارية)</span>
              <input
                className="hrs-field__c"
                type="text"
                value={note}
                disabled={busy}
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>

            <div className="hrs-acts">
              <button
                type="button"
                className="hr-btn hr-btn--primary"
                disabled={basis === '' || busy || !meta.can_prepare}
                onClick={() => basisMutation.mutate()}
              >
                {basisMutation.isPending ? 'جارٍ الحفظ وإعادة الاحتساب…' : 'احفظ السبب وأعد الاحتساب'}
              </button>
              <button
                type="button"
                className="hr-btn hr-btn--sm"
                disabled={busy || !meta.can_prepare}
                onClick={() => computeMutation.mutate()}
              >
                <RefreshCw size={13} /> أعد الاحتساب
              </button>
              {!meta.can_prepare && (
                <span className="hrs-why-off">إعداد التصفية يلزمه صلاحية «إعداد مسير الرواتب».</span>
              )}
            </div>
          </div>
        ) : (
          <p className="hrs-why-off">
            <Lock size={13} /> التصفية مقفلة بعد الاعتماد، فلا يمكن تعديل سببها ولا إعادة احتسابها.
            والتصحيح يتم باستبدالها بمسير تصحيحي.
          </p>
        )}
      </section>

      {actionError !== null && (
        <p className="hrs-error">
          <AlertTriangle size={14} /> {actionError}
        </p>
      )}

      {/* ───────── ② الكتلُ الأربع ───────── */}
      <section className="hrs-blocks">
        {BLOCK_ORDER.map((entry) => (
          <BlockCard
            key={entry.key}
            title={entry.title}
            icon={entry.icon}
            block={statement.blocks[entry.key]}
            highlight={entry.key === 'eos' && !basisSet}
          />
        ))}
      </section>

      {/* ───────── ③ الوعاءُ والمدّة ───────── */}
      <section className="hrs-card">
        <div className="hrs-card__head">
          <h2 className="hrs-card__t">
            <Scale size={15} /> أساس الاحتساب والمدة
          </h2>
          <span className="hrs-tag">{statement.vessel.name_ar}</span>
        </div>
        <dl className="hrs-kv">
          <Kv k="الأجر الفعلي (إجمالي أساس الاحتساب)" v={money(statement.vessel.gross)} />
          <Kv k="المستبعد بم.٨٦ (اتفاق مكتوب)" v={money(statement.vessel.excluded)} />
          <Kv k="صافي أساس الاحتساب" v={money(statement.vessel.net)} strong />
          <Kv k="سنوات تامة" v={statement.service.whole_years === null ? null : String(statement.service.whole_years)} />
          <Kv k="كسر السنة (أيام)" v={statement.service.remainder_days === null ? null : String(statement.service.remainder_days)} />
          <Kv
            k="أيام وقف العقد المستبعدة (م.١١٦)"
            v={String(statement.service.unpaid_suspension_days)}
          />
          <Kv
            k="مقام كسر السنة"
            v={statement.service.year_fraction_divisor === null ? null : String(statement.service.year_fraction_divisor)}
          />
        </dl>
        <p className="hrs-note">
          🔴 أساس احتساب م.٨٤ هو <strong>الأجر الفعلي</strong> لا الأساسي. والدليل أن م.٨٦ تجيز الاتفاق
          على استبعاد العمولات منه، ولو كان الأساسي فقط لما لزم إذن باستبعادها.
          {statement.service.divisor_is_convention_not_text && (
            <> ومقام كسر السنة <strong>اجتهاد وليس نصاً</strong>: م.٢ فيها تعريف الشهر ولا تعريف للسنة.</>
          )}
        </p>
      </section>

      {/* ───────── ④ مهلةُ م.٨٨ ───────── */}
      <section className="hrs-card hrs-deadline">
        <div className="hrs-card__head">
          <h2 className="hrs-card__t">
            <CalendarClock size={15} /> مهلة إنهاء الحساب ({statement.deadline.article_ref})
          </h2>
          <span className="hrs-tag">{statement.deadline.ended_by_label}</span>
        </div>
        <p className="hrs-deadline__d">
          {statement.deadline.date === null ? (
            <>لم يتم احتسابها بعد. تقاس بحسب <strong>من أنهى العقد</strong>، وهو غير معروف قبل تصنيف السبب.</>
          ) : (
            <>
              الموعد النهائي: <strong>{fmtDateHuman(statement.deadline.date)}</strong>
              {statement.deadline.days === null ? '' : ` (${statement.deadline.days} يوماً)`}
            </>
          )}
        </p>
        <p className="hrs-note">{statement.deadline.why}</p>
      </section>

      {/* ───────── ⑤ البنودُ والمجاميع ───────── */}
      <section className="hrs-card">
        <div className="hrs-card__head">
          <h2 className="hrs-card__t">
            <Wallet size={15} /> بنود التصفية
          </h2>
          {statement.computed_at !== null && (
            <span className="hrs-tag">تم الاحتساب {fmtDateHuman(statement.computed_at)}</span>
          )}
        </div>

        {statement.items.length === 0 ? (
          <p className="hrs-empty">لا توجد بنود بعد. احتسب التصفية لتظهر.</p>
        ) : (
          <ul className="hrp-item__list">
            {statement.items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </ul>
        )}

        <dl className="hrs-kv hrs-kv--totals">
          <Kv k="مجموع المستحق" v={money(statement.totals.gross_amount)} />
          <Kv k="مجموع ما عليه" v={money(statement.totals.deductions_amount)} />
          <Kv k="الصافي المستحق" v={money(statement.totals.net_amount)} strong />
        </dl>
      </section>

      {/* ───────── ⑥ الموانعُ والإفصاحات ───────── */}
      {statement.blockers.length > 0 && (
        <section className="hrs-card hrs-card--block">
          <h2 className="hrs-card__t">
            <ShieldAlert size={15} /> ما يمنع الاعتماد ({statement.blockers.length})
          </h2>
          <ul className="hrs-list">
            {statement.blockers.map((blocker, index) => (
              <li key={index}>{blocker}</li>
            ))}
          </ul>
        </section>
      )}

      {statement.disclosures.length > 0 && (
        <section className="hrs-card hrs-card--opinion">
          <h2 className="hrs-card__t">
            <Info size={15} /> الإفصاحات
          </h2>
          <ul className="hrs-list">
            {statement.disclosures.map((disclosure) => (
              <li key={disclosure.code}>
                {disclosure.opinion_not_text && <strong className="hrs-op">اجتهاد وليس نصاً · </strong>}
                {disclosure.article_ref === null ? '' : `${disclosure.article_ref} — `}
                {disclosure.text_ar}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ───────── ⑦ الاعتمادُ والدفع ───────── */}
      <section className="hrs-card hrs-final">
        <div className="hrs-acts">
          <button
            type="button"
            className="hr-btn hr-btn--primary"
            disabled={!meta.can_approve || !basisSet || statement.is_frozen || busy || statement.blockers.length > 0}
            onClick={() => approveMutation.mutate()}
          >
            <CheckCircle2 size={14} />
            {approveMutation.isPending ? 'جارٍ الاعتماد والإقفال…' : 'اعتمد التصفية وأقفلها'}
          </button>

          {statement.is_frozen ? (
            <Link className="hr-btn hr-btn--sm" to={`/hr/payroll/runs/${meta.run.id}?stage=pay`}>
              انتقل إلى الصرف
            </Link>
          ) : null}
        </div>

        <p className="hrs-note">
          {statement.is_frozen ? (
            <>
              مقفلة: كل رقم أعلاه <strong>محفوظ في سجله</strong> ومعه القواعد المطبقة وقت احتسابه، فلا
              يتغير منه شيء ولو تغير الراتب غداً. والصرف يمر من مسار الدفع بصلاحية «تسجيل الدفع».
            </>
          ) : !basisSet ? (
            <>🔴 لا اعتماد قبل تصنيف السبب، وبدونه لا تحتسب المكافأة.</>
          ) : statement.blockers.length > 0 ? (
            <>أزل الموانع أعلاه ثم أعد الاحتساب قبل الاعتماد.</>
          ) : !meta.can_approve ? (
            <>الاعتماد يلزمه صلاحية «اعتماد مسير الرواتب». ولا يعتمد من أعد المسير.</>
          ) : (
            <>
              الاعتماد يقفل القسيمة والبنود، ويسجل مطالبات الأيام فلا يدفع يوم مرتين ولو تقاطعت مدة
              التصفية مع مسير شهري معتمد.
            </>
          )}
        </p>
      </section>
    </div>
  );
};

/** كتلةُ حسابٍ واحدة — المبلغُ ومعه مادّتُه وسطرُ «لماذا». */
const BlockCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  block?: SettlementBlock;
  highlight?: boolean;
}> = ({ title, icon, block, highlight = false }) => {
  if (block === undefined) {
    return (
      <article className="hrs-block hrs-block--idle">
        <h3 className="hrs-block__t">
          {icon} {title}
        </h3>
        <p className="hrs-block__d">لم يتم الاحتساب بعد.</p>
      </article>
    );
  }

  const awaiting = block.state === 'awaiting_basis';
  const amount = money(typeof block.amount === 'string' ? block.amount : null);

  return (
    <article className={`hrs-block ${awaiting || highlight ? 'hrs-block--ask' : ''}`}>
      <h3 className="hrs-block__t">
        {icon} {title}
        {typeof block.article_ref === 'string' && <span className="hrs-block__a">{block.article_ref}</span>}
      </h3>

      {/* 🔴 مكانَ الرقم نداءٌ — لا صفرٌ ولا شرطةٌ صامتة. */}
      {awaiting ? (
        <p className="hrs-block__ask">لم يتم الاحتساب. يلزم سبب الإنهاء أولاً.</p>
      ) : (
        <p className="hrs-block__n">
          <span dir="ltr">{amount ?? EMPTY_MARK}</span>
          {amount === null ? '' : ' ر.س'}
        </p>
      )}

      {typeof block.why === 'string' && <p className="hrs-block__w">{block.why}</p>}
    </article>
  );
};

const ItemRow: React.FC<{ item: SettlementItem }> = ({ item }) => (
  <li className={`hrp-item hrp-item--${item.kind === 'deduction' ? 'deduct' : item.kind === 'earning' ? 'earn' : 'info'}`}>
    <div className="hrp-item__head">
      <span className="hrp-item__n">{item.name}</span>
      <span className="hrp-item__a" dir="ltr">
        {item.sign < 0 ? '−' : ''}
        {money(item.amount) ?? EMPTY_MARK}
      </span>
    </div>
    <p className="hrp-item__why">{item.why}</p>
  </li>
);

const Kv: React.FC<{ k: string; v: string | null; strong?: boolean }> = ({ k, v, strong = false }) => (
  <div className={`hrs-kv__row ${strong ? 'hrs-kv__row--strong' : ''}`}>
    <dt>{k}</dt>
    <dd dir={v === null ? undefined : 'ltr'}>{v ?? EMPTY_MARK}</dd>
  </div>
);

export default SettlementPage;
