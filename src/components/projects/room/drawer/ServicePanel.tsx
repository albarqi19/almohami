import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, ExternalLink, FileText, Layers, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../../../services/legalServiceService';
import type { LegalService, StatusFlowItem } from '../../../../types/legalServices';
import { SERVICE_TYPE_LABELS } from '../../../../types/legalServices';
import ServiceStatusPipeline from '../../../legal-services/ServiceStatusPipeline';
import DeliverablesPanel from '../../../legal-services/DeliverablesPanel';
import ServiceTeamChat from '../../../legal-services/ServiceTeamChat';
import ServiceTimerWidget from '../../../legal-services/ServiceTimerWidget';
import { WorkspaceRegistry } from '../../../legal-services/workspaces';
import { Av, Chip, fmtDate } from '../../ui';
import { useRoom } from '../RoomContext';

type Tab = 'sum' | 'work' | 'deliv' | 'time' | 'chat';
const PRIORITY_AR: Record<string, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة' };

/**
 * لوحة الخدمة القانونية داخل الغرفة: خط سير الخدمة والانتقال بين حالاتها، مساحة عمل نوعها،
 * المخرجات، الوقت، والمحادثة. تعديل بيانات الخدمة والعقد والفوترة من صفحتها.
 */
const ServicePanel: React.FC<{ serviceId: number; onTitle: (title: string) => void }> = ({ serviceId, onTitle }) => {
  const { openIn, canEdit, refresh } = useRoom();
  const navigate = useNavigate();
  const [service, setService] = useState<LegalService | null>(null);
  const [flow, setFlow] = useState<StatusFlowItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('sum');
  const [busy, setBusy] = useState<string | null>(null);
  const onTitleRef = useRef(onTitle);
  onTitleRef.current = onTitle;

  const load = async () => {
    try {
      const r = await LegalServiceService.getService(serviceId);
      setService(r.data); setError(null);
      onTitleRef.current(`${r.data.service_number} · ${r.data.title}`);
      try { const f = await LegalServiceService.getStatusFlow(r.data.service_type); setFlow(f.data ?? []); } catch { setFlow([]); }
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر فتح الخدمة'); }
  };
  useEffect(() => { setService(null); setTab('sum'); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [serviceId]);

  const moveTo = async (status: string, label: string) => {
    if (!window.confirm(`نقل الخدمة إلى «${label}»؟`)) return;
    setBusy(status);
    try { await LegalServiceService.updateStatus(serviceId, status); toast.success(`صارت الخدمة «${label}»`); await load(); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر تغيير الحالة'); }
    finally { setBusy(null); }
  };

  if (error) return <div className="prj-panel"><div className="prj-panel__body"><div className="prj-error" style={{ margin: 14 }}>{error}</div></div></div>;
  if (!service) return <div className="prj-panel"><div className="prj-panel__body"><div className="prj-empty"><Loader2 size={14} className="ssp2-spin" /> جارٍ فتح الخدمة…</div></div></div>;

  const current = flow.find((f) => f.status === service.status);
  const transitions = (current?.transitions ?? []).map((s) => ({ status: s, label: flow.find((f) => f.status === s)?.label ?? s }));
  const Workspace = WorkspaceRegistry[service.service_type];
  const typeLabel = SERVICE_TYPE_LABELS[service.service_type] ?? service.service_type;

  return (
    <div className="prj-panel">
      <div className="prj-panel__head">
        <div className="prj-panel__title">
          <span className="prj-badge">خدمة قانونية</span>
          <span className="prj-code" style={{ color: 'var(--pj-navy)', background: 'var(--pj-gold-tint)' }}>{service.service_number}</span>
          <h2>{service.title}</h2>
          <Chip tone="review">{current?.label ?? service.status}</Chip>
          {service.priority && service.priority !== 'medium' && <Chip tone="hold">أولوية {PRIORITY_AR[service.priority] ?? service.priority}</Chip>}
        </div>
        <div className="prj-panel__sub">
          <span>{typeLabel}</span>
          {service.client && <span>العميل <button type="button" className="prj-link" onClick={() => openIn({ type: 'client', id: service.client!.id })}>{service.client.name}</button></span>}
          {service.assigned_lawyer && <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>المسؤول <Av name={service.assigned_lawyer.name} /> {service.assigned_lawyer.name}</span>}
          {(service.start_date || service.due_date) && <span className="num">{service.start_date ? `بدأت ${fmtDate(service.start_date)}` : ''}{service.due_date ? ` · الموعد ${fmtDate(service.due_date)}` : ''}</span>}
          {service.case_model && <span>تحولت إلى قضية <button type="button" className="prj-link" onClick={() => openIn({ type: 'case', id: service.case_model!.id })}>{service.case_model.case_number}</button></span>}
        </div>
      </div>
      <div className="prj-panel__acts">
        {canEdit && transitions.map((t) => <button type="button" key={t.status} className="prj-btn prj-btn--sm prj-btn--primary" disabled={busy !== null} onClick={() => moveTo(t.status, t.label)}>{busy === t.status ? <Loader2 size={12} className="ssp2-spin" /> : <ArrowLeft size={12} />} {t.label}</button>)}
        {canEdit && transitions.length === 0 && <span className="prj-dim" style={{ fontSize: 11 }}>لا انتقال متاح من هذه الحالة.</span>}
      </div>
      <div className="prj-dr-tabs">
        {([['sum', 'ملخص'], ['work', 'مساحة العمل'], ['deliv', 'المخرجات'], ['time', 'الوقت'], ['chat', 'المحادثة']] as Array<[Tab, string]>).map(([k, l]) => (
          <button type="button" key={k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      <div className="prj-panel__body">
        {tab === 'sum' && (
          <>
            {flow.length > 0 && <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--pj-line)' }}><ServiceStatusPipeline statusFlow={flow} currentStatus={service.status} /></div>}
            <div className="prj-kv2">
              <div><span className="k">النوع</span><span className="v">{typeLabel}</span></div>
              <div><span className="k">الحالة</span><span className="v">{current?.label ?? service.status}</span></div>
              <div><span className="k">الفوترة</span><span className="v">{service.billing_type === 'hourly' ? `بالساعة${service.hourly_rate ? ` · ${service.hourly_rate} ريال` : ''}` : service.agreed_amount ? `مبلغ متفق ${service.agreed_amount} ريال` : service.billing_type || '—'}</span></div>
              <div><span className="k">العقد</span><span className="v">{service.contract ? `${service.contract.contract_number} · ${service.contract.status}` : '—'}</span></div>
              <div><span className="k">الفريق</span><span className="v">{service.assignees?.length ? service.assignees.map((a) => a.name.split(' ')[0]).join('، ') : service.assigned_lawyer?.name ?? '—'}</span></div>
              <div><span className="k">آخر تحديث</span><span className="v num">{fmtDate(service.updated_at)}</span></div>
            </div>
            {service.description && <section className="prj-sec"><div className="prj-sec__head"><FileText size={13} /> الوصف</div><div className="prj-sec__body"><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{service.description}</p></div></section>}
            {service.work_notes && <section className="prj-sec" style={{ borderBottom: 0 }}><div className="prj-sec__head"><Layers size={13} /> ملاحظات العمل</div><div className="prj-sec__body"><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{service.work_notes}</p></div></section>}
          </>
        )}
        {tab === 'work' && (Workspace
          ? <div style={{ padding: '8px 14px' }}><Workspace service={service} refreshService={load} /></div>
          : <div className="prj-empty">مساحة عمل «{typeLabel}» تُفتح من صفحة الخدمة. <button type="button" className="prj-link" onClick={() => navigate(`/legal-services/${serviceId}`)}>افتح صفحة الخدمة</button></div>)}
        {tab === 'deliv' && <div style={{ padding: '8px 14px' }}><DeliverablesPanel serviceId={service.id} serviceType={service.service_type} /></div>}
        {tab === 'time' && <div style={{ padding: '8px 14px' }}><ServiceTimerWidget serviceId={service.id} /></div>}
        {tab === 'chat' && <div className="prj-panel__chat"><ServiceTeamChat serviceId={service.id} /></div>}
      </div>
      <div className="prj-panel__foot">
        <Clock size={12} />
        <span>تعديل بيانات الخدمة والعقد وتحويلها إلى قضية والفوترة الكاملة من صفحتها.</span>
        <span className="prj-spacer" />
        <button type="button" className="prj-btn prj-btn--sm" onClick={() => navigate(`/legal-services/${serviceId}`)}><ExternalLink size={12} /> صفحة الخدمة</button>
        <MessageSquare size={0} />
      </div>
    </div>
  );
};

export default ServicePanel;
