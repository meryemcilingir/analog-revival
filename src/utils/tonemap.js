import * as THREE from 'three';

/**
 * Three.js'in ACESFilmicToneMapping fonksiyonunun JS kopyası (exposure = 1) ve tersi.
 * Post-processing tüm görüntüyü (arka plan dahil) tone map'lediği için, ekranda tam olarak
 * CSS'teki hex rengini görmek üzere sahne arka planını bu fonksiyonun tersinden hesaplarız.
 */

// GLSL mat3 sütunları
const IN = [
  [0.59719, 0.076, 0.0284],
  [0.35458, 0.90834, 0.13383],
  [0.04823, 0.01566, 0.83777],
];
const OUT = [
  [1.60475, -0.10208, -0.00327],
  [-0.53108, 1.10813, -0.07276],
  [-0.07367, -0.00605, 1.07602],
];

const mul = (M, v) => [0, 1, 2].map((r) => M[0][r] * v[0] + M[1][r] * v[1] + M[2][r] * v[2]);
const fit = (v) => v.map((x) => (x * (x + 0.0245786) - 0.000090537) / (x * (0.983729 * x + 0.432951) + 0.238081));

function aces(c) {
  const v = mul(OUT, fit(mul(IN, c.map((x) => x / 0.6))));
  return v.map((x) => Math.min(1, Math.max(0, x)));
}

function solve3(J, b) {
  const det = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(J);
  if (Math.abs(D) < 1e-12) return [0, 0, 0];
  return [0, 1, 2].map((k) => det(J.map((row, r) => row.map((val, c) => (c === k ? b[r] : val)))) / D);
}

/** Ekranda görünecek sRGB hex → tone mapping öncesi doğrusal sahne rengi. */
export function displayToScene(hex) {
  const target = new THREE.Color(hex); // doğrusal (linear-sRGB)
  const t = [target.r, target.g, target.b];
  let x = t.slice();
  for (let i = 0; i < 40; i++) {
    const f = aces(x);
    const err = f.map((v, k) => v - t[k]);
    if (Math.max(...err.map(Math.abs)) < 1e-7) break;
    const h = 1e-5;
    // J[r][c] = d f_r / d x_c
    const J = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let c = 0; c < 3; c++) {
      const xp = x.slice();
      xp[c] += h;
      const fp = aces(xp);
      for (let r = 0; r < 3; r++) J[r][c] = (fp[r] - f[r]) / h;
    }
    const dx = solve3(J, err);
    x = x.map((v, k) => Math.max(0, v - dx[k]));
  }
  return new THREE.Color(x[0], x[1], x[2]);
}
