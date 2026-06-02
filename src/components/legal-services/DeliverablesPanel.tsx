import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Download, Eye, Trash2, Loader2, FileCheck, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../services/legalServiceService';
import type { ServiceDeliverableItem } from '../../types/legalServices';

interface GeneratableDeliverable {
  type: string;
  label: string;
}

/** المخرجات القابلة للتوليد لكل نوع خدمة (تتوسّع تدريجياً مع الباك إند) */
const GENERATABLE: Record<string, GeneratableDeliverable[]> = {
  consultation: [{ type: 'consultation_opinion', label: 'توليد خطاب الرأي القانوني (PDF)' }],
  legal_notices: [{ type: 'legal_notice', label: 'توليد خطاب الإنذار (PDF)' }],
  due_diligence: [{ type: 'dd_report', label: 'توليد تقرير العناية الواجبة (PDF)' }],
  company_formation: [{ type: 'formation_dossier', label: 'توليد حقيبة التأسيس (PDF)' }],
  training: [{ type: 'training_certificate', label: 'إصدار شهادات الحضور (PDF)' }],
  contract_drafting: [
    { type: 'contract_pdf', label: 'توليد العقد (PDF)' },
    { type: 'contract_docx', label: 'تصدير العقد (Word)' },
  ],
};

const formatSize = (bytes: number | null): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface DeliverablesPanelProps {
  serviceId: number;
  serviceType: string;
}

const DeliverablesPanel: React.FC<DeliverablesPanelProps> = ({ serviceId, serviceType }) => {
  const [items, setItems] = useState<ServiceDeliverableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  const generatable = GENERATABLE[serviceType] ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await LegalServiceService.listDeliverables(serviceId);
      if (res.success) setItems(res.data);
    } catch {
      // قائمة فارغة عند تعذّر التحميل — لا نزعج المستخدم
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async (type: string) => {
    setGenerating(type);
    try {
      const res = await LegalServiceService.generateDeliverable(serviceId, type);
      if (!res?.success) throw new Error(res?.message || 'تعذّر توليد المستند');
      toast.success(res.message || 'تم توليد المستند بنجاح');
      await load();
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'تعذّر توليد المستند';
      toast.error(message);
    } finally {
      setGenerating(null);
    }
  };

  const handleDelete = async (deliverableId: number) => {
    if (!window.confirm('هل تريد حذف هذا المستند؟')) return;
    try {
      const res = await LegalServiceService.deleteDeliverable(serviceId, deliverableId);
      if (!res?.success) throw new Error(res?.message || 'تعذّر الحذف');
      toast.success('تم حذف المستند');
      setItems((prev) => prev.filter((d) => d.id !== deliverableId));
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'تعذّر حذف المستند';
      toast.error(message);
    }
  };

  return (
    <div className="lsd-card lsd-deliverables">
      <div className="lsd-card__header">
        <div className="lsd-card__title">
          <FileCheck size={18} />
          <span>المخرجات الرسمية</span>
          {items.length > 0 && <span className="lsd-tab__count">{items.length}</span>}
        </div>
      </div>

      <div className="lsd-card__content">
        {/* أزرار التوليد */}
        {generatable.length > 0 ? (
          <div className="lsd-deliverables__actions">
            {generatable.map((g) => (
              <button
                key={g.type}
                type="button"
                className="lsd-rich-btn lsd-rich-btn--primary"
                onClick={() => handleGenerate(g.type)}
                disabled={generating !== null}
              >
                {generating === g.type ? <Loader2 size={15} className="lsd-spin" /> : <Sparkles size={15} />}
                <span>{generating === g.type ? 'جارٍ التوليد...' : g.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="lsd-deliverables__soon">
            توليد المخرجات الرسمية لهذا النوع من الخدمات قيد الإضافة قريباً.
          </p>
        )}

        {/* القائمة */}
        {loading ? (
          <p className="lsd-deliverables__empty">جارٍ التحميل...</p>
        ) : items.length === 0 ? (
          <p className="lsd-deliverables__empty">لم يتم توليد أي مستند رسمي بعد.</p>
        ) : (
          <ul className="lsd-deliverables__list">
            {items.map((d) => (
              <li key={d.id} className="lsd-deliverable-item">
                <div className="lsd-deliverable-item__icon">
                  <FileText size={20} />
                  <span className={`lsd-deliverable-item__fmt lsd-deliverable-item__fmt--${d.format}`}>
                    {d.format.toUpperCase()}
                  </span>
                </div>
                <div className="lsd-deliverable-item__info">
                  <div className="lsd-deliverable-item__title">{d.title}</div>
                  <div className="lsd-deliverable-item__meta">
                    {d.type_label}
                    {d.generated_by && ` · ${d.generated_by}`}
                    {d.created_at && ` · ${new Date(d.created_at).toLocaleDateString('ar-SA')}`}
                    {d.file_size ? ` · ${formatSize(d.file_size)}` : ''}
                  </div>
                </div>
                <div className="lsd-deliverable-item__actions">
                  <a
                    href={d.view_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lsd-icon-btn"
                    title="عرض"
                  >
                    <Eye size={16} />
                  </a>
                  <a href={d.download_url} className="lsd-icon-btn" title="تحميل">
                    <Download size={16} />
                  </a>
                  <button
                    type="button"
                    className="lsd-icon-btn lsd-icon-btn--danger"
                    onClick={() => handleDelete(d.id)}
                    title="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <style>{`
        .lsd-deliverables__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
        .lsd-deliverables__soon, .lsd-deliverables__empty {
          color: var(--color-text-light, #6b7280); font-size: 13px; margin: 8px 0 0;
        }
        .lsd-deliverables__list { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .lsd-deliverable-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 10px; background: var(--color-surface, #fff);
        }
        .lsd-deliverable-item__icon { position: relative; color: #dc2626; display: flex; flex-direction: column; align-items: center; }
        .lsd-deliverable-item__fmt { font-size: 8px; font-weight: 700; letter-spacing: .5px; }
        .lsd-deliverable-item__fmt--docx { color: #2563eb; }
        .lsd-deliverable-item__info { flex: 1; min-width: 0; }
        .lsd-deliverable-item__title { font-weight: 600; font-size: 13.5px; color: var(--color-text, #1f2937); }
        .lsd-deliverable-item__meta { font-size: 11.5px; color: var(--color-text-light, #6b7280); margin-top: 2px; }
        .lsd-deliverable-item__actions { display: flex; gap: 4px; }
        .lsd-icon-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 8px; cursor: pointer;
          border: 1px solid var(--color-border, #e5e7eb); background: var(--color-background, #f9fafb);
          color: var(--color-text, #374151); text-decoration: none;
        }
        .lsd-icon-btn:hover { background: var(--color-border, #e5e7eb); }
        .lsd-icon-btn--danger:hover { background: #fee2e2; color: #dc2626; border-color: #fecaca; }
        body.dark .lsd-deliverable-item { background: #1a1a1a; border-color: #333; }
        body.dark .lsd-icon-btn { background: #1f2937; color: #e5e7eb; border-color: #374151; }
      `}</style>
    </div>
  );
};

export default DeliverablesPanel;
