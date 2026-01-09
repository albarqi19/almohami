import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Video,
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  XCircle,
  Play,
  CheckCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  User,
  Table,
  LayoutGrid,
  Columns
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  internalMeetingService,
  type InternalMeeting,
  type SmartButtonState
} from '../../services/meetingService';
import CreateInternalMeetingModal from '../../components/meetings/CreateInternalMeetingModal';
import MeetingSummaryModal from '../../components/meetings/MeetingSummaryModal';

const InternalMeetings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // State
  const [meetings, setMeetings] = useState<InternalMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<InternalMeeting | null>(null);
  const [buttonStates, setButtonStates] = useState<Record<number, SmartButtonState>>({});
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'cards'>('table');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'tomorrow' | 'week' | 'upcoming'>('upcoming');

  // Fetch meetings
  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const data = await internalMeetingService.getAll(params);
      setMeetings(data);

      // Fetch button states for scheduled meetings
      const scheduledMeetings = data.filter(m => m.status === 'scheduled' || m.status === 'in_progress');
      const states: Record<number, SmartButtonState> = {};
      await Promise.all(
        scheduledMeetings.map(async (meeting) => {
          try {
            const state = await internalMeetingService.getButtonState(meeting.id);
            states[meeting.id] = state;
          } catch (e) {
            // Ignore errors for individual button states
          }
        })
      );
      setButtonStates(states);
    } catch (err) {
      console.error('Error fetching meetings:', err);
      setError('حدث خطأ في جلب الاجتماعات');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeMenu !== null) {
        const target = e.target as HTMLElement;
        if (!target.closest('.dropdown')) {
          setActiveMenu(null);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenu]);

  // Filter meetings
  const filteredMeetings = meetings.filter(meeting => {
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesTitle = meeting.title.toLowerCase().includes(term);
      const matchesAgenda = meeting.agenda?.toLowerCase().includes(term);
      if (!matchesTitle && !matchesAgenda) return false;
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
      weekday: 'long',
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
      scheduled: { label: 'مجدول', color: '#3B82F6', bg: '#EFF6FF' },
      in_progress: { label: 'جاري', color: '#F59E0B', bg: '#FFFBEB' },
      completed: { label: 'مكتمل', color: '#10B981', bg: '#ECFDF5' },
      cancelled: { label: 'ملغي', color: '#EF4444', bg: '#FEF2F2' },
    };
    const config = statusConfig[status] || statusConfig.scheduled;
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

  // Actions
  const handleStartMeeting = async (meeting: InternalMeeting) => {
    try {
      await internalMeetingService.start(meeting.id);
      fetchMeetings();
    } catch (err) {
      console.error('Error starting meeting:', err);
    }
  };

  const handleCompleteMeeting = async (meeting: InternalMeeting) => {
    try {
      await internalMeetingService.complete(meeting.id);
      fetchMeetings();
    } catch (err) {
      console.error('Error completing meeting:', err);
    }
  };

  const handleCancelMeeting = async (meeting: InternalMeeting) => {
    const reason = prompt('سبب الإلغاء:');
    if (reason) {
      try {
        await internalMeetingService.cancel(meeting.id, reason);
        fetchMeetings();
      } catch (err) {
        console.error('Error cancelling meeting:', err);
      }
    }
  };

  const handleDeleteMeeting = async (meeting: InternalMeeting) => {
    if (confirm('هل أنت متأكد من حذف هذا الاجتماع؟')) {
      try {
        await internalMeetingService.delete(meeting.id);
        fetchMeetings();
      } catch (err) {
        console.error('Error deleting meeting:', err);
      }
    }
  };

  const handleOpenSummary = (meeting: InternalMeeting) => {
    setSelectedMeeting(meeting);
    setShowSummaryModal(true);
  };

  // Smart Button Renderer
  const renderSmartButton = (meeting: InternalMeeting) => {
    const state = buttonStates[meeting.id];

    if (meeting.status === 'completed') {
      return (
        <button
          className="smart-btn smart-btn--view"
          onClick={() => handleOpenSummary(meeting)}
        >
          <FileText size={14} />
          عرض الملخص
        </button>
      );
    }

    if (meeting.status === 'cancelled') {
      return (
        <span className="text-gray-400 text-sm">ملغي</span>
      );
    }

    if (!state) {
      return (
        <span className="text-gray-400 text-sm">جاري التحميل...</span>
      );
    }

    switch (state.status) {
      case 'upcoming':
        return (
          <button className="smart-btn smart-btn--upcoming" disabled>
            <Clock size={14} />
            قريباً
          </button>
        );
      case 'join':
        return (
          <button
            className="smart-btn smart-btn--join"
            onClick={() => {
              if (meeting.video_meeting_url) {
                window.open(meeting.video_meeting_url, '_blank');
              }
              handleStartMeeting(meeting);
            }}
          >
            <Video size={14} />
            دخول الاجتماع
          </button>
        );
      case 'write_summary':
        return (
          <button
            className="smart-btn smart-btn--summary"
            onClick={() => handleOpenSummary(meeting)}
          >
            <FileText size={14} />
            كتابة الملخص
          </button>
        );
      case 'view_summary':
        return (
          <button
            className="smart-btn smart-btn--view"
            onClick={() => handleOpenSummary(meeting)}
          >
            <FileText size={14} />
            عرض الملخص
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="meetings-page">
      {/* Header */}
      <header className="meetings-header">
        <div className="meetings-header__start">
          <div className="meetings-header__title">
            <Users size={22} />
            <span>الاجتماعات</span>
          </div>
          <div className="meetings-header__stats">
            <span className="stat-badge">
              {meetings.filter(m => m.status === 'scheduled').length} مجدول
            </span>
            <span className="stat-badge stat-badge--success">
              {meetings.filter(m => m.status === 'completed').length} مكتمل
            </span>
          </div>
        </div>

        <div className="meetings-header__actions">
          <button
            className="icon-btn"
            onClick={fetchMeetings}
            disabled={loading}
            title="تحديث"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          {isAdmin && (
            <button
              className="primary-btn"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={18} />
              اجتماع جديد
            </button>
          )}
        </div>
      </header>

      {/* Filters */}
      <div className="meetings-filters">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="بحث في الاجتماعات..."
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
            { key: 'scheduled', label: 'مجدول' },
            { key: 'in_progress', label: 'جاري' },
            { key: 'completed', label: 'مكتمل' },
            { key: 'cancelled', label: 'ملغي' },
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

        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${viewMode === 'table' ? 'view-toggle-btn--active' : ''}`}
            onClick={() => setViewMode('table')}
            title="عرض جدول"
          >
            <Table size={16} />
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'kanban' ? 'view-toggle-btn--active' : ''}`}
            onClick={() => setViewMode('kanban')}
            title="عرض كانبان"
          >
            <Columns size={16} />
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'cards' ? 'view-toggle-btn--active' : ''}`}
            onClick={() => setViewMode('cards')}
            title="عرض بطاقات"
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw size={32} className="animate-spin" />
          <p>جاري تحميل الاجتماعات...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <XCircle size={32} />
          <p>{error}</p>
          <button onClick={fetchMeetings}>إعادة المحاولة</button>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>لا توجد اجتماعات</h3>
          <p>لا توجد اجتماعات تطابق معايير البحث</p>
          {isAdmin && (
            <button
              className="primary-btn"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={18} />
              إنشاء اجتماع جديد
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Table View */}
          {viewMode === 'table' && (
            <div className="meetings-table-wrapper">
              <table className="meetings-table-view">
                <thead>
                  <tr>
                    <th>العنوان</th>
                    <th>التاريخ والوقت</th>
                    <th>المدة</th>
                    <th>النوع</th>
                    <th>المشاركون</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeetings.map(meeting => (
                    <tr key={meeting.id}>
                      <td>
                        <div className="table-meeting-title">
                          <strong>{meeting.title}</strong>
                          {meeting.agenda && <span className="table-agenda">{meeting.agenda.substring(0, 50)}...</span>}
                        </div>
                      </td>
                      <td>
                        <div className="table-datetime">
                          <span>{formatDate(meeting.scheduled_at)}</span>
                          <span className="table-time">{formatTime(meeting.scheduled_at)}</span>
                        </div>
                      </td>
                      <td>{meeting.duration_minutes} دقيقة</td>
                      <td>
                        {meeting.video_meeting_url ? (
                          <span className="type-chip type-chip--remote"><Video size={12} /> عن بعد</span>
                        ) : (
                          <span className="type-chip type-chip--physical"><MapPin size={12} /> حضوري</span>
                        )}
                      </td>
                      <td>
                        <div className="table-participants">
                          {meeting.participants?.slice(0, 3).map((p, idx) => (
                            <div key={p.id} className="mini-avatar" title={p.user?.name}>
                              {p.user?.name?.charAt(0) || '?'}
                            </div>
                          ))}
                          {meeting.participants && meeting.participants.length > 3 && (
                            <span className="more-count">+{meeting.participants.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td>{getStatusBadge(meeting.status)}</td>
                      <td>
                        <div className="table-actions-cell">
                          {renderSmartButton(meeting)}
                          {isAdmin && meeting.status === 'scheduled' && (
                            <div className="dropdown">
                              <button
                                className="icon-btn-sm"
                                onClick={() => setActiveMenu(activeMenu === meeting.id ? null : meeting.id)}
                              >
                                <MoreVertical size={16} />
                              </button>
                              {activeMenu === meeting.id && (
                                <div className="dropdown-menu">
                                  <button onClick={() => {
                                    setSelectedMeeting(meeting);
                                    setShowCreateModal(true);
                                    setActiveMenu(null);
                                  }}>
                                    <Edit2 size={14} />
                                    تعديل
                                  </button>
                                  <button onClick={() => {
                                    handleCancelMeeting(meeting);
                                    setActiveMenu(null);
                                  }}>
                                    <XCircle size={14} />
                                    إلغاء
                                  </button>
                                  <button
                                    className="text-red-500"
                                    onClick={() => {
                                      handleDeleteMeeting(meeting);
                                      setActiveMenu(null);
                                    }}
                                  >
                                    <Trash2 size={14} />
                                    حذف
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Kanban View */}
          {viewMode === 'kanban' && (
            <div className="kanban-board">
              {[
                { key: 'scheduled', label: 'المجدولة', color: '#3B82F6' },
                { key: 'in_progress', label: 'الجارية', color: '#F59E0B' },
                { key: 'completed', label: 'المكتملة', color: '#10B981' },
                { key: 'cancelled', label: 'الملغية', color: '#EF4444' },
              ].map(column => {
                const columnMeetings = filteredMeetings.filter(m => m.status === column.key);
                return (
                  <div key={column.key} className="kanban-column">
                    <div className="kanban-column__header" style={{ borderColor: column.color }}>
                      <span className="kanban-column__title">{column.label}</span>
                      <span className="kanban-column__count" style={{ background: column.color }}>
                        {columnMeetings.length}
                      </span>
                    </div>
                    <div className="kanban-column__content">
                      {columnMeetings.map(meeting => (
                        <div key={meeting.id} className="kanban-card">
                          <h4>{meeting.title}</h4>
                          <div className="kanban-card__info">
                            <span><Calendar size={12} /> {formatDate(meeting.scheduled_at)}</span>
                            <span><Clock size={12} /> {formatTime(meeting.scheduled_at)}</span>
                          </div>
                          {meeting.participants && meeting.participants.length > 0 && (
                            <div className="kanban-card__participants">
                              {meeting.participants.slice(0, 3).map(p => (
                                <div key={p.id} className="mini-avatar" title={p.user?.name}>
                                  {p.user?.name?.charAt(0) || '?'}
                                </div>
                              ))}
                              {meeting.participants.length > 3 && (
                                <span className="more-count">+{meeting.participants.length - 3}</span>
                              )}
                            </div>
                          )}
                          <div className="kanban-card__actions">
                            {renderSmartButton(meeting)}
                          </div>
                        </div>
                      ))}
                      {columnMeetings.length === 0 && (
                        <div className="kanban-empty">لا توجد اجتماعات</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cards View (Original) */}
          {viewMode === 'cards' && (
            <div className="meetings-grid">
              {filteredMeetings.map(meeting => (
                <div key={meeting.id} className="meeting-card">
                  <div className="meeting-card__header">
                    <h3 className="meeting-card__title">{meeting.title}</h3>
                    <div className="meeting-card__actions">
                      {getStatusBadge(meeting.status)}
                      {isAdmin && meeting.status === 'scheduled' && (
                        <div className="dropdown">
                          <button
                            className="icon-btn-sm"
                            onClick={() => setActiveMenu(activeMenu === meeting.id ? null : meeting.id)}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {activeMenu === meeting.id && (
                            <div className="dropdown-menu">
                              <button onClick={() => {
                                setSelectedMeeting(meeting);
                                setShowCreateModal(true);
                                setActiveMenu(null);
                              }}>
                                <Edit2 size={14} />
                                تعديل
                              </button>
                              <button onClick={() => {
                                handleCancelMeeting(meeting);
                                setActiveMenu(null);
                              }}>
                                <XCircle size={14} />
                                إلغاء
                              </button>
                              <button
                                className="text-red-500"
                                onClick={() => {
                                  handleDeleteMeeting(meeting);
                                  setActiveMenu(null);
                                }}
                              >
                                <Trash2 size={14} />
                                حذف
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {meeting.agenda && (
                    <p className="meeting-card__agenda">{meeting.agenda}</p>
                  )}

                  <div className="meeting-card__info">
                    <div className="info-item">
                      <Calendar size={14} />
                      <span>{formatDate(meeting.scheduled_at)}</span>
                    </div>
                    <div className="info-item">
                      <Clock size={14} />
                      <span>{formatTime(meeting.scheduled_at)} ({meeting.duration_minutes} دقيقة)</span>
                    </div>
                    {meeting.location && (
                      <div className="info-item">
                        <MapPin size={14} />
                        <span>{meeting.location}</span>
                      </div>
                    )}
                    {meeting.video_meeting_url && (
                      <div className="info-item">
                        <Video size={14} />
                        <a href={meeting.video_meeting_url} target="_blank" rel="noopener noreferrer">
                          رابط الاجتماع
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Participants */}
                  <div className="meeting-card__participants">
                    <span className="label">المشاركون:</span>
                    <div className="participants-list">
                      {meeting.participants?.slice(0, 4).map((p, idx) => (
                        <div
                          key={p.id}
                          className="participant-avatar"
                          title={p.user?.name}
                          style={{ zIndex: 10 - idx }}
                        >
                          {p.user?.name?.charAt(0) || '?'}
                        </div>
                      ))}
                      {meeting.participants && meeting.participants.length > 4 && (
                        <div className="participant-avatar participant-avatar--more">
                          +{meeting.participants.length - 4}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Smart Button */}
                  <div className="meeting-card__footer">
                    {renderSmartButton(meeting)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateInternalMeetingModal
          meeting={selectedMeeting}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedMeeting(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setSelectedMeeting(null);
            fetchMeetings();
          }}
        />
      )}

      {showSummaryModal && selectedMeeting && (
        <MeetingSummaryModal
          meeting={selectedMeeting}
          onClose={() => {
            setShowSummaryModal(false);
            setSelectedMeeting(null);
          }}
          onSave={() => {
            setShowSummaryModal(false);
            setSelectedMeeting(null);
            fetchMeetings();
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
          background: var(--color-surface);
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
          color: var(--color-text);
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

        .stat-badge--success {
          background: #ECFDF5;
          color: #10B981;
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
          transition: all 0.15s;
        }

        .icon-btn:hover {
          background: var(--color-surface-subtle);
        }

        .icon-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
          transition: all 0.15s;
        }

        .primary-btn:hover {
          background: #2d4a6f;
        }

        .meetings-filters {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 24px;
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
          padding: 6px 12px;
          border-radius: 6px;
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
          background: var(--color-primary-soft, rgba(10, 25, 47, 0.1));
          color: var(--color-primary, #0A192F);
          font-weight: 500;
        }

        .time-filter__icon {
          font-size: 14px;
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

        .search-box svg {
          color: var(--color-text-secondary);
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
          transition: all 0.15s;
        }

        .filter-tab:hover {
          background: var(--color-surface-subtle);
        }

        .filter-tab--active {
          background: var(--law-navy, #1E3A5F);
          color: white;
          border-color: var(--law-navy, #1E3A5F);
        }

        .meetings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 16px;
          padding: 24px;
        }

        .meeting-card {
          background: var(--color-surface);
          border-radius: 12px;
          border: 1px solid var(--color-border, #e5e7eb);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.15s;
        }

        .meeting-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .meeting-card__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .meeting-card__title {
          font-size: 16px;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
        }

        .meeting-card__actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .meeting-card__agenda {
          font-size: 13px;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .meeting-card__info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--color-text-secondary);
        }

        .info-item a {
          color: var(--law-navy, #1E3A5F);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .info-item a:hover {
          text-decoration: underline;
        }

        .meeting-card__participants {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-top: 8px;
          border-top: 1px solid var(--color-border, #e5e7eb);
        }

        .meeting-card__participants .label {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .participants-list {
          display: flex;
        }

        .participant-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--law-navy, #1E3A5F);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          margin-right: -8px;
          border: 2px solid white;
        }

        .participant-avatar--more {
          background: var(--color-surface-subtle);
          color: var(--color-text-secondary);
        }

        .meeting-card__footer {
          padding-top: 12px;
          border-top: 1px solid var(--color-border, #e5e7eb);
        }

        .smart-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .smart-btn--upcoming {
          background: var(--color-surface-subtle);
          color: var(--color-text-secondary);
          cursor: not-allowed;
        }

        .smart-btn--join {
          background: #10B981;
          color: white;
        }

        .smart-btn--join:hover {
          background: #059669;
        }

        .smart-btn--summary {
          background: var(--law-navy, #1E3A5F);
          color: white;
        }

        .smart-btn--summary:hover {
          background: #2d4a6f;
        }

        .smart-btn--view {
          background: #EFF6FF;
          color: #3B82F6;
        }

        .smart-btn--view:hover {
          background: #DBEAFE;
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
          right: 0;
          background: var(--color-surface);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 1px solid var(--color-border, #e5e7eb);
          min-width: 140px;
          z-index: 100;
          overflow: visible;
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

        .error-state {
          color: #EF4444;
        }

        .error-state button,
        .empty-state button {
          margin-top: 16px;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* View Toggle */
        .view-toggle {
          display: flex;
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 8px;
          overflow: hidden;
          margin-right: auto;
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
          background: var(--color-primary, #0A192F);
          color: white;
        }

        /* Table View */
        .meetings-table-wrapper {
          padding: 0;
          overflow: visible;
        }

        .meetings-table-view {
          width: 100%;
          border-collapse: collapse;
          background: var(--color-surface);
        }

        .meetings-table-view th,
        .meetings-table-view td {
          padding: 14px 16px;
          text-align: right;
          border-bottom: 1px solid var(--color-border, #e5e7eb);
        }

        .meetings-table-view th {
          background: var(--color-surface-subtle);
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
        }

        .meetings-table-view tr:hover {
          background: var(--color-surface-subtle);
        }

        .table-meeting-title {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .table-meeting-title strong {
          color: var(--color-text);
        }

        .table-agenda {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .table-datetime {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .table-time {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .type-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
        }

        .type-chip--remote {
          background: #EFF6FF;
          color: #3B82F6;
        }

        .type-chip--physical {
          background: #ECFDF5;
          color: #10B981;
        }

        .table-participants {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .mini-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: var(--color-primary, #0A192F);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
        }

        .more-count {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-right: 4px;
        }

        .table-actions-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Kanban View */
        .kanban-board {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          padding: 24px;
          min-height: calc(100vh - 200px);
        }

        .kanban-column {
          background: var(--color-surface-subtle);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          min-height: 300px;
        }

        .kanban-column__header {
          padding: 16px;
          border-bottom: 3px solid;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .kanban-column__title {
          font-weight: 600;
          font-size: 14px;
          color: var(--color-text);
        }

        .kanban-column__count {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          color: white;
        }

        .kanban-column__content {
          flex: 1;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-y: auto;
        }

        .kanban-card {
          background: var(--color-surface);
          border-radius: 10px;
          padding: 14px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .kanban-card h4 {
          font-size: 14px;
          font-weight: 600;
          margin: 0;
          color: var(--color-text);
        }

        .kanban-card__info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .kanban-card__info span {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .kanban-card__participants {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .kanban-card__actions {
          border-top: 1px solid var(--color-border, #e5e7eb);
          padding-top: 10px;
          margin-top: 4px;
        }

        .kanban-empty {
          text-align: center;
          padding: 20px;
          font-size: 13px;
          color: var(--color-text-secondary);
          opacity: 0.6;
        }

        @media (max-width: 1200px) {
          .kanban-board {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .kanban-board {
            grid-template-columns: 1fr;
            padding: 16px;
          }
        }

        @media (max-width: 768px) {
          .meetings-header {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }

          .meetings-header__start {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .meetings-filters {
            flex-direction: column;
            align-items: stretch;
          }

          .search-box {
            width: 100%;
          }

          .filter-tabs {
            overflow-x: auto;
            padding-bottom: 4px;
          }

          .meetings-grid {
            grid-template-columns: 1fr;
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default InternalMeetings;
