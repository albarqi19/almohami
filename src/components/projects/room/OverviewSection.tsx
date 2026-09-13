import React, { useState } from 'react';
import { AlertTriangle, Calendar, Flag, History, Lightbulb, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import { Av, Chip, Health, PBar, fmtDayMonth, whenAr } from '../ui';
import { useRoom } from './RoomContext';

/**
 * نظرة عامة كما في التصوّر: شريط الأرقام، ملخص رائد، ثم ست بلاطات:
 * يحتاج انتباهك · القادم · تقدم المراحل · السجلات · آخر نشاط.
 */
const OverviewSection: React.FC = () => {
  const { project, overview, canEdit, canApprove, goTo, openTask, refresh, askRaed, setPhaseFilter } = useRoom();
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [decideBusy, setDecideBusy] = useState<number | null>(null);

  const refreshSummary = async () => {
    setSummaryBusy(true);
    try {
      const run = await ProjectService.refreshSummary(project.id);
      const done = await ProjectService.waitForRun(run.id);
      if (done.status === 'failed') toast.error(done.error || 'تعذر تحديث الملخص');
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر تحديث الملخص'); }
    finally { setSummaryBusy(false); }
  };

  const decide = async (pointId: number, optionKey: string) => {
    setDecideBusy(pointId);
    try { const r = await ProjectService.decide(project.id, pointId, optionKey); toast.success(r.message || 'سُجل القرار'); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر تسجيل القرار'); }
    finally { setDecideBusy(null); }
  };

  if (!overview) return <div className="prj-empty">جارٍ التحميل…</div>;
  const n = overview.numbers;
  const pendingPoints = project.decision_points.filter((dp) => !dp.chosen_key && project.phases.find((p) => p.id === dp.after_phase_id)?.status === 'completed');
  const phaseRows = project.phases.filter((p) => p.status !== 'skipped');
  const upcoming = overview.upcoming.slice(0, 6);
  const attention = overview.attention;

  const attentionTone = (kind: string, severity: string) => {
    if (kind === 'approval') return { chip: 'review', label: 'للموافقة' };
    if (kind === 'task') return { chip: severity === 'bad' ? 'late' : 'warn', label: severity === 'bad' ? 'متأخر' : 'مهمة' };
    if (kind === 'milestone') return { chip: 'bad', label: 'موعد' };
    if (kind === 'decision_point' || kind === 'decision') return { chip: 'gate', label: 'قرار' };
    if (kind === 'hours') return { chip: 'warn', label: 'الميزانية' };
    if (kind === 'blocked') return { chip: 'dep', label: 'تنتظر' };
    if (kind === 'issue') return { chip: 'todo', label: 'مسألة' };
    if (kind === 'client') return { chip: 'client', label: 'العميل' };
    return { chip: 'warn', label: '' };
  };
  const attentionTarget = (kind: string): (() => void) | null => {
    if (kind === 'approval' || kind === 'decision_point' || kind === 'blocked') return () => goTo('tasks');
    if (kind === 'milestone') return () => goTo('map');
    if (kind === 'decision') return () => goTo('decisions');
    if (kind === 'hours') return () => goTo('money');
    if (kind === 'issue') return () => goTo('issues');
    if (kind === 'risk') return () => goTo('risks');
    return null;
  };
  const upcomingChip = (u: (typeof upcoming)[number]) => {
    if (u.type === 'session') return { tone: 'bad', label: 'ناجز' };
    if (u.type === 'meeting') return { tone: 'todo', label: 'اجتماع' };
    if (u.type === 'milestone') return { tone: 'gate', label: 'موعد' };
    if (u.type === 'deliverable') return { tone: 'doing', label: 'مخرج' };
    return { tone: 'todo', label: 'مهمة' };
  };

  return (
    <div className="prj-view">
      <div className="prj-nums">
        <div><b className="num">{n.tasks_total}</b><span>المهام</span></div>
        <div><b className="num">{n.tasks_done}</b><span>المكتملة</span></div>
        <div className={n.tasks_late ? 'bad' : ''}><b className="num">{n.tasks_late}</b><span>المتأخرة</span></div>
        <div className={n.tasks_critical ? 'warn' : ''}><b className="num">{n.tasks_critical}</b><span>الحرجة</span></div>
        <div><b className="num">{n.phases_total}</b><span>المراحل · {n.phases_done} مكتملة</span></div>
        <div><b className="num">{n.documents}</b><span>المستندات</span></div>
        <div><b className="num">{n.people}</b><span>الفريق والأطراف</span></div>
        <div className={n.risks_open ? 'warn' : ''}><b className="num">{n.risks_open}</b><span>مخاطر مفتوحة</span></div>
        <div className={n.decisions_pending || n.pending_approvals ? 'bad' : ''}><b className="num">{n.decisions_pending + n.pending_approvals}</b><span>قرارات وموافقات معلقة</span></div>
      </div>

      <div className="prj-raedbox">
        <Sparkles size={16} />
        <div className="prj-grow" style={{ whiteSpace: 'normal' }}>
          <b>{overview.summary_source === 'ai' ? 'ملخص رائد:' : 'ملخص الحالة:'}</b> {overview.summary}
          <div className="acts">
            <button type="button" className="prj-btn prj-btn--sm" onClick={() => askRaed('ما أكثر ما يهدد الموعد النهائي؟')}>اسأل رائد: ما أكثر ما يهدد الموعد النهائي؟</button>
            <button type="button" className="prj-btn prj-btn--sm" onClick={() => askRaed('لخص آخر 7 أيام في المشروع')}>لخص آخر 7 أيام</button>
            {canEdit && <button type="button" className="prj-btn prj-btn--sm" onClick={refreshSummary} disabled={summaryBusy}>{summaryBusy ? <Loader2 size={12} className="ssp2-spin" /> : <RefreshCw size={12} />} حدّث ملخص رائد</button>}
          </div>
        </div>
      </div>

      {pendingPoints.map((dp) => (
        <div key={dp.id} className="prj-raedbox" style={{ background: 'var(--pj-paper-2)' }}>
          <Flag size={16} style={{ color: 'var(--pj-navy)' }} />
          <div className="prj-grow" style={{ whiteSpace: 'normal' }}>
            <b>نقطة قرار بعد «{dp.after_phase_name}»: {dp.question}</b>
            <div className="acts">
              {dp.options.map((o) => <button type="button" key={o.key} className="prj-btn prj-btn--sm" disabled={!(canEdit || canApprove) || decideBusy === dp.id} onClick={() => decide(dp.id, o.key)}>{decideBusy === dp.id ? <Loader2 size={12} className="ssp2-spin" /> : null} {o.label}</button>)}
            </div>
            <span className="prj-dim">الخيار يفعّل المسار المناسب ويطوي المسارات الأخرى.</span>
          </div>
        </div>
      ))}

      <div className="prj-ov2">
        <div className="prj-ov__tile">
          <div className="prj-card__head"><AlertTriangle size={14} /> يحتاج انتباهك <span className="prj-cnt num">{attention.length}</span><span className="prj-spacer" /><Health health={overview.health} reasons={overview.health_reasons} /></div>
          <div className="prj-ov__body">
            {attention.length === 0 && <div className="prj-empty">لا شيء عاجل. المشروع على المسار.</div>}
            {attention.map((a, i) => {
              const t = attentionTone(a.kind, a.severity);
              const go = a.kind === 'task' && a.id ? () => openTask(a.id!) : attentionTarget(a.kind);
              return (
                <div key={i} className={`prj-row ${go ? 'prj-row--click' : ''}`} onClick={go ?? undefined}>
                  <span className={`prj-health prj-health--${a.severity === 'bad' ? 'bad' : a.severity === 'warn' ? 'warn' : 'ok'}`}><i /></span>
                  <span className="prj-grow" title={a.text}>{a.text}</span>
                  {t.label && <Chip tone={t.chip}>{t.label}</Chip>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="prj-ov__tile">
          <div className="prj-card__head"><Calendar size={14} /> القادم</div>
          <div className="prj-ov__body">
            {upcoming.length === 0 && <div className="prj-empty">لا مواعيد قريبة مسجلة.</div>}
            {upcoming.map((u) => {
              const c = upcomingChip(u);
              const go = u.subject_type === 'task' && u.subject_id ? () => openTask(u.subject_id!) : u.type === 'session' || u.type === 'meeting' ? () => goTo('events') : () => goTo('map');
              return (
                <div key={u.key} className="prj-row prj-row--click" onClick={go}>
                  <b className="num" style={{ width: 78, color: 'var(--pj-ink)', flex: 'none' }}>{fmtDayMonth(u.at)}</b>
                  <span className="prj-grow" title={u.title}>{u.title.replace(/^موعد مهمة: /, '')}</span>
                  <Chip tone={c.tone}>{c.label}</Chip>
                </div>
              );
            })}
          </div>
        </div>

        <div className="prj-ov__tile">
          <div className="prj-card__head"><Flag size={14} /> تقدم المراحل</div>
          <div className="prj-ov__body">
            {phaseRows.length === 0 && <div className="prj-empty">لا مراحل بعد.</div>}
            {phaseRows.map((p) => {
              const pct = p.tasks_total ? Math.round((p.tasks_done / p.tasks_total) * 100) : (p.status === 'completed' ? 100 : 0);
              return (
                <div key={p.id} className="prj-row prj-row--click" onClick={() => { setPhaseFilter(p.id); goTo('tasks'); }}>
                  <span className="prj-grow">{p.order}. {p.name}{p.workstream ? <span className="prj-dim"> · {p.workstream}</span> : null}</span>
                  <Chip tone={p.status === 'completed' ? 'done' : p.status === 'active' ? 'doing' : p.status === 'awaiting_approval' ? 'review' : p.status === 'hidden' ? 'dep' : 'todo'}>{p.status === 'completed' ? 'مكتملة' : p.status === 'active' ? 'جارية' : p.status === 'awaiting_approval' ? 'للموافقة' : p.status === 'hidden' ? 'بعد القرار' : 'قادمة'}</Chip>
                  <PBar value={pct} width={70} tone={p.tasks_late ? 'bad' : ''} />
                  <span className="num prj-dim" style={{ width: 34, textAlign: 'end' }}>{pct}٪</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="prj-ov__tile">
          <div className="prj-card__head"><Lightbulb size={14} /> السجلات</div>
          <div className="prj-ov__body">
            <div className="prj-row prj-row--click" onClick={() => goTo('issues')}><span className="prj-grow">المسائل القانونية</span>{n.issues_open > 0 && <Chip tone="warn">{n.issues_open} مفتوحة</Chip>}{n.issues_answered > 0 && <Chip tone="done">{n.issues_answered} مجابة</Chip>}{!n.issues_open && !n.issues_answered && <Chip tone="todo">لا شيء</Chip>}</div>
            <div className="prj-row prj-row--click" onClick={() => goTo('risks')}><span className="prj-grow">المخاطر</span>{n.risks_high > 0 && <Chip tone="bad">{n.risks_high} عالية</Chip>}{n.risks_open - n.risks_high > 0 && <Chip tone="warn">{n.risks_open - n.risks_high} أخرى</Chip>}{!n.risks_open && <Chip tone="todo">لا شيء</Chip>}</div>
            <div className="prj-row prj-row--click" onClick={() => goTo('decisions')}><span className="prj-grow">القرارات</span>{n.decisions_made > 0 && <Chip tone="done">{n.decisions_made} متخذة</Chip>}{n.decisions_pending > 0 && <Chip tone="bad">{n.decisions_pending} تنتظر</Chip>}{!n.decisions_made && !n.decisions_pending && <Chip tone="todo">لا شيء</Chip>}</div>
            <div className="prj-row prj-row--click" onClick={() => goTo('deliv')}><span className="prj-grow">المخرجات</span>{n.deliverables_final > 0 && <Chip tone="done">{n.deliverables_final} نهائية</Chip>}{n.deliverables_in_progress > 0 && <Chip tone="doing">{n.deliverables_in_progress} قيد العمل</Chip>}{n.deliverables_total - n.deliverables_final - n.deliverables_in_progress > 0 && <Chip tone="todo">{n.deliverables_total - n.deliverables_final - n.deliverables_in_progress} قادمة</Chip>}</div>
            <div className="prj-row prj-row--click" onClick={() => goTo('tasks')}><span className="prj-grow">الموافقات المعلقة</span>{n.pending_approvals > 0 ? <Chip tone="review">{n.pending_approvals}</Chip> : <Chip tone="todo">لا شيء</Chip>}</div>
          </div>
        </div>

        <div className="prj-ov__tile prj-ov__tile--wide">
          <div className="prj-card__head"><History size={14} /> آخر نشاط <span className="prj-spacer" /><button type="button" className="prj-link" style={{ fontSize: 11 }} onClick={() => goTo('feed')}>الخط الزمني كاملاً</button></div>
          <div className="prj-ov__body">
            {overview.recent.length === 0 && <div className="prj-empty">لا أحداث بعد.</div>}
            {overview.recent.slice(0, 8).map((r) => (
              <div key={r.id} className="prj-row">
                {r.type === 'raed' ? <Chip tone="raed">رائد</Chip> : r.type === 'client' ? <Av name={r.actor_name ?? 'ع'} kind="c" /> : <Av name={r.actor_name ?? 'ن'} kind={r.type === 'system' ? 'x' : undefined} />}
                <span className="prj-grow" title={r.body ?? undefined}>{r.title}{r.body ? <span className="prj-dim"> · {r.body}</span> : null}</span>
                <span className="when">{whenAr(r.at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewSection;
