/* Latihan Soal Berlevel (permintaan peneliti, 17 Nov 2026).
   Logika murni: tidak mengimpor React/Dexie (agents.md aturan 13).
   - Mudah : 5 soal, 3 petunjuk/soal, permainan Suit (nyawa 100, salah −5)
   - Sedang: 10 soal, 2 petunjuk/soal, Mobil ke kantor (bensin 100, salah −5; benar +1 km, salah −1 km)
   - Sulit : 15 soal, 1 petunjuk/soal, Kucing lapar (benar = makan, salah = tidur, maks. 5 salah)
   Soal TIDAK berlanjut sebelum dijawab benar (index hanya naik saat benar). */

export const LEVELS = {
  mudah: { id: 'mudah', no: 1, title: 'Mudah', count: 5, hints: 3, game: 'suit', meterName: 'Nyawa', meterMax: 100, penalty: 5, maxWrong: null },
  sedang: { id: 'sedang', no: 2, title: 'Sedang', count: 10, hints: 2, game: 'mobil', meterName: 'Bensin', meterMax: 100, penalty: 5, maxWrong: null },
  sulit: { id: 'sulit', no: 3, title: 'Sulit', count: 15, hints: 1, game: 'kucing', meterName: null, meterMax: null, penalty: 0, maxWrong: 5 }
};
export const LEVEL_IDS = ['mudah', 'sedang', 'sulit'];

/** Satu putaran pengerjaan level. Disimpan apa adanya ke penyimpanan lokal agar bisa dilanjutkan. */
export function newRun(levelId, questionIds) {
  const L = LEVELS[levelId];
  if (!L) throw new Error('Level tidak dikenal: ' + levelId);
  if (questionIds.length !== L.count) throw new Error(`Level ${levelId} butuh ${L.count} soal`);
  return {
    level: levelId,
    questionIds: [...questionIds],
    index: 0,
    meter: L.meterMax,      // nyawa / bensin (null untuk sulit)
    km: 0,                  // khusus mobil
    wrong: 0,
    correct: 0,
    wrongStreak: 0,
    hintsUsed: {},          // { [questionId]: banyak petunjuk dibuka }
    wrongPer: {},           // { [questionId]: banyak salah }
    status: 'playing'       // playing | done | over
  };
}

export const currentQuestionId = (run) => (run.status === 'playing' ? run.questionIds[run.index] : null);

/** Catat satu jawaban. Benar → lanjut ke soal berikutnya; salah → tetap di soal yang sama. */
export function answer(run, correct) {
  if (run.status !== 'playing') return run;
  const L = LEVELS[run.level];
  const qid = run.questionIds[run.index];
  if (correct) {
    const index = run.index + 1;
    return {
      ...run, index, correct: run.correct + 1, wrongStreak: 0,
      km: L.game === 'mobil' ? run.km + 1 : run.km,
      status: index >= L.count ? 'done' : 'playing'
    };
  }
  const wrong = run.wrong + 1;
  const meter = run.meter === null ? null : Math.max(0, run.meter - L.penalty);
  const over = (meter !== null && meter <= 0) || (L.maxWrong !== null && wrong >= L.maxWrong);
  return {
    ...run, wrong, meter, wrongStreak: run.wrongStreak + 1,
    wrongPer: { ...run.wrongPer, [qid]: (run.wrongPer[qid] ?? 0) + 1 },
    km: L.game === 'mobil' ? Math.max(0, run.km - 1) : run.km,
    status: over ? 'over' : 'playing'
  };
}

export const hintsLeft = (run, qid) => Math.max(0, LEVELS[run.level].hints - (run.hintsUsed[qid] ?? 0));

export function openHint(run, qid) {
  if (hintsLeft(run, qid) === 0) return run;
  return { ...run, hintsUsed: { ...run.hintsUsed, [qid]: (run.hintsUsed[qid] ?? 0) + 1 } };
}

/** Akurasi 0..1 (benar / semua jawaban) — dipakai Kemampuan Saya */
export const accuracy = (run) => (run.correct + run.wrong === 0 ? 0 : run.correct / (run.correct + run.wrong));

/** Validasi bentuk data run dari penyimpanan (data dari luar divalidasi manual, agents.md §4) */
export function isValidRun(r) {
  const L = r && LEVELS[r.level];
  return !!L && Array.isArray(r.questionIds) && r.questionIds.length === L.count
    && Number.isInteger(r.index) && r.index >= 0 && r.index <= L.count
    && ['playing', 'done', 'over'].includes(r.status) && typeof r.hintsUsed === 'object' && r.hintsUsed !== null;
}

/* ── Suit batu–kertas–gunting ──
   Hasil suit TIDAK acak: ditentukan oleh benar/salahnya jawaban. Yang diacak hanya gerakan tangan (dekoratif). */
export const GESTURES = ['batu', 'kertas', 'gunting'];
const BEATS = { batu: 'gunting', gunting: 'kertas', kertas: 'batu' };
export const beats = (a, b) => BEATS[a] === b;

/** @param {boolean} playerWins  @param {number} pick 0..2 (dari rng.js) */
export function suitRound(playerWins, pick) {
  const player = GESTURES[((pick % 3) + 3) % 3];
  const loser = BEATS[player];
  const winner = Object.keys(BEATS).find(g => BEATS[g] === player);
  return { player, opponent: playerWins ? loser : winner };
}
