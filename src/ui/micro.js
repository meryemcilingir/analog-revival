import gsap from 'gsap';
import { prefersReducedMotion } from '../utils/env.js';

const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Üstte ince okuma ilerleme çizgisi. */
function progressLine() {
  const bar = document.querySelector('.progress__bar');
  gsap.to(bar, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: true },
  });
}

/**
 * Özel imleç (sadece mouse): küçük nokta + gecikmeyle takip eden halka.
 * Linklerde/butonlarda halka büyür; sürüklenebilir alanda "Drag" yazar.
 */
function cursor() {
  const root = document.querySelector('.cursor');
  const dot = root.querySelector('.cursor__dot');
  const ring = root.querySelector('.cursor__ring');
  const label = root.querySelector('.cursor__label');
  document.documentElement.classList.add('has-cursor');

  const moveDot = { x: gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3.out' }), y: gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3.out' }) };
  const moveRing = { x: gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3.out' }), y: gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3.out' }) };
  let shown = false;

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (!shown) {
      shown = true;
      gsap.set([dot, ring], { x: e.clientX, y: e.clientY });
      root.classList.add('is-visible');
    }
    moveDot.x(e.clientX);
    moveDot.y(e.clientY);
    moveRing.x(e.clientX);
    moveRing.y(e.clientY);

    const t = e.target;
    const drag = t.closest?.('.final__stage.is-live');
    const hover = !drag && t.closest?.('a, button');
    root.classList.toggle('is-drag', !!drag);
    root.classList.toggle('is-hover', !!hover);
    label.textContent = drag ? (drag.classList.contains('is-dragging') ? '' : 'Drag') : '';
  });

  document.addEventListener('pointerleave', () => root.classList.remove('is-visible'));
  document.addEventListener('pointerenter', () => shown && root.classList.add('is-visible'));
  window.addEventListener('pointerdown', () => root.classList.add('is-down'));
  window.addEventListener('pointerup', () => root.classList.remove('is-down'));
}

/** Mıknatıslı butonlar: imleç yaklaşınca buton hafifçe ona doğru kayar. */
function magnetic() {
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = parseFloat(el.dataset.magnetic) || 0.3;
    const toX = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'expo.out' });
    const toY = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'expo.out' });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      toX((e.clientX - (r.left + r.width / 2)) * strength);
      toY((e.clientY - (r.top + r.height / 2)) * strength);
    });
    el.addEventListener('pointerleave', () => {
      toX(0);
      toY(0);
    });
  });
}

export function createMicro() {
  progressLine();
  if (finePointer && !prefersReducedMotion) {
    cursor();
    magnetic();
  }
}

/** Ziyaretçinin yerel saatine göre açılış atmosferi. Adresteki ?mood=studio|golden|midnight önceliklidir. */
export function moodForNow(date = new Date()) {
  const forced = new URLSearchParams(location.search).get('mood');
  if (['studio', 'golden', 'midnight'].includes(forced)) return forced;
  const h = date.getHours();
  if (h >= 17 && h < 20) return 'golden';
  if (h >= 20 || h < 6) return 'midnight';
  return 'studio';
}

