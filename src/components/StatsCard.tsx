import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  FileText,
  CheckSquare,
  DollarSign,
  Users,
  Calendar,
  Activity
} from 'lucide-react';

interface StatData {
  id: string;
  title: string;
  value: string | number;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: React.ComponentType<any>;
  color: string;
}

const StatsCard: React.FC = () => {
  const navigate = useNavigate();
  const [currentStatIndex, setCurrentStatIndex] = useState(0);

  const stats: StatData[] = [
    {
      id: 'total_cases',
      title: 'إجمالي القضايا',
      value: 156,
      change: '+12%',
      changeType: 'increase',
      icon: FileText,
      color: 'var(--color-primary)'
    },
    {
      id: 'active_cases',
      title: 'القضايا النشطة',
      value: 89,
      change: '+8%',
      changeType: 'increase',
      icon: Activity,
      color: 'var(--color-blue-500)'
    },
    {
      id: 'completed_tasks',
      title: 'المهام المكتملة',
      value: 234,
      change: '+2%',
      changeType: 'increase',
      icon: CheckSquare,
      color: 'var(--color-success)'
    },
    {
      id: 'revenue',
      title: 'الإيرادات المتوقعة',
      value: '2.4M',
      change: '+15%',
      changeType: 'increase',
      icon: DollarSign,
      color: 'var(--color-green-500)'
    },
    {
      id: 'clients',
      title: 'العملاء النشطين',
      value: 67,
      change: '+5%',
      changeType: 'increase',
      icon: Users,
      color: 'var(--color-purple-500)'
    },
    {
      id: 'appointments',
      title: 'المواعيد القريبة',
      value: 12,
      change: '+3%',
      changeType: 'increase',
      icon: Calendar,
      color: 'var(--color-orange-500)'
    }
  ];

  // Auto-rotate stats every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStatIndex((prevIndex) => (prevIndex + 1) % stats.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [stats.length]);

  const currentStat = stats[currentStatIndex];
  const Icon = currentStat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate('/admin/statistics')}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        padding: '24px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '140px'
      }}
      whileHover={{ 
        scale: 1.02,
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)'
      }}
    >
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: -20,
        right: -20,
        width: '120px',
        height: '120px',
        background: `linear-gradient(135deg, ${currentStat.color}15, ${currentStat.color}05)`,
        borderRadius: '50%',
        transition: 'all 0.5s ease'
      }} />

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: 'var(--color-primary)15',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BarChart3 style={{ 
              height: '18px', 
              width: '18px', 
              color: 'var(--color-primary)' 
            }} />
          </div>
          <h3 style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text)',
            margin: 0
          }}>
            لوحة الإحصائيات
          </h3>
        </div>

        {/* Progress Indicators */}
        <div style={{
          display: 'flex',
          gap: '4px'
        }}>
          {stats.map((_, index) => (
            <div
              key={index}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: index === currentStatIndex 
                  ? 'var(--color-primary)' 
                  : 'var(--color-border)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>

      {/* Animated Stats Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStat.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'relative',
            zIndex: 1
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              backgroundColor: `${currentStat.color}15`,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon style={{ 
                height: '20px', 
                width: '20px', 
                color: currentStat.color 
              }} />
            </div>
            <div>
              <p style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
                margin: 0,
                marginBottom: '2px'
              }}>
                {currentStat.title}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-text)'
                }}>
                  {currentStat.value}
                </span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <TrendingUp style={{
                    height: '14px',
                    width: '14px',
                    color: 'var(--color-success)'
                  }} />
                  <span style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-success)'
                  }}>
                    {currentStat.change}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-secondary)',
            margin: 0
          }}>
            من الشهر الماضي
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Click to view details hint */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        right: '16px',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-primary)',
        fontWeight: 'var(--font-weight-medium)',
        opacity: 0.7
      }}>
        اضغط للتفاصيل
      </div>
    </motion.div>
  );
};

export default StatsCard;
