import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/** Sahnede modelin yüksekliği bu kadar birim olur; tüm kamera mesafeleri buna göre ölçeklenir. */
const TARGET_HEIGHT = 2;

/**
 * Modeli yükler, bounding box'a göre merkezler ve ölçekler.
 * Dönen `object` hiyerarşisi:  object (animasyon için serbest) → pivot (ölçek) → gltf.scene (merkezlenmiş)
 */
export function loadModel(url, { renderer, onProgress } = {}) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(prepare(gltf.scene, renderer)),
      (e) => {
        if (!onProgress) return;
        // Sunucu content-length vermezse yaklaşık bir ilerleme göster
        onProgress(e.lengthComputable ? e.loaded / e.total : Math.min(0.9, e.loaded / 2.2e6));
      },
      reject,
    );
  });
}

function prepare(root, renderer) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const rawSize = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = TARGET_HEIGHT / rawSize.y;

  root.position.sub(center);

  const pivot = new THREE.Group();
  pivot.scale.setScalar(scale);
  pivot.add(root);

  const object = new THREE.Group();
  object.name = 'headphone';
  object.add(pivot);

  const maxAniso = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = false;
    // Sadece doku filtrelemesi; materyalin rengine/ayarlarına dokunulmuyor.
    const m = child.material;
    for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) {
      if (m[key]) m[key].anisotropy = maxAniso;
    }
  });

  const size = rawSize.clone().multiplyScalar(scale);
  return {
    object,
    size, // ölçeklenmiş boyutlar (y = TARGET_HEIGHT)
    radius: size.length() / 2,
    /** Model-local normalize koordinattan (-0.5..0.5 her eksende) sahne koordinatına. Anatomy noktaları için. */
    pointFromBox: (nx, ny, nz) => new THREE.Vector3(nx * size.x, ny * size.y, nz * size.z),
  };
}
