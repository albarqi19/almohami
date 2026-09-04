import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { AlertTriangle, ArrowLeftRight, Info, Lock, RefreshCw, ShieldAlert, Wallet, X } from 'lucide-react';

import { hrLeaveService } from '../../../services/hrLeaveService';
import { EMPTY_MARK, errorText, fmtDays, fmtLeaveDate, fmtLeaveRange, orderedFlags } from './leaveFormat';
import { OPENING_BASIS_LABELS } from '../../../types/hr';
import type { LegacyLeaveRow } from '../../../types/hr';
import { useLeaveDialog } from './useLeaveDialog';

/**
 * تحويلُ طلبٍ إداريٍّ سابقٍ إلى واقعةٍ حقيقيةٍ في سجلّ الإجازات (D-LGC).
 *
 * ══ ثلاثةُ قراراتٍ تحكم هذه الشاشة ══
 *
 * ١) **النوعَ يختاره إنسان، والنظامُ لا يخمّن.** اسمُ الطلب القديم و«السبب» نصّان حرّان
 *    («ظرفٌ عائليّ»)، وقائمةُ `request_types` مخصّصةٌ لكلّ مكتب — فأيُّ اشتقاقٍ آليٍّ للنوع
 *    يُخطئ في مكتبٍ ما **بصمت**. تُقترح «إجازة سنوية» **مرشَّحةً لا مفروضة**، ونصُّ الطلب
 *    القديم معروضٌ فوقها كما ورد ليقرأه المستخدم قبل أن يختار.
 *
 * ٢) **الزرُّ يقول أثرَه قبل الضغط.** `effect_sentence` يأتي من الخادم — «سيُخصم ٥ أيامٍ من
 *    رصيد منصور (١٦ ⇐ ١١)» أو «سيُسجَّل بلا خصم …». ولا تُصاغ الجملةُ هنا: صياغتان تتباعدان،
 *    وواحدةٌ منهما ستكذب يوماً.
 *
 * ٣) **معنى الرقم الافتتاحيّ يُعرَض دائماً ومعه صدقُ مصدره.** حين يكون `recorded=false`
 *    تقول الشاشةُ صراحةً إنّ القيدَ كُتب قبل وجود هذا الاختيار وإنّ القراءةَ مستنتَجة —
 *    فلا يُقرأ استنتاجٌ على أنّه قرارٌ مكتوب.
 *
 * ⚠️ **الرصيدُ السالبُ يُعلَن ويُستأذَن فيه**: لا يُمنَع صامتاً ولا يُسمح به صامتاً. السالبُ
 * واقعةٌ حقيقيةٌ في المكاتب، والإقرارُ صندوقٌ صريحٌ لا خانةٌ مطويّة.
 */

interface Props {
  employeeId: number;
  employeeName?: string | null;
  row: LegacyLeaveRow;
  canManage: boolean;
  onClose: () => void;
  onConverted?: () => void;
}

export const ConvertLegacyModal: React.FC<Props> = ({
  employeeId,
  employeeName,
  row,
  canManage,
  onClose,
  onConverted,
}) => {
  const queryClient = useQueryClient();

  const [typeId, setTypeId] = useState<number | null>(null);
  const [acknowledge, setAcknowledge] = useState(false);

  const typesQuery = useQuery({
    queryKey: ['hr', 'leave-catalog', 'types'],
    queryFn: () => hrLeaveService.getTypes({ is_active: true }),
    staleTime: 24 * 60 * 60 * 1000,
  });

  /**
   * «السنوية» مُرشَّحةٌ أولاً لأنها أغلبُ ما تعنيه الطلباتُ القديمة — **وليست مفروضة**:
   * القائمةُ كاملةٌ والاختيارُ حرّ، والترتيبُ ترتيبُ الكتالوج لا حكمٌ على الطلب.
   */
  const types = useMemo(
    () => (typesQuery.data ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
    [typesQuery.data]
  );

  const suggested = useMemo(() => types.find((t) => t.code === 'annual') ?? types[0] ?? null, [types]);
  const effectiveTypeId = typeId ?? suggested?.id ?? null;

  const previewQuery = useQuery({
    queryKey: ['hr', 'leave', 'legacy-preview', employeeId, row.id, effectiveTypeId],
    queryFn: () =>
      hrLeaveService.previewLegacyConversion(employeeId, row.id, { leave_type_id: effectiveTypeId as number }),
    enabled: effectiveTypeId !== null,
    staleTime: 0,
  });

  const preview = previewQuery.data;
  const flags = orderedFlags(preview?.blockers, preview?.warnings);

  /**
   * الحاجزُ الوحيدُ الذي يرفعه المستخدمُ بنفسه — والبقيّةُ تمنع الزرَّ حتى تُحلّ في مكانها.
   * ولذلك يُطرح من عدّاد المانعين حين يُقَرّ به، ولا يُخفى من القائمة أبداً.
   */
  const blockingCount = (preview?.blockers ?? []).filter(
    (b) => !(String(b.code) === 'negative_balance_unacknowledged' && acknowledge)
  ).length;

  const mutation = useMutation({
    mutationFn: () =>
      hrLeaveService.convertLegacyRequest(employeeId, row.id, {
        leave_type_id: effectiveTypeId as number,
        acknowledge_negative: acknowledge || undefined,
      }),
  });

  const submit = () => {
    if (!canManage || effectiveTypeId === null || blockingCount > 0 || mutation.isPending) return;

    mutation.mutate(undefined, {
      onSuccess: (data) => {
        void queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] });
        void queryClient.invalidateQueries({ queryKey: ['hr', 'employee'] });

        toast.success(
          data.will_deduct
            ? `تم تحويل الطلب وخصم ${fmtDays(data.leave.duration_days)} يوماً. الرصيد الآن ${fmtDays(data.balance.after)}.`
            : 'تم تحويل الطلب وتسجيله بلا خصم. الرصيد الافتتاحي يشمله مسبقاً.'
        );

        if (onConverted) onConverted();
        onClose();
      },
      onError: (error) => toast.error(errorText(error, 'فشل التحويل')),
    });
  };

  const { ref, titleId, onKeyDown } = useLeaveDialog<HTMLDivElement>({
    onClose,
    onSubmit: submit,
    busy: mutation.isPending,
  });

  return (
    <div className="hr-modal-overlay hrl-modal-overlay" onMouseDown={onClose}>
      <div
        className="hr-modal hrl-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={ref}
        onKeyDown={onKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="hr-modal__h">
          <h3 id={titleId}>تحويل طلب إداري إلى سجل الإجازات</h3>
          <button type="button" className="hr-icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="hr-modal__b">
          {!canManage ? (
            <div className="hrl-state hrl-state--locked">
              <Lock size={22} />
              <p className="hrl-state__t">التحويل محمي</p>
              <p className="hrl-state__d">
                تسجيل إجازة في سجل الإجازات يحتاج صلاحية «إدارة الإجازات» (hr.leave.manage). وهي
                تختلف عن صلاحية اعتماد «الطلبات الإدارية». اطلبها من مدير المكتب.
              </p>
            </div>
          ) : (
            <>
              {/* ═══ الطلبُ القديم كما ورد — بلا استنتاجِ نوعٍ من نصّه ═══ */}
              <section className="hrl-fset">
                <h4 className="hrl-fset__t">الطلب الإداري</h4>

                <dl className="hrl-kv">
                  <dt>الموظف</dt>
                  <dd>{employeeName || `موظف #${employeeId}`}</dd>

                  <dt>نوع الطلب كما ورد</dt>
                  <dd>{row.type_name || EMPTY_MARK}</dd>

                  <dt>المدى</dt>
                  <dd>{fmtLeaveRange(row.start_date, row.end_date)}</dd>

                  <dt>اعتمده</dt>
                  <dd>
                    {row.reviewed_by_name || EMPTY_MARK}
                    {row.reviewed_at ? ` · ${fmtLeaveDate(row.reviewed_at)}` : ''}
                  </dd>

                  {preview?.admin_request.reason && (
                    <>
                      <dt>السبب المكتوب</dt>
                      <dd>{preview.admin_request.reason}</dd>
                    </>
                  )}
                </dl>

                <p className="hrl-hint">
                  السبب نص حر كتبه الموظف، ولا يحدد منه نوع الإجازة. اقرأه واختر النوع بنفسك.
                </p>
              </section>

              {/* ═══ النوع — مُقترَحٌ لا مفروض ═══ */}
              <section className="hrl-fset">
                <h4 className="hrl-fset__t">النوع في سجل الإجازات</h4>

                <div className="hr-field">
                  <label htmlFor="hrl-convert-type">النوع *</label>
                  <select
                    id="hrl-convert-type"
                    value={effectiveTypeId ?? ''}
                    onChange={(event) => setTypeId(event.target.value ? Number(event.target.value) : null)}
                  >
                    {types.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                        {type.id === suggested?.id ? ' (مقترَح)' : ''}
                      </option>
                    ))}
                  </select>
                  <span className="hrl-hint">
                    المدة تحسب بقواعد هذا النوع (أيام عمل أو أيام تقويم) لا بفرق التاريخين.
                  </span>
                </div>
              </section>

              {/* ═══ الأثر — الرقمُ قبل الفعل ═══ */}
              <section className="hrl-fset">
                <h4 className="hrl-fset__t">الأثر على الرصيد</h4>

                {previewQuery.isPending && (
                  <div className="hrl-state hrl-state--loading" aria-busy="true">
                    <span className="hrl-skel hrl-skel--line" />
                    <span className="hrl-skel hrl-skel--line" />
                  </div>
                )}

                {previewQuery.isError && (
                  <div className="hrl-state hrl-state--error">
                    <AlertTriangle size={20} />
                    <p className="hrl-state__t">تعذرت المعاينة</p>
                    <p className="hrl-state__d">{errorText(previewQuery.error, 'انقطع الاتصال بالخادم.')}</p>
                    <button type="button" className="hr-btn hr-btn--sm" onClick={() => void previewQuery.refetch()}>
                      <RefreshCw size={13} /> إعادة المحاولة
                    </button>
                  </div>
                )}

                {preview && (
                  <>
                    <dl className="hrl-kv">
                      <dt>المدة المحسوبة (بقواعد النوع)</dt>
                      <dd>{fmtDays(preview.duration_days)} يوم</dd>

                      <dt>أيام التقويم في المدى</dt>
                      <dd>{preview.duration.calendar_days} يوم</dd>
                    </dl>
                    {/* لا يُذكر إلا ما استُثني فعلاً: «و٠ عطلةً رسميّة» صفرٌ يُقرأ ولا يعني شيئاً. */}
                    {preview.duration.excluded_weekend_days + preview.duration.excluded_holiday_days > 0 && (
                      <p className="hrl-hint">
                        الفرق أن هذا النوع يحسب بأيام العمل، وتم استثناء{' '}
                        {[
                          preview.duration.excluded_weekend_days > 0
                            ? `${preview.duration.excluded_weekend_days} من نهاية الأسبوع`
                            : null,
                          preview.duration.excluded_holiday_days > 0
                            ? `${preview.duration.excluded_holiday_days} من العطل الرسمية`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' و')}
                        {preview.duration.weekend_dates.length > 0
                          ? ` (${preview.duration.weekend_dates.join('، ')})`
                          : ''}
                        .
                      </p>
                    )}

                    {/* معنى الرقم الافتتاحيّ — ومعه صدقُ مصدره */}
                    <p className={`hrl-flag hrl-flag--${preview.opening.recorded ? 'info' : 'warn'}`}>
                      {preview.opening.recorded ? <Wallet size={13} /> : <AlertTriangle size={13} />}
                      <span>
                        <span className="hrl-flag__t">
                          الرصيد الافتتاحي لهذا الموظف: {OPENING_BASIS_LABELS[preview.opening.basis]}
                        </span>
                        <span className="hrl-flag__hint">
                          {preview.opening.recorded
                            ? `تم اختياره عند التهيئة${
                                preview.opening.opening_date ? ` بتاريخ ${fmtLeaveDate(preview.opening.opening_date)}` : ''
                              }، ويسري على كل تحويل لهذا الموظف.`
                            : 'تم تسجيل القيد الافتتاحي قبل وجود هذا الاختيار، فيظهر «المتبقي اليوم» لأن شاشة التهيئة كانت تطلب المتبقي. هذه القراءة مستنتَجة ولم تسجل صراحة.'}
                        </span>
                      </span>
                    </p>

                    {/* جملةُ الأثر — من الخادم، وهي نفسُها نصُّ الزرّ */}
                    <p className={`hrl-effect${preview.negative ? ' is-neg' : ''}`}>
                      <ArrowLeftRight size={14} />
                      <span>{preview.effect_sentence}</span>
                    </p>
                  </>
                )}
              </section>

              {/* ═══ الحواجزُ والتحذيرات ═══ */}
              {flags.length > 0 && (
                <div className="hrl-flags">
                  {flags.map((flag, index) => (
                    <p key={`${flag.code}-${index}`} className={`hrl-flag hrl-flag--${flag.tone}`}>
                      {flag.tone === 'block' ? (
                        <ShieldAlert size={13} />
                      ) : flag.tone === 'warn' ? (
                        <AlertTriangle size={13} />
                      ) : (
                        <Info size={13} />
                      )}
                      <span>
                        <span className="hrl-flag__t">{flag.message}</span>
                        {flag.hint && <span className="hrl-flag__hint">{flag.hint}</span>}
                      </span>
                    </p>
                  ))}
                </div>
              )}

              {/* الإقرارُ بالسالب — صندوقٌ صريحٌ لا خانةٌ مطويّة */}
              {preview?.negative && (
                <label className="hr-check hrl-ack">
                  <input
                    type="checkbox"
                    checked={acknowledge}
                    onChange={(event) => setAcknowledge(event.target.checked)}
                  />
                  أؤكد أن سجلي يبين أن الموظف أخذ أكثر من استحقاقه. سجل الرصيد سالباً.
                </label>
              )}
            </>
          )}
        </div>

        <div className="hr-modal__f">
          <button type="button" className="hr-btn" onClick={onClose}>
            إلغاء
          </button>
          {canManage && (
            <button
              type="button"
              className="hr-btn hr-btn--primary"
              onClick={submit}
              disabled={mutation.isPending || effectiveTypeId === null || blockingCount > 0 || !preview}
              title={preview?.effect_sentence ?? ''}
            >
              {mutation.isPending
                ? 'جارٍ التحويل…'
                : preview?.will_deduct
                  ? `حول واخصم ${fmtDays(preview.duration_days)} يوماً`
                  : 'حول وسجل بلا خصم'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConvertLegacyModal;
