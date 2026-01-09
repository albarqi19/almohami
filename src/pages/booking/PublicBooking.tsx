import React, { useState, useEffect, useMemo, useRef } from 'react';
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

type Step = 'loading' | 'error' | 'expired' | 'booking' | 'success';

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
  const [showFullForm, setShowFullForm] = useState(false);

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

  const slotsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

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
        }

        if (info.client_name) {
          setBooking(prev => ({ ...prev, clientName: info.client_name || '' }));
          setShowFullForm(false); // If name exists, we might hide form partially initially
        } else {
          setShowFullForm(true);
        }

        setStep('booking');
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
    if (!token || step !== 'booking') return;

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
      setAvailableSlots([]); // clear previous
      try {
        const slots = await publicBookingService.getAvailableSlots(token, booking.date, booking.duration);
        setAvailableSlots(slots);

        // Scroll to slots if date selected
        if (slotsRef.current) {
          setTimeout(() => slotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }

      } catch (err) {
        console.error('Error fetching slots:', err);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [token, booking.date, booking.duration]);

  // Logic
  const daysList = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= lastDay; i++) {
      const date = new Date(year, month, i);
      if (date >= today) {
        days.push(date);
      }
    }
    return days;
  }, [currentMonth]);


  const isDateAvailable = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return availableDays.includes(dateStr);
  };

  const handleDateSelect = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (!isDateAvailable(date)) return;

    setBooking(prev => ({ ...prev, date: dateStr, time: '' }));
  };

  const handleTimeSelect = (slot: AvailableSlot) => {
    setBooking(prev => ({ ...prev, time: slot.start }));
    if (formRef.current) {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
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
    return new Date(dateStr).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  const getDayName = (date: Date) => date.toLocaleDateString('ar-SA', { weekday: 'short' });
  const getDayNum = (date: Date) => date.getDate();

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
    <div className="header-logo-group">
      {bookingInfo?.office_logo ? (
        <img src={bookingInfo.office_logo} alt={bookingInfo.office_name} className="header-logo-img" />
      ) : (
        <div className="header-logo-placeholder"><Building2 size={18} /></div>
      )}
      <span className="header-office-name">{bookingInfo?.office_name}</span>
    </div>
  );

  // States
  if (step === 'loading') return <div className="full-screen-center"><Loader2 className="spinner" size={40} /><style>{styles}</style></div>;
  if (step === 'error') return <div className="full-screen-center error"><AlertCircle size={48} /><p>{error}</p><style>{styles}</style></div>;
  if (step === 'expired') return <div className="full-screen-center warn"><Clock size={48} /><p>الرابط منتهي الصلاحية</p><style>{styles}</style></div>;
  if (step === 'success') {
    return (
      <div className="notion-page">
        <header className="notion-header-simple">
          {renderLogo()}
        </header>

        <div className="notion-card success-card animate-up">
          <div className="success-icon-box"><CheckCircle size={48} /></div>
          <h1>تم تأكيد الحجز!</h1>
          <p className="success-subtitle">شكراً {booking.clientName}، موعدك جاهز.</p>

          <div className="notion-divider"></div>

          <div className="meeting-details-box">
            <div className="detail-row">
              <span className="label">التاريخ</span>
              <span className="value">{formatDate(booking.date)}</span>
            </div>
            <div className="detail-row">
              <span className="label">الوقت</span>
              <span className="value">{formatTime(booking.time)} ({booking.duration} دقيقة)</span>
            </div>
            <div className="detail-row">
              <span className="label">المكان</span>
              <span className="value flex-center">
                {bookingResult?.meeting_details?.meeting_type === 'remote' ? <Video size={14} /> : <MapPin size={14} />}
                {bookingResult?.meeting_details?.meeting_type === 'remote' ? 'عن بعد' : bookingResult?.meeting_details?.location || 'حضوري'}
              </span>
            </div>
            {bookingResult?.meeting_details?.video_meeting_url && (
              <div className="detail-row link-row">
                <span className="label">رابط الاجتماع</span>
                <a href={bookingResult.meeting_details.video_meeting_url} target="_blank" rel="noopener noreferrer" className="meeting-link">انضمام الآن <Globe size={12} /></a>
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
      {/* Simple Header */}
      <header className="notion-header-simple">
        {renderLogo()}
      </header>

      <main className="notion-main animate-up">

        {/* Welcome / Host Section */}
        <div className="host-section">
          <div className="host-avatar">
            {bookingInfo?.lawyer_avatar ? <img src={bookingInfo.lawyer_avatar} alt="" /> : <User size={40} />}
          </div>
          <div className="host-message">
            {bookingInfo?.client_name ? (
              <h2>مرحباً {bookingInfo.client_name} 👋</h2>
            ) : (
              <h2>حجز موعد جديد</h2>
            )}
            <p>يدعوك <strong>{bookingInfo?.lawyer_name}</strong> لاختيار وقت مناسب للاجتماع.</p>
          </div>
        </div>

        {error && (
          <div className="notion-alert error">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Quick Settings (Duration / Type) */}
        <div className="settings-bar">
          <div className="pill-group">
            {bookingInfo?.allowed_durations?.map(d => (
              <button
                key={d}
                className={`pill-btn ${booking.duration === d ? 'active' : ''}`}
                onClick={() => setBooking(prev => ({ ...prev, duration: d }))}
              >
                <Clock size={12} /> {d} دقيقة
              </button>
            ))}
          </div>

          {bookingInfo?.meeting_types && bookingInfo.meeting_types.length > 1 && (
            <div className="pill-group">
              <button
                className={`pill-btn ${booking.meetingType === 'in_person' ? 'active' : ''}`}
                onClick={() => setBooking(prev => ({ ...prev, meetingType: 'in_person' }))}
              >
                <MapPin size={12} /> حضوري
              </button>
              <button
                className={`pill-btn ${booking.meetingType === 'remote' ? 'active' : ''}`}
                onClick={() => setBooking(prev => ({ ...prev, meetingType: 'remote' }))}
              >
                <Video size={12} /> عن بعد
              </button>
            </div>
          )}
        </div>

        {/* Horizontal Date Strip */}
        <div className="date-strip-container">
          <div className="month-label">
            <span>{currentMonth.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}</span>
            <div className="month-nav">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}><ChevronRight size={16} /></button>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}><ChevronLeft size={16} /></button>
            </div>
          </div>
          <div className="date-strip">
            {daysList.map((date, i) => {
              const available = isDateAvailable(date);
              const isSelected = booking.date === `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

              return (
                <button
                  key={i}
                  disabled={!available}
                  className={`date-card ${available ? 'available' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleDateSelect(date)}
                >
                  <span className="wday">{getDayName(date)}</span>
                  <span className="day-num">{getDayNum(date)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slots (Conditionally Rendered) */}
        {booking.date && (
          <div className="time-section animate-fade-in" ref={slotsRef}>
            <h3>الأوقات المتاحة في {formatDate(booking.date)}</h3>

            {loadingSlots ? (
              <div className="slots-loading"><Loader2 className="spinner" /></div>
            ) : availableSlots.length === 0 ? (
              <div className="empty-state">لا توجد مواعيد متاحة</div>
            ) : (
              <div className="slots-grid-modern">
                {availableSlots.map(slot => (
                  <button
                    key={slot.start}
                    className={`time-chip ${booking.time === slot.start ? 'selected' : ''}`}
                    onClick={() => handleTimeSelect(slot)}
                  >
                    {formatTime(slot.start)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* User Form (Conditionally Rendered) */}
        {booking.time && (
          <div className="form-section animate-fade-in" ref={formRef}>
            <h3>تأكيد المعلومات</h3>
            <form className="notion-form-compact" onSubmit={handleSubmit}>

              {!bookingInfo?.client_name && (
                <div className="form-row">
                  <div className="field">
                    <label>الاسم</label>
                    <input
                      type="text"
                      value={booking.clientName}
                      onChange={e => setBooking(prev => ({ ...prev, clientName: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-row two-cols">
                <div className="field">
                  <label>الجوال</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={booking.clientPhone}
                    onChange={e => setBooking(prev => ({ ...prev, clientPhone: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>الإيميل</label>
                  <input
                    type="email"
                    dir="ltr"
                    value={booking.clientEmail}
                    onChange={e => setBooking(prev => ({ ...prev, clientEmail: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label>ملاحظات</label>
                <textarea
                  rows={2}
                  value={booking.notes}
                  onChange={e => setBooking(prev => ({ ...prev, notes: e.target.value }))}
                ></textarea>
              </div>

              <button type="submit" className="primary-btn-modern" disabled={submitting}>
                {submitting ? <Loader2 className="spinner" size={18} /> : 'تأكيد الحجز'}
              </button>
            </form>
          </div>
        )}

      </main>

      <style>{styles}</style>
    </div>
  );
};

// ==========================================
// Invitation Style CSS
// ==========================================

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');

  :root {
      --bg: #F7F7F5;
      --card-bg: #FFFFFF;
      --text: #37352F;
      --text-light: #787774;
      --primary: #2F3437;
      --primary-hover: #000000;
      --accent: #E1E1E0;
      --border: #EDECE9;
      --active-blue: #2383E2;
  }

  * { box-sizing: border-box; }

  .notion-page {
    min-height: 100vh;
    background: var(--bg);
    font-family: 'Tajawal', sans-serif;
    color: var(--text);
    direction: rtl;
    padding-bottom: 60px;
  }

  /* Simple Header */
  .notion-header-simple {
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      padding: 12px 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
  }
  .header-logo-group {
      display: flex;
      align-items: center;
      gap: 10px;
  }
  .header-logo-img { width: 28px; height: 28px; border-radius: 4px; object-fit: cover; }
  .header-logo-placeholder { width: 28px; height: 28px; background: #eee; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
  .header-office-name { font-weight: 600; font-size: 14px; color: var(--text); }

  /* Main Container */
  .notion-main {
      max-width: 600px;
      margin: 0 auto;
      padding: 24px 20px;
  }

  /* Animations */
  .animate-up { animation: slideUp 0.4s ease-out; }
  .animate-fade-in { animation: fadeIn 0.4s ease-out; }
  
  @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  /* Host Section */
  .host-section {
      text-align: center;
      margin-bottom: 30px;
  }
  .host-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      margin: 0 auto 16px;
      overflow: hidden;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      background: white;
      display: flex; align-items: center; justify-content: center;
  }
  .host-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .host-message h2 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
  .host-message p { font-size: 15px; color: var(--text-light); line-height: 1.5; }

  /* Settings Bar */
  .settings-bar {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
  }
  .pill-group {
      background: rgba(255,255,255,0.6);
      padding: 4px;
      border-radius: 20px;
      display: flex;
      gap: 4px;
      border: 1px solid var(--border);
  }
  .pill-btn {
      border: none;
      background: transparent;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 13px;
      cursor: pointer;
      color: var(--text-light);
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
  }
  .pill-btn:hover { background: rgba(0,0,0,0.05); color: var(--text); }
  .pill-btn.active { background: white; color: var(--text); font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

  /* Date Strip (Horizontal) */
  .date-strip-container {
      margin-bottom: 30px;
  }
  .month-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding: 0 4px;
  }
  .month-label span { font-weight: 600; font-size: 15px; }
  .month-nav button {
      background: none; border: none; cursor: pointer; color: var(--text-light);
      padding: 4px; border-radius: 4px;
  }
  .month-nav button:hover { background: rgba(0,0,0,0.05); }

  .date-strip {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 10px;
      scrollbar-width: none; /* Hide scrollbar Firefox */
  }
  .date-strip::-webkit-scrollbar { display: none; }

  .date-card {
      min-width: 60px;
      height: 70px;
      background: white;
      border: 1px solid var(--border);
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: not-allowed;
      opacity: 0.5;
      transition: all 0.2s;
      flex-shrink: 0;
  }
  .date-card.available {
      cursor: pointer;
      opacity: 1;
      border-color: #d0d0d0;
  }
  .date-card.available:hover {
      border-color: var(--text);
      transform: translateY(-2px);
  }
  .date-card.selected {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
      transform: scale(1.05);
  }
  .date-card .wday { font-size: 12px; margin-bottom: 4px; }
  .date-card .day-num { font-size: 18px; font-weight: 700; }
  .date-card.selected .wday { color: rgba(255,255,255,0.7); }

  /* Time Section */
  .time-section { margin-bottom: 30px; }
  .time-section h3 { font-size: 16px; margin-bottom: 16px; font-weight: 600; }
  
  .slots-grid-modern {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
      gap: 10px;
  }
  .time-chip {
      background: white;
      border: 1px solid var(--border);
      padding: 10px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      color: var(--text);
  }
  .time-chip:hover { border-color: var(--active-blue); color: var(--active-blue); }
  .time-chip.selected {
      background: var(--active-blue);
      color: white;
      border-color: var(--active-blue);
      box-shadow: 0 2px 8px rgba(35, 131, 226, 0.3);
  }

  /* Form Section */
  .form-section {
      background: white;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  }
  .form-section h3 { margin-top: 0; margin-bottom: 20px; font-size: 18px; }
  
  .notion-form-compact { display: flex; flex-direction: column; gap: 16px; }
  .form-row { display: flex; gap: 16px; }
  .two-cols .field { flex: 1; }
  
  .field label { display: block; font-size: 12px; font-weight: 600; color: var(--text-light); margin-bottom: 6px; }
  .field input, .field textarea {
      width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 6px;
      font-family: inherit; font-size: 14px; transition: border 0.2s;
  }
  .field input:focus, .field textarea:focus { outline: none; border-color: var(--active-blue); }

  .primary-btn-modern {
      background: var(--primary); color: white; border: none; padding: 14px;
      border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;
      margin-top: 10px; width: 100%; transition: background 0.2s;
  }
  .primary-btn-modern:hover { background: var(--primary-hover); }
  .primary-btn-modern:disabled { opacity: 0.7; cursor: not-allowed; }

  /* Success Card */
  .success-card {
      background: white;
      padding: 40px;
      border-radius: 16px;
      border: 1px solid var(--border);
      text-align: center;
      max-width: 480px;
      margin: 40px auto;
  }
  .success-icon-box { color: #27AE60; margin-bottom: 16px; }
  .success-subtitle { color: var(--text-light); margin-bottom: 24px; }
  .notion-divider { height: 1px; background: var(--border); margin: 24px 0; }
  
  .meeting-details-box {
      background: #F9F9F9; padding: 16px; border-radius: 8px;
  }
  .detail-row {
      display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;
      border-bottom: 1px solid #eee;
  }
  .detail-row:last-child { border-bottom: none; }
  .detail-row .label { color: var(--text-light); }
  .detail-row .value { font-weight: 500; }
  .flex-center { display: flex; align-items: center; gap: 6px; }
  
  .meeting-link { color: var(--active-blue); text-decoration: none; display: flex; align-items: center; gap: 4px; }
  .footer-note { font-size: 12px; color: var(--text-light); margin-top: 24px; }

  @media (max-width: 480px) {
      .form-row { flex-direction: column; gap: 12px; }
      .date-card { width: 60px; height: 65px; }
  }
  
  .full-screen-center {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: var(--text-light);
  }
  .spinner { animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }
`;

export default PublicBooking;
