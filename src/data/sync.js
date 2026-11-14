import { db } from './db';
import { getSetting, setSetting } from './repo';

/* Sinkron OPSIONAL ke MaWiYas Server (Python/FastAPI, folder server/). Mati secara bawaan.
   Yang dikirim hanya kode siswa & data belajar — tidak ada nama. Mengirim ulang aman (server menolak duplikat). */

const clean = (url) => url.trim().replace(/\/+$/, '');

async function deviceId() {
  let id = await getSetting('deviceId', null);
  if (!id) {
    // acak, bukan ID perangkat keras
    id = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
    await setSetting('deviceId', id);
  }
  return id;
}

export const getSyncConfig = () => getSetting('sync', null);

async function call(url, init) {
  let res;
  try {
    res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  } catch {
    throw new Error('Server tidak bisa dihubungi. Pastikan HP dan laptop server di jaringan Wi-Fi yang sama dan alamatnya benar.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body).detail ?? `Server menolak (kode ${res.status}).`);
  return body;
}

export async function registerDevice(url, classCode, enrollKey) {
  const base = clean(url);
  if (!/^https?:\/\/.+/.test(base)) throw new Error('Alamat server harus diawali http:// atau https://');
  const r = await call(`${base}/v1/devices/register`, { method: 'POST', body: JSON.stringify({ classCode, enrollKey }) });
  const cfg = { url: base, token: r.deviceToken, classCode, lastSync: null };
  await setSetting('sync', cfg);
  return cfg;
}

export async function syncNow() {
  const cfg = await getSyncConfig();
  if (!cfg) throw new Error('HP belum didaftarkan ke server.');
  const payload = {
    deviceId: await deviceId(),
    students: await db.students.toArray(),
    attempts: await db.attempts.toArray(),
    hintEvents: await db.hintEvents.toArray(),
    simulations: await db.simulations.toArray(),
    surveys: await db.surveys.toArray()
  };
  const r = await call(`${cfg.url}/v1/sync`, {
    method: 'POST', body: JSON.stringify(payload), headers: { Authorization: `Bearer ${cfg.token}` }
  });
  await setSetting('sync', { ...cfg, lastSync: Date.now() });
  return r;
}

export const forgetServer = () => setSetting('sync', null);
