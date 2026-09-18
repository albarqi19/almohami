import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, FileText, Gavel, Loader2, PenLine, Plus, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import { CaseSessionService } from '../../../../services/caseSessionService';
import type { SessionDetail } from '../../../../services/caseSessionService';
import { SessionPrepService } from '../../../../services/sessionPrepService';
import type { SessionPreparation } from '../../../../services/sessionPrepService';
import { Chip, daysFromToday, fmtDate, fmtDateTime } from '../../ui';
import { useRoom } from '../RoomContext';

const sessionDate = (s: SessionDetail): string | null => {
  const g = s.session_date_gregorian as unknown as string | Date | null | undefined;
  if (g) return g instanceof Date ? g.toISOString() : String(g);
  return s.session_date ?? null;
};

/**
 * لوحة الجلسة داخل الغرفة: الموعد والمحكمة، قائمة التحضير، الضبط والنتيجة، وإفادة المكتب بقلم المحامي.
 * جلسات ناجز موعدها يتحدث تلقائياً؛ رفيق الجلسة والتقارير في صفحتهما.
 */
const SessionPanel: React.FC<{ sessionId: number; onTitle: (title: string) => void }> = ({ sessionId, onTitle }) => {
  const { openIn, canEdit } = useRoom();
  const navigate = useNavigate();
  const [s, setS] = useState<SessionDetail | null>(null);
  const [preps, setPreps] = useState<SessionPreparation[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statement, setStatement] = useState('');
  const [newPrep, setNewPrep] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const onTitleRef = useRef(onTitle);
  onTitleRef.current = onTitle;

  const load = async () => {
    try {
      const d = await CaseSessionService.get(sessionId);
      setS(d); setStatement(d.office_statement ?? ''); setError(null);
      onTitleRef.current(`${d.session_type || 'جلسة'} ${fmtDate(sessionDate(d))}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر فتح الجلسة'); }
  };
  const loadPreps = async () => { try { const r = await SessionPrepService.getPreparations(sessionId); setPreps(r.items); setProgress(r.progress); } catch { setPreps([]); } };
  useEffect(() => { setS(null); load(); loadPreps(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sessionId]);

  const run = async (key: string, fn: () => Promise<unknown>, okMsg?: string, after?: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); if (okMsg) toast.success(okMsg); await (after ? after() : load()); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر التنفيذ'); }
    finally { setBusy(null); }
  };

  if (error) return <div className="prj-panel"><div className="prj-panel__body"><div className="prj-error" style={{ margin: 14 }}>{error}</div></div></div>;
  if (!s) return <div className="prj-panel"><div className="prj-panel__body"><div className="prj-empty"><Loader2 size={14} className="ssp2-spin" /> جارٍ فتح الجلسة…</div></div></div>;

  const date = sessionDate(s);
  const d = daysFromToday(date);
  const ended = !!s.has_ended;
  const dirty = statement.trim() !== (s.office_statement ?? '').trim();

  return (
    <div className="prj-panel">
      <div className="prj-panel__head">
        <div className="prj-panel__title">
          <span className="prj-badge">جلسة</span>
          <h2>{s.session_type || 'جلسة'} · {fmtDate(date)}{s.session_time ? ` · ${s.session_time}` : ''}</h2>
          <Chip tone={ended ? 'done' : 'warn'}>{ended ? 'انعقدت' : d ? d.label : 'قادمة'}</Chip>
          {s.source === 'najiz' || s.source === 'najiz_import' ? <Chip tone="raed"><Sparkles size={10} /> من ناجز</Chip> : null}
          {s.case_access_revoked && <Chip tone="late">القضية انقطعت في ناجز</Chip>}
        </div>
        <div className="prj-panel__sub">
          {s.case && <span>القضية <button type="button" className="prj-link" onClick={() => openIn({ type: 'case', id: Number(s.case!.id) })}>{s.case.file_number ? `${s.case.file_number} · ` : ''}{s.case.title}</button></span>}
          {(s.court || s.department) && <span>{[s.court, s.department].filter(Boolean).join(' · ')}</span>}
          {(s.method || s.location) && <span>{[s.method, s.location].filter(Boolean).join(' · ')}</span>}
        </div>
      </div>
      <div className="prj-panel__acts">
        {!s.case_access_revoked && <button type="button" className="prj-btn prj-btn--sm prj-btn--primary" onClick={() => navigate(`/sessions/${sessionId}/prep`)}><Sparkles size={12} /> رفيق الجلسة</button>}
        {s.can_mark_ended && canEdit && <button type="button" className="prj-btn prj-btn--sm" disabled={busy !== null} onClick={() => run('end', () => CaseSessionService.markEnded(sessionId), 'عُلّمت الجلسة منتهية')}><Check size={12} /> انتهت الجلسة</button>}
        {s.motions_count != null && s.motions_count > 0 && <span className="prj-dim" style={{ fontSize: 11 }}>الطلبات: {s.ready_motions_count ?? 0} من {s.motions_count} جاهزة</span>}
      </div>
      <div className="prj-panel__body">
        <section className="prj-sec">
          <div className="prj-sec__head"><Check size={13} /> التحضير <span className="prj-cnt num">{preps.filter((p) => p.is_completed).length} من {preps.length}{preps.length ? ` · ${progress}٪` : ''}</span></div>
          {preps.length === 0 && <div className="prj-empty">لا قائمة تحضير بعد.{canEdit ? ' أضف بنداً، أو استورد القائمة الافتراضية من رفيق الجلسة.' : ''}</div>}
          {preps.map((p) => (
            <div key={p.id} className={`prj-row ${p.is_completed ? 'is-done' : ''}`} style={{ padding: '5px 14px' }}>
              <button type="button" className={`prj-chk ${p.is_completed ? 'is-done' : ''}`} disabled={!canEdit || busy !== null} onClick={() => run(`p${p.id}`, () => SessionPrepService.togglePreparation(sessionId, p.id), undefined, loadPreps)}><Check size={10} /></button>
              <span className="prj-grow" style={p.is_completed ? { color: 'var(--pj-ink-3)', textDecoration: 'line-through' } : undefined}>{p.title}{p.notes ? <small style={{ display: 'block', color: 'var(--pj-ink-3)', fontSize: 10.5 }}>{p.notes}</small> : null}</span>
            </div>
          ))}
          {canEdit && !ended && (
            <div style={{ display: 'flex', gap: 6, padding: '6px 14px' }}>
              <input className="prj-in" value={newPrep} onChange={(e) => setNewPrep(e.target.value)} placeholder="بند تحضير جديد…" onKeyDown={(e) => { if (e.key === 'Enter' && newPrep.trim()) run('addp', () => SessionPrepService.createPreparation(sessionId, { title: newPrep.trim() }), undefined, async () => { setNewPrep(''); await loadPreps(); }); }} />
              <button type="button" className="prj-btn prj-btn--sm" disabled={!newPrep.trim() || busy !== null} onClick={() => run('addp', () => SessionPrepService.createPreparation(sessionId, { title: newPrep.trim() }), undefined, async () => { setNewPrep(''); await loadPreps(); })}><Plus size={12} /> أضف</button>
            </div>
          )}
        </section>

        {(s.session_text || s.session_judgement || s.result) && (
          <section className="prj-sec">
            <div className="prj-sec__head"><Gavel size={13} /> {s.session_judgement ? 'قرار الجلسة' : 'الضبط والنتيجة'}</div>
            <div className="prj-sec__body">
              {s.session_judgement && <p style={{ margin: '0 0 6px', whiteSpace: 'pre-wrap', color: 'var(--pj-ink)' }}>{s.session_judgement}</p>}
              {s.result && <p style={{ margin: '0 0 6px', whiteSpace: 'pre-wrap' }}>{s.result}</p>}
              {s.session_text && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{s.session_text}</p>}
            </div>
          </section>
        )}

        <section className="prj-sec">
          <div className="prj-sec__head"><PenLine size={13} /> إفادة المكتب عن الجلسة {s.office_statement_at && <span className="prj-cnt">آخر حفظ {fmtDateTime(s.office_statement_at)}</span>}</div>
          <div className="prj-sec__body">
            <textarea className="prj-in" rows={4} value={statement} disabled={!canEdit} onChange={(e) => setStatement(e.target.value)} placeholder="ما حدث في الجلسة بقلمك: ما قررته الدائرة، ما طُلب منا، الموعد التالي… تدخل الخط الزمني وتقرير العميل" />
            {canEdit && <div style={{ display: 'flex', gap: 6, marginTop: 6 }}><button type="button" className="prj-btn prj-btn--sm prj-btn--primary" disabled={!dirty || busy !== null} onClick={() => run('stmt', () => CaseSessionService.saveOfficeStatement(sessionId, statement.trim()), 'حُفظت الإفادة')}>{busy === 'stmt' ? <Loader2 size={12} className="ssp2-spin" /> : <Check size={12} />} حفظ الإفادة</button></div>}
          </div>
        </section>

        {s.notes && <section className="prj-sec" style={{ borderBottom: 0 }}><div className="prj-sec__head"><FileText size={13} /> ملاحظات</div><div className="prj-sec__body"><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{s.notes}</p></div></section>}
      </div>
      <div className="prj-panel__foot"><span>{s.source === 'manual' ? 'جلسة يدوية. تعديل موعدها من صفحة الجلسات.' : 'جلسة من ناجز. موعدها يتحدث تلقائياً، وإفادة المكتب تُكتب هنا.'}</span></div>
    </div>
  );
};

export default SessionPanel;
