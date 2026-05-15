// عمود الطلبات الإجرائية — workflow بالحالات + InlineQuickAdd

import React, { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { toast } from 'react-toastify';
import { Edit2, Trash2, ChevronDown, Download } from 'lucide-react';
import { InlineQuickAdd } from './InlineQuickAdd';
import { MotionEditDialog } from './MotionEditDialog';
import {
  useSessionMotions,
  useCreateMotion,
  useUpdateMotionStatus,
  useDeleteMotion,
} from '../../hooks/useSessionPrep';
import type { SessionMotion, MotionStatus } from '../../services/sessionPrepService';

interface Props {
  sessionId: number;
  onCopyFromSession?: () => void;
}

const STATUS_META: Record<MotionStatus, { icon: string; label: string; color: string }> = {
  draft: { icon: '⚪', label: 'مسوّدة', color: 'var(--color-text-secondary)' },
  ready: { icon: '🟡', label: 'جاهز', color: 'var(--color-warning)' },
  submitted: { icon: '🔵', label: 'مقدّم', color: 'var(--color-info, var(--color-primary))' },
  approved: { icon: '🟢', label: 'مقبول', color: 'var(--color-success)' },
  rejected: { icon: '🔴', label: 'مرفوض', color: 'var(--color-error)' },
  withdrawn: { icon: '⚫', label: 'مسحوب', color: 'var(--color-text-secondary)' },
};

const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
  default: { label: 'افتراضي', color: 'var(--color-text-secondary)' },
  manual: { label: 'يدوي', color: 'var(--color-text-secondary)' },
  ai_suggested: { label: 'AI', color: 'var(--color-primary)' },
  copied: { label: 'نسخ', color: 'var(--color-text-secondary)' },
};

export const MotionsPanel: React.FC<Props> = ({ sessionId, onCopyFromSession }) => {
  const { data, isLoading, isError } = useSessionMotions(sessionId);
  const createMut = useCreateMotion(sessionId);
  const statusMut = useUpdateMotionStatus(sessionId);
  const deleteMut = useDeleteMotion(sessionId);

  const [editing, setEditing] = useState<SessionMotion | null>(null);

  const items = data?.items ?? [];
  const counts = data?.counts ?? {};

  const cycleStatus = (current: MotionStatus): MotionStatus => {
    const cycle: MotionStatus[] = ['draft', 'ready', 'submitted', 'approved'];
    const idx = cycle.indexOf(current);
    return idx === -1 || idx === cycle.length - 1 ? 'draft' : cycle[idx + 1];
  };

  return (
    <section className="sp-panel sp-panel--motions">
      <header className="sp-panel__header">
        <h2 className="sp-panel__title">
          الطلبات الإجرائية
          <span className="sp-panel__count">{items.length}</span>
        </h2>
        <div className="sp-panel__hint" style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--color-text-secondary)' }}>
          <span>جاهز: {counts.ready ?? 0}</span>
          <span>مقدّم: {counts.submitted ?? 0}</span>
        </div>
      </header>

      <div className="sp-panel__body">
        {isLoading && <p className="sp-panel__hint">جاري التحميل...</p>}
        {isError && <p className="sp-panel__hint sp-panel__hint--error">تعذّر جلب الطلبات</p>}

        {!isLoading && items.length === 0 && (
          <div className="sp-empty">
            <p>لا توجد طلبات إجرائية بعد.</p>
            <p style={{ fontSize: 11, opacity: 0.7 }}>أضف طلباً أو انسخ من جلسة سابقة.</p>
          </div>
        )}

        <ul className="sp-list">
          {items.map((motion) => {
            const meta = STATUS_META[motion.status];
            const sourceBadge = SOURCE_BADGES[motion.source];

            return (
              <li key={motion.id} className="sp-list__item sp-motion-item">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      className="sp-status-pill"
                      style={{ color: meta.color }}
                      aria-label="تغيير الحالة"
                    >
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                      <ChevronDown size={10} />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content align="start" sideOffset={4} className="sp-dropdown-content">
                      {(Object.keys(STATUS_META) as MotionStatus[]).map((s) => (
                        <DropdownMenu.Item
                          key={s}
                          className="sp-dropdown-item"
                          onSelect={() => {
                            statusMut.mutate(
                              { motionId: motion.id, status: s },
                              { onError: () => toast.error('تعذّر تغيير الحالة') }
                            );
                          }}
                        >
                          <span style={{ marginInlineEnd: 6 }}>{STATUS_META[s].icon}</span>
                          {STATUS_META[s].label}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>

                <div className="sp-motion-item__body">
                  <span className="sp-motion-item__title" onDoubleClick={() => setEditing(motion)} title="نقرتان للتعديل">
                    {motion.title}
                  </span>
                  {motion.tag && (
                    <span className="sp-tag-chip">{motion.tag}</span>
                  )}
                  {sourceBadge && motion.source !== 'manual' && (
                    <span className="sp-list__source" style={{ color: sourceBadge.color }}>
                      {sourceBadge.label}
                    </span>
                  )}
                </div>

                <div className="sp-list__actions">
                  <button
                    type="button"
                    className="sp-icon-btn"
                    onClick={() => statusMut.mutate({ motionId: motion.id, status: cycleStatus(motion.status) })}
                    aria-label="تقدّم للحالة التالية"
                    title="تقدّم للحالة التالية"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    className="sp-icon-btn"
                    onClick={() => setEditing(motion)}
                    aria-label="تعديل"
                  >
                    <Edit2 size={11} />
                  </button>
                  <button
                    type="button"
                    className="sp-icon-btn sp-icon-btn--danger"
                    onClick={() => {
                      if (confirm('حذف هذا الطلب؟')) {
                        deleteMut.mutate(motion.id, { onError: () => toast.error('تعذّر الحذف') });
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
          placeholder="أضف طلباً إجرائياً... ⏎"
          onAdd={async (title) => {
            try {
              await createMut.mutateAsync({ title });
            } catch {
              toast.error('تعذّر الإضافة');
            }
          }}
        />

        {onCopyFromSession && (
          <button type="button" className="sp-panel__footer-btn" onClick={onCopyFromSession}>
            <Download size={12} />
            <span>نسخ من جلسة سابقة</span>
          </button>
        )}
      </div>

      <MotionEditDialog
        sessionId={sessionId}
        motion={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
      />
    </section>
  );
};
