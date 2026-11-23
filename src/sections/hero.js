import gsap from 'gsap';
import { prefersReducedMotion } from '../utils/env.js';

/**
 * Hero: karanlıktan spot altında beliren kulaklık + başlık reveal.
 * `pose` ana döngüde modele uygulanır (lift = dikey kayma, introTurn = ek y rotasyonu).
 * Kamera hareketi track tarafından yönetilir.
 */
export function createHero({ scene, lights, pose }) {
  const root = document.getElementById('hero');
  const inner = root.querySelector('.hero__inner');
  const eyebrow = root.querySelector('.eyebrow');
  const lines = root.querySelectorAll('.line > span');
  const hint = root.querySelector('.scroll-hint');
  const nav = document.getElementById('nav');

  gsap.set(lines, { yPercent: 110 });
  gsap.set(eyebrow, { opacity: 0, y: 12 });

  /** Loader kapandıktan sonra çağrılır. `onScrollReady` scroll'un açılacağı anı bildirir. */
  function intro({ levels: L, onScrollReady } = {}) {

    if (prefersReducedMotion) {
      return gsap
        .timeline({ onComplete: onScrollReady })
        .to(lights.key, { intensity: L.key, duration: 0.8 }, 0)
        .to(lights.rim, { intensity: L.rim, duration: 0.8 }, 0)
        .to(lights.fill, { intensity: L.fill, duration: 0.8 }, 0)
        .to(scene, { environmentIntensity: L.env, duration: 0.8 }, 0)
        .to([eyebrow, nav, hint], { opacity: 1, y: 0, duration: 0.8 }, 0)
        .set(lines, { yPercent: 0 }, 0);
    }

    return gsap
      .timeline()
      // Işık karanlıktan açılır
      .to(lights.key, { intensity: L.key, duration: 1.8, ease: 'power2.inOut' }, 0)
      .to(scene, { environmentIntensity: L.env, duration: 2, ease: 'power2.inOut' }, 0.2)
      .to(lights.fill, { intensity: L.fill, duration: 1.6, ease: 'power2.inOut' }, 0.3)
      .to(lights.rim, { intensity: L.rim, duration: 1.4, ease: 'power2.inOut' }, 0.5)
      // Kulaklık hafifçe yükselir ve ışığa döner
      .fromTo(pose, { lift: -0.18, introTurn: -0.45 }, { lift: 0, introTurn: 0, duration: 2.6, ease: 'expo.out' }, 0)
      // Tipografi
      .to(eyebrow, { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, 0.45)
      .to(lines, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1 }, 0.55)
      .add(() => onScrollReady?.(), 0.8)
      .to(nav, { opacity: 1, duration: 0.8, ease: 'power2.inOut' }, 1)
      .to(hint, { opacity: 1, duration: 0.8, ease: 'power2.inOut' }, 1.3);
  }

  // Scroll'da metin yukarı süzülerek kaybolur
  gsap.to(inner, {
    yPercent: -14,
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: root, start: 'top top', end: '55% top', scrub: true },
  });

  gsap.to(hint, {
    autoAlpha: 0,
    ease: 'none',
    immediateRender: false,
    scrollTrigger: { trigger: root, start: 'top top', end: '15% top', scrub: true },
  });

  return { intro };
}
