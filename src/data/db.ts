import Dexie, { type EntityTable } from 'dexie';
import type { Indicator } from '../domain/learning/types';

/* Penyimpanan lokal (IndexedDB). Tidak ada nama asli, foto, lokasi, atau ID perangkat — hanya kode siswa (agents.md aturan 18). */

export type AttemptMode = 'latihan' | 'pretest' | 'posttest';

export interface Student {
  code: string;            // S01
  classCode: string;       // 8A
  createdAt: number;
  diagnosticScore: number | null; // 0..1
  remedialDone: boolean;
  lessonsDone: string[];
}

export interface AttemptStep {
  no: number;
  score: number;
  max: number;
  correct: boolean;
  ecf: boolean;
  needsReview: boolean;
  /** sudah dicek guru (skor alasan dikonfirmasi/diubah di Mode Guru) */
  reviewed?: boolean;
  answer: string;
  wrong: number;
  hintLevel: number;
  skipped: boolean;
}

export interface Attempt {
  id?: number;
  studentCode: string;
  mode: AttemptMode;
  itemId: string;
  indicator: Indicator;
  total: number;
  max: number;
  durationMs: number;
  hintsUsed: number;
  steps: AttemptStep[];
  /** F07: penjelasan siswa "untuk teman" setelah soal bernalar/menafsirkan */
  explanation?: string;
  appVersion: string;
  ts: number;
}

export interface HintEvent { id?: number; studentCode: string; itemId: string; stepNo: number; level: number; trigger: 'auto' | 'manual'; ts: number }
export interface SimulationEvent { id?: number; studentCode: string; object: string; variant: string; trials: number; eventId: string; eventCount: number; animated: boolean; ts: number }
export interface SurveyEvent { id?: number; studentCode: string; instrument: string; context: string; answers: Record<string, number>; ts: number }
export interface Setting { k: string; v: unknown }

export const db = new Dexie('mawiyas') as Dexie & {
  students: EntityTable<Student, 'code'>;
  attempts: EntityTable<Attempt, 'id'>;
  hintEvents: EntityTable<HintEvent, 'id'>;
  simulations: EntityTable<SimulationEvent, 'id'>;
  surveys: EntityTable<SurveyEvent, 'id'>;
  settings: EntityTable<Setting, 'k'>;
};

db.version(1).stores({
  students: 'code, classCode',
  attempts: '++id, studentCode, mode, itemId, ts',
  hintEvents: '++id, studentCode, itemId, ts',
  simulations: '++id, studentCode, ts',
  surveys: '++id, studentCode, ts',
  settings: 'k'
});

export const APP_VERSION = '1.2.0';
