/* Petunjuk bertahap + fading (F05, GL03, DS02).
   - Muncul otomatis setelah 2× salah pada langkah yang sama.
   - Bila siswa sudah mahir (mastery ≥ 0,8) bantuan dipudarkan: muncul otomatis setelah 3× salah.
   - Tombol Petunjuk menaikkan level satu per satu; level 3 = contoh sejenis, bukan jawaban. */

export const initialHint = () => ({ wrong: 0, level: 0 });

export const autoThreshold = (mastery) => (mastery >= 0.8 ? 3 : 2);

export function onWrongAnswer(s, mastery) {
  const wrong = s.wrong + 1;
  if (s.level === 0 && wrong >= autoThreshold(mastery)) return { state: { wrong, level: 1 }, autoShown: true };
  return { state: { ...s, wrong }, autoShown: false };
}

export function onHintRequest(s) {
  return { ...s, level: Math.min(3, s.level + 1) };
}

/** Bolehkah melewati langkah? Hanya setelah semua bantuan dipakai dan masih salah */
export const canSkip = (s) => s.level === 3 && s.wrong >= 4;

/** Mastery 0..1 = proporsi langkah yang diselesaikan benar tanpa petunjuk (riwayat latihan) */
export function mastery(records) {
  if (!records.length) return 0;
  return records.filter(r => r.solved && r.hintsUsed === 0).length / records.length;
}
