"use client";

import { CORE_SCENARIO_IDS, MAX_SCENARIOS, type ScenarioConfig, type ScenarioResult, type WorkspaceSnapshot } from "@/lib/domain/types";
import { formatDate, formatNumber, formatPercent, formatRupiah } from "@/lib/format";
import DateField from "@/components/ui/DateField";
import NumberField from "@/components/ui/NumberField";

interface Props {
  snapshot: WorkspaceSnapshot;
  scenarios: ScenarioConfig[];
  selectedId: string;
  onSelect: (id: string) => void;
  onChange: (next: ScenarioConfig) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onRun: () => void;
  results: ScenarioResult[] | null;
  isStale: boolean;
  running: boolean;
}

const STATUS_LABEL = { Optimal: "Optimal", Infeasible: "Tidak Layak", Error: "Galat" } as const;

export function StaleBanner({ onRun, running }: { onRun: () => void; running: boolean }) {
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warn bg-warn-tint px-4 py-3">
      <p className="font-medium text-warn">
        Hasil simulasi sebelumnya sudah basi karena data atau skenario berubah. Hitung ulang sebelum mengambil keputusan.
      </p>
      <button
        type="button"
        onClick={onRun}
        disabled={running}
        className="min-h-10 rounded-md bg-warn px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {running ? "Menghitung..." : "Jalankan Ulang Simulasi"}
      </button>
    </div>
  );
}

export default function SimulatorView({
  snapshot, scenarios, selectedId, onSelect, onChange, onAdd, onRemove, onRun, results, isStale, running,
}: Props) {
  const scenario = scenarios.find((s) => s.id === selectedId) ?? scenarios[0];
  const result = results?.find((r) => r.scenario_id === scenario.id);
  const isCore = (CORE_SCENARIO_IDS as readonly string[]).includes(scenario.id);

  const supplierName = (id: string) => snapshot.suppliers.find((s) => s.id === id)?.name ?? id;
  const materialName = (id: string) => snapshot.materials.find((m) => m.id === id)?.name ?? id;
  const productName = (id: string) => snapshot.products.find((p) => p.id === id)?.name ?? id;
  const unitOf = (id: string) => snapshot.materials.find((m) => m.id === id)?.base_unit ?? "";

  const toggle = (list: string[], id: string, on: boolean) =>
    on ? [...new Set([...list, id])].sort() : list.filter((x) => x !== id);

  const delayOf = (deliveryId: string) =>
    scenario.disruptions.filter((d) => d.delivery_id === deliveryId).reduce((sum, d) => sum + d.delay_days, 0);
  const setDelay = (deliveryId: string, days: number) => {
    const rest = scenario.disruptions.filter((d) => d.delivery_id !== deliveryId);
    onChange({
      ...scenario,
      disruptions: days > 0 ? [...rest, { type: "delay_delivery", delivery_id: deliveryId, delay_days: days }] : rest,
    });
  };

  return (
    <div className="space-y-5">
      {isStale && <StaleBanner onRun={onRun} running={running} />}

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Pilih skenario">
        {scenarios.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={s.id === scenario.id}
            onClick={() => onSelect(s.id)}
            className={`min-h-10 rounded-md border px-3 text-sm font-semibold ${
              s.id === scenario.id ? "border-ink bg-ink text-white" : "border-line bg-paper hover:border-ink"
            }`}
          >
            {s.name}
          </button>
        ))}
        <button
          type="button"
          onClick={onAdd}
          disabled={scenarios.length >= MAX_SCENARIOS}
          className="min-h-10 rounded-md border border-dashed border-line px-3 text-sm font-semibold text-ink-muted hover:border-ink hover:text-ink disabled:opacity-50"
        >
          Tambah Skenario
        </button>
        {!isCore && (
          <button
            type="button"
            onClick={() => onRemove(scenario.id)}
            className="min-h-10 rounded-md px-3 text-sm font-semibold text-danger hover:bg-danger-tint"
          >
            Hapus Skenario
          </button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        {/* Parameter skenario */}
        <section aria-label="Parameter skenario" className="space-y-5 rounded-lg border border-line bg-paper p-4">
          <DateField
            label="Tanggal batas"
            value={scenario.cutoff_date}
            onCommit={(v) => onChange({ ...scenario, cutoff_date: v })}
          />
          <p className="-mt-3 text-xs text-ink-muted">
            Bahan yang tiba setelah tanggal ini tidak bisa dipakai. Tanggal simulasi: {formatDate(snapshot.scenario_date)}.
          </p>

          <fieldset>
            <legend className="text-sm font-semibold">Pemasok</legend>
            <div className="mt-2 space-y-2">
              {snapshot.suppliers.map((s) => (
                <label key={s.id} className="flex min-h-10 items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-[var(--danger)]"
                    checked={!s.active || scenario.disabled_supplier_ids.includes(s.id)}
                    disabled={!s.active}
                    onChange={(e) =>
                      onChange({ ...scenario, disabled_supplier_ids: toggle(scenario.disabled_supplier_ids, s.id, e.target.checked) })
                    }
                  />
                  <span>
                    {s.name} gagal kirim
                    {!s.active && <span className="block text-xs text-ink-muted">Nonaktif di Data Usaha</span>}
                  </span>
                </label>
              ))}
              {snapshot.suppliers.length === 0 && <p className="text-sm text-ink-muted">Belum ada pemasok.</p>}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold">Penawaran cadangan</legend>
            <div className="mt-2 space-y-2">
              {snapshot.alternative_offers.map((o) => (
                <label key={o.id} className="flex min-h-10 items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-[var(--brand)]"
                    checked={o.enabled_in_scenario && scenario.enabled_offer_ids.includes(o.id)}
                    disabled={!o.enabled_in_scenario}
                    onChange={(e) =>
                      onChange({ ...scenario, enabled_offer_ids: toggle(scenario.enabled_offer_ids, o.id, e.target.checked) })
                    }
                  />
                  <span>
                    Aktifkan penawaran {supplierName(o.supplier_id)}: {materialName(o.material_id)}
                    <span className="num block text-xs text-ink-muted">
                      maks. {formatNumber(o.max_packs)} pak × {formatNumber(o.pack_size_base_units)} {unitOf(o.material_id)}, tiba +{o.lead_days} hari, premi {formatRupiah(o.incremental_premium_idr_per_pack)}/pak
                    </span>
                    {!o.enabled_in_scenario && (
                      <span className="block text-xs font-semibold text-warn">Dinonaktifkan di Data Usaha</span>
                    )}
                  </span>
                </label>
              ))}
              {snapshot.alternative_offers.length === 0 && <p className="text-sm text-ink-muted">Belum ada penawaran cadangan.</p>}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold">Keterlambatan pengiriman</legend>
            <div className="mt-2 space-y-3">
              {snapshot.committed_deliveries.map((d) => (
                <NumberField
                  key={d.id}
                  label={`Keterlambatan ${supplierName(d.supplier_id)} – ${materialName(d.material_id)} (hari)`}
                  value={delayOf(d.id)}
                  min={0}
                  max={365}
                  suffix="hari"
                  onCommit={(n) => setDelay(d.id, n)}
                />
              ))}
              {snapshot.committed_deliveries.length === 0 && <p className="text-sm text-ink-muted">Belum ada pengiriman terjadwal.</p>}
            </div>
          </fieldset>
        </section>

        {/* Hasil */}
        <section aria-label="Hasil simulasi" className={`space-y-5 ${isStale ? "opacity-70" : ""}`}>
          {!result ? (
            <p className="rounded-lg border border-dashed border-line p-6 text-ink-muted">
              Skenario ini belum dihitung. Tekan &quot;Jalankan Ulang Simulasi&quot; untuk melihat hasilnya.
            </p>
          ) : (
            <>
              <section aria-label="Ringkasan hasil" className="grid gap-3 rounded-lg border border-line bg-paper p-4 sm:grid-cols-4">
                <Metric label="Status solver" value={STATUS_LABEL[result.status]} tone={result.status === "Optimal" ? "ok" : "bad"} />
                <Metric label="Kontribusi kotor" value={formatRupiah(result.gross_contribution_idr)} />
                <Metric label="Biaya premi alternatif" value={formatRupiah(result.alternative_premium_idr)} />
                <Metric label="Kontribusi bersih" value={formatRupiah(result.net_contribution_idr)} strong />
                {isStale && (
                  <p className="sm:col-span-4">
                    <span className="rounded bg-warn-tint px-2 py-0.5 text-xs font-semibold text-warn">Basi</span>
                  </p>
                )}
                {result.message && <p className="text-sm text-danger sm:col-span-4">{result.message}</p>}
              </section>

              <DataTable label="Rencana produksi" head={["Produk", "Permintaan", "Diproduksi", "Terpenuhi", "Kontribusi"]}>
                {result.production.map((p) => (
                  <tr key={p.product_id}>
                    <th scope="row" className="py-2 pr-3 text-left font-medium">{productName(p.product_id)}</th>
                    <Td>{formatNumber(p.demand_units)}</Td>
                    <Td strong>{formatNumber(p.units)}</Td>
                    <Td>{formatPercent(p.demand_units > 0 ? (p.units / p.demand_units) * 100 : 100)}</Td>
                    <Td>{formatRupiah(p.contribution_idr)}</Td>
                  </tr>
                ))}
              </DataTable>

              <DataTable label="Pemakaian bahan" head={["Bahan", "Tersedia", "Terpakai", "Sisa"]}>
                {result.material_usage.map((m) => (
                  <tr key={m.material_id}>
                    <th scope="row" className="py-2 pr-3 text-left font-medium">
                      {materialName(m.material_id)}
                      {result.bottleneck_material_ids.includes(m.material_id) && (
                        <span className="ml-2 rounded bg-danger-tint px-1.5 py-0.5 text-xs font-semibold text-danger">Penghambat</span>
                      )}
                    </th>
                    <Td>{formatNumber(m.available)} {unitOf(m.material_id)}</Td>
                    <Td>{formatNumber(m.used)} {unitOf(m.material_id)}</Td>
                    <Td>{formatNumber(m.remaining)} {unitOf(m.material_id)}</Td>
                  </tr>
                ))}
              </DataTable>

              {result.alternative_purchases.length > 0 && (
                <DataTable label="Paket alternatif" head={["Penawaran", "Status", "Maks. pak", "Dibeli", "Premi"]}>
                  {result.alternative_purchases.map((a) => {
                    const offer = snapshot.alternative_offers.find((o) => o.id === a.offer_id);
                    return (
                      <tr key={a.offer_id}>
                        <th scope="row" className="py-2 pr-3 text-left font-medium">
                          {offer ? `${supplierName(offer.supplier_id)}: ${materialName(offer.material_id)}` : a.offer_id}
                        </th>
                        <td className="py-2 pr-3 text-xs">{a.eligible ? `Layak, tiba ${formatDate(a.arrival_date)}` : a.reason}</td>
                        <Td>{formatNumber(a.effective_max_packs)}</Td>
                        <Td strong>{formatNumber(a.packs_bought)} pak</Td>
                        <Td>{formatRupiah(a.premium_idr)}</Td>
                      </tr>
                    );
                  })}
                </DataTable>
              )}

              {result.delivery_statuses.length > 0 && (
                <section aria-label="Status pengiriman terjadwal">
                  <h3 className="mb-2 text-sm font-semibold text-ink-muted">Status pengiriman terjadwal</h3>
                  <ul className="divide-y divide-line rounded-lg border border-line bg-paper">
                    {result.delivery_statuses.map((d) => {
                      const del = snapshot.committed_deliveries.find((x) => x.id === d.delivery_id);
                      return (
                        <li key={d.delivery_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                          <span>
                            {del ? `${supplierName(del.supplier_id)}: ${materialName(del.material_id)}` : d.delivery_id}{" "}
                            <span className="num text-ink-muted">
                              {formatNumber(d.quantity_base_units)} {del ? unitOf(del.material_id) : ""}, tiba {formatDate(d.effective_arrival)}
                            </span>
                          </span>
                          <span className={d.counted ? "font-semibold text-brand" : "font-semibold text-danger"}>
                            {d.counted ? "Dihitung" : d.reason}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "ok" | "bad" }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={`num mt-0.5 ${strong ? "text-2xl font-bold" : "text-lg font-semibold"} ${tone === "bad" ? "text-danger" : tone === "ok" ? "text-brand" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function DataTable({ label, head, children }: { label: string; head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-paper px-4 py-2">
      <table aria-label={label} className="w-full min-w-[28rem] text-sm">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr className="text-xs text-ink-muted">
            {head.map((h, i) => (
              <th key={h} scope="col" className={`py-2 pr-3 font-semibold ${i === 0 ? "text-left" : i === 1 && label === "Paket alternatif" ? "text-left" : "text-right"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return <td className={`num py-2 pr-3 text-right ${strong ? "font-bold" : ""}`}>{children}</td>;
}
