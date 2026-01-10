import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Calendar as CalendarIcon,
	Clock,
	MapPin,
	FileText,
	User,
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
	FileSpreadsheet
} from 'lucide-react';
import { apiClient } from '../utils/api';
import '../styles/sessions-page.css';

interface Session {
	id: number;
	case_id: number;
	session_type: string | null;
	session_number: string | null;
	session_date: string | null;
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
	case?: {
		id: number;
		title: string;
		file_number: string;
		case_type_arabic: string | null;
		client_name: string | null;
		court: string | null;
		najiz_status: string | null;
	};
}

const UpcomingSessions: React.FC = () => {
	const navigate = useNavigate();
	// Initialize from LocalStorage
	const [sessions, setSessions] = useState<Session[]>(() => {
		const saved = localStorage.getItem('cached_sessions');
		return saved ? JSON.parse(saved) : [];
	});
	const [loading, setLoading] = useState(false); // Start false if data exists
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<'all' | 'upcoming' | 'today' | 'week'>('upcoming');
	const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
	const [searchTerm, setSearchTerm] = useState('');
	const [showExportMenu, setShowExportMenu] = useState(false);
	const [exportPeriod, setExportPeriod] = useState<'today' | 'tomorrow' | 'week'>('today');
	const exportMenuRef = useRef<HTMLDivElement>(null);

	const fetchSessions = async () => {
		try {
			if (sessions.length === 0) setLoading(true);
			setError(null);
			const response = await apiClient.get<{ success: boolean; data: Session[] }>('/sessions/upcoming');
			const data = response.data || [];
			const sessionData = Array.isArray(data) ? data : [];
			setSessions(sessionData);
			localStorage.setItem('cached_sessions', JSON.stringify(sessionData));
		} catch (err) {
			console.error('Error fetching sessions:', err);
			if (sessions.length === 0) setError('خطأ في جلب الجلسات');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		// Only fetch if no cached sessions exist
		const cached = localStorage.getItem('cached_sessions');
		if (cached) {
			try {
				const data = JSON.parse(cached);
				if (data && data.length > 0) {
					// Cache is valid, don't refetch
					return;
				}
			} catch (e) { }
		}
		// No valid cache, fetch fresh data
		fetchSessions();
	}, []);

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

		if (!session.session_date) return filter === 'all';

		const sessionDate = new Date(session.session_date);
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

	// Sort
	const sortedSessions = [...filteredSessions].sort((a, b) => {
		const dateA = a.session_date ? new Date(a.session_date).getTime() : Infinity;
		const dateB = b.session_date ? new Date(b.session_date).getTime() : Infinity;
		return dateA - dateB;
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

		return sessions.filter(session => {
			if (!session.session_date) return false;
			const sessionDate = new Date(session.session_date);
			return sessionDate >= startDate && sessionDate <= endDate;
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

		const container = document.createElement('div');
		container.style.cssText = `
			position: absolute;
			left: -9999px;
			background: linear-gradient(135deg, #1E3A5F 0%, #2d4a6f 100%);
			padding: 40px;
			width: 900px;
			font-family: 'Segoe UI', Tahoma, sans-serif;
			direction: rtl;
		`;

		const today = new Date();
		const dateStr = today.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

		container.innerHTML = `
			<div style="text-align: center; margin-bottom: 30px;">
				<h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">📅 ${getExportTitle()}</h1>
				<p style="color: rgba(255,255,255,0.8); margin: 10px 0 0; font-size: 16px;">${dateStr}</p>
			</div>
			<div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
				<table style="width: 100%; border-collapse: collapse;">
					<thead>
						<tr style="background: #f8fafc;">
							<th style="padding: 14px; text-align: right; font-size: 13px; color: #64748b; border-bottom: 2px solid #e2e8f0;">#</th>
							<th style="padding: 14px; text-align: right; font-size: 13px; color: #64748b; border-bottom: 2px solid #e2e8f0;">القضية</th>
							<th style="padding: 14px; text-align: right; font-size: 13px; color: #64748b; border-bottom: 2px solid #e2e8f0;">العميل</th>
							<th style="padding: 14px; text-align: right; font-size: 13px; color: #64748b; border-bottom: 2px solid #e2e8f0;">المحكمة</th>
							<th style="padding: 14px; text-align: right; font-size: 13px; color: #64748b; border-bottom: 2px solid #e2e8f0;">الوقت</th>
							<th style="padding: 14px; text-align: right; font-size: 13px; color: #64748b; border-bottom: 2px solid #e2e8f0;">النوع</th>
							<th style="padding: 14px; text-align: right; font-size: 13px; color: #64748b; border-bottom: 2px solid #e2e8f0;">رابط الدخول</th>
						</tr>
					</thead>
					<tbody>
						${sessionsToExport.map((session: Session, index: number) => `
							<tr style="background: ${index % 2 === 0 ? 'white' : '#f8fafc'};">
								<td style="padding: 12px 14px; font-size: 13px; color: #334155; border-bottom: 1px solid #e2e8f0;">${index + 1}</td>
								<td style="padding: 12px 14px; font-size: 13px; color: #334155; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${session.case?.title || '-'}</td>
								<td style="padding: 12px 14px; font-size: 13px; color: #334155; border-bottom: 1px solid #e2e8f0;">${session.case?.client_name || '-'}</td>
								<td style="padding: 12px 14px; font-size: 13px; color: #334155; border-bottom: 1px solid #e2e8f0;">${session.court || session.case?.court || '-'}</td>
								<td style="padding: 12px 14px; font-size: 13px; color: #334155; border-bottom: 1px solid #e2e8f0;">${session.session_time || '-'}</td>
								<td style="padding: 12px 14px; font-size: 13px; border-bottom: 1px solid #e2e8f0;">
									<span style="padding: 4px 10px; border-radius: 12px; font-size: 11px; background: ${session.method === 'عن بعد' ? '#EFF6FF' : '#ECFDF5'}; color: ${session.method === 'عن بعد' ? '#3B82F6' : '#10B981'};">
										${session.method === 'عن بعد' ? '🎥 عن بعد' : '📍 حضوري'}
									</span>
								</td>
								<td style="padding: 12px 14px; font-size: 11px; color: #3B82F6; border-bottom: 1px solid #e2e8f0; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
									${session.video_conference_url || '-'}
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
					<tr><td colspan="8" class="header">📅 ${getExportTitle()}</td></tr>
					<tr><td colspan="8" class="date">${dateStr}</td></tr>
					<tr><td colspan="8"></td></tr>
					<tr>
						<th>#</th>
						<th>القضية</th>
						<th>رقم الملف</th>
						<th>العميل</th>
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
						<th>العميل</th>
						<th>الحالة</th>
						<th>الدخول</th>
					</tr>
				</thead>
				<tbody>
					{sortedSessions.map(session => (
						<tr key={session.id} onClick={() => session.case_id && navigate(`/cases/${session.case_id}`)}>
							<td>
								<div className="session-info">
									<span className="session-case-title">{session.case?.title || '-'}</span>
									<span className="session-case-number">#{session.case?.file_number || session.case_id}</span>
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
									<span>{formatDate(session.session_date)}</span>
									{session.session_time && (
										<span className="session-time">
											<Clock size={12} className="ml-1" />
											{session.session_time}
										</span>
									)}
								</div>
							</td>
							<td>
								<span
									className="urgency-badge"
									style={{
										backgroundColor: `${getUrgencyColor(session.session_date)}20`,
										color: getUrgencyColor(session.session_date)
									}}
								>
									{getDaysUntil(session.session_date)}
								</span>
							</td>
							<td>
								<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
									<User size={14} className="text-gray-400" />
									<span>{session.case?.client_name || '-'}</span>
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

	// Render Calendar View (Simplified for Demo)
	const renderCalendar = () => {
		// Generate dates for current month view logic is complex, 
		// for now we'll just map sessions to a grid if they have dates
		// A proper calendar library would be better, but we'll build a simple visual grid
		return (
			<div className="calendar-view">
				<div className="calendar-grid">
					{['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => (
						<div key={day} className="calendar-day-header">{day}</div>
					))}

					{/* Mocking empty days for start of month alignment (would need real date logic) */}
					{[1, 2, 3].map(d => <div key={`empty-${d}`} className="calendar-day" style={{ background: 'var(--quiet-gray-50)' }}></div>)}

					{sortedSessions.map((session, idx) => (
						<div key={session.id} className="calendar-day">
							<div className="calendar-date">
								{session.session_date ? new Date(session.session_date).getDate() : '-'}
							</div>
							<div className="calendar-session" onClick={() => session.case_id && navigate(`/cases/${session.case_id}`)}>
								<div className="calendar-session__title">{session.case?.title}</div>
								<div className="calendar-session__time">{session.session_time}</div>
							</div>
						</div>
					))}

					{/* Fill rest of grid */}
					{Array.from({ length: 35 - (sortedSessions.length + 3) }).map((_, i) => (
						<div key={`fill-${i}`} className="calendar-day">
							<div className="calendar-date" style={{ opacity: 0.3 }}>{i + sortedSessions.length + 1}</div>
						</div>
					))}
				</div>
				<div style={{ textAlign: 'center', marginTop: '10px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
					(عرض تقويم مبسط للأغراض التوضيحية)
				</div>
			</div>
		);
	};

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
							{sessions.filter(s => s.session_date && new Date(s.session_date).toDateString() === new Date().toDateString()).length} اليوم
						</span>
						<span className="stat-badge stat-badge--week">
							{sessions.filter(s => {
								if (!s.session_date) return false;
								const d = new Date(s.session_date);
								const now = new Date();
								const nextWeek = new Date();
								nextWeek.setDate(now.getDate() + 7);
								return d >= now && d <= nextWeek;
							}).length} هذا الأسبوع
						</span>
					</div>
				</div>

				<div className="sessions-header-bar__center">
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
						disabled={loading}
						title="تحديث"
					>
						<RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
					</button>
				</div>
			</header>

			{/* Filters Bar */}
			<div style={{ padding: '0 20px', marginTop: '16px', display: 'flex', gap: '10px' }}>
				{/* Simple Search */}
				<div style={{ position: 'relative' }}>
					<Search size={14} style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--color-text-secondary)' }} />
					<input
						type="text"
						placeholder="بحث في الجلسات..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						style={{
							padding: '8px 32px 8px 12px',
							borderRadius: '6px',
							border: '1px solid var(--color-border)',
							fontSize: '13px',
							width: '240px'
						}}
					/>
				</div>

				{[
					{ key: 'upcoming', label: 'القادمة' },
					{ key: 'today', label: 'اليوم' },
					{ key: 'week', label: 'هذا الأسبوع' },
					{ key: 'all', label: 'الكل' }
				].map(f => (
					<button
						key={f.key}
						onClick={() => setFilter(f.key as any)}
						style={{
							padding: '6px 12px',
							borderRadius: '6px',
							border: filter === f.key ? '1px solid var(--law-navy)' : '1px solid transparent',
							background: filter === f.key ? 'var(--law-navy)' : 'transparent',
							color: filter === f.key ? 'white' : 'var(--color-text-secondary)',
							fontSize: '13px',
							cursor: 'pointer',
							transition: 'all 0.15s'
						}}
					>
						{f.label}
					</button>
				))}
			</div>

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
		</div>
	);
};

export default UpcomingSessions;
