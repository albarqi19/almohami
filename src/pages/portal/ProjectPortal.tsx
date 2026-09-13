import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ProjectPortalService } from '../../services/projectService';
import type { ClientProjectView, PortalInfo } from '../../types/projects';
import { DELIVERABLE_STATUS_LABELS, MILESTONE_STATUS_LABELS, PHASE_STATUS_LABELS } from '../../types/projects';

/**
 * نافذة المشروع لمن أُرسل له الرابط (بلا تسجيل دخول): رابط + رقم سري ⇒ يرى ما حدده المكتب.
 * صفحة خارج تخطيط التطبيق، بألوان «الجريدة الرسمية» نفسها التي في بوابة الخدمة، بخط الموقع.
 */
const C = { bg: '#EFE9DD', paper: '#FFFFFF', ink: '#16202F', mute: '#5D6675', faint: '#8B93A1', gold: '#C9A35D', goldDeep: '#8C6D3F', rust: '#B0543F', green: '#1FAE6A', hair: '#ECE6D8', navy: '#1E3A5F' };

const STYLE = `
.pp-root{min-height:100vh;background:${C.bg};color:${C.ink};font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;padding:28px 14px 60px}
.pp-wrap{max-width:820px;margin:0 auto}
.pp-card{background:${C.paper};border:1px solid ${C.gold};border-radius:12px;padding:20px 22px;margin-bottom:14px}
.pp-eyebrow{font-size:11px;letter-spacing:.12em;color:${C.goldDeep};font-weight:700;margin:0 0 6px}
.pp-h1{font-size:21px;font-weight:700;margin:0 0 4px;line-height:1.5}
.pp-sub{font-size:13px;color:${C.mute};margin:0}
.pp-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}
.pp-kpi{border:1px solid ${C.hair};border-radius:9px;padding:10px 12px}
.pp-kpi__l{font-size:11px;color:${C.mute}}
.pp-kpi__v{font-size:17px;font-weight:700;font-variant-numeric:tabular-nums}
.pp-bar{height:6px;background:${C.hair};border-radius:3px;overflow:hidden;margin-top:6px}
.pp-bar__f{height:100%;background:${C.navy}}
.pp-sec{font-size:12px;letter-spacing:.1em;color:${C.goldDeep};font-weight:700;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid ${C.hair}}
.pp-row{display:grid;grid-template-columns:92px 1fr auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid ${C.hair};font-size:13.5px}
.pp-row:last-child{border-bottom:none}
.pp-row__d{font-size:12px;color:${C.mute};font-variant-numeric:tabular-nums}
.pp-row__n{color:${C.ink};line-height:1.6}
.pp-row__n small{display:block;color:${C.mute};font-size:12px}
.pp-chip{font-size:11px;padding:2px 9px;border-radius:999px;border:1px solid ${C.hair};color:${C.mute};white-space:nowrap}
.pp-chip--now{border-color:${C.navy};color:${C.navy};font-weight:700}
.pp-chip--done{border-color:${C.green};color:${C.green}}
.pp-chip--late{border-color:${C.rust};color:${C.rust};font-weight:700}
.pp-chip--gold{border-color:${C.gold};color:${C.goldDeep}}
.pp-empty{font-size:13px;color:${C.faint};padding:8px 0}
.pp-pin{display:flex;flex-direction:column;gap:12px;max-width:380px;margin:0 auto;text-align:center}
.pp-input{width:100%;padding:12px 14px;font-size:22px;letter-spacing:.35em;text-align:center;border:1px solid ${C.gold};border-radius:9px;font-family:inherit;direction:ltr;outline:none}
.pp-btn{padding:11px 18px;font-size:14px;font-weight:700;color:#fff;background:${C.navy};border:none;border-radius:9px;cursor:pointer;font-family:inherit}
.pp-btn:disabled{opacity:.6;cursor:default}
.pp-err{color:${C.rust};font-size:13px}
.pp-foot{text-align:center;font-size:12px;color:${C.faint};margin-top:18px}
.pp-report{white-space:pre-wrap;font-size:13.5px;line-height:1.9;color:${C.ink}}
@media(max-width:600px){.pp-kpis{grid-template-columns:1fr 1fr}.pp-row{grid-template-columns:1fr;gap:4px}}
`;

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' }) : '—');
const STORAGE_KEY = (token: string) => `prj_portal_${token}`;

const ProjectPortal: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const [info, setInfo] = useState<PortalInfo | null>(null);
  const [view, setView] = useState<ClientProjectView | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadView = useCallback(async (access: string) => {
    try {
      const v = await ProjectPortalService.view(token, access);
      setView(v);
      setError(null);
    } catch (e) {
      sessionStorage.removeItem(STORAGE_KEY(token));
      setView(null);
      const err = e as Error & { status?: number };
      if (err.status !== 401) setError(err.message);
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const i = await ProjectPortalService.info(token);
        if (cancelled) return;
        setInfo(i);
        const saved = sessionStorage.getItem(STORAGE_KEY(token));
        if (saved) await loadView(saved);
        else if (!i.requires_pin) {
          const a = await ProjectPortalService.verify(token, '');
          sessionStorage.setItem(STORAGE_KEY(token), a.access_token);
          await loadView(a.access_token);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'الرابط غير صالح');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, loadView]);

  const submitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const a = await ProjectPortalService.verify(token, pin.trim());
      sessionStorage.setItem(STORAGE_KEY(token), a.access_token);
      await loadView(a.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'الرقم السري غير صحيح');
    } finally {
      setBusy(false);
    }
  };

  const current = view?.phases.find((p) => p.is_current);

  return (
    <div className="pp-root" dir="rtl">
      <style>{STYLE}</style>
      <div className="pp-wrap">
        {loading ? <div className="pp-card"><p className="pp-sub">جارٍ الفتح…</p></div> : !info && error ? (
          <div className="pp-card"><p className="pp-eyebrow">نافذة المشروع</p><h1 className="pp-h1">تعذر فتح الرابط</h1><p className="pp-err">{error}</p></div>
        ) : !view ? (
          <div className="pp-card">
            <p className="pp-eyebrow">{info?.office_name ?? 'نافذة المشروع'}</p>
            <h1 className="pp-h1">{info?.project_name}</h1>
            <p className="pp-sub">هذا الرابط أُعد لـ«{info?.label}». أدخل الرقم السري الذي وصلك من المكتب.</p>
            <form className="pp-pin" onSubmit={submitPin} style={{ marginTop: 18 }}>
              <input className="pp-input" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={8} placeholder="••••••" autoFocus disabled={info?.locked} />
              {error && <div className="pp-err">{error}</div>}
              {info?.locked && <div className="pp-err">الرابط مقفل مؤقتاً بعد محاولات خاطئة. حاول بعد ربع ساعة.</div>}
              <button type="submit" className="pp-btn" disabled={busy || !pin || info?.locked}>{busy ? 'جارٍ التحقق…' : 'دخول'}</button>
            </form>
          </div>
        ) : (
          <>
            <div className="pp-card">
              <p className="pp-eyebrow">{view.project.office_name ?? 'نافذة المشروع'}{view.label ? ` · ${view.label}` : ''}</p>
              <h1 className="pp-h1">{view.project.name}</h1>
              <p className="pp-sub">{view.project.code} · {view.project.status_label}{view.project.client_name ? ` · ${view.project.client_name}` : ''}{view.project.manager_name ? ` · يديره ${view.project.manager_name}` : ''}</p>
              {view.scope.overview && (
                <div className="pp-kpis">
                  <div className="pp-kpi"><div className="pp-kpi__l">التقدم</div><div className="pp-kpi__v">{view.project.progress}٪</div><div className="pp-bar"><div className="pp-bar__f" style={{ width: `${view.project.progress}%` }} /></div></div>
                  <div className="pp-kpi"><div className="pp-kpi__l">المرحلة الحالية</div><div className="pp-kpi__v" style={{ fontSize: 14 }}>{current?.name ?? '—'}</div></div>
                  <div className="pp-kpi"><div className="pp-kpi__l">الهدف للانتهاء</div><div className="pp-kpi__v" style={{ fontSize: 14 }}>{fmt(view.project.target_end_date)}</div></div>
                </div>
              )}
            </div>

            {view.tasks.length > 0 && (
              <div className="pp-card"><p className="pp-sec">مطلوب منكم</p>
                {view.tasks.map((t) => <div key={t.id} className="pp-row"><span className="pp-row__d">{fmt(t.due_date)}</span><span className="pp-row__n">{t.title}{t.description && <small>{t.description}</small>}</span><span className={`pp-chip ${t.status === 'done' ? 'pp-chip--done' : t.is_late ? 'pp-chip--late' : 'pp-chip--gold'}`}>{t.status === 'done' ? 'تم' : t.is_late ? 'متأخر' : 'مطلوب'}</span></div>)}
              </div>
            )}

            {view.scope.phases && (
              <div className="pp-card"><p className="pp-sec">مراحل المشروع</p>
                {view.phases.length === 0 && <div className="pp-empty">لا مراحل ظاهرة.</div>}
                {view.phases.map((p) => <div key={p.id} className="pp-row"><span className="pp-row__d">{fmt(p.start_date)}</span><span className="pp-row__n">{p.name}{p.objective && <small>{p.objective}</small>}</span><span className={`pp-chip ${p.is_current ? 'pp-chip--now' : p.status === 'completed' ? 'pp-chip--done' : ''}`}>{p.is_current ? 'الحالية' : PHASE_STATUS_LABELS[p.status]}</span></div>)}
              </div>
            )}

            {view.scope.milestones && (
              <div className="pp-card"><p className="pp-sec">المواعيد الرئيسية</p>
                {view.milestones.length === 0 && <div className="pp-empty">لا مواعيد ظاهرة.</div>}
                {view.milestones.map((m) => <div key={m.id} className="pp-row"><span className="pp-row__d">{fmt(m.date)}</span><span className="pp-row__n">{m.name}{m.is_estimate && <small>موعد تقديري قد يتغير</small>}{m.from_court && <small>من المحكمة</small>}</span><span className={`pp-chip ${m.status === 'done' ? 'pp-chip--done' : m.status === 'missed' ? 'pp-chip--late' : ''}`}>{MILESTONE_STATUS_LABELS[m.status]}</span></div>)}
              </div>
            )}

            {view.scope.deliverables && view.deliverables.length > 0 && (
              <div className="pp-card"><p className="pp-sec">المخرجات</p>
                {view.deliverables.map((d) => <div key={d.id} className="pp-row"><span className="pp-row__d">{fmt(d.due_date)}</span><span className="pp-row__n">{d.name}<small>{d.type_label}{d.version ? ` · النسخة ${d.version}` : ''}</small></span><span className={`pp-chip ${d.status === 'final' || d.status === 'submitted' ? 'pp-chip--done' : d.client_step === 'current' ? 'pp-chip--gold' : ''}`}>{d.client_step === 'current' ? 'بانتظار موافقتكم' : DELIVERABLE_STATUS_LABELS[d.status]}</span></div>)}
              </div>
            )}

            {view.scope.meetings && view.meetings.length > 0 && (
              <div className="pp-card"><p className="pp-sec">الاجتماعات القادمة</p>
                {view.meetings.map((m) => <div key={m.id} className="pp-row"><span className="pp-row__d">{fmt(m.date)}</span><span className="pp-row__n">{m.name}</span><span /></div>)}
              </div>
            )}

            {view.scope.reports && view.reports.length > 0 && (
              <div className="pp-card"><p className="pp-sec">آخر التقارير</p>
                {view.reports.map((r) => <div key={r.id} style={{ marginBottom: 14 }}><div style={{ fontWeight: 700, marginBottom: 4 }}>{r.title} <span className="pp-row__d">{fmt(r.sent_at)}</span></div><div className="pp-report">{r.body}</div></div>)}
              </div>
            )}

            <div className="pp-foot">{view.project.office_name}{view.project.office_phone ? ` · ${view.project.office_phone}` : ''} · هذه النافذة للاطلاع ولا تغني عن التواصل مع المكتب.</div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectPortal;
