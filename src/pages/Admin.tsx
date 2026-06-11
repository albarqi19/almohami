import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, Scale, Activity, Plus } from 'lucide-react';
import PermissionManagementShell from '../components/permissions/PermissionManagementShell';
import { apiClient } from '../utils/api';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

interface UserStats {
  total: number;
  active: number;
  lawyers: number;
  clients: number;
  assistants: number;
}

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [triggerAddUser, setTriggerAddUser] = useState(false);

  // Fetch user stats
  const { data: statsData, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ['userStats'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: UserStats }>('/users/stats');
      return response.data;
    },
    staleTime: 60 * 1000,
  });

  // Staff total = total users minus clients
  const staffTotal = statsLoading
    ? '-'
    : ((statsData?.total ?? 0) - (statsData?.clients ?? 0)).toString();

  const stats: Array<{
    icon: React.ReactNode;
    title: string;
    value: string;
    colorClass: 'navy' | 'green' | 'orange' | 'blue';
    onClick?: () => void;
  }> = [
    {
      icon: <Users size={16} />,
      title: 'إجمالي المستخدمين',
      value: staffTotal,
      colorClass: 'navy',
    },
    {
      icon: <Scale size={16} />,
      title: 'المحامون',
      value: statsLoading ? '-' : statsData?.lawyers.toString() || '0',
      colorClass: 'green',
    },
    {
      icon: <Activity size={16} />,
      title: 'المساعدون',
      value: statsLoading ? '-' : statsData?.assistants.toString() || '0',
      colorClass: 'orange',
    },
    {
      icon: <Users size={16} />,
      title: 'العملاء',
      value: statsLoading ? '-' : statsData?.clients.toString() || '0',
      colorClass: 'blue',
      onClick: () => navigate('/clients'),
    },
  ];

  return (
    <div className="admin-page admin-page--full-height">
      {/* Header — العنوان + الإحصائيات + زر الإضافة */}
      <div className="admin-header admin-header--with-stats">
        <div className="admin-header__title-area">
          <h1>
            <Users size={18} />
            المستخدمين
          </h1>
          <p>إدارة المستخدمين والأدوار والصلاحيات</p>
        </div>

        {/* Inline stats strip — pills للإحصائيات */}
        <div className="admin-header__stats-strip">
          {stats.map((stat, index) =>
            stat.onClick ? (
              <button
                key={index}
                type="button"
                className="admin-stat-pill"
                onClick={stat.onClick}
              >
                <span className={`admin-stat-pill__icon admin-stat-pill__icon--${stat.colorClass}`}>
                  {stat.icon}
                </span>
                <span className="admin-stat-pill__main">
                  <span className="admin-stat-pill__value">{stat.value}</span>
                  <span className="admin-stat-pill__label">{stat.title}</span>
                </span>
              </button>
            ) : (
              <div key={index} className="admin-stat-pill admin-stat-pill--readonly">
                <span className={`admin-stat-pill__icon admin-stat-pill__icon--${stat.colorClass}`}>
                  {stat.icon}
                </span>
                <span className="admin-stat-pill__main">
                  <span className="admin-stat-pill__value">{stat.value}</span>
                  <span className="admin-stat-pill__label">{stat.title}</span>
                </span>
              </div>
            )
          )}
        </div>

        <div className="admin-header__actions">
          <button
            className="admin-header__btn admin-header__btn--primary"
            onClick={() => setTriggerAddUser(true)}
          >
            <Plus size={16} />
            مستخدم جديد
          </button>
        </div>
      </div>

      {/* Main Content — ERP shell بكل الـ sections */}
      <div className="admin-content admin-content--flush">
        <PermissionManagementShell
          triggerAddUser={triggerAddUser}
          onAddUserConsumed={() => setTriggerAddUser(false)}
        />
      </div>
    </div>
  );
};

export default Admin;
