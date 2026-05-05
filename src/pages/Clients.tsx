import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
    Users,
    Search,
    Phone,
    PhoneOff,
    FileText,
    Crown,
    Star,
    Building2,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    X,
    ArrowUp,
    ArrowDown,
    ArrowUpDown
} from 'lucide-react';
import ClientManagementService from '../services/clientManagementService';
import type { Client } from '../services/clientManagementService';
import '../styles/clients-page.css';

// Pagination response type
interface PaginatedClientsResponse {
    data: Client[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
}

type FilterPreset = 'all' | 'with_cases' | 'no_phone' | 'vip';
type SortKey = 'name' | 'created_at' | 'cases_count' | 'entity_type' | 'phone';
type SortOrder = 'asc' | 'desc';

const Clients: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [filterPreset, setFilterPreset] = useState<FilterPreset>('all');
    const [sortBy, setSortBy] = useState<SortKey>('created_at');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // Debounce search query
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset to page 1 when search changes
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Reset to page 1 when filter/sort changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [filterPreset, sortBy, sortOrder]);

    // Toggle sort: first click → asc, second → desc, third → reset to default.
    const handleSort = (key: SortKey) => {
        if (sortBy !== key) {
            setSortBy(key);
            setSortOrder('asc');
            return;
        }
        if (sortOrder === 'asc') {
            setSortOrder('desc');
        } else {
            // Reset to default
            setSortBy('created_at');
            setSortOrder('desc');
        }
    };

    const sortIndicator = (key: SortKey) => {
        if (sortBy !== key) return <ArrowUpDown size={11} className="sort-icon sort-icon--idle" />;
        return sortOrder === 'asc'
            ? <ArrowUp size={11} className="sort-icon sort-icon--active" />
            : <ArrowDown size={11} className="sort-icon sort-icon--active" />;
    };

    // Translate UI filter preset → backend params
    const queryFilterParams: { without_phone?: boolean; preset?: 'with_cases' | 'vip' } = {};
    if (filterPreset === 'no_phone') queryFilterParams.without_phone = true;
    else if (filterPreset === 'with_cases') queryFilterParams.preset = 'with_cases';
    else if (filterPreset === 'vip') queryFilterParams.preset = 'vip';

    // TanStack Query with caching and keepPreviousData
    const {
        data: paginatedData,
        isLoading: loading,
        isFetching,
        refetch
    } = useQuery<PaginatedClientsResponse>({
        queryKey: ['clients', currentPage, debouncedSearch, filterPreset, sortBy, sortOrder],
        queryFn: async () => {
            const response = await ClientManagementService.getClients({
                page: currentPage,
                per_page: 15,
                search: debouncedSearch || undefined,
                sort_by: sortBy,
                sort_order: sortOrder,
                ...queryFilterParams,
            });
            return response as PaginatedClientsResponse;
        },
        placeholderData: keepPreviousData,
        staleTime: 30 * 1000,
    });

    // Aggregate stats — independent of pagination, used for the filter pills.
    const { data: statsData } = useQuery({
        queryKey: ['clients-stats'],
        queryFn: () => ClientManagementService.getClientStats(),
        staleTime: 60 * 1000,
    });

    const clients = paginatedData?.data || [];
    const totalPages = paginatedData?.last_page || 1;
    const totalClients = paginatedData?.total || 0;

    // Aggregate stats from the dedicated endpoint (full tenant, not page-bound).
    const stats = {
        total: statsData?.total ?? 0,
        withCases: statsData?.withCases ?? 0,
        vip: statsData?.vip ?? 0,
        withoutPhone: statsData?.withoutPhone ?? 0,
    };

    const handleClientClick = (clientId: number) => {
        navigate(`/clients/${clientId}`);
    };

    const handleRefresh = () => {
        refetch();
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '—';
        try {
            return new Date(dateString).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return '—';
        }
    };

    const getClientClassificationBadge = (client: Client) => {
        // Prefer the explicit user-set classification when present.
        const explicit = (client as any).classification as string | undefined;
        const cases = (client as any).client_cases_count || 0;
        if (explicit === 'vip' || cases >= 5) {
            return (<span className="client-badge client-badge--vip"><Crown size={11} />VIP</span>);
        }
        if (explicit === 'regular' || cases >= 2) {
            return (<span className="client-badge client-badge--regular"><Star size={11} />دائم</span>);
        }
        if (explicit === 'one_time' || cases === 1) {
            return (<span className="client-badge client-badge--once">جديد</span>);
        }
        return <span className="client-badge client-badge--none">—</span>;
    };

    const getEntityBadge = (entity?: string | null) => {
        const isCompany = entity === 'company' || entity === 'organization';
        return (
            <span className={`entity-badge ${isCompany ? 'entity-badge--company' : 'entity-badge--individual'}`}>
                {isCompany ? <Building2 size={11} /> : <Users size={11} />}
                {entity === 'organization' ? 'مؤسسة' : isCompany ? 'شركة' : 'فرد'}
            </span>
        );
    };

    return (
        <div className="clients-page">
            {/* Header Bar — title + search + filter pills + refresh */}
            <div className="clients-header-bar">
                <div className="clients-header-bar__start">
                    <div className="clients-header-bar__title">
                        <Users size={20} />
                        العملاء
                    </div>
                    <span className="clients-header-bar__count">{totalClients} عميل</span>
                </div>

                <div className="search-box">
                    <Search size={14} />
                    <input
                        type="text"
                        placeholder="بحث بالاسم أو رقم الهوية..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="search-box__clear" onClick={() => setSearchQuery('')} title="مسح">
                            <X size={12} />
                        </button>
                    )}
                </div>

                <div className="clients-header-bar__pills">
                    <button
                        className={`clients-pill ${filterPreset === 'all' ? 'is-active' : ''}`}
                        onClick={() => setFilterPreset('all')}
                    >
                        الكل <span className="clients-pill__count">{stats.total}</span>
                    </button>
                    <button
                        className={`clients-pill ${filterPreset === 'with_cases' ? 'is-active' : ''}`}
                        onClick={() => setFilterPreset('with_cases')}
                    >
                        لديهم قضايا <span className="clients-pill__count">{stats.withCases}</span>
                    </button>
                    <button
                        className={`clients-pill ${filterPreset === 'vip' ? 'is-active' : ''}`}
                        onClick={() => setFilterPreset('vip')}
                    >
                        VIP <span className="clients-pill__count">{stats.vip}</span>
                    </button>
                    <button
                        className={`clients-pill clients-pill--warn ${filterPreset === 'no_phone' ? 'is-active' : ''}`}
                        onClick={() => setFilterPreset('no_phone')}
                    >
                        بدون جوال <span className="clients-pill__count">{stats.withoutPhone}</span>
                    </button>
                </div>

                <div className="clients-header-bar__end">
                    <button
                        className={`icon-btn ${isFetching ? 'spinning' : ''}`}
                        onClick={handleRefresh}
                        title="تحديث"
                        disabled={isFetching}
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="clients-content">
                {loading ? (
                    <div className="clients-loading">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="skeleton-row" />
                        ))}
                    </div>
                ) : clients.length === 0 ? (
                    <div className="clients-empty">
                        <Users size={48} className="clients-empty__icon" />
                        <h3 className="clients-empty__title">لا يوجد عملاء</h3>
                        <p className="clients-empty__desc">
                            {searchQuery
                                ? 'لم يتم العثور على نتائج للبحث'
                                : 'سيظهر العملاء هنا عند إضافتهم للقضايا'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="clients-table-wrapper">
                            {/* Loading overlay while fetching new page */}
                            {isFetching && (
                                <div className="table-loading-overlay">
                                    <RefreshCw size={24} className="spinning" />
                                </div>
                            )}
                            <table className="clients-table">
                                <thead>
                                    <tr>
                                        <th className="col-num">#</th>
                                        <th className="col-sortable" onClick={() => handleSort('name')}>
                                            <span>اسم العميل</span>
                                            {sortIndicator('name')}
                                        </th>
                                        <th className="col-sortable" onClick={() => handleSort('entity_type')}>
                                            <span>النوع</span>
                                            {sortIndicator('entity_type')}
                                        </th>
                                        <th>رقم الهوية</th>
                                        <th>رقم الجوال</th>
                                        <th className="col-num col-sortable" onClick={() => handleSort('cases_count')}>
                                            <span>القضايا</span>
                                            {sortIndicator('cases_count')}
                                        </th>
                                        <th>التصنيف</th>
                                        <th className="col-sortable" onClick={() => handleSort('created_at')}>
                                            <span>تاريخ التسجيل</span>
                                            {sortIndicator('created_at')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clients.map((client, idx) => {
                                        const casesCount = (client as any).client_cases_count || 0;
                                        const rowNum = (currentPage - 1) * 15 + idx + 1;
                                        return (
                                            <tr key={client.id} onClick={() => handleClientClick(client.id)}>
                                                <td className="col-num">{rowNum}</td>
                                                <td>
                                                    <span className="client-name">{client.name || '—'}</span>
                                                </td>
                                                <td>{getEntityBadge(client.entity_type)}</td>
                                                <td>
                                                    <span className="client-id-badge">
                                                        {client.national_id || '—'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {client.phone ? (
                                                        <span className="client-phone">
                                                            <Phone size={12} />
                                                            <span dir="ltr">{client.phone}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="client-phone client-phone--missing">
                                                            <PhoneOff size={12} /> بدون رقم
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="col-num">
                                                    {casesCount > 0 ? (
                                                        <span className="cases-count">
                                                            <FileText size={12} />
                                                            {casesCount}
                                                        </span>
                                                    ) : (
                                                        <span className="cases-count cases-count--zero">0</span>
                                                    )}
                                                </td>
                                                <td>{getClientClassificationBadge(client)}</td>
                                                <td>
                                                    <span className="date-cell">{formatDate(client.created_at)}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="clients-pagination">
                                <div className="clients-pagination__info">
                                    صفحة {currentPage} من {totalPages}
                                </div>
                                <div className="clients-pagination__controls">
                                    <button
                                        className="pagination-btn"
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1 || isFetching}
                                    >
                                        <ChevronRight size={16} />
                                        السابق
                                    </button>
                                    <button
                                        className="pagination-btn"
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages || isFetching}
                                    >
                                        التالي
                                        <ChevronLeft size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Clients;
