import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Star,
  Zap,
  Trophy,
  CheckSquare,
  DollarSign,
  Search,
  Download,
  FileSpreadsheet,
  Calendar,
  Mail,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  PauseCircle,
  ListTodo,
  Activity,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
} from 'recharts';
import { apiClient } from '../utils/api';
import { PresenceIndicator } from './PresenceIndicator';
import LawyerExportModal from './LawyerExportModal';
import {
  quickExportActiveCases,
  filterTasksByScope,
  type LawyerReportData,
  type LawyerCase,
  type LawyerTask,
  type CasesScope,
  type TasksScope,
  type BucketScope,
  type StatusScope,
  type PresenceLogData,
  type ExportConfig,
} from '../utils/lawyerExportHelpers';

interface LawyerDetailContentProps {
  lawyerId: number;
  dateFilter: { period?: string; start_date?: string; end_date?: string };
  presence?: { status: string; lastActivityAgo?: string | null };
}

const LawyerDetailContent: React.FC<LawyerDetailContentProps> = ({ lawyerId, dateFilter, presence }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<LawyerReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cases' | 'tasks' | 'performance' | 'attendance'>('cases');

  // Cases tab state — two-level: bucket × status
  const [casesBucket, setCasesBucket] = useState<BucketScope>('responsible');
  const [casesStatus, setCasesStatus] = useState<StatusScope>('all');
  const [casesSearch, setCasesSearch] = useState('');

  // Tasks tab state
  const [tasksScope, setTasksScope] = useState<TasksScope>('overdue');

  // Export modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportInitialConfig, setExportInitialConfig] = useState<Partial<ExportConfig> | undefined>();

  // Presence
  const [presenceData, setPresenceData] = useState<PresenceLogData | null>(null);
  const [presenceLoading, setPresenceLoading] = useState(false);
  const [presenceDate, setPresenceDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (dateFilter.period) params.append('period', dateFilter.period);
        if (dateFilter.start_date) params.append('start_date', dateFilter.start_date);
        if (dateFilter.end_date) params.append('end_date', dateFilter.end_date);
        const qs = params.toString();
        const response: any = await apiClient.get(`/lawyers-report/${lawyerId}${qs ? `?${qs}` : ''}`);
        if (cancelled) return;
        if (response.success) setData(response.data);
      } catch (err) {
        console.error('Failed to fetch lawyer detail:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [lawyerId, dateFilter]);

  useEffect(() => {
    if (activeTab !== 'attendance') return;
    let cancelled = false;
    const fetchPresence = async () => {
      setPresenceLoading(true);
      try {
        const response: any = await apiClient.get(`/presence/report?user_id=${lawyerId}&start_date=${presenceDate}&end_date=${presenceDate}`);
        if (cancelled) return;
        setPresenceData(response?.data?.[0] || null);
      } catch (err) {
        console.error('Failed to fetch presence:', err);
        if (!cancelled) setPresenceData(null);
      } finally {
        if (!cancelled) setPresenceLoading(false);
      }
    };
    fetchPresence();
    return () => { cancelled = true; };
  }, [activeTab, presenceDate, lawyerId]);

  // ---- Derived data ----------------------------------------------------

  const totalRevenue = useMemo(() => {
    if (!data) return 0;
    return data.cases.reduce((s, c) => s + (Number(c.contract_value) || 0), 0);
  }, [data]);

  // Bucket-based counts (any status) — for the bucket pills.
  const bucketCounts = useMemo(() => {
    if (!data) return { responsible: 0, party: 0, shared: 0 };
    const b = data.breakdown;
    if (b) {
      return { responsible: b.responsible.total, party: b.party.total, shared: b.shared.total };
    }
    // Fallback when serving an older backend response.
    return {
      responsible: data.cases.filter(c => c.is_responsible ?? c.is_primary).length,
      party: data.cases.filter(c => c.is_party).length,
      shared: data.cases.filter(c => c.is_shared).length,
    };
  }, [data]);

  // Filter cases by current (bucket, status) selection, then by search.
  const visibleCases = useMemo(() => {
    if (!data) return [];

    const inBucket = (c: LawyerCase): boolean => {
      if (casesBucket === 'responsible') return Boolean(c.is_responsible ?? c.is_primary);
      if (casesBucket === 'party')       return Boolean(c.is_party);
      return Boolean(c.is_shared);
    };
    const matchesStatus = (c: LawyerCase): boolean => {
      if (casesStatus === 'all') return true;
      if (casesStatus === 'active') return c.status === 'active' || c.status === 'pending';
      return c.status === 'closed';
    };

    const list = data.cases.filter(c => inBucket(c) && matchesStatus(c));
    if (!casesSearch.trim()) return list;
    const q = casesSearch.toLowerCase();
    return list.filter(c =>
      (c.title || '').toLowerCase().includes(q) ||
      (c.file_number || '').toLowerCase().includes(q) ||
      (c.client_name || '').toLowerCase().includes(q)
    );
  }, [data, casesBucket, casesStatus, casesSearch]);

  // Status counts within the currently selected bucket — for the status pills.
  const statusCountsInBucket = useMemo(() => {
    if (!data) return { all: 0, active: 0, closed: 0 };
    const inBucket = (c: LawyerCase): boolean => {
      if (casesBucket === 'responsible') return Boolean(c.is_responsible ?? c.is_primary);
      if (casesBucket === 'party')       return Boolean(c.is_party);
      return Boolean(c.is_shared);
    };
    const list = data.cases.filter(inBucket);
    return {
      all: list.length,
      active: list.filter(c => c.status === 'active' || c.status === 'pending').length,
      closed: list.filter(c => c.status === 'closed').length,
    };
  }, [data, casesBucket]);

  const visibleTasks = useMemo(() => {
    if (!data) return [];
    return filterTasksByScope(data.tasks, tasksScope);
  }, [data, tasksScope]);

  const taskCounts = useMemo(() => {
    if (!data) return { overdue: 0, inProgress: 0, completed: 0, paused: 0 };
    return {
      overdue: data.tasks.filter(t => t.status === 'overdue').length,
      inProgress: data.tasks.filter(t => t.status === 'in_progress' || t.status === 'pending').length,
      completed: data.tasks.filter(t => t.status === 'completed').length,
      paused: data.tasks.filter(t => t.status === 'paused').length,
    };
  }, [data]);

  // ---- Render ----------------------------------------------------------

  if (loading) return <div className="loading-state">جاري التحميل...</div>;
  if (!data) return <div className="error-state">فشل تحميل البيانات</div>;

  const lawyerName = data.lawyer.name;
  const presenceStatus = (presence?.status as 'online' | 'idle' | 'away' | 'offline' | undefined) || 'offline';

  const openExportModal = (initial?: Partial<ExportConfig>) => {
    setExportInitialConfig(initial);
    setIsExportModalOpen(true);
  };

  return (
    <div className="lawyer-detail-content">
      {/* === Hero Header === */}
      <div className="lawyer-detail-hero">
        <div className="lawyer-detail-hero__avatar">
          {data.lawyer.avatar
            ? <img src={data.lawyer.avatar} alt={lawyerName} />
            : <div className="lawyer-detail-hero__avatar-placeholder">{lawyerName.charAt(0)}</div>}
        </div>
        <div className="lawyer-detail-hero__info">
          <h2 className="lawyer-detail-hero__name">{lawyerName}</h2>
          <div className="lawyer-detail-hero__meta">
            <span>{roleLabel(data.lawyer.role)}</span>
            {data.lawyer.email && (
              <>
                <span className="lawyer-detail-hero__sep">·</span>
                <span className="lawyer-detail-hero__email"><Mail size={12} /> {data.lawyer.email}</span>
              </>
            )}
          </div>
        </div>
        <div className="lawyer-detail-hero__presence">
          <PresenceIndicator
            status={presenceStatus}
            lastActivityAgo={presence?.lastActivityAgo || undefined}
            size="medium"
            showLabel={true}
          />
        </div>
      </div>

      {/* === KPI Grid === */}
      <div className="lawyer-kpi-grid">
        <KpiCard delay={0.0} icon={<Briefcase size={18} />} accent="primary"
          value={data.cases.length} label="إجمالي القضايا" />
        <KpiCard delay={0.05} icon={<Star size={18} />} accent="warning" highlighted
          value={data.responsible_cases_count} label="مسؤول عنها" />
        <KpiCard delay={0.10} icon={<Zap size={18} />} accent="info"
          value={data.active_cases.length} label="نشطة" />
        <KpiCard delay={0.15} icon={<Trophy size={18} />} accent="success"
          value={`${data.win_rate.percentage}%`} label="معدل الفوز" />
        <KpiCard delay={0.20} icon={<CheckSquare size={18} />}
          accent={data.task_stats.completion_rate < 70 ? 'warning' : 'success'}
          value={`${data.task_stats.completion_rate}%`} label="إنجاز المهام" />
        <KpiCard delay={0.25} icon={<DollarSign size={18} />} accent="success"
          value={formatNumber(totalRevenue)} label="إيرادات (SAR)" />
      </div>

      {/* === Tabs === */}
      <div className="lawyer-detail-tabs">
        <TabButton active={activeTab === 'cases'} onClick={() => setActiveTab('cases')}
          icon={<Briefcase size={14} />}>
          القضايا <span className="lawyer-detail-tabs__hint">{data.responsible_cases_count} ★ / {data.cases.length}</span>
        </TabButton>
        <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')}
          icon={<ListTodo size={14} />}>
          المهام <span className="lawyer-detail-tabs__hint">{taskCounts.overdue} متأخرة / {data.tasks.length}</span>
        </TabButton>
        <TabButton active={activeTab === 'performance'} onClick={() => setActiveTab('performance')}
          icon={<TrendingUp size={14} />}>
          الأداء
        </TabButton>
        <TabButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')}
          icon={<Activity size={14} />}>
          سجل الحضور
        </TabButton>
      </div>

      <div className="lawyer-detail-tab-content">
        {activeTab === 'cases' && (
          <CasesTab
            bucket={casesBucket}
            setBucket={(b) => { setCasesBucket(b); setCasesStatus('all'); }}
            status={casesStatus}
            setStatus={setCasesStatus}
            search={casesSearch}
            setSearch={setCasesSearch}
            cases={visibleCases}
            bucketCounts={bucketCounts}
            statusCounts={statusCountsInBucket}
            onOpenExport={() => openExportModal({ cases: { enabled: true, scope: bucketToExportScope(casesBucket, casesStatus) } })}
            onQuickExport={() => quickExportActiveCases(data)}
            onCaseClick={(id) => navigate(`/cases/${id}`)}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksTab
            scope={tasksScope}
            setScope={setTasksScope}
            tasks={visibleTasks}
            counts={taskCounts}
            onOpenExport={(scope) => openExportModal({ cases: { enabled: false, scope: 'active' }, tasks: { enabled: true, scope } })}
            onTaskClick={(id) => navigate(`/tasks/${id}`)}
          />
        )}

        {activeTab === 'performance' && (
          <PerformanceTab data={data} />
        )}

        {activeTab === 'attendance' && (
          <AttendanceTab
            presenceDate={presenceDate}
            setPresenceDate={setPresenceDate}
            presenceData={presenceData}
            loading={presenceLoading}
          />
        )}
      </div>

      {/* === Export Modal === */}
      {isExportModalOpen && (
        <LawyerExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          data={data}
          initialConfig={exportInitialConfig}
        />
      )}
    </div>
  );
};

// =====================================================================
// Sub-components
// =====================================================================

const KpiCard: React.FC<{
  icon: React.ReactNode;
  value: number | string;
  label: string;
  accent: 'primary' | 'success' | 'warning' | 'info' | 'error';
  highlighted?: boolean;
  delay?: number;
}> = ({ icon, value, label, accent, highlighted, delay = 0 }) => (
  <motion.div
    className={`lawyer-kpi-card lawyer-kpi-card--${accent}${highlighted ? ' is-highlighted' : ''}`}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.25 }}
  >
    <div className="lawyer-kpi-card__icon">{icon}</div>
    <div className="lawyer-kpi-card__body">
      <div className="lawyer-kpi-card__value">{value}</div>
      <div className="lawyer-kpi-card__label">{label}</div>
    </div>
  </motion.div>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }> = ({ active, onClick, icon, children }) => (
  <button className={`lawyer-detail-tab ${active ? 'is-active' : ''}`} onClick={onClick}>
    {icon}
    {children}
  </button>
);

// ---- Cases Tab -------------------------------------------------------

interface CasesTabProps {
  bucket: BucketScope;
  setBucket: (b: BucketScope) => void;
  status: StatusScope;
  setStatus: (s: StatusScope) => void;
  search: string;
  setSearch: (v: string) => void;
  cases: LawyerCase[];
  bucketCounts: { responsible: number; party: number; shared: number };
  statusCounts: { all: number; active: number; closed: number };
  onOpenExport: () => void;
  onQuickExport: () => void;
  onCaseClick: (id: number) => void;
}

const CasesTab: React.FC<CasesTabProps> = ({
  bucket, setBucket, status, setStatus, search, setSearch,
  cases, bucketCounts, statusCounts, onOpenExport, onQuickExport, onCaseClick,
}) => (
  <div className="lawyer-cases">
    {/* Level 1: bucket (responsible / party / shared) */}
    <div className="lawyer-cases__buckets" role="tablist">
      <BucketPill value="responsible" current={bucket} onClick={setBucket}
        icon={<Star size={13} />} label="مسؤول عنها" count={bucketCounts.responsible} />
      <BucketPill value="party" current={bucket} onClick={setBucket}
        icon={<Briefcase size={13} />} label="مكلف بها" count={bucketCounts.party} />
      <BucketPill value="shared" current={bucket} onClick={setBucket}
        icon={<Search size={13} />} label="مشارك فيها" count={bucketCounts.shared} />
    </div>

    {/* Level 2: status sub-filter (all / active / closed) + tools */}
    <div className="lawyer-cases__toolbar">
      <div className="lawyer-cases__toggle" role="tablist">
        <StatusPill value="all" current={status} onClick={setStatus} label="الكل" count={statusCounts.all} />
        <StatusPill value="active" current={status} onClick={setStatus} label="نشط" count={statusCounts.active} />
        <StatusPill value="closed" current={status} onClick={setStatus} label="غير نشط" count={statusCounts.closed} />
      </div>
      <div className="lawyer-cases__toolbar-actions">
        <div className="lawyer-cases__search">
          <Search size={13} />
          <input type="text" placeholder="بحث في القضية..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="lawyer-cases__btn lawyer-cases__btn--quick" onClick={onQuickExport} title="تصدير القضايا النشطة فوراً">
          <FileSpreadsheet size={14} /> تصدير سريع
        </button>
        <button className="lawyer-cases__btn lawyer-cases__btn--primary" onClick={onOpenExport} title="تخصيص محتوى التقرير">
          <Download size={14} /> تخصيص...
        </button>
      </div>
    </div>

    {cases.length === 0 ? (
      <div className="lawyer-empty-state">
        <Briefcase size={32} />
        <p>{search ? 'لا توجد نتائج للبحث' : emptyBucketMessage(bucket, status)}</p>
      </div>
    ) : (
      <div className="lawyer-cases__table-wrap">
        <table className="lawyer-cases__table">
          <thead>
            <tr>
              <th>#</th>
              <th>رقم الملف</th>
              <th>القضية</th>
              <th>العميل</th>
              <th>النوع</th>
              <th>الأولوية</th>
              <th>الدور</th>
              <th>الحالة</th>
              <th>النتيجة</th>
              <th>القيمة</th>
              <th>الجلسة القادمة</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c, i) => (
              <tr key={c.id} onClick={() => onCaseClick(c.id)} className="lawyer-cases__row" title="افتح القضية">
                <td>{i + 1}</td>
                <td className="lawyer-cases__cell-mono">{c.file_number || '-'}</td>
                <td className="lawyer-cases__cell-title">{c.title || '-'}</td>
                <td>{c.client_name || '-'}</td>
                <td><span className="notion-badge badge-gray">{caseTypeLabel(c.case_type)}</span></td>
                <td>{priorityBadge(c.priority)}</td>
                <td className="lawyer-cases__cell-role">
                  {(c.is_responsible ?? c.is_primary)
                    ? <span className="lawyer-role-star" title="المحامي المسؤول"><Star size={13} /></span>
                    : <span className="lawyer-role-assigned" title="مكلف">—</span>}
                </td>
                <td>{statusBadge(c.status)}</td>
                <td>{outcomeBadge(c.outcome)}</td>
                <td className="lawyer-cases__cell-value">{c.contract_value ? formatNumber(c.contract_value) : '-'}</td>
                <td className="lawyer-cases__cell-date">{formatDate(c.next_hearing)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const BucketPill: React.FC<{ value: BucketScope; current: BucketScope; onClick: (v: BucketScope) => void; label: string; count: number; icon?: React.ReactNode }> = ({ value, current, onClick, label, count, icon }) => (
  <button className={`lawyer-bucket-pill ${current === value ? 'is-active' : ''}`} onClick={() => onClick(value)}>
    {icon}
    <span className="lawyer-bucket-pill__label">{label}</span>
    <span className="lawyer-bucket-pill__count">{count}</span>
  </button>
);

const StatusPill: React.FC<{ value: StatusScope; current: StatusScope; onClick: (v: StatusScope) => void; label: string; count: number }> = ({ value, current, onClick, label, count }) => (
  <button className={`lawyer-scope-pill ${current === value ? 'is-active' : ''}`} onClick={() => onClick(value)}>
    {label}
    <span className="lawyer-scope-pill__count">{count}</span>
  </button>
);

// ---- Tasks Tab -------------------------------------------------------

interface TasksTabProps {
  scope: TasksScope;
  setScope: (s: TasksScope) => void;
  tasks: LawyerTask[];
  counts: { overdue: number; inProgress: number; completed: number; paused: number };
  onOpenExport: (scope: TasksScope) => void;
  onTaskClick: (id: number) => void;
}

const TasksTab: React.FC<TasksTabProps> = ({ scope, setScope, tasks, counts, onOpenExport, onTaskClick }) => (
  <div className="lawyer-tasks">
    <div className="lawyer-tasks__metrics">
      <TaskMetric icon={<AlertTriangle size={16} />} accent="error" value={counts.overdue} label="متأخرة" />
      <TaskMetric icon={<Clock size={16} />} accent="warning" value={counts.inProgress} label="قيد التنفيذ" />
      <TaskMetric icon={<CheckCircle2 size={16} />} accent="success" value={counts.completed} label="منجَزة" />
      <TaskMetric icon={<PauseCircle size={16} />} accent="muted" value={counts.paused} label="معلَّقة" />
    </div>

    <div className="lawyer-tasks__toolbar">
      <div className="lawyer-tasks__filters">
        {(['overdue', 'unfinished', 'completed', 'all'] as TasksScope[]).map(s => (
          <button key={s}
            className={`lawyer-scope-pill ${scope === s ? 'is-active' : ''}`}
            onClick={() => setScope(s)}>
            {taskScopeLabel(s)}
          </button>
        ))}
      </div>
      <button className="lawyer-cases__btn lawyer-cases__btn--primary" onClick={() => onOpenExport(scope)}>
        <Download size={14} /> تصدير المهام
      </button>
    </div>

    {tasks.length === 0 ? (
      <div className="lawyer-empty-state">
        <ListTodo size={32} />
        <p>{emptyTasksMessage(scope)}</p>
      </div>
    ) : (
      <div className="lawyer-cases__table-wrap">
        <table className="lawyer-cases__table">
          <thead>
            <tr>
              <th>#</th>
              <th>المهمة</th>
              <th>القضية المرتبطة</th>
              <th>الأولوية</th>
              <th>الموعد</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t, i) => (
              <tr key={t.id} onClick={() => onTaskClick(t.id)} className="lawyer-cases__row" title="افتح المهمة">
                <td>{i + 1}</td>
                <td className="lawyer-cases__cell-title">{t.title || '-'}</td>
                <td>{t.case ? `${t.case.file_number} — ${t.case.title}` : '—'}</td>
                <td>{priorityBadge(t.priority)}</td>
                <td className="lawyer-cases__cell-date">{formatDate(t.due_date)}</td>
                <td>{taskStatusBadge(t.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const TaskMetric: React.FC<{ icon: React.ReactNode; value: number; label: string; accent: 'error' | 'warning' | 'success' | 'muted' }> = ({ icon, value, label, accent }) => (
  <div className={`lawyer-task-metric lawyer-task-metric--${accent}`}>
    <div className="lawyer-task-metric__icon">{icon}</div>
    <div className="lawyer-task-metric__value">{value}</div>
    <div className="lawyer-task-metric__label">{label}</div>
  </div>
);

// ---- Performance Tab -------------------------------------------------

const PerformanceTab: React.FC<{ data: LawyerReportData }> = ({ data }) => {
  const series = data.monthly_performance;
  const totalCases = series.reduce((s, m) => s + m.cases, 0);
  const peak = series.reduce((max, m) => m.cases > max ? m.cases : max, 0);
  const first = series[0]?.cases || 0;
  const last = series[series.length - 1]?.cases || 0;
  const growth = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
  const avg = series.length > 0 ? Math.round(totalCases / series.length) : 0;

  return (
    <div className="lawyer-performance">
      <div className="lawyer-performance__chart">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={series} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} reversed />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              wrapperStyle={{ direction: 'rtl' }}
              contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12 }}
              labelFormatter={(v) => `شهر ${v}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="cases" name="قضايا جديدة" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="tasks_completed" name="مهام منجَزة" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="lawyer-performance__stats">
        <div className="lawyer-perf-stat">
          <div className="lawyer-perf-stat__label">متوسط شهري</div>
          <div className="lawyer-perf-stat__value">{avg}</div>
        </div>
        <div className="lawyer-perf-stat">
          <div className="lawyer-perf-stat__label">ذروة شهرية</div>
          <div className="lawyer-perf-stat__value">{peak}</div>
        </div>
        <div className="lawyer-perf-stat">
          <div className="lawyer-perf-stat__label">معدل النمو</div>
          <div className={`lawyer-perf-stat__value ${growth >= 0 ? 'is-positive' : 'is-negative'}`}>{growth >= 0 ? '+' : ''}{growth}%</div>
        </div>
      </div>
    </div>
  );
};

// ---- Attendance Tab --------------------------------------------------

interface AttendanceTabProps {
  presenceDate: string;
  setPresenceDate: (d: string) => void;
  presenceData: PresenceLogData | null;
  loading: boolean;
}

const AttendanceTab: React.FC<AttendanceTabProps> = ({ presenceDate, setPresenceDate, presenceData, loading }) => {
  const setRelative = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setPresenceDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="lawyer-attendance">
      <div className="lawyer-attendance__date-controls">
        <Calendar size={14} />
        <input type="date" value={presenceDate} onChange={(e) => setPresenceDate(e.target.value)} className="lawyer-attendance__date-input" />
        <button className="lawyer-attendance__quick" onClick={() => setRelative(0)}>اليوم</button>
        <button className="lawyer-attendance__quick" onClick={() => setRelative(-1)}>أمس</button>
      </div>

      {loading ? (
        <div className="loading-state">جاري التحميل...</div>
      ) : !presenceData ? (
        <div className="lawyer-empty-state">
          <Activity size={32} />
          <p>لا توجد سجلات لهذا اليوم</p>
        </div>
      ) : (
        <>
          <div className="lawyer-attendance__metrics">
            <AttendanceMetric label="نشط" value={formatHours(presenceData.total_active_hours)} accent="success" />
            <AttendanceMetric label="خامل" value={formatHours(presenceData.total_idle_hours)} accent="warning" />
            <AttendanceMetric label="الإجمالي" value={formatHours(presenceData.total_hours)} accent="primary" />
          </div>

          {presenceData.daily_breakdown.length > 0 && (
            <div className="lawyer-attendance__chart">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={presenceData.daily_breakdown.map(d => ({
                  date: new Date(d.date).toLocaleDateString('ar-SA', { weekday: 'short' }),
                  نشط: d.active_hours,
                  خامل: d.idle_hours,
                }))} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip wrapperStyle={{ direction: 'rtl' }} contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="نشط" stackId="a" fill="#10b981" />
                  <Bar dataKey="خامل" stackId="a" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="lawyer-cases__table-wrap">
            <table className="lawyer-cases__table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>نشط</th>
                  <th>خامل</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {presenceData.daily_breakdown.map((d, i) => (
                  <tr key={i}>
                    <td>{new Date(d.date).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'short' })}</td>
                    <td className="lawyer-attendance__cell-active">{formatHours(d.active_hours)}</td>
                    <td className="lawyer-attendance__cell-idle">{formatHours(d.idle_hours)}</td>
                    <td className="lawyer-attendance__cell-total">{formatHours(d.total_hours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

const AttendanceMetric: React.FC<{ label: string; value: string; accent: 'success' | 'warning' | 'primary' }> = ({ label, value, accent }) => (
  <div className={`lawyer-attendance-metric lawyer-attendance-metric--${accent}`}>
    <div className="lawyer-attendance-metric__label">{label}</div>
    <div className="lawyer-attendance-metric__value">{value}</div>
  </div>
);

// =====================================================================
// Helpers
// =====================================================================

function formatNumber(n: number | null | undefined): string {
  if (n == null) return '-';
  const num = Number(n);
  if (!isFinite(num)) return '-';
  return num.toLocaleString('en-US');
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0 && m === 0) return '0';
  if (h === 0) return `${m} د`;
  return `${h} س ${m} د`;
}

function statusBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: 'نشطة', cls: 'badge-blue' },
    pending: { label: 'قيد النظر', cls: 'badge-orange' },
    closed: { label: 'مغلقة', cls: 'badge-gray' },
    appealed: { label: 'مستأنفة', cls: 'badge-orange' },
    settled: { label: 'مصالحة', cls: 'badge-blue' },
    dismissed: { label: 'مرفوضة', cls: 'badge-red' },
  };
  const c = map[s] || { label: s || '-', cls: 'badge-gray' };
  return <span className={`notion-badge ${c.cls}`}>{c.label}</span>;
}

function outcomeBadge(o: string | null) {
  if (!o) return <span className="notion-badge badge-gray">—</span>;
  const map: Record<string, { label: string; cls: string }> = {
    won: { label: 'كسب', cls: 'badge-green' },
    lost: { label: 'خسارة', cls: 'badge-red' },
    settled: { label: 'تسوية', cls: 'badge-blue' },
    appealed: { label: 'مستأنفة', cls: 'badge-orange' },
    dismissed: { label: 'مرفوضة', cls: 'badge-gray' },
  };
  const c = map[o] || { label: o, cls: 'badge-gray' };
  return <span className={`notion-badge ${c.cls}`}>{c.label}</span>;
}

function priorityBadge(p: string | null) {
  if (!p) return <span className="notion-badge badge-gray">—</span>;
  const map: Record<string, { label: string; cls: string }> = {
    urgent: { label: 'عاجلة', cls: 'lawyer-priority--urgent' },
    high: { label: 'عالية', cls: 'lawyer-priority--high' },
    medium: { label: 'متوسطة', cls: 'lawyer-priority--medium' },
    low: { label: 'منخفضة', cls: 'lawyer-priority--low' },
  };
  const c = map[p] || { label: p, cls: 'lawyer-priority--medium' };
  return <span className={`lawyer-priority ${c.cls}`}>{c.label}</span>;
}

function taskStatusBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'في الانتظار', cls: 'badge-gray' },
    in_progress: { label: 'قيد التنفيذ', cls: 'badge-orange' },
    completed: { label: 'منجَزة', cls: 'badge-green' },
    overdue: { label: 'متأخرة', cls: 'badge-red' },
    paused: { label: 'معلَّقة', cls: 'badge-gray' },
  };
  const c = map[s] || { label: s, cls: 'badge-gray' };
  return <span className={`notion-badge ${c.cls}`}>{c.label}</span>;
}

function caseTypeLabel(t: string | null): string {
  if (!t) return '-';
  const map: Record<string, string> = {
    civil: 'مدنية', criminal: 'جزائية', commercial: 'تجارية', family: 'أسرية',
    labor: 'عمالية', administrative: 'إدارية', real_estate: 'عقارية',
    intellectual_property: 'ملكية فكرية', other: 'أخرى',
  };
  return map[t] || t;
}

function roleLabel(r: string): string {
  const map: Record<string, string> = {
    admin: 'مدير النظام', partner: 'شريك', senior_lawyer: 'محامي أول',
    lawyer: 'محامي', legal_assistant: 'مساعد قانوني', assistant: 'مساعد',
  };
  return map[r] || r;
}

function emptyBucketMessage(bucket: BucketScope, status: StatusScope): string {
  const bucketLabel =
    bucket === 'responsible' ? 'مسؤولاً عنها (★)' :
    bucket === 'party'       ? 'مكلفاً بها' :
                               'مشاركاً فيها';
  if (status === 'active') return `لا توجد قضايا نشطة يكون فيها ${bucketLabel}.`;
  if (status === 'closed') return `لا توجد قضايا مغلقة يكون فيها ${bucketLabel}.`;
  return `لا توجد قضايا يكون فيها ${bucketLabel}.`;
}

/**
 * Best-effort mapping from (bucket, status) → legacy CasesScope used by the
 * existing export builder. Exact bucket-shared/party scopes are not yet
 * supported by the export modal; for those we fall back to 'all'.
 */
function bucketToExportScope(bucket: BucketScope, status: StatusScope): CasesScope {
  if (bucket === 'responsible') return 'responsible';
  if (status === 'active') return 'active';
  return 'all';
}

function emptyTasksMessage(scope: TasksScope): string {
  if (scope === 'overdue') return 'لا توجد مهام متأخرة 🎉';
  if (scope === 'completed') return 'لا توجد مهام منجَزة في الفترة المختارة.';
  if (scope === 'unfinished') return 'لا توجد مهام غير منجَزة.';
  return 'لا توجد مهام لهذا المحامي.';
}

function taskScopeLabel(s: TasksScope): string {
  return ({ overdue: 'المتأخرة', unfinished: 'غير المنجَزة', completed: 'المنجَزة', all: 'الكل' } as Record<TasksScope, string>)[s];
}

export default LawyerDetailContent;
