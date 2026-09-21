import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Briefcase,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock,
  Download,
  FileSpreadsheet,
  Gavel,
  Handshake,
  ListTodo,
  Mail,
  PauseCircle,
  Search,
  Star,
  Trophy,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { apiClient } from '../../utils/api';
import { PresenceIndicator } from '../PresenceIndicator';
import LawyerExportModal from '../LawyerExportModal';
import { BarList, ColumnChart, Meter, SegmentBar, StatTile, formatCompact, formatCount } from '../charts/RaedCharts';
import {
  quickExportActiveCases,
  filterTasksByScope,
  isTaskOverdue,
  type LawyerReportData,
  type LawyerCase,
  type LawyerTask,
  type CasesScope,
  type TasksScope,
  type BucketScope,
  type StatusScope,
  type PresenceLogData,
  type ExportConfig,
} from '../../utils/lawyerExportHelpers';

/**
 * واجهة الأداء — تُعرض صفحةً كاملة في «أدائي» وداخل نافذة تفاصيل المحامي في تقرير المحامين.
 *
 * نظرة عامة تجيب بالترتيب عن: ما الذي ينتظرني (متأخرات، جلسات قادمة) ⟵ ما حِملي (قضايا بحسب دوري)
 * ⟵ ما نتائجي (إنجاز المهام، نتائج القضايا) ⟵ كيف يسير اتجاهي (ستة أشهر)، ثم مساحة العمل بتبويباتها.
 * التخطيط يتبع عرض الحاوية (container queries) لا عرض الشاشة، فيصحّ في الصفحة وفي النافذة معاً.
 */

type PresenceStatus = 'online' | 'idle' | 'away' | 'offline';
type WorkTab = 'cases' | 'tasks' | 'attendance';

interface PerformanceViewProps {
  data: LawyerReportData;
  presence?: { status: string; lastActivityAgo?: string | null };
  /**
   * fit  = لوحة تملأ المساحة المتاحة بلا تمرير للصفحة؛ التمرير داخل الجدول والقوائم فقط (صفحة «أدائي»).
   * flow = تدفق عادي يتمرر مع حاويته (نافذة تفاصيل المحامي، وأي حاوية بلا ارتفاع محدد).
   */
  layout?: 'fit' | 'flow';
  /** عنوان الصفحة يُدمج في شريط الهوية (وضع fit) فيوفّر صفاً كاملاً من الارتفاع */
  pageTitle?: string;
  live?: 'live' | 'updating';
}

const DAY_MS = 86_400_000;
// تقويم ميلادي وأرقام لاتينية صراحةً — اتساقاً مع بقية أرقام الصفحة (ar-SA وحدها قد تعطي هجرياً وأرقاماً هندية)
const DATE_LOCALE = 'ar-SA-u-ca-gregory-nu-latn';

const startOfToday = (): number => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
};

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDate = (value: string | null | undefined): string => {
  const d = parseDate(value);
  return d ? d.toLocaleDateString(DATE_LOCALE, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
};

const relativeDay = (date: Date): string => {
  const days = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - startOfToday()) / DAY_MS);
  if (days === 0) return 'اليوم';
  if (days === 1) return 'غداً';
  if (days === 2) return 'بعد يومين';
  if (days <= 10) return `بعد ${days} أيام`;
  return `بعد ${days} يوماً`;
};

const formatHours = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0 && m === 0) return '0';
  if (h === 0) return `${m} د`;
  return `${h} س ${m} د`;
};

/**
 * يُظهر العنصر بتمرير أقرب حاوية متمررة فعلاً (auto/scroll) وحدها.
 * لا `scrollIntoView`: فهو يمرّر كل الحاويات الأم — ومنها قشرة التطبيق (`overflow: hidden`) والمستند —
 * فيصعد الهيدر والشريط السفلي عن الشاشة ولا سبيل لإرجاعهما بالعجلة.
 */
const revealWithin = (el: HTMLElement | null): void => {
  if (!el) return;
  let scroller: HTMLElement | null = el.parentElement;
  while (scroller) {
    const overflowY = getComputedStyle(scroller).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && scroller.scrollHeight > scroller.clientHeight + 1) break;
    scroller = scroller.parentElement;
  }
  if (!scroller) return; // لا شيء يتمرر = العنصر ظاهر أصلاً (وضع fit)

  const box = el.getBoundingClientRect();
  const view = scroller.getBoundingClientRect();
  if (box.top >= view.top && box.top <= view.bottom - 120) return;
  scroller.scrollTo({ top: scroller.scrollTop + (box.top - view.top) - 12, behavior: 'smooth' });
};

const PerformanceView: React.FC<PerformanceViewProps> = ({ data, presence, layout = 'flow', pageTitle, live }) => {
  const navigate = useNavigate();
  const workRef = useRef<HTMLElement | null>(null);

  const [tab, setTab] = useState<WorkTab>('cases');
  const [bucket, setBucket] = useState<BucketScope>('responsible');
  const [caseStatus, setCaseStatus] = useState<StatusScope>('all');
  const [caseSearch, setCaseSearch] = useState('');
  const [tasksScope, setTasksScope] = useState<TasksScope>('overdue');
  const [trendMetric, setTrendMetric] = useState<'cases' | 'tasks'>('cases');

  const [exportOpen, setExportOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState<Partial<ExportConfig> | undefined>();

  const [presenceDate, setPresenceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [presenceData, setPresenceData] = useState<PresenceLogData | null>(null);
  const [presenceLoading, setPresenceLoading] = useState(false);

  const lawyerId = data.lawyer.id;

  useEffect(() => {
    if (tab !== 'attendance') return;
    let cancelled = false;
    setPresenceLoading(true);
    apiClient
      .get<{ data?: PresenceLogData[] }>(`/presence/report?user_id=${lawyerId}&start_date=${presenceDate}&end_date=${presenceDate}`)
      .then((response) => {
        if (!cancelled) setPresenceData(response?.data?.[0] || null);
      })
      .catch((err) => {
        console.error('Failed to fetch presence:', err);
        if (!cancelled) setPresenceData(null);
      })
      .finally(() => {
        if (!cancelled) setPresenceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, presenceDate, lawyerId]);

  // ─── المشتقات ───

  const inBucket = (c: LawyerCase, b: BucketScope): boolean => {
    if (b === 'responsible') return Boolean(c.is_responsible ?? c.is_primary);
    if (b === 'party') return Boolean(c.is_party);
    return Boolean(c.is_shared);
  };

  const bucketCounts = useMemo(() => {
    const b = data.breakdown;
    if (b) return { responsible: b.responsible.total, party: b.party.total, shared: b.shared.total };
    // استجابة خادم أقدم بلا breakdown
    return {
      responsible: data.cases.filter((c) => inBucket(c, 'responsible')).length,
      party: data.cases.filter((c) => inBucket(c, 'party')).length,
      shared: data.cases.filter((c) => inBucket(c, 'shared')).length,
    };
  }, [data]);

  const isActiveCase = (c: LawyerCase) => c.status === 'active' || c.status === 'pending';

  const statusCounts = useMemo(() => {
    const list = data.cases.filter((c) => inBucket(c, bucket));
    return {
      all: list.length,
      active: list.filter(isActiveCase).length,
      closed: list.filter((c) => c.status === 'closed').length,
    };
  }, [data, bucket]);

  const visibleCases = useMemo(() => {
    const list = data.cases.filter((c) => {
      if (!inBucket(c, bucket)) return false;
      if (caseStatus === 'active') return isActiveCase(c);
      if (caseStatus === 'closed') return c.status === 'closed';
      return true;
    });
    const q = caseSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.file_number || '').toLowerCase().includes(q) ||
        (c.client_name || '').toLowerCase().includes(q),
    );
  }, [data, bucket, caseStatus, caseSearch]);

  const taskCounts = useMemo(
    () => ({
      // «المتأخرة» شرط من due_date لا حالة، و«المعلّقة» اسمها on_hold في الجدول
      overdue: data.tasks.filter(isTaskOverdue).length,
      inProgress: data.tasks.filter((t) => (t.status === 'in_progress' || t.status === 'pending') && !isTaskOverdue(t)).length,
      completed: data.tasks.filter((t) => t.status === 'completed').length,
      onHold: data.tasks.filter((t) => t.status === 'on_hold').length,
    }),
    [data],
  );

  const visibleTasks = useMemo(() => filterTasksByScope(data.tasks, tasksScope), [data, tasksScope]);

  const contractsTotal = useMemo(() => data.cases.reduce((sum, c) => sum + (Number(c.contract_value) || 0), 0), [data]);
  const valuedCases = useMemo(() => data.cases.filter((c) => Number(c.contract_value) > 0).length, [data]);

  const upcomingHearings = useMemo(() => {
    const today = startOfToday();
    return data.cases
      .map((c) => ({ c, date: parseDate(c.next_hearing) }))
      .filter((x): x is { c: LawyerCase; date: Date } => !!x.date && x.date.getTime() >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 12);
  }, [data]);

  const months = data.monthly_performance;
  const monthlyCases = months.map((m) => ({ label: m.month, value: m.cases }));
  const monthlyTasks = months.map((m) => ({ label: m.month, value: m.tasks_completed }));
  const casesAvg = months.length ? Math.round(months.reduce((s, m) => s + m.cases, 0) / months.length) : 0;
  const tasksAvg = months.length ? Math.round(months.reduce((s, m) => s + m.tasks_completed, 0) / months.length) : 0;

  const completionRate = data.task_stats.completion_rate;
  const presenceStatus = (presence?.status as PresenceStatus | undefined) || 'offline';

  // ─── أفعال ───

  const openWork = (next: WorkTab) => {
    setTab(next);
    requestAnimationFrame(() => revealWithin(workRef.current));
  };

  const openBucket = (b: BucketScope) => {
    setBucket(b);
    setCaseStatus('all');
    openWork('cases');
  };

  const openTasks = (scope: TasksScope) => {
    setTasksScope(scope);
    openWork('tasks');
  };

  const openExport = (initial?: Partial<ExportConfig>) => {
    setExportConfig(initial);
    setExportOpen(true);
  };

  return (
    <div className="pfv rc-scope" dir="rtl" data-layout={layout}>
      {/* ─── شريط الهوية (وفي وضع fit هو رأس الصفحة أيضاً) ─── */}
      <header className="pfv-id">
        {pageTitle && (
          <div className="pfv-id__page">
            <BarChart3 size={17} />
            <h1>{pageTitle}</h1>
          </div>
        )}
        <div className="pfv-id__avatar">
          {data.lawyer.avatar ? <img src={data.lawyer.avatar} alt="" /> : <span>{data.lawyer.name.charAt(0)}</span>}
        </div>
        <div className="pfv-id__info">
          <h2 className="pfv-id__name">{data.lawyer.name}</h2>
          <div className="pfv-id__meta">
            <span>{roleLabel(data.lawyer.role)}</span>
            {data.lawyer.email && (
              <span className="pfv-id__email">
                <Mail size={12} />
                {data.lawyer.email}
              </span>
            )}
          </div>
        </div>
        <div className="pfv-id__side">
          {live && (
            <span className="pfv-live" data-state={live} title="تتجدد الأرقام تلقائياً كل 30 ثانية">
              <i aria-hidden="true" />
              {live === 'updating' ? 'يتحدّث…' : 'محدَّث تلقائياً'}
            </span>
          )}
          <PresenceIndicator
            status={presenceStatus}
            lastActivityAgo={presence?.lastActivityAgo || undefined}
            size="medium"
            showLabel={true}
          />
          <button type="button" className="pfv-btn" onClick={() => openExport()}>
            <Download size={14} />
            تصدير تقرير
          </button>
        </div>
      </header>

      <div className="pfv-body">
      <div className="pfv-dash">
      {/* ─── بطاقات الأرقام ─── */}
      <div className="pfv-tiles" aria-label="أرقام سريعة">
          <StatTile
            label="قضايا نشطة"
            value={formatCount(data.active_cases.length)}
            hint={`من ${formatCount(data.cases.length)} قضية`}
            icon={<Briefcase size={15} />}
            trend={{ values: months.map((m) => m.cases), ariaLabel: 'القضايا الجديدة في آخر ستة أشهر' }}
            onClick={() => {
              setCaseStatus('active');
              openWork('cases');
            }}
          />
          <StatTile
            label="مهام منجزة"
            value={formatCount(data.task_stats.completed)}
            hint={`من ${formatCount(data.task_stats.total)} مهمة`}
            icon={<CheckCircle2 size={15} />}
            trend={{ values: months.map((m) => m.tasks_completed), ariaLabel: 'المهام المنجزة في آخر ستة أشهر' }}
            onClick={() => openTasks('completed')}
          />
          <StatTile
            label="مهام متأخرة"
            value={formatCount(taskCounts.overdue)}
            icon={<Clock size={15} />}
            status={
              taskCounts.overdue > 0
                ? { tone: 'critical', text: 'تحتاج متابعة', icon: <AlertTriangle size={13} /> }
                : { tone: 'good', text: 'لا متأخرات', icon: <CheckCircle2 size={13} /> }
            }
            onClick={() => openTasks('overdue')}
          />
          <StatTile
            label="قيمة العقود (ر.س)"
            value={formatCompact(contractsTotal)}
            hint={valuedCases > 0 ? `في ${formatCount(valuedCases)} قضية` : 'لا قيم مسجّلة'}
            icon={<Wallet size={15} />}
          />
      </div>

      {/* ─── اللوحات: موزّعة على الشبكة في الشاشات الطويلة، وعمود جانبي يتمرر داخلياً في القصيرة ─── */}
      <div className="pfv-rail">
        {/* إنجاز المهام — الرقم الذي تقود به الصفحة */}
        <article className="pfv-panel pfv-p--tasks">
          <PanelHead icon={<ListTodo size={15} />} title="إنجاز المهام" action="كل المهام" onAction={() => openTasks('all')} />
          <div className="pfv-hero">
            {/* dir=ltr: الرقم وعلامة النسبة كتلة واحدة لا يعيد ترتيبها اتجاه الصفحة */}
            <span className="pfv-hero__value" dir="ltr">
              {completionRate}
              <small>%</small>
            </span>
            <span className="pfv-hero__note">
              {formatCount(data.task_stats.completed)} منجزة من {formatCount(data.task_stats.total)}
            </span>
          </div>
          <Meter value={completionRate} tone={completionRate < 70 ? 'warning' : 'good'} ariaLabel="معدل إنجاز المهام" />
          <div className="pfv-panel__gap" />
          {/* الأخضر لا يجاور الأحمر: منجزة ⟵ قيد التنفيذ ⟵ معلّقة ⟵ متأخرة */}
          <SegmentBar
            ariaLabel="توزيع المهام بحسب الحالة"
            segments={[
              { key: 'completed', label: 'منجزة', value: taskCounts.completed, tone: 'good', icon: <CheckCircle2 size={12} /> },
              { key: 'progress', label: 'قيد التنفيذ', value: taskCounts.inProgress, tone: 'series1', icon: <CircleDot size={12} /> },
              { key: 'hold', label: 'معلّقة', value: taskCounts.onHold, tone: 'neutral', icon: <PauseCircle size={12} /> },
              { key: 'overdue', label: 'متأخرة', value: taskCounts.overdue, tone: 'critical', icon: <AlertTriangle size={12} /> },
            ]}
            emptyText="لا مهام بعد"
          />
        </article>

        <article className="pfv-panel pfv-p--outcomes">
          <PanelHead icon={<Trophy size={15} />} title="نتائج القضايا المغلقة" />
          {data.win_rate.total_closed === 0 ? (
            <p className="pfv-panel__empty">لا قضايا مغلقة بعد — تظهر النتائج هنا عند إغلاق أول قضية.</p>
          ) : (
            <>
              <div className="pfv-figure">
                <span className="pfv-figure__value" dir="ltr">
                  {data.win_rate.percentage}
                  <small>%</small>
                </span>
                <span className="pfv-figure__note">معدل الكسب من {formatCount(data.win_rate.total_closed)} مغلقة</span>
              </div>
              {/* مقياس قطبي: كسب ⟵ تسوية (منتصف محايد) ⟵ خسارة */}
              <SegmentBar
                ariaLabel="نتائج القضايا المغلقة"
                segments={[
                  { key: 'won', label: 'كسب', value: data.win_rate.won, tone: 'good', icon: <Trophy size={12} /> },
                  { key: 'settled', label: 'تسوية', value: data.win_rate.settled, tone: 'neutral', icon: <Handshake size={12} /> },
                  { key: 'lost', label: 'خسارة', value: data.win_rate.lost, tone: 'critical', icon: <XCircle size={12} /> },
                ]}
              />
            </>
          )}
        </article>

        <article className="pfv-panel pfv-p--buckets">
          <PanelHead icon={<Briefcase size={15} />} title="قضاياي بحسب دوري" />
          <BarList
            items={[
              { key: 'responsible', label: 'مسؤول عنها', value: bucketCounts.responsible, icon: <Star size={13} />, hint: 'عرض القضايا', onClick: () => openBucket('responsible') },
              { key: 'party', label: 'مكلف بها', value: bucketCounts.party, icon: <Gavel size={13} />, hint: 'عرض القضايا', onClick: () => openBucket('party') },
              { key: 'shared', label: 'مشارك فيها', value: bucketCounts.shared, icon: <Users size={13} />, hint: 'عرض القضايا', onClick: () => openBucket('shared') },
            ]}
          />
        </article>

        <article className="pfv-panel pfv-p--hearings">
          <PanelHead icon={<CalendarClock size={15} />} title="الجلسات القادمة" />
          {upcomingHearings.length === 0 ? (
            <p className="pfv-panel__empty">لا جلسات قادمة مسجّلة على قضاياك.</p>
          ) : (
            <ul className="pfv-hearings">
              {upcomingHearings.map(({ c, date }) => (
                <li key={c.id}>
                  <button type="button" className="pfv-hearing" onClick={() => navigate(`/cases/${c.id}`)}>
                    <span className="pfv-hearing__date" aria-hidden="true">
                      <b>{date.toLocaleDateString(DATE_LOCALE, { day: 'numeric' })}</b>
                      <i>{date.toLocaleDateString(DATE_LOCALE, { month: 'short' })}</i>
                    </span>
                    <span className="pfv-hearing__body">
                      <span className="pfv-hearing__title">{c.title || c.file_number || '—'}</span>
                      <span className="pfv-hearing__meta">
                        {c.client_name || '—'}
                        {c.file_number ? ` · ${c.file_number}` : ''}
                      </span>
                    </span>
                    <span className="pfv-hearing__when">{relativeDay(date)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="pfv-panel pfv-p--trend">
          <div className="pfv-panel__head">
            <h3>
              <span className="pfv-panel__icon" aria-hidden="true"><Activity size={15} /></span>
              الاتجاه في ستة أشهر
            </h3>
            {/* مقياسان مختلفا المدى = رسم لكلٍّ بمحوره (تبديل)، لا محوران على رسم واحد */}
            <div className="pfv-segmented pfv-segmented--mini" role="group" aria-label="المقياس">
              <Segment active={trendMetric === 'cases'} onClick={() => setTrendMetric('cases')} label="قضايا" />
              <Segment active={trendMetric === 'tasks'} onClick={() => setTrendMetric('tasks')} label="مهام" />
            </div>
          </div>
          <div className="pfv-trend">
            {trendMetric === 'cases' ? (
              <ColumnChart title="قضايا جديدة شهرياً" unit="قضية" data={monthlyCases} tone="series1" showHead={false} />
            ) : (
              <ColumnChart title="مهام منجزة شهرياً" unit="مهمة" data={monthlyTasks} tone="series2" showHead={false} />
            )}
          </div>
          <div className="pfv-trend__foot">
            <span>
              الإجمالي <b>{formatCount((trendMetric === 'cases' ? monthlyCases : monthlyTasks).reduce((sum, m) => sum + m.value, 0))}</b>
            </span>
            <span>
              المتوسط الشهري <b>{formatCount(trendMetric === 'cases' ? casesAvg : tasksAvg)}</b>
            </span>
          </div>
        </article>
      </div>

      {/* ─── مساحة العمل ─── */}
      <section className="pfv-work" ref={workRef}>
        <div className="pfv-tabs" role="tablist" aria-label="تفاصيل الأداء">
          <WorkTabButton current={tab} value="cases" onSelect={setTab} icon={<Briefcase size={14} />} label="القضايا" count={data.cases.length} />
          <WorkTabButton current={tab} value="tasks" onSelect={setTab} icon={<ListTodo size={14} />} label="المهام" count={data.tasks.length} />
          <WorkTabButton current={tab} value="attendance" onSelect={setTab} icon={<CalendarDays size={14} />} label="سجل الحضور" />
        </div>

        {tab === 'cases' && (
          <div className="pfv-pane">
            <div className="pfv-toolbar">
              <div className="pfv-segmented" role="group" aria-label="دوري في القضية">
                <Segment active={bucket === 'responsible'} onClick={() => { setBucket('responsible'); setCaseStatus('all'); }} label="مسؤول عنها" count={bucketCounts.responsible} />
                <Segment active={bucket === 'party'} onClick={() => { setBucket('party'); setCaseStatus('all'); }} label="مكلف بها" count={bucketCounts.party} />
                <Segment active={bucket === 'shared'} onClick={() => { setBucket('shared'); setCaseStatus('all'); }} label="مشارك فيها" count={bucketCounts.shared} />
              </div>
              <div className="pfv-segmented pfv-segmented--quiet" role="group" aria-label="حالة القضية">
                <Segment active={caseStatus === 'all'} onClick={() => setCaseStatus('all')} label="الكل" count={statusCounts.all} />
                <Segment active={caseStatus === 'active'} onClick={() => setCaseStatus('active')} label="نشطة" count={statusCounts.active} />
                <Segment active={caseStatus === 'closed'} onClick={() => setCaseStatus('closed')} label="مغلقة" count={statusCounts.closed} />
              </div>
              <div className="pfv-toolbar__end">
                <label className="pfv-search">
                  <Search size={13} />
                  <input
                    type="search"
                    placeholder="بحث في القضايا"
                    value={caseSearch}
                    onChange={(e) => setCaseSearch(e.target.value)}
                    data-dictate="off"
                  />
                </label>
                <button type="button" className="pfv-btn" onClick={() => quickExportActiveCases(data)} title="تصدير القضايا النشطة فوراً">
                  <FileSpreadsheet size={14} />
                  تصدير سريع
                </button>
                <button
                  type="button"
                  className="pfv-btn pfv-btn--primary"
                  onClick={() => openExport({ cases: { enabled: true, scope: bucketToExportScope(bucket, caseStatus) } })}
                >
                  <Download size={14} />
                  تخصيص التصدير
                </button>
              </div>
            </div>

            {visibleCases.length === 0 ? (
              <EmptyState icon={<Briefcase size={28} />} text={caseSearch ? 'لا نتائج لهذا البحث' : emptyBucketMessage(bucket, caseStatus)} />
            ) : (
              <div className="pfv-table-wrap">
                <table className="pfv-table">
                  <thead>
                    <tr>
                      <th className="pfv-col-num">#</th>
                      <th>القضية</th>
                      <th className="pfv-col-opt">رقم الملف</th>
                      <th className="pfv-col-opt">النوع</th>
                      <th>الأولوية</th>
                      <th>الحالة</th>
                      <th>النتيجة</th>
                      <th className="pfv-col-end">القيمة</th>
                      <th>الجلسة القادمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCases.map((c, i) => (
                      <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/cases/${c.id}`)}>
                        <td className="pfv-col-num">{i + 1}</td>
                        <td>
                          <span className="pfv-cell-title">
                            {(c.is_responsible ?? c.is_primary) && (
                              <Star size={12} className="pfv-cell-star" aria-label="المحامي المسؤول" />
                            )}
                            {c.title || '—'}
                          </span>
                          <span className="pfv-cell-sub">{c.client_name || '—'}</span>
                        </td>
                        <td className="pfv-cell-mono pfv-col-opt">{c.file_number || '—'}</td>
                        <td className="pfv-col-opt">{caseTypeLabel(c.case_type)}</td>
                        <td><Chip {...priorityChip(c.priority)} /></td>
                        <td><Chip {...caseStatusChip(c.status)} /></td>
                        <td><Chip {...outcomeChip(c.outcome)} /></td>
                        <td className="pfv-col-end pfv-cell-mono">{c.contract_value ? formatCount(c.contract_value) : '—'}</td>
                        <td className="pfv-cell-date">{formatDate(c.next_hearing)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'tasks' && (
          <div className="pfv-pane">
            <div className="pfv-toolbar">
              <div className="pfv-segmented" role="group" aria-label="نطاق المهام">
                <Segment active={tasksScope === 'overdue'} onClick={() => setTasksScope('overdue')} label="المتأخرة" count={taskCounts.overdue} />
                <Segment active={tasksScope === 'unfinished'} onClick={() => setTasksScope('unfinished')} label="غير المنجزة" />
                <Segment active={tasksScope === 'completed'} onClick={() => setTasksScope('completed')} label="المنجزة" count={taskCounts.completed} />
                <Segment active={tasksScope === 'all'} onClick={() => setTasksScope('all')} label="الكل" count={data.tasks.length} />
              </div>
              <div className="pfv-toolbar__end">
                <button
                  type="button"
                  className="pfv-btn pfv-btn--primary"
                  onClick={() => openExport({ cases: { enabled: false, scope: 'active' }, tasks: { enabled: true, scope: tasksScope } })}
                >
                  <Download size={14} />
                  تصدير المهام
                </button>
              </div>
            </div>

            {visibleTasks.length === 0 ? (
              <EmptyState icon={<ListTodo size={28} />} text={emptyTasksMessage(tasksScope)} />
            ) : (
              <div className="pfv-table-wrap">
                <table className="pfv-table">
                  <thead>
                    <tr>
                      <th className="pfv-col-num">#</th>
                      <th>المهمة</th>
                      <th>الأولوية</th>
                      <th>الموعد</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTasks.map((t, i) => (
                      <tr key={t.id} onClick={() => navigate(`/tasks/${t.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/tasks/${t.id}`)}>
                        <td className="pfv-col-num">{i + 1}</td>
                        <td>
                          <span className="pfv-cell-title">{t.title || '—'}</span>
                          {t.case && <span className="pfv-cell-sub">{t.case.file_number} — {t.case.title}</span>}
                        </td>
                        <td><Chip {...priorityChip(t.priority)} /></td>
                        <td className="pfv-cell-date">{formatDate(t.due_date)}</td>
                        <td><Chip {...taskStatusChip(t)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'attendance' && (
          <div className="pfv-pane">
            <div className="pfv-toolbar">
              <div className="pfv-segmented" role="group" aria-label="اليوم">
                <Segment active={presenceDate === isoDay(0)} onClick={() => setPresenceDate(isoDay(0))} label="اليوم" />
                <Segment active={presenceDate === isoDay(-1)} onClick={() => setPresenceDate(isoDay(-1))} label="أمس" />
              </div>
              <label className="pfv-date">
                <CalendarDays size={13} />
                <input type="date" value={presenceDate} max={isoDay(0)} onChange={(e) => setPresenceDate(e.target.value)} />
              </label>
            </div>

            {presenceLoading ? (
              <div className="pfv-skeleton pfv-skeleton--block" />
            ) : !presenceData ? (
              <EmptyState icon={<Activity size={28} />} text="لا سجلات حضور لهذا اليوم" />
            ) : (
              <div className="pfv-attendance">
                <div className="pfv-figure">
                  <span className="pfv-figure__value">{formatHours(presenceData.total_hours)}</span>
                  <span className="pfv-figure__note">إجمالي وقت الاتصال في {formatDate(presenceDate)}</span>
                </div>
                {/* يوم واحد = جزء من كل، لا عمود وحيد */}
                <SegmentBar
                  ariaLabel="توزيع وقت الاتصال"
                  segments={[
                    { key: 'active', label: 'نشط', value: Math.round(presenceData.total_active_hours * 60), valueLabel: formatHours(presenceData.total_active_hours), tone: 'series1' },
                    { key: 'idle', label: 'خامل', value: Math.round(presenceData.total_idle_hours * 60), valueLabel: formatHours(presenceData.total_idle_hours), tone: 'series2' },
                  ]}
                  emptyText="لا وقت مسجّل"
                />
              </div>
            )}
          </div>
        )}
      </section>
      </div>
      </div>

      {exportOpen && (
        <LawyerExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} data={data} initialConfig={exportConfig} />
      )}
    </div>
  );
};

// ─── مكوّنات صغيرة ───

const PanelHead: React.FC<{ icon: React.ReactNode; title: string; action?: string; onAction?: () => void }> = ({
  icon,
  title,
  action,
  onAction,
}) => (
  <div className="pfv-panel__head">
    <h3>
      <span className="pfv-panel__icon" aria-hidden="true">{icon}</span>
      {title}
    </h3>
    {action && onAction && (
      <button type="button" className="pfv-link" onClick={onAction}>
        {action}
      </button>
    )}
  </div>
);

const WorkTabButton: React.FC<{
  current: WorkTab;
  value: WorkTab;
  onSelect: (t: WorkTab) => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}> = ({ current, value, onSelect, icon, label, count }) => (
  <button
    type="button"
    role="tab"
    aria-selected={current === value}
    className={`pfv-tab ${current === value ? 'is-active' : ''}`}
    onClick={() => onSelect(value)}
  >
    {icon}
    {label}
    {count !== undefined && <span className="pfv-tab__count">{formatCount(count)}</span>}
  </button>
);

const Segment: React.FC<{ active: boolean; onClick: () => void; label: string; count?: number }> = ({
  active,
  onClick,
  label,
  count,
}) => (
  <button type="button" className={`pfv-seg ${active ? 'is-active' : ''}`} aria-pressed={active} onClick={onClick}>
    {label}
    {count !== undefined && <span className="pfv-seg__count">{formatCount(count)}</span>}
  </button>
);

type ChipTone = 'good' | 'critical' | 'warning' | 'info' | 'neutral';

/** الحالة = نقطة ملوّنة + نص بحبر الواجهة (النص لا يلبس لون الحالة) */
const Chip: React.FC<{ label: string; tone: ChipTone }> = ({ label, tone }) =>
  label === '—' ? <span className="pfv-cell-muted">—</span> : (
    <span className="pfv-chip" data-tone={tone}>
      <i aria-hidden="true" />
      {label}
    </span>
  );

const EmptyState: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="pfv-empty">
    {icon}
    <p>{text}</p>
  </div>
);

// ─── مساعدات ───

const isoDay = (offset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
};

function caseStatusChip(status: string): { label: string; tone: ChipTone } {
  const map: Record<string, { label: string; tone: ChipTone }> = {
    active: { label: 'نشطة', tone: 'info' },
    pending: { label: 'قيد النظر', tone: 'warning' },
    closed: { label: 'مغلقة', tone: 'neutral' },
    appealed: { label: 'مستأنفة', tone: 'warning' },
    settled: { label: 'مصالحة', tone: 'info' },
    dismissed: { label: 'مرفوضة', tone: 'critical' },
  };
  return map[status] || { label: status || '—', tone: 'neutral' };
}

function outcomeChip(outcome: string | null): { label: string; tone: ChipTone } {
  if (!outcome) return { label: '—', tone: 'neutral' };
  const map: Record<string, { label: string; tone: ChipTone }> = {
    won: { label: 'كسب', tone: 'good' },
    lost: { label: 'خسارة', tone: 'critical' },
    settled: { label: 'تسوية', tone: 'info' },
    appealed: { label: 'مستأنفة', tone: 'warning' },
    dismissed: { label: 'مرفوضة', tone: 'neutral' },
  };
  return map[outcome] || { label: outcome, tone: 'neutral' };
}

function priorityChip(priority: string | null): { label: string; tone: ChipTone } {
  if (!priority) return { label: '—', tone: 'neutral' };
  const map: Record<string, { label: string; tone: ChipTone }> = {
    urgent: { label: 'عاجلة', tone: 'critical' },
    high: { label: 'عالية', tone: 'warning' },
    medium: { label: 'متوسطة', tone: 'info' },
    low: { label: 'منخفضة', tone: 'neutral' },
  };
  return map[priority] || { label: priority, tone: 'neutral' };
}

function taskStatusChip(task: LawyerTask): { label: string; tone: ChipTone } {
  // «متأخرة» شرط من الموعد لا قيمة في العمود
  if (isTaskOverdue(task)) return { label: 'متأخرة', tone: 'critical' };
  const map: Record<string, { label: string; tone: ChipTone }> = {
    pending: { label: 'في الانتظار', tone: 'neutral' },
    in_progress: { label: 'قيد التنفيذ', tone: 'info' },
    completed: { label: 'منجزة', tone: 'good' },
    on_hold: { label: 'معلّقة', tone: 'neutral' },
  };
  return map[task.status] || { label: task.status, tone: 'neutral' };
}

function caseTypeLabel(type: string | null): string {
  if (!type) return '—';
  const map: Record<string, string> = {
    civil: 'مدنية', criminal: 'جنائية', commercial: 'تجارية', family: 'أسرية',
    labor: 'عمالية', administrative: 'إدارية', real_estate: 'عقارية',
    intellectual_property: 'ملكية فكرية', public_prosecution: 'نيابة عامة', police: 'شرطة', other: 'أخرى',
  };
  return map[type] || type;
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: 'مدير النظام', owner: 'مالك المكتب', partner: 'شريك', senior_lawyer: 'محامي أول',
    lawyer: 'محامي', legal_assistant: 'مساعد قانوني', assistant: 'مساعد',
  };
  return map[role] || role;
}

function emptyBucketMessage(bucket: BucketScope, status: StatusScope): string {
  const role = bucket === 'responsible' ? 'مسؤولاً عنها' : bucket === 'party' ? 'مكلفاً بها' : 'مشاركاً فيها';
  if (status === 'active') return `لا توجد قضايا نشطة يكون فيها ${role}.`;
  if (status === 'closed') return `لا توجد قضايا مغلقة يكون فيها ${role}.`;
  return `لا توجد قضايا يكون فيها ${role}.`;
}

/** نموذج التصدير الحالي لا يعرف نطاقَي «مكلف/مشارك» — يسقطان إلى الأقرب */
function bucketToExportScope(bucket: BucketScope, status: StatusScope): CasesScope {
  if (bucket === 'responsible') return 'responsible';
  if (status === 'active') return 'active';
  return 'all';
}

function emptyTasksMessage(scope: TasksScope): string {
  if (scope === 'overdue') return 'لا مهام متأخرة — كل شيء في موعده.';
  if (scope === 'completed') return 'لا مهام منجزة بعد.';
  if (scope === 'unfinished') return 'لا مهام غير منجزة.';
  return 'لا مهام مسندة.';
}

/** هيكل تحميل بشكل الصفحة نفسها — بلا قفزة تخطيط عند وصول البيانات */
export const PerformanceSkeleton: React.FC<{ layout?: 'fit' | 'flow' }> = ({ layout = 'flow' }) => (
  <div className="pfv rc-scope" dir="rtl" data-layout={layout} aria-busy="true" aria-label="جاري تحميل الأداء">
    <div className="pfv-id pfv-id--skeleton">
      <div className="pfv-skeleton pfv-skeleton--line" />
    </div>
    <div className="pfv-body">
      <div className="pfv-dash">
        <div className="pfv-tiles">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="pfv-skeleton pfv-skeleton--tile" />
          ))}
        </div>
        <div className="pfv-rail">
          <div className="pfv-skeleton pfv-skeleton--panel pfv-p--tasks" />
          <div className="pfv-skeleton pfv-skeleton--panel pfv-p--outcomes" />
          <div className="pfv-skeleton pfv-skeleton--panel pfv-p--buckets" />
          <div className="pfv-skeleton pfv-skeleton--panel pfv-p--hearings" />
          <div className="pfv-skeleton pfv-skeleton--panel pfv-p--trend" />
        </div>
        <div className="pfv-skeleton pfv-skeleton--work pfv-work" />
      </div>
    </div>
  </div>
);

export default PerformanceView;
