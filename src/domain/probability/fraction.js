// Pecahan eksak — peluang tidak pernah dihitung dengan float (agents.md aturan 8)

export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function frac(num, den) {
  if (!Number.isInteger(num) || !Number.isInteger(den)) throw new Error('Pembilang dan penyebut harus bilangan bulat');
  if (den === 0) throw new Error('Penyebut tidak boleh 0');
  return den < 0 ? { num: -num, den: -den } : { num, den };
}

export function simplify(f) {
  const g = gcd(f.num, f.den) || 1;
  return { num: f.num / g, den: f.den / g };
}

export const equals = (a, b) => a.num * b.den === b.num * a.den;

export function compare(a, b) {
  const d = a.num * b.den - b.num * a.den;
  return d < 0 ? -1 : d > 0 ? 1 : 0;
}

export const isSimplified = (f) => gcd(f.num, f.den) === 1;
export const isValidProbability = (f) => f.num >= 0 && f.num <= f.den;

/** Desimal dengan koma (0,375) — hanya untuk tampilan */
export function toDecimal(f, digits = 3) {
  return (f.num / f.den).toLocaleString('id-ID', { maximumFractionDigits: digits });
}

export const fracText = (f) => `${f.num}/${f.den}`;
