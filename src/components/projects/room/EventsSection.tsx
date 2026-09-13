import React, { useEffect, useState } from 'react';
import { ExternalLink, FileInput, Link2, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { ProjectService } from '../../../services/projectService';
import type { Linkable, ProjectEvent, ProjectLink, ProjectLinkType } from '../../../types/projects';
import { Chip, ErrorBox, Field, LinkablePicker, Modal, UserSelect, daysFromToday, fmtDate } from '../ui';
import { useRoom } from './RoomContext';

/** الارتباطات وأحداثها: قضايا وجلساتها وأحكامها، طلبات تنفيذ، خدمات ومراحلها، اجتماعات ومحاضرها، عقود. */
const EventsSection: React.FC = () => {
  const { project, canEdit, refresh } = useRoom();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [importFor, setImportFor] = useState<ProjectLink | null>(null);

  const load = async () => {
    setLoading(true);
    try { setEvents(await ProjectService.events(project.id)); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الجلب'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id, project.updated_at]);

  const add = async (type: ProjectLinkType, item: Linkable) => {
    try { await ProjectService.addLink(project.id, type, item.id); toast.success('رُبط بالمشروع'); await refresh(); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الربط'); }
  };

  const remove = async (l: ProjectLink) => {
    if (!window.confirm(`فك ربط «${l.label}»؟ تبقى مواعيده المسجلة في الخط الزمني.`)) return;
    try { await ProjectService.removeLink(project.id, l.id); await refresh(); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر فك الربط'); }
  };

  const future = events.filter((e) => e.is_future);
  const past = events.filter((e) => !e.is_future);

  return (
    <div className="prj-grid-2">
      <div className="prj-block">
        <div className="prj-block__head"><Link2 size={14} /> المرتبط بالمشروع <Chip tone="muted">{project.links.length}</Chip></div>
        <div className="prj-block__body">
          {canEdit && <div style={{ marginBottom: 10 }}><LinkablePicker onPick={add} exclude={project.links.map((l) => ({ type: l.type, id: l.link_id }))} /></div>}
          {project.links.length === 0 && <div className="ssp2-empty">لا ارتباطات. اربط القضية أو الخدمة أو الاجتماع ليدخل ما فيها هنا.</div>}
          {project.links.map((l) => (
            <div key={l.id} className="prj-person">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="prj-person__name"><Chip tone="muted">{l.type_label}</Chip> {l.label}</div>
                <div className="prj-person__role">{l.extra && typeof l.extra.status === 'string' ? String(l.extra.status) : ''}{l.note ? ` · ${l.note}` : ''}{!l.exists ? ' · لم يعد موجوداً' : ''}</div>
              </div>
              <div className="prj-person__tools">
                {l.type === 'meeting' && canEdit && <button type="button" className="ssp2-btn" style={{ padding: '3px 8px', fontSize: 11 }} title="تحويل بنود المحضر إلى مهام وقرارات" onClick={() => setImportFor(l)}><FileInput size={12} /> المحضر</button>}
                {l.url && l.exists && <button type="button" className="ssp2-icon-btn" title="فتح" onClick={() => navigate(l.url!)}><ExternalLink size={13} /></button>}
                {canEdit && <button type="button" className="ssp2-icon-btn" title="فك الربط" onClick={() => remove(l)}><Trash2 size={13} /></button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="prj-block">
        <div className="prj-block__head">الجلسات والأحكام والمراحل المرتبطة</div>
        <div className="prj-block__body prj-block__body--flush">
          {loading ? <div className="prj-muted" style={{ padding: 12 }}>جارٍ التحميل…</div> : events.length === 0 ? <div className="ssp2-empty">لا أحداث من الارتباطات بعد. جلسات القضايا تظهر هنا وفي الخط الزمني تلقائياً.</div> : (
            <div className="prj-ms-list">
              {future.length > 0 && <div className="prj-feed__day">القادمة</div>}
              {future.map((e) => { const d = daysFromToday(e.date); return (
                <div key={`${e.kind}-${e.id}`} className="prj-ms"><span className="prj-ms__date">{fmtDate(e.date)}{d ? <><br />{d.label}</> : null}</span><span className="prj-ms__name">{e.title}</span><Chip tone={e.kind === 'judgement' ? 'purple' : 'navy'}>{e.status ?? e.kind}</Chip></div>
              ); })}
              {past.length > 0 && <div className="prj-feed__day">السابقة</div>}
              {past.slice(0, 30).map((e) => (
                <div key={`${e.kind}-${e.id}`} className="prj-ms prj-ms--done"><span className="prj-ms__date">{fmtDate(e.date)}</span><span className="prj-ms__name">{e.title}</span><Chip tone="muted">{e.status ?? e.kind}</Chip></div>
              ))}
            </div>
          )}
        </div>
      </div>

      {importFor && <ImportMinutesModal link={importFor} onClose={() => setImportFor(null)} onDone={async () => { setImportFor(null); await refresh(); await load(); }} />}
    </div>
  );
};

const ImportMinutesModal: React.FC<{ link: ProjectLink; onClose: () => void; onDone: () => Promise<void> }> = ({ link, onClose, onDone }) => {
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
    <Modal title={`محضر «${link.label}» إلى مهام وقرارات`} onClose={onClose} wide foot={<><button type="button" className="ssp2-btn" onClick={onClose}>إلغاء</button><button type="button" className="ssp2-btn ssp2-btn--primary" onClick={submit} disabled={busy}>تحويل</button></>}>
      <ErrorBox error={err} />
      <div className="prj-block"><div className="prj-block__head">بنود العمل → مهام في المرحلة الجارية</div>
        <div className="prj-block__body">
          {items.map((it, i) => (
            <div key={i} className="prj-form prj-form--3" style={{ marginBottom: 6 }}>
              <Field label="البند"><input className="ssp2-input" value={it.title} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} /></Field>
              <Field label="المكلف"><UserSelect users={users} value={it.assigned_to} onChange={(id) => setItems(items.map((x, j) => (j === i ? { ...x, assigned_to: id } : x)))} placeholder="مدير المشروع" /></Field>
              <Field label="الموعد"><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="date" className="ssp2-input" value={it.due_date} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, due_date: e.target.value } : x)))} /><label className="prj-check" title="مطلوب من العميل"><input type="checkbox" checked={it.client_action} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, client_action: e.target.checked } : x)))} /> عميل</label></div></Field>
            </div>
          ))}
          <button type="button" className="prj-link" onClick={() => setItems([...items, { title: '', assigned_to: null, due_date: '', client_action: false }])}>+ بند</button>
        </div>
      </div>
      <div className="prj-block"><div className="prj-block__head">القرارات → سجل القرارات</div>
        <div className="prj-block__body">
          {decisions.map((d, i) => (
            <div key={i} className="prj-form" style={{ marginBottom: 6 }}>
              <Field label="القرار"><input className="ssp2-input" value={d.title} onChange={(e) => setDecisions(decisions.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} /></Field>
              <Field label="السبب"><input className="ssp2-input" value={d.reason} onChange={(e) => setDecisions(decisions.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)))} /></Field>
            </div>
          ))}
          <button type="button" className="prj-link" onClick={() => setDecisions([...decisions, { title: '', reason: '' }])}>+ قرار</button>
        </div>
      </div>
    </Modal>
  );
};

export default EventsSection;
