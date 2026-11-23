import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { POINTS } from '../scene/points.js';
import { boxToLocal } from '../scene/shots.js';
import { createHotspots } from '../ui/hotspots.js';

/** Etiket içerikleri ve masaüstündeki yerleşimleri (px, noktaya göre). Mobilde etiket alttaki karta geçer. */
export const STOPS = [
  {
    id: 'band',
    index: '01',
    title: 'Hand-stitched headband',
    body: 'Full-grain leather over a spring-steel core, stitched by hand at nine stitches per inch.',
    offset: { x: 180, y: -90 },
  },
  {
    id: 'arm',
    index: '02',
    title: 'Machined yoke',
    body: 'Solid aluminium arms with a friction-fit slider. Twelve detents, no plastic anywhere.',
    offset: { x: 190, y: 70 },
  },
  {
    id: 'pad',
    index: '03',
    title: 'Memory-foam ear pads',
    body: 'Soft lambskin over slow-rebound foam, shaped to seal out the room without pressure.',
    offset: { x: 200, y: -40 },
  },
];

/** Anatomy: başlık + adım göstergesi + 3D'ye bağlı etiketler. */
export function createAnatomy({ camera, model }) {
  const root = document.getElementById('anatomy');
  const head = root.querySelector('.anatomy__head');
  const steps = root.querySelectorAll('.stepper__item');

  const hotspots = createHotspots({
    camera,
    model,
    items: STOPS.map((s) => ({ ...s, point: boxToLocal(model.size, POINTS[s.id]) })),
  });

  // Etiketler sadece bölüm sabitken görünür
  const range = ScrollTrigger.create({ trigger: root, start: 'top 20%', end: 'bottom bottom' });

  gsap.set(head, { opacity: 0, y: 16 });
  ScrollTrigger.create({
    trigger: root,
    start: 'top 40%',
    onEnter: () => gsap.to(head, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', overwrite: true }),
    onLeaveBack: () => gsap.to(head, { opacity: 0, y: 16, duration: 0.4, ease: 'power2.in', overwrite: true }),
  });
  gsap.fromTo(
    head,
    { autoAlpha: 1 },
    {
      autoAlpha: 0,
      ease: 'none',
      immediateRender: false,
      scrollTrigger: { trigger: root, start: 'bottom 130%', end: 'bottom bottom', scrub: true },
    },
  );

  let current = null;
  function update(activeShot) {
    const id = range.isActive && STOPS.some((s) => s.id === activeShot) ? activeShot : null;
    hotspots.update(id);
    if (id !== current) {
      current = id;
      steps.forEach((el) => el.classList.toggle('is-active', el.dataset.stop === id));
    }
  }

  return { update, resize: hotspots.resize };
}
