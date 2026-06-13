import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock } from 'lucide-react';

/**
 * Live countdown + time-progress widgets for the announcement banner.
 * Each keeps its own 1s ticker so the parent banner does not re-render
 * every second (only these small pieces do).
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Break remaining milliseconds into d/h/m/s parts. */
function remaining(targetMs: number, nowMs: number) {
  const totalSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  return {
    totalSec,
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

const UNIT_LABEL: Record<string, string> = { d: 'يوم', h: 'ساعة', m: 'دقيقة', s: 'ثانية' };

interface CountdownProps {
  /** ISO datetime to count down to (announcement ends_at). */
  target: string;
  /** Accent color from the announcement theme. */
  accent: string;
}

/**
 * Pill-style countdown. Turns red and pulses in the final hour.
 * Renders nothing once the target passes.
 */
export const BannerCountdown: React.FC<CountdownProps> = ({ target, accent }) => {
  const targetMs = new Date(target).getTime();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (isNaN(targetMs)) return null;
  const { totalSec, days, hours, minutes, seconds } = remaining(targetMs, nowMs);
  if (totalSec <= 0) return null;

  const urgent = totalSec <= 3600; // last hour → emphasize
  const pulse = urgent && !shouldReduce;
  const color = urgent ? '#dc2626' : accent;

  // Drop the day unit until it is actually meaningful.
  const units: Array<{ key: string; v: number }> = [];
  if (days > 0) units.push({ key: 'd', v: days });
  units.push({ key: 'h', v: hours });
  units.push({ key: 'm', v: minutes });
  units.push({ key: 's', v: seconds });

  return (
    <motion.span
      dir="ltr"
      title="ينتهي خلال"
      animate={pulse ? { scale: [1, 1.06, 1] } : {}}
      transition={pulse ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' } : {}}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 9px',
        borderRadius: 999,
        background: `${color}14`,
        border: `1px solid ${color}33`,
        color,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        flexShrink: 0,
      }}
    >
      <Clock size={12} style={{ flexShrink: 0 }} />
      <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 3 }}>
        {units.map((u, i) => (
          <React.Fragment key={u.key}>
            {i > 0 && <span style={{ opacity: 0.35, alignSelf: 'center', marginBottom: 6 }}>:</span>}
            <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
              <span style={{ fontSize: 13 }}>{pad(u.v)}</span>
              <span style={{ fontSize: 8, opacity: 0.6, fontWeight: 500 }}>{UNIT_LABEL[u.key]}</span>
            </span>
          </React.Fragment>
        ))}
      </span>
    </motion.span>
  );
};

interface ProgressProps {
  /** ISO start datetime. */
  start: string;
  /** ISO end datetime. */
  end: string;
  /** Accent color from the announcement theme. */
  accent: string;
}

/**
 * Thin time-progress bar pinned to the bottom of the banner; shrinks toward
 * zero as the deadline nears. Only meaningful when both start and end exist.
 */
export const BannerProgress: React.FC<ProgressProps> = ({ start, end, accent }) => {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return null;
  const pct = Math.max(0, Math.min(100, ((endMs - nowMs) / (endMs - startMs)) * 100));
  if (pct <= 0) return null;

  return (
    <div
      aria-hidden
      style={{ position: 'absolute', bottom: 0, insetInlineStart: 0, insetInlineEnd: 0, height: 2, background: `${accent}1f` }}
    >
      <div style={{ height: '100%', width: `${pct}%`, background: accent, transition: shouldReduce ? 'none' : 'width 1s linear' }} />
    </div>
  );
};
