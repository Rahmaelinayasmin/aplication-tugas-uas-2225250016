# AGENTS.md — Panduan untuk Agen AI (Vibe Coding)

Berkas ini dibaca oleh agen AI (Claude Code, Cursor, Copilot, dll.) sebelum mengubah kode. Ikuti aturan ini di atas preferensi umum agen.

## 1. Konteks proyek
- **MaWiYas**: aplikasi Android (Capacitor + React + TypeScript + three.js) untuk siswa SMP kelas VIII belajar **Konsep Dasar Peluang**.
- Tujuan penelitian: meningkatkan **Mathematical Literacy** dengan mengelola **beban kognitif** (Cognitive Load Theory).
- Ini produk **penelitian pengembangan ADDIE**. Setiap fitur harus bisa ditelusuri ke temuan wawancara (lihat `prd.md §4`). Jangan menambah fitur yang tidak ada di PRD tanpa persetujuan peneliti.
- Baca dulu: `prd.md` → `design.md` → `architecture.md` → `api.md` → `task.md`.

## 2. Perintah
```bash
npm install            # pasang dependensi
npm run dev            # server pengembangan (browser)
npm run test           # vitest
npm run lint           # eslint + tsc --noEmit
npm run build          # build web ke dist/
npx cap sync android   # salin build ke proyek Android
npx cap open android   # buka di Android Studio
```
Sebelum menyatakan tugas selesai: `npm run lint` dan `npm run test` harus lulus.

## 3. Aturan wajib (jangan dilanggar)

### Pedagogi & beban kognitif
1. **Tata letak terintegrasi (D1):** rumus, diagram, dan objek terkait selalu dalam satu layar. Jangan memindahkan penjelasan ke halaman/tab terpisah.
2. **Animasi hanya bermakna (D3):** jangan menambah stiker bergerak, konfeti besar, maskot menari, atau latar mencolok. Animasi 3D hanya di Lab & Kamus Konteks. Semua animasi harus patuh Mode Fokus dan reduced-motion.
3. **Tanpa iklan, tanpa pop-up promosi, tanpa leaderboard publik.**
4. **Petunjuk bertahap (F05):** jangan pernah menampilkan jawaban akhir soal yang sedang dikerjakan. Level 3 = contoh sejenis, bukan jawaban.
5. **Warna konsisten:** n(S) = `--ns-blue`, n(A) = `--na-orange` di semua layar.
6. **Bahasa:** UI dalam Bahasa Indonesia sehari-hari yang sopan, sapaan "kamu", kalimat instruksi ≤ 20 kata. Istilah: "Angka/Gambar" untuk sisi koin, "ruang sampel", "titik sampel", "kejadian", "peluang empirik/teoretis".
7. **Butir tes terpisah:** item dengan `isTestItem: true` tidak boleh muncul di latihan, lab, atau petunjuk.

### Matematika
8. Peluang selalu berupa `Fraction` (bilangan bulat). **Jangan** memakai float untuk menghitung atau membandingkan peluang; float hanya untuk tampilan desimal & grafik.
9. Desimal ditampilkan dengan **koma** (0,375).
10. Keacakan memakai `domain/probability/rng.ts` (crypto). **Jangan** memakai `Math.random()`.
11. Hasil lempar 3D ditentukan oleh fisika + `faceReader`, **bukan** diatur sebelum animasi (kecuali mode reduced-motion yang memakai `rng.ts`).
12. Setiap perubahan pada `domain/` wajib disertai tes unit.

### Arsitektur
13. `src/domain/**` tidak boleh mengimpor React, three.js, Capacitor, atau Dexie.
14. three.js dipakai langsung (tanpa react-three-fiber) di `src/engine3d/`. Satu renderer bersama; render on-demand; berhenti saat app di background.
15. Hormati tingkat kualitas (`hemat/sedang/tinggi`). Fitur grafis baru harus punya versi `hemat`.
16. Versi dependensi dipin persis di `package.json` (tanpa `^`/`~`).
17. Konten soal/petunjuk/kamus ada di JSON (`src/domain/content/`), bukan di-hardcode di komponen.

### Privasi & etika penelitian
18. **Tidak boleh** ada nama asli, foto, email, lokasi, atau ID perangkat siswa di kode, data contoh, log, tes, commit, maupun prompt AI. Gunakan kode `S01`, `S02`, …
19. Tidak ada SDK analitik/iklan pihak ketiga. Tidak ada permintaan jaringan pada fungsi inti.
20. Jangan menyalin transkrip wawancara utuh ke repositori; rujuk dengan kode kutipan (IL01, EL02, …).

## 4. Gaya kode
- TypeScript `strict`, tanpa `any` (gunakan `unknown` + validasi zod).
- Komponen React: fungsi + hooks; nama berkas `PascalCase.tsx`; modul domain `camelCase.ts`.
- Nama domain boleh Bahasa Indonesia bila itu istilah pelajaran (mis. `ruangSampel` di konten), tetapi API kode memakai bahasa Inggris konsisten seperti di `api.md`.
- Komentar singkat menjelaskan *mengapa*, terutama keputusan CLT (mis. `// D1: label menempel di objek untuk mencegah split-attention`).

## 5. Definisi selesai (Definition of Done)
- [ ] Fitur sesuai PRD & mengacu kode temuan
- [ ] Lint & tes lulus; tes baru untuk logika baru
- [ ] Berjalan di tier `hemat` tanpa drop < 30 fps (untuk fitur 3D)
- [ ] Patuh Mode Fokus & reduced-motion
- [ ] Teks UI ditinjau: bahasa ngobrol, ≤ 20 kata per instruksi
- [ ] `task.md` diperbarui

## 6. Saat ragu
Tanyakan ke peneliti, terutama untuk: konten soal, kunci jawaban, skor per tahap, penambahan animasi, dan apa pun yang menyangkut data siswa.
