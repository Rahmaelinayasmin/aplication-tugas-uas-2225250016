import { describe, expect, it } from 'vitest';
import { LEVELS, LEVEL_IDS, answer, beats, currentQuestionId, hintsLeft, isValidRun, newRun, openHint, suitRound } from '../src/domain/learning/quest';
import { ABILITY_STEPS, abilityChecks, abilityScore } from '../src/domain/learning/ability';
import { QUEST_ITEMS, questItemsOf } from '../src/domain/content/questItems';
import { TEST_ITEMS } from '../src/domain/content/testItems';
import { isCorrect } from '../src/domain/learning/scoring';
import { equals, frac, isValidProbability } from '../src/domain/probability/fraction';

const ids = (l) => questItemsOf(l).map(q => q.id);

describe('Latihan Soal Berlevel — aturan permainan', () => {
  it('jumlah soal & jatah petunjuk sesuai permintaan (5/10/15; 3/2/1)', () => {
    expect(LEVEL_IDS.map(l => LEVELS[l].count)).toEqual([5, 10, 15]);
    expect(LEVEL_IDS.map(l => LEVELS[l].hints)).toEqual([3, 2, 1]);
    for (const l of LEVEL_IDS) expect(questItemsOf(l)).toHaveLength(LEVELS[l].count);
  });

  it('soal tidak berlanjut saat jawaban salah', () => {
    let r = newRun('mudah', ids('mudah'));
    r = answer(r, false);
    expect(r.index).toBe(0);
    expect(currentQuestionId(r)).toBe('Q-M01');
    r = answer(r, true);
    expect(r.index).toBe(1);
  });

  it('mudah: nyawa 100, salah −5, habis → gagal', () => {
    let r = newRun('mudah', ids('mudah'));
    r = answer(r, false);
    expect(r.meter).toBe(95);
    for (let i = 0; i < 18; i++) r = answer(r, false);
    expect(r.meter).toBe(5);
    expect(r.status).toBe('playing');
    r = answer(r, false);
    expect(r.meter).toBe(0);
    expect(r.status).toBe('over');
    expect(answer(r, true)).toBe(r); // tidak berubah setelah selesai
  });

  it('sedang: benar +1 km, salah −1 km (tidak negatif), bensin −5', () => {
    let r = newRun('sedang', ids('sedang'));
    r = answer(r, false);
    expect(r.km).toBe(0);
    expect(r.meter).toBe(95);
    r = answer(answer(r, true), true);
    expect(r.km).toBe(2);
    r = answer(r, false);
    expect(r.km).toBe(1);
    expect(r.meter).toBe(90);
  });

  it('sulit: gagal tepat pada salah ke-5', () => {
    let r = newRun('sulit', ids('sulit'));
    for (let i = 0; i < 4; i++) r = answer(r, false);
    expect(r.status).toBe('playing');
    r = answer(r, false);
    expect(r.status).toBe('over');
  });

  it('semua benar → selesai', () => {
    let r = newRun('sedang', ids('sedang'));
    for (let i = 0; i < 10; i++) r = answer(r, true);
    expect(r.status).toBe('done');
    expect(r.km).toBe(10);
    expect(currentQuestionId(r)).toBeNull();
  });

  it('petunjuk dibatasi per soal sesuai level', () => {
    let r = newRun('sulit', ids('sulit'));
    expect(hintsLeft(r, 'Q-H01')).toBe(1);
    r = openHint(r, 'Q-H01');
    expect(hintsLeft(r, 'Q-H01')).toBe(0);
    expect(openHint(r, 'Q-H01')).toBe(r);
    expect(hintsLeft(r, 'Q-H02')).toBe(1);
  });

  it('validasi run dari penyimpanan', () => {
    expect(isValidRun(newRun('mudah', ids('mudah')))).toBe(true);
    expect(isValidRun({ level: 'mudah', questionIds: [], index: 0, status: 'playing', hintsUsed: {} })).toBe(false);
    expect(isValidRun(null)).toBe(false);
    expect(() => newRun('mudah', ['x'])).toThrow();
  });

  it('suit: hasil mengikuti benar/salah, bukan keacakan', () => {
    for (let p = 0; p < 3; p++) {
      const w = suitRound(true, p), l = suitRound(false, p);
      expect(beats(w.player, w.opponent)).toBe(true);
      expect(beats(l.opponent, l.player)).toBe(true);
    }
  });
});

describe('Bank soal berlevel', () => {
  it('id unik, bukan butir tes, petunjuk cukup', () => {
    expect(new Set(QUEST_ITEMS.map(q => q.id)).size).toBe(QUEST_ITEMS.length);
    for (const q of QUEST_ITEMS) {
      expect(q.isTestItem).toBe(false);
      expect(q.hints.length).toBeGreaterThanOrEqual(LEVELS[q.level].hints);
    }
  });

  it('kunci jawaban konsisten & peluang valid', () => {
    for (const q of QUEST_ITEMS) {
      const c = q.check;
      const key = c.type === 'fraction' ? c.answer : c.type === 'number' ? c.answer : c.type === 'choice' ? c.correct : c.answer;
      expect(isCorrect(q, key, [q])).toBe(true);
      if (c.type === 'fraction') expect(isValidProbability(frac(c.answer[0], c.answer[1]))).toBe(true);
    }
  });

  it('petunjuk tidak membocorkan jawaban akhir (agents.md aturan 4)', () => {
    for (const q of QUEST_ITEMS) {
      if (q.check.type !== 'fraction') continue;
      const [n, d] = q.check.answer;
      for (const h of q.hints) {
        for (const m of h.matchAll(/(\d+)\s*\/\s*(\d+)/g)) {
          expect(equals(frac(+m[1], +m[2]), frac(n, d)), `${q.id}: "${h}"`).toBe(false);
        }
      }
    }
  });

  it('soal berlevel tidak sama dengan soal tes', () => {
    const testStems = TEST_ITEMS.map(t => t.stem);
    for (const q of QUEST_ITEMS) expect(testStems.some(s => s.includes(q.stem))).toBe(false);
  });
});

describe('Kemampuan Saya 1–10', () => {
  const base = { diagnosticScore: null, remedialDone: false, lessonsDone: 0, lessonsTotal: 6, practiceMastery: 0, questDone: { mudah: false, sedang: false, sulit: false }, pretestDone: false, posttest: null };
  it('minimal 1, maksimal 10', () => {
    expect(ABILITY_STEPS).toHaveLength(10);
    expect(abilityScore(base)).toBe(1);
    expect(abilityScore({
      diagnosticScore: 1, remedialDone: true, lessonsDone: 6, lessonsTotal: 6, practiceMastery: 0.9,
      questDone: { mudah: true, sedang: true, sulit: true }, pretestDone: true, posttest: { total: 24, max: 30 }
    })).toBe(10);
  });
  it('ambang posttest 80% dihitung tanpa float', () => {
    expect(abilityChecks({ ...base, posttest: { total: 24, max: 30 } })[9]).toBe(true);
    expect(abilityChecks({ ...base, posttest: { total: 23, max: 30 } })[9]).toBe(false);
  });
  it('lulus level menaikkan skor', () => {
    expect(abilityScore({ ...base, questDone: { mudah: true, sedang: true, sulit: false } })).toBe(3);
  });
});
