import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Kenarda bölüm göstergesi (masaüstü). Dev arka plan kelimeleri scene/backdrop.js'te. */
export function createEditorial() {
  const nav = document.querySelector('.chapters');
  const links = [...nav.querySelectorAll('[data-chapter]')];

  ScrollTrigger.create({
    trigger: '#craft',
    start: 'top 60%',
    endTrigger: '#final',
    end: 'bottom bottom',
    toggleClass: { targets: nav, className: 'is-visible' },
  });

  links.forEach((link) => {
    ScrollTrigger.create({
      trigger: `#${link.dataset.chapter}`,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => {
        if (!self.isActive) return;
        links.forEach((l) => {
          const on = l === link;
          l.classList.toggle('is-active', on);
          if (on) l.setAttribute('aria-current', 'step');
          else l.removeAttribute('aria-current');
        });
      },
    });
  });
}
