import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, Plus, Clock, MapPin, Video, User, X, Send, Loader2, AlertCircle, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  ClientAppointmentService,
  dayParts,
  durationLabel,
  formatDayLong,
  formatDayShort,
  type AppointmentRequestInput,
  type AvailableDay,
  type AvailableSlot,
  type CandidateLawyer,
  type ClientAppointment,
  type MeetingType,
} from '../services/clientAppointmentService';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (client-appointments.css + بدائيّات cx-*)

type FieldErrors = Partial<Record<'lawyer_id' | 'date' | 'time' | 'duration' | 'meeting_type' | 'notes', string>>;

/**
 * مودال «اطلب موعداً»: المحامي ⇒ اليوم ⇒ المدة والوقت ⇒ الطريقة والملاحظات.
 * كلُّ خطوةٍ تجلب من الخادم (الأيام والفترات من توفّر المحامي نفسه الذي يضبطه في إعداداته).
 */
const RequestAppointmentModal: React.FC<{ lawyers: CandidateLawyer[]; onClose: () => void; onCreated: (a: ClientAppointment) => void }> = ({ lawyers, onClose, onCreated }) => {
  const [lawyerId, setLawyerId] = useState<number | null>(lawyers.length === 1 ? lawyers[0].id : (lawyers.find(l => l.is_relationship_manager)?.id ?? null));
  const [days, setDays] = useState<AvailableDay[]>([]);
  const [daysLoading, setDaysLoading] = useState(false);
  const [window_, setWindow] = useState<{ from: string; to: string } | null>(null);
  const [durations, setDurations] = useState<number[]>([]);
  const [defaultLocation, setDefaultLocation] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [time, setTime] = useState<string | null>(null);
  const [meetingType, setMeetingType] = useState<MeetingType>('in_person');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // الأيام المتاحة للمحامي المختار
  useEffect(() => {
    if (!lawyerId) return;
    let cancelled = false;
    setDaysLoading(true);
    setDate(null); setTime(null); setSlots([]);
    ClientAppointmentService.days(lawyerId)
      .then(r => {
        if (cancelled) return;
        setDays(r.days);
        setWindow(r.window);
        setDurations(r.allowedDurations);
        setDefaultLocation(r.defaultLocation);
        setDuration(prev => (prev && r.allowedDurations.includes(prev) ? prev : (r.allowedDurations.includes(30) ? 30 : r.allowedDurations[0] ?? null)));
      })
      .catch(e => { if (!cancelled) toast.error(e instanceof Error ? e.message : 'تعذّر جلب الأيام المتاحة'); })
      .finally(() => { if (!cancelled) setDaysLoading(false); });
    return () => { cancelled = true; };
  }, [lawyerId]);

  // الفترات لليوم والمدة
  useEffect(() => {
    if (!lawyerId || !date || !duration) return;
    let cancelled = false;
    setSlotsLoading(true);
    setTime(null);
    ClientAppointmentService.slots(lawyerId, date, duration)
      .then(s => { if (!cancelled) setSlots(s); })
      .catch(e => { if (!cancelled) { setSlots([]); toast.error(e instanceof Error ? e.message : 'تعذّر جلب الأوقات'); } })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [lawyerId, date, duration]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: FieldErrors = {};
    if (!lawyerId) next.lawyer_id = 'اختر المحامي';
    if (!date) next.date = 'اختر اليوم';
    if (!duration) next.duration = 'اختر المدة';
    if (!time) next.time = 'اختر الوقت';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const input: AppointmentRequestInput = {
      lawyer_id: lawyerId!, date: date!, time: time!, duration: duration!,
      meeting_type: meetingType, notes: notes.trim() || undefined,
    };
    try {
      setSubmitting(true);
      const created = await ClientAppointmentService.request(input);
      toast.success('أُرسل طلب الموعد إلى المكتب وسيصلك التأكيد');
      onCreated(created);
    } catch (err) {
      const e2 = err as Error & { errors?: Record<string, string[]> };
      if (e2.errors) {
        const fe: FieldErrors = {};
        (Object.keys(e2.errors) as (keyof FieldErrors)[]).forEach(k => { fe[k] = e2.errors?.[k]?.[0]; });
        setErrors(fe);
        // الوقت لم يعد متاحاً ⇒ أعد جلب الفترات
        if (fe.time && lawyerId && date && duration) {
          ClientAppointmentService.slots(lawyerId, date, duration).then(setSlots).catch(() => undefined);
          setTime(null);
        }
      } else {
        toast.error(e2.message || 'تعذّر إرسال طلب الموعد');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const lawyerName = lawyers.find(l => l.id === lawyerId)?.name;

  return (
    <div className="case-modal-overlay" onClick={onClose}>
      <div className="case-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ca-req-title" style={{ maxWidth: 640 }}>
        <div className="case-modal__header">
          <h3 className="case-modal__title" id="ca-req-title">طلب موعد مع المكتب</h3>
          <button type="button" onClick={onClose} className="case-modal__close" aria-label="إغلاق"><X size={18} /></button>
        </div>
        <form onSubmit={submit} noValidate>
          <div className="case-modal__body">
            <div className="ca-steps">
              <div>
                <div className="ca-step__label">١. المحامي</div>
                {lawyers.length === 0 ? (
                  <div className="ca-muted">لا يوجد محامٍ مرتبط بحسابك بعد — تواصل مع المكتب.</div>
                ) : (
                  <div className="ca-lawyers">
                    {lawyers.map(l => (
                      <button key={l.id} type="button" className="ca-pick" aria-pressed={lawyerId === l.id} onClick={() => setLawyerId(l.id)}>
                        <User size={13} /> {l.name}
                        {l.is_relationship_manager && <small>مدير علاقتك</small>}
                      </button>
                    ))}
                  </div>
                )}
                {errors.lawyer_id && <div className="ca-error">{errors.lawyer_id}</div>}
              </div>

              <div>
                <div className="ca-step__label">
                  ٢. اليوم
                  {window_ && <em>الحجز متاح حتى {formatDayShort(window_.to)}</em>}
                </div>
                {daysLoading ? (
                  <div className="ca-muted"><Loader2 size={14} className="animate-spin" /> جارٍ جلب الأيام المتاحة…</div>
                ) : !lawyerId ? (
                  <div className="ca-muted">اختر المحامي أولاً</div>
                ) : days.length === 0 ? (
                  <div className="ca-muted">لا أيام متاحة لهذا المحامي في نافذة الحجز الحالية — جرّب محامياً آخر أو تواصل مع المكتب.</div>
                ) : (
                  <div className="ca-days">
                    {days.map(d => {
                      const p = dayParts(d.date);
                      return (
                        <button key={d.date} type="button" className="ca-day" aria-pressed={date === d.date} onClick={() => setDate(d.date)} title={formatDayLong(d.date)}>
                          <b>{p?.day}</b>
                          <span>{p?.month}</span>
                          <span>{p?.weekday}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {errors.date && <div className="ca-error">{errors.date}</div>}
              </div>

              <div>
                <div className="ca-step__label">٣. المدة والوقت</div>
                <div className="ca-lawyers" style={{ marginBottom: 8 }}>
                  {durations.map(m => (
                    <button key={m} type="button" className="ca-pick" aria-pressed={duration === m} onClick={() => setDuration(m)} disabled={!lawyerId}>
                      <Clock size={13} /> {durationLabel(m)}
                    </button>
                  ))}
                </div>
                {!date ? (
                  <div className="ca-muted">اختر اليوم لعرض الأوقات</div>
                ) : slotsLoading ? (
                  <div className="ca-muted"><Loader2 size={14} className="animate-spin" /> جارٍ جلب الأوقات…</div>
                ) : slots.length === 0 ? (
                  <div className="ca-muted">لا أوقات متاحة في هذا اليوم لهذه المدة — جرّب يوماً أو مدةً أخرى.</div>
                ) : (
                  <div className="ca-slots">
                    {slots.map(s => (
                      <button key={s.start} type="button" className="ca-slot" aria-pressed={time === s.start} onClick={() => setTime(s.start)}>
                        {s.start}
                      </button>
                    ))}
                  </div>
                )}
                {errors.duration && <div className="ca-error">{errors.duration}</div>}
                {errors.time && <div className="ca-error">{errors.time}</div>}
              </div>

              <div>
                <div className="ca-step__label">٤. الطريقة والملاحظات</div>
                <div className="ca-lawyers" style={{ marginBottom: 8 }}>
                  <button type="button" className="ca-pick" aria-pressed={meetingType === 'in_person'} onClick={() => setMeetingType('in_person')}>
                    <MapPin size={13} /> حضوري في المكتب
                  </button>
                  <button type="button" className="ca-pick" aria-pressed={meetingType === 'remote'} onClick={() => setMeetingType('remote')}>
                    <Video size={13} /> عن بُعد
                  </button>
                </div>
                {meetingType === 'in_person' && defaultLocation && <div className="ca-muted"><MapPin size={12} /> {defaultLocation}</div>}
                <textarea
                  className="form-textarea"
                  rows={3}
                  maxLength={1000}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="موضوع الموعد باختصار (اختياري)"
                />
              </div>

              {lawyerId && date && time && duration && (
                <div className="ca-summary">
                  موعد {meetingType === 'remote' ? 'عن بُعد' : 'حضوري'} مع <b>{lawyerName}</b> يوم <b>{formatDayLong(date)}</b> الساعة <b dir="ltr">{time}</b> لمدة {durationLabel(duration)}. يبقى الطلب بانتظار تأكيد المكتب.
                </div>
              )}
            </div>
          </div>
          <div className="case-modal__footer">
            <button type="submit" className="modal-btn modal-btn--success" disabled={submitting || lawyers.length === 0}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {submitting ? 'جارٍ الإرسال…' : 'إرسال الطلب'}
            </button>
            <button type="button" className="modal-btn modal-btn--secondary" onClick={onClose}>إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CancelModal: React.FC<{ appointment: ClientAppointment; onClose: () => void; onCancelled: (a: ClientAppointment) => void }> = ({ appointment, onClose, onCancelled }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBusy(true);
      const a = await ClientAppointmentService.cancel(appointment.id, reason.trim() || undefined);
      toast.success('أُلغي الموعد');
      onCancelled(a);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذّر إلغاء الموعد');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="case-modal-overlay" onClick={onClose}>
      <div className="case-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="case-modal__header">
          <h3 className="case-modal__title">إلغاء الموعد</h3>
          <button type="button" onClick={onClose} className="case-modal__close" aria-label="إغلاق"><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="case-modal__body">
            <div className="ca-summary" style={{ marginBottom: 12 }}>
              {formatDayLong(appointment.date)} الساعة <b dir="ltr">{appointment.time}</b> مع {appointment.lawyer?.name || 'المكتب'}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ca-cancel-reason">سبب الإلغاء (اختياري)</label>
              <textarea id="ca-cancel-reason" className="form-textarea" rows={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} />
            </div>
          </div>
          <div className="case-modal__footer">
            <button type="submit" className="modal-btn modal-btn--primary" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              تأكيد الإلغاء
            </button>
            <button type="button" className="modal-btn modal-btn--secondary" onClick={onClose}>رجوع</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AppointmentRow: React.FC<{ a: ClientAppointment; onCancel: (a: ClientAppointment) => void }> = ({ a, onCancel }) => {
  const p = dayParts(a.date);
  return (
    <li className={`ca-row ${a.is_upcoming ? '' : 'ca-row--past'}`}>
      <div className="ca-row__date">
        <span className="ca-row__day">{p?.day ?? '—'}</span>
        <span className="ca-row__month">{p?.month}</span>
        <span className="ca-row__weekday">{p?.weekday}</span>
      </div>
      <div>
        <div className="ca-row__title">{a.title || 'موعد مع المكتب'}</div>
        <div className="ca-row__meta">
          <span><Clock size={13} /> <span dir="ltr">{a.time}</span> – <span dir="ltr">{a.end_time}</span> · {durationLabel(a.duration_minutes)}</span>
          {a.lawyer && <span><User size={13} /> {a.lawyer.name}</span>}
          {a.meeting_type === 'remote' ? (
            a.video_meeting_url ? (
              <a href={a.video_meeting_url} target="_blank" rel="noopener noreferrer"><Video size={13} /> رابط الاجتماع <ExternalLink size={11} /></a>
            ) : (
              <span><Video size={13} /> عن بُعد{a.status === 'confirmed' ? ' — سيصلك الرابط من المكتب' : ''}</span>
            )
          ) : (
            <span><MapPin size={13} /> {a.location || 'حضوري في المكتب'}</span>
          )}
          {a.case && <span>القضية: {a.case.title}</span>}
        </div>
        {a.notes && <div className="ca-row__note">{a.notes}</div>}
        {a.cancellation_reason && <div className="ca-row__note">سبب الإلغاء: {a.cancellation_reason}</div>}
      </div>
      <div className="ca-row__side">
        <span className={`ca-chip ca-chip--${a.status}`}>{a.status_label}</span>
        {a.can_cancel && (
          <button type="button" className="cx-btn" onClick={() => onCancel(a)}><XCircle size={14} /> إلغاء الموعد</button>
        )}
      </div>
    </li>
  );
};

/**
 * «مواعيدي» — مواعيد العميل مع المكتب، وطلب موعد جديد من فترات المحامي المتاحة.
 */
const ClientAppointments: React.FC = () => {
  const [upcoming, setUpcoming] = useState<ClientAppointment[]>([]);
  const [past, setPast] = useState<ClientAppointment[]>([]);
  const [lawyers, setLawyers] = useState<CandidateLawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ClientAppointment | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await ClientAppointmentService.list();
      setUpcoming(r.upcoming);
      setPast(r.past);
      setLawyers(r.lawyers);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر جلب المواعيد');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="cx-page" dir="rtl">
      <div className="cx-header">
        <div className="cx-header__title">
          <div className="cx-header__icon"><Calendar size={20} /></div>
          <div>
            <h1 className="cx-header__h1">مواعيدي</h1>
            <p className="cx-header__sub">مواعيدك مع المكتب، واطلب موعداً جديداً من الأوقات المتاحة</p>
          </div>
        </div>
        <button type="button" className="cv-primary" onClick={() => setShowRequest(true)} disabled={loading}>
          <Plus size={16} /> اطلب موعداً
        </button>
      </div>

      <div className="cx-content">
        {loading ? (
          <div className="cx-skeleton" aria-busy="true" aria-label="جارٍ التحميل">
            <div className="cx-skeleton__row" />
            <div className="cx-skeleton__row" />
          </div>
        ) : error ? (
          <div className="cx-error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button type="button" className="cx-btn" onClick={() => void load()} style={{ marginInlineStart: 'auto' }}>إعادة المحاولة</button>
          </div>
        ) : upcoming.length === 0 && past.length === 0 ? (
          <div className="cx-empty">
            <div className="cx-empty__icon"><Calendar size={24} /></div>
            <h3 className="cx-empty__title">لا مواعيد بعد</h3>
            <p className="cx-empty__text">اطلب موعداً مع محاميك من الأوقات المتاحة، وسيصلك التأكيد من المكتب.</p>
            <button type="button" className="cv-primary" style={{ marginTop: 14 }} onClick={() => setShowRequest(true)}>
              <Plus size={16} /> اطلب موعداً
            </button>
          </div>
        ) : (
          <>
            <div className="ca-section">المواعيد القادمة <em>{upcoming.length}</em></div>
            {upcoming.length === 0 ? (
              <div className="cx-panel"><div className="cx-panel__empty">لا مواعيد قادمة</div></div>
            ) : (
              <ul className="cx-list">
                {upcoming.map(a => <AppointmentRow key={a.id} a={a} onCancel={setCancelTarget} />)}
              </ul>
            )}
            {past.length > 0 && (
              <>
                <div className="ca-section">السابقة والملغاة <em>{past.length}</em></div>
                <ul className="cx-list">
                  {past.map(a => <AppointmentRow key={a.id} a={a} onCancel={setCancelTarget} />)}
                </ul>
              </>
            )}
          </>
        )}
      </div>

      {showRequest && (
        <RequestAppointmentModal
          lawyers={lawyers}
          onClose={() => setShowRequest(false)}
          onCreated={() => { setShowRequest(false); void load(); }}
        />
      )}
      {cancelTarget && (
        <CancelModal
          appointment={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onCancelled={() => { setCancelTarget(null); void load(); }}
        />
      )}
    </div>
  );
};

export default ClientAppointments;
