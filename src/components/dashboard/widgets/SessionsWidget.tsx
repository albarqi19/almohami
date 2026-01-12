import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    Clock,
    MapPin,
    ChevronRight,
    Bell,
    Loader2
} from 'lucide-react';
import type { UpcomingSession } from '../../../services/dashboardService';

interface Session {
    id: string | number;
    title?: string;
    caseTitle?: string;
    case_title?: string;
    date: Date | string;
    time: string | null;
    location?: string;
    court?: string;
    type: 'hearing' | 'meeting' | 'deadline' | string;
    isUrgent?: boolean;
    is_urgent?: boolean;
    days_until?: number;
}

interface SessionsWidgetProps {
    sessions?: UpcomingSession[] | Session[];
    onSessionClick?: (session: Session) => void;
}

const SessionsWidget: React.FC<SessionsWidgetProps> = ({
    sessions: initialSessions,
    onSessionClick
}) => {
    const navigate = useNavigate();

    // تحويل البيانات من API إلى الشكل المتوقع
    const normalizeSession = (s: UpcomingSession | Session): Session => ({
        id: s.id,
        title: (s as Session).title || getSessionTypeLabel((s as UpcomingSession).type || (s as Session).type),
        caseTitle: (s as UpcomingSession).case_title || (s as Session).caseTitle || '',
        date: typeof s.date === 'string' ? new Date(s.date) : s.date,
        time: s.time || null,
        location: (s as UpcomingSession).court || (s as Session).location || (s as Session).court || '',
        type: s.type || 'hearing',
        isUrgent: (s as UpcomingSession).is_urgent || (s as Session).isUrgent || false,
        days_until: (s as UpcomingSession).days_until
    });

    const getSessionTypeLabel = (type: string): string => {
        const labels: Record<string, string> = {
            hearing: 'جلسة استماع',
            meeting: 'اجتماع',
            deadline: 'موعد نهائي',
            consultation: 'استشارة'
        };
        return labels[type] || 'موعد';
    };

    const sessions = initialSessions?.slice(0, 4).map(normalizeSession) || [];

    const formatDate = (date: Date | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        const day = d.getDate();
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return { day, month: months[d.getMonth()] };
    };

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            hearing: 'var(--clickup-purple)',
            meeting: 'var(--clickup-blue)',
            deadline: 'var(--clickup-red)',
            consultation: 'var(--clickup-green)'
        };
        return colors[type] || 'var(--clickup-purple)';
    };

    const getDaysRemaining = (session: Session) => {
        if (session.days_until !== undefined) {
            const days = session.days_until;
            if (days === 0) return 'اليوم';
            if (days === 1) return 'غداً';
            if (days < 0) return 'منتهي';
            return `بعد ${days} أيام`;
        }

        const date = typeof session.date === 'string' ? new Date(session.date) : session.date;
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'اليوم';
        if (days === 1) return 'غداً';
        if (days < 0) return 'منتهي';
        return `بعد ${days} أيام`;
    };

    // Loading state
    if (!initialSessions) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                gap: '12px'
            }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--clickup-orange)' }} />
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>جاري تحميل الجلسات...</span>
            </div>
        );
    }

    // Empty state
    if (sessions.length === 0) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                gap: '12px'
            }}>
                <Calendar size={32} style={{ color: 'var(--quiet-gray-400)' }} />
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>لا توجد جلسات قادمة</span>
            </div>
        );
    }

    return (
        <div>
            {/* Sessions List */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                <Bell size={12} />
                المواعيد القادمة
            </div>

            <div className="sessions-list">
                {sessions.map((session) => {
                    const { day, month } = formatDate(session.date);
                    const typeColor = getTypeColor(session.type);
                    const remaining = getDaysRemaining(session);

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
                                    <span className="session-item__title">{session.caseTitle || session.title}</span>
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
                                        {!['hearing', 'meeting', 'deadline'].includes(session.type) && 'موعد'}
                                    </span>
                                </div>

                                <div className="session-item__time">
                                    <Clock size={9} />
                                    {session.time && <>{session.time} • </>}
                                    <span style={{
                                        color: remaining === 'اليوم' || remaining === 'غداً' ? 'var(--clickup-red)' : 'inherit'
                                    }}>
                                        {remaining}
                                    </span>
                                </div>

                                {session.location && (
                                    <div className="session-item__location">
                                        <MapPin size={9} />
                                        {session.location}
                                    </div>
                                )}
                            </div>

                            <ChevronRight size={14} style={{ opacity: 0.4 }} />
                        </div>
                    );
                })}
            </div>

            {/* View More */}
            <button
                onClick={() => navigate('/sessions')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    borderRadius: '6px',
                    background: 'var(--quiet-gray-100)',
                    color: 'var(--clickup-orange)',
                    fontSize: '12px',
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '8px',
                    width: '100%',
                    transition: 'background 0.1s'
                }}
            >
                عرض جميع الجلسات
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

export default SessionsWidget;
