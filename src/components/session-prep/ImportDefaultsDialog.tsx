// Dialog لاستيراد القوالب الافتراضية (حسب نوع الجلسة) أو من جلسة سابقة

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Download, Copy, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useImportDefaults } from '../../hooks/useSessionPrep';

interface Props {
  sessionId: number;
  sessionType: string | null;
  open: boolean;
  onClose: () => void;
}

export const ImportDefaultsDialog: React.FC<Props> = ({ sessionId, sessionType, open, onClose }) => {
  const importMut = useImportDefaults(sessionId);

  const handleImport = async () => {
    try {
      const r = await importMut.mutateAsync();
      toast.success(`أُضيف ${r.preparations_added} تحضير و ${r.motions_added} طلب`);
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message || 'تعذّر الاستيراد');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="sp-dialog-overlay" />
        <Dialog.Content className="sp-dialog sp-dialog--sm">
          <div className="sp-dialog__header">
            <Dialog.Title className="sp-dialog__title">استيراد افتراضي</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="sp-icon-btn" aria-label="إغلاق">
                <X size={14} />
              </button>
            </Dialog.Close>
          </div>

          <div className="sp-dialog__body">
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              نوع الجلسة الحالي: <strong style={{ color: 'var(--color-text)' }}>{sessionType || 'غير محدد'}</strong>
            </p>

            <button
              type="button"
              className="sp-import-option"
              onClick={handleImport}
              disabled={importMut.isPending || !sessionType}
            >
              {importMut.isPending ? <Loader2 size={14} className="sp-spin" /> : <Download size={14} />}
              <div className="sp-import-option__text">
                <div className="sp-import-option__title">استيراد قالب افتراضي</div>
                <div className="sp-import-option__hint">
                  حسب نوع الجلسة "{sessionType || '—'}" من إعدادات الشركة
                </div>
              </div>
            </button>

            <button
              type="button"
              className="sp-import-option"
              onClick={() => toast.info('قريباً: اختيار جلسة سابقة من نفس القضية')}
              disabled
              style={{ opacity: 0.5 }}
            >
              <Copy size={14} />
              <div className="sp-import-option__text">
                <div className="sp-import-option__title">نسخ من جلسة سابقة</div>
                <div className="sp-import-option__hint">قريباً — اختر جلسة من نفس القضية</div>
              </div>
            </button>

            {!sessionType && (
              <p style={{ fontSize: 11, color: 'var(--color-warning)', marginTop: 12 }}>
                ⚠ لا يمكن الاستيراد بدون نوع جلسة محدد
              </p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
