import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Cloud,
    Folder,
    FileText,
    Image,
    File,
    FileVideo,
    Archive,
    ChevronRight,
    ArrowRight,
    Check,
    Loader2,
    Search,
    Shield,
    Eye,
    Download,
    Upload as UploadIcon
} from 'lucide-react';
import { CloudStorageService } from '../services/cloudStorageService';
import type { CloudStorageFile, CloudStorageStatus } from '../services/cloudStorageService';
import '../styles/task-modal.css';

interface CloudFilePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseId: string;
    caseTitle: string;
    onFileAssigned: () => void;
}

interface BreadcrumbItem {
    id: string;
    name: string;
}

const CloudFilePickerModal: React.FC<CloudFilePickerModalProps> = ({
    isOpen,
    onClose,
    caseId,
    caseTitle,
    onFileAssigned
}) => {
    const [status, setStatus] = useState<CloudStorageStatus | null>(null);
    const [files, setFiles] = useState<CloudStorageFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<CloudStorageFile[]>([]);
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: 'root', name: 'الرئيسية' }]);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Client permissions
    const [clientCanView, setClientCanView] = useState(true);
    const [clientCanDownload, setClientCanDownload] = useState(true);

    useEffect(() => {
        if (isOpen) {
            checkStatus();
        }
    }, [isOpen]);

    const checkStatus = async () => {
        try {
            const result = await CloudStorageService.getOneDriveStatus();
            setStatus(result);
            if (result.connected) {
                loadFiles('root');
            }
        } catch (err) {
            console.error('Failed to check status:', err);
        }
    };

    const handleConnect = async () => {
        setConnecting(true);
        try {
            await CloudStorageService.connectOneDrive();
        } catch (err) {
            setConnecting(false);
        }
    };

    const loadFiles = async (folderId: string) => {
        setLoading(true);
        try {
            const result = await CloudStorageService.getOneDriveFiles(folderId);
            setFiles(result.files || []);
        } catch (err) {
            console.error('Failed to load files:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFolderClick = (folder: CloudStorageFile) => {
        setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
        loadFiles(folder.id);
        setSelectedFiles([]);
    };

    const handleBreadcrumbClick = (index: number) => {
        const item = breadcrumbs[index];
        setBreadcrumbs(breadcrumbs.slice(0, index + 1));
        loadFiles(item.id);
        setSelectedFiles([]);
    };

    const handleFileSelect = (file: CloudStorageFile) => {
        // إذا كان مجلد، التنقل إليه مباشرة عند النقر العادي
        // لكن نسمح بتحديده مع Ctrl أو Shift
        if (file.is_folder) {
            handleFolderClick(file);
            return;
        }

        setSelectedFiles(prev => {
            const exists = prev.some(f => f.id === file.id);
            if (exists) {
                return prev.filter(f => f.id !== file.id);
            }
            return [...prev, file];
        });
    };

    // تحديد مجلد كامل
    const handleFolderSelect = (folder: CloudStorageFile, event: React.MouseEvent) => {
        event.stopPropagation();
        setSelectedFiles(prev => {
            const exists = prev.some(f => f.id === folder.id);
            if (exists) {
                return prev.filter(f => f.id !== folder.id);
            }
            return [...prev, folder];
        });
    };

    const handleAssign = async () => {
        if (selectedFiles.length === 0) return;

        setSaving(true);
        setError(null);

        try {
            let filesCount = 0;
            let foldersCount = 0;

            // Register each file/folder to the case
            for (const file of selectedFiles) {
                if (file.is_folder) {
                    foldersCount++;
                } else {
                    filesCount++;
                }

                await CloudStorageService.registerUploadedFile({
                    case_id: parseInt(caseId),
                    cloud_file_id: file.id,
                    file_name: file.name,
                    file_size: file.size || 0,
                    mime_type: file.is_folder ? 'folder' : (file.mime_type || undefined),
                    web_url: file.web_url || undefined
                });
            }

            const message = foldersCount > 0 && filesCount > 0
                ? `تم تعيين ${filesCount} ملف و ${foldersCount} مجلد للقضية بنجاح`
                : foldersCount > 0
                    ? `تم تعيين ${foldersCount} مجلد للقضية بنجاح`
                    : `تم تعيين ${filesCount} ملف للقضية بنجاح`;

            setSuccess(message);
            setTimeout(() => {
                onFileAssigned();
                onClose();
            }, 1500);
        } catch (err) {
            setError('فشل في تعيين الملفات');
        } finally {
            setSaving(false);
        }
    };

    const getFileIcon = (file: CloudStorageFile) => {
        if (file.is_folder) {
            return <Folder size={20} style={{ color: '#f59e0b' }} />;
        }
        const mimeType = file.mime_type || '';
        if (mimeType.includes('pdf')) {
            return <FileText size={20} style={{ color: '#dc2626' }} />;
        } else if (mimeType.includes('image')) {
            return <Image size={20} style={{ color: '#16a34a' }} />;
        } else if (mimeType.includes('video')) {
            return <FileVideo size={20} style={{ color: '#2563eb' }} />;
        } else if (mimeType.includes('zip') || mimeType.includes('rar')) {
            return <Archive size={20} style={{ color: '#d97706' }} />;
        }
        return <File size={20} style={{ color: '#6b7280' }} />;
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return '';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const filteredFiles = files.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
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
                    style={{ maxWidth: '700px', maxHeight: '85vh' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="task-modal-header">
                        <div>
                            <div className="task-modal-title">
                                <Cloud size={20} style={{ color: '#0078d4' }} />
                                تعيين ملفات سحابية
                            </div>
                            <div className="task-modal-subtitle">
                                {caseTitle}
                            </div>
                        </div>
                        <button className="task-modal-close" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="task-modal-content" style={{ minHeight: '400px' }}>
                        {/* Alerts */}
                        {error && (
                            <div style={{
                                padding: '12px 16px',
                                background: 'var(--color-error)10',
                                border: '1px solid var(--color-error)',
                                borderRadius: '8px',
                                color: 'var(--color-error)',
                                fontSize: '13px'
                            }}>
                                {error}
                            </div>
                        )}
                        {success && (
                            <div style={{
                                padding: '12px 16px',
                                background: 'var(--color-success)10',
                                border: '1px solid var(--color-success)',
                                borderRadius: '8px',
                                color: 'var(--color-success)',
                                fontSize: '13px'
                            }}>
                                {success}
                            </div>
                        )}

                        {!status?.connected ? (
                            /* Not Connected State */
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '48px 24px',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #0078d4 0%, #00bcf2 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '24px'
                                }}>
                                    <Cloud size={40} color="white" />
                                </div>
                                <h3 style={{
                                    fontSize: '18px',
                                    fontWeight: 600,
                                    color: 'var(--color-heading)',
                                    marginBottom: '8px'
                                }}>
                                    اتصل بـ OneDrive
                                </h3>
                                <p style={{
                                    fontSize: '14px',
                                    color: 'var(--color-text-secondary)',
                                    marginBottom: '24px',
                                    maxWidth: '300px'
                                }}>
                                    اربط حساب OneDrive الخاص بك لتتمكن من تعيين الملفات السحابية للقضايا
                                </p>
                                <button
                                    onClick={handleConnect}
                                    disabled={connecting}
                                    className="btn-primary"
                                    style={{ padding: '12px 32px' }}
                                >
                                    {connecting ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Cloud size={18} />
                                    )}
                                    ربط OneDrive
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Breadcrumbs */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 16px',
                                    background: 'var(--quiet-gray-50)',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    overflowX: 'auto'
                                }}>
                                    {breadcrumbs.map((item, index) => (
                                        <React.Fragment key={item.id}>
                                            {index > 0 && <ChevronRight size={14} style={{ color: 'var(--color-text-secondary)' }} />}
                                            <button
                                                onClick={() => handleBreadcrumbClick(index)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    color: index === breadcrumbs.length - 1 ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                                    fontWeight: index === breadcrumbs.length - 1 ? 600 : 400,
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {item.name}
                                            </button>
                                        </React.Fragment>
                                    ))}
                                </div>

                                {/* Search */}
                                <div style={{ position: 'relative', marginBottom: '16px' }}>
                                    <Search size={16} style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--color-text-secondary)'
                                    }} />
                                    <input
                                        type="text"
                                        placeholder="بحث في الملفات..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="form-input"
                                        style={{ paddingRight: '40px' }}
                                    />
                                </div>

                                {/* Files List */}
                                <div style={{
                                    flex: 1,
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    minHeight: '250px',
                                    maxHeight: '300px',
                                    overflowY: 'auto'
                                }}>
                                    {loading ? (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '48px',
                                            gap: '12px'
                                        }}>
                                            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                                            <span style={{ color: 'var(--color-text-secondary)' }}>جاري التحميل...</span>
                                        </div>
                                    ) : filteredFiles.length === 0 ? (
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '48px',
                                            color: 'var(--color-text-secondary)'
                                        }}>
                                            <Folder size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                                            <span>لا توجد ملفات</span>
                                        </div>
                                    ) : (
                                        filteredFiles.map(file => {
                                            const isSelected = selectedFiles.some(f => f.id === file.id);
                                            return (
                                                <div
                                                    key={file.id}
                                                    onClick={() => handleFileSelect(file)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '12px 16px',
                                                        borderBottom: '1px solid var(--color-border)',
                                                        cursor: 'pointer',
                                                        background: isSelected ? 'var(--color-primary)10' : 'transparent',
                                                        transition: 'all 0.15s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isSelected) e.currentTarget.style.background = 'var(--quiet-gray-50)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                                                    }}
                                                >
                                                    {/* Checkbox for files and folders */}
                                                    <div
                                                        onClick={(e) => file.is_folder && handleFolderSelect(file, e)}
                                                        style={{
                                                            width: '20px',
                                                            height: '20px',
                                                            borderRadius: '4px',
                                                            border: isSelected ? 'none' : '2px solid var(--color-border)',
                                                            background: isSelected ? (file.is_folder ? '#f59e0b' : 'var(--color-primary)') : 'transparent',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                            cursor: file.is_folder ? 'pointer' : 'default'
                                                        }}>
                                                        {isSelected && <Check size={14} color="white" />}
                                                    </div>

                                                    {getFileIcon(file)}

                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{
                                                            fontSize: '14px',
                                                            fontWeight: 500,
                                                            color: 'var(--color-text)',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}>
                                                            {file.name}
                                                        </div>
                                                        <div style={{
                                                            fontSize: '12px',
                                                            color: 'var(--color-text-secondary)'
                                                        }}>
                                                            {file.is_folder ? 'مجلد - انقر على المربع لتعيينه' : formatSize(file.size)}
                                                        </div>
                                                    </div>

                                                    {file.is_folder && (
                                                        <ArrowRight size={16} style={{ color: 'var(--color-text-secondary)' }} />
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Selected Count */}
                                {selectedFiles.length > 0 && (
                                    <div style={{
                                        padding: '12px 16px',
                                        background: 'var(--color-primary)10',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        color: 'var(--color-primary)',
                                        fontWeight: 500
                                    }}>
                                        تم اختيار {selectedFiles.length} ملف
                                    </div>
                                )}

                                {/* Client Permissions */}
                                {selectedFiles.length > 0 && (
                                    <div style={{
                                        padding: '16px',
                                        background: 'var(--quiet-gray-50)',
                                        borderRadius: '8px',
                                        marginTop: '8px'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginBottom: '12px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: 'var(--color-heading)'
                                        }}>
                                            <Shield size={16} />
                                            صلاحيات العميل
                                        </div>
                                        <div style={{ display: 'flex', gap: '16px' }}>
                                            <label style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                cursor: 'pointer',
                                                fontSize: '13px'
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={clientCanView}
                                                    onChange={(e) => setClientCanView(e.target.checked)}
                                                    style={{ width: '16px', height: '16px' }}
                                                />
                                                <Eye size={14} />
                                                يمكنه العرض
                                            </label>
                                            <label style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                cursor: 'pointer',
                                                fontSize: '13px'
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={clientCanDownload}
                                                    onChange={(e) => setClientCanDownload(e.target.checked)}
                                                    style={{ width: '16px', height: '16px' }}
                                                />
                                                <Download size={14} />
                                                يمكنه التحميل
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    {status?.connected && (
                        <div className="task-modal-footer">
                            <button className="btn-secondary" onClick={onClose}>
                                إلغاء
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleAssign}
                                disabled={selectedFiles.length === 0 || saving}
                            >
                                {saving ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Check size={16} />
                                )}
                                تعيين للقضية ({selectedFiles.length})
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CloudFilePickerModal;
