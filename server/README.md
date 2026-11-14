# MaWiYas Server (Python)

Server penelitian untuk aplikasi Android **MaWiYas**. Dibangun dengan **Python 3** dan framework **FastAPI**:

| Pustaka | Kegunaan |
|---|---|
| **FastAPI** + Uvicorn | REST API sinkronisasi dan analisis (`api.md §5`) |
| **SQLModel** (SQLAlchemy + Pydantic) | Database SQLite: siswa, skor tes, petunjuk, simulasi, kuesioner |
| **pandas** | Analisis: N-gain (Hake), skor per indikator ML, beban kognitif IL/EL/GL, fading petunjuk |
| **Jinja2** | Dasbor guru/peneliti (HTML) |
| **pytest** | 14 tes otomatis |

Server ini **opsional**. Aplikasi tetap berjalan penuh tanpa internet. Server dipakai bila peneliti ingin data dari banyak HP terkumpul otomatis, atau ingin analisis instan dari file ekspor.

## Menjalankan

```bash
cd server
py -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt

# WAJIB ganti kunci sebelum dipakai di sekolah
set MAWIYAS_ENROLL_KEY=kunci-pendaftaran-rahasia
set MAWIYAS_TEACHER_KEY=kunci-guru-rahasia

.venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

- Dasbor guru: `http://localhost:8000/dashboard?key=KUNCI_GURU`
- Dokumentasi API interaktif: `http://localhost:8000/docs`
- Kunci bawaan (hanya untuk mencoba): pendaftaran `MAWIYAS-2026`, guru `guru-mawiyas`.

## Menghubungkan HP
1. Laptop server dan HP siswa tersambung ke **Wi-Fi yang sama**. Cari IP laptop dengan `ipconfig` (mis. `192.168.1.10`).
2. Di aplikasi: **Guru / Peneliti → Sinkron ke server**. Isi alamat `http://192.168.1.10:8000`, kunci pendaftaran, dan kode kelas, lalu ketuk **Daftarkan HP ini**.
3. Ketuk **Kirim data sekarang** setelah sesi. Mengirim ulang aman: data yang sudah ada tidak digandakan.

Bila Windows Firewall bertanya, izinkan Python di jaringan privat.

## Analisis file ekspor tanpa server
Untuk HP yang tidak disinkron, ekspor **Guru / Peneliti → Semua (JSON)** lalu:

```bash
.venv\Scripts\python -m app.cli mawiyas-semua-hp1.json mawiyas-semua-hp2.json --out hasil-analisis
```

Hasil di folder `hasil-analisis/`: `laporan.md`, `skor-ngain.csv`, `skor-indikator.csv`, `beban-kognitif-rata.csv`, `beban-kognitif-siswa.csv`, `fading-petunjuk.csv`. File JSON juga bisa diunggah di dasbor.

## Endpoint
| Metode | Endpoint | Akses |
|---|---|---|
| GET | `/v1/health` | bebas |
| POST | `/v1/devices/register` `{classCode, enrollKey}` → `{deviceToken}` | kunci pendaftaran |
| POST | `/v1/sync` `{deviceId, students, attempts, hintEvents, simulations, surveys}` | `Authorization: Bearer <deviceToken>` |
| GET | `/v1/classes/{kelas}/summary` | header `X-Teacher-Key` |
| GET | `/v1/analysis?kelas=8A` | `X-Teacher-Key` |
| POST | `/v1/analysis/upload` (file JSON) | `X-Teacher-Key` |
| GET | `/v1/export/{skor\|indikator\|beban-kognitif\|petunjuk}.csv` | `X-Teacher-Key` atau `?key=` |
| GET | `/dashboard?key=…&kelas=…` | kunci guru |

## Cara analisis menghitung
- **Skor tes**: jumlah skor 5 soal Tabel 2 (maks. 30). Bila satu soal dikerjakan ulang, yang **terbaru** dipakai.
- **N-gain** = (post − pre) / (30 − pre). Kategori Hake: tinggi ≥ 0,7 · sedang 0,3–0,7 · rendah < 0,3.
- **Per indikator** = jumlah skor ÷ jumlah skor maksimum indikator itu × 100%.
- **Beban kognitif** = rata-rata butir IL1–3, EL1–3, GL1–4 (skala 0–10), per konteks (pretest/posttest/latihan).
- **Fading petunjuk** = rata-rata petunjuk per langkah pada paruh awal vs paruh akhir soal latihan setiap siswa.

Tidak ada nama siswa yang diterima: kode harus berpola `S01`, `S12`, … (selain itu ditolak dengan kode 422).

## Tes
```bash
.venv\Scripts\python -m pytest -q
```
