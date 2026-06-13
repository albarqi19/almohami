import type { Announcement, MotionSpeed } from '../../services/announcementService';

/**
 * Resolves an announcement's effective motion into ready-to-use framer-motion
 * props. Explicit `announcement.motion` config wins; otherwise we fall back to
 * sensible per-severity defaults (legacy behavior).
 *
 * Performance: every effect here animates only `transform`/`opacity`, which the
 * browser composites on the GPU (no layout/paint per frame). The glow is a
 * static box-shadow layer whose *opacity* is animated — never the shadow itself.
 */

const SPEED_SEC: Record<MotionSpeed, number> = { slow: 2.6, normal: 1.6, fast: 0.9 };
const GLOW_SEC: Record<MotionSpeed, number> = { slow: 2.8, normal: 1.8, fast: 1.0 };
const INTENSITY_SCALE: Record<string, number> = { soft: 1.08, normal: 1.16, strong: 1.3 };
const INTENSITY_SHIFT: Record<string, number> = { soft: 2, normal: 4, strong: 7 };

export interface ResolvedMotion {
  /** framer-motion `animate` for the icon — null means static. */
  iconAnimate: Record<string, number[]> | null;
  iconTransition: Record<string, unknown> | null;
  /** Pulsing halo around the banner. */
  glow: boolean;
  glowDuration: number;
  /** Light sweep across the banner. */
  shimmer: boolean;
}

const OFF: ResolvedMotion = {
  iconAnimate: null,
  iconTransition: null,
  glow: false,
  glowDuration: 0,
  shimmer: false,
};

export function resolveMotion(a: Announcement, reduce: boolean): ResolvedMotion {
  if (reduce) return OFF; // honor prefers-reduced-motion / low-power

  const m = a.motion || {};
  // Fall back to per-severity defaults when no explicit type is set.
  const type = m.type ?? (a.severity === 'promo' ? 'shimmer' : a.severity === 'danger' ? 'pulse' : 'none');
  const speed: MotionSpeed = m.speed ?? 'normal';
  const intensity = m.intensity ?? 'normal';
  const glow = m.glow ?? (a.severity === 'promo');
  const glowDuration = GLOW_SEC[m.glowSpeed ?? speed];

  const dur = SPEED_SEC[speed];
  const scale = INTENSITY_SCALE[intensity];
  const shift = INTENSITY_SHIFT[intensity];

  let iconAnimate: Record<string, number[]> | null = null;
  let shimmer = false;

  switch (type) {
    case 'pulse':
      iconAnimate = { scale: [1, scale, 1] };
      break;
    case 'bounce':
      iconAnimate = { y: [0, -shift, 0] };
      break;
    case 'shake':
      iconAnimate = { x: [0, -shift, shift, 0] };
      break;
    case 'shimmer':
      shimmer = true;
      break;
    case 'none':
    default:
      break;
  }

  const iconTransition = iconAnimate
    ? { repeat: Infinity, duration: dur, repeatDelay: type === 'shake' ? 0.4 : 0.8, ease: 'easeInOut' }
    : null;

  return { iconAnimate, iconTransition, glow, glowDuration, shimmer };
}
