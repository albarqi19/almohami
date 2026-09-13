import React, { useEffect, useRef, useState } from 'react';
import { AtSign, Send, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';
import { ProjectService } from '../../../services/projectService';
import type { ProjectComment } from '../../../types/projects';
import { fmtDateTime } from '../ui';
import { useRoom } from './RoomContext';

/** محادثة المشروع: ملاحظات الفريق مع إشارات @ تصل إشعاراً لصاحبها. */
const ChatSection: React.FC = () => {
  const { project, canEdit } = useRoom();
  const { user } = useAuth();
  const [items, setItems] = useState<ProjectComment[]>([]);
  const [body, setBody] = useState('');
  const [mentions, setMentions] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => { try { setItems(await ProjectService.comments(project.id)); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الجلب'); } };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [items.length]);

  const send = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try { const c = await ProjectService.addComment(project.id, body.trim(), mentions); setItems([...items, c]); setBody(''); setMentions([]); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الإرسال'); }
    finally { setBusy(false); }
  };

  const remove = async (c: ProjectComment) => {
    if (!window.confirm('حذف الرسالة؟')) return;
    try { await ProjectService.deleteComment(project.id, c.id); setItems(items.filter((i) => i.id !== c.id)); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); }
  };

  const toggleMention = (id: number) => setMentions(mentions.includes(id) ? mentions.filter((m) => m !== id) : [...mentions, id]);
  const myId = user ? Number(user.id) : null;

  return (
    <div>
      <div className="prj-chat">
        {items.length === 0 && <div className="ssp2-empty">لا رسائل بعد. اكتب أول ملاحظة للفريق.</div>}
        {items.map((c) => (
          <div key={c.id} className={`prj-msg ${c.author_type === 'raed' ? 'prj-msg--raed' : ''} ${c.user && myId === c.user.id ? 'prj-msg--mine' : ''}`}>
            <div className="prj-msg__head">
              <b>{c.author_type === 'raed' ? 'رائد' : c.author_type === 'system' ? 'النظام' : c.user?.name ?? '—'}</b>
              <span>{fmtDateTime(c.created_at)}</span>
              {c.mentions.length > 0 && <span><AtSign size={10} /> {c.mentions.map((m) => project.members.find((x) => x.user_id === m)?.name ?? `#${m}`).join('، ')}</span>}
              {(myId === c.user?.id || canEdit) && c.author_type === 'user' && <button type="button" title="حذف" onClick={() => remove(c)}><Trash2 size={12} /></button>}
            </div>
            <div className="prj-msg__body">{c.body}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="prj-compose">
        <div style={{ flex: 1 }}>
          <textarea className="ssp2-input" rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="اكتب للفريق… (Ctrl+Enter للإرسال)" onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); }} />
          <div className="prj-chips" style={{ marginTop: 6 }}>
            <span className="prj-muted"><AtSign size={11} /> أشر إلى:</span>
            {project.members.filter((m) => m.user_id !== myId).map((m) => (
              <button type="button" key={m.user_id} className={`prj-chip ${mentions.includes(m.user_id) ? 'prj-chip--navy' : ''}`} style={{ cursor: 'pointer' }} onClick={() => toggleMention(m.user_id)}>{m.name}</button>
            ))}
          </div>
        </div>
        <button type="button" className="ssp2-btn ssp2-btn--primary" onClick={send} disabled={busy || !body.trim()}><Send size={13} /> إرسال</button>
      </div>
    </div>
  );
};

export default ChatSection;
