import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  FileCheck,
  Calendar,
  Clock,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  Briefcase,
  FileText,
  CheckCircle,
  XCircle,
  Timer,
  LayoutGrid,
  List,
  Eye,
  ScrollText,
  Building,
  Users,
} from 'lucide-react';
import { WekalatService } from '../services/wekalatService';
import type { Wekala, WekalaParty, WekalaPermission } from '../types';
import '../styles/wekalat-page.css';

// ==================== Types ====================

type ViewMode = 'table' | 'grid';

// ==================== Status Configuration ====================

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  'معتمدة': { label: 'معتمدة', class: 'wekala-status-badge--approved' },
  'منتهية': { label: 'منتهية', class: 'wekala-status-badge--expired' },
  'مفسوخة': { label: 'مفسوخة', class: 'wekala-status-badge--terminated' },
  'قيد الاعتماد': { label: 'قيد الاعتماد', class: 'wekala-status-badge--pending' },
  'موقوفة': { label: 'موقوفة', class: 'wekala-status-badge--suspended' },
};

// ==================== Helper Functions ====================

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

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'معتمدة':
      return <CheckCircle size={12} />;
    case 'منتهية':
      return <Timer size={12} />;
    case 'مفسوخة':
      return <XCircle size={12} />;
    case 'قيد الاعتماد':
      return <Clock size={12} />;
    case 'موقوفة':
      return <AlertCircle size={12} />;
    default:
      return <FileCheck size={12} />;
  }
};

// ==================== Local Storage Cache ====================

const CACHE_KEY = 'wekalat_data';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// ==================== Permission Accordion Component ====================

interface PermissionAccordionProps {
  permission: WekalaPermission;
  index: number;
}

const PermissionAccordion: React.FC<PermissionAccordionProps> = ({ permission, index }) => {
  const [isOpen, setIsOpen] = useState(false);

  const hasContent = permission.grouped_text || (permission.clauses && permission.clauses.length > 0);

  return (
    <div className={`permission-accordion ${isOpen ? 'permission-accordion--open' : ''}`}>
      <button
        className="permission-accordion__header"
        onClick={() => hasContent && setIsOpen(!isOpen)}
        style={{ cursor: hasContent ? 'pointer' : 'default' }}
      >
        <div className="permission-accordion__title">
          <CheckCircle size={16} />
          <span>{permission.category || `صلاحية ${index + 1}`}</span>
        </div>
        {hasContent && (
          <ChevronLeft
            size={18}
            className={`permission-accordion__arrow ${isOpen ? 'permission-accordion__arrow--open' : ''}`}
          />
        )}
      </button>

      {hasContent && isOpen && (
        <div className="permission-accordion__content">
          {permission.grouped_text && (
            <p className="permission-accordion__text">{permission.grouped_text}</p>
          )}
          {permission.clauses && permission.clauses.length > 0 && (
            <ul className="permission-accordion__clauses">
              {permission.clauses.map((clause, cidx) => (
                <li key={cidx}>{clause}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== Modal Component ====================

interface WekalaModalProps {
  wekala: Wekala | null;
  isOpen: boolean;
  onClose: () => void;
}


const WekalaModal: React.FC<WekalaModalProps> = ({ wekala, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'clients' | 'agents' | 'permissions'>('info');

  if (!wekala || !isOpen) return null;

  const statusConfig = STATUS_CONFIG[wekala.status] || STATUS_CONFIG['معتمدة'];
  const agents = wekala.agents || [];
  const clients = wekala.clients || [];
  const permissions = wekala.permissions || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              <FileCheck size={24} />
              وكالة رقم: {wekala.number}
            </h2>
            {wekala.type && (
              <p className="modal-subtitle">
                <Briefcase size={14} />
                {wekala.type}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`wekala-status-badge ${statusConfig.class}`}>
              <span className="wekala-status-badge__dot" />
              {statusConfig.label}
            </span>
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'info' ? 'modal-tab--active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <FileText size={16} />
            معلومات عامة
          </button>
          <button
            className={`modal-tab ${activeTab === 'clients' ? 'modal-tab--active' : ''}`}
            onClick={() => setActiveTab('clients')}
          >
            <User size={16} />
            الموكلين ({clients.length})
          </button>
          <button
            className={`modal-tab ${activeTab === 'agents' ? 'modal-tab--active' : ''}`}
            onClick={() => setActiveTab('agents')}
          >
            <Shield size={16} />
            الوكلاء ({agents.length})
          </button>
          <button
            className={`modal-tab ${activeTab === 'permissions' ? 'modal-tab--active' : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            <ScrollText size={16} />
            الصلاحيات ({permissions.length})
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {activeTab === 'info' && (
            <div className="modal-info-grid">
              <div className="modal-info-card">
                <Calendar size={18} className="modal-info-card__icon" />
                <div>
                  <div className="modal-info-card__label">تاريخ الإصدار</div>
                  <div className="modal-info-card__value">
                    {wekala.issue_date_hijri || formatDate(wekala.issue_date)}
                  </div>
                </div>
              </div>
              <div className="modal-info-card">
                <Clock size={18} className="modal-info-card__icon" />
                <div>
                  <div className="modal-info-card__label">تاريخ الانتهاء</div>
                  <div className="modal-info-card__value">
                    {wekala.expiry_date_hijri || formatDate(wekala.expiry_date)}
                  </div>
                </div>
              </div>
              {wekala.issue_location && (
                <div className="modal-info-card">
                  <Building size={18} className="modal-info-card__icon" />
                  <div>
                    <div className="modal-info-card__label">مكان الإصدار</div>
                    <div className="modal-info-card__value">{wekala.issue_location}</div>
                  </div>
                </div>
              )}
              <div className="modal-info-card">
                <Users size={18} className="modal-info-card__icon" />
                <div>
                  <div className="modal-info-card__label">عدد الأطراف</div>
                  <div className="modal-info-card__value">{clients.length + agents.length} طرف</div>
                </div>
              </div>

              {wekala.agency_text && (
                <div className="modal-info-text" style={{ gridColumn: '1 / -1' }}>
                  <h4><ScrollText size={16} /> نص الوكالة</h4>
                  <p>{wekala.agency_text}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="modal-party-list">
              {clients.length === 0 ? (
                <div className="modal-empty">لا يوجد موكلين</div>
              ) : (
                clients.map((client, idx) => (
                  <div key={idx} className="modal-party-card modal-party-card--client">
                    <div className="modal-party-card__icon">
                      <User size={18} />
                    </div>
                    <div>
                      <div className="modal-party-card__name">{client.name}</div>
                      {(client as any).national_id && (
                        <div className="modal-party-card__id">هوية: {(client as any).national_id}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="modal-party-list">
              {agents.length === 0 ? (
                <div className="modal-empty">لا يوجد وكلاء</div>
              ) : (
                agents.map((agent, idx) => (
                  <div key={idx} className="modal-party-card modal-party-card--agent">
                    <div className="modal-party-card__icon">
                      <Shield size={18} />
                    </div>
                    <div>
                      <div className="modal-party-card__name">{agent.name}</div>
                      {agent.adjective && (
                        <div className="modal-party-card__role">{agent.adjective}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="modal-permissions-list">
              {permissions.length === 0 ? (
                <div className="modal-empty">لا توجد صلاحيات</div>
              ) : (
                permissions.map((permission, idx) => (
                  <PermissionAccordion key={idx} permission={permission} index={idx} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== Main Component ====================

const Wekalat: React.FC = () => {
  // State with local storage initialization
  const [wekalat, setWekalat] = useState<Wekala[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data.wekalat || [];
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

  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('معتمدة');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedWekala, setSelectedWekala] = useState<Wekala | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [pagination, setPagination] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION && data.pagination) {
          return data.pagination;
        }
      }
    } catch (e) { }
    return { currentPage: 1, totalPages: 1, total: 0 };
  });

  // Stats
  const stats = useMemo(() => ({
    approved: wekalat.filter(w => w.status === 'معتمدة').length,
    expired: wekalat.filter(w => w.status === 'منتهية').length,
    pending: wekalat.filter(w => w.status === 'قيد الاعتماد').length,
    total: pagination.total
  }), [wekalat, pagination.total]);

  // Fetch data
  const fetchWekalat = async (page = 1, forceRefresh = false) => {
    try {
      // Check cache first - ONLY if default filter and no search
      if (!forceRefresh && !searchTerm && statusFilter === 'معتمدة') {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION && data.wekalat?.length > 0) {
            setWekalat(data.wekalat);
            setPagination(data.pagination);
            setLoading(false);
            return;
          }
        }
      }

      setLoading(true);
      setError(null);

      const response = await WekalatService.getWekalat({
        page,
        limit: 15,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const data = Array.isArray(response.data) ? response.data : [];
      const paginationData = {
        currentPage: response.current_page ?? page,
        totalPages: response.last_page ?? 1,
        total: response.total ?? data.length
      };

      setWekalat(data);
      setPagination(paginationData);

      // Save to cache (only if default filter - all approved)
      if (!searchTerm && statusFilter === 'معتمدة') {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: { wekalat: data, pagination: paginationData },
          timestamp: Date.now()
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في جلب الوكالات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if no cached data exists
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION && data.wekalat?.length > 0) {
          // Cache is valid, data already loaded in initial state
          return;
        }
      } catch (e) { }
    }
    // No valid cache, fetch fresh data
    fetchWekalat(1, true);
  }, []);

  useEffect(() => {
    // Only refetch on filter changes if they actually changed
    if (searchTerm || statusFilter !== 'معتمدة') {
      const timeout = setTimeout(() => fetchWekalat(1, true), 400);
      return () => clearTimeout(timeout);
    }
  }, [searchTerm, statusFilter]);

  // Client-side filtered data (as fallback if API doesn't filter)
  const filteredWekalat = useMemo(() => {
    let result = wekalat;

    // Filter by status
    if (statusFilter && statusFilter !== 'all') {
      result = result.filter(w => w.status === statusFilter);
    }

    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(w =>
        w.number?.toLowerCase().includes(term) ||
        w.type?.toLowerCase().includes(term) ||
        w.clients?.some(c => c.name?.toLowerCase().includes(term)) ||
        w.agents?.some(a => a.name?.toLowerCase().includes(term))
      );
    }

    return result;
  }, [wekalat, statusFilter, searchTerm]);

  const handleViewWekala = (wekala: Wekala) => {
    setSelectedWekala(wekala);
    setIsModalOpen(true);
  };

  // ==================== Render Table ====================
  const renderTable = () => (
    <div className="wekalat-table-wrapper">
      <table className="wekalat-table">
        <thead>
          <tr>
            <th>رقم الوكالة</th>
            <th>النوع</th>
            <th>الحالة</th>
            <th>الموكلين</th>
            <th>الوكلاء</th>
            <th>تاريخ الإصدار</th>
            <th>تاريخ الانتهاء</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredWekalat.map(w => {
            const statusConfig = STATUS_CONFIG[w.status] || STATUS_CONFIG['معتمدة'];
            const clients = w.clients || [];
            const agents = w.agents || [];

            return (
              <tr key={w.id} onClick={() => handleViewWekala(w)}>
                <td>
                  <div className="wekala-number">{w.number}</div>
                </td>
                <td>
                  <span className="wekala-type">{w.type || '-'}</span>
                </td>
                <td>
                  <span className={`wekala-status-badge ${statusConfig.class}`}>
                    <span className="wekala-status-badge__dot" />
                    {statusConfig.label}
                  </span>
                </td>
                <td>
                  <div className="wekala-parties">
                    {clients.slice(0, 2).map((c, idx) => (
                      <span key={idx} className="wekala-party-tag wekala-party-tag--client">
                        {c.name}
                      </span>
                    ))}
                    {clients.length > 2 && (
                      <span className="wekala-party-tag">+{clients.length - 2}</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="wekala-parties">
                    {agents.slice(0, 2).map((a, idx) => (
                      <span key={idx} className="wekala-party-tag wekala-party-tag--agent">
                        {a.name}
                      </span>
                    ))}
                    {agents.length > 2 && (
                      <span className="wekala-party-tag">+{agents.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="wekala-date-cell">
                  {w.issue_date_hijri || formatDate(w.issue_date)}
                </td>
                <td className="wekala-date-cell">
                  {w.expiry_date_hijri || formatDate(w.expiry_date)}
                </td>
                <td>
                  <div className="wekala-actions-cell">
                    <button
                      className="wekala-action-btn"
                      onClick={(e) => { e.stopPropagation(); handleViewWekala(w); }}
                      title="عرض"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ==================== Render Grid ====================
  const renderGrid = () => (
    <div className="wekalat-grid">
      {filteredWekalat.map(w => {
        const statusConfig = STATUS_CONFIG[w.status] || STATUS_CONFIG['معتمدة'];
        const clients = w.clients || [];
        const agents = w.agents || [];

        return (
          <div key={w.id} className="wekala-card" onClick={() => handleViewWekala(w)}>
            <div
              className="wekala-card__stripe"
              style={{
                background: w.status === 'معتمدة' ? 'var(--status-green)' :
                  w.status === 'منتهية' ? 'var(--status-orange)' :
                    w.status === 'مفسوخة' ? 'var(--status-red)' :
                      'var(--status-blue)'
              }}
            />

            <div className="wekala-card__header">
              <div>
                <div className="wekala-card__title">
                  <FileCheck size={16} />
                  {w.number}
                </div>
                {w.type && <div className="wekala-card__type">{w.type}</div>}
              </div>
              <span className={`wekala-status-badge ${statusConfig.class}`}>
                <span className="wekala-status-badge__dot" />
                {statusConfig.label}
              </span>
            </div>

            {clients.length > 0 && (
              <div className="wekala-card__party-group wekala-card__party-group--clients">
                <div className="wekala-card__party-label">
                  <User size={12} /> الموكلين ({clients.length})
                </div>
                <div className="wekala-card__party-list">
                  {clients.slice(0, 2).map((c, idx) => (
                    <span key={idx} className="wekala-card__party-name">{c.name}</span>
                  ))}
                  {clients.length > 2 && <span>+{clients.length - 2}</span>}
                </div>
              </div>
            )}

            {agents.length > 0 && (
              <div className="wekala-card__party-group wekala-card__party-group--agents">
                <div className="wekala-card__party-label">
                  <Shield size={12} /> الوكلاء ({agents.length})
                </div>
                <div className="wekala-card__party-list">
                  {agents.slice(0, 2).map((a, idx) => (
                    <span key={idx} className="wekala-card__party-name">{a.name}</span>
                  ))}
                  {agents.length > 2 && <span>+{agents.length - 2}</span>}
                </div>
              </div>
            )}

            <div className="wekala-card__footer">
              <span className="wekala-card__date">
                <Calendar size={12} />
                {w.issue_date_hijri || formatDate(w.issue_date)}
              </span>
              <span className="wekala-card__date">
                <Clock size={12} />
                {w.expiry_date_hijri || formatDate(w.expiry_date)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ==================== Main Render ====================
  return (
    <div className="wekalat-page">
      {/* Header Bar */}
      <header className="wekalat-header-bar">
        {/* Start: Title + Stats */}
        <div className="wekalat-header-bar__start">
          <div className="wekalat-header-bar__title">
            <FileCheck size={20} />
            <span>الوكالات</span>
            <span className="wekalat-header-bar__count">{stats.total}</span>
          </div>
          <div className="wekalat-header-bar__stats">
            <span className="wekala-stat-pill wekala-stat-pill--approved">
              <span className="wekala-stat-pill__dot" />
              {stats.approved} معتمدة
            </span>
            <span className="wekala-stat-pill wekala-stat-pill--expired">
              <span className="wekala-stat-pill__dot" />
              {stats.expired} منتهية
            </span>
            <span className="wekala-stat-pill wekala-stat-pill--pending">
              <span className="wekala-stat-pill__dot" />
              {stats.pending} قيد الاعتماد
            </span>
          </div>
        </div>

        {/* Center: Search + Filters */}
        <div className="wekalat-header-bar__center">
          <div className="wekalat-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="بحث في الوكالات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="wekalat-search-box__clear">
                <X size={14} />
              </button>
            )}
          </div>

          <select
            className="wekalat-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">كل الحالات</option>
            <option value="معتمدة">معتمدة</option>
            <option value="منتهية">منتهية</option>
            <option value="مفسوخة">مفسوخة</option>
            <option value="قيد الاعتماد">قيد الاعتماد</option>
            <option value="موقوفة">موقوفة</option>
          </select>

          <button
            className="wekalat-icon-btn"
            onClick={() => fetchWekalat(pagination.currentPage, true)}
            title="تحديث"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* End: View Switcher */}
        <div className="wekalat-header-bar__end">
          <div className="wekalat-view-tabs">
            <button
              className={`wekalat-view-tab ${viewMode === 'table' ? 'wekalat-view-tab--active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <List size={16} />
            </button>
            <button
              className={`wekalat-view-tab ${viewMode === 'grid' ? 'wekalat-view-tab--active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      {loading ? (
        <div className="wekalat-loading">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="wekalat-skeleton-row" />)}
        </div>
      ) : error ? (
        <div className="wekalat-empty">
          <AlertCircle size={48} className="wekalat-empty__icon" />
          <div className="wekalat-empty__title">حدث خطأ</div>
          <div className="wekalat-empty__desc">{error}</div>
          <button className="btn-primary" onClick={() => fetchWekalat(pagination.currentPage, true)}>
            إعادة المحاولة
          </button>
        </div>
      ) : filteredWekalat.length === 0 ? (
        <div className="wekalat-empty">
          <FileCheck size={48} className="wekalat-empty__icon" />
          <div className="wekalat-empty__title">لا توجد وكالات</div>
          <div className="wekalat-empty__desc">
            {statusFilter !== 'all' ? 'جرّب تعديل معايير البحث' : 'استخدم إضافة ناجز لاستيراد الوكالات'}
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'table' && renderTable()}
          {viewMode === 'grid' && renderGrid()}
        </>
      )}

      {/* Pagination */}
      {!loading && filteredWekalat.length > 0 && (
        <div className="wekalat-pagination">
          <div className="wekalat-pagination__info">
            {filteredWekalat.length} وكالة • صفحة {pagination.currentPage} من {pagination.totalPages}
          </div>
          <div className="wekalat-pagination__controls">
            <button
              className="wekalat-pagination-btn"
              onClick={() => fetchWekalat(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
            >
              <ChevronRight size={14} /> السابق
            </button>
            <div className="wekalat-pagination-pages">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`wekalat-pagination-page ${page === pagination.currentPage ? 'wekalat-pagination-page--active' : ''}`}
                  onClick={() => fetchWekalat(page)}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              className="wekalat-pagination-btn"
              onClick={() => fetchWekalat(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
            >
              التالي <ChevronLeft size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      <WekalaModal
        wekala={selectedWekala}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedWekala(null);
        }}
      />

      {/* Animation Styles */}
      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Wekalat;
