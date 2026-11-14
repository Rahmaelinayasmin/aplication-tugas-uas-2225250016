import { compare, equals, frac, type Fraction } from '../probability/fraction';
import type { Answer, Item, Step, StepResult } from './types';

/* Penskoran per tahap sesuai kisi-kisi Tabel 2.
   Skor parsial: tiap tahap dinilai sendiri. Error-carried-forward (ECF): bila tahap sebelumnya salah
   tetapi siswa memakai prosedur yang benar terhadap angkanya sendiri, tahap ini tetap mendapat skor. */

export const normalize = (s: string): string =>
  s.toLowerCase().replace(/[^\p{L}\p{N}/,.<>=\s]/gu, ' ').replace(/\s+/g, ' ').trim();

function asCount(a: Answer | undefined): number | null {
  if (typeof a === 'number' && Number.isFinite(a)) return a;
  if (Array.isArray(a) && (a.length === 0 || typeof a[0] === 'string')) return a.length;
  return null;
}
function asFraction(a: Answer | undefined): Fraction | null {
  if (Array.isArray(a) && a.length === 2 && typeof a[0] === 'number' && typeof a[1] === 'number' && a[1] !== 0) return frac(a[0], a[1] as number);
  return null;
}
const sym = (c: -1 | 0 | 1) => (c > 0 ? '>' : c < 0 ? '<' : '=');
const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

/** Apakah jawaban benar (tanpa ECF) — dipakai juga oleh mode latihan */
export function isCorrect(step: Step, answer: Answer | undefined, steps: Step[]): boolean {
  const c = step.check;
  if (answer === undefined) return false;
  switch (c.type) {
    case 'number': return answer === c.answer;
    case 'fraction': {
      const f = asFraction(answer);
      if (!f) return false;
      return c.exact ? f.num === c.answer[0] && f.den === c.answer[1] : equals(f, frac(c.answer[0], c.answer[1]));
    }
    case 'set': return Array.isArray(answer) && sameSet(answer as string[], c.answer);
    case 'choice': return answer === c.correct;
    case 'compare': {
      const l = expectedFraction(steps, c.left), r = expectedFraction(steps, c.right);
      return !!l && !!r && answer === sym(compare(l, r));
    }
    case 'reason': return typeof answer === 'string' && reasonMatches(answer, c.groups);
  }
}

function expectedFraction(steps: Step[], no: number): Fraction | null {
  const s = steps.find(x => x.no === no);
  return s && s.check.type === 'fraction' ? frac(s.check.answer[0], s.check.answer[1]) : null;
}

export function reasonMatches(text: string, groups: string[][]): boolean {
  const t = ' ' + normalize(text) + ' ';
  return groups.every(g => g.some(k => t.includes(normalize(k))));
}

export function scoreStep(step: Step, answer: Answer | undefined, prior: Map<number, Answer>, steps: Step[]): StepResult {
  const max = step.max ?? 1;
  const c = step.check;
  // Hanya alasan yang benar-benar diisi perlu dicek guru; yang kosong otomatis 0
  const base = { no: step.no, max, needsReview: c.type === 'reason' && typeof answer === 'string' && answer.trim() !== '' };
  if (isCorrect(step, answer, steps)) return { ...base, score: max, correct: true, ecf: false };
  if (answer === undefined) return { ...base, score: 0, correct: false, ecf: false };

  let ecf = false;
  if (c.type === 'fraction' && c.ecf) {
    const n = asCount(prior.get(c.ecf.num)), d = asCount(prior.get(c.ecf.den)), f = asFraction(answer);
    if (n !== null && d !== null && d !== 0 && f) ecf = equals(f, frac(n, d));
  }
  if (c.type === 'compare') {
    const l = asFraction(prior.get(c.left)), r = asFraction(prior.get(c.right));
    if (l && r) ecf = answer === sym(compare(l, r));
  }
  if (c.type === 'choice' && c.ecf) {
    const p = prior.get(c.ecf.from);
    if (p !== undefined && c.ecf.map[String(p)] === answer) ecf = true;
  }
  return { ...base, score: ecf ? max : 0, correct: false, ecf };
}

export function scoreItem(item: Item, answers: Map<number, Answer>): { steps: StepResult[]; total: number; max: number } {
  const steps = item.steps.map(s => scoreStep(s, answers.get(s.no), answers, item.steps));
  return { steps, total: steps.reduce((a, s) => a + s.score, 0), max: steps.reduce((a, s) => a + s.max, 0) };
}

/** Teks jawaban untuk ekspor */
export function answerText(a: Answer | undefined, step?: Step): string {
  if (a === undefined) return '';
  if (step?.check.type === 'choice' && typeof a === 'number') return step.check.options[a] ?? String(a);
  if (Array.isArray(a)) return typeof a[0] === 'number' ? `${a[0]}/${a[1]}` : `{${(a as string[]).join(', ')}}`;
  return String(a);
}
