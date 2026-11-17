import { useEffect, useState } from 'react';
import { useApp } from '../../app/store';
import { db, APP_VERSION } from '../../data/db';
import { attemptsOf, getSetting, listStudents, setSetting } from '../../data/repo';
import { shareExport } from '../../data/export';
import { INDICATORS } from '../../domain/learning/types';
import { GLOSSARY, LESSONS } from '../../domain/content/lessons';
import { TEST_ITEMS, TEST_MAX } from '../../domain/content/testItems';
import { Rich, TopBar } from '../components/common';
import { Widget } from '../components/widgets';
import { forgetServer, getSyncConfig, registerDevice, syncNow } from '../../data/sync';

/* ───────────── Sinkron ke MaWiYas Server (Python/FastAPI) ───────────── */
function SyncCard() {
  const { toast } = useApp();
  const [cfg, setCfg] = useState(null);
  const [url, setUrl] = useState('http://192.168.1.10:8000');
  const [key, setKey] = useState('');
  const [cls, setCls] = useState('8A');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => { getSyncConfig().then(setCfg); }, []);

  const run = async (fn) => {
    setBusy(true); setMsg(null);
    try { const t = await fn(); setMsg({ ok: true, text: t }); setCfg(await getSyncConfig()); }
    catch (e) { setMsg({ ok: false, text: (e).message }); }
    finally { setBusy(false); }
  };

  return (
    <section className="card form">
      <p className="label">Sinkron ke server (opsional)</p>
      {!cfg ? (
        <>
          <p className="note">Kirim data HP ini ke MaWiYas Server di laptop peneliti (satu jaringan Wi-Fi). Tanpa sinkron pun, ekspor file di atas tetap bisa dipakai.</p>
          <label htmlFor="sv-url">Alamat server</label>
          <input id="sv-url" inputMode="url" autoCapitalize="off" value={url} onChange={e => setUrl(e.target.value)} />
          <label htmlFor="sv-key">Kunci pendaftaran</label>
          <input id="sv-key" autoCapitalize="off" value={key} onChange={e => setKey(e.target.value)} />
          <label htmlFor="sv-cls">Kode kelas</label>
          <input id="sv-cls" autoCapitalize="characters" value={cls} onChange={e => setCls(e.target.value.toUpperCase())} />
          <button className="btn primary" disabled={busy || !key} onClick={() => run(async () => { await registerDevice(url, cls, key); return 'HP terdaftar. Sekarang data bisa dikirim.'; })}>
            {busy ? 'Menghubungi…' : 'Daftarkan HP ini'}
          </button>
        </>
      ) : (
        <>
          <p className="note">Server: <b>{cfg.url}</b> · kelas {cfg.classCode}<br />Terakhir dikirim: {cfg.lastSync ? new Date(cfg.lastSync).toLocaleString('id-ID') : 'belum pernah'}</p>
          <div className="row">
            <button className="btn primary" disabled={busy} onClick={() => run(async () => {
              const r = await syncNow();
              toast('Data terkirim ke server');
              return `Terkirim: ${r.accepted.attempts} soal, ${r.accepted.surveys} kuesioner baru (${r.duplicates.attempts} sudah ada sebelumnya).`;
            })}>{busy ? 'Mengirim…' : 'Kirim data sekarang'}</button>
            <button className="btn ghost small" disabled={busy} onClick={async () => { await forgetServer(); setCfg(null); setMsg(null); }}>Lupakan server</button>
          </div>
        </>
      )}
      {msg && <p className={'fb ' + (msg.ok ? 'ok' : 'bad')}>{msg.text}</p>}
    </section>
  );
}

/* ───────────── Progres siswa ───────────── */
export function ProgressScreen() {
  const { student, push } = useApp();
  const [atts, setAtts] = useState([]);
  useEffect(() => { if (student) attemptsOf(student.code).then(setAtts); }, [student]);
  if (!student) return null;
  const prac = atts.filter(a => a.mode === 'latihan');
  return (
    <main className="screen">
      <TopBar title="Progres Saya" sub={`${student.code} · kelas ${student.classCode}`} />
      <section className="card">
        <p className="label">Langkah yang kamu selesaikan sendiri (tanpa petunjuk)</p>
        {INDICATORS.map(ind => {
          const steps = prac.filter(a => a.indicator === ind.id).flatMap(a => a.steps);
          const self = steps.filter(s => s.correct && s.hintLevel === 0).length;
          const pct = steps.length ? self / steps.length : 0;
          return (
            <div key={ind.id} className="bar-row">
              <span>{ind.short}</span>
              <div className="bar"><i style={{ width: pct * 100 + '%' }} /></div>
              <b>{steps.length ? `${self}/${steps.length}` : '–'}</b>
            </div>
          );
        })}
        <p className="note">Bar penuh artinya kamu makin mandiri. Petunjuk akan makin jarang muncul.</p>
      </section>
      <section className="card">
        <p className="label">Belajar Bertahap</p>
        <div className="row">{LESSONS.map(l => <span key={l.id} className={'pill' + (student.lessonsDone.includes(l.id) ? ' ok' : '')}>Unit {l.no}</span>)}</div>
        <p className="note">Diagnostik pecahan: {student.diagnosticScore === null ? 'belum' : `${Math.round(student.diagnosticScore * 6)}/6`}{student.remedialDone ? '' : ' · Pecahan Kilat belum selesai'}</p>
      </section>
      <button className="btn block" onClick={() => push({ name: 'survey', context: 'latihan' })}>Isi kuesioner pengalaman belajar</button>
    </main>
  );
}

/* ───────────── Guru / Peneliti (PIN) ───────────── */
export function TeacherScreen() {
  const { toast } = useApp();
  const [ok, setOk] = useState(false);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [rows, setRows] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [newPin, setNewPin] = useState('');
  const [confirmWipe, setConfirmWipe] = useState(false);

  const load = async () => {
    const all = await db.attempts.toArray();
    const last = (code, mode) => { const r = all.filter(a => a.studentCode === code && a.mode === mode).sort((a, b) => a.ts - b.ts); if (!r.length) return null; const t = r[r.length - 1].ts; return r.filter(a => Math.abs(a.ts - t) < 3 * 3600e3).reduce((x, a) => x + a.total, 0); };
    setRows((await listStudents()).map(s => ({
      s, diag: s.diagnosticScore, pre: last(s.code, 'pretest'), post: last(s.code, 'posttest'),
      review: all.filter(a => a.studentCode === s.code && a.mode !== 'latihan').flatMap(a => a.steps).filter(x => x.needsReview && !x.reviewed).length
    })));
    setReviews(all.filter(a => a.mode !== 'latihan' && a.steps.some(s => s.needsReview && !s.reviewed)));
  };
  useEffect(() => { if (ok) void load(); }, [ok]);

  const enter = async () => { if (pin === (await getSetting('teacherPin', '1234'))) setOk(true); else setErr('PIN salah.'); };
  const exp = async (k) => { try { const n = await shareExport(k); toast(`${n} siap dibagikan`); } catch (e) { toast('Gagal mengekspor: ' + (e).message); } };
  const review = async (a, no, score) => {
    const steps = a.steps.map(s => (s.no === no ? { ...s, score, reviewed: true } : s));
    await db.attempts.update(a.id, { steps, total: steps.reduce((x, s) => x + s.score, 0) });
    void load();
  };

  if (!ok) return (
    <main className="screen">
      <TopBar title="Guru / Peneliti" />
      <section className="card form">
        <p>Area ini untuk guru dan peneliti: ringkasan skor, pengecekan jawaban alasan, dan ekspor data.</p>
        <label htmlFor="tpin">PIN guru</label>
        <input id="tpin" type="password" inputMode="numeric" value={pin} onChange={e => { setPin(e.target.value); setErr(''); }} />
        {err && <p className="fb bad">{err}</p>}
        <button className="btn primary" onClick={enter}>Masuk</button>
        <p className="note">PIN awal: 1234. Segera ganti setelah masuk.</p>
      </section>
    </main>
  );

  const gain = (r) => (r.pre !== null && r.post !== null && r.pre < TEST_MAX ? (r.post - r.pre) / (TEST_MAX - r.pre) : null);
  return (
    <main className="screen">
      <TopBar title="Guru / Peneliti" sub="Data di HP ini" />
      <section className="card">
        <p className="label">Ringkasan per kode siswa</p>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Kode</th><th>Kelas</th><th>Diag.</th><th>Pre /{TEST_MAX}</th><th>Post /{TEST_MAX}</th><th>N-gain</th><th>Cek</th></tr></thead>
            <tbody>
              {rows.map(r => {
                const g = gain(r);
                return (
                  <tr key={r.s.code}>
                    <td>{r.s.code}</td><td>{r.s.classCode}</td>
                    <td>{r.diag === null ? '–' : Math.round(r.diag * 100) + '%'}</td>
                    <td>{r.pre ?? '–'}</td><td>{r.post ?? '–'}</td>
                    <td>{g === null ? '–' : g.toLocaleString('id-ID', { maximumFractionDigits: 2 })}</td>
                    <td>{r.review || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="note">Skor tes = sesi pretest/posttest terakhir. N-gain = (post − pre) / ({TEST_MAX} − pre). Kolom "Cek" = jawaban alasan yang belum dicek.</p>
      </section>

      {reviews.length > 0 && (
        <section className="card">
          <p className="label">Cek jawaban alasan</p>
          {reviews.flatMap(a => a.steps.filter(s => s.needsReview && !s.reviewed).map(s => {
            const item = TEST_ITEMS.find(i => i.id === a.itemId);
            const st = item?.steps.find(x => x.no === s.no);
            return (
              <div key={`${a.id}-${s.no}`} className="review">
                <p className="note">{a.studentCode} · {a.mode} · {item?.title} · tahap {s.no}</p>
                <p className="review-ans">“{s.answer || '(kosong)'}”</p>
                {st?.check.type === 'reason' && <p className="note">Contoh: {st.check.model}</p>}
                <div className="row">
                  <span className="note">Skor otomatis: <b>{s.score}</b></span>
                  <button className="btn small" onClick={() => review(a, s.no, 1)}>Beri 1</button>
                  <button className="btn small" onClick={() => review(a, s.no, 0)}>Beri 0</button>
                </div>
              </div>
            );
          }))}
        </section>
      )}

      <section className="card">
        <p className="label">Ekspor data (CSV)</p>
        <div className="row">
          <button className="btn" onClick={() => exp('ringkasan')}>Ringkasan skor</button>
          <button className="btn" onClick={() => exp('tahap')}>Skor per tahap</button>
          <button className="btn" onClick={() => exp('petunjuk')}>Petunjuk</button>
          <button className="btn" onClick={() => exp('simulasi')}>Simulasi lab</button>
          <button className="btn" onClick={() => exp('kuesioner')}>Kuesioner</button>
          <button className="btn ghost" onClick={() => exp('semua-json')}>Semua (JSON)</button>
        </div>
        <p className="note">File hanya berisi kode siswa, tanpa nama. Kirim lewat WhatsApp, Drive, atau email.</p>
      </section>

      <SyncCard />

      <section className="card form">
        <p className="label">Ganti PIN guru</p>
        <input type="password" inputMode="numeric" placeholder="PIN baru (4–8 angka)" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))} />
        <button className="btn" disabled={newPin.length < 4} onClick={async () => { await setSetting('teacherPin', newPin); setNewPin(''); toast('PIN guru diganti'); }}>Simpan PIN</button>
      </section>

      <section className="card form">
        <p className="label">Hapus semua data di HP ini</p>
        {!confirmWipe ? <button className="btn danger" onClick={() => setConfirmWipe(true)}>Hapus semua data…</button> : (
          <>
            <p className="fb warn">Semua data siswa, skor, dan kuesioner di HP ini akan hilang dan tidak bisa dikembalikan. Pastikan sudah diekspor.</p>
            <div className="row">
              <button className="btn danger" onClick={async () => { await Promise.all([db.students.clear(), db.attempts.clear(), db.hintEvents.clear(), db.simulations.clear(), db.surveys.clear(), db.questRuns.clear(), db.questAnswers.clear(), db.rests.clear()]); await setSetting('lastStudent', null); setConfirmWipe(false); toast('Semua data dihapus'); location.reload(); }}>Ya, hapus</button>
              <button className="btn ghost" onClick={() => setConfirmWipe(false)}>Batal</button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

/* ───────────── Pengaturan ───────────── */
export function SettingsScreen() {
  const { settings, updateSettings, setStudent, reset, student } = useApp();
  return (
    <main className="screen">
      <TopBar title="Pengaturan" />
      <section className="card form">
        <label className="sw-row" htmlFor="opt-focus"><span>Mode Fokus<small>Rumput diam, tampilan lebih tenang</small></span>
          <input id="opt-focus" type="checkbox" checked={settings.focus} onChange={e => updateSettings({ focus: e.target.checked })} /></label>
        <label className="sw-row" htmlFor="opt-reduce"><span>Kurangi gerakan<small>Hasil langsung tampil tanpa animasi lempar</small></span>
          <input id="opt-reduce" type="checkbox" checked={settings.reduced} onChange={e => updateSettings({ reduced: e.target.checked })} /></label>
        <label className="sw-row" htmlFor="opt-q"><span>Kualitas grafis 3D<small>Pilih Hemat bila HP terasa panas atau patah-patah</small></span>
          <select id="opt-q" value={settings.quality} onChange={e => updateSettings({ quality: e.target.value })}>
            <option value="auto">Otomatis</option><option value="hemat">Hemat</option><option value="sedang">Sedang</option><option value="tinggi">Tinggi</option>
          </select></label>
        <label className="sw-row" htmlFor="opt-sound"><span>Suara<small>Bunyi lembut saat koin, dadu, atau kartu keluar</small></span>
          <input id="opt-sound" type="checkbox" checked={settings.sound} onChange={e => updateSettings({ sound: e.target.checked })} /></label>
        <label className="sw-row" htmlFor="opt-haptic"><span>Getar<small>Getar singkat saat hasil keluar</small></span>
          <input id="opt-haptic" type="checkbox" checked={settings.haptic} onChange={e => updateSettings({ haptic: e.target.checked })} /></label>
        <div className="sw-row"><span>Ukuran teks<small>Perbesar bila tulisan terasa kecil</small></span>
          <div className="row" role="radiogroup" aria-label="Ukuran teks">
            {([1, 1.15, 1.3]).map(z => (
              <button key={z} className="chip opt" role="radio" aria-pressed={settings.textScale === z} aria-checked={settings.textScale === z} onClick={() => updateSettings({ textScale: z })}>{Math.round(z * 100)}%</button>
            ))}
          </div>
        </div>
      </section>
      <section className="card form">
        <p className="note">Masuk sebagai <b>{student?.code}</b>. HP ini bisa dipakai bergantian dengan kode siswa yang berbeda.</p>
        <button className="btn" onClick={() => { setStudent(null); reset({ name: 'intro' }); }}>Ganti kode siswa</button>
      </section>
      <p className="note center">MaWiYas {APP_VERSION} · tanpa iklan · data tersimpan di HP ini</p>
    </main>
  );
}

/* ───────────── Kamus benda peluang (F09) ───────────── */
export function GlossaryScreen() {
  return (
    <main className="screen">
      <TopBar title="Kamus Benda Peluang" sub="Kenalan dulu sebelum mengerjakan soal" />
      {Object.entries(GLOSSARY).map(([k, g]) => (
        <section key={k} className="card">
          <h2>{g.title}</h2>
          <Rich html={g.body} className="rich" />
          {g.widget && <Widget k={g.widget} />}
        </section>
      ))}
    </main>
  );
}
