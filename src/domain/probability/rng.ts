// Keacakan kriptografis tanpa bias modulo (agents.md aturan 10)
const buf = new Uint32Array(1);

function next(): number {
  globalThis.crypto.getRandomValues(buf);
  return buf[0];
}

export function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0 || !Number.isInteger(maxExclusive)) throw new Error('maxExclusive harus bilangan bulat positif');
  const limit = Math.floor(4294967296 / maxExclusive) * maxExclusive;
  let x = next();
  while (x >= limit) x = next();
  return x % maxExclusive;
}

export function randomFloat(): number {
  return next() / 4294967296;
}

/** Acak urutan (Fisher–Yates) */
export function shuffled<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Noise dekoratif dengan seed (posisi rumput, tekstur) — BUKAN untuk peluang */
export function seeded(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
