import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Settings,
} from 'lucide-react';
import { WekalatService } from '../services/wekalatService';
import { CaseWekalaService, type WekalaCaseItem } from '../services/caseWekalaService';
import { AddWekalaModal } from '../components/AddWekalaModal';
import { useAuth } from '../contexts/AuthContext';
import { Link as RouterLink } from 'react-router-dom';
import type { Wekala, WekalaParty, WekalaPermission } from '../types';
import '../styles/wekalat-page.css';
import '../styles/add-wekala-modal.css';
import '../styles/case-wekalat-panel.css';

// ==================== Types ====================

type ViewMode = 'table' | 'grid';

// ==================== Status Configuration ====================

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  'معتمدة': { label: 'معتمدة', class: 'wekala-status-badge--approved' },
  'منتهية': { label: 'منتهية', class: 'wekala-status-badge--expired' },
  'مفسوخة': { label: 'مفسوخة', class: 'wekala-status-badge--terminated' },
  'مفسوخة كلياً': { label: 'مفسوخة كلياً', class: 'wekala-status-badge--terminated' },
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


// Remaining days helper - tries multiple date field names
function getRemainingDays(wekala: Wekala): { text: string; urgent: boolean; expired: boolean } | null {
  // Try all possible date fields
  const dateStr = (wekala as any).expiry_date_gregorian || wekala.expiry_date || null;
  if (!dateStr) return null;
  try {
    const exp = new Date(dateStr);
    if (isNaN(exp.getTime())) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: `منتهية منذ ${Math.abs(diff)} يوم`, urgent: true, expired: true };
    if (diff === 0) return { text: 'تنتهي اليوم', urgent: true, expired: false };
    if (diff <= 30) return { text: `${diff} يوم متبقي`, urgent: true, expired: false };
    if (diff <= 90) return { text: `${diff} يوم متبقي`, urgent: false, expired: false };
    return { text: `${diff} يوم متبقي`, urgent: false, expired: false };
  } catch { return null; }
}

export const WekalaModal: React.FC<WekalaModalProps> = ({ wekala, isOpen, onClose }) => {
  const [showLinkedCases, setShowLinkedCases] = useState(false);
  const [linkedCases, setLinkedCases] = useState<WekalaCaseItem[]>([]);
  const [linkedCasesLoading, setLinkedCasesLoading] = useState(false);

  // Lazy load: لا نجلب القضايا إلا عند الضغط على الزر
  const openLinkedCases = () => {
    if (!wekala) return;
    setShowLinkedCases(true);
    if (linkedCases.length === 0) {
      setLinkedCasesLoading(true);
      CaseWekalaService.casesForWekala(wekala.id)
        .then(items => setLinkedCases(items))
        .catch(() => setLinkedCases([]))
        .finally(() => setLinkedCasesLoading(false));
    }
  };

  // إعادة تعيين عند تغيير الوكالة
  useEffect(() => {
    setShowLinkedCases(false);
    setLinkedCases([]);
  }, [wekala?.id]);

  if (!wekala || !isOpen) return null;

  const statusConfig = STATUS_CONFIG[wekala.status] || STATUS_CONFIG['معتمدة'];
  const agents = wekala.agents || [];
  const clients = wekala.clients || [];
  const permissions = wekala.permissions || [];
  const remaining = getRemainingDays(wekala);

  return (
    <div className="wk-overlay" onClick={onClose}>
      <div className="wk-modal" onClick={e => e.stopPropagation()}>
        {/* Compact Header */}
        <div className="wk-header">
          <FileCheck size={16} className="wk-header__icon" />
          <span className="wk-header__num">{wekala.number}</span>
          {wekala.type && <span className="wk-header__type">{wekala.type}</span>}
          <div className="wk-header__spacer" />
          <span className={`wekala-status-badge ${statusConfig.class}`}>
            <span className="wekala-status-badge__dot" />{statusConfig.label}
          </span>
          {(wekala as any).source === 'manual' && (
            <span className="wekala-source-badge wekala-source-badge--manual">يدوية</span>
          )}
          {remaining && (
            <span className={`wk-remaining ${remaining.expired ? 'wk-remaining--expired' : ''} ${remaining.urgent && !remaining.expired ? 'wk-remaining--urgent' : ''}`}>
              <Clock size={11} />{remaining.text}
            </span>
          )}
          <button
            type="button"
            onClick={openLinkedCases}
            title="عرض القضايا المرتبطة"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 9px', marginInlineStart: 6,
              fontSize: 11, fontWeight: 600,
              background: 'var(--law-navy-light, rgba(30,58,95,.08))',
              color: 'var(--law-navy)',
              border: '1px solid var(--color-border)',
              borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Briefcase size={11} /> القضايا المرتبطة
          </button>
          <button className="wk-close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Body */}
        <div className="wk-body">
          {/* Dense property table */}
          <table className="wk-table">
            <tbody>
              <tr>
                <td className="wk-table__label">تاريخ الإصدار</td>
                <td>{wekala.issue_date_hijri || formatDate((wekala as any).issue_date_gregorian || wekala.issue_date)}</td>
                <td className="wk-table__label">تاريخ الانتهاء</td>
                <td>
                  {wekala.expiry_date_hijri || formatDate((wekala as any).expiry_date_gregorian || wekala.expiry_date)}
                </td>
              </tr>
              {wekala.issue_location && (
                <tr>
                  <td className="wk-table__label">مكان الإصدار</td>
                  <td colSpan={3}>{wekala.issue_location}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* 3-column grid: Clients | Agents | Permissions */}
          <div className="wk-grid3">
            {/* Clients */}
            <div className="wk-panel">
              <div className="wk-panel__head">
                <User size={13} /> الموكلين
                <span className="wk-badge">{clients.length}</span>
              </div>
              <div className="wk-panel__body">
                {clients.length === 0 ? (
                  <div className="wk-panel__empty">-</div>
                ) : clients.map((c, i) => (
                  <div key={i} className="wk-row">
                    <span className="wk-dot wk-dot--blue" />
                    <span className="wk-row__name">{c.name}</span>
                    {(c as any).national_id && <span className="wk-row__sub">{(c as any).national_id}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Agents */}
            <div className="wk-panel">
              <div className="wk-panel__head">
                <Shield size={13} /> الوكلاء
                <span className="wk-badge">{agents.length}</span>
              </div>
              <div className="wk-panel__body">
                {agents.length === 0 ? (
                  <div className="wk-panel__empty">-</div>
                ) : agents.map((a, i) => (
                  <div key={i} className="wk-row">
                    <span className="wk-dot wk-dot--green" />
                    <span className="wk-row__name">{a.name}</span>
                    {a.adjective && <span className="wk-row__sub">{a.adjective}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div className="wk-panel">
              <div className="wk-panel__head">
                <CheckCircle size={13} /> الصلاحيات
                <span className="wk-badge">{permissions.length}</span>
              </div>
              <div className="wk-panel__body">
                {permissions.length === 0 ? (
                  <div className="wk-panel__empty">-</div>
                ) : permissions.map((p, i) => (
                  <PermissionAccordion key={i} permission={p} index={i} />
                ))}
              </div>
            </div>
          </div>

          {/* Agency text */}
          {wekala.agency_text && (
            <div className="wk-text-section">
              <div className="wk-panel__head"><ScrollText size={13} /> نص الوكالة</div>
              <p className="wk-text-block">{wekala.agency_text}</p>
            </div>
          )}
        </div>
      </div>

      {/* Linked cases — overlay منفصل فوق المودال */}
      {showLinkedCases && (
        <div
          className="wk-overlay"
          style={{ zIndex: 1100, background: 'rgba(0,0,0,0.35)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLinkedCases(false); }}
        >
          <div className="wk-modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
            <div className="wk-header">
              <Briefcase size={15} className="wk-header__icon" />
              <span className="wk-header__num">القضايا المرتبطة</span>
              <span className="wk-header__type">#{wekala.number}</span>
              <div className="wk-header__spacer" />
              <button className="wk-close" onClick={() => setShowLinkedCases(false)}>
                <X size={15} />
              </button>
            </div>
            <div className="wk-body" style={{ paddingBottom: 12 }}>
              {linkedCasesLoading ? (
                <div className="cw-loading">جاري التحميل…</div>
              ) : linkedCases.length === 0 ? (
                <div className="cw-empty">لا توجد قضايا مرتبطة بهذه الوكالة.</div>
              ) : (
                <table className="cw-table">
                  <thead>
                    <tr>
                      <th>رقم القضية</th>
                      <th>العنوان</th>
                      <th>العميل</th>
                      <th>الحالة</th>
                      <th>آخر جلسة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkedCases.map(c => (
                      <tr key={c.id}>
                        <td>
                          <RouterLink to={`/cases/${c.id}`} className="cw-sidecard__link" onClick={onClose}>
                            #{c.file_number}
                          </RouterLink>
                        </td>
                        <td>{c.title || '—'}</td>
                        <td>{c.client_name || '—'}</td>
                        <td><span className="cw-badge cw-badge--pending">{c.status_arabic}</span></td>
                        <td>{c.last_session_date ? new Date(c.last_session_date).toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== Main Component ====================

const Wekalat: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  // Settings state
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [wekalaVisibility, setWekalaVisibility] = useState<'all' | 'assigned'>('all');
  const [savingVisibility, setSavingVisibility] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('معتمدة');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortByExpiry, setSortByExpiry] = useState<'asc' | 'desc' | null>(null);
  const [selectedWekala, setSelectedWekala] = useState<Wekala | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search input so we don't refetch on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset to page 1 when filter changes
  useEffect(() => { setCurrentPage(1); }, [statusFilter]);

  // Per-filter cache key so each filter combo has its own snapshot
  const buildCacheKey = (page: number, search: string, status: string) =>
    `${CACHE_KEY}_${status || 'all'}_${search || 'none'}_p${page}`;

  const readCachedPage = (page: number, search: string, status: string):
    { wekalat: Wekala[]; pagination: { currentPage: number; totalPages: number; total: number } } | undefined => {
    try {
      const cached = localStorage.getItem(buildCacheKey(page, search, status));
      if (!cached) return undefined;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp >= CACHE_DURATION) return undefined;
      return data;
    } catch { return undefined; }
  };

  const queryClient = useQueryClient();

  // TanStack Query: instant cached display + silent background refresh
  const {
    data: queryData,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery<{ wekalat: Wekala[]; pagination: { currentPage: number; totalPages: number; total: number } }>({
    queryKey: ['wekalat', debouncedSearch, statusFilter, currentPage],
    queryFn: async () => {
      const response = await WekalatService.getWekalat({
        page: currentPage,
        limit: 15,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      const list = Array.isArray(response.data) ? response.data : [];
      return {
        wekalat: list,
        pagination: {
          currentPage: response.current_page ?? currentPage,
          totalPages: response.last_page ?? 1,
          total: response.total ?? list.length,
        },
      };
    },
    placeholderData: () => readCachedPage(currentPage, debouncedSearch, statusFilter),
    staleTime: 60 * 1000,
    refetchInterval: 90 * 1000,
    refetchIntervalInBackground: false,
  });

  const wekalat = queryData?.wekalat ?? [];
  const pagination = queryData?.pagination ?? { currentPage: 1, totalPages: 1, total: 0 };
  const loading = isLoading;
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'خطأ في جلب الوكالات') : null;

  // Persist each filter/page combo to localStorage so the next visit is instant
  useEffect(() => {
    if (!queryData) return;
    try {
      localStorage.setItem(
        buildCacheKey(currentPage, debouncedSearch, statusFilter),
        JSON.stringify({ data: queryData, timestamp: Date.now() })
      );
    } catch { /* quota — ignore */ }
  }, [queryData, currentPage, debouncedSearch, statusFilter]);

  // Convenience aliases for the rest of the component to keep diffs small.
  const fetchWekalat = (page?: number, forceRefresh = false) => {
    if (page && page !== currentPage) {
      setCurrentPage(page);
    } else if (forceRefresh) {
      refetch();
    }
  };

  // Stats
  const stats = useMemo(() => ({
    approved: wekalat.filter(w => w.status === 'معتمدة').length,
    expired: wekalat.filter(w => w.status === 'منتهية').length,
    pending: wekalat.filter(w => w.status === 'قيد الاعتماد').length,
    total: pagination.total
  }), [wekalat, pagination.total]);

  const settingsRef = useRef<HTMLDivElement>(null);

  // جلب إعداد الخصوصية (للأدمن فقط)
  useEffect(() => {
    if (isAdmin) {
      WekalatService.getVisibilitySetting().then(v => setWekalaVisibility(v as 'all' | 'assigned'));
    }
  }, [isAdmin]);

  // إغلاق dropdown الإعدادات عند الضغط خارجها
  useEffect(() => {
    if (!showSettingsMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettingsMenu]);

  // Initial fetch + filter-change refetches are handled automatically by
  // useQuery's queryKey reactivity above. No manual useEffects needed.

  // حفظ إعداد الخصوصية
  const handleVisibilityChange = async (value: 'all' | 'assigned') => {
    setSavingVisibility(true);
    try {
      await WekalatService.updateVisibilitySetting(value);
      setWekalaVisibility(value);
      setShowSettingsMenu(false);
      // Server-side filter changed → drop all cached pages for this list
      Object.keys(localStorage)
        .filter(k => k.startsWith(`${CACHE_KEY}_`))
        .forEach(k => localStorage.removeItem(k));
      queryClient.invalidateQueries({ queryKey: ['wekalat'] });
    } catch (e) {
      console.error('Failed to update visibility:', e);
    } finally {
      setSavingVisibility(false);
    }
  };

  // Helper: get expiry timestamp for sorting
  const getExpiryTime = (w: Wekala): number => {
    const dateStr = (w as any).expiry_date_gregorian || w.expiry_date || null;
    if (!dateStr) return Infinity; // no date = push to end
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? Infinity : d.getTime();
  };

  // Client-side filtered + sorted data
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

    // Sort by expiry
    if (sortByExpiry) {
      result = [...result].sort((a, b) => {
        const tA = getExpiryTime(a);
        const tB = getExpiryTime(b);
        return sortByExpiry === 'asc' ? tA - tB : tB - tA;
      });
    }

    return result;
  }, [wekalat, statusFilter, searchTerm, sortByExpiry]);

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
            <th>الوكالة</th>
            <th>الحالة</th>
            <th>الموكلين</th>
            <th>الوكلاء</th>
            <th>تاريخ الإصدار</th>
            <th
              className="wekalat-th--sortable"
              onClick={() => setSortByExpiry(prev => prev === null ? 'asc' : prev === 'asc' ? 'desc' : null)}
              title="ترتيب حسب الانتهاء"
            >
              تاريخ الانتهاء
              {sortByExpiry && (sortByExpiry === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
            </th>
            <th>المتبقي</th>
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
                  {w.type && <div className="wekala-type-sub">{w.type}</div>}
                </td>
                <td>
                  <span className={`wekala-status-badge ${statusConfig.class}`}>
                    <span className="wekala-status-badge__dot" />
                    {statusConfig.label}
                  </span>
                  {(w as any).source === 'manual' && (
                    <span className="wekala-source-badge wekala-source-badge--manual" style={{ marginRight: 4 }}>يدوية</span>
                  )}
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
                  {(() => {
                    const rem = getRemainingDays(w);
                    if (!rem) return <span style={{ color: '#9ca3af', fontSize: 11 }}>—</span>;
                    return (
                      <span className={`wekala-remaining-badge ${rem.expired ? 'wekala-remaining-badge--expired' : rem.urgent ? 'wekala-remaining-badge--urgent' : 'wekala-remaining-badge--ok'}`}>
                        {rem.text}
                      </span>
                    );
                  })()}
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
              {(() => {
                const rem = getRemainingDays(w);
                if (!rem) return null;
                return (
                  <span className={`wekala-remaining-badge ${rem.expired ? 'wekala-remaining-badge--expired' : rem.urgent ? 'wekala-remaining-badge--urgent' : 'wekala-remaining-badge--ok'}`}>
                    {rem.text}
                  </span>
                );
              })()}
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
            <option value="مفسوخة كلياً">مفسوخة كلياً</option>
            <option value="قيد الاعتماد">قيد الاعتماد</option>
            <option value="موقوفة">موقوفة</option>
          </select>

          <button
            className={`wekalat-icon-btn ${sortByExpiry ? 'wekalat-icon-btn--active' : ''}`}
            onClick={() => setSortByExpiry(prev => prev === null ? 'asc' : prev === 'asc' ? 'desc' : null)}
            title={sortByExpiry === 'asc' ? 'الأقرب انتهاءً أولاً' : sortByExpiry === 'desc' ? 'الأبعد انتهاءً أولاً' : 'ترتيب حسب الانتهاء'}
          >
            {sortByExpiry === 'asc' ? <ArrowUp size={16} /> : sortByExpiry === 'desc' ? <ArrowDown size={16} /> : <ArrowUpDown size={16} />}
          </button>
          <button
            className="wekalat-icon-btn"
            onClick={() => fetchWekalat(pagination.currentPage, true)}
            title="تحديث"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button
            className="wekalat-icon-btn"
            onClick={() => setIsAddModalOpen(true)}
            title="إضافة وكالة يدوياً"
          >
            <Plus size={16} />
          </button>
          {isAdmin && (
            <div ref={settingsRef} style={{ position: 'relative' }}>
              <button
                className={`wekalat-icon-btn ${showSettingsMenu ? 'wekalat-icon-btn--active' : ''}`}
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                title="إعدادات الخصوصية"
              >
                <Settings size={16} />
              </button>
              {showSettingsMenu && (
                <div className="wekala-settings-dropdown">
                  <div className="wekala-settings-dropdown__title">خصوصية الوكالات</div>
                  <label className="wekala-settings-dropdown__option">
                    <input
                      type="radio"
                      name="visibility"
                      checked={wekalaVisibility === 'all'}
                      onChange={() => handleVisibilityChange('all')}
                      disabled={savingVisibility}
                    />
                    <div>
                      <div className="wekala-settings-dropdown__label">عامة للجميع</div>
                      <div className="wekala-settings-dropdown__desc">كل المحامين يشوفون كل الوكالات</div>
                    </div>
                  </label>
                  <label className="wekala-settings-dropdown__option">
                    <input
                      type="radio"
                      name="visibility"
                      checked={wekalaVisibility === 'assigned'}
                      onChange={() => handleVisibilityChange('assigned')}
                      disabled={savingVisibility}
                    />
                    <div>
                      <div className="wekala-settings-dropdown__label">المختصين فقط</div>
                      <div className="wekala-settings-dropdown__desc">كل محامي يشوف وكالاته فقط</div>
                    </div>
                  </label>
                  {savingVisibility && <div className="wekala-settings-dropdown__saving">جاري الحفظ...</div>}
                </div>
              )}
            </div>
          )}
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

      {/* View Modal */}
      <WekalaModal
        wekala={selectedWekala}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedWekala(null);
        }}
      />

      {/* Add Wekala Modal */}
      <AddWekalaModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onWekalaAdded={() => fetchWekalat(1, true)}
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
