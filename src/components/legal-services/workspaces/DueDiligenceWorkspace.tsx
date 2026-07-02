import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Edit2, Plus, X, Building2, Hash, FileText, Flag,
  AlertTriangle, CheckCircle, MapPin, DollarSign,
  ClipboardList, ScrollText,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../../services/legalServiceService';
import { getApiErrorMessage } from '../../../utils/apiError';
import type { WorkspaceProps } from './types';
import MicroStatsBar from './MicroStatsBar';
import LegalRichEditorField from '../LegalRichEditorField';

// ── تسميات عربية ──

const DD_TYPE_LABELS: Record<string, string> = {
  acquisition: 'استحواذ', merger: 'اندماج', investment: 'استثمار',
  partnership: 'شراكة', ipo: 'طرح عام', real_estate: 'عقاري',
  regulatory: 'تنظيمي', other: 'أخرى',
};

const RECOMMENDATION_LABELS: Record<string, string> = {
  proceed: 'المضي', proceed_with_conditions: 'المضي بشروط', do_not_proceed: 'عدم المضي',
};
const RECOMMENDATION_COLORS: Record<string, string> = {
  proceed: 'var(--status-green)', proceed_with_conditions: 'var(--status-orange)', do_not_proceed: 'var(--status-red)',
};

// خيارات الإدخال (تُرسل medium — الخادم يطبّعها إلى moderate قبل الحفظ)
const RISK_SELECT_LABELS: Record<string, string> = { low: 'منخفض', medium: 'متوسط', high: 'مرتفع', critical: 'حرج' };
// تسميات العرض — تشمل moderate كما تُحفظ في القاعدة
const RISK_LABELS: Record<string, string> = { low: 'منخفض', medium: 'متوسط', moderate: 'متوسط', high: 'مرتفع', critical: 'حرج' };
const RISK_COLORS: Record<string, string> = { low: 'var(--status-green)', medium: 'var(--status-orange)', moderate: 'var(--status-orange)', high: 'var(--status-red)', critical: 'var(--status-red)' };

const FLAG_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  red: { bg: 'var(--status-red-light)', text: 'var(--status-red)', label: 'أحمر' },
  yellow: { bg: 'var(--status-orange-light)', text: 'var(--status-orange)', label: 'أصفر' },
  green: { bg: 'var(--status-green-light)', text: 'var(--status-green)', label: 'أخضر' },
};

const DEFAULT_SCOPE_AREAS = [
  { key: 'contracts', label: 'عقود' },
  { key: 'litigation', label: 'تقاضي' },
  { key: 'licenses', label: 'تراخيص' },
  { key: 'employees', label: 'موظفين' },
  { key: 'ip', label: 'ملكية فكرية' },
  { key: 'real_estate', label: 'عقارات' },
  { key: 'tax', label: 'ضريبي' },
  { key: 'corporate', label: 'مؤسسي' },
];

function formatCurrency(a: string | number | null | undefined): string {
  if (!a) return '—';
  return `${Number(a).toLocaleString('ar-SA')} ر.س`;
}

// ── المكون الرئيسي ──

const DueDiligenceWorkspace: React.FC<WorkspaceProps> = ({ service, refreshService }) => {
  const detail = service.due_diligence_detail;

  // ── حالة التحرير ──
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetData, setTargetData] = useState<Record<string, any>>({});
  const [targetLoading, setTargetLoading] = useState(false);

  // ── نطاقات الفحص ──
  const [scopeLoading, setScopeLoading] = useState(false);

  // ── النتائج ──
  const [activeFilter, setActiveFilter] = useState<'all' | 'red' | 'yellow' | 'green'>('all');
  const [showAddFinding, setShowAddFinding] = useState(false);
  const [newFinding, setNewFinding] = useState<Record<string, any>>({});
  const [addFindingLoading, setAddFindingLoading] = useState(false);

  // ── ملخص المخاطر (التقييم المنظَّم) ──
  const [editingRisk, setEditingRisk] = useState(false);
  const [riskData, setRiskData] = useState<Record<string, any>>({});
  const [riskLoading, setRiskLoading] = useState(false);

  const scopeAreas = useMemo(() => detail?.scope_areas ?? [], [detail?.scope_areas]);
  const findings = useMemo(() => detail?.findings ?? [], [detail?.findings]);
  const filteredFindings = useMemo(() => {
    if (activeFilter === 'all') return findings;
    return findings.filter(f => f.risk_level === activeFilter);
  }, [findings, activeFilter]);

  if (!detail) {
    return (
      <div className="lsd-empty-tab">
        <Search size={32} />
        <p>لا توجد تفاصيل للفحص النافي للجهالة بعد</p>
        <p style={{ fontSize: 12, color: 'var(--quiet-gray-400)' }}>تُنشأ التفاصيل تلقائياً مع الخدمة — حدّث الصفحة، وإن استمرت المشكلة تواصل مع الدعم</p>
      </div>
    );
  }

  // قيمة الصفقة: الخادم يقبل deal_value ويحفظها/يعيدها estimated_deal_value
  const dealValue = detail.estimated_deal_value ?? detail.deal_value;

  // ── معالجات ──

  const handleSaveTarget = async () => {
    setTargetLoading(true);
    try {
      const res = await LegalServiceService.updateDdTargetInfo(service.id, targetData);
      if (res.success) { toast.success('تم حفظ بيانات الشركة المستهدفة'); setEditingTarget(false); await refreshService(); }
      else toast.error(res.message || 'تعذّر حفظ بيانات الشركة المستهدفة');
    } catch (err) { toast.error(getApiErrorMessage(err, 'تعذّر حفظ بيانات الشركة المستهدفة')); }
    finally { setTargetLoading(false); }
  };

  const handleToggleScope = async (area: string, checked: boolean) => {
    setScopeLoading(true);
    try {
      const updated = scopeAreas.map(s => s.area === area ? { ...s, checked } : s);
      // إضافة النطاق إذا لم يكن موجوداً
      if (!updated.find(s => s.area === area)) {
        updated.push({ area, checked, included: checked, assigned_to: '', notes: '' });
      }
      const res = await LegalServiceService.updateDdScopeAreas(service.id, updated);
      if (res.success) { await refreshService(); }
      else toast.error(res.message || 'تعذّر تحديث نطاقات الفحص');
    } catch (err) { toast.error(getApiErrorMessage(err, 'تعذّر تحديث نطاقات الفحص')); }
    finally { setScopeLoading(false); }
  };

  const handleUpdateScopeNotes = async (area: string, field: 'assigned_to' | 'notes', value: string) => {
    const updated = scopeAreas.map(s => s.area === area ? { ...s, [field]: value } : s);
    try {
      const res = await LegalServiceService.updateDdScopeAreas(service.id, updated);
      if (res.success) { await refreshService(); }
      else toast.error(res.message || 'تعذّر حفظ ملاحظات النطاق');
    } catch (err) { toast.error(getApiErrorMessage(err, 'تعذّر حفظ ملاحظات النطاق')); }
  };

  const handleAddFinding = async () => {
    if (!newFinding.finding?.trim()) { toast.error('يرجى إدخال وصف النتيجة'); return; }
    if (!newFinding.risk_level) { toast.error('يرجى اختيار مستوى الخطر'); return; }
    setAddFindingLoading(true);
    try {
      const res = await LegalServiceService.addDdFinding(service.id, newFinding);
      if (res.success) { toast.success('تمت إضافة النتيجة'); setShowAddFinding(false); setNewFinding({}); await refreshService(); }
      else toast.error(res.message || 'تعذّر إضافة النتيجة');
    } catch (err) { toast.error(getApiErrorMessage(err, 'تعذّر إضافة النتيجة')); }
    finally { setAddFindingLoading(false); }
  };

  const handleRemoveFinding = async (idx: number) => {
    try {
      const res = await LegalServiceService.removeDdFinding(service.id, idx);
      if (res.success) { toast.success('تم حذف النتيجة'); await refreshService(); }
      else toast.error(res.message || 'تعذّر حذف النتيجة');
    } catch (err) { toast.error(getApiErrorMessage(err, 'تعذّر حذف النتيجة')); }
  };

  const handleSaveRisk = async () => {
    setRiskLoading(true);
    try {
      const res = await LegalServiceService.updateDdTargetInfo(service.id, riskData);
      if (res.success) { toast.success('تم حفظ تقييم المخاطر'); setEditingRisk(false); await refreshService(); }
      else toast.error(res.message || 'تعذّر حفظ تقييم المخاطر');
    } catch (err) { toast.error(getApiErrorMessage(err, 'تعذّر حفظ تقييم المخاطر')); }
    finally { setRiskLoading(false); }
  };

  // ── معالجات الكتابة الغنية ──

  const handleSaveSummary = async (html: string) => {
    const res = await LegalServiceService.updateDdTargetInfo(service.id, { executive_summary: html });
    if (!res?.success) throw new Error(res?.message || 'تعذّر حفظ الملخص التنفيذي');
    await refreshService();
  };

  const handleSaveRecommendationDetails = async (html: string) => {
    const res = await LegalServiceService.updateDdTargetInfo(service.id, {
      overall_risk: detail.overall_risk || '',
      recommendation: detail.recommendation || '',
      recommendation_details: html,
    });
    if (!res?.success) throw new Error(res?.message || 'تعذّر حفظ تفاصيل التوصية');
    await refreshService();
  };

  const handleSaveDetailedReport = async (html: string) => {
    const res = await LegalServiceService.updateDdTargetInfo(service.id, { detailed_report: html });
    if (!res?.success) throw new Error(res?.message || 'تعذّر حفظ التقرير التفصيلي');
    await refreshService();
  };

  return (
    <div className="lsd-tab-content-stack">

      {/* ── شريط المؤشرات ── */}
      <MicroStatsBar items={[
        ...(detail.red_flags_count > 0 ? [{ label: 'علامات حمراء', value: `${detail.red_flags_count}`, icon: Flag as any, color: 'red' as const }] : []),
        ...(detail.yellow_flags_count > 0 ? [{ label: 'علامات صفراء', value: `${detail.yellow_flags_count}`, icon: Flag as any, color: 'amber' as const }] : []),
        ...(detail.green_flags_count > 0 ? [{ label: 'علامات خضراء', value: `${detail.green_flags_count}`, icon: Flag as any, color: 'green' as const }] : []),
        ...(detail.overall_risk ? [{ label: 'المخاطر الإجمالية', value: RISK_LABELS[detail.overall_risk] || detail.overall_risk, icon: AlertTriangle as any, color: (detail.overall_risk === 'low' ? 'green' : (detail.overall_risk === 'medium' || detail.overall_risk === 'moderate') ? 'amber' : 'red') as any }] : []),
        ...(detail.recommendation ? [{ label: 'التوصية', value: RECOMMENDATION_LABELS[detail.recommendation] || detail.recommendation, icon: CheckCircle as any, color: (detail.recommendation === 'proceed' ? 'green' : detail.recommendation === 'proceed_with_conditions' ? 'amber' : 'red') as any }] : []),
      ]} />

      {/* ── بطاقة الشركة المستهدفة ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><Building2 size={15} /> الشركة المستهدفة</div>
          <button className="lsd-card__action" onClick={() => {
            setEditingTarget(true);
            setTargetData({
              target_company_name: detail.target_company_name || '', target_cr_number: detail.target_cr_number || '',
              target_industry: detail.target_industry || '', target_location: detail.target_location || '',
              deal_value: detail.estimated_deal_value ?? detail.deal_value ?? '', dd_type: detail.dd_type || '',
            });
          }}><Edit2 size={13} /> تعديل</button>
        </div>
        <div className="lsd-card__content">
          {editingTarget ? (
            <div>
              <div className="lsd-info-grid">
                <div className="lsd-form-group"><label className="lsd-form-label">نوع الفحص</label><select className="lsd-form-input" value={targetData.dd_type || ''} onChange={e => setTargetData({ ...targetData, dd_type: e.target.value })}><option value="">اختر</option>{Object.entries(DD_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="lsd-form-group"><label className="lsd-form-label">اسم الشركة</label><input className="lsd-form-input" value={targetData.target_company_name || ''} onChange={e => setTargetData({ ...targetData, target_company_name: e.target.value })} /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">السجل التجاري</label><input className="lsd-form-input" value={targetData.target_cr_number || ''} onChange={e => setTargetData({ ...targetData, target_cr_number: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">القطاع</label><input className="lsd-form-input" value={targetData.target_industry || ''} onChange={e => setTargetData({ ...targetData, target_industry: e.target.value })} /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">الموقع</label><input className="lsd-form-input" value={targetData.target_location || ''} onChange={e => setTargetData({ ...targetData, target_location: e.target.value })} /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">قيمة الصفقة</label><input className="lsd-form-input" type="number" value={targetData.deal_value || ''} onChange={e => setTargetData({ ...targetData, deal_value: e.target.value })} dir="ltr" /></div>
              </div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingTarget(false)}>إلغاء</button>
                <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveTarget} disabled={targetLoading}>{targetLoading ? 'جارٍ...' : 'حفظ'}</button>
              </div>
            </div>
          ) : (
            <div className="lsd-info-grid">
              {detail.dd_type && <div className="lsd-info-item"><div className="lsd-info-item__icon"><ClipboardList size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">نوع الفحص</div><div className="lsd-info-item__value">{DD_TYPE_LABELS[detail.dd_type] || detail.dd_type}</div></div></div>}
              {detail.target_company_name && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Building2 size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">الشركة</div><div className="lsd-info-item__value">{detail.target_company_name}</div></div></div>}
              {detail.target_cr_number && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Hash size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">السجل التجاري</div><div className="lsd-info-item__value">{detail.target_cr_number}</div></div></div>}
              {detail.target_industry && <div className="lsd-info-item"><div className="lsd-info-item__icon"><FileText size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">القطاع</div><div className="lsd-info-item__value">{detail.target_industry}</div></div></div>}
              {detail.target_location && <div className="lsd-info-item"><div className="lsd-info-item__icon"><MapPin size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">الموقع</div><div className="lsd-info-item__value">{detail.target_location}</div></div></div>}
              {dealValue && <div className="lsd-info-item"><div className="lsd-info-item__icon"><DollarSign size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">قيمة الصفقة</div><div className="lsd-info-item__value">{formatCurrency(dealValue)}</div></div></div>}
              {!detail.target_company_name && <div style={{ fontSize: 13, color: 'var(--quiet-gray-400)' }}>لم تُضف بيانات الشركة المستهدفة بعد — اضغط «تعديل» أعلى البطاقة لإدخالها</div>}
            </div>
          )}
        </div>
      </div>

      {/* ── بطاقة نطاقات الفحص ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><ClipboardList size={15} /> نطاقات الفحص</div>
        </div>
        <div className="lsd-card__content">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DEFAULT_SCOPE_AREAS.map(area => {
              const existing = scopeAreas.find(s => s.area === area.key);
              const isChecked = existing?.checked ?? false;
              return (
                <div key={area.key} style={{ padding: 10, background: isChecked ? 'var(--status-green-light)' : 'var(--bg-secondary, #f8f9fa)', borderRadius: 8, border: `1px solid ${isChecked ? 'var(--status-green)' : 'var(--quiet-gray-200)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                      <input type="checkbox" checked={isChecked} onChange={e => handleToggleScope(area.key, e.target.checked)} disabled={scopeLoading} style={{ width: 16, height: 16 }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{area.label}</span>
                    </label>
                    {existing?.assigned_to && <span style={{ fontSize: 11, color: 'var(--quiet-gray-400)' }}>المكلف: {existing.assigned_to}</span>}
                  </div>
                  {isChecked && existing && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <input className="lsd-form-input" placeholder="المكلف" value={existing.assigned_to || ''} onBlur={e => handleUpdateScopeNotes(area.key, 'assigned_to', e.target.value)} onChange={e => {
                        // مباشرة - يُرسل عند فقدان التركيز
                      }} style={{ flex: 1, fontSize: 12 }} defaultValue={existing.assigned_to || ''} />
                      <input className="lsd-form-input" placeholder="ملاحظات" onBlur={e => handleUpdateScopeNotes(area.key, 'notes', e.target.value)} style={{ flex: 2, fontSize: 12 }} defaultValue={existing.notes || ''} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── بطاقة النتائج مع فلاتر ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><FileText size={15} /> النتائج {findings.length > 0 && <span className="lsd-tab__count">{findings.length}</span>}</div>
          <button className="lsd-card__action" onClick={() => setShowAddFinding(true)}><Plus size={13} /> إضافة</button>
        </div>
        <div className="lsd-card__content">
          {/* فلاتر الأعلام */}
          {findings.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <button
                onClick={() => setActiveFilter('all')}
                style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, border: '1px solid', cursor: 'pointer', background: activeFilter === 'all' ? 'var(--law-navy)' : 'var(--dashboard-card)', color: activeFilter === 'all' ? 'var(--dashboard-card)' : 'var(--quiet-gray-500)', borderColor: activeFilter === 'all' ? 'var(--law-navy)' : 'var(--quiet-gray-200)' }}
              >
                الكل ({findings.length})
              </button>
              {(['red', 'yellow', 'green'] as const).map(level => {
                const count = findings.filter(f => f.risk_level === level).length;
                if (count === 0) return null;
                const flagColor = FLAG_COLORS[level];
                return (
                  <button
                    key={level}
                    onClick={() => setActiveFilter(activeFilter === level ? 'all' : level)}
                    style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, border: '1px solid', cursor: 'pointer', background: activeFilter === level ? flagColor.text : flagColor.bg, color: activeFilter === level ? 'var(--dashboard-card)' : flagColor.text, borderColor: activeFilter === level ? flagColor.text : 'transparent' }}
                  >
                    {flagColor.label} ({count})
                  </button>
                );
              })}
            </div>
          )}

          <AnimatePresence>
            {showAddFinding && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: 12, background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
                  <div className="lsd-info-grid">
                    <div className="lsd-form-group"><label className="lsd-form-label">الفئة</label><input className="lsd-form-input" value={newFinding.category || ''} onChange={e => setNewFinding({ ...newFinding, category: e.target.value })} placeholder="مثال: عقود، ملكية فكرية..." /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">مستوى الخطر *</label><select className="lsd-form-input" value={newFinding.risk_level || ''} onChange={e => setNewFinding({ ...newFinding, risk_level: e.target.value })}><option value="">اختر</option><option value="red">أحمر</option><option value="yellow">أصفر</option><option value="green">أخضر</option></select></div>
                  </div>
                  <div className="lsd-form-group" style={{ marginTop: 8 }}><label className="lsd-form-label">النتيجة *</label><textarea className="lsd-form-textarea" rows={2} value={newFinding.finding || ''} onChange={e => setNewFinding({ ...newFinding, finding: e.target.value })} placeholder="وصف النتيجة..." /></div>
                  <div className="lsd-form-group" style={{ marginTop: 8 }}><label className="lsd-form-label">التوصية</label><textarea className="lsd-form-textarea" rows={2} value={newFinding.recommendation || ''} onChange={e => setNewFinding({ ...newFinding, recommendation: e.target.value })} placeholder="التوصية..." /></div>
                  <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                    <button className="lsd-header-btn" onClick={() => { setShowAddFinding(false); setNewFinding({}); }}>إلغاء</button>
                    <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleAddFinding} disabled={addFindingLoading}>{addFindingLoading ? 'جارٍ...' : 'إضافة'}</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {filteredFindings.length > 0 ? (
            <div className="lsd-references-list">
              {filteredFindings.map((item, idx) => {
                const flagColor = FLAG_COLORS[item.risk_level] || FLAG_COLORS.yellow;
                // إيجاد الفهرس الأصلي في المصفوفة الكاملة
                const originalIdx = findings.indexOf(item);
                return (
                  <div key={idx} className="lsd-reference-item" style={{ alignItems: 'flex-start', borderRight: `3px solid ${flagColor.text}` }}>
                    <div className="lsd-reference-item__body" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        {item.category && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--quiet-gray-500)', background: 'var(--bg-secondary, #f3f4f6)', padding: '1px 6px', borderRadius: 4 }}>{item.category}</span>}
                        <span style={{ fontSize: 11, fontWeight: 600, color: flagColor.text, background: flagColor.bg, padding: '1px 6px', borderRadius: 4 }}>{flagColor.label}</span>
                      </div>
                      <div className="lsd-reference-item__title">{item.finding}</div>
                      {item.recommendation && <div style={{ fontSize: 12, color: 'var(--quiet-gray-400)', marginTop: 4 }}>التوصية: {item.recommendation}</div>}
                    </div>
                    <button className="lsd-doc-action-btn" onClick={() => handleRemoveFinding(originalIdx)}><X size={13} /></button>
                  </div>
                );
              })}
            </div>
          ) : (
            !showAddFinding && (
              <div className="lsd-empty-state-small"><FileText size={22} /><span>{activeFilter !== 'all' ? 'لا توجد نتائج بهذا التصنيف' : 'لا توجد نتائج بعد'}</span>
                <button className="lsd-header-btn lsd-header-btn--primary" style={{ marginTop: 8 }} onClick={() => setShowAddFinding(true)}><Plus size={13} /> إضافة نتيجة</button>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── بطاقة ملخص المخاطر ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><AlertTriangle size={15} /> ملخص المخاطر</div>
          <button className="lsd-card__action" onClick={() => {
            setEditingRisk(true);
            setRiskData({
              // القاعدة تحفظ moderate — نعرضها في القائمة كـ medium (الخادم يقبل الاثنين)
              overall_risk: detail.overall_risk === 'moderate' ? 'medium' : (detail.overall_risk || ''),
              recommendation: detail.recommendation || '',
              recommendation_details: detail.recommendation_details || '',
            });
          }}><Edit2 size={13} /> تعديل</button>
          {/* تفاصيل التوصية تُحرَّر كنص غني في بطاقة مستقلة أدناه */}
        </div>
        <div className="lsd-card__content">
          {editingRisk ? (
            <div>
              <div className="lsd-info-grid">
                <div className="lsd-form-group"><label className="lsd-form-label">المخاطر الإجمالية</label><select className="lsd-form-input" value={riskData.overall_risk || ''} onChange={e => setRiskData({ ...riskData, overall_risk: e.target.value })}><option value="">اختر</option>{Object.entries(RISK_SELECT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="lsd-form-group"><label className="lsd-form-label">التوصية</label><select className="lsd-form-input" value={riskData.recommendation || ''} onChange={e => setRiskData({ ...riskData, recommendation: e.target.value })}><option value="">اختر</option>{Object.entries(RECOMMENDATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingRisk(false)}>إلغاء</button>
                <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveRisk} disabled={riskLoading}>{riskLoading ? 'جارٍ...' : 'حفظ'}</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="lsd-info-grid">
                {detail.overall_risk && <div className="lsd-info-item"><div className="lsd-info-item__icon"><AlertTriangle size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">المخاطر الإجمالية</div><div className="lsd-info-item__value" style={{ color: RISK_COLORS[detail.overall_risk] || 'var(--quiet-gray-500)', fontWeight: 700 }}>{RISK_LABELS[detail.overall_risk] || detail.overall_risk}</div></div></div>}
                {detail.recommendation && <div className="lsd-info-item"><div className="lsd-info-item__icon"><CheckCircle size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">التوصية</div><div className="lsd-info-item__value" style={{ color: RECOMMENDATION_COLORS[detail.recommendation] || 'var(--quiet-gray-500)', fontWeight: 700 }}>{RECOMMENDATION_LABELS[detail.recommendation] || detail.recommendation}</div></div></div>}
              </div>
              {!detail.overall_risk && !detail.recommendation && <div style={{ fontSize: 13, color: 'var(--quiet-gray-400)' }}>لم يُحدد تقييم المخاطر بعد — اضغط «تعديل» لاختيار مستوى المخاطر والتوصية</div>}
            </div>
          )}
        </div>
      </div>

      {/* ── تفاصيل التوصية (نص غني) ── */}
      <LegalRichEditorField
        label="تفاصيل التوصية"
        icon={CheckCircle}
        value={detail.recommendation_details}
        onSave={handleSaveRecommendationDetails}
        description="شرح مفصّل للتوصية وأساسها ومتطلبات تنفيذها."
        placeholder="اكتب تفاصيل التوصية هنا..."
        emptyText="لم تُكتب تفاصيل التوصية بعد — اضغط «تعديل» لبدء الكتابة"
        successMessage="تم حفظ تفاصيل التوصية"
        minHeight="180px"
      />

      {/* ── الملخص التنفيذي (نص غني) ── */}
      <LegalRichEditorField
        label="الملخص التنفيذي"
        icon={FileText}
        value={detail.executive_summary}
        onSave={handleSaveSummary}
        description="نظرة عامة موجزة على نتائج الفحص النافي للجهالة وأبرز المخاطر."
        placeholder="اكتب الملخص التنفيذي هنا..."
        emptyText="لم يُكتب الملخص التنفيذي بعد — اضغط «تعديل» لبدء الكتابة"
        successMessage="تم حفظ الملخص التنفيذي"
        minHeight="220px"
      />

      {/* ── التقرير التفصيلي (نص غني) ── */}
      <LegalRichEditorField
        label="التقرير التفصيلي"
        icon={ScrollText}
        value={detail.detailed_report}
        onSave={handleSaveDetailedReport}
        description="متن تقرير الفحص النافي للجهالة الكامل بكل أقسامه وتفصيلاته."
        placeholder="اكتب التقرير التفصيلي هنا..."
        emptyText="لم يُكتب التقرير التفصيلي بعد — اضغط «تعديل» لبدء الكتابة"
        successMessage="تم حفظ التقرير التفصيلي"
        minHeight="360px"
      />
    </div>
  );
};

export default DueDiligenceWorkspace;
