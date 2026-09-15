import React, { useEffect, useRef, useState } from 'react';
import { Check, FileText, History, ListChecks, Loader2, MessageSquare, Paperclip, PenLine, Plus, Send, Trash2, Upload, X } from 'lucide-react';
import { SubtaskService } from '../services/subtaskService';
import type { SubtaskDetail } from '../services/subtaskService';
import { TaskService } from '../services/taskService';
import { useAuth } from '../contexts/AuthContext';

const fmt = (iso?: string | null) => { if (!iso) return ''; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }); };
const fmtTime = (iso?: string | null) => { if (!iso) return ''; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('ar-SA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };

/**
 * نافذة المهمة الفرعية: تنزلق فوق عمود التفاصيل، وفيها الوصف والموعد والخطوات والمرفقات
 * والتعليقات والسجل. كل هذا يخص الفرعية وحدها ولا يصل مايكروسوفت To Do.
 * إنجاز كل الخطوات لا يُنجز الفرعية آلياً، ومربع الإنجاز في الرأس هو ما يُنجزها.
 */
const SubtaskPanel: React.FC<{ subtaskId: string | number; onClose: () => void; onChanged?: () => void }> = ({ subtaskId, onClose, onChanged }) => {
  const { user } = useAuth();
  const myId = user ? Number(user.id) : null;
  const [d, setD] = useState<SubtaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [newStep, setNewStep] = useState('');
  const [newComment, setNewComment] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const changedRef = useRef(false);

  const load = async () => {
    try { const r = await SubtaskService.getSubtask(subtaskId); setD(r); setTitle(r.subtask.title); setDesc(r.subtask.description ?? ''); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر فتح المهمة الفرعية'); }
  };
  useEffect(() => { setD(null); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [subtaskId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);
  const close = () => { if (changedRef.current) onChanged?.(); onClose(); };

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try { await fn(); changedRef.current = true; await load(); }
    catch (e) { alert(e instanceof Error ? e.message : 'تعذر التنفيذ'); }
    finally { setBusy(null); }
  };

  if (error) return <><div className="sob-veil" onClick={close} /><aside className="sob"><div className="sob__bar"><span className="grow">مهمة فرعية</span><button type="button" className="sob__ibtn" onClick={close}><X size={13} /></button></div><div className="sob__empty" style={{ color: 'var(--status-red)' }}>{error}</div></aside></>;
  if (!d) return <><div className="sob-veil" onClick={close} /><aside className="sob"><div className="sob__empty"><Loader2 size={14} className="ssp2-spin" /> جارٍ الفتح…</div></aside></>;

  const s = d.subtask;
  const today = new Date().toISOString().slice(0, 10);
  const late = !!s.due_date && !s.is_completed && s.due_date < today;
  const stepsDone = d.steps.filter((x) => x.is_completed).length;

  const saveTitle = async () => { const t = title.trim(); setEditingTitle(false); if (!t || t === s.title) { setTitle(s.title); return; } await run('title', () => SubtaskService.updateSubtask(String(s.id), { title: t })); };
  const saveDesc = async () => { setEditingDesc(false); if ((desc ?? '').trim() === (s.description ?? '').trim()) return; await run('desc', () => SubtaskService.updateSubtask(String(s.id), { description: desc.trim() })); };
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) await run('upload', () => SubtaskService.uploadDocument(s.id, f)); };
  const openDoc = async (docId: string | number, external?: string | null) => {
    if (external) { window.open(external, '_blank', 'noopener'); return; }
    try { const url = await TaskService.getTaskDocumentUrl(String(d.task.id), String(docId)); window.open(url, '_blank', 'noopener'); }
    catch (e) { alert(e instanceof Error ? e.message : 'تعذر فتح المرفق'); }
  };
  const sendComment = async () => { const b = newComment.trim(); if (!b) return; await run('comment', () => SubtaskService.addComment(s.id, b)); setNewComment(''); };
  const addStep = async () => { const t = newStep.trim(); if (!t) return; await run('step', () => SubtaskService.addStep(s.id, t)); setNewStep(''); };

  return (
    <>
      <div className="sob-veil" onClick={close} />
      <aside className="sob" role="dialog" aria-label="نافذة المهمة الفرعية">
        <div className="sob__bar">
          <span className="grow">المهمة: <b>{d.task.title}</b></span>
          <button type="button" className="sob__ibtn" title="إغلاق (Escape)" onClick={close}><X size={13} /></button>
        </div>
        <div className="sob__head">
          <div className="sob__title">
            <button type="button" className={`sob__chk ${s.is_completed ? 'is-done' : ''}`} title={s.is_completed ? 'أعد فتحها' : 'أنجزت'} disabled={busy !== null} onClick={() => run('toggle', () => SubtaskService.toggleSubtask(String(s.id)))}><Check size={11} /></button>
            {editingTitle
              ? <input value={title} autoFocus onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitle(s.title); setEditingTitle(false); } }} />
              : <h2 onClick={() => setEditingTitle(true)} title="اضغط لتعديل العنوان" style={{ cursor: 'text' }}>{s.title}</h2>}
            <span className="sob__badge">مهمة فرعية</span>
            {s.is_completed && <span className="sob__chip sob__chip--done">منجزة</span>}
            {s.paused_at && <span className="sob__chip sob__chip--paused" title={s.pause_reason || ''}>موقوفة{s.pause_reason ? `: ${s.pause_reason}` : ''}</span>}
            {late && <span className="sob__chip sob__chip--late">فات موعدها</span>}
          </div>
        </div>
        <div className="sob__facts">
          <div><span className="k">المكلف</span><span className="v">{s.assignee?.name ?? 'غير محدد'}</span></div>
          <div><span className="k">الاستحقاق</span><span className="v"><input type="date" value={s.due_date ?? ''} disabled={busy !== null} onChange={(e) => run('due', () => SubtaskService.updateSubtask(String(s.id), { due_date: e.target.value || null }))} style={late ? { color: 'var(--status-red)', fontWeight: 700 } : undefined} /></span></div>
          <div><span className="k">أنشأها</span><span className="v">{s.creator?.name ?? 'غير معروف'}{s.created_at ? ` · ${fmt(s.created_at)}` : ''}</span></div>
          <div><span className="k">الخطوات</span><span className="v">{d.steps.length ? `${stepsDone} من ${d.steps.length}` : 'لا خطوات'}</span></div>
        </div>
        <div className="sob__body">
          <section className="sob__sec">
            <div className="sob__sec__head"><PenLine size={13} /> الوصف {!editingDesc && <button type="button" className="act" onClick={() => setEditingDesc(true)}><PenLine size={11} /> تعديل</button>}</div>
            <div className="sob__sec__body">
              {editingDesc
                ? <><textarea value={desc} autoFocus onChange={(e) => setDesc(e.target.value)} placeholder="ما المطلوب في هذه الفرعية؟" /><div style={{ display: 'flex', gap: 6, marginTop: 6 }}><button type="button" className="sob__btn sob__btn--primary" onClick={saveDesc}><Check size={12} /> حفظ</button><button type="button" className="sob__btn" onClick={() => { setDesc(s.description ?? ''); setEditingDesc(false); }}>إلغاء</button></div></>
                : (s.description ? <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--color-text)' }}>{s.description}</p> : <span>بلا وصف.</span>)}
            </div>
          </section>

          <section className="sob__sec">
            <div className="sob__sec__head"><ListChecks size={13} /> الخطوات <span className="cnt">{d.steps.length ? `${stepsDone} من ${d.steps.length}` : ''}</span></div>
            {d.steps.length === 0 && <div className="sob__empty">لا خطوات بعد. الخطوات تخص هذه الفرعية وحدها، وإنجازها كلها لا يُنجز الفرعية تلقائياً.</div>}
            {d.steps.map((st) => (
              <div key={st.id} className={`sob__step ${st.is_completed ? 'is-done' : ''}`}>
                <button type="button" className="chk" disabled={busy !== null} onClick={() => run(`s${st.id}`, () => SubtaskService.updateStep(s.id, st.id, { is_completed: !st.is_completed }))}><Check size={10} /></button>
                <span className="t">{st.title}</span>
                {st.is_completed && st.completed_by_user && <span className="who">{st.completed_by_user.name.split(' ')[0]}{st.completed_at ? ` · ${fmt(st.completed_at)}` : ''}</span>}
                <button type="button" className="del" title="حذف الخطوة" disabled={busy !== null} onClick={() => { if (window.confirm(`حذف الخطوة «${st.title}»؟`)) run(`d${st.id}`, () => SubtaskService.deleteStep(s.id, st.id)); }}><Trash2 size={12} /></button>
              </div>
            ))}
            <div className="sob__compose">
              <input value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="خطوة جديدة…" onKeyDown={(e) => { if (e.key === 'Enter') addStep(); }} />
              <button type="button" className="sob__btn" disabled={!newStep.trim() || busy !== null} onClick={addStep}><Plus size={12} /> أضف</button>
            </div>
          </section>

          <section className="sob__sec">
            <div className="sob__sec__head"><Paperclip size={13} /> المرفقات <span className="cnt">{d.documents.length}</span>
              <button type="button" className="act" disabled={busy === 'upload'} onClick={() => fileRef.current?.click()}>{busy === 'upload' ? <Loader2 size={11} className="ssp2-spin" /> : <Upload size={11} />} رفع ملف</button>
              <input ref={fileRef} type="file" hidden onChange={upload} />
            </div>
            {d.documents.length === 0 && <div className="sob__empty">لا مرفقات. ما يُرفع هنا يظهر أيضاً في مرفقات المهمة موسوماً باسم الفرعية.</div>}
            {d.documents.map((doc) => (
              <div key={String(doc.id)} className="sob__doc">
                <FileText size={13} />
                <button type="button" className="t" style={{ background: 'none', border: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'start' }} onClick={() => openDoc(doc.id, doc.external_url)}>{doc.title || doc.file_name}</button>
                <span className="from">{doc.created_at ? fmt(doc.created_at) : ''}</span>
              </div>
            ))}
          </section>

          <section className="sob__sec">
            <div className="sob__sec__head"><MessageSquare size={13} /> التعليقات <span className="cnt">{d.comments.length}</span></div>
            {d.comments.length === 0 && <div className="sob__empty">لا تعليقات على هذه الفرعية. هذا خيط مستقل عن محادثة المهمة.</div>}
            {d.comments.length > 0 && (
              <div className="sob__msgs">
                {d.comments.map((c) => (
                  <div key={c.id} className={`sob__msg ${c.user_id === myId ? 'sob__msg--me' : ''}`}>
                    <span className="who">{c.user_id === myId ? 'أنت' : c.user?.name ?? '—'} · {fmtTime(c.created_at)}{c.user_id === myId && <button type="button" title="حذف" onClick={() => { if (window.confirm('حذف التعليق؟')) run(`c${c.id}`, () => SubtaskService.deleteComment(s.id, c.id)); }}><Trash2 size={11} /></button>}</span>
                    <span style={{ whiteSpace: 'pre-wrap' }}>{c.body}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="sob__compose">
              <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="اكتب تعليقاً على هذه الفرعية…" onKeyDown={(e) => { if (e.key === 'Enter') sendComment(); }} />
              <button type="button" className="sob__btn sob__btn--primary" disabled={!newComment.trim() || busy !== null} onClick={sendComment}><Send size={12} /></button>
            </div>
          </section>

          <section className="sob__sec" style={{ borderBottom: 0 }}>
            <div className="sob__sec__head"><History size={13} /> السجل</div>
            <div className="sob__log">
              <div>كتبها {s.creator?.name ?? 'غير معروف'}{s.created_at ? ` · ${fmtTime(s.created_at)}` : ''}</div>
              {s.paused_at && <div>أوقفها {s.paused_by_user?.name ?? 'غير معروف'} · {fmtTime(s.paused_at)}{s.pause_reason ? ` · السبب: ${s.pause_reason}` : ''}</div>}
              {s.is_completed && <div>أنجزها {s.completed_by_user?.name ?? 'غير معروف'}{s.completed_at ? ` · ${fmtTime(s.completed_at)}` : ''}</div>}
            </div>
          </section>
        </div>
        <div className="sob__foot">
          <span>الخطوات والتعليقات والمرفقات تخص هذه الفرعية وحدها ولا تصل مايكروسوفت To Do.</span>
        </div>
      </aside>
    </>
  );
};

export default SubtaskPanel;
