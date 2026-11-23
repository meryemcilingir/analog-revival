import 'lenis/dist/lenis.css';
import './styles/main.css';

import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { BRAND, MODEL_URL } from './config.js';
import { prefersReducedMotion, isTouch } from './utils/env.js';
import { createScroll } from './core/scroll.js';
import { createTrack } from './core/track.js';
import { createStage, createGround } from './scene/stage.js';
import { createLights, moodLevels } from './scene/lights.js';
import { createPost } from './scene/post.js';
import { createBackdrop } from './scene/backdrop.js';
import { createMicro, moodForNow } from './ui/micro.js';
import { loadModel } from './scene/model.js';
import { createRig } from './scene/rig.js';
import { createHero } from './sections/hero.js';
import { createCraft } from './sections/craft.js';
import { createAnatomy } from './sections/anatomy.js';
import { createMoods } from './sections/moods.js';
import { createFinal } from './sections/final.js';
import { createSound } from './sections/sound.js';
import { createEditorial } from './sections/editorial.js';
import { createAmbient, bindSoundToggle } from './audio/ambient.js';
import { createLoader } from './ui/loader.js';
import { viewport, measureViewport } from './utils/viewport.js';

// Mobilde adres çubuğu açılıp kapanırken ScrollTrigger her seferinde yeniden hesaplamasın
ScrollTrigger.config({ ignoreMobileResize: true });

function applyBrand() {
  document.querySelectorAll('[data-brand]').forEach((el) => (el.textContent = BRAND.name));
  document.querySelectorAll('[data-author]').forEach((el) => (el.textContent = BRAND.author));
  document.title = `${BRAND.name} — ${BRAND.concept}`;
}

async function init() {
  applyBrand();

  const loader = createLoader();
  const scroll = createScroll();
  scroll.stop();

  const canvas = document.getElementById('webgl');
  let stage;
  try {
    stage = createStage(canvas);
  } catch (err) {
    loader.fail('Your browser can’t display 3D content. Try a recent version of Chrome, Safari or Firefox.');
    throw err;
  }
  const { renderer, scene, camera } = stage;

  let model;
  try {
    model = await loadModel(MODEL_URL, { renderer, onProgress: (p) => loader.setProgress(p * 0.85) });
  } catch (err) {
    loader.fail();
    throw err;
  }

  // Model + zemin birlikte hareket eder (intro'daki yükselişte gölge kopmasın)
  const product = new THREE.Group();
  const ground = createGround(model.size);
  product.add(model.object, ground);
  scene.add(product);

  const lights = createLights(scene, model.size);
  const rig = createRig(camera, model);
  const post = createPost(renderer, scene, camera);

  // Modelin duruşu: intro bu değerleri tween'ler; kamera izi rig.turn'ü belirler
  const pose = { lift: 0, introTurn: 0, sway: prefersReducedMotion ? 0 : 1 };

  // ---- Bölümler ----
  const hero = createHero({ scene, lights, pose });
  const craft = createCraft({ scene, model });
  const anatomy = createAnatomy({ camera, model });
  createSound();
  const ambient = createAmbient();
  bindSoundToggle(document.getElementById('sound-toggle'), ambient);
  const moods = createMoods({ scene, renderer, lights, ground, onChange: (name) => ambient.setMood(name) });
  // Açılış atmosferi ziyaretçinin yerel saatine göre (akşam Golden Hour, gece Midnight)
  moods.select(moodForNow(), { instant: true, withIntensity: false, force: true });
  const final = createFinal({ rig });
  createEditorial();
  createMicro();
  let backdrop = null;

  // ---- Kamera izi (sayfa sırasıyla) ----
  const track = createTrack({ rig, smooth: !scroll.lenis });
  track.add({ from: 'hero', to: 'craft', trigger: '#hero', start: 'top top', endTrigger: '#craft', end: 'top top', arc: 0.25 });
  track.add({ from: 'craft', to: 'band', trigger: '#craft', start: 'bottom bottom', endTrigger: '#anatomy', end: 'top top', arc: 0.6 });
  track.add({ from: 'band', to: 'arm', trigger: '#anatomy', start: '15% top', end: '27% top', arc: 0.4 });
  track.add({ from: 'arm', to: 'pad', trigger: '#anatomy', start: '42% top', end: '54% top', arc: 0.4 });
  track.add({ from: 'pad', to: 'sound', trigger: '#anatomy', start: 'bottom bottom', endTrigger: '#sound', end: 'top top', arc: 0.3 });
  track.add({ from: 'sound', to: 'overview', trigger: '#sound', start: 'bottom bottom', endTrigger: '#moods', end: 'top top', arc: 0.2 });
  track.add({ from: 'overview', to: 'final', trigger: '#moods', start: 'bottom bottom', endTrigger: '#final', end: 'top top', arc: 0.15 });

  // ---- Döngü ----
  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;

    const resting = track.update(dt);

    product.position.y = pose.lift;
    model.object.rotation.y = rig.turn + pose.introTurn + Math.sin(t * 0.25) * 0.035 * pose.sway;
    product.updateMatrixWorld();

    final.update(dt, resting);
    craft.update();
    rig.update(dt);
    anatomy.update(resting);
    backdrop?.update();
    post.setFocus(rig.focus);
    post.render(dt);
    if (quality.on) quality.sample(dt);
  }

  // ---- Uyarlamalı kalite ----
  // Ortalama FPS ~45'in altında kalırsa çözünürlük kademeli düşer (en az 1x). Geri yükseltilmez,
  // böylece kalite sürekli inip çıkıp titremez.
  const quality = {
    on: false,
    acc: 0,
    frames: 0,
    sample(dt) {
      if (document.hidden) return;
      this.acc += dt;
      this.frames += 1;
      if (this.acc < 2) return;
      const avg = this.acc / this.frames;
      this.acc = 0;
      this.frames = 0;
      const dpr = renderer.getPixelRatio();
      if (avg > 1 / 45 && dpr > 1) {
        renderer.setPixelRatio(Math.max(1, dpr - 0.25));
        post.setSize(viewport.w, viewport.h);
      }
    },
  };

  // ---- Resize ----
  // Canvas 100lvh: mobilde adres çubuğu yüksekliği değiştirmez; sadece gerçek boyut değişimlerinde çalışır.
  let last = { w: 0, h: 0 };
  function onResize() {
    const { w, h } = measureViewport(canvas);
    if (w === last.w && h === last.h) return;
    last = { w, h };
    post.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    rig.compute();
    final.reset();
    anatomy.resize();
  }
  window.addEventListener('resize', onResize);
  onResize();

  // ---- İmleç paralaksı (sadece mouse) ----
  if (!isTouch && !prefersReducedMotion) {
    window.addEventListener('pointermove', (e) => {
      rig.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    });
  }

  // Arka plan kelimeleri fontlara ihtiyaç duyar
  backdrop = await createBackdrop({ scene, camera, rig, model });

  // Shader'ları önceden derle ve fontları bekle; ilk frame takılmasın
  frame();
  await Promise.all([renderer.compileAsync(scene, camera), document.fonts.ready]);
  loader.setProgress(0.97);
  gsap.ticker.add(frame);

  await loader.finish();
  hero.intro({ levels: moodLevels(moods.current), onScrollReady: () => scroll.start() });
  // Intro ağırlığı geçtikten sonra performansı ölçmeye başla
  gsap.delayedCall(2.5, () => (quality.on = true));
}

init();
