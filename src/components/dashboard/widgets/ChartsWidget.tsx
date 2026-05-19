import React from 'react';
import { motion } from 'framer-motion';
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    Area,
    AreaChart
} from 'recharts';
import * as Tabs from '@radix-ui/react-tabs';

interface ChartsWidgetProps {
    casesByType?: { name: string; value: number; color: string }[];
    monthlyStats?: { month: string; cases: number; tasks: number }[];
    performanceData?: { week: string; completed: number; pending: number }[];
}

const ChartsWidget: React.FC<ChartsWidgetProps> = ({
    casesByType: initialCasesByType,
    monthlyStats: initialMonthlyStats,
    performanceData: initialPerformanceData
}) => {
    // Default demo data
    const casesByType = initialCasesByType || [
        { name: 'عقاري', value: 35, color: '#7B68EE' },
        { name: 'تجاري', value: 25, color: '#00BFA5' },
        { name: 'عمالي', value: 20, color: '#FF6B9D' },
        { name: 'أحوال شخصية', value: 12, color: '#FF9500' },
        { name: 'جنائي', value: 8, color: '#0096FF' }
    ];

    const monthlyStats = initialMonthlyStats || [
        { month: 'يناير', cases: 12, tasks: 45 },
        { month: 'فبراير', cases: 15, tasks: 52 },
        { month: 'مارس', cases: 18, tasks: 48 },
        { month: 'أبريل', cases: 14, tasks: 60 },
        { month: 'مايو', cases: 22, tasks: 55 },
        { month: 'يونيو', cases: 19, tasks: 70 }
    ];

    const performanceData = initialPerformanceData || [
        { week: 'الأسبوع 1', completed: 12, pending: 5 },
        { week: 'الأسبوع 2', completed: 18, pending: 8 },
        { week: 'الأسبوع 3', completed: 15, pending: 4 },
        { week: 'الأسبوع 4', completed: 25, pending: 6 }
    ];

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'var(--dashboard-card)',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    boxShadow: 'var(--shadow-dropdown)',
                    border: '1px solid var(--color-border)'
                }}>
                    <p style={{
                        fontWeight: 600,
                        marginBottom: '4px',
                        color: 'var(--color-text)'
                    }}>
                        {label}
                    </p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{
                            fontSize: '13px',
                            color: entry.color,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: entry.color
                            }} />
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const tabStyle = {
        padding: '8px 16px',
        border: 'none',
        background: 'transparent',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--color-text-secondary)',
        transition: 'all 0.2s ease'
    };

    const activeTabStyle = {
        ...tabStyle,
        background: 'var(--clickup-purple)',
        color: 'white'
    };

    return (
        <Tabs.Root defaultValue="pie" style={{ height: '100%' }}>
            <Tabs.List style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                padding: '4px',
                background: 'var(--notion-gray-100)',
                borderRadius: '10px',
                width: 'fit-content'
            }}>
                <Tabs.Trigger value="pie" style={tabStyle} className="chart-tab">
                    القضايا حسب النوع
                </Tabs.Trigger>
                <Tabs.Trigger value="bar" style={tabStyle} className="chart-tab">
                    الإحصائيات الشهرية
                </Tabs.Trigger>
                <Tabs.Trigger value="area" style={tabStyle} className="chart-tab">
                    الأداء الأسبوعي
                </Tabs.Trigger>
            </Tabs.List>

            {/* Pie Chart */}
            <Tabs.Content value="pie">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ height: '250px' }}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={casesByType}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={3}
                                dataKey="value"
                                animationBegin={0}
                                animationDuration={800}
                            >
                                {casesByType.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Legend */}
                <div className="chart-legend">
                    {casesByType.map((item, index) => (
                        <motion.div
                            key={item.name}
                            className="chart-legend__item"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <span
                                className="chart-legend__dot"
                                style={{ background: item.color }}
                            />
                            <span>{item.name}</span>
                            <span style={{
                                fontWeight: 600,
                                color: 'var(--color-text)',
                                marginRight: '4px'
                            }}>
                                {item.value}%
                            </span>
                        </motion.div>
                    ))}
                </div>
            </Tabs.Content>

            {/* Bar Chart */}
            <Tabs.Content value="bar">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ height: '300px' }}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyStats} barGap={4}>
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar
                                dataKey="cases"
                                name="القضايا"
                                fill="#7B68EE"
                                radius={[6, 6, 0, 0]}
                                animationDuration={800}
                            />
                            <Bar
                                dataKey="tasks"
                                name="المهام"
                                fill="#00BFA5"
                                radius={[6, 6, 0, 0]}
                                animationDuration={800}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>
            </Tabs.Content>

            {/* Area Chart */}
            <Tabs.Content value="area">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ height: '300px' }}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={performanceData}>
                            <defs>
                                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#7B68EE" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#7B68EE" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#FF6B9D" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#FF6B9D" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="week"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="completed"
                                name="مكتمل"
                                stroke="#7B68EE"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorCompleted)"
                                animationDuration={1000}
                            />
                            <Area
                                type="monotone"
                                dataKey="pending"
                                name="معلق"
                                stroke="#FF6B9D"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorPending)"
                                animationDuration={1000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </motion.div>
            </Tabs.Content>

            {/* Tab Styling */}
            <style>{`
        .chart-tab[data-state="active"] {
          background: var(--clickup-purple) !important;
          color: white !important;
        }
        .chart-tab:hover:not([data-state="active"]) {
          background: var(--notion-gray-200);
        }
      `}</style>
        </Tabs.Root>
    );
};

export default ChartsWidget;
