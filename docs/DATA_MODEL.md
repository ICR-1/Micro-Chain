# Model Data

Snapshot adalah model usaha untuk satu tanggal simulasi. API menerima satu snapshot dan skenario untuk simulasi, atau satu snapshot dan 2–3 skenario untuk perbandingan. Mode demo mengirim snapshot fiktif dari `apps/api/app/data/demo_dapur_sari.json`.

| Entitas | Isi dan relasi |
|---|---|
| Business | Identitas usaha, sektor, mata uang IDR, tanggal pembuatan, dan batas rencana default |
| Supplier | Status aktif, nama, dan catatan untuk sebuah usaha |
| Material | Nama, jenis satuan, satuan dasar, dan stok awal untuk sebuah usaha |
| Product | Nama, permintaan, dan kontribusi normal per unit untuk sebuah usaha |
| BOMItem | Kebutuhan sebuah bahan untuk satu unit produk. Pasangan produk dan bahan unik |
| CommittedDelivery | Jumlah bahan yang dijadwalkan dari pemasok, tanggal tiba, dan status masuk rencana |
| AlternativeOffer | Ukuran pak, kapasitas, waktu tunggu, dan premium tambahan dari satu pemasok untuk satu bahan |
| Disruption | Gangguan atas ID pemasok dan rentang tanggal |
| Scenario | Tanggal batas, pemasok yang dinonaktifkan, penawaran yang diizinkan, gangguan, dan override input |
| SimulationResult | Status solver, rencana produksi dan pembelian, penggunaan dan sisa bahan, kontribusi, dan metadata |

Kuantitas adalah integer dalam `g`, `ml`, atau `pcs` sesuai jenis bahan. BOM untuk satu produk menyimpan kebutuhan dalam satuan dasar bahan yang dirujuk. Nilai uang adalah integer Rupiah. Kontribusi normal per produk sudah memperhitungkan biaya normal. Premium alternatif adalah selisih biaya per pak dan dikurangi satu kali dalam simulasi.

API memvalidasi ID unik, relasi usaha, referensi pemasok/bahan/produk, BOM per produk, tanggal, dan batas kuantitas. Validitas pasokan dihitung ulang terhadap tanggal batas, waktu tunggu, dan status pemasok. Perubahan di browser bersifat sementara selama sesi demo. Versi ini belum memakai database.
