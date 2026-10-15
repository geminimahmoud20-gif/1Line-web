// Motion presets for the CRM. Same three durations and two curves as tokens.css, in seconds for motion.
// MotionRoot sets reducedMotion="user", so these collapse to instant changes when the device asks for less motion.
export const DUR = { fast: 0.15, base: 0.25, slow: 0.4 };
export const EASE_OUT = [0.2, 0.8, 0.2, 1];
export const EASE_IN = [0.4, 0, 1, 1];

export const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE_OUT } },
  exit: { opacity: 0, y: 4, transition: { duration: DUR.fast, ease: EASE_IN } }
};

// Lists animate their first appearance only; later updates render without delay.
export const stagger = (step = 0.03) => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: 0.02 } }
});

export const overlay = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.base, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: DUR.fast, ease: EASE_IN } }
};

export const dialog = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: DUR.base, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: DUR.fast, ease: EASE_IN } }
};

export const sheet = {
  hidden: { y: '100%' },
  show: { y: 0, transition: { duration: DUR.slow, ease: EASE_OUT } },
  exit: { y: '100%', transition: { duration: DUR.base, ease: EASE_IN } }
};

// Drawers slide in from the inline end: the left edge in Arabic (RTL), the right edge in English.
export const drawerFrom = (rtl, side = 'end') => {
  const fromLeft = (side === 'end') === rtl;
  const off = fromLeft ? '-100%' : '100%';
  return {
    hidden: { x: off },
    show: { x: 0, transition: { duration: DUR.slow, ease: EASE_OUT } },
    exit: { x: off, transition: { duration: DUR.base, ease: EASE_IN } }
  };
};

export const press = { scale: 0.98 };
export const lift = { y: -2, transition: { duration: DUR.fast, ease: EASE_OUT } };
