import React, { useMemo, useState } from 'react';
import { ExternalLink, FileInput, Link2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { ProjectService } from '../../../services/projectService';
import type { Linkable, ProjectEvent, ProjectLink, ProjectLinkType } from '../../../types/projects';
import { Chip, ErrorBox, Field, LinkablePicker, Modal, UserSelect, daysFromToday, fmtDayMonth } from '../ui';
import { useRoom } from './RoomContext';

type Filter = 'all' | 'session' | 'internal' | 'client';
const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** الاجتماعات والجلسات كما في التصوّر: فلاتر، ثم القادم فالماضي، لكل حدث تاريخه وعنوانه ورقاقته وتفاصيله وأزراره. */
const EventsSection: React.FC = () => {
  const { project, events, canEdit, refresh, consumePending, openIn } = useRoom();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [linkModal, setLinkModal] = useState(() => consumePending('link') || consumePending('meeting'));
  const [importFor, setImportFor] = useState<ProjectLink | null>(null);

  const rows = useMemo(() => events.filter((e) => {
    if (filter === 'session') return e.kind === 'session' || e.kind === 'judgement';
    if (filter === 'internal') return e.kind === 'meeting';
    if (filter === 'client') return e.kind === 'stage';
    return true;
  }), [events, filter]);
  const future = rows.filter((e) => e.is_future);
  const past = rows.filter((e) => !e.is_future).slice(0, 40);

  const cycleTasksNote = (e: ProjectEvent) => (e.kind === 'session' && e.is_future ? 'دورة الجلسة: تحضير، مذكرة، حضور، تقرير للعميل' : null);
  const weekday = (d: string | null) => { if (!d) return ''; const x = new Date(d); return Number.isNaN(x.getTime()) ? '' : WEEKDAYS[x.getDay()]; };
  const removeLink = async (l: ProjectLink) => { if (!window.confirm(`فك ربط «${l.label}»؟ تبقى مواعيده المسجلة في الخط الزمني.`)) return; try { await ProjectService.removeLink(project.id, l.id); await refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر فك الربط'); } };

  const renderEvent = (e: ProjectEvent, i: number) => {
    const d = daysFromToday(e.date);
    const link = e.link;
    const isSession = e.kind === 'session';
    return (
      <div key={`${e.kind}-${e.id}-${i}`} className={`prj-ev ${e.is_future ? '' : 'is-past'}`}>
        <div className="d num">{fmtDayMonth(e.date)}<small>{weekday(e.date)}{d ? ` · ${d.label}` : ''}</small></div>
        <div className="t">
          <b>{e.title}</b>{' '}
          {isSession && <Chip tone={e.is_future ? 'bad' : 'done'}>{e.is_future ? 'من ناجز' : 'تمت'}</Chip>}
          {e.kind === 'judgement' && <Chip tone="gate">حكم</Chip>}
          {e.kind === 'meeting' && <Chip tone="todo">اجتماع</Chip>}
          {e.kind === 'stage' && <Chip tone="client">مرحلة خدمة</Chip>}
          {e.status && !isSession && <span className="prj-dim"> · {e.status}</span>}
          <small>{link.type_label}: {link.label}{cycleTasksNote(e) ? ` · ${cycleTasksNote(e)}` : ''}</small>
        </div>
        <div className="acts">
          {isSession && link.exists && <button type="button" className="prj-btn prj-btn--sm" onClick={() => openIn({ type: 'session', id: e.id })}>الجلسة</button>}
          {e.kind === 'meeting' && link.exists && <button type="button" className="prj-btn prj-btn--sm" onClick={() => openIn({ type: 'meeting', id: e.id })}>الاجتماع</button>}
          {link.type === 'case' && link.exists && <button type="button" className="prj-btn prj-btn--sm" onClick={() => openIn({ type: 'case', id: link.link_id })}>القضية</button>}
          {link.type === 'legal_service' && link.exists && <button type="button" className="prj-btn prj-btn--sm" onClick={() => openIn({ type: 'service', id: link.link_id })}>الخدمة</button>}
          {link.type === 'execution_request' && link.exists && <button type="button" className="prj-btn prj-btn--sm" onClick={() => openIn({ type: 'exec', id: link.link_id })}>طلب التنفيذ</button>}
          {!['case', 'legal_service', 'execution_request', 'meeting'].includes(link.type) && link.url && link.exists && <button type="button" className="prj-btn prj-btn--sm" onClick={() => navigate(link.url!)}><ExternalLink size={11} /> فتح</button>}
          {e.kind === 'meeting' && canEdit && <button type="button" className="prj-btn prj-btn--sm" onClick={() => setImportFor(link)}><FileInput size={11} /> المحضر</button>}
        </div>
      </div>
    );
  };

  return (
    <div className="prj-view">
      <div className="prj-subtools">
        {([['all', 'الكل'], ['session', 'الجلسات (من القضايا المرتبطة)'], ['internal', 'الاجتماعات'], ['client', 'مراحل الخدمات']] as Array<[Filter, string]>).map(([k, l]) => <button type="button" key={k} className={`prj-fchip ${filter === k ? 'is-on' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}
        <span className="prj-spacer" />
        {canEdit && <button type="button" className="prj-btn prj-btn--sm" onClick={() => setLinkModal(true)}><Link2 size={11} /> ربط</button>}
        {canEdit && <button type="button" className="prj-btn prj-btn--sm" onClick={() => navigate('/meetings/internal')}><Plus size={11} /> اجتماع</button>}
      </div>
      <div className="prj-list--pad">
        {rows.length === 0 && <div className="prj-empty">لا أحداث من الارتباطات بعد. اربط القضية أو الخدمة أو الاجتماع لتظهر جلساتها ومراحلها هنا وفي الخط الزمني تلقائياً.</div>}
        {future.length > 0 && <div className="prj-fday">القادم</div>}
        {future.map(renderEvent)}
        {past.length > 0 && <div className="prj-fday">ما مضى</div>}
        {past.map(renderEvent)}
      </div>
      {linkModal && <LinksModal onClose={() => setLinkModal(false)} onRemove={removeLink} />}
      {importFor && <ImportMinutesModal link={importFor} onClose={() => setImportFor(null)} onDone={async () => { setImportFor(null); await refresh(); }} />}
    </div>
  );
};

/** نافذة الربط: ما يرتبط بالمشروع الآن + بحث لإضافة قضية أو طلب تنفيذ أو خدمة أو اجتماع أو عقد */
export const LinksModal: React.FC<{ onClose: () => void; onRemove: (l: ProjectLink) => Promise<void> }> = ({ onClose, onRemove }) => {
  const { project, canEdit, refresh } = useRoom();
  const add = async (type: ProjectLinkType, item: Linkable) => { try { await ProjectService.addLink(project.id, type, item.id); toast.success('رُبط بالمشروع'); await refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الربط'); } };
  return (
    <Modal title="ما يرتبط بالمشروع" onClose={onClose} foot={<button type="button" className="prj-btn" onClick={onClose}>إغلاق</button>}>
      {canEdit && <LinkablePicker onPick={add} exclude={project.links.map((l) => ({ type: l.type, id: l.link_id }))} />}
      <div>
        {project.links.length === 0 && <div className="prj-empty">لا ارتباطات بعد.</div>}
        {project.links.map((l) => (
          <div key={l.id} className="prj-prow" style={{ paddingInline: 0 }}>
            <Chip tone="todo">{l.type_label}</Chip>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.label}</span>
            <span className="r">{l.extra && typeof l.extra.status === 'string' ? String(l.extra.status) : ''}{!l.exists ? ' · لم يعد موجوداً' : ''}</span>
            {canEdit && <button type="button" className="prj-ibtn" title="فك الربط" onClick={() => onRemove(l)}><Trash2 size={11} /></button>}
          </div>
        ))}
      </div>
      <p className="prj-dim" style={{ margin: 0, fontSize: 11 }}>جلسات القضايا وأحكامها ومراحل الخدمات والاجتماعات المربوطة تدخل الخط الزمني تلقائياً، ومستنداتها تظهر في مستندات المشروع.</p>
    </Modal>
  );
};

export const ImportMinutesModal: React.FC<{ link: ProjectLink; onClose: () => void; onDone: () => Promise<void> }> = ({ link, onClose, onDone }) => {
  const { project, users } = useRoom();
  const [items, setItems] = useState<Array<{ title: string; assigned_to: number | null; due_date: string; client_action: boolean }>>([{ title: '', assigned_to: null, due_date: '', client_action: false }]);
  const [decisions, setDecisions] = useState<Array<{ title: string; reason: string }>>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const cleanItems = items.filter((i) => i.title.trim()).map((i) => ({ title: i.title.trim(), assigned_to: i.assigned_to, due_date: i.due_date || undefined, client_action: i.client_action }));
    const cleanDecisions = decisions.filter((d) => d.title.trim()).map((d) => ({ title: d.title.trim(), reason: d.reason.trim() || undefined }));
    if (cleanItems.length === 0 && cleanDecisions.length === 0) { setErr('أضف بنداً واحداً على الأقل'); return; }
    setBusy(true);
    try { const r = await ProjectService.importMinutes(project.id, link.link_id, cleanItems, cleanDecisions); toast.success(`أُنشئت ${r.tasks.length} مهام و${r.decisions.length} قرارات`); await onDone(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'تعذر التحويل'); }
    finally { setBusy(false); }
  };
  return (
    <Modal title={`محضر «${link.label}» إلى مهام وقرارات`} onClose={onClose} wide foot={<><button type="button" className="prj-btn" onClick={onClose}>إلغاء</button><button type="button" className="prj-btn prj-btn--primary" onClick={submit} disabled={busy}>تحويل</button></>}>
      <ErrorBox error={err} />
      <div className="prj-card__head" style={{ marginInline: -14 }}>بنود العمل → مهام في المرحلة الجارية</div>
      {items.map((it, i) => (
        <div key={i} className="prj-form prj-form--3">
          <Field label="البند"><input className="prj-in" value={it.title} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} /></Field>
          <Field label="المكلف"><UserSelect users={users} value={it.assigned_to} onChange={(id) => setItems(items.map((x, j) => (j === i ? { ...x, assigned_to: id } : x)))} placeholder="مدير المشروع" /></Field>
          <Field label="الموعد"><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="date" className="prj-in" value={it.due_date} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, due_date: e.target.value } : x)))} /><label className="prj-check" title="مطلوب من العميل"><input type="checkbox" checked={it.client_action} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, client_action: e.target.checked } : x)))} /> عميل</label></div></Field>
        </div>
      ))}
      <button type="button" className="prj-link" style={{ alignSelf: 'flex-start' }} onClick={() => setItems([...items, { title: '', assigned_to: null, due_date: '', client_action: false }])}>+ بند</button>
      <div className="prj-card__head" style={{ marginInline: -14 }}>القرارات → سجل القرارات</div>
      {decisions.map((d, i) => (
        <div key={i} className="prj-form">
          <Field label="القرار"><input className="prj-in" value={d.title} onChange={(e) => setDecisions(decisions.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} /></Field>
          <Field label="السبب"><input className="prj-in" value={d.reason} onChange={(e) => setDecisions(decisions.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)))} /></Field>
        </div>
      ))}
      <button type="button" className="prj-link" style={{ alignSelf: 'flex-start' }} onClick={() => setDecisions([...decisions, { title: '', reason: '' }])}>+ قرار</button>
    </Modal>
  );
};

export default EventsSection;
