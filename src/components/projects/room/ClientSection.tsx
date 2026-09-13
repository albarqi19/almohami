import React, { useEffect, useState } from 'react';
import { AlertTriangle, Calendar, Check, Copy, Eye, FileText, Link2, Plus, ShieldCheck, Sparkles, Trash2, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { ClientProjectView, ProjectReport, ProjectShare, ShareScope } from '../../../types/projects';
import { SHARE_SCOPE_LABELS } from '../../../types/projects';
import { Chip, ErrorBox, Field, Modal, fmtDayMonth, fmtDate } from '../ui';
import { useRoom } from './RoomContext';

/**
 * العميل كما في التصوّر: معاينة بوابته (مسار المراحل، مطلوب منكم، اجتماعاتكم، التقارير) على اليمين،
 * وعلى اليسار: إعدادات ما يراه، مسودة تقرير العميل، وروابط المشاركة لمن ليس له حساب.
 */
const ClientSection: React.FC = () => {
  const { project, canEdit, refresh, goTo, consumePending } = useRoom();
  const [preview, setPreview] = useState<ClientProjectView | null>(null);
  const [shares, setShares] = useState<ProjectShare[]>([]);
  const [reports, setReports] = useState<ProjectReport[]>([]);
  const [create, setCreate] = useState(false);
  const [created, setCreated] = useState<ProjectShare | null>(null);

  const load = async () => {
    try { const [p, s, r] = await Promise.all([ProjectService.clientPreview(project.id), ProjectService.shares(project.id), ProjectService.reports(project.id)]); setPreview(p); setShares(s); setReports(r.filter((x) => x.kind === 'client')); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الجلب'); }
  };
  useEffect(() => { load(); if (consumePending('client_update')) goTo('reports'); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id, project.updated_at]);

  const copy = async (text: string, what: string) => { try { await navigator.clipboard.writeText(text); toast.success(`نُسخ ${what}`); } catch { toast.error('تعذر النسخ'); } };
  const remove = async (s: ProjectShare) => { if (!window.confirm(`إلغاء رابط «${s.label}»؟ لن يعمل بعدها.`)) return; try { await ProjectService.deleteShare(project.id, s.id); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الإلغاء'); } };

  const visiblePhases = project.phases.filter((p) => p.client_visible && !['hidden', 'skipped'].includes(p.status));
  const currentIdx = preview?.phases.findIndex((p) => p.is_current) ?? -1;
  const draft = reports.find((r) => r.status !== 'sent');
  const lateReq = preview?.tasks.filter((t) => t.status === 'open' && t.is_late).length ?? 0;

  return (
    <div className="prj-view">
      <div className="prj-portal">
        <div className="prj-portal__page">
          <div className="prj-dim" style={{ fontSize: 11 }}>معاينة ما يراه العميل في بوابته · لا يظهر إلا ما عُلّم «ظاهر للعميل»{project.client ? ` · ${project.client.name}` : ' · لا عميل مربوط بالمشروع'}</div>
          {!preview ? <div className="prj-empty">جارٍ التحميل…</div> : (
            <>
              <div className="prj-pcard">
                <div className="prj-pcard__h"><span className={`prj-dot prj-color-${project.color}`} /> {project.name} <span className="prj-spacer" /><Chip tone="doing">{project.status_label}{preview.phases.length ? ` · المرحلة ${currentIdx >= 0 ? currentIdx + 1 : '—'} من ${preview.phases.length}` : ''}</Chip></div>
                <div className="prj-pcard__b" style={{ padding: 0 }}>
                  {preview.phases.length === 0 ? <div className="prj-empty">لا مراحل ظاهرة للعميل. علّم المراحل التي تظهر له من نافذة المرحلة.</div> : (
                    <div className="prj-ptrack">
                      {preview.phases.map((p) => (
                        <div key={p.id} className={`prj-pstep ${p.status === 'completed' ? 'is-done' : ''} ${p.is_current ? 'is-cur' : ''}`}>
                          <b>{p.status === 'completed' ? '✓ ' : ''}{p.name}</b>
                          <span>{p.status === 'completed' ? `اكتملت ${fmtDayMonth(p.due_date)}` : p.is_current ? 'الجارية الآن' : `متوقعة ${fmtDayMonth(p.start_date)}`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="prj-pcard">
                <div className="prj-pcard__h"><Upload size={14} /> مطلوب منكم {lateReq > 0 && <Chip tone="client">{lateReq} متأخر</Chip>}</div>
                <div className="prj-pcard__b">
                  {preview.tasks.length === 0 && <div className="prj-dim">لا شيء مطلوب من العميل الآن.</div>}
                  {preview.tasks.map((t) => (
                    <div key={t.id} className="prj-preq">
                      {t.status === 'done' ? <Check size={14} style={{ color: 'var(--pj-ok)' }} /> : t.is_late ? <AlertTriangle size={14} style={{ color: 'var(--pj-bad)' }} /> : <Upload size={14} style={{ color: 'var(--pj-ink-3)' }} />}
                      <span className="t">{t.title}<small>{t.status === 'done' ? 'تم' : `${t.is_late ? 'كان الموعد' : 'الموعد'} ${fmtDayMonth(t.due_date)}`}{t.description ? ` · ${t.description}` : ''}</small></span>
                      {t.status === 'done' ? <Chip tone="done">تم</Chip> : <span className="prj-btn prj-btn--sm prj-btn--primary" style={{ pointerEvents: 'none' }}><Upload size={11} /> رفع الملفات</span>}
                    </div>
                  ))}
                  {preview.deliverables.filter((d) => d.client_step === 'current').map((d) => (
                    <div key={`d${d.id}`} className="prj-preq"><ShieldCheck size={14} style={{ color: 'var(--pj-warn)' }} /><span className="t">الموافقة على «{d.name}»<small>{d.type_label} · تنتظر موافقة العميل</small></span><span className="prj-btn prj-btn--sm" style={{ pointerEvents: 'none' }}>مراجعة والموافقة</span></div>
                  ))}
                </div>
              </div>
              <div className="prj-pcard">
                <div className="prj-pcard__h"><Calendar size={14} /> اجتماعاتكم ومواعيدكم القادمة</div>
                <div className="prj-pcard__b">
                  {preview.meetings.length === 0 && preview.milestones.filter((m) => m.status === 'planned').length === 0 && <div className="prj-dim">لا مواعيد ظاهرة.</div>}
                  {preview.meetings.map((m) => <div key={m.id} className="prj-preq"><Calendar size={14} style={{ color: 'var(--pj-ink-3)' }} /><span className="t">{m.name}<small>{fmtDayMonth(m.date)}</small></span></div>)}
                  {preview.milestones.filter((m) => m.status === 'planned').slice(0, 5).map((m) => <div key={`m${m.id}`} className="prj-preq"><Calendar size={14} style={{ color: 'var(--pj-ink-3)' }} /><span className="t">{m.name}<small>{fmtDayMonth(m.date)}{m.is_estimate ? ' · موعد تقديري قد يتغير' : m.from_court ? ' · من المحكمة' : ''}</small></span></div>)}
                </div>
              </div>
              <div className="prj-pcard">
                <div className="prj-pcard__h"><FileText size={14} /> التقارير والمستندات النهائية</div>
                <div className="prj-pcard__b">
                  {preview.reports.length === 0 && preview.deliverables.filter((d) => d.status === 'final' || d.status === 'submitted').length === 0 && <div className="prj-dim">لم يُرسل تقرير بعد ولا مخرجات نهائية ظاهرة.</div>}
                  {preview.reports.map((r) => <div key={r.id} className="prj-preq"><FileText size={14} style={{ color: 'var(--pj-ink-3)' }} /><span className="t">{r.title}<small>{fmtDayMonth(r.sent_at)}</small></span><span className="prj-btn prj-btn--sm" style={{ pointerEvents: 'none' }}>عرض</span></div>)}
                  {preview.deliverables.filter((d) => d.status === 'final' || d.status === 'submitted').map((d) => <div key={`f${d.id}`} className="prj-preq"><FileText size={14} style={{ color: 'var(--pj-ink-3)' }} /><span className="t">{d.name}<small>{d.type_label}{d.version ? ` · النسخة ${d.version}` : ''}</small></span></div>)}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="prj-portal__side">
          <div className="prj-card__head"><Eye size={14} /> إعدادات ما يراه العميل</div>
          <div className="prj-kv"><span className="k">المراحل الظاهرة</span><span>{visiblePhases.length} من {project.phases.filter((p) => p.status !== 'skipped').length} · المسارات المخفية لا تظهر حتى تُفعّل</span></div>
          <div className="prj-kv"><span className="k">المهام الظاهرة</span><span>المطلوبة من العميل، وما عُلّم «يراها العميل» كعنوان فقط</span></div>
          <div className="prj-kv"><span className="k">المواعيد</span><span>جلسات ناجز بتاريخها، والتقديرات مع كلمة «تقديري»</span></div>
          <div className="prj-kv"><span className="k">تقرير العميل</span><span>مسودة من بيانات المشروع أو من رائد · يُرسل بعد الاعتماد</span></div>
          <div className="prj-card__head"><Sparkles size={14} /> {draft ? `مسودة ${draft.title}` : 'تقرير العميل'} {draft && <Chip tone={draft.status === 'approved' ? 'ok' : 'raed'}>{draft.status === 'approved' ? 'معتمد · جاهز للإرسال' : 'جاهزة للمراجعة'}</Chip>}</div>
          <div className="prj-sec__body">
            {draft ? <>{draft.body.slice(0, 420)}{draft.body.length > 420 ? '…' : ''}<div className="prj-dim" style={{ marginTop: 6, fontSize: 11 }}>{draft.status === 'approved' ? 'يُرسل من صفحة التقارير.' : 'لا يُرسل قبل الاعتماد.'} <button type="button" className="prj-link" onClick={() => goTo('reports')}>افتح التقارير</button></div></> : <span className="prj-dim">لا مسودة الآن. <button type="button" className="prj-link" onClick={() => goTo('reports')}>أنشئ تقرير العميل</button></span>}
          </div>
          <div className="prj-card__head"><Link2 size={14} /> روابط المشاركة الخارجية <span className="prj-cnt num">{shares.length}</span><span className="prj-spacer" />{canEdit && <button type="button" className="prj-btn prj-btn--sm" onClick={() => setCreate(true)}><Plus size={11} /> رابط</button>}</div>
          <div className="prj-sec__body prj-dim" style={{ fontSize: 11, paddingBottom: 4 }}>لمن ليس له حساب: استشاري، شريك في الصفقة، ممثل العميل. يفتح الرابط ويدخل الرقم السري فيرى نافذة المشروع بما تحدده أنت. يُقفل ربع ساعة بعد ٥ محاولات خاطئة.</div>
          {shares.length === 0 && <div className="prj-empty">لا روابط بعد.</div>}
          {shares.map((s) => (
            <div key={s.id} className="prj-share">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <b>{s.label}</b><Chip tone={s.is_active ? 'done' : 'todo'}>{s.is_active ? 'فعال' : 'موقوف'}</Chip>
                <span className="prj-dim">{s.access_count} دخول{s.expires_at ? ` · ينتهي ${fmtDate(s.expires_at)}` : ''}</span>
                {canEdit && <button type="button" className="prj-ibtn" style={{ marginInlineStart: 'auto', width: 22, height: 22 }} title="إلغاء الرابط" onClick={() => remove(s)}><Trash2 size={11} /></button>}
              </div>
              <div className="prj-dim" style={{ marginTop: 3, fontSize: 11 }}>يرى: {(Object.keys(s.scope) as Array<keyof ShareScope>).filter((k) => s.scope[k]).map((k) => SHARE_SCOPE_LABELS[k]).join('، ')}</div>
              <div className="prj-share__url"><code>{s.url}</code><button type="button" className="prj-ibtn" title="نسخ الرابط" onClick={() => copy(s.url, 'الرابط')}><Copy size={11} /></button></div>
            </div>
          ))}
        </div>
      </div>

      {create && <ShareModal onClose={() => setCreate(false)} onCreated={async (s) => { setCreate(false); setCreated(s); await load(); await refresh(); }} />}
      {created && (
        <Modal title="الرابط جاهز" onClose={() => setCreated(null)} foot={<button type="button" className="prj-btn prj-btn--primary" onClick={() => setCreated(null)}>تم</button>}>
          <div className="prj-notice">الرقم السري يظهر مرة واحدة الآن. أرسل الرابط والرقم في رسالتين منفصلتين إن أمكن.</div>
          <Field label="الرابط"><div className="prj-share__url"><code>{created.url}</code><button type="button" className="prj-ibtn" onClick={() => copy(created.url, 'الرابط')}><Copy size={11} /></button></div></Field>
          {created.pin && <Field label="الرقم السري"><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="prj-share__pin">{created.pin}</span><button type="button" className="prj-ibtn" onClick={() => copy(created.pin!, 'الرقم السري')}><Copy size={11} /></button></div></Field>}
        </Modal>
      )}
    </div>
  );
};

const ShareModal: React.FC<{ onClose: () => void; onCreated: (s: ProjectShare) => Promise<void> }> = ({ onClose, onCreated }) => {
  const { project } = useRoom();
  const [label, setLabel] = useState('');
  const [pin, setPin] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [expires, setExpires] = useState('');
  const [scope, setScope] = useState<ShareScope>({ overview: true, phases: true, milestones: true, tasks: false, deliverables: true, reports: true, documents: false, meetings: true });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!label.trim()) { setErr('اكتب لمن هذا الرابط'); return; }
    if (pin && !/^\d{4,8}$/.test(pin)) { setErr('الرقم السري من ٤ إلى ٨ أرقام'); return; }
    setBusy(true);
    try { const s = await ProjectService.createShare(project.id, { label: label.trim(), pin: pin || undefined, scope, expires_at: expires || undefined }); await onCreated(s); }
    catch (e) { setErr(e instanceof Error ? e.message : 'تعذر الإنشاء'); }
    finally { setBusy(false); }
  };
  return (
    <Modal title="رابط مشاركة جديد" onClose={onClose} foot={<><button type="button" className="prj-btn" onClick={onClose}>إلغاء</button><button type="button" className="prj-btn prj-btn--primary" onClick={submit} disabled={busy}>إنشاء</button></>}>
      <ErrorBox error={err} />
      <div className="prj-form">
        <Field label="لمن؟" full><input className="prj-in" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="الاستشاري الهندسي، مدير الشؤون القانونية لدى العميل…" autoFocus /></Field>
        <Field label="الرقم السري" hint="٤ إلى ٨ أرقام. اتركه فارغاً لرابط بلا رقم."><input className="prj-in" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} dir="ltr" maxLength={8} /></Field>
        <Field label="ينتهي في" hint="افتراضياً ٩٠ يوماً."><input type="date" className="prj-in" value={expires} onChange={(e) => setExpires(e.target.value)} /></Field>
        <Field label="ماذا يرى؟" full>
          <div className="prj-chips">{(Object.keys(SHARE_SCOPE_LABELS) as Array<keyof ShareScope>).map((k) => <label key={k} className="prj-check" style={{ border: '1px solid var(--pj-line)', borderRadius: 999, padding: '3px 9px' }}><input type="checkbox" checked={scope[k]} onChange={(e) => setScope({ ...scope, [k]: e.target.checked })} /> {SHARE_SCOPE_LABELS[k]}</label>)}</div>
        </Field>
      </div>
    </Modal>
  );
};

export default ClientSection;
