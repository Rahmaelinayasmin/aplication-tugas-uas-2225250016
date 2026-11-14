// Pecahan eksak — peluang tidak pernah dihitung dengan float (agents.md aturan 8)
export interface Fraction {
  readonly num: number;
  readonly den: number;
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function frac(num: number, den: number): Fraction {
  if (!Number.isInteger(num) || !Number.isInteger(den)) throw new Error('Pembilang dan penyebut harus bilangan bulat');
  if (den === 0) throw new Error('Penyebut tidak boleh 0');
  return den < 0 ? { num: -num, den: -den } : { num, den };
}

export function simplify(f: Fraction): Fraction {
  const g = gcd(f.num, f.den) || 1;
  return { num: f.num / g, den: f.den / g };
}

export const equals = (a: Fraction, b: Fraction): boolean => a.num * b.den === b.num * a.den;

export function compare(a: Fraction, b: Fraction): -1 | 0 | 1 {
  const d = a.num * b.den - b.num * a.den;
  return d < 0 ? -1 : d > 0 ? 1 : 0;
}

export const isSimplified = (f: Fraction): boolean => gcd(f.num, f.den) === 1;
export const isValidProbability = (f: Fraction): boolean => f.num >= 0 && f.num <= f.den;

/** Desimal dengan koma (0,375) — hanya untuk tampilan */
export function toDecimal(f: Fraction, digits = 3): string {
  return (f.num / f.den).toLocaleString('id-ID', { maximumFractionDigits: digits });
}

export const fracText = (f: Fraction): string => `${f.num}/${f.den}`;
