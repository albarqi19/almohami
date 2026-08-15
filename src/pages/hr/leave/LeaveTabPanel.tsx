import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays, CalendarPlus, RefreshCw, Wallet } from 'lucide-react';

import { hrLeaveService } from '../../../services/hrLeaveService';
import { usePermission } from '../../../hooks/usePermission';
import EmptyLine from '../dossier/EmptyLine';
import { useLeaveBalance } from '../dossier/useDossierData';
import RecordLeaveModal from './RecordLeaveModal';
import {
  EMPTY_MARK,
  colorClass,
  errorText,
  fmtDays,
  fmtLeaveRange,
  leaveTypeName,
  toNum,
} from './leaveFormat';
import { LEAVE_STATUS_LABELS } from '../../../types/hr';
import type { LeaveBalanceTypeRow, LeaveStatus } from '../../../types/hr';

/**
 * تبويبُ «الإجازات» داخل ملفّ الموظف — **يُركَّب مرّةً واحدةً فقط** مهما كان المقاس
 * (`useIsDesktop(1025)` في `HrModule` يختار موضعَ التركيب، وهي **نفسُها** عتبةُ الـCSS
 * `min-width:1025px` / `max-width:1024.98px` فلا يجتمعان ولا يغيبان معاً — وقبل تصحيحها
 * كان هذا اللوحُ يظهر **فارغاً** على 1024px بالضبط).
 *
 * · **صفرُ مقاسٍ بديل**: لا `--compact` ولا `style={{fontSize}}` — كثافةٌ واحدةٌ هنا
 *   وفي الصفحة الجامعة، فتسقط عشرون موضعَ `style={{}}` وأربعُ نسخٍ من منطق الشارة.
 * · يقرأ من `hrLeaveService` حصراً — ويُغني عن استعلام خدمة الطلبات الإدارية داخل
 *   `HrModule` نهائياً.
 * · الرصيدُ **محسوبٌ من ذيل الدفتر** (`LeaveBalanceService::snapshot`)، ولا يُقرأ
 *   `annual_leave_balance` ولا `annual_leave_entitlement` (عمودان متقاعدان).
 */

const RECENT_LIMIT = 8;

/** نصٌّ احتياطيٌّ واحدٌ لفرعَي الخطأ — لا تتكرّر جملةٌ في الملفّ. */
const CONNECTION_FALLBACK = 'انقطعَ الاتصال بالخادم.';

const STATUS_BADGE: Record<LeaveStatus, string> = {
  pending: 'hr-badge--gold',
  approved: 'hr-badge--green',
  rejected: 'hr-badge--red',
  cancelled: 'hr-badge--gray',
  superseded: 'hr-badge--gray',
};

interface Props {
  empId: number;
  employeeName?: string | null;
}

/** حدودُ المعادلة الأربعة — نفسُ ترتيب لوح الرصيد فلا يفترق قارئان. */
const TERMS: Array<{ key: keyof Pick<LeaveBalanceTypeRow, 'opening' | 'accrued' | 'consumed' | 'adjustments'>; label: string; op: string }> = [
  { key: 'opening', label: 'افتتاحيّ', op: '' },
  { key: 'accrued', label: 'مستحقّ', op: '+' },
  { key: 'consumed', label: 'مخصوم', op: '−' },
  { key: 'adjustments', label: 'تسويات', op: '±' },
];

export const LeaveTabPanel: React.FC<Props> = ({ empId, employeeName }) => {
  const canManage = usePermission('hr.leave.manage');
  const [showRecord, setShowRecord] = useState(false);

  // المفتاحُ ودالّتُه و`staleTime` في `useDossierData` — نفسُها حرفياً، فيُدمج النداءُ مع
  // أيّ مستهلكٍ آخرَ للرصيد داخل الملفّ ولا يتكرّر الطلب.
  const balanceQuery = useLeaveBalance(empId);

  const recordsQuery = useQuery({
    queryKey: ['hr', 'leave', 'records', { employee_profile_id: empId, per_page: RECENT_LIMIT }],
    queryFn: () => hrLeaveService.getEmployeeLeaves(empId, { per_page: RECENT_LIMIT }),
    staleTime: 15_000,
  });

  const snapshot = balanceQuery.data;

  const mainType = useMemo<LeaveBalanceTypeRow | null>(() => {
    const types = snapshot?.types ?? [];
    if (types.length === 0) return null;
    return types.find((t) => t.code === 'annual') ?? types[0];
  }, [snapshot]);

  const rows = recordsQuery.data?.data ?? [];

  return (
    <div className="hrl-tabpanel">
      {showRecord && (
        <RecordLeaveModal
          employee={{ profileId: empId, name: employeeName || `منسوب #${empId}` }}
          canManage={canManage}
          onClose={() => setShowRecord(false)}
        />
      )}

      {/* ═══ الرصيد ومعادلتُه ═══ */}
      <div className="hrl-block">
        <div className="hrl-block__h">
          {/* رتبةُ العنوان: داخل جدار الملفّ هذان بلوكان **شقيقان** لبلوكات الجدار،
              فرتبتُهما `h2` بمقاس 14/600 لا `h3` بمقاس 12.5 — رأسان بمقاسين لرتبةٍ
              بصريةٍ واحدةٍ هو أوّلُ ما تراه العينُ في تصميمٍ كلُّ فضيلته الإيقاعُ الواحد. */}
          <h2 className="hrl-block__t hrl-h2">
            <Wallet size={14} /> رصيد الإجازات
          </h2>
          {canManage && (
            <div className="hrl-block__a">
              <button type="button" className="hr-btn hr-btn--sm" onClick={() => setShowRecord(true)}>
                <CalendarPlus size={13} /> تسجيل غياب
              </button>
            </div>
          )}
        </div>

        {balanceQuery.isPending ? (
          <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل الرصيد">
            <span className="hrl-skel hrl-skel--line" />
            <span className="hrl-skel hrl-skel--line" />
          </div>
        ) : balanceQuery.isError || !snapshot ? (
          <div className="hrl-state hrl-state--error">
            <AlertTriangle size={20} />
            <p className="hrl-state__t">تعذّر جلب الرصيد</p>
            <p className="hrl-state__d">{errorText(balanceQuery.error, CONNECTION_FALLBACK)}</p>
            <button type="button" className="hr-btn hr-btn--sm" onClick={() => void balanceQuery.refetch()}>
              <RefreshCw size={13} /> إعادة المحاولة
            </button>
          </div>
        ) : !snapshot.is_initialized ? (
          // قبل التهيئة: **لا يُعرض ٢١ ولا ٠ ولا شرطة** — تُسمّى الحالةُ ويُقاد إلى الشاشة.
          <div className="hrl-state hrl-state--empty">
            <Wallet size={20} />
            <p className="hrl-state__t">الرصيد غير مُهيّأ</p>
            <p className="hrl-state__d">
              الاستحقاقُ يبدأ من تاريخِ مرساةٍ صريح. قبله لا يُولَّد يومٌ واحد، ولا يُعرض رقمٌ بلا أساس.
            </p>
            <Link className="hrl-link" to={`/hr/leave/${empId}`}>
              تهيئةُ الرصيد من صفحة الإجازات ←
            </Link>
          </div>
        ) : (
          <>
            <div className="hrl-num">
              <span className={`hrl-num__v${mainType && toNum(mainType.balance) < 0 ? ' is-neg' : ''}`} dir="ltr">
                {mainType ? fmtDays(mainType.balance) : EMPTY_MARK}
              </span>
              <span className="hrl-num__u">يوماً متاحاً{mainType ? ` — ${mainType.name}` : ''}</span>
            </div>
            <p className="hrl-num__label">{snapshot.balance_label}</p>

            {mainType && (
              <div className="hrl-formula">
                {TERMS.map((term) => (
                  <div className="hrl-formula__term hrl-formula__term--static" key={term.key}>
                    <span className="hrl-formula__k">
                      {term.op} {term.label}
                    </span>
                    <span className="hrl-formula__v" dir="ltr">
                      {fmtDays(mainType[term.key])}
                    </span>
                  </div>
                ))}
                <div className="hrl-formula__term hrl-formula__term--static hrl-formula__term--sum">
                  <span className="hrl-formula__k">= المتاح</span>
                  <span className="hrl-formula__v" dir="ltr">
                    {fmtDays(mainType.balance)}
                  </span>
                </div>
              </div>
            )}

            {snapshot.future_committed_days > 0 && (
              <p className="hrl-note">
                منها {fmtDays(snapshot.future_committed_days)} يوماً لإجازاتٍ تبدأ لاحقاً.
              </p>
            )}
          </>
        )}
      </div>

      {/* ═══ آخرُ الوقائع ═══ */}
      <div className="hrl-block">
        <div className="hrl-block__h">
          <h2 className="hrl-block__t hrl-h2">
            <CalendarDays size={14} /> آخر الوقائع
          </h2>
          <div className="hrl-block__a">
            <Link className="hrl-link" to={`/hr/leave/${empId}`}>
              فتحُ السجلّ الكامل ←
            </Link>
          </div>
        </div>

        <div className="hrl-block__b hrl-block__b--flush">
          {recordsQuery.isPending ? (
            <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل الوقائع">
              {Array.from({ length: 4 }, (_, i) => (
                <span className="hrl-skel" key={i} />
              ))}
            </div>
          ) : recordsQuery.isError ? (
            <div className="hrl-state hrl-state--error">
              <AlertTriangle size={20} />
              <p className="hrl-state__t">تعذّر جلب الوقائع</p>
              <p className="hrl-state__d">{errorText(recordsQuery.error, CONNECTION_FALLBACK)}</p>
              <button type="button" className="hr-btn hr-btn--sm" onClick={() => void recordsQuery.refetch()}>
                <RefreshCw size={13} /> إعادة المحاولة
              </button>
            </div>
          ) : rows.length === 0 ? (
            // **بلوكُ سجلٍّ فارغٌ = سطرٌ** (44px) لا حالةٌ كاملةٌ بحشو 28px: سبعُ حالاتٍ
            // كاملةٍ في ملفٍّ جديدٍ ثلاثُ شاشاتِ عدم. والحالةُ الكاملةُ تبقى فوق لبلوك
            // الرصيد غير المُهيَّأ وحدَه لأنّه يشرح المرساة.
            <EmptyLine
              text="لا وقائعَ مسجَّلة"
              action={canManage && (
                <button type="button" className="hr-btn hr-btn--sm hr-btn--primary" onClick={() => setShowRecord(true)}>
                  <CalendarPlus size={13} /> سجّل أوّل واقعة
                </button>
              )}
            />
          ) : (
            <table className="hrl-table hrl-table--single">
              <caption className="hrl-sr">آخر وقائع الإجازة والغياب لهذا المنسوب</caption>
              <thead>
                <tr>
                  <th scope="col">النوع</th>
                  <th scope="col">المدى</th>
                  <th scope="col">الأيام</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((leave) => (
                  <tr key={leave.id}>
                    <td>
                      <span className={`hrl-type ${colorClass(leave.leave_type?.color_key)}`}>
                        <span className="hrl-dot" aria-hidden="true" />
                        <span>
                          <span className="hrl-type__n">{leaveTypeName(leave)}</span>
                          <span className="hrl-cellsub">
                            <span className={`hr-badge ${STATUS_BADGE[leave.status]}`}>
                              {LEAVE_STATUS_LABELS[leave.status]}
                            </span>
                          </span>
                        </span>
                      </span>
                    </td>
                    <td>{fmtLeaveRange(leave.start_date, leave.end_date)}</td>
                    <td>
                      <span className="hrl-cellnum" dir="ltr">
                        {fmtDays(leave.duration_days)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveTabPanel;
