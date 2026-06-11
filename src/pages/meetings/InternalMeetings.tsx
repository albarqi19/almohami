import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users,
  Plus,
  Clock,
  MapPin,
  Video,
  RefreshCw,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  XCircle,
  FileText,
  CalendarClock,
  CalendarDays,
  AlertTriangle,
  Radio,
  History,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  internalMeetingService,
  type InternalMeeting,
  type SmartButtonState,
} from '../../services/meetingService';
import CreateInternalMeetingModal from '../../components/meetings/CreateInternalMeetingModal';
import MeetingSummaryModal from '../../components/meetings/MeetingSummaryModal';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

/* ===================== مساعدات ===================== */

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const fmtTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

const fmtDayDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'short' });

const fmtShortDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' });

/** تسمية نسبية لليوم: اليوم / غداً / الخميس 12 يونيو */
const relativeDay = (dateStr: string): string => {
  const today = startOfDay(new Date());
  const d = startOfDay(new Date(dateStr));
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'اليوم';
  if (diff === 1) return 'غداً';
  return fmtDayDate(dateStr);
};

const STATUS_LABELS: Record<InternalMeeting['status'], string> = {
  scheduled: 'مجدول',
  in_progress: 'جارٍ الآن',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

const StatusBadge: React.FC<{ status: InternalMeeting['status'] }> = ({ status }) => (
  <span className={`im-badge im-badge--${status}`}>{STATUS_LABELS[status]}</span>
);

/* ===================== تجميع زمني ===================== */

type GroupKey = 'live' | 'today' | 'tomorrow' | 'week' | 'later' | 'missed' | 'needs_summary' | 'past';

interface Group {
  key: GroupKey;
  title: string;
  icon: React.ReactNode;
  meetings: InternalMeeting[];
  tone?: 'live' | 'warn' | 'dim';
  hint?: string;
}

const groupMeetings = (meetings: InternalMeeting[]): Group[] => {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const dayAfter = addDays(today, 2);
  const weekEnd = addDays(today, 7);

  const g: Record<GroupKey, InternalMeeting[]> = {
    live: [], today: [], tomorrow: [], week: [], later: [],
    missed: [], needs_summary: [], past: [],
  };

  for (const m of meetings) {
    const at = new Date(m.scheduled_at);
    if (m.status === 'in_progress') g.live.push(m);
    else if (m.status === 'completed' && !m.summary) g.needs_summary.push(m);
    else if (m.status === 'completed' || m.status === 'cancelled') g.past.push(m);
    else if (m.status === 'scheduled') {
      const endAt = new Date(at.getTime() + (m.duration_minutes || 60) * 60000);
      if (endAt < now) g.missed.push(m);            // مجدول فات وقته ولم يُعقد
      else if (at < tomorrow) g.today.push(m);
      else if (at < dayAfter) g.tomorrow.push(m);
      else if (at < weekEnd) g.week.push(m);
      else g.later.push(m);
    }
  }

  const asc = (a: InternalMeeting, b: InternalMeeting) =>
    new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  const desc = (a: InternalMeeting, b: InternalMeeting) => -asc(a, b);
  (['live', 'today', 'tomorrow', 'week', 'later'] as GroupKey[]).forEach(k => g[k].sort(asc));
  (['missed', 'needs_summary', 'past'] as GroupKey[]).forEach(k => g[k].sort(desc));

  const defs: Group[] = [
    { key: 'live', title: 'جارية الآن', icon: <Radio size={14} />, meetings: g.live, tone: 'live' },
    { key: 'today', title: 'اليوم', icon: <CalendarClock size={14} />, meetings: g.today },
    { key: 'tomorrow', title: 'غداً', icon: <CalendarDays size={14} />, meetings: g.tomorrow },
    { key: 'week', title: 'هذا الأسبوع', icon: <CalendarDays size={14} />, meetings: g.week },
    { key: 'later', title: 'لاحقاً', icon: <CalendarDays size={14} />, meetings: g.later },
    {
      key: 'missed', title: 'فائتة دون انعقاد', icon: <AlertTriangle size={14} />, meetings: g.missed, tone: 'warn',
      hint: 'اجتماعات مجدولة مضى وقتها ولم تُبدأ — ابدأها متأخرة أو ألغِها أو أعد جدولتها',
    },
    {
      key: 'needs_summary', title: 'بانتظار الملخص', icon: <FileText size={14} />, meetings: g.needs_summary, tone: 'warn',
      hint: 'اجتماعات انعقدت ولم يُوثَّق ملخصها بعد — لا تضيع قراراتها',
    },
    { key: 'past', title: 'السابقة', icon: <History size={14} />, meetings: g.past, tone: 'dim' },
  ];

  return defs.filter(d => d.meetings.length > 0);
};

/* ===================== الصفحة ===================== */

const InternalMeetings: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [meetings, setMeetings] = useState<InternalMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<InternalMeeting | null>(null);
  const [buttonStates, setButtonStates] = useState<Record<number, SmartButtonState>>({});
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [pastCollapsed, setPastCollapsed] = useState(true);

  const fetchMeetings = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const data = await internalMeetingService.getAll({});
      setMeetings(data);

      const actionable = data.filter(m => m.status === 'scheduled' || m.status === 'in_progress');
      const states: Record<number, SmartButtonState> = {};
      await Promise.all(
        actionable.map(async meeting => {
          try {
            states[meeting.id] = await internalMeetingService.getButtonState(meeting.id);
          } catch { /* تجاهل فشل زر واحد */ }
        })
      );
      setButtonStates(states);
    } catch (err) {
      console.error('Error fetching meetings:', err);
      setError('حدث خطأ في جلب الاجتماعات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  // إغلاق قائمة الإجراءات عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeMenu !== null && !(e.target as HTMLElement).closest('.im-dropdown')) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenu]);

  /* ----- الفلاتر ----- */
  const filteredMeetings = useMemo(() => meetings.filter(m => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const inTitle = m.title.toLowerCase().includes(term);
      const inAgenda = m.agenda?.toLowerCase().includes(term);
      const inParticipant = m.participants?.some(p => p.user?.name?.toLowerCase().includes(term));
      if (!inTitle && !inAgenda && !inParticipant) return false;
    }
    return true;
  }), [meetings, searchTerm, statusFilter]);

  const groups = useMemo(() => groupMeetings(filteredMeetings), [filteredMeetings]);

  /* ----- مؤشرات ----- */
  const kpis = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const weekEnd = addDays(today, 7);
    const scheduled = meetings.filter(m => m.status === 'scheduled' && new Date(m.scheduled_at) >= now);
    return {
      live: meetings.filter(m => m.status === 'in_progress').length,
      today: scheduled.filter(m => new Date(m.scheduled_at) < addDays(today, 1)).length,
      week: scheduled.filter(m => new Date(m.scheduled_at) < weekEnd).length,
      upcoming: scheduled.length,
      needsSummary: meetings.filter(m => m.status === 'completed' && !m.summary).length,
      completed: meetings.filter(m => m.status === 'completed').length,
    };
  }, [meetings]);

  const nextMeeting = useMemo(() => {
    const now = new Date();
    return meetings
      .filter(m => m.status === 'scheduled' && new Date(m.scheduled_at) >= now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0] ?? null;
  }, [meetings]);

  /* ----- إجراءات ----- */
  const handleStartMeeting = async (meeting: InternalMeeting) => {
    try {
      await internalMeetingService.start(meeting.id);
      fetchMeetings(true);
    } catch (err) { console.error('Error starting meeting:', err); }
  };

  const handleCancelMeeting = async (meeting: InternalMeeting) => {
    const reason = prompt('سبب الإلغاء:');
    if (reason) {
      try {
        await internalMeetingService.cancel(meeting.id, reason);
        fetchMeetings(true);
      } catch (err) { console.error('Error cancelling meeting:', err); }
    }
  };

  const handleDeleteMeeting = async (meeting: InternalMeeting) => {
    if (confirm('هل أنت متأكد من حذف هذا الاجتماع؟')) {
      try {
        await internalMeetingService.delete(meeting.id);
        fetchMeetings(true);
      } catch (err) { console.error('Error deleting meeting:', err); }
    }
  };

  const handleOpenSummary = (meeting: InternalMeeting) => {
    setSelectedMeeting(meeting);
    setShowSummaryModal(true);
  };

  /* ----- الزر الذكي ----- */
  const renderSmartButton = (meeting: InternalMeeting) => {
    if (meeting.status === 'completed') {
      return (
        <button className="im-smart im-smart--view" onClick={() => handleOpenSummary(meeting)}>
          <FileText size={13} /> {meeting.summary ? 'عرض الملخص' : 'كتابة الملخص'}
        </button>
      );
    }
    if (meeting.status === 'cancelled') {
      return <span className="im-dim">{meeting.cancellation_reason ? `ملغي — ${meeting.cancellation_reason}` : 'ملغي'}</span>;
    }

    const state = buttonStates[meeting.id];
    if (!state) return <span className="im-dim">…</span>;

    switch (state.status) {
      case 'upcoming':
        return <button className="im-smart" disabled><Clock size={13} /> قريباً</button>;
      case 'join':
        return (
          <button
            className="im-smart im-smart--join"
            onClick={() => {
              if (meeting.video_meeting_url) window.open(meeting.video_meeting_url, '_blank');
              handleStartMeeting(meeting);
            }}
          >
            <Video size={13} /> دخول الاجتماع
          </button>
        );
      case 'write_summary':
        return (
          <button className="im-smart im-smart--summary" onClick={() => handleOpenSummary(meeting)}>
            <FileText size={13} /> كتابة الملخص
          </button>
        );
      case 'view_summary':
        return (
          <button className="im-smart im-smart--view" onClick={() => handleOpenSummary(meeting)}>
            <FileText size={13} /> عرض الملخص
          </button>
        );
      default:
        return null;
    }
  };

  const renderAdminMenu = (meeting: InternalMeeting) => {
    if (!isAdmin || meeting.status !== 'scheduled') return null;
    return (
      <div className="im-dropdown">
        <button
          className="im-iconbtn"
          onClick={() => setActiveMenu(activeMenu === meeting.id ? null : meeting.id)}
        >
          <MoreVertical size={15} />
        </button>
        {activeMenu === meeting.id && (
          <div className="im-dropdown__menu">
            <button onClick={() => { setSelectedMeeting(meeting); setShowCreateModal(true); setActiveMenu(null); }}>
              <Edit2 size={13} /> تعديل
            </button>
            <button onClick={() => { handleCancelMeeting(meeting); setActiveMenu(null); }}>
              <XCircle size={13} /> إلغاء
            </button>
            <button className="im-danger" onClick={() => { handleDeleteMeeting(meeting); setActiveMenu(null); }}>
              <Trash2 size={13} /> حذف
            </button>
          </div>
        )}
      </div>
    );
  };

  /* ----- صف الاجتماع ----- */
  const renderRow = (meeting: InternalMeeting, showRelativeDay = true) => (
    <div key={meeting.id} className={`im-row ${meeting.status === 'cancelled' ? 'im-row--cancelled' : ''}`}>
      <div className="im-row__time">
        <b>{fmtTime(meeting.scheduled_at)}</b>
        <span>{showRelativeDay ? relativeDay(meeting.scheduled_at) : fmtShortDate(meeting.scheduled_at)}</span>
        <em>{meeting.duration_minutes} دقيقة</em>
      </div>

      <div className="im-row__main">
        <div className="im-row__title">
          {meeting.title}
          {meeting.status === 'completed' && !meeting.summary && (
            <span className="im-chip im-chip--warn"><AlertTriangle size={10} /> بلا ملخص</span>
          )}
        </div>
        {meeting.agenda && <div className="im-row__agenda">{meeting.agenda}</div>}
        <div className="im-row__meta">
          {meeting.creator?.name && <span><UserIcon size={11} /> {meeting.creator.name}</span>}
          {meeting.video_meeting_url ? (
            <span className="im-type im-type--remote"><Video size={11} /> عن بُعد</span>
          ) : (
            <span className="im-type"><MapPin size={11} /> {meeting.location || 'حضوري'}</span>
          )}
        </div>
      </div>

      <div className="im-row__people" title={meeting.participants?.map(p => p.user?.name).filter(Boolean).join('، ')}>
        {meeting.participants?.slice(0, 4).map(p => (
          <span key={p.id} className="im-avatar">{p.user?.name?.charAt(0) || '؟'}</span>
        ))}
        {meeting.participants && meeting.participants.length > 4 && (
          <span className="im-avatar im-avatar--more">+{meeting.participants.length - 4}</span>
        )}
        <span className="im-people-count">{meeting.participants?.length ?? 0}</span>
      </div>

      <div className="im-row__status"><StatusBadge status={meeting.status} /></div>

      <div className="im-row__actions">
        {renderSmartButton(meeting)}
        {renderAdminMenu(meeting)}
      </div>
    </div>
  );

  /* ===================== العرض ===================== */

  return (
    <div className="im-page" dir="rtl">
      {/* الترويسة */}
      <div className="im-header">
        <div>
          <h1><Users size={19} /> الاجتماعات الداخلية</h1>
          <span className="im-header__sub">
            لفريق المكتب فقط (المحامون والموظفون) — مواعيد العملاء لها صفحتها المستقلة
          </span>
        </div>
        <div className="im-header__tools">
          <div className="im-search">
            <Search size={14} />
            <input
              placeholder="بحث بالعنوان أو الأجندة أو مشارك…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="im-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">كل الحالات</option>
            <option value="scheduled">مجدول</option>
            <option value="in_progress">جارٍ</option>
            <option value="completed">مكتمل</option>
            <option value="cancelled">ملغي</option>
          </select>
          <button className="im-iconbtn im-iconbtn--bordered" onClick={() => fetchMeetings(true)} disabled={refreshing} title="تحديث">
            <RefreshCw size={14} className={refreshing ? 'im-spin' : ''} />
          </button>
          {isAdmin && (
            <button className="im-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={15} /> اجتماع جديد
            </button>
          )}
        </div>
      </div>

      {/* المؤشرات */}
      {!loading && meetings.length > 0 && (
        <div className="im-kpis">
          {kpis.live > 0 && (
            <div className="im-kpi im-kpi--live"><Radio size={14} /><b>{kpis.live}</b><span>جارية الآن</span></div>
          )}
          <div className="im-kpi"><CalendarClock size={14} /><b>{kpis.today}</b><span>اليوم</span></div>
          <div className="im-kpi"><CalendarDays size={14} /><b>{kpis.week}</b><span>هذا الأسبوع</span></div>
          <div className="im-kpi"><Clock size={14} /><b>{kpis.upcoming}</b><span>قادمة إجمالاً</span></div>
          <div className={`im-kpi ${kpis.needsSummary > 0 ? 'im-kpi--warn' : ''}`}>
            <FileText size={14} /><b>{kpis.needsSummary}</b><span>بانتظار الملخص</span>
          </div>
          <div className="im-kpi"><History size={14} /><b>{kpis.completed}</b><span>مكتملة</span></div>
        </div>
      )}

      {/* الاجتماع التالي */}
      {!loading && nextMeeting && !searchTerm && statusFilter === 'all' && (
        <div className="im-next">
          <div className="im-next__label"><CalendarClock size={14} /> اجتماعك التالي</div>
          <div className="im-next__info">
            <b>{nextMeeting.title}</b>
            <span>
              {relativeDay(nextMeeting.scheduled_at)} · {fmtTime(nextMeeting.scheduled_at)} · {nextMeeting.duration_minutes} دقيقة
              {nextMeeting.video_meeting_url ? ' · عن بُعد' : nextMeeting.location ? ` · ${nextMeeting.location}` : ''}
              {' · '}{nextMeeting.participants?.length ?? 0} مشاركاً
            </span>
          </div>
          <div className="im-next__action">{renderSmartButton(nextMeeting)}</div>
        </div>
      )}

      {/* المحتوى */}
      {loading ? (
        <div className="im-state"><RefreshCw size={16} className="im-spin" /> جارٍ تحميل الاجتماعات…</div>
      ) : error ? (
        <div className="im-state im-state--error">
          <XCircle size={32} />
          <p>{error}</p>
          <button className="im-btn" onClick={() => fetchMeetings()}>إعادة المحاولة</button>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="im-state">
          <Users size={42} />
          <p>{meetings.length === 0 ? 'لا توجد اجتماعات بعد' : 'لا نتائج مطابقة للبحث أو الفلتر'}</p>
          {isAdmin && meetings.length === 0 && (
            <button className="im-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={15} /> إنشاء أول اجتماع
            </button>
          )}
        </div>
      ) : (
        groups.map(group => {
          const collapsed = group.key === 'past' && pastCollapsed;
          return (
            <section key={group.key} className={`im-group ${group.tone ? `im-group--${group.tone}` : ''}`}>
              <header
                className="im-group__head"
                onClick={group.key === 'past' ? () => setPastCollapsed(c => !c) : undefined}
                style={group.key === 'past' ? { cursor: 'pointer' } : undefined}
              >
                {group.icon}
                <h2>{group.title}</h2>
                <span className="im-group__count">{group.meetings.length}</span>
                {group.hint && <span className="im-group__hint">{group.hint}</span>}
                {group.key === 'past' && (
                  <span className="im-group__toggle">{pastCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}</span>
                )}
              </header>
              {!collapsed && (
                <div className="im-group__rows">
                  {group.meetings.map(m =>
                    renderRow(m, ['live', 'today', 'tomorrow', 'week'].includes(group.key))
                  )}
                </div>
              )}
            </section>
          );
        })
      )}

      {/* النوافذ */}
      {showCreateModal && (
        <CreateInternalMeetingModal
          meeting={selectedMeeting}
          onClose={() => { setShowCreateModal(false); setSelectedMeeting(null); }}
          onSuccess={() => { setShowCreateModal(false); setSelectedMeeting(null); fetchMeetings(true); }}
        />
      )}
      {showSummaryModal && selectedMeeting && (
        <MeetingSummaryModal
          meeting={selectedMeeting}
          onClose={() => { setShowSummaryModal(false); setSelectedMeeting(null); }}
          onSave={() => { setShowSummaryModal(false); setSelectedMeeting(null); fetchMeetings(true); }}
        />
      )}
    </div>
  );
};

export default InternalMeetings;
