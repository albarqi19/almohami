import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    FolderPlus,
    Search,
    Folder,
    Check,
    Loader2,
    AlertCircle,
    CheckCircle,
    FileText
} from 'lucide-react';
import type { Case } from '../types';

interface AssignFileToCaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentId: number;
    documentName: string;
    cases: Case[];
    currentCaseId?: string;
    onAssigned?: () => void;
    isCloudFile?: boolean;
    cloudFileId?: string;
}

const AssignFileToCaseModal: React.FC<AssignFileToCaseModalProps> = ({
    isOpen,
    onClose,
    documentId,
    documentName,
    cases,
    currentCaseId,
    onAssigned,
    isCloudFile,
    cloudFileId
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(currentCaseId || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const filteredCases = cases.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.file_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAssign = async () => {
        if (!selectedCaseId) {
            setError('الرجاء اختيار قضية');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // For cloud files, use the cloud file registration endpoint
            if (isCloudFile && cloudFileId) {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'}/onedrive-direct/documents/register-upload`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            case_id: parseInt(selectedCaseId),
                            cloud_file_id: cloudFileId,
                            file_name: documentName,
                            file_size: 0,
                            mime_type: 'application/octet-stream'
                        })
                    }
                );

                const data = await response.json();

                if (data.success || response.ok) {
                    setSuccess('تم تعيين الملف للقضية بنجاح');
                    setTimeout(() => {
                        onAssigned?.();
                        onClose();
                    }, 1500);
                } else {
                    setError(data.error || data.message || 'فشل في تعيين الملف');
                }
            } else {
                // For regular documents
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'}/documents/${documentId}/assign-case`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ case_id: selectedCaseId })
                    }
                );

                const data = await response.json();

                if (data.success || response.ok) {
                    setSuccess('تم تعيين الملف للقضية بنجاح');
                    setTimeout(() => {
                        onAssigned?.();
                        onClose();
                    }, 1500);
                } else {
                    setError(data.message || 'فشل في تعيين الملف');
                }
            }
        } catch (err) {
            setError('حدث خطأ أثناء تعيين الملف');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveAssignment = async () => {
        if (!currentCaseId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'}/documents/${documentId}/unassign-case`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = await response.json();

            if (data.success || response.ok) {
                setSuccess('تم إلغاء تعيين الملف');
                setSelectedCaseId(null);
                setTimeout(() => {
                    onAssigned?.();
                    onClose();
                }, 1500);
            } else {
                setError(data.message || 'فشل في إلغاء التعيين');
            }
        } catch (err) {
            setError('حدث خطأ أثناء إلغاء التعيين');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px'
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '80vh',
                        backgroundColor: 'var(--color-surface)',
                        borderRadius: '16px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '20px 24px',
                        borderBottom: '1px solid var(--color-border)',
                        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: 'rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <FolderPlus size={20} color="white" />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, color: 'white', fontSize: '16px', fontWeight: 600 }}>
                                    تعيين ملف لقضية
                                </h2>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                                    {documentName}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px',
                                cursor: 'pointer',
                                color: 'white'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                        {/* Alerts */}
                        {error && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px',
                                background: '#fef2f2',
                                borderRadius: '8px',
                                color: '#dc2626',
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
                                padding: '12px',
                                background: '#f0fdf4',
                                borderRadius: '8px',
                                color: '#16a34a',
                                fontSize: '13px',
                                marginBottom: '16px'
                            }}>
                                <CheckCircle size={16} />
                                {success}
                            </div>
                        )}

                        {/* Current Assignment */}
                        {currentCaseId && (
                            <div style={{
                                padding: '16px',
                                background: 'var(--color-bg-secondary)',
                                borderRadius: '12px',
                                marginBottom: '16px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <FileText size={16} color="var(--color-primary)" />
                                    <span style={{ fontSize: '13px', fontWeight: 600 }}>معين حالياً لـ:</span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <span style={{ fontSize: '14px' }}>
                                        {cases.find(c => c.id === currentCaseId)?.title || 'قضية غير معروفة'}
                                    </span>
                                    <button
                                        onClick={handleRemoveAssignment}
                                        disabled={loading}
                                        style={{
                                            padding: '6px 12px',
                                            background: '#fee2e2',
                                            color: '#dc2626',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '12px'
                                        }}
                                    >
                                        إلغاء التعيين
                                    </button>
                                </div>
                            </div>
                        )}

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
                                placeholder="ابحث عن قضية..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 40px',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    background: 'var(--color-surface)'
                                }}
                            />
                        </div>

                        {/* Cases List */}
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {filteredCases.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '32px',
                                    color: 'var(--color-text-secondary)'
                                }}>
                                    لا توجد قضايا مطابقة
                                </div>
                            ) : (
                                filteredCases.map(caseItem => (
                                    <div
                                        key={caseItem.id}
                                        onClick={() => setSelectedCaseId(caseItem.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '14px',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            marginBottom: '8px',
                                            background: selectedCaseId === caseItem.id
                                                ? 'var(--color-primary-light)'
                                                : 'var(--color-bg-secondary)',
                                            border: selectedCaseId === caseItem.id
                                                ? '2px solid var(--color-primary)'
                                                : '2px solid transparent',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '10px',
                                            background: selectedCaseId === caseItem.id
                                                ? 'var(--color-primary)'
                                                : 'var(--color-bg-tertiary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: selectedCaseId === caseItem.id ? 'white' : '#f59e0b'
                                        }}>
                                            <Folder size={20} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                marginBottom: '2px'
                                            }}>
                                                {caseItem.title}
                                            </div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: 'var(--color-text-secondary)'
                                            }}>
                                                {caseItem.file_number && `رقم: ${caseItem.file_number} • `}
                                                {caseItem.client_name}
                                            </div>
                                        </div>
                                        {selectedCaseId === caseItem.id && (
                                            <Check size={20} color="var(--color-primary)" />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '16px 24px',
                        borderTop: '1px solid var(--color-border)',
                        display: 'flex',
                        gap: '12px'
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: 'var(--color-bg-secondary)',
                                color: 'var(--color-text)',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 500
                            }}
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleAssign}
                            disabled={!selectedCaseId || loading || selectedCaseId === currentCaseId}
                            style={{
                                flex: 2,
                                padding: '12px',
                                background: selectedCaseId && selectedCaseId !== currentCaseId
                                    ? 'var(--color-primary)'
                                    : 'var(--color-bg-tertiary)',
                                color: selectedCaseId && selectedCaseId !== currentCaseId
                                    ? 'white'
                                    : 'var(--color-text-secondary)',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: selectedCaseId && selectedCaseId !== currentCaseId
                                    ? 'pointer'
                                    : 'not-allowed',
                                fontSize: '14px',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            {loading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <FolderPlus size={18} />
                            )}
                            تعيين للقضية
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AssignFileToCaseModal;
