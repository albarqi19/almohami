import React, { useEffect, useMemo, useState } from 'react';
import { Check, Eye, Layers, Loader2, ShieldCheck, Sparkles, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { ProjectService } from '../../services/projectService';
import type { CreateProjectInput } from '../../services/projectService';
import type { AiPlanResult, AiRun, Linkable, ProjectFull, ProjectLinkType, ProjectPlan, ProjectTemplateSummary, RoleMap } from '../../types/projects';
import { PROJECT_COLORS, PROJECT_COLOR_LABELS, PROJECT_CONFIDENTIALITY_LABELS, PROJECT_LINK_LABELS, PROJECT_PRIORITY_LABELS, PROJECT_ROLE_LABELS } from '../../types/projects';
import { Chip, ClientPicker, ErrorBox, LinkablePicker, UserMultiSelect, UserSelect, useOfficeUsers } from './ui';

type Method = 'ai' | 'template' | 'manual';
interface PickedLink { type: ProjectLinkType; id: number; label: string }
const ARCHETYPES: Array<[string, string]> = [['commercial_dispute', 'نزاع تجاري كبير'], ['arbitration', 'تحكيم'], ['ma_deal', 'صفقة استحواذ أو اندماج'], ['bankruptcy', 'إفلاس وإعادة هيكلة'], ['execution_portfolio', 'محفظة طلبات تنفيذ']];
const ANCHOR_LABELS: Record<string, string> = { project_start: 'بداية المشروع', case_filing: 'قيد الدعوى', next_session: 'الجلسة القادمة', judgement: 'الحكم' };

/**
 * «جديد ← مشروع» كما في التصوّر: نموذج على اليمين (الاسم، الوصف، القضايا، الطلبات والخدمات، العقد،
 * النوع، اللون، الأولوية، السرية، الفريق بالأدوار، طريقة التخطيط)، ومراجعة الخطة على اليسار
 * (ما قرأه رائد، أسئلته، مخطط المسارات والمراحل والمهام). لا يُحفظ شيء قبل «أنشئ المشروع».
 */
const NewProjectWizard: React.FC<{ onClose: () => void; onCreated: (project: ProjectFull, applied: Record<string, number> | null, planError?: string | null) => void; onSwitchToTask?: () => void }> = ({ onClose, onCreated, onSwitchToTask }) => {
  const { user } = useAuth();
  const { users } = useOfficeUsers();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [client, setClient] = useState<{ id: number; name: string } | null>(null);
  const [links, setLinks] = useState<PickedLink[]>([]);
  const [archetype, setArchetype] = useState<string>('');
  const [color, setColor] = useState('navy');
  const [priority, setPriority] = useState('medium');
  const [confidentiality, setConfidentiality] = useState('team');
  const [roleMap, setRoleMap] = useState<RoleMap>({ partner: null, manager: user ? Number(user.id) : null, lawyer: [], assistant: null, researcher: null, external: null });
  const [externalName, setExternalName] = useState('');
  const [method, setMethod] = useState<Method>('ai');
  const [saveTemplate, setSaveTemplate] = useState(false);

  const [templates, setTemplates] = useState<ProjectTemplateSummary[]>([]);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [templatePlan, setTemplatePlan] = useState<ProjectPlan | null>(null);
  const [aiRun, setAiRun] = useState<AiRun | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAt, setAiAt] = useState<number | null>(null);
  const [aiSeconds, setAiSeconds] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, 'yes' | 'no'>>({});
  const [quota, setQuota] = useState<{ remaining: number; cap: number; enabled: boolean } | null>(null);

  useEffect(() => { ProjectService.templates().then(setTemplates).catch((e: Error) => setError(e.message)); ProjectService.aiQuota().then(setQuota).catch(() => setQuota(null)); }, []);
  useEffect(() => { if (templateId) ProjectService.template(templateId).then((t) => setTemplatePlan(t.plan)).catch((e: Error) => setError(e.message)); else setTemplatePlan(null); }, [templateId]);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);

  const aiResult = aiRun?.status === 'ready' ? (aiRun.result as unknown as AiPlanResult) : null;
  const plan: ProjectPlan | null = method === 'ai' ? (aiResult?.plan ?? null) : method === 'template' ? templatePlan : null;
  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;
  const effectiveArchetype = archetype || (method === 'ai' ? aiResult?.plan.archetype : selectedTemplate?.archetype) || '';
  const aiSuggested = !archetype && !!aiResult?.plan.archetype;
  const canCreate = name.trim().length >= 3 && (method === 'manual' || (method === 'template' && !!templateId) || (method === 'ai' && !!aiResult)) && !saving;

  const addLink = (type: ProjectLinkType, item: Linkable) => { if (links.some((l) => l.type === type && l.id === item.id)) return; setLinks([...links, { type, id: item.id, label: item.label }]); };
  const removeLink = (l: PickedLink) => setLinks(links.filter((x) => !(x.type === l.type && x.id === l.id)));
  const cases = links.filter((l) => l.type === 'case');
  const others = links.filter((l) => l.type === 'execution_request' || l.type === 'legal_service' || l.type === 'meeting');
  const contract = links.find((l) => l.type === 'contract') ?? null;

  const askRaed = async () => {
    if (!name.trim()) { setError('اكتب اسم المشروع أولاً'); return; }
    setError(null); setAiBusy(true); setAiAt(Date.now());
    const answered = Object.entries(answers).map(([q, a]) => `${q}: ${a === 'yes' ? 'نعم' : 'لا'}`);
    try {
      const run = await ProjectService.aiPlan({
        name: name.trim(), description: description.trim() || undefined, archetype: archetype || undefined, client_name: client?.name,
        case_ids: cases.map((l) => l.id), execution_request_ids: links.filter((l) => l.type === 'execution_request').map((l) => l.id), legal_service_ids: links.filter((l) => l.type === 'legal_service').map((l) => l.id),
        has_contract: !!contract, notes: answered.length ? `أجوبة على أسئلة رائد السابقة:\n${answered.join('\n')}` : undefined,
      });
      setAiRun(run);
      const done = await ProjectService.waitForRun(run.id, setAiRun);
      if (done.status === 'failed') setError(done.error || 'تعذر توليد الخطة');
      setAiSeconds(Math.round((Date.now() - (Date.now() - 0)) / 1000));
      setQuota((q) => (q ? { ...q, remaining: Math.max(0, q.remaining - 1) } : q));
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر توليد الخطة'); }
    finally { setAiBusy(false); }
  };
  useEffect(() => { if (aiRun?.status === 'ready' && aiAt) setAiSeconds(Math.max(1, Math.round((Date.now() - aiAt) / 1000))); }, [aiRun?.status, aiAt]);

  const create = async () => {
    setError(null); setSaving(true);
    try {
      const input: CreateProjectInput = {
        name: name.trim(), description: description.trim() || undefined, client_id: client?.id ?? null, priority, color, confidentiality,
        links: links.map((l) => ({ type: l.type, id: l.id })), partner_id: roleMap.partner, manager_id: roleMap.manager,
        plan_source: method, template_id: method === 'template' ? (templateId ?? undefined) : undefined, ai_run_id: method === 'ai' ? (aiRun?.id ?? undefined) : undefined,
        role_map: roleMap, archetype: effectiveArchetype || undefined,
      };
      const res = await ProjectService.create(input);
      if (externalName.trim()) { try { await ProjectService.addContact(res.project.id, { name: externalName.trim(), kind: 'external' }); } catch { /* ليست حرجة */ } }
      if (saveTemplate && plan) { try { await ProjectService.saveAsTemplate(res.project.id, `قالب من ${name.trim()}`); } catch { toast.warn('أُنشئ المشروع، وتعذر حفظه كقالب'); } }
      toast.success(res.message || 'أُنشئ المشروع');
      onCreated(res.project, res.applied, res.plan_error);
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر إنشاء المشروع'); }
    finally { setSaving(false); }
  };

  const stats = useMemo(() => {
    if (!plan) return null;
    const tasks = plan.phases.reduce((s, p) => s + p.tasks.length, 0);
    return `${plan.phases.length} مراحل · ${tasks} مهمة · ${plan.milestones.length} مواعيد · ${plan.decision_points.length} نقاط قرار · ${plan.deliverables.length} مخرجات · ${plan.risks.length} مخاطر · ${plan.issues.length} مسائل${plan.horizon_days ? ` · نحو ${plan.horizon_days} يوماً` : ''}`;
  }, [plan]);

  const window_ = (p: ProjectPlan['phases'][number]) => {
    const a = p.start.anchor; const o = p.start.offset_days;
    if (a === 'project_start') return `من يوم ${o + 1} إلى يوم ${o + p.duration_days}`;
    return `${ANCHOR_LABELS[a] ?? a} ${o >= 0 ? '+' : ''}${o} يوم · ${p.duration_days} يوم`;
  };
  const stepLabel = method === 'ai' ? (aiResult ? 'الخطوة ٢ من ٢ · مراجعة خطة رائد' : 'الخطوة ١ من ٢ · الأساس والربط ثم خطة رائد') : method === 'template' ? (templateId ? 'الخطوة ٢ من ٢ · مراجعة القالب' : 'الخطوة ١ من ٢ · اختر القالب') : 'مشروع فارغ يُبنى يدوياً';

  return (
    <div className="prj-wizveil prj-scope" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="prj-wiz" role="dialog" aria-modal="true" dir="rtl">
        <div className="prj-ws-head">
          <div className="prj-ws-top">
            <button type="button" className="prj-ibtn" onClick={onClose} title="إغلاق"><X size={14} /></button>
            <h2 className="prj-ws-title">جديد</h2>
            <div className="prj-tiles" style={{ width: 420, marginInlineStart: 12 }}>
              <button type="button" className="prj-tile" onClick={() => { onClose(); onSwitchToTask?.(); }}><b>مهمة</b><span>عمل واحد بخطوات وموعد</span></button>
              <button type="button" className="prj-tile is-on"><b>مشروع</b><span>عمل كبير بمراحل ومهام كثيرة ومواعيد</span></button>
            </div>
            <span className="prj-spacer" />
            <span className="prj-dim" style={{ fontSize: 11.5 }}>{stepLabel}</span>
          </div>
        </div>
        <div className="prj-wiz__grid">
          <div className="prj-wiz__form">
            {error && <div style={{ padding: '8px 14px 0' }}><ErrorBox error={error} /></div>}
            <div className="prj-f"><label>اسم المشروع</label><input className="prj-in" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: نزاع مقاولات الأفق ضد الرواسي" autoFocus /></div>
            <div className="prj-f"><label>الوصف (اكتب بحرية، رائد يقرؤه)</label><textarea className="prj-in" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="من العميل، وضد من، وكم المبلغ، وما الذي نريده، وما يقلقنا…" /></div>
            <div className="prj-f"><label>العميل</label><ClientPicker value={client} onChange={setClient} /></div>
            <div className="prj-f"><label>القضايا المرتبطة (واحدة أو أكثر)</label>
              {cases.length > 0 && <div className="prj-in prj-in--wrap">{cases.map((l) => <span key={l.id} className="prj-lnk" style={{ cursor: 'default' }}>{l.label}<button type="button" style={{ background: 'none', border: 0, padding: 0, color: 'var(--pj-ink-3)', cursor: 'pointer', display: 'inline-flex' }} onClick={() => removeLink(l)}><X size={11} /></button></span>)}</div>}
              <LinkablePicker fixedType="case" onPick={addLink} exclude={links} placeholder="+ أضف قضية (بالرقم أو الاسم)" />
            </div>
            <div className="prj-f prj-row2">
              <div><label className="lbl">طلبات تنفيذ وخدمات واجتماعات</label>
                {others.length > 0 && <div className="prj-in prj-in--wrap" style={{ marginBottom: 4 }}>{others.map((l) => <span key={`${l.type}${l.id}`} className="prj-lnk" style={{ cursor: 'default' }}>{PROJECT_LINK_LABELS[l.type]}: {l.label}<button type="button" style={{ background: 'none', border: 0, padding: 0, color: 'var(--pj-ink-3)', cursor: 'pointer', display: 'inline-flex' }} onClick={() => removeLink(l)}><X size={11} /></button></span>)}</div>}
                <LinkablePicker types={['execution_request', 'legal_service', 'meeting']} onPick={addLink} exclude={links} />
              </div>
              <div><label className="lbl">العقد (اختياري)</label>
                {contract ? <div className="prj-in prj-in--wrap"><span className="prj-lnk" style={{ cursor: 'default' }}>{contract.label}<button type="button" style={{ background: 'none', border: 0, padding: 0, color: 'var(--pj-ink-3)', cursor: 'pointer', display: 'inline-flex' }} onClick={() => removeLink(contract)}><X size={11} /></button></span></div> : <LinkablePicker fixedType="contract" onPick={addLink} exclude={links} placeholder="ابحث عن عقد…" />}
              </div>
            </div>
            <div className="prj-f prj-row2">
              <div><label className="lbl">نوع المشروع {aiSuggested && <Chip tone="raed">اقترحه رائد</Chip>}</label>
                <select className="prj-in" value={effectiveArchetype} onChange={(e) => setArchetype(e.target.value)}><option value="">يختاره رائد من الوصف</option>{ARCHETYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              </div>
              <div><label className="lbl">اللون والرمز</label>
                <div className="prj-in"><span className="prj-pal">{PROJECT_COLORS.map((c) => <i key={c} className={`prj-color-${c} ${color === c ? 'is-on' : ''}`} style={{ background: 'var(--prj-c)' }} title={PROJECT_COLOR_LABELS[c]} onClick={() => setColor(c)} />)}</span><span className="prj-code" style={{ marginInlineStart: 'auto' }}>{client ? client.name.replace(/^(شركة|مؤسسة)\s+/, '').slice(0, 3).toUpperCase() : 'PRJ'}-··</span></div>
              </div>
            </div>
            <div className="prj-f prj-row2">
              <div><label className="lbl">الأولوية</label><select className="prj-in" value={priority} onChange={(e) => setPriority(e.target.value)}>{Object.entries(PROJECT_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className="lbl">مستوى السرية</label><select className="prj-in" value={confidentiality} onChange={(e) => setConfidentiality(e.target.value)}>{Object.entries(PROJECT_CONFIDENTIALITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            </div>
            <div className="prj-f"><label>الفريق بالأدوار (رائد يوزع المهام على الأدوار، وأنت تربط الأدوار بالأشخاص)</label>
              <div className="prj-roles">
                <div className="r"><span className="k">{PROJECT_ROLE_LABELS.partner}</span><UserSelect users={users} value={roleMap.partner} onChange={(id) => setRoleMap({ ...roleMap, partner: id })} placeholder="اختر…" /></div>
                <div className="r"><span className="k">{PROJECT_ROLE_LABELS.manager}</span><UserSelect users={users} value={roleMap.manager} onChange={(id) => setRoleMap({ ...roleMap, manager: id })} placeholder="اختر…" /></div>
                <div className="r"><span className="k">محامون</span><UserMultiSelect users={users} value={roleMap.lawyer} onChange={(ids) => setRoleMap({ ...roleMap, lawyer: ids })} /></div>
                <div className="r"><span className="k">{PROJECT_ROLE_LABELS.assistant}</span><UserSelect users={users} value={roleMap.assistant} onChange={(id) => setRoleMap({ ...roleMap, assistant: id })} placeholder="اختر…" /></div>
                <div className="r"><span className="k">{PROJECT_ROLE_LABELS.researcher}</span><UserSelect users={users} value={roleMap.researcher} onChange={(id) => setRoleMap({ ...roleMap, researcher: id })} placeholder="— بلا —" /></div>
                <div className="r"><span className="k">خارجي</span><input className="prj-in" value={externalName} onChange={(e) => setExternalName(e.target.value)} placeholder="مكتب ترجمة، خبير… (اختياري)" /></div>
              </div>
            </div>
            <div className="prj-f"><label>طريقة التخطيط</label>
              <div className="prj-methods">
                <button type="button" className={`m ${method === 'ai' ? 'is-on' : ''}`} onClick={() => setMethod('ai')} disabled={quota ? !quota.enabled : false}><Sparkles size={12} /> خطة رائد</button>
                <button type="button" className={`m ${method === 'template' ? 'is-on' : ''}`} onClick={() => setMethod('template')}>من قالب</button>
                <button type="button" className={`m ${method === 'manual' ? 'is-on' : ''}`} onClick={() => setMethod('manual')}>يدوياً</button>
              </div>
            </div>
            {method === 'ai' && (
              <div className="prj-f" style={{ paddingTop: 10 }}>
                <button type="button" className="prj-btn prj-btn--gold" onClick={askRaed} disabled={aiBusy || !name.trim()}>{aiBusy ? <Loader2 size={13} className="ssp2-spin" /> : <Sparkles size={13} />} {aiResult ? 'أعد توليد خطة رائد' : 'اطلب خطة رائد'}</button>
                <span className="prj-dim" style={{ fontSize: 11 }}>{aiResult && aiSeconds !== null ? `آخر توليد استغرق ${aiSeconds} ثانية · ` : ''}لا يُحفظ شيء قبل الضغط على «أنشئ المشروع»{quota ? ` · المتبقي اليوم ${quota.remaining} من ${quota.cap}` : ''}</span>
              </div>
            )}
            {method === 'template' && (
              <div className="prj-f"><label>القالب</label>
                <div className="prj-tiles" style={{ flexDirection: 'column' }}>
                  {templates.map((t) => <button type="button" key={t.id} className={`prj-tile ${templateId === t.id ? 'is-on' : ''}`} onClick={() => setTemplateId(t.id)}><b>{t.name} {!t.is_builtin && <Chip tone="raed">قالب المكتب</Chip>}</b><span>{t.description} · {t.stats.phases} مراحل · {t.stats.tasks} مهمة{t.stats.horizon_days ? ` · ${t.stats.horizon_days} يوم` : ''}</span></button>)}
                  {templates.length === 0 && <span className="prj-dim">جارٍ تحميل القوالب…</span>}
                </div>
              </div>
            )}
            {method === 'manual' && <div className="prj-f"><span className="prj-dim" style={{ fontSize: 11.5, lineHeight: 1.7 }}>مشروع فارغ تضيف مراحله ومهامه بنفسك من داخل الغرفة، ويمكن تطبيق قالب لاحقاً من «إجراء سريع».</span></div>}
          </div>

          <div className="prj-wiz__review">
            {aiBusy && <div className="prj-thinking"><Loader2 size={13} className="ssp2-spin" /> رائد يقرأ الوصف وبيانات القضايا وقوالب المكتب…</div>}
            <div className="prj-rv-top">
              <h3><Sparkles size={13} style={{ color: 'var(--pj-gold)' }} /> {method === 'ai' ? 'خطة رائد المقترحة' : method === 'template' ? (selectedTemplate ? `خطة القالب: ${selectedTemplate.name}` : 'خطة من قالب') : 'خطة يدوية'}</h3>
              {plan && <Chip tone="est">تقديرات تحتاج مراجعتك</Chip>}
              {aiResult?.fallback && <Chip tone="warn">تعذر التخصيص · قالب «{aiResult.base_template?.name}» كما هو</Chip>}
              <span className="prj-spacer" />
              {method === 'ai' && aiResult && aiSeconds !== null && <span className="prj-dim" style={{ fontSize: 11 }}>{aiSeconds} ثانية</span>}
            </div>
            {method === 'ai' && aiResult && (
              <div className="prj-rv-facts">
                <div><h4>ما قرأه رائد</h4><ul>{aiResult.facts.length ? aiResult.facts.map((f, i) => <li key={i}>{f}</li>) : <li className="prj-dim">الاسم والوصف فقط. اربط القضايا ليقرأ جلساتها وأطرافها.</li>}</ul></div>
                <div><h4>أسئلة رائد قبل الإنشاء</h4><ul>
                  {aiResult.questions.length === 0 && <li className="prj-dim">لا أسئلة.</li>}
                  {aiResult.questions.map((q) => <li key={q} className="prj-q"><span>{q}</span><span className="yn"><button type="button" className={answers[q] === 'yes' ? 'is-on' : ''} onClick={() => setAnswers({ ...answers, [q]: 'yes' })}>نعم</button><button type="button" className={answers[q] === 'no' ? 'is-on' : ''} onClick={() => setAnswers({ ...answers, [q]: 'no' })}>لا</button></span></li>)}
                  {aiResult.questions.length > 0 && <li className="prj-dim" style={{ fontSize: 10.5 }}>أجوبتك تُقرأ عند «أعد توليد خطة رائد».</li>}
                </ul></div>
              </div>
            )}
            <div className="prj-outline">
              {!plan && method === 'ai' && !aiBusy && <div className="prj-empty">اكتب الاسم والوصف واربط القضايا، ثم اضغط «اطلب خطة رائد». الخطة تظهر هنا لتراجعها قبل الإنشاء.</div>}
              {!plan && method === 'template' && <div className="prj-empty">اختر قالباً من القائمة لتظهر خطته هنا.</div>}
              {method === 'manual' && <div className="prj-empty">لا خطة الآن. بعد الإنشاء تضيف المراحل والمهام من الغرفة.</div>}
              {plan && (plan.workstreams.length ? plan.workstreams : [{ key: '', name: 'المراحل' }]).map((ws) => {
                const phs = plan.phases.filter((p) => (ws.key ? p.workstream === ws.key : true));
                if (!phs.length) return null;
                const n = phs.reduce((s, p) => s + p.tasks.length, 0);
                return (
                  <React.Fragment key={ws.key || 'all'}>
                    <div className="prj-ol-ws"><Layers size={12} /> مسار: {ws.name}<span className="prj-dim" style={{ fontWeight: 500, marginInlineStart: 6 }}>{phs.length} مراحل · {n} مهمة</span></div>
                    {phs.map((p, i) => (
                      <React.Fragment key={p.key}>
                        <div className="prj-ol-ph"><span className="prj-dim num">{i + 1}</span><span>{p.name}</span><span className="win">{window_(p)}</span>{p.requires_approval && <Chip tone="gate"><ShieldCheck size={10} /> موافقة {PROJECT_ROLE_LABELS[p.approver_role ?? 'partner']}</Chip>}{p.client_visible && <Chip tone="client"><Eye size={10} /> يظهر للعميل</Chip>}{p.activation === 'decision' && <Chip tone="dep">بعد قرار</Chip>}<span className="prj-dim" style={{ fontWeight: 500, fontSize: 11 }}>{PROJECT_ROLE_LABELS[p.owner_role]}</span></div>
                        {p.tasks.map((t) => <div key={t.key} className="prj-ol-it"><span className="t">{t.title}</span><span className="meta">{t.deliverable && <span className="role">مخرج: {t.deliverable}</span>}{t.client_action && <span className="role">من العميل</span>}<span className="role">{PROJECT_ROLE_LABELS[t.role] ?? t.role}</span><span className="num">{t.duration_days} يوم</span></span></div>)}
                        {plan.milestones.filter((m) => m.phase === p.key).map((m) => <div key={m.key} className="prj-ol-ms"><span className="d" />{m.name}<span className="prj-dim num">{ANCHOR_LABELS[m.anchor] ?? m.anchor} {m.offset_days >= 0 ? '+' : ''}{m.offset_days} يوم{m.source === 'estimate' ? ' · تقديري' : ''}</span></div>)}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                );
              })}
              {plan && plan.decision_points.map((dp) => <div key={dp.key} className="prj-ol-ws"><Chip tone="gate">نقطة قرار</Chip> {dp.question}<span className="prj-dim" style={{ fontWeight: 500 }}>{dp.options.map((o) => o.label).join(' / ')}</span></div>)}
            </div>
            <div className="prj-rv-foot">
              <span className="num">{stats ?? (method === 'manual' ? 'يبدأ فارغاً' : '—')}</span>
              <span className="prj-spacer" />
              {plan && <label className="prj-check"><input type="checkbox" checked={saveTemplate} onChange={(e) => setSaveTemplate(e.target.checked)} /> احفظ كقالب أيضاً</label>}
              <button type="button" className="prj-btn prj-btn--sm prj-btn--primary" onClick={create} disabled={!canCreate}>{saving ? <Loader2 size={12} className="ssp2-spin" /> : <Check size={12} />} أنشئ المشروع</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewProjectWizard;
