import { db,  } from './db';
import { mastery } from '../domain/learning/hints';

export const CODE_RE = /^S\d{2,3}$/;
export const CLASS_RE = /^[0-9]{1,2}[A-Z]{0,2}$/;

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
