import React, { useEffect, useState } from 'react';
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
	AlertCircle
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
