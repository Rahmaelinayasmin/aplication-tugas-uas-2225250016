import { randomInt } from './rng';

/* Ruang sampel & kejadian untuk Lab Lapangan.
   Hasil disimpan sebagai string kunci: koin "A"/"AG", dadu "4"/"3-5", kartu "10H", roda "merah", kantong "m1",
   kupon "A-m1", tutup botol "telentang"/"telungkup".
   PENTING (agents.md aturan 7): isi kantong & kotak kupon sengaja BERBEDA dari soal tes Tabel 2. */

export type LabMode = 'coin' | 'dice' | 'cards' | 'spinner' | 'bag' | 'coupon' | 'cap';
export type SpinKind = 'sama' | 'beda';
export type CouponBox = 'A' | 'B';

export interface LabConfig {
  mode: LabMode;
  coinCount: 1 | 2;
  dieCount: 1 | 2;
  spinKind: SpinKind;
  couponBox?: CouponBox;
}

/** Kotak undian kupon: A = 2 merah + 3 biru, B = 3 merah + 6 biru (berbeda dari soal tes no. 1) */
export const COUPON: Record<CouponBox, { merah: number; biru: number }> = { A: { merah: 2, biru: 3 }, B: { merah: 3, biru: 6 } };
export const COUPON_COL: Record<string, string> = { merah: '#F08C8C', biru: '#8FBEEB' };
export function couponKeys(box: CouponBox): string[] {
  const c = COUPON[box];
  return [...Array.from({ length: c.merah }, (_, i) => `${box}-m${i + 1}`), ...Array.from({ length: c.biru }, (_, i) => `${box}-b${i + 1}`)];
}
export const couponColor = (k: string) => (k.split('-')[1][0] === 'm' ? 'merah' : 'biru');

/** Tutup botol tidak simetris: TIDAK punya peluang teoretis, hanya bisa diperkirakan dari percobaan */
export const CAP_OUTCOMES = ['telentang', 'telungkup'];

export interface SampleSpace {
  outcomes: string[];
  /** bobot (luas bagian) bila hasil tidak sama kemungkinan */
  weights: number[] | null;
}

export interface LabEvent {
  id: string;
  label: string;
  /** deskripsi dengan <b> untuk kata kunci */
  desc: string;
  test: (k: string) => boolean;
}

export const SUITS = [
  { k: 'S', name: 'sekop', sym: '♠︎', red: false },
  { k: 'C', name: 'keriting', sym: '♣︎', red: false },
  { k: 'H', name: 'hati', sym: '♥︎', red: true },
  { k: 'D', name: 'wajik', sym: '♦︎', red: true }
] as const;
export type SuitKey = (typeof SUITS)[number]['k'];
export const SUIT: Record<string, (typeof SUITS)[number]> = Object.fromEntries(SUITS.map(s => [s.k, s]));
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export const cardRank = (k: string) => k.slice(0, -1);
export const cardSuit = (k: string) => SUIT[k.slice(-1)];

export const SPIN: Record<SpinKind, { c: string; w: number; col: string }[]> = {
  sama: [
    { c: 'merah', w: 1, col: '#F4A3A8' }, { c: 'kuning', w: 1, col: '#FFE08A' },
    { c: 'biru', w: 1, col: '#A9CFF2' }, { c: 'hijau', w: 1, col: '#A8DDB5' }
  ],
  beda: [
    { c: 'merah', w: 4, col: '#F4A3A8' }, { c: 'biru', w: 2, col: '#A9CFF2' },
    { c: 'kuning', w: 1, col: '#FFE08A' }, { c: 'hijau', w: 1, col: '#A8DDB5' }
  ]
};

export const BALL_COL: Record<string, string> = { merah: '#F08C8C', kuning: '#FFD45E', hijau: '#86CF98' };
/** Kantong lab: 4 merah, 4 kuning, 2 hijau (berbeda dari soal tes no. 5) */
export const BAG: string[] = [
  ...[1, 2, 3, 4].map(i => 'm' + i),
  ...[1, 2, 3, 4].map(i => 'k' + i),
  ...[1, 2].map(i => 'h' + i)
];
export const ballColor = (k: string): string => ({ m: 'merah', k: 'kuning', h: 'hijau' } as Record<string, string>)[k[0]];

const PRIMES = new Set([2, 3, 5]);
const sum2 = (k: string) => k.split('-').reduce((a, b) => a + Number(b), 0);

export function space(c: LabConfig): SampleSpace {
  switch (c.mode) {
    case 'coin':
      return { outcomes: c.coinCount === 1 ? ['A', 'G'] : ['AA', 'AG', 'GA', 'GG'], weights: null };
    case 'dice': {
      if (c.dieCount === 1) return { outcomes: ['1', '2', '3', '4', '5', '6'], weights: null };
      const o: string[] = [];
      for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) o.push(`${a}-${b}`);
      return { outcomes: o, weights: null };
    }
    case 'cards': {
      const o: string[] = [];
      for (const s of SUITS) for (const r of RANKS) o.push(r + s.k);
      return { outcomes: o, weights: null };
    }
    case 'spinner': {
      const s = SPIN[c.spinKind];
      return { outcomes: s.map(x => x.c), weights: c.spinKind === 'beda' ? s.map(x => x.w) : null };
    }
    case 'bag':
      return { outcomes: BAG.slice(), weights: null };
    case 'coupon':
      return { outcomes: couponKeys(c.couponBox ?? 'A'), weights: null };
    case 'cap':
      return { outcomes: CAP_OUTCOMES.slice(), weights: null };
  }
}

export function events(c: LabConfig): LabEvent[] {
  switch (c.mode) {
    case 'coin':
      return c.coinCount === 1
        ? [
            { id: 'A', label: 'Muncul Angka', desc: 'muncul sisi <b>Angka</b>', test: k => k === 'A' },
            { id: 'G', label: 'Muncul Gambar', desc: 'muncul sisi <b>Gambar</b>', test: k => k === 'G' }
          ]
        : [
            { id: 'AA', label: 'Keduanya Angka', desc: '<b>kedua koin Angka</b>', test: k => k === 'AA' },
            { id: '1A', label: 'Tepat satu Angka', desc: '<b>tepat satu</b> koin Angka', test: k => k.split('').filter(x => x === 'A').length === 1 },
            { id: 'min1G', label: 'Paling sedikit satu Gambar', desc: '<b>paling sedikit satu</b> Gambar', test: k => k.includes('G') }
          ];
    case 'dice':
      return c.dieCount === 1
        ? [
            { id: 'genap', label: 'Genap', desc: 'muncul mata dadu <b>genap</b>', test: k => Number(k) % 2 === 0 },
            { id: 'prima', label: 'Prima', desc: 'muncul mata dadu <b>prima</b> (2 termasuk prima)', test: k => PRIMES.has(Number(k)) },
            { id: 'primaganjil', label: 'Prima ganjil', desc: 'muncul mata dadu <b>prima dan ganjil</b> (2 tidak ikut)', test: k => PRIMES.has(Number(k)) && Number(k) % 2 === 1 },
            { id: 'gt4', label: 'Lebih dari 4', desc: 'muncul mata dadu <b>lebih dari 4</b>', test: k => Number(k) > 4 },
            { id: 'six', label: 'Mata 6', desc: 'muncul mata dadu <b>6</b>', test: k => k === '6' }
          ]
        : [
            { id: 'sum7', label: 'Jumlah 7', desc: '<b>jumlah</b> mata kedua dadu <b>= 7</b>', test: k => sum2(k) === 7 },
            { id: 'twin', label: 'Kembar', desc: 'mata kedua dadu <b>sama</b> (kembar)', test: k => { const [a, b] = k.split('-'); return a === b; } },
            { id: 'gt9', label: 'Jumlah > 9', desc: '<b>jumlah</b> mata dadu <b>lebih dari 9</b>', test: k => sum2(k) > 9 },
            { id: 'first6', label: 'Dadu ungu = 6', desc: '<b>dadu ungu</b> (dadu 1) menunjukkan <b>6</b>', test: k => k.startsWith('6-') }
          ];
    case 'cards':
      return [
        { id: 'ace', label: 'Kartu As', desc: 'terambil kartu <b>As</b>', test: k => cardRank(k) === 'A' },
        { id: 'heart', label: 'Hati', desc: 'terambil kartu <b>hati</b> ♥︎', test: k => k.endsWith('H') },
        { id: 'red', label: 'Kartu merah', desc: 'terambil kartu <b>berwarna merah</b> (hati atau wajik)', test: k => cardSuit(k).red },
        { id: 'face', label: 'Kartu bergambar', desc: 'terambil kartu <b>bergambar</b> (J, Q, K)', test: k => ['J', 'Q', 'K'].includes(cardRank(k)) },
        { id: 'notspade', label: 'Bukan sekop', desc: 'terambil kartu <b>bukan sekop</b>', test: k => !k.endsWith('S') }
      ];
    case 'spinner':
      return [
        { id: 'merah', label: 'Merah', desc: 'jarum berhenti di <b>merah</b>', test: k => k === 'merah' },
        { id: 'biru', label: 'Biru', desc: 'jarum berhenti di <b>biru</b>', test: k => k === 'biru' },
        { id: 'notmerah', label: 'Bukan merah', desc: 'jarum berhenti <b>bukan di merah</b>', test: k => k !== 'merah' }
      ];
    case 'bag':
      return [
        { id: 'kuning', label: 'Bola kuning', desc: 'terambil bola <b>kuning</b>', test: k => k[0] === 'k' },
        { id: 'notmerah', label: 'Bukan merah', desc: 'terambil bola <b>bukan merah</b>', test: k => k[0] !== 'm' },
        { id: 'hijau', label: 'Bola hijau', desc: 'terambil bola <b>hijau</b>', test: k => k[0] === 'h' }
      ];
    case 'coupon':
      return [
        { id: 'merah', label: 'Kupon merah', desc: `terambil kupon <b>merah</b> dari Kotak ${c.couponBox ?? 'A'}`, test: k => couponColor(k) === 'merah' },
        { id: 'biru', label: 'Kupon biru', desc: `terambil kupon <b>biru</b> dari Kotak ${c.couponBox ?? 'A'}`, test: k => couponColor(k) === 'biru' }
      ];
    case 'cap':
      return [
        { id: 'telentang', label: 'Telentang', desc: 'tutup botol jatuh <b>telentang</b> (rongga menghadap ke atas)', test: k => k === 'telentang' },
        { id: 'telungkup', label: 'Telungkup', desc: 'tutup botol jatuh <b>telungkup</b> (rongga menghadap ke bawah)', test: k => k === 'telungkup' }
      ];
  }
}

export interface Theory { nA: number; nS: number; area: boolean; /** tidak ada peluang teoretis (tutup botol) */ none: boolean }

/** Peluang teoretis: n(A)/n(S), luas bagian / luas roda, atau tidak ada (benda tidak simetris) */
export function theory(c: LabConfig, ev: LabEvent): Theory {
  if (c.mode === 'cap') return { nA: 0, nS: 0, area: false, none: true };
  const sp = space(c);
  if (sp.weights) {
    let a = 0, t = 0;
    sp.outcomes.forEach((k, i) => { t += sp.weights![i]; if (ev.test(k)) a += sp.weights![i]; });
    return { nA: a, nS: t, area: true, none: false };
  }
  return { nA: sp.outcomes.filter(ev.test).length, nS: sp.outcomes.length, area: false, none: false };
}

/** Satu hasil acak (mode cepat tanpa animasi) — distribusi sama dengan benda aslinya.
    Tutup botol tidak bisa diacak dengan rumus; mode cepatnya disimulasikan fisika oleh LabEngine. */
export function sample(c: LabConfig): string {
  if (c.mode === 'cap') throw new Error('Tutup botol disimulasikan dengan fisika (LabEngine.simulateCaps)');
  const sp = space(c);
  if (sp.weights) {
    let r = randomInt(sp.weights.reduce((a, b) => a + b, 0));
    for (let i = 0; i < sp.outcomes.length; i++) {
      r -= sp.weights[i];
      if (r < 0) return sp.outcomes[i];
    }
  }
  return sp.outcomes[randomInt(sp.outcomes.length)];
}

export function fmtKey(c: LabConfig, k: string): string {
  switch (c.mode) {
    case 'dice': return c.dieCount === 1 ? k : `(${k.replace('-', ',')})`;
    case 'cards': return cardRank(k) + cardSuit(k).sym;
    case 'bag': return ballColor(k);
    case 'coupon': return couponColor(k);
    default: return k;
  }
}
