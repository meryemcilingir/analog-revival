import * as THREE from 'three';
import { isMobile } from '../utils/env.js';

/**
 * Atmosferler. Konumlar model yüksekliği (h) cinsinden; model merkezi orijinde, zemin y = -0.5h.
 *   bg        arka plan + zemin rengi
 *   exposure  tone mapping pozlaması
 *   env       environment map yoğunluğu
 *   key       spot (gölge burada) — angle: koni açısı (radyan)
 *   rim       arkadan kontur ışığı
 *   fill      önden çok düşük dolgu
 */
export const MOODS = {
  studio: {
    label: 'Studio',
    caption: 'Neutral and exact — the room it was voiced in.',
    bg: '#1a1b1e',
    exposure: 1,
    env: 0.32,
    key: { color: '#ffffff', intensity: 3.4, pos: [0.25, 2.8, 0.9], angle: 0.38 },
    rim: { color: '#e4ecff', intensity: 2.8, pos: [-1.8, 1.2, -2.2] },
    fill: { color: '#ffffff', intensity: 0.35, pos: [1.5, 0.2, 2] },
  },
  golden: {
    label: 'Golden Hour',
    caption: 'Low sun through the control-room glass.',
    bg: '#2a1b10',
    exposure: 1.05,
    env: 0.18,
    key: { color: '#ffa95c', intensity: 4.4, pos: [2.4, 0.45, 0.9], angle: 0.55 },
    rim: { color: '#ff8a3d', intensity: 2.2, pos: [-2.0, 0.9, -1.6] },
    fill: { color: '#7d8fb3', intensity: 0.16, pos: [-1.5, 0.6, 2] },
  },
  midnight: {
    label: 'Midnight',
    caption: 'After hours. Just you and the record.',
    bg: '#0b0f1d',
    exposure: 0.95,
    env: 0.07,
    key: { color: '#a9bcff', intensity: 1.2, pos: [0.4, 2.6, 1.2], angle: 0.42 },
    rim: { color: '#4a82ff', intensity: 4.2, pos: [-1.6, 1.4, -2.4] },
    fill: { color: '#2b3d75', intensity: 0.12, pos: [1.5, 0.2, 2] },
  },
};

/**
 * Bir atmosferin efektif ışık seviyeleri. Pozlama, ışık ve environment yoğunluklarına katlanır
 * (tone mapping post-processing'de yapıldığı için; arka plan pozlamadan etkilenmez).
 */
export function moodLevels(name) {
  const m = MOODS[name];
  return {
    key: m.key.intensity * m.exposure,
    rim: m.rim.intensity * m.exposure,
    fill: m.fill.intensity * m.exposure,
    env: m.env * m.exposure,
  };
}

/**
 * Key: yukarıdan gelen spot (gölge burada).
 * Rim: arkadan, konturu ayıran ince ışık.
 * Fill: önden çok düşük dolgu, gölgedeki detay kaybolmasın diye.
 * Studio renk/konumlarıyla, 0 yoğunlukla başlar; hero intro'su açar.
 */
export function createLights(scene, modelSize) {
  const h = modelSize.y;
  const s = MOODS.studio;

  const key = new THREE.SpotLight(s.key.color, 0, 0, s.key.angle, 0.9, 0);
  key.position.fromArray(s.key.pos).multiplyScalar(h);
  key.target.position.set(0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(isMobile() ? 1024 : 2048);
  key.shadow.camera.near = h * 0.3;
  key.shadow.camera.far = h * 6;
  key.shadow.radius = 12;
  key.shadow.blurSamples = isMobile() ? 8 : 20;
  key.shadow.bias = -0.0004;

  const rim = new THREE.DirectionalLight(s.rim.color, 0);
  rim.position.fromArray(s.rim.pos).multiplyScalar(h);

  const fill = new THREE.DirectionalLight(s.fill.color, 0);
  fill.position.fromArray(s.fill.pos).multiplyScalar(h);

  scene.add(key, key.target, rim, fill);
  return { key, rim, fill, h };
}
