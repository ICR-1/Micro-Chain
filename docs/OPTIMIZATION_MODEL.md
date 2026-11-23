# Model Optimasi

Untuk produk `p`, `x[p]` adalah jumlah produksi integer dari nol sampai permintaan. Untuk penawaran alternatif `o`, `y[o]` adalah jumlah pak integer dari nol sampai kapasitas penawaran yang berlaku. Penawaran yang tidak diizinkan atau tidak dapat tiba tepat waktu memiliki batas nol.

Untuk setiap bahan, total BOM dikalikan produksi dibatasi oleh stok awal, pengiriman terjadwal yang berlaku, dan jumlah bahan dari alternatif yang dibeli. Solver CP-SAT memaksimalkan `sum(kontribusi_per_unit × produksi) − sum(premium_per_pak × pak)`. Biaya normal sudah tercermin pada kontribusi per unit. Setiap rencana yang dikembalikan solver diperiksa terhadap permintaan, kapasitas, stok, dan nilai objektif.

## Tiga angka acuan

- Normal memiliki tepung 33.000 g. Permintaan 100 roti dan 30 pak kue memerlukan 28.000 g dan menghasilkan estimasi kontribusi Rp450.000.
- Saat pemasok utama gagal, stok 8.000 g mencukupi 30 pak kue dengan 3.000 g dan 20 roti dengan 5.000 g. Estimasi kontribusi Rp210.000.
- Mitigasi menambah 12.000 g dari 12 pak. Tepung tersebut memungkinkan tambahan 48 roti. Kontribusi sebelum premium Rp354.000, dikurangi premium Rp12.000, menghasilkan Rp342.000.

Kontribusi terancam adalah selisih normal dan gangguan dengan batas bawah nol. Kontribusi pulih adalah estimasi mitigasi dikurangi estimasi gangguan, sehingga dapat negatif. Fraksi pemulihan adalah kontribusi pulih dibagi kontribusi terancam. Nilainya tidak berlaku ketika kontribusi terancam sama dengan nol. Pada fixture, Rp132.000 dibagi Rp240.000 menghasilkan 55%.

`OPTIMAL` menyatakan optimum terbukti. `FEASIBLE` menyatakan solver menemukan rencana yang memenuhi kendala. `UNKNOWN`, `INFEASIBLE`, dan `MODEL_INVALID` tidak menghasilkan nilai kontribusi. Klien menerima penjelasan status dan dapat mencoba ulang. [Dokumentasi CP-SAT dan contoh resmi](https://github.com/google/or-tools/blob/stable/ortools/sat/samples/simple_sat_program.py)
