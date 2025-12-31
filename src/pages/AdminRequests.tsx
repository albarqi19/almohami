import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Plus,
    Search,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    X,
    RefreshCw,
    User,
    ClipboardList,
    LayoutGrid,
    List,
    Send,
    Eye,
    Settings,
    Trash2,
    Edit3,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AdminRequestService, RequestTypeService } from '../services/adminRequestService';
import type { AdminRequest, RequestType, CreateAdminRequestForm } from '../services/adminRequestService';
import '../styles/admin-requests.css';

// Status config
const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
    'pending': { label: 'قيد الانتظار', class: 'request-status-badge--pending' },
    'approved': { label: 'مقبول', class: 'request-status-badge--approved' },
    'rejected': { label: 'مرفوض', class: 'request-status-badge--rejected' }
};

const formatDate = (value?: string | null): string => {
    if (!value) return '-';
    try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return value; }
};

// Request Modal Component
const RequestModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateAdminRequestForm) => Promise<void>;
    requestTypes: RequestType[];
}> = ({ isOpen, onClose, onSubmit, requestTypes }) => {
    const [selectedType, setSelectedType] = useState<RequestType | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const resetForm = () => {
        setSelectedType(null);
        setStartDate('');
        setEndDate('');
        setReason('');
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedType) { setError('يرجى اختيار نوع الطلب'); return; }
        if (selectedType.requires_dates && (!startDate || !endDate)) { setError('يرجى تحديد تاريخ البداية والنهاية'); return; }
        if (selectedType.requires_reason && !reason.trim()) { setError('يرجى ذكر السبب'); return; }

        setLoading(true);
        setError('');
        try {
            await onSubmit({
                request_type_id: selectedType.id,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                reason: reason.trim() || undefined,
            });
            resetForm();
            onClose();
        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء إرسال الطلب');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><ClipboardList size={20} /> طلب جديد</h2>
                    <button className="modal-close" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    {error && <div className="modal-error"><AlertCircle size={14} />{error}</div>}
                    <div className="modal-form-group">
                        <label>نوع الطلب *</label>
                        <select value={selectedType?.id || ''} onChange={e => setSelectedType(requestTypes.find(t => t.id === Number(e.target.value)) || null)} required>
                            <option value="">اختر نوع الطلب</option>
                            {requestTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                        </select>
                    </div>
                    {selectedType?.requires_dates && (
                        <div className="modal-form-row">
                            <div className="modal-form-group">
                                <label>تاريخ البداية *</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                            </div>
                            <div className="modal-form-group">
                                <label>تاريخ النهاية *</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} required />
                            </div>
                        </div>
                    )}
                    {(selectedType?.requires_reason || !selectedType?.requires_dates) && (
                        <div className="modal-form-group">
                            <label>{selectedType?.requires_reason ? 'السبب *' : 'السبب (اختياري)'}</label>
                            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="اكتب سبب الطلب..." required={selectedType?.requires_reason} />
                        </div>
                    )}
                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>إلغاء</button>
                        <button type="submit" className="btn-primary" disabled={loading || !selectedType}>
                            {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Review Modal (for managers)
const ReviewModal: React.FC<{
    request: AdminRequest | null;
    onClose: () => void;
    onApprove: (id: number, notes?: string) => Promise<void>;
    onReject: (id: number, notes: string) => Promise<void>;
}> = ({ request, onClose, onApprove, onReject }) => {
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [action, setAction] = useState<'approve' | 'reject' | null>(null);
    const [error, setError] = useState('');

    const handleAction = async (type: 'approve' | 'reject') => {
        if (type === 'reject' && !notes.trim()) { setError('يجب ذكر سبب الرفض'); return; }
        setLoading(true); setAction(type); setError('');
        try {
            if (type === 'approve') await onApprove(request!.id, notes.trim() || undefined);
            else await onReject(request!.id, notes.trim());
            onClose();
        } catch (err: any) { setError(err.message || 'حدث خطأ'); }
        finally { setLoading(false); setAction(null); }
    };

    if (!request) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-content--lg" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><Eye size={20} /> مراجعة الطلب</h2>
                    <button className="modal-close" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="modal-body">
                    {error && <div className="modal-error"><AlertCircle size={14} />{error}</div>}
                    <div className="modal-info-grid">
                        <div className="modal-info-card">
                            <User size={16} className="modal-info-card__icon" />
                            <div>
                                <div className="modal-info-card__label">مقدم الطلب</div>
                                <div className="modal-info-card__value">{request.user?.name}</div>
                            </div>
                        </div>
                        <div className="modal-info-card">
                            <ClipboardList size={16} className="modal-info-card__icon" />
                            <div>
                                <div className="modal-info-card__label">نوع الطلب</div>
                                <div className="modal-info-card__value">{request.request_type?.name}</div>
                            </div>
                        </div>
                        {request.start_date && (
                            <div className="modal-info-card">
                                <Calendar size={16} className="modal-info-card__icon" />
                                <div>
                                    <div className="modal-info-card__label">الفترة</div>
                                    <div className="modal-info-card__value">
                                        {formatDate(request.start_date)}
                                        {request.end_date && request.end_date !== request.start_date && <> إلى {formatDate(request.end_date)}</>}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="modal-info-card">
                            <Clock size={16} className="modal-info-card__icon" />
                            <div>
                                <div className="modal-info-card__label">تاريخ الإرسال</div>
                                <div className="modal-info-card__value">{formatDate(request.created_at)}</div>
                            </div>
                        </div>
                    </div>
                    {request.reason && (
                        <div className="modal-reason-box">
                            <strong>السبب:</strong> {request.reason}
                        </div>
                    )}
                    <div className="modal-form-group" style={{ marginTop: '16px' }}>
                        <label>ملاحظات {action === 'reject' ? '*' : '(اختياري)'}</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="أضف ملاحظاتك هنا..." />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-reject" onClick={() => handleAction('reject')} disabled={loading}>
                            <XCircle size={16} /> {loading && action === 'reject' ? 'جاري...' : 'رفض'}
                        </button>
                        <button type="button" className="btn-approve" onClick={() => handleAction('approve')} disabled={loading}>
                            <CheckCircle size={16} /> {loading && action === 'approve' ? 'جاري...' : 'قبول'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Settings Modal (for managers to manage request types)
const SettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    requestTypes: RequestType[];
    onRefresh: () => void;
}> = ({ isOpen, onClose, requestTypes, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [editingType, setEditingType] = useState<RequestType | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        name_en: '',
        description: '',
        requires_dates: false,
        requires_reason: true
    });

    const resetForm = () => {
        setFormData({ name: '', name_en: '', description: '', requires_dates: false, requires_reason: true });
        setEditingType(null);
        setShowAddForm(false);
        setError('');
    };

    const handleEdit = (type: RequestType) => {
        setEditingType(type);
        setFormData({
            name: type.name,
            name_en: type.name_en || '',
            description: type.description || '',
            requires_dates: type.requires_dates,
            requires_reason: type.requires_reason
        });
        setShowAddForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) { setError('اسم النوع مطلوب'); return; }
        
        setLoading(true); setError('');
        try {
            if (editingType) {
                await RequestTypeService.updateType(editingType.id, formData);
            } else {
                await RequestTypeService.createType(formData);
            }
            resetForm();
            onRefresh();
        } catch (err: any) {
            setError(err.message || 'حدث خطأ');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (type: RequestType) => {
        try {
            await RequestTypeService.toggleStatus(type.id);
            onRefresh();
        } catch (err: any) {
            alert(err.message || 'فشل في تحديث الحالة');
        }
    };

    const handleDelete = async (type: RequestType) => {
        if (!window.confirm(`هل أنت متأكد من حذف "${type.name}"؟`)) return;
        try {
            await RequestTypeService.deleteType(type.id);
            onRefresh();
        } catch (err: any) {
            alert(err.message || 'فشل في حذف النوع');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-content--lg" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><Settings size={20} /> إعدادات أنواع الطلبات</h2>
                    <button className="modal-close" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="modal-body">
                    {error && <div className="modal-error"><AlertCircle size={14} />{error}</div>}
                    
                    {/* Add/Edit Form */}
                    {showAddForm ? (
                        <form onSubmit={handleSubmit} className="settings-type-form">
                            <h3 className="settings-form-title">{editingType ? 'تعديل نوع الطلب' : 'إضافة نوع جديد'}</h3>
                            <div className="modal-form-row">
                                <div className="modal-form-group">
                                    <label>الاسم بالعربي *</label>
                                    <input 
                                        type="text" 
                                        value={formData.name} 
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        placeholder="مثال: إجازة طارئة"
                                        required 
                                    />
                                </div>
                                <div className="modal-form-group">
                                    <label>الاسم بالإنجليزي</label>
                                    <input 
                                        type="text" 
                                        value={formData.name_en} 
                                        onChange={e => setFormData({...formData, name_en: e.target.value})}
                                        placeholder="Example: Emergency Leave"
                                    />
                                </div>
                            </div>
                            <div className="modal-form-group">
                                <label>الوصف</label>
                                <textarea 
                                    value={formData.description} 
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    rows={2}
                                    placeholder="وصف مختصر لنوع الطلب..."
                                />
                            </div>
                            <div className="settings-checkboxes">
                                <label className="settings-checkbox">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.requires_dates} 
                                        onChange={e => setFormData({...formData, requires_dates: e.target.checked})}
                                    />
                                    <span>يتطلب تحديد تاريخ (بداية ونهاية)</span>
                                </label>
                                <label className="settings-checkbox">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.requires_reason} 
                                        onChange={e => setFormData({...formData, requires_reason: e.target.checked})}
                                    />
                                    <span>يتطلب ذكر السبب</span>
                                </label>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={resetForm} disabled={loading}>إلغاء</button>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'جاري الحفظ...' : (editingType ? 'تحديث' : 'إضافة')}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <div className="settings-add-btn-container">
                                <button className="btn-primary" onClick={() => setShowAddForm(true)}>
                                    <Plus size={16} /> إضافة نوع جديد
                                </button>
                            </div>
                            
                            {/* Types List */}
                            <div className="settings-types-list">
                                {requestTypes.length === 0 ? (
                                    <div className="settings-empty">لا توجد أنواع طلبات. أضف نوعاً جديداً للبدء.</div>
                                ) : (
                                    requestTypes.map(type => (
                                        <div key={type.id} className={`settings-type-item ${!type.is_active ? 'settings-type-item--inactive' : ''}`}>
                                            <div className="settings-type-info">
                                                <div className="settings-type-name">{type.name}</div>
                                                {type.description && <div className="settings-type-desc">{type.description}</div>}
                                                <div className="settings-type-badges">
                                                    {type.requires_dates && <span className="settings-badge">تاريخ</span>}
                                                    {type.requires_reason && <span className="settings-badge">سبب</span>}
                                                    {!type.is_active && <span className="settings-badge settings-badge--inactive">معطل</span>}
                                                </div>
                                            </div>
                                            <div className="settings-type-actions">
                                                <button 
                                                    className="settings-action-btn" 
                                                    onClick={() => handleToggle(type)}
                                                    title={type.is_active ? 'تعطيل' : 'تفعيل'}
                                                >
                                                    {type.is_active ? <ToggleRight size={18} className="text-green" /> : <ToggleLeft size={18} />}
                                                </button>
                                                <button className="settings-action-btn" onClick={() => handleEdit(type)} title="تعديل">
                                                    <Edit3 size={16} />
                                                </button>
                                                <button className="settings-action-btn settings-action-btn--danger" onClick={() => handleDelete(type)} title="حذف">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// Main Page
const AdminRequests: React.FC = () => {
    const { user } = useAuth();
    const isManager = user?.role === 'admin' || (user?.role as string) === 'owner';

    const [requests, setRequests] = useState<AdminRequest[]>([]);
    const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [reviewRequest, setReviewRequest] = useState<AdminRequest | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });

    const loadData = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [requestsRes, typesRes, statsRes] = await Promise.all([
                AdminRequestService.getRequests({ status: statusFilter || undefined }),
                RequestTypeService.getTypes(),
                AdminRequestService.getStatistics()
            ]);
            setRequests(requestsRes.data || []);
            setRequestTypes(typesRes);
            setStats(statsRes);
        } catch (err: any) {
            setError(err.message || 'فشل في تحميل البيانات');
        } finally { setLoading(false); }
    }, [statusFilter]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleCreateRequest = async (data: CreateAdminRequestForm) => {
        await AdminRequestService.createRequest(data);
        loadData();
    };

    const handleApprove = async (id: number, notes?: string) => {
        await AdminRequestService.approveRequest(id, notes);
        loadData();
    };

    const handleReject = async (id: number, notes: string) => {
        await AdminRequestService.rejectRequest(id, notes);
        loadData();
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
        try { await AdminRequestService.deleteRequest(id); loadData(); }
        catch (err: any) { alert(err.message || 'فشل في حذف الطلب'); }
    };

    const filteredRequests = useMemo(() => {
        if (!searchTerm) return requests;
        const term = searchTerm.toLowerCase();
        return requests.filter(r =>
            r.user?.name?.toLowerCase().includes(term) ||
            r.request_type?.name?.toLowerCase().includes(term) ||
            r.reason?.toLowerCase().includes(term)
        );
    }, [requests, searchTerm]);

    // Table View
    const renderTable = () => (
        <div className="requests-table-wrapper">
            <table className="requests-table">
                <thead>
                    <tr>
                        {isManager && <th>مقدم الطلب</th>}
                        <th>نوع الطلب</th>
                        <th>الفترة</th>
                        <th>تاريخ الإرسال</th>
                        <th>الحالة</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {filteredRequests.map(req => {
                        const statusConfig = STATUS_CONFIG[req.status] || STATUS_CONFIG['pending'];
                        return (
                            <tr key={req.id}>
                                {isManager && (
                                    <td>
                                        <div className="request-user">
                                            <div className="request-user__avatar">{req.user?.name?.charAt(0) || '?'}</div>
                                            <span>{req.user?.name}</span>
                                        </div>
                                    </td>
                                )}
                                <td><span className="request-type-tag">{req.request_type?.name}</span></td>
                                <td className="request-date-cell">
                                    {req.start_date ? (
                                        <>{formatDate(req.start_date)}{req.end_date && req.end_date !== req.start_date && <> - {formatDate(req.end_date)}</>}</>
                                    ) : '-'}
                                </td>
                                <td className="request-date-cell">{formatDate(req.created_at)}</td>
                                <td>
                                    <span className={`request-status-badge ${statusConfig.class}`}>
                                        <span className="request-status-badge__dot" />
                                        {statusConfig.label}
                                    </span>
                                </td>
                                <td>
                                    <div className="request-actions-cell">
                                        {isManager && req.status === 'pending' && (
                                            <button className="request-action-btn" onClick={() => setReviewRequest(req)} title="مراجعة">
                                                <Eye size={16} />
                                            </button>
                                        )}
                                        {!isManager && req.status === 'pending' && (
                                            <button className="request-action-btn request-action-btn--danger" onClick={() => handleDelete(req.id)} title="حذف">
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    // Grid View
    const renderGrid = () => (
        <div className="requests-grid">
            {filteredRequests.map(req => {
                const statusConfig = STATUS_CONFIG[req.status] || STATUS_CONFIG['pending'];
                return (
                    <div key={req.id} className="request-card" onClick={() => isManager && req.status === 'pending' && setReviewRequest(req)}>
                        <div className="request-card__header">
                            <span className="request-type-tag">{req.request_type?.name}</span>
                            <span className={`request-status-badge ${statusConfig.class}`}>
                                <span className="request-status-badge__dot" />
                                {statusConfig.label}
                            </span>
                        </div>
                        {isManager && (
                            <div className="request-card__user">
                                <div className="request-user__avatar">{req.user?.name?.charAt(0) || '?'}</div>
                                <span>{req.user?.name}</span>
                            </div>
                        )}
                        {req.reason && <p className="request-card__reason">{req.reason}</p>}
                        <div className="request-card__footer">
                            <span className="request-card__date"><Calendar size={12} /> {formatDate(req.start_date) || formatDate(req.created_at)}</span>
                            {req.end_date && req.end_date !== req.start_date && (
                                <span className="request-card__date"><Clock size={12} /> {formatDate(req.end_date)}</span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="requests-page">
            {/* Header Bar */}
            <header className="requests-header-bar">
                <div className="requests-header-bar__start">
                    <div className="requests-header-bar__title">
                        <ClipboardList size={20} />
                        <span>الطلبات الإدارية</span>
                        <span className="requests-header-bar__count">{stats.total}</span>
                    </div>
                    <div className="requests-header-bar__stats">
                        <span className="request-stat-pill request-stat-pill--pending">
                            <span className="request-stat-pill__dot" />{stats.pending} قيد الانتظار
                        </span>
                        <span className="request-stat-pill request-stat-pill--approved">
                            <span className="request-stat-pill__dot" />{stats.approved} مقبول
                        </span>
                        <span className="request-stat-pill request-stat-pill--rejected">
                            <span className="request-stat-pill__dot" />{stats.rejected} مرفوض
                        </span>
                    </div>
                </div>

                <div className="requests-header-bar__center">
                    <div className="requests-search-box">
                        <Search size={16} />
                        <input type="text" placeholder="بحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="requests-search-box__clear"><X size={14} /></button>
                        )}
                    </div>
                    <select className="requests-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="">كل الحالات</option>
                        <option value="pending">قيد الانتظار</option>
                        <option value="approved">مقبول</option>
                        <option value="rejected">مرفوض</option>
                    </select>
                    <button className="requests-icon-btn" onClick={loadData} title="تحديث">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="requests-header-bar__end">
                    <div className="requests-view-tabs">
                        <button className={`requests-view-tab ${viewMode === 'table' ? 'requests-view-tab--active' : ''}`} onClick={() => setViewMode('table')}>
                            <List size={16} />
                        </button>
                        <button className={`requests-view-tab ${viewMode === 'grid' ? 'requests-view-tab--active' : ''}`} onClick={() => setViewMode('grid')}>
                            <LayoutGrid size={16} />
                        </button>
                    </div>
                    {isManager && (
                        <button className="requests-icon-btn requests-settings-btn" onClick={() => setIsSettingsOpen(true)} title="إعدادات أنواع الطلبات">
                            <Settings size={16} />
                        </button>
                    )}
                    <button className="btn-primary" onClick={() => setIsNewModalOpen(true)}>
                        <Plus size={16} /> طلب جديد
                    </button>
                </div>
            </header>

            {/* Content */}
            {loading ? (
                <div className="requests-loading">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="requests-skeleton-row" />)}
                </div>
            ) : error ? (
                <div className="requests-empty">
                    <AlertCircle size={48} className="requests-empty__icon" />
                    <div className="requests-empty__title">حدث خطأ</div>
                    <div className="requests-empty__desc">{error}</div>
                    <button className="btn-primary" onClick={loadData}>إعادة المحاولة</button>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="requests-empty">
                    <ClipboardList size={48} className="requests-empty__icon" />
                    <div className="requests-empty__title">لا توجد طلبات</div>
                    <div className="requests-empty__desc">{isManager ? 'لا توجد طلبات للمراجعة حالياً' : 'لم تقم بتقديم أي طلبات بعد'}</div>
                    <button className="btn-primary" onClick={() => setIsNewModalOpen(true)}><Plus size={16} /> تقديم طلب جديد</button>
                </div>
            ) : (
                <>{viewMode === 'table' && renderTable()}{viewMode === 'grid' && renderGrid()}</>
            )}

            <RequestModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} onSubmit={handleCreateRequest} requestTypes={requestTypes} />
            <ReviewModal request={reviewRequest} onClose={() => setReviewRequest(null)} onApprove={handleApprove} onReject={handleReject} />
            {isManager && <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} requestTypes={requestTypes} onRefresh={loadData} />}
        </div>
    );
};

export default AdminRequests;
