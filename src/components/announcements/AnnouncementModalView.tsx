import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, AlertTriangle, Info, CheckCircle2, AlertOctagon, Gift, Megaphone } from 'lucide-react';
import { resolveTheme, openCta, renderMarkdown } from './theme';
import type { Announcement } from '../../services/announcementService';

interface Props {
  announcement: Announcement;
  onClose: () => void;
  onDismiss?: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  Info, CheckCircle2, AlertTriangle, AlertOctagon, Gift, Megaphone,
};

const AnnouncementModalView: React.FC<Props> = ({ announcement, onClose, onDismiss }) => {
  const theme = resolveTheme(announcement);
  const Icon = ICON_MAP[theme.defaultIcon] || Megaphone;

  const handleCta = () => {
    if (!announcement.cta_url) return;
    openCta(announcement);
    if (announcement.cta_open_mode !== 'modal') onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 520,
            background: 'var(--color-surface)',
            borderRadius: 14,
            border: '1px solid var(--color-border)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
            overflow: 'hidden',
          }}
        >
          {/* Header strip */}
          <div style={{
            background: theme.bg,
            color: theme.fg,
            padding: '20px 22px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            borderBottom: `1px solid ${theme.border}`,
          }}>
            <div style={{
              flexShrink: 0,
              width: 38, height: 38,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.iconColor,
            }}>
              <Icon size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1.4,
              }}>
                {announcement.title}
              </h3>
            </div>
            <button onClick={onClose} type="button" style={{
              background: 'transparent', border: 'none', padding: 4,
              color: theme.fg, opacity: 0.6, cursor: 'pointer',
              borderRadius: 4,
            }}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          {(announcement.image_url || announcement.body_markdown) && (
            <div style={{ padding: '18px 22px' }}>
              {announcement.image_url && (
                <img
                  src={announcement.image_url}
                  alt=""
                  style={{
                    width: '100%',
                    borderRadius: 8,
                    marginBottom: 14,
                    border: '1px solid var(--color-border)',
                  }}
                />
              )}
              {announcement.body_markdown && (
                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: 'var(--color-text)',
                  }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(announcement.body_markdown) }}
                />
              )}
            </div>
          )}

          {/* Footer */}
          <div style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-surface-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
          }}>
            {announcement.dismissible && (
              <button
                onClick={() => { onDismiss?.(); onClose(); }}
                type="button"
                style={{
                  padding: '8px 14px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                لا تظهر مرة أخرى
              </button>
            )}
            <button
              onClick={onClose}
              type="button"
              style={{
                padding: '8px 14px',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                fontSize: 13,
                color: 'var(--color-text)',
                cursor: 'pointer',
              }}
            >
              إغلاق
            </button>
            {announcement.cta_url && (
              <button
                onClick={handleCta}
                type="button"
                style={{
                  padding: '8px 16px',
                  background: theme.iconColor,
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {announcement.cta_label || 'اذهب'}
                <ExternalLink size={12} />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnnouncementModalView;
