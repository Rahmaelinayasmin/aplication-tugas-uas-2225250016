# Design — MaWiYas

Sistem desain visual, interaksi, dan ilustrasi 3D. Semua keputusan di sini diturunkan dari temuan wawancara (kode di dalam kurung) dan prinsip Cognitive Load Theory.

---

## 1. Prinsip desain (aturan wajib)

| Kode | Prinsip | Asal temuan | Penerapan |
|---|---|---|---|
| **D1** | Tata letak terintegrasi (anti split-attention) | EL02 | Rumus, diagram, dan objek 3D yang saling berkaitan selalu berada dalam **satu layar**; label ditempel langsung pada objek, bukan di legenda terpisah |
| **D2** | Tenang dan lembut | EL03, DS03 | Palet pastel *soft colorful*, latar terang netral, tidak ada stiker bergerak, tidak ada latar mencolok |
| **D3** | Animasi harus bermakna | EL03 | Gerak hanya jika menyampaikan data (hasil lemparan, sel yang terisi, cabang pohon tumbuh). Rumput bergoyang halus sebagai suasana lapangan, bisa dimatikan |
| **D4** | Satu langkah per layar | EL04, IL02 | Penjelasan dipecah per langkah; tidak ada perpindahan otomatis |
| **D5** | Sinyal pada yang penting | EL05, IL05 | Stabilo kata kunci, warna konsisten: n(S) selalu **biru**, n(A) selalu **oranye** |
| **D6** | Bahasa ngobrol | DS03 | Kalimat pendek, sapaan "kamu", istilah baku diperkenalkan dengan contoh dulu |
| **D7** | Bantuan bertahap, bukan jawaban | GL03 | Tombol Petunjuk berlevel; jawaban akhir tidak pernah langsung diberikan |

## 2. Palet warna — *soft colorful*

Token didefinisikan di `src/ui/theme/tokens.css`. Warna pastel dipakai untuk permukaan/objek; teks tetap gelap agar kontras ≥ 4.5:1.

| Token | Hex | Pemakaian |
|---|---|---|
| `--bg` | `#FBF8F3` | Latar aplikasi (krem hangat) |
| `--surface` | `#FFFFFF` | Kartu, panel |
| `--ink` | `#2E3440` | Teks utama |
| `--ink-soft` | `#5B6475` | Teks sekunder |
| `--sky` | `#BFE3F5` | Langit scene 3D, panel info |
| `--grass-1` | `#A8D5A2` | Garis rumput terang |
| `--grass-2` | `#8EC48A` | Garis rumput gelap |
| `--mint` | `#BDEBD6` | Status benar / berhasil |
| `--peach` | `#FFD6BA` | Aksen hangat, tombol sekunder |
| `--lavender` | `#D9CCF5` | Petunjuk (hint) |
| `--butter` | `#FFF1B8` | Stabilo kata kunci |
| `--rose` | `#F8C8D4` | Perhatian lembut (bukan merah tajam untuk "salah") |
| `--ns-blue` | `#4A90C2` | **Selalu** untuk n(S) / ruang sampel (isian, garis grafik) |
| `--ns-blue-text` | `#2F6F9F` | Teks n(S) (kontras ≥ 4.5:1) |
| `--na-orange` | `#E8863A` | **Selalu** untuk n(A) / kejadian (isian, garis grafik) |
| `--na-orange-text` | `#B5591A` | Teks n(A) (kontras ≥ 4.5:1) |
| `--primary` | `#5B8DEF` | Tombol utama |

Mode gelap: opsional (P2). Warna "salah" memakai rose + ikon + teks, tidak hanya warna (aksesibilitas buta warna).

## 3. Tipografi & ukuran

- Font: **Plus Jakarta Sans** (dibundel lokal, tidak dari internet) — 400/600/700.
- Angka & rumus: **JetBrains Mono** atau fitur `tabular-nums`.
- Skala: 14 / 16 (isi) / 18 / 22 / 28 sp. Isi soal minimal 16 sp.
- Pecahan ditampilkan bertumpuk (pembilang di atas penyebut), bukan `3/8` dalam teks biasa, kecuali di tabel kecil.
- Target sentuh ≥ 48 dp; jarak antar tombol ≥ 8 dp.

## 4. Komponen UI

| Komponen | Keterangan |
|---|---|
| `StepCard` | Satu langkah penjelasan, tombol *Ulangi* & *Lanjut* (D4) |
| `FormulaChip` | `P(A) = n(A)/n(S)` dengan n(A) oranye & n(S) biru, terisi angka secara langsung |
| `ProbabilityMeter` | Garis 0 — ½ — 1 dengan label "mustahil · seimbang · pasti" (F06) |
| `HintButton` | Ungu lavender, menampilkan level 1/2/3 (F05) |
| `HighlightText` | Teks soal yang bisa disentuh per kata untuk distabilo (F04) |
| `KnownAskedCards` | Kartu Diketahui / Ditanya / n(S) / n(A) (F04, F08) |
| `SampleSpaceGrid` | Tabel silang 6×6 / 2×2 interaktif (F03) |
| `TreeBuilder` | Diagram pohon dengan cabang yang bisa diseret (F03) |
| `FrequencyChart` | Grafik garis frekuensi relatif + garis putus-putus peluang teoretis (F02) |
| `ContextGlossary` | Bottom sheet kamus konteks, muncul di atas soal tanpa pindah halaman (F09) |
| `ThreeStage` | Wadah kanvas three.js (lihat bagian 6) |

## 5. Daftar layar & wireframe

### 5.1 Peta layar
```
Splash → Masuk (kode) → Diagnostik Pecahan → [Remedial]
   → Beranda / Peta Belajar
        ├─ Kenalan Benda Peluang (Kamus Konteks 3D)
        ├─ Lab Lapangan (simulasi 3D)
        ├─ Pembangun Ruang Sampel (tabel & pohon)
        ├─ Belajar Bertahap (6 unit)
        ├─ Latihan Literasi (4 indikator)
        └─ Progres Saya
   → Pengaturan (kualitas grafis, Mode Fokus, kurangi gerakan, suara)
   → [Mode Tes: pretest/posttest]  → [Mode Guru]
```

### 5.2 Lab Lapangan (layar potret, terintegrasi — D1)
```
┌───────────────────────────────┐
│ ← Lab Lapangan     ⚙  ?      │
├───────────────────────────────┤
│                               │
│   [ scene 3D: rumput lapangan │
│     + 2 dadu jatuh & berguling]│   ~45% tinggi layar
│        hasil:  ⚃ + ⚅          │   label menempel di atas dadu
├───────────────────────────────┤
│ Kejadian A: jumlah mata = 7 ▾ │
│ P(A) = n(A)/n(S) = 6/36 = 1/6 │   FormulaChip (oranye/biru)
│ ───────── grafik ──────────── │   frekuensi relatif vs garis 1/6
│ Lemparan: 48   Muncul A: 9    │
├───────────────────────────────┤
│ [Lempar 1×] [10×] [100×]  ↺  │
└───────────────────────────────┘
```
Lanskap: scene 3D kiri, panel rumus+grafik kanan.

### 5.3 Soal cerita (tanpa animasi — D3)
```
┌───────────────────────────────┐
│ Latihan · Formulating   2/5   │
├───────────────────────────────┤
│ Di kantong ada 5 bola merah,  │
│ 3 bola [kuning] dan 2 bola    │  ← kata bisa distabilo (butter)
│ hijau. Peluang terambil bola  │
│ [bukan] merah?                │
├───────────────────────────────┤
│ ① n(S) = [  ]  ② n(A) = [  ]  │  Pola 3 Langkah (F08)
│ ③ P = [ ]/[ ] = [ ]/[ ]       │
│ 0 ───────●──────── 1          │  ProbabilityMeter
├───────────────────────────────┤
│ [💡 Petunjuk]      [Periksa] │
└───────────────────────────────┘
```

## 6. Arahan seni 3D (three.js)

### 6.1 Suasana: lapangan rumput
- Lantai berupa **lapangan rumput bergaris** seperti lapangan sepak bola (pola potongan rumput terang/gelap selang-seling, `--grass-1`/`--grass-2`), dengan garis kapur putih lembut (garis tengah & lingkaran) — memberi kesan tempat "pelemparan koin" sebelum pertandingan.
- **Helai rumput 3D**: `InstancedMesh` dari bilah rumput sederhana (3–5 segmen), vertex shader angin (sinus + noise) → goyangan halus, amplitudo kecil.
  - Hemat: 0 helai (tekstur saja, tanpa goyang) · Sedang: ~8.000 helai · Tinggi: ~30.000 helai.
  - Rumput **tertekan** sedikit di titik dadu/koin mendarat (opsional, Tinggi).
- Langit gradien pastel (`--sky` → putih), cahaya matahari hangat dari samping, bayangan lembut (PCF soft, hanya pada objek yang dilempar).
- Kamera tetap (sudut ±35° ke bawah); siswa bisa memutar sedikit dengan dua jari, ketuk dua kali untuk kembali. Tidak ada kamera yang bergerak liar.

### 6.2 Koin (berbeda-beda)
| Jenis | Material | Sisi |
|---|---|---|
| Koin Emas Bintang | logam emas lembut, PBR (metalness 0.9, roughness 0.35) | **A** (angka "1") / **G** (gambar bintang) |
| Koin Perak Daun | perak | A / G (daun) |
| Koin Perunggu | perunggu, tepi bergerigi | A / G (rumah adat bergaya umum) |
| Koin Jumbo Belajar | pastel mint dengan huruf A/G besar | Untuk pemula (jelas terbaca) |

Desain koin generik (bukan replika mata uang asli). Sisi "Angka/Gambar" mengikuti istilah buku SMP.

**Animasi lempar koin realistis:** dorongan ke atas + putaran pada sumbu horizontal (flip) dengan sedikit goyang (wobble) → jatuh ke rumput → memantul kecil → berguling/bergoyang mengecil (*settling*) → diam. Suara "cling" lembut (bisa dimatikan). Variasi tiap lempar dari kecepatan awal acak.

### 6.3 Dadu (berbeda-beda)
| Jenis | Tampilan |
|---|---|
| Dadu Klasik | putih gading, sudut membulat, mata cekung (titik) |
| Dadu Jeli | bening pastel (pink/biru/kuning) dengan *transmission* (Tinggi) / semi-transparan (Hemat) |
| Dadu Kayu | tekstur kayu terang, mata dibakar |
| Dadu Angka | sisi bertuliskan angka 1–6 (untuk siswa yang lebih mudah membaca angka) |
| Dadu Polihedral (P2) | 4, 8, 12, 20 sisi — eksplorasi n(S) berbeda |

Dua dadu selalu **berbeda warna** (**ungu** = dadu 1, **merah muda** = dadu 2) agar pasangan berurutan (1,6) ≠ (6,1) terlihat jelas — langsung mendukung pemahaman n(S)=36 (IL01, GL01). Biru dan oranye **tidak** dipakai untuk dadu karena sudah menjadi warna tetap n(S) dan n(A) (D5).

**Animasi lempar dadu realistis:** dilempar dari tangan tak terlihat ke arah lapangan, berputar acak, memantul 2–4 kali, berguling, melambat, diam. Hasil dibaca dari sisi yang menghadap ke atas (bukan ditentukan sebelum animasi).

### 6.4 Kartu remi
- 52 kartu dengan desain bersih (♠ ♣ hitam, ♥ ♦ merah lembut), kartu bergambar bergaya ilustrasi sederhana (J, Q, K).
- Animasi: kocok (kartu bergeser ringan), kartu teratas meluncur & **dibalik**.
- Mode Kamus: kartu disusun rapi 4 baris × 13 kolom; ketuk satu jenis untuk menyorot 13 kartunya; ketuk "As" untuk menyorot 4 kartu (EL01).

### 6.5 Jenis peluang lainnya
| Objek | Animasi |
|---|---|
| **Roda putar (spinner)** | Diputar dengan swipe; melambat dengan gesekan; sektor warna pastel + label angka |
| **Kantong kelereng/bola** | Kantong kain; tangan mengambil 1 bola keluar; bola tampil di atas kantong. Opsi dikembalikan / tidak |
| **Kotak undian kupon** | Dua kotak transparan berisi kupon merah/biru; satu kupon terangkat keluar |
| **Tutup botol** (P1) | Dilempar, mendarat telentang/telungkup — contoh kejadian tidak sama kemungkinan |
| **Kelas & ketua kelas** (2D) | 32 ikon siswa, satu tersorot acak (soal kisi no. 2) |

### 6.6 Aturan gerak
- Animasi lempar 3D: 1,2–2,5 detik. Mode 10×/100×/1000×: **tanpa** animasi fisika (hasil langsung, grafik bergerak).
- Transisi UI ≤ 250 ms, *ease-out*.
- **Mode Fokus**: rumput diam, tanpa partikel, tanpa suara.
- Hormati `prefers-reduced-motion` / pengaturan "Kurangi gerakan" → koin/dadu tampil langsung dalam posisi hasil.
- Tidak ada konfeti berlebihan; umpan balik benar = tanda centang mint + kalimat singkat.

## 7. Umpan balik & nada bahasa

| Situasi | Contoh kalimat |
|---|---|
| Benar | "Pas! n(A) = 3 dan n(S) = 6, jadi peluangnya ½." |
| Salah pertama | "Hmm, belum pas. Coba cek lagi ya." |
| Salah kedua → petunjuk otomatis | "Yuk, kita mulai dari sini dulu: ada berapa semua kemungkinan hasilnya?" |
| P > 1 | "Peluang nggak mungkin lebih dari 1. Coba bandingkan n(A) dan n(S)-mu." |
| Konteks asing | "Belum kenal kartu remi? Ketuk ikon ? untuk lihat kartunya." |

## 8. Aksesibilitas
- Kontras teks ≥ 4.5:1 terhadap latar pastel.
- Informasi tidak hanya lewat warna (ikon, teks, pola).
- Semua tombol punya label untuk TalkBack.
- Ukuran teks mengikuti pengaturan sistem (hingga 130%).
- Getar (haptic) ringan saat dadu/koin diam — bisa dimatikan.
