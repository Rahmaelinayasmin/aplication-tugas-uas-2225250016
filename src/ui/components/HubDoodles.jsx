import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/store';
import { randomInt } from '../../domain/probability/rng';
import { playResult, vibrate } from '../sound';

/* Pernak-pernik Beranda (permintaan peneliti, 20 Nov 2026): kucing, koin, dadu, kupu-kupu, awan, bunga.
   CLT/D3: strip kecil di atas menu, warna pastel lembut, gerak idle jarang & bergantian (bukan terus-menerus),
   tidak menutupi menu. Semua diam bila Mode Fokus / Kurangi Gerakan (motion.css).
   Ketuk kucing/koin/dadu → reaksi kecil. Hasil koin & dadu hanya hiasan, tetap memakai rng.js (aturan 10). */

const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export function HubDoodles({ code }) {
  const { motion, settings } = useApp();
  const sfx = (k) => { if (settings.sound) playResult(k); };
  const [cat, setCat] = useState(false);
  const [coin, setCoin] = useState({ face: 'A', spin: false });
  const [die, setDie] = useState({ n: 5, roll: false });
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms, fn) => { timers.current.push(window.setTimeout(fn, motion ? ms : 0)); };

  const tapCat = () => { if (cat) return; vibrate(10); setCat(true); later(900, () => setCat(false)); };
  const tapCoin = () => {
    if (coin.spin) return;
    vibrate(10); sfx('coin');
    const face = randomInt(2) === 0 ? 'A' : 'G';
    setCoin(c => ({ ...c, spin: true }));
    later(450, () => setCoin({ face, spin: true }));   // berganti sisi di tengah putaran
    later(900, () => setCoin({ face, spin: false }));
  };
  const tapDie = () => {
    if (die.roll) return;
    vibrate(10); sfx('dice');
    const n = randomInt(6) + 1;
    setDie(d => ({ ...d, roll: true }));
    later(800, () => setDie({ n, roll: false }));
  };

  return (
    <div className={'doodles' + (motion ? ' live' : '')}>
      <p className="doodle-hi">{greeting()}, {code}!</p>
      <svg viewBox="0 0 360 100" aria-hidden="true" className="doodle-svg">
        {/* langit: matahari & awan melayang pelan */}
        <g className="dd-sun"><circle cx="322" cy="22" r="11" fill="#FFE29A" />
          {Array.from({ length: 8 }, (_, i) => <line key={i} x1="322" y1="5" x2="322" y2="1" stroke="#FFD36B" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${i * 45} 322 22)`} />)}
        </g>
        <g className="dd-cloud c1"><path d="M40 26a9 9 0 0 1 16-6 11 11 0 0 1 20 4 7 7 0 0 1 0 14H44a7 7 0 0 1-4-12z" fill="#fff" opacity=".95" /></g>
        <g className="dd-cloud c2"><path d="M170 18a7 7 0 0 1 12-4 9 9 0 0 1 16 3 6 6 0 0 1 0 11h-24a6 6 0 0 1-4-10z" fill="#fff" opacity=".85" /></g>

        {/* tanah berumput */}
        <path d="M0 84 Q90 76 180 82 T360 80 V100 H0z" fill="#CDEBC0" />
        <path d="M0 90 Q120 84 240 90 T360 88 V100 H0z" fill="#B7E0A6" />

        {/* bunga bergoyang */}
        {[[150, '#F4A6C0'], [166, '#C6B3F2'], [258, '#F7D774']].map(([x, c], i) => (
          <g key={x} className={'dd-flower f' + i} style={{ transformOrigin: `${x}px 86px` }}>
            <path d={`M${x} 86 Q${x + 2} 76 ${x} 68`} stroke="#6DB565" strokeWidth="2" fill="none" />
            <ellipse cx={x + 4} cy="77" rx="3.5" ry="1.6" fill="#6DB565" transform={`rotate(-30 ${x + 4} 77)`} />
            {[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx={x} cy="63" rx="2.6" ry="4.2" fill={c} transform={`rotate(${a} ${x} 67)`} />)}
            <circle cx={x} cy="67" r="2.4" fill="#F2B544" />
          </g>
        ))}

        {/* kucing duduk: ekor mengibas, mata berkedip; ketuk → melompat senang */}
        <g className={'dd-cat' + (cat ? ' hop' : '')} onClick={tapCat} style={{ cursor: 'pointer' }}>
          <rect x="34" y="40" width="70" height="52" fill="transparent" />
          <g className="dd-tail"><path d="M84 84 Q102 80 98 62 Q96 54 90 56" stroke="#F0A04B" strokeWidth="7" fill="none" strokeLinecap="round" /></g>
          <ellipse cx="70" cy="76" rx="20" ry="14" fill="#F0A04B" />
          <ellipse cx="66" cy="80" rx="11" ry="9" fill="#FFE2BF" />
          <ellipse cx="58" cy="88" rx="6" ry="3.4" fill="#FFE2BF" /><ellipse cx="74" cy="88" rx="6" ry="3.4" fill="#FFE2BF" />
          <g className="dd-head">
            <path d="M44 46 L47 30 L57 40z" fill="#F0A04B" /><path d="M68 40 L77 30 L79 46z" fill="#F0A04B" />
            <path d="M47 42 L48.5 34 L54 40z" fill="#F4A6C0" /><path d="M71 40 L76 34 L76.5 42z" fill="#F4A6C0" />
            <ellipse cx="62" cy="52" rx="18" ry="15" fill="#F0A04B" />
            <path d="M56 38 l2 6 M62 37 v6 M68 38 l-2 6" stroke="#D97A2B" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="62" cy="58" rx="8" ry="6" fill="#FFE2BF" />
            {cat ? (
              <g stroke="#2E3440" strokeWidth="2" fill="none" strokeLinecap="round"><path d="M51 51 q3 -4 6 0" /><path d="M67 51 q3 -4 6 0" /></g>
            ) : (
              <g className="dd-eyes"><ellipse cx="54" cy="51" rx="2.6" ry="3.4" fill="#2E3440" /><ellipse cx="70" cy="51" rx="2.6" ry="3.4" fill="#2E3440" />
                <circle cx="55" cy="49.8" r=".9" fill="#fff" /><circle cx="71" cy="49.8" r=".9" fill="#fff" /></g>
            )}
            <path d="M60.5 55.5 h3 l-1.5 1.8z" fill="#E77C95" />
            <path d="M62 57.5 q-2.5 3 -5 1 M62 57.5 q2.5 3 5 1" stroke="#2E3440" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <ellipse cx="49" cy="57" rx="3" ry="1.6" fill="#F4A6C0" opacity=".7" /><ellipse cx="75" cy="57" rx="3" ry="1.6" fill="#F4A6C0" opacity=".7" />
          </g>
          {cat && <text x="96" y="40" className="dd-meow">meong!</text>}
        </g>

        {/* koin: sesekali berputar sendiri; ketuk → dilempar (A = Angka, G = Gambar) */}
        <g className={'dd-coin' + (coin.spin ? ' spin' : '')} onClick={tapCoin} style={{ cursor: 'pointer' }}>
          <rect x="196" y="40" width="40" height="48" fill="transparent" />
          <ellipse cx="216" cy="88" rx="11" ry="2.6" fill="#000" opacity=".08" className="dd-shadow" />
          <g className="dd-coin-body">
            <circle cx="216" cy="64" r="15" fill="#E9B949" />
            <circle cx="216" cy="64" r="11.5" fill="#F7D774" stroke="#D9A43A" strokeWidth="1.4" />
            <text x="216" y="69" textAnchor="middle" className="dd-coin-t">{coin.face}</text>
          </g>
        </g>

        {/* dadu: sesekali melompat kecil; ketuk → digulirkan */}
        <g className={'dd-die' + (die.roll ? ' roll' : '')} onClick={tapDie} style={{ cursor: 'pointer' }}>
          <rect x="272" y="44" width="44" height="46" fill="transparent" />
          <ellipse cx="294" cy="89" rx="13" ry="2.6" fill="#000" opacity=".08" />
          <g className="dd-die-body">
            <rect x="280" y="60" width="28" height="28" rx="6" fill="#FBF8F3" stroke="#E2D8C8" strokeWidth="1.5" />
            {PIPS[die.n].map(([dx, dy], i) => <circle key={i} cx={294 + dx * 7.5} cy={74 + dy * 7.5} r="2.6" fill={die.n === 1 ? '#C8323C' : '#2E3440'} />)}
          </g>
        </g>

        {/* kupu-kupu terbang melintas pelan */}
        <g className="dd-fly">
          <g className="dd-wing l"><ellipse cx="-4" cy="-2" rx="5" ry="4" fill="#9FD8F0" /><ellipse cx="-3" cy="3" rx="3.4" ry="2.6" fill="#C6B3F2" /></g>
          <g className="dd-wing r"><ellipse cx="4" cy="-2" rx="5" ry="4" fill="#9FD8F0" /><ellipse cx="3" cy="3" rx="3.4" ry="2.6" fill="#C6B3F2" /></g>
          <rect x="-0.9" y="-4" width="1.8" height="9" rx=".9" fill="#5B6475" />
        </g>
      </svg>
    </div>
  );
}

/* Ikon kecil untuk ubin menu (garis sederhana, warna tinta) */
const ICONS = {
  test: <><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4h6v3H9zM9 12h6M9 16h4" /></>,
  testok: <><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4h6v3H9zM9.5 14l2 2 3.5-4" /></>,
  book: <><path d="M4 5.5C7 4 9.5 4 12 6c2.5-2 5-2 8-.5V19c-3-1.5-5.5-1.5-8 .5-2.5-2-5-2-8-.5z" /><path d="M12 6v13.5" /></>,
  dice: <><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="9" cy="9" r="1.2" /><circle cx="15" cy="15" r="1.2" /><circle cx="12" cy="12" r="1.2" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><path d="M12 12l7-7M16 5h3v3" /></>,
  chat: <><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 4v-4H6a2 2 0 0 1-2-2z" /><path d="M8 9h8M8 12h5" /></>,
  ladder: <><path d="M7 3v18M17 3v18M7 7h10M7 12h10M7 17h10" /></>,
  chart: <><path d="M4 20h16" /><rect x="6" y="12" width="3" height="6" /><rect x="11" y="8" width="3" height="10" /><rect x="16" y="5" width="3" height="13" /></>,
  cup: <><path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" /><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3c0 1.5 1.5 1.5 1.5 3M12 3c0 1.5 1.5 1.5 1.5 3" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></>
};
export function TileIcon({ name, i }) {
  return (
    <i className="tile-ic" style={{ '--d': i }} aria-hidden="true">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONS[name]}</svg>
    </i>
  );
}
