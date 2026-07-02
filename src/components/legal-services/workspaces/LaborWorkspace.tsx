import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, User, Edit2, Plus, X, Calendar, DollarSign, Hash, Clock,
  Calculator, Handshake, FileText, Check, Building2, Briefcase,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../../services/legalServiceService';
import { getApiErrorMessage } from '../../../utils/apiError';
import type { WorkspaceProps } from './types';
import type { ClaimedItem } from '../../../types/legalServices';
import MicroStatsBar from './MicroStatsBar';
import LegalRichEditorField from '../LegalRichEditorField';

// ── تسميات عربية ──

const LABOR_TYPE_LABELS: Record<string, string> = {
  dispute_resolution: 'تسوية نزاع عمالي', end_of_service: 'نهاية خدمة',
  internal_regulations: 'لوائح داخلية', employment_contract: 'عقد عمل',
  termination_advisory: 'استشارة إنهاء', workplace_investigation: 'تحقيق داخلي',
  gosi_qiwa_procedures: 'إجراءات التأمينات/قوى', wage_protection: 'حماية الأجور', other: 'أخرى',
};

const SETTLEMENT_RESULT_LABELS: Record<string, string> = { settled: 'تمت التسوية', failed: 'فشلت', pending: 'قيد الانتظار' };
const SETTLEMENT_RESULT_COLORS: Record<string, string> = { settled: 'var(--status-green)', failed: 'var(--status-red)', pending: 'var(--status-orange)' };

const TERMINATION_REASON_LABELS: Record<string, string> = {
  resignation: 'استقالة', termination: 'إنهاء من صاحب العمل', end_of_contract: 'انتهاء العقد', mutual: 'اتفاق الطرفين', retirement: 'تقاعد',
};

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return d; }
}
function formatCurrency(a: string | number | null | undefined): string {
  // الصفر قيمة صحيحة تُعرض (مثال: استقالة قبل سنتين = مكافأة 0)
  if (a === null || a === undefined || a === '') return '—';
  return `${Number(a).toLocaleString('ar-SA')} ر.س`;
}

// شرح مبسّط لأساس الحساب النظامي — الرقم نفسه يأتي من الخادم (مصدر الحقيقة)
function eosBasisText(reason: string, years: number): string {
  if (reason === 'resignation') {
    if (years < 2) return 'وفق المادة 85: من استقال قبل إتمام سنتين لا يستحق مكافأة نهاية خدمة.';
    if (years < 5) return 'وفق المادة 85: المستقيل بعد سنتين وقبل خمس سنوات يستحق ثلث المكافأة.';
    if (years < 10) return 'وفق المادة 85: المستقيل بعد خمس سنوات وقبل عشر يستحق ثلثي المكافأة.';
    return 'وفق المادة 85: المستقيل بعد عشر سنوات فأكثر يستحق المكافأة كاملة.';
  }
  return 'وفق المادة 84: أجر نصف شهر عن كل سنة من الخمس الأولى، وأجر شهر كامل عن كل سنة تليها — والأجر يشمل البدلات الثابتة (سكن ونقل).';
}

// ── المكون الرئيسي ──

const LaborWorkspace: React.FC<WorkspaceProps> = ({ service, refreshService }) => {
  const detail = service.labor_detail;

  const [editingEmployee, setEditingEmployee] = useState(false);
  const [employeeData, setEmployeeData] = useState<Record<string, any>>({});
  const [employeeLoading, setEmployeeLoading] = useState(false);

  // حاسبة نهاية الخدمة — الخادم مصدر الحقيقة: eosResult يأتي من رد eos-calculate فقط
  const [eosInputs, setEosInputs] = useState({ salary: 0, housing_allowance: 0, transport_allowance: 0, years_of_service: 0, termination_reason: 'end_of_contract' });
  const [eosResult, setEosResult] = useState<number | null>(null);
  // مدخلات الحساب المعروض (لشرح الأساس النظامي المطابق للرقم)
  const [eosResultInputs, setEosResultInputs] = useState<{ years: number; reason: string } | null>(null);
  const [eosSaving, setEosSaving] = useState(false);

  const [editingSettlement, setEditingSettlement] = useState(false);
  const [settlementData, setSettlementData] = useState<Record<string, any>>({});
  const [settlementLoading, setSettlementLoading] = useState(false);

  const [editingFriendly, setEditingFriendly] = useState(false);
  const [friendlyData, setFriendlyData] = useState<Record<string, any>>({});
  const [friendlyLoading, setFriendlyLoading] = useState(false);

  const [showAddClaim, setShowAddClaim] = useState(false);
  const [newClaim, setNewClaim] = useState<Partial<ClaimedItem>>({});
  const [addClaimLoading, setAddClaimLoading] = useState(false);

  const claimedItems = useMemo(() => detail?.claimed_items ?? [], [detail?.claimed_items]);
  const claimedTotal = useMemo(() => claimedItems.reduce((sum, i) => sum + (i.amount || 0), 0), [claimedItems]);

  // تحميل بيانات EOS من التفاصيل
  useEffect(() => {
    if (detail?.eos_calculation && typeof detail.eos_calculation === 'object') {
      const eos = detail.eos_calculation as any;
      setEosInputs({
        salary: eos.salary || parseFloat(detail.monthly_salary || '0'),
        housing_allowance: eos.housing_allowance || 0,
        transport_allowance: eos.transport_allowance || 0,
        years_of_service: eos.years_of_service || 0,
        termination_reason: eos.termination_reason || 'end_of_contract',
      });
    } else if (detail?.monthly_salary) {
      setEosInputs(prev => ({ ...prev, salary: parseFloat(detail.monthly_salary || '0') }));
    }
  }, [detail?.eos_calculation, detail?.monthly_salary]);

  if (!detail) {
    return (
      <div className="lsd-empty-tab">
        <Users size={32} />
        <p>لا توجد تفاصيل للخدمة العمالية بعد</p>
        <p style={{ fontSize: 12, color: 'var(--quiet-gray-400)' }}>تُنشأ التفاصيل تلقائياً مع الخدمة — حدّث الصفحة، وإن استمرت المشكلة تواصل مع الدعم</p>
      </div>
    );
  }

  // حساب سنوات الخدمة
  const yearsOfService = detail.employment_start_date && detail.employment_end_date
    ? Math.round((new Date(detail.employment_end_date).getTime() - new Date(detail.employment_start_date).getTime()) / (365.25 * 86400000) * 10) / 10
    : null;

  // ── معالجات ──

  const handleSaveEmployee = async () => {
    setEmployeeLoading(true);
    try {
      const res = await LegalServiceService.updateEmployeeInfo(service.id, employeeData);
      if (res.success) { toast.success('تم حفظ بيانات الموظف'); setEditingEmployee(false); await refreshService(); }
      else toast.error(res.message || 'تعذّر حفظ بيانات الموظف');
    } catch (err) { toast.error(getApiErrorMessage(err, 'تعذّر حفظ بيانات الموظف')); }
    finally { setEmployeeLoading(false); }
  };

  // الحساب والحفظ معاً — الرقم المعروض هو eos_amount المحسوب نظامياً في الخادم
  const handleSaveEos = async () => {
    setEosSaving(true);
    try {
      const res = await LegalServiceService.calculateEos(service.id, eosInputs);
      if (res.success) {
        const amount = res.data?.eos_amount;
        setEosResult(typeof amount === 'number' ? amount : amount != null ? Number(amount) : null);
        setEosResultInputs({ years: eosInputs.years_of_service, reason: eosInputs.termination_reason });
        toast.success('تم حساب المكافأة وحفظها');
        await refreshService();
      } else toast.error(res.message || 'تعذّر حساب المكافأة');
    } catch (err) { toast.error(getApiErrorMessage(err, 'تعذّر حساب مكافأة نهاية الخدمة')); }
    finally { setEosSaving(false); }
  };

  const handleAddClaim = async () => {
    if (!newClaim.item?.trim()) { toast.error('يرجى إدخال وصف البند'); return; }
    setAddClaimLoading(true);
    try {
      const res = await LegalServiceService.addClaimedItem(service.id, { item: newClaim.item, amount: newClaim.amount || 0 });
      if (res.success) { toast.success('تمت إضافة البند'); setShowAddClaim(false); setNewClaim({}); await refreshService(); }
      else toast.error(res.message || 'تعذّر إضافة البند');
    } catch (err) { toast.error(getApiErrorMessage(err, 'تعذّر إضافة بند المطالبة')); }
    finally { setAddClaimLoading(false); }
  };

  const handleRemoveClaim = async (idx: number) => {
    try {
      const res = await LegalServiceService.removeClaimedItem(service.id, idx);
      if (res.success) { toast.success('تم حذف البند'); await refreshService(); }
      else toast.error(res.message || 'تعذّر حذف البند');
    } catch (err) { toast.error(getApiErrorMessage(err, 'تعذّر حذف بند المطالبة')); }
  };

  const handleSaveFriendly = async () => {
    setFriendlyLoading(true);
    try {
      const res = await LegalServiceService.updateFriendlySettlement(service.id, friendlyData);
      if (res.success) { toast.success('تم الحفظ'); setEditingFriendly(false); await refreshService(); }
      else toast.error(res.message || 'تعذّر حفظ التسوية الودية');
    } catch (err) { toast.error(getApiErrorMessage(err, 'تعذّر حفظ التسوية الودية')); }
    finally { setFriendlyLoading(false); }
  };

  const handleSaveSettlement = async () => {
    setSettlementLoading(true);
    try {
      const res = await LegalServiceService.updateLaborSettlement(service.id, settlementData);
      if (res.success) { toast.success('تم الحفظ'); setEditingSettlement(false); await refreshService(); }
      else toast.error(res.message || 'تعذّر حفظ التسوية');
    } catch (err) { toast.error(getApiErrorMessage(err, 'تعذّر حفظ التسوية')); }
    finally { setSettlementLoading(false); }
  };

  // حفظ شروط التسوية كمحتوى غني — مع الحفاظ على المبلغ والتاريخ الحاليَّين
  const handleSaveSettlementTerms = async (html: string) => {
    const res = await LegalServiceService.updateLaborSettlement(service.id, {
      settlement_amount: detail.settlement_amount || '',
      settlement_terms: html,
      settlement_date: detail.settlement_date || '',
    });
    if (!res?.success) throw new Error(res?.message || 'تعذّر الحفظ');
    await refreshService();
  };

  return (
    <div className="lsd-tab-content-stack">

      {/* ── شريط المؤشرات ── */}
      <MicroStatsBar items={[
        ...(yearsOfService !== null ? [{ label: 'سنوات الخدمة', value: `${yearsOfService}`, icon: Clock as any, color: 'blue' as const }] : []),
        ...(eosResult !== null ? [{ label: 'المكافأة المستحقة', value: formatCurrency(eosResult), icon: Calculator as any, color: (eosResult === 0 ? 'amber' : 'green') as any }] : []),
        ...(claimedTotal > 0 ? [{ label: 'إجمالي المطالبة', value: formatCurrency(claimedTotal), icon: DollarSign as any, color: 'purple' as const }] : []),
        ...(detail.settlement_amount ? [{ label: 'مبلغ التسوية', value: formatCurrency(detail.settlement_amount), icon: Handshake as any, color: 'amber' as const }] : []),
      ]} />

      {/* ── بطاقة بيانات الموظف ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><User size={15} /> بيانات الموظف</div>
          <button className="lsd-card__action" onClick={() => {
            setEditingEmployee(true);
            setEmployeeData({
              employee_name: detail.employee_name || '', employee_id_number: detail.employee_id_number || '',
              employee_nationality: detail.employee_nationality || '', employee_position: detail.employee_position || '',
              employment_start_date: detail.employment_start_date || '', employment_end_date: detail.employment_end_date || '',
              monthly_salary: detail.monthly_salary || '', total_allowances: detail.total_allowances || '',
              employer_name: detail.employer_name || '', employer_cr_number: detail.employer_cr_number || '',
            });
          }}><Edit2 size={13} /> تعديل</button>
        </div>
        <div className="lsd-card__content">
          {editingEmployee ? (
            <div>
              <div className="lsd-info-grid">
                <div className="lsd-form-group"><label className="lsd-form-label">اسم الموظف</label><input className="lsd-form-input" value={employeeData.employee_name || ''} onChange={e => setEmployeeData({ ...employeeData, employee_name: e.target.value })} /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">رقم الهوية</label><input className="lsd-form-input" value={employeeData.employee_id_number || ''} onChange={e => setEmployeeData({ ...employeeData, employee_id_number: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">الجنسية</label><input className="lsd-form-input" value={employeeData.employee_nationality || ''} onChange={e => setEmployeeData({ ...employeeData, employee_nationality: e.target.value })} /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">المنصب</label><input className="lsd-form-input" value={employeeData.employee_position || ''} onChange={e => setEmployeeData({ ...employeeData, employee_position: e.target.value })} /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">تاريخ المباشرة</label><input className="lsd-form-input" type="date" value={employeeData.employment_start_date || ''} onChange={e => setEmployeeData({ ...employeeData, employment_start_date: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">تاريخ الانتهاء</label><input className="lsd-form-input" type="date" value={employeeData.employment_end_date || ''} onChange={e => setEmployeeData({ ...employeeData, employment_end_date: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">الراتب الأساسي</label><input className="lsd-form-input" type="number" value={employeeData.monthly_salary || ''} onChange={e => setEmployeeData({ ...employeeData, monthly_salary: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">إجمالي البدلات</label><input className="lsd-form-input" type="number" value={employeeData.total_allowances || ''} onChange={e => setEmployeeData({ ...employeeData, total_allowances: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">صاحب العمل</label><input className="lsd-form-input" value={employeeData.employer_name || ''} onChange={e => setEmployeeData({ ...employeeData, employer_name: e.target.value })} /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">سجل صاحب العمل</label><input className="lsd-form-input" value={employeeData.employer_cr_number || ''} onChange={e => setEmployeeData({ ...employeeData, employer_cr_number: e.target.value })} dir="ltr" /></div>
              </div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingEmployee(false)}>إلغاء</button>
                <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveEmployee} disabled={employeeLoading}>{employeeLoading ? 'جارٍ...' : 'حفظ'}</button>
              </div>
            </div>
          ) : (
            <div className="lsd-info-grid">
              {detail.employee_name && <div className="lsd-info-item"><div className="lsd-info-item__icon"><User size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">الموظف</div><div className="lsd-info-item__value">{detail.employee_name}</div></div></div>}
              {detail.employee_position && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Briefcase size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">المنصب</div><div className="lsd-info-item__value">{detail.employee_position}</div></div></div>}
              {detail.monthly_salary && <div className="lsd-info-item"><div className="lsd-info-item__icon"><DollarSign size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">الراتب</div><div className="lsd-info-item__value">{formatCurrency(detail.monthly_salary)}</div></div></div>}
              {detail.employer_name && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Building2 size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">صاحب العمل</div><div className="lsd-info-item__value">{detail.employer_name}</div></div></div>}
              {detail.employment_start_date && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Calendar size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">تاريخ المباشرة</div><div className="lsd-info-item__value">{formatDate(detail.employment_start_date)}</div></div></div>}
              {detail.employment_end_date && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Calendar size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">تاريخ الانتهاء</div><div className="lsd-info-item__value">{formatDate(detail.employment_end_date)}</div></div></div>}
              {!detail.employee_name && <div style={{ fontSize: 13, color: 'var(--quiet-gray-400)' }}>لم تُضف بيانات الموظف بعد — اضغط «تعديل» أعلى البطاقة لإدخالها</div>}
            </div>
          )}
        </div>
      </div>

      {/* ── بطاقة حاسبة نهاية الخدمة (Live Calculator) ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><Calculator size={15} /> حاسبة مكافأة نهاية الخدمة</div>
        </div>
        <div className="lsd-card__content">
          <div className="lsd-info-grid">
            <div className="lsd-form-group"><label className="lsd-form-label">الراتب الأساسي</label><input className="lsd-form-input" type="number" value={eosInputs.salary || ''} onChange={e => setEosInputs({ ...eosInputs, salary: parseFloat(e.target.value) || 0 })} dir="ltr" placeholder="0" /></div>
            <div className="lsd-form-group"><label className="lsd-form-label">بدل السكن</label><input className="lsd-form-input" type="number" value={eosInputs.housing_allowance || ''} onChange={e => setEosInputs({ ...eosInputs, housing_allowance: parseFloat(e.target.value) || 0 })} dir="ltr" placeholder="0" /></div>
            <div className="lsd-form-group"><label className="lsd-form-label">بدل النقل</label><input className="lsd-form-input" type="number" value={eosInputs.transport_allowance || ''} onChange={e => setEosInputs({ ...eosInputs, transport_allowance: parseFloat(e.target.value) || 0 })} dir="ltr" placeholder="0" /></div>
            <div className="lsd-form-group"><label className="lsd-form-label">سنوات الخدمة</label><input className="lsd-form-input" type="number" step="0.1" value={eosInputs.years_of_service || ''} onChange={e => setEosInputs({ ...eosInputs, years_of_service: parseFloat(e.target.value) || 0 })} dir="ltr" placeholder="0" /></div>
            <div className="lsd-form-group"><label className="lsd-form-label">سبب الانتهاء</label><select className="lsd-form-input" value={eosInputs.termination_reason} onChange={e => setEosInputs({ ...eosInputs, termination_reason: e.target.value })}>{Object.entries(TERMINATION_REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          </div>

          {/* نتيجة الخادم — المصدر الوحيد للرقم (يشمل البدلات وخصومات الاستقالة نظامياً) */}
          {eosResult !== null && eosResultInputs && (
            eosResult === 0 && eosResultInputs.reason === 'resignation' && eosResultInputs.years < 2 ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16, padding: 16, background: 'var(--status-orange-light)', borderRadius: 8, border: '1px solid var(--status-orange)', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--status-orange)', marginBottom: 4 }}>مكافأة نهاية الخدمة المستحقة</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--status-orange)' }}>0 ر.س</div>
                <div style={{ fontSize: 12, color: 'var(--quiet-gray-600)', marginTop: 6 }}>{eosBasisText(eosResultInputs.reason, eosResultInputs.years)}</div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16, padding: 16, background: 'var(--status-green-light)', borderRadius: 8, border: '1px solid var(--status-green)', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--status-green)', marginBottom: 4 }}>مكافأة نهاية الخدمة المستحقة (محسوبة نظامياً)</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--status-green)' }}>{formatCurrency(eosResult)}</div>
                <div style={{ fontSize: 12, color: 'var(--quiet-gray-600)', marginTop: 6 }}>{eosBasisText(eosResultInputs.reason, eosResultInputs.years)}</div>
              </motion.div>
            )
          )}

          {/* قبل الحساب: إرشاد بسيط بدل بطاقة صامتة */}
          {eosResult === null && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--quiet-gray-500)' }}>
              أدخل الراتب وسنوات الخدمة ثم اضغط «احسب واحفظ» — يحسب النظام المكافأة وفق المادتين 84 و85 (شاملاً البدلات وخصومات الاستقالة).
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <button
              className="lsd-header-btn lsd-header-btn--primary"
              onClick={handleSaveEos}
              disabled={eosSaving || !(eosInputs.salary > 0) || !(eosInputs.years_of_service > 0)}
              title={!(eosInputs.salary > 0) ? 'أدخل الراتب الأساسي أولاً' : !(eosInputs.years_of_service > 0) ? 'أدخل سنوات الخدمة أولاً' : 'يحسب الخادم المكافأة نظامياً ويحفظها'}
            >
              {eosSaving ? 'جارٍ الحساب...' : 'احسب واحفظ'}
            </button>
          </div>
        </div>
      </div>

      {/* ── بطاقة التسوية الودية ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><Handshake size={15} /> التسوية الودية</div>
          <button className="lsd-card__action" onClick={() => {
            setEditingFriendly(true);
            setFriendlyData({ friendly_settlement_ref: detail.friendly_settlement_ref || '', friendly_settlement_date: detail.friendly_settlement_date || '', friendly_settlement_result: detail.friendly_settlement_result || '' });
          }}><Edit2 size={13} /> تعديل</button>
        </div>
        <div className="lsd-card__content">
          {editingFriendly ? (
            <div>
              <div className="lsd-info-grid">
                <div className="lsd-form-group"><label className="lsd-form-label">مرجع منصة قوى</label><input className="lsd-form-input" value={friendlyData.friendly_settlement_ref || ''} onChange={e => setFriendlyData({ ...friendlyData, friendly_settlement_ref: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">التاريخ</label><input className="lsd-form-input" type="date" value={friendlyData.friendly_settlement_date || ''} onChange={e => setFriendlyData({ ...friendlyData, friendly_settlement_date: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">النتيجة</label><select className="lsd-form-input" value={friendlyData.friendly_settlement_result || ''} onChange={e => setFriendlyData({ ...friendlyData, friendly_settlement_result: e.target.value })}><option value="">اختر</option>{Object.entries(SETTLEMENT_RESULT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingFriendly(false)}>إلغاء</button>
                <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveFriendly} disabled={friendlyLoading}>{friendlyLoading ? 'جارٍ...' : 'حفظ'}</button>
              </div>
            </div>
          ) : (
            <div className="lsd-info-grid">
              {detail.friendly_settlement_ref && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Hash size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">المرجع</div><div className="lsd-info-item__value">{detail.friendly_settlement_ref}</div></div></div>}
              {detail.friendly_settlement_date && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Calendar size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">التاريخ</div><div className="lsd-info-item__value">{formatDate(detail.friendly_settlement_date)}</div></div></div>}
              {detail.friendly_settlement_result && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Check size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">النتيجة</div><div className="lsd-info-item__value" style={{ color: SETTLEMENT_RESULT_COLORS[detail.friendly_settlement_result] }}>{SETTLEMENT_RESULT_LABELS[detail.friendly_settlement_result]}</div></div></div>}
              {!detail.friendly_settlement_ref && <div style={{ fontSize: 13, color: 'var(--quiet-gray-400)' }}>لم تُسجَّل تسوية ودية بعد — اضغط «تعديل» لتسجيل مرجع منصة قوى ونتيجتها</div>}
            </div>
          )}
        </div>
      </div>

      {/* ── بطاقة المطالبات ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><FileText size={15} /> بنود المطالبة {claimedItems.length > 0 && <span className="lsd-tab__count">{claimedItems.length}</span>}</div>
          <button className="lsd-card__action" onClick={() => setShowAddClaim(true)}><Plus size={13} /> إضافة بند</button>
        </div>
        <div className="lsd-card__content">
          <AnimatePresence>
            {showAddClaim && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: 12, background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
                  <div className="lsd-info-grid">
                    <div className="lsd-form-group"><label className="lsd-form-label">البند *</label><input className="lsd-form-input" value={newClaim.item || ''} onChange={e => setNewClaim({ ...newClaim, item: e.target.value })} placeholder="وصف البند" /></div>
                    <div className="lsd-form-group"><label className="lsd-form-label">المبلغ</label><input className="lsd-form-input" type="number" value={newClaim.amount || ''} onChange={e => setNewClaim({ ...newClaim, amount: parseFloat(e.target.value) || 0 })} dir="ltr" /></div>
                  </div>
                  <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                    <button className="lsd-header-btn" onClick={() => { setShowAddClaim(false); setNewClaim({}); }}>إلغاء</button>
                    <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleAddClaim} disabled={addClaimLoading}>{addClaimLoading ? 'جارٍ...' : 'إضافة'}</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {claimedItems.length > 0 ? (
            <div>
              <div className="lsd-references-list">
                {claimedItems.map((item, idx) => (
                  <div key={idx} className="lsd-reference-item" style={{ alignItems: 'center' }}>
                    <div className="lsd-reference-item__body" style={{ flex: 1 }}>
                      <div className="lsd-reference-item__title">{item.item}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--quiet-gray-700)' }}>{formatCurrency(item.amount)}</span>
                    <button className="lsd-doc-action-btn" onClick={() => handleRemoveClaim(idx)}><X size={13} /></button>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--status-blue-light)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                <span>الإجمالي</span>
                <span>{formatCurrency(claimedTotal)}</span>
              </div>
            </div>
          ) : (
            !showAddClaim && (
              <div className="lsd-empty-state-small"><FileText size={22} /><span>لا توجد بنود مطالبة</span>
                <button className="lsd-header-btn lsd-header-btn--primary" style={{ marginTop: 8 }} onClick={() => setShowAddClaim(true)}><Plus size={13} /> إضافة البند الأول</button>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── بطاقة التسوية ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title"><DollarSign size={15} /> التسوية</div>
          <button className="lsd-card__action" onClick={() => {
            setEditingSettlement(true);
            setSettlementData({ settlement_amount: detail.settlement_amount || '', settlement_terms: detail.settlement_terms || '', settlement_date: detail.settlement_date || '', });
          }}><Edit2 size={13} /> تعديل</button>
        </div>
        <div className="lsd-card__content">
          {editingSettlement ? (
            <div>
              <div className="lsd-info-grid">
                <div className="lsd-form-group"><label className="lsd-form-label">مبلغ التسوية</label><input className="lsd-form-input" type="number" value={settlementData.settlement_amount || ''} onChange={e => setSettlementData({ ...settlementData, settlement_amount: e.target.value })} dir="ltr" /></div>
                <div className="lsd-form-group"><label className="lsd-form-label">التاريخ</label><input className="lsd-form-input" type="date" value={settlementData.settlement_date || ''} onChange={e => setSettlementData({ ...settlementData, settlement_date: e.target.value })} dir="ltr" /></div>
              </div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingSettlement(false)}>إلغاء</button>
                <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveSettlement} disabled={settlementLoading}>{settlementLoading ? 'جارٍ...' : 'حفظ'}</button>
              </div>
            </div>
          ) : detail.settlement_amount ? (
            <div>
              <div className="lsd-info-grid">
                <div className="lsd-info-item"><div className="lsd-info-item__icon"><DollarSign size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">مبلغ التسوية</div><div className="lsd-info-item__value">{formatCurrency(detail.settlement_amount)}</div></div></div>
                {detail.settlement_date && <div className="lsd-info-item"><div className="lsd-info-item__icon"><Calendar size={14} /></div><div className="lsd-info-item__body"><div className="lsd-info-item__label">التاريخ</div><div className="lsd-info-item__value">{formatDate(detail.settlement_date)}</div></div></div>}
              </div>
            </div>
          ) : (
            <div className="lsd-empty-state-small"><DollarSign size={22} /><span>لم تُسجَّل تسوية بعد — اضغط «تعديل» أعلى البطاقة لإدخال مبلغ التسوية وتاريخها</span></div>
          )}
        </div>
      </div>

      {/* ── شروط التسوية (محتوى غني) ── */}
      <LegalRichEditorField
        label="شروط التسوية"
        icon={Handshake}
        value={detail.settlement_terms}
        onSave={handleSaveSettlementTerms}
        description="نص شروط وبنود التسوية مع الموظف."
        placeholder="اكتب شروط التسوية..."
        emptyText="لم تُسجَّل شروط تسوية بعد — اضغط «تعديل» لبدء الكتابة"
        successMessage="تم حفظ شروط التسوية"
      />
    </div>
  );
};

export default LaborWorkspace;
