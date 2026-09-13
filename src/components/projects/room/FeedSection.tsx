import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Calendar, CheckSquare, FileText, Flag, Gavel, Layers, MessageSquare, Package, Scale, ShieldCheck, Users, Zap } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { ProjectService } from '../../../services/projectService';
import type { FeedItem } from '../../../types/projects';
import { FEED_TYPE_LABELS } from '../../../types/projects';
import { fmtDate } from '../ui';
import { useRoom } from './RoomContext';

const ICONS: Record<string, React.ReactNode> = {
  task: <CheckSquare size={13} />, session: <Gavel size={13} />, meeting: <Users size={13} />, document: <FileText size={13} />, decision: <Scale size={13} />,
  phase: <Layers size={13} />, risk: <Zap size={13} />, issue: <Flag size={13} />, approval: <ShieldCheck size={13} />, client: <Users size={13} />, raed: <Bot size={13} />,
  milestone: <Flag size={13} />, system: <Layers size={13} />, comment: <MessageSquare size={13} />, deliverable: <Package size={13} />, member: <Users size={13} />, link: <Layers size={13} />, report: <FileText size={13} />,
};

/** الخط الزمني الموحد: كل ما حدث في المشروع من أي مصدر، وما هو قادم، بفلاتر بالنوع. */
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
    ProjectService.feed(project.id, active, 120, 60)
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

  const open = (i: FeedItem) => {
    if (i.subject_type === 'task' && i.subject_id) return openTask(i.subject_id);
    if (i.url && !i.url.startsWith('/tasks/projects/')) navigate(i.url);
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="prj-feed__types" style={{ marginBottom: 10 }}>
        <button type="button" className={`prj-chip ${active.length === 0 ? 'prj-chip--active' : ''}`} onClick={() => setActive([])}>الكل</button>
        {types.map((t) => (
          <button type="button" key={t} className={`prj-chip ${active.includes(t) ? 'prj-chip--active' : ''}`} onClick={() => setActive(active.includes(t) ? active.filter((x) => x !== t) : [...active, t])}>
            {ICONS[t]} {FEED_TYPE_LABELS[t as keyof typeof FEED_TYPE_LABELS] ?? t}
          </button>
        ))}
      </div>
      {loading && items.length === 0 ? <div className="prj-muted">جارٍ التحميل…</div> : groups.length === 0 ? <div className="ssp2-empty">لا أحداث.</div> : (
        <div className="prj-block prj-block__body--flush">
          <div className="prj-feed">
            {groups.map(([day, list]) => (
              <React.Fragment key={day}>
                <div className="prj-feed__day">{day === today ? 'اليوم' : fmtDate(day)}{day > today ? ' · قادم' : ''}</div>
                {list.map((i) => (
                  <div key={i.key} className={`prj-feed__item ${i.is_future ? 'prj-feed__item--future' : ''}`}>
                    <span className="prj-feed__time">{i.is_future ? '' : new Date(i.at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="prj-feed__icon" title={FEED_TYPE_LABELS[i.type as keyof typeof FEED_TYPE_LABELS] ?? i.type}>{ICONS[i.type] ?? <Calendar size={13} />}</span>
                    <div>
                      <div className="prj-feed__title">{(i.subject_type === 'task' && i.subject_id) || (i.url && !i.url.startsWith('/tasks/projects/')) ? <button type="button" onClick={() => open(i)}>{i.title}</button> : i.title}</div>
                      {i.body && <div className="prj-feed__body">{i.body}</div>}
                      {i.actor_name && <div className="prj-feed__meta">{i.actor_name}</div>}
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedSection;
