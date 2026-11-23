import * as THREE from 'three';
import gsap from 'gsap';
import { prefersReducedMotion } from '../utils/env.js';
import { viewport } from '../utils/viewport.js';

const DEBUG = new URLSearchParams(location.search).has('debug');

/**
 * 3D noktalara bağlı HTML etiketleri.
 * items: [{ id, point: Vector3 (model-local), index, title, body, offset: {x, y}, offsetMobile: {x, y} }]
 * Etiket, noktadan `offset` kadar uzağa konur ve ince bir çizgiyle bağlanır; ekrandan taşmayacak şekilde kırpılır.
 */
export function createHotspots({ camera, model, items }) {
  const layer = document.getElementById('hotspots');
  const v = new THREE.Vector3();
  /** Mobilde etiket kartının alt kenarı ile ekran altı arası (adım göstergesine yer). */
  const MOBILE_BOTTOM = 88;

  const spots = items.map((item) => {
    const el = document.createElement('div');
    el.className = 'hotspot';
    el.innerHTML = `
      <span class="hotspot__line"></span>
      <span class="hotspot__dot"></span>
      <div class="hotspot__label">
        <span class="hotspot__index">${item.index}</span>
        <h3 class="hotspot__title">${item.title}</h3>
        <p class="hotspot__body">${item.body}</p>
      </div>
      ${DEBUG ? `<span class="hotspot__debug">${item.id}</span>` : ''}`;
    layer.appendChild(el);

    const spot = {
      ...item,
      el,
      dot: el.querySelector('.hotspot__dot'),
      line: el.querySelector('.hotspot__line'),
      label: el.querySelector('.hotspot__label'),
      shown: false,
      tl: null,
    };
    gsap.set(spot.dot, { scale: 0 });
    gsap.set(spot.line, { scaleX: 0 });
    gsap.set(spot.label, { autoAlpha: 0 });
    if (DEBUG) gsap.set(spot.dot, { scale: 1 });
    return spot;
  });

  function layout(spot, x, y) {
    const { w: vw, h: vh } = viewport;
    const mobile = vw < 768;
    if (spot.mobile !== mobile) {
      spot.mobile = mobile;
      spot.box = null;
      spot.label.classList.toggle('is-card', mobile);
    }
    if (!spot.box) spot.box = { w: spot.label.offsetWidth, h: spot.label.offsetHeight };
    const { w: lw, h: lh } = spot.box;

    // Mobil: etiket ekranın altına sabit bir kart; çizgi noktadan kartın üst kenarına iner
    if (mobile) {
      const cardTop = vh - MOBILE_BOTTOM - lh;
      const tx = Math.min(Math.max(x, 40), vw - 40);
      const dx = tx - x;
      const dy = cardTop - 10 - y;
      spot.line.style.width = `${Math.max(0, Math.hypot(dx, dy))}px`;
      spot.line.style.rotate = `${Math.atan2(dy, dx)}rad`;
      spot.label.style.translate = `${16 - x}px ${cardTop - y}px`;
      return;
    }

    const off = spot.offset;
    const pad = 16;
    const right = off.x >= 0;

    // Etiketin bağlandığı uç noktası, ekran içinde kalacak şekilde
    let ax = x + off.x;
    let ay = y + off.y;
    // Geniş ekranda sağ kenardaki bölüm göstergesine yer bırak
    const rightPad = vw >= 1024 ? 170 : pad;
    ax = right ? Math.min(ax, vw - rightPad - lw) : Math.max(ax, pad + lw);
    ay = Math.min(Math.max(ay, pad + 72 + lh / 2), vh - pad - lh / 2);
    const dx = ax - x;
    const dy = ay - y;

    spot.line.style.width = `${Math.hypot(dx, dy)}px`;
    spot.line.style.rotate = `${Math.atan2(dy, dx)}rad`;
    spot.label.style.translate = `${right ? dx + 12 : dx - lw - 12}px ${dy - lh / 2}px`;
    spot.label.classList.toggle('is-left', !right);
  }

  function show(spot) {
    spot.shown = true;
    spot.tl?.kill();
    const fast = prefersReducedMotion;
    spot.tl = gsap
      .timeline()
      .to(spot.dot, { scale: 1, duration: fast ? 0.2 : 0.45, ease: 'expo.out' }, 0)
      .to(spot.line, { scaleX: 1, duration: fast ? 0.2 : 0.5, ease: 'power2.inOut' }, fast ? 0 : 0.08)
      .fromTo(
        spot.label,
        { autoAlpha: 0, y: fast ? 0 : 10 },
        { autoAlpha: 1, y: 0, duration: fast ? 0.2 : 0.6, ease: 'expo.out' },
        fast ? 0 : 0.3,
      );
  }

  function hide(spot) {
    spot.shown = false;
    spot.tl?.kill();
    spot.tl = gsap
      .timeline()
      .to(spot.label, { autoAlpha: 0, duration: 0.2, ease: 'power2.in' }, 0)
      .to(spot.line, { scaleX: 0, duration: 0.3, ease: 'power2.inOut' }, 0.03)
      .to(spot.dot, { scale: DEBUG ? 1 : 0, duration: 0.25, ease: 'power2.in' }, 0.1);
  }

  /** Her frame, rig.update'ten sonra çağrılır. */
  function update(activeId) {
    for (const spot of spots) {
      const active = spot.id === activeId;
      if (active && !spot.shown) show(spot);
      else if (!active && spot.shown) hide(spot);

      if (!spot.shown && !DEBUG && !spot.tl?.isActive()) {
        spot.el.style.visibility = 'hidden';
        continue;
      }

      v.copy(spot.point).applyMatrix4(model.object.matrixWorld).project(camera);
      const behind = v.z > 1;
      const x = (v.x * 0.5 + 0.5) * viewport.w;
      const y = (-v.y * 0.5 + 0.5) * viewport.h;
      spot.el.style.visibility = behind ? 'hidden' : 'visible';
      spot.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      layout(spot, x, y);
    }
  }

  /** Viewport değişince etiket ölçüleri yeniden alınır. */
  function resize() {
    spots.forEach((s) => (s.box = null));
  }

  return { update, resize };
}
