import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Mail,
  RefreshCw,
  Search,
  Plus,
  Link2,
  Copy,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Send,
  Table,
  LayoutGrid,
  Trash2,
  Download,
  FileImage,
  FileText,
  FileSpreadsheet,
  List,
  X
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
import MeetingOutcomeModal from '../../components/meetings/MeetingOutcomeModal';
import ClientMeetingsCalendar from '../../components/meetings/ClientMeetingsCalendar';
import ClientMeetingFormModal from '../../components/meetings/ClientMeetingFormModal';
import ClientMeetingDrawer from '../../components/meetings/ClientMeetingDrawer';
import ClientMeetingsAgenda from '../../components/meetings/ClientMeetingsAgenda';
import ClientMeetingsSummary, { type QuickFilter, useClientMeetingCounts } from '../../components/meetings/ClientMeetingsSummary';
import { ApproveClientMeetingDialog, CancelClientMeetingDialog } from '../../components/meetings/ClientMeetingActionDialogs';
import {
  clientDisplayName,
  clientDisplayPhone,
  isMissingLink,
} from '../../components/meetings/clientMeetingHelpers';
import ConfirmDialog from '../../components/ConfirmDialog';
import { fmtTimeAr, riyadhDayKey } from '../../utils/dateAr';
import { getApiErrorMessage } from '../../utils/apiError';

/** «YYYY-MM-DD» بيوم الرياض بعد n يوماً من الآن */
const riyadhDayAfter = (days: number): string => riyadhDayKey(new Date(Date.now() + days * 86_400_000));

type TimeFilter = 'all' | 'today' | 'tomorrow' | 'week' | 'upcoming';
type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'no_show' | 'cancelled';

const TIME_OPTIONS: { key: TimeFilter; label: string }[] = [
  { key: 'upcoming', label: 'القادمة' },
  { key: 'today', label: 'اليوم' },
  { key: 'tomorrow', label: 'غداً' },
  { key: 'week', label: '٧ أيام' },
  { key: 'all', label: 'الكل' },
];

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'كل الحالات' },
  { key: 'pending', label: 'بانتظار الاعتماد' },
  { key: 'confirmed', label: 'مؤكدة' },
  { key: 'completed', label: 'مكتملة' },
  { key: 'no_show', label: 'لم يحضر' },
  { key: 'cancelled', label: 'ملغاة' },
];

const ClientMeetings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // ‏/meetings/client/:meetingId — يفتح لوحة الموعد (روابط الإشعارات و«يومي»)
  const { meetingId } = useParams<{ meetingId?: string }>();

  // State
  const [meetings, setMeetings] = useState<ClientMeeting[]>([]);
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // الحالة تُرشَّح في المتصفّح: النافذة محمّلة كاملةً أصلاً، وبقاؤها كاملةً يُبقي أرقام
  // شريط الملخّص ثابتة مهما تغيّر المرشّح
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [onlyMissingLink, setOnlyMissingLink] = useState(false);
  const [lawyerFilter, setLawyerFilter] = useState<number | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'meetings' | 'links'>('meetings');
  const [showCreateLinkModal, setShowCreateLinkModal] = useState(false);
  const [linkCaseMeeting, setLinkCaseMeeting] = useState<ClientMeeting | null>(null);
  // 'new' = موعد جديد، وموعدٌ = تعديله
  const [formMeeting, setFormMeeting] = useState<ClientMeeting | 'new' | null>(null);
  const [approveMeeting, setApproveMeeting] = useState<ClientMeeting | null>(null);
  const [cancelMeeting, setCancelMeeting] = useState<ClientMeeting | null>(null);
  const [noShowMeeting, setNoShowMeeting] = useState<ClientMeeting | null>(null);
  const [noShowSaving, setNoShowSaving] = useState(false);
  const [deleteLinkTarget, setDeleteLinkTarget] = useState<BookingLink | null>(null);
  const [deletingLink, setDeletingLink] = useState(false);
  // نتيجة الإجراء فوق القائمة — بديل alert(): الخطأ كان يُبتلع في console وحده
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  // موعدٌ فُتح برابطٍ مباشر ويقع خارج النافذة المحمّلة (موعد أمس و«القادمة» مختارة)
  const [deepLinked, setDeepLinked] = useState<ClientMeeting | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<number | null>(null);
  const [linksViewMode, setLinksViewMode] = useState<'table' | 'cards'>('table');
  const [meetingsViewMode, setMeetingsViewMode] = useState<'table' | 'calendar'>('table');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');
  const [showExportMenu, setShowExportMenu] = useState(false);
  // نتيجة الاجتماع: الموعد المعروض في modal النتيجة (إنهاء/عرض/تعديل)
  const [outcomeMeeting, setOutcomeMeeting] = useState<ClientMeeting | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  // الصفحة شاشةٌ واحدة على الكمبيوتر: القائمة تتمرّر داخل .cmo-body لا الصفحة كلّها. فتغيير
  // التصفية أو طريقة العرض يعيدها إلى أوّلها، وإلا بقيت عند موضعٍ من قائمةٍ لم تعد هي.
  // (على الجوّال ليست حاوية تمرير، فلا أثر لهذا هناك.)
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [timeFilter, statusFilter, lawyerFilter, onlyMissingLink, searchTerm, meetingsViewMode]);

  // نافذة الجلب: الجدول بمرشّحٍ زمني يبدأ من اليوم فيكفيه ما بعده (والخادم يجمعه كاملاً
  // صفحةً بعد صفحة)؛ أمّا «الكل» والتقويم فيحتاجان الماضي أيضاً.
  const windowFrom = meetingsViewMode === 'table' && timeFilter !== 'all' ? riyadhDayKey(new Date()) : undefined;

  // Fetch data — silent: تحديثٌ بعد إجراء بلا وميض «جاري التحميل»
  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      setError(null);

      const [meetingsData, linksData] = await Promise.all([
        clientMeetingService.getAll({ from_date: windowFrom }),
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
  }, [windowFrom]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── لوحة الموعد: الرابط هو مصدر الحقيقة (/meetings/client/:meetingId) ──
  const selectedId = meetingId ? Number(meetingId) : null;
  const drawerMeeting = useMemo(() => {
    if (!selectedId) return null;
    return meetings.find((m) => m.id === selectedId) ?? (deepLinked?.id === selectedId ? deepLinked : null);
  }, [selectedId, meetings, deepLinked]);

  // موعدٌ فُتح برابط وليس في النافذة المحمّلة يُجلب وحده؛ وما لا يُرى يُغلق بتنبيه
  useEffect(() => {
    if (!selectedId || loading) return;
    if (meetings.some((m) => m.id === selectedId) || deepLinked?.id === selectedId) return;

    let cancelled = false;
    clientMeetingService
      .getById(selectedId)
      .then((m) => {
        if (!cancelled) setDeepLinked(m);
      })
      .catch(() => {
        if (cancelled) return;
        setNotice({ tone: 'error', text: 'الموعد غير موجود أو لا تملك صلاحية عرضه' });
        navigate('/meetings/client', { replace: true });
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, loading, meetings, deepLinked, navigate]);

  // النقر من القائمة يُضيف خطوةً في السجلّ فيُغلق «رجوع» اللوحة؛ والرابط المباشر يُستبدل
  const openMeeting = (meeting: ClientMeeting) => {
    navigate(`/meetings/client/${meeting.id}`, { state: { fromList: true } });
  };

  const closeMeeting = useCallback(() => {
    if ((location.state as { fromList?: boolean } | null)?.fromList) {
      navigate(-1);
    } else {
      navigate('/meetings/client', { replace: true });
    }
  }, [location.state, navigate]);

  // التنبيه الناجح يختفي وحده؛ الخطأ يبقى حتى يُقرأ ويُغلق
  useEffect(() => {
    if (!notice || notice.tone !== 'success') return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /** بعد أي إجراء: التنبيه، وتحديث القائمة بصمت، ونسخةٌ حديثة من الموعد المفتوح برابط. */
  const afterAction = (message: string) => {
    setNotice({ tone: 'success', text: message });
    fetchData({ silent: true });
    if (deepLinked) {
      clientMeetingService.getById(deepLinked.id).then(setDeepLinked).catch(() => undefined);
    }
  };

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  // محامو المواعيد المحمّلة — المرشّح يظهر لمن يرى أكثر من محامٍ (مدير المكتب) وحده
  const lawyerOptions = useMemo(() => {
    const names = new Map<number, string>();
    meetings.forEach((m) => {
      if (m.lawyer?.name) names.set(m.lawyer_id, m.lawyer.name);
    });
    return [...names.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [meetings]);
  // مرشّحٌ لم يعد بين الخيارات (بعد تحديث) لا يبقى فعّالاً وهو مخفي
  const activeLawyer = lawyerOptions.some((o) => o.id === lawyerFilter) ? lawyerFilter : 'all';

  // Filter — بيوم الرياض لا يوم الجهاز: الخادم يبدأ نافذته بيوم الرياض أيضاً
  const todayKey = riyadhDayKey(new Date());
  const filteredMeetings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const tomorrowKey = riyadhDayAfter(1);
    const weekEndKey = riyadhDayAfter(6);

    const list = meetings.filter(meeting => {
      if (term) {
        const matchesTitle = meeting.title?.toLowerCase().includes(term);
        const matchesClient = clientDisplayName(meeting).toLowerCase().includes(term);
        const matchesPhone = clientDisplayPhone(meeting)?.includes(term);
        if (!matchesTitle && !matchesClient && !matchesPhone) return false;
      }

      if (activeLawyer !== 'all' && meeting.lawyer_id !== activeLawyer) return false;

      if (statusFilter === 'cancelled') {
        if (meeting.status !== 'cancelled_by_client' && meeting.status !== 'cancelled_by_lawyer') return false;
      } else if (statusFilter !== 'all' && meeting.status !== statusFilter) {
        return false;
      }

      if (onlyMissingLink && !isMissingLink(meeting)) return false;

      // Time filter — يُتجاوز في وضع التقويم لأنه يحدّد النطاق بالشهر المعروض
      // (وإلا تظهر أيام الماضي فارغة رغم وجود مواعيد فيها)
      if (timeFilter !== 'all' && meetingsViewMode !== 'calendar') {
        const day = riyadhDayKey(meeting.scheduled_at);
        if (timeFilter === 'today' && day !== todayKey) return false;
        if (timeFilter === 'tomorrow' && day !== tomorrowKey) return false;
        if (timeFilter === 'week' && (day < todayKey || day > weekEndKey)) return false;
        if (timeFilter === 'upcoming' && day < todayKey) return false;
      }

      return true;
    });

    // «القادمة» وأخواتها: الأقرب أولاً — الخادم يرتّب تنازلياً فكان أبعدُ موعدٍ في
    // الرأس. و«الكل» يبقى الأحدث أولاً.
    const ascending = timeFilter !== 'all';
    return [...list].sort((a, b) => {
      const diff = new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      return ascending ? diff : -diff;
    });
  }, [meetings, searchTerm, activeLawyer, statusFilter, onlyMissingLink, timeFilter, meetingsViewMode, todayKey]);

  // عدّادات «اليوم» و«٧ أيام» على زرَّي الفترة، وشريحتا التنبيه في شريط الأدوات
  const counts = useClientMeetingCounts(meetings);

  // بطاقة الملخّص النشطة مشتقّةٌ من المرشّحات نفسها — لا حالةٌ ثالثة تنحرف عنها
  const activeQuick: QuickFilter | null = onlyMissingLink
    ? 'missing_link'
    : statusFilter === 'pending'
      ? 'pending'
      : statusFilter === 'all' && timeFilter === 'today'
        ? 'today'
        : statusFilter === 'all' && timeFilter === 'week'
          ? 'week'
          : null;

  const hasFilters = searchTerm.trim() !== '' || statusFilter !== 'all' || onlyMissingLink
    || activeLawyer !== 'all' || timeFilter !== 'upcoming';

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setOnlyMissingLink(false);
    setLawyerFilter('all');
    setTimeFilter('upcoming');
  };

  // نقر البطاقة يطبّق مرشّحها؛ ونقرها ثانيةً يعيد «القادمة» كما كانت
  const pickQuick = (quick: QuickFilter) => {
    if (quick === activeQuick) {
      setStatusFilter('all');
      setOnlyMissingLink(false);
      setTimeFilter('upcoming');
      return;
    }
    setMeetingsViewMode('table');
    setOnlyMissingLink(quick === 'missing_link');
    setStatusFilter(quick === 'pending' ? 'pending' : 'all');
    setTimeFilter(quick === 'today' ? 'today' : quick === 'week' ? 'week' : 'upcoming');
  };

  // وقت التصدير بتوقيت الرياض — كالقائمة نفسها لا كمنطقة جهاز المستخدم
  const formatTime = (dateStr: string) => fmtTimeAr(dateStr);

  // Actions
  const handleCopyLink = async (link: BookingLink) => {
    if (link.full_url || link.url) {
      const success = await bookingHelpers.copyLinkToClipboard(link.full_url || link.url || '');
      if (success) {
        setCopiedLinkId(link.id);
        setTimeout(() => setCopiedLinkId(null), 2000);
      }
    }
  };

  // اعتمادُ طلبٍ قادم من بوابة العميل — يُرسل له التأكيد (واتساب/بريد) وجرس البوابة.
  // عبر نافذةٍ لا مباشرةً: طلبٌ «عن بُعد» يُرفق رابطه مع الاعتماد نفسه.
  const handleConfirmMeeting = (meeting: ClientMeeting) => {
    setApproveMeeting(meeting);
  };

  // الإلغاء عبر نافذةٍ بسببٍ إلزامي (يصل العميلَ) — بدل prompt() الذي كان يُلغي بصمت عند الخطأ
  const handleCancelMeeting = (meeting: ClientMeeting) => {
    setCancelMeeting(meeting);
  };

  // فتح modal نتيجة الاجتماع (إنهاء/عرض/تعديل) — بدل prompt
  const handleOpenOutcome = (meeting: ClientMeeting) => {
    setOutcomeMeeting(meeting);
  };

  const handleEditMeeting = (meeting: ClientMeeting) => {
    setFormMeeting(meeting);
  };

  const handleNoShow = (meeting: ClientMeeting) => {
    setNoShowMeeting(meeting);
  };

  const confirmNoShow = async () => {
    if (!noShowMeeting) return;
    setNoShowSaving(true);
    try {
      await clientMeetingService.markNoShow(noShowMeeting.id);
      setNoShowMeeting(null);
      afterAction('سُجّل عدم حضور العميل');
    } catch (err) {
      setNoShowMeeting(null);
      setNotice({ tone: 'error', text: getApiErrorMessage(err, 'تعذّر تسجيل عدم الحضور') });
    } finally {
      setNoShowSaving(false);
    }
  };

  const handleDeleteLink = (link: BookingLink) => {
    setDeleteLinkTarget(link);
  };

  const confirmDeleteLink = async () => {
    if (!deleteLinkTarget) return;
    setDeletingLink(true);
    try {
      await bookingLinkService.delete(deleteLinkTarget.id);
      setDeleteLinkTarget(null);
      afterAction('حُذف رابط الحجز');
    } catch (err) {
      setDeleteLinkTarget(null);
      setNotice({ tone: 'error', text: getApiErrorMessage(err, 'تعذّر حذف الرابط') });
    } finally {
      setDeletingLink(false);
    }
  };

  const handleResendLink = async (link: BookingLink) => {
    try {
      await bookingLinkService.resend(link.id, 'both');
      setNotice({ tone: 'success', text: 'تم إعادة إرسال الرابط بنجاح' });
    } catch (err) {
      console.error('Error resending link:', err);
      setNotice({ tone: 'error', text: getApiErrorMessage(err, 'تعذّر إعادة إرسال الرابط') });
    }
  };

  // Get today's meetings
  const getTodayMeetings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    return meetings.filter(meeting => {
      const meetingDate = new Date(meeting.scheduled_at);
      return meetingDate >= today && meetingDate <= todayEnd;
    });
  };

  // Get filename with date
  const getExportFileName = () => {
    const today = new Date();
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dayName = dayNames[today.getDay()];
    const dateStr = today.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    return `مواعيد_${dayName}_${dateStr}`.replace(/\s/g, '_');
  };

  // Export as Image
  const exportAsImage = async () => {
    const todayMeetings = getTodayMeetings();
    if (todayMeetings.length === 0) {
      setShowExportMenu(false);
      setNotice({ tone: 'error', text: 'لا توجد مواعيد اليوم لتصديرها' });
      return;
    }

    // Create a temporary div for rendering
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      background: linear-gradient(135deg, #1E3A5F 0%, #2d4a6f 100%);
      padding: 40px;
      width: 800px;
      font-family: 'Segoe UI', Tahoma, sans-serif;
      direction: rtl;
    `;

    const today = new Date();
    const dateStr = today.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">📅 مواعيد اليوم</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0; font-size: 16px;">${dateStr}</p>
      </div>
      <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 16px; text-align: right; font-size: 14px; color: #64748b; border-bottom: 2px solid #e2e8f0;">#</th>
              <th style="padding: 16px; text-align: right; font-size: 14px; color: #64748b; border-bottom: 2px solid #e2e8f0;">العميل</th>
              <th style="padding: 16px; text-align: right; font-size: 14px; color: #64748b; border-bottom: 2px solid #e2e8f0;">الوقت</th>
              <th style="padding: 16px; text-align: right; font-size: 14px; color: #64748b; border-bottom: 2px solid #e2e8f0;">النوع</th>
              <th style="padding: 16px; text-align: right; font-size: 14px; color: #64748b; border-bottom: 2px solid #e2e8f0;">المدة</th>
              <th style="padding: 16px; text-align: right; font-size: 14px; color: #64748b; border-bottom: 2px solid #e2e8f0;">رابط الدخول</th>
            </tr>
          </thead>
          <tbody>
            ${todayMeetings.map((meeting, index) => `
              <tr style="background: ${index % 2 === 0 ? 'white' : '#f8fafc'};">
                <td style="padding: 14px 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #e2e8f0;">${index + 1}</td>
                <td style="padding: 14px 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${meeting.client_name || 'غير محدد'}</td>
                <td style="padding: 14px 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #e2e8f0;">${formatTime(meeting.scheduled_at)}</td>
                <td style="padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
                  <span style="padding: 4px 10px; border-radius: 12px; font-size: 12px; background: ${meeting.meeting_type === 'remote' ? '#EFF6FF' : '#ECFDF5'}; color: ${meeting.meeting_type === 'remote' ? '#3B82F6' : '#10B981'};">
                    ${meeting.meeting_type === 'remote' ? '🎥 عن بعد' : '📍 حضوري'}
                  </span>
                </td>
                <td style="padding: 14px 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #e2e8f0;">${meeting.duration_minutes} دقيقة</td>
                <td style="padding: 14px 16px; font-size: 12px; color: #3B82F6; border-bottom: 1px solid #e2e8f0; max-width: 150px; overflow: hidden; text-overflow: ellipsis;">
                  ${meeting.video_meeting_url ? meeting.video_meeting_url : '-'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <p style="text-align: center; color: rgba(255,255,255,0.6); margin-top: 20px; font-size: 12px;">تم إنشاء هذا التقرير تلقائياً</p>
    `;

    document.body.appendChild(container);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(container, { scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = `${getExportFileName()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error exporting image:', err);
      setNotice({ tone: 'error', text: 'حدث خطأ أثناء تصدير الصورة' });
    } finally {
      document.body.removeChild(container);
    }
    setShowExportMenu(false);
  };

  // Export as Word
  const exportAsWord = async () => {
    const todayMeetings = getTodayMeetings();
    if (todayMeetings.length === 0) {
      setShowExportMenu(false);
      setNotice({ tone: 'error', text: 'لا توجد مواعيد اليوم لتصديرها' });
      return;
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; padding: 20px; }
          h1 { color: #1E3A5F; text-align: center; margin-bottom: 5px; }
          .date { text-align: center; color: #666; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #1E3A5F; color: white; padding: 12px; text-align: right; }
          td { padding: 12px; border-bottom: 1px solid #e0e0e0; }
          tr:nth-child(even) { background: #f8f9fa; }
          .type-remote { color: #3B82F6; }
          .type-inperson { color: #10B981; }
          .meeting-link { color: #3B82F6; word-break: break-all; }
        </style>
      </head>
      <body>
        <h1>📅 مواعيد اليوم</h1>
        <p class="date">${dateStr}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>العميل</th>
              <th>الهاتف</th>
              <th>الوقت</th>
              <th>النوع</th>
              <th>المدة</th>
              <th>رابط الدخول</th>
            </tr>
          </thead>
          <tbody>
            ${todayMeetings.map((meeting, index) => `
              <tr>
                <td>${index + 1}</td>
                <td><strong>${meeting.client_name || 'غير محدد'}</strong></td>
                <td>${meeting.client_phone || '-'}</td>
                <td>${formatTime(meeting.scheduled_at)}</td>
                <td class="${meeting.meeting_type === 'remote' ? 'type-remote' : 'type-inperson'}">
                  ${meeting.meeting_type === 'remote' ? '🎥 عن بعد' : '📍 حضوري'}
                </td>
                <td>${meeting.duration_minutes} دقيقة</td>
                <td class="meeting-link">${meeting.video_meeting_url ? `<a href="${meeting.video_meeting_url}">${meeting.video_meeting_url}</a>` : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${getExportFileName()}.doc`;
    link.click();
    URL.revokeObjectURL(link.href);
    setShowExportMenu(false);
  };

  // Export as Excel
  const exportAsExcel = async () => {
    const todayMeetings = getTodayMeetings();
    if (todayMeetings.length === 0) {
      setShowExportMenu(false);
      setNotice({ tone: 'error', text: 'لا توجد مواعيد اليوم لتصديرها' });
      return;
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          table { direction: rtl; }
          th { background: #1E3A5F; color: white; font-weight: bold; padding: 10px; }
          td { padding: 8px; border: 1px solid #ddd; }
          .header { font-size: 18px; font-weight: bold; text-align: center; }
          .date { text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="7" class="header">📅 مواعيد اليوم</td></tr>
          <tr><td colspan="7" class="date">${dateStr}</td></tr>
          <tr><td colspan="7"></td></tr>
          <tr>
            <th>#</th>
            <th>العميل</th>
            <th>الهاتف</th>
            <th>الوقت</th>
            <th>النوع</th>
            <th>المدة</th>
            <th>رابط الدخول</th>
          </tr>
          ${todayMeetings.map((meeting, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${meeting.client_name || 'غير محدد'}</td>
              <td>${meeting.client_phone || '-'}</td>
              <td>${formatTime(meeting.scheduled_at)}</td>
              <td>${meeting.meeting_type === 'remote' ? 'عن بعد' : 'حضوري'}</td>
              <td>${meeting.duration_minutes} دقيقة</td>
              <td>${meeting.video_meeting_url || '-'}</td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${getExportFileName()}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);
    setShowExportMenu(false);
  };

  return (
    <div className="meetings-page cmo-page">
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
          {/* Export Button */}
          <div className="export-dropdown" ref={exportMenuRef}>
            <button
              className="notion-icon-btn"
              onClick={() => setShowExportMenu(!showExportMenu)}
              title="تصدير مواعيد اليوم"
            >
              <Download size={16} />
            </button>
            {showExportMenu && (
              <div className="export-dropdown__menu">
                <div className="export-dropdown__header">
                  <Download size={14} />
                  تصدير مواعيد اليوم
                </div>
                <button onClick={exportAsImage}>
                  <FileImage size={16} />
                  <span>صورة (PNG)</span>
                </button>
                <button onClick={exportAsWord}>
                  <FileText size={16} />
                  <span>وورد (DOC)</span>
                </button>
                <button onClick={exportAsExcel}>
                  <FileSpreadsheet size={16} />
                  <span>إكسل (XLS)</span>
                </button>
              </div>
            )}
          </div>
          <button
            className="notion-icon-btn"
            onClick={() => fetchData()}
            disabled={loading}
            title="تحديث"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            className="fin-btn"
            onClick={() => setShowCreateLinkModal(true)}
          >
            <Link2 size={16} />
            إنشاء رابط حجز
          </button>
          {/* حجزٌ مباشر — السكرتير الذي يتلقّى اتصال العميل لم يكن يملك غير «رابط الحجز» */}
          <button
            className="notion-primary-btn"
            onClick={() => setFormMeeting('new')}
          >
            <Plus size={16} />
            موعد جديد
          </button>
        </div>
      </header>

      {notice && (
        <div
          className={`cmo-alert cmo-alert--${notice.tone} cmo-page-alert`}
          role={notice.tone === 'error' ? 'alert' : 'status'}
        >
          {notice.tone === 'error' ? <AlertTriangle size={14} aria-hidden="true" /> : <CheckCircle size={14} aria-hidden="true" />}
          <span className="cmo-alert__text">{notice.text}</span>
          <button type="button" className="cmo-alert__close" onClick={() => setNotice(null)} aria-label="إخفاء التنبيه">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Meetings Tab */}
      {activeTab === 'meetings' && (
        <>
          {/* شريط الأدوات: بحث، فترة (بعدّادَي اليوم والأسبوع)، حالة، محامٍ، ثم ما يحتاج انتباهك
              وطريقة العرض — سطرٌ واحد يلتفّ إلى ثانٍ حين يضيق العرض. كانت فوقه أربع بطاقات ملخّص */}
          <div className="cmo-toolbar">
            <div className="mfm-search cmo-toolbar__search">
              <Search size={14} aria-hidden="true" />
              <input
                className="fin-input"
                type="search"
                placeholder="بحث بالاسم أو الجوال…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="بحث في المواعيد"
              />
            </div>

            <div className="mfm-types cmo-seg" role="group" aria-label="الفترة">
              {TIME_OPTIONS.map((o) => {
                const n = o.key === 'today' ? counts.today : o.key === 'week' ? counts.week : 0;
                return (
                  <button
                    key={o.key}
                    type="button"
                    className={`mfm-type cmo-seg__btn${timeFilter === o.key && meetingsViewMode !== 'calendar' ? ' is-active' : ''}`}
                    aria-pressed={timeFilter === o.key}
                    onClick={() => setTimeFilter(o.key)}
                    // التقويم يحدّد نطاقه بالشهر المعروض، فالفترة لا تعني فيه شيئاً
                    disabled={meetingsViewMode === 'calendar'}
                    title={n > 0 ? `${n} ${o.key === 'today' ? 'غير ملغاة' : 'مؤكدة ومعلّقة'}` : undefined}
                  >
                    {o.label}
                    {n > 0 && <span className="cmo-seg__count">{n}</span>}
                  </button>
                );
              })}
            </div>

            <select
              className="fin-input cmo-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label="تصفية حسب الحالة"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>

            {lawyerOptions.length > 1 && (
              <select
                className="fin-input cmo-select"
                value={activeLawyer}
                onChange={(e) => setLawyerFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                aria-label="تصفية حسب المحامي"
              >
                <option value="all">كل المحامين</option>
                {lawyerOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            )}

            <div className="cmo-toolbar__end">
              <ClientMeetingsSummary counts={counts} active={activeQuick} onPick={pickQuick} />
              {hasFilters && (
                <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" onClick={resetFilters}>
                  مسح التصفية
                </button>
              )}
              <div className="mfm-types" role="group" aria-label="طريقة العرض">
                <button
                  type="button"
                  className={`mfm-type cmo-view-btn${meetingsViewMode === 'table' ? ' is-active' : ''}`}
                  onClick={() => setMeetingsViewMode('table')}
                  aria-pressed={meetingsViewMode === 'table'}
                  title="قائمة بالأيام"
                >
                  <List size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`mfm-type cmo-view-btn${meetingsViewMode === 'calendar' ? ' is-active' : ''}`}
                  onClick={() => setMeetingsViewMode('calendar')}
                  aria-pressed={meetingsViewMode === 'calendar'}
                  title="تقويم"
                >
                  <Calendar size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Meetings List */}
          <div ref={bodyRef} className="cmo-body">
            {loading ? (
              <div className="cmo-agenda" aria-busy="true" aria-label="جاري تحميل المواعيد">
                {[0, 1].map((g) => (
                  <section key={g} className="cmo-day">
                    <div className="cmo-skel cmo-skel--head" />
                    <div className="cmo-day__list">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="cmo-skel-row">
                          <div className="cmo-skel cmo-skel--time" />
                          <div className="cmo-skel cmo-skel--avatar" />
                          <div className="cmo-skel cmo-skel--line" />
                          <div className="cmo-skel cmo-skel--badge" />
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : error ? (
              <div className="error-state">
                <XCircle size={32} />
                <p>{error}</p>
                <button onClick={() => fetchData()}>إعادة المحاولة</button>
              </div>
            ) : meetingsViewMode === 'calendar' ? (
              // النقر يفتح لوحة الموعد — كان يفتح «إنهاء وتسجيل النتيجة» حتى لموعد الأسبوع القادم
              <ClientMeetingsCalendar
                meetings={filteredMeetings}
                onSelectMeeting={openMeeting}
              />
            ) : filteredMeetings.length === 0 && hasFilters && meetings.length > 0 ? (
              <div className="empty-state">
                <Search size={40} />
                <h3>لا مواعيد تطابق التصفية</h3>
                <p>غيّر الفترة أو الحالة، أو امسح التصفية لترى المواعيد القادمة كلّها.</p>
                <button className="fin-btn" onClick={resetFilters}>مسح التصفية</button>
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="empty-state">
                <Calendar size={48} />
                <h3>لا توجد مواعيد</h3>
                <p>احجز موعداً مباشرةً، أو أرسل للعميل رابط حجز يختار منه وقته</p>
                <div className="cmo-empty-actions">
                  <button
                    className="primary-btn"
                    onClick={() => setFormMeeting('new')}
                  >
                    <Plus size={18} />
                    موعد جديد
                  </button>
                  <button
                    className="fin-btn"
                    onClick={() => setShowCreateLinkModal(true)}
                  >
                    <Link2 size={16} />
                    إنشاء رابط حجز
                  </button>
                </div>
              </div>
            ) : (
              <ClientMeetingsAgenda
                meetings={filteredMeetings}
                showLawyer={lawyerOptions.length > 1}
                onOpen={openMeeting}
                onApprove={handleConfirmMeeting}
                onEdit={handleEditMeeting}
                onOutcome={handleOpenOutcome}
                onNoShow={handleNoShow}
                onCancel={handleCancelMeeting}
                onLinkCase={setLinkCaseMeeting}
              />
            )}
          </div>
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

          <div className="cmo-body cmo-body--links">
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
                            <input type="text" value={link.full_url || link.url || ''} readOnly />
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
                                  href={bookingHelpers.createWhatsAppShareLink(link.full_url || link.url || '', link.client?.name)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="icon-btn-action icon-btn-action--whatsapp"
                                  title="إرسال عبر واتساب"
                                >
                                  <Send size={14} />
                                </a>
                                <a
                                  href={bookingHelpers.createEmailShareLink(link.full_url || link.url || '', link.client?.email, user?.name)}
                                  className="icon-btn-action icon-btn-action--email"
                                  title="إرسال عبر البريد"
                                >
                                  <Mail size={14} />
                                </a>
                                {link.client && (
                                  <button
                                    className="icon-btn-action"
                                    onClick={() => handleResendLink(link)}
                                    title="إعادة إرسال"
                                  >
                                    <RefreshCw size={14} />
                                  </button>
                                )}
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
                      <input type="text" value={link.full_url || link.url || ''} readOnly />
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
                            href={bookingHelpers.createWhatsAppShareLink(link.full_url || link.url || '', link.client?.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="card-action-btn card-action-btn--whatsapp"
                            title="واتساب"
                          >
                            <Send size={16} />
                          </a>
                          <a
                            href={bookingHelpers.createEmailShareLink(link.full_url || link.url || '', link.client?.email, user?.name)}
                            className="card-action-btn card-action-btn--email"
                            title="بريد إلكتروني"
                          >
                            <Mail size={16} />
                          </a>
                          {link.client && (
                            <button
                              className="card-action-btn"
                              onClick={() => handleResendLink(link)}
                              title="إعادة إرسال"
                            >
                              <RefreshCw size={16} />
                            </button>
                          )}
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
          </div>
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

      {drawerMeeting && (
        <ClientMeetingDrawer
          meeting={drawerMeeting}
          onClose={closeMeeting}
          onApprove={handleConfirmMeeting}
          onEdit={handleEditMeeting}
          onOutcome={handleOpenOutcome}
          onNoShow={handleNoShow}
          onCancel={handleCancelMeeting}
          onLinkCase={setLinkCaseMeeting}
        />
      )}

      {formMeeting && (
        <ClientMeetingFormModal
          meeting={formMeeting === 'new' ? null : formMeeting}
          onClose={() => setFormMeeting(null)}
          onSaved={(saved, message) => {
            setFormMeeting(null);
            afterAction(message);
            // الموعد الجديد يُفتح في لوحته: يرى المستخدم ما حُجز ويتصرّف منه مباشرةً
            if (formMeeting === 'new') openMeeting(saved);
          }}
        />
      )}

      {approveMeeting && (
        <ApproveClientMeetingDialog
          meeting={approveMeeting}
          onClose={() => setApproveMeeting(null)}
          onDone={(message) => {
            setApproveMeeting(null);
            afterAction(message);
          }}
        />
      )}

      {cancelMeeting && (
        <CancelClientMeetingDialog
          meeting={cancelMeeting}
          onClose={() => setCancelMeeting(null)}
          onDone={(message) => {
            setCancelMeeting(null);
            afterAction(message);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={noShowMeeting !== null}
        title="تسجيل عدم الحضور"
        message={noShowMeeting ? `تسجيل أن ${clientDisplayName(noShowMeeting)} لم يحضر الموعد؟` : ''}
        note="لا تصل العميلَ رسالةٌ بهذا."
        confirmLabel="تسجيل «لم يحضر»"
        loading={noShowSaving}
        onConfirm={confirmNoShow}
        onClose={() => setNoShowMeeting(null)}
      />

      <ConfirmDialog
        isOpen={deleteLinkTarget !== null}
        title="حذف رابط الحجز"
        message="هل تريد حذف هذا الرابط؟ لن يتمكّن العميل من الحجز به بعد الحذف."
        confirmLabel="حذف"
        variant="danger"
        loading={deletingLink}
        onConfirm={confirmDeleteLink}
        onClose={() => setDeleteLinkTarget(null)}
      />

      {linkCaseMeeting && (
        <LinkToCaseModal
          meeting={linkCaseMeeting}
          onClose={() => setLinkCaseMeeting(null)}
          onSuccess={(message) => {
            setLinkCaseMeeting(null);
            afterAction(message ?? 'حُفظ ربط القضية');
          }}
        />
      )}

      {outcomeMeeting && (
        <MeetingOutcomeModal
          meeting={outcomeMeeting}
          onClose={() => setOutcomeMeeting(null)}
          onSuccess={() => {
            setOutcomeMeeting(null);
            afterAction('حُفظت نتيجة الاجتماع');
          }}
        />
      )}

      <style>{`
        .meetings-page {
          padding: 0;
          min-height: 100%;
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

        .result-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 6px;
          border: 1px solid var(--color-border, #e5e7eb);
          background: var(--color-surface, #fff);
          font-size: 12px;
          font-weight: 500;
          color: #2563EB;
          cursor: pointer;
          transition: all 0.15s;
        }

        .result-btn:hover {
          background: #EFF6FF;
          border-color: #2563EB;
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

        /* Export Dropdown */
        .export-dropdown {
          position: relative;
        }

        .export-dropdown__menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          background: var(--color-surface, white);
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          border: 1px solid var(--color-border, #e5e7eb);
          min-width: 200px;
          z-index: 100;
          overflow: hidden;
          animation: dropdownFadeIn 0.15s ease-out;
        }

        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .export-dropdown__header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary);
          background: var(--color-surface-subtle, #f8fafc);
          border-bottom: 1px solid var(--color-border, #e5e7eb);
        }

        .export-dropdown__menu button {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          border: none;
          background: none;
          font-size: 14px;
          color: var(--color-text);
          cursor: pointer;
          text-align: right;
          transition: all 0.15s;
        }

        .export-dropdown__menu button:hover {
          background: var(--color-surface-subtle, #f8fafc);
        }

        .export-dropdown__menu button svg {
          color: var(--color-text-secondary);
        }

        .export-dropdown__menu button:first-of-type {
          color: #10B981;
        }

        .export-dropdown__menu button:first-of-type svg {
          color: #10B981;
        }

        .export-dropdown__menu button:nth-of-type(2) {
          color: #3B82F6;
        }

        .export-dropdown__menu button:nth-of-type(2) svg {
          color: #3B82F6;
        }

        .export-dropdown__menu button:nth-of-type(3) {
          color: #059669;
        }

        .export-dropdown__menu button:nth-of-type(3) svg {
          color: #059669;
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

          .export-dropdown__menu {
            left: auto;
            right: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ClientMeetings;
