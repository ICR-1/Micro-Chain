"use client";

import { lazy, Suspense, useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { buildSupplyNetwork, type SupplyNode } from "@/lib/domain/graph";
import type { ScenarioConfig, ScenarioResult, WorkspaceSnapshot } from "@/lib/domain/types";
import { formatDate, formatNumber, formatRupiah } from "@/lib/format";
import { BADGE_CLASS, KIND_LABEL, nodeBadges } from "./graph-shared";

const SupplyGraphCanvas = lazy(() => import("./SupplyGraphCanvas"));

const DESKTOP_QUERY = "(min-width: 640px)";

/** `true` pada layar >= 640px. Server dan layar kecil selalu mendapat daftar, bukan graf. */
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = typeof window !== "undefined" ? window.matchMedia?.(DESKTOP_QUERY) : undefined;
      mq?.addEventListener("change", notify);
      return () => mq?.removeEventListener("change", notify);
    },
    () => (typeof window !== "undefined" ? (window.matchMedia?.(DESKTOP_QUERY).matches ?? false) : false),
    () => false,
  );
}

interface Props {
  snapshot: WorkspaceSnapshot;
  scenario: ScenarioConfig;
  result: ScenarioResult | undefined;
}

export default function SupplyGraphView({ snapshot, scenario, result }: Props) {
  const isDesktop = useIsDesktop();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const select = useCallback((id: string) => setSelectedId(id), []);

  const network = useMemo(() => buildSupplyNetwork(snapshot, scenario, result), [snapshot, scenario, result]);
  const selected = network.nodes.find((n) => n.id === selectedId) ?? null;

  const singleSupplierCount = network.nodes.filter((n) => n.kind === "material" && n.meta.isSingleSupplier).length;

  return (
    <div className="space-y-4">
      <p className="text-ink-muted">
        {singleSupplierCount > 0
          ? `${singleSupplierCount} bahan hanya punya satu pemasok komitmen. Gangguan di sana langsung menghentikan produksi.`
          : "Tidak ada bahan dengan satu pemasok komitmen."}
        {" "}Skenario ditampilkan: <strong className="text-ink">{scenario.name}</strong>.
      </p>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div>
          {isDesktop ? (
            <Suspense fallback={<div className="h-[30rem] rounded-lg border border-line bg-paper" aria-busy="true" />}>
              <SupplyGraphCanvas network={network} selectedId={selectedId} onSelect={select} />
            </Suspense>
          ) : (
            <NodeLists nodes={network.nodes} selectedId={selectedId} onSelect={select} />
          )}
          <Legend />
        </div>
        <DetailPanel node={selected} snapshot={snapshot} result={result} />
      </div>
    </div>
  );
}

function Legend() {
  return (
    <p className="mt-3 text-xs text-ink-muted">
      Garis putus-putus hijau: penawaran cadangan. Garis merah: jalur yang terganggu pada skenario ini.
    </p>
  );
}

function NodeLists({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: SupplyNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const groups = [
    { kind: "supplier", title: "Pemasok" },
    { kind: "material", title: "Bahan" },
    { kind: "product", title: "Produk" },
  ] as const;
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.kind} aria-label={g.title}>
          <h3 className="mb-2 text-sm font-semibold text-ink-muted">{g.title}</h3>
          <ul aria-label={g.title} className="divide-y divide-line rounded-lg border border-line bg-paper">
            {nodes
              .filter((n) => n.kind === g.kind)
              .map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(n.id)}
                    aria-pressed={n.id === selectedId}
                    className={`flex min-h-12 w-full flex-wrap items-center justify-between gap-2 px-4 py-2 text-left ${
                      n.id === selectedId ? "bg-brand-tint" : ""
                    }`}
                  >
                    <span className="font-medium">{n.label}</span>
                    <span className="flex flex-wrap gap-1">
                      {nodeBadges(n).map((b) => (
                        <span key={b.text} className={`rounded px-1.5 py-0.5 text-xs font-semibold ${BADGE_CLASS[b.tone]}`}>
                          {b.text}
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function DetailPanel({
  node,
  snapshot,
  result,
}: {
  node: SupplyNode | null;
  snapshot: WorkspaceSnapshot;
  result: ScenarioResult | undefined;
}) {
  if (!node) {
    return (
      <aside className="rounded-lg border border-dashed border-line p-4 text-sm text-ink-muted">
        Pilih pemasok, bahan, atau produk untuk melihat detailnya.
      </aside>
    );
  }
  const name = (list: { id: string; name: string }[], id: string) => list.find((x) => x.id === id)?.name ?? id;
  const unitOf = (id: string) => snapshot.materials.find((m) => m.id === id)?.base_unit ?? "";

  return (
    <section aria-label={`Detail ${node.label}`} className="rounded-lg border border-line bg-paper p-4">
      <p className="text-xs text-ink-muted">{KIND_LABEL[node.kind]}</p>
      <h3 className="text-lg font-bold">{node.label}</h3>
      <div className="mt-2 flex flex-wrap gap-1">
        {nodeBadges(node).map((b) => (
          <span key={b.text} className={`rounded px-1.5 py-0.5 text-xs font-semibold ${BADGE_CLASS[b.tone]}`}>
            {b.text}
          </span>
        ))}
      </div>

      <div className="mt-3 space-y-2 text-sm">
        {node.kind === "material" && (
          <MaterialDetail node={node} snapshot={snapshot} result={result} name={name} />
        )}
        {node.kind === "supplier" && (
          <>
            {snapshot.committed_deliveries
              .filter((d) => d.supplier_id === node.entityId)
              .map((d) => (
                <p key={d.id}>
                  Komitmen: {name(snapshot.materials, d.material_id)},{" "}
                  <span className="num">{formatNumber(d.quantity_base_units)} {unitOf(d.material_id)}</span>,{" "}
                  <span className="num">{formatDate(d.arrival_date)}</span>
                </p>
              ))}
            {snapshot.alternative_offers
              .filter((o) => o.supplier_id === node.entityId)
              .map((o) => (
                <p key={o.id}>
                  Penawaran: {name(snapshot.materials, o.material_id)}, maks.{" "}
                  <span className="num">{formatNumber(o.max_packs)}</span> pak ×{" "}
                  <span className="num">{formatNumber(o.pack_size_base_units)} {unitOf(o.material_id)}</span>, premi{" "}
                  <span className="num">{formatRupiah(o.incremental_premium_idr_per_pack)}</span>/pak
                </p>
              ))}
            {snapshot.suppliers.find((s) => s.id === node.entityId)?.notes && (
              <p className="text-ink-muted">{snapshot.suppliers.find((s) => s.id === node.entityId)?.notes}</p>
            )}
          </>
        )}
        {node.kind === "product" && (
          <>
            <p>
              Permintaan: <span className="num">{formatNumber(node.meta.demand_units)}</span> unit
            </p>
            <p>
              Kontribusi: <span className="num">{formatRupiah(node.meta.unit_contribution_idr)}</span> per unit
            </p>
            <p>Bahan resep: {node.meta.materialIds.map((id) => name(snapshot.materials, id)).join(", ") || "-"}</p>
            {result && (
              <p>
                Diproduksi pada skenario ini:{" "}
                <span className="num font-semibold">
                  {formatNumber(result.production.find((p) => p.product_id === node.entityId)?.units ?? 0)}
                </span>{" "}
                unit
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function MaterialDetail({
  node,
  snapshot,
  result,
  name,
}: {
  node: Extract<SupplyNode, { kind: "material" }>;
  snapshot: WorkspaceSnapshot;
  result: ScenarioResult | undefined;
  name: (list: { id: string; name: string }[], id: string) => string;
}) {
  const unit = node.meta.base_unit;
  const usage = result?.material_usage.find((m) => m.material_id === node.entityId);
  return (
    <>
      <p>
        Stok awal: <span className="num">{formatNumber(node.meta.stock_on_hand)} {unit}</span>
      </p>
      {snapshot.committed_deliveries
        .filter((d) => d.material_id === node.entityId)
        .map((d) => (
          <p key={d.id}>
            Komitmen: {name(snapshot.suppliers, d.supplier_id)},{" "}
            <span className="num">{formatNumber(d.quantity_base_units)} {unit}</span>,{" "}
            <span className="num">{formatDate(d.arrival_date)}</span>
          </p>
        ))}
      {snapshot.alternative_offers
        .filter((o) => o.material_id === node.entityId)
        .map((o) => (
          <p key={o.id}>
            Cadangan: {name(snapshot.suppliers, o.supplier_id)} (maks. {formatNumber(o.max_packs)} pak ×{" "}
            {formatNumber(o.pack_size_base_units)} {unit})
          </p>
        ))}
      <p>Dipakai oleh: {node.meta.productIds.map((id) => name(snapshot.products, id)).join(", ") || "-"}</p>
      {usage && (
        <p>
          Skenario ini: terpakai <span className="num">{formatNumber(usage.used)} {unit}</span>, sisa{" "}
          <span className="num">{formatNumber(usage.remaining)} {unit}</span>
        </p>
      )}
    </>
  );
}
