import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download,
    ExternalLink,
    Shield,
    FolderPlus,
    Trash2,
    Copy,
    Eye,
    Settings,
    Share2,
    Info
} from 'lucide-react';

interface ContextMenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    color?: string;
    divider?: boolean;
    disabled?: boolean;
}

interface ContextMenuProps {
    isOpen: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    items: ContextMenuItem[];
}

const ContextMenu: React.FC<ContextMenuProps> = ({
    isOpen,
    position,
    onClose,
    items
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    // Adjust position to stay within viewport
    useEffect(() => {
        if (menuRef.current && isOpen) {
            const menu = menuRef.current;
            const rect = menu.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            if (rect.right > viewportWidth) {
                menu.style.left = `${position.x - rect.width}px`;
            }
            if (rect.bottom > viewportHeight) {
                menu.style.top = `${position.y - rect.height}px`;
            }
        }
    }, [isOpen, position]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                ref={menuRef}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                style={{
                    position: 'fixed',
                    top: position.y,
                    left: position.x,
                    zIndex: 10000,
                    minWidth: '200px',
                    maxWidth: '280px',
                    background: 'var(--color-surface)',
                    borderRadius: '8px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2), 0 0 1px rgba(0,0,0,0.1)',
                    border: '1px solid var(--color-border)',
                    padding: '6px 0',
                    overflow: 'hidden'
                }}
            >
                {items.map((item, index) => (
                    <React.Fragment key={item.id}>
                        {item.divider && index > 0 && (
                            <div style={{
                                height: '1px',
                                background: 'var(--color-border)',
                                margin: '6px 0'
                            }} />
                        )}
                        <button
                            onClick={() => {
                                if (!item.disabled) {
                                    item.onClick();
                                    onClose();
                                }
                            }}
                            disabled={item.disabled}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                width: '100%',
                                padding: '10px 16px',
                                border: 'none',
                                background: 'transparent',
                                cursor: item.disabled ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                color: item.color || 'var(--color-text)',
                                opacity: item.disabled ? 0.5 : 1,
                                textAlign: 'right',
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={(e) => {
                                if (!item.disabled) {
                                    e.currentTarget.style.background = 'var(--color-bg-hover)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                color: item.color || 'var(--color-text-secondary)'
                            }}>
                                {item.icon}
                            </span>
                            <span style={{ flex: 1 }}>{item.label}</span>
                        </button>
                    </React.Fragment>
                ))}
            </motion.div>
        </AnimatePresence>
    );
};

// Helper function to create OneDrive file context menu items
export const createOneDriveContextMenu = ({
    file,
    onDownload,
    onOpenInOneDrive,
    onPermissions,
    onAssignToCase,
    onCopyLink,
    onDelete
}: {
    file: { name: string; web_url?: string | null; is_folder?: boolean };
    onDownload: () => void;
    onOpenInOneDrive: () => void;
    onPermissions: () => void;
    onAssignToCase: () => void;
    onCopyLink?: () => void;
    onDelete?: () => void;
}): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [
        {
            id: 'open',
            label: 'فتح في OneDrive',
            icon: <ExternalLink size={16} />,
            onClick: onOpenInOneDrive
        },
        {
            id: 'download',
            label: 'تنزيل',
            icon: <Download size={16} />,
            onClick: onDownload
        },
        {
            id: 'permissions',
            label: 'الصلاحيات',
            icon: <Shield size={16} />,
            onClick: onPermissions,
            divider: true
        },
        {
            id: 'assign',
            label: 'تعيين لقضية',
            icon: <FolderPlus size={16} />,
            onClick: onAssignToCase
        }
    ];

    if (onCopyLink) {
        items.push({
            id: 'copyLink',
            label: 'نسخ الرابط',
            icon: <Copy size={16} />,
            onClick: onCopyLink,
            divider: true
        });
    }

    if (onDelete) {
        items.push({
            id: 'delete',
            label: 'حذف',
            icon: <Trash2 size={16} />,
            onClick: onDelete,
            color: 'var(--color-error)',
            divider: true
        });
    }

    return items;
};

export default ContextMenu;
