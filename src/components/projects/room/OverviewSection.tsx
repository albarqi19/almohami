import React, { useEffect, useState } from 'react';
import { AlertTriangle, Info, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { ProjectOverview } from '../../../types/projects';
import { PHASE_STATUS_LABELS } from '../../../types/projects';
import { Bar, Chip, HealthChip, daysFromToday, fmtDate, fmtDateTime, num } from '../ui';
import { useRoom } from './RoomContext';

/** الشاشة الأولى: الأرقام التي تهم، ما يحتاج انتباهاً، القادم، المرحلة الجارية، والملخص. */
const OverviewSection: React.FC<{ overview: ProjectOverview | null; reload: () => Promise<void> }> = ({ overview, reload }) => {
  const { project, canEdit, goTo, openTask, refresh } = useRoom();
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [decideBusy, setDecideBusy] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { void tick; }, [tick]);

  const refreshSummary = async () => {
    setSummaryBusy(true);
    try {
      const run = await ProjectService.refreshSummary(project.id);
      const done = await ProjectService.waitForRun(run.id);
      if (done.status === 'failed') toast.error(done.error || 'تعذر تحديث الملخص');
      await reload();
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'تعذر تحديث الملخص');
    } finally {
      setSummaryBusy(false);
    }
  };

  const decide = async (pointId: number, optionKey: string) => {
    setDecideBusy(pointId);
    try {
      const res = await ProjectService.decide(project.id, pointId, optionKey);
      toast.success(res.message || 'سُجل القرار');
      await refresh();
      await reload();
      setTick((t) => t + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'تعذر تسجيل القرار');
    } finally {
      setDecideBusy(null);
    }
  };

  if (!overview) return <div className="prj-muted">جارٍ التحميل…</div>;
  const n = overview.numbers;
  const pendingPoints = project.decision_points.filter((dp) => !dp.chosen_key && project.phases.find((p) => p.id === dp.after_phase_id)?.status === 'completed');

  return (
    <div>
      <div className="prj-block">
        <div className="prj-block__head"><Sparkles size={14} /> ملخص الحالة
          <Chip tone={overview.summary_source === 'ai' ? 'gold' : 'muted'}>{overview.summary_source === 'ai' ? `رائد · ${fmtDateTime(overview.ai_summary_at)}` : 'تلقائي'}</Chip>
          <div className="prj-block__tools">
            {canEdit && (
              <button type="button" className="ssp2-btn" style={{ padding: '3px 9px', fontSize: 11.5 }} onClick={refreshSummary} disabled={summaryBusy}>
                {summaryBusy ? <Loader2 size={12} className="ssp2-spin" /> : <RefreshCw size={12} />} اطلب ملخص رائد
              </button>
            )}
          </div>
        </div>
        <div className="prj-block__body" style={{ fontSize: 13, lineHeight: 1.9, whiteSpace: 'pre-line' }}>{overview.summary}</div>
      </div>

      {pendingPoints.map((dp) => (
        <div key={dp.id} className="prj-decision-point">
          <div className="prj-decision-point__q">نقطة قرار بعد «{dp.after_phase_name}»: {dp.question}</div>
          <div className="prj-decision-point__opts">
            {dp.options.map((o) => (
              <button type="button" key={o.key} className="ssp2-btn" disabled={!canEdit || decideBusy === dp.id} onClick={() => decide(dp.id, o.key)}>
                {decideBusy === dp.id ? <Loader2 size={12} className="ssp2-spin" /> : null} {o.label}
              </button>
            ))}
          </div>
          <p className="ssp2-hint" style={{ marginTop: 6 }}>الخيار يفعّل المرحلة المناسبة ويطوي الفروع الأخرى.</p>
        </div>
      ))}

      <div className="prj-grid-4" style={{ marginBottom: 12 }}>
        <div className="prj-kpi"><div className="prj-kpi__label">التقدم</div><div className="prj-kpi__value">{overview.progress}٪</div><Bar value={overview.progress} tone={overview.health === 'late' ? 'late' : ''} /></div>
        <div className={`prj-kpi ${n.tasks_late ? 'prj-kpi--bad' : ''}`}><div className="prj-kpi__label">مهام متأخرة</div><div className="prj-kpi__value">{n.tasks_late}<small>من {n.tasks_open} مفتوحة</small></div></div>
        <div className={`prj-kpi ${n.pending_approvals ? 'prj-kpi--warn' : ''}`}><div className="prj-kpi__label">موافقات معلقة</div><div className="prj-kpi__value">{n.pending_approvals}</div></div>
        <div className={`prj-kpi ${n.risks_high ? 'prj-kpi--warn' : ''}`}><div className="prj-kpi__label">مخاطر عالية</div><div className="prj-kpi__value">{n.risks_high}<small>من {n.risks_open} قائمة</small></div></div>
        <div className="prj-kpi"><div className="prj-kpi__label">المراحل</div><div className="prj-kpi__value">{n.phases_done}<small>/ {n.phases_total} مكتملة</small></div></div>
        <div className="prj-kpi"><div className="prj-kpi__label">المخرجات النهائية</div><div className="prj-kpi__value">{n.deliverables_final}<small>/ {n.deliverables_total}</small></div></div>
        <div className={`prj-kpi ${n.issues_open ? 'prj-kpi--warn' : ''}`}><div className="prj-kpi__label">مسائل قانونية مفتوحة</div><div className="prj-kpi__value">{n.issues_open}<small>أُجيب {n.issues_answered}</small></div></div>
        <div className={`prj-kpi ${n.hours_ratio > 100 ? 'prj-kpi--bad' : ''}`}><div className="prj-kpi__label">الساعات</div><div className="prj-kpi__value">{num(n.hours_actual)}<small>/ {num(n.hours_estimated)} مقدرة ({n.hours_ratio}٪)</small></div></div>
      </div>

      <div className="prj-grid-2">
        <div className="prj-block">
          <div className="prj-block__head"><AlertTriangle size={14} /> يحتاج انتباهاً <HealthChip health={overview.health} reasons={overview.health_reasons} /></div>
          <div className="prj-block__body prj-block__body--flush">
            {overview.attention.length === 0 ? (
              <div className="ssp2-empty">لا شيء عاجل. المشروع على المسار.</div>
            ) : (
              <div className="prj-attn">
                {overview.attention.map((a, i) => (
                  <div key={i} className={`prj-attn__item prj-attn__item--${a.severity}`}>
                    {a.severity === 'info' ? <Info size={13} /> : <AlertTriangle size={13} />}
                    <span>
                      {a.kind === 'task' && a.id ? <button type="button" onClick={() => openTask(a.id!)}>{a.text}</button> : a.text}
                      {a.kind === 'milestone' && <> · <button type="button" onClick={() => goTo('timeline')}>افتح الخط الزمني</button></>}
                      {a.kind === 'approval' && <> · <button type="button" onClick={() => goTo('phases')}>افتح المراحل</button></>}
                      {a.kind === 'decision_point' && <> · <button type="button" onClick={() => goTo('phases')}>اختر المسار</button></>}
                      {a.kind === 'decision' && <> · <button type="button" onClick={() => goTo('decisions')}>سجل القرارات</button></>}
                      {a.kind === 'hours' && <> · <button type="button" onClick={() => goTo('money')}>الوقت والمال</button></>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="prj-block">
          <div className="prj-block__head">القادم خلال ٤٥ يوماً</div>
          <div className="prj-block__body prj-block__body--flush">
            {overview.upcoming.length === 0 ? <div className="ssp2-empty">لا مواعيد قادمة مسجلة.</div> : (
              <div className="prj-feed">
                {overview.upcoming.map((u) => {
                  const d = daysFromToday(u.at);
                  return (
                    <div key={u.key} className="prj-feed__item prj-feed__item--future" style={{ gridTemplateColumns: '90px 1fr' }}>
                      <span className="prj-feed__time">{fmtDate(u.at)}<br /><small>{d?.label}</small></span>
                      <div>
                        <div className="prj-feed__title">
                          {u.subject_type === 'task' && u.subject_id ? <button type="button" onClick={() => openTask(u.subject_id!)}>{u.title}</button> : u.title}
                        </div>
                        {u.body && <div className="prj-feed__body">{u.body}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="prj-block">
        <div className="prj-block__head">المراحل <Chip tone="muted">{n.phases_done}/{n.phases_total}</Chip>
          <div className="prj-block__tools"><button type="button" className="prj-link" onClick={() => goTo('phases')}>إدارة المراحل والمهام</button></div>
        </div>
        <div className="prj-table-wrap">
          <table className="prj-table">
            <thead><tr><th>#</th><th>المرحلة</th><th>الحالة</th><th>المسؤول</th><th>من</th><th>إلى</th><th>المهام</th><th>الساعات</th></tr></thead>
            <tbody>
              {overview.phases.map((p) => {
                const due = daysFromToday(p.due_date);
                const late = p.status === 'active' && due && due.days < 0;
                return (
                  <tr key={p.id} className="prj-clickable" onClick={() => goTo('phases')}>
                    <td className="num">{p.order}</td>
                    <td><b>{p.name}</b>{p.workstream && <div className="muted">{p.workstream}</div>}</td>
                    <td><Chip tone={p.status === 'active' ? 'navy' : p.status === 'completed' ? 'done' : p.status === 'awaiting_approval' ? 'warn' : 'muted'}>{PHASE_STATUS_LABELS[p.status]}</Chip></td>
                    <td>{p.owner?.name ?? '—'}</td>
                    <td className="num">{fmtDate(p.start_date)}</td>
                    <td className="num" style={late ? { color: 'var(--status-red)', fontWeight: 700 } : undefined}>{fmtDate(p.due_date)}{late ? ' · متأخرة' : ''}</td>
                    <td className="num">{p.tasks_done}/{p.tasks_total}{p.tasks_late ? <span style={{ color: 'var(--status-red)' }}> · {p.tasks_late} متأخرة</span> : null}</td>
                    <td className="num">{num(p.hours_actual)}{p.estimated_hours ? ` / ${num(p.estimated_hours)}` : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(project.settings.assumptions?.length || project.settings.ai_questions?.length) ? (
        <div className="prj-grid-2">
          {project.settings.assumptions && project.settings.assumptions.length > 0 && (
            <div className="prj-block"><div className="prj-block__head">افتراضات الخطة</div>
              <ul className="prj-block__body" style={{ margin: 0, paddingInlineStart: 26, fontSize: 12.5, lineHeight: 1.9 }}>{project.settings.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
            </div>
          )}
          {project.settings.ai_questions && project.settings.ai_questions.length > 0 && (
            <div className="prj-block"><div className="prj-block__head">أسئلة رائد عند التخطيط</div>
              <ul className="prj-block__body" style={{ margin: 0, paddingInlineStart: 26, fontSize: 12.5, lineHeight: 1.9 }}>{project.settings.ai_questions.map((a) => <li key={a}>{a}</li>)}</ul>
            </div>
          )}
        </div>
      ) : null}

      <div className="prj-block">
        <div className="prj-block__head">آخر ما حدث <div className="prj-block__tools"><button type="button" className="prj-link" onClick={() => goTo('feed')}>الخط الزمني كاملاً</button></div></div>
        <div className="prj-block__body prj-block__body--flush">
          {overview.recent.length === 0 ? <div className="ssp2-empty">لا أحداث بعد.</div> : (
            <div className="prj-feed">
              {overview.recent.map((r) => (
                <div key={r.id} className="prj-feed__item" style={{ gridTemplateColumns: '120px 1fr' }}>
                  <span className="prj-feed__time">{fmtDateTime(r.at)}</span>
                  <div><div className="prj-feed__title">{r.title}</div>{r.body && <div className="prj-feed__body">{r.body}</div>}{r.actor_name && <div className="prj-feed__meta">{r.actor_name}</div>}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverviewSection;
