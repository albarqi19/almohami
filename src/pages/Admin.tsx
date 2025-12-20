import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Users,
  Shield,
  Database,
  Activity,
  Bell,
  BarChart3,
  Plus,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PermissionManagement from '../components/PermissionManagement';
import '../styles/admin-page.css';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleNavigateToStats = () => {
    navigate('/admin/statistics');
  };

  const stats = [
    {
      icon: <Users size={18} />,
      title: 'إجمالي المستخدمين',
      value: '47',
      subtitle: '12 نشط اليوم',
      colorClass: 'navy'
    },
    {
      icon: <Shield size={18} />,
      title: 'الأدوار النشطة',
      value: '6',
      subtitle: '24 صلاحية',
      colorClass: 'green'
    },
    {
      icon: <Database size={18} />,
      title: 'حجم البيانات',
      value: '2.4 GB',
      subtitle: 'آخر نسخة: اليوم',
      colorClass: 'blue'
    },
    {
      icon: <Activity size={18} />,
      title: 'النشاط اليومي',
      value: '156',
      subtitle: 'عملية اليوم',
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
      icon: <Database size={18} />,
      title: 'النسخ الاحتياطي',
      description: 'إدارة النسخ الاحتياطية واستعادة البيانات',
      items: ['إنشاء نسخة احتياطية', 'جدولة النسخ التلقائية', 'استعادة البيانات'],
      colorClass: 'green'
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
          <button className="admin-header__btn">
            <RefreshCw size={16} />
            تحديث
          </button>
          <button className="admin-header__btn admin-header__btn--primary">
            <Plus size={16} />
            مستخدم جديد
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-content">
        {/* Stats Grid */}
        {loading ? (
          <div className="admin-stats-grid">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="admin-stat-card">
                <div className="admin-skeleton" style={{ width: 32, height: 32 }} />
                <div style={{ flex: 1 }}>
                  <div className="admin-skeleton" style={{ height: 22, width: '40%', marginBottom: 4 }} />
                  <div className="admin-skeleton" style={{ height: 13, width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
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
        )}

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
            {loading ? (
              <div className="admin-skeleton" style={{ height: 200 }} />
            ) : (
              <PermissionManagement />
            )}
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
            {loading ? (
              <div className="admin-settings-grid">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="admin-setting-card">
                    <div className="admin-skeleton" style={{ height: 36, width: 36, marginBottom: 10 }} />
                    <div className="admin-skeleton" style={{ height: 14, width: '50%', marginBottom: 8 }} />
                    <div className="admin-skeleton" style={{ height: 12, width: '80%' }} />
                  </div>
                ))}
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
