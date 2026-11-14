import Dexie from 'dexie';

/* Penyimpanan lokal (IndexedDB). Tidak ada nama asli, foto, lokasi, atau ID perangkat — hanya kode siswa (agents.md aturan 18). */

export const db = new Dexie('mawiyas');

db.version(1).stores({
  students: 'code, classCode',
  attempts: '++id, studentCode, mode, itemId, ts',
  hintEvents: '++id, studentCode, itemId, ts',
  simulations: '++id, studentCode, ts',
  surveys: '++id, studentCode, ts',
  settings: 'k'
});

export const APP_VERSION = '1.2.0';
