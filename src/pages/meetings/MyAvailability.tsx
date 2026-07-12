import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Calendar,
  CalendarDays,
  CalendarClock,
  Settings,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Timer,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  User,
  Video,
  X
} from 'lucide-react';
import {
  availabilityService,
  availabilityHelpers,
  type LawyerAvailability,
  type WeeklySchedule,
  type TimeSlot,
  type AvailabilityException,
  DEFAULT_WEEKLY_SCHEDULE
} from '../../services/availabilityService';
import { clientMeetingService, type ClientMeeting } from '../../services/meetingService';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts — البنية المشتركة (ssp2-*) من simple-service.css

type DayKey = keyof WeeklySchedule;

const DAYS_ORDER: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const SIDE_MIN_KEY = 'avx_side_min';
const MEET_MIN_KEY = 'avx_meet_min';

const MEETING_STATUS_LABELS: Record<string, string> = {
  pending: 'بانتظار التأكيد',
  confirmed: 'مؤكد',
};

const slotMinutes = (slot: TimeSlot): number => {
  const [sh, sm] = slot.start.split(':').map(Number);
  const [eh, em] = slot.end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
};

const MyAvailability: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [availability, setAvailability] = useState<LawyerAvailability | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(DEFAULT_WEEKLY_SCHEDULE);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [minBookingHours, setMinBookingHours] = useState(24);
  const [maxBookingDays, setMaxBookingDays] = useState(14);
  const [allowedDurations, setAllowedDurations] = useState<number[]>([15, 30, 45, 60]);
  const [defaultLocation, setDefaultLocation] = useState('');
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [upcoming, setUpcoming] = useState<ClientMeeting[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sideMin, setSideMin] = useState<boolean>(() => localStorage.getItem(SIDE_MIN_KEY) === '1');
  const [meetMin, setMeetMin] = useState<boolean>(() => localStorage.getItem(MEET_MIN_KEY) === '1');

  // Exception modal state
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionDate, setExceptionDate] = useState('');
  const [exceptionIsBlocked, setExceptionIsBlocked] = useState(true);
  const [exceptionReason, setExceptionReason] = useState('');
  const [exceptionSlots, setExceptionSlots] = useState<TimeSlot[]>([]);

  const toggleSide = (min: boolean) => {
    setSideMin(min);
    localStorage.setItem(SIDE_MIN_KEY, min ? '1' : '0');
  };

  const toggleMeet = (min: boolean) => {
    setMeetMin(min);
    localStorage.setItem(MEET_MIN_KEY, min ? '1' : '0');
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // فشل جلب الاجتماعات لا يُسقط الصفحة — العمود يظهر فارغاً فحسب
      const [availData, exceptionsData, upcomingData] = await Promise.all([
        availabilityService.get(),
        availabilityService.getExceptions(),
        clientMeetingService.getUpcoming(8).catch(() => [] as ClientMeeting[]),
      ]);

      setAvailability(availData);
      setUpcoming(upcomingData);
      setWeeklySchedule(availData.weekly_schedule || DEFAULT_WEEKLY_SCHEDULE);
      setBufferMinutes(availData.buffer_minutes);
      setMinBookingHours(availData.min_booking_hours);
      setMaxBookingDays(availData.max_booking_days);
      setAllowedDurations(availData.allowed_durations);
      setDefaultLocation(availData.default_location || '');
      setExceptions(exceptionsData);
    } catch (err) {
      console.error('Error fetching availability:', err);
      setError('حدث خطأ في جلب بيانات التوفر');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // حقائق الترويسة
  const enabledDaysCount = useMemo(
    () => DAYS_ORDER.filter(day => weeklySchedule[day].enabled).length,
    [weeklySchedule]
  );

  const weeklyHours = useMemo(() => {
    let mins = 0;
    for (const day of DAYS_ORDER) {
      if (!weeklySchedule[day].enabled) continue;
      for (const slot of weeklySchedule[day].slots) mins += slotMinutes(slot);
    }
    return Math.round((mins / 60) * 10) / 10;
  }, [weeklySchedule]);

  // Toggle day enabled
  const toggleDayEnabled = (day: DayKey) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
      }
    }));
  };

  // Update slot
  const updateSlot = (day: DayKey, slotIndex: number, field: 'start' | 'end', value: string) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((slot, idx) =>
          idx === slotIndex ? { ...slot, [field]: value } : slot
        ),
      }
    }));
  };

  // Add slot
  const addSlot = (day: DayKey) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: [...prev[day].slots, { start: '09:00', end: '17:00' }],
      }
    }));
  };

  // Remove slot
  const removeSlot = (day: DayKey, slotIndex: number) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.filter((_, idx) => idx !== slotIndex),
      }
    }));
  };

  // Toggle duration
  const toggleDuration = (duration: number) => {
    setAllowedDurations(prev =>
      prev.includes(duration)
        ? prev.filter(d => d !== duration)
        : [...prev, duration].sort((a, b) => a - b)
    );
  };

  // Save
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await availabilityService.update({
        weekly_schedule: weeklySchedule,
        buffer_minutes: bufferMinutes,
        min_booking_hours: minBookingHours,
        max_booking_days: maxBookingDays,
        allowed_durations: allowedDurations,
        default_location: defaultLocation || undefined,
      });

      setSuccess('تم حفظ إعدادات التوفر بنجاح');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving availability:', err);
      setError(err.message || 'حدث خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  // اختيار حالة الاستثناء — عند «متاح» نضمن وجود فترة واحدة على الأقل للتعديل
  const setExceptionBlocked = (blocked: boolean) => {
    setExceptionIsBlocked(blocked);
    if (!blocked) {
      setExceptionSlots(prev => (prev.length === 0 ? [{ start: '09:00', end: '17:00' }] : prev));
    }
  };

  // Add exception
  const handleAddException = async () => {
    if (!exceptionDate) {
      setError('يرجى تحديد التاريخ');
      return;
    }

    try {
      await availabilityService.addException({
        date: exceptionDate,
        is_blocked: exceptionIsBlocked,
        custom_slots: !exceptionIsBlocked ? exceptionSlots : undefined,
        reason: exceptionReason || undefined,
      });

      setShowExceptionModal(false);
      setExceptionDate('');
      setExceptionIsBlocked(true);
      setExceptionReason('');
      setExceptionSlots([]);
      fetchData();
    } catch (err: any) {
      console.error('Error adding exception:', err);
      setError(err.message || 'حدث خطأ في إضافة الاستثناء');
    }
  };

  // Delete exception
  const handleDeleteException = async (id: number) => {
    if (confirm('هل تريد حذف هذا الاستثناء؟')) {
      try {
        await availabilityService.deleteException(id);
        fetchData();
      } catch (err) {
        console.error('Error deleting exception:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="ssp2-page avx" dir="rtl">
        <div className="avx-loading">
          <RefreshCw size={26} className="avx-spin" />
          جارٍ تحميل إعدادات التوفر...
        </div>
      </div>
    );
  }

  return (
    <div className="ssp2-page avx" dir="rtl">
      {/* ─── الترويسة: عنوان + حفظ، ثم حقائق الجدول ─── */}
      <header className="ssp2-header">
        <div className="ssp2-header__top">
          <div className="ssp2-header__info">
            <span className="ssp2-header__badge">
              <Clock size={13} /> حجوزات العملاء
            </span>
            <h1 className="ssp2-header__title">إعدادات التوفر</h1>
            <span className="avx-disclaimer">أوقاتك المتاحة التي تظهر للعملاء في رابط الحجز</span>
          </div>
          <div className="ssp2-header__actions">
            <button className="ssp2-icon-btn" onClick={fetchData} disabled={loading} title="تحديث">
              <RefreshCw size={14} className={loading ? 'avx-spin' : ''} />
            </button>
            <button className="ssp2-btn ssp2-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? <RefreshCw size={14} className="avx-spin" /> : <Save size={14} />}
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </div>

        <div className="ssp2-header__facts">
          <span className="ssp2-fact"><CalendarDays size={13} /><span className="ssp2-fact__label">أيام متاحة</span><b>{enabledDaysCount}/7</b></span>
          <span className="ssp2-fact__sep" />
          <span className="ssp2-fact"><Clock size={13} /><span className="ssp2-fact__label">ساعات الأسبوع</span><b>{weeklyHours}</b></span>
          <span className="ssp2-fact__sep" />
          <span className="ssp2-fact"><Timer size={13} /><span className="ssp2-fact__label">الفاصل</span><b>{bufferMinutes === 0 ? 'بدون' : `${bufferMinutes} د`}</b></span>
          <span className="ssp2-fact__sep" />
          <span className="ssp2-fact"><Calendar size={13} /><span className="ssp2-fact__label">نطاق الحجز</span><b>{minBookingHours} س → {maxBookingDays} يوم</b></span>
          <span className="ssp2-fact__sep" />
          <span className="ssp2-fact"><AlertCircle size={13} /><span className="ssp2-fact__label">استثناءات</span><b>{exceptions.length}</b></span>
        </div>
      </header>

      {/* ─── الأعمدة: القواعد والاستثناءات يمين (قابل للطي) + الجدول الأسبوعي ─── */}
      <div className="ssp2-layout">
        {sideMin ? (
          <aside className="ssp2-chatcol avx-side ssp2-chatcol--min">
            <button className="ssp2-chatcol__reopen" onClick={() => toggleSide(false)} title="فتح القواعد والاستثناءات">
              <ChevronsLeft size={15} />
              <span>القواعد والاستثناءات</span>
            </button>
          </aside>
        ) : (
          <aside className="ssp2-chatcol avx-side">
            {/* قواعد الحجز */}
            <div className="ssp2-card avx-card--rules">
              <div className="ssp2-card__head">
                <span className="ssp2-card__title">
                  <Settings size={14} /> قواعد الحجز
                </span>
                <button className="ssp2-icon-btn" onClick={() => toggleSide(true)} title="طي العمود">
                  <ChevronsRight size={14} />
                </button>
              </div>

              <div className="avx-form">
                <label className="ssp2-label"><MapPin size={12} /> الموقع الافتراضي</label>
                <input
                  className="ssp2-input"
                  type="text"
                  value={defaultLocation}
                  onChange={(e) => setDefaultLocation(e.target.value)}
                  placeholder="مثال: Google Meet أو عنوان المكتب"
                />

                <label className="ssp2-label"><Timer size={12} /> المدة الفاصلة بين المواعيد</label>
                <select
                  className="ssp2-input"
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(Number(e.target.value))}
                >
                  <option value={0}>بدون فاصل</option>
                  <option value={5}>5 دقائق</option>
                  <option value={10}>10 دقائق</option>
                  <option value={15}>15 دقيقة</option>
                  <option value={30}>30 دقيقة</option>
                </select>

                <div className="avx-form__row">
                  <div>
                    <label className="ssp2-label">أدنى مهلة قبل الموعد</label>
                    <select
                      className="ssp2-input"
                      value={minBookingHours}
                      onChange={(e) => setMinBookingHours(Number(e.target.value))}
                    >
                      <option value={1}>ساعة واحدة</option>
                      <option value={2}>ساعتين</option>
                      <option value={4}>4 ساعات</option>
                      <option value={24}>24 ساعة</option>
                      <option value={48}>48 ساعة</option>
                    </select>
                  </div>
                  <div>
                    <label className="ssp2-label">أقصى مدى مستقبلاً</label>
                    <select
                      className="ssp2-input"
                      value={maxBookingDays}
                      onChange={(e) => setMaxBookingDays(Number(e.target.value))}
                    >
                      <option value={7}>أسبوع</option>
                      <option value={14}>أسبوعين</option>
                      <option value={30}>شهر</option>
                      <option value={60}>شهرين</option>
                    </select>
                  </div>
                </div>

                <label className="ssp2-label">مدد الاجتماعات المتاحة</label>
                <div className="avx-durations">
                  {[15, 30, 45, 60].map(duration => (
                    <label
                      key={duration}
                      className={`avx-chip ${allowedDurations.includes(duration) ? 'is-on' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={allowedDurations.includes(duration)}
                        onChange={() => toggleDuration(duration)}
                      />
                      {duration} دقيقة
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* الاستثناءات والإجازات */}
            <div className="ssp2-card avx-card--exceptions">
              <div className="ssp2-card__head">
                <span className="ssp2-card__title">
                  <AlertCircle size={14} /> الاستثناءات والإجازات
                </span>
                <button className="ssp2-icon-btn" onClick={() => setShowExceptionModal(true)} title="إضافة استثناء">
                  <Plus size={14} />
                </button>
              </div>

              {exceptions.length === 0 ? (
                <div className="avx-empty">
                  <Calendar size={26} />
                  <p>لا توجد استثناءات</p>
                  <span>أضف أيام إجازة أو تغييرات خاصة</span>
                </div>
              ) : (
                <div className="avx-exceptions">
                  {exceptions.map(exception => (
                    <div key={exception.id} className="avx-exc">
                      <span className="avx-exc__date">
                        {new Date(exception.date).toLocaleDateString('ar-SA', {
                          month: 'short',
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </span>
                      <span className="avx-exc__reason">{exception.reason || ''}</span>
                      <span className={`avx-exc__type ${exception.is_blocked ? 'avx-exc__type--blocked' : ''}`}>
                        {exception.is_blocked ? 'مغلق' : 'معدل'}
                      </span>
                      <button
                        className="ssp2-icon-btn ssp2-icon-btn--danger avx-exc__del"
                        onClick={() => handleDeleteException(exception.id)}
                        title="حذف الاستثناء"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* الجدول الأسبوعي — كتلة العمل الرئيسية، تتمرر داخلياً */}
        <main className="ssp2-work">
          {error && (
            <div className="avx-msg avx-msg--error">
              <AlertCircle size={14} />
              {error}
              <button onClick={() => setError(null)} title="إغلاق"><X size={13} /></button>
            </div>
          )}
          {success && (
            <div className="avx-msg avx-msg--success">
              <CheckCircle2 size={14} />
              {success}
            </div>
          )}

          <div className="ssp2-card avx-schedule">
            <div className="ssp2-card__head">
              <span className="ssp2-card__title">
                <CalendarDays size={14} /> الجدول الأسبوعي المعتاد
              </span>
              <span className="ssp2-card__meta">{enabledDaysCount} أيام متاحة · {weeklyHours} ساعة أسبوعياً</span>
            </div>

            <div className="avx-days">
              {DAYS_ORDER.map(day => (
                <div key={day} className={`avx-day ${weeklySchedule[day].enabled ? '' : 'avx-day--off'}`}>
                  <label className="avx-toggle" title={weeklySchedule[day].enabled ? 'تعطيل اليوم' : 'تفعيل اليوم'}>
                    <input
                      type="checkbox"
                      checked={weeklySchedule[day].enabled}
                      onChange={() => toggleDayEnabled(day)}
                    />
                    <span className="avx-toggle__track" />
                  </label>
                  <span className="avx-day__name">{availabilityHelpers.getDayNameArabic(day)}</span>

                  {weeklySchedule[day].enabled ? (
                    <div className="avx-day__slots">
                      {weeklySchedule[day].slots.map((slot, idx) => (
                        <span key={idx} className="avx-slot">
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) => updateSlot(day, idx, 'start', e.target.value)}
                          />
                          <span className="avx-slot__sep">إلى</span>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) => updateSlot(day, idx, 'end', e.target.value)}
                          />
                          {weeklySchedule[day].slots.length > 1 && (
                            <button
                              className="avx-slot__del"
                              onClick={() => removeSlot(day, idx)}
                              title="حذف الفترة"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </span>
                      ))}
                      <button className="avx-addslot" onClick={() => addSlot(day)}>
                        <Plus size={12} />
                        فترة أخرى
                      </button>
                    </div>
                  ) : (
                    <span className="avx-day__off">غير متاح</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* الاجتماعات القادمة — عمود يسار قابل للطي */}
        {meetMin ? (
          <aside className="ssp2-chatcol avx-meetcol ssp2-chatcol--min">
            <button className="ssp2-chatcol__reopen" onClick={() => toggleMeet(false)} title="فتح الاجتماعات القادمة">
              <ChevronsRight size={15} />
              <span>الاجتماعات القادمة</span>
            </button>
          </aside>
        ) : (
          <aside className="ssp2-chatcol avx-meetcol">
            <div className="ssp2-card">
              <div className="ssp2-card__head">
                <span className="ssp2-card__title">
                  <CalendarClock size={14} /> الاجتماعات القادمة
                </span>
                <div className="ssp2-card__headtools">
                  <button className="ssp2-icon-btn" onClick={() => navigate('/meetings/client')} title="كل الاجتماعات">
                    <ExternalLink size={13} />
                  </button>
                  <button className="ssp2-icon-btn" onClick={() => toggleMeet(true)} title="طي العمود">
                    <ChevronsLeft size={14} />
                  </button>
                </div>
              </div>

              {upcoming.length === 0 ? (
                <div className="avx-empty">
                  <CalendarClock size={26} />
                  <p>لا اجتماعات قادمة</p>
                  <span>حجوزات العملاء المؤكدة تظهر هنا</span>
                </div>
              ) : (
                <div className="avx-meets">
                  {upcoming.map(meeting => (
                    <div key={meeting.id} className="avx-meet">
                      <div className="avx-meet__top">
                        <span className="avx-meet__title">{meeting.title}</span>
                        <span className={`avx-meet__status avx-meet__status--${meeting.status}`}>
                          {MEETING_STATUS_LABELS[meeting.status] ?? meeting.status}
                        </span>
                      </div>
                      <div className="avx-meet__meta">
                        <Clock size={11} />
                        {new Date(meeting.scheduled_at).toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' · '}
                        {new Date(meeting.scheduled_at).toLocaleTimeString('ar-SA', { hour: 'numeric', minute: '2-digit' })}
                        {' · '}
                        {meeting.duration_minutes} د
                      </div>
                      <div className="avx-meet__meta">
                        <User size={11} />
                        <span className="avx-meet__client">{meeting.client?.name || meeting.client_name || 'بدون اسم'}</span>
                        {meeting.meeting_type === 'remote' ? <Video size={11} /> : <MapPin size={11} />}
                        {meeting.meeting_type === 'remote' ? 'عن بعد' : 'حضوري'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ─── مودال إضافة استثناء ─── */}
      {showExceptionModal && (
        <div className="ssp2-overlay" onClick={() => setShowExceptionModal(false)}>
          <div className="ssp2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ssp2-modal__head">
              إضافة استثناء
              <button className="ssp2-icon-btn" onClick={() => setShowExceptionModal(false)}><X size={14} /></button>
            </div>

            <div className="ssp2-modal__body">
              <p className="ssp2-hint">
                سيؤدي هذا إلى تجاوز الجدول الأسبوعي لهذا اليوم المحدد.
              </p>

              <label className="ssp2-label">تاريخ الاستثناء</label>
              <input
                className="ssp2-input"
                type="date"
                value={exceptionDate}
                onChange={(e) => setExceptionDate(e.target.value)}
              />

              <label className="ssp2-label">حالة التوفر</label>
              <div className="avx-seg">
                <button
                  className={`avx-seg__btn ${exceptionIsBlocked ? 'is-current' : ''}`}
                  onClick={() => setExceptionBlocked(true)}
                >
                  غير متاح (مغلق)
                </button>
                <button
                  className={`avx-seg__btn ${!exceptionIsBlocked ? 'is-current' : ''}`}
                  onClick={() => setExceptionBlocked(false)}
                >
                  متاح (أوقات مخصصة)
                </button>
              </div>

              {!exceptionIsBlocked && (
                <div className="avx-mslots">
                  {exceptionSlots.map((slot, idx) => (
                    <div key={idx} className="avx-mslot">
                      <input
                        className="ssp2-input"
                        type="time"
                        value={slot.start}
                        onChange={(e) => setExceptionSlots(prev => prev.map((s, i) => i === idx ? { ...s, start: e.target.value } : s))}
                      />
                      <span className="avx-slot__sep">إلى</span>
                      <input
                        className="ssp2-input"
                        type="time"
                        value={slot.end}
                        onChange={(e) => setExceptionSlots(prev => prev.map((s, i) => i === idx ? { ...s, end: e.target.value } : s))}
                      />
                      {exceptionSlots.length > 1 && (
                        <button
                          className="ssp2-icon-btn ssp2-icon-btn--danger"
                          onClick={() => setExceptionSlots(prev => prev.filter((_, i) => i !== idx))}
                          title="حذف الفترة"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    className="avx-addslot"
                    onClick={() => setExceptionSlots(prev => [...prev, { start: '09:00', end: '17:00' }])}
                  >
                    <Plus size={12} />
                    فترة أخرى
                  </button>
                </div>
              )}

              <label className="ssp2-label">السبب / الملاحظة</label>
              <input
                className="ssp2-input"
                type="text"
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                placeholder="مثال: إجازة عيد، سفر عمل..."
              />

              <div className="ssp2-modal__foot">
                <button className="ssp2-btn" onClick={() => setShowExceptionModal(false)}>إلغاء</button>
                <button className="ssp2-btn ssp2-btn--primary" onClick={handleAddException}>
                  حفظ الاستثناء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAvailability;
