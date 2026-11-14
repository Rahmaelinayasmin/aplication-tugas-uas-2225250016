# Task — MaWiYas

Daftar pekerjaan mengikuti tahapan **ADDIE**. Kode fitur (F01…) merujuk ke `prd.md`, kode desain (D1…) ke `design.md`.

Status: `[x]` selesai · `[ ]` belum · `[~]` sebagian · ⏳ menunggu keputusan peneliti

---

## A. Analysis
- [x] Wawancara retrospektif informan S01 (6 Nov 2026)
- [x] Kisi-kisi & soal Mathematical Literacy (Tabel 1 & 2)
- [x] Peta temuan → fitur (prd.md §4)
- [x] Tabel 2 dirapikan peneliti: 5 soal × 6 tahap × skor 1 = **30** (sudah dipakai di aplikasi)
- [x] Wawancara pengembang ↔ peneliti tahap 1: HP campuran (auto-tier), kelas + rumah, ekspor manual (prd.md §10)
- [x] Prototipe Lab 3D (`prototype/lab-3d.html`)
- [ ] Wawancara informan **S02** (variasi kemampuan) dan dokumentasikan perbedaan dengan S01
- [ ] Perbaiki DOI Leppink dkk. (2013) di dokumen instrumen → `10.3758/s13428-013-0334-1`
- ⏳ Wawancara tahap 2: distribusi APK, jadwal sesi, alur data latihan di rumah

## B. Design
- [x] PRD, design system, arsitektur, kontrak API
- [x] Bank soal latihan 13 butir (3–4 per indikator), terpisah dari butir tes — `src/domain/content/practiceItems.ts`
- [x] Teks langkah & 3 level petunjuk per tahap
- [x] Diagnostik pecahan 6 butir + modul remedial "Pecahan Kilat"
- [x] Adaptasi kuesioner beban kognitif 10 butir (skala 0–10) — **belum divalidasi**
- [ ] Validasi isi instrumen & konten aplikasi oleh 2–3 ahli (Aiken's V)
- [ ] Uji keterbacaan teks aplikasi pada 1–2 siswa non-informan

## C. Development
- [x] Vite + React + TypeScript strict + Vitest
- [x] Capacitor 7 Android, ikon & splash MaWiYas, APK debug
- [x] Token tema, font lokal (offline), komponen dasar
- [x] Navigasi + tombol Back Android
- [x] Domain peluang: `fraction`, `rng` (kripto, tanpa bias), `spaces` (koin, dadu, kartu, roda, kantong) + uji chi-kuadrat
- [x] Mesin 3D `LabEngine`: lapangan bergaris, rumput instanced + angin + tertekan, render on-demand, 3 tier + turun otomatis
- [x] Koin 4 gaya, dadu 4 gaya, kartu remi 52, roda (sama/tidak sama), kantong bola — hasil dadu & koin dibaca dari fisika
- [x] Mode Fokus & Kurangi Gerakan
- [x] Layar Lab terintegrasi (D1): rumus, statistik, grafik empirik vs teoretis, meteran 0–1, ruang sampel, 1×/10×/100×/1000×
- [x] 6 unit Belajar Bertahap + widget (kartu remi 4×13, diagram pohon, tabel 2 dadu bertahap, pola 3 langkah, meteran, percobaan koin, pemilah soal cerita)
- [x] Pemutar soal: stabilo kata, satu tahap per langkah, petunjuk otomatis 2× salah + fading, cek kewajaran > 1
- [x] Penskoran per tahap + error-carried-forward + rubrik kata kunci untuk alasan
- [x] Mode Tes (PIN guru) pretest/posttest dengan butir Tabel 2
- [x] Kuesioner beban kognitif pasca-tes / dari Progres
- [x] Penyimpanan Dexie (kode siswa, tanpa nama), Progres, Mode Guru (ringkasan, N-gain, cek alasan, ganti PIN, hapus data)
- [x] Ekspor CSV (ringkasan, per tahap, petunjuk, simulasi, kuesioner) + JSON lewat Share sheet
- [x] 20 tes unit JS + 14 tes Python; uji UI headless semua layar utama
- [x] Tutup botol 3D (fisika, peluang empirik saja, 10×/100× disimulasikan fisika) & kotak undian kupon A/B
- [x] Ganti nama aplikasi menjadi **MaWiYas** (paket com.mawiyas.app, v1.1.0)
- [x] Isi kantong & kotak kupon Lab dibuat berbeda dari soal tes (mencegah kebocoran posttest)
- [x] Server penelitian **Python/FastAPI** (`server/`): sinkron, SQLModel, analisis pandas (N-gain Hake, indikator, IL/EL/GL, fading), dasbor Jinja2, CLI analisis file ekspor, 14 tes pytest
- [x] Aplikasi: Sinkron ke server di menu Guru / Peneliti; uji menyeluruh aplikasi ↔ server
- [x] APK rilis bertanda tangan (keystore lokal)
- [ ] Uji di ≥ 2 HP Android nyata (kelas bawah & menengah): fps, suhu, baterai 30 menit
- [ ] Aksesibilitas: uji TalkBack & ukuran teks 130%

## D. Implementation
- ⏳ Tentukan sekolah, kelas, jumlah siswa, jadwal sesi
- [ ] Surat izin sekolah, persetujuan orang tua/wali & siswa
- [ ] Ganti PIN guru bawaan (1234) di setiap HP sebelum uji coba
- [ ] Distribusi APK (instal langsung / Play internal testing)
- [ ] Pretest → sesi belajar dengan aplikasi → posttest; catat versi APK

## E. Evaluation
- [ ] Analisis N-gain total & per indikator ML
- [ ] Analisis kuesioner beban kognitif (IL/EL/GL)
- [ ] SUS + wawancara singkat pasca-uji
- [ ] Analisis log petunjuk (fading berhasil?)
- [ ] Revisi produk & dokumentasi jejak keputusan ADDIE
