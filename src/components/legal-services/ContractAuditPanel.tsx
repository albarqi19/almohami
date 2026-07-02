import React, { useMemo, useState } from 'react';
import { Sparkles, Loader2, ShieldCheck, AlertTriangle, FileWarning, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../services/legalServiceService';
import { getApiErrorMessage } from '../../utils/apiError';
import type { ContractAuditResult, ContractAuditFinding } from '../../types/legalServices';
import type { TextAnnotation } from '../../types/textAnnotations';
import TiptapEditor from '../TiptapEditor';

interface ContractAuditPanelProps {
  serviceId: number;
  versionContent?: string | null;
  existingAudit?: ContractAuditResult | null;
}

// حقول أضافها الباك حديثاً وغير موجودة بعد في types/legalServices.ts (ملف لا نملك تعديله هنا):
// input_truncated: نص العقد اقتُطع قبل إرساله للنموذج — التدقيق قد لا يغطي كامل العقد
// unverified: ملاحظة لم يُعثر على نصّها الأصلي داخل العقد (احتمال هلوسة) — تُعرض بحذر
type AuditResultExt = ContractAuditResult & { input_truncated?: boolean };
type AuditFindingExt = ContractAuditFinding & { unverified?: boolean };

const RISK_LABEL: Record<string, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية' };
const CATEGORY_LABEL: Record<string, string> = {
  missing_clause: 'بند ناقص',
  risky_clause: 'بند خطر',
  non_compliant: 'مخالفة نظامية',
  ambiguous: 'غموض',
  unfair: 'إجحاف',
};
// hex مقصود هنا: اللون يُركَّب مع شفافية `${color}18` ولا يمكن ذلك مع var() — يطابق --status-red/orange/blue
const sevColor = (s: string) => (s === 'high' ? '#dc2626' : s === 'medium' ? '#d97706' : '#2563eb');

const ContractAuditPanel: React.FC<ContractAuditPanelProps> = ({ serviceId, versionContent, existingAudit }) => {
  const [audit, setAudit] = useState<ContractAuditResult | null>(existingAudit ?? null);
  const [loading, setLoading] = useState(false);
  const [showInEditor, setShowInEditor] = useState(false);

  const annotations = useMemo<TextAnnotation[]>(() => {
    if (!audit) return [];
    return (audit.findings as AuditFindingExt[])
      // الملاحظات غير الموثَّقة في النص لا يمكن تظليلها داخل العقد (نصّها غير موجود فيه)
      .filter((f) => f.original_text && f.original_text.trim() && !f.unverified)
      .map((f) => ({
        id: f.id,
        original_text: f.original_text,
        suggested_text: f.suggested_text,
        reason: f.reason,
        severity: f.severity,
        legal_reference: f.legal_reference ?? undefined,
      }));
  }, [audit]);

  const runAudit = async () => {
    setLoading(true);
    try {
      const res = await LegalServiceService.auditContract(serviceId);
      if (!res?.success) throw new Error(res?.message || 'تعذّر التدقيق');
      setAudit(res.data);
      toast.success('تم التدقيق الآلي للعقد');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إجراء التدقيق الآلي'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lsd-card lsd-audit">
      <div className="lsd-card__header">
        <div className="lsd-card__title">
          <ShieldCheck size={18} />
          <span>التدقيق الآلي للعقد (مقابل نظام المعاملات المدنية)</span>
        </div>
        <div className="lsd-audit__actions">
          {audit && annotations.length > 0 && versionContent && (
            <button
              type="button"
              className="lsd-rich-btn lsd-rich-btn--ghost"
              onClick={() => setShowInEditor((v) => !v)}
            >
              {showInEditor ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{showInEditor ? 'إخفاء داخل العقد' : 'عرض داخل العقد'}</span>
            </button>
          )}
          <button type="button" className="lsd-rich-btn lsd-rich-btn--primary" onClick={runAudit} disabled={loading}>
            {loading ? <Loader2 size={15} className="lsd-spin" /> : <Sparkles size={15} />}
            <span>{loading ? 'جارٍ التدقيق...' : audit ? 'إعادة التدقيق' : 'تدقيق آلي بالذكاء'}</span>
          </button>
        </div>
      </div>

      <div className="lsd-card__content">
        <p className="lsd-audit__disclaimer">
          أداة مساعدة للمحامي — راجع كل ملاحظة قبل اعتمادها. لا تُغني عن المراجعة القانونية البشرية.
        </p>

        {!audit ? (
          <p className="lsd-audit__empty">اضغط «تدقيق آلي بالذكاء» لفحص أحدث إصدار من العقد وكشف البنود الخطرة أو الناقصة.</p>
        ) : (
          <>
            <div className="lsd-audit__head">
              <span
                className="lsd-audit__risk"
                style={{ background: `${sevColor(audit.overall_risk)}18`, color: sevColor(audit.overall_risk) }}
              >
                مستوى المخاطر: {RISK_LABEL[audit.overall_risk] ?? audit.overall_risk}
              </span>
              <span className="lsd-audit__meta">
                الإصدار {audit.audited_version_number ?? '—'} ·{' '}
                {audit.audited_at ? new Date(audit.audited_at).toLocaleString('ar-SA') : ''}
              </span>
            </div>

            {/* العقد طويل واقتُطع قبل التدقيق — ننبّه المحامي أن التغطية قد تكون جزئية */}
            {(audit as AuditResultExt).input_truncated && (
              <div className="lsd-audit__truncated">
                <AlertTriangle size={14} />
                <span>النص مقتطع — قد لا يشمل التدقيق كامل العقد. راجع البنود الأخيرة يدوياً.</span>
              </div>
            )}

            {audit.summary && <p className="lsd-audit__summary">{audit.summary}</p>}

            {showInEditor && versionContent && (
              <div className="lsd-audit__editor">
                <TiptapEditor
                  content={versionContent}
                  onChange={() => {}}
                  editable={false}
                  textAnnotations={annotations}
                  minHeight="auto"
                />
              </div>
            )}

            {audit.missing_clauses.length > 0 && (
              <div className="lsd-audit__missing">
                <div className="lsd-audit__sub"><FileWarning size={15} /> بنود جوهرية ناقصة</div>
                <ul>
                  {audit.missing_clauses.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="lsd-audit__sub"><AlertTriangle size={15} /> الملاحظات ({audit.findings.length})</div>
            {audit.findings.length === 0 ? (
              <p className="lsd-audit__empty">لا توجد ملاحظات جوهرية.</p>
            ) : (
              <ul className="lsd-audit__list">
                {(audit.findings as AuditFindingExt[]).map((f) => (
                  <li key={f.id} className="lsd-audit-item" style={{ borderInlineStartColor: sevColor(f.severity) }}>
                    <div className="lsd-audit-item__top">
                      <span className="lsd-audit-item__cat" style={{ color: sevColor(f.severity) }}>
                        {CATEGORY_LABEL[f.category] ?? f.category}
                        {/* ملاحظة لم يتأكد الحارس من وجود نصّها داخل العقد — تعامل معها بحذر إضافي */}
                        {f.unverified && (
                          <span className="lsd-audit-item__unverified" title="لم يُعثر على هذا النص حرفياً داخل العقد — تحقّق منه يدوياً قبل الاعتماد">
                            غير موثَّق في النص
                          </span>
                        )}
                      </span>
                      {f.legal_reference && <span className="lsd-audit-item__ref">{f.legal_reference}</span>}
                    </div>
                    {f.original_text && <div className="lsd-audit-item__orig">«{f.original_text}»</div>}
                    {f.reason && <div className="lsd-audit-item__reason">{f.reason}</div>}
                    {f.suggested_text && (
                      <div className="lsd-audit-item__suggest">
                        <strong>المقترح:</strong> {f.suggested_text}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <style>{`
        .lsd-audit__actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .lsd-audit__disclaimer { font-size: 12px; color: var(--status-yellow, #92400e); background: var(--status-yellow-light, #fffbeb); border: 1px solid var(--status-yellow, #fde68a); border-radius: 8px; padding: 8px 12px; margin: 0 0 12px; }
        .lsd-audit__empty { color: var(--quiet-gray-500, #6b7280); font-size: 13px; margin: 0; }
        .lsd-audit__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
        .lsd-audit__risk { font-weight: 700; font-size: 12.5px; padding: 3px 12px; border-radius: 999px; }
        .lsd-audit__meta { font-size: 11.5px; color: var(--quiet-gray-400, #94a3b8); }
        .lsd-audit__truncated {
          display: flex; align-items: center; gap: 6px;
          font-size: 12.5px; color: var(--status-orange, #d97706);
          background: var(--status-orange-light, #fffbeb); border: 1px solid var(--status-orange, #d97706);
          border-radius: 8px; padding: 7px 12px; margin: 0 0 12px;
        }
        .lsd-audit__summary { font-size: 13.5px; line-height: 1.8; color: var(--quiet-gray-700, #334155); background: var(--quiet-gray-50, #f8fafc); border-radius: 8px; padding: 10px 12px; margin: 0 0 14px; }
        .lsd-audit__editor { margin: 0 0 16px; }
        .lsd-audit__sub { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 13.5px; color: var(--law-navy, #0f172a); margin: 14px 0 8px; }
        .lsd-audit__missing ul { margin: 0; padding-inline-start: 1.4em; }
        .lsd-audit__missing li { font-size: 13px; color: #b45309; margin: 3px 0; }
        .lsd-audit__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .lsd-audit-item { border: 1px solid var(--color-border, #e5e7eb); border-inline-start-width: 4px; border-radius: 8px; padding: 10px 12px; }
        .lsd-audit-item__top { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
        .lsd-audit-item__cat { font-weight: 700; font-size: 12.5px; display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .lsd-audit-item__unverified {
          font-weight: 500; font-size: 11px; color: var(--quiet-gray-500, #6b7280);
          background: var(--quiet-gray-100, #f3f4f6); border: 1px solid var(--quiet-gray-200, #e5e7eb);
          border-radius: 999px; padding: 1px 8px; cursor: help;
        }
        .lsd-audit-item__ref { font-size: 11.5px; color: var(--quiet-gray-500, #64748b); background: var(--quiet-gray-100, #f1f5f9); border-radius: 6px; padding: 1px 8px; }
        .lsd-audit-item__orig { font-size: 13px; color: var(--quiet-gray-600, #475569); font-style: italic; margin: 4px 0; }
        .lsd-audit-item__reason { font-size: 13px; color: var(--quiet-gray-700, #334155); line-height: 1.7; }
        .lsd-audit-item__suggest { font-size: 13px; color: #166534; background: #f0fdf4; border-radius: 6px; padding: 6px 10px; margin-top: 6px; }
        body.dark .lsd-audit__summary { background: #1f2937; color: #cbd5e1; }
        body.dark .lsd-audit-item { border-color: #333; }
      `}</style>
    </div>
  );
};

export default ContractAuditPanel;
