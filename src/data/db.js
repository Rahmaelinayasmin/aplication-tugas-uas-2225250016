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

// v2 (1.3.0): latihan berlevel yang bisa dilanjutkan, log jawaban, istirahat, dan antrean kirim ke cloud
db.version(2).stores({
  questRuns: '++id, studentCode, level, status, updatedAt, [studentCode+level]',
  questAnswers: '++id, studentCode, level, questionId, ts',
  rests: '++id, studentCode, ts',
  outbox: '++id'
});

export const APP_VERSION = '1.3.0';

/* ── Antrean cloud (outbox) ──
   Setiap data belajar yang ditulis ke tabel di bawah ikut dicatat ke `outbox`, lalu dikirim ke Supabase
   oleh src/data/cloud.js saat ada internet. Data tetap aman di HP walau offline; tidak ada yang hilang.
   Tabel `settings` TIDAK dikirim (berisi PIN guru & konfigurasi). */
export const SYNCED_TABLES = ['students', 'attempts', 'hintEvents', 'simulations', 'surveys', 'questRuns', 'questAnswers', 'rests'];

const studentOf = (table, obj) => (table === 'students' ? obj.code : obj.studentCode) ?? null;

export function outboxRecord(table, key, obj) {
  return { table, key: String(key), studentCode: studentOf(table, obj), payload: JSON.parse(JSON.stringify(obj)), ts: Date.now() };
}

function enqueue(table, key, obj) {
  // di luar transaksi tabel asal, supaya outbox tidak perlu masuk lingkup transaksi tersebut
  void Dexie.ignoreTransaction(() => db.outbox.add(outboxRecord(table, key, obj))).catch(() => { /* dicoba lagi lewat backfill */ });
}

for (const t of SYNCED_TABLES) {
  db.table(t).hook('creating', function (primKey, obj) {
    this.onsuccess = (key) => enqueue(t, key ?? primKey, { ...obj });
  });
  db.table(t).hook('updating', function (_mods, primKey) {
    this.onsuccess = (updated) => enqueue(t, primKey, updated);
  });
}
