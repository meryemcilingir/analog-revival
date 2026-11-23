/**
 * Canvas'ın gerçek boyutu. Canvas 100lvh yüksekliğinde olduğu için mobilde adres çubuğu
 * açılıp kapanınca değişmez; projeksiyon ve view offset hesapları buradan okur.
 */
export const viewport = { w: window.innerWidth, h: window.innerHeight };

export function measureViewport(canvas) {
  viewport.w = canvas.clientWidth || window.innerWidth;
  viewport.h = canvas.clientHeight || window.innerHeight;
  return viewport;
}
