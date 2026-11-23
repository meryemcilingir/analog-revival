import * as THREE from 'three';
import { POINTS } from './points.js';

/** Verilen yükseklik/genişlikteki bir şeyi kadraja sığdırmak için gereken kamera mesafesi. */
export function fitDistance(height, width, aspect, fovDeg) {
  const v = THREE.MathUtils.degToRad(fovDeg);
  const hFov = 2 * Math.atan(Math.tan(v / 2) * aspect);
  return Math.max(height / 2 / Math.tan(v / 2), width / 2 / Math.tan(hFov / 2));
}

/** Normalize box koordinatı → model-local sahne koordinatı */
export const boxToLocal = (size, [x, y, z]) => new THREE.Vector3(x * size.x, y * size.y, z * size.z);

/**
 * Kamera durağı:
 *   space  'world' | 'model' — model-space duraklar model dönse de kadrajı korur
 *   pos, target
 *   turn   modelin y rotasyonu (ışıkla ilişkisini belirler)
 *   shiftX / shiftY  öznenin ekrandaki kayması (ekran oranı; +x sağa, +y yukarı)
 */
function closeShot(size, point, dir, dist, portrait, extra = {}) {
  const target = boxToLocal(size, point);
  const pos = target.clone().add(new THREE.Vector3(...dir).normalize().multiplyScalar(dist * (portrait ? 1.25 : 1)));
  return { space: 'model', pos, target, turn: 0, shiftX: 0, shiftY: 0, bokeh: 3, range: 0.35, ...extra };
}

/** Tüm duraklar; her resize'da model boyutu ve ekran oranına göre yeniden hesaplanır. */
export function buildShots(size, aspect, fov) {
  const portrait = aspect < 0.85;
  const tanV = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  const shots = {};

  // 1. Hero — masaüstünde model sağda, dikey ekranda üstte
  {
    let d, target;
    if (portrait) {
      d = fitDistance(size.y * 1.9, size.x * 1.35, aspect, fov);
      target = new THREE.Vector3(0, -2 * d * tanV * 0.12, 0);
    } else {
      d = fitDistance(size.y * 1.6, (size.x * 1.4) / 0.5, aspect, fov);
      target = new THREE.Vector3(-2 * d * tanV * aspect * 0.19, -size.y * 0.03, 0);
    }
    shots.hero = {
      space: 'world',
      pos: new THREE.Vector3(target.x, target.y + size.y * 0.26, d),
      target,
      turn: -0.55,
      shiftX: 0,
      shiftY: 0,
      bokeh: 1,
      range: 1.6,
    };
  }

  // 2. Craft — sol pedin içine, önden-sağdan sıyırarak bakış (deri + metal halka). Metin solda.
  shots.craft = closeShot(size, POINTS.pad, [0.55, 0.2, 0.85], 1.0, portrait, {
    turn: -0.15,
    shiftX: portrait ? 0 : 0.2,
    shiftY: portrait ? 0.17 : 0,
    bokeh: 4,
    range: 0.28,
  });

  // 3. Anatomy durakları
  const anatomyShift = { shiftY: portrait ? 0.15 : 0 };
  // Bant alttan-önden: üst yüzeydeki baskı/logo görünmez, dikişli iç yastık görünür
  shots.band = closeShot(size, POINTS.band, [0.15, -0.55, 0.82], 1.0, portrait, { turn: 0, ...anatomyShift });
  shots.arm = closeShot(size, POINTS.arm, [0.4, 0.15, 0.9], 0.95, portrait, { turn: 0.05, ...anatomyShift });
  shots.pad = closeShot(size, POINTS.pad, [0.65, -0.08, 0.78], 1.3, portrait, { turn: -0.1, bokeh: 2.5, range: 0.45, ...anatomyShift });

  // 4. Sound — model önden ve biraz uzakta; masaüstünde sağda, mobilde üstte küçük
  {
    const d = portrait
      ? fitDistance(size.y * 3.4, size.x * 2.2, aspect, fov)
      : fitDistance(size.y * 2.3, (size.x * 1.6) / 0.45, aspect, fov);
    const target = new THREE.Vector3(0, -size.y * 0.02, 0);
    shots.sound = {
      space: 'world',
      pos: new THREE.Vector3(0, target.y + size.y * 0.12, d),
      target,
      turn: 0,
      shiftX: portrait ? 0 : 0.25,
      shiftY: portrait ? 0.3 : 0,
      bokeh: 0.8,
      range: 1.6,
    };
  }

  // 5. Genel görünüm — kulaklığın tamamı ortada (Moods bunun üzerine kurulacak)
  {
    const d = fitDistance(size.y * 1.75, size.x * 1.5, aspect, fov);
    const target = new THREE.Vector3(0, -size.y * 0.02, 0);
    shots.overview = {
      space: 'world',
      pos: new THREE.Vector3(0, target.y + size.y * 0.22, d),
      target,
      turn: -0.35,
      shiftX: 0,
      shiftY: portrait ? 0.06 : 0,
      bokeh: 0.6,
      range: 1.8,
    };
  }

  // 6. Final — ortada, biraz daha küçük; altta fiyat ve buton için yer kalsın
  {
    const d = fitDistance(size.y * 2.2, size.x * 1.7, aspect, fov);
    const target = new THREE.Vector3(0, -size.y * 0.02, 0);
    shots.final = {
      space: 'world',
      pos: new THREE.Vector3(0, target.y + size.y * 0.2, d),
      target,
      turn: -0.35,
      shiftX: 0,
      shiftY: portrait ? 0.05 : 0.03,
      bokeh: 0.6,
      range: 1.8,
    };
  }

  return shots;
}
