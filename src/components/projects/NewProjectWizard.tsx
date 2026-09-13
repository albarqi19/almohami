import React, { useEffect, useMemo, useState } from 'react';
import { BookTemplate, Check, Loader2, PencilLine, Sparkles, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { ProjectService } from '../../services/projectService';
import type { CreateProjectInput } from '../../services/projectService';
import type { AiPlanResult, AiRun, Linkable, ProjectFull, ProjectLinkType, ProjectTemplateSummary, RoleMap } from '../../types/projects';
import { PROJECT_COLORS, PROJECT_COLOR_LABELS, PROJECT_CONFIDENTIALITY_LABELS, PROJECT_LINK_LABELS, PROJECT_PRIORITY_LABELS, PROJECT_ROLE_LABELS } from '../../types/projects';
import { ClientPicker, ErrorBox, Field, LinkablePicker, Modal, UserMultiSelect, UserSelect, useOfficeUsers } from './ui';

type PlanMode = 'template' | 'ai' | 'manual';
type Step = 1 | 2 | 3;

interface PickedLink { type: ProjectLinkType; id: number; label: string }

const ROLE_HINTS: Record<keyof RoleMap, string> = {
  partner: 'يوافق على المراحل والمخرجات المهمة',
  manager: 'يتابع الخطة يومياً ويستلم تنبيهات الانتباه',
  lawyer: 'ينفذ المهام القانونية (يمكن أكثر من واحد)',
  assistant: 'المستندات والمتابعة والتنسيق',
  researcher: 'البحث القانوني والسوابق',
  external: 'خبير أو مستشار من خارج المكتب (اختياري)',
};

/**
 * معالج «مشروع جديد» من ثلاث خطوات: الأساس والربط، ثم مصدر الخطة (قالب أو خطة رائد أو يدوي)،
 * ثم من يقوم بكل دور. الإنشاء ينشئ المشروع ويطبق الخطة دفعة واحدة.
 */
const NewProjectWizard: React.FC<{ onClose: () => void; onCreated: (project: ProjectFull, applied: Record<string, number> | null, planError?: string | null) => void }> = ({ onClose, onCreated }) => {
  const { user } = useAuth();
  const { users } = useOfficeUsers();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // الخطوة ١
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [client, setClient] = useState<{ id: number; name: string } | null>(null);
  const [priority, setPriority] = useState('medium');
  const [color, setColor] = useState('navy');
  const [confidentiality, setConfidentiality] = useState('team');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [targetEnd, setTargetEnd] = useState('');
  const [links, setLinks] = useState<PickedLink[]>([]);

  // الخطوة ٢
  const [mode, setMode] = useState<PlanMode>('template');
  const [templates, setTemplates] = useState<ProjectTemplateSummary[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [aiNotes, setAiNotes] = useState('');
  const [aiRun, setAiRun] = useState<AiRun | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiQuota, setAiQuota] = useState<{ remaining: number; cap: number; enabled: boolean } | null>(null);

  // الخطوة ٣
  const [roleMap, setRoleMap] = useState<RoleMap>({ partner: null, manager: user ? Number(user.id) : null, lawyer: [], assistant: null, researcher: null, external: null });
  const [extraMembers, setExtraMembers] = useState<number[]>([]);

  useEffect(() => {
    if (step !== 2) return;
    if (templates.length === 0) {
      setTemplatesLoading(true);
      ProjectService.templates().then(setTemplates).catch((e: Error) => setError(e.message)).finally(() => setTemplatesLoading(false));
    }
    if (!aiQuota) ProjectService.aiQuota().then(setAiQuota).catch(() => setAiQuota(null));
  }, [step, templates.length, aiQuota]);

  const selectedTemplate = useMemo(() => templates.find((t) => t.id === templateId) ?? null, [templates, templateId]);
  const aiResult = (aiRun?.status === 'ready' ? (aiRun.result as unknown as AiPlanResult) : null);

  const canNext1 = name.trim().length >= 3;
  const canNext2 = mode === 'manual' || (mode === 'template' && templateId !== null) || (mode === 'ai' && !!aiResult);

  const addLink = (type: ProjectLinkType, item: Linkable) => {
    if (links.some((l) => l.type === type && l.id === item.id)) return;
    setLinks([...links, { type, id: item.id, label: item.label }]);
  };

  const askRaed = async () => {
    setError(null);
    setAiBusy(true);
    try {
      const run = await ProjectService.aiPlan({
        name: name.trim(),
        description: description.trim() || undefined,
        notes: aiNotes.trim() || undefined,
        client_name: client?.name,
        case_ids: links.filter((l) => l.type === 'case').map((l) => l.id),
        execution_request_ids: links.filter((l) => l.type === 'execution_request').map((l) => l.id),
        legal_service_ids: links.filter((l) => l.type === 'legal_service').map((l) => l.id),
        has_contract: links.some((l) => l.type === 'contract'),
      });
      setAiRun(run);
      const done = await ProjectService.waitForRun(run.id, setAiRun);
      if (done.status === 'failed') setError(done.error || 'تعذر توليد الخطة');
      setAiQuota((q) => (q ? { ...q, remaining: Math.max(0, q.remaining - 1) } : q));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر توليد الخطة');
    } finally {
      setAiBusy(false);
    }
  };

  const create = async () => {
    setError(null);
    setSaving(true);
    try {
      const members = extraMembers.map((id) => ({ user_id: id }));
      const input: CreateProjectInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        client_id: client?.id ?? null,
        priority,
        color,
        confidentiality,
        start_date: startDate || undefined,
        target_end_date: targetEnd || undefined,
        links: links.map((l) => ({ type: l.type, id: l.id })),
        members,
        partner_id: roleMap.partner,
        manager_id: roleMap.manager,
        plan_source: mode,
        template_id: mode === 'template' ? (templateId ?? undefined) : undefined,
        ai_run_id: mode === 'ai' ? (aiRun?.id ?? undefined) : undefined,
        role_map: roleMap,
        archetype: mode === 'template' ? (selectedTemplate?.archetype ?? undefined) : (aiResult?.plan.archetype ?? undefined),
      };
      const res = await ProjectService.create(input);
      toast.success(res.message || 'أُنشئ المشروع');
      onCreated(res.project, res.applied, res.plan_error);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إنشاء المشروع');
    } finally {
      setSaving(false);
    }
  };

  const foot = (
    <>
      {step > 1 && <button type="button" className="ssp2-btn" onClick={() => setStep((step - 1) as Step)} disabled={saving || aiBusy}>السابق</button>}
      {step < 3 && <button type="button" className="ssp2-btn ssp2-btn--primary" onClick={() => setStep((step + 1) as Step)} disabled={step === 1 ? !canNext1 : !canNext2}>التالي</button>}
      {step === 3 && (
        <button type="button" className="ssp2-btn ssp2-btn--primary" onClick={create} disabled={saving}>
          {saving ? <Loader2 size={13} className="ssp2-spin" /> : <Check size={13} />} إنشاء المشروع
        </button>
      )}
    </>
  );

  return (
    <Modal title="مشروع جديد" onClose={onClose} wide foot={foot}>
      <div className="prj-steps">
        {[['١', 'الأساس والربط'], ['٢', 'الخطة'], ['٣', 'الفريق']].map(([n, label], i) => (
          <div key={label} className={`prj-steps__item ${step === i + 1 ? 'prj-steps__item--active' : ''} ${step > i + 1 ? 'prj-steps__item--done' : ''}`}>{n} · {label}</div>
        ))}
      </div>
      <ErrorBox error={error} />

      {step === 1 && (
        <div className="prj-form">
          <Field label="اسم المشروع" full>
            <input className="ssp2-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: نزاع شركة الأفق مع شركة الرواسي" autoFocus />
          </Field>
          <Field label="وصف مختصر" full hint="اكتب ما تعرفه: طبيعة النزاع أو الصفقة، المبلغ، الجهة، ما هو مطلوب. رائد يقرأ هذا الوصف عند بناء الخطة.">
            <textarea className="ssp2-input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="العميل"><ClientPicker value={client} onChange={setClient} /></Field>
          <Field label="الأولوية">
            <select className="ssp2-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {Object.entries(PROJECT_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="تاريخ البداية"><input type="date" className="ssp2-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          <Field label="الهدف للانتهاء" hint="اختياري. القالب أو رائد يقترح مدة إن تركته فارغاً."><input type="date" className="ssp2-input" value={targetEnd} onChange={(e) => setTargetEnd(e.target.value)} /></Field>
          <Field label="من يرى المشروع">
            <select className="ssp2-input" value={confidentiality} onChange={(e) => setConfidentiality(e.target.value)}>
              {Object.entries(PROJECT_CONFIDENTIALITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="اللون">
            <div className="prj-chips">
              {PROJECT_COLORS.map((c) => (
                <button type="button" key={c} className={`prj-chip prj-color-${c} ${color === c ? 'prj-chip--navy' : ''}`} onClick={() => setColor(c)} title={PROJECT_COLOR_LABELS[c]} style={{ cursor: 'pointer' }}>
                  <span className="prj-dot" /> {PROJECT_COLOR_LABELS[c]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="الارتباطات" full hint="قضايا وطلبات تنفيذ وخدمات واجتماعات وعقود. جلسات القضايا المربوطة تدخل الخط الزمني تلقائياً.">
            <LinkablePicker onPick={addLink} exclude={links} />
            {links.length > 0 && (
              <div className="prj-chips" style={{ marginTop: 6 }}>
                {links.map((l) => (
                  <span key={`${l.type}-${l.id}`} className="prj-chip prj-chip--navy">
                    {PROJECT_LINK_LABELS[l.type]}: {l.label}
                    <button type="button" onClick={() => setLinks(links.filter((x) => !(x.type === l.type && x.id === l.id)))} aria-label="إزالة"><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
          </Field>
        </div>
      )}

      {step === 2 && (
        <>
          <div className="prj-choice">
            <button type="button" className={`prj-choice__item ${mode === 'template' ? 'prj-choice__item--active' : ''}`} onClick={() => setMode('template')}>
              <div className="prj-choice__title"><BookTemplate size={15} /> من قالب</div>
              <div className="prj-choice__desc">خطة جاهزة ومجربة لنوع المشروع: مراحل ومهام ومواعيد ونقاط قرار. تعدل ما تشاء بعد الإنشاء.</div>
            </button>
            <button type="button" className={`prj-choice__item ${mode === 'ai' ? 'prj-choice__item--active' : ''}`} onClick={() => setMode('ai')} disabled={aiQuota ? !aiQuota.enabled : false}>
              <div className="prj-choice__title"><Sparkles size={15} /> خطة رائد</div>
              <div className="prj-choice__desc">رائد يقرأ الوصف والقضايا المربوطة ويبني خطة مخصصة على أساس أقرب قالب. {aiQuota && <span>المتبقي اليوم: {aiQuota.remaining}/{aiQuota.cap}.</span>}</div>
            </button>
            <button type="button" className={`prj-choice__item ${mode === 'manual' ? 'prj-choice__item--active' : ''}`} onClick={() => setMode('manual')}>
              <div className="prj-choice__title"><PencilLine size={15} /> يدوياً</div>
              <div className="prj-choice__desc">مشروع فارغ تضيف مراحله ومهامه بنفسك من داخل الغرفة.</div>
            </button>
          </div>

          {mode === 'template' && (
            <div className="prj-tpl">
              {templatesLoading && <div className="prj-muted">جارٍ تحميل القوالب…</div>}
              {templates.map((t) => (
                <button type="button" key={t.id} className={`prj-tpl__item ${templateId === t.id ? 'prj-tpl__item--active' : ''}`} onClick={() => setTemplateId(t.id)}>
                  <div>
                    <div className="prj-tpl__name">{t.name} {!t.is_builtin && <span className="prj-chip prj-chip--gold">قالب المكتب</span>}</div>
                    <div className="prj-tpl__desc">{t.description}</div>
                  </div>
                  <div className="prj-tpl__stats">{t.stats.phases} مراحل · {t.stats.tasks} مهمة · {t.stats.milestones} مواعيد · {t.stats.horizon_days ? `${t.stats.horizon_days} يوم` : ''}</div>
                </button>
              ))}
            </div>
          )}

          {mode === 'ai' && (
            <div className="prj-form">
              <Field label="ملاحظات إضافية لرائد" full hint="أي شيء يغير الخطة: شرط تحكيم، أطراف كثيرة، ضيق وقت، قيود من العميل…">
                <textarea className="ssp2-input" rows={3} value={aiNotes} onChange={(e) => setAiNotes(e.target.value)} />
              </Field>
              <div className="prj-form__full" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button type="button" className="ssp2-btn ssp2-btn--primary" onClick={askRaed} disabled={aiBusy || !name.trim()}>
                  {aiBusy ? <Loader2 size={13} className="ssp2-spin" /> : <Sparkles size={13} />} {aiResult ? 'أعد التوليد' : 'اطلب خطة رائد'}
                </button>
                {aiBusy && <span className="prj-muted">رائد يقرأ الوصف والحقائق ويبني الخطة… عادةً أقل من دقيقة.</span>}
              </div>
              {aiResult && (
                <div className="prj-form__full">
                  {aiResult.fallback && <div className="prj-notice">تعذر توليد خطة مخصصة، فاستُخدم قالب «{aiResult.base_template?.name}» كما هو. يمكنك إعادة المحاولة أو المتابعة به.</div>}
                  {aiResult.plan.summary && <p className="ssp2-hint" style={{ marginBottom: 8 }}>{aiResult.plan.summary}</p>}
                  <div className="prj-plan-preview">
                    {aiResult.plan.phases.map((p) => (
                      <div key={p.key} className="prj-plan-preview__phase">
                        <b>{p.name}</b><small>{p.duration_days} يوم · {p.tasks.length} مهام{p.requires_approval ? ' · تحتاج موافقة' : ''}{p.activation === 'decision' ? ' · بعد قرار' : ''}</small>
                        {p.objective && <div className="prj-muted">{p.objective}</div>}
                      </div>
                    ))}
                  </div>
                  <div className="prj-muted" style={{ marginTop: 6 }}>{aiResult.stats.phases} مراحل · {aiResult.stats.tasks} مهمة · {aiResult.stats.milestones} مواعيد · {aiResult.stats.decision_points} نقاط قرار · {aiResult.stats.risks} مخاطر · {aiResult.stats.issues} مسائل</div>
                  {aiResult.questions.length > 0 && (
                    <div className="prj-notice" style={{ marginTop: 8 }}>
                      <b>أسئلة رائد قبل البدء:</b>
                      <ul style={{ margin: '4px 0 0', paddingInlineStart: 18 }}>{aiResult.questions.map((q) => <li key={q}>{q}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {mode === 'manual' && <p className="ssp2-hint">ستبدأ بمشروع فارغ. من داخل الغرفة تضيف المراحل والمهام والمواعيد، أو تطبق قالباً لاحقاً من قائمة الإجراءات.</p>}
        </>
      )}

      {step === 3 && (
        <div>
          <p className="ssp2-hint" style={{ marginBottom: 8 }}>من يقوم بكل دور في هذا المشروع؟ الخطة توزع المهام على الأدوار، وهنا تحول الدور إلى شخص. الدور الفارغ تُسند مهامه إلى مدير المشروع.</p>
          {(Object.keys(ROLE_HINTS) as Array<keyof RoleMap>).map((role) => (
            <div key={role} className="prj-role-row">
              <div className="prj-role-row__label">{PROJECT_ROLE_LABELS[role]}<span className="prj-role-row__hint">{ROLE_HINTS[role]}</span></div>
              {role === 'lawyer'
                ? <UserMultiSelect users={users} value={roleMap.lawyer} onChange={(ids) => setRoleMap({ ...roleMap, lawyer: ids })} />
                : <UserSelect users={users} value={roleMap[role] as number | null} onChange={(id) => setRoleMap({ ...roleMap, [role]: id })} />}
            </div>
          ))}
          <div className="prj-role-row">
            <div className="prj-role-row__label">أعضاء آخرون<span className="prj-role-row__hint">يرون المشروع بلا دور محدد</span></div>
            <UserMultiSelect users={users} value={extraMembers} onChange={setExtraMembers} />
          </div>
        </div>
      )}
    </Modal>
  );
};

export default NewProjectWizard;
