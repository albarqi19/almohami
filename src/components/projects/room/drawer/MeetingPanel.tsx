import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Check, FileInput, FileText, ListChecks, Loader2, MapPin, ShieldCheck, Users, Video } from 'lucide-react';
import { internalMeetingService } from '../../../../services/meetingService';
import type { InternalMeeting } from '../../../../services/meetingService';
import type { ProjectLink } from '../../../../types/projects';
import { Av, Chip, fmtDateTime } from '../../ui';
import { ImportMinutesModal } from '../EventsSection';
import { useRoom } from '../RoomContext';

const STATUS_AR: Record<string, { label: string; tone: string }> = {
  scheduled: { label: 'مجدول', tone: 'todo' }, in_progress: { label: 'جارٍ الآن', tone: 'doing' }, completed: { label: 'انعقد', tone: 'done' }, cancelled: { label: 'ملغى', tone: 'late' },
};

/**
 * لوحة الاجتماع داخل الغرفة: الموعد والحضور وجدول الأعمال، ثم المحضر والقرارات والمهام المستخرجة،
 * وزر يحوّلها إلى قرارات ومهام في المشروع. إنشاء الاجتماعات وجدولتها من صفحة الاجتماعات.
 */
const MeetingPanel: React.FC<{ meetingId: number; onTitle: (title: string) => void }> = ({ meetingId, onTitle }) => {
  const { canEdit, refresh } = useRoom();
  const [m, setM] = useState<InternalMeeting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const onTitleRef = useRef(onTitle);
  onTitleRef.current = onTitle;

  const load = async () => {
    try { const d = await internalMeetingService.getById(meetingId); setM(d); setError(null); onTitleRef.current(d.title); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر فتح الاجتماع'); }
  };
  useEffect(() => { setM(null); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [meetingId]);

  if (error) return <div className="prj-panel"><div className="prj-panel__body"><div className="prj-error" style={{ margin: 14 }}>{error}</div></div></div>;
  if (!m) return <div className="prj-panel"><div className="prj-panel__body"><div className="prj-empty"><Loader2 size={14} className="ssp2-spin" /> جارٍ فتح الاجتماع…</div></div></div>;

  const st = STATUS_AR[m.status] ?? { label: m.status, tone: 'todo' };
  const people = (m.attendees ?? []).map((a) => a.display_name || a.user?.name || a.email || '—');
  const hasMinutes = !!(m.summary || (m.summary_decisions && m.summary_decisions.length) || (m.summary_tasks && m.summary_tasks.length));
  const asLink: ProjectLink = { id: 0, type: 'meeting', type_label: 'اجتماع', link_id: m.id, label: m.title, exists: true, url: null, note: null, extra: null };

  return (
    <div className="prj-panel">
      <div className="prj-panel__head">
        <div className="prj-panel__title">
          <span className="prj-badge">اجتماع</span>
          <h2>{m.title}</h2>
          <Chip tone={st.tone}>{st.label}</Chip>
          {m.category && <Chip tone="est">{m.category.name}</Chip>}
        </div>
        <div className="prj-panel__sub">
          <span className="num"><Calendar size={11} /> {fmtDateTime(m.scheduled_at)} · {m.duration_minutes} دقيقة</span>
          {m.location && <span><MapPin size={11} /> {m.location}</span>}
          {m.video_meeting_url && <a className="prj-link" href={m.video_meeting_url} target="_blank" rel="noopener noreferrer"><Video size={11} /> رابط الاجتماع</a>}
          {people.length > 0 && <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}><Users size={11} /> {people.map((n, i) => <Av key={i} name={n} title={n} />)}</span>}
        </div>
      </div>
      <div className="prj-panel__acts">
        {canEdit && hasMinutes && <button type="button" className="prj-btn prj-btn--sm prj-btn--primary" onClick={() => setImportOpen(true)}><FileInput size={12} /> حوّل المحضر إلى قرارات ومهام في المشروع</button>}
        {!hasMinutes && <span className="prj-dim" style={{ fontSize: 11 }}>{m.status === 'completed' ? 'لا محضر مكتوب بعد. يُكتب من صفحة الاجتماعات.' : 'المحضر يُكتب بعد الانعقاد من صفحة الاجتماعات.'}</span>}
      </div>
      <div className="prj-panel__body">
        {m.agenda && <section className="prj-sec"><div className="prj-sec__head"><FileText size={13} /> جدول الأعمال</div><div className="prj-sec__body"><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.agenda}</p></div></section>}
        {m.summary && <section className="prj-sec"><div className="prj-sec__head"><FileText size={13} /> المحضر</div><div className="prj-sec__body"><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.summary}</p>{m.summary_points && m.summary_points.length > 0 && <ul style={{ margin: '6px 0 0', paddingInlineStart: 18 }}>{m.summary_points.map((p, i) => <li key={i}>{p}</li>)}</ul>}</div></section>}
        {m.summary_decisions && m.summary_decisions.length > 0 && (
          <section className="prj-sec"><div className="prj-sec__head"><ShieldCheck size={13} /> القرارات <span className="prj-cnt num">{m.summary_decisions.length}</span></div>
            {m.summary_decisions.map((d, i) => <div key={i} className="prj-row" style={{ padding: '5px 14px' }}><Check size={12} style={{ color: 'var(--pj-ok)', flex: 'none' }} /><span className="prj-grow" style={{ whiteSpace: 'normal' }}>{d}</span></div>)}
          </section>
        )}
        {m.summary_tasks && m.summary_tasks.length > 0 && (
          <section className="prj-sec"><div className="prj-sec__head"><ListChecks size={13} /> المهام المستخرجة <span className="prj-cnt num">{m.summary_tasks.length}</span></div>
            {m.summary_tasks.map((t, i) => <div key={i} className="prj-row" style={{ padding: '5px 14px' }}><span className="prj-chk" /><span className="prj-grow" style={{ whiteSpace: 'normal' }}>{t.title}<small style={{ display: 'block', color: 'var(--pj-ink-3)', fontSize: 10.5 }}>{[t.assignee_name, t.due_date].filter(Boolean).join(' · ')}</small></span></div>)}
          </section>
        )}
        <section className="prj-sec" style={{ borderBottom: 0 }}>
          <div className="prj-sec__head"><Users size={13} /> الحضور <span className="prj-cnt num">{(m.attendees ?? []).length}</span></div>
          {(m.attendees ?? []).length === 0 && <div className="prj-empty">لا حضور مسجل.</div>}
          {(m.attendees ?? []).map((a) => (
            <div key={a.id} className="prj-row" style={{ padding: '5px 14px' }}>
              <Av name={a.display_name || a.user?.name || a.email || '—'} kind={a.user_id ? undefined : 'x'} />
              <span className="prj-grow">{a.display_name || a.user?.name || a.email || '—'}</span>
              <Chip tone={a.status === 'accepted' ? 'done' : a.status === 'declined' ? 'late' : 'todo'}>{a.status === 'accepted' ? 'أكد' : a.status === 'declined' ? 'اعتذر' : 'لم يرد'}</Chip>
            </div>
          ))}
        </section>
      </div>
      <div className="prj-panel__foot"><span>الاجتماع من صفحة الاجتماعات الداخلية. المحضر والقرارات والمهام تُقرأ وتُحوَّل من هنا.</span></div>
      {importOpen && <ImportMinutesModal link={asLink} onClose={() => setImportOpen(false)} onDone={async () => { setImportOpen(false); await refresh(); }} />}
    </div>
  );
};

export default MeetingPanel;
