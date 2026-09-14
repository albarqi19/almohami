import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Eye, FileText, Gavel, Loader2, MessageSquare, Scale, Sparkles, Upload, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import { CaseService } from '../../../../services/caseService';
import { DocumentService } from '../../../../services/documentService';
import { TaskService } from '../../../../services/taskService';
import type { Case, CaseSession, Document, Task } from '../../../../types';
import CaseTeamChat from '../../../CaseTeamChat';
import { Av, Chip, daysFromToday, fmtDate, fmtDayMonth, taskStatus } from '../../ui';
import { useRoom } from '../RoomContext';

type Tab = 'sum' | 'sess' | 'judg' | 'parties' | 'docs' | 'tasks' | 'chat';
const CASE_STATUS_AR: Record<string, string> = { draft: 'مسودة', preparation: 'قيد التجهيز', filed: 'مرفوعة', active: 'قيد النظر', pending: 'معلقة', closed: 'مغلقة', appealed: 'مستأنفة', settled: 'تسوية', dismissed: 'مرفوضة' };
const SIDE_AR: Record<string, string> = { plaintiff: 'مدعٍ', defendant: 'مدعى عليه', lawyer: 'محامٍ', agent: 'وكيل', appellant: 'مستأنف', appellee: 'مستأنف ضده', other: 'طرف آخر' };

const sessionDate = (s: CaseSession): string | null => {
  const g = s.session_date_gregorian as unknown as string | Date | null | undefined;
  if (g) return g instanceof Date ? g.toISOString() : String(g);
  return s.session_date ?? null;
};
const snippet = (s?: string | null, n = 90) => (s ? (s.length > n ? `${s.slice(0, n)}…` : s) : '');

/**
 * لوحة القضية داخل الغرفة: رأس القضية والأطراف والمحامون، الجلسة القادمة وتحضيرها، ثم تبويبات
 * الجلسات والأحكام والأطراف والمستندات والمهام والمحادثة. تعديل بيانات القضية والوكالات والفوترة في صفحتها.
 */
const CasePanel: React.FC<{ caseId: number; onTitle: (title: string) => void }> = ({ caseId, onTitle }) => {
  const { openIn, canEdit } = useRoom();
  const navigate = useNavigate();
  const [kase, setKase] = useState<Case | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('sum');
  const [docs, setDocs] = useState<Document[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const onTitleRef = useRef(onTitle);
  onTitleRef.current = onTitle;

  const load = async () => {
    try { const c = await CaseService.getCase(String(caseId)); setKase(c); setError(null); onTitleRef.current(c.file_number ? `${c.file_number} · ${c.title}` : c.title); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر فتح القضية'); }
  };
  useEffect(() => { setKase(null); setDocs(null); setTasks(null); setTab('sum'); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [caseId]);
  const loadDocs = async () => { try { const r = await DocumentService.getDocuments({ case_id: String(caseId), limit: 60 }); setDocs(r.data ?? []); } catch { setDocs([]); } };
  const loadTasks = async () => { try { const r = await TaskService.getTasks({ case_id: String(caseId), per_page: 60 }); setTasks(r.data ?? []); } catch { setTasks([]); } };
  useEffect(() => { if (tab === 'docs' && docs === null) loadDocs(); if (tab === 'tasks' && tasks === null) loadTasks(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('upload');
    try { await DocumentService.uploadDocument({ title: file.name, file, case_id: String(caseId) }); toast.success('رُفع المستند على القضية'); await loadDocs(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'تعذر الرفع'); }
    finally { setBusy(null); }
  };

  if (error) return <div className="prj-panel"><div className="prj-panel__body"><div className="prj-error" style={{ margin: 14 }}>{error}</div></div></div>;
  if (!kase) return <div className="prj-panel"><div className="prj-panel__body"><div className="prj-empty"><Loader2 size={14} className="ssp2-spin" /> جارٍ فتح القضية…</div></div></div>;

  const sessions = [...(kase.sessions ?? [])].sort((a, b) => (sessionDate(b) ?? '').localeCompare(sessionDate(a) ?? ''));
  const upcoming = [...sessions].reverse().find((s) => !s.has_ended && (sessionDate(s) ?? '') >= new Date().toISOString().slice(0, 10));
  const judgements = kase.judgements ?? [];
  const parties = kase.parties ?? [];
  const lawyers = kase.lawyers ?? [];
  const statusLabel = kase.najiz_status_arabic || CASE_STATUS_AR[kase.status] || kase.status;
  const opponent = kase.opponent_name || kase.defendant_name || null;
  const lastSynced = kase.najiz_synced_at ? fmtDate(kase.najiz_synced_at as unknown as string) : null;

  return (
    <div className="prj-panel">
      <div className="prj-panel__head">
        <div className="prj-panel__title">
          <span className="prj-badge">قضية</span>
          {kase.file_number && <span className="prj-code" style={{ color: 'var(--pj-navy)', background: 'var(--pj-gold-tint)' }}>{kase.file_number}</span>}
          <h2>{kase.title}</h2>
          <Chip tone="doing">{statusLabel}</Chip>
          {kase.najiz_access_revoked && <Chip tone="late">انقطعت في ناجز</Chip>}
        </div>
        <div className="prj-panel__sub">
          {(kase.court || kase.department) && <span>{[kase.court, kase.department].filter(Boolean).join(' · ')}</span>}
          {(kase.case_type_arabic || kase.case_type) && <span>{kase.case_type_arabic || kase.case_type}</span>}
          {lawyers.length > 0 && <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>المحامون: {lawyers.map((u) => <Av key={String(u.id)} name={u.name} title={u.name} />)}</span>}
          {kase.najiz_id && <Chip tone="raed"><Sparkles size={10} /> ناجز{lastSynced ? ` · آخر مزامنة ${lastSynced}` : ''}</Chip>}
        </div>
      </div>
      <div className="prj-panel__acts">
        {upcoming && <button type="button" className="prj-btn prj-btn--sm prj-btn--primary" onClick={() => navigate(`/sessions/${upcoming.id}/prep`)}><Sparkles size={12} /> تحضير الجلسة القادمة</button>}
        {canEdit && <><button type="button" className="prj-btn prj-btn--sm" disabled={busy === 'upload'} onClick={() => fileRef.current?.click()}>{busy === 'upload' ? <Loader2 size={12} className="ssp2-spin" /> : <Upload size={12} />} رفع مستند</button><input ref={fileRef} type="file" hidden onChange={upload} /></>}
        <button type="button" className="prj-btn prj-btn--sm" onClick={() => setTab('chat')}><MessageSquare size={12} /> ملاحظة للفريق</button>
      </div>
      <div className="prj-dr-tabs">
        {([['sum', 'ملخص', null], ['sess', 'الجلسات', sessions.length], ['judg', 'الأحكام', judgements.length], ['parties', 'الأطراف', parties.length], ['docs', 'المستندات', docs?.length ?? null], ['tasks', 'المهام', tasks?.length ?? null], ['chat', 'المحادثة', null]] as Array<[Tab, string, number | null]>).map(([k, l, n]) => (
          <button type="button" key={k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>{l}{n !== null && n > 0 ? <span className="prj-cnt num">{n}</span> : null}</button>
        ))}
      </div>
      <div className="prj-panel__body">
        {tab === 'sum' && (
          <>
            <div className="prj-kv2">
              <div><span className="k">الموكل</span><span className="v">{kase.client_id ? <button type="button" className="prj-link" onClick={() => openIn({ type: 'client', id: Number(kase.client_id) })}>{kase.client_name}</button> : kase.client_name || '—'}</span></div>
              <div><span className="k">الخصم</span><span className="v">{opponent || '—'}</span></div>
              <div><span className="k">النوع</span><span className="v">{kase.case_type_arabic || kase.case_type || '—'}</span></div>
              <div><span className="k">الحالة</span><span className="v">{statusLabel}</span></div>
              <div><span className="k">المحكمة</span><span className="v">{kase.court || '—'}</span></div>
              <div><span className="k">الدائرة</span><span className="v">{kase.department || '—'}</span></div>
              <div><span className="k">القيد</span><span className="v num">{kase.filing_date ? fmtDate(kase.filing_date as unknown as string) : '—'}</span></div>
              <div><span className="k">الجلسات</span><span className="v num">{sessions.length} · الأحكام {judgements.length}</span></div>
            </div>
            <section className="prj-sec">
              <div className="prj-sec__head"><Calendar size={13} /> الجلسة القادمة</div>
              {upcoming ? (
                <div className="prj-row prj-row--click" style={{ padding: '6px 14px' }} onClick={() => openIn({ type: 'session', id: Number(upcoming.id) })}>
                  <span className="prj-grow"><b style={{ color: 'var(--pj-ink)' }}>{upcoming.session_type || 'جلسة'} · {fmtDate(sessionDate(upcoming))}{upcoming.session_time ? ` · ${upcoming.session_time}` : ''}</b><small style={{ display: 'block', color: 'var(--pj-ink-3)', fontSize: 10.5 }}>{[upcoming.court, upcoming.department, upcoming.method].filter(Boolean).join(' · ')}</small></span>
                  {(() => { const d = daysFromToday(sessionDate(upcoming)); return d ? <Chip tone="warn">{d.label}</Chip> : null; })()}
                  <button type="button" className="prj-btn prj-btn--sm">افتح الجلسة</button>
                </div>
              ) : <div className="prj-empty">لا جلسة قادمة مسجلة.</div>}
            </section>
            {kase.case_subject && <section className="prj-sec"><div className="prj-sec__head"><Scale size={13} /> موضوع القضية</div><div className="prj-sec__body"><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{kase.case_subject}</p></div></section>}
            <section className="prj-sec" style={{ borderBottom: 0 }}>
              <div className="prj-sec__head"><Gavel size={13} /> آخر الجلسات</div>
              {sessions.slice(0, 3).map((s) => (
                <div key={String(s.id)} className="prj-row prj-row--click" style={{ padding: '5px 14px' }} onClick={() => openIn({ type: 'session', id: Number(s.id) })}>
                  <span className="prj-grow">{s.session_type || 'جلسة'} · {fmtDayMonth(sessionDate(s))}<small style={{ display: 'block', color: 'var(--pj-ink-3)', fontSize: 10.5 }}>{snippet(s.session_judgement || s.result || s.session_text) || (s.has_ended ? 'بلا نتيجة مسجلة' : 'قادمة')}</small></span>
                  <Chip tone={s.has_ended ? 'done' : 'warn'}>{s.has_ended ? 'انعقدت' : 'قادمة'}</Chip>
                </div>
              ))}
              {sessions.length === 0 && <div className="prj-empty">لا جلسات.</div>}
            </section>
          </>
        )}
        {tab === 'sess' && (
          <div>
            {sessions.length === 0 && <div className="prj-empty">لا جلسات مسجلة.</div>}
            {sessions.map((s) => (
              <div key={String(s.id)} className="prj-row prj-row--click" style={{ padding: '6px 14px' }} onClick={() => openIn({ type: 'session', id: Number(s.id) })}>
                <span className="prj-grow"><b style={{ color: 'var(--pj-ink)' }}>{s.session_type || 'جلسة'} · {fmtDate(sessionDate(s))}{s.session_time ? ` · ${s.session_time}` : ''}</b><small style={{ display: 'block', color: 'var(--pj-ink-3)', fontSize: 10.5 }}>{snippet(s.session_judgement || s.result || s.session_text) || [s.court, s.department].filter(Boolean).join(' · ')}</small></span>
                <Chip tone={s.has_ended ? 'done' : 'warn'}>{s.has_ended ? 'انعقدت' : 'قادمة'}</Chip>
                <button type="button" className="prj-btn prj-btn--sm">افتح</button>
              </div>
            ))}
          </div>
        )}
        {tab === 'judg' && (
          <div>
            {judgements.length === 0 && <div className="prj-empty">لا أحكام مسجلة بعد.</div>}
            {judgements.map((j) => (
              <div key={String(j.id)} className="prj-row" style={{ padding: '6px 14px', alignItems: 'flex-start' }}>
                <Gavel size={13} style={{ color: 'var(--pj-gold)', flex: 'none', marginTop: 3 }} />
                <span className="prj-grow" style={{ whiteSpace: 'normal' }}><b style={{ color: 'var(--pj-ink)' }}>{j.judgement_type || 'حكم'}{j.sak_date || j.delivery_date ? ` · ${fmtDate(j.sak_date || j.delivery_date)}` : ''}</b><small style={{ display: 'block', color: 'var(--pj-ink-3)', fontSize: 10.5 }}>{[j.court_name, j.circle_name].filter(Boolean).join(' · ')}{j.available_for_objection && j.remaining_objection_days != null ? ` · للاعتراض ${j.remaining_objection_days} يوماً` : ''}</small>{j.text && <span style={{ display: 'block', color: 'var(--pj-ink-2)', marginTop: 4 }}>{snippet(j.text, 240)}</span>}</span>
              </div>
            ))}
          </div>
        )}
        {tab === 'parties' && (
          <div>
            {parties.length === 0 && <div className="prj-empty">لا أطراف مسجلة.</div>}
            {parties.map((p) => (
              <div key={p.id} className="prj-row" style={{ padding: '6px 14px' }}>
                <Av name={p.name} kind={p.side === 'plaintiff' ? 'c' : 'x'} />
                <span className="prj-grow">{p.name}<small style={{ display: 'block', color: 'var(--pj-ink-3)', fontSize: 10.5 }}>{SIDE_AR[p.side] || p.role}{p.represents ? ` · يمثل ${p.represents}` : ''}{p.phone ? ` · ${p.phone}` : ''}</small></span>
              </div>
            ))}
          </div>
        )}
        {tab === 'docs' && (
          <div>
            {docs === null && <div className="prj-empty"><Loader2 size={14} className="ssp2-spin" /> جارٍ جلب المستندات…</div>}
            {docs && docs.length === 0 && <div className="prj-empty">لا مستندات على القضية.</div>}
            {docs?.map((d) => (
              <div key={String(d.id)} className="prj-row" style={{ padding: '5px 14px' }}>
                <FileText size={12} style={{ color: 'var(--pj-gold)', flex: 'none' }} />
                <span className="prj-grow">{d.title || d.file_name}<small style={{ display: 'block', color: 'var(--pj-ink-3)', fontSize: 10.5 }}>{d.uploaded_at ? fmtDate(d.uploaded_at) : ''}{d.category ? ` · ${d.category}` : ''}</small></span>
                {d.external_url
                  ? <a className="prj-btn prj-btn--sm" href={d.external_url} target="_blank" rel="noopener noreferrer">افتح</a>
                  : <button type="button" className="prj-btn prj-btn--sm" onClick={() => openIn({ type: 'doc', id: Number(d.id) })}><Eye size={12} /> معاينة</button>}
              </div>
            ))}
          </div>
        )}
        {tab === 'tasks' && (
          <div>
            {tasks === null && <div className="prj-empty"><Loader2 size={14} className="ssp2-spin" /> جارٍ جلب المهام…</div>}
            {tasks && tasks.length === 0 && <div className="prj-empty">لا مهام على القضية.</div>}
            {tasks?.map((t) => { const st = taskStatus(t.status); return (
              <div key={String(t.id)} className="prj-row prj-row--click" style={{ padding: '5px 14px' }} onClick={() => openIn({ type: 'task', id: Number(t.id) })}>
                <span className={`prj-chk ${t.status === 'completed' ? 'is-done' : ''}`} />
                <span className="prj-grow">{t.title}{t.project ? <small style={{ display: 'block', color: 'var(--pj-ink-3)', fontSize: 10.5 }}>{t.project.code}{t.project_phase ? ` · ${t.project_phase.name}` : ''}</small> : null}</span>
                <Chip tone={st.tone}>{st.label}</Chip>
                {t.dueDate && <span className="when num">{fmtDayMonth(String(t.dueDate))}</span>}
                {t.assignee && <Av name={t.assignee.name} />}
              </div>
            ); })}
          </div>
        )}
        {tab === 'chat' && <div className="prj-panel__chat"><CaseTeamChat caseId={caseId} /></div>}
      </div>
      <div className="prj-panel__foot">
        <Users size={12} />
        <span>ما تراه هنا هو بيانات القضية نفسها. تعديل بياناتها والوكالات وطلبات ناجز والفوترة من صفحة القضية.</span>
      </div>
    </div>
  );
};

export default CasePanel;
