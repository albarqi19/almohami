import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { AlertTriangle, CheckCircle2, Info, Paperclip, ShieldAlert, X } from 'lucide-react';
import { hrLeaveService } from '../../../services/hrLeaveService';
import { hrService } from '../../../services/hrService';
import { UserService } from '../../../services/UserService';
import { usePermission } from '../../../hooks/usePermission';
import { HALF_DAY_PERIOD_LABELS, PAY_TREATMENT_LABELS } from '../../../types/hr';
import type {
  HalfDayPeriod,
  HrLeaveType,
  LeavePreviewPayload,
  LeaveRecordPayload,
  LeaveRecordResult,
} from '../../../types/hr';
import {
  EMPTY_MARK,
  colorClass,
  excludedLabel,
  fmtDays,
  fmtLeaveDate,
  errorText,
  makeClientKey,
  orderedFlags,
  paySliceLabel,
  shiftISO,
  splitProposalOf,
  todayISO,
} from './leaveFormat';
import ArticleRef from './ArticleRef';
import { useLeavePreview } from './useLeavePreview';
import { useLeaveDialog } from './useLeaveDialog';

/**
 * **حجرُ الزاوية**: تسجيلُ واقعة غيابٍ أو إجازة.
 *
 * ترتيبُ الحقول مقصودٌ حرفياً — الهدفُ ثمّ المدى ثمّ النوع، ثمّ **حقلان يُملآن تلقائياً**
 * (الأثرُ على الأجر والأثرُ على الرصيد) ثمّ السببُ والمرفق. الأثران **لا يُدخَلان يدوياً
 * أبداً**: `pay_treatment` يُنتجه الخادمُ ولا يُقبل من العميل، والرصيدُ رقمٌ ماليّ لا يُخمَّن.
 *
 * **مفتاحُ التكرار** (C-19): `client_key` من ٣٢ حرفاً يُولَّد **مرّةً واحدةً لكلّ فتحةِ
 * مودال** ويبقى كما هو عند الفشل — فإعادةُ المحاولة لا تُنشئ صفّاً ثانياً. والخادمُ يشتقّ
 * منه المخزَّنَ بالموظف (`{key}:emp{id}`)، فنفسُ المفتاح على موظفٍ آخرَ يُنتج صفّاً ثانياً
 * لا «نجاحاً» كاذباً. ويُجدَّد بعد نجاحٍ في «حفظ وإضافة آخر».
 *
 * **الحواجزُ بلغةٍ ترشد**: نصُّ الخادم كما وصل، وتحته سطرُ «ما العمل» من `blockerHint`.
 * والحاجزُ يُعطّل الحفظ ويشرح قبل المحاولة — إلّا حين تكون المعاينةُ قديمةً أو متعثّرة،
 * فحينها **لا تُورَّث حواجزُ مدىً لم يعد مكتوباً** (C-32).
 *
 * **ما حُذف عمداً**: منتقي الأثر المالي اليدويّ · مربّعُ إشعار الموظف (لا حقلَ له في
 * التحقّق) · وزرُّ «سجّلها سجلّين» الذي يرفع الحاجز: علَما `split_on_window_edge` و
 * `reanchor_sick_window` **غيرُ مقبولَين في مسار الكتابة في هذه الدفعة**، فزرٌّ يرسلهما
 * يَعِد بفعلٍ لا وجودَ له. البديلُ فعلٌ حقيقيّ: زرٌّ يضبط النهايةَ على مقترح الخادم.
 */

interface PresetEmployee {
  profileId: number;
  name: string;
}

interface Props {
  /** موظفٌ معبَّأٌ سلفاً (من صفّ القائمة أو ملفّ الموظف). */
  employee?: PresetEmployee | null;
  defaultStart?: string;
  defaultEnd?: string;
  defaultTypeId?: number;
  canManage?: boolean;
  onClose: () => void;
  onSaved?: (result: LeaveRecordResult) => void;
}

/** الهدف: ملفٌّ قائم، أو منسوبٌ بلا ملفٍّ يُنشأ ملفُّه في نفس معاملة التسجيل. */
interface Target {
  kind: 'profile' | 'user';
  id: number;
  name: string;
}

const QUICK_SPANS: Array<{ label: string; days: number }> = [
  { label: 'يوم', days: 0 },
  { label: '٣ أيام', days: 2 },
  { label: 'أسبوع', days: 6 },
  { label: 'أسبوعان', days: 13 },
  { label: 'شهر', days: 29 },
];

/**
 * خليةُ نوعٍ واحدة — الاسمُ من `name` والمرجعُ من `legal_reference`، **بلا خريطةِ أسماءٍ
 * في الفرونت**: الأنواعُ بياناتُ مكتبٍ قابلةٌ لإعادة التسمية وللإضافة (`custom_{n}`)،
 * وخريطةٌ ثابتةٌ كانت ستُسمّي نوعَ المكتب باسمٍ ليس له.
 */
const TypeCell: React.FC<{ type: HrLeaveType; selected: boolean; onPick: (id: number) => void }> = ({
  type,
  selected,
  onPick,
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    className={`hrl-typecell ${colorClass(type.color_key)}${selected ? ' is-on' : ''}`}
    onClick={() => onPick(type.id)}
  >
    <span className="hrl-dot" aria-hidden="true" />
    <span>
      <span className="hrl-typecell__n">{type.name}</span>
      {type.legal_reference && (
        <span className="hrl-typecell__r">
          <ArticleRef value={type.legal_reference} />
        </span>
      )}
    </span>
  </button>
);

export const RecordLeaveModal: React.FC<Props> = ({
  employee = null,
  defaultStart,
  defaultEnd,
  defaultTypeId,
  canManage,
  onClose,
  onSaved,
}) => {
  const queryClient = useQueryClient();
  const fallbackManage = usePermission('hr.leave.manage');
  const mayManage = canManage ?? fallbackManage;
  const mayViewDocs = usePermission('hr.documents.view');

  // مفتاحُ التكرار — مرّةً واحدةً لكلّ فتحةِ مودال (C-19).
  const [clientKey, setClientKey] = useState<string>(() => makeClientKey());

  const [target, setTarget] = useState<Target | null>(
    employee ? { kind: 'profile', id: employee.profileId, name: employee.name } : null
  );
  const [picking, setPicking] = useState(employee === null);
  const [search, setSearch] = useState('');

  const [startDate, setStartDate] = useState(defaultStart ?? todayISO());
  const [endDate, setEndDate] = useState(defaultEnd ?? defaultStart ?? todayISO());
  const [halfDay, setHalfDay] = useState(false);
  const [halfPeriod, setHalfPeriod] = useState<HalfDayPeriod>('morning');

  const [typeId, setTypeId] = useState<number | null>(defaultTypeId ?? null);
  const [eventDate, setEventDate] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [documentId, setDocumentId] = useState<number | null>(null);

  // ───────────── الكتالوج: بادئةٌ مختلفةٌ عمداً فلا يُبطلها إبطالُ ['hr','leave'] ─────────────
  const typesQuery = useQuery({
    queryKey: ['hr', 'leave-catalog', 'types'],
    queryFn: () => hrLeaveService.getTypes({ is_active: true }),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const types = useMemo(
    () => (typesQuery.data ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
    [typesQuery.data]
  );
  const entitledTypes = types.filter((t) => t.category !== 'absence');
  const absenceTypes = types.filter((t) => t.category === 'absence');
  const selectedType = useMemo<HrLeaveType | null>(
    () => types.find((t) => t.id === typeId) ?? null,
    [types, typeId]
  );

  // ───────────── منتقي الهدف: مجموعتان ─────────────
  const profilesQuery = useQuery({
    queryKey: ['hr', 'leave', 'pick-profiles', search],
    queryFn: () => hrService.getEmployees({ search: search || undefined, per_page: 50 }),
    enabled: picking,
    staleTime: 60_000,
  });

  const usersQuery = useQuery({
    queryKey: ['hr', 'leave', 'pick-users'],
    queryFn: () => UserService.getAllUsers({ exclude_role: 'client', limit: 100 }),
    enabled: picking,
    staleTime: 5 * 60_000,
  });

  const profiles = useMemo(() => profilesQuery.data?.data ?? [], [profilesQuery.data]);
  const linkedUserIds = useMemo(() => new Set(profiles.map((p) => p.user_id)), [profiles]);

  const unlinkedUsers = useMemo(() => {
    const rows = usersQuery.data?.data ?? [];
    const term = search.trim();

    return rows
      .map((u) => ({ id: Number(u.id), name: u.name }))
      .filter((u) => Number.isFinite(u.id) && !linkedUserIds.has(u.id))
      .filter((u) => (term === '' ? true : u.name.includes(term)));
  }, [usersQuery.data, linkedUserIds, search]);

  // ───────────── المرفق: من مستندات الموظف القائمة، لا خزنةٌ ثانية ─────────────
  const needsAttachment = selectedType?.requires_attachment === true;
  const profileId = target?.kind === 'profile' ? target.id : null;

  const documentsQuery = useQuery({
    queryKey: ['hr', 'documents', profileId],
    queryFn: () => hrService.getDocuments(profileId as number),
    enabled: needsAttachment && mayViewDocs && profileId !== null,
    staleTime: 60_000,
  });

  // ───────────── المعاينة الحيّة ─────────────
  const previewInput = useMemo<LeavePreviewPayload | null>(() => {
    if (profileId === null || typeId === null) return null;

    return {
      employee_profile_id: profileId,
      leave_type_id: typeId,
      start_date: startDate,
      end_date: endDate,
      half_day: halfDay || undefined,
      half_day_period: halfDay ? halfPeriod : undefined,
      event_date: eventDate || undefined,
      employee_document_id: documentId ?? undefined,
    };
  }, [profileId, typeId, startDate, endDate, halfDay, halfPeriod, eventDate, documentId]);

  const preview = useLeavePreview(previewInput);

  const conflictsQuery = useQuery({
    queryKey: ['hr', 'leave', 'conflicts', profileId, startDate, endDate, typeId],
    queryFn: () =>
      hrLeaveService.getConflicts({
        employee_profile_id: profileId as number,
        start_date: startDate,
        end_date: endDate,
        leave_type_id: typeId ?? undefined,
      }),
    // يُنادى بإيقاع المعاينة نفسِه: لا نداءَ قبل أن تستقرّ المُدخلات (نفسُ الحدّ 60/1).
    enabled: profileId !== null && !preview.isStale && preview.data !== undefined,
    staleTime: 30_000,
    retry: 0,
  });

  // نصفُ اليوم لا يبقى مُعلَّماً على مدىً — والحاجزُ يشرح، لكنّ الإطفاء يمنع نداءً محكوماً.
  useEffect(() => {
    if (halfDay && startDate !== endDate) setHalfDay(false);
  }, [halfDay, startDate, endDate]);

  // النهايةُ لا تسبق البداية أبداً في الحقلين — تصحيحٌ صامتٌ لِما لا خلافَ فيه.
  useEffect(() => {
    if (endDate < startDate) setEndDate(startDate);
  }, [startDate, endDate]);

  const flags = orderedFlags(preview.blockers, preview.warnings);
  const hasBlockers = preview.blockers.length > 0;
  const conflicts = conflictsQuery.data;
  const conflictCount =
    (conflicts?.scheduled_sessions.length ?? 0) +
    (conflicts?.pending_tasks.length ?? 0) +
    (conflicts?.overlapping_leaves.length ?? 0);

  // ───────────── الحفظ — أوّلُ `useMutation` في وحدة HR ─────────────
  const payload = useMemo<LeaveRecordPayload | null>(() => {
    if (target === null || typeId === null) return null;

    return {
      client_key: clientKey,
      leave_type_id: typeId,
      start_date: startDate,
      end_date: endDate,
      half_day: halfDay || undefined,
      half_day_period: halfDay ? halfPeriod : undefined,
      event_date: eventDate || undefined,
      reason: reason.trim() || undefined,
      notes: notes.trim() || undefined,
      employee_document_id: documentId ?? undefined,
    };
  }, [target, typeId, clientKey, startDate, endDate, halfDay, halfPeriod, eventDate, reason, notes, documentId]);

  const mutation = useMutation({
    mutationFn: async (input: { body: LeaveRecordPayload; to: Target }): Promise<LeaveRecordResult> =>
      input.to.kind === 'profile'
        ? hrLeaveService.record(input.to.id, input.body)
        : hrLeaveService.recordForUser(input.to.id, input.body),
  });

  const submit = (keepOpen: boolean) => {
    if (!mayManage) {
      toast.error('تسجيلُ الوقائع يحتاج صلاحية «إدارة الإجازات».');
      return;
    }
    if (target === null) {
      toast.error('اختر المنسوب أولاً.');
      return;
    }
    if (typeId === null) {
      toast.error('اختر نوع الواقعة.');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('حدّد تاريخي البداية والنهاية.');
      return;
    }
    if (selectedType?.requires_reason && reason.trim() === '') {
      toast.error('السبب مطلوب لهذا النوع.');
      return;
    }
    if (selectedType?.requires_event_date && eventDate === '') {
      toast.error('تاريخ الواقعة مطلوب لهذا النوع.');
      return;
    }
    if (payload === null) return;

    mutation.mutate(
      { body: payload, to: target },
      {
        onSuccess: (result) => {
          const days = fmtDays(result.leave.duration_days);
          const before = result.balance.before;
          const after = result.balance.after;
          const balanceText =
            before !== null && after !== null ? ` · الرصيد ${fmtDays(before)} ← ${fmtDays(after)}` : '';
          const createdText = result.profile_created ? ' · وأُنشئ ملفُّ موارد بشرية' : '';

          toast.success(`سُجِّلت الواقعة — ${days} يوماً${balanceText}${createdText}`);
          (result.warnings ?? []).forEach((w) => toast.info(w.message));

          void queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] });
          void queryClient.invalidateQueries({ queryKey: ['hr', 'employee'] });
          if (onSaved) onSaved(result);

          if (keepOpen) {
            // مفتاحٌ جديدٌ لواقعةٍ جديدة؛ ويبقى النوعُ والمدّةُ ويُصفَّر الهدفُ والسبب.
            setClientKey(makeClientKey());
            setTarget(null);
            setPicking(true);
            setReason('');
            setNotes('');
            setDocumentId(null);
          } else {
            onClose();
          }
        },
        onError: (error) => {
          // المفتاحُ **لا يُجدَّد** هنا: إعادةُ المحاولة بنفسه لا تُنشئ صفّاً ثانياً.
          toast.error(errorText(error, 'فشل تسجيل الواقعة'));
        },
      }
    );
  };

  const { ref, titleId, onKeyDown } = useLeaveDialog<HTMLDivElement>({
    onClose,
    onSubmit: () => submit(false),
    busy: mutation.isPending,
  });

  const saveDisabled = mutation.isPending || target === null || typeId === null || hasBlockers;

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
          <h3 id={titleId}>تسجيل غياب أو إجازة</h3>
          <button type="button" className="hr-icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="hr-modal__b">
          {/* ═══ ١) الهدف ═══ */}
          <section className="hrl-fset">
            <h4 className="hrl-fset__t">المنسوب</h4>

            {target !== null && !picking ? (
              <p className="hrl-ident">
                <span>
                  {target.name}
                  {target.kind === 'user' ? ' — بلا ملفِّ موارد بشرية' : ''}
                </span>
                <button type="button" className="hrl-link" onClick={() => setPicking(true)}>
                  تغيير
                </button>
              </p>
            ) : (
              <div className="hrl-combo">
                <input
                  className="hrl-combo__search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث بالاسم…"
                  aria-label="بحث عن منسوب"
                />
                <div className="hrl-combo__list" role="listbox" aria-label="المنسوبون">
                  {profilesQuery.isPending || usersQuery.isPending ? (
                    <div className="hrl-state hrl-state--loading" aria-busy="true">
                      <span className="hrl-skel" />
                      <span className="hrl-skel" />
                      <span className="hrl-skel" />
                    </div>
                  ) : null}

                  {profiles.length > 0 && <p className="hrl-combo__group">لهم ملفُّ موارد بشرية</p>}
                  {profiles.map((row) => (
                    <button
                      key={`p-${row.id}`}
                      type="button"
                      role="option"
                      aria-selected={target?.kind === 'profile' && target.id === row.id}
                      className={`hrl-combo__opt${target?.kind === 'profile' && target.id === row.id ? ' is-on' : ''}`}
                      onClick={() => {
                        setTarget({ kind: 'profile', id: row.id, name: row.user?.name ?? `ملف #${row.id}` });
                        setPicking(false);
                      }}
                    >
                      <span>{row.user?.name ?? `ملف #${row.id}`}</span>
                      <span className="hrl-sub">{row.job_title || row.department || ''}</span>
                    </button>
                  ))}

                  {unlinkedUsers.length > 0 && <p className="hrl-combo__group">بلا ملفِّ موارد بشرية</p>}
                  {unlinkedUsers.map((row) => (
                    <button
                      key={`u-${row.id}`}
                      type="button"
                      role="option"
                      aria-selected={target?.kind === 'user' && target.id === row.id}
                      className={`hrl-combo__opt${target?.kind === 'user' && target.id === row.id ? ' is-on' : ''}`}
                      onClick={() => {
                        setTarget({ kind: 'user', id: row.id, name: row.name });
                        setPicking(false);
                      }}
                    >
                      <span>{row.name}</span>
                      <span className="hrl-sub">يُنشأ ملفُّه عند الحفظ</span>
                    </button>
                  ))}

                  {!profilesQuery.isPending &&
                    !usersQuery.isPending &&
                    profiles.length === 0 &&
                    unlinkedUsers.length === 0 && (
                      <div className="hrl-state hrl-state--empty">
                        <p className="hrl-state__t">لا نتيجة</p>
                        <p className="hrl-state__d">لا منسوبَ يطابق «{search}».</p>
                        <button type="button" className="hr-btn hr-btn--sm" onClick={() => setSearch('')}>
                          مسحُ البحث
                        </button>
                      </div>
                    )}
                </div>
              </div>
            )}

            {target?.kind === 'user' && (
              <p className="hrl-hint">
                سيُنشأ ملفُّ موارد بشرية لهذا المنسوب في نفس معاملة التسجيل — والاحتسابُ يظهر بعد الحفظ.
              </p>
            )}
          </section>

          {/* ═══ ٢) المدى ═══ */}
          <section className="hrl-fset">
            <h4 className="hrl-fset__t">المدى</h4>
            <div className="hr-field--row">
              <div className="hr-field">
                <label htmlFor="hrl-start">من *</label>
                <input
                  id="hrl-start"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className="hr-field">
                <label htmlFor="hrl-end">إلى *</label>
                <input
                  id="hrl-end"
                  type="date"
                  min={startDate}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </div>

            <div className="hrl-quickspan" role="group" aria-label="مدد سريعة">
              {QUICK_SPANS.map((span) => (
                <button
                  key={span.label}
                  type="button"
                  className="hrl-span"
                  onClick={() => setEndDate(shiftISO(startDate, span.days))}
                >
                  {span.label}
                </button>
              ))}
            </div>

            {selectedType?.allows_half_day && startDate === endDate && (
              <div className="hr-field--row">
                <label className="hr-check">
                  <input type="checkbox" checked={halfDay} onChange={(event) => setHalfDay(event.target.checked)} />
                  نصف يوم
                </label>
                {halfDay && (
                  <div className="hr-field">
                    <label htmlFor="hrl-half">الفترة</label>
                    <select
                      id="hrl-half"
                      value={halfPeriod}
                      onChange={(event) => setHalfPeriod(event.target.value as HalfDayPeriod)}
                    >
                      {Object.entries(HALF_DAY_PERIOD_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {startDate !== endDate && (
              <p className="hrl-hint">
                نصفُ اليوم يُسجَّل على يومٍ واحد — سجّل نصفَ اليوم الأول صفّاً، والأيامَ الكاملة صفّاً،
                ونصفَ اليوم الأخير صفّاً.
              </p>
            )}
          </section>

          {/* ═══ ٣) النوع ═══ */}
          <section className="hrl-fset">
            <h4 className="hrl-fset__t">النوع *</h4>

            {typesQuery.isPending && (
              <div className="hrl-state hrl-state--loading" aria-busy="true">
                <span className="hrl-skel" />
                <span className="hrl-skel" />
              </div>
            )}

            {typesQuery.isError && (
              <div className="hrl-state hrl-state--error">
                <AlertTriangle size={20} />
                <p className="hrl-state__t">تعذّر جلب أنواع الإجازات</p>
                <button type="button" className="hr-btn hr-btn--sm" onClick={() => void typesQuery.refetch()}>
                  إعادة المحاولة
                </button>
              </div>
            )}

            {entitledTypes.length > 0 && (
              <div className="hrl-typegrid" role="radiogroup" aria-label="نوع الواقعة">
                {entitledTypes.map((type) => (
                  <TypeCell key={type.id} type={type} selected={typeId === type.id} onPick={setTypeId} />
                ))}
              </div>
            )}

            {absenceTypes.length > 0 && (
              <div
                className="hrl-typegrid hrl-typegrid--absence"
                role="radiogroup"
                aria-label="وقائع تأديبية — لا إجازة"
              >
                {absenceTypes.map((type) => (
                  <TypeCell key={type.id} type={type} selected={typeId === type.id} onPick={setTypeId} />
                ))}
              </div>
            )}
          </section>

          {/* ═══ ٤) الأثر على الأجر — يُملأ تلقائياً من الخادم ═══ */}
          <section className="hrl-fset">
            <h4 className="hrl-fset__t">الأثر على الأجر</h4>
            {preview.data ? (
              <p className={`hrl-impact${preview.isStale ? ' hrl-impact--pending' : ''}`}>
                <span className="hrl-impact__c">
                  <span className="hrl-impact__k">المعاملة</span>
                  <span className="hrl-impact__v">
                    {PAY_TREATMENT_LABELS[preview.data.pay.treatment] ?? preview.data.pay.treatment}
                  </span>
                </span>
                <span className="hrl-impact__c">
                  <span className="hrl-impact__k">الشرائح</span>
                  <span className="hrl-impact__v">
                    {preview.data.pay.breakdown.length === 0
                      ? EMPTY_MARK
                      : preview.data.pay.breakdown.map((slice) => paySliceLabel(slice)).join(' · ')}
                  </span>
                </span>
              </p>
            ) : (
              <p className="hrl-hint">
                يُحسب من الخادم بعد اختيار المنسوب والنوع والمدى — ولا يُدخَل يدوياً.
              </p>
            )}
          </section>

          {/* ═══ ٥) الأثر على الرصيد — يُملأ تلقائياً من الخادم ═══ */}
          <section className="hrl-fset">
            <h4 className="hrl-fset__t">الأثر على الرصيد</h4>
            {preview.data ? (
              <p className={`hrl-impact${preview.isStale ? ' hrl-impact--pending' : ''}`}>
                <span className="hrl-impact__c">
                  <span className="hrl-impact__k">تقويمية</span>
                  <span className="hrl-impact__v" dir="ltr">{fmtDays(preview.data.duration.calendar_days)}</span>
                </span>
                <span className="hrl-impact__c">
                  <span className="hrl-impact__k">أيام عمل</span>
                  <span className="hrl-impact__v" dir="ltr">{fmtDays(preview.data.duration.working_days)}</span>
                </span>
                <span className="hrl-impact__c">
                  <span className="hrl-impact__k">المستثنى</span>
                  <span className="hrl-impact__v">{excludedLabel(preview.data.duration) || 'لا شيء'}</span>
                </span>
                <span className="hrl-impact__c">
                  <span className="hrl-impact__k">الرصيد</span>
                  <span className="hrl-impact__v" dir="ltr">
                    {preview.data.employee.is_initialized === false
                      ? 'غير مُهيّأ'
                      : preview.data.balance.before === null || preview.data.balance.after === null
                        ? EMPTY_MARK
                        : `${fmtDays(preview.data.balance.before)} ← ${fmtDays(preview.data.balance.after)}`}
                  </span>
                </span>
              </p>
            ) : (
              <p className="hrl-hint">
                {profileId === null
                  ? 'الاحتسابُ يظهر بعد اختيار منسوبٍ له ملفُّ موارد بشرية.'
                  : 'اختر النوعَ والمدى ليظهر الاحتساب.'}
              </p>
            )}

            {preview.notice && <p className="hrl-hint">{preview.notice} الحفظُ يبقى متاحاً — الخادمُ يعيد الاحتساب تحت القفل.</p>}
          </section>

          {/* ═══ ٦) السبب والمرفق ═══ */}
          <section className="hrl-fset">
            <h4 className="hrl-fset__t">السبب والمرفق</h4>

            {selectedType?.requires_event_date && (
              <div className="hr-field">
                <label htmlFor="hrl-event">تاريخ الواقعة *</label>
                <input
                  id="hrl-event"
                  type="date"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                />
                <span className="hrl-hint">يُحلّ النظامُ بنسخته يومَ الواقعة لا يومَ التسجيل.</span>
              </div>
            )}

            <div className="hr-field">
              <label htmlFor="hrl-reason">السبب {selectedType?.requires_reason ? '*' : ''}</label>
              <textarea
                id="hrl-reason"
                rows={2}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>

            {needsAttachment && mayViewDocs && (
              <div className="hr-field">
                <label htmlFor="hrl-doc"><Paperclip size={12} /> المرفق</label>
                <select
                  id="hrl-doc"
                  value={documentId ?? ''}
                  onChange={(event) => setDocumentId(event.target.value ? Number(event.target.value) : null)}
                  disabled={profileId === null}
                >
                  <option value="">بلا مرفق</option>
                  {(documentsQuery.data ?? []).map((doc) => (
                    <option key={doc.id} value={doc.id}>{doc.title || doc.file_name}</option>
                  ))}
                </select>
                <span className="hrl-hint">من مستندات الموظف القائمة — الخزنةُ نفسُها، لا خزنةٌ ثانية.</span>
              </div>
            )}

            <div className="hr-field">
              <label htmlFor="hrl-notes">ملاحظات</label>
              <textarea
                id="hrl-notes"
                rows={2}
                maxLength={5000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </section>

          {/* ═══ الحواجز والتحذيرات — نصُّ الخادم، وسطرُ «ما العمل» تحته ═══ */}
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
                    {flag.code === 'sick_window_edge' &&
                      splitProposalOf({ code: flag.code, message: flag.message, data: flag.data }).slice(0, 1).map((part) => (
                        <button
                          key={part.end}
                          type="button"
                          className="hrl-link"
                          onClick={() => {
                            setStartDate(part.start);
                            setEndDate(part.end);
                          }}
                        >
                          اضبط المدى على {fmtLeaveDate(part.start)} ← {fmtLeaveDate(part.end)}
                        </button>
                      ))}
                  </span>
                </p>
              ))}
            </div>
          )}

          {/* ═══ التعارض — والسلامةُ تُعلَن صراحةً ═══ */}
          {profileId !== null && conflicts && !preview.isStale && (
            <div className={`hrl-conflict${conflictCount === 0 ? ' hrl-conflict--none' : ''}`}>
              {conflictCount === 0 ? (
                <p>
                  <CheckCircle2 size={13} /> لا جلساتِ ولا مهامَّ ولا غياباتٍ متداخلةً في هذه المدة.
                </p>
              ) : (
                <>
                  {conflicts.scheduled_sessions.length > 0 && (
                    <details>
                      <summary>جلساتٌ مجدولة ({conflicts.scheduled_sessions.length})</summary>
                      <ul>
                        {conflicts.scheduled_sessions.map((session) => (
                          <li key={session.id}>
                            {session.case?.title || `قضية #${session.case_id ?? EMPTY_MARK}`} —{' '}
                            {session.session_date_gregorian || session.session_date || EMPTY_MARK}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {conflicts.pending_tasks.length > 0 && (
                    <details>
                      <summary>مهامُّ معلّقة ({conflicts.pending_tasks.length})</summary>
                      <ul>
                        {conflicts.pending_tasks.map((task) => (
                          <li key={task.id}>
                            {task.title} — {task.due_date ? fmtLeaveDate(task.due_date) : 'بلا موعد'}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {conflicts.overlapping_leaves.length > 0 && (
                    <details>
                      <summary>غائبون في نفس المدة ({conflicts.overlapping_leaves.length})</summary>
                      <ul>
                        {conflicts.overlapping_leaves.map((row) => (
                          <li key={`${row.source}-${row.id}`}>
                            {row.employee_name || EMPTY_MARK} — {row.type_name || EMPTY_MARK} ({row.status_arabic})
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══ المرجع النظاميّ — أرقامُه من الخادم لا من نصٍّ في JSX ═══ */}
          {preview.data?.statute && (
            <p className="hrl-legal">
              <Info size={13} />
              <span>
                <span className="hrl-legal__ref">
                  <ArticleRef value={preview.data.statute.article_ref} />
                </span>
                {preview.data.statute.effective_from
                  ? ` — النسخةُ السارية من ${fmtLeaveDate(preview.data.statute.effective_from)}`
                  : ''}
                {preview.data.statute.floor_applied ? ' · رُفع إلى الحدّ النظاميّ' : ''}
              </span>
            </p>
          )}
        </div>

        <div className="hr-modal__f">
          <button type="button" className="hr-btn" onClick={onClose}>إلغاء</button>
          <button type="button" className="hr-btn" onClick={() => submit(true)} disabled={saveDisabled}>
            حفظ وإضافة آخر
          </button>
          <button type="button" className="hr-btn hr-btn--primary" onClick={() => submit(false)} disabled={saveDisabled}>
            {mutation.isPending ? 'جارٍ الحفظ…' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordLeaveModal;
