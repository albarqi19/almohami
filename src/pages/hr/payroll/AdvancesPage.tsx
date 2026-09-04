import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, HandCoins, Lock, Pause, Play, RefreshCw, Scale, Send } from 'lucide-react';

import { hrPayrollService } from '../../../services/hrPayrollService';
import {
  ADVANCE_KIND_LABELS,
  ADVANCE_STATUS_HINTS,
  ADVANCE_STATUS_LABELS,
  EMPTY_MARK,
  errorText,
  fmtDateHuman,
  fmtMonthHuman,
  isPositiveMoney,
  money,
} from './payrollFormat';
import type { AdvanceRow, AdvanceStatus } from '../../../types/hrPayroll';

/**
 * **السلفُ والقروض** — `/hr/payroll/advances`.
 *
 * ══════ ما تقوله هذه الشاشة ══════
 * «كم على كلِّ منسوبٍ اليوم، وكم يُقتطَع منه الشهرَ القادم، ولماذا يختلف عن المجدول؟».
 *
 * ══════ 🔴 «المتبقّي» رقمان لا رقمٌ واحد ══════
 * ما تعرضه هذه الشاشةُ **الرصيدُ الآن** مشتقّاً من دفتر السلف. وما يُطبَع على قسيمةٍ مضت
 * شيءٌ آخر: رقمٌ مجمَّدٌ في صفّها يومَ صُرفت (D20). فقسيمةُ يوليو تقول «متبقٍ ٢٬٠٠٠» إلى
 * الأبد، وهذه الشاشةُ تقول ما بقي اليوم — والخلطُ بينهما يجعل المستندَ يتحوّر كلّما فُتح.
 *
 * ══════ 🔴 ولا خصمَ من هذه الشاشة ══════
 * منحُ السلفة يُخرج مالاً، ثمّ **يقترح** النظامُ قسطاً كلَّ شهرٍ في طابور القرارات. ولا يصير
 * القسطُ خصماً إلا ببتٍّ باسم إنسانٍ وسببٍ مسجَّل (D10) — فلا زرَّ «اخصم الآن» هنا بحال.
 *
 * ══════ وسقفُ م.٩٢/١ يُعرَض قبل أن يُفاجئ ══════
 * الحسمُ لا يتجاوز عُشرَ الأجر المستحقّ. وفي شهرٍ ضعيفٍ يُقصّ القسطُ ويُرحَّل الفائضُ
 * فيمتدّ الجدولُ من نفسِه — ورقاقةُ «امتدّ الجدول» تقول ذلك بدل أن يسأل المحاسبُ لماذا
 * لم تنتهِ السلفةُ بعد ستّة أشهر.
 */

const STATUS_TABS: Array<{ key: AdvanceStatus | 'all'; label: string }> = [
  { key: 'all', label: 'الكل' },
  { key: 'active', label: 'النشطة' },
  { key: 'pending', label: 'غير المصروفة' },
  { key: 'paused', label: 'الموقوفة' },
  { key: 'settled', label: 'المسددة' },
];

export const AdvancesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AdvanceStatus | 'all'>('all');
  const [openId, setOpenId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['hr', 'payroll', 'advances', status],
    queryFn: () => hrPayrollService.getAdvances(status === 'all' ? {} : { status }),
    staleTime: 30_000,
  });

  const detailQuery = useQuery({
    queryKey: ['hr', 'payroll', 'advance', openId],
    queryFn: () => hrPayrollService.getAdvance(openId as number),
    enabled: openId !== null,
  });

  const pauseMutation = useMutation({
    mutationFn: ({ id, paused, reason }: { id: number; paused: boolean; reason: string }) =>
      hrPayrollService.setAdvancePaused(id, paused, reason),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'advances'] });
    },
    onError: (error) => setActionError(errorText(error, 'تعذر تغيير حالة السلفة.')),
  });

  const disburseMutation = useMutation({
    mutationFn: (id: number) => hrPayrollService.disburseAdvance(id),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'advances'] });
    },
    onError: (error) => setActionError(errorText(error, 'تعذر تسجيل الصرف.')),
  });

  // ─────────── مقفلة: الوحدةُ مطفأةٌ أو الصلاحيةُ ناقصة ───────────
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
          <p className="hrl-state__t">سجل السلف غير متاح لك</p>
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
          <p className="hrl-state__t">تعذر تحميل السلف</p>
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
  const canManage = meta?.can_manage === true;

  return (
    <div className="hrl-page">
      <header className="hrl-head">
        <div className="hrl-head__id">
          <h1 className="hrl-h1">
            <HandCoins size={16} /> السلف والقروض
          </h1>
          <p className="hrl-sub">
            كم على كل موظف اليوم، وكم يخصم منه الشهر القادم. والقسط مقترح، ولا يصير خصماً
            إلا بقرار معتمَد في مسير الشهر.
          </p>
        </div>

        <div className="hrl-head__badges">
          <span className="hrl-fact">
            سلف معروضة
            <span className="hrl-fact__n" dir="ltr">
              {listQuery.data?.page.total ?? 0}
            </span>
          </span>
          {/* الجاراتُ الثلاثُ موصولةٌ من بعضها: بندُ القائمة واحدٌ، والشاشاتُ ثلاث. */}
          <Link className="hrl-fact" to="/hr/payroll/penalties">
            الجزاءات التأديبية
          </Link>
          <Link className="hrl-fact" to="/hr/payroll/penalty-fund">
            صندوق الغرامات (م.٧٣)
          </Link>
        </div>
      </header>

      {/* 🔴 السقفُ يُعرَض **قبل** أن يُفاجئ: مَن يمنح سلفةً بقسطٍ يفوق العُشر يرى الآن لماذا
          سيمتدّ جدولُه، لا بعد ثلاثة أشهرٍ حين يسأل المحاسبُ عن الفرق. */}
      {meta !== undefined && (
        <div className="hrp-rule">
          <p className="hrp-rule__who">
            <Scale size={13} /> {meta.article_ref}
          </p>
          <p className="hrl-hint">{meta.cap_note}</p>
        </div>
      )}

      <nav className="hrl-tabs" aria-label="تصفية السلف">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`hrl-tab${status === tab.key ? ' is-active' : ''}`}
            aria-selected={status === tab.key}
            onClick={() => setStatus(tab.key)}
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
          <HandCoins size={22} />
          <p className="hrl-state__t">لا توجد سلف</p>
          <p className="hrl-state__d">
            لم يتم منح أي سلفة في هذا المكتب بعد. والسلفة مال يخرج بسبب مكتوب وباسم من اعتمده،
            ويعود أقساطاً لا تتجاوز ١٠٪ من الأجر المستحق.
          </p>
        </div>
      ) : (
        <table className="hrl-table hrp-roster">
          <thead>
            <tr>
              <th scope="col">السلفة</th>
              <th scope="col">الموظف</th>
              <th scope="col">الأصل</th>
              <th scope="col">الأقساط</th>
              <th scope="col">المتبقي</th>
              <th scope="col">قسط الشهر القادم</th>
              <th scope="col">الحالة</th>
              <th scope="col">الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <AdvanceRowView
                key={row.id}
                row={row}
                canManage={canManage}
                busy={pauseMutation.isPending || disburseMutation.isPending}
                open={openId === row.id}
                onToggle={() => setOpenId(openId === row.id ? null : row.id)}
                onPause={(paused, reason) => pauseMutation.mutate({ id: row.id, paused, reason })}
                onDisburse={() => disburseMutation.mutate(row.id)}
              />
            ))}
          </tbody>
        </table>
      )}

      {/* سردُ الدفتر — «لماذا رصيدي كذا؟» يُجاب بأسبابٍ تُقرأ لا بمعادلةٍ تُشرح. */}
      {openId !== null && (
        <section className="hrp-seg" aria-label="سجل السلفة">
          <h2 className="hrl-h2">حركة السلفة</h2>

          {detailQuery.isLoading && <span className="hrl-skel hrl-skel--line" />}

          {detailQuery.data?.ledger.map((entry) => (
            <div className="hrp-seg__i" key={entry.id}>
              <span className="hrp-seg__d">{fmtDateHuman(entry.effective_date)}</span>
              <span className="hrp-seg__f">{entry.description}</span>
              <span className="hrp-seg__n" dir="ltr">
                {money(entry.balance_after) ?? EMPTY_MARK}
              </span>
            </div>
          ))}

          {detailQuery.data !== undefined && detailQuery.data.ledger.length === 0 && (
            <p className="hrl-hint">لا توجد حركة بعد. تسجل الحركة عند الصرف وعند كل قسط يخصم في مسير معتمَد.</p>
          )}
        </section>
      )}
    </div>
  );
};

interface RowProps {
  row: AdvanceRow;
  canManage: boolean;
  busy: boolean;
  open: boolean;
  onToggle: () => void;
  onPause: (paused: boolean, reason: string) => void;
  onDisburse: () => void;
}

const AdvanceRowView: React.FC<RowProps> = ({ row, canManage, busy, open, onToggle, onPause, onDisburse }) => {
  const outstanding = money(row.outstanding) ?? EMPTY_MARK;
  const settled = row.status === 'settled';

  return (
    <tr className={open ? 'hrp-row--on' : undefined}>
      <th scope="row">
        <button type="button" className="hrl-link" onClick={onToggle}>
          {row.advance_number}
        </button>
        <span className="hrl-row__meta">{ADVANCE_KIND_LABELS[row.kind]}</span>
        <span className="hrl-row__meta">تاريخ المنح {fmtDateHuman(row.granted_on)}</span>
      </th>

      <td>
        {row.employee_name}
        <span className="hrl-row__meta">{row.reason}</span>
      </td>

      <td dir="ltr">{money(row.principal_amount) ?? EMPTY_MARK}</td>

      <td>
        {/* «٣ من ٦» — والعددُ الأولُ وحدَه لا يقول شيئاً. */}
        {row.installments_charged} من {row.installments_count}
        <span className="hrl-row__meta" dir="ltr">
          {money(row.installment_amount) ?? EMPTY_MARK}
        </span>
        {row.schedule_extended && (
          <span className="hrl-badge hrp-badge--warn">امتد الجدول بسقف م.٩٢/١</span>
        )}
      </td>

      <td dir="ltr">{outstanding}</td>

      <td dir="ltr">
        {/* 🔴 صفرٌ مكتوبٌ يُقرأ حقيقةً: سلفةٌ موقوفةٌ لا «قسطُها صفر» بل «لا قسطَ لها». */}
        {row.status === 'active' && isPositiveMoney(row.next_installment)
          ? money(row.next_installment)
          : EMPTY_MARK}
      </td>

      <td>
        <span className={`hrl-badge ${settled ? 'hrp-badge--ok' : 'hrl-badge--flat'}`}>
          {ADVANCE_STATUS_LABELS[row.status]}
        </span>
        <span className="hrl-row__meta">{ADVANCE_STATUS_HINTS[row.status]}</span>
        {row.paused_reason !== null && <span className="hrl-row__meta">{row.paused_reason}</span>}
      </td>

      <td>
        {/* 🔴 الزرُّ يظهر معطَّلاً وتحته سببُه لا مخفيّاً — عرفُ الوحدة المكتوب. */}
        {row.status === 'pending' && (
          <button
            type="button"
            className="hr-btn hr-btn--sm"
            disabled={!canManage || busy}
            onClick={onDisburse}
          >
            <Send size={13} /> تسجيل الصرف
          </button>
        )}

        {row.status === 'active' && (
          <button
            type="button"
            className="hr-btn hr-btn--sm"
            disabled={!canManage || busy}
            onClick={() => {
              const reason = window.prompt('سبب إيقاف الأقساط (يسجل باسمك):');
              if (reason !== null && reason.trim().length >= 5) onPause(true, reason.trim());
            }}
          >
            <Pause size={13} /> أوقف الأقساط
          </button>
        )}

        {row.status === 'paused' && (
          <button
            type="button"
            className="hr-btn hr-btn--sm"
            disabled={!canManage || busy}
            onClick={() => {
              const reason = window.prompt('سبب استئناف الأقساط (يسجل باسمك):');
              if (reason !== null && reason.trim().length >= 5) onPause(false, reason.trim());
            }}
          >
            <Play size={13} /> استأنف
          </button>
        )}

        {!canManage && <span className="hrl-row__meta">تلزمك صلاحية منح السلف.</span>}

        {row.status === 'active' && (
          <span className="hrl-row__meta">
            أول قسط من {fmtMonthHuman(row.first_installment_period)} ·{' '}
            <Link className="hrl-link" to="/hr/payroll">
              القرار في قائمة القرارات المعلقة
            </Link>
          </span>
        )}
      </td>
    </tr>
  );
};

export default AdvancesPage;
