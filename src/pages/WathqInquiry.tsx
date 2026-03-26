import React, { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Building2,
    Scale,
    MapPin,
    FileText,
    Users,
    Briefcase,
    Home,
    UserCheck,
    History,
    X,
    ChevronLeft,
    ChevronRight,
    Loader2,
    CheckCircle,
    XCircle,
    Eye,
    RefreshCw,
    Clock,
    Filter,
    ArrowLeft,
    Settings,
    AlertTriangle,
    Save,
    Key,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
    wathqService,
    SERVICE_TYPES,
    CR_ENDPOINTS,
    CC_ENDPOINTS,
    RE_ID_TYPES,
    WATHQ_FIELD_LABELS,
    HIDDEN_FIELDS,
} from '../services/wathqService';
import type { WathqInquiry as WathqInquiryType } from '../services/wathqService';
import '../styles/wathq-inquiry.css';

// === Helper Functions ===
const formatDateTime = (value?: string | null): string => {
    if (!value) return '-';
    try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return value;
    }
};

// === Endpoint Arabic Labels ===
const ENDPOINT_LABELS: Record<string, string> = {
    fullinfo: 'معلومات كاملة',
    info: 'معلومات أساسية',
    branches: 'الفروع',
    status: 'الحالة',
    capital: 'رأس المال',
    managers: 'المديرون',
    owners: 'الملاك',
    related: 'سجلات مرتبطة',
    owns: 'ما يملكه',
    management: 'الإدارة',
    manager: 'مدير محدد',
    deed: 'بيانات الصك',
    lookup: 'نصوص الوكالات',
};

// === Query Params Arabic Labels ===
const PARAM_LABELS: Record<string, string> = {
    cr_number: 'رقم السجل',
    cr_national_number: 'الرقم الوطني',
    code: 'رقم الوكالة',
    principal_id: 'رقم الموكل',
    agent_id: 'رقم الوكيل',
    deed_number: 'رقم الصك',
    id_number: 'رقم الهوية',
    id_type: 'نوع الهوية',
    id: 'رقم الهوية',
};

// === Service Groups ===
type ServiceGroup = 'commerce' | 'justice' | 'other';
type ServiceType =
    | 'commercial_registration'
    | 'company_contract'
    | 'power_of_attorney'
    | 'real_estate_deed'
    | 'national_address'
    | 'employee_data';

const SERVICE_GROUPS: Record<ServiceGroup, { label: string; icon: React.ReactNode; services: ServiceType[] }> = {
    commerce: {
        label: 'التجارة',
        icon: <Building2 size={20} />,
        services: ['commercial_registration', 'company_contract'],
    },
    justice: {
        label: 'العدل والعقارات',
        icon: <Scale size={20} />,
        services: ['power_of_attorney', 'real_estate_deed'],
    },
    other: {
        label: 'خدمات أخرى',
        icon: <MapPin size={20} />,
        services: ['national_address', 'employee_data'],
    },
};

const SERVICE_ICONS: Record<ServiceType, React.ReactNode> = {
    commercial_registration: <Briefcase size={18} />,
    company_contract: <FileText size={18} />,
    power_of_attorney: <Scale size={18} />,
    real_estate_deed: <Home size={18} />,
    national_address: <MapPin size={18} />,
    employee_data: <UserCheck size={18} />,
};

// === Helpers ===
const isEmptyValue = (value: unknown): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
};

const getLabel = (key: string): string => WATHQ_FIELD_LABELS[key] || key;

const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
    if (typeof value === 'number') return value.toLocaleString('en-US');
    return String(value);
};

const isSimpleValue = (value: unknown): boolean => {
    return value === null || value === undefined || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
};

// === Simple Table Result Viewer ===
const ResultViewer: React.FC<{ data: Record<string, unknown> | unknown[] }> = ({ data }) => {

    // Render an array of objects as a grid table
    const renderArrayTable = (arr: unknown[], title?: string): React.ReactNode => {
        // If array of simple values
        if (arr.every(isSimpleValue)) {
            return (
                <div className="wathq-table-section">
                    {title && <div className="wathq-table-title">{title}</div>}
                    <span>{arr.map(formatValue).join('، ')}</span>
                </div>
            );
        }

        // Array of objects - render as table
        const objects = arr.filter(item => typeof item === 'object' && item !== null) as Record<string, unknown>[];
        if (objects.length === 0) return null;

        // Get all keys across all objects
        const allKeys = Array.from(new Set(objects.flatMap(obj => Object.keys(obj))))
            .filter(key => !HIDDEN_FIELDS.has(key) && objects.some(obj => !isEmptyValue(obj[key])));

        const simpleKeys = allKeys.filter(key => objects.every(obj => isSimpleValue(obj[key]) || isEmptyValue(obj[key])));
        const complexKeys = allKeys.filter(key => !simpleKeys.includes(key));

        // If items have complex sub-fields AND there's more than 1 item, render each item as its own section
        if (complexKeys.length > 0 && objects.length > 1) {
            return (
                <div className="wathq-table-section">
                    {title && <div className="wathq-table-title">{title}</div>}
                    {objects.map((obj, i) => {
                        // Use name or first simple value as item label
                        const itemName = String(obj['name'] || obj['Name'] || obj['ownerName'] || `#${i + 1}`);
                        return (
                            <div key={i} className="wathq-table-section">
                                <div className="wathq-table-subtitle">{itemName}</div>
                                {simpleKeys.length > 0 && (
                                    <table className="wathq-simple-table wathq-kv-table">
                                        <tbody>
                                            {simpleKeys.map(key => !isEmptyValue(obj[key]) && (
                                                <tr key={key}>
                                                    <th>{getLabel(key)}</th>
                                                    <td>{formatValue(obj[key])}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                {complexKeys.map(key => !isEmptyValue(obj[key]) && (
                                    <div key={key}>
                                        {Array.isArray(obj[key])
                                            ? renderArrayTable(obj[key] as unknown[], getLabel(key))
                                            : typeof obj[key] === 'object'
                                                ? renderObjectTable(obj[key] as Record<string, unknown>, getLabel(key))
                                                : null}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            );
        }

        // Single item or no complex fields - render as normal table
        return (
            <div className="wathq-table-section">
                {title && <div className="wathq-table-title">{title}</div>}
                {simpleKeys.length > 0 && (
                    <table className="wathq-simple-table">
                        <thead>
                            <tr>
                                {simpleKeys.map(key => (
                                    <th key={key}>{getLabel(key)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {objects.map((obj, i) => (
                                <tr key={i}>
                                    {simpleKeys.map(key => (
                                        <td key={key}>{formatValue(obj[key])}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {/* Single item - render complex sub-fields */}
                {complexKeys.length > 0 && objects.map((obj, i) => (
                    <div key={i}>
                        {complexKeys.map(key => !isEmptyValue(obj[key]) && (
                            <div key={key}>
                                {Array.isArray(obj[key])
                                    ? renderArrayTable(obj[key] as unknown[], getLabel(key))
                                    : typeof obj[key] === 'object'
                                        ? renderObjectTable(obj[key] as Record<string, unknown>, getLabel(key))
                                        : null}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    };

    // Render a single object as a 2-column table (field | value)
    const renderObjectTable = (obj: Record<string, unknown>, title?: string): React.ReactNode => {
        const entries = Object.entries(obj).filter(
            ([key, value]) => !HIDDEN_FIELDS.has(key) && !isEmptyValue(value)
        );
        if (entries.length === 0) return null;

        const simpleEntries = entries.filter(([, value]) => isSimpleValue(value));
        const complexEntries = entries.filter(([, value]) => !isSimpleValue(value));

        return (
            <div className="wathq-table-section">
                {title && <div className="wathq-table-title">{title}</div>}
                {simpleEntries.length > 0 && (
                    <table className="wathq-simple-table wathq-kv-table">
                        <tbody>
                            {simpleEntries.map(([key, value]) => (
                                <tr key={key}>
                                    <th>{getLabel(key)}</th>
                                    <td>{formatValue(value)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {complexEntries.map(([key, value]) => (
                    <div key={key}>
                        {Array.isArray(value)
                            ? renderArrayTable(value, getLabel(key))
                            : typeof value === 'object'
                                ? renderObjectTable(value as Record<string, unknown>, getLabel(key))
                                : null}
                    </div>
                ))}
            </div>
        );
    };

    // Entry point
    if (Array.isArray(data)) {
        return <div className="wathq-result-viewer">{renderArrayTable(data)}</div>;
    }
    return <div className="wathq-result-viewer">{renderObjectTable(data)}</div>;
};

// === Inquiry History Modal ===
const InquiryHistoryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
}> = ({ isOpen, onClose }) => {
    const [inquiries, setInquiries] = useState<WathqInquiryType[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [selectedInquiry, setSelectedInquiry] = useState<WathqInquiryType | null>(null);

    const fetchInquiries = useCallback(async () => {
        setLoading(true);
        try {
            const res = await wathqService.getInquiries({
                page,
                per_page: 10,
                service_type: filterType || undefined,
                status: filterStatus || undefined,
            });
            if (res.success) {
                setInquiries(res.data.data);
                setLastPage(res.data.last_page);
                setTotal(res.data.total);
            }
        } catch (err) {
            console.error('Error fetching inquiries:', err);
        } finally {
            setLoading(false);
        }
    }, [page, filterType, filterStatus]);

    useEffect(() => {
        if (isOpen) {
            fetchInquiries();
        }
    }, [isOpen, fetchInquiries]);

    const viewDetails = async (inquiry: WathqInquiryType) => {
        if (!inquiry.response_data) {
            try {
                const res = await wathqService.getInquiryDetails(inquiry.id);
                if (res.success) {
                    setSelectedInquiry(res.data);
                    return;
                }
            } catch (err) {
                console.error(err);
            }
        }
        setSelectedInquiry(inquiry);
    };

    if (!isOpen) return null;

    return (
        <div className="wathq-modal-overlay" onClick={onClose}>
            <div className="wathq-modal" onClick={(e) => e.stopPropagation()}>
                <div className="wathq-modal-header">
                    {selectedInquiry ? (
                        <>
                            <button className="wathq-btn-icon" onClick={() => setSelectedInquiry(null)}>
                                <ArrowLeft size={18} />
                            </button>
                            <h3>تفاصيل الاستعلام</h3>
                        </>
                    ) : (
                        <>
                            <h3>
                                <History size={20} />
                                الاستعلامات السابقة ({total})
                            </h3>
                        </>
                    )}
                    <button className="wathq-btn-icon" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {selectedInquiry ? (
                    <div className="wathq-modal-body">
                        <div className="wathq-detail-card">
                            <div className="wathq-detail-header-info">
                                <div className="wathq-detail-service-badge">
                                    {SERVICE_TYPES[selectedInquiry.service_type] || selectedInquiry.service_type}
                                </div>
                                <span className="wathq-detail-endpoint">
                                    {ENDPOINT_LABELS[selectedInquiry.endpoint] || selectedInquiry.endpoint}
                                </span>
                                <span className={`wathq-status-badge ${selectedInquiry.status}`}>
                                    {selectedInquiry.status === 'success' ? <><CheckCircle size={12} /> ناجح</> : <><XCircle size={12} /> فاشل</>}
                                </span>
                            </div>
                            <div className="wathq-detail-meta">
                                <span><Clock size={14} /> {formatDateTime(selectedInquiry.created_at)}</span>
                                <span><Users size={14} /> {selectedInquiry.user?.name || '-'}</span>
                                {selectedInquiry.response_time_ms && (
                                    <span>{selectedInquiry.response_time_ms} مللي ثانية</span>
                                )}
                            </div>
                        </div>

                        <div className="wathq-detail-params-section">
                            <h4>معاملات البحث</h4>
                            <div className="wathq-detail-params-grid">
                                {Object.entries(selectedInquiry.query_params)
                                    .filter(([, v]) => v)
                                    .map(([key, val]) => (
                                    <div key={key} className="wathq-detail-param-item">
                                        <span className="wathq-detail-param-label">{PARAM_LABELS[key] || key}</span>
                                        <span className="wathq-detail-param-value">{String(val)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedInquiry.response_data && (
                            <div className="wathq-detail-result">
                                <h4>نتيجة الاستعلام</h4>
                                <ResultViewer data={selectedInquiry.response_data} />
                            </div>
                        )}
                        {selectedInquiry.error_message && (
                            <div className="wathq-detail-error">
                                <h4>رسالة الخطأ</h4>
                                <p>{selectedInquiry.error_message}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="wathq-modal-body">
                        <div className="wathq-history-filters">
                            <div className="wathq-filter-group">
                                <Filter size={16} />
                                <select
                                    value={filterType}
                                    onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                                >
                                    <option value="">جميع الخدمات</option>
                                    {Object.entries(SERVICE_TYPES).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                                >
                                    <option value="">جميع الحالات</option>
                                    <option value="success">ناجح</option>
                                    <option value="failed">فاشل</option>
                                </select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="wathq-loading">
                                <Loader2 className="spin" size={24} />
                                <span>جاري التحميل...</span>
                            </div>
                        ) : inquiries.length === 0 ? (
                            <div className="wathq-empty">لا توجد استعلامات سابقة</div>
                        ) : (
                            <>
                                <div className="wathq-history-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>الخدمة</th>
                                                <th>النوع</th>
                                                <th>المعاملات</th>
                                                <th>الحالة</th>
                                                <th>التاريخ</th>
                                                <th>إجراء</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {inquiries.map((inq) => (
                                                <tr key={inq.id}>
                                                    <td>{SERVICE_TYPES[inq.service_type] || inq.service_type}</td>
                                                    <td>{ENDPOINT_LABELS[inq.endpoint] || inq.endpoint}</td>
                                                    <td className="wathq-params-cell">
                                                        {Object.entries(inq.query_params)
                                                            .filter(([, v]) => v)
                                                            .map(([k, v]) => `${PARAM_LABELS[k] || k}: ${v}`)
                                                            .join(' | ')}
                                                    </td>
                                                    <td>
                                                        <span className={`wathq-status-badge ${inq.status}`}>
                                                            {inq.status === 'success' ? (
                                                                <><CheckCircle size={14} /> ناجح</>
                                                            ) : (
                                                                <><XCircle size={14} /> فاشل</>
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td>{formatDateTime(inq.created_at)}</td>
                                                    <td>
                                                        <button
                                                            className="wathq-btn-icon"
                                                            onClick={() => viewDetails(inq)}
                                                            title="عرض التفاصيل"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {lastPage > 1 && (
                                    <div className="wathq-pagination">
                                        <button
                                            disabled={page <= 1}
                                            onClick={() => setPage((p) => p - 1)}
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                        <span>
                                            صفحة {page} من {lastPage}
                                        </span>
                                        <button
                                            disabled={page >= lastPage}
                                            onClick={() => setPage((p) => p + 1)}
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// === Settings Modal ===
const WathqSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}> = ({ isOpen, onClose, onSaved }) => {
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [maskedKey, setMaskedKey] = useState('');

    useEffect(() => {
        if (isOpen) {
            setApiKey('');
            setApiSecret('');
            setMessage(null);
            wathqService.getSettingsStatus().then(res => {
                if (res.success) {
                    setMaskedKey(res.data.api_key_masked);
                }
            }).catch(() => {});
        }
    }, [isOpen]);

    const handleSave = async () => {
        if (!apiKey.trim()) {
            setMessage({ type: 'error', text: 'يرجى إدخال مفتاح API' });
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            const res = await wathqService.saveSettings(apiKey.trim(), apiSecret.trim() || undefined);
            if (res.success) {
                setMessage({ type: 'success', text: res.message });
                setApiKey('');
                setApiSecret('');
                onSaved();
                // Refresh masked key
                const status = await wathqService.getSettingsStatus();
                if (status.success) setMaskedKey(status.data.api_key_masked);
            } else {
                setMessage({ type: 'error', text: res.message || 'حدث خطأ' });
            }
        } catch {
            setMessage({ type: 'error', text: 'حدث خطأ أثناء الحفظ' });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="wathq-modal-overlay" onClick={onClose}>
            <div className="wathq-modal wathq-settings-modal" onClick={e => e.stopPropagation()}>
                <div className="wathq-modal-header">
                    <h3><Key size={20} /> إعدادات واثق</h3>
                    <button className="wathq-btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="wathq-modal-body">
                    <p className="wathq-settings-desc">
                        أدخل بيانات حسابك في منصة واثق. يمكنك الحصول عليها من
                        {' '}<a href="https://developer.wathq.sa" target="_blank" rel="noreferrer">developer.wathq.sa</a>
                    </p>

                    {maskedKey && (
                        <div className="wathq-settings-current">
                            <span>المفتاح الحالي:</span>
                            <code>{maskedKey}</code>
                        </div>
                    )}

                    <div className="wathq-settings-form">
                        <div className="wathq-form-group">
                            <label>مفتاح API (apiKey)</label>
                            <input
                                type="text"
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                placeholder="أدخل مفتاح API الجديد"
                                dir="ltr"
                            />
                        </div>
                        <div className="wathq-form-group">
                            <label>الرمز السري (اختياري)</label>
                            <input
                                type="password"
                                value={apiSecret}
                                onChange={e => setApiSecret(e.target.value)}
                                placeholder="أدخل الرمز السري"
                                dir="ltr"
                            />
                        </div>
                    </div>

                    {message && (
                        <div className={`wathq-settings-msg ${message.type}`}>
                            {message.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                            {message.text}
                        </div>
                    )}

                    <button className="wathq-btn-submit wathq-btn-save" onClick={handleSave} disabled={saving || !apiKey.trim()}>
                        {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                        حفظ الإعدادات
                    </button>
                </div>
            </div>
        </div>
    );
};

// === Main Page Component ===
const WathqInquiryPage: React.FC = () => {
    const { user } = useAuth();

    // State
    const [activeGroup, setActiveGroup] = useState<ServiceGroup>('commerce');
    const [activeService, setActiveService] = useState<ServiceType>('commercial_registration');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<Record<string, unknown> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);

    // Check credentials on mount
    useEffect(() => {
        wathqService.getSettingsStatus().then(res => {
            if (res.success) setHasCredentials(res.data.has_credentials);
        }).catch(() => setHasCredentials(false));
    }, []);

    // Form fields
    const [crNumber, setCrNumber] = useState('');
    const [crEndpoint, setCrEndpoint] = useState('fullinfo');
    const [crRelatedId, setCrRelatedId] = useState('');
    const [crRelatedIdType, setCrRelatedIdType] = useState('');
    const [crRelatedEndpoint, setCrRelatedEndpoint] = useState('related');

    const [ccNumber, setCcNumber] = useState('');
    const [ccEndpoint, setCcEndpoint] = useState('info');

    const [attorneyCode, setAttorneyCode] = useState('');
    const [principalId, setPrincipalId] = useState('');
    const [agentId, setAgentId] = useState('');

    const [deedNumber, setDeedNumber] = useState('');
    const [reIdNumber, setReIdNumber] = useState('');
    const [reIdType, setReIdType] = useState('National_ID');

    const [naNumber, setNaNumber] = useState('');
    const [employeeId, setEmployeeId] = useState('');

    // Reset result on service change
    useEffect(() => {
        setResult(null);
        setError(null);
    }, [activeService]);

    // Handle group change
    const handleGroupChange = (group: ServiceGroup) => {
        setActiveGroup(group);
        setActiveService(SERVICE_GROUPS[group].services[0]);
    };

    // Submit inquiry
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);
        setError(null);

        try {
            let res;

            switch (activeService) {
                case 'commercial_registration':
                    res = await wathqService.commercialRegistration(crNumber, crEndpoint);
                    break;
                case 'company_contract':
                    res = await wathqService.companyContract(ccNumber, ccEndpoint);
                    break;
                case 'power_of_attorney':
                    res = await wathqService.attorney(attorneyCode, principalId || undefined, agentId || undefined);
                    break;
                case 'real_estate_deed':
                    res = await wathqService.realEstate(deedNumber, reIdNumber, reIdType);
                    break;
                case 'national_address':
                    res = await wathqService.nationalAddress(naNumber);
                    break;
                case 'employee_data':
                    res = await wathqService.employee(employeeId);
                    break;
            }

            if (res?.success) {
                setResult(res.data as Record<string, unknown>);
            } else {
                setError(res?.error || res?.message || 'فشل الاستعلام');
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'حدث خطأ أثناء الاستعلام';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Submit CR Related
    const handleCrRelatedSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const res = await wathqService.commercialRegistrationRelated(crRelatedId, crRelatedIdType, crRelatedEndpoint);
            if (res?.success) {
                setResult(res.data as Record<string, unknown>);
            } else {
                setError(res?.error || res?.message || 'فشل الاستعلام');
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'حدث خطأ أثناء الاستعلام';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Render form based on active service
    const renderForm = () => {
        switch (activeService) {
            case 'commercial_registration':
                return (
                    <div className="wathq-service-forms">
                        <form onSubmit={handleSubmit} className="wathq-form">
                            <h4>استعلام بالسجل التجاري</h4>
                            <div className="wathq-form-row">
                                <div className="wathq-form-group">
                                    <label>رقم السجل التجاري</label>
                                    <input
                                        type="text"
                                        value={crNumber}
                                        onChange={(e) => setCrNumber(e.target.value)}
                                        placeholder="أدخل رقم السجل التجاري"
                                        required
                                    />
                                </div>
                                <div className="wathq-form-group">
                                    <label>نوع الاستعلام</label>
                                    <select value={crEndpoint} onChange={(e) => setCrEndpoint(e.target.value)}>
                                        {Object.entries(CR_ENDPOINTS).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit" className="wathq-btn-submit" disabled={loading || !crNumber}>
                                    {loading ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
                                    استعلام
                                </button>
                            </div>
                        </form>

                        <form onSubmit={handleCrRelatedSubmit} className="wathq-form wathq-form-secondary">
                            <h4>سجلات مرتبطة / ما يملكه</h4>
                            <div className="wathq-form-row">
                                <div className="wathq-form-group">
                                    <label>رقم الهوية / السجل</label>
                                    <input
                                        type="text"
                                        value={crRelatedId}
                                        onChange={(e) => setCrRelatedId(e.target.value)}
                                        placeholder="أدخل الرقم"
                                        required
                                    />
                                </div>
                                <div className="wathq-form-group">
                                    <label>نوع المعرف</label>
                                    <input
                                        type="text"
                                        value={crRelatedIdType}
                                        onChange={(e) => setCrRelatedIdType(e.target.value)}
                                        placeholder="مثال: nat أو res"
                                        required
                                    />
                                </div>
                                <div className="wathq-form-group">
                                    <label>نوع الاستعلام</label>
                                    <select value={crRelatedEndpoint} onChange={(e) => setCrRelatedEndpoint(e.target.value)}>
                                        <option value="related">سجلات مرتبطة</option>
                                        <option value="owns">ما يملكه</option>
                                    </select>
                                </div>
                                <button type="submit" className="wathq-btn-submit" disabled={loading || !crRelatedId || !crRelatedIdType}>
                                    {loading ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
                                    استعلام
                                </button>
                            </div>
                        </form>
                    </div>
                );

            case 'company_contract':
                return (
                    <form onSubmit={handleSubmit} className="wathq-form">
                        <div className="wathq-form-row">
                            <div className="wathq-form-group">
                                <label>الرقم الوطني للسجل التجاري</label>
                                <input
                                    type="text"
                                    value={ccNumber}
                                    onChange={(e) => setCcNumber(e.target.value)}
                                    placeholder="أدخل الرقم الوطني للسجل"
                                    required
                                />
                            </div>
                            <div className="wathq-form-group">
                                <label>نوع الاستعلام</label>
                                <select value={ccEndpoint} onChange={(e) => setCcEndpoint(e.target.value)}>
                                    {Object.entries(CC_ENDPOINTS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="wathq-btn-submit" disabled={loading || !ccNumber}>
                                {loading ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
                                استعلام
                            </button>
                        </div>
                    </form>
                );

            case 'power_of_attorney':
                return (
                    <form onSubmit={handleSubmit} className="wathq-form">
                        <div className="wathq-form-row">
                            <div className="wathq-form-group">
                                <label>رقم الوكالة</label>
                                <input
                                    type="text"
                                    value={attorneyCode}
                                    onChange={(e) => setAttorneyCode(e.target.value)}
                                    placeholder="أدخل رقم الوكالة"
                                    required
                                />
                            </div>
                            <div className="wathq-form-group">
                                <label>رقم الموكل (اختياري)</label>
                                <input
                                    type="text"
                                    value={principalId}
                                    onChange={(e) => setPrincipalId(e.target.value)}
                                    placeholder="رقم هوية الموكل"
                                />
                            </div>
                            <div className="wathq-form-group">
                                <label>رقم الوكيل (اختياري)</label>
                                <input
                                    type="text"
                                    value={agentId}
                                    onChange={(e) => setAgentId(e.target.value)}
                                    placeholder="رقم هوية الوكيل"
                                />
                            </div>
                            <button type="submit" className="wathq-btn-submit" disabled={loading || !attorneyCode}>
                                {loading ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
                                استعلام
                            </button>
                        </div>
                    </form>
                );

            case 'real_estate_deed':
                return (
                    <form onSubmit={handleSubmit} className="wathq-form">
                        <div className="wathq-form-row">
                            <div className="wathq-form-group">
                                <label>رقم الصك</label>
                                <input
                                    type="text"
                                    value={deedNumber}
                                    onChange={(e) => setDeedNumber(e.target.value)}
                                    placeholder="أدخل رقم الصك"
                                    required
                                />
                            </div>
                            <div className="wathq-form-group">
                                <label>رقم الهوية</label>
                                <input
                                    type="text"
                                    value={reIdNumber}
                                    onChange={(e) => setReIdNumber(e.target.value)}
                                    placeholder="أدخل رقم الهوية"
                                    required
                                />
                            </div>
                            <div className="wathq-form-group">
                                <label>نوع الهوية</label>
                                <select value={reIdType} onChange={(e) => setReIdType(e.target.value)}>
                                    {Object.entries(RE_ID_TYPES).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="wathq-btn-submit" disabled={loading || !deedNumber || !reIdNumber}>
                                {loading ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
                                استعلام
                            </button>
                        </div>
                    </form>
                );

            case 'national_address':
                return (
                    <form onSubmit={handleSubmit} className="wathq-form">
                        <div className="wathq-form-row">
                            <div className="wathq-form-group">
                                <label>رقم السجل التجاري</label>
                                <input
                                    type="text"
                                    value={naNumber}
                                    onChange={(e) => setNaNumber(e.target.value)}
                                    placeholder="أدخل رقم السجل التجاري"
                                    required
                                />
                            </div>
                            <button type="submit" className="wathq-btn-submit" disabled={loading || !naNumber}>
                                {loading ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
                                استعلام
                            </button>
                        </div>
                    </form>
                );

            case 'employee_data':
                return (
                    <form onSubmit={handleSubmit} className="wathq-form">
                        <div className="wathq-form-row">
                            <div className="wathq-form-group">
                                <label>رقم الهوية / الإقامة</label>
                                <input
                                    type="text"
                                    value={employeeId}
                                    onChange={(e) => setEmployeeId(e.target.value)}
                                    placeholder="أدخل رقم الهوية (10 أرقام)"
                                    maxLength={10}
                                    required
                                />
                            </div>
                            <button type="submit" className="wathq-btn-submit" disabled={loading || !employeeId || employeeId.length !== 10}>
                                {loading ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
                                استعلام
                            </button>
                        </div>
                    </form>
                );

            default:
                return null;
        }
    };

    return (
        <div className="wathq-page">
            {/* Header */}
            <div className="wathq-header">
                <div className="wathq-header-title">
                    <Search size={24} />
                    <div>
                        <h1>الاستعلام والتحقق</h1>
                        <p>منصة واثق - خدمات التحقق والاستعلام</p>
                    </div>
                </div>
                <div className="wathq-header-actions">
                    {user && ['admin', 'owner'].includes(user.role) && (
                        <button className="wathq-btn-settings" onClick={() => setSettingsOpen(true)}>
                            <Settings size={18} />
                        </button>
                    )}
                    <button className="wathq-btn-history" onClick={() => setHistoryOpen(true)}>
                        <History size={18} />
                        الاستعلامات السابقة
                    </button>
                </div>
            </div>

            {/* No credentials warning */}
            {hasCredentials === false && (
                <div className="wathq-alert-warning">
                    <AlertTriangle size={18} />
                    <span>لم يتم إعداد بيانات واثق بعد. يرجى إضافة مفتاح API من الإعدادات.</span>
                    {user && ['admin', 'owner'].includes(user.role) && (
                        <button onClick={() => setSettingsOpen(true)}>إعداد الآن</button>
                    )}
                </div>
            )}

            {/* Service Groups */}
            <div className="wathq-groups">
                {(Object.entries(SERVICE_GROUPS) as [ServiceGroup, typeof SERVICE_GROUPS[ServiceGroup]][]).map(
                    ([key, group]) => (
                        <button
                            key={key}
                            className={`wathq-group-btn ${activeGroup === key ? 'active' : ''}`}
                            onClick={() => handleGroupChange(key)}
                        >
                            {group.icon}
                            <span>{group.label}</span>
                        </button>
                    )
                )}
            </div>

            {/* Service Tabs */}
            <div className="wathq-services">
                {SERVICE_GROUPS[activeGroup].services.map((service) => (
                    <button
                        key={service}
                        className={`wathq-service-btn ${activeService === service ? 'active' : ''}`}
                        onClick={() => setActiveService(service)}
                    >
                        {SERVICE_ICONS[service]}
                        <span>{SERVICE_TYPES[service]}</span>
                    </button>
                ))}
            </div>

            {/* Form Section */}
            <div className="wathq-form-section">
                {renderForm()}
            </div>

            {/* Results Section */}
            {(result || error || loading) && (
                <div className="wathq-results-section">
                    <div className="wathq-results-header">
                        <h3>
                            {loading ? (
                                <><Loader2 className="spin" size={18} /> جاري الاستعلام...</>
                            ) : error ? (
                                <><XCircle size={18} /> فشل الاستعلام</>
                            ) : (
                                <><CheckCircle size={18} /> نتيجة الاستعلام</>
                            )}
                        </h3>
                        {result && (
                            <button
                                className="wathq-btn-icon"
                                onClick={() => { setResult(null); setError(null); }}
                                title="مسح النتائج"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="wathq-results-body">
                        {loading && (
                            <div className="wathq-loading">
                                <Loader2 className="spin" size={32} />
                                <p>جاري الاستعلام من واثق...</p>
                            </div>
                        )}
                        {error && (
                            <div className="wathq-error-box">
                                <XCircle size={20} />
                                <p>{error}</p>
                            </div>
                        )}
                        {result && <ResultViewer data={result} />}
                    </div>
                </div>
            )}

            {/* History Modal */}
            <InquiryHistoryModal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
            <WathqSettingsModal
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                onSaved={() => setHasCredentials(true)}
            />
        </div>
    );
};

export default WathqInquiryPage;
