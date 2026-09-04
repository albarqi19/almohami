import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Ban, BellRing, Gavel, Lock, RefreshCw, Scale, ShieldCheck } from 'lucide-react';

import { hrPayrollService } from '../../../services/hrPayrollService';
import {
  EMPTY_MARK,
  errorText,
  fmtDateHuman,
  money,
  objectionCountdown,
  penaltyDestination,
  PENALTY_KIND_LABELS,
  PENALTY_NEXT_STEP,
  PENALTY_STATE_LABELS,
} from './payrollFormat';
import type { PenaltyRow, PenaltyState } from '../../../types/hrPayroll';

/**
 * **الجزاءاتُ التأديبية** — `/hr/payroll/penalties` (م.٦٦–٧٣).
 *
 * ══════ 🔴 بالأيام لا بالريال ══════
 * النظامُ يقيس الجزاءَ بأجرِ أيام: «لا يزيد على أجرِ خمسةِ أيام» (م.٧٠). فالمخزَّنُ أيامٌ،
 * والمبلغُ **معاينةٌ** محسوبةٌ من أجر اليوم النظاميّ (الأجر ÷ ٣٠، م.٢) — ويُعاد حسابُه
 * وقتَ المسير بأجر مدّته. وتجميدُ الريال هنا يخصم بأجرٍ قد لا يكون قائماً يومَ الخصم.
 *
 * ══════ الدورةُ لا تُختصَر ══════
 * توقيعٌ بعد استجوابٍ (م.٧١) ← تبليغٌ **يبدأ عدَّ ١٥ يوماً** (م.٧٢) ← نفاذٌ ← خصمٌ في مسيرٍ
 * معتمَد. وكلُّ حالٍ له **فعلٌ تالٍ واحد** يُعرَض بنصّه، فلا يُعرَض زرّان متنافسان ولا
 * يُترك المستخدمُ يخمّن ما التالي.
 *
 * ══════ 🔴 والخصمُ ليس من هنا ══════
 * الجزاءُ النافذُ يظهر **مقترحاً** في طابور قرارات المسير، ولا يصير مالاً إلا ببتٍّ باسم
 * إنسانٍ وسببٍ مسجَّل (D10). ثمّ يُحصَّل مرّةً واحدةً في العمر — يمنع تكرارَه قيدٌ في القاعدة.
 */

const STATE_TABS: Array<{ key: PenaltyState | 'all'; label: string }> = [
  { key: 'all', label: 'الكل' },
  { key: 'draft', label: 'مسودات' },
  { key: 'notified', label: 'مبلَّغ بها' },
  { key: 'final', label: 'نافذة' },
  { key: 'charged', label: 'محصَّلة' },
  { key: 'overturned', label: 'مبطَلة' },
];

export const PenaltiesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [state, setState] = useState<PenaltyState | 'all'>('all');
  const [actionError, setActionError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['hr', 'payroll', 'penalties', state],
    queryFn: () => hrPayrollService.getPenalties(state === 'all' ? {} : { state }),
    staleTime: 30_000,
  });

  const invalidate = () => {
    setActionError(null);
    void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'penalties'] });
    void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'penalty-fund'] });
  };

  const notifyMutation = useMutation({
    mutationFn: (id: number) => hrPayrollService.notifyPenalty(id),
    onSuccess: invalidate,
    onError: (error) => setActionError(errorText(error, 'تعذر تسجيل التبليغ.')),
  });

  const finaliseMutation = useMutation({
    mutationFn: ({ id, waived }: { id: number; waived: boolean }) => hrPayrollService.finalisePenalty(id, waived),
    onSuccess: invalidate,
    // 🔴 رسالةُ الخادم كما هي: هي التي تقول «المهلةُ لم تنقضِ» وتاريخَ انقضائها.
    onError: (error) => setActionError(errorText(error, 'تعذر إنفاذ الجزاء.')),
  });

  const overturnMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => hrPayrollService.overturnPenalty(id, reason),
    onSuccess: invalidate,
    onError: (error) => setActionError(errorText(error, 'تعذر إبطال الجزاء.')),
  });

  const queryError = listQuery.error;
  const lockedMessage =
    queryError instanceof Error && /غير مفعّل|غير مصرح|صلاحية|Unauthorized|Forbidden/i.test(queryError.message)
      ? queryError.message
      : null;

  if (lockedMessage !== null) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--locked">
          <Lock size={22} />
          <p className="hrl-state__t">سجل الجزاءات غير متاح لك</p>
          <p className="hrl-state__d">{lockedMessage}</p>
        </div>
      </div>
    );
  }

  if (listQuery.isLoading) {
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

  if (listQuery.isError) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--error">
          <AlertTriangle size={22} />
          <p className="hrl-state__t">تعذر تحميل الجزاءات</p>
          <p className="hrl-state__d">{errorText(listQuery.error, 'خطأ غير متوقع.')}</p>
          <button type="button" className="hr-btn hr-btn--sm" onClick={() => void listQuery.refetch()}>
            <RefreshCw size={13} /> أعد المحاولة
          </button>
        </div>
      </div>
    );
  }

  const rows = listQuery.data?.page.data ?? [];
  const meta = listQuery.data?.meta;
  const busy = notifyMutation.isPending || finaliseMutation.isPending || overturnMutation.isPending;

  return (
    <div className="hrl-page">
      <header className="hrl-head">
        <div className="hrl-head__id">
          <h1 className="hrl-h1">
            <Gavel size={16} /> الجزاءات التأديبية
          </h1>
          <p className="hrl-sub">
            يقاس الجزاء بالأيام لا بالريال، ودورته لا تختصر: استجواب، ثم تبليغ، ثم مهلة
            اعتراض، ثم نفاذ. والخصم قرار يتخذ في مسير الشهر لا من هذه الشاشة.
          </p>
        </div>

        <div className="hrl-head__badges">
          <span className="hrl-fact">
            جزاءات معروضة
            <span className="hrl-fact__n" dir="ltr">
              {listQuery.data?.page.total ?? 0}
            </span>
          </span>
          <Link className="hrl-fact hrl-fact--gold" to="/hr/payroll/penalty-fund">
            سجل الغرامات (م.٧٣)
          </Link>
        </div>
      </header>

      {meta !== undefined && (
        <div className="hrp-rule">
          <p className="hrp-rule__who">
            <Scale size={13} /> المواد النظامية المطبقة هنا
          </p>
          <dl className="hrl-kv">
            <dt>م.٦٩</dt>
            <dd>لا مؤاخذة بعد {meta.detection_window_days} يوماً من كشف المخالفة.</dd>
            <dt>م.٧٠</dt>
            <dd>لا يزيد الجزاء على أجر {meta.max_days_per_offence} أيام للمخالفة الواحدة.</dd>
            <dt>م.٧٢</dt>
            <dd>للعامل {meta.objection_days} يوماً للاعتراض من تاريخ التبليغ.</dd>
            <dt>م.٧٣</dt>
            <dd>حصيلة الغرامات لا يتصرف فيها إلا فيما يعود بالنفع على العمال.</dd>
          </dl>
        </div>
      )}

      <nav className="hrl-tabs" aria-label="تصفية الجزاءات">
        {STATE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`hrl-tab${state === tab.key ? ' is-active' : ''}`}
            aria-selected={state === tab.key}
            onClick={() => setState(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {actionError !== null && (
        <p className="hrl-state__d hrl-state--error" role="alert">
          {actionError}
        </p>
      )}

      {rows.length === 0 ? (
        <div className="hrl-state hrl-state--empty">
          <Gavel size={22} />
          <p className="hrl-state__t">لا توجد جزاءات</p>
          <p className="hrl-state__d">
            لم يتم توقيع أي جزاء في هذا المكتب. والجزاء قرار مسجل باسم من اتخذه، بسبب مكتوب
            وبعد استجواب (م.٧١)، لا نتيجة حساب آلي.
          </p>
        </div>
      ) : (
        <table className="hrl-table hrp-roster">
          <thead>
            <tr>
              <th scope="col">الجزاء</th>
              <th scope="col">الموظف</th>
              <th scope="col">المخالفة</th>
              <th scope="col">المقدار</th>
              <th scope="col">المهلة</th>
              <th scope="col">الحالة</th>
              <th scope="col">الإجراء التالي</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <PenaltyRowView
                key={row.id}
                row={row}
                busy={busy}
                onNotify={() => notifyMutation.mutate(row.id)}
                onFinalise={(waived) => finaliseMutation.mutate({ id: row.id, waived })}
                onOverturn={(reason) => overturnMutation.mutate({ id: row.id, reason })}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

interface RowProps {
  row: PenaltyRow;
  busy: boolean;
  onNotify: () => void;
  onFinalise: (waived: boolean) => void;
  onOverturn: (reason: string) => void;
}

const PenaltyRowView: React.FC<RowProps> = ({ row, busy, onNotify, onFinalise, onOverturn }) => {
  const countdown = objectionCountdown(row.objection_days_left);
  const nextStep = PENALTY_NEXT_STEP[row.state];
  const windowOpen = row.objection_days_left !== null && row.objection_days_left > 0;
  const days = row.amount_days === null ? null : String(row.amount_days).replace(/\.0$/, '');
  const daysText =
    days === null
      ? null
      : Number(days) === 1
        ? 'يوم'
        : Number(days) === 2
          ? 'يومين'
          : Number(days) >= 3 && Number(days) <= 10
            ? days + ' أيام'
            : Number(days) >= 11
              ? days + ' يوماً'
              : days + ' يوم';

  return (
    <tr>
      <th scope="row">
        {row.penalty_number}
        <span className="hrl-row__meta">{PENALTY_KIND_LABELS[row.kind]}</span>
      </th>

      <td>{row.employee_name}</td>

      <td>
        {row.offence_summary}
        <span className="hrl-row__meta">تاريخ الكشف {fmtDateHuman(row.offence_detected_on)}</span>
        {row.investigation_ref !== null && (
          <span className="hrl-row__meta">محضر الاستجواب: {row.investigation_ref}</span>
        )}
      </td>

      <td>
        {/* 🔴 الأيامُ أوّلاً لأنها **المخزَّن**، والريالُ تحتها معاينةً بأجر اليوم النظاميّ. */}
        {daysText === null ? EMPTY_MARK : `أجر ${daysText}`}
        <span className="hrl-row__meta" dir="ltr">
          {money(row.amount_preview) ?? EMPTY_MARK}
        </span>
        {row.daily_wage !== null && (
          <span className="hrl-row__meta" dir="ltr">
            {money(row.daily_wage)} / يوم
          </span>
        )}
        <span className="hrl-row__meta">{penaltyDestination(row)}</span>
      </td>

      <td>
        {row.notified_at === null ? (
          <span className="hrl-hint">لم يتم التبليغ بعد</span>
        ) : (
          <>
            {fmtDateHuman(row.objection_deadline)}
            {countdown !== null && <span className="hrl-row__meta">{countdown}</span>}
          </>
        )}
        {row.refund_due_by !== null && (
          <span className="hrl-row__meta">يرد قبل {fmtDateHuman(row.refund_due_by)} (م.٩١)</span>
        )}
      </td>

      <td>
        <span className="hrl-badge hrl-badge--flat">{PENALTY_STATE_LABELS[row.state]}</span>
        {row.charged_run_id !== null && (
          <span className="hrl-row__meta">
            <Link className="hrl-link" to={`/hr/payroll/runs/${row.charged_run_id}`}>
              تم تحصيله في مسيره
            </Link>
          </span>
        )}
      </td>

      <td>
        {nextStep !== null && <span className="hrl-row__meta">{nextStep}</span>}

        {row.state === 'draft' && (
          <button type="button" className="hr-btn hr-btn--sm" disabled={busy} onClick={onNotify}>
            <BellRing size={13} /> تسجيل التبليغ
          </button>
        )}

        {row.state === 'notified' && (
          <>
            {/* 🔴 الزرُّ ظاهرٌ معطَّلٌ وتحته سببُه: «عرضُ السبب قبل المحاولة أصدقُ من زرٍّ
                يُنقَر ثمّ يُردّ». */}
            <button
              type="button"
              className="hr-btn hr-btn--sm"
              disabled={busy || windowOpen}
              onClick={() => onFinalise(false)}
            >
              <ShieldCheck size={13} /> أنفذ الجزاء
            </button>

            {windowOpen && (
              <button
                type="button"
                className="hr-btn hr-btn--sm hr-btn--ghost"
                disabled={busy}
                onClick={() => {
                  if (window.confirm('سيسجل أن العامل أقر بالجزاء وتنازل عن بقية المهلة. هل تؤكد؟')) {
                    onFinalise(true);
                  }
                }}
              >
                تسجيل إقرار العامل
              </button>
            )}
          </>
        )}

        {(row.state === 'notified' || row.state === 'final' || row.state === 'charged' || row.state === 'objected') && (
          <button
            type="button"
            className="hr-btn hr-btn--sm hr-btn--ghost"
            disabled={busy}
            onClick={() => {
              const reason = window.prompt('سبب إبطال الجزاء (يسجل باسمك):');
              if (reason !== null && reason.trim().length >= 5) onOverturn(reason.trim());
            }}
          >
            <Ban size={13} /> أبطله
          </button>
        )}
      </td>
    </tr>
  );
};

export default PenaltiesPage;
