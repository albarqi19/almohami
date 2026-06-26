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
    Users,
    Palmtree,
    BarChart3,
    Filter,
    Inbox,
    ClipboardList,
    Eye,
    Settings,
    Trash2,
    Edit3,
    ToggleLeft,
    ToggleRight,
    FileText,
    MessageSquare,
    ChevronRight
} from 'lucide-react';
import { usePermissionContext } from '../contexts/PermissionContext';
import { AdminRequestService, RequestTypeService } from '../services/adminRequestService';
import type { AdminRequest, RequestType, CreateAdminRequestForm, AdminRequestContext, AdminRequestStatistics, AdminRequestSidebar } from '../services/adminRequestService';
import { Briefcase, History, AlertTriangle, Loader2, ChevronDown, ChevronLeft } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

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

const formatDateTime = (value?: string | null): string => {
    if (!value) return '-';
    try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return value; }
};

const calculateDays = (start?: string | null, end?: string | null): number => {
    if (!start || !end) return 0;
    try {
        const s = new Date(start);
        const e = new Date(end);
        if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
        const diffTime = Math.abs(e.getTime() - s.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
        return diffDays;
    } catch { return 0; }
};

const formatDaysCount = (days: number): string => {
    if (days <= 0) return '';
    if (days === 1) return 'يوم واحد';
    if (days === 2) return 'يومان';
    if (days >= 3 && days <= 10) return `${days} أيام`;
    return `${days} يوماً`;
};

const getAvatarColor = (name: string): string => {
    const colors = [
        '#0284c7', // sky
        '#0d9488', // teal
        '#059669', // emerald
        '#7c3aed', // violet
        '#db2777', // pink
        '#ea580c', // orange
        '#4f46e5', // indigo
        '#2563eb', // blue
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

const getRequestTypeIcon = (typeName?: string | null): React.ReactNode => {
    if (!typeName) return null;
    const name = typeName.toLowerCase();
    
    // Check type of request and return appropriate icon
    if (name.includes('إجازة') || name.includes('leave') || name.includes('vacation')) {
        if (name.includes('مرض') || name.includes('sick')) {
            return <AlertCircle size={14} style={{ color: 'var(--status-red, #dc2626)' }} />;
        }
        if (name.includes('طارئ') || name.includes('emergency')) {
            return <AlertTriangle size={14} style={{ color: 'var(--status-orange, #ea580c)' }} />;
        }
        return <Palmtree size={14} style={{ color: 'var(--status-green, #059669)' }} />;
    }
    if (name.includes('استئذان') || name.includes('permission') || name.includes('hour') || name.includes('خروج')) {
        return <Clock size={14} style={{ color: '#0284c7' }} />;
    }
    if (name.includes('مهمة') || name.includes('business') || name.includes('عمل') || name.includes('سفر')) {
        return <Briefcase size={14} style={{ color: '#4f46e5' }} />;
    }
    return <FileText size={14} style={{ color: 'var(--color-text-secondary, #64748b)' }} />;
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

// Review Modal (for managers) - Dense ERP style
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
    const [context, setContext] = useState<AdminRequestContext | null>(null);
    const [contextLoading, setContextLoading] = useState(false);
    const [historyExpanded, setHistoryExpanded] = useState(false);

    // جلب السياق (الإجازات السابقة + المهام + الجلسات المتعارضة) عند فتح المودل للطلبات المعلّقة
    useEffect(() => {
        if (!request || request.status !== 'pending') {
            setContext(null);
            return;
        }
        let cancelled = false;
        setContextLoading(true);
        setContext(null);
        AdminRequestService.getRequestContext(request.id)
            .then((ctx) => { if (!cancelled) setContext(ctx); })
            .catch(() => { /* صامت — السياق إضافي وليس حرجاً */ })
            .finally(() => { if (!cancelled) setContextLoading(false); });
        return () => { cancelled = true; };
    }, [request]);

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

    const statusBadge = request.status === 'pending' ? 'request-status-badge--pending'
        : request.status === 'approved' ? 'request-status-badge--approved' : 'request-status-badge--rejected';
    const statusLabel = request.status === 'pending' ? 'قيد المراجعة'
        : request.status === 'approved' ? 'مقبول' : 'مرفوض';

    // Calculate days since submission
    const daysSince = Math.floor((Date.now() - new Date(request.created_at).getTime()) / 86400000);
    const daysText = daysSince === 0 ? 'اليوم' : daysSince === 1 ? 'أمس' : `منذ ${daysSince} يوم`;

    return (
        <div className="rv-overlay" onClick={onClose}>
            <div className="rv-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="rv-header">
                    <Eye size={14} className="rv-header__icon" />
                    <span className="rv-header__title">مراجعة طلب</span>
                    <span className="rv-header__type">{request.request_type?.name}</span>
                    <div className="rv-header__spacer" />
                    <span className={`request-status-badge ${statusBadge}`}>
                        <span className="request-status-badge__dot" />{statusLabel}
                    </span>
                    <span className="rv-days">{daysText}</span>
                    {request.status === 'pending' && (
                        <>
                            <button className="rv-btn rv-btn--reject" onClick={() => handleAction('reject')} disabled={loading}>
                                <XCircle size={13} />{loading && action === 'reject' ? '...' : 'رفض'}
                            </button>
                            <button className="rv-btn rv-btn--approve" onClick={() => handleAction('approve')} disabled={loading}>
                                <CheckCircle size={13} />{loading && action === 'approve' ? '...' : 'قبول'}
                            </button>
                        </>
                    )}
                    <button className="rv-close" onClick={onClose}><X size={15} /></button>
                </div>

                {/* Alert */}
                {error && <div className="rv-alert"><AlertCircle size={13} />{error}</div>}

                {/* Conflict banner */}
                {request.status === 'pending' && context?.has_conflicts && (
                    <div className="rv-conflict-banner">
                        <AlertTriangle size={13} />
                        <span>
                            هذا الطلب يتعارض مع{' '}
                            {context.scheduled_sessions.length > 0 && (
                                <strong>{context.scheduled_sessions.length} جلسة مجدولة</strong>
                            )}
                            {context.scheduled_sessions.length > 0 && context.pending_tasks.length > 0 && ' و'}
                            {context.pending_tasks.length > 0 && (
                                <strong>{context.pending_tasks.length} مهمة معلّقة</strong>
                            )}
                            {' '}— راجع التفاصيل أدناه قبل الموافقة.
                        </span>
                    </div>
                )}

                {/* Body */}
                <div className="rv-body">
                    {/* === Context Section (للمدير عند المراجعة) === */}
                    {request.status === 'pending' && (
                        <div className="rv-context">
                            {contextLoading && (
                                <div className="rv-context__loading">
                                    <Loader2 size={12} className="rv-spin" />
                                    <span>جاري تحليل السياق...</span>
                                </div>
                            )}

                            {context && (
                                <>
                                    {/* سجل الإجازات السابقة (collapsible — مغلق افتراضياً) */}
                                    <div className="rv-context__card">
                                        <button
                                            type="button"
                                            className="rv-context__head rv-context__head--toggle"
                                            onClick={() => setHistoryExpanded(v => !v)}
                                            aria-expanded={historyExpanded}
                                        >
                                            <History size={12} />
                                            <span>سجل الإجازات السابقة</span>
                                            <span className="rv-context__head-summary">
                                                ({context.previous_leaves.all_approved} مقبولة • {context.previous_leaves.this_year_count} هذا العام)
                                            </span>
                                            <span className="rv-context__head-chevron">
                                                {historyExpanded ? <ChevronDown size={12} /> : <ChevronLeft size={12} />}
                                            </span>
                                        </button>
                                        {historyExpanded && (
                                            <>
                                                <div className="rv-context__chips">
                                                    <span className="rv-chip">
                                                        نفس النوع: <strong>{context.previous_leaves.same_type_count}</strong>
                                                        {context.previous_leaves.same_type_days > 0 && (
                                                            <span className="rv-chip__suffix">({context.previous_leaves.same_type_days} يوم)</span>
                                                        )}
                                                    </span>
                                                    <span className="rv-chip">
                                                        هذا العام: <strong>{context.previous_leaves.this_year_count}</strong>
                                                        {context.previous_leaves.this_year_days > 0 && (
                                                            <span className="rv-chip__suffix">({context.previous_leaves.this_year_days} يوم)</span>
                                                        )}
                                                    </span>
                                                    <span className="rv-chip">
                                                        إجمالي المقبولة: <strong>{context.previous_leaves.all_approved}</strong>
                                                    </span>
                                                </div>
                                                {context.previous_leaves.recent_same_type.length > 0 && (
                                                    <div className="rv-context__list">
                                                        {context.previous_leaves.recent_same_type.slice(0, 5).map((r) => (
                                                            <div key={r.id} className="rv-context__list-item">
                                                                <Calendar size={10} />
                                                                <span>
                                                                    {formatDate(r.start_date)}
                                                                    {r.end_date && r.end_date !== r.start_date ? ` ← ${formatDate(r.end_date)}` : ''}
                                                                </span>
                                                                {r.reason && <span className="rv-muted">— {r.reason.slice(0, 40)}</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* جلسات متعارضة */}
                                    {context.scheduled_sessions.length > 0 && (
                                        <div className="rv-context__card rv-context__card--warning">
                                            <div className="rv-context__head">
                                                <Calendar size={12} />
                                                <span>جلسات مجدولة خلال الإجازة ({context.scheduled_sessions.length})</span>
                                            </div>
                                            <div className="rv-context__list">
                                                {context.scheduled_sessions.map((s) => (
                                                    <div key={s.id} className="rv-context__list-item">
                                                        <Calendar size={10} />
                                                        <strong>{formatDate(s.session_date_gregorian)}</strong>
                                                        {s.session_time && <span>{s.session_time}</span>}
                                                        <span className="rv-muted">— {s.session_type || 'جلسة'}</span>
                                                        {s.case?.title && (
                                                            <span className="rv-muted" title={s.case.title}>
                                                                — {s.case.title.slice(0, 35)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* مهام متعارضة */}
                                    {context.pending_tasks.length > 0 && (
                                        <div className="rv-context__card rv-context__card--warning">
                                            <div className="rv-context__head">
                                                <Briefcase size={12} />
                                                <span>مهام معلّقة خلال الإجازة ({context.pending_tasks.length})</span>
                                            </div>
                                            <div className="rv-context__list">
                                                {context.pending_tasks.map((t) => (
                                                    <div key={t.id} className="rv-context__list-item">
                                                        <Briefcase size={10} />
                                                        <strong>{t.title}</strong>
                                                        <span className="rv-muted">— استحقاق: {formatDate(t.due_date)}</span>
                                                        {t.priority && t.priority !== 'normal' && (
                                                            <span className={`rv-priority rv-priority--${t.priority}`}>
                                                                {t.priority === 'high' ? 'عالية' : t.priority === 'low' ? 'منخفضة' : t.priority}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Properties table */}
                    <table className="rv-table">
                        <tbody>
                            <tr>
                                <td className="rv-table__label">مقدم الطلب</td>
                                <td>{request.user?.name}</td>
                                <td className="rv-table__label">تاريخ الإرسال</td>
                                <td>{formatDate(request.created_at)}</td>
                            </tr>
                            {request.start_date && (
                                <tr>
                                    <td className="rv-table__label">من تاريخ</td>
                                    <td>{formatDate(request.start_date)}</td>
                                    <td className="rv-table__label">إلى تاريخ</td>
                                    <td>{request.end_date ? formatDate(request.end_date) : '-'}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Two columns: Reason + Notes */}
                    <div className="rv-grid">
                        {/* Reason */}
                        <div className="rv-panel">
                            <div className="rv-panel__head"><FileText size={13} /> السبب</div>
                            <div className="rv-panel__content">
                                {request.reason || <span className="rv-muted">لم يُذكر سبب</span>}
                            </div>
                        </div>

                        {/* Notes / Review */}
                        <div className="rv-panel">
                            <div className="rv-panel__head"><MessageSquare size={13} /> ملاحظات المراجعة</div>
                            {request.status !== 'pending' && request.reviewer ? (
                                <div className="rv-panel__content">
                                    <div className="rv-reviewer">
                                        <span className="rv-reviewer__name">
                                            {request.status === 'approved' ? <CheckCircle size={12} style={{color:'#059669'}} /> : <XCircle size={12} style={{color:'#dc2626'}} />}
                                            {request.reviewer.name}
                                        </span>
                                        <span className="rv-reviewer__date">{formatDateTime(request.reviewed_at)}</span>
                                    </div>
                                    {request.manager_notes && <p className="rv-notes-text">{request.manager_notes}</p>}
                                </div>
                            ) : (
                                <div className="rv-panel__content rv-panel__content--input">
                                    <textarea
                                        className="rv-textarea"
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        rows={3}
                                        placeholder="أضف ملاحظاتك... (مطلوب عند الرفض)"
                                    />
                                </div>
                            )}
                        </div>
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

// ─────────────────────────────────────────────────────────────
// عمود التفاصيل اليساري: بطاقات الإحصائيات (عام / لكل مستخدم)
// ─────────────────────────────────────────────────────────────
const StatsPane: React.FC<{
    title: string;
    subtitle?: string;
    stats: AdminRequestStatistics;
    showByType: boolean;
}> = ({ title, subtitle, stats, showByType }) => {
    const hasData = stats.total > 0;
    const chartData = hasData ? [
        { name: 'قيد الانتظار', value: stats.pending, color: '#ea580c' },
        { name: 'مقبول', value: stats.approved, color: '#059669' },
        { name: 'مرفوض', value: stats.rejected, color: '#dc2626' }
    ].filter(item => item.value > 0) : [
        { name: 'لا توجد بيانات', value: 1, color: 'var(--color-border, #e2e8f0)' }
    ];

    return (
        <>
            <div className="areq-detail__header">
                <BarChart3 size={15} className="areq-detail__header-icon" />
                <div className="areq-detail__header-titles">
                    <span className="areq-detail__header-title">{title}</span>
                    {subtitle && <span className="areq-detail__header-sub">{subtitle}</span>}
                </div>
            </div>
            <div className="areq-detail__body">
                {/* Donut Chart */}
                <div className="areq-stats-chart-wrapper">
                    <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={42}
                                outerRadius={50}
                                paddingAngle={hasData ? 3 : 0}
                                dataKey="value"
                                isAnimationActive={false}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            {hasData && (
                                <Tooltip
                                    formatter={(value: any, name: any) => [value, name]}
                                    contentStyle={{
                                        background: 'var(--dashboard-card)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        color: 'var(--color-text)',
                                        direction: 'rtl',
                                        textAlign: 'right'
                                    }}
                                />
                            )}
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="areq-stats-chart-center">
                        <span className="areq-stats-chart-center__val">{stats.total}</span>
                        <span className="areq-stats-chart-center__lbl">طلب إجمالي</span>
                    </div>
                </div>

                <div className="areq-stats-grid">
                    <div className="areq-stat areq-stat--navy">
                        <div className="areq-stat__icon">
                            <ClipboardList size={16} />
                        </div>
                        <div className="areq-stat__info">
                            <span className="areq-stat__num">{stats.total}</span>
                            <span className="areq-stat__label">الإجمالي</span>
                        </div>
                    </div>
                    <div className="areq-stat areq-stat--orange">
                        <div className="areq-stat__icon">
                            <Clock size={16} />
                        </div>
                        <div className="areq-stat__info">
                            <span className="areq-stat__num">{stats.pending}</span>
                            <span className="areq-stat__label">قيد الانتظار</span>
                        </div>
                    </div>
                    <div className="areq-stat areq-stat--green">
                        <div className="areq-stat__icon">
                            <CheckCircle size={16} />
                        </div>
                        <div className="areq-stat__info">
                            <span className="areq-stat__num">{stats.approved}</span>
                            <span className="areq-stat__label">مقبول</span>
                        </div>
                    </div>
                    <div className="areq-stat areq-stat--red">
                        <div className="areq-stat__icon">
                            <XCircle size={16} />
                        </div>
                        <div className="areq-stat__info">
                            <span className="areq-stat__num">{stats.rejected}</span>
                            <span className="areq-stat__label">مرفوض</span>
                        </div>
                    </div>
                </div>

                {showByType && stats.by_type && stats.by_type.length > 0 && (
                    <div className="areq-detail__section">
                        <div className="areq-detail__section-label">الطلبات المعلّقة حسب النوع</div>
                        <div className="areq-bytype-list">
                            {stats.by_type.map(t => (
                                <div key={t.request_type_id} className="areq-bytype-row">
                                    <span className="areq-bytype-row__name">{t.request_type?.name || 'غير محدّد'}</span>
                                    <span className="areq-bytype-row__count">{t.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

// ─────────────────────────────────────────────────────────────
// عمود التفاصيل اليساري: تفاصيل طلب مختار
// ─────────────────────────────────────────────────────────────
const RequestDetailPane: React.FC<{
    request: AdminRequest;
    isManager: boolean;
    onClose: () => void;
    onReview: (req: AdminRequest) => void;
    onDelete: (id: number) => void;
}> = ({ request, isManager, onClose, onReview, onDelete }) => {
    const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG['pending'];
    return (
        <>
            <div className="areq-detail__header">
                <FileText size={15} className="areq-detail__header-icon" />
                <div className="areq-detail__header-titles">
                    <span className="areq-detail__header-title">تفاصيل الطلب</span>
                    <span className="areq-detail__header-sub">{request.request_type?.name}</span>
                </div>
                <button className="areq-detail__close" onClick={onClose} title="إغلاق"><X size={16} /></button>
            </div>
            <div className="areq-detail__body">
                {/* بطاقة الحالة */}
                <div className="areq-detail__status-row">
                    <span className={`request-status-badge ${statusConfig.class}`}>
                        <span className="request-status-badge__dot" />{statusConfig.label}
                    </span>
                </div>

                {/* الحقول */}
                <div className="areq-detail__fields">
                    <div className="areq-detail__field">
                        <span className="areq-detail__field-label"><User size={12} /> مقدم الطلب</span>
                        <span className="areq-detail__field-value">{request.user?.name || '-'}</span>
                    </div>
                    {request.start_date && (
                        <div className="areq-detail__field">
                            <span className="areq-detail__field-label"><Calendar size={12} /> الفترة</span>
                            <span className="areq-detail__field-value">
                                {formatDate(request.start_date)}
                                {request.end_date && request.end_date !== request.start_date && <> ← {formatDate(request.end_date)}</>}
                            </span>
                        </div>
                    )}
                    <div className="areq-detail__field">
                        <span className="areq-detail__field-label"><Clock size={12} /> تاريخ الإرسال</span>
                        <span className="areq-detail__field-value">{formatDate(request.created_at)}</span>
                    </div>
                </div>

                {/* السبب */}
                <div className="areq-detail__section">
                    <div className="areq-detail__section-label">السبب</div>
                    <p className="areq-detail__text">{request.reason || <span className="areq-muted">لم يُذكر سبب</span>}</p>
                </div>

                {/* المراجعة */}
                {request.status !== 'pending' && request.reviewer && (
                    <div className="areq-detail__section">
                        <div className="areq-detail__section-label">
                            {request.status === 'approved' ? 'تمت الموافقة' : 'تم الرفض'}
                        </div>
                        <div className="areq-detail__reviewer">
                            {request.status === 'approved'
                                ? <CheckCircle size={13} style={{ color: 'var(--status-green)' }} />
                                : <XCircle size={13} style={{ color: 'var(--status-red)' }} />}
                            <span className="areq-detail__reviewer-name">{request.reviewer.name}</span>
                            <span className="areq-detail__reviewer-date">{formatDateTime(request.reviewed_at)}</span>
                        </div>
                        {request.manager_notes && <p className="areq-detail__text areq-detail__text--notes">{request.manager_notes}</p>}
                    </div>
                )}

                {/* الإجراءات */}
                {isManager && request.status === 'pending' && (
                    <button className="btn-primary areq-detail__action" onClick={() => onReview(request)}>
                        <Eye size={15} /> مراجعة الطلب
                    </button>
                )}
                {!isManager && request.status === 'pending' && (
                    <button className="btn-secondary areq-detail__action areq-detail__action--danger" onClick={() => onDelete(request.id)}>
                        <Trash2 size={15} /> حذف الطلب
                    </button>
                )}
            </div>
        </>
    );
};

// Main Page
const AdminRequests: React.FC = () => {
    // المدير = نفس معيار الباك (admin/owner أو صلاحية system.manage) — لا اسم الدور وحده،
    // حتى لا يرى مدير بدور مخصّص (يملك system.manage) طلبات المكتب تحت واجهة «موظف عادي».
    const { hasAny, roles } = usePermissionContext();
    const isManager = roles.includes('admin') || roles.includes('owner') || hasAny(['system.manage']);

    // بيانات
    const [requests, setRequests] = useState<AdminRequest[]>([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
    const [sidebar, setSidebar] = useState<AdminRequestSidebar>({ users: [], on_leave: [] });
    const [stats, setStats] = useState<AdminRequestStatistics>({ total: 0, pending: 0, approved: 0, rejected: 0 });

    // حالات الشبكة
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // فلاتر/تحديد
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<AdminRequest | null>(null);

    // مودالات + جوال
    const [reviewRequest, setReviewRequest] = useState<AdminRequest | null>(null);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    const PER_PAGE = 15;

    // تحميل القائمة الوسطى (server-side pagination + filters)
    const loadRequests = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await AdminRequestService.getRequests({
                status: statusFilter || undefined,
                user_id: (isManager && selectedUserId) ? selectedUserId : undefined,
                page,
                per_page: PER_PAGE,
            });
            setRequests(res.data || []);
            setLastPage(res.last_page || 1);
            setTotal(res.total || 0);
        } catch (err: any) {
            setError(err.message || 'فشل في تحميل الطلبات');
            setRequests([]);
        } finally { setLoading(false); }
    }, [statusFilter, selectedUserId, page, isManager]);

    // تحميل القائمة الجانبية (مدير فقط)
    const loadSidebar = useCallback(async () => {
        if (!isManager) return;
        try {
            const sb = await AdminRequestService.getSidebar();
            setSidebar(sb);
        } catch { /* صامت — القائمة الجانبية ثانوية */ }
    }, [isManager]);

    // تحميل الإحصائيات (عام أو لكل مستخدم)
    const loadStats = useCallback(async () => {
        try {
            const s = await AdminRequestService.getStatistics(isManager ? selectedUserId : null);
            setStats(s);
        } catch { /* صامت */ }
    }, [isManager, selectedUserId]);

    const loadTypes = useCallback(async () => {
        try { setRequestTypes(await RequestTypeService.getTypes()); } catch { /* صامت */ }
    }, []);

    useEffect(() => { loadRequests(); }, [loadRequests]);
    useEffect(() => { loadStats(); }, [loadStats]);
    useEffect(() => { loadTypes(); loadSidebar(); }, [loadTypes, loadSidebar]);

    // تثبيت رقم الصفحة ضمن النطاق بعد أي تقلّص (قبول/رفض/حذف آخر عنصر في صفحة أخيرة)
    // وإلا بقي المستخدم على صفحة فارغة دون أزرار ترقيم (تظهر فقط حين lastPage > 1).
    useEffect(() => {
        if (page > lastPage) setPage(lastPage);
    }, [page, lastPage]);

    const refreshAll = useCallback(() => {
        loadRequests();
        loadSidebar();
        loadStats();
    }, [loadRequests, loadSidebar, loadStats]);

    const handleCreateRequest = async (data: CreateAdminRequestForm) => {
        await AdminRequestService.createRequest(data);
        setPage(1);
        refreshAll();
    };

    const handleApprove = async (id: number, notes?: string) => {
        const updated = await AdminRequestService.approveRequest(id, notes);
        setSelectedRequest(prev => (prev?.id === id ? updated : prev));
        refreshAll();
    };

    const handleReject = async (id: number, notes: string) => {
        const updated = await AdminRequestService.rejectRequest(id, notes);
        setSelectedRequest(prev => (prev?.id === id ? updated : prev));
        refreshAll();
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
        try {
            await AdminRequestService.deleteRequest(id);
            setSelectedRequest(prev => (prev?.id === id ? null : prev));
            setPage(1);
            refreshAll();
        } catch (err: any) { alert(err.message || 'فشل في حذف الطلب'); }
    };

    // اختيار فئة الحالة / المستخدم → يعيد الصفحة للأولى ويفرّغ التفاصيل
    const selectStatus = (s: string) => {
        setStatusFilter(s); setSelectedRequest(null); setPage(1); setMobileSidebarOpen(false);
    };
    const selectUser = (id: number | null) => {
        setSelectedUserId(id); setSelectedRequest(null); setPage(1); setMobileSidebarOpen(false);
    };

    // بحث client-side على نتائج الصفحة الحالية (نفس نمط صفحة الملاحظات)
    const filteredRequests = useMemo(() => {
        if (!searchTerm.trim()) return requests;
        const term = searchTerm.toLowerCase();
        return requests.filter(r =>
            r.user?.name?.toLowerCase().includes(term) ||
            r.request_type?.name?.toLowerCase().includes(term) ||
            r.reason?.toLowerCase().includes(term)
        );
    }, [requests, searchTerm]);

    const selectedUserName = useMemo(() => {
        if (!selectedUserId) return null;
        const u = sidebar.users.find(x => x.id === selectedUserId);
        if (u) return u.name;
        const l = sidebar.on_leave.find(x => x.user_id === selectedUserId);
        return l?.user?.name || 'موظف';
    }, [selectedUserId, sidebar]);

    const middleTitle = selectedUserName
        ? `طلبات: ${selectedUserName}`
        : statusFilter
            ? STATUS_CONFIG[statusFilter]?.label || 'الطلبات'
            : (isManager ? 'كل الطلبات' : 'طلباتي');

    // عداد الفئات في الجانب يعتمد إحصاءات السياق الحالي (عام أو لكل مستخدم)
    const statusCounts = stats;

    const renderRow = (req: AdminRequest) => {
        const statusConfig = STATUS_CONFIG[req.status] || STATUS_CONFIG['pending'];
        
        // Calculate days duration
        const durationDays = req.start_date && req.end_date ? calculateDays(req.start_date, req.end_date) : 0;
        
        // Avatar color for the user
        const userName = req.user?.name || 'موظف';
        const avatarBgColor = getAvatarColor(userName);
        
        return (
            <button
                key={req.id}
                className={`areq-card-row ${selectedRequest?.id === req.id ? 'areq-card-row--selected' : ''}`}
                onClick={() => setSelectedRequest(req)}
            >
                {/* Column 1 & 2: User Group (Avatar + Name & Time) */}
                <div className="areq-card-row__user-group">
                    {/* Column 1: Avatar / Icon */}
                    <div className="areq-card-row__col-avatar">
                        {isManager ? (
                            <div className="areq-card-row__avatar" style={{ backgroundColor: avatarBgColor }} title={userName}>
                                {userName.charAt(0)}
                            </div>
                        ) : (
                            <div className="areq-card-row__type-icon" title={req.request_type?.name}>
                                {getRequestTypeIcon(req.request_type?.name || '')}
                            </div>
                        )}
                    </div>

                    {/* Column 2: Username / Time */}
                    <div className="areq-card-row__col-user">
                        <span className="areq-card-row__username">
                            {isManager ? userName : req.request_type?.name}
                        </span>
                        <span className="areq-card-row__time-ago">
                            {formatDate(req.created_at)}
                        </span>
                    </div>
                </div>

                {/* Column 3: Request Type & Duration */}
                <div className="areq-card-row__col-type">
                    {isManager ? (
                        <div className="areq-card-row__type-tag-container">
                            <span className="areq-card-row__type-tag">
                                {getRequestTypeIcon(req.request_type?.name || '')}
                                <span className="areq-card-row__type-name">{req.request_type?.name}</span>
                            </span>
                        </div>
                    ) : null}
                    
                    {req.start_date ? (
                        <div className="areq-card-row__date-duration">
                            <Calendar size={12} className="areq-card-row__calendar-icon" />
                            <span className="areq-card-row__dates">
                                {formatDate(req.start_date)}
                                {req.end_date && req.end_date !== req.start_date && ` ← ${formatDate(req.end_date)}`}
                            </span>
                            {durationDays > 0 && (
                                <span className="areq-card-row__days-badge">
                                    {formatDaysCount(durationDays)}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="areq-muted">—</span>
                    )}
                </div>

                {/* Column 4: Reason Preview */}
                <div className="areq-card-row__col-reason">
                    {req.reason ? (
                        <p className="areq-card-row__reason-text" title={req.reason}>
                            {req.reason}
                        </p>
                    ) : (
                        <span className="areq-muted">—</span>
                    )}
                </div>

                {/* Column 5: Status Pill */}
                <div className="areq-card-row__col-status">
                    <span className={`request-status-badge ${statusConfig.class}`}>
                        <span className="request-status-badge__dot" />
                        {statusConfig.label}
                    </span>
                </div>
            </button>
        );
    };

    return (
        <div className="requests-page areq-page">
            {/* Header Bar */}
            <header className="requests-header-bar">
                <div className="requests-header-bar__start">
                    <div className="requests-header-bar__title">
                        <ClipboardList size={20} />
                        <span>الطلبات الإدارية</span>
                        <span className="requests-header-bar__count">{total}</span>
                    </div>
                </div>

                <div className="requests-header-bar__center">
                    {isManager && (
                        <button className="areq-mobile-filter-btn" onClick={() => setMobileSidebarOpen(true)} title="التصفية">
                            <Filter size={16} />
                        </button>
                    )}
                    <div className="requests-search-box">
                        <Search size={16} />
                        <input type="text" placeholder="بحث في الصفحة الحالية..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="requests-search-box__clear"><X size={14} /></button>
                        )}
                    </div>
                    <button className="requests-icon-btn" onClick={refreshAll} title="تحديث">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="requests-header-bar__end">
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

            {/* التخطيط الثلاثي */}
            <div className="areq-layout">
                {/* Backdrop للجوال */}
                {mobileSidebarOpen && <div className="areq-sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} />}

                {/* العمود اليمين: القائمة الجانبية */}
                <aside className={`areq-sidebar ${mobileSidebarOpen ? 'areq-sidebar--mobile-open' : ''}`}>
                    <div className="areq-sidebar__mobile-head">
                        <span>التصفية</span>
                        <button onClick={() => setMobileSidebarOpen(false)}><X size={16} /></button>
                    </div>

                    {/* قسم الحالة */}
                    <div className="areq-side-section">
                        <div className="areq-side-label">الحالة</div>
                        <div className="areq-side-menu">
                            <button className={`areq-side-item ${statusFilter === '' ? 'areq-side-item--active' : ''}`} onClick={() => selectStatus('')}>
                                <span className="areq-side-item__label"><Inbox size={15} /> الكل</span>
                                <span className="areq-side-item__badge">{statusCounts.total}</span>
                            </button>
                            <button className={`areq-side-item ${statusFilter === 'pending' ? 'areq-side-item--active' : ''}`} onClick={() => selectStatus('pending')}>
                                <span className="areq-side-item__label"><Clock size={15} /> قيد الانتظار</span>
                                <span className="areq-side-item__badge areq-side-item__badge--orange">{statusCounts.pending}</span>
                            </button>
                            <button className={`areq-side-item ${statusFilter === 'approved' ? 'areq-side-item--active' : ''}`} onClick={() => selectStatus('approved')}>
                                <span className="areq-side-item__label"><CheckCircle size={15} /> مقبول</span>
                                <span className="areq-side-item__badge areq-side-item__badge--green">{statusCounts.approved}</span>
                            </button>
                            <button className={`areq-side-item ${statusFilter === 'rejected' ? 'areq-side-item--active' : ''}`} onClick={() => selectStatus('rejected')}>
                                <span className="areq-side-item__label"><XCircle size={15} /> مرفوض</span>
                                <span className="areq-side-item__badge areq-side-item__badge--red">{statusCounts.rejected}</span>
                            </button>
                        </div>
                    </div>

                    {isManager && (
                        <>
                            {/* قسم: في إجازة الآن */}
                            {sidebar.on_leave.length > 0 && (
                                <div className="areq-side-section">
                                    <div className="areq-side-label"><Palmtree size={13} /> في إجازة الآن <span className="areq-side-label__count">{sidebar.on_leave.length}</span></div>
                                    <div className="areq-side-menu">
                                        {sidebar.on_leave.map(entry => (
                                            <button key={entry.id} className="areq-leave-item" onClick={() => selectUser(entry.user_id)}>
                                                <span className="areq-avatar areq-avatar--leave">{entry.user?.name?.charAt(0) || '?'}</span>
                                                <div className="areq-leave-item__info">
                                                    <span className="areq-leave-item__name">{entry.user?.name || 'موظف'}</span>
                                                    <span className="areq-leave-item__meta">
                                                        {entry.request_type?.name}
                                                        {entry.end_date && <> · حتى {formatDate(entry.end_date)}</>}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* قسم: الموظفون */}
                            <div className="areq-side-section areq-side-section--users">
                                <div className="areq-side-label"><Users size={13} /> الموظفون</div>
                                <div className="areq-side-menu">
                                    <button className={`areq-user-item ${selectedUserId === null ? 'areq-user-item--active' : ''}`} onClick={() => selectUser(null)}>
                                        <span className="areq-avatar areq-avatar--all"><Users size={14} /></span>
                                        <span className="areq-user-item__name">كل الموظفين</span>
                                    </button>
                                    {sidebar.users.map(u => (
                                        <button key={u.id} className={`areq-user-item ${selectedUserId === u.id ? 'areq-user-item--active' : ''} ${!u.is_active ? 'areq-user-item--inactive' : ''}`} onClick={() => selectUser(u.id)}>
                                            <span className="areq-avatar">{u.name?.charAt(0) || '?'}</span>
                                            <span className="areq-user-item__name">{u.name}</span>
                                            {u.pending_count > 0 && <span className="areq-user-item__pending" title="قيد الانتظار">{u.pending_count}</span>}
                                            <span className="areq-user-item__count" title="إجمالي الطلبات">{u.admin_requests_count}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </aside>

                {/* العمود الأوسط: قائمة الطلبات */}
                <main className="areq-main">
                    <div className="areq-main-header">
                        <span className="areq-main-header__title">{middleTitle}</span>
                        <span className="areq-main-header__count">{filteredRequests.length}</span>
                        {selectedUserId && (
                            <button className="areq-main-header__clear" onClick={() => selectUser(null)} title="إلغاء تصفية الموظف">
                                <X size={13} /> إلغاء التصفية
                            </button>
                        )}
                    </div>

                    {/* ERP Column Headers */}
                    {filteredRequests.length > 0 && !loading && !error && (
                        <div className="areq-list-header">
                            <div className="areq-list-header__col is-avatar"></div>
                            <div className="areq-list-header__col is-user">{isManager ? 'الموظف' : 'نوع الطلب'}</div>
                            <div className="areq-list-header__col is-type">{isManager ? 'نوع الطلب والمدة' : 'الفترة والمدة'}</div>
                            <div className="areq-list-header__col is-reason">السبب</div>
                            <div className="areq-list-header__col is-status">الحالة</div>
                        </div>
                    )}

                    <div className="areq-list-scroll">
                        {loading ? (
                            [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="areq-skeleton" />)
                        ) : error ? (
                            <div className="areq-empty">
                                <AlertCircle size={40} className="areq-empty__icon" />
                                <div className="areq-empty__title">حدث خطأ</div>
                                <div className="areq-empty__desc">{error}</div>
                                <button className="btn-primary" onClick={loadRequests}>إعادة المحاولة</button>
                            </div>
                        ) : filteredRequests.length === 0 ? (
                            <div className="areq-empty">
                                <ClipboardList size={40} className="areq-empty__icon" />
                                <div className="areq-empty__title">لا توجد طلبات</div>
                                <div className="areq-empty__desc">
                                    {searchTerm ? 'لا نتائج مطابقة لبحثك في هذه الصفحة'
                                        : isManager ? 'لا توجد طلبات بهذه التصفية' : 'لم تقم بتقديم أي طلبات بعد'}
                                </div>
                                {!searchTerm && <button className="btn-primary" onClick={() => setIsNewModalOpen(true)}><Plus size={16} /> تقديم طلب جديد</button>}
                            </div>
                        ) : (
                            filteredRequests.map(renderRow)
                        )}
                    </div>

                    {/* الترقيم */}
                    {lastPage > 1 && !loading && (
                        <div className="areq-pagination">
                            <button className="areq-page-btn" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} aria-label="السابق">
                                <ChevronRight size={16} />
                            </button>
                            <span className="areq-pagination__info">صفحة {page} من {lastPage}</span>
                            <button className="areq-page-btn" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)} aria-label="التالي">
                                <ChevronLeft size={16} />
                            </button>
                        </div>
                    )}
                </main>

                {/* العمود اليسار: تفاصيل / إحصائيات */}
                <aside className={`areq-detail ${selectedRequest ? 'areq-detail--has-selection' : ''}`}>
                    {selectedRequest ? (
                        <RequestDetailPane
                            request={selectedRequest}
                            isManager={isManager}
                            onClose={() => setSelectedRequest(null)}
                            onReview={(req) => setReviewRequest(req)}
                            onDelete={handleDelete}
                        />
                    ) : (
                        <StatsPane
                            title={selectedUserName ? selectedUserName : (isManager ? 'إحصائيات المكتب' : 'إحصائياتي')}
                            subtitle={selectedUserName ? 'إحصائيات الموظف المحدّد' : undefined}
                            stats={stats}
                            showByType={isManager && !selectedUserId}
                        />
                    )}
                </aside>
            </div>

            <RequestModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} onSubmit={handleCreateRequest} requestTypes={requestTypes} />
            <ReviewModal request={reviewRequest} onClose={() => setReviewRequest(null)} onApprove={handleApprove} onReject={handleReject} />
            {isManager && <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} requestTypes={requestTypes} onRefresh={() => { loadTypes(); }} />}
        </div>
    );
};

export default AdminRequests;
