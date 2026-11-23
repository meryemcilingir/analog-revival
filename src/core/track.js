import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Sayfa boyunca tek bir kamera izi.
 * Her segment iki durak arasında bir scroll aralığıdır; segmentler arası boşluklar "bekleme"dir.
 * Aralıkların piksel değerlerini ScrollTrigger hesaplar (resize'da otomatik yenilenir),
 * eşleme her frame scroll pozisyonundan yapılır. Hızlı scroll'da veya sayfa ortasında yenilemede
 * yanlış segment kalması bu yüzden mümkün değil.
 */
export function createTrack({ rig, smooth = false }) {
  const segs = [];
  let y = window.scrollY;

  function add({ from, to, trigger, start, endTrigger, end, ease = 'power2.inOut', arc = 0 }) {
    const st = ScrollTrigger.create({ trigger, start, endTrigger: endTrigger ?? trigger, end });
    segs.push({ from, to, st, ease: gsap.parseEase(ease), arc });
  }

  /** Kamera karışımını ayarlar ve "duruştaki" durağın adını döndürür (geçişin ortasındaysa null). */
  function update(dt) {
    const sy = window.scrollY;
    // Lenis yokken (reduced motion) çok hafif sönümleme
    y = smooth ? y + (sy - y) * (1 - Math.exp(-dt * 12)) : sy;

    let from = segs[0].from;
    let to = from;
    let t = 0;
    let p = 0;
    let arc = 0;
    for (const s of segs) {
      if (y < s.st.start) break;
      const len = s.st.end - s.st.start;
      p = len > 0 ? Math.min(1, (y - s.st.start) / len) : 1;
      from = s.from;
      to = s.to;
      t = s.ease(p);
      arc = s.arc;
    }
    rig.blend(from, to, t, arc);
    return p >= 0.92 ? to : p <= 0.08 ? from : null;
  }

  return { add, update };
}
