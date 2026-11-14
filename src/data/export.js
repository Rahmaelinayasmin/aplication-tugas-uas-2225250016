import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { db } from './db';

/* Ekspor data penelitian (F13) — dibagikan manual oleh guru/peneliti lewat Share sheet (WhatsApp, Drive, dll.). */

function csv(rows) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map(r => r.map(esc).join(',')).join('\n');
}
const iso = (ts) => new Date(ts).toISOString();

export async function buildExport(kind) {
  const stamp = new Date().toISOString().slice(0, 10);
  if (kind === 'semua-json') {
    const data = JSON.stringify({
      exportedAt: new Date().toISOString(),
      students: await db.students.toArray(), attempts: await db.attempts.toArray(), hintEvents: await db.hintEvents.toArray(),
      simulations: await db.simulations.toArray(), surveys: await db.surveys.toArray()
    }, null, 1);
    return { name: `mawiyas-semua-${stamp}.json`, data, mime: 'application/json' };
  }
  const students = new Map((await db.students.toArray()).map(s => [s.code, s]));
  const cls = (code) => students.get(code)?.classCode ?? '';
  if (kind === 'ringkasan') {
    const rows = [['student_code', 'class_code', 'mode', 'item_id', 'indicator', 'score', 'max', 'duration_ms', 'hints_used', 'needs_review', 'explanation', 'app_version', 'timestamp']];
    for (const a of await db.attempts.orderBy('ts').toArray())
      rows.push([a.studentCode, cls(a.studentCode), a.mode, a.itemId, a.indicator, a.total, a.max, a.durationMs, a.hintsUsed, a.steps.some(s => s.needsReview && !s.reviewed), a.explanation ?? '', a.appVersion, iso(a.ts)]);
    return { name: `ringkasan-skor-${stamp}.csv`, data: csv(rows), mime: 'text/csv' };
  }
  if (kind === 'tahap') {
    const rows = [['student_code', 'class_code', 'mode', 'item_id', 'indicator', 'step_no', 'step_score', 'step_max', 'correct', 'ecf', 'needs_review', 'skipped', 'wrong_tries', 'hint_level', 'answer', 'timestamp']];
    for (const a of await db.attempts.orderBy('ts').toArray())
      for (const s of a.steps)
        rows.push([a.studentCode, cls(a.studentCode), a.mode, a.itemId, a.indicator, s.no, s.score, s.max, s.correct, s.ecf, s.needsReview && !s.reviewed, s.skipped, s.wrong, s.hintLevel, s.answer, iso(a.ts)]);
    return { name: `skor-per-tahap-${stamp}.csv`, data: csv(rows), mime: 'text/csv' };
  }
  if (kind === 'petunjuk') {
    const rows = [['student_code', 'class_code', 'item_id', 'step_no', 'level', 'trigger', 'timestamp']];
    for (const h of await db.hintEvents.orderBy('ts').toArray()) rows.push([h.studentCode, cls(h.studentCode), h.itemId, h.stepNo, h.level, h.trigger, iso(h.ts)]);
    return { name: `petunjuk-${stamp}.csv`, data: csv(rows), mime: 'text/csv' };
  }
  if (kind === 'simulasi') {
    const rows = [['student_code', 'class_code', 'object', 'variant', 'trials', 'event_id', 'event_count', 'animated', 'timestamp']];
    for (const s of await db.simulations.orderBy('ts').toArray()) rows.push([s.studentCode, cls(s.studentCode), s.object, s.variant, s.trials, s.eventId, s.eventCount, s.animated, iso(s.ts)]);
    return { name: `simulasi-lab-${stamp}.csv`, data: csv(rows), mime: 'text/csv' };
  }
  const surveys = await db.surveys.orderBy('ts').toArray();
  const ids = Array.from(new Set(surveys.flatMap(s => Object.keys(s.answers)))).sort();
  const rows = [['student_code', 'class_code', 'instrument', 'context', ...ids, 'timestamp']];
  for (const s of surveys) rows.push([s.studentCode, cls(s.studentCode), s.instrument, s.context, ...ids.map(i => s.answers[i] ?? ''), iso(s.ts)]);
  return { name: `kuesioner-beban-kognitif-${stamp}.csv`, data: csv(rows), mime: 'text/csv' };
}

export async function shareExport(kind) {
  const f = await buildExport(kind);
  if (Capacitor.isNativePlatform()) {
    const res = await Filesystem.writeFile({ path: f.name, data: f.data, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: f.name, url: res.uri, dialogTitle: 'Kirim data penelitian' });
    return f.name;
  }
  const url = URL.createObjectURL(new Blob([f.data], { type: f.mime }));
  const a = document.createElement('a'); a.href = url; a.download = f.name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return f.name;
}
