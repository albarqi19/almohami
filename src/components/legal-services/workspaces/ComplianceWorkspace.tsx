import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, AlertTriangle, Edit2, Plus, X, Calendar, BarChart3,
  ClipboardCheck, FileWarning, Wrench, CheckCircle2, XCircle, MinusCircle,
  HelpCircle, Eye, ChevronDown, ChevronUp, User, Clock, FileText, Lightbulb,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../../services/legalServiceService';
import { useDynamicList } from '../../../hooks/useDynamicList';
import type { WorkspaceProps } from './types';
import MicroStatsBar from './MicroStatsBar';
import ContextualAlert from './ContextualAlert';
import LegalRichEditorField from '../LegalRichEditorField';

// ── تسميات عربية ──

const COMPLIANCE_AREA_LABELS: Record<string, string> = {
  data_protection: 'حماية البيانات',
  anti_corruption: 'مكافحة الفساد',
  anti_money_laundering: 'مكافحة غسل الأموال',
  commercial: 'تجاري',
  labor: 'عمالي',
  tax: 'ضريبي',
  corporate_governance: 'حوكمة الشركات',
  environmental: 'بيئي',
  health_safety: 'صحة وسلامة',
  sanctions: 'عقوبات',
  industry_specific: 'خاص بالصناعة',
  other: 'أخرى',
};

const RISK_LEVEL_LABELS: Record<string, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'مرتفع',
  critical: 'حرج',
};

const RISK_LEVEL_COLORS: Record<string, string> = {
  low: '#16a34a',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#7c3aed',
};

const CHECKLIST_STATUS_LABELS: Record<string, string> = {
  compliant: 'ملتزم',
  non_compliant: 'غير ملتزم',
  partial: 'ملتزم جزئياً',
  not_applicable: 'لا ينطبق',
  not_checked: 'لم يُفحص',
};

const CHECKLIST_STATUS_COLORS: Record<string, string> = {
  compliant: '#16a34a',
  non_compliant: '#ef4444',
  partial: '#f59e0b',
  not_applicable: '#6b7280',
  not_checked: '#9ca3af',
};

const RISK_ITEM_STATUS_LABELS: Record<string, string> = {
  open: 'مفتوح',
  mitigated: 'تم التخفيف',
  accepted: 'مقبول',
};

const CORRECTIVE_STATUS_LABELS: Record<string, string> = {
  pending: 'معلق',
  in_progress: 'جارٍ التنفيذ',
  completed: 'مكتمل',
};

const CORRECTIVE_STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  completed: '#16a34a',
};

interface AuditChecklistItem {
  category: string;
  item: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable' | 'not_checked';
  evidence?: string;
  notes?: string;
  severity?: string;
}

interface RiskRegisterItem {
  risk: string;
  category?: string;
  likelihood?: string;
  impact?: string;
  mitigation?: string;
  owner?: string;
  deadline?: string;
  status?: 'open' | 'mitigated' | 'accepted';
}

interface CorrectiveAction {
  action: string;
  responsible?: string;
  deadline?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  completion_date?: string;
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

// ── المكون الرئيسي ──

const ComplianceWorkspace: React.FC<WorkspaceProps> = ({ service, refreshService }) => {
  const detail = (service as any).compliance_detail;

  // حالات التعديل
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoData, setInfoData] = useState<Record<string, any>>({});
  const [infoLoading, setInfoLoading] = useState(false);

  // حالة قائمة التدقيق
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // نماذج إضافة
  const [newRisk, setNewRisk] = useState<Partial<RiskRegisterItem>>({});
  const [newAction, setNewAction] = useState<Partial<CorrectiveAction>>({});

  // حسابات
  const checklist: AuditChecklistItem[] = useMemo(() => detail?.audit_checklist ?? [], [detail?.audit_checklist]);
  const risks: RiskRegisterItem[] = useMemo(() => detail?.risk_register ?? [], [detail?.risk_register]);
  const actions: CorrectiveAction[] = useMemo(() => detail?.corrective_actions ?? [], [detail?.corrective_actions]);

  const openRisks = useMemo(() => risks.filter(r => !r.status || r.status === 'open').length, [risks]);
  const pendingActions = useMemo(() => actions.filter(a => !a.status || a.status !== 'completed').length, [actions]);

  // تجميع قائمة التدقيق حسب الفئة
  const groupedChecklist = useMemo(() => {
    const groups: Record<string, { items: (AuditChecklistItem & { originalIndex: number })[] }> = {};
    checklist.forEach((item, idx) => {
      const cat = item.category || 'عام';
      if (!groups[cat]) groups[cat] = { items: [] };
      groups[cat].items.push({ ...item, originalIndex: idx });
    });
    return groups;
  }, [checklist]);

  // إحصائيات قائمة التدقيق
  const checklistStats = useMemo(() => {
    const stats = { compliant: 0, non_compliant: 0, partial: 0, not_applicable: 0, not_checked: 0 };
    checklist.forEach(item => {
      if (item.status in stats) stats[item.status as keyof typeof stats]++;
    });
    return stats;
  }, [checklist]);

  // useDynamicList للمخاطر
  const riskList = useDynamicList<RiskRegisterItem>({
    items: risks,
    onAdd: (item) => LegalServiceService.addRiskItem(service.id, item),
    onRemove: (idx) => LegalServiceService.removeRiskItem(service.id, idx),
    refreshService,
    addSuccessMessage: 'تمت إضافة الخطر بنجاح',
    removeSuccessMessage: 'تم حذف الخطر',
  });

  // useDynamicList للإجراءات التصحيحية
  const actionList = useDynamicList<CorrectiveAction>({
    items: actions,
    onAdd: (item) => LegalServiceService.addCorrectiveAction(service.id, item),
    onRemove: (idx) => LegalServiceService.removeCorrectiveAction(service.id, idx),
    refreshService,
    addSuccessMessage: 'تمت إضافة الإجراء التصحيحي بنجاح',
    removeSuccessMessage: 'تم حذف الإجراء التصحيحي',
  });

  // حالة فارغة
  if (!detail) {
    return (
      <div className="lsd-empty-tab">
        <ShieldCheck size={32} />
        <p>لا توجد تفاصيل للامتثال</p>
      </div>
    );
  }

  // ── معالجات ──

  const handleSaveInfo = async () => {
    setInfoLoading(true);
    try {
      const res = await LegalServiceService.updateComplianceInfo(service.id, infoData);
      if (res.success) {
        toast.success('تم حفظ معلومات الامتثال');
        setEditingInfo(false);
        await refreshService();
      } else {
        toast.error(res.message || 'حدث خطأ');
      }
    } catch { toast.error('حدث خطأ في الاتصال'); }
    finally { setInfoLoading(false); }
  };

  const handleSaveAssessmentReport = async (html: string) => {
    const res = await LegalServiceService.updateComplianceInfo(service.id, { assessment_report: html });
    if (!res?.success) throw new Error(res?.message || 'تعذّر الحفظ');
    await refreshService();
  };

  const handleSaveRecommendations = async (html: string) => {
    const res = await LegalServiceService.updateComplianceInfo(service.id, { recommendations: html });
    if (!res?.success) throw new Error(res?.message || 'تعذّر الحفظ');
    await refreshService();
  };

  const handleChecklistStatusChange = async (originalIndex: number, newStatus: string) => {
    setChecklistLoading(true);
    try {
      const updatedChecklist = checklist.map((item, idx) =>
        idx === originalIndex ? { ...item, status: newStatus } : item
      );
      const res = await LegalServiceService.updateAuditChecklist(service.id, updatedChecklist);
      if (res.success) {
        toast.success('تم تحديث حالة البند');
        await refreshService();
      } else {
        toast.error(res.message || 'حدث خطأ');
      }
    } catch { toast.error('حدث خطأ في الاتصال'); }
    finally { setChecklistLoading(false); }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // ── حساب لون شريط النتيجة ──
  const scoreColor = (detail.compliance_score ?? 0) >= 80 ? '#16a34a' : (detail.compliance_score ?? 0) >= 50 ? '#f59e0b' : '#ef4444';

  // ── تنبيه المراجعة القادمة ──
  const daysToReview = daysUntil(detail.next_review_date);
  const showReviewAlert = daysToReview !== null && daysToReview >= 0 && daysToReview <= 30;

  return (
    <div className="lsd-tab-content-stack">

      {/* ── شريط المؤشرات ── */}
      <MicroStatsBar items={[
        {
          label: 'نتيجة الامتثال',
          value: detail.compliance_score !== null && detail.compliance_score !== undefined ? `${detail.compliance_score}%` : '—',
          icon: BarChart3,
          color: (detail.compliance_score ?? 0) >= 80 ? 'green' : (detail.compliance_score ?? 0) >= 50 ? 'amber' : 'red',
        },
        {
          label: 'مستوى الخطر',
          value: detail.risk_level ? RISK_LEVEL_LABELS[detail.risk_level] || detail.risk_level : '—',
          icon: AlertTriangle,
          color: detail.risk_level === 'critical' ? 'red' : detail.risk_level === 'high' ? 'red' : detail.risk_level === 'medium' ? 'amber' : 'green',
        },
        {
          label: 'مخاطر مفتوحة',
          value: `${openRisks}`,
          icon: FileWarning,
          color: openRisks > 0 ? 'red' : 'green',
        },
        {
          label: 'إجراءات معلقة',
          value: `${pendingActions}`,
          icon: Wrench,
          color: pendingActions > 0 ? 'amber' : 'green',
        },
      ]} />

      {/* ── تنبيه المراجعة القادمة ── */}
      {showReviewAlert && (
        <ContextualAlert
          type={daysToReview! <= 7 ? 'danger' : 'warning'}
          title="موعد المراجعة قريب"
          message={`المراجعة القادمة بعد ${daysToReview} يوم (${formatDate(detail.next_review_date)})`}
        />
      )}

      {/* ── بطاقة معلومات الامتثال ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title">
            <ShieldCheck size={15} />
            معلومات الامتثال
          </div>
          <button
            className="lsd-card__action"
            onClick={() => {
              setEditingInfo(true);
              setInfoData({
                compliance_area: detail.compliance_area || '',
                regulation_reference: detail.regulation_reference || '',
                regulatory_body: detail.regulatory_body || '',
                risk_level: detail.risk_level || '',
                regulation_effective_date: detail.regulation_effective_date || '',
                next_review_date: detail.next_review_date || '',
                review_frequency_months: detail.review_frequency_months || '',
              });
            }}
          >
            <Edit2 size={13} />
            تعديل
          </button>
        </div>
        <div className="lsd-card__content">
          {editingInfo ? (
            <div>
              <div className="lsd-info-grid">
                <div className="lsd-form-group">
                  <label className="lsd-form-label">مجال الامتثال</label>
                  <select className="lsd-form-input" value={infoData.compliance_area || ''} onChange={e => setInfoData({ ...infoData, compliance_area: e.target.value })}>
                    <option value="">اختر المجال</option>
                    {Object.entries(COMPLIANCE_AREA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">مرجع النظام</label>
                  <input className="lsd-form-input" value={infoData.regulation_reference || ''} onChange={e => setInfoData({ ...infoData, regulation_reference: e.target.value })} placeholder="رقم أو اسم النظام" />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">الجهة الرقابية</label>
                  <input className="lsd-form-input" value={infoData.regulatory_body || ''} onChange={e => setInfoData({ ...infoData, regulatory_body: e.target.value })} placeholder="اسم الجهة الرقابية" />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">مستوى الخطر</label>
                  <select className="lsd-form-input" value={infoData.risk_level || ''} onChange={e => setInfoData({ ...infoData, risk_level: e.target.value })}>
                    <option value="">اختر المستوى</option>
                    {Object.entries(RISK_LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">تاريخ سريان النظام</label>
                  <input className="lsd-form-input" type="date" value={infoData.regulation_effective_date || ''} onChange={e => setInfoData({ ...infoData, regulation_effective_date: e.target.value })} dir="ltr" />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">تاريخ المراجعة القادمة</label>
                  <input className="lsd-form-input" type="date" value={infoData.next_review_date || ''} onChange={e => setInfoData({ ...infoData, next_review_date: e.target.value })} dir="ltr" />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">دورة المراجعة (أشهر)</label>
                  <input className="lsd-form-input" type="number" value={infoData.review_frequency_months || ''} onChange={e => setInfoData({ ...infoData, review_frequency_months: e.target.value })} dir="ltr" />
                </div>
              </div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingInfo(false)}>إلغاء</button>
                <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveInfo} disabled={infoLoading}>
                  {infoLoading ? 'جارٍ الحفظ...' : 'حفظ'}
                </button>
              </div>
            </div>
          ) : (
            <div className="lsd-info-grid">
              {detail.compliance_area && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><ShieldCheck size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">مجال الامتثال</div>
                    <div className="lsd-info-item__value">{COMPLIANCE_AREA_LABELS[detail.compliance_area] || detail.compliance_area}</div>
                  </div>
                </div>
              )}
              {detail.regulation_reference && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><ClipboardCheck size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">مرجع النظام</div>
                    <div className="lsd-info-item__value">{detail.regulation_reference}</div>
                  </div>
                </div>
              )}
              {detail.regulatory_body && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><Eye size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">الجهة الرقابية</div>
                    <div className="lsd-info-item__value">{detail.regulatory_body}</div>
                  </div>
                </div>
              )}
              {detail.risk_level && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><AlertTriangle size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">مستوى الخطر</div>
                    <div className="lsd-info-item__value" style={{ color: RISK_LEVEL_COLORS[detail.risk_level] || undefined, fontWeight: 600 }}>
                      {RISK_LEVEL_LABELS[detail.risk_level] || detail.risk_level}
                    </div>
                  </div>
                </div>
              )}
              {detail.regulation_effective_date && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><Calendar size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">تاريخ سريان النظام</div>
                    <div className="lsd-info-item__value">{formatDate(detail.regulation_effective_date)}</div>
                  </div>
                </div>
              )}
              {detail.next_review_date && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><Calendar size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">المراجعة القادمة</div>
                    <div className="lsd-info-item__value">{formatDate(detail.next_review_date)}</div>
                  </div>
                </div>
              )}
              {detail.review_frequency_months && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><Clock size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">دورة المراجعة</div>
                    <div className="lsd-info-item__value">كل {detail.review_frequency_months} أشهر</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── تقرير التقييم ── */}
      <LegalRichEditorField
        label="تقرير التقييم"
        icon={FileText}
        value={detail.assessment_report}
        onSave={handleSaveAssessmentReport}
        successMessage="تم حفظ تقرير التقييم"
        placeholder="اكتب تقرير تقييم الامتثال..."
        emptyText="لا يوجد تقرير تقييم بعد"
      />

      {/* ── التوصيات ── */}
      <LegalRichEditorField
        label="التوصيات"
        icon={Lightbulb}
        value={detail.recommendations}
        onSave={handleSaveRecommendations}
        successMessage="تم حفظ التوصيات"
        placeholder="اكتب التوصيات..."
        emptyText="لا توجد توصيات بعد"
      />

      {/* ── بطاقة شريط نتيجة الامتثال ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title">
            <BarChart3 size={15} />
            نتيجة الامتثال
          </div>
        </div>
        <div className="lsd-card__content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: 'var(--quiet-gray-600, #4b5563)' }}>النتيجة الإجمالية</span>
                <span style={{ fontWeight: 700, color: scoreColor, fontSize: 18 }}>
                  {detail.compliance_score !== null && detail.compliance_score !== undefined ? `${detail.compliance_score}%` : '—'}
                </span>
              </div>
              <div style={{ width: '100%', height: 12, background: 'var(--bg-secondary, #f3f4f6)', borderRadius: 6, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${detail.compliance_score ?? 0}%`,
                    height: '100%',
                    background: scoreColor,
                    borderRadius: 6,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>
          </div>
          {checklist.length > 0 && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={13} style={{ color: CHECKLIST_STATUS_COLORS.compliant }} />
                <span>ملتزم: {checklistStats.compliant}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MinusCircle size={13} style={{ color: CHECKLIST_STATUS_COLORS.partial }} />
                <span>جزئي: {checklistStats.partial}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <XCircle size={13} style={{ color: CHECKLIST_STATUS_COLORS.non_compliant }} />
                <span>غير ملتزم: {checklistStats.non_compliant}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <HelpCircle size={13} style={{ color: CHECKLIST_STATUS_COLORS.not_checked }} />
                <span>لم يُفحص: {checklistStats.not_checked}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MinusCircle size={13} style={{ color: CHECKLIST_STATUS_COLORS.not_applicable }} />
                <span>لا ينطبق: {checklistStats.not_applicable}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── بطاقة قائمة التدقيق ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title">
            <ClipboardCheck size={15} />
            قائمة التدقيق
            {checklist.length > 0 && <span className="lsd-tab__count">{checklist.length}</span>}
          </div>
        </div>
        <div className="lsd-card__content">
          {Object.keys(groupedChecklist).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(groupedChecklist).map(([category, group]) => (
                <div key={category} style={{ border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 8, overflow: 'hidden' }}>
                  <button
                    onClick={() => toggleCategory(category)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '10px 14px', background: 'var(--bg-secondary, #f8f9fa)',
                      border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      color: 'var(--text-primary, #1f2937)',
                    }}
                  >
                    <span>{category}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--quiet-gray-500, #6b7280)', fontWeight: 400 }}>
                        {group.items.length} بند
                      </span>
                      {expandedCategories.has(category) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {expandedCategories.has(category) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: 'var(--bg-tertiary, #f3f4f6)' }}>
                              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>البند</th>
                              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid var(--border-color, #e5e7eb)', width: 160 }}>الحالة</th>
                              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid var(--border-color, #e5e7eb)', width: 120 }}>الخطورة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((item) => (
                              <tr key={item.originalIndex} style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
                                <td style={{ padding: '8px 12px' }}>
                                  <div>{item.item}</div>
                                  {item.notes && <div style={{ fontSize: 11, color: 'var(--quiet-gray-500, #6b7280)', marginTop: 2 }}>{item.notes}</div>}
                                  {item.evidence && <div style={{ fontSize: 11, color: 'var(--quiet-gray-400, #9ca3af)', marginTop: 2 }}>الدليل: {item.evidence}</div>}
                                </td>
                                <td style={{ padding: '8px 12px' }}>
                                  <select
                                    className="lsd-form-input"
                                    value={item.status}
                                    onChange={e => handleChecklistStatusChange(item.originalIndex, e.target.value)}
                                    disabled={checklistLoading}
                                    style={{
                                      fontSize: 12, padding: '4px 8px',
                                      color: CHECKLIST_STATUS_COLORS[item.status] || undefined,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {Object.entries(CHECKLIST_STATUS_LABELS).map(([k, v]) => (
                                      <option key={k} value={k}>{v}</option>
                                    ))}
                                  </select>
                                </td>
                                <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--quiet-gray-600, #4b5563)' }}>
                                  {item.severity || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          ) : (
            <div className="lsd-empty-state-small">
              <ClipboardCheck size={22} />
              <span>لا توجد عناصر في قائمة التدقيق</span>
            </div>
          )}
        </div>
      </div>

      {/* ── بطاقة سجل المخاطر ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title">
            <FileWarning size={15} />
            سجل المخاطر
            {risks.length > 0 && <span className="lsd-tab__count">{risks.length}</span>}
          </div>
          <button className="lsd-card__action" onClick={() => riskList.setShowAddForm(true)}>
            <Plus size={13} />
            إضافة خطر
          </button>
        </div>
        <div className="lsd-card__content">
          {/* نموذج إضافة */}
          <AnimatePresence>
            {riskList.showAddForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: 12, background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>إضافة خطر جديد</h4>
                  <div className="lsd-info-grid">
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">وصف الخطر *</label>
                      <input className="lsd-form-input" value={newRisk.risk || ''} onChange={e => setNewRisk({ ...newRisk, risk: e.target.value })} placeholder="وصف الخطر" />
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">التصنيف</label>
                      <input className="lsd-form-input" value={newRisk.category || ''} onChange={e => setNewRisk({ ...newRisk, category: e.target.value })} placeholder="تصنيف الخطر" />
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">الاحتمالية</label>
                      <input className="lsd-form-input" value={newRisk.likelihood || ''} onChange={e => setNewRisk({ ...newRisk, likelihood: e.target.value })} placeholder="احتمالية الحدوث" />
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">الأثر</label>
                      <input className="lsd-form-input" value={newRisk.impact || ''} onChange={e => setNewRisk({ ...newRisk, impact: e.target.value })} placeholder="أثر الخطر" />
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">إجراء التخفيف</label>
                      <input className="lsd-form-input" value={newRisk.mitigation || ''} onChange={e => setNewRisk({ ...newRisk, mitigation: e.target.value })} placeholder="إجراء التخفيف" />
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">المسؤول</label>
                      <input className="lsd-form-input" value={newRisk.owner || ''} onChange={e => setNewRisk({ ...newRisk, owner: e.target.value })} placeholder="المسؤول عن المتابعة" />
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">الموعد النهائي</label>
                      <input className="lsd-form-input" type="date" value={newRisk.deadline || ''} onChange={e => setNewRisk({ ...newRisk, deadline: e.target.value })} dir="ltr" />
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">الحالة</label>
                      <select className="lsd-form-input" value={newRisk.status || 'open'} onChange={e => setNewRisk({ ...newRisk, status: e.target.value as any })}>
                        {Object.entries(RISK_ITEM_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                    <button className="lsd-header-btn" onClick={() => { riskList.setShowAddForm(false); setNewRisk({}); }}>إلغاء</button>
                    <button
                      className="lsd-header-btn lsd-header-btn--primary"
                      onClick={() => {
                        if (!newRisk.risk?.trim()) { toast.error('يرجى إدخال وصف الخطر'); return; }
                        riskList.handleAdd({ ...newRisk, risk: newRisk.risk!, status: newRisk.status || 'open' });
                        setNewRisk({});
                      }}
                      disabled={riskList.addLoading}
                    >
                      {riskList.addLoading ? 'جارٍ...' : 'إضافة'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* قائمة المخاطر */}
          {risks.length > 0 ? (
            <div className="lsd-references-list">
              {risks.map((risk, idx) => (
                <div key={idx} className="lsd-reference-item" style={{ alignItems: 'flex-start' }}>
                  <div className="lsd-reference-item__icon">
                    <FileWarning size={15} style={{ color: risk.status === 'open' ? '#ef4444' : risk.status === 'mitigated' ? '#16a34a' : '#f59e0b' }} />
                  </div>
                  <div className="lsd-reference-item__body" style={{ flex: 1 }}>
                    <div className="lsd-reference-item__title">{risk.risk}</div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--quiet-gray-500, #6b7280)', flexWrap: 'wrap', marginTop: 4 }}>
                      {risk.category && <span>التصنيف: {risk.category}</span>}
                      {risk.likelihood && <span>الاحتمالية: {risk.likelihood}</span>}
                      {risk.impact && <span>الأثر: {risk.impact}</span>}
                      {risk.owner && <span><User size={11} style={{ marginLeft: 3 }} />{risk.owner}</span>}
                      {risk.deadline && <span><Calendar size={11} style={{ marginLeft: 3 }} />{formatDate(risk.deadline)}</span>}
                    </div>
                    {risk.mitigation && (
                      <div style={{ fontSize: 12, color: 'var(--quiet-gray-600, #4b5563)', marginTop: 4 }}>
                        التخفيف: {risk.mitigation}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                    background: risk.status === 'open' ? '#fef2f2' : risk.status === 'mitigated' ? '#f0fdf4' : '#fffbeb',
                    color: risk.status === 'open' ? '#ef4444' : risk.status === 'mitigated' ? '#16a34a' : '#f59e0b',
                  }}>
                    {RISK_ITEM_STATUS_LABELS[risk.status || 'open']}
                  </span>
                  <button
                    className="lsd-doc-action-btn"
                    title="حذف الخطر"
                    onClick={() => riskList.handleRemove(idx)}
                    disabled={riskList.removeLoadingIdx === idx}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            !riskList.showAddForm && (
              <div className="lsd-empty-state-small">
                <FileWarning size={22} />
                <span>لا توجد مخاطر مسجلة</span>
                <button className="lsd-header-btn lsd-header-btn--primary" style={{ marginTop: 8 }} onClick={() => riskList.setShowAddForm(true)}>
                  <Plus size={13} /> إضافة الخطر الأول
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── بطاقة الإجراءات التصحيحية ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title">
            <Wrench size={15} />
            الإجراءات التصحيحية
            {actions.length > 0 && <span className="lsd-tab__count">{actions.length}</span>}
          </div>
          <button className="lsd-card__action" onClick={() => actionList.setShowAddForm(true)}>
            <Plus size={13} />
            إضافة إجراء
          </button>
        </div>
        <div className="lsd-card__content">
          {/* نموذج إضافة */}
          <AnimatePresence>
            {actionList.showAddForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: 12, background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>إضافة إجراء تصحيحي</h4>
                  <div className="lsd-info-grid">
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">الإجراء *</label>
                      <input className="lsd-form-input" value={newAction.action || ''} onChange={e => setNewAction({ ...newAction, action: e.target.value })} placeholder="وصف الإجراء التصحيحي" />
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">المسؤول</label>
                      <input className="lsd-form-input" value={newAction.responsible || ''} onChange={e => setNewAction({ ...newAction, responsible: e.target.value })} placeholder="المسؤول عن التنفيذ" />
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">الموعد النهائي</label>
                      <input className="lsd-form-input" type="date" value={newAction.deadline || ''} onChange={e => setNewAction({ ...newAction, deadline: e.target.value })} dir="ltr" />
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">الحالة</label>
                      <select className="lsd-form-input" value={newAction.status || 'pending'} onChange={e => setNewAction({ ...newAction, status: e.target.value as any })}>
                        {Object.entries(CORRECTIVE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                    <button className="lsd-header-btn" onClick={() => { actionList.setShowAddForm(false); setNewAction({}); }}>إلغاء</button>
                    <button
                      className="lsd-header-btn lsd-header-btn--primary"
                      onClick={() => {
                        if (!newAction.action?.trim()) { toast.error('يرجى إدخال وصف الإجراء'); return; }
                        actionList.handleAdd({ ...newAction, action: newAction.action!, status: newAction.status || 'pending' });
                        setNewAction({});
                      }}
                      disabled={actionList.addLoading}
                    >
                      {actionList.addLoading ? 'جارٍ...' : 'إضافة'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* قائمة الإجراءات */}
          {actions.length > 0 ? (
            <div className="lsd-references-list">
              {actions.map((action, idx) => (
                <div key={idx} className="lsd-reference-item" style={{ alignItems: 'flex-start' }}>
                  <div className="lsd-reference-item__icon">
                    <Wrench size={15} style={{ color: CORRECTIVE_STATUS_COLORS[action.status || 'pending'] }} />
                  </div>
                  <div className="lsd-reference-item__body" style={{ flex: 1 }}>
                    <div className="lsd-reference-item__title">{action.action}</div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--quiet-gray-500, #6b7280)', flexWrap: 'wrap', marginTop: 4 }}>
                      {action.responsible && <span><User size={11} style={{ marginLeft: 3 }} />{action.responsible}</span>}
                      {action.deadline && <span><Calendar size={11} style={{ marginLeft: 3 }} />الموعد: {formatDate(action.deadline)}</span>}
                      {action.completion_date && <span><CheckCircle2 size={11} style={{ marginLeft: 3 }} />اكتمل: {formatDate(action.completion_date)}</span>}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                    background: action.status === 'completed' ? '#f0fdf4' : action.status === 'in_progress' ? '#eff6ff' : '#fffbeb',
                    color: CORRECTIVE_STATUS_COLORS[action.status || 'pending'],
                  }}>
                    {CORRECTIVE_STATUS_LABELS[action.status || 'pending']}
                  </span>
                  <button
                    className="lsd-doc-action-btn"
                    title="حذف الإجراء"
                    onClick={() => actionList.handleRemove(idx)}
                    disabled={actionList.removeLoadingIdx === idx}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            !actionList.showAddForm && (
              <div className="lsd-empty-state-small">
                <Wrench size={22} />
                <span>لا توجد إجراءات تصحيحية</span>
                <button className="lsd-header-btn lsd-header-btn--primary" style={{ marginTop: 8 }} onClick={() => actionList.setShowAddForm(true)}>
                  <Plus size={13} /> إضافة الإجراء الأول
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplianceWorkspace;
