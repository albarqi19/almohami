import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../services/projectService';
import type { ProjectListFilters } from '../../services/projectService';
import type { ProjectCard, ProjectListSummary } from '../../types/projects';
import { PROJECT_STATUS_LABELS } from '../../types/projects';
import { Av, Chip, Health, PBar, daysFromToday, firstName, fmtDayMonth } from './ui';
import NewProjectWizard from './NewProjectWizard';

/**
 * قسم «المشاريع» داخل صفحة المهام والمشاريع: صفوف كثيفة (الاسم والرمز والعميل، المرحلة الجارية والموعد
 * القادم، التقدم، الصحة، المدير والموعد النهائي)، وملخص فوقها، و«جديد ← مشروع» يفتح المعالج.
 */
const ProjectsList: React.FC<{ canCreate: boolean; onNewTask?: () => void }> = ({ canCreate, onNewTask }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ProjectCard[]>([]);
  const [summary, setSummary] = useState<ProjectListSummary>({ open: 0, completed: 0, attention: 0, late: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ProjectListFilters['status']>('open');
  const [health, setHealth] = useState('');
  const [mine, setMine] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [wizard, setWizard] = useState(false);
  const reqRef = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqRef.current;
    setLoading(true);
    try {
      const res = await ProjectService.list({ status, health: health || undefined, mine, search: search.trim() || undefined, page, per_page: 30 });
      if (id !== reqRef.current) return;
      setItems(res.page.data); setLastPage(res.page.last_page); setTotal(res.page.total); setSummary(res.summary);
    } catch (e) { if (id === reqRef.current) toast.error(e instanceof Error ? e.message : 'تعذر جلب المشاريع'); }
    finally { if (id === reqRef.current) setLoading(false); }
  }, [status, health, mine, search, page]);
  useEffect(() => { const t = setTimeout(load, search ? 250 : 0); return () => clearTimeout(t); }, [load, search]);
  const pick = (s: ProjectListFilters['status'], h = '') => { setStatus(s); setHealth(h); setPage(1); };

  return (
    <div className="prj-list prj-scope">
      <div className="prj-list__toolbar">
        <div style={{ position: 'relative' }}>
          <input className="prj-in" style={{ width: 240 }} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="ابحث باسم المشروع أو رمزه أو العميل…" />
          <Search size={13} style={{ position: 'absolute', insetInlineEnd: 9, top: 9, color: 'var(--pj-ink-3)' }} />
        </div>
        <select className="prj-sel" value={status ?? ''} onChange={(e) => pick(e.target.value as ProjectListFilters['status'])}>
          <option value="open">المفتوحة</option>
          {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          <option value="">الكل</option>
        </select>
        <label className="prj-check"><input type="checkbox" checked={mine} onChange={(e) => { setMine(e.target.checked); setPage(1); }} /> مشاريعي فقط</label>
        <div className="prj-list__summary">
          <button type="button" className={`prj-sum ${status === 'open' && !health ? 'prj-sum--active' : ''}`} onClick={() => pick('open')}>مفتوحة <b>{summary.open}</b></button>
          <button type="button" className={`prj-sum prj-sum--attention ${health === 'attention' ? 'prj-sum--active' : ''}`} onClick={() => pick('open', 'attention')}>تحتاج انتباهاً <b>{summary.attention}</b></button>
          <button type="button" className={`prj-sum prj-sum--late ${health === 'late' ? 'prj-sum--active' : ''}`} onClick={() => pick('open', 'late')}>متأخرة <b>{summary.late}</b></button>
          <button type="button" className={`prj-sum ${status === 'completed' ? 'prj-sum--active' : ''}`} onClick={() => pick('completed')}>مكتملة <b>{summary.completed}</b></button>
        </div>
        {canCreate && <button type="button" className="prj-btn prj-btn--primary" onClick={() => setWizard(true)}><Plus size={13} /> مشروع جديد</button>}
      </div>

      {loading && items.length === 0 ? <div className="prj-empty">جارٍ التحميل…</div> : items.length === 0 ? (
        <div className="prj-empty" style={{ padding: '40px 16px' }}>
          <FolderKanban size={36} style={{ opacity: 0.25, display: 'block', margin: '0 auto 8px' }} />
          <b style={{ display: 'block', color: 'var(--pj-ink)', fontSize: 14 }}>{search || health || status !== 'open' ? 'لا مشاريع مطابقة' : 'لا مشاريع بعد'}</b>
          <span>المشروع يجمع قضايا وخدمات واجتماعات ومهام كثيرة في خطة واحدة بمراحل ومواعيد وقرارات.</span>
          {canCreate && !search && status === 'open' && !health && <div style={{ marginTop: 10 }}><button type="button" className="prj-btn prj-btn--primary" onClick={() => setWizard(true)}><Plus size={13} /> أنشئ أول مشروع</button></div>}
        </div>
      ) : (
        <>
          <div className="prj-rows__head"><span /><span>المشروع</span><span>المرحلة الجارية · الموعد القادم</span><span>التقدم</span><span>الحالة</span><span>المدير · الموعد النهائي</span></div>
          <div>
            {items.map((p) => {
              const next = daysFromToday(p.next_milestone?.date);
              const target = daysFromToday(p.target_end_date);
              return (
                <button type="button" key={p.id} className={`prj-prow-row prj-color-${p.color}`} onClick={() => navigate(`/tasks/projects/${p.id}`)}>
                  <span className="prj-dot" />
                  <span className="prj-prow-row__col">
                    <span className="prj-prow-row__name">{p.name}</span>
                    <span className="prj-prow-row__sub"><span className="prj-code">{p.code}</span>{p.client ? <span>{p.client.name}</span> : null}{p.status !== 'active' ? <Chip tone="todo">{p.status_label}</Chip> : null}</span>
                  </span>
                  <span className="prj-prow-row__col">
                    <span>{p.current_phase ? `${p.current_phase.order}. ${p.current_phase.name}` : (p.phases_total ? 'لا مرحلة جارية' : 'بلا مراحل')}</span>
                    {p.next_milestone && <small>{p.next_milestone.name} · {fmtDayMonth(p.next_milestone.date)}{next ? ` (${next.label})` : ''}</small>}
                  </span>
                  <span className="prj-prow-row__col">
                    <PBar value={p.progress} width="100%" tone={p.health === 'late' ? 'bad' : p.health === 'attention' ? 'warn' : ''} />
                    <small className="num">{p.progress}٪ · {p.tasks_done}/{p.tasks_total} مهمة · {p.phases_done}/{p.phases_total} مراحل</small>
                  </span>
                  <span className="prj-prow-row__col">
                    <Health health={p.health} reasons={p.health_reasons} />
                    {p.tasks_late > 0 && <small style={{ color: 'var(--pj-bad)', fontWeight: 700 }}>{p.tasks_late} متأخرة</small>}
                  </span>
                  <span className="prj-prow-row__col">
                    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>{p.manager ? <><Av name={p.manager.name} /> {firstName(p.manager.name)}</> : '—'}</span>
                    <small className="num">{p.target_end_date ? `${fmtDayMonth(p.target_end_date)}${target && target.days < 0 && p.status === 'active' ? ' · تجاوز الموعد' : target ? ` · ${target.label}` : ''}` : 'بلا موعد نهائي'}</small>
                  </span>
                </button>
              );
            })}
          </div>
          {lastPage > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', padding: 12 }}>
              <button type="button" className="prj-btn prj-btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</button>
              <span className="prj-dim num">صفحة {page} من {lastPage} · {total} مشروع</span>
              <button type="button" className="prj-btn prj-btn--sm" disabled={page >= lastPage} onClick={() => setPage(page + 1)}>التالي</button>
            </div>
          )}
        </>
      )}

      {wizard && (
        <NewProjectWizard
          onClose={() => setWizard(false)}
          onSwitchToTask={onNewTask}
          onCreated={(project, _applied, planError) => { setWizard(false); if (planError) toast.warn(`أُنشئ المشروع لكن تعذر تطبيق الخطة: ${planError}`); navigate(`/tasks/projects/${project.id}`); }}
        />
      )}
    </div>
  );
};

export default ProjectsList;
