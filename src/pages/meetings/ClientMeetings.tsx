import React, { useEffect, useState, useCallback } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  Phone,
  Mail,
  RefreshCw,
  Search,
  Plus,
  Link2,
  Copy,
  ExternalLink,
  MoreVertical,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Briefcase,
  Send,
  Table,
  LayoutGrid,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  clientMeetingService,
  type ClientMeeting
} from '../../services/meetingService';
import {
  bookingLinkService,
  bookingHelpers,
  type BookingLink
} from '../../services/bookingService';
import CreateBookingLinkModal from '../../components/meetings/CreateBookingLinkModal';
import LinkToCaseModal from '../../components/meetings/LinkToCaseModal';

const ClientMeetings: React.FC = () => {
  const { user } = useAuth();

  // State
  const [meetings, setMeetings] = useState<ClientMeeting[]>([]);
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'meetings' | 'links'>('meetings');
  const [showCreateLinkModal, setShowCreateLinkModal] = useState(false);
  const [showLinkCaseModal, setShowLinkCaseModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<ClientMeeting | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<number | null>(null);
  const [linksViewMode, setLinksViewMode] = useState<'table' | 'cards'>('table');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'tomorrow' | 'week' | 'upcoming'>('upcoming');

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;

      const [meetingsData, linksData] = await Promise.all([
        clientMeetingService.getAll(params),
        bookingLinkService.getAll(),
      ]);

      setMeetings(meetingsData);
      setBookingLinks(linksData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter
  const filteredMeetings = meetings.filter(meeting => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesTitle = meeting.title?.toLowerCase().includes(term);
      const matchesClient = meeting.client_name?.toLowerCase().includes(term);
      const matchesPhone = meeting.client_phone?.includes(term);
      if (!matchesTitle && !matchesClient && !matchesPhone) return false;
    }
    // Time filter
    if (timeFilter !== 'all') {
      const meetingDate = new Date(meeting.scheduled_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      switch (timeFilter) {
        case 'today':
          // For today, we want meetings that occur on today's date
          const todayEnd = new Date(today);
          todayEnd.setHours(23, 59, 59, 999);
          if (meetingDate < today || meetingDate > todayEnd) return false;
          break;
        case 'tomorrow':
          const tomorrowEnd = new Date(tomorrow);
          tomorrowEnd.setHours(23, 59, 59, 999);
          if (meetingDate < tomorrow || meetingDate > tomorrowEnd) return false;
          break;
        case 'week':
          if (meetingDate < today || meetingDate > nextWeek) return false;
          break;
        case 'upcoming':
          if (meetingDate < today) return false;
          break;
      }
    }

    return true;
  });

  // Helpers
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: 'قيد الانتظار', color: '#F59E0B', bg: '#FFFBEB' },
      confirmed: { label: 'مؤكد', color: '#10B981', bg: '#ECFDF5' },
      completed: { label: 'مكتمل', color: '#3B82F6', bg: '#EFF6FF' },
      cancelled_by_client: { label: 'ملغي (العميل)', color: '#EF4444', bg: '#FEF2F2' },
      cancelled_by_lawyer: { label: 'ملغي (المحامي)', color: '#EF4444', bg: '#FEF2F2' },
      no_show: { label: 'لم يحضر', color: '#6B7280', bg: '#F3F4F6' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span
        style={{
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
          color: config.color,
          backgroundColor: config.bg,
        }}
      >
        {config.label}
      </span>
    );
  };

  const getMeetingTypeBadge = (type: 'in_person' | 'remote') => {
    return type === 'remote' ? (
      <span className="type-badge type-badge--remote">
        <Video size={12} />
        عن بعد
      </span>
    ) : (
      <span className="type-badge type-badge--inperson">
        <MapPin size={12} />
        حضوري
      </span>
    );
  };

  // Actions
  const handleCopyLink = async (link: BookingLink) => {
    if (link.url) {
      const success = await bookingHelpers.copyLinkToClipboard(link.url);
      if (success) {
        setCopiedLinkId(link.id);
        setTimeout(() => setCopiedLinkId(null), 2000);
      }
    }
  };

  const handleCancelMeeting = async (meeting: ClientMeeting) => {
    const reason = prompt('سبب الإلغاء:');
    if (reason) {
      try {
        await clientMeetingService.cancel(meeting.id, reason);
        fetchData();
      } catch (err) {
        console.error('Error cancelling meeting:', err);
      }
    }
    setActiveMenu(null);
  };

  const handleCompleteMeeting = async (meeting: ClientMeeting) => {
    const outcome = prompt('ملاحظات عن الاجتماع (اختياري):');
    try {
      await clientMeetingService.complete(meeting.id, outcome || undefined);
      fetchData();
    } catch (err) {
      console.error('Error completing meeting:', err);
    }
    setActiveMenu(null);
  };

  const handleNoShow = async (meeting: ClientMeeting) => {
    if (confirm('هل تريد تسجيل عدم حضور العميل؟')) {
      try {
        await clientMeetingService.markNoShow(meeting.id);
        fetchData();
      } catch (err) {
        console.error('Error marking no-show:', err);
      }
    }
    setActiveMenu(null);
  };

  const handleDeleteLink = async (link: BookingLink) => {
    if (confirm('هل تريد حذف هذا الرابط؟')) {
      try {
        await bookingLinkService.delete(link.id);
        fetchData();
      } catch (err) {
        console.error('Error deleting link:', err);
      }
    }
  };

  const handleResendLink = async (link: BookingLink) => {
    try {
      await bookingLinkService.resend(link.id, 'both');
      alert('تم إعادة إرسال الرابط بنجاح');
    } catch (err) {
      console.error('Error resending link:', err);
    }
  };

  return (
    <div className="meetings-page">
      {/* Unified Header */}
      <header className="notion-header">
        <div className="notion-header__title">
          <div className="notion-header__icon">📅</div>
          <h1>مواعيد العملاء</h1>
        </div>

        <div className="notion-header__tabs">
          <button
            className={`notion-tab ${activeTab === 'meetings' ? 'notion-tab--active' : ''}`}
            onClick={() => setActiveTab('meetings')}
          >
            <Calendar size={16} />
            <span>المواعيد</span>
            <span className="notion-tab__count">{meetings.length}</span>
          </button>
          <button
            className={`notion-tab ${activeTab === 'links' ? 'notion-tab--active' : ''}`}
            onClick={() => setActiveTab('links')}
          >
            <Link2 size={16} />
            <span>روابط الحجز</span>
            <span className="notion-tab__count">{bookingLinks.filter(l => !l.is_used).length}</span>
          </button>
        </div>

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
            onClick={() => setShowCreateLinkModal(true)}
          >
            <Link2 size={16} />
            إنشاء رابط حجز
          </button>
        </div>
      </header>

      {/* Meetings Tab */}
      {activeTab === 'meetings' && (
        <>
          {/* Filters */}
          <div className="notion-filters">
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="بحث بالاسم أو الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="time-filters">
              {[
                { key: 'upcoming', label: 'القادمة', icon: '📅' },
                { key: 'today', label: 'اليوم', icon: '🌟' },
                { key: 'tomorrow', label: 'غداً', icon: '☀️' },
                { key: 'week', label: 'الأسبوع', icon: '📆' },
                { key: 'all', label: 'الكل', icon: '📋' },
              ].map(tab => (
                <button
                  key={tab.key}
                  className={`time-filter ${timeFilter === tab.key ? 'time-filter--active' : ''}`}
                  onClick={() => setTimeFilter(tab.key as any)}
                >
                  <span className="time-filter__icon">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="filter-tabs">
              {[
                { key: 'all', label: 'الكل' },
                { key: 'confirmed', label: 'المؤكدة' },
                { key: 'pending', label: 'قيد الانتظار' },
                { key: 'completed', label: 'المكتملة' },
              ].map(tab => (
                <button
                  key={tab.key}
                  className={`filter-tab ${statusFilter === tab.key ? 'filter-tab--active' : ''}`}
                  onClick={() => setStatusFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meetings List */}
          {loading ? (
            <div className="loading-state">
              <RefreshCw size={32} className="animate-spin" />
              <p>جاري تحميل المواعيد...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <XCircle size={32} />
              <p>{error}</p>
              <button onClick={fetchData}>إعادة المحاولة</button>
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="empty-state">
              <Calendar size={48} />
              <h3>لا توجد مواعيد</h3>
              <p>أنشئ رابط حجز وأرسله للعميل لحجز موعد</p>
              <button
                className="primary-btn"
                onClick={() => setShowCreateLinkModal(true)}
              >
                <Link2 size={18} />
                إنشاء رابط حجز
              </button>
            </div>
          ) : (
            <div className="meetings-table-wrapper">
              <table className="meetings-table">
                <thead>
                  <tr>
                    <th>العميل</th>
                    <th>التاريخ والوقت</th>
                    <th>النوع</th>
                    <th>المدة</th>
                    <th>القضية</th>
                    <th>الحالة</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeetings.map(meeting => (
                    <tr key={meeting.id}>
                      <td>
                        <div className="client-info">
                          <div className="client-avatar">
                            {meeting.client_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="client-name">{meeting.client_name || 'غير محدد'}</div>
                            <div className="client-contact">
                              {meeting.client_phone && (
                                <span><Phone size={12} /> {meeting.client_phone}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="datetime-info">
                          <span className="date">{formatDate(meeting.scheduled_at)}</span>
                          <span className="time">{formatTime(meeting.scheduled_at)}</span>
                        </div>
                      </td>
                      <td>{getMeetingTypeBadge(meeting.meeting_type)}</td>
                      <td>{meeting.duration_minutes} دقيقة</td>
                      <td>
                        {meeting.case ? (
                          <span className="case-badge">
                            <Briefcase size={12} />
                            {meeting.case.title}
                          </span>
                        ) : (
                          <button
                            className="link-case-btn"
                            onClick={() => {
                              setSelectedMeeting(meeting);
                              setShowLinkCaseModal(true);
                            }}
                          >
                            <Plus size={12} />
                            ربط بقضية
                          </button>
                        )}
                      </td>
                      <td>{getStatusBadge(meeting.status)}</td>
                      <td>
                        {(meeting.status === 'confirmed' || meeting.status === 'pending') && (
                          <div className="dropdown">
                            <button
                              className="icon-btn-sm"
                              onClick={() => setActiveMenu(activeMenu === meeting.id ? null : meeting.id)}
                            >
                              <MoreVertical size={16} />
                            </button>
                            {activeMenu === meeting.id && (
                              <div className="dropdown-menu">
                                <button onClick={() => handleCompleteMeeting(meeting)}>
                                  <CheckCircle size={14} />
                                  إكمال
                                </button>
                                <button onClick={() => handleNoShow(meeting)}>
                                  <AlertTriangle size={14} />
                                  لم يحضر
                                </button>
                                <button
                                  className="text-red-500"
                                  onClick={() => handleCancelMeeting(meeting)}
                                >
                                  <XCircle size={14} />
                                  إلغاء
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Booking Links Tab */}
      {activeTab === 'links' && (
        <>
          {/* View Toggle */}
          <div className="links-toolbar">
            <div className="view-toggle">
              <button
                className={`view-toggle-btn ${linksViewMode === 'table' ? 'view-toggle-btn--active' : ''}`}
                onClick={() => setLinksViewMode('table')}
                title="عرض جدول"
              >
                <Table size={16} />
              </button>
              <button
                className={`view-toggle-btn ${linksViewMode === 'cards' ? 'view-toggle-btn--active' : ''}`}
                onClick={() => setLinksViewMode('cards')}
                title="عرض بطاقات"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>

          {bookingLinks.length === 0 ? (
            <div className="empty-state">
              <Link2 size={48} />
              <h3>لا توجد روابط حجز</h3>
              <p>أنشئ رابط حجز لإرساله للعميل</p>
              <button
                className="primary-btn"
                onClick={() => setShowCreateLinkModal(true)}
              >
                <Plus size={18} />
                إنشاء رابط جديد
              </button>
            </div>
          ) : linksViewMode === 'table' ? (
            /* Table View */
            <div className="links-table-wrapper">
              <table className="links-table">
                <thead>
                  <tr>
                    <th>العميل</th>
                    <th>الرابط</th>
                    <th>الحالة</th>
                    <th>تاريخ الانتهاء</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingLinks.map(link => (
                    <tr key={link.id} className={link.is_used || !bookingHelpers.isLinkValid(link) ? 'row-disabled' : ''}>
                      <td>
                        <div className="table-client">
                          <div className="table-client-avatar">
                            {link.client?.name?.charAt(0) || '؟'}
                          </div>
                          <span>{link.client?.name || 'رابط عام'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-link-url">
                          <input type="text" value={link.url || ''} readOnly />
                          <button
                            className="icon-btn-xs"
                            onClick={() => handleCopyLink(link)}
                            disabled={link.is_used || !bookingHelpers.isLinkValid(link)}
                            title="نسخ الرابط"
                          >
                            {copiedLinkId === link.id ? <CheckCircle size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>
                      <td>
                        {link.is_used ? (
                          <span className="status-badge status-badge--used">
                            <CheckCircle size={12} />
                            مستخدم
                          </span>
                        ) : !bookingHelpers.isLinkValid(link) ? (
                          <span className="status-badge status-badge--expired">
                            <XCircle size={12} />
                            منتهي
                          </span>
                        ) : (
                          <span className="status-badge status-badge--active">
                            <Clock size={12} />
                            صالح
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="expiry-text">
                          {bookingHelpers.isLinkValid(link) ? bookingHelpers.getTimeUntilExpiry(link.expires_at) : 'منتهي'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          {!link.is_used && bookingHelpers.isLinkValid(link) && (
                            <>
                              <a
                                href={bookingHelpers.createWhatsAppShareLink(link.url || '', link.client?.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="icon-btn-action icon-btn-action--whatsapp"
                                title="إرسال عبر واتساب"
                              >
                                <Send size={14} />
                              </a>
                              <a
                                href={bookingHelpers.createEmailShareLink(link.url || '', link.client?.email, user?.name)}
                                className="icon-btn-action icon-btn-action--email"
                                title="إرسال عبر البريد"
                              >
                                <Mail size={14} />
                              </a>
                              <button
                                className="icon-btn-action"
                                onClick={() => handleResendLink(link)}
                                title="إعادة إرسال"
                              >
                                <RefreshCw size={14} />
                              </button>
                            </>
                          )}
                          <button
                            className="icon-btn-action icon-btn-action--delete"
                            onClick={() => handleDeleteLink(link)}
                            title="حذف"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Cards View */
            <div className="links-cards">
              {bookingLinks.map(link => (
                <div
                  key={link.id}
                  className={`link-card-v2 ${link.is_used ? 'link-card-v2--used' : ''} ${!bookingHelpers.isLinkValid(link) ? 'link-card-v2--expired' : ''
                    }`}
                >
                  <div className="link-card-v2__top">
                    <div className="link-card-v2__client">
                      <div className="link-card-v2__avatar">
                        {link.client?.name?.charAt(0) || '؟'}
                      </div>
                      <div className="link-card-v2__info">
                        <span className="link-card-v2__name">{link.client?.name || 'رابط عام'}</span>
                        <span className="link-card-v2__phone">{link.client?.phone || '-'}</span>
                      </div>
                    </div>
                    {link.is_used ? (
                      <span className="status-chip status-chip--used">مستخدم</span>
                    ) : !bookingHelpers.isLinkValid(link) ? (
                      <span className="status-chip status-chip--expired">منتهي</span>
                    ) : (
                      <span className="status-chip status-chip--active">
                        {bookingHelpers.getTimeUntilExpiry(link.expires_at)}
                      </span>
                    )}
                  </div>

                  <div className="link-card-v2__url">
                    <input type="text" value={link.url || ''} readOnly />
                    <button
                      className="copy-btn-v2"
                      onClick={() => handleCopyLink(link)}
                      disabled={link.is_used || !bookingHelpers.isLinkValid(link)}
                    >
                      {copiedLinkId === link.id ? <CheckCircle size={16} /> : <Copy size={16} />}
                      {copiedLinkId === link.id ? 'تم النسخ' : 'نسخ'}
                    </button>
                  </div>

                  <div className="link-card-v2__actions">
                    {!link.is_used && bookingHelpers.isLinkValid(link) && (
                      <>
                        <a
                          href={bookingHelpers.createWhatsAppShareLink(link.url || '', link.client?.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="card-action-btn card-action-btn--whatsapp"
                          title="واتساب"
                        >
                          <Send size={16} />
                        </a>
                        <a
                          href={bookingHelpers.createEmailShareLink(link.url || '', link.client?.email, user?.name)}
                          className="card-action-btn card-action-btn--email"
                          title="بريد إلكتروني"
                        >
                          <Mail size={16} />
                        </a>
                        <button
                          className="card-action-btn"
                          onClick={() => handleResendLink(link)}
                          title="إعادة إرسال"
                        >
                          <RefreshCw size={16} />
                        </button>
                      </>
                    )}
                    <button
                      className="card-action-btn card-action-btn--delete"
                      onClick={() => handleDeleteLink(link)}
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showCreateLinkModal && (
        <CreateBookingLinkModal
          onClose={() => setShowCreateLinkModal(false)}
          onSuccess={() => {
            setShowCreateLinkModal(false);
            fetchData();
            setActiveTab('links');
          }}
        />
      )}

      {showLinkCaseModal && selectedMeeting && (
        <LinkToCaseModal
          meeting={selectedMeeting}
          onClose={() => {
            setShowLinkCaseModal(false);
            setSelectedMeeting(null);
          }}
          onSuccess={() => {
            setShowLinkCaseModal(false);
            setSelectedMeeting(null);
            fetchData();
          }}
        />
      )}

      <style>{`
        .meetings-page {
          padding: 0;
          min-height: 100vh;
          background: var(--color-surface-subtle);
        }

        .meetings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: var(--color-surface, white);
          border-bottom: 1px solid var(--color-border, #e5e7eb);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .meetings-header__start {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .meetings-header__title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 600;
        }

        .meetings-header__stats {
          display: flex;
          gap: 8px;
        }

        .stat-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          background: var(--color-surface-subtle);
          color: var(--color-text-secondary);
        }

        .stat-badge--warning {
          background: #FFFBEB;
          color: #F59E0B;
        }

        .meetings-header__actions {
          display: flex;
          gap: 10px;
        }

        .icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid var(--color-border, #e5e7eb);
          background: var(--color-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-secondary);
        }

        .icon-btn:hover {
          background: var(--color-surface-subtle);
        }

        .primary-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
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

        .page-tabs {
          display: flex;
          gap: 4px;
          padding: 12px 24px;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border, #e5e7eb);
        }

        .page-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border-radius: 8px;
          border: none;
          background: transparent;
          font-size: 14px;
          color: var(--color-text-secondary);
          cursor: pointer;
        }

        .page-tab:hover {
          background: var(--color-surface-subtle);
        }

        .page-tab--active {
          background: var(--law-navy, #1E3A5F);
          color: white;
        }

        .page-tab .badge {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          background: rgba(255,255,255,0.2);
        }

        .page-tab:not(.page-tab--active) .badge {
          background: var(--color-surface-subtle);
        }

        .meetings-filters {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border, #e5e7eb);
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--color-border, #e5e7eb);
          background: var(--color-surface-subtle);
          width: 280px;
        }

        .search-box input {
          border: none;
          background: none;
          flex: 1;
          font-size: 14px;
          outline: none;
        }

        .filter-tabs {
          display: flex;
          gap: 4px;
        }

        .filter-tab {
          padding: 6px 14px;
          border-radius: 6px;
          border: 1px solid transparent;
          background: transparent;
          font-size: 13px;
          color: var(--color-text-secondary);
          cursor: pointer;
        }

        .filter-tab:hover {
          background: var(--color-surface-subtle);
        }

        .filter-tab--active {
          background: var(--law-navy, #1E3A5F);
          color: white;
        }

        .meetings-table-wrapper {
          padding: 24px;
          overflow-x: auto;
        }

        .meetings-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--color-surface);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .meetings-table th,
        .meetings-table td {
          padding: 14px 16px;
          text-align: right;
          border-bottom: 1px solid var(--color-border, #e5e7eb);
        }

        .meetings-table th {
          background: var(--color-surface-subtle);
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
        }

        .meetings-table td {
          font-size: 14px;
        }

        .meetings-table tr:hover {
          background: var(--color-surface-subtle);
        }

        .client-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .client-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--law-navy, #1E3A5F);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
        }

        .client-name {
          font-weight: 500;
        }

        .client-contact {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .datetime-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .datetime-info .date {
          font-weight: 500;
        }

        .datetime-info .time {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .type-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
        }

        .type-badge--remote {
          background: #EFF6FF;
          color: #3B82F6;
        }

        .type-badge--inperson {
          background: #ECFDF5;
          color: #10B981;
        }

        .case-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          background: var(--color-surface-subtle);
          font-size: 12px;
        }

        .link-case-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px dashed var(--color-border, #e5e7eb);
          background: transparent;
          font-size: 12px;
          color: var(--color-text-secondary);
          cursor: pointer;
        }

        .link-case-btn:hover {
          border-color: var(--law-navy, #1E3A5F);
          color: var(--law-navy, #1E3A5F);
        }

        .dropdown {
          position: relative;
        }

        .icon-btn-sm {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-secondary);
        }

        .icon-btn-sm:hover {
          background: var(--color-surface-subtle);
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          background: var(--color-surface);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 1px solid var(--color-border, #e5e7eb);
          min-width: 140px;
          z-index: 20;
        }

        .dropdown-menu button {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 14px;
          border: none;
          background: none;
          font-size: 13px;
          color: var(--color-text);
          cursor: pointer;
          text-align: right;
        }

        .dropdown-menu button:hover {
          background: var(--color-surface-subtle);
        }

        .dropdown-menu button.text-red-500 {
          color: #EF4444;
        }

        .links-list {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .link-card {
          background: var(--color-surface);
          border-radius: 12px;
          border: 1px solid var(--color-border, #e5e7eb);
          padding: 16px;
        }

        .link-card--used,
        .link-card--expired {
          opacity: 0.6;
        }

        .link-card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge--active {
          background: #ECFDF5;
          color: #10B981;
        }

        .status-badge--used {
          background: #EFF6FF;
          color: #3B82F6;
        }

        .status-badge--expired {
          background: #FEF2F2;
          color: #EF4444;
        }

        .link-url {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .link-url input {
          flex: 1;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--color-border, #e5e7eb);
          background: var(--color-surface-subtle);
          font-size: 13px;
          color: var(--color-text-secondary);
        }

        .copy-btn {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: 1px solid var(--color-border, #e5e7eb);
          background: var(--color-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-secondary);
        }

        .copy-btn:hover {
          background: var(--color-surface-subtle);
        }

        .copy-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .link-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid var(--color-border, #e5e7eb);
          background: var(--color-surface);
          font-size: 13px;
          color: var(--color-text);
          cursor: pointer;
          text-decoration: none;
        }

        .action-btn:hover {
          background: var(--color-surface-subtle);
        }

        .action-btn--whatsapp {
          background: #25D366;
          color: white;
          border-color: #25D366;
        }

        .action-btn--email {
          background: #EA4335;
          color: white;
          border-color: #EA4335;
        }

        .action-btn--delete {
          color: #EF4444;
        }

        .action-btn--delete:hover {
          background: #FEF2F2;
        }

        .loading-state,
        .error-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          color: var(--color-text-secondary);
        }

        .loading-state svg,
        .error-state svg,
        .empty-state svg {
          opacity: 0.3;
          margin-bottom: 16px;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Links Toolbar */
        .links-toolbar {
          display: flex;
          justify-content: flex-end;
          padding: 12px 24px;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border, #e5e7eb);
        }

        .view-toggle {
          display: flex;
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 8px;
          overflow: hidden;
        }

        .view-toggle-btn {
          width: 36px;
          height: 32px;
          border: none;
          background: var(--color-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-secondary);
          transition: all 0.15s;
        }

        .view-toggle-btn:hover {
          background: var(--color-surface-subtle);
        }

        .view-toggle-btn--active {
          background: var(--law-navy, #1E3A5F);
          color: white;
        }

        /* Links Table */
        .links-table-wrapper {
          padding: 0;
          overflow-x: auto;
        }

        .links-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--color-surface);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .links-table th,
        .links-table td {
          padding: 14px 16px;
          text-align: right;
          border-bottom: 1px solid var(--color-border, #e5e7eb);
        }

        .links-table th {
          background: var(--color-surface-subtle);
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
        }

        .links-table tr.row-disabled {
          opacity: 0.5;
        }

        .table-client {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .table-client-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--law-navy, #1E3A5F);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
        }

        .table-link-url {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .table-link-url input {
          width: 180px;
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid var(--color-border, #e5e7eb);
          background: var(--color-surface-subtle);
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .icon-btn-xs {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid var(--color-border, #e5e7eb);
          background: var(--color-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-secondary);
        }

        .icon-btn-xs:hover {
          background: var(--color-surface-subtle);
        }

        .icon-btn-xs:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .expiry-text {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .table-actions {
          display: flex;
          gap: 4px;
        }

        .icon-btn-action {
          width: 30px;
          height: 30px;
          border-radius: 6px;
          border: 1px solid var(--color-border, #e5e7eb);
          background: var(--color-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-secondary);
          text-decoration: none;
          transition: all 0.15s;
        }

        .icon-btn-action:hover {
          background: var(--color-surface-subtle);
        }

        .icon-btn-action--whatsapp {
          background: #25D366;
          border-color: #25D366;
          color: white;
        }

        .icon-btn-action--whatsapp:hover {
          background: #1fba57;
        }

        .icon-btn-action--email {
          background: #EA4335;
          border-color: #EA4335;
          color: white;
        }

        .icon-btn-action--email:hover {
          background: #d73829;
        }

        .icon-btn-action--delete {
          color: #EF4444;
        }

        .icon-btn-action--delete:hover {
          background: #FEF2F2;
        }

        /* Links Cards View */
        .links-cards {
          padding: 24px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 16px;
        }

        .link-card-v2 {
          background: var(--color-surface);
          border-radius: 12px;
          border: 1px solid var(--color-border, #e5e7eb);
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: box-shadow 0.15s;
        }

        .link-card-v2:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .link-card-v2--used,
        .link-card-v2--expired {
          opacity: 0.6;
        }

        .link-card-v2__top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .link-card-v2__client {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .link-card-v2__avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--law-navy, #1E3A5F);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
        }

        .link-card-v2__info {
          display: flex;
          flex-direction: column;
        }

        .link-card-v2__name {
          font-weight: 600;
          font-size: 14px;
        }

        .link-card-v2__phone {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .status-chip {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }

        .status-chip--active {
          background: #ECFDF5;
          color: #10B981;
        }

        .status-chip--used {
          background: #EFF6FF;
          color: #3B82F6;
        }

        .status-chip--expired {
          background: #FEF2F2;
          color: #EF4444;
        }

        .link-card-v2__url {
          display: flex;
          gap: 8px;
          margin-bottom: 14px;
        }

        .link-card-v2__url input {
          flex: 1;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--color-border, #e5e7eb);
          background: var(--color-surface-subtle);
          font-size: 13px;
          color: var(--color-text-secondary);
        }

        .copy-btn-v2 {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid var(--law-navy, #1E3A5F);
          background: var(--color-surface);
          color: var(--law-navy, #1E3A5F);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .copy-btn-v2:hover {
          background: var(--law-navy, #1E3A5F);
          color: white;
        }

        .copy-btn-v2:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .link-card-v2__actions {
          display: flex;
          gap: 8px;
          border-top: 1px solid var(--color-border, #e5e7eb);
          padding-top: 14px;
        }

        .card-action-btn {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          border: 1px solid var(--color-border, #e5e7eb);
          background: var(--color-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-secondary);
          text-decoration: none;
          transition: all 0.15s;
        }

        .card-action-btn:hover {
          background: var(--color-surface-subtle);
        }

        .card-action-btn--whatsapp {
          background: #25D366;
          border-color: #25D366;
          color: white;
        }

        .card-action-btn--whatsapp:hover {
          background: #1fba57;
        }

        .card-action-btn--email {
          background: #EA4335;
          border-color: #EA4335;
          color: white;
        }

        .card-action-btn--email:hover {
          background: #d73829;
        }

        .card-action-btn--delete {
          color: #EF4444;
        }

        .card-action-btn--delete:hover {
          background: #FEF2F2;
        }
        /* Notion Style Header */
        .notion-header {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 24px 32px 12px;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border, #e5e7eb);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .notion-header__title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .notion-header__icon {
          font-size: 24px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notion-header h1 {
          font-size: 20px;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
        }

        .notion-header__tabs {
          display: flex;
          gap: 8px;
          margin-right: 32px;
        }

        .notion-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 6px;
          border: none;
          background: transparent;
          font-size: 14px;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.15s;
        }

        .notion-tab:hover {
          background: var(--color-surface-subtle);
          color: var(--color-text);
        }

        .notion-tab--active {
          background: var(--color-surface-subtle);
          color: var(--color-text);
          font-weight: 500;
        }

        .notion-tab__count {
          font-size: 12px;
          opacity: 0.6;
          background: rgba(0, 0, 0, 0.05);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .notion-header__actions {
          display: flex;
          gap: 8px;
          margin-right: auto;
        }

        .notion-icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid var(--color-border, #e5e7eb);
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-secondary);
          transition: all 0.15s;
        }

        .notion-icon-btn:hover {
          background: var(--color-surface-subtle);
          color: var(--color-text);
        }

        .notion-primary-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          background: var(--color-primary, #0A192F);
          color: white;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .notion-primary-btn:hover {
          opacity: 0.9;
        }

        /* Notion Filters */
        .notion-filters {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 32px;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border, #e5e7eb);
          flex-wrap: wrap;
        }

        .time-filters {
          display: flex;
          gap: 4px;
        }

        .time-filter {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 4px;
          border: none;
          background: transparent;
          font-size: 13px;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.15s;
        }

        .time-filter:hover {
          background: var(--color-surface-subtle);
        }

        .time-filter--active {
          background: var(--color-surface-subtle);
          color: var(--color-text);
          font-weight: 500;
        }

        .time-filter__icon {
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .notion-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
            padding: 16px;
          }
          
          .notion-header__tabs {
            margin-right: 0;
            width: 100%;
            overflow-x: auto;
          }

          .notion-header__actions {
            margin-right: 0;
            width: 100%;
            justify-content: flex-end;
          }

          .notion-filters {
            flex-direction: column;
            align-items: stretch;
            padding: 16px;
          }

          .time-filters {
            overflow-x: auto;
            padding-bottom: 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default ClientMeetings;
