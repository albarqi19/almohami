import React, { useState, createContext, useContext } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import ClickUpSidebar from './ClickUpSidebar';
import ClickUpHeader from './ClickUpHeader';
import { useAuth } from '../contexts/AuthContext';

// Sidebar Context للتناغم بين Sidebar والمحتوى
interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  sidebarWidth: number;
}

export const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
  setIsCollapsed: () => { },
  sidebarWidth: 240
});

export const useSidebar = () => useContext(SidebarContext);

const Layout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // عرض Sidebar حسب الحالة
  const sidebarWidth = isCollapsed ? 64 : 240;

  const handleMenuClick = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, sidebarWidth }}>
      <div
        className="app-layout"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: 'var(--dashboard-bg)',
          direction: 'rtl'
        }}
      >
        <a href="#main-content" className="skip-link">
          تخطي إلى المحتوى الرئيسي
        </a>

        {/* ClickUp Sidebar - ثابت على اليمين */}
        <ClickUpSidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          isMobileOpen={isMobileOpen}
          onMobileClose={() => setIsMobileOpen(false)}
        />

        {/* زر فتح Sidebar عندما يكون مغلقاً */}
        {isCollapsed && (
          <button
            className="sidebar-expand-btn"
            onClick={() => setIsCollapsed(false)}
            title="فتح القائمة"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        {/* Mobile Overlay */}
        {isMobileOpen && (
          <div
            className="mobile-overlay"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* Main Content - يتمدد حسب عرض Sidebar */}
        <div
          className="app-main"
          style={{
            flex: 1,
            marginRight: `${sidebarWidth}px`,
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'hidden',
            transition: 'margin-right 0.2s ease',
            width: `calc(100% - ${sidebarWidth}px)`
          }}
        >
          {/* ClickUp Header */}
          <ClickUpHeader onMenuClick={handleMenuClick} />

          {/* Page Content - Scrollable */}
          <main
            id="main-content"
            className="app-content"
            style={{
              flex: 1,
              overflow: 'auto'
            }}
          >
            <Outlet />
          </main>
        </div>

        <style>{`
          @media (max-width: 1024px) {
            .app-main {
              margin-right: 0 !important;
              width: 100% !important;
            }
            
            .sidebar-expand-btn {
              display: none !important;
            }
          }
          
          .mobile-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 45;
          }
          
          @media (max-width: 1024px) {
            .mobile-overlay {
              display: block;
            }
          }
          
          .skip-link {
            position: absolute;
            transform: translateY(-100%);
            background: var(--law-navy);
            color: white;
            padding: 8px 16px;
            border-radius: 0 0 8px 8px;
            z-index: 100;
            transition: transform 0.15s;
          }
          
          .skip-link:focus {
            transform: translateY(0);
          }
          
          .sidebar-expand-btn {
            position: fixed;
            right: 64px;
            top: 50%;
            transform: translateY(-50%);
            width: 24px;
            height: 48px;
            background: var(--law-navy);
            border: none;
            border-radius: 8px 0 0 8px;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 49;
            transition: background 0.15s, right 0.2s;
          }
          
          .sidebar-expand-btn:hover {
            background: var(--law-navy-dark);
          }
        `}</style>
      </div>
    </SidebarContext.Provider>
  );
};

export default Layout;
