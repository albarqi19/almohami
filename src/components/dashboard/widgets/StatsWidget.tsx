import React from 'react';
import {
    FileText,
    CheckSquare,
    Calendar,
    AlertTriangle
} from 'lucide-react';

interface StatsData {
    totalCases: number;
    activeCases: number;
    totalTasks: number;
    completedTasks: number;
    upcomingSessions: number;
    documentsCount: number;
}

interface StatsWidgetProps {
    stats?: StatsData;
    onStatClick?: (type: string) => void;
}

const StatsWidget: React.FC<StatsWidgetProps> = ({
    stats: customStats,
    onStatClick
}) => {
    const stats = customStats || {
        totalCases: 42,
        activeCases: 15,
        totalTasks: 87,
        completedTasks: 64,
        upcomingSessions: 8,
        documentsCount: 156
    };

    const cards = [
        {
            id: 'cases',
            label: 'القضايا النشطة',
            value: stats.activeCases,
            total: stats.totalCases,
            icon: <FileText size={16} />,
            color: 'var(--law-navy)',
            bgColor: 'var(--law-navy-light)'
        },
        {
            id: 'tasks',
            label: 'المهام المكتملة',
            value: stats.completedTasks,
            total: stats.totalTasks,
            icon: <CheckSquare size={16} />,
            color: 'var(--status-green)',
            bgColor: 'var(--status-green-light)'
        },
        {
            id: 'sessions',
            label: 'الجلسات القادمة',
            value: stats.upcomingSessions,
            icon: <Calendar size={16} />,
            color: 'var(--status-orange)',
            bgColor: 'var(--status-orange-light)'
        },
        {
            id: 'active',
            label: 'تحتاج متابعة',
            value: 3,
            icon: <AlertTriangle size={16} />,
            color: 'var(--status-red)',
            bgColor: 'var(--status-red-light)'
        }
    ];

    return (
        <div className="stats-grid">
            {cards.map((card, index) => (
                <div
                    key={card.id}
                    className={`stat-card stat-card--${index + 1}`}
                    onClick={() => onStatClick?.(card.id)}
                >
                    <div
                        className="stat-card__icon"
                        style={{ background: card.bgColor, color: card.color }}
                    >
                        {card.icon}
                    </div>
                    <div className="stat-card__content">
                        <div className="stat-card__value">
                            {card.value}
                            {card.total && (
                                <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 400 }}>
                                    /{card.total}
                                </span>
                            )}
                        </div>
                        <div className="stat-card__label">{card.label}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default StatsWidget;
