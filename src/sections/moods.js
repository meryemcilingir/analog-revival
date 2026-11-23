import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MOODS, moodLevels } from '../scene/lights.js';
import { displayToScene } from '../utils/tonemap.js';
import { prefersReducedMotion } from '../utils/env.js';

const tmp = new THREE.Color();

function tweenColor(color, hex, vars) {
  tmp.set(hex);
  return gsap.to(color, { r: tmp.r, g: tmp.g, b: tmp.b, ...vars });
}

/**
 * Moods: arka plan, zemin, ışıklar (renk / yoğunluk / yön), spot açısı, environment ve pozlama
 * tek bir yumuşak geçişle değişir. Modelin materyaline dokunulmaz.
 */
export function createMoods({ scene, renderer, lights, ground, onChange }) {
  const root = document.getElementById('moods');
  const head = root.querySelector('.moods__head');
  const picker = root.querySelector('.moods__picker');
  const caption = root.querySelector('.moods__caption');
  const buttons = [...root.querySelectorAll('[data-mood]')];
  const { h } = lights;
  let current = 'studio';

  /** `withIntensity: false` → sadece renk/konum/arka plan (hero intro yoğunlukları kendisi açar). */
  function apply(name, { instant = false, withIntensity = true } = {}) {
    const m = MOODS[name];
    const L = moodLevels(name);
    const vars = { duration: instant ? 0 : prefersReducedMotion ? 0.3 : 1.4, ease: 'power2.inOut', overwrite: 'auto' };

    const bg = displayToScene(m.bg);
    gsap.to(scene.background, { r: bg.r, g: bg.g, b: bg.b, ...vars });
    tweenColor(ground.material.color, m.bg, vars);
    gsap.to(document.documentElement, { '--bg': m.bg, ...vars });
    if (withIntensity) gsap.to(scene, { environmentIntensity: L.env, ...vars });

    for (const id of ['key', 'rim', 'fill']) {
      const light = lights[id];
      const cfg = m[id];
      tweenColor(light.color, cfg.color, vars);
      if (withIntensity) gsap.to(light, { intensity: L[id], ...vars });
      const [x, y, z] = cfg.pos;
      gsap.to(light.position, { x: x * h, y: y * h, z: z * h, ...vars });
    }
    gsap.to(lights.key, { angle: m.key.angle, ...vars });

    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', m.bg);
  }

  function select(name, opts = {}) {
    if (!MOODS[name] || (name === current && !opts.force)) return;
    current = name;
    apply(name, opts);
    onChange?.(name);

    buttons.forEach((b) => {
      const on = b.dataset.mood === name;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });

    if (opts.instant) {
      caption.textContent = MOODS[name].caption;
      return;
    }
    gsap
      .timeline({ overwrite: true })
      .to(caption, { opacity: 0, y: -6, duration: 0.2, ease: 'power2.in' })
      .add(() => (caption.textContent = MOODS[name].caption))
      .to(caption, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' });
  }

  buttons.forEach((b) => b.addEventListener('click', () => select(b.dataset.mood)));

  // Giriş / çıkış
  gsap.set([head, picker], { autoAlpha: 0, y: 16 });
  ScrollTrigger.create({
    trigger: root,
    start: 'top 35%',
    onEnter: () =>
      gsap.to([head, picker], { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.1, overwrite: true }),
    onLeaveBack: () => gsap.to([head, picker], { autoAlpha: 0, y: 16, duration: 0.4, ease: 'power2.in', overwrite: true }),
  });
  gsap.fromTo(
    root.querySelector('.moods__sticky'),
    { opacity: 1 },
    {
      opacity: 0,
      ease: 'none',
      immediateRender: false,
      scrollTrigger: { trigger: root, start: 'bottom 130%', end: 'bottom bottom', scrub: true },
    },
  );

  return { select, get current() { return current; } };
}
