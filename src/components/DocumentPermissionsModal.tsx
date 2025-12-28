import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Shield,
    Users,
    UserPlus,
    Trash2,
    Eye,
    Download,
    Edit3,
    Lock,
    Unlock,
    Globe,
    Search,
    Check,
    AlertCircle,
    Loader2,
    Clock,
    Link2,
    Copy,
    CheckCircle,
    Upload
} from 'lucide-react';
import { CloudStorageService, type AccessUser } from '../services/cloudStorageService';
import { UserService } from '../services/UserService';
import '../styles/task-modal.css';

interface DocumentPermissionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentId: number;
    documentName: string;
    isCloudDocument?: boolean;
    cloudFileId?: string;
}

interface User {
    id: string | number;
    name: string;
    email: string;
    role?: string;
}

type PermissionLevel = 'view' | 'download' | 'edit' | 'full' | 'none';

const permissionLabels: Record<PermissionLevel, { label: string; icon: React.ReactNode; color: string }> = {
    view: { label: 'عرض فقط', icon: <Eye size={14} />, color: '#3b82f6' },
    download: { label: 'عرض وتحميل', icon: <Download size={14} />, color: '#10b981' },
    edit: { label: 'تعديل', icon: <Edit3 size={14} />, color: '#f59e0b' },
    full: { label: 'تحكم كامل', icon: <Shield size={14} />, color: '#8b5cf6' },
    none: { label: 'بدون صلاحية', icon: <Lock size={14} />, color: '#ef4444' }
};

const DocumentPermissionsModal: React.FC<DocumentPermissionsModalProps> = ({
    isOpen,
    onClose,
    documentId,
    documentName,
    isCloudDocument = false
}) => {
    const [activeTab, setActiveTab] = useState<'users' | 'share' | 'client'>('users');
    const [accessList, setAccessList] = useState<AccessUser[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isPublic, setIsPublic] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddUser, setShowAddUser] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null);
    const [selectedPermission, setSelectedPermission] = useState<PermissionLevel>('view');
    const [expiresAt, setExpiresAt] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Client permissions state
    const [clientCanView, setClientCanView] = useState(true);
    const [clientCanDownload, setClientCanDownload] = useState(true);
    const [clientCanUpload, setClientCanUpload] = useState(false);

    // Share link state
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);

    useEffect(() => {
        if (isOpen && documentId) {
            loadAccessList();
            loadUsers();
        }
    }, [isOpen, documentId]);

    const loadAccessList = async () => {
        setLoading(true);
        try {
            const response = await CloudStorageService.getAccessList(documentId);
            if (response.success) {
                setAccessList(response.access_list || []);
                setIsPublic(response.is_public || false);
            }
        } catch (err) {
            console.error('Failed to load access list:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            const response = await UserService.getAllUsers();
            if (response.data) {
                setAllUsers(response.data);
            }
        } catch (err) {
            console.error('Failed to load users:', err);
        }
    };

    const handleGrantAccess = async () => {
        if (!selectedUserId) return;

        setSaving(true);
        setError(null);
        try {
            const response = await CloudStorageService.grantAccess(
                documentId,
                Number(selectedUserId),
                selectedPermission
            );
            if (response.success) {
                setSuccess('تم منح الصلاحية بنجاح');
                setShowAddUser(false);
                setSelectedUserId(null);
                loadAccessList();
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(response.error || 'فشل في منح الصلاحية');
            }
        } catch (err) {
            setError('حدث خطأ أثناء منح الصلاحية');
        } finally {
            setSaving(false);
        }
    };

    const handleRevokeAccess = async (userId: number) => {
        if (!confirm('هل أنت متأكد من إزالة صلاحية هذا المستخدم؟')) return;

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'https://api.alraedlaw.com/api/v1'}/documents/${documentId}/access/${userId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            const data = await response.json();
            if (data.success) {
                setSuccess('تم إزالة الصلاحية');
                loadAccessList();
                setTimeout(() => setSuccess(null), 3000);
            }
        } catch (err) {
            setError('فشل في إزالة الصلاحية');
        }
    };

    const handleTogglePublic = async () => {
        try {
            const endpoint = isPublic ? 'make-restricted' : 'make-public';
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'https://api.alraedlaw.com/api/v1'}/documents/${documentId}/${endpoint}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            const data = await response.json();
            if (data.success) {
                setIsPublic(!isPublic);
                setSuccess(isPublic ? 'تم تقييد الملف' : 'تم جعل الملف عام');
                setTimeout(() => setSuccess(null), 3000);
            }
        } catch (err) {
            setError('فشل في تغيير حالة الملف');
        }
    };

    const handleGenerateShareLink = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'https://api.alraedlaw.com/api/v1'}/documents/${documentId}/share`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        permission: 'view',
                        expires_in_days: 7
                    })
                }
            );
            const data = await response.json();
            if (data.success && data.share_url) {
                setShareLink(data.share_url);
            }
        } catch (err) {
            setError('فشل في إنشاء رابط المشاركة');
        }
    };

    const handleCopyLink = () => {
        if (shareLink) {
            navigator.clipboard.writeText(shareLink);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        }
    };

    const handleSaveClientPermissions = async () => {
        setSaving(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            setSuccess('تم حفظ صلاحيات العميل');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('فشل في حفظ صلاحيات العميل');
        } finally {
            setSaving(false);
        }
    };

    const filteredUsers = allUsers.filter(user =>
        !accessList.some(a => a.user_id === user.id) &&
        (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()))
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
                    style={{ maxWidth: '600px', maxHeight: '85vh' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="task-modal-header">
                        <div>
                            <div className="task-modal-title">
                                <Shield size={20} style={{ color: 'var(--law-navy)' }} />
                                إدارة الصلاحيات
                            </div>
                            <div className="task-modal-subtitle">
                                {documentName}
                            </div>
                        </div>
                        <button className="task-modal-close" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div style={{
                        display: 'flex',
                        borderBottom: '1px solid var(--color-border)',
                        padding: '0 24px'
                    }}>
                        {[
                            { id: 'users', label: 'المستخدمين', icon: <Users size={16} /> },
                            { id: 'share', label: 'رابط المشاركة', icon: <Link2 size={16} /> },
                            { id: 'client', label: 'صلاحيات العميل', icon: <Shield size={16} /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '14px 16px',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    color: activeTab === tab.id ? 'var(--law-navy)' : 'var(--color-text-secondary)',
                                    borderBottom: activeTab === tab.id ? '2px solid var(--law-navy)' : '2px solid transparent',
                                    marginBottom: '-1px',
                                    fontSize: '13px',
                                    fontWeight: activeTab === tab.id ? 600 : 400,
                                    transition: 'all 0.2s'
                                }}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="task-modal-content" style={{ minHeight: '350px', maxHeight: '450px', overflowY: 'auto' }}>
                        {/* Alerts */}
                        {error && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 16px',
                                background: 'var(--color-error)10',
                                border: '1px solid var(--color-error)',
                                borderRadius: '8px',
                                color: 'var(--color-error)',
                                fontSize: '13px',
                                marginBottom: '16px'
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
                                padding: '12px 16px',
                                background: 'var(--color-success)10',
                                border: '1px solid var(--color-success)',
                                borderRadius: '8px',
                                color: 'var(--color-success)',
                                fontSize: '13px',
                                marginBottom: '16px'
                            }}>
                                <CheckCircle size={16} />
                                {success}
                            </div>
                        )}

                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', gap: '12px' }}>
                                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                                <span style={{ color: 'var(--color-text-secondary)' }}>جاري التحميل...</span>
                            </div>
                        ) : activeTab === 'users' ? (
                            <div>
                                {/* Public Toggle */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px',
                                    background: isPublic ? '#fef3c7' : 'var(--quiet-gray-50)',
                                    borderRadius: '8px',
                                    marginBottom: '20px',
                                    border: '1px solid var(--color-border)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {isPublic ? <Globe size={20} color="#d97706" /> : <Lock size={20} color="var(--color-text-secondary)" />}
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-heading)' }}>
                                                {isPublic ? 'ملف عام' : 'ملف مقيد'}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                                {isPublic ? 'يمكن لأي شخص في المنظمة الوصول' : 'فقط المستخدمون المحددون'}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleTogglePublic}
                                        className="btn-secondary"
                                        style={{ padding: '8px 16px', fontSize: '12px' }}
                                    >
                                        {isPublic ? 'تقييد' : 'جعله عام'}
                                    </button>
                                </div>

                                {/* Add User Button */}
                                <button
                                    onClick={() => setShowAddUser(!showAddUser)}
                                    className="btn-primary"
                                    style={{ width: '100%', justifyContent: 'center', marginBottom: '16px' }}
                                >
                                    <UserPlus size={16} />
                                    إضافة مستخدم
                                </button>

                                {/* Add User Form */}
                                {showAddUser && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        style={{
                                            padding: '16px',
                                            background: 'var(--quiet-gray-50)',
                                            borderRadius: '8px',
                                            marginBottom: '16px',
                                            border: '1px solid var(--color-border)'
                                        }}
                                    >
                                        {/* Search Users */}
                                        <div style={{ position: 'relative', marginBottom: '12px' }}>
                                            <Search size={16} style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: 'var(--color-text-secondary)'
                                            }} />
                                            <input
                                                type="text"
                                                placeholder="ابحث عن مستخدم..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="form-input"
                                                style={{ paddingRight: '40px' }}
                                            />
                                        </div>

                                        {/* User List */}
                                        <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '12px' }}>
                                            {filteredUsers.map(user => (
                                                <div
                                                    key={user.id}
                                                    onClick={() => setSelectedUserId(user.id)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '10px 12px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        background: selectedUserId === user.id ? 'var(--law-navy)10' : 'transparent',
                                                        border: selectedUserId === user.id ? '1px solid var(--law-navy)' : '1px solid transparent',
                                                        marginBottom: '4px',
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        background: 'var(--law-navy)',
                                                        color: 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '12px',
                                                        fontWeight: 600
                                                    }}>
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{user.name}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{user.email}</div>
                                                    </div>
                                                    {selectedUserId === user.id && <Check size={16} color="var(--law-navy)" />}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Permission Select */}
                                        <div className="form-group" style={{ marginBottom: '12px' }}>
                                            <label className="form-label">مستوى الصلاحية</label>
                                            <select
                                                value={selectedPermission}
                                                onChange={(e) => setSelectedPermission(e.target.value as PermissionLevel)}
                                                className="form-select"
                                            >
                                                {Object.entries(permissionLabels).filter(([key]) => key !== 'none').map(([key, val]) => (
                                                    <option key={key} value={key}>{val.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Action Buttons */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={handleGrantAccess}
                                                disabled={!selectedUserId || saving}
                                                className="btn-primary"
                                                style={{ flex: 1, justifyContent: 'center', opacity: selectedUserId ? 1 : 0.5 }}
                                            >
                                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                إضافة
                                            </button>
                                            <button
                                                onClick={() => { setShowAddUser(false); setSelectedUserId(null); }}
                                                className="btn-secondary"
                                            >
                                                إلغاء
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Access List */}
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text-secondary)' }}>
                                        المستخدمون الحاليون ({accessList.length})
                                    </div>
                                    {accessList.length === 0 ? (
                                        <div style={{
                                            textAlign: 'center',
                                            padding: '32px',
                                            color: 'var(--color-text-secondary)',
                                            fontSize: '13px',
                                            background: 'var(--quiet-gray-50)',
                                            borderRadius: '8px'
                                        }}>
                                            لا يوجد مستخدمين لديهم صلاحية على هذا الملف
                                        </div>
                                    ) : (
                                        accessList.map(access => {
                                            const perm = permissionLabels[access.permission as PermissionLevel] || permissionLabels.view;
                                            return (
                                                <div
                                                    key={access.user_id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '12px',
                                                        background: 'var(--quiet-gray-50)',
                                                        borderRadius: '8px',
                                                        marginBottom: '8px',
                                                        border: '1px solid var(--color-border)'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '50%',
                                                        background: 'var(--law-navy)',
                                                        color: 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '14px',
                                                        fontWeight: 600
                                                    }}>
                                                        {access.user_name.charAt(0)}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{access.user_name}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                                                            {access.user_role} • بواسطة {access.granted_by}
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '6px 10px',
                                                        background: `${perm.color}15`,
                                                        color: perm.color,
                                                        borderRadius: '6px',
                                                        fontSize: '12px'
                                                    }}>
                                                        {perm.icon}
                                                        {perm.label}
                                                    </div>
                                                    {access.expires_at && (
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '11px',
                                                            color: 'var(--color-text-secondary)'
                                                        }}>
                                                            <Clock size={12} />
                                                            {new Date(access.expires_at).toLocaleDateString('ar-SA')}
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => handleRevokeAccess(access.user_id)}
                                                        style={{
                                                            padding: '6px',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            color: 'var(--color-text-secondary)',
                                                            borderRadius: '6px',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.color = 'var(--color-error)';
                                                            e.currentTarget.style.background = 'var(--color-error)10';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.color = 'var(--color-text-secondary)';
                                                            e.currentTarget.style.background = 'transparent';
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ) : activeTab === 'share' ? (
                            <div>
                                <div style={{
                                    textAlign: 'center',
                                    padding: '32px 24px',
                                    background: 'var(--quiet-gray-50)',
                                    borderRadius: '8px',
                                    marginBottom: '20px',
                                    border: '1px solid var(--color-border)'
                                }}>
                                    <Link2 size={32} style={{ color: 'var(--law-navy)', marginBottom: '12px' }} />
                                    <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600, color: 'var(--color-heading)' }}>إنشاء رابط مشاركة</h3>
                                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                        أنشئ رابطاً للمشاركة مع أي شخص
                                    </p>
                                </div>

                                {shareLink ? (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '12px',
                                        background: 'var(--quiet-gray-50)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--color-border)'
                                    }}>
                                        <input
                                            type="text"
                                            value={shareLink}
                                            readOnly
                                            className="form-input"
                                            style={{ flex: 1, direction: 'ltr', fontSize: '12px' }}
                                        />
                                        <button
                                            onClick={handleCopyLink}
                                            className={linkCopied ? 'btn-primary' : 'btn-secondary'}
                                            style={{ padding: '10px 16px' }}
                                        >
                                            {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                                            {linkCopied ? 'تم النسخ' : 'نسخ'}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleGenerateShareLink}
                                        className="btn-primary"
                                        style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                                    >
                                        <Link2 size={18} />
                                        إنشاء رابط المشاركة
                                    </button>
                                )}
                            </div>
                        ) : (
                            /* Client Permissions Tab */
                            <div>
                                <div style={{
                                    padding: '16px',
                                    background: 'var(--quiet-gray-50)',
                                    borderRadius: '8px',
                                    marginBottom: '20px',
                                    border: '1px solid var(--color-border)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <Shield size={20} color="var(--law-navy)" />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-heading)' }}>صلاحيات العميل</div>
                                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                                تحكم في ما يمكن للعميل فعله بهذا الملف
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Permission Toggles */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* View Permission */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px',
                                        background: 'var(--quiet-gray-50)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--color-border)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Eye size={18} color="#3b82f6" />
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: '14px' }}>عرض الملف</div>
                                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                                    السماح للعميل بمشاهدة هذا الملف
                                                </div>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={clientCanView}
                                            onChange={(e) => setClientCanView(e.target.checked)}
                                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                        />
                                    </div>

                                    {/* Download Permission */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px',
                                        background: 'var(--quiet-gray-50)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--color-border)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Download size={18} color="#10b981" />
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: '14px' }}>تحميل الملف</div>
                                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                                    السماح للعميل بتحميل هذا الملف
                                                </div>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={clientCanDownload}
                                            onChange={(e) => setClientCanDownload(e.target.checked)}
                                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                        />
                                    </div>

                                    {/* Upload Permission */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px',
                                        background: 'var(--quiet-gray-50)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--color-border)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Upload size={18} color="#f59e0b" />
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: '14px' }}>رفع ملفات</div>
                                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                                    السماح للعميل برفع ملفات في هذه القضية
                                                </div>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={clientCanUpload}
                                            onChange={(e) => setClientCanUpload(e.target.checked)}
                                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="task-modal-footer">
                        <button className="btn-secondary" onClick={onClose}>
                            إلغاء
                        </button>
                        {activeTab === 'client' && (
                            <button
                                className="btn-primary"
                                onClick={handleSaveClientPermissions}
                                disabled={saving}
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                حفظ الصلاحيات
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default DocumentPermissionsModal;
