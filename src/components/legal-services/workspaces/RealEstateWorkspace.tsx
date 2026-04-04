import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building, Edit2, Plus, X, Calendar, MapPin, FileText, Users,
  User, CreditCard, Home, Landmark, Scale, Hash, Ruler, DollarSign,
  AlertTriangle, Clock, Shield, Key,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../../services/legalServiceService';
import { useDynamicList } from '../../../hooks/useDynamicList';
import type { WorkspaceProps } from './types';
import MicroStatsBar from './MicroStatsBar';
import ContextualAlert from './ContextualAlert';

// ── تسميات عربية ──

const SERVICE_TYPE_LABELS: Record<string, string> = {
  sale_purchase: 'بيع وشراء',
  lease_management: 'إدارة إيجار',
  deed_review: 'مراجعة صك',
  inheritance_division: 'تصفية تركات',
  dispute_resolution: 'تسوية نزاع',
  development_contract: 'عقد تطوير',
  mortgage: 'رهن عقاري',
  other: 'أخرى',
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  residential: 'سكني',
  commercial: 'تجاري',
  land: 'أرض',
  industrial: 'صناعي',
  agricultural: 'زراعي',
  mixed: 'مختلط',
};

const DEED_STATUS_LABELS: Record<string, string> = {
  clean: 'نظيف',
  encumbered: 'مرهون',
  disputed: 'متنازع عليه',
};

const DEED_STATUS_COLORS: Record<string, string> = {
  clean: '#16a34a',
  encumbered: '#f59e0b',
  disputed: '#ef4444',
};

const PARTY_ROLE_LABELS: Record<string, string> = {
  seller: 'بائع',
  buyer: 'مشتري',
  landlord: 'مؤجر',
  tenant: 'مستأجر',
  heir: 'وارث',
};

interface TransactionParty {
  name: string;
  role: 'seller' | 'buyer' | 'landlord' | 'tenant' | 'heir';
  id_number?: string;
}

interface HeirInfo {
  name: string;
  relationship: string;
  share_fraction?: string;
  id_number?: string;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  try {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch { return null; }
}

function formatCurrency(val: string | null | undefined): string {
  if (!val) return '—';
  const num = Number(val);
  if (isNaN(num)) return val;
  return num.toLocaleString('ar-SA') + ' ر.س';
}

// ── المكون الرئيسي ──

const RealEstateWorkspace: React.FC<WorkspaceProps> = ({ service, refreshService }) => {
  const detail = (service as any).real_estate_detail;

  // حالات التعديل
  const [editingProperty, setEditingProperty] = useState(false);
  const [propertyData, setPropertyData] = useState<Record<string, any>>({});
  const [propertyLoading, setPropertyLoading] = useState(false);

  const [editingLease, setEditingLease] = useState(false);
  const [leaseData, setLeaseData] = useState<Record<string, any>>({});
  const [leaseLoading, setLeaseLoading] = useState(false);

  // نماذج إضافة
  const [newParty, setNewParty] = useState<Partial<TransactionParty>>({});
  const [newHeir, setNewHeir] = useState<Partial<HeirInfo>>({});

  // حسابات
  const parties: TransactionParty[] = useMemo(() => detail?.transaction_parties ?? [], [detail?.transaction_parties]);
  const heirs: HeirInfo[] = useMemo(() => detail?.heirs ?? [], [detail?.heirs]);

  // useDynamicList للأطراف
  const partyList = useDynamicList<TransactionParty>({
    items: parties,
    onAdd: (item) => LegalServiceService.addTransactionParty(service.id, item),
    onRemove: (idx) => LegalServiceService.removeTransactionParty(service.id, idx),
    refreshService,
    addSuccessMessage: 'تمت إضافة الطرف بنجاح',
    removeSuccessMessage: 'تم حذف الطرف',
  });

  // useDynamicList للورثة
  const heirList = useDynamicList<HeirInfo>({
    items: heirs,
    onAdd: (item) => LegalServiceService.addHeir(service.id, item),
    onRemove: (idx) => LegalServiceService.removeHeir(service.id, idx),
    refreshService,
    addSuccessMessage: 'تمت إضافة الوارث بنجاح',
    removeSuccessMessage: 'تم حذف الوارث',
  });

  // حالة فارغة
  if (!detail) {
    return (
      <div className="lsd-empty-tab">
        <Building size={32} />
        <p>لا توجد تفاصيل عقارية</p>
      </div>
    );
  }

  // ── معالجات ──

  const handleSaveProperty = async () => {
    setPropertyLoading(true);
    try {
      const res = await LegalServiceService.updatePropertyInfo(service.id, propertyData);
      if (res.success) {
        toast.success('تم حفظ معلومات العقار');
        setEditingProperty(false);
        await refreshService();
      } else {
        toast.error(res.message || 'حدث خطأ');
      }
    } catch { toast.error('حدث خطأ في الاتصال'); }
    finally { setPropertyLoading(false); }
  };

  const handleSaveLease = async () => {
    setLeaseLoading(true);
    try {
      const res = await LegalServiceService.updateLeaseInfo(service.id, leaseData);
      if (res.success) {
        toast.success('تم حفظ معلومات الإيجار');
        setEditingLease(false);
        await refreshService();
      } else {
        toast.error(res.message || 'حدث خطأ');
      }
    } catch { toast.error('حدث خطأ في الاتصال'); }
    finally { setLeaseLoading(false); }
  };

  // ── تنبيه انتهاء الإيجار ──
  const daysToLeaseEnd = daysUntil(detail.lease_end_date);
  const showLeaseAlert = detail.real_estate_service_type === 'lease_management' && daysToLeaseEnd !== null && daysToLeaseEnd >= 0 && daysToLeaseEnd <= 60;

  return (
    <div className="lsd-tab-content-stack">

      {/* ── شريط المؤشرات ── */}
      <MicroStatsBar items={[
        {
          label: 'قيمة العقار',
          value: detail.property_value ? formatCurrency(detail.property_value) : '—',
          icon: DollarSign,
          color: 'blue',
        },
        {
          label: 'المساحة',
          value: detail.property_area ? `${detail.property_area} م²` : '—',
          icon: Ruler,
          color: 'purple',
        },
        {
          label: 'حالة الصك',
          value: detail.deed_status ? DEED_STATUS_LABELS[detail.deed_status] || detail.deed_status : '—',
          icon: FileText,
          color: detail.deed_status === 'clean' ? 'green' : detail.deed_status === 'encumbered' ? 'amber' : detail.deed_status === 'disputed' ? 'red' : 'gray',
        },
        {
          label: 'الأطراف',
          value: `${parties.length}`,
          icon: Users,
          color: parties.length > 0 ? 'green' : 'gray',
        },
      ]} />

      {/* ── تنبيه انتهاء الإيجار ── */}
      {showLeaseAlert && (
        <ContextualAlert
          type={daysToLeaseEnd! <= 14 ? 'danger' : 'warning'}
          title="موعد انتهاء الإيجار قريب"
          message={`ينتهي عقد الإيجار بعد ${daysToLeaseEnd} يوم (${formatDate(detail.lease_end_date)})`}
        />
      )}

      {/* ── بطاقة معلومات العقار ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title">
            <Building size={15} />
            معلومات العقار
          </div>
          <button
            className="lsd-card__action"
            onClick={() => {
              setEditingProperty(true);
              setPropertyData({
                real_estate_service_type: detail.real_estate_service_type || '',
                property_type: detail.property_type || '',
                property_location: detail.property_location || '',
                deed_number: detail.deed_number || '',
                property_area: detail.property_area || '',
                property_value: detail.property_value || '',
              });
            }}
          >
            <Edit2 size={13} />
            تعديل
          </button>
        </div>
        <div className="lsd-card__content">
          {editingProperty ? (
            <div>
              <div className="lsd-info-grid">
                <div className="lsd-form-group">
                  <label className="lsd-form-label">نوع الخدمة العقارية</label>
                  <select className="lsd-form-input" value={propertyData.real_estate_service_type || ''} onChange={e => setPropertyData({ ...propertyData, real_estate_service_type: e.target.value })}>
                    <option value="">اختر النوع</option>
                    {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">نوع العقار</label>
                  <select className="lsd-form-input" value={propertyData.property_type || ''} onChange={e => setPropertyData({ ...propertyData, property_type: e.target.value })}>
                    <option value="">اختر النوع</option>
                    {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">الموقع</label>
                  <input className="lsd-form-input" value={propertyData.property_location || ''} onChange={e => setPropertyData({ ...propertyData, property_location: e.target.value })} placeholder="موقع العقار" />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">رقم الصك</label>
                  <input className="lsd-form-input" value={propertyData.deed_number || ''} onChange={e => setPropertyData({ ...propertyData, deed_number: e.target.value })} placeholder="رقم الصك" dir="ltr" />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">المساحة (م²)</label>
                  <input className="lsd-form-input" value={propertyData.property_area || ''} onChange={e => setPropertyData({ ...propertyData, property_area: e.target.value })} placeholder="المساحة" dir="ltr" />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">القيمة (ر.س)</label>
                  <input className="lsd-form-input" value={propertyData.property_value || ''} onChange={e => setPropertyData({ ...propertyData, property_value: e.target.value })} placeholder="قيمة العقار" dir="ltr" />
                </div>
              </div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingProperty(false)}>إلغاء</button>
                <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveProperty} disabled={propertyLoading}>
                  {propertyLoading ? 'جارٍ الحفظ...' : 'حفظ'}
                </button>
              </div>
            </div>
          ) : (
            <div className="lsd-info-grid">
              {detail.real_estate_service_type && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><Landmark size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">نوع الخدمة</div>
                    <div className="lsd-info-item__value">{SERVICE_TYPE_LABELS[detail.real_estate_service_type] || detail.real_estate_service_type}</div>
                  </div>
                </div>
              )}
              {detail.property_type && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><Home size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">نوع العقار</div>
                    <div className="lsd-info-item__value">{PROPERTY_TYPE_LABELS[detail.property_type] || detail.property_type}</div>
                  </div>
                </div>
              )}
              {detail.property_location && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><MapPin size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">الموقع</div>
                    <div className="lsd-info-item__value">{detail.property_location}</div>
                  </div>
                </div>
              )}
              {detail.deed_number && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><Hash size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">رقم الصك</div>
                    <div className="lsd-info-item__value" dir="ltr">{detail.deed_number}</div>
                  </div>
                </div>
              )}
              {detail.property_area && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><Ruler size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">المساحة</div>
                    <div className="lsd-info-item__value">{detail.property_area} م²</div>
                  </div>
                </div>
              )}
              {detail.property_value && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><DollarSign size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">القيمة</div>
                    <div className="lsd-info-item__value">{formatCurrency(detail.property_value)}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── بطاقة مراجعة الصك ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title">
            <FileText size={15} />
            حالة الصك
          </div>
        </div>
        <div className="lsd-card__content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: detail.encumbrances ? 12 : 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 8,
              background: detail.deed_status === 'clean' ? '#f0fdf4' : detail.deed_status === 'encumbered' ? '#fffbeb' : detail.deed_status === 'disputed' ? '#fef2f2' : 'var(--bg-secondary, #f3f4f6)',
              border: `1px solid ${detail.deed_status ? (DEED_STATUS_COLORS[detail.deed_status] + '33') : '#e5e7eb'}`,
            }}>
              {detail.deed_status === 'clean' && <Shield size={18} style={{ color: DEED_STATUS_COLORS.clean }} />}
              {detail.deed_status === 'encumbered' && <AlertTriangle size={18} style={{ color: DEED_STATUS_COLORS.encumbered }} />}
              {detail.deed_status === 'disputed' && <Scale size={18} style={{ color: DEED_STATUS_COLORS.disputed }} />}
              <span style={{
                fontSize: 15, fontWeight: 700,
                color: detail.deed_status ? DEED_STATUS_COLORS[detail.deed_status] : 'var(--quiet-gray-500, #6b7280)',
              }}>
                {detail.deed_status ? DEED_STATUS_LABELS[detail.deed_status] : 'غير محدد'}
              </span>
            </div>
          </div>
          {detail.encumbrances && (
            <div className="lsd-notes-section">
              <div className="lsd-notes-section__label">الأعباء والرهون</div>
              <p className="lsd-description-text">{detail.encumbrances}</p>
            </div>
          )}
          {!detail.deed_status && !detail.encumbrances && (
            <div className="lsd-empty-state-small">
              <FileText size={22} />
              <span>لم يتم تحديد حالة الصك</span>
            </div>
          )}
        </div>
      </div>

      {/* ── بطاقة أطراف المعاملة ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title">
            <Users size={15} />
            أطراف المعاملة
            {parties.length > 0 && <span className="lsd-tab__count">{parties.length}</span>}
          </div>
          <button className="lsd-card__action" onClick={() => partyList.setShowAddForm(true)}>
            <Plus size={13} />
            إضافة طرف
          </button>
        </div>
        <div className="lsd-card__content">
          {/* نموذج إضافة */}
          <AnimatePresence>
            {partyList.showAddForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: 12, background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>إضافة طرف جديد</h4>
                  <div className="lsd-info-grid">
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">الاسم *</label>
                      <input className="lsd-form-input" value={newParty.name || ''} onChange={e => setNewParty({ ...newParty, name: e.target.value })} placeholder="اسم الطرف" />
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">الدور *</label>
                      <select className="lsd-form-input" value={newParty.role || ''} onChange={e => setNewParty({ ...newParty, role: e.target.value as any })}>
                        <option value="">اختر الدور</option>
                        {Object.entries(PARTY_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">رقم الهوية</label>
                      <input className="lsd-form-input" value={newParty.id_number || ''} onChange={e => setNewParty({ ...newParty, id_number: e.target.value })} placeholder="رقم الهوية" dir="ltr" />
                    </div>
                  </div>
                  <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                    <button className="lsd-header-btn" onClick={() => { partyList.setShowAddForm(false); setNewParty({}); }}>إلغاء</button>
                    <button
                      className="lsd-header-btn lsd-header-btn--primary"
                      onClick={() => {
                        if (!newParty.name?.trim()) { toast.error('يرجى إدخال اسم الطرف'); return; }
                        if (!newParty.role) { toast.error('يرجى اختيار دور الطرف'); return; }
                        partyList.handleAdd({ ...newParty, name: newParty.name!, role: newParty.role! });
                        setNewParty({});
                      }}
                      disabled={partyList.addLoading}
                    >
                      {partyList.addLoading ? 'جارٍ...' : 'إضافة'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* جدول الأطراف */}
          {parties.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary, #f3f4f6)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>الاسم</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid var(--border-color, #e5e7eb)', width: 100 }}>الدور</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid var(--border-color, #e5e7eb)', width: 130 }}>رقم الهوية</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, borderBottom: '1px solid var(--border-color, #e5e7eb)', width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {parties.map((party, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User size={14} style={{ color: 'var(--quiet-gray-400, #9ca3af)' }} />
                        {party.name}
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                        background: '#eff6ff', color: '#3b82f6',
                      }}>
                        {PARTY_ROLE_LABELS[party.role] || party.role}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--quiet-gray-600, #4b5563)' }} dir="ltr">
                      {party.id_number || '—'}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button
                        className="lsd-doc-action-btn"
                        title="حذف الطرف"
                        onClick={() => partyList.handleRemove(idx)}
                        disabled={partyList.removeLoadingIdx === idx}
                      >
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            !partyList.showAddForm && (
              <div className="lsd-empty-state-small">
                <Users size={22} />
                <span>لا يوجد أطراف مسجلون</span>
                <button className="lsd-header-btn lsd-header-btn--primary" style={{ marginTop: 8 }} onClick={() => partyList.setShowAddForm(true)}>
                  <Plus size={13} /> إضافة الطرف الأول
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── بطاقة معلومات الإيجار (شرطية) ── */}
      {detail.real_estate_service_type === 'lease_management' && (
        <div className="lsd-card">
          <div className="lsd-card__header">
            <div className="lsd-card__title">
              <Key size={15} />
              معلومات الإيجار
            </div>
            <button
              className="lsd-card__action"
              onClick={() => {
                setEditingLease(true);
                setLeaseData({
                  ejar_contract_number: detail.ejar_contract_number || '',
                  annual_rent: detail.annual_rent || '',
                  lease_start_date: detail.lease_start_date || '',
                  lease_end_date: detail.lease_end_date || '',
                });
              }}
            >
              <Edit2 size={13} />
              تعديل
            </button>
          </div>
          <div className="lsd-card__content">
            {editingLease ? (
              <div>
                <div className="lsd-info-grid">
                  <div className="lsd-form-group">
                    <label className="lsd-form-label">رقم عقد إيجار</label>
                    <input className="lsd-form-input" value={leaseData.ejar_contract_number || ''} onChange={e => setLeaseData({ ...leaseData, ejar_contract_number: e.target.value })} placeholder="رقم عقد إيجار" dir="ltr" />
                  </div>
                  <div className="lsd-form-group">
                    <label className="lsd-form-label">الإيجار السنوي (ر.س)</label>
                    <input className="lsd-form-input" value={leaseData.annual_rent || ''} onChange={e => setLeaseData({ ...leaseData, annual_rent: e.target.value })} placeholder="الإيجار السنوي" dir="ltr" />
                  </div>
                  <div className="lsd-form-group">
                    <label className="lsd-form-label">تاريخ بداية العقد</label>
                    <input className="lsd-form-input" type="date" value={leaseData.lease_start_date || ''} onChange={e => setLeaseData({ ...leaseData, lease_start_date: e.target.value })} dir="ltr" />
                  </div>
                  <div className="lsd-form-group">
                    <label className="lsd-form-label">تاريخ نهاية العقد</label>
                    <input className="lsd-form-input" type="date" value={leaseData.lease_end_date || ''} onChange={e => setLeaseData({ ...leaseData, lease_end_date: e.target.value })} dir="ltr" />
                  </div>
                </div>
                <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                  <button className="lsd-header-btn" onClick={() => setEditingLease(false)}>إلغاء</button>
                  <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveLease} disabled={leaseLoading}>
                    {leaseLoading ? 'جارٍ الحفظ...' : 'حفظ'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="lsd-info-grid">
                {detail.ejar_contract_number && (
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__icon"><CreditCard size={14} /></div>
                    <div className="lsd-info-item__body">
                      <div className="lsd-info-item__label">رقم عقد إيجار</div>
                      <div className="lsd-info-item__value" dir="ltr">{detail.ejar_contract_number}</div>
                    </div>
                  </div>
                )}
                {detail.annual_rent && (
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__icon"><DollarSign size={14} /></div>
                    <div className="lsd-info-item__body">
                      <div className="lsd-info-item__label">الإيجار السنوي</div>
                      <div className="lsd-info-item__value">{formatCurrency(detail.annual_rent)}</div>
                    </div>
                  </div>
                )}
                {detail.lease_start_date && (
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__icon"><Calendar size={14} /></div>
                    <div className="lsd-info-item__body">
                      <div className="lsd-info-item__label">بداية العقد</div>
                      <div className="lsd-info-item__value">{formatDate(detail.lease_start_date)}</div>
                    </div>
                  </div>
                )}
                {detail.lease_end_date && (
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__icon"><Clock size={14} /></div>
                    <div className="lsd-info-item__body">
                      <div className="lsd-info-item__label">نهاية العقد</div>
                      <div className="lsd-info-item__value">{formatDate(detail.lease_end_date)}</div>
                    </div>
                  </div>
                )}
                {!detail.ejar_contract_number && !detail.annual_rent && !detail.lease_start_date && !detail.lease_end_date && (
                  <div className="lsd-empty-state-small" style={{ gridColumn: '1 / -1' }}>
                    <Key size={22} />
                    <span>لم يتم إدخال معلومات الإيجار بعد</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── بطاقة الورثة (شرطية) ── */}
      {detail.real_estate_service_type === 'inheritance_division' && (
        <div className="lsd-card">
          <div className="lsd-card__header">
            <div className="lsd-card__title">
              <Users size={15} />
              الورثة
              {heirs.length > 0 && <span className="lsd-tab__count">{heirs.length}</span>}
            </div>
            <button className="lsd-card__action" onClick={() => heirList.setShowAddForm(true)}>
              <Plus size={13} />
              إضافة وارث
            </button>
          </div>
          <div className="lsd-card__content">
            {/* نموذج إضافة */}
            <AnimatePresence>
              {heirList.showAddForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ padding: 12, background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>إضافة وارث جديد</h4>
                    <div className="lsd-info-grid">
                      <div className="lsd-form-group">
                        <label className="lsd-form-label">الاسم *</label>
                        <input className="lsd-form-input" value={newHeir.name || ''} onChange={e => setNewHeir({ ...newHeir, name: e.target.value })} placeholder="اسم الوارث" />
                      </div>
                      <div className="lsd-form-group">
                        <label className="lsd-form-label">صلة القرابة *</label>
                        <input className="lsd-form-input" value={newHeir.relationship || ''} onChange={e => setNewHeir({ ...newHeir, relationship: e.target.value })} placeholder="مثال: ابن، بنت، زوجة" />
                      </div>
                      <div className="lsd-form-group">
                        <label className="lsd-form-label">نصيب الإرث</label>
                        <input className="lsd-form-input" value={newHeir.share_fraction || ''} onChange={e => setNewHeir({ ...newHeir, share_fraction: e.target.value })} placeholder="مثال: 1/4" dir="ltr" />
                      </div>
                      <div className="lsd-form-group">
                        <label className="lsd-form-label">رقم الهوية</label>
                        <input className="lsd-form-input" value={newHeir.id_number || ''} onChange={e => setNewHeir({ ...newHeir, id_number: e.target.value })} placeholder="رقم الهوية" dir="ltr" />
                      </div>
                    </div>
                    <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                      <button className="lsd-header-btn" onClick={() => { heirList.setShowAddForm(false); setNewHeir({}); }}>إلغاء</button>
                      <button
                        className="lsd-header-btn lsd-header-btn--primary"
                        onClick={() => {
                          if (!newHeir.name?.trim()) { toast.error('يرجى إدخال اسم الوارث'); return; }
                          if (!newHeir.relationship?.trim()) { toast.error('يرجى إدخال صلة القرابة'); return; }
                          heirList.handleAdd({ ...newHeir, name: newHeir.name!, relationship: newHeir.relationship! });
                          setNewHeir({});
                        }}
                        disabled={heirList.addLoading}
                      >
                        {heirList.addLoading ? 'جارٍ...' : 'إضافة'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* جدول الورثة */}
            {heirs.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary, #f3f4f6)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>الاسم</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid var(--border-color, #e5e7eb)', width: 120 }}>صلة القرابة</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid var(--border-color, #e5e7eb)', width: 100 }}>النصيب</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid var(--border-color, #e5e7eb)', width: 130 }}>رقم الهوية</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, borderBottom: '1px solid var(--border-color, #e5e7eb)', width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {heirs.map((heir, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <User size={14} style={{ color: 'var(--quiet-gray-400, #9ca3af)' }} />
                          {heir.name}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--quiet-gray-600, #4b5563)' }}>
                        {heir.relationship}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, color: '#3b82f6' }} dir="ltr">
                        {heir.share_fraction || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--quiet-gray-600, #4b5563)' }} dir="ltr">
                        {heir.id_number || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <button
                          className="lsd-doc-action-btn"
                          title="حذف الوارث"
                          onClick={() => heirList.handleRemove(idx)}
                          disabled={heirList.removeLoadingIdx === idx}
                        >
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              !heirList.showAddForm && (
                <div className="lsd-empty-state-small">
                  <Users size={22} />
                  <span>لا يوجد ورثة مسجلون</span>
                  <button className="lsd-header-btn lsd-header-btn--primary" style={{ marginTop: 8 }} onClick={() => heirList.setShowAddForm(true)}>
                    <Plus size={13} /> إضافة الوارث الأول
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealEstateWorkspace;
