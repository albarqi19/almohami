import React, { useState, type ReactNode } from 'react';
import {
    MoreHorizontal,
    Maximize2,
    Minimize2,
    GripVertical,
    RefreshCw,
    Download,
    EyeOff
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface DashboardWidgetProps {
    title: string;
    icon?: ReactNode;
    iconBg?: string;
    children: ReactNode;
    gridSpan?: number;
    onRefresh?: () => void;
    onExport?: () => void;
    onHide?: () => void;
    isLoading?: boolean;
    dragHandleProps?: any;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({
    title,
    icon,
    iconBg = 'var(--quiet-gray-100)',
    children,
    onRefresh,
    onExport,
    onHide,
    isLoading = false,
    dragHandleProps
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="widget">
            <div className="widget__header">
                <div className="widget__title">
                    {dragHandleProps && (
                        <span className="widget__drag-handle" {...dragHandleProps}>
                            <GripVertical size={14} />
                        </span>
                    )}
                    {icon && (
                        <span className="widget__title-icon" style={{ background: iconBg }}>
                            {icon}
                        </span>
                    )}
                    <span>{title}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        className="widget__action-btn"
                        onClick={() => setIsExpanded(!isExpanded)}
                        title={isExpanded ? 'تصغير' : 'تكبير'}
                    >
                        {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>

                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <button className="widget__action-btn">
                                <MoreHorizontal size={14} />
                            </button>
                        </DropdownMenu.Trigger>

                        <DropdownMenu.Portal>
                            <DropdownMenu.Content
                                align="end"
                                sideOffset={4}
                                style={{
                                    background: 'var(--dashboard-card)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    padding: '4px',
                                    minWidth: '140px',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                                    zIndex: 100
                                }}
                            >
                                {onRefresh && (
                                    <DropdownMenu.Item
                                        onSelect={onRefresh}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 10px',
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            outline: 'none'
                                        }}
                                    >
                                        <RefreshCw size={14} />
                                        تحديث
                                    </DropdownMenu.Item>
                                )}
                                {onExport && (
                                    <DropdownMenu.Item
                                        onSelect={onExport}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 10px',
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            outline: 'none'
                                        }}
                                    >
                                        <Download size={14} />
                                        تصدير
                                    </DropdownMenu.Item>
                                )}
                                {onHide && (
                                    <DropdownMenu.Item
                                        onSelect={onHide}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 10px',
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            outline: 'none',
                                            color: 'var(--clickup-red)'
                                        }}
                                    >
                                        <EyeOff size={14} />
                                        إخفاء
                                    </DropdownMenu.Item>
                                )}
                            </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                </div>
            </div>

            <div className="widget__content">
                {isLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="skeleton" style={{ height: '40px' }} />
                        ))}
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
};

export default DashboardWidget;
