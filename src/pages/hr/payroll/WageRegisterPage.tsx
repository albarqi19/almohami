import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Lock, RefreshCw, UserSquare2, Wallet } from 'lucide-react';

import { hrPayrollService } from '../../../services/hrPayrollService';
import { meterVars } from '../leave/leaveFormat';
import { EMPTY_MARK, errorText, NBSP } from './payrollFormat';
import WageFileForm from './WageFileForm';
import WageForm from './WageForm';
import WageHistory from './WageHistory';
import WageInForce from './WageInForce';
import WageRoster from './WageRoster';
import type { WageFilePayload, WageRecordPayload, WageRegisterFilter } from '../../../types/hrPayroll';

/**
 * **سجلُّ الأجور** — `/hr/payroll/wages`.
 *
 * ══════ لماذا هذه الشاشة أولاً ══════
 * حلقةٌ مغلقةٌ في الإنتاج منذ اليوم الأول: خطابُ تعريف الراتب يردّ «سجِّل الراتب أولاً»،
 * ولا واجهةَ في المنصّة تسجّله (`upsertCompensation` مكتوبةٌ بلا مستدعٍ واحد). هذه الشاشةُ
 * تفكّها — وقيمتُها مستقلّةٌ تماماً عن محرّك المسير.
 *
 * ══════ البنيةُ لا حقولٌ مبعثرة ══════
 * الشاشةُ تُظهر أربعةَ أشياء بترتيبها المنطقيّ: **ما الأجرُ الساري الآن** (رقمٌ واحدٌ كبير
 * وأوعيتُه الثلاثة)، ثمّ **نسخةٌ جديدة** (مجموعُها حيٌّ وأثرُها مقروءٌ قبل الحفظ)، ثمّ
 * **السياسة** (مطويّةٌ لأنها لا تتغيّر)، ثمّ **الخطُّ التاريخيّ**. لا معالجَ متعدّدَ الصفحات
 * ولا مودالَ يخفي القائمة.
 *
 * ══════ الحالةُ في الرابط ══════
 * المنسوبُ والمرشِّحُ والبحثُ والصفحة في `useSearchParams` — فالرابطُ قابلٌ للمشاركة («افتح
 * لي سجلَّ من بلا آيبان») ولا تُفقد الحالةُ بالتحديث.
 *
 * ══════ الإدخالُ المتوالي ══════
 * حفظُ نسخةٍ **يقفز إلى المنسوب التالي في الشريحة نفسِها** ولا يُغلق شيئاً. عشرون موظفاً
 * تُدخَل في مسارٍ واحدٍ متّصلٍ لا عشرين نموذجاً يُفتح ويُغلق. ولا استيرادَ Excel: الأجرُ
 * بيانٌ لا يُلصَق.
 *
 * ══════ 🔴 وصلاحيةُ المبالغ ليست صلاحيةَ الشاشة ══════
 * من لا يملك عرضَ التعويضات **يرى الشاشةَ كاملةً بحالاتها** (من له أجر، من بلا آيبان، من
 * بلا نظام تأمينات) ولا يرى ريالاً واحداً. حجبُ الشاشة كلِّها يُعطّل إدارةَ الجاهزية بلا
 * حمايةٍ إضافية، وعرضُ صفرٍ مكانَ الرقم يكذب.
 */

const PER_PAGE = 25;

export const WageRegisterPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();

  const filterParam = params.get('filter');
  const filter: WageRegisterFilter = (
    ['all', 'missing_wage', 'missing_iban', 'missing_scheme', 'ready'] as WageRegisterFilter[]
  ).includes(filterParam as WageRegisterFilter)
    ? (filterParam as WageRegisterFilter)
    : 'all';

  const search = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const employeeParam = Number(params.get('employee') ?? '');
  const selectedId = Number.isFinite(employeeParam) && employeeParam > 0 ? employeeParam : null;

  const [formError, setFormError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  /** كتابةُ الحالة في الرابط — مفتاحٌ فارغٌ يُحذف فلا يتضخّم الرابطُ بقيمٍ صامتة. */
  const setParam = (patch: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    });
    if (resetPage && !('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  const registerQuery = useQuery({
    queryKey: ['hr', 'payroll', 'wage-register', filter, search, page],
    queryFn: () => hrPayrollService.getRegister({ filter, search, page, per_page: PER_PAGE }),
    staleTime: 30_000,
  });

  // مرجعٌ ثابتٌ بين التصييرات: `?? []` يُنشئ مصفوفةً جديدةً كلَّ مرّة فيُبطل كلَّ `useMemo`
  // يعتمد عليها — وأثرُه هنا إعادةُ حساب موضع المنسوب في كلّ ضربةِ مفتاحٍ في البحث.
  const rows = useMemo(() => registerQuery.data?.page.data ?? [], [registerQuery.data]);
  const meta = registerQuery.data?.meta;
  const counts = meta?.counts;
  const canViewAmounts = meta?.can_view_amounts ?? false;
  const canManage = meta?.can_manage ?? false;

  const profileQuery = useQuery({
    queryKey: ['hr', 'payroll', 'wage-profile', selectedId],
    queryFn: () => hrPayrollService.getProfile(selectedId as number),
    enabled: selectedId !== null,
  });

  const detail = profileQuery.data?.detail;

  // تبديلُ المنسوب يمسح رسائلَ الحفظ السابقة — خطأٌ باقٍ فوق ملفٍّ آخرَ يُقرأ حكماً عليه.
  useEffect(() => {
    setFormError(null);
    setFileError(null);
  }, [selectedId]);

  /** موضعُ المنسوب في الشريحة، ومن يليه — أساسُ المسار المتوالي. */
  const position = useMemo(() => {
    if (selectedId === null) return null;
    const index = rows.findIndex((row) => row.profile_id === selectedId);
    if (index < 0) return null;

    return { index, next: rows[index + 1] ?? null, total: rows.length };
  }, [rows, selectedId]);

  const invalidate = (profileId: number) => {
    void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'wage-register'] });
    void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'wage-profile', profileId] });
    // جدارُ ملفّ الموظف يقرأ `current_compensation` — فيُبطَل كاشُه كي لا يعرض راتبَ الأمس.
    void queryClient.invalidateQueries({ queryKey: ['hr', 'employee', profileId] });
  };

  const recordMutation = useMutation({
    mutationFn: (payload: WageRecordPayload) => hrPayrollService.recordWage(selectedId as number, payload),
    onSuccess: () => {
      const saved = selectedId as number;
      setFormError(null);
      invalidate(saved);

      // 🔑 المسارُ المتوالي: القفزُ إلى التالي في الشريحة نفسِها بلا إغلاقِ شيء.
      if (position?.next) {
        setParam({ employee: String(position.next.profile_id) }, false);
      }
    },
    onError: (error) => setFormError(errorText(error, 'تعذّر حفظ نسخة الأجر.')),
  });

  const fileMutation = useMutation({
    mutationFn: (payload: WageFilePayload) =>
      detail?.wage_file
        ? hrPayrollService.updateFile(selectedId as number, payload)
        : hrPayrollService.openFile(selectedId as number, payload),
    onSuccess: () => {
      setFileError(null);
      invalidate(selectedId as number);
    },
    onError: (error) => setFileError(errorText(error, 'تعذّر حفظ سياسة الأجر.')),
  });

  const voidMutation = useMutation({
    mutationFn: (input: { recordId: number; reason: string }) =>
      hrPayrollService.voidRecord(selectedId as number, input.recordId, input.reason),
    onSuccess: () => invalidate(selectedId as number),
    onError: (error) => setFormError(errorText(error, 'تعذّر إلغاء النسخة.')),
  });

  // ─────────── الحالةُ المقفلة: الوحدةُ مطفأةٌ أو الصلاحيةُ ناقصة ───────────
  const registerError = registerQuery.error;
  const lockedMessage =
    registerError instanceof Error &&
    /غير مفعّل|غير مصرح|صلاحية|Unauthorized|Forbidden/i.test(registerError.message)
      ? registerError.message
      : null;

  if (lockedMessage) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--locked">
          <Lock size={22} />
          <p className="hrl-state__t">سجلُّ الأجور غيرُ متاحٍ لك</p>
          <p className="hrl-state__d">{lockedMessage}</p>
        </div>
      </div>
    );
  }

  const ready = counts?.ready ?? 0;
  const all = counts?.all ?? 0;

  return (
    <div className="hrl-page">
      <header className="hrl-head">
        <div className="hrl-head__id">
          <h1 className="hrl-h1">
            <Wallet size={16} /> سجلُّ الأجور
          </h1>
          <p className="hrl-sub">
            الراتبُ نسخةٌ مؤرَّخةٌ لا خانةٌ تُحرَّر — التغييرُ نسخةٌ جديدةٌ من تاريخ، والماضي لا
            يُعاد كتابتُه.
          </p>
        </div>

        <div className="hrl-head__badges">
          <span className="hrl-fact hrl-fact--gold">
            جاهزٌ للمسير
            <span className="hrl-fact__n" dir="ltr">
              {counts ? `${ready} / ${all}` : EMPTY_MARK}
            </span>
          </span>
          <span className="hrl-fact">
            بلا أجرٍ مسجَّل
            <span className="hrl-fact__n" dir="ltr">
              {counts ? counts.missing_wage : EMPTY_MARK}
            </span>
          </span>
          <span className="hrl-fact">
            بلا آيبانٍ صالح
            <span className="hrl-fact__n" dir="ltr">
              {counts ? counts.missing_iban : EMPTY_MARK}
            </span>
          </span>
        </div>
      </header>

      {counts && all > 0 && (
        <div className="hrl-block hrp-ready">
          <div className="hrl-block__b">
            <div
              className="hrl-meter"
              role="img"
              aria-label={`جاهزٌ للمسير ${ready} من ${all} منسوباً`}
            >
              <span className="hrl-meter__seg" style={meterVars(1, all === 0 ? 0 : ready / all)}>
                <span className="hrl-meter__fill" />
              </span>
            </div>
            <div className="hrl-meter__legend">
              <span>جاهز: {ready}</span>
              <span>بلا أجر: {counts.missing_wage}</span>
              <span>بلا نظام تأمينات: {counts.missing_scheme}</span>
              <span>بلا آيبان صالح: {counts.missing_iban}</span>
            </div>
          </div>
        </div>
      )}

      <div className="hrl-layout">
        <WageRoster
          rows={rows}
          counts={counts}
          filter={filter}
          search={search}
          page={registerQuery.data?.page.current_page ?? page}
          lastPage={registerQuery.data?.page.last_page ?? 1}
          total={registerQuery.data?.page.total ?? 0}
          selectedId={selectedId}
          loading={registerQuery.isPending}
          error={registerQuery.isError ? registerQuery.error : null}
          canViewAmounts={canViewAmounts}
          onSearch={(value) => setParam({ q: value })}
          onFilter={(value) => setParam({ filter: value === 'all' ? null : value })}
          onPage={(value) => setParam({ page: String(value) }, false)}
          onSelect={(profileId) => setParam({ employee: String(profileId) }, false)}
          onRetry={() => void registerQuery.refetch()}
        />

        <section className="hrl-stage">
          {selectedId === null && (
            <div className="hrl-state hrl-state--empty">
              <UserSquare2 size={22} />
              <p className="hrl-state__t">اختر منسوباً لتبدأ</p>
              <p className="hrl-state__d">
                {counts && counts.missing_wage > 0
                  ? `${counts.missing_wage} منسوباً بلا أجرٍ مسجَّل. ابدأ بشريحة «بلا أجر» في العمود المجاور — وحفظُ كلِّ نسخةٍ يقفز بك إلى التالي.`
                  : 'العمودُ المجاور يعرض منسوبي المكتب وحالةَ أجر كلٍّ منهم.'}
              </p>
            </div>
          )}

          {selectedId !== null && profileQuery.isPending && (
            <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل ملفّ الأجر">
              <span className="hrl-skel" />
              <span className="hrl-skel" />
              <span className="hrl-skel" />
              <span className="hrl-skel" />
            </div>
          )}

          {selectedId !== null && profileQuery.isError && (
            <div className="hrl-state hrl-state--error">
              <AlertTriangle size={22} />
              <p className="hrl-state__t">تعذّر جلب ملفّ الأجر</p>
              <p className="hrl-state__d">{errorText(profileQuery.error, 'انقطعَ الاتصال بالخادم.')}</p>
              <button type="button" className="hr-btn hr-btn--sm" onClick={() => void profileQuery.refetch()}>
                <RefreshCw size={13} /> إعادة المحاولة
              </button>
            </div>
          )}

          {selectedId !== null && detail && (
            <>
              {/* رأسُ المنسوب ثابتٌ بالبنية (خارج المُمرِّر) — فلا يضيع الاسمُ عند التمرير
                  في ملفٍّ طويلٍ فيُقرأ رقمٌ بلا صاحب. */}
              <header className="hrl-head">
                <div className="hrl-head__id">
                  <h2 className="hrl-h2">{detail.profile.name ?? EMPTY_MARK}</h2>
                  <p className="hrl-sub">
                    {[detail.profile.job_title, detail.profile.department, detail.profile.employee_number]
                      .filter(Boolean)
                      .join(' · ') || EMPTY_MARK}
                  </p>
                </div>
                {detail.wage_file?.status === 'held' && (
                  <span className="hrl-badge hrl-badge--flat">
                    ملفُّ الأجر معلَّق{detail.wage_file.hold_reason ? ` — ${detail.wage_file.hold_reason}` : ''}
                  </span>
                )}
              </header>

              {/* `hrl-wall` هو المُمرِّرُ الوحيدُ في المسرح — لا مُمرِّرَ داخل مُمرِّر. */}
              <div className="hrl-wall">
                <WageInForce
                  vessels={detail.in_force}
                  canViewAmounts={canViewAmounts}
                  hasWageRecord={detail.records.some((record) => !record.voided_at)}
                />

                {canManage ? (
                  <WageForm
                    profileId={selectedId}
                    currentFrom={detail.in_force?.effective_from ?? null}
                    saving={recordMutation.isPending}
                    errorText={formError}
                    onSubmit={(payload) => recordMutation.mutate(payload)}
                  />
                ) : null}

                <WageFileForm
                  file={detail.wage_file}
                  canViewAmounts={canViewAmounts}
                  canManage={canManage}
                  saving={fileMutation.isPending}
                  errorText={fileError}
                  onSubmit={(payload) => fileMutation.mutate(payload)}
                />

                <WageHistory
                  records={detail.records}
                  canViewAmounts={canViewAmounts}
                  canManage={canManage}
                  voidingId={voidMutation.isPending ? voidMutation.variables?.recordId ?? null : null}
                  onVoid={(recordId, reason) => voidMutation.mutate({ recordId, reason })}
                />
              </div>

              {position && (
                <div className="hrp-seq">
                  <span>
                    المنسوبُ <span className="hrp-seq__n">{position.index + 1}</span> من{' '}
                    <span className="hrp-seq__n">{position.total}</span> في هذه الشريحة
                  </span>

                  {position.next ? (
                    <span className="hrp-seq__next">
                      التالي:
                      <span className="hrp-seq__name">{position.next.name ?? EMPTY_MARK}</span>
                      <button
                        type="button"
                        className="hr-btn hr-btn--sm"
                        onClick={() => setParam({ employee: String(position.next?.profile_id ?? '') }, false)}
                      >
                        <ArrowLeft size={13} />{NBSP}انتقل
                      </button>
                    </span>
                  ) : (
                    <span>آخرُ منسوبٍ في هذه الشريحة.</span>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default WageRegisterPage;
