import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, Users, User, Edit2, Plus, X, Calendar, Clock, MapPin,
  DollarSign, FileText, Award, Handshake, Hash, Mail, Phone,
  ChevronDown, ChevronUp, Gavel,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../../services/legalServiceService';
import { useDynamicList } from '../../../hooks/useDynamicList';
import type { WorkspaceProps, MicroStatItem } from './types';
import type { ArbitrationParty, ArbitrationHearing, PanelMember } from '../../../types/legalServices';
import MicroStatsBar from './MicroStatsBar';
import LegalRichEditorField from '../LegalRichEditorField';
import LegalRichText from '../LegalRichText';
import PhoneField from '../../PhoneField';

// ── تسميات عربية ──

const DISPUTE_TYPE_LABELS: Record<string, string> = {
  commercial: 'تجاري', construction: 'إنشائي', real_estate: 'عقاري', labor: 'عمالي',
  partnership: 'شراكة', insurance: 'تأمين', banking: 'مصرفي', other: 'أخرى',
};
const RESOLUTION_METHOD_LABELS: Record<string, string> = {
  arbitration: 'تحكيم', mediation: 'وساطة', conciliation: 'مصالحة',
};
const LAWYER_ROLE_LABELS: Record<string, string> = {
  arbitrator: 'محكّم', claimant_representative: 'ممثل المدعي', respondent_representative: 'ممثل المدعى عليه', mediator: 'وسيط',
};
const HEARING_TYPE_LABELS: Record<string, string> = { in_person: 'حضوري', remote: 'عن بُعد' };
const PARTY_TYPE_LABELS: Record<string, string> = { individual: 'فرد', company: 'شركة' };

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return d; }
}
function formatCurrency(a: string | number | null | undefined): string {
  if (!a) return '—';
  return `${Number(a).toLocaleString('ar-SA')} ر.س`;
}
function getDaysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

// ── المكون الرئيسي ──

const ArbitrationWorkspace: React.FC<WorkspaceProps> = ({ service, refreshService }) => {
  const detail = service.arbitration_detail;

  // حالات
  const [editingParties, setEditingParties] = useState(false);
  const [claimantData, setClaimantData] = useState<Partial<ArbitrationParty>>({});
  const [respondentData, setRespondentData] = useState<Partial<ArbitrationParty>>({});
  const [partiesLoading, setPartiesLoading] = useState(false);

  const [editingPanel, setEditingPanel] = useState(false);
  const [panelData, setPanelData] = useState<{ arbitrator_name: string; arbitrator_license_number: string; arbitration_panel: PanelMember[] }>({ arbitrator_name: '', arbitrator_license_number: '', arbitration_panel: [] });
  const [panelLoading, setPanelLoading] = useState(false);

  const [showAddHearing, setShowAddHearing] = useState(false);
  const [newHearing, setNewHearing] = useState<Partial<ArbitrationHearing>>({});
  const [expandedHearing, setExpandedHearing] = useState<number | null>(null);
  const [editingHearingIdx, setEditingHearingIdx] = useState<number | null>(null);
  const [editHearingData, setEditHearingData] = useState<Partial<ArbitrationHearing>>({});

  const [showAwardForm, setShowAwardForm] = useState(false);
  const [awardData, setAwardData] = useState<Record<string, any>>({});
  const [awardLoading, setAwardLoading] = useState(false);

  const [showSettlementForm, setShowSettlementForm] = useState(false);
  const [settlementData, setSettlementData] = useState<Record<string, any>>({});
  const [settlementLoading, setSettlementLoading] = useState(false);

  const hearings = useMemo(() => detail?.hearings ?? [], [detail?.hearings]);

  // useDynamicList للجلسات
  const hearingList = useDynamicList<ArbitrationHearing>({
    items: hearings,
    onAdd: (item) => LegalServiceService.addHearing(service.id, item),
    onUpdate: (idx, data) => LegalServiceService.updateHearing(service.id, idx, data),
    refreshService,
    addSuccessMessage: 'تمت إضافة الجلسة',
    updateSuccessMessage: 'تم تحديث الجلسة',
  });

  // الجلسة القادمة
  const nextHearing = useMemo(() => {
    const now = Date.now();
    const upcoming = hearings.filter(h => h.date && new Date(h.date).getTime() > now).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return upcoming[0] || null;
  }, [hearings]);
  const daysToNext = getDaysUntil(nextHearing?.date);

  if (!detail) {
    return (<div className="lsd-empty-tab"><Scale size={32} /><p>لا توجد تفاصيل للتحكيم</p></div>);
  }

  // ── معالجات ──

  const handleSaveParties = async () => {
    setPartiesLoading(true);
    try {
      const res = await LegalServiceService.updateArbitrationParties(service.id, { claimant: claimantData, respondent: respondentData });
      if (res.success) { toast.success('تم حفظ بيانات الأطراف'); setEditingParties(false); await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ في الاتصال'); }
    finally { setPartiesLoading(false); }
  };

  const handleSavePanel = async () => {
    setPanelLoading(true);
    try {
      const res = await LegalServiceService.updateArbitrationPanel(service.id, panelData);
      if (res.success) { toast.success('تم حفظ هيئة التحكيم'); setEditingPanel(false); await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ في الاتصال'); }
    finally { setPanelLoading(false); }
  };

  const handleSaveAward = async () => {
    setAwardLoading(true);
    try {
      const res = await LegalServiceService.recordAward(service.id, awardData);
      if (res.success) { toast.success('تم تسجيل الحكم'); setShowAwardForm(false); await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ في الاتصال'); }
    finally { setAwardLoading(false); }
  };

  const handleSaveSettlement = async () => {
    setSettlementLoading(true);
    try {
      const res = await LegalServiceService.recordSettlement(service.id, settlementData);
      if (res.success) { toast.success('تم تسجيل التسوية'); setShowSettlementForm(false); await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ في الاتصال'); }
    finally { setSettlementLoading(false); }
  };

  // ── حفظ النصوص الغنية (محضر الصلح / ملخص الحكم) ──
  // نحافظ على الحقول المنظَّمة الحالية حتى لا يمسحها الحفظ الجزئي.
  const handleSaveSettlementTerms = async (html: string) => {
    const res = await LegalServiceService.recordSettlement(service.id, {
      settlement_terms: html,
      settlement_date: detail?.settlement_date ?? null,
    });
    if (!res?.success) throw new Error(res?.message || 'تعذّر الحفظ');
    await refreshService();
  };

  const handleSaveAwardSummary = async (html: string) => {
    const res = await LegalServiceService.recordAward(service.id, {
      award_summary: html,
      award_amount: detail?.award_amount ?? null,
      award_date: detail?.award_date ?? null,
      award_enforceable: detail?.award_enforceable ?? false,
    });
    if (!res?.success) throw new Error(res?.message || 'تعذّر الحفظ');
    await refreshService();
  };

  // ── عرض طرف ──
  const renderPartyInfo = (party: ArbitrationParty | null, label: string) => {
    if (!party?.name) return <div style={{ fontSize: 13, color: 'var(--quiet-gray-400)' }}>لم تُضف بيانات {label} بعد</div>;
    return (
      <div className="lsd-info-grid">
        <div className="lsd-info-item"><div className="lsd-info-item__icon"><User size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">الاسم</div><div className="lsd-info-item__value">{party.name}</div></div></div>
        {party.type && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Hash size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">النوع</div><div className="lsd-info-item__value">{PARTY_TYPE_LABELS[party.type] || party.type}</div></div></div>}
        {party.id_number && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Hash size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">رقم الهوية</div><div className="lsd-info-item__value">{party.id_number}</div></div></div>}
        {party.representative && <div className="lsd-info-item"><div className="lsd-info-item__icon"><User size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">الممثل</div><div className="lsd-info-item__value">{party.representative}</div></div></div>}
        {party.contact_phone && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Phone size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">الهاتف</div><div className="lsd-info-item__value" dir="ltr">{party.contact_phone}</div></div></div>}
        {party.contact_email && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Mail size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">البريد</div><div className="lsd-info-item__value" dir="ltr">{party.contact_email}</div></div></div>}
      </div>
    );
  };

  // ── نموذج تعديل طرف ──
  const renderPartyForm = (data: Partial<ArbitrationParty>, setData: (d: Partial<ArbitrationParty>) => void) => (
    <div className="lsd-info-grid">
      <div className="lsd-form-group"><label className="lsd-form-label">الاسم</label><input className="lsd-form-input" value={data.name || ''} onChange={e => setData({ ...data, name: e.target.value })} /></div>
      <div className="lsd-form-group"><label className="lsd-form-label">النوع</label><select className="lsd-form-input" value={data.type || ''} onChange={e => setData({ ...data, type: e.target.value as any })}><option value="">اختر</option><option value="individual">فرد</option><option value="company">شركة</option></select></div>
      <div className="lsd-form-group"><label className="lsd-form-label">رقم الهوية</label><input className="lsd-form-input" value={data.id_number || ''} onChange={e => setData({ ...data, id_number: e.target.value })} /></div>
      <div className="lsd-form-group"><label className="lsd-form-label">الممثل</label><input className="lsd-form-input" value={data.representative || ''} onChange={e => setData({ ...data, representative: e.target.value })} /></div>
      <div className="lsd-form-group"><label className="lsd-form-label">الهاتف</label><PhoneField value={data.contact_phone || ''} onChange={v => setData({ ...data, contact_phone: v })} placeholder="5X XXX XXXX" /></div>
      <div className="lsd-form-group"><label className="lsd-form-label">البريد</label><input className="lsd-form-input" value={data.contact_email || ''} onChange={e => setData({ ...data, contact_email: e.target.value })} dir="ltr" /></div>
    </div>
  );

  return (
    <div className="lsd-tab-content-stack">

      {/* ── شريط المؤشرات ── */}
      <MicroStatsBar items={[
        ...(detail.claim_amount ? [{ label: 'المطالبة', value: formatCurrency(detail.claim_amount), icon: DollarSign as any, color: 'blue' as const }] : []),
        { label: 'الجلسات', value: `${hearings.length}`, icon: Calendar, color: 'purple' as const },
        ...(daysToNext !== null ? [{ label: 'الجلسة القادمة', value: daysToNext > 0 ? `بعد ${daysToNext} يوم` : daysToNext === 0 ? 'اليوم' : `فاتت`, icon: Clock as any, color: (daysToNext <= 1 ? 'red' : daysToNext <= 3 ? 'amber' : 'green') as MicroStatItem['color'] }] : []),
        { label: 'طريقة الحل', value: RESOLUTION_METHOD_LABELS[detail.resolution_method] || '—', icon: Scale, color: 'gray' as const },
      ]} />

      {/* ── بطاقة بيانات النزاع ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><Scale size={15} /> بيانات النزاع</div>
        </div>
        <div className="lsd-card__content">
          <div className="lsd-info-grid">
            {detail.dispute_type && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Scale size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">نوع النزاع</div><div className="lsd-info-item__value">{DISPUTE_TYPE_LABELS[detail.dispute_type] || detail.dispute_type}</div></div></div>}
            <div className="lsd-info-item"><div className="lsd-info-item__icon"><Scale size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">طريقة الحل</div><div className="lsd-info-item__value">{RESOLUTION_METHOD_LABELS[detail.resolution_method]}</div></div></div>
            {detail.lawyer_role && <div className="lsd-info-item"><div className="lsd-info-item__icon"><User size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">دور المحامي</div><div className="lsd-info-item__value">{LAWYER_ROLE_LABELS[detail.lawyer_role]}</div></div></div>}
            {detail.claim_amount && <div className="lsd-info-item"><div className="lsd-info-item__icon"><DollarSign size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">مبلغ المطالبة</div><div className="lsd-info-item__value">{formatCurrency(detail.claim_amount)}</div></div></div>}
          </div>
          {detail.dispute_summary && <div className="lsd-notes-section" style={{ marginTop: 12 }}><div className="lsd-notes-section__label">ملخص النزاع</div><p className="lsd-description-text">{detail.dispute_summary}</p></div>}
        </div>
      </div>

      {/* ── بطاقة أطراف النزاع ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><Users size={15} /> أطراف النزاع</div>
          <button className="lsd-card__action" onClick={() => {
            setEditingParties(true);
            setClaimantData(detail.claimant || {});
            setRespondentData(detail.respondent || {});
          }}><Edit2 size={13} /> تعديل</button>
        </div>
        <div className="lsd-card__content">
          {editingParties ? (
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#16a34a' }}>المدعي</h4>
              {renderPartyForm(claimantData, setClaimantData)}
              <h4 style={{ fontSize: 13, fontWeight: 600, margin: '16px 0 8px', color: '#dc2626' }}>المدعى عليه</h4>
              {renderPartyForm(respondentData, setRespondentData)}
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingParties(false)}>إلغاء</button>
                <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveParties} disabled={partiesLoading}>{partiesLoading ? 'جارٍ...' : 'حفظ'}</button>
              </div>
            </div>
          ) : (
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#16a34a' }}>المدعي</h4>
              {renderPartyInfo(detail.claimant, 'المدعي')}
              <h4 style={{ fontSize: 13, fontWeight: 600, margin: '16px 0 8px', color: '#dc2626' }}>المدعى عليه</h4>
              {renderPartyInfo(detail.respondent, 'المدعى عليه')}
            </div>
          )}
        </div>
      </div>

      {/* ── بطاقة هيئة التحكيم ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><Award size={15} /> هيئة التحكيم</div>
          <button className="lsd-card__action" onClick={() => {
            setEditingPanel(true);
            setPanelData({ arbitrator_name: detail.arbitrator_name || '', arbitrator_license_number: detail.arbitrator_license_number || '', arbitration_panel: detail.arbitration_panel || [] });
          }}><Edit2 size={13} /> تعديل</button>
        </div>
        <div className="lsd-card__content">
          {editingPanel ? (
            <div>
              <div className="lsd-info-grid">
                <div className="lsd-form-group"><label className="lsd-form-label">المحكّم الرئيسي</label><input className="lsd-form-input" value={panelData.arbitrator_name} onChange={e => setPanelData({ ...panelData, arbitrator_name: e.target.value })} /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">رقم الترخيص</label><input className="lsd-form-input" value={panelData.arbitrator_license_number} onChange={e => setPanelData({ ...panelData, arbitrator_license_number: e.target.value })} dir="ltr" /></div>
              </div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingPanel(false)}>إلغاء</button>
                <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSavePanel} disabled={panelLoading}>{panelLoading ? 'جارٍ...' : 'حفظ'}</button>
              </div>
            </div>
          ) : (
            <div className="lsd-info-grid">
              {detail.arbitrator_name && <div className="lsd-info-item"><div className="lsd-info-item__icon"><User size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">المحكّم الرئيسي</div><div className="lsd-info-item__value">{detail.arbitrator_name}</div></div></div>}
              {detail.arbitrator_license_number && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Hash size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">رقم الترخيص</div><div className="lsd-info-item__value">{detail.arbitrator_license_number}</div></div></div>}
              {!detail.arbitrator_name && <div style={{ fontSize: 13, color: 'var(--quiet-gray-400)' }}>لم تُضف بيانات هيئة التحكيم بعد</div>}
            </div>
          )}
        </div>
      </div>

      {/* ── بطاقة الجلسات (Horizontal Timeline) ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><Calendar size={15} /> الجلسات {hearings.length > 0 && <span className="lsd-tab__count">{hearings.length}</span>}</div>
          <button className="lsd-card__action" onClick={() => setShowAddHearing(true)}><Plus size={13} /> إضافة جلسة</button>
        </div>
        <div className="lsd-card__content">
          {/* نموذج إضافة جلسة */}
          <AnimatePresence>
            {showAddHearing && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: 12, background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>إضافة جلسة جديدة</h4>
                  <div className="lsd-info-grid">
                    <div className="lsd-form-group"><label className="lsd-form-label">التاريخ *</label><input className="lsd-form-input" type="date" value={newHearing.date || ''} onChange={e => setNewHearing({ ...newHearing, date: e.target.value })} dir="ltr" /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">الوقت</label><input className="lsd-form-input" type="time" value={newHearing.time || ''} onChange={e => setNewHearing({ ...newHearing, time: e.target.value })} dir="ltr" /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">المكان</label><input className="lsd-form-input" value={newHearing.location || ''} onChange={e => setNewHearing({ ...newHearing, location: e.target.value })} /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">النوع</label><select className="lsd-form-input" value={newHearing.type || ''} onChange={e => setNewHearing({ ...newHearing, type: e.target.value as any })}><option value="">اختر</option><option value="in_person">حضوري</option><option value="remote">عن بُعد</option></select></div>
                  </div>
                  <div className="lsd-form-group" style={{ marginTop: 8 }}><label className="lsd-form-label">جدول الأعمال</label><textarea className="lsd-form-textarea" rows={2} value={newHearing.agenda || ''} onChange={e => setNewHearing({ ...newHearing, agenda: e.target.value })} placeholder="جدول أعمال الجلسة..." /></div>
                  <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                    <button className="lsd-header-btn" onClick={() => { setShowAddHearing(false); setNewHearing({}); }}>إلغاء</button>
                    <button className="lsd-header-btn lsd-header-btn--primary" onClick={() => {
                      if (!newHearing.date) { toast.error('يرجى تحديد تاريخ الجلسة'); return; }
                      hearingList.handleAdd({ ...newHearing, date: newHearing.date! });
                      setNewHearing({});
                      setShowAddHearing(false);
                    }} disabled={hearingList.addLoading}>{hearingList.addLoading ? 'جارٍ...' : 'إضافة'}</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Timeline أفقي */}
          {hearings.length > 0 ? (
            <>
              <div className="lsd-horizontal-timeline">
                {hearings.map((h, idx) => {
                  const isPast = h.date && new Date(h.date).getTime() < Date.now();
                  const isExpanded = expandedHearing === idx;
                  return (
                    <React.Fragment key={idx}>
                      <div
                        className={`lsd-ht-node ${isPast ? 'lsd-ht-node--done' : ''}`}
                        onClick={() => setExpandedHearing(isExpanded ? null : idx)}
                        style={{ cursor: 'pointer' }}
                        title={`الجلسة ${idx + 1}`}
                      >
                        <div className="lsd-ht-node__circle">{idx + 1}</div>
                        <div className="lsd-ht-node__label">{formatDate(h.date)}</div>
                        {h.type && <div className="lsd-ht-node__date">{HEARING_TYPE_LABELS[h.type] || h.type}</div>}
                      </div>
                      {idx < hearings.length - 1 && <div className={`lsd-ht-line ${isPast ? 'lsd-ht-line--done' : ''}`} />}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* تفاصيل الجلسة المختارة */}
              <AnimatePresence>
                {expandedHearing !== null && hearings[expandedHearing] && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                    <div style={{ padding: 12, background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8, marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>تفاصيل الجلسة {expandedHearing + 1}</h4>
                        <button className="lsd-card__action" onClick={() => {
                          setEditingHearingIdx(expandedHearing);
                          setEditHearingData({ ...hearings[expandedHearing] });
                        }}><Edit2 size={13} /> تعديل</button>
                      </div>
                      {editingHearingIdx === expandedHearing ? (
                        <div>
                          <div className="lsd-info-grid">
                            <div className="lsd-form-group"><label className="lsd-form-label">التاريخ</label><input className="lsd-form-input" type="date" value={editHearingData.date || ''} onChange={e => setEditHearingData({ ...editHearingData, date: e.target.value })} dir="ltr" /></div>
                            <div className="lsd-form-group"><label className="lsd-form-label">الوقت</label><input className="lsd-form-input" type="time" value={editHearingData.time || ''} onChange={e => setEditHearingData({ ...editHearingData, time: e.target.value })} dir="ltr" /></div>
                            <div className="lsd-form-group"><label className="lsd-form-label">المكان</label><input className="lsd-form-input" value={editHearingData.location || ''} onChange={e => setEditHearingData({ ...editHearingData, location: e.target.value })} /></div>
                          </div>
                          <div className="lsd-form-group" style={{ marginTop: 8 }}><label className="lsd-form-label">النتيجة</label><textarea className="lsd-form-textarea" rows={2} value={editHearingData.outcome || ''} onChange={e => setEditHearingData({ ...editHearingData, outcome: e.target.value })} placeholder="نتيجة الجلسة..." /></div>
                          <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                            <button className="lsd-header-btn" onClick={() => setEditingHearingIdx(null)}>إلغاء</button>
                            <button className="lsd-header-btn lsd-header-btn--primary" onClick={() => {
                              hearingList.handleUpdate(expandedHearing, editHearingData);
                              setEditingHearingIdx(null);
                            }} disabled={hearingList.updateLoadingIdx === expandedHearing}>{hearingList.updateLoadingIdx === expandedHearing ? 'جارٍ...' : 'حفظ'}</button>
                          </div>
                        </div>
                      ) : (
                        <div className="lsd-info-grid">
                          <div className="lsd-info-item"><div className="lsd-info-item__icon"><Calendar size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">التاريخ</div><div className="lsd-info-item__value">{formatDate(hearings[expandedHearing].date)}</div></div></div>
                          {hearings[expandedHearing].time && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Clock size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">الوقت</div><div className="lsd-info-item__value">{hearings[expandedHearing].time}</div></div></div>}
                          {hearings[expandedHearing].location && <div className="lsd-info-item"><div className="lsd-info-item__icon"><MapPin size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">المكان</div><div className="lsd-info-item__value">{hearings[expandedHearing].location}</div></div></div>}
                          {hearings[expandedHearing].agenda && <div className="lsd-info-item"><div className="lsd-info-item__icon"><FileText size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">جدول الأعمال</div><div className="lsd-info-item__value">{hearings[expandedHearing].agenda}</div></div></div>}
                          {hearings[expandedHearing].outcome && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Award size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">النتيجة</div><div className="lsd-info-item__value">{hearings[expandedHearing].outcome}</div></div></div>}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            !showAddHearing && (
              <div className="lsd-empty-state-small">
                <Calendar size={22} />
                <span>لا توجد جلسات مجدولة بعد</span>
                <button className="lsd-header-btn lsd-header-btn--primary" style={{ marginTop: 8 }} onClick={() => setShowAddHearing(true)}>
                  <Plus size={13} /> إضافة الجلسة الأولى
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── بطاقة الحكم ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><Award size={15} /> الحكم</div>
          <button className="lsd-card__action" onClick={() => {
            setShowAwardForm(true);
            setAwardData({
              award_summary: detail.award_summary || '',
              award_amount: detail.award_amount ?? '',
              award_date: detail.award_date || '',
              award_enforceable: detail.award_enforceable || false,
            });
          }}><Edit2 size={13} /> {(detail.award_amount || detail.award_date || detail.award_enforceable) ? 'تعديل التفاصيل' : 'تسجيل التفاصيل'}</button>
        </div>
        <div className="lsd-card__content">
          {/* ملخص الحكم — محرّر غني */}
          <LegalRichEditorField
            label="ملخص الحكم"
            icon={Award}
            value={detail.award_summary}
            onSave={handleSaveAwardSummary}
            placeholder="اكتب ملخص الحكم الصادر عن هيئة التحكيم..."
            emptyText="لم يُسجَّل ملخص الحكم بعد — اضغط «تعديل» لبدء الكتابة"
            successMessage="تم حفظ ملخص الحكم"
          />

          {/* الحقول المنظَّمة: المبلغ / التاريخ / قابلية التنفيذ */}
          <AnimatePresence>
            {showAwardForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginTop: 12 }}>
                <div style={{ padding: 12, background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
                  <div className="lsd-info-grid">
                    <div className="lsd-form-group"><label className="lsd-form-label">المبلغ المحكوم</label><input className="lsd-form-input" type="number" value={awardData.award_amount || ''} onChange={e => setAwardData({ ...awardData, award_amount: e.target.value })} dir="ltr" /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">تاريخ الحكم</label><input className="lsd-form-input" type="date" value={awardData.award_date || ''} onChange={e => setAwardData({ ...awardData, award_date: e.target.value })} dir="ltr" /></div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginTop: 8 }}>
                    <input type="checkbox" checked={awardData.award_enforceable || false} onChange={e => setAwardData({ ...awardData, award_enforceable: e.target.checked })} /> قابل للتنفيذ
                  </label>
                  <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                    <button className="lsd-header-btn" onClick={() => setShowAwardForm(false)}>إلغاء</button>
                    <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveAward} disabled={awardLoading}>{awardLoading ? 'جارٍ...' : 'حفظ التفاصيل'}</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!showAwardForm && (detail.award_amount || detail.award_date || detail.award_enforceable) && (
            <div className="lsd-info-grid" style={{ marginTop: 12 }}>
              {detail.award_amount && <div className="lsd-info-item"><div className="lsd-info-item__icon"><DollarSign size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">المبلغ المحكوم</div><div className="lsd-info-item__value">{formatCurrency(detail.award_amount)}</div></div></div>}
              {detail.award_date && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Calendar size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">تاريخ الحكم</div><div className="lsd-info-item__value">{formatDate(detail.award_date)}</div></div></div>}
              <div className="lsd-info-item"><div className="lsd-info-item__icon"><Award size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">قابلية التنفيذ</div><div className="lsd-info-item__value">{detail.award_enforceable ? 'نعم' : 'لا'}</div></div></div>
            </div>
          )}
        </div>
      </div>

      {/* ── بطاقة التسوية ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><Handshake size={15} /> التسوية</div>
          <button className="lsd-card__action" onClick={() => {
            setShowSettlementForm(true);
            setSettlementData({
              settlement_terms: detail.settlement_terms || '',
              settlement_date: detail.settlement_date || '',
            });
          }}><Edit2 size={13} /> {detail.settlement_date ? 'تعديل التاريخ' : 'تسجيل التاريخ'}</button>
        </div>
        <div className="lsd-card__content">
          {/* محضر الصلح — محرّر غني */}
          <LegalRichEditorField
            label="محضر الصلح"
            icon={Handshake}
            value={detail.settlement_terms}
            onSave={handleSaveSettlementTerms}
            placeholder="اكتب بنود محضر الصلح الملزِم بين الأطراف..."
            emptyText="لم يُسجَّل محضر الصلح بعد — اضغط «تعديل» لبدء الكتابة"
            successMessage="تم حفظ محضر الصلح"
          />

          {/* تاريخ التسوية — حقل منظَّم */}
          <AnimatePresence>
            {showSettlementForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginTop: 12 }}>
                <div style={{ padding: 12, background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
                  <div className="lsd-form-group"><label className="lsd-form-label">تاريخ التسوية</label><input className="lsd-form-input" type="date" value={settlementData.settlement_date || ''} onChange={e => setSettlementData({ ...settlementData, settlement_date: e.target.value })} dir="ltr" /></div>
                  <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                    <button className="lsd-header-btn" onClick={() => setShowSettlementForm(false)}>إلغاء</button>
                    <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveSettlement} disabled={settlementLoading}>{settlementLoading ? 'جارٍ...' : 'حفظ التاريخ'}</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!showSettlementForm && detail.settlement_date && (
            <div className="lsd-info-grid" style={{ marginTop: 12 }}>
              <div className="lsd-info-item"><div className="lsd-info-item__icon"><Calendar size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">تاريخ التسوية</div><div className="lsd-info-item__value">{formatDate(detail.settlement_date)}</div></div></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArbitrationWorkspace;
