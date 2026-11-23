import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { COLORS } from '../config.js';
import { isMobile } from '../utils/env.js';
import { measureViewport } from '../utils/viewport.js';
import { displayToScene } from '../utils/tonemap.js';

/** Renderer, sahne, kamera ve environment map. */
export function createStage(canvas) {
  const mobile = isMobile();

  // Kenar yumuşatma post-processing composer'ında (MSAA) yapılır
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
  const { w, h } = measureViewport(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  // Tone mapping sonrası ekranda tam olarak CSS'teki renk görünsün
  scene.background = displayToScene(COLORS.bg);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0; // hero intro'sunda karanlıktan açılır
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, w / h, 0.05, 100);

  return { renderer, scene, camera };
}

/**
 * Modelin altına, kenarlara doğru arka plana eriyen bir zemin.
 * Spot ışığın havuzunu ve yumuşak gölgeyi taşır.
 */
export function createGround(modelSize) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, '#fff');
  g.addColorStop(0.35, '#fff');
  g.addColorStop(1, '#000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const extent = Math.max(modelSize.x, modelSize.z) * 6;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(extent, extent),
    new THREE.MeshStandardMaterial({
      color: COLORS.bg,
      roughness: 0.92,
      metalness: 0,
      alphaMap: new THREE.CanvasTexture(c),
      transparent: true,
      depthWrite: false,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -modelSize.y / 2 - 0.002;
  ground.receiveShadow = true;
  ground.renderOrder = -1;
  return ground;
}
