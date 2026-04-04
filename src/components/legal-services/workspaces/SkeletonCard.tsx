import React from 'react';

interface SkeletonCardProps {
  lines?: number;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 4 }) => (
  <div className="lsd-card lsd-skeleton-card">
    <div className="lsd-card__header">
      <div className="lsd-skeleton lsd-skeleton--title" />
    </div>
    <div className="lsd-card__content">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="lsd-skeleton lsd-skeleton--line"
          style={{ width: `${85 - i * 12}%` }}
        />
      ))}
    </div>
  </div>
);

export default SkeletonCard;
