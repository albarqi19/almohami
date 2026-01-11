import React from 'react';
import './PresenceIndicator.css';

export type PresenceStatus = 'online' | 'idle' | 'away' | 'offline';

interface PresenceIndicatorProps {
    status: PresenceStatus;
    lastActivityAgo?: string;
    size?: 'small' | 'medium' | 'large';
    showLabel?: boolean;
    className?: string;
}

const statusLabels: Record<PresenceStatus, string> = {
    online: 'متصل',
    idle: 'خامل',
    away: 'بعيد',
    offline: 'غير متصل',
};

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
    status,
    lastActivityAgo,
    size = 'medium',
    showLabel = true,
    className = '',
}) => {
    const label = statusLabels[status] || statusLabels.offline;

    const tooltipText = status === 'offline' && lastActivityAgo
        ? `آخر ظهور ${lastActivityAgo}`
        : undefined;

    return (
        <div
            className={`presence-badge presence-${status} presence-size-${size} ${className}`}
            title={tooltipText}
        >
            <span className="presence-dot" />
            {showLabel && (
                <span className="presence-label">
                    {label}
                </span>
            )}
        </div>
    );
};

export default PresenceIndicator;
