import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCheck, Edit2, Plus, X, Calendar, Hash, Clock,
  DollarSign, Check, Building2, CheckCircle, ClipboardList,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../../services/legalServiceService';
import type { WorkspaceProps } from './types';
import MicroStatsBar from './MicroStatsBar';
import ContextualAlert from './ContextualAlert';

// ── تسميات عربية ──

const PROCEDURE_TYPE_LABELS: Record<string, string> = {
  commercial_registration: 'سجل تجاري', municipality_license: 'رخصة بلدية',
  civil_defense: 'دفاع مدني', investment_license: 'رخصة استثمار',
  professional_license: 'رخصة مهنية', industrial_license: 'رخصة صناعية',
  tourism_license: 'رخصة سياحية', health_license: 'رخصة صحية',
  food_license: 'رخصة غذائية', import_export: 'استيراد وتصدير', other: 'أخرى',
};

const GOVERNMENT_ENTITY_LABELS: Record<string, string> = {
  moc: 'وزارة التجارة', misa: 'وزارة الاستثمار', momra: 'وزارة الشؤون البلدية',
  civil_defense: 'الدفاع المدني', moh: 'وزارة الصحة', sfda: 'الغذاء والدواء',
  modon: 'مدن', sagia: 'ساجيا', saber: 'سابر', balady: 'بلدي', other: 'أخرى',
};

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return d; }
}

function formatCurrency(a: string | number | null | undefined): string {
  if (!a) return '—';
  return `${Number(a).toLocaleString('ar-SA')} ر.س`;
}

function getDaysRemaining(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── المكون الرئيسي ──

const LicensesWorkspace: React.FC<WorkspaceProps> = ({ service, refreshService }) => {
  const detail = service.license_procedure_detail;

  // ── حالة التحرير ──
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsData, setDetailsData] = useState<Record<string, any>>({});
  const [detailsLoading, setDetailsLoading] = useState(false);

  // ── التكاليف ──
  const [editingCosts, setEditingCosts] = useState(false);
  const [costsData, setCostsData] = useState<Record<string, any>>({});
  const [costsLoading, setCostsLoading] = useState(false);

  // ── المتطلبات ──
  const [showAddReq, setShowAddReq] = useState(false);
  const [newReqItem, setNewReqItem] = useState('');
  const [addReqLoading, setAddReqLoading] = useState(false);
  const [reqUpdateLoading, setReqUpdateLoading] = useState(false);

  const requirements = useMemo(() => detail?.requirements_checklist ?? [], [detail?.requirements_checklist]);
  const collectedCount = useMemo(() => requirements.filter(r => r.collected).length, [requirements]);
  const totalCount = requirements.length;
  const progressPercent = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0;

  const daysUntilExpiry = useMemo(() => getDaysRemaining(detail?.expiry_date), [detail?.expiry_date]);

  if (!detail) {
    return (<div className="lsd-empty-tab"><FileCheck size={32} /><p>لا توجد تفاصيل للتراخيص والإجراءات</p></div>);
  }

  // ── معالجات ──

  const handleSaveDetails = async () => {
    setDetailsLoading(true);
    try {
      const res = await LegalServiceService.updateLicenseInfo(service.id, detailsData);
      if (res.success) { toast.success('تم حفظ بيانات الرخصة'); setEditingDetails(false); await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ في الاتصال'); }
    finally { setDetailsLoading(false); }
  };

  const handleSaveCosts = async () => {
    setCostsLoading(true);
    try {
      const res = await LegalServiceService.updateLicenseCosts(service.id, costsData);
      if (res.success) { toast.success('تم حفظ التكاليف'); setEditingCosts(false); await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ في الاتصال'); }
    finally { setCostsLoading(false); }
  };

  const handleToggleRequirement = async (idx: number, collected: boolean) => {
    setReqUpdateLoading(true);
    try {
      const updated = requirements.map((r, i) => i === idx ? { ...r, collected } : r);
      const res = await LegalServiceService.updateLicenseRequirements(service.id, updated);
      if (res.success) { await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ'); }
    finally { setReqUpdateLoading(false); }
  };

  const handleAddRequirement = async () => {
    if (!newReqItem.trim()) { toast.error('يرجى إدخال المتطلب'); return; }
    setAddReqLoading(true);
    try {
      const res = await LegalServiceService.addLicenseRequirement(service.id, { item: newReqItem, collected: false });
      if (res.success) { toast.success('تمت إضافة المتطلب'); setShowAddReq(false); setNewReqItem(''); await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ'); }
    finally { setAddReqLoading(false); }
  };

  const handleRemoveRequirement = async (idx: number) => {
    try {
      const res = await LegalServiceService.removeLicenseRequirement(service.id, idx);
      if (res.success) { toast.success('تم حذف المتطلب'); await refreshService(); }
      else toast.error(res.message || 'حدث خطأ');
    } catch { toast.error('حدث خطأ'); }
  };

  return (
    <div className="lsd-tab-content-stack">

      {/* ── شريط المؤشرات ── */}
      <MicroStatsBar items={[
        ...(daysUntilExpiry !== null ? [{ label: 'أيام حتى الانتهاء', value: `${daysUntilExpiry}`, icon: Clock as any, color: (daysUntilExpiry <= 30 ? 'red' : daysUntilExpiry <= 60 ? 'amber' : 'blue') as any }] : []),
        ...(totalCount > 0 ? [{ label: 'تقدم المتطلبات', value: `${collectedCount}/${totalCount}`, icon: CheckCircle as any, color: (progressPercent === 100 ? 'green' : progressPercent >= 50 ? 'amber' : 'red') as any }] : []),
        { label: 'حالة الرسوم', value: detail.fees_paid ? 'مسددة' : 'غير مسددة', icon: DollarSign as any, color: (detail.fees_paid ? 'green' : 'red') as any },
      ]} />

      {/* ── تنبيه انتهاء الرخصة ── */}
      {daysUntilExpiry !== null && daysUntilExpiry <= 60 && (
        <ContextualAlert
          type={daysUntilExpiry <= 30 ? 'danger' : 'warning'}
          title={daysUntilExpiry <= 30 ? 'تنبيه عاجل: الرخصة على وشك الانتهاء' : 'تنبيه: اقتراب انتهاء الرخصة'}
          message={`تنتهي الرخصة خلال ${daysUntilExpiry} يوم - ${formatDate(detail.expiry_date)}`}
        />
      )}

      {/* ── بطاقة تفاصيل الرخصة ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><FileCheck size={15} /> تفاصيل الرخصة</div>
          <button className="lsd-card__action" onClick={() => {
            setEditingDetails(true);
            setDetailsData({
              procedure_type: detail.procedure_type || '', government_entity: detail.government_entity || '',
              license_number: detail.license_number || '', reference_number: detail.reference_number || '',
              issue_date: detail.issue_date || '', expiry_date: detail.expiry_date || '',
              submission_date: detail.submission_date || '', approval_date: detail.approval_date || '',
              completion_days: detail.completion_days || '',
            });
          }}><Edit2 size={13} /> تعديل</button>
        </div>
        <div className="lsd-card__content">
          {editingDetails ? (
            <div>
              <div className="lsd-info-grid">
                <div className="lsd-form-group"><label className="lsd-form-label">نوع الإجراء</label><select className="lsd-form-input" value={detailsData.procedure_type || ''} onChange={e => setDetailsData({ ...detailsData, procedure_type: e.target.value })}><option value="">اختر</option>{Object.entries(PROCEDURE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="lsd-form-group"><label className="lsd-form-label">الجهة الحكومية</label><select className="lsd-form-input" value={detailsData.government_entity || ''} onChange={e => setDetailsData({ ...detailsData, government_entity: e.target.value })}><option value="">اختر</option>{Object.entries(GOVERNMENT_ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="lsd-form-group"><label className="lsd-form-label">رقم الرخصة</label><input className="lsd-form-input" value={detailsData.license_number || ''} onChange={e => setDetailsData({ ...detailsData, license_number: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">الرقم المرجعي</label><input className="lsd-form-input" value={detailsData.reference_number || ''} onChange={e => setDetailsData({ ...detailsData, reference_number: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">تاريخ الإصدار</label><input className="lsd-form-input" type="date" value={detailsData.issue_date || ''} onChange={e => setDetailsData({ ...detailsData, issue_date: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">تاريخ الانتهاء</label><input className="lsd-form-input" type="date" value={detailsData.expiry_date || ''} onChange={e => setDetailsData({ ...detailsData, expiry_date: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">تاريخ التقديم</label><input className="lsd-form-input" type="date" value={detailsData.submission_date || ''} onChange={e => setDetailsData({ ...detailsData, submission_date: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">تاريخ الموافقة</label><input className="lsd-form-input" type="date" value={detailsData.approval_date || ''} onChange={e => setDetailsData({ ...detailsData, approval_date: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">أيام الإنجاز</label><input className="lsd-form-input" type="number" value={detailsData.completion_days || ''} onChange={e => setDetailsData({ ...detailsData, completion_days: e.target.value })} dir="ltr" /></div>
              </div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingDetails(false)}>إلغاء</button>
                <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveDetails} disabled={detailsLoading}>{detailsLoading ? 'جارٍ...' : 'حفظ'}</button>
              </div>
            </div>
          ) : (
            <div className="lsd-info-grid">
              {detail.procedure_type && <div className="lsd-info-item"><div className="lsd-info-item__icon"><FileCheck size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">نوع الإجراء</div><div className="lsd-info-item__value">{PROCEDURE_TYPE_LABELS[detail.procedure_type] || detail.procedure_type}</div></div></div>}
              {detail.government_entity && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Building2 size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">الجهة الحكومية</div><div className="lsd-info-item__value">{GOVERNMENT_ENTITY_LABELS[detail.government_entity] || detail.government_entity}</div></div></div>}
              {detail.license_number && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Hash size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">رقم الرخصة</div><div className="lsd-info-item__value">{detail.license_number}</div></div></div>}
              {detail.reference_number && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Hash size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">الرقم المرجعي</div><div className="lsd-info-item__value">{detail.reference_number}</div></div></div>}
              {detail.issue_date && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Calendar size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">تاريخ الإصدار</div><div className="lsd-info-item__value">{formatDate(detail.issue_date)}</div></div></div>}
              {detail.expiry_date && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Calendar size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">تاريخ الانتهاء</div><div className="lsd-info-item__value">{formatDate(detail.expiry_date)}</div></div></div>}
              {detail.submission_date && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Calendar size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">تاريخ التقديم</div><div className="lsd-info-item__value">{formatDate(detail.submission_date)}</div></div></div>}
              {detail.approval_date && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Calendar size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">تاريخ الموافقة</div><div className="lsd-info-item__value">{formatDate(detail.approval_date)}</div></div></div>}
              {detail.completion_days && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Clock size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">أيام الإنجاز</div><div className="lsd-info-item__value">{detail.completion_days} يوم</div></div></div>}
              {!detail.procedure_type && !detail.license_number && <div style={{ fontSize: 13, color: 'var(--quiet-gray-400)' }}>لم تُضف تفاصيل الرخصة بعد</div>}
            </div>
          )}
        </div>
      </div>

      {/* ── بطاقة التكاليف ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><DollarSign size={15} /> التكاليف</div>
          <button className="lsd-card__action" onClick={() => {
            setEditingCosts(true);
            setCostsData({
              government_fees: detail.government_fees || '', service_fees: detail.service_fees || '',
              fees_paid: detail.fees_paid ?? false,
            });
          }}><Edit2 size={13} /> تعديل</button>
        </div>
        <div className="lsd-card__content">
          {editingCosts ? (
            <div>
              <div className="lsd-info-grid">
                <div className="lsd-form-group"><label className="lsd-form-label">الرسوم الحكومية</label><input className="lsd-form-input" type="number" value={costsData.government_fees || ''} onChange={e => setCostsData({ ...costsData, government_fees: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">رسوم الخدمة</label><input className="lsd-form-input" type="number" value={costsData.service_fees || ''} onChange={e => setCostsData({ ...costsData, service_fees: e.target.value })} dir="ltr" /></div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={costsData.fees_paid || false} onChange={e => setCostsData({ ...costsData, fees_paid: e.target.checked })} style={{ width: 16, height: 16 }} />
                  <span style={{ fontSize: 13 }}>تم سداد الرسوم</span>
                </label>
              </div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingCosts(false)}>إلغاء</button>
                <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveCosts} disabled={costsLoading}>{costsLoading ? 'جارٍ...' : 'حفظ'}</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="lsd-info-grid">
                {detail.government_fees && <div className="lsd-info-item"><div className="lsd-info-item__icon"><DollarSign size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">الرسوم الحكومية</div><div className="lsd-info-item__value">{formatCurrency(detail.government_fees)}</div></div></div>}
                {detail.service_fees && <div className="lsd-info-item"><div className="lsd-info-item__icon"><DollarSign size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">رسوم الخدمة</div><div className="lsd-info-item__value">{formatCurrency(detail.service_fees)}</div></div></div>}
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: detail.fees_paid ? '#16a34a' : '#e5e7eb', color: '#fff', fontSize: 12 }}>
                  {detail.fees_paid && <Check size={12} />}
                </span>
                <span style={{ fontSize: 13, color: detail.fees_paid ? '#16a34a' : 'var(--quiet-gray-500)' }}>
                  {detail.fees_paid ? 'تم سداد الرسوم' : 'لم يتم سداد الرسوم'}
                </span>
              </div>
              {!detail.government_fees && !detail.service_fees && (
                <div style={{ fontSize: 13, color: 'var(--quiet-gray-400)', marginTop: 8 }}>لم تُحدد التكاليف بعد</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── بطاقة قائمة المتطلبات ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><ClipboardList size={15} /> قائمة المتطلبات {totalCount > 0 && <span className="lsd-tab__count">{collectedCount}/{totalCount}</span>}</div>
          <button className="lsd-card__action" onClick={() => setShowAddReq(true)}><Plus size={13} /> إضافة</button>
        </div>
        <div className="lsd-card__content">
          {/* شريط التقدم */}
          {totalCount > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--quiet-gray-500)', marginBottom: 4 }}>
                <span>{collectedCount} من {totalCount} متطلب</span>
                <span style={{ fontWeight: 600, color: progressPercent === 100 ? '#16a34a' : undefined }}>{progressPercent}%</span>
              </div>
              <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5 }}
                  style={{ height: '100%', background: progressPercent === 100 ? '#16a34a' : progressPercent >= 50 ? '#f59e0b' : '#dc2626', borderRadius: 3 }}
                />
              </div>
            </div>
          )}

          <AnimatePresence>
            {showAddReq && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: 12, background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
                  <div className="lsd-form-group"><label className="lsd-form-label">المتطلب *</label><input className="lsd-form-input" value={newReqItem} onChange={e => setNewReqItem(e.target.value)} placeholder="وصف المتطلب" /></div>
                  <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                    <button className="lsd-header-btn" onClick={() => { setShowAddReq(false); setNewReqItem(''); }}>إلغاء</button>
                    <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleAddRequirement} disabled={addReqLoading}>{addReqLoading ? 'جارٍ...' : 'إضافة'}</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {requirements.length > 0 ? (
            <div className="lsd-references-list">
              {requirements.map((item, idx) => (
                <div key={idx} className="lsd-reference-item" style={{ alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={item.collected}
                      onChange={e => handleToggleRequirement(idx, e.target.checked)}
                      disabled={reqUpdateLoading}
                      style={{ width: 16, height: 16, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 13, textDecoration: item.collected ? 'line-through' : 'none', color: item.collected ? 'var(--quiet-gray-400)' : 'var(--quiet-gray-700)' }}>
                      {item.item}
                    </span>
                  </label>
                  {item.notes && <span style={{ fontSize: 11, color: 'var(--quiet-gray-400)', marginLeft: 8 }}>{item.notes}</span>}
                  <button className="lsd-doc-action-btn" onClick={() => handleRemoveRequirement(idx)}><X size={13} /></button>
                </div>
              ))}
            </div>
          ) : (
            !showAddReq && (
              <div className="lsd-empty-state-small"><ClipboardList size={22} /><span>لا توجد متطلبات</span>
                <button className="lsd-header-btn lsd-header-btn--primary" style={{ marginTop: 8 }} onClick={() => setShowAddReq(true)}><Plus size={13} /> إضافة المتطلب الأول</button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default LicensesWorkspace;
