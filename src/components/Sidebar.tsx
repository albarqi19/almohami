import React from 'react';
import { NavLink } from 'react-router-dom';
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
  MoonStar,
  Clock,
  MessageSquare,
  Calendar,
  FileCheck,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: Home, label: 'لوحة التحكم', path: '/dashboard', roles: ['admin', 'lawyer', 'legal_assistant', 'client'] },
    { icon: FileText, label: 'القضايا', path: '/cases', roles: ['admin', 'lawyer', 'legal_assistant'] },
    { icon: FileCheck, label: 'الوكالات', path: '/wekalat', roles: ['admin', 'lawyer', 'legal_assistant'] },
    { icon: Calendar, label: 'الجلسات القادمة', path: '/sessions', roles: ['admin', 'lawyer', 'legal_assistant'] },
    { icon: CheckSquare, label: 'المهام', path: '/tasks', roles: ['admin', 'lawyer', 'legal_assistant'] },
    { icon: FileText, label: 'قضاياي', path: '/my-cases', roles: ['client'] },
    { icon: MessageSquare, label: 'رسائلي', path: '/my-messages', roles: ['client'] },
    { icon: Upload, label: 'الوثائق', path: '/documents', roles: ['admin', 'lawyer', 'legal_assistant', 'client'] },
    { icon: Clock, label: 'سجل الأنشطة', path: '/activities', roles: ['admin', 'lawyer', 'legal_assistant', 'client'] },
    { icon: BarChart3, label: 'التقارير', path: '/reports', roles: ['admin'] },
    { icon: Users, label: 'المستخدمين', path: '/users', roles: ['admin'] },
    { icon: Bell, label: 'التنبيهات', path: '/notifications', roles: ['admin', 'lawyer', 'legal_assistant', 'client'] },
    { icon: MessageSquare, label: 'إعدادات الواتساب', path: '/whatsapp-settings', roles: ['admin'] },
    { icon: Settings, label: 'الإعدادات', path: '/settings', roles: ['admin', 'lawyer', 'legal_assistant', 'client'] },
  ];

  const visibleMenuItems = menuItems.filter((item) => user && item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className="sidebar" aria-label="القائمة الجانبية" role="navigation">
      <div className="sidebar__container">
        <div className="sidebar__brand">
          <div className="sidebar__brand-group">
            <span className="sidebar__brand-icon" aria-hidden>
              <MoonStar size={22} />
            </span>
            <div className="sidebar__brand-info">
              <h1 className="sidebar__brand-title">نظام إدارة المحاماة</h1>
              <span className="sidebar__brand-subtitle">منصة متكاملة للقضايا والمهام</span>
            </div>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="روابط التنقل الرئيسية">
          <ul className="sidebar__nav-list">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path} className="sidebar__item">
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      clsx('sidebar__link', isActive && 'sidebar__link--active')
                    }
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar__footer">
          <button type="button" className="sidebar__logout" onClick={handleLogout}>
            تسجيل الخروج
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
