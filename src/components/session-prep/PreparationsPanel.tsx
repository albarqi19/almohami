// عمود التحضيرات — قائمة checkbox مع InlineQuickAdd
// optimistic toggle، حذف، استيراد قوالب

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Check, X, Edit2, Trash2, Download } from 'lucide-react';
import { InlineQuickAdd } from './InlineQuickAdd';
import {
  useSessionPreparations,
  useCreatePreparation,
  useTogglePreparation,
  useDeletePreparation,
  useUpdatePreparation,
} from '../../hooks/useSessionPrep';
import type { SessionPreparation } from '../../services/sessionPrepService';

interface Props {
  sessionId: number;
  onImportClick: () => void;
}

const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
  default: { label: 'افتراضي', color: 'var(--color-text-secondary)' },
  manual: { label: 'يدوي', color: 'var(--color-text-secondary)' },
  ai_suggested: { label: 'AI', color: 'var(--color-primary)' },
  copied: { label: 'نسخ', color: 'var(--color-text-secondary)' },
};

export const PreparationsPanel: React.FC<Props> = ({ sessionId, onImportClick }) => {
  const { data, isLoading, isError } = useSessionPreparations(sessionId);
  const createMut = useCreatePreparation(sessionId);
  const toggleMut = useTogglePreparation(sessionId);
  const deleteMut = useDeletePreparation(sessionId);
  const updateMut = useUpdatePreparation(sessionId);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const items = data?.items ?? [];
  const progress = data?.progress ?? 0;

  const startEdit = (prep: SessionPreparation) => {
    setEditingId(prep.id);
    setEditText(prep.title);
  };

  const commitEdit = async () => {
    if (editingId === null) return;
    const newTitle = editText.trim();
    if (!newTitle) {
      setEditingId(null);
      return;
    }
    try {
      await updateMut.mutateAsync({ prepId: editingId, payload: { title: newTitle } });
      setEditingId(null);
    } catch (err) {
      toast.error('تعذّر التعديل');
    }
  };

  return (
    <section className="sp-panel sp-panel--preps">
      <header className="sp-panel__header">
        <h2 className="sp-panel__title">
          التحضيرات
          <span className="sp-panel__count">
            {items.filter((i) => i.is_completed).length}/{items.length}
          </span>
        </h2>
        <div className="sp-panel__progress">
          <div className="sp-panel__progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className="sp-panel__body">
        {isLoading && <p className="sp-panel__hint">جاري التحميل...</p>}
        {isError && <p className="sp-panel__hint sp-panel__hint--error">تعذّر جلب التحضيرات</p>}

        {!isLoading && items.length === 0 && (
          <div className="sp-empty">
            <p>لا توجد تحضيرات بعد.</p>
            <p style={{ fontSize: 11, opacity: 0.7 }}>ابدأ بإضافة تحضير أو استورد قالباً افتراضياً.</p>
          </div>
        )}

        <ul className="sp-list">
          {items.map((prep) => {
            const isEditing = editingId === prep.id;
            const sourceBadge = SOURCE_BADGES[prep.source];

            return (
              <li key={prep.id} className={`sp-list__item ${prep.is_completed ? 'sp-list__item--done' : ''}`}>
                <button
                  type="button"
                  className={`sp-check ${prep.is_completed ? 'sp-check--on' : ''}`}
                  onClick={() => toggleMut.mutate(prep.id)}
                  aria-label={prep.is_completed ? 'إلغاء الإكمال' : 'تأشير كمكتمل'}
                >
                  {prep.is_completed && <Check size={11} strokeWidth={3} />}
                </button>

                {isEditing ? (
                  <input
                    autoFocus
                    type="text"
                    className="sp-list__edit-input"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                ) : (
                  <span
                    className="sp-list__title"
                    onDoubleClick={() => startEdit(prep)}
                    title="نقرتان للتعديل"
                  >
                    {prep.title}
                  </span>
                )}

                {sourceBadge && prep.source !== 'manual' && (
                  <span className="sp-list__source" style={{ color: sourceBadge.color }}>
                    {sourceBadge.label}
                  </span>
                )}

                <div className="sp-list__actions">
                  <button
                    type="button"
                    className="sp-icon-btn"
                    onClick={() => startEdit(prep)}
                    aria-label="تعديل"
                  >
                    <Edit2 size={11} />
                  </button>
                  <button
                    type="button"
                    className="sp-icon-btn sp-icon-btn--danger"
                    onClick={() => {
                      if (confirm('حذف هذا التحضير؟')) {
                        deleteMut.mutate(prep.id, {
                          onError: () => toast.error('تعذّر الحذف'),
                        });
                      }
                    }}
                    aria-label="حذف"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <InlineQuickAdd
          placeholder="أضف تحضيراً... ⏎"
          onAdd={async (title) => {
            try {
              await createMut.mutateAsync({ title });
            } catch (err) {
              toast.error('تعذّر الإضافة');
            }
          }}
        />

        <button type="button" className="sp-panel__footer-btn" onClick={onImportClick}>
          <Download size={12} />
          <span>استيراد قالب افتراضي</span>
        </button>
      </div>
    </section>
  );
};
