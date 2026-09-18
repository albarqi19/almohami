import React, { useEffect, useState } from 'react';
import { Clock, Coins, Flag, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProjectService } from '../../../services/projectService';
import type { ProjectMoney } from '../../../types/projects';
import { Av, Chip, PBar, fmtDayMonth, num } from '../ui';
import { useRoom } from './RoomContext';

const sar = (v: number | null | undefined) => (v === null || v === undefined ? '—' : num(v));

/** الوقت والمال كما في التصوّر: الساعات (رقم كبير + توقع)، بالمرحلة، بالشخص، الدفعات والمصاريف من العقد. */
const MoneySection: React.FC = () => {
  const { project, goTo } = useRoom();
  const [money, setMoney] = useState<ProjectMoney | null>(null);
  useEffect(() => { ProjectService.money(project.id).then(setMoney).catch((e: Error) => toast.error(e.message)); }, [project.id, project.updated_at]);
  if (!money) return <div className="prj-empty">جارٍ التحميل…</div>;
  const h = money.hours;
  const over = h.forecast_over_pct !== null && h.forecast_over_pct > 0;
  return (
    <div className="prj-view">
      <div className="prj-money">
        <div>
          <div className="prj-card__head"><Clock size={14} /> الساعات</div>
          <div className="prj-ov__body">
            <div className="prj-big"><b className="num">{num(h.actual)}</b><span>من {num(h.estimated)} ساعة مقدرة · {h.ratio}٪ · الإنجاز {h.progress}٪</span></div>
            <PBar value={h.ratio} width="100%" tone={h.ratio > 100 ? 'bad' : h.ratio > 85 ? 'warn' : ''} />
            <div className="prj-row"><span className="prj-grow">التوقع إذا استمر الإيقاع الحالي</span>{h.forecast_total ? <Chip tone={over ? 'warn' : 'ok'}>{over ? `تجاوز بنحو ${h.forecast_over_pct}٪ · ${num(h.forecast_total - h.estimated)} ساعة` : 'ضمن التقدير'}</Chip> : <Chip tone="todo">لا بيانات كافية بعد</Chip>}</div>
            <div className="prj-row"><span className="prj-grow prj-dim">المصدر: المؤقت على المهام. لا إدخال يدوي إضافي.</span></div>
          </div>
        </div>
        <div>
          <div className="prj-card__head"><Flag size={14} /> بالمرحلة</div>
          <div className="prj-ov__body">
            {money.phases.length === 0 && <div className="prj-empty">لا مراحل.</div>}
            {money.phases.map((p) => { const pct = p.estimated_hours ? Math.round((p.actual_hours / p.estimated_hours) * 100) : 0; return (
              <div key={p.id} className="prj-row"><span className="prj-grow">{p.name}</span><span className="num prj-dim">{num(p.actual_hours)} من {p.estimated_hours ? num(p.estimated_hours) : '—'}</span><PBar value={pct} width={70} tone={pct > 100 ? 'warn' : ''} /></div>
            ); })}
          </div>
        </div>
        <div>
          <div className="prj-card__head"><Users size={14} /> بالشخص</div>
          <div className="prj-ov__body">
            {money.people.length === 0 && <div className="prj-empty">لا ساعات مسجلة بعد.</div>}
            {money.people.map((p) => <div key={p.id} className="prj-row"><Av name={p.name} /><span className="prj-grow">{p.name}</span><span className="num prj-dim">{num(p.hours)} ساعة</span></div>)}
          </div>
        </div>
        <div>
          <div className="prj-card__head"><Coins size={14} /> الدفعات والمصاريف{money.contract ? ` · عقد ${money.contract.number || money.contract.title || `#${money.contract.id}`}` : ''}</div>
          <div className="prj-ov__body">
            {!money.contract && <div className="prj-row"><span className="prj-grow prj-dim">لا عقد مربوط. <button type="button" className="prj-link" onClick={() => goTo('events')}>اربط عقداً</button> لتظهر دفعاته هنا، ويمكن ربط الدفعة بإكمال مرحلة.</span></div>}
            {money.payment_terms.map((t) => <div key={t.id} className="prj-row"><span className="prj-grow">{t.title ?? `دفعة #${t.id}`}</span><span className="num">{sar(t.amount)}</span><Chip tone={t.status === 'paid' ? 'done' : t.status === 'due' ? 'warn' : 'todo'}>{t.status === 'paid' ? 'مدفوعة' : t.status === 'due' ? 'مستحقة' : t.phase_id ? `مرتبطة بمرحلة ${money.phases.find((p) => p.id === t.phase_id)?.name ?? ''}` : t.due_date ? fmtDayMonth(t.due_date) : 'قادمة'}</Chip></div>)}
            {money.expenses.map((e) => <div key={e.id} className="prj-row"><span className="prj-grow">مصاريف: {e.title ?? `#${e.id}`}</span><span className="num">{sar(e.amount)}</span><Chip tone="doing">{e.date ? fmtDayMonth(e.date) : 'مسجل'}</Chip></div>)}
            {money.contract && money.payment_terms.length === 0 && money.expenses.length === 0 && <div className="prj-empty">لا دفعات ولا مصاريف مسجلة.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoneySection;
