import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { prefersReducedMotion } from '../utils/env.js';

gsap.registerPlugin(ScrollTrigger);

/** Sayfa her açılışta en üstten başlar: tarayıcının scroll hafızası ve adresteki #bölüm yok sayılır. */
function resetToTop() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo(0, 0);
}

resetToTop();
// Bazı tarayıcılar yükleme sonunda yine de eski pozisyona döner; geri sardır.
window.addEventListener('load', () => window.scrollTo(0, 0));
// Sayfadan ayrılırken en üste al: geri/ileri ve yenilemede eski pozisyon kalmasın.
window.addEventListener('pagehide', () => window.scrollTo(0, 0));

/** Lenis + ScrollTrigger entegrasyonu. Reduced motion'da native scroll kullanılır. */
export function createScroll() {
  let lenis = null;
  if (!prefersReducedMotion) {
    lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const scrollTo = (target, immediate = false) => {
    if (lenis) lenis.scrollTo(target, { immediate, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else (typeof target === 'number' ? window.scrollTo(0, target) : target.scrollIntoView());
  };

  // Sayfa içi linkler: adrese # eklemeden yumuşak kaydır
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    scrollTo(el);
  });

  // bfcache'ten (geri tuşu) dönüşte de en üstten başla
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) scrollTo(0, true);
  });

  return {
    lenis,
    scrollTo,
    stop() {
      document.body.classList.add('is-loading');
      lenis?.stop();
    },
    start() {
      window.scrollTo(0, 0);
      lenis?.scrollTo(0, { immediate: true, force: true });
      document.body.classList.remove('is-loading');
      lenis?.start();
      ScrollTrigger.refresh();
    },
  };
}
