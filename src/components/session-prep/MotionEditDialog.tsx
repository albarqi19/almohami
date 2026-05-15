// Modal لتحرير الطلب الإجرائي (body + tag + result_note)

import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useUpdateMotion } from '../../hooks/useSessionPrep';
import type { SessionMotion, MotionTag } from '../../services/sessionPrepService';

const TAGS: MotionTag[] = ['إجرائي', 'مستندي', 'شاهد', 'خبير', 'تأجيل', 'رد', 'عارض', 'أخرى'];

interface Props {
  sessionId: number;
  motion: SessionMotion | null;
  open: boolean;
  onClose: () => void;
}

export const MotionEditDialog: React.FC<Props> = ({ sessionId, motion, open, onClose }) => {
  const updateMut = useUpdateMotion(sessionId);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState<MotionTag | ''>('');
  const [resultNote, setResultNote] = useState('');

  useEffect(() => {
    if (motion && open) {
      setTitle(motion.title);
      setBody(motion.body ?? '');
      setTag((motion.tag as MotionTag) ?? '');
      setResultNote(motion.result_note ?? '');
    }
  }, [motion, open]);

  if (!motion) return null;

  const save = async () => {
    try {
      await updateMut.mutateAsync({
        motionId: motion.id,
        payload: {
          title: title.trim() || motion.title,
          body: body.trim() || null,
          tag: (tag as MotionTag) || null,
          result_note: resultNote.trim() || null,
        },
      });
      toast.success('تم حفظ الطلب');
      onClose();
    } catch {
      toast.error('تعذّر الحفظ');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="sp-dialog-overlay" />
        <Dialog.Content className="sp-dialog sp-dialog--md">
          <div className="sp-dialog__header">
            <Dialog.Title className="sp-dialog__title">تعديل الطلب الإجرائي</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="sp-icon-btn" aria-label="إغلاق">
                <X size={14} />
              </button>
            </Dialog.Close>
          </div>

          <div className="sp-dialog__body">
            <div className="sp-field">
              <label className="sp-field__label">العنوان</label>
              <input
                type="text"
                className="sp-field__input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="sp-field">
              <label className="sp-field__label">التصنيف</label>
              <select
                className="sp-field__input"
                value={tag}
                onChange={(e) => setTag(e.target.value as MotionTag | '')}
              >
                <option value="">— بدون —</option>
                {TAGS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="sp-field">
              <label className="sp-field__label">نص الطلب الكامل</label>
              <textarea
                className="sp-field__textarea"
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="صاحب الفضيلة، نلتمس..."
              />
            </div>

            <div className="sp-field">
              <label className="sp-field__label">ملاحظة النتيجة (بعد الجلسة)</label>
              <input
                type="text"
                className="sp-field__input"
                value={resultNote}
                onChange={(e) => setResultNote(e.target.value)}
                placeholder="مثال: قُبل، أو رُفض مع التسبيب..."
              />
            </div>
          </div>

          <div className="sp-dialog__footer">
            <button type="button" className="sp-btn sp-btn--ghost" onClick={onClose}>
              إلغاء
            </button>
            <button type="button" className="sp-btn sp-btn--primary" onClick={save} disabled={updateMut.isPending}>
              {updateMut.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
