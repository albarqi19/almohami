import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    RefreshCw,
    FileText,
    CheckSquare,
    AlertTriangle,
    Upload,
    Search,
    Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/dashboard-theme.css';

// Import Widgets
import DashboardWidget from './DashboardWidget';
import CasesListWidget from './widgets/CasesListWidget';
import SessionsWidget from './widgets/SessionsWidget';
import ActivityFeedWidget from './widgets/ActivityFeedWidget';

// Cache keys
const CACHE_KEYS = {
    DASHBOARD_DATA: 'dashboard_data',
    DASHBOARD_TIMESTAMP: 'dashboard_timestamp'
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Try to load from cache first
    const [stats, setStats] = useState(() => {
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
        return {
            totalCases: 42,
            activeCases: 15,
            totalTasks: 87,
            completedTasks: 64,
            upcomingSessions: 8,
            documentsCount: 156
        };
    });

    // Save to cache when stats change
    useEffect(() => {
        try {
            localStorage.setItem(CACHE_KEYS.DASHBOARD_DATA, JSON.stringify(stats));
            localStorage.setItem(CACHE_KEYS.DASHBOARD_TIMESTAMP, Date.now().toString());
        } catch (e) {
            console.error('Cache write error:', e);
        }
    }, [stats]);

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
        await new Promise(resolve => setTimeout(resolve, 800));
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

    // Stats data
    const statsCards = [
        { id: 'cases', label: 'قضايا نشطة', value: stats.activeCases, total: stats.totalCases, icon: <FileText size={18} />, color: 'var(--law-navy)', bgColor: 'var(--law-navy-light)' },
        { id: 'tasks', label: 'مهام مكتملة', value: stats.completedTasks, total: stats.totalTasks, icon: <CheckSquare size={18} />, color: 'var(--status-green)', bgColor: 'var(--status-green-light)' },
        { id: 'sessions', label: 'جلسات قادمة', value: stats.upcomingSessions, icon: <Calendar size={18} />, color: 'var(--status-orange)', bgColor: 'var(--status-orange-light)' },
        { id: 'active', label: 'تحتاج متابعة', value: 3, icon: <AlertTriangle size={18} />, color: 'var(--status-red)', bgColor: 'var(--status-red-light)' },
    ];

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h1 className="dashboard-header__welcome">
                            <span className="dashboard-header__welcome-emoji">👋</span>
                            {getGreeting()}، {user?.name || 'المستخدم'}
                        </h1>
                        <p className="dashboard-header__subtitle">
                            {formatDate()}
                        </p>
                    </div>

                    <button
                        onClick={handleRefresh}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            background: 'var(--quiet-gray-100)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text)',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'background 0.1s'
                        }}
                    >
                        <RefreshCw size={14} style={isRefreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
                        تحديث
                    </button>
                </div>

                {/* Stats + Quick Actions في سطر واحد */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch', flexWrap: 'wrap' }}>
                    {/* Stats Cards */}
                    {statsCards.map((card) => (
                        <div
                            key={card.id}
                            onClick={() => handleStatClick(card.id)}
                            style={{
                                flex: '1 1 160px',
                                minWidth: '140px',
                                padding: '14px 16px',
                                borderRadius: '8px',
                                background: 'var(--dashboard-card)',
                                border: '1px solid var(--color-border)',
                                cursor: 'pointer',
                                transition: 'border-color 0.1s, background 0.1s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}
                            className="stat-card-hover"
                        >
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '8px',
                                background: card.bgColor,
                                color: card.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {card.icon}
                            </div>
                            <div>
                                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-heading)', lineHeight: 1 }}>
                                    {card.value}
                                    {card.total && <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 400 }}>/{card.total}</span>}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{card.label}</div>
                            </div>
                        </div>
                    ))}

                    {/* Divider */}
                    <div style={{ width: '1px', background: 'var(--color-border)', margin: '8px 4px' }} />

                    {/* Quick Actions */}
                    {quickActions.map((action) => {
                        const content = (
                            <div
                                key={action.id}
                                style={{
                                    flex: '0 0 auto',
                                    padding: '14px 20px',
                                    borderRadius: '8px',
                                    background: 'var(--quiet-gray-100)',
                                    border: '1px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'background 0.1s, border-color 0.1s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '6px',
                                    minWidth: '70px'
                                }}
                                className="quick-action-hover"
                            >
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    background: `${action.color}15`,
                                    color: action.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {action.icon}
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text)' }}>{action.label}</span>
                            </div>
                        );

                        if (action.href) {
                            return (
                                <Link key={action.id} to={action.href} style={{ textDecoration: 'none' }}>
                                    {content}
                                </Link>
                            );
                        }
                        return content;
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
                    <CasesListWidget onCaseClick={(c) => navigate(`/cases/${c.id}`)} limit={4} />
                </DashboardWidget>

                {/* Sessions Widget */}
                <DashboardWidget
                    title="الجلسات القادمة"
                    icon="📅"
                    iconBg="var(--status-orange-light)"
                >
                    <SessionsWidget />
                </DashboardWidget>

                {/* Activity Widget */}
                <DashboardWidget
                    title="آخر الأنشطة"
                    icon="🔔"
                    iconBg="var(--status-blue-light)"
                >
                    <ActivityFeedWidget limit={5} />
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
        </div>
    );
};

export default AdminDashboard;
