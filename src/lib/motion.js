/**
 * Motion tokens — one place for every easing curve and duration so the whole
 * interface moves with the same rhythm.
 *
 * Curves:
 *  EASE      decelerate — entrances, expansions, layout shifts
 *  EASE_IN_OUT symmetric — position swaps, sliding pills, drawers
 *  EASE_SOFT gentle exit — fades and dismissals
 */
export const EASE = [0.22, 1, 0.36, 1];
export const EASE_IN_OUT = [0.65, 0, 0.35, 1];
export const EASE_SOFT = [0.4, 0, 0.6, 1];

export const DUR = {
  instant: 0.12,
  fast: 0.2,
  base: 0.34,
  slow: 0.56,
  cinematic: 0.9,
};

export const SPRING = { type: 'spring', stiffness: 420, damping: 36, mass: 0.7 };
export const SPRING_SOFT = { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 };

/** Standard entrance for panels, dropdowns and popovers. */
export const popover = {
  initial: { opacity: 0, y: -6, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.99 },
  transition: { duration: DUR.fast, ease: EASE },
};

/** Same as popover but grows from the bottom (bottom sheets, toasts). */
export const riseIn = {
  initial: { opacity: 0, y: 12, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.995 },
  transition: { duration: DUR.base, ease: EASE },
};

export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: DUR.fast, ease: EASE },
};

/** Grid/card movement — short, staggered, never blocking the next click. */
export const gridItem = (i = 0) => ({
  layout: 'position',
  initial: { opacity: 0, y: 14, scale: 0.99 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DUR.base, ease: EASE, delay: Math.min(i * 0.035, 0.14) },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.995,
    transition: { duration: DUR.instant, ease: EASE_SOFT },
  },
});

export const LAYOUT_TRANSITION = { duration: DUR.base, ease: EASE };
