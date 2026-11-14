import { useMemo, useState } from 'react';

/* Teks soal yang bisa di-stabilo (F04, EL05).
   Siswa menyentuh kata untuk menandainya. "Tunjukkan kata penting" menyorot kata kunci [[...]] dari penyusun soal. */

interface Tok { text: string; key: boolean; space: boolean }

function tokenize(stem: string): Tok[] {
  const out: Tok[] = [];
  stem.split(/(\[\[[^\]]+\]\])/g).forEach(part => {
    if (!part) return;
    const key = part.startsWith('[[');
    const body = key ? part.slice(2, -2) : part;
    body.split(/(\s+)/).forEach(w => { if (w) out.push({ text: w, key, space: /^\s+$/.test(w) }); });
  });
  return out;
}

export function Stem({ stem, allowReveal = true }: { stem: string; allowReveal?: boolean }) {
  const toks = useMemo(() => tokenize(stem), [stem]);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [reveal, setReveal] = useState(false);
  const hasKeys = toks.some(t => t.key);
  return (
    <div className="stem-wrap">
      <p className="stem">
        {toks.map((t, i) => t.space ? t.text : (
          <span key={i} role="button" tabIndex={0}
            className={'w' + (marked.has(i) ? ' mark' : '') + (reveal && t.key ? ' key' : '')}
            onClick={() => setMarked(m => { const n = new Set(m); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
            onKeyDown={e => { if (e.key === 'Enter') setMarked(m => { const n = new Set(m); if (n.has(i)) n.delete(i); else n.add(i); return n; }); }}>
            {t.text}
          </span>
        ))}
      </p>
      <div className="stem-tools">
        <span className="note">Sentuh kata untuk menstabilo.</span>
        {allowReveal && hasKeys && <button className="btn ghost small" onClick={() => setReveal(r => !r)}>{reveal ? 'Sembunyikan' : 'Tunjukkan'} kata penting</button>}
      </div>
    </div>
  );
}
