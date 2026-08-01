import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useCaseAccessGuard from '../hooks/useCaseAccessGuard';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)
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
	Folder,
	Download,
	Archive,
	ArchiveRestore
} from 'lucide-react';
import type { ArchivedFilter, Case, CaseStatus, CaseType, Priority } from '../types';
import { CaseService } from '../services';
import { Can } from '../components/Can';
import { UserService, type User as UserType } from '../services/UserService';
import AddCaseModal from '../components/AddCaseModal';
import CasesExportModal from '../components/CasesExportModal';
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

// توجيه القضية حسب نوعها: الإفلاس والصلح وديوان المظالم لصفحاتها المخصّصة، والبقية لتفاصيل القضية
const caseDetailUrl = (c: Case): string =>
	c.is_bankruptcy ? `/bankruptcy/${c.id}`
	: (c as any).is_reconciliation ? `/reconciliation/${c.id}`
	: (c as any).is_grievance ? `/grievance/${c.id}`
	: `/cases/${c.id}`;

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

// مفتاح كاش الوضع الافتراضي (المؤرشف مخفيّ). يجب أن يبقى مطابقاً لـ CACHE_KEYS.CASES في
// utils/cacheManager لأن CaseService (إنشاء/تعديل/حذف/أرشفة) يُبطله بهذا الاسم بالضبط —
// تغييره يجعل التعديلات من صفحات أخرى لا تُنعش هذه القائمة.
const CACHE_KEY = 'cases_data';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// حالة الأرشيف جزءٌ من هوية الكاش: لكل وضع مفتاحه، وإلا ظهرت صفوف مؤرشفة داخل القائمة الحيّة.
// (الوضعان '1' و'all' لا يُكتبان أصلاً لأن shouldUseCache يمنعهما، والمفتاح خط دفاع ثانٍ.)
const ARCHIVED_MODES: ArchivedFilter[] = ['0', '1', 'all'];
const DEFAULT_ARCHIVED: ArchivedFilter = '0';
const cacheKeyFor = (archived: ArchivedFilter): string =>
	archived === DEFAULT_ARCHIVED ? CACHE_KEY : `${CACHE_KEY}_archived_${archived}`;
const clearCasesCache = (): void => {
	ARCHIVED_MODES.forEach(m => { try { localStorage.removeItem(cacheKeyFor(m)); } catch { /* تجاهل */ } });
};

// المعيار الوحيد للأرشفة: archived_at (is_archived يحسبه الباك في /cases). لا علاقة لها بسلة المحذوفات.
const isCaseArchived = (c: Case): boolean => !!(c.archived_at || c.is_archived);

// خيار المستخدم: عدد القضايا المعروضة في الصفحة الواحدة (يُحفظ ويُطبَّق على الترقيم).
const PAGE_SIZE_KEY = 'cases_page_size';
const PAGE_SIZE_OPTIONS = [15, 30, 50, 100];
const DEFAULT_PAGE_SIZE = 15;
const getSavedPageSize = (): number => {
	try {
		const v = parseInt(localStorage.getItem(PAGE_SIZE_KEY) || '', 10);
		return PAGE_SIZE_OPTIONS.includes(v) ? v : DEFAULT_PAGE_SIZE;
	} catch { return DEFAULT_PAGE_SIZE; }
};

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
	// حارس القضايا المنقطعة عن ناجز — يعترض الضغط قبل الانتقال
	const { guardOpen, accessModal } = useCaseAccessGuard();
	const [searchParams, setSearchParams] = useSearchParams();
	const { prefs } = useDisplayPreferences();
	// تنظيف كاش القائمة إن كان بحجم صفحة مختلف عن تفضيل المستخدم — قبل أن تقرأه
	// مُهيّئات الحالة أدناه (يمنع عرض حجم قديم بعد تغيير «عدد القضايا في الصفحة»).
	useState(() => {
		try {
			const c = localStorage.getItem(cacheKeyFor(DEFAULT_ARCHIVED));
			if (c && JSON.parse(c).pageSize !== getSavedPageSize()) {
				clearCasesCache();
			}
		} catch { /* تجاهل */ }
		return null;
	});
	// الصفحة تبدأ دائماً على القائمة الحيّة (المؤرشف مخفيّ)، لذا تقرأ المُهيّئات مفتاح ذلك الوضع وحده.
	const [archivedFilter, setArchivedFilter] = useState<ArchivedFilter>(DEFAULT_ARCHIVED);
	const [cases, setCases] = useState<Case[]>(() => {
		try {
			const cached = localStorage.getItem(cacheKeyFor(DEFAULT_ARCHIVED));
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
			const cached = localStorage.getItem(cacheKeyFor(DEFAULT_ARCHIVED));
			if (cached) {
				const { timestamp } = JSON.parse(cached);
				if (Date.now() - timestamp < CACHE_DURATION) return false;
			}
		} catch (e) { }
		return true;
	});
	// عدّاد المؤرشفة يأتي من الباك مع كل قائمة — لا يُحسب عميلياً من الصفحة المعروضة.
	const [archivedCount, setArchivedCount] = useState<number>(() => {
		try {
			const cached = localStorage.getItem(cacheKeyFor(DEFAULT_ARCHIVED));
			if (cached) {
				const { data, timestamp } = JSON.parse(cached);
				if (Date.now() - timestamp < CACHE_DURATION) return data.archivedCount ?? 0;
			}
		} catch (e) { }
		return 0;
	});
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');
	const [typeFilter, setTypeFilter] = useState<CaseType | 'all'>('all');
	const [advFilters, setAdvFilters] = useState<AdvancedFilters>(loadAdvFilters);
	const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
	const [najizStatuses, setNajizStatuses] = useState<string[]>([]);
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [isExportModalOpen, setIsExportModalOpen] = useState(false);
	const [lawyers, setLawyers] = useState<UserType[]>([]);
	const [clients, setClients] = useState<UserType[]>([]);
	const [viewMode, setViewMode] = useState<ViewMode>('table');
	const [pageSize, setPageSize] = useState<number>(getSavedPageSize);
	const [pagination, setPagination] = useState(() => {
		try {
			const cached = localStorage.getItem(cacheKeyFor(DEFAULT_ARCHIVED));
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

	const fetchCases = async (
		page = 1,
		forceRefresh = false,
		sizeOverride?: number,
		archivedOverride?: ArchivedFilter,
		showSkeleton = false,
	) => {
		try {
			// حجم الصفحة الفعلي (خيار المستخدم) — يُمرَّر صراحة عند تغييره لأن الـ state
			// لا يُحدَّث تزامنياً. ومثله وضع الأرشيف عند تبديله من زرّ الأرشيف.
			const limit = sizeOverride ?? pageSize;
			const archived = archivedOverride ?? archivedFilter;
			// Only use cache for first page without filters (and not forcing refresh)
			const hasAdvFilters = !!(advFilters.lawyer_id || advFilters.responsible_lawyer_id || advFilters.client_id || advFilters.najiz_status);
			// وضع الأرشيف فلترٌ كسائر الفلاتر: أي وضع غير الافتراضي يمنع الكاش المشترك.
			const hasFilters = !!(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || hasAdvFilters || archived !== DEFAULT_ARCHIVED);
			const shouldUseCache = !forceRefresh && page === 1 && !hasFilters;
			const cacheKey = cacheKeyFor(archived);

			if (shouldUseCache) {
				const cached = localStorage.getItem(cacheKey);
				if (cached) {
					const { data, timestamp } = JSON.parse(cached);
					if (Date.now() - timestamp < CACHE_DURATION && data.cases?.length > 0) {
						setCases(data.cases);
						setPagination(data.pagination);
						setArchivedCount(data.archivedCount ?? 0);
						setLoading(false);
						return;
					}
				}
			}

			// تحديث ذكي: لو فيه بيانات حالية، حدّث بالخلفية بدون إعادة تحميل.
			// عند تبديل وضع الأرشيف نُظهر الهيكل العظمي كي لا تبقى صفوف الوضع السابق معروضة.
			if (showSkeleton) {
				setLoading(true);
			} else if (cases.length > 0 && forceRefresh) {
				setSoftRefreshing(true);
			} else {
				setLoading(true);
			}
			setError(null);
			const filters = {
				page,
				limit,
				...(searchTerm && { search: searchTerm }),
				...(statusFilter !== 'all' && { status: statusFilter }),
				...(typeFilter !== 'all' && { case_type: typeFilter }),
				...(advFilters.lawyer_id && { lawyer_id: advFilters.lawyer_id }),
				...(advFilters.responsible_lawyer_id && { responsible_lawyer_id: advFilters.responsible_lawyer_id }),
				...(advFilters.client_id && { client_id: advFilters.client_id }),
				...(advFilters.najiz_status && { najiz_status: advFilters.najiz_status }),
				// '0' هو افتراض الباك فلا داعي لإرساله؛ البحث يُظهر المؤرشف تلقائياً من جهة الباك.
				...(archived !== DEFAULT_ARCHIVED && { archived }),
			};
			const response = await CaseService.getCases(filters);
			const data = Array.isArray(response.data) ? response.data : [];
			const paginationData = {
				currentPage: response.current_page ?? page,
				totalPages: response.last_page ?? 1,
				total: response.total ?? data.length
			};
			const archivedTotal = response.archived_count ?? 0;

			setCases(data);
			setPagination(paginationData);
			setArchivedCount(archivedTotal);

			// Save to cache (only for first page without filters — أي وضع الأرشيف الافتراضي)
			if (page === 1 && !hasFilters) {
				localStorage.setItem(cacheKey, JSON.stringify({
					data: { cases: data, pagination: paginationData, archivedCount: archivedTotal },
					timestamp: Date.now(),
					pageSize: limit
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
		// Only fetch if no cached data exists (الصفحة تبدأ على وضع الأرشيف الافتراضي)
		const cached = localStorage.getItem(cacheKeyFor(DEFAULT_ARCHIVED));
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

	// تغيير عدد القضايا المعروضة في الصفحة (خيار المستخدم) — يُحفظ ويعيد الجلب من الصفحة الأولى.
	const handlePageSizeChange = (size: number) => {
		if (size === pageSize) return;
		setPageSize(size);
		try { localStorage.setItem(PAGE_SIZE_KEY, String(size)); } catch {}
		fetchCases(1, true, size);
	};

	// تبديل وضع الأرشيف — يُمرَّر الوضع صراحةً لأن الـ state لا يُحدَّث تزامنياً،
	// ومع هيكل عظمي كي لا تبقى صفوف الوضع السابق معروضة تحت ترويسة جديدة.
	const handleArchivedModeChange = (next: ArchivedFilter) => {
		if (next === archivedFilter) return;
		setArchivedFilter(next);
		fetchCases(1, true, undefined, next, true);
	};

	// أرشفة/إعادة قضية — بُعد مستقل تماماً عن الحذف وسلة المحذوفات: القضية تبقى كاملة
	// ولا يتتالى شيء على جلساتها ولا مهامها ولا عميلها.
	// نقرة واحدة بلا نافذة تأكيد: الفعل قابل للعكس من زرّ «إعادة» نفسه في وضع الأرشيف.
	const [archivingId, setArchivingId] = useState<string | null>(null);
	const handleToggleArchive = async (e: React.MouseEvent, c: Case) => {
		e.stopPropagation();
		const archived = isCaseArchived(c);
		try {
			setArchivingId(String(c.id));
			setError(null);
			if (archived) await CaseService.unarchive(c.id);
			else await CaseService.archive(c.id);
			// الخدمة تُبطل مفتاح cases_data؛ نمسح بقية أوضاع الأرشيف كذلك.
			clearCasesCache();
			await fetchCases(pagination.currentPage, true);
		} catch (err) {
			setError(err instanceof Error ? err.message : (archived ? 'تعذّرت إعادة القضية من الأرشيف' : 'تعذّرت أرشفة القضية'));
		} finally {
			setArchivingId(null);
		}
	};

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
				title: caseData.caseNumber || 'قضية جديدة',
				description: caseData.description || null,
				type: caseData.caseType || (isPrepMode ? undefined : 'civil'),
				priority: caseData.priority || 'medium',
				primary_lawyer_id: lawyerId,
				start_date: caseData.filingDate || null,
				court_name: caseData.court || null,
				opponent_lawyer: caseData.opponentLawyer || null,
					case_value: caseData.contractValue ? Number(caseData.contractValue) : null,
					notes: caseData.notes || null,
				opposing_party: caseData.opponentName || null,
				// صفة العميل (اختياري) — عند تحديدها يزرع الباك أطراف الدعوى تلقائياً
				client_role: caseData.clientRole || undefined,
				status: caseData.status || 'active'
			};

			// سياسة اعتماد المذكرات (تُطبَّق في الباك فقط لمن يملك صلاحية السياسة)
			if (caseData.requiresMemoApproval) {
				createData.requires_memo_approval = true;
				createData.memo_approvers = {
					user_ids: (caseData.memoApprovers || []).map((id: string) => parseInt(id, 10)).filter((n: number) => !isNaN(n)),
					kinds: [],
					mode: 'parallel',
				};
			}

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

			// عملاء إضافيون (متعددو الموكلين) — موجودون أو جدد
				const extras = (caseData.additionalClients || [])
					.map((ec: any) => ec.mode === 'existing'
						? (ec.clientId ? { client_id: parseInt(ec.clientId, 10) } : null)
						: ((ec.name && ec.phone) ? { name: ec.name, phone: ec.phone, email: ec.email || null, national_id: ec.nationalId || null } : null))
					.filter(Boolean);
				if (extras.length > 0) createData.additional_clients = extras;

				// محامو الفريق (بخلاف المحامي المسؤول) — أرقام فريدة بلا المسؤول
				const teamLawyerIds = Array.from(new Set(
					(caseData.teamLawyers || [])
						.map((v: string) => parseInt(v, 10))
						.filter((n: number) => !isNaN(n) && n !== lawyerId)
				));
				if (teamLawyerIds.length > 0) createData.team_lawyer_ids = teamLawyerIds;
			const created = await CaseService.createCase(createData);

			// مسح الكاش وتحديث القضايا
			clearCasesCache();
			if (created?.id) {
					setIsAddModalOpen(false);
					navigate(`/cases/${created.id}`);
					return;
				}
				await fetchCases(1, true);
			setIsAddModalOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'خطأ في إضافة القضية');
			throw err; // أعد الرمي ليُبقي النموذج مفتوحاً بمدخلاته عند الفشل
		} finally {
			setLoading(false);
		}
	};

	// نافذة التأكيد تذكر اسم القضية ورقمها معاً — الصفوف متجاورة والزرّ يظهر بمرور الماوس،
	// فلا بدّ أن يتأكّد المستخدم من هوية ما يحذفه قبل الموافقة.
	const handleDeleteCase = async (e: React.MouseEvent, c: Case) => {
		e.stopPropagation();
		const fileNumber = (c as any).file_number;
		const identity = fileNumber ? `«${c.title}» — رقم الملف ${fileNumber}` : `«${c.title}»`;
		if (!window.confirm(`هل أنت متأكد من حذف القضية ${identity}؟`)) return;
		try {
			await CaseService.deleteCase(c.id);
			await fetchCases(pagination.currentPage);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'خطأ في حذف القضية');
		}
	};

	const advFilterCount = (advFilters.lawyer_id ? 1 : 0) + (advFilters.responsible_lawyer_id ? 1 : 0) + (advFilters.client_id ? 1 : 0) + (advFilters.najiz_status ? 1 : 0);
	// وضع الأرشيف فلترٌ كامل الأهلية هنا أيضاً — تجاهله يجعل «لا فلاتر» كذباً داخل الأرشيف.
	const hasFilters = !!(searchTerm.trim() || statusFilter !== 'all' || typeFilter !== 'all' || advFilterCount || archivedFilter !== DEFAULT_ARCHIVED);
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
						const archived = isCaseArchived(c);

						return (
							<tr
								key={c.id}
								className={c.is_bankruptcy ? 'is-bankruptcy' : ((c as any).is_grievance ? 'is-grievance' : undefined)}
								onClick={(e) => {
									// النقر داخل خلية الإجراءات لا يفتح القضية — حارسٌ على مستوى الصف
									// لا يتّكل على stopPropagation وحده (نقرةٌ على حافة الأيقونة تفلت منه).
									if ((e.target as HTMLElement).closest('.case-id-cell__actions')) return;
									guardOpen(c as never, () => navigate(caseDetailUrl(c)));
								}}
							>
								{/* العمود 1: القضية (عنوان + رقم + نوع) */}
								<td>
									<div className="erp-cell">
										<div className="erp-cell__primary">{c.title}</div>
										<div className="erp-cell__secondary">
											{/* رقاقة نصّية رمادية هادئة — القضية مؤرشفة لا محذوفة */}
											{archived && <span className="erp-cell__tag" title="قضية مؤرشفة — مخفيّة عن القائمة الحيّة">مؤرشفة</span>}
											{c.is_bankruptcy && <span className="erp-cell__tag erp-cell__tag--bankruptcy">إفلاس</span>}
											{(c as any).is_reconciliation && <span className="erp-cell__tag" style={{ background: 'rgba(21,115,71,0.12)', color: '#157347', fontWeight: 700 }}>صلح</span>}
											{(c as any).is_grievance && <span className="erp-cell__tag erp-cell__tag--grievance">ديوان المظالم</span>}
											{(c as any).najiz_access_revoked && (
												<span
													className="erp-cell__tag"
													title="انتهت علاقتك بهذه القضية في ناجز"
													style={{ background: 'rgba(220,38,38,0.10)', color: 'var(--status-red, #dc2626)', fontWeight: 700 }}
												>
													انتهت العلاقة
												</span>
											)}
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

								{/* العمود 5: رقم الملف — يتوارى بمرور الماوس على الصف ليحلّ محلّه زرّا الأرشفة والحذف
								    داخل الخلية نفسها وبعرضها نفسه (على اللمس يظهر الجميع معاً — انظر cases-page.css) */}
								<td>
									<div className="case-id-cell">
										<span className="case-id-cell__number erp-cell__tag erp-cell__tag--id">{(c as any).file_number || '—'}</span>
										<div className="case-id-cell__actions">
											<Can permission="cases.archive">
												<button
													type="button"
													className="case-row-action"
													onClick={(e) => handleToggleArchive(e, c)}
													disabled={archivingId === String(c.id)}
													title={archived ? 'إعادة من الأرشيف' : 'نقل إلى الأرشيف'}
													aria-label={archived ? 'إعادة من الأرشيف' : 'نقل إلى الأرشيف'}
												>
													{archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
												</button>
											</Can>
											<Can permission="cases.delete">
												<button
													type="button"
													className="case-row-action case-row-action--danger"
													onClick={(e) => handleDeleteCase(e, c)}
													title="حذف القضية"
													aria-label="حذف القضية"
												>
													<Trash2 size={14} />
												</button>
											</Can>
										</div>
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
					<div key={c.id} className="case-card" onClick={() => guardOpen(c as never, () => navigate(caseDetailUrl(c)))}>
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
							{isCaseArchived(c) && <span className="erp-cell__tag" title="قضية مؤرشفة — مخفيّة عن القائمة الحيّة">مؤرشفة</span>}
							<span className="type-badge">{typeLabel}</span>
							{(c as any).is_reconciliation && <span className="type-badge" style={{ background: 'rgba(21,115,71,0.12)', color: '#157347' }}>صلح</span>}
							{(c as any).is_grievance && <span className="type-badge" style={{ background: 'var(--law-navy-light, #eef2f7)', color: 'var(--law-navy, #1E3A5F)' }}>ديوان المظالم</span>}
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
										onClick={() => guardOpen(c as never, () => navigate(caseDetailUrl(c)))}
									>
										<div className="kanban-card__title">{c.title}</div>
										<div className="kanban-card__meta">
											{isCaseArchived(c) && <span className="erp-cell__tag" title="قضية مؤرشفة — مخفيّة عن القائمة الحيّة">مؤرشفة</span>}
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

	// وضع الأرشيف نشط؟ الوضع ثنائي حصراً: '0' القائمة الحيّة (الافتراضي) و'1' المؤرشفة.
	const archiveMode = archivedFilter === '1';
	// نصّ زرّ الأرشيف — العدد من ردّ الخادم (archived_count) لا من الصفحة المعروضة،
	// ويبقى الزرّ ظاهراً بلا عدد حين يكون صفراً كي يجده المستخدم بعد أوّل أرشفة.
	const archiveChipLabel = `الأرشيف${archivedCount > 0 ? ` (${archivedCount})` : ''}`;
	// ترويسة القائمة تظهر في وضع الأرشيف وحده — إعلاناً بأننا خارج القائمة الحيّة.
	// في الوضع العادي لا سطر فوق الجدول: العدّاد موجود في ترويسة الصفحة، وعدد
	// المؤرشفة داخل زرّ الأرشيف نفسه، فسطرٌ ثالث يكرّرهما ويشوّش.
	const listCountLabel = archiveMode ? `أرشيف القضايا — ${stats.total} قضية` : null;

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

					{/* زرّ الأرشيف: هادئ في وضع القائمة الحيّة، ويصير رقاقة كحلية نشطة فيها X للخروج */}
					{archiveMode ? (
						<span className="cases-archive-chip cases-archive-chip--active" data-tour="cases-archive-toggle">
							<span className="cases-archive-chip__label">{archiveChipLabel}</span>
							<button
								type="button"
								className="cases-archive-chip__close"
								onClick={() => handleArchivedModeChange('0')}
								title="الخروج من الأرشيف والعودة إلى القائمة الحيّة"
								aria-label="الخروج من الأرشيف والعودة إلى القائمة الحيّة"
							>
								<X size={13} />
							</button>
						</span>
					) : (
						<button
							type="button"
							className="cases-archive-chip"
							data-tour="cases-archive-toggle"
							onClick={() => handleArchivedModeChange('1')}
							title="عرض القضايا المؤرشفة"
						>
							{archiveChipLabel}
						</button>
					)}

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

					<button
						className="icon-btn"
						onClick={() => setIsExportModalOpen(true)}
						title="تصدير القضايا (Excel)"
					>
						<Download size={16} />
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

			{/* تُعلن صراحةً أننا داخل الأرشيف كي لا يظنّ المستخدم أن سجلّاته اختفت */}
			{listCountLabel && <div className="cases-list-caption">{listCountLabel}</div>}

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
						<div className="cases-empty__title">{archiveMode ? 'لا توجد قضايا مؤرشفة' : 'لا توجد قضايا'}</div>
						<div className="cases-empty__desc">
							{archiveMode
								? 'لم تُنقل أي قضية إلى الأرشيف بعد — الأرشفة من زرّ الأرشفة الظاهر مكان رقم الملف في صفّ القضية.'
								: 'جرّب تعديل معايير البحث أو إضافة قضية جديدة'}
						</div>
						{!archiveMode && (
							<button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
								<Plus size={16} /> إضافة قضية
							</button>
						)}
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
							<label style={{ marginInlineStart: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
								عرض
								<select
									value={pageSize}
									onChange={(e) => handlePageSizeChange(Number(e.target.value))}
									title="عدد القضايا المعروضة في الصفحة"
									style={{ padding: '2px 6px', borderRadius: 6, border: '1px solid var(--quiet-gray-200, #e2e8f0)', background: 'var(--dashboard-card, #fff)', color: 'inherit', fontSize: 12, cursor: 'pointer' }}
								>
									{PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
								</select>
								في الصفحة
							</label>
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

			<CasesExportModal
				isOpen={isExportModalOpen}
				onClose={() => setIsExportModalOpen(false)}
				lawyers={lawyers}
				clients={clients}
				najizStatuses={najizStatuses}
			/>

			{accessModal}
		</div >
	);
};

export default Cases;
