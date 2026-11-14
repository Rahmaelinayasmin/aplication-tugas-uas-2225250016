# Architecture — MaWiYas

Arsitektur teknis aplikasi Android offline dengan ilustrasi 3D three.js.

---

> **Catatan implementasi v1.0 (14 Nov 2026)** — perbedaan dari rancangan awal di bawah:
> - **Capacitor 7** (bukan 6): cocok dengan Android SDK 35 dan JDK 21 yang terpasang. minSdk 23, targetSdk 35.
> - State memakai **React Context** (`src/app/store.tsx`), tanpa Zustand — cukup untuk aplikasi ini.
> - Konten soal berupa **modul TypeScript bertipe** (`src/domain/content/*.ts`), bukan JSON + zod; konsistensi kunci jawaban dijaga oleh tes unit.
> - Mesin 3D satu kelas `src/engine3d/LabEngine.ts` (stage, rumput, benda, fisika); renderer dibuat saat masuk Lab dan dibuang saat keluar.
> - v1.1: tutup botol 3D (fisika, peluang empirik saja) dan kotak undian kupon A/B sudah ada.
>
> **Dua bahasa, dua lapisan:**
> | Lapisan | Bahasa | Framework |
> |---|---|---|
> | Aplikasi Android (siswa & guru) | **JavaScript** (ditulis dalam TypeScript = JavaScript + tipe; di APK berjalan sebagai JavaScript murni) | React 18, three.js, cannon-es, Dexie, Vite, Capacitor 7 |
> | Server penelitian (opsional) | **Python 3** | FastAPI, SQLModel/SQLAlchemy, pandas, Jinja2, pytest |
>
> Aplikasi → `POST /v1/sync` → server Python (SQLite) → analisis pandas → dasbor Jinja2. Tanpa server, file ekspor JSON dari aplikasi bisa dianalisis dengan `python -m app.cli`. Lihat `server/README.md`.

## 1. Keputusan teknologi

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Kemasan Android | **Capacitor 6** (WebView Android) | three.js berjalan native di WebView; satu basis kode web; mudah dibangun dengan alat *vibe coding*; APK bisa dibuat dari Android Studio |
| Bahasa | **TypeScript** (strict) | Mengurangi bug, cocok untuk agen AI |
| UI | **React 18** + **Vite 5** | Ekosistem luas, banyak contoh untuk agen AI |
| 3D | **three.js r169** (dipin, dipakai langsung, bukan lewat wrapper) | Kontrol penuh atas kinerja, shader rumput |
| Fisika | **cannon-es 0.20** | Ringan (±150 KB), cukup untuk dadu/koin/tutup botol |
| State | **Zustand** | Sederhana, tanpa boilerplate |
| Penyimpanan lokal | **IndexedDB via Dexie 4** | Offline, data terstruktur, mudah diekspor |
| Ekspor file | `@capacitor/filesystem` + `@capacitor/share` | Kirim CSV/JSON ke guru/peneliti |
| Grafik | SVG buatan sendiri (ringan) | Hanya grafik garis & batang sederhana |
| Tes | **Vitest** (unit), **Playwright** (alur UI di browser) | |

Alternatif yang ditolak: Kotlin native + Filament/SceneView (lebih berat dipelajari, sulit *vibe coding*), Unity (APK besar, overkill), Flutter + three.js di WebView (dua runtime).

## 2. Gambaran sistem

```
┌──────────────────────────── APK Android (Capacitor) ─────────────────────────────┐
│  WebView                                                                          │
│  ┌──────────────── UI (React) ───────────────┐   ┌──────── 3D Engine ─────────┐  │
│  │ screens/  components/  theme/             │◄─►│ three.js scene, renderer   │  │
│  │ Lab, Latihan, Ruang Sampel, Kamus, Tes    │   │ objects/ (koin, dadu,      │  │
│  └───────────────┬───────────────────────────┘   │  kartu, spinner, kantong)  │  │
│                  │                               │ field/ (rumput, langit)    │  │
│  ┌───────────────▼────────── Domain (TS murni, tanpa UI) ─────┐ physics (cannon-es)│
│  │ probability/  Fraction, SampleSpace, Event, Simulation RNG │ └────────────────┘ │
│  │ learning/     HintEngine, ScoringEngine, PathEngine        │                    │
│  │ content/      soal, langkah, kamus (JSON)                  │                    │
│  └───────────────┬────────────────────────────────────────────┘                    │
│  ┌───────────────▼──────── Data ─────────────┐                                     │
│  │ Dexie (IndexedDB): students, attempts,    │──► Ekspor CSV/JSON (Share)          │
│  │ hints, simulations, surveys               │──► [opsional] Sync REST (api.md §5) │
│  └───────────────────────────────────────────┘                                     │
└───────────────────────────────────────────────────────────────────────────────────┘
```

Aturan dependensi: `ui → domain`, `ui → engine3d`, `engine3d → domain/probability`. **Domain tidak boleh mengimpor React atau three.js** (agar bisa diuji unit dan dipakai ulang).

## 3. Struktur folder

```
Aplication/
├─ android/                    # dibuat oleh `npx cap add android`
├─ public/
│  ├─ fonts/                   # Plus Jakarta Sans (lokal)
│  └─ assets/3d/               # tekstur KTX2/PNG kecil, model .glb (kartu, kantong)
├─ src/
│  ├─ main.tsx
│  ├─ app/                     # router, providers, layout
│  ├─ ui/
│  │  ├─ theme/tokens.css
│  │  ├─ components/           # StepCard, FormulaChip, ProbabilityMeter, ...
│  │  └─ screens/              # Lab/, Practice/, SampleSpace/, Glossary/, Test/, Teacher/
│  ├─ engine3d/
│  │  ├─ Stage.ts              # renderer, kamera, loop render on-demand
│  │  ├─ quality.ts            # deteksi & tingkat kualitas
│  │  ├─ field/                # GrassField.ts (InstancedMesh + shader), Sky.ts, PitchLines.ts
│  │  ├─ objects/              # Coin.ts, Die.ts, CardDeck.ts, Spinner.ts, MarbleBag.ts, CouponBox.ts, BottleCap.ts
│  │  ├─ physics/              # World.ts, faceReader.ts
│  │  └─ ThreeStage.tsx        # komponen React pembungkus
│  ├─ domain/
│  │  ├─ probability/          # fraction.ts, sampleSpace.ts, events.ts, rng.ts, simulate.ts
│  │  ├─ learning/             # hintEngine.ts, scoring.ts, path.ts, diagnostics.ts
│  │  └─ content/              # items/*.json, lessons/*.json, glossary/*.json, schema.ts
│  ├─ data/
│  │  ├─ db.ts                 # Dexie schema
│  │  ├─ repositories/
│  │  └─ export.ts
│  └─ store/                   # Zustand stores
├─ tests/                      # vitest + playwright
├─ prd.md  design.md  architecture.md  api.md  task.md  agents.md  readme.md
└─ capacitor.config.ts
```

## 4. Mesin 3D

### 4.1 Stage & loop render
- Satu `WebGLRenderer` dipakai bersama semua layar 3D (dibuat sekali, dipindah antar-kanvas) untuk menghemat memori GPU.
- **Render on-demand**: loop `requestAnimationFrame` hanya aktif saat ada simulasi fisika, rumput bergoyang (bukan Mode Fokus), atau gestur kamera. Diam → berhenti merender (hemat baterai).
- Berhenti total saat aplikasi di latar belakang (`App.addListener('pause')`).
- `renderer.setPixelRatio(min(devicePixelRatio, tier.maxDpr))`.

### 4.2 Tingkat kualitas
| Tier | Deteksi | maxDpr | Rumput | Bayangan | Material dadu jeli |
|---|---|---|---|---|---|
| Hemat | RAM ≤ 3 GB atau benchmark < 30 fps | 1.0 | Tekstur saja | Blob shadow palsu | Transparan biasa |
| Sedang | default | 1.5 | ~8.000 helai | Shadow map 1024 | Transparan + fresnel |
| Tinggi | GPU kuat & ≥ 55 fps | 2.0 | ~30.000 helai | Shadow map 2048 PCF soft | `MeshPhysicalMaterial` transmission |

Benchmark 2 detik saat pertama dibuka; hasil disimpan; bisa diubah manual di Pengaturan.

### 4.3 Rumput lapangan
- `InstancedMesh` satu geometri bilah (5 segmen, 10 segitiga) × N instance dalam area di sekitar titik lempar; di luar area hanya tekstur lapangan bergaris.
- Vertex shader: offset angin = `sin(time·f + pos.x·k) · noise · (tinggi²)`; uniform `uWind`, `uTime`.
- Warna gradasi dari pangkal (gelap) ke ujung (terang), mengikuti garis lapangan.
- Interaksi (Tinggi): uniform array posisi benda (maks. 4) membengkokkan rumput di sekitarnya.

### 4.4 Fisika & penentuan hasil
1. Kecepatan awal, posisi, dan putaran diacak dengan `crypto.getRandomValues` (lihat `domain/probability/rng.ts`).
2. `cannon-es` mensimulasikan benda (dadu: `Box` dengan sudut membulat sebagai collider kotak; koin: `Cylinder` tipis) pada lantai dengan material pantulan rumput (restitution rendah, friction tinggi).
3. Benda dianggap diam saat kecepatan linear & sudut < ambang selama 0,3 detik (`sleep`).
4. `faceReader` membaca sisi atas: normal lokal tiap sisi diubah ke koordinat dunia; sisi dengan `dot(normal, up)` terbesar = hasil.
5. Bila benda "miring" (dot < 0.9, mis. bersandar), beri dorongan kecil lalu tunggu lagi.
6. Batas waktu 4 detik → fallback: hasil dibaca dari sisi terdekat ke atas.

Hasil **ditentukan oleh fisika**, bukan diatur sebelumnya, sehingga sesuai dengan peluang nyata. Mode 10×/100×/1000× memakai `simulate.ts` (RNG langsung, tanpa fisika) dengan distribusi teoretis benda yang sama.

### 4.5 Aset
- Dadu: geometri prosedural (`RoundedBoxGeometry`) + tekstur mata dari kanvas (tanpa file besar).
- Koin: `CylinderGeometry` + tekstur sisi digambar di kanvas → variasi koin tanpa file model.
- Kartu: satu atlas tekstur 52 kartu (≤ 1024×1024, KTX2/PNG).
- Kantong, spinner, kotak kupon: geometri prosedural atau `.glb` kecil (< 200 KB masing-masing).
- Anggaran total aset 3D: ≤ 6 MB.

## 5. Domain

### 5.1 Probability core
- `Fraction` (pembilang/penyebut bilangan bulat, selalu disederhanakan dengan FPB untuk tampilan, tetapi menyimpan bentuk asli agar bisa menampilkan "4/12 → 1/3").
- `SampleSpace<T>`: daftar hasil berurutan (mis. pasangan dadu `[d1, d2]`).
- `Event<T>`: predikat + deskripsi bahasa Indonesia ("jumlah mata = 7").
- `probability(event, space): Fraction`.
- `empiricalProbability(count, trials): Fraction`.

### 5.2 Learning engines
- **HintEngine** — state per (soal, langkah): `attemptsWrong`, `hintLevelShown`. Aturan: salah ke-2 → tampilkan level `startLevel(mastery)`; tombol manual naik satu level; *fading*: `startLevel` naik dan ambang otomatis bergeser ke 3× salah bila mastery tinggi.
- **ScoringEngine** — rubrik per tahap dari kisi-kisi; tiap tahap punya pemeriksa (`exact`, `fractionEquivalent`, `setEquals`, `choice`, `manualRubric`). Skor parsial: tahap dinilai independen dengan *carry-forward* (nilai salah di tahap k tidak membatalkan tahap < k; tahap > k dinilai terhadap nilai siswa sendiri bila prosedurnya benar — "error carried forward").
- **PathEngine** — diagnostik pecahan → remedial atau lanjut; membuka unit berikutnya setelah unit sebelumnya selesai.

### 5.3 Konten
Soal, langkah, petunjuk, dan kamus disimpan sebagai JSON yang divalidasi skema (`zod`). Ini memudahkan peneliti mengganti soal tanpa menyentuh kode. Lihat format di `api.md §3`.

## 6. Data

Skema Dexie (versi 1):

| Tabel | Kunci | Isi |
|---|---|---|
| `students` | `code` (S01) | `classCode`, `createdAt`, `diagnosticScore`, `qualityTier` |
| `sessions` | `++id` | `studentCode`, `mode` (belajar/tes), `start`, `end` |
| `attempts` | `++id` | `studentCode`, `itemId`, `indicator`, `stepScores[]`, `total`, `durationMs`, `hintsUsed` |
| `hintEvents` | `++id` | `studentCode`, `itemId`, `step`, `level`, `trigger` (auto/manual), `ts` |
| `simulations` | `++id` | `studentCode`, `object`, `trials`, `counts`, `ts` |
| `surveys` | `++id` | `studentCode`, `instrument`, `answers`, `ts` |

Tidak ada kolom nama, foto, atau lokasi.

## 7. Keamanan & privasi
- Semua data di perangkat; tidak ada analitik pihak ketiga, tidak ada SDK iklan.
- Izin Android minimal: tidak butuh internet untuk fungsi inti (izin INTERNET hanya jika sync opsional diaktifkan).
- Mode Guru dilindungi PIN lokal.
- Ekspor dilakukan manual oleh guru/peneliti.

## 8. Build & rilis
- `npm run build` → `dist/` → `npx cap sync android` → Android Studio → *Build APK / AAB*.
- `minSdkVersion` & `targetSdkVersion` ditentukan setelah wawancara spesifikasi HP (usulan: min 26, target sesuai syarat Google Play terbaru).
- Versi semantik; setiap APK uji coba diberi tag versi yang dicatat di log penelitian.

## 9. Pengujian
| Level | Cakupan |
|---|---|
| Unit (Vitest) | Fraction, sampleSpace, events, scoring per soal kisi-kisi, hintEngine |
| Statistik | `simulate.ts`: uji chi-kuadrat 60.000 lemparan dadu (frekuensi tiap sisi dalam batas) |
| Komponen | Komponen UI dengan data contoh |
| E2E (Playwright) | Alur diagnostik → lab → latihan → ekspor |
| Perangkat | Uji manual di ≥ 2 HP Android (kelas bawah & menengah): fps, suhu, baterai 30 menit |
| Pengguna | Uji keterbacaan & SUS dengan siswa non-informan |
