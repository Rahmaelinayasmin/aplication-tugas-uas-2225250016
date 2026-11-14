# MaWiYas

Aplikasi Android untuk siswa SMP kelas VIII mempelajari **Konsep Dasar Peluang**, dengan simulasi 3D koin, dadu, kartu remi, roda putar, kantong bola, kotak undian kupon, dan tutup botol di atas lapangan rumput.

Dikembangkan dalam penelitian pengembangan **ADDIE** untuk meningkatkan **Mathematical Literacy** siswa dengan mengelola **beban kognitif** (Cognitive Load Theory) berdasarkan wawancara siswa yang telah mempelajari materi ini.

## Teknologi: JavaScript + Python

| Bagian | Bahasa | Framework & pustaka | Folder |
|---|---|---|---|
| **Aplikasi Android** (siswa & guru) | **JavaScript** (ES2022 + JSX) | **React 18** (UI), **three.js** (3D), **cannon-es** (fisika), **Dexie** (database IndexedDB), **Vite** (build), **Capacitor 7** (kemasan Android), Vitest (tes) | `src/`, `android/` |
| **Server penelitian** (opsional) | **Python 3** | **FastAPI** (REST API), **SQLModel/SQLAlchemy** (database), **pandas** (analisis), **Jinja2** (dasbor), Uvicorn, pytest (tes) | `server/` |

```
HP siswa (MaWiYas, JavaScript)  ──POST /v1/sync──▶  MaWiYas Server (Python/FastAPI)
  offline, data di HP                                  SQLite → pandas → dasbor guru
  ekspor JSON/CSV manual  ───────────────────────────▶ python -m app.cli (analisis file)
```

## Instal di HP Android
File ada di folder `release/`:

| File | Kegunaan |
|---|---|
| `MaWiYas-1.2.0.apk` | **Pakai yang ini**: versi rilis yang ditandatangani |
| `MaWiYas-1.2.0-debug.apk` | Versi debug untuk pengembangan |

1. Kirim APK ke HP lewat kabel, WhatsApp, atau Google Drive.
2. Buka file APK di HP. Bila diminta, izinkan **"Instal dari sumber tidak dikenal"**.
3. Ketuk **Instal**, lalu buka **MaWiYas**.

Butuh Android 6.0 atau lebih baru. Berjalan **offline**, tanpa iklan.

## Isi aplikasi
| Menu | Isi |
|---|---|
| **Masuk** | Kode siswa (S01, S02, …) dan kode kelas. Tanpa nama asli. Satu HP bisa dipakai bergantian. |
| **Diagnostik pecahan** | 6 soal singkat. Bila skor < 70%, siswa diarahkan ke **Pecahan Kilat**. |
| **Belajar Bertahap** | 6 unit, satu langkah per layar, dengan widget interaktif (kartu remi, diagram pohon, tabel 2 dadu, pemilah soal cerita). |
| **Lab Lapangan 3D** | Koin (4 jenis), dadu (4 gaya), kartu remi, roda putar, kantong bola, **kotak kupon A/B**, **tutup botol**. Lempar 1× dengan animasi, atau 10×/100×/1000× cepat. Rumus, grafik empirik vs teoretis, dan ruang sampel di layar yang sama. |
| **Latihan Literasi** | 13 soal untuk 4 indikator ML. Petunjuk bertahap otomatis setelah 2× salah dan makin jarang saat siswa makin mahir. Setelah soal Bernalar/Menafsirkan, siswa diajak **menjelaskan ke teman** (disimpan & diekspor). |
| **Mode Tes** | Pretest/posttest 5 soal Tabel 2 (maks. 30), dibuka dengan **PIN guru**. |
| **Pengaturan** | Mode Fokus, Kurangi Gerakan, kualitas grafis, **suara**, **getar**, **ukuran teks 100/115/130%**, ganti kode siswa. |
| **Kuesioner** | 10 butir beban kognitif (adaptasi, skala 0–10). |
| **Guru / Peneliti** | Ringkasan skor, N-gain, cek jawaban alasan, ekspor CSV/JSON, **sinkron ke server Python**, ganti PIN, hapus data. |

**PIN guru bawaan: `1234`.** Ganti di menu Guru / Peneliti sebelum uji coba.

Isi kantong (4 merah, 4 kuning, 2 hijau) dan kotak kupon (A: 2 merah 3 biru, B: 3 merah 6 biru) di Lab **sengaja dibuat berbeda** dari soal tes Tabel 2, agar Lab tidak membocorkan jawaban posttest.

## Data penelitian
Dua cara mengumpulkan data:

1. **Ekspor manual** (tanpa internet): Guru / Peneliti → Ekspor data → bagikan lewat WhatsApp/Drive.
2. **Sinkron ke server Python** (Wi-Fi sama): jalankan `server/` di laptop, lalu di HP buka Guru / Peneliti → Sinkron ke server. Panduan lengkap di [server/README.md](server/README.md).

Analisis otomatis (Python/pandas): N-gain + kategori Hake, skor per indikator, beban kognitif IL/EL/GL, dan fading petunjuk. Hasilnya tampil di dasbor `http://<laptop>:8000/dashboard?key=…` atau lewat `python -m app.cli file-ekspor.json`.

## Pengembangan

**Aplikasi (JavaScript)**, butuh Node.js 20+, JDK 21, Android SDK 35:
```bash
npm install
npm run dev              # buka di browser
npm test                 # 20 tes unit
npm run lint             # cek sintaks JavaScript
npm run build            # build web
npx cap sync android
cd android && gradlew.bat assembleDebug assembleRelease
```

**Server (Python)**, butuh Python 3.12+:
```bash
cd server
py -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m pytest -q                       # 14 tes
.venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Kunci tanda tangan rilis:** `android/mawiyas-release.jks` dan kata sandinya di `android/keystore.properties`. **Simpan cadangan keduanya di tempat aman.** Tanpa kunci ini, pembaruan aplikasi tidak bisa dipasang di atas versi lama. Jangan bagikan atau unggah ke repositori publik (sudah dikecualikan di `.gitignore`).

## Struktur
```
src/                 aplikasi (JavaScript + React)
  domain/            logika peluang, penskoran, petunjuk, konten soal
  engine3d/          LabEngine three.js + cannon-es
  data/              IndexedDB, ekspor, sinkron ke server
  ui/  app/          layar, komponen, navigasi
server/              server penelitian (Python + FastAPI)
  app/               main.py (API & dasbor), analysis.py (pandas), cli.py, models.py
  tests/             pytest
android/             proyek Capacitor
release/             APK siap pasang
tests/               tes aplikasi (Vitest)
prototype/           prototipe Lab 3D satu berkas
```

## Dokumentasi
[prd.md](prd.md) · [design.md](design.md) · [architecture.md](architecture.md) · [api.md](api.md) · [task.md](task.md) · [agents.md](agents.md) · [server/README.md](server/README.md)

## Etika penelitian
- Hanya kode siswa; tidak ada nama, foto, lokasi, atau ID perangkat. Server menolak data dengan kode yang tidak berpola `S01`.
- Data tersimpan di HP. Sinkron ke server bersifat opsional dan dilakukan guru/peneliti.
- Persetujuan sekolah, orang tua/wali, dan siswa diurus di luar aplikasi.
- Kuesioner beban kognitif adalah adaptasi yang **belum divalidasi** pada siswa SMP.

## Rujukan teori
- Leppink, J., Paas, F., Van der Vleuten, C. P. M., Van Gog, T., & Van Merriënboer, J. J. G. (2013). Development of an instrument for measuring different types of cognitive load. *Behavior Research Methods, 45*, 1058–1072. https://doi.org/10.3758/s13428-013-0334-1
- Klepsch, M., Schmitz, F., & Seufert, T. (2017). Development and validation of two instruments measuring intrinsic, extraneous, and germane cognitive load. *Frontiers in Psychology, 8*, 1997.
- Hake, R. R. (1998). Interactive-engagement versus traditional methods: A six-thousand-student survey of mechanics test data for introductory physics courses. *American Journal of Physics, 66*(1), 64–74.
- Paas, F. (1992). Training strategies for attaining transfer of problem-solving skills in statistics: A cognitive-load approach. *Journal of Educational Psychology, 84*(4), 429–434.
