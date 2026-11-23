import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { POINTS } from '../scene/points.js';
import { boxToLocal } from '../scene/shots.js';
import { prefersReducedMotion } from '../utils/env.js';

/**
 * Craft: kamera sol pede yaklaşırken metin satır satır gelir; bölüm biterken süzülerek kaybolur.
 * Bölüm boyunca dar, sıcak bir ışık deri ve metalin üzerinden süpürülür (scroll'a bağlı).
 */
export function createCraft({ scene, model }) {
  const root = document.getElementById('craft');
  const copy = root.querySelector('.craft__copy');
  const lines = copy.querySelectorAll('.line > span');
  const fades = copy.querySelectorAll('[data-fade]');

  gsap.set(lines, { yPercent: 110 });
  gsap.set(fades, { opacity: 0, y: 16 });

  const reveal = gsap
    .timeline({ paused: true })
    .to(lines, { yPercent: 0, duration: prefersReducedMotion ? 0.3 : 1, ease: 'expo.out', stagger: 0.07 }, 0)
    .to(fades, { opacity: 1, y: 0, duration: prefersReducedMotion ? 0.3 : 0.9, ease: 'expo.out', stagger: 0.06 }, 0.2);

  gsap.timeline({
    scrollTrigger: {
      trigger: root,
      start: 'top 45%',
      onEnter: () => reveal.timeScale(1).play(),
      onLeaveBack: () => reveal.timeScale(1.8).reverse(),
    },
  });

  gsap.fromTo(
    copy,
    { opacity: 1, yPercent: 0 },
    {
      opacity: 0,
      yPercent: -8,
      ease: 'none',
      immediateRender: false,
      scrollTrigger: { trigger: root, start: 'bottom 140%', end: 'bottom bottom', scrub: true },
    },
  );

  // ---- Işık süpürmesi ----
  const sweep = new THREE.SpotLight(0xfff0d8, 0, 0, 0.16, 1, 0);
  scene.add(sweep, sweep.target);

  const pad = boxToLocal(model.size, POINTS.pad);
  const from = pad.clone().add(new THREE.Vector3(-0.15, 0.75, 0.95));
  const to = pad.clone().add(new THREE.Vector3(0.95, -0.15, 0.75));
  const local = new THREE.Vector3();
  const range = ScrollTrigger.create({ trigger: root, start: 'top 20%', end: 'bottom bottom' });
  const PEAK = 5;

  function update() {
    const p = range.progress;
    const on = p > 0 && p < 1;
    sweep.intensity = on ? PEAK * Math.sin(Math.PI * p) ** 1.5 : 0;
    if (!on) return;
    const e = gsap.parseEase('power1.inOut')(p);
    local.lerpVectors(from, to, e);
    sweep.position.copy(local).applyMatrix4(model.object.matrixWorld);
    sweep.target.position.copy(pad).applyMatrix4(model.object.matrixWorld);
    sweep.target.updateMatrixWorld();
  }

  return { update };
}
