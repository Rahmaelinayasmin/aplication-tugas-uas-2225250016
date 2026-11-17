/* Kemampuan Saya (permintaan peneliti, 17 Nov 2026): tangga kemampuan 1–10.
   Setiap anak tangga = satu kemampuan konkret yang bisa dicek dari data belajar.
   Skor = banyak anak tangga yang tercapai (anak tangga 1 selalu tercapai), jadi siswa melihat
   apa yang SUDAH bisa dan apa langkah berikutnya — bukan peringkat antar-siswa (prd.md §6). */

export const ABILITY_STEPS = [
  { no: 1, title: 'Mulai mengenal peluang', desc: 'Kamu sudah masuk dan siap belajar.' },
  { no: 2, title: 'Dasar pecahan siap', desc: 'Lulus diagnostik pecahan atau selesai Pecahan Kilat.' },
  { no: 3, title: 'Paham ruang sampel', desc: 'Selesai 3 unit materi: kenal titik sampel dan n(S).' },
  { no: 4, title: 'Materi peluang tuntas', desc: 'Semua unit Materi Peluang selesai.' },
  { no: 5, title: 'Lulus soal Mudah', desc: '5 soal level Mudah selesai.' },
  { no: 6, title: 'Lulus soal Sedang', desc: '10 soal level Sedang selesai.' },
  { no: 7, title: 'Lulus soal Sulit', desc: '15 soal level Sulit selesai.' },
  { no: 8, title: 'Mandiri di latihan literasi', desc: 'Separuh langkah latihan literasi selesai tanpa petunjuk.' },
  { no: 9, title: 'Ikut pretest dan posttest', desc: 'Kedua tes sudah dikerjakan bersama guru.' },
  { no: 10, title: 'Mahir peluang', desc: 'Skor posttest minimal 80%.' }
];

/**
 * @param {{
 *   diagnosticScore: number|null, remedialDone: boolean,
 *   lessonsDone: number, lessonsTotal: number,
 *   practiceMastery: number,                       // 0..1
 *   questDone: { mudah: boolean, sedang: boolean, sulit: boolean },
 *   pretestDone: boolean, posttest: { total: number, max: number } | null
 * }} d
 */
export function abilityChecks(d) {
  return [
    true,
    (d.diagnosticScore ?? 0) >= 0.7 || d.remedialDone,
    d.lessonsDone >= Math.min(3, d.lessonsTotal),
    d.lessonsTotal > 0 && d.lessonsDone >= d.lessonsTotal,
    !!d.questDone.mudah,
    !!d.questDone.sedang,
    !!d.questDone.sulit,
    d.practiceMastery >= 0.5,
    d.pretestDone && !!d.posttest,
    // bandingkan dengan bilangan bulat (total*5 ≥ max*4 ⇔ total/max ≥ 80%), bukan float
    !!d.posttest && d.posttest.max > 0 && d.posttest.total * 5 >= d.posttest.max * 4
  ];
}

/** Skor 1–10 */
export const abilityScore = (d) => abilityChecks(d).filter(Boolean).length;
