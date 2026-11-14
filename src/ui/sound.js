/* Suara lembut yang disintesis dengan Web Audio (tanpa file audio, tetap offline).
   Hanya dibunyikan sebagai umpan balik hasil, bukan musik latar (D3). */

let ctx = null;
function audio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(c, freq, start, dur, gain, type = 'sine') {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination); o.start(start); o.stop(start + dur + 0.02);
}

function noise(c, start, dur, gain, freq) {
  const len = Math.ceil(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len); // derau dekoratif, bukan peluang
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8; g.gain.value = gain;
  s.connect(f).connect(g).connect(c.destination); s.start(start);
}

export function playResult(kind) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  switch (kind) {
    case 'coin': tone(c, 2093, t, 0.35, 0.06); tone(c, 3136, t + 0.02, 0.25, 0.03); break;   // "cling"
    case 'cap': tone(c, 1568, t, 0.18, 0.05, 'triangle'); break;
    case 'dice': noise(c, t, 0.06, 0.25, 900); noise(c, t + 0.09, 0.05, 0.15, 1100); break;    // "tok-tok"
    case 'cards': case 'coupon': noise(c, t, 0.14, 0.18, 3000); break;                        // "sret"
    case 'spinner': tone(c, 880, t, 0.12, 0.05, 'triangle'); tone(c, 1320, t + 0.1, 0.18, 0.04, 'triangle'); break;
    case 'bag': tone(c, 523, t, 0.15, 0.06, 'triangle'); tone(c, 659, t + 0.08, 0.2, 0.05, 'triangle'); break;
  }
}

export function vibrate(ms = 12) {
  try { navigator.vibrate?.(ms); } catch { /* opsional */ }
}
