import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Calendar,
  Users,
  FileText,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Target,
  Activity,
  MoreHorizontal,
  ExternalLink
} from 'lucide-react';

interface StatCard {
  id: string;
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ComponentType<any>;
  color: string;
  description: string;
  trend?: number[];
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface StatsWidgetProps {
  className?: string;
}

const StatsWidget: React.FC<StatsWidgetProps> = ({ className = '' }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [selectedView, setSelectedView] = useState<'overview' | 'detailed'>('overview');
  const navigate = useNavigate();

  // Mock statistics data
  const statsCards: StatCard[] = [
    {
      id: 'cases',
      title: 'إجمالي القضايا',
      value: 156,
      change: 12.5,
      changeType: 'increase',
      icon: FileText,
      color: 'var(--color-blue-500)',
      description: 'القضايا النشطة والمكتملة',
      trend: [120, 130, 145, 156]
    },
    {
      id: 'active_cases',
      title: 'القضايا النشطة',
      value: 89,
      change: 8.3,
      changeType: 'increase',
      icon: Activity,
      color: 'var(--color-green-500)',
      description: 'القضايا قيد المتابعة',
      trend: [78, 82, 85, 89]
    },
    {
      id: 'tasks',
      title: 'المهام المكتملة',
      value: 234,
      change: -2.1,
      changeType: 'decrease',
      icon: CheckCircle,
      color: 'var(--color-teal-500)',
      description: 'المهام المنجزة هذا الشهر',
      trend: [240, 238, 236, 234]
    },
    {
      id: 'revenue',
      title: 'الإيرادات المتوقعة',
      value: '2.4M',
      change: 15.7,
      changeType: 'increase',
      icon: DollarSign,
      color: 'var(--color-yellow-500)',
      description: 'القيمة المالية للقضايا',
      trend: [2.0, 2.1, 2.3, 2.4]
    },
    {
      id: 'clients',
      title: 'العملاء النشطين',
      value: 67,
      change: 5.2,
      changeType: 'increase',
      icon: Users,
      color: 'var(--color-purple-500)',
      description: 'عدد العملاء الحاليين',
      trend: [60, 62, 65, 67]
    },
    {
      id: 'deadlines',
      title: 'المواعيد القريبة',
      value: 12,
      change: 0,
      changeType: 'neutral',
      icon: AlertCircle,
      color: 'var(--color-red-500)',
      description: 'مواعيد خلال 7 أيام',
      trend: [10, 11, 12, 12]
    }
  ];

  // Chart data for case types
  const caseTypeData: ChartData[] = [
    { name: 'تجارية', value: 35, color: 'var(--color-blue-500)' },
    { name: 'مدنية', value: 28, color: 'var(--color-green-500)' },
    { name: 'عمالية', value: 18, color: 'var(--color-yellow-500)' },
    { name: 'أسرية', value: 12, color: 'var(--color-purple-500)' },
    { name: 'أخرى', value: 7, color: 'var(--color-gray-500)' }
  ];

  // Performance metrics
  const performanceMetrics = [
    { label: 'معدل النجاح', value: '94%', color: 'var(--color-green-500)' },
    { label: 'متوسط مدة القضية', value: '4.2 شهر', color: 'var(--color-blue-500)' },
    { label: 'رضا العملاء', value: '4.8/5', color: 'var(--color-yellow-500)' },
    { label: 'الكفاءة', value: '87%', color: 'var(--color-teal-500)' }
  ];

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp style={{ height: '16px', width: '16px', color: 'var(--color-green-500)' }} />;
      case 'decrease':
        return <TrendingDown style={{ height: '16px', width: '16px', color: 'var(--color-red-500)' }} />;
      default:
        return <div style={{ width: '16px', height: '16px' }} />;
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'increase': return 'var(--color-green-500)';
      case 'decrease': return 'var(--color-red-500)';
      default: return 'var(--color-gray-500)';
    }
  };

  const MiniChart: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'end', 
        height: '32px', 
        gap: '2px',
        marginTop: '8px'
      }}>
        {data.map((value, index) => (
          <div
            key={index}
            style={{
              height: `${((value - min) / range) * 100}%`,
              minHeight: '4px',
              width: '8px',
              backgroundColor: color,
              borderRadius: '2px',
              opacity: index === data.length - 1 ? 1 : 0.6
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text)',
            margin: 0,
            marginBottom: '4px'
          }}>
            لوحة الإحصائيات
          </h2>
          <p style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            margin: 0
          }}>
            تحليل شامل لأداء المكتب القانوني
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* View Details Button */}
          <button
            onClick={() => navigate('/admin/statistics')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-primary)',
              backgroundColor: 'var(--color-primary)10',
              border: '1px solid var(--color-primary)30',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)20';
              e.currentTarget.style.borderColor = 'var(--color-primary)50';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)10';
              e.currentTarget.style.borderColor = 'var(--color-primary)30';
            }}
          >
            <ExternalLink style={{ height: '14px', width: '14px' }} />
            عرض التفاصيل
          </button>

          {/* Period selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            style={{
              padding: '8px 12px',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text)',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <option value="week">هذا الأسبوع</option>
            <option value="month">هذا الشهر</option>
            <option value="quarter">هذا الربع</option>
            <option value="year">هذا العام</option>
          </select>

          {/* View toggle */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '2px'
          }}>
            {['overview', 'detailed'].map((view) => (
              <button
                key={view}
                onClick={() => setSelectedView(view as any)}
                style={{
                  padding: '6px 12px',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: selectedView === view ? 'white' : 'var(--color-text-secondary)',
                  backgroundColor: selectedView === view ? 'var(--color-primary)' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {view === 'overview' ? 'عام' : 'تفصيلي'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {statsCards.map((card) => (
          <motion.div
            key={card.id}
            whileHover={{ scale: 1.02 }}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Card Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: `${card.color}15`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <card.icon style={{ height: '24px', width: '24px', color: card.color }} />
              </div>
              
              <button style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)'
              }}>
                <MoreHorizontal style={{ height: '16px', width: '16px' }} />
              </button>
            </div>

            {/* Card Content */}
            <div>
              <h3 style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-secondary)',
                margin: 0,
                marginBottom: '8px'
              }}>
                {card.title}
              </h3>
              
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '12px',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-text)'
                }}>
                  {card.value}
                </span>
                
                {card.change !== 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {getChangeIcon(card.changeType)}
                    <span style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: getChangeColor(card.changeType)
                    }}>
                      {Math.abs(card.change)}%
                    </span>
                  </div>
                )}
              </div>
              
              <p style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
                margin: 0,
                marginBottom: '12px'
              }}>
                {card.description}
              </p>

              {/* Mini trend chart */}
              {card.trend && (
                <MiniChart data={card.trend} color={card.color} />
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      {selectedView === 'detailed' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {/* Case Types Chart */}
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text)',
                margin: 0
              }}>
                توزيع أنواع القضايا
              </h3>
              <PieChart style={{ height: '20px', width: '20px', color: 'var(--color-text-secondary)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {caseTypeData.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: item.color,
                      borderRadius: '50%'
                    }} />
                    <span style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text)'
                    }}>
                      {item.name}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text)'
                  }}>
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text)',
                margin: 0
              }}>
                مؤشرات الأداء
              </h3>
              <BarChart3 style={{ height: '20px', width: '20px', color: 'var(--color-text-secondary)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {performanceMetrics.map((metric, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)'
                    }}>
                      {metric.label}
                    </span>
                    <span style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: metric.color
                    }}>
                      {metric.value}
                    </span>
                  </div>
                  <div style={{
                    height: '6px',
                    backgroundColor: 'var(--color-secondary)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${75 + index * 5}%`,
                      backgroundColor: metric.color,
                      borderRadius: '3px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <h3 style={{
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text)',
          margin: 0,
          marginBottom: '16px'
        }}>
          إجراءات سريعة
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          {[
            { icon: FileText, label: 'إنشاء تقرير شهري', color: 'var(--color-blue-500)' },
            { icon: Calendar, label: 'جدولة اجتماع', color: 'var(--color-green-500)' },
            { icon: Users, label: 'إضافة عميل جديد', color: 'var(--color-purple-500)' },
            { icon: Target, label: 'تحديد أهداف جديدة', color: 'var(--color-yellow-500)' }
          ].map((action, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-secondary)';
                e.currentTarget.style.borderColor = action.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              <action.icon style={{ height: '16px', width: '16px', color: action.color }} />
              {action.label}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsWidget;
