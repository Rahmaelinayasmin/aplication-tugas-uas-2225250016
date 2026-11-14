/* Bank soal LATIHAN — terpisah dari butir tes (Tabel 2).
   Setiap soal mengikuti Pola 3 Langkah (F08): ① n(S) → ② n(A) → ③ bagi & sederhanakan → ④ cek kewajaran.
   Konteks sehari-hari (EL01): permen, kelas, kantin, arisan. Kata kunci ditandai [[...]] (F04). */

export const PRACTICE_ITEMS = [
  // ───────── Reasoning ─────────
  {
    id: 'LAT-R1', indicator: 'reasoning', title: 'Toples Permen', isTestItem: false,
    stem: 'Di meja ada dua toples. Toples P berisi 2 permen [[stroberi]] dan 3 permen jeruk. Toples Q berisi 3 permen [[stroberi]] dan 6 permen jeruk. Kamu ingin mendapat permen stroberi dengan mengambil satu permen tanpa melihat. Toples mana yang [[sebaiknya dipilih]]?',
    steps: [
      { no: 1, prompt: 'Peluang dapat stroberi dari Toples P = …', check: { type: 'fraction', answer: [2, 5] },
        hints: ['Ada berapa permen seluruhnya di Toples P?', 'n(S) Toples P = 2 + 3. n(A) = banyak permen stroberi.', 'Contoh: 1 stroberi dan 4 jeruk → peluang stroberi 1/5.'] },
      { no: 2, prompt: 'Peluang dapat stroberi dari Toples Q = …', check: { type: 'fraction', answer: [3, 9] },
        hints: ['Ada berapa permen seluruhnya di Toples Q?', 'n(S) Toples Q = 3 + 6.', 'Contoh: 2 stroberi dan 2 jeruk → peluang stroberi 2/4.'] },
      { no: 3, prompt: 'Bandingkan kedua peluang.', check: { type: 'compare', left: 1, right: 2, leftLabel: 'Toples P', rightLabel: 'Toples Q' },
        hints: ['Pecahan mana yang lebih besar?', 'Samakan penyebutnya, atau ubah ke desimal: 2/5 = 0,4.', 'Contoh: 1/4 = 0,25 dan 1/3 ≈ 0,33, jadi 1/4 < 1/3.'] },
      { no: 4, prompt: 'Toples mana yang sebaiknya dipilih?', check: { type: 'choice', options: ['Toples P', 'Toples Q', 'Sama saja'], correct: 0 },
        hints: ['Pilih yang peluangnya lebih besar.', 'Lihat hasil perbandinganmu di langkah 3.', 'Contoh: peluang 0,5 lebih menguntungkan daripada 0,3.'] },
      { no: 5, prompt: 'Kenapa? Pilih alasan yang paling tepat.', check: { type: 'choice', options: ['Karena Toples Q punya lebih banyak permen stroberi', 'Karena perbandingan stroberi terhadap seluruh permen di Toples P lebih besar', 'Karena Toples P lebih kecil'], correct: 1 },
        hints: ['Yang menentukan peluang itu banyaknya saja, atau dibandingkan dengan seluruh isinya?', 'Peluang = bagian yang diharapkan dibanding semua kemungkinan.', 'Contoh: 3 dari 100 lebih kecil peluangnya daripada 2 dari 5.'] }
    ]
  },
  {
    id: 'LAT-R2', indicator: 'reasoning', title: 'Dua Roda Hadiah', isTestItem: false, lab: { mode: 'spinner' },
    context: ['roda'],
    stem: 'Roda X dibagi 4 bagian [[sama besar]], 1 bagian berwarna merah. Roda Y dibagi 6 bagian [[sama besar]], 2 bagian berwarna merah. Hadiah didapat jika jarum berhenti di merah. Roda mana yang [[lebih menguntungkan]]?',
    steps: [
      { no: 1, prompt: 'Peluang merah pada Roda X = …', check: { type: 'fraction', answer: [1, 4] },
        hints: ['Ada berapa bagian roda X seluruhnya?', 'n(S) = 4 bagian, n(A) = bagian merah.', 'Contoh: roda 5 bagian sama besar, 1 hijau → peluang hijau 1/5.'] },
      { no: 2, prompt: 'Peluang merah pada Roda Y = …', check: { type: 'fraction', answer: [2, 6] },
        hints: ['Ada berapa bagian merah di Roda Y?', 'n(S) = 6, n(A) = 2.', 'Contoh: 3 bagian biru dari 8 bagian → 3/8.'] },
      { no: 3, prompt: 'Bandingkan.', check: { type: 'compare', left: 1, right: 2, leftLabel: 'Roda X', rightLabel: 'Roda Y' },
        hints: ['Sederhanakan 2/6 dulu.', '2/6 = 1/3. Mana lebih besar, 1/4 atau 1/3?', 'Contoh: kue dibagi 3 potongnya lebih besar daripada dibagi 4.'] },
      { no: 4, prompt: 'Roda mana yang lebih menguntungkan?', check: { type: 'choice', options: ['Roda X', 'Roda Y', 'Sama saja'], correct: 1 },
        hints: ['Pilih peluang yang lebih besar.', 'Lihat langkah 3.', 'Peluang lebih besar → lebih sering terjadi bila dicoba berkali-kali.'] }
    ]
  },
  {
    id: 'LAT-R3', indicator: 'reasoning', title: 'Undian Dua Kelas', isTestItem: false,
    stem: 'Kelas 8A berisi 30 siswa dan akan diundi 3 pemenang doorprize. Kelas 8B berisi 16 siswa dan akan diundi 2 pemenang. Tiap siswa hanya bisa menang sekali. Di kelas mana seorang siswa punya [[peluang menang lebih besar]]?',
    steps: [
      { no: 1, prompt: 'Peluang menang di 8A = …', check: { type: 'fraction', answer: [3, 30] },
        hints: ['Berapa banyak pemenang dan berapa banyak siswa di 8A?', 'Peluang = banyak pemenang / banyak siswa.', 'Contoh: 1 pemenang dari 20 siswa → 1/20.'] },
      { no: 2, prompt: 'Peluang menang di 8B = …', check: { type: 'fraction', answer: [2, 16] },
        hints: ['Berapa banyak pemenang dan siswa di 8B?', 'n(A) = 2, n(S) = 16.', 'Contoh: 2 pemenang dari 10 siswa → 2/10.'] },
      { no: 3, prompt: 'Bandingkan.', check: { type: 'compare', left: 1, right: 2, leftLabel: 'Kelas 8A', rightLabel: 'Kelas 8B' },
        hints: ['Sederhanakan dulu kedua pecahan.', '3/30 = 1/10 dan 2/16 = 1/8.', 'Pembilang sama 1: penyebut lebih kecil → pecahan lebih besar.'] },
      { no: 4, prompt: 'Alasan yang paling tepat?', check: { type: 'choice', options: ['8A, karena pemenangnya lebih banyak', '8B, karena 1/8 lebih besar dari 1/10', 'Sama saja, karena sama-sama diundi'], correct: 1 },
        hints: ['Banyak pemenang saja belum cukup untuk memutuskan.', 'Bandingkan dengan banyak siswa di kelasnya.', 'Contoh: 5 pemenang dari 100 siswa (1/20) lebih kecil dari 1 dari 10.'] }
    ]
  },
  // ───────── Formulating ─────────
  {
    id: 'LAT-F1', indicator: 'formulating', title: 'Arisan Keluarga', isTestItem: false,
    stem: 'Hari Minggu yang cerah, keluarga besar Dina berkumpul di rumah nenek sambil makan bakso. Dalam arisan itu ada [[20 gulungan nama]] di dalam gelas, dan setiap anggota punya satu gulungan. Dina adalah salah satu anggota. [[Satu gulungan]] diambil secara acak. Berapa peluang [[Dina]] yang mendapat arisan?',
    steps: [
      { no: 1, prompt: 'Informasi yang penting untuk soal ini adalah …', check: { type: 'choice', options: ['Hari Minggu yang cerah dan makan bakso', 'Ada 20 gulungan nama dan 1 gulungan diambil', 'Rumah nenek'], correct: 1 },
        hints: ['Mana yang berhubungan dengan angka dan pengambilan?', 'Pisahkan cerita latar dari data matematis.', 'Contoh: "di hari hujan, 5 kelereng…" → yang penting "5 kelereng".'] },
      { no: 2, prompt: 'n(S) = …', check: { type: 'number', answer: 20 },
        hints: ['Ada berapa kemungkinan nama yang terambil?', 'Setiap gulungan = satu kemungkinan.', 'Contoh: 12 kartu nama → n(S) = 12.'] },
      { no: 3, prompt: 'n(A), kejadian Dina mendapat arisan = …', check: { type: 'number', answer: 1 },
        hints: ['Berapa gulungan yang bertuliskan nama Dina?', 'Setiap anggota punya satu gulungan.', 'Contoh: Budi punya 2 gulungan → n(A) = 2.'] },
      { no: 4, prompt: 'P(A) = …', check: { type: 'fraction', answer: [1, 20] },
        hints: ['Pakai P(A) = n(A) / n(S).', 'Masukkan n(A) di atas dan n(S) di bawah.', 'Contoh: n(A) = 1, n(S) = 8 → 1/8.'] }
    ]
  },
  {
    id: 'LAT-F2', indicator: 'formulating', title: 'Kartu Nomor Undian', isTestItem: false,
    stem: 'Panitia lomba 17-an menyiapkan 15 kartu bernomor [[1 sampai 15]]. Peserta mengambil satu kartu secara acak. Peserta mendapat hadiah jika nomornya [[kelipatan 3]]. Berapa peluang mendapat hadiah?',
    steps: [
      { no: 1, prompt: 'n(S) = …', check: { type: 'number', answer: 15 },
        hints: ['Ada berapa kartu?', 'Setiap kartu satu kemungkinan.', 'Contoh: kartu 1 sampai 10 → n(S) = 10.'] },
      { no: 2, prompt: 'Pilih semua nomor yang termasuk kejadian A (kelipatan 3).',
        check: { type: 'set', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'], answer: ['3', '6', '9', '12', '15'] },
        hints: ['Kelipatan 3 = 3, 6, … lanjutkan.', 'Tambah 3 terus sampai tidak lebih dari 15.', 'Contoh: kelipatan 4 sampai 12 → 4, 8, 12.'] },
      { no: 3, prompt: 'P(A) = …', check: { type: 'fraction', answer: [5, 15] },
        hints: ['Hitung banyak anggota A.', 'n(A) = 5, n(S) = 15.', 'Contoh: 4 dari 12 → 4/12 = 1/3.'] },
      { no: 4, prompt: 'Apakah hasilnya masuk akal?', check: { type: 'choice', options: ['Ya, karena nilainya di antara 0 dan 1', 'Tidak, karena peluang harus lebih dari 1', 'Tidak, karena peluang harus bilangan bulat'], correct: 0 },
        hints: ['Peluang selalu berada di antara berapa dan berapa?', '0 artinya mustahil, 1 artinya pasti.', 'Contoh: 5/3 pasti salah hitung karena lebih dari 1.'] }
    ]
  },
  {
    id: 'LAT-F3', indicator: 'formulating', title: 'Roti di Kantin', isTestItem: false, lab: { mode: 'bag' },
    stem: 'Bu Sri, penjaga kantin yang ramah, punya [[12 roti cokelat]] dan [[8 roti keju]] yang bungkusnya sama persis. Andi membeli satu roti [[tanpa memilih]]. Berapa peluang Andi mendapat roti [[keju]]?',
    steps: [
      { no: 1, prompt: 'n(S), banyak semua roti = …', check: { type: 'number', answer: 20 },
        hints: ['Roti apa saja yang ada?', 'Jumlahkan roti cokelat dan roti keju.', 'Contoh: 4 apel + 6 jeruk = 10 buah.'] },
      { no: 2, prompt: 'n(A), banyak roti keju = …', check: { type: 'number', answer: 8 },
        hints: ['Kejadian yang ditanya roti apa?', 'Lihat kata kunci "keju".', 'Contoh: ditanya apel → n(A) = banyak apel.'] },
      { no: 3, prompt: 'P(A) = … (boleh belum disederhanakan)', check: { type: 'fraction', answer: [8, 20] },
        hints: ['P(A) = n(A) / n(S).', '8 di atas, 20 di bawah. Sederhanakan dengan FPB 4.', 'Contoh: 6/10 = 3/5 (dibagi 2).'] }
    ]
  },
  // ───────── Employing ─────────
  {
    id: 'LAT-E1', indicator: 'employing', title: 'Dadu Prima', isTestItem: false, lab: { mode: 'dice', count: 1 },
    context: ['dadu'],
    stem: 'Sebuah dadu dilempar sekali. Tentukan peluang muncul mata dadu (a) [[prima]] dan (b) [[prima dan ganjil]].',
    steps: [
      { no: 1, prompt: 'Pilih semua mata dadu yang prima.', check: { type: 'set', options: ['1', '2', '3', '4', '5', '6'], answer: ['2', '3', '5'] },
        hints: ['Bilangan prima hanya punya dua faktor: 1 dan dirinya sendiri.', '1 bukan prima. Apakah 2 prima?', 'Contoh: 7 prima (faktornya 1 dan 7), 9 bukan (1, 3, 9).'] },
      { no: 2, prompt: 'P(prima) = …', check: { type: 'fraction', answer: [3, 6] },
        hints: ['n(S) dadu = 6.', 'n(A) = banyak bilangan prima yang kamu pilih.', 'Contoh: 2 dari 6 → 2/6 = 1/3.'] },
      { no: 3, prompt: 'Pilih mata dadu yang prima DAN ganjil.', check: { type: 'set', options: ['1', '2', '3', '4', '5', '6'], answer: ['3', '5'] },
        hints: ['"Dan" artinya harus memenuhi dua syarat sekaligus.', 'Dari {2, 3, 5}, mana yang ganjil?', 'Contoh: genap dan lebih dari 3 → {4, 6}.'] },
      { no: 4, prompt: 'P(prima dan ganjil) = …', check: { type: 'fraction', answer: [2, 6] },
        hints: ['Hitung anggota yang kamu pilih.', 'n(A) = 2, n(S) = 6.', 'Contoh: 1 dari 6 → 1/6.'] }
    ]
  },
  {
    id: 'LAT-E2', indicator: 'employing', title: 'Dua Koin', isTestItem: false, lab: { mode: 'coin', count: 2 },
    context: ['koin'],
    stem: 'Dua koin dilempar bersamaan. Tentukan peluang muncul [[tepat satu]] sisi Angka.',
    steps: [
      { no: 1, prompt: 'Pilih semua anggota ruang sampel (koin 1, koin 2).', check: { type: 'set', options: ['AA', 'AG', 'GA', 'GG', 'A', 'G'], answer: ['AA', 'AG', 'GA', 'GG'] },
        hints: ['Tiap koin bisa A atau G. Pasangkan.', 'Gunakan diagram pohon: koin 1 bercabang A/G, lalu koin 2 bercabang A/G.', 'Contoh: dua lampu nyala/mati → NN, NM, MN, MM.'] },
      { no: 2, prompt: 'Pilih anggota kejadian "tepat satu Angka".', check: { type: 'set', options: ['AA', 'AG', 'GA', 'GG'], answer: ['AG', 'GA'] },
        hints: ['"Tepat satu" artinya tidak boleh dua-duanya.', 'AG dan GA berbeda: koin pertama berbeda.', 'Contoh: tepat satu G → AG, GA.'] },
      { no: 3, prompt: 'P(A) = …', check: { type: 'fraction', answer: [2, 4] },
        hints: ['n(S) = 4.', 'n(A) = banyak anggota yang kamu pilih.', 'Contoh: 1 dari 4 → 1/4.'] }
    ]
  },
  {
    id: 'LAT-E3', indicator: 'employing', title: 'Jumlah Dua Dadu', isTestItem: false, lab: { mode: 'dice', count: 2 },
    context: ['dadu', 'ruang-sampel'],
    stem: 'Dua dadu (ungu dan merah muda) dilempar bersamaan. Berapa peluang [[jumlah]] mata dadunya [[sama dengan 7]]?',
    steps: [
      { no: 1, prompt: 'n(S) = …', check: { type: 'number', answer: 36 },
        hints: ['Dadu ungu punya 6 kemungkinan. Untuk tiap kemungkinan itu, dadu merah muda punya berapa?', 'Buat tabel 6 × 6.', 'Contoh: 2 koin → 2 × 2 = 4 kemungkinan.'] },
      { no: 2, prompt: 'n(A), banyak pasangan berjumlah 7 = …', check: { type: 'number', answer: 6 },
        hints: ['Mulai dari (1,6), lalu (2,5), …', 'Tulis semua: (1,6), (2,5), (3,4), (4,3), … lanjutkan.', 'Contoh: jumlah 4 → (1,3), (2,2), (3,1) = 3 pasangan.'] },
      { no: 3, prompt: 'P(A) = …', check: { type: 'fraction', answer: [6, 36] },
        hints: ['P(A) = n(A) / n(S).', '6/36 bisa disederhanakan dengan FPB 6.', 'Contoh: 3/36 = 1/12.'] }
    ]
  },
  {
    id: 'LAT-E4', indicator: 'employing', title: 'Kartu Remi', isTestItem: false, lab: { mode: 'cards' },
    context: ['kartu-remi'],
    stem: 'Dari satu set [[kartu remi]] (52 kartu) diambil satu kartu secara acak. Tentukan peluang terambil (a) kartu [[As]] dan (b) kartu [[hati]].',
    steps: [
      { no: 1, prompt: 'Ada berapa kartu As dalam satu set?', check: { type: 'number', answer: 4 },
        hints: ['Ada 4 jenis kartu. Tiap jenis punya berapa As?', 'Buka kamus kartu remi (ikon ?).', 'Contoh: kartu King juga ada 4 (satu per jenis).'] },
      { no: 2, prompt: 'P(As) = …', check: { type: 'fraction', answer: [4, 52] },
        hints: ['n(S) = 52.', 'P = 4/52, lalu sederhanakan.', 'Contoh: 13/52 = 1/4.'] },
      { no: 3, prompt: 'Ada berapa kartu hati?', check: { type: 'number', answer: 13 },
        hints: ['Tiap jenis punya berapa kartu?', 'As, 2 sampai 10, J, Q, K.', 'Hitung: 1 + 9 + 3.'] },
      { no: 4, prompt: 'P(hati) = …', check: { type: 'fraction', answer: [13, 52] },
        hints: ['n(A) = 13, n(S) = 52.', 'Sederhanakan dengan FPB 13.', 'Contoh: 26/52 = 1/2.'] }
    ]
  },
  // ───────── Interpreting ─────────
  {
    id: 'LAT-I1', indicator: 'interpreting', title: 'Dadu Curang?', isTestItem: false, lab: { mode: 'dice', count: 1 },
    stem: 'Ani melempar dadu [[60 kali]]. Mata dadu 6 muncul [[15 kali]]. Ani berkata, "Dadu ini pasti curang!" Apakah kesimpulan Ani [[masuk akal]]?',
    steps: [
      { no: 1, prompt: 'Peluang empirik muncul 6 = …', check: { type: 'fraction', answer: [15, 60] },
        hints: ['Empirik = dari hasil percobaan.', 'Banyak muncul / banyak lemparan.', 'Contoh: 8 kali dari 40 lemparan → 8/40.'] },
      { no: 2, prompt: 'Peluang teoretis muncul 6 = …', check: { type: 'fraction', answer: [1, 6] },
        hints: ['Teoretis = dari ruang sampel dadu seimbang.', 'n(A) = 1, n(S) = 6.', 'Contoh: koin seimbang → 1/2.'] },
      { no: 3, prompt: 'Bandingkan.', check: { type: 'compare', left: 1, right: 2, leftLabel: 'Empirik', rightLabel: 'Teoretis' },
        hints: ['Ubah ke desimal.', '15/60 = 0,25 dan 1/6 ≈ 0,17.', 'Contoh: 0,3 > 0,2.'] },
      { no: 4, prompt: 'Kesimpulan yang paling tepat?', check: { type: 'choice', options: ['Pasti curang karena hasilnya berbeda', 'Belum tentu curang; hasil percobaan bisa berbeda dari teori, apalagi lemparannya baru 60 kali', 'Pasti tidak curang'], correct: 1 },
        hints: ['Coba di Lab: lempar dadu 60× beberapa kali. Apakah hasilnya selalu 1/6?', 'Peluang empirik berubah-ubah, makin banyak percobaan makin dekat ke teori.', 'Contoh: koin seimbang dilempar 10× bisa muncul Angka 7 kali.'] }
    ]
  },
  {
    id: 'LAT-I2', indicator: 'interpreting', title: 'Hitungan Budi', isTestItem: false,
    stem: 'Budi menghitung peluang terambil bola biru dari kantong berisi 3 bola biru dan 2 bola putih. Budi mendapat hasil [[5/3]]. Apakah hasil Budi [[wajar]]?',
    steps: [
      { no: 1, prompt: 'Apakah 5/3 bisa menjadi nilai peluang?', check: { type: 'choice', options: ['Bisa', 'Tidak bisa, karena lebih dari 1', 'Tidak bisa, karena pecahan'], correct: 1 },
        hints: ['Peluang selalu di antara berapa dan berapa?', '0 ≤ P ≤ 1.', 'Contoh: 7/4 juga tidak mungkin jadi peluang.'] },
      { no: 2, prompt: 'Peluang yang benar = …', check: { type: 'fraction', answer: [3, 5] },
        hints: ['Budi tertukar n(A) dan n(S).', 'n(S) = 3 + 2, n(A) = bola biru.', 'Contoh: 1 merah dan 3 hijau → P(merah) = 1/4.'] },
      { no: 3, prompt: 'Apa kesalahan Budi?', check: { type: 'choice', options: ['Budi salah menjumlahkan', 'Budi menukar n(A) dan n(S)', 'Budi tidak menyederhanakan'], correct: 1 },
        hints: ['Lihat angka 5 dan 3 di jawaban Budi.', '5 adalah n(S), 3 adalah n(A).', 'n(A) selalu di atas.'] }
    ]
  },
  {
    id: 'LAT-I3', indicator: 'interpreting', title: 'Ramalan Cuaca', isTestItem: false,
    stem: 'Aplikasi cuaca menulis: peluang hujan besok [[0,8]]. Lusa peluang hujan [[0]]. Apa artinya?',
    steps: [
      { no: 1, prompt: 'Peluang 0,8 artinya …', check: { type: 'choice', options: ['Besok pasti hujan', 'Besok kemungkinan besar hujan, tapi tidak pasti', 'Besok hujan 8 jam'], correct: 1 },
        hints: ['Bandingkan 0,8 dengan 1 (pasti).', '0,8 dekat ke 1 tetapi belum 1.', 'Contoh: peluang 0,9 = sangat mungkin, belum pasti.'] },
      { no: 2, prompt: 'Peluang 0 artinya …', check: { type: 'choice', options: ['Mustahil terjadi', 'Mungkin terjadi', 'Pasti terjadi'], correct: 0 },
        hints: ['Lihat meteran peluang 0 sampai 1.', '0 ada di ujung "mustahil".', 'Contoh: peluang dadu muncul 7 = 0.'] },
      { no: 3, prompt: 'Contoh kejadian dengan peluang 1 adalah …', check: { type: 'choice', options: ['Dadu muncul angka kurang dari 7', 'Koin muncul Angka', 'Dadu muncul 6'], correct: 0 },
        hints: ['Peluang 1 = pasti terjadi.', 'Mata dadu selalu 1 sampai 6.', 'Contoh: koin muncul A atau G → peluang 1.'] }
    ]
  }
];
