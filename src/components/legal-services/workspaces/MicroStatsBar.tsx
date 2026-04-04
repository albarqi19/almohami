import React from 'react';
import type { MicroStatItem } from './types';

interface MicroStatsBarProps {
  items: MicroStatItem[];
}

const MicroStatsBar: React.FC<MicroStatsBarProps> = ({ items }) => {
  if (!items.length) return null;

  return (
    <div className="lsd-micro-stats">
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div key={idx} className={`lsd-micro-stat-pill lsd-micro-stat-pill--${item.color || 'blue'}`}>
            {Icon && <Icon size={14} className="lsd-micro-stat-pill__icon" />}
            <span className="lsd-micro-stat-pill__label">{item.label}</span>
            <span className="lsd-micro-stat-pill__value">{item.value}</span>
          </div>
        );
      })}
    </div>
  );
};

export default MicroStatsBar;
