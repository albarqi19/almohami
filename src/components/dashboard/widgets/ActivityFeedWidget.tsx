import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText,
    CheckSquare,
    Calendar,
    MessageSquare,
    Upload,
    User,
    ArrowLeft,
    Loader2,
    Activity as ActivityIcon
} from 'lucide-react';
import type { RecentActivity } from '../../../services/dashboardService';

interface Activity {
    id: string | number;
    type: 'document' | 'task' | 'session' | 'message' | 'case' | 'general' | string;
    title?: string;
    description: string;
    user?: string;
    performer_name?: string;
    time?: string;
    time_ago?: string;
    case_title?: string;
}

interface ActivityFeedWidgetProps {
    activities?: RecentActivity[] | Activity[];
    limit?: number;
    onActivityClick?: (activity: Activity) => void;
}

const ActivityFeedWidget: React.FC<ActivityFeedWidgetProps> = ({
    activities: initialActivities,
    limit = 6,
    onActivityClick
}) => {
    const navigate = useNavigate();

    // تحويل البيانات من API إلى الشكل المتوقع
    const normalizeActivity = (a: RecentActivity | Activity): Activity => ({
        id: a.id,
        type: a.type || 'general',
        title: (a as Activity).title || getActivityTitle(a.type),
        description: a.description || '',
        user: (a as RecentActivity).performer_name || (a as Activity).user || 'النظام',
        time: (a as RecentActivity).time_ago || (a as Activity).time || '',
        case_title: (a as RecentActivity).case_title || undefined
    });

    const getActivityTitle = (type: string): string => {
        const titles: Record<string, string> = {
            document: 'نشاط وثيقة',
            task: 'نشاط مهمة',
            session: 'نشاط جلسة',
            message: 'رسالة',
            case: 'نشاط قضية',
            general: 'نشاط'
        };
        return titles[type] || 'نشاط';
    };

    const activities = initialActivities?.slice(0, limit).map(normalizeActivity) || [];

    const getIcon = (type: string) => {
        const icons: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
            document: { icon: <Upload size={12} />, color: 'var(--clickup-blue)', bg: 'var(--clickup-blue-light)' },
            task: { icon: <CheckSquare size={12} />, color: 'var(--clickup-green)', bg: 'var(--clickup-green-light)' },
            session: { icon: <Calendar size={12} />, color: 'var(--clickup-orange)', bg: 'var(--clickup-orange-light)' },
            message: { icon: <MessageSquare size={12} />, color: 'var(--clickup-purple)', bg: 'var(--clickup-purple-light)' },
            case: { icon: <FileText size={12} />, color: 'var(--clickup-pink)', bg: 'rgba(255, 107, 157, 0.1)' },
            general: { icon: <ActivityIcon size={12} />, color: 'var(--quiet-gray-500)', bg: 'var(--quiet-gray-100)' }
        };
        return icons[type] || icons.general;
    };

    // Loading state
    if (!initialActivities) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                gap: '12px'
            }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--clickup-blue)' }} />
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>جاري تحميل الأنشطة...</span>
            </div>
        );
    }

    // Empty state
    if (activities.length === 0) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                gap: '12px'
            }}>
                <ActivityIcon size={32} style={{ color: 'var(--quiet-gray-400)' }} />
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>لا توجد أنشطة حديثة</span>
            </div>
        );
    }

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
                                <strong>{activity.description || activity.title}</strong>
                            </div>
                            {activity.case_title && (
                                <div className="activity-item__desc">{activity.case_title}</div>
                            )}
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
                onClick={() => navigate('/activities')}
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

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ActivityFeedWidget;
