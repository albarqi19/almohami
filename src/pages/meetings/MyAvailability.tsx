import React, { useEffect, useState, useCallback } from 'react';
import {
  Clock,
  Calendar,
  Settings,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  MapPin,
  CalendarDays,
  Timer,
  Info
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
import '../../styles/availability.css';

type DayKey = keyof WeeklySchedule;

const DAYS_ORDER: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const MyAvailability: React.FC = () => {
  // State
  const [availability, setAvailability] = useState<LawyerAvailability | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(DEFAULT_WEEKLY_SCHEDULE);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [minBookingHours, setMinBookingHours] = useState(24);
  const [maxBookingDays, setMaxBookingDays] = useState(14);
  const [allowedDurations, setAllowedDurations] = useState<number[]>([15, 30, 45, 60]);
  const [defaultLocation, setDefaultLocation] = useState('');
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Exception modal state
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionDate, setExceptionDate] = useState('');
  const [exceptionIsBlocked, setExceptionIsBlocked] = useState(true);
  const [exceptionReason, setExceptionReason] = useState('');
  const [exceptionSlots, setExceptionSlots] = useState<TimeSlot[]>([]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [availData, exceptionsData] = await Promise.all([
        availabilityService.get(),
        availabilityService.getExceptions(),
      ]);

      setAvailability(availData);
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
      <div className="availability-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: 'var(--color-text-secondary)' }}>
          <RefreshCw size={32} className="animate-spin" />
          <p>جاري تحميل إعدادات التوفر...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="availability-page">
      {/* Header - Notion Style */}
      <header className="notion-header">
        <div className="notion-header__title">
          <div className="notion-header__icon">⏰</div>
          <h1>إعدادات التوفر</h1>
        </div>

        <p className="notion-header__subtitle">
          إدارة أوقاتك المتاحة لحجوزات العملاء
        </p>

        <div className="notion-header__actions">
          <button
            className="notion-icon-btn"
            onClick={fetchData}
            disabled={loading}
            title="تحديث"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            className="notion-primary-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </header>

      {/* Messages */}
      {error && (
        <div className="message message--error">
          <AlertCircle size={18} />
          {error}
          <button onClick={() => setError(null)} style={{ marginRight: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: 'inherit' }}><XCircle size={16} /></button>
        </div>
      )}
      {success && (
        <div className="message message--success">
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      <div className="content-grid">
        {/* Weekly Schedule */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <CalendarDays size={20} className="text-law-navy" />
              الجدول الأسبوعي المعتاد
            </h3>
          </div>

          <div className="schedule-grid">
            {DAYS_ORDER.map(day => (
              <div key={day} className={`day-row ${weeklySchedule[day].enabled ? '' : 'day-row--disabled'}`}>
                <div className="day-header">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={weeklySchedule[day].enabled}
                      onChange={() => toggleDayEnabled(day)}
                    />
                    <div className="toggle-switch" />
                    <span className="day-name">{availabilityHelpers.getDayNameArabic(day)}</span>
                  </label>
                  <span className="day-status">
                    {weeklySchedule[day].enabled ? 'متاح' : 'غير متاح'}
                  </span>
                </div>

                {weeklySchedule[day].enabled && (
                  <div className="day-slots">
                    {weeklySchedule[day].slots.map((slot, idx) => (
                      <div key={idx} className="slot-row">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) => updateSlot(day, idx, 'start', e.target.value)}
                        />
                        <span className="slot-separator">إلى</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => updateSlot(day, idx, 'end', e.target.value)}
                        />
                        {weeklySchedule[day].slots.length > 1 && (
                          <button
                            className="remove-slot-btn"
                            onClick={() => removeSlot(day, idx)}
                            title="حذف الفترة"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      className="add-slot-btn"
                      onClick={() => addSlot(day)}
                    >
                      <Plus size={14} />
                      إضافة فترة أخرى
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: Settings & Exceptions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Booking Settings */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Settings size={20} className="text-law-navy" />
                قواعد الحجز
              </h3>
            </div>

            <div className="settings-form">
              <div className="form-group">
                <label>
                  <MapPin size={16} />
                  الموقع الافتراضي
                </label>
                <input
                  type="text"
                  value={defaultLocation}
                  onChange={(e) => setDefaultLocation(e.target.value)}
                  placeholder="مثال: Google Meet أو عنوان المكتب"
                />
              </div>

              <div className="form-group">
                <label>
                  <Timer size={16} />
                  المدة الفاصلة بين المواعيد
                </label>
                <select
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(Number(e.target.value))}
                >
                  <option value={0}>بدون فاصل</option>
                  <option value={5}>5 دقائق</option>
                  <option value={10}>10 دقائق</option>
                  <option value={15}>15 دقيقة</option>
                  <option value={30}>30 دقيقة</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <Calendar size={16} />
                  نطاق الحجز المسموح
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>الحد الأدنى (قبل الموعد)</span>
                    <select
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>الحد الأقصى (مستقبلاً)</span>
                    <select
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
              </div>

              <div className="form-group">
                <label>مدد الاجتماعات المتاحة</label>
                <div className="durations-grid">
                  {[15, 30, 45, 60].map(duration => (
                    <label
                      key={duration}
                      className={`duration-option ${allowedDurations.includes(duration) ? 'duration-option--selected' : ''}`}
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
          </div>

          {/* Exceptions Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <AlertCircle size={20} className="text-law-navy" />
                الاستثناءات والإجازات
              </h3>
              <button
                className="secondary-btn"
                onClick={() => setShowExceptionModal(true)}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                <Plus size={14} />
                جديد
              </button>
            </div>

            {exceptions.length === 0 ? (
              <div className="empty-exceptions">
                <Calendar size={32} style={{ opacity: 0.2, marginBottom: '8px' }} />
                <p>لا توجد استثناءات</p>
                <span>أضف أيام إجازة أو تغييرات خاصة</span>
              </div>
            ) : (
              <div className="exceptions-list">
                {exceptions.map(exception => (
                  <div key={exception.id} className="exception-item">
                    <div className="exception-info">
                      <span className="exception-date">
                        {new Date(exception.date).toLocaleDateString('ar-SA', {
                          month: 'short',
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </span>
                      {exception.reason && (
                        <span className="exception-reason">{exception.reason}</span>
                      )}
                    </div>
                    <span className={`exception-type ${exception.is_blocked ? 'exception-type--blocked' : ''}`}>
                      {exception.is_blocked ? 'مغلق' : 'معدل'}
                    </span>
                    <button
                      className="delete-exception-btn"
                      onClick={() => handleDeleteException(exception.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Exception Modal */}
      {showExceptionModal && (
        <div className="modal-overlay" onClick={() => setShowExceptionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>إضافة استثناء</h3>
              <button className="close-btn" onClick={() => setShowExceptionModal(false)}>
                <XCircle size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="message message--info" style={{ margin: 0, padding: '10px 16px', fontSize: '13px', background: 'var(--color-info-soft)', color: 'var(--color-info)', border: 'none' }}>
                <Info size={16} />
                سيؤدي هذا إلى تجاوز الجدول الأسبوعي لهذا اليوم المحدد.
              </div>

              <div className="form-group">
                <label>تاريخ الاستثناء</label>
                <input
                  type="date"
                  value={exceptionDate}
                  onChange={(e) => setExceptionDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>حالة التوفر</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label className={`duration-option ${exceptionIsBlocked ? 'duration-option--selected' : ''}`} style={{ flex: 1, justifyContent: 'center' }}>
                    <input
                      type="radio"
                      checked={exceptionIsBlocked}
                      onChange={() => setExceptionIsBlocked(true)}
                    />
                    غير متاح (مغلق)
                  </label>
                  <label className={`duration-option ${!exceptionIsBlocked ? 'duration-option--selected' : ''}`} style={{ flex: 1, justifyContent: 'center' }}>
                    <input
                      type="radio"
                      checked={!exceptionIsBlocked}
                      onChange={() => setExceptionIsBlocked(false)}
                    />
                    متاح (أوقات مخصصة)
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>السبب / الملاحظة</label>
                <input
                  type="text"
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                  placeholder="مثال: إجازة عيد، سفر عمل..."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowExceptionModal(false)}>
                إلغاء
              </button>
              <button className="btn-primary" onClick={handleAddException}>
                حفظ الاستثناء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAvailability;
