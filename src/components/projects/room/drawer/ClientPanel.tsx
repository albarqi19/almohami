import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Calendar, Coins, ExternalLink, Loader2, Mail, Phone, Send, User } from 'lucide-react';
import { ClientManagementService } from '../../../../services/clientManagementService';
import type { Client } from '../../../../services/clientManagementService';
import { Chip, fmtDate, num } from '../../ui';
import { useRoom } from '../RoomContext';

type Details = Awaited<ReturnType<typeof ClientManagementService.getClientDetails>>;
const ENTITY_AR: Record<string, string> = { individual: 'فرد', company: 'شركة', organization: 'جهة' };

/** بطاقة العميل المختصرة داخل الغرفة: التواصل، وما له في المكتب، والمستحق، والجلسة القادمة. الملف الكامل والفوترة في صفحته. */
const ClientPanel: React.FC<{ clientId: number; onTitle: (title: string) => void }> = ({ clientId, onTitle }) => {
  const { openIn, goTo, closeDrawer } = useRoom();
  const navigate = useNavigate();
  const [d, setD] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onTitleRef = useRef(onTitle);
  onTitleRef.current = onTitle;

  useEffect(() => {
    let cancelled = false;
    setD(null);
    ClientManagementService.getClientDetails(clientId)
      .then((r) => { if (cancelled) return; setD(r); setError(null); onTitleRef.current(r.client.name); })
      .catch((e: Error) => { if (!cancelled) setError(e.message || 'تعذر فتح العميل'); });
    return () => { cancelled = true; };
  }, [clientId]);

  if (error) return <div className="prj-panel"><div className="prj-panel__body"><div className="prj-error" style={{ margin: 14 }}>{error}</div></div></div>;
  if (!d) return <div className="prj-panel"><div className="prj-panel__body"><div className="prj-empty"><Loader2 size={14} className="ssp2-spin" /> جارٍ فتح العميل…</div></div></div>;

  const c: Client = d.client;
  const s = d.statistics;

  return (
    <div className="prj-panel">
      <div className="prj-panel__head">
        <div className="prj-panel__title">
          <span className="prj-badge">العميل</span>
          <h2>{c.name}</h2>
          {c.entity_type && <Chip tone="todo">{ENTITY_AR[c.entity_type] ?? c.entity_type}</Chip>}
          <Chip tone={c.is_active ? 'done' : 'late'}>{c.client_status === 'prospect' ? 'عميل محتمل' : c.is_active ? 'نشط' : 'غير نشط'}</Chip>
        </div>
        <div className="prj-panel__sub">
          {c.phone && <a className="prj-link" href={`tel:${c.phone}`}><Phone size={11} /> {c.phone}</a>}
          {c.email && <a className="prj-link" href={`mailto:${c.email}`}><Mail size={11} /> {c.email}</a>}
          {c.point_of_contact_name && <span><User size={11} /> جهة التواصل: <b>{c.point_of_contact_name}</b>{c.point_of_contact_phone ? ` · ${c.point_of_contact_phone}` : ''}</span>}
          {c.relationship_manager && <span>مدير العلاقة: <b>{c.relationship_manager.name}</b></span>}
        </div>
      </div>
      <div className="prj-panel__acts">
        <button type="button" className="prj-btn prj-btn--sm prj-btn--primary" onClick={() => { closeDrawer(true); goTo('reports'); }}><Send size={12} /> تحديث للعميل من المشروع</button>
        <button type="button" className="prj-btn prj-btn--sm" onClick={() => navigate(`/clients/${c.id}`)}><ExternalLink size={12} /> صفحة العميل</button>
      </div>
      <div className="prj-panel__body">
        <div className="prj-kv2">
          <div><span className="k">القضايا</span><span className="v num">{s.total_cases} · جارية {s.active_cases} · مغلقة {s.closed_cases}</span></div>
          <div><span className="k">الرسوم</span><span className="v num">{num(Math.round(s.total_fees))} ريال · المسدد {num(Math.round(s.paid_amount))}</span></div>
          <div><span className="k">المتبقي</span><span className="v num" style={s.remaining_amount > 0 ? { color: 'var(--pj-warn)' } : undefined}>{num(Math.round(s.remaining_amount))} ريال</span></div>
          <div><span className="k">الجلسة القادمة</span><span className="v">{d.upcoming_session ? <button type="button" className="prj-link" onClick={() => openIn({ type: 'case', id: d.upcoming_session!.case_id })}>{fmtDate(d.upcoming_session.date)} · {d.upcoming_session.case_title}</button> : 'لا شيء'}</span></div>
          {c.commercial_registration && <div><span className="k">السجل التجاري</span><span className="v num">{c.commercial_registration}</span></div>}
          {c.vat_number && <div><span className="k">الرقم الضريبي</span><span className="v num">{c.vat_number}</span></div>}
          {c.legal_representative && <div><span className="k">الممثل النظامي</span><span className="v">{c.legal_representative}</span></div>}
          {c.industry && <div><span className="k">النشاط</span><span className="v">{c.industry}</span></div>}
          {(c.city || c.national_address) && <div><span className="k">العنوان</span><span className="v">{c.national_address || [c.district, c.city].filter(Boolean).join('، ')}</span></div>}
          {c.preferred_language && <div><span className="k">اللغة</span><span className="v">{c.preferred_language}</span></div>}
          <div><span className="k">عميل منذ</span><span className="v num">{fmtDate(c.created_at)}</span></div>
        </div>
        <section className="prj-sec" style={{ borderBottom: 0 }}>
          <div className="prj-sec__head"><Building2 size={13} /> ما يظهر له من المشروع</div>
          <div className="prj-sec__body">
            <p style={{ margin: 0 }}>العميل يرى في بوابته المراحل والمهام والمستندات المعلَّمة له فقط، والتقارير التي تُعتمد وتُرسل من قسم «التقارير». اضبط ما يراه من قسم «العميل» في الغرفة.</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button type="button" className="prj-btn prj-btn--sm" onClick={() => { closeDrawer(true); goTo('client'); }}><Calendar size={12} /> ما يراه العميل</button>
              <button type="button" className="prj-btn prj-btn--sm" onClick={() => { closeDrawer(true); goTo('money'); }}><Coins size={12} /> الوقت والمال</button>
            </div>
          </div>
        </section>
      </div>
      <div className="prj-panel__foot"><span>بطاقة مختصرة. الملف الكامل والفوترة والمراسلات من صفحة العميل.</span></div>
    </div>
  );
};

export default ClientPanel;
