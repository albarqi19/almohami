import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Download, Eye, Trash2, Loader2, FileCheck, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../services/legalServiceService';
import { getApiErrorMessage } from '../../utils/apiError';
import type { ServiceDeliverableItem } from '../../types/legalServices';

interface GeneratableDeliverable {
  type: string;
  label: string;
  /** وصف موجز يظهر تحت الزر — يشرح للمحامي ما الذي سيُنتج بالضبط */
  hint: string;
}

/** المخرجات القابلة للتوليد لكل نوع خدمة (تتوسّع تدريجياً مع الباك إند) */
const GENERATABLE: Record<string, GeneratableDeliverable[]> = {
  consultation: [{
    type: 'consultation_opinion',
    label: 'توليد خطاب الرأي القانوني (PDF)',
    hint: 'خطاب رسمي بترويسة المكتب يتضمن السؤال القانوني والرأي والتوصيات — جاهز للإرسال للعميل.',
  }],
  legal_notices: [{
    type: 'legal_notice',
    label: 'توليد خطاب الإنذار (PDF)',
    hint: 'خطاب إنذار رسمي ببيانات المرسل إليه ونص الإنذار والمهلة — جاهز للإرسال أو الطباعة.',
  }],
  due_diligence: [{
    type: 'dd_report',
    label: 'توليد تقرير العناية الواجبة (PDF)',
    hint: 'تقرير شامل بنتائج الفحص والمخاطر المكتشفة والتوصيات، مبني على بنود قائمة الفحص.',
  }],
  company_formation: [{
    type: 'formation_dossier',
    label: 'توليد حقيبة التأسيس (PDF)',
    hint: 'ملف موحّد ببيانات الشركة والشركاء وخطوات التأسيس وحالتها — مرجع واحد للعميل.',
  }],
  training: [{
    type: 'training_certificate',
    label: 'إصدار شهادات الحضور (PDF)',
    hint: 'شهادة حضور رسمية لكل متدرب مُعلَّم عليه «حضر» في قائمة المتدربين.',
  }],
  contract_drafting: [
    {
      type: 'contract_pdf',
      label: 'توليد العقد (PDF)',
      hint: 'أحدث إصدار من العقد بصيغة PDF نهائية للتوقيع أو الأرشفة.',
    },
    {
      type: 'contract_docx',
      label: 'تصدير العقد (Word)',
      hint: 'أحدث إصدار من العقد بصيغة Word قابلة للتحرير خارج النظام.',
    },
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const generatable = GENERATABLE[serviceType] ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await LegalServiceService.listDeliverables(serviceId);
      if (res.success) setItems(res.data);
    } catch (err) {
      // لا نبتلع الخطأ بصمت — نعرض رسالة الخادم مع زر إعادة محاولة
      setLoadError(getApiErrorMessage(err, 'تعذّر تحميل قائمة المخرجات'));
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
      // رسائل الباك 422 هنا مهمة كما هي («نوع المخرَج غير مدعوم»، «الدفع قبل التسليم»...)
      toast.error(getApiErrorMessage(err, 'تعذّر توليد المستند'));
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
      toast.error(getApiErrorMessage(err, 'تعذّر حذف المستند'));
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
        {/* أزرار التوليد — مع وصف موجز تحت كل زر يشرح ما سيُنتج */}
        {generatable.length > 0 ? (
          <div className="lsd-deliverables__actions">
            {generatable.map((g) => (
              <div key={g.type} className="lsd-deliverables__action">
                <button
                  type="button"
                  className="lsd-rich-btn lsd-rich-btn--primary"
                  onClick={() => handleGenerate(g.type)}
                  disabled={generating !== null}
                  title={generating !== null && generating !== g.type ? 'انتظر انتهاء التوليد الجاري أولاً' : g.hint}
                >
                  {generating === g.type ? <Loader2 size={15} className="lsd-spin" /> : <Sparkles size={15} />}
                  <span>{generating === g.type ? 'جارٍ التوليد...' : g.label}</span>
                </button>
                <p className="lsd-deliverables__hint">{g.hint}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="lsd-deliverables__soon">
            توليد المخرجات الرسمية لهذا النوع من الخدمات قيد الإضافة قريباً.
          </p>
        )}

        {/* القائمة */}
        {loading ? (
          <p className="lsd-deliverables__empty">
            <Loader2 size={14} className="lsd-spin" style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
            جارٍ تحميل المخرجات...
          </p>
        ) : loadError ? (
          <div className="lsd-deliverables__error">
            <AlertTriangle size={15} />
            <span>{loadError}</span>
            <button type="button" className="lsd-rich-btn lsd-rich-btn--ghost" onClick={load}>
              <RefreshCw size={13} />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="lsd-deliverables__empty">
            لم يُولَّد أي مستند رسمي بعد
            {generatable.length > 0 ? ' — اضغط أحد أزرار التوليد أعلاه وسيظهر المستند هنا جاهزاً للعرض والتحميل.' : '.'}
          </p>
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
        .lsd-deliverables__actions { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; }
        .lsd-deliverables__action { display: flex; flex-direction: column; gap: 4px; max-width: 320px; }
        .lsd-deliverables__hint { margin: 0; font-size: 11.5px; line-height: 1.6; color: var(--quiet-gray-500, #6b7280); }
        .lsd-deliverables__soon, .lsd-deliverables__empty {
          color: var(--quiet-gray-500, #6b7280); font-size: 13px; margin: 8px 0 0;
        }
        .lsd-deliverables__error {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          font-size: 13px; color: var(--status-red, #dc2626);
          background: var(--status-red-light, #fef2f2); border: 1px solid var(--status-red, #dc2626);
          border-radius: 8px; padding: 8px 12px; margin: 8px 0 0;
        }
        .lsd-deliverables__list { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .lsd-deliverable-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 10px; background: var(--color-surface, #fff);
        }
        .lsd-deliverable-item__icon { position: relative; color: var(--status-red, #dc2626); display: flex; flex-direction: column; align-items: center; }
        .lsd-deliverable-item__fmt { font-size: 8px; font-weight: 700; letter-spacing: .5px; }
        .lsd-deliverable-item__fmt--docx { color: var(--status-blue, #2563eb); }
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
        .lsd-icon-btn--danger:hover { background: var(--status-red-light, #fee2e2); color: var(--status-red, #dc2626); border-color: var(--status-red, #fecaca); }
        body.dark .lsd-deliverable-item { background: #1a1a1a; border-color: #333; }
        body.dark .lsd-icon-btn { background: #1f2937; color: #e5e7eb; border-color: #374151; }
      `}</style>
    </div>
  );
};

export default DeliverablesPanel;
