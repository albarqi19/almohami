import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
    Search,
    MoreHorizontal,
    Calendar,
    User,
    FileText,
    Download,
    Eye,
    Upload,
    Folder,
    File,
    Image,
    FileVideo,
    Archive,
    Grid,
    List,
    Filter,
    Clock,
    Star,
    Trash2,
    HardDrive,
    X,
    Share2,
    Copy,
    Cloud,
    CloudOff,
    Link2,
    Loader2,
    CheckCircle,
    AlertCircle,
    ExternalLink,
    Shield,
    Settings,
    FolderPlus
} from 'lucide-react';
import type { Document as DocumentType, Case } from '../types';
import DocumentUploadModal from '../components/DocumentUploadModal';
import LegalMemoModal from '../components/LegalMemoModal';
import DocumentPermissionsModal from '../components/DocumentPermissionsModal';
import AssignFileToCaseModal from '../components/AssignFileToCaseModal';
import CloudStorageSettingsModal from '../components/CloudStorageSettingsModal';
import ContextMenu, { createOneDriveContextMenu } from '../components/ContextMenu';
import SecurePdfViewer from '../components/SecurePdfViewer';
import SecureWordViewer from '../components/SecureWordViewer';
import { DocumentService } from '../services/documentService';
import { CaseService } from '../services/caseService';
import { CloudStorageService } from '../services/cloudStorageService';
import type { CloudStorageStatus, CloudStorageFile } from '../services/cloudStorageService';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import '../styles/documents-page.css';

const CACHE_KEY = 'documents_data';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

const Documents: React.FC = () => {
    const [documents, setDocuments] = useState<DocumentType[]>(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_DURATION) {
                    return data.documents || [];
                }
            }
        } catch (e) { console.error('Cache error:', e); }
        return [];
    });
    const [loading, setLoading] = useState(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const { timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_DURATION) return false;
            }
        } catch (e) { }
        return true;
    });
    const [cases, setCases] = useState<Case[]>(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_DURATION) {
                    return data.cases || [];
                }
            }
        } catch (e) { }
        return [];
    });

    // UI States
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

    // Selection & Split View
    const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);

    // Modals
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showCreateMemo, setShowCreateMemo] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showCloudSettings, setShowCloudSettings] = useState(false);
    const [selectedDocForPermissions, setSelectedDocForPermissions] = useState<DocumentType | null>(null);
    const [selectedCloudFile, setSelectedCloudFile] = useState<CloudStorageFile | null>(null);

    // OneDrive States
    const [oneDriveStatus, setOneDriveStatus] = useState<CloudStorageStatus | null>(null);
    const [oneDriveFiles, setOneDriveFiles] = useState<CloudStorageFile[]>([]);
    const [oneDriveLoading, setOneDriveLoading] = useState(false);
    const [oneDriveConnecting, setOneDriveConnecting] = useState(false);
    const [showOneDriveFiles, setShowOneDriveFiles] = useState(false);
    const [currentOneDriveFolder, setCurrentOneDriveFolder] = useState<string>('root');
    const [selectedOneDriveFile, setSelectedOneDriveFile] = useState<CloudStorageFile | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        file: CloudStorageFile | null;
    }>({ isOpen: false, position: { x: 0, y: 0 }, file: null });

    useEffect(() => {
        // Only fetch if no cached data exists
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_DURATION && data.documents?.length > 0) {
                    // Cache is valid, already loaded in initial state
                    return;
                }
            } catch (e) { }
        }
        loadData();
    }, []);

    // Check OneDrive connection status on mount
    useEffect(() => {
        checkOneDriveStatus();
    }, []);

    // Handle OneDrive OAuth callback
    useEffect(() => {
        const isCallback = searchParams.get('onedrive_callback');
        if (isCallback) {
            const success = searchParams.get('success') === 'true';
            const error = searchParams.get('error');

            if (success) {
                checkOneDriveStatus();
            } else if (error) {
                console.error('OneDrive connection failed:', error);
            }

            // Clean up URL params
            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

    const checkOneDriveStatus = async () => {
        try {
            const status = await CloudStorageService.getOneDriveStatus();
            setOneDriveStatus(status);
        } catch (error) {
            console.error('Failed to check OneDrive status:', error);
        }
    };

    const handleConnectOneDrive = async () => {
        setOneDriveConnecting(true);
        try {
            await CloudStorageService.connectOneDrive();
        } catch (error) {
            console.error('Failed to start OneDrive connection:', error);
            setOneDriveConnecting(false);
        }
    };

    const handleDisconnectOneDrive = async () => {
        if (!confirm('هل أنت متأكد من إلغاء ربط OneDrive؟')) return;

        try {
            await CloudStorageService.disconnectOneDrive();
            setOneDriveStatus(null);
            setOneDriveFiles([]);
            setShowOneDriveFiles(false);
        } catch (error) {
            console.error('Failed to disconnect OneDrive:', error);
        }
    };

    const loadOneDriveFiles = async (folderId?: string) => {
        setOneDriveLoading(true);
        try {
            const response = await CloudStorageService.getOneDriveFiles(folderId);
            setOneDriveFiles(response.files);
            setCurrentOneDriveFolder(response.folder_id);
        } catch (error) {
            console.error('Failed to load OneDrive files:', error);
        } finally {
            setOneDriveLoading(false);
        }
    };

    const handleShowOneDriveFiles = () => {
        setShowOneDriveFiles(true);
        setActiveCategory('');
        setSelectedCaseId(null);
        loadOneDriveFiles();
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [docsRes, casesRes] = await Promise.all([
                DocumentService.getDocuments(),
                CaseService.getCases({ limit: 100 })
            ]);
            const docsData = docsRes.data || [];
            const casesData = casesRes.data || [];
            setDocuments(docsData);
            setCases(casesData);
            // Save to cache
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                data: { documents: docsData, cases: casesData },
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // تحديث تلقائي عند العودة للصفحة
    useAutoRefresh({
        onRefresh: loadData,
        refetchOnFocus: true,
        pollingInterval: 0, // بدون polling للمستندات
    });

    const getFileIcon = (mimeType: string) => {
        const type = mimeType?.toLowerCase() || '';
        if (type.includes('pdf')) return <FileText className="text-red-500" />;
        if (type.includes('word') || type.includes('document')) return <FileText className="text-blue-500" />;
        if (type.includes('image')) return <Image className="text-purple-500" />;
        if (type.includes('video')) return <FileVideo className="text-pink-500" />;
        if (type.includes('zip') || type.includes('compressed')) return <Archive className="text-yellow-500" />;
        return <File className="text-gray-400" />;
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // Filter Logic
    const filteredDocuments = documents.filter(doc => {
        // Search
        const searchMatch = !searchTerm ||
            doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.fileName?.toLowerCase().includes(searchTerm.toLowerCase());

        // Category
        let categoryMatch = true;
        if (activeCategory === 'recent') {
            categoryMatch = true; // Implement proper logic if available
        } else if (selectedCaseId) {
            categoryMatch = doc.relatedCaseId === selectedCaseId || doc.case_id === selectedCaseId;
        }

        return searchMatch && categoryMatch;
    });

    const handleDocumentClick = (doc: DocumentType) => {
        if (selectedDocument?.id === doc.id) {
            // Deselect if already selected ?? Maybe keep it open to avoid accidental closes
            // setSelectedDocument(null); 
        } else {
            setSelectedDocument(doc);
        }
    };

    const closePreview = () => {
        setSelectedDocument(null);
    };

    // Preview Pane Content - Unified for both Local and OneDrive files
    const PreviewPane = ({ doc }: { doc: DocumentType }) => {
        const [blobUrl, setBlobUrl] = useState<string | null>(null);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState<string | null>(null);

        const isCloudFile = !!doc.cloud_file_id;
        const isImage = doc.mimeType?.includes('image') || doc.mime_type?.includes('image');
        const isPdf = doc.mimeType?.includes('pdf') || doc.mime_type?.includes('pdf');
        const isWord = doc.mimeType?.includes('word') || doc.mime_type?.includes('word') ||
            doc.mime_type?.includes('document') ||
            doc.file_name?.endsWith('.docx') || doc.file_name?.endsWith('.doc');

        useEffect(() => {
            const fetchPreview = async () => {
                setLoading(true);
                setError(null);
                // Clean up previous blob
                if (blobUrl) URL.revokeObjectURL(blobUrl);
                setBlobUrl(null);

                try {
                    const token = localStorage.getItem('authToken');
                    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.alraedlaw.com/api/v1';

                    if (isCloudFile && doc.cloud_file_id) {
                        // OneDrive file - get direct URL
                        const response = await fetch(`${apiUrl}/cloud-storage/onedrive/preview-url/${doc.cloud_file_id}`, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'ngrok-skip-browser-warning': '69420'
                            }
                        });

                        if (!response.ok) throw new Error('Failed to load preview URL');

                        const data = await response.json();
                        if (data.success && data.download_url) {
                            setBlobUrl(data.download_url);
                        } else {
                            setError(data.message || 'فشل جلب رابط المعاينة');
                        }
                    } else {
                        // Local file - download and create blob URL
                        const response = await fetch(`${apiUrl}/documents/${doc.id}/preview`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });

                        if (!response.ok) throw new Error('Failed to load preview');

                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        setBlobUrl(url);
                    }
                } catch (err) {
                    console.error(err);
                    setError('فشل تحميل المعاينة');
                } finally {
                    setLoading(false);
                }
            };

            fetchPreview();

            return () => {
                if (blobUrl && !isCloudFile) URL.revokeObjectURL(blobUrl);
            };
        }, [doc.id, doc.cloud_file_id]);

        return (
            <div className="docs-preview-pane">
                {/* Header with action buttons - matching OneDrive */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--color-border)',
                    background: 'var(--color-bg-secondary)'
                }}>
                    {/* Action buttons - compact style */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => console.log('Download')}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'var(--color-primary)',
                                background: 'var(--color-primary-bg)',
                                border: '1px solid var(--color-primary)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                        >
                            <Download size={12} /> تنزيل
                        </button>
                        <button
                            onClick={() => {
                                setSelectedDocForPermissions(doc);
                                setShowPermissionsModal(true);
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'var(--color-text-secondary)',
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            <Shield size={12} /> صلاحيات
                        </button>
                        <button
                            onClick={() => {
                                setSelectedDocForPermissions(doc);
                                setShowAssignModal(true);
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'var(--color-text-secondary)',
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            <FolderPlus size={12} /> تعيين
                        </button>
                        <button
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'var(--color-text-secondary)',
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            <Share2 size={12} /> مشاركة
                        </button>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={closePreview}
                        style={{
                            padding: '4px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-text-secondary)',
                            borderRadius: '4px'
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* File info */}
                <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <HardDrive size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                        <div style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--color-heading)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {doc.title || doc.fileName}
                        </div>
                        <div style={{
                            fontSize: '11px',
                            color: 'var(--color-text-tertiary)',
                            display: 'flex',
                            gap: '8px'
                        }}>
                            {doc.fileSize && <span>{formatSize(doc.fileSize || doc.file_size)}</span>}
                            {doc.uploadedAt && <span>{new Date(doc.uploadedAt || doc.uploaded_at).toLocaleDateString('ar-SA')}</span>}
                        </div>
                    </div>
                </div>

                {/* Preview content area - matching OneDrive */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    background: 'var(--color-bg-primary)'
                }}>
                    {loading ? (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                            <span style={{ marginTop: '8px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                                جاري التحميل...
                            </span>
                        </div>
                    ) : error ? (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-error)',
                            fontSize: 13
                        }}>{error}</div>
                    ) : isImage && blobUrl ? (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px'
                        }}>
                            <img
                                src={blobUrl}
                                alt="Preview"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain',
                                    borderRadius: '6px'
                                }}
                            />
                        </div>
                    ) : isPdf && blobUrl ? (
                        isCloudFile ? (
                            <SecurePdfViewer url={blobUrl} fileName={doc.file_name || doc.fileName || 'document.pdf'} />
                        ) : (
                            <iframe
                                src={blobUrl}
                                title="PDF Preview"
                                style={{
                                    flex: 1,
                                    width: '100%',
                                    border: 'none'
                                }}
                            />
                        )
                    ) : isWord && blobUrl && isCloudFile ? (
                        <SecureWordViewer url={blobUrl} fileName={doc.file_name || doc.fileName || 'document.docx'} />
                    ) : (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12
                        }}>
                            {getFileIcon(doc.mimeType || doc.mime_type)}
                            <span>لا توجد معاينة متاحة لهذا النوع</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // OneDrive Preview Pane Content
    const OneDrivePreviewPane = ({ file }: { file: CloudStorageFile }) => {
        const [directUrl, setDirectUrl] = useState<string | null>(null);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState<string | null>(null);

        const isImage = file.mime_type?.includes('image');
        const isPdf = file.mime_type?.includes('pdf');
        const isWord = file.mime_type?.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc');
        const isExcel = file.mime_type?.includes('excel') || file.mime_type?.includes('spreadsheet') || file.name.endsWith('.xlsx');

        // Fetch direct download URL from backend
        useEffect(() => {
            // Fetch for files that can be previewed (images, PDFs, Word docs)
            if (file.id && !file.is_folder && (isImage || isPdf || isWord)) {
                setLoading(true);
                setError(null);
                const token = localStorage.getItem('authToken');
                const apiUrl = import.meta.env.VITE_API_URL || 'https://api.alraedlaw.com/api/v1';

                fetch(`${apiUrl}/cloud-storage/onedrive/preview-url/${file.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'ngrok-skip-browser-warning': '69420'
                    }
                })
                    .then(async res => {
                        if (!res.ok) {
                            const text = await res.text();
                            console.error('Preview URL failed:', res.status, text);
                            throw new Error(`HTTP ${res.status}`);
                        }
                        return res.json();
                    })
                    .then(data => {
                        if (data.success && data.download_url) {
                            setDirectUrl(data.download_url);
                        } else {
                            setError(data.message || 'فشل جلب رابط المعاينة');
                        }
                    })
                    .catch(err => {
                        console.error('Failed to get preview URL:', err);
                        setError('فشل الاتصال');
                    })
                    .finally(() => setLoading(false));
            }
        }, [file.id, isImage, isPdf, isWord, file.is_folder]);

        // Direct access - no server proxy needed!

        const handleDownload = () => {
            // Direct download from OneDrive - bypasses server completely!
            if (file.web_url) {
                window.open(file.web_url + '?download=1', '_blank');
            } else {
                alert('رابط التحميل غير متوفر');
            }
        };

        return (
            <div className="docs-preview-pane">
                {/* Header with action buttons - matching local files */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--color-border)',
                    background: 'var(--color-bg-secondary)'
                }}>
                    {/* Action buttons - compact style */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <button
                            onClick={handleDownload}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'var(--color-primary)',
                                background: 'var(--color-primary-bg)',
                                border: '1px solid var(--color-primary)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                        >
                            <Download size={12} /> تنزيل
                        </button>
                        <button
                            onClick={() => file.web_url && window.open(file.web_url, '_blank')}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'var(--color-text-secondary)',
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            <ExternalLink size={12} /> فتح
                        </button>
                        <button
                            onClick={() => {
                                setSelectedCloudFile(file);
                                setShowPermissionsModal(true);
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'var(--color-text-secondary)',
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            <Shield size={12} /> صلاحيات
                        </button>
                        <button
                            onClick={() => {
                                setSelectedCloudFile(file);
                                setShowAssignModal(true);
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'var(--color-text-secondary)',
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            <FolderPlus size={12} /> تعيين
                        </button>
                        <button
                            onClick={() => {
                                if (file.web_url) {
                                    navigator.clipboard.writeText(file.web_url);
                                }
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'var(--color-text-secondary)',
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            <Copy size={12} /> نسخ
                        </button>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={() => setSelectedOneDriveFile(null)}
                        style={{
                            padding: '4px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-text-secondary)',
                            borderRadius: '4px'
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* File info */}
                <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <Cloud size={18} style={{ color: '#0078d4', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                        <div style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--color-heading)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {file.name}
                        </div>
                        <div style={{
                            fontSize: '11px',
                            color: 'var(--color-text-tertiary)',
                            display: 'flex',
                            gap: '8px'
                        }}>
                            {file.size && <span>{(file.size / 1024).toFixed(1)} KB</span>}
                            {file.modified_at && <span>{new Date(file.modified_at).toLocaleDateString('ar-SA')}</span>}
                        </div>
                    </div>
                </div>

                {/* Preview content area - matching local files */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    background: 'var(--color-bg-primary)'
                }}>
                    {/* Loading state */}
                    {loading && (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                            <span style={{ marginTop: '8px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                                جاري تحميل المعاينة...
                            </span>
                        </div>
                    )}

                    {/* Error state */}
                    {error && !loading && (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '24px',
                            textAlign: 'center'
                        }}>
                            {getFileIcon(file.mime_type || '')}
                            <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--color-error)' }}>
                                {error}
                            </div>
                            <button
                                onClick={() => file.web_url && window.open(file.web_url, '_blank')}
                                style={{
                                    marginTop: '16px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    color: 'white',
                                    background: '#0078d4',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                <ExternalLink size={14} /> فتح في OneDrive
                            </button>
                        </div>
                    )}

                    {/* Image preview using direct URL */}
                    {!loading && !error && isImage && directUrl && (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px'
                        }}>
                            <img
                                src={directUrl}
                                alt={file.name}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain',
                                    borderRadius: '6px'
                                }}
                            />
                        </div>
                    )}

                    {/* PDF preview using SecurePdfViewer - no download options */}
                    {!loading && !error && isPdf && directUrl && (
                        <SecurePdfViewer url={directUrl} fileName={file.name} />
                    )}

                    {/* Word preview using SecureWordViewer */}
                    {!loading && !error && isWord && directUrl && (
                        <SecureWordViewer url={directUrl} fileName={file.name} />
                    )}

                    {/* Other files - show icon and open button */}
                    {!loading && !error && !directUrl && !isImage && !isPdf && !isWord && (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '24px',
                            textAlign: 'center'
                        }}>
                            {getFileIcon(file.mime_type || '')}
                            <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                {isWord ? 'ملف Word' : isExcel ? 'ملف Excel' : file.is_folder ? 'مجلد' : 'ملف OneDrive'}
                            </div>
                            <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                                لا يمكن معاينة هذا النوع من الملفات
                            </div>
                            <button
                                onClick={() => file.web_url && window.open(file.web_url, '_blank')}
                                style={{
                                    marginTop: '16px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    color: 'white',
                                    background: '#0078d4',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                <ExternalLink size={14} /> فتح في OneDrive
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="documents-page">
            {/* Header */}
            <div className="docs-header">
                <div className="docs-title-area">
                    <h1>
                        <HardDrive size={20} className="text-law-navy" />
                        الوثائق والملفات
                    </h1>
                    <p>إدارة مركزية لجميع مستندات القضايا والعملاء</p>
                </div>
                <div className="docs-actions">
                    <button
                        className="btn-secondary"
                        onClick={() => setShowCreateMemo(true)}
                    >
                        <FileText size={16} />
                        إنشاء مذكرة
                    </button>
                    <button
                        className="btn-upload"
                        onClick={() => setShowUploadModal(true)}
                    >
                        <Upload size={16} />
                        رفع ملفات
                    </button>
                </div>
            </div>

            <div className="docs-layout">
                {/* Sidebar */}
                <div className="docs-sidebar">
                    <div className="sidebar-section">
                        <div className="sidebar-section-title">المكتبة</div>
                        <div
                            className={`sidebar-item ${activeCategory === 'all' && !selectedCaseId ? 'active' : ''}`}
                            onClick={() => { setActiveCategory('all'); setSelectedCaseId(null); }}
                        >
                            <Grid size={16} /> جميع الملفات
                        </div>
                        <div
                            className={`sidebar-item ${activeCategory === 'recent' ? 'active' : ''}`}
                            onClick={() => { setActiveCategory('recent'); setSelectedCaseId(null); }}
                        >
                            <Clock size={16} /> الأحدث
                        </div>
                        <div className="sidebar-item">
                            <Star size={16} /> المفضلة
                        </div>
                        <div className="sidebar-item">
                            <Trash2 size={16} /> المحذوفات
                        </div>
                    </div>

                    {/* Cloud Storage Section */}
                    <div className="sidebar-section">
                        <div className="sidebar-section-title">التخزين السحابي</div>

                        {/* OneDrive Connection */}
                        {oneDriveStatus?.connected ? (
                            <>
                                <div
                                    className={`sidebar-item ${showOneDriveFiles ? 'active' : ''}`}
                                    onClick={handleShowOneDriveFiles}
                                >
                                    <Cloud size={16} className="text-blue-500" />
                                    <span style={{ flex: 1 }}>OneDrive</span>
                                    <CheckCircle size={12} className="text-green-500" />
                                </div>
                                <div
                                    className="sidebar-item text-xs"
                                    style={{ paddingRight: '32px', color: 'var(--color-text-muted)', fontSize: '11px' }}
                                >
                                    {oneDriveStatus.email}
                                    {/* رسالة للمحامين */}
                                    {!oneDriveStatus.can_disconnect && oneDriveStatus.message && (
                                        <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                                            {oneDriveStatus.message}
                                        </div>
                                    )}
                                </div>
                                {/* إعدادات السحابة - للمدير فقط */}
                                {oneDriveStatus.can_disconnect && (
                                    <div
                                        className="sidebar-item"
                                        onClick={() => setShowCloudSettings(true)}
                                        style={{ color: 'var(--color-primary)' }}
                                    >
                                        <Settings size={16} />
                                        <span>إعدادات السحابة</span>
                                    </div>
                                )}
                                {/* إلغاء الربط - للمدير فقط */}
                                {oneDriveStatus.can_disconnect && (
                                    <div
                                        className="sidebar-item"
                                        onClick={handleDisconnectOneDrive}
                                        style={{ color: 'var(--color-error)' }}
                                    >
                                        <CloudOff size={16} />
                                        <span>إلغاء الربط</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {/* زر الربط - للمدير فقط */}
                                {oneDriveStatus?.can_connect !== false ? (
                                    <div
                                        className="sidebar-item"
                                        onClick={handleConnectOneDrive}
                                        style={{ cursor: oneDriveConnecting ? 'wait' : 'pointer' }}
                                    >
                                        {oneDriveConnecting ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Link2 size={16} className="text-blue-500" />
                                        )}
                                        <span>ربط OneDrive</span>
                                    </div>
                                ) : (
                                    /* رسالة للمحامين - غير متصل */
                                    <div
                                        className="sidebar-item"
                                        style={{
                                            cursor: 'default',
                                            opacity: 0.8,
                                            flexDirection: 'column',
                                            alignItems: 'flex-start',
                                            gap: '4px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <CloudOff size={16} className="text-gray-400" />
                                            <span style={{ color: 'var(--color-text-secondary)' }}>OneDrive غير متصل</span>
                                        </div>
                                        <span style={{
                                            fontSize: '10px',
                                            color: 'var(--color-text-tertiary)',
                                            paddingRight: '24px'
                                        }}>
                                            {oneDriveStatus?.message || 'تواصل مع مدير الشركة'}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Google Drive - Coming Soon */}
                        <div
                            className="sidebar-item"
                            style={{ opacity: 0.5, cursor: 'not-allowed' }}
                            title="قريباً"
                        >
                            <Cloud size={16} className="text-yellow-500" />
                            <span>ربط Google Drive</span>
                            <span style={{ fontSize: '10px', marginRight: 'auto', color: 'var(--color-text-muted)' }}>قريباً</span>
                        </div>
                    </div>

                    <div className="sidebar-section" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <div className="sidebar-section-title">مجلدات القضايا</div>
                        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '300px' }}>
                            {cases.map(c => (
                                <div
                                    key={c.id}
                                    className={`sidebar-item ${selectedCaseId === c.id ? 'active' : ''}`}
                                    onClick={() => { setSelectedCaseId(c.id); setActiveCategory(''); setShowOneDriveFiles(false); }}
                                >
                                    <Folder size={16} className="text-yellow-500" />
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {c.title}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content Area With Split View */}
                <div className={`docs-content-wrapper ${selectedDocument ? 'has-preview' : ''}`}>
                    {/* List/Grid Panel */}
                    <div className="docs-list-panel">
                        {/* Toolbar */}
                        <div className="docs-toolbar">
                            <div className="search-box">
                                <Search size={16} style={{ position: 'absolute', right: 12, top: 12, color: 'var(--color-text-secondary)' }} />
                                <input
                                    className="search-input"
                                    placeholder="بحث عن ملف..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button className="btn-secondary" style={{ padding: '8px' }}>
                                    <Filter size={16} /> تصفية
                                </button>
                                <div className="view-toggles">
                                    <button
                                        className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                        onClick={() => setViewMode('grid')}
                                    >
                                        <Grid size={16} />
                                    </button>
                                    <button
                                        className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                                        onClick={() => setViewMode('list')}
                                    >
                                        <List size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Grid View */}
                        {viewMode === 'grid' && !showOneDriveFiles && (
                            <div className="docs-grid">
                                {filteredDocuments.map(doc => (
                                    <motion.div
                                        key={doc.id}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className={`doc-card ${selectedDocument?.id === doc.id ? 'selected' : ''}`}
                                        onClick={() => handleDocumentClick(doc)}
                                    >
                                        <div className="doc-preview">
                                            {getFileIcon(doc.mimeType || doc.mime_type)}
                                        </div>
                                        <div className="doc-info">
                                            <div className="doc-name" title={doc.title}>{doc.title || doc.fileName}</div>
                                            <div className="doc-meta">
                                                {formatSize(doc.fileSize || doc.file_size)} • {new Date(doc.uploadedAt || doc.uploaded_at).toLocaleDateString('ar-SA')}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* List View */}
                        {viewMode === 'list' && !showOneDriveFiles && (
                            <div className="docs-list">
                                <div className="doc-list-header">
                                    <div className="header-cell">#</div>
                                    <div className="header-cell">الاسم</div>
                                    <div className="header-cell">الحجم</div>
                                    <div className="header-cell">النوع</div>
                                    <div className="header-cell">التاريخ</div>
                                    <div className="header-cell"></div>
                                </div>
                                {filteredDocuments.map(doc => (
                                    <motion.div
                                        key={doc.id}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className={`doc-row ${selectedDocument?.id === doc.id ? 'selected' : ''}`}
                                        onClick={() => handleDocumentClick(doc)}
                                    >
                                        <div className="doc-row-icon">
                                            {getFileIcon(doc.mimeType || doc.mime_type)}
                                        </div>
                                        <div className="doc-row-name">
                                            {doc.title || doc.fileName}
                                        </div>
                                        <div className="doc-row-meta">
                                            {formatSize(doc.fileSize || doc.file_size)}
                                        </div>
                                        <div className="doc-row-meta">
                                            {doc.mimeType?.split('/')[1] || 'Unknown'}
                                        </div>
                                        <div className="doc-row-meta">
                                            {new Date(doc.uploadedAt || doc.uploaded_at).toLocaleDateString('ar-SA')}
                                        </div>
                                        <div className="doc-row-icon">
                                            <button className="view-toggle-btn">
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* OneDrive Files Display */}
                        {showOneDriveFiles && (
                            <div className="onedrive-files-section">
                                {/* OneDrive Header */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    marginBottom: '16px',
                                    padding: '12px',
                                    background: 'var(--color-bg-secondary)',
                                    borderRadius: '8px'
                                }}>
                                    <Cloud size={20} className="text-blue-500" />
                                    <span style={{ fontWeight: 600 }}>ملفات OneDrive</span>
                                    {currentOneDriveFolder !== 'root' && (
                                        <button
                                            onClick={() => loadOneDriveFiles('root')}
                                            style={{
                                                marginRight: 'auto',
                                                padding: '6px 12px',
                                                background: 'var(--color-bg-tertiary)',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <span>← العودة للرئيسية</span>
                                        </button>
                                    )}
                                </div>

                                {/* Loading State */}
                                {oneDriveLoading && (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '48px'
                                    }}>
                                        <Loader2 size={32} className="animate-spin text-blue-500" />
                                        <span style={{ marginTop: '12px', color: 'var(--color-text-secondary)' }}>
                                            جاري تحميل الملفات...
                                        </span>
                                    </div>
                                )}

                                {/* OneDrive Files Grid/List */}
                                {!oneDriveLoading && oneDriveFiles.length > 0 && viewMode === 'grid' && (
                                    <div className="docs-grid">
                                        {oneDriveFiles.map(file => (
                                            <motion.div
                                                key={file.id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="doc-card"
                                                style={{ cursor: file.is_folder ? 'pointer' : 'default' }}
                                                onClick={() => {
                                                    if (file.is_folder) {
                                                        loadOneDriveFiles(file.id);
                                                        setSelectedOneDriveFile(null);
                                                    } else {
                                                        setSelectedOneDriveFile(file);
                                                        setSelectedDocument(null);
                                                    }
                                                }}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    setContextMenu({
                                                        isOpen: true,
                                                        position: { x: e.clientX, y: e.clientY },
                                                        file: file
                                                    });
                                                }}
                                            >
                                                <div className="doc-preview">
                                                    {file.is_folder ? (
                                                        <Folder size={32} className="text-blue-400" />
                                                    ) : (
                                                        getFileIcon(file.mime_type || '')
                                                    )}
                                                </div>
                                                <div className="doc-info">
                                                    <div className="doc-name" title={file.name}>
                                                        {file.name}
                                                    </div>
                                                    <div className="doc-meta">
                                                        {file.is_folder ? 'مجلد' : formatSize(file.size)}
                                                        {file.modified_at && ` • ${new Date(file.modified_at).toLocaleDateString('ar-SA')}`}
                                                    </div>
                                                </div>
                                                {!file.is_folder && file.web_url && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '8px',
                                                        left: '8px',
                                                        background: 'var(--color-bg-secondary)',
                                                        borderRadius: '4px',
                                                        padding: '4px'
                                                    }}>
                                                        <Cloud size={12} className="text-blue-500" />
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {/* OneDrive Files List View */}
                                {!oneDriveLoading && oneDriveFiles.length > 0 && viewMode === 'list' && (
                                    <div className="docs-list">
                                        {oneDriveFiles.map(file => (
                                            <motion.div
                                                key={file.id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className={`doc-list-item ${selectedOneDriveFile?.id === file.id ? 'selected' : ''}`}
                                                onClick={() => {
                                                    if (file.is_folder) {
                                                        loadOneDriveFiles(file.id);
                                                        setSelectedOneDriveFile(null);
                                                    } else {
                                                        setSelectedOneDriveFile(file);
                                                        setSelectedDocument(null);
                                                    }
                                                }}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    setContextMenu({
                                                        isOpen: true,
                                                        position: { x: e.clientX, y: e.clientY },
                                                        file: file
                                                    });
                                                }}
                                            >
                                                <div className="doc-list-icon">
                                                    {file.is_folder ? (
                                                        <Folder size={18} style={{ color: '#f59e0b' }} />
                                                    ) : (
                                                        getFileIcon(file.mime_type || '')
                                                    )}
                                                </div>
                                                <div className="doc-list-name">{file.name}</div>
                                                <div className="doc-list-meta">
                                                    {file.is_folder ? 'مجلد' : formatSize(file.size)}
                                                </div>
                                                <div className="doc-list-date">
                                                    {file.modified_at && new Date(file.modified_at).toLocaleDateString('ar-SA')}
                                                </div>
                                                <div className="doc-list-cloud">
                                                    <Cloud size={14} style={{ color: '#0078d4' }} />
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {/* Empty OneDrive State */}
                                {!oneDriveLoading && oneDriveFiles.length === 0 && (
                                    <div className="empty-state">
                                        <div className="empty-icon">
                                            <Cloud size={32} className="text-blue-300" />
                                        </div>
                                        <h3>لا توجد ملفات</h3>
                                        <p>هذا المجلد فارغ في OneDrive</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {!loading && !showOneDriveFiles && filteredDocuments.length === 0 && (
                            <div className="empty-state">
                                <div className="empty-icon">
                                    <Folder size={32} />
                                </div>
                                <h3>لا توجد ملفات</h3>
                                <p>لم يتم العثور على ملفات في هذا المجلد أو البحث</p>
                            </div>
                        )}
                    </div>

                    {/* Preview Only Rendered When Selected */}
                    {selectedDocument && <PreviewPane doc={selectedDocument} />}
                    {selectedOneDriveFile && <OneDrivePreviewPane file={selectedOneDriveFile} />}
                </div>
            </div>

            {/* Right-Click Context Menu */}
            <ContextMenu
                isOpen={contextMenu.isOpen}
                position={contextMenu.position}
                onClose={() => setContextMenu({ ...contextMenu, isOpen: false })}
                items={contextMenu.file ? createOneDriveContextMenu({
                    file: contextMenu.file,
                    onDownload: () => {
                        if (contextMenu.file?.web_url) {
                            window.open(contextMenu.file.web_url + '?download=1', '_blank');
                        }
                    },
                    onOpenInOneDrive: () => {
                        if (contextMenu.file?.web_url) {
                            window.open(contextMenu.file.web_url, '_blank');
                        }
                    },
                    onPermissions: () => {
                        setSelectedCloudFile(contextMenu.file);
                        setShowPermissionsModal(true);
                    },
                    onAssignToCase: () => {
                        setSelectedCloudFile(contextMenu.file);
                        setShowAssignModal(true);
                    },
                    onCopyLink: () => {
                        if (contextMenu.file?.web_url) {
                            navigator.clipboard.writeText(contextMenu.file.web_url);
                        }
                    }
                }) : []}
            />

            {/* Modals */}

            {showUploadModal && (
                <DocumentUploadModal
                    isOpen={showUploadModal}
                    onClose={() => setShowUploadModal(false)}
                    onUploadSuccess={loadData}
                    cases={cases}
                />

            )}


            {showCreateMemo && (
                <LegalMemoModal
                    isOpen={showCreateMemo}
                    onClose={() => setShowCreateMemo(false)}
                />
            )}

            {/* Document Permissions Modal */}
            {showPermissionsModal && (selectedDocForPermissions || selectedCloudFile) && (
                <DocumentPermissionsModal
                    isOpen={showPermissionsModal}
                    onClose={() => {
                        setShowPermissionsModal(false);
                        setSelectedDocForPermissions(null);
                        setSelectedCloudFile(null);
                    }}
                    documentId={selectedDocForPermissions ? Number(selectedDocForPermissions.id) : 0}
                    documentName={selectedDocForPermissions
                        ? (selectedDocForPermissions.title || selectedDocForPermissions.fileName || 'ملف')
                        : (selectedCloudFile?.name || 'ملف سحابي')}
                    isCloudDocument={!!selectedCloudFile}
                    cloudFileId={selectedCloudFile?.id}
                />
            )}

            {/* Assign File to Case Modal */}
            {showAssignModal && (selectedDocForPermissions || selectedCloudFile) && (
                <AssignFileToCaseModal
                    isOpen={showAssignModal}
                    onClose={() => {
                        setShowAssignModal(false);
                        setSelectedDocForPermissions(null);
                        setSelectedCloudFile(null);
                    }}
                    documentId={selectedDocForPermissions ? Number(selectedDocForPermissions.id) : 0}
                    documentName={selectedDocForPermissions
                        ? (selectedDocForPermissions.title || selectedDocForPermissions.fileName || 'ملف')
                        : (selectedCloudFile?.name || 'ملف سحابي')}
                    cases={cases}
                    currentCaseId={selectedDocForPermissions?.case_id || selectedDocForPermissions?.relatedCaseId}
                    onAssigned={loadData}
                    isCloudFile={!!selectedCloudFile}
                    cloudFileId={selectedCloudFile?.id}
                />
            )}

            {/* Cloud Storage Settings Modal */}
            {showCloudSettings && (
                <CloudStorageSettingsModal
                    isOpen={showCloudSettings}
                    onClose={() => setShowCloudSettings(false)}
                    oneDriveStatus={oneDriveStatus}
                    onRefreshStatus={checkOneDriveStatus}
                />
            )}
        </div>
    );
};

export default Documents;
