# PRD — MaWiYas

**Product Requirements Document** · Versi 0.1 (draf, tahap ADDIE: Analysis → Design) · 14 November 2026

> Aplikasi Android untuk siswa SMP kelas VIII belajar **Konsep Dasar Peluang**, dirancang dengan prinsip **Cognitive Load Theory (CLT)** dan diarahkan untuk meningkatkan **Mathematical Literacy**. Ilustrasi 3D (koin, dadu, kartu, roda putar, kantong kelereng) di atas lapangan rumput dibangun dengan **three.js**.

---

## 1. Latar belakang

Dokumen ini disusun dari dua sumber:

1. **Hasil wawancara mendalam informan S01** (siswa yang telah mempelajari Konsep Dasar Peluang, 35 menit, 6 November 2026) menggunakan pedoman wawancara berbasis CLT (kode KO, IL, EL, GL, DS).
2. **Kisi-kisi soal Mathematical Literacy** (4 indikator: Reasoning, Formulating, Employing, Interpreting & Evaluating) dengan penskoran per tahapan.

Setiap fitur dalam PRD ini **wajib** memiliki jejak ke bukti temuan (kode kutipan), rasional teori, perilaku pengguna yang diharapkan, dan indikator uji — sesuai ketentuan bagian H pedoman wawancara.

## 2. Tujuan produk

| # | Tujuan | Ukuran keberhasilan |
|---|--------|---------------------|
| T1 | Meningkatkan Mathematical Literacy siswa pada materi peluang | Kenaikan skor pretest→posttest (N-gain) total dan per indikator (maks. 24 poin, 4 indikator × 6) |
| T2 | Menurunkan beban kognitif yang tidak relevan (extraneous) | Skor EL pada kuesioner beban kognitif (adaptasi Leppink dkk., 2013 / Klepsch dkk., 2017) lebih rendah dari pembelajaran biasa |
| T3 | Mengelola beban intrinsik lewat pentahapan & prasyarat | Persentase siswa yang lulus diagnostik pecahan setelah remedial; jumlah langkah salah di "menentukan n(S)" menurun |
| T4 | Mendorong pemrosesan bermakna (germane) | Kualitas jawaban "Jelaskan alasanmu" meningkat; ketergantungan pada petunjuk menurun (fading) |
| T5 | Aplikasi layak pakai di HP Android siswa | SUS ≥ 70; berjalan lancar (≥ 30 fps) di HP kelas bawah |

## 3. Pengguna

| Persona | Deskripsi | Kebutuhan utama |
|---------|-----------|-----------------|
| **Siswa kelas VIII** (pengguna utama) | 13–14 tahun, memakai HP Android sendiri/keluarga, kuota terbatas, terbiasa dengan video YouTube dan aplikasi game | Penjelasan bahasa sehari-hari, visual yang bisa dimainkan, petunjuk saat mentok, tidak ada iklan |
| **Guru matematika** | Mengajar di kelas, ingin tahu siswa mana yang tersendat | Ringkasan progres per kode siswa, bisa dipakai saat praktikum |
| **Peneliti** (mahasiswa) | Menjalankan uji coba ADDIE (Implementation & Evaluation) | Ekspor data pretest/posttest, log petunjuk, kuesioner CLT, tanpa nama asli |

## 4. Peta temuan → keputusan fitur (traceability)

| Bukti (kode) | Temuan | Jenis beban | Fitur | Indikator ML yang didukung | Cara uji |
|---|---|---|---|---|---|
| IL01, K03 | Bingung peluang **empiris vs teoretis** | Intrinsic (IL1) | **F02 Lab Simulasi 3D** + grafik frekuensi relatif yang mendekati nilai teoretis | Interpreting & Evaluating | Siswa menjelaskan mengapa 26/40 ≠ 1/2 (soal kisi no. 4) |
| IL01, EL04, GL01 | Tertukar titik sampel vs n(S) pada **2 dadu**; tabel di papan terlalu cepat | IL2 + EL3 | **F03 Pembangun Ruang Sampel** (tabel silang & diagram pohon interaktif, langkah demi langkah) | Employing | Siswa menjelaskan kenapa n(S) dua dadu = 36 |
| IL02, IL03, DS01 | Lemah di **penyederhanaan pecahan** | IL3 (prasyarat) | **F01 Diagnostik & Remedial Pecahan** | Employing | Skor diagnostik sebelum/sesudah remedial |
| IL04, IL05, EL05 | Soal cerita **"mbulet"**, salah menafsirkan syarat kejadian (prima ganjil) | IL2 + EL1 | **F04 Penerjemah Soal Cerita** (stabilo kata kunci, pisah latar vs data, kartu Diketahui/Ditanya) | Formulating | Siswa menemukan n(A) tanpa petunjuk langsung |
| EL01 | Gagal karena konteks asing (**kartu bridge**) | EL1 | **F09 Kamus Konteks** (kenalan kartu remi, dadu, koin dengan visual 3D) | Formulating | Siswa menjawab soal kartu setelah membuka kamus |
| EL02 | Rumus dan diagram **terpisah halaman** (split-attention) | EL2 | **Aturan desain D1: tata letak terintegrasi** — rumus selalu menempel pada diagram dalam 1 layar | Semua | Uji navigasi & wawancara kejelasan tampilan |
| EL03, DS03 | Animasi stiker & warna "jreng" mengganggu | EL2 | **Aturan desain D2: warna lembut, animasi hanya yang bermakna**, Mode Fokus | Semua | Kuesioner EL & observasi |
| EL04 | Penjelasan terlalu cepat | EL3 | **F10 Kontrol Tempo** (jeda, ulangi langkah, lanjut sendiri) | Employing | Log penggunaan tombol ulang |
| GL02 | Mengecek kewajaran: 0 ≤ P ≤ 1 | GL2 | **F06 Cek Kewajaran** (meteran peluang 0–1) | Interpreting & Evaluating | Siswa mendeteksi hasil 5/3 sebagai salah |
| GL03, DS02 | Butuh **petunjuk bertahap**, bukan kunci jawaban; muncul otomatis setelah 2× salah | GL3 | **F05 Petunjuk Bertahap + Fading** | Semua | Jumlah petunjuk yang dipakai menurun pada latihan lanjutan |
| GL04 | Menjelaskan ke teman memperkuat pemahaman | GL2 | **F07 Jelaskan Alasanmu** (self-explanation, pilih/ketik alasan) | Reasoning | Kualitas alasan (rubrik) |
| GL05 | Pola universal: n(S) → n(A) → bagi | GL1/GL3 | **F08 Pola 3 Langkah** (kerangka tetap di semua soal, konteks berganti) | Formulating, Employing | Transfer ke konteks baru (bola, kupon, kartu) |
| Kisi-kisi ML | 4 indikator, skor per tahap, skor parsial | — | **F11 Latihan ML Bertahap** + **F12 Pretest/Posttest** | Semua | Rubrik per tahap |
| Pedoman C, G | Kode informan tanpa nama | — | **F13 Data & Ekspor Penelitian** | — | Audit data: tidak ada nama |

## 5. Ruang lingkup fitur

Prioritas: **P0** = wajib untuk prototipe uji coba, **P1** = penting, **P2** = bila waktu cukup.

### F01 · Diagnostik & Remedial Pecahan — P0
- 5–8 butir cepat (menyederhanakan pecahan, membandingkan pecahan, pecahan ↔ desimal).
- Jika skor < ambang (default 70%), buka modul remedial mini lalu kembali ke jalur utama.
- Hasil diagnostik menentukan jalur belajar (adaptif ringan).

### F02 · Lab Simulasi 3D (three.js) — P0
Objek peluang di atas **lapangan rumput** (lihat design.md):

| Objek | Variasi | Konsep yang dilatih |
|---|---|---|
| Koin | 1 koin, 2 koin, 3 koin; beberapa jenis koin (emas, perak, perunggu) | Ruang sampel A/G, diagram pohon |
| Dadu | 1 dadu, 2 dadu; beberapa gaya (klasik, jeli bening, kayu); opsi dadu 4/8/12/20 sisi (P2) | n(S)=6, n(S)=36, kejadian genap/prima/>4 |
| Kartu remi | 52 kartu; ambil 1 kartu | Kejadian as, merah/hitam, hati, kartu bergambar |
| Roda putar (spinner) | Sektor sama besar & tidak sama besar | Peluang tidak sama (pengayaan) |
| Kantong bola | 4 merah, 4 kuning, 2 hijau; bola dikembalikan | n(S) dari banyak benda, K03 (isi sengaja berbeda dari soal tes no. 5) |
| Kotak undian kupon | Kotak A (2 merah, 3 biru) vs Kotak B (3 merah, 6 biru) | Reasoning: banyak ≠ peluang besar (angka sengaja berbeda dari soal tes no. 1) |
| Tutup botol (P1) | Mendarat telentang/telungkup | Kejadian yang **tidak** sama kemungkinan → hanya peluang empiris |

Fungsi lab:
- Lempar **1×** dengan animasi fisika realistis, atau **10× / 100× / 1000×** mode cepat.
- Tabel frekuensi + grafik frekuensi relatif yang bergerak mendekati garis peluang teoretis.
- Rumus `P(A) = n(A)/n(S)` ditampilkan **di layar yang sama** dengan objek 3D dan grafik.

### F03 · Pembangun Ruang Sampel — P0
- Tabel silang 2 dadu / 2 koin: siswa mengisi sel satu per satu (atau baris per baris), app menyorot sel yang terlewat.
- Diagram pohon: siswa menyeret cabang; jumlah ujung cabang = n(S).
- Mode "tonton dulu" (worked example) → "lengkapi" (completion problem) → "buat sendiri" (fading worked example).

### F04 · Penerjemah Soal Cerita — P0
- Siswa men-stabilo kata kunci (sentuh kata); kata matematis penting (dan, atau, paling sedikit, bukan, lebih dari, prima, ganjil, genap) dapat ditandai otomatis setelah percobaan pertama.
- Memisahkan kalimat **latar cerita** vs **data matematis** (seret ke dua kotak).
- Kartu **Diketahui / Ditanya / n(S) / n(A)** sebelum menghitung.
- Pemeriksa syarat kejadian bertingkat: "prima" → {2,3,5}; "prima **dan** ganjil" → {3,5}.

### F05 · Petunjuk Bertahap + Fading — P0
- Level 1: pertanyaan pemantik ("Coba sebutkan dulu berapa n(S)-nya").
- Level 2: petunjuk terarah (menunjuk bagian tabel/diagram).
- Level 3: contoh sejenis yang sudah dikerjakan (bukan jawaban soal ini).
- Muncul otomatis setelah **2× salah** pada langkah yang sama; tombol "Petunjuk" selalu tersedia.
- Fading: semakin mahir (berdasarkan riwayat), level awal petunjuk berkurang dan petunjuk otomatis muncul lebih lambat.

### F06 · Cek Kewajaran — P0
- Meteran peluang 0 → 1 (mustahil — pasti) muncul di setiap jawaban.
- Jawaban < 0 atau > 1 memicu umpan balik "Peluang tidak mungkin lebih dari 1, cek lagi n(A) dan n(S)".

### F07 · Jelaskan Alasanmu — P1
- Setelah soal Reasoning/Interpreting: siswa memilih alasan (pilihan ganda beralasan) atau mengetik singkat.
- Opsi "jelaskan ke teman virtual" (prompt menjelaskan).

### F08 · Pola 3 Langkah — P0
- Kerangka tetap di setiap soal: **① Cari n(S) → ② Cari n(A) → ③ Bagi & sederhanakan → ④ Cek kewajaran**.
- Konteks soal berganti (kelereng, bola, kupon, kartu, siswa) agar terjadi transfer.

### F09 · Kamus Konteks — P1
- Kartu remi: 52 kartu, 4 jenis (♠ ♣ hitam, ♥ ♦ merah), 13 per jenis, 12 kartu bergambar, 4 as — ditampilkan 3D dan bisa dibalik.
- Dadu, koin (sisi Angka/Gambar), spinner, kantong.
- Diakses lewat ikon "?" di samping istilah dalam soal (tanpa pindah halaman).

### F10 · Kontrol Tempo — P0
- Setiap penjelasan dipecah per langkah; tombol **Ulangi langkah**, **Lanjut**, tidak ada auto-advance.

### F11 · Latihan Mathematical Literacy — P0
- Bank soal per indikator (Reasoning, Formulating, Employing, Interpreting & Evaluating).
- Jawaban per tahap dengan **skor parsial** sesuai kisi-kisi (kesalahan hitung di tahap akhir tidak menghapus skor tahap sebelumnya).
- Butir latihan **berbeda** dari butir pretest/posttest.

### F12 · Pretest / Posttest & Kuesioner — P1
- Mode tes terkunci (tanpa petunjuk, tanpa lab).
- Kuesioner beban kognitif singkat setelah sesi (skala, adaptasi; harus divalidasi sebelum dipakai).

### F13 · Data & Ekspor Penelitian — P1
- Login dengan **kode siswa** (S01, S02, …) + kode kelas; **tidak ada nama asli**.
- Ekspor CSV/JSON: skor per tahap, penggunaan petunjuk, waktu per langkah, hasil kuesioner.

### F14 · Mode Guru — P2
- Ringkasan per kode siswa: diagnostik, indikator ML terlemah, langkah paling sering salah.

## 6. Di luar ruang lingkup (non-goals)

- **Tidak ada iklan**, pop-up promosi, atau pembelian dalam aplikasi (DS03).
- Tidak ada animasi hiasan di layar membaca soal/penjelasan (EL03). Animasi 3D hanya di Lab dan Kamus Konteks.
- Tidak ada papan peringkat publik/kompetisi antar-siswa (menghindari kecemasan).
- Tidak ada akun dengan nama asli, email, atau foto siswa.
- Materi di luar Konsep Dasar Peluang kelas VIII (peluang bersyarat formal, kombinatorika lanjut) hanya sebagai "Tantangan" opsional.

## 7. Persyaratan non-fungsional

| Aspek | Persyaratan |
|---|---|
| Platform | Android (target minimum ditentukan lewat wawancara lanjutan; usulan: Android 8.0 / API 26+) |
| Offline | Seluruh materi, lab, latihan berjalan tanpa internet; sinkronisasi data penelitian opsional |
| Ukuran | APK ≤ 40 MB (usulan) |
| Kinerja | ≥ 30 fps di HP RAM 3 GB; 3 tingkat kualitas grafis (Hemat / Sedang / Tinggi), otomatis terdeteksi |
| Baterai | Scene 3D berhenti merender saat tidak terlihat/diam |
| Bahasa | Bahasa Indonesia sehari-hari yang sopan; kalimat ≤ 20 kata pada instruksi |
| Aksesibilitas | Target sentuh ≥ 48 dp; kontras teks ≥ 4.5:1; informasi tidak hanya lewat warna; opsi kurangi gerakan |
| Ketepatan matematika | Peluang dihitung sebagai **pecahan eksak** (bukan float); keacakan memakai RNG kriptografis |
| Privasi | Data lokal di perangkat; ekspor hanya berisi kode; persetujuan orang tua/wali di luar aplikasi |

## 8. Alur pengguna utama

```
Masuk (kode siswa) → Diagnostik pecahan ─┬─ lulus ──────────────┐
                                          └─ belum → Remedial ───┤
                                                                 ▼
          Peta Belajar: ① Kenalan (Kamus Konteks) → ② Lab Empiris → ③ Ruang Sampel
                        → ④ Peluang Teoretis → ⑤ Empiris vs Teoretis → ⑥ Soal Cerita
                                                                 ▼
                               Latihan ML (4 indikator, petunjuk bertahap)
                                                                 ▼
                                      Refleksi & ringkasan progres
```

## 9. Risiko & catatan untuk peneliti

1. **Informan baru satu (S01).** Pedoman mensyaratkan minimal 2 siswa. Fitur ditandai "berdasarkan S01" sampai data S02 tersedia; variasi temuan didokumentasikan, bukan digeneralisasi.
2. **Ketegangan desain:** permintaan animasi 3D (rumput bergoyang, koin & dadu realistis) vs temuan EL03/DS03 (animasi berlebihan mengganggu). Penyelesaian: animasi 3D **hanya bermakna** (hasil lemparan adalah data), rumput bergerak halus, semua bisa dimatikan lewat **Mode Fokus**; layar soal tetap bersih.
3. **Kisi-kisi Tabel 2 sudah dirapikan** (versi terbaru: 5 soal × 6 tahap × skor 1 = 30) dan dipakai sebagai butir pretest/posttest di aplikasi. Catatan tersisa: soal 3 & 5 sama-sama indikator *Employing*, sehingga skor per indikator tidak seimbang (Employing 12, lainnya 6); soal 2 (Formulating) memiliki n(A)=1 yang sangat sederhana.
4. **Referensi:** DOI Leppink dkk. (2013) tertulis `10.3389/...`; seharusnya `10.3758/s13428-013-0334-1`.
5. Instrumen (wawancara, kuesioner CLT, soal ML) belum tervalidasi — jadwalkan validasi ahli (Aiken's V) dan uji keterbacaan.

## 10. Hasil wawancara pengembang ↔ peneliti (14 Nov 2026)

| Topik | Keputusan | Dampak |
|---|---|---|
| Spesifikasi HP siswa | **Campuran / belum diketahui** | Deteksi kemampuan HP otomatis (Hemat/Sedang/Tinggi) wajib; default aman = Hemat sampai benchmark selesai; minSdk 26 (Android 8) |
| Tempat & perangkat | **Kombinasi kelas dan rumah** (HP siswa) | Pretest/posttest di kelas (Mode Tes terkunci); latihan bisa dilanjutkan di rumah → perlu panduan dalam aplikasi & progres tersimpan per kode siswa |
| Pengumpulan data | **Ekspor file manual** (CSV/JSON via Share) | Tidak ada server; izin INTERNET tidak diperlukan; REST di `api.md §5` tetap opsional |
| Langkah berikutnya | **Prototipe Lab 3D dulu** | Lihat `prototype/lab-3d.html` |

### Pertanyaan yang masih terbuka
- Distribusi: APK langsung atau Google Play (internal testing)?
- Berapa sesi/pertemuan uji coba dan durasi tiap sesi?
- Data latihan di rumah: diekspor oleh siswa sendiri atau dikumpulkan saat pertemuan berikutnya di kelas?

## 11. Tambahan atas permintaan peneliti (17 Nov 2026, v1.3.0)

Fitur di bawah diminta langsung oleh peneliti (pemilik produk). Beberapa sengaja **menyimpang** dari aturan desain awal; penyimpangan dicatat agar bisa dievaluasi pada tahap Evaluation.

| Kode | Fitur | Catatan / penyimpangan |
|---|---|---|
| F15 | Intro: meja permainan (dadu & kartu) → roda undian kode siswa → pemain bola pemandu → tendangan ke gawang → Beranda inti | Animasi dekoratif (menyimpang dari D3/EL03). Dibuat CSS/SVG (bukan three.js) agar ringan; mati saat Mode Fokus / Kurangi Gerakan |
| F16 | Transisi "kembali": rewind + geser cepat ke kiri | Mati saat Mode Fokus / Kurangi Gerakan |
| F17 | Latihan Soal Berlevel: Mudah 5 (suit, nyawa 100), Sedang 10 (mobil ke kantor, bensin 100), Sulit 15 (kucing, maks. 5 salah); salah −5; soal tidak lanjut sebelum benar; petunjuk 3/2/1 per soal | Elemen permainan menambah beban ekstrinsik — perlu diamati (kuesioner EL). Petunjuk tetap tidak memuat jawaban (F05). Isi soal = draf, perlu validasi |
| F18 | Penghargaan bunga (biru, merah muda, kuning, putih) + kalimat penutup | Hanya muncul saat level selesai |
| F19 | Kemampuan Saya 1–10 (tangga 10 kemampuan konkret) | Hanya untuk siswa sendiri, bukan peringkat (sesuai §6) |
| F20 | Istirahat (3/5/10 menit) + saran istirahat otomatis (3× salah beruntun atau 15 menit) | Lama istirahat dicatat |
| F21 | Kode siswa huruf+angka bebas (A01, B12, …), kode kelas bebas | Tetap tanpa nama asli (aturan 18) |
| F22 | Pencadangan ke Supabase | Mengubah keputusan §10 "tanpa server". Tanpa SDK (REST langsung), offline-first lewat antrean; kunci aplikasi hanya bisa menambah; hanya pemilik proyek yang bisa membaca. Perlu disebut di surat persetujuan orang tua/wali |

