import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, FileText, Lock, Plus, RefreshCw, ShieldAlert } from 'lucide-react';

import { hrSettlementService } from '../../../services/hrSettlementService';
import { EMPTY_MARK, errorText, fmtDateHuman, money, RUN_STAGE_LABELS } from '../payroll/payrollFormat';
import type { RunStage } from '../../../types/hrPayroll';

/**
 * **التصفيات** — `/hr/payroll/settlements`.
 *
 * ══════ ولماذا يظهر «سببُ الإنهاء ناقص» عموداً لا شارةً صغيرة ══════
 * لأنّه ليس نقصَ بيانٍ تجميليّاً: تصفيةٌ بلا سببٍ مكيَّفٍ **لم تُحسب مكافأتُها أصلاً**، ومجموعُها
 * المعروضُ ناقصٌ بمقدارِ مكافأةِ سنوات. وشارةٌ رماديةٌ في زاويةٍ تجعل الصفَّ يُقرأ مكتملاً وهو
 * أخطرُ ما في الجدول.
 *
 * ══════ 🔴 وفتحُ التصفية يلزمه آخرُ يومِ خدمة ولا يُخمَّن ══════
 * الفتحُ يقع بعد نداءِ جاهزيةٍ يقول ما ينقص بالاسم — والزرُّ يُعطَّل وتحته سببُه، ولا يُخفى.
 */

export const SettlementListPage: React.FC = () => {
  const navigate = useNavigate();
  const [profileId, setProfileId] = useState('');
  const [lastDay, setLastDay] = useState('');
  const [openError, setOpenError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['hr', 'settlements', 'list'],
    queryFn: () => hrSettlementService.list({ per_page: 30 }),
    staleTime: 30_000,
  });

  const readiness = useQuery({
    queryKey: ['hr', 'settlements', 'readiness', profileId, lastDay],
    queryFn: () => hrSettlementService.getReadiness(Number(profileId), lastDay === '' ? null : lastDay),
    enabled: profileId !== '' && Number(profileId) > 0,
  });

  const openMutation = useMutation({
    mutationFn: () =>
      hrSettlementService.open({
        employee_profile_id: Number(profileId),
        last_working_day: lastDay === '' ? null : lastDay,
      }),
    onSuccess: (statement) => {
      setOpenError(null);
      navigate(`/hr/payroll/settlements/${statement.run_id}`);
    },
    onError: (error) => setOpenError(errorText(error, 'تعذّر فتحُ مسير التصفية.')),
  });

  const listError = list.error;
  const locked =
    listError instanceof Error && /صلاحية|غير مصرح|غير مفعّل|Forbidden|Unauthorized/i.test(listError.message);

  if (locked) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--locked">
          <Lock size={22} />
          <p className="hrl-state__t">التصفياتُ غيرُ متاحةٍ لك</p>
          <p className="hrl-state__d">{errorText(listError, '')}</p>
        </div>
      </div>
    );
  }

  const rows = list.data?.data ?? [];
  const canOpen = readiness.data?.can_open === true;

  return (
    <div className="hrl-page hrs-page">
      <header className="hrs-head">
        <div className="hrs-head__id">
          <h1 className="hrs-head__t">تصفيةُ نهاية الخدمة</h1>
          <p className="hrs-head__s">
            المكافأةُ + رصيدُ الإجازة + أجرُ آخر مدّة + ما له وما عليه — بمهلة م.٨٨ لكلِّ حالة.
          </p>
        </div>
        <button type="button" className="hr-btn hr-btn--sm" onClick={() => void list.refetch()}>
          <RefreshCw size={13} /> تحديث
        </button>
      </header>

      {/* ───────── فتحُ تصفية ───────── */}
      <section className="hrs-card">
        <div className="hrs-card__head">
          <h2 className="hrs-card__t">
            <Plus size={15} /> افتح تصفيةً
          </h2>
        </div>

        <div className="hrs-basis__form">
          <label className="hrs-field">
            <span className="hrs-field__l">رقمُ الملفّ الوظيفيّ للموظف</span>
            <input
              className="hrs-field__c"
              type="number"
              min={1}
              value={profileId}
              onChange={(event) => setProfileId(event.target.value)}
            />
          </label>

          <label className="hrs-field">
            <span className="hrs-field__l">
              آخرُ يومِ خدمةٍ (شامل) — يُترك فارغاً ليُقرأ من الملفّ الوظيفيّ
            </span>
            <input
              className="hrs-field__c"
              type="date"
              value={lastDay}
              onChange={(event) => setLastDay(event.target.value)}
            />
          </label>

          {readiness.data !== undefined && (
            <div className="hrs-hint">
              <ShieldAlert size={13} />
              <span>
                {readiness.data.facts.employee_name ?? EMPTY_MARK} · التحق{' '}
                {fmtDateHuman(readiness.data.facts.hire_date ?? null)} · الأجرُ الفعليّ{' '}
                {money(readiness.data.facts.wage_actual ?? null) ?? EMPTY_MARK} · رصيدُ الإجازة{' '}
                {readiness.data.facts.leave_balance_days ?? EMPTY_MARK} يوماً.
                {readiness.data.blockers.length > 0 && (
                  <> ما يمنع الفتح: {readiness.data.blockers.join(' · ')}</>
                )}
                {readiness.data.warnings.length > 0 && <> تنبيه: {readiness.data.warnings.join(' · ')}</>}
              </span>
            </div>
          )}

          <div className="hrs-acts">
            <button
              type="button"
              className="hr-btn hr-btn--primary"
              disabled={!canOpen || openMutation.isPending}
              onClick={() => openMutation.mutate()}
            >
              {openMutation.isPending ? 'يُفتح…' : 'افتح مسيرَ التصفية'}
            </button>
            {profileId !== '' && !canOpen && (
              <span className="hrs-why-off">الزرُّ معطَّلٌ حتى تكتمل الجاهزيةُ أعلاه.</span>
            )}
          </div>

          {openError !== null && (
            <p className="hrs-error">
              <AlertTriangle size={14} /> {openError}
            </p>
          )}
        </div>
      </section>

      {/* ───────── القائمة ───────── */}
      <section className="hrs-card">
        <div className="hrs-card__head">
          <h2 className="hrs-card__t">
            <FileText size={15} /> التصفياتُ المفتوحة والمعتمَدة
          </h2>
        </div>

        {list.isLoading ? (
          <div className="hrl-state hrl-state--loading">
            <span className="hrl-skel hrl-skel--line" />
          </div>
        ) : rows.length === 0 ? (
          <p className="hrs-empty">لا تصفياتٍ بعد.</p>
        ) : (
          <ul className="hrs-list" style={{ listStyle: 'none', paddingInlineStart: 0 }}>
            {rows.map((row) => (
              <li key={row.id}>
                <Link className="hrs-row" to={`/hr/payroll/settlements/${row.run_id}`}>
                  <span className="hrs-row__n">{row.employee_name}</span>
                  <span className="hrs-row__d">
                    آخرُ يومِ خدمة {fmtDateHuman(row.last_working_day)} ·{' '}
                    {RUN_STAGE_LABELS[row.stage as RunStage] ?? row.stage}
                    {row.settlement_deadline === null ? null : (
                      <>
                        {' '}
                        · <CalendarClock size={11} /> مهلةُ م.٨٨ {fmtDateHuman(row.settlement_deadline)}
                      </>
                    )}
                  </span>
                  {/* 🔴 عمودٌ لا شارة: مجموعٌ بلا سببٍ مكيَّفٍ ناقصٌ بمقدارِ مكافأةِ سنوات. */}
                  <span className={`hrs-tag ${row.basis_missing ? 'hrs-tag--need' : 'hrs-tag--ok'}`}>
                    {row.basis_missing ? 'سببُ الإنهاء ناقص' : (row.basis_label ?? '—')}
                  </span>
                  <span className="hrs-row__a" dir="ltr">
                    {money(row.net_amount ?? null) ?? EMPTY_MARK}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default SettlementListPage;
