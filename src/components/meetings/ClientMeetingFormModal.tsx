import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Check, Search, X } from 'lucide-react';
import Modal from '../erp/Modal';
import DualDateInput from '../common/DualDateInput';
import { apiClient } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  clientMeetingService,
  type ClientMeeting,
  type CreateClientMeetingData,
  type UpdateClientMeetingData,
} from '../../services/meetingService';
import { riyadhDayKey, riyadhTimeKey } from '../../utils/dateAr';
import { clientDisplayName, clientDisplayPhone } from './clientMeetingHelpers';

interface Props {
  /** يُمرَّر للتعديل؛ وبدونه «موعد جديد» */
  meeting?: ClientMeeting | null;
  onClose: () => void;
  /** message: ما يُعرض للمستخدم بعد الحفظ (هل أُبلغ العميل أم لا) */
  onSaved: (meeting: ClientMeeting, message: string) => void;
}

interface UserOption {
  id: number;
  name: string;
  email: string | null;
  phone?: string | null;
  role: string;
}

interface Slot {
  start: string;
  end: string;
}

/** مرآة ClientMeetingController::DURATIONS — ومُدد إعدادات التوفّر نفسها. */
const DURATIONS = [15, 30, 45, 60, 90, 120];

/** الحقول التي يُبلَّغ العميل المؤكَّد موعده بتغيّرها (MeetingService::updateClientMeeting). */
const CLIENT_FACING: Array<keyof UpdateClientMeetingData> = [
  'scheduled_at', 'duration_minutes', 'meeting_type', 'location', 'video_meeting_url',
];

const unwrap = <T,>(payload: T[] | { data: T[] } | undefined): T[] =>
  Array.isArray(payload) ? payload : payload?.data ?? [];

/**
 * موعد عميل جديد (حجزٌ مباشر من المكتب) أو تعديل موعد قائم.
 *
 * الصفحة كانت تعرض «رابط حجز» طريقاً وحيداً: السكرتير الذي يتلقّى اتصال العميل لم
 * يكن يملك ما يحجز به، والمحامي لم يكن يملك ما يؤجّل به موعداً — والـAPI جاهز لكليهما.
 *
 * الوقت ساعةُ حائطٍ بتوقيت الرياض ذهاباً وإياباً (utils/dateAr، القاعدة 3): يُقرأ
 * بـriyadhDayKey/riyadhTimeKey ويُرسل «YYYY-MM-DD HH:mm:ss» بلا لاحقة Z.
 */
const ClientMeetingFormModal: React.FC<Props> = ({ meeting, onClose, onSaved }) => {
  const isEditing = Boolean(meeting);
  const { user } = useAuth();
  const currentUserId = Number(user?.id) || null;

  // ── المحامي والعميل (للإنشاء وحده) ──
  const [lawyerId, setLawyerId] = useState<number | null>(meeting?.lawyer_id ?? currentUserId);
  const [staff, setStaff] = useState<UserOption[]>([]);

  const [clientMode, setClientMode] = useState<'registered' | 'guest'>('registered');
  const [client, setClient] = useState<UserOption | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState<UserOption[]>([]);
  const [searchingClients, setSearchingClients] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // ── الموعد ──
  const [title, setTitle] = useState(meeting?.title ?? '');
  const [date, setDate] = useState(() =>
    meeting ? riyadhDayKey(meeting.scheduled_at) : riyadhDayKey(new Date(Date.now() + 86_400_000))
  );
  const [time, setTime] = useState(() => (meeting ? riyadhTimeKey(meeting.scheduled_at) : '10:00'));
  const [duration, setDuration] = useState<number>(meeting?.duration_minutes ?? 30);
  const [meetingType, setMeetingType] = useState<'in_person' | 'remote'>(meeting?.meeting_type ?? 'in_person');
  const [location, setLocation] = useState(meeting?.location ?? '');
  const [videoUrl, setVideoUrl] = useState(meeting?.video_meeting_url ?? '');
  const [notes, setNotes] = useState(meeting?.notes ?? '');

  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // مدّةٌ قديمة خارج القائمة تبقى خياراً — وإلا اختفت من القائمة المنسدلة وحُفظت غيرها
  const durationOptions = useMemo(
    () => (DURATIONS.includes(duration) ? DURATIONS : [...DURATIONS, duration].sort((a, b) => a - b)),
    [duration]
  );

  useEffect(() => {
    if (isEditing) return;
    apiClient
      .get<{ data: UserOption[] | { data: UserOption[] } }>('/users?exclude_role=client&limit=200')
      .then((res) => setStaff(unwrap(res.data)))
      .catch(() => setStaff([]));
  }, [isEditing]);

  // المستخدم الحالي خيارٌ دائماً — ولو لم يرجع في أول 200 موظف
  const lawyerOptions = useMemo(() => {
    if (!currentUserId || staff.some((s) => s.id === currentUserId)) return staff;
    return [{ id: currentUserId, name: user?.name ?? 'أنا', email: null, role: '' }, ...staff];
  }, [staff, currentUserId, user?.name]);

  // بحث العملاء على الخادم: منتقٍ محليّ على أول 200 كان يُخفي عميل مكتبٍ بثلاثة آلاف عميل
  useEffect(() => {
    if (isEditing || clientMode !== 'registered') return;
    const term = clientSearch.trim();
    if (term.length < 2) {
      setClientResults([]);
      setSearchingClients(false);
      return;
    }

    let cancelled = false;
    setSearchingClients(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await apiClient.get<{ data: UserOption[] | { data: UserOption[] } }>(
          `/users?role=client&limit=20&search=${encodeURIComponent(term)}`
        );
        if (!cancelled) setClientResults(unwrap(res.data));
      } catch {
        if (!cancelled) setClientResults([]);
      } finally {
        if (!cancelled) setSearchingClients(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [clientSearch, clientMode, isEditing]);

  // أوقات المحامي المتاحة لليوم المختار — اقتراحٌ لا قيد: الخادم يفحص التعارض وحده،
  // ونافذة «أقل مدة قبل الحجز» تخصّ حجز العملاء لا المكتب.
  const slotLawyerId = meeting?.lawyer_id ?? lawyerId;
  useEffect(() => {
    if (!slotLawyerId || !date) {
      setSlots(null);
      return;
    }

    let cancelled = false;
    apiClient
      .get<{ success: boolean; data: { slots: Slot[] } }>(
        `/availability/slots?lawyer_id=${slotLawyerId}&date=${date}&duration=${duration}`
      )
      .then((res) => {
        if (!cancelled) setSlots(res.data?.slots ?? []);
      })
      .catch(() => {
        if (!cancelled) setSlots(null);
      });

    return () => {
      cancelled = true;
    };
  }, [slotLawyerId, date, duration]);

  const fieldError = (...keys: string[]) => keys.map((k) => fieldErrors[k]?.[0]).find(Boolean);
  const INLINE_KEYS = ['scheduled_at', 'lawyer_id', 'client_id', 'client_name', 'client_email', 'client_phone', 'video_meeting_url', 'location', 'duration_minutes'];
  const otherErrors = Array.from(new Set(
    Object.entries(fieldErrors)
      .filter(([key]) => !INLINE_KEYS.includes(key))
      .flatMap(([, messages]) => messages)
  ));

  const buildChanges = (original: ClientMeeting): UpdateClientMeetingData => {
    const changes: UpdateClientMeetingData = {};
    const trimmedTitle = title.trim();
    const trimmedNotes = notes.trim();
    const trimmedLocation = location.trim();
    const trimmedUrl = videoUrl.trim();

    if ((original.title ?? '') !== trimmedTitle) changes.title = trimmedTitle || null;
    if ((original.notes ?? '') !== trimmedNotes) changes.notes = trimmedNotes || null;
    // الوقت يُرسل حين يتغيّر وحده: الخادم يرفض وقتاً ماضياً، فإعادة إرساله كانت
    // ستمنع تعديل ملاحظات موعدٍ بدأ
    if (riyadhDayKey(original.scheduled_at) !== date || riyadhTimeKey(original.scheduled_at) !== time) {
      changes.scheduled_at = `${date} ${time}:00`;
    }
    if (original.duration_minutes !== duration) changes.duration_minutes = duration;
    if (original.meeting_type !== meetingType) changes.meeting_type = meetingType;
    if (meetingType === 'in_person' && (original.location ?? '') !== trimmedLocation) {
      changes.location = trimmedLocation || null;
    }
    if (meetingType === 'remote' && (original.video_meeting_url ?? '') !== trimmedUrl) {
      changes.video_meeting_url = trimmedUrl || null;
    }

    return changes;
  };

  const handleSubmit = async () => {
    setError(null);
    setFieldErrors({});

    if (!date || !time) return setError('حدّد تاريخ الموعد ووقته');
    if (!isEditing && clientMode === 'registered' && !client) {
      return setError('اختر العميل من نتائج البحث، أو أدخل عميلاً غير مسجّل');
    }
    if (!isEditing && clientMode === 'guest' && !guestName.trim()) return setError('اكتب اسم العميل');

    setSaving(true);
    try {
      if (meeting) {
        const changes = buildChanges(meeting);
        if (Object.keys(changes).length === 0) {
          onClose();
          return;
        }

        const saved = await clientMeetingService.update(meeting.id, changes);
        const notified = meeting.status === 'confirmed' && CLIENT_FACING.some((k) => k in changes);
        onSaved(saved, notified ? 'حُفظ التعديل وأُبلغ العميل بالتفاصيل الجديدة' : 'حُفظ التعديل');
        return;
      }

      const trimmedLocation = location.trim();
      const trimmedUrl = videoUrl.trim();
      const payload: CreateClientMeetingData = {
        lawyer_id: lawyerId ?? undefined,
        scheduled_at: `${date} ${time}:00`,
        duration_minutes: duration,
        meeting_type: meetingType,
        title: title.trim() || undefined,
        notes: notes.trim() || undefined,
        location: meetingType === 'in_person' ? trimmedLocation || undefined : undefined,
        video_meeting_url: meetingType === 'remote' ? trimmedUrl || undefined : undefined,
        ...(clientMode === 'registered' && client
          ? { client_id: client.id }
          : {
              client_name: guestName.trim(),
              client_phone: guestPhone.trim() || undefined,
              client_email: guestEmail.trim() || undefined,
            }),
      };

      const saved = await clientMeetingService.create(payload);
      onSaved(saved, 'أُنشئ الموعد وأُرسل تأكيده للعميل');
    } catch (err: unknown) {
      // 422 حقلاً بحقل تحت موضعه؛ وما سواه (تعارض الوقت 400 مثلاً) رسالةٌ عامة
      const e = err as { message?: string; errors?: Record<string, string[]> };
      const errors = e.errors ?? {};
      setFieldErrors(errors);
      setError(Object.keys(errors).length > 0 ? null : e.message || 'تعذّر حفظ الموعد');
    } finally {
      setSaving(false);
    }
  };

  const pickSlot = (slot: Slot) => setTime(slot.start);

  return (
    <Modal
      open
      onClose={onClose}
      size="wide"
      icon={CalendarClock}
      title={isEditing ? 'تعديل الموعد' : 'موعد جديد مع عميل'}
      footerAlign="end"
      closeOnOverlay={!saving}
      footer={
        <>
          <button type="button" className="fin-btn" onClick={onClose} disabled={saving}>إلغاء</button>
          <button type="button" className="fin-btn fin-btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'جارٍ الحفظ…' : isEditing ? 'حفظ التعديلات' : 'حجز الموعد'}
          </button>
        </>
      }
    >
      {(error || otherErrors.length > 0) && (
        <div className="cmo-alert cmo-alert--error cmo-form-alert" role="alert">
          <AlertTriangle size={14} aria-hidden="true" />
          <div className="cmo-alert__text">
            {error}
            {otherErrors.length > 0 && (
              <ul>
                {otherErrors.map((message) => <li key={message}>{message}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="mfm-cols">
        <section className="mfm-col">
          <h3 className="mfm-col__head">الموعد</h3>

          <div className="fin-field">
            <label className="fin-field__label">العنوان</label>
            <input
              className="fin-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: استشارة أولية"
              maxLength={255}
            />
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
                {durationOptions.map((d) => <option key={d} value={d}>{d} دقيقة</option>)}
              </select>
              {fieldError('duration_minutes') && <span className="fin-field__error">{fieldError('duration_minutes')}</span>}
            </div>
          </div>

          {slots !== null && (
            <div className="fin-field">
              <label className="fin-field__label">أوقات متاحة في جدول المحامي</label>
              {slots.length > 0 ? (
                <div className="mfm-people">
                  {slots.map((s) => (
                    <button
                      key={s.start}
                      type="button"
                      className={`mfm-person${time === s.start ? ' is-selected' : ''}`}
                      onClick={() => pickSlot(s)}
                    >
                      {time === s.start && <Check size={12} aria-hidden="true" />}
                      <span>{s.start}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mfm-note">لا فترات معلنة لهذا اليوم — ويمكنك كتابة أي وقت، والتعارض يُفحص عند الحفظ.</p>
              )}
            </div>
          )}

          <div className="fin-field">
            <label className="fin-field__label">نوع الموعد</label>
            <div className="mfm-types">
              <button
                type="button"
                className={`mfm-type${meetingType === 'in_person' ? ' is-active' : ''}`}
                onClick={() => setMeetingType('in_person')}
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

          {meetingType === 'in_person' ? (
            <div className="fin-field">
              <label className="fin-field__label">المكان</label>
              <input
                className="fin-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={isEditing ? 'مقر المكتب' : 'يُترك فارغاً ليأخذ موقع المكتب الافتراضي'}
                maxLength={255}
              />
              {fieldError('location') && <span className="fin-field__error">{fieldError('location')}</span>}
            </div>
          ) : (
            <div className="fin-field">
              <label className="fin-field__label">رابط الاجتماع</label>
              <input
                className="fin-input"
                dir="ltr"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://zoom.us/j/..."
                maxLength={255}
              />
              {fieldError('video_meeting_url') ? (
                <span className="fin-field__error">{fieldError('video_meeting_url')}</span>
              ) : (
                !videoUrl.trim() && (
                  <p className="mfm-note">يمكن إضافته لاحقاً — يصل العميلَ فور حفظه.</p>
                )
              )}
            </div>
          )}

          <div className="fin-field">
            <label className="fin-field__label">ملاحظات</label>
            <textarea
              className="fin-textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="موضوع الموعد أو ما يلزم تحضيره…"
            />
          </div>
        </section>

        <section className="mfm-col">
          <h3 className="mfm-col__head">{isEditing ? 'العميل' : 'العميل والمحامي'}</h3>

          {meeting ? (
            <>
              <div className="cmo-summary">
                <span>{clientDisplayName(meeting)}</span>
                {clientDisplayPhone(meeting) && <em dir="ltr">{clientDisplayPhone(meeting)}</em>}
                {meeting.lawyer?.name && <em>المحامي: {meeting.lawyer.name}</em>}
              </div>
              <p className="mfm-note">
                {meeting.status === 'confirmed'
                  ? 'يُبلَّغ العميل بأي تغيير في الوقت أو المدة أو النوع أو المكان أو الرابط. تعديل العنوان والملاحظات لا يُرسل شيئاً.'
                  : 'الطلب بانتظار الاعتماد — لا يُرسل للعميل شيء الآن، ورسالة الاعتماد تحمل التفاصيل الجديدة.'}
              </p>
            </>
          ) : (
            <>
              <div className="fin-field">
                <label className="fin-field__label">المحامي</label>
                <select
                  className="fin-input"
                  value={lawyerId ?? ''}
                  onChange={(e) => setLawyerId(e.target.value ? Number(e.target.value) : null)}
                >
                  {lawyerOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id === currentUserId ? `${s.name} (أنا)` : s.name}
                    </option>
                  ))}
                </select>
                {fieldError('lawyer_id') && <span className="fin-field__error">{fieldError('lawyer_id')}</span>}
              </div>

              <div className="fin-field">
                <label className="fin-field__label">العميل <span className="req">*</span></label>
                <div className="mfm-types">
                  <button
                    type="button"
                    className={`mfm-type${clientMode === 'registered' ? ' is-active' : ''}`}
                    onClick={() => setClientMode('registered')}
                  >
                    عميل مسجّل
                  </button>
                  <button
                    type="button"
                    className={`mfm-type${clientMode === 'guest' ? ' is-active' : ''}`}
                    onClick={() => setClientMode('guest')}
                  >
                    غير مسجّل
                  </button>
                </div>
              </div>

              {clientMode === 'registered' ? (
                <div className="fin-field">
                  {client ? (
                    <div className="mfm-link__chosen">
                      <span>
                        {client.name}
                        {client.phone && <> · <em dir="ltr">{client.phone}</em></>}
                      </span>
                      <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" onClick={() => setClient(null)}>
                        <X size={13} /> تغيير
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mfm-search">
                        <Search size={14} aria-hidden="true" />
                        <input
                          className="fin-input"
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          placeholder="ابحث بالاسم أو الجوال أو الهوية…"
                          autoFocus
                        />
                      </div>
                      {clientSearch.trim().length >= 2 && (
                        <div className="mfm-people">
                          {searchingClients ? (
                            <p className="mfm-empty">يُبحث…</p>
                          ) : clientResults.length === 0 ? (
                            <p className="mfm-empty">لا نتائج — جرّب «غير مسجّل»</p>
                          ) : (
                            clientResults.map((c) => (
                              <button key={c.id} type="button" className="mfm-person" onClick={() => setClient(c)}>
                                <span>{c.name}</span>
                                {c.phone && <em dir="ltr">{c.phone}</em>}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {fieldError('client_id', 'client_name') && (
                    <span className="fin-field__error">{fieldError('client_id', 'client_name')}</span>
                  )}
                </div>
              ) : (
                <>
                  <div className="fin-field">
                    <label className="fin-field__label">الاسم <span className="req">*</span></label>
                    <input className="fin-input" value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={255} />
                    {fieldError('client_name') && <span className="fin-field__error">{fieldError('client_name')}</span>}
                  </div>
                  <div className="fin-grid fin-grid--2">
                    <div className="fin-field">
                      <label className="fin-field__label">الجوال</label>
                      <input
                        className="fin-input"
                        dir="ltr"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="05XXXXXXXX"
                        maxLength={20}
                      />
                      {fieldError('client_phone') && <span className="fin-field__error">{fieldError('client_phone')}</span>}
                    </div>
                    <div className="fin-field">
                      <label className="fin-field__label">البريد</label>
                      <input
                        className="fin-input"
                        dir="ltr"
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        maxLength={255}
                      />
                      {fieldError('client_email') && <span className="fin-field__error">{fieldError('client_email')}</span>}
                    </div>
                  </div>
                </>
              )}

              <p className="mfm-note">
                يُؤكَّد الموعد فور حجزه، ويصل العميلَ تأكيده بالواتساب والبريد إن وُجدا.
              </p>
            </>
          )}
        </section>
      </div>
    </Modal>
  );
};

export default ClientMeetingFormModal;
