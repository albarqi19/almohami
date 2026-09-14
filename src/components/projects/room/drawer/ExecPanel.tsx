import React, { useEffect, useRef, useState } from 'react';
import { Check, Clock, Coins, Flag, Gavel, Loader2, Plus, Sparkles, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import { ExecutionRequestService } from '../../../../services/executionRequestService';
import { TaskService } from '../../../../services/taskService';
import type { ExecutionRequest } from '../../../../types';
import { useAuth } from '../../../../contexts/AuthContext';
import { Av, Chip, UserSelect, fmtDate, num, taskStatus } from '../../ui';
import { useRoom } from '../RoomContext';

const money = (v?: number | string | null): string => (v === null || v === undefined || v === '' ? '—' : `${num(Math.round(Number(v)))} ريال`);
const pick = (o: Record<string, unknown>, keys: string[]): string => { for (const k of keys) { const v = o[k]; if (v !== undefined && v !== null && String(v).trim() !== '') return String(v); } return ''; };

/**
 * لوحة طلب التنفيذ داخل الغرفة: خط سير الطلب، المبالغ، القرارات والأطراف، مهامه، وآخر التحصيل.
 * بيانات ناجز تُقرأ كما هي؛ الإضافة هنا مهام على الطلب. الربط والمشاركة من صفحة طلبات التنفيذ.
 */
const ExecPanel: React.FC<{ requestId: number; onTitle: (title: string) => void }> = ({ requestId, onTitle }) => {
  const { openIn, users, canEdit, refresh } = useRoom();
  const { user } = useAuth();
  const [req, setReq] = useState<ExecutionRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState<number | null>(user ? Number(user.id) : null);
  const [due, setDue] = useState('');
  const onTitleRef = useRef(onTitle);
  onTitleRef.current = onTitle;

  const load = async () => {
    try { const r = await ExecutionRequestService.getRequest(requestId); setReq(r); setError(null); onTitleRef.current(`طلب تنفيذ ${r.request_number}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر فتح طلب التنفيذ'); }
  };
  useEffect(() => { setReq(null); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [requestId]);

  const run = async (key: string, fn: () => Promise<unknown>, okMsg?: string) => {
    setBusy(key);
    try { await fn(); if (okMsg) toast.success(okMsg); await load(); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر التنفيذ'); }
    finally { setBusy(null); }
  };
  const addTask = () => run('add', async () => {
    await TaskService.createTask({ title: title.trim(), executionRequestId: requestId, assignedTo: assignee ? String(assignee) : undefined, priority: 'medium', dueDate: due ? new Date(due) : undefined });
    setTitle(''); setDue(''); setAdding(false);
  }, 'أُضيفت المهمة على الطلب');

  if (error) return <div className="prj-panel"><div className="prj-panel__body"><div className="prj-error" style={{ margin: 14 }}>{error}</div></div></div>;
  if (!req) return <div className="prj-panel"><div className="prj-panel__body"><div className="prj-empty"><Loader2 size={14} className="ssp2-spin" /> جارٍ فتح طلب التنفيذ…</div></div></div>;

  const steps = Array.isArray(req.steps) ? (req.steps as Record<string, unknown>[]) : [];
  const decisions = Array.isArray(req.decisions) ? (req.decisions as Record<string, unknown>[]) : [];
  const parties = Array.isArray(req.parties) ? req.parties : [];
  const tasks = Array.isArray(req.tasks) ? req.tasks : [];
  const logs = Array.isArray(req.payment_logs) ? req.payment_logs.slice(0, 5) : [];
  const total = Number(req.total_amount ?? 0);
  const paid = Number(req.paid_amount ?? 0);
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const debtor = parties.find((p) => /منفذ ضده|مدين/.test(p.role || ''))?.name ?? null;

  return (
    <div className="prj-panel">
      <div className="prj-panel__head">
        <div className="prj-panel__title">
          <span className="prj-badge">طلب تنفيذ</span>
          <span className="prj-code" style={{ color: 'var(--pj-navy)', background: 'var(--pj-gold-tint)' }}>{req.request_number}</span>
          <h2>{req.main_document_type || 'طلب تنفيذ'}{req.sub_document_type ? ` · ${req.sub_document_type}` : ''}</h2>
          <Chip tone="doing">{req.status}</Chip>
          {req.source === 'najiz' && <Chip tone="raed"><Sparkles size={10} /> ناجز{req.najiz_synced_at ? ` · ${fmtDate(req.najiz_synced_at)}` : ''}</Chip>}
        </div>
        <div className="prj-panel__sub">
          {(req.court || req.department) && <span>{[req.court, req.department].filter(Boolean).join(' · ')}</span>}
          {req.party_role && <span>صفتنا: <b>{req.party_role}</b></span>}
          {req.client && <span>العميل <button type="button" className="prj-link" onClick={() => openIn({ type: 'client', id: req.client!.id })}>{req.client.name}</button></span>}
          {req.linked_case && <span>القضية <button type="button" className="prj-link" onClick={() => openIn({ type: 'case', id: req.linked_case!.id })}>{req.linked_case.file_number ? `${req.linked_case.file_number} · ` : ''}{req.linked_case.title}</button></span>}
        </div>
      </div>
      <div className="prj-panel__acts">
        {canEdit && !adding && <button type="button" className="prj-btn prj-btn--sm prj-btn--primary" onClick={() => setAdding(true)}><Plus size={12} /> مهمة على الطلب</button>}
        {adding && (
          <>
            <input className="prj-in" style={{ minWidth: 200 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان المهمة" autoFocus />
            <UserSelect users={users} value={assignee} onChange={setAssignee} placeholder="— المكلف —" />
            <input type="date" className="prj-in" value={due} onChange={(e) => setDue(e.target.value)} title="الموعد" />
            <button type="button" className="prj-btn prj-btn--sm prj-btn--primary" disabled={!title.trim() || busy !== null} onClick={addTask}>{busy === 'add' ? <Loader2 size={12} className="ssp2-spin" /> : <Check size={12} />} أضف</button>
            <button type="button" className="prj-btn prj-btn--sm" onClick={() => setAdding(false)}>إلغاء</button>
          </>
        )}
      </div>
      <div className="prj-panel__body">
        <div className="prj-money">
          <div><b className="num">{money(req.total_amount)}</b><span>المطالب به</span></div>
          <div><b className="num" style={{ color: 'var(--pj-ok)' }}>{money(req.paid_amount)}</b><span>المحصّل{total > 0 ? ` · ${pct}٪` : ''}</span><span className="prj-pbar"><b style={{ width: `${pct}%` }} /></span></div>
          <div><b className="num">{money(req.remaining_amount ?? (total ? total - paid : null))}</b><span>المتبقي{logs[0] ? ` · آخر تحصيل ${fmtDate(logs[0].detected_at)}` : ''}</span></div>
        </div>
        {steps.length > 0 && (
          <div className="prj-pipe">
            {steps.map((s, i) => <span key={i} className={i === steps.length - 1 ? 'is-cur' : 'is-done'} title={pick(s, ['stepDate', 'date'])}>{pick(s, ['stepName', 'name', 'title']) || `مرحلة ${i + 1}`}</span>)}
          </div>
        )}
        <div className="prj-kv2">
          <div><span className="k">المنفذ ضده</span><span className="v">{debtor || '—'}</span></div>
          <div><span className="k">تاريخ التقديم</span><span className="v num">{req.filing_date_gregorian ? fmtDate(req.filing_date_gregorian) : req.filing_date_hijri || '—'}</span></div>
          <div><span className="k">آخر إجراء</span><span className="v">{steps.length ? `${pick(steps[steps.length - 1], ['stepName', 'name', 'title'])}${pick(steps[steps.length - 1], ['stepDate', 'date']) ? ` · ${pick(steps[steps.length - 1], ['stepDate', 'date'])}` : ''}` : '—'}</span></div>
          <div><span className="k">القرارات</span><span className="v num">{decisions.length}</span></div>
        </div>

        <section className="prj-sec">
          <div className="prj-sec__head"><Flag size={13} /> مهام الطلب <span className="prj-cnt num">{tasks.length}</span></div>
          {tasks.length === 0 && <div className="prj-empty">لا مهام على هذا الطلب.</div>}
          {tasks.map((t) => { const st = taskStatus(t.status); return (
            <div key={String(t.id)} className="prj-row prj-row--click" style={{ padding: '5px 14px' }} onClick={() => openIn({ type: 'task', id: Number(t.id) })}>
              <span className={`prj-chk ${t.status === 'completed' ? 'is-done' : ''}`} />
              <span className="prj-grow">{t.title}</span>
              <Chip tone={st.tone}>{st.label}</Chip>
              {t.dueDate && <span className="when num">{fmtDate(String(t.dueDate))}</span>}
              {t.assignee && <Av name={t.assignee.name} />}
            </div>
          ); })}
        </section>

        {decisions.length > 0 && (
          <section className="prj-sec">
            <div className="prj-sec__head"><Gavel size={13} /> القرارات <span className="prj-cnt num">{decisions.length}</span></div>
            {decisions.map((d, i) => (
              <div key={i} className="prj-row" style={{ padding: '5px 14px' }}>
                <span className="prj-grow">{pick(d, ['decisionNumber', 'number']) || `قرار ${i + 1}`}<small style={{ display: 'block', color: 'var(--pj-ink-3)', fontSize: 10.5 }}>{pick(d, ['status', 'statusName']) || '—'}{pick(d, ['issueDate']) ? ` · ${pick(d, ['issueDate'])}` : ''}</small></span>
              </div>
            ))}
          </section>
        )}

        <section className="prj-sec">
          <div className="prj-sec__head"><Users size={13} /> الأطراف <span className="prj-cnt num">{parties.length}</span></div>
          {parties.length === 0 && <div className="prj-empty">لا أطراف مسجلة.</div>}
          {parties.map((p, i) => (
            <div key={i} className="prj-row" style={{ padding: '5px 14px' }}>
              <Av name={p.name} kind="x" />
              <span className="prj-grow">{p.name}<small style={{ display: 'block', color: 'var(--pj-ink-3)', fontSize: 10.5 }}>{p.role}{p.id_number ? ` · ${p.id_number}` : ''}</small></span>
            </div>
          ))}
        </section>

        {logs.length > 0 && (
          <section className="prj-sec" style={{ borderBottom: 0 }}>
            <div className="prj-sec__head"><Coins size={13} /> آخر التحصيل</div>
            {logs.map((l) => (
              <div key={l.id} className="prj-row" style={{ padding: '5px 14px' }}>
                <Clock size={12} style={{ color: 'var(--pj-ink-3)', flex: 'none' }} />
                <span className="prj-grow">تغيّر المسدد بـ <b className="num" style={{ color: 'var(--pj-ok)' }}>{money(l.delta)}</b>{l.new_status && l.new_status !== l.previous_status ? ` · الحالة: ${l.new_status}` : ''}</span>
                <span className="when num">{fmtDate(l.detected_at)}</span>
              </div>
            ))}
          </section>
        )}
      </div>
      <div className="prj-panel__foot"><span>بيانات الطلب من ناجز كما هي. ربط العميل والقضية والمشاركة من صفحة طلبات التنفيذ.</span></div>
    </div>
  );
};

export default ExecPanel;
