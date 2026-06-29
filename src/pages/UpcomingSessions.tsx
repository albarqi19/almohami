import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
	Calendar as CalendarIcon,
	Clock,
	MapPin,
	FileText,
	User,
	Scale,
	Swords,
	ChevronLeft,
	ChevronRight,
	Filter,
	RefreshCw,
	List,
	LayoutGrid,
	Search,
	X,
	AlertCircle,
	Video,
	ExternalLink,
	Download,
	FileImage,
	FileSpreadsheet,
	FileType,
	Plus,
	Trash2,
} from 'lucide-react';
import { apiClient, API_BASE_URL } from '../utils/api';
import { AddSessionModal } from '../components/AddSessionModal';
import DisplaySettingsButton from '../components/DisplaySettingsButton';
import { useDisplayPreferences } from '../hooks/useDisplayPreferences';
import { getPrimaryLawyerName } from '../utils/lawyerHelpers';
import { resolveOpponent } from '../utils/partyHelpers';
import { toHijri } from '../utils/hijriDate';
import { useAuth } from '../contexts/AuthContext';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)


interface Session {
	id: number;
	case_id: number;
	session_type: string | null;
	session_number: number | string | null; // رقم الجلسة التسلسلي داخل القضية (يحسبه الباك)
	session_date: string | null;
	session_date_gregorian?: string | null;
	session_date_hijri?: string | null;
	session_time: string | null;
	status: string;
	najiz_status: string | null;
	court: string | null;
	department: string | null;
	method: string | null;
	location: string | null;
	degree: string | null;
	result: string | null;
	video_conference_url?: string | null;
	is_video_conference?: boolean;
	session_text?: string | null;
	session_text_summary?: string | null;
	notify_client?: boolean;
	notify_client_by?: number | null;
	dabt_sent_to_client?: boolean;
	dabt_sent_at?: string | null;
	source?: string | null;
	wekala_status_at_session?: 'valid' | 'expiring_before_session' | 'expired_before_session' | 'none' | null;
	case?: {
		id: number;
		title: string;
		file_number: string;
		case_type_arabic: string | null;
		client_name: string | null;
		opponent_name?: string | null;
		plaintiff_name?: string | null;
		client_role?: string | null;
		court: string | null;
		najiz_status: string | null;
		client_id?: number | null;
		lawyers?: Array<{ id: number; name: string; pivot?: { is_primary?: boolean | number | null } }>;
		primaryLawyer?: Array<{ id: number; name: string }> | null;
		// Laravel serializes camelCase relations to snake_case in JSON output.
		primary_lawyer?: Array<{ id: number; name: string }> | null;
	};
}

const UpcomingSessions: React.FC = () => {
	const navigate = useNavigate();
	const { prefs } = useDisplayPreferences();
	const { user } = useAuth();
	const [filter, setFilter] = useState<'all' | 'upcoming' | 'today' | 'week'>('upcoming');
	const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
	const [searchTerm, setSearchTerm] = useState('');
	const [showExportMenu, setShowExportMenu] = useState(false);
	const [exportPeriod, setExportPeriod] = useState<'today' | 'tomorrow' | 'week'>('today');
	const [isExportingPdf, setIsExportingPdf] = useState(false);
	const [isAddSessionOpen, setIsAddSessionOpen] = useState(false);
	const exportMenuRef = useRef<HTMLDivElement>(null);

	// Calendar state — current month being displayed + day-detail modal
	const [calendarCursor, setCalendarCursor] = useState(() => {
		const d = new Date();
		return new Date(d.getFullYear(), d.getMonth(), 1);
	});
	const [dayModalKey, setDayModalKey] = useState<string | null>(null);

	// Tick to re-sort every 30s — pushes finished sessions down without needing a network fetch
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 30 * 1000);
		return () => clearInterval(id);
	}, []);

	// TanStack Query: silent background refresh + cache + window focus refetch.
	// We use placeholderData (NOT initialData) so the query always fetches on
	// mount even when localStorage has cached data — placeholderData is shown
	// for instant UX but is never treated as real cache.
	const cachedFromStorage = ((): Session[] => {
		try {
			const saved = localStorage.getItem('cached_sessions');
			const parsed = saved ? JSON.parse(saved) : [];
			return Array.isArray(parsed) ? parsed : [];
		} catch { return []; }
	})();

	const {
		data: sessions = [],
		isLoading,
		isFetching,
		error: queryError,
		refetch,
	} = useQuery<Session[]>({
		queryKey: ['sessions', 'upcoming'],
		queryFn: async () => {
			const response = await apiClient.get<{ success: boolean; data: Session[] }>('/sessions/upcoming');
			const data = response.data || [];
			return Array.isArray(data) ? data : [];
		},
		placeholderData: cachedFromStorage.length > 0 ? cachedFromStorage : undefined,
		staleTime: 60 * 1000,            // valid for 1 minute
		refetchInterval: 90 * 1000,      // background refetch every 90s
		refetchIntervalInBackground: false,
	});

	// Persist latest data to localStorage so the page opens instantly next time
	useEffect(() => {
		if (sessions && sessions.length >= 0) {
			try { localStorage.setItem('cached_sessions', JSON.stringify(sessions)); } catch { }
		}
	}, [sessions]);

	const loading = isLoading;
	const error = queryError ? 'خطأ في جلب الجلسات' : null;
	const fetchSessions = () => { refetch(); };

	// حذف جلسة يدوية (الباك يرفض حذف جلسات ناجز)
	const [deletingId, setDeletingId] = useState<number | null>(null);
	const handleDeleteSession = async (session: Session) => {
		if (session.source !== 'manual') return;
		const caseTitle = session.case?.title ? `«${session.case.title}»` : '';
		if (!window.confirm(`هل أنت متأكد من حذف هذه الجلسة اليدوية ${caseTitle}؟ لا يمكن التراجع.`)) return;
		setDeletingId(session.id);
		try {
			await apiClient.delete<{ success: boolean; message: string }>(`/sessions/${session.id}`);
			await refetch();
		} catch (err: any) {
			alert(err?.response?.data?.message || err?.response?.data?.error || 'تعذّر حذف الجلسة');
		} finally {
			setDeletingId(null);
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

	// Helper: get effective date (hijri or gregorian fallback)
	const getEffectiveDate = (session: Session): string | null => {
		return session.session_date || session.session_date_gregorian || null;
	};

	// Filter Logic
	const filteredSessions = sessions.filter(session => {
		// Search
		if (searchTerm) {
			const term = searchTerm.toLowerCase();
			const matchesSearch =
				session.case?.title.toLowerCase().includes(term) ||
				session.court?.toLowerCase().includes(term) ||
				session.case?.client_name?.toLowerCase().includes(term);
			if (!matchesSearch) return false;
		}

		const effectiveDate = getEffectiveDate(session);
		if (!effectiveDate) return filter === 'all';

		const sessionDate = new Date(effectiveDate);
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const endOfWeek = new Date(today);
		endOfWeek.setDate(today.getDate() + 7);

		switch (filter) {
			case 'today':
				return sessionDate.toDateString() === today.toDateString();
			case 'week':
				return sessionDate >= today && sessionDate <= endOfWeek;
			case 'upcoming':
				return sessionDate >= today;
			default:
				return true;
		}
	});

	// Build full timestamp from session_date + session_time (HH:mm[:ss])
	const getSessionTimestamp = (s: Session): number => {
		const date = getEffectiveDate(s);
		if (!date) return Number.POSITIVE_INFINITY;
		const t = new Date(date);
		if (s.session_time) {
			const m = s.session_time.match(/^(\d{1,2}):(\d{2})/);
			if (m) t.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
			else t.setHours(23, 59, 0, 0);
		} else {
			// No explicit time → push to end of day so timed sessions of same day rank above it
			t.setHours(23, 59, 0, 0);
		}
		return t.getTime();
	};

	// A session is considered finished when its status says so, or when its scheduled
	// time is more than ~1 hour in the past (buffer for late-running sessions).
	const FINISHED_BUFFER_MS = 60 * 60 * 1000;
	const isSessionFinished = (s: Session): boolean => {
		if (s.status === 'منتهية' || s.status === 'completed') return true;
		const ts = getSessionTimestamp(s);
		if (!isFinite(ts)) return false;
		return ts + FINISHED_BUFFER_MS < now;
	};

	// Sort: upcoming first (nearest → farthest), then finished (most recent → oldest)
	const sortedSessions = [...filteredSessions].sort((a, b) => {
		const aFinished = isSessionFinished(a);
		const bFinished = isSessionFinished(b);
		if (aFinished !== bFinished) return aFinished ? 1 : -1;
		const tsA = getSessionTimestamp(a);
		const tsB = getSessionTimestamp(b);
		if (aFinished && bFinished) return tsB - tsA;
		return tsA - tsB;
	});

	// Helpers
	const formatDate = (dateStr: string | null) => {
		if (!dateStr) return 'غير محدد';
		const date = new Date(dateStr);
		return date.toLocaleDateString('ar-SA', {
			weekday: 'long',
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};

	const getDaysUntil = (dateStr: string | null) => {
		if (!dateStr) return null;
		const sessionDate = new Date(dateStr);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		sessionDate.setHours(0, 0, 0, 0);
		const diff = Math.ceil((sessionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

		if (diff === 0) return 'اليوم';
		if (diff === 1) return 'غداً';
		if (diff < 0) return `منذ ${Math.abs(diff)} يوم`;
		return `بعد ${diff} أيام`;
	};

	const getUrgencyColor = (dateStr: string | null) => {
		if (!dateStr) return 'transparent';
		const sessionDate = new Date(dateStr);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const diff = Math.ceil((sessionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

		if (diff === 0) return '#ef4444'; // Today (Red)
		if (diff <= 2) return '#f97316'; // Soon (Orange)
		return '#10b981'; // Later (Green)
	};

	// Get sessions for export based on period
	const getSessionsForExport = () => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		let startDate = new Date(today);
		let endDate = new Date(today);

		if (exportPeriod === 'today') {
			endDate.setHours(23, 59, 59, 999);
		} else if (exportPeriod === 'tomorrow') {
			startDate.setDate(startDate.getDate() + 1);
			endDate.setDate(endDate.getDate() + 1);
			endDate.setHours(23, 59, 59, 999);
		} else if (exportPeriod === 'week') {
			endDate.setDate(endDate.getDate() + 7);
			endDate.setHours(23, 59, 59, 999);
		}

		const filtered = sessions.filter(session => {
			const ed = getEffectiveDate(session);
			if (!ed) return false;
			const sessionDate = new Date(ed);
			return sessionDate >= startDate && sessionDate <= endDate;
		});

		// Match the on-screen ordering: upcoming first (nearest → farthest),
		// then finished (most recent → oldest). Same logic as `sortedSessions`.
		return filtered.sort((a, b) => {
			const aFinished = isSessionFinished(a);
			const bFinished = isSessionFinished(b);
			if (aFinished !== bFinished) return aFinished ? 1 : -1;
			const tsA = getSessionTimestamp(a);
			const tsB = getSessionTimestamp(b);
			if (aFinished && bFinished) return tsB - tsA;
			return tsA - tsB;
		});
	};

	// Get export period label
	const getExportPeriodLabel = () => {
		switch (exportPeriod) {
			case 'today': return 'تصدير جلسات اليوم';
			case 'tomorrow': return 'تصدير جلسات الغد';
			case 'week': return 'تصدير جلسات الأسبوع';
		}
	};

	// Cycle through export periods
	const cycleExportPeriod = () => {
		setExportPeriod(prev => {
			if (prev === 'today') return 'tomorrow';
			if (prev === 'tomorrow') return 'week';
			return 'today';
		});
	};

	// Get filename with date based on period
	const getExportFileName = () => {
		const today = new Date();
		const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

		if (exportPeriod === 'today') {
			const dayName = dayNames[today.getDay()];
			const dateStr = today.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
			return `جلسات_اليوم_${dayName}_${dateStr}`.replace(/\s/g, '_');
		} else if (exportPeriod === 'tomorrow') {
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);
			const dayName = dayNames[tomorrow.getDay()];
			const dateStr = tomorrow.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
			return `جلسات_الغد_${dayName}_${dateStr}`.replace(/\s/g, '_');
		} else {
			const weekEnd = new Date(today);
			weekEnd.setDate(weekEnd.getDate() + 7);
			const startStr = today.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
			const endStr = weekEnd.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
			return `جلسات_الأسبوع_${startStr}_إلى_${endStr}`.replace(/\s/g, '_');
		}
	};

	// Get period title for export
	const getExportTitle = () => {
		switch (exportPeriod) {
			case 'today': return 'جلسات اليوم';
			case 'tomorrow': return 'جلسات الغد';
			case 'week': return 'جلسات الأسبوع';
		}
	};

	// Get no sessions message
	const getNoSessionsMessage = () => {
		switch (exportPeriod) {
			case 'today': return 'لا توجد جلسات لليوم';
			case 'tomorrow': return 'لا توجد جلسات للغد';
			case 'week': return 'لا توجد جلسات لهذا الأسبوع';
		}
	};

	// Export as Image
	const exportAsImage = async () => {
		const sessionsToExport = getSessionsForExport();
		if (sessionsToExport.length === 0) {
			alert(getNoSessionsMessage());
			return;
		}

		// الثيم الديواني: كحلي + ذهبي، فلات (بلا تدرّج/ظل)، بإطار ذهبي رفيع
		const NAVY = '#1E3A5F';
		const GOLD = '#C5A059';
		const issuer = user?.name || '';
		const fmtGreg = (iso?: string | null) => (iso ? iso.slice(0, 10).replace(/-/g, '/') : '');

		const container = document.createElement('div');
		container.style.cssText = `
			position: absolute;
			left: -9999px;
			background: ${NAVY};
			padding: 30px;
			width: 1040px;
			font-family: 'Segoe UI', Tahoma, sans-serif;
			direction: rtl;
		`;

		// ar-SA يُرجع هجرياً؛ نستخدم en-CA لضمان ميلادي «YYYY/MM/DD»، والهجري عبر toHijri.
		const issuedHijri = toHijri(new Date());
		const issuedGreg = new Date().toLocaleDateString('en-CA').replace(/-/g, '/');

		container.innerHTML = `
			<div style="background:#ffffff; border:2px solid ${GOLD};">
				<div style="background:${NAVY}; padding:22px 28px; border-bottom:3px solid ${GOLD};">
					<div style="color:#ffffff; font-size:23px; font-weight:700; letter-spacing:0.5px;">${getExportTitle()}</div>
					<div style="color:${GOLD}; font-size:13px; margin-top:8px; direction:rtl;">${issuedHijri ? issuedHijri + ' &nbsp;—&nbsp; ' : ''}<span style="direction:ltr; unicode-bidi:embed;">${issuedGreg}</span> م</div>
				</div>
				<table style="width:100%; border-collapse:collapse; background:#f6f7f9; border-bottom:1px solid #e5e7eb;">
					<tr>
						<td style="padding:9px 28px; font-size:12px; color:#6b7280; text-align:right;">عدد الجلسات: <strong style="color:${NAVY};">${sessionsToExport.length}</strong></td>
						${issuer ? `<td style="padding:9px 28px; font-size:12px; color:#6b7280; text-align:left;">أصدره: <strong style="color:${NAVY};">${issuer}</strong></td>` : ''}
					</tr>
				</table>
				<table style="width:100%; border-collapse:collapse;">
					<thead>
						<tr style="background:${NAVY};">
							<th style="padding:11px 8px; font-size:12px; color:#ffffff; text-align:center; border-left:1px solid rgba(255,255,255,0.14);">#</th>
							<th style="padding:11px 12px; font-size:12px; color:#ffffff; text-align:right; border-left:1px solid rgba(255,255,255,0.14);">القضية</th>
							<th style="padding:11px 12px; font-size:12px; color:#ffffff; text-align:right; border-left:1px solid rgba(255,255,255,0.14);">العميل</th>
							<th style="padding:11px 12px; font-size:12px; color:#ffffff; text-align:right; border-left:1px solid rgba(255,255,255,0.14);">المحامي المسؤول</th>
							<th style="padding:11px 12px; font-size:12px; color:#ffffff; text-align:right; border-left:1px solid rgba(255,255,255,0.14);">المحكمة</th>
							<th style="padding:11px 12px; font-size:12px; color:#ffffff; text-align:center; border-left:1px solid rgba(255,255,255,0.14);">تاريخ الجلسة</th>
							<th style="padding:11px 8px; font-size:12px; color:#ffffff; text-align:center; border-left:1px solid rgba(255,255,255,0.14);">الوقت</th>
							<th style="padding:11px 10px; font-size:12px; color:#ffffff; text-align:center;">النوع</th>
						</tr>
					</thead>
					<tbody>
						${sessionsToExport.map((session: Session, index: number) => {
							const eff = getEffectiveDate(session);
							const hj = eff ? toHijri(eff) : null;
							const gr = fmtGreg(eff);
							const remote = session.method === 'عن بعد';
							const bg = index % 2 === 0 ? '#ffffff' : '#f6f7f9';
							const cell = 'border-bottom:1px solid #eef0f3; border-left:1px solid #eef0f3;';
							return `
							<tr style="background:${bg};">
								<td style="padding:10px 8px; font-size:12px; color:#334155; text-align:center; ${cell}">${index + 1}</td>
								<td style="padding:10px 12px; font-size:12.5px; color:${NAVY}; font-weight:600; ${cell}">${session.case?.title || '-'}${session.case?.file_number ? `<div style="font-size:10px; color:#9aa3af; font-weight:400; margin-top:2px;">ملف: ${session.case?.file_number}</div>` : ''}</td>
								<td style="padding:10px 12px; font-size:12px; color:#334155; ${cell}">${session.case?.client_name || '-'}</td>
								<td style="padding:10px 12px; font-size:12px; color:#334155; ${cell}">${getPrimaryLawyerName(session.case as never, '-')}</td>
								<td style="padding:10px 12px; font-size:12px; color:#334155; ${cell}">${session.court || session.case?.court || '-'}</td>
								<td style="padding:10px 12px; font-size:12px; text-align:center; ${cell}">${hj ? `<div style="color:${NAVY}; font-weight:600;">${hj}</div>` : ''}${gr ? `<div style="font-size:10px; color:#9aa3af; direction:ltr;">${gr}</div>` : (hj ? '' : '-')}</td>
								<td style="padding:10px 8px; font-size:12px; color:#334155; text-align:center; ${cell}">${session.session_time || '-'}</td>
								<td style="padding:10px 10px; font-size:11.5px; text-align:center; font-weight:700; color:${remote ? '#15803d' : '#475569'}; border-bottom:1px solid #eef0f3;">${remote ? 'عن بُعد' : 'حضوري'}</td>
							</tr>`;
						}).join('')}
					</tbody>
				</table>
				<div style="background:${NAVY}; padding:12px 28px; border-top:3px solid ${GOLD}; text-align:center;">
					<div style="color:#ffffff; font-size:11px; letter-spacing:0.2px;">كشف استرشادي صادر عن المكتب لأغراض المتابعة والتنظيم — نظام الرائد لإدارة المحاماة</div>
				</div>
			</div>
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
			alert('حدث خطأ أثناء التصدير');
		} finally {
			document.body.removeChild(container);
		}
		setShowExportMenu(false);
	};

	// Export as Word
	const exportAsWord = () => {
		const sessionsToExport = getSessionsForExport();
		if (sessionsToExport.length === 0) {
			alert(getNoSessionsMessage());
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
				<h1>📅 ${getExportTitle()}</h1>
				<p class="date">${dateStr}</p>
				<table>
					<thead>
						<tr>
							<th>#</th>
							<th>القضية</th>
							<th>رقم الملف</th>
							<th>العميل</th>
							<th>المحامي المسؤول</th>
							<th>المحكمة</th>
							<th>الوقت</th>
							<th>النوع</th>
							<th>رابط الدخول</th>
						</tr>
					</thead>
					<tbody>
						${sessionsToExport.map((session: Session, index: number) => `
							<tr>
								<td>${index + 1}</td>
								<td><strong>${session.case?.title || '-'}</strong></td>
								<td>${session.case?.file_number || '-'}</td>
								<td>${session.case?.client_name || '-'}</td>
								<td>${getPrimaryLawyerName(session.case as never, '-')}</td>
								<td>${session.court || session.case?.court || '-'}</td>
								<td>${session.session_time || '-'}</td>
								<td class="${session.method === 'عن بعد' ? 'type-remote' : 'type-inperson'}">
									${session.method === 'عن بعد' ? '🎥 عن بعد' : '📍 حضوري'}
								</td>
								<td class="meeting-link">${session.video_conference_url ? `<a href="${session.video_conference_url}">${session.video_conference_url}</a>` : '-'}</td>
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
	const exportAsExcel = () => {
		const sessionsToExport = getSessionsForExport();
		if (sessionsToExport.length === 0) {
			alert(getNoSessionsMessage());
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
					<tr><td colspan="9" class="header">📅 ${getExportTitle()}</td></tr>
					<tr><td colspan="9" class="date">${dateStr}</td></tr>
					<tr><td colspan="9"></td></tr>
					<tr>
						<th>#</th>
						<th>القضية</th>
						<th>رقم الملف</th>
						<th>العميل</th>
						<th>المحامي المسؤول</th>
						<th>المحكمة</th>
						<th>الوقت</th>
						<th>النوع</th>
						<th>رابط الدخول</th>
					</tr>
					${sessionsToExport.map((session: Session, index: number) => `
						<tr>
							<td>${index + 1}</td>
							<td>${session.case?.title || '-'}</td>
							<td>${session.case?.file_number || '-'}</td>
							<td>${session.case?.client_name || '-'}</td>
							<td>${getPrimaryLawyerName(session.case as never, '-')}</td>
							<td>${session.court || session.case?.court || '-'}</td>
							<td>${session.session_time || '-'}</td>
							<td>${session.method === 'عن بعد' ? 'عن بعد' : 'حضوري'}</td>
							<td>${session.video_conference_url || '-'}</td>
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

	// Export as PDF \u2014 \u0645\u0644\u0641 \u0631\u0633\u0645\u064a \u0628\u0643\u0644\u064a\u0634\u0629 \u0627\u0644\u0645\u0643\u062a\u0628 (\u064a\u0648\u0644\u0651\u062f\u0647 \u0627\u0644\u062e\u0627\u062f\u0645 \u0639\u0628\u0631 mPDF):
	// \u062a\u0627\u0631\u064a\u062e \u0647\u062c\u0631\u064a + \u0645\u064a\u0644\u0627\u062f\u064a\u060c \u0648\u0632\u0631 \u00ab\u062f\u062e\u0648\u0644 \u0627\u0644\u062c\u0644\u0633\u0629\u00bb \u0642\u0627\u0628\u0644 \u0644\u0644\u0646\u0642\u0631. \u064a\u064f\u0631\u0633\u0644 \u0645\u0639\u0631\u0651\u0641\u0627\u062a \u0627\u0644\u062c\u0644\u0633\u0627\u062a
	// \u0627\u0644\u0638\u0627\u0647\u0631\u0629 \u0641\u064a\u0639\u064a\u062f\u0647\u0627 \u0627\u0644\u062e\u0627\u062f\u0645 \u0628\u0646\u0641\u0633 \u0642\u064a\u0648\u062f \u0627\u0644\u0631\u0624\u064a\u0629 (\u0644\u0627 \u064a\u064f\u0635\u062f\u064e\u0651\u0631 \u0645\u0627 \u0644\u0627 \u064a\u0645\u0644\u0643\u0647 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645).
	const exportAsPdf = async () => {
		const sessionsToExport = getSessionsForExport();
		if (sessionsToExport.length === 0) {
			alert(getNoSessionsMessage());
			return;
		}

		setShowExportMenu(false);
		setIsExportingPdf(true);
		const token = localStorage.getItem('authToken');

		try {
			const res = await fetch(`${API_BASE_URL}/sessions/export-pdf`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/pdf',
					'ngrok-skip-browser-warning': '69420',
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify({
					session_ids: sessionsToExport.map(s => s.id),
					period: exportPeriod,
				}),
			});

			if (!res.ok) {
				let message = '\u062a\u0639\u0630\u0651\u0631 \u0625\u0646\u0634\u0627\u0621 \u0645\u0644\u0641 PDF';
				try {
					const body = await res.clone().json();
					if (body?.message) message = body.message;
				} catch {
					/* \u0627\u0644\u0631\u062f \u0644\u064a\u0633 JSON \u2014 \u0646\u064f\u0628\u0642\u064a \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629 */
				}
				throw new Error(message);
			}

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = `${getExportFileName()}.pdf`;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error('Error exporting PDF:', err);
			alert(err instanceof Error ? err.message : '\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u062a\u0635\u062f\u064a\u0631');
		} finally {
			setIsExportingPdf(false);
		}
	};

	// Render Table View
	const renderTable = () => (
		<div className="sessions-table-wrapper">
			<table className="sessions-table">
				<thead>
					<tr>
						<th style={{ width: '30%' }}>القضية</th>
						<th>المحكمة / القاعة</th>
						<th>التاريخ والوقت</th>
						<th>المدة المتبقية</th>
						<th>العميل / المحامي</th>
						<th>الحالة</th>
						<th>الدخول</th>
					</tr>
				</thead>
				<tbody>
					{sortedSessions.map(session => (
						<tr
							key={session.id}
							className="session-row session-row--clickable"
							title="انقر لفتح غرفة تحضير الجلسة"
							onClick={() => navigate(`/sessions/${session.id}/prep`)}
						>
							<td>
								<div className="session-info">
									<span className="session-case-title">
										{session.case?.title || '-'}
										{(() => {
											const s = session.wekala_status_at_session;
											if (s === 'expired_before_session') {
												return (
													<span className="cw-session-badge cw-session-badge--expired" title="الوكالة منتهية قبل تاريخ الجلسة">
														<AlertCircle size={11} /> وكالة منتهية
													</span>
												);
											}
											if (s === 'expiring_before_session') {
												return (
													<span className="cw-session-badge cw-session-badge--expiring" title="الوكالة قاربت الانتهاء قبل الجلسة">
														<AlertCircle size={11} /> وكالة قاربت الانتهاء
													</span>
												);
											}
											if (s === 'none') {
												return (
													<span className="cw-session-badge cw-session-badge--none" title="لا توجد وكالة مرتبطة بالقضية">
														بدون وكالة
													</span>
												);
											}
											return null;
										})()}
									</span>
									<span
											className="session-case-number"
											role={session.case_id ? 'link' : undefined}
											tabIndex={session.case_id ? 0 : undefined}
											title={session.case_id ? 'فتح القضية' : undefined}
											onClick={(e) => {
												if (!session.case_id) return;
												e.stopPropagation();
												navigate(`/cases/${session.case_id}`);
											}}
											onKeyDown={(e) => {
												if (!session.case_id) return;
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault();
													e.stopPropagation();
													navigate(`/cases/${session.case_id}`);
												}
											}}
											style={session.case_id ? { cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' } : undefined}
										>
											#{session.case?.file_number || session.case_id}
										</span>
										{session.session_number != null && (
											<span
												className="session-seq-chip"
												title="رقم الجلسة التسلسلي ضمن هذه القضية"
												style={{
													width: 'fit-content',
													marginTop: '2px',
													fontSize: '11px',
													fontWeight: 600,
													padding: '1px 7px',
													borderRadius: '6px',
													background: 'var(--quiet-gray-100)',
													color: 'var(--color-text-secondary)',
												}}
											>
												الجلسة رقم {session.session_number}
											</span>
										)}
								</div>
							</td>
							<td>
								<div className="session-info">
									<span style={{ fontWeight: 500 }}>{session.court || session.case?.court || '-'}</span>
									{session.location && (
										<span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
											{session.location}
										</span>
									)}
								</div>
							</td>
							<td>
								<div className="session-date">
									<CalendarIcon size={14} className="text-gray-400" />
									<span>{formatDate(getEffectiveDate(session))}</span>
									{session.session_time && (
										<span className="session-time">
											<Clock size={12} className="ml-1" />
											{session.session_time}
										</span>
									)}
										{toHijri(getEffectiveDate(session)) && (
											<span className="session-date-hijri" title="التاريخ الهجري (أم القرى)" style={{ fontSize: '11px', color: 'var(--color-text-secondary)', width: '100%', display: 'block' }}>
												{toHijri(getEffectiveDate(session))}
											</span>
										)}
								</div>
							</td>
							<td>
								<span
									className="urgency-badge"
									style={{
										backgroundColor: `${getUrgencyColor(getEffectiveDate(session))}20`,
										color: getUrgencyColor(getEffectiveDate(session))
									}}
								>
									{getDaysUntil(getEffectiveDate(session))}
								</span>
							</td>
							<td>
								<div className="session-info">
									<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
										<User size={14} className="text-gray-400" />
										<span>{session.case?.client_name || '-'}</span>
									</div>
									{(() => {
										const lawyerName = getPrimaryLawyerName(session.case as never, '');
										return lawyerName ? (
											<div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
												<Scale size={11} />
												<span>{lawyerName}</span>
											</div>
										) : null;
									})()}
									{prefs.showOpponent && resolveOpponent(session.case) && (
										<div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-secondary)' }} title="الخصم">
											<Swords size={11} />
											<span>{resolveOpponent(session.case)}</span>
										</div>
									)}
								</div>
							</td>
							<td>
								<span
									className="session-status"
									style={{
										backgroundColor: 'var(--quiet-gray-100)',
										color: 'var(--color-text-secondary)'
									}}
								>
									{session.najiz_status || session.status || 'مجدولة'}
								</span>
								{session.source === 'manual' && (
									<span className="session-source-badge session-source-badge--manual" style={{ marginRight: 4 }}>يدوية</span>
								)}
								{session.source === 'manual' && (
									<button
										type="button"
										className="session-delete-btn"
										title="حذف الجلسة اليدوية"
										disabled={deletingId === session.id}
										onClick={(e) => { e.stopPropagation(); handleDeleteSession(session); }}
										style={{
											marginRight: 6,
											display: 'inline-flex',
											alignItems: 'center',
											justifyContent: 'center',
											padding: 4,
											border: 'none',
											background: 'transparent',
											color: 'var(--status-red)',
											cursor: deletingId === session.id ? 'wait' : 'pointer',
											opacity: deletingId === session.id ? 0.5 : 1,
											verticalAlign: 'middle',
										}}
									>
										{deletingId === session.id
											? <RefreshCw size={14} className="animate-spin" />
											: <Trash2 size={14} />}
									</button>
								)}
							</td>
							<td>
								{(() => {
									const isCompleted = session.status === 'منتهية' || session.status === 'completed';
									const isRemote = session.method === 'عن بعد';

									if (isCompleted) {
										return (
											<span className="session-completed-badge">
												منتهية
											</span>
										);
									}

									if (session.video_conference_url) {
										return (
											<a
												href={session.video_conference_url}
												target="_blank"
												rel="noopener noreferrer"
												className="join-session-btn"
												onClick={(e) => e.stopPropagation()}
											>
												<Video size={14} />
												الدخول
												<ExternalLink size={12} />
											</a>
										);
									}

									if (isRemote) {
										return (
											<span className="no-link-badge">
												<Video size={12} />
												عن بعد
											</span>
										);
									}

									return (
										<span className="inperson-badge">
											<MapPin size={12} />
											حضوري
										</span>
									);
								})()}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);

	// ========== Calendar View — proper monthly grid ==========

	// Group sessions by their effective date (YYYY-MM-DD), sorted by time within day.
	const sessionsByDateKey = useMemo(() => {
		const map = new Map<string, Session[]>();
		const toKey = (d: Date) => {
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, '0');
			const day = String(d.getDate()).padStart(2, '0');
			return `${y}-${m}-${day}`;
		};
		sessions.forEach(s => {
			const ed = getEffectiveDate(s);
			if (!ed) return;
			const d = new Date(ed);
			if (isNaN(d.getTime())) return;
			const key = toKey(d);
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(s);
		});
		// Sort each day's sessions by time (using the same timestamp helper).
		map.forEach(list => {
			list.sort((a, b) => getSessionTimestamp(a) - getSessionTimestamp(b));
		});
		return map;
	}, [sessions, now]);

	// Build the visible 6×7 grid for the current month cursor.
	const calendarGrid = useMemo(() => {
		const year = calendarCursor.getFullYear();
		const month = calendarCursor.getMonth();
		const firstOfMonth = new Date(year, month, 1);
		const startDay = firstOfMonth.getDay(); // 0 = Sunday
		const daysInMonth = new Date(year, month + 1, 0).getDate();

		const cells: Array<{ date: Date; inMonth: boolean }> = [];
		// Leading days from previous month
		for (let i = startDay - 1; i >= 0; i--) {
			cells.push({ date: new Date(year, month, -i), inMonth: false });
		}
		// Current month
		for (let d = 1; d <= daysInMonth; d++) {
			cells.push({ date: new Date(year, month, d), inMonth: true });
		}
		// Trailing days from next month — pad to 6 rows (42 cells) for stable height
		while (cells.length < 42) {
			const last = cells[cells.length - 1].date;
			const next = new Date(last);
			next.setDate(last.getDate() + 1);
			cells.push({ date: next, inMonth: false });
		}
		return cells;
	}, [calendarCursor]);

	const cursorMonthLabel = useMemo(() => {
		const months = [
			'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
			'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
		];
		return `${months[calendarCursor.getMonth()]} ${calendarCursor.getFullYear()}`;
	}, [calendarCursor]);

	const dayKey = (d: Date) => {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	};

	const todayKey = dayKey(new Date());

	const goToPrevMonth = () => setCalendarCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1));
	const goToNextMonth = () => setCalendarCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1));
	const goToToday = () => {
		const d = new Date();
		setCalendarCursor(new Date(d.getFullYear(), d.getMonth(), 1));
	};

	const MAX_VISIBLE_PER_DAY = 3;

	const renderCalendar = () => (
		<div className="calendar-view">
			{/* Month nav */}
			<div className="calendar-nav">
				<button className="calendar-nav__btn" onClick={goToPrevMonth} title="الشهر السابق">
					<ChevronRight size={16} />
				</button>
				<div className="calendar-nav__label">{cursorMonthLabel}</div>
				<button className="calendar-nav__btn" onClick={goToNextMonth} title="الشهر التالي">
					<ChevronLeft size={16} />
				</button>
				<button className="calendar-nav__today" onClick={goToToday}>هذا الشهر</button>
			</div>

			<div className="calendar-grid">
				{['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => (
					<div key={day} className="calendar-day-header">{day}</div>
				))}

				{calendarGrid.map(({ date, inMonth }) => {
					const key = dayKey(date);
					const daySessions = sessionsByDateKey.get(key) || [];
					const visible = daySessions.slice(0, MAX_VISIBLE_PER_DAY);
					const hidden = daySessions.length - visible.length;
					const isToday = key === todayKey;

					return (
						<div
							key={key}
							className={`calendar-day ${!inMonth ? 'calendar-day--outside' : ''} ${isToday ? 'calendar-day--today' : ''}`}
						>
							<div className="calendar-date">
								<span>{date.getDate()}</span>
								{daySessions.length > 0 && (
									<span className="calendar-date__count" title={`${daySessions.length} جلسة`}>
										{daySessions.length}
									</span>
								)}
							</div>

							{visible.map(s => {
								const finished = isSessionFinished(s);
								return (
									<div
										key={s.id}
										className={`calendar-session ${finished ? 'calendar-session--finished' : ''}`}
										onClick={(e) => { e.stopPropagation(); s.case_id && navigate(`/cases/${s.case_id}`); }}
										title={`${s.case?.title || ''} — ${s.session_time || ''}`}
									>
										<div className="calendar-session__title">{s.case?.title || 'بدون عنوان'}</div>
										{s.session_time && <div className="calendar-session__time">{s.session_time}</div>}
									</div>
								);
							})}

							{hidden > 0 && (
								<button
									className="calendar-day__more"
									onClick={(e) => { e.stopPropagation(); setDayModalKey(key); }}
								>
									+{hidden} أخرى
								</button>
							)}
						</div>
					);
				})}
			</div>

			{/* Day-detail modal */}
			{dayModalKey && (() => {
				const list = sessionsByDateKey.get(dayModalKey) || [];
				const d = new Date(dayModalKey);
				const dateLabel = d.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
				return (
					<div className="calendar-modal-overlay" onClick={() => setDayModalKey(null)}>
						<div className="calendar-modal" onClick={e => e.stopPropagation()}>
							<div className="calendar-modal__header">
								<div className="calendar-modal__title">
									<CalendarIcon size={16} />
									<span>{dateLabel}</span>
									<span className="calendar-modal__count">{list.length} جلسة</span>
								</div>
								<button className="calendar-modal__close" onClick={() => setDayModalKey(null)}>
									<X size={16} />
								</button>
							</div>
							<div className="calendar-modal__body">
								{list.map(s => {
									const finished = isSessionFinished(s);
									return (
										<div
											key={s.id}
											className={`calendar-modal__item ${finished ? 'calendar-modal__item--finished' : ''}`}
											onClick={() => { setDayModalKey(null); s.case_id && navigate(`/cases/${s.case_id}`); }}
										>
											<div className="calendar-modal__time">
												<Clock size={12} />
												{s.session_time || '—'}
											</div>
											<div className="calendar-modal__info">
												<div className="calendar-modal__case">{s.case?.title || 'بدون عنوان'}</div>
												<div className="calendar-modal__meta">
													{s.court && <span>{s.court}</span>}
													{s.case?.client_name && <span>· {s.case.client_name}</span>}
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				);
			})()}
		</div>
	);

	return (
		<div className="sessions-page">
			{/* Sticky Header */}
			<header className="sessions-header-bar">
				<div className="sessions-header-bar__start">
					<div className="sessions-header-bar__title">
						<CalendarIcon size={20} />
						<span>الجلسات القادمة</span>
					</div>
					<div className="sessions-header-bar__stats">
						<span className="stat-badge stat-badge--today">
							{sessions.filter(s => { const d = getEffectiveDate(s); return d && new Date(d).toDateString() === new Date().toDateString(); }).length} اليوم
						</span>
						<span className="stat-badge stat-badge--week">
							{sessions.filter(s => {
								const ed = getEffectiveDate(s);
								if (!ed) return false;
								const d = new Date(ed);
								const now = new Date();
								const nextWeek = new Date();
								nextWeek.setDate(now.getDate() + 7);
								return d >= now && d <= nextWeek;
							}).length} هذا الأسبوع
						</span>
					</div>
				</div>

				<div className="sessions-header-bar__center">
					{/* Filter pills */}
					<div className="sessions-filter-pills">
						{[
							{ key: 'upcoming', label: 'القادمة' },
							{ key: 'today', label: 'اليوم' },
							{ key: 'week', label: 'هذا الأسبوع' },
							{ key: 'all', label: 'الكل' }
						].map(f => (
							<button
								key={f.key}
								className={`sessions-filter-pill ${filter === f.key ? 'sessions-filter-pill--active' : ''}`}
								onClick={() => setFilter(f.key as any)}
							>
								{f.label}
							</button>
						))}
					</div>

					{/* Search */}
					<div className="sessions-header-search">
						<Search size={13} />
						<input
							type="text"
							placeholder="بحث..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>

					{/* View switcher */}
					<div className="view-switcher">
						<button
							className={`view-switcher__btn ${viewMode === 'table' ? 'view-switcher__btn--active' : ''}`}
							onClick={() => setViewMode('table')}
						>
							<List size={16} />
							قائمة
						</button>
						<button
							className={`view-switcher__btn ${viewMode === 'calendar' ? 'view-switcher__btn--active' : ''}`}
							onClick={() => setViewMode('calendar')}
						>
							<LayoutGrid size={16} />
							تقويم
						</button>
					</div>
				</div>

				<div style={{ display: 'flex', gap: '8px' }}>
					{/* Export Button */}
					<div className="export-dropdown" ref={exportMenuRef}>
						<button
							className="icon-btn"
							onClick={() => setShowExportMenu(!showExportMenu)}
							title="تصدير جلسات اليوم"
						>
							<Download size={18} />
						</button>
						{showExportMenu && (
							<div className="export-dropdown__menu">
								<div
									className="export-dropdown__header export-dropdown__header--clickable"
									onClick={cycleExportPeriod}
									title="اضغط للتبديل بين اليوم والغد والأسبوع"
								>
									<Download size={14} />
									{getExportPeriodLabel()}
									<ChevronRight size={12} className="export-dropdown__cycle-icon" />
								</div>
								<button onClick={exportAsPdf} disabled={isExportingPdf}>
									<FileType size={16} />
									<span>{isExportingPdf ? 'جارٍ الإنشاء…' : 'PDF رسمي'}</span>
								</button>
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
						className="icon-btn"
						onClick={fetchSessions}
						disabled={isFetching}
						title="تحديث"
					>
						<RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />
					</button>
					<DisplaySettingsButton />
					<button
						className="icon-btn"
						onClick={() => setIsAddSessionOpen(true)}
						title="إضافة جلسة يدوياً"
					>
						<Plus size={18} />
					</button>
				</div>
			</header>

			{/* Content Area */}
			{loading ? (
				<div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
					جاري التحميل...
				</div>
			) : error ? (
				<div style={{ padding: '40px', textAlign: 'center', color: 'var(--status-red)' }}>
					<AlertCircle size={32} style={{ display: 'block', margin: '0 auto 10px' }} />
					{error}
				</div>
			) : sortedSessions.length === 0 ? (
				<div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
					<CalendarIcon size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
					<h3>لا توجد جلسات</h3>
					<p>لا توجد جلسات تطابق معايير البحث الحالية</p>
				</div>
			) : (
				<>
					{viewMode === 'table' ? renderTable() : renderCalendar()}
				</>
			)}

			{/* Add Session Modal */}
			<AddSessionModal
				isOpen={isAddSessionOpen}
				onClose={() => setIsAddSessionOpen(false)}
				onSessionAdded={() => fetchSessions()}
			/>
		</div>
	);
};

export default UpcomingSessions;
