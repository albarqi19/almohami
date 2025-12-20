import React from 'react';
import { Link } from 'react-router-dom';
import {
    FileText,
    Upload,
    Calendar,
    CheckSquare,
    Search,
    Sparkles
} from 'lucide-react';

interface QuickAction {
    id: string;
    icon: React.ReactNode;
    label: string;
    color: string;
    href?: string;
    onClick?: () => void;
}

interface QuickActionsWidgetProps {
    actions?: QuickAction[];
    onActionClick?: (actionId: string) => void;
}

const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({
    actions: customActions,
    onActionClick
}) => {
    const defaultActions: QuickAction[] = [
        {
            id: 'new-case',
            icon: <FileText size={16} />,
            label: 'قضية جديدة',
            color: 'var(--law-navy)',
            href: '/cases'
        },
        {
            id: 'new-task',
            icon: <CheckSquare size={16} />,
            label: 'مهمة جديدة',
            color: 'var(--status-green)',
            href: '/tasks'
        },
        {
            id: 'upload-doc',
            icon: <Upload size={16} />,
            label: 'رفع وثيقة',
            color: 'var(--clickup-pink)',
            href: '/documents'
        },
        {
            id: 'schedule',
            icon: <Calendar size={16} />,
            label: 'جدولة موعد',
            color: 'var(--status-orange)',
            href: '/sessions'
        },
        {
            id: 'search',
            icon: <Search size={16} />,
            label: 'بحث متقدم',
            color: 'var(--status-blue)'
        },
        {
            id: 'ai-assist',
            icon: <Sparkles size={16} />,
            label: 'مساعد ذكي',
            color: 'var(--law-gold)'
        }
    ];

    const actions = customActions || defaultActions;

    return (
        <div className="quick-actions">
            {actions.map((action) => {
                const content = (
                    <div
                        key={action.id}
                        className="quick-action"
                        onClick={() => {
                            action.onClick?.();
                            onActionClick?.(action.id);
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <div
                            className="quick-action__icon"
                            style={{
                                background: `${action.color}15`,
                                color: action.color
                            }}
                        >
                            {action.icon}
                        </div>
                        <div className="quick-action__label">{action.label}</div>
                    </div>
                );

                if (action.href) {
                    return (
                        <Link key={action.id} to={action.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                            {content}
                        </Link>
                    );
                }

                return content;
            })}
        </div>
    );
};

export default QuickActionsWidget;
