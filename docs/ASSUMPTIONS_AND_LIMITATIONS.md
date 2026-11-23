# Asumsi dan Batas Model

- Dapur Sari, pemasok, persediaan, permintaan, dan biaya merupakan data fiktif untuk demonstrasi. Foto landing adalah ilustrasi yang dibuat dengan ImageGen.
- Satu simulasi mencakup satu batch produksi dan satu tingkat pemasok. Stok awal dianggap siap pakai. Pengiriman dan alternatif dihitung sesuai tanggal dan kapasitas yang diisi.
- Satuan bahan dan Rupiah berbentuk bilangan bulat. Model mengasumsikan resep, kontribusi, dan premium per pak tetap dalam satu batch. Produk dan pak dibeli atau diproduksi dalam unit utuh.
- Kapasitas pekerja, jam oven, umur simpan, substitusi resep, dan permintaan acak belum masuk model.
- Rekomendasi pembelian dan produksi adalah estimasi berbasis data dan asumsi yang dimasukkan. Nilai kontribusi tidak mencakup seluruh biaya akuntansi dan ketersediaan pemasok tidak diperiksa langsung.
- Graf menampilkan jalur ketergantungan. Penanda pemasok tunggal menjelaskan konsentrasi sumber pasok, sementara perhitungan produksi mengikuti stok, BOM, permintaan, dan penawaran yang berlaku.
- Sesi demo bersifat stateless di server. Akun, data usaha privat, riwayat, dan ekspor tetap menjadi ruang lingkup P1.
