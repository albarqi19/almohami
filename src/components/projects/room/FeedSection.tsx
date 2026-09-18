import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Calendar, CheckSquare, FileText, Flag, Gavel, Layers, MessageSquare, Package, Scale, ShieldCheck, Users, Zap } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { ProjectService } from '../../../services/projectService';
import type { FeedItem } from '../../../types/projects';
import { FEED_TYPE_LABELS } from '../../../types/projects';
import { fmtDayMonth, fmtTime } from '../ui';
import { useRoom } from './RoomContext';

const ICON: Record<string, { el: React.ReactNode; cls: string }> = {
  task: { el: <CheckSquare size={12} />, cls: 'task' }, session: { el: <Gavel size={12} />, cls: 'sess' }, meeting: { el: <Users size={12} />, cls: 'meet' },
  document: { el: <FileText size={12} />, cls: 'doc' }, decision: { el: <Scale size={12} />, cls: 'dec' }, phase: { el: <Layers size={12} />, cls: 'phase' },
  risk: { el: <Zap size={12} />, cls: 'risk' }, issue: { el: <Flag size={12} />, cls: 'risk' }, approval: { el: <ShieldCheck size={12} />, cls: 'appr' },
  client: { el: <Users size={12} />, cls: 'client' }, raed: { el: <Bot size={12} />, cls: 'raed' }, milestone: { el: <Flag size={12} />, cls: 'dec' },
  system: { el: <Layers size={12} />, cls: 'doc' }, comment: { el: <MessageSquare size={12} />, cls: 'meet' }, deliverable: { el: <Package size={12} />, cls: 'task' },
  member: { el: <Users size={12} />, cls: 'doc' }, link: { el: <Layers size={12} />, cls: 'doc' }, report: { el: <FileText size={12} />, cls: 'client' },
};

/** الخط الزمني الموحد كما في التصوّر: رقاقات نوع، أيام، صف لكل حدث (وقت، أيقونة ملونة، عنوان وتفصيل، من). */
const FeedSection: React.FC = () => {
  const { project, openTask } = useRoom();
  const navigate = useNavigate();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [active, setActive] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ProjectService.feed(project.id, active, 150, 60)
      .then((r) => { if (!cancelled) { setItems(r.items); setTypes(r.types); } })
      .catch((e: Error) => { if (!cancelled) toast.error(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [project.id, project.updated_at, active]);

  const groups = useMemo(() => {
    const map = new Map<string, FeedItem[]>();
    items.forEach((i) => { const day = (i.at || '').slice(0, 10); if (!map.has(day)) map.set(day, []); map.get(day)!.push(i); });
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [items]);
  const today = new Date().toISOString().slice(0, 10);
  const open = (i: FeedItem) => { if (i.subject_type === 'task' && i.subject_id) return openTask(i.subject_id); if (i.url && !i.url.startsWith('/tasks/projects/')) navigate(i.url); };
  const clickable = (i: FeedItem) => (i.subject_type === 'task' && i.subject_id) || (i.url && !i.url.startsWith('/tasks/projects/'));

  return (
    <div className="prj-view">
      <div className="prj-feed">
        <div className="prj-fchips">
          <button type="button" className={`prj-fchip ${active.length === 0 ? 'is-on' : ''}`} onClick={() => setActive([])}>الكل</button>
          {types.map((t) => <button type="button" key={t} className={`prj-fchip ${active.includes(t) ? 'is-on' : ''}`} onClick={() => setActive(active.includes(t) ? active.filter((x) => x !== t) : [...active, t])}>{FEED_TYPE_LABELS[t as keyof typeof FEED_TYPE_LABELS] ?? t}</button>)}
        </div>
        {loading && items.length === 0 ? <div className="prj-empty">جارٍ التحميل…</div> : groups.length === 0 ? <div className="prj-empty">لا أحداث.</div> : groups.map(([day, list]) => (
          <React.Fragment key={day}>
            {day === today ? <div className="prj-ftoday">اليوم · {fmtDayMonth(day)}</div> : <div className="prj-fday">{fmtDayMonth(day)}{day > today ? ' · قادم' : ''}</div>}
            {list.map((i) => {
              const ic = ICON[i.type] ?? { el: <Calendar size={12} />, cls: 'doc' };
              return (
                <div key={i.key} className={`prj-fev ${i.is_future ? 'prj-fev--future' : ''}`}>
                  <span className="tm num">{i.is_future ? '—' : fmtTime(i.at)}</span>
                  <span className={`ico prj-ico--${ic.cls}`} title={FEED_TYPE_LABELS[i.type as keyof typeof FEED_TYPE_LABELS] ?? i.type}>{ic.el}</span>
                  <span className="t">{clickable(i) ? <button type="button" onClick={() => open(i)}>{i.title}</button> : i.title}{i.body && <small>{i.body}</small>}</span>
                  <span className="by">{i.actor_name ?? (i.type === 'raed' ? 'رائد' : '')}</span>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default FeedSection;
