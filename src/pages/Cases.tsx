import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
	AlertCircle,
	Folder
} from 'lucide-react';
import type { Case, CaseStatus, CaseType, Priority } from '../types';
import { CaseService } from '../services';
import { UserService, type User as UserType } from '../services/UserService';
import AddCaseModal from '../components/AddCaseModal';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

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

const getLawyerName = (lawyers: unknown): string => {
	if (!Array.isArray(lawyers) || lawyers.length === 0) return '-';
	const lawyer = lawyers[0];
	return typeof lawyer === 'object' && lawyer && 'name' in lawyer
		? (lawyer as { name?: string }).name || '-'
		: '-';
};

const CACHE_KEY = 'cases_data';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const Cases: React.FC = () => {
	const navigate = useNavigate();
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

	// Stats
	const stats = useMemo(() => ({
		active: cases.filter(c => c.status === 'active').length,
		pending: cases.filter(c => c.status === 'pending').length,
		closed: cases.filter(c => c.status === 'closed').length,
		total: pagination.total
	}), [cases, pagination.total]);

	const fetchCases = async (page = 1, forceRefresh = false) => {
		try {
			// Only use cache for first page without filters (and not forcing refresh)
			const hasFilters = searchTerm || statusFilter !== 'all' || typeFilter !== 'all';
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

			setLoading(true);
			setError(null);
			const filters = {
				page,
				limit: 15,
				...(searchTerm && { search: searchTerm }),
				...(statusFilter !== 'all' && { status: statusFilter }),
				...(typeFilter !== 'all' && { case_type: typeFilter })
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
		if (searchTerm || statusFilter !== 'all' || typeFilter !== 'all') {
			const timeout = setTimeout(() => fetchCases(1, true), 400);
			return () => clearTimeout(timeout);
		}
	}, [searchTerm, statusFilter, typeFilter]);

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

			if (!caseData.filingDate) {
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
				start_date: caseData.filingDate,
				court_name: caseData.court || null,
				court_reference: caseData.caseNumber || null,
				opposing_party: caseData.opponentName || null,
				status: 'active'
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

	const hasFilters = searchTerm.trim() || statusFilter !== 'all' || typeFilter !== 'all';
	const resetFilters = () => {
		setSearchTerm('');
		setStatusFilter('all');
		setTypeFilter('all');
	};

	// Render Table View
	const renderTable = () => (
		<div className="cases-table-wrapper">
			<table className="cases-table">
				<thead>
					<tr>
						<th style={{ width: '25%' }}>القضية</th>
						<th>الحالة</th>
						<th>النوع</th>
						<th>العميل</th>
						<th>المحامي</th>
						<th>تاريخ الإنشاء</th>
						<th>الجلسة القادمة</th>
						<th style={{ width: '80px' }}></th>
					</tr>
				</thead>
				<tbody>
					{cases.map(c => {
						const statusConfig = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
						const typeLabel = (c as any).case_type_arabic || CASE_TYPE_LABELS[c.case_type] || c.case_type;

						return (
							<tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)}>
								<td>
									<div className="case-title-cell">
										<Folder size={18} className="text-gray-400" />
										<div className="case-title">{c.title}</div>
									</div>
								</td>
								<td>
									<span className={`status-badge ${statusConfig.class}`}>
										<span className="status-badge__dot" />
										{statusConfig.label}
									</span>
								</td>
								<td>
									<span className="case-type-badge">{typeLabel}</span>
								</td>
								<td>
									<div className="case-client">
										<span>{c.client_name || '-'}</span>
									</div>
								</td>
								<td>
									<div className="assignee-cell">
										<span className="assignee-name">{getLawyerName(c.lawyers)}</span>
									</div>
								</td>
								<td className="case-date-cell">
									<Clock size={14} style={{ display: 'inline', marginLeft: '6px' }} />
									{formatDate((c as any).filing_date || c.created_at)}
								</td>
								<td className="case-date-cell">
									{c.next_hearing ? (
										<>
											<Calendar size={14} style={{ display: 'inline', marginLeft: '6px' }} />
											{formatDate(c.next_hearing)}
										</>
									) : '-'}
								</td>
								<td>
									<div className="actions-cell">
										<button
											className="action-btn"
											onClick={(e) => { e.stopPropagation(); navigate(`/cases/${c.id}`); }}
											title="عرض"
										>
											<Eye size={16} />
										</button>
										<button
											className="action-btn action-btn--danger"
											onClick={(e) => handleDeleteCase(e, c.id)}
											title="حذف"
										>
											<Trash2 size={16} />
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
						<div className="case-card__meta">
							<span className="type-badge">{typeLabel}</span>
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
					<div className="cases-header-bar__stats">
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
					<div className="search-box">
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
						onClick={() => fetchCases(pagination.currentPage)}
						title="تحديث"
					>
						<RefreshCw size={16} />
					</button>
				</div>

				{/* Left: View Switcher + Add Button */}
				<div className="cases-header-bar__end">
					<div className="view-tabs">
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

					<button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
						<Plus size={16} />
						<span>قضية جديدة</span>
					</button>
				</div>
			</header>


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
					<>
						{viewMode === 'table' && renderTable()}
						{viewMode === 'grid' && renderGrid()}
						{viewMode === 'kanban' && renderKanban()}
					</>
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
