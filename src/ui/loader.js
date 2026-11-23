import gsap from 'gsap';

/** Yüzde gösteren minimal loader. İlerleme hiçbir zaman geri gitmez ve yumuşakça sayar. */
export function createLoader() {
  const el = document.getElementById('loader');
  const count = document.getElementById('loader-count');
  const bar = document.getElementById('loader-bar');
  const state = { value: 0, goal: 0 };

  const render = () => {
    count.textContent = String(Math.round(state.value * 100));
    bar.style.transform = `scaleX(${state.value})`;
  };

  function setProgress(p) {
    state.goal = Math.max(state.goal, Math.min(1, p));
    gsap.to(state, { value: state.goal, duration: 0.8, ease: 'power2.out', overwrite: true, onUpdate: render });
  }

  function finish() {
    state.goal = 1;
    return new Promise((resolve) => {
      gsap
        .timeline({ onComplete: () => { el.remove(); resolve(); } })
        .to(state, { value: 1, duration: 0.35, ease: 'power2.out', overwrite: true, onUpdate: render })
        .to(el.querySelector('.loader__inner'), { opacity: 0, y: -12, duration: 0.4, ease: 'power2.inOut' }, '+=0.05')
        .to(el, { opacity: 0, duration: 0.5, ease: 'power2.inOut' }, '-=0.2');
    });
  }

  function fail(message) {
    const err = document.getElementById('loader-error');
    if (message) err.textContent = message;
    err.hidden = false;
  }

  return { setProgress, finish, fail };
}
