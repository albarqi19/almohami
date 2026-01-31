import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Settings,
  Users,
  Shield,
  Scale,
  Activity,
  Bell,
  BarChart3,
  Plus,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Mail,
  Phone
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

interface User {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  national_id: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface PaginatedUsers {
  data: User[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [triggerAddUser, setTriggerAddUser] = useState(false);

  // Role options for filter
  const roleOptions = [
    { value: '', label: 'جميع الأدوار' },
    { value: 'admin', label: 'مدير النظام' },
    { value: 'partner', label: 'شريك' },
    { value: 'senior_lawyer', label: 'محامي أول' },
    { value: 'lawyer', label: 'محامي' },
    { value: 'legal_assistant', label: 'مساعد قانوني' },
    { value: 'assistant', label: 'مساعد' },
    { value: 'client', label: 'عميل' },
  ];

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch user stats
  const { data: statsData, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ['userStats'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: UserStats }>('/users/stats');
      return response.data;
    },
    staleTime: 60 * 1000,
  });

  // Fetch users with pagination
  const { data: usersData, isLoading: usersLoading, isFetching } = useQuery<PaginatedUsers>({
    queryKey: ['users', currentPage, debouncedSearch, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', '10');
      params.append('page', currentPage.toString());
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (roleFilter) params.append('role', roleFilter);

      const response = await apiClient.get<{ success: boolean; data: PaginatedUsers }>(`/users?${params}`);
      return response.data;
    },
    staleTime: 30 * 1000,
  });

  const handleNavigateToStats = () => {
    navigate('/admin/statistics');
  };

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'مدير النظام',
      partner: 'شريك',
      senior_lawyer: 'محامي أول',
      lawyer: 'محامي',
      legal_assistant: 'مساعد قانوني',
      assistant: 'مساعد',
      client: 'عميل',
    };
    return roles[role] || role;
  };

  const getRoleBadgeClass = (role: string) => {
    const classes: Record<string, string> = {
      admin: 'admin-role-badge--admin',
      partner: 'admin-role-badge--partner',
      senior_lawyer: 'admin-role-badge--lawyer',
      lawyer: 'admin-role-badge--lawyer',
      legal_assistant: 'admin-role-badge--assistant',
      assistant: 'admin-role-badge--assistant',
      client: 'admin-role-badge--client',
    };
    return classes[role] || '';
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

  const users = usersData?.data || [];
  const totalPages = usersData?.last_page || 1;
  const totalUsers = usersData?.total || 0;

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

        {/* Users List Section */}
        <div className="admin-section">
          <div className="admin-section__header">
            <div className="admin-section__title">
              <div className="admin-section__title-icon">
                <Users size={14} />
              </div>
              قائمة المستخدمين
              <span className="admin-section__count">{totalUsers}</span>
            </div>
            <div className="admin-section__actions">
              <select
                className="admin-role-filter"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <div className="admin-search-box">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو البريد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="admin-section__content">
            {usersLoading ? (
              <div className="admin-users-loading">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="admin-skeleton" style={{ height: 60, marginBottom: 8 }} />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="admin-empty">
                <Users size={40} />
                <p>لا يوجد مستخدمين</p>
              </div>
            ) : (
              <>
                <div className="admin-users-table-wrapper">
                  {isFetching && (
                    <div className="table-loading-overlay">
                      <RefreshCw size={24} className="spinning" />
                    </div>
                  )}
                  <table className="admin-users-table">
                    <thead>
                      <tr>
                        <th>المستخدم</th>
                        <th>الدور</th>
                        <th>التواصل</th>
                        <th>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="admin-user-cell">
                              <div className="admin-user-avatar">
                                {user.name?.charAt(0) || '؟'}
                              </div>
                              <div className="admin-user-info">
                                <div className="admin-user-name">{user.name}</div>
                                <div className="admin-user-id">{user.national_id || '-'}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`admin-role-badge ${getRoleBadgeClass(user.role)}`}>
                              {getRoleName(user.role)}
                            </span>
                          </td>
                          <td>
                            <div className="admin-contact-cell">
                              {user.email && (
                                <div className="admin-contact-item">
                                  <Mail size={12} />
                                  <span>{user.email}</span>
                                </div>
                              )}
                              {user.phone && (
                                <div className="admin-contact-item">
                                  <Phone size={12} />
                                  <span dir="ltr">{user.phone}</span>
                                </div>
                              )}
                              {!user.email && !user.phone && <span className="admin-no-contact">-</span>}
                            </div>
                          </td>
                          <td>
                            <span className={`admin-status-badge ${user.is_active ? 'admin-status-badge--active' : 'admin-status-badge--inactive'}`}>
                              {user.is_active ? (
                                <><UserCheck size={12} /> نشط</>
                              ) : (
                                <><UserX size={12} /> معطل</>
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="admin-pagination">
                    <div className="admin-pagination__info">
                      صفحة {currentPage} من {totalPages}
                    </div>
                    <div className="admin-pagination__controls">
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || isFetching}
                      >
                        <ChevronRight size={16} />
                        السابق
                      </button>
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || isFetching}
                      >
                        التالي
                        <ChevronLeft size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Permission Management Section */}
        <div className="admin-section">
          <div className="admin-section__header">
            <div className="admin-section__title">
              <div className="admin-section__title-icon">
                <Shield size={14} />
              </div>
              إدارة الصلاحيات والأدوار
            </div>
          </div>
          <div className="admin-section__content">
            <PermissionManagement
              autoOpenAddUser={triggerAddUser}
              onAddUserModalChange={(isOpen) => !isOpen && setTriggerAddUser(false)}
            />
          </div>
        </div>

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
