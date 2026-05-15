// مكوّن مشترك: input بسيط مع Enter handler
// يُستخدم لإضافة سريعة للتحضيرات والطلبات بدون فتح modal

import React, { useState, useRef } from 'react';
import { Plus } from 'lucide-react';

interface Props {
  placeholder?: string;
  onAdd: (title: string) => Promise<void> | void;
  disabled?: boolean;
}

export const InlineQuickAdd: React.FC<Props> = ({ placeholder = 'أضف بسرعة...', onAdd, disabled }) => {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onAdd(trimmed);
      setValue('');
      // إعادة التركيز للاستخدام السريع المتتالي
      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sp-quickadd">
      <Plus size={13} className="sp-quickadd__icon" />
      <input
        ref={inputRef}
        type="text"
        className="sp-quickadd__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
          if (e.key === 'Escape') {
            setValue('');
          }
        }}
        disabled={disabled || submitting}
      />
      {value.trim() && (
        <button
          type="button"
          className="sp-quickadd__btn"
          onClick={submit}
          disabled={submitting}
        >
          {submitting ? '...' : '⏎'}
        </button>
      )}
    </div>
  );
};
