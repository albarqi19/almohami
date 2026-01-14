import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Line,
} from 'recharts';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import type { MonthlyStats } from '../../types/billing';

interface CollectionChartProps {
  data: MonthlyStats[];
  title?: string;
  height?: number;
  chartType?: 'area' | 'bar' | 'composed';
  showLegend?: boolean;
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const CollectionChart: React.FC<CollectionChartProps> = ({
  data,
  title = 'التحصيل الشهري',
  height = 350,
  chartType = 'composed',
  showLegend = true,
}) => {
  const [activeChartType, setActiveChartType] = useState(chartType);

  // تحويل البيانات للرسم البياني
  const chartData = data.map(item => ({
    ...item,
    name: item.month_name || ARABIC_MONTHS[item.month - 1],
    invoiced: item.invoiced || 0,
    collected: item.collected || 0,
    rate: item.invoiced > 0 ? ((item.collected / item.invoiced) * 100).toFixed(1) : 0,
  }));

  // تنسيق المبلغ
  const formatAmount = (value: number) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + ' م';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(0) + ' ألف';
    }
    return value.toFixed(0);
  };

  // Tooltip مخصص
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid #e5e7eb',
            direction: 'rtl',
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '8px', color: '#111827' }}>
            {label}
          </div>
          {payload.map((entry: any, index: number) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px',
              }}
            >
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  backgroundColor: entry.color,
                }}
              />
              <span style={{ color: '#6b7280', fontSize: '13px' }}>
                {entry.name}:
              </span>
              <span style={{ fontWeight: '600', color: '#111827', fontSize: '13px' }}>
                {entry.dataKey === 'rate'
                  ? `${entry.value}%`
                  : new Intl.NumberFormat('ar-SA').format(entry.value) + ' ر.س'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // رسم بياني مركب
  const renderComposedChart = () => (
    <ComposedChart data={chartData}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis
        dataKey="name"
        tick={{ fontSize: 12, fill: '#6b7280' }}
        axisLine={{ stroke: '#e5e7eb' }}
      />
      <YAxis
        yAxisId="left"
        tick={{ fontSize: 12, fill: '#6b7280' }}
        tickFormatter={formatAmount}
        axisLine={{ stroke: '#e5e7eb' }}
      />
      <YAxis
        yAxisId="right"
        orientation="right"
        tick={{ fontSize: 12, fill: '#6b7280' }}
        tickFormatter={(v) => `${v}%`}
        domain={[0, 100]}
        axisLine={{ stroke: '#e5e7eb' }}
      />
      <Tooltip content={<CustomTooltip />} />
      {showLegend && (
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          formatter={(value) => <span style={{ color: '#374151', fontSize: '13px' }}>{value}</span>}
        />
      )}
      <Bar
        yAxisId="left"
        dataKey="invoiced"
        name="المفوتر"
        fill="#93c5fd"
        radius={[4, 4, 0, 0]}
      />
      <Bar
        yAxisId="left"
        dataKey="collected"
        name="المحصّل"
        fill="#3b82f6"
        radius={[4, 4, 0, 0]}
      />
      <Line
        yAxisId="right"
        type="monotone"
        dataKey="rate"
        name="نسبة التحصيل"
        stroke="#059669"
        strokeWidth={2}
        dot={{ fill: '#059669', strokeWidth: 2 }}
      />
    </ComposedChart>
  );

  // رسم بياني مساحي
  const renderAreaChart = () => (
    <AreaChart data={chartData}>
      <defs>
        <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.8} />
          <stop offset="95%" stopColor="#93c5fd" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis
        dataKey="name"
        tick={{ fontSize: 12, fill: '#6b7280' }}
        axisLine={{ stroke: '#e5e7eb' }}
      />
      <YAxis
        tick={{ fontSize: 12, fill: '#6b7280' }}
        tickFormatter={formatAmount}
        axisLine={{ stroke: '#e5e7eb' }}
      />
      <Tooltip content={<CustomTooltip />} />
      {showLegend && (
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          formatter={(value) => <span style={{ color: '#374151', fontSize: '13px' }}>{value}</span>}
        />
      )}
      <Area
        type="monotone"
        dataKey="invoiced"
        name="المفوتر"
        stroke="#93c5fd"
        fillOpacity={1}
        fill="url(#colorInvoiced)"
      />
      <Area
        type="monotone"
        dataKey="collected"
        name="المحصّل"
        stroke="#3b82f6"
        fillOpacity={1}
        fill="url(#colorCollected)"
      />
    </AreaChart>
  );

  // رسم بياني شريطي
  const renderBarChart = () => (
    <BarChart data={chartData}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis
        dataKey="name"
        tick={{ fontSize: 12, fill: '#6b7280' }}
        axisLine={{ stroke: '#e5e7eb' }}
      />
      <YAxis
        tick={{ fontSize: 12, fill: '#6b7280' }}
        tickFormatter={formatAmount}
        axisLine={{ stroke: '#e5e7eb' }}
      />
      <Tooltip content={<CustomTooltip />} />
      {showLegend && (
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          formatter={(value) => <span style={{ color: '#374151', fontSize: '13px' }}>{value}</span>}
        />
      )}
      <Bar
        dataKey="invoiced"
        name="المفوتر"
        fill="#93c5fd"
        radius={[4, 4, 0, 0]}
      />
      <Bar
        dataKey="collected"
        name="المحصّل"
        fill="#3b82f6"
        radius={[4, 4, 0, 0]}
      />
    </BarChart>
  );

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        direction: 'rtl',
      }}
    >
      {/* العنوان وأزرار التبديل */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={20} color="#3b82f6" />
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
            {title}
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setActiveChartType('bar')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeChartType === 'bar' ? '#3b82f6' : '#f3f4f6',
              color: activeChartType === 'bar' ? 'white' : '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
            }}
          >
            <BarChart3 size={14} />
            أعمدة
          </button>
          <button
            onClick={() => setActiveChartType('area')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeChartType === 'area' ? '#3b82f6' : '#f3f4f6',
              color: activeChartType === 'area' ? 'white' : '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
            }}
          >
            <TrendingUp size={14} />
            مساحي
          </button>
          <button
            onClick={() => setActiveChartType('composed')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeChartType === 'composed' ? '#3b82f6' : '#f3f4f6',
              color: activeChartType === 'composed' ? 'white' : '#6b7280',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            مركب
          </button>
        </div>
      </div>

      {/* الرسم البياني */}
      <ResponsiveContainer width="100%" height={height}>
        {activeChartType === 'area'
          ? renderAreaChart()
          : activeChartType === 'bar'
          ? renderBarChart()
          : renderComposedChart()}
      </ResponsiveContainer>

      {/* ملخص */}
      {chartData.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
              إجمالي المفوتر
            </div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#93c5fd' }}>
              {new Intl.NumberFormat('ar-SA').format(
                chartData.reduce((sum, item) => sum + item.invoiced, 0)
              )} ر.س
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
              إجمالي المحصّل
            </div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#3b82f6' }}>
              {new Intl.NumberFormat('ar-SA').format(
                chartData.reduce((sum, item) => sum + item.collected, 0)
              )} ر.س
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
              متوسط نسبة التحصيل
            </div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#059669' }}>
              {(() => {
                const totalInvoiced = chartData.reduce((sum, item) => sum + item.invoiced, 0);
                const totalCollected = chartData.reduce((sum, item) => sum + item.collected, 0);
                return totalInvoiced > 0
                  ? ((totalCollected / totalInvoiced) * 100).toFixed(1)
                  : 0;
              })()}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionChart;
