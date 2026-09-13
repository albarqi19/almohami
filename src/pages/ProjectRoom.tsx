import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, BookTemplate, Bot, Calendar, ChevronRight, ChevronsLeft, ChevronsRight, Clock, Coins, Download, FileText, Flag, FolderKanban,
  Layers, Link2, ListChecks, MessageSquare, MoreHorizontal, Package, Pencil, Scale, Share2, Trash2, Users, Zap,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { usePermissionContext } from '../contexts/PermissionContext';
import { ProjectService } from '../services/projectService';
import type { UpdateProjectInput } from '../services/projectService';
import type { ProjectFull, ProjectOverview, ProjectTemplateSummary, RoleMap } from '../types/projects';
import { PROJECT_COLORS, PROJECT_COLOR_LABELS, PROJECT_CONFIDENTIALITY_LABELS, PROJECT_PRIORITY_LABELS, PROJECT_ROLE_LABELS, PROJECT_STATUS_LABELS } from '../types/projects';
import { RoomContext, type SectionKey } from '../components/projects/room/RoomContext';
import { Bar, Chip, ClientPicker, ErrorBox, Field, HealthChip, Modal, UserMultiSelect, UserSelect, daysFromToday, fmtDate, useOfficeUsers } from '../components/projects/ui';
import OverviewSection from '../components/projects/room/OverviewSection';
import TimelineSection from '../components/projects/room/TimelineSection';
import PhasesSection from '../components/projects/room/PhasesSection';
import RecordsSection from '../components/projects/room/RecordsSection';
import DeliverablesSection from '../components/projects/room/DeliverablesSection';
import DocumentsSection from '../components/projects/room/DocumentsSection';
import PeopleSection from '../components/projects/room/PeopleSection';
import EventsSection from '../components/projects/room/EventsSection';
import MoneySection from '../components/projects/room/MoneySection';
import ClientSection from '../components/projects/room/ClientSection';
import FeedSection from '../components/projects/room/FeedSection';
import ReportsSection from '../components/projects/room/ReportsSection';
import ChatSection from '../components/projects/room/ChatSection';
import AskSection from '../components/projects/room/AskSection';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (projects.css + بدائيّات ssp2-*)

const SECTIONS: Array<{ key: SectionKey; label: string; icon: React.ReactNode; group: string }> = [
  { key: 'overview', label: 'نظرة عامة', icon: <Layers size={14} />, group: 'المتابعة' },
  { key: 'timeline', label: 'الجدول الزمني', icon: <Calendar size={14} />, group: 'المتابعة' },
  { key: 'phases', label: 'المراحل والمهام', icon: <ListChecks size={14} />, group: 'المتابعة' },
  { key: 'feed', label: 'الخط الزمني', icon: <Clock size={14} />, group: 'المتابعة' },
  { key: 'issues', label: 'المسائل القانونية', icon: <Flag size={14} />, group: 'السجلات' },
  { key: 'risks', label: 'المخاطر', icon: <Zap size={14} />, group: 'السجلات' },
  { key: 'decisions', label: 'القرارات', icon: <Scale size={14} />, group: 'السجلات' },
  { key: 'deliverables', label: 'المخرجات', icon: <Package size={14} />, group: 'السجلات' },
  { key: 'documents', label: 'المستندات', icon: <FileText size={14} />, group: 'السجلات' },
  { key: 'people', label: 'الأشخاص', icon: <Users size={14} />, group: 'الأطراف' },
  { key: 'events', label: 'الارتباطات والجلسات', icon: <Link2 size={14} />, group: 'الأطراف' },
  { key: 'client', label: 'العميل والمشاركة', icon: <Share2 size={14} />, group: 'الأطراف' },
  { key: 'money', label: 'الوقت والمال', icon: <Coins size={14} />, group: 'الأطراف' },
  { key: 'reports', label: 'التقارير', icon: <FileText size={14} />, group: 'التواصل' },
  { key: 'chat', label: 'محادثة المشروع', icon: <MessageSquare size={14} />, group: 'التواصل' },
  { key: 'ask', label: 'اسأل رائد', icon: <Bot size={14} />, group: 'التواصل' },
];

/**
 * غرفة المشروع — بالنمط الملتصق: ترويسة بحقائق، قائمة أقسام يمين، العمل وسط، وعمود انتباه يسار.
 * المسار: /tasks/projects/:projectId (داخل صفحة «المهام والمشاريع»، بلا صفحة جديدة في القائمة).
 */
const ProjectRoom: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { has } = usePermissionContext();
  const { users } = useOfficeUsers();
  const id = Number(projectId);

  const [project, setProject] = useState<ProjectFull | null>(null);
  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ remaining: number; cap: number; enabled: boolean } | null>(null);
  const [navMin, setNavMin] = useState(() => localStorage.getItem('prj_nav_min') === '1');
  const [sideMin, setSideMin] = useState(() => localStorage.getItem('prj_side_min') === '1');
  const [menu, setMenu] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [templateModal, setTemplateModal] = useState<'apply' | 'save' | null>(null);
  const [deleting, setDeleting] = useState(false);

  const section = (params.get('s') as SectionKey) || 'overview';
  const goTo = useCallback((s: SectionKey) => { setParams((p) => { const n = new URLSearchParams(p); n.set('s', s); return n; }); }, [setParams]);
  const openTask = useCallback((taskId: number) => navigate(`/tasks/${taskId}`), [navigate]);

  const load = useCallback(async () => {
    try {
      const [p, o] = await Promise.all([ProjectService.get(id), ProjectService.overview(id)]);
      setProject(p);
      setOverview(o);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر فتح المشروع');
    }
  }, [id]);

  useEffect(() => { if (Number.isFinite(id)) load(); }, [id, load]);
  useEffect(() => { ProjectService.aiQuota().then(setQuota).catch(() => setQuota(null)); }, []);

  const reloadOverview = useCallback(async () => { try { setOverview(await ProjectService.overview(id)); } catch { /* الترويسة تكفي */ } }, [id]);
  const refresh = useCallback(async () => { await load(); }, [load]);

  const canEdit = !!project?.can.edit;
  const canApprove = !!project?.can.approve;
  const ctx = useMemo(() => (project ? { project, refresh, users, canEdit, canApprove, goTo, openTask } : null), [project, refresh, users, canEdit, canApprove, goTo, openTask]);

  const toggleNav = () => { setNavMin((v) => { localStorage.setItem('prj_nav_min', v ? '0' : '1'); return !v; }); };
  const toggleSide = () => { setSideMin((v) => { localStorage.setItem('prj_side_min', v ? '0' : '1'); return !v; }); };

  const changeStatus = async (status: string) => {
    if (!project) return;
    try { await ProjectService.update(project.id, { status }); toast.success('حُدثت الحالة'); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر التحديث'); }
  };

  const exportPlan = async () => {
    if (!project) return;
    try {
      const plan = await ProjectService.exportPlan(project.id);
      const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${project.code}-plan.json`; a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر التصدير'); }
  };

  const remove = async () => {
    if (!project) return;
    if (!window.confirm(`حذف المشروع «${project.name}»؟ مهامه تبقى مهاماً عادية ولا تُحذف.`)) return;
    setDeleting(true);
    try { await ProjectService.remove(project.id); toast.success('حُذف المشروع'); navigate('/tasks?view=projects'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); setDeleting(false); }
  };

  if (error) {
    return <div className="ssp2-page" dir="rtl"><div className="prj-empty"><h3>{error}</h3><button type="button" className="ssp2-btn" onClick={() => navigate('/tasks?view=projects')}>عودة إلى المشاريع</button></div></div>;
  }
  if (!project || !ctx) return <div className="ssp2-page" dir="rtl"><div className="prj-empty">جارٍ فتح غرفة المشروع…</div></div>;

  const nextMs = project.next_milestone ? daysFromToday(project.next_milestone.date) : null;
  const target = daysFromToday(project.target_end_date);
  const n = overview?.numbers;
  const counts: Partial<Record<SectionKey, { v: number; tone?: 'bad' | 'warn' }>> = {
    phases: { v: n?.tasks_late ?? project.tasks_late, tone: 'bad' },
    issues: { v: n?.issues_open ?? 0, tone: 'warn' },
    risks: { v: n?.risks_high ?? 0, tone: 'warn' },
    decisions: { v: n?.decisions_pending ?? 0, tone: 'warn' },
    deliverables: { v: n?.deliverables_in_progress ?? 0 },
    documents: { v: n?.documents ?? 0 },
    people: { v: n?.people ?? project.members.length },
    events: { v: project.links.length },
  };

  const renderSection = () => {
    switch (section) {
      case 'timeline': return <TimelineSection />;
      case 'phases': return <PhasesSection />;
      case 'issues': return <RecordsSection kind="issues" />;
      case 'risks': return <RecordsSection kind="risks" />;
      case 'decisions': return <RecordsSection kind="decisions" />;
      case 'deliverables': return <DeliverablesSection />;
      case 'documents': return <DocumentsSection />;
      case 'people': return <PeopleSection />;
      case 'events': return <EventsSection />;
      case 'money': return <MoneySection />;
      case 'client': return <ClientSection />;
      case 'feed': return <FeedSection />;
      case 'reports': return <ReportsSection />;
      case 'chat': return <ChatSection />;
      case 'ask': return <AskSection quota={quota} />;
      default: return <OverviewSection overview={overview} reload={reloadOverview} />;
    }
  };
  const current = SECTIONS.find((s) => s.key === section) ?? SECTIONS[0];

  return (
    <RoomContext.Provider value={ctx}>
      <div className={`ssp2-page prj-room prj-color-${project.color}`} dir="rtl">
        <header className="ssp2-header">
          <div className="ssp2-header__top">
            <div className="ssp2-header__info prj-room__title">
              <button type="button" className="ssp2-icon-btn" onClick={() => navigate('/tasks?view=projects')} title="عودة إلى المشاريع"><ChevronRight size={17} /></button>
              <span className="ssp2-header__badge"><FolderKanban size={13} /> غرفة المشروع</span>
              <span className="prj-room__code">{project.code}</span>
              <h1 className="ssp2-header__title">{project.name}</h1>
              {project.client && <span className="ssp2-header__client">{project.client.name}</span>}
              <HealthChip health={project.health} reasons={project.health_reasons} />
              <Chip tone={project.priority === 'critical' || project.priority === 'high' ? 'bad' : 'muted'}>{PROJECT_PRIORITY_LABELS[project.priority]}</Chip>
            </div>
            <div className="prj-room__actions">
              <span className="prj-room__progress"><Bar value={project.progress} tone={project.health === 'late' ? 'late' : project.health === 'attention' ? 'attention' : ''} />{project.progress}٪</span>
              {canEdit ? (
                <select className="ssp2-input" style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }} value={project.status} onChange={(e) => changeStatus(e.target.value)} title="حالة المشروع">
                  {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              ) : <Chip tone="navy">{project.status_label}</Chip>}
              <button type="button" className="ssp2-btn" onClick={() => goTo('ask')}><Bot size={13} /> اسأل رائد</button>
              <button type="button" className="ssp2-btn" onClick={() => goTo('client')}><Share2 size={13} /> مشاركة</button>
              {canEdit && <button type="button" className="ssp2-btn" onClick={() => setEditModal(true)}><Pencil size={13} /> تعديل</button>}
              <div style={{ position: 'relative' }}>
                <button type="button" className="ssp2-icon-btn" onClick={() => setMenu((m) => !m)} title="المزيد"><MoreHorizontal size={16} /></button>
                {menu && (
                  <div className="prj-picker__list" style={{ insetInlineStart: 'auto', insetInlineEnd: 0, minWidth: 220 }} onMouseLeave={() => setMenu(false)}>
                    {canEdit && <button type="button" className="prj-picker__item" onClick={() => { setMenu(false); setTemplateModal('apply'); }}><BookTemplate size={12} /> تطبيق قالب على المشروع</button>}
                    {canEdit && <button type="button" className="prj-picker__item" onClick={() => { setMenu(false); setTemplateModal('save'); }}><BookTemplate size={12} /> حفظ كقالب للمكتب</button>}
                    <button type="button" className="prj-picker__item" onClick={() => { setMenu(false); exportPlan(); }}><Download size={12} /> تصدير الخطة (JSON)</button>
                    <button type="button" className="prj-picker__item" onClick={async () => { setMenu(false); try { await ProjectService.recompute(project.id); await load(); toast.success('أُعيد الحساب'); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر'); } }}>إعادة حساب الصحة والتقدم</button>
                    {project.can.delete && <button type="button" className="prj-picker__item" style={{ color: 'var(--status-red)' }} disabled={deleting} onClick={() => { setMenu(false); remove(); }}><Trash2 size={12} /> حذف المشروع</button>}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="ssp2-header__facts">
            <span className="ssp2-fact"><span className="ssp2-fact__label">المدير</span><b>{project.manager?.name ?? '—'}</b></span>
            <span className="ssp2-fact__sep" />
            <span className="ssp2-fact"><span className="ssp2-fact__label">الشريك</span><b>{project.partner?.name ?? '—'}</b></span>
            <span className="ssp2-fact__sep" />
            <span className="ssp2-fact"><span className="ssp2-fact__label">البداية</span><b>{fmtDate(project.start_date)}</b></span>
            <span className="ssp2-fact__sep" />
            <span className="ssp2-fact"><span className="ssp2-fact__label">الهدف</span><b style={target && target.days < 0 && project.status === 'active' ? { color: 'var(--status-red)' } : undefined}>{project.target_end_date ? `${fmtDate(project.target_end_date)} (${target?.label})` : '—'}</b></span>
            <span className="ssp2-fact__sep" />
            <span className="ssp2-fact"><span className="ssp2-fact__label">المرحلة الجارية</span><b>{project.current_phase ? `${project.current_phase.order}. ${project.current_phase.name}` : '—'}</b></span>
            <span className="ssp2-fact__sep" />
            <span className="ssp2-fact"><span className="ssp2-fact__label">الموعد القادم</span><b>{project.next_milestone ? `${project.next_milestone.name} · ${fmtDate(project.next_milestone.date)}${nextMs ? ` (${nextMs.label})` : ''}` : '—'}</b></span>
            <span className="ssp2-fact__sep" />
            <span className="ssp2-fact"><span className="ssp2-fact__label">المهام</span><b>{project.tasks_done}/{project.tasks_total}{project.tasks_late ? <span style={{ color: 'var(--status-red)' }}> · {project.tasks_late} متأخرة</span> : null}</b></span>
            <span className="ssp2-fact__sep" />
            <span className="ssp2-fact"><span className="ssp2-fact__label">يراه</span><b>{PROJECT_CONFIDENTIALITY_LABELS[project.confidentiality]}</b></span>
          </div>
        </header>

        <div className="ssp2-layout">
          <nav className={`prj-nav ${navMin ? 'prj-nav--min' : ''}`} aria-label="أقسام المشروع">
            {navMin ? (
              <div className="prj-nav__mini">
                <button type="button" className="ssp2-icon-btn" onClick={toggleNav} title="توسيع القائمة"><ChevronsLeft size={15} /></button>
                {SECTIONS.map((s) => <button type="button" key={s.key} className={`ssp2-icon-btn ${section === s.key ? 'ssp2-icon-btn--active' : ''}`} title={s.label} onClick={() => goTo(s.key)}>{s.icon}</button>)}
              </div>
            ) : (
              <>
                <div className="prj-nav__group" style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 6px' }}><button type="button" className="ssp2-icon-btn" onClick={toggleNav} title="طي القائمة"><ChevronsRight size={15} /></button></div>
                {Array.from(new Set(SECTIONS.map((s) => s.group))).map((g) => (
                  <div key={g} className="prj-nav__group">
                    <div className="prj-nav__label">{g}</div>
                    {SECTIONS.filter((s) => s.group === g).map((s) => {
                      const c = counts[s.key];
                      return (
                        <button type="button" key={s.key} className={`prj-nav__item ${section === s.key ? 'prj-nav__item--active' : ''}`} onClick={() => goTo(s.key)}>
                          {s.icon}<span>{s.label}</span>
                          {c && c.v > 0 && <span className={`prj-nav__count ${c.tone ? `prj-nav__count--${c.tone}` : ''}`}>{c.v}</span>}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </>
            )}
          </nav>

          <main className="prj-main">
            <div className="prj-main__head"><h2>{current.icon} {current.label}</h2></div>
            <div className="prj-main__scroll">{renderSection()}</div>
          </main>

          <aside className={`prj-side ${sideMin ? 'prj-side--min' : ''}`}>
            {sideMin ? (
              <button type="button" className="ssp2-chatcol__reopen" onClick={toggleSide} title="إظهار عمود الانتباه"><ChevronsRight size={15} /><span style={{ writingMode: 'vertical-rl', fontSize: 11.5, fontWeight: 700 }}>الانتباه والفريق</span></button>
            ) : (
              <>
                <div className="ssp2-card">
                  <div className="ssp2-card__head"><span className="ssp2-card__title"><AlertTriangle size={13} /> يحتاج انتباهاً</span><button type="button" className="ssp2-icon-btn" onClick={toggleSide} title="طي"><ChevronsLeft size={14} /></button></div>
                  <div className="prj-attn">
                    {(overview?.attention ?? []).length === 0 && <div className="ssp2-empty">لا شيء عاجل.</div>}
                    {(overview?.attention ?? []).slice(0, 6).map((a, i) => (
                      <div key={i} className={`prj-attn__item prj-attn__item--${a.severity}`}><AlertTriangle size={12} /><span>{a.kind === 'task' && a.id ? <button type="button" onClick={() => openTask(a.id!)}>{a.text}</button> : a.text}</span></div>
                    ))}
                  </div>
                </div>
                <div className="ssp2-card">
                  <div className="ssp2-card__head"><span className="ssp2-card__title"><Calendar size={13} /> القادم</span></div>
                  <div className="prj-attn">
                    {(overview?.upcoming ?? []).length === 0 && <div className="ssp2-empty">لا مواعيد قريبة.</div>}
                    {(overview?.upcoming ?? []).slice(0, 6).map((u) => { const d = daysFromToday(u.at); return (
                      <div key={u.key} className="prj-attn__item prj-attn__item--info"><Clock size={12} /><span><b style={{ fontWeight: 700 }}>{d?.label}</b> · {u.subject_type === 'task' && u.subject_id ? <button type="button" onClick={() => openTask(u.subject_id!)}>{u.title}</button> : u.title}</span></div>
                    ); })}
                  </div>
                </div>
                <div className="ssp2-card">
                  <div className="ssp2-card__head"><span className="ssp2-card__title"><Users size={13} /> الفريق</span><button type="button" className="prj-link" style={{ fontSize: 11 }} onClick={() => goTo('people')}>الكل</button></div>
                  <div>
                    {project.members.slice(0, 8).map((m) => <div key={m.id} className="prj-person" style={{ padding: '5px 12px' }}><span className="prj-person__avatar" style={{ width: 24, height: 24, fontSize: 10.5 }}>{m.name.slice(0, 2)}</span><div><div className="prj-person__name" style={{ fontSize: 12 }}>{m.name}</div><div className="prj-person__role">{m.role_label}</div></div></div>)}
                    {project.members.length === 0 && <div className="ssp2-empty">بلا فريق بعد.</div>}
                  </div>
                </div>
                {project.links.length > 0 && (
                  <div className="ssp2-card">
                    <div className="ssp2-card__head"><span className="ssp2-card__title"><Link2 size={13} /> المرتبط</span><button type="button" className="prj-link" style={{ fontSize: 11 }} onClick={() => goTo('events')}>الكل</button></div>
                    <div>{project.links.slice(0, 6).map((l) => <div key={l.id} className="prj-person" style={{ padding: '5px 12px' }}><Chip tone="muted">{l.type_label}</Chip><span style={{ fontSize: 12, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.label}</span></div>)}</div>
                  </div>
                )}
              </>
            )}
          </aside>
        </div>

        {editModal && <EditProjectModal project={project} onClose={() => setEditModal(false)} onSaved={async () => { setEditModal(false); await load(); }} />}
        {templateModal === 'apply' && <ApplyTemplateModal project={project} users={users} currentUserId={user ? Number(user.id) : null} onClose={() => setTemplateModal(null)} onDone={async () => { setTemplateModal(null); await load(); }} />}
        {templateModal === 'save' && <SaveTemplateModal project={project} onClose={() => setTemplateModal(null)} />}
      </div>
    </RoomContext.Provider>
  );
};

const EditProjectModal: React.FC<{ project: ProjectFull; onClose: () => void; onSaved: () => Promise<void> }> = ({ project, onClose, onSaved }) => {
  const { users } = useOfficeUsers();
  const [f, setF] = useState<UpdateProjectInput & { client: { id: number; name: string } | null }>({
    name: project.name, description: project.description ?? '', color: project.color, priority: project.priority, confidentiality: project.confidentiality,
    partner_id: project.partner?.id ?? null, manager_id: project.manager?.id ?? null, start_date: project.start_date ?? '', target_end_date: project.target_end_date ?? '', client: project.client,
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.name?.trim()) { setErr('الاسم مطلوب'); return; }
    setBusy(true);
    try {
      const { client, ...rest } = f;
      await ProjectService.update(project.id, { ...rest, name: f.name!.trim(), description: f.description || null, client_id: client?.id ?? null, start_date: f.start_date || null, target_end_date: f.target_end_date || null });
      toast.success('حُفظ'); await onSaved();
    } catch (e) { setErr(e instanceof Error ? e.message : 'تعذر الحفظ'); }
    finally { setBusy(false); }
  };
  return (
    <Modal title="تعديل المشروع" onClose={onClose} wide foot={<><button type="button" className="ssp2-btn" onClick={onClose}>إلغاء</button><button type="button" className="ssp2-btn ssp2-btn--primary" onClick={submit} disabled={busy}>حفظ</button></>}>
      <ErrorBox error={err} />
      <div className="prj-form">
        <Field label="الاسم" full><input className="ssp2-input" value={f.name ?? ''} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="الوصف" full><textarea className="ssp2-input" rows={3} value={f.description ?? ''} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="العميل"><ClientPicker value={f.client} onChange={(c) => setF({ ...f, client: c })} /></Field>
        <Field label="الأولوية"><select className="ssp2-input" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>{Object.entries(PROJECT_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="مدير المشروع"><UserSelect users={users} value={f.manager_id} onChange={(id) => setF({ ...f, manager_id: id })} /></Field>
        <Field label="الشريك المسؤول"><UserSelect users={users} value={f.partner_id} onChange={(id) => setF({ ...f, partner_id: id })} /></Field>
        <Field label="البداية"><input type="date" className="ssp2-input" value={f.start_date ?? ''} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
        <Field label="الهدف"><input type="date" className="ssp2-input" value={f.target_end_date ?? ''} onChange={(e) => setF({ ...f, target_end_date: e.target.value })} /></Field>
        <Field label="من يرى المشروع"><select className="ssp2-input" value={f.confidentiality} onChange={(e) => setF({ ...f, confidentiality: e.target.value })}>{Object.entries(PROJECT_CONFIDENTIALITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="اللون"><div className="prj-chips">{PROJECT_COLORS.map((c) => <button type="button" key={c} className={`prj-chip prj-color-${c} ${f.color === c ? 'prj-chip--navy' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setF({ ...f, color: c })}><span className="prj-dot" /> {PROJECT_COLOR_LABELS[c]}</button>)}</div></Field>
      </div>
    </Modal>
  );
};

const ApplyTemplateModal: React.FC<{ project: ProjectFull; users: ReturnType<typeof useOfficeUsers>['users']; currentUserId: number | null; onClose: () => void; onDone: () => Promise<void> }> = ({ project, users, currentUserId, onClose, onDone }) => {
  const [templates, setTemplates] = useState<ProjectTemplateSummary[]>([]);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [roleMap, setRoleMap] = useState<RoleMap>({ partner: project.partner?.id ?? null, manager: project.manager?.id ?? currentUserId, lawyer: project.members.filter((m) => m.role === 'lawyer').map((m) => m.user_id), assistant: project.members.find((m) => m.role === 'assistant')?.user_id ?? null, researcher: project.members.find((m) => m.role === 'researcher')?.user_id ?? null, external: null });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { ProjectService.templates().then(setTemplates).catch((e: Error) => setErr(e.message)); }, []);
  const submit = async () => {
    if (!templateId) { setErr('اختر قالباً'); return; }
    setBusy(true);
    try { const r = await ProjectService.applyTemplate(project.id, templateId, roleMap); toast.success(r.message || `أُضيفت ${r.applied.phases} مراحل و${r.applied.tasks} مهمة`); await onDone(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'تعذر التطبيق'); }
    finally { setBusy(false); }
  };
  return (
    <Modal title="تطبيق قالب على المشروع" onClose={onClose} wide foot={<><button type="button" className="ssp2-btn" onClick={onClose}>إلغاء</button><button type="button" className="ssp2-btn ssp2-btn--primary" onClick={submit} disabled={busy}>تطبيق</button></>}>
      <ErrorBox error={err} />
      <p className="ssp2-hint">القالب يضيف مراحله ومهامه بعد المراحل الحالية ولا يحذف شيئاً.</p>
      <div className="prj-tpl">{templates.map((t) => <button type="button" key={t.id} className={`prj-tpl__item ${templateId === t.id ? 'prj-tpl__item--active' : ''}`} onClick={() => setTemplateId(t.id)}><div><div className="prj-tpl__name">{t.name}</div><div className="prj-tpl__desc">{t.description}</div></div><div className="prj-tpl__stats">{t.stats.phases} مراحل · {t.stats.tasks} مهمة</div></button>)}</div>
      <div style={{ marginTop: 8 }}>
        {(['partner', 'manager', 'lawyer', 'assistant', 'researcher'] as Array<keyof RoleMap>).map((role) => (
          <div key={role} className="prj-role-row"><div className="prj-role-row__label">{PROJECT_ROLE_LABELS[role]}</div>
            {role === 'lawyer' ? <UserMultiSelect users={users} value={roleMap.lawyer} onChange={(ids) => setRoleMap({ ...roleMap, lawyer: ids })} /> : <UserSelect users={users} value={roleMap[role] as number | null} onChange={(id) => setRoleMap({ ...roleMap, [role]: id })} />}
          </div>
        ))}
      </div>
    </Modal>
  );
};

const SaveTemplateModal: React.FC<{ project: ProjectFull; onClose: () => void }> = ({ project, onClose }) => {
  const [name, setName] = useState(`قالب من ${project.name}`);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await ProjectService.saveAsTemplate(project.id, name.trim(), description.trim() || undefined); toast.success('حُفظ القالب. سيظهر عند إنشاء مشروع جديد.'); onClose(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحفظ'); }
    finally { setBusy(false); }
  };
  return (
    <Modal title="حفظ المشروع كقالب للمكتب" onClose={onClose} foot={<><button type="button" className="ssp2-btn" onClick={onClose}>إلغاء</button><button type="button" className="ssp2-btn ssp2-btn--primary" onClick={submit} disabled={busy}>حفظ</button></>}>
      <p className="ssp2-hint">يُحفظ هيكل المشروع (المراحل والمهام والمواعيد النسبية والمخرجات) بلا أسماء الأشخاص ولا بيانات العميل.</p>
      <div className="prj-form">
        <Field label="اسم القالب" full><input className="ssp2-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="وصف" full><textarea className="ssp2-input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      </div>
    </Modal>
  );
};

export default ProjectRoom;
