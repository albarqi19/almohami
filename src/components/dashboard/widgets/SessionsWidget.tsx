import React from 'react';
import {
    Calendar,
    Clock,
    MapPin,
    ChevronRight,
    Bell
} from 'lucide-react';

interface Session {
    id: string;
    title: string;
    caseTitle: string;
    date: Date;
    time: string;
    location: string;
    type: 'hearing' | 'meeting' | 'deadline';
    isUrgent?: boolean;
}

interface SessionsWidgetProps {
    sessions?: Session[];
    onSessionClick?: (session: Session) => void;
}

const SessionsWidget: React.FC<SessionsWidgetProps> = ({
    sessions: initialSessions,
    onSessionClick
}) => {
    const defaultSessions: Session[] = [
        {
            id: '1',
            title: 'جلسة استماع',
            caseTitle: 'القضية العقارية',
            date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            time: '10:00 ص',
            location: 'المحكمة العامة - الرياض',
            type: 'hearing',
            isUrgent: true
        },
        {
            id: '2',
            title: 'اجتماع مع الموكل',
            caseTitle: 'نزاع تجاري',
            date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
            time: '02:00 م',
            location: 'مكتب المحاماة',
            type: 'meeting'
        },
        {
            id: '3',
            title: 'موعد تقديم المذكرة',
            caseTitle: 'قضية عمالية',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            time: '11:59 م',
            location: 'نظام ناجز',
            type: 'deadline'
        }
    ];

    const sessions = initialSessions || defaultSessions;

    const formatDate = (date: Date) => {
        const day = date.getDate();
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return { day, month: months[date.getMonth()] };
    };

    const getTypeColor = (type: Session['type']) => {
        const colors = {
            hearing: 'var(--clickup-purple)',
            meeting: 'var(--clickup-blue)',
            deadline: 'var(--clickup-red)'
        };
        return colors[type];
    };

    const getDaysRemaining = (date: Date) => {
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'اليوم';
        if (days === 1) return 'غداً';
        return `بعد ${days} أيام`;
    };

    return (
        <div>
            {/* Sessions List */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                <Bell size={12} />
                المواعيد القادمة
            </div>

            <div className="sessions-list">
                {sessions.slice(0, 3).map((session) => {
                    const { day, month } = formatDate(session.date);
                    const typeColor = getTypeColor(session.type);
                    const remaining = getDaysRemaining(session.date);

                    return (
                        <div
                            key={session.id}
                            className="session-item"
                            onClick={() => onSessionClick?.(session)}
                        >
                            <div className="session-item__date">
                                <span className="session-item__day">{day}</span>
                                <span className="session-item__month">{month}</span>
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                    {session.isUrgent && (
                                        <span style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: 'var(--clickup-red)'
                                        }} />
                                    )}
                                    <span className="session-item__title">{session.title}</span>
                                    <span style={{
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        fontSize: '9px',
                                        fontWeight: 600,
                                        color: typeColor,
                                        background: `${typeColor}15`
                                    }}>
                                        {session.type === 'hearing' && 'جلسة'}
                                        {session.type === 'meeting' && 'اجتماع'}
                                        {session.type === 'deadline' && 'موعد'}
                                    </span>
                                </div>

                                <div className="session-item__time">
                                    <Clock size={9} />
                                    {session.time} •
                                    <span style={{
                                        color: remaining === 'اليوم' || remaining === 'غداً' ? 'var(--clickup-red)' : 'inherit'
                                    }}>
                                        {remaining}
                                    </span>
                                </div>

                                <div className="session-item__location">
                                    <MapPin size={9} />
                                    {session.location}
                                </div>
                            </div>

                            <ChevronRight size={14} style={{ opacity: 0.4 }} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SessionsWidget;
