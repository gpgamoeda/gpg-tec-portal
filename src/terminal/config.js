export const glyphs = [
  ...Array.from({ length: 96 }, (_, index) => String.fromCharCode(0x30a0 + index)),
  ..."0123456789GPGTEC",
];

export const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const timings = {
  rainDuration: prefersReducedMotion ? 800 : 10000,
  fadeDuration: prefersReducedMotion ? 500 : 2400,
  revealDuration: prefersReducedMotion ? 400 : 1800,
  idleDelay: 120000,
  idleFadeDuration: prefersReducedMotion ? 500 : 2200,
};

timings.fadeStartTime = Math.max(0, timings.rainDuration - timings.fadeDuration);
