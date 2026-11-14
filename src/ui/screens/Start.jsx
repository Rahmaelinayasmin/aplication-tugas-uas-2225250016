import { useEffect, useState } from 'react';
import { useApp } from '../../app/store';
import { CLASS_RE, CODE_RE, listStudents, login, updateStudent } from '../../data/repo';
import { DIAGNOSTIC, DIAGNOSTIC_PASS } from '../../domain/content/lessons';
import { isCorrect } from '../../domain/learning/scoring';
import { StepInput } from '../components/StepInput';
import { Logo } from '../components/Logo';

/* Masuk dengan KODE siswa (S01, S02…) — tanpa nama asli (pedoman C, agents.md aturan 18) */
export function LoginScreen() {
  const { setStudent, reset } = useApp();
  const [code, setCode] = useState('');
  const [cls, setCls] = useState('');
  const [err, setErr] = useState('');
  const [known, setKnown] = useState([]);
  useEffect(() => { listStudents().then(setKnown); }, []);

  const go = async (s) => { setStudent(s); reset({ name: s.diagnosticScore === null ? 'diagnostic' : 'home' }); };
  const submit = async (e) => {
    e.preventDefault();
    const c = code.trim().toUpperCase(), k = cls.trim().toUpperCase().replace(/\s/g, '');
    if (!CODE_RE.test(c)) { setErr('Kode siswa ditulis seperti S01 atau S12. Tanya gurumu kalau belum punya kode.'); return; }
    if (!CLASS_RE.test(k)) { setErr('Kode kelas ditulis seperti 8A atau 9B.'); return; }
    go(await login(c, k));
  };

  return (
    <main className="screen login">
      <div className="login-hero">
        <Logo size={64} />
        <h1>MaWiYas</h1>
        <p>Belajar peluang di lapangan: lempar koin, dadu, ambil kartu, dan temukan polanya.</p>
      </div>
      <form className="card form" onSubmit={submit}>
        <label htmlFor="code">Kode siswa</label>
        <input id="code" autoComplete="off" autoCapitalize="characters" placeholder="S01" value={code} onChange={e => { setCode(e.target.value); setErr(''); }} />
        <label htmlFor="cls">Kode kelas</label>
        <input id="cls" autoComplete="off" autoCapitalize="characters" placeholder="8A" value={cls} onChange={e => { setCls(e.target.value); setErr(''); }} />
        {err && <p className="fb bad">{err}</p>}
        <button className="btn primary" type="submit">Masuk</button>
        <p className="note">Aplikasi ini tidak meminta nama asli. Data belajarmu tersimpan di HP ini saja.</p>
      </form>
      {known.length > 0 && (
        <section className="card">
          <p className="label">Pernah masuk di HP ini</p>
          <div className="row">{known.map(s => <button key={s.code} className="chip" onClick={() => go(s)}>{s.code} · {s.classCode}</button>)}</div>
        </section>
      )}
    </main>
  );
}

/* Diagnostik pecahan (F01, IL03) */
export function DiagnosticScreen() {
  const { student, setStudent, reset, push } = useApp();
  const [i, setI] = useState(-1);
  const [val, setVal] = useState();
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(null);
  if (!student) return null;

  const next = async (ans) => {
    const r = right + (isCorrect(DIAGNOSTIC[i], ans, DIAGNOSTIC) ? 1 : 0);
    setRight(r); setVal(undefined);
    if (i + 1 < DIAGNOSTIC.length) { setI(i + 1); return; }
    const score = r / DIAGNOSTIC.length;
    const s = await updateStudent(student.code, { diagnosticScore: score, remedialDone: score >= DIAGNOSTIC_PASS });
    if (s) setStudent(s);
    setDone(score);
  };

  if (done !== null) {
    const pass = done >= DIAGNOSTIC_PASS;
    return (
      <main className="screen">
        <section className="card center-card">
          <h1>{pass ? 'Dasar pecahanmu siap!' : 'Yuk, pemanasan pecahan dulu'}</h1>
          <p>Kamu menjawab benar {Math.round(done * DIAGNOSTIC.length)} dari {DIAGNOSTIC.length} soal.</p>
          {pass
            ? <button className="btn primary" onClick={() => reset({ name: 'home' })}>Mulai belajar</button>
            : <>
                <p className="note">Hasil peluang selalu berupa pecahan. Pemanasan singkat ini membantu supaya hitunganmu tidak tersendat.</p>
                <button className="btn primary" onClick={() => { reset({ name: 'home' }); push({ name: 'lesson', id: 'pecahan' }); }}>Mulai Pecahan Kilat</button>
              </>}
        </section>
      </main>
    );
  }

  if (i < 0) return (
    <main className="screen">
      <section className="card center-card">
        <h1>Halo, {student.code}!</h1>
        <p>Sebelum mulai, ada 6 soal pecahan singkat. Ini bukan ulangan, hanya untuk tahu bagian mana yang perlu dibantu.</p>
        <button className="btn primary" onClick={() => setI(0)}>Mulai</button>
      </section>
    </main>
  );

  const step = DIAGNOSTIC[i];
  return (
    <main className="screen">
      <p className="pill">Soal {i + 1} dari {DIAGNOSTIC.length}</p>
      <section className="card step-card">
        <p className="step-prompt">{step.prompt}</p>
        <StepInput key={i} step={step} value={val} onChange={setVal} />
        <div className="row actions-row">
          <button className="btn primary grow" disabled={val === undefined} onClick={() => void next(val)}>Lanjut</button>
          <button className="btn ghost" onClick={() => void next(undefined)}>Belum tahu</button>
        </div>
      </section>
    </main>
  );
}
