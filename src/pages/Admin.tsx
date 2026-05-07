import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Settings,
  Users,
  Scale,
  Activity,
  Bell,
  BarChart3,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PermissionManagement from '../components/PermissionManagement';
import { apiClient } from '../utils/api';
import '../styles/admin-page.css';

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

  const handleNavigateToStats = () => {
    navigate('/admin/statistics');
  };

  const stats = [
    {
      icon: <Users size={18} />,
      title: 'إجمالي المستخدمين',
      value: statsLoading ? '-' : statsData?.total.toString() || '0',
      subtitle: `${statsLoading ? '-' : statsData?.active || 0} نشط`,
      colorClass: 'navy'
    },
    {
      icon: <Scale size={18} />,
      title: 'المحامين',
      value: statsLoading ? '-' : statsData?.lawyers.toString() || '0',
      subtitle: 'محامي ومستشار',
      colorClass: 'green'
    },
    {
      icon: <Users size={18} />,
      title: 'العملاء',
      value: statsLoading ? '-' : statsData?.clients.toString() || '0',
      subtitle: 'عميل مسجل',
      colorClass: 'blue'
    },
    {
      icon: <Activity size={18} />,
      title: 'المساعدين',
      value: statsLoading ? '-' : statsData?.assistants.toString() || '0',
      subtitle: 'مساعد قانوني',
      colorClass: 'orange'
    }
  ];

  const settingsCards = [
    {
      icon: <Settings size={18} />,
      title: 'الإعدادات العامة',
      description: 'إدارة إعدادات النظام العامة، المظهر، واللغة',
      items: ['إعدادات المظهر', 'تكوين الإشعارات', 'إعدادات الأمان'],
      colorClass: 'blue'
    },
    {
      icon: <Bell size={18} />,
      title: 'إدارة الإشعارات',
      description: 'تكوين وإدارة إشعارات النظام والمستخدمين',
      items: ['إعدادات الإشعارات', 'قوالب الرسائل', 'سجل الإشعارات'],
      colorClass: 'orange'
    },
    {
      icon: <BarChart3 size={18} />,
      title: 'لوحة الإحصائيات',
      description: 'تحليل شامل لأداء المكتب القانوني',
      items: ['إحصائيات القضايا', 'تحليل الإيرادات', 'مؤشرات الأداء'],
      colorClass: 'navy',
      onClick: handleNavigateToStats
    }
  ];

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header__title-area">
          <h1>
            <Settings size={18} />
            لوحة الإدارة
          </h1>
          <p>إدارة النظام والمستخدمين والإعدادات العامة</p>
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

      {/* Main Content */}
      <div className="admin-content">
        {/* Stats Grid */}
        <div className="admin-stats-grid">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="admin-stat-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -2 }}
            >
              <div className={`admin-stat-card__icon admin-stat-card__icon--${stat.colorClass}`}>
                {stat.icon}
              </div>
              <div className="admin-stat-card__content">
                <div className="admin-stat-card__value">{stat.value}</div>
                <div className="admin-stat-card__label">{stat.title}</div>
                <div className="admin-stat-card__subtitle">{stat.subtitle}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Users + Roles + Permissions (unified ERP-style section) */}
        <PermissionManagement
          autoOpenAddUser={triggerAddUser}
          onAddUserModalChange={(isOpen) => !isOpen && setTriggerAddUser(false)}
        />

        {/* Settings Cards Section */}
        <div className="admin-section">
          <div className="admin-section__header">
            <div className="admin-section__title">
              <div className="admin-section__title-icon">
                <Settings size={14} />
              </div>
              إعدادات النظام
            </div>
          </div>
          <div className="admin-section__content">
            <div className="admin-settings-grid">
              {settingsCards.map((card, index) => (
                <motion.div
                  key={index}
                  className="admin-setting-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -2 }}
                  onClick={card.onClick}
                  style={{ cursor: card.onClick ? 'pointer' : 'default' }}
                >
                  <div className="admin-setting-card__header">
                    <div className={`admin-setting-card__icon admin-setting-card__icon--${card.colorClass}`}>
                      {card.icon}
                    </div>
                    <div className="admin-setting-card__title">{card.title}</div>
                  </div>
                  <div className="admin-setting-card__desc">{card.description}</div>
                  <ul className="admin-setting-card__list">
                    {card.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
