import * as THREE from 'three';
import { buildShots } from './shots.js';
import { viewport } from '../utils/viewport.js';

const lerp = THREE.MathUtils.lerp;

/**
 * Kamera rig'i: iki durak arasında `t` ile karışım.
 * - Model-space duraklar modelin o anki dünya matrisiyle çözülür.
 * - `arc`: geçişin ortasında kamera hedeften uzaklaşır (geri çekil → yaklaş), içinden geçme olmaz.
 * - Öznenin ekrandaki kayması setViewOffset ile yapılır; hedef nokta kadrajın "merkezi" kalır.
 * - Çok hafif imleç paralaksı.
 */
export function createRig(camera, model) {
  let shots = {};
  const seg = { a: 'hero', b: 'hero', t: 0, arc: 0 };
  const A = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
  const B = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
  const pos = new THREE.Vector3();
  const target = new THREE.Vector3();
  const away = new THREE.Vector3();
  const parallax = new THREE.Vector3();
  const parallaxGoal = new THREE.Vector3();
  const h = model.size.y;
  const sph = new THREE.Spherical();
  const offset = new THREE.Vector3();

  const rig = {
    turn: 0,
    /** Final bölümündeki sürükleme: hedef etrafında açı farkı, `w` ağırlığıyla uygulanır. */
    orbit: { az: 0, pol: 0, w: 0 },
    /** Post-processing odağı ve ekran kayması (backdrop kelimeleri için). */
    focus: { target: new THREE.Vector3(), bokeh: 1, range: 1.5 },
    shift: { x: 0, y: 0 },
    get shots() {
      return shots;
    },

    compute() {
      shots = buildShots(model.size, camera.aspect, camera.fov);
    },

    blend(a, b, t, arc = 0) {
      seg.a = a;
      seg.b = b;
      seg.t = t;
      seg.arc = arc;
      rig.turn = lerp(shots[a].turn, shots[b].turn, t);
    },

    setPointer(nx, ny) {
      parallaxGoal.set(nx * h * 0.05, -ny * h * 0.03, 0);
    },

    /** Modelin matrixWorld'ü bu çağrıdan önce güncel olmalı. */
    update(dt) {
      const sa = shots[seg.a];
      const sb = shots[seg.b];
      resolve(sa, A);
      resolve(sb, B);

      pos.lerpVectors(A.pos, B.pos, seg.t);
      target.lerpVectors(A.target, B.target, seg.t);

      if (seg.arc) {
        away.subVectors(pos, target).normalize();
        pos.addScaledVector(away, Math.sin(Math.PI * seg.t) * seg.arc);
      }

      const orbit = rig.orbit;
      if (orbit.w > 1e-4) {
        offset.subVectors(pos, target);
        sph.setFromVector3(offset);
        sph.theta += orbit.az * orbit.w;
        sph.phi = THREE.MathUtils.clamp(sph.phi + orbit.pol * orbit.w, 0.05, Math.PI - 0.05);
        pos.copy(target).add(offset.setFromSpherical(sph));
      }

      // Paralaks yakın çekimlerde azalır
      const dist = pos.distanceTo(target);
      parallax.lerp(parallaxGoal, 1 - Math.exp(-dt * 2.5));
      camera.position.copy(pos).addScaledVector(parallax, Math.min(1, dist / (h * 3)));
      camera.lookAt(target);

      const sx = lerp(sa.shiftX, sb.shiftX, seg.t);
      const sy = lerp(sa.shiftY, sb.shiftY, seg.t);
      rig.shift.x = sx;
      rig.shift.y = sy;
      rig.focus.target.copy(target);
      rig.focus.bokeh = lerp(sa.bokeh, sb.bokeh, seg.t);
      rig.focus.range = lerp(sa.range, sb.range, seg.t);
      const { w, h: hh } = viewport;
      if (Math.abs(sx) > 1e-4 || Math.abs(sy) > 1e-4) camera.setViewOffset(w, hh, -sx * w, sy * hh, w, hh);
      else if (camera.view?.enabled) camera.clearViewOffset();

      camera.updateMatrixWorld();
    },
  };

  function resolve(shot, out) {
    out.pos.copy(shot.pos);
    out.target.copy(shot.target);
    if (shot.space === 'model') {
      out.pos.applyMatrix4(model.object.matrixWorld);
      out.target.applyMatrix4(model.object.matrixWorld);
    }
  }

  rig.compute();
  return rig;
}
