import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { AlertTriangle, ArrowDownToLine, ArrowLeftRight, Lock, RefreshCw, X } from 'lucide-react';
import { hrLeaveService } from '../../../services/hrLeaveService';
import { usePermission } from '../../../hooks/usePermission';
import type { LeaveBulkOpeningResult, OpeningBasis, OpeningPreviewRow } from '../../../types/hr';
import {
  EMPTY_MARK,
  errorText,
  fmtCount,
  fmtLeaveDate,
  fmtLeaveRange,
  todayISO,
} from './leaveFormat';
import { useLeaveDialog } from './useLeaveDialog';

/**
 * التهيئةُ الافتتاحية — **الجوابُ العمليّ على «كيف تصير بطاقةُ الرصيد حقيقية»**.
 *
 * ══════ C-36: كاتبٌ واحدٌ للمرساة، وشاشةٌ لا تكذب ══════
 * `leave_accrual_start_date` تُكتب من **مسار الافتتاح وحدَه** وفي نفس معاملة قيد
 * `opening`. ولذلك **لا يُستدعى مسارُ تعديل الملفّ من هنا إطلاقاً**:
 * `PUT /hr/employees/{id}` يُسقط الحقلَ صامتاً (C-24)، فتظهر رسالةُ نجاحٍ ويبقى العمودُ
 * `NULL` — أي **صفرُ استحقاقٍ إلى الأبد** بلا خطأٍ ولا سطرِ سجلّ.
 *
 * وتبعاً لذلك:
 * · **لا `toast.success` متفائل**: النجاحُ يُعلَن حين `created > 0` لا حين ردَّ الخادمُ 200.
 * · **المُتخطّى يُسمّى بما هو**: صفٌّ له قيدُ افتتاحٍ سلفاً يُتخطّى — و**لا تُكتب مرساتُه**
 *   لأنّ الخادم يعود قبل خطوة المرساة. الشاشةُ تقول ذلك صراحةً بدل أن تعدّه نجاحاً.
 * · **الفشلُ يُعرض مفصَّلاً** صفّاً صفّاً باسم الموظف ورسالة الخادم.
 *
 * ══════ حارسٌ في التاريخ لا في الرسالة ══════
 * الباك يردّ `anchor_backdated` لأيّ مرساةٍ تسبق أوّلَ الشهر الجاري (الماضي يُدخَل رصيداً
 * افتتاحياً لا استحقاقاً مولَّداً). فحقلُ التاريخ هنا `min` عند أوّل الشهر الجاري، ولا
 * يُقترح `hire_date` قيمةً أوّليةً: اقتراحُ قيمةٍ محكومةٍ بالرفض شكلٌ من أشكال الكذب.
 *
 * ══════ 🔴 D-LGC: **معنى الرقم يُختار صراحةً، ونتيجتُه تُرى قبل الكتابة** ══════
 * كانت الشاشةُ تطلب «الرصيد الافتتاحيّ» ولا تقول للمدير أيَّ رقمٍ يكتب. ولموظفٍ استحقاقُه
 * ٢١ وأخذ ٥ قراءتان: **٢١** (الاستحقاق الكامل) أو **١٦** (المتبقّي اليوم) — والغموضُ وحدَه
 * هو الخطر، لا البيانات.
 *
 * فصار الاختيارُ **حقلاً صريحاً** (لا افتراضاً مخفياً)، ويُخزَّن **مع قيد الافتتاح نفسِه**
 * في الخادم لا في إعدادٍ عامّ: إعدادٌ يتغيّر لاحقاً يقلب معنى قيدٍ مكتوبٍ في دفترٍ لا يُعدَّل.
 *
 * ══════ 🔴 وإخبارٌ حيٌّ لا حساب — ولا رقمَ سالباً يفزع ══════
 * كان السطرُ تحت كلّ صفٍّ يقول «تكتب ٠ · وله طلبٌ سابقٌ واحد بمجموع ٤ أيام ⇒ **رصيدُه بعد
 * التحويل: ‎-4**». والعطلُ في الفرضية لا في الطرح: الرقمُ يفترض أنّ **كلَّ** طلبٍ إداريٍّ سابقٍ
 * إجازةٌ ستُحوَّل وتُخصم — بينما `request_types` قائمةٌ يكتبها كلُّ مكتبٍ لنفسه، وفي بيانات
 * المكتب نفسِه طلبُ **«عمل عن بُعد»** بين الصفوف. والنظامُ لا يعرف أيُّها إجازة.
 *
 * فصار السطرُ إخباراً: «وله ٣ طلباتٍ سابقة: تُحوّلها بعد التهيئة طلباً طلباً، وكلُّ تحويلٍ
 * يخصم حينَه» — ثمّ الصفوفُ **بأسمائها وتواريخها** فيرى المديرُ «عمل عن بُعد» بعينه ويميّز.
 * العدّادُ باقٍ (يذكّره أنّ أمامه عملاً)، والأثرُ المحسوبُ وحدَه ذهب — **من الحمولة كذلك**،
 * فلا رقمَ كاذبٌ يُخفى من الشاشة ويبقى في الـAPI.
 *
 * وثمنُ نموذج «الاستحقاق الكامل» يبقى معلَناً: سليمٌ بشرط أن يكون سجلُّ الماضي كاملاً، وتحويلُ
 * ٣ طلباتٍ من ٧ يترك الرصيدَ منتفخاً بأربعة — ولذلك تُعرَض الوقائعُ لا عددُها وحدَه.
 */

interface Props {
  /** حين يُفتح من لوح رصيد موظفٍ بعينه: يُقصَر الجدولُ عليه ابتداءً. */
  focusEmployeeId?: number | null;
  canManage?: boolean;
  onClose: () => void;
  onDone?: (result: LeaveBulkOpeningResult) => void;
}

interface RowDraft {
  include: boolean;
  days: string;
}

function firstOfCurrentMonthISO(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${m}-01`;
}

/** عتبةُ م.١٠٩: مَن بلغها استحقاقُه النظاميُّ أعلى — تُعلَّم ولا يُكتب رقمُها هنا. */
const SENIORITY_YEARS = 5;

/**
 * سنواتُ الخدمة من تاريخ المباشرة — **للتعليم لا للاحتساب**.
 *
 * 🔴 ولا يُشتقّ منها رقمٌ يُكتب في الحقل: الاستحقاقُ النظاميُّ بياناتٌ مؤرَّخةٌ في الباك
 * (`hr_leave_rules` بـ`effective_from`)، وتثبيتُ «٢١/٣٠» هنا يخلق مصدرَ حقيقةٍ ثانياً
 * يتعفّن يومَ يتغيّر النظامُ أو يخصّص المكتبُ استحقاقَه — والشاشةُ حينها تكذب بثقة.
 */
function yearsOfService(hireDate?: string | null): number | null {
  if (!hireDate) return null;
  const start = new Date(hireDate);
  if (Number.isNaN(start.getTime())) return null;
  return (Date.now() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

export const InitBalanceModal: React.FC<Props> = ({ focusEmployeeId = null, canManage, onClose, onDone }) => {
  const queryClient = useQueryClient();
  const fallbackManage = usePermission('hr.leave.manage');
  const mayManage = canManage ?? fallbackManage;

  const monthStart = firstOfCurrentMonthISO();

  const [typeId, setTypeId] = useState<number | null>(null);
  const [effectiveDate, setEffectiveDate] = useState(todayISO());
  const [anchor, setAnchor] = useState(monthStart);
  const [description, setDescription] = useState('');
  const [drafts, setDrafts] = useState<Record<number, RowDraft>>({});
  const [bulkDays, setBulkDays] = useState('');
  const [result, setResult] = useState<LeaveBulkOpeningResult | null>(null);
  /**
   * `full_entitlement` هو **المرشَّح** بأمر المالك: الدفترُ يصير تاريخاً كاملاً (استحقاقٌ
   * يدخل · إجازاتٌ تخرج · والرصيدُ نتيجةٌ لا رقمٌ سحريّ)، والمديرُ يكتب رقماً يعرفه من العقد
   * لا رقماً يحسبه في رأسه. وهو **معروضٌ لا مخفيّ**: الخياران ظاهران بأثرهما قبل الاختيار.
   */
  const [basis, setBasis] = useState<OpeningBasis>('full_entitlement');

  // الأنواعُ المُدفتَرة وحدَها: المرضيةُ وم.١١٣ وم.٨٠ بلا سلسلةِ قيودٍ أصلاً، فتهيئتُها
  // لا معنى لها — والخادمُ يردّها بـ`type_not_entitled`.
  const typesQuery = useQuery({
    queryKey: ['hr', 'leave-catalog', 'types'],
    queryFn: () => hrLeaveService.getTypes({ is_active: true }),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const entitledTypes = useMemo(
    () => (typesQuery.data ?? []).filter((t) => t.category === 'entitled').sort((a, b) => a.sort_order - b.sort_order),
    [typesQuery.data]
  );

  useEffect(() => {
    if (typeId === null && entitledTypes.length > 0) setTypeId(entitledTypes[0].id);
  }, [entitledTypes, typeId]);

  // القائمةُ بأرصدتها — نداءان مجمَّعان: مَن هُيّئ سلفاً يظهر موسوماً فلا يُهدَر صفّ.
  const rosterQuery = useQuery({
    queryKey: ['hr', 'leave', 'roster', 'init', typeId],
    // 🔴 `100` سقفُ الخادم لا رقمٌ مختار (`HrLeaveBalanceController`: `max:100`).
    // كان `200` فيردّ الخادمُ 422 وتُقفل النافذةُ على «تعذّر جلب المنسوبين».
    // والأهمُّ أنّ مرورَه كان سيكون أسوأ: مكتبٌ بمئتين يعرض مئةً ويُهيّئ «الكل» —
    // بترٌ صامتٌ في شاشةِ أرصدة. ولذلك يُعلَن الفائضُ صراحةً أدناه بدل أن يُبتَر.
    queryFn: () => hrLeaveService.getRoster({ per_page: 100, status: 'active' }, typeId ?? undefined),
    enabled: mayManage,
    staleTime: 60_000,
  });

  const rows = useMemo(() => {
    const all = rosterQuery.data?.page.data ?? [];
    return focusEmployeeId !== null ? all.filter((row) => row.id === focusEmployeeId) : all;
  }, [rosterQuery.data, focusEmployeeId]);

  /**
   * الفائضُ عن الصفحة الواحدة — **يُعلَن ولا يُبتَر**.
   *
   * «تهيئة الكل» في شاشةٍ تعرض مئةً من مئتين تعني مئةَ موظّفٍ بلا رصيدٍ افتتاحيّ،
   * ولا أحدَ يعلم: الشاشةُ تقول «تمّت التهيئة» صادقةً عمّا رأته، كاذبةً عمّا لم تره.
   */
  const totalRoster = rosterQuery.data?.page.total ?? 0;
  const notShown = focusEmployeeId !== null ? 0 : Math.max(0, totalRoster - rows.length);

  const draftOf = (id: number): RowDraft => drafts[id] ?? { include: focusEmployeeId !== null, days: '' };

  const setDraft = (id: number, patch: Partial<RowDraft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...draftOf(id), ...patch } }));

  const selected = rows.filter((row) => draftOf(row.id).include);

  /**
   * **التعبئةُ الجماعية** — رقمٌ واحدٌ يُكتب في كلّ صفٍّ محدَّد.
   *
   * مكتبٌ بأربعين منسوباً كان يعني أربعين حقلاً يُكتب فيها الرقمُ نفسُه، والمللُ في شاشةِ
   * أرصدةٍ خطر: يُسرِع المديرُ فيخطئ في صفٍّ لا يُلاحَظ.
   *
   * 🔴 وهي تكتب في الحقول ولا تتجاوزها: القيمةُ تصير مسوَّدةً عاديةً تُعدَّل صفّاً صفّاً بعدها،
   * وتمرّ على المعاينة الحيّة كأنّها كُتبت باليد. فالتعبئةُ اختصارُ كتابةٍ لا مسارٌ ثانٍ للحفظ —
   * ومسارٌ ثانٍ يعني قاعدتَي تحقّقٍ تفترقان يوماً.
   */
  const applyToSelected = () => {
    const value = bulkDays.trim();
    if (value === '' || selected.length === 0) return;
    setDrafts((prev) => {
      const next = { ...prev };
      selected.forEach((row) => {
        next[row.id] = { ...draftOf(row.id), days: value };
      });
      return next;
    });
  };

  /** المحدَّدون ممّن بلغوا عتبةَ الأقدميّة — عددٌ يُعلَن قبل التعبئة لا بعدها. */
  const seniorSelected = selected.filter((row) => {
    const years = yearsOfService(row.hire_date);
    return years !== null && years >= SENIORITY_YEARS;
  }).length;

  const nameOf = (profileId: number): string =>
    rows.find((row) => row.id === profileId)?.user?.name ?? `ملف #${profileId}`;

  /**
   * **المعاينةُ الحيّة** — تُستدعى للمحدَّدين وحدَهم وبأرقامهم المكتوبة الآن.
   *
   * `keyof` المفتاح يحمل الأساسَ والأرقام، فتغييرُ أيٍّ منهما يُعيد الحساب فوراً؛ ولا
   * `staleTime` لأن الرقمَ يتغيّر بالكتابة. والفشلُ يُرجع صفراً من الصفوف (الخدمةُ تبتلعه)
   * فلا تسقط الشاشةُ بسبب معاينة.
   */
  const previewKey = selected.map((row) => `${row.id}:${draftOf(row.id).days || '0'}`).join('|');

  const previewQuery = useQuery({
    queryKey: ['hr', 'leave', 'opening-preview', typeId, basis, previewKey],
    queryFn: () =>
      hrLeaveService.openingPreview({
        leave_type_id: typeId as number,
        opening_basis: basis,
        rows: selected.map((row) => ({
          employee_profile_id: row.id,
          days: Number(draftOf(row.id).days || '0'),
        })),
      }),
    enabled: mayManage && typeId !== null && selected.length > 0,
  });

  const previewByProfile = useMemo(() => {
    const map = new Map<number, OpeningPreviewRow>();
    (previewQuery.data ?? []).forEach((row) => map.set(row.employee_profile_id, row));
    return map;
  }, [previewQuery.data]);

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof hrLeaveService.bulkOpening>[0]) => hrLeaveService.bulkOpening(input),
  });

  const submit = () => {
    if (!mayManage) return;
    if (typeId === null) {
      toast.error('اختر نوع الرصيد أولاً.');
      return;
    }
    if (anchor === '') {
      toast.error('تاريخ بدء الاستحقاق مطلوب — بدونه لا يُولَّد استحقاقٌ إطلاقاً.');
      return;
    }
    if (anchor < monthStart) {
      toast.error('تاريخ بدء الاستحقاق لا يسبق أوّل الشهر الجاري.');
      return;
    }
    if (selected.length === 0) {
      toast.error('حدّد منسوباً واحداً على الأقل.');
      return;
    }

    mutation.mutate(
      {
        leave_type_id: typeId,
        effective_date: effectiveDate,
        description: description.trim() || undefined,
        opening_basis: basis,
        rows: selected.map((row) => ({
          employee_profile_id: row.id,
          days: Number(draftOf(row.id).days || '0'),
          accrual_start_date: anchor,
        })),
      },
      {
        onSuccess: (data) => {
          setResult(data);
          void queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] });
          void queryClient.invalidateQueries({ queryKey: ['hr', 'employee'] });

          // النجاحُ يُعلَن بما كُتب لا بما رُدَّ: صفرُ قيدٍ جديدٍ ⇒ صفرُ رسالةِ نجاح.
          if (data.created > 0) {
            toast.success(`هُيّئ رصيدُ ${fmtCount(data.created)} منسوباً — وبدأ استحقاقُهم من ${fmtLeaveDate(anchor)}.`);
          } else if (data.failed.length > 0) {
            toast.error('لم يُكتب أيُّ رصيدٍ افتتاحيّ — راجع التفصيل أدناه.');
          } else {
            toast.info('لم يُنشأ قيدٌ جديد — للمحدَّدين رصيدٌ افتتاحيٌّ مسجَّلٌ سلفاً.');
          }

          if (onDone) onDone(data);
        },
        onError: (error) => {
          toast.error(errorText(error, 'فشلت التهيئة الجماعية'));
        },
      }
    );
  };

  const { ref, titleId, onKeyDown } = useLeaveDialog<HTMLDivElement>({
    onClose,
    onSubmit: submit,
    busy: mutation.isPending,
  });

  return (
    <div className="hr-modal-overlay hrl-modal-overlay" onMouseDown={onClose}>
      <div
        className="hr-modal hrl-modal hrl-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={ref}
        onKeyDown={onKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="hr-modal__h">
          <h3 id={titleId}>تهيئة رصيد الإجازات</h3>
          <button type="button" className="hr-icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="hr-modal__b">
          {!mayManage ? (
            <div className="hrl-state hrl-state--locked">
              <Lock size={22} />
              <p className="hrl-state__t">التهيئة محميّة</p>
              <p className="hrl-state__d">
                كتابةُ الرصيد الافتتاحيّ وتاريخِ بدء الاستحقاق تحتاج صلاحية «إدارة الإجازات»
                (hr.leave.manage). اطلبها من مدير المكتب.
              </p>
            </div>
          ) : (
            <>
              <section className="hrl-fset">
                <h4 className="hrl-fset__t">الأساس</h4>

                <div className="hr-field--row">
                  <div className="hr-field">
                    <label htmlFor="hrl-init-type">النوع *</label>
                    <select
                      id="hrl-init-type"
                      value={typeId ?? ''}
                      onChange={(event) => setTypeId(event.target.value ? Number(event.target.value) : null)}
                    >
                      {entitledTypes.map((type) => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                    <span className="hrl-hint">
                      الأنواعُ المُدفتَرة وحدَها تظهر هنا — ما يُعدّ بالوقائع لا سلسلةَ قيودٍ له.
                    </span>
                  </div>

                  <div className="hr-field">
                    <label htmlFor="hrl-init-eff">تاريخ القيد *</label>
                    <input
                      id="hrl-init-eff"
                      type="date"
                      value={effectiveDate}
                      onChange={(event) => setEffectiveDate(event.target.value)}
                    />
                  </div>
                </div>

                <div className="hr-field">
                  <label htmlFor="hrl-init-anchor">تاريخ بدء الاستحقاق *</label>
                  <input
                    id="hrl-init-anchor"
                    type="date"
                    min={monthStart}
                    value={anchor}
                    onChange={(event) => setAnchor(event.target.value)}
                  />
                  <span className="hrl-hint">
                    قبل هذا التاريخ لا يُولَّد استحقاقٌ إطلاقاً. تاريخُ المباشرة وحدَه لا يبدأ الاحتساب،
                    ولا يسبق هذا التاريخُ أوّلَ الشهر الجاري — الماضي يُدخَل رصيداً افتتاحياً لا استحقاقاً مولَّداً.
                  </span>
                </div>

                {/* 🔴 معنى الرقم — اختيارٌ صريحٌ يُخزَّن مع القيد، لا افتراضٌ مخفيّ */}
                {/* 🔴 **بلا `hr-field`**: قاعدتُه `.hr-field input { width: 100% }` تمدّ زرَّ
                    الراديو على عرض النافذة فينهار السطرُ إلى عمودٍ رأسيٍّ لا يُقرأ (رُصد بلقطة).
                    `hrl-basis` مكتفيةٌ بذاتها: إطارُها وحشوُها ومقاسُ مربّعها فيها. */}
                <fieldset className="hrl-basis">
                  <legend>ماذا يعني الرقمُ الذي ستكتبه؟ *</legend>

                  <label className="hrl-basis__opt">
                    <input
                      type="radio"
                      name="hrl-init-basis"
                      checked={basis === 'full_entitlement'}
                      onChange={() => setBasis('full_entitlement')}
                    />
                    <span>
                      <strong>الاستحقاق الكامل</strong> — يُكتب كما هو الآن، والإجازاتُ السابقةُ في
                      «الطلبات الإدارية» <strong>تُخصم منه عند تحويل كلٍّ منها</strong> لا الآن.
                      <span className="hrl-hint">
                        يصير الدفترُ تاريخاً كاملاً: استحقاقٌ يدخل، وإجازاتٌ تخرج، والرصيدُ نتيجةٌ لا
                        رقمٌ سحريّ. وشرطُ سلامته أن يكون سجلُّ الماضي كاملاً — راجِع ما ينتظر التحويلَ أدناه.
                      </span>
                    </span>
                  </label>

                  <label className="hrl-basis__opt">
                    <input
                      type="radio"
                      name="hrl-init-basis"
                      checked={basis === 'remaining_today'}
                      onChange={() => setBasis('remaining_today')}
                    />
                    <span>
                      <strong>المتبقّي اليوم</strong> — والسابقةُ <strong>تُسجَّل ولا تُخصم</strong>{' '}
                      (مخصومةٌ سلفاً داخل الرقم).
                      <span className="hrl-hint">
                        اختره إن كان الرقمُ الذي بيدك هو ما تبقّى فعلاً بعد إجازاتِ هذا العام.
                      </span>
                    </span>
                  </label>

                  <span className="hrl-hint">
                    يُحفَظ هذا الاختيارُ مع قيد الرصيد نفسِه ويحكم كلَّ تحويلٍ لهؤلاء المنسوبين —
                    ولا يُغيَّر بعدها من إعدادٍ عامّ.
                  </span>
                </fieldset>

                <div className="hr-field">
                  <label htmlFor="hrl-init-desc">وصف القيد (اختياري)</label>
                  <input
                    id="hrl-init-desc"
                    value={description}
                    maxLength={255}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="مثال: ترحيل رصيد ٢٠٢٥"
                  />
                </div>
              </section>

              <section className="hrl-fset">
                <h4 className="hrl-fset__t">
                  المنسوبون — حُدِّد {fmtCount(selected.length)} من {fmtCount(rows.length)}
                </h4>

                {rosterQuery.isPending && (
                  <div className="hrl-state hrl-state--loading" aria-busy="true">
                    <span className="hrl-skel" />
                    <span className="hrl-skel" />
                    <span className="hrl-skel" />
                  </div>
                )}

                {rosterQuery.isError && (
                  <div className="hrl-state hrl-state--error">
                    <AlertTriangle size={20} />
                    <p className="hrl-state__t">تعذّر جلب المنسوبين</p>
                    <button type="button" className="hr-btn hr-btn--sm" onClick={() => void rosterQuery.refetch()}>
                      <RefreshCw size={13} /> إعادة المحاولة
                    </button>
                  </div>
                )}

                {!rosterQuery.isPending && !rosterQuery.isError && rows.length === 0 && (
                  <div className="hrl-state hrl-state--empty">
                    <p className="hrl-state__t">لا منسوبين على رأس العمل</p>
                    <p className="hrl-state__d">أضِف منسوبين من صفحة «الموارد البشرية» ثم عُد لتهيئة أرصدتهم.</p>
                  </div>
                )}

                {notShown > 0 && (
                  <p className="hrl-legal">
                    معروضٌ {rows.length} من {totalRoster} منسوباً — و{notShown} خارجَ هذه الصفحة
                    <strong> لن تُهيَّأ أرصدتُهم</strong>. ضيّق بالبحث ثمّ كرّر التهيئة لهم.
                  </p>
                )}

                {/* 🔴 التعبئةُ الجماعية — تظهر حين يكون التكرارُ حقيقياً (صفّان فأكثر).
                    ولصفٍّ واحدٍ لا معنى لها: زرٌّ يفعل ما يفعله الحقلُ المجاور تشويشٌ لا اختصار. */}
                {rows.length > 1 && (
                  <div className="hrl-fill">
                    <label className="hrl-fill__lbl" htmlFor="hrl-fill-days">
                      املأ المحدَّدين برقمٍ واحد
                    </label>
                    <input
                      id="hrl-fill-days"
                      className="hrl-numinput"
                      type="number"
                      step={0.5}
                      min={-999}
                      max={9999}
                      value={bulkDays}
                      onChange={(event) => setBulkDays(event.target.value)}
                      placeholder="21"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      className="hr-btn hr-btn--sm"
                      onClick={applyToSelected}
                      disabled={bulkDays.trim() === '' || selected.length === 0}
                    >
                      <ArrowDownToLine size={13} /> طبّق على {fmtCount(selected.length)}
                    </button>
                    <span className="hrl-hint hrl-fill__note">
                      {seniorSelected > 0 ? (
                        <>
                          يكتب الرقمَ في الحقول فتُعدّلها بعده صفّاً صفّاً. و
                          <strong>{fmtCount(seniorSelected)}</strong> من المحدَّدين أمضى خمسَ سنواتٍ
                          فأكثر — استحقاقُهم النظاميُّ أعلى، وهم معلَّمون في العمود.
                        </>
                      ) : (
                        'يكتب الرقمَ في الحقول فتُعدّلها بعده صفّاً صفّاً — اختصارُ كتابةٍ لا حفظٌ مباشر.'
                      )}
                    </span>
                  </div>
                )}

                {rows.length > 0 && (
                  <table className="hrl-inittable">
                    <thead>
                      <tr>
                        <th scope="col">
                          <label className="hr-check">
                            <input
                              type="checkbox"
                              checked={selected.length === rows.length && rows.length > 0}
                              onChange={(event) => {
                                const next: Record<number, RowDraft> = {};
                                rows.forEach((row) => {
                                  next[row.id] = { ...draftOf(row.id), include: event.target.checked };
                                });
                                setDrafts((prev) => ({ ...prev, ...next }));
                              }}
                            />
                            الكل
                          </label>
                        </th>
                        <th scope="col">المنسوب</th>
                        <th scope="col">الحالة</th>
                        <th scope="col">رصيد افتتاحيّ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const draft = draftOf(row.id);
                        const initialized = row.leave_balance?.is_initialized === true;
                        const rowAnchor = row.leave_balance?.accrual_anchor ?? null;
                        const rowPreview = previewByProfile.get(row.id);
                        const years = yearsOfService(row.hire_date);
                        const isSenior = years !== null && years >= SENIORITY_YEARS;

                        return (
                          <React.Fragment key={row.id}>
                          <tr>
                            <td>
                              <label className="hr-check">
                                <input
                                  type="checkbox"
                                  checked={draft.include}
                                  onChange={(event) => setDraft(row.id, { include: event.target.checked })}
                                  aria-label={`تضمين ${row.user?.name ?? row.id}`}
                                />
                              </label>
                            </td>
                            <td>
                              <span className="hrl-row__name">{row.user?.name ?? `ملف #${row.id}`}</span>
                              <span className="hrl-row__meta">{row.job_title || row.department || ''}</span>
                            </td>
                            <td>
                              {initialized ? (
                                <span className="hrl-sub">
                                  مُهيّأ{rowAnchor ? ` — المرساة ${fmtLeaveDate(rowAnchor)}` : ''} · سيُتخطّى
                                </span>
                              ) : (
                                <span className="hrl-sub">غير مُهيّأ</span>
                              )}
                            </td>
                            <td>
                              <input
                                className="hrl-numinput"
                                type="number"
                                step={0.5}
                                min={-999}
                                max={9999}
                                value={draft.days}
                                onChange={(event) => setDraft(row.id, { days: event.target.value })}
                                placeholder="0"
                                aria-label={`رصيد ${row.user?.name ?? row.id}`}
                                dir="ltr"
                              />
                              {/* علامةُ أقدميّة — تنبيهٌ لا رقم. تظهر بعد التعبئة الجماعية فتقول
                                  للمدير أيَّ الصفوفِ يراجع، ولا تكتب في الحقل شيئاً. */}
                              {isSenior && (
                                <span className="hrl-senior">٥ سنواتٍ فأكثر — راجِع استحقاقه</span>
                              )}
                            </td>
                          </tr>

                          {/* 🔴 إخبارٌ لا حساب — عدّادُ ما ينتظر التحويلَ ووقائعُه بأسمائها.
                              صفٌّ يعبر الأعمدةَ الأربعةَ كي يُقرأ جملةً واحدةً لا أرقاماً مبعثرة.
                              و`type_name` مقصودٌ في الصدارة: هو ما يميّز «إجازة سنوية» من
                              «عمل عن بُعد» في قائمةٍ يكتبها كلُّ مكتبٍ لنفسه. */}
                          {draft.include && rowPreview && (
                            <tr>
                              <td colSpan={4}>
                                <p className="hrl-effect">
                                  <ArrowLeftRight size={14} />
                                  <span>
                                    {rowPreview.sentence}
                                    {rowPreview.legacy.rows.map((item) => (
                                      <span className="hrl-hint" key={item.admin_request_id}>
                                        {item.type_name || EMPTY_MARK}
                                        {' — '}
                                        {fmtLeaveRange(item.start_date, item.end_date)}
                                      </span>
                                    ))}
                                  </span>
                                </p>
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                <p className="hrl-hint">
                  الفراغُ يعني قيداً بصفرِ يوم. ومعنى الرقم هو ما اخترتَه أعلاه — لا يُخمَّن هنا.
                </p>
              </section>

              {result !== null && (
                <section className="hrl-fset">
                  <h4 className="hrl-fset__t">النتيجة</h4>
                  <div className="hrl-result">
                    <p className="hrl-result__row is-ok">
                      <span>كُتب رصيدٌ افتتاحيٌّ وضُبطت المرساة</span>
                      <span className="hrl-result__n" dir="ltr">{fmtCount(result.created)}</span>
                    </p>
                    <p className="hrl-result__row is-skip">
                      <span>تُخطّي — لهم رصيدٌ افتتاحيٌّ سلفاً، ولم تُضبط مرساتُهم في هذا النداء</span>
                      <span className="hrl-result__n" dir="ltr">{fmtCount(result.skipped)}</span>
                    </p>
                    <p className="hrl-result__row is-fail">
                      <span>لم يُكتب لهم شيء</span>
                      <span className="hrl-result__n" dir="ltr">{fmtCount(result.failed.length)}</span>
                    </p>
                  </div>

                  {result.failed.length > 0 && (
                    <ul className="hrl-list">
                      {result.failed.map((row) => (
                        <li key={row.employee_profile_id} className="hrl-row">
                          <span className="hrl-row__main">
                            <span className="hrl-row__name">{nameOf(row.employee_profile_id)}</span>
                            <span className="hrl-row__meta">{row.message || row.code || EMPTY_MARK}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </>
          )}
        </div>

        <div className="hr-modal__f">
          <button type="button" className="hr-btn" onClick={onClose}>
            {result === null ? 'إلغاء' : 'إغلاق'}
          </button>
          {mayManage && (
            <button
              type="button"
              className="hr-btn hr-btn--primary"
              onClick={submit}
              disabled={mutation.isPending || typeId === null || selected.length === 0}
            >
              {mutation.isPending ? 'جارٍ الحفظ…' : `تهيئة ${fmtCount(selected.length)} منسوباً`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InitBalanceModal;
