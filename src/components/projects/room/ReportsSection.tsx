import React, { useEffect, useState } from 'react';
import { Check, FileText, Loader2, Plus, Send, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { ProjectReport, ReportKind } from '../../../types/projects';
import { REPORT_KIND_LABELS, REPORT_STATUS_LABELS } from '../../../types/projects';
import { Chip, Modal, fmtDateTime } from '../ui';
import { useRoom } from './RoomContext';

/** التقارير: مسودة من بيانات المشروع (تنفيذي/أسبوعي/للعميل)، يحسنها رائد، تُعتمد، ثم تُرسل للعميل إن كانت له. */
const ReportsSection: React.FC = () => {
  const { project, canEdit, canApprove, refresh } = useRoom();
  const [items, setItems] = useState<ProjectReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<ProjectReport | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setItems(await ProjectService.reports(project.id)); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الجلب'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id]);

  const create = async (kind: ReportKind) => {
    setBusy(`create-${kind}`);
    try { const r = await ProjectService.createReport(project.id, kind); toast.success('أُنشئت المسودة'); await load(); setOpen(r); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الإنشاء'); }
    finally { setBusy(null); }
  };

  const update = async (r: ProjectReport, body: string, title: string) => {
    try { const saved = await ProjectService.updateReport(project.id, r.id, { body, title }); setOpen(saved); await load(); toast.success('حُفظ'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحفظ'); }
  };

  const improve = async (r: ProjectReport) => {
    setBusy(`improve-${r.id}`);
    try {
      const run = await ProjectService.improveReport(project.id, r.id);
      const done = await ProjectService.waitForRun(run.id);
      if (done.status === 'failed') { toast.error(done.error || 'تعذر التحسين'); return; }
      const fresh = await ProjectService.report(project.id, r.id);
      setOpen(fresh); await load(); toast.success('حسّن رائد الصياغة');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر التحسين'); }
    finally { setBusy(null); }
  };

  const approve = async (r: ProjectReport) => {
    setBusy(`approve-${r.id}`);
    try { const saved = await ProjectService.approveReport(project.id, r.id); setOpen(saved); await load(); toast.success('اعتُمد التقرير'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الاعتماد'); }
    finally { setBusy(null); }
  };

  const send = async (r: ProjectReport) => {
    if (!window.confirm('إرسال التقرير إلى العميل؟ سيظهر في بوابته ويصله إشعار.')) return;
    setBusy(`send-${r.id}`);
    try { const res = await ProjectService.sendReport(project.id, r.id); setOpen(res.report); await load(); await refresh(); toast.success(res.message || 'أُرسل'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الإرسال'); }
    finally { setBusy(null); }
  };

  const remove = async (r: ProjectReport) => {
    if (!window.confirm('حذف التقرير؟')) return;
    try { await ProjectService.deleteReport(project.id, r.id); setOpen(null); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحذف'); }
  };

  return (
    <div>
      <div className="prj-main__tools" style={{ justifyContent: 'flex-start', marginBottom: 10 }}>
        {canEdit && (Object.keys(REPORT_KIND_LABELS) as ReportKind[]).map((k) => (
          <button type="button" key={k} className="ssp2-btn" disabled={busy === `create-${k}`} onClick={() => create(k)}>{busy === `create-${k}` ? <Loader2 size={12} className="ssp2-spin" /> : <Plus size={12} />} {REPORT_KIND_LABELS[k]}</button>
        ))}
        <span className="prj-muted">المسودة تُبنى من أرقام المشروع الحقيقية. تقرير العميل لا يذكر الساعات ولا المخاطر الداخلية.</span>
      </div>
      {loading ? <div className="prj-muted">جارٍ التحميل…</div> : (
        <div className="prj-block prj-block__body--flush">
          <div className="prj-table-wrap"><table className="prj-table">
            <thead><tr><th>التقرير</th><th>النوع</th><th>الحالة</th><th>الصياغة</th><th>أنشأه</th><th>اعتُمد</th><th>أُرسل</th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={7} className="muted">لا تقارير بعد.</td></tr>}
              {items.map((r) => (
                <tr key={r.id} className="prj-clickable" onClick={() => setOpen(r)}>
                  <td><b>{r.title}</b>{r.period_label && <div className="muted">{r.period_label}</div>}</td>
                  <td className="muted">{r.kind_label}</td>
                  <td><Chip tone={r.status === 'sent' ? 'done' : r.status === 'approved' ? 'navy' : 'muted'}>{REPORT_STATUS_LABELS[r.status]}</Chip></td>
                  <td>{r.drafted_by === 'raed' ? <Chip tone="gold"><Sparkles size={10} /> رائد</Chip> : <span className="muted">يدوية</span>}</td>
                  <td className="muted">{r.creator?.name ?? '—'}</td>
                  <td className="muted">{r.approver ? `${r.approver.name} · ${fmtDateTime(r.approved_at)}` : '—'}</td>
                  <td className="muted">{r.sent_at ? fmtDateTime(r.sent_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
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
    <Modal title={<span className="prj-inline"><FileText size={14} /> {report.kind_label} <Chip tone={report.status === 'sent' ? 'done' : report.status === 'approved' ? 'navy' : 'muted'}>{REPORT_STATUS_LABELS[report.status]}</Chip></span>} onClose={onClose} wide foot={<>
      {editable && <button type="button" className="ssp2-btn" style={{ marginInlineEnd: 'auto', color: 'var(--status-red)' }} onClick={onDelete}><Trash2 size={12} /> حذف</button>}
      {editable && !editing && <button type="button" className="ssp2-btn" onClick={() => setEditing(true)}>تحرير النص</button>}
      {editable && editing && <button type="button" className="ssp2-btn" onClick={async () => { await onSave(body, title); setEditing(false); }}>حفظ النص</button>}
      {editable && <button type="button" className="ssp2-btn" disabled={busy === `improve-${report.id}`} onClick={onImprove}>{busy === `improve-${report.id}` ? <Loader2 size={12} className="ssp2-spin" /> : <Sparkles size={12} />} حسّن الصياغة برائد</button>}
      {report.status === 'draft' && canApprove && <button type="button" className="ssp2-btn ssp2-btn--primary" disabled={busy === `approve-${report.id}`} onClick={onApprove}><Check size={12} /> اعتماد</button>}
      {report.status === 'approved' && report.kind === 'client' && canEdit && <button type="button" className="ssp2-btn ssp2-btn--primary" disabled={busy === `send-${report.id}`} onClick={onSend}><Send size={12} /> إرسال للعميل</button>}
      <button type="button" className="ssp2-btn" onClick={onClose}>إغلاق</button>
    </>}>
      {editing ? (
        <div className="prj-form">
          <label className="prj-field prj-form__full"><span className="ssp2-label">العنوان</span><input className="ssp2-input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <div className="prj-report-body prj-form__full"><textarea className="ssp2-input" value={body} onChange={(e) => setBody(e.target.value)} /></div>
        </div>
      ) : (
        <>
          <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>{report.title}</h3>
          <div className="prj-muted" style={{ marginBottom: 8 }}>{report.period_label}{report.drafted_by === 'raed' ? ' · صاغه رائد' : ''}{report.approver ? ` · اعتمده ${report.approver.name}` : ''}{report.sent_at ? ` · أُرسل ${fmtDateTime(report.sent_at)}` : ''}</div>
          <div className="prj-report-body">{report.body}</div>
        </>
      )}
    </Modal>
  );
};

export default ReportsSection;
