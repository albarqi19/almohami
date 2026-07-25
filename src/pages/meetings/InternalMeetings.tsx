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
  ChevronsLeft,
  ChevronsRight,
  User as UserIcon,
  Link2 as LinkIcon,
  X,
} from 'lucide-react';
import { usePermissionContext } from '../../contexts/PermissionContext';
import {
  internalMeetingService,
  type InternalMeeting,
  type MeetingCategory,
  type SmartButtonState,
} from '../../services/meetingService';
import meetingCategoryService from '../../services/meetingCategoryService';
import CreateInternalMeetingModal from '../../components/meetings/CreateInternalMeetingModal';
import MeetingSummaryModal from '../../components/meetings/MeetingSummaryModal';
import MeetingsSideCalendar from '../../components/meetings/MeetingsSideCalendar';
import MyDayCalendar from './MyDayCalendar';
import { fmtShortDateAr, fmtTimeAr, relativeDayAr, riyadhDayKey } from '../../utils/dateAr';
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

// التواريخ كلها عبر utils/dateAr: تقويم ومنطقة زمنية مصرَّح بهما دائماً
// (Asia/Riyadh + gregory). النسخ المحلية السابقة كانت تتبع منطقة الجهاز
// وتقويم اللغة الافتراضي، فيختلف ما يراه موظفان عن الاجتماع نفسه.
const fmtTime = fmtTimeAr;
const fmtShortDate = fmtShortDateAr;
const relativeDay = relativeDayAr;

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
    { key: 'live', title: 'جارية الآن', icon: <Radio size={13} />, meetings: g.live, tone: 'live' },
    { key: 'today', title: 'اليوم', icon: <CalendarClock size={13} />, meetings: g.today },
    { key: 'tomorrow', title: 'غداً', icon: <CalendarDays size={13} />, meetings: g.tomorrow },
    { key: 'week', title: 'هذا الأسبوع', icon: <CalendarDays size={13} />, meetings: g.week },
    { key: 'later', title: 'لاحقاً', icon: <CalendarDays size={13} />, meetings: g.later },
    {
      key: 'missed', title: 'فائتة دون انعقاد', icon: <AlertTriangle size={13} />, meetings: g.missed, tone: 'warn',
      hint: 'مضى وقتها ولم تُبدأ — ابدأها متأخرة أو ألغِها أو أعد جدولتها',
    },
    {
      key: 'needs_summary', title: 'بانتظار الملخص', icon: <FileText size={13} />, meetings: g.needs_summary, tone: 'warn',
      hint: 'انعقدت ولم يُوثَّق ملخصها بعد',
    },
    { key: 'past', title: 'السابقة', icon: <History size={13} />, meetings: g.past, tone: 'dim' },
  ];

  return defs.filter(d => d.meetings.length > 0);
};

/* ===================== الصفحة ===================== */

const SIDE_KEY = 'im.calendar.min';
const VIEW_KEY = 'meetings.view';

const InternalMeetings: React.FC = () => {
  const { has } = usePermissionContext();
  // كان `user?.role === 'admin'` وحده: يستثني المالك والشريك وكل دور مخصّص
  // ينشئه المكتب، فيخفي زرّ الإنشاء عمّن يملك الصلاحية فعلاً.
  const canCreate = has('meetings.create');

  // التبويب الافتراضي **التقويم**: هو ما يجيب «وش عندي؟» بنظرة واحدة، والقائمة
  // تجيب «أين اجتماع كذا؟» — وهو سؤال أندر. والاختيار يُحفظ فمن يفضّل القائمة
  // لا يعود إليها كل مرة.
  const [view, setView] = useState<'calendar' | 'list'>(
    () => (localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'calendar')
  );
  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);

  const [meetings, setMeetings] = useState<InternalMeeting[]>([]);
  const [categories, setCategories] = useState<MeetingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<InternalMeeting | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  // اتجاه فتح قائمة الإجراءات: القائمة داخل حاوية تتمرّر، فالفتح لأسفل قرب
  // آخر الشاشة يضعها خارج المنطقة المرئية. نقيس عند الفتح ونقلبها لأعلى.
  const [menuUp, setMenuUp] = useState(false);
  const [pastCollapsed, setPastCollapsed] = useState(true);

  const openRowMenu = (id: number, button: HTMLElement) => {
    if (activeMenu === id) { setActiveMenu(null); return; }
    const rect = button.getBoundingClientRect();
    setMenuUp(window.innerHeight - rect.bottom < 180);
    setActiveMenu(id);
  };

  // اليوم المختار من التقويم — يُصفّي القائمة بدل أن يفتح تبويباً منفصلاً
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // طيّ عمود التقويم (نمط ssp2: شريط 46px بنص عمودي)
  const [calendarMin, setCalendarMin] = useState(() => localStorage.getItem(SIDE_KEY) === '1');
  const toggleCalendar = (min: boolean) => {
    setCalendarMin(min);
    localStorage.setItem(SIDE_KEY, min ? '1' : '0');
  };

  const fetchMeetings = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const data = await internalMeetingService.getAll({});
      setMeetings(data);
    } catch (err) {
      console.error('Error fetching meetings:', err);
      setError('حدث خطأ في جلب الاجتماعات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  useEffect(() => {
    meetingCategoryService.list()
      .then(({ categories: rows }) => setCategories(rows.filter(c => c.is_active)))
      .catch(() => { /* التصنيفات زينة القائمة لا شرط عملها */ });
  }, []);

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
    if (categoryFilter && m.meeting_category_id !== categoryFilter) return false;
    if (selectedDay && riyadhDayKey(m.scheduled_at) !== selectedDay) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const inTitle = m.title.toLowerCase().includes(term);
      const inAgenda = m.agenda?.toLowerCase().includes(term);
      const inPeople = m.attendees?.some(a => a.display_name?.toLowerCase().includes(term))
        ?? m.participants?.some(p => p.user?.name?.toLowerCase().includes(term));
      if (!inTitle && !inAgenda && !inPeople) return false;
    }
    return true;
  }), [meetings, searchTerm, statusFilter, categoryFilter, selectedDay]);

  const groups = useMemo(() => groupMeetings(filteredMeetings), [filteredMeetings]);

  /* ----- حقائق الترويسة (بدل صفّ المربعات) ----- */
  const facts = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const weekEnd = addDays(today, 7);
    const scheduled = meetings.filter(m => m.status === 'scheduled' && new Date(m.scheduled_at) >= now);
    return {
      live: meetings.filter(m => m.status === 'in_progress').length,
      today: scheduled.filter(m => new Date(m.scheduled_at) < addDays(today, 1)).length,
      week: scheduled.filter(m => new Date(m.scheduled_at) < weekEnd).length,
      needsSummary: meetings.filter(m => m.status === 'completed' && !m.summary).length,
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

  /* ----- الزر الذكي (حالته تصل داخل حمولة القائمة) ----- */
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

    const state: SmartButtonState | undefined = meeting.smart_button;
    if (!state) return null;

    switch (state.status) {
      case 'upcoming':
        return (
          <button className="im-smart" disabled title={state.sublabel}>
            <Clock size={13} /> قريباً
          </button>
        );
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

  const renderRowMenu = (meeting: InternalMeeting) => {
    const may = meeting.can;
    if (meeting.status !== 'scheduled') return null;
    if (may && !may.update && !may.delete) return null;

    return (
      <div className="im-dropdown">
        <button
          className="im-iconbtn"
          onClick={(e) => openRowMenu(meeting.id, e.currentTarget)}
          aria-label="إجراءات"
          aria-expanded={activeMenu === meeting.id}
        >
          <MoreVertical size={15} />
        </button>
        {activeMenu === meeting.id && (
          <div className={`im-dropdown__menu${menuUp ? ' im-dropdown__menu--up' : ''}`}>
            {(!may || may.update) && (
              <>
                <button onClick={() => { setSelectedMeeting(meeting); setShowCreateModal(true); setActiveMenu(null); }}>
                  <Edit2 size={13} /> تعديل
                </button>
                <button onClick={() => { handleCancelMeeting(meeting); setActiveMenu(null); }}>
                  <XCircle size={13} /> إلغاء
                </button>
              </>
            )}
            {(!may || may.delete) && (
              <button className="im-danger" onClick={() => { handleDeleteMeeting(meeting); setActiveMenu(null); }}>
                <Trash2 size={13} /> حذف
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ----- صف الاجتماع ----- */
  const renderRow = (meeting: InternalMeeting, showRelativeDay = true) => {
    const people = meeting.attendees ?? meeting.participants ?? [];

    return (
      <div key={meeting.id} className={`im-row ${meeting.status === 'cancelled' ? 'im-row--cancelled' : ''}`}>
        <div className="im-row__time">
          <b>{fmtTime(meeting.scheduled_at)}</b>
          <span>{showRelativeDay ? relativeDay(meeting.scheduled_at) : fmtShortDate(meeting.scheduled_at)}</span>
          <em>{meeting.duration_minutes} دقيقة</em>
        </div>

        <div className="im-row__main">
          <div className="im-row__title">
            {/* رقاقة التصنيف: اللون هنا وحده يحمل معنى، ومعه اسمه نصّاً ونقطة
                مصمتة — ثلاث إشارات فلا يعتمد التمييز على اللون وحده. */}
            {meeting.category && (
              <span className={`cat-chip cat-${meeting.category.color}`} title={`التصنيف: ${meeting.category.name}`}>
                <span className="cat-dot" aria-hidden="true" />
                {meeting.category.name}
              </span>
            )}
            <span className="im-row__name">{meeting.title}</span>
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
            {meeting.audience && meeting.audience !== 'internal' && (
              <span className="im-type">{meeting.audience === 'client' ? 'مع عميل' : 'مع طرف خارجي'}</span>
            )}
            {meeting.linked && (
              <span className="im-type" title={`${meeting.linked.type_label}: ${meeting.linked.title}`}>
                <LinkIcon size={11} /> {meeting.linked.reference || meeting.linked.title}
              </span>
            )}
          </div>
        </div>

        <div className="im-row__people" title={people.map(p => ('display_name' in p ? p.display_name : p.user?.name)).filter(Boolean).join('، ')}>
          {people.slice(0, 4).map(p => (
            <span key={p.id} className="im-avatar">
              {(('display_name' in p ? p.display_name : p.user?.name) || '؟').charAt(0)}
            </span>
          ))}
          {people.length > 4 && <span className="im-avatar im-avatar--more">+{people.length - 4}</span>}
          <span className="im-people-count">{people.length}</span>
        </div>

        <div className="im-row__status"><StatusBadge status={meeting.status} /></div>

        <div className="im-row__actions">
          {renderSmartButton(meeting)}
          {renderRowMenu(meeting)}
        </div>
      </div>
    );
  };

  /* ===================== العرض ===================== */

  return (
    <div className="ssp2-page im2" dir="rtl">
      {/* ─── الترويسة: العنوان + الأدوات + الحقائق (بدل صفّ المربعات) ─── */}
      <header className="ssp2-header">
        <div className="ssp2-header__top">
          <div className="ssp2-header__info">
            <span className="ssp2-header__badge"><Users size={13} /></span>
            <h1 className="ssp2-header__title">الاجتماعات</h1>
            <span className="im2-sub">داخلية أو مع عميل أو مع طرف خارجي</span>
          </div>

          <div className="ssp2-header__actions">
            {/* مبدّل العرض أولاً: هو أعلى قرار في الصفحة، وما بعده أدوات تخصّ
                العرض الحالي وحده. */}
            <div className="im2-views" role="tablist" aria-label="طريقة العرض">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'calendar'}
                className={`im2-view${view === 'calendar' ? ' is-active' : ''}`}
                onClick={() => setView('calendar')}
              >
                <CalendarDays size={13} /> التقويم
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'list'}
                className={`im2-view${view === 'list' ? ' is-active' : ''}`}
                onClick={() => setView('list')}
              >
                <FileText size={13} /> القائمة
              </button>
            </div>

            {/* البحث والحالة والتحديث تخصّ القائمة — إظهارها فوق التقويم يعطي
                أدواتٍ لا تفعل شيئاً، وهو أسوأ من غيابها. */}
            {view === 'list' && (
              <>
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
                <button className="ssp2-icon-btn" onClick={() => fetchMeetings(true)} disabled={refreshing} title="تحديث">
                  <RefreshCw size={14} className={refreshing ? 'im-spin' : ''} />
                </button>
              </>
            )}

            {canCreate && (
              <button className="ssp2-btn ssp2-btn--primary" onClick={() => { setSelectedMeeting(null); setShowCreateModal(true); }}>
                <Plus size={14} /> اجتماع جديد
              </button>
            )}
          </div>
        </div>

        {/* الحقائق تحلّ محلّ خمسة مربعات كانت تحتلّ ثلث الشاشة لتقول أصفاراً.
            و«اجتماعك التالي» حقيقةٌ هنا لا بانر مستقل — كان يكرّر الصفّ نفسه
            الظاهر تحته مباشرةً حين لا يكون في المكتب إلا اجتماع واحد. */}
        {/* حقائق الاجتماعات تخصّ القائمة: التقويم يعرض ستة مصادر، فعدّادٌ يقول
            «اليوم ٢» وفي الشبكة تحته سبعة بنود يقرأ كخطأ لا كتخصيص. وللتقويم
            شريط حقائقه الخاص عبر كل المصادر.
            تفكيك لا `hidden`: ssp2-header__facts فيها display:flex فتغلبه. */}
        {view === 'list' && (
        <div className="ssp2-header__facts">
          {facts.live > 0 && (
            <>
              <span className="ssp2-fact im2-fact--live">
                <Radio size={13} /><span className="ssp2-fact__label">جارية الآن</span><b>{facts.live}</b>
              </span>
              <span className="ssp2-fact__sep" />
            </>
          )}
          <span className="ssp2-fact">
            <CalendarClock size={13} /><span className="ssp2-fact__label">اليوم</span><b>{facts.today}</b>
          </span>
          <span className="ssp2-fact__sep" />
          <span className="ssp2-fact">
            <CalendarDays size={13} /><span className="ssp2-fact__label">هذا الأسبوع</span><b>{facts.week}</b>
          </span>
          {facts.needsSummary > 0 && (
            <>
              <span className="ssp2-fact__sep" />
              <span className="ssp2-fact im2-fact--warn">
                <FileText size={13} /><span className="ssp2-fact__label">بانتظار الملخص</span><b>{facts.needsSummary}</b>
              </span>
            </>
          )}
          {nextMeeting && (
            <>
              <span className="ssp2-fact__sep" />
              <span className="ssp2-fact im2-fact--next">
                <Clock size={13} />
                <span className="ssp2-fact__label">اجتماعك التالي</span>
                <b>{relativeDay(nextMeeting.scheduled_at)} · {fmtTime(nextMeeting.scheduled_at)}</b>
              </span>
            </>
          )}
        </div>
        )}
      </header>

      {/* ─── التقويم: كل ما يشغل وقتي في شبكة واحدة ─── */}
      {view === 'calendar' && <MyDayCalendar />}

      {/* ─── القائمة: التقويم يمين (قابل للطي) + الاجتماعات في الوسط ───
          تفكيك لا إخفاء: `hidden` لا يغلب `display: flex` في ssp2-layout،
          والإبقاء على القائمة حيّة يعني جلباً مستمراً لعرضٍ غير مرئي. */}
      {view === 'list' && (
      <div className="ssp2-layout">
        {calendarMin ? (
          <aside className="ssp2-chatcol ssp2-chatcol--min im2-calcol">
            <button className="ssp2-chatcol__reopen" onClick={() => toggleCalendar(false)} title="فتح التقويم">
              <ChevronsLeft size={15} />
              <span>التقويم</span>
            </button>
          </aside>
        ) : (
          <aside className="ssp2-chatcol im2-calcol">
            <div className="ssp2-card">
              <div className="ssp2-card__head">
                <span className="ssp2-card__title"><CalendarDays size={14} /> التقويم</span>
                <button className="ssp2-icon-btn" onClick={() => toggleCalendar(true)} title="طي التقويم">
                  <ChevronsRight size={14} />
                </button>
              </div>

              <MeetingsSideCalendar
                categories={categories}
                categoryFilter={categoryFilter}
                onCategoryFilter={setCategoryFilter}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
            </div>
          </aside>
        )}

        <main className="ssp2-work">
          {/* ⚠️ لا ssp2-work__scroll هنا: هي `overflow: hidden` بتصميمها (تُمرّر
              البطاقة الأخيرة داخلها لا العمود)، ووضع القائمة عليها مباشرةً
              يجعل ما يتجاوز ارتفاع الشاشة غير قابل للوصول إطلاقاً. */}
          <div className="im2-list">
            {/* شريط سياق التصفية: يقول ما الظاهر ولماذا، وكيف يُلغى */}
            {(selectedDay || categoryFilter) && (
              <div className="im2-scope">
                <span>
                  {selectedDay && <>اجتماعات <b>{fmtShortDate(selectedDay)}</b></>}
                  {selectedDay && categoryFilter && ' · '}
                  {categoryFilter && <>تصنيف <b>{categories.find(c => c.id === categoryFilter)?.name}</b></>}
                </span>
                <button
                  className="im2-scope__clear"
                  onClick={() => { setSelectedDay(null); setCategoryFilter(null); }}
                >
                  <X size={12} /> عرض الكل
                </button>
              </div>
            )}

            {loading ? (
              /* هيكل تحميل حقيقي بشكل الصفوف القادمة — لا بيانات ديمو ولا أرقام
                 مخترَعة تُقرأ لحظةً على أنها واقع. */
              <div className="im-skeleton" aria-busy="true" aria-label="جارٍ تحميل الاجتماعات">
                {Array.from({ length: 6 }, (_, i) => <div key={i} className="im-skeleton__row" />)}
              </div>
            ) : error ? (
              <div className="im-state im-state--error">
                <XCircle size={32} />
                <p>{error}</p>
                <button className="ssp2-btn" onClick={() => fetchMeetings()}>إعادة المحاولة</button>
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="im-state">
                <Users size={40} />
                <p>
                  {meetings.length === 0
                    ? 'لا توجد اجتماعات بعد'
                    : selectedDay
                      ? 'لا اجتماعات في هذا اليوم'
                      : 'لا نتائج مطابقة للبحث أو الفلتر'}
                </p>
                {canCreate && meetings.length === 0 && (
                  <button className="ssp2-btn ssp2-btn--primary" onClick={() => setShowCreateModal(true)}>
                    <Plus size={14} /> إنشاء أول اجتماع
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
          </div>
        </main>
      </div>
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
