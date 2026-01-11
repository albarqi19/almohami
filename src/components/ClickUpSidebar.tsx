import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Home,
    FileText,
    CheckSquare,
    Upload,
    BarChart3,
    Users,
    Bell,
    Settings,
    LogOut,
    Calendar,
    MessageSquare,
    FileCheck,
    ChevronRight,
    ChevronLeft,
    Search,
    Star,
    Clock,
    Scale,
    X,
    ClipboardList,
    BookOpen
} from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    isMobileOpen: boolean;
    onMobileClose: () => void;
}

const ClickUpSidebar: React.FC<SidebarProps> = ({
    isCollapsed,
    onToggleCollapse,
    isMobileOpen,
    onMobileClose
}) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [showFavorites, setShowFavorites] = React.useState(true);

    // Menu items configuration
    const menuItems = [
        { icon: Home, label: 'لوحة التحكم', path: '/dashboard', roles: ['admin', 'lawyer', 'legal_assistant', 'client'] },
        { icon: FileText, label: 'القضايا', path: '/cases', roles: ['admin', 'lawyer', 'legal_assistant'] },
        { icon: FileCheck, label: 'الوكالات', path: '/wekalat', roles: ['admin', 'lawyer', 'legal_assistant'] },
        { icon: Calendar, label: 'الجلسات', path: '/sessions', roles: ['admin', 'lawyer', 'legal_assistant'] },
        { icon: Users, label: 'الاجتماعات', path: '/meetings/internal', roles: ['admin', 'lawyer', 'legal_assistant'] },
        { icon: Calendar, label: 'مواعيد العملاء', path: '/meetings/client', roles: ['admin', 'lawyer', 'legal_assistant'] },
        { icon: Clock, label: 'إعدادات التوفر', path: '/meetings/availability', roles: ['lawyer'] },
        { icon: CheckSquare, label: 'المهام', path: '/tasks', roles: ['admin', 'lawyer', 'legal_assistant'] },
        { icon: BookOpen, label: 'المفكرة الشخصية', path: '/notebook', roles: ['admin', 'lawyer', 'legal_assistant'] },
        { icon: FileText, label: 'قضاياي', path: '/my-cases', roles: ['client'] },
        { icon: MessageSquare, label: 'الرسائل', path: '/my-messages', roles: ['client'] },
        { icon: Upload, label: 'الوثائق', path: '/documents', roles: ['admin', 'lawyer', 'legal_assistant', 'client'] },
        { icon: Clock, label: 'الأنشطة', path: '/activities', roles: ['admin', 'lawyer', 'legal_assistant', 'client'] },
        { icon: Users, label: 'العملاء', path: '/clients', roles: ['admin', 'lawyer', 'legal_assistant'] },
        { icon: ClipboardList, label: 'الطلبات الإدارية', path: '/admin/requests', roles: ['admin', 'lawyer', 'legal_assistant'] },
    ];

    const settingsItems = [
        { icon: BarChart3, label: 'التقارير', path: '/reports', roles: ['admin'] },
        { icon: Users, label: 'تقرير المحامين', path: '/lawyers-report', roles: ['admin'] },
        { icon: Users, label: 'المستخدمين', path: '/users', roles: ['admin'] },
        { icon: Bell, label: 'التنبيهات', path: '/notifications', roles: ['admin', 'lawyer', 'legal_assistant', 'client'] },
        { icon: MessageSquare, label: 'الواتساب', path: '/whatsapp-settings', roles: ['admin'] },
        { icon: Settings, label: 'الإعدادات', path: '/settings', roles: ['admin', 'lawyer', 'legal_assistant', 'client'] },
    ];

    const favorites = [
        { id: '1', label: 'القضية العقارية', type: 'case', color: '#1E3A5F' },
        { id: '2', label: 'مهام هذا الأسبوع', type: 'task', color: '#059669' },
        { id: '3', label: 'جلسات ديسمبر', type: 'session', color: '#D97706' },
    ];

    const visibleMenuItems = menuItems.filter((item) => user && item.roles.includes(user.role));
    const visibleSettingsItems = settingsItems.filter((item) => user && item.roles.includes(user.role));

    const handleLogout = () => {
        logout();
    };

    const sidebarWidth = isCollapsed ? 64 : 240;

    // Navigation Link Component
    const NavItem: React.FC<{
        item: typeof menuItems[0];
        isCollapsed: boolean;
    }> = ({ item, isCollapsed }) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        const content = (
            <NavLink
                to={item.path}
                className={`sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
                onClick={() => isMobileOpen && onMobileClose()}
            >
                <span className="sidebar-link__icon">
                    <Icon size={20} />
                </span>

                {!isCollapsed && (
                    <span className="sidebar-link__label">{item.label}</span>
                )}

            </NavLink>
        );

        if (isCollapsed) {
            return (
                <Tooltip.Provider>
                    <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                            {content}
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                            <Tooltip.Content
                                className="tooltip"
                                side="left"
                                sideOffset={10}
                            >
                                {item.label}
                            </Tooltip.Content>
                        </Tooltip.Portal>
                    </Tooltip.Root>
                </Tooltip.Provider>
            );
        }

        return content;
    };

    return (
        <>
            <aside
                className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''} ${isMobileOpen ? 'sidebar--mobile-open' : ''}`}
                style={{ width: sidebarWidth }}
            >
                {/* Header */}
                <div className="sidebar__header">
                    <div className="sidebar__logo">
                        <Scale size={22} />
                    </div>

                    {!isCollapsed && (
                        <div className="sidebar__brand">
                            <div className="sidebar__title">نظام المحاماة</div>
                        </div>
                    )}

                    {/* Collapse Button - Desktop */}
                    <button
                        className="sidebar__toggle"
                        onClick={onToggleCollapse}
                        title={isCollapsed ? 'توسيع' : 'طي'}
                    >
                        {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    </button>

                    {/* Close Button - Mobile */}
                    <button
                        className="sidebar__close-mobile"
                        onClick={onMobileClose}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                {!isCollapsed && (
                    <div className="sidebar__search">
                        <Search size={16} />
                        <span>بحث سريع...</span>
                        <kbd>⌘K</kbd>
                    </div>
                )}

                {/* Navigation */}
                <nav className="sidebar__nav">
                    {/* Main Section */}
                    <div className="sidebar__section">
                        {!isCollapsed && (
                            <div className="sidebar__section-title">القائمة الرئيسية</div>
                        )}
                        {visibleMenuItems.map((item) => (
                            <NavItem key={item.path} item={item} isCollapsed={isCollapsed} />
                        ))}
                    </div>

                    {/* Favorites Section */}
                    {!isCollapsed && user?.role !== 'client' && (
                        <div className="sidebar__section">
                            <div
                                className="sidebar__section-title sidebar__section-title--clickable"
                                onClick={() => setShowFavorites(!showFavorites)}
                            >
                                <span><Star size={12} /> المفضلة</span>
                                <ChevronLeft size={12} style={{ transform: showFavorites ? 'rotate(-90deg)' : 'none' }} />
                            </div>

                            {showFavorites && (
                                <div>
                                    {favorites.map((fav) => (
                                        <div key={fav.id} className="sidebar-link" style={{ cursor: 'pointer' }}>
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: fav.color
                                            }} />
                                            <span className="sidebar-link__label">{fav.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Settings Section */}
                    <div className="sidebar__section">
                        {!isCollapsed && (
                            <div className="sidebar__section-title">الإعدادات</div>
                        )}
                        {visibleSettingsItems.map((item) => (
                            <NavItem key={item.path} item={item} isCollapsed={isCollapsed} />
                        ))}
                    </div>
                </nav>

                {/* Footer / User Profile */}
                <div className="sidebar__footer">
                    <div className="sidebar__user">
                        <div className="sidebar__avatar">
                            {user?.name?.charAt(0) || 'م'}
                        </div>

                        {!isCollapsed && (
                            <div className="sidebar__user-info">
                                <div className="sidebar__username">{user?.name || 'المستخدم'}</div>
                                <div className="sidebar__role">
                                    {user?.role === 'admin' && 'مدير النظام'}
                                    {user?.role === 'lawyer' && 'محامي'}
                                    {user?.role === 'legal_assistant' && 'مساعد قانوني'}
                                    {user?.role === 'client' && 'موكل'}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        className="sidebar__logout"
                        onClick={handleLogout}
                    >
                        <LogOut size={18} />
                        {!isCollapsed && <span>تسجيل الخروج</span>}
                    </button>
                </div>
            </aside>

            <style>{`
                .sidebar {
                    height: 100vh;
                    background: #1A2332;
                    color: white;
                    position: fixed;
                    right: 0;
                    top: 0;
                    display: flex;
                    flex-direction: column;
                    transition: width 0.2s ease;
                    z-index: 50;
                    overflow: hidden;
                }
                
                .sidebar--collapsed {
                    width: 64px !important;
                }
                
                @media (max-width: 1024px) {
                    .sidebar {
                        transform: translateX(100%);
                        width: 280px !important;
                    }
                    
                    .sidebar--mobile-open {
                        transform: translateX(0);
                    }
                }
                
                .sidebar__header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 14px;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                    flex-shrink: 0;
                }
                
                .sidebar__logo {
                    width: 36px;
                    height: 36px;
                    background: var(--law-navy);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                
                .sidebar__brand {
                    flex: 1;
                    min-width: 0;
                }
                
                .sidebar__title {
                    font-size: 14px;
                    font-weight: 600;
                    white-space: nowrap;
                }
                
                .sidebar__subtitle {
                    font-size: 11px;
                    color: rgba(255,255,255,0.5);
                    white-space: nowrap;
                }
                
                .sidebar__toggle {
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    flex-shrink: 0;
                    transition: background 0.15s;
                }
                
                .sidebar__toggle:hover {
                    background: rgba(255,255,255,0.2);
                }
                
                @media (max-width: 1024px) {
                    .sidebar__toggle {
                        display: none;
                    }
                }
                
                .sidebar__close-mobile {
                    display: none;
                    width: 32px;
                    height: 32px;
                    border-radius: 6px;
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }
                
                @media (max-width: 1024px) {
                    .sidebar__close-mobile {
                        display: flex;
                        margin-right: auto;
                    }
                }
                
                .sidebar__search {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin: 12px;
                    padding: 10px 12px;
                    border-radius: 8px;
                    background: rgba(255,255,255,0.08);
                    color: rgba(255,255,255,0.5);
                    font-size: 13px;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                
                .sidebar__search:hover {
                    background: rgba(255,255,255,0.12);
                }
                
                .sidebar__search kbd {
                    margin-right: auto;
                    font-size: 10px;
                    padding: 2px 6px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                }
                
                .sidebar__nav {
                    flex: 1;
                    padding: 8px;
                    overflow-y: auto;
                }
                
                .sidebar__section {
                    margin-bottom: 16px;
                }
                
                .sidebar__section-title {
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: rgba(255,255,255,0.4);
                    padding: 8px 10px 4px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .sidebar__section-title--clickable {
                    cursor: pointer;
                    justify-content: space-between;
                }
                
                .sidebar-link {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px;
                    border-radius: 6px;
                    color: rgba(255,255,255,0.7);
                    font-size: 14px;
                    transition: background 0.15s, color 0.15s;
                    margin-bottom: 2px;
                    text-decoration: none;
                }
                
                .sidebar--collapsed .sidebar-link {
                    justify-content: center;
                    padding: 12px;
                }
                
                .sidebar-link:hover {
                    background: rgba(255,255,255,0.08);
                    color: white;
                }
                
                .sidebar-link--active {
                    background: var(--law-navy) !important;
                    color: white !important;
                }
                
                .sidebar-link__icon {
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .sidebar-link__label {
                    flex: 1;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .sidebar-link__badge {
                    padding: 2px 6px;
                    background: var(--status-red);
                    border-radius: 10px;
                    font-size: 10px;
                    font-weight: 600;
                }
                
                .sidebar__footer {
                    padding: 12px;
                    border-top: 1px solid rgba(255,255,255,0.08);
                    flex-shrink: 0;
                }
                
                .sidebar__user {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px;
                    border-radius: 8px;
                    margin-bottom: 8px;
                }
                
                .sidebar--collapsed .sidebar__user {
                    justify-content: center;
                    padding: 8px 0;
                }
                
                .sidebar__avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: var(--law-navy);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 13px;
                    flex-shrink: 0;
                }
                
                .sidebar__user-info {
                    flex: 1;
                    min-width: 0;
                }
                
                .sidebar__username {
                    font-size: 13px;
                    font-weight: 500;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .sidebar__role {
                    font-size: 11px;
                    color: rgba(255,255,255,0.5);
                }
                
                .sidebar__logout {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    width: 100%;
                    padding: 10px;
                    border-radius: 6px;
                    background: rgba(255,255,255,0.08);
                    border: none;
                    color: var(--status-red);
                    font-size: 13px;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                
                .sidebar--collapsed .sidebar__logout span {
                    display: none;
                }
                
                .sidebar__logout:hover {
                    background: rgba(220, 38, 38, 0.2);
                }
                
                .tooltip {
                    background: #1A2332;
                    color: white;
                    padding: 6px 10px;
                    border-radius: 6px;
                    font-size: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    z-index: 100;
                }
            `}</style>
        </>
    );
};

export default ClickUpSidebar;
