// مودل تفضيلات إرسال الإفادة للعميل
// 3 خيارات: تحسين مهني + إرسال / حفظ للمراجعة / إرسال خام
import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Sparkles, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { apiClient } from '../utils/api';
import { toast } from 'react-toastify';

export type NotifyMode = 'auto_enhanced' | 'save_only' | 'raw';

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: number;
  currentMode?: NotifyMode | null;
  currentEnabled?: boolean;
  onSuccess: (result: { enabled: boolean; mode: NotifyMode | null }) => void;
}

interface OptionInfo {
  value: NotifyMode;
  title: string;
  description: string;
  recommended?: boolean;
}

const OPTIONS: OptionInfo[] = [
  {
    value: 'auto_enhanced',
    title: 'تحسين مهني + إرسال تلقائي',
    description: 'يتم تلخيص نص الضبط بأسلوب احترافي قانوني وإرساله تلقائياً للعميل عبر واتساب بعد جلب الضبط من ناجز.',
    recommended: true,
  },
  {
    value: 'save_only',
    title: 'حفظ الإفادة للمراجعة قبل الإرسال',
    description: 'سيتم توليد الملخص وحفظه، وستظهر لك الإفادة لمراجعتها أولاً — لن تُرسل تلقائياً، أنت من يقرر متى ترسل.',
  },
  {
    value: 'raw',
    title: 'إرسال نص الضبط الخام كما هو',
    description: 'يُرسل النص الأصلي للضبط مباشرة للعميل دون أي تحسين أو تلخيص.',
  },
];

export const SendDabtPreferencesModal: React.FC<Props> = ({
  open,
  onClose,
  sessionId,
  currentMode,
  currentEnabled,
  onSuccess,
}) => {
  const [selectedMode, setSelectedMode] = useState<NotifyMode>(
    currentMode || 'auto_enhanced'
  );
  const [saving, setSaving] = useState(false);

  // إعادة تعيين الاختيار عند فتح المودل مع mode جديد
  React.useEffect(() => {
    if (open) {
      setSelectedMode(currentMode || 'auto_enhanced');
    }
  }, [open, currentMode]);

  const handleSubmit = async (enable: boolean) => {
    try {
      setSaving(true);
      const response = await apiClient.post<{
        success: boolean;
        notify_client: boolean;
        notify_client_mode: NotifyMode | null;
        message: string;
      }>(`/sessions/${sessionId}/toggle-notify`, {
        enabled: enable,
        mode: enable ? selectedMode : undefined,
      });

      if (response.success) {
        toast.success(response.message);
        onSuccess({
          enabled: response.notify_client,
          mode: response.notify_client_mode,
        });
        onClose();
      } else {
        toast.error((response as { message?: string }).message || 'فشل الحفظ');
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="sdpm-overlay" />
        <Dialog.Content className="sdpm-content" aria-describedby={undefined}>
          <header className="sdpm-header">
            <Dialog.Title className="sdpm-title">
              <FileText size={14} />
              <span>إرسال الإفادة للعميل</span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="sdpm-close" aria-label="إغلاق">
                <X size={14} />
              </button>
            </Dialog.Close>
          </header>

          <div className="sdpm-body">
            <p className="sdpm-intro">
              كيف تريد إرسال إفادة هذه الجلسة لعميلك بعد جلب الضبط من ناجز؟
            </p>

            <div className="sdpm-options" role="radiogroup">
              {OPTIONS.map((opt) => {
                const isSelected = selectedMode === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`sdpm-option ${isSelected ? 'sdpm-option--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="notify-mode"
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => setSelectedMode(opt.value)}
                      className="sdpm-option__radio"
                    />
                    <div className="sdpm-option__icon">
                      {isSelected ? <CheckCircle2 size={14} /> : <span className="sdpm-option__circle" />}
                    </div>
                    <div className="sdpm-option__text">
                      <div className="sdpm-option__title-row">
                        <span className="sdpm-option__title">{opt.title}</span>
                        {opt.recommended && (
                          <span className="sdpm-option__badge">
                            <Sparkles size={9} /> مُوصى
                          </span>
                        )}
                      </div>
                      <p className="sdpm-option__desc">{opt.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            {selectedMode === 'raw' && (
              <div className="sdpm-warn">
                <AlertCircle size={12} />
                <span>تنبيه: النص الخام قد يحتوي مصطلحات قانونية يصعب فهمها على العميل غير المتخصص.</span>
              </div>
            )}
          </div>

          <footer className="sdpm-footer">
            {currentEnabled && (
              <button
                type="button"
                className="sdpm-btn sdpm-btn--danger"
                onClick={() => handleSubmit(false)}
                disabled={saving}
              >
                إلغاء الإرسال
              </button>
            )}
            <div className="sdpm-footer__right">
              <Dialog.Close asChild>
                <button type="button" className="sdpm-btn sdpm-btn--ghost" disabled={saving}>
                  إلغاء
                </button>
              </Dialog.Close>
              <button
                type="button"
                className="sdpm-btn sdpm-btn--primary"
                onClick={() => handleSubmit(true)}
                disabled={saving}
              >
                {saving ? <Loader2 size={12} className="sdpm-spin" /> : <CheckCircle2 size={12} />}
                <span>{saving ? 'جاري الحفظ...' : 'موافق وتفعيل'}</span>
              </button>
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
