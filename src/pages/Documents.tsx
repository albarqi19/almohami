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
    ExternalLink
} from 'lucide-react';
import type { Document as DocumentType, Case } from '../types';
import DocumentUploadModal from '../components/DocumentUploadModal';
import LegalMemoModal from '../components/LegalMemoModal';
import { DocumentService } from '../services/documentService';
import { CaseService } from '../services/caseService';
import { CloudStorageService } from '../services/cloudStorageService';
import type { CloudStorageStatus, CloudStorageFile } from '../services/cloudStorageService';
import '../styles/documents-page.css';

const CACHE_KEY = 'documents_data';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

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
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

    // Selection & Split View
    const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);

    // Modals
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showCreateMemo, setShowCreateMemo] = useState(false);

    // OneDrive States
    const [oneDriveStatus, setOneDriveStatus] = useState<CloudStorageStatus | null>(null);
    const [oneDriveFiles, setOneDriveFiles] = useState<CloudStorageFile[]>([]);
    const [oneDriveLoading, setOneDriveLoading] = useState(false);
    const [oneDriveConnecting, setOneDriveConnecting] = useState(false);
    const [showOneDriveFiles, setShowOneDriveFiles] = useState(false);
    const [currentOneDriveFolder, setCurrentOneDriveFolder] = useState<string>('root');
    const [selectedOneDriveFile, setSelectedOneDriveFile] = useState<CloudStorageFile | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();

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

    // Preview Pane Content
    const PreviewPane = ({ doc }: { doc: DocumentType }) => {
        const [blobUrl, setBlobUrl] = useState<string | null>(null);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState<string | null>(null);

        useEffect(() => {
            const fetchPreview = async () => {
                setLoading(true);
                setError(null);
                // Clean up previous blob
                if (blobUrl) URL.revokeObjectURL(blobUrl);
                setBlobUrl(null);

                try {
                    const token = localStorage.getItem('authToken');
                    const response = await fetch(`http://127.0.0.1:8000/api/v1/documents/${doc.id}/preview`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (!response.ok) throw new Error('Failed to load preview');

                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    setBlobUrl(url);
                } catch (err) {
                    console.error(err);
                    setError('فشل تحميل المعاينة');
                } finally {
                    setLoading(false);
                }
            };

            fetchPreview();

            return () => {
                if (blobUrl) URL.revokeObjectURL(blobUrl);
            };
        }, [doc.id]);

        const isImage = doc.mimeType?.includes('image') || doc.mime_type?.includes('image');
        const isPdf = doc.mimeType?.includes('pdf') || doc.mime_type?.includes('pdf');

        return (
            <div className="docs-preview-pane">
                <div className="preview-header">
                    <div>
                        <div className="preview-title">{doc.title || doc.fileName}</div>
                        <div className="preview-meta">تم التعديل {new Date(doc.uploadedAt || doc.uploaded_at).toLocaleDateString('ar-SA')}</div>
                    </div>
                    <button className="preview-close-btn" onClick={closePreview}>
                        <X size={18} />
                    </button>
                </div>

                <div className="preview-body">
                    <div className="preview-content-area">
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                                <span style={{ fontSize: 12 }}>جاري التحميل...</span>
                            </div>
                        ) : error ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-error)', fontSize: 13 }}>{error}</div>
                        ) : isImage && blobUrl ? (
                            <img src={blobUrl} alt="Preview" />
                        ) : isPdf && blobUrl ? (
                            <iframe src={blobUrl} title="PDF Preview" />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                                {getFileIcon(doc.mimeType || doc.mime_type)}
                                <span>لا توجد معاينة متاحة لهذا النوع</span>
                            </div>
                        )}
                    </div>



                    {doc.tags && doc.tags.length > 0 && (
                        <div className="preview-details-row">
                            <div className="preview-label">الوسوم</div>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {doc.tags.map(t => (
                                    <span key={t} style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{t}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="preview-actions">
                    <button className="preview-action-btn primary" onClick={() => console.log('Download')}>
                        <Download size={16} /> تنزيل
                    </button>
                    <button className="preview-action-btn">
                        <Share2 size={16} /> مشاركة
                    </button>
                    <button className="preview-action-btn">
                        <Copy size={16} /> نسخ
                    </button>
                    <button className="preview-action-btn" style={{ color: 'var(--color-error)' }}>
                        <Trash2 size={16} /> حذف
                    </button>
                </div>
            </div>
        );
    };

    // OneDrive Preview Pane Content
    const OneDrivePreviewPane = ({ file }: { file: CloudStorageFile }) => {
        const [previewUrl, setPreviewUrl] = useState<string | null>(null);
        const [previewLoading, setPreviewLoading] = useState(false);
        const [previewError, setPreviewError] = useState<string | null>(null);

        const isImage = file.mime_type?.includes('image');
        const isPdf = file.mime_type?.includes('pdf');
        const isWord = file.mime_type?.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc');
        const isExcel = file.mime_type?.includes('excel') || file.mime_type?.includes('spreadsheet') || file.name.endsWith('.xlsx');
        const canPreview = isImage || isPdf;

        useEffect(() => {
            if (canPreview && file.id) {
                fetchPreview();
            }
            return () => {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
            };
        }, [file.id]);

        const fetchPreview = async () => {
            setPreviewLoading(true);
            setPreviewError(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);

            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'}/cloud-storage/onedrive/preview/${file.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error('Failed to load preview');

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);
            } catch (err) {
                console.error(err);
                setPreviewError('فشل تحميل المعاينة');
            } finally {
                setPreviewLoading(false);
            }
        };

        const [downloadLoading, setDownloadLoading] = useState(false);

        const handleDownload = async () => {
            setDownloadLoading(true);
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'}/cloud-storage/onedrive/download/${file.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error('Download failed');

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (err) {
                console.error('Download failed:', err);
                alert('فشل التنزيل');
            } finally {
                setDownloadLoading(false);
            }
        };

        return (
            <div className="docs-preview-pane">
                <div className="preview-header">
                    <div>
                        <div className="preview-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Cloud size={16} className="text-blue-500" />
                            {file.name}
                        </div>
                        <div className="preview-meta">
                            {file.modified_at && `تم التعديل ${new Date(file.modified_at).toLocaleDateString('ar-SA')}`}
                        </div>
                    </div>
                    <button className="preview-close-btn" onClick={() => setSelectedOneDriveFile(null)}>
                        <X size={18} />
                    </button>
                </div>

                <div className="preview-body">
                    <div className="preview-content-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '350px' }}>
                        {previewLoading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Loader2 size={32} className="animate-spin text-blue-500" />
                                <span style={{ marginTop: '12px', color: 'var(--color-text-secondary)' }}>جاري التحميل...</span>
                            </div>
                        ) : previewError ? (
                            <div style={{ color: 'var(--color-error)', fontSize: '13px' }}>{previewError}</div>
                        ) : isImage && previewUrl ? (
                            <img src={previewUrl} alt={file.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : isPdf && previewUrl ? (
                            <iframe src={previewUrl} title={file.name} style={{ width: '100%', height: '100%', border: 'none', flex: 1 }} />
                        ) : (
                            <>
                                {getFileIcon(file.mime_type || '')}
                                <span style={{ marginTop: '12px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                                    {isPdf ? 'ملف PDF' : isWord ? 'ملف Word' : isExcel ? 'ملف Excel' : 'ملف OneDrive'}
                                </span>
                                {!canPreview && (
                                    <span style={{ marginTop: '8px', color: 'var(--color-text-tertiary)', fontSize: '11px' }}>
                                        لا يمكن معاينة هذا النوع من الملفات
                                    </span>
                                )}
                            </>
                        )}
                    </div>

                    <div className="preview-actions" style={{ marginTop: 'auto', paddingTop: '16px' }}>
                        <button
                            className="preview-action-btn primary"
                            onClick={handleDownload}
                            disabled={downloadLoading}
                            style={{ gridColumn: 'span 2', opacity: downloadLoading ? 0.7 : 1 }}
                        >
                            {downloadLoading ? (
                                <><Loader2 size={16} className="animate-spin" /> جاري التنزيل...</>
                            ) : (
                                <><Download size={16} /> تنزيل مباشر</>
                            )}
                        </button>
                        <button
                            className="preview-action-btn"
                            onClick={() => file.web_url && window.open(file.web_url, '_blank')}
                            style={{ gridColumn: 'span 2' }}
                        >
                            <ExternalLink size={16} /> فتح في OneDrive
                        </button>
                    </div>
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
                                </div>
                                <div
                                    className="sidebar-item"
                                    onClick={handleDisconnectOneDrive}
                                    style={{ color: 'var(--color-error)' }}
                                >
                                    <CloudOff size={16} />
                                    <span>إلغاء الربط</span>
                                </div>
                            </>
                        ) : (
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

                                {/* OneDrive Files Grid */}
                                {!oneDriveLoading && oneDriveFiles.length > 0 && (
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
                                                        setSelectedDocument(null); // Clear local file selection
                                                    }
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
        </div>
    );
};

export default Documents;
