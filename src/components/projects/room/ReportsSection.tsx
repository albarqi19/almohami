import React, { useEffect, useState } from 'react';
import { Check, FileText, History, Loader2, Send, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { ProjectReport, ReportKind } from '../../../types/projects';
import { REPORT_STATUS_LABELS } from '../../../types/projects';
import { Chip, Modal, fmtDayMonth, fmtDateTime } from '../ui';
import { useRoom } from './RoomContext';

const KINDS: Array<{ key: ReportKind; title: string; desc: string }> = [
  { key: 'executive', title: 'التقرير التنفيذي', desc: 'للشريك ومدير المكتب: التقدم، المراحل، المخاطر، التأخير، المسائل، الميزانية، أداء الفريق.' },
  { key: 'weekly', title: 'التقرير الأسبوعي', desc: 'للفريق: ما أنجزناه هذا الأسبوع، ما تأخر، ما القادم، من عليه ماذا.' },
  { key: 'client', title: 'تقرير العميل', desc: 'بلغة العميل: أين وصلنا، المواعيد القادمة، المطلوب منه. يُرسل بعد الموافقة.' },
];

/** التقارير كما في التصوّر: ثلاث بطاقات «أنشئ بمسودة رائد»، ثم التقارير السابقة. رائد يصوغ المسودة من بيانات المشروع. */
const ReportsSection: React.FC = () => {
  const { project, canEdit, canApprove, refresh, consumePending } = useRoom();
  const [items, setItems] = useState<ProjectReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<ProjectReport | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [aiOn, setAiOn] = useState(true);

  const load = async () => { setLoading(true); try { setItems(await ProjectService.reports(project.id)); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الجلب'); } finally { setLoading(false); } };
  useEffect(() => { load(); ProjectService.aiQuota().then((q) => setAiOn(q.enabled && q.remaining > 0)).catch(() => setAiOn(false)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id]);
  useEffect(() => { if (consumePending('report') || consumePending('client_update')) { /* البطاقات ظاهرة أصلاً */ } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  /** أنشئ بمسودة رائد: مسودة من الأرقام ثم تحسين الصياغة برائد إن كان متاحاً */
  const create = async (kind: ReportKind) => {
    setBusy(`create-${kind}`);
    try {
      let r = await ProjectService.createReport(project.id, kind);
      if (aiOn) {
        try { const run = await ProjectService.improveReport(project.id, r.id); const done = await ProjectService.waitForRun(run.id); if (done.status === 'ready') r = await ProjectService.report(project.id, r.id); else toast.warn('أُنشئت المسودة من الأرقام، وتعذر تحسينها برائد الآن.'); }
        catch { toast.warn('أُنشئت المسودة من الأرقام، وتعذر تحسينها برائد الآن.'); }
      }
      await load(); setOpen(r);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الإنشاء'); }
    finally { setBusy(null); }
  };
  const update = async (r: ProjectReport, body: string, title: string) => { try { const saved = await ProjectService.updateReport(project.id, r.id, { body, title }); setOpen(saved); await load(); toast.success('حُفظ'); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحفظ'); } };
  const improve = async (r: ProjectReport) => { setBusy(`improve-${r.id}`); try { const run = await ProjectService.improveReport(project.id, r.id); const done = await ProjectService.waitForRun(run.id); if (done.status === 'failed') { toast.error(done.error || 'تعذر التحسين'); return; } const fresh = await ProjectService.report(project.id, r.id); setOpen(fresh); await load(); toast.success('حسّن رائد الصياغة'); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر التحسين'); } finally { setBusy(null); } };
  const approve = async (r: ProjectReport) => { setBusy(`approve-${r.id}`); try { const saved = await ProjectService.approveReport(project.id, r.id); setOpen(saved); await load(); toast.success('اعتُمد التقرير'); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الاعتماد'); } finally { setBusy(null); } };
  const send = async (r: ProjectReport) => { if (!window.confirm('إرسال التقرير إلى العميل؟ سيظهر في بوابته ويصله إشعار.')) return; setBusy(`send-${r.id}`); try { const res = await ProjectService.sendReport(project.id, r.id); setOpen(res.report); await load(); await refresh(); toast.success(res.message || 'أُرسل'); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الإرسال'); } finally { setBusy(null); } };
  const remove = async (r: ProjectReport) => { if (!window.confirm('حذف التقرير؟')) return; try { await ProjectService.deleteReport(project.id, r.id); setOpen(null); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); } };

  const audience = (r: ProjectReport) => (r.kind === 'client' ? (r.status === 'sent' ? 'أُرسل' : 'للعميل') : r.kind === 'weekly' ? 'للفريق' : 'للشريك');

  return (
    <div className="prj-view">
      <div className="prj-scroll">
        <div className="prj-reps">
          {KINDS.map((k) => (
            <div key={k.key} className="prj-rep">
              <b>{k.title}</b><p>{k.desc}</p>
              {canEdit && <button type="button" className="prj-btn prj-btn--sm" disabled={busy === `create-${k.key}`} onClick={() => create(k.key)}>{busy === `create-${k.key}` ? <Loader2 size={11} className="ssp2-spin" /> : <Sparkles size={11} />} {aiOn ? 'أنشئ بمسودة رائد' : 'أنشئ مسودة'}</button>}
            </div>
          ))}
        </div>
        <div className="prj-card__head"><History size={14} /> التقارير السابقة <span className="prj-cnt num">{items.length}</span></div>
        {loading ? <div className="prj-empty">جارٍ التحميل…</div> : items.length === 0 ? <div className="prj-empty">لا تقارير بعد.</div> : items.map((r) => (
          <div key={r.id} className="prj-row prj-row--click" style={{ padding: '6px 14px' }} onClick={() => setOpen(r)}>
            <span className="prj-grow">{r.title}</span>
            <span className="prj-dim">{r.drafted_by === 'raed' ? 'رائد ثم ' : ''}{r.creator?.name ?? '—'} · {fmtDayMonth(r.sent_at ?? r.approved_at ?? r.created_at)}</span>
            <Chip tone={r.status === 'sent' ? 'done' : r.status === 'approved' ? 'doing' : 'todo'}>{r.status === 'draft' ? 'مسودة' : audience(r)}</Chip>
          </div>
        ))}
      </div>
      {open && <ReportModal report={open} canEdit={canEdit} canApprove={canApprove} busy={busy} onClose={() => setOpen(null)} onSave={(b, t) => update(open, b, t)} onImprove={() => improve(open)} onApprove={() => approve(open)} onSend={() => send(open)} onDelete={() => remove(open)} />}
    </div>
  );
};

const ReportModal: React.FC<{ report: ProjectReport; canEdit: boolean; canApprove: boolean; busy: string | null; onClose: () => void; onSave: (body: string, title: string) => Promise<void>; onImprove: () => void; onApprove: () => void; onSend: () => void; onDelete: () => void }> = ({ report, canEdit, canApprove, busy, onClose, onSave, onImprove, onApprove, onSend, onDelete }) => {
  const [body, setBody] = useState(report.body);
  const [title, setTitle] = useState(report.title);
  const [editing, setEditing] = useState(false);
  useEffect(() => { setBody(report.body); setTitle(report.title); }, [report]);
  const editable = canEdit && report.status === 'draft';
  return (
    <Modal title={<span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><FileText size={14} /> {report.kind_label} <Chip tone={report.status === 'sent' ? 'done' : report.status === 'approved' ? 'doing' : 'todo'}>{REPORT_STATUS_LABELS[report.status]}</Chip></span>} onClose={onClose} wide foot={<>
      {editable && <button type="button" className="prj-btn prj-btn--danger" style={{ marginInlineEnd: 'auto' }} onClick={onDelete}><Trash2 size={12} /> حذف</button>}
      {editable && !editing && <button type="button" className="prj-btn" onClick={() => setEditing(true)}>تحرير النص</button>}
      {editable && editing && <button type="button" className="prj-btn" onClick={async () => { await onSave(body, title); setEditing(false); }}>حفظ النص</button>}
      {editable && <button type="button" className="prj-btn" disabled={busy === `improve-${report.id}`} onClick={onImprove}>{busy === `improve-${report.id}` ? <Loader2 size={12} className="ssp2-spin" /> : <Sparkles size={12} />} حسّن الصياغة برائد</button>}
      {report.status === 'draft' && canApprove && <button type="button" className="prj-btn prj-btn--primary" disabled={busy === `approve-${report.id}`} onClick={onApprove}><Check size={12} /> اعتماد</button>}
      {report.status === 'approved' && report.kind === 'client' && canEdit && <button type="button" className="prj-btn prj-btn--primary" disabled={busy === `send-${report.id}`} onClick={onSend}><Send size={12} /> إرسال للعميل</button>}
      <button type="button" className="prj-btn" onClick={onClose}>إغلاق</button>
    </>}>
      {editing ? (
        <div className="prj-form">
          <label className="prj-field prj-form__full"><span>العنوان</span><input className="prj-in" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <div className="prj-report-body prj-form__full"><textarea className="prj-in" value={body} onChange={(e) => setBody(e.target.value)} /></div>
        </div>
      ) : (
        <>
          <h3 style={{ margin: 0, fontSize: 15, color: 'var(--pj-navy)' }}>{report.title}</h3>
          <div className="prj-dim" style={{ fontSize: 11.5 }}>{report.period_label}{report.drafted_by === 'raed' ? ' · صاغه رائد' : ''}{report.approver ? ` · اعتمده ${report.approver.name}` : ''}{report.sent_at ? ` · أُرسل ${fmtDateTime(report.sent_at)}` : ''}</div>
          <div className="prj-report-body">{report.body}</div>
        </>
      )}
    </Modal>
  );
};

export default ReportsSection;
