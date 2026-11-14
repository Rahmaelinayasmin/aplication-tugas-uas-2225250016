import { db } from './db';
import { getSetting, setSetting } from './repo';

/* Sinkron OPSIONAL ke MaWiYas Server (Python/FastAPI, folder server/). Mati secara bawaan.
   Yang dikirim hanya kode siswa & data belajar — tidak ada nama. Mengirim ulang aman (server menolak duplikat). */

export interface SyncConfig { url: string; token: string; classCode: string; lastSync: number | null }

const clean = (url: string) => url.trim().replace(/\/+$/, '');

async function deviceId(): Promise<string> {
  let id = await getSetting<string | null>('deviceId', null);
  if (!id) {
    // acak, bukan ID perangkat keras
    id = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
    await setSetting('deviceId', id);
  }
  return id;
}

export const getSyncConfig = () => getSetting<SyncConfig | null>('sync', null);

async function call<T>(url: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  } catch {
    throw new Error('Server tidak bisa dihubungi. Pastikan HP dan laptop server di jaringan Wi-Fi yang sama dan alamatnya benar.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { detail?: string }).detail ?? `Server menolak (kode ${res.status}).`);
  return body as T;
}

export async function registerDevice(url: string, classCode: string, enrollKey: string): Promise<SyncConfig> {
  const base = clean(url);
  if (!/^https?:\/\/.+/.test(base)) throw new Error('Alamat server harus diawali http:// atau https://');
  const r = await call<{ deviceToken: string }>(`${base}/v1/devices/register`, { method: 'POST', body: JSON.stringify({ classCode, enrollKey }) });
  const cfg: SyncConfig = { url: base, token: r.deviceToken, classCode, lastSync: null };
  await setSetting('sync', cfg);
  return cfg;
}

export async function syncNow(): Promise<{ accepted: Record<string, number>; duplicates: Record<string, number> }> {
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
  const r = await call<{ accepted: Record<string, number>; duplicates: Record<string, number> }>(`${cfg.url}/v1/sync`, {
    method: 'POST', body: JSON.stringify(payload), headers: { Authorization: `Bearer ${cfg.token}` }
  });
  await setSetting('sync', { ...cfg, lastSync: Date.now() });
  return r;
}

export const forgetServer = () => setSetting('sync', null);
