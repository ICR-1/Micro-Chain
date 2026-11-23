# Pengujian P0

| Area | Perintah dari direktori aplikasi | Cakupan |
|---|---|---|
| Solver, jaringan, dan API | `uv run --locked pytest` | Tiga solusi exact, delta, stok, cutoff, outage, validasi, solusi non-optimal, seluruh endpoint |
| Frontend | `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` | Lint, tipe, unit, dan kompilasi produksi |
| Browser | `npm run test:e2e` | Demo tanpa login, graf/daftar, skenario, perbandingan, perubahan input, reset, dan pemulihan error |

## Hasil verifikasi pada 23 November 2026

- Pytest lulus 42 kasus. Semua skenario fixture berstatus `OPTIMAL` dengan kontribusi Rp450.000, Rp210.000, dan Rp342.000. Nilai pemulihan Rp132.000 dan 55%.
- Vitest lulus 6 kasus. ESLint, TypeScript, dan build Next.js lulus.
- Playwright lulus 6 kasus pada build lokal dan website HTTPS, mencakup Chromium dan Firefox desktop 1280 px serta Chromium mobile 360 px. Uji juga memeriksa akses keyboard graf, loading, retry, dan error JavaScript yang tidak tertangani.
- Audit axe-core pada enam halaman produksi di Chromium desktop tidak menemukan pelanggaran pada aturan otomatis bertag WCAG 2.0/2.1 A dan AA yang dijalankan.
- Semua endpoint, kesiapan solver, dan origin CORS diverifikasi melalui API produksi. Image Docker masih memerlukan verifikasi di lingkungan dengan Docker tersedia.

## Pemeriksaan manual

1. Dari landing, buka demo Dapur Sari, lalu pilih **Jaringan Pasok**. Inspeksi detail tepung dan hubungan pemasok utama. Di lebar 360 px, buka tampilan daftar.
2. Jalankan skenario Normal, Gangguan, dan Mitigasi. Cocokkan angka dengan tabel di README dan lihat status solver.
3. Buka **Perbandingan**. Periksa kontribusi terancam Rp240.000, dipulihkan Rp132.000, dan pemulihan 55%.
4. Ubah stok tepung menjadi 9.000 g. Jalankan mitigasi lagi dan cek produksi 72 roti. Reset demo dan pastikan stok tepung kembali ke 8.000 g.
5. Periksa tab, label form, fokus keyboard, pesan loading dan error, serta tidak adanya overflow halaman pada viewport 360 px dan 1280 px.
