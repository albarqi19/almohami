import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  ArrowLeft,
  Globe,
} from 'lucide-react';
import { publicBookingService, type PublicBookingInfo, type PublicBookingData } from '../../services/bookingService';
import type { AvailableSlot } from '../../services/availabilityService';

// ==========================================
// Types
// ==========================================

type Step = 'loading' | 'error' | 'expired' | 'date' | 'time' | 'info' | 'success';

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
    duration: 30, // will be updated from info
    meetingType: 'remote', // default
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

        // Set defaults
        if (info.allowed_durations?.length > 0) {
          setBooking(prev => ({ ...prev, duration: info.allowed_durations[0] }));
        }
        if (info.meeting_types?.length > 0) {
          setBooking(prev => ({ ...prev, meetingType: info.meeting_types[0] }));
        } else {
          // Fallback default
          setBooking(prev => ({ ...prev, meetingType: 'remote' }));
        }

        if (info.client_name) setBooking(prev => ({ ...prev, clientName: info.client_name || '' }));

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

  // Fetch available days
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

  // Fetch slots
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

  // Logic
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [currentMonth]);

  const isDateAvailable = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return availableDays.includes(dateStr);
  };

  const isDatePast = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleDateSelect = (day: number) => {
    if (!isDateAvailable(day) || isDatePast(day)) return;
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setBooking(prev => ({ ...prev, date: dateStr, time: '' }));
    setStep('time');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTimeSelect = (slot: AvailableSlot) => {
    setBooking(prev => ({ ...prev, time: slot.start }));
    setStep('info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!booking.clientName.trim() || !booking.clientEmail.trim() || !booking.clientPhone.trim()) {
      setError('يرجى تعبئة جميع الحقول المطلوبة');
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في إتمام الحجز');
    } finally {
      setSubmitting(false);
    }
  };

  // Formatters
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'م' : 'ص';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  // Helper Renderers
  const renderLogo = () => (
    <div className="notion-logo-container">
      {bookingInfo?.office_logo ? (
        <img src={bookingInfo.office_logo} alt={bookingInfo.office_name} />
      ) : (
        <div className="placeholder-logo"><Building2 size={24} /></div>
      )}
    </div>
  );

  // States
  if (step === 'loading') return <div className="full-screen-center"><Loader2 className="spinner" size={40} /><p>جاري التحميل...</p><style>{styles}</style></div>;
  if (step === 'error') return <div className="full-screen-center error"><AlertCircle size={48} /><p>{error}</p><style>{styles}</style></div>;
  if (step === 'expired') return <div className="full-screen-center warn"><Clock size={48} /><p>الرابط منتهي الصلاحية</p><style>{styles}</style></div>;
  if (step === 'success') {
    return (
      <div className="notion-page">
        <div className="notion-card success-card">
          <div className="success-icon"><CheckCircle size={64} /></div>
          <h1>تم تأكيد الحجز بنجاح!</h1>
          <p className="success-subtitle">موعدك مع {bookingInfo?.lawyer_name} جاهز.</p>

          <div className="notion-divider"></div>

          <div className="meeting-details-box">
            <div className="detail-item">
              <Calendar size={18} />
              <span>{formatDate(booking.date)}</span>
            </div>
            <div className="detail-item">
              <Clock size={18} />
              <span>{formatTime(booking.time)} ({booking.duration} دقيقة)</span>
            </div>
            <div className="detail-item">
              {bookingResult?.meeting_details?.meeting_type === 'remote' ? <Video size={18} /> : <MapPin size={18} />}
              <span>{bookingResult?.meeting_details?.meeting_type === 'remote' ? 'اجتماع عن بعد' : bookingResult?.meeting_details?.location || 'حضوري'}</span>
            </div>
            {bookingResult?.meeting_details?.video_meeting_url && (
              <div className="detail-item link-item">
                <Globe size={18} />
                <a href={bookingResult.meeting_details.video_meeting_url} target="_blank" rel="noopener noreferrer">رابط الاجتماع</a>
              </div>
            )}
          </div>

          <p className="footer-note">تم إرسال التفاصيل إلى بريدك الإلكتروني.</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="notion-page">
      {/* Top Navigation / Branding */}
      <header className="notion-header">
        <div className="brand">
          {renderLogo()}
          <div className="brand-text">
            <h1>{bookingInfo?.office_name}</h1>
            <span className="badge">حجز موعد</span>
          </div>
        </div>
      </header>

      <main className="notion-main">
        {/* Context Card */}
        <div className="context-card">
          <div className="lawyer-avatar">
            {bookingInfo?.lawyer_avatar ? <img src={bookingInfo.lawyer_avatar} alt="" /> : <User size={32} />}
          </div>
          <div className="context-info">
            <h2>{bookingInfo?.lawyer_name}</h2>
            <p>مدة الجلسة: {booking.duration} دقيقة • {booking.meetingType === 'remote' ? 'عن بعد' : 'حضوري'}</p>
          </div>
        </div>

        {error && (
          <div className="notion-alert error">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Stepper Logic */}
        <div className="step-container">
          {step === 'date' && (
            <div className="fade-in">
              <h3 className="step-title">اختر يوماً مناسباً</h3>

              <div className="settings-pills">
                {/* Duration Toggles */}
                <div className="pill-group">
                  {bookingInfo?.allowed_durations.map(d => (
                    <button
                      key={d}
                      className={`pill-btn ${booking.duration === d ? 'active' : ''}`}
                      onClick={() => setBooking(prev => ({ ...prev, duration: d }))}
                    >
                      {d} دقيقة
                    </button>
                  ))}
                </div>

                {/* Type Toggles */}
                {bookingInfo?.meeting_types && bookingInfo.meeting_types.length > 1 && (
                  <div className="pill-group">
                    <button
                      className={`pill-btn ${booking.meetingType === 'in_person' ? 'active' : ''}`}
                      onClick={() => setBooking(prev => ({ ...prev, meetingType: 'in_person' }))}
                    >
                      حضوري
                    </button>
                    <button
                      className={`pill-btn ${booking.meetingType === 'remote' ? 'active' : ''}`}
                      onClick={() => setBooking(prev => ({ ...prev, meetingType: 'remote' }))}
                    >
                      عن بعد
                    </button>
                  </div>
                )}
              </div>

              <div className="notion-calendar">
                <div className="calendar-nav">
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                    <ChevronRight size={20} />
                  </button>
                  <span>{currentMonth.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}</span>
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                    <ChevronLeft size={20} />
                  </button>
                </div>
                <div className="calendar-grid">
                  {['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'].map(d => <div key={d} className="wday">{d}</div>)}
                  {calendarDays.map((day, i) => {
                    const available = day && isDateAvailable(day) && !isDatePast(day);
                    const isSelected = day && booking.date === `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                    return (
                      <div
                        key={i}
                        className={`day-cell ${!day ? 'empty' : ''} ${available ? 'available' : ''} ${isSelected ? 'selected' : ''}`}
                        onClick={() => day && handleDateSelect(day)}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 'time' && (
            <div className="fade-in">
              <button className="back-link" onClick={() => setStep('date')}>
                <ArrowLeft size={16} /> رجوع للتاريخ
              </button>
              <h3 className="step-title">اختر وقتاً في {formatDate(booking.date)}</h3>

              {loadingSlots ? (
                <div className="slots-loading"><Loader2 className="spinner" /> جاري البحث عن مواعيد...</div>
              ) : availableSlots.length === 0 ? (
                <div className="empty-state">لا توجد مواعيد متاحة في هذا اليوم</div>
              ) : (
                <div className="slots-grid">
                  {availableSlots.map(slot => (
                    <button key={slot.start} className="time-btn" onClick={() => handleTimeSelect(slot)}>
                      {formatTime(slot.start)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'info' && (
            <div className="fade-in">
              <button className="back-link" onClick={() => setStep('time')}>
                <ArrowLeft size={16} /> رجوع للوقت
              </button>
              <h3 className="step-title">أكمل بياناتك</h3>

              <div className="booking-summary-mini">
                <span className="tag">{formatDate(booking.date)}</span>
                <span className="tag">{formatTime(booking.time)}</span>
              </div>

              <form className="notion-form" onSubmit={handleSubmit}>
                <div className="field">
                  <label>الاسم الكامل</label>
                  <input
                    type="text"
                    placeholder="الاسم الثلاثي"
                    value={booking.clientName}
                    onChange={e => setBooking(prev => ({ ...prev, clientName: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>البريد الإلكتروني</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    dir="ltr"
                    value={booking.clientEmail}
                    onChange={e => setBooking(prev => ({ ...prev, clientEmail: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>رقم الهاتف</label>
                  <input
                    type="tel"
                    placeholder="05xxxxxxxxx"
                    dir="ltr"
                    value={booking.clientPhone}
                    onChange={e => setBooking(prev => ({ ...prev, clientPhone: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>ملاحظات إضافية (اختياري)</label>
                  <textarea
                    rows={3}
                    value={booking.notes}
                    onChange={e => setBooking(prev => ({ ...prev, notes: e.target.value }))}
                  ></textarea>
                </div>

                <button type="submit" className="primary-btn" disabled={submitting}>
                  {submitting ? <Loader2 className="spinner" size={18} /> : <span>تأكيد الحجز</span>}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      <style>{styles}</style>
    </div>
  );
};

// ==========================================
// Notion Styles (Mobile First)
// ==========================================

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');

  :root {
      --bg: #F7F7F5; /* Notion default bg */
      --card-bg: #FFFFFF;
      --text: #37352F;
      --text-gray: #9B9A97;
      --border: #E9E9E7;
      --primary: #232323; /* Dark approach for primary */
      --primary-hover: #000000;
      --accent-blue: #2383E2;
      --danger: #EB5757;
      --success: #27AE60;
  }

  * { box-sizing: border-box; }

  .notion-page {
    min-height: 100vh;
    background: var(--bg);
    font-family: 'Tajawal', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--text);
    direction: rtl;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 40px;
  }

  /* Header */
  .notion-header {
      width: 100%;
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      padding: 16px 20px;
      display: flex;
      justify-content: center;
      position: sticky;
      top: 0;
      z-index: 100;
  }
  .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 600px;
      width: 100%;
  }
  .notion-logo-container img {
      width: 40px;
      height: 40px;
      border-radius: 6px;
      object-fit: cover;
  }
  .placeholder-logo {
      width: 40px;
      height: 40px;
      background: var(--bg);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-gray);
  }
  .brand-text h1 {
      font-size: 16px;
      font-weight: 700;
      margin: 0;
      color: var(--text);
  }
  .badge {
      font-size: 11px;
      background: rgba(35, 131, 226, 0.1);
      color: var(--accent-blue);
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 500;
  }

  /* Main Container */
  .notion-main {
      width: 100%;
      max-width: 500px; /* Mobile focused max-width */
      padding: 20px;
      margin-top: 10px;
  }

  /* Context Card */
  .context-card {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 30px;
      padding: 10px;
  }
  .lawyer-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      overflow: hidden;
      background: #eee;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
  }
  .lawyer-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .context-info h2 {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 4px 0;
  }
  .context-info p {
      font-size: 14px;
      color: var(--text-gray);
      margin: 0;
  }

  /* Step Container */
  .step-container {
      background: transparent;
  }
  .step-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
  }

  /* Pills (Settings) */
  .settings-pills {
      margin-bottom: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
  }
  .pill-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
  }
  .pill-btn {
      background: var(--card-bg);
      border: 1px solid var(--border);
      padding: 8px 16px;
      border-radius: 20px;
      font-family: inherit;
      font-size: 13px;
      cursor: pointer;
      color: var(--text);
      transition: all 0.2s;
  }
  .pill-btn:hover { background: #f0f0f0; }
  .pill-btn.active {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
  }

  /* Calendar */
  .notion-calendar {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
  }
  .calendar-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
  }
  .calendar-nav button {
      background: transparent;
      border: none;
      color: var(--text);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
  }
  .calendar-nav button:hover { background: #eee; }
  .calendar-nav span { font-weight: 600; font-size: 16px; }

  .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 8px;
      text-align: center;
  }
  .wday {
      color: var(--text-gray);
      font-size: 12px;
      margin-bottom: 8px;
  }
  .day-cell {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      font-size: 14px;
      color: #ccc;
      cursor: default;
  }
  .day-cell.available {
      color: var(--text);
      background: #f9f9f9;
      cursor: pointer;
      font-weight: 500;
  }
  .day-cell.available:hover {
      background: #eaeaea;
  }
  .day-cell.selected {
      background: var(--primary);
      color: white;
  }

  /* Time Slots */
  .slots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 12px;
  }
  .time-btn {
      background: var(--card-bg);
      border: 1px solid var(--border);
      padding: 12px;
      border-radius: 8px;
      font-family: inherit;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
  }
  .time-btn:hover {
      border-color: var(--primary);
      transform: translateY(-2px);
  }

  /* Form */
  .notion-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
  }
  .field label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-gray);
      margin-bottom: 8px;
  }
  .field input, .field textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--card-bg);
      font-family: inherit;
      font-size: 15px;
      transition: border-color 0.2s;
  }
  .field input:focus, .field textarea:focus {
      outline: none;
      border-color: var(--accent-blue);
  }

  .primary-btn {
      background: var(--primary);
      color: white;
      border: none;
      padding: 16px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 10px;
      display: flex;
      justify-content: center;
      align-items: center;
  }
  .primary-btn:disabled { opacity: 0.7; }

  /* Back Button */
  .back-link {
      display: flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      color: var(--text-gray);
      font-size: 14px;
      cursor: pointer;
      margin-bottom: 16px;
      padding: 0;
  }
  .back-link:hover { color: var(--text); }

  /* Full Screen States */
  .full-screen-center {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: var(--bg);
      gap: 16px;
      color: var(--text-gray);
  }
  .spinner { animation: spin 1s linear infinite; color: var(--text-gray); }
  @keyframes spin { 100% { transform: rotate(360deg); } }

  .booking-summary-mini {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
  }
  .tag {
      background: #EAEAE8;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 13px;
      color: var(--text);
  }

  /* Success Card */
  .success-card {
      background: var(--card-bg);
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      max-width: 480px;
      width: 100%;
      margin-top: 40px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  }
  .success-icon { color: var(--success); margin-bottom: 20px; }
  .success-card h1 { font-size: 24px; margin-bottom: 8px; }
  .success-subtitle { color: var(--text-gray); margin-bottom: 30px; }
  .notion-divider { height: 1px; background: var(--border); margin: 20px 0; }
  
  .meeting-details-box {
      background: var(--bg);
      padding: 20px;
      border-radius: 8px;
      text-align: right;
      display: flex;
      flex-direction: column;
      gap: 12px;
  }
  .detail-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
  }
  .link-item a { color: var(--accent-blue); text-decoration: none; }
  .footer-note { font-size: 13px; color: var(--text-gray); margin-top: 24px; }

  /* Responsive Mobile Tweaks */
  @media (max-width: 480px) {
      .notion-main { padding: 16px; max-width: 100%; }
      .calendar-grid { gap: 4px; }
      .day-cell { font-size: 14px; border-radius: 6px; }
      .success-card { padding: 24px; margin-top: 20px; }
      .primary-btn { position: sticky; bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
  }
`;

export default PublicBooking;
