import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { ProjectContact, ProjectPeople, ProjectRole } from '../../../types/projects';
import { CONTACT_KIND_LABELS, PROJECT_ROLE_LABELS } from '../../../types/projects';
import { Chip, ErrorBox, Field, Modal, UserSelect, initials } from '../ui';
import { useRoom } from './RoomContext';

/** الأشخاص: فريق المكتب بأدواره، من ينفذ ومن يوافق في كل مرحلة، وجهات الاتصال (فريق العميل، خبراء، الطرف الآخر). */
const PeopleSection: React.FC = () => {
  const { project, canEdit, users, refresh } = useRoom();
  const [people, setPeople] = useState<ProjectPeople | null>(null);
  const [memberModal, setMemberModal] = useState(false);
  const [contactModal, setContactModal] = useState<{ contact: ProjectContact | null } | null>(null);

  const load = async () => { try { setPeople(await ProjectService.people(project.id)); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الجلب'); } };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id, project.updated_at]);

  const removeMember = async (userId: number) => {
    const rest = project.members.filter((m) => m.user_id !== userId).map((m) => ({ user_id: m.user_id, role: m.role }));
    try { await ProjectService.syncMembers(project.id, rest); await refresh(); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); }
  };

  const saveContact = async (data: Partial<ProjectContact> & { name: string }) => {
    try {
      if (contactModal?.contact) await ProjectService.updateContact(project.id, contactModal.contact.id, data);
      else await ProjectService.addContact(project.id, data);
      setContactModal(null); await refresh(); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحفظ'); }
  };

  const removeContact = async (c: ProjectContact) => {
    if (!window.confirm(`حذف «${c.name}»؟`)) return;
    try { await ProjectService.removeContact(project.id, c.id); setContactModal(null); await refresh(); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); }
  };

  return (
    <div className="prj-grid-2">
      <div>
        <div className="prj-block">
          <div className="prj-block__head">فريق المكتب <Chip tone="muted">{project.members.length}</Chip>
            {canEdit && <div className="prj-block__tools"><button type="button" className="ssp2-btn" style={{ padding: '3px 9px', fontSize: 11.5 }} onClick={() => setMemberModal(true)}><UserPlus size={12} /> عضو</button></div>}
          </div>
          <div className="prj-block__body prj-block__body--flush">
            {project.members.map((m) => (
              <div key={m.id} className="prj-person">
                <span className="prj-person__avatar">{initials(m.name)}</span>
                <div><div className="prj-person__name">{m.name}</div><div className="prj-person__role">{m.role_label}{people?.members.find((x) => x.user_id === m.user_id)?.open_tasks ? ` · ${people.members.find((x) => x.user_id === m.user_id)!.open_tasks} مهام مفتوحة` : ''}</div></div>
                {canEdit && <div className="prj-person__tools"><button type="button" className="ssp2-icon-btn" title="إزالة من الفريق" onClick={() => removeMember(m.user_id)}><Trash2 size={13} /></button></div>}
              </div>
            ))}
            {project.members.length === 0 && <div className="ssp2-empty">لا أعضاء بعد.</div>}
          </div>
        </div>

        <div className="prj-block">
          <div className="prj-block__head">جهات الاتصال <Chip tone="muted">{project.contacts.length}</Chip>
            {canEdit && <div className="prj-block__tools"><button type="button" className="ssp2-btn" style={{ padding: '3px 9px', fontSize: 11.5 }} onClick={() => setContactModal({ contact: null })}><Plus size={12} /> جهة</button></div>}
          </div>
          <div className="prj-block__body prj-block__body--flush">
            {project.contacts.map((c) => (
              <div key={c.id} className="prj-person">
                <span className="prj-person__avatar" style={{ color: 'var(--law-gold-dark, var(--law-gold))' }}>{initials(c.name)}</span>
                <div>
                  <div className="prj-person__name">{c.name} <Chip tone="muted">{CONTACT_KIND_LABELS[c.kind] ?? c.kind}</Chip></div>
                  <div className="prj-person__role">{[c.role_title, c.organization, c.phone, c.email].filter(Boolean).join(' · ')}</div>
                </div>
                {canEdit && <div className="prj-person__tools"><button type="button" className="ssp2-icon-btn" onClick={() => setContactModal({ contact: c })}><Pencil size={13} /></button></div>}
              </div>
            ))}
            {project.contacts.length === 0 && <div className="ssp2-empty">فريق العميل، الخبراء، محامي الطرف الآخر… يُسجلون هنا.</div>}
          </div>
        </div>
      </div>

      <div className="prj-block">
        <div className="prj-block__head">من ينفذ ومن يوافق في كل مرحلة</div>
        <div className="prj-table-wrap">
          <table className="prj-table">
            <thead><tr><th>المرحلة</th><th>المسؤول</th><th>ينفذ</th><th>يوافق</th><th>للعميل</th></tr></thead>
            <tbody>
              {people?.responsibilities.map((r) => (
                <tr key={r.phase_id}><td><b>{r.phase}</b></td><td>{r.owner ?? '—'}</td><td className="muted">{r.executes.join('، ') || '—'}</td><td>{r.approves ?? '—'}</td><td className="muted">{r.client_visible ? 'يظهر' : 'لا'}</td></tr>
              ))}
              {(!people || people.responsibilities.length === 0) && <tr><td colSpan={5} className="muted">لا مراحل بعد.</td></tr>}
            </tbody>
          </table>
        </div>
        {project.client && <div className="prj-block__body prj-muted">العميل: <b style={{ color: 'var(--color-text-primary)' }}>{project.client.name}</b></div>}
      </div>

      {memberModal && <MemberModal onClose={() => setMemberModal(false)} onSaved={async () => { setMemberModal(false); await refresh(); await load(); }} />}
      {contactModal && <ContactModal contact={contactModal.contact} onClose={() => setContactModal(null)} onSave={saveContact} onDelete={contactModal.contact ? () => removeContact(contactModal.contact!) : undefined} />}
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
    try {
      const members = project.members.filter((m) => m.user_id !== userId).map((m) => ({ user_id: m.user_id, role: m.role }));
      members.push({ user_id: userId, role });
      await ProjectService.syncMembers(project.id, members);
      await onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحفظ'); }
    finally { setBusy(false); }
  };
  return (
    <Modal title="إضافة عضو للفريق" onClose={onClose} foot={<><button type="button" className="ssp2-btn" onClick={onClose}>إلغاء</button><button type="button" className="ssp2-btn ssp2-btn--primary" onClick={submit} disabled={busy}>إضافة</button></>}>
      <div className="prj-form">
        <Field label="المستخدم"><UserSelect users={users.filter((u) => !project.members.some((m) => m.user_id === Number(u.id)))} value={userId} onChange={setUserId} placeholder="اختر…" /></Field>
        <Field label="الدور"><select className="ssp2-input" value={role} onChange={(e) => setRole(e.target.value as ProjectRole)}>{Object.entries(PROJECT_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      </div>
    </Modal>
  );
};

const ContactModal: React.FC<{ contact: ProjectContact | null; onClose: () => void; onSave: (d: Partial<ProjectContact> & { name: string }) => Promise<void>; onDelete?: () => void }> = ({ contact, onClose, onSave, onDelete }) => {
  const [f, setF] = useState({ name: contact?.name ?? '', organization: contact?.organization ?? '', kind: contact?.kind ?? 'client_team', role_title: contact?.role_title ?? '', phone: contact?.phone ?? '', email: contact?.email ?? '', notes: contact?.notes ?? '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => { if (!f.name.trim()) { setErr('الاسم مطلوب'); return; } setBusy(true); await onSave({ ...f, name: f.name.trim(), organization: f.organization || null, role_title: f.role_title || null, phone: f.phone || null, email: f.email || null, notes: f.notes || null }); setBusy(false); };
  return (
    <Modal title={contact ? 'تعديل جهة اتصال' : 'جهة اتصال جديدة'} onClose={onClose} foot={<>
      {onDelete && <button type="button" className="ssp2-btn" style={{ marginInlineEnd: 'auto', color: 'var(--status-red)' }} onClick={onDelete}><Trash2 size={12} /> حذف</button>}
      <button type="button" className="ssp2-btn" onClick={onClose}>إلغاء</button><button type="button" className="ssp2-btn ssp2-btn--primary" onClick={submit} disabled={busy}>حفظ</button>
    </>}>
      <ErrorBox error={err} />
      <div className="prj-form">
        <Field label="الاسم"><input className="ssp2-input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <Field label="النوع"><select className="ssp2-input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as ProjectContact['kind'] })}>{Object.entries(CONTACT_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="الجهة"><input className="ssp2-input" value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} /></Field>
        <Field label="الصفة"><input className="ssp2-input" value={f.role_title} onChange={(e) => setF({ ...f, role_title: e.target.value })} placeholder="مدير قانوني، خبير هندسي…" /></Field>
        <Field label="الجوال"><input className="ssp2-input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} dir="ltr" /></Field>
        <Field label="البريد"><input className="ssp2-input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} dir="ltr" /></Field>
        <Field label="ملاحظات" full><textarea className="ssp2-input" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
};

export default PeopleSection;
