// [P4·UX-01] حاوية وحدة «العقود والمالية» الموحّدة: شريط علوي + تبويبات حسب الصلاحية + Outlet.
// التبويبات تُشتقّ من مصدر حقيقة واحد (financeModule.ts) المشترك مع حراسة المسارات (UX-07).
import React, { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Plus, FileSignature, Receipt, ChevronDown } from 'lucide-react';
import { usePermissionContext } from '../../contexts/PermissionContext';
import { useAuth } from '../../contexts/AuthContext';
import { FINANCE_TABS, FINANCE_PERMISSIONS } from '../../config/financeModule';
import { useClickOutside } from '../../hooks/useClickOutside';

const ContractsFinanceModule: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { has, hasAny } = usePermissionContext();
  const { user } = useAuth();
  const [newOpen, setNewOpen] = useState(false);
  const newRef = useClickOutside<HTMLDivElement>(() => setNewOpen(false), newOpen);

  const checker = useMemo(() => ({ has, hasAny }), [has, hasAny]);

  const visibleTabs = useMemo(
    () => FINANCE_TABS.filter((t) => t.isVisible(checker, user?.role)),
    [checker, user?.role],
  );

  const basePath = '/finance';
  const currentPath = location.pathname;

  const isTabActive = (tabPath: string): boolean => {
    const full = tabPath ? `${basePath}/${tabPath}` : basePath;
    if (tabPath === '') {
      // لوحة التحكم نشطة فقط على /finance أو /finance/ تماماً.
      return currentPath === basePath || currentPath === `${basePath}/`;
    }
    return currentPath === full || currentPath.startsWith(`${full}/`);
  };

  // عناصر زر «+ جديد» حسب الصلاحية.
  const newItems = [
    has(FINANCE_PERMISSIONS.contractsCreate) && {
      label: 'عقد جديد',
      icon: FileSignature,
      onClick: () => navigate('/finance/contracts/new'),
    },
    has(FINANCE_PERMISSIONS.invoicesManage) && {
      label: 'فاتورة جديدة',
      icon: Receipt,
      onClick: () => navigate('/finance/invoices?new=1'),
    },
  ].filter(Boolean) as { label: string; icon: typeof FileSignature; onClick: () => void }[];

  return (
    <div className="fin-module">
      <div className="fin-topbar">
        <div className="fin-topbar__title">
          <FileSignature size={20} />
          العقود والمالية
        </div>
        {newItems.length > 0 && (
          <div className="fin-new-wrap" ref={newRef}>
            <button type="button" className="fin-btn fin-btn--primary" onClick={() => setNewOpen((v) => !v)}>
              <Plus size={15} /> جديد <ChevronDown size={14} />
            </button>
            {newOpen && (
              <div className="fin-menu__dropdown" style={{ insetInlineEnd: 0 }}>
                {newItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="fin-menu__item"
                    onClick={() => {
                      setNewOpen(false);
                      item.onClick();
                    }}
                  >
                    <item.icon size={15} /> {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fin-tabs" role="tablist">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const active = isTabActive(tab.path);
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              className={`fin-tab${active ? ' fin-tab--active' : ''}`}
              onClick={() => navigate(tab.path ? `${basePath}/${tab.path}` : basePath)}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="fin-content">
        <Outlet />
      </div>
    </div>
  );
};

export default ContractsFinanceModule;
