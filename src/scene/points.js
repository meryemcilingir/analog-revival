/**
 * Detay noktaları — modelin bounding box'ına göre normalize koordinatlar (her eksen -0.5 … 0.5).
 *   x: sol (-) / sağ (+) kulak kabı
 *   y: alt (-) / üst (+)
 *   z: arka (-) / ön (+)
 * İnce ayar için sadece bu değerleri değiştir; kamera durakları ve etiketler buradan beslenir.
 * Kontrol için adrese ?debug ekle: tüm noktalar sürekli görünür.
 */
export const POINTS = {
  band: [0.04, 0.445, 0.05], // kafa bandının alt yüzü (dikişli yastık) — üstteki logo kadraja girmesin
  arm: [-0.43, 0.06, 0.03], // sol metal kol / bağlantı
  pad: [-0.155, -0.29, 0.02], // sol kulak pedinin iç yüzeyi
};
