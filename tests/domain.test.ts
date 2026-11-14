import { describe, expect, it } from 'vitest';
import { compare, equals, frac, isValidProbability, simplify, toDecimal } from '../src/domain/probability/fraction';
import { randomInt } from '../src/domain/probability/rng';
import { events, sample, space, theory, type LabConfig } from '../src/domain/probability/spaces';
import { isCorrect, reasonMatches, scoreItem, scoreStep } from '../src/domain/learning/scoring';
import { autoThreshold, canSkip, initialHint, mastery, onHintRequest, onWrongAnswer } from '../src/domain/learning/hints';
import { TEST_ITEMS, TEST_MAX } from '../src/domain/content/testItems';
import { PRACTICE_ITEMS } from '../src/domain/content/practiceItems';
import { DIAGNOSTIC, LESSONS, REMEDIAL } from '../src/domain/content/lessons';
import type { Answer, Item, Step } from '../src/domain/learning/types';

const cfg = (p: Partial<LabConfig>): LabConfig => ({ mode: 'dice', coinCount: 1, dieCount: 1, spinKind: 'sama', ...p });

describe('Fraction', () => {
  it('menyederhanakan dan membandingkan secara eksak', () => {
    expect(simplify(frac(4, 12))).toEqual({ num: 1, den: 3 });
    expect(equals(frac(26, 40), frac(13, 20))).toBe(true);
    expect(compare(frac(3, 8), frac(1, 3))).toBe(1);
    expect(compare(frac(2, 6), frac(1, 3))).toBe(0);
    expect(isValidProbability(frac(5, 3))).toBe(false);
    expect(toDecimal(frac(3, 8))).toBe('0,375');
    expect(() => frac(1, 0)).toThrow();
  });
});

describe('Ruang sampel & kejadian', () => {
  it('n(S) sesuai', () => {
    expect(space(cfg({ mode: 'dice', dieCount: 2 })).outcomes).toHaveLength(36);
    expect(space(cfg({ mode: 'cards' })).outcomes).toHaveLength(52);
    expect(space(cfg({ mode: 'coin', coinCount: 2 })).outcomes).toEqual(['AA', 'AG', 'GA', 'GG']);
    expect(space(cfg({ mode: 'bag' })).outcomes).toHaveLength(10);
  });
  it('n(A) setiap kejadian', () => {
    const n = (c: LabConfig, id: string) => theory(c, events(c).find(e => e.id === id)!);
    expect(n(cfg({ dieCount: 2 }), 'sum7')).toMatchObject({ nA: 6, nS: 36 });
    expect(n(cfg({ dieCount: 2 }), 'gt9')).toMatchObject({ nA: 6 });
    expect(n(cfg({}), 'primaganjil')).toMatchObject({ nA: 2, nS: 6 });
    expect(n(cfg({ mode: 'cards' }), 'face')).toMatchObject({ nA: 12, nS: 52 });
    expect(n(cfg({ mode: 'cards' }), 'notspade')).toMatchObject({ nA: 39 });
    expect(n(cfg({ mode: 'bag' }), 'notmerah')).toMatchObject({ nA: 6, nS: 10 });
    expect(n(cfg({ mode: 'coupon', couponBox: 'A' }), 'merah')).toMatchObject({ nA: 2, nS: 5 });
    expect(n(cfg({ mode: 'coupon', couponBox: 'B' }), 'merah')).toMatchObject({ nA: 3, nS: 9 });
    expect(n(cfg({ mode: 'cap' }), 'telentang')).toMatchObject({ none: true });
    expect(n(cfg({ mode: 'spinner', spinKind: 'beda' }), 'merah')).toMatchObject({ nA: 4, nS: 8, area: true });
    expect(n(cfg({ mode: 'coin', coinCount: 2 }), '1A')).toMatchObject({ nA: 2, nS: 4 });
  });
});

describe('Lab tidak membocorkan soal tes (agents.md aturan 7)', () => {
  it('isi kantong & kotak kupon berbeda dari soal Tabel 2', () => {
    const bag = space(cfg({ mode: 'bag' })).outcomes;
    const count = (p: string) => bag.filter(k => k.startsWith(p)).length;
    expect([count('m'), count('k'), count('h')]).not.toEqual([5, 3, 2]); // TES-5
    const a = space(cfg({ mode: 'coupon', couponBox: 'A' })).outcomes, b = space(cfg({ mode: 'coupon', couponBox: 'B' })).outcomes;
    expect([a.length, b.length]).not.toEqual([8, 12]); // TES-1
  });
  it('tutup botol tidak boleh diacak dengan rumus', () => {
    expect(() => sample(cfg({ mode: 'cap' }))).toThrow();
  });
});

describe('RNG', () => {
  it('randomInt dalam rentang', () => {
    for (let i = 0; i < 1000; i++) { const x = randomInt(6); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(6); }
  });
  it('dadu seimbang: uji chi-kuadrat 60.000 lemparan (df=5, kritis 0,001 = 20,52)', () => {
    const c = cfg({}), counts: Record<string, number> = {};
    for (let i = 0; i < 60000; i++) { const k = sample(c); counts[k] = (counts[k] ?? 0) + 1; }
    const chi = Object.values(counts).reduce((a, o) => a + (o - 10000) ** 2 / 10000, 0);
    expect(Object.keys(counts)).toHaveLength(6);
    expect(chi).toBeLessThan(20.52);
  });
  it('roda tidak sama besar mengikuti luas bagian', () => {
    const c = cfg({ mode: 'spinner', spinKind: 'beda' });
    let m = 0; for (let i = 0; i < 40000; i++) if (sample(c) === 'merah') m++;
    expect(Math.abs(m / 40000 - 0.5)).toBeLessThan(0.015);
  });
});

/** Jawaban kunci untuk setiap tahap */
function key(step: Step, steps: Step[]): Answer {
  const c = step.check;
  switch (c.type) {
    case 'number': return c.answer;
    case 'fraction': return c.answer;
    case 'set': return c.answer;
    case 'choice': return c.correct;
    case 'compare': {
      const l = steps.find(s => s.no === c.left)!.check, r = steps.find(s => s.no === c.right)!.check;
      if (l.type !== 'fraction' || r.type !== 'fraction') throw new Error('compare harus merujuk tahap pecahan');
      const d = l.answer[0] * r.answer[1] - r.answer[0] * l.answer[1];
      return d > 0 ? '>' : d < 0 ? '<' : '=';
    }
    case 'reason': return c.model;
  }
}
const keyMap = (it: Item) => new Map(it.steps.map(s => [s.no, key(s, it.steps)] as [number, Answer]));

describe('Butir tes (Tabel 2)', () => {
  it('5 soal × 6 tahap, skor maksimum 30', () => {
    expect(TEST_ITEMS).toHaveLength(5);
    TEST_ITEMS.forEach(it => { expect(it.steps).toHaveLength(6); expect(it.isTestItem).toBe(true); });
    expect(TEST_MAX).toBe(30);
  });
  it('kunci jawaban mendapat skor penuh', () => {
    const total = TEST_ITEMS.reduce((a, it) => a + scoreItem(it, keyMap(it)).total, 0);
    expect(total).toBe(30);
  });
  it('jawaban alasan contoh lolos rubrik kata kunci dan ditandai untuk dicek', () => {
    const t1 = TEST_ITEMS[0], s6 = t1.steps[5];
    expect(reasonMatches('Kotak A karena peluangnya 3/8 lebih besar dari 1/3', (s6.check as { groups: string[][] }).groups)).toBe(true);
    expect(reasonMatches('karena merah', (s6.check as { groups: string[][] }).groups)).toBe(false);
    expect(scoreStep(s6, 'peluang A lebih besar', new Map(), t1.steps).needsReview).toBe(true);
  });
  it('error-carried-forward: salah di tahap awal, prosedur benar di tahap lanjut tetap diberi skor', () => {
    const t1 = TEST_ITEMS[0];
    const a = keyMap(t1);
    a.set(2, [2, 8]);      // salah: seharusnya 3/8
    a.set(4, '<');          // 2/8 < 1/3 → konsisten dengan jawabannya sendiri
    a.set(5, 1);            // Kotak B → konsisten
    const r = scoreItem(t1, a);
    expect(r.steps[1].score).toBe(0);
    expect(r.steps[3]).toMatchObject({ score: 1, ecf: true });
    expect(r.steps[4]).toMatchObject({ score: 1, ecf: true });
    expect(r.total).toBe(5);

    const t3 = TEST_ITEMS[2], b = keyMap(t3);
    b.set(2, ['2', '4']);   // lupa 6
    b.set(3, [2, 6]);       // n(A)/n(S) dari jawabannya sendiri
    const r3 = scoreItem(t3, b);
    expect(r3.steps[1].score).toBe(0);
    expect(r3.steps[2]).toMatchObject({ score: 1, ecf: true });
  });
  it('jawaban kosong mendapat 0', () => {
    expect(scoreItem(TEST_ITEMS[1], new Map()).total).toBe(0);
  });
});

describe('Konten latihan & unit', () => {
  it('latihan terpisah dari tes dan semua kuncinya konsisten', () => {
    const testIds = new Set(TEST_ITEMS.map(t => t.id));
    PRACTICE_ITEMS.forEach(it => {
      expect(it.isTestItem).toBe(false);
      expect(testIds.has(it.id)).toBe(false);
      it.steps.forEach(s => {
        expect(isCorrect(s, key(s, it.steps), it.steps)).toBe(true);
        expect(s.hints.every(h => h.length > 0)).toBe(true);
      });
    });
    expect(new Set(PRACTICE_ITEMS.map(i => i.indicator)).size).toBe(4);
  });
  it('kuis unit & diagnostik punya kunci yang valid', () => {
    [REMEDIAL, ...LESSONS].forEach(l => l.steps.forEach(s => { if (s.quiz) expect(isCorrect(s.quiz, key(s.quiz, [s.quiz]), [s.quiz])).toBe(true); }));
    DIAGNOSTIC.forEach(s => expect(isCorrect(s, key(s, DIAGNOSTIC), DIAGNOSTIC)).toBe(true));
  });
  it('soal tes tidak bocor ke latihan (teks soal berbeda)', () => {
    const stems = new Set(TEST_ITEMS.map(t => t.stem));
    PRACTICE_ITEMS.forEach(p => expect(stems.has(p.stem)).toBe(false));
  });
});

describe('Petunjuk bertahap & fading', () => {
  it('muncul otomatis setelah 2× salah', () => {
    let s = initialHint();
    let r = onWrongAnswer(s, 0); expect(r.autoShown).toBe(false); s = r.state;
    r = onWrongAnswer(s, 0); expect(r.autoShown).toBe(true); expect(r.state.level).toBe(1);
  });
  it('dipudarkan saat mahir: setelah 3× salah', () => {
    expect(autoThreshold(0.85)).toBe(3);
    let s = initialHint();
    for (let i = 0; i < 2; i++) s = onWrongAnswer(s, 0.9).state;
    expect(s.level).toBe(0);
    expect(onWrongAnswer(s, 0.9).autoShown).toBe(true);
  });
  it('level maksimum 3 dan boleh lewati hanya setelah semua bantuan', () => {
    let s = initialHint();
    for (let i = 0; i < 5; i++) s = onHintRequest(s);
    expect(s.level).toBe(3);
    expect(canSkip(s)).toBe(false);
    for (let i = 0; i < 4; i++) s = onWrongAnswer(s, 0).state;
    expect(canSkip(s)).toBe(true);
  });
  it('mastery = proporsi langkah tanpa petunjuk', () => {
    expect(mastery([{ solved: true, hintsUsed: 0 }, { solved: true, hintsUsed: 1 }, { solved: false, hintsUsed: 0 }, { solved: true, hintsUsed: 0 }])).toBe(0.5);
  });
});
