import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowRight,
    User,
    Phone,
    FileText,
    Calendar,
    Star,
    Activity,
    Timer,
    ExternalLink
} from 'lucide-react';
import ClientManagementService from '../services/clientManagementService';
import type { Client } from '../services/clientManagementService';
import '../styles/client-detail.css';

interface ClientStats {
    total_cases: number;
    active_cases: number;
    pending_cases: number;
    closed_cases: number;
}

interface UpcomingSession {
    date: string;
    case_id: number;
    case_title: string;
}

interface CaseData {
    id: number;
    title: string;
    case_number: string;
    file_number: string;
    case_type: string;
    status: string;
    najiz_court_name?: string;
    created_at: string;
}

interface ActivityData {
    id: number;
    type: string;
    description: string;
    created_at: string;
    performer?: { id: number; name: string };
    case?: { id: number; title: string; case_number: string };
}

const ClientDetailPage: React.FC = () => {
    const { clientId } = useParams<{ clientId: string }>();
    const navigate = useNavigate();

    const [client, setClient] = useState<Client | null>(null);
    const [statistics, setStatistics] = useState<ClientStats | null>(null);
    const [upcomingSession, setUpcomingSession] = useState<UpcomingSession | null>(null);
    const [cases, setCases] = useState<CaseData[]>([]);
    const [activities, setActivities] = useState<ActivityData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'cases' | 'timeline'>('cases');
    const [rating, setRating] = useState(0);

    useEffect(() => {
        if (clientId) fetchClientData();
    }, [clientId]);

    const fetchClientData = async () => {
        try {
            setLoading(true);
            const detailsResponse = await ClientManagementService.getClientDetails(clientId!);
            setClient(detailsResponse.client);
            setStatistics(detailsResponse.statistics);
            setUpcomingSession(detailsResponse.upcoming_session);

            const casesResponse = await ClientManagementService.getClientCases(clientId!, { per_page: 20 });
            setCases(casesResponse.data?.data || casesResponse.data || []);

            const activitiesResponse = await ClientManagementService.getClientActivities(clientId!, { per_page: 30 });
            setActivities(activitiesResponse.data?.data || activitiesResponse.data || []);
        } catch (error) {
            console.error('Error fetching client data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
        } catch { return '-'; }
    };

    const getCountdown = (dateString: string) => {
        const diff = new Date(dateString).getTime() - Date.now();
        if (diff <= 0) return 'انتهى';
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        return days > 0 ? `${days} يوم` : `${Math.floor(diff / (1000 * 60 * 60))} ساعة`;
    };

    const getStatusClass = (status: string) => {
        return status === 'active' ? 'status--active' : status === 'closed' ? 'status--closed' : 'status--pending';
    };

    const handleRating = async (star: number) => {
        setRating(star);
        try { await ClientManagementService.updateClient(clientId!, { rating: star }); } catch { }
    };

    if (loading) {
        return <div className="client-detail"><div className="loading"><div className="spinner" /></div></div>;
    }

    if (!client) {
        return (
            <div className="client-detail">
                <div className="error-state">
                    <p>العميل غير موجود</p>
                    <button onClick={() => navigate('/clients')}>العودة</button>
                </div>
            </div>
        );
    }

    return (
        <div className="client-detail">
            {/* Compact Header */}
            <header className="client-header">
                <button className="back-link" onClick={() => navigate('/clients')}>
                    <ArrowRight size={16} /> العملاء
                </button>

                <div className="client-info">
                    <div className="client-avatar">{client.name?.charAt(0) || '؟'}</div>
                    <div className="client-main">
                        <h1>{client.name}</h1>
                        <div className="client-meta">
                            {client.national_id && <span><User size={12} />{client.national_id}</span>}
                            {client.phone && <span><Phone size={12} /><span dir="ltr">{client.phone}</span></span>}
                        </div>
                    </div>

                    {/* Inline Stats */}
                    <div className="header-stats">
                        <div className="stat">
                            <span className="stat-value">{statistics?.total_cases || 0}</span>
                            <span className="stat-label">قضية</span>
                        </div>
                        <div className="stat stat--active">
                            <span className="stat-value">{statistics?.active_cases || 0}</span>
                            <span className="stat-label">نشطة</span>
                        </div>
                        {upcomingSession && (
                            <Link to={`/cases/${upcomingSession.case_id}`} className="stat stat--session">
                                <span className="stat-value"><Timer size={14} />{getCountdown(upcomingSession.date)}</span>
                                <span className="stat-label">جلسة قادمة</span>
                            </Link>
                        )}
                    </div>

                    {/* Rating */}
                    <div className="rating">
                        {[1, 2, 3, 4, 5].map(star => (
                            <button key={star} className={star <= rating ? 'active' : ''} onClick={() => handleRating(star)}>
                                <Star size={16} />
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="tabs">
                <button className={activeTab === 'cases' ? 'active' : ''} onClick={() => setActiveTab('cases')}>
                    <FileText size={14} /> القضايا ({cases.length})
                </button>
                <button className={activeTab === 'timeline' ? 'active' : ''} onClick={() => setActiveTab('timeline')}>
                    <Activity size={14} /> النشاطات ({activities.length})
                </button>
            </div>

            {/* Content */}
            <div className="content">
                {activeTab === 'cases' && (
                    cases.length === 0 ? (
                        <div className="empty"><FileText size={32} /><p>لا توجد قضايا مرتبطة</p></div>
                    ) : (
                        <div className="cases-list">
                            {cases.map(c => (
                                <Link key={c.id} to={`/cases/${c.id}`} className="case-item">
                                    <div className="case-main">
                                        <span className="case-number">{c.case_number || c.file_number || '-'}</span>
                                        <span className="case-title">{c.title || 'بدون عنوان'}</span>
                                    </div>
                                    <span className={`case-status ${getStatusClass(c.status)}`}>
                                        {c.status === 'active' ? 'نشطة' : c.status === 'closed' ? 'منتهية' : 'قيد النظر'}
                                    </span>
                                    <span className="case-court">{c.najiz_court_name || '-'}</span>
                                    <span className="case-date">{formatDate(c.created_at)}</span>
                                    <ExternalLink size={14} className="case-link" />
                                </Link>
                            ))}
                        </div>
                    )
                )}

                {activeTab === 'timeline' && (
                    activities.length === 0 ? (
                        <div className="empty"><Activity size={32} /><p>لا توجد نشاطات</p></div>
                    ) : (
                        <div className="timeline">
                            {activities.map(a => (
                                <div key={a.id} className="timeline-item">
                                    <div className="timeline-dot" />
                                    <div className="timeline-content">
                                        <span className="timeline-desc">{a.description}</span>
                                        <span className="timeline-meta">
                                            {a.performer?.name && <span>{a.performer.name}</span>}
                                            <span>{formatDate(a.created_at)}</span>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default ClientDetailPage;
