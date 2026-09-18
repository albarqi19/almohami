import React, { useEffect, useState } from 'react';
import { ExternalLink, Eye, Pencil, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { ProjectContact, ProjectPeople, ProjectRole } from '../../../types/projects';
import { CONTACT_KIND_LABELS, PROJECT_ROLE_LABELS } from '../../../types/projects';
import { Av, ErrorBox, Field, Modal, UserSelect } from '../ui';
import { useRoom } from './RoomContext';

/** الأشخاص كما في التصوّر: فريق المكتب، فريق العميل، الأطراف الخارجية، ثم جدول المسؤوليات في كل مرحلة. */
const PeopleSection: React.FC = () => {
  const { project, canEdit, users, refresh, consumePending } = useRoom();
  const [people, setPeople] = useState<ProjectPeople | null>(null);
  const [memberModal, setMemberModal] = useState(false);
  const [contactModal, setContactModal] = useState<{ contact: ProjectContact | null; kind?: ProjectContact['kind'] } | null>(null);

  const load = async () => { try { setPeople(await ProjectService.people(project.id)); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الجلب'); } };
  useEffect(() => { load(); if (consumePending('person')) setMemberModal(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id, project.updated_at]);

  const removeMember = async (userId: number) => {
    if (!window.confirm('إزالة هذا العضو من فريق المشروع؟ مهامه تبقى له.')) return;
    const rest = project.members.filter((m) => m.user_id !== userId).map((m) => ({ user_id: m.user_id, role: m.role }));
    try { await ProjectService.syncMembers(project.id, rest); await refresh(); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); }
  };
  const saveContact = async (data: Partial<ProjectContact> & { name: string }) => {
    try { if (contactModal?.contact) await ProjectService.updateContact(project.id, contactModal.contact.id, data); else await ProjectService.addContact(project.id, data); setContactModal(null); await refresh(); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحفظ'); }
  };
  const removeContact = async (c: ProjectContact) => { if (!window.confirm(`حذف «${c.name}»؟`)) return; try { await ProjectService.removeContact(project.id, c.id); setContactModal(null); await refresh(); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); } };

  const clientTeam = project.contacts.filter((c) => c.kind === 'client_team');
  const externals = project.contacts.filter((c) => c.kind !== 'client_team');
  const openTasks = (uid: number) => people?.members.find((m) => m.user_id === uid)?.open_tasks ?? 0;
  const contactRow = (c: ProjectContact, kind: 'c' | 'x') => (
    <div key={c.id} className="prj-prow">
      <Av name={c.name} kind={kind} />
      <span>{c.name}</span>
      <span className="r">{[c.kind !== 'client_team' ? CONTACT_KIND_LABELS[c.kind] : null, c.role_title, c.organization].filter(Boolean).join(' · ') || '—'}</span>
      {canEdit && <button type="button" className="prj-ibtn" title="تعديل" onClick={() => setContactModal({ contact: c })}><Pencil size={11} /></button>}
    </div>
  );

  return (
    <div className="prj-view">
      <div className="prj-ppl">
        <div>
          <div className="prj-card__head"><Users size={14} /> فريق المكتب <span className="prj-cnt num">{project.members.length}</span><span className="prj-spacer" />{canEdit && <button type="button" className="prj-btn prj-btn--sm" onClick={() => setMemberModal(true)}><UserPlus size={11} /> عضو</button>}</div>
          {project.members.length === 0 && <div className="prj-empty">لا أعضاء بعد.</div>}
          {project.members.map((m) => (
            <div key={m.id} className="prj-prow">
              <Av name={m.name} /><span>{m.name}</span>
              <span className="r">{m.role_label}{m.role === 'partner' ? ' · يعتمد' : openTasks(m.user_id) ? ` · ${openTasks(m.user_id)} مهمة` : ''}</span>
              {canEdit && <button type="button" className="prj-ibtn" title="إزالة من الفريق" onClick={() => removeMember(m.user_id)}><Trash2 size={11} /></button>}
            </div>
          ))}
        </div>
        <div>
          <div className="prj-card__head"><Eye size={14} /> فريق العميل <span className="prj-cnt num">{clientTeam.length}</span><span className="prj-spacer" />{canEdit && <button type="button" className="prj-btn prj-btn--sm" onClick={() => setContactModal({ contact: null, kind: 'client_team' })}><UserPlus size={11} /> شخص</button>}</div>
          {project.client && <div className="prj-prow"><Av name={project.client.name} kind="c" /><span>{project.client.name}</span><span className="r">العميل · صاحب البوابة</span></div>}
          {clientTeam.length === 0 && !project.client && <div className="prj-empty">لا عميل مربوط بعد.</div>}
          {clientTeam.map((c) => contactRow(c, 'c'))}
          <div className="prj-sec__body prj-dim" style={{ fontSize: 11 }}>من جهات اتصال العميل. لا يرون إلا ما عُلّم «ظاهر للعميل».</div>
        </div>
        <div>
          <div className="prj-card__head"><ExternalLink size={14} /> أطراف خارجية <span className="prj-cnt num">{externals.length}</span><span className="prj-spacer" />{canEdit && <button type="button" className="prj-btn prj-btn--sm" onClick={() => setContactModal({ contact: null, kind: 'external' })}><UserPlus size={11} /> طرف</button>}</div>
          {externals.length === 0 && <div className="prj-empty">خبراء، مترجمون، محامي الطرف الآخر… يُسجلون هنا.</div>}
          {externals.map((c) => contactRow(c, 'x'))}
        </div>
        <div className="wide">
          <div className="prj-card__head"><ShieldCheck size={14} /> المسؤوليات في كل مرحلة</div>
          <table className="prj-grid">
            <thead><tr><th>المرحلة</th><th>ينفذ</th><th>يعتمد</th><th>يُستشار</th><th>يُبلّغ</th></tr></thead>
            <tbody>
              {(!people || people.responsibilities.length === 0) && <tr><td colSpan={5} className="prj-dim">لا مراحل بعد.</td></tr>}
              {people?.responsibilities.map((r) => (
                <tr key={r.phase_id}>
                  <td className="t" style={{ cursor: 'default' }}>{r.phase}</td>
                  <td className="wrap">{r.executes.join('، ') || r.owner || '—'}</td>
                  <td>{r.approves ?? r.owner ?? '—'}</td>
                  <td className="wrap prj-dim">{externals.filter((c) => c.kind === 'expert').map((c) => c.name).join('، ') || '—'}</td>
                  <td className="wrap prj-dim">{r.client_visible ? (clientTeam.length ? clientTeam.map((c) => c.name).join('، ') : project.client?.name ?? 'العميل') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {memberModal && <MemberModal onClose={() => setMemberModal(false)} onSaved={async () => { setMemberModal(false); await refresh(); await load(); }} />}
      {contactModal && <ContactModal contact={contactModal.contact} defaultKind={contactModal.kind} onClose={() => setContactModal(null)} onSave={saveContact} onDelete={contactModal.contact ? () => removeContact(contactModal.contact!) : undefined} />}
      <span hidden>{users.length}</span>
    </div>
  );
};

const MemberModal: React.FC<{ onClose: () => void; onSaved: () => Promise<void> }> = ({ onClose, onSaved }) => {
  const { project, users } = useRoom();
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<ProjectRole>('lawyer');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!userId) { toast.error('اختر المستخدم'); return; }
    setBusy(true);
    try { const members = project.members.filter((m) => m.user_id !== userId).map((m) => ({ user_id: m.user_id, role: m.role })); members.push({ user_id: userId, role }); await ProjectService.syncMembers(project.id, members); await onSaved(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحفظ'); }
    finally { setBusy(false); }
  };
  return (
    <Modal title="إضافة عضو للفريق" onClose={onClose} foot={<><button type="button" className="prj-btn" onClick={onClose}>إلغاء</button><button type="button" className="prj-btn prj-btn--primary" onClick={submit} disabled={busy}>إضافة</button></>}>
      <div className="prj-form">
        <Field label="المستخدم"><UserSelect users={users.filter((u) => !project.members.some((m) => m.user_id === Number(u.id)))} value={userId} onChange={setUserId} placeholder="اختر…" /></Field>
        <Field label="الدور"><select className="prj-in" value={role} onChange={(e) => setRole(e.target.value as ProjectRole)}>{Object.entries(PROJECT_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      </div>
    </Modal>
  );
};

const ContactModal: React.FC<{ contact: ProjectContact | null; defaultKind?: ProjectContact['kind']; onClose: () => void; onSave: (d: Partial<ProjectContact> & { name: string }) => Promise<void>; onDelete?: () => void }> = ({ contact, defaultKind, onClose, onSave, onDelete }) => {
  const [f, setF] = useState({ name: contact?.name ?? '', organization: contact?.organization ?? '', kind: contact?.kind ?? defaultKind ?? 'client_team', role_title: contact?.role_title ?? '', phone: contact?.phone ?? '', email: contact?.email ?? '', notes: contact?.notes ?? '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => { if (!f.name.trim()) { setErr('الاسم مطلوب'); return; } setBusy(true); await onSave({ ...f, name: f.name.trim(), organization: f.organization || null, role_title: f.role_title || null, phone: f.phone || null, email: f.email || null, notes: f.notes || null }); setBusy(false); };
  return (
    <Modal title={contact ? 'تعديل جهة اتصال' : 'جهة اتصال جديدة'} onClose={onClose} foot={<>
      {onDelete && <button type="button" className="prj-btn prj-btn--danger" style={{ marginInlineEnd: 'auto' }} onClick={onDelete}><Trash2 size={12} /> حذف</button>}
      <button type="button" className="prj-btn" onClick={onClose}>إلغاء</button><button type="button" className="prj-btn prj-btn--primary" onClick={submit} disabled={busy}>حفظ</button>
    </>}>
      <ErrorBox error={err} />
      <div className="prj-form">
        <Field label="الاسم"><input className="prj-in" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <Field label="النوع"><select className="prj-in" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as ProjectContact['kind'] })}>{Object.entries(CONTACT_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="الجهة"><input className="prj-in" value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} /></Field>
        <Field label="الصفة"><input className="prj-in" value={f.role_title} onChange={(e) => setF({ ...f, role_title: e.target.value })} placeholder="المدير المالي، خبير هندسي…" /></Field>
        <Field label="الجوال"><input className="prj-in" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} dir="ltr" /></Field>
        <Field label="البريد"><input className="prj-in" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} dir="ltr" /></Field>
        <Field label="ملاحظات" full><textarea className="prj-in" rows={2} style={{ minHeight: 56 }} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
};

export default PeopleSection;
