import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Building,
  Gavel,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
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

// ==================== Custom Tooltip ====================

const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  return (
    <div style={{
      background: 'var(--dashboard-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    }}>
      <div style={{ fontWeight: 600, color: 'var(--color-heading)' }}>{data.name}</div>
      <div style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>
        {typeof data.value === 'number' && data.value > 1000
          ? formatAmount(data.value) + ' ر.س'
          : data.value}
      </div>
    </div>
  );
};

// ==================== Detail Modal ==

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
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedRequest, setSelectedRequest] = useState<ExecutionRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search input so we don't refetch on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset page when other filters change
  useEffect(() => { setCurrentPage(1); }, [statusFilter, roleFilter]);

  // Per-filter cache key so each combo has its own snapshot
  const buildCacheKey = (page: number, search: string, status: string, role: string) =>
    `${CACHE_KEY}_${status}_${role}_${search || 'none'}_p${page}`;

  const readCachedPage = (page: number, search: string, status: string, role: string):
    { requests: ExecutionRequest[]; pagination: { currentPage: number; totalPages: number; total: number } } | undefined => {
    try {
      const cached = localStorage.getItem(buildCacheKey(page, search, status, role));
      if (!cached) return undefined;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp >= CACHE_DURATION) return undefined;
      return data;
    } catch { return undefined; }
  };

  // Requests list — re-fetched whenever filters or page change
  const {
    data: queryData,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery<{ requests: ExecutionRequest[]; pagination: { currentPage: number; totalPages: number; total: number } }>({
    queryKey: ['execution-requests', debouncedSearch, statusFilter, roleFilter, currentPage],
    queryFn: async () => {
      const requestsRes = await ExecutionRequestService.getRequests({
        page: currentPage,
        limit: 15,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(roleFilter !== 'all' && { party_role_id: roleFilter }),
      });
      const list = Array.isArray(requestsRes.data) ? requestsRes.data : [];
      return {
        requests: list,
        pagination: {
          currentPage: requestsRes.current_page ?? currentPage,
          totalPages: requestsRes.last_page ?? 1,
          total: requestsRes.total ?? list.length,
        },
      };
    },
    placeholderData: () => readCachedPage(currentPage, debouncedSearch, statusFilter, roleFilter),
    staleTime: 60 * 1000,
    refetchInterval: 90 * 1000,
    refetchIntervalInBackground: false,
  });

  // Stats — kept in its own query so filter/page changes don't reload it
  const { data: stats } = useQuery<ExecutionRequestStats | null>({
    queryKey: ['execution-requests', 'stats'],
    queryFn: () => ExecutionRequestService.getStatistics(),
    staleTime: 5 * 60 * 1000,
  });

  const requests = queryData?.requests ?? [];
  const pagination = queryData?.pagination ?? { currentPage: 1, totalPages: 1, total: 0 };
  const loading = isLoading;
  const refreshing = isFetching && !isLoading;
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'خطأ في جلب البيانات') : null;

  // Persist each filter/page combo to localStorage for instant next visit
  useEffect(() => {
    if (!queryData) return;
    try {
      localStorage.setItem(
        buildCacheKey(currentPage, debouncedSearch, statusFilter, roleFilter),
        JSON.stringify({ data: queryData, timestamp: Date.now() })
      );
    } catch { /* quota — ignore */ }
  }, [queryData, currentPage, debouncedSearch, statusFilter, roleFilter]);

  // Convenience aliases to keep the rest of the component unchanged.
  const fetchData = (page?: number, _forceRefresh = false) => {
    if (page && page !== currentPage) setCurrentPage(page);
    else refetch();
  };

  const handleRefresh = () => { refetch(); };

  const handleViewRequest = (req: ExecutionRequest) => {
    setSelectedRequest(req);
    setIsModalOpen(true);
  };

  // Chart data
  const pieData = useMemo(() => {
    if (!stats?.by_status) return [];
    return stats.by_status.map(s => ({
      name: s.status,
      value: s.count,
      color: getStatusConfig(s.status).color,
    }));
  }, [stats]);

  const barData = useMemo(() => {
    if (!stats?.by_court) return [];
    return stats.by_court.map(c => ({
      name: c.court ? (c.court.length > 20 ? c.court.substring(0, 20) + '...' : c.court) : '-',
      value: Number(c.remaining_total) || 0,
    }));
  }, [stats]);

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

      {/* Stats Cards */}
      {stats && stats.total > 0 && (
        <div className="exec-stats-section">
          <div className="exec-amount-card exec-amount-card--remaining">
            <div className="exec-amount-card__label">إجمالي الأموال قيد التحصيل</div>
            <div className="exec-amount-card__value">{formatAmount(stats.remaining_amount)}</div>
            <div className="exec-amount-card__sub">ريال سعودي</div>
          </div>
          <div className="exec-amount-card exec-amount-card--total">
            <div className="exec-amount-card__label">إجمالي المبالغ المحكوم بها</div>
            <div className="exec-amount-card__value">{formatAmount(stats.total_amount)}</div>
            <div className="exec-amount-card__sub">ريال سعودي</div>
          </div>
          <div className="exec-amount-card exec-amount-card--paid">
            <div className="exec-amount-card__label">المبالغ المحصّلة</div>
            <div className="exec-amount-card__value">{formatAmount(stats.paid_amount)}</div>
            <div className="exec-amount-card__sub">ريال سعودي</div>
          </div>
        </div>
      )}

      {/* Charts */}
      {stats && stats.total > 0 && (pieData.length > 0 || barData.length > 0) && (
        <div className="exec-charts-row">
          {/* Pie Chart - By Status */}
          {pieData.length > 0 && (
            <div className="exec-chart-card">
              <div className="exec-chart-card__title">
                <TrendingUp size={15} />
                توزيع الطلبات حسب الحالة
              </div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      animationDuration={800}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="exec-chart-legend">
                {pieData.map((entry, i) => (
                  <div key={i} className="exec-chart-legend__item">
                    <span className="exec-chart-legend__dot" style={{ background: entry.color }} />
                    {entry.name} ({entry.value})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bar Chart - By Court */}
          {barData.length > 0 && (
            <div className="exec-chart-card">
              <div className="exec-chart-card__title">
                <Building size={15} />
                المبالغ حسب المحاكم (ر.س)
              </div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ right: 10, left: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={150}
                      tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="value"
                      fill="#0A192F"
                      radius={[0, 4, 4, 0]}
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

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
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            استخدم إضافة Chrome لسحب الطلبات من ناجز
          </div>
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
