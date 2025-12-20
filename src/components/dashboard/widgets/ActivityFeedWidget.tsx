import React from 'react';
import {
    FileText,
    CheckSquare,
    Calendar,
    MessageSquare,
    Upload,
    User,
    ArrowLeft
} from 'lucide-react';

interface Activity {
    id: string;
    type: 'document' | 'task' | 'session' | 'message' | 'case';
    title: string;
    description: string;
    user: string;
    time: string;
}

interface ActivityFeedWidgetProps {
    activities?: Activity[];
    limit?: number;
    onActivityClick?: (activity: Activity) => void;
}

const ActivityFeedWidget: React.FC<ActivityFeedWidgetProps> = ({
    activities: initialActivities,
    limit = 6,
    onActivityClick
}) => {
    const defaultActivities: Activity[] = [
        {
            id: '1',
            type: 'document',
            title: 'رفع وثيقة جديدة',
            description: 'صك الملكية الأصلي',
            user: 'أحمد محمد',
            time: 'منذ 5 دقائق'
        },
        {
            id: '2',
            type: 'task',
            title: 'إكمال مهمة',
            description: 'مراجعة عقد الشراكة',
            user: 'سارة أحمد',
            time: 'منذ 30 دقيقة'
        },
        {
            id: '3',
            type: 'session',
            title: 'موعد جلسة جديد',
            description: 'جلسة في المحكمة العامة',
            user: 'النظام',
            time: 'منذ ساعة'
        },
        {
            id: '4',
            type: 'message',
            title: 'رسالة جديدة',
            description: 'استفسار من الموكل',
            user: 'عبدالله',
            time: 'منذ 2 ساعة'
        },
        {
            id: '5',
            type: 'case',
            title: 'قضية جديدة',
            description: 'قضية عمالية - فصل',
            user: 'خالد',
            time: 'منذ 3 ساعات'
        }
    ];

    const activities = (initialActivities || defaultActivities).slice(0, limit);

    const getIcon = (type: Activity['type']) => {
        const icons = {
            document: { icon: <Upload size={12} />, color: 'var(--clickup-blue)', bg: 'var(--clickup-blue-light)' },
            task: { icon: <CheckSquare size={12} />, color: 'var(--clickup-green)', bg: 'var(--clickup-green-light)' },
            session: { icon: <Calendar size={12} />, color: 'var(--clickup-orange)', bg: 'var(--clickup-orange-light)' },
            message: { icon: <MessageSquare size={12} />, color: 'var(--clickup-purple)', bg: 'var(--clickup-purple-light)' },
            case: { icon: <FileText size={12} />, color: 'var(--clickup-pink)', bg: 'rgba(255, 107, 157, 0.1)' }
        };
        return icons[type] || icons.case;
    };

    return (
        <div className="activity-timeline">
            {activities.map((activity) => {
                const iconConfig = getIcon(activity.type);

                return (
                    <div
                        key={activity.id}
                        className="activity-item"
                        onClick={() => onActivityClick?.(activity)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div
                            className="activity-item__icon"
                            style={{ background: iconConfig.bg, color: iconConfig.color }}
                        >
                            {iconConfig.icon}
                        </div>

                        <div className="activity-item__content">
                            <div className="activity-item__title">
                                <strong>{activity.title}</strong>
                            </div>
                            <div className="activity-item__desc">{activity.description}</div>
                            <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                <User size={9} style={{ marginLeft: '2px' }} />
                                {activity.user}
                            </div>
                        </div>

                        <div className="activity-item__time">{activity.time}</div>
                    </div>
                );
            })}

            <button
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '10px',
                    marginTop: '8px',
                    borderRadius: '6px',
                    background: 'var(--quiet-gray-100)',
                    color: 'var(--clickup-purple)',
                    fontSize: '12px',
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.1s'
                }}
            >
                عرض جميع الأنشطة
                <ArrowLeft size={12} />
            </button>
        </div>
    );
};

export default ActivityFeedWidget;
