import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarClock,
  Info,
  Lock,
  RefreshCw,
  Scale,
  Stethoscope,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { hrLeaveService } from '../../../services/hrLeaveService';
import { usePermission } from '../../../hooks/usePermission';
import ArticleRef from './ArticleRef';
import { CONTRACT_YEAR_BASIS_LABELS, LEAVE_ENTITLEMENT_WINDOW_LABELS } from '../../../types/hr';
import type { LeaveBalanceTypeRow, LedgerEntryType } from '../../../types/hr';
import {
  EMPTY_MARK,
  colorClass,
  fmtCount,
  fmtDays,
  fmtDaysWord,
  fmtLeaveDate,
  meterVars,
  sickTierUsage,
  toNum,
  warningTone,
} from './leaveFormat';

/**
 * لوحُ الرصيد — **هنا تصير بطاقةُ «الرصيد المتبقّي» حقيقية**.
 *
 * مصدرُ كلّ رقمٍ هنا لقطةُ `LeaveBalanceService::snapshot` المشتقّةُ من ذيل الدفتر.
 * والعمودان `annual_leave_balance` و`annual_leave_entitlement` **لا يُقرآن ولا يُذكران**
 * (صفرُ صفٍّ حيٍّ في الأوّل من ٤٦٢، وتسعةٌ مضلِّلةٌ في الثاني).
 *
 * ثلاثُ قواعدَ تحكم العرض:
 * ١) **العنوانُ صادق**: الرقمُ الكبير يُوسَم بـ`balance_label` القادم من الخادم، ولا يُكتب
 *    فوقه تاريخُ اليوم — فالذيلُ يشمل إجازةً تبدأ بعد ثلاثة أسابيع (C-14).
 * ٢) **المُلتزَمُ مستقبلاً يُعلَن** سطراً صريحاً حين `future_committed_days > 0`.
 * ٣) **قيد الاعتماد ليس حدّاً في المعادلة**: الصفُّ `pending` لا يُنشئ قيداً في الدفتر،
 *    فيُعرض حدّاً معطَّلاً «لا يُخصم بعد». ومثلُه الطلباتُ الإدارية غيرُ المرحَّلة.
 *    معادلةٌ تطرح ما لم يُطرَح في الخادم كذبةٌ حسابية.
 *
 * وقبل التهيئة (`is_initialized === false`) **لا يُعرض ٢١ ولا ٠ ولا شرطة**: تُستبدل كتلةُ
 * الرصيد بحالةٍ فارغةٍ بزرِّ تهيئة — أو بحالةٍ محميّةٍ تسمّي الصلاحيةَ لمن لا يملكها.
 */

interface Props {
  /** ملفُّ الموظف المعروض؛ `null` قبل الاختيار. */
  employeeId?: number | null;
  employeeName?: string | null;
  /** تُقرأ من الأعلى مرّةً وتُمرَّر؛ وحين تغيب يقرؤها اللوحُ بنفسه. */
  canManage?: boolean;
  onOpenLedger?: (filter: { entryType?: LedgerEntryType; leaveTypeId?: number }) => void;
  onInitBalance?: () => void;
}

/** عنوانُ حالة «قبل التهيئة» — نصٌّ واحدٌ يخدم فرعَي «له صلاحية» و«محميّ». */
const NOT_INITIALIZED_TITLE = 'الرصيد غير جاهز';

/** حدودُ المعادلة الأربعة — أسماءٌ ضيّقةٌ عمداً كي يبقى نوعُ القيمة رقماً بلا تحويل. */
type FormulaKey = 'opening' | 'accrued' | 'consumed' | 'adjustments';

const FORMULA_TERMS: Array<{ key: FormulaKey; label: string; entry: LedgerEntryType; op: string }> = [
  { key: 'opening', label: 'افتتاحي', entry: 'opening', op: '' },
  { key: 'accrued', label: 'مستحق', entry: 'accrual', op: '+' },
  { key: 'consumed', label: 'مخصوم', entry: 'consumption', op: '−' },
  { key: 'adjustments', label: 'تسويات', entry: 'adjustment', op: '±' },
];

/** قشرةُ الحالات الثلاث (فارغ · تحميل · خطأ) — عنوانٌ واحدٌ لا يتكرّر مع كلّ فرع. */
const PanelShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="hrl-block hrl-block--grow">
    <div className="hrl-block__h">
      <h3 className="hrl-block__t"><Wallet size={14} /> الرصيد والتحليل النظامي</h3>
    </div>
    <div className="hrl-block__b hrl-block__b--flush">{children}</div>
  </div>
);

export const LeaveBalancePanel: React.FC<Props> = ({
  employeeId,
  employeeName,
  canManage,
  onOpenLedger,
  onInitBalance,
}) => {
  const fallbackManage = usePermission('hr.leave.manage');
  const mayManage = canManage ?? fallbackManage;
  const empId = typeof employeeId === 'number' && employeeId > 0 ? employeeId : null;

  const [activeTypeId, setActiveTypeId] = useState<number | null>(null);

  const balanceQuery = useQuery({
    queryKey: ['hr', 'leave', 'balance', empId],
    queryFn: () => hrLeaveService.getBalance(empId as number),
    enabled: empId !== null,
    staleTime: 30_000,
  });

  // حدٌّ معطَّلٌ في المعادلة: عددُ ما ينتظر الاعتماد — يُقرأ من سطح القراءة لا يُخمَّن.
  const pendingQuery = useQuery({
    queryKey: ['hr', 'leave', 'records', { employee_profile_id: empId, status: 'pending', per_page: 1 }],
    queryFn: () => hrLeaveService.getLeaves({ employee_profile_id: empId as number, status: 'pending', per_page: 1 }),
    enabled: empId !== null,
    staleTime: 30_000,
  });

  // حدٌّ معطَّلٌ ثانٍ: الطلباتُ الإدارية السابقة — قائمةٌ لا تُحتسب ولم تُرحَّل.
  const legacyQuery = useQuery({
    queryKey: ['hr', 'leave', 'legacy-summary', empId],
    queryFn: () => hrLeaveService.getLegacySummary({ employee_profile_id: empId as number }),
    enabled: empId !== null,
    staleTime: 5 * 60_000,
  });

  const snapshot = balanceQuery.data;
  const types = useMemo(() => snapshot?.types ?? [], [snapshot]);

  const activeType = useMemo<LeaveBalanceTypeRow | null>(() => {
    if (types.length === 0) return null;
    const picked = activeTypeId !== null ? types.find((t) => t.leave_type_id === activeTypeId) : undefined;
    return picked ?? types.find((t) => t.code === 'annual') ?? types[0];
  }, [types, activeTypeId]);

  const openLedger = (filter: { entryType?: LedgerEntryType; leaveTypeId?: number }) => {
    if (onOpenLedger) onOpenLedger(filter);
  };

  // ───────────── الحالات الأربع: قشرةٌ واحدةٌ ومحتوىً يتبدّل ─────────────
  // (لا شجرةٌ ثانيةٌ لأيّ حالة، ولا عنوانٌ مكرَّرٌ في الملفّ.)

  if (empId === null || balanceQuery.isPending || balanceQuery.isError || !snapshot) {
    return (
      <PanelShell>
        {empId === null ? (
          <div className="hrl-state hrl-state--empty">
            <Wallet size={22} />
            <p className="hrl-state__t">لا يوجد موظف مختار</p>
            <p className="hrl-state__d">اختر موظفا من القائمة ليظهر رصيده ومعادلته وعداداته النظامية.</p>
          </div>
        ) : balanceQuery.isPending ? (
          <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل الرصيد">
            <span className="hrl-skel" />
            <span className="hrl-skel" />
            <span className="hrl-skel" />
            <span className="hrl-skel" />
          </div>
        ) : (
          <div className="hrl-state hrl-state--error">
            <AlertTriangle size={22} />
            <p className="hrl-state__t">تعذر تحميل الرصيد</p>
            <p className="hrl-state__d">
              {balanceQuery.error instanceof Error ? balanceQuery.error.message : 'انقطع الاتصال بالخادم.'}
            </p>
            <button type="button" className="hr-btn hr-btn--sm" onClick={() => void balanceQuery.refetch()}>
              <RefreshCw size={13} /> إعادة المحاولة
            </button>
          </div>
        )}
      </PanelShell>
    );
  }

  const consumedSoFar = types.reduce((sum, t) => sum + toNum(t.consumed), 0);
  const pendingCount = pendingQuery.data?.total ?? 0;
  const legacyCount = legacyQuery.data?.approved_count ?? 0;
  const sick = snapshot.sick_window;
  const tiers = sick ? sickTierUsage(sick) : [];

  return (
    <>
      {/* ═══ ١) الرصيد + المعادلة ═══ */}
      <div className="hrl-block">
        <div className="hrl-block__h">
          <h3 className="hrl-block__t"><Wallet size={14} /> الرصيد{employeeName ? ` — ${employeeName}` : ''}</h3>
          {types.length > 1 && (
            <div className="hrl-block__a" role="group" aria-label="نوع الرصيد">
              {types.map((t) => (
                <button
                  key={t.leave_type_id}
                  type="button"
                  className={`hr-chip${activeType?.leave_type_id === t.leave_type_id ? ' hr-chip--active' : ''}`}
                  onClick={() => setActiveTypeId(t.leave_type_id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {!snapshot.is_initialized ? (
          <div className="hrl-block__b hrl-block__b--flush">
            {mayManage ? (
              <div className="hrl-state hrl-state--empty">
                <UserPlus size={22} />
                <p className="hrl-state__t">{NOT_INITIALIZED_TITLE}</p>
                <p className="hrl-state__d">
                  الاستحقاق يبدأ من تاريخ بدء استحقاق محدد. قبله لا يحتسب أي يوم، ولا يعرض رقم بلا سند.
                </p>
                <button type="button" className="hr-btn hr-btn--sm hr-btn--primary" onClick={onInitBalance}>
                  تهيئة رصيد الإجازات
                </button>
              </div>
            ) : (
              <div className="hrl-state hrl-state--locked">
                <Lock size={22} />
                <p className="hrl-state__t">{NOT_INITIALIZED_TITLE}</p>
                <p className="hrl-state__d">
                  التهيئة تحتاج صلاحية «إدارة الإجازات» (hr.leave.manage). اطلبها من مدير المكتب.
                </p>
              </div>
            )}

            {consumedSoFar > 0 && (
              <p className="hrl-note">
                مخصوم حتى الآن {fmtDaysWord(consumedSoFar)} من إجازات مسجلة. التسجيل مسموح قبل التهيئة وبعدها.
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="hrl-num">
              <span className={`hrl-num__v${activeType && toNum(activeType.balance) < 0 ? ' is-neg' : ''}`} dir="ltr">
                {activeType ? fmtDays(activeType.balance) : EMPTY_MARK}
              </span>
              <span className="hrl-num__u">يوما متاحا{activeType ? ` — ${activeType.name}` : ''}</span>
            </p>
            <p className="hrl-num__label">{snapshot.balance_label}</p>

            {toNum(snapshot.future_committed_days) > 0 && (
              <p className="hrl-note">
                منها {fmtDaysWord(snapshot.future_committed_days)} مخصومة لإجازة تبدأ لاحقا.{' '}
                <button type="button" className="hrl-link" onClick={() => openLedger({ entryType: 'consumption' })}>
                  عرض حركاتها
                </button>
              </p>
            )}

            {activeType && (
              <div className="hrl-formula" role="group" aria-label="معادلة الرصيد">
                {FORMULA_TERMS.map((term) => (
                  <button
                    key={term.key}
                    type="button"
                    className="hrl-formula__term"
                    onClick={() => openLedger({ entryType: term.entry, leaveTypeId: activeType.leave_type_id })}
                  >
                    <span className="hrl-formula__k">{term.op ? `${term.op} ` : ''}{term.label}</span>
                    <span className="hrl-formula__v" dir="ltr">{fmtDays(activeType[term.key])}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="hrl-formula__term hrl-formula__term--sum"
                  onClick={() => openLedger({ leaveTypeId: activeType.leave_type_id })}
                >
                  <span className="hrl-formula__k">= المتاح</span>
                  <span className="hrl-formula__v" dir="ltr">{fmtDays(activeType.balance)}</span>
                </button>
              </div>
            )}

            {/* حدّان معطَّلان: يُعرضان ولا يُطرحان — الخادمُ لم يطرحهما. */}
            <div className="hrl-formula">
              <span className="hrl-formula__term hrl-formula__term--muted">
                <span className="hrl-formula__k">قيد الاعتماد</span>
                <span className="hrl-formula__v" dir="ltr">{fmtCount(pendingCount)}</span>
                <span className="hrl-formula__k">لا يخصم بعد</span>
              </span>
              <span className="hrl-formula__term hrl-formula__term--muted">
                <span className="hrl-formula__k">طلبات إدارية</span>
                <span className="hrl-formula__v" dir="ltr">{fmtCount(legacyCount)}</span>
                <span className="hrl-formula__k">غير محولة</span>
              </span>
            </div>

            {/* ═══ ٢) سطرُ الاشتقاق ═══ */}
            <p className="hrl-note">
              بدء الاستحقاق {snapshot.accrual_anchor ? fmtLeaveDate(snapshot.accrual_anchor) : 'غير محدد'}
              {activeType?.next_accrual_at ? ` · الاستحقاق القادم ${fmtLeaveDate(activeType.next_accrual_at)}` : ''}
              {snapshot.hire_date ? ` · المباشرة ${fmtLeaveDate(snapshot.hire_date)}` : ''}
              {snapshot.chain_settled_at ? ` · تمت تصفية السلسلة في ${fmtLeaveDate(snapshot.chain_settled_at)}` : ''}
            </p>

            {(snapshot.warnings ?? []).map((warning, index) => (
              <p
                key={`${warning.code}-${index}`}
                className={`hrl-drift${warningTone(warning.code) === 'warn' ? '' : ' hrl-drift--muted'}`}
              >
                {warningTone(warning.code) === 'warn' ? <AlertTriangle size={13} /> : <Info size={13} />}
                <span>{warning.message}</span>
              </p>
            ))}
          </>
        )}
      </div>

      {/* ═══ ٣) المرضية — م.١١٧ ═══ */}
      <div className="hrl-block">
        <div className="hrl-block__h">
          <h3 className="hrl-block__t"><Stethoscope size={14} /> النافذة المرضية (المادة ١١٧)</h3>
        </div>
        <div className="hrl-block__b">
          {sick === null ? (
            <p className="hrl-sub">لا توجد نافذة مرضية لهذا الموظف.</p>
          ) : (
            <>
              <div
                className="hrl-meter"
                role="img"
                aria-label={`مخصوم ${fmtDays(sick.used)} من ${fmtDays(sick.total)} يوما في نافذة تبدأ ${fmtLeaveDate(
                  sick.anchor
                )} وتنتهي ${fmtLeaveDate(sick.ends_on)}`}
              >
                {tiers.map((row, index) => (
                  <span key={`${row.tier.pay_ratio}-${index}`} className="hrl-meter__seg" style={meterVars(row.weight, row.fill)}>
                    <span className="hrl-meter__fill" />
                  </span>
                ))}
              </div>
              <div className="hrl-meter__legend">
                {tiers.map((row, index) => (
                  <span key={`lg-${index}`}>
                    {row.label}: {fmtDays(row.remaining)} من {fmtDays(row.tier.days)}
                  </span>
                ))}
              </div>
              <dl className="hrl-kv">
                <dt>النافذة</dt>
                <dd>{fmtLeaveDate(sick.anchor)} — {fmtLeaveDate(sick.ends_on)}</dd>
                <dt>المخصوم</dt>
                <dd dir="ltr">{fmtDays(sick.used)} / {fmtDays(sick.total)}</dd>
                <dt>المتبقي</dt>
                <dd dir="ltr">{fmtDays(sick.remaining_total)}</dd>
              </dl>
            </>
          )}
        </div>
      </div>

      {/* ═══ ٤) بلا أجر — م.١١٦ ═══ */}
      <div className={`hrl-block hrl-rule${toNum(snapshot.art116.excess) > 0 ? ' hrl-rule--warn' : ''}`}>
        <div className="hrl-block__h">
          <h3 className="hrl-block__t"><Scale size={14} /> الإجازة بلا أجر (المادة ١١٦)</h3>
          <span className="hrl-block__a hrl-rule__n" dir="ltr">
            {fmtDays(snapshot.art116.unpaid_days)} / {fmtDays(snapshot.art116.threshold)}
          </span>
        </div>
        <div className="hrl-block__b">
          <p className="hrl-sub">
            سنة العقد {fmtLeaveDate(snapshot.art116.contract_year_start)} — {fmtLeaveDate(snapshot.art116.contract_year_end)}
            {' · '}
            {CONTRACT_YEAR_BASIS_LABELS[snapshot.art116.contract_year_basis] ?? snapshot.art116.contract_year_basis}
          </p>
          {toNum(snapshot.art116.excess) > 0 && (
            <p className="hrl-drift">
              <AlertTriangle size={13} />
              <span>
                تجاوز العتبة بـ<span className="hrl-drift__n" dir="ltr">{fmtDays(snapshot.art116.excess)}</span> يوما.
                العداد يعرض ما سجل، والقرار في العقد.
              </span>
            </p>
          )}
        </div>
      </div>

      {/* ═══ ٥) الانقطاع — م.٨٠ ═══ */}
      <div className="hrl-block">
        <div className="hrl-block__h">
          <h3 className="hrl-block__t"><CalendarClock size={14} /> الانقطاع عن العمل (المادة ٨٠)</h3>
        </div>
        <div className="hrl-block__b">
          <dl className="hrl-kv">
            <dt>متفرق</dt>
            <dd dir="ltr">{fmtDays(snapshot.art80.scattered_days)} / {fmtDays(snapshot.art80.thresholds.scattered)}</dd>
            <dt>متتالي</dt>
            <dd dir="ltr">{fmtDays(snapshot.art80.max_consecutive)} / {fmtDays(snapshot.art80.thresholds.consecutive)}</dd>
            <dt>سنة العقد</dt>
            <dd dir="ltr">
              {fmtLeaveDate(snapshot.art80.contract_year_start)} — {fmtLeaveDate(snapshot.art80.contract_year_end)}
            </dd>
            <dt>الأساس</dt>
            <dd>{CONTRACT_YEAR_BASIS_LABELS[snapshot.art80.contract_year_basis] ?? snapshot.art80.contract_year_basis}</dd>
          </dl>
          {snapshot.art80.note ? <p className="hrl-note">{snapshot.art80.note}</p> : null}
        </div>
      </div>

      {/* ═══ ٦) إجازاتُ الوقائع ═══ */}
      <div className="hrl-block hrl-block--grow hrl-block--scroll">
        <div className="hrl-block__h">
          <h3 className="hrl-block__t"><Info size={14} /> إجازات المناسبات</h3>
        </div>
        <div className="hrl-block__b hrl-block__b--flush">
          {(snapshot.per_event ?? []).length === 0 ? (
            <div className="hrl-state hrl-state--empty">
              <p className="hrl-state__t">لا توجد إجازات مناسبات</p>
              <p className="hrl-state__d">لم يضف المكتب أنواعا تحسب بالمناسبات (زواج · وفاة · أبوة · حج).</p>
            </div>
          ) : (
            <ul className="hrl-list">
              {(snapshot.per_event ?? []).map((row) => (
                <li key={row.leave_type_id} className={`hrl-row ${colorClass(row.color_key)}`}>
                  <span className="hrl-dot" aria-hidden="true" />
                  <span className="hrl-row__main">
                    <span className="hrl-row__name">
                      {row.name}
                      {row.legal_reference ? (
                        <span className="hrl-sub">
                          {' · '}
                          <ArticleRef value={row.legal_reference} />
                        </span>
                      ) : null}
                    </span>
                    <span className="hrl-row__meta">
                      {LEAVE_ENTITLEMENT_WINDOW_LABELS[row.window] ?? row.window}
                      {row.last_used_at ? ` · آخر استعمال ${fmtLeaveDate(row.last_used_at)}` : ' · بلا استعمال'}
                    </span>
                  </span>
                  <span className="hrl-mini" dir="ltr">
                    {fmtDays(row.remaining)} / {fmtDays(row.entitlement)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

    </>
  );
};

export default LeaveBalancePanel;
