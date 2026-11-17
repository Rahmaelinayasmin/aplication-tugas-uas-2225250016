import { db,  } from './db';
import { mastery } from '../domain/learning/hints';
import { isValidRun } from '../domain/learning/quest';

/* Kode siswa: huruf apa saja + angka berapa saja (S01, A01, B12, AB1234 …), tetap tanpa nama asli.
   Kode kelas: bebas dipilih siswa (8A, VIII-B, KELAS 2 …), maks. 12 karakter. */
export const CODE_RE = /^[A-Z]{1,3}[0-9]{1,9}$/;
export const CLASS_RE = /^[A-Z0-9][A-Z0-9 .-]{0,11}$/;
export const normCode = (s) => s.trim().toUpperCase().replace(/\s+/g, '');
export const normClass = (s) => s.trim().toUpperCase().replace(/\s+/g, ' ');

export async function login(code, classCode) {
  const existing = await db.students.get(code);
  if (existing) {
    if (existing.classCode !== classCode) { existing.classCode = classCode; await db.students.put(existing); }
    return existing;
  }
  const s = { code, classCode, createdAt: Date.now(), diagnosticScore: null, remedialDone: false, lessonsDone: [] };
  await db.students.put(s);
  return s;
}

export const listStudents = () => db.students.orderBy('code').toArray();
export const getStudent = (code) => db.students.get(code);
export async function updateStudent(code, patch) {
  await db.students.update(code, patch);
  return db.students.get(code);
}

export const saveAttempt = (a) => db.attempts.add(a);
export const attemptsOf = (code) => db.attempts.where('studentCode').equals(code).toArray();
export const logHint = (e) => db.hintEvents.add(e);
export const logSimulation = (e) => db.simulations.add(e);
export const saveSurvey = (e) => db.surveys.add(e);

export async function testDone(code, mode) {
  return (await db.attempts.where({ studentCode: code }).filter(a => a.mode === mode).count()) > 0;
}

/** Mastery per indikator dari riwayat latihan (dipakai untuk fading petunjuk) */
export async function masteryOf(code, indicator) {
  const rows = (await attemptsOf(code)).filter(a => a.mode === 'latihan' && a.indicator === indicator);
  return mastery(rows.flatMap(a => a.steps.map(s => ({ solved: s.correct, hintsUsed: s.hintLevel }))));
}

export async function getSetting(k, d) {
  const r = await db.settings.get(k);
  return r ? (r.v) : d;
}
export const setSetting = (k, v) => db.settings.put({ k, v });

/* ── Latihan Soal Berlevel: progres disimpan setiap jawaban agar bisa dilanjutkan tanpa mengulang dari nol ── */

/** Run terakhir untuk level ini (bermain / selesai / gagal), atau null */
export async function latestRun(code, level) {
  const rows = await db.questRuns.where('[studentCode+level]').equals([code, level]).toArray();
  const valid = rows.filter(r => isValidRun(r.run));
  return valid.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
}

/** Simpan run (buat baru bila belum ada id). Mengembalikan id. */
export async function saveRun(code, run, id) {
  const row = { studentCode: code, level: run.level, status: run.status, run, updatedAt: Date.now() };
  if (id) { await db.questRuns.put({ ...row, id }); return id; }
  return /** @type {number} */ (await db.questRuns.add(row));
}

export const logQuestAnswer = (e) => db.questAnswers.add(e);
export const logRest = (e) => db.rests.add(e);

/** Level yang pernah diselesaikan siswa */
export async function questDoneMap(code) {
  const rows = await db.questRuns.where('studentCode').equals(code).toArray();
  const done = { mudah: false, sedang: false, sulit: false };
  for (const r of rows) if (r.status === 'done' && r.level in done) done[r.level] = true;
  return done;
}
