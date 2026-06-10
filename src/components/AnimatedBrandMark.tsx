import React from 'react';

/**
 * AnimatedBrandMark — شعار «نظام الرائد» (طبقات) بحركة انتظار لطيفة مستمرة
 * كل طبقة (المعيّن العلوي + الشيفرونان) تتحرك بمسار منفصل بتأخير متعاقب
 * فتتولد موجة هادئة تسري عبر الطبقات. الأنماط في auth.css (brand-mark-anim).
 */
const AnimatedBrandMark: React.FC<{ size?: number; className?: string }> = ({
    size = 32,
    className,
}) => (
    <svg
        className={`brand-mark-anim ${className ?? ''}`}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path
            className="brand-mark-anim__top"
            d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"
        />
        <path className="brand-mark-anim__mid" d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
        <path className="brand-mark-anim__bot" d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
    </svg>
);

export default AnimatedBrandMark;
