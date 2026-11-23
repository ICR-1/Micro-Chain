import { describe, expect, it } from "vitest";
import type { Snapshot } from "@/lib/types";
import { applyParameters, currentParameters, parametersSchema } from "@/features/data-editor/parameters";

const snapshot: Snapshot = {
  business: { id: "b", name: "Usaha", sector: "Roti", currency: "IDR", planning_cutoff_date: "2026-11-24", created_at: "2026-11-23" },
  suppliers: [],
  materials: [{ id: "flour", business_id: "b", name: "Tepung", unit_kind: "mass", base_unit: "g", stock_on_hand: 10 }],
  products: [{ id: "bread", business_id: "b", name: "Roti", demand_units: 1, unit_contribution_idr: 1000 }],
  bom: [{ product_id: "bread", material_id: "flour", quantity_per_product: 10 }],
  committed_deliveries: [],
  alternative_offers: [],
  scenario_date: "2026-11-23", demo_data: true,
};

describe("parameter simulasi", () => {
  it("applies edits without mutating the original snapshot", () => {
    const next = applyParameters(snapshot, { ...currentParameters(snapshot), materials: [0] });
    expect(next.materials[0].stock_on_hand).toBe(0);
    expect(snapshot.materials[0].stock_on_hand).toBe(10);
    expect(next.products[0]).toBe(snapshot.products[0]);
    expect(applyParameters(snapshot, currentParameters(snapshot))).toBe(snapshot);
  });

  it.each([NaN, -1, 1.5, 1_000_001])("rejects the out-of-range quantity %s", (amount) => {
    expect(parametersSchema.safeParse({ materials: [amount], products: [0], offers: [0] }).success).toBe(false);
  });

  it("accepts the boundary values and keeps whole base units", () => {
    expect(parametersSchema.parse({ materials: [0], products: [1_000_000], offers: [1] })).toEqual({ materials: [0], products: [1_000_000], offers: [1] });
  });
});
