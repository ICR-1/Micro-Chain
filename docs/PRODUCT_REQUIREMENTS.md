# Kebutuhan Produk

RantaiTangguh membantu pengelola UMKM makanan mengetahui produk mana yang dapat dibuat ketika pengiriman bahan baku terlambat atau gagal. Pengguna melihat hubungan pemasok, bahan, dan produk, lalu membandingkan beberapa pilihan produksi dengan persediaan dan biaya yang sama.

## Alur demo P0

1. Masuk dari landing ke demo Dapur Sari tanpa akun.
2. Buka ringkasan stok dan bahan yang bergantung pada satu pemasok. Telusuri graf atau daftar hubungan, pilih node, dan lihat detailnya.
3. Jalankan skenario normal, pemasok utama gagal, dan pemasok alternatif aktif. Hasil memuat rencana produksi, batas bahan, paket alternatif, biaya tambahan, dan status solver.
4. Bandingkan estimasi kontribusi ketiga skenario. Perhitungan acuan memulihkan Rp132.000 atau 55% setelah biaya tambahan.
5. Ubah stok, permintaan, atau kapasitas alternatif, lalu jalankan ulang. Hasil sebelumnya tidak berlaku setelah perubahan input. Reset mengembalikan fixture awal.

Demo dinyatakan layak ketika alur di atas bisa dijalankan di desktop dan mobile, API menghasilkan nilai deterministik untuk fixture, dan juri bisa mengakses HTTPS tanpa login.

## Cakupan berikutnya

P1 mencakup akun dengan isolasi data, penyimpanan dan riwayat skenario, ekspor, pengelolaan data lengkap, dan perbandingan pemasok alternatif. Prakiraan, pemasok terverifikasi, integrasi POS/ERP, dan kolaborasi tim masuk P2. Scope kompetisi berfokus pada satu rencana produksi dan satu tingkat pemasok.

Subtema pengajuan yang dipilih adalah SDG 8. Perencanaan bahan yang lebih terukur juga berkaitan dengan SDG 12. Jadwal dan materi resmi tersedia dari [SEVENT X](https://sevent.zetech.id/).
