import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/cases-page.css';
import {
	Plus,
	Search,
	Filter,
	MoreHorizontal,
	Calendar,
	User,
	Clock,
	FileText,
	LayoutGrid,
	List,
	Kanban,
	RefreshCw,
	X,
	ChevronLeft,
	ChevronRight,
	Eye,
	Trash2,
	Scale,
	Swords,
	AlertCircle,
	Folder
} from 'lucide-react';
import type { Case, CaseStatus, CaseType, Priority } from '../types';
import { CaseService } from '../services';
import { UserService, type User as UserType } from '../services/UserService';
import AddCaseModal from '../components/AddCaseModal';
import OutcomeBadge from '../components/OutcomeBadge';
import DisplaySettingsButton from '../components/DisplaySettingsButton';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useDisplayPreferences } from '../hooks/useDisplayPreferences';
import { getPrimaryLawyerName } from '../utils/lawyerHelpers';
import { resolveOpponent } from '../utils/partyHelpers';
import { apiClient } from '../utils/api';

type ViewMode = 'grid' | 'table' | 'kanban';

// Status colors
const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
	active: { label: 'نشطة', class: 'status-badge--active' },
	pending: { label: 'قيد النظر', class: 'status-badge--pending' },
	closed: { label: 'مغلقة', class: 'status-badge--closed' },
	appealed: { label: 'مستأنفة', class: 'status-badge--appealed' },
	settled: { label: 'مصالحة', class: 'status-badge--closed' },
	dismissed: { label: 'مرفوضة', class: 'status-badge--closed' }
};

// Case type labels
const CASE_TYPE_LABELS: Record<CaseType, string> = {
	civil: 'مدنية',
	criminal: 'جنائية',
	commercial: 'تجارية',
	family: 'أسرية',
	labor: 'عمالية',
	administrative: 'إدارية',
	real_estate: 'عقارية',
	intellectual_property: 'ملكية فكرية',
	other: 'أخرى'
};

const formatDate = (value?: Date | string | null): string => {
	if (!value) return '-';
	const date = new Date(value);
	if (isNaN(date.getTime())) return '-';
	return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getLawyerName = (caseObj: unknown): string => {
	if (!caseObj || typeof caseObj !== 'object') return '-';
	return getPrimaryLawyerName(caseObj as never);
};

const CACHE_KEY = 'cases_data';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// LocalStorage key للفلاتر المتقدمة (تبقى عبر التنقل بين الصفحات)
const ADV_FILTERS_KEY = 'cases_advanced_filters';

interface AdvancedFilters {
	lawyer_id?: string;
	responsible_lawyer_id?: string;
	client_id?: string;
	najiz_status?: string;
}

const loadAdvFilters = (): AdvancedFilters => {
	try {
		const raw = localStorage.getItem(ADV_FILTERS_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch { return {}; }
};

const saveAdvFilters = (f: AdvancedFilters) => {
	try {
		const clean: AdvancedFilters = {};
		(Object.keys(f) as (keyof AdvancedFilters)[]).forEach(k => {
			if (f[k]) clean[k] = f[k];
		});
		if (Object.keys(clean).length === 0) localStorage.removeItem(ADV_FILTERS_KEY);
		else localStorage.setItem(ADV_FILTERS_KEY, JSON.stringify(clean));
	} catch {}
};

const Cases: React.FC = () => {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const { prefs } = useDisplayPreferences();
	const [cases, setCases] = useState<Case[]>(() => {
		try {
			const cached = localStorage.getItem(CACHE_KEY);
			if (cached) {
				const { data, timestamp } = JSON.parse(cached);
				if (Date.now() - timestamp < CACHE_DURATION) {
					return data.cases || [];
				}
			}
		} catch (e) { console.error('Cache error:', e); }
		return [];
	});
	const [loading, setLoading] = useState(() => {
		try {
			const cached = localStorage.getItem(CACHE_KEY);
			if (cached) {
				const { timestamp } = JSON.parse(cached);
				if (Date.now() - timestamp < CACHE_DURATION) return false;
			}
		} catch (e) { }
		return true;
	});
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');
	const [typeFilter, setTypeFilter] = useState<CaseType | 'all'>('all');
	const [advFilters, setAdvFilters] = useState<AdvancedFilters>(loadAdvFilters);
	const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
	const [najizStatuses, setNajizStatuses] = useState<string[]>([]);
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [lawyers, setLawyers] = useState<UserType[]>([]);
	const [clients, setClients] = useState<UserType[]>([]);
	const [viewMode, setViewMode] = useState<ViewMode>('table');
	const [pagination, setPagination] = useState(() => {
		try {
			const cached = localStorage.getItem(CACHE_KEY);
			if (cached) {
				const { data, timestamp } = JSON.parse(cached);
				if (Date.now() - timestamp < CACHE_DURATION && data.pagination) {
					return data.pagination;
				}
			}
		} catch (e) { }
		return { currentPage: 1, totalPages: 1, total: 0 };
	});

	// Open add modal from query param (header quick-add)
	useEffect(() => {
		if (searchParams.get('action') === 'add') {
			setIsAddModalOpen(true);
			searchParams.delete('action');
			setSearchParams(searchParams, { replace: true });
		}
	}, [searchParams, setSearchParams]);

	// Stats
	const stats = useMemo(() => ({
		active: cases.filter(c => c.status === 'active').length,
		pending: cases.filter(c => c.status === 'pending').length,
		closed: cases.filter(c => c.status === 'closed').length,
		total: pagination.total
	}), [cases, pagination.total]);

	const [softRefreshing, setSoftRefreshing] = useState(false);

	const fetchCases = async (page = 1, forceRefresh = false) => {
		try {
			// Only use cache for first page without filters (and not forcing refresh)
			const hasAdvFilters = !!(advFilters.lawyer_id || advFilters.responsible_lawyer_id || advFilters.client_id || advFilters.najiz_status);
			const hasFilters = searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || hasAdvFilters;
			const shouldUseCache = !forceRefresh && page === 1 && !hasFilters;

			if (shouldUseCache) {
				const cached = localStorage.getItem(CACHE_KEY);
				if (cached) {
					const { data, timestamp } = JSON.parse(cached);
					if (Date.now() - timestamp < CACHE_DURATION && data.cases?.length > 0) {
						setCases(data.cases);
						setPagination(data.pagination);
						setLoading(false);
						return;
					}
				}
			}

			// تحديث ذكي: لو فيه بيانات حالية، حدّث بالخلفية بدون إعادة تحميل
			if (cases.length > 0 && forceRefresh) {
				setSoftRefreshing(true);
			} else {
				setLoading(true);
			}
			setError(null);
			const filters = {
				page,
				limit: 15,
				...(searchTerm && { search: searchTerm }),
				...(statusFilter !== 'all' && { status: statusFilter }),
				...(typeFilter !== 'all' && { case_type: typeFilter }),
				...(advFilters.lawyer_id && { lawyer_id: advFilters.lawyer_id }),
				...(advFilters.responsible_lawyer_id && { responsible_lawyer_id: advFilters.responsible_lawyer_id }),
				...(advFilters.client_id && { client_id: advFilters.client_id }),
				...(advFilters.najiz_status && { najiz_status: advFilters.najiz_status }),
			};
			const response = await CaseService.getCases(filters);
			const data = Array.isArray(response.data) ? response.data : [];
			const paginationData = {
				currentPage: response.current_page ?? page,
				totalPages: response.last_page ?? 1,
				total: response.total ?? data.length
			};

			setCases(data);
			setPagination(paginationData);

			// Save to cache (only for first page without filters)
			if (page === 1 && !hasFilters) {
				localStorage.setItem(CACHE_KEY, JSON.stringify({
					data: { cases: data, pagination: paginationData },
					timestamp: Date.now()
				}));
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'خطأ في جلب القضايا');
		} finally {
			setLoading(false);
			setSoftRefreshing(false);
		}
	};


	const fetchUsersData = async () => {
		try {
			const [lawyersData, clientsData] = await Promise.all([
				UserService.getLawyers(),
				UserService.getClients()
			]);
			setLawyers(lawyersData);
			setClients(clientsData);
		} catch (err) {
			console.error('Error fetching users:', err);
		}
	};

	useEffect(() => {
		// Only fetch if no cached data exists
		const cached = localStorage.getItem(CACHE_KEY);
		if (cached) {
			try {
				const { data, timestamp } = JSON.parse(cached);
				if (Date.now() - timestamp < CACHE_DURATION && data.cases?.length > 0) {
					// Cache is valid, data already loaded in initial state
					fetchUsersData();
					return;
				}
			} catch (e) { }
		}
		// No valid cache, fetch fresh data
		fetchCases(1, true);
		fetchUsersData();
	}, []);

	useEffect(() => {
		// Only refetch on filter changes if they actually changed (not initial render)
		const hasAdv = !!(advFilters.lawyer_id || advFilters.responsible_lawyer_id || advFilters.client_id || advFilters.najiz_status);
		if (searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || hasAdv) {
			const timeout = setTimeout(() => fetchCases(1, true), 400);
			return () => clearTimeout(timeout);
		}
	}, [searchTerm, statusFilter, typeFilter, advFilters]);

	// Persist advanced filters across navigations
	useEffect(() => { saveAdvFilters(advFilters); }, [advFilters]);

	// Fetch available najiz statuses (one-shot)
	useEffect(() => {
		apiClient.get<{ success: boolean; data: string[] }>('/cases-najiz-statuses')
			.then(res => { if (res.success) setNajizStatuses(res.data || []); })
			.catch(() => {});
	}, []);

	// تحديث تلقائي عند العودة للصفحة وكل دقيقتين
	useAutoRefresh({
		onRefresh: () => fetchCases(pagination.currentPage, true),
		refetchOnFocus: true,
		pollingInterval: 120, // كل 2 دقيقة
	});

	const handleAddCase = async (caseData: any) => {
		try {
			setLoading(true);
			setError(null);

			// التحقق من المحامي
			const lawyerId = parseInt(caseData.assignedLawyer, 10);
			if (isNaN(lawyerId)) {
				setError('يرجى اختيار المحامي المسؤول');
				return;
			}

			const isPrepMode = ['draft', 'preparation', 'filed'].includes(caseData.status);

			if (!isPrepMode && !caseData.filingDate) {
				setError('يرجى تحديد تاريخ رفع الدعوى');
				return;
			}

			// بناء البيانات حسب نوع العميل
			const createData: any = {
				title: caseData.description || caseData.caseNumber || 'قضية جديدة',
				description: caseData.description || '',
				type: caseData.caseType || 'civil',
				priority: caseData.priority || 'medium',
				primary_lawyer_id: lawyerId,
				start_date: caseData.filingDate || null,
				court_name: caseData.court || null,
				court_reference: caseData.caseNumber || null,
				opposing_party: caseData.opponentName || null,
				status: caseData.status || 'active'
			};

			// إذا كان عميل جديد
			if (caseData.isNewClient) {
				if (!caseData.clientName || !caseData.clientPhone) {
					setError('يرجى إدخال اسم العميل ورقم الهاتف');
					return;
				}
				createData.new_client = {
					name: caseData.clientName,
					phone: caseData.clientPhone,
					email: caseData.clientEmail || null,
					national_id: caseData.clientNationalId || null
				};
			} else {
				// عميل موجود
				const clientId = parseInt(caseData.clientId, 10);
				if (isNaN(clientId)) {
					setError('يرجى اختيار العميل');
					return;
				}
				createData.client_id = clientId;
			}

			console.log('Sending case data:', createData);
			await CaseService.createCase(createData);

			// مسح الكاش وتحديث القضايا
			localStorage.removeItem(CACHE_KEY);
			await fetchCases(1, true);
			setIsAddModalOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'خطأ في إضافة القضية');
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteCase = async (e: React.MouseEvent, caseId: string) => {
		e.stopPropagation();
		if (!window.confirm('هل أنت متأكد من حذف هذه القضية؟')) return;
		try {
			await CaseService.deleteCase(caseId);
			await fetchCases(pagination.currentPage);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'خطأ في حذف القضية');
		}
	};

	const advFilterCount = (advFilters.lawyer_id ? 1 : 0) + (advFilters.responsible_lawyer_id ? 1 : 0) + (advFilters.client_id ? 1 : 0) + (advFilters.najiz_status ? 1 : 0);
	const hasFilters = !!(searchTerm.trim() || statusFilter !== 'all' || typeFilter !== 'all' || advFilterCount);
	const resetFilters = () => {
		setSearchTerm('');
		setStatusFilter('all');
		setTypeFilter('all');
		setAdvFilters({});
	};

	// ── Column Resize ──
	const columns = [
		{ key: 'case', label: 'القضية', defaultWidth: 44 },
		{ key: 'parties', label: 'العميل / المحامي', defaultWidth: 18 },
		{ key: 'dates', label: 'الإنشاء / الجلسة', defaultWidth: 17 },
		{ key: 'status', label: 'الحالة / حالة ناجز', defaultWidth: 12 },
		{ key: 'file', label: 'رقم الملف', defaultWidth: 9 },
	];

	const [colWidths, setColWidths] = useState<number[]>(() => columns.map(c => c.defaultWidth));
	const resizingRef = useRef<{ col: number; startX: number; startWidth: number } | null>(null);
	const tableRef = useRef<HTMLTableElement>(null);

	const handleResizeStart = (e: React.MouseEvent, colIndex: number) => {
		e.preventDefault();
		e.stopPropagation();
		const tableWidth = tableRef.current?.offsetWidth || 1000;
		const startWidthPx = (colWidths[colIndex] / 100) * tableWidth;
		resizingRef.current = { col: colIndex, startX: e.clientX, startWidth: startWidthPx };

		const handleMove = (ev: MouseEvent) => {
			const ref = resizingRef.current;
			if (!ref) return;
			const diff = ref.startX - ev.clientX; // RTL
			const newWidthPx = Math.max(60, ref.startWidth + diff);
			const newPct = (newWidthPx / (tableRef.current?.offsetWidth || 1000)) * 100;
			const col = ref.col;
			setColWidths(prev => {
				const next = [...prev];
				next[col] = Math.min(70, Math.max(5, newPct));
				return next;
			});
		};
		const handleUp = () => {
			resizingRef.current = null;
			document.removeEventListener('mousemove', handleMove);
			document.removeEventListener('mouseup', handleUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
		document.addEventListener('mousemove', handleMove);
		document.addEventListener('mouseup', handleUp);
	};

	// Render Table View
	const renderTable = () => (
		<div className="cases-table-wrapper">
			<table className="cases-table" ref={tableRef}>
				<thead>
					<tr>
						{columns.map((col, i) => (
							<th key={col.key} style={{ width: `${colWidths[i]}%`, position: 'relative' }}>
								{col.label}
								<span className="col-resize-handle" onMouseDown={e => handleResizeStart(e, i)} />
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{cases.map(c => {
						const statusConfig = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
						const typeLabel = (c as any).case_type_arabic || CASE_TYPE_LABELS[c.case_type] || c.case_type;

						return (
							<tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)}>
								{/* العمود 1: القضية (عنوان + رقم + نوع) */}
								<td>
									<div className="erp-cell">
										<div className="erp-cell__primary">{c.title}</div>
										<div className="erp-cell__secondary">
											<span className="erp-cell__tag">{typeLabel}</span>
										</div>
									</div>
								</td>

								{/* العمود 2: الأطراف (عميل + محامي + خصم اختياري) */}
								<td>
									<div className="erp-cell">
										<div className="erp-cell__row">
											<User size={12} className="erp-cell__icon" />
											<span className="erp-cell__text">{c.client_name || '—'}</span>
										</div>
										<div className="erp-cell__row erp-cell__row--sub">
											<Scale size={11} className="erp-cell__icon" />
											<span>{getLawyerName(c)}</span>
										</div>
										{prefs.showOpponent && resolveOpponent(c as any) && (
											<div className="erp-cell__row erp-cell__row--sub" title="الخصم">
												<Swords size={11} className="erp-cell__icon" />
												<span>{resolveOpponent(c as any)}</span>
											</div>
										)}
									</div>
								</td>

								{/* العمود 3: التواريخ (إنشاء + جلسة) */}
								<td>
									<div className="erp-cell">
										<div className="erp-cell__row">
											<Clock size={12} className="erp-cell__icon" />
											<span>{formatDate((c as any).filing_date || c.created_at)}</span>
										</div>
										{c.next_hearing ? (
											<div className="erp-cell__row erp-cell__row--highlight">
												<Calendar size={11} className="erp-cell__icon" />
												<span>{formatDate(c.next_hearing)}</span>
												{(c as any).next_hearing_time && <span className="erp-cell__time">{(c as any).next_hearing_time}</span>}
											</div>
										) : (
											<div className="erp-cell__row erp-cell__row--sub">
												<Calendar size={11} className="erp-cell__icon" />
												<span>لا توجد جلسة</span>
											</div>
										)}
									</div>
								</td>

								{/* العمود 4: الحالة / حالة ناجز */}
								<td>
									<div className="erp-cell">
										<div className="erp-cell__row" style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
											<span className={`status-badge ${statusConfig.class}`}>
												<span className="status-badge__dot" />
												{statusConfig.label}
											</span>
											{(c as any).outcome && (
												<OutcomeBadge
													size="sm"
													outcome={(c as any).outcome}
													confidence={(c as any).outcome_confidence}
													source={(c as any).outcome_source}
													appealed={(c as any).outcome_appealed}
													partial={(c as any).outcome_is_partial}
												/>
											)}
										</div>
										<div className="erp-cell__row erp-cell__row--sub" style={{ marginTop: 3 }}>
											{(c as any).najiz_status_arabic ? (
												<span style={{ fontSize: 11, color: 'var(--law-navy)', fontWeight: 500 }}>
													{(c as any).najiz_status_arabic}
												</span>
											) : (
												<span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
													لم يتم الربط
												</span>
											)}
										</div>
									</div>
								</td>

								{/* العمود 5: رقم الملف + حذف */}
								<td>
									<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
										<span className="erp-cell__tag erp-cell__tag--id" style={{ fontSize: 11 }}>{(c as any).file_number || '—'}</span>
										<button className="case-delete-btn" onClick={(e) => handleDeleteCase(e, c.id)} title="حذف">
											<Trash2 size={14} />
										</button>
									</div>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);

	// Render Grid View
	const renderGrid = () => (
		<div className="cases-grid">
			{cases.map(c => {
				const statusConfig = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
				const typeLabel = (c as any).case_type_arabic || CASE_TYPE_LABELS[c.case_type] || c.case_type;

				return (
					<div key={c.id} className="case-card" onClick={() => navigate(`/cases/${c.id}`)}>
						<div className="case-card__header">
							<div>
								<div className="case-card__title">{c.title}</div>
								<div className="case-card__number">{c.file_number || '-'}</div>
							</div>
							<span className={`status-badge ${statusConfig.class}`}>
								<span className="status-badge__dot" />
								{statusConfig.label}
							</span>
						</div>
						<div className="case-card__meta" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
							<span className="type-badge">{typeLabel}</span>
							{(c as any).outcome && (
								<OutcomeBadge
									size="sm"
									outcome={(c as any).outcome}
									confidence={(c as any).outcome_confidence}
									source={(c as any).outcome_source}
									appealed={(c as any).outcome_appealed}
									partial={(c as any).outcome_is_partial}
								/>
							)}
						</div>
						<div className="case-card__footer">
							<span><User size={12} /> {c.client_name || '-'}</span>
							<span><Calendar size={12} /> {formatDate((c as any).filing_date)}</span>
						</div>
					</div>
				);
			})}
		</div>
	);

	// Render Kanban View
	const renderKanban = () => {
		const columns: { id: CaseStatus; label: string; color: string }[] = [
			{ id: 'active', label: 'نشطة', color: 'var(--clickup-green)' },
			{ id: 'pending', label: 'قيد النظر', color: 'var(--clickup-orange)' },
			{ id: 'closed', label: 'مغلقة', color: 'var(--quiet-gray-500)' }
		];

		return (
			<div className="cases-kanban">
				{columns.map(column => {
					const columnCases = cases.filter(c => c.status === column.id);
					return (
						<div key={column.id} className="kanban-column">
							<div className="kanban-column__header">
								<div className="kanban-column__title">
									<span className="kanban-column__dot" style={{ background: column.color }} />
									{column.label}
								</div>
								<span className="kanban-column__count">{columnCases.length}</span>
							</div>
							<div className="kanban-column__cards">
								{columnCases.map(c => (
									<div
										key={c.id}
										className="kanban-card"
										onClick={() => navigate(`/cases/${c.id}`)}
									>
										<div className="kanban-card__title">{c.title}</div>
										<div className="kanban-card__meta">
											<span><User size={11} /> {c.client_name || '-'}</span>
											<span><Calendar size={11} /> {formatDate((c as any).filing_date)}</span>
										</div>
									</div>
								))}
							</div>
						</div>
					);
				})}
			</div>
		);
	};

	return (
		<div className="cases-page">
			{/* Compact Header Bar */}
			<header className="cases-header-bar">
				{/* Right: Title + Stats */}
				<div className="cases-header-bar__start">
					<div className="cases-header-bar__title">
						<Scale size={20} />
						<span>القضايا</span>
						<span className="cases-header-bar__count">{stats.total}</span>
					</div>
					<div className="cases-header-bar__stats" data-tour="cases-stats">
						<span className="stat-pill stat-pill--active">
							<span className="stat-pill__dot" />
							{stats.active} نشطة
						</span>
						<span className="stat-pill stat-pill--pending">
							<span className="stat-pill__dot" />
							{stats.pending} معلقة
						</span>
						<span className="stat-pill stat-pill--closed">
							<span className="stat-pill__dot" />
							{stats.closed} مغلقة
						</span>
					</div>
				</div>

				{/* Center: Search + Filters */}
				<div className="cases-header-bar__center">
					<div className="search-box" data-tour="cases-search">
						<Search size={16} />
						<input
							type="text"
							placeholder="بحث بالرقم أو اسم القضية أو العميل..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
						{searchTerm && (
							<button onClick={() => setSearchTerm('')} className="search-box__clear">
								<X size={14} />
							</button>
						)}
					</div>

					<select
						className="filter-select"
						data-tour="cases-filter-status"
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value as any)}
					>
						<option value="all">كل الحالات</option>
						<option value="active">نشطة</option>
						<option value="pending">معلقة</option>
						<option value="closed">مغلقة</option>
						<option value="appealed">مستأنفة</option>
					</select>

					<select
						className="filter-select"
						data-tour="cases-filter-type"
						value={typeFilter}
						onChange={(e) => setTypeFilter(e.target.value as any)}
					>
						<option value="all">كل الأنواع</option>
						{Object.entries(CASE_TYPE_LABELS).map(([key, label]) => (
							<option key={key} value={key}>{label}</option>
						))}
					</select>

					<button
						className="icon-btn"
						onClick={() => setShowAdvancedPanel(s => !s)}
						title="فلاتر متقدمة"
						style={advFilterCount > 0 || showAdvancedPanel ? { background: 'var(--law-navy-light, rgba(30,58,95,.08))', color: 'var(--law-navy)', position: 'relative' } : { position: 'relative' }}
					>
						<Filter size={16} />
						{advFilterCount > 0 && (
							<span style={{
								position: 'absolute', top: -4, insetInlineEnd: -4,
								background: 'var(--law-navy)', color: '#fff',
								fontSize: 9, fontWeight: 700,
								minWidth: 14, height: 14, padding: '0 3px',
								borderRadius: 8, display: 'inline-flex',
								alignItems: 'center', justifyContent: 'center',
								lineHeight: 1
							}}>{advFilterCount}</span>
						)}
					</button>

					<button
						className="icon-btn"
						onClick={() => fetchCases(pagination.currentPage, true)}
						title="تحديث"
						disabled={softRefreshing}
					>
						<RefreshCw size={16} className={softRefreshing ? 'spin-slow' : ''} />
					</button>

					<DisplaySettingsButton />
				</div>

				{/* Left: View Switcher + Add Button */}
				<div className="cases-header-bar__end">
					<div className="view-tabs" data-tour="cases-view-tabs">
						<button
							className={`view-tab ${viewMode === 'table' ? 'view-tab--active' : ''}`}
							onClick={() => setViewMode('table')}
						>
							<List size={16} />
						</button>
						<button
							className={`view-tab ${viewMode === 'grid' ? 'view-tab--active' : ''}`}
							onClick={() => setViewMode('grid')}
						>
							<LayoutGrid size={16} />
						</button>
						<button
							className={`view-tab ${viewMode === 'kanban' ? 'view-tab--active' : ''}`}
							onClick={() => setViewMode('kanban')}
						>
							<Kanban size={16} />
						</button>
					</div>

					<button className="btn-primary" data-tour="cases-add" onClick={() => setIsAddModalOpen(true)}>
						<Plus size={16} />
						<span>قضية جديدة</span>
					</button>
				</div>
			</header>

			{/* Advanced Filters Panel */}
			{showAdvancedPanel && (
				<div style={{
					background: 'var(--dashboard-card)',
					border: '1px solid var(--color-border)',
					borderRadius: 8,
					padding: '12px 16px',
					margin: '0 0 12px 0',
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
					gap: 12,
					alignItems: 'end',
				}}>
					<div>
						<label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
							العميل
						</label>
						<select
							className="filter-select"
							value={advFilters.client_id || ''}
							onChange={(e) => setAdvFilters(f => ({ ...f, client_id: e.target.value || undefined }))}
							style={{ width: '100%' }}
						>
							<option value="">كل العملاء</option>
							{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
						</select>
					</div>

					<div>
						<label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
							محامي مرتبط
						</label>
						<select
							className="filter-select"
							value={advFilters.lawyer_id || ''}
							onChange={(e) => setAdvFilters(f => ({ ...f, lawyer_id: e.target.value || undefined }))}
							style={{ width: '100%' }}
						>
							<option value="">كل المحامين</option>
							{lawyers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
						</select>
					</div>

					<div>
						<label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
							المحامي المسؤول
						</label>
						<select
							className="filter-select"
							value={advFilters.responsible_lawyer_id || ''}
							onChange={(e) => setAdvFilters(f => ({ ...f, responsible_lawyer_id: e.target.value || undefined }))}
							style={{ width: '100%' }}
						>
							<option value="">الكل</option>
							{lawyers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
						</select>
					</div>

					<div>
						<label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
							حالة ناجز
						</label>
						<select
							className="filter-select"
							value={advFilters.najiz_status || ''}
							onChange={(e) => setAdvFilters(f => ({ ...f, najiz_status: e.target.value || undefined }))}
							style={{ width: '100%' }}
						>
							<option value="">كل الحالات</option>
							{najizStatuses.map(s => <option key={s} value={s}>{s}</option>)}
						</select>
					</div>

					{advFilterCount > 0 && (
						<div>
							<button
								className="icon-btn"
								onClick={() => setAdvFilters({})}
								style={{ width: '100%', fontSize: 12, padding: '6px 10px' }}
								title="مسح الفلاتر المتقدمة"
							>
								<X size={14} /> مسح
							</button>
						</div>
					)}
				</div>
			)}

			{/* Content */}
			{
				loading ? (
					<div className="cases-loading">
						{[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton-row" />)}
					</div>
				) : error ? (
					<div className="cases-empty">
						<AlertCircle size={48} className="cases-empty__icon" />
						<div className="cases-empty__title">حدث خطأ</div>
						<div className="cases-empty__desc">{error}</div>
						<button className="btn-primary" onClick={() => fetchCases(pagination.currentPage)}>
							إعادة المحاولة
						</button>
					</div>
				) : cases.length === 0 ? (
					<div className="cases-empty">
						<FileText size={48} className="cases-empty__icon" />
						<div className="cases-empty__title">لا توجد قضايا</div>
						<div className="cases-empty__desc">جرّب تعديل معايير البحث أو إضافة قضية جديدة</div>
						<button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
							<Plus size={16} /> إضافة قضية
						</button>
					</div>
				) : (
					<div data-tour="cases-list">
						{viewMode === 'table' && renderTable()}
						{viewMode === 'grid' && renderGrid()}
						{viewMode === 'kanban' && renderKanban()}
					</div>
				)
			}

			{/* Pagination */}
			{
				!loading && cases.length > 0 && (
					<div className="cases-pagination">
						<div className="cases-pagination__info">
							{stats.total} قضية • صفحة {pagination.currentPage} من {pagination.totalPages}
						</div>
						<div className="cases-pagination__controls">
							<button
								className="pagination-btn"
								onClick={() => fetchCases(pagination.currentPage - 1)}
								disabled={pagination.currentPage <= 1}
							>
								<ChevronRight size={14} /> السابق
							</button>
							<div className="pagination-pages">
								{(() => {
									const { currentPage, totalPages } = pagination;
									const pages: (number | string)[] = [];
									const maxVisible = 5;

									if (totalPages <= maxVisible + 2) {
										// إظهار كل الصفحات إذا كان العدد قليل
										for (let i = 1; i <= totalPages; i++) pages.push(i);
									} else {
										// دائماً أظهر الصفحة الأولى
										pages.push(1);

										// حساب بداية ونهاية النطاق حول الصفحة الحالية
										let start = Math.max(2, currentPage - 1);
										let end = Math.min(totalPages - 1, currentPage + 1);

										// تعديل النطاق إذا كنا قريبين من البداية أو النهاية
										if (currentPage <= 3) {
											end = Math.min(totalPages - 1, 4);
										} else if (currentPage >= totalPages - 2) {
											start = Math.max(2, totalPages - 3);
										}

										// إضافة ... قبل النطاق إذا لزم الأمر
										if (start > 2) pages.push('...');

										// إضافة الصفحات في النطاق
										for (let i = start; i <= end; i++) pages.push(i);

										// إضافة ... بعد النطاق إذا لزم الأمر
										if (end < totalPages - 1) pages.push('...');

										// دائماً أظهر الصفحة الأخيرة
										if (totalPages > 1) pages.push(totalPages);
									}

									return pages.map((page, index) => (
										typeof page === 'number' ? (
											<button
												key={page}
												className={`pagination-page ${page === currentPage ? 'pagination-page--active' : ''}`}
												onClick={() => fetchCases(page)}
											>
												{page}
											</button>
										) : (
											<span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
										)
									));
								})()}
							</div>
							<button
								className="pagination-btn"
								onClick={() => fetchCases(pagination.currentPage + 1)}
								disabled={pagination.currentPage >= pagination.totalPages}
							>
								التالي <ChevronLeft size={14} />
							</button>
						</div>
					</div>
				)
			}

			{/* Add Modal */}
			<AddCaseModal
				isOpen={isAddModalOpen}
				onClose={() => setIsAddModalOpen(false)}
				onSave={handleAddCase}
				lawyers={lawyers}
				clients={clients}
			/>
		</div >
	);
};

export default Cases;
