import React from 'react';
import { AlertTriangle, Info, AlertOctagon } from 'lucide-react';
import type { ContextualAlertProps } from './types';

const ALERT_ICONS = {
  warning: AlertTriangle,
  danger: AlertOctagon,
  info: Info,
};

const ContextualAlert: React.FC<ContextualAlertProps> = ({ type, title, message, actionLabel, onAction }) => {
  const Icon = ALERT_ICONS[type];

  return (
    <div className={`lsd-contextual-alert lsd-contextual-alert--${type}`}>
      <div className="lsd-contextual-alert__body">
        <Icon size={18} className="lsd-contextual-alert__icon" />
        <div className="lsd-contextual-alert__text">
          <strong>{title}</strong>
          <span>{message}</span>
        </div>
      </div>
      {actionLabel && onAction && (
        <button className="lsd-contextual-alert__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default ContextualAlert;
