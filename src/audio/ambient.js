/**
 * Kodla üretilen ambiyans: teyp gibi hafifçe dalgalanan akor pad'i + plak cızırtısı.
 * Dosya yok, her şey Web Audio ile sentezlenir. Varsayılan kapalı; ilk tıklamada kurulur
 * (tarayıcılar sesi ancak kullanıcı etkileşimiyle başlatır).
 */

/** Atmosfere göre ses karakteri. */
const MOOD_AUDIO = {
  studio: { cutoff: 2600, crackle: 0.035, wet: 0.16, drive: 1.2 },
  golden: { cutoff: 1500, crackle: 0.08, wet: 0.26, drive: 2.6 },
  midnight: { cutoff: 650, crackle: 0.05, wet: 0.5, drive: 1.4 },
};

// Fmaj7 → Em7 → Dm9 → Cmaj7, yumuşak ve dairesel
const CHORDS = [
  [174.61, 220.0, 261.63, 329.63],
  [164.81, 196.0, 246.94, 293.66],
  [146.83, 174.61, 220.0, 329.63],
  [130.81, 164.81, 196.0, 246.94],
];
const BASS = [87.31, 82.41, 73.42, 65.41];
const CHORD_SECONDS = 8;
const LEVEL = 0.5;

function saturationCurve(k) {
  const n = 1024;
  const curve = new Float32Array(n);
  const norm = Math.tanh(k);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = Math.tanh(k * x) / norm;
  }
  return curve;
}

function reverbImpulse(ctx, seconds, decay) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
  }
  return buf;
}

function crackleBuffer(ctx) {
  const sr = ctx.sampleRate;
  const len = sr * 7;
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.005; // hışırtı
  const pops = 7 * 7;
  for (let k = 0; k < pops; k++) {
    const pos = Math.floor(Math.random() * (len - 200));
    const amp = Math.random() ** 3 * 0.45 + 0.03;
    const sign = Math.random() < 0.5 ? -1 : 1;
    const width = 6 + Math.random() * 40;
    for (let j = 0; j < width * 4; j++) d[pos + j] += sign * amp * Math.exp(-j / width) * (0.4 + Math.random() * 0.6);
  }
  return buf;
}

export function createAmbient() {
  let ctx = null;
  let n = null; // düğümler
  let on = false;
  let mood = 'studio';
  let chordIndex = 0;
  let chordTimer = null;
  let suspendTimer = null;

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    comp.connect(master).connect(ctx.destination);

    // Pad zinciri: sesler → lowpass → saturasyon → dry / reverb
    const padBus = ctx.createGain();
    padBus.gain.value = 0.16;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.6;
    const shaper = ctx.createWaveShaper();
    shaper.oversample = '2x';
    const dry = ctx.createGain();
    const wet = ctx.createGain();
    const reverb = ctx.createConvolver();
    reverb.buffer = reverbImpulse(ctx, 3.2, 2.6);
    padBus.connect(filter).connect(shaper);
    shaper.connect(dry).connect(comp);
    shaper.connect(reverb).connect(wet).connect(comp);

    // Filtre yavaşça nefes alır
    const filterLfo = ctx.createOscillator();
    filterLfo.frequency.value = 0.05;
    const filterDepth = ctx.createGain();
    filterDepth.gain.value = 320;
    filterLfo.connect(filterDepth).connect(filter.frequency);
    filterLfo.start(t);

    // Wow & flutter: tüm osilatörlerin perdesi birkaç cent dalgalanır
    const wow = ctx.createOscillator();
    wow.frequency.value = 0.45;
    const wowDepth = ctx.createGain();
    wowDepth.gain.value = 5;
    wow.connect(wowDepth);
    wow.start(t);

    const voices = CHORDS[0].map((f, i) => {
      const g = ctx.createGain();
      g.gain.value = 0.22;
      g.connect(padBus);
      // Her ses kendi hızında hafifçe kabarır
      const swell = ctx.createOscillator();
      swell.frequency.value = 0.06 + i * 0.023;
      const swellDepth = ctx.createGain();
      swellDepth.gain.value = 0.07;
      swell.connect(swellDepth).connect(g.gain);
      swell.start(t);

      const oscs = [
        ['triangle', -5, 1],
        ['sawtooth', 6, 0.28],
      ].map(([type, detune, level]) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.detune.value = detune;
        wowDepth.connect(o.detune);
        const og = ctx.createGain();
        og.gain.value = level;
        o.connect(og).connect(g);
        o.start(t);
        return o;
      });
      return oscs;
    });

    const bass = ctx.createOscillator();
    bass.type = 'sine';
    bass.frequency.value = BASS[0];
    wowDepth.connect(bass.detune);
    const bassGain = ctx.createGain();
    bassGain.gain.value = 0.32;
    bass.connect(bassGain).connect(padBus);
    bass.start(t);

    // Plak cızırtısı (reverb'e girmez)
    const crackle = ctx.createBufferSource();
    crackle.buffer = crackleBuffer(ctx);
    crackle.loop = true;
    const crackleHp = ctx.createBiquadFilter();
    crackleHp.type = 'highpass';
    crackleHp.frequency.value = 900;
    const crackleGain = ctx.createGain();
    crackle.connect(crackleHp).connect(crackleGain).connect(comp);
    crackle.start(t);

    n = { master, filter, shaper, dry, wet, crackleGain, voices, bass, comp };
    applyMood(mood, true);
  }

  function applyMood(name, instant = false) {
    const m = MOOD_AUDIO[name];
    if (!m || !n) return;
    const t = ctx.currentTime;
    const tc = instant ? 0.001 : 0.6;
    n.filter.frequency.setTargetAtTime(m.cutoff, t, tc);
    n.crackleGain.gain.setTargetAtTime(m.crackle, t, tc);
    n.wet.gain.setTargetAtTime(m.wet, t, tc);
    n.dry.gain.setTargetAtTime(1 - m.wet * 0.5, t, tc);
    n.shaper.curve = saturationCurve(m.drive);
  }

  function nextChord() {
    chordIndex = (chordIndex + 1) % CHORDS.length;
    const t = ctx.currentTime;
    CHORDS[chordIndex].forEach((f, i) => n.voices[i].forEach((o) => o.frequency.setTargetAtTime(f, t, 0.9)));
    n.bass.frequency.setTargetAtTime(BASS[chordIndex], t, 0.9);
  }

  /** Atmosfer değişiminde kısa, filtreli bir teyp "nefesi". */
  function whoosh() {
    const t = ctx.currentTime;
    const len = ctx.sampleRate * 1.4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(2800, t + 1.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.35);
    g.gain.linearRampToValueAtTime(0, t + 1.3);
    src.connect(bp).connect(g).connect(n.comp);
    src.start(t);
    src.stop(t + 1.4);
  }

  async function start() {
    if (!ctx) build();
    clearTimeout(suspendTimer);
    await ctx.resume();
    on = true;
    const t = ctx.currentTime;
    n.master.gain.cancelScheduledValues(t);
    n.master.gain.setTargetAtTime(LEVEL, t, 0.8);
    clearInterval(chordTimer);
    chordTimer = setInterval(nextChord, CHORD_SECONDS * 1000);
  }

  function stop() {
    if (!ctx) return;
    on = false;
    const t = ctx.currentTime;
    n.master.gain.cancelScheduledValues(t);
    n.master.gain.setTargetAtTime(0, t, 0.25);
    clearInterval(chordTimer);
    suspendTimer = setTimeout(() => !on && ctx.suspend(), 1500);
  }

  function setMood(name) {
    mood = name;
    if (!ctx) return;
    applyMood(name);
    if (on) whoosh();
  }

  // Sekme arka plandayken sustur
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !on) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  return {
    start,
    stop,
    setMood,
    get on() {
      return on;
    },
  };
}

/** Nav'daki ses düğmesi. */
export function bindSoundToggle(button, ambient) {
  const label = button.querySelector('.sound-toggle__label');
  button.addEventListener('click', async () => {
    const next = !ambient.on;
    button.setAttribute('aria-pressed', String(next));
    button.classList.toggle('is-on', next);
    label.textContent = next ? 'Sound on' : 'Sound off';
    if (next) await ambient.start();
    else ambient.stop();
  });
}
