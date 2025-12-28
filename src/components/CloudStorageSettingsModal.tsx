import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Cloud,
    Settings,
    Shield,
    Users,
    Eye,
    Download,
    Upload,
    Lock,
    Unlock,
    CheckCircle,
    AlertCircle,
    Loader2,
    HardDrive,
    FolderSync,
    RefreshCw
} from 'lucide-react';
import type { CloudStorageStatus } from '../services/cloudStorageService';
import '../styles/task-modal.css';

interface CloudStorageSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    oneDriveStatus: CloudStorageStatus | null;
    onRefreshStatus: () => void;
}

interface DefaultPermissions {
    clientCanView: boolean;
    clientCanDownload: boolean;
    clientCanUpload: boolean;
    autoAssignToCase: boolean;
    defaultVisibility: 'private' | 'team' | 'public';
}

const CloudStorageSettingsModal: React.FC<CloudStorageSettingsModalProps> = ({
    isOpen,
    onClose,
    oneDriveStatus,
    onRefreshStatus
}) => {
    const [activeTab, setActiveTab] = useState<'general' | 'permissions' | 'sync'>('general');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Default permissions state
    const [defaultPermissions, setDefaultPermissions] = useState<DefaultPermissions>({
        clientCanView: true,
        clientCanDownload: true,
        clientCanUpload: false,
        autoAssignToCase: true,
        defaultVisibility: 'team'
    });

    // Sync settings
    const [autoSync, setAutoSync] = useState(true);
    const [syncInterval, setSyncInterval] = useState('15');
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadSettings();
        }
    }, [isOpen]);

    const loadSettings = async () => {
        setLoading(true);
        try {
            // Load settings from API or localStorage
            const savedSettings = localStorage.getItem('cloudStorageSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                setDefaultPermissions(parsed.defaultPermissions || defaultPermissions);
                setAutoSync(parsed.autoSync ?? true);
                setSyncInterval(parsed.syncInterval || '15');
            }
            setLastSyncTime(localStorage.getItem('lastCloudSync'));
        } catch (err) {
            console.error('Failed to load settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        setError(null);
        try {
            const settings = {
                defaultPermissions,
                autoSync,
                syncInterval
            };
            localStorage.setItem('cloudStorageSettings', JSON.stringify(settings));

            // Also save to API if available
            try {
                await fetch(
                    `${import.meta.env.VITE_API_URL || 'https://api.alraedlaw.com/api/v1'}/cloud-storage/settings`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(settings)
                    }
                );
            } catch {
                // API might not exist yet, that's okay
            }

            setSuccess('تم حفظ الإعدادات بنجاح');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('فشل في حفظ الإعدادات');
        } finally {
            setSaving(false);
        }
    };

    const handleManualSync = async () => {
        setSaving(true);
        try {
            // Trigger manual sync
            await fetch(
                `${import.meta.env.VITE_API_URL || 'https://api.alraedlaw.com/api/v1'}/cloud-storage/sync`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            const now = new Date().toISOString();
            localStorage.setItem('lastCloudSync', now);
            setLastSyncTime(now);
            setSuccess('تمت المزامنة بنجاح');
            onRefreshStatus();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('فشل في المزامنة');
        } finally {
            setSaving(false);
        }
    };

    const ToggleSwitch = ({ checked, onChange, disabled = false }: {
        checked: boolean;
        onChange: (val: boolean) => void;
        disabled?: boolean;
    }) => (
        <label style={{
            position: 'relative',
            display: 'inline-block',
            width: '48px',
            height: '26px',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer'
        }}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => !disabled && onChange(e.target.checked)}
                disabled={disabled}
                style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
                position: 'absolute',
                cursor: disabled ? 'not-allowed' : 'pointer',
                inset: 0,
                backgroundColor: checked ? '#10b981' : '#ccc',
                borderRadius: '34px',
                transition: '.3s'
            }}>
                <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '20px',
                    width: '20px',
                    right: checked ? '3px' : '25px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '.3s'
                }} />
            </span>
        </label>
    );

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="task-modal-overlay">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="task-modal"
                    style={{ maxWidth: '560px', maxHeight: '85vh' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header - Modern Minimal */}
                    <div className="task-modal-header" style={{ background: 'var(--color-bg-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                background: '#0078d4',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Cloud size={16} color="white" />
                            </div>
                            <div>
                                <div className="task-modal-title" style={{ fontSize: '14px' }}>
                                    إعدادات التخزين السحابي
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                                    {oneDriveStatus?.connected ? `متصل: ${oneDriveStatus.email}` : 'غير متصل'}
                                </div>
                            </div>
                        </div>
                        <button className="task-modal-close" onClick={onClose}>
                            <X size={16} />
                        </button>
                    </div>

                    {/* Tabs - Compact */}
                    <div style={{
                        display: 'flex',
                        gap: '2px',
                        padding: '8px 16px',
                        borderBottom: '1px solid var(--color-border)',
                        background: 'var(--color-bg-primary)'
                    }}>
                        {[
                            { id: 'general', label: 'عام', icon: <Settings size={14} /> },
                            { id: 'permissions', label: 'الصلاحيات', icon: <Shield size={14} /> },
                            { id: 'sync', label: 'المزامنة', icon: <FolderSync size={14} /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    border: 'none',
                                    background: activeTab === tab.id ? 'var(--color-primary-bg)' : 'transparent',
                                    color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: activeTab === tab.id ? 600 : 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Alerts */}
                    {(error || success) && (
                        <div style={{ padding: '12px 24px' }}>
                            {error && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px',
                                    background: '#fef2f2',
                                    borderRadius: '8px',
                                    color: '#dc2626',
                                    fontSize: '13px'
                                }}>
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px',
                                    background: '#f0fdf4',
                                    borderRadius: '8px',
                                    color: '#16a34a',
                                    fontSize: '13px'
                                }}>
                                    <CheckCircle size={16} />
                                    {success}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
                                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                            </div>
                        ) : activeTab === 'general' ? (
                            <div>
                                {/* Connection Status */}
                                <div style={{
                                    padding: '20px',
                                    background: oneDriveStatus?.connected ? '#f0fdf4' : '#fef2f2',
                                    borderRadius: '12px',
                                    marginBottom: '20px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '12px',
                                            background: oneDriveStatus?.connected ? '#10b981' : '#ef4444',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Cloud size={24} color="white" />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
                                                {oneDriveStatus?.connected ? 'متصل بـ OneDrive' : 'غير متصل'}
                                            </div>
                                            {oneDriveStatus?.connected && (
                                                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                                    {oneDriveStatus.display_name} ({oneDriveStatus.email})
                                                </div>
                                            )}
                                        </div>
                                        {oneDriveStatus?.connected && (
                                            <CheckCircle size={24} color="#10b981" />
                                        )}
                                    </div>
                                </div>

                                {/* Storage Info */}
                                <div style={{
                                    padding: '16px',
                                    background: 'var(--color-bg-secondary)',
                                    borderRadius: '12px',
                                    marginBottom: '16px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                        <HardDrive size={20} color="var(--color-primary)" />
                                        <span style={{ fontWeight: 600 }}>معلومات التخزين</span>
                                    </div>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '12px',
                                        fontSize: '13px'
                                    }}>
                                        <div>
                                            <div style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}>المزود</div>
                                            <div style={{ fontWeight: 500 }}>Microsoft OneDrive</div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}>تاريخ الاتصال</div>
                                            <div style={{ fontWeight: 500 }}>
                                                {oneDriveStatus?.connected_at
                                                    ? new Date(oneDriveStatus.connected_at).toLocaleDateString('ar-SA')
                                                    : '-'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === 'permissions' ? (
                            <div>
                                <div style={{
                                    padding: '16px',
                                    background: 'var(--color-bg-secondary)',
                                    borderRadius: '12px',
                                    marginBottom: '20px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Users size={18} color="var(--color-primary)" />
                                        <span style={{ fontWeight: 600, fontSize: '14px' }}>صلاحيات العميل الافتراضية</span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>
                                        هذه الإعدادات تُطبق على جميع الملفات الجديدة
                                    </p>
                                </div>

                                {/* Permission Toggles */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* Client View */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px',
                                        background: 'var(--color-bg-secondary)',
                                        borderRadius: '10px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Eye size={18} color="#3b82f6" />
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: '14px' }}>العميل يمكنه العرض</div>
                                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                                    السماح للعميل بمشاهدة ملفات قضيته
                                                </div>
                                            </div>
                                        </div>
                                        <ToggleSwitch
                                            checked={defaultPermissions.clientCanView}
                                            onChange={(val) => setDefaultPermissions(prev => ({ ...prev, clientCanView: val }))}
                                        />
                                    </div>

                                    {/* Client Download */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px',
                                        background: 'var(--color-bg-secondary)',
                                        borderRadius: '10px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Download size={18} color="#10b981" />
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: '14px' }}>العميل يمكنه التحميل</div>
                                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                                    السماح للعميل بتحميل الملفات
                                                </div>
                                            </div>
                                        </div>
                                        <ToggleSwitch
                                            checked={defaultPermissions.clientCanDownload}
                                            onChange={(val) => setDefaultPermissions(prev => ({ ...prev, clientCanDownload: val }))}
                                        />
                                    </div>

                                    {/* Client Upload */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px',
                                        background: 'var(--color-bg-secondary)',
                                        borderRadius: '10px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Upload size={18} color="#f59e0b" />
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: '14px' }}>العميل يمكنه الرفع</div>
                                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                                    السماح للعميل برفع ملفات جديدة
                                                </div>
                                            </div>
                                        </div>
                                        <ToggleSwitch
                                            checked={defaultPermissions.clientCanUpload}
                                            onChange={(val) => setDefaultPermissions(prev => ({ ...prev, clientCanUpload: val }))}
                                        />
                                    </div>

                                    {/* Default Visibility */}
                                    <div style={{
                                        padding: '16px',
                                        background: 'var(--color-bg-secondary)',
                                        borderRadius: '10px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                            {defaultPermissions.defaultVisibility === 'public' ? (
                                                <Unlock size={18} color="#8b5cf6" />
                                            ) : (
                                                <Lock size={18} color="#8b5cf6" />
                                            )}
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: '14px' }}>الرؤية الافتراضية</div>
                                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                                    من يمكنه رؤية الملفات الجديدة
                                                </div>
                                            </div>
                                        </div>
                                        <select
                                            value={defaultPermissions.defaultVisibility}
                                            onChange={(e) => setDefaultPermissions(prev => ({
                                                ...prev,
                                                defaultVisibility: e.target.value as 'private' | 'team' | 'public'
                                            }))}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                background: 'var(--color-surface)'
                                            }}
                                        >
                                            <option value="private">خاص - فقط صاحب الملف</option>
                                            <option value="team">الفريق - المحامون في القضية</option>
                                            <option value="public">عام - كل المنظمة</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Sync Tab */
                            <div>
                                {/* Auto Sync */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px',
                                    background: 'var(--color-bg-secondary)',
                                    borderRadius: '10px',
                                    marginBottom: '16px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <FolderSync size={18} color="var(--color-primary)" />
                                        <div>
                                            <div style={{ fontWeight: 500, fontSize: '14px' }}>المزامنة التلقائية</div>
                                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                                مزامنة الملفات تلقائياً مع السحابة
                                            </div>
                                        </div>
                                    </div>
                                    <ToggleSwitch
                                        checked={autoSync}
                                        onChange={setAutoSync}
                                    />
                                </div>

                                {/* Sync Interval */}
                                <div style={{
                                    padding: '16px',
                                    background: 'var(--color-bg-secondary)',
                                    borderRadius: '10px',
                                    marginBottom: '16px',
                                    opacity: autoSync ? 1 : 0.5
                                }}>
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ fontWeight: 500, fontSize: '14px', marginBottom: '4px' }}>فترة المزامنة</div>
                                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                            كل كم دقيقة يتم التحقق من التحديثات
                                        </div>
                                    </div>
                                    <select
                                        value={syncInterval}
                                        onChange={(e) => setSyncInterval(e.target.value)}
                                        disabled={!autoSync}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            background: 'var(--color-surface)'
                                        }}
                                    >
                                        <option value="5">كل 5 دقائق</option>
                                        <option value="15">كل 15 دقيقة</option>
                                        <option value="30">كل 30 دقيقة</option>
                                        <option value="60">كل ساعة</option>
                                    </select>
                                </div>

                                {/* Last Sync */}
                                <div style={{
                                    padding: '16px',
                                    background: 'var(--color-bg-secondary)',
                                    borderRadius: '10px',
                                    marginBottom: '16px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontWeight: 500, fontSize: '14px', marginBottom: '4px' }}>آخر مزامنة</div>
                                            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                                {lastSyncTime
                                                    ? new Date(lastSyncTime).toLocaleString('ar-SA')
                                                    : 'لم تتم المزامنة بعد'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleManualSync}
                                            disabled={saving}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '10px 16px',
                                                background: 'var(--color-primary)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '13px'
                                            }}
                                        >
                                            {saving ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <RefreshCw size={16} />
                                            )}
                                            مزامنة الآن
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '16px 24px',
                        borderTop: '1px solid var(--color-border)',
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'flex-end'
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                background: 'var(--color-bg-secondary)',
                                color: 'var(--color-text)',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleSaveSettings}
                            disabled={saving}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 24px',
                                background: 'var(--color-primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 500
                            }}
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            حفظ الإعدادات
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CloudStorageSettingsModal;
