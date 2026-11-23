import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../utils/env.js';
import { viewport } from '../utils/viewport.js';

/**
 * Modelin arkasındaki dev konturlu kelimeler — 3D sahnede, kameraya bağlı düzlemler.
 * Modelin her zaman arkasında durur ve alan derinliğiyle birlikte bulanıklaşır.
 * Ekrandaki yerleşim CSS gibi tanımlanır: yazı boyu ekran genişliğinin %34'ü (mobilde %52).
 */
const WORDS = [
  { text: '1974', section: 'craft' },
  { text: 'Analog', section: 'anatomy', italic: true },
  { text: 'Warmth', section: 'sound' },
  { text: 'Revival', section: 'final', italic: true },
];
const FONT_PX = 320;
const OPACITY = 0.1;

function makeTexture(text, italic) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = `${italic ? 'italic ' : ''}400 ${FONT_PX}px "Instrument Serif", Georgia, serif`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width + FONT_PX * 0.2);
  const h = Math.ceil(FONT_PX * 1.05);
  c.width = w;
  c.height = h;
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#ece6d8';
  ctx.strokeText(text, FONT_PX * 0.1, h * 0.54);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, aspect: w / h };
}

export async function createBackdrop({ scene, camera, rig, model }) {
  await Promise.all([
    document.fonts.load(`400 ${FONT_PX}px "Instrument Serif"`),
    document.fonts.load(`italic 400 ${FONT_PX}px "Instrument Serif"`),
  ]).catch(() => {});

  if (!camera.parent) scene.add(camera);
  const tmp = new THREE.Vector3();

  const items = WORDS.map((w) => {
    const { tex, aspect } = makeTexture(w.text, w.italic);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, fog: false }),
    );
    mesh.renderOrder = -1;
    mesh.frustumCulled = false;
    mesh.visible = false;
    camera.add(mesh);

    const state = { opacity: 0, x: 0 };
    const section = document.getElementById(w.section);
    const tl = gsap.timeline({
      scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true },
    });
    if (!prefersReducedMotion) tl.fromTo(state, { x: 0.08 }, { x: -0.42, ease: 'none', duration: 1 }, 0);
    tl.fromTo(state, { opacity: 0 }, { opacity: 1, ease: 'power1.out', duration: 0.18 }, 0.02).to(
      state,
      { opacity: 0, ease: 'power1.in', duration: 0.18 },
      0.8,
    );
    return { mesh, aspect, state };
  });

  /** rig.update'ten sonra her frame. */
  function update() {
    const mobile = viewport.w < 768;
    // Modelin arkasında: kameranın baktığı noktadan model çapı kadar uzakta
    const D = camera.position.distanceTo(tmp.copy(rig.focus.target)) + model.radius * 1.6;
    const vh = 2 * D * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const vw = vh * camera.aspect;
    const fontWorld = (mobile ? 0.52 : 0.34) * vw;
    const height = fontWorld * 1.05;
    const { x: sx, y: sy } = rig.shift;

    for (const it of items) {
      const o = it.state.opacity;
      it.mesh.visible = o > 0.001;
      if (!it.mesh.visible) continue;
      const width = height * it.aspect;
      // Ekran koordinatı (u: soldan, v: üstten) → kamera uzayı; view offset kaymasını telafi eder
      const u = 0.06 + (width / vw) * (0.5 + it.state.x);
      const v = mobile ? 0.3 : 0.47;
      it.mesh.position.set((u - 0.5 - sx) * vw, (0.5 - v - sy) * vh, -D);
      it.mesh.scale.set(width, height, 1);
      it.mesh.material.opacity = OPACITY * o;
    }
  }

  return { update };
}
