import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Save, X, Loader2, Info } from 'lucide-react';
import Modal from '../Modal';
import MultiSelectDropdown from '../MultiSelectDropdown';
import { PRIORITY_LABELS, BILLING_TYPE_LABELS } from '../../types/legalServices';
import type {
  LegalService,
  CreateLegalServiceData,
  ServicePriority,
  BillingType,
} from '../../types/legalServices';
import { LegalServiceService } from '../../services/legalServiceService';
import { apiClient } from '../../utils/api';
import { getApiErrorMessage } from '../../utils/apiError';
import { isServiceContentLocked } from '../../utils/serviceContentLock';

interface EditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** الخدمة كما هي الآن — منها تُملأ القيم الابتدائية ومنها يُحسب الفرق عند الحفظ */
  service: LegalService;
  /**
   * تُنادى بعد نجاح الحفظ بخدمةٍ **مدموجة**: أعمدة الباك الطازجة فوق كائن `service` الوارد.
   *
   * السبب: `LegalServiceController::update` يردّ `$service->fresh()` — موديلاً عارياً بلا
   * أيّ علاقة (لا `client` ولا `assignees` ولا تفاصيل النوع). استبدالُ الخدمة به مباشرةً
   * يُفرِّغ تبويبات صفحة التفاصيل — وهي علّةٌ مؤكدة سبق أن عولجت في `updateStatus`
   * بمسار `loadFullService`. لذا نَدمج هنا ولا نُسلّم الأب كائناً ناقصاً.
   */
  onSaved: (updated: LegalService) => void;
}

interface UserOption {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

/**
 * حمولة التعديل: صورةٌ من `CreateLegalServiceData` تسمح بـ`null` في الحقول التي
 * صرّح الباك بأنها `sometimes|nullable` — الإنشاء لا يُفرِّغ حقلاً فلا `null` في نوعه،
 * أما التعديل فتفريغُ حقلٍ فيه نيّةٌ مشروعة (محو مبلغٍ أو تاريخ).
 */
type UpdateServicePayload = Omit<
  Partial<CreateLegalServiceData>,
  | 'assigned_lawyer_id'
  | 'agreed_amount'
  | 'hourly_rate'
  | 'vat_rate'
  | 'start_date'
  | 'due_date'
  | 'description'
  | 'notes'
  | 'internal_notes'
> & {
  assigned_lawyer_id?: number | null;
  agreed_amount?: number | null;
  hourly_rate?: number | null;
  vat_rate?: number | null;
  start_date?: string | null;
  due_date?: string | null;
  description?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
};

/** حالة النموذج كلّها نصوص — كي تُقارَن بالقيم الابتدائية مقارنةً واحدة بلا لبس أنواع */
interface EditFormState {
  title: string;
  priority: ServicePriority;
  billing_type: BillingType;
  agreed_amount: string;
  hourly_rate: string;
  vat_rate: string;
  start_date: string;
  due_date: string;
  description: string;
  notes: string;
  internal_notes: string;
  assigned_lawyer_id: number | null;
  assignee_ids: number[];
  /**
   * سؤال العميل — للاستشارات وحدها، ويُحفَظ بنداءٍ مستقلّ.
   * 🔴 `PUT /legal-services/{id}` لا يقبله ولا يمسّ `consultation_details`، وهذه
   *    النافذةُ لم تكن تحمله أصلاً — فما وُلد بلا سؤالٍ بقي بلا سؤالٍ أبداً.
   */
  client_question: string;
}

const MAX_TITLE_LENGTH = 255;

/**
 * `start_date`/`due_date` مصبوبان `date` في الموديل، فيصلان بصيغة
 * `2026-01-05T00:00:00.000000Z`. حقل `<input type="date">` لا يقبل إلا `YYYY-MM-DD`،
 * وبدون هذا القصّ يظهر التاريخ فارغاً فيُرسَل «تغييراً» وهمياً يمحو التاريخ القائم.
 */
const toDateInput = (raw: string | null | undefined): string => {
  if (!raw) return '';
  return raw.slice(0, 10);
};

/** «1500.00» → «1500» — بلا هذا التطبيع يُحسب كل رقمٍ متغيّراً في كل فتحة */
const toNumberInput = (raw: string | number | null | undefined): string => {
  if (raw === null || raw === undefined || raw === '') return '';
  const n = Number(raw);
  return Number.isFinite(n) ? String(n) : '';
};

/**
 * `null` = فُرّغ الحقل عمداً · `NaN` = مكتوبٌ لكن غير مقروء · رقم = صالح.
 *
 * التمييز بين الحالتين الأوليَين ليس ترفاً: خلطُهما يعني أن حرفاً شارداً أثناء تعديل
 * مبلغٍ متفقٍ عليه يُرسَل `null` فيمحو المبلغ **صامتاً**. ولذلك حقولُ الأرقام هنا
 * `type="text"` بـ`inputMode="decimal"` لا `type="number"`: الأخير يُعيد سلسلةً فارغة
 * لكل ما لا يفهمه المتصفّح، فيستحيل تمييز «فُرّغ» عن «فاسد» من أصله.
 */
const numOrNull = (raw: string): number | null | typeof NaN => {
  const t = raw.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

/** هل المدخل مكتوبٌ وغير مقروء؟ */
const isBadNumber = (raw: string): boolean => Number.isNaN(numOrNull(raw) as number);

const textOrNull = (raw: string): string | null => (raw.trim() === '' ? null : raw);

const buildInitialState = (service: LegalService): EditFormState => {
  const assignees = Array.isArray(service.assignees) ? service.assignees.map((a) => a.id) : [];
  const primary = service.assigned_lawyer_id ?? null;
  // إن لم تُحمَّل العلاقة (كائنٌ ناقص من قائمة مثلاً) نكتفي بالمسؤول وحده حتى لا نعرض قائمةً كاذبة
  const initialAssignees = assignees.length
    ? assignees
    : primary !== null
      ? [primary]
      : [];

  return {
    title: service.title ?? '',
    priority: (service.priority ?? 'medium') as ServicePriority,
    billing_type: (service.billing_type ?? 'flat_fee') as BillingType,
    agreed_amount: toNumberInput(service.agreed_amount),
    hourly_rate: toNumberInput(service.hourly_rate),
    vat_rate: toNumberInput(service.vat_rate),
    start_date: toDateInput(service.start_date),
    due_date: toDateInput(service.due_date),
    description: service.description ?? '',
    notes: service.notes ?? '',
    internal_notes: service.internal_notes ?? '',
    assigned_lawyer_id: primary,
    assignee_ids: initialAssignees,
    client_question: service.consultation_detail?.client_question ?? '',
  };
};

const sameIdSet = (a: number[], b: number[]): boolean =>
  a.length === b.length && [...a].sort((x, y) => x - y).join(',') === [...b].sort((x, y) => x - y).join(',');

// ─── Styles (متغيّرات النظام لا ألوان صريحة) ────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  border: '1px solid var(--color-border)',
  borderRadius: '4px',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: '13px',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-text-secondary)',
  fontWeight: 500,
};

const groupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '10px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '11.5px',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  letterSpacing: '0.2px',
  paddingBottom: '4px',
  borderBottom: '1px solid var(--color-border)',
};

const btnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '7px 14px',
  border: '1px solid var(--color-border)',
  borderRadius: '4px',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: '12.5px',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * 🔴 لا تُعطَّل هذه النافذة — ولا زرّ فتحها — بحالة الخدمة.
 *
 * قفل المحتوى غير قفل الخدمة: `SimpleServiceController` يقفل المهام والمراحل والتدوين
 * بـ`isContentLocked()` عند `closed`/`cancelled`/`archived` ويردّ 422، بينما
 * `LegalServiceController::update` — وهو ما تناديه هذه النافذة — بلا أيّ حارس قفل
 * ويعمل في كل الحالات. فتصحيحُ عنوانٍ أو مبلغٍ على خدمةٍ مغلقة عملٌ مشروع.
 *
 * إن «وُحّدت» أزرار التعطيل يوماً تحت `isLocked` واحد، فقد النظامُ قدرته على تصحيح
 * بيانات أي خدمةٍ منتهية — بلا رسالة خطأ تدلّ على السبب.
 */
const EditServiceModal: React.FC<EditServiceModalProps> = ({ isOpen, onClose, service, onSaved }) => {
  const [form, setForm] = useState<EditFormState>(() => buildInitialState(service));
  /** القيم كما فُتحت النافذة — مرجع المقارنة الذي تُبنى منه الحمولة الجزئية */
  const initialRef = useRef<EditFormState>(form);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [lawyers, setLawyers] = useState<UserOption[]>([]);
  const [lawyersLoading, setLawyersLoading] = useState(false);

  /**
   * إعادة التعبئة عند الفتح فقط — والمفاتيح بدائية عمداً (`id` و`updated_at`) لا كائن
   * `service` نفسه: هويّة الكائن تتغيّر مع كل إعادة رسمٍ للأب، فربطُ الأثر به يمسح ما
   * يكتبه المستخدم في منتصف الكتابة.
   */
  const serviceId = service.id;
  const serviceUpdatedAt = service.updated_at;
  useEffect(() => {
    if (!isOpen) return;
    const next = buildInitialState(service);
    setForm(next);
    initialRef.current = next;
    setError(null);
    setHint(null);
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, serviceId, serviceUpdatedAt]);

  // ── الموظفون المرشّحون للتكليف ──
  const fetchLawyers = useCallback(async () => {
    setLawyersLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: { data: UserOption[] } | UserOption[] }>(
        '/users?exclude_role=client&limit=100'
      );
      const raw = (res as unknown as { data?: unknown }).data;
      const list = Array.isArray(raw) ? raw : ((raw as { data?: UserOption[] })?.data ?? []);
      setLawyers(list as UserOption[]);
    } catch {
      setLawyers([]);
    } finally {
      setLawyersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchLawyers();
  }, [isOpen, fetchLawyers]);

  /**
   * خيارات القائمة = الموظفون المحمّلون + كل مكلّفٍ قائمٍ على الخدمة ولو لم يرد في
   * المئة الأولى. بدون هذا الدمج يختفي مكلّفٌ من الشاشة ثم يُمحى من الـpivot عند الحفظ.
   */
  const lawyerOptions = useMemo(() => {
    const map = new Map<number, string>();
    lawyers.forEach((l) => map.set(l.id, l.name));
    (service.assignees ?? []).forEach((a) => {
      if (!map.has(a.id)) map.set(a.id, a.name);
    });
    if (service.assigned_lawyer && !map.has(service.assigned_lawyer.id)) {
      map.set(service.assigned_lawyer.id, service.assigned_lawyer.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ value: String(id), label: name }));
  }, [lawyers, service.assignees, service.assigned_lawyer]);

  const userById = useCallback(
    (id: number): { id: number; name: string; email?: string; phone?: string } => {
      const fromList = lawyers.find((l) => l.id === id);
      if (fromList) return fromList;
      if (service.assigned_lawyer?.id === id) return service.assigned_lawyer;
      const fromAssignees = (service.assignees ?? []).find((a) => a.id === id);
      if (fromAssignees) return { id: fromAssignees.id, name: fromAssignees.name };
      return { id, name: '' };
    },
    [lawyers, service.assigned_lawyer, service.assignees]
  );

  const setField = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setHint(null);
  };

  // ── تعدّد المكلّفين: نفس منطق نافذة الإنشاء (أول اختيار = المسؤول، وترقية عضو) ──
  const toggleAssignee = (val: string) => {
    const id = Number(val);
    setError(null);
    setHint(null);
    setForm((prev) => {
      if (prev.assignee_ids.includes(id)) {
        const next = prev.assignee_ids.filter((x) => x !== id);
        return {
          ...prev,
          assignee_ids: next,
          assigned_lawyer_id:
            prev.assigned_lawyer_id === id ? (next.length ? next[0] : null) : prev.assigned_lawyer_id,
        };
      }
      return {
        ...prev,
        assignee_ids: [...prev.assignee_ids, id],
        assigned_lawyer_id: prev.assigned_lawyer_id ?? id,
      };
    });
  };

  const promoteAssignee = (val: string) => {
    setField('assigned_lawyer_id', Number(val));
  };

  /** الحمولة الجزئية: حقلٌ لا يتغيّر لا يُرسَل — الباك `sometimes` فإرسال الكل كتابةٌ بلا سبب */
  const buildPayload = (): UpdateServicePayload => {
    const initial = initialRef.current;
    const payload: UpdateServicePayload = {};

    if (form.title.trim() !== initial.title.trim()) payload.title = form.title.trim();
    if (form.priority !== initial.priority) payload.priority = form.priority;
    if (form.billing_type !== initial.billing_type) payload.billing_type = form.billing_type;
    // العمودان nullable في الجدول، فتفريغهما تصفيرٌ مشروع
    if (form.agreed_amount !== initial.agreed_amount) {
      payload.agreed_amount = numOrNull(form.agreed_amount) as number | null;
    }
    if (form.hourly_rate !== initial.hourly_rate) {
      payload.hourly_rate = numOrNull(form.hourly_rate) as number | null;
    }
    // 🔴 vat_rate عمود NOT NULL بقيمة افتراضية 15.00 — والباك يقبل null تحقيقاً ثم
    // يمرّره خاماً للقاعدة فيسقط الطلب كلّه بـ1048 ⇒ 500، ويضيع كل ما كُتب في النافذة
    // ولا يعرف المستخدم أيّ حقلٍ من أحد عشر أوقعه. فالفراغ هنا «بلا تغيير» لا «صفّر».
    if (form.vat_rate !== initial.vat_rate) {
      const vat = numOrNull(form.vat_rate);
      if (vat !== null && !Number.isNaN(vat)) payload.vat_rate = vat;
    }
    if (form.start_date !== initial.start_date) payload.start_date = textOrNull(form.start_date);
    if (form.due_date !== initial.due_date) payload.due_date = textOrNull(form.due_date);
    if (form.description !== initial.description) payload.description = textOrNull(form.description);
    if (form.notes !== initial.notes) payload.notes = textOrNull(form.notes);
    if (form.internal_notes !== initial.internal_notes) payload.internal_notes = textOrNull(form.internal_notes);

    const primaryChanged = form.assigned_lawyer_id !== initial.assigned_lawyer_id;
    const assigneesChanged = !sameIdSet(form.assignee_ids, initial.assignee_ids);
    if (primaryChanged) payload.assigned_lawyer_id = form.assigned_lawyer_id;

    /**
     * استثناء قاعدة «المتغيّر فقط»: `assignee_ids` تُرسَل **كاملة** لأن الباك يعيد بناء
     * الـpivot منها (`syncAssignees`). وتُرسَل أيضاً عند تغيّر المسؤول وحده، لأن علامة
     * `is_primary` في الـpivot لا تُحدَّث إلا داخل نفس النداء — فبدونها يتغيّر العمود
     * ويبقى الـpivot يشير إلى مسؤولٍ سابق.
     *
     * وشرط `Array.isArray(service.assignees)`: إن لم تُحمَّل العلاقة أصلاً فقائمتنا مبنيّة
     * على المسؤول وحده، وإرسالها حينئذٍ يمحو مكلّفين لم نرَهم قط. في هذه الحالة نغيّر
     * العمود فقط ولا نلمس الـpivot.
     */
    const assigneesKnown = Array.isArray(service.assignees);
    if (assigneesChanged || (primaryChanged && assigneesKnown)) {
      payload.assignee_ids = form.assignee_ids;
    }

    return payload;
  };

  const validate = (): string | null => {
    if (!form.title.trim()) return 'عنوان الخدمة مطلوب';
    if (form.title.trim().length > MAX_TITLE_LENGTH) return `العنوان طويل جداً — الحد ${MAX_TITLE_LENGTH} حرفاً`;

    // مدخلٌ مكتوبٌ وغير مقروء يُرفض صراحةً بدل أن يُفهَم «امحُ الحقل»
    if (isBadNumber(form.agreed_amount)) return 'المبلغ المتفق عليه ليس رقماً صالحاً';
    if (isBadNumber(form.hourly_rate)) return 'سعر الساعة ليس رقماً صالحاً';
    if (isBadNumber(form.vat_rate)) return 'نسبة الضريبة ليست رقماً صالحاً';

    const amount = numOrNull(form.agreed_amount);
    if (amount !== null && amount < 0) return 'المبلغ المتفق عليه لا يكون سالباً';
    const rate = numOrNull(form.hourly_rate);
    if (rate !== null && rate < 0) return 'سعر الساعة لا يكون سالباً';
    const vat = numOrNull(form.vat_rate);
    if (vat !== null && (vat < 0 || vat > 100)) return 'نسبة الضريبة بين 0 و100';
    // العمود NOT NULL: التفريغ لا يُرسَل، فنقولها بدل أن نتجاهلها صامتين
    if (initialRef.current.vat_rate !== '' && form.vat_rate.trim() === '') {
      return 'نسبة الضريبة لا تُترك فارغة — اكتب 0 إن كانت الخدمة معفاة';
    }

    // 🔴 خدمةٌ بلا مكلّف واحد تصير غير مرئية لكل محامٍ ليس منشئها، و`EnsureLegalServiceAccess`
    // يردّ 403 حتى لمن ضغط «حفظ» للتوّ — فتموت الصفحة تحت يده ولا تُستعاد إلا بيد مدير.
    if (form.assignee_ids.length === 0) {
      return 'لا بدّ من مكلّفٍ واحد على الأقل — خدمةٌ بلا مكلّف تختفي عن قوائم المحامين';
    }

    if (form.start_date && form.due_date && form.due_date < form.start_date) {
      return 'تاريخ الاستحقاق قبل تاريخ البدء';
    }
    return null;
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSave = async () => {
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }

    const payload = buildPayload();

    /**
     * سؤال العميل مسارُه مستقلّ: `PUT /legal-services/{id}` لا يقبله ولا يمسّ
     * `consultation_details`. فيُقارَن بحاله ويُرسَل وحده عند تغيّره — ولا يُحسب
     * ضمن `payload` وإلا ردّ الباك 422 عن حقلٍ لا يعرفه.
     */
    const questionChanged =
      service.service_type === 'consultation'
      && !isServiceContentLocked(service)
      && form.client_question.trim() !== initialRef.current.client_question.trim();

    if (Object.keys(payload).length === 0 && !questionChanged) {
      // لا نُرسل نداءً فارغاً: الباك يسجّل نشاط «تم تحديث بيانات الخدمة» في كل نداء،
      // فحفظٌ بلا تغيير يترك أثراً كاذباً في سجلّ الخدمة.
      setHint('لم تُعدّل أي حقل بعد.');
      return;
    }

    setError(null);
    setHint(null);
    setSubmitting(true);
    try {
      // السؤالُ أولاً: لو سقط هذا النداءُ بعد نجاح تحديث الخدمة لأُغلقت النافذةُ
      // على تغييرٍ نصفِ محفوظ، ولظنّ المستخدمُ أن السؤالَ حُفظ وهو لم يُحفظ.
      if (questionChanged) {
        const qRes = await LegalServiceService.updateConsultationDetails(service.id, {
          client_question: form.client_question.trim() || null,
        });
        if (!qRes?.success) {
          setError('تعذّر حفظ سؤال العميل');
          return;
        }
      }

      if (Object.keys(payload).length === 0) {
        // السؤالُ وحده تغيّر — لا نداءَ ثانياً ولا نشاطَ «تم تحديث بيانات الخدمة»
        onSaved({
          ...service,
          consultation_detail: {
            ...(service.consultation_detail ?? ({} as NonNullable<LegalService['consultation_detail']>)),
            client_question: form.client_question.trim() || null,
          },
        });
        onClose();
        return;
      }

      const res = await LegalServiceService.updateService(
        service.id,
        // الباك يقبل `null` في هذه الحقول (`sometimes|nullable`)، ونوع الإنشاء لا يعرف
        // `null` لأنه لا يُفرِّغ شيئاً — فالتحويل هنا مقصود لا التفاف على نوعٍ خاطئ.
        payload as Partial<CreateLegalServiceData>
      );

      if (!res?.success || !res.data) {
        setError(res?.message || 'تعذّر حفظ بيانات الخدمة');
        return;
      }

      // دمجٌ لا استبدال — انظر تعليق `onSaved` أعلى الملف
      const merged: LegalService = { ...service, ...res.data };
      // ردُّ تحديث الخدمة لا يحمل تفاصيل الاستشارة، فنُثبّت السؤالَ المحفوظ بأنفسنا
      // وإلا عادت البطاقةُ تعرض القيمةَ القديمة حتى إعادة التحميل.
      if (questionChanged) {
        merged.consultation_detail = {
          ...(res.data.consultation_detail ?? service.consultation_detail ?? ({} as NonNullable<LegalService['consultation_detail']>)),
          client_question: form.client_question.trim() || null,
        };
      }
      if (payload.assigned_lawyer_id !== undefined) {
        merged.assigned_lawyer = form.assigned_lawyer_id ? userById(form.assigned_lawyer_id) : undefined;
      }
      if (payload.assignee_ids !== undefined) {
        merged.assignees = form.assignee_ids.map((id) => {
          const u = userById(id);
          return { id: u.id, name: u.name, pivot: { is_primary: id === form.assigned_lawyer_id } };
        });
      }

      onSaved(merged);
      onClose();
    } catch (err) {
      // رسائل الباك عربية فصحى — تُعرض كما هي، والنافذة تبقى مفتوحة بما كتبه المستخدم
      setError(getApiErrorMessage(err, 'تعذّر حفظ بيانات الخدمة'));
    } finally {
      setSubmitting(false);
    }
  };

  const billingType = form.billing_type;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="تعديل بيانات الخدمة" size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          {service.service_number}
        </div>

        {/*
          لافتة «ما لا يُعدَّل هنا» — ليست زينة: الحالة لها مسار انتقالات مستقلّ
          (`PATCH /status`)، ونوع الخدمة والعميل لا يقبلهما `update` أصلاً. بدون هذه
          السطر يبحث المستخدم عنها في النموذج ثم يظنّ النظام ناقصاً.
        */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '7px',
            padding: '8px 10px',
            background: 'var(--color-surface-subtle)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.7,
          }}
        >
          <Info size={13} style={{ flexShrink: 0, marginTop: '3px' }} />
          <span>
            لا تُعدَّل من هنا: <strong style={{ color: 'var(--color-text)' }}>حالة الخدمة</strong> (تُغيَّر من زر
            الحالة لأن لها مسار انتقالات)، و<strong style={{ color: 'var(--color-text)' }}>نوع الخدمة</strong>،
            و<strong style={{ color: 'var(--color-text)' }}>العميل</strong> — وكلاهما يُحدَّد عند الإنشاء.
          </span>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: '8px 12px',
              background: 'color-mix(in srgb, var(--color-error) 12%, transparent)',
              color: 'var(--color-error)',
              borderRadius: '4px',
              fontSize: '12.5px',
            }}
          >
            {error}
          </div>
        )}

        {hint && (
          <div
            style={{
              padding: '8px 12px',
              background: 'var(--color-surface-subtle)',
              color: 'var(--color-text-secondary)',
              borderRadius: '4px',
              fontSize: '12.5px',
            }}
          >
            {hint}
          </div>
        )}

        {/* ── الأساسيات ── */}
        <div style={sectionTitleStyle}>الأساسيات</div>

        <div style={groupStyle}>
          <label style={labelStyle} htmlFor="edit-service-title">عنوان الخدمة</label>
          <input
            id="edit-service-title"
            type="text"
            maxLength={MAX_TITLE_LENGTH}
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="عنوان الخدمة..."
            style={inputStyle}
          />
        </div>

        <div style={gridStyle}>
          <div style={groupStyle}>
            <label style={labelStyle} htmlFor="edit-service-priority">الأولوية</label>
            <select
              id="edit-service-priority"
              value={form.priority}
              onChange={(e) => setField('priority', e.target.value as ServicePriority)}
              style={inputStyle}
            >
              {(Object.entries(PRIORITY_LABELS) as [ServicePriority, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div style={groupStyle}>
            <label style={labelStyle} htmlFor="edit-service-billing">نوع الفوترة</label>
            <select
              id="edit-service-billing"
              value={form.billing_type}
              onChange={(e) => setField('billing_type', e.target.value as BillingType)}
              style={inputStyle}
            >
              {(Object.entries(BILLING_TYPE_LABELS) as [BillingType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={groupStyle}>
          <label style={labelStyle}>الموظفون المكلّفون</label>
          <MultiSelectDropdown
            options={lawyerOptions}
            selected={form.assignee_ids.map(String)}
            responsible={form.assigned_lawyer_id !== null ? String(form.assigned_lawyer_id) : undefined}
            onToggle={toggleAssignee}
            onPromote={promoteAssignee}
            placeholder={lawyersLoading ? 'جارٍ التحميل...' : 'اختر الموظفين...'}
            emptyText={lawyersLoading ? 'جارٍ التحميل...' : 'لا يوجد موظفون'}
          />
          <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
            صاحب النجمة هو المسؤول الأساسي — رقّ غيره بالنجمة لتبديله.
          </span>
        </div>

        <div style={gridStyle}>
          <div style={groupStyle}>
            <label style={labelStyle} htmlFor="edit-service-start">تاريخ البدء</label>
            <input
              id="edit-service-start"
              type="date"
              value={form.start_date}
              onChange={(e) => setField('start_date', e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={groupStyle}>
            <label style={labelStyle} htmlFor="edit-service-due">تاريخ الاستحقاق</label>
            <input
              id="edit-service-due"
              type="date"
              value={form.due_date}
              onChange={(e) => setField('due_date', e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* ── المالية ── */}
        <div style={sectionTitleStyle}>المالية</div>

        <div style={{ ...gridStyle, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <div style={groupStyle}>
            <label style={labelStyle} htmlFor="edit-service-amount">المبلغ المتفق عليه (ر.س)</label>
            <input
              id="edit-service-amount"
              type="text"
              inputMode="decimal"
              value={form.agreed_amount}
              onChange={(e) => setField('agreed_amount', e.target.value)}
              placeholder="0.00"
              style={inputStyle}
            />
          </div>

          <div style={groupStyle}>
            <label style={labelStyle} htmlFor="edit-service-hourly">سعر الساعة (ر.س)</label>
            <input
              id="edit-service-hourly"
              type="text"
              inputMode="decimal"
              value={form.hourly_rate}
              onChange={(e) => setField('hourly_rate', e.target.value)}
              placeholder="0.00"
              style={inputStyle}
            />
          </div>

          <div style={groupStyle}>
            <label style={labelStyle} htmlFor="edit-service-vat">نسبة الضريبة (%)</label>
            <input
              id="edit-service-vat"
              type="text"
              inputMode="decimal"
              value={form.vat_rate}
              onChange={(e) => setField('vat_rate', e.target.value)}
              placeholder="15"
              style={inputStyle}
            />
          </div>
        </div>

        {/*
          الحقلان يبقيان ظاهرين مهما كان نوع الفوترة (لا إخفاء كما في نافذة الإنشاء):
          التعديل يقع على خدمةٍ قائمة قد تحمل قيمةً قديمة في الحقل غير الموافق للنوع،
          وإخفاؤه يمنع المستخدم من محوها ويخفي عنه رقماً محفوظاً فعلاً.
        */}
        <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', marginTop: '-6px' }}>
          {billingType === 'hourly'
            ? 'الفوترة بالساعة — المعتمَد هو سعر الساعة.'
            : billingType === 'retainer'
              ? 'الفوترة اشتراك — المعتمَد هو المبلغ المتفق عليه لكل دورة.'
              : 'المعتمَد هو المبلغ المتفق عليه.'}
        </span>

        {/* ── سؤال العميل — للاستشارة غير المقفلة وحدها ──
            يُحفظ بنداءٍ مستقلّ (`consultation/details`) لأن مسارَ تحديث الخدمة لا
            يقبله ولا يمسّ `consultation_details`. ويُخفى عند القفل بدل أن يُردّ
            422 بعد النقر — الزرُّ يعرف شرطَه قبل الضغط. */}
        {service.service_type === 'consultation' && !isServiceContentLocked(service) && (
          <>
            <div style={sectionTitleStyle}>الاستشارة</div>
            <div style={groupStyle}>
              <label style={labelStyle} htmlFor="edit-service-client-question">
                سؤال العميل
              </label>
              <textarea
                id="edit-service-client-question"
                rows={3}
                value={form.client_question}
                onChange={(e) => setField('client_question', e.target.value)}
                maxLength={10000}
                placeholder="ما الذي يسأل عنه العميل تحديداً؟ عليه تُبنى مسودة الرأي."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </>
        )}

        {/* ── الوصف والملاحظات ── */}
        <div style={sectionTitleStyle}>الوصف والملاحظات</div>

        <div style={groupStyle}>
          <label style={labelStyle} htmlFor="edit-service-description">الوصف</label>
          <textarea
            id="edit-service-description"
            rows={3}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="وصف مختصر للخدمة..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div style={groupStyle}>
          <label style={labelStyle} htmlFor="edit-service-notes">الملاحظات</label>
          <textarea
            id="edit-service-notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder="ملاحظات عامة..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div style={groupStyle}>
          <label style={labelStyle} htmlFor="edit-service-internal">ملاحظات داخلية</label>
          <textarea
            id="edit-service-internal"
            rows={2}
            value={form.internal_notes}
            onChange={(e) => setField('internal_notes', e.target.value)}
            placeholder="ملاحظات للفريق الداخلي (لا تظهر للعميل)..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            style={{ ...btnStyle, opacity: submitting ? 0.5 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
          >
            <X size={14} /> إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            style={{
              ...btnStyle,
              background: 'var(--color-primary)',
              borderColor: 'var(--color-primary)',
              color: '#fff',
              opacity: submitting ? 0.5 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            {submitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EditServiceModal;
