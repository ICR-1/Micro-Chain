# Rencana Implementasi Pasok-Siaga

Bangun monorepo `apps/web` dan `apps/api` dengan satu fixture Dapur Sari. Browser menyimpan input selama sesi. API stateless memvalidasi snapshot, menganalisis jaringan, dan menjalankan solver CP-SAT.

- [x] Fondasi. Tetapkan model Pydantic, fixture, OpenAPI, kesehatan solver, serta halaman dan navigasi Next.js.
- [x] Mesin. Terapkan validitas pasokan, graf terarah, CP-SAT, verifikasi hasil, dan perbandingan. Kunci angka acuan dengan pytest.
- [x] Demo. Hubungkan enam halaman ke API, termasuk perubahan parameter, hasil dengan status solver, dan daftar jaringan untuk mobile.
- [x] Kualitas. Jalankan pytest, lint, typecheck, build, dan alur Playwright desktop/mobile. Verifikasi frontend dan API di HTTPS.
- [x] Dokumentasi submission. Lengkapi README, dokumentasi teknis, tangkapan layar, skrip video, template wawancara, dan checklist.
- [ ] Pengumpulan oleh tim. Isi proposal dan surat sesuai template resmi, rekam video, lalu kirim berkas dan tautan melalui portal lomba.

## Kontrak Integrasi

`GET /api/v1/demo` mengembalikan `{snapshot, scenarios, demo_data}`. `POST /api/v1/network/analyze` dan `/api/v1/simulations/preview` menerima `{snapshot, scenario}`. `POST /api/v1/simulations/compare` menerima `{snapshot, scenarios}`. Lihat skema OpenAPI dan kontrak frontend untuk field terperinci. Perubahan stok, permintaan, dan kapasitas berlaku atas snapshot browser sehingga ketiga skenario dibandingkan dengan data yang sama.
