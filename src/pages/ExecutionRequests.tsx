import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  RefreshCw,
  Scale,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  Clock,
  Eye,
  Trash2,
  Banknote,
  Landmark,
  Gavel,
  AlertCircle,
  FileText,
  Wallet,
  CircleDollarSign,
  PauseCircle,
  CheckCircle2,
  PlayCircle,
  XCircle,
  PieChart as PieIcon,
} from 'lucide-react';
import { ExecutionRequestService } from '../services/executionRequestService';
import type { ExecutionRequest, ExecutionRequestStats } from '../types';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

// ==================== تصنيف الحالات (ألوان عبر متغيرات الثيم) ====================

type StatusKind = 'active' | 'completed' | 'stopped' | 'cancelled' | 'default';

const statusKind = (status: string): StatusKind => {
  if (!status) return 'default';
  if (status.includes('قيد') || status.includes('جار')) return 'active';
  if (status.includes('منفذ') || status.includes('منتهي')) return 'completed';
  if (status.includes('موقوف') || status.includes('متعثر')) return 'stopped';
  if (status.includes('ملغ') || status.includes('مرفوض')) return 'cancelled';
  return 'default';
};

const STATUS_ICON: Record<StatusKind, React.ReactNode> = {
  active: <PlayCircle size={13} />,
  completed: <CheckCircle2 size={13} />,
  stopped: <PauseCircle size={13} />,
  cancelled: <XCircle size={13} />,
  default: <FileText size={13} />,
};

const PARTY_ROLES: Record<string, string> = {
  'all': 'كل الصفات',
  '1': 'طلب شخصي',
  '2': 'طلب ضدي',
  '3': 'وكيل طالب تنفيذ',
  '6': 'وكيل منفذ ضده',
};

// ==================== مساعدات ====================

const formatAmount = (amount?: number | null): string => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount);
};

const compactAmount = (amount?: number | null): string => {
  const v = amount ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })} مليون`;
  if (v >= 1_000) return `${(v / 1_000).toLocaleString('en-US', { maximumFractionDigits: 1 })} ألف`;
  return v.toLocaleString('en-US');
};

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
};

/** نسبة التحصيل لطلب واحد */
const collectionPct = (req: { total_amount?: number | null; paid_amount?: number | null }): number | null => {
  const total = req.total_amount ?? 0;
  if (total <= 0) return null;
  return Math.min(100, Math.round(((req.paid_amount ?? 0) / total) * 100));
};

const pctClass = (p: number | null) => p === null ? '' : p >= 70 ? 'exec-good' : p >= 30 ? 'exec-mid' : 'exec-bad';

// ==================== Cache ====================

const CACHE_KEY = 'execution_requests_data';
const CACHE_DURATION = 60 * 60 * 1000;

// ==================== شارة الحالة ====================

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const kind = statusKind(status);
  return (
    <span className={`exec-badge exec-badge--${kind}`}>
      {STATUS_ICON[kind]}
      {status}
    </span>
  );
};

// ==================== شريط تحصيل مصغّر ====================

const CollectBar: React.FC<{ req: ExecutionRequest }> = ({ req }) => {
  const p = collectionPct(req);
  if (p === null) return <span className="exec-dim">—</span>;
  return (
    <div className="exec-collectbar" title={`محصّل ${formatAmount(req.paid_amount)} من ${formatAmount(req.total_amount)}`}>
      <div className="exec-collectbar__track">
        <div className={`exec-collectbar__fill ${pctClass(p)}`} style={{ width: `${p}%` }} />
      </div>
      <b className={pctClass(p)}>{p}%</b>
    </div>
  );
};

// ==================== نافذة التفاصيل ====================

interface DetailModalProps {
  request: ExecutionRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ request, isOpen, onClose }) => {
  if (!request || !isOpen) return null;

  const parties = Array.isArray(request.parties) ? request.parties : [];
  const decisions = Array.isArray(request.decisions) ? request.decisions : [];
  const steps = Array.isArray(request.steps) ? request.steps : [];
  const p = collectionPct(request);

  const partyDot = (role: string) => {
    if (role.includes('طالب') || role.includes('دائن') || role.includes('creditor')) return 'exec-dot--creditor';
    if (role.includes('ضده') || role.includes('مدين') || role.includes('debtor')) return 'exec-dot--debtor';
    return 'exec-dot--attorney';
  };

  return (
    <div className="exec-overlay" onClick={onClose}>
      <div className="exec-modal" onClick={e => e.stopPropagation()}>
        {/* الترويسة */}
        <div className="exec-modal__header">
          <Scale size={16} />
          <div className="exec-modal__title">
            <b>{request.request_number}</b>
            <span>{request.court || 'محكمة غير محددة'}{request.department ? ` · ${request.department}` : ''}</span>
          </div>
          <StatusBadge status={request.status} />
          <button className="exec-iconbtn" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="exec-modal__body">
          {/* الشريط المالي */}
          <div className="exec-modal__finance">
            <div className="exec-modal__fcell">
              <span>المبلغ الإجمالي</span>
              <b>{formatAmount(request.total_amount)}</b>
            </div>
            <div className="exec-modal__fcell">
              <span>المحصَّل</span>
              <b className="exec-good">{formatAmount(request.paid_amount)}</b>
            </div>
            <div className="exec-modal__fcell">
              <span>المتبقي</span>
              <b className="exec-bad">{formatAmount(request.remaining_amount)}</b>
            </div>
            <div className="exec-modal__fcell exec-modal__fcell--bar">
              <span>نسبة التحصيل</span>
              {p !== null ? (
                <div className="exec-collectbar">
                  <div className="exec-collectbar__track">
                    <div className={`exec-collectbar__fill ${pctClass(p)}`} style={{ width: `${p}%` }} />
                  </div>
                  <b className={pctClass(p)}>{p}%</b>
                </div>
              ) : <b>—</b>}
            </div>
          </div>

          {/* البيانات الأساسية */}
          <table className="exec-info-table">
            <tbody>
              <tr>
                <td className="exec-info-table__label">الصفة في الطلب</td>
                <td>{request.party_role || '—'}</td>
                <td className="exec-info-table__label">نوع السند</td>
                <td>{request.main_document_type || '—'}</td>
              </tr>
              <tr>
                <td className="exec-info-table__label">السند الفرعي</td>
                <td>{request.sub_document_type || '—'}</td>
                <td className="exec-info-table__label">تاريخ التقديم</td>
                <td>{request.filing_date_hijri || formatDate(request.filing_date_gregorian)}</td>
              </tr>
              <tr>
                <td className="exec-info-table__label">المحكمة</td>
                <td>{request.court || '—'}</td>
                <td className="exec-info-table__label">الدائرة</td>
                <td>{request.department || '—'}</td>
              </tr>
            </tbody>
          </table>

          <div className="exec-modal__cols">
            {/* الأطراف */}
            {parties.length > 0 && (
              <div className="exec-section">
                <div className="exec-section__head">
                  <Users size={13} /> الأطراف <em>{parties.length}</em>
                </div>
                {parties.map((pt, i) => (
                  <div key={i} className="exec-party">
                    <span className={`exec-dot ${partyDot(pt.role || '')}`} />
                    <div>
                      <b>{pt.name || '—'}</b>
                      <span>
                        {pt.role}{pt.id_number ? ` · ${pt.id_number}` : ''}
                        {pt.nationality ? ` (${pt.nationality})` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* القرارات */}
            {decisions.length > 0 && (
              <div className="exec-section">
                <div className="exec-section__head">
                  <Gavel size={13} /> القرارات <em>{decisions.length}</em>
                </div>
                {decisions.map((d: any, i: number) => (
                  <div key={i} className="exec-party">
                    <span className="exec-dot exec-dot--attorney" />
                    <div>
                      <b>{d.decisionNumber || d.number || `قرار ${i + 1}`}</b>
                      <span>{d.status || d.statusName || '—'}{d.issueDate ? ` · ${d.issueDate}` : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* مراحل الطلب */}
          {steps.length > 0 && (
            <div className="exec-section">
              <div className="exec-section__head">
                <Clock size={13} /> مراحل الطلب <em>{steps.length}</em>
              </div>
              <div className="exec-timeline">
                {steps.map((s: any, i: number) => (
                  <div key={i} className="exec-timeline__item">
                    <div className="exec-timeline__dot" />
                    <div className="exec-timeline__content">
                      <b>{s.stepName || s.name || s.title || `مرحلة ${i + 1}`}</b>
                      <span>{s.stepDate || s.date || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== الصفحة ====================

const ExecutionRequests: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<ExecutionRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [requestToDelete, setRequestToDelete] = useState<ExecutionRequest | null>(null);

  // تأخير البحث كي لا نعيد الجلب مع كل حرف
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => { setCurrentPage(1); }, [statusFilter, roleFilter]);

  // مفتاح cache لكل تركيبة فلاتر
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

  // الإحصائيات في استعلام مستقل كي لا تُعاد مع تغيير الفلاتر
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

  // حفظ كل صفحة/فلتر في localStorage لفتح فوري لاحقاً
  useEffect(() => {
    if (!queryData) return;
    try {
      localStorage.setItem(
        buildCacheKey(currentPage, debouncedSearch, statusFilter, roleFilter),
        JSON.stringify({ data: queryData, timestamp: Date.now() })
      );
    } catch { /* quota — ignore */ }
  }, [queryData, currentPage, debouncedSearch, statusFilter, roleFilter]);

  const fetchData = (page?: number) => {
    if (page && page !== currentPage) setCurrentPage(page);
    else refetch();
  };

  const handleViewRequest = (req: ExecutionRequest) => {
    setSelectedRequest(req);
    setIsModalOpen(true);
  };

  const handleDeleteRequest = async () => {
    if (!requestToDelete) return;
    const id = requestToDelete.id;
    setDeletingId(id);
    try {
      await ExecutionRequestService.deleteRequest(id);
      queryClient.invalidateQueries({ queryKey: ['execution-requests'] });
      try {
        Object.keys(localStorage)
          .filter(k => k.startsWith(CACHE_KEY))
          .forEach(k => localStorage.removeItem(k));
      } catch { /* ignore */ }
      setRequestToDelete(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل في حذف الطلب';
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  // ==================== مشتقات الإحصائيات ====================

  const kpis = useMemo(() => {
    const byKind: Record<StatusKind, number> = { active: 0, completed: 0, stopped: 0, cancelled: 0, default: 0 };
    (stats?.by_status ?? []).forEach(s => { byKind[statusKind(s.status)] += s.count; });
    const total = stats?.total_amount ?? 0;
    const paid = stats?.paid_amount ?? 0;
    return {
      total: stats?.total ?? 0,
      ...byKind,
      totalAmount: total,
      paidAmount: paid,
      remainingAmount: stats?.remaining_amount ?? 0,
      collectionRate: total > 0 ? Math.round((paid / total) * 100) : null,
    };
  }, [stats]);

  const statusBars = useMemo(() => {
    const list = stats?.by_status ?? [];
    const max = Math.max(1, ...list.map(s => s.count));
    return list.map(s => ({ ...s, kind: statusKind(s.status), pct: (s.count / max) * 100 }));
  }, [stats]);

  const roleBars = useMemo(() => {
    const list = stats?.by_party_role ?? [];
    const max = Math.max(1, ...list.map(r => r.count));
    return list.map(r => ({ ...r, pct: (r.count / max) * 100 }));
  }, [stats]);

  const courtBars = useMemo(() => {
    const list = stats?.by_court ?? [];
    const max = Math.max(1, ...list.map(c => Number(c.remaining_total) || 0));
    return list.map(c => ({
      court: c.court || '—',
      count: c.count,
      remaining: Number(c.remaining_total) || 0,
      pct: ((Number(c.remaining_total) || 0) / max) * 100,
    }));
  }, [stats]);

  const uniqueStatuses = useMemo(() => (stats?.by_status ?? []).map(s => s.status), [stats]);

  // ==================== العرض ====================

  return (
    <div className="exec-page" dir="rtl">
      {/* ===== الترويسة ===== */}
      <div className="exec-header">
        <div className="exec-header__title">
          <h1><Scale size={19} /> طلبات التنفيذ</h1>
          <span className="exec-header__sub">{formatAmount(pagination.total)} طلباً · تُسحب من ناجز عبر إضافة Chrome</span>
        </div>

        <div className="exec-header__tools">
          <div className="exec-search">
            <Search size={14} />
            <input
              placeholder="بحث بالرقم، المحكمة، الأطراف…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="exec-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">كل الحالات</option>
            {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="exec-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            {Object.entries(PARTY_ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="exec-iconbtn exec-iconbtn--bordered" onClick={() => refetch()} title="تحديث">
            <RefreshCw size={14} className={refreshing ? 'exec-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ===== شريط المؤشرات ===== */}
      {stats && stats.total > 0 && (
        <div className="exec-kpis">
          <div className="exec-kpi"><FileText size={14} /><b>{formatAmount(kpis.total)}</b><span>إجمالي الطلبات</span></div>
          <div className="exec-kpi exec-kpi--active"><PlayCircle size={14} /><b>{formatAmount(kpis.active)}</b><span>قيد التنفيذ</span></div>
          <div className="exec-kpi"><CheckCircle2 size={14} /><b>{formatAmount(kpis.completed)}</b><span>منفّذة / منتهية</span></div>
          <div className={`exec-kpi ${kpis.stopped > 0 ? 'exec-kpi--warn' : ''}`}><PauseCircle size={14} /><b>{formatAmount(kpis.stopped)}</b><span>موقوفة / متعثرة</span></div>
          {kpis.cancelled > 0 && (
            <div className="exec-kpi"><XCircle size={14} /><b>{formatAmount(kpis.cancelled)}</b><span>ملغاة / مرفوضة</span></div>
          )}
          <div className="exec-kpi"><Banknote size={14} /><b title={formatAmount(kpis.totalAmount)}>{compactAmount(kpis.totalAmount)}</b><span>محكوم به (ر.س)</span></div>
          <div className="exec-kpi exec-kpi--good"><Wallet size={14} /><b title={formatAmount(kpis.paidAmount)}>{compactAmount(kpis.paidAmount)}</b><span>محصَّل (ر.س)</span></div>
          <div className="exec-kpi exec-kpi--bad"><CircleDollarSign size={14} /><b title={formatAmount(kpis.remainingAmount)}>{compactAmount(kpis.remainingAmount)}</b><span>قيد التحصيل (ر.س)</span></div>
          <div className="exec-kpi">
            <b className={pctClass(kpis.collectionRate)}>{kpis.collectionRate !== null ? `${kpis.collectionRate}%` : '—'}</b>
            <div className="exec-kpi__bar">
              <div className={`exec-collectbar__fill ${pctClass(kpis.collectionRate)}`} style={{ width: `${kpis.collectionRate ?? 0}%` }} />
            </div>
            <span>نسبة التحصيل</span>
          </div>
        </div>
      )}

      {/* ===== لوحات التوزيع ===== */}
      {stats && stats.total > 0 && (
        <div className="exec-panels">
          <section className="exec-panel">
            <h2><PieIcon size={13} /> الحالات</h2>
            {statusBars.map(s => (
              <div key={s.status} className="exec-hrow">
                <span className="exec-hrow__label">{s.status}</span>
                <div className="exec-hrow__bar"><div className={`exec-hrow__fill exec-fill--${s.kind}`} style={{ width: `${s.pct}%` }} /></div>
                <b>{formatAmount(s.count)}</b>
              </div>
            ))}
          </section>

          {roleBars.length > 0 && (
            <section className="exec-panel">
              <h2><Users size={13} /> الصفة في الطلبات</h2>
              {roleBars.map(r => (
                <div key={r.party_role} className="exec-hrow">
                  <span className="exec-hrow__label">{r.party_role || '—'}</span>
                  <div className="exec-hrow__bar"><div className="exec-hrow__fill" style={{ width: `${r.pct}%` }} /></div>
                  <b>{formatAmount(r.count)}</b>
                </div>
              ))}
            </section>
          )}

          {courtBars.length > 0 && (
            <section className="exec-panel">
              <h2><Landmark size={13} /> المتبقي حسب المحكمة <i>ر.س</i></h2>
              {courtBars.map(c => (
                <div key={c.court} className="exec-hrow" title={`${c.court}: ${formatAmount(c.remaining)} ر.س متبقية في ${c.count} طلب`}>
                  <span className="exec-hrow__label">{c.court}</span>
                  <div className="exec-hrow__bar"><div className="exec-hrow__fill exec-fill--money" style={{ width: `${c.pct}%` }} /></div>
                  <b>{compactAmount(c.remaining)}</b>
                </div>
              ))}
            </section>
          )}
        </div>
      )}

      {/* ===== المحتوى ===== */}
      {loading ? (
        <div className="exec-loading"><RefreshCw size={16} className="exec-spin" /> جارٍ تحميل طلبات التنفيذ…</div>
      ) : error ? (
        <div className="exec-empty">
          <AlertCircle size={36} />
          <p>{error}</p>
          <button className="exec-btn" onClick={() => refetch()}><RefreshCw size={13} /> إعادة المحاولة</button>
        </div>
      ) : requests.length === 0 ? (
        <div className="exec-empty">
          <Scale size={42} />
          <p>لا توجد طلبات تنفيذ مطابقة</p>
          <span>استخدم إضافة Chrome لسحب الطلبات من ناجز</span>
        </div>
      ) : (
        <>
          <div className="exec-tablewrap">
            <table className="exec-table">
              <thead>
                <tr>
                  <th>الطلب</th>
                  <th>الصفة</th>
                  <th>السند</th>
                  <th>المحكمة</th>
                  <th>الحالة</th>
                  <th>المحكوم به</th>
                  <th style={{ minWidth: 100 }}>التحصيل</th>
                  <th>المتبقي</th>
                  <th>الدائن / المدين</th>
                  <th className="exec-th-actions"></th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => {
                  const creditor = req.parties?.find(p => p.role?.includes('طالب') || p.role?.includes('دائن'));
                  const debtor = req.parties?.find(p => p.role?.includes('ضده') || p.role?.includes('مدين'));
                  return (
                    <tr key={req.id} onClick={() => handleViewRequest(req)}>
                      <td>
                        <div className="exec-reqcell">
                          <b>{req.request_number}</b>
                          <span>{req.filing_date_hijri || formatDate(req.filing_date_gregorian)}</span>
                        </div>
                      </td>
                      <td><span className="exec-rolechip">{req.party_role || '—'}</span></td>
                      <td className="exec-td-trunc" title={req.main_document_type || ''}>{req.main_document_type || '—'}</td>
                      <td className="exec-td-trunc" title={req.court || ''}>{req.court || '—'}</td>
                      <td><StatusBadge status={req.status} /></td>
                      <td className="exec-td-num">{formatAmount(req.total_amount)}</td>
                      <td><CollectBar req={req} /></td>
                      <td className={`exec-td-num ${req.remaining_amount && req.remaining_amount > 0 ? 'exec-bad' : 'exec-good'}`}>
                        {formatAmount(req.remaining_amount)}
                      </td>
                      <td>
                        <div className="exec-partiescell">
                          {creditor && <div><i className="exec-dot exec-dot--creditor" />{creditor.name}</div>}
                          {debtor && <div><i className="exec-dot exec-dot--debtor" />{debtor.name}</div>}
                          {!creditor && !debtor && '—'}
                        </div>
                      </td>
                      <td>
                        <div className="exec-actions" onClick={e => e.stopPropagation()}>
                          <button className="exec-iconbtn" onClick={() => handleViewRequest(req)} title="عرض التفاصيل">
                            <Eye size={14} />
                          </button>
                          <button
                            className="exec-iconbtn exec-iconbtn--danger"
                            onClick={() => setRequestToDelete(req)}
                            title="حذف الطلب"
                            disabled={deletingId === req.id}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="exec-pagination">
              <button
                className="exec-btn"
                disabled={pagination.currentPage <= 1}
                onClick={() => fetchData(pagination.currentPage - 1)}
              >
                <ChevronRight size={13} /> السابق
              </button>
              <span>صفحة {pagination.currentPage} من {pagination.totalPages}</span>
              <button
                className="exec-btn"
                disabled={pagination.currentPage >= pagination.totalPages}
                onClick={() => fetchData(pagination.currentPage + 1)}
              >
                التالي <ChevronLeft size={13} />
              </button>
            </div>
          )}
        </>
      )}

      {/* نافذة التفاصيل */}
      <DetailModal
        request={selectedRequest}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRequest(null);
        }}
      />

      {/* تأكيد الحذف */}
      {requestToDelete && (
        <div className="exec-overlay" onClick={() => deletingId === null && setRequestToDelete(null)}>
          <div className="exec-modal exec-modal--confirm" onClick={e => e.stopPropagation()}>
            <div className="exec-modal__header">
              <AlertCircle size={16} className="exec-bad" />
              <div className="exec-modal__title"><b>تأكيد الحذف</b></div>
              <button className="exec-iconbtn" onClick={() => setRequestToDelete(null)} disabled={deletingId !== null}>
                <X size={15} />
              </button>
            </div>
            <div className="exec-modal__body exec-confirm">
              <p>هل تريد حذف طلب التنفيذ رقم <strong>{requestToDelete.request_number}</strong>؟</p>
              <span>لن يُحذف من ناجز، لكنه سيُحذف من النظام. يمكن إعادة سحبه عبر إضافة Chrome لاحقاً.</span>
              <div className="exec-confirm__actions">
                <button className="exec-btn" onClick={() => setRequestToDelete(null)} disabled={deletingId !== null}>
                  إلغاء
                </button>
                <button className="exec-btn exec-btn--danger" onClick={handleDeleteRequest} disabled={deletingId !== null}>
                  {deletingId !== null ? 'جاري الحذف…' : 'حذف'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionRequests;
