/** Pemformat angka ala Indonesia (pemisah ribuan titik, desimal koma). */
const nf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export function formatNumber(n: number): string {
  return nf.format(Number.isFinite(n) ? n : 0);
}

/** `Rp 342.000`; negatif ditulis `-Rp 12.000`. */
export function formatRupiah(n: number): string {
  const v = Number.isFinite(n) ? Math.round(n) : 0;
  return `${v < 0 ? "-" : ""}Rp ${formatNumber(Math.abs(v))}`;
}

/** Ringkas untuk judul/kartu: `Rp 450 rb`, `Rp 1,5 jt`. */
export function formatRupiahShort(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  const trim = (x: number) => x.toFixed(1).replace(/\.0$/, "").replace(".", ",");
  if (abs >= 1_000_000) return `${sign}Rp ${trim(abs / 1_000_000)} jt`;
  if (abs >= 1_000) return `${sign}Rp ${trim(abs / 1_000)} rb`;
  return `${sign}Rp ${formatNumber(abs)}`;
}

/** `55%` atau `53,3%`; nilai tak berhingga/NaN menjadi `0%`. */
export function formatPercent(n: number): string {
  if (!Number.isFinite(n)) return "0%";
  const rounded = Math.round(n * 10) / 10;
  return `${String(rounded).replace(".", ",")}%`;
}

export function formatQuantity(n: number, unit: string): string {
  return `${formatNumber(n)} ${unit}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** `2026-11-24` -> `24 Nov 2026`. */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}
