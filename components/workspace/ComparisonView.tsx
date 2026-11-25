"use client";

import type { ComparisonSummary, ScenarioConfig, ScenarioResult, WorkspaceSnapshot } from "@/lib/domain/types";
import { formatNumber, formatPercent, formatRupiah } from "@/lib/format";

interface Props {
  snapshot: WorkspaceSnapshot;
  scenarios: ScenarioConfig[];
  results: ScenarioResult[] | null;
  comparison: ComparisonSummary | null;
  isStale: boolean;
}

const STATUS_LABEL = { Optimal: "Optimal", Infeasible: "Tidak Layak", Error: "Galat" } as const;
const signed = (n: number) => (n > 0 ? `+${formatRupiah(n)}` : formatRupiah(n));

export default function ComparisonView({ snapshot, scenarios, results, comparison, isStale }: Props) {
  if (!results || !comparison) {
    return (
      <p className="rounded-lg border border-dashed border-line p-6 text-ink-muted">
        Belum ada hasil simulasi. Jalankan simulasi untuk membandingkan skenario Normal, gangguan, dan mitigasi.
      </p>
    );
  }

  const productName = (id: string) => snapshot.products.find((p) => p.id === id)?.name ?? id;
  const nameOf = (id: string) => scenarios.find((s) => s.id === id)?.name ?? id;
  const baseline = comparison.baseline_net_idr;

  const bars = [
    { id: "baseline", label: nameOf("baseline"), value: comparison.baseline_net_idr, color: "bg-ink-muted" },
    { id: "outage", label: nameOf("outage"), value: comparison.outage_net_idr, color: "bg-danger" },
    { id: "mitigation", label: nameOf("mitigation"), value: comparison.mitigation_net_idr, color: "bg-brand" },
  ];
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <div className={`space-y-6 ${isStale ? "opacity-70" : ""}`}>
      <section aria-label="Ringkasan pemulihan" className="grid gap-4 rounded-lg border border-line bg-paper p-5 sm:grid-cols-3">
        <div>
          <p className="text-sm text-ink-muted">Kerugian akibat gangguan</p>
          <p className="num mt-1 text-2xl font-bold text-danger">{formatRupiah(comparison.loss_idr)}</p>
          <p className="mt-1 text-sm text-ink-muted">{formatPercent(comparison.loss_pct_of_baseline)} dari kondisi normal</p>
        </div>
        <div>
          <p className="text-sm text-ink-muted">Kontribusi pulih dengan mitigasi</p>
          <p className="num mt-1 text-2xl font-bold text-brand">{signed(comparison.recovered_idr)}</p>
          <p className="mt-1 text-sm text-ink-muted">{formatPercent(comparison.recovered_pct_of_loss)} dari kerugian</p>
        </div>
        <div>
          <p className="text-sm text-ink-muted">Capaian terhadap normal</p>
          <p className="num mt-1 text-2xl font-bold">{formatPercent(comparison.recovered_pct_of_baseline)}</p>
          <p className="mt-1 text-sm text-ink-muted">kontribusi bersih mitigasi dibanding skenario normal</p>
        </div>
        {isStale && (
          <p className="sm:col-span-3">
            <span className="rounded bg-warn-tint px-2 py-0.5 text-xs font-semibold text-warn">Basi</span>
          </p>
        )}
      </section>

      <figure className="rounded-lg border border-line bg-paper p-5">
        <figcaption className="mb-3 text-sm font-semibold text-ink-muted">Kontribusi bersih per skenario inti</figcaption>
        <ul className="space-y-3">
          {bars.map((b) => (
            <li key={b.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>{b.label}</span>
                <span className="num font-semibold">{formatRupiah(b.value)}</span>
              </div>
              <div className="mt-1 h-3 rounded-full bg-canvas" aria-hidden>
                <div className={`h-3 rounded-full ${b.color}`} style={{ width: `${Math.max(0, (b.value / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </figure>

      <div className="overflow-x-auto rounded-lg border border-line bg-paper px-4 py-2">
        <table aria-label="Perbandingan skenario" className="w-full min-w-[36rem] text-sm">
          <caption className="sr-only">Perbandingan seluruh skenario</caption>
          <thead>
            <tr className="text-xs text-ink-muted">
              <th scope="col" className="py-2 pr-3 text-left font-semibold">Skenario</th>
              <th scope="col" className="py-2 pr-3 text-left font-semibold">Status</th>
              <th scope="col" className="py-2 pr-3 text-left font-semibold">Produksi</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Premi</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Kontribusi bersih</th>
              <th scope="col" className="py-2 text-right font-semibold">Selisih dari normal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {scenarios.map((s) => {
              const r = results.find((x) => x.scenario_id === s.id);
              if (!r) {
                return (
                  <tr key={s.id}>
                    <th scope="row" className="py-2 pr-3 text-left font-medium">{s.name}</th>
                    <td colSpan={5} className="py-2 text-ink-muted">Belum dihitung</td>
                  </tr>
                );
              }
              const diff = r.net_contribution_idr - baseline;
              return (
                <tr key={s.id}>
                  <th scope="row" className="py-2 pr-3 text-left font-medium">{s.name}</th>
                  <td className={`py-2 pr-3 ${r.status === "Optimal" ? "" : "text-danger"}`}>{STATUS_LABEL[r.status]}</td>
                  <td className="py-2 pr-3">
                    {r.production.filter((p) => p.units > 0).map((p) => `${productName(p.product_id)} ${formatNumber(p.units)}`).join(" · ") || "Tidak ada"}
                  </td>
                  <td className="num py-2 pr-3 text-right">{formatRupiah(r.alternative_premium_idr)}</td>
                  <td className="num py-2 pr-3 text-right font-bold">{formatRupiah(r.net_contribution_idr)}</td>
                  <td className="num py-2 text-right text-ink-muted">{s.id === "baseline" ? "-" : signed(diff)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
