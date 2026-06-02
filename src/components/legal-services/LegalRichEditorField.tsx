import React, { useEffect, useState } from 'react';
import { Edit2, Save, X, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import TiptapEditor from '../TiptapEditor';
import LegalRichText from './LegalRichText';

interface LegalRichEditorFieldProps {
  /** عنوان البطاقة */
  label: string;
  /** المحتوى الحالي (HTML) */
  value?: string | null;
  /** دالة الحفظ — تُمرَّر سلسلة HTML؛ ترمي استثناءً عند الفشل */
  onSave: (html: string) => Promise<void>;
  /** أيقونة العنوان */
  icon?: LucideIcon;
  /** وصف/تلميح تحت العنوان */
  description?: string;
  placeholder?: string;
  minHeight?: string;
  /** نص الحالة الفارغة في وضع العرض */
  emptyText?: string;
  /** نص زر الحفظ */
  saveLabel?: string;
  /** رسالة النجاح */
  successMessage?: string;
  /** إخفاء التحرير (عرض فقط) */
  readOnly?: boolean;
  hint?: string;
}

/**
 * بطاقة كتابة غنية موحّدة (ERP) للخدمات القانونية.
 * تتبدّل بين عرض المحتوى المنسَّق و محرّر TipTap، وتتولّى الحفظ + الإشعارات + حالة "غير محفوظ".
 * تُستخدم لكل أسطح الكتابة: الرأي القانوني، محضر الصلح، نص الإنذار، تقارير الامتثال والعناية الواجبة...
 */
const LegalRichEditorField: React.FC<LegalRichEditorFieldProps> = ({
  label,
  value,
  onSave,
  icon: Icon,
  description,
  placeholder = 'اكتب هنا...',
  minHeight = '260px',
  emptyText = 'لا يوجد محتوى بعد — اضغط «تعديل» لبدء الكتابة',
  saveLabel = 'حفظ',
  successMessage = 'تم الحفظ بنجاح',
  readOnly = false,
  hint,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value || '');
  const [saving, setSaving] = useState(false);

  // مزامنة المسودة مع القيمة الواردة عند تحديث الخدمة من الخارج (ما دمنا لا نحرّر).
  useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [value, editing]);

  const startEdit = () => {
    setDraft(value || '');
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(value || '');
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      toast.success(successMessage);
      setEditing(false);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'تعذّر حفظ المحتوى، حاول مرة أخرى';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lsd-card lsd-rich-field">
      <div className="lsd-card__header">
        <div className="lsd-card__title">
          {Icon && <Icon size={18} />}
          <span>{label}</span>
        </div>
        {!readOnly && (
          <div className="lsd-rich-field__actions">
            {editing ? (
              <>
                <button
                  type="button"
                  className="lsd-rich-btn lsd-rich-btn--ghost"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  <X size={15} />
                  <span>إلغاء</span>
                </button>
                <button
                  type="button"
                  className="lsd-rich-btn lsd-rich-btn--primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <Loader2 size={15} className="lsd-spin" /> : <Save size={15} />}
                  <span>{saving ? 'جارٍ الحفظ...' : saveLabel}</span>
                </button>
              </>
            ) : (
              <button type="button" className="lsd-rich-btn lsd-rich-btn--ghost" onClick={startEdit}>
                <Edit2 size={15} />
                <span>تعديل</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="lsd-card__content">
        {(description || hint) && <p className="lsd-rich-field__hint">{description || hint}</p>}

        {editing ? (
          <TiptapEditor
            content={draft}
            onChange={setDraft}
            placeholder={placeholder}
            minHeight={minHeight}
            autoFocus
          />
        ) : (
          <LegalRichText html={value} emptyText={emptyText} />
        )}
      </div>

      <style>{`
        .lsd-rich-field__actions { display: flex; gap: 8px; align-items: center; }
        .lsd-rich-field__hint {
          font-size: 12.5px;
          color: var(--color-text-light, #6b7280);
          margin: 0 0 12px;
          line-height: 1.6;
        }
        .lsd-rich-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .lsd-rich-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .lsd-rich-btn--primary {
          background: var(--color-primary, #2563eb);
          color: #fff;
        }
        .lsd-rich-btn--primary:hover:not(:disabled) { background: var(--color-primary-dark, #1d4ed8); }
        .lsd-rich-btn--ghost {
          background: var(--color-background, #f3f4f6);
          color: var(--color-text, #374151);
          border-color: var(--color-border, #e5e7eb);
        }
        .lsd-rich-btn--ghost:hover:not(:disabled) { background: var(--color-border, #e5e7eb); }
        .lsd-spin { animation: lsd-spin 0.8s linear infinite; }
        @keyframes lsd-spin { to { transform: rotate(360deg); } }
        body.dark .lsd-rich-btn--ghost { background: #1f2937; color: #e5e7eb; border-color: #374151; }
      `}</style>
    </div>
  );
};

export default LegalRichEditorField;
