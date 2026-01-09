import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  Mail,
  Phone,
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
} from 'lucide-react';
import { publicBookingService, type PublicBookingInfo, type PublicBookingData } from '../../services/bookingService';
import type { AvailableSlot } from '../../services/availabilityService';

// ==========================================
// Types
// ==========================================

type Step = 'loading' | 'error' | 'expired' | 'date' | 'time' | 'info' | 'confirm' | 'success';

interface BookingState {
  date: string;
  time: string;
  duration: number;
  meetingType: 'in_person' | 'remote';
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string;
}

// ==========================================
// Main Component
// ==========================================

const PublicBooking: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState<Step>('loading');
  const [bookingInfo, setBookingInfo] = useState<PublicBookingInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);

  const [booking, setBooking] = useState<BookingState>({
    date: '',
    time: '',
    duration: 30,
    meetingType: 'in_person',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    notes: '',
  });

  // Fetch booking info on mount
  useEffect(() => {
    if (!token) {
      setStep('error');
      setError('رابط غير صالح');
      return;
    }

    const fetchBookingInfo = async () => {
      try {
        const info = await publicBookingService.getBookingInfo(token);
        setBookingInfo(info);

        // Set default duration
        if (info.allowed_durations?.length > 0) {
          setBooking(prev => ({ ...prev, duration: info.allowed_durations[0] }));
        }

        // Pre-fill client name if available
        if (info.client_name) {
          setBooking(prev => ({ ...prev, clientName: info.client_name || '' }));
        }

        setStep('date');
      } catch (err: any) {
        if (err.message?.includes('expired') || err.message?.includes('منتهي')) {
          setStep('expired');
        } else {
          setStep('error');
          setError(err.message || 'حدث خطأ في تحميل بيانات الحجز');
        }
      }
    };

    fetchBookingInfo();
  }, [token]);

  // Fetch available days when month changes
  useEffect(() => {
    if (!token || step === 'loading' || step === 'error' || step === 'expired') return;

    const fetchAvailableDays = async () => {
      try {
        const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        const days = await publicBookingService.getAvailableDays(token, monthStr);
        setAvailableDays(days);
      } catch (err) {
        console.error('Error fetching available days:', err);
      }
    };

    fetchAvailableDays();
  }, [token, currentMonth, step]);

  // Fetch available slots when date or duration changes
  useEffect(() => {
    if (!token || !booking.date || !booking.duration) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const slots = await publicBookingService.getAvailableSlots(token, booking.date, booking.duration);
        setAvailableSlots(slots);
      } catch (err) {
        console.error('Error fetching slots:', err);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [token, booking.date, booking.duration]);

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty slots for days before the first day
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, [currentMonth]);

  const isDateAvailable = (day: number): boolean => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return availableDays.includes(dateStr);
  };

  const isDatePast = (day: number): boolean => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Handlers
  const handleDateSelect = (day: number) => {
    if (!isDateAvailable(day) || isDatePast(day)) return;

    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setBooking(prev => ({ ...prev, date: dateStr, time: '' }));
    setStep('time');
  };

  const handleTimeSelect = (slot: AvailableSlot) => {
    setBooking(prev => ({ ...prev, time: slot.start }));
    setStep('info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return;

    // Validation
    if (!booking.clientName.trim()) {
      setError('يرجى إدخال الاسم');
      return;
    }
    if (!booking.clientEmail.trim()) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!booking.clientPhone.trim()) {
      setError('يرجى إدخال رقم الهاتف');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const data: PublicBookingData = {
        client_name: booking.clientName,
        client_email: booking.clientEmail,
        client_phone: booking.clientPhone,
        date: booking.date,
        time: booking.time,
        duration: booking.duration,
        meeting_type: booking.meetingType,
        notes: booking.notes || undefined,
      };

      const result = await publicBookingService.book(token, data);
      setBookingResult(result);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في إتمام الحجز');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'م' : 'ص';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  // Render helpers
  const renderHeader = () => (
    <div className="booking-header">
      {bookingInfo?.office_logo ? (
        <img src={bookingInfo.office_logo} alt={bookingInfo.office_name} className="office-logo" />
      ) : (
        <div className="office-logo-placeholder">
          <Building2 size={32} />
        </div>
      )}
      <div className="header-info">
        <h1>{bookingInfo?.office_name || 'حجز موعد'}</h1>
        <p>
          <User size={16} />
          {bookingInfo?.lawyer_name}
        </p>
      </div>
    </div>
  );

  const renderProgressBar = () => {
    const steps = ['التاريخ', 'الوقت', 'البيانات', 'تأكيد'];
    const currentIndex = step === 'date' ? 0 : step === 'time' ? 1 : step === 'info' ? 2 : step === 'confirm' ? 3 : -1;

    if (currentIndex < 0) return null;

    return (
      <div className="progress-bar">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`progress-step ${i <= currentIndex ? 'active' : ''} ${i < currentIndex ? 'completed' : ''}`}
          >
            <div className="step-circle">{i < currentIndex ? <CheckCircle size={16} /> : i + 1}</div>
            <span>{s}</span>
          </div>
        ))}
      </div>
    );
  };

  // Step: Loading
  if (step === 'loading') {
    return (
      <div className="booking-page">
        <div className="booking-container loading-state">
          <Loader2 className="spinner" size={48} />
          <p>جاري تحميل صفحة الحجز...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  // Step: Error
  if (step === 'error') {
    return (
      <div className="booking-page">
        <div className="booking-container error-state">
          <AlertCircle size={64} />
          <h2>حدث خطأ</h2>
          <p>{error || 'لم نتمكن من تحميل صفحة الحجز'}</p>
          <button onClick={() => navigate('/')}>العودة للرئيسية</button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  // Step: Expired
  if (step === 'expired') {
    return (
      <div className="booking-page">
        <div className="booking-container expired-state">
          <Clock size={64} />
          <h2>انتهت صلاحية الرابط</h2>
          <p>عذراً، هذا الرابط لم يعد صالحاً للاستخدام</p>
          <p className="hint">يرجى التواصل مع المكتب للحصول على رابط جديد</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  // Step: Success
  if (step === 'success') {
    return (
      <div className="booking-page">
        <div className="booking-container success-state">
          <CheckCircle size={64} />
          <h2>تم الحجز بنجاح!</h2>
          <p>تم تأكيد موعدك مع {bookingInfo?.lawyer_name}</p>

          <div className="booking-summary">
            <div className="summary-item">
              <Calendar size={18} />
              <span>{formatDate(booking.date)}</span>
            </div>
            <div className="summary-item">
              <Clock size={18} />
              <span>{formatTime(booking.time)} ({booking.duration} دقيقة)</span>
            </div>
            <div className="summary-item">
              {booking.meetingType === 'remote' ? <Video size={18} /> : <MapPin size={18} />}
              <span>{booking.meetingType === 'remote' ? 'اجتماع عن بعد' : bookingInfo?.default_location || 'حضوري'}</span>
            </div>
          </div>

          <p className="confirmation-note">
            سيتم إرسال تفاصيل الموعد إلى بريدك الإلكتروني ورقم هاتفك
          </p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <div className="booking-container">
        {renderHeader()}
        {renderProgressBar()}

        {/* Case info if available */}
        {bookingInfo?.case_title && (
          <div className="case-info-banner">
            <FileText size={16} />
            <span>القضية: {bookingInfo.case_title}</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* Step: Date Selection */}
        {step === 'date' && (
          <div className="step-content">
            <h2>اختر التاريخ</h2>

            {/* Duration selector */}
            <div className="duration-selector">
              <label>مدة الموعد:</label>
              <div className="duration-options">
                {bookingInfo?.allowed_durations?.map(d => (
                  <button
                    key={d}
                    type="button"
                    className={`duration-btn ${booking.duration === d ? 'active' : ''}`}
                    onClick={() => setBooking(prev => ({ ...prev, duration: d }))}
                  >
                    {d} دقيقة
                  </button>
                ))}
              </div>
            </div>

            {/* Meeting type selector */}
            <div className="meeting-type-selector">
              <label>نوع الموعد:</label>
              <div className="type-options">
                {bookingInfo?.meeting_types?.includes('in_person') && (
                  <button
                    type="button"
                    className={`type-btn ${booking.meetingType === 'in_person' ? 'active' : ''}`}
                    onClick={() => setBooking(prev => ({ ...prev, meetingType: 'in_person' }))}
                  >
                    <MapPin size={18} />
                    حضوري
                  </button>
                )}
                {bookingInfo?.meeting_types?.includes('remote') && (
                  <button
                    type="button"
                    className={`type-btn ${booking.meetingType === 'remote' ? 'active' : ''}`}
                    onClick={() => setBooking(prev => ({ ...prev, meetingType: 'remote' }))}
                  >
                    <Video size={18} />
                    عن بعد
                  </button>
                )}
              </div>
            </div>

            {/* Calendar */}
            <div className="calendar">
              <div className="calendar-header">
                <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                  <ChevronRight size={20} />
                </button>
                <span>
                  {currentMonth.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
                </span>
                <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                  <ChevronLeft size={20} />
                </button>
              </div>

              <div className="calendar-weekdays">
                {['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'].map(day => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="calendar-days">
                {calendarDays.map((day, i) => (
                  <div
                    key={i}
                    className={`calendar-day ${
                      day === null ? 'empty' : ''
                    } ${day && isDateAvailable(day) && !isDatePast(day) ? 'available' : ''
                    } ${day && isDatePast(day) ? 'past' : ''
                    } ${booking.date === `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` ? 'selected' : ''}`}
                    onClick={() => day && handleDateSelect(day)}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step: Time Selection */}
        {step === 'time' && (
          <div className="step-content">
            <button type="button" className="back-btn" onClick={() => setStep('date')}>
              <ChevronRight size={18} />
              تغيير التاريخ
            </button>

            <h2>اختر الوقت</h2>
            <p className="selected-date">{formatDate(booking.date)}</p>

            {loadingSlots ? (
              <div className="loading-slots">
                <Loader2 className="spinner" size={24} />
                <span>جاري تحميل الأوقات المتاحة...</span>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="no-slots">
                <Clock size={48} />
                <p>لا توجد أوقات متاحة في هذا اليوم</p>
                <button type="button" onClick={() => setStep('date')}>اختر يوماً آخر</button>
              </div>
            ) : (
              <div className="time-slots">
                {availableSlots.map(slot => (
                  <button
                    key={slot.start}
                    type="button"
                    className={`time-slot ${booking.time === slot.start ? 'selected' : ''}`}
                    onClick={() => handleTimeSelect(slot)}
                  >
                    {formatTime(slot.start)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Client Info */}
        {step === 'info' && (
          <div className="step-content">
            <button type="button" className="back-btn" onClick={() => setStep('time')}>
              <ChevronRight size={18} />
              تغيير الوقت
            </button>

            <h2>بياناتك</h2>

            <form onSubmit={(e) => { e.preventDefault(); setStep('confirm'); }}>
              <div className="form-group">
                <label>
                  <User size={16} />
                  الاسم الكامل *
                </label>
                <input
                  type="text"
                  value={booking.clientName}
                  onChange={(e) => setBooking(prev => ({ ...prev, clientName: e.target.value }))}
                  placeholder="أدخل اسمك الكامل"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <Mail size={16} />
                  البريد الإلكتروني *
                </label>
                <input
                  type="email"
                  value={booking.clientEmail}
                  onChange={(e) => setBooking(prev => ({ ...prev, clientEmail: e.target.value }))}
                  placeholder="example@email.com"
                  required
                  dir="ltr"
                />
              </div>

              <div className="form-group">
                <label>
                  <Phone size={16} />
                  رقم الهاتف *
                </label>
                <input
                  type="tel"
                  value={booking.clientPhone}
                  onChange={(e) => setBooking(prev => ({ ...prev, clientPhone: e.target.value }))}
                  placeholder="05xxxxxxxx"
                  required
                  dir="ltr"
                />
              </div>

              <div className="form-group">
                <label>
                  <FileText size={16} />
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={booking.notes}
                  onChange={(e) => setBooking(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="أي ملاحظات أو تفاصيل تود إضافتها..."
                  rows={3}
                />
              </div>

              <button type="submit" className="continue-btn">
                مراجعة الحجز
              </button>
            </form>
          </div>
        )}

        {/* Step: Confirmation */}
        {step === 'confirm' && (
          <div className="step-content">
            <button type="button" className="back-btn" onClick={() => setStep('info')}>
              <ChevronRight size={18} />
              تعديل البيانات
            </button>

            <h2>تأكيد الحجز</h2>

            <div className="confirmation-card">
              <h3>تفاصيل الموعد</h3>

              <div className="detail-row">
                <Calendar size={18} />
                <span>{formatDate(booking.date)}</span>
              </div>

              <div className="detail-row">
                <Clock size={18} />
                <span>{formatTime(booking.time)} ({booking.duration} دقيقة)</span>
              </div>

              <div className="detail-row">
                {booking.meetingType === 'remote' ? <Video size={18} /> : <MapPin size={18} />}
                <span>{booking.meetingType === 'remote' ? 'اجتماع عن بعد' : bookingInfo?.default_location || 'حضوري'}</span>
              </div>

              <hr />

              <h3>بياناتك</h3>

              <div className="detail-row">
                <User size={18} />
                <span>{booking.clientName}</span>
              </div>

              <div className="detail-row">
                <Mail size={18} />
                <span dir="ltr">{booking.clientEmail}</span>
              </div>

              <div className="detail-row">
                <Phone size={18} />
                <span dir="ltr">{booking.clientPhone}</span>
              </div>

              {booking.notes && (
                <>
                  <hr />
                  <div className="notes-section">
                    <h4>ملاحظات:</h4>
                    <p>{booking.notes}</p>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              className="confirm-btn"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="spinner" size={18} />
                  جاري تأكيد الحجز...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  تأكيد الحجز
                </>
              )}
            </button>
          </div>
        )}
      </div>
      <style>{styles}</style>
    </div>
  );
};

// ==========================================
// Styles
// ==========================================

const styles = `
  .booking-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    direction: rtl;
    font-family: 'Tajawal', 'Segoe UI', sans-serif;
  }

  .booking-container {
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 520px;
    padding: 32px;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Loading, Error, Expired, Success States */
  .loading-state,
  .error-state,
  .expired-state,
  .success-state {
    text-align: center;
    padding: 48px 24px;
  }

  .loading-state .spinner,
  .error-state svg,
  .expired-state svg,
  .success-state svg {
    color: #1E3A5F;
    margin-bottom: 24px;
  }

  .error-state svg { color: #DC2626; }
  .expired-state svg { color: #F59E0B; }
  .success-state svg { color: #10B981; }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .loading-state p,
  .error-state p,
  .expired-state p {
    color: #6B7280;
    font-size: 16px;
  }

  .error-state h2,
  .expired-state h2,
  .success-state h2 {
    font-size: 24px;
    color: #111827;
    margin-bottom: 12px;
  }

  .hint {
    color: #9CA3AF;
    font-size: 14px;
    margin-top: 8px;
  }

  .error-state button,
  .expired-state button {
    margin-top: 24px;
    padding: 12px 24px;
    background: #1E3A5F;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .error-state button:hover,
  .expired-state button:hover {
    background: #2d4a6f;
  }

  /* Success State */
  .success-state .booking-summary {
    background: #F0FDF4;
    border-radius: 12px;
    padding: 20px;
    margin: 24px 0;
  }

  .success-state .summary-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    color: #111827;
  }

  .success-state .summary-item svg {
    color: #10B981;
  }

  .confirmation-note {
    color: #6B7280;
    font-size: 14px;
  }

  /* Header */
  .booking-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding-bottom: 24px;
    border-bottom: 1px solid #E5E7EB;
    margin-bottom: 24px;
  }

  .office-logo {
    width: 64px;
    height: 64px;
    border-radius: 12px;
    object-fit: contain;
    background: #F9FAFB;
  }

  .office-logo-placeholder {
    width: 64px;
    height: 64px;
    border-radius: 12px;
    background: linear-gradient(135deg, #1E3A5F 0%, #2d4a6f 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .header-info h1 {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 4px 0;
  }

  .header-info p {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #6B7280;
    font-size: 14px;
    margin: 0;
  }

  /* Progress Bar */
  .progress-bar {
    display: flex;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .progress-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    flex: 1;
    position: relative;
  }

  .progress-step::after {
    content: '';
    position: absolute;
    top: 14px;
    left: -50%;
    width: 100%;
    height: 2px;
    background: #E5E7EB;
    z-index: 0;
  }

  .progress-step:first-child::after {
    display: none;
  }

  .progress-step.completed::after {
    background: #1E3A5F;
  }

  .step-circle {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #E5E7EB;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: #6B7280;
    z-index: 1;
    position: relative;
  }

  .progress-step.active .step-circle,
  .progress-step.completed .step-circle {
    background: #1E3A5F;
    color: white;
  }

  .progress-step span {
    font-size: 12px;
    color: #9CA3AF;
  }

  .progress-step.active span {
    color: #1E3A5F;
    font-weight: 500;
  }

  /* Case Info Banner */
  .case-info-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: #EFF6FF;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
    color: #1E40AF;
  }

  /* Error Banner */
  .error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: #FEF2F2;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
    color: #DC2626;
  }

  .error-banner button {
    margin-right: auto;
    background: none;
    border: none;
    color: #DC2626;
    cursor: pointer;
    font-size: 18px;
    padding: 0;
    line-height: 1;
  }

  /* Step Content */
  .step-content h2 {
    font-size: 18px;
    font-weight: 600;
    color: #111827;
    margin: 0 0 16px 0;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    color: #6B7280;
    font-size: 14px;
    cursor: pointer;
    padding: 0;
    margin-bottom: 16px;
  }

  .back-btn:hover {
    color: #1E3A5F;
  }

  /* Duration Selector */
  .duration-selector,
  .meeting-type-selector {
    margin-bottom: 24px;
  }

  .duration-selector label,
  .meeting-type-selector label {
    display: block;
    font-size: 14px;
    color: #6B7280;
    margin-bottom: 8px;
  }

  .duration-options,
  .type-options {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .duration-btn,
  .type-btn {
    padding: 10px 16px;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    background: white;
    font-size: 14px;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s;
  }

  .type-btn {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .duration-btn:hover,
  .type-btn:hover {
    border-color: #1E3A5F;
    color: #1E3A5F;
  }

  .duration-btn.active,
  .type-btn.active {
    background: #1E3A5F;
    border-color: #1E3A5F;
    color: white;
  }

  /* Calendar */
  .calendar {
    border: 1px solid #E5E7EB;
    border-radius: 12px;
    overflow: hidden;
  }

  .calendar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: #F9FAFB;
    font-weight: 600;
    color: #111827;
  }

  .calendar-header button {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    background: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6B7280;
    transition: all 0.2s;
  }

  .calendar-header button:hover {
    background: #1E3A5F;
    color: white;
  }

  .calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background: #F9FAFB;
    border-bottom: 1px solid #E5E7EB;
  }

  .calendar-weekdays div {
    padding: 12px 8px;
    text-align: center;
    font-size: 12px;
    font-weight: 500;
    color: #6B7280;
  }

  .calendar-days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    padding: 12px;
  }

  .calendar-day {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #D1D5DB;
    border-radius: 8px;
    cursor: default;
  }

  .calendar-day.available {
    color: #111827;
    cursor: pointer;
    transition: all 0.2s;
  }

  .calendar-day.available:hover {
    background: #EFF6FF;
    color: #1E3A5F;
  }

  .calendar-day.past {
    color: #E5E7EB;
  }

  .calendar-day.selected {
    background: #1E3A5F;
    color: white;
  }

  /* Time Slots */
  .selected-date {
    color: #6B7280;
    font-size: 14px;
    margin-bottom: 16px;
  }

  .loading-slots {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 48px;
    color: #6B7280;
  }

  .no-slots {
    text-align: center;
    padding: 48px 24px;
  }

  .no-slots svg {
    color: #D1D5DB;
    margin-bottom: 16px;
  }

  .no-slots p {
    color: #6B7280;
    margin-bottom: 16px;
  }

  .no-slots button {
    padding: 10px 20px;
    background: #1E3A5F;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }

  .time-slots {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .time-slot {
    padding: 14px 12px;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    background: white;
    font-size: 14px;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .time-slot:hover {
    border-color: #1E3A5F;
    color: #1E3A5F;
  }

  .time-slot.selected {
    background: #1E3A5F;
    border-color: #1E3A5F;
    color: white;
  }

  /* Form */
  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 8px;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #1E3A5F;
  }

  .form-group input::placeholder,
  .form-group textarea::placeholder {
    color: #9CA3AF;
  }

  .continue-btn,
  .confirm-btn {
    width: 100%;
    padding: 14px;
    background: #1E3A5F;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: background 0.2s;
    margin-top: 8px;
  }

  .continue-btn:hover,
  .confirm-btn:hover {
    background: #2d4a6f;
  }

  .confirm-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* Confirmation Card */
  .confirmation-card {
    background: #F9FAFB;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
  }

  .confirmation-card h3 {
    font-size: 14px;
    font-weight: 600;
    color: #6B7280;
    margin: 0 0 16px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .detail-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    font-size: 15px;
    color: #111827;
  }

  .detail-row svg {
    color: #1E3A5F;
    flex-shrink: 0;
  }

  .confirmation-card hr {
    border: none;
    border-top: 1px solid #E5E7EB;
    margin: 16px 0;
  }

  .notes-section h4 {
    font-size: 13px;
    font-weight: 500;
    color: #6B7280;
    margin: 0 0 8px 0;
  }

  .notes-section p {
    font-size: 14px;
    color: #374151;
    margin: 0;
    line-height: 1.6;
  }

  /* Responsive */
  @media (max-width: 480px) {
    .booking-page {
      padding: 12px;
    }

    .booking-container {
      padding: 24px 20px;
    }

    .time-slots {
      grid-template-columns: repeat(2, 1fr);
    }

    .progress-step span {
      display: none;
    }
  }
`;

export default PublicBooking;
