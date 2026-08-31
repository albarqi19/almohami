/**
 * نافذةُ لصقِ النصّ — بديلُ `window.prompt`.
 *
 * 🩸 `prompt` المتصفّح ليس قبيحاً فحسب: سطرٌ واحدٌ لا يصلح لمذكّرةٍ من صفحات،
 * ولا يعرض عدّادَ حروفٍ ولا يقول لماذا رُفض النصّ القصير، ويحجب الصفحةَ حجباً
 * قسرياً. واللصقُ هنا **المخرجُ الوحيد** حين يتعذّر قراءةُ الملفّ — فلا يصحّ أن
 * يكون أضعفَ أدوات الشاشة.
 *
 * ⚠️ `Dialog.Root` من Radix يفرض `ltr` داخلياً — يجب تمريرُ `dir="rtl"` صراحةً
 * وإلّا انقلب المحتوى. مزلقٌ مقيسٌ في هذا المستودع.
 */

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Paperclip, X } from 'lucide-react';

/** أدنى ما يقبله الخادم — والرقم هنا مرآةٌ لقاعدة التحقّق لا تخمين */
const MIN_CHARS = 120;

interface Props {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: { title: string; text: string; role: string }) => void;
}

const ROLES: Array<{ id: string; label: string }> = [
  { id: 'opponent_memo', label: 'مذكّرة الخصم' },
  { id: 'contract', label: 'عقد' },
  { id: 'judgment', label: 'حكم' },
  { id: 'evidence', label: 'مستند إثبات' },
  { id: 'our_previous', label: 'مذكّرةٌ لنا' },
  { id: 'other', label: 'غير ذلك' },
];

export default function PasteSourceDialog({ open, busy, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [role, setRole] = useState('other');

  // تصفيرٌ عند كل فتح — نافذةٌ تحتفظ بنصّ المرّة الماضية تربك
  useEffect(() => {
    if (open) {
      setTitle('');
      setText('');
      setRole('other');
    }
  }, [open]);

  const length = text.trim().length;
  const tooShort = length > 0 && length < MIN_CHARS;
  const ready = title.trim().length > 0 && length >= MIN_CHARS && !busy;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="dr-dlg__overlay" />
        {/* dir صريحٌ — Radix يفرض ltr داخلياً */}
        <Dialog.Content className="dr-dlg" dir="rtl" aria-describedby={undefined}>
          <header className="dr-dlg__head">
            <Dialog.Title className="dr-dlg__title">
              <Paperclip size={15} aria-hidden />
              لصقُ نصِّ مستند
            </Dialog.Title>
            <button type="button" className="dr-dlg__close" aria-label="إغلاق" onClick={onClose} disabled={busy}>
              <X size={14} />
            </button>
          </header>

          <div className="dr-dlg__body">
            <p className="dr-card__why">
              حين يتعذّر قراءةُ الملفّ — صورةً كان أو ممسوحاً ضوئياً — ألصِق نصَّه هنا.
              يُعامَل كأيّ مصدرٍ آخر: يُقطَّع ويُرسى ويُقتبَس منه.
            </p>

            <label className="dr-dlg__field">
              <span className="dr-aside__title">عنوانُ المستند</span>
              <input
                className="dr-composer__input"
                style={{ minHeight: 40 }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: مذكّرة الخصم المودَعة 1446/03/12"
                disabled={busy}
                autoFocus
              />
            </label>

            <label className="dr-dlg__field">
              <span className="dr-aside__title">نوعُ المستند</span>
              <div className="dr-actions">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`dr-btn${role === r.id ? ' dr-btn--picked' : ''}`}
                    onClick={() => setRole(r.id)}
                    aria-pressed={role === r.id}
                    disabled={busy}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </label>

            <label className="dr-dlg__field dr-dlg__field--grow">
              <span className="dr-aside__title">النصّ</span>
              <textarea
                className="dr-dlg__textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="ألصِق النصَّ كاملاً هنا…"
                disabled={busy}
              />
              {/* عدّادٌ يقول السببَ قبل الرفض لا بعده */}
              <span className={`dr-dlg__count${tooShort ? ' dr-dlg__count--short' : ''}`}>
                {length === 0
                  ? `الحدُّ الأدنى ${MIN_CHARS} حرفاً`
                  : tooShort
                    ? `${length} حرفاً — يلزم ${MIN_CHARS} على الأقلّ ليكون النصُّ مفيداً`
                    : `${length.toLocaleString('ar-SA')} حرفاً`}
              </span>
            </label>
          </div>

          <footer className="dr-dlg__foot">
            <button type="button" className="dr-btn" onClick={onClose} disabled={busy}>إلغاء</button>
            <button
              type="button"
              className="dr-btn dr-btn--primary"
              disabled={!ready}
              onClick={() => onSubmit({ title: title.trim(), text: text.trim(), role })}
            >
              {busy ? 'يُحفَظ…' : 'أضِف المصدر'}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
