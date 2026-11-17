import { db, SYNCED_TABLES, outboxRecord } from './db';
import { getSetting, setSetting } from './repo';

/* Pencadangan ke Supabase (permintaan peneliti, 17 Nov 2026).
   - Tanpa SDK pihak ketiga: memanggil REST Supabase (PostgREST) langsung dengan fetch (agents.md aturan 19).
   - Fungsi inti TIDAK menunggu jaringan: semua data ditulis dulu ke HP (Dexie), lalu dikirim dari antrean `outbox`.
   - Kunci yang dipakai aplikasi hanya boleh MENAMBAH baris (lihat supabase/schema.sql). Membaca data hanya bisa
     oleh pemilik proyek lewat Dashboard Supabase — siswa/HP lain tidak bisa melihat data siapa pun.
   - Yang dikirim hanya kode siswa (A01, S12, …) dan data belajar; tanpa nama, foto, email, atau lokasi. */

const ENV = /** @type {any} */ (import.meta).env ?? {};
export const DEFAULT_CLOUD = { url: (ENV.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, ''), key: (ENV.VITE_SUPABASE_ANON_KEY ?? '').trim() };
export const TABLE = 'mawiyas_records';
const BATCH = 100;

export const cloudConfigured = (cfg = DEFAULT_CLOUD) => /^https:\/\/.+/.test(cfg.url) && cfg.key.length > 20;

function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const b = globalThis.crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

async function deviceId() {
  let id = await getSetting('deviceId', null);
  if (!id) {
    // acak, bukan ID perangkat keras (sama dengan sync.js)
    id = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
    await setSetting('deviceId', id);
  }
  return id;
}

/** Baris outbox → baris tabel Supabase. `uid` dibuat sekali & disimpan agar kirim ulang tidak menggandakan data. */
async function ensureUid(rows) {
  const missing = rows.filter(r => !r.uid);
  for (const r of missing) r.uid = uuid();
  if (missing.length) await db.outbox.bulkPut(missing);
  return rows;
}
const toRemote = (r, dev) => ({
  id: r.uid, device_id: dev, table_name: r.table, local_key: r.key, student_code: r.studentCode,
  payload: r.payload, client_ts: new Date(r.ts).toISOString()
});

function headers(cfg) {
  const h = { 'Content-Type': 'application/json', apikey: cfg.key, Prefer: 'return=minimal' };
  // kunci lama (JWT "anon") juga dikirim sebagai Bearer; kunci baru "sb_publishable_…" cukup lewat apikey
  if (cfg.key.startsWith('eyJ')) h.Authorization = `Bearer ${cfg.key}`;
  return h;
}

async function post(cfg, body, fetchFn) {
  return fetchFn(`${cfg.url}/rest/v1/${TABLE}`, { method: 'POST', headers: headers(cfg), body: JSON.stringify(body) });
}

let running = null;

/**
 * Kirim isi outbox. Baris dihapus dari outbox HANYA setelah server menyimpannya.
 * @returns {Promise<{sent:number, pending:number, error?:string}>}
 */
export function flushOutbox(cfg = DEFAULT_CLOUD, fetchFn = globalThis.fetch) {
  if (!cloudConfigured(cfg)) return Promise.resolve({ sent: 0, pending: 0, error: 'Supabase belum diatur' });
  running ??= (async () => {
    let sent = 0;
    try {
      const dev = await deviceId();
      for (;;) {
        const rows = await ensureUid(await db.outbox.orderBy('id').limit(BATCH).toArray());
        if (!rows.length) break;
        const res = await post(cfg, rows.map(r => toRemote(r, dev)), fetchFn);
        if (res.ok) { await db.outbox.bulkDelete(rows.map(r => r.id)); sent += rows.length; continue; }
        if (res.status !== 409) throw new Error(`Supabase menolak (kode ${res.status})`);
        // 409 = sebagian baris sudah tersimpan sebelumnya (kiriman terputus). Kirim satu per satu; 409 dianggap sudah aman.
        for (const r of rows) {
          const one = await post(cfg, [toRemote(r, dev)], fetchFn);
          if (!one.ok && one.status !== 409) throw new Error(`Supabase menolak (kode ${one.status})`);
          await db.outbox.delete(r.id); sent++;
        }
      }
      await setSetting('cloudLastSync', Date.now());
      return { sent, pending: 0 };
    } catch (e) {
      return { sent, pending: await db.outbox.count(), error: e instanceof Error ? e.message : String(e) };
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Sekali saja: masukkan data lama (sebelum fitur cloud ada) ke outbox */
export async function backfillOnce() {
  if (await getSetting('cloudBackfillV1', false)) return 0;
  let n = 0;
  for (const t of SYNCED_TABLES) {
    const table = db.table(t);
    const pk = table.schema.primKey.keyPath;
    const rows = await table.toArray();
    await db.outbox.bulkAdd(rows.map(r => outboxRecord(t, r[/** @type {string} */ (pk)], r)));
    n += rows.length;
  }
  await setSetting('cloudBackfillV1', true);
  return n;
}

export const pendingCount = () => db.outbox.count();

/** Dijalankan sekali saat aplikasi dibuka. Mengirim saat online, tiap 60 detik, dan saat app ke latar belakang. */
export function startCloudSync() {
  if (typeof window === 'undefined') return () => {};
  // backfill tetap dijalankan walau Supabase belum diatur, agar data lama ikut terkirim begitu kunci dipasang
  const ready = backfillOnce().catch(() => 0);
  if (!cloudConfigured()) return () => {};
  const run = () => { if (navigator.onLine !== false) void flushOutbox(); };
  void ready.then(run);
  const timer = window.setInterval(run, 60_000);
  const onVis = () => { if (document.visibilityState === 'hidden') run(); };
  window.addEventListener('online', run);
  document.addEventListener('visibilitychange', onVis);
  return () => { window.clearInterval(timer); window.removeEventListener('online', run); document.removeEventListener('visibilitychange', onVis); };
}
