import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, Search, Settings2, Tag, Users } from 'lucide-react';
import Modal from '../erp/Modal';
import DualDateInput from '../common/DualDateInput';
import ExternalGuestsEditor from './ExternalGuestsEditor';
import LinkTargetPicker from './LinkTargetPicker';
import {
  internalMeetingService,
  type AttendeeInput,
  type CreateInternalMeetingData,
  type InternalMeeting,
  type LinkTargetType,
  type MeetingCategory,
  type UpdateInternalMeetingData,
} from '../../services/meetingService';
import meetingCategoryService from '../../services/meetingCategoryService';
import { apiClient } from '../../utils/api';

interface Props {
  meeting?: InternalMeeting | null;
  onClose: () => void;
  onSuccess: () => void;
  onManageCategories?: () => void;
  /** «YYYY-MM-DD» — تعبئة مسبقة من خلية التقويم المنقورة */
  initialDate?: string;
  /** «HH:mm» — تعبئة مسبقة من الوقت المختار في قائمة الإنشاء السريع */
  initialTime?: string;
}

interface UserOption {
  id: number;
  name: string;
  /** قابل للفراغ فعلاً — موظفون كثيرون بلا بريد. النوع غير القابل للفراغ
   *  هو ما أخفى انهيار البحث عن TypeScript. */
  email: string | null;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'مدير', owner: 'مالك', partner: 'شريك', lawyer: 'محامي',
  senior_lawyer: 'محامٍ أول', legal_assistant: 'مساعد قانوني',
  accountant: 'محاسب', secretary: 'سكرتير', client: 'عميل',
};

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];

/**
 * إنشاء/تعديل اجتماع.
 *
 * أُعيدت كتابته على components/erp/Modal + fin-* بدل نسخة notion-* المنشقّة
 * التي كانت تحمل 460 سطر <style> مضمّن يصارع add-appointment-modal.css.
 * السبب ليس تجميلياً: كانت ستُضاف خمس كتل حقول جديدة (تصنيف، حضور بثلاثة
 * أنواع، ربط، تاريخ مزدوج) فوق ستايل منشقّ أصلاً.
 */
const CreateInternalMeetingModal: React.FC<Props> = ({
  meeting, onClose, onSuccess, onManageCategories, initialDate, initialTime,
}) => {
  const isEditing = Boolean(meeting);

  const [title, setTitle] = useState(meeting?.title || '');
  const [agenda, setAgenda] = useState(meeting?.agenda || '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(meeting?.duration_minutes || 60);
  const [location, setLocation] = useState(meeting?.location || '');
  const [videoUrl, setVideoUrl] = useState(meeting?.video_meeting_url || '');
  const [meetingType, setMeetingType] = useState<'physical' | 'remote'>(
    meeting?.video_meeting_url ? 'remote' : 'physical'
  );

  const [categoryId, setCategoryId] = useState<number | null>(meeting?.meeting_category_id ?? null);
  const [categories, setCategories] = useState<MeetingCategory[]>([]);

  // الحضور بثلاثة أنواع: موظفون وعملاء (بحسابات) وخارجيون (بلقطات)
  const [staffIds, setStaffIds] = useState<number[]>(
    meeting?.attendees?.filter((a) => a.attendee_type === 'user' && a.user_id).map((a) => a.user_id as number)
      ?? meeting?.participants?.map((p) => p.user_id).filter((id): id is number => Boolean(id))
      ?? []
  );
  const [clientIds, setClientIds] = useState<number[]>(
    meeting?.attendees?.filter((a) => a.attendee_type === 'client' && a.user_id).map((a) => a.user_id as number) ?? []
  );
  const [guests, setGuests] = useState<AttendeeInput[]>(
    meeting?.attendees?.filter((a) => a.attendee_type === 'external').map((a) => ({
      type: 'external' as const,
      name: a.display_name ?? '',
      email: a.email ?? '',
      phone: a.phone ?? '',
      notify_opted_in: false,
    })) ?? []
  );

  const [link, setLink] = useState<{ type: LinkTargetType | null; id: number | null }>({
    type: meeting?.linked_type ?? null,
    id: meeting?.linked_id ?? null,
  });

  const [joinBefore, setJoinBefore] = useState(meeting?.join_button_minutes_before || 15);
  const [joinAfter, setJoinAfter] = useState(meeting?.join_button_minutes_after || 30);
  const [summaryPermission, setSummaryPermission] = useState<'creator_only' | 'all_attendees'>(
    meeting?.summary_permission || 'creator_only'
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [staff, setStaff] = useState<UserOption[]>([]);
  const [clients, setClients] = useState<UserOption[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  /**
   * ⚠️ لا تُلمس هذه الكتلة.
   * نستخرج التاريخ والوقت بالتوقيت المحلي في كليهما (getFullYear/getHours…)
   * بدل خلط toISOString (UTC) مع toTimeString (محلي) الذي كان يُزحزح تاريخ
   * الاجتماعات المسائية/الليلية يوماً كاملاً ويتراكم مع كل حفظ.
   */
  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const asLocalDate = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    const asLocalTime = (dt: Date) => `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;

    if (meeting?.scheduled_at) {
      const dt = new Date(meeting.scheduled_at);
      setDate(asLocalDate(dt));
      setTime(asLocalTime(dt));
    } else if (initialDate) {
      // من خلية التقويم: سلسلتان جاهزتان بصيغة العرض نفسها — لا Date وسيطة
      // تُدخل منطقة زمنية في المسار.
      setDate(initialDate);
      setTime(initialTime ?? '10:00');
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(asLocalDate(tomorrow));
      setTime('10:00');
    }
  }, [meeting, initialDate, initialTime]);

  useEffect(() => {
    const unwrap = <T,>(payload: T[] | { data: T[] } | undefined): T[] =>
      Array.isArray(payload) ? payload : payload?.data ?? [];

    (async () => {
      try {
        const [staffRes, clientRes, cats] = await Promise.all([
          apiClient.get<{ data: UserOption[] | { data: UserOption[] } }>(
            '/users?roles=admin,owner,partner,lawyer,senior_lawyer,legal_assistant,accountant,secretary&limit=200'
          ),
          apiClient.get<{ data: UserOption[] | { data: UserOption[] } }>('/users?role=client&limit=200'),
          meetingCategoryService.list(),
        ]);

        setStaff(unwrap(staffRes.data));
        setClients(unwrap(clientRes.data));
        setCategories(cats.categories.filter((c) => c.is_active || c.id === meeting?.meeting_category_id));
      } catch {
        // فشل جلب القوائم لا يمنع الحفظ — الخادم يتحقّق على أي حال
      }
    })();
  }, [meeting?.meeting_category_id]);

  /**
   * مطابقة بحث آمنة أمام الحقول الفارغة.
   *
   * ⚠️ العلّة التي أصلحتها: `u.email.toLowerCase()` مباشرةً كانت ترمي
   * TypeError أثناء الرسم لأي موظف بلا بريد — والنوع يقول `email: string`
   * بينما الخادم يُرجع null، فلم يمسكها TypeScript. ولم تظهر إلا **عند
   * الكتابة**: الحقل الفارغ يعود مبكّراً قبل لمس email.
   *
   * والتطبيع العربي مقصود: «احمد» يجب أن تجد «أحمد». البحث العلوي يفعلها
   * بالخادم، وهذا منتقٍ محلي على 200 صفاً فيكفيه التطبيع هنا.
   */
  const matches = (u: UserOption, term: string): boolean => {
    const norm = (v: unknown) =>
      String(v ?? '')
        .toLowerCase()
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[ً-ْٰ]/g, '');

    const needle = norm(term);
    return norm(u.name).includes(needle) || norm(u.email).includes(needle);
  };

  const filteredStaff = useMemo(() => {
    const term = staffSearch.trim();
    if (!term) return staff;
    return staff.filter((u) => matches(u, term));
  }, [staff, staffSearch]);

  const filteredClients = useMemo(() => {
    const term = clientSearch.trim();
    // منتقي العملاء مؤجَّل بالبحث: مكتب بثلاثة آلاف عميل يرى أول 200 صامتاً
    if (term.length < 2) return [];
    return clients.filter((u) => matches(u, term));
  }, [clients, clientSearch]);

  const toggle = (list: number[], setList: (next: number[]) => void, id: number) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleSubmit = async () => {
    setError(null);
    setFieldErrors({});

    if (!title.trim()) return setError('يرجى إدخال عنوان الاجتماع');
    if (!date || !time) return setError('يرجى تحديد تاريخ ووقت الاجتماع');

    const attendees: AttendeeInput[] = [
      ...staffIds.map((id) => ({ type: 'user' as const, user_id: id })),
      ...clientIds.map((id) => ({ type: 'client' as const, user_id: id })),
      ...guests.filter((g) => (g.name ?? '').trim()),
    ];

    if (attendees.length === 0) return setError('أضِف مشاركاً واحداً على الأقل');

    /**
     * ⚠️ لا تُلمس. نرسل الوقت كسلسلة محلية خام (بلا Z / بلا toISOString) —
     * الخادم بتوقيت Asia/Riyadh يفسّرها كما هي. toISOString كان يحوّلها إلى
     * UTC فتُخزَّن بإزاحة −3 ساعات (10:00 تصبح 07:00).
     */
    const scheduledAt = `${date}T${time}:00`;

    // القيمة null صريحة (لا undefined) للحقل غير المستخدم، كي يمسحه الخادم
    // عند تبديل نوع الاجتماع بدل الإبقاء على القيمة القديمة.
    const payload = {
      title,
      agenda: agenda || undefined,
      scheduled_at: scheduledAt,
      duration_minutes: duration,
      location: meetingType === 'physical' ? (location || null) : null,
      video_meeting_url: meetingType === 'remote' ? (videoUrl || null) : null,
      video_provider: meetingType === 'remote' ? 'manual' : undefined,
      attendees,
      meeting_category_id: categoryId,
      linked_type: link.id ? link.type : null,
      linked_id: link.id ?? null,
      join_button_minutes_before: joinBefore,
      join_button_minutes_after: joinAfter,
      summary_permission: summaryPermission,
    };

    try {
      setLoading(true);
      if (isEditing && meeting) {
        await internalMeetingService.update(meeting.id, payload as UpdateInternalMeetingData);
      } else {
        await internalMeetingService.create(payload as CreateInternalMeetingData);
      }
      onSuccess();
    } catch (err: unknown) {
      // 422 حقلاً بحقل: رسالة عامة واحدة تترك المستخدم يبحث عن الحقل المعطوب
      const e = err as { message?: string; errors?: Record<string, string[]> };
      setFieldErrors(e.errors ?? {});
      setError(e.message || 'حدث خطأ في حفظ الاجتماع');
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (key: string) => fieldErrors[key]?.[0];

  return (
    <Modal
      open
      onClose={onClose}
      size="wide"
      icon={CalendarClock}
      title={isEditing ? 'تعديل الاجتماع' : 'اجتماع جديد'}
      footerAlign="end"
      footer={
        <>
          <button type="button" className="fin-btn" onClick={onClose} disabled={loading}>إلغاء</button>
          <button type="button" className="fin-btn fin-btn--primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'جارٍ الحفظ…' : isEditing ? 'حفظ التعديلات' : 'إنشاء الاجتماع'}
          </button>
        </>
      }
    >
      {error && <div className="fin-state fin-state--error">{error}</div>}

      {/* عمودان: «ماذا ومتى» يميناً و«من ومع أي ملف» يساراً.
          الشريط الطولي الواحد كان يضع تسع كتل فوق بعضها فيصير الحفظ بعد
          تمرير طويل، ويُخفي الحضور والربط تحت الطيّة فلا يُستعملان. */}
      <div className="mfm-cols">
      <section className="mfm-col">
      <h3 className="mfm-col__head">تفاصيل الاجتماع</h3>

      <div className="fin-field">
        <label className="fin-field__label">عنوان الاجتماع <span className="req">*</span></label>
        <input
          className="fin-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: مراجعة موقف قضية الشركة"
          autoFocus
        />
        {fieldError('title') && <span className="fin-field__error">{fieldError('title')}</span>}
      </div>

      <div className="fin-field">
        <label className="fin-field__label">التاريخ <span className="req">*</span></label>
        <DualDateInput value={date} onChange={setDate} />
        {fieldError('scheduled_at') && <span className="fin-field__error">{fieldError('scheduled_at')}</span>}
      </div>

      <div className="fin-grid fin-grid--2">
        <div className="fin-field">
          <label className="fin-field__label">الوقت <span className="req">*</span></label>
          <input className="fin-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>

        <div className="fin-field">
          <label className="fin-field__label">المدة</label>
          <select className="fin-input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {DURATIONS.map((d) => <option key={d} value={d}>{d} دقيقة</option>)}
          </select>
        </div>
      </div>

      {/* ── التصنيف ── */}
      <div className="fin-field">
        <label className="fin-field__label">
          <Tag size={13} /> التصنيف
          {onManageCategories && (
            <button type="button" className="mfm-inline-link" onClick={onManageCategories}>إدارة التصنيفات</button>
          )}
        </label>
        <div className="mfm-categories">
          <button
            type="button"
            className={`cat-chip cat-none${categoryId === null ? ' is-selected' : ''}`}
            onClick={() => setCategoryId(null)}
          >
            غير مصنّف
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`cat-chip cat-${c.color}${categoryId === c.id ? ' is-selected' : ''}`}
              onClick={() => setCategoryId(c.id)}
            >
              <span className="cat-dot" aria-hidden="true" />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── النوع والمكان ── */}
      <div className="fin-field">
        <label className="fin-field__label">نوع الاجتماع</label>
        <div className="mfm-types">
          <button
            type="button"
            className={`mfm-type${meetingType === 'physical' ? ' is-active' : ''}`}
            onClick={() => setMeetingType('physical')}
          >
            حضوري
          </button>
          <button
            type="button"
            className={`mfm-type${meetingType === 'remote' ? ' is-active' : ''}`}
            onClick={() => setMeetingType('remote')}
          >
            عن بُعد
          </button>
        </div>
      </div>

      {meetingType === 'physical' ? (
        <div className="fin-field">
          <label className="fin-field__label">المكان</label>
          <input
            className="fin-input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="قاعة الاجتماعات الرئيسية"
          />
        </div>
      ) : (
        <div className="fin-field">
          <label className="fin-field__label">رابط الاجتماع</label>
          <input
            className="fin-input"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://…"
            dir="ltr"
          />
          {fieldError('video_meeting_url') && (
            <span className="fin-field__error">{fieldError('video_meeting_url')}</span>
          )}
        </div>
      )}

      <div className="fin-field">
        <label className="fin-field__label">الأجندة</label>
        <textarea
          className="fin-textarea"
          rows={3}
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          placeholder="نقاط النقاش…"
        />
      </div>

      </section>

      <section className="mfm-col">
      <h3 className="mfm-col__head">الحضور والارتباط</h3>

      {/* ── الحضور ── */}
      <div className="fin-field">
        <label className="fin-field__label"><Users size={13} /> فريق المكتب</label>
        <div className="mfm-search">
          <Search size={14} aria-hidden="true" />
          <input
            className="fin-input"
            value={staffSearch}
            onChange={(e) => setStaffSearch(e.target.value)}
            placeholder="ابحث بالاسم أو البريد…"
          />
        </div>
        <div className="mfm-people">
          {filteredStaff.map((u) => (
            <button
              key={u.id}
              type="button"
              className={`mfm-person${staffIds.includes(u.id) ? ' is-selected' : ''}`}
              onClick={() => toggle(staffIds, setStaffIds, u.id)}
            >
              {staffIds.includes(u.id) && <Check size={12} aria-hidden="true" />}
              <span>{u.name}</span>
              <em>{ROLE_LABELS[u.role] || u.role}</em>
            </button>
          ))}
          {filteredStaff.length === 0 && <p className="mfm-empty">لا نتائج</p>}
        </div>
      </div>

      <div className="fin-field">
        <label className="fin-field__label">عملاء</label>
        <div className="mfm-search">
          <Search size={14} aria-hidden="true" />
          <input
            className="fin-input"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="ابحث عن عميل بحرفين على الأقل…"
          />
        </div>
        {clientIds.length > 0 && (
          <div className="mfm-people">
            {clients.filter((c) => clientIds.includes(c.id)).map((u) => (
              <button
                key={u.id}
                type="button"
                className="mfm-person is-selected"
                onClick={() => toggle(clientIds, setClientIds, u.id)}
              >
                <Check size={12} aria-hidden="true" />
                <span>{u.name}</span>
              </button>
            ))}
          </div>
        )}
        {filteredClients.length > 0 && (
          <div className="mfm-people">
            {filteredClients.map((u) => (
              <button
                key={u.id}
                type="button"
                className={`mfm-person${clientIds.includes(u.id) ? ' is-selected' : ''}`}
                onClick={() => toggle(clientIds, setClientIds, u.id)}
              >
                {clientIds.includes(u.id) && <Check size={12} aria-hidden="true" />}
                <span>{u.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="fin-field">
        <label className="fin-field__label">مشاركون من خارج المكتب</label>
        <ExternalGuestsEditor guests={guests} onChange={setGuests} disabled={loading} />
      </div>

      {/* ── الربط ── */}
      <div className="fin-field">
        <label className="fin-field__label">مرتبط بـ</label>
        <LinkTargetPicker
          value={link}
          summary={meeting?.linked_id === link.id ? meeting?.linked : null}
          onChange={setLink}
          disabled={loading}
        />
      </div>

      </section>
      </div>

      {/* ── إعدادات متقدمة: خارج العمودين، بعرض المودال ── */}
      <button type="button" className="mfm-advanced-toggle" onClick={() => setShowAdvanced((v) => !v)}>
        <Settings2 size={13} /> إعدادات متقدمة
      </button>

      {showAdvanced && (
        <div className="fin-grid fin-grid--3">
          <div className="fin-field">
            <label className="fin-field__label">زر الدخول يظهر قبل (دقيقة)</label>
            <input
              className="fin-input"
              type="number"
              min={0}
              max={60}
              value={joinBefore}
              onChange={(e) => setJoinBefore(Number(e.target.value))}
            />
          </div>
          <div className="fin-field">
            <label className="fin-field__label">ويبقى بعد (دقيقة)</label>
            <input
              className="fin-input"
              type="number"
              min={0}
              max={120}
              value={joinAfter}
              onChange={(e) => setJoinAfter(Number(e.target.value))}
            />
          </div>
          <div className="fin-field">
            <label className="fin-field__label">من يكتب الملخص</label>
            <select
              className="fin-input"
              value={summaryPermission}
              onChange={(e) => setSummaryPermission(e.target.value as 'creator_only' | 'all_attendees')}
            >
              <option value="creator_only">المنشئ فقط</option>
              <option value="all_attendees">كل الحاضرين</option>
            </select>
          </div>
        </div>
      )}

      {isEditing && (
        <p className="mfm-note">
          حفظ التعديلات لا يُلغي ردود المشاركين الحاليين ولا أوقات دخولهم.
        </p>
      )}
    </Modal>
  );
};

export default CreateInternalMeetingModal;
