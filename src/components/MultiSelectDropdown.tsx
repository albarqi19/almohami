import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Star } from 'lucide-react';

export interface MsdOption {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  options: MsdOption[];
  /** كل القيم المختارة (تشمل المسؤول إن وُجد) */
  selected: string[];
  onToggle: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  invalid?: boolean;
  /** اختياري: يفعّل نمط «المسؤول» — القيمة المميّزة بنجمة ذهبية + إمكانية ترقية غيره */
  responsible?: string;
  onPromote?: (value: string) => void;
}

/**
 * قائمة منسدلة لاختيار متعدد تُرسم عبر Portal في document.body
 * (تطفو فوق كل شيء ولا يقصّها overflow الحاويات). تبقى مفتوحة أثناء
 * الاختيار وتُغلق فقط بالنقر خارجها. تعرض «{الأول} وآخرون» عند تعدّد الاختيار.
 */
const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selected,
  onToggle,
  placeholder = 'اختر...',
  emptyText = 'لا يوجد خيارات',
  invalid,
  responsible,
  onPromote,
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const place = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: r.left, width: r.width });
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const labelOf = (v: string) => options.find(o => o.value === v)?.label || '';
  const anchor = responsible || selected[0];
  const summary = selected.length === 0
    ? placeholder
    : selected.length > 1
      ? `${labelOf(anchor)} وآخرون`
      : labelOf(anchor);

  return (
    <>
      <div className="erpc-control">
        <button
          type="button"
          ref={triggerRef}
          className={`erpc-select ${invalid ? 'erpc-invalid' : ''}`}
          style={{ width: '100%', textAlign: 'start' }}
          onClick={() => { if (!open) place(); setOpen(o => !o); }}
        >
          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: selected.length ? 1 : 0.32 }}>
            {summary}
          </span>
        </button>
        <ChevronDown size={14} className="erpc-select-arrow" />
      </div>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          className="erpc-lawyer-menu"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
        >
          {options.length === 0 && <div className="erpc-lawyer-empty">{emptyText}</div>}
          {options.map(o => {
            const isResp = responsible !== undefined && responsible === o.value;
            const isSel = selected.includes(o.value);
            const isMember = isSel && !isResp;
            return (
              <div
                key={o.value}
                className={`erpc-lawyer-opt ${isSel ? 'selected' : ''}`}
                onClick={() => onToggle(o.value)}
              >
                <span className="erpc-lawyer-mark">
                  {isResp
                    ? <Star size={15} fill="var(--law-gold, #c8a24a)" color="var(--law-gold, #c8a24a)" />
                    : isSel
                      ? <Check size={15} color="var(--notion-blue)" />
                      : <span style={{ width: 13, height: 13, borderRadius: '50%', border: '1.5px solid var(--notion-border)' }} />}
                </span>
                <span className="erpc-lawyer-name">{o.label}</span>
                {isResp && <span className="erpc-lawyer-tag">مسؤول</span>}
                {isMember && onPromote && (
                  <button
                    type="button"
                    className="erpc-lawyer-promote"
                    title="تعيينه محامياً مسؤولاً"
                    onClick={(e) => { e.stopPropagation(); onPromote(o.value); }}
                  >
                    <Star size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};

export default MultiSelectDropdown;
