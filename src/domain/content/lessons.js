/* Unit "Belajar Bertahap" — satu langkah per layar, tanpa pindah otomatis (D4, F10).
   body memakai HTML sederhana: <b>, <ns> (warna n(S)), <na> (warna n(A)). */

const h = (a, b, c) => [a, b, c];

export const REMEDIAL = {
  id: 'pecahan', no: 0, title: 'Pecahan Kilat', goal: 'Menyederhanakan dan membandingkan pecahan',
  steps: [
    { title: 'Kenapa pecahan penting?', body: 'Hasil peluang hampir selalu berbentuk pecahan, misalnya <b>4/12</b>. Kalau pecahannya lancar, hitungan peluangmu jadi aman.' },
    { title: 'Menyederhanakan', body: 'Bagi pembilang dan penyebut dengan <b>FPB</b> (faktor persekutuan terbesar).<br><br>4/12 → FPB dari 4 dan 12 adalah 4 → <b>4 : 4 = 1</b>, <b>12 : 4 = 3</b> → <b>1/3</b>.', widget: 'fraction' },
    { title: 'Coba sendiri', body: 'Sederhanakan pecahan ini.', quiz: { no: 1, prompt: '6/9 = …', check: { type: 'fraction', answer: [2, 3], exact: true }, hints: h('Angka berapa yang bisa membagi 6 dan 9?', 'FPB 6 dan 9 adalah 3.', 'Contoh: 4/6 → dibagi 2 → 2/3.') } },
    { title: 'Coba lagi', body: 'Satu lagi ya.', quiz: { no: 1, prompt: '10/15 = …', check: { type: 'fraction', answer: [2, 3], exact: true }, hints: h('FPB 10 dan 15?', '10 dan 15 sama-sama habis dibagi 5.', 'Contoh: 5/20 → dibagi 5 → 1/4.') } },
    { title: 'Membandingkan pecahan', body: 'Cara paling mudah: ubah ke desimal.<br><br>3/8 = 3 : 8 = <b>0,375</b><br>1/3 = 1 : 3 ≈ <b>0,333</b><br>Jadi <b>3/8 lebih besar</b>.' },
    { title: 'Coba bandingkan', body: 'Mana yang lebih besar?', quiz: { no: 1, prompt: '2/5 dibanding 1/3', check: { type: 'choice', options: ['2/5 lebih besar', '1/3 lebih besar', 'Sama besar'], correct: 0 }, hints: h('Ubah keduanya ke desimal.', '2/5 = 0,4 dan 1/3 ≈ 0,33.', 'Contoh: 0,5 > 0,25.') } }
  ]
};

export const LESSONS = [
  {
    id: 'u1', no: 1, title: 'Kenalan Benda Peluang', goal: 'Mengenal koin, dadu, kartu remi, dan kantong bola', lab: { mode: 'coin' },
    steps: [
      { title: 'Koin', body: 'Koin punya dua sisi: <b>Angka (A)</b> dan <b>Gambar (G)</b>. Koin yang seimbang punya kemungkinan yang sama untuk kedua sisinya.' },
      { title: 'Dadu', body: 'Dadu punya <b>6 sisi</b> bermata 1, 2, 3, 4, 5, 6. Sisi yang berhadapan selalu berjumlah 7 (1–6, 2–5, 3–4).' },
      { title: 'Kartu remi', body: 'Satu set ada <b>52 kartu</b>: 4 jenis × 13 kartu. Ketuk jenis atau angka di bawah untuk menyorot kartunya.', widget: 'deck' },
      { title: 'Cek pemahaman', body: 'Lihat lagi kartu di atas kalau perlu.', widget: 'deck',
        quiz: { no: 1, prompt: 'Ada berapa kartu bergambar (J, Q, K) dalam satu set?', check: { type: 'number', answer: 12 }, hints: h('Ada berapa jenis kartu?', 'Tiap jenis punya J, Q, dan K.', 'Contoh: kartu As ada 4, satu di tiap jenis.') } },
      { title: 'Kantong bola', body: 'Bola diambil <b>tanpa melihat</b> (acak). Kalau tidak disebut lain, bola dianggap sama ukuran dan bentuknya, jadi setiap bola sama kemungkinannya terambil.' }
    ]
  },
  {
    id: 'u2', no: 2, title: 'Percobaan & Peluang Empirik', goal: 'Menghitung frekuensi relatif dari hasil percobaan', lab: { mode: 'coin', count: 1 },
    steps: [
      { title: 'Apa itu percobaan?', body: '<b>Percobaan</b> = kegiatan yang hasilnya belum pasti, misalnya melempar koin. <b>Hasil</b> = apa yang muncul (A atau G).' },
      { title: 'Peluang empirik', body: 'Peluang empirik dihitung dari <b>hasil percobaan</b>:<br><br><b>frekuensi relatif = banyak kejadian muncul / banyak percobaan</b>' },
      { title: 'Coba lempar', body: 'Tekan tombol untuk melempar koin. Perhatikan garis oranye (hasil percobaan).', widget: 'empiris' },
      { title: 'Cek pemahaman', body: 'Dita melempar koin 20 kali. Angka muncul 7 kali.',
        quiz: { no: 1, prompt: 'Frekuensi relatif muncul Angka = …', check: { type: 'fraction', answer: [7, 20] }, hints: h('Berapa kali Angka muncul? Berapa kali koin dilempar?', 'Banyak muncul di atas, banyak percobaan di bawah.', 'Contoh: 3 kali muncul dari 10 lemparan → 3/10.') } }
    ]
  },
  {
    id: 'u3', no: 3, title: 'Ruang Sampel & Titik Sampel', goal: 'Mendaftar semua hasil dengan diagram pohon dan tabel', lab: { mode: 'dice', count: 2 },
    steps: [
      { title: 'Dua istilah penting', body: '<b>Titik sampel</b> = <i>satu</i> hasil yang mungkin, misalnya (2, 5).<br><ns>Ruang sampel (S)</ns> = <i>kumpulan semua</i> titik sampel.<br><ns>n(S)</ns> = banyaknya titik sampel.' },
      { title: 'Diagram pohon: 2 koin', body: 'Ketuk tiap cabang untuk menumbuhkan pohon. Jumlah ujung cabang = <ns>n(S)</ns>.', widget: 'tree2c' },
      { title: 'Tabel: 2 dadu', body: 'Baris = dadu ungu, kolom = dadu merah muda. Baris pertama sudah diisi. Ketuk <b>Isi baris berikutnya</b> pelan-pelan, sesuai kecepatanmu.', widget: 'grid2d' },
      { title: 'Cek pemahaman', body: 'Ingat: (1, 6) dan (6, 1) adalah dua titik sampel yang berbeda.',
        quiz: { no: 1, prompt: 'Dua dadu dilempar bersamaan. n(S) = …', check: { type: 'number', answer: 36 }, hints: h('Dadu ungu punya berapa hasil? Dadu merah muda?', 'Tiap hasil dadu ungu berpasangan dengan 6 hasil dadu merah muda.', 'Contoh: 2 koin → 2 × 2 = 4.') } }
    ]
  },
  {
    id: 'u4', no: 4, title: 'Peluang Teoretis', goal: 'Memakai P(A) = n(A)/n(S) dengan Pola 3 Langkah', lab: { mode: 'dice', count: 1 },
    steps: [
      { title: 'Rumus peluang', body: '<b>P(A) = <na>n(A)</na> / <ns>n(S)</ns></b><br><br><na>n(A)</na> = banyak hasil yang cocok dengan kejadian A.<br><ns>n(S)</ns> = banyak semua hasil yang mungkin.' },
      { title: 'Pola 3 Langkah', body: 'Soalnya boleh tentang kelereng, kartu, atau undian. Langkahnya tetap sama.', widget: 'pattern' },
      { title: 'Nilai peluang', body: 'Peluang selalu di antara <b>0</b> (mustahil) dan <b>1</b> (pasti). Kalau hasilmu lebih dari 1 atau negatif, pasti ada yang salah hitung.', widget: 'meter' },
      { title: 'Cek pemahaman', body: 'Sebuah dadu dilempar sekali.',
        quiz: { no: 1, prompt: 'Peluang muncul mata dadu kurang dari 3 = …', check: { type: 'fraction', answer: [2, 6] }, hints: h('Mata dadu berapa saja yang kurang dari 3?', 'Kurang dari 3 → {1, 2}. n(S) = 6.', 'Contoh: lebih dari 4 → {5, 6} → 2/6.') } }
    ]
  },
  {
    id: 'u5', no: 5, title: 'Empirik vs Teoretis', goal: 'Membedakan hasil percobaan dengan perhitungan', lab: { mode: 'coin', count: 1 },
    steps: [
      { title: 'Dua cara melihat peluang', body: '<b>Empirik</b> → dari hasil percobaan yang <i>sudah</i> terjadi.<br><b>Teoretis</b> → dari ruang sampel, dengan anggapan benda seimbang.' },
      { title: 'Lempar lebih banyak', body: 'Coba 10×, lalu 100×, lalu 1000×. Perhatikan: garis oranye makin dekat ke garis putus-putus.', widget: 'empiris' },
      { title: 'Yang sering keliru', body: 'Hasil 10 lemparan <b>tidak</b> menentukan lemparan berikutnya. Koin tidak "ingat" hasil sebelumnya. Peluang teoretis lemparan berikutnya tetap <b>1/2</b>.' },
      { title: 'Cek pemahaman', body: 'Rudi melempar dadu 12 kali dan mata 3 muncul 4 kali.',
        quiz: { no: 1, prompt: 'Pernyataan yang benar adalah …', check: { type: 'choice', options: ['Peluang muncul 3 pada lemparan ke-13 pasti 4/12', 'Peluang empirik muncul 3 adalah 4/12, peluang teoretisnya 1/6', 'Dadunya pasti tidak seimbang'], correct: 1 }, hints: h('Mana yang dari percobaan, mana yang dari teori?', 'Empirik = 4/12. Teoretis dadu seimbang = 1/6.', 'Hasil percobaan sedikit bisa berbeda dari teori.') } }
    ]
  },
  {
    id: 'u6', no: 6, title: 'Menerjemahkan Soal Cerita', goal: 'Memisahkan cerita dan data, lalu menemukan n(A) dan n(S)',
    steps: [
      { title: 'Cerita vs data', body: 'Soal cerita sering punya kalimat <b>latar</b> (suasana, nama tempat) dan kalimat <b>data</b> (angka dan syarat). Yang dipakai untuk menghitung hanya data.' },
      { title: 'Pilah kalimatnya', body: 'Ketuk tiap kalimat lalu pilih: latar atau data.', widget: 'story' },
      { title: 'Kata kunci', body: '<b>dan</b> → kedua syarat harus dipenuhi.<br><b>atau</b> → salah satu syarat cukup.<br><b>bukan</b> → semua kecuali yang disebut.<br><b>paling sedikit</b> → boleh sama atau lebih.' },
      { title: 'Cek pemahaman', body: 'Sebuah kotak berisi 4 kancing biru dan 6 kancing putih. Diambil satu kancing.',
        quiz: { no: 1, prompt: 'Peluang terambil kancing yang bukan biru = …', check: { type: 'fraction', answer: [6, 10] }, hints: h('"Bukan biru" berarti warna apa?', 'Bukan biru = putih. n(A) = 6, n(S) = 10.', 'Contoh: bukan merah dari 2 merah dan 3 hijau → 3/5.') } }
    ]
  }
];

export const GLOSSARY = {
  koin: { title: 'Koin', body: 'Dua sisi: <b>Angka (A)</b> dan <b>Gambar (G)</b>. Dua koin → ruang sampel {AA, AG, GA, GG}.' },
  dadu: { title: 'Dadu', body: '6 sisi bermata 1–6. Dua dadu → 6 × 6 = <b>36</b> pasangan. (1,6) berbeda dengan (6,1).' },
  'kartu-remi': { title: 'Kartu remi', body: '52 kartu, 4 jenis: <b>sekop ♠︎ dan keriting ♣︎ (hitam)</b>, <b>hati ♥︎ dan wajik ♦︎ (merah)</b>. Tiap jenis 13 kartu: As, 2–10, J, Q, K. Kartu bergambar = J, Q, K (12 kartu).', widget: 'deck' },
  kantong: { title: 'Kantong bola', body: 'Bola diambil acak tanpa melihat. n(S) = banyak seluruh bola.' },
  roda: { title: 'Roda putar', body: 'Bila bagian roda sama besar, tiap bagian sama kemungkinannya. Bila tidak sama besar, bandingkan luas bagiannya.' },
  'ruang-sampel': { title: 'Ruang sampel', body: 'Kumpulan semua hasil yang mungkin. <b>Titik sampel</b> = satu hasil. <b>n(S)</b> = banyaknya titik sampel.' }
};

export const STORY = {
  sentences: [
    { text: 'Pagi itu suasana kelas 8C sangat ramai karena akan ada pembagian hadiah.', data: false },
    { text: 'Bu Guru menyiapkan sebuah kotak berisi 6 pensil merah dan 4 pensil hitam.', data: true },
    { text: 'Kotak itu dihias pita warna-warni oleh Sinta.', data: false },
    { text: 'Satu pensil diambil secara acak.', data: true },
    { text: 'Berapa peluang terambil pensil hitam?', data: true }
  ],
  known: { nS: 10, nA: 4 }
};

export const DIAGNOSTIC = [
  { no: 1, prompt: 'Sederhanakan: 4/12 = …', check: { type: 'fraction', answer: [1, 3], exact: true }, hints: h('', '', '') },
  { no: 2, prompt: 'Sederhanakan: 6/8 = …', check: { type: 'fraction', answer: [3, 4], exact: true }, hints: h('', '', '') },
  { no: 3, prompt: 'Sederhanakan: 5/10 = …', check: { type: 'fraction', answer: [1, 2], exact: true }, hints: h('', '', '') },
  { no: 4, prompt: 'Mana yang lebih besar?', check: { type: 'choice', options: ['1/3', '3/8', 'Sama besar'], correct: 1 }, hints: h('', '', '') },
  { no: 5, prompt: '1/2 = …/10', check: { type: 'number', answer: 5 }, hints: h('', '', '') },
  { no: 6, prompt: '3/4 dalam bentuk desimal adalah …', check: { type: 'choice', options: ['0,34', '0,43', '0,75'], correct: 2 }, hints: h('', '', '') }
];
export const DIAGNOSTIC_PASS = 0.7;

/* Kuesioner beban kognitif — ADAPTASI bahasa siswa dari Leppink dkk. (2013), skala 0–10.
   BELUM divalidasi pada siswa SMP: lakukan validasi ahli & uji keterbacaan sebelum dipakai sebagai data penelitian. */
export const SURVEY = {
  id: 'CL10-adaptasi-v1',
  items: [
    { id: 'IL1', type: 'IL', text: 'Materi peluang yang barusan dipelajari terasa sangat rumit.' },
    { id: 'IL2', type: 'IL', text: 'Rumus-rumus yang dipakai terasa sangat rumit.' },
    { id: 'IL3', type: 'IL', text: 'Istilah dan konsep (ruang sampel, kejadian, dll.) terasa sangat rumit.' },
    { id: 'EL1', type: 'EL', text: 'Petunjuk dan penjelasannya sangat tidak jelas.' },
    { id: 'EL2', type: 'EL', text: 'Cara penyajiannya tidak membantu aku belajar.' },
    { id: 'EL3', type: 'EL', text: 'Bahasa dan tampilannya membuat aku bingung.' },
    { id: 'GL1', type: 'GL', text: 'Kegiatan ini benar-benar menambah pemahamanku tentang peluang.' },
    { id: 'GL2', type: 'GL', text: 'Kegiatan ini benar-benar membantu aku memahami rumus peluang.' },
    { id: 'GL3', type: 'GL', text: 'Kegiatan ini membantu aku memahami konsep dan istilahnya.' },
    { id: 'GL4', type: 'GL', text: 'Kegiatan ini membuat aku bisa mengerjakan soal yang berbeda.' }
  ]
};
