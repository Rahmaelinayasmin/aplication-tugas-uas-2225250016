import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/data/db';
import { CLASS_RE, CODE_RE, latestRun, login, normClass, normCode, questDoneMap, saveRun, setSetting } from '../src/data/repo';
import { backfillOnce, flushOutbox } from '../src/data/cloud';
import { answer, newRun } from '../src/domain/learning/quest';
import { questItemsOf } from '../src/domain/content/questItems';

const CFG = { url: 'https://contoh.supabase.co', key: 'sb_publishable_kunci_uji_coba_panjang' };
const settle = () => new Promise(r => setTimeout(r, 20));

beforeEach(async () => {
  await Promise.all(db.tables.map(t => t.clear()));
});

describe('Kode siswa & kelas', () => {
  it('huruf apa saja + angka berapa saja', () => {
    for (const c of ['S01', 'A01', 'B12', 'Z1', 'AB1234567']) expect(CODE_RE.test(c)).toBe(true);
    for (const c of ['01', 'Budi', 'S', 'S01X', 'ABCD1']) expect(CODE_RE.test(c)).toBe(false);
    expect(normCode(' a01 ')).toBe('A01');
  });
  it('kode kelas bebas (huruf/angka, ≤ 12)', () => {
    for (const c of ['8A', 'VIII-B', 'KELAS 2', '9']) expect(CLASS_RE.test(normClass(c))).toBe(true);
    expect(CLASS_RE.test('ABCDEFGHIJKLM')).toBe(false);
  });
});

describe('Progres latihan berlevel tersimpan & bisa dilanjutkan', () => {
  it('melanjutkan dari soal terakhir', async () => {
    await login('A01', '8A');
    let r = newRun('sedang', questItemsOf('sedang').map(q => q.id));
    const id = await saveRun('A01', r);
    r = answer(answer(answer(r, true), false), true);
    await saveRun('A01', r, id);
    const back = await latestRun('A01', 'sedang');
    expect(back?.id).toBe(id);
    expect(back?.run.index).toBe(2);
    expect(back?.run.meter).toBe(95);
    expect(back?.run.km).toBe(1);
    expect((await questDoneMap('A01')).sedang).toBe(false);
  });
});

describe('Antrean cloud (Supabase)', () => {
  it('setiap data belajar masuk outbox; pengaturan tidak', async () => {
    await login('B07', 'VIII-B');
    await db.attempts.add({ studentCode: 'B07', mode: 'latihan', itemId: 'X', steps: [], ts: 1 });
    await setSetting('teacherPin', '9999');
    await settle();
    const rows = await db.outbox.toArray();
    expect(rows.map(r => r.table).sort()).toEqual(['attempts', 'students']);
    expect(rows.every(r => r.studentCode === 'B07')).toBe(true);
    expect(JSON.stringify(rows)).not.toContain('9999');
  });

  it('terkirim lalu dihapus dari outbox; gagal → tetap tersimpan', async () => {
    await login('C03', '7C');
    await settle();
    const fail = async () => new Response('{}', { status: 500 });
    const r1 = await flushOutbox(CFG, fail);
    expect(r1.error).toBeTruthy();
    expect(await db.outbox.count()).toBe(1);

    const sent = [];
    const ok = async (url, init) => { sent.push({ url, init }); return new Response(null, { status: 201 }); };
    const r2 = await flushOutbox(CFG, ok);
    expect(r2.sent).toBe(1);
    expect(await db.outbox.count()).toBe(0);
    const body = JSON.parse(sent[0].init.body);
    expect(sent[0].url).toBe('https://contoh.supabase.co/rest/v1/mawiyas_records');
    expect(sent[0].init.headers.apikey).toBe(CFG.key);
    expect(body[0]).toMatchObject({ table_name: 'students', local_key: 'C03', student_code: 'C03' });
    expect(body[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('kiriman terputus (409) tidak menggandakan & tidak macet', async () => {
    await login('D04', '8D');
    await db.rests.add({ studentCode: 'D04', ts: 1 });
    await settle();
    let call = 0;
    const f = async () => { call++; return new Response(null, { status: call === 1 ? 409 : call === 2 ? 409 : 201 }); };
    const r = await flushOutbox(CFG, f);
    expect(r.error).toBeUndefined();
    expect(await db.outbox.count()).toBe(0);
  });

  it('data lama dimasukkan sekali saja (backfill)', async () => {
    await login('E05', '9A');
    await settle();
    await db.outbox.clear();
    expect(await backfillOnce()).toBe(1);
    expect(await backfillOnce()).toBe(0);
    expect(await db.outbox.count()).toBe(1);
  });
});
