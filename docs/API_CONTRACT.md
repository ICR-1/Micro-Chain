# Kontrak API

FastAPI menyediakan dokumentasi interaktif di `/docs` dan spesifikasi mesin di `/openapi.json`. Semua request POST menggunakan `Content-Type: application/json`.

| Metode dan jalur | Request | Respons sukses |
|---|---|---|
| `GET /health` | — | `status` dan `solver_available`, dari pemeriksaan CP-SAT |
| `GET /api/v1/demo` | — | `snapshot`, `scenarios`, dan `demo_data` |
| `POST /api/v1/network/analyze` | `{snapshot, scenario}`. Skenario opsional untuk kondisi normal | Node, edge terarah, dependensi per bahan, risiko sumber tunggal, dan peringatan |
| `POST /api/v1/simulations/preview` | `{snapshot, scenario}` | Produksi, pembelian, pemakaian bahan, KPI, tanggal, hash input, status, durasi, dan penjelasan |
| `POST /api/v1/simulations/compare` | `{snapshot, scenarios}` | 2–3 hasil skenario, delta antar skenario, kontribusi terancam, nilai pulih, dan persentase pulih |

Ambil `snapshot` dan `scenarios` dari endpoint demo. Untuk preview, pilih objek skenario dengan `id` yang diinginkan. Field `scenario.overrides` dapat berisi `stock_on_hand` menggunakan ID bahan, `demand_units` menggunakan ID produk, dan `max_packs` menggunakan ID penawaran. Contohnya, `{"stock_on_hand":{"flour":9000}}` menaruh stok tepung pada 9.000 gram. API membatasi jumlah produk, bahan, pemasok, BOM, penawaran, dan ukuran badan request.

Contoh request normal yang bisa dijalankan dengan Python standar selama API lokal menyala:

```python
import json
from urllib.request import Request, urlopen

base = "http://localhost:8000/api/v1"
with urlopen(f"{base}/demo", timeout=10) as response:
    demo = json.load(response)

payload = {
    "snapshot": demo["snapshot"],
    "scenario": next(s for s in demo["scenarios"] if s["id"] == "baseline"),
}
request = Request(
    f"{base}/simulations/preview",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json"},
)
with urlopen(request, timeout=10) as response:
    result = json.load(response)
print(result["solver_status"], result["kpis"])
```

Bagian `kpis` dari respons normal untuk fixture:

```json
{
  "gross_contribution_idr": 450000,
  "incremental_premium_idr": 0,
  "net_contribution_idr": 450000
}
```

Kode `422` menunjukkan JSON atau isi snapshot/skenario tidak valid. `413` menunjukkan badan request melebihi batas. `429` menunjukkan batas frekuensi analisis dan simulasi. `503` menunjukkan solver tidak siap. Status `UNKNOWN`, `INFEASIBLE`, dan `MODEL_INVALID` dapat muncul dalam respons solver dengan KPI `null`. Untuk status `FEASIBLE`, KPI mewakili solusi yang ditemukan dalam batas waktu dan UI menampilkan status tersebut.

Delta perubahan mengikuti urutan skenario pada request. Metrik terancam dan pemulihan menggunakan ID `baseline`, `outage`, dan `mitigation`. Metrik yang tidak bisa dihitung bernilai `null`. Hash input SHA-256 mencakup snapshot serta skenario.
