import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { prefersReducedMotion, isTouch } from '../utils/env.js';

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Final: kulaklık ortada yavaşça döner, sürükleyerek döndürülebilir.
 * OrbitControls görünmez bir yardımcı kamerayı yönetir; asıl kamera bu yardımcının
 * açı farkını (azimut / polar) rig üzerinden final kadrajına uygular. Bölümden çıkınca fark
 * yumuşakça sıfırlanır — kamera modelin içinden değil, etrafından dolanarak döner.
 */
export function createFinal({ rig }) {
  const root = document.getElementById('final');
  const stage = root.querySelector('.final__stage');
  const head = root.querySelector('.final__head');
  const buy = root.querySelector('.final__buy');
  const hint = root.querySelector('.final__hint');
  const button = document.getElementById('preorder');
  const note = document.getElementById('preorder-note');

  if (isTouch) hint.childNodes[1].textContent = 'Swipe to rotate';

  const helper = new THREE.PerspectiveCamera();
  const controls = new OrbitControls(helper, stage);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.rotateSpeed = isTouch ? 0.9 : 0.6;
  controls.autoRotateSpeed = 1.6;
  controls.enabled = false;
  // Mobilde dikey kaydırma sayfaya kalsın, yatay sürükleme döndürsün
  stage.style.touchAction = 'pan-y';

  let baseAz = 0;
  let basePol = 0;
  let engaged = false;
  let dirty = false;
  let weight = 0;

  function reset() {
    const shot = rig.shots.final;
    helper.position.copy(shot.pos);
    controls.target.copy(shot.target);
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.update();
    baseAz = controls.getAzimuthalAngle();
    basePol = controls.getPolarAngle();
    // Sınırlı dikey açı: biraz yukarıdan bakılabilir, zeminin altına inilemez
    controls.minPolarAngle = basePol - 0.4;
    controls.maxPolarAngle = Math.min(basePol + 0.12, Math.PI / 2 - 0.04);
    dirty = false;
  }

  controls.addEventListener('start', () => {
    dirty = true;
    stage.classList.add('is-dragging');
    gsap.to(hint, { autoAlpha: 0, duration: 0.4, overwrite: true });
  });
  controls.addEventListener('end', () => stage.classList.remove('is-dragging'));

  const range = ScrollTrigger.create({ trigger: root, start: 'top top', end: 'bottom bottom' });

  function update(dt, resting) {
    const want = range.isActive && resting === 'final';
    if (want !== engaged) {
      engaged = want;
      controls.enabled = want;
      controls.autoRotate = want && !prefersReducedMotion;
      stage.classList.toggle('is-live', want);
      if (want) dirty = true;
    }

    weight += ((want ? 1 : 0) - weight) * (1 - Math.exp(-dt * 3.5));

    if (engaged) controls.update(dt);
    else if (weight < 0.002) {
      weight = 0;
      if (dirty) reset();
    }

    rig.orbit.az = wrapAngle(controls.getAzimuthalAngle() - baseAz);
    rig.orbit.pol = controls.getPolarAngle() - basePol;
    rig.orbit.w = weight;
  }

  // ---- UI ----
  gsap.set([head, buy, hint], { autoAlpha: 0, y: 16 });
  ScrollTrigger.create({
    trigger: root,
    start: 'top 35%',
    onEnter: () =>
      gsap.to([head, buy, hint], { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.1, overwrite: true }),
    onLeaveBack: () => gsap.to([head, buy, hint], { autoAlpha: 0, y: 16, duration: 0.4, ease: 'power2.in', overwrite: true }),
  });

  button.addEventListener('click', () => {
    if (!note.hidden) return;
    note.hidden = false;
    gsap.fromTo(note, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'expo.out' });
  });

  return { update, reset };
}
