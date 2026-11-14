import { useCallback, useState } from 'react';
import { RANKS, SUITS, sample } from '../../domain/probability/spaces';
import { gcd } from '../../domain/probability/fraction';
import { STORY } from '../../domain/content/lessons';
import { FrequencyChart } from './FrequencyChart';
import { Frac, ProbabilityMeter } from './common';

export function Widget({ k }) {
  switch (k) {
    case 'deck': return <DeckGrid />;
    case 'tree2c': return <Tree2C />;
    case 'grid2d': return <Grid2D />;
    case 'pattern': return <PatternCard />;
    case 'meter': return <MeterWidget />;
    case 'empiris': return <EmpirisWidget />;
    case 'story': return <StoryWidget />;
    case 'fraction': return <FractionWidget />;
  }
}

/* ── Kartu remi 4 × 13 (EL01: konteks asing dikenalkan dulu) ── */
const DECK_FILTERS = [
  { label: 'Semua', test: () => true },
  ...SUITS.map(s => ({ label: `${s.sym} ${s.name}`, test: (_, x) => x.k === s.k })),
  { label: 'Merah', test: (_, s) => s.red },
  { label: 'As', test: r => r === 'A' },
  { label: 'Bergambar (J, Q, K)', test: r => ['J', 'Q', 'K'].includes(r) }
];
export function DeckGrid() {
  const [f, setF] = useState(0);
  const flt = DECK_FILTERS[f];
  const n = SUITS.reduce((a, s) => a + RANKS.filter(r => flt.test(r, s)).length, 0);
  return (
    <div className="widget">
      <div className="row">{DECK_FILTERS.map((d, i) => <button key={d.label} className="chip opt" aria-pressed={i === f} onClick={() => setF(i)}>{d.label}</button>)}</div>
      <div className="deck-grid" role="img" aria-label={`${n} kartu disorot`}>
        {SUITS.map(s => RANKS.map(r => (
          <span key={r + s.k} className={'pcard' + (flt.test(r, s) ? ' on' : '') + (s.red ? ' red' : '')}>
            <b>{r}</b><i>{s.sym}</i>
          </span>
        )))}
      </div>
      <p className="note">Disorot: <span className="na-t">{n} kartu</span> dari <span className="ns-t">52 kartu</span></p>
    </div>
  );
}

/* ── Diagram pohon 2 koin (GL01: membangun sendiri) ── */
export function Tree2C() {
  const [l1, setL1] = useState(false);
  const [l2, setL2] = useState(new Set());
  const leaves = l1 ? ['A', 'G'].flatMap(a => (l2.has(a) ? [a + 'A', a + 'G'] : [])) : [];
  const Y1 = { A: 55, G: 155 };
  const grow2 = (a) => setL2(s => new Set(s).add(a));
  return (
    <div className="widget">
      <svg viewBox="0 0 320 210" className="tree" role="img" aria-label="Diagram pohon dua koin">
        <text x="6" y="14" className="tree-h">mulai</text><text x="110" y="14" className="tree-h">koin 1</text><text x="210" y="14" className="tree-h">koin 2</text>
        {l1 && ['A', 'G'].map(a => <line key={a} x1="34" y1="105" x2="122" y2={Y1[a]} className="tree-l" />)}
        {l1 && ['A', 'G'].flatMap(a => (l2.has(a) ? ['A', 'G'].map((b, j) => <line key={a + b} x1="140" y1={Y1[a]} x2="222" y2={Y1[a] - 25 + j * 50} className="tree-l" />) : []))}
        <g role="button" tabIndex={0} onClick={() => setL1(true)} className="tree-node">
          <circle cx="22" cy="105" r="15" /><text x="22" y="110">•</text>
        </g>
        {l1 && ['A', 'G'].map(a => (
          <g key={a} role="button" tabIndex={0} onClick={() => grow2(a)} className={'tree-node' + (l2.has(a) ? '' : ' pulse')}>
            <circle cx="132" cy={Y1[a]} r="15" /><text x="132" y={Y1[a] + 5}>{a}</text>
          </g>
        ))}
        {leaves.map(lf => {
          const y = Y1[lf[0]] - 25 + (lf[1] === 'A' ? 0 : 50);
          return (
            <g key={lf} className="tree-node leaf">
              <circle cx="232" cy={y} r="13" /><text x="232" y={y + 5}>{lf[1]}</text>
              <text x="262" y={y + 5} className="tree-out">{lf}</text>
            </g>
          );
        })}
      </svg>
      <p className="note">
        {!l1 ? 'Ketuk titik "mulai" untuk melempar koin 1.' : leaves.length < 4 ? 'Ketuk A atau G untuk melempar koin 2.' : <>Ujung cabang: {'{'}{leaves.join(', ')}{'}'} → <span className="ns-t">n(S) = 4</span></>}
      </p>
      {(l1 || l2.size > 0) && <button className="btn ghost small" onClick={() => { setL1(false); setL2(new Set()); }}>Ulangi</button>}
    </div>
  );
}

/* ── Tabel ruang sampel 2 dadu, diisi baris demi baris (EL04: tempo dikendalikan siswa) ── */
export function Grid2D() {
  const [rows, setRows] = useState(1);
  const [pick, setPick] = useState(null);
  // Tahap "buat sendiri" (F03): setelah tabel penuh, siswa menandai sendiri pasangan berjumlah 7
  const [sel, setSel] = useState(new Set());
  const [checked, setChecked] = useState(null);
  const challenge = rows === 6;
  const target = (k) => k.split(',').reduce((a, b) => a + Number(b), 0) === 7;
  const tap = (k) => {
    if (challenge) { setChecked(null); setSel(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; }); }
    else setPick(k);
  };
  const check = () => setChecked(sel.size === 6 && [...sel].every(target));
  return (
    <div className="widget">
      <div className="grid-wrap">
        <table className="grid">
          <thead><tr><th /> {[1, 2, 3, 4, 5, 6].map(b => <th key={b} className="d2">{b}</th>)}</tr></thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6].map(a => (
              <tr key={a}>
                <th className="d1">{a}</th>
                {[1, 2, 3, 4, 5, 6].map(b => {
                  const k = `${a},${b}`, shown = a <= rows;
                  return <td key={b} className={(sel.has(k) ? 'in' : shown ? 'shown' : 'empty') + (!challenge && pick === k ? ' last' : '')} onClick={() => shown && tap(k)}>{shown ? k : ''}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">Baris = dadu ungu, kolom = dadu merah muda. Terisi: <span className="ns-t">{rows * 6} titik sampel</span>{rows === 6 && ' → n(S) = 6 × 6 = 36'}</p>
      {!challenge && pick && <p className="note">({pick}) adalah <b>satu titik sampel</b>. Ruang sampel adalah kumpulan semua kotak.</p>}
      {challenge && (
        <div className="known">
          <p><b>Tantangan:</b> ketuk semua pasangan yang <b>jumlahnya 7</b>. Terpilih: <span className="na-t">{sel.size}</span></p>
          {checked === true && <p className="ok-text">Pas! n(A) = 6, jadi P(jumlah 7) = 6/36 = 1/6.</p>}
          {checked === false && <p className="soft-warn">Belum pas. Cek lagi: dadu ungu + dadu merah muda harus = 7. Ada 6 pasangan.</p>}
          <button className="btn" disabled={sel.size === 0} onClick={check}>Periksa</button>
        </div>
      )}
      <div className="row">
        <button className="btn" disabled={rows >= 6} onClick={() => setRows(r => r + 1)}>Isi baris berikutnya</button>
        <button className="btn ghost small" onClick={() => { setRows(1); setPick(null); setSel(new Set()); setChecked(null); }}>Ulangi</button>
      </div>
    </div>
  );
}

/* ── Pola 3 Langkah (GL05, F08) ── */
export function PatternCard() {
  return (
    <ol className="pattern">
      <li><b className="ns-t">Cari n(S)</b><span>Semua hasil yang mungkin.</span></li>
      <li><b className="na-t">Cari n(A)</b><span>Hasil yang cocok dengan syarat kejadian.</span></li>
      <li><b>Bagi & sederhanakan</b><span>P(A) = n(A) / n(S).</span></li>
      <li><b>Cek kewajaran</b><span>Hasilnya harus di antara 0 dan 1.</span></li>
    </ol>
  );
}

/* ── Meteran peluang 0–1 (GL02, F06) ── */
const METER_EX = [
  ['Dadu muncul mata 7', 0, '0'], ['Dadu muncul mata 6', 1 / 6, '1/6'], ['Koin muncul Angka', 0.5, '1/2'],
  ['Dadu muncul bukan 6', 5 / 6, '5/6'], ['Dadu muncul kurang dari 7', 1, '1']
];
export function MeterWidget() {
  const [i, setI] = useState(2);
  return (
    <div className="widget">
      <ProbabilityMeter value={METER_EX[i][1]} />
      <p className="note center">P = <b>{METER_EX[i][2]}</b></p>
      <div className="row">{METER_EX.map((e, j) => <button key={e[0]} className="chip opt" aria-pressed={i === j} onClick={() => setI(j)}>{e[0]}</button>)}</div>
    </div>
  );
}

/* ── Percobaan koin 2D cepat (tanpa 3D, untuk unit belajar) ── */
export function EmpirisWidget() {
  const [out, setOut] = useState([]);
  const add = (n) => setOut(o => { const a = o.slice(); for (let i = 0; i < n && a.length < 5000; i++) a.push(sample({ mode: 'coin', coinCount: 1, dieCount: 1, spinKind: 'sama' })); return a; });
  const isA = useCallback((k) => k === 'A', []);
  const k = out.filter(isA).length;
  return (
    <div className="widget">
      <div className="row">
        <button className="btn primary" onClick={() => add(1)}>Lempar 1×</button>
        <button className="btn fast" onClick={() => add(10)}>10×</button>
        <button className="btn fast" onClick={() => add(100)}>100×</button>
        <button className="btn fast" onClick={() => add(1000)}>1000×</button>
        <button className="btn ghost small" onClick={() => setOut([])}>Ulang</button>
      </div>
      <p className="note">Lemparan: <b>{out.length}</b> · Angka muncul: <span className="na-t">{k}</span>
        {out.length > 0 && <> · frekuensi relatif {k}/{out.length} ≈ <b>{(k / out.length).toLocaleString('id-ID', { maximumFractionDigits: 3 })}</b></>}</p>
      <FrequencyChart outcomes={out} test={isA} theory={0.5} height={130} />
      <div className="legend"><span><i />hasil percobaan</span><span><i className="d" />peluang teoretis 1/2</span></div>
    </div>
  );
}

/* ── Memilah kalimat latar vs data (F04, IL04, EL05) ── */
export function StoryWidget() {
  const [ans, setAns] = useState(STORY.sentences.map(() => null));
  const [checked, setChecked] = useState(false);
  const [nS, setNS] = useState(''); const [nA, setNA] = useState('');
  const allSet = ans.every(a => a !== null);
  const allRight = ans.every((a, i) => a === STORY.sentences[i].data);
  const known = Number(nS) === STORY.known.nS && Number(nA) === STORY.known.nA;
  return (
    <div className="widget">
      {STORY.sentences.map((s, i) => (
        <div key={i} className={'story-row' + (checked && ans[i] !== s.data ? ' wrong' : '')}>
          <p>{s.text}</p>
          <div className="row">
            <button className="chip opt" aria-pressed={ans[i] === false} onClick={() => { setChecked(false); setAns(a => a.map((x, j) => (j === i ? false : x))); }}>Latar</button>
            <button className="chip opt" aria-pressed={ans[i] === true} onClick={() => { setChecked(false); setAns(a => a.map((x, j) => (j === i ? true : x))); }}>Data</button>
          </div>
        </div>
      ))}
      <button className="btn" disabled={!allSet} onClick={() => setChecked(true)}>Periksa</button>
      {checked && (allRight
        ? <div className="known">
            <p className="ok-text">Pas! Sekarang isi kartu Diketahui.</p>
            <label className="known-row"><span className="ns-t">n(S) seluruh pensil</span><input inputMode="numeric" value={nS} onChange={e => setNS(e.target.value.replace(/\D/g, ''))} /></label>
            <label className="known-row"><span className="na-t">n(A) pensil hitam</span><input inputMode="numeric" value={nA} onChange={e => setNA(e.target.value.replace(/\D/g, ''))} /></label>
            {known && <p className="ok-text">Ditanya: P(hitam) = <Frac n={4} d={10} nCls="na-t" dCls="ns-t" /> = <Frac n={2} d={5} /></p>}
          </div>
        : <p className="soft-warn">Ada yang belum pas (ditandai). Kalimat data biasanya memuat angka atau syarat yang dipakai untuk menghitung.</p>)}
    </div>
  );
}

/* ── Menyederhanakan pecahan dengan membagi (remedial F01) ── */
export function FractionWidget() {
  const [f, setF] = useState([4, 12]);
  const [log, setLog] = useState([]);
  const g = gcd(f[0], f[1]);
  const divide = (k) => {
    if (f[0] % k || f[1] % k) { setLog(l => [...l, `${f[0]} dan ${f[1]} tidak sama-sama habis dibagi ${k}`]); return; }
    setLog(l => [...l, `${f[0]}/${f[1]} → dibagi ${k} → ${f[0] / k}/${f[1] / k}`]); setF([f[0] / k, f[1] / k]);
  };
  return (
    <div className="widget">
      <div className="center big"><Frac n={f[0]} d={f[1]} /></div>
      <div className="row">{[2, 3, 4, 5].map(k => <button key={k} className="chip" onClick={() => divide(k)}>bagi {k}</button>)}
        <button className="btn ghost small" onClick={() => { setF([4, 12]); setLog([]); }}>Ulangi</button></div>
      {log.map((l, i) => <p className="note" key={i}>{l}</p>)}
      {g === 1 && <p className="ok-text">Sudah paling sederhana!</p>}
    </div>
  );
}
