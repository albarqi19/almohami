// [P4·UX-11/COL-4.3] رسم بياني للتحصيل — كل الألوان عبر tokens (لا hex مثبّت) فيتبع الثيمات الثلاثة.
import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line,
} from 'recharts';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import type { MonthlyStats } from '../../types/billing';

interface CollectionChartProps {
  data: MonthlyStats[];
  title?: string;
  height?: number;
  chartType?: 'area' | 'bar' | 'composed';
  showLegend?: boolean;
  flat?: boolean;
}

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

// ألوان مربوطة بـ tokens (SVG يقبل قيم var()).
const C_INVOICED = 'var(--status-blue)';
const C_COLLECTED = 'var(--status-green)';
const C_RATE = 'var(--status-orange)';
const C_GRID = 'var(--color-border)';
const C_AXIS = 'var(--color-text-secondary)';

const CollectionChart: React.FC<CollectionChartProps> = ({ data, title = 'التحصيل الشهري', height = 350, chartType = 'composed', showLegend = true, flat = false }) => {
  const [activeChartType, setActiveChartType] = useState(chartType);

  const chartData = data.map((item) => ({
    ...item,
    name: item.month_name || ARABIC_MONTHS[item.month - 1],
    invoiced: item.invoiced || 0,
    collected: item.collected || 0,
    rate: item.invoiced > 0 ? Number(((item.collected / item.invoiced) * 100).toFixed(1)) : 0,
  }));

  const formatAmount = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} م`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)} ألف`;
    return value.toFixed(0);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px', borderRadius: '8px', boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.15))', border: '1px solid var(--color-border)', direction: 'rtl' }}>
          <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--color-heading)' }}>{label}</div>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: entry.color }} />
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{entry.name}:</span>
              <span style={{ fontWeight: 600, color: 'var(--color-heading)', fontSize: '13px' }}>
                {entry.dataKey === 'rate' ? `${entry.value}%` : `${new Intl.NumberFormat('en-US').format(entry.value)} ر.س`}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const legendFormatter = (value: string) => <span style={{ color: 'var(--color-text)', fontSize: '13px' }}>{value}</span>;
  const axisTick = { fontSize: 12, fill: C_AXIS };

  const renderComposedChart = () => (
    <ComposedChart data={chartData}>
      <CartesianGrid strokeDasharray="3 3" stroke={C_GRID} />
      <XAxis dataKey="name" tick={axisTick} axisLine={{ stroke: C_GRID }} />
      <YAxis yAxisId="left" tick={axisTick} tickFormatter={formatAmount} axisLine={{ stroke: C_GRID }} />
      <YAxis yAxisId="right" orientation="left" tick={axisTick} tickFormatter={(v) => `${v}%`} domain={[0, 100]} axisLine={{ stroke: C_GRID }} />
      <Tooltip content={<CustomTooltip />} />
      {showLegend && <Legend wrapperStyle={{ paddingTop: '20px' }} formatter={legendFormatter} />}
      <Bar yAxisId="left" dataKey="invoiced" name="المفوتر" fill={C_INVOICED} radius={[4, 4, 0, 0]} />
      <Bar yAxisId="left" dataKey="collected" name="المحصّل" fill={C_COLLECTED} radius={[4, 4, 0, 0]} />
      <Line yAxisId="right" type="monotone" dataKey="rate" name="نسبة التحصيل" stroke={C_RATE} strokeWidth={2} dot={{ fill: C_RATE, strokeWidth: 2 }} />
    </ComposedChart>
  );

  const renderAreaChart = () => (
    <AreaChart data={chartData}>
      <defs>
        <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C_INVOICED} stopOpacity={0.7} /><stop offset="95%" stopColor={C_INVOICED} stopOpacity={0} /></linearGradient>
        <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C_COLLECTED} stopOpacity={0.7} /><stop offset="95%" stopColor={C_COLLECTED} stopOpacity={0} /></linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke={C_GRID} />
      <XAxis dataKey="name" tick={axisTick} axisLine={{ stroke: C_GRID }} />
      <YAxis tick={axisTick} tickFormatter={formatAmount} axisLine={{ stroke: C_GRID }} />
      <Tooltip content={<CustomTooltip />} />
      {showLegend && <Legend wrapperStyle={{ paddingTop: '20px' }} formatter={legendFormatter} />}
      <Area type="monotone" dataKey="invoiced" name="المفوتر" stroke={C_INVOICED} fillOpacity={1} fill="url(#colorInvoiced)" />
      <Area type="monotone" dataKey="collected" name="المحصّل" stroke={C_COLLECTED} fillOpacity={1} fill="url(#colorCollected)" />
    </AreaChart>
  );

  const renderBarChart = () => (
    <BarChart data={chartData}>
      <CartesianGrid strokeDasharray="3 3" stroke={C_GRID} />
      <XAxis dataKey="name" tick={axisTick} axisLine={{ stroke: C_GRID }} />
      <YAxis tick={axisTick} tickFormatter={formatAmount} axisLine={{ stroke: C_GRID }} />
      <Tooltip content={<CustomTooltip />} />
      {showLegend && <Legend wrapperStyle={{ paddingTop: '20px' }} formatter={legendFormatter} />}
      <Bar dataKey="invoiced" name="المفوتر" fill={C_INVOICED} radius={[4, 4, 0, 0]} />
      <Bar dataKey="collected" name="المحصّل" fill={C_COLLECTED} radius={[4, 4, 0, 0]} />
    </BarChart>
  );

  const toggleBtn = (type: typeof activeChartType, label: string, Icon?: React.ComponentType<{ size?: number }>) => (
    <button
      type="button"
      onClick={() => setActiveChartType(type)}
      style={{
        padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-border)',
        backgroundColor: activeChartType === type ? 'var(--color-primary)' : 'transparent',
        color: activeChartType === type ? '#fff' : 'var(--color-text-secondary)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px',
      }}
    >
      {Icon && <Icon size={14} />}
      {label}
    </button>
  );

  return (
    <div style={flat ? { direction: 'rtl' } : { backgroundColor: 'var(--color-surface)', borderRadius: '12px', padding: '20px', border: '1px solid var(--color-border)', direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={20} color="var(--color-primary)" />
          {title && <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-heading)', margin: 0 }}>{title}</h3>}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {toggleBtn('bar', 'أعمدة', BarChart3)}
          {toggleBtn('area', 'مساحي', TrendingUp)}
          {toggleBtn('composed', 'مركب')}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        {activeChartType === 'area' ? renderAreaChart() : activeChartType === 'bar' ? renderBarChart() : renderComposedChart()}
      </ResponsiveContainer>

      {chartData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>إجمالي المفوتر</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: C_INVOICED }}>{new Intl.NumberFormat('en-US').format(chartData.reduce((s, i) => s + i.invoiced, 0))} ر.س</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>إجمالي المحصّل</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: C_COLLECTED }}>{new Intl.NumberFormat('en-US').format(chartData.reduce((s, i) => s + i.collected, 0))} ر.س</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>متوسط نسبة التحصيل</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: C_RATE }}>
              {(() => {
                const ti = chartData.reduce((s, i) => s + i.invoiced, 0);
                const tc = chartData.reduce((s, i) => s + i.collected, 0);
                return ti > 0 ? ((tc / ti) * 100).toFixed(1) : 0;
              })()}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionChart;
