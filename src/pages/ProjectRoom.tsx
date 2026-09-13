import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, BookTemplate, Calendar, ChevronDown, ChevronRight, Clipboard, Clock, Coins, Download, Eye, FileText, Flag, GitBranch, History, Home, Layers,
  Lightbulb, Link2, ListChecks, Map as MapIcon, MessageSquare, Pencil, Plus, Scale, Send, ShieldCheck, Sparkles, Trash2, Upload, Users,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { ProjectService } from '../services/projectService';
import type { UpdateProjectInput } from '../services/projectService';
import type { ProjectEvent, ProjectFull, ProjectOverview, ProjectPhase, ProjectTemplateSummary, RoleMap } from '../types/projects';
import { PROJECT_COLORS, PROJECT_COLOR_LABELS, PROJECT_CONFIDENTIALITY_LABELS, PROJECT_PRIORITY_LABELS, PROJECT_ROLE_LABELS, PROJECT_STATUS_LABELS } from '../types/projects';
import { RoomContext, type QuickAction, type SectionKey } from '../components/projects/room/RoomContext';
import { Av, Chip, ClientPicker, ErrorBox, Field, Health, Modal, PBar, UserMultiSelect, UserSelect, daysFromToday, firstName, fmtDayMonth, num, useOfficeUsers, whenAr } from '../components/projects/ui';
import OverviewSection from '../components/projects/room/OverviewSection';
import TimelineSection from '../components/projects/room/TimelineSection';
import PhasesSection from '../components/projects/room/PhasesSection';
import RecordsSection from '../components/projects/room/RecordsSection';
import DeliverablesSection from '../components/projects/room/DeliverablesSection';
import DocumentsSection from '../components/projects/room/DocumentsSection';
import PeopleSection from '../components/projects/room/PeopleSection';
import EventsSection, { LinksModal } from '../components/projects/room/EventsSection';
import MoneySection from '../components/projects/room/MoneySection';
import ClientSection from '../components/projects/room/ClientSection';
import FeedSection from '../components/projects/room/FeedSection';
import ReportsSection from '../components/projects/room/ReportsSection';
import ChatSection from '../components/projects/room/ChatSection';
import TaskCardModal from '../components/projects/room/TaskCardModal';
import DecisionPointModal from '../components/projects/room/DecisionPointModal';
import DecisionPointFormModal from '../components/projects/room/DecisionPointFormModal';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (projects.css)

const ARCHETYPE_LABELS: Record<string, string> = { commercial_dispute: 'نزاع تجاري كبير', arbitration: 'تحكيم', ma_deal: 'صفقة استحواذ أو اندماج', bankruptcy: 'إفلاس وإعادة هيكلة', execution_portfolio: 'محفظة طلبات تنفيذ' };
const SECTIONS: SectionKey[] = ['ov', 'map', 'tasks', 'issues', 'risks', 'decisions', 'deliv', 'docs', 'people', 'events', 'money', 'client', 'feed', 'reports', 'chat'];
const LEGACY_VIEW: Record<string, SectionKey> = { overview: 'ov', timeline: 'map', phases: 'tasks', deliverables: 'deliv', documents: 'docs', chat: 'chat', ask: 'chat' };

/**
 * غرفة المشروع — كما في التصوّر المعتمد: شريط علوي ثابت (الاسم والحالة والصحة والتقدم والمسؤولون
 * والموعد النهائي وما يرتبط بالمشروع وشريط المراحل وقائمة «إجراء سريع»)، قائمة الصفحات يمين، والمسرح.
 * المسار: /tasks/projects/:projectId?s=<page> — داخل «المهام والمشاريع».
 */
const ProjectRoom: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { users } = useOfficeUsers();
  const id = Number(projectId);

  const [project, setProject] = useState<ProjectFull | null>(null);
  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [taskCard, setTaskCard] = useState<number | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<number | null>(null);
  const [pending, setPending] = useState<QuickAction | null>(null);
  const [chatDraft, setChatDraft] = useState('');
  const [qa, setQa] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [linksModal, setLinksModal] = useState(false);
  const [templateModal, setTemplateModal] = useState<'apply' | 'save' | null>(null);
  const [decisionOpen, setDecisionOpen] = useState<number | null>(null);
  const openDecision = useCallback((pointId: number) => setDecisionOpen(pointId), []);
  const [dpForm, setDpForm] = useState<{ id?: number } | null>(null);
  const openDecisionForm = useCallback((pointId?: number) => setDpForm({ id: pointId }), []);

  const raw = params.get('s') ?? params.get('view') ?? 'ov';
  const section: SectionKey = (SECTIONS as string[]).includes(raw) ? (raw as SectionKey) : (LEGACY_VIEW[raw] ?? 'ov');
  const goTo = useCallback((s: SectionKey) => { setParams((p) => { const n = new URLSearchParams(p); n.set('s', s); n.delete('view'); return n; }); }, [setParams]);

  const load = useCallback(async () => {
    try {
      const [p, o, ev] = await Promise.all([ProjectService.get(id), ProjectService.overview(id), ProjectService.events(id).catch(() => [] as ProjectEvent[])]);
      setProject(p); setOverview(o); setEvents(ev); setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر فتح المشروع'); }
  }, [id]);
  useEffect(() => { if (Number.isFinite(id)) load(); }, [id, load]);

  const refresh = useCallback(async () => { await load(); }, [load]);
  const openTask = useCallback((taskId: number) => setTaskCard(taskId), []);
  const openTaskPage = useCallback((taskId: number) => navigate(`/tasks/${taskId}`), [navigate]);
  const consumePending = useCallback((a: QuickAction) => { if (pending === a) { setPending(null); return true; } return false; }, [pending]);
  const askRaed = useCallback((q?: string) => { setChatDraft(`@رائد ${q ?? ''}`); goTo('chat'); }, [goTo]);
  const quick = (a: QuickAction) => {
    setQa(false);
    setPending(a);
    const target: Record<QuickAction, SectionKey> = { task: 'tasks', phase: 'tasks', upload: 'docs', person: 'people', meeting: 'events', link: 'events', decision: 'decisions', decision_point: 'ov', issue: 'issues', risk: 'risks', client_update: 'reports', report: 'reports' };
    if (a === 'link') { setPending(null); setLinksModal(true); return; }
    if (a === 'decision_point') { setPending(null); setDpForm({}); return; }
    goTo(target[a]);
  };

  const canEdit = !!project?.can.edit;
  const canApprove = !!project?.can.approve;
  const ctx = useMemo(() => (project ? { project, overview, events, refresh, users, canEdit, canApprove, goTo, openTask, openTaskPage, phaseFilter, setPhaseFilter, pending, consumePending, askRaed, openDecision, openDecisionForm, chatDraft, setChatDraft } : null),
    [project, overview, events, refresh, users, canEdit, canApprove, goTo, openTask, openTaskPage, phaseFilter, pending, consumePending, askRaed, openDecision, openDecisionForm, chatDraft]);

  const changeStatus = async (status: string) => { if (!project) return; try { await ProjectService.update(project.id, { status }); toast.success('حُدثت الحالة'); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر التحديث'); } };
  const exportPlan = async () => { if (!project) return; try { const plan = await ProjectService.exportPlan(project.id); const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${project.code}-plan.json`; a.click(); URL.revokeObjectURL(a.href); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر التصدير'); } };
  const remove = async () => { if (!project) return; if (!window.confirm(`حذف المشروع «${project.name}»؟ مهامه تبقى مهاماً عادية ولا تُحذف.`)) return; try { await ProjectService.remove(project.id); toast.success('حُذف المشروع'); navigate('/tasks?view=projects'); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); } };

  if (error) return <div className="prj-scope prj-room" dir="rtl"><div className="prj-empty"><b style={{ display: 'block', fontSize: 14 }}>{error}</b><button type="button" className="prj-btn" style={{ marginTop: 10 }} onClick={() => navigate('/tasks?view=projects')}>عودة إلى المشاريع</button></div></div>;
  if (!project || !ctx) return <div className="prj-scope prj-room" dir="rtl"><div className="prj-empty">جارٍ فتح غرفة المشروع…</div></div>;

  const n = overview?.numbers;
  const target = daysFromToday(project.target_end_date);
  const nextMs = project.next_milestone;
  const clientTeam = project.contacts.filter((c) => c.kind === 'client_team').length;
  const externals = project.contacts.length - clientTeam;
  const futureMeetings = events.filter((e) => e.kind === 'meeting' && e.is_future).length;
  const phases = project.phases.filter((p) => p.status !== 'skipped');
  const linkDetail = (l: ProjectFull['links'][number]) => {
    const evs = events.filter((e) => e.link.id === l.id && e.is_future);
    if (l.type === 'case') { const s = evs.find((e) => e.kind === 'session'); return s ? `جلسة ${fmtDayMonth(s.date)}` : (l.extra && typeof l.extra.status === 'string' ? String(l.extra.status) : ''); }
    if (l.type === 'legal_service') { const st = evs.find((e) => e.kind === 'stage'); return st ? `مرحلة ${st.title.split(' · ')[0]}` : (l.extra && typeof l.extra.status === 'string' ? String(l.extra.status) : ''); }
    if (l.type === 'meeting') { const m = events.find((e) => e.link.id === l.id); return m ? fmtDayMonth(m.date) : ''; }
    return l.extra && typeof l.extra.status === 'string' ? String(l.extra.status) : '';
  };
  const linkIcon = (t: string) => (t === 'case' ? <Scale size={12} /> : t === 'execution_request' ? <Flag size={12} /> : t === 'legal_service' ? <Layers size={12} /> : t === 'contract' ? <Coins size={12} /> : <Calendar size={12} />);
  const phaseMeta = (p: ProjectPhase) => (p.status === 'completed' ? `اكتملت ${fmtDayMonth(p.due_date)}` : p.status === 'active' ? `${p.tasks_done}/${p.tasks_total} مهام · حتى ${fmtDayMonth(p.due_date)}` : p.status === 'awaiting_approval' ? 'تنتظر الموافقة' : p.status === 'hidden' ? 'بعد القرار' : `${fmtDayMonth(p.start_date)} → ${fmtDayMonth(p.due_date)}`);
  const navCount = (v: number, tone?: 'bad') => (v > 0 ? <span className={`prj-cnt num ${tone ? 'prj-cnt--bad' : ''}`}>{v}</span> : null);

  const renderSection = () => {
    switch (section) {
      case 'map': return <TimelineSection />;
      case 'tasks': return <PhasesSection />;
      case 'issues': return <RecordsSection kind="issues" />;
      case 'risks': return <RecordsSection kind="risks" />;
      case 'decisions': return <RecordsSection kind="decisions" />;
      case 'deliv': return <DeliverablesSection />;
      case 'docs': return <DocumentsSection />;
      case 'people': return <PeopleSection />;
      case 'events': return <EventsSection />;
      case 'money': return <MoneySection />;
      case 'client': return <ClientSection />;
      case 'feed': return <FeedSection />;
      case 'reports': return <ReportsSection />;
      case 'chat': return <ChatSection />;
      default: return <OverviewSection />;
    }
  };

  return (
    <RoomContext.Provider value={ctx}>
      <div className={`prj-scope prj-room prj-color-${project.color}`} dir="rtl">
        <header className="prj-ws-head">
          <div className="prj-ws-top">
            <button type="button" className="prj-ibtn" onClick={() => navigate('/tasks?view=projects')} title="عودة إلى المشاريع"><ChevronRight size={15} /></button>
            <span className="prj-badge">مشروع</span>
            <span className="prj-dot" /><span className="prj-code">{project.code}</span>
            <h2 className="prj-ws-title" title={project.name}>{project.name}</h2>
            {project.archetype && ARCHETYPE_LABELS[project.archetype] && <Chip tone="proj">{ARCHETYPE_LABELS[project.archetype]}</Chip>}
            {canEdit ? (
              <select className="prj-sel" style={{ padding: '2px 6px', fontSize: 11 }} value={project.status} onChange={(e) => changeStatus(e.target.value)} title="حالة المشروع">
                {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            ) : <Chip tone="doing">{project.status_label}</Chip>}
            <Health health={project.health} reasons={project.health_reasons} />
            {(project.priority === 'high' || project.priority === 'critical') && <Chip tone="hold">أولوية {PROJECT_PRIORITY_LABELS[project.priority]}</Chip>}
            <span className="prj-spacer" />
            <button type="button" className="prj-btn prj-btn--sm prj-btn--gold" onClick={() => askRaed()}><Sparkles size={12} /> اسأل رائد عن المشروع</button>
            {canEdit && (
              <div className="prj-qa">
                <button type="button" className="prj-btn prj-btn--sm prj-btn--primary" onClick={() => setQa((v) => !v)}><Plus size={12} /> إجراء سريع <ChevronDown size={11} /></button>
                {qa && (
                  <div className="prj-qa__menu" onMouseLeave={() => setQa(false)}>
                    <button type="button" onClick={() => quick('task')}><ListChecks size={12} /> مهمة</button>
                    <button type="button" onClick={() => quick('phase')}><Flag size={12} /> مرحلة</button>
                    <button type="button" onClick={() => quick('upload')}><Upload size={12} /> رفع مستند</button>
                    <button type="button" onClick={() => quick('person')}><Users size={12} /> إضافة شخص</button>
                    <button type="button" onClick={() => quick('link')}><Link2 size={12} /> ربط قضية أو اجتماع</button>
                    <button type="button" onClick={() => quick('decision')}><ShieldCheck size={12} /> قرار</button>
                    <button type="button" onClick={() => quick('decision_point')}><GitBranch size={12} /> نقطة قرار</button>
                    <button type="button" onClick={() => quick('issue')}><Lightbulb size={12} /> مسألة قانونية</button>
                    <button type="button" onClick={() => quick('risk')}><AlertTriangle size={12} /> مخاطرة</button>
                    <button type="button" onClick={() => quick('client_update')}><Send size={12} /> تحديث للعميل</button>
                    <button type="button" onClick={() => quick('report')}><FileText size={12} /> تقرير</button>
                    <div style={{ borderTop: '1px solid var(--pj-line)', margin: '4px 0' }} />
                    <button type="button" onClick={() => { setQa(false); setTemplateModal('apply'); }}><BookTemplate size={12} /> تطبيق قالب</button>
                    <button type="button" onClick={() => { setQa(false); setTemplateModal('save'); }}><BookTemplate size={12} /> حفظ كقالب للمكتب</button>
                    <button type="button" onClick={() => { setQa(false); exportPlan(); }}><Download size={12} /> تصدير الخطة</button>
                    {project.can.delete && <button type="button" style={{ color: 'var(--pj-bad)' }} onClick={() => { setQa(false); remove(); }}><Trash2 size={12} /> حذف المشروع</button>}
                  </div>
                )}
              </div>
            )}
            {canEdit && <button type="button" className="prj-btn prj-btn--sm" onClick={() => setEditModal(true)}><Pencil size={12} /> تعديل</button>}
          </div>
          <div className="prj-facts">
            <span className="prj-fact"><span className="k">التقدم</span> <PBar value={project.progress} tone={project.health === 'late' ? 'bad' : project.health === 'attention' ? 'warn' : ''} /> <span className="num">{project.progress}٪</span></span>
            <span className="prj-fact"><span className="k">الشريك المسؤول</span> {project.partner ? <><Av name={project.partner.name} /> {firstName(project.partner.name)}</> : '—'}</span>
            <span className="prj-fact"><span className="k">مدير المشروع</span> {project.manager ? <><Av name={project.manager.name} /> {firstName(project.manager.name)}</> : '—'}</span>
            <span className="prj-fact"><Users size={12} /> <span className="prj-avs">{project.members.slice(0, 5).map((m) => <Av key={m.id} name={m.name} />)}</span> <span className="prj-dim num">{project.members.length} من المكتب{clientTeam ? ` · ${clientTeam} من العميل` : ''}{externals ? ` · ${externals} خارجيون` : ''}</span></span>
            <span className="prj-fact"><Calendar size={12} /> <span className="k">البداية</span> <span className="num">{fmtDayMonth(project.start_date)}</span></span>
            <span className="prj-fact"><span className="k">الموعد النهائي</span> <span className="num" style={target && target.days < 0 && project.status === 'active' ? { color: 'var(--pj-bad)' } : undefined}>{project.target_end_date ? `${fmtDayMonth(project.target_end_date)}${target ? ` · ${target.label}` : ''}` : nextMs ? `${nextMs.name} · ${fmtDayMonth(nextMs.date)}` : '—'}</span></span>
            <span className="prj-fact"><Clock size={12} /> <span className="num">{num(n?.hours_actual ?? 0)} من {num(n?.hours_estimated ?? project.estimated_hours ?? 0)} ساعة</span></span>
            <span className="prj-fact"><span className="k">آخر تحديث</span> <span className="num">{whenAr(project.updated_at)}</span></span>
            <span className="prj-fact"><span className="k">السرية</span> {PROJECT_CONFIDENTIALITY_LABELS[project.confidentiality]}</span>
          </div>
          <div className="prj-links">
            <span className="prj-dim" style={{ fontSize: 11 }}>مرتبط بـ:</span>
            {project.links.map((l) => { const d = linkDetail(l); return (
              <button type="button" key={l.id} className="prj-lnk" onClick={() => (l.url && l.exists ? navigate(l.url) : setLinksModal(true))} title={l.label}>
                {linkIcon(l.type)} {l.type === 'case' && l.extra && typeof l.extra.file_number === 'string' ? <><b>{String(l.extra.file_number)}</b> {l.label.replace(`${String(l.extra.file_number)} · `, '')}</> : <>{l.type_label}: <b>{l.label}</b></>}{d ? ` · ${d}` : ''}
              </button>
            ); })}
            {futureMeetings > 0 && <button type="button" className="prj-lnk" onClick={() => goTo('events')}><Calendar size={12} /> <b>{futureMeetings}</b> اجتماعات قادمة</button>}
            {canEdit && <button type="button" className="prj-link" style={{ fontSize: 11, textDecoration: 'none' }} onClick={() => setLinksModal(true)}>+ ربط</button>}
            {project.links.length === 0 && !canEdit && <span className="prj-dim" style={{ fontSize: 11 }}>لا ارتباطات.</span>}
          </div>
          {phases.length > 0 && (
            <div className="prj-phases">
              {phases.map((p) => {
                const pct = p.tasks_total ? Math.round((p.tasks_done / p.tasks_total) * 100) : (p.status === 'completed' ? 100 : 0);
                // نقطة القرار تظهر في الشريط بعد مرحلتها مباشرة، وما بعدها مسارات مطوية حتى يُختار أحدها
                const dps = project.decision_points.filter((dp) => dp.after_phase_id === p.id);
                return (
                  <React.Fragment key={p.id}>
                    <button type="button" className={`prj-ph ${p.status === 'completed' ? 'prj-ph--done' : ''} ${p.status === 'active' || p.status === 'awaiting_approval' ? 'prj-ph--cur' : ''} ${p.status === 'hidden' ? 'prj-ph--branch' : ''} ${phaseFilter === p.id ? 'is-sel' : ''}`} onClick={() => { setPhaseFilter(phaseFilter === p.id ? null : p.id); goTo('tasks'); }} title={p.objective ?? p.name}>
                      <span className="prj-ph__row"><span className="prj-ph__n num">{p.status === 'completed' ? '✓' : p.order}</span><span className="prj-ph__name">{p.name}</span>{p.requires_approval && <ShieldCheck size={11} className="gate" />}{p.client_visible && <Eye size={11} className="eye" />}</span>
                      <span className="prj-ph__meta">{phaseMeta(p)}</span>
                      <PBar value={pct} tone={p.tasks_late ? 'bad' : ''} />
                    </button>
                    {dps.map((dp) => {
                      const chosen = dp.chosen_key ? dp.options.find((o) => o.key === dp.chosen_key) : null;
                      const sug = dp.status === 'suggested';
                      return (
                        <button type="button" key={`dp-${dp.id}`} className={`prj-ph prj-ph--dec ${sug ? 'prj-ph--sug' : ''}`} onClick={() => openDecision(dp.id)} title={dp.question}>
                          <span className="prj-ph__row"><span className={`prj-diamond ${chosen ? 'prj-diamond--done' : sug ? 'prj-diamond--sug' : ''}`} /><span className="prj-ph__name">{sug ? 'يقترح رائد' : 'نقطة قرار'}: {dp.question}</span>{sug ? <Sparkles size={11} style={{ color: 'var(--pj-gold)' }} /> : <GitBranch size={11} style={{ color: 'var(--pj-gold)' }} />}</span>
                          <span className="prj-ph__meta">{sug ? `اقتراح · ${dp.options.length} مسارات بعد «${p.name}»` : chosen ? `قُرر: ${chosen.label}` : p.status === 'completed' ? 'جاهزة للقرار الآن' : `${dp.options.length} مسارات · تُختار بعد «${p.name}»`}</span>
                          <span className="prj-ph__meta">{sug ? 'اضغط للاعتماد أو التجاهل' : chosen ? (dp.decided_by ? `${dp.decided_by.name.split(' ')[0]} · ${fmtDayMonth(dp.decided_at)}` : '') : 'اضغط لرؤية المسارات'}</span>
                        </button>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </header>

        <div className="prj-room__body">
          <nav className="prj-pnav" aria-label="صفحات المشروع">
            <button type="button" className={section === 'ov' ? 'is-on' : ''} onClick={() => goTo('ov')}><Home size={13} /> نظرة عامة</button>
            <div className="grp">الخطة</div>
            <button type="button" className={section === 'map' ? 'is-on' : ''} onClick={() => goTo('map')}><MapIcon size={13} /> الجدول الزمني</button>
            <button type="button" className={section === 'tasks' ? 'is-on' : ''} onClick={() => goTo('tasks')}><ListChecks size={13} /> المراحل والمهام {n && <span className="prj-cnt num">{n.tasks_done}/{n.tasks_total}{n.tasks_late ? <span className="prj-cnt--bad"> · {n.tasks_late} متأخرة</span> : ''}</span>}</button>
            <div className="grp">السجلات</div>
            <button type="button" className={section === 'issues' ? 'is-on' : ''} onClick={() => goTo('issues')}><Lightbulb size={13} /> المسائل القانونية {n && n.issues_open > 0 && <span className="prj-cnt num">{n.issues_open} مفتوحة</span>}</button>
            <button type="button" className={section === 'risks' ? 'is-on' : ''} onClick={() => goTo('risks')}><AlertTriangle size={13} /> المخاطر {n && navCount(n.risks_open)}</button>
            <button type="button" className={section === 'decisions' ? 'is-on' : ''} onClick={() => goTo('decisions')}><ShieldCheck size={13} /> القرارات {n && n.decisions_pending > 0 && <span className="prj-cnt num prj-cnt--bad">{n.decisions_pending} معلقة</span>}</button>
            <button type="button" className={section === 'deliv' ? 'is-on' : ''} onClick={() => goTo('deliv')}><FileText size={13} /> المخرجات {n && n.deliverables_total > 0 && <span className="prj-cnt num">{n.deliverables_final} من {n.deliverables_total}</span>}</button>
            <div className="grp">المشروع</div>
            <button type="button" className={section === 'docs' ? 'is-on' : ''} onClick={() => goTo('docs')}><Clipboard size={13} /> المستندات {n && navCount(n.documents)}</button>
            <button type="button" className={section === 'people' ? 'is-on' : ''} onClick={() => goTo('people')}><Users size={13} /> الأشخاص {navCount(project.members.length + project.contacts.length)}</button>
            <button type="button" className={section === 'events' ? 'is-on' : ''} onClick={() => goTo('events')}><Calendar size={13} /> الاجتماعات والجلسات {events.filter((e) => e.is_future).length > 0 && <span className="prj-cnt num">{events.filter((e) => e.is_future).length} قادمة</span>}</button>
            <button type="button" className={section === 'money' ? 'is-on' : ''} onClick={() => goTo('money')}><Coins size={13} /> الوقت والمال</button>
            <button type="button" className={section === 'client' ? 'is-on' : ''} onClick={() => goTo('client')}><Eye size={13} /> العميل</button>
            <div className="grp">المتابعة</div>
            <button type="button" className={section === 'feed' ? 'is-on' : ''} onClick={() => goTo('feed')}><History size={13} /> الخط الزمني</button>
            <button type="button" className={section === 'reports' ? 'is-on' : ''} onClick={() => goTo('reports')}><Send size={13} /> التقارير</button>
            <button type="button" className={section === 'chat' ? 'is-on' : ''} onClick={() => goTo('chat')}><MessageSquare size={13} /> محادثة المشروع</button>
            {project.decision_points.length > 0 && (
              <>
                <div className="grp">نقاط القرار</div>
                {project.decision_points.map((dp) => {
                  const after = project.phases.find((p) => p.id === dp.after_phase_id);
                  const ready = !dp.chosen_key && after?.status === 'completed';
                  return (
                    <button type="button" key={dp.id} onClick={() => openDecision(dp.id)} title={dp.question}>
                      <span className={`prj-diamond ${dp.chosen_key ? 'prj-diamond--done' : ''}`} />
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dp.question}</span>
                      <span className={`prj-cnt ${ready ? 'prj-cnt--bad' : dp.chosen_key ? '' : 'prj-cnt--gold'}`}>{dp.status === 'suggested' ? 'اقتراح رائد' : dp.chosen_key ? 'قُررت' : ready ? 'الآن' : `بعد ${after?.name ? after.name.split(' ')[0] : '—'}`}</span>
                    </button>
                  );
                })}
              </>
            )}
          </nav>
          <div className="prj-stage">{renderSection()}</div>
        </div>

        {taskCard !== null && <TaskCardModal taskId={taskCard} onClose={() => setTaskCard(null)} />}
        {decisionOpen !== null && <DecisionPointModal pointId={decisionOpen} onClose={() => setDecisionOpen(null)} />}
        {dpForm && <DecisionPointFormModal pointId={dpForm.id} onClose={() => setDpForm(null)} />}
        {editModal && <EditProjectModal project={project} onClose={() => setEditModal(false)} onSaved={async () => { setEditModal(false); await load(); }} />}
        {linksModal && <LinksModal onClose={() => setLinksModal(false)} onRemove={async (l) => { if (!window.confirm(`فك ربط «${l.label}»؟`)) return; try { await ProjectService.removeLink(project.id, l.id); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر فك الربط'); } }} />}
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
    partner_id: project.partner?.id ?? null, manager_id: project.manager?.id ?? null, start_date: project.start_date ?? '', target_end_date: project.target_end_date ?? '', client: project.client, archetype: project.archetype ?? '',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.name?.trim()) { setErr('الاسم مطلوب'); return; }
    setBusy(true);
    try { const { client, ...rest } = f; await ProjectService.update(project.id, { ...rest, name: f.name!.trim(), description: f.description || null, client_id: client?.id ?? null, start_date: f.start_date || null, target_end_date: f.target_end_date || null, archetype: f.archetype || null }); toast.success('حُفظ'); await onSaved(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'تعذر الحفظ'); }
    finally { setBusy(false); }
  };
  return (
    <Modal title="تعديل المشروع" onClose={onClose} wide foot={<><button type="button" className="prj-btn" onClick={onClose}>إلغاء</button><button type="button" className="prj-btn prj-btn--primary" onClick={submit} disabled={busy}>حفظ</button></>}>
      <ErrorBox error={err} />
      <div className="prj-form">
        <Field label="الاسم" full><input className="prj-in" value={f.name ?? ''} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="الوصف" full><textarea className="prj-in" rows={3} style={{ minHeight: 70 }} value={f.description ?? ''} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="العميل"><ClientPicker value={f.client} onChange={(c) => setF({ ...f, client: c })} /></Field>
        <Field label="نوع المشروع"><select className="prj-in" value={f.archetype ?? ''} onChange={(e) => setF({ ...f, archetype: e.target.value })}><option value="">—</option>{Object.entries(ARCHETYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="الأولوية"><select className="prj-in" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>{Object.entries(PROJECT_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="مستوى السرية"><select className="prj-in" value={f.confidentiality} onChange={(e) => setF({ ...f, confidentiality: e.target.value })}>{Object.entries(PROJECT_CONFIDENTIALITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="مدير المشروع"><UserSelect users={users} value={f.manager_id} onChange={(id) => setF({ ...f, manager_id: id })} /></Field>
        <Field label="الشريك المسؤول"><UserSelect users={users} value={f.partner_id} onChange={(id) => setF({ ...f, partner_id: id })} /></Field>
        <Field label="البداية"><input type="date" className="prj-in" value={f.start_date ?? ''} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
        <Field label="الموعد النهائي"><input type="date" className="prj-in" value={f.target_end_date ?? ''} onChange={(e) => setF({ ...f, target_end_date: e.target.value })} /></Field>
        <Field label="اللون" full><span className="prj-pal">{PROJECT_COLORS.map((c) => <i key={c} className={`prj-color-${c} ${f.color === c ? 'is-on' : ''}`} style={{ background: 'var(--prj-c)' }} title={PROJECT_COLOR_LABELS[c]} onClick={() => setF({ ...f, color: c })} />)}</span></Field>
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
  const submit = async () => { if (!templateId) { setErr('اختر قالباً'); return; } setBusy(true); try { const r = await ProjectService.applyTemplate(project.id, templateId, roleMap); toast.success(r.message || `أُضيفت ${r.applied.phases} مراحل و${r.applied.tasks} مهمة`); await onDone(); } catch (e) { setErr(e instanceof Error ? e.message : 'تعذر التطبيق'); } finally { setBusy(false); } };
  return (
    <Modal title="تطبيق قالب على المشروع" onClose={onClose} wide foot={<><button type="button" className="prj-btn" onClick={onClose}>إلغاء</button><button type="button" className="prj-btn prj-btn--primary" onClick={submit} disabled={busy}>تطبيق</button></>}>
      <ErrorBox error={err} />
      <p className="prj-dim" style={{ margin: 0, fontSize: 12 }}>القالب يضيف مراحله ومهامه بعد المراحل الحالية ولا يحذف شيئاً.</p>
      <div className="prj-tiles" style={{ flexDirection: 'column' }}>{templates.map((t) => <button type="button" key={t.id} className={`prj-tile ${templateId === t.id ? 'is-on' : ''}`} onClick={() => setTemplateId(t.id)}><b>{t.name}</b><span>{t.description} · {t.stats.phases} مراحل · {t.stats.tasks} مهمة</span></button>)}</div>
      <div className="prj-roles">
        {(['partner', 'manager', 'lawyer', 'assistant', 'researcher'] as Array<keyof RoleMap>).map((role) => (
          <div key={role} className="r"><span className="k">{PROJECT_ROLE_LABELS[role]}</span>{role === 'lawyer' ? <UserMultiSelect users={users} value={roleMap.lawyer} onChange={(ids) => setRoleMap({ ...roleMap, lawyer: ids })} /> : <UserSelect users={users} value={roleMap[role] as number | null} onChange={(id) => setRoleMap({ ...roleMap, [role]: id })} />}</div>
        ))}
      </div>
    </Modal>
  );
};

const SaveTemplateModal: React.FC<{ project: ProjectFull; onClose: () => void }> = ({ project, onClose }) => {
  const [name, setName] = useState(`قالب من ${project.name}`);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => { if (!name.trim()) return; setBusy(true); try { await ProjectService.saveAsTemplate(project.id, name.trim(), description.trim() || undefined); toast.success('حُفظ القالب. سيظهر عند إنشاء مشروع جديد.'); onClose(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحفظ'); } finally { setBusy(false); } };
  return (
    <Modal title="حفظ المشروع كقالب للمكتب" onClose={onClose} foot={<><button type="button" className="prj-btn" onClick={onClose}>إلغاء</button><button type="button" className="prj-btn prj-btn--primary" onClick={submit} disabled={busy}>حفظ</button></>}>
      <p className="prj-dim" style={{ margin: 0, fontSize: 12 }}>يُحفظ هيكل المشروع (المراحل والمهام والمواعيد النسبية والمخرجات) بلا أسماء الأشخاص ولا بيانات العميل.</p>
      <div className="prj-form">
        <Field label="اسم القالب" full><input className="prj-in" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="وصف" full><textarea className="prj-in" rows={2} style={{ minHeight: 56 }} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      </div>
    </Modal>
  );
};

export default ProjectRoom;
