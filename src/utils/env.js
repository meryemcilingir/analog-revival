const mq = (q) => window.matchMedia(q).matches;

export const prefersReducedMotion = mq('(prefers-reduced-motion: reduce)');
export const isTouch = mq('(hover: none), (pointer: coarse)');
export const isMobile = () => window.innerWidth < 768;
