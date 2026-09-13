import React, { useEffect, useState } from 'react';
import { Bot, Loader2, Send } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { AiAskResult, AiRun } from '../../../types/projects';
import { Chip, fmtDateTime } from '../ui';
import { useRoom } from './RoomContext';

const SUGGESTIONS = [
  'ما الذي يحتاج انتباهي هذا الأسبوع؟',
  'أين نحن من الخطة ولماذا تأخرنا؟',
  'ما المهام المتأخرة ومن المسؤول عنها؟',
  'ما القرارات المعلقة التي تنتظر الشريك؟',
  'ما المخاطر العالية وما إجراءاتها الوقائية؟',
  'ما الذي تنتظره الجلسة القادمة منا؟',
];

/** اسأل رائد عن المشروع: يجيب من بيانات المشروع نفسها (المراحل والمهام والسجلات والخط الزمني) ويذكر مصادره. */
const AskSection: React.FC<{ quota: { remaining: number; cap: number; enabled: boolean } | null }> = ({ quota }) => {
  const { project, goTo, openTask } = useRoom();
  const [runs, setRuns] = useState<AiRun[]>([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => { try { setRuns(await ProjectService.asks(project.id)); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الجلب'); } };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id]);

  const ask = async (q?: string) => {
    const text = (q ?? question).trim();
    if (!text) return;
    setBusy(true);
    setQuestion('');
    try {
      const run = await ProjectService.ask(project.id, text);
      setRuns([run, ...runs]);
      const done = await ProjectService.waitForRun(run.id, (r) => setRuns((prev) => prev.map((x) => (x.id === r.id ? r : x))));
      if (done.status === 'failed') toast.error(done.error || 'تعذر الجواب');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر السؤال'); }
    finally { setBusy(false); }
  };

  const openSource = (s: { type: string; id: number | null }) => {
    if (s.type === 'task' && s.id) return openTask(s.id);
    if (s.type === 'phase') return goTo('phases');
    if (s.type === 'milestone' || s.type === 'session') return goTo('timeline');
    if (s.type === 'issue') return goTo('issues');
    if (s.type === 'risk') return goTo('risks');
    if (s.type === 'decision') return goTo('decisions');
    if (s.type === 'deliverable') return goTo('deliverables');
  };

  const disabled = !!quota && (!quota.enabled || quota.remaining <= 0);

  return (
    <div>
      <div className="prj-notice" style={{ marginBottom: 10 }}>
        <Bot size={13} /> رائد يجيب من بيانات هذا المشروع فقط، ولا يعطي رأياً قانونياً. {quota ? `المتبقي اليوم للمكتب: ${quota.remaining} من ${quota.cap}.` : ''}
        {quota && !quota.enabled && ' الذكاء غير مفعل لهذا المكتب.'}
      </div>
      <div className="prj-suggest">
        {SUGGESTIONS.map((s) => <button type="button" key={s} onClick={() => ask(s)} disabled={busy || disabled}>{s}</button>)}
      </div>
      <div className="prj-compose" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0, marginBottom: 12 }}>
        <textarea className="ssp2-input" rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="اسأل عن المشروع…" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }} disabled={disabled} />
        <button type="button" className="ssp2-btn ssp2-btn--primary" onClick={() => ask()} disabled={busy || disabled || !question.trim()}>{busy ? <Loader2 size={13} className="ssp2-spin" /> : <Send size={13} />} اسأل</button>
      </div>
      <div className="prj-chat">
        {runs.length === 0 && <div className="ssp2-empty">لم تسأل بعد.</div>}
        {runs.map((r) => {
          const result = r.status === 'ready' ? (r.result as unknown as AiAskResult) : null;
          return (
            <div key={r.id} className="prj-msg prj-msg--raed">
              <div className="prj-ask-q">{r.input?.question}</div>
              <div className="prj-msg__head"><b>رائد</b><span>{fmtDateTime(r.finished_at ?? r.created_at)}</span>{r.model && <span className="prj-muted">{r.model}</span>}</div>
              {r.status === 'queued' || r.status === 'running' ? <div className="prj-muted"><Loader2 size={12} className="ssp2-spin" /> يقرأ المشروع ويجيب…</div>
                : r.status === 'failed' ? <div className="prj-error">{r.error || 'تعذر الجواب'}</div>
                : <>
                  <div className="prj-msg__body">{result?.answer}</div>
                  {result && result.sources.length > 0 && (
                    <div className="prj-msg__sources">
                      <span className="prj-muted">المصادر:</span>
                      {result.sources.map((s, i) => <Chip key={i} tone="muted" onClick={() => openSource(s)}>{s.label}</Chip>)}
                    </div>
                  )}
                </>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AskSection;
