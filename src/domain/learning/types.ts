export type Indicator = 'reasoning' | 'formulating' | 'employing' | 'interpreting';

export const INDICATORS: { id: Indicator; name: string; short: string; desc: string }[] = [
  { id: 'reasoning', name: 'Mathematical Reasoning', short: 'Bernalar', desc: 'Membandingkan pilihan dan memberi alasan matematis' },
  { id: 'formulating', name: 'Formulating Situations Mathematically', short: 'Merumuskan', desc: 'Mengubah cerita menjadi model matematika' },
  { id: 'employing', name: 'Employing Concepts, Facts & Procedures', short: 'Menghitung', desc: 'Memakai konsep dan prosedur peluang' },
  { id: 'interpreting', name: 'Interpreting, Applying & Evaluating', short: 'Menafsirkan', desc: 'Menilai kewajaran dan makna hasil' }
];

export type GlossaryKey = 'koin' | 'dadu' | 'kartu-remi' | 'kantong' | 'roda' | 'ruang-sampel';

/** Jawaban siswa untuk satu tahap */
export type Answer = number | [number, number] | string[] | string;

export type Check =
  | { type: 'number'; answer: number; unit?: string }
  /** ecf: nomor tahap yang jawabannya (angka atau banyak anggota himpunan) menjadi pembilang/penyebut versi siswa sendiri */
  | { type: 'fraction'; answer: [number, number]; exact?: boolean; ecf?: { num: number; den: number }; numLabel?: string; denLabel?: string }
  | { type: 'set'; options: string[]; answer: string[] }
  /** ecf: pilihan yang konsisten dengan jawaban siswa di tahap `from` dianggap benar-terbawa */
  | { type: 'choice'; options: string[]; correct: number; ecf?: { from: number; map: Record<string, number> } }
  /** membandingkan dua pecahan dari tahap `left` dan `right` */
  | { type: 'compare'; left: number; right: number; leftLabel: string; rightLabel: string }
  /** alasan singkat: benar bila setiap grup memuat minimal satu kata kunci; selalu ditandai untuk dicek guru */
  | { type: 'reason'; groups: string[][]; model: string };

export interface Step {
  no: number;
  prompt: string;
  check: Check;
  max?: number;
  /** level 1 pertanyaan pemantik, 2 petunjuk terarah, 3 contoh sejenis (bukan jawaban) */
  hints: [string, string, string];
}

export interface Item {
  id: string;
  indicator: Indicator;
  title: string;
  /** kata kunci ditandai [[...]] */
  stem: string;
  context?: GlossaryKey[];
  lab?: { mode: 'coin' | 'dice' | 'cards' | 'spinner' | 'bag'; count?: 1 | 2 };
  steps: Step[];
  isTestItem: boolean;
}

export interface StepResult {
  no: number;
  score: number;
  max: number;
  correct: boolean;
  ecf: boolean;
  needsReview: boolean;
}
