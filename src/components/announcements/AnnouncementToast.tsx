import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Info, CheckCircle2, AlertTriangle, AlertOctagon, Gift, Megaphone } from 'lucide-react';
import { useAnnouncements } from '../../contexts/AnnouncementContext';
import { resolveTheme, openCta } from './theme';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  Info, CheckCircle2, AlertTriangle, AlertOctagon, Gift, Megaphone,
};

const AUTO_HIDE_MS = 8_000;

const AnnouncementToast: React.FC = () => {
  const { byChannel, track, isSeenInSession, markSeen } = useAnnouncements();
  const items = byChannel('toast').filter((a) => !isSeenInSession(a.id));
  const [hidden, setHidden] = useState<Set<number>>(new Set());

  useEffect(() => {
    items.forEach((a) => {
      if (!isSeenInSession(a.id)) {
        track(a.id, 'seen');
        markSeen(a);
      }
      const t = setTimeout(() => {
        setHidden((prev) => new Set(prev).add(a.id));
      }, AUTO_HIDE_MS);
      return () => clearTimeout(t);
    });
  }, [items, track, markSeen, isSeenInSession]);

  const visible = items.filter((a) => !hidden.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        bottom: 60,
        left: 16,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 360,
      }}
    >
      <AnimatePresence>
        {visible.map((a) => {
          const theme = resolveTheme(a);
          const Icon = ICON_MAP[theme.defaultIcon] || Megaphone;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              style={{
                background: 'var(--color-surface)',
                border: `1px solid ${theme.border}`,
                borderRight: `4px solid ${theme.iconColor}`,
                borderRadius: 8,
                padding: '12px 14px',
                boxShadow: '0 6px 20px rgba(0,0,0,0.10)',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <div style={{
                flexShrink: 0, width: 28, height: 28,
                borderRadius: 6,
                background: theme.bg,
                color: theme.iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon size={16} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>
                  {a.title}
                </div>
                {a.body_markdown && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    {a.body_markdown.slice(0, 140)}
                  </div>
                )}
                {a.cta_url && (
                  <button
                    onClick={() => { track(a.id, 'click'); openCta(a); }}
                    type="button"
                    style={{
                      marginTop: 6,
                      padding: '3px 9px',
                      background: theme.iconColor,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {a.cta_label || 'اذهب'}
                    <ExternalLink size={10} />
                  </button>
                )}
              </div>

              <button
                onClick={() => setHidden((p) => new Set(p).add(a.id))}
                type="button"
                style={{
                  background: 'transparent', border: 'none', padding: 2,
                  color: 'var(--color-text-tertiary)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default AnnouncementToast;
