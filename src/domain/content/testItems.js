/* Butir PRETEST/POSTTEST — Tabel 2 Kisi-Kisi Jawaban Mathematical Literacy (Rahma Elina Yasmin).
   5 soal × 6 tahap × skor 1 = 30.
   isTestItem: true → TIDAK boleh muncul di latihan, lab, atau petunjuk (agents.md aturan 7).
   Tahap yang berupa alasan (reason) dinilai otomatis dengan kata kunci dan DITANDAI untuk dicek ulang guru. */

const noHint = ['', '', ''];

export const TEST_ITEMS = [
  {
    id: 'TES-1', indicator: 'reasoning', title: 'Permainan Undian', isTestItem: true,
    stem: 'Terdapat dua kotak undian. Kotak A berisi 3 kupon merah dan 5 kupon biru, sedangkan Kotak B berisi 4 kupon merah dan 8 kupon biru. Seseorang akan mengambil satu kupon secara acak dan mendapat hadiah jika memperoleh kupon merah. Kotak mana yang sebaiknya dipilih agar peluang mendapatkan hadiah lebih besar? Jelaskan alasanmu.',
    steps: [
      { no: 1, prompt: 'Kejadian apa yang diharapkan?', hints: noHint,
        check: { type: 'choice', options: ['Terambil kupon biru', 'Terambil kupon merah', 'Terambil Kotak A'], correct: 1 } },
      { no: 2, prompt: 'Peluang terambil kupon merah dari Kotak A adalah …', hints: noHint,
        check: { type: 'fraction', answer: [3, 8] } },
      { no: 3, prompt: 'Peluang terambil kupon merah dari Kotak B adalah …', hints: noHint,
        check: { type: 'fraction', answer: [4, 12] } },
      { no: 4, prompt: 'Bandingkan kedua peluang tersebut.', hints: noHint,
        check: { type: 'compare', left: 2, right: 3, leftLabel: 'Peluang Kotak A', rightLabel: 'Peluang Kotak B' } },
      { no: 5, prompt: 'Kotak mana yang sebaiknya dipilih?', hints: noHint,
        check: { type: 'choice', options: ['Kotak A', 'Kotak B', 'Sama saja'], correct: 0, ecf: { from: 4, map: { '>': 0, '<': 1, '=': 2 } } } },
      { no: 6, prompt: 'Tuliskan alasanmu memilih kotak tersebut.', hints: noHint,
        check: { type: 'reason', model: 'Peluang di Kotak A (3/8 = 0,375) lebih tinggi daripada Kotak B (1/3 ≈ 0,333). Kupon merah di Kotak B memang lebih banyak, tetapi proporsinya terhadap total kupon lebih kecil.',
          groups: [['peluang', 'proporsi', 'perbandingan', 'dibanding', 'dari total', 'dari seluruh', 'total kupon', '3/8', '0,375', '0.375', '1/3', '4/12'],
                   ['lebih besar', 'lebih tinggi', 'lebih kecil', 'lebih rendah', 'lebih banyak', 'lebih sedikit', '>', '<']] } }
    ]
  },
  {
    id: 'TES-2', indicator: 'formulating', title: 'Pemilihan Ketua Kelas', isTestItem: true,
    stem: 'Sebuah kelas terdiri atas 32 siswa. Satu orang ketua kelas akan dipilih secara acak. Rina merupakan salah satu siswa di kelas tersebut. Tuliskan informasi yang diketahui, tentukan ruang sampel dan kejadian Rina terpilih, kemudian buatlah model matematika untuk menghitung peluang Rina menjadi ketua kelas.',
    steps: [
      { no: 1, prompt: 'Diketahui: jumlah seluruh siswa di kelas = … orang', hints: noHint, check: { type: 'number', answer: 32, unit: 'orang' } },
      { no: 2, prompt: 'Ruang sampel S adalah seluruh siswa yang mungkin terpilih. n(S) = …', hints: noHint, check: { type: 'number', answer: 32 } },
      { no: 3, prompt: 'Kejadian A adalah Rina terpilih. n(A) = …', hints: noHint, check: { type: 'number', answer: 1 } },
      { no: 4, prompt: 'Model matematika yang tepat untuk menghitung peluang adalah …', hints: noHint,
        check: { type: 'choice', options: ['P(A) = n(S) / n(A)', 'P(A) = n(A) × n(S)', 'P(A) = n(A) / n(S)'], correct: 2 } },
      { no: 5, prompt: 'Masukkan nilainya ke model: P(A) = …', hints: noHint,
        check: { type: 'fraction', answer: [1, 32], ecf: { num: 3, den: 2 } } },
      { no: 6, prompt: 'Kesimpulan yang tepat adalah …', hints: noHint,
        check: { type: 'choice', options: ['Rina pasti terpilih menjadi ketua kelas', 'Peluang Rina terpilih adalah 1/32, yaitu 1 dari 32 kemungkinan yang sama', 'Peluang Rina terpilih adalah 32'], correct: 1 } }
    ]
  },
  {
    id: 'TES-3', indicator: 'employing', title: 'Melempar Dadu', isTestItem: true,
    stem: 'Sebuah dadu bersisi enam dilempar satu kali. Tentukan peluang munculnya (a) mata dadu genap dan (b) mata dadu lebih dari 4. Tuliskan ruang sampel, kejadian, dan perhitungannya.',
    steps: [
      { no: 1, prompt: 'Pilih semua anggota ruang sampel S.', hints: noHint,
        check: { type: 'set', options: ['0', '1', '2', '3', '4', '5', '6', '7'], answer: ['1', '2', '3', '4', '5', '6'] } },
      { no: 2, prompt: 'Kejadian A = muncul mata dadu genap. Pilih semua anggota A.', hints: noHint,
        check: { type: 'set', options: ['1', '2', '3', '4', '5', '6'], answer: ['2', '4', '6'] } },
      { no: 3, prompt: 'P(A) = n(A) / n(S) = …', hints: noHint, check: { type: 'fraction', answer: [3, 6], ecf: { num: 2, den: 1 } } },
      { no: 4, prompt: 'Kejadian B = muncul mata dadu lebih dari 4. Pilih semua anggota B.', hints: noHint,
        check: { type: 'set', options: ['1', '2', '3', '4', '5', '6'], answer: ['5', '6'] } },
      { no: 5, prompt: 'P(B) = n(B) / n(S) = …', hints: noHint, check: { type: 'fraction', answer: [2, 6], ecf: { num: 4, den: 1 } } },
      { no: 6, prompt: 'Kesimpulan yang tepat adalah …', hints: noHint,
        check: { type: 'choice', options: ['Peluang genap 1/3 dan peluang lebih dari 4 adalah 1/2', 'Peluang genap 1/2 dan peluang lebih dari 4 adalah 1/3', 'Keduanya 1/2'], correct: 1 } }
    ]
  },
  {
    id: 'TES-4', indicator: 'interpreting', title: 'Percobaan Melempar Koin', isTestItem: true,
    stem: 'Sebuah koin dilempar sebanyak 40 kali. Hasilnya, sisi angka muncul 26 kali dan sisi gambar muncul 14 kali. Beni menyatakan bahwa peluang muncul sisi angka pada pelemparan berikutnya adalah 26/40. Apakah pernyataan Beni selalu benar? Jelaskan perbedaan peluang empirik dan peluang teoretis pada koin yang seimbang.',
    steps: [
      { no: 1, prompt: 'Sisi angka muncul … kali dari … percobaan.', hints: noHint,
        check: { type: 'fraction', answer: [26, 40], exact: true, numLabel: 'kali muncul', denLabel: 'percobaan' } },
      { no: 2, prompt: 'Peluang empirik sisi angka = …', hints: noHint, check: { type: 'fraction', answer: [26, 40] } },
      { no: 3, prompt: 'Peluang teoretis sisi angka pada koin seimbang = …', hints: noHint, check: { type: 'fraction', answer: [1, 2] } },
      { no: 4, prompt: 'Apa perbedaan kedua peluang tersebut?', hints: noHint,
        check: { type: 'choice', options: ['Keduanya selalu sama', 'Peluang empirik berasal dari hasil percobaan, peluang teoretis dari anggapan koin seimbang', 'Peluang teoretis dihitung dari hasil 40 lemparan'], correct: 1 } },
      { no: 5, prompt: 'Bagaimana menilai angka 26/40?', hints: noHint,
        check: { type: 'choice', options: ['26/40 adalah frekuensi relatif dari 40 lemparan yang sudah terjadi, bukan kepastian lemparan ke-41', '26/40 pasti terjadi lagi pada lemparan berikutnya', 'Koin itu pasti tidak seimbang'], correct: 0 } },
      { no: 6, prompt: 'Apakah pernyataan Beni selalu benar? Tuliskan kesimpulan dan alasanmu.', hints: noHint,
        check: { type: 'reason', model: 'Pernyataan Beni tidak selalu benar. Pada koin seimbang, peluang teoretis sisi angka pada setiap lemparan tetap 1/2 (0,5).',
          groups: [['tidak', 'belum', 'salah', 'bukan'], ['1/2', '0,5', '0.5', 'setengah', '50']] } }
    ]
  },
  {
    id: 'TES-5', indicator: 'employing', title: 'Pengambilan Bola', isTestItem: true,
    stem: 'Di dalam sebuah kantong terdapat 5 bola merah, 3 bola kuning, dan 2 bola hijau. Satu bola diambil secara acak. Tentukan peluang terambilnya (a) bola kuning dan (b) bola yang bukan berwarna merah. Tuliskan langkah penyelesaiannya.',
    steps: [
      { no: 1, prompt: 'Jumlah seluruh bola: n(S) = …', hints: noHint, check: { type: 'number', answer: 10 } },
      { no: 2, prompt: 'Banyak bola kuning: n(A) = …', hints: noHint, check: { type: 'number', answer: 3 } },
      { no: 3, prompt: 'P(A) = n(A) / n(S) = …', hints: noHint, check: { type: 'fraction', answer: [3, 10], ecf: { num: 2, den: 1 } } },
      { no: 4, prompt: 'Banyak bola yang bukan merah: n(B) = …', hints: noHint, check: { type: 'number', answer: 5 } },
      { no: 5, prompt: 'P(B) = n(B) / n(S) = …', hints: noHint, check: { type: 'fraction', answer: [5, 10], ecf: { num: 4, den: 1 } } },
      { no: 6, prompt: 'Kesimpulan yang tepat adalah …', hints: noHint,
        check: { type: 'choice', options: ['P(kuning) = 3/5 dan P(bukan merah) = 1/2', 'P(kuning) = 3/10 dan P(bukan merah) = 1/5', 'P(kuning) = 3/10 dan P(bukan merah) = 1/2'], correct: 2 } }
    ]
  }
];

export const TEST_MAX = TEST_ITEMS.reduce((a, it) => a + it.steps.length, 0); // 30
