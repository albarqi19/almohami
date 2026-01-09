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
  MapPin
} from 'lucide-react';
import {
  availabilityService,
  availabilityHelpers,
  type LawyerAvailability,
  type WeeklySchedule,
  type DaySchedule,
  type TimeSlot,
  type AvailabilityException,
  DEFAULT_WEEKLY_SCHEDULE
} from '../../services/availabilityService';

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
      <div className="loading-state">
        <RefreshCw size={32} className="animate-spin" />
        <p>جاري تحميل إعدادات التوفر...</p>
      </div>
    );
  }

  return (
    <div className="availability-page">
      {/* Header */}
      <header className="page-header">
        <div className="page-header__start">
          <div className="page-header__title">
            <Clock size={22} />
            <span>إعدادات التوفر</span>
          </div>
          <p className="page-header__subtitle">
            حدد أوقات توفرك لاستقبال مواعيد العملاء
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={handleSave}
          disabled={saving}
        >
          <Save size={18} />
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </header>

      {/* Messages */}
      {error && (
        <div className="message message--error">
          <AlertCircle size={18} />
          {error}
          <button onClick={() => setError(null)}><XCircle size={16} /></button>
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
          <h3 className="card-title">
            <Calendar size={18} />
            الجدول الأسبوعي
          </h3>

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
                    <span className="toggle-switch" />
                    <span className="day-name">{availabilityHelpers.getDayNameArabic(day)}</span>
                  </label>
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
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      className="add-slot-btn"
                      onClick={() => addSlot(day)}
                    >
                      <Plus size={14} />
                      إضافة فترة
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="card">
          <h3 className="card-title">
            <Settings size={18} />
            إعدادات الحجز
          </h3>

          <div className="settings-form">
            <div className="form-group">
              <label>
                <MapPin size={14} />
                الموقع الافتراضي
              </label>
              <input
                type="text"
                value={defaultLocation}
                onChange={(e) => setDefaultLocation(e.target.value)}
                placeholder="مثال: مكتب المحاماة - شارع الملك فهد"
              />
            </div>

            <div className="form-group">
              <label>الفاصل الزمني بين المواعيد (بالدقائق)</label>
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

            <div className="form-row">
              <div className="form-group">
                <label>الحد الأدنى للحجز المسبق</label>
                <select
                  value={minBookingHours}
                  onChange={(e) => setMinBookingHours(Number(e.target.value))}
                >
                  <option value={1}>ساعة واحدة</option>
                  <option value={2}>ساعتين</option>
                  <option value={4}>4 ساعات</option>
                  <option value={12}>12 ساعة</option>
                  <option value={24}>24 ساعة</option>
                  <option value={48}>48 ساعة</option>
                </select>
              </div>

              <div className="form-group">
                <label>الحد الأقصى للحجز المسبق</label>
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

            <div className="form-group">
              <label>مدد الاجتماعات المتاحة</label>
              <div className="durations-grid">
                {[15, 30, 45, 60, 90, 120].map(duration => (
                  <label
                    key={duration}
                    className={`duration-option ${allowedDurations.includes(duration) ? 'duration-option--selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={allowedDurations.includes(duration)}
                      onChange={() => toggleDuration(duration)}
                    />
                    {availabilityHelpers.formatDuration(duration)}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Exceptions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <AlertCircle size={18} />
              الاستثناءات
            </h3>
            <button
              className="secondary-btn"
              onClick={() => setShowExceptionModal(true)}
            >
              <Plus size={16} />
              إضافة استثناء
            </button>
          </div>

          {exceptions.length === 0 ? (
            <div className="empty-exceptions">
              <p>لا توجد استثناءات</p>
              <span>أضف أيام إجازة أو تغييرات مؤقتة في الجدول</span>
            </div>
          ) : (
            <div className="exceptions-list">
              {exceptions.map(exception => (
                <div key={exception.id} className="exception-item">
                  <div className="exception-info">
                    <span className="exception-date">
                      {new Date(exception.date).toLocaleDateString('ar-SA', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    {exception.reason && (
                      <span className="exception-reason">{exception.reason}</span>
                    )}
                  </div>
                  <span className={`exception-type ${exception.is_blocked ? 'exception-type--blocked' : ''}`}>
                    {exception.is_blocked ? 'مغلق' : 'أوقات مخصصة'}
                  </span>
                  <button
                    className="delete-exception-btn"
                    onClick={() => handleDeleteException(exception.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Exception Modal */}
      {showExceptionModal && (
        <div className="modal-overlay" onClick={() => setShowExceptionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>إضافة استثناء</h3>
              <button className="close-btn" onClick={() => setShowExceptionModal(false)}>
                <XCircle size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>التاريخ</label>
                <input
                  type="date"
                  value={exceptionDate}
                  onChange={(e) => setExceptionDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>نوع الاستثناء</label>
                <div className="radio-group">
                  <label className={`radio-option ${exceptionIsBlocked ? 'radio-option--selected' : ''}`}>
                    <input
                      type="radio"
                      checked={exceptionIsBlocked}
                      onChange={() => setExceptionIsBlocked(true)}
                    />
                    يوم مغلق بالكامل
                  </label>
                  <label className={`radio-option ${!exceptionIsBlocked ? 'radio-option--selected' : ''}`}>
                    <input
                      type="radio"
                      checked={!exceptionIsBlocked}
                      onChange={() => setExceptionIsBlocked(false)}
                    />
                    أوقات مخصصة
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>السبب (اختياري)</label>
                <input
                  type="text"
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                  placeholder="مثال: إجازة، موعد خارجي..."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowExceptionModal(false)}>
                إلغاء
              </button>
              <button className="btn-primary" onClick={handleAddException}>
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .availability-page {
          padding: 0;
          min-height: 100vh;
          background: var(--color-bg-secondary, #f9fafb);
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px 24px;
          background: white;
          border-bottom: 1px solid var(--color-border, #e5e7eb);
        }

        .page-header__title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .page-header__subtitle {
          font-size: 14px;
          color: var(--color-text-secondary, #6b7280);
          margin: 0;
        }

        .primary-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          background: var(--law-navy, #1E3A5F);
          color: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }

        .primary-btn:hover {
          background: #2d4a6f;
        }

        .primary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .secondary-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid var(--color-border, #e5e7eb);
          background: white;
          font-size: 13px;
          cursor: pointer;
        }

        .secondary-btn:hover {
          background: var(--color-bg-tertiary, #f3f4f6);
        }

        .message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          margin: 0 24px;
          margin-top: 16px;
          border-radius: 8px;
          font-size: 14px;
        }

        .message--error {
          background: #FEF2F2;
          color: #DC2626;
        }

        .message--success {
          background: #ECFDF5;
          color: #059669;
        }

        .message button {
          margin-right: auto;
          background: none;
          border: none;
          cursor: pointer;
          color: inherit;
          opacity: 0.7;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          padding: 24px;
        }

        .card {
          background: white;
          border-radius: 12px;
          border: 1px solid var(--color-border, #e5e7eb);
          padding: 20px;
        }

        .card:first-child {
          grid-column: 1 / -1;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 16px;
        }

        .card-header .card-title {
          margin: 0;
        }

        .schedule-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .day-row {
          padding: 12px;
          border-radius: 8px;
          border: 1px solid var(--color-border, #e5e7eb);
        }

        .day-row--disabled {
          background: var(--color-bg-secondary, #f9fafb);
        }

        .day-header {
          display: flex;
          align-items: center;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .toggle-label input {
          display: none;
        }

        .toggle-switch {
          width: 40px;
          height: 22px;
          background: var(--color-bg-tertiary, #e5e7eb);
          border-radius: 11px;
          position: relative;
          transition: background 0.2s;
        }

        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .toggle-label input:checked + .toggle-switch {
          background: var(--law-navy, #1E3A5F);
        }

        .toggle-label input:checked + .toggle-switch::after {
          transform: translateX(18px);
        }

        .day-name {
          font-weight: 500;
        }

        .day-slots {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--color-border, #e5e7eb);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .slot-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .slot-row input[type="time"] {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid var(--color-border, #e5e7eb);
          font-size: 14px;
        }

        .slot-separator {
          color: var(--color-text-secondary, #6b7280);
          font-size: 13px;
        }

        .remove-slot-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--color-text-secondary, #6b7280);
          cursor: pointer;
        }

        .remove-slot-btn:hover {
          background: #FEF2F2;
          color: #DC2626;
        }

        .add-slot-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px dashed var(--color-border, #e5e7eb);
          background: transparent;
          font-size: 13px;
          color: var(--color-text-secondary, #6b7280);
          cursor: pointer;
          width: fit-content;
        }

        .add-slot-btn:hover {
          border-color: var(--law-navy, #1E3A5F);
          color: var(--law-navy, #1E3A5F);
        }

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .form-group input,
        .form-group select {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--color-border, #e5e7eb);
          font-size: 14px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .durations-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .duration-option {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid var(--color-border, #e5e7eb);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .duration-option:hover {
          border-color: var(--law-navy, #1E3A5F);
        }

        .duration-option--selected {
          background: rgba(30, 58, 95, 0.08);
          border-color: var(--law-navy, #1E3A5F);
        }

        .duration-option input {
          display: none;
        }

        .empty-exceptions {
          text-align: center;
          padding: 30px;
          color: var(--color-text-secondary, #6b7280);
        }

        .empty-exceptions p {
          margin: 0;
          font-weight: 500;
        }

        .empty-exceptions span {
          font-size: 13px;
        }

        .exceptions-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .exception-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid var(--color-border, #e5e7eb);
        }

        .exception-info {
          flex: 1;
        }

        .exception-date {
          font-weight: 500;
          display: block;
        }

        .exception-reason {
          font-size: 12px;
          color: var(--color-text-secondary, #6b7280);
        }

        .exception-type {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          background: #EFF6FF;
          color: #3B82F6;
        }

        .exception-type--blocked {
          background: #FEF2F2;
          color: #EF4444;
        }

        .delete-exception-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--color-text-secondary, #6b7280);
          cursor: pointer;
        }

        .delete-exception-btn:hover {
          background: #FEF2F2;
          color: #DC2626;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          color: var(--color-text-secondary, #6b7280);
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 400px;
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--color-border, #e5e7eb);
        }

        .modal-header h3 {
          margin: 0;
          font-size: 16px;
        }

        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-text-secondary, #6b7280);
        }

        .modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .radio-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .radio-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid var(--color-border, #e5e7eb);
          cursor: pointer;
        }

        .radio-option--selected {
          border-color: var(--law-navy, #1E3A5F);
          background: rgba(30, 58, 95, 0.05);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 20px;
          border-top: 1px solid var(--color-border, #e5e7eb);
        }

        .btn-secondary,
        .btn-primary {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-secondary {
          border: 1px solid var(--color-border, #e5e7eb);
          background: white;
        }

        .btn-primary {
          border: none;
          background: var(--law-navy, #1E3A5F);
          color: white;
        }

        @media (max-width: 900px) {
          .content-grid {
            grid-template-columns: 1fr;
          }

          .card:first-child {
            grid-column: 1;
          }
        }

        @media (max-width: 640px) {
          .page-header {
            flex-direction: column;
            gap: 16px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default MyAvailability;
