import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Edit2, Plus, X, Calendar, Hash, Clock,
  FileText, Check, Building2, Search, AlertTriangle,
  Flag, Globe, Tag, Eye, DollarSign, Layers,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../../services/legalServiceService';
import type { WorkspaceProps } from './types';
import MicroStatsBar from './MicroStatsBar';
import ContextualAlert from './ContextualAlert';

// ── تسميات عربية ──

const IP_TYPE_LABELS: Record<string, string> = {
  trademark: 'علامة تجارية', patent: 'براءة اختراع', copyright: 'حقوق المؤلف',
  industrial_design: 'تصميم صناعي', trade_secret: 'سر تجاري', domain_name: 'نطاق إلكتروني', other: 'أخرى',
};

const REGISTRATION_OFFICE_LABELS: Record<string, string> = {
  saip: 'الهيئة السعودية للملكية الفكرية', gcc_patent: 'مكتب براءات الخليج',
  wipo: 'الويبو', other: 'أخرى',
};

const RISK_COLORS: Record<string, string> = { low: '#16a34a', medium: '#f59e0b', high: '#dc2626' };
const RISK_LABELS: Record<string, string> = { low: 'منخفض', medium: 'متوسط', high: 'مرتفع' };

const INFRINGEMENT_STATUS_LABELS: Record<string, string> = {
  reported: 'تم الإبلاغ', investigating: 'قيد التحقيق', resolved: 'تم الحل', litigation: 'تقاضي',
};
const INFRINGEMENT_STATUS_COLORS: Record<string, string> = {
  reported: '#f59e0b', investigating: '#3b82f6', resolved: '#16a34a', litigation: '#dc2626',
};

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return d; }
}

function getDaysRemaining(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── المكون الرئيسي ──

const IpWorkspace: React.FC<WorkspaceProps> = ({ service, refreshService }) => {
  const detail = service.ip_detail;

  // ── حالة التحرير ──
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsData, setDetailsData] = useState<Record<string, any>>({});
  const [detailsLoading, setDetailsLoading] = useState(false);

  // ── نتائج البحث ──
  const [showAddSearch, setShowAddSearch] = useState(false);
  const [newSearch, setNewSearch] = useState<Record<string, any>>({});
  const [addSearchLoading, setAddSearchLoading] = useState(false);

  // ── الاعتراضات ──
  const [showAddObjection, setShowAddObjection] = useState(false);
  const [newObjection, setNewObjection] = useState<Record<string, any>>({});
  const [addObjectionLoading, setAddObjectionLoading] = useState(false);

  // ── التعديات ──
  const [showAddInfringement, setShowAddInfringement] = useState(false);
  const [newInfringement, setNewInfringement] = useState<Record<string, any>>({});
  const [addInfringementLoading, setAddInfringementLoading] = useState(false);

  const searchResults = useMemo(() => detail?.search_results ?? [], [detail?.search_results]);
  const objections = useMemo(() => detail?.objections ?? [], [detail?.objections]);
  const infringements = useMemo(() => detail?.infringements ?? [], [detail?.infringements]);
  const activeObjections = useMemo(() => objections.filter(o => !o.outcome).length, [objections]);

  const daysUntilExpiry = useMemo(() => getDaysRemaining(detail?.expiry_date), [detail?.expiry_date]);
  const daysUntilPubEnd = useMemo(() => getDaysRemaining(detail?.publication_end_date), [detail?.publication_end_date]);
  const isRegistered = !!detail?.registration_number;

  if (!detail) {
    return (<div className="lsd-empty-tab"><Shield size={32} /><p>لا توجد تفاصيل للملكية الفكرية</p></div>);
  }

  // ── معالجات ──

  const handleSaveDetails = async () => {
    setDetailsLoading(true);
    try {
      const res = await LegalServiceService.updateIpInfo(service.id, detailsData);
      if (res.success) { toast.success('تم حفظ بيانات الملكية الفكرية'); setEditingDetails(false); await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ في الاتصال'); }
    finally { setDetailsLoading(false); }
  };

  const handleAddSearch = async () => {
    if (!newSearch.similar_mark?.trim()) { toast.error('يرجى إدخال العلامة المشابهة'); return; }
    setAddSearchLoading(true);
    try {
      const res = await LegalServiceService.addIpSearchResult(service.id, newSearch);
      if (res.success) { toast.success('تمت إضافة نتيجة البحث'); setShowAddSearch(false); setNewSearch({}); await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ'); }
    finally { setAddSearchLoading(false); }
  };

  const handleRemoveSearch = async (idx: number) => {
    try {
      const res = await LegalServiceService.removeIpSearchResult(service.id, idx);
      if (res.success) { toast.success('تم حذف نتيجة البحث'); await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ'); }
  };

  const handleAddObjection = async () => {
    if (!newObjection.objector?.trim()) { toast.error('يرجى إدخال اسم المعترض'); return; }
    setAddObjectionLoading(true);
    try {
      const res = await LegalServiceService.addIpObjection(service.id, newObjection);
      if (res.success) { toast.success('تمت إضافة الاعتراض'); setShowAddObjection(false); setNewObjection({}); await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ'); }
    finally { setAddObjectionLoading(false); }
  };

  const handleAddInfringement = async () => {
    if (!newInfringement.infringer?.trim()) { toast.error('يرجى إدخال اسم المتعدي'); return; }
    setAddInfringementLoading(true);
    try {
      const res = await LegalServiceService.addIpInfringement(service.id, newInfringement);
      if (res.success) { toast.success('تمت إضافة التعدي'); setShowAddInfringement(false); setNewInfringement({}); await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ'); }
    finally { setAddInfringementLoading(false); }
  };

  return (
    <div className="lsd-tab-content-stack">

      {/* ── شريط المؤشرات ── */}
      <MicroStatsBar items={[
        ...(detail.ip_type ? [{ label: 'نوع الملكية', value: IP_TYPE_LABELS[detail.ip_type] || detail.ip_type, icon: Shield as any, color: 'blue' as const }] : []),
        { label: 'حالة التسجيل', value: isRegistered ? 'مسجل' : 'قيد الانتظار', icon: Check as any, color: (isRegistered ? 'green' : 'amber') as any },
        ...(daysUntilExpiry !== null ? [{ label: 'أيام حتى الانتهاء', value: `${daysUntilExpiry}`, icon: Clock as any, color: (daysUntilExpiry <= 30 ? 'red' : daysUntilExpiry <= 90 ? 'amber' : 'blue') as any }] : []),
        ...(activeObjections > 0 ? [{ label: 'اعتراضات نشطة', value: `${activeObjections}`, icon: AlertTriangle as any, color: 'red' as const }] : []),
      ]} />

      {/* ── تنبيه سداد الرسوم النهائية ── */}
      {detail.publication_end_date && !detail.final_fees_paid && daysUntilPubEnd !== null && (
        <ContextualAlert
          type="danger"
          title="تنبيه: لم يتم سداد الرسوم النهائية"
          message={`ينتهي النشر خلال ${daysUntilPubEnd} يوم - يجب سداد الرسوم النهائية قبل ${formatDate(detail.publication_end_date)}`}
        />
      )}

      {/* ── بطاقة تفاصيل الملكية الفكرية ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><Shield size={15} /> تفاصيل الملكية الفكرية</div>
          <button className="lsd-card__action" onClick={() => {
            setEditingDetails(true);
            setDetailsData({
              ip_type: detail.ip_type || '', ip_title: detail.ip_title || '',
              ip_description: detail.ip_description || '', owner_name: detail.owner_name || '',
              owner_id_number: detail.owner_id_number || '', registration_office: detail.registration_office || '',
              application_number: detail.application_number || '', application_date: detail.application_date || '',
              registration_number: detail.registration_number || '', registration_date: detail.registration_date || '',
              expiry_date: detail.expiry_date || '',
            });
          }}><Edit2 size={13} /> تعديل</button>
        </div>
        <div className="lsd-card__content">
          {editingDetails ? (
            <div>
              <div className="lsd-info-grid">
                <div className="lsd-form-group"><label className="lsd-form-label">نوع الملكية</label><select className="lsd-form-input" value={detailsData.ip_type || ''} onChange={e => setDetailsData({ ...detailsData, ip_type: e.target.value })}><option value="">اختر</option>{Object.entries(IP_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="lsd-form-group"><label className="lsd-form-label">عنوان الملكية</label><input className="lsd-form-input" value={detailsData.ip_title || ''} onChange={e => setDetailsData({ ...detailsData, ip_title: e.target.value })} /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">اسم المالك</label><input className="lsd-form-input" value={detailsData.owner_name || ''} onChange={e => setDetailsData({ ...detailsData, owner_name: e.target.value })} /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">رقم هوية المالك</label><input className="lsd-form-input" value={detailsData.owner_id_number || ''} onChange={e => setDetailsData({ ...detailsData, owner_id_number: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">جهة التسجيل</label><select className="lsd-form-input" value={detailsData.registration_office || ''} onChange={e => setDetailsData({ ...detailsData, registration_office: e.target.value })}><option value="">اختر</option>{Object.entries(REGISTRATION_OFFICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="lsd-form-group"><label className="lsd-form-label">رقم الطلب</label><input className="lsd-form-input" value={detailsData.application_number || ''} onChange={e => setDetailsData({ ...detailsData, application_number: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">تاريخ الطلب</label><input className="lsd-form-input" type="date" value={detailsData.application_date || ''} onChange={e => setDetailsData({ ...detailsData, application_date: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">رقم التسجيل</label><input className="lsd-form-input" value={detailsData.registration_number || ''} onChange={e => setDetailsData({ ...detailsData, registration_number: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">تاريخ التسجيل</label><input className="lsd-form-input" type="date" value={detailsData.registration_date || ''} onChange={e => setDetailsData({ ...detailsData, registration_date: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">تاريخ الانتهاء</label><input className="lsd-form-input" type="date" value={detailsData.expiry_date || ''} onChange={e => setDetailsData({ ...detailsData, expiry_date: e.target.value })} dir="ltr" /></div>
              </div>
              <div className="lsd-form-group" style={{ marginTop: 8 }}><label className="lsd-form-label">وصف الملكية</label><textarea className="lsd-form-textarea" rows={3} value={detailsData.ip_description || ''} onChange={e => setDetailsData({ ...detailsData, ip_description: e.target.value })} placeholder="وصف الملكية الفكرية..." /></div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingDetails(false)}>إلغاء</button>
                <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveDetails} disabled={detailsLoading}>{detailsLoading ? 'جارٍ...' : 'حفظ'}</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="lsd-info-grid">
                {detail.ip_type && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Tag size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">نوع الملكية</div><div className="lsd-info-item__value">{IP_TYPE_LABELS[detail.ip_type] || detail.ip_type}</div></div></div>}
                {detail.ip_title && <div className="lsd-info-item"><div className="lsd-info-item__icon"><FileText size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">العنوان</div><div className="lsd-info-item__value">{detail.ip_title}</div></div></div>}
                {detail.owner_name && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Building2 size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">المالك</div><div className="lsd-info-item__value">{detail.owner_name}</div></div></div>}
                {detail.owner_id_number && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Hash size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">رقم الهوية</div><div className="lsd-info-item__value">{detail.owner_id_number}</div></div></div>}
                {detail.registration_office && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Globe size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">جهة التسجيل</div><div className="lsd-info-item__value">{REGISTRATION_OFFICE_LABELS[detail.registration_office] || detail.registration_office}</div></div></div>}
                {detail.application_number && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Hash size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">رقم الطلب</div><div className="lsd-info-item__value">{detail.application_number}</div></div></div>}
                {detail.application_date && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Calendar size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">تاريخ الطلب</div><div className="lsd-info-item__value">{formatDate(detail.application_date)}</div></div></div>}
                {detail.registration_number && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Hash size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">رقم التسجيل</div><div className="lsd-info-item__value">{detail.registration_number}</div></div></div>}
                {detail.registration_date && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Calendar size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">تاريخ التسجيل</div><div className="lsd-info-item__value">{formatDate(detail.registration_date)}</div></div></div>}
                {detail.expiry_date && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Calendar size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">تاريخ الانتهاء</div><div className="lsd-info-item__value">{formatDate(detail.expiry_date)}</div></div></div>}
              </div>
              {detail.ip_description && <div className="lsd-notes-section" style={{ marginTop: 12 }}><div className="lsd-notes-section__label">الوصف</div><p className="lsd-description-text">{detail.ip_description}</p></div>}
              {!detail.ip_title && !detail.ip_type && <div style={{ fontSize: 13, color: 'var(--quiet-gray-400)' }}>لم تُضف تفاصيل الملكية الفكرية بعد</div>}
            </div>
          )}
        </div>
      </div>

      {/* ── بطاقة تصنيفات نيس (للعلامات التجارية فقط) ── */}
      {detail.ip_type === 'trademark' && (
        <div className="lsd-card">
          <div className="lsd-card__header">
            <div className="lsd-card__title"><Layers size={15} /> تصنيفات نيس</div>
          </div>
          <div className="lsd-card__content">
            {detail.nice_classes && detail.nice_classes.length > 0 ? (
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {detail.nice_classes.map((cls, idx) => (
                    <span key={idx} style={{ padding: '4px 12px', background: '#eff6ff', borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                      الفئة {cls}
                    </span>
                  ))}
                </div>
                {detail.nice_classes_description && <div className="lsd-notes-section" style={{ marginTop: 12 }}><div className="lsd-notes-section__label">وصف التصنيفات</div><p className="lsd-description-text">{detail.nice_classes_description}</p></div>}
              </div>
            ) : (
              <div className="lsd-empty-state-small"><Layers size={22} /><span>لم تُحدد تصنيفات نيس بعد</span></div>
            )}
          </div>
        </div>
      )}

      {/* ── بطاقة نتائج البحث ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><Search size={15} /> نتائج البحث {searchResults.length > 0 && <span className="lsd-tab__count">{searchResults.length}</span>}</div>
          <button className="lsd-card__action" onClick={() => setShowAddSearch(true)}><Plus size={13} /> إضافة</button>
        </div>
        <div className="lsd-card__content">
          <AnimatePresence>
            {showAddSearch && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: 12, background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
                  <div className="lsd-info-grid">
                    <div className="lsd-form-group"><label className="lsd-form-label">العلامة المشابهة *</label><input className="lsd-form-input" value={newSearch.similar_mark || ''} onChange={e => setNewSearch({ ...newSearch, similar_mark: e.target.value })} /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">نسبة التشابه %</label><input className="lsd-form-input" type="number" min="0" max="100" value={newSearch.similarity_percentage || ''} onChange={e => setNewSearch({ ...newSearch, similarity_percentage: parseFloat(e.target.value) || 0 })} dir="ltr" /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">الفئة</label><input className="lsd-form-input" value={newSearch.class || ''} onChange={e => setNewSearch({ ...newSearch, class: e.target.value })} /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">المالك</label><input className="lsd-form-input" value={newSearch.owner || ''} onChange={e => setNewSearch({ ...newSearch, owner: e.target.value })} /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">مستوى الخطر</label><select className="lsd-form-input" value={newSearch.risk_level || ''} onChange={e => setNewSearch({ ...newSearch, risk_level: e.target.value })}><option value="">اختر</option>{Object.entries(RISK_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                  </div>
                  <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                    <button className="lsd-header-btn" onClick={() => { setShowAddSearch(false); setNewSearch({}); }}>إلغاء</button>
                    <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleAddSearch} disabled={addSearchLoading}>{addSearchLoading ? 'جارٍ...' : 'إضافة'}</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {searchResults.length > 0 ? (
            <div className="lsd-references-list">
              {searchResults.map((item, idx) => (
                <div key={idx} className="lsd-reference-item" style={{ alignItems: 'center' }}>
                  <div className="lsd-reference-item__body" style={{ flex: 1 }}>
                    <div className="lsd-reference-item__title">{item.similar_mark}</div>
                    <div style={{ fontSize: 12, color: 'var(--quiet-gray-400)', display: 'flex', gap: 12, marginTop: 2 }}>
                      {item.similarity_percentage !== undefined && <span>التشابه: {item.similarity_percentage}%</span>}
                      {item.class && <span>الفئة: {item.class}</span>}
                      {item.owner && <span>المالك: {item.owner}</span>}
                    </div>
                  </div>
                  {item.risk_level && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: RISK_COLORS[item.risk_level], padding: '2px 8px', borderRadius: 8, background: item.risk_level === 'low' ? '#f0fdf4' : item.risk_level === 'medium' ? '#fffbeb' : '#fef2f2' }}>
                      {RISK_LABELS[item.risk_level]}
                    </span>
                  )}
                  <button className="lsd-doc-action-btn" onClick={() => handleRemoveSearch(idx)}><X size={13} /></button>
                </div>
              ))}
            </div>
          ) : (
            !showAddSearch && (
              <div className="lsd-empty-state-small"><Search size={22} /><span>لا توجد نتائج بحث</span>
                <button className="lsd-header-btn lsd-header-btn--primary" style={{ marginTop: 8 }} onClick={() => setShowAddSearch(true)}><Plus size={13} /> إضافة نتيجة</button>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── بطاقة النشر ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><Eye size={15} /> النشر</div>
        </div>
        <div className="lsd-card__content">
          <div className="lsd-info-grid">
            {detail.publication_start_date && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Calendar size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">بداية النشر</div><div className="lsd-info-item__value">{formatDate(detail.publication_start_date)}</div></div></div>}
            {detail.publication_end_date && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Calendar size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">نهاية النشر</div><div className="lsd-info-item__value">{formatDate(detail.publication_end_date)}</div></div></div>}
            {daysUntilPubEnd !== null && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Clock size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">المتبقي</div><div className="lsd-info-item__value" style={{ color: daysUntilPubEnd <= 7 ? '#dc2626' : daysUntilPubEnd <= 30 ? '#f59e0b' : undefined }}>{daysUntilPubEnd} يوم</div></div></div>}
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 18, height: 18, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: detail.final_fees_paid ? '#16a34a' : '#e5e7eb', color: '#fff', fontSize: 12 }}>
              {detail.final_fees_paid && <Check size={12} />}
            </span>
            <span style={{ fontSize: 13, color: detail.final_fees_paid ? '#16a34a' : 'var(--quiet-gray-500)' }}>
              {detail.final_fees_paid ? 'تم سداد الرسوم النهائية' : 'لم يتم سداد الرسوم النهائية'}
            </span>
          </div>
          {!detail.publication_start_date && !detail.publication_end_date && (
            <div style={{ fontSize: 13, color: 'var(--quiet-gray-400)' }}>لم تُحدد فترة النشر بعد</div>
          )}
        </div>
      </div>

      {/* ── بطاقة الاعتراضات ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><AlertTriangle size={15} /> الاعتراضات {objections.length > 0 && <span className="lsd-tab__count">{objections.length}</span>}</div>
          <button className="lsd-card__action" onClick={() => setShowAddObjection(true)}><Plus size={13} /> إضافة</button>
        </div>
        <div className="lsd-card__content">
          <AnimatePresence>
            {showAddObjection && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: 12, background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
                  <div className="lsd-info-grid">
                    <div className="lsd-form-group"><label className="lsd-form-label">المعترض *</label><input className="lsd-form-input" value={newObjection.objector || ''} onChange={e => setNewObjection({ ...newObjection, objector: e.target.value })} /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">التاريخ</label><input className="lsd-form-input" type="date" value={newObjection.date || ''} onChange={e => setNewObjection({ ...newObjection, date: e.target.value })} dir="ltr" /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">الموعد النهائي للرد</label><input className="lsd-form-input" type="date" value={newObjection.response_deadline || ''} onChange={e => setNewObjection({ ...newObjection, response_deadline: e.target.value })} dir="ltr" /></div>
                  </div>
                  <div className="lsd-form-group" style={{ marginTop: 8 }}><label className="lsd-form-label">أسباب الاعتراض</label><textarea className="lsd-form-textarea" rows={2} value={newObjection.grounds || ''} onChange={e => setNewObjection({ ...newObjection, grounds: e.target.value })} placeholder="أسباب الاعتراض..." /></div>
                  <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                    <button className="lsd-header-btn" onClick={() => { setShowAddObjection(false); setNewObjection({}); }}>إلغاء</button>
                    <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleAddObjection} disabled={addObjectionLoading}>{addObjectionLoading ? 'جارٍ...' : 'إضافة'}</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {objections.length > 0 ? (
            <div className="lsd-references-list">
              {objections.map((item, idx) => {
                const deadlineDays = getDaysRemaining(item.response_deadline);
                return (
                  <div key={idx} className="lsd-reference-item" style={{ alignItems: 'center' }}>
                    <div className="lsd-reference-item__body" style={{ flex: 1 }}>
                      <div className="lsd-reference-item__title">{item.objector}</div>
                      <div style={{ fontSize: 12, color: 'var(--quiet-gray-400)', display: 'flex', gap: 12, marginTop: 2 }}>
                        {item.date && <span>{formatDate(item.date)}</span>}
                        {item.grounds && <span>{item.grounds}</span>}
                      </div>
                    </div>
                    {item.response_deadline && (
                      <span style={{ fontSize: 12, color: deadlineDays !== null && deadlineDays <= 7 ? '#dc2626' : '#f59e0b' }}>
                        الرد: {formatDate(item.response_deadline)}
                      </span>
                    )}
                    {item.response_filed !== undefined && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: item.response_filed ? '#16a34a' : '#dc2626', padding: '2px 8px', borderRadius: 8, background: item.response_filed ? '#f0fdf4' : '#fef2f2' }}>
                        {item.response_filed ? 'تم الرد' : 'لم يُردّ'}
                      </span>
                    )}
                    {item.outcome && <span style={{ fontSize: 12, color: 'var(--quiet-gray-500)' }}>{item.outcome}</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            !showAddObjection && (
              <div className="lsd-empty-state-small"><AlertTriangle size={22} /><span>لا توجد اعتراضات</span>
                <button className="lsd-header-btn lsd-header-btn--primary" style={{ marginTop: 8 }} onClick={() => setShowAddObjection(true)}><Plus size={13} /> إضافة اعتراض</button>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── بطاقة التعديات ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><Flag size={15} /> التعديات {infringements.length > 0 && <span className="lsd-tab__count">{infringements.length}</span>}</div>
          <button className="lsd-card__action" onClick={() => setShowAddInfringement(true)}><Plus size={13} /> إضافة</button>
        </div>
        <div className="lsd-card__content">
          <AnimatePresence>
            {showAddInfringement && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: 12, background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
                  <div className="lsd-info-grid">
                    <div className="lsd-form-group"><label className="lsd-form-label">المتعدي *</label><input className="lsd-form-input" value={newInfringement.infringer || ''} onChange={e => setNewInfringement({ ...newInfringement, infringer: e.target.value })} /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">التاريخ</label><input className="lsd-form-input" type="date" value={newInfringement.date || ''} onChange={e => setNewInfringement({ ...newInfringement, date: e.target.value })} dir="ltr" /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">الحالة</label><select className="lsd-form-input" value={newInfringement.status || ''} onChange={e => setNewInfringement({ ...newInfringement, status: e.target.value })}><option value="">اختر</option>{Object.entries(INFRINGEMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                  </div>
                  <div className="lsd-form-group" style={{ marginTop: 8 }}><label className="lsd-form-label">الوصف</label><textarea className="lsd-form-textarea" rows={2} value={newInfringement.description || ''} onChange={e => setNewInfringement({ ...newInfringement, description: e.target.value })} placeholder="وصف التعدي..." /></div>
                  <div className="lsd-form-group" style={{ marginTop: 8 }}><label className="lsd-form-label">الإجراء المتخذ</label><input className="lsd-form-input" value={newInfringement.action_taken || ''} onChange={e => setNewInfringement({ ...newInfringement, action_taken: e.target.value })} /></div>
                  <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                    <button className="lsd-header-btn" onClick={() => { setShowAddInfringement(false); setNewInfringement({}); }}>إلغاء</button>
                    <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleAddInfringement} disabled={addInfringementLoading}>{addInfringementLoading ? 'جارٍ...' : 'إضافة'}</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {infringements.length > 0 ? (
            <div className="lsd-references-list">
              {infringements.map((item, idx) => (
                <div key={idx} className="lsd-reference-item" style={{ alignItems: 'center' }}>
                  <div className="lsd-reference-item__body" style={{ flex: 1 }}>
                    <div className="lsd-reference-item__title">{item.infringer}</div>
                    <div style={{ fontSize: 12, color: 'var(--quiet-gray-400)', display: 'flex', gap: 12, marginTop: 2 }}>
                      {item.date && <span>{formatDate(item.date)}</span>}
                      {item.description && <span>{item.description}</span>}
                      {item.action_taken && <span>الإجراء: {item.action_taken}</span>}
                    </div>
                  </div>
                  {item.status && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: INFRINGEMENT_STATUS_COLORS[item.status] || '#6b7280', padding: '2px 8px', borderRadius: 8, background: item.status === 'resolved' ? '#f0fdf4' : item.status === 'litigation' ? '#fef2f2' : '#f0f9ff' }}>
                      {INFRINGEMENT_STATUS_LABELS[item.status] || item.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            !showAddInfringement && (
              <div className="lsd-empty-state-small"><Flag size={22} /><span>لا توجد تعديات مسجلة</span>
                <button className="lsd-header-btn lsd-header-btn--primary" style={{ marginTop: 8 }} onClick={() => setShowAddInfringement(true)}><Plus size={13} /> إضافة تعدي</button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default IpWorkspace;
