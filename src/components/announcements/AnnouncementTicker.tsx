import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, ExternalLink, Megaphone } from 'lucide-react';
import { useAnnouncements } from '../../contexts/AnnouncementContext';
import { resolveTheme, openCta } from './theme';
import AnnouncementModalView from './AnnouncementModalView';
import type { Announcement } from '../../services/announcementService';

const ROTATE_INTERVAL_MS = 8_000;

const AnnouncementTicker: React.FC = () => {
  const { byChannel, dismiss, track } = useAnnouncements();
  const items = byChannel('ticker');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [opened, setOpened] = useState<Announcement | null>(null);

  // Reset index if list shrinks
  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [items.length, index]);

  // Rotate
  useEffect(() => {
    if (items.length <= 1 || paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [items.length, paused]);

  // Track "seen" when announcement appears
  useEffect(() => {
    if (items.length === 0) return;
    const current = items[index];
    if (current) track(current.id, 'seen');
  }, [index, items, track]);

  if (items.length === 0) return null;

  const current = items[index];
  const theme = resolveTheme(current);

  const next = () => setIndex((i) => (i + 1) % items.length);
  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length);

  const handleClick = () => {
    track(current.id, 'click');
    if (current.body_markdown || current.image_url || current.cta_url) {
      setOpened(current);
    } else if (current.cta_url) {
      openCta(current);
    }
  };

  return (
    <>
      <div
        className="ticker-anc"
        dir="rtl"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        style={{
          background: theme.bg,
          color: theme.fg,
          borderTop: `1px solid ${theme.border}`,
        }}
      >
        <Megaphone size={13} style={{ color: theme.iconColor, flexShrink: 0 }} />

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="ticker-anc__content"
            onClick={handleClick}
            role="button"
          >
            <span className="ticker-anc__title">{current.title}</span>
            {current.cta_label && (
              <span className="ticker-anc__cta">
                {current.cta_label}
                <ExternalLink size={10} />
              </span>
            )}
          </motion.div>
        </AnimatePresence>

        {items.length > 1 && (
          <div className="ticker-anc__nav">
            <button onClick={prev} title="السابق" type="button">
              <ChevronRight size={12} />
            </button>
            <span className="ticker-anc__count">{index + 1}/{items.length}</span>
            <button onClick={next} title="التالي" type="button">
              <ChevronLeft size={12} />
            </button>
          </div>
        )}

        {current.dismissible && (
          <button
            onClick={(e) => { e.stopPropagation(); dismiss(current.id); }}
            className="ticker-anc__close"
            title="إخفاء"
            type="button"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {opened && (
        <AnnouncementModalView announcement={opened} onClose={() => setOpened(null)} />
      )}

      <style>{`
        .ticker-anc {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 5px 14px;
          height: 30px;
          font-size: 12px;
          font-weight: 500;
          z-index: 38;
          overflow: hidden;
        }
        .ticker-anc__content {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          overflow: hidden;
        }
        .ticker-anc__title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ticker-anc__cta {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 1px 8px;
          background: rgba(0,0,0,0.08);
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .ticker-anc__nav {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          flex-shrink: 0;
        }
        .ticker-anc__nav button {
          background: transparent;
          border: none;
          padding: 3px;
          border-radius: 3px;
          color: inherit;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.15s, background 0.15s;
        }
        .ticker-anc__nav button:hover {
          opacity: 1;
          background: rgba(0,0,0,0.06);
        }
        .ticker-anc__count {
          font-size: 10px;
          opacity: 0.6;
          padding: 0 2px;
          font-variant-numeric: tabular-nums;
        }
        .ticker-anc__close {
          background: transparent;
          border: none;
          padding: 3px;
          border-radius: 3px;
          color: inherit;
          cursor: pointer;
          opacity: 0.6;
          flex-shrink: 0;
          transition: opacity 0.15s, background 0.15s;
        }
        .ticker-anc__close:hover {
          opacity: 1;
          background: rgba(0,0,0,0.06);
        }
        @media (max-width: 1024px) {
          .ticker-anc { display: none; }
        }
      `}</style>
    </>
  );
};

export default AnnouncementTicker;
