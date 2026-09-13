import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../services/projectService';
import type { ProjectListFilters } from '../../services/projectService';
import type { ProjectCard, ProjectListSummary } from '../../types/projects';
import { PROJECT_STATUS_LABELS } from '../../types/projects';
import { Bar, HealthChip, daysFromToday, fmtDate } from './ui';
import NewProjectWizard from './NewProjectWizard';

/**
 * قسم «المشاريع» داخل صفحة المهام والمشاريع: قائمة كثيفة بصفوف، ملخص أعلى، ومعالج الإنشاء.
 * الفتح يذهب إلى غرفة المشروع /tasks/projects/:id.
 */
const ProjectsList: React.FC<{ canCreate: boolean }> = ({ canCreate }) => {
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
      setItems(res.page.data);
      setLastPage(res.page.last_page);
      setTotal(res.page.total);
      setSummary(res.summary);
    } catch (e) {
      if (id === reqRef.current) toast.error(e instanceof Error ? e.message : 'تعذر جلب المشاريع');
    } finally {
      if (id === reqRef.current) setLoading(false);
    }
  }, [status, health, mine, search, page]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const pick = (s: ProjectListFilters['status'], h = '') => { setStatus(s); setHealth(h); setPage(1); };

  return (
    <div className="prj-list">
      <div className="prj-list__toolbar">
        <div style={{ position: 'relative' }}>
          <input className="ssp2-input" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="ابحث باسم المشروع أو رمزه أو العميل…" />
          <Search size={13} style={{ position: 'absolute', insetInlineEnd: 9, top: 8, color: 'var(--color-text-secondary)' }} />
        </div>
        <select className="ssp2-input" style={{ width: 'auto' }} value={status ?? ''} onChange={(e) => pick(e.target.value as ProjectListFilters['status'])}>
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
        {canCreate && (
          <button type="button" className="ssp2-btn ssp2-btn--primary" onClick={() => setWizard(true)}><Plus size={14} /> مشروع جديد</button>
        )}
      </div>

      {loading && items.length === 0 ? (
        <div className="prj-empty">جارٍ التحميل…</div>
      ) : items.length === 0 ? (
        <div className="prj-empty">
          <FolderKanban size={40} style={{ opacity: 0.2, margin: '0 auto 10px' }} />
          <h3>{search || health || status !== 'open' ? 'لا مشاريع مطابقة' : 'لا مشاريع بعد'}</h3>
          <p style={{ margin: 0 }}>المشروع يجمع قضايا وخدمات واجتماعات ومهام كثيرة في خطة واحدة بمراحل ومواعيد وقرارات.</p>
          {canCreate && !search && status === 'open' && !health && (
            <button type="button" className="ssp2-btn ssp2-btn--primary" onClick={() => setWizard(true)}><Plus size={14} /> أنشئ أول مشروع</button>
          )}
        </div>
      ) : (
        <>
          <div className="prj-rows__head">
            <span />
            <span>المشروع</span>
            <span>المرحلة الجارية · الموعد القادم</span>
            <span>التقدم</span>
            <span>الحالة</span>
            <span>المدير · الهدف</span>
          </div>
          <div className="prj-rows">
            {items.map((p) => {
              const next = daysFromToday(p.next_milestone?.date);
              const target = daysFromToday(p.target_end_date);
              return (
                <button type="button" key={p.id} className={`prj-row prj-color-${p.color}`} onClick={() => navigate(`/tasks/projects/${p.id}`)}>
                  <span className="prj-dot" />
                  <div className="prj-row__title">
                    <span className="prj-row__name">{p.name}</span>
                    <span className="prj-row__sub"><span className="prj-row__code">{p.code}</span>{p.client ? ` · ${p.client.name}` : ''}{p.status !== 'active' ? ` · ${p.status_label}` : ''}</span>
                  </div>
                  <div className="prj-row__phase">
                    <span>{p.current_phase ? `${p.current_phase.order}. ${p.current_phase.name}` : (p.phases_total ? 'لا مرحلة جارية' : 'بلا مراحل')}</span>
                    {p.next_milestone && <small>{p.next_milestone.name} · {fmtDate(p.next_milestone.date)}{next ? ` (${next.label})` : ''}</small>}
                  </div>
                  <div className="prj-row__progress">
                    <Bar value={p.progress} tone={p.health === 'late' ? 'late' : p.health === 'attention' ? 'attention' : ''} />
                    <span>{p.progress}٪ · {p.tasks_done}/{p.tasks_total} مهمة · {p.phases_done}/{p.phases_total} مراحل</span>
                  </div>
                  <div className="prj-row__meta">
                    <HealthChip health={p.health} reasons={p.health_reasons} />
                    {p.tasks_late > 0 && <span style={{ color: 'var(--status-red)', fontWeight: 700 }}>{p.tasks_late} متأخرة</span>}
                  </div>
                  <div className="prj-row__meta">
                    <span>{p.manager?.name ?? '—'}</span>
                    <span>{p.target_end_date ? `${fmtDate(p.target_end_date)}${target && target.days < 0 && p.status === 'active' ? ' · تجاوز الهدف' : ''}` : 'بلا هدف'}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {lastPage > 1 && (
            <div className="load-more-container" style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: 12 }}>
              <button type="button" className="ssp2-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</button>
              <span className="prj-muted" style={{ alignSelf: 'center' }}>صفحة {page} من {lastPage} · {total} مشروع</span>
              <button type="button" className="ssp2-btn" disabled={page >= lastPage} onClick={() => setPage(page + 1)}>التالي</button>
            </div>
          )}
        </>
      )}

      {wizard && (
        <NewProjectWizard
          onClose={() => setWizard(false)}
          onCreated={(project, _applied, planError) => {
            setWizard(false);
            if (planError) toast.warn(`أُنشئ المشروع لكن تعذر تطبيق الخطة: ${planError}`);
            navigate(`/tasks/projects/${project.id}`);
          }}
        />
      )}
    </div>
  );
};

export default ProjectsList;
