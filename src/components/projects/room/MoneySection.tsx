import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { ProjectMoney } from '../../../types/projects';
import { PHASE_STATUS_LABELS } from '../../../types/projects';
import { Bar, Chip, fmtDate, num } from '../ui';
import { useRoom } from './RoomContext';

const sar = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${num(v)} ر.س`);

/** الوقت والمال: الساعات المسجلة مقابل المقدرة، بالمرحلة وبالشخص، وشروط الدفع والمصروفات من العقد المربوط. */
const MoneySection: React.FC = () => {
  const { project } = useRoom();
  const [money, setMoney] = useState<ProjectMoney | null>(null);
  useEffect(() => {
    ProjectService.money(project.id).then(setMoney).catch((e: Error) => toast.error(e.message));
  }, [project.id, project.updated_at]);
  if (!money) return <div className="prj-muted">جارٍ التحميل…</div>;
  const h = money.hours;
  return (
    <div>
      <div className="prj-grid-4" style={{ marginBottom: 12 }}>
        <div className="prj-kpi"><div className="prj-kpi__label">ساعات مسجلة</div><div className="prj-kpi__value">{num(h.actual)}<small>من {num(h.estimated)} مقدرة</small></div><Bar value={h.ratio} tone={h.ratio > 100 ? 'late' : h.ratio > 85 ? 'attention' : 'green'} /></div>
        <div className={`prj-kpi ${h.forecast_over_pct && h.forecast_over_pct > 0 ? 'prj-kpi--warn' : ''}`}><div className="prj-kpi__label">التوقع عند الاكتمال</div><div className="prj-kpi__value">{h.forecast_total ? num(h.forecast_total) : '—'}<small>{h.forecast_over_pct ? `${h.forecast_over_pct > 0 ? '+' : ''}${h.forecast_over_pct}٪ عن التقدير` : ''}</small></div></div>
        <div className="prj-kpi"><div className="prj-kpi__label">الإنجاز</div><div className="prj-kpi__value">{h.progress}٪<small>مقابل {h.ratio}٪ من الساعات</small></div></div>
        <div className="prj-kpi"><div className="prj-kpi__label">العقد</div><div className="prj-kpi__value" style={{ fontSize: 14 }}>{money.contract ? (money.contract.title || money.contract.number || `#${money.contract.id}`) : 'غير مربوط'}</div>{money.contract?.total ? <div className="prj-muted">{sar(money.contract.total)}</div> : null}</div>
      </div>
      <div className="prj-grid-2">
        <div className="prj-block">
          <div className="prj-block__head">الساعات بالمرحلة</div>
          <div className="prj-table-wrap"><table className="prj-table">
            <thead><tr><th>المرحلة</th><th>الحالة</th><th>مقدرة</th><th>مسجلة</th><th>النسبة</th><th>شرط دفع</th></tr></thead>
            <tbody>
              {money.phases.map((p) => { const ratio = p.estimated_hours ? Math.round((p.actual_hours / p.estimated_hours) * 100) : null; return (
                <tr key={p.id}><td><b>{p.name}</b></td><td><Chip tone={p.status === 'active' ? 'navy' : p.status === 'completed' ? 'done' : 'muted'}>{PHASE_STATUS_LABELS[p.status]}</Chip></td><td className="num">{p.estimated_hours ? num(p.estimated_hours) : '—'}</td><td className="num">{num(p.actual_hours)}</td><td className="num" style={ratio !== null && ratio > 100 ? { color: 'var(--status-red)', fontWeight: 700 } : undefined}>{ratio !== null ? `${ratio}٪` : '—'}</td><td className="muted">{p.payment_term_id ? money.payment_terms.find((t) => t.id === p.payment_term_id)?.title ?? `#${p.payment_term_id}` : '—'}</td></tr>
              ); })}
              {money.phases.length === 0 && <tr><td colSpan={6} className="muted">لا مراحل.</td></tr>}
            </tbody>
          </table></div>
        </div>
        <div className="prj-block">
          <div className="prj-block__head">الساعات بالشخص</div>
          <div className="prj-table-wrap"><table className="prj-table">
            <thead><tr><th>الشخص</th><th>الساعات</th></tr></thead>
            <tbody>
              {money.people.map((p) => <tr key={p.id}><td>{p.name}</td><td className="num">{num(p.hours)}</td></tr>)}
              {money.people.length === 0 && <tr><td colSpan={2} className="muted">لا ساعات مسجلة بعد. الموقت في كل مهمة يغذي هذا الجدول.</td></tr>}
            </tbody>
          </table></div>
        </div>
        <div className="prj-block">
          <div className="prj-block__head">شروط الدفع من العقد</div>
          <div className="prj-table-wrap"><table className="prj-table">
            <thead><tr><th>الدفعة</th><th>المبلغ</th><th>الاستحقاق</th><th>الحالة</th><th>مرتبطة بمرحلة</th></tr></thead>
            <tbody>
              {money.payment_terms.map((t) => <tr key={t.id}><td>{t.title ?? `#${t.id}`}</td><td className="num">{sar(t.amount)}</td><td className="num">{fmtDate(t.due_date)}</td><td><Chip tone={t.status === 'paid' ? 'done' : t.status === 'due' ? 'warn' : 'muted'}>{t.status ?? '—'}</Chip></td><td className="muted">{t.phase_id ? money.phases.find((p) => p.id === t.phase_id)?.name ?? '—' : '—'}</td></tr>)}
              {money.payment_terms.length === 0 && <tr><td colSpan={5} className="muted">{money.contract ? 'لا شروط دفع في العقد.' : 'اربط عقداً بالمشروع لتظهر دفعاته هنا، ويمكن ربط الدفعة بإكمال مرحلة.'}</td></tr>}
            </tbody>
          </table></div>
        </div>
        <div className="prj-block">
          <div className="prj-block__head">المصروفات</div>
          <div className="prj-table-wrap"><table className="prj-table">
            <thead><tr><th>البند</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
            <tbody>
              {money.expenses.map((e) => <tr key={e.id}><td>{e.title ?? `#${e.id}`}</td><td className="num">{sar(e.amount)}</td><td className="num">{fmtDate(e.date)}</td></tr>)}
              {money.expenses.length === 0 && <tr><td colSpan={3} className="muted">لا مصروفات مسجلة على قضايا المشروع.</td></tr>}
            </tbody>
          </table></div>
        </div>
      </div>
    </div>
  );
};

export default MoneySection;
