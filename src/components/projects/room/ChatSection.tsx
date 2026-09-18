import React, { useEffect, useRef, useState } from 'react';
import { AtSign, Loader2, MessageSquare, Send, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';
import { ProjectService } from '../../../services/projectService';
import type { ProjectComment } from '../../../types/projects';
import { Chip, whenAr } from '../ui';
import { useRoom } from './RoomContext';

/** محادثة المشروع كما في التصوّر: فريق المشروع، ورائد متاح بـ@رائد فيجيب داخل المحادثة من بيانات المشروع. */
const ChatSection: React.FC = () => {
  const { project, canEdit, chatDraft, setChatDraft, openTask, goTo } = useRoom();
  const { user } = useAuth();
  const [items, setItems] = useState<ProjectComment[]>([]);
  const [body, setBody] = useState(chatDraft);
  const [mentions, setMentions] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [waitingRaed, setWaitingRaed] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const load = async () => { try { setItems(await ProjectService.comments(project.id)); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الجلب'); } };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id]);
  useEffect(() => { if (chatDraft) { setBody(chatDraft); setChatDraft(''); setTimeout(() => inputRef.current?.focus(), 50); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [chatDraft]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [items.length, waitingRaed]);

  const send = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      const r = await ProjectService.addComment(project.id, body.trim(), mentions);
      setItems((prev) => [...prev, r.comment]);
      setBody(''); setMentions([]);
      if (r.raedMessage) toast.warn(r.raedMessage);
      if (r.raedRunId) {
        setWaitingRaed(true);
        try { await ProjectService.waitForRun(r.raedRunId); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر جواب رائد'); }
        await load();
        setWaitingRaed(false);
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الإرسال'); }
    finally { setBusy(false); }
  };
  const remove = async (c: ProjectComment) => { if (!window.confirm('حذف الرسالة؟')) return; try { await ProjectService.deleteComment(project.id, c.id); setItems(items.filter((i) => i.id !== c.id)); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); } };
  const toggleMention = (id: number) => setMentions(mentions.includes(id) ? mentions.filter((m) => m !== id) : [...mentions, id]);
  const myId = user ? Number(user.id) : null;
  const openSource = (s: { type: string; id: number | null }) => {
    if (s.type === 'task' && s.id) return openTask(s.id);
    if (s.type === 'phase') return goTo('tasks');
    if (s.type === 'milestone' || s.type === 'session') return goTo('map');
    if (s.type === 'issue') return goTo('issues');
    if (s.type === 'risk') return goTo('risks');
    if (s.type === 'decision') return goTo('decisions');
    if (s.type === 'deliverable') return goTo('deliv');
  };

  return (
    <div className="prj-view">
      <div className="prj-chat">
        <div className="prj-card__head"><MessageSquare size={14} /> محادثة المشروع <span className="prj-cnt">فريق المشروع · رائد متاح بـ @رائد</span></div>
        <div className="prj-msgs">
          {items.length === 0 && <div className="prj-empty">لا رسائل بعد. اكتب للفريق، أو ابدأ بـ@رائد لتسأله عن المشروع.</div>}
          {items.map((c) => {
            const mine = c.user && myId === c.user.id;
            const raed = c.author_type === 'raed';
            const sources = (c.meta?.sources as Array<{ type: string; id: number | null; label: string }> | undefined) ?? [];
            return (
              <div key={c.id} className={`prj-msg ${mine ? 'prj-msg--me' : ''} ${raed ? 'prj-msg--raed' : ''}`}>
                <span className="who">{raed ? 'رائد' : c.author_type === 'system' ? 'النظام' : c.user?.name ?? '—'} · {whenAr(c.created_at)}{c.mentions.length > 0 && <span> · <AtSign size={9} /> {c.mentions.map((m) => project.members.find((x) => x.user_id === m)?.name?.split(' ')[0] ?? `#${m}`).join('، ')}</span>}{(mine || canEdit) && c.author_type === 'user' && <button type="button" title="حذف" onClick={() => remove(c)}><Trash2 size={10} /></button>}</span>
                {c.body}
                {raed && sources.length > 0 && <div className="prj-msg__sources"><span className="prj-dim" style={{ fontSize: 10.5 }}>المصدر:</span>{sources.map((s, i) => <Chip key={i} tone="todo" onClick={() => openSource(s)}>{s.label}</Chip>)}</div>}
              </div>
            );
          })}
          {waitingRaed && <div className="prj-msg prj-msg--raed"><span className="who">رائد</span><Loader2 size={12} className="ssp2-spin" /> يقرأ المشروع ويجيب…</div>}
          <div ref={endRef} />
        </div>
        <div className="prj-compose">
          <textarea ref={inputRef} rows={1} value={body} onChange={(e) => setBody(e.target.value)} placeholder="اكتب رسالة… @رائد للسؤال عن المشروع" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <button type="button" className="prj-ibtn" onClick={send} disabled={busy || !body.trim()} title="إرسال">{busy ? <Loader2 size={13} className="ssp2-spin" /> : <Send size={13} />}</button>
        </div>
        <div className="prj-mentions">
          <span><AtSign size={10} /> أشر إلى:</span>
          {project.members.filter((m) => m.user_id !== myId).map((m) => <button type="button" key={m.user_id} className={`prj-fchip ${mentions.includes(m.user_id) ? 'is-on' : ''}`} onClick={() => toggleMention(m.user_id)}>{m.name.split(' ')[0]}</button>)}
          <button type="button" className="prj-fchip" onClick={() => { setBody((b) => (b.includes('@رائد') ? b : `@رائد ${b}`)); inputRef.current?.focus(); }}>@رائد</button>
          <span className="prj-spacer" />
          <span>التعليقات على مهمة أو مستند تبقى معها. هذه المحادثة للمشروع كله.</span>
        </div>
      </div>
    </div>
  );
};

export default ChatSection;
