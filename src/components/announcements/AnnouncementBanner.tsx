import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, AlertTriangle, Info, CheckCircle2, AlertOctagon, Gift, Megaphone } from 'lucide-react';
import { useAnnouncements } from '../../contexts/AnnouncementContext';
import { resolveTheme, openCta, renderMarkdown } from './theme';
import AnnouncementModalView from './AnnouncementModalView';
import type { Announcement } from '../../services/announcementService';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  Info, CheckCircle2, AlertTriangle, AlertOctagon, Gift, Megaphone,
};

/**
 * Top-of-page banner channel. Stacks multiple banners vertically.
 */
const AnnouncementBanner: React.FC = () => {
  const { byChannel, dismiss, track } = useAnnouncements();
  const items = byChannel('banner');
  const [opened, setOpened] = useState<Announcement | null>(null);

  useEffect(() => {
    items.forEach((a) => track(a.id, 'seen'));
  }, [items, track]);

  if (items.length === 0) return null;

  return (
    <>
      <div style={{ position: 'relative', zIndex: 35 }}>
        <AnimatePresence initial={false}>
          {items.map((a) => {
            const theme = resolveTheme(a);
            const Icon = ICON_MAP[theme.defaultIcon] || Megaphone;
            return (
              <motion.div
                key={a.id}
                dir="rtl"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  background: theme.bg,
                  color: theme.fg,
                  borderBottom: `1px solid ${theme.border}`,
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 13,
                  fontWeight: 500,
                }}>
                  <Icon size={16} style={{ color: theme.iconColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600 }}>{a.title}</span>
                    {a.body_markdown && (
                      <span
                        style={{ opacity: 0.85 }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(a.body_markdown.slice(0, 200)) }}
                      />
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {a.cta_url && (
                      <button
                        onClick={() => { track(a.id, 'click'); openCta(a); }}
                        type="button"
                        style={{
                          padding: '4px 10px',
                          background: theme.iconColor,
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {a.cta_label || 'اذهب'}
                        <ExternalLink size={11} />
                      </button>
                    )}
                    {(a.body_markdown && a.body_markdown.length > 200) && (
                      <button
                        onClick={() => { track(a.id, 'click'); setOpened(a); }}
                        type="button"
                        style={{
                          padding: '4px 8px',
                          background: 'transparent',
                          color: 'inherit',
                          border: `1px solid ${theme.border}`,
                          borderRadius: 4,
                          fontSize: 11.5,
                          cursor: 'pointer',
                        }}
                      >
                        التفاصيل
                      </button>
                    )}
                    {a.dismissible && (
                      <button
                        onClick={() => dismiss(a.id)}
                        type="button"
                        title="إخفاء"
                        style={{
                          background: 'transparent',
                          color: 'inherit',
                          border: 'none',
                          padding: 4,
                          opacity: 0.7,
                          cursor: 'pointer',
                          borderRadius: 4,
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {opened && (
        <AnnouncementModalView announcement={opened} onClose={() => setOpened(null)} />
      )}
    </>
  );
};

export default AnnouncementBanner;
