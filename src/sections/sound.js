import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../utils/env.js';

// ---- Frekans tepkisi (konsept; temsili eğriler) ----
const F_MIN = 10;
const F_MAX = 30000;
const DB_RANGE = 12; // ±12 dB
const W = 640;
const H = 280;

const bump = (f, center, gain, width) => gain * Math.exp(-((Math.log10(f / center) / width) ** 2));
const lowCut = (f, fc, depth) => -depth / (1 + (f / fc) ** 2);
const highCut = (f, fc, depth, order = 4) => -depth / (1 + (fc / f) ** order);

const PROFILES = {
  original: (f) =>
    lowCut(f, 38, 14) + bump(f, 85, 2.6, 0.35) + bump(f, 3200, 2.2, 0.25) + highCut(f, 15000, 20) +
    0.5 * Math.sin(Math.log10(f) * 9),
  reissue: (f) =>
    lowCut(f, 14, 12) + bump(f, 70, 1.6, 0.4) + bump(f, 3000, 1.1, 0.25) + highCut(f, 27000, 18, 5) +
    0.25 * Math.sin(Math.log10(f) * 9),
};

const x = (f) => ((Math.log10(f) - Math.log10(F_MIN)) / (Math.log10(F_MAX) - Math.log10(F_MIN))) * W;
const y = (db) => H / 2 - (Math.max(-DB_RANGE, Math.min(DB_RANGE, db)) / DB_RANGE) * (H / 2);

function curvePath(fn) {
  const steps = 160;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const f = F_MIN * (F_MAX / F_MIN) ** (i / steps);
    d += `${i ? 'L' : 'M'}${x(f).toFixed(1)} ${y(fn(f)).toFixed(1)}`;
  }
  return d;
}

function buildGraph(host) {
  const gridF = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  const labelF = { 20: '20', 100: '100', 1000: '1k', 10000: '10k', 20000: '20k' };
  const gridDb = [-12, -6, 0, 6, 12];

  host.innerHTML = `
    <svg viewBox="-36 -12 ${W + 48} ${H + 40}" role="img" aria-labelledby="fr-title fr-desc">
      <title id="fr-title">Frequency response</title>
      <desc id="fr-desc">The 2026 reissue extends deeper into the bass and higher into the treble than the 1974 original, with a flatter midrange.</desc>
      <g class="fr__grid">
        ${gridF.map((f) => `<line x1="${x(f)}" x2="${x(f)}" y1="0" y2="${H}" />`).join('')}
        ${gridDb.map((db) => `<line x1="0" x2="${W}" y1="${y(db)}" y2="${y(db)}" class="${db === 0 ? 'is-zero' : ''}" />`).join('')}
      </g>
      <g class="fr__labels">
        ${Object.entries(labelF).map(([f, l]) => `<text x="${x(+f)}" y="${H + 22}" text-anchor="middle">${l}</text>`).join('')}
        ${gridDb.map((db) => `<text x="-10" y="${y(db) + 4}" text-anchor="end">${db > 0 ? '+' : ''}${db}</text>`).join('')}
      </g>
      <path class="fr__curve fr__curve--original" d="${curvePath(PROFILES.original)}" pathLength="1" />
      <path class="fr__curve fr__curve--reissue" d="${curvePath(PROFILES.reissue)}" pathLength="1" />
    </svg>`;
  return host.querySelectorAll('.fr__curve');
}

/** Sound: scroll ile çizilen frekans grafiği, sayarak gelen değerler, 1974 / 2026 karşılaştırması. */
export function createSound() {
  const root = document.getElementById('sound');
  const curves = buildGraph(root.querySelector('.fr__plot'));
  const lines = root.querySelectorAll('.sound__head .line > span');
  const fades = root.querySelectorAll('[data-fade]');

  // Başlık
  gsap.set(lines, { yPercent: 110 });
  gsap.set(fades, { opacity: 0, y: 16 });
  ScrollTrigger.create({
    trigger: root,
    start: 'top 60%',
    once: true,
    onEnter: () => {
      gsap.to(lines, { yPercent: 0, duration: prefersReducedMotion ? 0.3 : 1, ease: 'expo.out', stagger: 0.07 });
    },
  });
  fades.forEach((el) =>
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: prefersReducedMotion ? 0.3 : 0.9, ease: 'expo.out' }),
    }),
  );

  // Eğriler scroll ile çizilir
  gsap.set(curves, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.to(curves, {
    strokeDashoffset: 0,
    ease: 'none',
    stagger: 0.15,
    scrollTrigger: { trigger: root.querySelector('.fr'), start: 'top 85%', end: 'bottom 55%', scrub: true },
  });

  // Sayaçlar
  root.querySelectorAll('[data-count]').forEach((el) => {
    const to = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const state = { v: 0 };
    el.textContent = (0).toFixed(decimals);
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () =>
        gsap.to(state, {
          v: to,
          duration: prefersReducedMotion ? 0.01 : 1.6,
          ease: 'expo.out',
          onUpdate: () => (el.textContent = state.v.toFixed(decimals)),
        }),
    });
  });
}
