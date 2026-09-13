import React, { useEffect, useState } from 'react';
import { Copy, Eye, Link2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { ClientProjectView, ProjectShare, ShareScope } from '../../../types/projects';
import { DELIVERABLE_STATUS_LABELS, MILESTONE_STATUS_LABELS, PHASE_STATUS_LABELS, SHARE_SCOPE_LABELS } from '../../../types/projects';
import { Chip, ErrorBox, Field, Modal, fmtDate, fmtDateTime } from '../ui';
import { useRoom } from './RoomContext';

/** ما يراه العميل: معاينة بوابته كما هي، وروابط المشاركة الخارجية (رابط + رقم سري) لمن ليس له حساب. */
const ClientSection: React.FC = () => {
  const { project, canEdit, refresh } = useRoom();
  const [preview, setPreview] = useState<ClientProjectView | null>(null);
  const [shares, setShares] = useState<ProjectShare[]>([]);
  const [create, setCreate] = useState(false);
  const [created, setCreated] = useState<ProjectShare | null>(null);

  const load = async () => {
    try { const [p, s] = await Promise.all([ProjectService.clientPreview(project.id), ProjectService.shares(project.id)]); setPreview(p); setShares(s); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الجلب'); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id, project.updated_at]);

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(`نُسخ ${what}`); } catch { toast.error('تعذر النسخ'); }
  };

  const remove = async (s: ProjectShare) => {
    if (!window.confirm(`إلغاء رابط «${s.label}»؟ لن يعمل بعدها.`)) return;
    try { await ProjectService.deleteShare(project.id, s.id); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الإلغاء'); }
  };

  return (
    <div className="prj-grid-2">
      <div className="prj-block">
        <div className="prj-block__head"><Eye size={14} /> ما يراه العميل في بوابته
          {project.client ? <Chip tone="muted">{project.client.name}</Chip> : <Chip tone="warn">لا عميل مربوط</Chip>}
        </div>
        <div className="prj-block__body">
          <p className="ssp2-hint" style={{ marginBottom: 8 }}>يرى المراحل والمواعيد والمخرجات المعلّمة «تظهر للعميل»، ومهام «مطلوب منكم»، وتقارير العميل المرسلة. لا يرى الساعات ولا المخاطر ولا المسائل ولا المحادثة.</p>
          {!preview ? <div className="prj-muted">جارٍ التحميل…</div> : (
            <>
              <div className="prj-block"><div className="prj-block__head">المراحل الظاهرة <Chip tone="muted">{preview.phases.length}</Chip></div>
                <div className="prj-block__body prj-block__body--flush">{preview.phases.map((p) => <div key={p.id} className="prj-ms"><span className="prj-ms__date">{fmtDate(p.start_date)}</span><span className="prj-ms__name">{p.name}{p.is_current && <Chip tone="navy">الجارية</Chip>}</span><Chip tone={p.status === 'completed' ? 'done' : 'muted'}>{PHASE_STATUS_LABELS[p.status]}</Chip></div>)}{preview.phases.length === 0 && <div className="ssp2-empty">لا مراحل ظاهرة.</div>}</div>
              </div>
              <div className="prj-block"><div className="prj-block__head">المواعيد الظاهرة <Chip tone="muted">{preview.milestones.length}</Chip></div>
                <div className="prj-block__body prj-block__body--flush">{preview.milestones.map((m) => <div key={m.id} className={`prj-ms prj-ms--${m.status}`}><span className="prj-ms__date">{fmtDate(m.date)}</span><span className="prj-ms__name">{m.name}{m.is_estimate && <span className="prj-muted"> · تقديري</span>}{m.from_court && <span className="prj-muted"> · من المحكمة</span>}</span><Chip tone={m.status === 'done' ? 'done' : m.status === 'missed' ? 'bad' : 'muted'}>{MILESTONE_STATUS_LABELS[m.status]}</Chip></div>)}{preview.milestones.length === 0 && <div className="ssp2-empty">لا مواعيد ظاهرة.</div>}</div>
              </div>
              <div className="prj-block"><div className="prj-block__head">مطلوب من العميل <Chip tone="muted">{preview.tasks.length}</Chip></div>
                <div className="prj-block__body prj-block__body--flush">{preview.tasks.map((t) => <div key={t.id} className="prj-ms"><span className="prj-ms__date">{fmtDate(t.due_date)}</span><span className="prj-ms__name">{t.title}</span><Chip tone={t.status === 'done' ? 'done' : t.is_late ? 'bad' : 'gold'}>{t.status === 'done' ? 'تم' : t.is_late ? 'متأخر' : 'مطلوب'}</Chip></div>)}{preview.tasks.length === 0 && <div className="ssp2-empty">لا شيء مطلوب من العميل الآن.</div>}</div>
              </div>
              <div className="prj-block"><div className="prj-block__head">المخرجات الظاهرة <Chip tone="muted">{preview.deliverables.length}</Chip></div>
                <div className="prj-block__body prj-block__body--flush">{preview.deliverables.map((d) => <div key={d.id} className="prj-ms"><span className="prj-ms__date">{fmtDate(d.due_date)}</span><span className="prj-ms__name">{d.name} <span className="prj-muted">· {d.type_label}</span>{d.client_step === 'current' && <Chip tone="gold">تنتظر موافقته</Chip>}</span><Chip tone={d.status === 'final' ? 'done' : 'muted'}>{DELIVERABLE_STATUS_LABELS[d.status]}</Chip></div>)}{preview.deliverables.length === 0 && <div className="ssp2-empty">لا مخرجات ظاهرة.</div>}</div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="prj-block">
        <div className="prj-block__head"><Link2 size={14} /> روابط المشاركة الخارجية <Chip tone="muted">{shares.length}</Chip>
          {canEdit && <div className="prj-block__tools"><button type="button" className="ssp2-btn" style={{ padding: '3px 9px', fontSize: 11.5 }} onClick={() => setCreate(true)}><Plus size={12} /> رابط جديد</button></div>}
        </div>
        <div className="prj-block__body prj-block__body--flush">
          <p className="ssp2-hint" style={{ padding: '10px 12px 4px' }}>لمن ليس له حساب: استشاري، شريك في الصفقة، ممثل العميل. يفتح الرابط ويدخل الرقم السري فيرى نافذة المشروع بما تحدده أنت فقط. يُقفل الرابط ربع ساعة بعد ٥ محاولات خاطئة.</p>
          {shares.length === 0 && <div className="ssp2-empty">لا روابط بعد.</div>}
          {shares.map((s) => (
            <div key={s.id} className="prj-share">
              <div className="prj-inline">
                <b>{s.label}</b>
                <Chip tone={s.is_active ? 'done' : 'muted'}>{s.is_active ? 'فعال' : 'موقوف'}</Chip>
                <span className="prj-muted">{s.access_count} دخول{s.last_accessed_at ? ` · آخره ${fmtDateTime(s.last_accessed_at)}` : ''}{s.expires_at ? ` · ينتهي ${fmtDate(s.expires_at)}` : ''}</span>
                {canEdit && <button type="button" className="ssp2-icon-btn" style={{ marginInlineStart: 'auto' }} title="إلغاء الرابط" onClick={() => remove(s)}><Trash2 size={13} /></button>}
              </div>
              <div className="prj-muted" style={{ marginTop: 3 }}>يرى: {(Object.keys(s.scope) as Array<keyof ShareScope>).filter((k) => s.scope[k]).map((k) => SHARE_SCOPE_LABELS[k]).join('، ')}</div>
              <div className="prj-share__url"><code>{s.url}</code><button type="button" className="ssp2-icon-btn" title="نسخ الرابط" onClick={() => copy(s.url, 'الرابط')}><Copy size={13} /></button></div>
            </div>
          ))}
        </div>
      </div>

      {create && <ShareModal onClose={() => setCreate(false)} onCreated={async (s) => { setCreate(false); setCreated(s); await load(); await refresh(); }} />}
      {created && (
        <Modal title="الرابط جاهز" onClose={() => setCreated(null)} foot={<button type="button" className="ssp2-btn ssp2-btn--primary" onClick={() => setCreated(null)}>تم</button>}>
          <div className="prj-notice">الرقم السري يظهر مرة واحدة الآن. أرسل الرابط والرقم في رسالتين منفصلتين إن أمكن.</div>
          <Field label="الرابط"><div className="prj-share__url"><code>{created.url}</code><button type="button" className="ssp2-icon-btn" onClick={() => copy(created.url, 'الرابط')}><Copy size={13} /></button></div></Field>
          {created.pin && <Field label="الرقم السري"><div className="prj-inline"><span className="prj-share__pin">{created.pin}</span><button type="button" className="ssp2-icon-btn" onClick={() => copy(created.pin!, 'الرقم السري')}><Copy size={13} /></button></div></Field>}
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
    <Modal title="رابط مشاركة جديد" onClose={onClose} foot={<><button type="button" className="ssp2-btn" onClick={onClose}>إلغاء</button><button type="button" className="ssp2-btn ssp2-btn--primary" onClick={submit} disabled={busy}>إنشاء</button></>}>
      <ErrorBox error={err} />
      <div className="prj-form">
        <Field label="لمن؟" full><input className="ssp2-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="الاستشاري الهندسي، مدير الشؤون القانونية لدى العميل…" autoFocus /></Field>
        <Field label="الرقم السري" hint="٤ إلى ٨ أرقام. اتركه فارغاً لرابط بلا رقم."><input className="ssp2-input" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} dir="ltr" maxLength={8} /></Field>
        <Field label="ينتهي في" hint="افتراضياً ٩٠ يوماً."><input type="date" className="ssp2-input" value={expires} onChange={(e) => setExpires(e.target.value)} /></Field>
        <Field label="ماذا يرى؟" full>
          <div className="prj-chips">
            {(Object.keys(SHARE_SCOPE_LABELS) as Array<keyof ShareScope>).map((k) => (
              <label key={k} className="prj-check" style={{ border: '1px solid var(--color-border)', borderRadius: 999, padding: '3px 9px' }}><input type="checkbox" checked={scope[k]} onChange={(e) => setScope({ ...scope, [k]: e.target.checked })} /> {SHARE_SCOPE_LABELS[k]}</label>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
};

export default ClientSection;
