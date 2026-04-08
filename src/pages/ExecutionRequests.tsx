import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Scale,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  FileText,
  Clock,
  LayoutGrid,
  List,
  Eye,
  Banknote,
  Gavel,
  AlertCircle,
} from 'lucide-react';
import { ExecutionRequestService } from '../services/executionRequestService';
import type { ExecutionRequest, ExecutionRequestStats } from '../types';
import '../styles/execution-requests-page.css';

// ==================== Status Config ====================

const STATUS_CONFIG: Record<string, { label: string; class: string; color: string }> = {
  'قيد التنفيذ': { label: 'قيد التنفيذ', class: 'exec-status-badge--active', color: '#1b998b' },
  'جارٍ التنفيذ': { label: 'جارٍ التنفيذ', class: 'exec-status-badge--active', color: '#1b998b' },
  'منفذ': { label: 'منفذ', class: 'exec-status-badge--completed', color: '#0A192F' },
  'منتهي': { label: 'منتهي', class: 'exec-status-badge--completed', color: '#0A192F' },
  'موقوف': { label: 'موقوف', class: 'exec-status-badge--stopped', color: '#d97706' },
  'متعثر': { label: 'متعثر', class: 'exec-status-badge--stopped', color: '#d97706' },
  'ملغى': { label: 'ملغى', class: 'exec-status-badge--cancelled', color: '#dc2626' },
  'مرفوض': { label: 'مرفوض', class: 'exec-status-badge--cancelled', color: '#dc2626' },
};

const getStatusConfig = (status: string) =>
  STATUS_CONFIG[status] || { label: status, class: 'exec-status-badge--default', color: '#94a3b8' };

const PARTY_ROLES: Record<string, string> = {
  'all': 'الكل',
  '1': 'طلب شخصي',
  '2': 'طلب ضدي',
  '3': 'وكيل طالب تنفيذ',
  '6': 'وكيل منفذ ضده',
};

// ==================== Helpers ====================

const formatAmount = (amount?: number | null): string => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('ar-SA', {
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (value?: string | null): string => {
  if (!value) return '-';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return value;
  }
};

// ==================== Cache ====================

const CACHE_KEY = 'execution_requests_data';
const CACHE_DURATION = 60 * 60 * 1000;


// ==================== Detail Modal ====================

interface DetailModalProps {
  request: ExecutionRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ request, isOpen, onClose }) => {
  if (!request || !isOpen) return null;

  const statusConfig = getStatusConfig(request.status);
  const parties = Array.isArray(request.parties) ? request.parties : [];
  const decisions = Array.isArray(request.decisions) ? request.decisions : [];
  const steps = Array.isArray(request.steps) ? request.steps : [];

  const getPartyDotClass = (role: string) => {
    if (role.includes('طالب') || role.includes('دائن') || role.includes('creditor')) return 'exec-party-dot--creditor';
    if (role.includes('ضده') || role.includes('مدين') || role.includes('debtor')) return 'exec-party-dot--debtor';
    return 'exec-party-dot--attorney';
  };

  return (
    <div className="exec-overlay" onClick={onClose}>
      <div className="exec-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="exec-modal__header">
          <Scale size={18} className="exec-modal__header-icon" />
          <span className="exec-modal__num">{request.request_number}</span>
          <div className="exec-modal__spacer" />
          <span className={`exec-status-badge ${statusConfig.class}`}>
            <span className="exec-status-badge__dot" />
            {statusConfig.label}
          </span>
          <button className="exec-modal__close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="exec-modal__body">
          {/* Basic Info */}
          <table className="exec-info-table">
            <tbody>
              <tr>
                <td className="exec-info-table__label">الصفة في الطلب</td>
                <td>{request.party_role || '-'}</td>
                <td className="exec-info-table__label">نوع السند</td>
                <td>{request.main_document_type || '-'}</td>
              </tr>
              <tr>
                <td className="exec-info-table__label">السند الفرعي</td>
                <td>{request.sub_document_type || '-'}</td>
                <td className="exec-info-table__label">تاريخ التقديم</td>
                <td>{request.filing_date_hijri || formatDate(request.filing_date_gregorian)}</td>
              </tr>
              <tr>
                <td className="exec-info-table__label">المحكمة</td>
                <td>{request.court || '-'}</td>
                <td className="exec-info-table__label">الدائرة</td>
                <td>{request.department || '-'}</td>
              </tr>
            </tbody>
          </table>

          {/* Financial */}
          <div className="exec-financial-grid">
            <div className="exec-financial-item">
              <div className="exec-financial-item__label">المبلغ الإجمالي</div>
              <div className="exec-financial-item__value">{formatAmount(request.total_amount)}</div>
            </div>
            <div className="exec-financial-item">
              <div className="exec-financial-item__label">المبلغ المستلم</div>
              <div className="exec-financial-item__value" style={{ color: 'var(--status-green)' }}>
                {formatAmount(request.paid_amount)}
              </div>
            </div>
            <div className="exec-financial-item">
              <div className="exec-financial-item__label">المبلغ المتبقي</div>
              <div className="exec-financial-item__value" style={{ color: 'var(--status-red)' }}>
                {formatAmount(request.remaining_amount)}
              </div>
            </div>
          </div>

          {/* Parties */}
          {parties.length > 0 && (
            <div className="exec-section">
              <div className="exec-section__head">
                <Users size={14} /> بيانات الأطراف
                <span className="exec-section__badge">{parties.length}</span>
              </div>
              <div className="exec-section__body">
                {parties.map((p, i) => (
                  <div key={i} className="exec-party-row">
                    <span className={`exec-party-dot ${getPartyDotClass(p.role || '')}`} />
                    <div className="exec-party-row__info">
                      <div className="exec-party-row__name">{p.name || '-'}</div>
                      <div className="exec-party-row__role">
                        {p.role}{p.id_number ? ` - ${p.id_number}` : ''}
                        {p.nationality ? ` (${p.nationality})` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decisions */}
          {decisions.length > 0 && (
            <div className="exec-section">
              <div className="exec-section__head">
                <Gavel size={14} /> القرارات
                <span className="exec-section__badge">{decisions.length}</span>
              </div>
              <div className="exec-section__body">
                {decisions.map((d: any, i: number) => (
                  <div key={i} className="exec-party-row">
                    <span className="exec-party-dot exec-party-dot--attorney" />
                    <div className="exec-party-row__info">
                      <div className="exec-party-row__name">
                        {d.decisionNumber || d.number || `قرار ${i + 1}`}
                      </div>
                      <div className="exec-party-row__role">
                        {d.status || d.statusName || '-'}
                        {d.issueDate ? ` - ${d.issueDate}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Steps / Timeline */}
          {steps.length > 0 && (
            <div className="exec-section">
              <div className="exec-section__head">
                <Clock size={14} /> مراحل الطلب
              </div>
              <div className="exec-section__body">
                <div className="exec-timeline">
                  {steps.map((s: any, i: number) => (
                    <div key={i} className="exec-timeline__item">
                      <div className="exec-timeline__dot" />
                      <div className="exec-timeline__title">
                        {s.stepName || s.name || s.title || `مرحلة ${i + 1}`}
                      </div>
                      <div className="exec-timeline__date">
                        {s.stepDate || s.date || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== Main Component ====================

const ExecutionRequests: React.FC = () => {
  const [requests, setRequests] = useState<ExecutionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedRequest, setSelectedRequest] = useState<ExecutionRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState<ExecutionRequestStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
  });

  // Fetch data
  const fetchData = async (page = 1, forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const [requestsRes, statsRes] = await Promise.all([
        ExecutionRequestService.getRequests({
          page,
          limit: 15,
          ...(searchTerm && { search: searchTerm }),
          ...(statusFilter !== 'all' && { status: statusFilter }),
          ...(roleFilter !== 'all' && { party_role_id: roleFilter }),
        }),
        ExecutionRequestService.getStatistics(),
      ]);

      const data = Array.isArray(requestsRes.data) ? requestsRes.data : [];
      setRequests(data);
      setPagination({
        currentPage: requestsRes.current_page ?? page,
        totalPages: requestsRes.last_page ?? 1,
        total: requestsRes.total ?? data.length,
      });
      setStats(statsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في جلب البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchData(1), 400);
    return () => clearTimeout(timeout);
  }, [searchTerm, statusFilter, roleFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(1, true);
  };

  const handleViewRequest = (req: ExecutionRequest) => {
    setSelectedRequest(req);
    setIsModalOpen(true);
  };

  // Unique statuses for filter
  const uniqueStatuses = useMemo(() => {
    if (!stats?.by_status) return [];
    return stats.by_status.map(s => s.status);
  }, [stats]);

  // ==================== Render ====================

  return (
    <div className="exec-page">
      {/* Header */}
      <div className="exec-header-bar">
        <div className="exec-header-bar__start">
          <div className="exec-header-bar__title">
            <Scale size={20} />
            <span>طلبات التنفيذ</span>
            <span className="exec-header-bar__count">{pagination.total}</span>
          </div>
        </div>

        <div className="exec-header-bar__end">
          {/* Search */}
          <div className="exec-search">
            <Search size={15} className="exec-search__icon" />
            <input
              className="exec-search__input"
              placeholder="بحث بالرقم، المحكمة، الأطراف..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <select
            className="exec-filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">كل الحالات</option>
            {uniqueStatuses.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Role filter */}
          <select
            className="exec-filter-select"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            {Object.entries(PARTY_ROLES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {/* View toggle */}
          <div className="exec-view-toggle">
            <button
              className={`exec-view-toggle__btn ${viewMode === 'table' ? 'exec-view-toggle__btn--active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <List size={16} />
            </button>
            <button
              className={`exec-view-toggle__btn ${viewMode === 'grid' ? 'exec-view-toggle__btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          {/* Refresh */}
          <button
            className={`exec-refresh-btn ${refreshing ? 'exec-refresh-btn--spinning' : ''}`}
            onClick={handleRefresh}
            title="تحديث"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="exec-loading">
          <div className="exec-spinner" />
        </div>
      ) : error ? (
        <div className="exec-empty">
          <AlertCircle size={40} className="exec-empty__icon" />
          <div className="exec-empty__text">{error}</div>
          <button className="exec-refresh-btn" onClick={handleRefresh}>
            <RefreshCw size={14} /> إعادة المحاولة
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="exec-empty">
          <Scale size={48} className="exec-empty__icon" />
          <div className="exec-empty__text">لا توجد طلبات تنفيذ</div>
        </div>
      ) : (
        <>
          {/* Table View */}
          <div className="exec-table-wrapper">
            <table className="exec-table">
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>الصفة</th>
                  <th>نوع السند</th>
                  <th>المحكمة</th>
                  <th>الحالة</th>
                  <th>المبلغ الإجمالي</th>
                  <th>المتبقي</th>
                  <th>الأطراف</th>
                  <th>التاريخ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => {
                  const sc = getStatusConfig(req.status);
                  const creditor = req.parties?.find(p =>
                    p.role?.includes('طالب') || p.role?.includes('دائن')
                  );
                  const debtor = req.parties?.find(p =>
                    p.role?.includes('ضده') || p.role?.includes('مدين')
                  );

                  return (
                    <tr key={req.id} onClick={() => handleViewRequest(req)}>
                      <td>
                        <span className="exec-req-number">{req.request_number}</span>
                      </td>
                      <td>
                        <span className="exec-role-badge">{req.party_role || '-'}</span>
                      </td>
                      <td>{req.main_document_type || '-'}</td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {req.court || '-'}
                      </td>
                      <td>
                        <span className={`exec-status-badge ${sc.class}`}>
                          <span className="exec-status-badge__dot" />
                          {sc.label}
                        </span>
                      </td>
                      <td>
                        <span className="exec-amount">{formatAmount(req.total_amount)}</span>
                      </td>
                      <td>
                        <span className="exec-amount" style={{
                          color: req.remaining_amount && req.remaining_amount > 0 ? 'var(--status-red)' : undefined
                        }}>
                          {formatAmount(req.remaining_amount)}
                        </span>
                      </td>
                      <td>
                        {creditor && (
                          <div className="exec-party-name">
                            <span className="exec-party-label">الدائن</span>
                            {creditor.name}
                          </div>
                        )}
                        {debtor && (
                          <div className="exec-party-name">
                            <span className="exec-party-label">المدين</span>
                            {debtor.name}
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                        {req.filing_date_hijri || formatDate(req.filing_date_gregorian)}
                      </td>
                      <td>
                        <button
                          className="exec-refresh-btn"
                          style={{ padding: 5, border: 'none' }}
                          onClick={e => {
                            e.stopPropagation();
                            handleViewRequest(req);
                          }}
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="exec-pagination">
              <button
                className="exec-pagination__btn"
                disabled={pagination.currentPage <= 1}
                onClick={() => fetchData(pagination.currentPage - 1)}
              >
                <ChevronRight size={14} /> السابق
              </button>
              <span className="exec-pagination__info">
                {pagination.currentPage} من {pagination.totalPages}
              </span>
              <button
                className="exec-pagination__btn"
                disabled={pagination.currentPage >= pagination.totalPages}
                onClick={() => fetchData(pagination.currentPage + 1)}
              >
                التالي <ChevronLeft size={14} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <DetailModal
        request={selectedRequest}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRequest(null);
        }}
      />
    </div>
  );
};

export default ExecutionRequests;
