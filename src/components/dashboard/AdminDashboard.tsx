import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    RefreshCw,
    FileText,
    CheckSquare,
    AlertTriangle,
    Upload,
    Search,
    Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/dashboard-theme.css';
import '../../styles/welcome-modal.css';

// Import Widgets
import DashboardWidget from './DashboardWidget';
import CasesListWidget from './widgets/CasesListWidget';
import SessionsWidget from './widgets/SessionsWidget';
import ActivityFeedWidget from './widgets/ActivityFeedWidget';
import WelcomeModal from '../WelcomeModal';

// Import Dashboard Service
import { DashboardService } from '../../services/dashboardService';
import type { DashboardStats, RecentCase, UpcomingSession, RecentActivity } from '../../services/dashboardService';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { apiClient } from '../../utils/api';

// Cache keys
const CACHE_KEYS = {
    DASHBOARD_DATA: 'dashboard_data_v2',
    DASHBOARD_TIMESTAMP: 'dashboard_timestamp_v2'
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

interface DashboardData {
    stats: DashboardStats;
    recentCases: RecentCase[];
    upcomingSessions: UpcomingSession[];
    recentActivities: RecentActivity[];
}

const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);

    // Dashboard data state
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEYS.DASHBOARD_DATA);
            const timestamp = localStorage.getItem(CACHE_KEYS.DASHBOARD_TIMESTAMP);
            if (cached && timestamp) {
                const age = Date.now() - parseInt(timestamp, 10);
                if (age < CACHE_DURATION) {
                    return JSON.parse(cached);
                }
            }
        } catch (e) {
            console.error('Cache read error:', e);
        }
        return null;
    });

    // Load dashboard data
    const loadDashboardData = useCallback(async (forceRefresh: boolean = false) => {
        // Check cache first if not forcing refresh
        if (!forceRefresh && dashboardData) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // جلب كل البيانات بالتوازي
            const [stats, recentCases, upcomingSessions, recentActivities] = await Promise.all([
                DashboardService.getStats(),
                DashboardService.getRecentCases(5),
                DashboardService.getUpcomingSessions(5),
                DashboardService.getRecentActivities(10)
            ]);

            const newData: DashboardData = {
                stats,
                recentCases,
                upcomingSessions,
                recentActivities
            };

            setDashboardData(newData);

            // Save to cache
            localStorage.setItem(CACHE_KEYS.DASHBOARD_DATA, JSON.stringify(newData));
            localStorage.setItem(CACHE_KEYS.DASHBOARD_TIMESTAMP, Date.now().toString());

        } catch (err) {
            console.error('Failed to load dashboard data:', err);
            setError('فشل في تحميل بيانات لوحة التحكم');
        } finally {
            setIsLoading(false);
        }
    }, [dashboardData]);

    // Initial load
    useEffect(() => {
        loadDashboardData();
    }, []);

    // Check if we should show welcome modal for tenant owner
    useEffect(() => {
        if (user?.is_tenant_owner) {
            // Check both API (welcome_shown_at) and localStorage as fallback
            const hasSeenWelcomeInDB = !!user.welcome_shown_at;
            const hasSeenWelcomeLocally = localStorage.getItem(`welcome_modal_shown_${user.id}`);

            if (!hasSeenWelcomeInDB && !hasSeenWelcomeLocally) {
                // Delay showing modal to let dashboard load first
                const timer = setTimeout(() => {
                    setShowWelcomeModal(true);
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [user]);

    // Handle welcome modal close
    const handleWelcomeModalClose = async () => {
        setShowWelcomeModal(false);

        if (user?.id) {
            // Save locally first for immediate effect
            localStorage.setItem(`welcome_modal_shown_${user.id}`, 'true');

            // Then save to API
            try {
                await apiClient.post('/auth/welcome-shown');
            } catch (error) {
                console.error('Failed to mark welcome as shown:', error);
                // Local storage already saved, so user won't see modal again on this device
            }
        }
    };

    // تحديث تلقائي عند العودة للصفحة وكل دقيقة
    useAutoRefresh({
        onRefresh: () => loadDashboardData(true),
        refetchOnFocus: true,
        pollingInterval: 60, // كل دقيقة
    });

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'صباح الخير';
        return 'مساء الخير';
    };

    const formatDate = () => {
        return new Intl.DateTimeFormat('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date());
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        localStorage.removeItem(CACHE_KEYS.DASHBOARD_DATA);
        localStorage.removeItem(CACHE_KEYS.DASHBOARD_TIMESTAMP);
        await loadDashboardData(true);
        setIsRefreshing(false);
    };

    const handleStatClick = (type: string) => {
        const routes: Record<string, string> = {
            cases: '/cases',
            tasks: '/tasks',
            sessions: '/sessions',
            active: '/cases?status=active'
        };
        if (routes[type]) navigate(routes[type]);
    };

    // Quick Actions
    const quickActions = [
        { id: 'new-case', icon: <FileText size={18} />, label: 'قضية جديدة', color: 'var(--law-navy)', href: '/cases' },
        { id: 'new-task', icon: <CheckSquare size={18} />, label: 'مهمة', color: 'var(--status-green)', href: '/tasks' },
        { id: 'upload-doc', icon: <Upload size={18} />, label: 'وثيقة', color: 'var(--clickup-pink)', href: '/documents' },
        { id: 'search', icon: <Search size={18} />, label: 'بحث', color: 'var(--status-blue)' },
    ];

    // Stats cards from API data
    const stats = dashboardData?.stats;
    const statsCards = [
        {
            id: 'cases',
            label: 'قضايا نشطة',
            value: stats?.active_cases ?? 0,
            total: stats?.total_cases ?? 0,
            icon: <FileText size={18} />,
            color: 'var(--law-navy)',
            bgColor: 'var(--law-navy-light)'
        },
        {
            id: 'tasks',
            label: 'مهام مكتملة',
            value: stats?.completed_tasks ?? 0,
            total: stats?.total_tasks ?? 0,
            icon: <CheckSquare size={18} />,
            color: 'var(--status-green)',
            bgColor: 'var(--status-green-light)'
        },
        {
            id: 'sessions',
            label: 'جلسات قادمة',
            value: stats?.upcoming_sessions ?? 0,
            icon: <Calendar size={18} />,
            color: 'var(--status-orange)',
            bgColor: 'var(--status-orange-light)'
        },
        {
            id: 'active',
            label: 'تحتاج متابعة',
            value: stats?.urgent_items ?? 0,
            icon: <AlertTriangle size={18} />,
            color: 'var(--status-red)',
            bgColor: 'var(--status-red-light)'
        },
    ];

    // Loading state
    if (isLoading && !dashboardData) {
        return (
            <div className="dashboard-container" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                gap: '16px'
            }}>
                <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--law-navy)' }} />
                <p style={{ color: 'var(--color-text-secondary)' }}>جاري تحميل لوحة التحكم...</p>
            </div>
        );
    }

    // Error state
    if (error && !dashboardData) {
        return (
            <div className="dashboard-container" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                gap: '16px'
            }}>
                <AlertTriangle size={40} style={{ color: 'var(--status-red)' }} />
                <p style={{ color: 'var(--status-red)' }}>{error}</p>
                <button
                    onClick={handleRefresh}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        background: 'var(--law-navy)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    إعادة المحاولة
                </button>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                {/* Top Row: Greeting only */}
                <div style={{ marginBottom: '12px' }}>
                    <h1 className="dashboard-header__welcome">
                        <span className="dashboard-header__welcome-emoji">👋</span>
                        {getGreeting()}، {user?.name || 'المستخدم'}
                    </h1>
                    <p className="dashboard-header__subtitle" style={{ fontSize: '13px', marginTop: '2px' }}>
                        {formatDate()}
                    </p>
                </div>

                {/* Stats Cards + Quick Actions في سطر واحد */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Stats Cards */}
                    {statsCards.map((card) => (
                        <div
                            key={card.id}
                            onClick={() => handleStatClick(card.id)}
                            className="stat-card stat-card-hover"
                            style={{ flex: '1 1 auto', minWidth: 0 }}
                        >
                            <div className="stat-card__icon" style={{
                                background: card.bgColor,
                                color: card.color,
                            }}>
                                {card.icon}
                            </div>
                            <div className="stat-card__content">
                                <div className="stat-card__value">
                                    {card.value}
                                    {card.total !== undefined && card.total > 0 && (
                                        <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 400 }}>/{card.total}</span>
                                    )}
                                </div>
                                <div className="stat-card__label">{card.label}</div>
                            </div>
                        </div>
                    ))}

                    {/* Divider */}
                    <div style={{ width: '1px', height: '36px', background: 'var(--color-border)', flexShrink: 0 }} />

                    {/* Quick Actions - Compact */}
                    {quickActions.map((action) => {
                        const content = (
                            <div
                                key={action.id}
                                className="quick-action-hover"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    background: 'var(--quiet-gray-100)',
                                    border: '1px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.1s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <div style={{ color: action.color, display: 'flex' }}>
                                    {action.icon}
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text)' }}>{action.label}</span>
                            </div>
                        );

                        if (action.href) {
                            return (
                                <Link key={action.id} to={action.href} style={{ textDecoration: 'none', flexShrink: 0 }}>
                                    {content}
                                </Link>
                            );
                        }
                        return <div key={action.id} style={{ flexShrink: 0 }}>{content}</div>;
                    })}
                </div>
            </div>

            {/* Widgets Grid - Equal Height */}
            <div className="widget-grid--equal">
                {/* Cases Widget */}
                <DashboardWidget
                    title="القضايا النشطة"
                    icon="📋"
                    iconBg="var(--law-navy-light)"
                    onRefresh={handleRefresh}
                >
                    <CasesListWidget
                        cases={dashboardData?.recentCases}
                        onCaseClick={(c) => navigate(`/cases/${c.id}`)}
                        limit={4}
                    />
                </DashboardWidget>

                {/* Sessions Widget */}
                <DashboardWidget
                    title="الجلسات القادمة"
                    icon="📅"
                    iconBg="var(--status-orange-light)"
                >
                    <SessionsWidget sessions={dashboardData?.upcomingSessions} />
                </DashboardWidget>

                {/* Activity Widget */}
                <DashboardWidget
                    title="آخر الأنشطة"
                    icon="🔔"
                    iconBg="var(--status-blue-light)"
                >
                    <ActivityFeedWidget activities={dashboardData?.recentActivities} limit={5} />
                </DashboardWidget>
            </div>

            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .stat-card-hover:hover {
          border-color: var(--law-navy) !important;
          background: var(--law-navy-light) !important;
        }

        .quick-action-hover:hover {
          background: var(--law-navy-light) !important;
          border-color: var(--law-navy) !important;
        }
      `}</style>

            {/* Welcome Modal for new tenant owners */}
            <WelcomeModal
                isOpen={showWelcomeModal}
                onClose={handleWelcomeModalClose}
            />
        </div>
    );
};

export default AdminDashboard;
