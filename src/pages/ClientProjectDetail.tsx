import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, Check, ChevronRight, FolderKanban, Upload, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { ClientProjectService } from '../services/projectService';
import type { ClientProjectView } from '../types/projects';
import { DELIVERABLE_STATUS_LABELS, MILESTONE_STATUS_LABELS, PHASE_STATUS_LABELS } from '../types/projects';
import { Chip, Field, Modal, fmtDate, fmtDayMonth } from '../components/projects/ui';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (بدائيّات cx-* + prj-*)

/** صفحة المشروع للعميل: كما يراها في التصوّر (مسار المراحل، مطلوب منكم، المواعيد، المخرجات، الاجتماعات، التقارير). */
const ClientProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const [data, setData] = useState<ClientProjectView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadTask, setUploadTask] = useState<number | null>(null);
  const [approve, setApprove] = useState<{ id: number; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { try { setData(await ClientProjectService.get(id)); setError(null); } catch (e) { setError(e instanceof Error ? e.message : 'تعذر فتح المشروع'); } finally { setLoading(false); } }, [id]);
  useEffect(() => { load(); }, [load]);

  const upload = async (taskId: number, file: File) => { setBusy(true); try { const msg = await ClientProjectService.upload(id, taskId, file); toast.success(msg); setUploadTask(null); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الرفع'); } finally { setBusy(false); } };
  const decide = async (ok: boolean, note?: string) => { if (!approve) return; setBusy(true); try { const msg = await ClientProjectService.approveDeliverable(id, approve.id, ok, note); toast.success(msg); setApprove(null); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر التسجيل'); } finally { setBusy(false); } };

  const currentIdx = data?.phases.findIndex((p) => p.is_current) ?? -1;
  const openTasks = data?.tasks.filter((t) => t.status === 'open') ?? [];

  return (
    <div className="cx-page prj-scope" dir="rtl">
      <div className="cx-header">
        <div className="cx-header__title">
          <div className="cx-header__icon"><FolderKanban size={20} /></div>
          <div>
            <h1 className="cx-header__h1">{data?.project.name ?? 'المشروع'}</h1>
            <p className="cx-header__sub">{data ? `${data.project.code} · ${data.project.status_label}${data.project.manager_name ? ` · يديره ${data.project.manager_name}` : ''}${data.phases.length ? ` · المرحلة ${currentIdx >= 0 ? currentIdx + 1 : '—'} من ${data.phases.length}` : ''}` : ''}</p>
          </div>
        </div>
        <Link to="/my-projects" className="cx-back"><ChevronRight size={16} /> كل مشاريعي</Link>
      </div>
      <div className="cx-content">
        {loading ? <div className="cx-skeleton" aria-busy="true"><div className="cx-skeleton__row" /><div className="cx-skeleton__row" /></div>
          : error || !data ? <div className="cx-error" role="alert"><AlertCircle size={16} /><span>{error || 'المشروع غير موجود'}</span></div>
          : (
            <>
              {data.phases.length > 0 && (
                <div className="prj-pcard" style={{ marginBottom: 12 }}>
                  <div className="prj-pcard__b" style={{ padding: 0 }}>
                    <div className="prj-ptrack">
                      {data.phases.map((p) => (
                        <div key={p.id} className={`prj-pstep ${p.status === 'completed' ? 'is-done' : ''} ${p.is_current ? 'is-cur' : ''}`}>
                          <b>{p.status === 'completed' ? '✓ ' : ''}{p.name}</b>
                          <span>{p.status === 'completed' ? `اكتملت ${fmtDayMonth(p.due_date)}` : p.is_current ? 'الجارية الآن' : `${PHASE_STATUS_LABELS[p.status]} · ${fmtDayMonth(p.start_date)}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="cx-kpis">
                <div className="cx-kpi"><div className="cx-kpi__label">التقدم</div><div className="cx-kpi__value">{data.project.progress}٪</div><div className="cx-bar"><div className="cx-bar__fill" style={{ width: `${data.project.progress}%` }} /></div></div>
                <div className="cx-kpi"><div className="cx-kpi__label">مطلوب منكم</div><div className="cx-kpi__value">{openTasks.length}</div></div>
                <div className="cx-kpi"><div className="cx-kpi__label">بدأ</div><div className="cx-kpi__value" style={{ fontSize: 15 }}>{fmtDate(data.project.start_date)}</div></div>
                <div className="cx-kpi"><div className="cx-kpi__label">الموعد النهائي المتوقع</div><div className="cx-kpi__value" style={{ fontSize: 15 }}>{fmtDate(data.project.target_end_date)}</div></div>
              </div>

              <div className="cx-grid">
                <div className="cx-panel cx-panel--wide">
                  <div className="cx-panel__head">مطلوب منكم <em>{openTasks.length}</em></div>
                  <div className="cx-panel__body">
                    {data.tasks.length === 0 && data.deliverables.filter((d) => d.can_approve).length === 0 ? <div className="cx-panel__empty">لا شيء مطلوب منكم الآن.</div> : null}
                    {data.tasks.map((t) => (
                      <div key={t.id} className="prj-client-task">
                        <div className="prj-client-task__title">{t.title}{t.description && <small>{t.description}</small>}<small>{t.status === 'done' ? 'تم' : `${t.is_late ? 'كان الموعد' : 'الموعد'}: ${fmtDate(t.due_date)}`}</small></div>
                        <Chip tone={t.status === 'done' ? 'done' : t.is_late ? 'late' : 'client'}>{t.status === 'done' ? 'تم' : t.is_late ? 'متأخر' : 'مطلوب'}</Chip>
                        {t.can_upload && <button type="button" className="prj-client-file" onClick={() => setUploadTask(t.id)}><Upload size={13} /> رفع الملفات</button>}
                      </div>
                    ))}
                    {data.deliverables.filter((d) => d.can_approve).map((d) => (
                      <div key={`d${d.id}`} className="prj-client-task">
                        <div className="prj-client-task__title">الموافقة على «{d.name}»<small>{d.type_label}{d.version ? ` · النسخة ${d.version}` : ''}</small></div>
                        <button type="button" className="prj-client-file" onClick={() => setApprove({ id: d.id, name: d.name })}><Check size={13} /> مراجعة والموافقة</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="cx-panel">
                  <div className="cx-panel__head">المواعيد الرئيسية <em>{data.milestones.length}</em></div>
                  <div className="cx-panel__body">
                    {data.milestones.length === 0 ? <div className="cx-panel__empty">لا مواعيد ظاهرة.</div> : data.milestones.map((m) => (
                      <div key={m.id} className={`prj-msrow prj-msrow--${m.status}`}><span className="prj-msrow__date">{fmtDate(m.date)}</span><span className="prj-msrow__name">{m.name}{m.is_estimate && <div className="prj-dim">موعد تقديري قد يتغير</div>}{m.from_court && <div className="prj-dim">من المحكمة</div>}</span><Chip tone={m.status === 'done' ? 'done' : m.status === 'missed' ? 'late' : 'todo'}>{MILESTONE_STATUS_LABELS[m.status]}</Chip></div>
                    ))}
                  </div>
                </div>

                <div className="cx-panel">
                  <div className="cx-panel__head">المخرجات <em>{data.deliverables.length}</em></div>
                  <div className="cx-panel__body">
                    {data.deliverables.length === 0 ? <div className="cx-panel__empty">لا مخرجات ظاهرة.</div> : data.deliverables.map((d) => (
                      <div key={d.id} className="prj-msrow"><span className="prj-msrow__date">{fmtDate(d.due_date)}</span><span className="prj-msrow__name">{d.name}<div className="prj-dim">{d.type_label}{d.version ? ` · النسخة ${d.version}` : ''}</div></span><Chip tone={d.status === 'final' || d.status === 'submitted' ? 'done' : d.client_step === 'current' ? 'client' : 'todo'}>{d.client_step === 'current' ? 'بانتظار موافقتكم' : DELIVERABLE_STATUS_LABELS[d.status]}</Chip></div>
                    ))}
                  </div>
                </div>

                {data.meetings.length > 0 && (
                  <div className="cx-panel">
                    <div className="cx-panel__head">اجتماعاتكم القادمة <em>{data.meetings.length}</em></div>
                    <div className="cx-panel__body">{data.meetings.map((m) => <div key={m.id} className="prj-msrow"><span className="prj-msrow__date">{fmtDate(m.date)}</span><span className="prj-msrow__name">{m.name}</span><span /></div>)}</div>
                  </div>
                )}

                {data.reports.length > 0 && (
                  <div className="cx-panel cx-panel--wide">
                    <div className="cx-panel__head">تقارير المكتب <em>{data.reports.length}</em></div>
                    <div className="cx-panel__body">{data.reports.map((r) => <div key={r.id} style={{ marginBottom: 14 }}><b>{r.title}</b> <span className="prj-dim">{fmtDate(r.sent_at)}</span><div className="prj-report-body">{r.body}</div></div>)}</div>
                  </div>
                )}
              </div>
            </>
          )}
      </div>

      {uploadTask !== null && (
        <Modal title="رفع ملف للمكتب" onClose={() => setUploadTask(null)}>
          <p className="prj-dim" style={{ margin: 0, fontSize: 12 }}>يصل الملف إلى فريق المشروع مباشرة ويُسجل على المهمة المطلوبة منكم.</p>
          <input type="file" className="prj-in" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(uploadTask, f); }} />
        </Modal>
      )}
      {approve && <ApproveModal name={approve.name} busy={busy} onClose={() => setApprove(null)} onDecide={decide} />}
    </div>
  );
};

const ApproveModal: React.FC<{ name: string; busy: boolean; onClose: () => void; onDecide: (ok: boolean, note?: string) => void }> = ({ name, busy, onClose, onDecide }) => {
  const [note, setNote] = useState('');
  return (
    <Modal title={`موافقتكم على «${name}»`} onClose={onClose} foot={<>
      <button type="button" className="prj-btn prj-btn--danger" disabled={busy} onClick={() => { if (!note.trim()) { toast.error('اكتبوا ما تريدون تعديله'); return; } onDecide(false, note.trim()); }}><X size={12} /> طلب تعديل</button>
      <button type="button" className="prj-btn prj-btn--primary" disabled={busy} onClick={() => onDecide(true, note.trim() || undefined)}><Check size={12} /> موافق</button>
    </>}>
      <p className="prj-dim" style={{ margin: 0, fontSize: 12, lineHeight: 1.7 }}>الموافقة تنقل المستند إلى الخطوة التالية. طلب التعديل يعيده للمكتب مع ملاحظتكم.</p>
      <Field label="ملاحظة"><textarea className="prj-in" rows={3} style={{ minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </Modal>
  );
};

export default ClientProjectDetail;
