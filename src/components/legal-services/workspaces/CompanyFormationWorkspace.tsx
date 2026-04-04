import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, User, Edit2, Plus, X, Calendar, Hash, Check,
  ShieldCheck, FileText, CheckCircle, Tag, MapPin, DollarSign,
  BarChart2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../../services/legalServiceService';
import { useDynamicList } from '../../../hooks/useDynamicList';
import type { WorkspaceProps, MicroStatItem } from './types';
import type { CompanyPartner, DocumentChecklistItem } from '../../../types/legalServices';
import MicroStatsBar from './MicroStatsBar';

// ── تسميات عربية ──

const ENTITY_TYPE_LABELS: Record<string, string> = {
  llc: 'شركة ذات مسؤولية محدودة', single_person: 'شركة الشخص الواحد',
  simplified_jsc: 'شركة مساهمة مبسطة', jsc: 'شركة مساهمة',
  foreign_branch: 'فرع شركة أجنبية', professional: 'شركة مهنية', holding: 'شركة قابضة',
};

const NAME_STATUS_LABELS: Record<string, string> = { pending: 'قيد المراجعة', approved: 'معتمد', rejected: 'مرفوض' };
const NAME_STATUS_COLORS: Record<string, string> = { pending: '#f59e0b', approved: '#16a34a', rejected: '#dc2626' };
const PARTNER_TYPE_LABELS: Record<string, string> = { managing: 'شريك مدير', silent: 'شريك موصٍ', general: 'شريك متضامن' };

const DEFAULT_AUTHORITIES = [
  'البيع والشراء', 'الاقتراض والإقراض', 'التوقيع على العقود', 'التوظيف والفصل',
  'فتح وإغلاق الحسابات البنكية', 'تمثيل الشركة أمام الجهات الحكومية', 'رهن أصول الشركة',
  'التنازل عن الحقوق', 'إصدار الكفالات',
];

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return d; }
}

// ── المكون الرئيسي ──

const CompanyFormationWorkspace: React.FC<WorkspaceProps> = ({ service, refreshService }) => {
  const detail = service.company_formation_detail;

  // حالات
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsData, setDetailsData] = useState<Record<string, any>>({});
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [showAddPartner, setShowAddPartner] = useState(false);
  const [newPartner, setNewPartner] = useState<Partial<CompanyPartner>>({});

  const [editingAuthorities, setEditingAuthorities] = useState(false);
  const [authoritiesData, setAuthoritiesData] = useState<any[]>([]);
  const [authoritiesLoading, setAuthoritiesLoading] = useState(false);

  const [editingGov, setEditingGov] = useState(false);
  const [govData, setGovData] = useState<Record<string, any>>({});
  const [govLoading, setGovLoading] = useState(false);

  const [editingPostCr, setEditingPostCr] = useState(false);
  const [postCrData, setPostCrData] = useState<Record<string, any>>({});
  const [postCrLoading, setPostCrLoading] = useState(false);

  const [checklistLoading, setChecklistLoading] = useState(false);

  const [progress, setProgress] = useState<{ completion_percentage: number } | null>(null);

  const partners = useMemo(() => detail?.partners ?? [], [detail?.partners]);
  const checklist = useMemo(() => detail?.document_checklist ?? [], [detail?.document_checklist]);
  const authorities = useMemo(() => detail?.manager_authorities ?? [], [detail?.manager_authorities]);

  // جلب نسبة الإنجاز
  useEffect(() => {
    if (service.id) {
      LegalServiceService.getFormationProgress(service.id).then(res => {
        if (res.success) setProgress(res.data);
      }).catch(() => {});
    }
  }, [service.id, detail]);

  if (!detail) {
    return (<div className="lsd-empty-tab"><Building2 size={32} /><p>لا توجد تفاصيل لتأسيس الشركة</p></div>);
  }

  // ── معالجات ──

  const handleSaveDetails = async () => {
    setDetailsLoading(true);
    try {
      const res = await LegalServiceService.updateCompanyDetails(service.id, detailsData);
      if (res.success) { toast.success('تم حفظ بيانات الشركة'); setEditingDetails(false); await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ في الاتصال'); }
    finally { setDetailsLoading(false); }
  };

  const handleSavePartners = async (updatedPartners: CompanyPartner[]) => {
    try {
      const res = await LegalServiceService.updatePartners(service.id, updatedPartners);
      if (res.success) { toast.success('تم تحديث الشركاء'); await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ في الاتصال'); }
  };

  const handleAddPartner = async () => {
    if (!newPartner.name?.trim()) { toast.error('يرجى إدخال اسم الشريك'); return; }
    const updated = [...partners, { ...newPartner, name: newPartner.name! } as CompanyPartner];
    await handleSavePartners(updated);
    setNewPartner({});
    setShowAddPartner(false);
  };

  const handleRemovePartner = async (idx: number) => {
    const updated = partners.filter((_, i) => i !== idx);
    await handleSavePartners(updated);
  };

  const handleSaveAuthorities = async () => {
    setAuthoritiesLoading(true);
    try {
      const res = await LegalServiceService.updateAuthorities(service.id, authoritiesData);
      if (res.success) { toast.success('تم حفظ الصلاحيات'); setEditingAuthorities(false); await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ في الاتصال'); }
    finally { setAuthoritiesLoading(false); }
  };

  const handleSaveGov = async () => {
    setGovLoading(true);
    try {
      const res = await LegalServiceService.updateGovernmentTracking(service.id, govData);
      if (res.success) { toast.success('تم حفظ التتبع الحكومي'); setEditingGov(false); await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ في الاتصال'); }
    finally { setGovLoading(false); }
  };

  const handleSavePostCr = async () => {
    setPostCrLoading(true);
    try {
      const res = await LegalServiceService.updatePostCr(service.id, postCrData);
      if (res.success) { toast.success('تم حفظ إجراءات ما بعد السجل'); setEditingPostCr(false); await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ في الاتصال'); }
    finally { setPostCrLoading(false); }
  };

  const handleToggleChecklist = async (idx: number) => {
    setChecklistLoading(true);
    const updated = checklist.map((item, i) => i === idx ? { ...item, collected: !item.collected } : item);
    try {
      const res = await LegalServiceService.updateFormationChecklist(service.id, updated);
      if (res.success) await refreshService();
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ'); }
    finally { setChecklistLoading(false); }
  };

  const completedChecklist = checklist.filter(i => i.collected).length;
  const postCrCount = [detail.zatca_registered, detail.gosi_registered, detail.qiwa_registered, detail.municipality_license].filter(Boolean).length;

  return (
    <div className="lsd-tab-content-stack">

      {/* ── شريط المؤشرات ── */}
      <MicroStatsBar items={[
        ...(progress ? [{ label: 'نسبة الإنجاز', value: `${progress.completion_percentage}%`, icon: BarChart2 as any, color: (progress.completion_percentage >= 80 ? 'green' : progress.completion_percentage >= 50 ? 'amber' : 'blue') as MicroStatItem['color'] }] : []),
        { label: 'الشركاء', value: `${partners.length}`, icon: Users, color: 'purple' as const },
        { label: 'الجهات الحكومية', value: `${postCrCount}/4`, icon: ShieldCheck, color: postCrCount === 4 ? 'green' as const : 'amber' as const },
        { label: 'المستندات', value: checklist.length > 0 ? `${completedChecklist}/${checklist.length}` : '—', icon: FileText, color: 'blue' as const },
      ]} />

      {/* ── شريط التقدم ── */}
      {progress && (
        <div className="lsd-card" style={{ marginBottom: 0 }}>
          <div className="lsd-card__content" style={{ padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, background: 'var(--quiet-gray-100, #f3f4f6)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${progress.completion_percentage}%`, height: '100%', background: progress.completion_percentage >= 80 ? '#22c55e' : progress.completion_percentage >= 50 ? '#f59e0b' : '#3b82f6', borderRadius: 6, transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--quiet-gray-700)' }}>{progress.completion_percentage}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ── بطاقة بيانات الشركة ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><Building2 size={15} /> بيانات الشركة</div>
          <button className="lsd-card__action" onClick={() => {
            setEditingDetails(true);
            setDetailsData({
              entity_type: detail.entity_type || '', hq_city: detail.hq_city || '', capital_amount: detail.capital_amount || '',
              business_activity: detail.business_activity || '', isic_code: detail.isic_code || '',
              proposed_name_1: detail.proposed_name_1 || '', proposed_name_2: detail.proposed_name_2 || '', proposed_name_3: detail.proposed_name_3 || '',
              name_reservation_status: detail.name_reservation_status || '', approved_name: detail.approved_name || '',
            });
          }}><Edit2 size={13} /> تعديل</button>
        </div>
        <div className="lsd-card__content">
          {editingDetails ? (
            <div>
              <div className="lsd-info-grid">
                <div className="lsd-form-group"><label className="lsd-form-label">نوع الكيان</label><select className="lsd-form-input" value={detailsData.entity_type || ''} onChange={e => setDetailsData({ ...detailsData, entity_type: e.target.value })}><option value="">اختر</option>{Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="lsd-form-group"><label className="lsd-form-label">المدينة</label><input className="lsd-form-input" value={detailsData.hq_city || ''} onChange={e => setDetailsData({ ...detailsData, hq_city: e.target.value })} /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">رأس المال</label><input className="lsd-form-input" type="number" value={detailsData.capital_amount || ''} onChange={e => setDetailsData({ ...detailsData, capital_amount: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">النشاط التجاري</label><input className="lsd-form-input" value={detailsData.business_activity || ''} onChange={e => setDetailsData({ ...detailsData, business_activity: e.target.value })} /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">كود ISIC</label><input className="lsd-form-input" value={detailsData.isic_code || ''} onChange={e => setDetailsData({ ...detailsData, isic_code: e.target.value })} dir="ltr" /></div>
              </div>
              <h4 style={{ fontSize: 13, fontWeight: 600, margin: '12px 0 8px' }}>الأسماء المقترحة</h4>
              <div className="lsd-info-grid">
                <div className="lsd-form-group"><label className="lsd-form-label">الاسم الأول</label><input className="lsd-form-input" value={detailsData.proposed_name_1 || ''} onChange={e => setDetailsData({ ...detailsData, proposed_name_1: e.target.value })} /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">الاسم الثاني</label><input className="lsd-form-input" value={detailsData.proposed_name_2 || ''} onChange={e => setDetailsData({ ...detailsData, proposed_name_2: e.target.value })} /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">الاسم الثالث</label><input className="lsd-form-input" value={detailsData.proposed_name_3 || ''} onChange={e => setDetailsData({ ...detailsData, proposed_name_3: e.target.value })} /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">حالة حجز الاسم</label><select className="lsd-form-input" value={detailsData.name_reservation_status || ''} onChange={e => setDetailsData({ ...detailsData, name_reservation_status: e.target.value })}><option value="">اختر</option>{Object.entries(NAME_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="lsd-form-group"><label className="lsd-form-label">الاسم المعتمد</label><input className="lsd-form-input" value={detailsData.approved_name || ''} onChange={e => setDetailsData({ ...detailsData, approved_name: e.target.value })} /></div>
              </div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingDetails(false)}>إلغاء</button>
                <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveDetails} disabled={detailsLoading}>{detailsLoading ? 'جارٍ...' : 'حفظ'}</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="lsd-info-grid">
                {detail.entity_type && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Building2 size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">نوع الكيان</div><div className="lsd-info-item__value">{ENTITY_TYPE_LABELS[detail.entity_type]}</div></div></div>}
                {detail.hq_city && <div className="lsd-info-item"><div className="lsd-info-item__icon"><MapPin size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">المدينة</div><div className="lsd-info-item__value">{detail.hq_city}</div></div></div>}
                {detail.capital_amount && <div className="lsd-info-item"><div className="lsd-info-item__icon"><DollarSign size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">رأس المال</div><div className="lsd-info-item__value">{Number(detail.capital_amount).toLocaleString('ar-SA')} ر.س</div></div></div>}
                {detail.business_activity && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Tag size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">النشاط التجاري</div><div className="lsd-info-item__value">{detail.business_activity}</div></div></div>}
                {detail.isic_code && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Hash size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">كود ISIC</div><div className="lsd-info-item__value">{detail.isic_code}</div></div></div>}
                {detail.approved_name && <div className="lsd-info-item"><div className="lsd-info-item__icon"><CheckCircle size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">الاسم المعتمد</div><div className="lsd-info-item__value">{detail.approved_name}</div></div></div>}
              </div>
              {/* الأسماء المقترحة */}
              {(detail.proposed_name_1 || detail.proposed_name_2 || detail.proposed_name_3) && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[detail.proposed_name_1, detail.proposed_name_2, detail.proposed_name_3].map((name, idx) =>
                    name ? (
                      <div key={idx} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, background: 'var(--quiet-gray-50)', border: '1px solid var(--quiet-gray-200)' }}>
                        {name}
                        {detail.name_reservation_status && detail.approved_name === name && <CheckCircle size={12} style={{ marginRight: 4, color: '#16a34a' }} />}
                      </div>
                    ) : null
                  )}
                  {detail.name_reservation_status && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: NAME_STATUS_COLORS[detail.name_reservation_status], padding: '4px 8px' }}>
                      {NAME_STATUS_LABELS[detail.name_reservation_status]}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── بطاقة الشركاء ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><Users size={15} /> الشركاء {partners.length > 0 && <span className="lsd-tab__count">{partners.length}</span>}</div>
          <button className="lsd-card__action" onClick={() => setShowAddPartner(true)}><Plus size={13} /> إضافة شريك</button>
        </div>
        <div className="lsd-card__content">
          <AnimatePresence>
            {showAddPartner && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: 12, background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>إضافة شريك جديد</h4>
                  <div className="lsd-info-grid">
                    <div className="lsd-form-group"><label className="lsd-form-label">الاسم *</label><input className="lsd-form-input" value={newPartner.name || ''} onChange={e => setNewPartner({ ...newPartner, name: e.target.value })} /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">رقم الهوية</label><input className="lsd-form-input" value={newPartner.national_id || ''} onChange={e => setNewPartner({ ...newPartner, national_id: e.target.value })} dir="ltr" /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">الجنسية</label><input className="lsd-form-input" value={newPartner.nationality || ''} onChange={e => setNewPartner({ ...newPartner, nationality: e.target.value })} /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">النسبة %</label><input className="lsd-form-input" type="number" value={newPartner.share_percentage || ''} onChange={e => setNewPartner({ ...newPartner, share_percentage: parseFloat(e.target.value) })} dir="ltr" /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">المبلغ</label><input className="lsd-form-input" type="number" value={newPartner.share_amount || ''} onChange={e => setNewPartner({ ...newPartner, share_amount: parseFloat(e.target.value) })} dir="ltr" /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">نوع الشريك</label><select className="lsd-form-input" value={newPartner.partner_type || ''} onChange={e => setNewPartner({ ...newPartner, partner_type: e.target.value as any })}><option value="">اختر</option>{Object.entries(PARTNER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                  </div>
                  <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                    <button className="lsd-header-btn" onClick={() => { setShowAddPartner(false); setNewPartner({}); }}>إلغاء</button>
                    <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleAddPartner}>إضافة</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {partners.length > 0 ? (
            <div className="lsd-references-list">
              {partners.map((p, idx) => (
                <div key={idx} className="lsd-reference-item" style={{ alignItems: 'center' }}>
                  <div className="lsd-reference-item__icon"><User size={15} /></div>
                  <div className="lsd-reference-item__body" style={{ flex: 1 }}>
                    <div className="lsd-reference-item__title">{p.name}</div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--quiet-gray-500)', flexWrap: 'wrap' }}>
                      {p.nationality && <span>{p.nationality}</span>}
                      {p.share_percentage != null && <span>{p.share_percentage}%</span>}
                      {p.share_amount != null && <span>{Number(p.share_amount).toLocaleString('ar-SA')} ر.س</span>}
                      {p.partner_type && <span>{PARTNER_TYPE_LABELS[p.partner_type] || p.partner_type}</span>}
                    </div>
                  </div>
                  <button className="lsd-doc-action-btn" title="حذف الشريك" onClick={() => handleRemovePartner(idx)}><X size={13} /></button>
                </div>
              ))}
            </div>
          ) : (
            !showAddPartner && (
              <div className="lsd-empty-state-small"><Users size={22} /><span>لم يُضف شركاء بعد</span>
                <button className="lsd-header-btn lsd-header-btn--primary" style={{ marginTop: 8 }} onClick={() => setShowAddPartner(true)}><Plus size={13} /> إضافة الشريك الأول</button>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── بطاقة صلاحيات المدير ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><ShieldCheck size={15} /> صلاحيات المدير</div>
          <button className="lsd-card__action" onClick={() => {
            setEditingAuthorities(true);
            setAuthoritiesData(authorities.length > 0 ? authorities : DEFAULT_AUTHORITIES.map(a => ({ authority: a, granted: false })));
          }}><Edit2 size={13} /> تعديل</button>
        </div>
        <div className="lsd-card__content">
          {editingAuthorities ? (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {authoritiesData.map((a: any, idx: number) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={a.granted} onChange={() => {
                      const updated = [...authoritiesData];
                      updated[idx] = { ...updated[idx], granted: !updated[idx].granted };
                      setAuthoritiesData(updated);
                    }} />
                    {a.authority}
                  </label>
                ))}
              </div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingAuthorities(false)}>إلغاء</button>
                <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveAuthorities} disabled={authoritiesLoading}>{authoritiesLoading ? 'جارٍ...' : 'حفظ'}</button>
              </div>
            </div>
          ) : authorities.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {authorities.map((a: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  {a.granted ? <CheckCircle size={14} color="#16a34a" /> : <X size={14} color="#dc2626" />}
                  <span style={{ color: a.granted ? 'var(--quiet-gray-900)' : 'var(--quiet-gray-400)' }}>{a.authority}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="lsd-empty-state-small"><ShieldCheck size={22} /><span>لم تُحدد الصلاحيات بعد</span></div>
          )}
        </div>
      </div>

      {/* ── بطاقة التتبع الحكومي ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><Building2 size={15} /> التتبع الحكومي</div>
          <button className="lsd-card__action" onClick={() => {
            setEditingGov(true);
            setGovData({
              trade_name_reservation_ref: detail.trade_name_reservation_ref || '', trade_name_reservation_date: detail.trade_name_reservation_date || '',
              aoa_notarization_ref: detail.aoa_notarization_ref || '', aoa_notarization_date: detail.aoa_notarization_date || '',
              cr_number: detail.cr_number || '', cr_issue_date: detail.cr_issue_date || '', cr_expiry_date: detail.cr_expiry_date || '',
              unified_number_700: detail.unified_number_700 || '',
            });
          }}><Edit2 size={13} /> تعديل</button>
        </div>
        <div className="lsd-card__content">
          {editingGov ? (
            <div>
              <div className="lsd-info-grid">
                <div className="lsd-form-group"><label className="lsd-form-label">رقم حجز الاسم</label><input className="lsd-form-input" value={govData.trade_name_reservation_ref || ''} onChange={e => setGovData({ ...govData, trade_name_reservation_ref: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">تاريخ حجز الاسم</label><input className="lsd-form-input" type="date" value={govData.trade_name_reservation_date || ''} onChange={e => setGovData({ ...govData, trade_name_reservation_date: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">رقم توثيق التأسيس</label><input className="lsd-form-input" value={govData.aoa_notarization_ref || ''} onChange={e => setGovData({ ...govData, aoa_notarization_ref: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">تاريخ التوثيق</label><input className="lsd-form-input" type="date" value={govData.aoa_notarization_date || ''} onChange={e => setGovData({ ...govData, aoa_notarization_date: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">رقم السجل التجاري</label><input className="lsd-form-input" value={govData.cr_number || ''} onChange={e => setGovData({ ...govData, cr_number: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">تاريخ إصدار السجل</label><input className="lsd-form-input" type="date" value={govData.cr_issue_date || ''} onChange={e => setGovData({ ...govData, cr_issue_date: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">تاريخ انتهاء السجل</label><input className="lsd-form-input" type="date" value={govData.cr_expiry_date || ''} onChange={e => setGovData({ ...govData, cr_expiry_date: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">الرقم الموحد 700</label><input className="lsd-form-input" value={govData.unified_number_700 || ''} onChange={e => setGovData({ ...govData, unified_number_700: e.target.value })} dir="ltr" /></div>
              </div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingGov(false)}>إلغاء</button>
                <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveGov} disabled={govLoading}>{govLoading ? 'جارٍ...' : 'حفظ'}</button>
              </div>
            </div>
          ) : (
            <div className="lsd-info-grid">
              {detail.cr_number && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Hash size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">رقم السجل التجاري</div><div className="lsd-info-item__value">{detail.cr_number}</div></div></div>}
              {detail.cr_issue_date && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Calendar size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">تاريخ إصدار السجل</div><div className="lsd-info-item__value">{formatDate(detail.cr_issue_date)}</div></div></div>}
              {detail.unified_number_700 && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Hash size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">الرقم الموحد 700</div><div className="lsd-info-item__value">{detail.unified_number_700}</div></div></div>}
              {detail.trade_name_reservation_ref && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Hash size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">رقم حجز الاسم</div><div className="lsd-info-item__value">{detail.trade_name_reservation_ref}</div></div></div>}
              {detail.aoa_notarization_ref && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Hash size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">رقم توثيق التأسيس</div><div className="lsd-info-item__value">{detail.aoa_notarization_ref}</div></div></div>}
              {!detail.cr_number && !detail.trade_name_reservation_ref && <div style={{ fontSize: 13, color: 'var(--quiet-gray-400)' }}>لم تُضف بيانات حكومية بعد</div>}
            </div>
          )}
        </div>
      </div>

      {/* ── بطاقة ما بعد السجل التجاري ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><CheckCircle size={15} /> ما بعد السجل التجاري</div>
          <button className="lsd-card__action" onClick={() => {
            setEditingPostCr(true);
            setPostCrData({
              zatca_registered: detail.zatca_registered, zatca_number: detail.zatca_number || '',
              gosi_registered: detail.gosi_registered, gosi_number: detail.gosi_number || '',
              qiwa_registered: detail.qiwa_registered,
              municipality_license: detail.municipality_license, municipality_license_number: detail.municipality_license_number || '',
            });
          }}><Edit2 size={13} /> تعديل</button>
        </div>
        <div className="lsd-card__content">
          {editingPostCr ? (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { key: 'zatca', label: 'هيئة الزكاة والضريبة والجمارك', hasNumber: true, numKey: 'zatca_number' },
                  { key: 'gosi', label: 'التأمينات الاجتماعية', hasNumber: true, numKey: 'gosi_number' },
                  { key: 'qiwa', label: 'منصة قوى', hasNumber: false, numKey: '' },
                  { key: 'municipality', label: 'رخصة البلدية', hasNumber: true, numKey: 'municipality_license_number' },
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, minWidth: 200, cursor: 'pointer' }}>
                      <input type="checkbox" checked={postCrData[item.key === 'municipality' ? 'municipality_license' : `${item.key}_registered`] || false} onChange={e => setPostCrData({ ...postCrData, [item.key === 'municipality' ? 'municipality_license' : `${item.key}_registered`]: e.target.checked })} />
                      {item.label}
                    </label>
                    {item.hasNumber && <input className="lsd-form-input" style={{ maxWidth: 200 }} value={postCrData[item.numKey] || ''} onChange={e => setPostCrData({ ...postCrData, [item.numKey]: e.target.value })} placeholder="الرقم" dir="ltr" />}
                  </div>
                ))}
              </div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingPostCr(false)}>إلغاء</button>
                <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSavePostCr} disabled={postCrLoading}>{postCrLoading ? 'جارٍ...' : 'حفظ'}</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { done: detail.zatca_registered, label: 'هيئة الزكاة والضريبة', num: detail.zatca_number },
                { done: detail.gosi_registered, label: 'التأمينات الاجتماعية', num: detail.gosi_number },
                { done: detail.qiwa_registered, label: 'منصة قوى', num: null },
                { done: detail.municipality_license, label: 'رخصة البلدية', num: detail.municipality_license_number },
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  {item.done ? <CheckCircle size={14} color="#16a34a" /> : <X size={14} color="#dc2626" />}
                  <span>{item.label}</span>
                  {item.num && <span style={{ fontSize: 12, color: 'var(--quiet-gray-400)' }}>({item.num})</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── بطاقة قائمة المستندات ── */}
      {checklist.length > 0 && (
        <div className="lsd-card">
          <div className="lsd-card__header">
            <div className="lsd-card__title"><FileText size={15} /> قائمة المستندات <span className="lsd-tab__count">{completedChecklist}/{checklist.length}</span></div>
          </div>
          <div className="lsd-card__content">
            {/* شريط التقدم */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ background: 'var(--quiet-gray-100)', borderRadius: 6, height: 6, overflow: 'hidden' }}>
                <div style={{ width: `${(completedChecklist / checklist.length) * 100}%`, height: '100%', background: '#22c55e', borderRadius: 6, transition: 'width 0.3s' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {checklist.map((item, idx) => (
                <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: checklistLoading ? 'wait' : 'pointer', opacity: checklistLoading ? 0.6 : 1 }}>
                  <input type="checkbox" checked={item.collected} onChange={() => handleToggleChecklist(idx)} disabled={checklistLoading} />
                  <span style={{ textDecoration: item.collected ? 'line-through' : 'none', color: item.collected ? 'var(--quiet-gray-400)' : 'var(--quiet-gray-900)' }}>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyFormationWorkspace;
