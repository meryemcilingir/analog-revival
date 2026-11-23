import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  DepthOfFieldEffect,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing';
import { isMobile } from '../utils/env.js';

/**
 * Sinematik görüntü:
 *  - Alan derinliği: odak her zaman kameranın baktığı noktada; bulanıklık miktarı kadraja göre
 *    (yakın çekimde belirgin, geniş planda neredeyse yok). Mobilde kapalı.
 *  - Bloom: sadece metal parlamaları gibi en parlak noktalar hafifçe taşar.
 *  - ACES tone mapping en sonda (bloom HDR değerlerle çalışsın diye).
 */
export function createPost(renderer, scene, camera) {
  const mobile = isMobile();
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1;

  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
    multisampling: mobile ? 2 : 4,
  });
  composer.addPass(new RenderPass(scene, camera));

  const dof = mobile
    ? null
    : new DepthOfFieldEffect(camera, { focusDistance: 3, focusRange: 1, bokehScale: 0, resolutionScale: 0.5 });
  const focus = new THREE.Vector3();
  if (dof) {
    dof.target = focus;
    composer.addPass(new EffectPass(camera, dof));
  }

  const bloom = new BloomEffect({
    mipmapBlur: true,
    luminanceThreshold: 0.92,
    luminanceSmoothing: 0.2,
    intensity: mobile ? 0.35 : 0.5,
    radius: 0.6,
  });
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
  composer.addPass(new EffectPass(camera, bloom, tone));

  return {
    composer,
    /** rig.focus: { target, bokeh, range } */
    setFocus({ target, bokeh, range }) {
      if (!dof) return;
      focus.copy(target);
      dof.bokehScale = bokeh;
      dof.cocMaterial.focusRange = range;
    },
    setSize(w, h) {
      composer.setSize(w, h, false);
    },
    render(dt) {
      composer.render(dt);
    },
  };
}
