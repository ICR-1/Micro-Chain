import { addDays } from "@/lib/domain/dates";
import type {
  AlternativePurchase,
  DeliveryStatus,
  MaterialUsage,
  ProductionLine,
  ScenarioConfig,
  ScenarioResult,
  WorkspaceSnapshot,
} from "@/lib/domain/types";
import { getHighsSolver } from "./highs-loader";

const byId = <T extends { id: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

/** Bulatkan hasil solver ke bilangan bulat tak negatif (hindari -0). */
const toCount = (v: number) => Math.max(0, Math.round(v));

const fmtTerm =(coef: number, name: string, first: boolean) =>
  first ? `${coef < 0 ? "- " : ""}${Math.abs(coef)} ${name}` : ` ${coef < 0 ? "-" : "+"} ${Math.abs(coef)} ${name}`;

/**
 * Menyelesaikan satu skenario sebagai MILP (HiGHS). Seluruh entitas diurutkan berdasarkan `id`
 * sebelum LP disusun sehingga hasil deterministik. Formulasi: lihat desain §4.
 */
export async function solveScenario(
  snapshot: WorkspaceSnapshot,
  scenario: ScenarioConfig,
): Promise<ScenarioResult> {
  const cutoff = scenario.cutoff_date;
  const supplierActive = new Map(
    snapshot.suppliers.map((s) => [s.id, s.active && !scenario.disabled_supplier_ids.includes(s.id)]),
  );

  const delayByDelivery = new Map<string, number>();
  for (const d of scenario.disruptions) {
    if (d.type === "delay_delivery") {
      delayByDelivery.set(d.delivery_id, (delayByDelivery.get(d.delivery_id) ?? 0) + d.delay_days);
    }
  }

  // 1) Pengiriman terjadwal -> stok tambahan
  const materials = byId(snapshot.materials);
  const products = byId(snapshot.products);
  const arriving = new Map<string, number>();
  const deliveryStatuses: DeliveryStatus[] = byId(snapshot.committed_deliveries).map((d) => {
    const delay = delayByDelivery.get(d.id) ?? 0;
    const effective = addDays(d.arrival_date, delay);
    let reason: string | null = null;
    if (!supplierActive.get(d.supplier_id)) reason = "Pemasok dinonaktifkan";
    else if (!d.enabled_in_baseline) reason = "Nonaktif di baseline";
    else if (effective > cutoff) reason = `Tiba ${effective} melewati batas ${cutoff}`;
    const counted = reason === null;
    if (counted) arriving.set(d.material_id, (arriving.get(d.material_id) ?? 0) + d.quantity_base_units);
    return {
      delivery_id: d.id,
      counted,
      reason,
      delay_days: delay,
      effective_arrival: effective,
      quantity_base_units: d.quantity_base_units,
    };
  });

  // 2) Penawaran alternatif -> kapasitas efektif
  const offers = byId(snapshot.alternative_offers);
  const offerInfo = offers.map((o) => {
    const arrival = addDays(snapshot.scenario_date, o.lead_days);
    let reason: string | null = null;
    if (!supplierActive.get(o.supplier_id)) reason = "Pemasok dinonaktifkan";
    else if (!o.enabled_in_scenario) reason = "Dinonaktifkan di Data Usaha";
    else if (!scenario.enabled_offer_ids.includes(o.id)) reason = "Tidak diaktifkan di skenario ini";
    else if (arrival > cutoff) reason = `Tiba ${arrival} melewati batas ${cutoff}`;
    return { offer: o, arrival, reason, eligible: reason === null, maxPacks: reason === null ? o.max_packs : 0 };
  });

  // 3) Parameter efektif
  const stockOf = (id: string, base: number) => scenario.overrides.stock_by_material?.[id] ?? base;
  const demandOf = (id: string, base: number) => scenario.overrides.demand_by_product?.[id] ?? base;
  const available = new Map(
    materials.map((m) => [m.id, stockOf(m.id, m.stock_on_hand) + (arriving.get(m.id) ?? 0)]),
  );
  const demand = new Map(products.map((p) => [p.id, demandOf(p.id, p.demand_units)]));
  const qty = new Map(snapshot.bom.map((b) => [`${b.product_id}|${b.material_id}`, b.quantity_per_product]));

  // 4) Susun LP (variabel diindeks agar nama valid & urutan stabil)
  const xName = (i: number) => `x${i}`;
  const yName = (i: number) => `y${i}`;
  const objective: string[] = [];
  products.forEach((p, i) => objective.push(fmtTerm(p.unit_contribution_idr, xName(i), objective.length === 0)));
  offerInfo.forEach((o, i) =>
    objective.push(fmtTerm(-o.offer.incremental_premium_idr_per_pack, yName(i), objective.length === 0)),
  );

  const constraints: string[] = [];
  materials.forEach((m, mi) => {
    const terms: string[] = [];
    products.forEach((p, pi) => {
      const q = qty.get(`${p.id}|${m.id}`);
      if (q) terms.push(fmtTerm(q, xName(pi), terms.length === 0));
    });
    offerInfo.forEach((o, oi) => {
      if (o.offer.material_id === m.id && o.maxPacks > 0) {
        terms.push(fmtTerm(-o.offer.pack_size_base_units, yName(oi), terms.length === 0));
      }
    });
    if (terms.length > 0) constraints.push(` c${mi}: ${terms.join("")} <= ${available.get(m.id)}`);
  });

  const x = new Array<number>(products.length).fill(0);
  const y = new Array<number>(offerInfo.length).fill(0);
  let status: ScenarioResult["status"] = "Optimal";
  let message: string | null = null;

  if (products.length > 0) {
    const bounds = [
      ...products.map((p, i) => ` 0 <= ${xName(i)} <= ${demand.get(p.id)}`),
      ...offerInfo.map((o, i) => ` 0 <= ${yName(i)} <= ${o.maxPacks}`),
    ];
    const names = [...products.map((_, i) => xName(i)), ...offerInfo.map((_, i) => yName(i))];
    const lp = [
      "Maximize",
      ` obj: ${objective.join("")}`,
      "Subject To",
      ...constraints,
      "Bounds",
      ...bounds,
      "General",
      ` ${names.join(" ")}`,
      "End",
    ].join("\n");

    try {
      const highs = await getHighsSolver();
      const sol = highs.solve(lp);
      if (sol.Status === "Optimal") {
        products.forEach((_, i) => (x[i] = toCount((sol.Columns[xName(i)] as { Primal: number }).Primal)));
        offerInfo.forEach((_, i) => (y[i] = toCount((sol.Columns[yName(i)] as { Primal: number }).Primal)));
      } else if (sol.Status === "Infeasible") {
        status = "Infeasible";
        message = "Tidak ada rencana produksi yang layak untuk skenario ini.";
      } else {
        status = "Error";
        message = `Solver berhenti dengan status "${sol.Status}".`;
      }
    } catch {
      status = "Error";
      message = "Solver gagal dijalankan. Coba lagi beberapa saat.";
    }
  }

  // 5) Post-solve: pangkas pak premi-0 yang tidak terpakai (tie-break deterministik, offer.id menurun)
  const used = new Map<string, number>();
  const recomputeUsed = () => {
    used.clear();
    products.forEach((p, pi) =>
      materials.forEach((m) => {
        const q = qty.get(`${p.id}|${m.id}`);
        if (q) used.set(m.id, (used.get(m.id) ?? 0) + q * x[pi]);
      }),
    );
  };
  recomputeUsed();
  const supplyOf = (materialId: string) =>
    (available.get(materialId) ?? 0) +
    offerInfo.reduce((sum, o, i) => (o.offer.material_id === materialId ? sum + o.offer.pack_size_base_units * y[i] : sum), 0);
  for (let i = offerInfo.length - 1; i >= 0; i--) {
    const o = offerInfo[i].offer;
    if (o.incremental_premium_idr_per_pack !== 0 || y[i] <= 0) continue;
    const remaining = supplyOf(o.material_id) - (used.get(o.material_id) ?? 0);
    y[i] -= Math.min(y[i], Math.floor(remaining / o.pack_size_base_units));
  }

  // 6) Susun hasil
  const production: ProductionLine[] = products.map((p, i) => ({
    product_id: p.id,
    units: x[i],
    demand_units: demand.get(p.id) ?? 0,
    contribution_idr: x[i] * p.unit_contribution_idr,
  }));
  const materialUsage: MaterialUsage[] = materials.map((m) => {
    const total = supplyOf(m.id);
    const u = used.get(m.id) ?? 0;
    return { material_id: m.id, available: total, used: u, remaining: total - u };
  });
  const purchases: AlternativePurchase[] = offerInfo.map((o, i) => ({
    offer_id: o.offer.id,
    eligible: o.eligible,
    reason: o.reason,
    arrival_date: o.arrival,
    effective_max_packs: o.maxPacks,
    packs_bought: y[i],
    quantity_base_units: y[i] * o.offer.pack_size_base_units,
    premium_idr: y[i] * o.offer.incremental_premium_idr_per_pack,
  }));

  const gross = production.reduce((s, p) => s + p.contribution_idr, 0);
  const premium = purchases.reduce((s, p) => s + p.premium_idr, 0);

  const bottlenecks = materialUsage
    .filter((mu) =>
      production.some((line) => {
        if (line.units >= line.demand_units) return false;
        const q = qty.get(`${line.product_id}|${mu.material_id}`);
        return q !== undefined && mu.remaining < q;
      }),
    )
    .map((mu) => mu.material_id);

  return {
    scenario_id: scenario.id,
    status,
    message,
    production,
    material_usage: materialUsage,
    alternative_purchases: purchases,
    delivery_statuses: deliveryStatuses,
    gross_contribution_idr: gross,
    alternative_premium_idr: premium,
    net_contribution_idr: gross - premium,
    bottleneck_material_ids: bottlenecks,
  };
}
