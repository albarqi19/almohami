import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPhoneDisplay } from '../utils/phone';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'react-toastify';
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
    ArrowUpDown,
    UserPlus,
    Trash2,
    Loader2,
    Swords
} from 'lucide-react';
import ClientManagementService from '../services/clientManagementService';
import type { Client, OpponentRow } from '../services/clientManagementService';
import { useAuth } from '../contexts/AuthContext';
import { usePermission } from '../hooks/usePermission';
import AddClientModal from '../components/AddClientModal';
import OpponentAnalysisModal from '../components/OpponentAnalysisModal';
import ConfirmDialog from '../components/ConfirmDialog';
import ConvertProspectModal from '../components/ConvertProspectModal';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

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
type TabKey = 'clients' | 'prospects' | 'opponents';

const Clients: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState<TabKey>('clients');
    const [oppPage, setOppPage] = useState(1);
    const [selectedOpponent, setSelectedOpponent] = useState<OpponentRow | null>(null);
    const canViewOpponents = usePermission('case-parties.view');
    const [filterPreset, setFilterPreset] = useState<FilterPreset>('all');
    const [sortBy, setSortBy] = useState<SortKey>('created_at');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [showAddModal, setShowAddModal] = useState(false);
    const [deletingClientId, setDeletingClientId] = useState<number | string | null>(null);
    // تأكيد داخل الموقع (بديل window.confirm) للحذف/التحويل
    const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'convert'; client: Client } | null>(null);

    // الحذف (أرشفة) محمي بـ manage.users في الباك (admin/owner/مالك المكتب).
    const canDeleteClients = user?.role === 'admin'
        || user?.role === 'owner'
        || (user as any)?.is_tenant_owner === true;
    // التعديل/التحويل يُفرض بالصلاحية لا باسم الدور (نفس مسار /convert = clients.edit).
    const canEditClients = usePermission('clients.edit');

    // Mutation: أرشفة عميل
    const deleteMutation = useMutation({
        mutationFn: (id: number | string) => ClientManagementService.deleteClient(id),
        onSuccess: () => {
            toast.success('تم أرشفة العميل بنجاح');
            setConfirmAction(null);
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['clients-stats'] });
        },
        onError: (err: any) => {
            toast.error(err?.message || 'تعذّر أرشفة العميل');
        },
        onSettled: () => setDeletingClientId(null),
    });

    const handleDeleteClient = (client: Client, e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmAction({ type: 'delete', client });
    };

    // التحويل متاح لمن يملك clients.edit (مطابق لمسار /convert في الباك).
    const canConvert = canEditClients;
    const [convertingId, setConvertingId] = useState<number | string | null>(null);
    // مودال استكمال بيانات المحتمل (هوية/جوال) عند نقصها قبل التحويل
    const [convertProspect, setConvertProspect] = useState<Client | null>(null);
    const [convertError, setConvertError] = useState<string | null>(null);
    const convertMutation = useMutation({
        mutationFn: (vars: { id: number | string; payload?: { national_id?: string; phone?: string } }) =>
            ClientManagementService.convertToClient(vars.id, vars.payload || {}),
        onSuccess: (data) => {
            toast.success(data?.credentials_sent
                ? 'تم التحويل وإرسال بيانات الدخول عبر واتساب'
                : 'تم تحويل العميل إلى عميل فعلي');
            setConfirmAction(null);
            setConvertProspect(null);
            setConvertError(null);
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['clients-stats'] });
        },
        onError: (err: any, variables) => {
            const msg = err?.errors
                ? Object.values(err.errors).flat().join('\n')
                : (err?.message || 'تعذّر تحويل العميل');
            // أخطاء التحقق (هوية مكررة/جوال) تُعرض داخل مودال الإكمال؛ وإلا toast
            if (variables?.payload && (variables.payload.national_id || variables.payload.phone)) {
                setConvertError(msg);
            } else {
                toast.error(msg);
            }
        },
        onSettled: () => setConvertingId(null),
    });

    // المحتمل المكتمل (هوية + جوال) يُحوَّل مباشرة بتأكيد؛ وإلا يُطلب إكمال البيانات.
    const handleConvert = (client: Client, e: React.MouseEvent) => {
        e.stopPropagation();
        const hasNid = !!(client.national_id && String(client.national_id).trim());
        const hasPhone = !!(client.phone && String(client.phone).trim());
        if (hasNid && hasPhone) {
            setConfirmAction({ type: 'convert', client });
        } else {
            setConvertError(null);
            setConvertProspect(client);
        }
    };

    // تنفيذ الإجراء المؤكَّد من مودال التأكيد
    const runConfirm = () => {
        if (!confirmAction) return;
        const { type, client } = confirmAction;
        if (type === 'delete') {
            setDeletingClientId(client.id);
            deleteMutation.mutate(client.id);
        } else {
            setConvertingId(client.id);
            convertMutation.mutate({ id: client.id, payload: {} });
        }
    };

    // Debounce search query
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset to page 1 when search changes
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Reset to page 1 when tab/filter/sort changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, filterPreset, sortBy, sortOrder]);

    // البحث مستقل لكل تبويب: يُصفَّر عند تبديل التبويب (البند 8) كي لا يُرشِّح تبويباً بكلمة تبويب آخر.
    React.useEffect(() => {
        setSearchQuery('');
    }, [activeTab]);

    // التبويب → فلتر الحالة في الباك (الخصوم لها مصدر منفصل — المرحلة 7)
    const statusParam: 'client' | 'prospect' | undefined =
        activeTab === 'clients' ? 'client' : activeTab === 'prospects' ? 'prospect' : undefined;

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
        queryKey: ['clients', activeTab, currentPage, debouncedSearch, filterPreset, sortBy, sortOrder],
        queryFn: async () => {
            const response = await ClientManagementService.getClients({
                page: currentPage,
                per_page: 15,
                status: statusParam,
                search: debouncedSearch || undefined,
                sort_by: sortBy,
                sort_order: sortOrder,
                ...queryFilterParams,
            });
            return response as PaginatedClientsResponse;
        },
        placeholderData: keepPreviousData,
        staleTime: 30 * 1000,
        enabled: activeTab !== 'opponents', // الخصوم تُجلب من endpoint منفصل (المرحلة 7)
    });

    // Aggregate stats — independent of pagination, used for the filter pills.
    const { data: statsData } = useQuery({
        queryKey: ['clients-stats'],
        queryFn: () => ClientManagementService.getClientStats(),
        staleTime: 60 * 1000,
    });

    // الخصوم — يُجلب فقط عند نشاط التبويب (endpoint مستقل بصلاحية case-parties.view)
    const {
        data: opponentsData,
        isLoading: opponentsLoading,
        isFetching: opponentsFetching,
        refetch: refetchOpponents,
    } = useQuery({
        queryKey: ['opponents', oppPage, debouncedSearch],
        queryFn: () => ClientManagementService.getOpponents({ page: oppPage, per_page: 15, search: debouncedSearch || undefined }),
        enabled: activeTab === 'opponents' && canViewOpponents,
        placeholderData: keepPreviousData,
        staleTime: 30 * 1000,
    });
    const opponents: OpponentRow[] = opponentsData?.data || [];
    const opponentsTotal = opponentsData?.total || 0;
    const opponentsTotalPages = opponentsData?.last_page || 1;

    // إعادة الصفحة 1 عند تغيير البحث/التبويب للخصوم
    React.useEffect(() => { setOppPage(1); }, [debouncedSearch, activeTab]);

    const clients = paginatedData?.data || [];
    const totalPages = paginatedData?.last_page || 1;
    const totalClients = paginatedData?.total || 0;

    // Aggregate stats from the dedicated endpoint (full tenant, not page-bound).
    const stats = {
        total: statsData?.total ?? 0,
        clients: statsData?.clients ?? 0,
        prospects: statsData?.prospects ?? 0,
        withCases: statsData?.withCases ?? 0,
        vip: statsData?.vip ?? 0,
        withoutPhone: statsData?.withoutPhone ?? 0,
        opponents: statsData?.opponents ?? 0,
    };

    // عمود الإجراءات يظهر لو كان هناك إجراء فعلي: حذف (admin/owner) أو تحويل (محتملون + clients.edit).
    const showActions = canDeleteClients || (activeTab === 'prospects' && canConvert);

    const handleClientClick = (clientId: number) => {
        navigate(`/clients/${clientId}`);
    };

    // تحديث التبويب النشط فقط (الخصوم لها استعلام منفصل — البند 7).
    const handleRefresh = () => {
        if (activeTab === 'opponents') refetchOpponents();
        else refetch();
    };
    const refreshBusy = activeTab === 'opponents' ? opponentsFetching : isFetching;

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
        const cases = (client as any).total_cases_count ?? (client as any).client_cases_count ?? 0;
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

    const tabs: Array<{ key: TabKey; label: string; count?: number }> = [
        { key: 'clients', label: 'العملاء', count: stats.clients },
        { key: 'prospects', label: 'العملاء المحتملون', count: stats.prospects },
        // تبويب الخصوم يظهر فقط لمن يملك صلاحية case-parties.view؛ العدّاد مُحمَّل مسبقاً
        // من الإحصاءات (البند 10)، ويُحدَّث للقيمة الحيّة عند فتح التبويب.
        ...(canViewOpponents
            ? [{ key: 'opponents' as TabKey, label: 'الخصوم', count: activeTab === 'opponents' && opponentsTotal ? opponentsTotal : stats.opponents }]
            : []),
    ];
    const tabBtnStyle = (active: boolean): React.CSSProperties => ({
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', fontSize: 13, fontWeight: 600,
        border: '1px solid var(--quiet-gray-200, #e5e7eb)',
        borderBottom: active ? '2px solid var(--law-navy, #1E3A5F)' : '1px solid var(--quiet-gray-200, #e5e7eb)',
        borderRadius: '8px 8px 0 0',
        background: active ? 'var(--dashboard-card, #fff)' : 'transparent',
        color: active ? 'var(--law-navy, #1E3A5F)' : 'var(--color-text-secondary, #64748b)',
        cursor: 'pointer', whiteSpace: 'nowrap',
    });

    return (
        <div className="clients-page">
            {/* Tabs — العملاء / المحتملون / الخصوم */}
            <div className="clients-tabs" style={{ display: 'flex', gap: 4, padding: '12px 16px 0', flexWrap: 'wrap', borderBottom: '1px solid var(--quiet-gray-200, #e5e7eb)' }}>
                {tabs.map(t => (
                    <button key={t.key} type="button" onClick={() => setActiveTab(t.key)} style={tabBtnStyle(activeTab === t.key)}>
                        {t.label}
                        {t.count != null && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: activeTab === t.key ? 'var(--law-navy, #1E3A5F)' : 'var(--quiet-gray-100, #f1f5f9)', color: activeTab === t.key ? '#fff' : 'var(--color-text-secondary, #64748b)' }}>
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Header Bar — title + search + filter pills + refresh */}
            <div className="clients-header-bar">
                <div className="clients-header-bar__start">
                    <div className="clients-header-bar__title">
                        <Users size={20} />
                        {activeTab === 'prospects' ? 'العملاء المحتملون' : activeTab === 'opponents' ? 'الخصوم' : 'العملاء'}
                    </div>
                    <span className="clients-header-bar__count">
                        {activeTab === 'opponents'
                            ? `${opponentsTotal} خصم`
                            : `${totalClients} ${activeTab === 'prospects' ? 'محتمل' : 'عميل'}`}
                    </span>
                </div>

                <div className="search-box">
                    <Search size={14} />
                    <input
                        type="text"
                        placeholder={activeTab === 'opponents' ? 'بحث باسم الخصم أو هويته...' : 'بحث بالاسم أو رقم الهوية...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="search-box__clear" onClick={() => setSearchQuery('')} title="مسح">
                            <X size={12} />
                        </button>
                    )}
                </div>

                {activeTab !== 'opponents' && (
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
                )}

                <div className="clients-header-bar__end" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {activeTab !== 'opponents' && (
                    <button
                        type="button"
                        onClick={() => setShowAddModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 14px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'white',
                            backgroundColor: 'var(--color-primary)',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <UserPlus size={14} />
                        {activeTab === 'prospects' ? 'إضافة محتمل' : 'إضافة عميل'}
                    </button>
                    )}
                    <button
                        className={`icon-btn ${refreshBusy ? 'spinning' : ''}`}
                        onClick={handleRefresh}
                        title="تحديث"
                        disabled={refreshBusy}
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Add Client Modal */}
            <AddClientModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onCreated={() => { refetch(); queryClient.invalidateQueries({ queryKey: ['clients-stats'] }); }}
                defaultStatus={activeTab === 'prospects' ? 'prospect' : 'client'}
            />

            {/* بطاقة تحليل الخصم */}
            <OpponentAnalysisModal opponent={selectedOpponent} onClose={() => setSelectedOpponent(null)} />

            {/* تأكيد الحذف/التحويل داخل الموقع (بديل window.confirm) */}
            <ConfirmDialog
                isOpen={confirmAction !== null}
                variant={confirmAction?.type === 'delete' ? 'danger' : 'primary'}
                title={confirmAction?.type === 'delete' ? 'تأكيد أرشفة العميل' : 'تأكيد تحويل العميل'}
                message={
                    confirmAction?.type === 'delete'
                        ? <>هل تريد أرشفة العميل <strong>{confirmAction?.client.name}</strong>؟</>
                        : <>تحويل <strong>{confirmAction?.client.name}</strong> من عميل محتمل إلى عميل فعلي؟</>
                }
                note={
                    confirmAction?.type === 'delete'
                        ? 'سيختفي من القائمة الافتراضية لكن بياناته تبقى محفوظة ويمكن استرجاعه لاحقاً.'
                        : 'سيُحتسب ضمن العملاء الفعليين. يمكن إرسال بيانات الدخول له لاحقاً.'
                }
                confirmLabel={confirmAction?.type === 'delete' ? 'أرشفة' : 'تحويل'}
                loading={deleteMutation.isPending || convertMutation.isPending}
                onConfirm={runConfirm}
                onClose={() => setConfirmAction(null)}
            />

            {/* استكمال بيانات المحتمل (هوية/جوال) قبل التحويل */}
            <ConvertProspectModal
                client={convertProspect}
                submitting={convertMutation.isPending}
                errorMessage={convertError}
                onSubmit={(payload) => {
                    if (!convertProspect) return;
                    setConvertingId(convertProspect.id);
                    setConvertError(null);
                    convertMutation.mutate({ id: convertProspect.id, payload });
                }}
                onClose={() => { setConvertProspect(null); setConvertError(null); }}
            />

            {/* Content */}
            <div className="clients-content">
                {activeTab === 'opponents' ? (
                    opponentsLoading ? (
                        <div className="clients-loading">
                            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton-row" />)}
                        </div>
                    ) : opponents.length === 0 ? (
                        <div className="clients-empty">
                            <Swords size={48} className="clients-empty__icon" />
                            <h3 className="clients-empty__title">لا يوجد خصوم</h3>
                            <p className="clients-empty__desc">
                                {searchQuery ? 'لم يتم العثور على نتائج للبحث' : 'يظهر هنا الطرف المقابل في قضايا موكّليك'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="clients-table-wrapper">
                                {opponentsFetching && (
                                    <div className="table-loading-overlay"><RefreshCw size={24} className="spinning" /></div>
                                )}
                                <table className="clients-table">
                                    <thead>
                                        <tr>
                                            <th className="col-num">#</th>
                                            <th>اسم الخصم</th>
                                            <th>الهوية / السجل</th>
                                            <th className="col-num">عدد القضايا</th>
                                            <th style={{ width: 70, textAlign: 'center' }}>تحليل</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {opponents.map((o, idx) => (
                                            <tr
                                                key={o.identity_key}
                                                onClick={() => setSelectedOpponent(o)}
                                                style={{ cursor: 'pointer' }}
                                                className={o.client_user_id ? 'opponent-row--client' : undefined}
                                                title={o.client_user_id ? 'هذا الخصم عميل لدينا أيضاً — تعارض مصالح محتمل' : undefined}
                                            >
                                                <td className="col-num">{(oppPage - 1) * 15 + idx + 1}</td>
                                                <td>
                                                    <span className="client-name">{o.name || '—'}</span>
                                                    {o.client_user_id && (
                                                        <span
                                                            className="opponent-client-badge"
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/clients/${o.client_user_id}`); }}
                                                            title="فتح ملفه كعميل"
                                                        >
                                                            عميل لدينا
                                                        </span>
                                                    )}
                                                </td>
                                                <td><span className="client-id-badge" dir="ltr">{o.national_id || o.commercial_reg || '—'}</span></td>
                                                <td className="col-num">
                                                    <span className="cases-count"><FileText size={12} />{o.cases_count}</span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); setSelectedOpponent(o); }}
                                                        title="تحليل الخصم"
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                            width: 28, height: 28, padding: 0, borderRadius: 6,
                                                            border: '1px solid var(--quiet-gray-200, #e5e7eb)',
                                                            background: 'var(--dashboard-card, #fff)', color: 'var(--law-navy, #1E3A5F)', cursor: 'pointer',
                                                        }}
                                                    >
                                                        <Swords size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {opponentsTotalPages > 1 && (
                                <div className="clients-pagination">
                                    <div className="clients-pagination__info">صفحة {oppPage} من {opponentsTotalPages}</div>
                                    <div className="clients-pagination__controls">
                                        <button className="pagination-btn" onClick={() => setOppPage((p) => Math.max(1, p - 1))} disabled={oppPage === 1 || opponentsFetching}>
                                            <ChevronRight size={16} /> السابق
                                        </button>
                                        <button className="pagination-btn" onClick={() => setOppPage((p) => Math.min(opponentsTotalPages, p + 1))} disabled={oppPage === opponentsTotalPages || opponentsFetching}>
                                            التالي <ChevronLeft size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )
                ) : loading ? (
                    <div className="clients-loading">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="skeleton-row" />
                        ))}
                    </div>
                ) : clients.length === 0 ? (
                    <div className="clients-empty">
                        <Users size={48} className="clients-empty__icon" />
                        <h3 className="clients-empty__title">{activeTab === 'prospects' ? 'لا يوجد عملاء محتملون' : 'لا يوجد عملاء'}</h3>
                        <p className="clients-empty__desc">
                            {searchQuery
                                ? 'لم يتم العثور على نتائج للبحث'
                                : activeTab === 'prospects'
                                    ? 'العميل المحتمل هو من ليس له قضية أو مدير حساب بعد'
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
                                        {showActions && <th style={{ width: 60, textAlign: 'center' }}>إجراءات</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {clients.map((client, idx) => {
                                        // العدّ الموحّد (رئيسي + إضافي) من الباك، مع ارتداد للرئيسي
                                        const casesCount = (client as any).total_cases_count
                                            ?? (client as any).client_cases_count ?? 0;
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
                                                            <span dir="ltr">{formatPhoneDisplay(client.phone)}</span>
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
                                                {showActions && (
                                                    <td style={{ textAlign: 'center' }}>
                                                      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                                                        {activeTab === 'prospects' && canConvert && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleConvert(client, e)}
                                                                disabled={convertingId === client.id}
                                                                title="تحويل إلى عميل فعلي"
                                                                style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                                    height: 28, padding: '0 9px',
                                                                    border: '1px solid var(--quiet-gray-200, #e5e7eb)',
                                                                    background: 'var(--color-primary-soft, #eff6ff)',
                                                                    color: 'var(--color-primary, #2563eb)',
                                                                    borderRadius: 6, fontSize: 11, fontWeight: 600,
                                                                    cursor: convertingId === client.id ? 'not-allowed' : 'pointer',
                                                                    opacity: convertingId === client.id ? 0.5 : 1,
                                                                }}
                                                            >
                                                                {convertingId === client.id
                                                                    ? <Loader2 size={12} className="spinning" />
                                                                    : <UserPlus size={12} />}
                                                                تحويل
                                                            </button>
                                                        )}
                                                        {canDeleteClients && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDeleteClient(client, e)}
                                                            disabled={deletingClientId === client.id}
                                                            title="أرشفة العميل"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: 28,
                                                                height: 28,
                                                                padding: 0,
                                                                border: '1px solid var(--status-red-soft-border, #fee2e2)',
                                                                background: 'var(--dashboard-card, #fff)',
                                                                color: 'var(--status-red, #dc2626)',
                                                                borderRadius: 6,
                                                                cursor: deletingClientId === client.id ? 'not-allowed' : 'pointer',
                                                                opacity: deletingClientId === client.id ? 0.5 : 1,
                                                                transition: 'background 0.15s, border-color 0.15s',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (deletingClientId !== client.id) {
                                                                    e.currentTarget.style.background = 'var(--status-red-soft, #fef2f2)';
                                                                    e.currentTarget.style.borderColor = 'var(--status-red, #fca5a5)';
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = 'var(--dashboard-card, #fff)';
                                                                e.currentTarget.style.borderColor = 'var(--status-red-soft-border, #fee2e2)';
                                                            }}
                                                        >
                                                            {deletingClientId === client.id
                                                                ? <Loader2 size={13} className="spinning" />
                                                                : <Trash2 size={13} />}
                                                        </button>
                                                        )}
                                                      </div>
                                                    </td>
                                                )}
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
