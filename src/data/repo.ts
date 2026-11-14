import { db, type Attempt, type AttemptMode, type HintEvent, type SimulationEvent, type Student, type SurveyEvent } from './db';
import { mastery } from '../domain/learning/hints';
import type { Indicator } from '../domain/learning/types';

export const CODE_RE = /^S\d{2,3}$/;
export const CLASS_RE = /^[0-9]{1,2}[A-Z]{0,2}$/;

export async function login(code: string, classCode: string): Promise<Student> {
  const existing = await db.students.get(code);
  if (existing) {
    if (existing.classCode !== classCode) { existing.classCode = classCode; await db.students.put(existing); }
    return existing;
  }
  const s: Student = { code, classCode, createdAt: Date.now(), diagnosticScore: null, remedialDone: false, lessonsDone: [] };
  await db.students.put(s);
  return s;
}

export const listStudents = () => db.students.orderBy('code').toArray();
export const getStudent = (code: string) => db.students.get(code);
export async function updateStudent(code: string, patch: Partial<Student>): Promise<Student | undefined> {
  await db.students.update(code, patch);
  return db.students.get(code);
}

export const saveAttempt = (a: Attempt) => db.attempts.add(a);
export const attemptsOf = (code: string) => db.attempts.where('studentCode').equals(code).toArray();
export const logHint = (e: HintEvent) => db.hintEvents.add(e);
export const logSimulation = (e: SimulationEvent) => db.simulations.add(e);
export const saveSurvey = (e: SurveyEvent) => db.surveys.add(e);

export async function testDone(code: string, mode: AttemptMode): Promise<boolean> {
  return (await db.attempts.where({ studentCode: code }).filter(a => a.mode === mode).count()) > 0;
}

/** Mastery per indikator dari riwayat latihan (dipakai untuk fading petunjuk) */
export async function masteryOf(code: string, indicator: Indicator): Promise<number> {
  const rows = (await attemptsOf(code)).filter(a => a.mode === 'latihan' && a.indicator === indicator);
  return mastery(rows.flatMap(a => a.steps.map(s => ({ solved: s.correct, hintsUsed: s.hintLevel }))));
}

export async function getSetting<T>(k: string, d: T): Promise<T> {
  const r = await db.settings.get(k);
  return r ? (r.v as T) : d;
}
export const setSetting = (k: string, v: unknown) => db.settings.put({ k, v });
