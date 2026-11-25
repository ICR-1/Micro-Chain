import Link from "next/link";

const FLOW = [
  { label: "Normal", value: "Rp 450 rb", note: "100 roti dan 30 kue kering", tone: "text-ink" },
  { label: "Pemasok A gagal kirim", value: "Rp 210 rb", note: "Tepung habis, roti turun jadi 20", tone: "text-danger" },
  { label: "Pemasok B diaktifkan", value: "Rp 342 rb", note: "12 pak tepung, premi Rp 12 rb", tone: "text-brand" },
] as const;

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          MicroChain
        </Link>
        <nav aria-label="Navigasi utama" className="flex items-center gap-4 text-sm font-medium">
          <Link href="/login" className="rounded px-2 py-1 text-ink-muted hover:text-ink">
            Masuk
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6">
        <section className="grid gap-10 pt-8 pb-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-16">
          <div>
            <h1 className="max-w-xl text-4xl font-bold leading-[1.1] tracking-tight text-balance sm:text-5xl">
              Pemasok tepung terlambat. Apa yang tetap layak Anda masak?
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-muted">
              MicroChain memetakan bahan yang hanya punya satu pemasok, lalu menghitung rencana produksi dan
              pembelian cadangan yang paling menguntungkan saat pengiriman gagal.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/demo"
                className="inline-flex min-h-11 items-center rounded-md bg-brand px-5 text-base font-semibold text-white hover:bg-brand-strong"
              >
                Coba Demo Dapur Sari
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center rounded-md border border-line bg-paper px-5 text-base font-semibold hover:border-ink"
              >
                Masuk dengan Email
              </Link>
            </div>
            <p className="mt-3 text-sm text-ink-muted">Demo tanpa daftar. Perubahan Anda hanya tersimpan di browser.</p>
          </div>

          <aside aria-label="Contoh hasil: toko roti Dapur Sari" className="rounded-lg border border-line bg-paper p-5 sm:p-6">
            <p className="text-sm font-semibold text-ink-muted">Contoh: toko roti Dapur Sari</p>
            <ol className="mt-4 divide-y divide-line">
              {FLOW.map((row) => (
                <li key={row.label} className="flex items-baseline justify-between gap-4 py-3">
                  <div>
                    <p className="font-semibold">{row.label}</p>
                    <p className="text-sm text-ink-muted">{row.note}</p>
                  </div>
                  <p className={`num shrink-0 text-xl font-bold ${row.tone}`}>{row.value}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-md bg-brand-tint px-4 py-3 text-sm leading-relaxed text-brand-strong">
              Kontribusi pulih <span className="num font-bold">+Rp 132 rb</span>, atau{" "}
              <span className="num font-bold">55%</span> dari kerugian akibat gangguan.
            </p>
          </aside>
        </section>

        <section aria-labelledby="yang-dihitung" className="border-t border-line pt-10">
          <h2 id="yang-dihitung" className="text-2xl font-bold tracking-tight">
            Yang dihitung MicroChain
          </h2>
          <dl className="mt-6 grid gap-8 sm:grid-cols-3">
            <div>
              <dt className="font-semibold">Peta ketergantungan</dt>
              <dd className="mt-1 leading-relaxed text-ink-muted">
                Pemasok, bahan, dan produk dalam satu graf. Bahan dengan satu pemasok ditandai Sumber Tunggal.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Rencana optimal</dt>
              <dd className="mt-1 leading-relaxed text-ink-muted">
                Solver optimasi memilih produk dan jumlah pak cadangan yang memberi kontribusi bersih terbesar.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Hasil yang tidak basi</dt>
              <dd className="mt-1 leading-relaxed text-ink-muted">
                Ubah stok atau tanggal, dan hasil lama langsung ditandai basi sampai Anda menghitung ulang.
              </dd>
            </div>
          </dl>
        </section>
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-ink-muted sm:px-6">
          MicroChain untuk UMKM makanan. Angka contoh berasal dari data demo Dapur Sari.
        </p>
      </footer>
    </div>
  );
}
