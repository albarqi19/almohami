import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  Moon,
  Sun,
  User,
  LogOut,
  Plus,
  Command,
  Settings,
  ChevronDown,
  Palette
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import NotificationCenter from './NotificationCenter';

interface HeaderProps {
  onMenuClick: () => void;
}

// Theme types
type ThemeMode = 'light' | 'dark' | 'classic';

const THEMES: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { id: 'light', label: 'نهاري', icon: <Sun size={18} /> },
  { id: 'dark', label: 'داكن', icon: <Moon size={18} /> },
  { id: 'classic', label: 'كلاسيكي', icon: <Palette size={18} /> },
];

const ClickUpHeader: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [theme, setTheme] = React.useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem('theme') as ThemeMode;
    return savedTheme && ['light', 'dark', 'classic'].includes(savedTheme) ? savedTheme : 'light';
  });
  const [notifications] = React.useState(3);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);

  const profileMenuRef = React.useRef<HTMLDivElement | null>(null);
  const notificationsRef = React.useRef<HTMLDivElement | null>(null);

  // Apply theme on mount and change
  React.useEffect(() => {
    // Remove all theme classes first
    document.documentElement.classList.remove('dark', 'classic');
    document.body.classList.remove('dark', 'classic');

    // Add the current theme class (light has no class)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else if (theme === 'classic') {
      document.documentElement.classList.add('classic');
      document.body.classList.add('classic');
    }
  }, [theme]);

  const cycleTheme = () => {
    setTheme((prev) => {
      const currentIndex = THEMES.findIndex(t => t.id === prev);
      const nextIndex = (currentIndex + 1) % THEMES.length;
      const newTheme = THEMES[nextIndex].id;
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  };

  const getCurrentThemeIcon = () => {
    const currentTheme = THEMES.find(t => t.id === theme);
    return currentTheme?.icon || <Sun size={18} />;
  };

  const getCurrentThemeLabel = () => {
    const currentTheme = THEMES.find(t => t.id === theme);
    return currentTheme?.label || 'نهاري';
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const getRoleDisplayName = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'مدير',
      lawyer: 'محامي',
      legal_assistant: 'مساعد قانوني',
      client: 'عميل'
    };
    return roles[role] || role;
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setShowNotifications(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setShowSearch(true);
      }
      if (event.key === 'Escape') {
        setShowSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      <header className="clickup-header">
        <div className="clickup-header__content">
          {/* Left: Menu & Breadcrumb */}
          <div className="clickup-header__start">
            <button
              type="button"
              className="clickup-header__menu-btn"
              onClick={onMenuClick}
              aria-label="فتح القائمة"
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumb */}
            <nav className="clickup-header__breadcrumb">
              <Link to="/dashboard" className="clickup-header__breadcrumb-item">
                الرئيسية
              </Link>
              <span className="clickup-header__breadcrumb-sep">/</span>
              <span className="clickup-header__breadcrumb-current">
                {location.pathname.includes('/cases') && 'القضايا'}
                {location.pathname.includes('/tasks') && 'المهام'}
                {location.pathname.includes('/dashboard') && 'لوحة التحكم'}
                {location.pathname.includes('/documents') && 'الوثائق'}
                {location.pathname.includes('/sessions') && 'الجلسات'}
                {location.pathname.includes('/settings') && 'الإعدادات'}
                {location.pathname.includes('/wekalat') && 'الوكالات'}
              </span>
            </nav>
          </div>

          {/* Center: Search */}
          <div className="clickup-header__center">
            <button
              type="button"
              className="clickup-header__search"
              onClick={() => setShowSearch(true)}
            >
              <Search size={16} />
              <span>البحث...</span>
              <kbd className="clickup-header__kbd">
                <Command size={10} />K
              </kbd>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="clickup-header__end">
            {/* Quick Add */}
            <button
              type="button"
              className="clickup-header__add-btn"
            >
              <Plus size={16} />
              <span>إضافة</span>
            </button>

            {/* Notifications */}
            <div className="clickup-header__icon-wrapper" ref={notificationsRef}>
              <button
                type="button"
                className="clickup-header__icon-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="الإشعارات"
              >
                <Bell size={18} />
                {notifications > 0 && (
                  <span className="clickup-header__badge">{notifications}</span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    className="clickup-header__dropdown clickup-header__dropdown--notifications"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <NotificationCenter
                      isOpen={showNotifications}
                      onClose={() => setShowNotifications(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              className="clickup-header__icon-btn"
              onClick={cycleTheme}
              aria-label={`تغيير المظهر (${getCurrentThemeLabel()})`}
              title={`المظهر الحالي: ${getCurrentThemeLabel()}`}
            >
              {getCurrentThemeIcon()}
            </button>

            {/* Settings */}
            <Link to="/settings" className="clickup-header__icon-btn">
              <Settings size={18} />
            </Link>

            {/* User Menu */}
            <div className="clickup-header__user-wrapper" ref={profileMenuRef}>
              <button
                type="button"
                className="clickup-header__user"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <span className="clickup-header__avatar">
                  {user?.name?.charAt(0) || 'م'}
                </span>
                <ChevronDown size={14} className="clickup-header__chevron" />
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    className="clickup-header__dropdown clickup-header__dropdown--user"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="clickup-header__dropdown-header">
                      <span className="clickup-header__dropdown-avatar">
                        {user?.name?.charAt(0) || 'م'}
                      </span>
                      <div>
                        <p className="clickup-header__dropdown-name">{user?.name}</p>
                        <p className="clickup-header__dropdown-role">{getRoleDisplayName(user?.role || '')}</p>
                      </div>
                    </div>
                    <div className="clickup-header__dropdown-divider" />
                    <Link to="/settings" className="clickup-header__dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <Settings size={14} />
                      الإعدادات
                    </Link>
                    <button
                      type="button"
                      className="clickup-header__dropdown-item clickup-header__dropdown-item--danger"
                      onClick={handleLogout}
                    >
                      <LogOut size={14} />
                      تسجيل الخروج
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <>
            <motion.div
              className="clickup-search-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSearch(false)}
            />
            <motion.div
              className="clickup-search-modal"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <div className="clickup-search-modal__input-wrapper">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="ابحث في القضايا، المهام، الوثائق..."
                  autoFocus
                />
                <kbd onClick={() => setShowSearch(false)}>ESC</kbd>
              </div>
              <div className="clickup-search-modal__hints">
                <span>اكتب للبحث أو استخدم الأوامر</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .clickup-header {
          height: 52px;
          background: var(--dashboard-card);
          border-bottom: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          padding: 0 16px;
          position: sticky;
          top: 0;
          z-index: 40;
        }

        .clickup-header__content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 16px;
        }

        .clickup-header__start {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .clickup-header__menu-btn {
          display: none;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          align-items: center;
          justify-content: center;
          color: var(--color-text-secondary);
          transition: background 0.1s;
        }

        .clickup-header__menu-btn:hover {
          background: var(--quiet-gray-100);
        }

        @media (max-width: 1024px) {
          .clickup-header__menu-btn {
            display: flex;
          }
        }

        .clickup-header__breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }

        .clickup-header__breadcrumb-item {
          color: var(--color-text-secondary);
          transition: color 0.1s;
        }

        .clickup-header__breadcrumb-item:hover {
          color: var(--color-text);
        }

        .clickup-header__breadcrumb-sep {
          color: var(--quiet-gray-400);
        }

        .clickup-header__breadcrumb-current {
          color: var(--color-text);
          font-weight: 500;
        }

        .clickup-header__center {
          flex: 1;
          max-width: 480px;
        }

        .clickup-header__search {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          background: var(--quiet-gray-100);
          border: 1px solid transparent;
          color: var(--color-text-secondary);
          font-size: 13px;
          cursor: pointer;
          transition: border-color 0.1s, background 0.1s;
        }

        .clickup-header__search:hover {
          border-color: var(--color-border);
          background: var(--dashboard-card);
        }

        .clickup-header__kbd {
          display: flex;
          align-items: center;
          gap: 2px;
          margin-right: auto;
          padding: 2px 6px;
          background: var(--dashboard-card);
          border: 1px solid var(--color-border);
          border-radius: 4px;
          font-size: 11px;
          color: var(--color-text-secondary);
        }

        .clickup-header__end {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .clickup-header__add-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          background: var(--law-navy);
          color: white;
          font-size: 13px;
          font-weight: 500;
          transition: background 0.1s;
        }

        .clickup-header__add-btn:hover {
          background: var(--law-navy-dark);
        }

        .clickup-header__icon-wrapper,
        .clickup-header__user-wrapper {
          position: relative;
        }

        .clickup-header__icon-btn {
          width: 34px;
          height: 34px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-secondary);
          position: relative;
          transition: background 0.1s, color 0.1s;
        }

        .clickup-header__icon-btn:hover {
          background: var(--quiet-gray-100);
          color: var(--color-text);
        }

        .clickup-header__badge {
          position: absolute;
          top: 4px;
          right: 4px;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          background: var(--clickup-red);
          border-radius: 8px;
          font-size: 10px;
          font-weight: 600;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .clickup-header__user {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px 4px 4px;
          border-radius: 6px;
          transition: background 0.1s;
        }

        .clickup-header__user:hover {
          background: var(--quiet-gray-100);
        }

        .clickup-header__avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--law-navy);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
        }

        .clickup-header__chevron {
          color: var(--color-text-secondary);
        }

        .clickup-header__dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          background: var(--dashboard-card);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          overflow: hidden;
          z-index: 100;
        }

        .clickup-header__dropdown--user {
          width: 200px;
        }

        .clickup-header__dropdown--notifications {
          width: 360px;
          left: auto;
          right: 0;
        }

        .clickup-header__dropdown-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
        }

        .clickup-header__dropdown-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--law-navy);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
        }

        .clickup-header__dropdown-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text);
        }

        .clickup-header__dropdown-role {
          font-size: 11px;
          color: var(--color-text-secondary);
        }

        .clickup-header__dropdown-divider {
          height: 1px;
          background: var(--color-border);
          margin: 0;
        }

        .clickup-header__dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          font-size: 13px;
          color: var(--color-text);
          transition: background 0.1s;
          width: 100%;
          text-align: right;
        }

        .clickup-header__dropdown-item:hover {
          background: var(--quiet-gray-100);
        }

        .clickup-header__dropdown-item--danger {
          color: var(--clickup-red);
        }

        /* Search Modal */
        .clickup-search-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 100;
        }

        .clickup-search-modal {
          position: fixed;
          top: 15%;
          left: 50%;
          transform: translateX(-50%);
          width: 560px;
          max-width: 90%;
          background: var(--dashboard-card);
          border-radius: 12px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
          z-index: 101;
          overflow: hidden;
        }

        .clickup-search-modal__input-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid var(--color-border);
        }

        .clickup-search-modal__input-wrapper svg {
          color: var(--color-text-secondary);
          flex-shrink: 0;
        }

        .clickup-search-modal__input-wrapper input {
          flex: 1;
          border: none;
          background: none;
          font-size: 15px;
          outline: none;
          color: var(--color-text);
        }

        .clickup-search-modal__input-wrapper input::placeholder {
          color: var(--color-text-secondary);
        }

        .clickup-search-modal__input-wrapper kbd {
          padding: 4px 8px;
          background: var(--quiet-gray-100);
          border-radius: 4px;
          font-size: 11px;
          color: var(--color-text-secondary);
          cursor: pointer;
        }

        .clickup-search-modal__hints {
          padding: 12px 16px;
          font-size: 12px;
          color: var(--color-text-secondary);
          background: var(--quiet-gray-100);
        }

        @media (max-width: 768px) {
          .clickup-header__center {
            display: none;
          }
          
          .clickup-header__add-btn span {
            display: none;
          }
          
          .clickup-header__breadcrumb {
            display: none;
          }
        }
      `}</style>
    </>
  );
};

export default ClickUpHeader;
