import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Search,
    Phone,
    FileText,
    Clock,
    Star,
    Crown,
    RefreshCw,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import ClientManagementService from '../services/clientManagementService';
import type { Client } from '../services/clientManagementService';
import '../styles/clients-page.css';

const Clients: React.FC = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalClients, setTotalClients] = useState(0);

    const fetchClients = async (page = 1, search = '') => {
        try {
            setLoading(true);
            const response = await ClientManagementService.getClients({
                page,
                per_page: 15,
                search: search || undefined,
            });

            // Laravel paginate response structure: { data: { data: [...], current_page, last_page, total } }
            const paginatedData = response.data;
            if (paginatedData && paginatedData.data) {
                // Nested pagination response
                setClients(paginatedData.data || []);
                setTotalPages(paginatedData.last_page || 1);
                setTotalClients(paginatedData.total || 0);
            } else if (Array.isArray(paginatedData)) {
                // Direct array response
                setClients(paginatedData);
                setTotalClients(paginatedData.length);
            } else {
                setClients([]);
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients(currentPage, searchQuery);
    }, [currentPage]);

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            setCurrentPage(1);
            fetchClients(1, searchQuery);
        }, 300);
        return () => clearTimeout(delaySearch);
    }, [searchQuery]);

    const handleClientClick = (clientId: number) => {
        navigate(`/clients/${clientId}`);
    };

    const handleRefresh = () => {
        fetchClients(currentPage, searchQuery);
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return '-';
        }
    };

    const getClientClassificationBadge = (casesCount: number) => {
        if (casesCount >= 5) {
            return (
                <span className="client-badge client-badge--vip">
                    <Crown size={12} />
                    عميل VIP
                </span>
            );
        } else if (casesCount >= 2) {
            return (
                <span className="client-badge client-badge--regular">
                    <Star size={12} />
                    عميل دائم
                </span>
            );
        }
        return null;
    };

    return (
        <div className="clients-page">
            {/* Header Bar */}
            <div className="clients-header-bar">
                <div className="clients-header-bar__start">
                    <div className="clients-header-bar__title">
                        <Users size={22} />
                        العملاء
                    </div>
                    <span className="clients-header-bar__count">{totalClients} عميل</span>
                </div>

                <div className="clients-header-bar__center">
                    <div className="search-box">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="بحث بالاسم أو رقم الهوية..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="clients-header-bar__end">
                    <button className="icon-btn" onClick={handleRefresh} title="تحديث">
                        <RefreshCw size={18} />
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
                            <table className="clients-table">
                                <thead>
                                    <tr>
                                        <th>اسم العميل</th>
                                        <th>رقم الهوية</th>
                                        <th>رقم الجوال</th>
                                        <th>عدد القضايا</th>
                                        <th>التصنيف</th>
                                        <th>تاريخ التسجيل</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clients.map((client) => (
                                        <tr
                                            key={client.id}
                                            onClick={() => handleClientClick(client.id)}
                                        >
                                            <td>
                                                <div className="client-name-cell">
                                                    <div className="client-avatar">
                                                        {client.name?.charAt(0) || '؟'}
                                                    </div>
                                                    <span className="client-name">{client.name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="client-id-badge">
                                                    {client.national_id || '-'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="client-phone">
                                                    {client.phone ? (
                                                        <>
                                                            <Phone size={14} />
                                                            <span dir="ltr">{client.phone}</span>
                                                        </>
                                                    ) : (
                                                        <span className="no-phone">بدون رقم</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="cases-count">
                                                    <FileText size={14} />
                                                    <span>{(client as any).client_cases_count || 0} قضية</span>
                                                </div>
                                            </td>
                                            <td>
                                                {getClientClassificationBadge((client as any).client_cases_count || 0)}
                                            </td>
                                            <td>
                                                <div className="date-cell">
                                                    <Clock size={14} />
                                                    {formatDate(client.created_at)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
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
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronRight size={16} />
                                        السابق
                                    </button>
                                    <button
                                        className="pagination-btn"
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
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
